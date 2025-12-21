// app/(dashboard)/reports/page.tsx
import { createClient } from '@/lib/supabase/server'

// ISR: Revalidate every 1 hour for management reports
export const revalidate = 3600;

export default async function ReportsPage() {
    const supabase = await createClient()

    const { data: stats } = await supabase
        .from('bets')
        .select('status, amount_bigint')

    // Logic to calculate summary
    const totalVolume = stats?.reduce((acc, b) => acc + Number(b.amount_bigint), 0) || 0;

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-4xl font-black font-display text-cyber-neon uppercase tracking-widest">
                Reporte Operativo
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glow-panel p-6 rounded-xl border-cyber-emerald/30">
                    <p className="text-xs text-cyber-emerald/60 uppercase font-display">Volumen Total (30d)</p>
                    <p className="text-3xl font-bold font-display">₡{totalVolume.toLocaleString()}</p>
                </div>
                {/* More stats cards... */}
            </div>

            <div className="bg-cyber-panel/40 p-1 rounded font-mono text-[10px] text-gray-600 text-center uppercase tracking-widest">
                Documento generado mediante ISR (Static Generation) - Cache v4.0.1
            </div>
        </div>
    )
}
