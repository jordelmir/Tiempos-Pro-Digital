
import React, { useEffect, useState } from 'react';
import { api } from '../services/edgeApi';
import { RiskAnalysisSIPR, DrawTime } from '../types';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

interface AIRecommendationsProps {
    drawTime: DrawTime;
    onSelectNumber: (num: string) => void;
}

export default function AIRecommendations({ drawTime, onSelectNumber }: AIRecommendationsProps) {
    const [recommendations, setRecommendations] = useState<RiskAnalysisSIPR[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRecs = async () => {
        const res = await api.getRiskAnalysisSIPR(drawTime);
        if (res.data) {
            // Filtrar solo los más fríos (IA necesita equilibrar estos)
            const coldOnes = res.data
                .filter(r => r.is_recommended)
                .sort((a, b) => a.exposure_percent - b.exposure_percent)
                .slice(0, 6);
            setRecommendations(coldOnes);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRecs();
        const i = setInterval(fetchRecs, 10000);
        return () => clearInterval(i);
    }, [drawTime]);

    if (loading && recommendations.length === 0) return null;

    return (
        <div className="relative group p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyber-neon/10 border border-cyber-neon/30 flex items-center justify-center shadow-neon-cyan">
                        <i className="fas fa-brain text-cyber-neon animate-pulse"></i>
                    </div>
                    <div>
                        <h4 className="text-xs font-display font-black text-white uppercase tracking-widest leading-none">Análisis SIPR</h4>
                        <p className="text-[8px] font-mono text-cyber-neon uppercase tracking-[0.3em] mt-1">Sugerencias del Núcleo</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-950/30 border border-green-500/30">
                    <span className="text-[8px] font-black text-green-400 uppercase tracking-tighter">+1 PTO LEALTAD</span>
                </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {recommendations.map(rec => (
                    <button 
                        key={rec.number}
                        onClick={() => onSelectNumber(rec.number)}
                        className="relative group/num flex flex-col items-center gap-2 p-3 rounded-2xl bg-black border border-white/5 hover:border-cyber-neon transition-all hover:scale-105 active:scale-95"
                    >
                        {/* EFECTO GLITCH CYAN DE LLAMADA AL CLIC */}
                        <div className="absolute inset-0 bg-cyber-neon/5 rounded-2xl opacity-0 group-hover/num:opacity-100 animate-pulse"></div>
                        <div className="absolute -inset-1 border border-cyber-neon/0 group-hover/num:border-cyber-neon/50 rounded-2xl blur-[2px] transition-all"></div>
                        
                        <span className="text-2xl font-mono font-black text-white group-hover/num:text-cyber-neon transition-colors drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                            {rec.number}
                        </span>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-cyber-neon animate-[pulse_2s_infinite]" style={{ width: `${Math.max(10, rec.exposure_percent)}%` }}></div>
                        </div>
                    </button>
                ))}
            </div>
            
            <p className="text-[7px] font-mono text-slate-500 uppercase text-center mt-4 tracking-widest opacity-60">
                La IA prioriza vectores con baja saturación para garantizar la solvencia del nodo.
            </p>
        </div>
    );
}
