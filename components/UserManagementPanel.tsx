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
  
  // LOGIC: If Vendor, force tab to CLIENTES and lock it.
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

  // THEME ENGINE
  const theme = useMemo(() => {
      return activeTab === 'CLIENTES' 
        ? { 
            name: 'blue', 
            hex: '#2463eb', 
            bg: 'bg-cyber-blue', 
            text: 'text-cyber-blue', 
            border: 'border-cyber-blue', 
            shadow: 'shadow-neon-blue', 
            icon: 'fa-users',
            glowHex: 'rgba(36,99,235,0.5)',
            // Explicit hover classes
            hoverBorder: 'group-hover/row:border-cyber-blue',
            hoverShadow: 'group-hover/row:shadow-[0_0_15px_#2463eb]',
            focusText: 'focus:text-cyber-blue'
          }
        : { 
            name: 'purple', 
            hex: '#bc13fe', 
            bg: 'bg-cyber-purple', 
            text: 'text-cyber-purple', 
            border: 'border-cyber-purple', 
            shadow: 'shadow-neon-purple', 
            icon: 'fa-user-tie',
            glowHex: 'rgba(188,19,254,0.5)',
            // Explicit hover classes
            hoverBorder: 'group-hover/row:border-cyber-purple',
            hoverShadow: 'group-hover/row:shadow-[0_0_15px_#bc13fe]',
            focusText: 'focus:text-cyber-purple'
          };
  }, [activeTab]);

  // SEGREGATION LOGIC
  let sourceList: AppUser[] = [];

  if (activeTab === 'CLIENTES') {
      if (isAdmin) {
          sourceList = players;
      } else if (isVendor) {
          // Double safety: Filter mainly happens in API, but ensure here
          sourceList = players.filter(p => p.issuer_id === currentUser?.id);
      }
  } else if (activeTab === 'VENDEDORES') {
      if (isAdmin) {
          sourceList = vendors;
      } else {
          sourceList = []; // Vendors cannot see other vendors
      }
  }
  
  // --- ADVANCED SEARCH ENGINE ---
  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return sourceList.filter(u => {
      // 1. HARD FILTER: Exclude deleted users (Safety Check)
      if (u.status === 'Deleted') return false;

      // Search Priority: 1. Cedula, 2. Phone, 3. Name, 4. Email
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
    <div className="relative group animate-in fade-in duration-500">
      <UserControlModal isOpen={!!controlUser} targetUser={controlUser} onClose={() => setControlUser(null)} onSuccess={onRefresh} />
      <VendorPaymentModal isOpen={!!payUser} targetUser={payUser} onClose={() => setPayUser(null)} onSuccess={onRefresh} />
      
      {/* --- SOLID BACKLIGHT SYSTEM (LIVING) --- */}
      <div className={`absolute -inset-1 ${theme.bg} rounded-[2rem] opacity-20 blur-2xl transition-opacity duration-1000 animate-pulse`}></div>
      <div className={`absolute -inset-[1px] ${theme.bg} rounded-[2rem] opacity-40 blur-md transition-opacity duration-700`}></div>
      
      {/* Main Container - SOLID CORE WITH PHOSPHORESCENT BORDER */}
      <div className={`relative bg-[#050a14] border-2 ${theme.border} rounded-3xl overflow-hidden transition-colors duration-500 z-10 shadow-2xl`}>
        
        {/* Header Area */}
        <div className="border-b border-white/5 bg-[#02040a]/80 backdrop-blur-xl relative overflow-hidden">
            
            {/* Top Energy Line */}
            <div className={`absolute top-0 left-0 w-full h-[2px] ${theme.bg} shadow-[0_0_15px_currentColor] opacity-50`}></div>

            <div className="flex flex-col md:flex-row items-center justify-between p-6 pb-0 md:pb-0 relative z-10">
                <h3 className="text-xl font-display font-black text-white uppercase tracking-widest flex items-center gap-4 mb-6 md:mb-0 drop-shadow-md">
                    <div className={`w-12 h-12 rounded-xl bg-black border-2 ${theme.border} flex items-center justify-center ${theme.shadow} transition-colors duration-500`}>
                        <AnimatedIconUltra profile={{ animation: 'spin3d', speed: 4, size: 0.9, theme: activeTab === 'CLIENTES' ? 'cyber' : 'neon' }}>
                            <i className={`fas ${theme.icon} ${theme.text} text-xl`}></i>
                        </AnimatedIconUltra>
                    </div>
                    <span>Directorio <span className={`${theme.text} text-glow-sm transition-colors duration-500`}>
                        {isVendor ? 'Personal' : 'Global'}
                    </span></span>
                </h3>

                {/* TAB CONTROLS - ONLY FOR ADMIN */}
                {isAdmin && (
                    <div className={`flex bg-black/60 p-1.5 rounded-2xl border-2 ${theme.border} shadow-lg transition-colors duration-500`}>
                        <button 
                            onClick={() => setActiveTab('CLIENTES')} 
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 border-2 border-cyber-blue ${
                                activeTab === 'CLIENTES' 
                                ? 'bg-cyber-blue text-white shadow-[0_0_15px_#2463eb]' 
                                : 'bg-transparent text-slate-500 shadow-[0_0_10px_rgba(36,99,235,0.2)] hover:text-cyber-blue hover:shadow-[0_0_15px_#2463eb]'
                            }`}
                        >
                            Jugadores
                        </button>
                        <button 
                            onClick={() => setActiveTab('VENDEDORES')} 
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 border-2 border-cyber-purple ${
                                activeTab === 'VENDEDORES' 
                                ? 'bg-cyber-purple text-white shadow-[0_0_15px_#bc13fe]' 
                                : 'bg-transparent text-slate-500 shadow-[0_0_10px_rgba(188,19,254,0.2)] hover:text-cyber-purple hover:shadow-[0_0_15px_#bc13fe]'
                            }`}
                        >
                            Vendedores
                        </button>
                    </div>
                )}
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end relative z-10">
                {/* SEARCH INPUT - PERMANENT BORDER */}
                <div className="lg:col-span-5 relative group/input">
                    <label className={`text-[10px] font-mono font-bold ${theme.text} uppercase tracking-widest ml-1 mb-1 block transition-colors duration-500`}>
                        Búsqueda: ID, Teléfono, Nombre
                    </label>
                    
                    <div className="relative">
                        {/* Input Glow on Focus */}
                        <div className={`absolute -inset-0.5 ${theme.bg} rounded-xl blur opacity-0 group-focus-within/input:opacity-50 transition-opacity duration-500`}></div>
                        
                        <div className={`relative flex items-center bg-black border-2 ${theme.border} rounded-xl overflow-hidden transition-colors duration-500 shadow-inner group-focus-within/input:${theme.shadow}`}>
                            <div className={`pl-4 ${theme.text} opacity-70`}><i className="fas fa-search"></i></div>
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Ej: 102340567 o +506..."
                                className={`w-full bg-transparent border-none text-white font-mono text-sm px-4 py-3 focus:outline-none placeholder-slate-700 ${theme.focusText}`}
                            />
                        </div>
                    </div>
                </div>

                {/* FILTER BUTTONS - PHOSPHORESCENT */}
                <div className="lg:col-span-3 flex items-end gap-2">
                    {['ALL', 'ACTIVE', 'SUSPENDED'].map(status => (
                        <button 
                            key={status} 
                            onClick={() => setFilterStatus(status as any)} 
                            className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase border-2 transition-colors duration-300 ${
                                filterStatus === status 
                                ? `${theme.bg}/20 ${theme.border} ${theme.text} shadow-inner shadow-[0_0_10px_currentColor]` 
                                : `border-white/10 text-slate-500 hover:border-white/30 hover:bg-white/5 hover:text-white hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]`
                            }`}
                        >
                            {status === 'ALL' ? 'Todos' : status === 'ACTIVE' ? 'Activos' : 'Bloq.'}
                        </button>
                    ))}
                </div>

                <div className="lg:col-span-4 flex items-center justify-end gap-4">
                    <div className="text-right">
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest">Capital Total</div>
                        <div className={`text-xl font-mono font-bold ${theme.text} text-glow-sm transition-colors duration-500`}>{formatCurrency(totalBalance)}</div>
                    </div>
                    <div className="h-10 w-[2px] bg-white/10"></div>
                    <div className="text-right">
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest">Usuarios</div>
                        <div className="text-lg font-mono font-bold text-white"><span className="text-green-500">{activeCount}</span> / <span className="text-red-500">{suspendedCount}</span></div>
                    </div>
                </div>
            </div>
        </div>

        {/* TABLE AREA */}
        <div className="relative overflow-x-auto min-h-[auto] max-h-[600px] custom-scrollbar bg-[#080c14]">
             <table className="w-full text-left border-collapse relative z-10">
                <thead className="sticky top-0 bg-[#02040a] z-20 shadow-xl">
                    <tr className={`text-[9px] font-mono ${theme.text} uppercase border-b border-white/10 tracking-widest transition-colors duration-500`}>
                        <th className="p-4 pl-6">Identidad / Nombre</th>
                        <th className="p-4">Cédula & Contacto</th>
                        <th className="p-4 text-right">Balance</th>
                        <th className="p-4 text-center">Estado</th>
                        <th className="p-4 text-right pr-6">Control</th>
                    </tr>
                </thead>
                <tbody className="font-mono text-xs">
                    {filteredUsers.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-20 text-center">
                                <div className="flex flex-col items-center justify-center gap-4 text-slate-600 opacity-50">
                                    <i className="fas fa-search text-4xl"></i>
                                    <span className="uppercase tracking-widest text-sm">No se encontraron registros</span>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        filteredUsers.map(u => (
                            <tr 
                                key={u.id} 
                                className="relative border-b border-white/5 hover:bg-white/5 transition-colors duration-200 group/row"
                            >
                                <td className="p-4 pl-6">
                                    <div className="flex items-center gap-4">
                                        {/* Avatar: Fixed Transitions */}
                                        <div className={`relative w-10 h-10 rounded-full bg-black flex items-center justify-center border-2 border-white/10 ${theme.hoverBorder} ${theme.hoverShadow} transition-[border-color,box-shadow] duration-300`}>
                                            <span className="font-display font-bold text-white">{u.name.substring(0,2).toUpperCase()}</span>
                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-black rounded-full flex items-center justify-center">
                                                <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-green-500 shadow-[0_0_5px_lime]' : 'bg-red-500 shadow-[0_0_5px_red]'}`}></div>
                                            </div>
                                        </div>
                                        <div className="font-bold text-white">{u.name}</div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-bold ${theme.text} tracking-wider transition-colors duration-500`}>ID: {u.cedula || 'N/A'}</span>
                                        <span className="text-[9px] text-slate-500">{u.phone}</span>
                                        {u.email && <span className="text-[8px] text-slate-600 opacity-70">{u.email}</span>}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className={`font-bold text-sm ${u.balance_bigint > 0 ? theme.text : 'text-slate-500'} text-glow-sm transition-colors duration-500`}>{formatCurrency(u.balance_bigint)}</div>
                                    {activeTab === 'VENDEDORES' && (
                                        <button onClick={() => setPayUser(u)} className="mt-1 px-2 py-0.5 bg-cyber-purple/10 border border-cyber-purple/30 rounded text-[8px] font-bold text-cyber-purple hover:bg-cyber-purple hover:text-black transition-colors ml-auto shadow-[0_0_10px_rgba(188,19,254,0.1)]">LIQUIDAR</button>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase border-2 transition-colors duration-300 ${
                                        u.status === 'Active' 
                                        ? 'border-cyber-success text-cyber-success shadow-[0_0_10px_rgba(10,255,96,0.2)]' 
                                        : 'border-cyber-danger text-cyber-danger shadow-[0_0_10px_rgba(255,0,60,0.2)]'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-cyber-success animate-pulse' : 'bg-cyber-danger'}`}></span>
                                        {u.status === 'Active' ? 'OPERATIVO' : 'BLOQUEADO'}
                                    </div>
                                </td>
                                <td className="p-4 pr-6 text-right">
                                    <div className="flex items-center justify-end gap-3 opacity-90">
                                        {/* Actions: Simplified Transitions */}
                                        <button 
                                            onClick={() => onRecharge(u)} 
                                            className="w-8 h-8 rounded-lg bg-black border-2 border-cyber-success flex items-center justify-center text-cyber-success shadow-neon-green hover:bg-cyber-success hover:text-black hover:scale-110 transition-[background-color,color,transform,box-shadow,border-color] duration-300" 
                                            title="Recargar"
                                        >
                                            <i className="fas fa-bolt"></i>
                                        </button>
                                        
                                        <button 
                                            onClick={() => onWithdraw(u)} 
                                            className="w-8 h-8 rounded-lg bg-black border-2 border-cyber-orange flex items-center justify-center text-cyber-orange shadow-neon-orange hover:bg-cyber-orange hover:text-black hover:scale-110 transition-[background-color,color,transform,box-shadow,border-color] duration-300" 
                                            title="Retirar"
                                        >
                                            <i className="fas fa-hand-holding-usd"></i>
                                        </button>
                                        
                                        <button 
                                            onClick={() => setControlUser(u)} 
                                            className="w-8 h-8 rounded-lg bg-black border-2 border-cyber-danger flex items-center justify-center text-cyber-danger shadow-neon-red hover:bg-cyber-danger hover:text-black hover:scale-110 transition-[background-color,color,transform,box-shadow,border-color] duration-300" 
                                            title="Bloquear/Eliminar"
                                        >
                                            <i className={`fas ${u.status === 'Active' ? 'fa-lock' : 'fa-unlock'}`}></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
             </table>
        </div>
        
        {/* Footer Status */}
        <div className="bg-[#02040a] p-3 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-slate-500 relative z-20">
            <div>MOSTRANDO {filteredUsers.length} DE {sourceList.length} REGISTROS</div>
            <div className="flex gap-4"><span className="flex items-center gap-1"><i className="fas fa-circle text-[6px] text-green-500 animate-pulse"></i> SYSTEM_READY</span></div>
        </div>
      </div>
    </div>
  );
}
