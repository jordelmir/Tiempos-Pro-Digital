
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/edgeApi';
import { DrawTime, RiskAnalysisSIPR, UserRole } from '../types';
import { formatCurrency } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

export default function RiskLimitManager() {
  const { user } = useAuthStore();
  const [activeDraw, setActiveDraw] = useState<DrawTime>(DrawTime.NOCHE);
  const [stats, setStats] = useState<RiskAnalysisSIPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [controlMode, setControlMode] = useState<'INDIVIDUAL' | 'GLOBAL'>('INDIVIDUAL');
  
  const [individualLimitInput, setIndividualLimitInput] = useState('');
  const [globalLimitInput, setGlobalLimitInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [pendingAction, setPendingAction] = useState<'APPLY' | 'REMOVE'>('APPLY');

  const fetchData = async () => {
    try {
        const res = await api.getRiskAnalysisSIPR(activeDraw);
        if (res.data) setStats(res.data);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [activeDraw]);

  const metrics = useMemo(() => {
    const locked = stats.filter(s => s.is_blocked).length;
    const manual = stats.filter(s => s.has_manual_limit).length;
    return { integrity: 98, locked, manual_overrides: manual, threshold: 95 };
  }, [stats]);

  const theme = useMemo(() => {
      if (activeDraw.includes('Mediodía')) return { hex: '#ff5f00', border: 'border-cyber-solar', text: 'text-cyber-solar', shadow: 'shadow-neon-solar' };
      if (activeDraw.includes('Tarde')) return { hex: '#7c3aed', border: 'border-cyber-vapor', text: 'text-cyber-vapor', shadow: 'shadow-neon-vapor' };
      return { hex: '#00D1FF', border: 'border-cyber-blue', text: 'text-cyber-blue', shadow: 'shadow-neon-blue' };
  }, [activeDraw]);

  const handleStartApply = (actionType: 'APPLY' | 'REMOVE' = 'APPLY') => {
      if (actionType === 'APPLY' && ((controlMode === 'INDIVIDUAL' && !individualLimitInput) || (controlMode === 'GLOBAL' && !globalLimitInput))) return;
      setPendingAction(actionType);
      setIsApplying(true);
  };

  const handleEndApply = () => {
      if (applyProgress < 100) {
          setIsApplying(false);
          setApplyProgress(0);
      }
  };

  useEffect(() => {
      let interval: any;
      if (isApplying) {
          interval = setInterval(() => {
              setApplyProgress(prev => {
                  if (prev >= 100) {
                      clearInterval(interval);
                      executeApply();
                      return 100;
                  }
                  return prev + 5;
              });
          }, 50);
      }
      return () => clearInterval(interval);
  }, [isApplying]);

  const executeApply = async () => {
      if (!user) return;
      
      const limitVal = pendingAction === 'REMOVE' ? 0 : Number(controlMode === 'INDIVIDUAL' ? individualLimitInput : globalLimitInput) * 100;
      
      const res = await api.updateRiskLimit({
          drawTime: activeDraw,
          number: controlMode === 'INDIVIDUAL' ? selectedNumber! : undefined,
          limit_bigint: limitVal,
          actor_id: user.id
      });

      if (!res.error) {
          if (navigator.vibrate) navigator.vibrate([50, 20, 50]);
          fetchData();
          setIndividualLimitInput('');
          setGlobalLimitInput('');
          setTimeout(() => { setIsApplying(false); setApplyProgress(0); }, 500);
      } else {
          alert(res.error); setIsApplying(false); setApplyProgress(0);
      }
  };

  const selectedStats = stats.find(s => s.number === selectedNumber);

  return (
    <div className="w-full relative group animate-in fade-in duration-1000">
        {/* AMBIENT BACKGROUND GLOW */}
        <div className={`absolute -inset-4 bg-${theme.text.split('-')[2]}/20 rounded-[3rem] blur-3xl animate-pulse transition-all duration-1000 opacity-20`}></div>
        <div className={`absolute -inset-4 bg-gradient-to-r from-transparent via-${theme.text.split('-')[2]}/10 to-transparent rounded-[3.5rem] blur-3xl opacity-30 animate-pulse transition-all duration-1000`}></div>

        <div className={`relative glass-morphism bg-black/30 backdrop-blur-[40px] border-2 ${theme.border}/40 rounded-[3rem] overflow-hidden flex flex-col xl:flex-row min-h-[600px] md:min-h-[800px] z-10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] transition-all duration-700`}>
            <div className="absolute inset-0 carbon-texture opacity-[0.03] pointer-events-none"></div>

            {/* --- SECTOR IZQUIERDO: MATRIZ DE SATURACIÓN (GLASS) --- */}
            <div className="xl:w-7/12 flex flex-col border-r border-white/10 relative overflow-hidden">
                <div className="p-6 md:p-10 border-b border-white/10 bg-white/5 backdrop-blur-3xl relative">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start mb-8 md:mb-10 gap-6">
                        <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl bg-black/40 border-2 ${theme.border}/50 flex items-center justify-center ${theme.shadow} backdrop-blur-md shadow-inner`}>
                                <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 5, theme: 'cyber', size: 1.0 }}>
                                    <i className={`fas fa-shield-halved ${theme.text} text-2xl`}></i>
                                </AnimatedIconUltra>
                            </div>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tighter leading-none">
                                    DEFENSA <span className={`${theme.text} text-glow-cyan transition-colors duration-500`}>ACTIVA</span>
                                </h2>
                                <p className="text-[10px] font-mono text-slate-500 mt-2 font-black uppercase tracking-[0.4em] opacity-60">Monitor de Riesgo Vectorial</p>
                            </div>
                        </div>

                        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner">
                             {Object.values(DrawTime).map((d) => (
                                <button key={d} onClick={() => { setActiveDraw(d); setSelectedNumber(null); }} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${activeDraw === d ? `bg-white text-black shadow-2xl scale-105` : 'text-slate-500 hover:text-white'}`}>
                                    {d.split(' ')[0]}
                                </button>
                             ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 xs:grid-cols-4 gap-4">
                        <MetricHUD label="VECTORES_BLOCK" value={metrics.locked} color="text-red-500" icon="fa-lock" />
                        <MetricHUD label="OVERRIDE_MANUAL" value={metrics.manual_overrides} color="text-yellow-500" icon="fa-user-shield" />
                        <MetricHUD label="SINC_INTEGRITY" value="98%" color="text-cyber-success" icon="fa-check-circle" />
                        <MetricHUD label="NUCLEO_VERSION" value="v3.9" color="text-slate-400" icon="fa-code-branch" />
                    </div>
                </div>

                <div className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar bg-black/10">
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 md:gap-4">
                        {stats.map((cell) => {
                            const isSelected = cell.number === selectedNumber;
                            let stateClass = "border-white/5 bg-black/20 text-slate-600";
                            
                            if (cell.is_blocked) stateClass = "border-red-600/60 bg-red-600/10 text-red-500 shadow-neon-red animate-pulse";
                            else if (cell.has_manual_limit) stateClass = "border-yellow-500/40 bg-yellow-500/5 text-yellow-500";
                            else if (cell.risk_status === 'BLOOD_RED') stateClass = "border-red-500/30 bg-red-500/5 text-red-400";
                            else if (cell.risk_status === 'AMBAR') stateClass = "border-orange-500/30 bg-orange-500/5 text-orange-400";
                            else if (cell.exposure_percent > 0) stateClass = "border-cyber-blue/20 bg-cyber-blue/5 text-cyber-blue";

                            return (
                                <motion.button
                                    key={cell.number}
                                    whileHover={{ scale: 1.15, zIndex: 10 }}
                                    onClick={() => { setSelectedNumber(cell.number); setControlMode('INDIVIDUAL'); }}
                                    className={`aspect-square rounded-xl md:rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden backdrop-blur-md ${stateClass} ${isSelected ? 'ring-2 md:ring-4 ring-white border-white shadow-2xl scale-110 z-20' : ''}`}
                                >
                                    <span className="text-xs md:text-sm font-mono font-black">{cell.number}</span>
                                    {cell.has_manual_limit && <i className="fas fa-shield-alt absolute top-1.5 right-1.5 text-[7px] md:text-[9px]"></i>}
                                    <div className="w-2/3 h-1 bg-black/50 rounded-full mt-2 overflow-hidden shadow-inner">
                                        <div className="h-full bg-current opacity-80" style={{ width: `${cell.exposure_percent}%` }}></div>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* --- SECTOR DERECHO: DASHBOARD DE INTERVENCIÓN (GLASS) --- */}
            <div className="xl:w-5/12 bg-white/5 backdrop-blur-3xl flex flex-col relative overflow-hidden p-8 md:p-14">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                
                <div className="flex bg-black/40 p-1.5 rounded-[2rem] border border-white/10 mb-10 md:mb-14 shadow-2xl backdrop-blur-md">
                    <button onClick={() => setControlMode('INDIVIDUAL')} className={`flex-1 py-4 rounded-2xl font-display font-black text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all duration-500 ${controlMode === 'INDIVIDUAL' ? 'bg-white text-black shadow-2xl scale-105' : 'text-slate-500 hover:text-white'}`}>
                        FOCO VECTORIAL
                    </button>
                    <button onClick={() => setControlMode('GLOBAL')} className={`flex-1 py-4 rounded-2xl font-display font-black text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all duration-500 ${controlMode === 'GLOBAL' ? 'bg-white text-black shadow-2xl scale-105' : 'text-slate-500 hover:text-white'}`}>
                        ESCUDO DE RED
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {controlMode === 'INDIVIDUAL' ? (
                        <motion.div key="indiv" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="flex-1 flex flex-col">
                            {selectedNumber ? (
                                <div className="space-y-8 md:space-y-12 flex-1">
                                    <div className="flex justify-between items-center bg-black/20 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-xl shadow-inner">
                                        <div className="flex-1">
                                            <span className="text-[10px] font-mono text-slate-500 font-black block mb-3 uppercase tracking-[0.4em]">NODO_TARGET_LOCK</span>
                                            <h3 className="text-7xl md:text-9xl font-display font-black text-white leading-none tracking-tighter text-glow-white">{selectedNumber}</h3>
                                        </div>
                                        <div className={`w-20 h-20 md:w-24 md:h-24 rounded-[2rem] border-2 flex flex-col items-center justify-center shrink-0 shadow-2xl backdrop-blur-md transition-colors duration-500 ${selectedStats?.has_manual_limit ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' : 'border-white/10 bg-white/5 text-slate-600'}`}>
                                            <i className={`fas ${selectedStats?.has_manual_limit ? 'fa-user-shield' : 'fa-robot'} text-2xl md:text-3xl mb-2`}></i>
                                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{selectedStats?.has_manual_limit ? 'MANUAL' : 'SIPR_AI'}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-black/40 p-6 md:p-8 rounded-[2rem] border border-white/5 backdrop-blur-md shadow-inner">
                                            <div className="text-[10px] font-mono text-slate-500 uppercase font-black mb-4 tracking-widest">Saturación</div>
                                            <div className={`text-4xl md:text-5xl font-mono font-black ${selectedStats?.risk_status === 'BLOOD_RED' ? 'text-red-500' : 'text-white'}`}>{Math.round(selectedStats?.exposure_percent || 0)}%</div>
                                        </div>
                                        <div className="bg-black/40 p-6 md:p-8 rounded-[2rem] border border-white/5 backdrop-blur-md shadow-inner">
                                            <div className="text-[10px] font-mono text-slate-500 uppercase font-black mb-4 tracking-widest">Venta_Live</div>
                                            <div className="text-xl md:text-2xl font-mono font-black text-cyber-success truncate tracking-tighter">{formatCurrency(selectedStats?.current_sold_bigint || 0)}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 bg-black/60 p-8 md:p-10 rounded-[2.5rem] border border-white/10 relative overflow-hidden shadow-[inset_0_0_40px_black]">
                                        <label className="text-[10px] font-mono text-slate-500 uppercase font-black block mb-4 tracking-widest">Intervención: Nuevo Techo de Pago</label>
                                        <div className="relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-yellow-500 font-display font-black text-2xl">₡</span>
                                            <input 
                                                type="number" value={individualLimitInput} onChange={e => setIndividualLimitInput(e.target.value)}
                                                className="w-full bg-black/40 border-2 border-white/10 rounded-2xl py-6 pl-14 pr-8 text-white font-mono text-3xl md:text-5xl focus:border-yellow-500 focus:outline-none transition-all placeholder-slate-900 shadow-inner"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {[100000, 500000, 1000000].map(val => (
                                                <button key={val} onClick={() => setIndividualLimitInput(val.toString())} className="flex-1 py-3 md:py-4 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-300">
                                                    +{val/1000}K
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto space-y-4">
                                        <IgnitionButton 
                                            progress={isApplying && pendingAction === 'APPLY' ? applyProgress : 0} 
                                            isApplying={isApplying && pendingAction === 'APPLY'} 
                                            onStart={() => handleStartApply('APPLY')} 
                                            onEnd={handleEndApply}
                                            label="BLINDAR_NODO_VECT"
                                            active={!!individualLimitInput && !isApplying}
                                        />
                                        
                                        {selectedStats?.has_manual_limit && (
                                            <IgnitionButton 
                                                progress={isApplying && pendingAction === 'REMOVE' ? applyProgress : 0} 
                                                isApplying={isApplying && pendingAction === 'REMOVE'} 
                                                onStart={() => handleStartApply('REMOVE')} 
                                                onEnd={handleEndApply}
                                                label="REMOVER_OVERRIDE"
                                                active={!isApplying}
                                                color="bg-red-600"
                                            />
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 space-y-10 py-20">
                                    <div className="w-32 h-32 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center animate-[spin_20s_linear_infinite]">
                                        <i className="fas fa-crosshairs text-6xl"></i>
                                    </div>
                                    <p className="text-xs md:text-sm font-display font-black uppercase tracking-[0.5em] text-white/50 animate-pulse">Escaneo de Red_Idle: Seleccione Vector</p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div key="global" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="flex-1 flex flex-col space-y-10 md:space-y-16">
                            <div className="text-center p-8 bg-black/20 rounded-[3rem] border border-white/5 backdrop-blur-xl shadow-inner">
                                <div className="w-24 md:w-28 h-24 md:h-28 bg-red-600/10 border-2 border-red-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-neon-red relative group">
                                    <div className="absolute inset-0 bg-red-600 opacity-20 blur-2xl rounded-full animate-pulse"></div>
                                    <i className="fas fa-shield-virus text-4xl md:text-5xl text-red-600 relative z-10"></i>
                                </div>
                                <h3 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tighter">ESCUDO DE <span className="text-red-600 text-glow-red">RED</span></h3>
                                <p className="text-[10px] font-mono text-slate-500 mt-4 font-black uppercase tracking-[0.4em]">Tope de Responsabilidad Global: {activeDraw.split(' ')[0]}</p>
                            </div>

                            <div className="p-8 md:p-12 bg-black/60 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10 space-y-10 shadow-[inset_0_0_50px_black] relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-red-600/30 animate-pulse"></div>
                                <div>
                                    <label className="text-[10px] font-mono text-slate-500 uppercase font-black block mb-6 text-center tracking-[0.5em]">Inyección de Blindaje Colectivo</label>
                                    <div className="relative">
                                        <input 
                                            type="number" value={globalLimitInput} onChange={e => setGlobalLimitInput(e.target.value)}
                                            className="w-full bg-black/40 border-2 border-red-600/30 rounded-2xl py-8 md:py-10 px-6 text-white font-mono text-4xl md:text-6xl text-center focus:border-red-600 focus:outline-none transition-all placeholder-red-950/20 shadow-inner"
                                            placeholder="₡ CRC"
                                        />
                                    </div>
                                </div>
                                <div className="p-6 md:p-8 bg-red-950/30 border border-red-600/20 rounded-2xl md:rounded-3xl backdrop-blur-md">
                                    <p className="text-[11px] md:text-[12px] text-red-400 font-bold leading-relaxed text-center">
                                        <i className="fas fa-triangle-exclamation mr-2"></i>
                                        ADVERTENCIA: Esta acción sobreescribe protocolos SIPR individuales para este ciclo. Uso restringido para emergencias de liquidez.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <IgnitionButton 
                                    progress={isApplying ? applyProgress : 0} 
                                    isApplying={isApplying} 
                                    onStart={() => handleStartApply('APPLY')} 
                                    onEnd={handleEndApply}
                                    label="DETONAR_ESCUDO_GLOBAL"
                                    active={!!globalLimitInput && !isApplying}
                                    color="bg-red-600"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    </div>
  );
}

function MetricHUD({ label, value, color, icon }: any) {
    return (
        <div className="bg-black/60 backdrop-blur-md p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/5 flex items-center gap-4 md:gap-5 shadow-inner overflow-hidden transition-all hover:bg-white/5">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-black border border-white/10 flex items-center justify-center shrink-0 ${color} shadow-lg`}>
                <i className={`fas ${icon} text-base md:text-xl`}></i>
            </div>
            <div className="min-w-0">
                <div className="text-[7px] md:text-[9px] font-mono text-slate-500 uppercase leading-none mb-2 font-black tracking-widest truncate">{label}</div>
                <div className={`text-sm md:text-2xl font-mono font-black ${color} truncate tracking-tighter`}>{value}</div>
            </div>
        </div>
    );
}

function IgnitionButton({ progress, isApplying, onStart, onEnd, label, active, color = "bg-white" }: any) {
    const isRed = color.includes('red');
    return (
        <div className="relative h-24 md:h-28 group/btn">
            <div className="absolute inset-0 w-full h-full pointer-events-none p-1">
                <div className="w-full h-full rounded-2xl md:rounded-3xl border border-white/10 overflow-hidden bg-black/20 shadow-inner">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={`h-full ${isRed ? 'bg-red-600' : 'bg-white'} opacity-20`}
                    />
                </div>
            </div>

            <button
                onMouseDown={onStart} onMouseUp={onEnd} onMouseLeave={onEnd}
                onTouchStart={onStart} onTouchEnd={onEnd}
                disabled={!active}
                className={`w-full h-20 md:h-24 rounded-2xl md:rounded-3xl font-display font-black text-xs md:text-sm uppercase tracking-[0.5em] transition-all relative overflow-hidden flex items-center justify-center gap-4 md:gap-6 shadow-2xl
                    ${active ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : 'opacity-20 cursor-not-allowed grayscale'}
                    ${isApplying ? 'bg-transparent text-white' : `${color} ${isRed ? 'text-white' : 'text-black'}`}
                `}
            >
                {isApplying ? (
                    <div className="flex items-center gap-6 md:gap-8">
                        <span className="animate-pulse text-xs md:text-base tracking-[0.2em]">TRANSMITIENDO...</span>
                        <div className="text-2xl md:text-4xl font-mono">{progress}%</div>
                    </div>
                ) : (
                    <>
                        <i className={`fas ${isRed ? 'fa-bolt' : 'fa-fingerprint'} text-xl md:text-2xl`}></i>
                        <span className="truncate">{label}</span>
                    </>
                )}
                {isApplying && <div className={`absolute inset-0 ${color} opacity-20 blur-3xl animate-pulse`}></div>}
            </button>
            <p className="text-center text-[8px] font-mono text-slate-600 mt-4 uppercase tracking-[0.8em] font-black opacity-30">SEGURIDAD_NIVEL_ALPHA: MANTENER PARA TRANSMITIR</p>
        </div>
    );
}
