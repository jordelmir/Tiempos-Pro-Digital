// services/actions/users.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { UserRole } from '@/types'

const UserSchema = z.object({
    name: z.string().min(3),
    cedula: z.string().min(9),
    email: z.string().email(),
    phone: z.string().optional(),
    role: z.nativeEnum(UserRole),
    balance_bigint: z.number().default(0),
    issuer_id: z.string().optional(),
    pin: z.string().min(4),
})

export async function createUserAction(formData: z.infer<typeof UserSchema>) {
    const supabase = await createClient()

    const validated = UserSchema.safeParse(formData)
    if (!validated.success) {
        return { error: 'Datos de usuario inválidos' }
    }

    const { name, cedula, email, phone, role, balance_bigint, issuer_id, pin } = validated.data

    // 1. Create Auth User (This usually requires Service Role if creating on behalf of others)
    // For this project, we might use a dedicated Edge Function to handle Auth + Profile creation
    // to avoid needing Service Role on the client-side server actions.

    // Alternative: Invoke the Edge Function directly from here.
    const { data, error } = await supabase.functions.invoke('createUser', {
        body: { name, cedula, email, phone, role, balance_bigint, issuer_id, pin }
    })

    if (error) {
        console.error('Create User Error:', error)
        return { error: error.message }
    }

    return { success: true, data }
}
