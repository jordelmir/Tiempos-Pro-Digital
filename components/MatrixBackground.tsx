import React, { useEffect, useRef } from 'react';

export const MatrixBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        let width = 0;
        let height = 0;
        
        const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEF₡$¥';
        const charArray = chars.split('');
        
        const fontSize = 16;
        let columns = 0;
        let drops: number[] = [];

        const colors = [
            '#00f0ff', // Cyber Cyan
            '#bc13fe', // Neon Purple
            '#00ff94', // Emerald Green
            '#ffffff'  // High-V (Flash)
        ];

        const initCanvas = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            
            // Ajuste para High DPI
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.scale(dpr, dpr);
            
            columns = Math.ceil(width / fontSize);
            drops = [];
            for (let i = 0; i < columns; i++) {
                // Distribución inicial aleatoria en Y para visibilidad inmediata
                drops[i] = Math.random() * (height / fontSize);
            }
        };

        initCanvas();

        const draw = () => {
            // Fondo oscuro base con persistencia para estela
            ctx.fillStyle = 'rgba(2, 4, 10, 0.15)'; 
            ctx.fillRect(0, 0, width, height);

            ctx.font = `900 ${fontSize}px "Roboto Mono", monospace`;
            ctx.textBaseline = 'top';

            for (let i = 0; i < drops.length; i++) {
                const rand = Math.random();
                
                // Algoritmo de color dinámico
                if (rand > 0.985) ctx.fillStyle = colors[3]; // Destello blanco raro
                else if (rand > 0.85) ctx.fillStyle = colors[0]; // Cyan
                else if (rand > 0.7) ctx.fillStyle = colors[1]; // Purple
                else ctx.fillStyle = colors[2]; // Emerald (Predominante)

                const text = charArray[Math.floor(Math.random() * charArray.length)];
                
                // Brillo Neon focalizado
                ctx.shadowBlur = 5;
                ctx.shadowColor = ctx.fillStyle as string;
                
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                ctx.shadowBlur = 0;

                if (drops[i] * fontSize > height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                
                drops[i] += 0.75; // Velocidad de flujo Phront
            }
        };

        const interval = setInterval(draw, 33);

        const handleResize = () => {
            initCanvas();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[0] pointer-events-none bg-[#02040a]">
            {/* Gradiente radial inverso para profundidad infinita */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(10,17,36,0.2)_0%,_#000000_100%)] opacity-95"></div>
            
            {/* El Canvas ahora es z-[1] dentro de este contenedor z-[0] */}
            <canvas ref={canvasRef} className="absolute inset-0 opacity-80" />
            
            {/* Filtro de Scanlines de Alta Resolución */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.01),rgba(0,0,255,0.01))] bg-[length:100%_3px,4px_100%] opacity-20"></div>
            
            {/* Viñeta de contención */}
            <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,1)]"></div>
        </div>
    );
};