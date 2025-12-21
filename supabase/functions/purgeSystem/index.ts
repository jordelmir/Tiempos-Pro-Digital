import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { target, days, actor_id } = await req.json()

        let tableName = '';
        if (target === 'BETS_HISTORY') tableName = 'bets';
        else if (target === 'AUDIT_LOGS') tableName = 'logs'; // schema audit
        else if (target === 'RESULTS_HISTORY') tableName = 'draw_results';
        else if (target === 'LEDGER_OLD') tableName = 'transactions'; // schema ledger

        if (!tableName) throw new Error('INVALID_TARGET');

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        let query = supabaseClient.from(tableName).delete().lt('created_at', cutoffDate.toISOString());

        // Manual schema adjustment for audit and ledger
        if (target === 'AUDIT_LOGS') query = supabaseClient.schema('audit').from('logs').delete().lt('timestamp', cutoffDate.toISOString());
        if (target === 'LEDGER_OLD') query = supabaseClient.schema('ledger').from('transactions').delete().lt('created_at', cutoffDate.toISOString());

        const { data, count, error } = await query;

        if (error) throw error

        return new Response(JSON.stringify({ success: true, count: count || 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
