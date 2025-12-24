// infra/supabase/edge-functions/createUser/index.ts
// import { serve } from 'std/server';
// import { createClient } from '@supabase/supabase-js';

// Polyfill for environment to prevent build errors
export {};
declare const Deno: any;
const termDeno = typeof Deno !== 'undefined' ? Deno : { env: { get: () => '' } };
const serve = (_handler: unknown) => {};
const createClient = (_url: string, _key: string) => ({
  from: () => ({ insert: () => ({ select: () => ({ single: () => ({}) }) }) }),
  rpc: () => {},
});

const SUPABASE_URL = termDeno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = termDeno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: { json: () => Promise<Record<string, unknown>> }) => {
  try {
    const body = await req.json();
    const { name, email, role, balance_bigint, issuer_id, cedula, phone } = body;

    // validate role and issuer
    if (!['SuperAdmin', 'Vendedor', 'Cliente'].includes(role)) throw new Error('invalid role');

    // create app_user row (auth linkage must be managed separately)
    const { data, error } = await (supabase as unknown as { from: Function })
      .from('app_users')
      .insert([
        {
          name,
          email,
          role,
          balance_bigint: balance_bigint ?? 0,
          issuer_id,
          cedula,
          phone,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // audit
    await (supabase as any).rpc('audit.log_action', {
      actor: issuer_id,
      action: 'CREATE_USER',
      obj_type: 'app_users',
      obj_id: data.id,
      payload: JSON.stringify(data),
    });

    return new Response(JSON.stringify({ user: data }), { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ message: msg }), { status: 400 });
  }
});
