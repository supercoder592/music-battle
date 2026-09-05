/* ── Instrument arsenal + combat VFX ─────────────────────────────────
   The proposal's mapping: trumpet = shotgun, snare = SMG,
   trombone = sniper, tuba = rocket launcher. View models are built
   from primitives with PBR-ish metals so they read as real brass. */

const GOLD = new THREE.MeshStandardMaterial({ color: 0xc9982f, roughness: 0.28, metalness: 0.95 });
const GOLD_DARK = new THREE.MeshStandardMaterial({ color: 0x8a6418, roughness: 0.4, metalness: 0.9 });
const SILVER = new THREE.MeshStandardMaterial({ color: 0xb9c0cc, roughness: 0.3, metalness: 0.95 });
const GRIP = new THREE.MeshStandardMaterial({ color: 0x1c1d24, roughness: 0.85, metalness: 0.1 });
const DRUMSKIN = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.85, metalness: 0 });
const DRUMSHELL = new THREE.MeshStandardMaterial({ color: 0x7a2030, roughness: 0.5, metalness: 0.35 });

/* The proposal's complete arsenal (企劃書全武器表):
   小號=霰彈 小鼓=衝鋒 手風琴=加特林 長號=狙擊 低音號=火箭
   大鼓=震盪砲(360°擊退/地形殺) 小提琴=空氣刃(牆面反彈)
   三角鐵=副武手槍 沙鈴=副武近戰 (號角勾索 = E 鍵機動工具) */
const WEAPONS = [
  {
    id: 'trumpet', name: 'TRUMPET SCATTERHORN', icon: '🎺',
    mode: 'hitscan', pellets: 8, dmg: 11, spread: 0.055, rate: 0.95,
    mag: 6, reload: 1.6, range: 42, kick: 0.055, auto: false,
    sfx: () => AUDIO.trumpetShot(), tracerColor: 0xffc24d,
  },
  {
    id: 'snare', name: 'SNARE RATTLER SMG', icon: '🥁',
    mode: 'hitscan', pellets: 1, dmg: 9, spread: 0.03, rate: 0.115,
    mag: 32, reload: 1.7, range: 70, kick: 0.014, auto: true,
    sfx: () => AUDIO.smgShot(), tracerColor: 0x3de8ff,
  },
  {
    id: 'accordion', name: 'ACCORDION GATLING', icon: '🪗',
    mode: 'hitscan', pellets: 1, dmg: 6, spread: 0.045, rate: 0.07,
    mag: 60, reload: 2.6, range: 55, kick: 0.01, auto: true,
    sfx: () => AUDIO.accordionShot(), tracerColor: 0x7dff8a,
  },
  {
    id: 'trombone', name: 'TROMBONE LONGSHOT', icon: '📯',
    mode: 'hitscan', pellets: 1, dmg: 85, spread: 0.0012, rate: 1.35,
    mag: 4, reload: 2.3, range: 200, kick: 0.09, auto: false, zoom: true,
    sfx: () => AUDIO.sniperShot(), tracerColor: 0xff3da0,
  },
  {
    id: 'tuba', name: 'TUBA THUMPCANNON', icon: '🎷',
    mode: 'projectile', kind: 'rocket', dmg: 78, splash: 6.5, speed: 34, kbMult: 1,
    rate: 1.4, mag: 3, reload: 2.4, kick: 0.12, auto: false,
    sfx: () => AUDIO.rocketLaunch(), tracerColor: 0xff8a4d,
  },
  {
    id: 'bassdrum', name: 'BASS DRUM QUAKEMAKER', icon: '🪘',
    mode: 'projectile', kind: 'shock', dmg: 30, splash: 8.5, speed: 19, kbMult: 3.2,
    rate: 1.7, mag: 2, reload: 2.3, kick: 0.16, auto: false,
    sfx: () => AUDIO.bassDrumShot(), tracerColor: 0xb78bff,
  },
  {
    id: 'violin', name: 'VIOLIN AIRCUTTER', icon: '🎻',
    mode: 'projectile', kind: 'blade', dmg: 34, speed: 44, bounces: 3,
    rate: 0.7, mag: 8, reload: 1.9, kick: 0.05, auto: false,
    sfx: () => AUDIO.violinShot(), tracerColor: 0x9fe8ff,
  },
  {
    id: 'triangle', name: 'TRIANGLE SIDEARM', icon: '🔺',
    mode: 'hitscan', pellets: 1, dmg: 20, spread: 0.008, rate: 0.34,
    mag: 12, reload: 1.1, range: 80, kick: 0.03, auto: false,
    sfx: () => AUDIO.trianglePing(), tracerColor: 0xf4f7ff,
  },
  {
    id: 'maracas', name: 'MARACAS BREAKERS', icon: '🪇',
    mode: 'melee', dmg: 45, range: 3.4, rate: 0.5,
    mag: Infinity, reload: 0, kick: 0.09, auto: false,
    sfx: () => AUDIO.maracasShake(), tracerColor: 0xffb35e,
  },
];

/* ── view models (attached to the camera) ── */
const VIEWMODELS = {};

VIEWMODELS.trumpet = function () {
  const g = new THREE.Group();
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.5, 12), GOLD);
  pipe.rotation.x = Math.PI / 2;
  g.add(pipe);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.03, 0.2, 16, 1, true), GOLD);
  bell.rotation.x = -Math.PI / 2;
  bell.position.z = -0.33;
  g.add(bell);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.012, 8, 20), GOLD_DARK);
  rim.position.z = -0.43;
  g.add(rim);
  for (let i = 0; i < 3; i++) {
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.1, 8), SILVER);
    valve.position.set(0, 0.06, -0.02 + i * 0.06);
    g.add(valve);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), GOLD_DARK);
    cap.position.set(0, 0.11, -0.02 + i * 0.06);
    g.add(cap);
  }
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.07), GRIP);
  grip.position.set(0, -0.08, 0.12);
  grip.rotation.x = 0.3;
  g.add(grip);
  return g;
};

VIEWMODELS.snare = function () {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.13, 18), DRUMSHELL);
  shell.rotation.x = Math.PI / 2;
  shell.position.z = -0.16;
  g.add(shell);
  const skin = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.006, 18), DRUMSKIN);
  skin.rotation.x = Math.PI / 2;
  skin.position.z = -0.23;
  g.add(skin);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.1), SILVER);
    lug.position.set(Math.cos(a) * 0.11, Math.sin(a) * 0.11, -0.16);
    g.add(lug);
  }
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 10), SILVER);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -0.36;
  g.add(barrel);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.07), GRIP);
  grip.position.set(0, -0.12, 0.02);
  grip.rotation.x = 0.25;
  g.add(grip);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 0.2), GRIP);
  stock.position.set(0, -0.03, 0.16);
  g.add(stock);
  return g;
};

VIEWMODELS.trombone = function () {
  const g = new THREE.Group();
  // long slide tubes
  for (const dy of [-0.022, 0.022]) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.85, 10), GOLD);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, dy, -0.2);
    g.add(tube);
  }
  const slideEnd = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.013, 8, 14), GOLD_DARK);
  slideEnd.rotation.y = Math.PI / 2;
  slideEnd.position.set(0, 0, -0.63);
  g.add(slideEnd);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.03, 0.34, 18, 1, true), GOLD);
  bell.rotation.x = -Math.PI / 2;
  bell.position.set(0, 0.1, -0.42);
  g.add(bell);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.013, 8, 22), GOLD_DARK);
  rim.position.set(0, 0.1, -0.59);
  g.add(rim);
  // scope
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 10), GRIP);
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0, 0.085, -0.02);
  g.add(scope);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.005, 10), new THREE.MeshBasicMaterial({ color: 0x7de8ff }));
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0.085, -0.1);
  g.add(lens);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.07), GRIP);
  grip.position.set(0, -0.1, 0.06);
  grip.rotation.x = 0.28;
  g.add(grip);
  return g;
};

VIEWMODELS.tuba = function () {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.4, 14), GOLD);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.12;
  g.add(body);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.09, 0.3, 18, 1, true), GOLD);
  bell.rotation.x = -Math.PI / 2;
  bell.position.z = -0.44;
  g.add(bell);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 24), GOLD_DARK);
  rim.position.z = -0.59;
  g.add(rim);
  // wrap tube
  const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 18, Math.PI * 1.4), GOLD_DARK);
  wrap.rotation.y = Math.PI / 2;
  wrap.position.set(0.02, 0.02, 0.05);
  g.add(wrap);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.08), GRIP);
  grip.position.set(0, -0.14, 0.04);
  grip.rotation.x = 0.3;
  g.add(grip);
  // loaded rocket peeking out
  const rocket = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0x8a2030, roughness: 0.5, metalness: 0.4 }));
  rocket.rotation.x = -Math.PI / 2;
  rocket.position.z = -0.5;
  g.add(rocket);
  return g;
};

VIEWMODELS.accordion = function () {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6a1c22, roughness: 0.5, metalness: 0.2 });
  const endA = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.1), woodMat);
  endA.position.z = 0.06;
  g.add(endA);
  const endB = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.1), woodMat);
  endB.position.z = -0.24;
  g.add(endB);
  // bellows pleats
  for (let i = 0; i < 6; i++) {
    const pleat = new THREE.Mesh(
      new THREE.BoxGeometry(0.17 + (i % 2) * 0.03, 0.21 + (i % 2) * 0.03, 0.036),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0x1c1d24 : 0xd8d4c8, roughness: 0.9 })
    );
    pleat.position.z = -0.03 - i * 0.032;
    g.add(pleat);
  }
  // keys
  for (let i = 0; i < 4; i++) {
    const key = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0xf4f7ff }));
    key.position.set(0.11, 0.05 - i * 0.045, 0.06);
    g.add(key);
  }
  // barrel cluster (gatling mouth)
  for (const [dx, dy] of [[0, 0.03], [-0.026, -0.02], [0.026, -0.02]]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 8), SILVER);
    b.rotation.x = Math.PI / 2;
    b.position.set(dx, dy, -0.36);
    g.add(b);
  }
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.07), GRIP);
  grip.position.set(0, -0.18, 0);
  g.add(grip);
  return g;
};

VIEWMODELS.bassdrum = function () {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.16, 22), DRUMSHELL);
  shell.rotation.x = Math.PI / 2;
  shell.position.z = -0.22;
  g.add(shell);
  const skin = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.008, 22), DRUMSKIN);
  skin.rotation.x = Math.PI / 2;
  skin.position.z = -0.31;
  g.add(skin);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.016, 8, 26), GOLD_DARK);
  rim.position.z = -0.31;
  g.add(rim);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.14), GOLD);
    lug.position.set(Math.cos(a) * 0.19, Math.sin(a) * 0.19, -0.22);
    g.add(lug);
  }
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.15, 0.08), GRIP);
  grip.position.set(0, -0.2, -0.02);
  g.add(grip);
  const beater = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), GRIP);
  beater.rotation.z = 0.6;
  beater.position.set(0.12, 0.12, -0.1);
  g.add(beater);
  const beaterHead = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), DRUMSKIN);
  beaterHead.position.set(0.17, 0.2, -0.1);
  g.add(beaterHead);
  return g;
};

VIEWMODELS.violin = function () {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a3418, roughness: 0.4, metalness: 0.15 });
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.055, 18), woodMat);
  lower.rotation.x = Math.PI / 2;
  lower.position.z = -0.1;
  lower.scale.x = 0.82;
  g.add(lower);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.055, 18), woodMat);
  upper.rotation.x = Math.PI / 2;
  upper.position.z = -0.23;
  upper.scale.x = 0.82;
  g.add(upper);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.02, 0.24), GRIP);
  neck.position.set(0, 0.012, -0.4);
  g.add(neck);
  const scroll = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), woodMat);
  scroll.position.set(0, 0.02, -0.52);
  g.add(scroll);
  // energy strings
  for (let i = -1; i <= 2; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.0028, 0.0028, 0.42), new THREE.MeshBasicMaterial({ color: 0x9fe8ff }));
    s.position.set(i * 0.007 - 0.0035, 0.033, -0.3);
    g.add(s);
  }
  // energy bow across, ready to slash
  const bow = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.008, 0.008), new THREE.MeshBasicMaterial({ color: 0xcaf4ff }));
  bow.position.set(0, 0.05, -0.16);
  bow.rotation.z = 0.18;
  g.add(bow);
  return g;
};

VIEWMODELS.triangle = function () {
  const g = new THREE.Group();
  const s = 0.14;
  const bar = (x1, y1, x2, y2) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, len, 8), SILVER);
    m.position.set((x1 + x2) / 2, (y1 + y2) / 2, -0.2);
    m.rotation.z = Math.atan2(x2 - x1, y2 - y1);
    g.add(m);
  };
  bar(-s, -s * 0.7, 0, s);        // left side
  bar(0, s, s, -s * 0.7);         // right side
  bar(-s + 0.03, -s * 0.7, s, -s * 0.7); // bottom (open corner)
  const beater = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 8), SILVER);
  beater.rotation.x = 0.9;
  beater.position.set(0.06, -0.06, -0.08);
  g.add(beater);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), GRIP);
  grip.position.set(0, -0.2, -0.06);
  g.add(grip);
  return g;
};

VIEWMODELS.maracas = function () {
  const g = new THREE.Group();
  const gourd = new THREE.MeshStandardMaterial({ color: 0x7a3f14, roughness: 0.5, metalness: 0.15 });
  for (const [dx, rot] of [[-0.07, 0.25], [0.09, -0.2]]) {
    const grp = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), gourd);
    head.scale.set(1, 1.25, 1);
    head.position.y = 0.1;
    grp.add(head);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.16, 8), GRIP);
    handle.position.y = -0.06;
    grp.add(handle);
    // gold band
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.008, 6, 14), GOLD);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.04;
    grp.add(band);
    grp.position.set(dx, -0.08, -0.16);
    grp.rotation.z = rot;
    g.add(grp);
  }
  return g;
};

/* ── VFX: tracers, sparks, explosions, muzzle flash ── */
const VFX = {
  tracers: [], sparks: [], lights: [], rockets: [],

  init(scene) {
    this.scene = scene;
    this.sparkTex = WORLD._glowSprite();
    // drop anything still attached to a previous scene
    this.tracers = []; this.sparks = []; this.lights = []; this.rockets = [];
  },

  tracer(from, to, color) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 0.5) return;
    const geo = new THREE.BoxGeometry(0.025, 0.025, len);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(from).addScaledVector(dir, 0.5);
    m.lookAt(to);
    this.scene.add(m);
    this.tracers.push({ mesh: m, life: 0.09, maxLife: 0.09 });
  },

  spark(pos, color, n = 8, speed = 7) {
    for (let i = 0; i < n; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.sparkTex, color, transparent: true, opacity: 1,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      sp.position.copy(pos);
      sp.scale.setScalar(0.14 + Math.random() * 0.14);
      const v = new THREE.Vector3((Math.random() - 0.5), Math.random() * 0.8, (Math.random() - 0.5)).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.6));
      this.scene.add(sp);
      this.sparks.push({ sp, v, life: 0.4 + Math.random() * 0.25, maxLife: 0.6, g: 14 });
    }
  },

  noteBurst(pos, color, n = 4) {
    // little musical glyph sprites floating up — kills stay on theme
    for (let i = 0; i < n; i++) {
      const [c, x] = [document.createElement('canvas'), null];
      c.width = c.height = 48;
      const cx = c.getContext('2d');
      cx.font = '34px serif';
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.shadowColor = '#fff'; cx.shadowBlur = 8;
      cx.fillStyle = '#ffffff';
      cx.fillText(['♪', '♫', '♩'][i % 3], 24, 26);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color, transparent: true, depthWrite: false }));
      sp.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.5, (Math.random() - 0.5) * 0.8));
      sp.scale.setScalar(0.5);
      const v = new THREE.Vector3((Math.random() - 0.5) * 1.4, 2.2 + Math.random(), (Math.random() - 0.5) * 1.4);
      this.scene.add(sp);
      this.sparks.push({ sp, v, life: 0.9, maxLife: 0.9, g: 0 });
    }
  },

  flash(pos, color, intensity = 2.2, dist = 9) {
    const l = new THREE.PointLight(color, intensity, dist, 2);
    l.position.copy(pos);
    this.scene.add(l);
    this.lights.push({ l, life: 0.07 });
  },

  ring(pos, color, maxR = 5) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.6, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    m.position.copy(pos);
    m.position.y = Math.max(0.12, pos.y);
    m.rotation.x = -Math.PI / 2;
    this.scene.add(m);
    this.tracers.push({ mesh: m, life: 0.4, maxLife: 0.4, grow: maxR });
  },

  explosion(pos) {
    this.flash(pos, 0xffa050, 6, 20);
    this.spark(pos, 0xffc24d, 22, 12);
    this.spark(pos, 0xff5030, 14, 8);
    this.ring(pos, 0xffa050, 9);
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex, color: 0xff9040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    fire.position.copy(pos);
    fire.scale.setScalar(2);
    this.scene.add(fire);
    this.sparks.push({ sp: fire, v: new THREE.Vector3(0, 1.5, 0), life: 0.35, maxLife: 0.35, g: 0, grow: 12 });
  },

  /* one spawner for all three projectile instruments */
  spawnProjectile(wIdx, origin, dir, ownerId) {
    const w = WEAPONS[wIdx];
    const g = new THREE.Group();
    if (w.kind === 'rocket') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.34, 10), new THREE.MeshStandardMaterial({ color: 0x8a2030, roughness: 0.5, metalness: 0.4 }));
      body.rotation.x = Math.PI / 2;
      g.add(body);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 10), GOLD_DARK);
      tip.rotation.x = -Math.PI / 2;
      tip.position.z = -0.25;
      g.add(tip);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex, color: 0xffa050, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.setScalar(0.9);
      glow.position.z = 0.3;
      g.add(glow);
      g.add(new THREE.PointLight(0xff8040, 1.4, 10, 2));
    } else if (w.kind === 'shock') {
      // bass-drum shockwave orb: heavy purple pulse
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), new THREE.MeshBasicMaterial({ color: 0xd8c2ff }));
      g.add(core);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 8, 20), new THREE.MeshBasicMaterial({ color: 0xb78bff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
      g.add(ring);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex, color: 0xb78bff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.setScalar(1.6);
      g.add(glow);
      g.add(new THREE.PointLight(0xb78bff, 1.6, 12, 2));
      g.userData.spinRing = ring;
    } else { // blade — violin air cutter, bounces off walls
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 20, Math.PI * 1.1), new THREE.MeshBasicMaterial({ color: 0xcaf4ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
      g.add(arc);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex, color: 0x9fe8ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.setScalar(1.1);
      g.add(glow);
      g.userData.spinRing = arc;
    }
    g.position.copy(origin);
    g.lookAt(origin.clone().add(dir));
    this.scene.add(g);
    this.rockets.push({
      mesh: g, vel: dir.clone().multiplyScalar(w.speed), life: 5,
      ownerId, w: wIdx, kind: w.kind,
      bounces: w.bounces || 0, hitSet: new Set(),
    });
  },

  update(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      const a = t.life / t.maxLife;
      t.mesh.material.opacity = a * 0.9;
      if (t.grow) {
        const s = 1 + (1 - a) * t.grow;
        t.mesh.scale.set(s, s, s);
      }
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        t.mesh.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.v.y -= (s.g || 0) * dt;
      s.sp.position.addScaledVector(s.v, dt);
      const a = Math.max(0, s.life / s.maxLife);
      s.sp.material.opacity = a;
      if (s.grow) s.sp.scale.setScalar(2 + (1 - a) * s.grow);
      if (s.life <= 0) {
        this.scene.remove(s.sp);
        s.sp.material.dispose();
        this.sparks.splice(i, 1);
      }
    }
    for (let i = this.lights.length - 1; i >= 0; i--) {
      const l = this.lights[i];
      l.life -= dt;
      l.l.intensity *= 0.8;
      if (l.life <= 0) {
        this.scene.remove(l.l);
        this.lights.splice(i, 1);
      }
    }
  },
};
