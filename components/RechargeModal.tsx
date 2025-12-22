import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/edgeApi';
import { AppUser, UserRole } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency } from '../constants';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: AppUser | null;
  onSuccess?: () => void;
}

type ChargeStatus = 'IDLE' | 'CONNECTING' | 'CHARGING' | 'INJECTING' | 'COMPLETED' | 'ERROR';

export default function RechargeModal({
  isOpen,
  onClose,
  targetUser,
  onSuccess,
}: RechargeModalProps) {
  useBodyScrollLock(isOpen); // LOCK BACKGROUND SCROLL

  const currentUser = useAuthStore((s) => s.user);
  const [amount, setAmount] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ChargeStatus>('IDLE');
  const [finalBalance, setFinalBalance] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setStatus('IDLE');
      setAmount('');
      setLoading(false);
      setFinalBalance(0);
    }
  }, [isOpen]);

  if (!isOpen || !targetUser || !currentUser) return null;

  const handleClose = () => {
    if (status === 'COMPLETED') {
      onSuccess?.();
    }
    setStatus('IDLE');
    setAmount('');
    onClose();
  };

  const handleRecharge = async () => {
    if (!amount || amount <= 0) return;

    setLoading(true);
    setStatus('CONNECTING');

    try {
      await new Promise((r) => setTimeout(r, 1000));
      setStatus('CHARGING');
      await new Promise((r) => setTimeout(r, 1500));
      setStatus('INJECTING');

      const res = await api.rechargeUser({
        target_user_id: targetUser.id,
        amount: Number(amount) * 100,
        actor_id: currentUser.id,
      });

      if (res.error) throw new Error(res.error);
      if (res.data) setFinalBalance(res.data.new_balance);

      await new Promise((r) => setTimeout(r, 800));
      setStatus('COMPLETED');

      setTimeout(() => {
        if (isOpen) {
          onSuccess?.();
          onClose();
        }
      }, 6000);
    } catch (e: any) {
      setStatus('ERROR');
      alert(e.message || 'Error crítico en transferencia.');
      setLoading(false);
    } finally {
      if (status === 'ERROR') setLoading(false);
    }
  };

  const getContainerClass = () => {
    switch (status) {
      case 'IDLE':
        return 'scale-100 opacity-100';
      case 'CONNECTING':
        return 'scale-95 opacity-80 border-cyber-emerald/50';
      case 'CHARGING':
        return 'scale-100 border-cyber-emerald shadow-[0_0_50px_#10b981]';
      case 'INJECTING':
        return 'scale-[1.02] border-white shadow-[0_0_80px_white]';
      case 'COMPLETED':
        return 'scale-100 border-cyber-emerald shadow-[0_0_30px_#10b981]';
      default:
        return '';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative max-w-md w-full mx-4 perspective-1000 max-h-[90vh] flex flex-col">
        {status !== 'INJECTING' && (
          <button
            onClick={handleClose}
            className="absolute -top-12 right-0 text-slate-500 hover:text-white transition-colors z-50"
          >
            <i className="fas fa-times text-2xl"></i>
          </button>
        )}

        <div
          className={`bg-[#050a14] border-2 border-white/10 rounded-3xl overflow-hidden relative transition-all duration-500 ${getContainerClass()} flex flex-col max-h-full`}
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>

          <div className="overflow-y-auto custom-scrollbar">
            {(status === 'IDLE' || status === 'ERROR') && (
              <div className="p-8 animate-in slide-in-from-bottom-4 duration-300">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 mx-auto bg-cyber-emerald/10 rounded-full border border-cyber-emerald/30 flex items-center justify-center mb-4 shadow-neon-emerald relative group">
                    <div className="absolute inset-0 rounded-full bg-cyber-emerald opacity-20 blur-md group-hover:opacity-40 transition-opacity"></div>
                    <i className="fas fa-bolt text-4xl text-cyber-emerald"></i>
                  </div>
                  <h3 className="text-2xl font-display font-black text-white uppercase tracking-wider">
                    Inyector de Saldo
                  </h3>
                  <p className="text-xs font-mono text-cyber-emerald uppercase tracking-widest">
                    Destino: {targetUser.name}
                  </p>
                </div>

                <div className="relative group/input mb-8">
                  <div className="absolute -inset-0.5 bg-cyber-emerald rounded-lg blur opacity-0 group-focus-within/input:opacity-50 transition-opacity duration-500"></div>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="relative w-full bg-black border border-slate-700 rounded-lg py-4 pl-6 pr-12 text-3xl font-mono text-white placeholder-slate-800 focus:border-cyber-emerald focus:outline-none focus:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all z-10"
                    placeholder="0.00"
                    autoFocus
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs z-20">
                    CRC
                  </div>
                </div>

                <button
                  onClick={handleRecharge}
                  disabled={!amount || loading}
                  className="w-full py-4 bg-cyber-emerald text-black font-display font-black uppercase tracking-[0.2em] rounded-lg hover:bg-white hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group/btn"
                >
                  <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:animate-[shine_0.5s_ease-in-out]"></div>
                  INICIAR CARGA
                </button>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={async () => {
                      if (!amount) return;
                      setLoading(true);
                      const res = await api.createPaymentIntent({ amount: Number(amount) });
                      setLoading(false);
                      if (res.data) {
                        alert(
                          `Intent Created: ${res.data.id}\nClient Secret: ${res.data.clientSecret.slice(0, 10)}...`
                        );
                      } else {
                        alert('Error creating payment intent: ' + res.error);
                      }
                    }}
                    disabled={!amount || loading}
                    className="w-full py-3 bg-[#635BFF] text-white font-display font-bold uppercase tracking-wider rounded-lg hover:bg-[#5851DF] transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fab fa-stripe text-xl"></i>
                    Pagar con Tarjeta
                  </button>
                </div>
              </div>
            )}

            {status !== 'IDLE' && status !== 'ERROR' && (
              <div className="relative h-[400px] flex flex-col items-center justify-center overflow-hidden">
                <div className="relative w-32 h-64 bg-black border-4 border-slate-800 rounded-2xl overflow-hidden shadow-inner flex flex-col-reverse">
                  <div
                    className={`w-full bg-cyber-emerald transition-all ease-linear shadow-[0_0_30px_#10b981] relative ${status === 'INJECTING' ? 'animate-pulse bg-white' : ''}`}
                    style={{
                      height:
                        status === 'CONNECTING'
                          ? '10%'
                          : status === 'CHARGING'
                            ? '100%'
                            : status === 'INJECTING'
                              ? '0%'
                              : '100%',
                      transitionDuration: status === 'CHARGING' ? '1.5s' : '0.5s',
                    }}
                  >
                    <div className="absolute inset-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 mix-blend-overlay animate-pan-up"></div>
                  </div>
                </div>
                <div className="absolute bottom-8 w-full text-center">
                  <div
                    className={`font-display font-bold text-xl uppercase tracking-widest ${status === 'COMPLETED' ? 'text-cyber-emerald' : 'text-white'}`}
                  >
                    {status === 'CONNECTING' && 'ACOPLANDO...'}
                    {status === 'CHARGING' && 'ENERGIZANDO...'}
                    {status === 'INJECTING' && 'TRANSFIRIENDO...'}
                    {status === 'COMPLETED' && 'CARGA COMPLETA'}
                  </div>
                </div>
                {status === 'COMPLETED' && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-500 z-20 p-6">
                    <div className="w-24 h-24 bg-cyber-emerald rounded-full flex items-center justify-center shadow-[0_0_60px_#10b981] animate-in zoom-in duration-300 mb-6">
                      <i className="fas fa-check text-5xl text-black"></i>
                    </div>
                    <div className="bg-black/50 border border-white/10 p-4 rounded-xl backdrop-blur-md text-center w-full">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                        Nuevo Saldo Disponible
                      </div>
                      <div className="text-2xl font-mono font-bold text-white text-glow-sm">
                        {formatCurrency(finalBalance)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <style>{`
                @keyframes shine { 0% { transform: translateX(-100%) skewX(-15deg); } 100% { transform: translateX(200%) skewX(-15deg); } }
                @keyframes pan-up { from { background-position: 0 0; } to { background-position: 0 -100px; } }
            `}</style>
      </div>
    </div>,
    document.body
  );
}
