/* ── Entities ─────────────────────────────────────────────────────────
   Player, enemies of dissonance, and both projectile pools. */

class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.r = 17;
    this.maxHp = 100;
    this.hp = 100;
    this.speed = 250;
    this.aimAngle = 0;
    this.facing = 1;
    this.iframes = 0;
    this.dashCd = 0;
    this.dashCdMax = 1.4;
    this.dashTime = 0;
    this.dashDir = { x: 1, y: 0 };
    // roguelite stat multipliers
    this.dmgMult = 1;
    this.rateMult = 1;
    this.bassChargeMult = 1;
    this.pierce = 0;
  }

  update(dt, input, bounds) {
    let mx = 0, my = 0;
    if (input.keys['w'] || input.keys['arrowup']) my -= 1;
    if (input.keys['s'] || input.keys['arrowdown']) my += 1;
    if (input.keys['a'] || input.keys['arrowleft']) mx -= 1;
    if (input.keys['d'] || input.keys['arrowright']) mx += 1;
    const len = Math.hypot(mx, my);
    if (len > 0) { mx /= len; my /= len; }

    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.vx = this.dashDir.x * 760;
      this.vy = this.dashDir.y * 760;
    } else {
      // smooth acceleration
      const accel = 2600;
      this.vx += (mx * this.speed - this.vx) * Math.min(1, accel * dt / this.speed);
      this.vy += (my * this.speed - this.vy) * Math.min(1, accel * dt / this.speed);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = Math.max(bounds.x0 + this.r, Math.min(bounds.x1 - this.r, this.x));
    this.y = Math.max(bounds.y0 + this.r, Math.min(bounds.y1 - this.r, this.y));

    this.aimAngle = Math.atan2(input.my - this.y, input.mx - this.x);
    this.facing = Math.cos(this.aimAngle) >= 0 ? 1 : -1;

    if (this.iframes > 0) this.iframes -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
  }

  tryDash(input) {
    if (this.dashCd > 0 || this.dashTime > 0) return false;
    let mx = 0, my = 0;
    if (input.keys['w'] || input.keys['arrowup']) my -= 1;
    if (input.keys['s'] || input.keys['arrowdown']) my += 1;
    if (input.keys['a'] || input.keys['arrowleft']) mx -= 1;
    if (input.keys['d'] || input.keys['arrowright']) mx += 1;
    const len = Math.hypot(mx, my);
    if (len === 0) { mx = Math.cos(this.aimAngle); my = Math.sin(this.aimAngle); }
    else { mx /= len; my /= len; }
    this.dashDir = { x: mx, y: my };
    this.dashTime = 0.16;
    this.dashCd = this.dashCdMax;
    this.iframes = Math.max(this.iframes, 0.3);
    return true;
  }

  hurt(dmg) {
    if (this.iframes > 0 || this.dashTime > 0) return false;
    this.hp -= dmg;
    this.iframes = 0.8;
    return true;
  }
}

/* ── Enemies ── */
const ENEMY_DEFS = {
  shard:   { r: 20, hp: 26, speed: 120, dmg: 10, score: 100 },
  shooter: { r: 23, hp: 40, speed: 70,  dmg: 8,  score: 180 },
  brute:   { r: 34, hp: 130, speed: 52, dmg: 18, score: 320 },
  boss:    { r: 62, hp: 900, speed: 46, dmg: 22, score: 2500 },
};

class Enemy {
  constructor(type, x, y, waveScale) {
    const d = ENEMY_DEFS[type];
    this.type = type;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.r = d.r;
    this.maxHp = Math.round(d.hp * waveScale);
    this.hp = this.maxHp;
    this.speed = d.speed;
    this.dmg = d.dmg;
    this.score = d.score;
    this.spin = Math.random() * Math.PI * 2;
    this.seed = Math.random() * 10;
    this.hitFlash = 0;
    this.stun = 0;
    this.kbx = 0; this.kby = 0; // knockback impulse velocity
    this.shootCd = 2 + Math.random() * 2;
    this.shootTelegraph = 0;
    this.dead = false;
    // GDD debuff state flags (Tear_Woodwind / Blast_Brass / Resonance_String / elements)
    this.debuffs = { tear: 0, blast: 0, resonance: 0, burn: 0, freeze: 0 };
    this.burnTick = 0;
  }

  debuffCount() {
    let n = 0;
    for (const k in this.debuffs) if (this.debuffs[k] > 0) n++;
    return n;
  }

  takeDamage(dmg, game, opts = {}) {
    // Auditory Tear: +15% of all subsequent damage
    let final = dmg * (this.debuffs.tear > 0 ? 1.15 : 1);
    final = Math.round(final);
    this.hp -= final;
    this.hitFlash = 0.08;
    if (opts.kx || opts.ky) {
      const frozenMult = this.debuffs.freeze > 0 ? 0.2 : 1;
      this.kbx += (opts.kx || 0) * frozenMult;
      this.kby += (opts.ky || 0) * frozenMult;
    }
    game.particles.text(this.x, this.y - this.r - 14, `${final}`, opts.color || '#ffe9ad', opts.big ? 24 : 15);
    game.particles.spark(this.x, this.y, opts.color || '#ffd77e', 5, 130, 0.35, 2.5);
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      game.onEnemyKilled(this, opts);
    }
    return final;
  }

  update(dt, game) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    for (const k in this.debuffs) if (this.debuffs[k] > 0) this.debuffs[k] -= dt;

    // burn DoT
    if (this.debuffs.burn > 0) {
      this.burnTick -= dt;
      if (this.burnTick <= 0) {
        this.burnTick = 0.5;
        this.takeDamage(4, game, { color: '#ff6a5e' });
        game.particles.spark(this.x, this.y - this.r, '#ff6a5e', 3, 60, 0.4, 2);
        if (this.dead) return;
      }
    }

    // knockback decay
    this.x += this.kbx * dt;
    this.y += this.kby * dt;
    this.kbx *= Math.pow(0.02, dt);
    this.kby *= Math.pow(0.02, dt);

    // wall slam: heavy knockback into arena edge → bonus damage + stun (sonic physics)
    const b = game.bounds;
    const kb = Math.hypot(this.kbx, this.kby);
    if (kb > 220) {
      if (this.x < b.x0 + this.r || this.x > b.x1 - this.r || this.y < b.y0 + this.r || this.y > b.y1 - this.r) {
        this.kbx *= -0.4; this.kby *= -0.4;
        this.stun = Math.max(this.stun, 1.2);
        game.shake(6, 0.18);
        game.particles.ring(this.x, this.y, 'rgba(255,190,110,0.9)', 60, 0.35, 4);
        this.takeDamage(18, game, { color: '#ffb35e', big: true });
        if (this.dead) return;
        // wall slam under a xylophone mark detonates it (GDD synergy)
        if (this.debuffs.burn > 0 || this.debuffs.freeze > 0) game.triggerElementBurst(this);
      }
    }
    this.x = Math.max(b.x0 + this.r, Math.min(b.x1 - this.r, this.x));
    this.y = Math.max(b.y0 + this.r, Math.min(b.y1 - this.r, this.y));

    if (this.stun > 0) { this.stun -= dt; return; }
    if (this.debuffs.freeze > 0) return; // frozen solid

    const p = game.player;
    const dx = p.x - this.x, dy = p.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.spin += dt * 2.4;

    const slow = 1; // (reserved for tuba ripple zones)
    switch (this.type) {
      case 'shard':
        this.vx = (dx / dist) * this.speed * slow;
        this.vy = (dy / dist) * this.speed * slow;
        break;
      case 'shooter': {
        // keep mid distance, volley dissonant bolts
        const want = 260;
        const push = dist > want ? 1 : -0.7;
        this.vx = (dx / dist) * this.speed * push * slow;
        this.vy = (dy / dist) * this.speed * push * slow;
        this.shootCd -= dt;
        if (this.shootCd <= 0.6) this.shootTelegraph = (0.6 - this.shootCd) / 0.6;
        if (this.shootCd <= 0) {
          this.shootCd = 2.2 + Math.random() * 1.4;
          this.shootTelegraph = 0;
          game.spawnEnemyBolt(this.x, this.y, Math.atan2(dy, dx));
        }
        break;
      }
      case 'brute':
        this.vx = (dx / dist) * this.speed * slow;
        this.vy = (dy / dist) * this.speed * slow;
        break;
      case 'boss': {
        this.vx = (dx / dist) * this.speed * slow;
        this.vy = (dy / dist) * this.speed * slow;
        this.shootCd -= dt;
        if (this.shootCd <= 0) {
          this.shootCd = 1.6;
          // radial discord burst
          for (let i = 0; i < 8; i++) {
            game.spawnEnemyBolt(this.x, this.y, (i / 8) * Math.PI * 2 + this.spin);
          }
        }
        break;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // contact damage
    if (dist < this.r + p.r) {
      if (p.hurt(this.dmg)) game.onPlayerHurt(this);
    }
  }
}

/* ── Projectiles ── */
class PlayerShot {
  /* kind: 'blade' (flute) | 'note' (xylophone) | others are hitscan */
  constructor(kind, x, y, angle, opts = {}) {
    this.kind = kind;
    this.x = x; this.y = y;
    const sp = opts.speed || 620;
    this.vx = Math.cos(angle) * sp;
    this.vy = Math.sin(angle) * sp;
    this.angle = angle;
    this.dmg = opts.dmg || 8;
    this.life = opts.life || 1.1;
    this.r = opts.r || 6;
    this.pierce = opts.pierce || 0;
    this.bounces = opts.bounces || 0;
    this.element = opts.element || null; // 'burn' | 'freeze'
    this.color = opts.color || '#7df0ff';
    this.pitchIdx = opts.pitchIdx || 0;
    this.hitSet = new Set();
    this.dead = false;
  }

  update(dt, game) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const b = game.bounds;
    if (this.bounces > 0) {
      if (this.x < b.x0 || this.x > b.x1) { this.vx *= -1; this.bounces--; game.particles.spark(this.x, this.y, this.color, 4, 100, 0.3, 2); }
      if (this.y < b.y0 || this.y > b.y1) { this.vy *= -1; this.bounces--; game.particles.spark(this.x, this.y, this.color, 4, 100, 0.3, 2); }
      this.x = Math.max(b.x0, Math.min(b.x1, this.x));
      this.y = Math.max(b.y0, Math.min(b.y1, this.y));
    } else if (this.x < b.x0 - 40 || this.x > b.x1 + 40 || this.y < b.y0 - 40 || this.y > b.y1 + 40) {
      this.dead = true;
      return;
    }
    this.angle = Math.atan2(this.vy, this.vx);
    if (Math.random() < 0.5) game.particles.trail(this.x, this.y, this.color, this.kind === 'note' ? 5 : 3, 0.25);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalCompositeOperation = 'lighter';
    if (this.kind === 'blade') {
      ctx.rotate(this.angle);
      // crescent wind blade
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(-8, 0, 15, -1.1, 1.1);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(-8, 0, 15, -0.8, 0.8);
      ctx.stroke();
      ART.glow(ctx, 0, 0, 17, this.color, 0.55);
    } else if (this.kind === 'note') {
      ART.glow(ctx, 0, 0, 18, this.color, 0.8);
      ctx.fillStyle = '#fff';
      ctx.font = '700 19px serif';
      ctx.textAlign = 'center';
      ctx.fillText('♪', 0, 6);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, this.r + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

class EnemyBolt {
  constructor(x, y, angle) {
    this.x = x; this.y = y;
    const sp = 250;
    this.vx = Math.cos(angle) * sp;
    this.vy = Math.sin(angle) * sp;
    this.r = 6;
    this.life = 4;
    this.dead = false;
  }

  update(dt, game) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const b = game.bounds;
    if (this.life <= 0 || this.x < b.x0 - 20 || this.x > b.x1 + 20 || this.y < b.y0 - 20 || this.y > b.y1 + 20) {
      this.dead = true;
      return;
    }
    const p = game.player;
    if (Math.hypot(p.x - this.x, p.y - this.y) < p.r + this.r) {
      this.dead = true;
      if (p.hurt(9)) game.onPlayerHurt(this);
      else game.particles.spark(this.x, this.y, '#b78bff', 6, 120, 0.3, 2.5);
    }
  }

  draw(ctx, t) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalCompositeOperation = 'lighter';
    ART.glow(ctx, 0, 0, 12, 'rgba(200,110,255,0.9)', 0.8);
    ctx.fillStyle = '#f4e8ff';
    ctx.beginPath();
    // jagged dissonance star
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 6;
      const rr = i % 2 ? 2.4 : 5.5;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
