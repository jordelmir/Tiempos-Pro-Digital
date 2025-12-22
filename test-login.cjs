
const { createClient } = require('@supabase/supabase-js');

const url = 'https://odgkpqlgfrxbvjlyfelq.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZ2twcWxnZnJ4YnZqbHlmZWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDI0MTIsImV4cCI6MjA4MTkxODQxMn0.pQB9S5tWWv5FHpvW2MGMoDHtvDlvrtfbgr_T83dlBUQ';

console.log("Testing auth with:", url);

const supabase = createClient(url, key);

async function testLogin() {
    console.log("Attempting login...");
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin1@tiempospro.com',
        password: 'TiemposPro2025!'
    });

    if (error) {
        console.error("LOGIN FAILED:", error);
    } else {
        console.log("LOGIN SUCCESS! User ID:", data.user.id);
    }
}

testLogin();
