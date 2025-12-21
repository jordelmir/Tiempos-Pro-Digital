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

        const { date, drawTime, winningNumber, isReventado, reventadoNumber, actor_id } = await req.json()

        // 1. Insert Result
        const { data: resData, error: resError } = await supabaseClient
            .from('draw_results')
            .insert({
                date,
                draw_id: drawTime,
                winning_number: winningNumber,
                is_reventado: isReventado,
                reventado_number: reventadoNumber,
                status: 'CLOSED'
            })
            .select()
            .single()

        if (resError) throw resError

        // 2. Process Payouts via RPC
        const { data: processed, error: payError } = await supabaseClient.rpc('payout_draw', {
            p_draw_id: drawTime,
            p_draw_date: date,
            p_winning_number: winningNumber,
            p_is_reventado: isReventado
        })

        if (payError) throw payError

        return new Response(JSON.stringify({ success: true, processed }), {
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
