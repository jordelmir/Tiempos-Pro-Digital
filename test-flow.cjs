
const { createClient } = require('@supabase/supabase-js');

const url = 'https://odgkpqlgfrxbvjlyfelq.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZ2twcWxnZnJ4YnZqbHlmZWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDI0MTIsImV4cCI6MjA4MTkxODQxMn0.pQB9S5tWWv5FHpvW2MGMoDHtvDlvrtfbgr_T83dlBUQ';

const supabase = createClient(url, key);

async function run() {
    const email = `temp.admin1.${Date.now()}@gmail.com`;
    const password = 'TiemposPro2025!';

    console.log(`Testing full flow with ${email}...`);

    // 1. SignUp
    const { data: sData, error: sError } = await supabase.auth.signUp({ email, password });
    if (sError) { console.error("Signup err:", sError); return; }
    console.log("Signup OK:", sData.user?.id);

    if (!sData.user) { console.log("No user returned (confirmation pending?)"); return; }

    // 2. Login
    console.log("Attempting login...");
    const { data: lData, error: lError } = await supabase.auth.signInWithPassword({ email, password });

    if (lError) {
        console.error("Login err:", lError);
    } else {
        console.log("Login OK:", lData.user.id);
    }
}
run();
