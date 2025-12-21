// hooks/useRealtimeDraws.ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DrawResult } from '@/types'

export function useRealtimeDraws() {
    const [results, setResults] = useState<DrawResult[]>([])
    const supabase = createClient()

    useEffect(() => {
        // 1. Initial Fetch
        const fetchResults = async () => {
            const { data } = await supabase
                .from('draw_results')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10)
            if (data) setResults(data as any)
        }
        fetchResults()

        // 2. Realtime Subscription
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'draw_results'
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setResults(prev => [payload.new as any, ...prev].slice(0, 10))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    return results
}
