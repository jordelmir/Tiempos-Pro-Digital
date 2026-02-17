
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency } from '../constants';
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
  const [stage, setStage] = useState<'INIT' | 'BEAM' | 'MATERIALIZE' | 'REVELATION' | 'PAYOUT' | 'DISMISS'>('INIT');
  const [counter, setCounter] = useState(0);
  const [internalData, setInternalData] = useState<WinnerOverlayProps['data']>(null);

  useEffect(() => {
    if (isOpen && data) {
      setInternalData(data);
      setStage('INIT');
      setCounter(0);
      
      if (navigator.vibrate) navigator.vibrate([200, 50, 200, 50, 500]);

      const sequence = [
        setTimeout(() => setStage('BEAM'), 100),
        setTimeout(() => setStage('MATERIALIZE'), 800),
        setTimeout(() => setStage('REVELATION'), 1500),
        setTimeout(() => {
          setStage('PAYOUT');
          const duration = 2000;
          const frameRate = 1000 / 60;
          const totalFrames = duration / frameRate;
          let frame = 0;
          const interval = setInterval(() => {
            frame++;
            const progress = frame / totalFrames;
            const easeOutExpo = 1 - Math.pow(2, -10 * progress);
            setCounter(Math.floor(data.amount * easeOutExpo));
            if (frame >= totalFrames) {
                setCounter(data.amount);
                clearInterval(interval);
            }
          }, frameRate);
        }, 5500)
      ];

      return () => sequence.forEach(clearTimeout);
    }
  }, [isOpen, data]);

  const handleCollect = () => {
    setStage('DISMISS');
    setTimeout(onClose, 800);
  };

  if (!isOpen && stage !== 'DISMISS') return null;
  if (!internalData) return null;

  const isReventado = internalData.type === 'REVENTADOS';
  const themeColor = isReventado ? '#ff003c' : '#0aff60'; 
  const secondaryColor = isReventado ? '#fbbf24' : '#00f0ff'; 

  return createPortal(
    <div className={`fixed inset-0 z-[100000] flex items-center justify-center overflow-hidden font-sans transition-all duration-[800ms] ease-in-out ${stage === 'DISMISS' ? 'opacity-0 scale-150 blur-3xl' : 'opacity-100'}`}>
      
      {/* BACKGROUND DEPTH LAYER */}
      <div className={`absolute inset-0 bg-black/98 transition-opacity duration-1000 ${stage === 'INIT' ? 'opacity-0' : 'opacity-100'}`}>
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_80%)]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%),linear-gradient(90deg,rgba(255,0,0,0.1),rgba(0,255,0,0.05),rgba(0,0,255,0.1))] bg-[length:100%_4px,4px_100%] opacity-50"></div>
      </div>

      {/* QUANTUM BEAM EFFECT */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full transition-all duration-[1500ms] cubic-bezier(0.19, 1, 0.22, 1) origin-top ${stage === 'INIT' ? 'scale-y-0 opacity-0' : 'scale-y-100 opacity-100'}`}>
          <div className="w-full h-full opacity-60" style={{ clipPath: 'polygon(45% 0%, 55% 0%, 100% 100%, 0% 100%)', background: `linear-gradient(180deg, ${themeColor} 0%, transparent 85%)` }}></div>
          {[...Array(50)].map((_, i) => (
              <div key={i} className="absolute rounded-full animate-quantum-particle" style={{ width: `${Math.random() * 4 + 1}px`, height: `${Math.random() * 50 + 20}px`, left: `${Math.random() * 100}%`, bottom: `-5%`, backgroundColor: themeColor, boxShadow: `0 0 30px ${themeColor}`, animationDuration: `${1 + Math.random() * 2}s`, animationDelay: `${Math.random() * 5}s` }}></div>
          ))}
      </div>

      {/* THE MAIN TROPHY CONTAINER */}
      <div className={`relative z-10 transition-all duration-[1200ms] cubic-bezier(0.34, 1.56, 0.64, 1) ${stage !== 'INIT' && stage !== 'BEAM' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-60 scale-50'}`}>
          <div className={`absolute -inset-24 blur-[150px] opacity-40 animate-pulse rounded-full`} style={{ backgroundColor: themeColor }}></div>
          
          <div className={`relative w-[360px] md:w-[620px] bg-[#02050a] border-[6px] rounded-[5rem] p-1 shadow-[0_0_150px_rgba(0,0,0,1)] transition-all duration-700 ${stage === 'PAYOUT' ? 'scale-110' : 'scale-100'}`} style={{ borderColor: themeColor, boxShadow: `0 0 120px ${themeColor}60, inset 0 0 60px ${themeColor}40` }}>
              
              <div className="relative bg-black rounded-[4.8rem] p-12 flex flex-col items-center text-center overflow-hidden">
                  {/* Internal Texture */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

                  <div className="relative z-20 mb-10">
                      <div className="px-12 py-4 rounded-full border-2 bg-black/90 backdrop-blur-2xl shadow-2xl animate-bounce-slow" style={{ borderColor: themeColor }}>
                          <span className="text-sm font-display font-black uppercase tracking-[0.8em]" style={{ color: themeColor, textShadow: `0 0 10px ${themeColor}` }}>
                              {isReventado ? '⚠️ PROTOCOLO_REVENTADO' : 'NODO_GANADOR_DETECTADO'}
                          </span>
                      </div>
                  </div>

                  <div className="mb-12 relative scale-125">
                      <AnimatedIconUltra profile={{ animation: 'spin3d', theme: isReventado ? 'neon' : 'cyber', speed: 3, size: 1.5 }}>
                          <i className={`fas ${isReventado ? 'fa-meteor' : 'fa-crown'} text-8xl`} style={{ color: secondaryColor, filter: `drop-shadow(0 0 40px ${themeColor})` }}></i>
                      </AnimatedIconUltra>
                  </div>

                  <div className="relative mb-12 w-full">
                      <div className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.6em] mb-6 font-black opacity-60">Vector de Acierto</div>
                      <div className="relative inline-block scale-110 md:scale-125">
                          <h1 className="text-[12rem] md:text-[15rem] font-display font-black text-white relative z-10 tracking-tighter leading-none filter drop-shadow-[0_0_60px_rgba(255,255,255,0.5)]">{internalData.number}</h1>
                          <h1 className="text-[12rem] md:text-[15rem] font-display font-black absolute top-0 left-0 z-0 opacity-40 animate-glitch-1 mix-blend-screen" style={{ color: secondaryColor }}>{internalData.number}</h1>
                          <h1 className="text-[12rem] md:text-[15rem] font-display font-black absolute top-0 left-0 z-0 opacity-40 animate-glitch-2 mix-blend-screen" style={{ color: themeColor }}>{internalData.number}</h1>
                      </div>
                  </div>

                  {/* DYNAMIC PAYOUT SECTION */}
                  <div className={`relative w-full border-t-2 border-white/5 transition-all duration-[1500ms] ${stage === 'PAYOUT' ? 'opacity-100 translate-y-0 max-h-[500px] pt-12' : 'opacity-0 translate-y-20 max-h-0 pointer-events-none'}`}>
                      <div className="text-[12px] font-black text-slate-500 uppercase tracking-[0.8em] mb-6">Inyección de Fondos_Core</div>
                      <div className="flex items-baseline justify-center gap-6 mb-12">
                          <span className="text-5xl font-display text-white/30 font-black">₡</span>
                          <h2 className="text-8xl md:text-9xl font-display font-black text-white tracking-tighter tabular-nums text-glow-white">{counter.toLocaleString('es-CR')}</h2>
                      </div>

                      <button 
                        onClick={handleCollect}
                        className="w-full py-8 rounded-[2.5rem] font-display font-black uppercase text-2xl tracking-[0.8em] shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden group/btn hover:scale-105 active:scale-95 transition-all" 
                        style={{ backgroundColor: themeColor, color: '#000' }}
                      >
                          <div className="absolute inset-0 bg-white/50 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 skew-x-12"></div>
                          <div className="relative z-10 flex items-center justify-center gap-6">
                            <i className="fas fa-money-bill-wave text-3xl animate-pulse"></i> LIQUIDAR_AHORA
                          </div>
                      </button>
                  </div>

                  <div className="mt-12 flex items-center gap-8 opacity-20 w-full">
                      <div className="h-px flex-1 bg-white"></div>
                      <p className="text-[10px] font-mono text-white uppercase tracking-[1.2em] font-black">AUTHENTICATED_BY_PHRONT_V3</p>
                      <div className="h-px flex-1 bg-white"></div>
                  </div>
              </div>
          </div>
      </div>

      <style>{`
        @keyframes quantum-particle { 0% { transform: translateY(0) scale(0); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-120vh) scale(1.5); opacity: 0; } }
        @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes glitch-1 { 0% { transform: translate(0); } 20% { transform: translate(-20px, 8px); } 40% { transform: translate(20px, -8px); } 60% { transform: translate(-15px, 12px); } 80% { transform: translate(15px, -12px); } 100% { transform: translate(0); } }
        @keyframes glitch-2 { 0% { transform: translate(0); } 33% { transform: translate(10px, -5px); } 66% { transform: translate(-10px, 5px); } 100% { transform: translate(0); } }
        .text-glow-white { text-shadow: 0 0 40px rgba(255,255,255,0.4); }
      `}</style>
    </div>,
    document.body
  );
}
