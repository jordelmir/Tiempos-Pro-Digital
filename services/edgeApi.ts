
import { supabase, MockDB } from '../lib/supabaseClient';
import { ApiResponse, AppUser, TransactionResponse, DrawResultPayload, DrawResult, Bet, AuditEventType, PurgeTarget, PurgeAnalysis, RiskAnalysisSIPR, RiskLimitPayload, SystemSetting, MasterCatalogItem } from '../types';

const FUNCTION_BASE_URL = '/functions/v1'; 

async function invokeEdgeFunction<T>(functionName: string, body: any): Promise<ApiResponse<T>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check if we are in demo mode or without a valid token
    if ((supabase as any).supabaseUrl === 'https://demo.local' || !session?.access_token?.startsWith('ey')) { 
        await new Promise(r => setTimeout(r, 300)); 

        if (functionName === 'getMarketSettings') { return { data: MockDB.getSettings() as any }; }
        if (functionName === 'updateMarketRates') { return { data: MockDB.updateSettings({ multiplier_tiempos: body.t, multiplier_reventados: body.r }) as any }; }
        if (functionName === 'getRiskAnalysisSIPR') { return { data: MockDB.getRiskAnalysisSIPR(body.drawTime) as any }; }
        if (functionName === 'updateRiskLimit') {
            MockDB.saveManualLimit(body.drawTime, body.number, body.limit_bigint);
            return { data: { success: true } as any };
        }
        
        // --- MOCK MANTENIMIENTO ---
        if (functionName === 'analyzePurge') {
            const analysis = MockDB.analyzePurge(body.target, body.days);
            return { data: analysis as any };
        }
        if (functionName === 'executePurge') {
            const count = MockDB.executePurge(body.target, body.days);
            return { data: { success: true, count } as any };
        }

        if (functionName === 'getServerTime') { return { data: { server_time: new Date().toISOString() } as any }; }
        if (functionName === 'redeemLoyaltyPoints') { return { data: { success: true } as any }; }
        if (functionName === 'createUser') {
            const newUser = { ...body, id: `u-${Date.now()}`, auth_uid: `auth-${Date.now()}`, status: 'Active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            MockDB.saveUser(newUser);
            return { data: { user: newUser } as any };
        }
        if (functionName === 'updateUserStatus') {
            const users = MockDB.getUsers();
            const user = users.find((u:any) => u.id === body.target_user_id);
            if(user) { user.status = body.status; MockDB.saveUser(user); }
            return { data: { success: true } as any };
        }
        if (functionName === 'deleteUser') {
             return { data: { success: true } as any };
        }
        if (functionName === 'payVendor') {
             return { data: { ticket_code: 'PAY-'+Math.random().toString(36).substring(7).toUpperCase() } as any };
        }
        if (functionName === 'getSettings') { return { data: [] as any }; }
        if (functionName === 'getCatalogs') { return { data: [] as any }; }

        if (functionName === 'placeBet') {
            const users = MockDB.getUsers();
            const user = users.find((u: any) => u.auth_uid === body.auth_uid || u.id === body.userId);
            if (!user) return { error: 'Usuario no autenticado' };

            const analysis = MockDB.getRiskAnalysisSIPR(body.draw_id);
            const vectorStats = analysis.find(s => s.number === body.numbers);
            
            if (vectorStats && vectorStats.is_blocked) {
                return { error: 'SIPR_BLOCK: Riesgo de Insolvencia. El vector está saturado bajo los protocolos actuales.' };
            }

            if (user.balance_bigint < body.amount) return { error: 'Saldo insuficiente' };
            user.balance_bigint -= body.amount;
            MockDB.saveUser(user);
            const newBet = { id: `bet-${Date.now()}`, ticket_code: 'BT-'+Math.random().toString(36).substring(7).toUpperCase(), user_id: user.id, draw_id: body.draw_id, amount_bigint: body.amount, numbers: body.numbers, mode: body.mode, region: body.region || 'CR', status: 'PENDING', created_at: new Date().toISOString() };
            MockDB.addBet(newBet);
            return { data: { bet_id: newBet.id, ticket_code: newBet.ticket_code } as any };
        }

        if (functionName === 'rechargeUser') {
            const users = MockDB.getUsers();
            const target = users.find((u: any) => u.id === body.target_user_id);
            if (!target) return { error: 'Usuario no encontrado' };
            target.balance_bigint += body.amount;
            MockDB.saveUser(target);
            MockDB.addTransaction({ user_id: target.id, amount_bigint: body.amount, balance_after: target.balance_bigint, type: 'CREDIT', created_at: new Date().toISOString() });
            return { data: { new_balance: target.balance_bigint, tx_id: 'TX-'+Date.now() } as any };
        }

        if (functionName === 'withdrawUser') {
            const users = MockDB.getUsers();
            const target = users.find((u: any) => u.id === body.target_user_id);
            if (!target) return { error: 'Usuario no encontrado' };
            if (target.balance_bigint < body.amount) return { error: 'Saldo insuficiente' };
            target.balance_bigint -= body.amount;
            MockDB.saveUser(target);
            MockDB.addTransaction({ user_id: target.id, amount_bigint: -body.amount, balance_after: target.balance_bigint, type: 'DEBIT', created_at: new Date().toISOString() });
            return { data: { new_balance: target.balance_bigint, tx_id: 'TX-'+Date.now() } as any };
        }

        if (functionName === 'getLiveResults') {
            return { data: { results: MockDB.getResults().filter(r => r.date === new Date().toISOString().split('T')[0]), history: MockDB.getResults() } as any };
        }

        if (functionName === 'publishDrawResult') {
            MockDB.saveResult(body);
            return { data: { success: true } as any };
        }

        if (functionName === 'getGlobalBets') {
            return { data: { bets: MockDB.getBets() } as any };
        }

        return { message: 'Operación simulada' } as any;
    }

    const response = await fetch(`${(supabase as any).supabaseUrl}${FUNCTION_BASE_URL}/${functionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify(body)
    });
    return await response.json() as ApiResponse<T>;

  } catch (error: any) {
    return { error: error.message || 'Error de red' };
  }
}

export const api = {
  getMarketSettings: () => invokeEdgeFunction<any>('getMarketSettings', {}),
  updateMarketRates: (t: number, r: number) => invokeEdgeFunction<any>('updateMarketRates', { t, r }),
  getRiskAnalysisSIPR: (drawTime: string) => invokeEdgeFunction<RiskAnalysisSIPR[]>('getRiskAnalysisSIPR', { drawTime }),
  updateRiskLimit: (payload: RiskLimitPayload) => invokeEdgeFunction<any>('updateRiskLimit', payload),
  placeBet: async (payload: any) => invokeEdgeFunction<{ bet_id: string; ticket_code: string }>('placeBet', payload),
  rechargeUser: async (payload: any) => invokeEdgeFunction<TransactionResponse>('rechargeUser', payload),
  withdrawUser: async (payload: any) => invokeEdgeFunction<TransactionResponse>('withdrawUser', payload),
  getGlobalBets: async (payload: any) => invokeEdgeFunction<{ bets: Bet[] }>('getGlobalBets', payload),
  getLiveResults: async () => invokeEdgeFunction<{ results: DrawResult[]; history: DrawResult[] }>('getLiveResults', {}),
  publishDrawResult: async (payload: DrawResultPayload) => invokeEdgeFunction<any>('publishDrawResult', payload),
  
  createUser: async (payload: any) => invokeEdgeFunction<{ user: AppUser }>('createUser', payload),
  deleteUser: async (payload: any) => invokeEdgeFunction<any>('deleteUser', payload),
  updateUserStatus: async (payload: any) => invokeEdgeFunction<any>('updateUserStatus', payload),
  payVendor: async (payload: any) => invokeEdgeFunction<{ ticket_code: string }>('payVendor', payload),
  getServerTime: async () => invokeEdgeFunction<{ server_time: string }>('getServerTime', {}),
  redeemLoyaltyPoints: async (userId: string) => invokeEdgeFunction<any>('redeemLoyaltyPoints', { userId }),

  maintenance: {
      getSettings: async () => invokeEdgeFunction<SystemSetting[]>('getSettings', {}),
      updateSetting: async (payload: any) => invokeEdgeFunction<any>('updateSetting', payload),
      getCatalogs: async (payload: { category?: string }) => invokeEdgeFunction<MasterCatalogItem[]>('getCatalogs', payload),
      upsertCatalog: async (payload: any) => invokeEdgeFunction<MasterCatalogItem>('upsertCatalog', payload),
      softDeleteCatalog: async (payload: any) => invokeEdgeFunction<any>('softDeleteCatalog', payload),
      analyzePurge: async (payload: { target: PurgeTarget; days: number }) => invokeEdgeFunction<PurgeAnalysis>('analyzePurge', payload),
      executePurge: async (payload: { target: PurgeTarget; days: number; actor_id: string }) => invokeEdgeFunction<{ success: boolean; count: number }>('executePurge', payload)
  }
};
