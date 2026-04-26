/**
 * Curl-noise particle field — 600 particles drifting along a 2D
 * curl-noise vector field. Trails are rendered with low-alpha
 * fades for a smoke / ink-flow look.
 */

import { useEffect, useRef } from "react";
import { readMotion } from "../../lib/useMotion";

const PARTICLES = 600;
const SPEED = 0.55;
const TRAIL_FADE = 0.08;

function noise2(x: number, y: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
function smooth(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = noise2(xi, yi);
  const b = noise2(xi + 1, yi);
  const c = noise2(xi, yi + 1);
  const d = noise2(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
/* Curl of a scalar potential field gives a divergence-free flow. */
function curl(x: number, y: number, t: number) {
  const eps = 0.01;
  const n1 = smooth(x, y + eps + t);
  const n2 = smooth(x, y - eps + t);
  const n3 = smooth(x + eps, y + t);
  const n4 = smooth(x - eps, y + t);
  return [(n1 - n2) / (2 * eps), -(n3 - n4) / (2 * eps)];
}

export default function CurlNoiseCard() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);

    const resize = () => {
      const r = cvs.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      cvs.width = Math.round(W * dpr);
      cvs.height = Math.round(H * dpr);
      cvs.style.width = W + "px";
      cvs.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cvs);

    /* Particles in normalised [0..1] space. */
    const pts = new Array(PARTICLES).fill(0).map(() => ({
      x: Math.random(),
      y: Math.random(),
      h: Math.random(),
    }));

    let t = 0;
    let raf = 0;
    let last = performance.now();
    let onscreen = false;

    const io = new IntersectionObserver(
      ([e]) => {
        onscreen = !!e?.isIntersecting;
      },
      { rootMargin: "80px" },
    );
    io.observe(cvs);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const m = readMotion();
      if (!m.isPageVisible || !onscreen) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!m.prefersReducedMotion) t += dt;

      ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_FADE})`;
      ctx.fillRect(0, 0, W, H);

      for (const p of pts) {
        const [vx, vy] = curl(p.x * 4, p.y * 4, t * 0.12);
        p.x += vx * SPEED * dt;
        p.y += vy * SPEED * dt;
        if (p.x < 0) p.x += 1;
        else if (p.x > 1) p.x -= 1;
        if (p.y < 0) p.y += 1;
        else if (p.y > 1) p.y -= 1;

        const px = p.x * W;
        const py = p.y * H;
        const hue = (p.h + t * 0.05) % 1;
        const r = Math.round(60 + 195 * hue);
        const g = Math.round(180 + 75 * (1 - hue));
        const b = Math.round(220 + 35 * hue);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.55)`;
        ctx.fillRect(px, py, 1.2, 1.2);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="block h-full w-full bg-black" />;
}
