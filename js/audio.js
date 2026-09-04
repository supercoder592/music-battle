/* ── AudioEngine ──────────────────────────────────────────────────────
   Procedural, DMCA-free score + instrument SFX (Web Audio API).
   All combat sounds are quantized to A natural minor so heavy fights
   stay musical instead of noisy (the GDD's "dynamic audio matrix").
   Ducking: bass drop / heavy hits sidechain the music bus. */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;   // duckable
    this.sfxBus = null;
    this.bpm = 112;
    this.beatDur = 60 / this.bpm;
    this.startTime = 0;
    this.nextBeat = 0;
    this.beatCount = 0;
    this.enabled = false;
    // A minor pentatonic-ish pool across octaves (Hz)
    this.scale = [220.0, 246.94, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
    // Chord progression: Am, F, C, G (roots)
    this.chords = [
      [220.0, 261.63, 329.63],
      [174.61, 220.0, 261.63],
      [261.63, 329.63, 392.0],
      [196.0, 246.94, 293.66],
    ];
    this.chordIdx = 0;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.9;
    this.musicBus.connect(this.master);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 1.0;
    this.sfxBus.connect(this.master);

    this.enabled = true;
    this.startTime = this.ctx.currentTime + 0.1;
    this.nextBeat = this.startTime;
    this._schedulerTimer = setInterval(() => this._schedule(), 40);
  }

  /* lookahead scheduler for the underscore */
  _schedule() {
    if (!this.enabled) return;
    const ahead = this.ctx.currentTime + 0.25;
    while (this.nextBeat < ahead) {
      this._playBeat(this.nextBeat, this.beatCount);
      this.nextBeat += this.beatDur;
      this.beatCount++;
    }
  }

  _playBeat(t, n) {
    const bar = Math.floor(n / 4);
    const step = n % 4;
    if (step === 0) {
      this.chordIdx = bar % this.chords.length;
      this._pad(this.chords[this.chordIdx], t, this.beatDur * 4);
    }
    // low pulse on 1 & 3
    if (step === 0 || step === 2) this._bassPulse(this.chords[this.chordIdx][0] / 2, t);
    // tick hats
    this._hat(t, step === 0 ? 0.05 : 0.028);
    if (n % 2 === 1) this._hat(t + this.beatDur * 0.5, 0.02);
    // sparse arp melody every other bar
    if (bar % 2 === 1 && (step === 1 || step === 3)) {
      const note = this.chords[this.chordIdx][(bar + step) % 3] * 2;
      this._pluck(note, t, 0.05);
    }
  }

  _pad(freqs, t, dur) {
    for (const f of freqs) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const flt = this.ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = 700;
      flt.Q.value = 0.7;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(flt); flt.connect(g); g.connect(this.musicBus);
      o.start(t); o.stop(t + dur + 0.05);
    }
  }

  _bassPulse(f, t) {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t + 0.4);
  }

  _hat(t, vol) {
    const len = 0.04;
    const buf = this._noise(len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'highpass'; flt.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(flt); flt.connect(g); g.connect(this.musicBus);
    src.start(t);
  }

  _pluck(f, t, vol) {
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t + 0.55);
  }

  _noise(len) {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* 0..1 phase within the current beat; used for the on-beat pulse ring */
  beatPhase() {
    if (!this.enabled) return 0;
    const el = (this.ctx.currentTime - this.startTime) / this.beatDur;
    return el - Math.floor(el);
  }

  quantize(freq) {
    // snap any frequency to the game scale so fights stay in key
    let best = this.scale[0], bd = Infinity;
    for (const s of this.scale) {
      const d = Math.abs(s - freq);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  duck(amount = 0.3, time = 0.45) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(amount, t);
    this.musicBus.gain.linearRampToValueAtTime(0.9, t + time);
  }

  /* ── weapon voices ── */

  fluteShot() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const f = this.quantize(600 + Math.random() * 320);
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.08);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.16);
    // breath
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise(0.06);
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.value = f * 2; flt.Q.value = 2;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.05, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(flt); flt.connect(ng); ng.connect(this.sfxBus);
    src.start(t);
  }

  trumpetBlast() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const f = 174.61; // F3, brassy
    for (const mult of [1, 1.5, 2]) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * mult * 0.7, t);
      o.frequency.exponentialRampToValueAtTime(f * mult, t + 0.06);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.11 / mult, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g); g.connect(this.sfxBus);
      o.start(t); o.stop(t + 0.55);
    }
    this.duck(0.55, 0.3);
  }

  violinChain(i) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + i * 0.05;
    const f = this.scale[Math.min(this.scale.length - 1, 4 + i)];
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass'; flt.frequency.value = 3200; flt.Q.value = 3;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.075, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(flt); flt.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.45);
  }

  xyloNote(pitchIdx) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const f = this.scale[(pitchIdx + 5) % this.scale.length];
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f * 2;
    const o2 = this.ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 5.4; // metallic partial
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.03, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g); g.connect(this.sfxBus);
    o2.connect(g2); g2.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.65);
    o2.start(t); o2.stop(t + 0.2);
  }

  bassDrop() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.9);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 1.25);
    // impact noise
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise(0.35);
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass'; flt.frequency.value = 900;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.3, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    src.connect(flt); flt.connect(ng); ng.connect(this.sfxBus);
    src.start(t);
    this.duck(0.12, 0.9); // sidechain everything: the GDD's -6dB snapshot, exaggerated for drama
  }

  enemyHit() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const f = this.quantize(300 + Math.random() * 300);
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.08);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.12);
  }

  enemyDie() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    // little resolving arpeggio — kills sound like resolution, not noise
    [0, 2, 4].forEach((s, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = this.chords[this.chordIdx][i % 3] * 2;
      const g = this.ctx.createGain();
      const tt = t + i * 0.04;
      g.gain.setValueAtTime(0.055, tt);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.25);
      o.connect(g); g.connect(this.sfxBus);
      o.start(tt); o.stop(tt + 0.3);
    });
  }

  playerHurt() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.25);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.32);
    this.duck(0.5, 0.35);
  }

  dash() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise(0.18);
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.setValueAtTime(400, t);
    flt.frequency.exponentialRampToValueAtTime(2600, t + 0.16);
    flt.Q.value = 1.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.11, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(flt); flt.connect(g); g.connect(this.sfxBus);
    src.start(t);
  }

  synergy() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    [0, 1, 2, 3].forEach(i => {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = this.scale[(4 + i * 2) % this.scale.length] * 2;
      const g = this.ctx.createGain();
      const tt = t + i * 0.05;
      g.gain.setValueAtTime(0.07, tt);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.35);
      o.connect(g); g.connect(this.sfxBus);
      o.start(tt); o.stop(tt + 0.4);
    });
  }

  upgradePick() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    [261.63, 329.63, 392.0, 523.25].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = this.ctx.createGain();
      const tt = t + i * 0.09;
      g.gain.setValueAtTime(0.09, tt);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.5);
      o.connect(g); g.connect(this.sfxBus);
      o.start(tt); o.stop(tt + 0.55);
    });
  }
}

const AUDIO = new AudioEngine();
