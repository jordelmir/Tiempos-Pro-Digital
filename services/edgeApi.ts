
import { supabase, MockDB } from '../lib/supabaseClient';
import { ApiResponse, AppUser, TransactionResponse, DrawResultPayload, GameMode, DrawResult, Bet, AuditEventType, AuditSeverity, WeeklyDataStats, RiskAnalysisReport, SystemSetting, MasterCatalogItem, PurgeTarget, PurgeAnalysis, LedgerTransaction, RiskAnalysisSIPR } from '../types';
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
    
    if ((supabase as any).supabaseUrl === 'https://demo.local' || !session?.access_token?.startsWith('ey')) { 
        
        await new Promise(r => setTimeout(r, 300)); 

        if (functionName === 'getMarketSettings') {
            return { data: MockDB.getSettings() as any };
        }

        if (functionName === 'updateMarketRates') {
            const res = MockDB.updateSettings({ multiplier_tiempos: body.t, multiplier_reventados: body.r });
            return { data: res as any };
        }

        if (functionName === 'getRiskAnalysisSIPR') {
            const analysis = MockDB.getRiskAnalysisSIPR(body.drawTime);
            return { data: analysis as any };
        }

        if (functionName === 'redeemLoyaltyPoints') {
            const res = MockDB.executeRedeem(body.userId);
            return res as any;
        }

        if (functionName === 'placeBet') {
            const users = MockDB.getUsers();
            const user = users.find((u: any) => u.auth_uid === body.auth_uid || u.id === body.userId);
            if (!user) return { error: 'Usuario no autenticado' };

            const sipr = MockDB.getRiskAnalysisSIPR(body.draw_id);
            const targetRisk = sipr.find(s => s.number === body.numbers);
            if (targetRisk?.is_blocked) {
                return { error: 'SIPR_BLOCK: Límite de Riesgo Alcanzado para este Vector' };
            }

            if (user.balance_bigint < body.amount) return { error: 'Saldo insuficiente' };
            
            const oldBalance = user.balance_bigint;
            const newBalance = oldBalance - body.amount;
            user.balance_bigint = newBalance;

            if (targetRisk?.is_recommended) {
                user.loyalty_points = (user.loyalty_points || 0) + 1;
            }

            MockDB.saveUser(user);
            const ticketCode = generateTicketCode('BT');
            const newBet = { id: `bet-${Date.now()}-${Math.random()}`, ticket_code: ticketCode, user_id: user.id, draw_id: body.draw_id, amount_bigint: body.amount, numbers: body.numbers, mode: body.mode, region: body.region || 'CR', status: 'PENDING', created_at: new Date().toISOString() };
            MockDB.addBet(newBet);
            
            MockDB.addTransaction({ id: `tx-bet-${Date.now()}`, user_id: user.id, amount_bigint: -body.amount, balance_before: oldBalance, balance_after: newBalance, type: 'DEBIT', reference_id: ticketCode, meta: { description: `Apuesta: ${body.numbers}`, loyalty_awarded: targetRisk?.is_recommended ? 1 : 0 }, created_at: new Date().toISOString() });
            
            return { data: { bet_id: newBet.id, ticket_code: ticketCode, loyalty_points: user.loyalty_points } as any };
        }

        if (functionName === 'getServerTime') { return { data: { server_time: new Date().toISOString() } as any }; }
        if (functionName === 'deleteUser') { return { message: 'Nodo eliminado' } as any; }
        if (functionName === 'updateUserStatus') { return { message: 'Estado actualizado' } as any; }
        if (functionName === 'payVendor') { return { data: { ticket_code: 'TX-PAY-' + Date.now().toString(36).toUpperCase() } as any }; }
        
        if (functionName === 'getSettings') { return { data: MockDB.getSettings() as any }; }
        if (functionName === 'updateSetting') { return { message: 'Parámetro actualizado' } as any; }
        if (functionName === 'getCatalogs') { return { data: [] as any }; }
        if (functionName === 'upsertCatalog') { return { data: body as any }; }
        if (functionName === 'softDeleteCatalog') { return { message: 'Catálogo removido' } as any; }

        if (functionName === 'getGlobalBets') { 
            const bets = MockDB.getBets();
            return { data: { bets } as any };
        }
        if (functionName === 'getLiveResults') {
            const results = MockDB.getResults();
            return { data: { results, history: results } as any };
        }
        if (functionName === 'publishDrawResult') {
            const res = { ...body, id: `res-${Date.now()}`, status: 'CLOSED', created_at: new Date().toISOString() };
            MockDB.saveResult(res);
            return { data: res as any };
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
  redeemLoyaltyPoints: (userId: string) => invokeEdgeFunction<any>('redeemLoyaltyPoints', { userId }),
  createUser: async (payload: any) => invokeEdgeFunction<{ user: AppUser }>('createUser', payload),
  rechargeUser: async (payload: any) => invokeEdgeFunction<TransactionResponse>('rechargeUser', payload),
  withdrawUser: async (payload: any) => invokeEdgeFunction<TransactionResponse>('withdrawUser', payload),
  deleteUser: async (payload: any) => invokeEdgeFunction<any>('deleteUser', payload),
  updateUserStatus: async (payload: any) => invokeEdgeFunction<any>('updateUserStatus', payload),
  payVendor: async (payload: any) => invokeEdgeFunction<{ ticket_code: string }>('payVendor', payload),
  getServerTime: async () => invokeEdgeFunction<{ server_time: string }>('getServerTime', {}),
  placeBet: async (payload: any) => invokeEdgeFunction<{ bet_id: string; ticket_code: string }>('placeBet', payload),
  getGlobalBets: async (payload: any) => invokeEdgeFunction<{ bets: Bet[] }>('getGlobalBets', payload),
  getLiveResults: async () => invokeEdgeFunction<{ results: DrawResult[]; history: DrawResult[] }>('getLiveResults', {}),
  publishDrawResult: async (payload: DrawResultPayload) => invokeEdgeFunction<any>('publishDrawResult', payload),
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
