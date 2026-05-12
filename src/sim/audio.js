let audioCtx = null;
let currentOscillator = null;
let volumePercent = 50;

const NOTE_FREQUENCIES = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50, PAUSE: 0,
};

// Denominator → ms at 120 BPM (quarter note = 500ms)
const BEAT_DURATION_MS = { '1': 2000, '2': 1000, '4': 500, '8': 250 };

function getCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('[audio] AudioContext unavailable:', e.message);
    }
  }
  return audioCtx;
}

function stopCurrent() {
  if (!currentOscillator) return;
  try { currentOscillator.stop(); } catch (_) {}
  currentOscillator.disconnect();
  currentOscillator = null;
}

export function play_tone(freq, ms) {
  const ctx = getCtx();
  if (!ctx) return;
  stopCurrent();
  if (Number(freq) <= 0 || Number(ms) <= 0) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = (volumePercent / 100) * 0.2;
  osc.frequency.value = Number(freq);
  osc.type = 'square';
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + Number(ms) / 1000);
  currentOscillator = osc;
  osc.onended = () => { if (currentOscillator === osc) currentOscillator = null; };
}

export function play_note(note, durationKey) {
  const freq = NOTE_FREQUENCIES[String(note)] ?? 0;
  const ms = BEAT_DURATION_MS[String(durationKey)] ?? 500;
  play_tone(freq, ms);
}

export function audio_stop() {
  stopCurrent();
}

export function set_volume(v) {
  volumePercent = Math.max(0, Math.min(100, Number(v) || 0));
}

export function get_volume() {
  return volumePercent;
}
