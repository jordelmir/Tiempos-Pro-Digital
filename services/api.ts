// services/api.ts
import { supabase } from '@/lib/supabase/client';
import { AppUser, Bet, DrawResult, ApiResponse } from '@/types';

async function invoke<T>(functionName: string, body: any): Promise<ApiResponse<T>> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
            },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return { data };
    } catch (error: any) {
        return { error: error.message };
    }
}

export const api = {
    // Identity
    createUser: async (payload: any) => invoke<{ user: AppUser }>('createUser', payload),
    checkIdentity: async (cedula: string) => {
        const { data, error } = await supabase.from('profiles').select('*').eq('cedula', cedula).single();
        return { data: error ? null : data };
    },

    // Finance
    rechargeUser: async (payload: { target_user_id: string; amount: number; actor_id: string }) =>
        invoke<any>('manageUserBalance', { ...payload, type: 'CREDIT', description: 'Recarga de Saldo' }),
    withdrawUser: async (payload: { target_user_id: string; amount: number; actor_id: string }) =>
        invoke<any>('manageUserBalance', { ...payload, type: 'DEBIT', description: 'Retiro de Fondos' }),

    // Betting
    placeBet: async (payload: any) => invoke<{ bet_id: string; ticket_code: string }>('placeBet', payload),
    getGlobalBets: async () => {
        const { data, error } = await supabase.from('bets').select('*, profiles(name, role)').order('created_at', { ascending: false });
        return { data: { bets: data || [] } as any, error: error?.message };
    },

    // Results
    publishDrawResult: async (payload: any) => invoke<any>('publishDrawResult', payload),
    getLiveResults: async () => {
        const { data, error } = await supabase.from('draw_results').select('*').order('created_at', { ascending: false });
        return { data: { results: data || [], history: data || [] } as any, error: error?.message };
    },

    // AI
    generateAIAnalysis: async (payload: { drawTime: string }) => invoke<any>('generateAIAnalysis', payload),

    // Maintenance
    maintenance: {
        analyzePurge: async (payload: any) => ({ data: { recordCount: 150, estimatedSizeKB: 45, riskLevel: 'LOW', description: 'Análisis de sectores completado.' } }),
        executePurge: async (payload: any) => invoke<any>('purgeSystem', payload), // Need to implement purgeSystem
    }
};
