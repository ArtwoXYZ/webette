/**
 * Programmatic 8bit sounds (Web Audio, no assets).
 *
 * Webviews may block audio before the first user gesture: every
 * play is best-effort and the UI never depends on it.
 */

let ctx: AudioContext | null = null;
let muted = false;

function audioContext(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(value: boolean): void {
  muted = value;
}

/**
 * Warm the AudioContext up (resume is async): call it early so the
 * context is already running when the first sound plays.
 */
export async function ensureAudioReady(): Promise<boolean> {
  if (typeof AudioContext === "undefined") return false;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === "running";
}

export function isMuted(): boolean {
  return muted;
}

interface Note {
  freq: number;
  at: number;
  duration: number;
  volume?: number;
  type?: OscillatorType;
}

function playNotes(notes: Note[]): void {
  if (muted) return;
  const audio = audioContext();
  if (!audio) return;
  // Scheduling on a suspended context would queue the notes and fire
  // them all at once on the first user gesture; skip instead.
  if (audio.state !== "running") return;
  const now = audio.currentTime;
  for (const note of notes) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = note.type ?? "square";
    osc.frequency.value = note.freq;
    const volume = note.volume ?? 0.06;
    const start = now + note.at;
    const end = start + note.duration;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(start);
    osc.stop(end);
  }
}

/** Power-on jingle: quick ascending arpeggio. */
export function playBoot(): void {
  playNotes([
    { freq: 523.25, at: 0, duration: 0.09 }, // C5
    { freq: 659.25, at: 0.09, duration: 0.09 }, // E5
    { freq: 783.99, at: 0.18, duration: 0.09 }, // G5
    { freq: 1046.5, at: 0.27, duration: 0.22, volume: 0.07 }, // C6
  ]);
}

/** Invalid action: short descending buzz. */
export function playError(): void {
  playNotes([
    { freq: 220, at: 0, duration: 0.1, volume: 0.07 },
    { freq: 164.81, at: 0.1, duration: 0.16, volume: 0.07 },
  ]);
}

/** Confirmation blip (folder mounted, server ready…). */
export function playSuccess(): void {
  playNotes([
    { freq: 783.99, at: 0, duration: 0.08 }, // G5
    { freq: 1046.5, at: 0.08, duration: 0.18, volume: 0.07 }, // C6
  ]);
}

/** Tiny click for regular interactions. */
export function playClick(): void {
  playNotes([{ freq: 880, at: 0, duration: 0.05, volume: 0.04 }]);
}
