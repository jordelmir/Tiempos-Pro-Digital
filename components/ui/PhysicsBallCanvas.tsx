
import React, { useEffect, useRef } from 'react';
import { LotteryRegion, DrawResult } from '../../types';

interface Ball {
    id: LotteryRegion;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    baseRadius: number; // Store original radius for breathing calc
    label: string;
    color: string;
    glow: string;
    pulseOffset: number; // Individual offset for breathing phase
}

interface PhysicsBallCanvasProps {
    results: DrawResult[];
    drawTime: string;
}

const NATION_CONFIG: Record<LotteryRegion, { label: string, color: string, glow: string, icon: string }> = {
    [LotteryRegion.TICA]: { label: 'CR', color: '#ff003c', glow: '#ff003c', icon: '🇨🇷' },
    [LotteryRegion.NICA]: { label: 'NI', color: '#00f0ff', glow: '#00f0ff', icon: '🇳🇮' },
    [LotteryRegion.DOMINICANA]: { label: 'DO', color: '#bc13fe', glow: '#bc13fe', icon: '🇩🇴' },
    [LotteryRegion.PANAMENA]: { label: 'PA', color: '#0aff60', glow: '#0aff60', icon: '🇵🇦' }
};

export default function PhysicsBallCanvas({ results, drawTime }: PhysicsBallCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const balls = useRef<Ball[]>([]);
    const requestRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const handleResize = () => {
            const container = canvas.parentElement;
            if (!container) return;
            
            const dpr = window.devicePixelRatio || 1;
            const displayWidth = container.clientWidth;
            const displayHeight = container.clientHeight;
            
            canvas.width = displayWidth * dpr;
            canvas.height = displayHeight * dpr;
            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${displayHeight}px`;
            ctx.scale(dpr, dpr);
            
            // Radio base
            const baseRadius = Math.max(38, Math.min(displayWidth / 8, 60));
            
            if (balls.current.length === 0) {
                Object.entries(NATION_CONFIG).forEach(([id, config], i) => {
                    balls.current.push({
                        id: id as LotteryRegion,
                        x: (displayWidth / 5) * (i + 1),
                        y: displayHeight / 2,
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: (Math.random() - 0.5) * 1.5,
                        radius: baseRadius,
                        baseRadius: baseRadius,
                        label: config.label,
                        color: config.color,
                        glow: config.glow,
                        pulseOffset: Math.random() * 1000
                    });
                });
            } else {
                balls.current.forEach(ball => {
                    const hasResult = results.some(r => r.region === ball.id && r.winningNumber !== '--');
                    // Si ganó, la bola crece un poco más
                    ball.baseRadius = hasResult ? baseRadius * 1.2 : baseRadius;
                });
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        const draw = (t: number) => {
            const width = canvas.width / (window.devicePixelRatio || 1);
            const height = canvas.height / (window.devicePixelRatio || 1);

            // 1. Limpieza con fondo semitransparente (trail effect muy sutil si se quisiera, aquí sólido para nitidez)
            ctx.fillStyle = '#010308';
            ctx.fillRect(0, 0, width, height);

            // 2. Grid Cyberpunk de fondo
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 1;
            for(let x=0; x<width; x+=50) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke(); }
            for(let y=0; y<height; y+=50) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke(); }

            // Física
            for (let i = 0; i < balls.current.length; i++) {
                const ball = balls.current[i];
                ball.x += ball.vx;
                ball.y += ball.vy;

                if (ball.x + ball.radius > width) { ball.vx *= -1; ball.x = width - ball.radius; }
                else if (ball.x - ball.radius < 0) { ball.vx *= -1; ball.x = ball.radius; }
                if (ball.y + ball.radius > height) { ball.vy *= -1; ball.y = height - ball.radius; }
                else if (ball.y - ball.radius < 0) { ball.vy *= -1; ball.y = ball.radius; }

                for (let j = i + 1; j < balls.current.length; j++) {
                    const other = balls.current[j];
                    const dx = other.x - ball.x;
                    const dy = other.y - ball.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = ball.radius + other.radius;

                    if (distance < minDistance) {
                        const nx = dx / distance;
                        const ny = dy / distance;
                        const overlap = minDistance - distance;
                        ball.x -= nx * overlap / 2;
                        ball.y -= ny * overlap / 2;
                        other.x += nx * overlap / 2;
                        other.y += ny * overlap / 2;
                        const rvx = ball.vx - other.vx;
                        const rvy = ball.vy - other.vy;
                        const velAlongNormal = rvx * nx + rvy * ny;
                        if (velAlongNormal < 0) {
                            const impulse = -(1.2 * velAlongNormal) / 2;
                            ball.vx += impulse * nx;
                            ball.vy += impulse * ny;
                            other.vx -= impulse * nx;
                            other.vy -= impulse * ny;
                        }
                    }
                }
            }

            // Renderizado NEÓN "VIVO"
            balls.current.forEach(ball => {
                const ballResult = results.find(r => r.region === ball.id);
                const winningNumber = ballResult && ballResult.winningNumber !== '--' ? ballResult.winningNumber : null;
                const isReventado = ballResult ? ballResult.isReventado : false;
                const isActive = winningNumber !== null;

                // Respiración Orgánica
                // Usamos seno del tiempo + offset para que cada bola respire diferente
                const breathe = Math.sin((t + ball.pulseOffset) / 400) * 4; 
                const currentRadius = ball.baseRadius + breathe;
                
                ctx.save();

                // --- CAPA 1: AURA DE ENERGÍA (Brillo externo difuso) ---
                // Usamos 'lighter' para que los brillos se sumen intensamente
                ctx.globalCompositeOperation = 'lighter';
                const aura = ctx.createRadialGradient(ball.x, ball.y, currentRadius * 0.5, ball.x, ball.y, currentRadius * 2.5);
                aura.addColorStop(0, ball.color + '44'); // Color semitransparente en el centro
                aura.addColorStop(0.5, ball.color + '11');
                aura.addColorStop(1, 'transparent');
                ctx.fillStyle = aura;
                ctx.beginPath(); ctx.arc(ball.x, ball.y, currentRadius * 3, 0, Math.PI * 2); ctx.fill();

                // --- CAPA 2: CUERPO DE PLASMA (Relleno interno) ---
                const plasma = ctx.createRadialGradient(ball.x, ball.y, currentRadius * 0.1, ball.x, ball.y, currentRadius);
                if (isActive) {
                    // Si está activo, el núcleo es blanco caliente
                    plasma.addColorStop(0, '#ffffff'); 
                    plasma.addColorStop(0.4, ball.color); 
                    plasma.addColorStop(1, ball.color + 'aa');
                } else {
                    // Modo espera: núcleo del color suave
                    plasma.addColorStop(0, ball.color + '88'); 
                    plasma.addColorStop(0.7, 'transparent');
                    plasma.addColorStop(1, ball.color + 'aa'); // Borde definido
                }
                ctx.fillStyle = plasma;
                ctx.beginPath(); ctx.arc(ball.x, ball.y, currentRadius, 0, Math.PI * 2); ctx.fill();

                // --- CAPA 3: ANILLO DE CONTENCIÓN (Borde Neón Definido) ---
                ctx.globalCompositeOperation = 'source-over'; // Volver a modo normal para bordes nítidos
                ctx.strokeStyle = ball.color;
                ctx.lineWidth = isActive ? 4 : 2;
                ctx.shadowBlur = isActive ? 30 : 15;
                ctx.shadowColor = ball.color;
                ctx.beginPath(); 
                ctx.arc(ball.x, ball.y, currentRadius, 0, Math.PI * 2); 
                ctx.stroke();
                
                // Reset de sombras para textos
                ctx.shadowBlur = 0;

                // --- CAPA 4: BANDERA NACIONAL (Centro Absoluto) ---
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Ajustar tamaño de la bandera dinámicamente
                const flagSize = isActive ? currentRadius * 0.6 : currentRadius * 0.8; 
                ctx.font = `${flagSize}px serif`;
                
                // Si hay número ganador, la bandera se atenúa un poco o se queda de fondo
                ctx.globalAlpha = isActive ? 0.7 : 1.0; 
                // Pequeña sombra negra detrás de la bandera para contraste con el plasma
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'black';
                ctx.fillText(NATION_CONFIG[ball.id].icon, ball.x, ball.y);
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0;

                // --- CAPA 5: DATOS DEL SORTEO ---
                if (isActive) {
                    // NUMERO GANADOR SOBRE LA BANDERA
                    ctx.fillStyle = 'white';
                    ctx.font = `900 ${currentRadius * 1.1}px Orbitron`;
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = 'black'; // Stroke negro grueso para legibilidad sobre la bandera
                    ctx.strokeText(winningNumber!, ball.x, ball.y + (currentRadius * 0.1));
                    ctx.fillText(winningNumber!, ball.x, ball.y + (currentRadius * 0.1));

                    // REVENTADO TAG
                    if (ball.id === LotteryRegion.TICA && isReventado) {
                        const fireY = ball.y - currentRadius * 1.1;
                        ctx.font = `900 ${currentRadius * 0.3}px sans-serif`;
                        ctx.fillStyle = '#ff003c';
                        ctx.shadowColor = '#ff003c';
                        ctx.shadowBlur = 10;
                        ctx.fillText('🔥 FIRE 🔥', ball.x, fireY);
                        ctx.shadowBlur = 0;
                    }
                } else {
                    // Texto de estado "SYNC" pequeño abajo
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.font = `600 ${currentRadius * 0.25}px Rajdhani`;
                    ctx.fillText(ball.id, ball.x, ball.y + currentRadius * 0.6);
                }

                ctx.restore();
            });

            requestRef.current = requestAnimationFrame(draw);
        };

        requestRef.current = requestAnimationFrame(draw);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            window.removeEventListener('resize', handleResize);
        };
    }, [results, drawTime]);

    return (
        <canvas 
            ref={canvasRef} 
            className="w-full h-full block cursor-crosshair"
            style={{ touchAction: 'none' }}
        />
    );
}
