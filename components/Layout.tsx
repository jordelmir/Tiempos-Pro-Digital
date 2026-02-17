
import React, { ReactNode, useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole } from '../types';
import { formatCurrency, ROUTES } from '../constants';
import { useNavigate, useLocation } from 'react-router-dom';
import AnimatedIconUltra from './ui/AnimatedIconUltra';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children?: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);

  const isAdmin = user?.role === UserRole.SuperAdmin;
  const isVendor = user?.role === UserRole.Vendedor;

  const confirmSignOut = async () => {
    setShowLogoutConfirm(false);
    setIsShuttingDown(true);
    setTimeout(async () => {
        await signOut();
        setIsShuttingDown(false);
        navigate(ROUTES.LOGIN);
    }, 1200);
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col text-slate-200 font-sans selection:bg-cyber-neon selection:text-black bg-transparent relative z-10 overflow-x-hidden">
      
      {isShuttingDown && (
          <div className="fixed inset-0 z-[10000] pointer-events-none flex items-center justify-center bg-black">
              <div className="w-full h-1 bg-white shadow-[0_0_100px_white] animate-[terminal_line_0.4s_ease-in-out_forwards]"></div>
              <div className="absolute inset-0 bg-black animate-[fade_in_0.5s_forwards]"></div>
          </div>
      )}

      <AnimatePresence>
      {showLogoutConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#050a14] border-2 border-cyber-danger rounded-[3.5rem] max-w-md w-full shadow-[0_0_150px_rgba(255,0,60,0.5)] text-center p-12 relative overflow-hidden group mx-4">
                 <div className="absolute top-0 left-0 w-full h-1.5 bg-cyber-danger/50 shadow-[0_0_20px_#ff003c] animate-[scanline_1.5s_linear_infinite]"></div>
                 <div className="w-24 h-24 rounded-full bg-cyber-danger/10 flex items-center justify-center mx-auto mb-10 border-2 border-cyber-danger shadow-neon-red group-hover:scale-110 transition-transform duration-500">
                     <i className="fas fa-power-off text-5xl text-cyber-danger"></i>
                 </div>
                 <h3 className="text-3xl font-display font-black text-white mb-4 uppercase tracking-[0.4em]">¿TERMINAR?</h3>
                 <p className="text-cyber-danger/70 text-xs font-mono mb-12 uppercase tracking-[0.3em] leading-relaxed">Se cerrará el enlace neuronal con el Núcleo Maestro.</p>
                 <div className="flex gap-6">
                     <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-5 rounded-2xl border-2 border-slate-800 hover:bg-slate-800 text-slate-400 font-bold uppercase text-xs tracking-widest transition-all">ABORTAR</button>
                     <button onClick={confirmSignOut} className="flex-1 py-5 rounded-2xl bg-cyber-danger text-black font-black uppercase text-xs tracking-widest shadow-neon-red hover:bg-white transition-all active:scale-95">APAGAR</button>
                 </div>
            </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <header className="fixed top-0 left-0 right-0 z-50 w-full h-24 md:h-28 bg-[#050a14]/80 backdrop-blur-[40px] border-b border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-[1800px] mx-auto h-full px-4 md:px-8 flex items-center justify-between relative">
            
            {/* LEFT ZONE: BRAND & MAIN NAV (Anchored Left) */}
            <div className="flex items-center gap-4 lg:gap-8 flex-shrink-0 z-10">
                <div className="flex items-center gap-3 md:gap-5 cursor-pointer group" onClick={() => navigate(ROUTES.DASHBOARD)}>
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-black rounded-xl md:rounded-2xl border-2 border-cyber-neon/40 flex items-center justify-center shadow-neon-cyan group-hover:rotate-12 transition-all duration-700 relative overflow-hidden">
                        <AnimatedIconUltra profile={{ animation: 'spin3d', theme: 'neon', speed: 5 }}>
                            <i className="fas fa-microchip text-cyber-neon text-xl md:text-3xl"></i>
                        </AnimatedIconUltra>
                    </div>
                    <div className="hidden xs:block">
                        <h1 className="text-lg md:text-2xl font-display font-black italic tracking-tighter text-white leading-none uppercase">TIEMPOS<span className="text-cyber-neon text-glow-cyan">PRO</span></h1>
                        <p className="text-[7px] md:text-[8px] font-mono text-slate-500 uppercase tracking-[0.4em] font-black mt-1">Nucleo_v3.9_Elite</p>
                    </div>
                </div>

                <nav className="hidden 2xl:flex items-center gap-2">
                    <NavItem icon="fa-terminal" label="CONSOLA" active={isActive(ROUTES.DASHBOARD)} onClick={() => navigate(ROUTES.DASHBOARD)} />
                    {isAdmin && (
                        <>
                            <NavItem icon="fa-fingerprint" label="AUDITORÍA" active={isActive(ROUTES.AUDIT)} onClick={() => navigate(ROUTES.AUDIT)} />
                            <NavItem icon="fa-piggy-bank" label="BÓVEDA" active={isActive(ROUTES.LEDGER)} onClick={() => navigate(ROUTES.LEDGER)} />
                        </>
                    )}
                </nav>
            </div>

            {/* CENTER ZONE: CAPITAL HUB (Absolute Center Fixed) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center justify-center pointer-events-none z-0">
                <div className="bg-black/60 border border-white/10 rounded-full px-6 py-2 flex flex-col items-center shadow-inner group/capital cursor-default pointer-events-auto min-w-[280px]">
                    <span className="text-[7px] md:text-[8px] font-mono text-slate-500 uppercase tracking-[0.5em] font-black mb-0.5">Liquidez de Nodo_Core</span>
                    <div className="flex items-center gap-2">
                         <span className="text-lg font-display text-cyber-neon font-black opacity-40">₡</span>
                         <h2 className="text-xl md:text-3xl font-display font-black text-white tracking-tighter drop-shadow-2xl">
                            {formatCurrency(user.balance_bigint).replace('₡', '').trim()}
                         </h2>
                    </div>
                </div>
            </div>

            {/* RIGHT ZONE: IDENTITY & ACTIONS (Anchored Right) */}
            <div className="flex items-center gap-3 md:gap-5 flex-shrink-0 z-10">
                <div className={`hidden sm:flex flex-col items-end px-3 md:px-5 py-1.5 md:py-2.5 rounded-xl md:rounded-2xl border-2 transition-all duration-700 ${
                    isAdmin ? 'border-cyber-emerald/30 bg-cyber-emerald/5 text-cyber-emerald shadow-neon-green' :
                    isVendor ? 'border-cyber-purple/30 bg-cyber-purple/5 text-cyber-purple shadow-neon-purple' :
                    'border-cyber-blue/30 bg-cyber-blue/5 text-cyber-blue shadow-neon-blue'
                }`}>
                    <span className="text-[7px] md:text-[8px] font-mono uppercase font-black tracking-[0.4em] opacity-40 leading-none mb-1">Jerarquía</span>
                    <span className="text-[9px] md:text-[11px] font-display font-black uppercase tracking-widest">{isAdmin ? 'ADMIN ROOT' : isVendor ? 'VENDEDOR ELITE' : 'OPERADOR'}</span>
                </div>

                <button onClick={() => setShowLogoutConfirm(true)} className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-xl md:rounded-2xl bg-cyber-danger/10 text-cyber-danger border-2 border-cyber-danger/30 hover:bg-cyber-danger hover:text-black transition-all shadow-neon-red active:scale-90 group/logout">
                    <i className="fas fa-power-off text-lg md:text-xl group-hover:rotate-90 transition-transform duration-500"></i>
                </button>

                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="2xl:hidden w-10 h-10 flex items-center justify-center rounded-xl border-2 border-cyber-neon/40 bg-black text-white shadow-neon-cyan">
                    <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
                </button>
            </div>
        </div>
      </header>

      <AnimatePresence>
      {isMobileMenuOpen && (
           <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed inset-0 top-24 bg-black/98 backdrop-blur-[50px] z-[60] p-8 2xl:hidden flex flex-col">
                <div className="space-y-4">
                    <MobileNavItem label="CONSOLA MAESTRA" icon="fa-terminal" onClick={() => { navigate(ROUTES.DASHBOARD); setIsMobileMenuOpen(false); }} active={isActive(ROUTES.DASHBOARD)} />
                    {isAdmin && (
                      <>
                          <MobileNavItem label="AUDITORÍA FORENSE" icon="fa-fingerprint" onClick={() => { navigate(ROUTES.AUDIT); setIsMobileMenuOpen(false); }} active={isActive(ROUTES.AUDIT)} />
                          <MobileNavItem label="BÓVEDA CENTRAL" icon="fa-piggy-bank" onClick={() => { navigate(ROUTES.LEDGER); setIsMobileMenuOpen(false); }} active={isActive(ROUTES.LEDGER)} />
                      </>
                    )}
                </div>
                <div className="mt-auto mb-16 pt-12 border-t border-white/10 text-center">
                    <span className="text-[9px] font-mono text-slate-600 block mb-3 uppercase tracking-[1em] font-black">Capital Activo</span>
                    <span className="text-4xl font-display font-black text-cyber-neon drop-shadow-[0_0_20px_#00f0ff]">{formatCurrency(user.balance_bigint)}</span>
                </div>
           </motion.div>
      )}
      </AnimatePresence>

      <main className="flex-1 w-full max-w-[1800px] mx-auto pt-32 md:pt-40 px-4 md:px-8 pb-32 relative z-10">
          {children}
      </main>

      <footer className="fixed bottom-0 left-0 w-full h-12 bg-black/90 backdrop-blur-3xl border-t border-white/10 z-[70] flex items-center overflow-hidden">
         <div className="px-4 md:px-6 bg-cyber-neon h-full flex items-center border-r border-white/10 z-10">
             <div className="w-2 h-2 bg-black rounded-full animate-ping mr-3"></div>
             <span className="text-[8px] md:text-[10px] font-mono font-black text-black tracking-[0.4em] uppercase">LINK_LIVE</span>
         </div>
         <div className="flex-1 overflow-hidden relative">
             <div className="absolute whitespace-nowrap animate-scroll-ticker flex gap-20 items-center text-[9px] font-mono text-slate-500 uppercase tracking-[0.5em] top-3">
                 <span><i className="fas fa-server text-cyber-purple mr-3"></i> LATENCIA: 0.04MS</span>
                 <span><i className="fas fa-shield-halved text-cyber-success mr-3"></i> INTEGRIDAD: 100%</span>
                 <span><i className="fas fa-brain text-cyber-neon mr-3"></i> IA_SIPR: OPERATIVA</span>
                 <span><i className="fas fa-user-shield text-cyber-blue mr-3"></i> OPERADOR: {user.name}</span>
             </div>
         </div>
         <div className="px-6 h-full hidden md:flex items-center border-l border-white/10 bg-black z-10 text-[9px] text-slate-600 font-mono font-black tracking-widest uppercase italic">
             PHRONT_OS_V3.9
         </div>
      </footer>

      <style>{`
        @keyframes terminal_line { 0% { width: 0; } 100% { width: 100vw; } }
        @keyframes fade_in { 0% { background: transparent; } 100% { background: black; } }
        .animate-scroll-ticker { animation: ticker 60s linear infinite; }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => {
  return (
    <button onClick={onClick} className={`relative px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 border-2 ${active ? `bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]` : `bg-transparent text-slate-500 border-white/5 hover:text-white hover:border-white/20`}`}>
       <div className="flex items-center gap-2"><i className={`fas ${icon}`}></i>{label}</div>
    </button>
  );
};

const MobileNavItem = ({ label, icon, onClick, active }: any) => {
    return (
       <button onClick={onClick} className={`w-full flex items-center gap-6 px-8 py-5 rounded-2xl transition-all duration-500 border-2 ${active ? "bg-white text-black border-white shadow-xl" : "bg-black/40 border-white/10 text-slate-500"}`}>
           <i className={`fas ${icon} text-xl`}></i>
           <span className="font-display font-black uppercase tracking-[0.2em] text-sm">{label}</span>
           {active && <i className="fas fa-chevron-right ml-auto animate-pulse"></i>}
       </button>
    );
};
