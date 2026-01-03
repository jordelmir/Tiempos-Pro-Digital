
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
        // Solo mostrar cargador inicial si no hay datos
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
        // ARQUITECTURA PHRONT: Auto-actualización cada 5 segundos para fluidez operativa
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
        <div className="relative group animate-in fade-in duration-500 w-full pt-12">
            <TicketViewModal isOpen={!!selectedBet} onClose={() => setSelectedBet(null)} bet={selectedBet} />
            <WinnerOverlay isOpen={!!currentWinner} onClose={() => setCurrentWinner(null)} data={currentWinner} />

            <div className="absolute -inset-1 bg-cyber-blue rounded-[2rem] opacity-20 blur-xl animate-pulse pointer-events-none"></div>

            <div className="relative bg-[#050a14]/80 backdrop-blur-3xl border-2 border-cyber-blue/30 rounded-[3rem] overflow-hidden shadow-2xl z-10">
                
                <div className="border-b border-white/10 bg-[#02040a]/90 backdrop-blur-xl p-8">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-8">
                        <div>
                            <h3 className="text-2xl font-display font-black text-white uppercase tracking-widest flex items-center gap-4 mb-2">
                                <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 4, size: 0.9, theme: 'cyber' }}>
                                    <i className="fas fa-satellite-dish text-cyber-blue"></i>
                                </AnimatedIconUltra>
                                Registro de <span className="text-cyber-neon text-glow-cyan">Transmisiones</span>
                            </h3>
                            <div className="flex items-center gap-4 text-[11px] font-mono uppercase tracking-widest text-slate-500">
                                <span className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-cyber-success animate-ping shadow-[0_0_5px_lime]"></div>
                                    <span className="text-cyber-success font-black tracking-[0.2em]">NODO_LIVE: ACTIVO</span>
                                </span>
                                <span className="text-white/10">|</span>
                                <span className="flex items-center gap-2">
                                    <i className="fas fa-microchip opacity-40"></i>
                                    <span className="text-slate-400">MEM_SYNC: {lastSync.toLocaleTimeString()}</span>
                                </span>
                                <span className="text-white/10 hidden md:block">|</span>
                                <span className="text-slate-300 hidden md:block">{processedBets.length} PAQUETES</span>
                            </div>
                        </div>

                        <div className="w-full xl:w-96 relative group/search">
                            <div className="absolute -inset-1 bg-cyber-neon/20 rounded-xl blur opacity-0 group-focus-within/search:opacity-100 transition-opacity"></div>
                            <div className="relative flex items-center bg-black border-2 border-white/10 rounded-2xl overflow-hidden shadow-inner group-focus-within/search:border-cyber-neon">
                                <div className="pl-4 text-cyber-neon"><i className="fas fa-search text-sm"></i></div>
                                <input 
                                    type="text" value={entitySearch} onChange={e => setEntitySearch(e.target.value)}
                                    placeholder="Buscar Ticket o Usuario..."
                                    className="w-full bg-transparent border-none text-cyber-neon font-mono text-xs px-4 py-4 focus:outline-none placeholder-slate-800"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 border-t border-white/5 pt-8">
                        <div className="flex bg-black border-2 border-white/5 rounded-2xl p-1.5 shadow-inner">
                            <button onClick={() => setActiveTab('TODAS')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'TODAS' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>Todas</button>
                            <button onClick={() => setActiveTab('ACIERTOS')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'ACIERTOS' ? 'bg-cyber-success text-black shadow-neon-green' : 'text-slate-500 hover:text-white'}`}>Aciertos ({bets.filter(b=>b.status==='WON').length})</button>
                            <button onClick={() => setActiveTab('EN_CURSO')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'EN_CURSO' ? 'bg-cyber-blue text-white shadow-neon-blue' : 'text-slate-500 hover:text-white'}`}>En Curso</button>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse relative z-10 min-w-[1000px]">
                        <thead className="bg-[#02040a] shadow-2xl border-b border-white/10">
                            <tr className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em]">
                                <SortableHeader label="Timestamp" field="created_at" current={sortConfig} onSort={handleSort} className="p-6 pl-10" />
                                <SortableHeader label="Usuario" field="user_name" current={sortConfig} onSort={handleSort} className="p-6" />
                                <SortableHeader label="Vector" field="numbers" current={sortConfig} onSort={handleSort} className="p-6 text-center" />
                                <th className="p-6 text-center">Sorteo</th>
                                <th className="p-6 text-center">Protocolo</th>
                                <SortableHeader label="Monto" field="amount_bigint" current={sortConfig} onSort={handleSort} className="p-6 text-right" />
                                <th className="p-6 text-right text-cyber-success">Premios_Sinc</th>
                                <SortableHeader label="Estado" field="status" current={sortConfig} onSort={handleSort} className="p-6 text-center" />
                                <th className="p-6 text-right pr-10">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-xs bg-[#050a14]/40">
                            {loading && paginatedBets.length === 0 ? (
                                <tr><td colSpan={9} className="p-32 text-center text-cyber-blue animate-pulse tracking-[1em] font-black uppercase">Decrypting_Global_Data...</td></tr>
                            ) : paginatedBets.length === 0 ? (
                                <tr><td colSpan={9} className="p-32 text-center text-slate-700 tracking-widest uppercase font-black">Buffer_Empty_Wait_For_Stream</td></tr>
                            ) : (
                                paginatedBets.map(bet => {
                                    const isWin = bet.status === 'WON';
                                    const isReventadoMode = bet.mode.includes('200x');
                                    const baseInv = isReventadoMode ? bet.amount_bigint / 2 : bet.amount_bigint;
                                    const normalWin = isWin ? baseInv * 90 : 0;
                                    const revWin = (isWin && isReventadoMode) ? baseInv * 200 : 0;
                                    
                                    return (
                                        <tr key={bet.id} className="border-b border-white/5 hover:bg-white/5 transition-all group">
                                            <td className="p-6 pl-10">
                                                <div className="font-black text-slate-100">{formatDate(bet.created_at).split(',')[1]}</div>
                                                <div className="text-[9px] text-slate-600 font-mono tracking-tighter uppercase font-bold">{bet.ticket_code}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="text-cyber-neon font-black text-sm truncate max-w-[180px] drop-shadow-sm">{bet.user_name}</div>
                                                <div className="text-[8px] uppercase tracking-[0.2em] text-slate-600 font-bold mt-1">{bet.origin || 'DIRECT_LINK'}</div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`text-3xl font-mono font-black ${isWin ? 'text-cyber-success text-glow-green animate-pulse' : 'text-slate-100'}`}>
                                                    {bet.numbers}
                                                </span>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-xl shadow-sm">{getFlag(bet.region)}</span>
                                                    <div className="text-[9px] text-slate-400 uppercase tracking-widest bg-black/60 px-3 py-1 rounded-lg border border-white/5 font-black">
                                                        {bet.draw_id?.split(' ')[0]}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className={`px-4 py-1.5 rounded-xl text-[8px] font-black border-2 uppercase tracking-widest inline-block ${isReventadoMode ? 'border-red-600 text-red-500 bg-red-950/40' : 'border-cyber-neon/30 text-cyber-neon bg-cyan-950/20'}`}>
                                                    {isReventadoMode ? 'REVENTADO' : 'NORMAL'}
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="font-black text-cyber-success text-base drop-shadow-sm">{formatCurrency(bet.amount_bigint)}</div>
                                            </td>
                                            <td className="p-6 text-right">
                                                {!isWin ? (
                                                    <span className="text-slate-800 font-black">---</span>
                                                ) : (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Base_90x</span>
                                                            <span className="text-cyber-success font-black text-base">{formatCurrency(normalWin)}</span>
                                                        </div>
                                                        {isReventadoMode && (
                                                            <div className="flex items-center gap-2 border-t border-white/10 pt-1">
                                                                <span className="text-[8px] text-red-500 font-black uppercase tracking-widest">Fire_200x</span>
                                                                <span className="text-red-500 font-black text-base">{formatCurrency(revWin)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`px-4 py-2 rounded-xl text-[9px] font-black border-2 uppercase tracking-[0.2em] transition-all duration-300 ${
                                                    isWin ? 'bg-green-950/40 text-green-400 border-green-500 shadow-neon-green' : 
                                                    bet.status === 'PENDING' ? 'bg-blue-950/40 text-blue-400 border-blue-500/50 animate-pulse' : 
                                                    'bg-red-950/10 text-slate-700 border-slate-900'
                                                }`}>
                                                    {isWin ? 'GANADOR' : bet.status === 'PENDING' ? 'EN_FLUJO' : 'FAIL_CLOSED'}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right pr-10">
                                                <button onClick={() => setSelectedBet(bet)} className="w-12 h-12 rounded-2xl bg-black border-2 border-white/10 text-cyber-neon hover:bg-white hover:text-black hover:border-white transition-all shadow-inner group/eye">
                                                    <i className="fas fa-eye group-hover/eye:scale-125 transition-transform"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-8 bg-[#02040a] border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.4em] font-black">
                        PÁGINA <span className="text-cyber-neon font-black">{currentPage}</span> DE <span className="text-cyber-neon font-black">{totalPages || 1}</span>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-8 py-3 bg-black border-2 border-white/5 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:text-cyber-neon hover:border-cyber-neon disabled:opacity-20 transition-all">Anterior</button>
                        <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-8 py-3 bg-black border-2 border-white/5 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:text-cyber-neon hover:border-cyber-neon disabled:opacity-20 transition-all">Siguiente</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const SortableHeader = ({ label, field, current, onSort, className = "" }: { label: string, field: SortField, current: {key: string, order: string}, onSort: (f: SortField) => void, className?: string }) => {
    const isActive = current.key === field;
    return (
        <th className={`${className} cursor-pointer hover:bg-white/5 transition-colors group/header`} onClick={() => onSort(field)}>
            <div className="flex items-center gap-3">
                {label}
                <div className={`flex flex-col text-[8px] transition-all duration-300 ${isActive ? 'opacity-100 scale-125' : 'opacity-20 group-hover/header:opacity-100'}`}>
                    <i className={`fas fa-chevron-up ${isActive && current.order === 'asc' ? 'text-cyber-neon' : ''}`}></i>
                    <i className={`fas fa-chevron-down ${isActive && current.order === 'desc' ? 'text-cyber-neon' : ''}`}></i>
                </div>
            </div>
        </th>
    );
};
