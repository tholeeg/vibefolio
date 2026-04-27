# Vibefolio

> Vibe coding experimentations by Thomas Le Guern for Indeed.

A live showcase of UI/UX experiments — shaders, real-time physics, kinetic
typography, and a custom command palette — wrapped in a single-page
React app.

```
└── stack
    ├── React 19 · TypeScript 5.7 · Vite 6
    ├── Tailwind CSS v4
    ├── Three.js · @react-three/fiber
    ├── GSAP 3 + ScrollTrigger
    ├── Lenis (smooth scroll)
    ├── Web Audio API (procedural drone + SFX, opt-in)
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
│   ├── useWebGPU.ts              # one-shot navigator.gpu probe
│   ├── useAudio.ts               # Web Audio singleton: drone + SFX +
│   │                             # analyser tap (getAudioLevel)
│   ├── MotionProvider.tsx        # writes data-quality, data-reduced-motion
│   │                             # on <html>
│   ├── lazyR3F.tsx               # IntersectionObserver-driven mount
│   └── easings.ts                # shared easing curves (CSS / GSAP / Lenis)
├── components/
│   ├── BackgroundShader.tsx      # global silk/aurora full-screen R3F pass
│   ├── background/silkShader.ts  # GLSL source (audio-reactive)
│   ├── PostFXOverlay.tsx         # global vignette + scanlines (CSS only)
│   ├── GlassLens.tsx             # refractive lens following the pointer
│   ├── Cursor.tsx                # custom dual-layer pointer
│   ├── CommandPalette.tsx        # ⌘K vanilla command palette
│   ├── NavBar.tsx                # magnetic + scrambled-text links
│   ├── Hero.tsx                  # kinetic typography + glass mode switcher
│   ├── CellShadedSphere.tsx      # 3 hero modes (instanced cubes / Fibonacci
│   │                             # dots / kinetic gyroscope)
│   ├── ProjectGrid.tsx           # blob-physics canvas + project cards
│   ├── Methodology.tsx           # 3-stage pinned point cloud + scroll
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

## Command palette actions

```
NAVIGATE  Hero · Projects · Methodology · Contact
SYSTEM    Force quality LOW / MEDIUM / HIGH
          Enable / disable ambient soundscape
DEMOS     Hero · Solid / Spiral / Kinetic
EXTERNAL  Mailto · GitHub
```

## Layered effects

```
z = 0     BackgroundShader  (silk pass)
z = 10    Content           (sections + dividers)
z = 50    PostFXOverlay     (vignette · scanlines)
z = 50    GlassLens         (pointer refraction, opt-in via [data-lens])
z = 100   NavBar
z = 9000  Cursor            (dual layer, mix-blend-mode: difference)
z = 9500  CommandPalette
```

## Audio (opt-in)

Procedural Web Audio, no samples shipped. Toggle via the command
palette ("Enable ambient soundscape"). Two sawtooth oscillators a
fifth apart, lowpass-filtered, slow LFO on the cutoff for a
breathing pad. Short SFX (`blip`, `click`) on key interactions.

When enabled, the silk shader pulses with the analyser RMS — the
new `u_audio` uniform amplifies the spark veil and adds a +25 %
intensity peak on transients.

## WebGPU

`useWebGPU()` performs a one-shot `navigator.gpu.requestAdapter()`
probe at app start. The Footer's SYSTEM panel reflects the result
(`WEBGPU` in magenta when an adapter is granted, dim `WEBGL2` as
the universal fallback). The actual rendering still uses WebGL 2;
the probe is an early scaffold for an upcoming TSL migration of
Methodology.

## Project conventions

The `.cursor/rules/` folder ships three rule files used by the AI
assistant in the IDE:

- `vibefolio-foundation.mdc` — stack, folder layout, design-token reference
- `vibefolio-motion.mdc` — `useMotion()` enforcement, GSAP/R3F patterns
- `vibefolio-shaders.mdc` — shader authoring, uniform naming, SDF helpers

## Bundle (gzipped)

```
index.css        ~7 KB
index.js (app)   ~110 KB
gsap             ~28 KB
lenis            ~5 KB
r3f              ~54 KB
three            ~188 KB
                ─────────
total            ~392 KB
```

## Deployment (Docker)

The app is shipped as a tiny static-Nginx container (~30 MB).

### CI → GHCR

`.github/workflows/docker-publish.yml` builds a `linux/amd64` image
on every push to `main` and on `v*` tags, then publishes it to
GitHub Container Registry:

```
ghcr.io/tholeeg/vibefolio:latest
ghcr.io/tholeeg/vibefolio:sha-<short>   # for rollbacks
```

No secrets needed — `GITHUB_TOKEN` is enough. After the first push,
make the package public on
`https://github.com/tholeeg/vibefolio/pkgs/container/vibefolio`
(Package settings → Change visibility → Public) so the server can
pull without credentials.

### Server (Docker Desktop on Windows 11, behind Cloudflare)

Copy `docker-compose.yml` to `C:\Docker\vibefolio\docker-compose.yml`,
then in PowerShell:

```powershell
cd C:\Docker\vibefolio
docker compose pull
docker compose up -d
docker compose logs -f
```

The compose file attaches `vibefolio` to the existing
`chart-generator_chart-net` Docker network so the dockerised
`chart-cloudflared` container reaches it by name. No port is
exposed on the host.

In the Cloudflare Zero Trust dashboard
(`https://one.dash.cloudflare.com`):

1. **Tunnels** → pick the existing tunnel that already serves
   `chart.thomasleguern.com`.
2. **Public Hostnames** → **Add a public hostname**.
3. Subdomain `vibefolio` · Domain `thomasleguern.com` · Service
   `http://vibefolio:80`.

DNS records are created automatically by Cloudflare Tunnel. No port
forwarding on the router. No reverse proxy on the host.

### Auto-updates (Watchtower)

The host already runs a Watchtower container. The
`com.centurylinklabs.watchtower.enable=true` label on the compose
service opts vibefolio in (label-only mode) and is harmless in
all-mode. After each push to `main`, GHCR rebuilds `:latest`,
Watchtower polls, pulls, and restarts the container automatically.

To force a refresh manually:

```powershell
docker exec watchtower /watchtower --run-once vibefolio
```

### Rollback

```powershell
# Pin a specific build (tags are listed on GHCR).
docker pull ghcr.io/tholeeg/vibefolio:sha-abc1234
docker tag  ghcr.io/tholeeg/vibefolio:sha-abc1234 ghcr.io/tholeeg/vibefolio:latest
docker compose up -d --force-recreate vibefolio
```
