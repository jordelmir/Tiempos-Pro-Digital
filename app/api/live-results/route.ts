// app/api/live-results/route.ts
export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js'

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase
        .from('draw_results')
        .select('*')
        .order('date', { ascending: false })
        .limit(10)

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json(data)
}
