
const { createClient } = require('@supabase/supabase-js');

const url = 'https://odgkpqlgfrxbvjlyfelq.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZ2twcWxnZnJ4YnZqbHlmZWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDI0MTIsImV4cCI6MjA4MTkxODQxMn0.pQB9S5tWWv5FHpvW2MGMoDHtvDlvrtfbgr_T83dlBUQ';

const supabase = createClient(url, key);

async function testSignup() {
    const email = `test.admin.auto${Math.floor(Math.random() * 1000)}@gmail.com`;
    const password = 'TiemposPro2025!';

    console.log(`Signing up ${email}...`);
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        console.error("Signup error:", error);
    } else {
        console.log("Success:", data.user?.id);
    }
}

testSignup();
