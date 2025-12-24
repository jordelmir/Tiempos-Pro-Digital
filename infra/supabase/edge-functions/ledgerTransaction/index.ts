// infra/supabase/edge-functions/ledgerTransaction/index.ts
// import { serve } from 'std/server';
// import { createClient } from '@supabase/supabase-js';

export {};
declare const Deno: any;
const termDeno = typeof Deno !== 'undefined' ? Deno : { env: { get: () => '' } };
const serve = (_handler: unknown) => {};
const createClient = (_url: string, _key: string) => ({ rpc: () => {} });

const SUPABASE_URL = termDeno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = termDeno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: { json: () => Promise<unknown> }) => {
  try {
    const { user_id, amount_bigint, type, reference_id, actor_id } = (await req.json()) as Record<
      string,
      unknown
    >;

    // transaction via RPC function to ensure atomic update
    const { error } = await (supabase as unknown as { rpc: Function }).rpc(
      'ledger.perform_transaction',
      {
        p_user_id: user_id,
        p_amount: amount_bigint,
        p_type: type,
        p_reference_id: reference_id,
        p_actor: actor_id,
      }
    );

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ message: msg }), { status: 400 });
  }
});
