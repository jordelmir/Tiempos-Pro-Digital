// infra/supabase/edge-functions/purgeSystem/index.ts
// import { serve } from 'std/server';
// import { createClient } from '@supabase/supabase-js';

export {};
declare const Deno: any;
const termDeno = typeof Deno !== 'undefined' ? Deno : { env: { get: () => '' } };
const serve = (_handler: unknown) => {};
const createClient = (_url: string, _key: string) => ({ from: () => ({ insert: () => {} }) });

const SUPABASE_URL = termDeno.env.get('SUPABASE_URL')!;
const _KEY = termDeno.env.get('PURGE_MASTER_KEY')!;
const supabase = createClient(SUPABASE_URL, termDeno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (req: { json: () => Promise<Record<string, unknown>> }) => {
  try {
    const { confirm_phrase, actor_id } = await req.json();
    if (confirm_phrase !== 'CONFIRMAR PURGA TOTAL') throw new Error('invalid phrase');
    // validate MFA (external) - example: check mfa_token in audit or external service
    const mfaOk = true; // implement real check
    if (!mfaOk) throw new Error('MFA failed');

    // create snapshot & schedule purge (avoid immediate destructive action)
    await (supabase as unknown as { from: Function })
      .from('audit.trail')
      .insert([
        { actor_app_user: actor_id, action: 'SCHEDULE_PURGE', payload: { confirm_phrase } },
      ]);

    // Optionally trigger a DB job / webhook to perform purge after multi-sig approval
    return new Response(
      JSON.stringify({ ok: true, message: 'Scheduled purge; requires multisig release' }),
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ message: msg }), { status: 400 });
  }
});
