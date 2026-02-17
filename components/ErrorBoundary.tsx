import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary class component to catch rendering errors in the component tree.
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Initialize state directly as a class property for better TypeScript inference
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  /**
   * Static lifecycle method to update state on render error.
   */
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  /**
   * Lifecycle method to handle error side effects and update state trace.
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-red-500 font-mono p-8 flex flex-col items-center justify-center relative overflow-hidden selection:bg-red-500 selection:text-black">
          {/* Background Noise */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] bg-repeat opacity-20 pointer-events-none"></div>
          
          <div className="max-w-3xl w-full border-2 border-red-600 bg-[#0a0000] p-8 rounded-lg shadow-[0_0_50px_rgba(220,38,38,0.5)] relative z-10 animate-in zoom-in duration-300">
            <div className="flex items-center gap-4 mb-6 border-b border-red-900/50 pb-4">
              <div className="w-16 h-16 bg-red-600 text-black flex items-center justify-center text-4xl font-bold animate-pulse">
                <i className="fas fa-biohazard"></i>
              </div>
              <div>
                <h1 className="text-4xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_10px_red]">SYSTEM FAILURE</h1>
                <p className="text-xs text-red-400 uppercase tracking-[0.5em]">KERNEL PANIC // RUNTIME EXCEPTION</p>
              </div>
            </div>

            <div className="mb-8 p-4 bg-red-950/20 border border-red-900/50 rounded overflow-auto max-h-60">
              <p className="text-xl font-bold mb-2 text-white">Error Trace:</p>
              <pre className="text-xs text-red-300 whitespace-pre-wrap break-all">
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-red-600 hover:bg-white hover:text-red-600 text-black font-black uppercase py-4 rounded transition-all shadow-[0_0_20_rgba(220,38,38,0.4)] tracking-widest"
              >
                REINICIAR SISTEMA (HARD RELOAD)
              </button>
              <button 
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="px-6 border border-red-600 text-red-600 hover:bg-red-600 hover:text-black font-bold uppercase py-4 rounded transition-all tracking-widest"
              >
                PURGAR CACHE
              </button>
            </div>
          </div>
          
          <div className="absolute bottom-8 text-[10px] text-red-900 uppercase tracking-[1em] animate-pulse">
            PHRONT MAESTRO PROTECTION PROTOCOL
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}