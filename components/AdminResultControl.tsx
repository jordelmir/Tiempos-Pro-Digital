
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DrawTime, LotteryRegion } from '../types';
import { api } from '../services/edgeApi';
import { useAuthStore } from '../store/useAuthStore';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import AnimatedIconUltra from './ui/AnimatedIconUltra';
import MatrixRain from './ui/MatrixRain';

interface AdminResultControlProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishSuccess?: (data: any) => void;
  initialDraw?: DrawTime | null;
  initialRegion?: LotteryRegion;
}

export default function AdminResultControl({ isOpen, onClose, onPublishSuccess, initialDraw, initialRegion }: AdminResultControlProps) {
  useBodyScrollLock(isOpen); 

  const user = useAuthStore(s => s.user);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDraw, setSelectedDraw] = useState<DrawTime>(DrawTime.NOCHE);
  const [selectedRegion, setSelectedRegion] = useState<LotteryRegion>(LotteryRegion.TICA);
  const [winningNumber, setWinningNumber] = useState('');
  const [isReventado, setIsReventado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [charging, setCharging] = useState(false);
  const [progress, setProgress] = useState(0);

  // RESET AL CAMBIAR REGIÓN O SORTEO
  useEffect(() => {
    setSuccess(false);
    setLoading(false);
    setProgress(0);
    setCharging(false);
    setWinningNumber('');
    if (selectedRegion !== LotteryRegion.TICA) {
        setIsReventado(false);
    }
  }, [selectedRegion, selectedDraw]);

  const theme = useMemo(() => {
      switch (selectedDraw) {
          case DrawTime.MEDIODIA: return {
              name: 'solar', color: 'text-cyber-solar', border: 'border-cyber-solar', bgHex: '#0c0400', 
              matrixHex: '#ff5f00', shadow: 'shadow-neon-solar', glow: 'bg-cyber-solar', ring: 'ring-cyber-solar/30',
              textGlow: 'drop-shadow-[0_0_15px_#ff5f00]'
          };
          case DrawTime.TARDE: return {
              name: 'vapor', color: 'text-cyber-vapor', border: 'border-cyber-vapor', bgHex: '#05020c', 
              matrixHex: '#7c3aed', shadow: 'shadow-neon-vapor', glow: 'bg-cyber-vapor', ring: 'ring-cyber-vapor/30',
              textGlow: 'drop-shadow-[0_0_15px_#7c3aed]'
          };
          case DrawTime.NOCHE: 
          default: return {
              name: 'abyss', color: 'text-blue-400', border: 'border-blue-600', bgHex: '#02040a', 
              matrixHex: '#2563eb', shadow: 'shadow-neon-blue', glow: 'bg-cyber-blue', ring: 'ring-blue-600/30',
              textGlow: 'drop-shadow-[0_0_15px_#2563eb]'
          };
      }
  }, [selectedDraw]);

  useEffect(() => {
      if (isOpen) {
          setCharging(false); setProgress(0); setLoading(false); setSuccess(false);
          setWinningNumber(''); setIsReventado(false);
          if (initialDraw) setSelectedDraw(initialDraw);
          if (initialRegion) setSelectedRegion(initialRegion);
      }
  }, [isOpen, initialDraw, initialRegion]);

  const handleInteractionStart = () => {
      if (!winningNumber || loading || success) return;
      setCharging(true);
  };

  const handleInteractionEnd = () => {
      if (progress < 100 && !success) { setCharging(false); setProgress(0); }
  };

  useEffect(() => {
      let interval: any;
      if (charging && !loading && !success) {
          interval = setInterval(() => {
              setProgress(prev => {
                  if (prev >= 100) { clearInterval(interval); return 100; }
                  return prev + 5;
              });
          }, 150);
      } else {
          clearInterval(interval);
          if (!success && !loading) setProgress(0);
      }
      return () => clearInterval(interval);
  }, [charging, loading, success]);

  useEffect(() => {
      if (progress === 100 && !loading && !success) handleExecutePublication();
  }, [progress]);

  const handleExecutePublication = async () => {
    setLoading(true);
    try {
        const res = await api.publishDrawResult({
            date, drawTime: selectedDraw, region: selectedRegion, winningNumber, 
            isReventado, actor_id: user!.id
        });
        
        if (!res.error) {
            setSuccess(true);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            // Desbloquear tras un breve delay para permitir más inyecciones
            setTimeout(() => { 
                setSuccess(false);
                setProgress(0);
                setLoading(false);
                setCharging(false);
                setWinningNumber('');
                onPublishSuccess?.(res.data);
            }, 1500);
        } else {
            alert(res.error); setLoading(false); setCharging(false); setProgress(0);
        }
    } catch (e) { alert("Fallo de Inyección de Datos"); setLoading(false); }
  };

  const isTica = selectedRegion === LotteryRegion.TICA;

  if (!isOpen || !user) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/95 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar p-0 md:p-8 lg:p-16 font-sans">
        
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-black"></div>
            <div className="absolute inset-0 opacity-10 mix-blend-screen">
                <MatrixRain colorHex={theme.matrixHex} speed={0.4} density="MEDIUM" />
            </div>
            <div className={`absolute inset-0 transition-colors duration-1000 ${theme.bgHex}`} style={{ background: `radial-gradient(circle at center, ${theme.matrixHex}15 0%, transparent 85%)` }}></div>
        </div>

        <div className={`relative z-10 w-full max-w-7xl h-auto md:my-auto bg-black/70 backdrop-blur-3xl md:rounded-[3rem] border-t md:border-4 ${theme.border} ${theme.shadow} flex flex-col md:flex-row overflow-hidden transition-all duration-700`}>
            
            {/* BOTÓN CERRAR MOBILE & DESKTOP */}
            <button 
                onClick={onClose} 
                className="absolute top-6 right-6 md:top-10 md:right-10 w-12 h-12 flex items-center justify-center rounded-full border-2 border-white/10 text-slate-500 hover:text-white transition-all z-[250] bg-black/50 backdrop-blur-md"
            >
                <i className="fas fa-times"></i>
            </button>

            <div className="w-full md:w-[35%] lg:w-[30%] bg-black/90 border-b md:border-b-0 md:border-r border-white/10 p-6 md:p-10 flex flex-col relative shrink-0">
                <div className={`absolute top-0 left-0 w-full h-[2px] ${theme.glow} shadow-[0_0_20px_currentColor] z-30`}></div>
                
                <div className="flex items-center justify-between mb-8 pt-4 md:pt-0">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${theme.border} ${theme.color} ${theme.shadow} bg-black transition-all duration-500`}>
                            <i className="fas fa-terminal text-xl animate-pulse"></i>
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-display font-black text-white uppercase tracking-widest leading-none">NÚCLEO <span className={`${theme.color}`}>MANDO</span></h2>
                            <p className="text-[9px] font-mono text-white uppercase tracking-[0.4em] font-black mt-1.5 leading-none">Status: <span className="text-cyber-success">Master-Key</span></p>
                        </div>
                    </div>
                </div>

                <div className="mb-8 p-5 bg-white/5 border border-white/10 rounded-3xl">
                    <label className={`text-[10px] ${theme.color} font-black uppercase tracking-[0.4em] block mb-4 ml-1`}>Nodo Regional</label>
                    <div className="grid grid-cols-4 gap-2">
                        {Object.values(LotteryRegion).map((reg) => {
                            const flags: any = { [LotteryRegion.TICA]: '🇨🇷', [LotteryRegion.NICA]: '🇳🇮', [LotteryRegion.DOMINICANA]: '🇩🇴', [LotteryRegion.PANAMENA]: '🇵🇦' };
                            const isSelected = selectedRegion === reg;
                            return (
                                <button key={reg} onClick={() => setSelectedRegion(reg)} className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all duration-300 ${isSelected ? `bg-white border-white text-black shadow-lg scale-105` : 'bg-black/40 border-white/5 text-slate-500 hover:border-white/20 hover:text-white'}`}>
                                    <span className="text-xl">{flags[reg]}</span>
                                    <span className="text-[9px] font-black">{reg}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-2 mb-8">
                    {Object.values(DrawTime).map((t) => (
                        <button key={t} onClick={() => setSelectedDraw(t)} className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-500 ${selectedDraw === t ? `${theme.border} bg-white/10 text-white ${theme.shadow}` : 'border-white/5 bg-black/40 text-slate-500'}`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${selectedDraw === t ? 'text-white' : 'text-slate-500'}`}>{t.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>

                <div className={`bg-black/60 rounded-2xl p-4 border-2 ${theme.border} mb-8 backdrop-blur-xl transition-all duration-500`}>
                    <label className={`text-[10px] ${theme.color} font-black uppercase tracking-[0.3em] block mb-2 ml-1`}>Sincronización Temporal</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent text-white font-mono font-black text-lg w-full focus:outline-none appearance-none" />
                </div>

                <div className="mt-auto">
                    <p className="text-[8px] font-mono text-white/40 uppercase tracking-widest font-bold">Protocolo</p>
                    <p className="text-xs font-black text-cyber-neon">V.5.5.2</p>
                </div>
            </div>

            <div className="flex-1 p-6 md:p-12 lg:p-16 flex flex-col items-center justify-center relative bg-[#020305]/90 overflow-y-auto">
                <div className="max-w-md lg:max-w-xl w-full space-y-12">
                    <div className="space-y-4">
                        <label className={`text-[11px] font-black uppercase tracking-[0.4em] ${theme.color} block text-center md:text-left drop-shadow-[0_0_5px_currentColor]`}>Inyección de Vector Ganador</label>
                        <div className={`relative bg-black border-4 ${theme.border} ${theme.shadow} rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden backdrop-blur-xl transition-all duration-500`}>
                            <input 
                                type="text" inputMode="numeric" maxLength={2} value={winningNumber}
                                onChange={e => setWinningNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                className={`w-full bg-transparent py-10 md:py-14 text-center text-8xl md:text-9xl font-mono font-black text-white focus:outline-none placeholder-white/5 tracking-tighter ${theme.textGlow}`}
                                placeholder="00"
                            />
                            <div className={`absolute top-4 left-8 text-[9px] font-black ${theme.color} uppercase tracking-[0.3em] opacity-80 hidden md:block`}>{selectedRegion}_PRIMARY_BUFFER</div>
                        </div>
                    </div>

                    <div className={`space-y-6 transition-all duration-500 ${!isTica ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'}`}>
                        <div className="flex flex-col items-center gap-4">
                             <label className={`text-[11px] font-black uppercase tracking-[0.4em] ${isReventado ? 'text-red-500 animate-pulse' : 'text-white/60'}`}>¿Salió Reventado?</label>
                             
                             <div className="flex bg-black/60 p-2 rounded-3xl border-2 border-white/10 shadow-inner w-full max-w-[280px]">
                                <button 
                                    onClick={() => setIsReventado(true)}
                                    className={`flex-1 py-4 rounded-2xl font-display font-black text-sm uppercase tracking-widest transition-all duration-300 ${isReventado ? 'bg-red-600 text-white shadow-neon-red scale-105' : 'text-slate-600 hover:text-slate-400'}`}
                                >
                                    SÍ
                                </button>
                                <button 
                                    onClick={() => setIsReventado(false)}
                                    className={`flex-1 py-4 rounded-2xl font-display font-black text-sm uppercase tracking-widest transition-all duration-300 ${!isReventado ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                                >
                                    NO
                                </button>
                             </div>
                        </div>
                    </div>

                    <div className="pt-4 md:pt-10">
                        <div className={`relative h-20 md:h-24 w-full rounded-[2.2rem] md:rounded-[3rem] bg-black border-4 overflow-hidden shadow-2xl transition-all duration-500 ${theme.border} ${theme.shadow}`}>
                            <div className={`absolute top-0 left-0 h-full transition-all ease-linear duration-75 ${theme.glow}`} style={{ width: `${progress}%`, boxShadow: `0 0 50px ${theme.matrixHex}` }}></div>
                            <button
                                onMouseDown={handleInteractionStart} onMouseUp={handleInteractionEnd} onMouseLeave={handleInteractionEnd}
                                onTouchStart={handleInteractionStart} onTouchEnd={handleInteractionEnd}
                                disabled={loading || !winningNumber || success}
                                className={`absolute inset-0 w-full h-full flex items-center justify-center gap-6 transition-all active:scale-[0.98] z-20`}
                            >
                                {loading ? (
                                    <span className="font-display font-black uppercase tracking-[0.3em] text-xs text-white">SINCRONIZANDO...</span>
                                ) : success ? (
                                    <span className="font-display font-black uppercase tracking-[0.3em] text-xs text-cyber-success">DATOS INYECTADOS</span>
                                ) : (
                                    <span className={`font-display font-black uppercase tracking-[0.2em] text-xs ${charging ? 'text-white' : 'text-white/70'}`}>
                                        {charging ? 'IGNICIÓN NÚCLEO' : 'MANTENER PARA TRANSMITIR'}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>,
    document.body
  );
}
