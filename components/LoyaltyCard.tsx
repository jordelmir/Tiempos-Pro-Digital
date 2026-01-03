
import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { formatCurrency } from '../constants';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

export default function LoyaltyCard() {
    const { user, fetchUser } = useAuthStore();
    const [loading, setLoading] = useState(false);

    if (!user) return null;

    const points = user.loyalty_points || 0;
    const threshold = 20000;
    const canRedeem = points >= threshold;
    const progress = Math.min((points / threshold) * 100, 100);

    const handleRedeem = async () => {
        if (!canRedeem || loading) return;
        setLoading(true);
        try {
            const res = await api.redeemLoyaltyPoints(user.id);
            if (res.error) {
                alert(res.error);
            } else {
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                alert(`Protocolo de Liquidez: ₡100 acreditados correctamente.`);
                await fetchUser(true);
            }
        } catch (e) {
            alert("Error en protocolo de canje");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative group overflow-hidden bg-[#050a14]/95 border-[4px] border-white/10 rounded-[4rem] p-10 md:p-12 shadow-[0_0_100px_rgba(0,0,0,0.9)] transition-all hover:border-cyber-purple/40 animate-in slide-in-from-top-12 duration-1000">
            
            <div className={`absolute -top-40 -right-40 w-96 h-96 blur-[150px] rounded-full transition-colors duration-[2000ms] ${canRedeem ? 'bg-cyber-purple/30' : 'bg-cyber-blue/10 animate-pulse'}`}></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

            <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10">
                
                <div className="relative w-64 h-64 flex-shrink-0">
                    <div className={`absolute inset-0 rounded-full border-4 border-dashed border-white/5 animate-[spin_20s_linear_infinite] opacity-40`}></div>
                    <div className={`absolute inset-4 rounded-full border-[6px] border-double ${canRedeem ? 'border-cyber-purple shadow-neon-purple' : 'border-cyber-blue opacity-30'} animate-[spin_10s_linear_infinite_reverse]`}></div>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Core_Sync</div>
                        <div className={`text-6xl font-mono font-black tracking-tighter ${canRedeem ? 'text-cyber-purple text-glow-purple' : 'text-cyber-blue'}`}>
                            {Math.floor(progress)}%
                        </div>
                        <div className="w-20 h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${canRedeem ? 'bg-cyber-purple shadow-neon-purple' : 'bg-cyber-blue'}`} style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    <div className={`absolute inset-8 rounded-full blur-3xl opacity-20 animate-pulse ${canRedeem ? 'bg-cyber-purple' : 'bg-cyber-blue'}`}></div>
                </div>

                <div className="flex-1 space-y-8 text-center lg:text-left">
                    <div className="flex flex-col lg:flex-row lg:items-end gap-6 border-b border-white/10 pb-8">
                        <div className="w-20 h-20 rounded-3xl bg-black border-2 border-cyber-purple flex items-center justify-center shadow-neon-purple mx-auto lg:mx-0 group-hover:scale-110 transition-transform">
                            <AnimatedIconUltra profile={{ animation: 'spin3d', theme: 'neon', speed: 4 }}>
                                <i className="fas fa-fingerprint text-cyber-purple text-4xl"></i>
                            </AnimatedIconUltra>
                        </div>
                        <div>
                            <h3 className="text-xs font-mono font-black text-cyber-purple uppercase tracking-[0.6em] mb-2">OPERADOR_ACTIVO</h3>
                            <p className="text-4xl md:text-5xl font-display font-black text-slate-100 uppercase tracking-tighter text-shadow-sm">
                                {user.name}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div>
                            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.5em] font-black block mb-4">Patrimonio Global</span>
                            <div className="flex items-baseline gap-4 justify-center lg:justify-start">
                                <span className="text-3xl font-display text-cyber-neon font-black drop-shadow-sm">₡</span>
                                <span className="text-6xl font-display font-black text-slate-100 tracking-tighter text-shadow-sm">
                                    {formatCurrency(user.balance_bigint).replace('₡', '').trim()}
                                </span>
                            </div>
                        </div>
                        <div>
                            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.5em] font-black block mb-4">SIPR_ACCUMULATOR</span>
                            <div className="flex items-center gap-5 justify-center lg:justify-start">
                                <i className="fas fa-atom text-cyber-purple animate-spin-slow text-3xl"></i>
                                <span className="text-6xl font-mono font-black text-cyber-purple text-glow-purple drop-shadow-sm">
                                    {points.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-80 space-y-6">
                    <div className="bg-black/40 border-2 border-white/5 rounded-[2.5rem] p-8 text-center backdrop-blur-md">
                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-6 font-black">Protocolo de Liquidez</div>
                        
                        <button 
                            onClick={handleRedeem}
                            disabled={!canRedeem || loading}
                            className={`w-full py-8 rounded-[2rem] font-display font-black text-base uppercase tracking-[0.5em] transition-all relative overflow-hidden group/btn
                                ${canRedeem 
                                    ? 'bg-cyber-purple text-black shadow-[0_0_60px_rgba(188,19,254,0.6)] hover:bg-white hover:scale-[1.05] active:scale-95 cursor-pointer' 
                                    : 'bg-white/5 text-slate-800 border-2 border-white/5 cursor-not-allowed'}
                            `}
                        >
                            {canRedeem && (
                                <div className="absolute inset-0 bg-white/50 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-[1000ms] skew-x-12"></div>
                            )}
                            
                            <div className="relative z-10 flex flex-col items-center gap-3">
                                {loading ? (
                                    <i className="fas fa-sync fa-spin text-3xl"></i>
                                ) : (
                                    <>
                                        <i className={`fas ${canRedeem ? 'fa-bolt animate-bounce' : 'fa-lock'} text-3xl`}></i>
                                        <span>{canRedeem ? 'LIQUIDAR' : 'BLOQUEADO'}</span>
                                    </>
                                )}
                            </div>
                        </button>
                        
                        <div className="mt-6 flex items-center justify-center gap-4 text-[9px] font-mono text-slate-500 uppercase tracking-widest font-black">
                            <span>{points.toLocaleString()}</span>
                            <div className="h-px w-12 bg-white/10"></div>
                            <span>20K_GOAL</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .text-glow-purple { text-shadow: 0 0 20px rgba(188, 19, 254, 0.8), 0 0 40px rgba(188, 19, 254, 0.4); }
                .text-glow-cyan { text-shadow: 0 0 20px rgba(0, 240, 255, 0.8), 0 0 40px rgba(0, 240, 255, 0.4); }
            `}</style>
        </div>
    );
}
