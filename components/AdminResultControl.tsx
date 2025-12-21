
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DrawTime } from '../types';
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
}

export default function AdminResultControl({ isOpen, onClose, onPublishSuccess, initialDraw }: AdminResultControlProps) {
  useBodyScrollLock(isOpen); 

  const user = useAuthStore(s => s.user);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDraw, setSelectedDraw] = useState<DrawTime>(DrawTime.NOCHE);
  const [winningNumber, setWinningNumber] = useState('');
  const [reventadoNumber, setReventadoNumber] = useState('');
  const [isReventado, setIsReventado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [charging, setCharging] = useState(false);
  const [progress, setProgress] = useState(0);

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
          setCharging(false);
          setProgress(0);
          setLoading(false);
          setSuccess(false);
          setWinningNumber('');
          setReventadoNumber('');
          setIsReventado(false);
          if (initialDraw) setSelectedDraw(initialDraw);
      }
  }, [isOpen, initialDraw]);

  const handleInteractionStart = () => {
      if (!winningNumber || loading || success) return;
      if (isReventado && !reventadoNumber) return;
      setCharging(true);
  };

  const handleInteractionEnd = () => {
      if (progress < 100 && !success) {
          setCharging(false);
          setProgress(0);
      }
  };

  useEffect(() => {
      let interval: any;
      if (charging && !loading && !success) {
          interval = setInterval(() => {
              setProgress(prev => {
                  if (prev >= 100) { clearInterval(interval); return 100; }
                  return prev + 5;
              });
          }, 200);
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
            date, drawTime: selectedDraw, winningNumber, isReventado,
            reventadoNumber: isReventado ? reventadoNumber : undefined,
            actor_id: user!.id
        });
        
        if (!res.error) {
            setSuccess(true);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            
            // --- VALIDACIÓN PROFESIONAL DE GANADORES REALES ---
            // Solo notificamos éxito de "Ganador" si realmente hubo apuestas premiadas procesadas
            const winnersFound = (res as any).data?.processed > 0;
            
            if (winnersFound) {
                onPublishSuccess?.({ 
                    draw: selectedDraw, 
                    number: winningNumber, 
                    reventado: isReventado,
                    processed: (res as any).data.processed 
                });
            }

            setTimeout(() => { onClose(); }, 2000);
        } else {
            alert(res.error);
            setLoading(false);
            setCharging(false);
            setProgress(0);
        }
    } catch (e) {
        alert("Fallo de Inyección de Datos");
        setLoading(false);
    }
  };

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

        {/* --- BACKLIGHT ATMOSPHERE --- */}
        <div className={`absolute w-[120%] h-[120%] rounded-full blur-[160px] opacity-40 animate-[pulse_4s_ease-in-out_infinite] transition-all duration-1000 ${theme.glow}`} style={{ zIndex: 1 }}></div>

        {/* --- MAIN STATION CHASSIS --- */}
        <div className={`relative z-10 w-full max-w-7xl h-auto md:my-auto bg-black/70 backdrop-blur-3xl md:rounded-[3rem] border-t md:border-4 ${theme.border} ${theme.shadow} flex flex-col md:flex-row overflow-hidden transition-all duration-700`}>
            
            {/* LEFT PANEL: TELEMETRY (Identidad y Control Temporal) */}
            <div className="w-full md:w-[35%] lg:w-[30%] bg-black/90 border-b md:border-b-0 md:border-r border-white/10 p-6 md:p-10 flex flex-col relative shrink-0">
                <div className={`absolute top-0 left-0 w-full h-[2px] ${theme.glow} shadow-[0_0_20px_currentColor] z-30`}></div>
                
                {/* Header Section Responsivo */}
                <div className="flex items-center justify-between mb-8 md:mb-12 pt-4 md:pt-0">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl border-2 flex items-center justify-center ${theme.border} ${theme.color} ${theme.shadow} bg-black transition-all duration-500`}>
                            <i className="fas fa-satellite text-lg md:text-xl animate-pulse"></i>
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <h2 className="text-lg md:text-xl font-display font-black text-white uppercase tracking-widest leading-none truncate">
                                NÚCLEO <span className={`${theme.color} drop-shadow-[0_0_10px_currentColor]`}>MANDO</span>
                            </h2>
                            <p className="text-[9px] md:text-[10px] font-mono text-white uppercase tracking-[0.4em] font-black mt-1.5 leading-none">Status: <span className="text-cyber-success animate-pulse">Master-Key</span></p>
                        </div>
                    </div>
                    {/* Botón Cerrar para Mobile */}
                    <button onClick={onClose} className="md:hidden w-10 h-10 flex items-center justify-center rounded-full border border-white/20 text-white active:scale-95 transition-all">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Grid de Sorteos Adaptable */}
                <div className="grid grid-cols-3 md:grid-cols-1 gap-3 mb-10">
                    {Object.values(DrawTime).map((t) => {
                        const isThis = selectedDraw === t;
                        return (
                            <button
                                key={t}
                                onClick={() => setSelectedDraw(t)}
                                className={`w-full flex flex-col md:flex-row items-center gap-3 md:gap-4 p-3 md:p-5 rounded-2xl border-2 transition-all duration-500 ${
                                    isThis ? `${theme.border} bg-white/10 text-white shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] scale-[1.02] ${theme.shadow}` : 'border-white/5 bg-black/40 text-slate-500 hover:border-white/20'
                                }`}
                            >
                                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center border transition-all duration-500 ${isThis ? theme.border + ' ' + theme.color + ' ' + theme.shadow : 'border-white/10'}`}>
                                    <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 4, size: 0.85, theme: 'minimal' }}>
                                        <i className={`fas ${t.includes('Mediodía') ? 'fa-sun' : t.includes('Tarde') ? 'fa-cloud-sun' : 'fa-moon'} text-xs md:text-sm`}></i>
                                    </AnimatedIconUltra>
                                </div>
                                <span className={`text-[9px] md:text-xs font-black uppercase tracking-widest leading-none ${isThis ? 'text-white' : 'text-slate-500'}`}>{t.split(' ')[0]}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Entrada de Fecha Estilo Terminal */}
                <div className={`bg-black/60 rounded-2xl p-4 border-2 ${theme.border} ${theme.shadow} mb-8 backdrop-blur-xl transition-all duration-500`}>
                    <label className={`text-[10px] ${theme.color} font-black uppercase tracking-[0.3em] block mb-2 ml-1`}>Sincronización Temporal</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent text-white font-mono font-black text-lg w-full focus:outline-none appearance-none" />
                </div>

                <div className="mt-auto hidden md:block">
                     <div className={`h-px w-full bg-gradient-to-r from-${theme.name === 'solar' ? 'orange' : theme.name === 'vapor' ? 'purple' : 'blue'}-500/50 to-transparent mb-6`}></div>
                     <div className="flex justify-between items-end">
                         <div>
                             <p className="text-[8px] font-mono text-white/60 uppercase tracking-widest font-bold">Identidad</p>
                             <p className="text-xs font-black text-white truncate max-w-[140px] uppercase">{user.name}</p>
                         </div>
                         <div className="text-right">
                             <p className="text-[8px] font-mono text-white/60 uppercase tracking-widest font-bold">Protocolo</p>
                             <p className="text-xs font-black text-cyber-neon drop-shadow-[0_0_5px_currentColor]">V.5.5.2</p>
                         </div>
                     </div>
                </div>
            </div>

            {/* RIGHT PANEL: COCKPIT (Búferes de Entrada y Accionadores) */}
            <div className="flex-1 p-6 md:p-12 lg:p-16 flex flex-col items-center justify-center relative bg-[#020305]/90 overflow-y-auto custom-scrollbar min-h-[500px] md:min-h-0">
                
                {/* Botón Cerrar para Desktop (Esquina Superior Derecha) */}
                <button onClick={onClose} className="hidden md:flex absolute top-10 right-10 w-12 h-12 items-center justify-center rounded-full border-2 border-white/10 text-slate-500 hover:text-white hover:border-white transition-all z-50">
                    <i className="fas fa-times text-xl"></i>
                </button>

                <div className="max-w-md lg:max-w-xl w-full space-y-10 md:space-y-12">
                    
                    {/* WINNER DATA BÚFER: Número Ganador Principal */}
                    <div className="space-y-4">
                        <label className={`text-[11px] font-black uppercase tracking-[0.4em] ${theme.color} ml-1 block text-center md:text-left drop-shadow-[0_0_5px_currentColor]`}>Inyección de Vector Ganador</label>
                        <div className={`relative group/input transition-all duration-500 ring-4 ring-transparent ${winningNumber ? theme.ring : ''}`}>
                            <div className={`relative bg-black border-4 ${theme.border} ${theme.shadow} rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden backdrop-blur-xl transition-all duration-500`}>
                                <input 
                                    type="text" inputMode="numeric" maxLength={2} value={winningNumber}
                                    onChange={e => setWinningNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                    className={`w-full bg-transparent py-10 md:py-14 lg:py-16 text-center text-8xl md:text-9xl lg:text-[12rem] font-mono font-black text-white focus:outline-none placeholder-white/5 tracking-tighter ${theme.textGlow}`}
                                    placeholder="00"
                                />
                                <div className={`absolute top-4 left-8 text-[9px] font-black ${theme.color} uppercase tracking-[0.3em] opacity-80 hidden md:block`}>CORE_PRIMARY_BUFFER</div>
                                <div className={`absolute bottom-4 right-8 text-[9px] font-black text-white/30 uppercase tracking-[0.2em] hidden md:block`}>SECURED_NODE_7X</div>
                            </div>
                        </div>
                    </div>

                    {/* REVENTADOS OVERDRIVE TOGGLE: Módulo Condicional */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-4">
                             <label className={`text-[11px] font-black uppercase tracking-[0.4em] transition-colors duration-500 ${isReventado ? 'text-red-500 drop-shadow-[0_0_10px_red]' : 'text-white/60'}`}>Módulo Reventado</label>
                             <button onClick={() => setIsReventado(!isReventado)} className={`w-14 h-7 rounded-full transition-all border-2 relative ${isReventado ? 'bg-red-600 border-red-500 shadow-neon-red' : 'bg-black border-white/20'}`}>
                                <div className={`absolute top-1 bottom-1 w-5 h-5 bg-white rounded-full transition-all shadow-xl ${isReventado ? 'translate-x-7' : 'translate-x-1'}`}></div>
                             </button>
                        </div>
                        
                        <div className={`relative transition-all duration-700 ease-in-out overflow-hidden ${isReventado ? 'max-h-80 opacity-100 scale-100' : 'max-h-0 opacity-0 scale-95 pointer-events-none'}`}>
                            <div className={`bg-black border-4 border-red-600 shadow-neon-red rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 flex flex-col items-center backdrop-blur-xl`}>
                                <input 
                                    type="text" inputMode="numeric" maxLength={2} value={reventadoNumber}
                                    onChange={e => setReventadoNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="bg-transparent text-7xl md:text-8xl lg:text-9xl font-mono font-black text-white text-center w-full focus:outline-none placeholder-red-900 drop-shadow-[0_0_15px_red]"
                                    placeholder="--"
                                />
                                <div className="w-full h-1.5 bg-red-900/40 mt-6 rounded-full overflow-hidden relative">
                                    <div className="absolute inset-0 bg-red-500 w-1/3 animate-[scan_1.5s_linear_infinite] shadow-[0_0_10px_red]"></div>
                                </div>
                                <p className="text-[8px] font-black text-red-500 uppercase tracking-[0.5em] mt-4 animate-pulse">SENSING_OVERDRIVE_V3</p>
                            </div>
                        </div>
                    </div>

                    {/* REACTOR SLIDER: Gatillo de Confirmación */}
                    <div className="pt-4 md:pt-10">
                        <div className={`relative h-20 md:h-24 lg:h-28 w-full rounded-[2.2rem] md:rounded-[3rem] bg-black border-4 overflow-hidden select-none touch-none shadow-2xl transition-all duration-500 ${theme.border} ${theme.shadow} group/reactor`}>
                            <div className={`absolute top-0 left-0 h-full transition-all ease-linear duration-75 ${theme.glow}`} style={{ width: `${progress}%`, boxShadow: `0 0 50px ${theme.matrixHex}, inset 0 0 20px rgba(255,255,255,0.3)` }}>
                                <div className="absolute top-0 right-0 h-full w-2 bg-white shadow-[0_0_20px_white] animate-pulse"></div>
                            </div>
                            <button
                                onMouseDown={handleInteractionStart} onMouseUp={handleInteractionEnd} onMouseLeave={handleInteractionEnd}
                                onTouchStart={handleInteractionStart} onTouchEnd={handleInteractionEnd}
                                disabled={loading || !winningNumber || (isReventado && !reventadoNumber) || success}
                                className={`absolute inset-0 w-full h-full flex items-center justify-center gap-6 transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed z-20`}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-4 text-white animate-pulse">
                                        <i className="fas fa-atom fa-spin text-2xl md:text-3xl"></i>
                                        <span className="font-display font-black uppercase tracking-[0.3em] text-xs md:text-sm lg:text-base">SINCRONIZANDO...</span>
                                    </div>
                                ) : success ? (
                                    <div className="flex items-center gap-4 text-white animate-in zoom-in">
                                        <i className="fas fa-check-double text-3xl md:text-4xl lg:text-5xl text-cyber-success shadow-neon-green"></i>
                                        <span className="font-display font-black uppercase tracking-[0.3em] text-xs md:text-sm lg:text-base text-cyber-success">DATOS INYECTADOS</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-2xl border-2 flex items-center justify-center ${theme.border} ${theme.color} ${charging ? 'animate-ping bg-white text-black border-white' : 'bg-black'} shadow-lg transition-all duration-300`}>
                                            <i className={`fas ${isReventado ? 'fa-radiation' : 'fa-fingerprint'} text-xl md:text-2xl lg:text-3xl`}></i>
                                        </div>
                                        <div className="flex flex-col items-start leading-none">
                                            <span className={`font-display font-black uppercase tracking-[0.2em] text-xs md:text-sm lg:text-base transition-colors duration-300 ${charging ? 'text-white' : 'text-white/70'}`}>
                                                {charging ? 'IGNICIÓN NÚCLEO' : 'MANTENER PARA PUBLICAR'}
                                            </span>
                                            <span className={`text-[8px] md:text-[9px] font-mono font-black mt-2 uppercase tracking-[0.2em] ${charging ? 'text-white' : theme.color} opacity-80`}>Protocolo Phront v5.5.2</span>
                                        </div>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Espaciador Final para asegurar que el contenido no quede pegado al fondo en Mobile */}
                <div className="h-10 md:hidden"></div>
            </div>
        </div>

        <style>{`
            @keyframes scan { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        `}</style>
    </div>,
    document.body
  );
}
