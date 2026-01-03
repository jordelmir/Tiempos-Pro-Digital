
import React, { useMemo } from 'react';
import { DrawTime, DrawResult, UserRole, LotteryRegion } from '../types';
import AnimatedIconUltra from './ui/AnimatedIconUltra';
import PhysicsBallCanvas from './ui/PhysicsBallCanvas';

interface WinningNumberCardProps {
    drawTime: DrawTime;
    results: DrawResult[]; // Cambiado de singular a plural
    role: UserRole;
    region: LotteryRegion;
    onEdit?: () => void;
}

// Fix: Redefined as React.FC to allow 'key' prop in JSX usage without requiring it in the custom props interface.
const WinningNumberCard: React.FC<WinningNumberCardProps> = ({ drawTime, results, role, region, onEdit }) => {
    
    const theme = useMemo(() => {
        if (drawTime.includes('Mediodía')) return {
            color: 'text-cyber-solar',
            border: 'border-cyber-solar',
            icon: 'fa-sun',
            label: 'MEDIODÍA',
            shadow: 'shadow-neon-solar'
        };
        if (drawTime.includes('Tarde')) return {
            color: 'text-cyber-vapor',
            border: 'border-cyber-vapor',
            icon: 'fa-cloud-sun',
            label: 'TARDE',
            shadow: 'shadow-neon-vapor'
        };
        return {
            color: 'text-blue-400',
            border: 'border-blue-600',
            icon: 'fa-moon',
            label: 'NOCHE',
            shadow: 'shadow-neon-blue'
        };
    }, [drawTime]);

    const canEdit = role === UserRole.SuperAdmin || role === UserRole.Vendedor;
    
    // Verificar si algún resultado en este horario es reventado (específicamente TICA)
    const ticaResult = results.find(r => r.region === LotteryRegion.TICA);
    const hasReventado = ticaResult?.isReventado || false;

    return (
        <div className={`relative group overflow-hidden rounded-[2.5rem] md:rounded-[3.5rem] border-2 bg-black/40 backdrop-blur-3xl min-h-[400px] lg:min-h-[500px] flex flex-col transition-all duration-700 hover:scale-[1.02] ${theme.border} ${theme.shadow}`}>
            
            {/* Header HUD */}
            <div className="relative z-10 p-5 md:p-7 flex justify-between items-center border-b border-white/5 bg-black/60">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border border-white/10 bg-black shadow-inner`}>
                        <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 5, theme: 'minimal', size: 0.85 }}>
                            <i className={`fas ${theme.icon} ${theme.color} text-lg md:text-xl`}></i>
                        </AnimatedIconUltra>
                    </div>
                    <div>
                        <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-white/80 block leading-none mb-1.5">{theme.label}</span>
                        <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-cyber-success animate-pulse"></div>
                             <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">MULTINODO_SINC_ACTIVO</span>
                        </div>
                    </div>
                </div>
                <div className={`text-[9px] font-mono px-4 py-2 rounded-full border-2 transition-all ${results.length > 0 ? 'border-cyber-success text-cyber-success bg-cyber-success/5 shadow-neon-green' : 'border-slate-800 text-slate-600 bg-black'}`}>
                    {results.length > 0 ? 'ONLINE' : 'IDLE'}
                </div>
            </div>

            {/* Physics Chamber Container */}
            <div className="relative flex-1 bg-[#02040a] overflow-hidden group-hover:bg-black transition-colors duration-700">
                <div className="absolute inset-0 z-20 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.9)] opacity-70"></div>
                <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60"></div>
                
                <div className="absolute inset-0 z-10">
                    <PhysicsBallCanvas 
                        results={results} 
                        drawTime={drawTime}
                    />
                </div>

                <div className="absolute bottom-6 right-6 z-20 opacity-20 group-hover:opacity-40 transition-opacity text-right">
                    <div className="flex flex-col items-end gap-1.5 font-mono text-[7px] text-white">
                        <span>SCAN_RATE: 60Hz</span>
                        <span>BUFFER_ID: {drawTime.substring(0,3).toUpperCase()}</span>
                        {hasReventado && <span className="text-red-500 font-black tracking-widest">CR_FIRE_MODE: ACTIVE</span>}
                    </div>
                </div>
            </div>

            {canEdit && (
                <button 
                    onClick={onEdit}
                    className="absolute bottom-6 left-6 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/5 hover:bg-cyber-neon hover:text-black p-3.5 rounded-2xl border border-white/10 text-white z-40 shadow-2xl backdrop-blur-md"
                >
                    <i className="fas fa-terminal text-xs"></i>
                </button>
            )}
            
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03] z-50">
                <div className="w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>
            </div>
        </div>
    );
};

export default WinningNumberCard;
