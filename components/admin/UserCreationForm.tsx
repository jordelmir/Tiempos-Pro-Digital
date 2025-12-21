// components/admin/UserCreationForm.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/services/api';
import { UserRole, AppUser } from '@/types';
import AnimatedIconUltra from '../ui/AnimatedIconUltra';

interface UserCreationFormProps {
    onCreated?: (newUser: AppUser) => void;
    theme?: any;
}

export default function UserCreationForm({ onCreated }: UserCreationFormProps) {
    const current = useAuthStore(s => s.user);

    const [name, setName] = useState('');
    const [cedula, setCedula] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.Cliente);
    const [balance, setBalance] = useState<number | ''>('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMode, setSuccessMode] = useState(false);

    const isVendedor = current?.role === UserRole.Vendedor;
    const isAdmin = current?.role === UserRole.SuperAdmin;

    useEffect(() => {
        if (isVendedor) setRole(UserRole.Cliente);
    }, [isVendedor]);

    const activeTheme = useMemo(() => {
        return role === UserRole.Cliente
            ? {
                color: '#0aff60',
                shadow: 'rgba(10, 255, 96, 0.5)',
                name: 'success',
                border: 'border-cyber-success',
                text: 'text-cyber-success',
                glow: 'shadow-neon-green',
                headerBg: 'bg-emerald-950/20'
            }
            : {
                color: '#bc13fe',
                shadow: 'rgba(188, 19, 254, 0.5)',
                name: 'purple',
                border: 'border-cyber-purple',
                text: 'text-cyber-purple',
                glow: 'shadow-neon-purple',
                headerBg: 'bg-purple-950/20'
            };
    }, [role]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (balance === '' || !pin || !cedula || !email || !name) {
            alert("PROTOCOL ERROR: Todos los campos biométricos son obligatorios.");
            return;
        }

        setLoading(true);
        try {
            const res = await api.createUser({
                name, role, email,
                balance_bigint: Math.round(Number(balance) * 100),
                issuer_id: current?.id,
                phone, cedula, pin
            });

            if (!res.error) {
                setSuccessMode(true);
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                setTimeout(() => {
                    // In Next.js, we might need to cast or handle the response data differently
                    if ((res as any).data?.user) onCreated?.((res as any).data.user);
                    resetForm();
                }, 2500);
            } else {
                alert(`IDENTITY CONFLICT: ${res.error}`);
            }
        } catch (err) {
            alert('CRITICAL NETWORK FAILURE: Enlace con el núcleo interrumpido.');
        } finally {
            setLoading(false);
        }
    }

    const resetForm = () => {
        setSuccessMode(false);
        setName(''); setPhone(''); setCedula(''); setPin(''); setBalance(''); setEmail('');
    };

    if (!current || current.role === UserRole.Cliente) return null;

    return (
        <div className="relative group animate-in slide-in-from-bottom-8 duration-700 w-full max-w-4xl mx-auto">
            <div className={`absolute -inset-2 transition-all duration-700 opacity-20 blur-3xl rounded-[2.5rem] animate-pulse ${activeTheme.color === '#0aff60' ? 'bg-cyber-success' : 'bg-cyber-purple'}`}></div>

            {successMode && (
                <div className="absolute inset-0 z-50 bg-[#02040a]/98 backdrop-blur-2xl rounded-[2.5rem] flex flex-col items-center justify-center animate-in fade-in duration-300 border-2 border-green-500 shadow-neon-green">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 blur-2xl bg-green-500 opacity-20 animate-pulse"></div>
                        <i className="fas fa-check-double text-6xl text-green-500 relative z-10 animate-bounce"></i>
                    </div>
                    <h3 className="text-2xl font-display font-black text-white uppercase tracking-widest">Nodo Autorizado</h3>
                    <p className="text-[10px] font-mono text-green-400 mt-2 uppercase tracking-widest animate-pulse">Identidad encriptada en el Núcleo</p>
                </div>
            )}

            <div className={`relative bg-[#050a14]/95 border-2 ${activeTheme.border} ${activeTheme.glow} rounded-[2.5rem] overflow-hidden transition-all duration-700 z-10 flex flex-col`}>

                <div className={`p-6 md:p-8 border-b border-white/10 ${activeTheme.headerBg} flex flex-col md:flex-row items-center justify-between gap-6 transition-colors duration-700`}>
                    <div className="flex items-center gap-5">
                        <div className={`w-16 h-16 rounded-2xl bg-black border-2 ${activeTheme.border} flex items-center justify-center ${activeTheme.glow} group-hover:scale-110 transition-all duration-500 shadow-2xl`}>
                            <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 4, theme: role === UserRole.Cliente ? 'cyber' : 'neon' }}>
                                <i className={`fas fa-id-card-alt text-3xl ${activeTheme.text}`}></i>
                            </AnimatedIconUltra>
                        </div>
                        <div>
                            <h3 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tighter leading-none">
                                Aprovisionamiento <span className={`${activeTheme.text} drop-shadow-[0_0_10px_currentColor] transition-colors duration-700`}>Biométrico</span>
                            </h3>
                            <p className={`text-[10px] md:text-[11px] font-mono ${activeTheme.text} uppercase tracking-[0.4em] font-black mt-2 transition-colors duration-700 border-t ${activeTheme.border}/30 pt-1.5 inline-block`}>
                                Creación de Nodo de Red <span className="opacity-80">v4.1</span>
                            </p>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className={`flex bg-black/80 p-1.5 rounded-2xl border-2 ${activeTheme.border} shadow-2xl shrink-0 transition-all duration-700`}>
                            <button type="button" onClick={() => setRole(UserRole.Cliente)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${role === UserRole.Cliente ? 'bg-cyber-success text-black shadow-neon-green' : 'text-slate-500 hover:text-white'}`}>Jugador</button>
                            <button type="button" onClick={() => setRole(UserRole.Vendedor)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${role === UserRole.Vendedor ? 'bg-cyber-purple text-black shadow-neon-purple' : 'text-slate-500 hover:text-white'}`}>Vendedor</button>
                        </div>
                    )}
                </div>

                <form onSubmit={submit} className="p-6 md:p-10 space-y-10 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                        <div className="space-y-6">
                            <div className="group/field">
                                <label className={`text-[10px] font-black uppercase tracking-widest ml-2 mb-2 block transition-colors duration-500 ${activeTheme.text}`}>Cédula del Operador</label>
                                <div className="relative">
                                    <i className={`fas fa-fingerprint absolute left-4 top-1/2 -translate-y-1/2 text-sm transition-colors duration-500 ${activeTheme.text} opacity-50`}></i>
                                    <input
                                        type="text" required value={cedula} onChange={(e) => setCedula(e.target.value)}
                                        className={`w-full bg-black/60 border-2 border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-mono placeholder-slate-800 focus:border-${activeTheme.name}-500 outline-none transition-all shadow-inner`}
                                        placeholder="0-0000-0000"
                                    />
                                </div>
                            </div>
                            <div className="group/field">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2 mb-2 block">Nombre de Registro</label>
                                <div className="relative">
                                    <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 text-sm"></i>
                                    <input
                                        type="text" required value={name} onChange={(e) => setName(e.target.value)}
                                        className={`w-full bg-black/60 border-2 border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-mono placeholder-slate-800 focus:border-${activeTheme.name}-500 outline-none transition-all shadow-inner`}
                                        placeholder="NOMBRE COMPLETO"
                                    />
                                </div>
                            </div>
                            <div className="group/field">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2 mb-2 block">Vínculo Electrónico</label>
                                <div className="relative">
                                    <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 text-sm"></i>
                                    <input
                                        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                        className={`w-full bg-black/60 border-2 border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-mono placeholder-slate-800 focus:border-${activeTheme.name}-500 outline-none transition-all shadow-inner`}
                                        placeholder="EMAIL@PROTOCOLO.NET"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="group/field">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2 mb-2 block">Terminal de Contacto</label>
                                <div className="relative">
                                    <i className="fas fa-mobile-alt absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 text-sm"></i>
                                    <input
                                        type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                                        className={`w-full bg-black/60 border-2 border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-mono placeholder-slate-800 focus:border-${activeTheme.name}-500 outline-none transition-all shadow-inner`}
                                        placeholder="+506 0000-0000"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2 mb-2 block">Carga Inicial</label>
                                    <input
                                        type="number" required value={balance} onChange={(e) => setBalance(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className={`w-full bg-black/60 border-2 border-white/5 rounded-2xl py-4 px-4 text-white font-mono placeholder-slate-800 focus:border-${activeTheme.name}-500 outline-none transition-all shadow-inner`}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2 mb-2 block">Cifrado PIN</label>
                                    <div
                                        onClick={() => setPin(Math.floor(100000 + Math.random() * 900000).toString())}
                                        className={`w-full bg-[#0a0a0a] border-2 border-dashed border-white/10 rounded-2xl py-4 text-center cursor-pointer hover:border-white/20 transition-all group/pin shadow-inner`}
                                    >
                                        <span className="text-white font-mono font-black tracking-[0.5em] text-sm">{pin || 'GENERAR'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className={`p-5 rounded-2xl bg-black/50 border border-white/10 shadow-inner hover:border-white/20 transition-all duration-700`}>
                                <div className="flex items-start gap-3">
                                    <i className={`fas fa-shield-check mt-1 text-sm ${activeTheme.text} opacity-50`}></i>
                                    <p className={`text-[10px] font-mono ${activeTheme.text} opacity-70 uppercase leading-relaxed font-black italic`}>
                                        "Cada nodo de red requiere una firma digital única. La integridad del sistema Phront es innegociable."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/10">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-6 rounded-3xl font-display font-black uppercase tracking-[0.5em] text-sm transition-all duration-500 relative overflow-hidden group/btn shadow-2xl
                            ${!loading ? 'hover:scale-[1.01] active:scale-95' : 'bg-slate-900 text-slate-700 cursor-not-allowed'}
                        `}
                            style={!loading ? { boxShadow: `0 0 50px ${activeTheme.shadow}`, background: role === UserRole.Cliente ? '#0aff60' : '#bc13fe', color: '#000' } : {}}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-6">
                                {loading ? <i className="fas fa-atom fa-spin text-2xl"></i> : <i className="fas fa-plus-circle text-2xl"></i>}
                                {loading ? 'SINCRONIZANDO...' : 'VINCULAR NUEVO NODO'}
                            </span>
                            <div className="absolute inset-0 bg-white/30 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 skew-x-12 opacity-50"></div>
                        </button>
                        <div className="text-center mt-4">
                            <p className="text-[8px] font-mono text-slate-600 uppercase tracking-[0.8em]">Security Level: Maximum-Restricted</p>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
