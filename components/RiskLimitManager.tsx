
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/edgeApi';
import { DrawTime, RiskLimit, RiskLimitStats } from '../types';
import { formatCurrency } from '../constants';

// --- TYPES & INTERFACES ---
type ViewMode = 'SATURATION' | 'VOLUME' | 'VELOCITY';

interface GridCell {
    number: string;
    percent: number;
    amount: number;
    limit: number;
    velocity: number; // 0-100 scale of sales/minute
    ticketCount: number;
    isShielded: boolean;
    isManual: boolean; // True if it has a specific limit overriding global
    trend: number[]; // Array for sparkline
}

export default function RiskLimitManager() {
  // --- STATE ---
  const [activeDraw, setActiveDraw] = useState<DrawTime>(DrawTime.NOCHE);
  const [viewMode, setViewMode] = useState<ViewMode>('SATURATION');
  
  // Transition State
  const [isSwitching, setIsSwitching] = useState(false);
  const [displayDraw, setDisplayDraw] = useState<DrawTime>(DrawTime.NOCHE);

  const [limits, setLimits] = useState<RiskLimit[]>([]);
  const [stats, setStats] = useState<RiskLimitStats[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection Logic
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [hoveredNumber, setHoveredNumber] = useState<string | null>(null);
  
  // Input State
  const [manualInputValue, setManualInputValue] = useState<string>('');
  const [globalInputValue, setGlobalInputValue] = useState<string>('');
  
  // System Controls
  const [isBlindajeActive, setIsBlindajeActive] = useState(false);
  const [autoShieldThreshold, setAutoShieldThreshold] = useState(95); // NEW: Configurable Threshold
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS'>('IDLE');
  const [blockSuccess, setBlockSuccess] = useState(false); // NEW: Block confirmation state
  const [unlockSuccess, setUnlockSuccess] = useState(false); // NEW: Unlock confirmation state
  
  // --- PERSISTENCE ENGINE (Fixed) ---
  // Stores locally modified values indefinitely until server confirmation matches local value
  const pendingWrites = useRef<Map<string, number>>(new Map());

  // --- DRAW SWITCHING ANIMATION SEQUENCE ---
  const handleDrawChange = (newDraw: DrawTime) => {
      if (newDraw === activeDraw) return;
      setIsSwitching(true);
      
      // 1. Initiate Glitch/Collapse
      setTimeout(() => {
          setActiveDraw(newDraw);
          setDisplayDraw(newDraw); // Sync visual theme
          pendingWrites.current.clear(); // Clear locks on draw switch
          
          // 3. Restore View
          setTimeout(() => {
              setIsSwitching(false);
          }, 300);
      }, 300);
  };

  // --- HELPER: Normalize Limit Value ---
  const normalizeLimit = (val: number | undefined) => {
      if (val === undefined || val === -1 || val === -2 || val >= 999999999) return Infinity;
      return val;
  };

  // --- DERIVED GLOBAL LIMIT ---
  const serverGlobalLimitRaw = limits.find(l => l.number === 'ALL')?.max_amount;
  
  const effectiveGlobalLimit = useMemo(() => {
      // Priority 1: Local Pending Write for Global
      if (pendingWrites.current.has('ALL')) {
          return normalizeLimit(pendingWrites.current.get('ALL'));
      }
      // Priority 2: Server Data
      return normalizeLimit(serverGlobalLimitRaw);
  }, [serverGlobalLimitRaw, limits]);

  useEffect(() => {
      if (effectiveGlobalLimit !== Infinity && effectiveGlobalLimit !== 0) {
          setGlobalInputValue((effectiveGlobalLimit / 100).toString());
      } else if (effectiveGlobalLimit === Infinity) {
          setGlobalInputValue('');
      }
  }, [effectiveGlobalLimit]);

  // --- MOCK DATA ENGINE (High Fidelity Simulation) ---
  const gridData: GridCell[] = useMemo(() => {
      return Array.from({ length: 100 }, (_, i) => {
          const numStr = i.toString().padStart(2, '0');
          
          let activeLimit = effectiveGlobalLimit;
          let isManual = false;

          // PRIORITY 1: Check Local Locks (Pending Writes)
          if (pendingWrites.current.has(numStr)) {
              activeLimit = normalizeLimit(pendingWrites.current.get(numStr));
              isManual = true;
          } 
          // PRIORITY 2: Check Server Data
          else {
              const specificLimitObj = limits.find(l => l.number === numStr);
              if (specificLimitObj && specificLimitObj.max_amount !== -2) {
                  activeLimit = normalizeLimit(specificLimitObj.max_amount);
                  isManual = true;
              }
          }
          
          const stat = stats.find(s => s.number === numStr);
          const amountSold = stat ? stat.total_sold : 0; 
          
          let percent = 0;
          if (activeLimit === 0) percent = 100;
          else if (activeLimit === Infinity) percent = 0;
          else percent = Math.min((amountSold / activeLimit) * 100, 100);
          
          const velocity = Math.random() * 100;
          const trend = Array.from({ length: 10 }, () => Math.random() * amountSold);

          // Use the dynamic state `autoShieldThreshold` instead of hardcoded 95
          const isShielded = activeLimit === 0 || (isBlindajeActive && percent >= autoShieldThreshold);

          return {
              number: numStr,
              percent,
              amount: amountSold,
              limit: activeLimit,
              velocity,
              ticketCount: Math.floor(amountSold / 500),
              isShielded,
              isManual,
              trend
          };
      });
  }, [limits, stats, isBlindajeActive, effectiveGlobalLimit, autoShieldThreshold]); 

  // --- DATA FETCHING ---
  const fetchData = async () => {
    if (limits.length === 0) setLoading(true); 
    try {
        const [limitsRes, statsRes] = await Promise.all([
            api.getRiskLimits({ draw: activeDraw }),
            api.getRiskStats({ draw: activeDraw })
        ]);
        
        if (limitsRes.data) {
            // MERGE STRATEGY:
            // Only unlock local pending writes if the server data matches the pending write
            const incomingLimits = limitsRes.data.limits as RiskLimit[];
            
            incomingLimits.forEach(l => {
                if (pendingWrites.current.has(l.number)) {
                    const localVal = pendingWrites.current.get(l.number);
                    if (localVal === l.max_amount) {
                        // Server caught up! Release lock.
                        pendingWrites.current.delete(l.number);
                    }
                }
            });

            setLimits(incomingLimits);
        }
        if (statsRes.data) setStats(statsRes.data.stats);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [activeDraw]);

  // --- ACTIONS ---
  const handleCellClick = (numStr: string) => {
      if (selectedNumber === numStr) {
          setSelectedNumber(null);
          setManualInputValue('');
      } else {
          setSelectedNumber(numStr);
          const cell = gridData.find(c => c.number === numStr);
          if (cell?.limit !== Infinity && cell?.limit !== 0) {
              setManualInputValue((cell.limit / 100).toString());
          } else {
              setManualInputValue('');
          }
      }
  };

  const saveLimit = async (targetNumber: string, amount: number) => {
      setSaveStatus('SAVING');
      
      // 1. IMMEDIATE LOCAL LOCK (Optimistic UI)
      pendingWrites.current.set(targetNumber, amount);
      
      // Force re-render to show change immediately
      setLimits(prev => [...prev]); 

      // 2. Network Request
      try {
          await new Promise(r => setTimeout(r, 600)); // Cinematic delay
          await api.updateRiskLimit({ draw: activeDraw, number: targetNumber, max_amount: amount });
          setSaveStatus('SUCCESS');
      } catch(e) {
          console.error("Save failed", e);
      }
      
      setTimeout(() => setSaveStatus('IDLE'), 1500);
  };

  const handleSaveSelected = () => {
      if (!selectedNumber || !manualInputValue) return;
      const val = Number(manualInputValue) * 100;
      saveLimit(selectedNumber, val);
  };

  const handleBlockSelected = async () => {
      if (!selectedNumber) return;
      setManualInputValue('0'); // Update input visual
      await saveLimit(selectedNumber, 0); // Execute save 0
      
      // Trigger Special Success Animation
      setBlockSuccess(true);
      setTimeout(() => setBlockSuccess(false), 2000);
  };

  const handleUnlockSelected = async () => {
      if (!selectedNumber) return;
      
      // 1. Trigger Restore Animation
      setUnlockSuccess(true);
      
      // 2. Logic: Reset to Global (Remove Manual Override)
      await handleResetSelected(false); // False prevents clearing input immediately for visual smoothness
      
      setTimeout(() => setUnlockSuccess(false), 2000);
  };

  const handleResetSelected = async (clearInput = true) => {
      if (!selectedNumber) return;
      
      // Release lock immediately
      pendingWrites.current.delete(selectedNumber);
      
      // Update local state to remove manual entry
      setLimits(prev => prev.filter(l => l.number !== selectedNumber));
      
      await api.updateRiskLimit({ draw: activeDraw, number: selectedNumber, max_amount: -2 }); 
      if (clearInput) setManualInputValue('');
  };

  const handleSaveGlobal = () => {
      if (!globalInputValue) return;
      const val = Number(globalInputValue) * 100; 
      saveLimit('ALL', val);
  };

  const handleSetGlobalUnlimited = () => {
      saveLimit('ALL', -1);
      setGlobalInputValue('');
  };

  // --- THEME ENGINE (Hyper-Neon Reactor) ---
  const theme = useMemo(() => {
      if (displayDraw.includes('Mediodía')) return { 
          hex: '#ff5f00', name: 'solar', gradient: 'from-orange-500 via-red-500 to-yellow-500', 
          border: 'border-cyber-solar', text: 'text-cyber-solar', bg: 'bg-cyber-solar',
          shadow: 'shadow-neon-solar',
          glowInner: 'shadow-[inset_0_0_20px_rgba(255,95,0,0.2)]',
          stroke: '#ff5f00',
          ring: 'border-orange-500',
          ringLight: 'border-orange-300'
      };
      if (displayDraw.includes('Tarde')) return { 
          hex: '#7c3aed', name: 'vapor', gradient: 'from-purple-600 via-indigo-500 to-pink-500', 
          border: 'border-cyber-vapor', text: 'text-cyber-vapor', bg: 'bg-cyber-vapor',
          shadow: 'shadow-neon-vapor',
          glowInner: 'shadow-[inset_0_0_20px_rgba(124,58,237,0.2)]',
          stroke: '#7c3aed',
          ring: 'border-purple-500',
          ringLight: 'border-fuchsia-300'
      };
      return { 
          hex: '#2563eb', name: 'abyss', gradient: 'from-blue-600 via-cyan-500 to-teal-400', 
          border: 'border-blue-600', text: 'text-blue-400', bg: 'bg-blue-600',
          shadow: 'shadow-neon-blue',
          glowInner: 'shadow-[inset_0_0_20px_rgba(37,99,235,0.2)]',
          stroke: '#2563eb',
          ring: 'border-blue-500',
          ringLight: 'border-cyan-300'
      };
  }, [displayDraw]);

  // --- HELPERS ---
  const activeCell = gridData.find(c => c.number === (hoveredNumber || selectedNumber)) || null;
  const totalExposure = gridData.reduce((acc, curr) => acc + curr.amount, 0);
  const isActiveLocked = activeCell?.limit === 0;

  return (
    <div className="w-full relative group font-sans pt-6">
        
        {/* === LIVING PHOSPHORESCENT HULL (Exterior) === */}
        <div className={`absolute -inset-6 opacity-40 blur-[80px] rounded-[3rem] bg-gradient-to-br ${theme.gradient} animate-[pulse_6s_ease-in-out_infinite] pointer-events-none transition-all duration-1000`}></div>
        <div className={`absolute -inset-[2px] rounded-[2.2rem] opacity-90 blur-[2px] transition-all duration-700 animate-pulse ${theme.bg} pointer-events-none`}></div>
        <div className={`absolute -inset-[4px] rounded-[2.3rem] opacity-40 blur-[8px] transition-all duration-700 ${theme.bg} pointer-events-none`}></div>
        <div className={`absolute -inset-[1px] rounded-[2.1rem] border border-white/20 z-20 pointer-events-none`}></div>
        
        {/* 3. Main Reactor Core */}
        <div className={`relative bg-[#02040a] border-2 ${theme.border} rounded-[2rem] overflow-hidden ${theme.shadow} flex flex-col xl:flex-row min-h-[750px] transition-all duration-500 z-10 box-border`}>
            
            {/* ====================================================================================
                LEFT PANEL: THE MATRIX (60%)
               ==================================================================================== */}
            <div className="xl:w-3/5 flex flex-col border-r border-white/5 relative z-10">
                
                {/* 1. HUD HEADER */}
                <div className="p-4 md:p-6 border-b border-white/5 bg-[#05070a]/95 backdrop-blur-md relative overflow-hidden transition-colors duration-500">
                    <div className={`absolute top-0 left-0 w-full h-[2px] ${theme.bg} shadow-[0_0_20px_currentColor] z-20`}></div>
                    <div className={`absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-${theme.name === 'solar' ? 'orange' : theme.name === 'vapor' ? 'purple' : 'blue'}-500/10 to-transparent transition-all duration-700`}></div>

                    <div className="flex flex-col md:flex-row justify-between items-start mb-6 relative z-10 gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${theme.bg} shadow-[0_0_10px_currentColor] animate-ping`}></div>
                                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-[0.3em] font-bold">Defensa Activa</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tighter flex items-center gap-3 drop-shadow-md">
                                Matriz <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.gradient} filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]`}>Riesgo</span>
                            </h2>
                        </div>
                        
                        <div className="text-right">
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Límite de Contención</div>
                            <div className={`text-2xl md:text-3xl font-mono font-black ${effectiveGlobalLimit === 0 ? 'text-red-500 drop-shadow-[0_0_10px_red]' : theme.text} drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-all duration-500`}>
                                {effectiveGlobalLimit === Infinity ? (
                                    
                                    /* --- HYPER-ATOM VISUALIZATION (Top Right) --- */
                                    <div className="flex items-center justify-end gap-3 relative group/neural">
                                        
                                        {/* Orbital System Container */}
                                        <div className="relative w-12 h-12 flex items-center justify-center">
                                            
                                            {/* Nucleus */}
                                            <div className={`absolute z-20 text-xl font-bold ${theme.text} drop-shadow-[0_0_10px_currentColor]`}>∞</div>
                                            
                                            {/* Orbit 1 */}
                                            <div className={`absolute w-full h-4 border border-current rounded-[100%] animate-[spin_3s_linear_infinite] ${theme.text} opacity-60`}></div>
                                            
                                            {/* Orbit 2 */}
                                            <div className={`absolute w-full h-4 border border-current rounded-[100%] animate-[spin_4s_linear_infinite_reverse] ${theme.text} opacity-60 rotate-60`}></div>
                                            
                                            {/* Orbit 3 */}
                                            <div className={`absolute w-full h-4 border border-current rounded-[100%] animate-[spin_5s_linear_infinite] ${theme.text} opacity-60 -rotate-60`}></div>
                                            
                                            {/* Particles */}
                                            <div className={`absolute w-1 h-1 bg-white rounded-full animate-[orbit_3s_linear_infinite]`}></div>
                                        </div>

                                        <span className={`text-lg tracking-widest font-bold ${theme.text} animate-pulse drop-shadow-[0_0_5px_currentColor]`}>LIBRE</span>
                                    </div>

                                ) : (
                                    <span className={`${theme.text} drop-shadow-[0_0_15px_currentColor]`}>
                                        {formatCurrency(effectiveGlobalLimit)}
                                    </span>
                                )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center justify-end gap-1">
                                <span className={`w-1 h-3 ${theme.bg}`}></span> Exp: {formatCurrency(totalExposure)}
                            </div>
                        </div>
                    </div>

                    {/* CONTROLS BRIDGE */}
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4 overflow-x-auto pb-2">
                        <div className="flex gap-2 md:gap-3">
                            {Object.values(DrawTime).map((d) => {
                                const isActive = activeDraw === d;
                                return (
                                    <button
                                        key={d}
                                        onClick={() => handleDrawChange(d)}
                                        disabled={isSwitching}
                                        className={`relative px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all duration-300 overflow-hidden group border whitespace-nowrap
                                            ${isActive 
                                                ? `text-white ${theme.border} ${theme.bg.replace('bg-', 'bg-opacity-20 ')} shadow-[0_0_20px_rgba(0,0,0,0.5)]` 
                                                : 'text-slate-500 border-white/5 bg-white/5 hover:text-white hover:border-white/20'
                                            }`}
                                    >
                                        {isActive && (
                                            <>
                                                <div className={`absolute inset-0 opacity-30 bg-gradient-to-t ${theme.gradient} animate-pulse`}></div>
                                                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white shadow-[0_0_10px_white]"></div>
                                            </>
                                        )}
                                        <span className="relative z-10 flex items-center gap-2">
                                            <i className={`fas ${d.includes('Noche') ? 'fa-moon' : 'fa-sun'} ${isActive && !isSwitching ? 'animate-bounce' : ''}`}></i>
                                            {d.split(' ')[0]}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex bg-black rounded-lg p-1 border border-white/10 shadow-inner">
                            {[
                                { id: 'SATURATION', label: '%', icon: 'fa-chart-pie' },
                                { id: 'VOLUME', label: '$', icon: 'fa-coins' },
                                { id: 'VELOCITY', label: 'V', icon: 'fa-tachometer-alt' }
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setViewMode(m.id as ViewMode)}
                                    className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold uppercase transition-all ${
                                        viewMode === m.id 
                                        ? `${theme.bg} text-black shadow-[0_0_10px_currentColor]` 
                                        : 'text-slate-600 hover:text-white'
                                    }`}
                                    title={m.label}
                                >
                                    <i className={`fas ${m.icon}`}></i>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. THE GRID (LIVING MATRIX) - ADAPTIVE */}
                <div className="flex-1 p-4 md:p-6 relative bg-[#020305] overflow-hidden group/grid custom-scrollbar overflow-y-auto">
                    <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-${theme.name === 'solar' ? 'orange' : theme.name === 'vapor' ? 'purple' : 'blue'}-500/10 to-transparent w-full h-[30%] pointer-events-none z-0 animate-[scan_6s_linear_infinite] opacity-30`}></div>
                    
                    <div className={`transition-all duration-500 ease-out transform ${isSwitching ? 'scale-95 opacity-0 blur-sm' : 'scale-100 opacity-100 blur-0'}`}>
                        {/* ADAPTIVE GRID: 5 cols on mobile, 10 cols on sm+ */}
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-1.5 h-full content-start relative z-10">
                            {gridData.map((cell, idx) => {
                                const isSelected = cell.number === selectedNumber;
                                const isHighRisk = cell.percent >= 90;
                                const isMedRisk = cell.percent >= 70;
                                const isLocked = cell.limit === 0;
                                
                                let bgClass = 'bg-[#0f1219]';
                                // Base Border: Very subtle white to show grid
                                let borderClass = 'border-white/5';
                                // Base Text: Thematic Color but dimmed to avoid noise
                                let textClass = `${theme.text} opacity-40 font-bold transition-all duration-300`;
                                
                                if (viewMode === 'SATURATION' && cell.percent > 0) {
                                    bgClass = isHighRisk ? 'bg-red-900/40' : isMedRisk ? 'bg-yellow-900/40' : `bg-${theme.name === 'solar' ? 'orange' : theme.name === 'vapor' ? 'purple' : 'blue'}-900/30`;
                                    // Override borders for risk zones
                                    borderClass = isHighRisk ? 'border-red-500/50' : isMedRisk ? 'border-yellow-500/50' : `${theme.border.replace('border-', 'border-opacity-50 border-')}`;
                                    // High contrast text for filled cells
                                    textClass = 'text-white font-bold text-shadow';
                                }

                                if (isSelected) {
                                    bgClass = 'bg-white/10';
                                    // CRITICAL UPDATE: Use Theme Color for Selection Border & Shadow
                                    borderClass = `${theme.border} ${theme.shadow} border-opacity-100`;
                                    textClass = 'text-white font-black drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]';
                                } else if (cell.number === hoveredNumber) {
                                    // THEMATIC HOVER STATE
                                    borderClass = `${theme.border} ${theme.shadow} border-opacity-100`;
                                    bgClass = `${theme.bg.replace('bg-', 'bg-opacity-10 bg-')}`;
                                    // Full opacity text with glow
                                    textClass = `${theme.text} opacity-100 font-black drop-shadow-[0_0_10px_currentColor]`;
                                }

                                // Locked Style Override (Total Block)
                                if (isLocked && !isSelected) {
                                    borderClass = 'border-red-600 shadow-[0_0_10px_red]';
                                    textClass = 'text-red-500 font-bold';
                                    bgClass = 'bg-red-950/20';
                                } else if (cell.isShielded && !isSelected && !isLocked) {
                                    // Soft shield (Threshold based)
                                    borderClass = 'border-cyan-500 shadow-[0_0_10px_cyan]';
                                    textClass = 'text-cyan-400 font-bold';
                                }

                                const pulseDelay = `${(idx % 10) * 0.2}s`;

                                return (
                                    <button
                                        key={cell.number}
                                        onMouseEnter={() => setHoveredNumber(cell.number)}
                                        onMouseLeave={() => setHoveredNumber(null)}
                                        onClick={() => handleCellClick(cell.number)}
                                        className={`
                                            aspect-square rounded-lg border flex flex-col items-center justify-center overflow-hidden transition-all duration-300 relative
                                            ${bgClass} ${borderClass}
                                            ${isSelected ? 'z-20 scale-110 shadow-2xl' : 'hover:scale-110 hover:z-20 hover:shadow-xl'}
                                        `}
                                        style={{ transitionDelay: `${idx * 5}ms` }}
                                    >
                                        <span className={`text-[10px] sm:text-xs md:text-sm font-mono z-10 ${textClass} ${isHighRisk || isLocked ? 'animate-pulse' : ''}`}>
                                            {isLocked ? <i className="fas fa-lock text-[8px] sm:text-[10px] mb-1"></i> : cell.number}
                                        </span>
                                        {isLocked && <span className="text-[6px] sm:text-[8px] text-red-500 font-bold">BLOCK</span>}

                                        {cell.percent > 0 && !isLocked && (
                                            <div className={`absolute inset-0 bg-white opacity-0 animate-[pulse_3s_ease-in-out_infinite]`} style={{ animationDelay: pulseDelay, animationDuration: isHighRisk ? '1s' : '3s' }}></div>
                                        )}

                                        {cell.isManual && !isLocked && (
                                            <div className="absolute top-0.5 right-0.5 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-cyan-400 rounded-full shadow-[0_0_5px_cyan] animate-[ping_3s_infinite]"></div>
                                        )}

                                        {cell.percent > 0 && !isLocked && (
                                            <div 
                                                className={`absolute bottom-0 left-0 w-full transition-all duration-700 ease-out opacity-30 ${isHighRisk ? 'bg-red-500' : isMedRisk ? 'bg-yellow-500' : theme.bg}`} 
                                                style={{ height: `${cell.percent}%` }}
                                            ></div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* 3. ALARM TICKER */}
                <div className="h-8 bg-[#020202] border-t border-white/5 flex items-center overflow-hidden relative z-20">
                    <div className={`px-4 h-full flex items-center text-[9px] font-bold ${theme.text} uppercase tracking-widest z-10 border-r border-white/10 bg-black`}>
                        <i className="fas fa-network-wired mr-2 animate-pulse"></i> PHRONT_NET
                    </div>
                    <div className="flex-1 whitespace-nowrap animate-scroll-ticker flex items-center text-[9px] font-mono text-slate-500">
                        <span className="mx-6">SYSTEM INTEGRITY: 100%</span>
                        <span className="mx-6 text-slate-700">|</span>
                        <span className="mx-6">LOCKED VECTORS: {gridData.filter(c => c.limit === 0).length}</span>
                        <span className="mx-6 text-slate-700">|</span>
                        <span className="mx-6">SHIELD THRESHOLD: {autoShieldThreshold}%</span>
                    </div>
                </div>
            </div>

            {/* ====================================================================================
                RIGHT PANEL: DUAL MODE
               ==================================================================================== */}
            <div className="xl:w-2/5 bg-[#05070a] flex flex-col relative overflow-hidden transition-all duration-500 z-10 border-t xl:border-t-0 xl:border-l border-white/5">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:30px_30px] pointer-events-none"></div>

                {selectedNumber ? (
                    // --- MODE A: NUMBER INSPECTOR ---
                    <div className="flex-1 flex flex-col p-6 md:p-8 relative z-10 animate-in slide-in-from-right-8 duration-300">
                        
                        {/* BLOCK CONFIRMATION OVERLAY */}
                        {blockSuccess && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                                <div className="border-2 border-red-500 p-8 rounded-3xl bg-red-950/80 text-center shadow-[0_0_50px_red] w-3/4">
                                    <div className="relative inline-block mb-4">
                                        <div className="absolute inset-0 bg-red-500 blur-xl opacity-50 animate-ping"></div>
                                        <i className="fas fa-lock text-6xl text-red-500 relative z-10"></i>
                                    </div>
                                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">VECTOR {selectedNumber}</h3>
                                    <div className="text-red-500 font-display font-bold text-xl uppercase tracking-[0.5em] animate-pulse">LOCKED DOWN</div>
                                </div>
                            </div>
                        )}

                        {/* UNLOCK CONFIRMATION OVERLAY */}
                        {unlockSuccess && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                                <div className="border-2 border-cyan-500 p-8 rounded-3xl bg-cyan-950/80 text-center shadow-[0_0_50px_cyan] w-3/4">
                                    <div className="relative inline-block mb-4">
                                        <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-50 animate-ping"></div>
                                        <i className="fas fa-lock-open text-6xl text-cyan-400 relative z-10"></i>
                                    </div>
                                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">VECTOR {selectedNumber}</h3>
                                    <div className="text-cyan-400 font-display font-bold text-xl uppercase tracking-[0.5em] animate-pulse">RESTORED</div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-8 relative">
                            <button onClick={() => setSelectedNumber(null)} className="absolute -top-4 -right-4 text-slate-500 hover:text-white p-2 transition-colors">
                                <i className="fas fa-times text-lg"></i>
                            </button>
                            <div className={`absolute -inset-4 ${theme.bg} opacity-20 blur-3xl rounded-full animate-pulse`}></div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1">Análisis de Vector</div>
                                <div className="text-6xl md:text-8xl font-mono font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                    {selectedNumber}
                                </div>
                            </div>
                            <div className="text-right self-center">
                                <div className={`text-4xl md:text-6xl font-mono font-bold ${activeCell?.percent && activeCell.percent >= 90 ? 'text-red-500 drop-shadow-[0_0_15px_red]' : 'text-white'}`}>
                                    {activeCell?.percent.toFixed(0)}<span className="text-xl md:text-2xl opacity-50">%</span>
                                </div>
                                <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Saturación</div>
                            </div>
                        </div>

                        {activeCell && (
                            <>
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 md:p-5 hover:border-white/10 transition-colors relative overflow-hidden group/card">
                                        <div className="text-[9px] text-slate-400 uppercase mb-2 font-bold tracking-wider">Volumen (CRC)</div>
                                        <div className="text-lg md:text-2xl font-mono font-bold text-white">{formatCurrency(activeCell.amount)}</div>
                                        <div className="w-full bg-black h-1.5 mt-3 rounded-full overflow-hidden border border-white/10">
                                            <div className={`h-full ${theme.bg} shadow-[0_0_10px_currentColor]`} style={{ width: `${activeCell.percent}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 md:p-5 hover:border-white/10 transition-colors relative overflow-hidden group/card">
                                        <div className="text-[9px] text-slate-400 uppercase mb-2 font-bold tracking-wider">Límite Actual</div>
                                        <div className={`text-lg md:text-2xl font-mono font-bold ${activeCell.limit === 0 ? 'text-red-500' : theme.text} drop-shadow-[0_0_10px_currentColor]`}>
                                            {activeCell.limit === Infinity ? '∞' : formatCurrency(activeCell.limit)}
                                        </div>
                                        <div className={`text-[9px] mt-2 flex items-center gap-1 font-bold ${activeCell.isManual ? 'text-cyan-400' : 'text-slate-500'}`}>
                                            <i className={`fas ${activeCell.isManual ? 'fa-lock' : 'fa-link'}`}></i>
                                            {activeCell.isManual ? 'MANUAL' : 'GLOBAL'}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-6 border-t border-white/10">
                                    <label className="text-[9px] text-slate-500 uppercase font-bold mb-3 block ml-1 tracking-widest">Control Manual Individual</label>
                                    <div className="flex gap-2 mb-4">
                                        <div className="relative flex-1 group/input">
                                            <div className={`absolute -inset-0.5 ${theme.bg} rounded-xl blur opacity-0 group-focus-within/input:opacity-60 transition-opacity duration-300`}></div>
                                            <input 
                                                type="number"
                                                value={manualInputValue}
                                                onChange={e => setManualInputValue(e.target.value)}
                                                className="relative bg-black border border-slate-700 rounded-xl px-4 py-4 text-white font-mono text-lg md:text-xl w-full focus:border-white focus:outline-none transition-colors z-10 shadow-inner"
                                                placeholder="Nuevo Límite"
                                            />
                                        </div>
                                        <button 
                                            onClick={handleSaveSelected}
                                            disabled={saveStatus !== 'IDLE'}
                                            className={`px-6 rounded-xl font-bold uppercase transition-all shadow-lg border-2 ${
                                                saveStatus === 'SUCCESS' ? 'bg-green-500 border-green-500 text-black' : `bg-black ${theme.border} ${theme.text} hover:bg-white hover:text-black hover:border-white`
                                            }`}
                                        >
                                            {saveStatus === 'SAVING' ? <i className="fas fa-circle-notch fa-spin"></i> : saveStatus === 'SUCCESS' ? <i className="fas fa-check"></i> : <i className="fas fa-save"></i>}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {/* DYNAMIC LOCK/UNLOCK BUTTON */}
                                        {isActiveLocked ? (
                                            <button 
                                                onClick={handleUnlockSelected}
                                                disabled={saveStatus !== 'IDLE'}
                                                className="relative overflow-hidden py-4 rounded-xl border-2 border-cyan-500 bg-cyan-900/40 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all flex items-center justify-center gap-2 group/btn shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-neon-cyan"
                                            >
                                                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] animate-[shine_2s_infinite] opacity-0 group-hover/btn:opacity-100"></div>
                                                <i className="fas fa-lock-open text-lg group-hover/btn:animate-bounce"></i>
                                                <span className="text-[10px] font-black uppercase tracking-wider">DESBLOQUEAR</span>
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={handleBlockSelected}
                                                disabled={saveStatus !== 'IDLE'}
                                                className="relative overflow-hidden py-4 rounded-xl border-2 border-red-600 bg-red-950/40 text-red-500 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 group/btn shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:shadow-neon-red"
                                            >
                                                {saveStatus === 'SAVING' ? (
                                                    <span className="text-[10px] font-black uppercase tracking-wider animate-pulse">ENCRIPTANDO...</span>
                                                ) : (
                                                    <>
                                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,0,0,0.2)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] animate-[shine_2s_infinite] opacity-0 group-hover/btn:opacity-100"></div>
                                                        <i className="fas fa-lock text-lg group-hover/btn:animate-pulse"></i>
                                                        <span className="text-[10px] font-black uppercase tracking-wider">LOCKDOWN</span>
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        <button onClick={() => handleResetSelected(true)} className="py-4 bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2">
                                            <i className="fas fa-undo text-lg"></i> RESET
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    // --- MODE B: GLOBAL CONTROL CENTER (HYPER ATOM STYLE) ---
                    <div className="flex-1 flex flex-col relative z-10 animate-in fade-in zoom-in duration-500 bg-[#05070a]">
                        <div className="p-6 md:p-8 border-b border-white/5 bg-black/20">
                            <h2 className="text-2xl font-display font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full border-2 ${theme.border} flex items-center justify-center animate-spin-slow shadow-[0_0_20px_currentColor]`}>
                                    <i className={`fas fa-atom ${theme.text} text-xl`}></i>
                                </div>
                                Core <span className={`${theme.text} text-glow-sm`}>Control</span>
                            </h2>
                            <p className="text-[10px] font-mono text-slate-500 uppercase mt-2 tracking-wider">
                                Protocolos de Contención Global
                            </p>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center relative p-8">
                            
                            {/* --- HYPER-ATOM VISUALIZATION --- */}
                            <div className="relative w-[360px] h-[360px] flex items-center justify-center">
                                {/* 1. The Deep Void (Background Ambience) */}
                                <div className={`absolute inset-0 opacity-10 blur-3xl rounded-full ${theme.bg}`}></div>
                                
                                {/* 2. The Atom SVG */}
                                <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                                    <defs>
                                        <filter id="atomGlow" x="-50%" y="-50%" width="200%" height="200%">
                                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                            <feMerge>
                                                <feMergeNode in="coloredBlur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                        <filter id="coreGlow">
                                            <feGaussianBlur stdDeviation="5" result="blur" />
                                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                        </filter>
                                    </defs>

                                    {/* ORBITAL 1 */}
                                    <g className="origin-center animate-[spin_10s_linear_infinite]">
                                        <ellipse cx="100" cy="100" rx="95" ry="25" stroke={theme.hex} strokeWidth="2" fill="none" filter="url(#atomGlow)" className="opacity-70 mix-blend-screen" />
                                        <circle cx="195" cy="100" r="4" fill="#fff" filter="url(#atomGlow)" />
                                    </g>

                                    {/* ORBITAL 2 (Rotated 60) */}
                                    <g className="origin-center rotate-60 animate-[spin_12s_linear_infinite_reverse]">
                                        <ellipse cx="100" cy="100" rx="95" ry="25" stroke={theme.hex} strokeWidth="2" fill="none" filter="url(#atomGlow)" className="opacity-70 mix-blend-screen" />
                                        <circle cx="5" cy="100" r="4" fill="#fff" filter="url(#atomGlow)" />
                                    </g>

                                    {/* ORBITAL 3 (Rotated -60) */}
                                    <g className="origin-center -rotate-60 animate-[spin_15s_linear_infinite]">
                                        <ellipse cx="100" cy="100" rx="95" ry="25" stroke={theme.hex} strokeWidth="2" fill="none" filter="url(#atomGlow)" className="opacity-70 mix-blend-screen" />
                                        <circle cx="195" cy="100" r="4" fill="#fff" filter="url(#atomGlow)" />
                                    </g>

                                    {/* NUCLEUS (Infinity Symbol) */}
                                    <text 
                                        x="100" 
                                        y="115" 
                                        textAnchor="middle" 
                                        fill="#fff" 
                                        className="text-6xl font-black drop-shadow-[0_0_25px_rgba(255,255,255,1)]"
                                        filter="url(#coreGlow)"
                                    >
                                        ∞
                                    </text>
                                </svg>

                                {/* 4. Central Data Display Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                                    <div className={`mt-24 bg-black/80 backdrop-blur-md px-6 py-2 rounded-2xl border border-white/10 ${effectiveGlobalLimit === 0 ? 'border-red-500 shadow-[0_0_15px_red]' : `${theme.border} shadow-[0_0_15px_${theme.hex}]`}`}>
                                        <div className={`text-4xl md:text-5xl font-mono font-black ${effectiveGlobalLimit === 0 ? 'text-red-500' : theme.text} text-shadow-sm`}>
                                            {effectiveGlobalLimit === Infinity ? (
                                                <span className="flex items-center gap-2 tracking-widest text-2xl">ILIMITADO</span>
                                            ) : (
                                                formatCurrency(effectiveGlobalLimit).replace('CRC', '').trim()
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={`text-[10px] font-bold uppercase tracking-[0.4em] mt-8 ${effectiveGlobalLimit === Infinity ? theme.text : effectiveGlobalLimit === 0 ? 'text-red-500 animate-pulse' : theme.text} text-shadow-sm`}>
                                {effectiveGlobalLimit === Infinity ? 'ESTADO: FLUJO LIBRE' : effectiveGlobalLimit === 0 ? 'ESTADO: BLOQUEO TOTAL' : 'ESTADO: RESTRINGIDO'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-2 uppercase tracking-widest border-t border-white/10 pt-2 inline-block px-4">
                                Energía Cuántica Estable
                            </div>
                        </div>

                        <div className="p-6 md:p-8 border-t border-white/10 bg-[#020305]">
                            <div className="relative bg-black border border-white/10 rounded-2xl p-1.5 flex mb-6 shadow-inner overflow-hidden h-16">
                                <div 
                                    className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl transition-all duration-500 ease-out z-0 
                                    ${effectiveGlobalLimit === Infinity 
                                        ? `translate-x-0 ${theme.bg}/20 border ${theme.border} shadow-[0_0_20px_rgba(0,0,0,0.5)]` 
                                        : 'translate-x-[100%] bg-red-900/30 border border-red-500/50 shadow-[0_0_20px_rgba(255,0,0,0.3)] left-[6px]'
                                    }`}
                                ></div>

                                <button 
                                    onClick={handleSetGlobalUnlimited}
                                    className={`relative flex-1 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-500 z-10 group
                                    ${effectiveGlobalLimit === Infinity ? theme.text : 'text-slate-500 hover:text-white'}`}
                                >
                                    {/* --- ATOM ICON SMALL --- */}
                                    <i className={`fas fa-atom text-xl ${effectiveGlobalLimit === Infinity ? 'animate-spin-slow' : ''}`}></i>
                                    <span className={effectiveGlobalLimit === Infinity ? "drop-shadow-[0_0_5px_currentColor]" : ""}>ILIMITADO</span>
                                </button>

                                <button 
                                    onClick={() => { if(effectiveGlobalLimit === Infinity) setGlobalInputValue('50000'); }}
                                    className={`relative flex-1 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-500 z-10 overflow-hidden group
                                    ${effectiveGlobalLimit !== Infinity ? 'text-red-500' : 'text-slate-500 hover:text-white'}`}
                                >
                                    <i className={`fas fa-lock text-xl ${effectiveGlobalLimit !== Infinity ? 'drop-shadow-[0_0_5px_red]' : ''}`}></i>
                                    <span>RESTRINGIDO</span>
                                </button>
                            </div>

                            <div className={`transition-all duration-500 overflow-hidden ${effectiveGlobalLimit !== Infinity || globalInputValue ? 'max-h-40 opacity-100' : 'max-h-0 opacity-50'}`}>
                                <div className="flex gap-2">
                                    <div className="relative flex-1 group/input">
                                        <div className="absolute -inset-0.5 bg-red-500/30 rounded-xl blur opacity-0 group-focus-within/input:opacity-100 transition-opacity"></div>
                                        <input 
                                            type="number"
                                            value={globalInputValue}
                                            onChange={e => setGlobalInputValue(e.target.value)}
                                            className={`relative w-full bg-black border border-red-900/50 rounded-xl px-4 py-4 text-center ${theme.text} font-mono text-xl focus:border-red-500 focus:outline-none transition-colors shadow-inner`}
                                            placeholder="DEFINIR LÍMITE..."
                                        />
                                    </div>
                                    <button 
                                        onClick={handleSaveGlobal}
                                        disabled={saveStatus !== 'IDLE' || !globalInputValue}
                                        className="w-24 bg-red-600 hover:bg-white hover:text-red-600 text-black font-bold rounded-xl flex items-center justify-center text-2xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saveStatus === 'SAVING' ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check"></i>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- BLINDAJE MASTER SWITCH (Fixed Bottom) --- */}
                <div className="p-4 border-t border-white/10 bg-[#02040a] relative z-20">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Protocolo de Emergencia</div>
                            <div className="text-xs text-white font-mono font-bold flex items-center gap-2">
                                AUTO-BLINDAJE 
                                <span className={`text-[10px] ${isBlindajeActive ? 'text-red-500 animate-pulse' : 'text-slate-600'}`}>
                                    ({autoShieldThreshold}%)
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsBlindajeActive(!isBlindajeActive)}
                            className={`relative w-16 h-8 rounded-full transition-colors duration-300 border border-white/10 ${isBlindajeActive ? 'bg-red-600 shadow-[0_0_20px_red]' : 'bg-black'}`}
                        >
                            <div className={`absolute top-1 bottom-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md flex items-center justify-center ${isBlindajeActive ? 'translate-x-9' : 'translate-x-1'}`}>
                                {isBlindajeActive && <i className="fas fa-shield-alt text-[8px] text-red-600"></i>}
                            </div>
                        </button>
                    </div>

                    {/* NEW: Adjustable Threshold Slider */}
                    {isBlindajeActive && (
                        <div className="mt-4 animate-in slide-in-from-bottom-2 fade-in">
                            <div className="relative h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                                {/* Fill */}
                                <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-800 to-red-500 transition-all duration-100" style={{width: `${autoShieldThreshold}%`}}></div>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={autoShieldThreshold}
                                onChange={(e) => setAutoShieldThreshold(Number(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
                            />
                            <div className="flex justify-between mt-1 text-[8px] font-mono text-slate-600 uppercase tracking-wider">
                                <span>0% (Total)</span>
                                <span>Sensibilidad</span>
                                <span>100% (Crítico)</span>
                            </div>
                        </div>
                    )}
                </div>

            </div>

        </div>
        <style>{`
            @keyframes dash {
                to {
                    stroke-dashoffset: 0;
                }
            }
            @keyframes orbit {
                from { transform: rotate(0deg) translateX(60px) rotate(0deg); }
                to { transform: rotate(360deg) translateX(60px) rotate(-360deg); }
            }
        `}</style>
    </div>
  );
}
