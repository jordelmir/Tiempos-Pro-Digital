import React, { useEffect, useRef } from 'react';

export const MatrixBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        
        // Characters: Katakana + Latin + Numbers + Currencies
        const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$€¥₡';
        const charArray = chars.split('');
        
        const fontSize = 14;
        const drops: number[] = [];
        
        // Initialize drops based on current width
        const initDrops = () => {
             const columns = Math.ceil(width / fontSize);
             // Fill existing drops or extend
             for (let i = 0; i < columns; i++) {
                 if (drops[i] === undefined) {
                     drops[i] = Math.random() * -100; // Start above screen randomly
                 }
             }
        };

        initDrops();

        const draw = () => {
            // Black with heavy opacity for trail effect (Cinematic feel)
            ctx.fillStyle = 'rgba(2, 4, 10, 0.05)'; 
            ctx.fillRect(0, 0, width, height);

            ctx.font = `${fontSize}px monospace`;
            ctx.textBaseline = 'top';

            // Iterate over drops
            for (let i = 0; i < drops.length; i++) {
                // If drop is off screen horizontally (due to resize shrink), skip drawing to save resources
                if (i * fontSize > width) continue;

                // Randomize color: Mostly Cyan/Blue/Purple for Cyberpunk vibe
                const rand = Math.random();
                if (rand > 0.98) {
                    ctx.fillStyle = '#ffffff'; // Sparkle white
                } else if (rand > 0.8) {
                    ctx.fillStyle = '#bc13fe'; // Neon Purple
                } else if (rand > 0.6) {
                    ctx.fillStyle = '#00f0ff'; // Neon Cyan
                } else {
                    ctx.fillStyle = '#0f3b8e'; // Deep Blue (Matrix dim)
                }
                
                // Random character
                const text = charArray[Math.floor(Math.random() * charArray.length)];
                
                // Drawing the character
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                // Sending the drop back to the top randomly after it has crossed the screen
                if (drops[i] * fontSize > height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                // Incrementing Y coordinate
                drops[i]++;
            }
        };

        const interval = setInterval(draw, 40); // 25 FPS for cinematic feel

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            // Add more drops if the screen got wider
            initDrops();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none bg-[#02040a]">
            {/* Base Radial Gradient for depth */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#0a1124_0%,_#000000_100%)] opacity-80"></div>
            
            {/* The Canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 opacity-40 mix-blend-screen" />
            
            {/* CRT Scanline Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] bg-repeat opacity-20 pointer-events-none"></div>
            
            {/* Vignette */}
            <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,1)] pointer-events-none"></div>
        </div>
    );
};