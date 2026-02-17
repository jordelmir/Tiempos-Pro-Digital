
import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { UserRole, AppUser } from '../types';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

interface UserCreationFormProps {
  onCreated?: (newUser: AppUser) => void;
}

export default function UserCreationForm({ onCreated }: UserCreationFormProps) {
  const current = useAuthStore(s => s.user);
  
  // State: Identity
  const [name, setName] = useState('');
  const [cedula, setCedula] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.Cliente);
  
  // State: Financial & Security
  const [balance, setBalance] = useState<number | ''>('');
  const [pin, setPin] = useState('');
  const [isPinGenerated, setIsPinGenerated] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [successMode, setSuccessMode] = useState(false);

  const isVendedor = current?.role === UserRole.Vendedor;
  const isAdmin = current?.role === UserRole.SuperAdmin;

  useEffect(() => {
    if (isVendedor) setRole(UserRole.Cliente);
  }, [isVendedor]);

  // Validation Logic
  const isFormComplete = useMemo(() => {
    return name.trim() !== '' && 
           cedula.trim() !== '' && 
           email.trim() !== '' && 
           phone.trim() !== '' && 
           balance !== '' && Number(balance) >= 0;
  }, [name, cedula, email, phone, balance]);

  const activeTheme = useMemo(() => {
      return role === UserRole.Cliente 
        ? { 
            color: '#0aff60', 
            name: 'success', 
            border: 'border-cyber-success', 
            text: 'text-cyber-success',
            glow: 'shadow-neon-green',
            headerBg: 'bg-emerald-950/20'
          } 
        : { 
            color: '#bc13fe', 
            name: 'purple', 
            border: 'border-cyber-purple', 
            text: 'text-cyber-purple',
            glow: 'shadow-neon-purple',
            headerBg: 'bg-purple-950/20'
          };
  }, [role]);

  const generateAccessCode = () => {
    if (!isFormComplete) return;
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(newPin);
    setIsPinGenerated(true);
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isPinGenerated) return;
    
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
            if (res.data?.user) onCreated?.(res.data.user); 
            resetForm(); 
        }, 2500);
      } else { 
          alert(`CONFLICTO DE IDENTIDAD: ${res.error}`); 
      }
    } catch (err) { 
        alert('FALLO CRÍTICO: Enlace con el núcleo interrumpido.'); 
    } finally { 
        setLoading(false); 
    }
  }

  const resetForm = () => { 
    setSuccessMode(false); 
    setName(''); setPhone(''); setCedula(''); setPin(''); setBalance(''); setEmail('');
    setIsPinGenerated(false);
  };

  if (!current || current.role === UserRole.Cliente) return null;

  return (
    <div className="relative group animate-in slide-in-from-bottom-8 duration-700 w-full max-w-5xl mx-auto py-12">
        <div className={`absolute -inset-4 transition-all duration-700 opacity-10 blur-3xl rounded-[3rem] animate-pulse ${activeTheme.color === '#0aff60' ? 'bg-cyber-success' : 'bg-cyber-purple'}`}></div>
        
        {successMode && (
            <div className="absolute inset-0 z-[60] bg-[#02040a]/98 backdrop-blur-2xl rounded-[3rem] flex flex-col items-center justify-center animate-in fade-in duration-300 border-2 border-green-500 shadow-neon-green">
               <div className="relative mb-6">
                   <div className="absolute inset-0 blur-2xl bg-green-500 opacity-20 animate-pulse"></div>
                   <i className="fas fa-check-double text-7xl text-green-500 relative z-10 animate-bounce"></i>
               </div>
               <h3 className="text-3xl font-display font-black text-white uppercase tracking-[0.3em]">Nodo Vinculado</h3>
               <p className="text-xs font-mono text-green-400 mt-4 uppercase tracking-[0.4em] animate-pulse">Identidad encriptada y activa en el sistema</p>
            </div>
        )}

        <div className={`relative bg-[#050a14]/95 border-2 ${activeTheme.border} ${activeTheme.glow} rounded-[3rem] overflow-hidden transition-all duration-700 z-10 flex flex-col shadow-2xl`}>
            
            {/* Header: Aprovisionamiento */}
            <div className={`p-8 md:p-10 border-b border-white/10 ${activeTheme.headerBg} flex flex-col md:flex-row items-center justify-between gap-8 transition-colors duration-700`}>
                <div className="flex items-center gap-6">
                    <div className={`w-20 h-20 rounded-2xl bg-black border-2 ${activeTheme.border} flex items-center justify-center ${activeTheme.glow} shadow-2xl`}>
                        <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 4, theme: role === UserRole.Cliente ? 'cyber' : 'neon' }}>
                            <i className={`fas ${role === UserRole.Cliente ? 'fa-user-plus' : 'fa-user-shield'} text-4xl ${activeTheme.text}`}></i>
                        </AnimatedIconUltra>
                    </div>
                    <div>
                        <h3 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tighter leading-none">
                            Registro de <span className={`${activeTheme.text} text-glow-sm transition-colors duration-700`}>Terminales</span>
                        </h3>
                        <p className={`text-[10px] md:text-[11px] font-mono ${activeTheme.text} uppercase tracking-[0.5em] font-black mt-3 transition-colors duration-700 opacity-70`}>
                            Protocolo Phront Maestro v3.5
                        </p>
                    </div>
                </div>

                {isAdmin && (
                    <div className="flex bg-black/80 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                        <button type="button" onClick={() => { setRole(UserRole.Cliente); setIsPinGenerated(false); setPin(''); }} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${role === UserRole.Cliente ? 'bg-cyber-success text-black shadow-neon-green' : 'text-slate-500 hover:text-white'}`}>Jugador</button>
                        <button type="button" onClick={() => { setRole(UserRole.Vendedor); setIsPinGenerated(false); setPin(''); }} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${role === UserRole.Vendedor ? 'bg-cyber-purple text-black shadow-neon-purple' : 'text-slate-500 hover:text-white'}`}>Vendedor</button>
                    </div>
                )}
            </div>

            <form onSubmit={submit} className="p-8 md:p-12 space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Sección 1: Datos de Identidad */}
                    <div className="space-y-8">
                        <div className="group/field">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2 mb-3 block">Nombre Completo de Registro</label>
                            <div className="relative">
                                <i className="fas fa-user-tag absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 text-lg"></i>
                                <input 
                                    type="text" required value={name} onChange={(e) => setName(e.target.value)} 
                                    className="w-full bg-black/60 border-2 border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white font-mono text-lg focus:border-white/20 outline-none transition-all shadow-inner" 
                                    placeholder="EJ: JUAN PEREZ CALDERON" 
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="group/field">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2 mb-3 block">Cédula / ID</label>
                                <div className="relative">
                                    <i className="fas fa-id-card absolute left-5 top-1/2 -translate-y-1/2 text-slate-700"></i>
                                    <input 
                                        type="text" required value={cedula} onChange={(e) => setCedula(e.target.value)} 
                                        className="w-full bg-black/60 border-2 border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white font-mono text-lg focus:border-white/20 outline-none transition-all shadow-inner" 
                                        placeholder="0-0000-0000" 
                                    />
                                </div>
                            </div>
                            <div className="group/field">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2 mb-3 block">Terminal Telefónica</label>
                                <div className="relative">
                                    <i className="fas fa-phone-alt absolute left-5 top-1/2 -translate-y-1/2 text-slate-700"></i>
                                    <input 
                                        type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} 
                                        className="w-full bg-black/60 border-2 border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white font-mono text-lg focus:border-white/20 outline-none transition-all shadow-inner" 
                                        placeholder="+506 8888-8888" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="group/field">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2 mb-3 block">Correo Electrónico</label>
                            <div className="relative">
                                <i className="fas fa-envelope-open-text absolute left-5 top-1/2 -translate-y-1/2 text-slate-700"></i>
                                <input 
                                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)} 
                                    className="w-full bg-black/60 border-2 border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white font-mono text-lg focus:border-white/20 outline-none transition-all shadow-inner" 
                                    placeholder="CLIENTE@PROTOCOLO.NET" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sección 2: Parámetros de Seguridad y Saldo */}
                    <div className="space-y-8 flex flex-col justify-between">
                        <div className="group/field">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2 mb-3 block">Carga de Capital Inicial (CRC)</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-cyber-success font-black text-2xl">₡</span>
                                <input 
                                    type="number" required value={balance} onChange={(e) => setBalance(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                                    className="w-full bg-black/80 border-2 border-cyber-success/20 rounded-3xl py-8 pl-14 pr-8 text-white font-mono text-5xl focus:border-cyber-success outline-none transition-all shadow-[inset_0_0_20px_black]" 
                                    placeholder="0.00" 
                                />
                            </div>
                        </div>

                        {/* PANEL DE GENERACIÓN DE CÓDIGO */}
                        <div className={`p-8 rounded-[2rem] border-2 transition-all duration-500 ${isPinGenerated ? activeTheme.border + ' bg-white/5 shadow-2xl' : 'border-dashed border-white/10 bg-black/20'}`}>
                             {!isPinGenerated ? (
                                 <div className="text-center">
                                     <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em] mb-6">Paso 1: Validar datos y generar llave</p>
                                     <button 
                                        type="button" 
                                        disabled={!isFormComplete}
                                        onClick={generateAccessCode}
                                        className={`w-full py-6 rounded-2xl font-display font-black uppercase tracking-[0.3em] text-sm transition-all duration-300 flex items-center justify-center gap-4
                                            ${isFormComplete ? 'bg-white text-black shadow-2xl hover:scale-[1.02] active:scale-95' : 'bg-slate-900 text-slate-700 cursor-not-allowed opacity-50'}
                                        `}
                                     >
                                         <i className="fas fa-fingerprint text-xl"></i> Generar Código de Acceso
                                     </button>
                                 </div>
                             ) : (
                                 <div className="flex flex-col items-center animate-in zoom-in duration-500">
                                     <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.5em] mb-4">Llave de Acceso Generada</span>
                                     <div className={`text-6xl md:text-7xl font-mono font-black tracking-[0.3em] mb-4 ${activeTheme.text} drop-shadow-[0_0_20px_currentColor]`}>
                                         {pin}
                                     </div>
                                     <p className="text-[10px] font-black text-white bg-red-600 px-4 py-2 rounded-lg uppercase tracking-widest animate-pulse">Entregar código al cliente</p>
                                     <button type="button" onClick={() => { setIsPinGenerated(false); setPin(''); }} className="mt-6 text-[9px] font-black text-slate-500 uppercase border-b border-slate-800 hover:text-white transition-colors">Regenerar Llave</button>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>

                {/* BOTÓN REGISTRAR FINAL */}
                <div className="pt-8 border-t border-white/10">
                    <button 
                        type="submit" 
                        disabled={loading || !isPinGenerated} 
                        className={`w-full py-8 rounded-[2.5rem] font-display font-black uppercase tracking-[0.6em] text-lg transition-all duration-500 relative overflow-hidden group/btn shadow-2xl
                            ${(isPinGenerated && !loading) ? 'hover:scale-[1.01] active:scale-95' : 'bg-slate-900 text-slate-700 cursor-not-allowed grayscale'}
                        `}
                        style={(isPinGenerated && !loading) ? { background: activeTheme.color, color: '#000', boxShadow: `0 0 50px ${activeTheme.color}60` } : {}}
                    >
                        <span className="relative z-10 flex items-center justify-center gap-8">
                            {loading ? <i className="fas fa-atom fa-spin text-3xl"></i> : <i className="fas fa-plus-circle text-3xl"></i>}
                            {loading ? 'SINCRONIZANDO...' : 'VINCULAR NUEVO NODO'}
                        </span>
                        {isPinGenerated && <div className="absolute inset-0 bg-white/40 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 skew-x-12 opacity-50"></div>}
                    </button>
                    
                    <div className="flex justify-between items-center mt-6 px-4">
                        <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${isPinGenerated ? 'bg-cyber-success shadow-neon-green' : 'bg-slate-700'}`}></div>
                             <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">Pin_Authorized</span>
                        </div>
                        <p className="text-[8px] font-mono text-slate-600 uppercase tracking-[0.8em]">Security Level: Maximum-Restricted</p>
                    </div>
                </div>
            </form>
        </div>
    </div>
  );
}
