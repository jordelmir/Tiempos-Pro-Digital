
import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { formatCurrency } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoyaltyCard() {
    const { user, fetchUser } = useAuthStore();
    const [loading, setLoading] = useState(false);

    if (!user) return null;

    const points = user.loyalty_points || 0;
    const threshold = 20000;
    const canRedeem = points >= threshold;
    const progress = Math.min((points / threshold) * 100, 100);

    const theme = useMemo(() => {
        return canRedeem 
            ? { color: 'text-cyber-purple', hex: '#bc13fe', shadow: 'shadow-neon-purple', bg: 'bg-cyber-purple/20' }
            : { color: 'text-cyber-blue', hex: '#00D1FF', shadow: 'shadow-neon-blue', bg: 'bg-cyber-blue/10' };
    }, [canRedeem]);

    const handleRedeem = async () => {
        if (!canRedeem || loading) return;
        setLoading(true);
        try {
            const res = await api.redeemLoyaltyPoints(user.id);
            if (!res.error) {
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                await fetchUser(true);
            }
        } catch (e) {
            console.error("Redeem failed", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full group overflow-hidden"
        >
            <div className={`absolute -inset-4 ${canRedeem ? 'bg-cyber-purple/20' : 'bg-cyber-blue/20'} rounded-[2rem] blur-3xl animate-pulse transition-all duration-1000 opacity-20`}></div>
            {/* COMPACT HUD BOX */}
            <div className={`relative bg-black/60 backdrop-blur-2xl border-2 rounded-[2rem] p-5 md:p-6 overflow-hidden shadow-2xl transition-all duration-700 z-10 ${canRedeem ? 'border-cyber-purple' : 'border-white/10'}`}>
                
                {/* Backglow subtle */}
                <div className={`absolute -right-10 -top-10 w-40 h-40 blur-[80px] opacity-10 transition-colors duration-1000 ${canRedeem ? 'bg-cyber-purple' : 'bg-cyber-blue'}`}></div>
                
                <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                    
                    {/* MINI REACTOR CORE */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                            <motion.circle 
                                cx="50" cy="50" r="42" fill="none" 
                                stroke={theme.hex} 
                                strokeWidth="8" 
                                strokeDasharray="263.89" 
                                strokeDashoffset={263.89 - (263.89 * progress) / 100}
                                strokeLinecap="round"
                                className="drop-shadow-[0_0_8px_currentColor]"
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-xl font-display font-black tracking-tighter ${theme.color}`}>
                                {Math.floor(progress)}%
                            </span>
                        </div>
                    </div>

                    {/* IDENTITY & STATS */}
                    <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${canRedeem ? 'bg-cyber-purple animate-ping' : 'bg-cyber-blue'}`}></div>
                            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-[0.4em] font-black">Protocolo Lealtad</span>
                        </div>
                        <h3 className="text-2xl font-display font-black text-white uppercase tracking-tighter truncate">
                            {user.name.split(' ')[0]}<span className={theme.color}>_ID</span>
                        </h3>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] text-slate-500 font-bold uppercase">Poder</span>
                                <span className={`text-sm font-mono font-black ${canRedeem ? 'text-cyber-purple' : 'text-white'}`}>{points.toLocaleString()}</span>
                            </div>
                            <div className="w-px h-3 bg-white/10 hidden xs:block"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] text-slate-500 font-bold uppercase">Meta</span>
                                <span className="text-[10px] font-mono font-bold text-white/40">20,000PTS</span>
                            </div>
