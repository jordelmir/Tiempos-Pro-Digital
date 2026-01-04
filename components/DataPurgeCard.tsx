
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

    // Simulación de líneas hexadecimales para el escáner
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
            // Delay dramático para el escaneo forense
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
        <div className="relative w-full group font-mono">
            {/* 1. RESPLANDOR EXTERIOR ROJO INTENSO */}
            <div className="absolute -inset-1 rounded-[2.5rem] opacity-40 blur-2xl animate-pulse transition-all duration-1000 bg-[#FF3D3D]"></div>
            
            {/* 2. CONTENEDOR PRINCIPAL (#0D0D0D) */}
            <div className="relative bg-[#0D0D0D] border-2 border-[#FF3D3D] shadow-[0_0_40px_rgba(255,61,61,0.2)] rounded-[2.5rem] overflow-hidden flex flex-col min-h-[550px] z-10 transition-all duration-700 backdrop-blur-3xl">
                
                {/* FONDO DE REJILLA TÉCNICA Y MATRIX SUTIL */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{backgroundImage: 'radial-gradient(#FF3D3D 1px, transparent 0)', backgroundSize: '20px 20px'}}></div>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                    <MatrixRain colorHex="#FF3D3D" speed={0.2} density="LOW" />
                </div>

                {/* HEADER: MANTENIMIENTO FORENSE */}
                <div className="px-8 py-6 border-b border-[#FF3D3D]/20 flex items-center justify-between bg-gradient-to-r from-red-950/20 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-black border border-[#FF3D3D]/40 flex items-center justify-center shadow-[inset_0_0_15px_rgba(255,61,61,0.3)]">
                            <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 4, theme: 'neon', size: 0.9 }}>
                                <i className="fas fa-radiation text-[#FF3D3D] text-lg"></i>
                            </AnimatedIconUltra>
                        </div>
                        <div>
                            <h3 className="text-sm md:text-lg font-black text-white uppercase tracking-[0.3em]">MANTENIMIENTO FORENSE</h3>
                            <p className="text-[9px] text-[#FF3D3D]/60 uppercase tracking-[0.2em] font-bold">PROTOCOLO DE OPTIMIZACIÓN V3.6.1</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-black/60 rounded-full border border-[#FF3D3D]/30 shadow-[0_0_15px_rgba(255,61,61,0.1)]">
                        <span className="w-2 h-2 rounded-full bg-[#FF3D3D] animate-ping shadow-[0_0_10px_#FF3D3D]"></span>
                        <span className="text-[10px] font-black text-[#FF3D3D] tracking-widest">NODE_CRITICAL</span>
                    </div>
                </div>

                <div className="p-8 flex-1 flex flex-col relative z-10">
                    
                    {view === 'SELECT' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* GRILLA DE ACCIONES 2X2 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {TARGETS.map(t => (
                                    <button 
                                        key={t.id}
                                        onClick={() => handleSelectTarget(t.id)}
                                        className="group/btn relative bg-black/40 border border-white/5 p-6 rounded-2xl hover:border-[#FF3D3D]/60 transition-all text-left overflow-hidden hover:scale-[1.02] shadow-inner"
                                    >
                                        <div className="relative z-10">
                                            <i className={`fas ${t.icon} ${t.color} text-2xl mb-4 opacity-50 group-hover/btn:opacity-100 transition-opacity`}></i>
                                            <div className="text-[11px] font-black text-white uppercase tracking-widest mb-2">{t.label}</div>
                                            <div className="text-[9px] text-slate-500 uppercase font-bold leading-relaxed line-clamp-2 tracking-tighter">{t.desc}</div>
                                        </div>
                                        <div className="absolute -bottom-4 -right-4 opacity-5 group-hover/btn:opacity-20 transition-opacity rotate-12 group-hover/btn:rotate-0 duration-500">
                                            <i className={`fas ${t.icon} text-8xl`}></i>
                                        </div>
                                        {/* Hover Glow Edge */}
                                        <div className="absolute inset-0 border border-[#FF3D3D]/0 group-hover/btn:border-[#FF3D3D]/30 rounded-2xl transition-all duration-500"></div>
                                    </button>
                                ))}
                            </div>
                            
                            {/* HORIZONTE DE TIEMPO (SLIDER) */}
                            <div className="p-6 rounded-3xl bg-black/60 border border-white/5 relative group/range">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <label className="text-[10px] font-black text-[#FF3D3D] uppercase tracking-[0.3em]">HORIZONTE DE TIEMPO</label>
                                        <p className="text-[9px] text-slate-500 uppercase font-bold mt-1">CONSERVAR DATOS DE LOS ÚLTIMOS {days} DÍAS</p>
                                    </div>
                                    <div className="text-2xl font-black text-white bg-[#FF3D3D] px-5 py-2 rounded-xl shadow-[0_0_20px_#FF3D3D] skew-x-[-10deg]">
                                        {days}d
                                    </div>
                                </div>
                                <input 
                                    type="range" min="7" max="180" value={days}
                                    onChange={e => setDays(Number(e.target.value))}
                                    className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-[#FF3D3D] border border-white/10"
                                />
                            </div>
                        </div>
                    )}

                    {(view === 'SCANNING' || view === 'EXECUTING') && (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-8 py-10 animate-in zoom-in-95 duration-500">
                            <div className="relative w-32 h-32">
                                <div className="absolute inset-0 border-4 border-dashed border-[#FF3D3D]/40 rounded-full animate-[spin_10s_linear_infinite]"></div>
                                <div className="absolute inset-2 border-2 border-[#FF3D3D] rounded-full animate-pulse shadow-[0_0_30px_#FF3D3D]"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <i className={`fas ${view === 'SCANNING' ? 'fa-search' : 'fa-bolt'} text-[#FF3D3D] text-4xl animate-bounce`}></i>
                                </div>
                            </div>
                            
                            <div className="w-full max-w-md space-y-4">
                                <h2 className="text-[14px] font-black text-white uppercase tracking-[0.5em] text-center">
                                    {view === 'SCANNING' ? 'ESCANEO DE SECTORES...' : 'INYECCIÓN ATÓMICA...'}
                                </h2>
                                
                                {/* MONITOR HEXADECIMAL */}
                                <div className="bg-black/80 border border-[#FF3D3D]/30 p-5 rounded-xl font-mono text-[10px] text-[#FF3D3D] space-y-1 h-36 overflow-hidden shadow-inner">
                                    {hexLines.map((line, i) => (
                                        <div key={i} className="opacity-90 animate-in slide-in-from-left-2" style={{opacity: 1 - i*0.1}}>
                                            {line}
                                        </div>
                                    ))}
                                </div>

                                <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full bg-[#FF3D3D] animate-[loading_2s_ease-in-out_infinite] shadow-[0_0_15px_#FF3D3D]"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'CONFIRM' && analysis && (
                        <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-8 duration-700">
                            <div className="bg-black/60 border-2 border-[#FF3D3D]/30 rounded-[2rem] p-8 mb-8 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-[#FF3D3D]/40 animate-[scan_2s_linear_infinite]"></div>
                                
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h4 className="text-white font-black uppercase text-base tracking-widest mb-1">REPORTE DE IMPACTO</h4>
                                        <p className="text-[10px] text-[#FF3D3D] font-mono uppercase font-bold tracking-widest">OBJETIVO: {target}</p>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-lg text-[10px] font-black border-2 bg-red-950/40 text-[#FF3D3D] border-[#FF3D3D] shadow-[0_0_20px_#FF3D3D]`}>
                                        RIESGO {analysis.riskLevel}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6 mb-8">
                                    <div className="bg-black/80 p-6 rounded-2xl border border-white/5 flex flex-col items-center shadow-inner">
                                        <div className="text-[10px] text-slate-500 uppercase font-black mb-2">PUNTEROS DETECTADOS</div>
                                        <div className="text-4xl font-black text-white tracking-tighter">{analysis.recordCount}</div>
                                    </div>
                                    <div className="bg-black/80 p-6 rounded-2xl border border-white/5 flex flex-col items-center shadow-inner">
                                        <div className="text-[10px] text-slate-500 uppercase font-black mb-2">CARGA LIBERADA</div>
                                        <div className="text-4xl font-black text-[#FF3D3D] tracking-tighter">{analysis.estimatedSizeKB} <span className="text-sm">KB</span></div>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-red-950/10 border border-[#FF3D3D]/20 text-center">
                                    <p className="text-[11px] text-slate-300 leading-relaxed font-bold italic">
                                        <i className="fas fa-exclamation-triangle mr-2 text-[#FF3D3D]"></i>
                                        {analysis.description}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] block text-center">ESCRIBA PARA AUTORIZAR IGNICIÓN</label>
                                <input 
                                    type="text" value={confirmPhrase} onChange={e => setConfirmPhrase(e.target.value.toUpperCase())}
                                    placeholder="CONFIRMAR LIMPIEZA"
                                    className="w-full bg-black border-2 border-[#FF3D3D]/30 rounded-2xl py-5 text-center text-white font-mono text-xl focus:border-[#FF3D3D] outline-none placeholder-red-950 uppercase transition-all shadow-[inset_0_0_20px_black]"
                                />
                            </div>

                            <div className="mt-10 flex gap-4">
                                <button onClick={reset} className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all">ABORTAR</button>
                                <button 
                                    onClick={handleExecutePurge}
                                    disabled={confirmPhrase !== 'CONFIRMAR LIMPIEZA'}
                                    className="flex-[2] py-5 bg-[#FF3D3D] hover:bg-white hover:text-[#FF3D3D] text-black rounded-2xl text-[12px] font-black uppercase tracking-[0.4em] shadow-[0_0_30px_#FF3D3D] transition-all flex items-center justify-center gap-4 disabled:opacity-20 disabled:grayscale"
                                >
                                    <i className="fas fa-bolt text-lg"></i> DETONAR PURGA
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'SUCCESS' && (
                        <div className="flex-1 flex flex-col items-center justify-center py-10 animate-in zoom-in-95 duration-500 text-center">
                            <div className="w-24 h-24 bg-[#FF3D3D] rounded-full flex items-center justify-center shadow-[0_0_60px_#FF3D3D] mb-10 relative">
                                <div className="absolute inset-0 bg-[#FF3D3D] rounded-full animate-ping opacity-20"></div>
                                <i className="fas fa-check text-black text-5xl"></i>
                            </div>
                            <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic mb-4">OPTIMIZACIÓN FINALIZADA</h3>
                            <div className="bg-red-950/20 border border-[#FF3D3D]/30 p-6 rounded-3xl min-w-[280px]">
                                <p className="text-[11px] text-[#FF3D3D] uppercase tracking-widest mb-2 font-bold">REGISTROS LIBERADOS</p>
                                <div className="text-5xl font-black text-white drop-shadow-[0_0_20px_rgba(255,61,61,0.5)]">{purgeResult}</div>
                            </div>
                            <button onClick={reset} className="mt-12 px-12 py-5 bg-white text-black hover:bg-[#FF3D3D] transition-all rounded-full text-xs font-black uppercase tracking-widest shadow-2xl active:scale-95">REGRESAR AL NÚCLEO</button>
                        </div>
                    )}

                </div>
                
                {/* FOOTER DE ADVERTENCIA */}
                <div className="px-8 py-6 bg-black border-t border-[#FF3D3D]/20 flex items-center gap-6">
                    <i className="fas fa-shield-virus text-[#FF3D3D] text-xl opacity-60"></i>
                    <p className="text-[10px] text-[#FF3D3D] uppercase tracking-widest leading-relaxed font-black">
                        PROTOCOLO PHRONT MAESTRO: LAS APUESTAS ACTIVAS Y BALANCES ACTUALES ESTÁN BLINDADOS POR EL KERNEL Y NO PUEDEN SER PURGADOS.
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
