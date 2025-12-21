
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/edgeApi';
import { AppUser } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency } from '../constants';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface VendorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: AppUser | null;
  onSuccess?: () => void;
}

type PaymentConcept = 'COMISION_VENTAS' | 'BONO_RENDIMIENTO' | 'AJUSTE_OPERATIVO' | 'SALARIO_BASE';

export default function VendorPaymentModal({ isOpen, onClose, targetUser, onSuccess }: VendorPaymentModalProps) {
  useBodyScrollLock(isOpen); // LOCK SCROLL

  const currentUser = useAuthStore(s => s.user);
  const [amount, setAmount] = useState<number | ''>('');
  const [concept, setConcept] = useState<PaymentConcept>('COMISION_VENTAS');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txId, setTxId] = useState('');
  const [systemTime, setSystemTime] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
        setLoading(false);
        setSuccess(false);
        setAmount('');
        setNotes('');
        setTxId('');
        const timer = setInterval(() => setSystemTime(new Date()), 1000);
        return () => clearInterval(timer);
    }
  }, [isOpen, targetUser]);

  if (!isOpen || !targetUser || !currentUser) return null;

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);
    try {
        const res = await api.payVendor({
            target_user_id: targetUser.id,
            amount: Number(amount) * 100,
            concept,
            notes,
            actor_id: currentUser.id
        });
        if (res.error) { alert(res.error); } 
        else {
            setTxId(res.data?.ticket_code || 'TX-000');
            setSuccess(true);
            setTimeout(() => { if (isOpen) { onSuccess?.(); onClose(); } }, 2500);
        }
    } catch (e) { alert("Error crítico en el sistema contable."); } 
    finally { setLoading(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto custom-scrollbar">
        <div className="relative max-w-md w-full mx-4 my-8 flex flex-col min-h-[auto]">
            <div className="absolute -inset-1 bg-cyber-purple rounded-2xl opacity-20 blur-xl animate-[pulse_4s_ease-in-out_infinite] transition-all duration-1000 fixed-backlight"></div>
            <div className="bg-[#0a0a0f] border border-cyber-purple/40 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(188,19,254,0.2)] relative z-10 group flex flex-col w-full">
                <div className="bg-[#1a1a24]/95 backdrop-blur-xl p-6 border-b border-cyber-purple/20 flex justify-between items-start relative overflow-hidden sticky top-0 z-50 shrink-0">
                    <div className="absolute top-0 left-0 w-full h-1 bg-cyber-purple/50 shadow-[0_0_10px_#bc13fe] animate-[scanline_3s_linear_infinite]"></div>
                    <div><h3 className="font-display font-bold text-white uppercase tracking-widest flex items-center gap-2 text-glow-sm"><i className="fas fa-file-invoice-dollar text-cyber-purple animate-pulse"></i> Liquidación</h3><div className="flex items-center gap-2 mt-1"><div className="w-1.5 h-1.5 bg-cyber-purple rounded-full animate-ping"></div><p className="text-[10px] font-mono text-cyber-purple uppercase tracking-wider">T. Real: {systemTime.toLocaleTimeString()}</p></div></div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors z-10 bg-black/20 rounded-full w-8 h-8 flex items-center justify-center hover:bg-cyber-purple/20"><i className="fas fa-times text-lg"></i></button>
                </div>
                <div className="p-6 space-y-6 bg-gradient-to-b from-[#0a0a0f] to-[#050508] flex-1">
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5 relative overflow-hidden group/card flex-shrink-0 shadow-inner">
                        <div className="relative w-12 h-12 rounded-lg bg-cyber-purple/10 flex items-center justify-center text-cyber-purple font-bold border border-cyber-purple/30 shadow-neon-purple">{targetUser.name.substring(0,2).toUpperCase()}</div>
                        <div className="relative"><div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Beneficiario</div><div className="text-white font-mono font-bold text-sm">{targetUser.name}</div></div>
                    </div>
                    {!success ? (
                        <div className="space-y-5 animate-in slide-in-from-bottom-2">
                            <div><label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-2 tracking-wider">Concepto</label><div className="grid grid-cols-2 gap-2">{[{ id: 'COMISION_VENTAS', label: 'Comisión' }, { id: 'BONO_RENDIMIENTO', label: 'Bono Extra' }, { id: 'AJUSTE_OPERATIVO', label: 'Ajuste Oper.' }, { id: 'SALARIO_BASE', label: 'Pago Fijo' }].map((opt) => (<button key={opt.id} onClick={() => setConcept(opt.id as PaymentConcept)} className={`py-2.5 px-3 rounded-lg text-[9px] font-bold uppercase border transition-all duration-300 ${concept === opt.id ? 'bg-cyber-purple/20 border-cyber-purple text-cyber-purple shadow-[0_0_15px_rgba(188,19,254,0.2)]' : 'bg-black/40 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-white'}`}>{opt.label}</button>))}</div></div>
                            <div><label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-2 tracking-wider">Monto a Liquidar (CRC)</label><div className="relative group/input"><input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="relative w-full bg-black/80 border border-slate-700 rounded-lg py-4 pl-4 pr-12 text-white font-mono text-2xl focus:border-cyber-purple focus:shadow-[0_0_20px_rgba(188,19,254,0.3)] focus:outline-none transition-all placeholder-slate-700 z-10" placeholder="0.00" autoFocus /><div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs z-20">CRC</div></div></div>
                            <button onClick={handleSubmit} disabled={loading || !amount} className="relative w-full py-4 mt-2 group/btn overflow-visible rounded-lg"><div className="relative bg-cyber-purple text-black font-display font-black uppercase tracking-widest rounded-lg py-4 flex items-center justify-center gap-2 group-hover/btn:bg-white group-hover/btn:text-cyber-purple transition-colors shadow-neon-purple disabled:opacity-50 disabled:cursor-not-allowed">{loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-fingerprint"></i>}{loading ? 'AUTORIZANDO...' : 'EJECUTAR PAGO'}</div></button>
                        </div>
                    ) : (
                        <div className="text-center py-8 animate-in zoom-in duration-300 relative"><h4 className="text-3xl font-display font-black text-white uppercase mb-2 tracking-wide text-shadow-purple">Pago Exitoso</h4><div className="bg-black/50 border border-cyber-purple/30 rounded px-4 py-2 inline-block mb-8"><div className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">ID Transacción</div><div className="font-mono text-cyber-purple text-lg font-bold tracking-widest">{txId}</div></div></div>
                    )}
                </div>
            </div>
        </div>
    </div>,
    document.body
  );
}
