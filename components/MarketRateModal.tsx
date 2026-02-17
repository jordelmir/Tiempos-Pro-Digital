
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/edgeApi';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface MarketRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTiempos: number;
  currentReventados: number;
  onSuccess: () => void;
}

export default function MarketRateModal({ isOpen, onClose, currentTiempos, currentReventados, onSuccess }: MarketRateModalProps) {
  useBodyScrollLock(isOpen);

  const [tiempos, setTiempos] = useState<number>(currentTiempos);
  const [reventados, setReventados] = useState<number>(currentReventados);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setTiempos(currentTiempos);
      setReventados(currentReventados);
      setProgress(0);
      setLoading(false);
    }
  }, [isOpen, currentTiempos, currentReventados]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    // Simulación de inyección de parámetros
    let p = 0;
    const interval = setInterval(async () => {
        p += 10;
        setProgress(p);
        if (p >= 100) {
            clearInterval(interval);
            try {
                const res = await api.updateMarketRates(tiempos, reventados);
                if (!res.error) {
                    if (navigator.vibrate) navigator.vibrate(100);
                    onSuccess();
                    onClose();
                } else {
                    alert(res.error);
                    setLoading(false);
                    setProgress(0);
                }
            } catch (e) {
                alert("Fallo de enlace con el núcleo de tasas.");
                setLoading(false);
            }
        }
    }, 50);
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300 p-4">
      <div className="relative max-w-lg w-full">
        {/* Glow de fondo dinámico */}
        <div className="absolute -inset-4 bg-cyber-success/20 rounded-[4rem] blur-3xl animate-pulse transition-all duration-1000"></div>

        <div className="relative bg-[#050a14] border-4 border-cyber-success/30 rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,255,148,0.2)]">
          {/* Header */}
          <div className="p-8 border-b border-white/10 bg-white/5 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-cyber-success shadow-[0_0_15px_#00FF94] animate-pulse"></div>
            <div>
              <h3 className="text-2xl font-display font-black text-white uppercase tracking-widest leading-none">Ajuste de <span className="text-cyber-success">Rendimiento</span></h3>
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.4em] mt-2">Protocolo de Tasas Directas v4.1</p>
            </div>
            <button onClick={onClose} className="w-12 h-12 rounded-full bg-black border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all">
                <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="p-10 space-y-10">
            {/* Input Tiempos */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-cyber-success uppercase tracking-[0.5em]">Factor Tiempos (Normal)</label>
                    <span className="text-[10px] font-mono text-slate-500 italic">Actual: {currentTiempos}x</span>
                </div>
                <div className="relative group">
                    <input 
                        type="number" value={tiempos} onChange={e => setTiempos(Number(e.target.value))}
                        className="w-full bg-black border-2 border-white/5 rounded-2xl py-6 text-center text-6xl font-display font-black text-white focus:border-cyber-success focus:shadow-neon-green outline-none transition-all"
                    />
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 text-2xl font-black text-white/10">X</div>
                </div>
            </div>

            {/* Input Reventados */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-red-500 uppercase tracking-[0.5em]">Factor Reventados (Fire)</label>
                    <span className="text-[10px] font-mono text-slate-500 italic">Actual: {currentReventados}x</span>
                </div>
                <div className="relative group">
                    <input 
                        type="number" value={reventados} onChange={e => setReventados(Number(e.target.value))}
                        className="w-full bg-black border-2 border-white/5 rounded-2xl py-6 text-center text-6xl font-display font-black text-red-500 focus:border-red-600 focus:shadow-neon-red outline-none transition-all"
                    />
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 text-2xl font-black text-white/10">X</div>
                </div>
            </div>

            {/* Warning de niveles */}
            {(tiempos > 100 || reventados > 250) && (
                <div className="p-4 bg-red-950/30 border border-red-600/30 rounded-2xl animate-pulse">
                    <p className="text-[9px] text-red-500 font-black text-center uppercase tracking-widest">
                        <i className="fas fa-triangle-exclamation mr-2"></i>
                        Advertencia: Tasas fuera de margen operativo estándar detectadas.
                    </p>
                </div>
            )}

            {/* Action Button */}
            <div className="relative h-24">
                <div className="absolute inset-0 bg-black/40 rounded-3xl overflow-hidden border border-white/5">
                    <div className="h-full bg-cyber-success opacity-20 transition-all duration-75" style={{ width: `${progress}%` }}></div>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={loading || tiempos <= 0 || reventados <= 0}
                    className={`absolute inset-0 w-full h-full rounded-3xl font-display font-black uppercase text-xl tracking-[0.5em] flex items-center justify-center gap-6 transition-all active:scale-95
                        ${loading ? 'text-white' : 'bg-cyber-success text-black hover:bg-white shadow-neon-green'}
                    `}
                >
                    {loading ? (
                        <>
                            <i className="fas fa-atom fa-spin text-3xl"></i>
                            <span>SINCRONIZANDO {progress}%</span>
                        </>
                    ) : (
                        <>
                            <i className="fas fa-save text-3xl"></i>
                            <span>CALIBRAR TASAS</span>
                        </>
                    )}
                </button>
            </div>
          </div>

          <div className="p-5 bg-black/60 text-center border-t border-white/5">
             <p className="text-[8px] font-mono text-slate-600 uppercase tracking-[0.6em]">Seguridad de Grado Militar - Núcleo Phront Maestro</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
