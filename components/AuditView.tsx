'use client'


import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatDate } from '@/constants';
import { AuditLog, AuditSeverity, AuditEventType } from '@/types';

export default function AuditView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<AuditSeverity | 'ALL'>('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Live refresh
    return () => clearInterval(interval);
  }, []);

  async function fetchLogs() {
    // Only set loading on initial fetch to avoid UI flickering
    if (logs.length === 0) setLoading(true);
    const { data, error } = await supabase
        .from('audit_trail')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
    
    if (data) {
        setLogs(data as unknown as AuditLog[]);
    }
    setLoading(false);
  }

  const filteredLogs = useMemo(() => {
      return logs.filter(log => {
          const matchesSearch = 
            (log.actor_name && log.actor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.action && log.action.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.event_id && log.event_id.toLowerCase().includes(searchTerm.toLowerCase()));
          
          const matchesFilter = filterSeverity === 'ALL' || log.severity === filterSeverity;
          
          return matchesSearch && matchesFilter;
      });
  }, [logs, searchTerm, filterSeverity]);

  const exportLogs = () => {
      if (filteredLogs.length === 0) {
          alert("No hay registros para exportar.");
          return;
      }

      // Define CSV Headers
      const headers = [
          'ID_EVENTO',
          'FECHA',
          'HORA',
          'ACTOR',
          'ROL',
          'IP_ORIGEN',
          'ACCIÓN',
          'TIPO',
          'SEVERIDAD',
          'OBJETIVO',
          'METADATA (JSON)'
      ];

      // Map Rows
      const csvContent = [
          headers.join(','),
          ...filteredLogs.map(log => {
              const dateObj = new Date(log.timestamp);
              const dateStr = dateObj.toLocaleDateString('es-CR');
              const timeStr = dateObj.toLocaleTimeString('es-CR');
              
              // Escape quotes for CSV format (replace " with "")
              const safeMeta = JSON.stringify(log.metadata || {}).replace(/"/g, '""');
              const safeAction = (log.action || '').replace(/"/g, '""');
              const safeActor = (log.actor_name || 'System').replace(/"/g, '""');

              return [
                  `"${log.event_id || log.id}"`,
                  `"${dateStr}"`,
                  `"${timeStr}"`,
                  `"${safeActor}"`,
                  `"${log.actor_role}"`,
                  `"${log.ip_address}"`,
                  `"${safeAction}"`,
                  `"${log.type}"`,
                  `"${log.severity}"`,
                  `"${log.target_resource || '-'}"`,
                  `"${safeMeta}"`
              ].join(',');
          })
      ].join('\n');

      // Create Blob with BOM for Excel UTF-8 compatibility
      const blob = new Blob(["\ufeff"+csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.href = url;
      link.download = `PHRONT_AUDITORIA_${timestamp}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const getIcon = (type: AuditEventType) => {
      switch(type) {
          case AuditEventType.IDENTITY_REGISTER: return 'fa-user-plus';
          case AuditEventType.IDENTITY_COLLISION: return 'fa-users-slash';
          case AuditEventType.SESSION_LOGIN: return 'fa-sign-in-alt';
          case AuditEventType.TX_DEPOSIT: return 'fa-arrow-down';
          case AuditEventType.TX_WITHDRAWAL: return 'fa-arrow-up';
          case AuditEventType.ADMIN_PURGE: return 'fa-radiation';
          case AuditEventType.GAME_BET: return 'fa-ticket-alt';
          case AuditEventType.AI_OPERATION: return 'fa-brain';
          case AuditEventType.SYSTEM_INTEGRITY: return 'fa-shield-alt';
          default: return 'fa-info-circle';
      }
  };

  // --- PHOSPHORESCENT STYLE ENGINE ---
  const getLogCardStyle = (sev: AuditSeverity) => {
      switch(sev) {
          case AuditSeverity.CRITICAL: 
              return 'border-red-500 bg-red-950/20 shadow-[0_0_20px_rgba(255,0,60,0.2)] hover:shadow-[0_0_40px_rgba(255,0,60,0.5)] hover:bg-red-900/30';
          case AuditSeverity.WARNING: 
              return 'border-yellow-500 bg-yellow-950/20 shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:shadow-[0_0_40px_rgba(250,204,21,0.5)] hover:bg-yellow-900/30';
          case AuditSeverity.FORENSIC: 
              return 'border-cyber-purple bg-cyber-purple/10 shadow-[0_0_20px_rgba(188,19,254,0.2)] hover:shadow-[0_0_40px_rgba(188,19,254,0.5)] hover:bg-cyber-purple/20';
          case AuditSeverity.SUCCESS: 
              return 'border-cyber-success/50 bg-cyber-success/10 hover:border-cyber-success shadow-[0_0_15px_rgba(10,255,96,0.1)] hover:shadow-[0_0_30px_rgba(10,255,96,0.4)]';
          default: 
              return 'border-cyber-blue/40 bg-cyber-blue/5 hover:border-cyber-blue shadow-[0_0_15px_rgba(36,99,235,0.1)] hover:shadow-[0_0_30px_rgba(36,99,235,0.4)]';
      }
  };

  const getIconBoxStyle = (sev: AuditSeverity) => {
      switch(sev) {
          case AuditSeverity.CRITICAL: return 'border-red-500 text-red-500 shadow-[0_0_15px_red]';
          case AuditSeverity.WARNING: return 'border-yellow-500 text-yellow-500 shadow-[0_0_15px_orange]';
          case AuditSeverity.FORENSIC: return 'border-cyber-purple text-cyber-purple shadow-[0_0_15px_#bc13fe]';
          case AuditSeverity.SUCCESS: return 'border-cyber-success text-cyber-success shadow-[0_0_10px_lime]';
          default: return 'border-cyber-blue text-cyber-blue shadow-[0_0_10px_blue]';
      }
  };

  return (
    <div className="p-4 md:p-8 space-y-12 relative animate-in fade-in duration-700">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyber-purple/10 via-[#02040a] to-[#02040a] z-0"></div>

      {/* Header - LIVING PHOSPHORESCENT */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b-2 border-cyber-purple relative pb-6 shadow-[0_0_30px_rgba(188,19,254,0.2)] z-10">
        <div className="absolute bottom-0 left-0 w-1/3 h-0.5 bg-cyber-purple shadow-[0_0_20px_#bc13fe] animate-[pulse_3s_infinite]"></div>
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tighter mb-2 drop-shadow-lg flex items-center gap-3">
            <i className="fas fa-fingerprint text-cyber-purple animate-pulse drop-shadow-[0_0_15px_rgba(188,19,254,0.8)]"></i>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-400 text-glow-purple" style={{ textShadow: '0 0 30px rgba(188,19,254,0.5)' }}>
                Bitácora Forense
            </span>
          </h2>
          <p className="text-cyber-purple/80 text-xs font-mono uppercase tracking-[0.3em] font-bold flex items-center gap-2 pl-1">
             <span className="w-2 h-2 bg-cyber-purple rounded-full animate-ping"></span> Trazabilidad Inmutable Activa
          </p>
        </div>
        
        <div className="flex gap-3">
            <button 
                onClick={exportLogs}
                className="bg-[#050a14] border-2 border-cyber-purple/50 hover:border-cyber-purple text-cyber-purple hover:text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(188,19,254,0.1)] hover:shadow-[0_0_30px_rgba(188,19,254,0.6)] group hover:-translate-y-0.5"
            >
                <i className="fas fa-file-csv mr-2 group-hover:animate-bounce"></i> Exportar
            </button>
            <button 
                onClick={fetchLogs} 
                className="bg-[#050a14] border-2 border-cyber-neon/50 hover:border-cyber-neon text-cyber-neon hover:text-black hover:bg-cyber-neon px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] hover:-translate-y-0.5"
            >
                <i className="fas fa-sync-alt mr-2"></i> Actualizar
            </button>
        </div>
      </div>

      {/* Controls - VOLUMETRIC CORE CONTAINER */}
      <div className="relative group z-10">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyber-purple via-fuchsia-600 to-indigo-600 rounded-2xl opacity-20 blur-xl animate-pulse transition-all duration-1000 group-hover:opacity-40"></div>
          
          <div className="relative bg-[#050a14] border-2 border-cyber-purple rounded-2xl p-6 shadow-[0_0_40px_rgba(188,19,254,0.15)] flex flex-col md:flex-row gap-6 items-center overflow-hidden">
              {/* Internal Glow Texture */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-cyber-purple shadow-[0_0_20px_#bc13fe] animate-[scanline_4s_linear_infinite] opacity-60"></div>
              
              <div className="relative flex-1 w-full group/search z-10">
                  <label className="text-[9px] font-mono font-bold text-cyber-purple uppercase tracking-widest mb-2 block ml-1 text-shadow-purple">Rastreo de Firma Digital</label>
                  <div className="relative">
                      <div className="absolute inset-0 bg-cyber-purple/10 blur-lg rounded-xl opacity-0 group-focus-within/search:opacity-100 transition-opacity duration-500"></div>
                      <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-cyber-purple z-20"></i>
                      <input 
                        type="text" 
                        placeholder="Buscar por ID, Actor, IP o Hash..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="relative w-full bg-black border-2 border-cyber-purple/30 rounded-xl py-3 pl-10 pr-4 text-white font-mono text-sm focus:outline-none focus:border-cyber-purple focus:shadow-[0_0_30px_rgba(188,19,254,0.4)] transition-all z-10 placeholder-slate-700"
                      />
                  </div>
              </div>
              
              <div className="flex flex-col w-full md:w-auto z-10">
                  <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Nivel de Severidad</label>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {[
                          { id: 'ALL', label: 'Global', color: 'border-white/30 text-slate-300', active: 'border-white bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' },
                          { id: AuditSeverity.CRITICAL, label: 'Crítico', color: 'border-red-900 text-red-700', active: 'border-red-500 bg-red-500/10 text-red-500 shadow-[0_0_20px_#ff003c]' },
                          { id: AuditSeverity.WARNING, label: 'Alerta', color: 'border-yellow-900 text-yellow-700', active: 'border-yellow-500 bg-yellow-500/10 text-yellow-500 shadow-[0_0_20px_#eab308]' },
                          { id: AuditSeverity.FORENSIC, label: 'Forense', color: 'border-purple-900 text-purple-700', active: 'border-cyber-purple bg-cyber-purple/10 text-cyber-purple shadow-[0_0_20px_#bc13fe]' }
                      ].map(filter => (
                          <button 
                            key={filter.id}
                            onClick={() => setFilterSeverity(filter.id as any)}
                            className={`px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase border-2 transition-all whitespace-nowrap hover:-translate-y-0.5 ${
                                filterSeverity === filter.id ? filter.active : `${filter.color} hover:border-white/50 hover:text-white bg-black`
                            }`}
                          >
                              {filter.label}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      {/* --- TIMELINE VIEW --- */}
      <div className="relative z-10">
          {/* Vertical Glowing Plasma Line */}
          <div className="absolute left-4 md:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyber-purple via-indigo-500 to-transparent shadow-[0_0_15px_#bc13fe] opacity-70"></div>

          <div className="space-y-6">
              {loading && logs.length === 0 ? (
                  <div className="p-12 text-center text-cyber-purple animate-pulse font-mono flex flex-col items-center justify-center gap-4 border-2 border-dashed border-cyber-purple/30 rounded-2xl bg-black/40 shadow-[0_0_30px_rgba(188,19,254,0.1)]">
                      <div className="w-16 h-16 rounded-full border-4 border-t-cyber-purple border-b-cyber-purple/30 border-l-transparent border-r-transparent animate-spin"></div>
                      <span className="tracking-[0.2em] font-bold text-lg">DESCIFRANDO LOGS...</span>
                  </div>
              ) : filteredLogs.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 font-mono border-2 border-white/10 rounded-2xl bg-black/20 flex flex-col items-center gap-2">
                      <i className="fas fa-search text-3xl opacity-50 mb-2"></i>
                      <span>SIN REGISTROS COINCIDENTES</span>
                  </div>
              ) : (
                  filteredLogs.map((log) => (
                      <div key={log.id} className="relative pl-12 md:pl-24 group perspective-1000">
                          
                          {/* Timeline Node - Living Energy Orb */}
                          <div className={`absolute left-[10px] md:left-[26px] top-8 w-4 h-4 rounded-full border-2 bg-black z-20 transition-all duration-300 ${
                              log.severity === AuditSeverity.CRITICAL ? 'border-red-500 shadow-[0_0_20px_red] animate-pulse bg-red-900' : 
                              log.severity === AuditSeverity.WARNING ? 'border-yellow-500 shadow-[0_0_15px_orange] bg-yellow-900' : 
                              log.severity === AuditSeverity.FORENSIC ? 'border-cyber-purple shadow-[0_0_15px_purple] bg-purple-900' :
                              'border-cyber-blue shadow-[0_0_15px_cyan] bg-blue-900'
                          }`}></div>

                          {/* Card - PHOSPHORESCENT LIFE */}
                          <div 
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className={`border-2 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer transform group-hover:scale-[1.01] group-hover:translate-x-2 relative z-10 ${getLogCardStyle(log.severity)}`}
                          >
                              {/* Summary Row */}
                              <div className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between relative overflow-hidden">
                                  {/* Hover Scan Effect */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"></div>

                                  {/* Left: Icon & Action */}
                                  <div className="flex items-center gap-5 relative z-10">
                                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl border-2 transition-transform duration-300 group-hover:rotate-6 ${getIconBoxStyle(log.severity)} bg-black`}>
                                          <i className={`fas ${getIcon(log.type)}`}></i>
                                      </div>
                                      <div>
                                          <div className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2 font-bold">
                                              <span className={`w-1.5 h-1.5 rounded-full ${log.severity === AuditSeverity.CRITICAL ? 'bg-red-500 animate-ping' : 'bg-slate-500'}`}></span>
                                              {log.type}
                                          </div>
                                          <div className={`font-bold font-display text-sm md:text-lg text-white group-hover:text-glow transition-all uppercase tracking-wide ${log.severity === AuditSeverity.CRITICAL ? 'text-red-400 drop-shadow-[0_0_5px_red]' : ''}`}>
                                              {log.action?.replace(/_/g, ' ')}
                                          </div>
                                      </div>
                                  </div>

                                  {/* Middle: Actor & Target */}
                                  <div className="hidden md:block text-right md:text-left border-l border-white/10 pl-6 relative z-10">
                                      <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Actor Responsable</div>
                                      <div className="text-xs font-mono text-white font-bold tracking-wide">{log.actor_name}</div> 
                                      <div className="text-[9px] opacity-70 text-cyber-blue font-bold">{log.actor_role}</div>
                                  </div>

                                  {/* Right: Time & Meta */}
                                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-l border-white/10 pl-6 relative z-10">
                                      <div className="text-right">
                                          <div className="text-xs font-bold text-white font-mono">{formatDate(log.timestamp).split(',')[0]}</div>
                                          <div className="text-[10px] font-mono text-slate-400">{formatDate(log.timestamp).split(',')[1]}</div>
                                      </div>
                                      <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center transition-all duration-300 ${expandedId === log.id ? 'rotate-180 bg-white/10 text-white border-white/50' : 'text-slate-500 hover:text-white hover:border-white/30'}`}>
                                          <i className="fas fa-chevron-down text-xs"></i>
                                      </div>
                                  </div>
                              </div>

                              {/* Expanded Details (JSON Inspector) */}
                              {expandedId === log.id && (
                                  <div className="border-t border-white/10 bg-black/80 p-6 animate-in slide-in-from-top-4 backdrop-blur-md">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                          <div className="bg-[#050a14] border border-white/10 rounded-xl p-4 shadow-inner">
                                              <h4 className="text-[10px] font-bold text-cyber-purple uppercase tracking-widest mb-4 border-b border-cyber-purple/30 pb-2 flex items-center gap-2">
                                                  <i className="fas fa-fingerprint"></i> Huella Digital
                                              </h4>
                                              <div className="space-y-3">
                                                  <DetailRow label="Event ID" value={log.event_id} copy icon="fa-id-card" />
                                                  <DetailRow label="IP Address" value={log.ip_address} icon="fa-network-wired" />
                                                  <DetailRow label="Device" value={log.device_fingerprint} icon="fa-desktop" />
                                                  <DetailRow label="Target" value={log.target_resource || 'N/A'} icon="fa-crosshairs" />
                                              </div>
                                          </div>
                                          <div className="bg-[#050a14] border border-white/10 rounded-xl p-4 shadow-inner">
                                              <h4 className="text-[10px] font-bold text-cyber-success uppercase tracking-widest mb-4 border-b border-cyber-success/30 pb-2 flex items-center gap-2">
                                                  <i className="fas fa-lock"></i> Integridad de Cadena
                                              </h4>
                                              <div className="bg-black border-2 border-white/5 rounded-lg p-4 font-mono text-[10px] text-slate-400 break-all shadow-[inset_0_0_20px_rgba(0,0,0,1)] group-hover:border-cyber-success/30 transition-colors">
                                                  <div className="text-slate-500 mb-2 flex items-center gap-2 uppercase font-bold text-[8px] tracking-widest">HASH (SHA-256)</div>
                                                  <span className="text-cyber-success text-shadow-green">{log.hash}</span>
                                              </div>
                                          </div>
                                      </div>

                                      <div>
                                          <h4 className="text-[10px] font-bold text-cyber-neon uppercase tracking-widest mb-4 flex items-center gap-2">
                                              <i className="fas fa-code"></i> Payload Metadata (JSON)
                                          </h4>
                                          <pre className="bg-[#02040a] border-2 border-white/10 rounded-xl p-5 overflow-x-auto text-[10px] font-mono text-green-400 shadow-[inset_0_0_20px_black] custom-scrollbar">
                                              {JSON.stringify(log.metadata, null, 2)}
                                          </pre>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>
    </div>
  );
}

const DetailRow = ({ label, value, copy, icon }: any) => (
    <div className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0 group/row hover:bg-white/5 px-2 rounded transition-colors">
        <span className="text-[9px] text-slate-500 uppercase flex items-center gap-2 font-bold tracking-wider">
            <i className={`fas ${icon} w-4 text-center opacity-50`}></i> {label}
        </span>
        <span className="text-xs font-mono text-white flex items-center gap-3">
            {value}
            {copy && <i className="fas fa-copy text-slate-600 hover:text-cyber-neon cursor-pointer transition-colors opacity-0 group-hover/row:opacity-100" title="Copiar"></i>}
        </span>
    </div>
);
