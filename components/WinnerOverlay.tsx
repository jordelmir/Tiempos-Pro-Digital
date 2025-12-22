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
  const [stage, setStage] = useState<
    'INIT' | 'BEAM' | 'MATERIALIZE' | 'REVELATION' | 'PAYOUT' | 'DISMISS'
  >('INIT');
  const [counter, setCounter] = useState(0);
  const [internalData, setInternalData] = useState<WinnerOverlayProps['data']>(null);

  useEffect(() => {
    if (isOpen && data) {
      setInternalData(data);
      setStage('INIT');
      setCounter(0);

      if (navigator.vibrate) navigator.vibrate([100, 30, 100, 30, 500]);

      const sequence = [
        setTimeout(() => setStage('BEAM'), 50),
        setTimeout(() => setStage('MATERIALIZE'), 600),
        setTimeout(() => setStage('REVELATION'), 1200),
        // FASE 2: TRAS 4 SEGUNDOS DE REVELACIÓN, MOSTRAR MONTO Y BOTÓN
        setTimeout(() => {
          setStage('PAYOUT');
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
        }, 5200), // 1.2s inicio + 4s de gloria = 5.2s total
      ];

      return () => sequence.forEach(clearTimeout);
    }
  }, [isOpen, data]);

  const handleCollect = () => {
    setStage('DISMISS');
    setTimeout(onClose, 850);
  };

  if (!isOpen && stage !== 'DISMISS') return null;
  if (!internalData) return null;

  const isReventado = internalData.type === 'REVENTADOS';
  const themeColor = isReventado ? '#ff003c' : '#0aff60';
  const glowColor = isReventado ? 'rgba(255, 0, 60, 0.8)' : 'rgba(10, 255, 96, 0.8)';
  const secondaryColor = isReventado ? '#fbbf24' : '#00f0ff';

  return createPortal(
    <div
      className={`fixed inset-0 z-[100000] flex items-center justify-center overflow-hidden font-sans transition-all duration-[800ms] ease-in-out pointer-events-auto ${stage === 'DISMISS' ? 'opacity-0 scale-110 blur-xl' : 'opacity-100'}`}
    >
      <div
        className={`absolute inset-0 bg-black/95 transition-opacity duration-1000 ${stage === 'INIT' ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_75%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-40"></div>
      </div>

      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full transition-all duration-[1200ms] cubic-bezier(0.19, 1, 0.22, 1) origin-top ${stage === 'INIT' ? 'scale-y-0 opacity-0' : 'scale-y-100 opacity-100'}`}
      >
        <div
          className="w-full h-full opacity-50"
          style={{
            clipPath: 'polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)',
            background: `linear-gradient(180deg, ${themeColor} 0%, transparent 90%)`,
          }}
        ></div>
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-quantum-rise"
              style={{
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 30 + 10}px`,
                left: `${Math.random() * 100}%`,
                bottom: `-10%`,
                backgroundColor: themeColor,
                boxShadow: `0 0 20px ${themeColor}`,
                animationDuration: `${2 + Math.random() * 2}s`,
                animationDelay: `${Math.random() * 4}s`,
              }}
            ></div>
          ))}
        </div>
      </div>

      <div
        className={`relative z-10 transition-all duration-[1000ms] cubic-bezier(0.34, 1.56, 0.64, 1) ${stage !== 'INIT' && stage !== 'BEAM' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-40 scale-75'}`}
        style={{ willChange: 'transform, opacity' }}
      >
        <div
          className={`absolute -inset-16 blur-[120px] opacity-30 animate-pulse rounded-full`}
          style={{ backgroundColor: themeColor }}
        ></div>
        <div
          className={`relative w-[340px] md:w-[540px] bg-[#02050a] border-[4px] rounded-[4rem] p-1 shadow-2xl overflow-hidden transition-all duration-500 ${stage === 'PAYOUT' ? 'scale-105' : 'scale-100'}`}
          style={{
            borderColor: themeColor,
            boxShadow: `0 0 100px ${glowColor}, inset 0 0 50px ${glowColor}`,
          }}
        >
          <div className="relative bg-black rounded-[3.8rem] p-10 flex flex-col items-center text-center">
            <div className="relative z-20 mb-8">
              <div
                className="px-10 py-3 rounded-full border-2 bg-black/80 backdrop-blur-xl shadow-2xl animate-bounce-slow"
                style={{ borderColor: themeColor }}
              >
                <span
                  className="text-xs font-black uppercase tracking-[0.6em] text-glow-sm"
                  style={{ color: themeColor }}
                >
                  {isReventado ? '⚠️ PROTOCOLO REVENTADO' : 'NUEVOS TIEMPOS'}
                </span>
              </div>
            </div>

            <div className="mb-10 relative">
              <AnimatedIconUltra
                profile={{
                  animation: 'spin3d',
                  theme: isReventado ? 'neon' : 'cyber',
                  speed: 3,
                  size: 1.4,
                }}
              >
                <i
                  className={`fas ${isReventado ? 'fa-meteor' : 'fa-gem'} text-7xl`}
                  style={{
                    color: isReventado ? '#ff003c' : '#fbbf24',
                    filter: `drop-shadow(0 0 30px ${themeColor})`,
                  }}
                ></i>
              </AnimatedIconUltra>
            </div>

            <div className="relative mb-10 w-full">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.5em] mb-4 font-black">
                Vector Ganador
              </div>
              <div className="relative inline-block">
                <h1 className="text-[10rem] md:text-[12rem] font-mono font-black text-white relative z-10 tracking-tighter leading-none filter drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]">
                  {internalData.number}
                </h1>
                <h1
                  className="text-[10rem] md:text-[12rem] font-mono font-black absolute top-0 left-0 z-0 opacity-30 animate-glitch-fast mix-blend-screen"
                  style={{ color: secondaryColor }}
                >
                  {internalData.number}
                </h1>
                <h1
                  className="text-[10rem] md:text-[12rem] font-mono font-black absolute top-0 left-0 z-0 opacity-30 animate-glitch-slow mix-blend-screen"
                  style={{ color: themeColor }}
                >
                  {internalData.number}
                </h1>
              </div>
            </div>

            {/* SECCIÓN DINÁMICA: MONTO Y COBRO */}
            <div
              className={`relative w-full border-t border-white/10 transition-all duration-1000 ${stage === 'PAYOUT' ? 'opacity-100 translate-y-0 max-h-[400px] pt-8' : 'opacity-0 translate-y-10 max-h-0 pointer-events-none'}`}
            >
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.6em] mb-3">
                Premio Acreditado
              </div>
              <div className="flex items-baseline justify-center gap-4 mb-8">
                <span className="text-4xl font-mono opacity-40 text-white font-black">₡</span>
                <h2 className="text-7xl md:text-8xl font-mono font-black text-white tracking-tighter tabular-nums drop-shadow-2xl">
                  {counter.toLocaleString('es-CR')}
                </h2>
              </div>

              <button
                onClick={handleCollect}
                className="w-full py-7 rounded-2xl font-display font-black uppercase text-xl tracking-[0.6em] shadow-2xl relative overflow-hidden group/btn hover:scale-[1.02] active:scale-95 transition-all"
                style={{ backgroundColor: themeColor, color: '#000' }}
              >
                <div className="absolute inset-0 bg-white/40 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 skew-x-12"></div>
                <div className="relative z-10 flex items-center justify-center gap-5">
                  <i className="fas fa-coins text-2xl animate-bounce"></i> COBRAR
                </div>
              </button>
            </div>

            <div className="mt-10 flex items-center gap-5 opacity-20 w-full">
              <div className="h-px flex-1 bg-white"></div>
              <p className="text-[9px] font-mono text-white uppercase tracking-[1em]">
                SYSTEM-PAYOUT-v6
              </p>
              <div className="h-px flex-1 bg-white"></div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes quantum-rise { 0% { transform: translateY(0) scale(0); opacity: 0; } 50% { opacity: 0.8; } 100% { transform: translateY(-120vh) scale(1.2); opacity: 0; } }
        @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes glitch-fast { 0% { transform: translate(0); clip-path: inset(0); } 20% { transform: translate(-15px, 5px); clip-path: inset(10% 0 80% 0); } 40% { transform: translate(15px, -5px); clip-path: inset(80% 0 10% 0); } 60% { transform: translate(-10px, 10px); clip-path: inset(40% 0 40% 0); } 80% { transform: translate(10px, -10px); clip-path: inset(20% 0 60% 0); } 100% { transform: translate(0); clip-path: inset(0); } }
        @keyframes glitch-slow { 0% { transform: translate(0); } 33% { transform: translate(6px, -3px); } 66% { transform: translate(-6px, 3px); } 100% { transform: translate(0); } }
      `}</style>
    </div>,
    document.body
  );
}
