// components/admin/AdminResultControl.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DrawTime } from '@/types';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import AnimatedIconUltra from '../ui/AnimatedIconUltra';
import MatrixRain from '../ui/MatrixRain';

interface AdminResultControlProps {
    isOpen: boolean;
    onClose: () => void;
    onPublishSuccess?: (data: any) => void;
    initialDraw?: DrawTime | null;
}

export default function AdminResultControl({ isOpen, onClose, onPublishSuccess, initialDraw }: AdminResultControlProps) {
    useBodyScrollLock(isOpen);

    const user = useAuthStore(s => s.user);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedDraw, setSelectedDraw] = useState<DrawTime>(DrawTime.NOCHE);
    const [winningNumber, setWinningNumber] = useState('');
    const [reventadoNumber, setReventadoNumber] = useState('');
    const [isReventado, setIsReventado] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [charging, setCharging] = useState(false);
    const [progress, setProgress] = useState(0);

    const theme = useMemo(() => {
        switch (selectedDraw) {
            case DrawTime.MEDIODIA: return {
                name: 'solar', color: 'text-orange-500', border: 'border-orange-500', bgHex: 'bg-[#0c0400]',
                matrixHex: '#ff5f00', shadow: 'shadow-neon-orange', glow: 'bg-orange-600', textGlow: 'drop-shadow-[0_0_15px_#ff5f00]'
            };
            case DrawTime.TARDE: return {
                name: 'vapor', color: 'text-purple-500', border: 'border-purple-500', bgHex: 'bg-[#05020c]',
                matrixHex: '#7c3aed', shadow: 'shadow-neon-purple', glow: 'bg-purple-600', textGlow: 'drop-shadow-[0_0_15px_#7c3aed]'
            };
            default: return {
                name: 'abyss', color: 'text-blue-500', border: 'border-blue-500', bgHex: 'bg-[#02040a]',
                matrixHex: '#2563eb', shadow: 'shadow-neon-blue', glow: 'bg-blue-600', textGlow: 'drop-shadow-[0_0_15px_#2563eb]'
            };
        }
    }, [selectedDraw]);

    useEffect(() => {
        if (isOpen) {
            setWinningNumber('');
            setReventadoNumber('');
            setIsReventado(false);
            setSuccess(false);
            setLoading(false);
            setProgress(0);
            if (initialDraw) setSelectedDraw(initialDraw);
        }
    }, [isOpen, initialDraw]);

    useEffect(() => {
        let interval: any;
        if (charging && progress < 100) {
            interval = setInterval(() => setProgress(p => p + 5), 100);
        } else if (progress === 100 && !loading && !success) {
            handleExecute();
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [charging, progress]);

    const handleExecute = async () => {
        setLoading(true);
        try {
            const res = await api.publishDrawResult({
                date, drawTime: selectedDraw, winningNumber, isReventado,
                reventadoNumber: isReventado ? reventadoNumber : undefined,
                actor_id: user!.id
            });
            if (!res.error) {
                setSuccess(true);
                setTimeout(() => onClose(), 2000);
            } else {
                alert(res.error);
                setLoading(false);
                setProgress(0);
                setCharging(false);
            }
        } catch (e) {
            setLoading(false);
        }
    };

    if (!isOpen || !user) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 font-sans overflow-hidden">
            <MatrixRain colorHex={theme.matrixHex} opacity={0.1} />
            <div className={`relative z-10 w-full max-w-4xl h-full md:h-auto bg-black border-4 ${theme.border} rounded-[2rem] flex flex-col md:flex-row overflow-hidden shadow-2xl`}>
                <div className="w-full md:w-1/3 p-8 border-b md:border-b-0 md:border-r border-white/10 flex flex-col">
                    <h2 className="text-xl font-black text-white uppercase tracking-widest mb-8">Gestión <span className={theme.color}>Sorteo</span></h2>
                    <div className="space-y-3 mb-8">
                        {Object.values(DrawTime).map(t => (
                            <button key={t} onClick={() => setSelectedDraw(t)} className={`w-full p-4 rounded-xl text-left border-2 transition-all ${selectedDraw === t ? `${theme.border} bg-white/5 text-white` : 'border-white/5 text-slate-500'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-black border-2 border-white/10 rounded-xl p-4 text-white font-mono" />
                </div>
                <div className="flex-1 p-12 flex flex-col items-center justify-center bg-black/50">
                    <div className="w-full max-w-xs space-y-8">
                        <div className="text-center">
                            <label className={`text-xs font-black uppercase tracking-[0.4em] ${theme.color} mb-4 block`}>Ganador</label>
                            <input type="text" maxLength={2} value={winningNumber} onChange={e => setWinningNumber(e.target.value.replace(/[^0-9]/g, ''))} className={`w-full bg-transparent text-9xl font-mono font-black text-white text-center focus:outline-none placeholder-white/5 ${theme.textGlow}`} placeholder="00" />
                        </div>
                        {isReventado && (
                            <div className="animate-in slide-in-from-top-4">
                                <input type="text" maxLength={2} value={reventadoNumber} onChange={e => setReventadoNumber(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-red-950/20 border-2 border-red-600 rounded-3xl p-8 text-6xl text-center text-white font-mono" placeholder="--" />
                            </div>
                        )}
                        <button onClick={() => setIsReventado(!isReventado)} className={`w-full flex justify-between items-center p-4 rounded-2xl border-2 transition-all ${isReventado ? 'border-red-600 text-red-500' : 'border-white/10 text-white/40'}`}>
                            <span>Módulo Reventado</span>
                            <div className={`w-10 h-5 rounded-full relative ${isReventado ? 'bg-red-600' : 'bg-white/10'}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isReventado ? 'right-0.5' : 'left-0.5'}`} /></div>
                        </button>
                        <div onMouseDown={() => setCharging(true)} onMouseUp={() => setCharging(false)} className={`relative w-full h-20 rounded-3xl bg-black border-4 ${theme.border} overflow-hidden cursor-pointer`}>
                            <div className={`h-full ${theme.glow} transition-all duration-75`} style={{ width: `${progress}%` }} />
                            <div className="absolute inset-0 flex items-center justify-center font-black uppercase tracking-widest text-xs text-white">
                                {loading ? 'Sincronizando...' : success ? 'Datos Inyectados' : 'Mantener para Publicar'}
                            </div>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="absolute top-6 right-6 text-white/20 hover:text-white transition-all"><i className="fas fa-times text-2xl" /></button>
            </div>
        </div>,
        document.body
    );
}
