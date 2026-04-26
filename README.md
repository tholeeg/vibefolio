# Vibefolio

> Vibe coding experimentations by Thomas Le Guern for Indeed.

A live showcase of UI/UX experiments — shaders, real-time physics, kinetic
typography, and a custom command palette — wrapped in a single-page
React app.

```
└── stack
    ├── React 19 · TypeScript 5.7 · Vite 6
    ├── Tailwind CSS v4
    ├── Three.js · @react-three/fiber · @react-three/drei
    ├── GSAP 3 + ScrollTrigger
    ├── Lenis (smooth scroll)
    └── Inter Variable + JetBrains Mono Variable
```

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm run preview  # static preview
npm run lint     # eslint
```

A standalone POC route lives at `?poc` and renders only
`StandaloneProjectCard` for sharing/embed purposes.

## Architecture

```
src/
├── App.tsx                       # MotionProvider, smooth scroll, layout
├── lenisStore.ts
├── lib/
│   ├── useMotion.ts              # external store: prefersReducedMotion,
│   │                             # qualityTier, isPageVisible
│   ├── MotionProvider.tsx        # writes data-quality, data-reduced-motion
│   │                             # on <html>
│   ├── lazyR3F.tsx               # IntersectionObserver-driven mount
│   └── easings.ts                # shared easing curves (CSS / GSAP / Lenis)
├── components/
│   ├── BackgroundShader.tsx      # global silk/aurora full-screen R3F pass
│   ├── background/silkShader.ts  # GLSL source
│   ├── Cursor.tsx                # custom dual-layer pointer
│   ├── CommandPalette.tsx        # ⌘K vanilla command palette
│   ├── NavBar.tsx                # magnetic + scrambled-text links
│   ├── Hero.tsx                  # kinetic typography + glass mode switcher
│   ├── CellShadedSphere.tsx      # 3 hero modes (instanced cubes / Fibonacci
│   │                             # dots / kinetic gyroscope)
│   ├── ProjectGrid.tsx           # blob-physics canvas + project cards
│   ├── Methodology.tsx           # 3-stage pinned point cloud + scroll
│   ├── Lab.tsx                   # 6 real-time experiment cards
│   ├── lab/
│   │   ├── useShaderCanvas.ts    # vanilla Three.js fullscreen-plane runtime
│   │   ├── LabCard.tsx           # shared card shell + FPS probe + lazy mount
│   │   ├── AuroraCard.tsx        # GLSL — domain-warped FBM
│   │   ├── VoronoiCard.tsx       # GLSL — phase-pulsing cells
│   │   ├── MetaballsCard.tsx     # GLSL — orbiting energy spheres
│   │   ├── CurlNoiseCard.tsx     # canvas2d — curl-noise particle field
│   │   ├── TenPrintCard.tsx      # canvas2d — C64 maze with hover wave
│   │   └── AsciiDonutCard.tsx    # canvas2d — Andy Sloane's torus, mono
│   ├── SectionDivider.tsx        # 64px terminal-style separator
│   ├── Footer.tsx                # closing terminal panel + ⌘K CTA
│   └── …
└── index.css                     # design tokens v2 (Tailwind v4 @theme)
```

## Design tokens

All visual constants live in `src/index.css` under `@theme {}` so Tailwind
v4 picks them up automatically (e.g. `text-cyan-glow`,
`bg-surface-container`).

```
brand spectrum   cyan-deep · cyan-pure · cyan-glow · cyan-soft
                 violet-edge · violet-soft · magenta-hot
neutrals         bg · bg-elevated · surface-1..4 · ink · ink-muted · ink-faint
typography       font-headline (Inter) · font-body (Inter) · font-label (JetBrains)
fluid sizes      --text-display-xl .. -s   (clamp-based)
motion           --ease-glide / spring / snap / out-expo / in-out-quart
z-index          --z-bg-shader · content · overlay · nav · cursor · modal · toast
```

A `@media (prefers-reduced-motion: reduce)` block disables CSS
transitions globally; JS animations gate themselves through `useMotion()`.

## Motion contract

Every animated component **must** route through `useMotion()`:

```ts
const { prefersReducedMotion, qualityTier, isPageVisible } = useMotion();
```

- `prefersReducedMotion` — OS-level setting; freeze breathing loops, scrubs.
- `qualityTier` — `"low" | "medium" | "high"`, inferred once from GPU
  vendor, hardwareConcurrency, deviceMemory, connection.saveData.
  Persisted in `sessionStorage` and overridable via the command palette
  (`Force quality: LOW/MEDIUM/HIGH`).
- `isPageVisible` — pause heavy loops when the tab is hidden.

Heavy R3F scenes are wrapped in `<LazyMount>` so they only spin up their
WebGL context once they enter the viewport.

## Keyboard

```
1 / 2 / 3        switch the Hero sphere mode
⌘ K   /  Ctrl K  open the command palette
↑ ↓              navigate inside the palette
↵                run the selected command
Esc              close the palette
```

## Project conventions

The `.cursor/rules/` folder ships three rule files used by the AI
assistant in the IDE:

- `vibefolio-foundation.mdc` — stack, folder layout, design-token reference
- `vibefolio-motion.mdc` — `useMotion()` enforcement, GSAP/R3F patterns
- `vibefolio-shaders.mdc` — shader authoring, uniform naming, SDF helpers

## Bundle (gzipped)

```
index.css        ~7 KB
index.js (app)   ~56 KB
gsap             ~28 KB
lenis            ~5 KB
r3f              ~111 KB
three            ~187 KB
                ─────────
total            ~395 KB
```
