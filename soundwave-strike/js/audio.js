/* ── Soundwave Strike audio ───────────────────────────────────────────
   Procedural 120 BPM electro underscore + instrument-gun SFX.
   All combat sounds are quantized to E minor so a firefight reads as a
   jam session, and heavy shots duck the music bus (auto-ensemble tuning
   + dynamic sidechain from the proposal). */

class SWAudio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.bpm = 120;
    this.beatDur = 60 / this.bpm;
    this.startTime = 0;
    this.nextBeat = 0;
    this.beatCount = 0;
    // E minor pentatonic pool
    this.scale = [164.81, 196.0, 220.0, 246.94, 293.66, 329.63, 392.0, 440.0, 493.88, 587.33, 659.25];
    this.bassSeq = [41.2, 41.2, 49.0, 41.2, 55.0, 41.2, 49.0, 36.71]; // E1 G1 A1 D1 walk
    this.level = 0; // 0..1 beat energy for visuals (EQ towers)
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.75;
    this.musicBus.connect(this.master);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 1;
    this.sfxBus.connect(this.master);
    this.enabled = true;
    this.startTime = this.ctx.currentTime + 0.05;
    this.nextBeat = this.startTime;
    this._timer = setInterval(() => this._schedule(), 40);
  }

  _schedule() {
    const ahead = this.ctx.currentTime + 0.3;
    while (this.nextBeat < ahead) {
      this._beat(this.nextBeat, this.beatCount);
      this.nextBeat += this.beatDur;
      this.beatCount++;
    }
  }

  _beat(t, n) {
    const half = this.beatDur / 2;
    this._kick(t);
    if (n % 2 === 1) this._snare(t);
    this._hat(t, 0.05); this._hat(t + half, 0.028);
    // driving 8th bass
    const b = this.bassSeq[n % 8];
    this._bass(b, t, half * 0.95);
    this._bass(b, t + half, half * 0.85);
    // sparse lead every 2 bars
    if ((n >> 2) % 2 === 1 && n % 2 === 0) {
      this._lead(this.scale[(3 + (n >> 1)) % this.scale.length] * 2, t, 0.05);
    }
  }

  _noiseBuf(len) {
    const buf = this.ctx.createBuffer(1, Math.max(1, this.ctx.sampleRate * len | 0), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _kick(t) {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t + 0.25);
  }

  _snare(t) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf(0.12);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(f); f.connect(g); g.connect(this.musicBus);
    src.start(t);
  }

  _hat(t, vol) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf(0.03);
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 7500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    src.connect(f); f.connect(g); g.connect(this.musicBus);
    src.start(t);
  }

  _bass(freq, t, dur) {
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(700, t);
    f.frequency.exponentialRampToValueAtTime(180, t + dur);
    f.Q.value = 6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.003, t + dur);
    o.connect(f); f.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  _lead(freq, t, vol) {
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 2400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(f); f.connect(g); g.connect(this.sMusic || this.musicBus);
    o.start(t); o.stop(t + 0.45);
  }

  /* 0..1 within current beat */
  beatPhase() {
    if (!this.enabled) return 0;
    const e = (this.ctx.currentTime - this.startTime) / this.beatDur;
    return e - Math.floor(e);
  }
  /* true when close enough to a beat edge for the Beat Dash bonus */
  onBeat(window_ = 0.16) {
    const ph = this.beatPhase();
    return ph < window_ || ph > 1 - window_;
  }

  quantize(freq) {
    let best = this.scale[0], bd = Infinity;
    for (const s of this.scale) {
      const d = Math.abs(s - freq);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  duck(amount = 0.35, time = 0.4) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(amount, t);
    this.musicBus.gain.linearRampToValueAtTime(0.75, t + time);
  }

  /* ── weapon voices ── */

  trumpetShot() { // shotgun: brass stab chord + blast noise
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    for (const m of [1, 1.26, 1.5]) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(220 * m * 0.8, t);
      o.frequency.exponentialRampToValueAtTime(220 * m, t + 0.03);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.connect(g); g.connect(this.sfxBus);
      o.start(t); o.stop(t + 0.25);
    }
    this._blastNoise(t, 0.14, 1100, 0.2);
    this.duck(0.5, 0.25);
  }

  smgShot() { // snare drum: tight crack
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    this._blastNoise(t, 0.05, 2600, 0.11);
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(this.quantize(300 + Math.random() * 200) * 2, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.06);
  }

  sniperShot() { // trombone: deep gliss + heavy crack
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(392, t);
    o.frequency.exponentialRampToValueAtTime(98, t + 0.35);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.55);
    this._blastNoise(t, 0.2, 700, 0.28);
    this.duck(0.3, 0.5);
  }

  rocketLaunch() { // tuba: fat sub blast + whoosh
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.5);
    this._blastNoise(t, 0.3, 500, 0.2, true);
  }

  explosion() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.7);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.85);
    this._blastNoise(t, 0.5, 380, 0.32);
    this.duck(0.15, 0.7);
  }

  _blastNoise(t, len, freq, vol, sweepUp = false) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf(len);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    if (sweepUp) {
      f.frequency.setValueAtTime(freq, t);
      f.frequency.exponentialRampToValueAtTime(freq * 4, t + len);
    } else f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f); f.connect(g); g.connect(this.sfxBus);
    src.start(t);
  }

  hitmark() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = this.quantize(500 + Math.random() * 300) * 2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.1);
  }

  killJingle() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    [329.63, 392.0, 493.88, 659.25].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = this.ctx.createGain();
      const tt = t + i * 0.06;
      g.gain.setValueAtTime(0.1, tt);
      g.gain.exponentialRampToValueAtTime(0.001, tt + 0.3);
      o.connect(g); g.connect(this.sfxBus);
      o.start(tt); o.stop(tt + 0.35);
    });
  }

  dash(boosted) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf(0.2);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(boosted ? 4200 : 2400, t + 0.18);
    f.Q.value = 2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    src.connect(f); f.connect(g); g.connect(this.sfxBus);
    src.start(t);
    if (boosted) { // on-beat stab reward
      const o = this.ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = 659.25;
      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.07, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g2); g2.connect(this.sfxBus);
      o.start(t); o.stop(t + 0.22);
    }
  }

  slide() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf(0.3);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(2600, t);
    f.frequency.exponentialRampToValueAtTime(300, t + 0.3); // vinyl-scratch down
    f.Q.value = 3;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    src.connect(f); f.connect(g); g.connect(this.sfxBus);
    src.start(t);
  }

  jumpPad() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(164.81, t);
    o.frequency.exponentialRampToValueAtTime(659.25, t + 0.22);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.32);
  }

  hurt() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(196, t);
    o.frequency.exponentialRampToValueAtTime(65, t + 0.18);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.22);
  }

  die() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    [493.88, 392.0, 329.63, 246.94].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const g = this.ctx.createGain();
      const tt = t + i * 0.09;
      g.gain.setValueAtTime(0.07, tt);
      g.gain.exponentialRampToValueAtTime(0.001, tt + 0.35);
      o.connect(g); g.connect(this.sfxBus);
      o.start(tt); o.stop(tt + 0.4);
    });
    this.duck(0.25, 0.9);
  }

  reload() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    for (const dt of [0, 0.12]) {
      const o = this.ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = dt ? 880 : 660;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.035, t + dt);
      g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.04);
      o.connect(g); g.connect(this.sfxBus);
      o.start(t + dt); o.stop(t + dt + 0.05);
    }
  }
}

const AUDIO = new SWAudio();
