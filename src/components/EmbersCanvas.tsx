import React, { useEffect, useRef } from 'react';

interface EmbersCanvasProps {
  intensity?: 'calm' | 'danger' | 'boss';
}

export const EmbersCanvas: React.FC<EmbersCanvasProps> = ({ intensity = 'calm' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const count = intensity === 'danger' ? 45 : intensity === 'boss' ? 70 : 25;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 0.6,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -(Math.random() * 0.8 + 0.3),
      opacity: Math.random() * 0.6 + 0.2,
      pulse: Math.random() * 0.05,
      hue: intensity === 'danger' ? 0 : Math.random() > 0.3 ? 28 : 12, // orange/red embers
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity += Math.sin(Date.now() * 0.003 + p.x) * p.pulse;

        // Reset if offscreen
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const currentOpacity = Math.max(0.1, Math.min(0.85, p.opacity));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 85%, 55%, ${currentOpacity})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 50%, ${currentOpacity * 0.8})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-40 mix-blend-screen"
      aria-hidden="true"
    />
  );
};
