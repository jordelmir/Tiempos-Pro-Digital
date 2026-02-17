
import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole, AppUser, DrawTime, GameMode, LotteryRegion, RiskAnalysisSIPR } from '../types';
import RechargeModal from './RechargeModal';
import WithdrawModal from './WithdrawModal';
import ReventadosEffect from './ReventadosEffect';
import LiveResultsPanel from './LiveResultsPanel'; 
import GlobalBetsTable from './GlobalBetsTable'; 
import TopNumbersPanel from './TopNumbersPanel'; 
import AIRecommendations from './AIRecommendations'; 
import LoyaltyCard from './LoyaltyCard'; 
import DataPurgeCard from './DataPurgeCard';
import QuantumReactor from './ui/QuantumReactor';
import RiskLimitManager from './RiskLimitManager';
import UserCreationForm from './UserCreationForm';
import UserManagementPanel from './UserManagementPanel';
import MarketRateModal from './MarketRateModal';
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
  
  const [selectedDraw, setSelectedDraw] = useState<DrawTime>(DrawTime.NOCHE);
  const [selectedRegion, setSelectedRegion] = useState<LotteryRegion>(LotteryRegion.TICA);
  const [betNumber, setBetNumber] = useState('');
  const [betAmount, setBetAmount] = useState('');
  const [reventadoActive, setReventadoActive] = useState(false);
  const [pendingBets, setPendingBets] = useState<PendingBet[]>([]);
  const [executingBatch, setExecutingBatch] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState(false);
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState(0);

  const [showPreConfirm, setShowPreConfirm] = useState(false);
  const [betDraft, setBetDraft] = useState<PendingBet | null>(null);
  const [siprBlock, setSiprBlock] = useState<{ number: string; coldTen: string[] } | null>(null);
  const [showMinBetError, setShowMinBetError] = useState(false);
  
  const [riskStats, setRiskStats] = useState<RiskAnalysisSIPR[]>([]);
  const [marketRates, setMarketRates] = useState({ multiplier_tiempos: 90, multiplier_reventados: 200 });
  const [rateModalOpen, setRateModalOpen] = useState(false);

  const { status: marketStatus, nextDraw, serverTime } = useServerClock();
  const isMarketClosed = marketStatus === 'CLOSED';
  const isAdmin = user?.role === UserRole.SuperAdmin;
  const isVendor = user?.role === UserRole.Vendedor;

  const fetchUserLists = async () => {
      if (!user || user.role === UserRole.Cliente) return;
      const { data } = await supabase.from('app_users').select('*');
      if (data) {
          setPlayers(data.filter((u: any) => u.role === UserRole.Cliente) as AppUser[]);
          setVendors(data.filter((u: any) => u.role === UserRole.Vendedor) as AppUser[]);
      }
      setLoadingLists(false);
  };

  const fetchRisk = async () => {
    const res = await api.getRiskAnalysisSIPR(selectedDraw);
    if (res.data) setRiskStats(res.data);
  };

  const fetchMarketRates = async () => {
      const res = await api.getMarketSettings();
      if (res.data) setMarketRates(res.data);
  };

  useEffect(() => { 
    if (nextDraw) setSelectedDraw(nextDraw); 
    fetchUserLists();
    fetchRisk();
    fetchMarketRates();
    const interval = setInterval(() => { fetchUserLists(); fetchRisk(); fetchMarketRates(); }, 15000);
    return () => clearInterval(interval);
  }, [nextDraw, user, selectedDraw]);

  const liveRisk = useMemo(() => {
    if (betNumber.length < 2) return null;
    return riskStats.find(s => s.number === betNumber.padStart(2, '0'));
  }, [betNumber, riskStats]);

  const drawTheme = useMemo(() => {
    switch (selectedDraw) {
        case DrawTime.MEDIODIA: return { hex: '#ff5f00', text: 'text-cyber-solar', border: 'border-cyber-solar', shadow: 'shadow-neon-solar' }; 
        case DrawTime.TARDE: return { hex: '#7c3aed', text: 'text-cyber-vapor', border: 'border-cyber-vapor', shadow: 'shadow-neon-vapor' }; 
        default: return { hex: '#00D1FF', text: 'text-cyber-blue', border: 'border-cyber-blue', shadow: 'shadow-neon-blue' }; 
    }
  }, [selectedDraw]);

  const handleInitiateAdd = () => {
      const amountNum = Number(betAmount);
      if (betAmount === '' || amountNum < MIN_BET_AMOUNT) {
          setShowMinBetError(true);
          setTimeout(() => setShowMinBetError(false), 2000);
          return;
      }
      if (isMarketClosed || !betNumber || !betAmount) return;
      
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
  };

  const confirmBetAndAddToQueue = () => {
      if (!betDraft) return;
      setPendingBets(prev => [betDraft, ...prev]);
      setBetNumber(''); 
      setBetAmount('');
      setBetDraft(null);
      setShowPreConfirm(false);
      if (navigator.vibrate) navigator.vibrate(20);
  };

  const handleExecuteBatch = async () => {
      if (isMarketClosed || pendingBets.length === 0 || !user) return;
      setExecutingBatch(true);
      try {
          for (const bet of pendingBets) {
               const res = await api.placeBet({ userId: user.id, auth_uid: user.auth_uid, numbers: bet.number, amount: bet.amount, draw_id: bet.draw, mode: bet.mode, region: bet.region });
               if (res.error) {
                   if (res.error.includes('SIPR_BLOCK')) {
                       const analysis = await api.getRiskAnalysisSIPR(bet.draw);
                       setSiprBlock({ number: bet.number, coldTen: analysis.data?.filter(r => r.is_recommended).map(r => r.number) || [] });
                   } else { alert(res.error); }
                   break;
               }
          }
          setBatchSuccess(true);
          await fetchUser(true); 
          setTableRefreshTrigger(p => p + 1);
          setTimeout(() => { setBatchSuccess(false); setPendingBets([]); }, 2000);
      } catch (e) { alert('FALLO CRÍTICO'); } finally { setExecutingBatch(false); }
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-10 md:space-y-16 relative animate-in fade-in duration-1000">
      
      <RechargeModal isOpen={rechargeModalOpen} onClose={() => setRechargeModalOpen(false)} targetUser={selectedUserForRecharge} onSuccess={() => { fetchUserLists(); fetchUser(true); }} />
      <WithdrawModal isOpen={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} targetUser={selectedUserForWithdraw} onSuccess={() => { fetchUserLists(); fetchUser(true); }} />
      <MarketRateModal isOpen={rateModalOpen} onClose={() => setRateModalOpen(false)} currentTiempos={marketRates.multiplier_tiempos} currentReventados={marketRates.multiplier_reventados} onSuccess={fetchMarketRates} />

      <AnimatePresence>
        {siprBlock && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[2000] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-4">
                <div className="max-w-xl w-full border-[4px] sm:border-[6px] border-red-600 rounded-[4rem] bg-black shadow-[0_0_150px_rgba(255,0,0,0.6)] overflow-hidden mx-4 relative group">
                    {/* ALIVE GLOW FOR ALERT */}
                    <div className="absolute -inset-4 bg-red-600/20 rounded-[4rem] blur-3xl animate-pulse transition-all duration-1000"></div>
                    
                    <div className="relative z-10">
                        <div className="p-8 sm:p-16 text-center bg-red-950/10 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                            <i className="fas fa-radiation text-7xl text-red-600 mb-8 animate-pulse relative z-10"></i>
                            <h2 className="text-4xl sm:text-6xl font-display font-black text-white uppercase mb-4 relative z-10">RIESGO <span className="text-red-600">SIPR</span></h2>
                            <p className="text-red-500 font-mono font-black text-2xl uppercase tracking-tighter relative z-10">Vector {siprBlock.number} Saturado</p>
                        </div>
                        <div className="p-8 sm:p-16 space-y-10">
                            <p className="text-center text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Estrategia Sugerida por el Núcleo Phront:</p>
                            <div className="grid grid-cols-5 gap-3 sm:gap-6">
                                {siprBlock.coldTen.map(num => (
                                    <button key={num} onClick={() => { setBetNumber(num); setSiprBlock(null); }} className="py-6 rounded-2xl bg-black border-2 border-cyber-neon/40 text-cyber-neon font-mono font-black text-3xl hover:bg-cyber-neon hover:text-black transition-all shadow-neon-cyan hover:scale-110">
                                        {num}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setSiprBlock(null)} className="w-full py-8 bg-white text-black font-display font-black text-xl uppercase tracking-[0.6em] rounded-3xl active:scale-95 transition-all shadow-2xl">RECALIBRAR CONSOLA</button>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
          <div className="relative group">
              {/* ALIVE GLOW: QUANTUM REACTOR */}
              <div className="absolute -inset-4 bg-cyber-blue/20 rounded-[3.5rem] blur-3xl animate-pulse transition-all duration-1000 opacity-20"></div>
              
              <div className="glass-morphism rounded-[3.5rem] p-8 border-2 border-cyber-blue/30 shadow-neon-blue flex flex-col items-center justify-center relative overflow-hidden h-full z-10">
                  <div className="absolute inset-0 bg-cyber-blue/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <QuantumReactor status={isMarketClosed ? 'RESTRINGIDO' : 'ILIMITADO'} />
                  <div className="mt-8 text-center relative z-10">
                      <h4 className={`text-2xl font-display font-black uppercase tracking-[0.2em] ${isMarketClosed ? 'text-red-500' : 'text-cyber-blue'}`}>
                          {isMarketClosed ? 'REACTOR_LOCK' : 'REACTOR_SYNC'}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest">Sincronía de Energía</p>
                  </div>
              </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
              <div className="relative group">
                  {/* ALIVE GLOW: CAPITAL */}
                  <div className="absolute -inset-4 bg-cyber-blue/20 rounded-[3.5rem] blur-3xl animate-pulse transition-all duration-1000 opacity-20"></div>
                  
                  <div className="relative overflow-hidden glass-morphism border-2 border-white/10 rounded-[3.5rem] p-8 md:p-12 shadow-2xl transition-all hover:border-cyber-blue/40 z-10 h-full">
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-cyber-blue shadow-[0_0_20px_#2463eb] animate-pulse"></div>
                      <div className="flex justify-between items-start mb-8">
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Capital de Red</span>
                          <div className="w-10 h-10 rounded-xl bg-cyber-blue/10 flex items-center justify-center border border-cyber-blue/30"><i className="fas fa-vault text-cyber-blue"></i></div>
                      </div>
                      <div className="flex items-baseline gap-3">
                          <span className="text-3xl font-display text-cyber-blue font-black opacity-40">₡</span>
                          <h2 className="text-fluid-balance font-display font-black text-white tracking-tighter drop-shadow-2xl">
                              {user ? formatCurrency(user.balance_bigint).replace('₡', '').trim() : '0'}
                          </h2>
                      </div>
                  </div>
              </div>

              <div className="relative group/rate">
                  {/* ALIVE GLOW: MULTIPLIER */}
                  <div className="absolute -inset-4 bg-cyber-success/20 rounded-[3.5rem] blur-3xl animate-pulse transition-all duration-1000 opacity-20"></div>
                  
                  <div 
                    onClick={() => (isAdmin || isVendor) && setRateModalOpen(true)}
                    className={`relative overflow-hidden glass-morphism border-2 border-white/10 rounded-[3.5rem] p-8 md:p-12 shadow-2xl transition-all z-10 h-full ${(isAdmin || isVendor) ? 'cursor-pointer hover:border-cyber-success/80 hover:shadow-neon-green hover:scale-[1.02]' : 'hover:border-cyber-success/40'}`}
                  >
                      <div className="flex justify-between items-start mb-8">
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Multiplicador Base</span>
                          <div className={`w-10 h-10 rounded-xl bg-cyber-success/10 flex items-center justify-center border border-cyber-success/30 animate-pulse ${(isAdmin || isVendor) ? 'group-hover/rate:bg-cyber-success group-hover/rate:text-black transition-colors' : ''}`}>
                            <i className={`fas ${(isAdmin || isVendor) ? 'fa-edit' : 'fa-bolt'} text-cyber-success ${(isAdmin || isVendor) ? 'group-hover/rate:text-black' : ''}`}></i>
                          </div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                          <h2 className="text-6xl md:text-8xl font-display font-black text-cyber-success tracking-tighter drop-shadow-[0_0_30px_rgba(0,255,148,0.3)]">
                              {marketRates.multiplier_tiempos}x
                          </h2>
                          <div className="text-right">
                              <span className="text-[9px] font-mono text-slate-600 block uppercase font-black">Reventado</span>
                              <span className="text-[14px] font-black text-red-500 drop-shadow-[0_0_5px_rgba(255,0,0,0.5)] uppercase">{marketRates.multiplier_reventados}x_fire</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <div className="relative group">
              {/* ALIVE GLOW: DRAW TIME */}
              <div className={`absolute -inset-4 rounded-[3.5rem] blur-3xl animate-pulse transition-all duration-1000 opacity-20 ${isMarketClosed ? 'bg-cyber-vapor/20' : 'bg-cyber-success/20'}`}></div>
              
              <div className={`relative overflow-hidden glass-morphism border-4 rounded-[3.5rem] p-8 md:p-12 transition-all duration-700 z-10 h-full ${isMarketClosed ? 'border-cyber-vapor/60 shadow-neon-purple' : 'border-white/10 shadow-neon-blue'}`}>
                  <div className="flex justify-between items-start mb-8">
                      <div className={`px-4 py-2 rounded-full border-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${isMarketClosed ? 'bg-cyber-vapor/10 border-cyber-vapor text-cyber-vapor' : 'bg-cyber-success/10 border-cyber-success text-cyber-success'}`}>
                          <div className={`w-2 h-2 rounded-full bg-current ${isMarketClosed ? 'animate-pulse' : 'animate-ping'}`}></div>
                          <span>{isMarketClosed ? 'HIBERNACIÓN' : 'SINC_ACTIVA'}</span>
                      </div>
                  </div>
                  <div className="relative">
                      <span className="text-[10px] text-slate-600 block mb-3 font-black uppercase tracking-widest">
                          {isMarketClosed ? 'Kernel_Secure' : 'Próxima Inyección'}
                      </span>
                      <AnimatePresence mode="wait">
                        {nextDraw ? (
                          <motion.h3 
                            key="active" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tighter italic drop-shadow-lg"
                          >
                              {nextDraw.split(' ')[0]}
                          </motion.h3>
                        ) : (
                          <motion.div key="hibernating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
                            <h3 className="text-3xl font-display font-black text-cyber-vapor uppercase tracking-tighter leading-none animate-pulse">REPOSO_NÚCLEO</h3>
                            <p className="text-[10px] font-mono text-amber-500 uppercase font-black tracking-[0.2em]">Sincronía Programada</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                  </div>
              </div>
          </div>
      </div>

      <LiveResultsPanel />

      {/* TACTICAL CONSOLE */}
      <div className="relative group/console">
          {/* ALIVE GLOW: MAIN CONSOLE */}
          <div className={`absolute -inset-4 rounded-[4rem] md:rounded-[5rem] blur-3xl opacity-20 transition-all duration-1000 animate-pulse ${isMarketClosed ? 'bg-cyber-vapor' : 'bg-cyber-neon'}`}></div>
          
          <div className={`relative rounded-[4rem] md:rounded-[5rem] p-1.5 overflow-hidden border-[6px] ${isMarketClosed ? 'border-cyber-vapor/40 grayscale-[0.3]' : drawTheme.border} transition-all duration-700 z-10 bg-[#02050a]/98 shadow-[0_0_150px_rgba(0,0,0,1)]`}>
              {reventadoActive && <ReventadosEffect />}

              <AnimatePresence>
                {showPreConfirm && betDraft && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-8">
                    <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} className="bg-[#050a14] border-4 border-white/10 rounded-[4rem] p-8 md:p-16 max-w-2xl w-full shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden group/modal">
                        {/* ALIVE GLOW: MODAL */}
                        <div className="absolute -inset-4 bg-cyber-success/20 rounded-[4rem] blur-3xl animate-pulse transition-all duration-1000"></div>
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-cyber-success to-transparent animate-pulse shadow-[0_0_20px_#00FF94] relative z-10"></div>
                        
                        <div className="text-center mb-10 md:mb-16 relative z-10">
                            <h4 className="text-[10px] md:text-[12px] text-slate-500 uppercase mb-8 md:mb-10 font-black tracking-[0.8em]">Autenticación de Paquete</h4>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 md:gap-16">
                                <div className="text-8xl md:text-[12rem] font-display font-black text-white text-glow-white leading-none tracking-tighter">{betDraft.number}</div>
                                <div className="text-center sm:text-left space-y-4">
                                    <div className="text-4xl md:text-6xl font-display font-black text-cyber-success drop-shadow-[0_0_20px_rgba(0,255,148,0.4)]">{formatCurrency(betDraft.amount)}</div>
                                    <div className={`text-[10px] md:text-[12px] font-black uppercase tracking-[0.5em] px-4 py-2 rounded-lg border-2 ${betDraft.isReventadoActive ? 'text-red-500 border-red-500/30 bg-red-500/10' : 'text-cyber-neon border-cyber-neon/30 bg-cyber-neon/10'}`}>
                                        {betDraft.isReventadoActive ? `OVERDRIVE_${marketRates.multiplier_reventados}X` : `MODO_ESTÁNDAR_${marketRates.multiplier_tiempos}X`}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 md:gap-6 relative z-10">
                            <button onClick={() => { setShowPreConfirm(false); setBetDraft(null); }} className="flex-1 py-5 md:py-7 bg-black border-2 border-red-900 text-red-500 rounded-3xl font-display font-black text-sm uppercase tracking-widest hover:bg-red-950 transition-all">ABORTAR</button>
                            <button onClick={confirmBetAndAddToQueue} className="flex-[2] py-5 md:py-7 bg-cyber-success text-black rounded-3xl font-display font-black text-xl uppercase tracking-[0.5em] shadow-neon-green hover:bg-white transition-all active:scale-95">CONFIRMAR_NODO</button>
                        </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative z-10 p-6 md:p-16 lg:p-24 flex flex-col gap-10 md:gap-20">
                  <div className="flex flex-col xl:flex-row justify-between items-start gap-8 lg:gap-16">
                      <div>
                          <h3 className="text-fluid-h1 font-display font-black text-white uppercase tracking-tighter leading-none">
                              CONSOLA <span className={`${isMarketClosed ? 'text-cyber-vapor' : drawTheme.text} transition-colors duration-700 drop-shadow-[0_0_20px_currentColor]`}>TÁCTICA</span>
                          </h3>
                          <div className="h-2 w-48 md:w-64 bg-white/5 mt-6 md:mt-8 relative overflow-hidden rounded-full border border-white/5">
                              <motion.div 
                                className={`absolute inset-0 transition-all duration-700`} 
                                style={{ backgroundColor: isMarketClosed ? '#7c3aed' : drawTheme.hex }}
                                animate={{ x: isMarketClosed ? '-90%' : '0%' }}
                              />
                          </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 md:gap-6 w-full xl:w-auto">
                          <div className="flex bg-black/60 p-1 rounded-3xl border-2 border-white/10 shadow-inner backdrop-blur-3xl overflow-x-auto no-scrollbar">
                              {Object.values(DrawTime).map((t) => (
                                  <button key={t} onClick={() => setSelectedDraw(t)} className={`px-4 md:px-8 py-3 md:py-4 rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${selectedDraw === t ? `bg-white text-black shadow-2xl scale-105` : 'text-slate-500 hover:text-white'}`}>{t.split(' ')[0]}</button>
                              ))}
                          </div>
                          <div className="flex bg-black/60 p-1 rounded-3xl border-2 border-white/10 shadow-inner backdrop-blur-3xl overflow-x-auto no-scrollbar">
                              {Object.values(LotteryRegion).map(reg => {
                                  const flags: any = { [LotteryRegion.TICA]: '🇨🇷', [LotteryRegion.NICA]: '🇳🇮', [LotteryRegion.DOMINICANA]: '🇩🇴', [LotteryRegion.PANAMENA]: '🇵🇦' };
                                  return <button key={reg} onClick={() => setSelectedRegion(reg)} className={`px-4 md:px-6 py-3 md:py-4 rounded-2xl text-2xl md:text-3xl transition-all ${selectedRegion === reg ? 'bg-white/10 scale-110 border-2 border-white/20' : 'opacity-20 grayscale hover:opacity-100 hover:grayscale-0'}`}>{flags[reg]}</button>;
                              })}
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-16 items-end">
                      {/* TARGET LOCK NUMBER INPUT */}
                      <div className="md:col-span-4 lg:col-span-3 relative group/field">
                          <label className="text-[10px] md:text-[12px] text-slate-500 font-black mb-4 md:mb-6 block ml-4 uppercase tracking-[0.4em]">Vector_ID</label>
                          <div className="relative">
                              <div className={`absolute -inset-4 border-2 ${drawTheme.border} rounded-[3rem] opacity-0 group-focus-within/field:opacity-40 transition-opacity animate-pulse pointer-events-none`}></div>
                              <input 
                                  type="number" maxLength={2} value={betNumber} 
                                  onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); if (val.length <= 2) setBetNumber(val); }} 
                                  className="w-full bg-black/60 border-4 border-white/5 rounded-[3rem] py-8 md:py-12 text-center text-fluid-number-giant font-display font-black text-white focus:border-cyber-neon focus:text-cyber-neon outline-none transition-all shadow-[inset_0_0_30px_black] placeholder-slate-900" 
                                  placeholder="00" 
                              />
                          </div>
                          {liveRisk && (
                              <div className="absolute -bottom-10 left-0 w-full flex justify-center animate-in slide-in-from-top-4">
                                  <div className={`px-4 md:px-6 py-1.5 md:py-2 rounded-full border-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest ${liveRisk.risk_status === 'BLOOD_RED' ? 'border-red-600 bg-red-600/10 text-red-500' : 'border-cyber-success/30 bg-cyber-success/5 text-cyber-success'}`}>
                                      Saturación: {Math.round(liveRisk.exposure_percent)}%
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* MONTO INPUT */}
                      <div className="md:col-span-8 lg:col-span-5 relative">
                          <label className="text-[10px] md:text-[12px] text-slate-500 font-black mb-4 md:mb-6 block ml-4 uppercase tracking-[0.4em]">Inyección_Capital (CRC)</label>
                          <div className="relative group/field">
                              <div className={`absolute -inset-4 border-2 border-cyber-success rounded-[3rem] opacity-0 group-focus-within/field:opacity-20 transition-opacity animate-pulse pointer-events-none`}></div>
                              <input 
                                  type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} 
                                  className={`w-full bg-black/60 border-4 rounded-[3rem] py-8 md:py-12 text-center text-fluid-balance font-display font-black outline-none transition-all ${showMinBetError ? 'border-red-600 animate-shake text-red-500' : 'border-white/5 text-cyber-success focus:border-cyber-success shadow-[inset_0_0_30px_black]'}`} 
                                  placeholder="0" 
                              />
                              <div className="absolute right-8 md:right-12 top-1/2 -translate-y-1/2 text-cyber-success/30 font-display font-black text-xl md:text-2xl">CRC</div>
                          </div>
                      </div>

                      <div className="md:col-span-6 lg:col-span-2 flex flex-col items-center">
                          <label className="text-[10px] md:text-[12px] text-slate-500 font-black mb-4 md:mb-6 uppercase tracking-[0.4em]">Overdrive</label>
                          <button 
                            disabled={selectedRegion !== LotteryRegion.TICA || isMarketClosed} 
                            onClick={() => setReventadoActive(!reventadoActive)} 
                            className={`w-20 h-20 md:w-32 md:h-32 rounded-[3.5rem] border-4 flex items-center justify-center transition-all duration-500 ${reventadoActive ? 'bg-red-600 border-white shadow-neon-red scale-110' : 'bg-black border-white/5 hover:border-red-600/40 hover:scale-105'} disabled:opacity-5 disabled:cursor-not-allowed`}
                          >
                            <i className={`fas fa-fire text-3xl md:text-5xl ${reventadoActive ? 'text-white' : 'text-slate-800'}`}></i>
                          </button>
                      </div>

                      <div className="md:col-span-6 lg:col-span-2">
                        <button 
                            onClick={handleInitiateAdd} 
                            disabled={isMarketClosed}
                            className="w-full h-20 md:h-32 bg-cyber-success text-black font-black uppercase rounded-[3.5rem] flex flex-col items-center justify-center gap-1 md:gap-2 hover:bg-white hover:scale-105 transition-all shadow-neon-green group/btn disabled:opacity-20"
                        >
                            <i className="fas fa-satellite-dish text-3xl md:text-4xl group-hover:animate-ping"></i>
                            <span className="text-[8px] md:text-[10px] font-display tracking-[0.4em]">CARGAR</span>
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* BOTTOM PANELS GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 md:gap-16">
        <div className="xl:col-span-2 space-y-10 md:space-y-16">
            <GlobalBetsTable refreshTrigger={tableRefreshTrigger} />
            <AIRecommendations drawTime={selectedDraw} onSelectNumber={setBetNumber} />
        </div>
        
        <div className="xl:col-span-1 space-y-10 md:space-y-16">
            <TopNumbersPanel />
            <LoyaltyCard />
            <AnimatePresence>
            {pendingBets.length > 0 && (
                <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="relative group">
                    {/* ALIVE GLOW: PENDING QUEUE */}
                    <div className="absolute -inset-4 bg-cyber-success/20 rounded-[3.5rem] blur-3xl animate-pulse transition-all duration-1000 opacity-20"></div>
                    
                    <div className="relative bg-[#050a14] border-4 border-cyber-success rounded-[3.5rem] p-6 md:p-10 shadow-[0_0_80px_rgba(0,0,0,0.8)] carbon-texture overflow-hidden mx-2 z-10">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-cyber-success shadow-[0_0_20px_#00FF94] animate-pulse"></div>
                        <div className="flex items-center gap-4 md:gap-6 mb-8 md:mb-12">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-cyber-success/10 border-2 border-cyber-success flex items-center justify-center shadow-neon-green shrink-0">
                                <i className="fas fa-stream text-2xl md:text-3xl text-cyber-success"></i>
                            </div>
                            <div>
                                <h4 className="text-xl md:text-2xl font-display font-black text-white uppercase tracking-widest leading-none">Cola_Inyección</h4>
                                <p className="text-[8px] md:text-[10px] text-slate-500 mt-1 md:mt-2 font-black uppercase tracking-[0.3em]">Paquetes Validados</p>
                            </div>
                        </div>
                        <div className="space-y-4 mb-8 md:mb-12 max-h-[400px] md:max-h-[550px] overflow-y-auto custom-scrollbar pr-2 md:pr-4">
                            {pendingBets.map(bet => (
                                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} key={bet.id} className="bg-black/60 border-2 border-white/5 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] flex justify-between items-center hover:border-cyber-success/50 transition-all group">
                                    <div className="flex items-center gap-4 md:gap-6">
                                        <div className="text-3xl md:text-5xl font-display font-black text-white group-hover:text-cyber-success transition-colors">{bet.number}</div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-widest">{bet.draw.split(' ')[0]}</span>
                                            <span className="text-[7px] md:text-[8px] font-mono text-slate-600 uppercase font-bold">{bet.mode}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg md:text-2xl text-cyber-success font-display font-black">{formatCurrency(bet.amount)}</div>
                                        <button onClick={() => setPendingBets(prev => prev.filter(p => p.id !== bet.id))} className="text-[8px] md:text-[10px] text-red-600 font-black uppercase mt-1 md:mt-2 border-b border-red-900/50 hover:text-red-500 hover:border-red-500 transition-all">REMOVER</button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        <button onClick={handleExecuteBatch} disabled={executingBatch} className="w-full py-8 md:py-10 bg-cyber-success text-black font-display font-black text-xl md:text-2xl uppercase tracking-[0.5em] rounded-[2rem] md:rounded-[2.5rem] shadow-neon-green hover:bg-white transition-all active:scale-95 relative overflow-hidden group/btn">
                            <div className="absolute inset-0 bg-white/40 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 skew-x-12"></div>
                            {executingBatch ? 'SINC_EN_CURSO...' : 'INYECTAR_TOTAL'}
                        </button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
      </div>

      {(isAdmin || isVendor) && (
          <div className="space-y-12 md:space-y-20 mt-12 pt-12 border-t border-white/5">
            <div className="flex items-center gap-6 md:gap-8 mb-8 md:mb-12">
                 <div className="h-px flex-1 bg-white/10"></div>
                 <h2 className="text-lg md:text-2xl font-display font-black text-white/40 uppercase tracking-[1em]">Zona_Restringida_Maestro</h2>
                 <div className="h-px flex-1 bg-white/10"></div>
            </div>
            <UserManagementPanel players={players} vendors={vendors} onRecharge={u => { setSelectedUserForRecharge(u); setRechargeModalOpen(true); }} onWithdraw={u => { setSelectedUserForWithdraw(u); setWithdrawModalOpen(true); }} onRefresh={fetchUserLists} />
            <RiskLimitManager />
            <UserCreationForm onCreated={fetchUserLists} />
            <DataPurgeCard />
          </div>
      )}
    </div>
  );
}
