// Web Audio API subtle tactile pop synthesizer for ZyraTech UI interactions
const SOUND_STORAGE_KEY = 'zyratech_sound_enabled';

let audioCtx: AudioContext | null = null;
let lastPlayedAt = 0;

export type PopKind = 'pop' | 'nav' | 'profile' | 'dashboard' | 'action';

export function isSoundEnabled(): boolean {
  try {
    const saved = localStorage.getItem(SOUND_STORAGE_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore storage errors
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playPopSound(kind: PopKind = 'pop'): void {
  if (!isSoundEnabled()) return;

  const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  // Prevent duplicate double-pop when both an explicit handler and document listener fire on one click
  if (nowMs - lastPlayedAt < 45) return;
  lastPlayedAt = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const profiles: Record<PopKind, { startHz: number; endHz: number; dur: number; peak: number }> = {
      pop: { startHz: 380, endHz: 660, dur: 0.055, peak: 0.11 },
      nav: { startHz: 340, endHz: 590, dur: 0.058, peak: 0.11 },
      dashboard: { startHz: 320, endHz: 620, dur: 0.062, peak: 0.12 },
      profile: { startHz: 410, endHz: 710, dur: 0.06, peak: 0.12 },
      action: { startHz: 450, endHz: 780, dur: 0.052, peak: 0.1 },
    };

    const p = profiles[kind];
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.startHz, t0);
    osc.frequency.exponentialRampToValueAtTime(p.endHz, t0 + p.dur);

    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.exponentialRampToValueAtTime(p.peak, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + p.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t0);
    osc.stop(t0 + p.dur + 0.01);
  } catch {
    // ignore audio restrictions
  }
}
