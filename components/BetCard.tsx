'use client'

// components/BetCard.tsx
'use client'

import { motion } from 'framer-motion'
import { Ticket, Zap, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BetCardProps {
    numbers: string
    amount: number
    draw: string
    status: 'PENDING' | 'WON' | 'LOST'
}

export function BetCard({ numbers, amount, draw, status }: BetCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className="glow-panel p-6 rounded-2xl relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 p-4">
                {status === 'PENDING' ? (
                    <Zap className="text-cyber-neon animate-pulse-fast" size={20} />
                ) : status === 'WON' ? (
                    <ShieldCheck className="text-cyber-success" size={20} />
                ) : (
                    <Ticket className="text-cyber-danger" size={20} />
                )}
            </div>

            <div className="space-y-4">
                <label className="text-xs uppercase tracking-[0.2em] text-cyber-neon/60 font-display">Número Sorteado</label>
                <div className="text-6xl font-black font-display text-white tracking-tighter drop-shadow-neon-cyan">
                    {numbers.padStart(2, '0')}
                </div>

                <div className="flex justify-between items-end border-t border-cyber-border pt-4">
                    <div>
                        <p className="text-[10px] uppercase text-gray-500 mb-1">Inversión</p>
                        <p className="text-xl font-bold text-cyber-emerald">₡{amount.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase text-gray-500 mb-1">Sorteo</p>
                        <p className="text-sm font-medium text-white">{draw}</p>
                    </div>
                </div>
            </div>

            {/* Decorative Scanline Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyber-neon/5 to-transparent h-12 -translate-y-full group-hover:animate-scanline pointer-events-none" />
        </motion.div>
    )
}
