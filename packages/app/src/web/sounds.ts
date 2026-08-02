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
  if (muted) {
    suspendMusic();
  } else if (musicWanted) {
    resumeMusic();
  }
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
  // Autoplay may have blocked startMusic() during boot: catch up as
  // soon as a sound actually plays (first user gesture).
  if (musicWanted && musicTimer === null) resumeMusic();
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

// ── Background music ────────────────────────────────────────────
// Chiptune loop converted from MIDI (webette-lead.mid, 134 BPM,
// 96 ticks per quarter). Tracks are [startTick, midiNote, durTicks]
// triplets; the sequencer schedules ahead of time and loops forever
// until the app closes or the user mutes.

const MUSIC_BPM = 134;
const TICKS_PER_QUARTER = 96;
const SECONDS_PER_TICK = 60 / MUSIC_BPM / TICKS_PER_QUARTER;
/** Loop length: last note ends at 9408, padded to a round 25 bars. */
const LOOP_TICKS = 9600;

type TrackNote = [start: number, midi: number, duration: number];

interface MusicTrack {
  type: OscillatorType;
  volume: number;
  notes: TrackNote[];
}

// prettier-ignore
const LEAD_NOTES: TrackNote[] = [
  [0, 60, 24], [48, 55, 24], [96, 60, 24], [144, 60, 24], [168, 64, 24], [216, 64, 24], [240, 60, 24], [288, 55, 24],
  [336, 60, 24], [384, 59, 24], [432, 52, 24], [480, 59, 24], [528, 59, 24], [552, 62, 24], [600, 62, 24], [624, 59, 24],
  [672, 52, 24], [720, 59, 24], [768, 57, 24], [816, 53, 24], [864, 57, 24], [912, 57, 24], [936, 60, 24], [984, 60, 24],
  [1008, 57, 24], [1056, 53, 24], [1104, 57, 24], [1152, 59, 24], [1200, 55, 24], [1248, 59, 24], [1296, 59, 24], [1320, 62, 24],
  [1368, 62, 24], [1392, 59, 24], [1440, 55, 24], [1488, 59, 24], [1536, 60, 24], [1584, 55, 24], [1632, 60, 24], [1680, 60, 24],
  [1704, 64, 24], [1752, 64, 24], [1776, 60, 24], [1824, 55, 24], [1872, 60, 24], [1920, 59, 24], [1968, 52, 24], [2016, 59, 24],
  [2064, 59, 24], [2088, 62, 24], [2136, 62, 24], [2160, 59, 24], [2208, 52, 24], [2256, 59, 24], [2304, 57, 24], [2352, 53, 24],
  [2400, 57, 24], [2448, 57, 24], [2472, 60, 24], [2520, 60, 24], [2544, 57, 24], [2592, 53, 24], [2640, 57, 24], [2688, 59, 24],
  [2736, 55, 24], [2784, 59, 24], [2832, 59, 24], [2856, 62, 24], [2904, 62, 24], [2928, 59, 24], [3072, 60, 48], [3144, 60, 24],
  [3168, 60, 24], [3216, 60, 24], [3240, 60, 24], [3288, 60, 24], [3312, 60, 24], [3360, 55, 36], [3408, 64, 48], [3456, 59, 48],
  [3528, 59, 24], [3552, 59, 24], [3600, 59, 24], [3624, 59, 24], [3672, 59, 24], [3696, 59, 24], [3744, 52, 36], [3792, 62, 48],
  [3840, 57, 48], [3912, 57, 24], [3936, 57, 24], [3984, 57, 24], [4008, 57, 24], [4056, 57, 24], [4080, 57, 24], [4128, 53, 36],
  [4176, 60, 48], [4224, 59, 48], [4272, 62, 48], [4320, 55, 48], [4368, 62, 48], [4416, 59, 48], [4512, 55, 48], [4608, 60, 48],
  [4680, 60, 24], [4704, 60, 24], [4752, 60, 24], [4776, 60, 24], [4824, 60, 24], [4848, 60, 24], [4896, 55, 36], [4944, 64, 48],
  [4992, 59, 48], [5064, 59, 24], [5088, 59, 24], [5136, 59, 24], [5160, 59, 24], [5208, 59, 24], [5232, 59, 24], [5280, 52, 36],
  [5328, 62, 48], [5376, 57, 48], [5448, 57, 24], [5472, 57, 24], [5520, 57, 24], [5544, 57, 24], [5592, 57, 24], [5616, 57, 24],
  [5664, 53, 36], [5712, 60, 48], [5760, 59, 48], [5808, 62, 48], [5856, 55, 48], [5904, 62, 48], [5952, 59, 48], [6048, 55, 48],
  [6096, 55, 48], [6144, 60, 48], [6240, 62, 72], [6336, 64, 96], [6432, 67, 96], [6528, 67, 36], [6576, 67, 36], [6624, 67, 36],
  [6672, 60, 36], [6720, 67, 36], [6816, 64, 24], [6840, 62, 24], [6864, 60, 24], [6912, 67, 36], [6960, 67, 36], [7008, 67, 36],
  [7056, 67, 36], [7104, 67, 36], [7200, 60, 36], [7248, 67, 36], [7296, 65, 36], [7344, 65, 36], [7392, 65, 36], [7440, 64, 36],
  [7488, 64, 36], [7536, 60, 36], [7632, 64, 240], [8064, 67, 36], [8112, 67, 36], [8160, 67, 36], [8208, 60, 36], [8256, 67, 36],
  [8352, 64, 24], [8376, 62, 24], [8400, 60, 24], [8448, 67, 36], [8496, 67, 36], [8544, 67, 36], [8592, 67, 36], [8640, 67, 36],
  [8736, 60, 36], [8784, 67, 36], [8832, 67, 36], [8880, 67, 36], [8928, 67, 36], [8976, 64, 36], [9024, 64, 36], [9072, 60, 36],
  [9168, 60, 240],
];

const MUSIC_TRACKS: MusicTrack[] = [
  { type: "square", volume: 0.022, notes: LEAD_NOTES },
];

function midiToFreq(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

// Lookahead scheduler: a light timer wakes up regularly and schedules
// every note falling inside the next window on the audio clock, so
// playback stays sample-accurate without a busy loop.
const SCHEDULE_INTERVAL_MS = 200;
const SCHEDULE_AHEAD_S = 0.6;

let musicWanted = false;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let loopStartTime = 0;
let trackCursors: number[] = [];
let musicGain: GainNode | null = null;

function musicBus(audio: AudioContext): GainNode {
  if (!musicGain) {
    musicGain = audio.createGain();
    musicGain.connect(audio.destination);
  }
  musicGain.gain.value = 1;
  return musicGain;
}

function scheduleMusicWindow(audio: AudioContext): void {
  const horizon = audio.currentTime + SCHEDULE_AHEAD_S;
  const loopDuration = LOOP_TICKS * SECONDS_PER_TICK;
  for (let t = 0; t < MUSIC_TRACKS.length; t++) {
    const track = MUSIC_TRACKS[t]!;
    while (true) {
      const note = track.notes[trackCursors[t]!];
      if (!note) {
        // End of the loop for this track: rewind once every track is done.
        break;
      }
      const start = loopStartTime + note[0] * SECONDS_PER_TICK;
      if (start >= horizon) break;
      const end = start + note[2] * SECONDS_PER_TICK;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = track.type;
      osc.frequency.value = midiToFreq(note[1]);
      gain.gain.setValueAtTime(track.volume, start);
      gain.gain.setValueAtTime(track.volume, Math.max(start, end - 0.02));
      gain.gain.linearRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(musicBus(audio));
      osc.start(start);
      osc.stop(end + 0.01);
      trackCursors[t]! += 1;
    }
  }
  const loopEnd = loopStartTime + loopDuration;
  if (
    loopEnd < horizon &&
    MUSIC_TRACKS.every((track, t) => trackCursors[t]! >= track.notes.length)
  ) {
    loopStartTime = loopEnd;
    trackCursors = MUSIC_TRACKS.map(() => 0);
  }
}

function suspendMusic(): void {
  if (musicTimer !== null) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  // Silence the notes already scheduled in the lookahead window.
  if (musicGain) musicGain.gain.value = 0;
}

function resumeMusic(delaySeconds = 0.1): void {
  if (musicTimer !== null) return;
  const audio = audioContext();
  if (!audio || audio.state !== "running") return;
  // Restart the loop from the top: resuming mid-bar sounds broken.
  loopStartTime = audio.currentTime + delaySeconds;
  trackCursors = MUSIC_TRACKS.map(() => 0);
  scheduleMusicWindow(audio);
  musicTimer = setInterval(() => {
    if (muted) return;
    scheduleMusicWindow(audio);
  }, SCHEDULE_INTERVAL_MS);
}

/** Start the background music loop (after the boot jingle). */
export function startMusic(delaySeconds = 0): void {
  musicWanted = true;
  if (muted) return;
  resumeMusic(delaySeconds);
}
