
import React from 'react';
import { motion } from 'framer-motion';

interface QuantumReactorProps {
  status: 'ILIMITADO' | 'RESTRINGIDO';
  color?: string;
}

export default function QuantumReactor({ status, color = '#00D1FF' }: QuantumReactorProps) {
  const isRestricted = status === 'RESTRINGIDO';
  const activeColor = isRestricted ? '#FF0033' : color;

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Órbitas Externas */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 border-2 border-dashed rounded-full opacity-20"
        style={{ borderColor: activeColor }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute inset-4 border border-dotted rounded-full opacity-30"
        style={{ borderColor: activeColor }}
      />

      {/* Órbitas Atómicas (Efecto Quantum) */}
      <motion.div
        animate={{ rotateX: [0, 360], rotateY: [0, 180] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-full h-12 border-2 rounded-full opacity-40"
        style={{ borderColor: activeColor, perspective: '1000px' }}
      />
      <motion.div
        animate={{ rotateY: [0, 360], rotateX: [0, 180] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute h-full w-12 border-2 rounded-full opacity-40"
        style={{ borderColor: activeColor, perspective: '1000px' }}
      />

      {/* Core Central */}
      <div className={`relative z-10 w-24 h-24 bg-black rounded-full border-4 flex items-center justify-center shadow-2xl transition-colors duration-700`}
           style={{ borderColor: activeColor, boxShadow: `0 0 40px ${activeColor}50, inset 0 0 20px ${activeColor}30` }}>
        
        {isRestricted ? (
          <i className="fas fa-lock text-3xl animate-pulse" style={{ color: activeColor }}></i>
        ) : (
          <div className="flex flex-col items-center">
             <i className="fas fa-infinity text-4xl mb-1" style={{ color: activeColor, filter: `drop-shadow(0 0 10px ${activeColor})` }}></i>
             <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: activeColor }}>ENERGY_SYNC</span>
          </div>
        )}

        {/* Brillo de Fondo */}
        <div className="absolute inset-0 bg-current opacity-10 blur-xl rounded-full animate-pulse" style={{ color: activeColor }}></div>
      </div>

      {/* Partículas Orbitantes */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ 
            rotate: 360,
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 3 + i, repeat: Infinity, ease: "linear" }}
          className="absolute w-2 h-2 rounded-full shadow-lg"
          style={{ 
            backgroundColor: activeColor, 
            boxShadow: `0 0 10px ${activeColor}`,
            left: '50%',
            top: '50%',
            marginLeft: '-4px',
            marginTop: '-4px',
            transformOrigin: `${40 + (i * 20)}px center`
          }}
        />
      ))}
    </div>
  );
}
