/**
 * 10 PRINT — the canonical Commodore 64 one-liner:
 *   `10 PRINT CHR$(205.5+RND(1)); : GOTO 10`
 *
 * Animated: the field gradually rewrites itself one cell at a
 * time; on pointer move, a wave radiates from the cursor and
 * flips affected glyphs (\ ↔ /).
 */

import { useEffect, useRef } from "react";
import { readMotion } from "../../lib/useMotion";

const CELL = 14;
const PALETTE = ["#00d4ff", "#00fbfb", "#571bc1", "#96f5ff"];

export default function TenPrintCard() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    let W = 0,
      H = 0,
      cols = 0,
      rows = 0;
    let cells: { d: 0 | 1; c: number }[] = [];
    let mx = -100,
      my = -100;
    let waveT = 0;

    const resize = () => {
      const r = cvs.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      cvs.width = Math.round(W * dpr);
      cvs.height = Math.round(H * dpr);
      cvs.style.width = W + "px";
      cvs.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(W / CELL);
      rows = Math.ceil(H / CELL);
      cells = new Array(cols * rows).fill(0).map(() => ({
        d: Math.random() < 0.5 ? 0 : 1,
        c: Math.floor(Math.random() * PALETTE.length),
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cvs);

    const onMove = (e: PointerEvent) => {
      const r = cvs.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
      waveT = 1;
    };
    cvs.addEventListener("pointermove", onMove);

    let raf = 0;
    let last = performance.now();
    let rewriteCarry = 0;
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

      /* Slow self-rewrite: ~6 cells/sec on quality auto. */
      if (!m.prefersReducedMotion) {
        rewriteCarry += dt * 6;
        while (rewriteCarry > 1) {
          rewriteCarry -= 1;
          const idx = Math.floor(Math.random() * cells.length);
          cells[idx] = {
            d: Math.random() < 0.5 ? 0 : 1,
            c: Math.floor(Math.random() * PALETTE.length),
          };
        }
        waveT *= 0.965;
      }

      /* Black background. */
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";

      const wRadius = (1 - waveT) * Math.max(W, H) * 1.2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = cells[r * cols + c];
          const x = c * CELL;
          const y = r * CELL;

          /* Wave flip: cells inside the expanding ring use inverted glyph. */
          let d = cell.d;
          if (waveT > 0.05) {
            const dx = x + CELL / 2 - mx;
            const dy = y + CELL / 2 - my;
            const dist = Math.hypot(dx, dy);
            if (Math.abs(dist - wRadius) < 24) d = (1 - d) as 0 | 1;
          }

          ctx.strokeStyle = PALETTE[cell.c];
          ctx.beginPath();
          if (d === 0) {
            ctx.moveTo(x + 1, y + 1);
            ctx.lineTo(x + CELL - 1, y + CELL - 1);
          } else {
            ctx.moveTo(x + CELL - 1, y + 1);
            ctx.lineTo(x + 1, y + CELL - 1);
          }
          ctx.stroke();
        }
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      cvs.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} className="block h-full w-full" />;
}
