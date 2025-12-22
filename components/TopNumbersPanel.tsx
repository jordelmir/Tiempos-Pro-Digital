import React, { useMemo, useState, useEffect } from 'react';
import { useLiveResults } from '../hooks/useLiveResults';
import { api } from '../services/edgeApi';
import { useAuthStore } from '../store/useAuthStore';

export default function TopNumbersPanel() {
  const { history } = useLiveResults();
  const user = useAuthStore((s) => s.user);
  const [globalBets, setGlobalBets] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchBets = async () => {
      const res = await api.getGlobalBets({
        role: user.role,
        userId: user.id,
        timeFilter: 'ALL',
        statusFilter: 'ALL',
      });
      if (res.data) setGlobalBets(res.data.bets);
    };
    fetchBets();
    const i = setInterval(fetchBets, 10000);
    return () => clearInterval(i);
  }, [user]);

  // Logic to calculate top numbers based on REAL DATA
  const topStats = useMemo(() => {
    const counts: Record<string, number> = {};

    // 1. Weight: Recent Wins (Historical) - Heavy Weight
    history.forEach((h) => {
      if (h.winningNumber && h.winningNumber !== '--') {
        counts[h.winningNumber] = (counts[h.winningNumber] || 0) + 15;
      }
    });

    // 2. Weight: Popular Bets (Volume) - Moderate Weight
    globalBets.forEach((b) => {
      if (b.numbers) {
        // Higher amount = Higher heat
        const weight = b.amount_bigint > 500000 ? 5 : b.amount_bigint > 100000 ? 3 : 1;
        counts[b.numbers] = (counts[b.numbers] || 0) + weight;
      }
    });

    // 3. Sort and Slice
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([number, frequency], index) => ({
        number,
        frequency, // "Heat Score"
        rank: index + 1,
      }));

    // If empty (new system), seed with a few place holders
    if (sorted.length === 0) {
      return Array.from({ length: 5 }).map((_, i) => ({
        number: (i * 11).toString().padStart(2, '0'),
        frequency: 10 - i,
        rank: i + 1,
      }));
    }

    return sorted;
  }, [history, globalBets]);

  // Helper for Rank Styles
  const getRankStyle = (rank: number) => {
    if (rank === 1)
      return {
        // DARK EMERALD THEME (KING)
        border: 'border-emerald-500',
        shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.6)]',
        text: 'text-emerald-400',
        bg: 'bg-[#022c22]', // Deep Dark Emerald
        icon: 'fa-crown',
        size: 'w-20 h-20 text-4xl',
        animate: 'animate-pulse',
        ringColor: 'border-emerald-500/50',
      };
    if (rank === 2)
      return {
        border: 'border-cyber-neon',
        shadow: 'shadow-[0_0_20px_rgba(0,240,255,0.4)]',
        text: 'text-cyber-neon',
        bg: 'bg-cyan-950/60',
        icon: 'fa-bolt',
        size: 'w-16 h-16 text-2xl',
        animate: '',
        ringColor: '',
      };
    if (rank === 3)
      return {
        border: 'border-cyber-purple',
        shadow: 'shadow-[0_0_20px_rgba(188,19,254,0.4)]',
        text: 'text-cyber-purple',
        bg: 'bg-purple-950/60',
        icon: 'fa-fire',
        size: 'w-16 h-16 text-2xl',
        animate: '',
        ringColor: '',
      };
    return {
      border: 'border-slate-700 group-hover:border-cyber-blue',
      shadow: 'group-hover:shadow-[0_0_15px_rgba(36,99,235,0.5)]',
      text: 'text-slate-300 group-hover:text-white',
      bg: 'bg-black/40',
      icon: 'fa-chart-line',
      size: 'w-14 h-14 text-xl',
      animate: '',
      ringColor: '',
    };
  };

  return (
    <div className="relative w-full group animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* --- CONTAINER GLOW --- */}
      <div className="absolute -inset-1 bg-gradient-to-r from-cyber-purple via-cyber-blue to-emerald-600 rounded-[2.5rem] opacity-20 blur-xl animate-pulse group-hover:opacity-30 transition-opacity duration-1000"></div>

      {/* MAIN PANEL */}
      <div className="relative bg-[#050a14] border-y-2 border-x border-t-cyber-neon/30 border-b-cyber-purple/30 border-x-transparent rounded-[2rem] p-6 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {/* HEADER */}
        <div className="flex items-center justify-between mb-2 px-2 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-black border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <i className="fas fa-chart-pie text-cyber-neon animate-[spin_10s_linear_infinite]"></i>
            </div>
            <div>
              <h3 className="font-display font-black text-white uppercase tracking-widest text-sm md:text-base leading-none">
                Inteligencia{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-neon to-cyber-purple">
                  Predictiva
                </span>
              </h3>
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em] mt-1">
                Top 10 Frecuencia Global (Volumen + Histórico)
              </p>
            </div>
          </div>

          {/* Live Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-success"></span>
            </span>
            <span className="text-[9px] font-bold text-cyber-success uppercase tracking-wider">
              Live Analytics
            </span>
          </div>
        </div>

        {/* SCROLLABLE LIST */}
        <div className="relative w-full">
          {/* Fade Edges */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#050a14] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#050a14] to-transparent z-10 pointer-events-none"></div>

          {/* 
                       Added pt-16 (padding-top: 4rem) to ensure the floating badges have ample room 
                       and do not touch the spheres.
                    */}
          <div className="flex gap-4 md:gap-6 overflow-x-auto custom-scrollbar pb-6 pt-16 px-4 items-end min-h-[200px]">
            {topStats.map((stat, idx) => {
              const style = getRankStyle(stat.rank);
              return (
                <div
                  key={stat.number}
                  className="flex flex-col items-center group relative flex-shrink-0 cursor-default"
                >
                  {/* Connection Line (Visual) */}
                  {idx < 9 && (
                    <div className="absolute top-1/2 -right-4 md:-right-6 w-4 md:w-6 h-px bg-white/5 z-0"></div>
                  )}

                  {/* Rank Badge (Top 3) - Floating Higher (-top-10) */}
                  {stat.rank <= 3 && (
                    <div
                      className={`absolute -top-10 z-20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-black border ${style.border} ${style.text} shadow-lg transform -translate-y-2 group-hover:translate-y-0 transition-transform duration-300`}
                    >
                      Top {stat.rank}
                    </div>
                  )}

                  {/* NUMBER CIRCLE */}
                  <div
                    className={`
                                        relative rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10
                                        ${style.size} ${style.border} ${style.bg} ${style.shadow} ${style.animate}
                                        group-hover:scale-110 group-hover:bg-black group-hover:z-20
                                    `}
                  >
                    <span className={`font-mono font-black ${style.text} drop-shadow-md`}>
                      {stat.number}
                    </span>

                    {/* Inner Ring for #1 (Now Emerald) */}
                    {stat.rank === 1 && (
                      <div
                        className={`absolute inset-1 border ${style.ringColor} rounded-full animate-[spin_4s_linear_infinite]`}
                      ></div>
                    )}
                  </div>

                  {/* HEAT METER */}
                  <div className="mt-4 text-center w-full">
                    <div className="h-1.5 w-14 mx-auto bg-white/10 rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full ${stat.rank === 1 ? 'bg-emerald-500' : stat.rank <= 3 ? 'bg-cyber-neon' : 'bg-cyber-blue'}`}
                        style={{ width: `${Math.min(stat.frequency * 5, 100)}%` }} // Visual scale
                      ></div>
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 group-hover:text-white transition-colors">
                      <i className={`fas ${style.icon} mr-1 opacity-50`}></i>
                      {stat.frequency} Heat
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
