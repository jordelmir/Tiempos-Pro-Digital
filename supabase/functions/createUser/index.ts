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

        const { name, cedula, email, phone, role, balance_bigint, issuer_id, pin } = await req.json()

        // 1. Create Auth User
        const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
            email: email,
            password: pin, // Using pin as initial password
            email_confirm: true,
            user_metadata: { name, cedula, role }
        })

        if (authError) throw authError

        // 2. Create Profile
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .insert({
                id: authUser.user.id,
                name,
                cedula,
                phone,
                role,
                balance_bigint: balance_bigint || 0,
                issuer_id,
                pin_hash: pin // In real app, hash this properly
            })
            .select()
            .single()

        if (profileError) throw profileError

        // 3. Initial Ledger Entry if balance > 0
        if (balance_bigint > 0) {
            await supabaseClient.from('transactions').insert({
                user_id: authUser.user.id,
                amount_bigint: balance_bigint,
                balance_before: 0,
                balance_after: balance_bigint,
                type: 'CREDIT',
                metadata: { info: 'Saldo inicial' }
            })
        }

        return new Response(JSON.stringify({ user: profile }), {
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
