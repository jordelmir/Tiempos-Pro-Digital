import React from 'react';
import { createPortal } from 'react-dom';
import { Bet } from '../types';
import { formatCurrency, formatDate } from '../constants';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface TicketViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bet: Bet | null;
}

export default function TicketViewModal({ isOpen, onClose, bet }: TicketViewModalProps) {
  useBodyScrollLock(isOpen);

  if (!isOpen || !bet) return null;

  const isWin = bet.status === 'WON';
  const multiplier = bet.mode.includes('200x') ? 200 : 90;
  const totalPrize = bet.amount_bigint * multiplier;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300 p-4 overflow-y-auto">
      {/* Backdrop Click to Close */}
      <div className="absolute inset-0 z-0" onClick={onClose}></div>

      <div className="relative max-w-sm w-full perspective-1000 z-10 my-auto">
        {/* --- TICKET BODY (RE-DISEÑADO) --- */}
        <div
          className="bg-[#e2e8f0] text-slate-900 font-mono text-xs relative shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden pb-4 transform rotate-1 animate-in zoom-in-95 duration-500 max-h-[85vh] flex flex-col"
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
          }}
        >
          {/* BOTÓN CIERRE INTEGRADO (STAMP STYLE) */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 md:w-12 md:h-12 flex flex-col items-center justify-center rounded-lg bg-black/5 border-2 border-black/10 hover:bg-black/80 hover:text-white hover:border-black transition-all z-[130] group shadow-inner"
            title="Cerrar Bóveda"
          >
            <i className="fas fa-times text-lg"></i>
            <span className="text-[6px] font-black uppercase tracking-tighter opacity-40 group-hover:opacity-100">
              VOID
            </span>
          </button>

          {/* Holographic Strip */}
          <div className="absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-b from-slate-400 via-white to-slate-400 opacity-80 border-r border-slate-300 z-20"></div>

          {/* Content Container (Scrollable) */}
          <div className="pl-8 pr-6 py-6 md:py-8 relative overflow-y-auto custom-scrollbar">
            {/* Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-[40px] md:text-[60px] font-black text-slate-400 pointer-events-none opacity-[0.07] border-8 border-slate-400 p-4 rounded-3xl whitespace-nowrap">
              {isWin ? 'WINNER-NODE' : 'VERIFIED'}
            </div>

            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4 pr-12">
              <div>
                <h4 className="font-black text-xl md:text-2xl tracking-tighter leading-none">
                  PHRONT<span className="text-slate-500">.SYSTEMS</span>
                </h4>
                <div className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] mt-1 font-bold">
                  Resguardo de Activos v3.6
                </div>
              </div>
            </div>

            {/* Data Grid */}
            <div className="grid grid-cols-2 gap-y-2 md:gap-y-3 text-[10px] md:text-[11px] mb-6">
              <div className="text-slate-500 font-bold uppercase">Ticket_ID</div>
              <div className="text-right font-black font-mono tracking-widest bg-black text-white px-2 py-0.5 rounded ml-auto">
                {bet.ticket_code || 'N/A'}
              </div>

              <div className="text-slate-500 font-bold uppercase">Draw_Vector</div>
              <div className="text-right font-black uppercase truncate">
                {bet.draw_id || 'GENERAL'}
              </div>

              <div className="text-slate-500 font-bold uppercase">Timestamp</div>
              <div className="text-right font-bold text-[9px] md:text-[11px]">
                {formatDate(bet.created_at)}
              </div>
            </div>

            {/* Main Numbers & Stats */}
            <div
              className={`border-y-2 border-dashed border-slate-400 py-4 md:py-6 mb-6 flex flex-col items-center gap-4 transition-colors duration-500 ${isWin ? 'bg-green-100/50' : ''}`}
            >
              <div className="text-center w-full">
                <div className="text-[8px] md:text-[9px] text-slate-500 uppercase font-black mb-1">
                  Vector Seleccionado
                </div>
                <div
                  className={`text-5xl md:text-7xl font-black tracking-tighter leading-none ${isWin ? 'text-green-600 drop-shadow-sm' : ''}`}
                >
                  {bet.numbers}
                </div>
              </div>

              <div className="w-full h-px bg-slate-300"></div>

              {/* GRID DE VALORES FINANCIEROS (NUEVO DISEÑO 3 COLUMNAS) */}
              <div className="grid grid-cols-3 w-full gap-2 px-1">
                <div className="text-center border-r border-slate-300">
                  <div className="text-[7px] md:text-[8px] text-slate-500 uppercase font-black mb-1">
                    Inversión
                  </div>
                  <div className="text-sm md:text-lg font-black">
                    {formatCurrency(bet.amount_bigint)}
                  </div>
                </div>
                <div className="text-center border-r border-slate-300">
                  <div className="text-[7px] md:text-[8px] text-emerald-600 uppercase font-black mb-1">
                    Premio Ganado
                  </div>
                  <div
                    className={`text-sm md:text-lg font-black ${isWin ? 'text-green-600 animate-pulse' : 'text-slate-700'}`}
                  >
                    {formatCurrency(totalPrize)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[7px] md:text-[8px] text-slate-500 uppercase font-black mb-1">
                    Factor
                  </div>
                  <div
                    className={`text-[9px] md:text-[10px] font-black uppercase leading-tight ${isWin ? 'text-green-600' : 'text-slate-700'}`}
                  >
                    {multiplier}x
                  </div>
                </div>
              </div>
            </div>

            {/* LIQUIDACIÓN DE PREMIO: Claridad absoluta */}
            {isWin ? (
              <div className="mb-6 p-4 md:p-5 bg-black text-white rounded-2xl border-2 border-green-500 shadow-[0_5px_30px_rgba(34,197,94,0.4)] animate-pulse relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-30">
                  <i className="fas fa-gem text-3xl"></i>
                </div>
                <div className="text-[9px] md:text-[10px] text-green-400 uppercase font-black tracking-[0.25em] mb-1">
                  LIQUIDACIÓN ACREDITADA
                </div>
                <div className="text-2xl md:text-4xl font-black font-mono tracking-tighter text-white">
                  {formatCurrency(totalPrize)}
                </div>
                <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <span className="text-[8px] font-bold text-green-500 uppercase tracking-widest">
                    Saldo disponible en bóveda
                  </span>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-slate-200 border-2 border-slate-300 rounded-2xl text-center">
                <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                  Resultado Esperado
                </div>
                <div className="text-xl font-bold opacity-40">PENDIENTE</div>
              </div>
            )}

            {/* Footer Info */}
            <div className="text-[10px] flex flex-col md:flex-row justify-between items-end gap-4">
              <div className="w-full md:w-auto">
                <div className="text-slate-500 font-black uppercase text-[8px] tracking-widest mb-1">
                  Status Operativo
                </div>
                <div
                  className={`font-black text-sm md:text-base px-3 py-1.5 rounded-lg border-2 text-center ${
                    bet.status === 'WON'
                      ? 'bg-green-600 text-white border-green-700 shadow-lg'
                      : bet.status === 'PENDING'
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-slate-400 text-slate-700 border-slate-500 grayscale'
                  }`}
                >
                  {bet.status === 'WON'
                    ? 'ACIERTO'
                    : bet.status === 'PENDING'
                      ? 'EN PROCESO'
                      : 'NO PREMIADO'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[8px] text-slate-400 font-mono font-bold">
                  SHA-AUTH: {bet.id.slice(-12).toUpperCase()}
                </div>
              </div>
            </div>

            {/* CSS BARCODE */}
            <div className="h-10 md:h-14 w-full mt-6 bg-[repeating-linear-gradient(90deg,black,black_2px,transparent_2px,transparent_5px,black_5px,black_6px,transparent_6px,transparent_9px)] opacity-90 mix-blend-multiply"></div>
            <div className="text-center text-[8px] md:text-[9px] font-mono tracking-[0.8em] mt-2 font-black">
              PHRONT_VERIFIED_TICKET
            </div>
          </div>

          {/* Jagged Edge Bottom */}
          <div
            className="absolute bottom-0 left-0 w-full h-1 bg-transparent"
            style={{
              backgroundImage:
                'linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)',
              backgroundSize: '10px 10px',
              backgroundPosition: '0 100%',
            }}
          ></div>
        </div>

        <div className="text-center mt-6">
          <p className="text-white/40 text-[9px] md:text-[10px] font-mono uppercase tracking-[0.4em]">
            Protocolo Maestro de Seguridad de Activos
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
