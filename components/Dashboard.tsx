
import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole, AppUser, DrawTime, GameMode, LotteryRegion, RiskAnalysisSIPR } from '../types';
import RechargeModal from './RechargeModal';
import WithdrawModal from './WithdrawModal';
import AdminResultControl from './AdminResultControl';
import ReventadosEffect from './ReventadosEffect';
import LiveResultsPanel from './LiveResultsPanel'; 
import GlobalBetsTable from './GlobalBetsTable'; 
import TopNumbersPanel from './TopNumbersPanel'; 
import AIRecommendations from './AIRecommendations'; 
import LoyaltyCard from './LoyaltyCard'; 
import DataPurgeCard from './DataPurgeCard';
import QuantumReactor from './ui/QuantumReactor';
import RiskLimitManager from './RiskLimitManager';
import UserManagementPanel from './UserManagementPanel';
import { useServerClock } from '../hooks/useServerClock';
import { formatCurrency } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { api } from '../services/edgeApi';
import AnimatedIconUltra from './ui/AnimatedIconUltra';
import { motion, AnimatePresence } from 'framer-motion';

interface PendingBet {
    id: string;
    number: string;
    amount: number;
    draw: DrawTime;
    mode: GameMode;
    region: LotteryRegion;
    isReventadoActive: boolean;
}

const MIN_BET_AMOUNT = 100;

export default function Dashboard() {
  const { user, fetchUser } = useAuthStore(); 
  const [players, setPlayers] = useState<AppUser[]>([]);
  const [vendors, setVendors] = useState<AppUser[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [selectedUserForRecharge, setSelectedUserForRecharge] = useState<AppUser | null>(null);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedUserForWithdraw, setSelectedUserForWithdraw] = useState<AppUser | null>(null);
  const [adminResultOpen, setAdminResultOpen] = useState(false);
  
  const [selectedDraw, setSelectedDraw] = useState<DrawTime>(DrawTime.NOCHE);
  const [selectedRegion, setSelectedRegion] = useState<LotteryRegion>(LotteryRegion.TICA);
  const [betNumber, setBetNumber] = useState('');
  const [betAmount, setBetAmount] = useState('');
  const [reventadoActive, setReventadoActive] = useState(false);
  const [pendingBets, setPendingBets] = useState<PendingBet[]>([]);
  const [executingBatch, setExecutingBatch] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState(false);
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState(0);

  // PRE-CONFIRMATION STATE
  const [showPreConfirm, setShowPreConfirm] = useState(false);
  const [betDraft, setBetDraft] = useState<PendingBet | null>(null);

  const [siprBlock, setSiprBlock] = useState<{ number: string; coldTen: string[] } | null>(null);
  const [showMinBetError, setShowMinBetError] = useState(false);
  
  const [marketRates, setMarketRates] = useState({ multiplier_tiempos: 90, multiplier_reventados: 200 });
  const [isEditingRates, setIsEditingRates] = useState(false);
  const [tempRates, setTempRates] = useState({ t: 90, r: 200 });

  const { status: marketStatus, nextDraw, serverTime, timeRemaining } = useServerClock();
  const isMarketClosed = marketStatus === 'CLOSED';
  
  const isAdmin = user?.role === UserRole.SuperAdmin;
  const isVendor = user?.role === UserRole.Vendedor;
  const isClient = user?.role === UserRole.Cliente;

  const canPublishResults = isAdmin || isVendor;
  const canModifyRates = isAdmin || isVendor;

  const fetchUserLists = async () => {
      if (!user || user.role === UserRole.Cliente) return;
      try {
          const { data: allUsers } = await supabase.from('app_users').select('*');
          if (allUsers) {
              const p = allUsers.filter((u: any) => u.role === UserRole.Cliente);
              const v = allUsers.filter((u: any) => u.role === UserRole.Vendedor);
              setPlayers(p as AppUser[]);
              setVendors(v as AppUser[]);
          }
      } catch (e) { console.error("Error syncing user lists", e); }
      finally { setLoadingLists(false); }
  };

  useEffect(() => { 
    if (nextDraw) setSelectedDraw(nextDraw); 
    fetchUserLists();
    const interval = setInterval(fetchUserLists, 10000);
    return () => clearInterval(interval);
  }, [nextDraw, user]);

  useEffect(() => {
    const loadSettings = async () => {
        const res = await api.getMarketSettings();
        if (res.data) {
            setMarketRates(res.data);
            setTempRates({ t: res.data.multiplier_tiempos, r: res.data.multiplier_reventados });
        }
    };
    loadSettings();
  }, [batchSuccess]);

  const handleUpdateRates = async () => {
      const res = await api.updateMarketRates(tempRates.t, tempRates.r);
      if (!res.error) {
          setMarketRates({ multiplier_tiempos: tempRates.t, multiplier_reventados: tempRates.r });
          setIsEditingRates(false);
          if(navigator.vibrate) navigator.vibrate(100);
      }
  };

  const drawTheme = useMemo(() => {
    switch (selectedDraw) {
        case DrawTime.MEDIODIA: return { hex: '#ff5f00', glow: 'bg-cyber-solar', text: 'text-cyber-solar', border: 'border-cyber-solar', name: 'solar' }; 
        case DrawTime.TARDE: return { hex: '#7c3aed', glow: 'bg-cyber-vapor', text: 'text-cyber-vapor', border: 'border-cyber-vapor', name: 'vapor' }; 
        default: return { hex: '#00D1FF', glow: 'bg-cyber-blue', text: 'text-cyber-blue', border: 'border-cyber-blue', name: 'abyss' }; 
    }
  }, [selectedDraw]);

  // INITIATE PRE-CONFIRMATION
  const handleInitiateAdd = () => {
      const amountNum = Number(betAmount);
      if (betAmount === '' || amountNum < MIN_BET_AMOUNT) {
          setShowMinBetError(true);
          if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
          setTimeout(() => setShowMinBetError(false), 3000);
          return;
      }
      if (isMarketClosed || !betNumber || !betAmount || amountNum <= 0) return;
      
      const totalAmount = reventadoActive ? amountNum * 2 : amountNum;
      
      setBetDraft({ 
          id: `draft-${Date.now()}`, 
          number: betNumber.padStart(2, '0'), 
          amount: totalAmount * 100, 
          draw: selectedDraw, 
          mode: reventadoActive ? GameMode.REVENTADOS : GameMode.TIEMPOS, 
          region: selectedRegion, 
          isReventadoActive: reventadoActive
      });
      setShowPreConfirm(true);
      if (navigator.vibrate) navigator.vibrate(20);
  };

  const confirmBetAndAddToQueue = () => {
      if (!betDraft) return;
      setPendingBets(prev => [betDraft, ...prev]);
      setBetNumber(''); 
      setBetAmount('');
      setBetDraft(null);
      setShowPreConfirm(false);
      setShowMinBetError(false);
      if (navigator.vibrate) navigator.vibrate([30, 10, 30]);
  };

  const handleExecuteBatch = async () => {
      if (isMarketClosed || pendingBets.length === 0 || !user) return;
      setExecutingBatch(true);
      try {
          let successCount = 0;
          for (const bet of pendingBets) {
               const res = await api.placeBet({ userId: user.id, auth_uid: user.auth_uid, numbers: bet.number, amount: bet.amount, draw_id: bet.draw, mode: bet.mode, region: bet.region });
               if (res.error) {
                   if (res.error.includes('SIPR_BLOCK')) {
                       const analysis = await api.getRiskAnalysisSIPR(bet.draw);
                       const coldTen = analysis.data?.filter(r => r.is_recommended).map(r => r.number) || [];
                       setSiprBlock({ number: bet.number, coldTen });
                   } else { alert(res.error); }
                   break;
               }
               successCount++;
          }
          if (successCount > 0) {
              setBatchSuccess(true);
              await fetchUser(true); 
              setTableRefreshTrigger(p => p + 1);
              setTimeout(() => { setBatchSuccess(false); setPendingBets([]); }, 2500);
          }
      } catch (e) { alert('FALLO CRÍTICO'); } finally { setExecutingBatch(false); }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 md:space-y-12 relative overflow-hidden selection:bg-cyber-neon selection:text-black">
      
      {/* --- MODALES --- */}
      <RechargeModal 
        isOpen={rechargeModalOpen} 
        onClose={() => setRechargeModalOpen(false)} 
        targetUser={selectedUserForRecharge} 
        onSuccess={() => { fetchUserLists(); fetchUser(true); }}
      />
      <WithdrawModal 
        isOpen={withdrawModalOpen} 
        onClose={() => setWithdrawModalOpen(false)} 
        targetUser={selectedUserForWithdraw} 
        onSuccess={() => { fetchUserLists(); fetchUser(true); }}
      />

      {/* --- BLOQUEO SIPR --- */}
      <AnimatePresence>
        {siprBlock && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[1000] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-4">
                <div className="max-w-xl w-full border-[4px] border-red-600 rounded-[3rem] bg-black shadow-[0_0_100px_rgba(255,0,0,0.4)] overflow-hidden">
                    <div className="p-8 text-center bg-red-950/10 border-b border-white/5 relative">
                        <div className="w-20 h-20 mx-auto bg-red-600/10 rounded-full border-2 border-red-600 flex items-center justify-center mb-6 shadow-neon-red">
                            <i className="fas fa-radiation text-4xl text-red-600"></i>
                        </div>
                        <h2 className="text-4xl font-display font-black text-white uppercase mb-2">BLOQUEO <span className="text-red-500">DE RIESGO</span></h2>
                        <div className="bg-red-600 text-black px-6 py-2 font-mono font-black text-xl skew-x-[-10deg] inline-block uppercase">NÚMERO {siprBlock.number} SATURADO</div>
                    </div>
                    <div className="p-8 space-y-8">
                        <p className="text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Vectores Disponibles Sugeridos:</p>
                        <div className="grid grid-cols-5 gap-3">
                            {siprBlock.coldTen.map(num => (
                                <button key={num} onClick={() => { setBetNumber(num); setSiprBlock(null); }} className="py-4 rounded-xl bg-black border-2 border-cyber-neon/30 text-cyber-neon font-mono font-black text-2xl hover:bg-cyber-neon hover:text-black transition-all">
                                    {num}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setSiprBlock(null)} className="w-full py-6 bg-white text-black font-display font-black text-lg uppercase tracking-widest rounded-2xl">LIBERAR CONSOLA</button>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* --- TRÍADA DE COMANDO SUPERIOR v3.5 --- */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-4 items-center">
          
          <div className="lg:col-span-1 flex flex-col items-center justify-center glass-morphism rounded-[3rem] p-8 border-2 border-cyber-blue shadow-neon-blue group relative overflow-hidden h-full">
              <div className="absolute inset-0 carbon-texture opacity-10"></div>
              <QuantumReactor status={isMarketClosed ? 'RESTRINGIDO' : 'ILIMITADO'} />
              <div className="mt-6 text-center z-10">
                  <h4 className={`text-xl font-display font-black uppercase tracking-widest ${isMarketClosed ? 'text-red-500' : 'text-cyber-blue'}`}>
                      SISTEMA {isMarketClosed ? 'RESTRINGIDO' : 'ACTIVO'}
                  </h4>
                  <p className="text-[8px] font-mono text-slate-500 uppercase tracking-[0.4em] mt-1 font-bold">Estado del Reactor Cuántico</p>
              </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              <div className="relative overflow-hidden bg-black border-2 border-cyber-blue rounded-[2.5rem] p-8 shadow-2xl transition-all hover:scale-[1.02] flex flex-col justify-center">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-cyber-blue opacity-40 animate-[scanline_2s_linear_infinite]"></div>
                  <div className="flex justify-between items-start mb-6">
                      <span className="text-[10px] font-display font-bold text-slate-500 uppercase tracking-[0.2em]">Fondo del Nodo</span>
                      <i className="fas fa-vault text-cyber-blue text-xl"></i>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-display text-cyber-blue font-black">₡</span>
                      <h2 className="text-4xl md:text-5xl font-mono font-black text-white tracking-tighter drop-shadow-lg">
                          {user ? formatCurrency(user.balance_bigint).replace('₡', '').trim() : '0.00'}
                      </h2>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-cyber-success animate-pulse shadow-neon-green"></div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black italic">Sincronía_Estable</span>
                  </div>
              </div>

              <div className="relative overflow-hidden bg-black border-2 border-cyber-success rounded-[2.5rem] p-8 shadow-2xl transition-all hover:scale-[1.02] flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-display font-bold text-slate-500 uppercase tracking-[0.2em]">Paga Tiempos</span>
                        {canModifyRates && (
                            <button onClick={() => setIsEditingRates(!isEditingRates)} className="text-cyber-success hover:text-white transition-colors">
                                <i className="fas fa-edit text-[10px]"></i>
                            </button>
                        )}
                      </div>
                      <i className="fas fa-rocket text-cyber-success text-xl animate-bounce"></i>
                  </div>
                  <div className="flex items-center justify-between">
                      {isEditingRates ? (
                          <div className="flex items-center gap-2 animate-in zoom-in-95">
                              <input type="number" value={tempRates.t} onChange={e=>setTempRates({...tempRates, t: Number(e.target.value)})} className="w-20 bg-black border-2 border-cyber-success rounded-lg px-2 py-1 text-3xl font-mono text-white outline-none" />
                              <button onClick={handleUpdateRates} className="p-3 bg-cyber-success text-black rounded-xl"><i className="fas fa-check"></i></button>
                          </div>
                      ) : (
                        <h2 className="text-6xl font-mono font-black text-cyber-success tracking-tighter text-glow-green">
                            {marketRates.multiplier_tiempos}x
                        </h2>
                      )}
                      <div className="text-right">
                          <span className="text-[9px] font-mono text-slate-600 block uppercase font-bold">Modo Operativo</span>
                          <span className="text-[12px] font-black text-white bg-green-950/40 px-2 py-1 rounded border border-cyber-success/30 uppercase">Élite</span>
                      </div>
                  </div>
              </div>
          </div>

          <div className={`relative overflow-hidden bg-black border-2 rounded-[2.5rem] p-8 transition-all duration-700 h-full flex flex-col justify-center ${isMarketClosed ? 'border-red-600 shadow-neon-red' : 'border-white/10'}`}>
              <div className="flex justify-between items-start mb-6">
                  <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isMarketClosed ? 'bg-red-600/10 border-red-600 text-red-500' : 'bg-green-500/10 border-green-500 text-green-500'}`}>
                      <div className={`w-2 h-2 rounded-full bg-current ${isMarketClosed ? 'animate-pulse' : 'animate-ping'}`}></div>
                      {isMarketClosed ? 'CERRADO' : 'ENLACE_SEGURO'}
                  </div>
                  <i className={`fas ${isMarketClosed ? 'fa-user-lock text-red-500' : 'fa-network-wired text-green-500'} text-xl`}></i>
              </div>

              <div className="flex items-center justify-between">
                  <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1 font-bold">Ciclo Temporal</span>
                      <h3 className="text-3xl font-display font-black text-white uppercase tracking-tighter italic">
                          {nextDraw ? nextDraw.split(' ')[0] : 'FIN DE DÍA'}
                      </h3>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-right">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1 font-black">HORA_RELOJ</span>
                      <div className="text-xl font-mono font-bold text-white leading-none tracking-widest">
                          {serverTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* 1. NÚCLEO DE MANDO (RESULTADOS LIVE) */}
      <div className="w-full">
          <LiveResultsPanel />
      </div>

      {/* 2. CONSOLA CUÁNTICA (BETTING INTERFACE) */}
      <div className="relative">
          <div className={`relative rounded-[3.5rem] p-1 overflow-hidden border-4 ${isMarketClosed ? 'border-red-900 opacity-50' : drawTheme.border} transition-all duration-700 z-10 bg-black/80 shadow-2xl backdrop-blur-3xl`}>
              {reventadoActive && <ReventadosEffect />}
              
              {/* --- PROTOCOLO DE VERIFICACIÓN PRE-CONFIRMACIÓN --- */}
              <AnimatePresence>
                {showPreConfirm && betDraft && (
                  <motion.div 
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    className="absolute inset-0 z-[100] bg-black/60 flex items-center justify-center p-6"
                  >
                    <motion.div 
                        initial={{ scale: 0.8, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="bg-[#050a14] border-4 border-white/10 rounded-[3rem] p-10 max-w-lg w-full shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
                        
                        <div className="text-center mb-10">
                            <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.6em] mb-4 font-black">Validación de Paquete</h4>
                            <div className="flex items-center justify-center gap-6">
                                <div className="text-8xl font-mono font-black text-white text-glow-sm">{betDraft.number}</div>
                                <div className="h-20 w-1 bg-white/10 rounded-full"></div>
                                <div className="text-left">
                                    <div className="text-3xl font-mono font-black text-cyber-success">{formatCurrency(betDraft.amount)}</div>
                                    <div className={`text-[10px] font-black uppercase tracking-widest mt-1 ${betDraft.isReventadoActive ? 'text-red-500' : 'text-cyber-neon'}`}>
                                        MODO_{betDraft.isReventadoActive ? 'FIRE_X2' : 'BASE'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-10">
                            <div className="bg-black/60 p-5 rounded-2xl border border-white/5">
                                <span className="text-[8px] text-slate-500 uppercase font-black block mb-2">Pre-Cálculo de Acierto</span>
                                <span className="text-xl font-mono font-black text-white">
                                    {formatCurrency(betDraft.amount / (betDraft.isReventadoActive ? 2 : 1) * marketRates.multiplier_tiempos)}
                                </span>
                            </div>
                            <div className="bg-black/60 p-5 rounded-2xl border border-white/5">
                                <span className="text-[8px] text-slate-500 uppercase font-black block mb-2">Ciclo de Destino</span>
                                <span className="text-xl font-display font-black text-white uppercase">{betDraft.draw.split(' ')[0]}</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => { setShowPreConfirm(false); setBetDraft(null); }}
                                className="flex-1 py-5 bg-red-950/20 border-2 border-red-600 text-red-500 rounded-2xl font-display font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                            >
                                ABORTAR
                            </button>
                            <button 
                                onClick={confirmBetAndAddToQueue}
                                className="flex-[2] py-5 bg-cyber-success text-black rounded-2xl font-display font-black text-sm uppercase tracking-[0.3em] shadow-neon-green hover:bg-white transition-all active:scale-95"
                            >
                                COMETER_PAQUETE
                            </button>
                        </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative z-10 p-6 md:p-10 lg:p-14 carbon-texture">
                  <div className="flex flex-col xl:flex-row justify-between items-start gap-8 mb-12 lg:mb-16">
                      <div>
                          <h3 className="text-4xl md:text-5xl font-display font-black text-slate-100 uppercase tracking-tighter flex items-center gap-6">
                              CONSOLA <span className={`${drawTheme.text} text-glow`}>DE JUEGOS</span>
                          </h3>
                          <div className="h-1 w-32 bg-current mt-4 opacity-50" style={{ color: drawTheme.hex }}></div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 md:gap-6">
                          <div className="flex bg-black/80 p-1.5 rounded-2xl md:rounded-[2rem] border-2 border-white/5 shadow-inner backdrop-blur-xl overflow-x-auto no-scrollbar">
                              {Object.values(DrawTime).map((t) => (
                                  <button key={t} onClick={() => setSelectedDraw(t)} className={`px-4 md:px-8 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${selectedDraw === t ? `bg-white text-black shadow-2xl scale-105` : 'text-slate-500 hover:text-white'}`}>{t.split(' ')[0]}</button>
                              ))}
                          </div>
                          <div className="flex bg-black/80 p-1.5 rounded-2xl md:rounded-[2rem] border-2 border-white/5 shadow-inner backdrop-blur-xl">
                              {Object.values(LotteryRegion).map(reg => {
                                  const flags: any = { [LotteryRegion.TICA]: '🇨🇷', [LotteryRegion.NICA]: '🇳🇮', [LotteryRegion.DOMINICANA]: '🇩🇴', [LotteryRegion.PANAMENA]: '🇵🇦' };
                                  return <button key={reg} onClick={() => setSelectedRegion(reg)} className={`px-4 md:px-6 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl text-xl md:text-2xl transition-all ${selectedRegion === reg ? 'bg-white/10 scale-105 border-2 border-white/20' : 'opacity-30 grayscale hover:grayscale-0'}`}>{flags[reg]}</button>;
                              })}
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10">
                      {/* NÚMERO */}
                      <div className="md:col-span-3 lg:col-span-2">
                          <label className="text-[10px] md:text-[12px] font-black uppercase text-cyber-neon mb-3 md:mb-4 block tracking-[0.3em] ml-2">Vector ID</label>
                          <input 
                            id="betNumberInput" type="number" maxLength={2} value={betNumber} 
                            onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); if (val.length <= 2) setBetNumber(val); }} 
                            className="w-full bg-black/90 border-[4px] border-white/10 rounded-[2rem] md:rounded-[2.5rem] py-6 md:py-10 text-center text-6xl md:text-8xl font-mono font-black text-cyber-neon focus:border-cyber-neon outline-none shadow-inner transition-all placeholder-white/5" 
                            placeholder="00" 
                          />
                      </div>
                      
                      {/* MONTO */}
                      <div className="md:col-span-5 lg:col-span-6">
                          <label className="text-[10px] md:text-[12px] font-black uppercase text-cyber-success mb-3 md:mb-4 block tracking-[0.3em] ml-2">Inyección de Monto</label>
                          <div className="relative">
                              <input 
                                type="number" value={betAmount} 
                                onChange={e => setBetAmount(e.target.value)} 
                                className={`w-full bg-black/90 border-[4px] rounded-[2rem] md:rounded-[2.5rem] py-6 md:py-10 text-center text-5xl md:text-7xl font-mono font-black outline-none transition-all ${showMinBetError ? 'border-red-600 animate-shake text-red-500' : 'border-white/10 text-cyber-success focus:border-cyber-success'}`} 
                                placeholder="0" 
                              />
                              <div className="absolute -bottom-6 md:-bottom-8 left-0 w-full text-center">
                                  <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] transition-all ${showMinBetError ? 'text-red-500 animate-pulse' : 'text-cyber-success/40'}`}>Min_Req: ₡100</p>
                              </div>
                          </div>
                      </div>

                      {/* REVENTADOS BUTTON */}
                      <div className="md:col-span-2 lg:col-span-2 flex flex-col justify-center items-center">
                          <label className="text-[10px] md:text-[12px] font-black uppercase text-red-500 mb-3 md:mb-4 tracking-[0.3em]">Reactor_X2</label>
                          <button 
                            disabled={selectedRegion !== LotteryRegion.TICA} 
                            onClick={() => setReventadoActive(!reventadoActive)} 
                            className={`w-20 md:w-28 h-20 md:h-28 rounded-[2rem] md:rounded-[2.5rem] border-[4px] flex items-center justify-center transition-all ${reventadoActive ? 'bg-red-600 border-white shadow-neon-red scale-105' : 'bg-black border-white/10 hover:border-red-600/50'} disabled:opacity-20`}
                          >
                            <i className={`fas fa-fire text-3xl md:text-5xl ${reventadoActive ? 'text-white' : 'text-slate-800'}`}></i>
                          </button>
                      </div>

                      {/* SUBMIT - TRIGGER PRECONFIRM */}
                      <div className="md:col-span-2 lg:col-span-2 flex items-stretch">
                        <button onClick={handleInitiateAdd} className="w-full bg-cyber-success text-black font-black uppercase rounded-[2rem] md:rounded-[2.5rem] flex flex-row md:flex-col items-center justify-center gap-4 py-6 md:py-0 hover:bg-white hover:scale-[1.03] transition-all shadow-neon-green group/btn">
                            <i className="fas fa-bolt text-3xl md:text-5xl group-hover:animate-bounce"></i>
                            <span className="text-[10px] md:text-[12px] font-display tracking-[0.2em] font-black">ENVIAR</span>
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* 3. REGISTRO DE TRANSMISIONES (HISTORIAL GLOBAL) */}
      <div className="w-full">
          <GlobalBetsTable refreshTrigger={tableRefreshTrigger} />
      </div>

      {/* 4. DEFENSA ACTIVA (MATRIZ 00-99 / SIPR) */}
      <div className="pt-4">
          <RiskLimitManager />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 space-y-12">
            
            {/* 5. INTELIGENCIA PREDICTIVA */}
            <div className="w-full">
                <TopNumbersPanel />
            </div>

            {/* 6. ANÁLISIS SIPR (SUGERENCIAS DEL NÚCLEO) */}
            <AIRecommendations drawTime={selectedDraw} onSelectNumber={(n) => { setBetNumber(n); setBetAmount('500'); if(navigator.vibrate) navigator.vibrate(50); }} />

            {/* TRANSMISSION BUFFER OVERLAY (Queued Bets) */}
            {pendingBets.length > 0 && (
                <div className="bg-[#050a14]/90 border-[4px] border-cyber-success rounded-[3rem] md:rounded-[4rem] p-6 md:p-12 shadow-2xl animate-in zoom-in-95 backdrop-blur-2xl carbon-texture">
                    <div className="flex items-center gap-6 mb-10">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-cyber-success/10 border-2 border-cyber-success flex items-center justify-center shadow-neon-green">
                            <i className="fas fa-layer-group text-cyber-success text-2xl md:text-3xl"></i>
                        </div>
                        <div>
                             <h4 className="text-xl md:text-2xl font-display font-black text-slate-100 uppercase tracking-widest leading-none">Búfer de Transmisión</h4>
                             <p className="text-[10px] font-mono text-cyber-success uppercase tracking-[0.4em] mt-2">Paquetes en cola de transmisión</p>
                        </div>
                    </div>
                    <div className="space-y-4 mb-10 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 md:pr-6">
                        {pendingBets.map(bet => (
                            <div key={bet.id} className="bg-black/60 border-2 border-white/10 p-4 md:p-6 rounded-2xl md:rounded-3xl flex justify-between items-center hover:border-cyber-success/40 transition-all group">
                                <div className="flex items-center gap-4 md:gap-8">
                                    <div className="text-4xl md:text-5xl font-mono font-black text-cyber-neon text-glow-cyan">{bet.number}</div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] md:text-[12px] font-black text-white uppercase tracking-widest">{bet.draw.split(' ')[0]}</span>
                                        <span className="text-[8px] md:text-[10px] font-mono text-cyber-success font-black tracking-widest uppercase">{bet.mode.split(' ')[0]}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-cyber-success font-mono font-black text-xl md:text-2xl drop-shadow-sm">{formatCurrency(bet.amount)}</div>
                                    <button onClick={() => setPendingBets(prev => prev.filter(p => p.id !== bet.id))} className="text-[9px] md:text-[10px] text-red-500 font-black uppercase mt-2 hover:text-white transition-colors border-b border-red-500/20">Eliminar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleExecuteBatch} disabled={executingBatch} className="w-full py-6 md:py-8 bg-cyber-success text-black font-display font-black text-2xl md:text-3xl uppercase tracking-[0.5em] rounded-[2rem] md:rounded-[2.5rem] shadow-neon-green hover:bg-white transition-all active:scale-95">
                        {executingBatch ? 'SINCRONIZANDO...' : 'TRANSMITIR TODO'}
                    </button>
                </div>
            )}
            
            <div className="space-y-12">
                {isAdmin && (
                    <div className="animate-in slide-in-from-bottom-8 duration-1000">
                        <DataPurgeCard />
                    </div>
                )}
                
                <LoyaltyCard />

                {(isAdmin || isVendor) && (
                    <div className="animate-in slide-in-from-bottom-8 duration-1000 delay-200">
                        <UserManagementPanel 
                            players={players}
                            vendors={vendors}
                            onRecharge={(u) => { setSelectedUserForRecharge(u); setRechargeModalOpen(true); }}
                            onWithdraw={(u) => { setSelectedUserForWithdraw(u); setWithdrawModalOpen(true); }}
                            onRefresh={fetchUserLists}
                        />
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
