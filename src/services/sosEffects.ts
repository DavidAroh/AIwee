/**
 * sosEffects — attention-drawing hardware effects for an active SOS.
 *
 * Siren: Web Audio two-tone sweep (no audio file needed). Must be started from
 * a user gesture (the SOS button press) to satisfy autoplay policy; after a
 * page reload it can only resume via another tap.
 *
 * Vibration: navigator.vibrate pattern loop (Android Chrome; iOS ignores it).
 *
 * Flashlight: not possible in a web app — the SOS overlay substitutes a
 * full-screen strobe (see .sos-strobe in index.css).
 */

let ctx: AudioContext | null = null;
let osc: OscillatorNode | null = null;
let lfo: OscillatorNode | null = null;
let vibrateTimer: ReturnType<typeof setInterval> | null = null;

export function startSiren(): boolean {
  if (ctx) return true;
  try {
    ctx = new AudioContext();
    osc = ctx.createOscillator();
    lfo = ctx.createOscillator();

    const gain = ctx.createGain();
    gain.gain.value = 0.85;

    // Hi–lo emergency siren: 950 Hz carrier swept ±320 Hz at 1.4 Hz
    osc.type = "triangle";
    osc.frequency.value = 950;
    lfo.type = "square";
    lfo.frequency.value = 1.4;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 320;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    lfo.start();
    return true;
  } catch {
    stopSiren();
    return false;
  }
}

export function stopSiren(): void {
  try {
    osc?.stop();
    lfo?.stop();
    ctx?.close();
  } catch {
    /* already stopped */
  }
  ctx = null;
  osc = null;
  lfo = null;
}

export function isSirenOn(): boolean {
  return ctx !== null;
}

export function startVibration(): void {
  if (!("vibrate" in navigator)) return;
  const pattern = [600, 200, 600, 200, 1200];
  navigator.vibrate(pattern);
  if (vibrateTimer) clearInterval(vibrateTimer);
  vibrateTimer = setInterval(() => navigator.vibrate(pattern), 3000);
}

export function stopVibration(): void {
  if (vibrateTimer) {
    clearInterval(vibrateTimer);
    vibrateTimer = null;
  }
  if ("vibrate" in navigator) navigator.vibrate(0);
}
