import { supabase, MockDB } from '../lib/supabaseClient';
import {
  ApiResponse,
  AppUser,
  TransactionResponse,
  DrawResultPayload,
  GameMode,
  DrawResult,
  Bet,
  AuditEventType,
  AuditSeverity,
  WeeklyDataStats,
  RiskAnalysisReport,
  SystemSetting,
  MasterCatalogItem,
  PurgeTarget,
  PurgeAnalysis,
  LedgerTransaction,
} from '../types';
import { formatCurrency } from '../constants';

const FUNCTION_BASE_URL = '/functions/v1';

const generateTicketCode = (prefix: string) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result.substring(0, 3)}-${result.substring(3, 6)}`;
};

async function invokeEdgeFunction<T>(functionName: string, body: unknown): Promise<ApiResponse<T>> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // --- DEMO MODE INTERCEPTOR (THE GAME ENGINE) ---
    if (
      (supabase as any).supabaseUrl === 'https://demo.local' ||
      !session?.access_token.startsWith('ey')
    ) {
      await new Promise((r) => setTimeout(r, 300));

      // 1. CLOCK & CONFIG
      if (functionName === 'getServerTime') {
        return {
          data: {
            server_time: new Date().toISOString(),
            draw_config: { mediodia: '12:55:00', tarde: '16:30:00', noche: '19:30:00' },
          },
        };
      }

      if (functionName === 'getGlobalSettings') {
        const settings = MockDB.getSettings();
        return { data: settings };
      }

      if (functionName === 'updateGlobalMultiplier') {
        MockDB.saveSettings({
          multiplier_tiempos: body.baseValue,
          multiplier_reventados: body.reventadosValue,
        });
        MockDB.addAudit({
          actor_id: body.actor_id,
          action: 'UPDATE_GLOBAL_MULTIPLIER',
          type: AuditEventType.ADMIN_SETTINGS,
          severity: AuditSeverity.WARNING,
          metadata: { base: body.baseValue, rev: body.reventadosValue },
        });
        return { data: { success: true } };
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
          balance_bigint: body.balance_bigint || 0,
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
            created_at: new Date().toISOString(),
          });
        }

        MockDB.addAudit({
          actor_id: body.issuer_id || 'system',
          action: 'CREATE_USER',
          type: AuditEventType.IDENTITY_REGISTER,
          severity: AuditSeverity.INFO,
          target_resource: newUser.id,
          metadata: { role: newUser.role, name: newUser.name },
        });
        return { data: { user: newUser as AppUser } };
      }

      if (functionName === 'checkIdentity') {
        const users = MockDB.getUsers();
        const exists = users.find((u: AppUser) => u.cedula === body.cedula);
        return { data: exists || null };
      }

      if (functionName === 'rechargeUser') {
        const users = MockDB.getUsers();
        const user = users.find((u: AppUser) => u.id === body.target_user_id);
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
          created_at: new Date().toISOString(),
        });

        MockDB.addAudit({
          actor_id: body.actor_id,
          action: 'USER_RECHARGE',
          type: AuditEventType.TX_DEPOSIT,
          severity: AuditSeverity.INFO,
          target_resource: user.id,
          metadata: { amount: body.amount, new_balance: newBalance },
        });

        return { data: { new_balance: newBalance, tx_id: `TX-${Date.now()}` } };
      }

      if (functionName === 'withdrawUser') {
        const users = MockDB.getUsers();
        const user = users.find((u: AppUser) => u.id === body.target_user_id);
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
          created_at: new Date().toISOString(),
        });

        MockDB.addAudit({
          actor_id: body.actor_id,
          action: 'USER_WITHDRAWAL',
          type: AuditEventType.TX_WITHDRAWAL,
          severity: AuditSeverity.WARNING,
          target_resource: user.id,
          metadata: { amount: body.amount, new_balance: newBalance },
        });

        return { data: { new_balance: newBalance, tx_id: txId } };
      }

      if (functionName === 'payVendor') {
        const users = MockDB.getUsers();
        const user = users.find((u: AppUser) => u.id === body.target_user_id);
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
          created_at: new Date().toISOString(),
        });

        MockDB.addAudit({
          actor_id: body.actor_id,
          action: 'VENDOR_PAYMENT',
          type: AuditEventType.FINANCIAL_OP,
          severity: AuditSeverity.CRITICAL,
          target_resource: user.id,
          metadata: { amount: body.amount, concept: body.concept },
        });

        return { data: { ticket_code: txCode } };
      }

      if (functionName === 'updateUserStatus') {
        const users = MockDB.getUsers();
        const user = users.find((u: AppUser) => u.id === body.target_user_id);
        if (user) {
          user.status = body.status;
          MockDB.saveUser(user);
          MockDB.addAudit({
            actor_id: body.actor_id,
            action: body.status === 'Active' ? 'USER_UNBLOCK' : 'USER_BLOCK',
            type: AuditEventType.ADMIN_BLOCK,
            severity: AuditSeverity.WARNING,
            target_resource: user.id,
          });
          return { data: { success: true } };
        }
        return { error: 'Usuario no encontrado' };
      }

      if (functionName === 'deleteUser') {
        if (body.confirmation !== 'ELIMINAR NODO')
          return { error: 'Frase de confirmación incorrecta' };
        MockDB.deleteUser(body.target_user_id);
        MockDB.addAudit({
          actor_id: body.actor_id,
          action: 'USER_DELETE',
          type: AuditEventType.ADMIN_PURGE,
          severity: AuditSeverity.CRITICAL,
          target_resource: body.target_user_id,
        });
        return { data: { success: true } };
      }

      // 3. BETTING ENGINE (CORE)
      if (functionName === 'placeBet') {
        const { data: authData } = await supabase.auth.getUser();
        const users = MockDB.getUsers();
        const user = users.find((u: AppUser) => u.auth_uid === authData.user?.id);

        if (!user) return { error: 'Usuario no autenticado' };
        if (user.balance_bigint < body.amount) return { error: 'Saldo insuficiente' };

        const limits = MockDB.getLimits();
        const limitObj = limits.find(
          (l: any) => l.number === body.numbers && l.draw_type === body.draw_id
        );

        const settingsList = MockDB.getSettingsList();
        const globalLimitSetting = settingsList.find(
          (s: SystemSetting) => s.key === 'GLOBAL_LIMIT'
        );

        let limit = Infinity;
        if (limitObj && limitObj.max_amount !== -2) {
          limit = limitObj.max_amount;
        } else if (globalLimitSetting) {
          const val = Number(globalLimitSetting.value);
          if (val > 0) limit = val * 100;
        }

        const bets = MockDB.getBets();
        const currentExposure = bets
          .filter(
            (b: any) =>
              b.numbers === body.numbers && b.draw_id === body.draw_id && b.status === 'PENDING'
          )
          .reduce((acc: number, b: Bet) => acc + b.amount_bigint, 0);

        if (limit !== -1 && currentExposure + body.amount > limit) {
          return {
            error: `LIMIT_REACHED: Límite de riesgo excedido para el ${body.numbers}. Disp: ${formatCurrency(limit - currentExposure)}`,
          };
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
          created_at: new Date().toISOString(),
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
          created_at: new Date().toISOString(),
        });

        return { data: { bet_id: newBet.id, ticket_code: ticketCode } };
      }

      if (functionName === 'getGlobalBets') {
        const bets = MockDB.getBets();
        const users = MockDB.getUsers();

        const enrichedBets = bets.map((b: Bet) => {
          const u = users.find((us: AppUser) => us.id === b.user_id);
          return {
            ...b,
            user_name: u ? u.name : 'Unknown',
            user_role: u ? u.role : 'Unknown',
            origin: u && u.role === 'Vendedor' ? 'Vendedor' : 'Jugador',
          };
        });

        let filtered = enrichedBets;
        if (body.userId && body.role !== 'SuperAdmin') {
          if (body.role === 'Vendedor') {
            const myClients = users
              .filter((u: AppUser) => u.issuer_id === body.userId)
              .map((u: AppUser) => u.id);
            filtered = enrichedBets.filter(
              (b: Bet) => b.user_id === body.userId || myClients.includes(b.user_id)
            );
          } else {
            filtered = enrichedBets.filter((b: Bet) => b.user_id === body.userId);
          }
        }

        if (body.statusFilter && body.statusFilter !== 'ALL') {
          filtered = filtered.filter((b: Bet) => b.status === body.statusFilter);
        }

        if (body.timeFilter && body.timeFilter !== 'ALL') {
          filtered = filtered.filter((b: Bet) => b.draw_id && b.draw_id.includes(body.timeFilter));
        }

        return { data: { bets: filtered } };
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
          created_at: new Date().toISOString(),
        });

        // 2. Payout Logic
        const bets = MockDB.getBets();
        const users = MockDB.getUsers();
        const settings = MockDB.getSettings();

        let processedCount = 0;
        const updatedBets = [...bets];

        updatedBets.forEach((bet: Bet) => {
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
                  meta: {
                    description: `Premio: ${bet.numbers}`,
                    multiplier: payoutMultiplier,
                    mode: bet.mode,
                  },
                  created_at: new Date().toISOString(),
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
          metadata: { draw: body.drawTime, number: body.winningNumber, winners: processedCount },
        });

        return { data: { success: true, processed: processedCount } };
      }

      if (functionName === 'getLiveResults') {
        const results = MockDB.getResults();
        // Standardizing output from already standardized DB
        return { data: { results: results as DrawResult[], history: results as DrawResult[] } };
      }

      // 5. RISK & MAINTENANCE
      if (functionName === 'getRiskLimits') {
        return { data: { limits: MockDB.getLimits() } };
      }
      if (functionName === 'getRiskStats') {
        const bets = MockDB.getBets();
        const statsMap = new Map<string, number>();

        bets.forEach((b: Bet) => {
          if (b.status === 'PENDING' && b.draw_id === body.draw) {
            const current = statsMap.get(b.numbers) || 0;
            statsMap.set(b.numbers, current + b.amount_bigint);
          }
        });

        const stats = Array.from(statsMap.entries()).map(([number, total]) => ({
          number,
          total_sold: total,
          risk_percentage: 0,
        }));

        return { data: { stats } };
      }

      if (functionName === 'updateRiskLimit') {
        MockDB.saveLimit({
          draw_type: body.draw,
          number: body.number,
          max_amount: body.max_amount,
        });
        return { data: { success: true } };
      }

      if (functionName === 'getMaintenanceSettings') {
        return { data: MockDB.getSettingsList() };
      }
      if (functionName === 'updateMaintenanceSetting') {
        MockDB.updateSetting(body.key, body.value);
        return { data: { success: true } };
      }
      if (functionName === 'getCatalogs') {
        return { data: [] as MasterCatalogItem[] };
      }
      if (functionName === 'analyzePurge') {
        return { data: MockDB.analyzePurge(body.target, body.days) };
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
            metadata: { records_deleted: count, cutoff_days: body.days },
          });
          return { data: { success: true, count } };
        }

        const count = MockDB.executePurge(body.target, body.days);
        return { data: { success: true, count } };
      }

      if (functionName === 'getWeeklyDataStats') {
        const bets = MockDB.getBets();
        const weeksMap = new Map<string, WeeklyDataStats>();

        const getWeek = (d: Date) => {
          const onejan = new Date(d.getFullYear(), 0, 1);
          return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
        };

        bets.forEach((b: Bet) => {
          const date = new Date(b.created_at);
          const weekNum = getWeek(date);
          const year = date.getFullYear();
          const key = `${year}-${weekNum}`;

          if (!weeksMap.has(key)) {
            const startOfWeek = new Date(date);
            const day = startOfWeek.getDay() || 7;
            if (day !== 1) startOfWeek.setHours(-24 * (day - 1));

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            weeksMap.set(key, {
              year,
              weekNumber: weekNum,
              recordCount: 0,
              startDate: startOfWeek.toISOString(),
              endDate: endOfWeek.toISOString(),
              sizeEstimate: '0 KB',
            });
          }

          const stats = weeksMap.get(key)!;
          stats.recordCount++;
        });

        const statsArray = Array.from(weeksMap.values())
          .map((s) => ({
            ...s,
            sizeEstimate: `${(s.recordCount * 0.5).toFixed(1)} KB`,
          }))
          .sort((a, b) => a.weekNumber - b.weekNumber);

        if (statsArray.length === 0) {
          const now = new Date();
          for (let i = 0; i < 8; i++) {
            const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            const weekNum = getWeek(d);
            statsArray.unshift({
              year: d.getFullYear(),
              weekNumber: weekNum,
              recordCount: Math.floor(Math.random() * 5000) + 500,
              startDate: d.toISOString(),
              endDate: d.toISOString(),
              sizeEstimate: `${Math.floor(Math.random() * 2000)} KB`,
            });
          }
        }

        return { data: { stats: statsArray } };
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
            metadata: { records_deleted: count },
          });
          return { data: { success: true, message: 'Sistema purgado.' } };
        }

        if (body.confirmation !== 'CONFIRMAR LIMPIEZA' && body.confirmation !== 'ARCHIVAR LOGS')
          return { error: 'Confirmación inválida' };

        MockDB.addAudit({
          actor_id: body.actor_id,
          action: 'PURGE_WEEKLY_DATA',
          type: AuditEventType.ADMIN_PURGE,
          severity: AuditSeverity.WARNING,
          target_resource: `WEEK-${body.weekNumber}`,
          metadata: { year: body.year },
        });
        return { data: { success: true, message: 'Limpieza realizada' } };
      }

      return { data: { message: 'Simulación exitosa' } };
    }

    // --- DIRECT DB MODE (Serverless Fallback) ---
    // Instead of calling Edge Functions via HTTP (which requires deployment),
    // we use the Supabase Client directly to interact with the DB.
    // This allows the app to work out-of-the-box without CLI deployment.
    return await executeDirectDB<T>(functionName, body, session);
  } catch (error: any) {
    console.error('API Error:', error);
    return { error: error.message || 'Error de red' };
  }
}

// --- HYBRID CLIENT-SIDE IMPLEMENTATION ---
async function executeDirectDB<T>(
  fn: string,
  body: unknown,
  session: any
): Promise<ApiResponse<T>> {
  // AUDIT LOGGING HELPER
  const logAudit = async (
    action: string,
    type: string,
    severity: string,
    metadata: unknown = {},
    target?: string
  ) => {
    if (!session?.user?.id) return;
    try {
      await supabase.from('audit_trail').insert({
        event_id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        actor_id: session.user.id,
        actor_name: session.user.email,
        actor_role: 'User', // Simplified
        action,
        type,
        severity,
        metadata,
        target_resource: target,
        ip_address: '0.0.0.0', // Client-side limitation
      });

      // DUAL WRITE TO MONGODB (Disabled: Missing Keys)
      /*
                        try {
                           fetch('/api/audit', {
                               method: 'POST',
                               headers: {'Content-Type': 'application/json'},
                               body: JSON.stringify({ logEntry: {
                                   actor_id: session.user.id,
                                   action, type, severity, metadata,
                                   target_resource: target,
                                   timestamp: new Date()
                               }})
                           }).catch(err => console.error("Mongo Audit Failed", err));
                        } catch (ignore) {}
                        */
    } catch (e) {
      console.warn('Audit Log Failed', e);
    }
  };

  try {
    // 1. CLOCK
    if (fn === 'getServerTime') {
      const now = new Date();
      // Optional: Adjust to CR timezone if needed, but local browser time is fine for perceived sync if server is not authoritative yet.
      return {
        data: {
          server_time: now.toISOString(),
          draw_config: { mediodia: '12:55:00', tarde: '16:30:00', noche: '19:30:00' },
        },
      };
    }

    // 2. BETTING
    if (fn === 'placeBet') {
      if (!session) return { error: 'No hay sesión activa' };

      // Get Public User Profile
      const { data: profile, error: pErr } = await supabase
        .from('app_users')
        .select('*')
        .eq('auth_uid', session.user.id)
        .single();

      if (pErr || !profile) return { error: 'Error obteniendo perfil de usuario' };

      if (profile.balance_bigint < body.amount) return { error: 'SALDO INSUFICIENTE' };

      // Generate Ticket
      const ticketCode = generateTicketCode('TK');

      // Insert Bet
      // Insert Bet
      // CRITICAL FIX: We store draw_id inside 'mode' text field because draw_id column expects UUID
      // and we only have string enum. This prevents "invalid input syntax for type uuid" error.
      const { data: bet, error: bErr } = await supabase
        .from('bets')
        .insert({
          ticket_code: ticketCode,
          user_id: profile.id,
          amount_bigint: body.amount,
          numbers: body.numbers,
          mode: `${body.draw_id}:::${body.mode}`,
          draw_id: null,
          status: 'PENDING',
        })
        .select()
        .single();

      if (bErr) {
        console.error(bErr);
        return { error: 'Error al registrar apuesta en BD' };
      }

      // Update Balance
      const newBalance = profile.balance_bigint - body.amount;
      await supabase.from('app_users').update({ balance_bigint: newBalance }).eq('id', profile.id);

      // Ledger
      await supabase.from('ledger_transactions').insert({
        user_id: profile.id,
        amount_bigint: -body.amount,
        type: 'DEBIT',
        ticket_code: ticketCode,
        balance_before: profile.balance_bigint,
        balance_after: newBalance,
        meta: { description: `Apuesta ${body.numbers}`, mode: body.mode },
        reference_id: ticketCode,
      });

      await logAudit(
        'PLACE_BET',
        'GAME_BET',
        'SUCCESS',
        { ticket: ticketCode, amount: body.amount, numbers: body.numbers },
        ticketCode
      );

      return { data: { bet_id: bet.id, ticket_code: ticketCode } };
    }

    // 3. SETTINGS
    if (fn === 'getGlobalSettings') {
      const { data } = await supabase.from('system_settings').select('*');
      const multT = data?.find((s) => s.key === 'MULTIPLIER_TIEMPOS')?.value || 90;
      const multR = data?.find((s) => s.key === 'MULTIPLIER_REVENTADOS')?.value || 200;
      return {
        data: { multiplier_tiempos: Number(multT), multiplier_reventados: Number(multR) },
      };
    }

    if (fn === 'updateGlobalMultiplier') {
      try {
        // Fix: Removed non-existent 'type' column. Value is stored as JSONB.
        const { error: e1 } = await supabase.from('system_settings').upsert({
          key: 'MULTIPLIER_TIEMPOS',
          value: body.baseValue, // Pass raw value, Supabase/JSONB handles it
          updated_at: new Date().toISOString(),
        });

        const { error: e2 } = await supabase.from('system_settings').upsert({
          key: 'MULTIPLIER_REVENTADOS',
          value: body.reventadosValue,
          updated_at: new Date().toISOString(),
        });

        if (e1 || e2) throw new Error(e1?.message || e2?.message);

        await logAudit(
          'UPDATE_SETTINGS',
          'SYSTEM_CONFIG',
          'WARNING',
          {
            new_mult_tiempos: body.baseValue,
            new_mult_reventados: body.reventadosValue,
          },
          'Global Settings'
        );

        return { data: { success: true } };
      } catch (e: any) {
        console.error('Update Settings Failed:', e);
        return { error: 'Error actualizando configuración global' };
      }
    }

    // 4. USERS
    if (fn === 'rechargeUser') {
      const { data: user } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', body.target_user_id)
        .single();
      if (!user) return { error: 'Usuario no encontrado' };
      const newBal = user.balance_bigint + body.amount;
      await supabase.from('app_users').update({ balance_bigint: newBal }).eq('id', user.id);

      const txId = `DEP-${Date.now()}`;
      await supabase.from('ledger_transactions').insert({
        user_id: user.id,
        amount_bigint: body.amount,
        type: 'CREDIT',
        balance_before: user.balance_bigint,
        balance_after: newBal,
        reference_id: txId,
        meta: { desc: 'Recarga Manual' },
      });
      await logAudit(
        'USER_RECHARGE',
        'TX_DEPOSIT',
        'SUCCESS',
        { amount: body.amount, newBalance: newBal },
        user.id
      );
      return { data: { new_balance: newBal, tx_id: txId } };
    }

    if (fn === 'withdrawUser') {
      const { data: user } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', body.target_user_id)
        .single();
      if (!user) return { error: 'Usuario no encontrado' };
      if (user.balance_bigint < body.amount) return { error: 'Fondos insuficientes' };

      const newBal = user.balance_bigint - body.amount;
      await supabase.from('app_users').update({ balance_bigint: newBal }).eq('id', user.id);

      const txId = `WD-${Date.now()}`;
      await supabase.from('ledger_transactions').insert({
        user_id: user.id,
        amount_bigint: -body.amount,
        type: 'DEBIT',
        balance_before: user.balance_bigint,
        balance_after: newBal,
        reference_id: txId,
        meta: { desc: 'Retiro Manual' },
      });
      await logAudit(
        'USER_WITHDRAW',
        'TX_WITHDRAWAL',
        'SUCCESS',
        { amount: body.amount, newBalance: newBal },
        user.id
      );
      return { data: { new_balance: newBal, tx_id: txId } };
    }

    if (fn === 'createUser') {
      // MANAGED USER CREATION (Client-Side Implementation)
      // Allows Admin/Vendor to create downlines without needing Server-Side Auth immediately.
      // These users are 'Managed' (cannot login by themselves yet, but exist in system).

      // 0. Get Issuer Profile (The Admin/Vendor creating the user)
      const { data: issuer } = await supabase
        .from('app_users')
        .select('id')
        .eq('auth_uid', session.user.id)
        .single();
      if (!issuer) return { error: 'No tienes permiso para crear usuarios' };

      // 1. Check Uniqueness
      const { data: existing } = await supabase
        .from('app_users')
        .select('id')
        .or(`email.eq.${body.email},cedula.eq.${body.cedula}`)
        .maybeSingle();

      if (existing) return { error: 'Identidad duplicada (Cédula o Email ya existen)' };

      // 2. Insert User Profile
      const { data: newUser, error: cErr } = await supabase
        .from('app_users')
        .insert({
          name: body.name,
          cedula: body.cedula,
          email: body.email || `managed-${Date.now()}@tiempos.local`,
          phone: body.phone,
          role: body.role,
          balance_bigint: body.balance_bigint || 0,
          status: 'Active',
          issuer_id: issuer.id,
          auth_uid: null, // Managed User (No Login)
          pin_hash: body.pin, // Storing raw PIN for managed/local auth context
        })
        .select()
        .single();

      if (cErr) {
        console.error('Create User Error:', cErr);
        return { error: 'Error de integridad al crear nodo de usuario' };
      }

      // 3. Initial Ledger
      if (body.balance_bigint > 0) {
        await supabase.from('ledger_transactions').insert({
          user_id: newUser.id,
          amount_bigint: body.balance_bigint,
          balance_before: 0,
          balance_after: body.balance_bigint,
          type: 'CREDIT',
          ticket_code: `INIT-${Date.now()}`,
          meta: { description: 'Aprovisionamiento Inicial', issuer: issuer.id },
        });
      }

      // Audit Log
      await logAudit(
        'CREATE_USER',
        'IDENTITY_REGISTER',
        'FORENSIC',
        { new_user: newUser.id, role: newUser.role },
        newUser.id
      );

      return { data: { user: newUser as AppUser } };
    }

    // 5. MAINTENANCE & PURGE
    if (fn === 'analyzePurge') {
      const { target, days } = body;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (days || 30));
      const cutoffStr = cutoff.toISOString();

      let count = 0;
      let table = '';

      if (target === 'AUDIT_LOGS') table = 'audit_trail';
      if (target === 'BETS_HISTORY') table = 'bets';
      if (target === 'LEDGER_OLD') table = 'ledger_transactions';
      if (target === 'RESULTS_HISTORY') table = 'draw_results';

      if (table) {
        const { count: c } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .lt('created_at', cutoffStr);
        count = c || 0;
      }

      return {
        data: {
          recordCount: count,
          estimatedSizeKB: Math.round(count * 0.5),
          riskLevel: count > 1000 ? 'HIGH' : 'LOW',
          description: `Se encontraron ${count} registros antiguos.`,
        },
      };
    }

    if (fn === 'executePurge') {
      const { target, days } = body;

      // Calculate Date Cutoff
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (days || 30));
      const cutoffStr = cutoff.toISOString();

      let totalDeleted = 0;
      let table = '';

      if (target === 'AUDIT_LOGS') table = 'audit_trail';
      if (target === 'BETS_HISTORY') table = 'bets';
      if (target === 'LEDGER_OLD') table = 'ledger_transactions';
      if (target === 'RESULTS_HISTORY') table = 'draw_results';

      if (table) {
        // Determine time column (audit_trail uses timestamp, others uses created_at)
        const timeCol = table === 'audit_trail' ? 'timestamp' : 'created_at';

        const { count: c } = await supabase
          .from(table)
          .delete({ count: 'exact' })
          .lt(timeCol, cutoffStr);
        totalDeleted = c || 0;
      }

      await logAudit(
        'PURGE_DATA',
        'ADMIN_PURGE',
        'CRITICAL',
        { target, deleted: totalDeleted, cutoff: cutoffStr },
        'SYSTEM'
      );
      return { data: { success: true, count: totalDeleted } };
    }

    if (fn === 'updateUserStatus') {
      const { target_user_id, status } = body;
      if (!target_user_id) return { error: 'ID de usuario requerido' };
      const { error } = await supabase
        .from('app_users')
        .update({ status })
        .eq('id', target_user_id);
      if (error) return { error: 'Error actualizando estado' };
      await logAudit(
        'UPDATE_USER_STATUS',
        'SYSTEM_INTEGRITY',
        'WARNING',
        { status },
        target_user_id
      );
      return { data: { success: true } };
    }

    if (fn === 'deleteUser') {
      const { target_user_id } = body;
      if (!target_user_id) return { error: 'ID de usuario requerido' };

      // Try Hard Delete (Clean removal)
      const { error } = await supabase.from('app_users').delete().eq('id', target_user_id);

      if (error) {
        // Foreign Key Constraint (User has bets/history) -> Soft Delete
        console.warn('Hard delete failed (has history), switching to Soft Delete:', error.code);
        const { error: softErr } = await supabase
          .from('app_users')
          .update({ status: 'Deleted', name: `[Eliminado] ${target_user_id.slice(0, 4)}` })
          .eq('id', target_user_id);

        if (softErr) return { error: 'No se pudo eliminar el usuario (Error al Archivar)' };
      }
      await logAudit(
        'DELETE_USER',
        'SYSTEM_INTEGRITY',
        'CRITICAL',
        { hard_delete: !error },
        target_user_id
      );
      return { data: { success: true } };
    }

    if (fn === 'getGlobalBets') {
      // MANUAL JOIN & FILTER STRATEGY (Robust Fallback)
      // We perform manual fetch of users to avoid potential PostgREST FK detection issues
      let query = supabase.from('bets').select('*');

      if (body.userId && body.role === 'Cliente') {
        // Strict isolation for Cliente (only see own bets).
        // For Vendedor/SuperAdmin, we rely on RLS to show their scope (including downlines).
        query = query.eq('user_id', body.userId);
      }

      if (body.statusFilter && body.statusFilter !== 'ALL') {
        query = query.eq('status', body.statusFilter);
      }

      if (body.timeFilter && body.timeFilter !== 'ALL') {
        // Hack: Search for Time string inside the composite 'mode' field
        query = query.ilike('mode', `%${body.timeFilter}%`);
      }

      // Fetch Bets
      const { data: betsData, error: betsError } = await query
        .order('created_at', { ascending: false })
        .limit(100);

      if (betsError) {
        console.error('Error fetching global bets:', betsError);
        return { error: 'Error al cargar el registro de transmisiones' };
      }

      if (!betsData || betsData.length === 0) return { data: { bets: [] } };

      // Fetch Users Manually
      const userIds = [...new Set(betsData.map((b: Bet) => b.user_id).filter(Boolean))];
      let usersData: any[] = [];

      if (userIds.length > 0) {
        try {
          const { data } = await supabase
            .from('app_users')
            .select('id, name, role')
            .in('id', userIds);
          usersData = data || [];
        } catch (uErr) {
          console.error('User fetch error:', uErr);
        }
      }

      // Merge Data
      const enrichedBets = betsData.map((b: Bet) => {
        const u = usersData.find((user: AppUser) => user.id === b.user_id);
        return {
          ...b,
          user_name: u?.name || 'Desconocido',
          user_role: u?.role || 'Visitante',
        };
      });

      return { data: { bets: enrichedBets } };
    }

    if (fn === 'publishDrawResult') {
      const { date, drawTime, winningNumber, isReventado, reventadoNumber } = body;

      // 1. Insert Draw Result
      const { error: drErr } = await supabase.from('draw_results').insert({
        date,
        drawTime: drawTime,
        winningNumber: winningNumber,
        isReventado: isReventado,
        reventadoNumber: reventadoNumber,
        status: 'CLOSED',
      });

      if (drErr) return { error: 'Error registrando resultado de sorteo' };

      // 2. Resolve Bets (Strict Validation: Date + Time + Number)
      // CRITICAL: We must only select bets created ON THE SAME DAY as the draw.
      // Assuming the 'date' passed is YYYY-MM-DD.
      // We construct a strict UTC range to filter bets.
      // Note: Adjust timezone logic if the app is strictly localized (e.g. UTC-6).
      // For now, we assume bets for a day are created between 00:00 and 23:59 of that date (Local/UTC agnostic via string comparison or generous UTC range).

      const startOfDay = `${date}T00:00:00.000Z`; // Beginning of draw date
      const endOfDay = `${date}T23:59:59.999Z`; // End of draw date

      // For even stricter safety in CR style (UTC-6), we might need to shift.
      // But checking 'created_at' >= date is a solid baseline to prevent "Yesterday's bets".

      const { data: pendingBets } = await supabase
        .from('bets')
        .select('*')
        .eq('status', 'PENDING')
        .ilike('mode', `%${drawTime}%`) // Correct Time (e.g. Mediodia)
        .gte('created_at', startOfDay) // Correct Date (Start)
        .lte('created_at', endOfDay); // Correct Date (End)

      let processedCount = 0;
      if (pendingBets && pendingBets.length > 0) {
        const winners: string[] = [];
        const losers: string[] = [];
        const updates: any[] = [];

        // Normalize Winning Number (Ensure specific format)
        const normalizedWinner = String(winningNumber).trim();

        for (const bet of pendingBets) {
          const normalizedBet = String(bet.numbers).trim();
          const isWin = normalizedBet === normalizedWinner;

          if (isWin) {
            const multiplier = bet.mode.includes('200x') ? 200 : 90;
            const prize = Number(bet.amount_bigint) * multiplier;

            // Immediately Execute Payout Logic (Sequential/Parallel)
            // logic wrapped in IIFE to capture errors per bet
            updates.push(
              (async () => {
                try {
                  // 1. Mark Bet WON
                  const { error: bErr } = await supabase
                    .from('bets')
                    .update({ status: 'WON' })
                    .eq('id', bet.id);
                  if (bErr) throw new Error(`Bet status update failed: ${bErr.message}`);

                  // 2. Update Balance & Ledger (User)
                  const { data: user, error: uFetchErr } = await supabase
                    .from('app_users')
                    .select('balance_bigint')
                    .eq('id', bet.user_id)
                    .single();
                  if (uFetchErr || !user)
                    throw new Error(`User fetch failed: ${uFetchErr?.message}`);

                  const newBalance = Number(user.balance_bigint) + prize;

                  const { error: uParamsErr } = await supabase
                    .from('app_users')
                    .update({ balance_bigint: newBalance })
                    .eq('id', bet.user_id);
                  if (uParamsErr) throw new Error(`Balance update failed: ${uParamsErr.message}`);

                  await supabase.from('ledger_transactions').insert({
                    user_id: bet.user_id,
                    amount_bigint: prize,
                    type: 'PRIZE',
                    balance_before: user.balance_bigint,
                    balance_after: newBalance,
                    ticket_code: bet.ticket_code,
                    meta: {
                      draw: drawTime,
                      number: winningNumber,
                      description: 'Premio Automático',
                    },
                    reference_id: `WIN-${bet.id}-${Date.now()}`,
                  });

                  return { success: true, id: bet.id };
                } catch (e: any) {
                  console.error(`Failed to payout bet ${bet.id}:`, e);
                  await logAudit(
                    'PAYOUT_FAILURE',
                    'GAME_ERROR',
                    'CRITICAL',
                    { betId: bet.id, error: e.message },
                    bet.ticket_code
                  );
                  return { success: false, id: bet.id };
                }
              })()
            );

            winners.push(bet.id);
          } else {
            updates.push(supabase.from('bets').update({ status: 'LOST' }).eq('id', bet.id));
            losers.push(bet.id);
          }
        }

        // Wait for all updates
        await Promise.all(updates);
        processedCount = pendingBets.length;
      }

      await logAudit(
        'PUBLISH_RESULTS',
        'GAME_EVENT',
        'CRITICAL',
        { draw: drawTime, winner: winningNumber, total_processed: processedCount },
        `${date}:${drawTime}`
      );

      return { data: { success: true, processed: processedCount } };
    }

    if (fn === 'getLiveResults') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // REDIS CACHE CHECK (Disabled: Missing Keys)
      /*
                        try {
                            const cacheRes = await fetch(`/api/cache?key=live_results_${today.toISOString().split('T')[0]}`);
                            if (cacheRes.ok) {
                                const cachedData = await cacheRes.json();
                                if (cachedData) return { data: cachedData };
                            }
                        } catch (ignore) { }
                        */

      const { data } = await supabase
        .from('draw_results')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('date', { ascending: false });

      const resultPayload = { results: data || [], history: data || [] };

      // REDIS CACHE SET (Disabled: Missing Keys)
      /*
                        try {
                            await fetch(`/api/cache?key=live_results_${today.toISOString().split('T')[0]}&value=${JSON.stringify(resultPayload)}&ttl=60`, { method: 'POST' });
                        } catch (ignore) { }
                        */

      return { data: resultPayload };
    }

    if (fn === 'getWeeklyDataStats') {
      // Mock because real calculation is heavy and requires SQL function or robust query
      return { data: { stats: [] } };
    }

    console.warn(`[DirectDB] Function ${fn} not implemented. Check console.`);
    return { error: 'Función no implementada en modo directo' };
  } catch (e: any) {
    return { error: e.message };
  }
}

export const api = {
  createUser: async (payload: unknown) =>
    invokeEdgeFunction<{ user: AppUser }>('createUser', payload),
  checkIdentityAvailability: async (cedula: string) =>
    invokeEdgeFunction<AppUser | null>('checkIdentity', { cedula }),
  updateUserStatus: async (payload: unknown) =>
    invokeEdgeFunction<{ success: boolean }>('updateUserStatus', payload),
  deleteUser: async (payload: unknown) =>
    invokeEdgeFunction<{ success: boolean }>('deleteUser', payload),
  rechargeUser: async (payload: unknown) =>
    invokeEdgeFunction<TransactionResponse>('rechargeUser', payload),
  withdrawUser: async (payload: unknown) =>
    invokeEdgeFunction<TransactionResponse>('withdrawUser', payload),
  payVendor: async (payload: unknown) =>
    invokeEdgeFunction<{ ticket_code: string }>('payVendor', payload),
  getServerTime: async () =>
    invokeEdgeFunction<{ server_time: string; draw_config: Record<string, string> }>(
      'getServerTime',
      {}
    ),
  getGlobalSettings: async () =>
    invokeEdgeFunction<{ multiplier_tiempos: number; multiplier_reventados: number }>(
      'getGlobalSettings',
      {}
    ),
  updateGlobalMultiplier: async (payload: unknown) =>
    invokeEdgeFunction<{ success: boolean }>('updateGlobalMultiplier', payload),
  placeBet: async (payload: unknown) =>
    invokeEdgeFunction<{ bet_id: string; ticket_code: string }>('placeBet', payload),
  getGlobalBets: async (payload: unknown) =>
    invokeEdgeFunction<{ bets: Bet[] }>('getGlobalBets', payload),
  getLiveResults: async () =>
    invokeEdgeFunction<{ results: DrawResult[]; history: DrawResult[] }>('getLiveResults', {}),
  publishDrawResult: async (payload: DrawResultPayload) =>
    invokeEdgeFunction<{ success: boolean; processed: number }>('publishDrawResult', payload),
  getRiskLimits: async (payload: unknown) =>
    invokeEdgeFunction<{ limits: unknown[] }>('getRiskLimits', payload),
  getRiskStats: async (payload: unknown) =>
    invokeEdgeFunction<{ stats: unknown[] }>('getRiskStats', payload),
  updateRiskLimit: async (payload: unknown) =>
    invokeEdgeFunction<{ success: boolean }>('updateRiskLimit', payload),
  generateRiskAnalysis: async (payload: { draw: string }) =>
    invokeEdgeFunction<RiskAnalysisReport>('generateRiskAnalysis', payload),
  maintenance: {
    getSettings: async () => invokeEdgeFunction<SystemSetting[]>('getMaintenanceSettings', {}),
    updateSetting: async (payload: { key: string; value: unknown; actor_id: string }) =>
      invokeEdgeFunction<void>('updateMaintenanceSetting', payload),
    getCatalogs: async (payload: { category?: string }) =>
      invokeEdgeFunction<MasterCatalogItem[]>('getCatalogs', payload),
    upsertCatalog: async (payload: unknown) =>
      invokeEdgeFunction<MasterCatalogItem>('upsertCatalog', payload),
    softDeleteCatalog: async (payload: { id: string; actor_id: string }) =>
      invokeEdgeFunction<void>('softDeleteCatalog', payload),
    analyzePurge: async (payload: { target: PurgeTarget; days: number }) =>
      invokeEdgeFunction<PurgeAnalysis>('analyzePurge', payload),
    executePurge: async (payload: { target: PurgeTarget; days: number; actor_id: string }) =>
      invokeEdgeFunction<{ success: boolean; count: number }>('executePurge', payload),
  },
  purgeSystem: async (payload: { confirm_phrase: string; actor_id?: string }) =>
    invokeEdgeFunction<{ ok: boolean; message: string }>('purgeSystem', payload),
  getWeeklyDataStats: async (payload: { year: number }) =>
    invokeEdgeFunction<{ stats: WeeklyDataStats[] }>('getWeeklyDataStats', payload),
  purgeWeeklyData: async (payload: {
    year: number;
    weekNumber: number;
    confirmation: string;
    actor_id: string;
  }) => invokeEdgeFunction<{ success: boolean; message: string }>('purgeWeeklyData', payload),
  generateAIAnalysis: async (payload: { drawTime: string }) =>
    invokeEdgeFunction<Record<string, unknown>>('generateAIAnalysis', payload),
};
