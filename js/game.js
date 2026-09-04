/* ── Symphonic Fracture — main game ─────────────────────────────────── */

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'menu';
    this.time = 0;
    this.input = { keys: {}, mx: 0, my: 0, lmb: false, rmb: false };
    this.shakeAmp = 0; this.shakeTime = 0; this.shakeDur = 1;
    this.hitStopTimer = 0;
    this.flashAlpha = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindInput();
    this.bg = new Background(this.w, this.h);
    this.particles = new Particles();
    this.beams = [];
    this.lastTs = 0;
    requestAnimationFrame(ts => this.frame(ts));
  }

  resize() {
    this.w = this.canvas.width = window.innerWidth;
    this.h = this.canvas.height = window.innerHeight;
    this.bounds = { x0: 46, y0: 96, x1: this.w - 46, y1: this.h - 56 };
    if (this.bg) this.bg.resize(this.w, this.h);
  }

  bindInput() {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      this.input.keys[k] = true;
      if (this.state !== 'playing') return;
      if (k === ' ') {
        e.preventDefault();
        if (this.player.tryDash(this.input)) {
          AUDIO.dash();
          this.particles.ring(this.player.x, this.player.y, 'rgba(94,232,255,0.8)', 60, 0.3, 3);
        }
      }
      if (k === 'q') {
        if (this.weapons.drums.tryDrop()) this.updateHud();
      }
      if (k === 'e' && this.owned.violin) this.weapons.violin.tryFire();
    });
    window.addEventListener('keyup', e => { this.input.keys[e.key.toLowerCase()] = false; });
    this.canvas.addEventListener('mousemove', e => {
      this.input.mx = e.clientX; this.input.my = e.clientY;
    });
    this.canvas.addEventListener('mousedown', e => {
      if (e.button === 0) this.input.lmb = true;
      if (e.button === 2) {
        this.input.rmb = true;
        if (this.state === 'playing' && this.owned.trumpet) this.weapons.trumpet.tryFire();
      }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.input.lmb = false;
      if (e.button === 2) this.input.rmb = false;
    });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  /* ── run setup ── */
  startRun() {
    AUDIO.init();
    this.state = 'playing';
    this.time = 0;
    this.score = 0;
    this.kills = 0;
    this.synergies = 0;
    this.player = new Player(this.w / 2, this.h * 0.6);
    this.enemies = [];
    this.playerShots = [];
    this.enemyBolts = [];
    this.beams = [];
    this.particles.list.length = 0;
    this.combo = new HarmonicComboManager(this);
    this.weapons = {
      flute: new FluteWeapon(this),
      trumpet: new TrumpetWeapon(this),
      violin: new ViolinWeapon(this),
      xylo: new XylophoneWeapon(this),
      drums: new DrumWeapon(this),
    };
    for (const k in this.weapons) {
      this.weapons[k].x = this.player.x;
      this.weapons[k].y = this.player.y;
    }
    // MVP loadout per the GDD: flute + drums; the rest unlock as encores
    this.owned = { flute: true, trumpet: false, violin: false, xylo: false, drums: true };
    this.wave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveRest = 1.2;
    this.upgradeOffered = false;
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('gameover').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    this.buildWeaponDock();
    this.updateHud();
  }

  nextWave() {
    this.wave++;
    document.getElementById('wave-label').textContent = `MOVEMENT ${ROMAN[Math.min(this.wave - 1, ROMAN.length - 1)]}`;
    const budget = 4 + this.wave * 3;
    const q = [];
    if (this.wave % 5 === 0) {
      q.push('boss');
      for (let i = 0; i < this.wave; i++) q.push(Math.random() < 0.5 ? 'shard' : 'shooter');
    } else {
      let b = budget;
      while (b > 0) {
        const r = Math.random();
        if (this.wave >= 3 && r < 0.18) { q.push('brute'); b -= 3; }
        else if (this.wave >= 2 && r < 0.45) { q.push('shooter'); b -= 2; }
        else { q.push('shard'); b -= 1; }
      }
    }
    this.spawnQueue = q;
    this.spawnTimer = 0.5;
  }

  spawnEnemy(type) {
    // spawn just outside a random edge of the arena
    const b = this.bounds;
    const side = (Math.random() * 4) | 0;
    let x, y;
    if (side === 0) { x = b.x0 - 30; y = b.y0 + Math.random() * (b.y1 - b.y0); }
    else if (side === 1) { x = b.x1 + 30; y = b.y0 + Math.random() * (b.y1 - b.y0); }
    else if (side === 2) { x = b.x0 + Math.random() * (b.x1 - b.x0); y = b.y0 - 30; }
    else { x = b.x0 + Math.random() * (b.x1 - b.x0); y = b.y1 + 30; }
    const scale = 1 + (this.wave - 1) * 0.14;
    const e = new Enemy(type, x, y, scale);
    this.enemies.push(e);
    this.particles.ring(x, y, 'rgba(255,94,138,0.7)', 50, 0.4, 3);
  }

  spawnEnemyBolt(x, y, angle) {
    this.enemyBolts.push(new EnemyBolt(x, y, angle));
  }

  /* ── event hooks ── */
  onEnemyKilled(e, opts) {
    this.kills++;
    this.score += e.score * (1 + this.combo.combo * 0.1) | 0;
    this.combo.onKill();
    this.weapons.drums.addCharge(e.type === 'boss' ? 0.35 : e.type === 'brute' ? 0.14 : 0.07);
    AUDIO.enemyDie();
    const col = opts.color || '#ffd77e';
    this.particles.shardBurst(e.x, e.y, col, e.type === 'boss' ? 26 : 12);
    this.particles.ring(e.x, e.y, col, e.type === 'boss' ? 220 : 70, 0.45, 4);
    for (let i = 0; i < (e.type === 'boss' ? 8 : 2); i++) this.particles.glyph(e.x, e.y, col);
    if (e.type === 'boss') { this.shake(14, 0.5); this.flash(0.4); this.hitStop(0.1); }
    this.updateHud();
  }

  onPlayerHurt() {
    AUDIO.playerHurt();
    this.shake(10, 0.3);
    this.flash(0.18, '255,60,90');
    this.particles.spark(this.player.x, this.player.y, '#ff5e8a', 12, 200, 0.5, 3.5);
    this.updateHud();
    if (this.player.hp <= 0) this.gameOver();
  }

  triggerElementBurst(e) {
    // detonate an element mark (wall-slam synergy from the GDD)
    const isBurn = e.debuffs.burn > 0;
    e.debuffs.burn = 0; e.debuffs.freeze = 0;
    this.synergies++;
    this.combo.synergyBurst(e, 22 * this.player.dmgMult, isBurn ? '#ff8a5e' : '#9fd8ff', isBurn ? 'DETONATION!' : 'SHATTER!');
  }

  /* ── screen feedback ── */
  shake(amp, dur) {
    if (amp > this.shakeAmp) { this.shakeAmp = amp; this.shakeDur = dur; this.shakeTime = dur; }
  }
  hitStop(dur) { this.hitStopTimer = Math.max(this.hitStopTimer, dur); }
  flash(a, rgb = '160,235,255') { this.flashAlpha = Math.max(this.flashAlpha, a); this.flashRgb = rgb; }

  /* ── upgrades ── */
  upgradePool() {
    const g = this;
    const pool = [
      { id: 'dmg', icon: '🎼', tag: 'FORTE', name: 'Fortissimo', desc: '+20% damage on every instrument.', apply() { g.player.dmgMult *= 1.2; } },
      { id: 'rate', icon: '⏱️', tag: 'TEMPO', name: 'Accelerando', desc: '+18% fire rate and cooldown recovery.', apply() { g.player.rateMult *= 1.18; } },
      { id: 'hp', icon: '💠', tag: 'VITALE', name: 'Sustained Chord', desc: '+25 max resonance and full heal.', apply() { g.player.maxHp += 25; g.player.hp = g.player.maxHp; } },
      { id: 'dash', icon: '💨', tag: 'MOTO', name: 'Glissando Step', desc: 'Dash recharges 30% faster.', apply() { g.player.dashCdMax *= 0.7; } },
      { id: 'bass', icon: '🔊', tag: 'BASSO', name: 'Deeper Groove', desc: 'Bass Drop charges 35% faster.', apply() { g.player.bassChargeMult *= 1.35; } },
      { id: 'pierce', icon: '🌪️', tag: 'VENTO', name: 'Cutting Gale', desc: 'Wind blades pierce +1 enemy.', apply() { g.player.pierce += 1; } },
    ];
    if (!this.owned.trumpet) pool.push({ id: 'trumpet', icon: '🎺', tag: 'NEW INSTRUMENT', name: 'Aureate Shockhorn', desc: 'RMB: a 60° concussive blast. Slams enemies into walls for bonus damage and stun.', weapon: true, apply() { g.owned.trumpet = true; } });
    if (!this.owned.violin) pool.push({ id: 'violin', icon: '🎻', tag: 'NEW INSTRUMENT', name: 'Prism Chordbow', desc: 'E: a pure-tone laser that chains between up to 5 enemies.', weapon: true, apply() { g.owned.violin = true; } });
    if (!this.owned.xylo) pool.push({ id: 'xylo', icon: '🛎️', tag: 'NEW INSTRUMENT', name: 'Chromatic Chimes', desc: 'Auto-casts 7 bouncing Do‑Re‑Mi notes of fire and ice.', weapon: true, apply() { g.owned.xylo = true; } });
    return pool;
  }

  showUpgrades() {
    this.state = 'upgrade';
    const pool = this.upgradePool();
    // weapons first: guarantee at most 3, bias toward new instruments
    pool.sort(() => Math.random() - 0.5);
    pool.sort((a, b) => (b.weapon ? 1 : 0) - (a.weapon ? 1 : 0));
    const picks = [pool[0]];
    const rest = pool.slice(1).sort(() => Math.random() - 0.5);
    picks.push(rest[0], rest[1]);
    const wrap = document.getElementById('upgrade-cards');
    wrap.innerHTML = '';
    for (const u of picks) {
      const card = document.createElement('div');
      card.className = 'card' + (u.weapon ? ' new-weapon' : '');
      card.innerHTML = `<div class="card-icon">${u.icon}</div><div class="card-tag">${u.tag}</div><h3>${u.name}</h3><p>${u.desc}</p>`;
      card.onclick = () => {
        u.apply();
        AUDIO.upgradePick();
        document.getElementById('upgrade').classList.add('hidden');
        this.buildWeaponDock();
        this.updateHud();
        this.state = 'playing';
        this.waveRest = 1.5;
      };
      wrap.appendChild(card);
    }
    document.getElementById('upgrade').classList.remove('hidden');
  }

  gameOver() {
    this.state = 'over';
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('go-stats').innerHTML =
      `SCORE <b>${this.score.toLocaleString()}</b> &nbsp;·&nbsp; MOVEMENTS <b>${this.wave}</b><br>` +
      `DISSONANCE SILENCED <b>${this.kills}</b> &nbsp;·&nbsp; HARMONIC SYNERGIES <b>${this.synergies}</b>`;
    document.getElementById('gameover').classList.remove('hidden');
  }

  /* ── HUD ── */
  buildWeaponDock() {
    const dock = document.getElementById('weapon-dock');
    dock.innerHTML = '';
    const order = ['flute', 'trumpet', 'violin', 'xylo', 'drums'];
    for (const k of order) {
      const div = document.createElement('div');
      div.className = 'wslot' + (this.owned[k] ? ' owned' : '');
      div.textContent = this.weapons[k].icon;
      div.title = this.weapons[k].name;
      dock.appendChild(div);
    }
  }

  updateHud() {
    const p = this.player;
    document.getElementById('hp-bar').style.width = `${Math.max(0, p.hp / p.maxHp) * 100}%`;
    document.getElementById('bass-bar').style.width = `${this.weapons.drums.charge * 100}%`;
    document.getElementById('bass-wrap').classList.toggle('ready', this.weapons.drums.charge >= 1);
    document.getElementById('score-label').textContent = this.score.toLocaleString();
    const cl = document.getElementById('combo-label');
    if (this.combo.combo >= 3) {
      cl.classList.remove('hidden');
      cl.textContent = `COMBO ×${this.combo.combo}`;
    } else cl.classList.add('hidden');
  }

  /* ── main loop ── */
  frame(ts) {
    let dt = Math.min(0.033, (ts - this.lastTs) / 1000 || 0.016);
    this.lastTs = ts;

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      dt *= 0.05; // near-freeze: the GDD's hit-stop
    }

    if (this.state === 'playing') this.update(dt);
    this.time += dt;
    this.particles.update(dt);
    for (let i = this.beams.length - 1; i >= 0; i--) {
      this.beams[i].life -= dt;
      if (this.beams[i].life <= 0) this.beams.splice(i, 1);
    }
    if (this.shakeTime > 0) this.shakeTime -= dt;
    else this.shakeAmp = 0;
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.8);

    this.draw();
    requestAnimationFrame(t => this.frame(t));
  }

  update(dt) {
    const p = this.player;
    p.update(dt, this.input, this.bounds);
    this.combo.update(dt);

    // wave flow
    if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
      if (this.wave > 0 && !this.upgradeOffered) {
        this.upgradeOffered = true;
        this.showUpgrades();
        return;
      }
      this.waveRest -= dt;
      if (this.waveRest <= 0) {
        this.nextWave();
        this.upgradeOffered = false;
      }
    } else if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = Math.max(0.25, 1.1 - this.wave * 0.05);
        this.spawnEnemy(this.spawnQueue.shift());
      }
    }

    // weapons
    if (this.input.lmb) this.weapons.flute.tryFire();
    for (const k in this.weapons) if (this.owned[k]) this.weapons[k].updateHover(dt);
    if (this.owned.xylo) this.weapons.xylo.autoUpdate(dt);
    this.weapons.drums.autoUpdate(dt);

    // projectiles
    for (const s of this.playerShots) s.update(dt, this);
    for (const b of this.enemyBolts) b.update(dt, this);

    // shots vs enemies
    for (const s of this.playerShots) {
      if (s.dead) continue;
      for (const e of this.enemies) {
        if (e.dead || s.hitSet.has(e)) continue;
        if (Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.r) {
          s.hitSet.add(e);
          AUDIO.enemyHit();
          e.takeDamage(s.dmg, this, {
            kx: (s.vx / (Math.hypot(s.vx, s.vy) || 1)) * 90,
            ky: (s.vy / (Math.hypot(s.vx, s.vy) || 1)) * 90,
            color: s.color,
          });
          if (s.kind === 'blade') this.weapons.flute.onHit(e, s);
          if (s.kind === 'note') {
            this.weapons.xylo.onHit(e, s);
            this.weapons.drums.addCharge(0.008);
          } else {
            this.weapons.drums.addCharge(0.012);
          }
          if (s.pierce > 0) s.pierce--;
          else if (s.kind !== 'note') s.dead = true; // notes keep bouncing through
          break;
        }
      }
    }

    for (const e of this.enemies) if (!e.dead) e.update(dt, this);

    this.playerShots = this.playerShots.filter(s => !s.dead);
    this.enemyBolts = this.enemyBolts.filter(b => !b.dead);
    this.enemies = this.enemies.filter(e => !e.dead);

    // low-frequency HUD refresh for bars that drift (bass trickle)
    this._hudT = (this._hudT || 0) - dt;
    if (this._hudT <= 0) { this._hudT = 0.2; this.updateHud(); }
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    const beat = AUDIO.enabled ? AUDIO.beatPhase() : (this.time * (112 / 60)) % 1;
    this.bg.draw(ctx, beat);

    // camera shake
    if (this.shakeAmp > 0) {
      const k = this.shakeTime / this.shakeDur;
      const a = this.shakeAmp * k * k;
      ctx.translate((Math.random() - 0.5) * a * 2, (Math.random() - 0.5) * a * 2);
    }

    if (this.state !== 'menu') {
      // arena border — faint gilded frame that pulses on the beat
      const b = this.bounds;
      ctx.save();
      ctx.strokeStyle = `rgba(245,201,107,${0.14 + (1 - beat) * 0.12})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
      // corner flourishes
      ctx.strokeStyle = 'rgba(245,201,107,0.5)';
      ctx.lineWidth = 2;
      const cl = 26;
      for (const [cx, cy, sx, sy] of [[b.x0, b.y0, 1, 1], [b.x1, b.y0, -1, 1], [b.x0, b.y1, 1, -1], [b.x1, b.y1, -1, -1]]) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * cl, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * cl);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.state === 'playing' || this.state === 'upgrade' || this.state === 'over') {
      // violin beams
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const bm of this.beams) {
        const a = bm.life / bm.maxLife;
        ctx.globalAlpha = a;
        ctx.strokeStyle = bm.color;
        ctx.lineWidth = 4 * a + 1;
        ctx.beginPath();
        ctx.moveTo(bm.x1, bm.y1);
        ctx.lineTo(bm.x2, bm.y2);
        ctx.stroke();
        ctx.globalAlpha = a * 0.6;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4 * a;
        ctx.stroke();
      }
      ctx.restore();

      for (const s of this.playerShots) s.draw(ctx);
      for (const b of this.enemyBolts) b.draw(ctx, this.time);
      for (const e of this.enemies) ART.drawEnemy(ctx, e, this.time);

      // instruments behind/around the player
      for (const k of ['drums', 'xylo', 'violin', 'trumpet', 'flute']) {
        if (this.owned[k]) this.weapons[k].draw(ctx);
      }
      if (this.player.hp > 0) ART.drawPlayer(ctx, this.player, this.time);
    }

    this.particles.draw(ctx);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.bg.vignette(ctx);

    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(${this.flashRgb || '160,235,255'},${this.flashAlpha})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }
}

/* ── boot ── */
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game(document.getElementById('game'));
  document.getElementById('start-btn').addEventListener('click', () => game.startRun());
  document.getElementById('retry-btn').addEventListener('click', () => game.startRun());
  window.GAME = game;
});
