
import React, { useEffect, useRef } from 'react';

// Léxico de Motivación Phront
const MOTIVATIONAL_WORDS = [
    'GANAR', 'EXITO', 'FORTUNA', 'JACKPOT', 'RIQUEZA', 
    'PHRONT', 'NUCLEO', 'APUESTA', 'SUERTE', 'PODER',
    'CASH', 'PREMIO', 'ELITE', 'VICTORIA', 'REACTOR'
];

interface Column {
    x: number;
    y: number;
    speed: number;
    chars: string[];
    isWordActive: boolean;
    activeWord: string | null;
    wordCharIndex: number;
    color: string; // Color asignado permanentemente a este hilo
}

export const MatrixBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const columnsRef = useRef<Column[]>([]);
    const lastPulseRef = useRef<number>(Date.now());

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        let width = 0;
        let height = 0;
        
        const matrixChars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEF₡$¥'.split('');
        const fontSize = 16; // Ligera reducción para mayor nitidez en alta densidad

        const colors = [
            '#00f0ff',   // Canal Cyan
            '#bc13fe',   // Canal Purple
            '#00ff94'    // Canal Emerald
        ];

        const initCanvas = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.scale(dpr, dpr);
            
            // TRIPLED DENSITY: Una columna cada 1/3 de fontSize
            const columnCount = Math.ceil(width / (fontSize / 3));
            columnsRef.current = Array.from({ length: columnCount }, (_, i) => ({
                x: i * (fontSize / 3),
                y: Math.random() * (height / fontSize),
                // Velocidad variable para evitar uniformidad robótica
                speed: 0.05 + Math.random() * 0.2,
                chars: matrixChars,
                isWordActive: false,
                activeWord: null,
                wordCharIndex: 0,
                color: colors[i % colors.length] // SEGREGACIÓN DE COLOR FIJA POR COLUMNA
            }));
        };

        initCanvas();

        const triggerMotivationalPulse = () => {
            columnsRef.current.forEach(col => {
                if (Math.random() > 0.95) { // Probabilidad reducida debido a la alta densidad
                    col.isWordActive = true;
                    col.activeWord = MOTIVATIONAL_WORDS[Math.floor(Math.random() * MOTIVATIONAL_WORDS.length)];
                    col.wordCharIndex = 0;
                    col.speed = 0.04; 
                }
            });
        };

        const draw = () => {
            // Fondo con persistencia ajustada para alta densidad
            ctx.fillStyle = 'rgba(2, 4, 10, 0.18)'; 
            ctx.fillRect(0, 0, width, height);

            ctx.font = `900 ${fontSize}px "Roboto Mono", monospace`;
            ctx.textBaseline = 'top';

            const now = Date.now();
            if (now - lastPulseRef.current > 120000) {
                triggerMotivationalPulse();
                lastPulseRef.current = now;
            }

            columnsRef.current.forEach((col) => {
                let char = '';
                
                if (col.isWordActive && col.activeWord) {
                    char = col.activeWord[col.wordCharIndex];
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = '#ffffff';
                } else {
                    char = col.chars[Math.floor(Math.random() * col.chars.length)];
                    ctx.fillStyle = col.color;
                    ctx.shadowBlur = 4; // Menos blur para mantener legibilidad en 3x densidad
                    ctx.shadowColor = col.color;
                }

                // Opacidad reducida para las columnas normales para no saturar
                ctx.globalAlpha = col.isWordActive ? 1.0 : 0.6;
                ctx.fillText(char, col.x, col.y * fontSize);
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0;

                col.y += col.speed;

                if (col.isWordActive) {
                    if (Math.random() > 0.85) {
                        col.wordCharIndex++;
                        if (col.wordCharIndex >= (col.activeWord?.length || 0)) {
                            col.isWordActive = false;
                            col.activeWord = null;
                            col.speed = 0.05 + Math.random() * 0.2;
                        }
                    }
                }

                if (col.y * fontSize > height) {
                    col.y = -1;
                    // Ocasionalmente mutar a palabra al resetear
                    if (!col.isWordActive && Math.random() > 0.999) {
                        col.isWordActive = true;
                        col.activeWord = MOTIVATIONAL_WORDS[Math.floor(Math.random() * MOTIVATIONAL_WORDS.length)];
                        col.wordCharIndex = 0;
                        col.speed = 0.03;
                    }
                }
            });

            requestAnimationFrame(draw);
        };

        const animationId = requestAnimationFrame(draw);

        const handleResize = () => {
            initCanvas();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[0] pointer-events-none bg-[#02040a]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(10,17,36,0.4)_0%,_#000000_100%)] opacity-95"></div>
            <canvas ref={canvasRef} className="absolute inset-0 opacity-70" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(0,255,255,0.01),rgba(255,0,255,0.01),rgba(0,0,255,0.01))] bg-[length:100%_4px,4px_100%] opacity-20"></div>
            <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,1)]"></div>
        </div>
    );
};
