// Dice audio via the Web Audio API.
//
// Every collision is rendered on the fly using *modal synthesis*: an impact
// excites a handful of resonant modes of the object, each of which rings as an
// exponentially-decaying sine wave. Summed together with a short filtered noise
// burst (the contact transient) this gives a convincing "clack" whose loudness
// tracks how hard the dice actually hit.
//
// Three synthesized voices: a low, woody "thock" for hitting the surface
// (floor / wall), a brighter, shorter "click" for dice knocking into each other,
// and a hollow knock for the cup wall. Alongside them sits the one recorded
// sample in the game — the truffle fanfare — which shares this module's audio
// context and the `sound` toggle.

import { sound } from "../state";

// The truffle fanfare, served from public/. Kept as a plain URL (not a bundled
// import) so it stays a separate file the service worker can precache.
const TRUFFLE_URL = `${import.meta.env.BASE_URL}truffle.mp3`;
// The fanfare is the game's one celebration cue, so it is meant to carry over
// the dice still clattering underneath. Just short of 1 to leave the sample its
// own headroom.
const TRUFFLE_GAIN = 0.95;

let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
// The one recorded sample in the game: the truffle fanfare. Decoded once on
// first use and reused; null until then, `false` once a load has failed so a
// missing/undecodable file is not retried on every roll.
let truffleBuffer: AudioBuffer | false | null = null;
let trufflePending: Promise<void> | null = null;

function audioCtx() {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new Ctor();
  }
  // The context starts suspended until a user gesture; resuming is a no-op once
  // it's already running.
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// One reusable buffer of white noise for the contact transient — regenerating
// it per hit would be wasteful.
function getNoise(ctx: AudioContext) {
  if (!noiseBuffer) {
    const length = Math.floor(ctx.sampleRate * 0.1);
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

type Mode = { freq: number; decay: number; gain: number };

type Voice = {
  // Resonant modes — the body's ringing frequencies.
  modes: Mode[];
  // Spread on each mode's frequency, applied per hit, so repeated impacts don't
  // sound identical. Fraction of the frequency (0.05 = ±5%).
  jitter: number;
  // Contact transient: a filtered burst of noise. Bandpass gives a bright,
  // pitched click; lowpass gives a dull, muffled thud (felt, cloth).
  noiseType: BiquadFilterType;
  noiseFreq: number;
  noiseQ: number;
  noiseDecay: number;
  noiseGain: number;
  // Impact-velocity window used to map collision speed to loudness.
  minVel: number;
  maxVel: number;
  // Don't fire more often than this (seconds) — guards against the physics
  // engine emitting bursts of contacts for a single visual impact.
  minInterval: number;
};

const surface: Voice = {
  // A die landing on felt is a soft, dull thud: heavy damping kills any ring,
  // and the cloth absorbs the highs. Two low modes that decay almost instantly
  // give just enough body, while a lowpassed noise bump carries the muffled
  // impact — no bright click, no hollow box resonance.
  modes: [
    { freq: 150, decay: 0.045, gain: 0.4 },
    { freq: 260, decay: 0.03, gain: 0.22 },
  ],
  jitter: 0.05,
  noiseType: "lowpass",
  noiseFreq: 350,
  noiseQ: 0.4,
  noiseDecay: 0.03,
  noiseGain: 0.7,
  minVel: 1.2,
  maxVel: 26,
  minInterval: 0.03,
};

const click: Voice = {
  // Acrylic dice clacking together is almost all transient: a bright, broadband
  // tick with barely any pitched ring. Keep just two inharmonic modes that
  // decay in a few milliseconds so they colour the click without turning it
  // into a tuned "tock", and let the noise burst carry the sound.
  modes: [
    { freq: 3700, decay: 0.006, gain: 0.18 },
    { freq: 5300, decay: 0.004, gain: 0.12 },
  ],
  jitter: 0.12,
  noiseType: "bandpass",
  noiseFreq: 4200,
  noiseQ: 0.5,
  noiseDecay: 0.006,
  noiseGain: 0.9,
  minVel: 1.5,
  maxVel: 22,
  minInterval: 0.02,
};

const cup: Voice = {
  // A die knocking the cup wall: a hard, slightly hollow leather/plastic knock.
  // More body than the dice-on-dice click, but shorter and woodier than the
  // felt floor — it sits between the two so the wall reads as a third surface.
  modes: [
    { freq: 700, decay: 0.02, gain: 0.35 },
    { freq: 1150, decay: 0.013, gain: 0.22 },
    { freq: 2000, decay: 0.008, gain: 0.14 },
  ],
  jitter: 0.1,
  noiseType: "bandpass",
  noiseFreq: 1800,
  noiseQ: 0.9,
  noiseDecay: 0.014,
  noiseGain: 0.6,
  minVel: 1.0,
  maxVel: 24,
  minInterval: 0.015,
};

const lastPlayed = new WeakMap<Voice, number>();

function play(voice: Voice, velocity: number) {
  if (!sound.value) return;
  if (velocity < voice.minVel) return;

  const ctx = audioCtx();
  const now = ctx.currentTime;

  const last = lastPlayed.get(voice) ?? -Infinity;
  if (now - last < voice.minInterval) return;
  lastPlayed.set(voice, now);

  // Map impact speed onto loudness; harder hits are louder (and, via the noise
  // transient, a touch sharper).
  const t = Math.min(
    1,
    (velocity - voice.minVel) / (voice.maxVel - voice.minVel),
  );
  // Perceived loudness rises slower than amplitude — square keeps soft taps soft.
  const amp = 0.18 + 0.82 * t * t;

  const master = ctx.createGain();
  master.gain.value = amp;
  master.connect(ctx.destination);

  // Contact transient: a short burst of bandpass-filtered noise.
  const noise = ctx.createBufferSource();
  noise.buffer = getNoise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = voice.noiseType;
  bp.frequency.value = voice.noiseFreq;
  bp.Q.value = voice.noiseQ;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(voice.noiseGain, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + voice.noiseDecay);
  noise.connect(bp).connect(noiseGain).connect(master);
  noise.start(now);
  noise.stop(now + voice.noiseDecay + 0.01);

  // Resonant modes: exponentially-decaying sines.
  for (const m of voice.modes) {
    const osc = ctx.createOscillator();
    osc.frequency.value = m.freq * (1 + (Math.random() * 2 - 1) * voice.jitter);
    const g = ctx.createGain();
    g.gain.setValueAtTime(m.gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + m.decay);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + m.decay + 0.01);
  }
}

// Fetch + decode the truffle sample. Runs at most once per page load; callers
// fire and forget, since a fanfare that misses its beat is not worth blocking on.
function loadTruffle() {
  if (truffleBuffer !== null || trufflePending) return trufflePending ?? undefined;
  trufflePending = fetch(TRUFFLE_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.arrayBuffer();
    })
    .then((data) => audioCtx().decodeAudioData(data))
    .then((buf) => {
      truffleBuffer = buf;
    })
    .catch(() => {
      // No fanfare is better than a broken game: remember the failure and stay
      // silent from here on.
      truffleBuffer = false;
    })
    .finally(() => {
      trufflePending = null;
    });
  return trufflePending;
}

export const diceSound = {
  // Prime the audio context from within a user gesture so later impacts aren't
  // blocked by autoplay policy. Warm the truffle sample at the same time so the
  // fanfare is ready to fire the instant a roll lands five of a kind.
  unlock: () => {
    audioCtx();
    void loadTruffle();
  },
  surface: (velocity: number) => play(surface, velocity),
  collision: (velocity: number) => play(click, velocity),
  cup: (velocity: number) => play(cup, velocity),
  // The truffle fanfare — a recorded sample rather than a synthesized impact,
  // played at full level over whatever the dice are still doing.
  truffle: () => {
    if (!sound.value) return;
    const start = (buf: AudioBuffer) => {
      const ctx = audioCtx();
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = TRUFFLE_GAIN;
      src.connect(g).connect(ctx.destination);
      src.start();
    };
    if (truffleBuffer) return start(truffleBuffer);
    if (truffleBuffer === false) return; // load failed earlier — stay silent
    // Not decoded yet (the very first truffle of the session): play it as soon
    // as it arrives. A few hundred ms late beats not at all.
    void loadTruffle()?.then(() => {
      if (truffleBuffer && sound.value) start(truffleBuffer);
    });
  },
};
