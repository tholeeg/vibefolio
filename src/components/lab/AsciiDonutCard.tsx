/**
 * ASCII Donut — Andy Sloane's iconic spinning torus rendered as
 * monospace characters in a 2D canvas. Reproduces the classic
 * Lambertian shading mapped to a luminance ramp.
 */

import { useEffect, useRef } from "react";
import { readMotion } from "../../lib/useMotion";

const RAMP = ".,-~:;=!*#$@";
const COLS = 60;
const ROWS = 22;

export default function AsciiDonutCard() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    let W = 0,
      H = 0,
      cellW = 0,
      cellH = 0;

    const resize = () => {
      const r = cvs.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      cvs.width = Math.round(W * dpr);
      cvs.height = Math.round(H * dpr);
      cvs.style.width = W + "px";
      cvs.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cellW = W / COLS;
      cellH = H / ROWS;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cvs);

    let A = 0;
    let B = 0;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const m = readMotion();
      if (!m.isPageVisible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!m.prefersReducedMotion) {
        A += 0.55 * dt;
        B += 0.30 * dt;
      }

      const buf: string[] = new Array(COLS * ROWS).fill(" ");
      const z: number[] = new Array(COLS * ROWS).fill(0);

      const cosA = Math.cos(A),
        sinA = Math.sin(A);
      const cosB = Math.cos(B),
        sinB = Math.sin(B);

      for (let j = 0; j < 6.28; j += 0.07) {
        const cosJ = Math.cos(j),
          sinJ = Math.sin(j);
        for (let i = 0; i < 6.28; i += 0.02) {
          const cosI = Math.cos(i),
            sinI = Math.sin(i);
          const h = cosJ + 2;
          const D = 1 / (sinI * h * sinA + sinJ * cosA + 5);
          const t = sinI * h * cosA - sinJ * sinA;
          const x = Math.floor(COLS / 2 + (COLS * 0.4) * D * (cosI * h * cosB - t * sinB));
          const y = Math.floor(ROWS / 2 + (ROWS * 0.5) * D * (cosI * h * sinB + t * cosB));
          const o = x + COLS * y;
          const N =
            8 *
            ((sinJ * sinA - sinI * cosJ * cosA) * cosB -
              sinI * cosJ * sinA -
              sinJ * cosA -
              cosI * cosJ * sinB);
          if (y >= 0 && y < ROWS && x >= 0 && x < COLS && D > z[o]) {
            z[o] = D;
            buf[o] = RAMP[N > 0 ? Math.min(RAMP.length - 1, Math.floor(N)) : 0];
          }
        }
      }

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      ctx.font = `${Math.round(Math.min(cellW, cellH) * 1.6)}px 'JetBrains Mono', ui-monospace, monospace`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const ch = buf[c + r * COLS];
          if (ch === " ") continue;
          const lum = RAMP.indexOf(ch) / (RAMP.length - 1);
          const cyan = Math.round(40 + lum * 215);
          ctx.fillStyle = `rgb(0, ${cyan}, ${Math.min(255, cyan + 30)})`;
          ctx.fillText(ch, (c + 0.5) * cellW, (r + 0.5) * cellH);
        }
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="block h-full w-full" />;
}
