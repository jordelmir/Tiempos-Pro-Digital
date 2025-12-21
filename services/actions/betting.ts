// services/actions/betting.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const BetSchema = z.object({
    numbers: z.string().min(1).max(2),
    amount: z.number().positive(),
    drawId: z.string(),
    drawDate: z.string(),
    mode: z.string(),
})

export async function placeBetAction(formData: z.infer<typeof BetSchema>) {
    const supabase = await createClient()

    // 1. Validate Input
    const validated = BetSchema.safeParse(formData)
    if (!validated.success) {
        return { error: 'Datos de apuesta inválidos' }
    }

    const { numbers, amount, drawId, drawDate, mode } = validated.data
    const ticketCode = `BT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // 2. Execute RPC (Atomic Logic)
    const { data, error } = await supabase.rpc('place_bet', {
        p_numbers: numbers,
        p_amount: amount,
        p_draw_id: drawId,
        p_draw_date: drawDate,
        p_mode: mode,
        p_ticket_code: ticketCode
    })

    if (error) {
        console.error('Bet Error:', error)
        return { error: error.message }
    }

    return { success: true, data }
}
