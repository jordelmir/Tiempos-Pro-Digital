
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { Bet, UserRole, DrawTime, GameMode, LotteryRegion } from '../types';
import { formatCurrency, formatDate } from '../constants';
import TicketViewModal from './TicketViewModal';
import WinnerOverlay from './WinnerOverlay';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

interface GlobalBetsTableProps {
    onRefresh?: () => void;
    refreshTrigger?: number;
}

type SortField = 'created_at' | 'numbers' | 'amount_bigint' | 'user_name' | 'status';
type SortOrder = 'asc' | 'desc';

export default function GlobalBetsTable({ onRefresh, refreshTrigger }: GlobalBetsTableProps) {
    const user = useAuthStore(s => s.user);
    const fetchUser = useAuthStore(s => s.fetchUser);
    const [bets, setBets] = useState<(Bet & { user_name?: string, user_role?: string, origin?: string, region?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState<Date>(new Date());
    const [selectedBet, setSelectedBet] = useState<Bet | null>(null);

    const [winnerQueue, setWinnerQueue] = useState<any[]>([]);
    const [currentWinner, setCurrentWinner] = useState<any>(null);
    const prevBetsRef = useRef<Map<string, string>>(new Map()); 

    const [timeFilter, setTimeFilter] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'WON' | 'PENDING' | 'LOST'>('ALL');
    const [activeTab, setActiveTab] = useState<'TODAS' | 'ACIERTOS' | 'EN_CURSO'>('TODAS');
    const [entitySearch, setEntitySearch] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    
    const [sortConfig, setSortConfig] = useState<{ key: SortField, order: SortOrder }>({ key: 'created_at', order: 'desc' });

    useEffect(() => {
        if (winnerQueue.length > 0 && !currentWinner) {
            const next = winnerQueue[0];
            setCurrentWinner(next);
            setWinnerQueue(prev => prev.slice(1));
        }
    }, [winnerQueue, currentWinner]);

    const fetchBets = async () => {
        if (!user) return;
        if (bets.length === 0) setLoading(true);
        
        try {
            const res = await api.getGlobalBets({
                role: user.role,
                userId: user.id,
                timeFilter: timeFilter === 'ALL' ? undefined : timeFilter,
                statusFilter: statusFilter === 'ALL' ? undefined : statusFilter
            });
            if (res.data) {
                const incomingBets = res.data.bets as any[];
                const newWinsDetected: any[] = [];
                
                incomingBets.forEach(bet => {
                    const oldStatus = prevBetsRef.current.get(bet.id);
                    if (bet.status === 'WON' && oldStatus === 'PENDING' && bet.user_id === user.id) {
                        const isReventado = bet.mode.includes('200x');
                        const baseAmount = isReventado ? bet.amount_bigint / 2 : bet.amount_bigint;
                        
                        if (isReventado) {
                            newWinsDetected.push({ amount: (baseAmount * 90) / 100, number: bet.numbers, draw: bet.draw_id || 'Sorteo', type: 'TIEMPOS' });
                            newWinsDetected.push({ amount: (baseAmount * 200) / 100, number: bet.numbers, draw: bet.draw_id || 'Sorteo', type: 'REVENTADOS' });
                        } else {
                            newWinsDetected.push({ amount: (baseAmount * 90) / 100, number: bet.numbers, draw: bet.draw_id || 'Sorteo', type: 'TIEMPOS' });
                        }
                    }
                    prevBetsRef.current.set(bet.id, bet.status);
                });

                if (newWinsDetected.length > 0) {
                    setWinnerQueue(prev => [...prev, ...newWinsDetected]);
                    fetchUser(true); 
                }
                setBets(incomingBets);
                setLastSync(new Date());
            }
        } catch (e) { console.error("Error fetching unified bets", e); } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchBets();
        const interval = setInterval(fetchBets, 5000);
        return () => clearInterval(interval);
    }, [user, timeFilter, statusFilter, refreshTrigger]); 

    const processedBets = useMemo(() => {
        let result = [...bets];
        if (activeTab === 'ACIERTOS') result = result.filter(b => b.status === 'WON');
        if (activeTab === 'EN_CURSO') result = result.filter(b => b.status === 'PENDING');
        if (entitySearch) {
            const query = entitySearch.toLowerCase();
            result = result.filter(b => b.user_name?.toLowerCase().includes(query) || b.ticket_code?.toLowerCase().includes(query));
        }

        result.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];

            if (sortConfig.key === 'created_at') {
                const timeA = new Date(valA as string).getTime();
                const timeB = new Date(valB as string).getTime();
                return sortConfig.order === 'asc' ? timeA - timeB : timeB - timeA;
            }

            const safeA = valA || '';
            const safeB = valB || '';
            if (safeA < safeB) return sortConfig.order === 'asc' ? -1 : 1;
            if (safeA > safeB) return sortConfig.order === 'asc' ? 1 : -1;
            return 0;
        });
        return result;
    }, [bets, entitySearch, sortConfig, activeTab]);

    const totalPages = Math.ceil(processedBets.length / pageSize);
    const paginatedBets = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return processedBets.slice(start, start + pageSize);
    }, [processedBets, currentPage, pageSize]);

    const handleSort = (key: SortField) => {
        setSortConfig(prev => ({ key, order: prev.key === key && prev.order === 'desc' ? 'asc' : 'desc' }));
    };

    const getFlag = (region?: string) => {
        const flags: any = { 'CR': '🇨🇷', 'NI': '🇳🇮', 'DO': '🇩🇴', 'PA': '🇵🇦' };
        return flags[region || 'CR'] || '🇨🇷';
    };

    if (!user) return null;

    return (
        <div className="relative group animate-in fade-in duration-1000 w-full pt-8 sm:pt-12 overflow-hidden">
            <TicketViewModal isOpen={!!selectedBet} onClose={() => setSelectedBet(null)} bet={selectedBet} />
            <WinnerOverlay isOpen={!!currentWinner} onClose={() => setCurrentWinner(null)} data={currentWinner} />

            {/* AMBIENT BACKGROUND GLOW */}
            <div className="absolute -inset-4 bg-cyber-blue/20 rounded-[4rem] blur-3xl animate-pulse transition-all duration-1000 opacity-20"></div>
            <div className="absolute -inset-4 bg-gradient-to-r from-transparent via-cyber-blue/10 to-transparent rounded-[3rem] blur-[100px] opacity-30 animate-pulse transition-all duration-1000"></div>

            {/* MAIN GLASS CONTAINER */}
            <div className="relative glass-morphism bg-black/30 backdrop-blur-[40px] border-2 border-white/10 rounded-[2.5rem] md:rounded-[4rem] overflow-hidden shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] z-10 transition-all duration-700 hover:border-cyber-blue/20">
                
                <div className="absolute inset-0 carbon-texture opacity-[0.03] pointer-events-none"></div>

                {/* Header Glass Subpanel */}
                <div className="border-b border-white/10 bg-white/5 backdrop-blur-3xl p-6 md:p-12 relative overflow-hidden">
                    
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyber-blue to-transparent opacity-50 shadow-[0_0_20px_#00D1FF] animate-pulse"></div>

                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-10 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-cyber-blue/10 blur-xl rounded-full animate-pulse"></div>
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-black/40 border-2 border-cyber-blue/40 flex items-center justify-center shadow-neon-blue relative z-10 backdrop-blur-md shadow-inner">
                                    <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 4, size: 1.0, theme: 'cyber' }}>
                                        <i className="fas fa-satellite-dish text-cyber-blue text-2xl md:text-3xl"></i>
                                    </AnimatedIconUltra>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tighter leading-none mb-3">
                                    REGISTRO DE <span className="text-cyber-neon text-glow-cyan transition-colors duration-500">TRANSMISIONES</span>
                                </h3>
                                <div className="flex flex-wrap items-center gap-4 text-[9px] font-mono uppercase tracking-[0.4em] text-slate-500 font-black">
                                    <span className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-cyber-success animate-ping shadow-[0_0_10px_lime]"></div>
                                        <span className="text-cyber-success">NODO_LIVE: ACTIVO</span>
                                    </span>
                                    <span className="text-white/10 hidden sm:block">|</span>
                                    <span className="hidden sm:block">MEM_SYNC: {lastSync.toLocaleTimeString()}</span>
                                    <span className="text-white/10 hidden sm:block">|</span>
                                    <span className="hidden sm:block">{processedBets.length} PAQUETES DE DATOS</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full xl:w-[450px] relative group/search">
                            <div className="absolute -inset-1 bg-cyber-blue/10 rounded-2xl blur opacity-0 group-focus-within/search:opacity-100 transition-opacity"></div>
                            <div className="relative flex items-center bg-black/40 border-2 border-white/10 rounded-2xl md:rounded-3xl overflow-hidden shadow-inner group-focus-within/search:border-cyber-blue group-focus-within/search:shadow-neon-blue transition-all duration-500">
                                <div className="pl-6 text-cyber-blue opacity-50"><i className="fas fa-search text-sm"></i></div>
                                <input 
                                    type="text" value={entitySearch} onChange={e => setEntitySearch(e.target.value)}
                                    placeholder="Rastrear Ticket o Entidad de Usuario..."
                                    className="w-full bg-transparent border-none text-white font-mono text-xs md:text-sm px-5 py-4 md:py-5 focus:outline-none placeholder-slate-700"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-6 border-t border-white/5 pt-8 relative z-10">
                        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-inner backdrop-blur-md overflow-x-auto no-scrollbar">
                            <button onClick={() => setActiveTab('TODAS')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${activeTab === 'TODAS' ? 'bg-white text-black shadow-2xl scale-105' : 'text-slate-500 hover:text-white'}`}>Todas</button>
                            <button onClick={() => setActiveTab('ACIERTOS')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${activeTab === 'ACIERTOS' ? 'bg-cyber-success text-black shadow-neon-green scale-105' : 'text-slate-500 hover:text-white'}`}>Aciertos ({bets.filter(b=>b.status==='WON').length})</button>
                            <button onClick={() => setActiveTab('EN_CURSO')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${activeTab === 'EN_CURSO' ? 'bg-cyber-blue text-white shadow-neon-blue scale-105' : 'text-slate-500 hover:text-white'}`}>En Curso</button>
                        </div>
                        
                        <div className="flex items-center gap-4 text-[9px] font-mono text-slate-500 font-black uppercase tracking-widest bg-black/20 px-6 py-3 rounded-full border border-white/5 backdrop-blur-md">
                            <span className="opacity-50">Sincronización Regional:</span>
                            <div className="flex gap-2">
                                {Object.values(LotteryRegion).map(r => (
                                    <span key={r} className="opacity-100 grayscale hover:grayscale-0 transition-all cursor-help" title={`Red ${r} Conectada`}>{getFlag(r)}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div className="relative overflow-x-auto custom-scrollbar no-scrollbar bg-black/10">
                    <table className="w-full text-left border-collapse relative z-10 min-w-[1000px] md:min-w-full">
                        <thead className="bg-[#0a0a0a]/80 backdrop-blur-2xl sticky top-0 z-20 shadow-xl border-b border-white/10">
                            <tr className="text-[10px] font-mono text-cyber-blue uppercase tracking-[0.3em]">
                                <SortableHeader label="Identificación" field="created_at" current={sortConfig} onSort={handleSort} className="p-6 pl-10 font-black" />
                                <SortableHeader label="Entidad" field="user_name" current={sortConfig} onSort={handleSort} className="p-6 font-black" />
                                <SortableHeader label="Vector_ID" field="numbers" current={sortConfig} onSort={handleSort} className="p-6 text-center font-black" />
                                <th className="p-6 text-center font-black">Sinc_Ciclo</th>
                                <th className="p-6 text-center font-black">Modo</th>
                                <SortableHeader label="Inyección" field="amount_bigint" current={sortConfig} onSort={handleSort} className="p-6 text-right font-black" />
                                <th className="p-6 text-right text-cyber-success font-black">Rendimiento</th>
                                <SortableHeader label="Estado" field="status" current={sortConfig} onSort={handleSort} className="p-6 text-center font-black" />
                                <th className="p-6 text-right pr-10 font-black">Control</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-xs">
                            {loading && paginatedBets.length === 0 ? (
                                <tr><td colSpan={9} className="p-48 text-center">
                                    <div className="flex flex-col items-center justify-center gap-8 text-cyber-blue animate-pulse">
                                        <div className="w-16 h-16 border-4 border-t-transparent border-cyber-blue rounded-full animate-spin shadow-neon-blue"></div>
                                        <span className="tracking-[1em] font-black uppercase">Descifrando Flujo de Datos...</span>
                                    </div>
                                </td></tr>
                            ) : paginatedBets.length === 0 ? (
                                <tr><td colSpan={9} className="p-48 text-center">
                                    <div className="flex flex-col items-center justify-center gap-6 text-slate-700 opacity-40">
                                        <i className="fas fa-inbox text-7xl mb-4"></i>
                                        <span className="uppercase tracking-[0.6em] font-black">Búfer Vacío: Esperando Transmisiones</span>
                                    </div>
                                </td></tr>
                            ) : (
                                paginatedBets.map(bet => {
                                    const isWin = bet.status === 'WON';
                                    const isReventadoMode = bet.mode.includes('200x');
                                    const baseInv = isReventadoMode ? bet.amount_bigint / 2 : bet.amount_bigint;
                                    const normalWin = isWin ? baseInv * 90 : 0;
                                    const revWin = (isWin && isReventadoMode) ? baseInv * 200 : 0;
                                    
                                    return (
                                        <tr key={bet.id} className="relative border-b border-white/5 hover:bg-white/5 transition-all duration-300 group/row">
                                            <td className="p-6 pl-10">
                                                <div className="font-black text-white text-sm group-hover/row:text-glow-white transition-all uppercase">{formatDate(bet.created_at).split(',')[1]}</div>
                                                <div className="text-[9px] text-slate-500 font-mono tracking-widest uppercase mt-1 font-bold truncate max-w-[120px]">REF_{bet.ticket_code}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="text-cyber-neon font-black text-sm tracking-tight">{bet.user_name}</div>
                                                <div className="text-[8px] uppercase tracking-widest text-slate-600 font-black mt-1">{bet.origin || 'DIRECT_CHANNEL'}</div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`text-4xl font-display font-black tracking-tighter ${isWin ? 'text-cyber-success text-glow-green animate-pulse' : 'text-white'}`}>
                                                    {bet.numbers}
                                                </span>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex flex-col items-center gap-1.5 bg-black/40 px-4 py-2 rounded-2xl border border-white/5 backdrop-blur-md">
                                                    <span className="text-lg">{getFlag(bet.region)}</span>
                                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black">{bet.draw_id?.split(' ')[0]}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className={`px-4 py-2 rounded-xl text-[9px] font-black border-2 uppercase tracking-widest transition-all ${isReventadoMode ? 'border-red-600/50 text-red-500 bg-red-950/20 shadow-neon-red' : 'border-cyber-blue/30 text-cyber-blue bg-cyan-950/10'}`}>
                                                    {isReventadoMode ? 'FIRE_200X' : 'CORE_90X'}
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="font-display font-black text-white text-lg drop-shadow-sm">{formatCurrency(bet.amount_bigint)}</div>
                                            </td>
                                            <td className="p-6 text-right">
                                                {!isWin ? (
                                                    <span className="text-slate-800 font-black tracking-tighter opacity-20">PENDIENTE_CALC</span>
                                                ) : (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[8px] text-slate-500 font-black uppercase">BASE</span>
                                                            <span className="text-cyber-success font-display font-black text-lg">{formatCurrency(normalWin)}</span>
                                                        </div>
                                                        {isReventadoMode && (
                                                            <div className="flex items-center gap-3 pt-1 border-t border-white/10">
                                                                <span className="text-[8px] text-red-500 font-black uppercase">FIRE</span>
                                                                <span className="text-red-500 font-display font-black text-lg">{formatCurrency(revWin)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[9px] font-black uppercase border-2 transition-all ${
                                                    isWin ? 'bg-cyber-success/10 text-cyber-success border-cyber-success/40 shadow-neon-green' : 
                                                    bet.status === 'PENDING' ? 'bg-cyber-blue/10 text-cyber-blue border-cyber-blue/40 animate-pulse' : 
                                                    'bg-red-950/10 text-slate-700 border-slate-900 grayscale opacity-40'
                                                }`}>
                                                    <span className={`w-2 h-2 rounded-full ${isWin ? 'bg-cyber-success shadow-neon-green' : bet.status === 'PENDING' ? 'bg-cyber-blue animate-ping' : 'bg-slate-700'}`}></span>
                                                    {isWin ? 'GANADOR_SINC' : bet.status === 'PENDING' ? 'EN_TRANSITO' : 'FAIL_CLOSED'}
                                                </div>
                                            </td>
                                            <td className="p-6 text-right pr-10">
                                                <button 
                                                    onClick={() => setSelectedBet(bet)} 
                                                    className="w-12 h-12 rounded-2xl bg-black border-2 border-white/10 text-cyber-neon hover:bg-white hover:text-black hover:border-white hover:scale-110 transition-all duration-300 shadow-inner group/btn"
                                                >
                                                    <i className="fas fa-ticket-alt group-hover/btn:rotate-12 transition-transform text-lg"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Glass Subpanel */}
                <div className="bg-black/80 backdrop-blur-3xl p-6 md:p-10 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8 relative z-20">
                    <div className="flex items-center gap-8">
                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.4em] font-black">
                            PÁGINA <span className="text-white font-black">{currentPage}</span> / <span className="text-white font-black">{totalPages || 1}</span>
                        </div>
                        <div className="h-4 w-px bg-white/10 hidden md:block"></div>
                        <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest font-black hidden md:block">
                            INTEGRIDAD_DB: <span className="text-cyber-success">CONSISTENTE</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-4 w-full md:w-auto">
                        <button 
                            onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); if(navigator.vibrate) navigator.vibrate(20); }} 
                            disabled={currentPage === 1} 
                            className="flex-1 sm:flex-none px-10 py-4 bg-black/40 border-2 border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:border-white/20 disabled:opacity-20 transition-all backdrop-blur-md"
                        >
                            Anterior
                        </button>
                        <button 
                            onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); if(navigator.vibrate) navigator.vibrate(20); }} 
                            disabled={currentPage === totalPages || totalPages === 0} 
                            className="flex-1 sm:flex-none px-10 py-4 bg-black/40 border-2 border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:border-white/20 disabled:opacity-20 transition-all backdrop-blur-md"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Edge Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03] z-50 rounded-[4rem]">
                <div className="w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px]"></div>
            </div>
        </div>
    );
}

const SortableHeader = ({ label, field, current, onSort, className = "" }: { label: string, field: SortField, current: {key: string, order: string}, onSort: (f: SortField) => void, className?: string }) => {
    const isActive = current.key === field;
    return (
        <th className={`${className} cursor-pointer hover:bg-white/5 transition-colors group/header select-none`} onClick={() => onSort(field)}>
            <div className="flex items-center gap-3">
                <span className="whitespace-nowrap">{label}</span>
                <div className={`flex flex-col text-[8px] transition-all duration-300 ${isActive ? 'opacity-100 scale-125' : 'opacity-20 group-hover/header:opacity-100'}`}>
                    <i className={`fas fa-chevron-up ${isActive && current.order === 'asc' ? 'text-cyber-neon' : ''}`}></i>
                    <i className={`fas fa-chevron-down ${isActive && current.order === 'desc' ? 'text-cyber-neon' : ''}`}></i>
                </div>
            </div>
        </th>
    );
};
