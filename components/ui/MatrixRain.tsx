// components/ui/MatrixRain.tsx
'use client'

import React, { useEffect, useRef, memo } from 'react';

interface MatrixRainProps {
    colorHex?: string;
    speed?: number;
    density?: 'LOW' | 'MEDIUM' | 'HIGH';
    opacity?: number;
    brightness?: number;
}

const MatrixRain = memo(({
    colorHex = '#00f0ff',
    speed = 1,
    density = 'MEDIUM',
    opacity = 0.3,
    brightness = 1
}: MatrixRainProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Refs to track state without triggering re-renders
    const stateRef = useRef({
        width: 0,
        height: 0,
        drops: [] as number[],
        columns: 0,
        animationId: 0
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>';
        const charArray = chars.split('');
        const fontSize = 14;

        const initCanvas = (forceReset = false) => {
            const width = container.clientWidth;
            const height = container.clientHeight;

            if (width === 0 || height === 0) return;

            const isWidthStable = Math.abs(width - stateRef.current.width) < 50;
            const shouldResetSim = forceReset || !isWidthStable || (stateRef.current.width === 0);

            stateRef.current.width = width;
            stateRef.current.height = height;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.scale(dpr, dpr);

            if (shouldResetSim) {
                const densityFactor = density === 'HIGH' ? 1 : density === 'MEDIUM' ? 1.5 : 2.5;
                const newColumns = Math.ceil(width / (fontSize * densityFactor));

                stateRef.current.columns = newColumns;
                stateRef.current.drops = [];

                for (let i = 0; i < newColumns; i++) {
                    stateRef.current.drops[i] = Math.random() * -100;
                }
            }
        };

        const draw = () => {
            ctx.fillStyle = `rgba(0, 0, 0, ${0.1 * speed})`;
            ctx.fillRect(0, 0, stateRef.current.width, stateRef.current.height);

            ctx.font = `bold ${fontSize}px monospace`;
            ctx.textAlign = 'center';

            const densityFactor = density === 'HIGH' ? 1 : density === 'MEDIUM' ? 1.5 : 2.5;

            for (let i = 0; i < stateRef.current.drops.length; i++) {
                const text = charArray[Math.floor(Math.random() * charArray.length)];

                const isBright = Math.random() > 0.98;
                ctx.fillStyle = isBright ? '#ffffff' : colorHex;
                ctx.globalAlpha = isBright ? 1 : opacity;

                const x = i * fontSize * densityFactor;
                const y = stateRef.current.drops[i] * fontSize;

                ctx.fillText(text, x, y);
                ctx.globalAlpha = 1.0;

                if (y > stateRef.current.height && Math.random() > 0.975) {
                    stateRef.current.drops[i] = 0;
                }

                stateRef.current.drops[i] += 0.5 * speed;
            }
            stateRef.current.animationId = requestAnimationFrame(draw);
        };

        let resizeTimeout: any;
        const resizeObserver = new ResizeObserver((entries) => {
            if (!entries[0]) return;
            if (resizeTimeout) clearTimeout(resizeTimeout);

            resizeTimeout = setTimeout(() => {
                if (stateRef.current.animationId) cancelAnimationFrame(stateRef.current.animationId);
                initCanvas(false);
                draw();
            }, 150);
        });

        resizeObserver.observe(container);

        initCanvas(true);
        draw();

        return () => {
            if (stateRef.current.animationId) cancelAnimationFrame(stateRef.current.animationId);
            resizeObserver.disconnect();
            if (resizeTimeout) clearTimeout(resizeTimeout);
        };
    }, [colorHex, speed, density, opacity]);

    return (
        <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden transform-gpu">
            <canvas ref={canvasRef} className="block w-full h-full" style={{ mixBlendMode: 'screen' }} />
        </div>
    );
});

export default MatrixRain;