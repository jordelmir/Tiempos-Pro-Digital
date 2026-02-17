
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { AuditSeverity, AuditEventType, LotteryRegion, UserRole, RiskAnalysisSIPR, DrawTime, PurgeTarget, PurgeAnalysis } from '../types';

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
    MANUAL_LIMITS: 'tiempospro_db_manual_limits',
    GLOBAL_LIMITS: 'tiempospro_db_global_limits'
};

const load = (key: string, def: any) => {
    try { const val = localStorage.getItem(key); return val ? JSON.parse(val) : def; } catch { return def; }
};
const save = (key: string, val: any) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error("Quota Exceeded"); }
};

// Generar datos antiguos para probar la purga
const generateOldData = () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 45); // 45 días atrás
    return oldDate.toISOString();
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

// Carga inicial
let DB_USERS = load(DB_STORAGE_KEYS.USERS, [MOCK_ADMIN_PROFILE]);
let DB_BETS = load(DB_STORAGE_KEYS.BETS, []);
let DB_AUDIT = load(DB_STORAGE_KEYS.AUDIT, []);
let DB_RESULTS = load(DB_STORAGE_KEYS.RESULTS, []);
let DB_LEDGER = load(DB_STORAGE_KEYS.LEDGER, []);
let DB_SETTINGS = load(DB_STORAGE_KEYS.SETTINGS, { multiplier_tiempos: 90, multiplier_reventados: 200, global_bank: 500000000 });
let DB_MANUAL_LIMITS = load(DB_STORAGE_KEYS.MANUAL_LIMITS, {});
let DB_GLOBAL_LIMITS = load(DB_STORAGE_KEYS.GLOBAL_LIMITS, {});

// Inyectar algunos datos viejos si las tablas están vacías para demo
if (DB_BETS.length === 0) {
    DB_BETS = Array.from({length: 20}).map((_, i) => ({
        id: `old-bet-${i}`, ticket_code: `OLD-${i}`, user_id: 'app-user-001', amount_bigint: 100000, 
        numbers: '00', mode: '90x', status: 'LOST', created_at: generateOldData()
    }));
}

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
    saveManualLimit: (drawTime: string, num: string | null, limit: number) => {
        if (num) {
            const key = `${drawTime}:${num}`;
            if (limit <= 0) { delete DB_MANUAL_LIMITS[key]; } else { DB_MANUAL_LIMITS[key] = limit; }
            save(DB_STORAGE_KEYS.MANUAL_LIMITS, DB_MANUAL_LIMITS);
        } else {
            if (limit <= 0) { delete DB_GLOBAL_LIMITS[drawTime]; } else { DB_GLOBAL_LIMITS[drawTime] = limit; }
            save(DB_STORAGE_KEYS.GLOBAL_LIMITS, DB_GLOBAL_LIMITS);
        }
    },
    
    // --- MÓDULO DE MANTENIMIENTO ---
    analyzePurge: (target: PurgeTarget, days: number): PurgeAnalysis => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffTime = cutoff.getTime();

        let list: any[] = [];
        let desc = "";
        
        switch(target) {
            case 'BETS_HISTORY': list = DB_BETS; desc = "Registros de apuestas finalizadas que exceden el periodo de auditoría legal."; break;
            case 'AUDIT_LOGS': list = DB_AUDIT; desc = "Registros técnicos de eventos de sistema y trazas de navegación."; break;
            case 'RESULTS_HISTORY': list = DB_RESULTS; desc = "Historial de números ganadores almacenados en el búfer de resultados rápida."; break;
            case 'LEDGER_OLD': list = DB_LEDGER; desc = "Transacciones contables históricas. Los balances finales no se ven afectados."; break;
            default: list = [];
        }

        const count = list.filter(item => new Date(item.created_at || item.timestamp).getTime() < cutoffTime).length;
        
        return {
            target,
            cutoffDate: cutoff.toISOString(),
            recordCount: count,
            estimatedSizeKB: Math.round(count * 0.85), // Promedio de 0.85KB por registro
            riskLevel: days < 15 ? 'HIGH' : count > 500 ? 'MEDIUM' : 'LOW',
            canProceed: true,
            description: desc || "Análisis de integridad completado."
        };
    },

    executePurge: (target: PurgeTarget, days: number): number => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffTime = cutoff.getTime();
        let initialCount = 0;

        if (target === 'BETS_HISTORY') {
            initialCount = DB_BETS.length;
            DB_BETS = DB_BETS.filter(item => new Date(item.created_at).getTime() >= cutoffTime);
            save(DB_STORAGE_KEYS.BETS, DB_BETS);
        } else if (target === 'AUDIT_LOGS') {
            initialCount = DB_AUDIT.length;
            DB_AUDIT = DB_AUDIT.filter(item => new Date(item.timestamp).getTime() >= cutoffTime);
            save(DB_STORAGE_KEYS.AUDIT, DB_AUDIT);
        } else if (target === 'RESULTS_HISTORY') {
            initialCount = DB_RESULTS.length;
            DB_RESULTS = DB_RESULTS.filter(item => new Date(item.created_at).getTime() >= cutoffTime);
            save(DB_STORAGE_KEYS.RESULTS, DB_RESULTS);
        } else if (target === 'LEDGER_OLD') {
            initialCount = DB_LEDGER.length;
            DB_LEDGER = DB_LEDGER.filter(item => new Date(item.created_at).getTime() >= cutoffTime);
            save(DB_STORAGE_KEYS.LEDGER, DB_LEDGER);
        }

        return initialCount - (target === 'BETS_HISTORY' ? DB_BETS.length : 
                              target === 'AUDIT_LOGS' ? DB_AUDIT.length : 
                              target === 'RESULTS_HISTORY' ? DB_RESULTS.length : 
                              DB_LEDGER.length);
    },

    getRiskAnalysisSIPR: (drawTime: string): RiskAnalysisSIPR[] => {
        const bank = DB_SETTINGS.global_bank || 500000000;
        const defaultMaxLiability = bank * 0.10; 
        const globalLimit = DB_GLOBAL_LIMITS[drawTime];

        const allStats = Array.from({ length: 100 }, (_, i) => {
            const num = i.toString().padStart(2, '0');
            const totalBet = DB_BETS
                .filter(b => b.numbers === num && b.draw_id === drawTime && b.status === 'PENDING')
                .reduce((acc, curr) => acc + curr.amount_bigint, 0);
            
            const manualIndiv = DB_MANUAL_LIMITS[`${drawTime}:${num}`];
            const maxLiability = manualIndiv || globalLimit || defaultMaxLiability;

            const exposure_percent = (totalBet / (maxLiability / (DB_SETTINGS.multiplier_tiempos || 90))) * 100;
            
            let risk_status: 'CYAN' | 'AMBAR' | 'BLOOD_RED' = 'CYAN';
            if (exposure_percent > 75) risk_status = 'BLOOD_RED';
            else if (exposure_percent > 40) risk_status = 'AMBAR';

            return {
                number: num,
                exposure_percent: Math.min(100, exposure_percent),
                current_sold_bigint: totalBet,
                max_allowed_bigint: maxLiability / (DB_SETTINGS.multiplier_tiempos || 90),
                risk_status,
                is_blocked: exposure_percent >= 95,
                has_manual_limit: !!manualIndiv,
                is_recommended: false, 
                points_multiplier: 0   
            };
        });

        const coldTen = [...allStats]
            .filter(s => !s.is_blocked)
            .sort((a, b) => a.exposure_percent - b.exposure_percent)
            .slice(0, 10)
            .map(s => s.number);

        return allStats.map(s => ({
            ...s,
            is_recommended: coldTen.includes(s.number),
            points_multiplier: coldTen.includes(s.number) ? 1 : 0
        }));
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
            eq: (f: string, v: string) => { currentFilterValue = v; return chain; },
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
                callback({ data: [...data], error: null });
            }
        };
        return chain;
    }
  } as any;
} else {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = client;
