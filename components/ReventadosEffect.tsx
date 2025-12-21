import React, { useEffect, useState } from 'react';

export default function ReventadosEffect() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Generate embers
  const embers = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDuration: `${2 + Math.random() * 3}s`,
    delay: `${Math.random() * 2}s`,
    size: `${2 + Math.random() * 4}px`
  }));

  return (
    <div className={`absolute inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* 1. RED ALARM VIGNETTE (Pulsing) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(153,27,27,0.4)_100%)] animate-[pulse_2s_ease-in-out_infinite] mix-blend-screen"></div>
      
      {/* 2. OVERDRIVE SCANLINES */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.1)_50%,transparent_50%)] bg-[length:100%_4px] pointer-events-none z-10"></div>

      {/* 3. RISING EMBERS (Sparks) */}
      {embers.map((ember) => (
        <div
          key={ember.id}
          className="absolute bottom-0 bg-orange-500 rounded-full blur-[1px] animate-rise"
          style={{
            left: ember.left,
            width: ember.size,
            height: ember.size,
            animationDuration: ember.animationDuration,
            animationDelay: ember.delay,
            boxShadow: '0 0 10px #ff5f00'
          }}
        />
      ))}

      {/* 4. WARNING HUD ELEMENTS */}
      <div className="absolute top-10 left-0 w-full flex justify-between px-10 opacity-60">
        <div className="flex flex-col gap-1">
            <div className="text-[10px] font-mono text-red-500 font-bold uppercase tracking-[0.3em] animate-pulse">
                ⚠ Protocolo: Overdrive
            </div>
            <div className="w-32 h-0.5 bg-red-500/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-red-500 w-1/2 animate-[shine_1s_linear_infinite]"></div>
            </div>
        </div>
        <div className="text-right">
             <div className="text-[10px] font-mono text-red-500 font-bold uppercase tracking-[0.3em] animate-pulse">
                RIESGO: EXTREMO (200x)
            </div>
             <div className="flex justify-end gap-1 mt-1">
                 {[1,2,3].map(i => (
                     <div key={i} className="w-2 h-2 bg-red-600 animate-ping" style={{animationDelay: `${i * 0.2}s`}}></div>
                 ))}
             </div>
        </div>
      </div>

      {/* 5. BOTTOM HEAT HAZE (Visual Distortion Imitation) */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-red-900/20 to-transparent blur-xl"></div>

      <style>{`
        @keyframes rise {
          0% { transform: translateY(100%) scale(1); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-100vh) scale(0); opacity: 0; }
        }
        @keyframes shine {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
