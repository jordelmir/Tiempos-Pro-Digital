// context/AnimationSyncContext.tsx
'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

type SyncContextType = {
  enabled: boolean;
  masterPhase: number; // 0..1
  setEnabled: (v: boolean) => void;
  setTempo: (bpm: number) => void;
  tempo: number;
};

const AnimationSyncContext = createContext<SyncContextType | null>(null);

export function AnimationSyncProvider({ children }: { children?: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const [tempo, setTempo] = useState(60); // BPM default
  const [masterPhase, setMasterPhase] = useState(0);
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function tick(t: number) {
      if (!last.current) last.current = t;
      const dt = t - last.current;
      last.current = t;
      // convert tempo to period ms
      const period = (60 / tempo) * 1000;
      setMasterPhase((p) => {
        const next = p + dt / period;
        return next % 1;
      });
      raf.current = requestAnimationFrame(tick);
    }

    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [tempo, enabled]);

  return (
    <AnimationSyncContext.Provider value={{ enabled, masterPhase, setEnabled, setTempo, tempo }}>
      {children}
    </AnimationSyncContext.Provider>
  );
}

export const useAnimationSync = () => {
  const ctx = useContext(AnimationSyncContext);
  if (!ctx) throw new Error("useAnimationSync must be used inside AnimationSyncProvider");
  return ctx;
};