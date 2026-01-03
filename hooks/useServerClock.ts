
import { useState, useEffect, useRef } from 'react';
import { api } from '../services/edgeApi';
import { DrawTime } from '../types';

export type SalesStatus = 'OPEN' | 'WARNING' | 'CLOSED';

export function useServerClock() {
  const [serverTime, setServerTime] = useState<Date>(new Date());
  const [nextDraw, setNextDraw] = useState<DrawTime | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // Milliseconds
  const [status, setStatus] = useState<SalesStatus>('CLOSED');
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  // Use refs to track drift without re-rendering loops
  const driftRef = useRef<number>(0);
  const lastSyncRef = useRef<number>(0);

  // Configuration (could come from API)
  const CUTOFF_TIMES = {
      MEDIODIA: { hour: 12, minute: 55 },
      TARDE: { hour: 16, minute: 30 },
      NOCHE: { hour: 19, minute: 30 }
  };

  // 1. Sync with Server (Heartbeat)
  const syncClock = async () => {
      if (!navigator.onLine) {
          setIsOffline(true);
          return;
      }

      try {
          const start = Date.now();
          const res = await api.getServerTime();
          const end = Date.now();
          const latency = (end - start) / 2;

          if (res.data) {
              const serverNow = new Date(res.data.server_time).getTime();
              // Calculate Drift: Server Time + Latency - Local System Time
              driftRef.current = serverNow + latency - Date.now();
              lastSyncRef.current = Date.now();
              setIsOffline(false);
              setLoading(false);
          }
      } catch (e) {
          console.error("Clock Sync Failed", e);
          setIsOffline(true);
      }
  };

  // Initial Sync + Periodic Re-sync
  useEffect(() => {
      syncClock();
      const syncInterval = setInterval(syncClock, 30000); // Every 30s
      
      window.addEventListener('online', syncClock);
      window.addEventListener('offline', () => setIsOffline(true));

      return () => {
          clearInterval(syncInterval);
          window.removeEventListener('online', syncClock);
          window.removeEventListener('offline', () => setIsOffline(true));
      };
  }, []);

  // 2. Local Tick (High Precision)
  useEffect(() => {
      const tick = () => {
          // Adjusted Current Time
          const now = new Date(Date.now() + driftRef.current);
          setServerTime(now);

          // Calculate Next Cutoff
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const currentTotalMinutes = currentHour * 60 + currentMinute;

          let targetTime = new Date(now);
          let activeDraw: DrawTime | null = null;

          const mediodiaMins = CUTOFF_TIMES.MEDIODIA.hour * 60 + CUTOFF_TIMES.MEDIODIA.minute;
          const tardeMins = CUTOFF_TIMES.TARDE.hour * 60 + CUTOFF_TIMES.TARDE.minute;
          const nocheMins = CUTOFF_TIMES.NOCHE.hour * 60 + CUTOFF_TIMES.NOCHE.minute;

          if (currentTotalMinutes < mediodiaMins) {
              targetTime.setHours(CUTOFF_TIMES.MEDIODIA.hour, CUTOFF_TIMES.MEDIODIA.minute, 0, 0);
              activeDraw = DrawTime.MEDIODIA;
          } else if (currentTotalMinutes < tardeMins) {
              targetTime.setHours(CUTOFF_TIMES.TARDE.hour, CUTOFF_TIMES.TARDE.minute, 0, 0);
              activeDraw = DrawTime.TARDE;
          } else if (currentTotalMinutes < nocheMins) {
              targetTime.setHours(CUTOFF_TIMES.NOCHE.hour, CUTOFF_TIMES.NOCHE.minute, 0, 0);
              activeDraw = DrawTime.NOCHE;
          } else {
              // All draws passed for today
              activeDraw = null; 
          }

          setNextDraw(activeDraw);

          if (activeDraw) {
              const diff = targetTime.getTime() - now.getTime();
              setTimeRemaining(Math.max(0, diff));

              if (diff <= 0) {
                  setStatus('CLOSED');
              } else if (diff <= 120000) { // 2 Minutes
                  setStatus('WARNING');
              } else {
                  setStatus('OPEN');
              }
          } else {
              setStatus('CLOSED');
              setTimeRemaining(0);
          }
      };

      const interval = setInterval(tick, 1000);
      tick(); // Immediate call

      return () => clearInterval(interval);
  }, [loading]); // Re-bind if loading changes, though mainly relies on ref

  return {
      serverTime,
      nextDraw,
      timeRemaining,
      status,
      isOffline,
      loading
  };
}
