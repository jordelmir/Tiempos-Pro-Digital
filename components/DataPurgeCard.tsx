
import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { PurgeTarget, PurgeAnalysis } from '../types';
import AnimatedIconUltra from './ui/AnimatedIconUltra';
import MatrixRain from './ui/MatrixRain';

export default function DataPurgeCard() {
    const { user } = useAuthStore();
    
    // UI Local State
    const [view, setView] = useState<'SELECT' | 'SCANNING' | 'CONFIRM' | 'EXECUTING' | 'SUCCESS'>('SELECT');
    const [target, setTarget] = useState<PurgeTarget | null>(null);
    const [days, setDays] = useState(30);
    const [analysis, setAnalysis] = useState<PurgeAnalysis | null>(null);
    const [confirmPhrase, setConfirmPhrase] = useState('');
    const [purgeResult, setPurgeResult] = useState<number>(0);
    const [hexLines, setHexLines] = useState<string[]>([]);

    const TARGETS: { id: PurgeTarget; label: string; icon: string; color: string; desc: string }[] = [
        { id: 'BETS_HISTORY', label: 'APUESTAS PASADAS', icon: 'fa-ticket-alt', color: 'text-red-500', desc: 'DEPURA JUGADAS FINALIZADAS PARA LIBERAR MEMORIA OPERATIVA.' },
        { id: 'AUDIT_LOGS', label: 'BITÁCORA TÉCNICA', icon: 'fa-dna', color: 'text-red-500', desc: 'LIMPIA REGISTROS TÉCNICOS ANTIGUOS. SIN AFECTAR IDENTIDADES.' },
        { id: 'RESULTS_HISTORY', label: 'HISTORIAL SORTEOS', icon: 'fa-history', color: 'text-red-500', desc: 'ELIMINA RESULTADOS DE DÍAS ANTERIORES DEL BÚFER VISUAL.' },
        { id: 'LEDGER_OLD', label: 'LIBRO CONTABLE', icon: 'fa-book-dead', color: 'text-red-500', desc: 'REMUEVE TRANSACCIONES ANTIGUAS. EL SALDO PERMANECE BLINDADO.' }
    ];

    useEffect(() => {
        if (view === 'SCANNING' || view === 'EXECUTING') {
            const interval = setInterval(() => {
                const line = `0x${Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0')} >> SECTOR_${Math.floor(Math.random() * 999)}_CLEAN`;
                setHexLines(prev => [line, ...prev].slice(0, 8));
            }, 80);
            return () => clearInterval(interval);
        }
    }, [view]);

    const handleSelectTarget = (t: PurgeTarget) => {
        setTarget(t);
        runScan(t);
    };

    const runScan = async (t: PurgeTarget) => {
        setView('SCANNING');
        try {
            await new Promise(r => setTimeout(r, 2000));
            const res = await api.maintenance.analyzePurge({ target: t, days });
            if (res.data) {
                setAnalysis(res.data);
                setView('CONFIRM');
            }
        } catch (e) {
            alert("FALLO EN EL ESCANEO DE SECTORES");
            setView('SELECT');
        }
    };

    const handleExecutePurge = async () => {
        if (!target || !user) return;
        setView('EXECUTING');
        try {
            await new Promise(r => setTimeout(r, 3500)); 
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
            alert("PROTOCOLO INTERRUMPIDO: ERROR DE INTEGRIDAD");
            setView('SELECT');
        }
    };

    const reset = () => {
        setView('SELECT');
        setTarget(null);
        setAnalysis(null);
        setConfirmPhrase('');
        setHexLines([]);
    };

    return (
        <div className="relative w-full group font-mono pt-10 sm:pt-20">
            {/* AMBIENT GLOW */}
            <div className="absolute -inset-4 bg-red-600/20 rounded-[2rem] blur-3xl animate-pulse transition-all duration-1000 opacity-20"></div>
            <div className="absolute -inset-4 bg-gradient-to-r from-transparent via-red-500/10 to-transparent rounded-[3rem] blur-3xl opacity-30 animate-pulse transition-all duration-1000"></div>
            
            {/* MAIN GLASS CONTAINER */}
            <div className="relative glass-morphism bg-black/30 backdrop-blur-[40px] border-2 border-red-500/40 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] rounded-[2rem] sm:rounded-[3.5rem] overflow-hidden flex flex-col min-h-[500px] sm:min-h-[550px] z-10 transition-all duration-700">
                <div className="absolute inset-0 carbon-texture opacity-[0.03] pointer-events-none"></div>
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{backgroundImage: 'radial-gradient(#FF3D3D 1px, transparent 0)', backgroundSize: '30px 30px'}}></div>
                
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                    <MatrixRain speed={0.2} density="LOW" theme="CYAN" />
                </div>

                {/* Glass Header Subpanel */}
                <div className="px-6 sm:px-10 py-6 sm:py-8 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between bg-white/5 backdrop-blur-3xl gap-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></div>
                    
                    <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto relative z-10">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-black/40 border border-red-500/30 flex items-center justify-center shadow-neon-red backdrop-blur-md">
                            <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 4, theme: 'cyber', size: 1.0 }}>
                                <i className="fas fa-biohazard text-red-500 text-xl sm:text-2xl"></i>
                            </AnimatedIconUltra>
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base md:text-2xl font-black text-white uppercase tracking-tighter leading-none">
                                MANTENIMIENTO <span className="text-red-500 text-glow-red">FORENSE</span>
                            </h3>
                            <p className="text-[8px] sm:text-[10px] text-slate-500 uppercase tracking-[0.4em] font-black mt-2 opacity-70">PROTOCOLO DE OPTIMIZACIÓN V3.6.1</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 px-6 py-2 bg-black/40 rounded-full border border-red-500/20 shadow-inner backdrop-blur-md relative z-10">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping shadow-[0_0_10px_#ef4444]"></span>
                        <span className="text-[9px] sm:text-[11px] font-black text-red-500 tracking-[0.2em] uppercase">Estado: Crítico</span>
                    </div>
                </div>

                <div className="p-6 sm:p-10 flex-1 flex flex-col relative z-10 overflow-y-auto custom-scrollbar">
                    
                    {view === 'SELECT' && (
                        <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                {TARGETS.map(t => (
                                    <button 
                                        key={t.id}
                                        onClick={() => handleSelectTarget(t.id)}
                                        className="group/btn relative bg-black/40 backdrop-blur-md border border-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl hover:border-red-500/40 transition-all text-left overflow-hidden hover:scale-[1.02] shadow-inner"
                                    >
                                        <div className="relative z-10">
                                            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20 group-hover/btn:border-red-500/50 transition-colors">
                                                <i className={`fas ${t.icon} text-red-500 text-xl sm:text-2xl opacity-60 group-hover/btn:opacity-100 transition-opacity`}></i>
                                            </div>
                                            <div className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest mb-2">{t.label}</div>
                                            <div className="text-[8px] sm:text-[10px] text-slate-500 uppercase font-black leading-relaxed tracking-widest opacity-60 group-hover/btn:opacity-100 transition-opacity">{t.desc}</div>
                                        </div>
                                        <div className="absolute -bottom-6 -right-6 opacity-[0.02] group-hover/btn:opacity-[0.08] transition-opacity rotate-12 group-hover/btn:rotate-0 duration-700">
                                            <i className={`fas ${t.icon} text-[120px] sm:text-[180px]`}></i>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            
                            <div className="p-6 sm:p-10 rounded-[2.5rem] bg-black/60 border border-white/5 relative group/range shadow-inner overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-6">
                                    <div className="text-center sm:text-left">
                                        <label className="text-[8px] sm:text-[10px] font-mono text-slate-500 uppercase tracking-[0.4em] font-black">HORIZONTE DE TIEMPO</label>
                                        <p className="text-[9px] sm:text-[11px] text-white uppercase font-black mt-2 tracking-widest">CONSERVAR DATOS DE LOS ÚLTIMOS {days} DÍAS</p>
                                    </div>
                                    <div className="text-2xl sm:text-4xl font-display font-black text-white bg-red-600 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl shadow-neon-red skew-x-[-6deg]">
                                        {days}D
                                    </div>
                                </div>
                                <input 
                                    type="range" min="7" max="180" value={days}
                                    onChange={e => setDays(Number(e.target.value))}
                                    className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-red-600 border border-white/10"
                                />
                                <div className="flex justify-between mt-4 text-[8px] font-mono text-slate-700 uppercase font-black tracking-widest">
                                    <span>7 Días (Protocolo Mínimo)</span>
                                    <span>180 Días (Archivo Máximo)</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {(view === 'SCANNING' || view === 'EXECUTING') && (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-8 sm:space-y-12 py-10 animate-in zoom-in-95 duration-500">
                            <div className="relative w-32 h-32 sm:w-48 sm:h-48">
                                <div className="absolute inset-0 border-4 border-dashed border-red-500/20 rounded-full animate-[spin_15s_linear_infinite]"></div>
                                <div className="absolute inset-4 border-2 border-red-600/30 rounded-full animate-pulse"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-black/60 border-2 border-red-500/50 flex items-center justify-center shadow-neon-red backdrop-blur-md">
                                        <i className={`fas ${view === 'SCANNING' ? 'fa-search' : 'fa-bolt'} text-red-500 text-4xl sm:text-6xl animate-bounce`}></i>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="w-full max-w-lg space-y-6">
                                <h2 className="text-xs sm:text-xl font-display font-black text-white uppercase tracking-[0.5em] text-center text-glow-red">
                                    {view === 'SCANNING' ? 'ESCANEO DE SECTORES...' : 'INYECCIÓN ATÓMICA...'}
                                </h2>
                                <div className="bg-black/60 border border-red-500/20 p-6 sm:p-8 rounded-2xl font-mono text-[9px] sm:text-[11px] text-red-500 space-y-2 h-40 sm:h-48 overflow-hidden shadow-inner backdrop-blur-xl">
                                    {hexLines.map((line, i) => (
                                        <div key={i} className="opacity-90 animate-in slide-in-from-left-4" style={{opacity: 1 - i*0.12}}>
                                            <span className="text-red-900 mr-4">[{new Date().toLocaleTimeString()}]</span>
                                            {line}
                                        </div>
                                    ))}
                                </div>
                                <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/5 relative shadow-inner">
                                    <div className="h-full bg-red-600 animate-[loading_2.5s_ease-in-out_infinite] shadow-[0_0_20px_#ef4444]"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'CONFIRM' && analysis && (
                        <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-8 duration-700">
                            <div className="bg-black/40 backdrop-blur-xl border-2 border-red-500/20 rounded-[2.5rem] p-8 sm:p-12 mb-8 sm:mb-12 relative overflow-hidden shadow-inner">
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-red-600/30 animate-[scan_3s_linear_infinite]"></div>
                                
                                <div className="flex flex-col sm:flex-row justify-between items-start mb-10 gap-6">
                                    <div>
                                        <h4 className="text-white font-black uppercase text-lg sm:text-2xl tracking-tighter leading-none mb-3">REPORTE DE IMPACTO</h4>
                                        <p className="text-[9px] sm:text-[11px] text-slate-500 font-mono uppercase font-black tracking-[0.4em] truncate">OBJETIVO: {target}</p>
                                    </div>
                                    <div className={`px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black border-2 bg-red-950/40 text-red-500 border-red-500 shadow-neon-red uppercase tracking-widest`}>
                                        RIESGO {analysis.riskLevel}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-10">
                                    <div className="bg-black/80 p-6 sm:p-8 rounded-3xl border border-white/5 flex flex-col items-center shadow-inner relative overflow-hidden group/stat">
                                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
                                        <div className="text-[9px] sm:text-[11px] text-slate-500 uppercase font-black mb-4 tracking-[0.2em] text-center">PUNTEROS DETECTADOS</div>
                                        <div className="text-4xl sm:text-6xl font-display font-black text-white tracking-tighter drop-shadow-lg">{analysis.recordCount}</div>
                                    </div>
                                    <div className="bg-black/80 p-6 sm:p-8 rounded-3xl border border-white/5 flex flex-col items-center shadow-inner relative overflow-hidden group/stat">
                                        <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
                                        <div className="text-[9px] sm:text-[11px] text-slate-500 uppercase font-black mb-4 tracking-[0.2em] text-center">CARGA LIBERADA</div>
                                        <div className="text-4xl sm:text-6xl font-display font-black text-red-500 tracking-tighter drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">{analysis.estimatedSizeKB} <span className="text-base sm:text-2xl uppercase opacity-50">KB</span></div>
                                    </div>
                                </div>

                                <div className="p-5 sm:p-8 rounded-3xl bg-red-950/20 border border-red-500/20 text-center backdrop-blur-md">
                                    <p className="text-[10px] sm:text-sm text-slate-300 leading-relaxed font-black uppercase tracking-widest italic">
                                        <i className="fas fa-triangle-exclamation mr-4 text-red-500 animate-pulse"></i>
                                        {analysis.description}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6 sm:space-y-8">
                                <label className="text-[10px] sm:text-xs font-mono text-slate-500 uppercase tracking-[0.5em] block text-center font-black">ESCRIBA PARA AUTORIZAR IGNICIÓN</label>
                                <input 
                                    type="text" value={confirmPhrase} onChange={e => setConfirmPhrase(e.target.value.toUpperCase())}
                                    placeholder="CONFIRMAR LIMPIEZA"
                                    className="w-full bg-black/60 border-2 border-red-500/30 rounded-2xl sm:rounded-3xl py-6 sm:py-8 text-center text-white font-display font-black text-xl sm:text-3xl focus:border-red-500 outline-none placeholder-red-950 uppercase transition-all shadow-[inset_0_0_30px_black] backdrop-blur-xl"
                                />
                            </div>

                            <div className="mt-10 sm:mt-16 flex flex-col sm:flex-row gap-4 sm:gap-6">
                                <button onClick={reset} className="w-full sm:flex-1 py-6 sm:py-8 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-2xl sm:rounded-[2rem] text-[11px] sm:text-xs font-black uppercase tracking-[0.4em] transition-all order-2 sm:order-1 border border-white/5 backdrop-blur-md">ABORTAR</button>
                                <button 
                                    onClick={handleExecutePurge}
                                    disabled={confirmPhrase !== 'CONFIRMAR LIMPIEZA'}
                                    className="w-full sm:flex-[2] py-6 sm:py-8 bg-red-600 hover:bg-white hover:text-red-600 text-black rounded-2xl sm:rounded-[2rem] text-[12px] sm:text-sm font-display font-black uppercase tracking-[0.5em] shadow-neon-red transition-all flex items-center justify-center gap-6 disabled:opacity-10 disabled:grayscale order-1 sm:order-2 active:scale-95"
                                >
                                    <i className="fas fa-bolt text-lg sm:text-2xl"></i> DETONAR PURGA
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'SUCCESS' && (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 animate-in zoom-in-95 duration-500 text-center">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_80px_#ef4444] mb-10 sm:mb-14 relative group">
                                <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-20"></div>
                                <div className="absolute inset-0 bg-red-600 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                                <i className="fas fa-check text-black text-5xl sm:text-7xl relative z-10"></i>
                            </div>
                            <h3 className="text-4xl sm:text-6xl font-display font-black text-white uppercase tracking-tighter italic mb-6 text-glow-red">OPTIMIZACIÓN FINALIZADA</h3>
                            <div className="bg-red-950/30 border border-red-500/20 p-8 sm:p-10 rounded-[2.5rem] md:rounded-[3rem] min-w-[280px] sm:min-w-[360px] backdrop-blur-xl shadow-inner relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-red-500/30"></div>
                                <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-[0.5em] mb-4 font-black opacity-60">REGISTROS LIBERADOS</p>
                                <div className="text-6xl sm:text-8xl font-display font-black text-white drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]">{purgeResult}</div>
                            </div>
                            <button onClick={reset} className="mt-12 sm:mt-20 px-16 sm:px-20 py-5 sm:py-7 bg-white text-black hover:bg-red-600 hover:text-white transition-all rounded-full text-xs sm:text-sm font-display font-black uppercase tracking-[0.6em] shadow-2xl active:scale-95">REGRESAR AL NÚCLEO</button>
                        </div>
                    )}

                </div>
                
                {/* Glass Footer Area */}
                <div className="px-6 sm:px-10 py-5 sm:py-7 bg-black/60 backdrop-blur-3xl border-t border-white/10 flex items-center gap-4 sm:gap-6 relative z-20">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                        <i className="fas fa-shield-halved text-red-500 text-base sm:text-lg"></i>
                    </div>
                    <p className="text-[8px] sm:text-[11px] text-slate-500 uppercase tracking-[0.15em] sm:tracking-[0.25em] leading-relaxed font-black">
                        PROTOCOLO PHRONT MAESTRO: LAS APUESTAS ACTIVAS Y BALANCES ACTUALES ESTÁN BLINDADOS POR EL KERNEL Y NO PUEDEN SER PURGADOS POR ESTA OPERACIÓN.
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes loading {
                    0% { width: 0%; transform: translateX(0%); }
                    50% { width: 80%; transform: translateX(20%); }
                    100% { width: 100%; transform: translateX(0%); }
                }
                @keyframes scan {
                    0% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(800%); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
