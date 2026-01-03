
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/edgeApi';
import { AppUser, UserRole } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency } from '../constants';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: AppUser | null;
  onSuccess?: () => void;
}

type WithdrawalStatus = 'IDLE' | 'SCANNING' | 'PROCESSING' | 'PRINTING' | 'CUTTING' | 'DROPPING' | 'FINISHED' | 'ERROR' | 'INSUFFICIENT_FUNDS';

export default function WithdrawModal({ isOpen, onClose, targetUser, onSuccess }: WithdrawModalProps) {
  useBodyScrollLock(isOpen); // LOCK BACKGROUND SCROLL

  const currentUser = useAuthStore(s => s.user);
  const [amount, setAmount] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<WithdrawalStatus>('IDLE');
  const [finalBalance, setFinalBalance] = useState<number>(0);
  const [txId, setTxId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
        setStatus('IDLE');
        setAmount('');
        setFinalBalance(0);
        setTxId('');
        setLoading(false);
    }
  }, [isOpen]);
  
  if (!isOpen || !targetUser || !currentUser) return null;

  const currentBalanceCents = targetUser.balance_bigint;

  const handleClose = () => {
    if (['PRINTING', 'CUTTING', 'DROPPING', 'FINISHED'].includes(status)) {
        onSuccess?.();
    }
    onClose();
  };

  const handleAmountChange = (val: string) => {
      if (status === 'INSUFFICIENT_FUNDS') setStatus('IDLE');
      setAmount(Number(val));
  };

  const handleWithdraw = async () => {
    if (!amount || Number(amount) <= 0) return;
    if (Number(amount) * 100 > currentBalanceCents) {
        setStatus('INSUFFICIENT_FUNDS');
        return;
    }
    setLoading(true);
    setStatus('SCANNING'); 

    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStatus('PROCESSING');
        const res = await api.withdrawUser({
            target_user_id: targetUser.id,
            amount: Number(amount) * 100,
            actor_id: currentUser.id
        });
        if (res.error) throw new Error(res.error);
        if (res.data) {
            setFinalBalance(res.data.new_balance);
            setTxId(res.data.tx_id);
        }
        setStatus('PRINTING');
        setTimeout(() => setStatus('CUTTING'), 2000);
        setTimeout(() => setStatus('DROPPING'), 2600); 
        setTimeout(() => setStatus('FINISHED'), 3400);
        setTimeout(() => { onSuccess?.(); onClose(); }, 8000); // Extended auto-close time to read balance
    } catch (e: any) {
        setStatus('ERROR');
        alert(e.message || "Error de conexión con el Núcleo.");
        setLoading(false);
    }
  };

  const getTicketClass = () => {
      switch (status) {
          case 'PRINTING': return 'translate-y-0 opacity-100';
          case 'CUTTING': return 'translate-y-2 opacity-100';
          case 'DROPPING': return 'translate-y-[150%] rotate-12 opacity-0 pointer-events-none transition-all duration-700 ease-in';
          case 'FINISHED': return 'hidden';
          default: return 'hidden';
      }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative max-w-sm w-full mx-4 perspective-1000 max-h-[90vh] flex flex-col">
            
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-[95%] z-10">
                <div className="h-10 bg-[#0a0a0a] rounded-t-xl shadow-[inset_0_5px_15px_black] border-x border-t border-white/10 flex items-end justify-center overflow-hidden relative">
                    <div className={`absolute top-0 left-0 w-full h-full bg-cyber-orange blur-xl transition-all duration-300 ${status === 'PRINTING' ? 'opacity-40' : 'opacity-0'}`}></div>
                    <div className="w-[90%] h-1 bg-black rounded-full mb-2 relative z-20 shadow-[0_0_10px_black] overflow-hidden">
                        <div className={`w-full h-full transition-all duration-300 ${status === 'PRINTING' ? 'bg-white shadow-[0_0_20px_white] opacity-100' : 'bg-cyber-orange opacity-20'}`}></div>
                    </div>
                </div>
            </div>

            <div className={`bg-[#0f0f12] border-2 rounded-2xl w-full relative z-20 overflow-hidden flex flex-col min-h-[400px] transition-all duration-200 ${status === 'INSUFFICIENT_FUNDS' ? 'border-red-600 shadow-[0_0_50px_rgba(255,0,0,0.5)] animate-[shake_0.4s_ease-in-out]' : 'border-cyber-orange shadow-[0_0_60px_rgba(255,95,0,0.15)]'}`}>
                <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

                <div className={`p-6 border-b relative z-20 transition-colors duration-300 ${status === 'INSUFFICIENT_FUNDS' ? 'bg-red-950/50 border-red-500/50' : 'bg-[#050a14] border-white/5'}`}>
                     <button onClick={handleClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-cyber-orange hover:text-black text-slate-400 transition-colors z-50"><i className="fas fa-times"></i></button>
                     <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded flex items-center justify-center shadow-neon-orange relative overflow-hidden group transition-all ${status === 'INSUFFICIENT_FUNDS' ? 'bg-red-600 text-white border border-white' : 'bg-cyber-orange/10 border border-cyber-orange/30'}`}>
                            <i className={`fas ${status === 'INSUFFICIENT_FUNDS' ? 'fa-ban' : 'fa-hand-holding-usd'} text-2xl ${status === 'INSUFFICIENT_FUNDS' ? 'text-white animate-pulse' : 'text-cyber-orange'} relative z-10`}></i>
                        </div>
                        <div>
                            <h3 className={`font-display font-bold uppercase tracking-wider transition-colors ${status === 'INSUFFICIENT_FUNDS' ? 'text-red-500' : 'text-white'}`}>{status === 'INSUFFICIENT_FUNDS' ? 'ACCESO DENEGADO' : 'Retiro de Fondos'}</h3>
                            <div className="text-[9px] font-mono uppercase tracking-widest flex items-center gap-1 text-cyber-orange">{status}</div>
                        </div>
                     </div>
                </div>

                <div className="p-6 relative flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                    {(status === 'IDLE' || status === 'SCANNING' || status === 'PROCESSING' || status === 'ERROR' || status === 'INSUFFICIENT_FUNDS') && (
                        <div className={`transition-all duration-500 ${status === 'PROCESSING' ? 'opacity-50 scale-95 pointer-events-none' : 'opacity-100'}`}>
                            <div className={`bg-black border rounded-lg p-4 mb-6 relative overflow-hidden group transition-colors duration-300 ${status === 'INSUFFICIENT_FUNDS' ? 'border-red-500/50' : 'border-slate-800'}`}>
                                <div className="text-white font-bold text-lg relative z-10">{targetUser.name}</div>
                                <div className="text-right mt-2 relative z-10">
                                    <span className="text-[10px] text-slate-500 mr-2">DISPONIBLE:</span>
                                    <span className={`font-mono font-bold text-glow-sm transition-colors ${status === 'INSUFFICIENT_FUNDS' ? 'text-red-500' : 'text-white'}`}>{formatCurrency(currentBalanceCents)}</span>
                                </div>
                            </div>

                            {status === 'INSUFFICIENT_FUNDS' && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in zoom-in duration-300 rounded-lg">
                                    <h3 className="text-red-500 font-black font-display text-2xl uppercase tracking-widest text-center mb-2 drop-shadow-sm">FONDOS INSUFICIENTES</h3>
                                    <button onClick={() => setStatus('IDLE')} className="px-8 py-3 bg-red-600 hover:bg-white hover:text-red-600 text-black font-black uppercase tracking-widest rounded-full transition-all shadow-neon-red">Corregir Monto</button>
                                </div>
                            )}

                            <div className="mb-6 relative group/input">
                                <label className="block text-[10px] font-mono font-bold text-cyber-orange mb-2 uppercase tracking-wider ml-1">Monto a Retirar</label>
                                <div className="relative">
                                    <input type="number" value={amount} onChange={e => handleAmountChange(e.target.value)} disabled={loading} className="w-full bg-black/60 border-b-2 border-slate-700 py-3 pl-3 pr-12 text-3xl font-mono text-white focus:border-cyber-orange focus:outline-none transition-colors placeholder-slate-800 disabled:opacity-50" placeholder="0.00" autoFocus />
                                    <span className="absolute right-2 bottom-4 text-slate-600 font-bold text-xs">CRC</span>
                                </div>
                            </div>

                            <button onClick={handleWithdraw} disabled={loading || !amount} className="w-full bg-cyber-orange text-black font-display font-black uppercase py-4 rounded hover:bg-white hover:shadow-[0_0_30px_rgba(255,95,0,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group/btn">
                                {(status === 'SCANNING' || status === 'PROCESSING') ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-print group-hover/btn:animate-pulse"></i>}
                                {status === 'SCANNING' ? 'VERIFICANDO...' : status === 'PROCESSING' ? 'PROCESANDO...' : 'IMPRIMIR RETIRO'}
                            </button>
                        </div>
                    )}

                    {status === 'FINISHED' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 animate-in zoom-in-95 duration-500 bg-black/90">
                             <div className="w-20 h-20 bg-cyber-orange rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,95,0,0.6)] mb-6 animate-bounce">
                                <i className="fas fa-check text-4xl text-black"></i>
                             </div>
                             
                             <h4 className="text-3xl font-display font-black text-white uppercase italic tracking-wider mb-1 drop-shadow-lg">Transacción <br/><span className="text-cyber-orange text-glow">Finalizada</span></h4>
                             
                             {/* NEW BALANCE DISPLAY */}
                             <div className="mt-6 bg-[#050a14] border border-cyber-orange/30 p-4 rounded-xl text-center min-w-[200px] relative overflow-hidden group">
                                <div className="absolute inset-0 bg-cyber-orange/5 animate-pulse"></div>
                                <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1 relative z-10">Saldo Restante</div>
                                <div className="text-2xl font-mono font-black text-white text-glow-sm relative z-10">
                                    {formatCurrency(finalBalance)}
                                </div>
                             </div>

                             <button onClick={handleClose} className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest text-white transition-all hover:scale-105">Cerrar Consola</button>
                        </div>
                    )}

                    {(['PRINTING', 'CUTTING', 'DROPPING'].includes(status)) && (
                        <div className={`absolute top-0 left-4 right-4 z-30 origin-top animate-in slide-in-from-top-[100%] duration-[2000ms] ease-linear ${getTicketClass()}`}>
                            <div className="bg-[#e2e8f0] text-slate-900 font-mono text-xs relative shadow-2xl overflow-hidden pb-4" style={{clipPath: 'polygon(0 0, 100% 0, 100% 98%, 0 98%)', boxShadow: '0 10px 50px rgba(0,0,0,0.8)'}}>
                                <div className="pl-6 pr-4 py-6 relative">
                                    <div className="text-xl font-bold font-mono tracking-tight flex justify-between items-baseline"><span>{formatCurrency(Number(amount) * 100)}</span></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>,
    document.body
  );
}
