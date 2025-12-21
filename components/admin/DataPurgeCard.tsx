// components/admin/DataPurgeCard.tsx
'use client'

import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/services/api';
import { PurgeTarget, PurgeAnalysis } from '@/types';
import AnimatedIconUltra from '../ui/AnimatedIconUltra';

export default function DataPurgeCard() {
    const { user } = useAuthStore();
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
            setView('SELECT');
        }
    };

    const handleExecutePurge = async () => {
        if (!target || !user) return;
        setView('EXECUTING');
        try {
            await new Promise(r => setTimeout(r, 2000));
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
            <div className={`absolute -inset-1 rounded-[2rem] opacity-30 blur-xl animate-pulse bg-red-600`}></div>

            <div className={`relative bg-[#050a14]/90 border-2 border-red-600 shadow-neon-red rounded-[2rem] overflow-hidden flex flex-col min-h-[480px] transition-all duration-700 z-10 backdrop-blur-2xl`}>
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-red-950/30">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center shadow-inner">
                            <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 4, theme: 'neon', size: 0.8 }}>
                                <i className={`fas ${view === 'CONFIRM' ? 'fa-radiation text-red-500' : 'fa-server text-red-500'} text-sm`}></i>
                            </AnimatedIconUltra>
                        </div>
                        <div>
                            <h3 className="text-xs md:text-sm font-display font-black text-white uppercase tracking-[0.2em]">Mantenimiento Forense</h3>
                            <p className="text-[8px] font-mono text-red-400 uppercase tracking-widest">Protocolo de Optimización v4.1</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                    {view === 'SELECT' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                {TARGETS.map(t => (
                                    <button key={t.id} onClick={() => handleSelectTarget(t.id)} className="bg-black/60 border border-white/5 p-5 rounded-2xl hover:border-red-500/50 transition-all text-left">
                                        <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 3.5, theme: 'cyber', size: 1.1 }}>
                                            <i className={`fas ${t.icon} ${t.color} text-2xl mb-3 opacity-60`}></i>
                                        </AnimatedIconUltra>
                                        <div className="text-[10px] font-black text-white uppercase tracking-wider">{t.label}</div>
                                        <div className="text-[8px] text-slate-600 mt-1 uppercase font-bold leading-tight line-clamp-2">{t.desc}</div>
                                    </button>
                                ))}
                            </div>
                            <div className="p-5 rounded-2xl bg-red-950/10 border border-red-900/20">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-[9px] font-black text-red-500 uppercase tracking-widest">Horizonte de Tiempo: {days}d</label>
                                </div>
                                <input type="range" min="7" max="180" value={days} onChange={e => setDays(Number(e.target.value))} className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-red-500" />
                            </div>
                        </div>
                    )}

                    {view === 'ANALYZE' && <div className="flex-1 flex flex-col items-center justify-center py-12 animate-pulse text-white font-display text-xs uppercase tracking-widest">Escaneando Sectores...</div>}

                    {view === 'CONFIRM' && analysis && (
                        <div className="flex-1 flex flex-col">
                            <div className="bg-black/60 border-2 border-red-900/30 rounded-3xl p-6 mb-8 relative overflow-hidden">
                                <div className="flex justify-between items-start mb-6 text-white font-black uppercase text-sm">Reporte de Impacto</div>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-black p-4 rounded-xl border border-white/5 text-center">
                                        <div className="text-[9px] text-slate-500 font-black mb-1">Punteros</div>
                                        <div className="text-3xl font-mono">{analysis.recordCount}</div>
                                    </div>
                                    <div className="bg-black p-4 rounded-xl border border-white/5 text-center">
                                        <div className="text-[9px] text-slate-500 font-black mb-1">Carga</div>
                                        <div className="text-3xl font-mono text-red-500">{analysis.estimatedSizeKB} KB</div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-300 leading-relaxed text-center font-bold italic">{analysis.description}</p>
                            </div>
                            <input type="text" value={confirmPhrase} onChange={e => setConfirmPhrase(e.target.value.toUpperCase())} placeholder={getPhrase()} className="w-full bg-black border-2 border-red-900/50 rounded-2xl py-4 text-center text-white font-mono outline-none" />
                            <div className="mt-8 flex gap-3">
                                <button onClick={reset} className="flex-1 py-4 text-slate-500 uppercase font-black text-[10px]">Abortar</button>
                                <button onClick={handleExecutePurge} disabled={confirmPhrase !== getPhrase()} className="flex-[2] py-4 bg-red-600 text-black rounded-2xl font-black uppercase tracking-widest disabled:opacity-20">DETONAR PURGA</button>
                            </div>
                        </div>
                    )}

                    {view === 'SUCCESS' && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-neon-red mb-6"><i className="fas fa-check text-black text-3xl"></i></div>
                            <h3 className="text-2xl font-display font-black text-white uppercase italic">Optimizado</h3>
                            <div className="mt-4 text-4xl font-mono font-black text-white">{purgeResult} <span className="text-xs">NODOS LIBERADOS</span></div>
                            <button onClick={reset} className="mt-8 px-8 py-3 bg-white text-black rounded-full text-xs font-black uppercase">Regresar</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
