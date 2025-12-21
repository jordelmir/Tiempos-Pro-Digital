'use client'


import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency } from '@/constants';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

interface WinnerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    amount: number;
    number: string;
    draw: string;
    type: 'TIEMPOS' | 'REVENTADOS';
    newBalance?: number; 
  } | null;
}

export default function WinnerOverlay({ isOpen, onClose, data }: WinnerOverlayProps) {
  const [stage, setStage] = useState<'INIT' | 'BEAM' | 'MATERIALIZE' | 'STABLE' | 'DISMISS'>('INIT');
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    if (isOpen && data) {
      setStage('INIT');
      setCounter(0);
      
      // Feedback háptico opcional
      if (navigator.vibrate) navigator.vibrate([100, 30, 100, 30, 500]);

      // Secuencia Cinematográfica
      const timers = [
        setTimeout(() => setStage('BEAM'), 50),
        setTimeout(() => setStage('MATERIALIZE'), 600),
        setTimeout(() => {
          setStage('STABLE');
          // Contador progresivo
          const duration = 1500;
          const frameRate = 1000 / 60;
          const totalFrames = duration / frameRate;
          let frame = 0;
          const interval = setInterval(() => {
            frame++;
            const progress = frame / totalFrames;
            const easeOutQuad = 1 - (1 - progress) * (1 - progress);
            setCounter(Math.floor(data.amount * easeOutQuad));
            if (frame >= totalFrames) {
                setCounter(data.amount);
                clearInterval(interval);
            }
          }, frameRate);
        }, 1200)
      ];

      return () => timers.forEach(clearTimeout);
    } else {
      setStage('DISMISS');
    }
  }, [isOpen, data]);

  if (!isOpen && stage === 'DISMISS') return null;
  if (!data) return null;

  const isReventado = data.type === 'REVENTADOS';
  const themeColor = isReventado ? '#ff003c' : '#0aff60'; 
  const glowColor = isReventado ? 'rgba(255, 0, 60, 0.8)' : 'rgba(10, 255, 96, 0.8)';
  const secondaryColor = isReventado ? '#fbbf24' : '#00f0ff'; 

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden font-sans">
      
      {/* 1. DARK CORE DIMMER */}
      <div 
        className={`absolute inset-0 bg-black/98 transition-opacity duration-1000 ${stage === 'INIT' ? 'opacity-0' : 'opacity-100'}`}
      >
          {/* Neural Web Overlay */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-40"></div>
      </div>

      {/* 2. HYPER-BEAM PROJECTOR (Fondo) */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full pointer-events-none transition-all duration-[1000ms] cubic-bezier(0.19, 1, 0.22, 1) origin-top ${stage === 'INIT' ? 'scale-y-0 opacity-0' : 'scale-y-100 opacity-100'}`}>
          <div 
            className="w-full h-full opacity-40"
            style={{ 
                clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)',
                background: `linear-gradient(180deg, ${themeColor} 0%, transparent 85%)`
            }}
          ></div>
          
          {/* Quantum Particles */}
          <div className="absolute inset-0">
              {[...Array(40)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute rounded-full animate-quantum-rise"
                    style={{
                        width: `${Math.random() * 4 + 1}px`,
                        height: `${Math.random() * 20 + 5}px`,
                        left: `${Math.random() * 100}%`,
                        bottom: `-10%`,
                        backgroundColor: i % 2 === 0 ? '#fff' : themeColor,
                        boxShadow: `0 0 15px ${themeColor}`,
                        animationDuration: `${1.5 + Math.random() * 2}s`,
                        animationDelay: `${Math.random() * 3}s`
                    }}
                  ></div>
              ))}
          </div>
      </div>

      {/* 3. THE WINNER CONSTRUCT (Frente) */}
      <div className={`relative z-10 perspective-2000 transition-all duration-1000 cubic-bezier(0.175, 0.885, 0.32, 1.275) ${stage === 'MATERIALIZE' || stage === 'STABLE' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-60 scale-50 rotate-x-45'}`}>
          
          {/* Energy Aura */}
          <div className={`absolute -inset-10 blur-[100px] opacity-40 animate-pulse rounded-full transition-colors duration-1000`} style={{ backgroundColor: themeColor }}></div>

          <div 
            className={`relative w-[340px] md:w-[500px] bg-[#050a14] border-[3px] rounded-[3.5rem] p-1 overflow-hidden shadow-2xl transition-all duration-500 ${stage === 'STABLE' ? 'rotate-0' : 'rotate-3'}`}
            style={{ 
                borderColor: themeColor,
                boxShadow: `0 0 80px ${glowColor}, inset 0 0 40px ${glowColor}`
            }}
          >
              {/* Scanline Sweep */}
              <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-b from-white/20 to-transparent z-40 animate-[scanline_2.5s_linear_infinite] pointer-events-none"></div>

              <div className="relative bg-black rounded-[3.3rem] p-10 flex flex-col items-center text-center overflow-hidden">
                  
                  {/* HUD Rings */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] opacity-10 pointer-events-none">
                      <div className="absolute inset-0 border-2 border-dashed border-white rounded-full animate-[spin_30s_linear_infinite]"></div>
                      <div className="absolute inset-10 border border-white rounded-full animate-[spin_20s_linear_infinite_reverse]"></div>
                  </div>

                  {/* HEADER */}
                  <div className="relative z-20 mb-8">
                      <div 
                        className="px-8 py-3 rounded-full border-2 bg-black/60 backdrop-blur-md shadow-2xl animate-bounce-slow"
                        style={{ borderColor: themeColor }}
                      >
                          <span className="text-xs font-black uppercase tracking-[0.5em] text-glow-sm" style={{ color: themeColor }}>
                              {isReventado ? '⚠️ PROTOCOLO OVERDRIVE' : 'SISTEMA PREMIADO'}
                          </span>
                      </div>
                  </div>

                  {/* ICON: CINEMATIC TROPHY */}
                  <div className="mb-10 relative">
                      <div className="absolute inset-0 blur-3xl opacity-60 scale-150 animate-pulse" style={{ backgroundColor: themeColor }}></div>
                      <AnimatedIconUltra profile={{ animation: 'spin3d', theme: isReventado ? 'neon' : 'cyber', speed: 3, size: 1.5 }}>
                          <div className="relative">
                              <i className={`fas ${isReventado ? 'fa-meteor' : 'fa-gem'} text-8xl drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]`} style={{ color: isReventado ? '#ff003c' : '#fbbf24' }}></i>
                              <i className="fas fa-star text-white text-2xl absolute -top-4 -right-6 animate-spin-slow"></i>
                          </div>
                      </AnimatedIconUltra>
                  </div>

                  {/* NUMBER: GLITCH CORE */}
                  <div className="relative mb-10 w-full">
                      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.4em] mb-3 font-bold">Vector Ganador</div>
                      <div className="relative inline-block px-10 py-2">
                          <h1 className="text-9xl md:text-[10rem] font-mono font-black text-white relative z-10 tracking-tighter leading-none filter drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                              {data.number}
                          </h1>
                          {/* Glitch Layers */}
                          <h1 className="text-9xl md:text-[10rem] font-mono font-black absolute top-0 left-0 z-0 opacity-40 animate-glitch-fast mix-blend-screen" style={{ color: secondaryColor }}>{data.number}</h1>
                          <h1 className="text-9xl md:text-[10rem] font-mono font-black absolute top-0 left-0 z-0 opacity-40 animate-glitch-slow mix-blend-screen" style={{ color: themeColor }}>{data.number}</h1>
                      </div>
                  </div>

                  {/* AMOUNT: IMPACTO FINANCIERO */}
                  <div className="relative w-full border-t border-white/10 pt-8 mb-8">
                      <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em] mb-2">Liquidación de Créditos</div>
                      <div className="flex items-baseline justify-center gap-3">
                          <span className="text-3xl font-mono opacity-40 text-white font-black">₡</span>
                          <h2 className="text-6xl md:text-7xl font-mono font-black text-white tracking-tighter tabular-nums drop-shadow-lg">
                              {counter.toLocaleString('es-CR')}
                          </h2>
                      </div>
                  </div>

                  {/* BUTTON */}
                  <button 
                    onClick={onClose}
                    className="w-full py-6 rounded-2xl font-display font-black uppercase text-sm tracking-[0.5em] transition-all hover:scale-[1.02] active:scale-95 shadow-2xl relative overflow-hidden group/btn"
                    style={{ backgroundColor: themeColor, color: '#000' }}
                  >
                      <div className="absolute inset-0 bg-white/40 -translate-x-full group-hover/btn:animate-shine-fast"></div>
                      <div className="relative z-10 flex items-center justify-center gap-4">
                          <i className="fas fa-hand-holding-usd text-2xl"></i>
                          COBRAR PREMIO
                      </div>
                  </button>

                  <div className="mt-8 flex items-center gap-4 opacity-30">
                      <div className="h-px flex-1 bg-white/20"></div>
                      <p className="text-[8px] font-mono text-white uppercase tracking-[1em]">AUTH-SECURED-v3.5</p>
                      <div className="h-px flex-1 bg-white/20"></div>
                  </div>

              </div>
          </div>
      </div>

      <style>{`
        @keyframes quantum-rise {
            0% { transform: translateY(0) scale(0); opacity: 0; }
            50% { opacity: 0.8; }
            100% { transform: translateY(-120vh) scale(1); opacity: 0; }
        }
        @keyframes scanline {
            0% { transform: translateY(-100%); opacity: 0; }
            50% { opacity: 0.5; }
            100% { transform: translateY(1000%); opacity: 0; }
        }
        @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        @keyframes glitch-fast {
            0% { transform: translate(0); clip-path: inset(0); }
            20% { transform: translate(-10px, 5px); clip-path: inset(10% 0 80% 0); }
            40% { transform: translate(10px, -5px); clip-path: inset(80% 0 10% 0); }
            60% { transform: translate(-5px, 10px); clip-path: inset(40% 0 40% 0); }
            80% { transform: translate(5px, -10px); clip-path: inset(20% 0 60% 0); }
            100% { transform: translate(0); clip-path: inset(0); }
        }
        @keyframes glitch-slow {
            0% { transform: translate(0); }
            33% { transform: translate(4px, -2px); }
            66% { transform: translate(-4px, 2px); }
            100% { transform: translate(0); }
        }
        @keyframes shine-fast {
            0% { transform: translateX(-100%) skewX(-15deg); }
            100% { transform: translateX(250%) skewX(-15deg); }
        }
        .text-glow-sm { text-shadow: 0 0 10px currentColor; }
        .rotate-x-45 { transform: rotateX(45deg); }
        .perspective-2000 { perspective: 2000px; }
      `}</style>
    </div>,
    document.body
  );
}
