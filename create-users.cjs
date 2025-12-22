const { createClient } = require('@supabase/supabase-js');

const url = 'https://odgkpqlgfrxbvjlyfelq.supabase.co';
const key =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZ2twcWxnZnJ4YnZqbHlmZWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDI0MTIsImV4cCI6MjA4MTkxODQxMn0.pQB9S5tWWv5FHpvW2MGMoDHtvDlvrtfbgr_T83dlBUQ';

const supabase = createClient(url, key);

async function createUsers() {
  console.log('Starting user creation via API...');
  for (let i = 1; i <= 20; i++) {
    const email = `admin${i}@tiempospro.com`;
    const password = 'TiemposPro2025!';

    // Check if user already exists first to avoid error spam? No, signUp handles it.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: `Admin ${i}` },
      },
    });

    if (error) {
      console.error(`Error creating ${email}:`, error.message);
    } else {
      if (data.user) {
        console.log(`Created ${email} (ID: ${data.user.id})`);
      } else {
        // User might exist but unconfirmed, or rate limit
        console.log(`Created/Existed ${email} (No user object returned?)`, data);
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }
}

createUsers();
