
const { createClient } = require('@supabase/supabase-js');

const url = 'https://odgkpqlgfrxbvjlyfelq.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZ2twcWxnZnJ4YnZqbHlmZWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDI0MTIsImV4cCI6MjA4MTkxODQxMn0.pQB9S5tWWv5FHpvW2MGMoDHtvDlvrtfbgr_T83dlBUQ';

const supabase = createClient(url, key);

async function createUsers() {
    console.log("Creating 20 admin users via API...");

    for (let i = 1; i <= 20; i++) {
        const email = `admin${i}@tiempospro.com`;
        const password = 'TiemposPro2025!';

        console.log(`Creating ${email}...`);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name: `Admin User ${i}` }
            }
        });

        if (error) {
            console.error(`FAILED ${email}:`, error.message);
        } else {
            console.log(`SUCCESS ${email} (ID: ${data.user?.id})`);
        }

        // Throttle to avoid rate limits
        await new Promise(r => setTimeout(r, 1000));
    }
}

createUsers();
