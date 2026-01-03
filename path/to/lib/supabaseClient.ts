
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { AuditSeverity, AuditEventType } from '../types';

// Detect if we are using default/placeholder credentials
const isDemo = SUPABASE_URL.includes('your-project') || !SUPABASE_URL || SUPABASE_URL === 'https://demo.local';

let client: SupabaseClient;

// --- MOCK DATA STORE (PERSISTENT IN MEMORY) ---
const MOCK_STORAGE_KEY = 'tiempospro_demo_session';

// Mutable Mock Data
const MOCK_BETS: any[] = [];
const MOCK_AUTH_USER = {
  id: 'mock-auth-uid-001',
  email: 'admin@tiempos.local',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString()
};

const MOCK_ADMIN_PROFILE = {
  id: 'app-user-001',
  auth_uid: 'mock-auth-uid-001',
  email: 'admin@tiempos.local',
  name: 'Admin PHRONT (Demo)',
  role: 'SuperAdmin',
  cedula: '1-1111-1111',
  phone: '+506 8888-8888',
  balance_bigint: 5000000,
  currency: 'CRC',
  status: 'Active',
  issuer_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// --- STATIC TEST USERS FOR VISUAL VERIFICATION ---
const TEST_VENDOR = {
    id: 'test-vendor-01',
    auth_uid: 'auth-vendor-test',
    email: 'vendedor@test.com',
    name: 'Vendedor Test (Purple)',
    cedula: '2-2222-2222',
    phone: '+506 2222-2222',
    role: 'Vendedor',
    balance_bigint: 2500000,
    currency: 'CRC',
    status: 'Active',
    issuer_id: 'app-user-001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};

const TEST_PLAYER = {
    id: 'test-player-01',
    auth_uid: 'auth-player-test',
    email: 'jugador@test.com',
    name: 'Jugador Test (Cyan)',
    cedula: '3-3333-3333',
    phone: '+506 3333-3333',
    role: 'Cliente',
    balance_bigint: 50000,
    currency: 'CRC',
    status: 'Active',
    issuer_id: 'test-vendor-01', // Assigned to test vendor
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};

const generateUsers = (role: string, count: number) => {
  return Array.from({ length: count }).map((_, i) => ({
      id: `${role.toLowerCase()}-${i}`,
      auth_uid: `auth-${role}-${i}`,
      email: `${role.toLowerCase()}${i}@cyber.net`,
      name: `${role} Unidad ${i + 100}`,
      cedula: `1-0${i+200}-${i+300}`,
      phone: `+506 8${i}00-${i}000`,
      role: role,
      balance_bigint: Math.floor(Math.random() * 1000000),
      currency: 'CRC',
      status: Math.random() > 0.8 ? 'Suspended' : 'Active',
      issuer_id: 'app-user-001',
      created_at: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
      updated_at: new Date().toISOString()
  }));
};

// Initialize only once - INJECT TEST USERS FIRST
const MOCK_CLIENTS = [TEST_PLAYER, ...generateUsers('Cliente', 50)];
const MOCK_VENDORS = [TEST_VENDOR, ...generateUsers('Vendedor', 50)];

// MOCK RESULTS - INITIALIZE FOR TODAY
const todayStr = new Date().toISOString().split('T')[0];
const MOCK_RESULTS = [
    { id: 'res-1', date: todayStr, drawTime: 'Mediodía (12:55)', winningNumber: '--', isReventado: false, status: 'OPEN', created_at: new Date().toISOString() },
    { id: 'res-2', date: todayStr, drawTime: 'Tarde (16:30)', winningNumber: '--', isReventado: false, status: 'OPEN', created_at: new Date().toISOString() },
    { id: 'res-3', date: todayStr, drawTime: 'Noche (19:30)', winningNumber: '--', isReventado: false, status: 'OPEN', created_at: new Date().toISOString() }
];

const MOCK_LEDGER = Array.from({ length: 15 }).map((_, i) => ({
  id: `tx-${i}`,
  ticket_code: `TX-${Math.random().toString(36).substring(2,6).toUpperCase()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`,
  user_id: 'app-user-001',
  amount_bigint: i % 2 === 0 ? 500000 : -250000,
  balance_before: 4500000,
  balance_after: 5000000,
  type: i % 2 === 0 ? 'CREDIT' : 'DEBIT',
  reference_id: `ref-${Date.now()}-${i}`,
  created_at: new Date(Date.now() - i * 86400000).toISOString(),
  meta: { description: i % 2 === 0 ? 'Depósito vía Admin' : 'Colocación de Apuesta' }
}));

// --- GENERATE PROFESSIONAL FORENSIC AUDIT TRAIL ---
const MOCK_AUDIT = [
    // 1. Critical Admin Action
    {
        id: 1001,
        event_id: 'evt-purge-001',
        timestamp: new Date().toISOString(),
        actor_id: 'app-user-001',
        actor_role: 'SuperAdmin',
        actor_name: 'Admin PHRONT',
        ip_address: '10.0.0.5',
        device_fingerprint: 'Chrome / MacOS / SecureTerm',
        type: AuditEventType.ADMIN_PURGE,
        action: 'SYSTEM_DATA_PURGE_INITIATED',
        severity: AuditSeverity.FORENSIC,
        target_resource: 'SYSTEM_DB',
        metadata: { confirmation_phrase: 'CONFIRMAR PURGA TOTAL', snapshot_id: 'snap-992' },
        hash: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    },
    // 2. Role Collision Warning (Security Rule Violation)
    {
        id: 1002,
        event_id: 'evt-col-002',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        actor_id: 'vendedor-2',
        actor_role: 'Vendedor',
        actor_name: 'Vendedor Unidad 102',
        ip_address: '192.168.1.45',
        device_fingerprint: 'Mobile Safari / iOS',
        type: AuditEventType.IDENTITY_COLLISION,
        action: 'ATTEMPT_REGISTER_DUAL_ROLE',
        severity: AuditSeverity.CRITICAL,
        target_resource: 'cedula:1-0202-0302',
        metadata: { 
            attempted_role: 'Cliente', 
            existing_role: 'Vendedor', 
            error: 'CROSS_ROLE_VIOLATION_BLOCK' 
        },
        hash: 'sha256-88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589'
    }
];

// RISK LIMITS STORE (New Table)
const MOCK_LIMITS: any[] = [];

if (isDemo) {
  console.warn('⚠️ TIEMPOSPRO v3.1: Ejecutando en MODO DEMO (Sin URL de Supabase válida). Usando mocks en memoria.');
  
  // Mock Implementation
  client = {
    supabaseUrl: 'https://demo.local',
    auth: {
      getUser: async () => {
        const hasSession = localStorage.getItem(MOCK_STORAGE_KEY);
        if (hasSession) {
            // Check if stored session is one of our test users
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
      signInWithPassword: async ({ email, password }: any) => {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        let targetUser = MOCK_AUTH_USER;
        let targetProfile = MOCK_ADMIN_PROFILE;

        // CHECK FOR TEST USERS
        if (email === TEST_VENDOR.email) {
            targetUser = { ...MOCK_AUTH_USER, id: TEST_VENDOR.auth_uid, email: TEST_VENDOR.email };
            targetProfile = TEST_VENDOR as any;
        } else if (email === TEST_PLAYER.email) {
            targetUser = { ...MOCK_AUTH_USER, id: TEST_PLAYER.auth_uid, email: TEST_PLAYER.email };
            targetProfile = TEST_PLAYER as any;
        } else if (password === 'error') {
            return { data: { user: null, session: null }, error: { message: 'Error de Inicio de Sesión Simulado' } };
        }

        const sessionData = { access_token: 'mock-jwt-token', user: targetUser };
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(sessionData));
        return { data: { user: targetUser, session: sessionData }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem(MOCK_STORAGE_KEY);
        return { error: null };
      },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: (table: string) => {
      let currentFilterField: string | null = null;
      let currentFilterValue: string | null = null;
      let orderBy = 'created_at';
      let orderAsc = false;

      const chain = {
        select: (cols: string) => chain,
        eq: (field: string, value: string) => {
            currentFilterField = field;
            currentFilterValue = value;
            return chain;
        },
        order: (field: string, { ascending }: any) => {
            orderBy = field;
            orderAsc = ascending;
            return chain;
        },
        limit: (num: number) => chain,
        single: async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // AUTH PROFILE LOOKUP
            if (table === 'app_users' && currentFilterField === 'auth_uid') {
                if (currentFilterValue === TEST_VENDOR.auth_uid) return { data: TEST_VENDOR, error: null };
                if (currentFilterValue === TEST_PLAYER.auth_uid) return { data: TEST_PLAYER, error: null };
                return { data: MOCK_ADMIN_PROFILE, error: null };
            }

            if (table === 'app_users' && currentFilterField === 'id') {
                 if (currentFilterValue === TEST_VENDOR.id) return { data: TEST_VENDOR, error: null };
                 if (currentFilterValue === TEST_PLAYER.id) return { data: TEST_PLAYER, error: null };
                 
                 let user = MOCK_CLIENTS.find(c => c.id === currentFilterValue);
                 if (!user) user = MOCK_VENDORS.find(v => v.id === currentFilterValue);
                 if (!user && currentFilterValue === MOCK_ADMIN_PROFILE.id) user = MOCK_ADMIN_PROFILE;
                 
                 if (user) return { data: user, error: null };
                 
                 return { data: null, error: { message: 'User Not Found' } };
            }
            if (table === 'lottery_results' && currentFilterField === 'drawTime') {
                const res = MOCK_RESULTS.find(r => r.drawTime === currentFilterValue);
                return { data: res || null, error: null };
            }
            if (table === 'limits_per_number' && currentFilterField === 'draw_type') {
                const limits = MOCK_LIMITS.filter(l => l.draw_type === currentFilterValue);
                return { data: limits, error: null };
            }
            return { data: null, error: { message: 'No encontrado' } };
        },
        then: (callback: (res: any) => void) => {
            setTimeout(() => {
                let data: any[] = [];
                if (table === 'app_users') {
                    if (currentFilterValue === 'Cliente') {
                        data = [...MOCK_CLIENTS]; 
                    } else if (currentFilterValue === 'Vendedor') {
                        data = [...MOCK_VENDORS];
                    } else if (currentFilterField === 'auth_uid') {
                        // Mock Auth Lookup
                        if (currentFilterValue === TEST_VENDOR.auth_uid) data = [TEST_VENDOR];
                        else if (currentFilterValue === TEST_PLAYER.auth_uid) data = [TEST_PLAYER];
                        else data = [MOCK_ADMIN_PROFILE];
                    } else {
                        data = [...MOCK_CLIENTS, ...MOCK_VENDORS, MOCK_ADMIN_PROFILE];
                    }
                } else if (table === 'ledger_transactions') {
                    data = [...MOCK_LEDGER];
                    data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                } else if (table === 'audit_trail') {
                    data = [...MOCK_AUDIT];
                } else if (table === 'bets') {
                    if (currentFilterField === 'user_id') {
                        data = MOCK_BETS.filter(b => b.user_id === currentFilterValue);
                    } else {
                        data = [...MOCK_BETS];
                    }
                    data.sort((a, b) => {
                        const dateA = new Date(a.created_at).getTime();
                        const dateB = new Date(b.created_at).getTime();
                        return orderAsc ? dateA - dateB : dateB - dateA;
                    });
                } else if (table === 'lottery_results') {
                    data = [...MOCK_RESULTS];
                } else if (table === 'limits_per_number') {
                    if (currentFilterField === 'draw_type') {
                        data = MOCK_LIMITS.filter(l => l.draw_type === currentFilterValue);
                    } else {
                        data = [...MOCK_LIMITS];
                    }
                }
                callback({ data, error: null });
            }, 300);
        },
        insert: (payload: any) => ({
            select: () => ({
                single: async () => {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    const newItem = { ...payload[0] };

                    if (table === 'bets') {
                         newItem.id = `bet-${Date.now()}-${Math.random()}`;
                         newItem.created_at = new Date().toISOString();
                         newItem.status = 'PENDING';
                         MOCK_BETS.unshift(newItem);
                         return { data: newItem, error: null };
                    }

                    if (table === 'ledger_transactions') {
                         newItem.id = `tx-${Date.now()}-${Math.random()}`;
                         newItem.created_at = new Date().toISOString();
                         MOCK_LEDGER.unshift(newItem);
                         return { data: newItem, error: null };
                    }
                    
                    if (table === 'app_users') {
                        newItem.id = `user-${Date.now()}`;
                        newItem.created_at = new Date().toISOString();
                        if (newItem.role === 'Cliente') MOCK_CLIENTS.unshift(newItem);
                        if (newItem.role === 'Vendedor') MOCK_VENDORS.unshift(newItem);
                        return { data: newItem, error: null };
                    }

                    if (table === 'audit_trail') {
                        newItem.id = Date.now();
                        newItem.event_id = `evt-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                        newItem.timestamp = new Date().toISOString();
                        newItem.hash = `sha256-mock-${Date.now()}`;
                        MOCK_AUDIT.unshift(newItem);
                        return { data: newItem, error: null };
                    }

                    if (table === 'limits_per_number') {
                        const existingIdx = MOCK_LIMITS.findIndex(l => l.draw_type === newItem.draw_type && l.number === newItem.number);
                        if (existingIdx >= 0) {
                            MOCK_LIMITS[existingIdx] = { ...MOCK_LIMITS[existingIdx], ...newItem };
                            return { data: MOCK_LIMITS[existingIdx], error: null };
                        } else {
                            newItem.id = `limit-${Date.now()}`;
                            MOCK_LIMITS.push(newItem);
                            return { data: newItem, error: null };
                        }
                    }
                    
                    return { data: null, error: { message: 'Insert not mocked for this table' } };
                }
            })
        }),
        update: (payload: any) => ({
            eq: (field: string, value: string) => {
                const executeUpdate = async () => {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    if (table === 'lottery_results') {
                        const target = MOCK_RESULTS.find(r => r[field] === value);
                        if (target) {
                            Object.assign(target, payload);
                            return { data: target, error: null };
                        }
                    }

                    let target = MOCK_CLIENTS.find(u => u[field] === value);
                    if (!target) target = MOCK_VENDORS.find(u => u[field] === value);
                    if (!target && value === MOCK_ADMIN_PROFILE.id) target = MOCK_ADMIN_PROFILE;
                    
                    // Check Test Users
                    if (!target && value === TEST_VENDOR.id) target = TEST_VENDOR;
                    if (!target && value === TEST_PLAYER.id) target = TEST_PLAYER;

                    if (target) {
                        Object.assign(target, payload);
                        return { data: target, error: null };
                    }
                    return { data: null, error: { message: 'Update Target Not Found' } };
                };

                return {
                    select: () => ({
                        single: executeUpdate
                    }),
                    then: (onfulfilled: any) => executeUpdate().then(onfulfilled)
                };
            }
        }),
        delete: () => ({
             eq: (field: string, value: string) => {
                 return {
                     then: (callback: any) => {
                         setTimeout(() => {
                             if (table === 'limits_per_number') {
                                 const idx = MOCK_LIMITS.findIndex(l => l[field] === value);
                                 if (idx !== -1) {
                                     MOCK_LIMITS.splice(idx, 1);
                                     callback({ data: true, error: null });
                                     return;
                                 }
                             }

                             let idx = MOCK_CLIENTS.findIndex(u => u[field] === value);
                             if (idx !== -1) {
                                 MOCK_CLIENTS.splice(idx, 1);
                                 callback({ data: true, error: null });
                                 return;
                             }
                             idx = MOCK_VENDORS.findIndex(u => u[field] === value);
                             if (idx !== -1) {
                                 MOCK_VENDORS.splice(idx, 1);
                                 callback({ data: true, error: null });
                                 return;
                             }
                             callback({ data: null, error: { message: 'Not found to delete' }});
                         }, 200);
                     }
                 }
             }
        })
      };
      return chain;
    }
  } as any;
} else {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = client;
