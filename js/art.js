/* ── Art layer ────────────────────────────────────────────────────────
   Everything visual that isn't game logic: the ruined neon-steampunk
   concert hall, the particle system, glow helpers and the hand-drawn
   vector instruments that hover around the player. */

const ART = {};

/* additive glow disc */
ART.glow = function (ctx, x, y, r, color, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/* ── Background: fractured concert hall ── */
class Background {
  constructor(w, h) {
    this.resize(w, h);
    this.t = 0;
  }

  resize(w, h) {
    this.w = w; this.h = h;
    // drifting dust motes (two parallax layers)
    this.dust = [];
    for (let i = 0; i < 90; i++) {
      this.dust.push({
        x: Math.random() * w, y: Math.random() * h,
        r: 0.6 + Math.random() * 1.8,
        s: 4 + Math.random() * 14,
        layer: Math.random() < 0.5 ? 0 : 1,
        ph: Math.random() * Math.PI * 2,
      });
    }
    // shattered floating platform shards in the far distance
    this.shards = [];
    for (let i = 0; i < 14; i++) {
      this.shards.push({
        x: Math.random() * w, y: Math.random() * h * 0.55,
        w: 30 + Math.random() * 90, rot: (Math.random() - 0.5) * 0.5,
        drift: 2 + Math.random() * 5, ph: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.5 ? 'rgba(94,232,255,' : 'rgba(183,139,255,',
      });
    }
    // giant broken ring gears (steampunk halo behind the stage)
    this.rings = [
      { r: Math.min(w, h) * 0.46, speed: 0.05, gap: 0.9, lw: 3, col: 'rgba(245,201,107,0.20)' },
      { r: Math.min(w, h) * 0.36, speed: -0.08, gap: 1.6, lw: 2, col: 'rgba(94,232,255,0.16)' },
      { r: Math.min(w, h) * 0.58, speed: 0.03, gap: 0.5, lw: 5, col: 'rgba(183,139,255,0.10)' },
    ];
    this._buildStatic();
  }

  /* pre-render the expensive static scenery once */
  _buildStatic() {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    const x = c.getContext('2d');
    const w = this.w, h = this.h;

    // deep hall gradient
    const sky = x.createRadialGradient(w / 2, h * 0.42, 40, w / 2, h * 0.5, Math.max(w, h) * 0.85);
    sky.addColorStop(0, '#191a3e');
    sky.addColorStop(0.45, '#0d0e26');
    sky.addColorStop(1, '#04040c');
    x.fillStyle = sky;
    x.fillRect(0, 0, w, h);

    // distant balconies — layered theater arcs
    for (let i = 0; i < 4; i++) {
      const ry = h * (0.16 + i * 0.1);
      const alpha = 0.05 + i * 0.022;
      x.strokeStyle = `rgba(245,201,107,${alpha})`;
      x.lineWidth = 14 - i * 2.2;
      x.beginPath();
      x.ellipse(w / 2, h * 0.02, w * (0.62 - i * 0.09), ry, 0, 0.15, Math.PI - 0.15);
      x.stroke();
      // balcony lamps
      const lamps = 9 - i;
      for (let l = 1; l < lamps; l++) {
        const a = 0.15 + (Math.PI - 0.3) * (l / lamps);
        const lx = w / 2 + Math.cos(a) * w * (0.62 - i * 0.09);
        const ly = h * 0.02 + Math.sin(a) * ry;
        const g = x.createRadialGradient(lx, ly, 0, lx, ly, 26);
        g.addColorStop(0, `rgba(255,214,140,${0.16 - i * 0.03})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g;
        x.fillRect(lx - 26, ly - 26, 52, 52);
      }
    }

    // side pillars, broken
    for (const side of [-1, 1]) {
      const px = w / 2 + side * w * 0.44;
      const grad = x.createLinearGradient(px - 26, 0, px + 26, 0);
      grad.addColorStop(0, 'rgba(20,22,52,0)');
      grad.addColorStop(0.5, 'rgba(38,40,86,0.85)');
      grad.addColorStop(1, 'rgba(20,22,52,0)');
      x.fillStyle = grad;
      x.fillRect(px - 30, h * 0.05, 60, h * 0.6);
      // fracture cut
      x.save();
      x.globalCompositeOperation = 'destination-out';
      x.translate(px, h * 0.3);
      x.rotate(side * 0.35);
      x.fillRect(-40, -8, 80, 16);
      x.restore();
      // glowing fracture edge
      x.save();
      x.translate(px, h * 0.3);
      x.rotate(side * 0.35);
      x.fillStyle = 'rgba(94,232,255,0.30)';
      x.fillRect(-38, -2, 76, 3);
      x.restore();
    }

    // stage floor — perspective boards
    const floorY = h * 0.62;
    const fg = x.createLinearGradient(0, floorY, 0, h);
    fg.addColorStop(0, '#131430');
    fg.addColorStop(0.5, '#0c0d22');
    fg.addColorStop(1, '#060614');
    x.fillStyle = fg;
    x.fillRect(0, floorY, w, h - floorY);
    // converging board seams
    x.strokeStyle = 'rgba(120,130,220,0.07)';
    x.lineWidth = 1.5;
    for (let i = -8; i <= 8; i++) {
      x.beginPath();
      x.moveTo(w / 2 + i * 40, floorY);
      x.lineTo(w / 2 + i * 220, h);
      x.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const y = floorY + (h - floorY) * Math.pow(i / 6, 1.6);
      x.beginPath();
      x.moveTo(0, y); x.lineTo(w, y);
      x.stroke();
    }
    // gold proscenium edge along the floor line
    x.strokeStyle = 'rgba(245,201,107,0.22)';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(0, floorY); x.lineTo(w, floorY);
    x.stroke();
    // conductor's podium — gilded inlay at center stage
    const pyc = h * 0.8;
    for (const [rx, alpha, lw] of [[w * 0.17, 0.16, 2.5], [w * 0.12, 0.10, 1.5], [w * 0.055, 0.20, 1.5]]) {
      x.strokeStyle = `rgba(245,201,107,${alpha})`;
      x.lineWidth = lw;
      x.beginPath();
      x.ellipse(w / 2, pyc, rx, rx * 0.32, 0, 0, Math.PI * 2);
      x.stroke();
    }
    const pg = x.createRadialGradient(w / 2, pyc, 0, w / 2, pyc, w * 0.1);
    pg.addColorStop(0, 'rgba(245,201,107,0.08)');
    pg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = pg;
    x.beginPath();
    x.ellipse(w / 2, pyc, w * 0.12, w * 0.045, 0, 0, Math.PI * 2);
    x.fill();

    this.staticLayer = c;
    this.floorY = floorY;
  }

  draw(ctx, beatPulse) {
    const { w, h } = this;
    this.t += 1 / 60;
    ctx.drawImage(this.staticLayer, 0, 0);

    // rotating fractured gear-rings behind the stage
    ctx.save();
    ctx.translate(w / 2, h * 0.40);
    for (const ring of this.rings) {
      ctx.save();
      ctx.rotate(this.t * ring.speed);
      ctx.strokeStyle = ring.col;
      ctx.lineWidth = ring.lw;
      // broken segments
      for (let s = 0; s < 5; s++) {
        const a0 = (s / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(0, 0, ring.r, a0, a0 + ring.gap);
        ctx.stroke();
      }
      // gear teeth on the gold ring
      if (ring.lw === 3) {
        for (let tth = 0; tth < 24; tth++) {
          const a = (tth / 24) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * ring.r, Math.sin(a) * ring.r);
          ctx.lineTo(Math.cos(a) * (ring.r + 9), Math.sin(a) * (ring.r + 9));
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    ctx.restore();

    // floating fractured shards
    for (const s of this.shards) {
      const bob = Math.sin(this.t * 0.5 + s.ph) * s.drift;
      ctx.save();
      ctx.translate(s.x, s.y + bob);
      ctx.rotate(s.rot);
      const grad = ctx.createLinearGradient(-s.w / 2, 0, s.w / 2, 0);
      grad.addColorStop(0, 'rgba(26,28,64,0.0)');
      grad.addColorStop(0.5, 'rgba(30,32,74,0.9)');
      grad.addColorStop(1, 'rgba(26,28,64,0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(-s.w / 2, -3, s.w, 6);
      ctx.fillStyle = s.hue + '0.5)';
      ctx.fillRect(-s.w / 2, 2.4, s.w, 1.4); // underlit edge
      ctx.restore();
    }

    // dust motes
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const d of this.dust) {
      d.y -= d.s * (1 / 60) * (d.layer ? 1 : 0.5);
      d.x += Math.sin(this.t * 0.7 + d.ph) * 0.15;
      if (d.y < -4) { d.y = h + 4; d.x = Math.random() * w; }
      ctx.globalAlpha = d.layer ? 0.35 : 0.16;
      ctx.fillStyle = d.layer ? '#9fd8ff' : '#c9b0ff';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // beat rings pulsing out from stage center on the floor
    const pulse = 1 - beatPulse; // 1 right on the beat, decays
    if (pulse > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(94,232,255,${0.22 * pulse})`;
      ctx.lineWidth = 2;
      const rr = 60 + beatPulse * 340;
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.8, rr * 1.6, rr * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  vignette(ctx) {
    const { w, h } = this;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.38, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(2,2,8,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

/* ── Particles ── */
class Particles {
  constructor() { this.list = []; }

  spark(x, y, color, n = 8, speed = 160, life = 0.5, size = 3) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.list.push({
        kind: 'spark', x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life, maxLife: life, color, size: size * (0.5 + Math.random() * 0.8),
      });
    }
  }

  ring(x, y, color, maxR = 90, life = 0.4, lw = 3) {
    this.list.push({ kind: 'ring', x, y, life, maxLife: life, color, maxR, lw });
  }

  glyph(x, y, color) {
    const glyphs = ['♪', '♫', '♩', '♬'];
    this.list.push({
      kind: 'glyph', x: x + (Math.random() - 0.5) * 20, y,
      vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 50,
      life: 0.9, maxLife: 0.9, color,
      ch: glyphs[(Math.random() * glyphs.length) | 0],
      size: 14 + Math.random() * 12,
      rot: (Math.random() - 0.5) * 1.2,
    });
  }

  shardBurst(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 90 + Math.random() * 220;
      this.list.push({
        kind: 'shard', x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
        life: 0.7, maxLife: 0.7, color,
        size: 3 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 14,
      });
    }
  }

  text(x, y, str, color, size = 16) {
    this.list.push({
      kind: 'text', x, y, vx: (Math.random() - 0.5) * 20, vy: -70,
      life: 0.8, maxLife: 0.8, color, str, size,
    });
  }

  trail(x, y, color, size = 4, life = 0.3) {
    this.list.push({ kind: 'trail', x, y, life, maxLife: life, color, size });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      if (p.vx !== undefined) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'shard') p.vy += 500 * dt;
        if (p.kind === 'spark') { p.vx *= 0.94; p.vy *= 0.94; }
        if (p.rot !== undefined && p.vr) p.rot += p.vr * dt;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.list) {
      const a = p.life / p.maxLife;
      switch (p.kind) {
        case 'spark':
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = a;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'trail':
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = a * 0.6;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'ring': {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = a;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.lw * a;
          const r = p.maxR * (1 - a);
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'glyph':
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = a;
          ctx.fillStyle = p.color;
          ctx.font = `${p.size}px serif`;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot * (1 - a));
          ctx.fillText(p.ch, 0, 0);
          ctx.restore();
          break;
        case 'shard':
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = a;
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
          break;
        case 'text':
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(1, a * 1.5);
          ctx.fillStyle = p.color;
          ctx.font = `700 ${p.size}px Rajdhani, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(p.str, p.x, p.y);
          break;
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}

/* ── Instrument drawings ─────────────────────────────────────────────
   Each is drawn in local space: origin at the instrument's hover
   point, +x pointing along its aim. All keep the "precise classical
   body + neon energy" look from the GDD. */

ART.drawFlute = function (ctx, t, firing) {
  ctx.save();
  // body — silver tube with gold keys
  const grad = ctx.createLinearGradient(0, -3, 0, 3);
  grad.addColorStop(0, '#f4f7ff');
  grad.addColorStop(0.5, '#aeb6cf');
  grad.addColorStop(1, '#5c637e');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-22, -2.6, 44, 5.2, 2.6);
  ctx.fill();
  // keys
  ctx.fillStyle = '#e8ce8d';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(-12 + i * 7, 0, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // mouthpiece glow (blue-white, per GDD)
  const pulse = firing ? 1 : 0.5 + 0.5 * Math.sin(t * 5);
  ART.glow(ctx, 24, 0, 10 + pulse * 6, 'rgba(120,220,255,0.9)', 0.8);
  ctx.fillStyle = '#dffaff';
  ctx.beginPath();
  ctx.arc(23, 0, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

ART.drawTrumpet = function (ctx, t, firing) {
  ctx.save();
  const body = ctx.createLinearGradient(0, -6, 0, 6);
  body.addColorStop(0, '#ffe9ad');
  body.addColorStop(0.45, '#e0a83f');
  body.addColorStop(1, '#8a5f18');
  // lead pipe
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(-20, -2.4, 30, 4.8, 2.4);
  ctx.fill();
  // bell
  ctx.beginPath();
  ctx.moveTo(8, -2.4);
  ctx.quadraticCurveTo(20, -3, 26, -11);
  ctx.lineTo(28, 11);
  ctx.quadraticCurveTo(20, 3, 8, 2.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,190,0.8)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // valves — energy pistons
  for (let i = 0; i < 3; i++) {
    const vx = -12 + i * 7;
    ctx.fillStyle = '#c8912e';
    ctx.fillRect(vx - 1.4, -9, 2.8, 8);
    ctx.fillStyle = firing ? '#9ef4ff' : '#ffd77e';
    ctx.beginPath();
    ctx.arc(vx, -10, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (firing) ART.glow(ctx, 30, 0, 26, 'rgba(255,190,90,0.95)', 1);
  else ART.glow(ctx, 27, 0, 9, 'rgba(255,200,110,0.55)', 0.5 + 0.3 * Math.sin(t * 4));
  ctx.restore();
};

ART.drawViolin = function (ctx, t, firing) {
  ctx.save();
  ctx.rotate(-0.5);
  // body — figure-8, warm wood
  const wood = ctx.createLinearGradient(-10, -14, 10, 14);
  wood.addColorStop(0, '#a4502a');
  wood.addColorStop(0.5, '#7a3418');
  wood.addColorStop(1, '#4c1d0c');
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(11, -16, 12, -7, 7, -3);
  ctx.bezierCurveTo(14, 0, 14, 12, 0, 14);
  ctx.bezierCurveTo(-14, 12, -14, 0, -7, -3);
  ctx.bezierCurveTo(-12, -7, -11, -16, 0, -16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,150,0.5)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // neck
  ctx.fillStyle = '#3a1a0a';
  ctx.fillRect(-1.8, -30, 3.6, 16);
  ctx.beginPath();
  ctx.arc(0, -31, 3, 0, Math.PI * 2);
  ctx.fill();
  // f-holes
  ctx.strokeStyle = '#2a1005';
  ctx.lineWidth = 1.4;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 5, -1);
    ctx.quadraticCurveTo(s * 7, 4, s * 4.5, 8);
    ctx.stroke();
  }
  // energy strings
  const sPulse = firing ? 1 : 0.4 + 0.25 * Math.sin(t * 7);
  ctx.strokeStyle = `rgba(150,240,255,${sPulse})`;
  ctx.lineWidth = 0.9;
  for (let i = -1; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 1.6 - 0.8, -30);
    ctx.lineTo(i * 1.6 - 0.8, 12);
    ctx.stroke();
  }
  // hovering energy bow when firing
  if (firing) {
    ctx.save();
    ctx.rotate(0.9);
    ctx.strokeStyle = 'rgba(160,245,255,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, 2); ctx.lineTo(22, 2);
    ctx.stroke();
    ART.glow(ctx, 0, 2, 20, 'rgba(120,230,255,0.8)', 0.9);
    ctx.restore();
  }
  ctx.restore();
};

ART.drawXylophone = function (ctx, t, firing) {
  ctx.save();
  // arc of floating metal bars, each its own color
  const cols = ['#ff6a5e', '#ffb35e', '#ffe95e', '#8aff5e', '#5ee8ff', '#7d8bff', '#c98bff'];
  for (let i = 0; i < 7; i++) {
    const a = -0.9 + i * 0.3;
    const r = 22;
    const bx = Math.cos(a) * r, by = Math.sin(a) * r;
    const bob = Math.sin(t * 3 + i) * 1.5;
    ctx.save();
    ctx.translate(bx, by + bob);
    ctx.rotate(a + Math.PI / 2);
    const len = 14 - Math.abs(i - 3) * 1.2;
    ctx.fillStyle = cols[i];
    ctx.globalAlpha = firing ? 1 : 0.85;
    ctx.beginPath();
    ctx.roundRect(-3, -len / 2, 6, len, 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -len / 2 + 1, 1.4, len - 2);
    ctx.restore();
    if (firing) ART.glow(ctx, bx, by, 9, cols[i], 0.7);
  }
  ctx.restore();
};

ART.drawDrum = function (ctx, t, charge, dropping) {
  ctx.save();
  // holographic drum pad — concentric energy circles
  const r = 16 + (dropping ? 8 : 0);
  const alpha = 0.35 + charge * 0.5;
  for (let i = 3; i >= 1; i--) {
    ctx.strokeStyle = `rgba(94,232,255,${alpha * (i === 1 ? 1 : 0.35)})`;
    ctx.lineWidth = i === 1 ? 2 : 1;
    ctx.beginPath();
    ctx.arc(0, 0, r * (i / 3), 0, Math.PI * 2);
    ctx.stroke();
  }
  // rotating rune ticks
  ctx.save();
  ctx.rotate(t * 0.8);
  ctx.strokeStyle = `rgba(183,139,255,${alpha})`;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r + 3), Math.sin(a) * (r + 3));
    ctx.lineTo(Math.cos(a) * (r + 7), Math.sin(a) * (r + 7));
    ctx.stroke();
  }
  ctx.restore();
  // charge fill
  if (charge > 0.02) {
    ctx.fillStyle = `rgba(94,232,255,${0.10 + charge * 0.16})`;
    ctx.beginPath();
    ctx.arc(0, 0, r * charge, 0, Math.PI * 2);
    ctx.fill();
  }
  if (charge >= 1) ART.glow(ctx, 0, 0, 30 + Math.sin(t * 6) * 6, 'rgba(140,220,255,0.8)', 0.8);
  // crossed light drumsticks
  ctx.strokeStyle = 'rgba(255,225,160,0.9)';
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 4, 10);
    ctx.lineTo(s * 13, -8 - (dropping ? 6 : Math.sin(t * 5 + s) * 2));
    ctx.stroke();
    ctx.fillStyle = '#ffe9ad';
    ctx.beginPath();
    ctx.arc(s * 13, -8 - (dropping ? 6 : Math.sin(t * 5 + s) * 2), 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

/* ── The player: a hovering conductor of light ── */
ART.drawPlayer = function (ctx, p, t) {
  const bob = Math.sin(t * 2.2) * 3;
  const S = 1.45; // world-scale so the conductor reads at fullscreen
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.scale(S, S);

  // hover ground glow + ring
  ART.glow(ctx, 0, 26 - bob, 26, 'rgba(94,232,255,0.5)', 0.5);
  ctx.strokeStyle = 'rgba(94,232,255,0.35)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 26 - bob, 20 + Math.sin(t * 3) * 2, 6, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (p.iframes > 0 && Math.floor(t * 18) % 2 === 0) ctx.globalAlpha = 0.35;

  const facing = p.facing; // -1 | 1 from aim
  ctx.scale(facing, 1);

  // flowing coat — layered bezier cloth
  const sway = Math.sin(t * 2.6) * 2.5;
  const coat = ctx.createLinearGradient(0, -18, 0, 24);
  coat.addColorStop(0, '#2c2e5e');
  coat.addColorStop(0.6, '#1a1b3c');
  coat.addColorStop(1, '#0d0e24');
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(10, -14, 12, -2, 10 + sway, 22);
  ctx.quadraticCurveTo(0, 17, -10 - sway, 22);
  ctx.bezierCurveTo(-12, -2, -10, -14, 0, -16);
  ctx.fill();
  // gold trim on the coat
  ctx.strokeStyle = 'rgba(245,201,107,0.75)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(8, -12, 10, -2, 8.4 + sway, 20);
  ctx.stroke();
  // chest resonance core
  ART.glow(ctx, 0, -4, 12, 'rgba(140,230,255,0.9)', 0.85);
  ctx.fillStyle = '#eafcff';
  ctx.beginPath();
  ctx.arc(0, -4, 3.2 + Math.sin(t * 4) * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // shoulders / collar
  ctx.fillStyle = '#34366e';
  ctx.beginPath();
  ctx.ellipse(0, -15, 9.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // head with hood
  ctx.fillStyle = '#23244c';
  ctx.beginPath();
  ctx.arc(0, -23, 7.2, 0, Math.PI * 2);
  ctx.fill();
  // face glow inside hood
  const face = ctx.createRadialGradient(2, -23, 0, 2, -23, 6);
  face.addColorStop(0, 'rgba(160,240,255,0.9)');
  face.addColorStop(1, 'rgba(160,240,255,0)');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(1.5, -23, 5.5, 0, Math.PI * 2);
  ctx.fill();
  // eyes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(2.2, -24.6, 2.2, 1.4);

  // conducting arm toward aim — with baton
  ctx.restore();
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.scale(S, S);
  const aa = p.aimAngle;
  ctx.rotate(aa);
  ctx.strokeStyle = '#2c2e5e';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(2, -8);
  ctx.lineTo(15, -2);
  ctx.stroke();
  // baton of light
  ctx.strokeStyle = 'rgba(255,235,180,0.95)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(15, -2);
  ctx.lineTo(27, -4);
  ctx.stroke();
  ART.glow(ctx, 27, -4, 8, 'rgba(255,225,150,0.9)', 0.8);
  ctx.restore();
};

/* ── Enemies: creatures of dissonance ── */
ART.drawEnemy = function (ctx, e, t) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const flash = e.hitFlash > 0;
  const frozen = e.debuffs.freeze > 0;

  if (frozen) {
    ART.glow(ctx, 0, 0, e.r + 14, 'rgba(140,200,255,0.55)', 0.7);
  }

  switch (e.type) {
    case 'shard': { // jagged spinning tri-shard
      ctx.rotate(e.spin);
      const g = ctx.createLinearGradient(0, -e.r, 0, e.r);
      g.addColorStop(0, flash ? '#ffffff' : '#ff5e8a');
      g.addColorStop(1, flash ? '#ffffff' : '#5a1030');
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const rr = e.r * (i % 2 ? 0.75 : 1);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        const mid = a + Math.PI / 3;
        ctx.lineTo(Math.cos(mid) * e.r * 0.45, Math.sin(mid) * e.r * 0.45);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,120,160,0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ART.glow(ctx, 0, 0, e.r * 0.7, 'rgba(255,94,138,0.6)', 0.6);
      break;
    }
    case 'shooter': { // floating broken-bell eye
      const g = ctx.createLinearGradient(0, -e.r, 0, e.r);
      g.addColorStop(0, flash ? '#ffffff' : '#8a5cff');
      g.addColorStop(1, flash ? '#ffffff' : '#2a1560');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-e.r * 0.8, -e.r);
      ctx.quadraticCurveTo(0, -e.r * 1.5, e.r * 0.8, -e.r);
      ctx.lineTo(e.r, e.r * 0.7);
      ctx.quadraticCurveTo(0, e.r * 1.1, -e.r, e.r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(183,139,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // eye — telegraphs shots
      const ch = Math.min(1, e.shootTelegraph || 0);
      ctx.fillStyle = ch > 0.6 ? '#ffffff' : '#e2d4ff';
      ctx.beginPath();
      ctx.arc(0, 0, e.r * (0.28 + ch * 0.14), 0, Math.PI * 2);
      ctx.fill();
      ART.glow(ctx, 0, 0, e.r * (0.6 + ch), 'rgba(183,139,255,0.8)', 0.5 + ch * 0.5);
      break;
    }
    case 'brute': { // cracked bass-clef golem
      ctx.rotate(Math.sin(t * 2 + e.seed) * 0.08);
      const g = ctx.createLinearGradient(-e.r, -e.r, e.r, e.r);
      g.addColorStop(0, flash ? '#ffffff' : '#d8632e');
      g.addColorStop(1, flash ? '#ffffff' : '#4c1a08');
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rr = e.r * (i % 2 ? 0.85 : 1.05);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,160,90,0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // molten cracks
      ctx.strokeStyle = 'rgba(255,220,120,0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-e.r * 0.5, -e.r * 0.4);
      ctx.lineTo(-e.r * 0.1, 0);
      ctx.lineTo(-e.r * 0.4, e.r * 0.5);
      ctx.moveTo(e.r * 0.5, -e.r * 0.3);
      ctx.lineTo(e.r * 0.15, e.r * 0.2);
      ctx.stroke();
      ART.glow(ctx, 0, 0, e.r * 0.8, 'rgba(255,140,60,0.5)', 0.5);
      break;
    }
    case 'boss': { // the Maestro of Discord
      ctx.rotate(Math.sin(t * 1.2) * 0.05);
      // rotating outer halo of broken staves
      ctx.save();
      ctx.rotate(t * 0.5);
      ctx.strokeStyle = 'rgba(255,94,138,0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(0, 0, e.r + 16, a, a + 0.6);
        ctx.stroke();
      }
      ctx.restore();
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, e.r);
      g.addColorStop(0, flash ? '#ffffff' : '#ffb0c8');
      g.addColorStop(0.4, flash ? '#ffffff' : '#c22a5e');
      g.addColorStop(1, flash ? '#ffffff' : '#40081e');
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + Math.sin(t * 3 + i) * 0.06;
        const rr = e.r * (i % 2 ? 0.8 : 1.08);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,140,180,0.9)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // central discord eye
      ctx.fillStyle = '#1a0410';
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff8ab0';
      ctx.beginPath();
      ctx.arc(0, 0, e.r * (0.15 + 0.05 * Math.sin(t * 5)), 0, Math.PI * 2);
      ctx.fill();
      ART.glow(ctx, 0, 0, e.r * 1.3, 'rgba(255,60,120,0.55)', 0.6);
      break;
    }
  }

  // debuff markers orbiting the enemy
  let di = 0;
  const marks = [];
  if (e.debuffs.tear > 0) marks.push('#7df0ff');
  if (e.debuffs.blast > 0) marks.push('#ffb35e');
  if (e.debuffs.resonance > 0) marks.push('#c98bff');
  if (e.debuffs.burn > 0) marks.push('#ff6a5e');
  if (e.debuffs.freeze > 0) marks.push('#9fd8ff');
  for (const col of marks) {
    const a = t * 2.4 + (di / Math.max(1, marks.length)) * Math.PI * 2;
    const mx = Math.cos(a) * (e.r + 9);
    const my = Math.sin(a) * (e.r + 9) * 0.5 - e.r * 0.7;
    ctx.fillStyle = col;
    ctx.globalCompositeOperation = 'lighter';
    ctx.font = '11px serif';
    ctx.fillText('♪', mx, my);
    ctx.globalCompositeOperation = 'source-over';
    di++;
  }

  // frozen crystal shell
  if (frozen) {
    ctx.strokeStyle = 'rgba(190,230,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * (e.r + 4), Math.sin(a) * (e.r + 4));
    }
    ctx.closePath();
    ctx.stroke();
  }

  // hp bar for damaged enemies
  if (e.hp < e.maxHp) {
    const bw = e.r * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-bw / 2, -e.r - 12, bw, 3.4);
    ctx.fillStyle = e.type === 'boss' ? '#ff5e8a' : '#ffd77e';
    ctx.fillRect(-bw / 2, -e.r - 12, bw * Math.max(0, e.hp / e.maxHp), 3.4);
  }
  ctx.restore();
};
