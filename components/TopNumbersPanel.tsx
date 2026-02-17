
import React, { useMemo, useState, useEffect } from 'react';
import { useLiveResults } from '../hooks/useLiveResults';
import { api } from '../services/edgeApi';
import { useAuthStore } from '../store/useAuthStore';

export default function TopNumbersPanel() {
    const { history } = useLiveResults();
    const user = useAuthStore(s => s.user);
    const [globalBets, setGlobalBets] = useState<any[]>([]);

    useEffect(() => {
        if(!user) return;
        const fetchBets = async () => {
            const res = await api.getGlobalBets({ role: user.role, userId: user.id, timeFilter: 'ALL', statusFilter: 'ALL' });
            if (res.data) setGlobalBets(res.data.bets);
        };
        fetchBets();
        const i = setInterval(fetchBets, 10000);
        return () => clearInterval(i);
    }, [user]);

    const topStats = useMemo(() => {
        const counts: Record<string, number> = {};
        
        history.forEach(h => {
            if (h.winningNumber && h.winningNumber !== '--') {
                counts[h.winningNumber] = (counts[h.winningNumber] || 0) + 15; 
            }
        });

        globalBets.forEach(b => {
            if (b.numbers) {
                const weight = b.amount_bigint > 500000 ? 5 : b.amount_bigint > 100000 ? 3 : 1;
                counts[b.numbers] = (counts[b.numbers] || 0) + weight;
            }
        });

        const sorted = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([number, frequency], index) => ({
                number: number.padStart(2, '0'),
                frequency, 
                rank: index + 1
            }));
            
        if (sorted.length === 0) {
            return Array.from({length: 5}).map((_, i) => ({
                number: (i*11).toString().padStart(2, '0'),
                frequency: 10 - i,
                rank: i+1
            }));
        }
        
        return sorted;
    }, [history, globalBets]);

    const getRankStyle = (rank: number) => {
        if (rank === 1) return {
            border: 'border-emerald-500',
            shadow: 'shadow-neon-green',
            text: 'text-emerald-400',
            bg: 'bg-emerald-500/10', 
            icon: 'fa-crown',
            size: 'w-20 h-20 text-4xl',
            animate: 'animate-pulse',
            ringColor: 'border-emerald-500/50'
        };
        if (rank === 2) return {
            border: 'border-cyber-neon',
            shadow: 'shadow-neon-cyan',
            text: 'text-cyber-neon',
            bg: 'bg-cyan-500/10',
            icon: 'fa-bolt',
            size: 'w-16 h-16 text-2xl',
            animate: '',
            ringColor: ''
        };
        if (rank === 3) return {
            border: 'border-cyber-purple',
            shadow: 'shadow-neon-purple',
            text: 'text-cyber-purple',
            bg: 'bg-purple-500/10',
            icon: 'fa-fire',
            size: 'w-16 h-16 text-2xl',
            animate: '',
            ringColor: ''
        };
        return {
            border: 'border-white/10 group-hover:border-cyber-blue/50',
            shadow: 'group-hover:shadow-neon-blue',
            text: 'text-slate-300 group-hover:text-white',
            bg: 'bg-white/5',
            icon: 'fa-chart-line',
            size: 'w-14 h-14 text-xl',
            animate: '',
            ringColor: ''
        };
    };

    return (
        <div className="relative w-full group animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* AMBIENT GLOW */}
            <div className="absolute -inset-4 bg-cyber-neon/20 rounded-[2.5rem] blur-3xl animate-pulse transition-all duration-1000 opacity-20"></div>
            <div className="absolute -inset-2 bg-gradient-to-r from-cyber-neon/10 via-cyber-purple/10 to-emerald-500/10 rounded-[3rem] blur-2xl opacity-40 animate-pulse group-hover:opacity-60 transition-opacity duration-1000"></div>
            
            {/* GLASS CONTAINER */}
            <div className="relative glass-morphism border-2 border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-700 hover:border-white/20 z-10">
                <div className="absolute inset-0 carbon-texture opacity-[0.03] pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                
                <div className="flex flex-col md:flex-row items-center justify-between mb-10 px-2 relative z-10 gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shadow-inner backdrop-blur-md">
                            <i className="fas fa-brain text-cyber-neon animate-pulse text-xl"></i>
                        </div>
                        <div>
                            <h3 className="font-display font-black text-white uppercase tracking-[0.2em] text-lg md:text-xl leading-none">
                                Inteligencia <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-neon via-white to-cyber-purple text-glow-cyan">Predictiva</span>
                            </h3>
                            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.4em] mt-2 font-bold opacity-70">
                                Análisis de Vectores: Ciclo Real-Time
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-success opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-success"></span>
                        </span>
                        <span className="text-[10px] font-black text-cyber-success uppercase tracking-widest">Neural Link Active</span>
                    </div>
                </div>

                <div className="relative w-full">
                    {/* FADING EDGES */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black/20 to-transparent z-10 pointer-events-none"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black/20 to-transparent z-10 pointer-events-none"></div>

                    <div className="flex gap-6 md:gap-8 overflow-x-auto no-scrollbar pb-8 pt-16 px-4 items-end min-h-[220px]">
                        {topStats.map((stat, idx) => {
                            const style = getRankStyle(stat.rank);
                            return (
                                <div key={stat.number} className="flex flex-col items-center group relative flex-shrink-0 cursor-default">
                                    {/* TOP BADGE */}
                                    {stat.rank <= 3 && (
                                        <div className={`absolute -top-12 z-20 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-black/80 backdrop-blur-md border ${style.border} ${style.text} shadow-lg transform -translate-y-2 group-hover:translate-y-[-12px] transition-all duration-300`}>
                                            RANK {stat.rank}
                                        </div>
                                    )}
                                    
                                    {/* BALL ELEMENT */}
                                    <div className={`
                                        relative rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10 backdrop-blur-xl
                                        ${style.size} ${style.border} ${style.bg} ${style.shadow} ${style.animate}
                                        group-hover:scale-115 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]
                                    `}>
                                        <span className={`font-display font-black ${style.text} drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>
                                            {stat.number}
                                        </span>
                                        {stat.rank === 1 && (
                                            <div className={`absolute -inset-1 border-2 ${style.ringColor} rounded-full animate-[spin_6s_linear_infinite] opacity-50`}></div>
                                        )}
                                        {/* INTERNAL GLASS SHINE */}
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                                    </div>

                                    {/* STATS FOOTER */}
                                    <div className="mt-6 text-center w-full min-w-[80px]">
                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mb-2 border border-white/5">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${stat.rank === 1 ? 'bg-emerald-400' : stat.rank <= 3 ? 'bg-cyber-neon' : 'bg-cyber-blue'}`} 
                                                style={{ width: `${Math.min(stat.frequency * 5, 100)}%` }} 
                                            ></div>
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-500 group-hover:text-white transition-colors font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                            <i className={`fas ${style.icon} text-[8px] opacity-40`}></i>
                                            {stat.frequency}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
