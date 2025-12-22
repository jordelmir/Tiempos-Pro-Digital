import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { LedgerTransaction, UserRole } from '../types';
import { formatCurrency, formatDate, ROUTES } from '../constants';
import { useAuthStore } from '../store/useAuthStore';
import { Navigate } from 'react-router-dom';

// --- DATA PROCESSOR (ENSURE EXACT 12 MONTHS) ---
const processChartData = (txs: LedgerTransaction[]) => {
  const sorted = [...txs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const periodMap = new Map<string, { in: number; out: number; balance: number; order: number }>();

  // Initialize last 12 months with zeros to guarantee 12 bars
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).toUpperCase();
    const sortKey = d.getFullYear() * 100 + d.getMonth();
    periodMap.set(key, { in: 0, out: 0, balance: 0, order: sortKey });
  }

  let runningBalance = sorted.length > 0 ? sorted[0].balance_before : 0;

  sorted.forEach((tx) => {
    const d = new Date(tx.created_at);
    const dateKey = d
      .toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      .toUpperCase();
    if (periodMap.has(dateKey)) {
      const entry = periodMap.get(dateKey)!;
      if (tx.amount_bigint > 0) entry.in += tx.amount_bigint;
      else entry.out += Math.abs(tx.amount_bigint);
      runningBalance = tx.balance_after;
      entry.balance = runningBalance;
    }
  });

  return Array.from(periodMap.entries())
    .map(([mes, val]) => ({
      mes,
      ...val,
      net: val.in - val.out,
    }))
    .sort((a, b) => a.order - b.order);
};

const aggregateLedgerByTime = (txs: LedgerTransaction[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = now.getDay() || 7;
  const startOfWeek = new Date(now);
  startOfWeek.setHours(-24 * (day - 1), 0, 0, 0);
  const startOfMonthTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfYearTime = new Date(now.getFullYear(), 0, 1).getTime();

  const stats = {
    diario: { in: 0, out: 0, net: 0 },
    semanal: { in: 0, out: 0, net: 0 },
    mensual: { in: 0, out: 0, net: 0 },
    anual: { in: 0, out: 0, net: 0 },
  };

  txs.forEach((tx) => {
    const t = new Date(tx.created_at).getTime();
    const amount = tx.amount_bigint;
    if (t >= startOfYearTime) {
      if (amount > 0) stats.anual.in += amount;
      else stats.anual.out += Math.abs(amount);
      stats.anual.net += amount;
      if (t >= startOfMonthTime) {
        if (amount > 0) stats.mensual.in += amount;
        else stats.mensual.out += Math.abs(amount);
        stats.mensual.net += amount;
        if (t >= startOfWeek.getTime()) {
          if (amount > 0) stats.semanal.in += amount;
          else stats.semanal.out += Math.abs(amount);
          stats.semanal.net += amount;
          if (t >= today) {
            if (amount > 0) stats.diario.in += amount;
            else stats.diario.out += Math.abs(amount);
            stats.diario.net += amount;
          }
        }
      }
    }
  });
  return stats;
};

const MetricRow = ({
  title,
  data,
  theme,
}: {
  title: string;
  data: { in: number; out: number; net: number };
  theme: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    className={`space-y-6 p-6 md:p-8 rounded-[2.5rem] border-2 bg-black/40 backdrop-blur-xl transition-all duration-700 hover:scale-[1.01] ${
      theme === 'emerald'
        ? 'border-cyber-emerald shadow-neon-emerald'
        : 'border-cyber-blue shadow-neon-blue'
    }`}
  >
    <div className="flex items-center gap-3 px-2">
      <div
        className={`w-1.5 h-6 rounded-full animate-pulse ${theme === 'emerald' ? 'bg-cyber-emerald shadow-neon-emerald' : 'bg-cyber-blue shadow-neon-blue'}`}
      ></div>
      <h4 className="text-sm font-display font-black text-white uppercase tracking-[0.2em]">
        {title}
      </h4>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MetricCard
        label="Inyecciones (+)"
        val={data.in}
        border="border-cyber-emerald"
        shadow="shadow-neon-emerald"
        icon="fa-arrow-trend-up"
        color="text-cyber-emerald"
      />
      <MetricCard
        label="Retiros (-)"
        val={data.out}
        border="border-cyber-danger"
        shadow="shadow-neon-red"
        icon="fa-arrow-trend-down"
        color="text-cyber-danger"
      />
      <MetricCard
        label="Delta Neto"
        val={data.net}
        border={data.net >= 0 ? 'border-cyber-success' : 'border-cyber-danger'}
        shadow={data.net >= 0 ? 'shadow-neon-green' : 'shadow-neon-red'}
        icon={data.net >= 0 ? 'fa-chart-line' : 'fa-triangle-exclamation'}
        color={data.net >= 0 ? 'text-cyber-success' : 'text-cyber-danger'}
      />
    </div>
  </motion.div>
);

const MetricCard = ({ label, val, border, shadow, icon, color }: any) => (
  <div
    className={`bg-black/60 backdrop-blur-md border-2 ${border} ${shadow} rounded-[2rem] p-6 group transition-all hover:scale-[1.05] relative overflow-hidden`}
  >
    <div className="flex justify-between items-start mb-3 relative z-10">
      <span className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-widest">
        {label}
      </span>
      <div
        className={`w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center transition-all group-hover:border-current`}
      >
        <i
          className={`fas ${icon} ${color} opacity-60 group-hover:opacity-100 transition-opacity`}
        ></i>
      </div>
    </div>
    <div
      className={`text-2xl md:text-3xl font-mono font-black text-white relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]`}
    >
      {formatCurrency(val)}
    </div>
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
    {/* Dynamic scanline for the card */}
    <div
      className={`absolute top-0 left-0 w-full h-[1px] ${color.replace('text-', 'bg-')} opacity-20 animate-[scanline_4s_linear_infinite]`}
    ></div>
  </div>
);

export default function LedgerView() {
  const { user } = useAuthStore();
  const [txs, setTxs] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    async function fetchLedger() {
      const { data } = await supabase
        .from('ledger_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (data) setTxs(data as unknown as LedgerTransaction[]);
      setLoading(false);
    }
    fetchLedger();
  }, []);

  const exportLedger = () => {
    if (txs.length === 0) {
      alert('No hay transacciones para exportar.');
      return;
    }

    // Guide for Accountants / AI
    const guide = [
      '# REPORTE DE INTELIGENCIA FINANCIERA - TIEMPOS PRO',
      '# GUIA DE INTERPRETACION DE DATOS:',
      '# - ID_TRANSACCION: Identificador único e inmutable en la base de datos.',
      '# - TICKET_CODE: Código del tiquete asociado (si aplica). Referencia cruzada con sistema de apuestas.',
      '# - MONTO_IMPACTO: Valor monetario de la transacción. Positivo = Ingreso/Recarga. Negativo = Gasto/Pago.',
      '# - BALANCE_PREVIO/FINAL: Estado de la bóveda antes y después de la operación (Atomicidad garantizada).',
      '# - TIPO_MOVIMIENTO: Clasificación contable (BET_PLACEMENT, PRIZE_PAYOUT, RECHARGE, etc).',
      '# - METADATA: Datos técnicos adicionales en formato JSON plano.',
      '# ------------------------------------------------------------',
    ].join('\n');

    // Define CSV Headers
    const headers = [
      'ID_TRANSACCION',
      'TICKET_CODE',
      'FECHA',
      'HORA',
      'USUARIO_ID',
      'TIPO_MOVIMIENTO',
      'MONTO_IMPACTO',
      'BALANCE_PREVIO',
      'BALANCE_FINAL',
      'REFERENCIA_SISTEMA',
      'METADATA',
    ];

    // Map Rows
    const csvContent = [
      guide,
      headers.join(','),
      ...txs.map((tx) => {
        const dateObj = new Date(tx.created_at);
        const dateStr = dateObj.toLocaleDateString('es-CR');
        const timeStr = dateObj.toLocaleTimeString('es-CR');

        // Safe Strings
        const safeMeta = JSON.stringify(tx.meta || {}).replace(/"/g, '""');
        const safeRef = (tx.reference_id || 'N/A').replace(/"/g, '""');
        const safeTicket = (tx.ticket_code || 'N/A').replace(/"/g, '""');

        return [
          `"${tx.id}"`,
          `"${safeTicket}"`,
          `"${dateStr}"`,
          `"${timeStr}"`,
          `"${tx.user_id}"`,
          `"${tx.type}"`,
          `"${tx.amount_bigint}"`,
          `"${tx.balance_before}"`,
          `"${tx.balance_after}"`,
          `"${safeRef}"`,
          `"${safeMeta}"`,
        ].join(',');
      }),
    ].join('\n');

    // Create Blob (Excel UTF-8 Compatible)
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.href = url;
    link.download = `PHRONT_LEDGER_${timestamp}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const timeStats = useMemo(() => aggregateLedgerByTime(txs), [txs]);
  const chartData = useMemo(() => processChartData(txs), [txs]);

  if (!user || user.role !== UserRole.SuperAdmin) return <Navigate to={ROUTES.DASHBOARD} replace />;

  const H = 400,
    W = 1200,
    P = 60;
  const maxVal =
    Math.max(...chartData.map((d) => Math.max(d.in, d.out, Math.abs(d.balance))), 1000000) * 1.2;
  const getX = (i: number) => P + (i * (W - 2 * P)) / 11;
  const getY = (val: number) => H - P - (Math.abs(val) / maxVal) * (H - 2 * P);

  const activeData = activeIdx !== null ? chartData[activeIdx] : null;

  return (
    <div className="p-4 md:p-8 space-y-16 animate-in fade-in duration-700">
      {/* HEADER COMMAND HUD */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b-2 border-white/10 pb-10 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <i className="fas fa-microchip text-cyber-emerald animate-spin-slow"></i>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.5em] font-black">
              Fiscal Intelligence Unit v5.0
            </span>
          </div>
          <h2 className="text-5xl md:text-7xl font-display font-black text-white italic tracking-tighter uppercase leading-none">
            INTELIGENCIA{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 text-glow-emerald">
              FINANCIERA
            </span>
          </h2>
        </div>
        <div className="flex flex-col items-end gap-4">
          <div className="bg-black/40 p-8 rounded-[2.5rem] border-2 border-cyber-emerald shadow-neon-emerald backdrop-blur-2xl text-right">
            <div className="text-[10px] font-mono text-cyber-emerald uppercase font-black tracking-widest mb-2">
              Reserva Atómica en Bóveda
            </div>
            <div className="text-4xl md:text-5xl font-mono font-black text-white text-glow-emerald">
              {txs.length > 0 ? formatCurrency(txs[0].balance_after) : 'CRC 0'}
            </div>
          </div>

          <button
            onClick={exportLedger}
            className="bg-[#050a14] border-2 border-cyber-emerald/50 hover:border-cyber-emerald text-cyber-emerald hover:text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] group flex items-center gap-2"
          >
            <i className="fas fa-file-invoice-dollar group-hover:animate-bounce"></i> Descargar
            Reporte Contable (CSV)
          </button>
        </div>
      </header>

      {/* MATRIX KPIS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        <MetricRow title="Flujo Diario" data={timeStats.diario} theme="emerald" />
        <MetricRow title="Flujo Semanal" data={timeStats.semanal} theme="blue" />
        <MetricRow title="Cierre Mensual" data={timeStats.mensual} theme="emerald" />
        <MetricRow title="Acumulado Anual" data={timeStats.anual} theme="blue" />
      </div>

      {/* HISTOGRAMA INTERACTIVO 12 MESES */}
      <section className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyber-emerald via-cyber-blue to-cyber-neon rounded-[3.5rem] opacity-20 blur-xl animate-pulse"></div>
        <div className="relative bg-[#050a14]/80 border-2 border-cyber-neon shadow-neon-cyan rounded-[3.5rem] p-10 backdrop-blur-3xl overflow-hidden min-h-[600px] flex flex-col">
          <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8">
            <div>
              <h3 className="text-2xl font-display font-black text-white uppercase tracking-widest flex items-center gap-4">
                <i className="fas fa-chart-area text-cyber-neon"></i> Histograma de Liquidez
              </h3>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">
                Rendimiento Multidimensional (Ciclo de 12 Meses)
              </p>
            </div>

            <AnimatePresence mode="wait">
              {activeData ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-black/60 border border-cyber-neon/40 rounded-2xl p-4 grid grid-cols-3 gap-6 shadow-inner"
                >
                  <div className="text-center">
                    <div className="text-[8px] text-slate-500 font-bold uppercase mb-1">
                      Periodo
                    </div>
                    <div className="text-xs font-black text-white">{activeData.mes}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-cyber-emerald font-bold uppercase mb-1">
                      Inyecciones
                    </div>
                    <div className="text-xs font-black text-white">
                      {formatCurrency(activeData.in)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-red-500 font-bold uppercase mb-1">Retiros</div>
                    <div className="text-xs font-black text-white">
                      {formatCurrency(activeData.out)}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="text-[10px] font-mono text-slate-600 animate-pulse uppercase tracking-widest border border-dashed border-white/10 px-6 py-3 rounded-2xl">
                  Seleccione una barra para inspeccionar métricas
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1 relative cursor-crosshair">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="barIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="barOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff003c" />
                  <stop offset="100%" stopColor="#ff003c" stopOpacity="0.2" />
                </linearGradient>
                <filter id="neon">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* X-AXIS LABELS & VERTICAL LINES */}
              {chartData.map((d, i) => (
                <g key={`axis-${i}`}>
                  <line
                    x1={getX(i)}
                    x2={getX(i)}
                    y1={P}
                    y2={H - P}
                    stroke="white"
                    strokeOpacity="0.05"
                  />
                  <text
                    x={getX(i)}
                    y={H - 10}
                    textAnchor="middle"
                    fill={activeIdx === i ? '#00f0ff' : '#475569'}
                    className="text-[14px] font-mono font-bold transition-colors"
                  >
                    {d.mes}
                  </text>
                </g>
              ))}

              {/* BARS - VOLUME */}
              {chartData.map((d, i) => {
                const x = getX(i);
                return (
                  <g
                    key={`bars-${i}`}
                    className="transition-all duration-300"
                    onMouseEnter={() => setActiveIdx(i)}
                    onMouseLeave={() => setActiveIdx(null)}
                    onClick={() => setActiveIdx(i)}
                  >
                    {/* Background Highlight */}
                    <rect
                      x={x - 40}
                      y={P}
                      width="80"
                      height={H - P * 2}
                      fill={activeIdx === i ? 'white' : 'transparent'}
                      opacity="0.03"
                      rx="10"
                    />

                    {/* In Bar */}
                    <motion.rect
                      initial={{ height: 0 }}
                      animate={{ height: H - P - getY(d.in) }}
                      x={x - 25}
                      y={getY(d.in)}
                      width="20"
                      fill="url(#barIn)"
                      rx="4"
                      className={`transition-opacity ${activeIdx !== null && activeIdx !== i ? 'opacity-20' : 'opacity-80'}`}
                    />

                    {/* Out Bar */}
                    <motion.rect
                      initial={{ height: 0 }}
                      animate={{ height: H - P - getY(d.out) }}
                      x={x + 5}
                      y={getY(d.out)}
                      width="20"
                      fill="url(#barOut)"
                      rx="4"
                      className={`transition-opacity ${activeIdx !== null && activeIdx !== i ? 'opacity-20' : 'opacity-80'}`}
                    />
                  </g>
                );
              })}

              {/* LINE - BALANCE */}
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                d={chartData
                  .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.balance)}`)
                  .join(' ')}
                fill="none"
                stroke="#00f0ff"
                strokeWidth="4"
                filter="url(#neon)"
                className="opacity-60"
              />

              {/* DOTS ON LINE */}
              {chartData.map((d, i) => (
                <circle
                  key={`dot-${i}`}
                  cx={getX(i)}
                  cy={getY(d.balance)}
                  r={activeIdx === i ? 8 : 4}
                  fill={activeIdx === i ? '#fff' : '#00f0ff'}
                  className="transition-all"
                />
              ))}
            </svg>
          </div>

          {/* CHART LEGEND FOSFORESCENTE */}
          <div className="mt-8 flex justify-center gap-12 border-t border-white/5 pt-8">
            <LegendItem dot="bg-cyber-emerald shadow-neon-emerald" label="INGRESOS (IN)" />
            <LegendItem dot="bg-red-500 shadow-neon-red" label="RETIROS (OUT)" />
            <LegendItem dot="bg-cyber-neon shadow-neon-cyan" label="BALANCE TOTAL" />
          </div>
        </div>
      </section>

      {/* TRANSACTION TABLE BLOCK */}
      <div className="relative group/ledger">
        {/* Ambient Backlight for the Ledger Chassis */}
        <div className="absolute -inset-1 bg-cyber-blue opacity-10 blur-2xl rounded-[3rem] animate-pulse pointer-events-none"></div>

        <div className="relative bg-[#050a14] border-2 border-cyber-blue rounded-[3rem] overflow-hidden shadow-neon-blue z-10 transition-all duration-500">
          <div className="p-8 border-b border-cyber-blue/30 bg-[#02040a]/60 backdrop-blur-xl flex justify-between items-center relative overflow-hidden">
            {/* Internal Scanline for Header */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-cyber-blue opacity-40 shadow-[0_0_15px_#2463eb] animate-[scanline_4s_linear_infinite]"></div>

            <h3 className="text-xl font-display font-black text-white uppercase tracking-widest flex items-center gap-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              <i className="fas fa-database text-cyber-blue animate-pulse"></i> Ledger Criptográfico
            </h3>
            <div className="text-[10px] font-mono text-cyber-blue/70 font-black uppercase tracking-[0.3em] border border-cyber-blue/20 px-3 py-1 rounded-full bg-black/40">
              Sincronización SHA-256 Activa
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] custom-scrollbar bg-black/20">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#02040a] z-20 border-b border-cyber-blue/20">
                <tr className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  <th className="p-6 pl-10">Hash ID</th>
                  <th className="p-6">Timestamp</th>
                  <th className="p-6 text-center">Tipo</th>
                  <th className="p-6 text-right">Delta</th>
                  <th className="p-6 text-right pr-10">Balance After</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-40 text-center animate-pulse text-cyber-neon uppercase font-black tracking-widest"
                    >
                      Sincronizando con el Núcleo...
                    </td>
                  </tr>
                ) : (
                  txs.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-white/5 hover:bg-cyber-blue/5 transition-all group/row"
                    >
                      <td className="p-6 pl-10">
                        <div className="font-black text-white group-hover/row:text-cyber-neon transition-colors duration-300">
                          {tx.ticket_code || tx.id.substring(0, 8)}
                        </div>
                        <div className="text-[8px] text-slate-600 uppercase mt-0.5 tracking-tighter">
                          {tx.id}
                        </div>
                      </td>
                      <td className="p-6 text-slate-400 font-bold group-hover/row:text-slate-200 transition-colors">
                        {formatDate(tx.created_at)}
                      </td>
                      <td className="p-6 text-center">
                        <span
                          className={`px-4 py-1.5 rounded-lg text-[9px] font-black border uppercase transition-all duration-300 ${tx.amount_bigint > 0 ? 'bg-cyber-emerald/10 border-cyber-emerald text-cyber-emerald shadow-neon-emerald' : 'bg-red-900/10 border-red-500 text-red-500 shadow-neon-red'}`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td
                        className={`p-6 text-right font-black text-sm group-hover/row:scale-105 transition-transform duration-300 ${tx.amount_bigint > 0 ? 'text-cyber-success' : 'text-red-500'}`}
                      >
                        {tx.amount_bigint > 0 ? '+' : ''}
                        {formatCurrency(tx.amount_bigint)}
                      </td>
                      <td className="p-6 text-right pr-10 font-black text-white text-sm group-hover/row:text-glow transition-all duration-300">
                        {formatCurrency(tx.balance_after)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const LegendItem = ({ dot, label }: any) => (
  <div className="flex items-center gap-3">
    <div className={`w-3 h-3 rounded-full ${dot}`}></div>
    <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">
      {label}
    </span>
  </div>
);
