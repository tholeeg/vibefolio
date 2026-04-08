import { useEffect, useRef } from "react";
import { prepare } from "@chenglou/pretext";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ══════════════════════════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════════════════════════ */

const N_PTS = 20;
const SUPER_N = 4;
const GAP = 40;
const DESKTOP_BP = 768;

const SLOT_ROWS = 2;

const ANCHOR_K = 0.14;
const ANCHOR_D = 0.65;
const REPULSION_K = 0.10;
const COLLISION_PAD = -10;
const FRICTION = 0.78;
const SQUISH_AMT = 0.06;
const SLEEP_V = 0.015;
const SLEEP_D = 0.5;

const BLOB_K = 0.08;
const BLOB_D = 0.38;
const MAX_DEV_FRAC = 0.45;

const INSET = 0.15;
const TEXT_GAP = 6;
const TEXT_LERP = 0.12;
const ICON_GAP = 40;

const BLOB_BG = "#050505";
const BLOB_BG_DRAG = "#080808";
const STROKE_IDLE = "rgba(0,255,255,0.18)";
const STROKE_DRAG = "rgba(0,255,255,0.40)";
const GHOST_CLR = "rgba(255,255,255,0.02)";

const TITLE_FONT = '800 13px "Inter"';
const DESC_FONT = '400 11px "Manrope"';
const TITLE_LH = 17;
const DESC_LH = 15;
const MAX_TL = 3;
const MAX_DL = 5;

const PULSE_AMP = 0.05;
const PULSE_DECAY = 0.87;

/* ── Grid dots ────────────────────────────────────────────────────────── */

const GRID_SPACING = 32;
const GRID_REPEL_R = 280;
const GRID_REPEL_K = 55;
const GRID_MOUSE_R = 140;
const GRID_MOUSE_K = 28;
const GRID_LERP = 0.08;
const GRID_DOT_SZ = 1.5;
const GRID_ALPHA_BASE = 0.35;

/* ── Drop zone ────────────────────────────────────────────────────────── */

const DROP_R = 46;
const DROP_DETECT_R = 75;

/* ══════════════════════════════════════════════════════════════════════════
   Project data — 4 projects, 2×2 grid
   ══════════════════════════════════════════════════════════════════════════ */

type IconKind = "eye" | "chart" | "search" | "play";

interface ProjData {
  title: string;
  desc: string;
  link: string | null;
  icon: IconKind;
}

const PROJECTS: ProjData[] = [
  {
    title: "BRAND_REVIEW",
    desc: "A visual compliance app, cross-referencing deliverables against identity guidelines.",
    link: "https://brand-review.vercel.app/",
    icon: "eye",
  },
  {
    title: "CHART_GENERATOR",
    desc: "A Python-driven charting engine, generating dynamic visualizations from code.",
    link: "https://chart-generator-indeed.streamlit.app/",
    icon: "chart",
  },
  {
    title: "SEARCH_EVERYTHING",
    desc: "Work in Progress.",
    link: null,
    icon: "search",
  },
  {
    title: "AI_PRESENTATION",
    desc: "Work in Progress.",
    link: null,
    icon: "play",
  },
];

const N_BLOBS = PROJECTS.length;

/* ══════════════════════════════════════════════════════════════════════════
   Blob geometry helpers
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
  rest: boolean,
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
      oy + (gy(ci) + gy(ni)) / 2,
    );
  }
  c.closePath();
}

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

/* ══════════════════════════════════════════════════════════════════════════
   Scanline wrapping
   ══════════════════════════════════════════════════════════════════════════ */

function scanBlobX(
  pts: Pt[],
  scanY: number,
  inset: number,
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
  maxLines: number,
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
   Grid slots — 2 cols × 2 rows = 4 anchors
   ══════════════════════════════════════════════════════════════════════════ */

function computeSlots(
  cw: number,
  ch: number,
  cols: number,
  cardW: number,
  cardH: number,
): [number, number][] {
  const rows = cols === 1 ? N_BLOBS + 1 : SLOT_ROWS;
  const gridW = cols * cardW + (cols - 1) * GAP;
  const gridH = rows * cardH + (rows - 1) * GAP;
  const sx = (cw - gridW) / 2 + cardW / 2;
  const sy = (ch - gridH) / 2 + cardH / 2;
  const out: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push([sx + c * (cardW + GAP), sy + r * (cardH + GAP)]);
    }
  }
  return out;
}

function assignAnchors(blobs: BlobState[], slots: [number, number][]) {
  const sorted = [...blobs].sort((a, b) => {
    const dy = a.y - b.y;
    if (Math.abs(dy) > 30) return dy;
    return a.x - b.x;
  });
  const used = new Set<number>();
  for (const b of sorted) {
    let best = 0;
    let bestD = Infinity;
    for (let s = 0; s < slots.length; s++) {
      if (used.has(s)) continue;
      const dx = b.x - slots[s][0];
      const dy = b.y - slots[s][1];
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    used.add(best);
    b.anchorX = slots[best][0];
    b.anchorY = slots[best][1];
    b.sleeping = false;
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Icon drawing (neon-cyan Canvas glyphs)
   ══════════════════════════════════════════════════════════════════════════ */

function drawIcon(
  ctx: CanvasRenderingContext2D,
  icon: IconKind,
  cx: number,
  cy: number,
  r: number,
) {
  ctx.save();
  ctx.strokeStyle = "#00FFFF";
  ctx.fillStyle = "rgba(0,255,255,0.10)";
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "#00FFFF";
  ctx.shadowBlur = 10;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (icon) {
    case "eye": {
      const w = r * 1.1;
      const h = r * 0.55;
      ctx.beginPath();
      ctx.moveTo(cx - w, cy);
      ctx.quadraticCurveTo(cx, cy - h * 1.8, cx + w, cy);
      ctx.quadraticCurveTo(cx, cy + h * 1.8, cx - w, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = "#00FFFF";
      ctx.fill();
      break;
    }
    case "chart": {
      const barW = r * 0.22;
      const gap = r * 0.5;
      const heights = [0.45, 0.9, 0.65];
      const base = cy + r * 0.5;
      for (let i = 0; i < 3; i++) {
        const bx = cx + (i - 1) * gap - barW / 2;
        const bh = r * heights[i] * 1.4;
        ctx.fillStyle = "rgba(0,255,255,0.12)";
        ctx.fillRect(bx, base - bh, barW, bh);
        ctx.strokeRect(bx, base - bh, barW, bh);
      }
      ctx.beginPath();
      ctx.moveTo(cx - r, base);
      ctx.lineTo(cx + r, base);
      ctx.stroke();
      break;
    }
    case "search": {
      const cr = r * 0.45;
      ctx.beginPath();
      ctx.arc(cx - r * 0.1, cy - r * 0.1, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 2;
      const dx = Math.cos(Math.PI * 0.25) * cr;
      const dy = Math.sin(Math.PI * 0.25) * cr;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.1 + dx, cy - r * 0.1 + dy);
      ctx.lineTo(cx + r * 0.55, cy + r * 0.55);
      ctx.stroke();
      break;
    }
    case "play": {
      const sz = r * 0.7;
      const rx2 = cx - sz;
      const ry2 = cy - sz * 0.7;
      const rw = sz * 2;
      const rh = sz * 1.4;
      const cr2 = 3;
      ctx.beginPath();
      ctx.moveTo(rx2 + cr2, ry2);
      ctx.lineTo(rx2 + rw - cr2, ry2);
      ctx.arcTo(rx2 + rw, ry2, rx2 + rw, ry2 + cr2, cr2);
      ctx.lineTo(rx2 + rw, ry2 + rh - cr2);
      ctx.arcTo(rx2 + rw, ry2 + rh, rx2 + rw - cr2, ry2 + rh, cr2);
      ctx.lineTo(rx2 + cr2, ry2 + rh);
      ctx.arcTo(rx2, ry2 + rh, rx2, ry2 + rh - cr2, cr2);
      ctx.lineTo(rx2, ry2 + cr2);
      ctx.arcTo(rx2, ry2, rx2 + cr2, ry2, cr2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#00FFFF";
      ctx.beginPath();
      ctx.moveTo(cx - sz * 0.3, cy - sz * 0.35);
      ctx.lineTo(cx - sz * 0.3, cy + sz * 0.35);
      ctx.lineTo(cx + sz * 0.35, cy);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════════════════
   Interfaces
   ══════════════════════════════════════════════════════════════════════════ */

interface GridDot {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
}

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
  pulseT: number;
  titleEls: HTMLDivElement[];
  descEls: HTMLDivElement[];
  lastTitleLines: SLine[];
  lastDescLines: SLine[];
  iconLocalY: number;
}

/* ══════════════════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════════════════ */

export default function ProjectGrid() {
  const sectionRef = useRef<HTMLElement>(null);
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

    /* ── responsive sizing state ──────────────────────────────── */

    let cw = 0;
    let ch = 0;
    let cardW = 280;
    let cardH = 180;
    let cols = 2;
    let collR = (cardW + cardH) / 4 + COLLISION_PAD;
    let prevCardW = cardW;

    /* ── drop zone state ──────────────────────────────────────── */

    let dropX = 0;
    let dropY = 0;
    let dropZoneAlpha = 0;
    let flashT = 0;
    let flashX = 0;
    let flashY = 0;
    let flashIsWip = false;
    let shockT = 0;
    let shockR = 0;
    let wipMsgT = 0;

    /* ── scroll reveal state ──────────────────────────────────── */

    const revealGoal = { t: 0 };
    let revealT = 0;

    /* ── Pretext handles ──────────────────────────────────────── */

    for (const p of PROJECTS) {
      prepare(p.title, TITLE_FONT);
      prepare(p.desc, DESC_FONT);
    }

    /* ── DOM line pools ───────────────────────────────────────── */

    function makeLine(cls: string): HTMLDivElement {
      const el = document.createElement("div");
      el.className = cls;
      el.style.cssText =
        "position:absolute;top:0;left:0;text-align:center;white-space:nowrap;overflow:hidden;display:none;will-change:transform;";
      tc!.appendChild(el);
      return el;
    }

    /* ── blobs array ──────────────────────────────────────────── */

    let blobs: BlobState[] = [];

    /* ── sizing ───────────────────────────────────────────────── */

    cw = wrap.clientWidth || 800;
    ch = wrap.clientHeight || 500;

    function updateSizing() {
      cw = wrap!.clientWidth;
      ch = wrap!.clientHeight;
      const isMobile = cw < DESKTOP_BP;
      cols = isMobile ? 1 : 2;
      cardW = isMobile
        ? Math.min(cw - 32, 300)
        : Math.min(320, (cw - 3 * GAP) / 2);
      cardH = Math.round(cardW * 0.65);
      collR = (cardW + cardH) / 4 + COLLISION_PAD;
      dropX = cw - 70;
      dropY = ch / 2;

      if (blobs.length > 0 && Math.abs(cardW - prevCardW) > 5) {
        for (const b of blobs) {
          b.pts = initBlob(cardW, cardH);
          b.prevTotalH = cardH * 0.6;
        }
        prevCardW = cardW;
      }
    }

    updateSizing();
    const initialSlots = computeSlots(cw, ch, cols, cardW, cardH);

    /* ── create blobs ─────────────────────────────────────────── */

    blobs = PROJECTS.map((_, i) => ({
      id: i,
      x: initialSlots[i]?.[0] ?? cw / 2,
      y: initialSlots[i]?.[1] ?? ch / 2,
      vx: 0,
      vy: 0,
      anchorX: initialSlots[i]?.[0] ?? cw / 2,
      anchorY: initialSlots[i]?.[1] ?? ch / 2,
      pts: initBlob(cardW, cardH),
      dragging: false,
      offsetX: 0,
      offsetY: 0,
      prevTotalH: cardH * 0.6,
      sleeping: false,
      pulseT: 0,
      titleEls: Array.from({ length: MAX_TL }, () =>
        makeLine(
          "font-headline font-extrabold text-[13px] text-primary uppercase kerning-tight leading-tight",
        ),
      ),
      descEls: Array.from({ length: MAX_DL }, () =>
        makeLine(
          "font-body text-[11px] text-on-surface-variant leading-relaxed",
        ),
      ),
      lastTitleLines: [],
      lastDescLines: [],
      iconLocalY: 0,
    }));

    /* ── grid dots ────────────────────────────────────────────── */

    let gridDots: GridDot[] = [];

    function buildGrid() {
      const out: GridDot[] = [];
      const gc = Math.ceil(cw / GRID_SPACING) + 1;
      const gr = Math.ceil(ch / GRID_SPACING) + 1;
      const ox = (cw - (gc - 1) * GRID_SPACING) / 2;
      const oy = (ch - (gr - 1) * GRID_SPACING) / 2;
      for (let r = 0; r < gr; r++) {
        for (let c = 0; c < gc; c++) {
          const x = ox + c * GRID_SPACING;
          const y = oy + r * GRID_SPACING;
          out.push({ baseX: x, baseY: y, x, y });
        }
      }
      return out;
    }

    gridDots = buildGrid();

    /* ── resize handler ───────────────────────────────────────── */

    function resize() {
      updateSizing();
      const dpr = devicePixelRatio || 1;
      cvs!.width = cw * dpr;
      cvs!.height = ch * dpr;
      cvs!.style.width = cw + "px";
      cvs!.style.height = ch + "px";
      const slots = computeSlots(cw, ch, cols, cardW, cardH);
      assignAnchors(blobs, slots);
      gridDots = buildGrid();
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    /* ── pointer state ────────────────────────────────────────── */

    let dragIdx = -1;
    let curX = 0;
    let curY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let mouseIn = false;
    let prevHoverIdx = -1;

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
        if (d < collR && d < bestD) {
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
      const r = cvs!.getBoundingClientRect();
      mouseX = e.clientX - r.left;
      mouseY = e.clientY - r.top;
      if (dragIdx >= 0) {
        curX = mouseX;
        curY = mouseY;
      }
    }

    function up(e: PointerEvent) {
      if (dragIdx < 0) return;
      cvs!.releasePointerCapture(e.pointerId);

      const b = blobs[dragIdx];
      const dx = b.x - dropX;
      const dy = b.y - dropY;
      if (Math.sqrt(dx * dx + dy * dy) < DROP_DETECT_R) {
        const link = PROJECTS[b.id].link;
        flashX = dropX;
        flashY = dropY;
        if (link) {
          flashIsWip = false;
          flashT = 1;
          shockT = 1;
          shockR = 0;
          setTimeout(() => window.open(link, "_blank"), 400);
        } else {
          flashIsWip = true;
          flashT = 1;
          wipMsgT = 1;
        }
      }

      b.dragging = false;
      dragIdx = -1;
      const slots = computeSlots(cw, ch, cols, cardW, cardH);
      assignAnchors(blobs, slots);
    }

    function enter() {
      mouseIn = true;
    }
    function leave() {
      mouseIn = false;
      prevHoverIdx = -1;
    }

    cvs.addEventListener("pointerdown", down);
    cvs.addEventListener("pointermove", move);
    cvs.addEventListener("pointerup", up);
    cvs.addEventListener("lostpointercapture", up);
    cvs.addEventListener("pointerenter", enter);
    cvs.addEventListener("pointerleave", leave);

    /* ── scroll reveal (GSAP ScrollTrigger) ───────────────────── */

    let stKill: (() => void) | null = null;
    const section = sectionRef.current;
    if (section) {
      const st = ScrollTrigger.create({
        trigger: section,
        start: "top 85%",
        end: "top 15%",
        onUpdate: (self) => {
          revealGoal.t = self.progress;
        },
      });
      stKill = () => st.kill();
    }

    /* ══════════════════════════════════════════════════════════════
       Tick
       ══════════════════════════════════════════════════════════════ */

    function tick() {
      rafId.current = requestAnimationFrame(tick);
      if (cw < 50) return;
      const dpr = devicePixelRatio || 1;

      revealT += (revealGoal.t - revealT) * 0.08;

      /* ── 0. hover + pulse ──────────────────────────────────── */

      let hoverIdx = -1;
      if (mouseIn && dragIdx < 0) {
        let bestD = Infinity;
        for (let i = 0; i < N_BLOBS; i++) {
          const dx = mouseX - blobs[i].x;
          const dy = mouseY - blobs[i].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < collR && d < bestD) {
            bestD = d;
            hoverIdx = i;
          }
        }
      }
      if (hoverIdx >= 0 && hoverIdx !== prevHoverIdx) {
        blobs[hoverIdx].pulseT = PULSE_AMP;
        blobs[hoverIdx].sleeping = false;
      }
      prevHoverIdx = hoverIdx;

      /* ── 1. position physics (dense-fluid feel) ────────────── */

      for (const b of blobs) {
        if (b.dragging) {
          const nx = curX - b.offsetX;
          const ny = curY - b.offsetY;
          b.vx = (nx - b.x) * 0.25;
          b.vy = (ny - b.y) * 0.25;
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

      /* ── 2. collisions ─────────────────────────────────────── */

      for (let i = 0; i < N_BLOBS; i++) {
        for (let j = i + 1; j < N_BLOBS; j++) {
          const a = blobs[i];
          const b = blobs[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minD = collR * 2;
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

      /* ── 3. friction ───────────────────────────────────────── */

      for (const b of blobs) {
        if (!b.dragging) {
          b.vx *= FRICTION;
          b.vy *= FRICTION;
        }
      }

      /* ── 4. blob point physics + pulse ─────────────────────── */

      for (const b of blobs) {
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const vAng = Math.atan2(b.vy, b.vx);
        const pScale = 1 + b.pulseT;

        for (const pt of b.pts) {
          let tgx = pt.rx * pScale;
          let tgy = pt.ry * pScale;
          if (speed > 0.15) {
            const ptA = Math.atan2(pt.ry, pt.rx);
            const trail = -Math.cos(ptA - vAng);
            if (trail > 0) {
              tgx += Math.cos(ptA) * trail * speed * 0.8;
              tgy += Math.sin(ptA) * trail * speed * 0.8;
            }
          }
          const fx = (tgx - pt.x) * BLOB_K;
          const fy = (tgy - pt.y) * BLOB_K;
          pt.vx = (pt.vx + fx) * BLOB_D;
          pt.vy = (pt.vy + fy) * BLOB_D;
          pt.x += pt.vx;
          pt.y += pt.vy;
        }

        b.pulseT *= PULSE_DECAY;
        if (b.pulseT < 0.0005) b.pulseT = 0;

        const maxDv = Math.max(cardW, cardH) * MAX_DEV_FRAC;
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

      /* ── 5. grid dot displacement ──────────────────────────── */

      for (const gp of gridDots) {
        let tgtX = gp.baseX;
        let tgtY = gp.baseY;

        for (const b of blobs) {
          const dx = gp.baseX - b.x;
          const dy = gp.baseY - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < GRID_REPEL_R) {
            const t = 1 - dist / GRID_REPEL_R;
            const s = t * t * (3 - 2 * t);
            const force = GRID_REPEL_K * s;
            tgtX += (dx / dist) * force;
            tgtY += (dy / dist) * force;
          }
        }

        if (mouseIn) {
          const dx = gp.baseX - mouseX;
          const dy = gp.baseY - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < GRID_MOUSE_R) {
            const t2 = 1 - dist / GRID_MOUSE_R;
            const force = GRID_MOUSE_K * t2 * t2 * (3 - 2 * t2);
            tgtX += (dx / dist) * force;
            tgtY += (dy / dist) * force;
          }
        }

        if (shockT > 0.01) {
          const dx = gp.baseX - flashX;
          const dy = gp.baseY - flashY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const wave = Math.abs(dist - shockR);
          if (wave < 50) {
            const force = shockT * 25 * (1 - wave / 50);
            tgtX += (dx / dist) * force;
            tgtY += (dy / dist) * force;
          }
        }

        if (revealT > 0.05 && revealT < 0.85) {
          const wavePhase = (revealT - 0.05) / 0.8;
          const waveAmp = Math.sin(wavePhase * Math.PI) * 8;
          const angle = gp.baseX * 0.05 + gp.baseY * 0.03;
          tgtX += Math.cos(angle + revealT * 14) * waveAmp;
          tgtY += Math.sin(angle + revealT * 14) * waveAmp;
        }

        gp.x += (tgtX - gp.x) * GRID_LERP;
        gp.y += (tgtY - gp.y) * GRID_LERP;
      }

      /* ── 5b. shockwave decay ───────────────────────────────── */

      if (shockT > 0.01) {
        shockR += 10;
        shockT *= 0.95;
      } else {
        shockT = 0;
      }

      /* ── 6. drop zone fade ─────────────────────────────────── */

      const dropGoal = dragIdx >= 0 ? 1 : 0;
      dropZoneAlpha += (dropGoal - dropZoneAlpha) * 0.1;

      /* ── 7. sleeping ───────────────────────────────────────── */

      for (const b of blobs) {
        if (b.dragging || b.pulseT > 0.001) {
          b.sleeping = false;
          continue;
        }
        const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const dAnc = Math.abs(b.x - b.anchorX) + Math.abs(b.y - b.anchorY);
        if (spd < SLEEP_V && dAnc < SLEEP_D) b.sleeping = true;
      }

      /* ── 8. shape wrapping (title → icon → description) ───── */

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
          MAX_TL,
        );
        const titleEndY =
          tLines.length > 0
            ? tLines[tLines.length - 1].localY + TITLE_LH
            : textStartY + TITLE_LH;

        b.iconLocalY = titleEndY + ICON_GAP / 2;

        const dLines = wrapToShape(
          ctx,
          proj.desc,
          DESC_FONT,
          DESC_LH,
          titleEndY + ICON_GAP,
          b.pts,
          INSET,
          MAX_DL,
        );
        const descEndY =
          dLines.length > 0
            ? dLines[dLines.length - 1].localY + DESC_LH
            : titleEndY + ICON_GAP + DESC_LH;

        const totalH = descEndY - textStartY;
        b.prevTotalH += (totalH - b.prevTotalH) * TEXT_LERP;
        b.lastTitleLines = tLines;
        b.lastDescLines = dLines;
      }

      /* ── 9. canvas draw ────────────────────────────────────── */

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      /* -- grid dots (cyan, fade in with scroll) -- */
      const gridReveal = Math.min(1, revealT * 2.5);
      ctx.fillStyle = "#00FFFF";
      for (const gp of gridDots) {
        const dx = gp.x - gp.baseX;
        const dy = gp.y - gp.baseY;
        const disp = Math.sqrt(dx * dx + dy * dy);
        ctx.globalAlpha =
          (GRID_ALPHA_BASE + Math.min(0.25, disp * 0.012)) * gridReveal;
        ctx.fillRect(
          gp.x - GRID_DOT_SZ / 2,
          gp.y - GRID_DOT_SZ / 2,
          GRID_DOT_SZ,
          GRID_DOT_SZ,
        );
      }
      ctx.globalAlpha = 1;

      /* -- blobs (non-dragged first, dragged on top) -- */
      const strokeReveal = Math.max(0, Math.min(1, (revealT - 0.25) * 4));
      const fillReveal = Math.max(0, Math.min(1, (revealT - 0.45) * 2.5));
      const blobScale = 0.8 + 0.2 * fillReveal;

      const order = blobs.filter((b) => !b.dragging);
      const dragged = blobs.find((b) => b.dragging);
      if (dragged) order.push(dragged);

      for (const b of order) {
        if (b.dragging) {
          ctx.globalAlpha = fillReveal;
          traceBlob(ctx, b.pts, b.anchorX, b.anchorY, true);
          ctx.fillStyle = GHOST_CLR;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.scale(blobScale, blobScale);
        ctx.translate(-b.x, -b.y);

        ctx.globalAlpha = fillReveal;
        traceBlob(ctx, b.pts, b.x, b.y, false);
        ctx.fillStyle = b.dragging ? BLOB_BG_DRAG : BLOB_BG;
        ctx.fill();

        ctx.globalAlpha = strokeReveal;
        ctx.strokeStyle = b.dragging ? STROKE_DRAG : STROKE_IDLE;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.restore();

        if (b.pulseT > 0.002 && strokeReveal > 0.1) {
          const glowI = Math.min(1, b.pulseT / PULSE_AMP);
          ctx.save();
          ctx.globalAlpha = strokeReveal;
          traceBlob(ctx, b.pts, b.x, b.y, false);
          ctx.shadowBlur = 28 * glowI;
          ctx.shadowColor = `rgba(0,221,221,${(0.5 * glowI).toFixed(3)})`;
          ctx.strokeStyle = `rgba(175,82,255,${(0.35 * glowI).toFixed(3)})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.restore();
        }
      }

      /* -- icons (on top of blob fill, between title & desc) -- */
      if (fillReveal > 0.05) {
        ctx.globalAlpha = fillReveal;
        for (let i = 0; i < N_BLOBS; i++) {
          const b = blobs[i];
          drawIcon(ctx, PROJECTS[i].icon, b.x, b.y + b.iconLocalY, 15);
        }
        ctx.globalAlpha = 1;
      }

      /* -- connection line blob → drop zone -- */
      if (dragIdx >= 0 && dropZoneAlpha > 0.05) {
        const b = blobs[dragIdx];
        const dx = dropX - b.x;
        const dy = dropY - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const proximity = Math.max(0, 1 - dist / (cw * 0.5));
        if (proximity > 0) {
          ctx.save();
          const grad = ctx.createLinearGradient(b.x, b.y, dropX, dropY);
          grad.addColorStop(
            0,
            `rgba(0,255,255,${(proximity * 0.15 * dropZoneAlpha).toFixed(3)})`,
          );
          grad.addColorStop(
            1,
            `rgba(0,255,255,${(proximity * 0.35 * dropZoneAlpha).toFixed(3)})`,
          );
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1 + proximity * 2;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(dropX, dropY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }

      /* -- drop zone -- */
      if (dropZoneAlpha > 0.01) {
        const now = performance.now();
        const pulse = 0.8 + Math.sin(now * 0.003) * 0.2;
        const a = dropZoneAlpha;

        ctx.save();
        ctx.shadowColor = "#00FFFF";
        ctx.shadowBlur = 20 * pulse * a;

        ctx.strokeStyle = `rgba(0,255,255,${(0.4 * pulse * a).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(dropX, dropY, DROP_R * pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(0,255,255,${(0.15 * pulse * a).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(dropX, dropY, DROP_R * 0.55 * pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;

        const sz = DROP_R * 0.25;
        ctx.strokeStyle = `rgba(0,255,255,${(0.6 * a).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(dropX - sz, dropY + sz);
        ctx.lineTo(dropX + sz, dropY - sz);
        ctx.moveTo(dropX + sz * 0.3, dropY - sz);
        ctx.lineTo(dropX + sz, dropY - sz);
        ctx.lineTo(dropX + sz, dropY - sz * 0.3);
        ctx.stroke();

        ctx.font = '700 7px "Inter"';
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(0,255,255,${(0.45 * a).toFixed(3)})`;
        ctx.fillText("DROP TO OPEN", dropX, dropY + DROP_R + 14);
        ctx.fillText("APPLICATION LINK", dropX, dropY + DROP_R + 23);

        ctx.restore();
      }

      /* -- flash + shockwave on drop -- */
      if (flashT > 0.01) {
        const clr = flashIsWip ? "255,80,80" : "0,255,255";
        ctx.save();
        const r = (1 - flashT) * 350;
        ctx.beginPath();
        ctx.arc(flashX, flashY, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${clr},${(flashT * 0.4).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = flashIsWip ? "#FF5050" : "#00FFFF";
        ctx.shadowBlur = 30 * flashT;
        ctx.stroke();
        ctx.restore();
        flashT *= 0.93;
        if (flashT < 0.01) flashT = 0;
      }

      /* -- WIP message on failed drop -- */
      if (wipMsgT > 0.01) {
        ctx.save();
        ctx.font = '700 11px "Inter"';
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(255,80,80,${(wipMsgT * 0.9).toFixed(3)})`;
        ctx.shadowColor = "#FF5050";
        ctx.shadowBlur = 12 * wipMsgT;
        ctx.fillText("WIP — NOT READY YET", flashX, flashY - 4);
        ctx.restore();
        wipMsgT *= 0.97;
        if (wipMsgT < 0.01) wipMsgT = 0;
      }

      /* ── 10. DOM lines ──────────────────────────────────────── */

      tc!.style.opacity = fillReveal.toFixed(3);

      for (const b of blobs) {
        for (let k = 0; k < MAX_TL; k++) {
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
        for (let k = 0; k < MAX_DL; k++) {
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
      }
    }

    tick();

    return () => {
      cancelAnimationFrame(rafId.current);
      stKill?.();
      ro.disconnect();
      while (tc.firstChild) tc.removeChild(tc.firstChild);
      cvs.removeEventListener("pointerdown", down);
      cvs.removeEventListener("pointermove", move);
      cvs.removeEventListener("pointerup", up);
      cvs.removeEventListener("lostpointercapture", up);
      cvs.removeEventListener("pointerenter", enter);
      cvs.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <section ref={sectionRef} id="projets" className="relative pt-[15vh] pb-8 md:pb-16">
      <div className="px-6 md:px-12 mb-6">
        <h2 className="font-headline font-extrabold text-3xl md:text-4xl tracking-tighter uppercase">
          SELECTED_OUTPUTS : Projects
        </h2>
      </div>

      <div
        ref={wrapRef}
        className="relative w-full h-[75vh] md:h-[600px] overflow-hidden"
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        />
        <div
          ref={textRef}
          className="absolute top-0 left-0 pointer-events-none select-none"
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0"
        style={{
          height: "30vh",
          background: "linear-gradient(to bottom, transparent, #000)",
        }}
      />
    </section>
  );
}
