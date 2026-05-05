"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRotation: number;
  color: string;
  shape: "rect" | "circle";
};

const COLORS = [
  "#3b82f6", // blue
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#eab308", // yellow
];

/**
 * Lightweight canvas-based confetti burst. No external dep.
 * Renders one burst from the top center, fades + falls under gravity,
 * cleans up the canvas after animation completes.
 *
 * `trigger` prop: when truthy, fires the burst. Useful for conditional
 * triggers like "score >= 95".
 */
export default function Confetti({ trigger }: { trigger: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!trigger) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    // Spawn particles from two corners and the top-center
    const particles: Particle[] = [];
    const spawn = (originX: number, originY: number, count: number, spreadAngle: number) => {
      for (let i = 0; i < count; i++) {
        const angle = spreadAngle + (Math.random() - 0.5) * Math.PI * 0.6;
        const speed = 6 + Math.random() * 6;
        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 6 + Math.random() * 6,
          rotation: Math.random() * Math.PI * 2,
          vRotation: (Math.random() - 0.5) * 0.3,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          shape: Math.random() > 0.5 ? "rect" : "circle",
        });
      }
    };

    spawn(W * 0.2, H, 60, -Math.PI / 3); // bottom-left → up-right
    spawn(W * 0.8, H, 60, -2 * Math.PI / 3); // bottom-right → up-left
    spawn(W / 2, 50, 40, Math.PI / 2); // top-center → down

    const gravity = 0.18;
    const drag = 0.99;
    const fadeAfter = 1500; // start fading after 1.5s
    const stopAfter = 4500;
    const startedAt = performance.now();

    let raf = 0;
    const step = (now: number) => {
      const elapsed = now - startedAt;
      ctx.clearRect(0, 0, W, H);

      // Fade by reducing alpha after fadeAfter
      const fade = elapsed < fadeAfter ? 1 : Math.max(0, 1 - (elapsed - fadeAfter) / (stopAfter - fadeAfter));

      for (const p of particles) {
        p.vy += gravity;
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRotation;

        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (elapsed < stopAfter) {
        raf = requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [trigger]);

  if (!trigger) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50"
    />
  );
}
