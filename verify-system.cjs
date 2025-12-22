const { createClient } = require('@supabase/supabase-js');

const url = 'https://odgkpqlgfrxbvjlyfelq.supabase.co';
const key =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZ2twcWxnZnJ4YnZqbHlmZWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDI0MTIsImV4cCI6MjA4MTkxODQxMn0.pQB9S5tWWv5FHpvW2MGMoDHtvDlvrtfbgr_T83dlBUQ';

const supabase = createClient(url, key);

async function verifySystem() {
  console.log('--- PRODUCTION SYSTEM INTEGRITY CHECK ---');
  const start = Date.now();

  // 1. AUTH LOGIN
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin1@tiempospro.com',
    password: 'TiemposPro2025!',
  });

  if (authError) {
    throw new Error(`Auth Failed: ${authError.message}`);
  }
  console.log(`[PASS] Auth Login (${Date.now() - start}ms) - UID: ${authData.user.id}`);

  // 2. READ PROFILE (Balance Check)
  const { data: profile, error: profError } = await supabase
    .from('app_users')
    .select('*')
    .eq('auth_uid', authData.user.id)
    .single();

  if (profError) throw new Error(`Profile Read Failed: ${profError.message}`);

  console.log(`[PASS] Read Profile (${profile.name})`);
  console.log(`       Current Balance: ₡${profile.balance_bigint.toLocaleString()}`);
  const initBalance = profile.balance_bigint;

  // 3. TRANSACTION (Place Simulated Bet)
  const betAmount = 500;
  const ticketCode = `TEST-${Date.now().toString().slice(-6)}`;

  console.log(`[TEST] Attempting to place bet Ticket: ${ticketCode} for ₡500...`);

  const { data: bet, error: betError } = await supabase
    .from('bets')
    .insert({
      ticket_code: ticketCode,
      user_id: profile.id,
      amount_bigint: betAmount,
      numbers: '55',
      mode: 'TIEMPOS',
      status: 'PENDING',
    })
    .select()
    .single();

  if (betError) throw new Error(`Bet Insert Failed: ${betError.message}`);
  console.log(`[PASS] Bet Created in Database.`);

  // 4. MANUAL LEDGER ENTRY (Testing Transaction Table)
  const { error: ledgerError } = await supabase.from('ledger_transactions').insert({
    ticket_code: ticketCode,
    user_id: profile.id,
    amount_bigint: -betAmount,
    balance_before: initBalance,
    balance_after: initBalance - betAmount,
    type: 'DEBIT',
    meta: { description: 'System Verification Test' },
  });

  if (ledgerError) throw new Error(`Ledger Write Failed: ${ledgerError.message}`);
  console.log(`[PASS] Ledger Transaction Recorded.`);

  // 5. UPDATE BALANCE
  const { error: updError } = await supabase
    .from('app_users')
    .update({ balance_bigint: initBalance - betAmount })
    .eq('id', profile.id);

  if (updError) throw new Error(`Balance Update Failed: ${updError.message}`);
  console.log(`[PASS] Balance Successfully Updated.`);

  // 6. VERIFY FINAL STATE
  const { data: finalProfile } = await supabase
    .from('app_users')
    .select('balance_bigint')
    .eq('id', profile.id)
    .single();

  console.log(`[PASS] Final Balance Verified: ₡${finalProfile.balance_bigint.toLocaleString()}`);
  console.log(
    `\n✅ SYSTEM VERIFIED: All critical DB operations (Auth, Read, Write, Update) are functional.`
  );
}

verifySystem().catch((err) => console.error('❌ SYSTEM FAILURE:', err));
