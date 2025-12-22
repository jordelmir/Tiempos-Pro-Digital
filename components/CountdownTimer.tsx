
import React, { useMemo } from 'react';
import { useServerClock } from '../hooks/useServerClock';
import { UserRole } from '../types';

interface CountdownTimerProps {
    role: UserRole;
}

export default function CountdownTimer({ role }: CountdownTimerProps) {
    const { serverTime, nextDraw, timeRemaining, status, isOffline, loading } = useServerClock();

    // Format helper
    const formatTime = (ms: number) => {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / 1000 / 60) % 60);
        const hours = Math.floor((ms / 1000 / 3600));
        return {
            h: hours.toString().padStart(2, '0'),
            m: minutes.toString().padStart(2, '0'),
            s: seconds.toString().padStart(2, '0')
        };
    };

    const timeObj = formatTime(timeRemaining);

    // --- THEME ENGINE ---
    const theme = useMemo(() => {
        if (status === 'CLOSED') return {
            color: 'text-red-500',
            border: 'border-red-600',
            shadow: 'shadow-[0_0_30px_rgba(220,38,38,0.5)]',
            bg: 'bg-red-950/40',
            stroke: '#ef4444',
            label: 'BLOQUEO ACTIVO',
            icon: 'fa-lock'
        };
        if (status === 'WARNING') return {
            color: 'text-yellow-400',
            border: 'border-yellow-500',
            shadow: 'shadow-[0_0_30px_rgba(234,179,8,0.5)]',
            bg: 'bg-yellow-950/40',
            stroke: '#eab308',
            label: 'CIERRE INMINENTE',
            icon: 'fa-exclamation-triangle'
        };
        // OPEN
        return {
            color: 'text-cyber-success',
            border: 'border-cyber-success',
            shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.4)]',
            bg: 'bg-emerald-950/30',
            stroke: '#10b981',
            label: 'SISTEMA ACTIVO',
            icon: 'fa-clock'
        };
    }, [status]);

    // SVG Config
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const maxWindow = 60 * 60 * 1000; // 1 Hour context
    const progress = Math.min(timeRemaining / maxWindow, 1);
    const offset = circumference - (progress * circumference);

    return (
        <div className={`relative group h-full min-h-[180px] overflow-hidden rounded-3xl bg-[#02040a] border-2 transition-all duration-700 ${theme.border} ${theme.shadow}`}>

            {/* --- REACTOR CORE BACKLIGHT --- */}
            <div className={`absolute top-1/2 -translate-y-1/2 right-0 w-1/2 h-full opacity-20 blur-[60px] animate-pulse transition-colors duration-1000 ${theme.bg.replace('/40', '').replace('950', '600')}`}></div>

            {/* Grid Texture */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:20px_20px] pointer-events-none"></div>

            <div className="relative z-10 flex h-full p-6">

                {/* --- LEFT: TELEMETRY DATA --- */}
                <div className="flex-1 flex flex-col justify-between">

                    {/* Status Badge */}
                    <div>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-black/60 backdrop-blur-sm mb-4 transition-all duration-500 ${theme.border} ${theme.color}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${status === 'WARNING' ? 'animate-ping' : 'animate-pulse'} bg-current`}></div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] leading-none pt-0.5">{theme.label}</span>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Próximo Ciclo</div>
                            <h3 className="text-xl font-display font-black text-white uppercase tracking-wider drop-shadow-md">
                                {nextDraw ? nextDraw.split(' ')[0] : '---'}
                            </h3>
                        </div>
                    </div>

                    {/* Server Time Sync */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm">
                        <div className={`w-8 h-8 rounded-lg bg-black flex items-center justify-center border border-white/10 ${theme.color}`}>
                            <i className="fas fa-server text-xs"></i>
                        </div>
                        <div>
                            <div className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Sincronización</div>
                            <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                                {serverTime.toLocaleTimeString()}
                                {isOffline && <span className="text-[8px] bg-red-500 text-black px-1 rounded font-bold animate-pulse">OFF</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT: CHRONOMETRIC REACTOR --- */}
                <div className="w-32 md:w-40 relative flex items-center justify-center">

                    {/* The Reactor SVG */}
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 200 200">
                        <defs>
                            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={theme.stroke} stopOpacity="1" />
                                <stop offset="100%" stopColor="#fff" stopOpacity="0.5" />
                            </linearGradient>
                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Outer Static Ring */}
                        <circle cx="100" cy="100" r="90" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />

                        {/* Rotating Dashed Ring (Slow) */}
                        <g className="origin-center animate-[spin_10s_linear_infinite]">
                            <circle cx="100" cy="100" r="82" fill="none" stroke={theme.stroke} strokeWidth="2" strokeOpacity="0.2" strokeDasharray="10 30" />
                        </g>

                        {/* Counter-Rotating Inner Ring (Fast) */}
                        <g className="origin-center animate-[spin_3s_linear_infinite_reverse]">
                            <circle cx="100" cy="100" r="70" fill="none" stroke={theme.stroke} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="2 8" />
                        </g>

                        {/* MAIN PROGRESS ARC */}
                        {status !== 'CLOSED' && (
                            <circle
                                cx="100" cy="100" r={radius}
                                fill="none"
                                stroke="url(#progressGradient)"
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                filter="url(#glow)"
                                transform="rotate(-90 100 100)"
                                className="transition-all duration-1000 ease-linear"
                            />
                        )}

                        {/* Center Hub */}
                        <circle cx="100" cy="100" r="55" fill="#050a14" stroke={theme.stroke} strokeWidth="2" strokeOpacity="0.5" />
                    </svg>

                    {/* DIGITAL READOUT OVERLAY */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                        {loading ? (
                            <i className={`fas fa-circle-notch fa-spin text-2xl ${theme.color}`}></i>
                        ) : status === 'CLOSED' ? (
                            <div className="flex flex-col items-center animate-in zoom-in duration-300">
                                <i className="fas fa-lock text-3xl text-red-500 mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"></i>
                                <span className="text-[10px] font-black text-red-500 tracking-widest">LOCKED</span>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className={`text-2xl font-mono font-black tracking-tighter leading-none ${theme.color} drop-shadow-[0_0_10px_currentColor]`}>
                                    {timeObj.h}:{timeObj.m}
                                </div>
                                <div className={`text-lg font-mono font-bold leading-none mt-1 opacity-80 ${theme.color}`}>
                                    {timeObj.s}
                                </div>
                                <div className="text-[7px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">
                                    T-MINUS
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
