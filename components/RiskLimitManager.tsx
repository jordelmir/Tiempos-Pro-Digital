
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/edgeApi';
import { DrawTime, RiskAnalysisSIPR } from '../types';
import { formatCurrency } from '../constants';

export default function RiskLimitManager() {
  const [activeDraw, setActiveDraw] = useState<DrawTime>(DrawTime.NOCHE);
  const [stats, setStats] = useState<RiskAnalysisSIPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);

  const fetchData = async () => {
    try {
        const res = await api.getRiskAnalysisSIPR(activeDraw);
        if (res.data) setStats(res.data);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [activeDraw]);

  const theme = useMemo(() => {
      if (activeDraw.includes('Mediodía')) return { hex: '#ff5f00', border: 'border-cyber-solar', text: 'text-cyber-solar', shadow: 'shadow-neon-solar' };
      if (activeDraw.includes('Tarde')) return { hex: '#7c3aed', border: 'border-cyber-vapor', text: 'text-cyber-vapor', shadow: 'shadow-neon-vapor' };
      return { hex: '#2563eb', border: 'border-blue-600', text: 'text-blue-400', shadow: 'shadow-neon-blue' };
  }, [activeDraw]);

  return (
    <div className="w-full relative group font-sans pt-6">
        <div className={`absolute -inset-6 opacity-20 blur-[80px] rounded-[3rem] bg-gradient-to-br from-blue-600 via-purple-600 to-red-600 animate-pulse`}></div>
        
        <div className={`relative bg-[#02040a] border-2 ${theme.border} rounded-[2rem] overflow-hidden ${theme.shadow} flex flex-col xl:flex-row min-h-[750px] z-10`}>
            
            <div className="xl:w-3/5 flex flex-col border-r border-white/5 relative z-10">
                <div className="p-6 border-b border-white/5 bg-[#05070a]/95 backdrop-blur-md">
                    <h2 className="text-3xl font-display font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        Matriz de <span className="text-red-500 text-glow-red">Riesgo SIPR</span>
                    </h2>
                    <div className="flex gap-3 mt-6">
                        {Object.values(DrawTime).map((d) => (
                            <button key={d} onClick={() => setActiveDraw(d)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeDraw === d ? `bg-white text-black shadow-lg` : 'text-slate-500 border border-white/5 hover:text-white'}`}>
                                {d.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 p-6 bg-[#020305] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-10 gap-1.5">
                        {stats.map((cell) => {
                            const isSelected = cell.number === selectedNumber;
                            
                            // LÓGICA DE COLORES SIPR
                            let colorClass = "border-white/5 bg-white/5 text-slate-600";
                            if (cell.risk_status === 'CYAN') colorClass = "border-cyan-500/30 bg-cyan-900/10 text-cyan-400 shadow-[inset_0_0_10px_rgba(0,240,255,0.1)]";
                            if (cell.risk_status === 'AMBAR') colorClass = "border-yellow-500/50 bg-yellow-900/20 text-yellow-500";
                            if (cell.risk_status === 'BLOOD_RED') colorClass = "border-red-600 bg-red-950/40 text-red-500 animate-pulse shadow-neon-red";
                            if (cell.is_blocked) colorClass = "border-red-600 bg-red-600 text-black shadow-neon-red";

                            return (
                                <button
                                    key={cell.number}
                                    onClick={() => setSelectedNumber(cell.number)}
                                    className={`aspect-square rounded-lg border flex flex-col items-center justify-center transition-all ${colorClass} ${isSelected ? 'scale-110 z-20 border-white ring-4 ring-white/20' : 'hover:scale-105'}`}
                                >
                                    <span className="text-[10px] font-mono font-black">{cell.is_blocked ? 'X' : cell.number}</span>
                                    {!cell.is_blocked && <span className="text-[6px] font-bold opacity-70">{Math.round(cell.exposure_percent)}%</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="h-10 bg-black flex items-center px-6 gap-8 border-t border-white/5">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-500 shadow-neon-cyan"></div><span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">CYAN (SEGURO)</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500 shadow-neon-orange"></div><span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest">AMBAR (ATENCIÓN)</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-600 shadow-neon-red"></div><span className="text-[8px] font-black text-red-600 uppercase tracking-widest">ROJO SANGRE (PELIGRO)</span></div>
                </div>
            </div>

            <div className="xl:w-2/5 bg-[#05070a] p-8 flex flex-col relative">
                {selectedNumber ? (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Análisis de Vector</div>
                            <h3 className="text-8xl font-mono font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{selectedNumber}</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                             <div className="p-4 bg-black border border-white/5 rounded-2xl">
                                 <div className="text-[8px] text-slate-500 uppercase mb-2">Estado SIPR</div>
                                 <div className="font-bold text-white uppercase tracking-wider">{stats.find(s=>s.number===selectedNumber)?.risk_status}</div>
                             </div>
                             <div className="p-4 bg-black border border-white/5 rounded-2xl">
                                 <div className="text-[8px] text-slate-500 uppercase mb-2">Exposición</div>
                                 <div className="font-bold text-white">{Math.round(stats.find(s=>s.number===selectedNumber)?.exposure_percent || 0)}%</div>
                             </div>
                        </div>

                        <div className="p-6 bg-red-900/10 border border-red-900/30 rounded-2xl">
                             <div className="flex items-center gap-3 text-red-500 mb-3">
                                 <i className="fas fa-shield-alt"></i>
                                 <span className="text-[10px] font-black uppercase tracking-widest">Protocolo de Bloqueo</span>
                             </div>
                             <p className="text-[10px] text-slate-400 leading-relaxed">
                                El sistema SIPR bloquea inyecciones automáticamente al superar el 95% del URC (Umbral de Riesgo Crítico) para proteger las reservas de la banca.
                             </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                        <i className="fas fa-satellite-dish text-6xl mb-6"></i>
                        <p className="text-xs font-mono uppercase tracking-[0.4em]">Seleccione un vector para inspección forense</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
