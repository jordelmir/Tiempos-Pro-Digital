
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/edgeApi';
import { DrawTime, RiskAnalysisSIPR, UserRole } from '../types';
import { formatCurrency } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';

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
    <div className="w-full relative font-sans">
        <div className={`relative bg-black border-2 ${theme.border} rounded-[3rem] overflow-hidden flex flex-col xl:flex-row min-h-[800px] z-10 shadow-2xl transition-all duration-700`}>
            
            {/* --- SECTOR IZQUIERDO: MATRIZ DE SATURACIÓN --- */}
            <div className="xl:w-7/12 flex flex-col border-r border-white/5 bg-[#050505] relative overflow-hidden">
                <div className="p-8 border-b border-white/10 bg-black/40 backdrop-blur-md">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
                        <div>
                            <h2 className="text-3xl font-display font-black text-white uppercase tracking-tighter">DEFENSA <span className={theme.text}>ACTIVA</span></h2>
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.4em] mt-1 font-bold">Monitor de Riesgo Vectorial</p>
                        </div>
                        <div className="flex bg-black p-1.5 rounded-2xl border border-white/10 shadow-inner">
                             {Object.values(DrawTime).map((d) => (
                                <button key={d} onClick={() => { setActiveDraw(d); setSelectedNumber(null); }} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeDraw === d ? `bg-white text-black shadow-lg scale-105` : 'text-slate-600 hover:text-white'}`}>
                                    {d.split(' ')[0]}
                                </button>
                             ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricHUD label="VECTORES BLOQUEADOS" value={metrics.locked} color="text-red-500" icon="fa-lock" />
                        <MetricHUD label="LIMITES MANUALES" value={metrics.manual_overrides} color="text-yellow-500" icon="fa-shield-alt" />
                        <MetricHUD label="INTEGRIDAD NODO" value="98%" color="text-green-500" icon="fa-check-circle" />
                        <MetricHUD label="PROTOCOLO" value="v3.7" color="text-slate-500" icon="fa-code-branch" />
                    </div>
                </div>

                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_100%)]">
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                        {stats.map((cell) => {
                            const isSelected = cell.number === selectedNumber;
                            let stateClass = "border-white/5 bg-black/40 text-slate-700";
                            
                            if (cell.is_blocked) stateClass = "border-red-600 bg-red-600/20 text-red-500 shadow-neon-red animate-pulse";
                            else if (cell.has_manual_limit) stateClass = "border-yellow-500/50 bg-yellow-500/10 text-yellow-500 shadow-[inset_0_0_15px_rgba(234,179,8,0.2)]";
                            else if (cell.risk_status === 'BLOOD_RED') stateClass = "border-red-500/30 bg-red-500/5 text-red-400";
                            else if (cell.risk_status === 'AMBAR') stateClass = "border-orange-500/30 bg-orange-500/5 text-orange-400";
                            else if (cell.exposure_percent > 0) stateClass = "border-cyber-blue/20 bg-cyber-blue/5 text-cyber-blue";

                            return (
                                <motion.button
                                    key={cell.number}
                                    whileHover={{ scale: 1.15, zIndex: 10 }}
                                    onClick={() => { setSelectedNumber(cell.number); setControlMode('INDIVIDUAL'); }}
                                    className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden ${stateClass} ${isSelected ? 'ring-4 ring-white border-white scale-110 z-20' : ''}`}
                                >
                                    <span className="text-sm font-mono font-black">{cell.number}</span>
                                    {cell.has_manual_limit && <i className="fas fa-shield-alt absolute top-1 right-1 text-[8px]"></i>}
                                    <div className="w-2/3 h-1 bg-black/50 rounded-full mt-1.5 overflow-hidden">
                                        <div className="h-full bg-current opacity-80" style={{ width: `${cell.exposure_percent}%` }}></div>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* --- SECTOR DERECHO: DASHBOARD DE INTERVENCIÓN --- */}
            <div className="xl:w-5/12 bg-[#0a0a0a] flex flex-col relative overflow-hidden p-8 md:p-12">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent`}></div>
                
                {/* TABS DE MODO DE CONTROL */}
                <div className="flex bg-black p-1.5 rounded-3xl border border-white/10 mb-12 shadow-2xl">
                    <button onClick={() => setControlMode('INDIVIDUAL')} className={`flex-1 py-4 rounded-2xl font-display font-black text-xs uppercase tracking-widest transition-all ${controlMode === 'INDIVIDUAL' ? 'bg-white text-black shadow-white/10 shadow-lg scale-105' : 'text-slate-600'}`}>
                        FOCO VECTORIAL
                    </button>
                    <button onClick={() => setControlMode('GLOBAL')} className={`flex-1 py-4 rounded-2xl font-display font-black text-xs uppercase tracking-widest transition-all ${controlMode === 'GLOBAL' ? 'bg-white text-black shadow-white/10 shadow-lg scale-105' : 'text-slate-600'}`}>
                        ESCUDO DE RED
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {controlMode === 'INDIVIDUAL' ? (
                        <motion.div key="indiv" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="flex-1 flex flex-col">
                            {selectedNumber ? (
                                <div className="space-y-10 flex-1">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block mb-2">Nodo Bajo Fuego</span>
                                            <h3 className="text-9xl font-display font-black text-white leading-none tracking-tighter">{selectedNumber}</h3>
                                        </div>
                                        <div className={`px-6 py-4 rounded-3xl border-2 flex flex-col items-center justify-center ${selectedStats?.has_manual_limit ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' : 'border-white/10 text-slate-700'}`}>
                                            <i className={`fas ${selectedStats?.has_manual_limit ? 'fa-user-shield' : 'fa-robot'} text-2xl mb-2`}></i>
                                            <span className="text-[9px] font-black uppercase">{selectedStats?.has_manual_limit ? 'MANUAL' : 'SIPR_AUTO'}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-black/60 p-6 rounded-3xl border border-white/5">
                                            <div className="text-[9px] text-slate-500 uppercase font-black mb-3">Saturación</div>
                                            <div className="text-4xl font-mono font-black text-white">{Math.round(selectedStats?.exposure_percent || 0)}%</div>
                                        </div>
                                        <div className="bg-black/60 p-6 rounded-3xl border border-white/5">
                                            <div className="text-[9px] text-slate-500 uppercase font-black mb-3">Venta Actual</div>
                                            <div className="text-2xl font-mono font-black text-green-500">{formatCurrency(selectedStats?.current_sold_bigint || 0)}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
                                        <label className="text-[10px] font-black text-white uppercase tracking-widest block mb-4">Intervención: Nuevo Techo de Pago</label>
                                        <input 
                                            type="number" value={individualLimitInput} onChange={e => setIndividualLimitInput(e.target.value)}
                                            className="w-full bg-black border-2 border-white/10 rounded-2xl py-6 px-6 text-white font-mono text-4xl focus:border-yellow-500 focus:outline-none transition-all placeholder-slate-900"
                                            placeholder="0.00"
                                        />
                                        <div className="flex gap-2">
                                            {[100000, 500000, 1000000].map(val => (
                                                <button key={val} onClick={() => setIndividualLimitInput(val.toString())} className="flex-1 py-3 bg-black border border-white/10 rounded-xl text-[9px] font-black hover:bg-white hover:text-black transition-all">
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
                                            label="BLINDAR NODO"
                                            active={!!individualLimitInput && !isApplying}
                                        />
                                        
                                        {selectedStats?.has_manual_limit && (
                                            <IgnitionButton 
                                                progress={isApplying && pendingAction === 'REMOVE' ? applyProgress : 0} 
                                                isApplying={isApplying && pendingAction === 'REMOVE'} 
                                                onStart={() => handleStartApply('REMOVE')} 
                                                onEnd={handleEndApply}
                                                label="REMOVER LÍMITE MANUAL"
                                                active={!isApplying}
                                                color="bg-red-600"
                                            />
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 space-y-6">
                                    <i className="fas fa-crosshairs text-9xl"></i>
                                    <p className="text-sm font-display font-black uppercase tracking-[0.4em]">Seleccione un Vector para Intervención</p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div key="global" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="flex-1 flex flex-col space-y-12">
                            <div className="text-center">
                                <div className="w-24 h-24 bg-red-600/10 border-2 border-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-neon-red">
                                    <i className="fas fa-shield-virus text-4xl text-red-600"></i>
                                </div>
                                <h3 className="text-4xl font-display font-black text-white uppercase tracking-tighter">ESCUDO DE <span className="text-red-600">RED</span></h3>
                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] mt-2">Tope de Responsabilidad Global para {activeDraw.split(' ')[0]}</p>
                            </div>

                            <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 space-y-8">
                                <div>
                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-4">Inyección de Blindaje Colectivo</label>
                                    <input 
                                        type="number" value={globalLimitInput} onChange={e => setGlobalLimitInput(e.target.value)}
                                        className="w-full bg-black border-2 border-red-600/50 rounded-2xl py-8 px-6 text-white font-mono text-5xl text-center focus:border-red-600 focus:outline-none transition-all placeholder-red-950"
                                        placeholder="CRC"
                                    />
                                </div>
                                <div className="p-6 bg-red-950/20 border border-red-600/30 rounded-2xl">
                                    <p className="text-[11px] text-red-300 font-bold leading-relaxed">
                                        <i className="fas fa-exclamation-triangle mr-2"></i>
                                        Esta acción sobreescribe todos los límites individuales y el protocolo SIPR para este sorteo. Úselo solo en caso de emergencia.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <IgnitionButton 
                                    progress={isApplying ? applyProgress : 0} 
                                    isApplying={isApplying} 
                                    onStart={() => handleStartApply('APPLY')} 
                                    onEnd={handleEndApply}
                                    label="ACTIVAR ESCUDO GLOBAL"
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
        <div className="bg-black/80 p-5 rounded-2xl border border-white/5 flex items-center gap-4 shadow-inner">
            <div className={`w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center ${color}`}>
                <i className={`fas ${icon}`}></i>
            </div>
            <div>
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">{label}</div>
                <div className={`text-xl font-mono font-black ${color}`}>{value}</div>
            </div>
        </div>
    );
}

function IgnitionButton({ progress, isApplying, onStart, onEnd, label, active, color = "bg-white" }: any) {
    return (
        <div className="relative h-24 group/btn">
            {/* BARRA DE PROGRESO */}
            <div className="absolute inset-0 w-full h-full pointer-events-none p-1">
                <div className="w-full h-full rounded-2xl border border-white/10 overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={`h-full ${color.includes('red') ? 'bg-red-600' : 'bg-white'} opacity-20`}
                    />
                </div>
            </div>

            <button
                onMouseDown={onStart} onMouseUp={onEnd} onMouseLeave={onEnd}
                onTouchStart={onStart} onTouchEnd={onEnd}
                disabled={!active}
                className={`w-full h-20 rounded-2xl font-display font-black text-sm uppercase tracking-[0.4em] transition-all relative overflow-hidden flex items-center justify-center gap-4
                    ${active ? 'cursor-pointer hover:scale-[1.01] active:scale-95' : 'opacity-20 cursor-not-allowed grayscale'}
                    ${isApplying ? 'bg-transparent text-white' : `${color} text-black`}
                `}
            >
                {isApplying ? (
                    <div className="flex items-center gap-6">
                        <span className="animate-pulse">SINCRONIZANDO...</span>
                        <div className="text-2xl font-mono">{progress}%</div>
                    </div>
                ) : (
                    <>
                        <i className={`fas ${color.includes('red') ? 'fa-trash-alt' : 'fa-fingerprint'} text-xl`}></i>
                        <span>{label}</span>
                    </>
                )}
                
                {/* Glow interno durante presión */}
                {isApplying && <div className={`absolute inset-0 ${color} opacity-20 blur-xl animate-pulse`}></div>}
            </button>
            
            <p className="text-center text-[8px] font-mono text-slate-600 mt-4 uppercase tracking-[0.6em] font-black opacity-40">MANTENGA PRESIONADO PARA AUTORIZAR</p>
        </div>
    );
}
