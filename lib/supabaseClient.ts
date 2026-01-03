
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { AuditSeverity, AuditEventType, PurgeTarget, PurgeAnalysis, LotteryRegion, UserRole } from '../types';

const isDemo = SUPABASE_URL.includes('your-project') || !SUPABASE_URL || SUPABASE_URL === 'https://demo.local';

let client: SupabaseClient;

const MOCK_STORAGE_KEY = 'tiempospro_demo_session';
const DB_STORAGE_KEYS = {
    BETS: 'tiempospro_db_bets',
    AUDIT: 'tiempospro_db_audit',
    RESULTS: 'tiempospro_db_results',
    LEDGER: 'tiempospro_db_ledger',
    USERS: 'tiempospro_db_users',
    SETTINGS: 'tiempospro_db_settings',
    LIMITS: 'tiempospro_db_limits'
};

const load = (key: string, def: any) => {
    try { const val = localStorage.getItem(key); return val ? JSON.parse(val) : def; } catch { return def; }
};
const save = (key: string, val: any) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error("Quota Exceeded"); }
};

// --- DEFINICIÓN DE PERFILES MAESTROS ---
const MOCK_ADMIN_PROFILE = {
  id: 'app-user-001',
  auth_uid: 'auth-uid-admin',
  email: 'admin@tiempos.local',
  name: 'Admin PHRONT (Root)',
  role: UserRole.SuperAdmin,
  cedula: '1-1111-1111',
  phone: '+506 8888-8888',
  balance_bigint: 1250000000,
  loyalty_points: 0,
  currency: 'CRC',
  status: 'Active',
  issuer_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const MOCK_VENDOR_PROFILE = {
  id: 'app-user-002',
  auth_uid: 'auth-uid-vendor',
  email: 'vendedor@test.com',
  name: 'Vendedor Prime',
  role: UserRole.Vendedor,
  cedula: '2-2222-2222',
  phone: '+506 7777-7777',
  balance_bigint: 50000000,
  loyalty_points: 0,
  currency: 'CRC',
  status: 'Active',
  issuer_id: 'app-user-001',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const MOCK_PLAYER_PROFILE = {
  id: 'app-user-003',
  auth_uid: 'auth-uid-player',
  email: 'jugador@test.com',
  name: 'Jugador Pro',
  role: UserRole.Cliente,
  cedula: '3-3333-3333',
  phone: '+506 6666-6666',
  balance_bigint: 1500000,
  loyalty_points: 5400,
  currency: 'CRC',
  status: 'Active',
  issuer_id: 'app-user-002',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Carga inicial
let DB_USERS = load(DB_STORAGE_KEYS.USERS, [MOCK_ADMIN_PROFILE, MOCK_VENDOR_PROFILE, MOCK_PLAYER_PROFILE]);
let DB_BETS = load(DB_STORAGE_KEYS.BETS, []);
let DB_AUDIT = load(DB_STORAGE_KEYS.AUDIT, []);
let DB_RESULTS = load(DB_STORAGE_KEYS.RESULTS, []);
let DB_LEDGER = load(DB_STORAGE_KEYS.LEDGER, []);
let DB_SETTINGS = load(DB_STORAGE_KEYS.SETTINGS, { multiplier_tiempos: 90, multiplier_reventados: 200, global_bank: 500000000 });

export const MockDB = {
    getUsers: () => DB_USERS,
    saveUser: (user: any) => {
        const idx = DB_USERS.findIndex((u: any) => u.id === user.id);
        if (idx >= 0) DB_USERS[idx] = { ...DB_USERS[idx], ...user }; else DB_USERS.unshift(user);
        save(DB_STORAGE_KEYS.USERS, DB_USERS);
    },
    getBets: () => DB_BETS,
    addBet: (bet: any) => { 
        DB_BETS.unshift(bet); 
        save(DB_STORAGE_KEYS.BETS, DB_BETS); 
    },
    getLedger: () => DB_LEDGER,
    addTransaction: (tx: any) => { DB_LEDGER.unshift(tx); save(DB_STORAGE_KEYS.LEDGER, DB_LEDGER); },
    getResults: () => DB_RESULTS,
    saveResult: (res: any) => {
        const idx = DB_RESULTS.findIndex((r: any) => r.drawTime === res.drawTime && r.date === res.date && r.region === res.region);
        if (idx >= 0) DB_RESULTS[idx] = { ...DB_RESULTS[idx], ...res }; else DB_RESULTS.push(res);
        save(DB_STORAGE_KEYS.RESULTS, DB_RESULTS);
    },
    getSettings: () => DB_SETTINGS,
    updateSettings: (newSettings: any) => {
        DB_SETTINGS = { ...DB_SETTINGS, ...newSettings };
        save(DB_STORAGE_KEYS.SETTINGS, DB_SETTINGS);
        return DB_SETTINGS;
    },
    getRiskAnalysisSIPR: (drawTime: string) => {
        const bank = DB_SETTINGS.global_bank || 100000000;
        const URC = bank * 0.10; 
        const maxLiabilityPerNumber = URC / (DB_SETTINGS.multiplier_tiempos || 90);

        return Array.from({ length: 100 }, (_, i) => {
            const num = i.toString().padStart(2, '0');
            const totalBet = DB_BETS
                .filter(b => b.numbers === num && b.draw_id === drawTime && b.status === 'PENDING')
                .reduce((acc, curr) => acc + curr.amount_bigint, 0);
            
            const exposure_percent = (totalBet / maxLiabilityPerNumber) * 100;
            let risk_status: 'CYAN' | 'AMBAR' | 'BLOOD_RED' = 'CYAN';
            if (exposure_percent > 75) risk_status = 'BLOOD_RED';
            else if (exposure_percent > 40) risk_status = 'AMBAR';

            return {
                number: num,
                exposure_percent,
                risk_status,
                is_blocked: exposure_percent >= 95,
                is_recommended: exposure_percent < 30,
                points_multiplier: exposure_percent < 30 ? 1 : 0
            };
        });
    },

    executeRedeem: (userId: string) => {
        const user = DB_USERS.find((u: any) => u.id === userId);
        const threshold = 20000;
        if (!user || (user.loyalty_points || 0) < threshold) {
            return { error: `Puntos insuficientes (Mín: ${threshold.toLocaleString()})` };
        }
        
        const canjes = Math.floor(user.loyalty_points / threshold);
        const pointsToDeduct = canjes * threshold;
        const rewardCents = canjes * 100 * 100; 

        const oldB = user.balance_bigint;
        user.loyalty_points -= pointsToDeduct;
        user.balance_bigint += rewardCents;
        
        const tx = {
            id: `redeem-${Date.now()}`,
            user_id: user.id,
            amount_bigint: rewardCents,
            balance_before: oldB,
            balance_after: user.balance_bigint,
            type: 'LOYALTY_REDEEM',
            created_at: new Date().toISOString(),
            meta: { points_spent: pointsToDeduct }
        };
        
        MockDB.addTransaction(tx);
        MockDB.saveUser(user);
        return { data: { reward: rewardCents, new_points: user.loyalty_points } };
    }
};

if (isDemo) {
  client = {
    supabaseUrl: 'https://demo.local',
    auth: {
      getUser: async () => {
        const hasSession = localStorage.getItem(MOCK_STORAGE_KEY);
        if (hasSession) { const stored = JSON.parse(hasSession); return { data: { user: stored.user }, error: null }; }
        return { data: { user: null }, error: null };
      },
      getSession: async () => {
        const hasSession = localStorage.getItem(MOCK_STORAGE_KEY);
        if (hasSession) { const stored = JSON.parse(hasSession); return { data: { session: stored }, error: null }; }
        return { data: { session: null }, error: null };
      },
      signInWithPassword: async ({ email }: any) => {
        await new Promise(r => setTimeout(r, 600));
        let target = DB_USERS.find((u: any) => u.email === email);
        
        if (!target) return { data: { user: null, session: null }, error: { message: 'Operador no registrado' } };

        const authUser = { id: target.auth_uid, email: target.email, aud: 'authenticated', role: 'authenticated', created_at: new Date().toISOString() };
        const sessionData = { access_token: 'mock-jwt-token', user: authUser };
        save(MOCK_STORAGE_KEY, sessionData);
        return { data: { user: authUser, session: sessionData }, error: null };
      },
      signOut: async () => { localStorage.removeItem(MOCK_STORAGE_KEY); return { error: null }; },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: (table: string) => {
        let currentFilterValue: any = null;
        const chain = {
            select: (c: string) => chain,
            eq: (f: string, v: string) => {
                currentFilterValue = v;
                return chain;
            },
            order: (f: string, { ascending }: any) => chain,
            limit: (n: number) => chain,
            single: async () => {
                if (table === 'app_users') {
                    const profile = DB_USERS.find((u:any) => u.auth_uid === currentFilterValue || u.email === currentFilterValue || u.id === currentFilterValue);
                    return { data: profile || null, error: profile ? null : { message: 'Perfil no encontrado' } };
                }
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
            }
        };
        return chain;
    },
    rpc: (fn: string, params: any) => {
        if (fn === 'update_market_rates') {
            const updated = MockDB.updateSettings({ multiplier_tiempos: params.t, multiplier_reventados: params.r });
            return { data: updated, error: null };
        }
        return { data: null, error: null };
    }
  } as any;
} else {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = client;
