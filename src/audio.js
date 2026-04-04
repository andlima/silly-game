// Procedural sound effects using Web Audio API — no audio files needed.

let ctx = null;
let masterGain = null;
let volume = 0.5;

/**
 * Create (or resume) the AudioContext. Must be called from a user gesture.
 */
export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  ctx.resume();
  masterGain = ctx.createGain();
  masterGain.gain.value = volume;
  masterGain.connect(ctx.destination);
  return ctx;
}

/**
 * Set master volume (0–1).
 */
export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = volume;
}

export function getVolume() {
  return volume;
}

// --- Helpers ---

function now() {
  return ctx ? ctx.currentTime : 0;
}

function makeNoise(duration) {
  const len = ctx.sampleRate * duration;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

// --- Sound effects ---

/** Soft footstep tick — short burst of filtered white noise. */
export function playMove() {
  if (!ctx) return;
  const t = now();
  const noise = makeNoise(0.06);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 1.0;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.1, t + 0.01);
  gain.gain.linearRampToValueAtTime(0, t + 0.06);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start(t);
  noise.stop(t + 0.06);
}

/** Short percussive hit — sawtooth with pitch bend down. */
export function playAttack() {
  if (!ctx) return;
  const t = now();
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.linearRampToValueAtTime(80, t + 0.12);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.linearRampToValueAtTime(0, t + 0.12);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.12);
}

/** Lower thud when the player takes damage. */
export function playHurt() {
  if (!ctx) return;
  const t = now();
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 100;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.linearRampToValueAtTime(0, t + 0.2);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.2);
}

/** Bright rising tone for item collection — two quick sine tones (C5 → E5). */
export function playPickup() {
  if (!ctx) return;
  const t = now();
  // C5 ≈ 523 Hz, E5 ≈ 659 Hz
  [523, 659].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    const start = t + i * 0.08;
    gain.gain.setValueAtTime(0.15, start);
    gain.gain.linearRampToValueAtTime(0, start + 0.08);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(start);
    osc.stop(start + 0.08);
  });
}

/** Descending sweep for stairs — sine from 400 Hz to 100 Hz. */
export function playDescend() {
  if (!ctx) return;
  const t = now();
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.linearRampToValueAtTime(100, t + 0.3);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.linearRampToValueAtTime(0, t + 0.3);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.3);
}

/** Ominous low drone when the player dies — sine + noise layer. */
export function playDeath() {
  if (!ctx) return;
  const t = now();
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 60;
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.2, t);
  oscGain.gain.linearRampToValueAtTime(0, t + 0.5);
  osc.connect(oscGain);
  oscGain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.5);

  const noise = makeNoise(0.5);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.08, t);
  noiseGain.gain.linearRampToValueAtTime(0, t + 0.5);
  noise.connect(noiseGain);
  noiseGain.connect(masterGain);
  noise.start(t);
  noise.stop(t + 0.5);
}

/** Ascending arpeggio when the player wins — C5-E5-G5-C6. */
export function playVictory() {
  if (!ctx) return;
  const t = now();
  // C5=523, E5=659, G5=784, C6=1047
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    const start = t + i * 0.12;
    gain.gain.setValueAtTime(0.15, start);
    gain.gain.linearRampToValueAtTime(0, start + 0.12);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(start);
    osc.stop(start + 0.12);
  });
}
