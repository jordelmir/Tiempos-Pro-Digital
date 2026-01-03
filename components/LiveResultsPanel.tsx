
import React, { useState } from 'react';
import { useLiveResults } from '../hooks/useLiveResults';
import { DrawTime, UserRole, LotteryRegion } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import WinningNumberCard from './WinningNumberCard';
import AdminResultControl from './AdminResultControl'; 
import AnimatedIconUltra from './ui/AnimatedIconUltra';

export default function LiveResultsPanel() {
    const { user } = useAuthStore();
    const { getResultsForTime, loading } = useLiveResults();
    const [editDraw, setEditDraw] = useState<DrawTime | null>(null);
    const [activeRegion, setActiveRegion] = useState<LotteryRegion>(LotteryRegion.TICA);

    return (
        <div className="relative w-full group max-w-[1600px] mx-auto">
            <AdminResultControl 
                isOpen={!!editDraw} 
                onClose={() => setEditDraw(null)} 
                initialDraw={editDraw}
                initialRegion={activeRegion}
            />

            {/* MAIN COMMAND HUD */}
            <div className="relative w-full bg-[#02040a] border-2 border-white/10 rounded-[3rem] md:rounded-[4rem] p-6 md:p-12 lg:p-16 overflow-hidden z-10 shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                
                {/* Visual HUD Decoration */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyber-neon to-transparent opacity-50"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

                <div className="flex flex-col lg:flex-row justify-between items-center mb-12 lg:mb-20 relative z-10 gap-10">
                    <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                        <div className="relative">
                            <div className="absolute -inset-6 bg-cyber-neon/10 blur-2xl rounded-full animate-pulse"></div>
                            <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-black border-2 border-cyber-neon/50 flex items-center justify-center shadow-neon-cyan relative z-10 transition-transform duration-700 hover:rotate-6">
                                <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 6, theme: 'neon' }}>
                                    <i className="fas fa-microchip text-4xl md:text-5xl text-cyber-neon"></i>
                                </AnimatedIconUltra>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-5xl md:text-6xl font-display font-black text-white uppercase tracking-tighter flex flex-col leading-none">
                                <span className="text-xs md:text-sm font-mono text-cyber-neon tracking-[0.6em] mb-2 font-bold">CORE_SERVER_v5.5</span>
                                NÚCLEO <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-400 to-slate-600 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">MANDO</span>
                            </h2>
                            <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 mt-6">
                                <div className="px-5 py-1.5 rounded-full bg-cyber-success/10 border border-cyber-success/40 flex items-center gap-3 backdrop-blur-md">
                                    <div className="w-2 h-2 bg-cyber-success rounded-full animate-ping"></div>
                                    <span className="text-[10px] md:text-[11px] font-black text-cyber-success uppercase tracking-widest">RED_MULTINODO_ACTIVA</span>
                                </div>
                                <div className="h-4 w-px bg-white/10 hidden md:block"></div>
                                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Protocolo Phront Maestro</span>
                            </div>
                        </div>
                    </div>

                    <div className="hidden xl:flex items-center gap-12 bg-black/40 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
                        <div className="text-right">
                            <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">LATENCIA_RED</div>
                            <div className="text-2xl font-mono font-bold text-white flex items-center justify-end gap-2">
                                0.08<span className="text-xs text-cyber-neon">ms</span>
                            </div>
                        </div>
                        <div className="w-px h-14 bg-white/10"></div>
                        <div className="text-right">
                            <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">NÚCLEOS_SINC</div>
                            <div className="text-2xl font-mono font-bold text-cyber-success text-glow-sm">4/4</div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="h-[500px] flex flex-col items-center justify-center gap-8">
                        <div className="relative w-28 h-28">
                             <div className="absolute inset-0 border-4 border-cyber-neon/20 rounded-full"></div>
                             <div className="absolute inset-0 border-4 border-cyber-neon border-t-transparent rounded-full animate-spin shadow-neon-cyan"></div>
                        </div>
                        <span className="text-xs font-mono text-cyber-neon animate-pulse uppercase tracking-[0.8em] font-black">Descifrando Flujo Temporal...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-12 relative z-10">
                        {[DrawTime.MEDIODIA, DrawTime.TARDE, DrawTime.NOCHE].map(time => {
                            const timeResults = getResultsForTime(time);
                            return (
                                <WinningNumberCard 
                                    key={time}
                                    drawTime={time} 
                                    results={timeResults} 
                                    role={user?.role || UserRole.Cliente}
                                    region={activeRegion}
                                    onEdit={() => setEditDraw(time)}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Cyber Footer Decoration */}
                <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 opacity-40">
                    <div className="text-[9px] font-mono text-white uppercase tracking-[0.4em]">Fuerza_Operativa_Digital_V5.5</div>
                    <div className="flex gap-3">
                        {[1,2,3,4,5,6,7].map(i => (
                            <div key={i} className={`w-6 h-1 rounded-full ${i % 2 === 0 ? 'bg-cyber-neon' : 'bg-slate-700'}`}></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
