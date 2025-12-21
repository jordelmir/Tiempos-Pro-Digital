
import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { PurgeTarget, PurgeAnalysis } from '../types';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

export default function DataPurgeCard({ theme: parentTheme }: { theme?: any }) {
    const { user } = useAuthStore();
    
    // UI Local State
    const [view, setView] = useState<'SELECT' | 'ANALYZE' | 'CONFIRM' | 'EXECUTING' | 'SUCCESS'>('SELECT');
    const [target, setTarget] = useState<PurgeTarget | null>(null);
    const [days, setDays] = useState(30);
    const [analysis, setAnalysis] = useState<PurgeAnalysis | null>(null);
    const [confirmPhrase, setConfirmPhrase] = useState('');
    const [purgeResult, setPurgeResult] = useState<number>(0);

    const TARGETS: { id: PurgeTarget; label: string; icon: string; color: string; desc: string }[] = [
        { id: 'BETS_HISTORY', label: 'Apuestas Pasadas', icon: 'fa-ticket-alt', color: 'text-blue-400', desc: 'Limpia jugadas finalizadas (Ganadas/Perdidas) para liberar memoria operativa.' },
        { id: 'AUDIT_LOGS', label: 'Bitácora Técnica', icon: 'fa-dna', color: 'text-purple-400', desc: 'Depura registros de actividad técnica antiguos. No afecta datos de usuario.' },
        { id: 'RESULTS_HISTORY', label: 'Historial Sorteos', icon: 'fa-history', color: 'text-orange-400', desc: 'Elimina registros de resultados de días anteriores del búfer visual.' },
        { id: 'LEDGER_OLD', label: 'Libro Contable', icon: 'fa-book-dead', color: 'text-emerald-400', desc: 'Remueve transacciones bancarias antiguas del registro público. El saldo está blindado.' }
    ];

    const handleSelectTarget = (t: PurgeTarget) => {
        setTarget(t);
        runAnalysis(t);
    };

    const runAnalysis = async (t: PurgeTarget) => {
        setView('ANALYZE');
        try {
            const res = await api.maintenance.analyzePurge({ target: t, days });
            if (res.data) {
                setAnalysis(res.data);
                setView('CONFIRM');
            }
        } catch (e) {
            alert("Fallo en el Escaneo de Sectores");
            setView('SELECT');
        }
    };

    const handleExecutePurge = async () => {
        if (!target || !user) return;
        setView('EXECUTING');
        try {
            await new Promise(r => setTimeout(r, 2500)); // Dramatic delay
            const res = await api.maintenance.executePurge({
                target,
                days,
                actor_id: user.id
            });
            if (res.data) {
                setPurgeResult(res.data.count);
                setView('SUCCESS');
            }
        } catch (e) {
            alert("Protocolo Interrumpido: Error de integridad");
            setView('SELECT');
        }
    };

    const reset = () => {
        setView('SELECT');
        setTarget(null);
        setAnalysis(null);
        setConfirmPhrase('');
    };

    const getPhrase = () => {
        if (target === 'LEDGER_OLD') return 'PURGAR CONTABILIDAD';
        if (target === 'BETS_HISTORY') return 'LIMPIAR JUGADAS';
        return 'CONFIRMAR LIMPIEZA';
    };

    return (
        <div className="relative w-full group font-sans">
            {/* Ambient Background Glow - Forced to Red for Phosphorescent Effect */}
            <div className={`absolute -inset-1 rounded-[2rem] opacity-30 blur-xl animate-pulse transition-all duration-1000 bg-red-600`}></div>
            
            {/* Main Chassis - Permanent Red Phosphorescent Border */}
            <div className={`relative bg-[#050a14]/90 border-2 border-red-600 shadow-neon-red rounded-[2rem] overflow-hidden flex flex-col min-h-[480px] transition-all duration-700 z-10 backdrop-blur-2xl`}>
                
                {/* Header Estilo Terminal */}
                <div className={`px-6 py-4 border-b border-white/5 flex items-center justify-between bg-red-950/30`}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center shadow-inner">
                            <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 4, theme: 'neon', size: 0.8 }}>
                                <i className={`fas ${view === 'CONFIRM' ? 'fa-radiation text-red-500' : 'fa-server text-red-500'} text-sm`}></i>
                            </AnimatedIconUltra>
                        </div>
                        <div>
                            <h3 className="text-xs md:text-sm font-display font-black text-white uppercase tracking-[0.2em]">Mantenimiento Forense</h3>
                            <p className="text-[8px] font-mono text-red-400 uppercase tracking-widest">Protocolo de Optimización v3.6.1</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${view === 'EXECUTING' ? 'bg-red-500 animate-ping' : 'bg-red-500'} shadow-[0_0_5px_currentColor]`}></span>
                        <span className="text-[9px] font-bold text-red-400 font-mono">NODE_CRITICAL</span>
                    </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                    
                    {view === 'SELECT' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="grid grid-cols-2 gap-3">
                                {TARGETS.map(t => (
                                    <button 
                                        key={t.id}
                                        onClick={() => handleSelectTarget(t.id)}
                                        className="group/btn relative bg-black/60 border border-white/5 p-5 rounded-2xl hover:border-red-500/50 transition-all text-left overflow-hidden hover:scale-[1.02]"
                                    >
                                        <div className="relative z-10">
                                            <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 3.5, theme: 'cyber', size: 1.1 }}>
                                                <i className={`fas ${t.icon} ${t.color} text-2xl mb-3 opacity-60 group-hover/btn:opacity-100 transition-opacity`}></i>
                                            </AnimatedIconUltra>
                                            <div className="text-[10px] font-black text-white uppercase tracking-wider">{t.label}</div>
                                            <div className="text-[8px] text-slate-600 mt-1 uppercase font-bold leading-tight line-clamp-2">{t.desc}</div>
                                        </div>
                                        <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/btn:opacity-10 transition-opacity translate-x-2 -translate-y-2">
                                            <i className={`fas ${t.icon} text-6xl`}></i>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            
                            <div className="p-5 rounded-2xl bg-red-950/10 border border-red-900/20 relative group/range">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <label className="text-[9px] font-black text-red-500 uppercase tracking-widest">Horizonte de Tiempo</label>
                                        <p className="text-[8px] text-slate-500 uppercase font-bold">Conserva datos de los últimos {days} días</p>
                                    </div>
                                    <div className="text-xl font-mono font-black text-white bg-red-600 px-3 py-1 rounded-lg shadow-neon-red">{days}d</div>
                                </div>
                                <input 
                                    type="range" min="7" max="180" value={days}
                                    onChange={e => setDays(Number(e.target.value))}
                                    className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-red-500 border border-white/5"
                                />
                            </div>
                        </div>
                    )}

                    {view === 'ANALYZE' && (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12 animate-pulse">
                            <div className="w-20 h-20 border-4 border-dashed border-red-500 rounded-full animate-[spin_3s_linear_infinite] flex items-center justify-center">
                                <i className="fas fa-satellite-dish text-red-500 text-3xl"></i>
                            </div>
                            <h2 className="text-[12px] font-black text-white uppercase tracking-[0.5em]">Escaneando Sectores de Red...</h2>
                            <p className="text-[9px] font-mono text-red-900 animate-pulse">Analizando integridad de punteros...</p>
                        </div>
                    )}

                    {view === 'CONFIRM' && analysis && (
                        <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-6 duration-500">
                            <div className="bg-black/60 border-2 border-red-900/30 rounded-3xl p-6 mb-8 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20 animate-[scan_2s_linear_infinite]"></div>
                                
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h4 className="text-white font-black uppercase text-sm tracking-widest mb-1">Reporte de Impacto</h4>
                                        <p className="text-[10px] text-red-400/80 font-mono uppercase font-bold">Objetivo: {target}</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-lg text-[9px] font-black border ${analysis.riskLevel === 'HIGH' ? 'bg-red-950 text-red-500 border-red-500/50 shadow-neon-red' : 'bg-yellow-950 text-yellow-500 border-yellow-500/50 shadow-neon-orange'}`}>
                                        RIESGO {analysis.riskLevel}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-black p-4 rounded-xl border border-white/5 flex flex-col items-center">
                                        <div className="text-[9px] text-slate-500 uppercase font-black mb-1">Punteros Detectados</div>
                                        <div className="text-3xl font-mono font-bold text-white">{analysis.recordCount}</div>
                                    </div>
                                    <div className="bg-black p-4 rounded-xl border border-white/5 flex flex-col items-center">
                                        <div className="text-[9px] text-slate-500 uppercase font-black mb-1">Carga Liberada</div>
                                        <div className="text-3xl font-mono font-bold text-red-500">{analysis.estimatedSizeKB} <span className="text-sm">KB</span></div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30">
                                    <p className="text-[10px] text-slate-300 leading-relaxed text-center font-bold italic">
                                        <i className="fas fa-exclamation-triangle mr-2 text-red-500"></i>
                                        {analysis.description}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] block text-center">Escriba para autorizar ignición</label>
                                <input 
                                    type="text" value={confirmPhrase} onChange={e => setConfirmPhrase(e.target.value.toUpperCase())}
                                    placeholder={getPhrase()}
                                    className="w-full bg-black border-2 border-red-900/50 rounded-2xl py-4 text-center text-white font-mono text-lg focus:border-red-500 outline-none placeholder-slate-900 uppercase transition-all shadow-inner"
                                />
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button onClick={reset} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Abortar</button>
                                <button 
                                    onClick={handleExecutePurge}
                                    disabled={confirmPhrase !== getPhrase()}
                                    className="flex-[2] py-4 bg-red-600 hover:bg-white hover:text-red-600 text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-neon-red transition-all flex items-center justify-center gap-3 disabled:opacity-20 disabled:grayscale"
                                >
                                    <i className="fas fa-bolt text-lg"></i> DETONAR PURGA
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'EXECUTING' && (
                        <div className="flex-1 flex flex-col items-center justify-center py-12">
                             <div className="relative w-40 h-40 mb-10">
                                <div className="absolute inset-0 border-4 border-red-600/30 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-red-500 rounded-full border-t-transparent animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <i className="fas fa-radiation text-5xl text-red-500 animate-pulse"></i>
                                </div>
                             </div>
                             <h2 className="text-xl font-display font-black text-white uppercase tracking-[0.5em] mb-4">Ejecutando Secuencia</h2>
                             <div className="w-full max-w-xs h-1.5 bg-black rounded-full overflow-hidden border border-white/10">
                                 <div className="h-full bg-red-600 animate-[loading_2.5s_ease-in-out_infinite] shadow-neon-red"></div>
                             </div>
                             <p className="text-[9px] font-mono text-red-400 mt-4 uppercase animate-pulse">Inyectando comandos de limpieza atómica...</p>
                        </div>
                    )}

                    {view === 'SUCCESS' && (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 animate-in zoom-in-95 duration-500 text-center">
                            <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center shadow-neon-red mb-8 relative">
                                <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-20"></div>
                                <i className="fas fa-check text-black text-5xl"></i>
                            </div>
                            <h3 className="text-3xl font-display font-black text-white uppercase tracking-tighter italic">Optimización Finalizada</h3>
                            <div className="mt-6 bg-red-950/20 border border-red-600/30 p-5 rounded-2xl min-w-[240px]">
                                <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-1 font-bold">Registros Liberados</p>
                                <div className="text-4xl font-mono font-black text-white drop-shadow-[0_0_10px_rgba(255,0,60,0.5)]">{purgeResult}</div>
                            </div>
                            <button onClick={reset} className="mt-10 px-12 py-4 bg-white text-black hover:bg-red-500 transition-all rounded-full text-xs font-black uppercase tracking-widest shadow-xl active:scale-95">Regresar al Núcleo</button>
                        </div>
                    )}

                </div>
                
                {/* Footer Industrial Disclaimer */}
                <div className="px-6 py-4 bg-black/60 border-t border-white/5 flex items-center gap-4">
                    <i className="fas fa-shield-check text-red-500 text-sm opacity-50"></i>
                    <p className="text-[9px] font-mono text-red-900 uppercase tracking-widest leading-relaxed font-bold">
                        Protocolo Phront Maestro: Las apuestas ACTIVAS y balances actuales están BLINDADOS por el Kernel y no pueden ser purgados.
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes loading {
                    0% { width: 0%; transform: translateX(0%); }
                    50% { width: 70%; transform: translateX(20%); }
                    100% { width: 100%; transform: translateX(0%); }
                }
                @keyframes scan {
                    0% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(400%); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
