'use client'


import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency, formatDate } from '@/constants';
import { Bet } from '@/types';
import TicketViewModal from './TicketViewModal';

interface PersonalBetsPanelProps {
    theme: {
        name: string;
        hex: string;
        glow: string;
        text: string;
        border: string;
    };
    refreshTrigger: number;
}

export default function PersonalBetsPanel({ theme, refreshTrigger }: PersonalBetsPanelProps) {
    const user = useAuthStore(s => s.user);
    const [bets, setBets] = useState<Bet[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'WINNERS'>('ALL');
    
    // Ticket Viewing State
    const [selectedBet, setSelectedBet] = useState<Bet | null>(null);

    useEffect(() => {
        if (!user) return;
        
        async function fetchBets() {
            setLoading(true);
            const { data } = await supabase
                .from('bets')
                .select('*')
                .eq('user_id', user!.id)
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (data) setBets(data as unknown as Bet[]);
            setLoading(false);
        }

        fetchBets();
    }, [user, refreshTrigger]);

    // --- FILTRADO TÁCTICO ---
    const filteredBets = useMemo(() => {
        if (activeTab === 'PENDING') return bets.filter(b => b.status === 'PENDING');
        if (activeTab === 'WINNERS') return bets.filter(b => b.status === 'WON');
        return bets;
    }, [bets, activeTab]);

    // --- ESTADÍSTICAS RÁPIDAS ---
    const pendingCount = bets.filter(b => b.status === 'PENDING').length;
    const wonCount = bets.filter(b => b.status === 'WON').length;

    return (
        <div className="relative group h-[600px] flex flex-col">
            
            <TicketViewModal 
                isOpen={!!selectedBet} 
                bet={selectedBet} 
                onClose={() => setSelectedBet(null)} 
            />

            {/* GLOBAL PANEL BACKLIGHT */}
            <div className={`absolute -inset-1 ${theme.glow} rounded-2xl opacity-10 blur-xl animate-pulse transition-all duration-1000`}></div>
            
            <div className="relative bg-cyber-panel/40 border border-white/10 rounded-2xl backdrop-blur-md shadow-2xl flex flex-col h-full overflow-hidden transition-colors duration-500 hover:border-white/20">
                
                {/* HEADER & TABS */}
                <div className="p-6 border-b border-white/5 bg-black/20 flex-shrink-0 relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest flex items-center gap-3">
                            <i className="fas fa-list-ol text-slate-400"></i>
                            Bitácora de <span className={theme.text}>Operaciones</span>
                        </h3>
                        
                        {/* Status Indicators */}
                        <div className="flex gap-3">
                            {pendingCount > 0 && (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-900/30 border border-blue-500/30 animate-pulse">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_cyan]"></div>
                                    <span className="text-[9px] font-mono text-blue-300 font-bold">{pendingCount} EN PROCESO</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* TACTICAL TABS */}
                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                        <button 
                            onClick={() => setActiveTab('ALL')}
                            className={`flex-1 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === 'ALL' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 hover:text-white'}`}
                        >
                            Todas
                        </button>
                        <button 
                            onClick={() => setActiveTab('WINNERS')}
                            className={`flex-1 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === 'WINNERS' ? 'bg-cyber-success/20 text-cyber-success border border-cyber-success/30 shadow-[0_0_10px_rgba(10,255,96,0.2)]' : 'text-slate-500 hover:text-cyber-success'}`}
                        >
                            Aciertos ({wonCount})
                        </button>
                        <button 
                            onClick={() => setActiveTab('PENDING')}
                            className={`flex-1 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === 'PENDING' ? `bg-${theme.name}-500/20 ${theme.text} border ${theme.border}/30` : 'text-slate-500 hover:text-white'}`}
                        >
                            En Curso
                        </button>
                    </div>
                </div>

                {/* SCROLLABLE LIST */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative p-4 space-y-3">
                    {/* Scanline Overlay */}
                    <div className="sticky top-0 left-0 w-full h-1 bg-white/5 shadow-[0_0_15px_white] opacity-20 pointer-events-none z-20"></div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 opacity-50">
                            <i className="fas fa-circle-notch fa-spin text-2xl"></i>
                            <span className="text-[10px] font-mono uppercase tracking-widest">Sincronizando Historial...</span>
                        </div>
                    ) : filteredBets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-4 opacity-50">
                            <i className="fas fa-wind text-4xl"></i>
                            <span className="text-[10px] font-mono uppercase tracking-widest">Sin registros en este sector</span>
                        </div>
                    ) : (
                        filteredBets.map((bet) => {
                            // Dynamic Styling based on Status
                            const isWin = bet.status === 'WON';
                            const isLost = bet.status === 'LOST';
                            const isPending = bet.status === 'PENDING';
                            const multiplier = bet.mode.includes('200x') ? 200 : 90;
                            const totalPrize = bet.amount_bigint * multiplier;
                            
                            let statusColor = "border-white/5 bg-black/40";
                            let icon = "fa-clock";
                            
                            if (isWin) {
                                statusColor = "border-cyber-success/50 bg-cyber-success/5 shadow-[0_0_20px_rgba(10,255,96,0.1)]";
                                icon = "fa-trophy";
                            } else if (isPending) {
                                statusColor = `border-${theme.name}-500/30 bg-${theme.name}-500/5`;
                                icon = "fa-satellite-dish";
                            } else if (isLost) {
                                statusColor = "border-red-900/30 bg-red-900/5 opacity-70 grayscale-[0.5]";
                                icon = "fa-times";
                            }

                            return (
                                <div 
                                    key={bet.id} 
                                    onClick={() => setSelectedBet(bet)}
                                    className={`relative p-4 rounded-xl border ${statusColor} transition-all duration-300 hover:scale-[1.02] hover:bg-white/5 group/ticket overflow-hidden cursor-pointer`}
                                >
                                    {/* Hover Hint */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/ticket:opacity-100 transition-opacity z-20 backdrop-blur-[1px]">
                                        <div className="px-3 py-1 border border-white/20 rounded-full bg-black flex items-center gap-2">
                                            <i className="fas fa-ticket-alt text-cyber-neon"></i>
                                            <span className="text-[9px] uppercase font-bold text-white tracking-widest">Ver Ticket</span>
                                        </div>
                                    </div>

                                    {/* Ticket Decor */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-current opacity-50"></div>
                                    {isWin && <div className="absolute inset-0 bg-cyber-success/10 animate-pulse"></div>}

                                    <div className="relative z-10 flex justify-between items-center">
                                        
                                        {/* LEFT: NUMBER */}
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-lg bg-black border border-white/10 flex items-center justify-center text-2xl font-mono font-bold text-white shadow-inner ${isWin ? 'text-cyber-success border-cyber-success shadow-[0_0_10px_lime]' : ''}`}>
                                                {bet.numbers}
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-2">
                                                    {bet.draw_id || 'Sorteo General'}
                                                    {bet.ticket_code && <span className="text-[8px] bg-white/10 px-1 rounded text-slate-400">{bet.ticket_code}</span>}
                                                </div>
                                                <div className="text-xs text-white font-bold">
                                                    {formatDate(bet.created_at).split(',')[0]}
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT: INFO */}
                                        <div className="text-right">
                                            <div className={`text-sm font-mono font-bold ${isWin ? 'text-cyber-success text-glow-green' : 'text-white'}`}>
                                                {formatCurrency(bet.amount_bigint)}
                                            </div>
                                            <div className={`text-[9px] font-bold uppercase tracking-widest mt-1 flex flex-col items-end gap-1 ${
                                                isWin ? 'text-cyber-success' : isPending ? 'text-blue-400' : 'text-slate-500'
                                            }`}>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <i className={`fas ${icon} ${isPending ? 'animate-spin-slow' : ''}`}></i>
                                                    {bet.status === 'WON' ? 'GANADOR' : bet.status === 'PENDING' ? 'EN JUEGO' : 'FINALIZADO'}
                                                </span>
                                                {isWin && (
                                                    <span className="text-cyber-success font-mono font-black text-[11px] drop-shadow-[0_0_10px_rgba(10,255,96,1)]">
                                                        +{formatCurrency(totalPrize)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* ID Watermark */}
                                    <div className="absolute -bottom-2 -right-2 text-[40px] font-display font-black opacity-[0.03] pointer-events-none select-none">
                                        {bet.numbers}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
