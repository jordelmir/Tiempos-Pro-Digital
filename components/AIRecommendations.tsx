
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
            // Filtrar exactamente los que el motor marcó como recomendados (el TOP 10)
            const recommendedTen = res.data
                .filter(r => r.is_recommended)
                .slice(0, 10);
            setRecommendations(recommendedTen);
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
        <div className="relative group">
            <div className="absolute -inset-4 bg-cyber-neon/20 rounded-[2rem] blur-3xl animate-pulse transition-all duration-1000 opacity-20"></div>
            <div className="relative p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl z-10">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-cyber-neon/10 border border-cyber-neon/30 flex items-center justify-center shadow-neon-cyan">
                            <i className="fas fa-brain text-cyber-neon animate-pulse text-xl"></i>
                        </div>
                        <div>
                            <h4 className="text-sm font-display font-black text-white uppercase tracking-widest leading-none">Análisis SIPR</h4>
                            <p className="text-[9px] font-mono text-cyber-neon uppercase tracking-[0.3em] mt-1">Sugerencias del Núcleo (Top 10 Cold Vectors)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-green-950/40 border border-green-500/30 shadow-neon-green">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
                        <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">INCENTIVO: +1 PTO LEALTAD ACTIVO</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 xs:grid-cols-5 md:grid-cols-10 gap-3">
                    {recommendations.map(rec => (
                        <button 
                            key={rec.number}
                            onClick={() => onSelectNumber(rec.number)}
                            className="relative group/num flex flex-col items-center gap-2 p-4 rounded-2xl bg-black border border-white/5 hover:border-cyber-neon transition-all hover:scale-105 active:scale-95 overflow-hidden"
                        >
                            {/* EFECTO GLITCH CYAN DE LLAMADA AL CLIC */}
                            <div className="absolute inset-0 bg-cyber-neon/5 rounded-2xl opacity-0 group-hover/num:opacity-100 animate-pulse"></div>
                            <div className="absolute -inset-1 border border-cyber-neon/0 group-hover/num:border-cyber-neon/50 rounded-2xl blur-[2px] transition-all"></div>
                            
                            <span className="text-3xl font-mono font-black text-white group-hover/num:text-cyber-neon transition-colors drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">
                                {rec.number}
                            </span>
                            
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                                <div className="h-full bg-cyber-neon shadow-[0_0_5px_#00f0ff]" style={{ width: `${Math.max(15, rec.exposure_percent)}%` }}></div>
                            </div>
                            
                            <div className="text-[6px] font-mono text-slate-600 uppercase group-hover/num:text-cyber-neon transition-colors">
                                EXPO: {Math.round(rec.exposure_percent)}%
                            </div>
                        </button>
                    ))}
                </div>
                
                <div className="flex items-center gap-3 mt-6 justify-center">
                    <div className="h-px flex-1 bg-white/5"></div>
                    <p className="text-[8px] font-mono text-slate-500 uppercase tracking-[0.5em] opacity-60">
                        Solo los vectores recomendados por el SIPR califican para acumulación de lealtad.
                    </p>
                    <div className="h-px flex-1 bg-white/5"></div>
                </div>
            </div>
        </div>
    );
}
