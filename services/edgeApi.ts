
import { supabase, MockDB } from '../lib/supabaseClient';
import { ApiResponse, AppUser, TransactionResponse, DrawResultPayload, GameMode, DrawResult, Bet, AuditEventType, AuditSeverity, WeeklyDataStats, RiskAnalysisReport, SystemSetting, MasterCatalogItem, PurgeTarget, PurgeAnalysis, LedgerTransaction } from '../types';
import { formatCurrency } from '../constants';

const FUNCTION_BASE_URL = '/functions/v1'; 

const generateTicketCode = (prefix: string) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${result.substring(0,3)}-${result.substring(3,6)}`;
};

async function invokeEdgeFunction<T>(functionName: string, body: any): Promise<ApiResponse<T>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // --- DEMO MODE INTERCEPTOR (THE GAME ENGINE) ---
    if ((supabase as any).supabaseUrl === 'https://demo.local' || !session?.access_token.startsWith('ey')) { 
        
        await new Promise(r => setTimeout(r, 300)); 

        // 1. CLOCK & CONFIG
        if (functionName === 'getServerTime') {
             return { data: { 
                 server_time: new Date().toISOString(),
                 draw_config: { mediodia: '12:55:00', tarde: '16:30:00', noche: '19:30:00' }
             } as any };
        }

        if (functionName === 'getGlobalSettings') {
            const settings = MockDB.getSettings();
            return { data: settings as any };
        }

        if (functionName === 'updateGlobalMultiplier') {
            MockDB.saveSettings({ 
                multiplier_tiempos: body.baseValue, 
                multiplier_reventados: body.reventadosValue 
            });
            MockDB.addAudit({
                actor_id: body.actor_id,
                action: 'UPDATE_GLOBAL_MULTIPLIER',
                type: AuditEventType.ADMIN_SETTINGS,
                severity: AuditSeverity.WARNING,
                metadata: { base: body.baseValue, rev: body.reventadosValue }
            });
            return { data: { success: true } as any };
        }

        // 2. USER MANAGEMENT & TRANSACTIONS
        if (functionName === 'createUser') {
            const newUser = {
                ...body,
                id: `user-${Date.now()}`,
                auth_uid: `auth-${Date.now()}`,
                status: 'Active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                balance_bigint: body.balance_bigint || 0
            };
            MockDB.saveUser(newUser);
            
            if (newUser.balance_bigint > 0) {
                MockDB.addTransaction({
                    id: `tx-init-${newUser.id}`,
                    user_id: newUser.id,
                    amount_bigint: newUser.balance_bigint,
                    balance_before: 0,
                    balance_after: newUser.balance_bigint,
                    type: 'CREDIT',
                    meta: { description: 'Saldo Inicial' },
                    created_at: new Date().toISOString()
                });
            }

            MockDB.addAudit({
                actor_id: body.issuer_id || 'system',
                action: 'CREATE_USER',
                type: AuditEventType.IDENTITY_REGISTER,
                severity: AuditSeverity.INFO,
                target_resource: newUser.id,
                metadata: { role: newUser.role, name: newUser.name }
            });
            return { data: { user: newUser } as any };
        }

        if (functionName === 'checkIdentity') {
            const users = MockDB.getUsers();
            const exists = users.find((u: any) => u.cedula === body.cedula);
            return { data: exists || null };
        }

        if (functionName === 'rechargeUser') {
            const users = MockDB.getUsers();
            const user = users.find((u: any) => u.id === body.target_user_id);
            if (!user) return { error: 'Usuario no encontrado' };

            const oldBalance = user.balance_bigint;
            const newBalance = oldBalance + body.amount;
            
            user.balance_bigint = newBalance;
            user.updated_at = new Date().toISOString();
            MockDB.saveUser(user);

            MockDB.addTransaction({
                id: `tx-rech-${Date.now()}`,
                user_id: user.id,
                amount_bigint: body.amount,
                balance_before: oldBalance,
                balance_after: newBalance,
                type: 'CREDIT',
                reference_id: `DEP-${Date.now().toString().slice(-6)}`,
                meta: { description: 'Recarga de Saldo', actor: body.actor_id },
                created_at: new Date().toISOString()
            });

            MockDB.addAudit({
                actor_id: body.actor_id,
                action: 'USER_RECHARGE',
                type: AuditEventType.TX_DEPOSIT,
                severity: AuditSeverity.INFO,
                target_resource: user.id,
                metadata: { amount: body.amount, new_balance: newBalance }
            });

            return { data: { new_balance: newBalance, tx_id: `TX-${Date.now()}` } as any };
        }

        if (functionName === 'withdrawUser') {
            const users = MockDB.getUsers();
            const user = users.find((u: any) => u.id === body.target_user_id);
            if (!user) return { error: 'Usuario no encontrado' };
            
            if (user.balance_bigint < body.amount) return { error: 'Fondos insuficientes' };

            const oldBalance = user.balance_bigint;
            const newBalance = oldBalance - body.amount;
            
            user.balance_bigint = newBalance;
            user.updated_at = new Date().toISOString();
            MockDB.saveUser(user);

            const txId = `TX-WD-${Date.now().toString().slice(-6)}`;

            MockDB.addTransaction({
                id: `tx-with-${Date.now()}`,
                user_id: user.id,
                amount_bigint: -body.amount,
                balance_before: oldBalance,
                balance_after: newBalance,
                type: 'DEBIT',
                reference_id: txId,
                meta: { description: 'Retiro de Fondos', actor: body.actor_id },
                created_at: new Date().toISOString()
            });

            MockDB.addAudit({
                actor_id: body.actor_id,
                action: 'USER_WITHDRAWAL',
                type: AuditEventType.TX_WITHDRAWAL,
                severity: AuditSeverity.WARNING,
                target_resource: user.id,
                metadata: { amount: body.amount, new_balance: newBalance }
            });

            return { data: { new_balance: newBalance, tx_id: txId } as any };
        }

        if (functionName === 'payVendor') {
            const users = MockDB.getUsers();
            const user = users.find((u: any) => u.id === body.target_user_id);
            if (!user) return { error: 'Vendedor no encontrado' };

            const oldBalance = user.balance_bigint;
            const newBalance = oldBalance + body.amount;
            
            user.balance_bigint = newBalance;
            MockDB.saveUser(user);
            
            const txCode = `PAY-${Date.now().toString().slice(-6)}`;
            
            MockDB.addTransaction({
                id: `tx-pay-${Date.now()}`,
                user_id: user.id,
                amount_bigint: body.amount, 
                balance_before: oldBalance,
                balance_after: newBalance,
                type: 'COMMISSION_PAYOUT',
                reference_id: txCode,
                meta: { description: body.concept, notes: body.notes },
                created_at: new Date().toISOString()
            });

            MockDB.addAudit({
                actor_id: body.actor_id,
                action: 'VENDOR_PAYMENT',
                type: AuditEventType.FINANCIAL_OP,
                severity: AuditSeverity.CRITICAL,
                target_resource: user.id,
                metadata: { amount: body.amount, concept: body.concept }
            });

            return { data: { ticket_code: txCode } as any };
        }

        if (functionName === 'updateUserStatus') {
            const users = MockDB.getUsers();
            const user = users.find((u: any) => u.id === body.target_user_id);
            if (user) {
                user.status = body.status;
                MockDB.saveUser(user);
                MockDB.addAudit({
                    actor_id: body.actor_id,
                    action: body.status === 'Active' ? 'USER_UNBLOCK' : 'USER_BLOCK',
                    type: AuditEventType.ADMIN_BLOCK,
                    severity: AuditSeverity.WARNING,
                    target_resource: user.id
                });
                return { data: { success: true } as any };
            }
            return { error: 'Usuario no encontrado' };
        }

        if (functionName === 'deleteUser') {
            if (body.confirmation !== 'ELIMINAR NODO') return { error: 'Frase de confirmación incorrecta' };
            MockDB.deleteUser(body.target_user_id);
            MockDB.addAudit({
                actor_id: body.actor_id,
                action: 'USER_DELETE',
                type: AuditEventType.ADMIN_PURGE,
                severity: AuditSeverity.CRITICAL,
                target_resource: body.target_user_id
            });
            return { data: { success: true } as any };
        }

        // 3. BETTING ENGINE (CORE)
        if (functionName === 'placeBet') {
            const { data: authData } = await supabase.auth.getUser();
            const users = MockDB.getUsers();
            const user = users.find((u: any) => u.auth_uid === authData.user?.id);
            
            if (!user) return { error: 'Usuario no autenticado' };
            if (user.balance_bigint < body.amount) return { error: 'Saldo insuficiente' };

            const limits = MockDB.getLimits();
            const limitObj = limits.find((l: any) => l.number === body.numbers && l.draw_type === body.draw_id);
            
            const settingsList = MockDB.getSettingsList();
            const globalLimitSetting = settingsList.find((s:any) => s.key === 'GLOBAL_LIMIT');
            
            let limit = Infinity;
            if (limitObj && limitObj.max_amount !== -2) {
                limit = limitObj.max_amount;
            } else if (globalLimitSetting) {
                const val = Number(globalLimitSetting.value);
                if (val > 0) limit = val * 100; 
            }

            const bets = MockDB.getBets();
            const currentExposure = bets
                .filter((b: any) => b.numbers === body.numbers && b.draw_id === body.draw_id && b.status === 'PENDING')
                .reduce((acc: number, b: any) => acc + b.amount_bigint, 0);

            if (limit !== -1 && (currentExposure + body.amount) > limit) {
                return { error: `LIMIT_REACHED: Límite de riesgo excedido para el ${body.numbers}. Disp: ${formatCurrency(limit - currentExposure)}` };
            }

            const oldBalance = user.balance_bigint;
            const newBalance = oldBalance - body.amount;
            user.balance_bigint = newBalance;
            MockDB.saveUser(user);

            const ticketCode = generateTicketCode('BT');
            const newBet = {
                id: `bet-${Date.now()}-${Math.random()}`,
                ticket_code: ticketCode,
                user_id: user.id,
                draw_id: body.draw_id,
                amount_bigint: body.amount,
                numbers: body.numbers,
                mode: body.mode,
                status: 'PENDING',
                created_at: new Date().toISOString()
            };
            MockDB.addBet(newBet);

            MockDB.addTransaction({
                id: `tx-bet-${Date.now()}`,
                ticket_code: ticketCode,
                user_id: user.id,
                amount_bigint: -body.amount,
                balance_before: oldBalance,
                balance_after: newBalance,
                type: 'DEBIT',
                reference_id: ticketCode,
                meta: { description: `Apuesta: ${body.numbers}`, draw: body.draw_id, mode: body.mode },
                created_at: new Date().toISOString()
            });

            return { data: { bet_id: newBet.id, ticket_code: ticketCode } as any };
        }

        if (functionName === 'getGlobalBets') {
            const bets = MockDB.getBets();
            const users = MockDB.getUsers();
            
            const enrichedBets = bets.map((b: any) => {
                const u = users.find((us: any) => us.id === b.user_id);
                return {
                    ...b,
                    user_name: u ? u.name : 'Unknown',
                    user_role: u ? u.role : 'Unknown',
                    origin: u && u.role === 'Vendedor' ? 'Vendedor' : 'Jugador'
                };
            });

            let filtered = enrichedBets;
            if (body.userId && body.role !== 'SuperAdmin') {
                if (body.role === 'Vendedor') {
                    const myClients = users.filter((u:any) => u.issuer_id === body.userId).map((u:any) => u.id);
                    filtered = enrichedBets.filter((b: any) => b.user_id === body.userId || myClients.includes(b.user_id));
                } else {
                    filtered = enrichedBets.filter((b: any) => b.user_id === body.userId);
                }
            }

            if (body.statusFilter && body.statusFilter !== 'ALL') {
                filtered = filtered.filter((b: any) => b.status === body.statusFilter);
            }
            
            if (body.timeFilter && body.timeFilter !== 'ALL') {
                 filtered = filtered.filter((b: any) => b.draw_id && b.draw_id.includes(body.timeFilter));
            }

            return { data: { bets: filtered } as any };
        }

        // 4. RESULTS & PAYOUT ENGINE (PAYMASTER)
        if (functionName === 'publishDrawResult') {
            // 1. Save Result using camelCase standard
            MockDB.saveResult({
                id: `res-${body.drawTime}-${body.date}`,
                date: body.date,
                drawTime: body.drawTime,
                winningNumber: body.winningNumber,
                isReventado: body.isReventado,
                reventadoNumber: body.reventadoNumber,
                status: 'CLOSED',
                created_at: new Date().toISOString()
            });

            // 2. Payout Logic
            const bets = MockDB.getBets();
            const users = MockDB.getUsers();
            const settings = MockDB.getSettings();
            
            let processedCount = 0;
            const updatedBets = [...bets]; 

            updatedBets.forEach((bet: any) => {
                if (bet.status === 'PENDING' && bet.draw_id === body.drawTime) { 
                    let won = false;
                    let payoutMultiplier = 0;

                    if (bet.numbers === body.winningNumber) {
                        won = true;
                        payoutMultiplier = settings.multiplier_tiempos || 90;
                        
                        if (bet.mode === 'Reventados (200x)') {
                            if (body.isReventado) {
                                payoutMultiplier = settings.multiplier_reventados || 200;
                            } else {
                                payoutMultiplier = settings.multiplier_tiempos || 90;
                            }
                        }
                    }

                    if (won) {
                        bet.status = 'WON';
                        const prize = bet.amount_bigint * payoutMultiplier;
                        
                        const user = users.find((u: any) => u.id === bet.user_id);
                        if (user) {
                            user.balance_bigint += prize;
                            MockDB.saveUser(user);

                            MockDB.addTransaction({
                                id: `tx-win-${bet.id}`,
                                ticket_code: bet.ticket_code,
                                user_id: user.id,
                                amount_bigint: prize,
                                balance_before: user.balance_bigint - prize,
                                balance_after: user.balance_bigint,
                                type: 'CREDIT', 
                                reference_id: `WIN-${bet.ticket_code}`,
                                meta: { description: `Premio: ${bet.numbers}`, multiplier: payoutMultiplier, mode: bet.mode },
                                created_at: new Date().toISOString()
                            });
                        }
                        processedCount++;
                    } else {
                        bet.status = 'LOST';
                    }
                }
            });
            
            MockDB.saveDB('tiempospro_db_bets', updatedBets);

            MockDB.addAudit({
                actor_id: body.actor_id,
                action: 'PUBLISH_RESULT',
                type: AuditEventType.GAME_BET,
                severity: AuditSeverity.SUCCESS,
                metadata: { draw: body.drawTime, number: body.winningNumber, winners: processedCount }
            });

            return { data: { success: true, processed: processedCount } as any };
        }

        if (functionName === 'getLiveResults') {
            const results = MockDB.getResults();
            // Standardizing output from already standardized DB
            return { data: { results: results, history: results } as any };
        }

        // 5. RISK & MAINTENANCE
        if (functionName === 'getRiskLimits') {
            return { data: { limits: MockDB.getLimits() } as any };
        }
        if (functionName === 'getRiskStats') {
            const bets = MockDB.getBets();
            const statsMap = new Map<string, number>();
            
            bets.forEach((b: any) => {
                if (b.status === 'PENDING' && b.draw_id === body.draw) {
                    const current = statsMap.get(b.numbers) || 0;
                    statsMap.set(b.numbers, current + b.amount_bigint);
                }
            });

            const stats = Array.from(statsMap.entries()).map(([number, total]) => ({
                number,
                total_sold: total,
                risk_percentage: 0 
            }));

            return { data: { stats } as any };
        }
        
        if (functionName === 'updateRiskLimit') {
            MockDB.saveLimit({
                draw_type: body.draw,
                number: body.number,
                max_amount: body.max_amount
            });
            return { data: { success: true } as any };
        }

        if (functionName === 'getMaintenanceSettings') {
            return { data: MockDB.getSettingsList() as any };
        }
        if (functionName === 'updateMaintenanceSetting') {
            MockDB.updateSetting(body.key, body.value);
            return { data: { success: true } as any };
        }
        if (functionName === 'getCatalogs') {
            return { data: [] as any };
        }
        if (functionName === 'analyzePurge') {
            return { data: MockDB.analyzePurge(body.target, body.days) as any };
        }
        if (functionName === 'executePurge') {
            if (body.target === 'DEEP_CLEAN') {
                let count = 0;
                count += MockDB.executePurge('BETS_HISTORY', body.days);
                count += MockDB.executePurge('AUDIT_LOGS', body.days);
                count += MockDB.executePurge('RESULTS_HISTORY', body.days);
                count += MockDB.executePurge('LEDGER_OLD', body.days);
                
                MockDB.addAudit({
                    actor_id: body.actor_id,
                    action: 'DEEP_SYSTEM_PURGE',
                    type: AuditEventType.ADMIN_PURGE,
                    severity: AuditSeverity.FORENSIC,
                    target_resource: 'ALL_HISTORICAL_DATA',
                    metadata: { records_deleted: count, cutoff_days: body.days }
                });
                return { data: { success: true, count } as any };
            }
            
            const count = MockDB.executePurge(body.target, body.days);
            return { data: { success: true, count } as any };
        }
        
        if (functionName === 'getWeeklyDataStats') {
            const bets = MockDB.getBets();
            const weeksMap = new Map<string, WeeklyDataStats>();
            
            const getWeek = (d: Date) => {
                const onejan = new Date(d.getFullYear(), 0, 1);
                return Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
            };

            bets.forEach((b: any) => {
                const date = new Date(b.created_at);
                const weekNum = getWeek(date);
                const year = date.getFullYear();
                const key = `${year}-${weekNum}`;
                
                if (!weeksMap.has(key)) {
                    const startOfWeek = new Date(date);
                    const day = startOfWeek.getDay() || 7; 
                    if(day !== 1) startOfWeek.setHours(-24 * (day - 1));
                    
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);

                    weeksMap.set(key, {
                        year,
                        weekNumber: weekNum,
                        recordCount: 0,
                        startDate: startOfWeek.toISOString(),
                        endDate: endOfWeek.toISOString(),
                        sizeEstimate: '0 KB'
                    });
                }
                
                const stats = weeksMap.get(key)!;
                stats.recordCount++;
            });
            
            const statsArray = Array.from(weeksMap.values()).map(s => ({
                ...s,
                sizeEstimate: `${(s.recordCount * 0.5).toFixed(1)} KB` 
            })).sort((a,b) => a.weekNumber - b.weekNumber);

            if (statsArray.length === 0) {
                const now = new Date();
                for(let i=0; i<8; i++) {
                    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
                    const weekNum = getWeek(d);
                    statsArray.unshift({
                        year: d.getFullYear(),
                        weekNumber: weekNum,
                        recordCount: Math.floor(Math.random() * 5000) + 500,
                        startDate: d.toISOString(),
                        endDate: d.toISOString(),
                        sizeEstimate: `${Math.floor(Math.random() * 2000)} KB`
                    });
                }
            }

            return { data: { stats: statsArray } as any };
        }
        
        if (functionName === 'purgeWeeklyData') {
            if (body.confirmation === 'PURGA TOTAL SISTEMA') {
                 let count = 0;
                 const currentWeek = 52; 
                 const diffWeeks = currentWeek - body.weekNumber;
                 const days = diffWeeks * 7;
                 
                 count += MockDB.executePurge('BETS_HISTORY', days);
                 count += MockDB.executePurge('AUDIT_LOGS', days);
                 count += MockDB.executePurge('RESULTS_HISTORY', days);
                 count += MockDB.executePurge('LEDGER_OLD', days);
                 
                 MockDB.addAudit({
                    actor_id: body.actor_id,
                    action: 'DEEP_SYSTEM_PURGE',
                    type: AuditEventType.ADMIN_PURGE,
                    severity: AuditSeverity.FORENSIC,
                    target_resource: `WEEK-${body.weekNumber}-ALL`,
                    metadata: { records_deleted: count }
                });
                return { data: { success: true, message: 'Sistema purgado.' } as any };
            }

            if (body.confirmation !== 'CONFIRMAR LIMPIEZA' && body.confirmation !== 'ARCHIVAR LOGS') return { error: 'Confirmación inválida' };
            
            MockDB.addAudit({
                actor_id: body.actor_id,
                action: 'PURGE_WEEKLY_DATA',
                type: AuditEventType.ADMIN_PURGE,
                severity: AuditSeverity.WARNING,
                target_resource: `WEEK-${body.weekNumber}`,
                metadata: { year: body.year }
            });
            return { data: { success: true, message: 'Limpieza realizada' } as any };
        }

        return { message: 'Simulación exitosa' } as any;
    }

    const response = await fetch(`${(supabase as any).supabaseUrl}${FUNCTION_BASE_URL}/${functionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify(body)
    });
    return await response.json() as ApiResponse<T>;

  } catch (error: any) {
    console.error("API Error:", error);
    return { error: error.message || 'Error de red' };
  }
}

export const api = {
  createUser: async (payload: any) => invokeEdgeFunction<{ user: AppUser }>('createUser', payload),
  checkIdentityAvailability: async (cedula: string) => invokeEdgeFunction<AppUser | null>('checkIdentity', { cedula }),
  updateUserStatus: async (payload: any) => invokeEdgeFunction<any>('updateUserStatus', payload),
  deleteUser: async (payload: any) => invokeEdgeFunction<any>('deleteUser', payload),
  rechargeUser: async (payload: any) => invokeEdgeFunction<TransactionResponse>('rechargeUser', payload),
  withdrawUser: async (payload: any) => invokeEdgeFunction<TransactionResponse>('withdrawUser', payload),
  payVendor: async (payload: any) => invokeEdgeFunction<{ ticket_code: string }>('payVendor', payload),
  getServerTime: async () => invokeEdgeFunction<{ server_time: string; draw_config: any }>('getServerTime', {}),
  getGlobalSettings: async () => invokeEdgeFunction<{ multiplier_tiempos: number; multiplier_reventados: number }>('getGlobalSettings', {}),
  updateGlobalMultiplier: async (payload: any) => invokeEdgeFunction<any>('updateGlobalMultiplier', payload),
  placeBet: async (payload: any) => invokeEdgeFunction<{ bet_id: string; ticket_code: string }>('placeBet', payload),
  getGlobalBets: async (payload: any) => invokeEdgeFunction<{ bets: Bet[] }>('getGlobalBets', payload),
  getLiveResults: async () => invokeEdgeFunction<{ results: DrawResult[]; history: DrawResult[] }>('getLiveResults', {}),
  publishDrawResult: async (payload: DrawResultPayload) => invokeEdgeFunction<any>('publishDrawResult', payload),
  getRiskLimits: async (payload: any) => invokeEdgeFunction<any>('getRiskLimits', payload),
  getRiskStats: async (payload: any) => invokeEdgeFunction<any>('getRiskStats', payload),
  updateRiskLimit: async (payload: any) => invokeEdgeFunction<any>('updateRiskLimit', payload),
  generateRiskAnalysis: async (payload: { draw: string }) => invokeEdgeFunction<RiskAnalysisReport>('generateRiskAnalysis', payload),
  maintenance: {
      getSettings: async () => invokeEdgeFunction<SystemSetting[]>('getMaintenanceSettings', {}),
      updateSetting: async (payload: { key: string; value: any; actor_id: string }) => invokeEdgeFunction<void>('updateMaintenanceSetting', payload),
      getCatalogs: async (payload: { category?: string }) => invokeEdgeFunction<MasterCatalogItem[]>('getCatalogs', payload),
      upsertCatalog: async (payload: any) => invokeEdgeFunction<MasterCatalogItem>('upsertCatalog', payload),
      softDeleteCatalog: async (payload: { id: string; actor_id: string }) => invokeEdgeFunction<void>('softDeleteCatalog', payload),
      analyzePurge: async (payload: { target: PurgeTarget; days: number }) => invokeEdgeFunction<PurgeAnalysis>('analyzePurge', payload),
      executePurge: async (payload: { target: PurgeTarget; days: number; actor_id: string }) => invokeEdgeFunction<{ success: boolean; count: number }>('executePurge', payload)
  },
  purgeSystem: async (payload: { confirm_phrase: string; actor_id?: string }) => invokeEdgeFunction<{ ok: boolean; message: string }>('purgeSystem', payload),
  getWeeklyDataStats: async (payload: { year: number }) => invokeEdgeFunction<{ stats: WeeklyDataStats[] }>('getWeeklyDataStats', payload),
  purgeWeeklyData: async (payload: { year: number; weekNumber: number; confirmation: string; actor_id: string }) => invokeEdgeFunction<{ success: boolean; message: string }>('purgeWeeklyData', payload),
  generateAIAnalysis: async (payload: { drawTime: string }) => invokeEdgeFunction<any>('generateAIAnalysis', payload),
};
