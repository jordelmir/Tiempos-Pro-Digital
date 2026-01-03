
import React, { ReactNode, useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole } from '../types';
import { formatCurrency, ROUTES } from '../constants';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/edgeApi';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

interface LayoutProps {
  children?: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut, fetchUser } = useAuthStore();
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
    }, 800);
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  if (!user) return <>{children}</>;

  return (
    <div className={`min-h-screen flex flex-col text-slate-200 font-sans selection:bg-[#39FF14] selection:text-black bg-[#02040a]`}>
      
      {isShuttingDown && (
          <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
              <div className="absolute top-0 left-0 w-full bg-black animate-[closeVert_0.4s_ease-in_forwards] z-20"></div>
              <div className="absolute bottom-0 left-0 w-full bg-black animate-[closeVert_0.4s_ease-in_forwards] z-20"></div>
              <div className="absolute z-30 bg-white shadow-[0_0_50px_white] animate-[killLight_0.5s_ease-out_0.35s_forwards] rounded-full opacity-0"></div>
          </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#050a14] border-2 border-cyber-danger rounded-2xl max-w-sm w-full shadow-[0_0_50px_rgba(255,0,60,0.3)] text-center relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-1 bg-cyber-danger/50 shadow-[0_0_15px_#ff003c] animate-[scanline_1.5s_linear_infinite]"></div>
                 <div className="w-16 h-16 rounded-full bg-cyber-danger/10 flex items-center justify-center mx-auto mb-6 border-2 border-cyber-danger group-hover:scale-110 transition-transform shadow-neon-red mt-8">
                     <i className="fas fa-power-off text-3xl text-cyber-danger"></i>
                 </div>
                 <h3 className="text-xl font-display font-bold text-white mb-2 uppercase tracking-widest text-shadow-red">¿Desconectar?</h3>
                 <p className="text-cyber-danger/70 text-xs font-mono mb-8">Se cerrará el túnel seguro con el Núcleo.</p>
                 <div className="flex gap-4 p-6 border-t border-white/10 bg-black/40">
                     <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider transition-colors">Cancelar</button>
                     <button onClick={confirmSignOut} className="flex-1 py-3 rounded-lg bg-cyber-danger text-black font-bold uppercase text-xs tracking-wider shadow-neon-red hover:bg-white transition-all">Apagar</button>
                 </div>
            </div>
        </div>
      )}

      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-[#050a14]/95 backdrop-blur-2xl border-b border-white/5 shadow-2xl">
        <div className="max-w-8xl mx-auto h-20 md:h-24 px-4 flex items-center justify-between gap-4">
            
            <div className="flex items-center gap-4 lg:gap-8">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate(ROUTES.DASHBOARD)}>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-cyber-neon/10 rounded-xl border border-cyber-neon/30 flex items-center justify-center shadow-neon-cyan group-hover:rotate-12 transition-transform">
                        <AnimatedIconUltra profile={{ animation: 'spin3d', theme: 'neon', speed: 4 }}>
                            <i className="fas fa-cube text-cyber-neon text-xl md:text-2xl"></i>
                        </AnimatedIconUltra>
                    </div>
                    <div className="hidden xs:block">
                        <h1 className="text-xl md:text-2xl font-display font-black italic tracking-tighter text-white leading-none">TIEMPOS<span className="text-cyber-neon">PRO</span></h1>
                        <p className="text-[7px] md:text-[8px] font-mono text-slate-500 uppercase tracking-[0.4em] font-bold">Node_v3.4_Master</p>
                    </div>
                </div>

                <nav className="hidden lg:flex items-center gap-1.5">
                    <NavItem icon="fa-chart-pie" label="Panel" active={isActive(ROUTES.DASHBOARD)} onClick={() => navigate(ROUTES.DASHBOARD)} color="cyber-neon" />
                    {isAdmin && (
                        <>
                            <NavItem icon="fa-dna" label="Auditoría" active={isActive(ROUTES.AUDIT)} onClick={() => navigate(ROUTES.AUDIT)} color="cyber-purple" />
                            <NavItem icon="fa-server" label="Bóveda" active={isActive(ROUTES.LEDGER)} onClick={() => navigate(ROUTES.LEDGER)} color="cyber-success" />
                        </>
                    )}
                </nav>
            </div>

            <div className="flex-1 flex justify-center max-w-lg px-2 md:px-0">
                <div className="relative w-full bg-black/60 border border-white/10 rounded-2xl md:rounded-[2rem] p-2 flex items-center justify-center shadow-inner overflow-hidden group/hud">
                    <div className="flex flex-col items-center justify-center">
                        <span className="text-[7px] md:text-[9px] font-mono text-slate-500 uppercase tracking-[0.4em] font-black mb-1">Status Patrimonial</span>
                        <div className="flex items-baseline gap-2 group/balance cursor-default">
                             <span className="text-sm md:text-lg font-display text-cyber-neon/40 font-black">₡</span>
                             <h2 className="text-xl md:text-3xl font-display font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                                {formatCurrency(user.balance_bigint).replace('₡', '').trim()}
                             </h2>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                <div className={`hidden md:flex flex-col items-end px-4 py-1.5 rounded-xl border transition-all ${
                    isAdmin ? 'border-cyber-emerald/40 bg-cyber-emerald/5 text-cyber-emerald shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
                    isVendor ? 'border-cyber-purple/40 bg-cyber-purple/5 text-cyber-purple shadow-[0_0_15px_rgba(188,19,254,0.1)]' :
                    'border-cyber-blue/40 bg-cyber-blue/5 text-cyber-blue shadow-[0_0_15px_rgba(36,99,235,0.1)]'
                }`}>
                    <span className="text-[7px] font-mono uppercase font-black tracking-widest opacity-60">Status Nodo</span>
                    <span className="text-[10px] font-display font-black uppercase tracking-wider">{isAdmin ? 'SUPER ADMIN' : user.role}</span>
                </div>

                <button onClick={() => setShowLogoutConfirm(true)} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl bg-cyber-danger/10 text-cyber-danger border border-cyber-danger/30 hover:bg-cyber-danger hover:text-black transition-all shadow-neon-red">
                    <i className="fas fa-power-off text-lg"></i>
                </button>

                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl border border-cyber-neon/40 bg-black/40 text-white shadow-neon-cyan">
                    <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
                </button>
            </div>
        </div>

        {/* MOBILE MENU: SOLID HIGH-CONTRAST THEMATIC NODES */}
        {isMobileMenuOpen && (
           <div className="fixed inset-0 top-20 bg-black z-40 p-6 animate-in slide-in-from-top-4 duration-300 lg:hidden flex flex-col">
                <div className="space-y-4">
                    <MobileNavItem label="Panel Principal" icon="fa-chart-pie" color="cyan" onClick={() => { navigate(ROUTES.DASHBOARD); setIsMobileMenuOpen(false); }} active={isActive(ROUTES.DASHBOARD)} />
                    {isAdmin && (
                      <>
                          <MobileNavItem label="Auditoría Forense" icon="fa-dna" color="purple" onClick={() => { navigate(ROUTES.AUDIT); setIsMobileMenuOpen(false); }} active={isActive(ROUTES.AUDIT)} />
                          <MobileNavItem label="Bóveda Central" icon="fa-server" color="green" onClick={() => { navigate(ROUTES.LEDGER); setIsMobileMenuOpen(false); }} active={isActive(ROUTES.LEDGER)} />
                      </>
                    )}
                </div>
                
                <div className="mt-auto mb-10 pt-8 border-t border-white/10 space-y-6">
                    <div className="bg-black p-8 rounded-[2.5rem] border-2 border-[#39FF14] text-center shadow-[0_0_25px_rgba(57,255,20,0.1)] relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#39FF14] opacity-40 animate-[scanline_2s_linear_infinite]"></div>
                        <span className="text-[10px] font-mono text-slate-500 block mb-2 uppercase tracking-[0.4em] font-black">Patrimonio del Nodo</span>
                        <span className="text-4xl font-display font-black text-[#39FF14] drop-shadow-[0_0_15px_#39FF14]">{formatCurrency(user.balance_bigint)}</span>
                    </div>

                    <button onClick={() => { setShowLogoutConfirm(true); setIsMobileMenuOpen(false); }} className="w-full py-6 bg-cyber-danger text-black border-2 border-cyber-danger rounded-2xl font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-4 shadow-[0_0_40px_rgba(255,0,60,0.2)] hover:bg-white transition-all active:scale-95">
                        <i className="fas fa-power-off text-lg"></i> CERRAR_SISTEMA
                    </button>
                    
                    <div className="text-center opacity-30">
                        <p className="text-[8px] font-mono text-white uppercase tracking-[0.8em]">PHRONT_MAESTRO_THEMATIC_SOLID</p>
                    </div>
                </div>
           </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-8xl mx-auto pt-24 md:pt-32 px-4 pb-20 relative z-10">
          {children}
      </main>

      <footer className="fixed bottom-0 left-0 w-full h-10 bg-[#02040a] border-t border-white/5 z-50 flex items-center overflow-hidden">
         <div className="px-4 bg-cyber-neon/10 h-full flex items-center border-r border-white/5 z-10">
             <div className="w-2 h-2 bg-cyber-success rounded-full animate-pulse mr-2 shadow-[0_0_8px_lime]"></div>
             <span className="text-[10px] font-mono font-black text-cyber-neon tracking-widest">LIVE</span>
         </div>
         <div className="flex-1 overflow-hidden relative">
             <div className="absolute whitespace-nowrap animate-scroll-ticker flex gap-12 items-center text-[10px] font-mono text-slate-500 uppercase tracking-widest top-2.5">
                 <span><i className="fas fa-server text-cyber-purple mr-2"></i> Latencia: 14ms</span>
                 <span><i className="fas fa-shield-alt text-cyber-success mr-2"></i> Integridad: SHA-256 Verificada</span>
                 <span><i className="fas fa-user-shield text-cyber-blue mr-2"></i> Actor: {user.name}</span>
                 <span><i className="fas fa-satellite-dish text-yellow-500 mr-2"></i> Enlace: Directo Núcleo</span>
             </div>
         </div>
         <div className="px-4 h-full flex items-center border-l border-white/5 bg-black z-10 text-[9px] text-slate-600 font-mono font-black italic">
             PHRONT_MAESTRO_v3.4
         </div>
      </footer>

      <style>{`
        @keyframes closeVert { 0% { height: 0; } 100% { height: 50.5vh; } }
        @keyframes killLight { 0% { width: 100vw; height: 2px; opacity: 1; } 40% { width: 100vw; height: 4px; opacity: 1; } 60% { width: 100vw; height: 2px; opacity: 1; } 80% { width: 4px; height: 4px; opacity: 1; } 100% { width: 0; height: 0; opacity: 0; } }
      `}</style>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick, color }: any) => {
  const colors: any = { 'cyber-neon': 'shadow-[0_0_15px_#00f0ff]', 'cyber-purple': 'shadow-[0_0_15px_#bc13fe]', 'cyber-success': 'shadow-[0_0_15px_#0aff60]' };
  return (
    <button onClick={onClick} className={`relative px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 border-2 ${active ? `bg-white text-black border-white ${colors[color]}` : 'bg-transparent text-slate-500 border-white/5 hover:text-white hover:bg-white/5 hover:border-white/20'}`}>
       <div className="flex items-center gap-2.5"><i className={`fas ${icon} ${active ? 'text-black' : ''}`}></i>{label}</div>
    </button>
  );
};

const MobileNavItem = ({ label, icon, onClick, active, color }: any) => {
    const themes: any = {
        cyan: {
            active: "bg-cyber-neon text-black border-cyber-neon shadow-[0_0_30px_#00f0ff]",
            idle: "bg-black border-cyber-neon/30 text-cyber-neon hover:border-cyber-neon"
        },
        purple: {
            active: "bg-cyber-purple text-black border-cyber-purple shadow-[0_0_30px_#bc13fe]",
            idle: "bg-black border-cyber-purple/30 text-cyber-purple hover:border-cyber-purple"
        },
        green: {
            active: "bg-[#39FF14] text-black border-[#39FF14] shadow-[0_0_30px_#39FF14]",
            idle: "bg-black border-[#39FF14]/30 text-[#39FF14] hover:border-[#39FF14]"
        }
    };
    
    const theme = themes[color] || themes.cyan;

    return (
       <button onClick={onClick} className={`w-full flex items-center gap-6 px-8 py-5 rounded-2xl transition-all duration-300 border-2 ${active ? theme.active + ' scale-[1.02]' : theme.idle}`}>
           <i className={`fas ${icon} text-xl`}></i>
           <span className="font-display font-black uppercase tracking-[0.25em] text-sm">{label}</span>
           {active && <i className="fas fa-chevron-right ml-auto animate-pulse"></i>}
       </button>
    );
};
