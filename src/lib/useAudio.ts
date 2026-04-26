/**
 * useAudio — Web Audio singleton + React subscription hook.
 *
 *  Two responsibilities:
 *    1. Generate a soft ambient drone (opt-in, requires user gesture).
 *    2. Expose short procedural SFX (blip / click) that any component
 *       can fire without owning an AudioContext.
 *
 *  Plus a tiny analyser tap so the silk shader can pulse on volume.
 *
 *  Browsers refuse to start an AudioContext without a user gesture,
 *  so `enable()` MUST be called inside a click / keypress handler.
 *  We persist the enabled state in sessionStorage so a refresh
 *  retains the choice (within the tab session, not across reloads
 *  by storage rules).
 *
 *  All API is no-op safe on the server / in tests.
 */

import { useSyncExternalStore } from "react";

/* ── Module-level singleton state ──────────────────────────────── */

interface AudioState {
  isEnabled: boolean;
  isReady: boolean;
}

let state: AudioState = { isEnabled: false, isReady: false };
const subscribers = new Set<() => void>();
function publish() {
  state = { ...state };
  subscribers.forEach((s) => s());
}

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let analyserData: Uint8Array<ArrayBuffer> | null = null;

let droneNodes: { osc1: OscillatorNode; osc2: OscillatorNode; lfo: OscillatorNode }
  | null = null;

/* ── Helpers ───────────────────────────────────────────────────── */

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;

  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;

  ctx = new Ctor();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.0;
  analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.85;
  analyserData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

  masterGain.connect(analyser);
  analyser.connect(ctx.destination);

  return ctx;
}

function startDrone() {
  if (!ctx || !masterGain) return;
  if (droneNodes) return;

  /* Two sawtooth oscillators a perfect fifth apart, low-pass
     filtered with a slow LFO on the cutoff for a breathing pad. */
  const osc1 = ctx.createOscillator();
  osc1.type = "sawtooth";
  osc1.frequency.value = 55;

  const osc2 = ctx.createOscillator();
  osc2.type = "sawtooth";
  osc2.frequency.value = 82.5;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 220;
  filter.Q.value = 6;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 180;

  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.18;

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(droneGain);
  droneGain.connect(masterGain);

  osc1.start();
  osc2.start();
  lfo.start();
  droneNodes = { osc1, osc2, lfo };
}

function stopDrone() {
  if (!droneNodes) return;
  try {
    droneNodes.osc1.stop();
    droneNodes.osc2.stop();
    droneNodes.lfo.stop();
  } catch {
    /* already stopped */
  }
  droneNodes = null;
}

/* ── Public API ────────────────────────────────────────────────── */

/**
 * Enable the audio context. MUST be called from a user gesture.
 * Idempotent. Persists the choice in sessionStorage.
 */
export async function enableAudio(): Promise<void> {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  if (c.state === "suspended") await c.resume();

  state.isEnabled = true;
  state.isReady = true;
  try {
    sessionStorage.setItem("vibefolio:audio", "on");
  } catch { /* storage blocked */ }

  startDrone();

  /* Soft fade-in. */
  const now = c.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(0.55, now + 1.5);

  publish();
}

export function disableAudio(): void {
  if (!ctx || !masterGain) return;

  state.isEnabled = false;
  try {
    sessionStorage.setItem("vibefolio:audio", "off");
  } catch { /* ignore */ }

  /* Soft fade-out, then stop drone. */
  const now = ctx.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(0, now + 0.4);
  setTimeout(stopDrone, 500);

  publish();
}

export function toggleAudio(): void {
  if (state.isEnabled) disableAudio();
  else void enableAudio();
}

/**
 * Fire a short procedural SFX. No-op when the audio context is
 * not enabled — we don't want to "wake" the speaker without
 * user consent.
 */
export type Sfx = "blip" | "click" | "whoosh";

export function playSfx(name: Sfx): void {
  if (!state.isEnabled || !ctx || !masterGain) return;
  const c = ctx;
  const now = c.currentTime;

  const out = c.createGain();
  out.gain.value = 0;
  out.connect(masterGain);

  switch (name) {
    case "blip": {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(880, now);
      o.frequency.exponentialRampToValueAtTime(1320, now + 0.06);
      o.connect(out);
      out.gain.linearRampToValueAtTime(0.18, now + 0.005);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      o.start(now);
      o.stop(now + 0.22);
      break;
    }
    case "click": {
      const o = c.createOscillator();
      o.type = "square";
      o.frequency.value = 220;
      const f = c.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = 200;
      o.connect(f);
      f.connect(out);
      out.gain.linearRampToValueAtTime(0.10, now + 0.002);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      o.start(now);
      o.stop(now + 0.08);
      break;
    }
    case "whoosh": {
      /* Filtered noise burst. */
      const buffer = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const src = c.createBufferSource();
      src.buffer = buffer;
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.setValueAtTime(800, now);
      f.frequency.exponentialRampToValueAtTime(2400, now + 0.5);
      f.Q.value = 2;
      src.connect(f);
      f.connect(out);
      out.gain.linearRampToValueAtTime(0.10, now + 0.02);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      src.start(now);
      break;
    }
  }
}

/**
 * Read the analyser's current RMS in [0..1]. Returns 0 if audio
 * is disabled — callers should treat 0 as "no signal" cleanly.
 */
export function getAudioLevel(): number {
  if (!state.isEnabled || !analyser || !analyserData) return 0;
  analyser.getByteFrequencyData(analyserData);
  let sum = 0;
  for (let i = 0; i < analyserData.length; i++) sum += analyserData[i];
  return Math.min(1, sum / (analyserData.length * 255));
}

/* ── React hook ───────────────────────────────────────────────── */

function subscribe(cb: () => void) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}
function getSnapshot(): AudioState {
  return state;
}
function getServerSnapshot(): AudioState {
  return state;
}

export function useAudio() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* On module load, restore the user's choice from session storage.
   We do NOT auto-resume — that requires a gesture. We just remember
   that they opted in; the next click on the toggle does it. */
if (typeof window !== "undefined") {
  try {
    const persisted = sessionStorage.getItem("vibefolio:audio");
    if (persisted === "on") {
      state.isEnabled = false; /* still needs gesture */
    }
  } catch { /* ignore */ }
}
