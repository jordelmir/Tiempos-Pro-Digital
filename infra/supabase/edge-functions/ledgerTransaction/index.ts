// infra/supabase/edge-functions/ledgerTransaction/index.ts
// import { serve } from 'std/server';
// import { createClient } from '@supabase/supabase-js';

export {};
declare const Deno: any;
const SafeDeno = typeof Deno !== 'undefined' ? Deno : { env: { get: () => '' } };
const serve = (handler: any) => {}; 
const createClient = (url: string, key: string) => ({ rpc: () => {} });

const SUPABASE_URL = SafeDeno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = SafeDeno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: any) => {
  try {
    const { user_id, amount_bigint, type, reference_id, actor_id } = await req.json();

    // transaction via RPC function to ensure atomic update
    const { error } = await (supabase as any).rpc('ledger.perform_transaction', {
      p_user_id: user_id,
      p_amount: amount_bigint,
      p_type: type,
      p_reference_id: reference_id,
      p_actor: actor_id
    });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err:any) {
    return new Response(JSON.stringify({ message: err.message }), { status: 400 });
  }
});