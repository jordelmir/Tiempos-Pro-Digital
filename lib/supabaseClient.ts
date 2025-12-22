import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { AuditSeverity, AuditEventType, PurgeTarget, PurgeAnalysis } from '../types';

// Detect if we are using default/placeholder credentials
const isDemo =
  SUPABASE_URL.includes('your-project') || !SUPABASE_URL || SUPABASE_URL === 'https://demo.local';

let client: SupabaseClient;

const MOCK_STORAGE_KEY = 'tiempospro_demo_session';
const DB_STORAGE_KEYS = {
  BETS: 'tiempospro_db_bets',
  AUDIT: 'tiempospro_db_audit',
  RESULTS: 'tiempospro_db_results',
  LEDGER: 'tiempospro_db_ledger',
  USERS: 'tiempospro_db_users',
  SETTINGS: 'tiempospro_db_settings',
  LIMITS: 'tiempospro_db_limits',
};

// Safe Persistence
const load = (key: string, def: any) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : def;
  } catch {
    return def;
  }
};
const save = (key: string, val: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Quota Exceeded');
  }
};

// --- CORE MOCK DATA ---
const MOCK_ADMIN_PROFILE = {
  id: 'app-user-001',
  auth_uid: 'mock-auth-uid-001',
  email: 'admin@tiempos.local',
  name: 'Admin PHRONT (Demo)',
  role: 'SuperAdmin',
  cedula: '1-1111-1111',
  phone: '+506 8888-8888',
  balance_bigint: 1250000000,
  currency: 'CRC',
  status: 'Active',
  issuer_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const generateLedgerHistory = () => {
  const txs: any[] = [];
  const now = new Date();
  let currentBalance = 500000000;

  for (let i = 250; i >= 0; i--) {
    const date = new Date(now.getTime() - i * (1000 * 60 * 60 * 12));
    const isCredit = Math.random() > 0.4;
    const amount = Math.floor(Math.random() * 5000000) + 100000;

    const balance_before = currentBalance;
    if (isCredit) currentBalance += amount;
    else currentBalance -= amount;

    txs.push({
      id: `tx-hist-${i}`,
      ticket_code: `TX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      user_id: 'app-user-001',
      amount_bigint: isCredit ? amount : -amount,
      balance_before,
      balance_after: currentBalance,
      type: isCredit ? 'CREDIT' : 'DEBIT',
      reference_id: `REF-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      created_at: date.toISOString(),
      meta: { description: isCredit ? 'Inyección de Capital' : 'Retiro Operativo' },
    });
  }
  return txs.reverse();
};

// --- SHARED PERSISTENCE STORES ---
let DB_USERS = load(DB_STORAGE_KEYS.USERS, [MOCK_ADMIN_PROFILE]);
let DB_BETS = load(DB_STORAGE_KEYS.BETS, []);
let DB_AUDIT = load(DB_STORAGE_KEYS.AUDIT, []);
let DB_RESULTS = load(DB_STORAGE_KEYS.RESULTS, []);
let DB_LEDGER = load(DB_STORAGE_KEYS.LEDGER, generateLedgerHistory());
let DB_SETTINGS = load(DB_STORAGE_KEYS.SETTINGS, {
  multiplier_tiempos: 90,
  multiplier_reventados: 200,
});
const DB_LIMITS = load(DB_STORAGE_KEYS.LIMITS, []);

export const MockDB = {
  getUsers: () => DB_USERS,
  saveUser: (user: any) => {
    const idx = DB_USERS.findIndex((u: any) => u.id === user.id);
    if (idx >= 0) DB_USERS[idx] = user;
    else DB_USERS.unshift(user);
    save(DB_STORAGE_KEYS.USERS, DB_USERS);
  },
  deleteUser: (userId: string) => {
    DB_USERS = DB_USERS.filter((u: any) => u.id !== userId);
    save(DB_STORAGE_KEYS.USERS, DB_USERS);
  },
  getBets: () => DB_BETS,
  addBet: (bet: any) => {
    DB_BETS.unshift(bet);
    save(DB_STORAGE_KEYS.BETS, DB_BETS);
  },
  getLedger: () => DB_LEDGER,
  addTransaction: (tx: any) => {
    DB_LEDGER.unshift(tx);
    save(DB_STORAGE_KEYS.LEDGER, DB_LEDGER);
  },
  getResults: () => DB_RESULTS,
  saveResult: (res: any) => {
    // CORRECCIÓN CRÍTICA: Búsqueda unívoca por drawTime para evitar colisiones de undefined
    const idx = DB_RESULTS.findIndex(
      (r: any) => r.drawTime === res.drawTime && r.date === res.date
    );
    if (idx >= 0) {
      DB_RESULTS[idx] = { ...DB_RESULTS[idx], ...res };
    } else {
      DB_RESULTS.push(res);
    }
    save(DB_STORAGE_KEYS.RESULTS, DB_RESULTS);
  },
  getAudit: () => DB_AUDIT,
  addAudit: (log: any) => {
    const newLog = {
      id: Date.now() + Math.random(),
      event_id: `EVT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      hash: `sha-${Math.random()}`,
      ...log,
    };
    DB_AUDIT.unshift(newLog);
    save(DB_STORAGE_KEYS.AUDIT, DB_AUDIT);
  },
  getSettings: () => DB_SETTINGS,
  saveSettings: (s: any) => {
    DB_SETTINGS = { ...DB_SETTINGS, ...s };
    save(DB_STORAGE_KEYS.SETTINGS, DB_SETTINGS);
  },
  getSettingsList: () => [],
  updateSetting: (k: string, v: any) => {},
  getLimits: () => DB_LIMITS,
  saveLimit: (limit: any) => {
    const idx = DB_LIMITS.findIndex(
      (l: any) => l.draw_type === limit.draw_type && l.number === limit.number
    );
    if (idx >= 0) DB_LIMITS[idx] = limit;
    else DB_LIMITS.push(limit);
    save(DB_STORAGE_KEYS.LIMITS, DB_LIMITS);
  },

  analyzePurge: (target: PurgeTarget, days: number): PurgeAnalysis => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    let list: any[] = [];
    let desc = '';
    let risk: any = 'LOW';

    if (target === 'BETS_HISTORY') {
      list = DB_BETS.filter(
        (b) => b.status !== 'PENDING' && new Date(b.created_at).getTime() < cutoff
      );
      desc =
        'Registros de apuestas finalizadas (Ganadas/Perdidas). Las apuestas en curso NO se verán afectadas.';
      risk = 'MEDIUM';
    } else if (target === 'AUDIT_LOGS') {
      list = DB_AUDIT.filter((a) => new Date(a.timestamp).getTime() < cutoff);
      desc = 'Bitácora de eventos técnicos antiguos. No afecta la integridad del sistema actual.';
      risk = 'LOW';
    } else if (target === 'RESULTS_HISTORY') {
      list = DB_RESULTS.filter((r) => new Date(r.created_at).getTime() < cutoff);
      desc = 'Resultados de sorteos pasados almacenados en el búfer.';
      risk = 'LOW';
    } else if (target === 'LEDGER_OLD') {
      list = DB_LEDGER.filter((l) => new Date(l.created_at).getTime() < cutoff);
      desc = 'Historial de movimientos financieros pasados. Los balances actuales están BLINDADOS.';
      risk = 'HIGH';
    }

    return {
      target,
      cutoffDate: new Date(cutoff).toISOString(),
      recordCount: list.length,
      estimatedSizeKB: Math.round(list.length * 0.45),
      riskLevel: risk,
      canProceed: list.length > 0,
      description: desc,
    };
  },

  executePurge: (target: PurgeTarget, days: number): number => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    let initialCount = 0;

    if (target === 'BETS_HISTORY') {
      initialCount = DB_BETS.length;
      DB_BETS = DB_BETS.filter(
        (b) => b.status === 'PENDING' || new Date(b.created_at).getTime() >= cutoff
      );
      save(DB_STORAGE_KEYS.BETS, DB_BETS);
      return initialCount - DB_BETS.length;
    } else if (target === 'AUDIT_LOGS') {
      initialCount = DB_AUDIT.length;
      DB_AUDIT = DB_AUDIT.filter((a) => new Date(a.timestamp).getTime() >= cutoff);
      save(DB_STORAGE_KEYS.AUDIT, DB_AUDIT);
      return initialCount - DB_AUDIT.length;
    } else if (target === 'RESULTS_HISTORY') {
      initialCount = DB_RESULTS.length;
      DB_RESULTS = DB_RESULTS.filter((r) => new Date(r.created_at).getTime() >= cutoff);
      save(DB_STORAGE_KEYS.RESULTS, DB_RESULTS);
      return initialCount - DB_RESULTS.length;
    } else if (target === 'LEDGER_OLD') {
      initialCount = DB_LEDGER.length;
      DB_LEDGER = DB_LEDGER.filter((l) => new Date(l.created_at).getTime() >= cutoff);
      save(DB_STORAGE_KEYS.LEDGER, DB_LEDGER);
      return initialCount - DB_LEDGER.length;
    }
    return 0;
  },
  saveDB: (key: string, val: any) => save(key, val),
};

if (isDemo) {
  client = {
    supabaseUrl: 'https://demo.local',
    auth: {
      getUser: async () => {
        const hasSession = localStorage.getItem(MOCK_STORAGE_KEY);
        if (hasSession) {
          const stored = JSON.parse(hasSession);
          return { data: { user: stored.user }, error: null };
        }
        return { data: { user: null }, error: null };
      },
      getSession: async () => {
        const hasSession = localStorage.getItem(MOCK_STORAGE_KEY);
        if (hasSession) {
          const stored = JSON.parse(hasSession);
          return { data: { session: stored }, error: null };
        }
        return { data: { session: null }, error: null };
      },
      signInWithPassword: async ({ email }: any) => {
        await new Promise((r) => setTimeout(r, 600));
        const target = DB_USERS.find((u: any) => u.email === email) || MOCK_ADMIN_PROFILE;
        const authUser = {
          id: target.auth_uid,
          email: target.email,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: new Date().toISOString(),
        };
        const sessionData = { access_token: 'mock-jwt-token', user: authUser };
        save(MOCK_STORAGE_KEY, sessionData);
        return { data: { user: authUser, session: sessionData }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem(MOCK_STORAGE_KEY);
        return { error: null };
      },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: (table: string) => {
      const chain = {
        select: (c: string) => chain,
        eq: (f: string, v: string) => chain,
        order: (f: string, { ascending }: any) => chain,
        limit: (n: number) => chain,
        single: async () => {
          if (table === 'app_users') return { data: MOCK_ADMIN_PROFILE, error: null };
          return { data: null, error: { message: 'Not Mocked' } };
        },
        then: (callback: any) => {
          let data: any[] = [];
          if (table === 'app_users') data = DB_USERS;
          else if (table === 'ledger_transactions') data = DB_LEDGER;
          else if (table === 'audit_trail') data = DB_AUDIT;
          else if (table === 'bets') data = DB_BETS;
          else if (table === 'draw_results') data = DB_RESULTS;
          callback({ data: data.slice(0, 500), error: null });
        },
      };
      return chain;
    },
  } as any;
} else {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = client;
