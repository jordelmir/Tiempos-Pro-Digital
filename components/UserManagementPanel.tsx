
import React, { useState, useMemo, useEffect } from 'react';
import { AppUser, UserRole } from '../types';
import { formatCurrency } from '../constants';
import UserControlModal from './UserControlModal';
import VendorPaymentModal from './VendorPaymentModal';
import { useAuthStore } from '../store/useAuthStore';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

interface UserManagementPanelProps {
  players: AppUser[];
  vendors: AppUser[];
  onRecharge: (user: AppUser) => void;
  onWithdraw: (user: AppUser) => void;
  onRefresh: () => void;
}

export default function UserManagementPanel({ players, vendors, onRecharge, onWithdraw, onRefresh }: UserManagementPanelProps) {
  const currentUser = useAuthStore(s => s.user);
  
  const isVendor = currentUser?.role === UserRole.Vendedor;
  const isAdmin = currentUser?.role === UserRole.SuperAdmin;

  const [activeTab, setActiveTab] = useState<'CLIENTES' | 'VENDEDORES'>('CLIENTES');
  
  useEffect(() => {
      if (isVendor) setActiveTab('CLIENTES');
  }, [isVendor]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  
  const [controlUser, setControlUser] = useState<AppUser | null>(null);
  const [payUser, setPayUser] = useState<AppUser | null>(null);

  const theme = useMemo(() => {
      return activeTab === 'CLIENTES' 
        ? { 
            name: 'blue', 
            hex: '#2463eb', 
            bg: 'bg-cyber-blue', 
            text: 'text-cyber-blue', 
            border: 'border-cyber-blue/40', 
            shadow: 'shadow-neon-blue', 
            icon: 'fa-users',
            glowHex: 'rgba(36,99,235,0.5)',
            hoverBorder: 'group-hover/row:border-cyber-blue',
            hoverShadow: 'group-hover/row:shadow-[0_0_15px_#2463eb]',
            focusText: 'focus:text-cyber-blue'
          }
        : { 
            name: 'purple', 
            hex: '#bc13fe', 
            bg: 'bg-cyber-purple', 
            text: 'text-cyber-purple', 
            border: 'border-cyber-purple/40', 
            shadow: 'shadow-neon-purple', 
            icon: 'fa-user-tie',
            glowHex: 'rgba(188,19,254,0.5)',
            hoverBorder: 'group-hover/row:border-cyber-purple',
            hoverShadow: 'group-hover/row:shadow-[0_0_15px_#bc13fe]',
            focusText: 'focus:text-cyber-purple'
          };
  }, [activeTab]);

  let sourceList: AppUser[] = [];

  if (activeTab === 'CLIENTES') {
      if (isAdmin) {
          sourceList = players;
      } else if (isVendor) {
          sourceList = players.filter(p => p.issuer_id === currentUser?.id);
      }
  } else if (activeTab === 'VENDEDORES') {
      if (isAdmin) {
          sourceList = vendors;
      } else {
          sourceList = [];
      }
  }
  
  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return sourceList.filter(u => {
      if (u.status === 'Deleted') return false;
      const matchesSearch = 
        (u.cedula && u.cedula.toLowerCase().includes(query)) ||
        (u.phone && u.phone.toLowerCase().includes(query)) ||
        u.name.toLowerCase().includes(query) || 
        (u.email && u.email.toLowerCase().includes(query));
        
      const matchesStatus = filterStatus === 'ALL' ? true : 
                            filterStatus === 'ACTIVE' ? u.status === 'Active' : 
                            u.status === 'Suspended';
      return matchesSearch && matchesStatus;
    });
  }, [sourceList, searchQuery, filterStatus]);

  const totalBalance = useMemo(() => filteredUsers.reduce((acc, curr) => acc + curr.balance_bigint, 0), [filteredUsers]);
  const activeCount = useMemo(() => filteredUsers.filter(u => u.status === 'Active').length, [filteredUsers]);
  const suspendedCount = filteredUsers.length - activeCount;

  return (
    <div className="relative group animate-in fade-in duration-700 w-full">
      <UserControlModal isOpen={!!controlUser} targetUser={controlUser} onClose={() => setControlUser(null)} onSuccess={onRefresh} />
      <VendorPaymentModal isOpen={!!payUser} targetUser={payUser} onClose={() => setPayUser(null)} onSuccess={onRefresh} />
      
      {/* ALIVE GLOW */}
      <div className={`absolute -inset-4 transition-all duration-1000 opacity-20 blur-3xl rounded-[3rem] animate-pulse bg-${theme.name}-500`}></div>
      <div className={`absolute -inset-4 bg-gradient-to-r from-transparent via-${theme.name}-500/10 to-transparent rounded-[3rem] blur-3xl opacity-30 animate-pulse transition-all duration-1000`}></div>
      
      <div className={`relative glass-morphism border-2 ${theme.border} rounded-[2.5rem] md:rounded-[4rem] overflow-hidden transition-all duration-500 z-10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.7)]`}>
        
        <div className="border-b border-white/10 bg-white/5 backdrop-blur-3xl relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-[2px] ${theme.bg} shadow-[0_0_20px_currentColor] opacity-30 animate-pulse`}></div>
            <div className="absolute inset-0 carbon-texture opacity-[0.03] pointer-events-none"></div>

            <div className="flex flex-col xl:flex-row items-center justify-between p-6 md:p-10 relative z-10 gap-8">
                <div className="flex items-center gap-6 w-full xl:w-auto">
                    <div className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-black/40 border-2 ${theme.border} flex items-center justify-center ${theme.shadow} backdrop-blur-md shadow-inner`}>
                        <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 4, size: 1.0, theme: activeTab === 'CLIENTES' ? 'cyber' : 'neon' }}>
                            <i className={`fas ${theme.icon} ${theme.text} text-2xl md:text-3xl`}></i>
                        </AnimatedIconUltra>
                    </div>
                    <div>
                        <h3 className="text-2xl md:text-4xl font-display font-black text-white uppercase tracking-tighter leading-none">
                            Directorio <span className={`${theme.text} text-glow-cyan transition-colors duration-500`}>
                                {isVendor ? 'Personal' : 'Global'}
                            </span>
                        </h3>
                        <p className="text-[8px] md:text-[10px] font-mono text-slate-500 uppercase tracking-[0.4em] font-black mt-2 opacity-60">
                            Protocolo Phront Maestro v3.9
                        </p>
                    </div>
                </div>

                {isAdmin && (
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner w-full xl:w-auto">
                        <button 
                            onClick={() => setActiveTab('CLIENTES')} 
                            className={`flex-1 xl:flex-none px-6 lg:px-10 py-3 lg:py-4 rounded-xl text-[9px] lg:text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${
                                activeTab === 'CLIENTES' 
                                ? 'bg-white text-black shadow-2xl scale-105' 
                                : 'text-slate-500 hover:text-white'
                            }`}
                        >
                            Jugadores
                        </button>
                        <button 
                            onClick={() => setActiveTab('VENDEDORES')} 
                            className={`flex-1 xl:flex-none px-6 lg:px-10 py-3 lg:py-4 rounded-xl text-[9px] lg:text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${
                                activeTab === 'VENDEDORES' 
                                ? 'bg-white text-black shadow-2xl scale-105' 
                                : 'text-slate-500 hover:text-white'
                            }`}
                        >
                            Vendedores
                        </button>
                    </div>
                )}
            </div>

            <div className="px-6 md:px-10 pb-8 md:pb-12 grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-10 items-end relative z-10">
                <div className="xl:col-span-6 relative group/input">
                    <label className={`text-[9px] md:text-[10px] font-mono font-black ${theme.text} uppercase tracking-[0.3em] ml-2 mb-3 block`}>
                        Mapeo de Terminales
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <i className={`fas fa-search ${theme.text} opacity-50`}></i>
                        </div>
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar por ID, Teléfono o Nombre..."
                            className={`w-full bg-black/40 border-2 ${theme.border} rounded-2xl md:rounded-3xl py-4 md:py-6 pl-14 pr-6 text-white font-mono text-sm md:text-base focus:border-white focus:outline-none transition-all placeholder-slate-700 shadow-inner group-focus-within/input:${theme.shadow}`}
                        />
                    </div>
                </div>

                <div className="xl:col-span-3 flex gap-3">
                    {['ALL', 'ACTIVE', 'SUSPENDED'].map(status => (
                        <button 
                            key={status} 
                            onClick={() => setFilterStatus(status as any)} 
                            className={`flex-1 py-4 md:py-6 rounded-2xl md:rounded-3xl text-[8px] md:text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                                filterStatus === status 
                                ? 'bg-white border-white text-black shadow-2xl scale-105' 
                                : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/20 hover:text-white'
                            }`}
                        >
                            {status === 'ALL' ? 'Todos' : status === 'ACTIVE' ? 'Activos' : 'Bloq.'}
                        </button>
                    ))}
                </div>

                <div className="xl:col-span-3 flex items-center justify-end gap-6 md:gap-10 bg-black/20 p-5 md:p-6 rounded-3xl md:rounded-[2.5rem] border border-white/5 backdrop-blur-md shadow-inner">
                    <div className="text-right">
                        <div className="text-[8px] md:text-[9px] text-slate-500 uppercase tracking-widest font-black mb-1">Capital Activo</div>
                        <div className={`text-xl md:text-3xl font-display font-black ${theme.text} drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]`}>
                            {formatCurrency(totalBalance)}
                        </div>
                    </div>
                    <div className="h-10 w-px bg-white/10"></div>
                    <div className="text-right">
                        <div className="text-[8px] md:text-[9px] text-slate-500 uppercase tracking-widest font-black mb-1">Nodos</div>
                        <div className="text-lg md:text-2xl font-mono font-black text-white">
                            <span className="text-cyber-success">{activeCount}</span>
                            <span className="mx-1 text-white/20">/</span>
                            <span className="text-cyber-danger">{suspendedCount}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="relative overflow-x-auto custom-scrollbar bg-black/10 max-h-[700px] md:max-h-[900px]">
             <table className="w-full text-left border-collapse relative z-10 min-w-[1000px] xl:min-w-full">
                <thead className="sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-3xl z-20 shadow-xl border-b border-white/10">
                    <tr className={`text-[9px] md:text-[11px] font-mono ${theme.text} uppercase tracking-[0.3em]`}>
                        <th className="p-6 md:p-8 pl-10 font-black">Identidad</th>
                        <th className="p-6 md:p-8 font-black">Coordenadas</th>
                        <th className="p-6 md:p-8 text-right font-black">Carga Actual</th>
                        <th className="p-6 md:p-8 text-center font-black">Estado</th>
                        <th className="p-6 md:p-8 text-right pr-10 font-black">Control</th>
                    </tr>
                </thead>
                <tbody className="font-mono text-xs md:text-sm">
                    {filteredUsers.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-32 text-center">
                                <div className="flex flex-col items-center justify-center gap-6 text-slate-700 opacity-40">
                                    <i className="fas fa-satellite-dish text-6xl animate-pulse"></i>
                                    <span className="uppercase tracking-[0.6em] font-black">Escaneo sin resultados</span>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        filteredUsers.map(u => (
                            <tr 
                                key={u.id} 
                                className="relative border-b border-white/5 hover:bg-white/5 transition-all duration-300 group/row"
                            >
                                <td className="p-6 md:p-8 pl-10">
                                    <div className="flex items-center gap-5">
                                        <div className={`relative w-12 h-12 md:w-16 md:h-16 rounded-full bg-black border-2 border-white/10 ${theme.hoverBorder} ${theme.hoverShadow} transition-all duration-500 flex items-center justify-center overflow-hidden`}>
                                            <span className="font-display font-black text-white text-sm md:text-lg">{u.name.substring(0,2).toUpperCase()}</span>
                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
                                        </div>
                                        <div>
                                            <div className="font-black text-white text-sm md:text-base uppercase tracking-tight group-hover/row:text-glow-white transition-all">{u.name}</div>
                                            <div className="text-[7px] md:text-[9px] text-slate-500 uppercase tracking-widest mt-1 font-bold">NODO_ID: {u.id.slice(-8).toUpperCase()}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6 md:p-8">
                                    <div className="flex flex-col gap-1">
                                        <span className={`text-[10px] md:text-[12px] font-black ${theme.text} tracking-wider`}>ID: {u.cedula || 'N/A'}</span>
                                        <span className="text-[9px] md:text-[11px] text-slate-400 font-bold">{u.phone}</span>
                                        {u.email && <span className="text-[8px] md:text-[10px] text-slate-600 truncate max-w-[150px]">{u.email}</span>}
                                    </div>
                                </td>
                                <td className="p-6 md:p-8 text-right">
                                    <div className={`font-display font-black text-lg md:text-2xl ${u.balance_bigint > 0 ? 'text-white' : 'text-slate-700'} transition-colors`}>{formatCurrency(u.balance_bigint)}</div>
                                    {activeTab === 'VENDEDORES' && (
                                        <button onClick={() => setPayUser(u)} className="mt-2 px-3 py-1 bg-cyber-purple/10 border border-cyber-purple/30 rounded-lg text-[9px] font-black text-cyber-purple hover:bg-cyber-purple hover:text-black transition-all shadow-inner">LIQUIDAR</button>
                                    )}
                                </td>
                                <td className="p-6 md:p-8 text-center">
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[8px] md:text-[10px] font-black uppercase border-2 transition-all ${
                                        u.status === 'Active' 
                                        ? 'border-cyber-success/50 text-cyber-success bg-cyber-success/5' 
                                        : 'border-cyber-danger/50 text-cyber-danger bg-cyber-danger/5'
                                    }`}>
                                        <span className={`w-2 h-2 rounded-full ${u.status === 'Active' ? 'bg-cyber-success animate-ping' : 'bg-cyber-danger'}`}></span>
                                        {u.status === 'Active' ? 'SINC_OK' : 'OFFLINE'}
                                    </div>
                                </td>
                                <td className="p-6 md:p-8 pr-10 text-right">
                                    <div className="flex items-center justify-end gap-2 md:gap-4 opacity-40 group-hover/row:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => onRecharge(u)} 
                                            className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-black border-2 border-cyber-success/30 flex items-center justify-center text-cyber-success hover:bg-cyber-success hover:text-black hover:scale-110 transition-all shadow-inner" 
                                            title="Recargar"
                                        >
                                            <i className="fas fa-bolt md:text-xl"></i>
                                        </button>
                                        <button 
                                            onClick={() => onWithdraw(u)} 
                                            className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-black border-2 border-cyber-orange/30 flex items-center justify-center text-cyber-orange hover:bg-cyber-orange hover:text-black hover:scale-110 transition-all shadow-inner" 
                                            title="Retirar"
                                        >
                                            <i className="fas fa-hand-holding-usd md:text-xl"></i>
                                        </button>
                                        <button 
                                            onClick={() => setControlUser(u)} 
                                            className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-black border-2 border-cyber-danger/30 flex items-center justify-center text-cyber-danger hover:bg-cyber-danger hover:text-black hover:scale-110 transition-all shadow-inner" 
                                            title="Seguridad"
                                        >
                                            <i className={`fas ${u.status === 'Active' ? 'fa-lock' : 'fa-unlock'} md:text-xl`}></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
             </table>
        </div>
        
        <div className="bg-black/80 backdrop-blur-3xl p-6 md:p-8 border-t border-white/10 flex justify-between items-center text-[9px] md:text-[11px] font-mono text-slate-500 relative z-20">
            <div className="font-black uppercase tracking-[0.2em]">Escaneo Completo: {filteredUsers.length} de {sourceList.length} Entidades</div>
            <div className="flex items-center gap-6 md:gap-10">
                <span className="hidden sm:flex items-center gap-2"><i className="fas fa-shield-halved text-cyber-success text-[8px]"></i> <span className="font-black tracking-widest uppercase">Kernel_Secure</span></span>
                <span className="flex items-center gap-2 font-black text-white/40 tracking-widest uppercase italic">Phront_OS_v3.9</span>
            </div>
        </div>
      </div>
    </div>
  );
}
