
import React, { useMemo } from 'react';
import { DrawTime, DrawResult, UserRole, LotteryRegion } from '../types';
import AnimatedIconUltra from './ui/AnimatedIconUltra';
import PhysicsBallCanvas from './ui/PhysicsBallCanvas';

interface WinningNumberCardProps {
    drawTime: DrawTime;
    results: DrawResult[]; 
    role: UserRole;
    region: LotteryRegion;
    onEdit?: () => void;
}

const WinningNumberCard: React.FC<WinningNumberCardProps> = ({ drawTime, results, role, region, onEdit }) => {
    
    const theme = useMemo(() => {
        if (drawTime.includes('Mediodía')) return {
            color: 'text-cyber-solar',
            border: 'border-cyber-solar/40',
            icon: 'fa-sun',
            label: 'MEDIODÍA',
            shadow: 'shadow-[0_0_50px_rgba(255,95,0,0.2)]',
            glassBg: 'bg-cyber-solar/5',
            glowColor: '#ff5f00',
            glowClass: 'bg-cyber-solar/20'
        };
        if (drawTime.includes('Tarde')) return {
            color: 'text-cyber-vapor',
            border: 'border-cyber-vapor/40',
            icon: 'fa-cloud-sun',
            label: 'TARDE',
            shadow: 'shadow-[0_0_50px_rgba(124,58,237,0.2)]',
            glassBg: 'bg-cyber-vapor/5',
            glowColor: '#7c3aed',
            glowClass: 'bg-cyber-vapor/20'
        };
        return {
            color: 'text-cyber-blue',
            border: 'border-cyber-blue/40',
            icon: 'fa-moon',
            label: 'NOCHE',
            shadow: 'shadow-[0_0_50px_rgba(0,209,255,0.2)]',
            glassBg: 'bg-cyber-blue/5',
            glowColor: '#00D1FF',
            glowClass: 'bg-cyber-blue/20'
        };
    }, [drawTime]);

    const canEdit = role === UserRole.SuperAdmin || role === UserRole.Vendedor;
    const ticaResult = results.find(r => r.region === LotteryRegion.TICA);
    const hasReventado = ticaResult?.isReventado || false;

    return (
        <div className="relative group">
            <div className={`absolute -inset-4 ${theme.glowClass} rounded-[3.5rem] blur-3xl animate-pulse transition-all duration-1000 opacity-20`}></div>
            <div className={`relative group overflow-hidden rounded-[2.5rem] md:rounded-[3.5rem] border-2 backdrop-blur-2xl min-h-[400px] lg:min-h-[500px] flex flex-col transition-all duration-700 hover:scale-[1.03] z-10 ${theme.border} ${theme.glassBg} ${theme.shadow}`}>
                
                {/* Capas de Reflejo de Vidrio */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none z-20"></div>
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent z-30"></div>
                <div className="absolute inset-0 carbon-texture opacity-5 pointer-events-none"></div>

                {/* Header HUD - Estilo Glass-Bar */}
                <div className="relative z-30 p-5 md:p-7 flex justify-between items-center border-b border-white/10 bg-black/40 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border-2 border-white/10 bg-black/60 shadow-inner overflow-hidden`}>
                            <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 5, theme: 'minimal', size: 0.85 }}>
                                <i className={`fas ${theme.icon} ${theme.color} text-lg md:text-xl`}></i>
                            </AnimatedIconUltra>
                        </div>
                        <div>
                            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-white/90 block leading-none mb-1.5">{theme.label}</span>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse`} style={{ backgroundColor: theme.glowColor, boxShadow: `0 0 10px ${theme.glowColor}` }}></div>
                                <span className="text-[8px] font-mono text-slate-400 uppercase tracking-[0.2em] font-bold">CORE_SYNC_OK</span>
                            </div>
                        </div>
                    </div>
                    <div className={`text-[9px] font-mono px-4 py-2 rounded-full border-2 transition-all ${results.length > 0 ? 'border-cyber-success/50 text-cyber-success bg-cyber-success/10 shadow-[0_0_20px_rgba(0,255,148,0.2)]' : 'border-slate-800 text-slate-600 bg-black/40'}`}>
                        {results.length > 0 ? 'STREAMING' : 'STANDBY'}
                    </div>
                </div>

                {/* Physics Chamber - El reactor de las pelotas */}
                <div className="relative flex-1 bg-gradient-to-b from-black/60 to-black/20 overflow-hidden">
                    <div className="absolute inset-0 z-20 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] opacity-90"></div>
                    
                    {/* Reflejos laterales de cristal */}
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-white/5 z-20"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-px bg-white/5 z-20"></div>

                    <div className="absolute inset-0 z-10">
                        <PhysicsBallCanvas 
                            results={results} 
                            drawTime={drawTime}
                        />
                    </div>

                    <div className="absolute bottom-6 right-8 z-30 opacity-40 group-hover:opacity-100 transition-opacity text-right">
                        <div className="flex flex-col items-end gap-1 font-mono text-[7px] text-white">
                            <span className="flex items-center gap-2"><i className="fas fa-microchip text-[8px]"></i> PROC_ID: {drawTime.split(' ')[0].toUpperCase()}</span>
                            {hasReventado && <span className="text-red-500 font-black tracking-widest animate-pulse">CR_FIRE_ALERT_200X</span>}
                        </div>
                    </div>
                </div>

                {canEdit && (
                    <button 
                        onClick={onEdit}
                        className="absolute bottom-6 left-8 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/10 hover:bg-white hover:text-black p-3.5 rounded-2xl border border-white/20 text-white z-40 shadow-2xl backdrop-blur-xl"
                    >
                        <i className="fas fa-terminal text-xs"></i>
                    </button>
                )}
                
                {/* Efecto de Escaneo Electromagnético */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.05] z-50">
                    <div className="w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,255,255,0.05),transparent,rgba(255,255,255,0.05))] bg-[length:100%_4px,30%_100%]"></div>
                </div>
            </div>
        </div>
    );
};

export default WinningNumberCard;
