import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { drawTime } = await req.json()

        // Fetch last 100 results for context
        const { data: history } = await supabaseClient
            .from('draw_results')
            .select('winning_number, date, draw_id')
            .order('created_at', { ascending: false })
            .limit(100)

        const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || "")
        const model = genAI.getGenerativeModel({ model: "gemini-pro" })

        const prompt = `Como experto analista probabilístico de loterías, analiza el siguiente historial de resultados para el sorteo ${drawTime}:
    ${JSON.stringify(history)}
    Genera 3 números sugeridos con su probabilidad estimada y una breve explicación técnica del por qué (tendencias, frecuencia, etc.).
    Formato JSON: { "suggestions": [{ "number": "XX", "prob": "XX%", "reason": "..." }] }`

        const result = await model.generateContent(prompt)
        const responseText = result.response.text()

        // Clean JSON from markdown if necessary
        const jsonStr = responseText.replace(/```json|```/g, "").trim()

        return new Response(jsonStr, {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
