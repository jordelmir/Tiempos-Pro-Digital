
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

type LoginRole = 'ADMIN' | 'VENDOR' | 'PLAYER';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeRole, setActiveRole] = useState<LoginRole>('ADMIN');
  const [viewState, setViewState] = useState<'IDLE' | 'BOOTING' | 'ACCESS_GRANTED' | 'ACCESS_DENIED'>('IDLE');
  const navigate = useNavigate();
  const fetchUser = useAuthStore(s => s.fetchUser);

  // --- THEME ENGINE ---
  const theme = useMemo(() => {
      switch (activeRole) {
          case 'VENDOR':
              // DARK MASCULINE PURPLE (Imperial/Obsidian)
              return {
                  primary: 'text-violet-400',
                  border: 'border-violet-600',
                  shadow: 'shadow-[0_0_100px_rgba(124,58,237,0.4)]', 
                  inputBorder: 'border-violet-900/50',
                  inputFocus: 'focus:border-violet-500 focus:text-violet-200 focus:shadow-[0_0_40px_rgba(139,92,246,0.5)]',
                  btnBg: 'bg-gradient-to-r from-[#2e1065] to-[#7c3aed]', 
                  btnText: 'text-white',
                  btnShadow: 'group-hover/btn:shadow-[0_0_60px_rgba(139,92,246,0.6)]',
                  iconColor: 'text-violet-500',
                  secondaryText: 'text-fuchsia-400', 
                  backlight: 'bg-[#4c1d95]', 
                  label: 'MERCHANT_PRIME',
                  ringColor: 'border-violet-500',
                  containerBorder: 'border-violet-500/50'
              };
          case 'PLAYER':
              // DARK NEON BLUE PHOSPHORESCENT (Deep Abyss)
              return {
                  primary: 'text-cyan-400', 
                  border: 'border-cyan-500',
                  shadow: 'shadow-[0_0_100px_rgba(34,211,238,0.4)]', 
                  inputBorder: 'border-cyan-900/50',
                  inputFocus: 'focus:border-cyan-400 focus:text-cyan-100 focus:shadow-[0_0_40px_rgba(34,211,238,0.5)]',
                  btnBg: 'bg-gradient-to-r from-[#083344] to-[#06b6d4]', 
                  btnText: 'text-cyan-50',
                  btnShadow: 'group-hover/btn:shadow-[0_0_60px_rgba(34,211,238,0.6)]',
                  iconColor: 'text-cyan-400',
                  secondaryText: 'text-blue-400', 
                  backlight: 'bg-[#0e7490]', 
                  label: 'PLAYER_GRID_V2',
                  ringColor: 'border-cyan-400',
                  containerBorder: 'border-cyan-500/50'
              };
          case 'ADMIN':
          default:
              // RED MATTER (Unchanged)
              return {
                  primary: 'text-rose-500',
                  border: 'border-rose-600',
                  shadow: 'shadow-[0_0_100px_rgba(244,63,94,0.4)]',
                  inputBorder: 'border-rose-900/50',
                  inputFocus: 'focus:border-rose-500 focus:text-rose-200 focus:shadow-[0_0_40px_rgba(244,63,94,0.5)]',
                  btnBg: 'bg-gradient-to-r from-[#881337] to-[#f43f5e]',
                  btnText: 'text-white',
                  btnShadow: 'group-hover/btn:shadow-[0_0_60px_rgba(244,63,94,0.6)]',
                  iconColor: 'text-rose-500',
                  secondaryText: 'text-red-400', 
                  backlight: 'bg-[#be123c]',
                  label: 'ROOT_ACCESS_LEVEL_5',
                  ringColor: 'border-rose-500',
                  containerBorder: 'border-rose-600/50'
              };
      }
  }, [activeRole]);

  // --- LOGIC ---
  const fillCredentials = (role: LoginRole) => {
      setActiveRole(role);
      if (role === 'ADMIN') {
          setEmail('admin@tiempos.local');
          setPassword('123456');
      } else if (role === 'VENDOR') {
          setEmail('vendedor@test.com');
          setPassword('123456');
      } else {
          setEmail('jugador@test.com');
          setPassword('123456');
      }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setViewState('BOOTING');

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    // Cinematic Delay
    await new Promise(r => setTimeout(r, 2500));

    if (error) {
        setViewState('ACCESS_DENIED');
        setTimeout(() => setViewState('IDLE'), 2000);
        alert('ACCESO DENEGADO');
    } else {
        setViewState('ACCESS_GRANTED');
        await fetchUser();
        setTimeout(() => navigate('/dashboard'), 1000);
    }
  };

  // 1. ADMIN: THE RED MATTER CORE (Biosecurity / Reactor)
  const renderAdminBoot = () => (
      <div className="relative h-full w-full flex items-center justify-center p-4">
          {/* Volumetric Backlight */}
          <div className="absolute -inset-10 bg-rose-600 rounded-[4rem] blur-3xl opacity-50 animate-pulse"></div>
          
          {/* Main Container */}
          <div className="relative flex flex-col items-center justify-center h-full w-full overflow-hidden bg-black border-[6px] border-rose-600 rounded-[2.5rem] shadow-[0_0_150px_rgba(225,29,72,0.8),inset_0_0_50px_rgba(225,29,72,0.5)] group ring-4 ring-rose-900 ring-offset-8 ring-offset-black z-10">
              
              {/* Background: Digital Rain (Red Matrix) */}
              <div className="absolute inset-0 opacity-40 pointer-events-none">
                  <div className="w-full h-full bg-[linear-gradient(0deg,transparent_20%,rgba(225,29,72,0.6)_50%,transparent_80%)] bg-[length:100%_4px] animate-[scanline_3s_linear_infinite]"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,black_100%)]"></div>
              </div>

              {/* LASER SCANNER BEAM */}
              <div className={`absolute left-0 w-full h-4 bg-rose-500 shadow-[0_0_50px_#f43f5e] z-20 animate-[scan_1.5s_ease-in-out_infinite] ${viewState === 'ACCESS_GRANTED' ? 'hidden' : 'block'}`}></div>

              {/* CENTER REACTOR */}
              <div className="relative z-10 w-80 h-80 flex items-center justify-center perspective-1000">
                  
                  {/* Outer Gyroscope Rings */}
                  <div className={`absolute inset-0 rounded-full border-[6px] border-rose-900/50 border-t-rose-500 animate-[spin_4s_linear_infinite] transition-all duration-500 ${viewState === 'ACCESS_GRANTED' ? 'scale-150 opacity-0' : ''} shadow-[0_0_40px_rgba(244,63,94,0.6)]`}></div>
                  <div className={`absolute inset-6 rounded-full border-[6px] border-rose-900/50 border-b-rose-500 animate-[spin_6s_linear_infinite_reverse] transition-all duration-500 ${viewState === 'ACCESS_GRANTED' ? 'scale-125 opacity-0' : ''}`}></div>
                  <div className={`absolute inset-12 rounded-full border-4 border-dashed border-rose-800 animate-[spin_10s_linear_infinite] opacity-50`}></div>

                  {/* The Core Mass */}
                  <div className={`relative w-40 h-40 bg-black rounded-full flex items-center justify-center border-4 border-rose-600 shadow-[0_0_100px_rgba(225,29,72,0.8)] overflow-hidden transition-all duration-700 ${viewState === 'ACCESS_GRANTED' ? 'scale-110 border-white shadow-[0_0_150px_white]' : ''}`}>
                      
                      {/* Internal Texture */}
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-40 mix-blend-overlay"></div>
                      
                      {/* Iris/Lens Mechanism */}
                      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${viewState === 'ACCESS_GRANTED' ? 'opacity-0' : 'opacity-100'}`}>
                          <div className="w-20 h-20 border-4 border-rose-500 rounded-full animate-pulse shadow-[inset_0_0_40px_rgba(225,29,72,1)]"></div>
                          <div className="absolute w-full h-[3px] bg-rose-500 animate-[spin_2s_linear_infinite]"></div>
                          <div className="absolute h-full w-[3px] bg-rose-500 animate-[spin_2s_linear_infinite]"></div>
                      </div>

                      {/* Success State */}
                      {viewState === 'ACCESS_GRANTED' && (
                          <div className="absolute inset-0 bg-white flex items-center justify-center animate-in zoom-in duration-300">
                              <i className="fas fa-check text-6xl text-black"></i>
                          </div>
                      )}
                  </div>
              </div>

              {/* HUD OVERLAY */}
              <div className="absolute inset-0 p-8 pointer-events-none flex flex-col justify-between">
                  <div className="flex justify-between items-start opacity-90">
                      <div className="text-[10px] font-mono text-rose-300 font-bold border border-rose-600 px-3 py-1 bg-black/90 shadow-[0_0_20px_rgba(244,63,94,0.4)]">SYS.ROOT</div>
                      <div className="text-[10px] font-mono text-rose-300 font-bold border border-rose-600 px-3 py-1 bg-black/90 shadow-[0_0_20px_rgba(244,63,94,0.4)]">SEC.LVL.5</div>
                  </div>
                  <div className="text-center pb-8 w-full flex justify-center">
                      {/* FIX: RESPONSIVE FONT SIZE & TRACKING */}
                      <div className={`font-display font-black text-lg sm:text-2xl md:text-3xl tracking-[0.2em] md:tracking-[0.3em] transition-all duration-300 whitespace-nowrap ${viewState === 'ACCESS_GRANTED' ? 'text-white drop-shadow-[0_0_30px_white]' : 'text-rose-500 animate-pulse text-shadow-neon-red'}`}>
                          {viewState === 'ACCESS_GRANTED' ? 'GRANTED' : 'AUTHENTICATING'}
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  // 2. VENDOR: THE DARK OBSIDIAN CONSTRUCT (Dark Violet/Indigo)
  const renderVendorBoot = () => (
      <div className="relative h-full w-full flex items-center justify-center p-4">
          {/* Volumetric Backlight */}
          <div className="absolute -inset-10 bg-violet-700 rounded-[4rem] blur-3xl opacity-50 animate-pulse"></div>

          <div className="relative flex flex-col items-center justify-center h-full w-full overflow-hidden bg-[#0a0514] border-[6px] border-violet-600 rounded-[2.5rem] shadow-[0_0_150px_rgba(139,92,246,0.8),inset_0_0_50px_rgba(124,58,237,0.5)] ring-4 ring-violet-900 ring-offset-8 ring-offset-black z-10">
              {/* Deep Void Fog */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.4),black_90%)] animate-pulse"></div>
              
              {/* Grid Overlay - Dark & Subtle */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.1)_1px,transparent_1px)] bg-[length:30px_30px] opacity-50 perspective-1000 transform rotate-x-12"></div>

              <div className="relative z-10 w-72 h-72 flex items-center justify-center">
                  
                  {/* HEAVY METAL RINGS - Dark Purple */}
                  <div className={`absolute inset-0 border-[10px] border-violet-950 border-t-violet-500 rounded-full animate-[spin_6s_linear_infinite] shadow-[0_0_50px_rgba(139,92,246,0.7)]`}></div>
                  <div className={`absolute inset-4 border-[6px] border-indigo-900 border-b-fuchsia-500 rounded-full animate-[spin_8s_linear_infinite_reverse] shadow-[0_0_30px_rgba(217,70,239,0.6)]`}></div>
                  
                  {/* Rotating Glyphs */}
                  <div className="absolute inset-0 animate-[spin_20s_linear_infinite]">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 text-violet-300 text-xl font-mono font-black drop-shadow-[0_0_15px_violet]">$</div>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 text-violet-300 text-xl font-mono font-black drop-shadow-[0_0_15px_violet]">$</div>
                  </div>

                  {/* CENTRAL OBSIDIAN CRYSTAL */}
                  <div className={`relative w-40 h-40 transform transition-all duration-700 ${viewState === 'ACCESS_GRANTED' ? 'scale-110' : 'animate-float'}`}>
                      <div className="absolute inset-0 bg-violet-600 blur-2xl opacity-70 rounded-full"></div>
                      
                      {/* Diamond Shape */}
                      <div className="relative w-full h-full bg-gradient-to-br from-[#2e1065] to-black border-4 border-violet-400 flex items-center justify-center rotate-45 shadow-[inset_0_0_50px_rgba(139,92,246,0.9)] overflow-hidden">
                          {/* Inner Reflection */}
                          <div className="absolute top-0 left-0 w-full h-1/2 bg-white opacity-10"></div>
                          
                          <div className="-rotate-45">
                            {viewState === 'ACCESS_GRANTED' ? (
                                <i className="fas fa-check text-7xl text-white drop-shadow-[0_0_30px_white]"></i>
                            ) : (
                                <i className="fas fa-briefcase text-7xl text-fuchsia-300 drop-shadow-[0_0_30px_#e879f9] animate-pulse"></i>
                            )}
                          </div>
                      </div>
                  </div>
              </div>

              <div className="absolute bottom-16 text-center w-full">
                  <div className={`font-display font-black text-xl md:text-2xl tracking-[0.2em] md:tracking-[0.3em] uppercase ${viewState === 'ACCESS_GRANTED' ? 'text-white text-shadow-white' : 'text-violet-300 text-shadow-neon-purple'}`}>
                      {viewState === 'ACCESS_GRANTED' ? 'ASSETS VERIFIED' : 'SYNCING LEDGER'}
                  </div>
                  <div className="text-[10px] font-mono text-fuchsia-300 mt-2 font-bold tracking-widest">SECURE_CHANNEL_ESTABLISHED</div>
              </div>
          </div>
      </div>
  );

  // 3. PLAYER: THE DARK PHOSPHORESCENT GATEWAY (Deep Navy/Electric Blue)
  const renderPlayerBoot = () => (
      <div className="relative h-full w-full flex items-center justify-center p-4">
          {/* Volumetric Backlight */}
          <div className="absolute -inset-10 bg-cyan-500 rounded-[4rem] blur-3xl opacity-50 animate-pulse"></div>

          <div className="relative flex flex-col items-center justify-center h-full w-full overflow-hidden bg-[#02040a] border-[6px] border-cyan-400 rounded-[2.5rem] shadow-[0_0_150px_rgba(34,211,238,0.8),inset_0_0_50px_rgba(34,211,238,0.5)] ring-4 ring-cyan-800 ring-offset-8 ring-offset-black z-10">
              
              {/* Deep Abyss Background */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#083344_0%,#000000_100%)] opacity-90"></div>

              {/* PHOSPHORESCENT GRID LINES */}
              <div className="absolute inset-0 flex items-center justify-center perspective-500">
                  <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(6,182,212,0.3)_25%,rgba(6,182,212,0.3)_26%,transparent_27%,transparent_74%,rgba(6,182,212,0.3)_75%,rgba(6,182,212,0.3)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(6,182,212,0.3)_25%,rgba(6,182,212,0.3)_26%,transparent_27%,transparent_74%,rgba(6,182,212,0.3)_75%,rgba(6,182,212,0.3)_76%,transparent_77%,transparent)] bg-[length:50px_50px] animate-[pan-down_2s_linear_infinite]"></div>
              </div>

              {/* THE GATEWAY */}
              <div className="relative z-10 w-80 h-80 flex items-center justify-center">
                  {/* Outer Glow */}
                  <div className="absolute inset-0 bg-cyan-500 blur-[90px] opacity-30 rounded-full animate-pulse"></div>

                  {/* Spinners */}
                  <div className="absolute inset-0 border-[8px] border-cyan-900/50 border-l-cyan-400 rounded-full animate-[spin_3s_linear_infinite] shadow-[0_0_40px_rgba(34,211,238,0.7)]"></div>
                  <div className="absolute inset-8 border-[6px] border-blue-900 border-r-blue-400 rounded-full animate-[spin_5s_linear_infinite_reverse] shadow-[0_0_30px_rgba(59,130,246,0.7)]"></div>

                  {/* Core Icon */}
                  <div className="bg-[#020617] p-12 rounded-full border-4 border-cyan-500 shadow-[inset_0_0_80px_#0891b2] relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/60 to-transparent"></div>
                      {viewState === 'ACCESS_GRANTED' ? (
                          <i className="fas fa-gamepad text-8xl text-cyan-200 animate-[bounce_1s_infinite] drop-shadow-[0_0_40px_#22d3ee]"></i>
                      ) : (
                          <div className="text-cyan-400 text-center animate-pulse">
                              <i className="fas fa-satellite-dish text-6xl mb-2 drop-shadow-[0_0_20px_#22d3ee]"></i>
                          </div>
                      )}
                  </div>
              </div>

              <div className="absolute bottom-20 w-full px-16">
                  <div className="flex justify-between text-[10px] font-mono text-cyan-300 font-bold mb-2 tracking-widest">
                      <span>LOADING RESOURCES</span>
                      <span>{viewState === 'ACCESS_GRANTED' ? '100%' : '98%'}</span>
                  </div>
                  <div className="w-full h-3 bg-blue-950 rounded-full overflow-hidden border border-blue-900">
                      <div className={`h-full bg-cyan-400 shadow-[0_0_20px_#22d3ee] ${viewState === 'ACCESS_GRANTED' ? 'w-full' : 'w-[90%] animate-pulse'}`}></div>
                  </div>
              </div>

              <div className="absolute bottom-8 font-display font-black text-2xl md:text-3xl italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-200 drop-shadow-[0_0_15px_rgba(34,211,238,0.9)]">
                  {viewState === 'ACCESS_GRANTED' ? 'WELCOME PLAYER_1' : 'CONNECTING...'}
              </div>
              
              <style>{`
                @keyframes pan-down {
                    0% { background-position: 0 0; }
                    100% { background-position: 0 50px; }
                }
              `}</style>
          </div>
      </div>
  );

  return (
    <div className="relative min-h-screen text-white font-mono overflow-hidden flex items-center justify-center">
      
      <div className="relative z-20 w-full max-w-lg perspective-1000 p-4 min-h-[600px] flex items-center justify-center">
        
        {/* --- STATE: IDLE (LOGIN FORM) --- */}
        {viewState === 'IDLE' && (
            <div className="animate-in zoom-in-95 fade-in duration-500 relative w-full">
                
                {/* DYNAMIC BACKLIGHT - STRONGER */}
                <div className={`absolute -inset-10 ${theme.backlight} rounded-[3rem] opacity-40 blur-3xl animate-pulse transition-colors duration-700`}></div>

                <div className={`relative bg-[#050a14]/90 backdrop-blur-2xl border-[4px] rounded-3xl p-1 group overflow-hidden z-10 transition-colors duration-700 ${theme.containerBorder} ${theme.shadow}`}>
                    
                    <div className="relative bg-[#020202]/95 rounded-[1.4rem] p-8 md:p-10 overflow-hidden transition-colors duration-700">
                        
                        {/* Decorative HUD Elements */}
                        <div className={`absolute top-4 left-4 w-3 h-3 rounded-full animate-pulse shadow-[0_0_15px_currentColor] ${theme.backlight}`}></div>
                        <div className={`absolute top-4 right-4 text-[10px] font-black tracking-[0.3em] opacity-90 drop-shadow-[0_0_10px_currentColor] transition-colors duration-500 ${theme.primary}`}>
                            {theme.label}
                        </div>

                        {/* Logo Section */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-28 h-28 mb-6 relative group/icon cursor-pointer">
                                <div className={`absolute inset-0 rounded-full blur-2xl opacity-40 group-hover/icon:opacity-60 animate-pulse transition-all duration-700 ${theme.backlight}`}></div>
                                <div className={`relative z-10 w-full h-full rounded-full bg-black/60 border-4 group-hover/icon:border-opacity-100 transition-all duration-700 flex items-center justify-center overflow-hidden border-opacity-50 ${theme.border} ${theme.shadow}`}>
                                    <div className={`absolute inset-0 rounded-full border-t-4 animate-[spin_3s_linear_infinite] opacity-70 ${theme.ringColor}`}></div>
                                    <div className={`absolute inset-2 rounded-full border-b-4 animate-[spin_2s_linear_infinite_reverse] opacity-70 ${theme.border}`}></div>
                                    <i className={`fas fa-fingerprint text-6xl drop-shadow-[0_0_25px_currentColor] group-hover/icon:scale-110 transition-all duration-700 ${theme.primary}`}></i>
                                </div>
                            </div>
                            
                            <h1 className="text-5xl font-display font-black italic tracking-tighter text-white mb-2 drop-shadow-xl">
                                TIEMPOS<span className={`drop-shadow-[0_0_20px_currentColor] ${theme.primary} transition-colors duration-700`}>PRO</span>
                            </h1>
                            <p className={`text-xs uppercase tracking-[0.5em] font-bold animate-pulse transition-colors duration-700 ${theme.secondaryText}`}>Acceso Blindado</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            
                            {/* IDENTIFIER INPUT */}
                            <div className="space-y-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 drop-shadow-[0_0_10px_currentColor] flex items-center gap-2 transition-colors duration-500 ${theme.primary}`}>
                                    <i className="fas fa-id-badge"></i> Identificador
                                </label>
                                <div className="relative group/input">
                                    <div className={`absolute -inset-1 rounded-xl blur opacity-0 group-hover/input:opacity-30 group-focus-within/input:opacity-60 transition-all duration-500 animate-pulse ${theme.backlight}`}></div>
                                    
                                    <div className="relative flex items-center">
                                        <div className={`absolute left-4 transition-colors duration-500 ${theme.primary} opacity-90`}><i className="fas fa-user-shield text-lg"></i></div>
                                        <input 
                                            type="email" 
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className={`relative w-full bg-black/60 border-2 rounded-xl py-4 pl-12 pr-4 text-white font-mono text-sm placeholder-slate-700 focus:outline-none transition-all duration-500 z-10 ${theme.inputBorder} ${theme.inputFocus}`}
                                            placeholder="OPERADOR@NET.LOCAL"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* PRIVATE KEY INPUT */}
                            <div className="space-y-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 drop-shadow-[0_0_10px_currentColor] flex items-center gap-2 transition-colors duration-500 ${theme.secondaryText}`}>
                                    <i className="fas fa-key"></i> Llave Privada
                                </label>
                                <div className="relative group/input">
                                    <div className={`absolute -inset-1 rounded-xl blur opacity-0 group-hover/input:opacity-30 group-focus-within/input:opacity-60 transition-all duration-500 animate-pulse ${theme.backlight}`}></div>
                                    
                                    <div className="relative flex items-center">
                                        <div className={`absolute left-4 transition-colors duration-500 ${theme.secondaryText} opacity-90`}><i className="fas fa-lock text-lg"></i></div>
                                        <input 
                                            type="password" 
                                            required
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className={`relative w-full bg-black/60 border-2 rounded-xl py-4 pl-12 pr-4 text-white font-mono text-sm placeholder-slate-700 focus:outline-none transition-all duration-500 z-10 ${theme.inputBorder} ${theme.inputFocus}`}
                                            placeholder="••••••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* --- THE PLASMA CORE BUTTON (IMPROVED NEON/PHOSPHORESCENT) --- */}
                            <div className="relative group/submit mt-8 perspective-500">
                                {/* 1. LIQUID NEON GLOW (Underlayer) */}
                                <div className={`absolute -inset-2 rounded-2xl opacity-40 blur-xl transition-all duration-500 group-hover/submit:opacity-100 group-hover/submit:blur-2xl group-hover/submit:scale-105 animate-pulse ${theme.backlight}`}></div>

                                {/* 2. MAIN BUTTON */}
                                <button 
                                    type="submit"
                                    className={`relative w-full py-6 rounded-xl font-display font-black uppercase tracking-[0.2em] overflow-hidden transition-all duration-300 border-2 bg-black/80 backdrop-blur-xl ${theme.border} group-hover/submit:border-white/50 group-hover/submit:scale-[1.02] shadow-2xl`}
                                >
                                    {/* 3. INTERNAL PLASMA FLOW */}
                                    <div className={`absolute inset-0 opacity-30 ${theme.btnBg} mix-blend-screen`}></div>
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay animate-[pan-up_10s_linear_infinite]"></div>
                                    
                                    {/* 4. HIGH VOLTAGE SCANLINE */}
                                    <div className="absolute top-0 left-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 -translate-x-full group-hover/submit:animate-[shine_0.7s_ease-in-out]"></div>
                                    
                                    {/* 5. CONTENT LAYER */}
                                    <div className="relative z-10 flex items-center justify-center gap-4">
                                        <div className={`p-2 rounded-lg border bg-black/50 ${theme.border} ${theme.primary} group-hover/submit:animate-spin-slow`}>
                                            <i className="fas fa-power-off text-xl drop-shadow-[0_0_10px_currentColor]"></i>
                                        </div>
                                        <span className={`text-xl ${theme.btnText} drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] group-hover/submit:text-white transition-colors`}>
                                            INICIAR SESIÓN
                                        </span>
                                        <i className={`fas fa-chevron-right opacity-0 group-hover/submit:opacity-100 group-hover/submit:translate-x-2 transition-all duration-300 ${theme.primary}`}></i>
                                    </div>

                                    {/* 6. CORNER ACCENTS (Cyberpunk touches) */}
                                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/50 rounded-tl-lg"></div>
                                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/50 rounded-br-lg"></div>
                                </button>
                            </div>

                        </form>

                        {/* DEMO ACCESS KEYS - REDESIGNED BUTTONS */}
                        <div className="mt-10 pt-8 border-t border-white/10">
                            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] mb-4 text-center font-bold">
                                Protocolo de Acceso Rápido
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <button 
                                    onClick={() => fillCredentials('ADMIN')}
                                    className={`py-4 rounded-xl border-[3px] transition-all duration-300 flex flex-col items-center justify-center gap-2 group relative overflow-hidden ${
                                        activeRole === 'ADMIN' 
                                        ? 'bg-rose-950/80 border-rose-500 text-rose-400 shadow-[0_0_30px_rgba(225,29,72,0.6)] scale-105 ring-2 ring-offset-2 ring-offset-black ring-rose-500' 
                                        : 'bg-black/60 border-white/10 text-slate-600 hover:border-rose-500/50 hover:text-rose-400 hover:bg-rose-900/20'
                                    }`}
                                >
                                    <i className={`fas fa-shield-alt text-xl ${activeRole === 'ADMIN' ? 'animate-pulse' : ''}`}></i>
                                    <span className="text-[9px] font-black uppercase tracking-widest">Admin</span>
                                    {activeRole === 'ADMIN' && <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500 shadow-[0_0_10px_#f43f5e]"></div>}
                                </button>

                                <button 
                                    onClick={() => fillCredentials('VENDOR')}
                                    className={`py-4 rounded-xl border-[3px] transition-all duration-300 flex flex-col items-center justify-center gap-2 group relative overflow-hidden ${
                                        activeRole === 'VENDOR' 
                                        ? 'bg-[#1e1b4b]/90 border-violet-500 text-violet-400 shadow-[0_0_30px_rgba(139,92,246,0.6)] scale-105 ring-2 ring-offset-2 ring-offset-black ring-violet-500' 
                                        : 'bg-black/60 border-white/10 text-slate-600 hover:border-violet-500/50 hover:text-violet-400 hover:bg-[#1e1b4b]/40'
                                    }`}
                                >
                                    <i className={`fas fa-briefcase text-xl ${activeRole === 'VENDOR' ? 'animate-pulse' : ''}`}></i>
                                    <span className="text-[9px] font-black uppercase tracking-widest">Vendedor</span>
                                    {activeRole === 'VENDOR' && <div className="absolute bottom-0 left-0 w-full h-1 bg-violet-500 shadow-[0_0_10px_#8b5cf6]"></div>}
                                </button>

                                <button 
                                    onClick={() => fillCredentials('PLAYER')}
                                    className={`py-4 rounded-xl border-[3px] transition-all duration-300 flex flex-col items-center justify-center gap-2 group relative overflow-hidden ${
                                        activeRole === 'PLAYER' 
                                        ? 'bg-[#083344]/90 border-cyan-400 text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.6)] scale-105 ring-2 ring-offset-2 ring-offset-black ring-cyan-400' 
                                        : 'bg-black/60 border-white/10 text-slate-600 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-[#083344]/40'
                                    }`}
                                >
                                    <i className={`fas fa-user text-xl ${activeRole === 'PLAYER' ? 'animate-pulse' : ''}`}></i>
                                    <span className="text-[9px] font-black uppercase tracking-widest">Jugador</span>
                                    {activeRole === 'PLAYER' && <div className="absolute bottom-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></div>}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        )}

        {/* --- STATE: BOOTING / ACCESS GRANTED (GRAPHICAL MODE) --- */}
        {(viewState === 'BOOTING' || viewState === 'ACCESS_GRANTED' || viewState === 'ACCESS_DENIED') && (
            <div className="w-full h-[600px] flex items-center justify-center animate-in zoom-in duration-500">
                {activeRole === 'ADMIN' && renderAdminBoot()}
                {activeRole === 'VENDOR' && renderVendorBoot()}
                {activeRole === 'PLAYER' && renderPlayerBoot()}
            </div>
        )}

      </div>
      
      <style>{`
        @keyframes shine {
            0% { transform: translateX(-100%) skewX(-15deg); }
            100% { transform: translateX(200%) skewX(-15deg); }
        }
        @keyframes scan {
            0%, 100% { top: 5%; opacity: 0; }
            50% { top: 95%; opacity: 1; }
        }
        @keyframes pan-up { from { background-position: 0 0; } to { background-position: 0 -100px; } }
      `}</style>
    </div>
  );
}
