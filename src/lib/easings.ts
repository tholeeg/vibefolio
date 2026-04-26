/**
 * Shared easing curves — single source of truth across CSS, GSAP, Lenis.
 *
 * The CSS counterparts live in `src/index.css` under `@theme`
 * (`--ease-glide`, `--ease-spring`, …). Keep both in sync.
 */

export const EASE = {
  /** Soft, expressive — go-to for hero reveals and section fades. */
  glide: (t: number) => 1 - Math.pow(1 - t, 4),
  /** Slight overshoot — for click feedback, toggles. */
  spring: (t: number) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  /** Tight, mechanical — for menus, instant-feel UI. */
  snap: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  /** Long-tail decay — premium scroll-jacking ease. */
  outExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  /** Lenis default (matches the original `1.001 - 2^(-10t)`). */
  lenisDefault: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
} as const;

export type EaseName = keyof typeof EASE;

/** GSAP custom-ease string for the few cases we want a direct curve. */
export const GSAP_EASES = {
  glide: "power4.out",
  spring: "back.out(1.7)",
  snap: "power2.inOut",
  outExpo: "expo.out",
} as const;
