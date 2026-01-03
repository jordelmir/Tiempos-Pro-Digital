
import React, { useEffect, useRef } from 'react';
import { LotteryRegion, DrawResult } from '../../types';

interface Ball {
    id: LotteryRegion;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    label: string;
    color: string;
    glow: string;
    number: string;
    isReventado: boolean;
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
            
            const baseRadius = Math.max(22, Math.min(displayWidth / 10, 45));
            
            if (balls.current.length === 0) {
                Object.entries(NATION_CONFIG).forEach(([id, config], i) => {
                    balls.current.push({
                        id: id as LotteryRegion,
                        x: (displayWidth / 5) * (i + 1),
                        y: displayHeight / 2,
                        vx: (Math.random() - 0.5) * 0.8,
                        vy: (Math.random() - 0.5) * 0.8,
                        radius: baseRadius,
                        label: config.label,
                        color: config.color,
                        glow: config.glow,
                        number: '--',
                        isReventado: false
                    });
                });
            } else {
                balls.current.forEach(ball => {
                    const hasResult = results.some(r => r.region === ball.id);
                    ball.radius = hasResult ? baseRadius * 1.15 : baseRadius;
                    ball.x = Math.min(Math.max(ball.radius + 5, ball.x), displayWidth - ball.radius - 5);
                    ball.y = Math.min(Math.max(ball.radius + 5, ball.y), displayHeight - ball.radius - 5);
                });
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        const draw = () => {
            const width = canvas.width / (window.devicePixelRatio || 1);
            const height = canvas.height / (window.devicePixelRatio || 1);

            ctx.fillStyle = '#02040a';
            ctx.fillRect(0, 0, width, height);

            // Grid background
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 1;
            for(let i=0; i<width; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,height); ctx.stroke(); }
            for(let i=0; i<height; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(width,i); ctx.stroke(); }

            balls.current.forEach(ball => {
                // Sincronizar datos con el array de resultados
                const ballResult = results.find(r => r.region === ball.id);
                ball.number = ballResult ? ballResult.winningNumber : '--';
                ball.isReventado = ballResult ? ballResult.isReventado : false;

                // Physics movement
                ball.x += ball.vx;
                ball.y += ball.vy;

                const margin = 2; 
                if (ball.x + ball.radius > width - margin) { ball.x = width - ball.radius - margin; ball.vx *= -1; } 
                else if (ball.x - ball.radius < margin) { ball.x = ball.radius + margin; ball.vx *= -1; }

                if (ball.y + ball.radius > height - margin) { ball.y = height - ball.radius - margin; ball.vy *= -1; } 
                else if (ball.y - ball.radius < margin) { ball.y = ball.radius + margin; ball.vy *= -1; }

                // Speed limit
                const speed = Math.sqrt(ball.vx**2 + ball.vy**2);
                if (speed < 0.3) { ball.vx *= 1.05; ball.vy *= 1.05; }
                if (speed > 0.8) { ball.vx *= 0.95; ball.vy *= 0.95; }

                // Collisions
                balls.current.forEach(other => {
                    if (ball === other) return;
                    const dx = other.x - ball.x;
                    const dy = other.y - ball.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < ball.radius + other.radius) {
                        const angle = Math.atan2(dy, dx);
                        const sin = Math.sin(angle);
                        const cos = Math.cos(angle);
                        const overlap = (ball.radius + other.radius) - dist;
                        ball.x -= (overlap / 2) * cos;
                        ball.y -= (overlap / 2) * sin;
                        other.x += (overlap / 2) * cos;
                        other.y += (overlap / 2) * sin;
                        const tvx = ball.vx; ball.vx = other.vx; other.vx = tvx;
                        const tvy = ball.vy; ball.vy = other.vy; other.vy = tvy;
                    }
                });

                ctx.save();
                const isTarget = ball.number !== '--';
                const isTicaRev = isTarget && ball.id === LotteryRegion.TICA && ball.isReventado;
                
                ctx.shadowBlur = isTarget ? (isTicaRev ? 60 : 40) : 15;
                ctx.shadowColor = isTicaRev ? '#ff5f00' : ball.color;
                
                const grad = ctx.createRadialGradient(
                    ball.x - ball.radius * 0.3, 
                    ball.y - ball.radius * 0.3, 
                    ball.radius * 0.1, 
                    ball.x, ball.y, ball.radius
                );
                grad.addColorStop(0, isTicaRev ? '#ff0000' : '#333');
                grad.addColorStop(0.5, isTicaRev ? '#440000' : '#000');
                grad.addColorStop(1, ball.color);
                
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.strokeStyle = isTarget ? '#fff' : 'rgba(255,255,255,0.15)';
                ctx.lineWidth = isTarget ? 3 : 1.5;
                ctx.fill();
                ctx.stroke();

                // Gloss effect
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.ellipse(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.2, ball.radius * 0.1, Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;

                ctx.shadowBlur = 0;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Labels
                if (isTicaRev) {
                    ctx.fillStyle = '#fff';
                    ctx.font = `black ${ball.radius * 0.25}px Orbitron`;
                    ctx.fillText('REV', ball.x + ball.radius * 0.45, ball.y - ball.radius * 0.45);
                    ctx.strokeStyle = '#ff5f00';
                    ctx.lineWidth = 1;
                    ctx.strokeText('REV', ball.x + ball.radius * 0.45, ball.y - ball.radius * 0.45);
                }

                ctx.font = `${ball.radius * 0.45}px serif`;
                ctx.fillText(NATION_CONFIG[ball.id].icon, ball.x, ball.y - ball.radius * 0.45);

                ctx.fillStyle = 'white';
                ctx.font = `bold ${ball.radius * 0.28}px Orbitron`;
                ctx.fillText(ball.label, ball.x, ball.y + (ball.number !== '--' ? -ball.radius * 0.1 : 0));

                if (ball.number !== '--') {
                    ctx.fillStyle = isTicaRev ? '#fff' : ball.color;
                    ctx.font = `900 ${ball.radius * 0.65}px Orbitron`;
                    ctx.fillText(ball.number, ball.x, ball.y + ball.radius * 0.4);
                    
                    if(isTicaRev) {
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = '#fff';
                        ctx.strokeText(ball.number, ball.x, ball.y + ball.radius * 0.4);
                    }
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
            className="w-full h-full block"
            style={{ touchAction: 'none', background: '#02040a' }}
        />
    );
}
