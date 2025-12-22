
const { createClient } = require('@supabase/supabase-js');

const url = 'https://odgkpqlgfrxbvjlyfelq.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZ2twcWxnZnJ4YnZqbHlmZWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDI0MTIsImV4cCI6MjA4MTkxODQxMn0.pQB9S5tWWv5FHpvW2MGMoDHtvDlvrtfbgr_T83dlBUQ';

const supabase = createClient(url, key);

async function createUsers() {
    console.log("Creating 20 temp admin users...");

    for (let i = 1; i <= 20; i++) {
        // Use gmail to pass validation/filters if any
        const email = `temp.admin${i}.${Date.now()}@gmail.com`;
        const password = 'TiemposPro2025!';

        // Store original intended email in metadata for later SQL fix
        const realEmail = `admin${i}@tiempospro.com`;

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: `Admin User ${i}`,
                    target_email: realEmail
                }
            }
        });

        if (error) {
            console.error(`FAILED ${i}:`, error.message);
        } else {
            console.log(`SUCCESS ${i} (ID: ${data.user?.id})`);
        }

        // 500ms delay to avoid aggressive rate limits (60/min usually)
        await new Promise(r => setTimeout(r, 500));
    }
}

createUsers();
