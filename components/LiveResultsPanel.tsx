
import React, { useState } from 'react';
import { useLiveResults } from '../hooks/useLiveResults';
import { DrawTime, UserRole } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import WinningNumberCard from './WinningNumberCard';
import AdminResultControl from './AdminResultControl'; 

export default function LiveResultsPanel() {
    const { user } = useAuthStore();
    const { getResultByDraw, loading, isOffline } = useLiveResults();
    const [editDraw, setEditDraw] = useState<DrawTime | null>(null);

    // --- THEME ENGINE FOR ROLE BADGE ---
    const getRoleTheme = () => {
        switch (user?.role) {
            case UserRole.SuperAdmin:
                return 'border-cyber-emerald text-cyber-emerald bg-emerald-950/30 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
            case UserRole.Vendedor:
                return 'border-cyber-purple text-cyber-purple bg-purple-950/30 shadow-[0_0_20px_rgba(188,19,254,0.4)]';
            case UserRole.Cliente:
            default:
                // Using Neon Cyan for Players (High Contrast)
                return 'border-cyber-neon text-cyber-neon bg-cyan-950/30 shadow-[0_0_20px_rgba(0,240,255,0.4)]';
        }
    };

    return (
        <div className="relative w-full group">
            <AdminResultControl 
                isOpen={!!editDraw} 
                onClose={() => setEditDraw(null)} 
                initialDraw={editDraw}
            />

            {/* --- CORE BACKLIGHT (Adaptive to Role) --- */}
            <div className={`absolute -inset-1 rounded-[2.5rem] opacity-30 blur-2xl animate-pulse transition-all duration-1000 group-hover:opacity-50 group-hover:blur-3xl ${
                user?.role === UserRole.Vendedor ? 'bg-cyber-purple' : 
                user?.role === UserRole.Cliente ? 'bg-cyber-neon' : 'bg-cyber-emerald'
            }`}></div>

            {/* MAIN CONTAINER (Solid Core) */}
            <div className={`relative w-full bg-[#050a14] border rounded-3xl p-6 md:p-8 overflow-hidden z-10 transition-colors duration-500 ${
                user?.role === UserRole.Vendedor ? 'border-cyber-purple/40 shadow-[0_0_50px_rgba(188,19,254,0.1)]' : 
                user?.role === UserRole.Cliente ? 'border-cyber-neon/40 shadow-[0_0_50px_rgba(0,240,255,0.1)]' : 'border-cyber-emerald/40 shadow-[0_0_50px_rgba(16,185,129,0.1)]'
            }`}>
                
                {/* Background Matrix Scanline */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_50%,transparent_50%)] bg-[length:100%_4px] pointer-events-none opacity-30"></div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 relative z-10">
                    <div>
                        <h2 className="text-2xl font-display font-black text-white uppercase tracking-widest flex items-center gap-3 drop-shadow-lg">
                            <i className={`fas fa-broadcast-tower animate-pulse drop-shadow-[0_0_10px_currentColor] ${
                                user?.role === UserRole.Vendedor ? 'text-cyber-purple' : 
                                user?.role === UserRole.Cliente ? 'text-cyber-neon' : 'text-cyber-emerald'
                            }`}></i>
                            Resultados <span className={`text-transparent bg-clip-text bg-gradient-to-r ${
                                user?.role === UserRole.Vendedor ? 'from-white via-purple-200 to-purple-500' : 
                                user?.role === UserRole.Cliente ? 'from-white via-cyan-200 to-cyan-500' : 'from-white via-emerald-200 to-emerald-500'
                            }`}>En Vivo</span>
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-red-500 animate-bounce' : 'bg-cyber-success shadow-[0_0_5px_#0aff60] animate-ping'}`}></div>
                            <span className={`text-[9px] font-mono uppercase tracking-widest font-bold ${isOffline ? 'text-red-500' : 'text-slate-500'}`}>
                                {isOffline ? 'ENLACE PERDIDO' : 'SEÑAL SATELITAL SEGURA'}
                            </span>
                        </div>
                    </div>
                    
                    {/* Role Badge - DYNAMIC THEME */}
                    <div className={`px-6 py-2 rounded-lg border-2 text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-md transition-all duration-500 flex items-center gap-2 ${getRoleTheme()}`}>
                        <i className="fas fa-eye opacity-70"></i>
                        VISTA: {user?.role === UserRole.SuperAdmin ? 'ADMIN' : user?.role}
                    </div>
                </div>

                {loading ? (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-500 font-mono animate-pulse gap-4">
                        <i className="fas fa-circle-notch fa-spin text-3xl"></i>
                        <span className="tracking-widest text-xs">SINTONIZANDO FRECUENCIA...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                        <WinningNumberCard 
                            drawTime={DrawTime.MEDIODIA} 
                            result={getResultByDraw(DrawTime.MEDIODIA)} 
                            role={user?.role || UserRole.Cliente}
                            onEdit={() => setEditDraw(DrawTime.MEDIODIA)}
                        />
                        <WinningNumberCard 
                            drawTime={DrawTime.TARDE} 
                            result={getResultByDraw(DrawTime.TARDE)} 
                            role={user?.role || UserRole.Cliente}
                            onEdit={() => setEditDraw(DrawTime.TARDE)}
                        />
                        <WinningNumberCard 
                            drawTime={DrawTime.NOCHE} 
                            result={getResultByDraw(DrawTime.NOCHE)} 
                            role={user?.role || UserRole.Cliente}
                            onEdit={() => setEditDraw(DrawTime.NOCHE)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
