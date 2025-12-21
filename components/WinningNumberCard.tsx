import React, { useEffect, useState } from 'react';
import { DrawTime, DrawResult, UserRole } from '../types';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

interface WinningNumberCardProps {
    drawTime: DrawTime;
    result?: DrawResult;
    role: UserRole;
    onEdit?: () => void;
}

export default function WinningNumberCard({ drawTime, result, role, onEdit }: WinningNumberCardProps) {
    const [prevNumber, setPrevNumber] = useState<string>('--');
    const [displayNumber, setDisplayNumber] = useState<string>('--');
    const [isSpinning, setIsSpinning] = useState(false);

    // THEME ENGINE
    const getTheme = () => {
        if (drawTime.includes('Mediodía')) return {
            name: 'solar',
            borderColor: 'border-cyber-solar',
            shadow: 'shadow-[0_0_30px_#ff5f00,inset_0_0_15px_rgba(255,95,0,0.5)]',
            textColor: 'text-cyber-solar',
            bgHex: '#0c0400',
            ballBg: 'bg-[#1a0500]',
            icon: 'fa-sun',
            label: 'MEDIODÍA',
            cardBorder: 'border-cyber-solar',
            cardShadow: 'shadow-[0_0_20px_rgba(255,95,0,0.3)]'
        };
        if (drawTime.includes('Tarde')) return {
            name: 'vapor',
            borderColor: 'border-cyber-vapor',
            shadow: 'shadow-[0_0_30px_#7c3aed,inset_0_0_15px_rgba(124,58,237,0.5)]',
            textColor: 'text-cyber-vapor',
            bgHex: '#05020c',
            ballBg: 'bg-[#0a021a]',
            icon: 'fa-cloud-sun',
            label: 'TARDE',
            cardBorder: 'border-cyber-vapor',
            cardShadow: 'shadow-[0_0_20px_rgba(124,58,237,0.3)]'
        };
        return {
            name: 'abyss',
            borderColor: 'border-blue-600',
            shadow: 'shadow-[0_0_30px_#2563eb,inset_0_0_15px_rgba(37,99,235,0.5)]',
            textColor: 'text-blue-400',
            bgHex: '#02040a',
            ballBg: 'bg-[#02041a]',
            icon: 'fa-moon',
            label: 'NOCHE',
            cardBorder: 'border-blue-600',
            cardShadow: 'shadow-[0_0_20px_rgba(37,99,235,0.3)]'
        };
    };

    const theme = getTheme();

    // SLOT MACHINE LOGIC
    useEffect(() => {
        if (result?.winningNumber && result.winningNumber !== prevNumber) {
            setIsSpinning(true);
            setPrevNumber(result.winningNumber);
            
            let steps = 0;
            const maxSteps = 25; 
            const interval = setInterval(() => {
                steps++;
                setDisplayNumber(Math.floor(Math.random() * 100).toString().padStart(2, '0'));
                if (steps >= maxSteps) {
                    clearInterval(interval);
                    setDisplayNumber(result.winningNumber);
                    setIsSpinning(false);
                }
            }, 60);
            return () => clearInterval(interval);
        } else if (!result || result.winningNumber === '--') {
            setDisplayNumber('--');
        } else {
            setDisplayNumber(result.winningNumber);
        }
    }, [result?.winningNumber]);

    const canEdit = role === UserRole.SuperAdmin || role === UserRole.Vendedor;
    const isReventado = result?.isReventado;

    return (
        <div className={`relative group overflow-hidden rounded-3xl border-2 transition-all duration-500 hover:scale-[1.02] h-80 flex flex-col ${theme.cardBorder} ${theme.cardShadow}`}
             style={{ backgroundColor: theme.bgHex }}
        >
            <div className={`absolute -inset-1 ${isReventado ? 'bg-red-600' : theme.textColor.replace('text-', 'bg-')} opacity-5 blur-xl animate-pulse`}></div>

            <div className="relative z-10 p-4 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 5, size: 0.85, theme: 'minimal' }}>
                        <i className={`fas ${theme.icon} ${theme.textColor} text-sm`}></i>
                    </AnimatedIconUltra>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{theme.label}</span>
                </div>
                <div className={`text-[8px] font-mono px-2 py-0.5 rounded border ${result?.status === 'CLOSED' ? 'border-green-900 text-green-500 bg-green-900/20' : 'border-slate-800 text-slate-600'}`}>
                    {result?.status === 'CLOSED' ? 'OFICIAL' : 'ESPERANDO'}
                </div>
            </div>

            <div className="relative z-10 flex-1 flex items-center justify-center overflow-hidden p-4">
                
                {isReventado ? (
                    <div className="relative w-64 h-64 flex items-center justify-center">
                        <div className="relative z-30 w-28 h-28 rounded-full bg-[#1a0000] border-4 border-red-600 shadow-[0_0_60px_#ff0000,inset_0_0_20px_rgba(255,0,0,0.5)] flex items-center justify-center animate-pulse">
                            <div className="flex flex-col items-center">
                                <span className="font-mono font-black text-4xl text-white drop-shadow-[0_0_15px_#ff0000]">
                                    {result.reventadoNumber || 'R'}
                                </span>
                                <span className="text-[8px] font-black text-red-400 uppercase tracking-widest bg-red-950/80 px-2 py-0.5 rounded mt-1 border border-red-500/30">REV</span>
                            </div>
                        </div>

                        <div className="absolute w-44 h-44 rounded-full border-2 border-dashed border-white/10 animate-[spin_25s_linear_infinite]"></div>

                        <div className="absolute w-48 h-48 animate-[spin_7s_linear_infinite] z-40">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16">
                                <div className="w-full h-full animate-[spin_7s_linear_infinite_reverse]">
                                    <div className={`w-full h-full rounded-full ${theme.ballBg} border-2 ${theme.borderColor} ${theme.shadow} flex items-center justify-center relative shadow-[0_0_30px_rgba(0,240,255,0.3)]`}>
                                        <div className="absolute top-1 left-2 w-4 h-2 bg-white opacity-20 blur-sm rounded-full"></div>
                                        <span className={`font-mono font-black text-xl drop-shadow-[0_0_10px_rgba(52,211,153,0.8)] ${isSpinning ? 'text-white blur-[1px]' : 'text-emerald-400'}`}>
                                            {displayNumber}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={`
                        relative rounded-full flex items-center justify-center border-[5px] transition-all duration-700
                        ${theme.borderColor} ${theme.shadow} ${theme.ballBg}
                        w-40 h-40
                    `}>
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                        <div className="absolute top-5 left-8 w-10 h-6 bg-white opacity-10 blur-lg rounded-full"></div>

                        <span className={`font-mono font-black tracking-tighter text-7xl drop-shadow-[0_0_25px_rgba(16,185,129,0.7)] ${isSpinning ? 'blur-md scale-110 text-white' : 'scale-100 text-emerald-400'} transition-all duration-100`}>
                            {displayNumber}
                        </span>
                    </div>
                )}

            </div>

            {canEdit && (
                <button 
                    onClick={onEdit}
                    className="absolute bottom-4 right-4 opacity-30 hover:opacity-100 transition-opacity bg-black/40 p-2 rounded-lg border border-white/10 hover:bg-white/5 hover:border-white/30 text-white z-50 group-hover:opacity-100"
                >
                    <i className="fas fa-cog text-xs animate-[spin_4s_linear_infinite]"></i>
                </button>
            )}
        </div>
    );
}
