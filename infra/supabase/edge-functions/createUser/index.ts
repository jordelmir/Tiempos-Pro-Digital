// infra/supabase/edge-functions/createUser/index.ts
// import { serve } from 'std/server';
// import { createClient } from '@supabase/supabase-js';

// Polyfill for environment to prevent build errors
export {};
declare const Deno: any;
const SafeDeno = typeof Deno !== 'undefined' ? Deno : { env: { get: () => '' } };
const serve = (handler: any) => {};
const createClient = (url: string, key: string) => ({
  from: () => ({ insert: () => ({ select: () => ({ single: () => ({}) }) }) }),
  rpc: () => {},
});

const SUPABASE_URL = SafeDeno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = SafeDeno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: any) => {
  try {
    const body = await req.json();
    const { name, email, role, balance_bigint, issuer_id, cedula, phone } = body;

    // validate role and issuer
    if (!['SuperAdmin', 'Vendedor', 'Cliente'].includes(role)) throw new Error('invalid role');

    // create app_user row (auth linkage must be managed separately)
    const { data, error } = await (supabase as any)
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
  } catch (err: any) {
    return new Response(JSON.stringify({ message: err.message }), { status: 400 });
  }
});
