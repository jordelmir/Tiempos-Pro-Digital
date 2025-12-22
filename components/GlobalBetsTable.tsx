import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { Bet, UserRole, DrawTime, GameMode } from '../types';
import { formatCurrency, formatDate } from '../constants';
import TicketViewModal from './TicketViewModal';
import WinnerOverlay from './WinnerOverlay';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

interface GlobalBetsTableProps {
  onRefresh?: () => void;
  refreshTrigger?: number;
}

type SortField = 'created_at' | 'numbers' | 'amount_bigint' | 'user_name' | 'status';
type SortOrder = 'asc' | 'desc';

export default function GlobalBetsTable({ onRefresh, refreshTrigger }: GlobalBetsTableProps) {
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const [bets, setBets] = useState<
    (Bet & { user_name?: string; user_role?: string; origin?: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);

  // --- PROTOCOLO DE GANADORES SECUENCIAL ---
  const [winnerQueue, setWinnerQueue] = useState<any[]>([]);
  const [currentWinner, setCurrentWinner] = useState<any>(null);
  const prevBetsRef = useRef<Map<string, string>>(new Map());

  // FILTERS & SEARCH
  const [timeFilter, setTimeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WON' | 'LOST' | 'PENDING'>('ALL');
  const [originFilter, setOriginFilter] = useState<'ALL' | 'Jugador' | 'Vendedor'>('ALL');
  const [entitySearch, setEntitySearch] = useState('');

  // PAGINATION & SORTING
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: SortField; order: SortOrder }>({
    key: 'created_at',
    order: 'desc',
  });

  // Lógica para procesar la cola de ganes
  useEffect(() => {
    if (winnerQueue.length > 0 && !currentWinner) {
      const next = winnerQueue[0];
      setCurrentWinner(next);
      setWinnerQueue((prev) => prev.slice(1));
    }
  }, [winnerQueue, currentWinner]);

  const fetchBets = async () => {
    if (!user) return;
    if (bets.length === 0) setLoading(true);

    try {
      const res = await api.getGlobalBets({
        role: user.role,
        userId: user.id,
        timeFilter,
        statusFilter,
      });
      if (res.data) {
        const incomingBets = res.data.bets as any[];
        const newWinsDetected: any[] = [];

        incomingBets.forEach((bet) => {
          const oldStatus = prevBetsRef.current.get(bet.id);
          // Solo activar si el usuario es el dueño de la apuesta y el estado cambió a WON
          if (bet.status === 'WON' && oldStatus === 'PENDING' && bet.user_id === user.id) {
            const multiplier = bet.mode.includes('200x') ? 200 : 90;
            const realPrizeValue = (bet.amount_bigint * multiplier) / 100;

            newWinsDetected.push({
              amount: realPrizeValue,
              number: bet.numbers,
              draw: bet.draw_id || 'Sorteo',
              type: bet.mode.includes('200x') ? 'REVENTADOS' : 'TIEMPOS',
            });
          }
          prevBetsRef.current.set(bet.id, bet.status);
        });

        if (newWinsDetected.length > 0) {
          // ORDENAMIENTO TÁCTICO: Primero TIEMPOS (Normal), luego REVENTADOS
          newWinsDetected.sort((a, b) => (a.type === 'TIEMPOS' ? -1 : 1));
          setWinnerQueue((prev) => [...prev, ...newWinsDetected]);
          fetchUser(true); // Sync balance
        }

        setBets(incomingBets);
      }
    } catch (e) {
      console.error('Error fetching global bets', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
    const interval = setInterval(fetchBets, 15000);
    return () => clearInterval(interval);
  }, [user, timeFilter, statusFilter, refreshTrigger]);

  // --- DATA PROCESSING ENGINE ---
  const processedBets = useMemo(() => {
    let result = [...bets];

    if (entitySearch) {
      const query = entitySearch.toLowerCase();
      result = result.filter(
        (b) =>
          b.user_name?.toLowerCase().includes(query) ||
          b.ticket_code?.toLowerCase().includes(query) ||
          b.user_id.toLowerCase().includes(query)
      );
    }

    if (originFilter !== 'ALL') {
      result = result.filter((b) => b.origin === originFilter);
    }

    result.sort((a, b) => {
      const valA = a[sortConfig.key] || '';
      const valB = b[sortConfig.key] || '';
      if (valA < valB) return sortConfig.order === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [bets, entitySearch, originFilter, sortConfig]);

  const totalPages = Math.ceil(processedBets.length / pageSize);
  const paginatedBets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedBets.slice(start, start + pageSize);
  }, [processedBets, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [entitySearch, originFilter, timeFilter, statusFilter]);

  const handleSort = (key: SortField) => {
    setSortConfig((prev) => ({
      key,
      order: prev.key === key && prev.order === 'desc' ? 'asc' : 'desc',
    }));
  };

  const getFilterButtonStyle = (
    isActive: boolean,
    type: 'TIME' | 'STATUS' | 'ORIGIN',
    value: string
  ) => {
    if (!isActive) return 'border-white/5 text-slate-500 hover:text-white hover:bg-white/5';
    const base = 'shadow-[0_0_15px_currentColor] border-current bg-opacity-20 scale-105 z-10';
    if (type === 'TIME') {
      if (value === 'Mediodía') return `border-orange-500 text-orange-400 bg-orange-900/30 ${base}`;
      if (value === 'Tarde') return `border-purple-500 text-purple-400 bg-purple-900/30 ${base}`;
      if (value === 'Noche') return `border-blue-600 text-blue-400 bg-blue-900/30 ${base}`;
      return `border-white text-white bg-white/10 ${base}`;
    }
    if (type === 'STATUS') {
      if (value === 'WON') return `border-green-500 text-green-400 bg-green-900/30 ${base}`;
      if (value === 'PENDING') return `border-blue-500 text-blue-400 bg-blue-900/30 ${base}`;
      if (value === 'LOST') return `border-red-500 text-red-400 bg-red-900/30 ${base}`;
      return `border-white text-white bg-white/10 ${base}`;
    }
    return `border-white text-white bg-white/10 ${base}`;
  };

  if (!user) return null;

  return (
    <div className="relative group animate-in fade-in duration-500 w-full">
      <TicketViewModal
        isOpen={!!selectedBet}
        onClose={() => setSelectedBet(null)}
        bet={selectedBet}
      />

      {/* OVERLAY DE GANADORES CENTRALIZADO */}
      <WinnerOverlay
        isOpen={!!currentWinner}
        onClose={() => setCurrentWinner(null)}
        data={currentWinner}
      />

      <div className="absolute -inset-1 bg-cyber-blue rounded-[2rem] opacity-20 blur-2xl animate-pulse pointer-events-none"></div>

      <div className="relative bg-[#050a14] border-2 border-cyber-blue rounded-3xl overflow-hidden shadow-2xl z-10">
        {/* HEADER & FILTERS */}
        <div className="border-b border-white/10 bg-[#02040a]/90 backdrop-blur-xl p-6">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-6">
            <div>
              <h3 className="text-xl font-display font-black text-white uppercase tracking-widest flex items-center gap-3 mb-1">
                <AnimatedIconUltra
                  profile={{ animation: 'spin3d', speed: 4, size: 0.9, theme: 'cyber' }}
                >
                  <i className="fas fa-globe-americas text-cyber-blue"></i>
                </AnimatedIconUltra>
                Registro de <span className="text-cyber-neon text-glow">Transmisiones</span>
              </h3>
              <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                <span>
                  <i className="fas fa-sync-alt mr-1 animate-spin-slow text-cyber-success"></i>{' '}
                  SINC_LIVE
                </span>
                <span className="text-cyber-blue">|</span>
                <span>{processedBets.length} Nodos Detectados</span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="w-full xl:w-96 relative group/search">
              <div className="absolute -inset-1 bg-cyber-neon/20 rounded-xl blur opacity-0 group-focus-within/search:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center bg-black border border-white/10 rounded-xl overflow-hidden shadow-inner">
                <div className="pl-4 text-slate-500">
                  <i className="fas fa-search text-xs"></i>
                </div>
                <input
                  type="text"
                  value={entitySearch}
                  onChange={(e) => setEntitySearch(e.target.value)}
                  placeholder="Buscar por ID, Vendedor o Hash..."
                  className="w-full bg-transparent border-none text-white font-mono text-xs px-4 py-3 focus:outline-none placeholder-slate-700"
                />
                {entitySearch && (
                  <button
                    onClick={() => setEntitySearch('')}
                    className="pr-4 text-slate-500 hover:text-white"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-white/5 pt-6">
            <div className="flex bg-black border border-white/10 rounded-xl p-1 shadow-inner overflow-x-auto no-scrollbar">
              {['ALL', 'Mediodía', 'Tarde', 'Noche'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase transition-all duration-300 border whitespace-nowrap ${getFilterButtonStyle(timeFilter === t, 'TIME', t)}`}
                >
                  {t === 'ALL' ? 'Todo' : t}
                </button>
              ))}
            </div>

            <div className="flex bg-black border border-white/10 rounded-xl p-1 shadow-inner overflow-x-auto no-scrollbar">
              {['ALL', 'WON', 'PENDING', 'LOST'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s as any)}
                  className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase transition-all duration-300 border whitespace-nowrap ${getFilterButtonStyle(statusFilter === s, 'STATUS', s)}`}
                >
                  {s === 'ALL'
                    ? 'Todo'
                    : s === 'WON'
                      ? 'Ganes'
                      : s === 'PENDING'
                        ? 'En Juego'
                        : 'Cerradas'}
                </button>
              ))}
            </div>

            {user.role !== UserRole.Cliente && (
              <div className="flex bg-black border border-white/10 rounded-xl p-1 shadow-inner">
                {['ALL', 'Jugador', 'Vendedor'].map((o) => (
                  <button
                    key={o}
                    onClick={() => setOriginFilter(o as any)}
                    className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase transition-all duration-300 border ${getFilterButtonStyle(originFilter === o, 'ORIGIN', o)}`}
                  >
                    {o === 'ALL' ? 'Origen: Todo' : o}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* TABLE */}
        <div className="relative overflow-x-auto custom-scrollbar bg-[#080c14]">
          <table className="w-full text-left border-collapse relative z-10 min-w-[900px]">
            <thead className="bg-[#02040a] shadow-xl border-b border-white/10">
              <tr className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                <SortableHeader
                  label="Timestamp"
                  field="created_at"
                  current={sortConfig}
                  onSort={handleSort}
                  className="p-4 pl-6"
                />
                <SortableHeader
                  label="Usuario / Origen"
                  field="user_name"
                  current={sortConfig}
                  onSort={handleSort}
                  className="p-4"
                />
                <SortableHeader
                  label="Número"
                  field="numbers"
                  current={sortConfig}
                  onSort={handleSort}
                  className="p-4 text-center"
                />
                <th className="p-4 text-center">Sorteo</th>
                <th className="p-4 text-center">Modo Operativo</th>
                <SortableHeader
                  label="Inversión"
                  field="amount_bigint"
                  current={sortConfig}
                  onSort={handleSort}
                  className="p-4 text-right"
                />
                <th className="p-4 text-right text-cyber-success">Premio Ganado</th>
                <SortableHeader
                  label="Estado"
                  field="status"
                  current={sortConfig}
                  onSort={handleSort}
                  className="p-4 text-center"
                />
                <th className="p-4 text-right pr-6">Acción</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-20 text-center text-cyber-blue animate-pulse tracking-widest bg-black/40"
                  >
                    DESCIFRANDO_DATOS...
                  </td>
                </tr>
              ) : paginatedBets.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-20 text-center text-slate-600 tracking-widest bg-black/20"
                  >
                    SIN_COINCIDENCIAS
                  </td>
                </tr>
              ) : (
                paginatedBets.map((bet) => {
                  const isWin = bet.status === 'WON';
                  const isPending = bet.status === 'PENDING';
                  const isPlayer = bet.origin === 'Jugador';

                  // Hack de compatibilidad para evitar errores de UUID en BD
                  let displayDraw = bet.draw_id;
                  let realMode = bet.mode;

                  if (bet.mode && bet.mode.includes(':::')) {
                    const parts = bet.mode.split(':::');
                    displayDraw = parts[0];
                    realMode = parts[1];
                  }

                  const multiplier = realMode.includes('200x') ? 200 : 90;
                  const totalPrize = bet.amount_bigint * multiplier;
                  const isReventadoMode = realMode.includes('200x');

                  return (
                    <tr
                      key={bet.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                    >
                      <td className="p-4 pl-6">
                        <div className="font-bold text-white">
                          {formatDate(bet.created_at).split(',')[1]}
                        </div>
                        <div className="text-[9px] text-slate-600 font-mono tracking-tighter uppercase">
                          {bet.ticket_code}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-1 h-8 rounded-full ${isPlayer ? 'bg-cyber-neon' : 'bg-cyber-purple'}`}
                          ></div>
                          <div className="max-w-[150px] truncate">
                            <div className="text-white font-bold text-xs truncate">
                              {bet.user_name}
                            </div>
                            <div
                              className={`text-[8px] uppercase tracking-wider ${isPlayer ? 'text-cyber-neon' : 'text-cyber-purple'}`}
                            >
                              {bet.origin}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`text-xl font-black ${isWin ? 'text-cyber-success text-glow-green animate-pulse' : 'text-white'}`}
                        >
                          {bet.numbers}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider bg-white/5 px-2 py-1 rounded border border-white/10 inline-block">
                          {displayDraw?.split(' ')[0] || '---'}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div
                          className={`px-2 py-1 rounded text-[7px] font-black border uppercase tracking-tighter inline-block ${isReventadoMode ? 'border-red-600 text-red-500 bg-red-950/40 animate-pulse' : 'border-cyber-neon/50 text-cyber-neon bg-cyan-950/20'}`}
                        >
                          {isReventadoMode ? 'REVENTADO' : 'NORMAL'}
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-white text-sm">
                        {formatCurrency(bet.amount_bigint)}
                      </td>
                      <td
                        className={`p-4 text-right font-black text-sm ${isWin ? 'text-[#39FF14] text-glow-green drop-shadow-[0_0_8px_rgba(57,255,20,0.5)] animate-pulse' : 'text-slate-700'}`}
                      >
                        {isWin ? formatCurrency(totalPrize) : formatCurrency(totalPrize)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-lg text-[9px] font-black border uppercase transition-all duration-300 ${
                            isWin
                              ? 'bg-green-900/30 text-green-400 border-green-500/50 shadow-neon-green'
                              : isPending
                                ? 'bg-blue-900/30 text-blue-400 border-blue-500/50'
                                : 'bg-red-900/10 text-slate-600 border-slate-800'
                          }`}
                        >
                          {isWin ? 'GANADOR' : isPending ? 'EN JUEGO' : 'CERRADO'}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <button
                          onClick={() => setSelectedBet(bet)}
                          className="w-8 h-8 rounded-lg bg-black border border-white/10 text-slate-500 hover:text-white hover:border-cyber-blue transition-all shadow-inner"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div className="p-4 md:p-6 bg-[#02040a] border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest order-2 md:order-1">
            Página <span className="text-white font-bold">{currentPage}</span> de{' '}
            <span className="text-white font-bold">{totalPages || 1}</span>
            <span className="mx-4 hidden sm:inline">|</span>
            Mostrando <span className="text-white font-bold">{paginatedBets.length}</span> de{' '}
            {processedBets.length} Nodos
          </div>

          <div className="flex gap-2 order-1 md:order-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="w-10 h-10 md:w-auto md:px-4 bg-black border border-white/10 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center"
            >
              <i className="fas fa-chevron-left md:mr-2"></i>{' '}
              <span className="hidden md:inline">Anterior</span>
            </button>

            <div className="hidden sm:flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-10 h-10 rounded-lg text-[10px] font-bold border transition-all ${currentPage === p ? 'bg-cyber-blue border-cyber-blue text-white shadow-neon-blue' : 'bg-black border-white/5 text-slate-500 hover:text-white hover:border-white/20'}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0 || loading}
              className="w-10 h-10 md:w-auto md:px-4 bg-black border border-white/10 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center"
            >
              <span className="hidden md:inline">Siguiente</span>{' '}
              <i className="fas fa-chevron-right md:ml-2"></i>
            </button>
          </div>

          <div className="hidden xl:flex items-center gap-3 order-3">
            <span className="text-[10px] font-mono text-slate-600 uppercase">Buffer</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-black border border-white/10 rounded px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-cyber-blue cursor-pointer"
            >
              {[10, 25, 50, 100].map((v) => (
                <option key={v} value={v}>
                  {v} Filas
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

const SortableHeader = ({
  label,
  field,
  current,
  onSort,
  className = '',
}: {
  label: string;
  field: SortField;
  current: { key: string; order: string };
  onSort: (f: SortField) => void;
  className?: string;
}) => {
  const isActive = current.key === field;
  return (
    <th
      className={`${className} cursor-pointer hover:bg-white/5 transition-colors group/header`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        {label}
        <div
          className={`flex flex-col text-[8px] transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-20 group-hover/header:opacity-100'}`}
        >
          <i
            className={`fas fa-chevron-up ${isActive && current.order === 'asc' ? 'text-cyber-neon' : ''}`}
          ></i>
          <i
            className={`fas fa-chevron-down ${isActive && current.order === 'desc' ? 'text-cyber-neon' : ''}`}
          ></i>
        </div>
      </div>
    </th>
  );
};
