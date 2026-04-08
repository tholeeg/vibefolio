import { useEffect, useRef } from "react";
import { prepare } from "@chenglou/pretext";

/* ══════════════════════════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════════════════════════ */

const CARD_W = 270;
const CARD_H = 165;
const N_PTS = 20;
const SUPER_N = 4;
const COLS = 2;
const GAP_X = 50;
const GAP_Y = 40;

const ANCHOR_K = 0.045;
const ANCHOR_D = 0.84;
const REPULSION_K = 0.7;
const COLLISION_PAD = 18;
const FRICTION = 0.93;
const SQUISH_AMT = 0.3;
const SLEEP_V = 0.02;
const SLEEP_D = 0.5;

const BLOB_K = 0.14;
const BLOB_D = 0.48;
const MAX_DEV_FRAC = 0.45;

const INSET = 0.15;
const TEXT_GAP = 5;
const TEXT_LERP = 0.15;

const BLOB_BG = "#1a1a1a";
const BLOB_BG_DRAG = "#222";
const STROKE_IDLE = "rgba(0,221,221,0.06)";
const STROKE_DRAG = "rgba(0,221,221,0.18)";
const GHOST_CLR = "rgba(30,30,30,0.2)";
const ANCHOR_CLR = "rgba(0,221,221,0.1)";

const TITLE_FONT = '800 13px "Inter"';
const DESC_FONT = '400 11px "Manrope"';
const TITLE_LH = 17;
const DESC_LH = 15;
const TAG_LH = 18;
const MAX_T = 3;
const MAX_D = 8;

/* ══════════════════════════════════════════════════════════════════════════
   Project data
   ══════════════════════════════════════════════════════════════════════════ */

interface ProjData {
  title: string;
  desc: string;
  tags: string[];
}

const PROJECTS: ProjData[] = [
  {
    title: "NEURAL_DREAMSCAPE_V2",
    desc: "A generative engine translating emotional metadata into real-time architectural visualizers.",
    tags: ["PYTORCH", "WEBGL", "THREE.JS"],
  },
  {
    title: "SYNAPTIC_CONTROL",
    desc: "Redefining developer experience through intent-based coding and contextual LLM wrappers.",
    tags: ["RUST", "WASM", "LLM"],
  },
  {
    title: "RECURSIVE_THOUGHT",
    desc: "The bridge between input and insight. Processing recursive patterns in neural feedback loops.",
    tags: ["TENSORFLOW", "CUDA"],
  },
  {
    title: "INTERFACE_VOID",
    desc: "A minimalist OS interface for zero-distraction engineering. Eliminating chrome to highlight code.",
    tags: ["SWIFT", "METAL"],
  },
  {
    title: "QUANTUM_MESH",
    desc: "Distributed computation leveraging quantum-inspired algorithms for graph optimization.",
    tags: ["GO", "GRPC", "K8S"],
  },
  {
    title: "ECHO_CHAMBER_V3",
    desc: "Real-time audio synthesis with spatial computing and binaural 3D rendering pipelines.",
    tags: ["WEBAUDIO", "RUST"],
  },
];

const N_BLOBS = PROJECTS.length;
const ROWS = Math.ceil(N_BLOBS / COLS);

/* ══════════════════════════════════════════════════════════════════════════
   Blob geometry
   ══════════════════════════════════════════════════════════════════════════ */

interface Pt {
  rx: number;
  ry: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function initBlob(w: number, h: number): Pt[] {
  const pts: Pt[] = [];
  const exp = 2 / SUPER_N;
  for (let i = 0; i < N_PTS; i++) {
    const theta = (i / N_PTS) * Math.PI * 2 - Math.PI / 2;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const rx = Math.sign(ct) * Math.pow(Math.abs(ct) + 1e-10, exp) * (w / 2);
    const ry = Math.sign(st) * Math.pow(Math.abs(st) + 1e-10, exp) * (h / 2);
    pts.push({ rx, ry, x: rx, y: ry, vx: 0, vy: 0 });
  }
  return pts;
}

function traceBlob(
  c: CanvasRenderingContext2D,
  pts: Pt[],
  ox: number,
  oy: number,
  rest: boolean
) {
  const N = pts.length;
  const gx = (i: number) => (rest ? pts[i].rx : pts[i].x);
  const gy = (i: number) => (rest ? pts[i].ry : pts[i].y);
  c.beginPath();
  c.moveTo(ox + (gx(0) + gx(1)) / 2, oy + (gy(0) + gy(1)) / 2);
  for (let i = 0; i < N; i++) {
    const ci = (i + 1) % N;
    const ni = (i + 2) % N;
    c.quadraticCurveTo(
      ox + gx(ci),
      oy + gy(ci),
      ox + (gx(ci) + gx(ni)) / 2,
      oy + (gy(ci) + gy(ni)) / 2
    );
  }
  c.closePath();
}

/* ══════════════════════════════════════════════════════════════════════════
   Scanline intersection + shape wrapping (reused from PoC)
   ══════════════════════════════════════════════════════════════════════════ */

function scanBlobX(
  pts: Pt[],
  scanY: number,
  inset: number
): [number, number] | null {
  const N = pts.length;
  const xs: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % N];
    if ((a.y <= scanY && b.y > scanY) || (b.y <= scanY && a.y > scanY)) {
      const t = (scanY - a.y) / (b.y - a.y);
      xs.push(a.x + t * (b.x - a.x));
    }
  }
  if (xs.length < 2) return null;
  xs.sort((a, b) => a - b);
  const rawL = xs[0];
  const rawR = xs[xs.length - 1];
  const cx = (rawL + rawR) / 2;
  const hw = ((rawR - rawL) / 2) * (1 - inset);
  if (hw < 10) return null;
  return [cx - hw, cx + hw];
}

interface SLine {
  text: string;
  localY: number;
  leftX: number;
  rightX: number;
}

function wrapToShape(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  lh: number,
  startY: number,
  pts: Pt[],
  inset: number,
  maxLines: number
): SLine[] {
  ctx.font = font;
  const words = text.split(/\s+/);
  const lines: SLine[] = [];
  let wi = 0;
  let y = startY;
  let skip = 0;
  while (wi < words.length && lines.length < maxLines && skip < 6) {
    const hit = scanBlobX(pts, y, inset);
    if (!hit) {
      y += lh * 0.5;
      skip++;
      continue;
    }
    skip = 0;
    const [l, r] = hit;
    if (r - l < 18) {
      y += lh * 0.5;
      continue;
    }
    let line = words[wi];
    wi++;
    while (wi < words.length) {
      const test = line + " " + words[wi];
      if (ctx.measureText(test).width > r - l) break;
      line = test;
      wi++;
    }
    lines.push({ text: line, localY: y, leftX: l, rightX: r });
    y += lh;
  }
  return lines;
}

/* ══════════════════════════════════════════════════════════════════════════
   Grid layout
   ══════════════════════════════════════════════════════════════════════════ */

function computeAnchors(cw: number, ch: number): [number, number][] {
  const gridW = COLS * CARD_W + (COLS - 1) * GAP_X;
  const gridH = ROWS * CARD_H + (ROWS - 1) * GAP_Y;
  const sx = (cw - gridW) / 2 + CARD_W / 2;
  const sy = (ch - gridH) / 2 + CARD_H / 2;
  const out: [number, number][] = [];
  for (let i = 0; i < N_BLOBS; i++) {
    out.push([
      sx + (i % COLS) * (CARD_W + GAP_X),
      sy + Math.floor(i / COLS) * (CARD_H + GAP_Y),
    ]);
  }
  return out;
}

const COLL_R = (CARD_W + CARD_H) / 4 + COLLISION_PAD;

/* ══════════════════════════════════════════════════════════════════════════
   BlobState
   ══════════════════════════════════════════════════════════════════════════ */

interface BlobState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  anchorX: number;
  anchorY: number;
  pts: Pt[];
  dragging: boolean;
  offsetX: number;
  offsetY: number;
  prevTotalH: number;
  sleeping: boolean;
  titleEls: HTMLDivElement[];
  descEls: HTMLDivElement[];
  tagEl: HTMLDivElement;
  lastTitleLines: SLine[];
  lastDescLines: SLine[];
  lastTagHit: [number, number] | null;
  lastTagLocalY: number;
}

/* ══════════════════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════════════════ */

export default function StandaloneProjectCard() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cvs = canvasRef.current;
    const tc = textRef.current;
    if (!wrap || !cvs || !tc) return;
    const _ctx = cvs.getContext("2d");
    if (!_ctx) return;
    const ctx: CanvasRenderingContext2D = _ctx;

    /* ── canvas sizing ────────────────────────────────────────── */

    let cw = 0;
    let ch = 0;
    function resize() {
      const dpr = devicePixelRatio || 1;
      cw = wrap!.clientWidth;
      ch = wrap!.clientHeight;
      cvs!.width = cw * dpr;
      cvs!.height = ch * dpr;
      cvs!.style.width = cw + "px";
      cvs!.style.height = ch + "px";
      const anchors = computeAnchors(cw, ch);
      for (let i = 0; i < blobs.length; i++) {
        blobs[i].anchorX = anchors[i][0];
        blobs[i].anchorY = anchors[i][1];
      }
    }

    /* ── Pretext handles ──────────────────────────────────────── */

    for (const p of PROJECTS) {
      prepare(p.title, TITLE_FONT);
      prepare(p.desc, DESC_FONT);
    }

    /* ── DOM line pools (per blob) ────────────────────────────── */

    function makeLine(cls: string): HTMLDivElement {
      const el = document.createElement("div");
      el.className = cls;
      el.style.cssText =
        "position:absolute;top:0;left:0;text-align:center;white-space:nowrap;overflow:hidden;display:none;will-change:transform;";
      tc!.appendChild(el);
      return el;
    }

    function makeTagEl(tags: string[]): HTMLDivElement {
      const el = document.createElement("div");
      el.className = "flex gap-1 flex-wrap justify-center";
      el.style.cssText =
        "position:absolute;top:0;left:0;display:none;will-change:transform;pointer-events:none;";
      tags.forEach((t) => {
        const s = document.createElement("span");
        s.className =
          "font-label text-[8px] px-2 py-0.5 bg-white/5 text-on-surface-variant rounded-full";
        s.textContent = t;
        el.appendChild(s);
      });
      tc!.appendChild(el);
      return el;
    }

    /* ── initialize all blobs ─────────────────────────────────── */

    const anchors = computeAnchors(
      wrap.clientWidth || 800,
      wrap.clientHeight || 600
    );

    const blobs: BlobState[] = PROJECTS.map((p, i) => ({
      id: i,
      x: anchors[i][0],
      y: anchors[i][1],
      vx: 0,
      vy: 0,
      anchorX: anchors[i][0],
      anchorY: anchors[i][1],
      pts: initBlob(CARD_W, CARD_H),
      dragging: false,
      offsetX: 0,
      offsetY: 0,
      prevTotalH: CARD_H * 0.6,
      sleeping: false,
      titleEls: Array.from({ length: MAX_T }, () =>
        makeLine(
          "font-headline font-extrabold text-[13px] text-primary uppercase kerning-tight leading-tight"
        )
      ),
      descEls: Array.from({ length: MAX_D }, () =>
        makeLine("font-body text-[11px] text-on-surface-variant leading-relaxed")
      ),
      tagEl: makeTagEl(p.tags),
      lastTitleLines: [],
      lastDescLines: [],
      lastTagHit: null,
      lastTagLocalY: 0,
    }));

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    /* ── pointer state ────────────────────────────────────────── */

    let dragIdx = -1;
    let curX = 0;
    let curY = 0;

    function down(e: PointerEvent) {
      const r = cvs!.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < blobs.length; i++) {
        const dx = mx - blobs[i].x;
        const dy = my - blobs[i].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < COLL_R && d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best < 0) return;
      const b = blobs[best];
      b.dragging = true;
      b.offsetX = mx - b.x;
      b.offsetY = my - b.y;
      b.sleeping = false;
      dragIdx = best;
      curX = mx;
      curY = my;
      cvs!.setPointerCapture(e.pointerId);
    }

    function move(e: PointerEvent) {
      if (dragIdx < 0) return;
      const r = cvs!.getBoundingClientRect();
      curX = e.clientX - r.left;
      curY = e.clientY - r.top;
    }

    function up(e: PointerEvent) {
      if (dragIdx < 0) return;
      cvs!.releasePointerCapture(e.pointerId);
      const b = blobs[dragIdx];
      b.dragging = false;
      dragIdx = -1;
      reflow();
    }

    cvs.addEventListener("pointerdown", down);
    cvs.addEventListener("pointermove", move);
    cvs.addEventListener("pointerup", up);
    cvs.addEventListener("lostpointercapture", up);

    /* ── reflow: sort blobs by position, reassign grid anchors ── */

    function reflow() {
      const sorted = [...blobs].sort((a, b) => {
        const rowA = Math.round((a.y - anchors[0][1]) / (CARD_H + GAP_Y));
        const rowB = Math.round((b.y - anchors[0][1]) / (CARD_H + GAP_Y));
        if (rowA !== rowB) return rowA - rowB;
        return a.x - b.x;
      });
      const freshAnchors = computeAnchors(cw, ch);
      sorted.forEach((b, i) => {
        b.anchorX = freshAnchors[i][0];
        b.anchorY = freshAnchors[i][1];
        b.sleeping = false;
      });
    }

    /* ══════════════════════════════════════════════════════════════
       Tick — single RAF for all 6 blobs
       ══════════════════════════════════════════════════════════════ */

    function tick() {
      rafId.current = requestAnimationFrame(tick);
      if (cw < 50) return;
      const dpr = devicePixelRatio || 1;

      /* ── 1. per-blob position physics ─────────────────────────── */

      for (const b of blobs) {
        if (b.dragging) {
          const nx = curX - b.offsetX;
          const ny = curY - b.offsetY;
          b.vx = (nx - b.x) * 0.4;
          b.vy = (ny - b.y) * 0.4;
          b.x = nx;
          b.y = ny;
        } else {
          const dx = b.anchorX - b.x;
          const dy = b.anchorY - b.y;
          b.vx = (b.vx + dx * ANCHOR_K) * ANCHOR_D;
          b.vy = (b.vy + dy * ANCHOR_K) * ANCHOR_D;
          b.x += b.vx;
          b.y += b.vy;
        }
      }

      /* ── 2. inter-blob collision (circle) ─────────────────────── */

      for (let i = 0; i < N_BLOBS; i++) {
        for (let j = i + 1; j < N_BLOBS; j++) {
          const a = blobs[i];
          const b = blobs[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minD = COLL_R * 2;
          if (dist >= minD) continue;

          const overlap = minD - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          const force = REPULSION_K * overlap;

          if (!a.dragging) {
            a.vx -= nx * force * 0.5;
            a.vy -= ny * force * 0.5;
          }
          if (!b.dragging) {
            b.vx += nx * force * 0.5;
            b.vy += ny * force * 0.5;
          }

          a.sleeping = false;
          b.sleeping = false;

          squishPts(a.pts, nx, ny, overlap * SQUISH_AMT);
          squishPts(b.pts, -nx, -ny, overlap * SQUISH_AMT);
        }
      }

      /* ── 3. friction ──────────────────────────────────────────── */

      for (const b of blobs) {
        if (!b.dragging) {
          b.vx *= FRICTION;
          b.vy *= FRICTION;
        }
      }

      /* ── 4. blob point physics per blob ───────────────────────── */

      for (const b of blobs) {
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const vAng = Math.atan2(b.vy, b.vx);

        for (const pt of b.pts) {
          let tgx = pt.rx;
          let tgy = pt.ry;
          if (speed > 0.15) {
            const ptA = Math.atan2(pt.ry, pt.rx);
            const trail = -Math.cos(ptA - vAng);
            if (trail > 0) {
              tgx += Math.cos(ptA) * trail * speed * 1.0;
              tgy += Math.sin(ptA) * trail * speed * 1.0;
            }
          }
          const fx = (tgx - pt.x) * BLOB_K;
          const fy = (tgy - pt.y) * BLOB_K;
          pt.vx = (pt.vx + fx) * BLOB_D;
          pt.vy = (pt.vy + fy) * BLOB_D;
          pt.x += pt.vx;
          pt.y += pt.vy;
        }

        const maxDv = Math.max(CARD_W, CARD_H) * MAX_DEV_FRAC;
        for (const pt of b.pts) {
          const ddx = pt.x - pt.rx;
          const ddy = pt.y - pt.ry;
          const d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d > maxDv) {
            const sc = maxDv / d;
            pt.x = pt.rx + ddx * sc;
            pt.y = pt.ry + ddy * sc;
            pt.vx *= 0.3;
            pt.vy *= 0.3;
          }
        }
      }

      /* ── 5. sleeping check ────────────────────────────────────── */

      for (const b of blobs) {
        if (b.dragging) {
          b.sleeping = false;
          continue;
        }
        const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const dAnc = Math.abs(b.x - b.anchorX) + Math.abs(b.y - b.anchorY);
        if (spd < SLEEP_V && dAnc < SLEEP_D) {
          b.sleeping = true;
        }
      }

      /* ── 6. shape wrapping (skip sleeping) ────────────────────── */

      for (let i = 0; i < N_BLOBS; i++) {
        const b = blobs[i];
        if (b.sleeping) continue;

        const proj = PROJECTS[i];
        let cmX = 0;
        let cmY = 0;
        for (const pt of b.pts) {
          cmX += pt.x;
          cmY += pt.y;
        }
        cmX /= b.pts.length;
        cmY /= b.pts.length;

        const textStartY = cmY - b.prevTotalH / 2;

        const tLines = wrapToShape(
          ctx,
          proj.title,
          TITLE_FONT,
          TITLE_LH,
          textStartY,
          b.pts,
          INSET,
          MAX_T
        );
        const titleEndY =
          tLines.length > 0
            ? tLines[tLines.length - 1].localY + TITLE_LH
            : textStartY + TITLE_LH;

        const dLines = wrapToShape(
          ctx,
          proj.desc,
          DESC_FONT,
          DESC_LH,
          titleEndY + TEXT_GAP,
          b.pts,
          INSET,
          MAX_D
        );
        const descEndY =
          dLines.length > 0
            ? dLines[dLines.length - 1].localY + DESC_LH
            : titleEndY + TEXT_GAP + DESC_LH;

        const tagLocalY = descEndY + TEXT_GAP;
        const tagHit = scanBlobX(b.pts, tagLocalY + TAG_LH / 2, INSET);
        const totalH = tagLocalY + TAG_LH - textStartY;
        b.prevTotalH += (totalH - b.prevTotalH) * TEXT_LERP;

        b.lastTitleLines = tLines;
        b.lastDescLines = dLines;
        b.lastTagHit = tagHit;
        b.lastTagLocalY = tagLocalY;
      }

      /* ── 7. canvas draw ───────────────────────────────────────── */

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      for (const b of blobs) {
        /* anchor crosshair */
        ctx.save();
        ctx.strokeStyle = ANCHOR_CLR;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(b.anchorX - 10, b.anchorY);
        ctx.lineTo(b.anchorX + 10, b.anchorY);
        ctx.moveTo(b.anchorX, b.anchorY - 10);
        ctx.lineTo(b.anchorX, b.anchorY + 10);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      /* draw non-dragged first, then dragged on top */
      const drawOrder = blobs.filter((b) => !b.dragging);
      const dragged = blobs.find((b) => b.dragging);
      if (dragged) drawOrder.push(dragged);

      for (const b of drawOrder) {
        if (b.dragging) {
          traceBlob(ctx, b.pts, b.anchorX, b.anchorY, true);
          ctx.fillStyle = GHOST_CLR;
          ctx.fill();
        }

        traceBlob(ctx, b.pts, b.x, b.y, false);
        ctx.fillStyle = b.dragging ? BLOB_BG_DRAG : BLOB_BG;
        ctx.fill();
        ctx.strokeStyle = b.dragging ? STROKE_DRAG : STROKE_IDLE;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        /* debug scanlines for dragged blob only */
        if (b.dragging) {
          ctx.save();
          for (const ln of [...b.lastTitleLines, ...b.lastDescLines]) {
            ctx.strokeStyle = "rgba(255,40,40,0.25)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(b.x + ln.leftX, b.y + ln.localY);
            ctx.lineTo(b.x + ln.rightX, b.y + ln.localY);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      /* ── 8. update DOM lines ──────────────────────────────────── */

      for (const b of blobs) {
        for (let k = 0; k < MAX_T; k++) {
          const el = b.titleEls[k];
          if (k < b.lastTitleLines.length) {
            const ln = b.lastTitleLines[k];
            el.textContent = ln.text;
            el.style.display = "";
            el.style.width = Math.round(ln.rightX - ln.leftX) + "px";
            el.style.transform = `translate3d(${(b.x + ln.leftX).toFixed(1)}px,${(b.y + ln.localY).toFixed(1)}px,0)`;
          } else {
            el.style.display = "none";
          }
        }
        for (let k = 0; k < MAX_D; k++) {
          const el = b.descEls[k];
          if (k < b.lastDescLines.length) {
            const ln = b.lastDescLines[k];
            el.textContent = ln.text;
            el.style.display = "";
            el.style.width = Math.round(ln.rightX - ln.leftX) + "px";
            el.style.transform = `translate3d(${(b.x + ln.leftX).toFixed(1)}px,${(b.y + ln.localY).toFixed(1)}px,0)`;
          } else {
            el.style.display = "none";
          }
        }
        const th = b.lastTagHit;
        if (th) {
          b.tagEl.style.display = "";
          b.tagEl.style.width = Math.round(th[1] - th[0]) + "px";
          b.tagEl.style.transform = `translate3d(${(b.x + th[0]).toFixed(1)}px,${(b.y + b.lastTagLocalY).toFixed(1)}px,0)`;
        } else {
          b.tagEl.style.display = "none";
        }
      }
    }

    tick();

    return () => {
      cancelAnimationFrame(rafId.current);
      ro.disconnect();
      while (tc.firstChild) tc.removeChild(tc.firstChild);
      cvs.removeEventListener("pointerdown", down);
      cvs.removeEventListener("pointermove", move);
      cvs.removeEventListener("pointerup", up);
      cvs.removeEventListener("lostpointercapture", up);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative w-full bg-black overflow-hidden"
      style={{ height: "100vh", touchAction: "none" }}
    >
      <div className="absolute top-6 left-8 z-10 pointer-events-none select-none">
        <span className="font-label text-[10px] text-primary-fixed/40 uppercase tracking-[0.3em]">
          FLUID GRID — 6 BLOBS · COLLISION · SHAPE WRAPPING
        </span>
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none select-none text-center">
        <span className="font-label text-[9px] text-on-surface-variant/30 uppercase tracking-widest">
          DRAG A BLOB TO PUSH OTHERS · RELEASE TO REFLOW GRID
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />
      <div
        ref={textRef}
        className="absolute top-0 left-0 pointer-events-none select-none"
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Squish helper — push blob points facing the collision direction inward
   ══════════════════════════════════════════════════════════════════════════ */

function squishPts(pts: Pt[], nx: number, ny: number, amount: number) {
  for (const pt of pts) {
    const d = Math.sqrt(pt.rx * pt.rx + pt.ry * pt.ry) || 1;
    const dot = (pt.rx * nx + pt.ry * ny) / d;
    if (dot > 0.3) {
      pt.vx -= nx * amount * dot;
      pt.vy -= ny * amount * dot;
    }
  }
}
