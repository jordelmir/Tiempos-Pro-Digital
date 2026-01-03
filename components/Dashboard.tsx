
import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole, AppUser, DrawTime, GameMode, LotteryRegion } from '../types';
import RechargeModal from './RechargeModal';
import WithdrawModal from './WithdrawModal';
import AdminResultControl from './AdminResultControl';
import UserManagementPanel from './UserManagementPanel';
import ReventadosEffect from './ReventadosEffect';
import LiveResultsPanel from './LiveResultsPanel'; 
import GlobalBetsTable from './GlobalBetsTable'; 
import TopNumbersPanel from './TopNumbersPanel'; 
import AIRecommendations from './AIRecommendations'; 
import LoyaltyCard from './LoyaltyCard'; 
import { useServerClock } from '../hooks/useServerClock';
import { formatCurrency } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { api } from '../services/edgeApi';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

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

  const [siprBlock, setSiprBlock] = useState<string | null>(null);
  const [showMinBetError, setShowMinBetError] = useState(false);
  
  // Market Rates Local State
  const [marketRates, setMarketRates] = useState({ multiplier_tiempos: 90, multiplier_reventados: 200 });
  const [isEditingRates, setIsEditingRates] = useState(false);
  const [tempRates, setTempRates] = useState({ t: 90, r: 200 });

  const { status: marketStatus, nextDraw } = useServerClock();
  const isMarketClosed = marketStatus === 'CLOSED';
  
  const isAdmin = user?.role === UserRole.SuperAdmin;
  const isVendor = user?.role === UserRole.Vendedor;
  const isClient = user?.role === UserRole.Cliente;

  const canPublishResults = isAdmin || isVendor;
  const canManageUsers = isAdmin || isVendor;
  const canModifyRates = isAdmin || isVendor;

  useEffect(() => { if (nextDraw) setSelectedDraw(nextDraw); }, [nextDraw]);

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

  const theme = useMemo(() => {
    switch (selectedDraw) {
        case DrawTime.MEDIODIA: return { hex: '#ff5f00', glow: 'bg-cyber-solar', text: 'text-cyber-solar', border: 'border-cyber-solar', name: 'solar' }; 
        case DrawTime.TARDE: return { hex: '#7c3aed', glow: 'bg-cyber-vapor', text: 'text-cyber-vapor', border: 'border-cyber-vapor', name: 'vapor' }; 
        default: return { hex: '#1e3a8a', glow: 'bg-cyber-abyss', text: 'text-blue-400', border: 'border-blue-900', name: 'abyss' }; 
    }
  }, [selectedDraw]);

  const fetchLists = async () => {
    if (!user || isClient) return; 
    setLoadingLists(true);
    if (isAdmin || isVendor) { 
        const { data } = await supabase.from('app_users').select('*').eq('role', 'Cliente').limit(100); 
        if (data) setPlayers(data as AppUser[]); 
    }
    if (isAdmin) { 
        const { data } = await supabase.from('app_users').select('*').eq('role', 'Vendedor').limit(100); 
        if (data) setVendors(data as AppUser[]); 
    }
    setLoadingLists(false);
  };

  useEffect(() => { fetchLists(); }, [user]);

  const handleAddToQueue = () => {
      const amountNum = Number(betAmount);
      if (betAmount === '' || amountNum < MIN_BET_AMOUNT) {
          setShowMinBetError(true);
          if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
          setTimeout(() => setShowMinBetError(false), 3000);
          return;
      }
      if (isMarketClosed || !betNumber || !betAmount || amountNum <= 0) return;
      
      const totalAmount = reventadoActive ? amountNum * 2 : amountNum;
      setPendingBets(prev => [{ 
          id: `draft-${Date.now()}`, number: betNumber, amount: totalAmount * 100, draw: selectedDraw, 
          mode: reventadoActive ? GameMode.REVENTADOS : GameMode.TIEMPOS, region: selectedRegion, isReventadoActive: reventadoActive
      }, ...prev]);
      setBetNumber(''); 
      setShowMinBetError(false);
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
                       setSiprBlock(bet.number);
                       setTimeout(() => setSiprBlock(null), 3500);
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
    <div className="p-4 md:p-8 space-y-8 md:space-y-16 relative overflow-hidden">
      {siprBlock && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-red-950/95 backdrop-blur-2xl animate-in fade-in duration-300">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
              <div className="relative text-center border-4 border-red-600 p-12 rounded-[3rem] bg-black shadow-[0_0_100px_rgba(255,0,0,0.8)] overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-red-600 animate-[scanline_1s_linear_infinite]"></div>
                  <i className="fas fa-radiation text-8xl text-red-600 mb-8 animate-pulse"></i>
                  <h2 className="text-5xl font-display font-black text-cyber-neon uppercase tracking-tighter">SIPR_LOCKDOWN</h2>
                  <div className="bg-red-600 text-black px-6 py-2 my-6 font-mono font-black text-2xl skew-x-12 inline-block text-shadow-sm">VECTOR {siprBlock} SATURADO</div>
                  <p className="text-xs font-mono text-red-500 uppercase tracking-[0.4em] animate-pulse">Límite de Riesgo Alcanzado // Inyección Abortada</p>
              </div>
          </div>
      )}

      {batchSuccess && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="relative text-center p-12 border-2 border-cyber-success rounded-[3rem] bg-black shadow-neon-green overflow-hidden">
              <div className="w-24 h-24 bg-cyber-success/10 rounded-full border-2 border-cyber-success flex items-center justify-center mx-auto mb-6 shadow-neon-green">
                  <i className="fas fa-check-double text-4xl text-cyber-success animate-bounce"></i>
              </div>
              <h2 className="text-4xl font-display font-black text-slate-100 uppercase tracking-tighter mb-2">Transmisión <span className="text-cyber-success text-glow">Exitosa</span></h2>
              <p className="text-xs font-mono text-cyber-success/70 uppercase tracking-[0.5em]">Integridad de Datos: 100% // Nodo Verificado</p>
           </div>
        </div>
      )}

      <RechargeModal isOpen={rechargeModalOpen} targetUser={selectedUserForRecharge} onClose={() => setRechargeModalOpen(false)} onSuccess={fetchLists} />
      <WithdrawModal isOpen={withdrawModalOpen} targetUser={selectedUserForWithdraw} onClose={() => setWithdrawModalOpen(false)} onSuccess={fetchLists} />
      {canPublishResults && <AdminResultControl isOpen={adminResultOpen} onClose={() => setAdminResultOpen(false)} initialRegion={selectedRegion} />}

      <header className="relative z-10 border-b border-white/5 pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 bg-cyber-neon rounded-full animate-ping"></div>
                    <span className="font-mono text-[11px] text-cyber-neon uppercase tracking-[0.4em] font-black">OPERATIVO_PHRONT_MAESTRO_v6.5</span>
                </div>
                <h2 className="text-5xl md:text-8xl font-display font-black text-slate-100 italic tracking-tighter uppercase leading-none text-shadow-sm">CENTRO DE <span className="text-cyber-neon text-glow-cyan">COMANDO</span></h2>
            </div>
            
            {canPublishResults && (
                <button onClick={() => setAdminResultOpen(true)} className="w-16 h-16 bg-cyber-neon text-black rounded-2xl hover:bg-white hover:shadow-neon-cyan transition-all flex items-center justify-center shadow-lg group/terminal">
                    <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 3, theme: 'neon' }}>
                        <i className="fas fa-terminal text-2xl"></i>
                    </AnimatedIconUltra>
                </button>
            )}
        </div>
      </header>

      <div className="w-full relative z-20">
          <LoyaltyCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-8">
          <div className="lg:col-span-2"><LiveResultsPanel /></div>
          <div className="lg:col-span-1">
               <TopNumbersPanel />
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-3 space-y-12">
            <AIRecommendations drawTime={selectedDraw} onSelectNumber={(n) => { setBetNumber(n); setBetAmount('500'); if(navigator.vibrate) navigator.vibrate(50); }} />

            <div className="relative">
                <div className={`relative rounded-[4rem] p-1 overflow-hidden border-2 md:border-[6px] ${isMarketClosed ? 'border-red-900 opacity-50' : theme.border} transition-all duration-700 z-10 bg-black/80 shadow-2xl backdrop-blur-3xl`}>
                    {reventadoActive && <ReventadosEffect />}
                    <div className="relative z-10 p-6 md:p-12">
                        <div className="flex flex-col xl:flex-row justify-between items-start gap-8 mb-16">
                            <div>
                                <h3 className="text-4xl md:text-6xl font-display font-black text-slate-100 uppercase tracking-tighter flex items-center gap-6">
                                    CONSOLA <span className={`${theme.text} text-glow`}>JUEGOS</span>
                                </h3>
                                
                                {/* MARKET RATES CONTROL IN CONSOLE */}
                                <div className="flex flex-wrap items-center gap-4 mt-6">
                                    {isEditingRates && canModifyRates ? (
                                        <div className="flex items-center gap-3 bg-black/80 p-2 rounded-2xl border-2 border-white/20 animate-in zoom-in-95">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[7px] text-cyber-neon uppercase font-black ml-1">Normal</span>
                                                <input type="number" value={tempRates.t} onChange={e=>setTempRates({...tempRates, t: Number(e.target.value)})} className="w-14 bg-black border border-cyber-neon/40 rounded px-2 py-1 text-[11px] font-mono text-white outline-none" />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[7px] text-red-500 uppercase font-black ml-1">Rev</span>
                                                <input type="number" value={tempRates.r} onChange={e=>setTempRates({...tempRates, r: Number(e.target.value)})} className="w-14 bg-black border border-red-900/40 rounded px-2 py-1 text-[11px] font-mono text-white outline-none" />
                                            </div>
                                            <div className="flex gap-1 ml-2">
                                                <button onClick={handleUpdateRates} className="w-8 h-8 bg-cyber-success text-black rounded-lg flex items-center justify-center hover:scale-110 transition-transform"><i className="fas fa-check text-xs"></i></button>
                                                <button onClick={()=>setIsEditingRates(false)} className="w-8 h-8 bg-slate-800 text-white rounded-lg flex items-center justify-center hover:scale-110 transition-transform"><i className="fas fa-times text-xs"></i></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <div onClick={() => canModifyRates && setIsEditingRates(true)} className={`px-6 py-2 rounded-full bg-black border-2 border-cyber-neon text-[11px] font-black uppercase text-cyber-neon tracking-widest shadow-neon-cyan ${canModifyRates ? 'cursor-pointer hover:bg-white/5 transition-all group' : ''}`}>
                                                MARKET_NORMAL: {marketRates.multiplier_tiempos}x 
                                                {canModifyRates && <i className="fas fa-edit ml-2 opacity-0 group-hover:opacity-100 transition-opacity"></i>}
                                            </div>
                                            <div onClick={() => canModifyRates && setIsEditingRates(true)} className={`px-6 py-2 rounded-full bg-black border-2 border-red-600 text-[11px] font-black uppercase text-red-500 tracking-widest shadow-neon-red ${canModifyRates ? 'cursor-pointer hover:bg-white/5 transition-all group' : ''}`}>
                                                MARKET_REV: {marketRates.multiplier_reventados}x
                                                {canModifyRates && <i className="fas fa-edit ml-2 opacity-0 group-hover:opacity-100 transition-opacity"></i>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex bg-black/80 p-2 rounded-[2rem] border-2 border-white/10 shadow-inner">
                                    {Object.values(DrawTime).map((t) => (
                                        <button key={t} onClick={() => setSelectedDraw(t)} className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${selectedDraw === t ? `bg-white text-black shadow-2xl scale-105` : 'text-slate-500 hover:text-white'}`}>{t.split(' ')[0]}</button>
                                    ))}
                                </div>
                                <div className="flex bg-black/80 p-2 rounded-[2rem] border-2 border-white/10 shadow-inner">
                                    {Object.values(LotteryRegion).map(reg => {
                                        const flags: any = { [LotteryRegion.TICA]: '🇨🇷', [LotteryRegion.NICA]: '🇳🇮', [LotteryRegion.DOMINICANA]: '🇩🇴', [LotteryRegion.PANAMENA]: '🇵🇦' };
                                        return <button key={reg} onClick={() => setSelectedRegion(reg)} className={`px-5 py-3 rounded-2xl text-2xl transition-all ${selectedRegion === reg ? 'bg-white/10 scale-125 border border-white/20' : 'opacity-30 grayscale hover:grayscale-0'}`}>{flags[reg]}</button>;
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                            <div className="md:col-span-1">
                                <label className="text-[11px] font-black uppercase text-cyber-neon mb-3 block tracking-[0.3em] ml-2">Vector</label>
                                <input id="betNumberInput" type="number" maxLength={2} value={betNumber} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); if (val.length <= 2) setBetNumber(val); }} className="w-full bg-black/90 border-[4px] border-white/10 rounded-[2.5rem] py-10 text-center text-7xl font-mono font-black text-cyber-neon focus:border-cyber-neon outline-none shadow-inner transition-all" placeholder="00" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[11px] font-black uppercase text-cyber-success mb-3 block tracking-[0.3em] ml-2">Inyección CRC</label>
                                <div className="relative">
                                    <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} className={`w-full bg-black/90 border-[4px] rounded-[2.5rem] py-10 text-center text-6xl font-mono font-black outline-none transition-all ${showMinBetError ? 'border-red-600 animate-shake text-red-500' : 'border-white/10 text-cyber-success focus:border-cyber-success'}`} placeholder="0" />
                                    <div className="absolute -bottom-8 left-0 w-full text-center">
                                        <p className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all ${showMinBetError ? 'text-red-500 animate-pulse' : 'text-cyber-success/40'}`}>Limite_Min: ₡100</p>
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-1 flex flex-col justify-center items-center">
                                <label className="text-[11px] font-black uppercase text-red-500 mb-3 tracking-[0.3em]">Reactor</label>
                                <button disabled={selectedRegion !== LotteryRegion.TICA} onClick={() => setReventadoActive(!reventadoActive)} className={`w-24 h-24 rounded-[2rem] border-[4px] flex items-center justify-center transition-all ${reventadoActive ? 'bg-red-600 border-white shadow-neon-red scale-110' : 'bg-black border-white/10 hover:border-red-600/50'}`}><i className={`fas fa-fire text-4xl ${reventadoActive ? 'text-white' : 'text-slate-800'}`}></i></button>
                            </div>
                            <button onClick={handleAddToQueue} className="bg-cyber-success text-black font-black uppercase rounded-[2.5rem] flex flex-col items-center justify-center gap-3 hover:bg-white hover:scale-105 transition-all shadow-neon-green group/btn">
                                <i className="fas fa-bolt text-4xl group-hover:animate-bounce"></i>
                                <span className="text-[12px] font-display tracking-[0.2em]">ACOPLAR</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {pendingBets.length > 0 && (
                <div className="bg-[#050a14]/90 border-[4px] border-cyber-success rounded-[3.5rem] p-10 shadow-2xl animate-in zoom-in-95 backdrop-blur-xl">
                    <div className="flex items-center gap-4 mb-8">
                        <i className="fas fa-layer-group text-cyber-success text-2xl"></i>
                        <h4 className="text-xl font-display font-black text-slate-100 uppercase tracking-widest">Búfer de Transmisión</h4>
                    </div>
                    <div className="space-y-4 mb-10 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
                        {pendingBets.map(bet => (
                            <div key={bet.id} className="bg-black/60 border-2 border-white/5 p-6 rounded-3xl flex justify-between items-center group/item hover:border-cyber-success/40 transition-all">
                                <div className="flex items-center gap-8">
                                    <div className="text-5xl font-mono font-black text-cyber-neon text-glow-cyan">{bet.number}</div>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{bet.draw.split(' ')[0]}</span>
                                        <span className="text-[9px] font-mono text-cyber-success font-black mt-1">PROTOCOLO: {bet.mode.split(' ')[0].toUpperCase()}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-cyber-success font-mono font-black text-2xl">{formatCurrency(bet.amount)}</div>
                                    <button onClick={() => setPendingBets(prev => prev.filter(p => p.id !== bet.id))} className="text-[10px] text-red-500 font-black uppercase mt-2 hover:text-white transition-colors">Eliminar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleExecuteBatch} disabled={executingBatch} className="w-full py-8 bg-cyber-success text-black font-display font-black text-3xl uppercase tracking-[0.5em] rounded-[2.5rem] shadow-neon-green hover:bg-white transition-all active:scale-95">
                        {executingBatch ? 'SINC_CORE...' : 'TRANSMITIR LOTE'}
                    </button>
                </div>
            )}
            
            <GlobalBetsTable refreshTrigger={tableRefreshTrigger} />
        </div>
      </div>
    </div>
  );
}
