
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole, AppUser, DrawTime, GameMode } from '../types';
import UserCreationForm from './UserCreationForm';
import DataPurgeCard from './DataPurgeCard';
import RechargeModal from './RechargeModal';
import WithdrawModal from './WithdrawModal';
import AdminResultControl from './AdminResultControl';
import UserManagementPanel from './UserManagementPanel';
import ReventadosEffect from './ReventadosEffect';
import CountdownTimer from './CountdownTimer';
import LiveResultsPanel from './LiveResultsPanel'; 
import GlobalBetsTable from './GlobalBetsTable'; 
import RiskLimitManager from './RiskLimitManager';
import TopNumbersPanel from './TopNumbersPanel'; 
import PersonalBetsPanel from './PersonalBetsPanel';
import { useServerClock } from '../hooks/useServerClock';
import { formatCurrency } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { api } from '../services/edgeApi';
import AnimatedIconUltra from './ui/AnimatedIconUltra';
import WinnerOverlay from './WinnerOverlay';

interface PendingBet {
    id: string;
    number: string;
    amount: number;
    draw: DrawTime;
    mode: GameMode;
}

const SystemStatusHUD = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const DesktopCard = (
        <div className="relative w-full">
            <div className="absolute -inset-1 bg-cyber-blue rounded-2xl opacity-10 blur-lg animate-pulse"></div>
            <div className="relative bg-cyber-panel/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md z-10 shadow-xl">
                <h4 className="font-display font-bold text-slate-400 uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                    <i className="fas fa-server text-cyber-blue"></i> Estado del Sistema
                </h4>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Conexión WebSocket</span>
                        <span className="text-cyber-success font-mono font-bold text-shadow-green flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            ESTABLE
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Latencia Edge</span>
                        <span className="text-white font-mono">14ms</span>
                    </div>
                    <div className="h-px bg-white/5 my-2"></div>
                    <div className="text-[10px] text-cyber-blue/70 leading-relaxed font-mono font-bold">
                        ADVERTENCIA: Transacciones finales auditadas por Phront Maestro.
                    </div>
                </div>
            </div>
        </div>
    );
    const MobileBar = (
        <div className="bg-[#050a14]/95 backdrop-blur-xl border-t border-cyber-blue/30 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] w-full">
            <div onClick={() => setIsExpanded(!isExpanded)} className="flex items-center justify-between px-4 py-3 cursor-pointer active:bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-success opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-success"></span></span><span className="text-[10px] font-bold text-cyber-blue uppercase tracking-wider">SYSTEM_OK</span></div>
                    <div className="h-3 w-px bg-white/10"></div><span className="text-[10px] font-mono text-slate-400">14ms</span>
                </div>
                <i className={`fas fa-chevron-up text-xs text-cyber-blue transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
            </div>
            {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-white/5 animate-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="bg-black/40 p-2 rounded border border-white/5"><div className="text-[8px] text-slate-500 uppercase">Socket</div><div className="text-xs text-cyber-success font-bold">CONECTADO</div></div>
                        <div className="bg-black/40 p-2 rounded border border-white/5"><div className="text-[8px] text-slate-500 uppercase">Cifrado</div><div className="text-xs text-white font-bold">TLS 1.3</div></div>
                    </div>
                </div>
            )}
        </div>
    );
    return (<><div className="hidden lg:block sticky top-28 z-30">{DesktopCard}</div><div className="lg:hidden fixed bottom-8 left-0 right-0 z-40">{MobileBar}</div></>);
};

const PowerCard = ({ label, value, sub, icon, theme, isMoney, isWarning, onClick, editable }: any) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.width / 2; const centerY = rect.height / 2;
      setRotate({ x: ((e.clientY - rect.top - centerY) / centerY) * -10, y: ((e.clientX - rect.left - centerX) / centerX) * 10 });
  };
  return (
    <div ref={cardRef} onClick={onClick} onMouseMove={handleMouseMove} onMouseLeave={() => setRotate({x:0,y:0})} className={`relative group h-full rounded-2xl transition-all duration-200 perspective-1000 ${onClick ? 'cursor-pointer' : ''}`} style={{ transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1, 1, 1)` }}>
        <div className={`absolute -inset-1 ${isWarning ? 'bg-red-600' : theme.glow} rounded-2xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500`}></div>
        <div className={`relative h-full bg-[#050a14] border-2 ${isWarning ? 'border-red-500 shadow-neon-red' : `${theme.border} ${theme.shadow}`} p-6 rounded-2xl overflow-hidden backdrop-blur-md z-10`}>
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <div className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-2 ${isWarning ? 'text-red-500' : 'text-slate-400'}`}>{label} {editable && <i className="fas fa-pencil-alt ml-2 opacity-50"></i>}</div>
                    <div className={`text-3xl font-mono font-bold ${isWarning ? 'text-red-500 drop-shadow-[0_0_10px_red]' : isMoney ? theme.text : 'text-white'} text-glow-sm`}>{value}</div>
                    {sub && <div className="text-[9px] font-mono text-red-400 mt-1 animate-pulse">{sub}</div>}
                </div>
                <div className={`w-12 h-12 rounded-xl bg-black/50 flex items-center justify-center border ${isWarning ? 'border-red-500' : theme.border} shadow-inner`}>
                    <AnimatedIconUltra profile={{ animation: isWarning ? 'pulse' : 'infinite', theme: isWarning ? 'neon' : 'futuristic', speed: 3 }}><i className={`fas ${icon} text-xl ${isWarning ? 'text-red-500' : theme.text}`}></i></AnimatedIconUltra>
                </div>
            </div>
        </div>
    </div>
  );
};

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
  const [editingMultiplier, setEditingMultiplier] = useState(false);
  const [customMultiplier, setCustomMultiplier] = useState(90);
  const [customReventadosMultiplier, setCustomReventadosMultiplier] = useState(200);
  const [savingMultiplier, setSavingMultiplier] = useState(false);
  const [selectedDraw, setSelectedDraw] = useState<DrawTime>(DrawTime.NOCHE);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.TIEMPOS);
  const [betNumber, setBetNumber] = useState('');
  const [betAmount, setBetAmount] = useState('');
  const [pendingBets, setPendingBets] = useState<PendingBet[]>([]);
  const [executingBatch, setExecutingBatch] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState(false);
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState(0);
  const [winnerData, setWinnerData] = useState<any>(null);
  const { status: marketStatus, nextDraw } = useServerClock();
  const isMarketClosed = marketStatus === 'CLOSED';
  const isAdmin = user?.role === UserRole.SuperAdmin;
  const isVendor = user?.role === UserRole.Vendedor;
  const isClient = user?.role === UserRole.Cliente;
  const isReventados = gameMode === GameMode.REVENTADOS;

  useEffect(() => { if (nextDraw) setSelectedDraw(nextDraw); }, [nextDraw]);

  const fetchSettings = async () => {
      try {
          const res = await api.getGlobalSettings();
          if(res.data) { setCustomMultiplier(res.data.multiplier_tiempos || 90); setCustomReventadosMultiplier(res.data.multiplier_reventados || 200); }
      } catch (e) { console.error("Failed to load settings"); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const theme = useMemo(() => {
    switch (selectedDraw) {
        case DrawTime.MEDIODIA: return { name: 'solar', hex: '#ff5f00', shadow: 'shadow-neon-solar', glow: 'bg-cyber-solar', text: 'text-cyber-solar', border: 'border-cyber-solar', label: 'SOLAR CORE', ring: 'ring-cyber-solar/30' }; 
        case DrawTime.TARDE: return { name: 'vapor', hex: '#7c3aed', shadow: 'shadow-neon-vapor', glow: 'bg-cyber-vapor', text: 'text-cyber-vapor', border: 'border-cyber-vapor', label: 'IMPERIAL SYNC', ring: 'ring-cyber-vapor/30' }; 
        default: return { name: 'abyss', hex: '#1e3a8a', shadow: 'shadow-neon-abyss', glow: 'bg-cyber-abyss', text: 'text-blue-400', border: 'border-blue-900', label: 'ABYSS DEPTH', ring: 'ring-blue-900/30' }; 
    }
  }, [selectedDraw]);

  const fetchLists = async () => {
    if (!user || isClient) return;
    setLoadingLists(true);
    if (isAdmin || isVendor) { const { data } = await supabase.from('app_users').select('*').eq('role', 'Cliente').limit(100); if (data) setPlayers(data as AppUser[]); }
    if (isAdmin) { const { data } = await supabase.from('app_users').select('*').eq('role', 'Vendedor').limit(100); if (data) setVendors(data as AppUser[]); }
    setLoadingLists(false);
  };

  useEffect(() => { fetchLists(); }, [user]);

  const handleUpdateMultiplier = async () => {
      if(!user || !isAdmin) return;
      setSavingMultiplier(true);
      await new Promise(r => setTimeout(r, 1200));
      await api.updateGlobalMultiplier({ baseValue: customMultiplier, reventadosValue: customReventadosMultiplier, actor_id: user.id });
      setSavingMultiplier(false); setEditingMultiplier(false); fetchSettings();
  };

  const handleAddToQueue = () => {
      if (isMarketClosed || !betNumber || !betAmount || Number(betAmount) <= 0) return;
      setPendingBets(prev => [{ id: `draft-${Date.now()}`, number: betNumber, amount: Number(betAmount) * 100, draw: selectedDraw, mode: gameMode }, ...prev]);
      
      // LOGIC: Reset number for fast input but persist betAmount for sequential betting
      setBetNumber(''); 
      
      const input = document.getElementById('betNumberInput'); 
      if(input) input.focus();
  };

  const handleExecuteBatch = async () => {
      if (isMarketClosed || pendingBets.length === 0 || !user) return;
      setExecutingBatch(true);
      const totalCost = pendingBets.reduce((acc, curr) => acc + curr.amount, 0);
      if (totalCost > user.balance_bigint) { alert(`SALDO INSUFICIENTE. Requerido: ${formatCurrency(totalCost)}`); setExecutingBatch(false); return; }
      try {
          let successCount = 0;
          for (const bet of pendingBets) {
               const res = await api.placeBet({ numbers: bet.number, amount: bet.amount, draw_id: bet.draw, mode: bet.mode });
               if (!res.error) successCount++;
          }
          if (successCount > 0) {
              fetchUser(true); setTableRefreshTrigger(p => p + 1);
              if (successCount === pendingBets.length) { setBatchSuccess(true); setTimeout(() => { setPendingBets([]); setBatchSuccess(false); }, 2000); }
              else { alert("Límites de riesgo excedidos en algunas apuestas."); setPendingBets([]); }
          }
      } catch (e) { alert('FALLO CRÍTICO'); } finally { setExecutingBatch(false); }
  };

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 space-y-12 md:space-y-24 relative overflow-x-hidden">
      <WinnerOverlay isOpen={!!winnerData} onClose={() => setWinnerData(null)} data={winnerData} />
      <RechargeModal isOpen={rechargeModalOpen} targetUser={selectedUserForRecharge} onClose={() => setRechargeModalOpen(false)} onSuccess={fetchLists} />
      <WithdrawModal isOpen={withdrawModalOpen} targetUser={selectedUserForWithdraw} onClose={() => setWithdrawModalOpen(false)} onSuccess={fetchLists} />
      
      {isAdmin && <AdminResultControl isOpen={adminResultOpen} onClose={() => setAdminResultOpen(false)} initialDraw={null} onPublishSuccess={(d) => setWinnerData({ amount: 15000000, number: d.number, draw: d.draw, type: d.reventado ? 'REVENTADOS' : 'TIEMPOS' })} />}

      {/* --- REFACTORED MULTIPLIER MODAL (CENTRADOS Y MÁS PEQUEÑOS) --- */}
      {editingMultiplier && isAdmin && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 animate-in fade-in duration-300 overflow-y-auto">
              <div className="relative w-full max-w-lg">
                  <div className={`absolute -inset-20 rounded-full blur-[100px] opacity-40 animate-pulse bg-gradient-to-r from-cyber-emerald via-teal-500 to-green-600`}></div>
                  <div className="bg-[#050a14] border-[4px] border-cyber-emerald/50 rounded-[2.5rem] relative z-10 w-full overflow-hidden shadow-2xl">
                    <div className="p-6 md:p-8 border-b border-white/5 bg-black/40 flex items-center gap-4 relative">
                        <div className="w-12 h-12 rounded-xl bg-black border-2 border-cyber-emerald flex items-center justify-center shadow-neon-emerald"><i className="fas fa-atom text-2xl text-cyber-emerald animate-spin-slow"></i></div>
                        <div>
                            <h3 className="text-white font-display font-black uppercase tracking-widest text-lg md:text-xl leading-none">Núcleo <span className="text-cyber-emerald">Global</span></h3>
                            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-[0.3em] font-bold mt-2 leading-none">Calibración de Factores</div>
                        </div>
                    </div>
                    <div className="p-6 md:p-10 space-y-8 relative">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-10">
                             <div className="space-y-4">
                                 <label className="text-[10px] font-black text-cyber-emerald uppercase tracking-[0.3em] text-center block">Factor Tiempos</label>
                                 <div className="relative h-24 md:h-28 bg-[#020202] border-2 border-cyber-emerald/40 rounded-2xl overflow-hidden flex items-center justify-center transition-all group/input hover:border-cyber-emerald">
                                     <input type="number" value={customMultiplier} onChange={e => setCustomMultiplier(Number(e.target.value))} className="bg-transparent text-3xl md:text-4xl font-display font-black text-emerald-400 text-center w-full focus:outline-none drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                                     <div className="absolute right-0 top-0 bottom-0 w-10 flex flex-col border-l border-cyber-emerald/30 bg-black/60">
                                         <button onClick={() => setCustomMultiplier(p => p+1)} className="flex-1 hover:bg-cyber-emerald hover:text-black transition-colors"><i className="fas fa-chevron-up text-xs"></i></button>
                                         <button onClick={() => setCustomMultiplier(p => Math.max(1, p-1))} className="flex-1 hover:bg-cyber-emerald hover:text-black transition-colors border-t border-cyber-emerald/30"><i className="fas fa-chevron-down text-xs"></i></button>
                                     </div>
                                 </div>
                             </div>
                             <div className="space-y-4">
                                 <label className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] text-center block">Factor Reventados</label>
                                 <div className="relative h-24 md:h-28 bg-[#020202] border-2 border-red-600/40 rounded-2xl overflow-hidden flex items-center justify-center transition-all group/input hover:border-red-500">
                                     <input type="number" value={customReventadosMultiplier} onChange={e => setCustomReventadosMultiplier(Number(e.target.value))} className="bg-transparent text-3xl md:text-4xl font-display font-black text-[#ff003c] text-center w-full focus:outline-none drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                                     <div className="absolute right-0 top-0 bottom-0 w-10 flex flex-col border-l border-red-600/30 bg-black/60">
                                         <button onClick={() => setCustomReventadosMultiplier(p => p+1)} className="flex-1 hover:bg-red-500 hover:text-white transition-colors"><i className="fas fa-chevron-up text-xs"></i></button>
                                         <button onClick={() => setCustomReventadosMultiplier(p => Math.max(1, p-1))} className="flex-1 hover:bg-red-500 hover:text-white transition-colors border-t border-red-600/30"><i className="fas fa-chevron-down text-xs"></i></button>
                                     </div>
                                 </div>
                             </div>
                        </div>
                        <div className="flex gap-4 pt-8 border-t border-white/5">
                            <button onClick={() => setEditingMultiplier(false)} className="px-6 py-4 rounded-xl border border-slate-700 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-white/5 transition-all">Cancelar</button>
                            <button onClick={handleUpdateMultiplier} className="flex-1 py-4 bg-white text-black font-black uppercase tracking-[0.2em] rounded-xl hover:scale-[1.02] transition-all shadow-[0_0_40px_rgba(255,255,255,0.4)] flex items-center justify-center gap-3">
                                {savingMultiplier ? <i className="fas fa-circle-notch fa-spin text-xl"></i> : <i className="fas fa-save text-xl"></i>} 
                                <span className="text-xs">{savingMultiplier ? 'SINCRONIZANDO...' : 'CONFIRMAR CAMBIOS'}</span>
                            </button>
                        </div>
                    </div>
                  </div>
              </div>
          </div>
      )}

      <header className="relative z-10 pb-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className={`w-2 h-2 ${theme.glow} rounded-full animate-ping shadow-[0_0_10px_currentColor]`}></div>
                    <span className="font-mono text-[9px] md:text-[10px] text-cyber-blue tracking-[0.4em] uppercase font-bold">Sistema Bio-Digital v5.5.2</span>
                </div>
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-display font-black text-white italic tracking-tighter uppercase drop-shadow-2xl">PANEL DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">MANDO</span></h2>
            </div>
            {isAdmin && <button onClick={() => setAdminResultOpen(true)} className="bg-[#050a14] border-2 border-[#1e3a8a] hover:border-[#3b82f6] text-white px-6 py-3 rounded-xl transition-all shadow-lg flex items-center gap-3"><i className="fas fa-cube text-blue-500 animate-spin-slow"></i><span className="text-[10px] font-mono font-bold uppercase tracking-wider">Centro de Control</span></button>}
        </div>
      </header>

      <div className="space-y-12">
          <LiveResultsPanel />
          <TopNumbersPanel />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <PowerCard label={isClient ? "Tu Saldo" : "Fondo Operativo"} value={formatCurrency(user.balance_bigint)} icon="fa-wallet" theme={theme} isMoney={true} />
        <PowerCard label="Multiplicador Activo" value={gameMode === GameMode.REVENTADOS ? <span className="text-red-500">{customReventadosMultiplier}x</span> : <span className="text-emerald-400">{customMultiplier}x</span>} icon="fa-crosshairs" theme={theme} isWarning={gameMode === GameMode.REVENTADOS} onClick={isAdmin ? () => setEditingMultiplier(true) : undefined} editable={isAdmin} />
        <CountdownTimer role={user.role} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
        <div className="lg:col-span-2 space-y-12 md:space-y-20">
            <div className="relative">
                {isMarketClosed && <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-[3rem] border-2 border-red-900/50"><i className="fas fa-lock text-5xl text-red-600 mb-4 animate-pulse"></i><h3 className="text-xl font-black text-white uppercase tracking-widest">MERCADO CERRADO</h3></div>}
                <div className={`relative rounded-[2rem] md:rounded-[3rem] p-1 overflow-hidden border-2 md:border-4 ${isMarketClosed ? 'border-red-900 opacity-50' : isReventados ? 'border-red-600 shadow-neon-red' : `${theme.border} ${theme.shadow}`} transition-all duration-700 z-10`} style={{ backgroundColor: isMarketClosed || isReventados ? '#0f0202' : theme.hex + '10' }}>
                    {isReventados && <ReventadosEffect />}
                    <div className="relative z-10 p-5 md:p-12">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
                            <h3 className="text-xl md:text-3xl font-display font-black text-white uppercase tracking-widest flex items-center gap-4">
                                <AnimatedIconUltra profile={{ animation: 'spin3d', theme: isReventados ? 'neon' : 'cyber', speed: 3, enabled: !isMarketClosed }}>
                                    <i className={`fas fa-gamepad ${isReventados ? 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]' : theme.text}`}></i>
                                </AnimatedIconUltra>
                                <span>CONSOLA DE <span className={isReventados ? 'text-red-500' : theme.text}>JUEGOS</span></span>
                            </h3>
                            <div className={`p-1.5 rounded-2xl flex w-full lg:w-auto border-2 bg-black/80 ${isReventados ? 'border-red-600 shadow-neon-red' : theme.border}`}>
                                <button onClick={() => setGameMode(GameMode.TIEMPOS)} className={`flex-1 lg:px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${gameMode === GameMode.TIEMPOS ? 'bg-white text-black' : 'text-slate-500'}`}>Tiempos</button>
                                <button onClick={() => setGameMode(GameMode.REVENTADOS)} className={`flex-1 lg:px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${gameMode === GameMode.REVENTADOS ? 'bg-red-600 text-white' : 'text-slate-500'}`}>Reventados</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-10">
                            {Object.values(DrawTime).map((time) => (
                                <button key={time} onClick={() => setSelectedDraw(time)} className={`py-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all ${selectedDraw === time ? `${theme.border} ${theme.text} bg-white/5 scale-[1.02] shadow-xl` : 'border-white/5 bg-black/40 text-slate-600 hover:text-white'}`}>
                                    <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 4, size: 0.9, theme: 'minimal' }}>
                                        <i className={`fas ${time.includes('Mediodía') ? 'fa-sun' : time.includes('Tarde') ? 'fa-cloud-sun' : 'fa-moon'} text-sm`}></i>
                                    </AnimatedIconUltra>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{time.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 items-stretch">
                            <div className="md:col-span-2 group/f">
                                <label className={`text-[8px] font-black uppercase tracking-[0.4em] ${isReventados ? 'text-red-500' : theme.text} ml-1 mb-2 block`}>Frecuencia</label>
                                <div className={`relative bg-black border-2 md:border-4 ${isReventados ? 'border-red-600' : theme.border} rounded-2xl md:rounded-[2rem] overflow-hidden`}><input id="betNumberInput" type="number" inputMode="numeric" maxLength={2} value={betNumber} onChange={e => setBetNumber(e.target.value.slice(0,2))} className="w-full bg-transparent py-6 md:py-10 text-center text-6xl md:text-7xl font-mono font-black text-white focus:outline-none placeholder-slate-900" placeholder="00" /></div>
                            </div>
                            <div className="md:col-span-2 group/f">
                                <label className={`text-[8px] font-black uppercase tracking-[0.4em] ${isReventados ? 'text-red-500' : theme.text} ml-1 mb-2 block`}>Inversión</label>
                                <div className={`relative bg-black border-2 md:border-4 ${isReventados ? 'border-red-600' : theme.border} rounded-2xl md:rounded-[2rem] overflow-hidden flex items-center px-4 md:px-8`}><span className="text-2xl font-mono font-bold text-slate-800">₡</span><input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} className="w-full bg-transparent py-6 md:py-10 text-center text-4xl md:text-6xl font-mono font-black text-white focus:outline-none placeholder-slate-900" placeholder="0" /></div>
                            </div>
                            <button onClick={handleAddToQueue} disabled={!betNumber || !betAmount || isMarketClosed} className={`w-full py-6 md:py-0 rounded-2xl border-2 transition-all hover:scale-[1.03] active:scale-95 flex flex-col items-center justify-center gap-2 ${isReventados ? 'border-red-600 bg-red-950/20 text-red-500 shadow-neon-red' : 'border-cyber-success bg-emerald-950/20 text-cyber-success shadow-neon-green'}`}>
                                <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 3, theme: isReventados ? 'neon' : 'cyber' }}>
                                    <i className={`fas ${isReventados ? 'fa-radiation' : 'fa-bolt'} text-2xl md:text-3xl`}></i>
                                </AnimatedIconUltra>
                                <span className="text-[8px] font-black uppercase tracking-widest">ACOPLAR</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {(pendingBets.length > 0 || batchSuccess) && (
                <div className="bg-black/90 border-2 border-cyber-success rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
                    {batchSuccess ? (
                        <div className="text-center py-10 animate-in zoom-in"><div className="w-20 h-20 bg-cyber-success rounded-full flex items-center justify-center shadow-neon-green mx-auto mb-6"><i className="fas fa-check text-4xl text-black"></i></div><h3 className="text-2xl font-display font-black text-white uppercase tracking-widest">Transmisión Exitosa</h3></div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center mb-8"><div><h3 className="text-lg font-display font-black text-white uppercase tracking-widest">Búfer de Transmisión</h3><p className="text-[9px] font-mono text-slate-500 uppercase mt-1">Lote listo para ignición</p></div><button onClick={() => setPendingBets([])} className="text-[9px] text-red-500 hover:text-white uppercase font-black"><i className="fas fa-trash-alt mr-2"></i> Purgar</button></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 overflow-y-auto max-h-[300px] pr-2">
                                {pendingBets.map(bet => (
                                    <div key={bet.id} className="bg-[#0a0c12] border border-white/5 rounded-xl p-4 flex justify-between items-center group transition-all hover:border-cyber-success/40">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-2xl font-mono font-black text-white">{bet.number}</div>
                                                <div className={`px-2 py-0.5 rounded text-[7px] font-black border uppercase tracking-tighter ${bet.mode === GameMode.REVENTADOS ? 'border-red-600 text-red-500 bg-red-950/40 animate-pulse' : 'border-cyber-neon/50 text-cyber-neon bg-cyan-950/20'}`}>
                                                    {bet.mode === GameMode.REVENTADOS ? 'REVENTADO' : 'NORMAL'}
                                                </div>
                                            </div>
                                            <div className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">{bet.draw.split(' ')[0]}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-cyber-success font-black font-mono text-base">{formatCurrency(bet.amount)}</div>
                                            <button onClick={() => setPendingBets(p => p.filter(b => b.id !== bet.id))} className="text-[8px] text-red-500 mt-2 hover:text-white transition-colors">Eliminar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-t border-white/10 pt-8">
                                <div className="text-center md:text-left"><div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Volumen Total</div><div className="text-4xl font-mono font-black text-white">{formatCurrency(pendingBets.reduce((a,c) => a + c.amount, 0))}</div></div>
                                <button onClick={handleExecuteBatch} disabled={executingBatch} className="w-full md:w-auto px-12 py-5 bg-cyber-success text-black font-display font-black text-lg uppercase tracking-widest rounded-xl hover:scale-[1.02] shadow-neon-green transition-all">{executingBatch ? <i className="fas fa-atom fa-spin text-2xl"></i> : 'Transmitir Lote'}</button>
                            </div>
                        </>
                    )}
                </div>
            )}
            
            <GlobalBetsTable refreshTrigger={tableRefreshTrigger} />
            {isClient && <PersonalBetsPanel theme={theme} refreshTrigger={tableRefreshTrigger} />}
            {(isAdmin || isVendor) && (
                <div className="space-y-12">
                     {isAdmin && <RiskLimitManager />}
                     <div className="max-w-3xl mx-auto w-full"><UserCreationForm onCreated={u => u.role === UserRole.Cliente ? setPlayers(p => [u, ...p]) : setVendors(v => [u, ...v])} /></div>
                     <UserManagementPanel players={players} vendors={vendors} onRecharge={u => { setSelectedUserForRecharge(u); setRechargeModalOpen(true); }} onWithdraw={u => { setSelectedUserForWithdraw(u); setWithdrawModalOpen(true); }} onRefresh={fetchLists} />
                     {isAdmin && <div className="max-w-xl mx-auto w-full"><DataPurgeCard theme={theme} /></div>}
                </div>
            )}
        </div>
        <div className="lg:col-span-1"><SystemStatusHUD /></div>
      </div>
    </div>
  );
}
