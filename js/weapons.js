/* ── Floating instrument weapon system ────────────────────────────────
   Implements the GDD spec:
   - FloatingInstrumentBase: instruments are NOT attached to the hand;
     they follow the player on a damped spring (SmoothDamp).
   - HarmonicComboManager: debuff flags (Tear/Blast/Resonance/elements)
     and the Bass Drop finisher:
       FinalDamage = BaseDamage * (1.0 + DebuffCount * 0.75)          */

function smoothDamp(cur, target, velObj, key, smoothTime, dt) {
  // critically damped spring, Unity-style
  const omega = 2 / Math.max(0.0001, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cur - target;
  const temp = (velObj[key] + omega * change) * dt;
  velObj[key] = (velObj[key] - omega * temp) * exp;
  return target + (change + temp) * exp;
}

class FloatingInstrumentBase {
  constructor(game, hoverOffset) {
    this.game = game;
    this.hoverOffset = hoverOffset;   // relative to player, flipped with facing
    this.x = 0; this.y = 0;
    this.vel = { x: 0, y: 0 };
    this.recoil = 0;                  // kick-back along aim on fire
    this.fireFlash = 0;
    this.cd = 0;
    this.smoothTime = 0.14;
  }

  updateHover(dt) {
    const p = this.game.player;
    const bob = Math.sin(this.game.time * 2 + this.hoverOffset.x) * 3;
    const tx = p.x + this.hoverOffset.x * p.facing - Math.cos(p.aimAngle) * this.recoil;
    const ty = p.y + this.hoverOffset.y + bob - Math.sin(p.aimAngle) * this.recoil;
    this.x = smoothDamp(this.x, tx, this.vel, 'x', this.smoothTime, dt);
    this.y = smoothDamp(this.y, ty, this.vel, 'y', this.smoothTime, dt);
    this.recoil *= Math.pow(0.001, dt);
    this.fireFlash = Math.max(0, this.fireFlash - dt);
    if (this.cd > 0) this.cd -= dt;
  }

  kick(amount) { this.recoil = amount; this.fireFlash = 0.15; }

  /* particle tether from the conductor's hand to the instrument on fire */
  drawTether(ctx) {
    if (this.fireFlash <= 0) return;
    const p = this.game.player;
    const hx = p.x + Math.cos(p.aimAngle) * 20;
    const hy = p.y + Math.sin(p.aimAngle) * 20 - 4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = this.fireFlash / 0.15 * 0.7;
    ctx.strokeStyle = '#bff2ff';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo((hx + this.x) / 2, (hy + this.y) / 2 - 14, this.x, this.y);
    ctx.stroke();
    ctx.restore();
  }
}

/* ── Flute: sonic wind blades (primary, held LMB) ── */
const INSTRUMENT_SCALE = 1.4;

class FluteWeapon extends FloatingInstrumentBase {
  constructor(game) {
    super(game, { x: -10, y: -48 });
    this.baseRate = 0.16;
    this.icon = '🪈';
    this.name = 'Piccolo of the Gale';
  }

  tryFire() {
    const g = this.game;
    if (this.cd > 0) return;
    this.cd = this.baseRate / g.player.rateMult;
    const a = g.player.aimAngle + (Math.random() - 0.5) * 0.06;
    g.playerShots.push(new PlayerShot('blade', this.x, this.y, a, {
      dmg: 8 * g.player.dmgMult,
      speed: 680,
      pierce: g.player.pierce,
      color: '#7df0ff',
      life: 0.9,
    }));
    this.kick(6);
    AUDIO.fluteShot();
  }

  onHit(enemy, shot) {
    const g = this.game;
    // Auditory Tear debuff: +15% damage taken (GDD)
    enemy.debuffs.tear = 4;
    // Synergy: wind blade on a Brass-blasted enemy → Wind Pressure Burst (1.5x AoE)
    if (enemy.debuffs.blast > 0) {
      g.combo.synergyBurst(enemy, shot.dmg * 1.5, '#9ef4ff', 'WIND BURST!');
    }
    // Synergy: frozen enemy + wind blade → Ice Shatter armor break
    if (enemy.debuffs.freeze > 0) {
      enemy.debuffs.freeze = 0;
      g.combo.synergyBurst(enemy, shot.dmg * 2, '#cfeaff', 'ICE SHATTER!');
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(INSTRUMENT_SCALE, INSTRUMENT_SCALE);
    ctx.rotate(this.game.player.aimAngle);
    ART.drawFlute(ctx, this.game.time, this.fireFlash > 0);
    ctx.restore();
    this.drawTether(ctx);
  }
}

/* ── Trumpet: concussive cone blast (RMB) ── */
class TrumpetWeapon extends FloatingInstrumentBase {
  constructor(game) {
    super(game, { x: 42, y: -24 });
    this.cdMax = 2.4;
    this.icon = '🎺';
    this.name = 'Aureate Shockhorn';
    this.range = 250;
    this.arc = Math.PI / 3; // the GDD's 60° cone
  }

  tryFire() {
    const g = this.game;
    if (this.cd > 0) return;
    this.cd = this.cdMax / g.player.rateMult;
    const p = g.player;
    const aim = p.aimAngle;
    this.kick(18);
    AUDIO.trumpetBlast();
    g.shake(8, 0.22);
    g.hitStop(0.05);

    // muzzle art
    const mx = this.x + Math.cos(aim) * 30;
    const my = this.y + Math.sin(aim) * 30;
    g.particles.ring(mx, my, 'rgba(255,200,110,0.95)', 130, 0.4, 6);
    for (let i = 0; i < 14; i++) {
      const a = aim + (Math.random() - 0.5) * this.arc;
      const s = 300 + Math.random() * 300;
      g.particles.list.push({
        kind: 'spark', x: mx, y: my,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.4, maxLife: 0.4, color: '#ffd77e', size: 3.5,
      });
    }
    g.particles.glyph(mx, my, '#ffd77e');

    for (const e of g.enemies) {
      const dx = e.x - p.x, dy = e.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > this.range + e.r) continue;
      const da = Math.abs(normAngle(Math.atan2(dy, dx) - aim));
      if (da > this.arc / 2) continue;
      const kb = 620 * (1 - dist / (this.range + e.r)) + 260;
      e.debuffs.blast = 4;
      e.takeDamage(16 * g.player.dmgMult, g, {
        kx: (dx / dist) * kb, ky: (dy / dist) * kb,
        color: '#ffb35e',
      });
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(INSTRUMENT_SCALE, INSTRUMENT_SCALE);
    ctx.rotate(this.game.player.aimAngle);
    ART.drawTrumpet(ctx, this.game.time, this.fireFlash > 0);
    ctx.restore();
    this.drawTether(ctx);
  }
}

/* ── Violin: chain laser (E) ── */
class ViolinWeapon extends FloatingInstrumentBase {
  constructor(game) {
    super(game, { x: -46, y: -18 });
    this.cdMax = 3.2;
    this.icon = '🎻';
    this.name = 'Prism Chordbow';
    this.maxChain = 5;
  }

  tryFire() {
    const g = this.game;
    if (this.cd > 0) return;
    if (g.enemies.length === 0) return;
    this.cd = this.cdMax / g.player.rateMult;
    this.kick(10);
    g.hitStop(0.04);

    // chain to nearest, then hop — prefer resonance-marked targets (GDD)
    let fromX = this.x, fromY = this.y;
    const hitSet = new Set();
    let dmg = 14 * g.player.dmgMult;
    for (let i = 0; i < this.maxChain; i++) {
      let best = null, bestScore = Infinity;
      for (const e of g.enemies) {
        if (hitSet.has(e) || e.dead) continue;
        const d = Math.hypot(e.x - fromX, e.y - fromY);
        if (d > 340) continue;
        const score = e.debuffs.resonance > 0 ? d * 0.4 : d;
        if (score < bestScore) { bestScore = score; best = e; }
      }
      if (!best) break;
      hitSet.add(best);
      g.beams.push({ x1: fromX, y1: fromY, x2: best.x, y2: best.y, life: 0.28, maxLife: 0.28, color: '#c98bff' });
      AUDIO.violinChain(i);
      best.debuffs.resonance = 4;
      best.takeDamage(dmg, g, { color: '#c98bff' });
      g.particles.spark(best.x, best.y, '#c98bff', 8, 150, 0.4, 3);
      g.particles.glyph(best.x, best.y, '#c98bff');
      fromX = best.x; fromY = best.y;
      dmg *= 0.85; // slight falloff along the chain
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(INSTRUMENT_SCALE, INSTRUMENT_SCALE);
    ART.drawViolin(ctx, this.game.time, this.fireFlash > 0);
    ctx.restore();
    this.drawTether(ctx);
  }
}

/* ── Xylophone: Do-Re-Mi elemental bouncing notes (auto-caster) ── */
class XylophoneWeapon extends FloatingInstrumentBase {
  constructor(game) {
    super(game, { x: 52, y: 16 });
    this.cdMax = 4.5;
    this.icon = '🛎️';
    this.name = 'Chromatic Chimes';
    this.cd = 1.5;
  }

  /* fires by itself: a scale-run of 7 bouncing element notes */
  autoUpdate(dt) {
    const g = this.game;
    if (this.cd > 0 || g.enemies.length === 0) return;
    this.cd = this.cdMax / g.player.rateMult;
    this.kick(8);
    const baseA = g.player.aimAngle;
    for (let i = 0; i < 7; i++) {
      const el = i % 2 === 0 ? 'burn' : 'freeze';
      const a = baseA + (i - 3) * 0.16;
      window.setTimeout(() => AUDIO.xyloNote(i), i * 55);
      g.playerShots.push(new PlayerShot('note', this.x, this.y, a, {
        dmg: 7 * g.player.dmgMult,
        speed: 380 + i * 45,       // higher pitch flies farther (GDD)
        life: 1.6 + i * 0.12,
        bounces: 2 + Math.floor(i / 2),
        element: el,
        color: el === 'burn' ? '#ff6a5e' : '#9fd8ff',
        pitchIdx: i,
        r: 7,
      }));
    }
  }

  onHit(enemy, shot) {
    const g = this.game;
    if (shot.element === 'burn') {
      enemy.debuffs.burn = 3;
      g.particles.spark(enemy.x, enemy.y, '#ff6a5e', 6, 140, 0.4, 3);
    } else {
      enemy.debuffs.freeze = 1.6;
      g.particles.spark(enemy.x, enemy.y, '#9fd8ff', 6, 140, 0.4, 3);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(INSTRUMENT_SCALE, INSTRUMENT_SCALE);
    ART.drawXylophone(ctx, this.game.time, this.fireFlash > 0);
    ctx.restore();
  }
}

/* ── Drums: the Bass Drop finisher (Q) ── */
class DrumWeapon extends FloatingInstrumentBase {
  constructor(game) {
    super(game, { x: 0, y: 58 });
    this.icon = '🥁';
    this.name = 'Pulse Kit';
    this.charge = 0;       // 0..1
    this.dropping = 0;
  }

  addCharge(amount) {
    this.charge = Math.min(1, this.charge + amount * this.game.player.bassChargeMult);
  }

  tryDrop() {
    const g = this.game;
    if (this.charge < 1) return false;
    this.charge = 0;
    this.dropping = 0.5;
    AUDIO.bassDrop();
    g.shake(18, 0.55);
    g.hitStop(0.12);
    g.flash(0.55);
    const p = g.player;
    g.particles.ring(p.x, p.y, 'rgba(140,220,255,0.95)', 560, 0.8, 10);
    g.particles.ring(p.x, p.y, 'rgba(183,139,255,0.8)', 420, 0.65, 6);
    g.particles.ring(p.x, p.y, 'rgba(255,255,255,0.9)', 260, 0.5, 4);
    for (let i = 0; i < 10; i++) g.particles.glyph(p.x + (Math.random() - 0.5) * 120, p.y, '#9ef4ff');

    const base = 40 * p.dmgMult;
    for (const e of [...g.enemies]) {
      const dx = e.x - p.x, dy = e.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      // GDD formula: FinalDamage = BaseDamage * (1.0 + DebuffCount * 0.75)
      const debuffs = e.debuffCount();
      const final = base * (1.0 + debuffs * 0.75);
      if (debuffs >= 2) {
        g.particles.text(e.x, e.y - e.r - 30, `HARMONIC ×${(1 + debuffs * 0.75).toFixed(2)}`, '#b78bff', 15);
        AUDIO.synergy();
      }
      // consume the debuffs in the detonation
      for (const k in e.debuffs) e.debuffs[k] = 0;
      const kb = 900 * Math.max(0.25, 1 - dist / 700);
      e.takeDamage(final, g, {
        kx: (dx / dist) * kb, ky: (dy / dist) * kb,
        color: '#9ef4ff', big: true,
      });
    }
    return true;
  }

  autoUpdate(dt) {
    this.dropping = Math.max(0, this.dropping - dt);
    this.addCharge(dt * 0.012); // slow trickle so a drop is never unreachable
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(INSTRUMENT_SCALE, INSTRUMENT_SCALE);
    ART.drawDrum(ctx, this.game.time, this.charge, this.dropping > 0);
    ctx.restore();
  }
}

/* ── HarmonicComboManager: synergy detonations + combo meter ── */
class HarmonicComboManager {
  constructor(game) {
    this.game = game;
    this.combo = 0;
    this.comboTimer = 0;
  }

  onKill() {
    this.combo++;
    this.comboTimer = 3.5;
  }

  update(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
  }

  synergyBurst(center, dmg, color, label) {
    const g = this.game;
    AUDIO.synergy();
    g.hitStop(0.06);
    g.shake(6, 0.2);
    g.particles.ring(center.x, center.y, color, 120, 0.45, 5);
    g.particles.text(center.x, center.y - center.r - 34, label, color, 17);
    for (const e of g.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - center.x, e.y - center.y);
      if (d < 110 + e.r) {
        const dx = (e.x - center.x) / (d || 1), dy = (e.y - center.y) / (d || 1);
        e.takeDamage(dmg, g, { kx: dx * 240, ky: dy * 240, color });
      }
    }
  }
}

function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
