
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/edgeApi';
import { AppUser } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface UserControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: AppUser | null;
  onSuccess?: () => void;
}

type ActionType = 'BLOCK' | 'UNBLOCK' | 'DELETE' | null;

export default function UserControlModal({ isOpen, onClose, targetUser, onSuccess }: UserControlModalProps) {
  useBodyScrollLock(isOpen); // LOCK SCROLL

  const currentUser = useAuthStore(s => s.user);
  
  const [action, setAction] = useState<ActionType>(null);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setAction(null);
        setConfirmPhrase('');
        setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !targetUser || !currentUser) return null;

  const blockAction = targetUser.status === 'Active' ? 'BLOCK' : 'UNBLOCK';
  
  const PHRASE_BLOCK = 'BLOQUEAR NODO';
  const PHRASE_UNBLOCK = 'REACTIVAR NODO';
  const PHRASE_DELETE = 'ELIMINAR NODO';

  const requiredPhrase = 
    action === 'BLOCK' ? PHRASE_BLOCK :
    action === 'UNBLOCK' ? PHRASE_UNBLOCK :
    action === 'DELETE' ? PHRASE_DELETE : '';

  const getTheme = () => {
      if (action === 'DELETE') return { color: 'text-cyber-danger', border: 'border-cyber-danger', bg: 'bg-cyber-danger', shadow: 'shadow-neon-red', glow: 'rgba(255, 0, 60, 0.5)' };
      return { color: 'text-cyber-orange', border: 'border-cyber-orange', bg: 'bg-cyber-orange', shadow: 'shadow-neon-orange', glow: 'rgba(255, 95, 0, 0.5)' };
  };

  const theme = getTheme();
  const isMatch = confirmPhrase.trim() === requiredPhrase;

  const handleExecute = async () => {
    if (!isMatch) return;
    setLoading(true);
    try {
        if (action === 'DELETE') {
            await api.deleteUser({ target_user_id: targetUser.id, confirmation: confirmPhrase, actor_id: currentUser.id });
        } else {
            const newStatus = action === 'BLOCK' ? 'Suspended' : 'Active';
            await api.updateUserStatus({ target_user_id: targetUser.id, status: newStatus, actor_id: currentUser.id });
        }
        onSuccess?.();
        onClose();
    } catch (e: any) {
        alert(e.message || "Error ejecutando comando.");
    } finally {
        setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto custom-scrollbar">
        <div className="relative max-w-lg w-full mx-4 my-8">
            <div className={`absolute -inset-1 rounded-2xl opacity-40 blur-xl transition-colors duration-700 animate-[pulse_3s_ease-in-out_infinite] ${action === 'DELETE' ? 'bg-red-600' : action ? 'bg-cyber-orange' : 'bg-cyber-blue'}`}></div>
            
            <div className="bg-[#050a14] border-2 border-white/10 rounded-2xl overflow-hidden relative shadow-2xl z-10 transition-colors duration-500">
                <div className="bg-black/40 border-b border-white/10 p-6 flex justify-between items-center relative overflow-hidden">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded bg-black border border-white/20 flex items-center justify-center relative overflow-hidden group`}>
                            <i className={`fas fa-user-shield text-2xl text-white relative z-10 ${loading ? 'animate-spin' : ''}`}></i>
                        </div>
                        <div>
                            <h3 className="font-display font-black text-white uppercase tracking-wider text-lg text-glow-sm">Control de Nodo</h3>
                            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">{targetUser.name}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><i className="fas fa-times text-xl"></i></button>
                </div>

                {!action && (
                    <div className="p-8 grid grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                        <button onClick={() => setAction(blockAction)} className={`relative group overflow-hidden rounded-xl border-2 border-dashed border-slate-700 hover:border-cyber-orange p-6 text-left transition-all hover:bg-cyber-orange/10`}>
                            <h4 className="font-display font-bold text-white uppercase mb-1 group-hover:text-cyber-orange transition-colors">{blockAction === 'BLOCK' ? 'Bloquear' : 'Reactivar'}</h4>
                        </button>
                        <button onClick={() => setAction('DELETE')} className={`relative group overflow-hidden rounded-xl border-2 border-dashed border-slate-700 hover:border-cyber-danger p-6 text-left transition-all hover:bg-cyber-danger/10`}>
                            <h4 className="font-display font-bold text-white uppercase mb-1 group-hover:text-cyber-danger transition-colors">Eliminar</h4>
                        </button>
                    </div>
                )}

                {action && (
                    <div className="p-8 animate-in slide-in-from-bottom-4 duration-300">
                        <button onClick={() => setAction(null)} className="text-[10px] text-slate-500 hover:text-white mb-6 flex items-center gap-2 uppercase font-bold tracking-widest transition-colors"><i className="fas fa-arrow-left"></i> Abortar Secuencia</button>
                        <div className={`border-l-4 pl-4 mb-8 ${theme.border} transition-colors duration-500`}><h4 className={`font-display font-bold text-xl uppercase ${theme.color} text-shadow`}>{action === 'DELETE' ? 'Protocolo de Eliminación' : 'Modificación de Estado'}</h4></div>
                        <div className="relative group/input mb-8">
                            <input value={confirmPhrase} onChange={e => setConfirmPhrase(e.target.value.toUpperCase())} className={`relative w-full bg-black border-2 rounded-lg py-4 text-center font-mono text-xl text-white uppercase tracking-widest focus:outline-none transition-all duration-300 z-10 ${isMatch ? `${theme.border} shadow-[0_0_30px_${theme.glow}]` : 'border-slate-800 focus:border-white/50'}`} placeholder={requiredPhrase} autoFocus />
                        </div>
                        <button onClick={handleExecute} disabled={!isMatch || loading} className={`w-full py-4 rounded-lg font-display font-black uppercase tracking-[0.2em] transition-all duration-300 relative overflow-hidden group/btn disabled:opacity-50 disabled:cursor-not-allowed`}>
                            <div className={`relative z-10 flex items-center justify-center gap-3 ${isMatch ? 'text-black' : theme.color} group-hover/btn:text-black transition-colors`}>{loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-radiation"></i>}<span>{loading ? ' EJECUTANDO...' : ' CONFIRMAR Y EJECUTAR'}</span></div>
                            <div className={`absolute inset-0 border ${theme.border} rounded-lg opacity-50 group-hover/btn:opacity-100`}></div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>,
    document.body
  );
}
