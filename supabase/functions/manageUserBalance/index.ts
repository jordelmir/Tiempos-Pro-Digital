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

        const { target_user_id, amount, type, actor_id, description } = await req.json()

        // 1. Get current balance
        const { data: user, error: userError } = await supabaseClient
            .from('profiles')
            .select('balance_bigint')
            .eq('id', target_user_id)
            .single()

        if (userError) throw userError

        const oldBalance = parseInt(user.balance_bigint)
        const newBalance = type === 'CREDIT' ? oldBalance + amount : oldBalance - amount

        if (newBalance < 0) throw new Error('INSUFFICIENT_FUNDS')

        // 2. Update balance
        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ balance_bigint: newBalance })
            .eq('id', target_user_id)

        if (updateError) throw updateError

        // 3. Ledger entry
        const { data: tx, error: txError } = await supabaseClient.from('transactions').insert({
            user_id: target_user_id,
            amount_bigint: type === 'CREDIT' ? amount : -amount,
            balance_before: oldBalance,
            balance_after: newBalance,
            type: type,
            actor_id: actor_id,
            metadata: { description: description || 'Ajuste de Saldo' }
        }).select().single()

        if (txError) throw txError

        return new Response(JSON.stringify({ success: true, new_balance: newBalance, tx_id: tx.id }), {
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
