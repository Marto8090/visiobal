// Reproduces the two Mozzi melodies from the ESP32 firmware in pure JS.
// Each Note contains the lead frequency, note duration in ms,
// and the harmony ratio that the firmware's second oscillator uses.

export type Note = { freq: number; dur: number; harmonyRatio: number };

// song1_melody / song1_durations / song1_harmony from main.cpp
export const MELODY_1: Note[] = [
  { freq: 261.63, dur: 250, harmonyRatio: 2.0 },
  { freq: 293.66, dur: 250, harmonyRatio: 1.5 },
  { freq: 329.63, dur: 500, harmonyRatio: 2.0 },
  { freq: 392.00, dur: 250, harmonyRatio: 1.5 },
  { freq: 440.00, dur: 250, harmonyRatio: 2.0 },
  { freq: 523.25, dur: 500, harmonyRatio: 0.5 },
  { freq: 392.00, dur: 250, harmonyRatio: 1.5 },
  { freq: 329.63, dur: 250, harmonyRatio: 2.0 },
  { freq: 440.00, dur: 375, harmonyRatio: 1.5 },
  { freq: 293.66, dur: 125, harmonyRatio: 2.0 },
  { freq: 392.00, dur: 250, harmonyRatio: 1.5 },
  { freq: 523.25, dur: 500, harmonyRatio: 1.0 },
];

// song2_melody / song2_durations / song2_harmony from main.cpp
export const MELODY_2: Note[] = [
  { freq: 164.81, dur: 125, harmonyRatio: 1.5 },
  { freq: 196.00, dur: 125, harmonyRatio: 1.5 },
  { freq: 220.00, dur: 250, harmonyRatio: 1.5 },
  { freq: 196.00, dur: 125, harmonyRatio: 2.0 },
  { freq: 246.94, dur: 125, harmonyRatio: 1.5 },
  { freq: 220.00, dur: 250, harmonyRatio: 2.0 },
  { freq: 196.00, dur: 125, harmonyRatio: 1.5 },
  { freq: 164.81, dur: 250, harmonyRatio: 1.5 },
  { freq: 185.00, dur: 125, harmonyRatio: 2.0 },
  { freq: 220.00, dur: 125, harmonyRatio: 1.5 },
  { freq: 246.94, dur: 125, harmonyRatio: 1.5 },
  { freq: 233.08, dur: 125, harmonyRatio: 1.5 },
  { freq: 196.00, dur: 375, harmonyRatio: 1.5 },
  { freq: 164.81, dur: 125, harmonyRatio: 2.0 },
  { freq: 146.83, dur: 250, harmonyRatio: 1.5 },
  { freq: 164.81, dur: 125, harmonyRatio: 1.0 },
];

export const MELODIES = [MELODY_1, MELODY_2] as const;

const SAMPLE_RATE = 22050;
const NOTE_GAP_MS = 30;       // matches firmware NOTE_GAP_MS
const LEAD_VOL = 120 / 255;   // matches firmware LEAD_VOL / 255
const HARM_VOL = 50 / 255;    // matches firmware HARM_VOL / 255
const TWO_PI = Math.PI * 2;

// Trig-free triangle wave: avoids Math.asin in the hot loop
function tri(phase: number): number {
  const t = ((phase / TWO_PI) % 1 + 1) % 1; // 0..1
  return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
}

// Trig-free square wave
function sq(phase: number): number {
  return ((phase / TWO_PI) % 1 + 1) % 1 < 0.5 ? 1 : -1;
}

export function melodyDurationMs(melody: Note[]): number {
  return melody.reduce((acc, n) => acc + n.dur, 0);
}

// Generates a 16-bit mono WAV ArrayBuffer for one full melody loop.
// Matches the firmware's ADSR envelope, triangle lead, and square harmony.
export function generateMelodyWAV(melody: Note[]): ArrayBuffer {
  const totalMs = melodyDurationMs(melody);
  const totalSamples = Math.ceil((SAMPLE_RATE * totalMs) / 1000);
  const dataSize = totalSamples * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);

  // WAV header
  const w = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true);
  w(8, 'WAVE'); w(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);              // PCM
  view.setUint16(22, 1, true);              // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  w(36, 'data'); view.setUint32(40, dataSize, true);

  // Firmware ADSR timings (converted to sample counts)
  const atkSmp  = Math.ceil(SAMPLE_RATE * 0.010);   // 10 ms
  const decSmp  = Math.ceil(SAMPLE_RATE * 0.050);   // 50 ms
  const relSmp  = Math.ceil(SAMPLE_RATE * 0.060);   // 60 ms
  const sustain = 180 / 255;

  let offset = 0;

  for (const note of melody) {
    const noteDurMs  = note.dur - NOTE_GAP_MS;
    const noteSmp    = Math.ceil((SAMPLE_RATE * noteDurMs) / 1000);
    const gapSmp     = Math.ceil((SAMPLE_RATE * NOTE_GAP_MS) / 1000);
    const leadInc    = (TWO_PI * note.freq) / SAMPLE_RATE;
    const harmInc    = (TWO_PI * note.freq * note.harmonyRatio) / SAMPLE_RATE;
    let   leadPhase  = 0;
    let   harmPhase  = 0;

    for (let i = 0; i < noteSmp && offset < totalSamples; i++) {
      let env: number;
      if (i < atkSmp) {
        env = i / atkSmp;
      } else if (i < atkSmp + decSmp) {
        env = 1 - (1 - sustain) * (i - atkSmp) / decSmp;
      } else if (i >= noteSmp - relSmp) {
        env = sustain * (noteSmp - i) / relSmp;
      } else {
        env = sustain;
      }
      const lead = tri(leadPhase) * LEAD_VOL * env;
      const harm = sq(harmPhase)  * HARM_VOL * env;
      const mix  = Math.max(-1, Math.min(1, lead + harm));
      view.setInt16(44 + offset * 2, Math.round(mix < 0 ? mix * 32768 : mix * 32767), true);
      offset++;
      leadPhase = (leadPhase + leadInc) % TWO_PI;
      harmPhase = (harmPhase + harmInc) % TWO_PI;
    }

    // Gap silence
    for (let i = 0; i < gapSmp && offset < totalSamples; i++) {
      view.setInt16(44 + offset * 2, 0, true);
      offset++;
    }
  }

  return buf;
}

// Chunked base64 encode to avoid call-stack overflow on large buffers
export function bufferToBase64(buf: ArrayBuffer): string {
  const bytes  = new Uint8Array(buf);
  const chunk  = 8192;
  let   binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
