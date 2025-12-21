// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

let client: any;

export function createClient() {
    if (typeof window === 'undefined') return null as any;
    if (!client) {
        client = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
        );
    }
    return client;
}

export const supabase = typeof window !== 'undefined' ? createClient() : null as any;
