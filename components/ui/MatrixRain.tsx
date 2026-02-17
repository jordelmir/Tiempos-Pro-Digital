
import React, { useEffect, useRef, memo } from 'react';

interface MatrixRainProps {
    speed?: number;
    opacity?: number;
    theme?: 'CYAN' | 'VAPOR' | 'EMERALD' | 'MIXED';
}

interface Drop {
    x: number;
    y: number;
    speed: number;
    chars: string[];
    layer: number; // 0: fondo, 1: medio, 2: frente
    color: string;
    lastMutation: number;
}

const MatrixRain = memo(({ 
    speed = 1, 
    opacity = 0.4,
    theme = 'MIXED'
}: MatrixRainProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const THEME_PALETTE = {
        CYAN: ['#00f0ff', '#00d1ff', '#70eaff'],
        VAPOR: ['#bc13fe', '#8b5cf6', '#d946ef'],
        EMERALD: ['#00FF94', '#0aff60', '#52ffb0'],
        MIXED: ['#00f0ff', '#bc13fe', '#00FF94']
    };

    const dropsRef = useRef<Drop[]>([]);
    const animationIdRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEF₡$¥';
        const charArray = chars.split('');

        const initDrops = (width: number, height: number) => {
            const dropCount = Math.floor(width / 12); // Densidad base
            const newDrops: Drop[] = [];

            for (let i = 0; i < dropCount; i++) {
                const layer = Math.floor(Math.random() * 3); // 0, 1, 2
                const fontSize = layer === 0 ? 10 : layer === 1 ? 14 : 18;
                const layerSpeed = (0.5 + Math.random() * 1.5) * (layer + 1) * 0.05 * speed;
                const colors = THEME_PALETTE[theme];

                newDrops.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    speed: layerSpeed,
                    chars: [charArray[Math.floor(Math.random() * charArray.length)]],
                    layer,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    lastMutation: Date.now()
                });
            }
            dropsRef.current = newDrops;
        };

        const draw = () => {
            const width = canvas.width / (window.devicePixelRatio || 1);
            const height = canvas.height / (window.devicePixelRatio || 1);

            // Efecto de persistencia (Trail)
            ctx.fillStyle = 'rgba(2, 4, 10, 0.15)'; 
            ctx.fillRect(0, 0, width, height);

            dropsRef.current.forEach((drop) => {
                const fontSize = drop.layer === 0 ? 10 : drop.layer === 1 ? 14 : 18;
                ctx.font = `${900} ${fontSize}px "Roboto Mono", monospace`;
                
                // Mutación aleatoria de caracteres
                if (Date.now() - drop.lastMutation > 100 && Math.random() > 0.9) {
                    drop.chars[0] = charArray[Math.floor(Math.random() * charArray.length)];
                    drop.lastMutation = Date.now();
                }

                const isFrontLayer = drop.layer === 2;
                const headAlpha = isFrontLayer ? 1.0 : 0.7;

                // Dibujar Cabeza (Brillante)
                ctx.fillStyle = '#ffffff';
                if (isFrontLayer) {
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = drop.color;
                }
                ctx.globalAlpha = headAlpha * opacity;
                ctx.fillText(drop.chars[0], drop.x, drop.y);
                
                // Dibujar Estela (Cuerpo)
                ctx.shadowBlur = 0;
                ctx.fillStyle = drop.color;
                ctx.globalAlpha = (0.3 + (drop.layer * 0.2)) * opacity;
                
                // Pequeña estela técnica de 3 glifos previos
                for (let j = 1; j < 4; j++) {
                    const prevChar = charArray[(charArray.indexOf(drop.chars[0]) + j) % charArray.length];
                    ctx.fillText(prevChar, drop.x, drop.y - (j * fontSize));
                }

                // Actualizar posición
                drop.y += drop.speed * fontSize;

                // Reset si sale de pantalla
                if (drop.y > height + 50) {
                    drop.y = -50;
                    drop.x = Math.random() * width;
                }
            });

            animationIdRef.current = requestAnimationFrame(draw);
        };

        const handleResize = () => {
            const dpr = window.devicePixelRatio || 1;
            const w = container.clientWidth;
            const h = container.clientHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.scale(dpr, dpr);
            initDrops(w, h);
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        draw();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationIdRef.current);
        };
    }, [speed, opacity, theme]);

    return (
        <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden bg-transparent">
            <canvas ref={canvasRef} className="block w-full h-full opacity-80" style={{ mixBlendMode: 'screen' }} />
            <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-40 pointer-events-none"></div>
        </div>
    );
});

export default MatrixRain;
