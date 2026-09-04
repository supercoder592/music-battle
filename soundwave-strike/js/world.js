/* ── World: night-city combat yard ───────────────────────────────────
   Grounded, CS-style environment art built procedurally: asphalt and
   concrete with baked grime, ribbed shipping containers, metal crates,
   sodium work lights, real-time shadows, rain — neon signage kept as
   accent so the space still reads as the Soundwave Strike skybridge
   district. All cover is AABB-collidable with step-up, so stairs,
   crates and container tops are all playable space. */

const WORLD = {};

/* ── procedural textures ── */
WORLD.tex = {};

function _canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function _noise(x, c, w, h, alpha, n = 900) {
  for (let i = 0; i < n; i++) {
    const g = Math.random() * 255 | 0;
    x.fillStyle = `rgba(${g},${g},${g},${alpha})`;
    x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

WORLD.makeTextures = function () {
  const T = WORLD.tex;

  // asphalt: near-black with grime, patch seams, faint markings
  {
    const [c, x] = _canvas(512, 512);
    x.fillStyle = '#0d0e12'; x.fillRect(0, 0, 512, 512);
    _noise(x, x, 512, 512, 0.04, 4000);
    for (let i = 0; i < 26; i++) { // cracks
      x.strokeStyle = `rgba(6,7,9,${0.3 + Math.random() * 0.4})`;
      x.lineWidth = 1 + Math.random();
      x.beginPath();
      let px = Math.random() * 512, py = Math.random() * 512;
      x.moveTo(px, py);
      for (let s = 0; s < 5; s++) { px += (Math.random() - 0.5) * 70; py += (Math.random() - 0.5) * 70; x.lineTo(px, py); }
      x.stroke();
    }
    for (let i = 0; i < 8; i++) { // oil stains
      const g = x.createRadialGradient(Math.random() * 512, Math.random() * 512, 2, Math.random() * 512, Math.random() * 512, 30 + Math.random() * 50);
      g.addColorStop(0, 'rgba(5,6,10,0.5)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 512, 512);
    }
    T.asphalt = new THREE.CanvasTexture(c);
    T.asphalt.wrapS = T.asphalt.wrapT = THREE.RepeatWrapping;
    T.asphalt.repeat.set(10, 10);
  }

  // concrete: grey panels with seams and streaks
  {
    const [c, x] = _canvas(512, 512);
    x.fillStyle = '#232529'; x.fillRect(0, 0, 512, 512);
    _noise(x, x, 512, 512, 0.05, 3200);
    x.strokeStyle = 'rgba(18,19,22,0.55)';
    x.lineWidth = 3;
    for (let i = 0; i <= 2; i++) { // panel seams
      x.beginPath(); x.moveTo(i * 256, 0); x.lineTo(i * 256, 512); x.stroke();
      x.beginPath(); x.moveTo(0, i * 256); x.lineTo(512, i * 256); x.stroke();
    }
    for (let i = 0; i < 20; i++) { // rain streaks
      const sx = Math.random() * 512;
      const g = x.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, 'rgba(20,22,26,0.25)');
      g.addColorStop(1, 'rgba(20,22,26,0)');
      x.fillStyle = g;
      x.fillRect(sx, 0, 3 + Math.random() * 8, 512);
    }
    // grime at bottom
    const bg = x.createLinearGradient(0, 512, 0, 340);
    bg.addColorStop(0, 'rgba(12,13,15,0.6)');
    bg.addColorStop(1, 'rgba(12,13,15,0)');
    x.fillStyle = bg; x.fillRect(0, 340, 512, 172);
    T.concrete = new THREE.CanvasTexture(c);
    T.concrete.wrapS = T.concrete.wrapT = THREE.RepeatWrapping;
  }

  // container side: ribbed corrugation with wear + stencil
  T.container = (colA, colB, label) => {
    const [c, x] = _canvas(512, 256);
    x.fillStyle = colA; x.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 26; i++) { // vertical corrugation
      const rx = i * 20;
      const g = x.createLinearGradient(rx, 0, rx + 20, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.42)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.10)');
      g.addColorStop(0.65, colB);
      g.addColorStop(1, 'rgba(0,0,0,0.36)');
      x.fillStyle = g;
      x.fillRect(rx, 0, 20, 256);
    }
    _noise(x, x, 512, 256, 0.06, 1500);
    for (let i = 0; i < 14; i++) { // rust patches
      const g = x.createRadialGradient(Math.random() * 512, Math.random() * 256, 1, Math.random() * 512, Math.random() * 256, 12 + Math.random() * 26);
      g.addColorStop(0, 'rgba(72,44,26,0.5)');
      g.addColorStop(1, 'rgba(72,44,26,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 512, 256);
    }
    x.font = '700 44px "Bai Jamjuree", sans-serif';
    x.fillStyle = 'rgba(230,230,230,0.5)';
    x.fillText(label, 30, 70);
    x.font = '700 20px monospace';
    x.fillStyle = 'rgba(230,230,230,0.4)';
    x.fillText('MAX GROSS 30,480 KG', 30, 226);
    const t = new THREE.CanvasTexture(c);
    return t;
  };

  // metal crate
  {
    const [c, x] = _canvas(256, 256);
    x.fillStyle = '#4b4f56'; x.fillRect(0, 0, 256, 256);
    _noise(x, x, 256, 256, 0.07, 900);
    x.strokeStyle = 'rgba(15,16,20,0.8)'; x.lineWidth = 10;
    x.strokeRect(5, 5, 246, 246);
    x.strokeStyle = 'rgba(120,126,138,0.5)'; x.lineWidth = 3;
    x.strokeRect(12, 12, 232, 232);
    x.beginPath(); x.moveTo(12, 12); x.lineTo(244, 244); x.moveTo(244, 12); x.lineTo(12, 244); x.stroke();
    for (const [rx, ry] of [[22, 22], [234, 22], [22, 234], [234, 234]]) {
      x.fillStyle = '#20232a';
      x.beginPath(); x.arc(rx, ry, 6, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(200,205,220,0.5)';
      x.beginPath(); x.arc(rx - 1.5, ry - 1.5, 2.4, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = 'rgba(255,180,40,0.55)';
    x.font = '700 26px "Bai Jamjuree", sans-serif';
    x.textAlign = 'center';
    x.fillText('AMP-CRATE', 128, 140);
    T.crate = new THREE.CanvasTexture(c);
  }

  // building facade with lit windows (for the skyline)
  T.facade = (glowChance) => {
    const [c, x] = _canvas(128, 256);
    x.fillStyle = '#0b0e16'; x.fillRect(0, 0, 128, 256);
    for (let wy = 8; wy < 250; wy += 18) {
      for (let wx = 8; wx < 122; wx += 16) {
        const lit = Math.random() < glowChance;
        if (lit) {
          const warm = Math.random() < 0.6;
          x.fillStyle = warm ? `rgba(235,${170 + Math.random() * 40 | 0},105,${0.3 + Math.random() * 0.35})` : `rgba(130,185,235,${0.25 + Math.random() * 0.3})`;
        } else x.fillStyle = 'rgba(16,19,28,0.9)';
        x.fillRect(wx, wy, 9, 11);
      }
    }
    const t = new THREE.CanvasTexture(c);
    return t;
  };

  // neon sign
  T.neon = (text, color, vertical = false) => {
    const w = vertical ? 128 : 512, h = vertical ? 512 : 128;
    const [c, x] = _canvas(w, h);
    x.fillStyle = 'rgba(6,7,12,0.92)'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(60,65,90,0.8)'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6);
    x.shadowColor = color; x.shadowBlur = 26;
    x.fillStyle = color;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (vertical) {
      x.font = '700 72px "Bai Jamjuree", sans-serif';
      const chars = [...text];
      chars.forEach((ch, i) => x.fillText(ch, w / 2, (i + 0.5) * (h / chars.length)));
    } else {
      x.font = '700 76px "Bai Jamjuree", sans-serif';
      x.fillText(text, w / 2, h / 2 + 4);
    }
    return new THREE.CanvasTexture(c);
  };

  // sky: night gradient with horizon glow
  {
    const [c, x] = _canvas(1024, 512);
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#010208');
    g.addColorStop(0.55, '#05070f');
    g.addColorStop(0.8, '#100a1e');
    g.addColorStop(1, '#241026');
    x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 160; i++) {
      x.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`;
      x.fillRect(Math.random() * 1024, Math.random() * 300, 1, 1);
    }
    // low cloud band
    for (let i = 0; i < 10; i++) {
      const cg = x.createRadialGradient(Math.random() * 1024, 380 + Math.random() * 60, 5, Math.random() * 1024, 380 + Math.random() * 60, 120);
      cg.addColorStop(0, 'rgba(70,40,90,0.16)');
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = cg; x.fillRect(0, 0, 1024, 512);
    }
    T.sky = new THREE.CanvasTexture(c);
  }
};

/* ── map construction ── */
WORLD.build = function (scene) {
  WORLD.makeTextures();
  const T = WORLD.tex;
  const colliders = [];
  const solids = [];   // meshes that block hitscan
  const dynamic = { eq: [], signs: [], padGlow: [] };

  scene.fog = new THREE.FogExp2(0x0a0c16, 0.016);

  // ── lighting ──
  scene.add(new THREE.HemisphereLight(0x232f4a, 0x07070c, 0.32));
  const moon = new THREE.DirectionalLight(0x8fa8de, 0.42);
  moon.position.set(-40, 70, -25);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -70; moon.shadow.camera.right = 70;
  moon.shadow.camera.top = 70; moon.shadow.camera.bottom = -70;
  moon.shadow.camera.far = 220;
  moon.shadow.bias = -0.0006;
  scene.add(moon);

  // sky dome
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 24, 16),
    new THREE.MeshBasicMaterial({ map: T.sky, side: THREE.BackSide, fog: false })
  );
  scene.add(sky);

  const mat = {
    asphalt: new THREE.MeshStandardMaterial({ map: T.asphalt, roughness: 0.94, metalness: 0.05 }),
    concrete: new THREE.MeshStandardMaterial({ map: T.concrete, roughness: 0.9, metalness: 0.02 }),
    crate: new THREE.MeshStandardMaterial({ map: T.crate, roughness: 0.6, metalness: 0.55 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x15171d, roughness: 0.9 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.45, metalness: 0.8 }),
  };

  // ── floor ──
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), mat.asphalt);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  solids.push(floor);

  // wet-street sheen: faint reflective plane additively mixed
  const sheen = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshBasicMaterial({ color: 0x141d36, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  sheen.rotation.x = -Math.PI / 2;
  sheen.position.y = 0.01;
  scene.add(sheen);

  const S = 46; // arena half-size

  function addBox(x, y, z, w, h, d, material, { collide = true, shadow = true, rotY = 0 } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y + h / 2, z);
    m.rotation.y = rotY;
    if (shadow) { m.castShadow = true; m.receiveShadow = true; }
    scene.add(m);
    solids.push(m);
    if (collide) {
      // AABB — rotated boxes get a conservative bound
      const cw = Math.abs(Math.cos(rotY)) * w + Math.abs(Math.sin(rotY)) * d;
      const cd = Math.abs(Math.sin(rotY)) * w + Math.abs(Math.cos(rotY)) * d;
      colliders.push({ minX: x - cw / 2, maxX: x + cw / 2, minY: y, maxY: y + h, minZ: z - cd / 2, maxZ: z + cd / 2 });
    }
    return m;
  }

  // ── perimeter: concrete barrier walls ──
  mat.concrete.map = T.concrete;
  for (const [x, z, w, d] of [
    [0, -S - 1, S * 2 + 6, 2], [0, S + 1, S * 2 + 6, 2],
    [-S - 1, 0, 2, S * 2 + 6], [S + 1, 0, 2, S * 2 + 6],
  ]) {
    const wall = addBox(x, 0, z, w, 7, d, mat.concrete);
    wall.material = mat.concrete;
  }

  // ── central raised platform with stairs (site A vibe) ──
  addBox(0, 0, 0, 16, 2.4, 16, mat.concrete);
  // stairs on +x and -x: three steps
  for (let s = 0; s < 3; s++) {
    addBox(9.6 + s * 1.6, 0, 0, 1.6, 1.8 - s * 0.6, 6, mat.concrete);
    addBox(-9.6 - s * 1.6, 0, 0, 1.6, 1.8 - s * 0.6, 6, mat.concrete);
  }
  // platform cover crates
  addBox(-4, 2.4, -4, 2.2, 2.2, 2.2, mat.crate);
  addBox(4.5, 2.4, 3.5, 2.2, 2.2, 2.2, mat.crate);

  // ── shipping containers: lanes & double-stacks ──
  const contMats = [
    ['#7a2e26', '#8d3a30', 'SOUNDWAVE LINE'],
    ['#274d63', '#2f5f7a', 'BASSPORT INTL'],
    ['#57552c', '#6a6836', 'RHYTHM CARGO'],
    ['#42304f', '#523c62', '樂浪貨運'],
  ].map(([a, b, l]) => new THREE.MeshStandardMaterial({ map: T.container(a, b, l), roughness: 0.65, metalness: 0.4 }));

  function container(x, z, rotY, mi, stacked = false) {
    addBox(x, 0, z, 12.2, 2.9, 3.05, contMats[mi % contMats.length], { rotY });
    if (stacked) addBox(x + (rotY ? 0 : 1.2), 2.9, z + (rotY ? 1.2 : 0), 12.2, 2.9, 3.05, contMats[(mi + 1) % contMats.length], { rotY });
  }
  container(-26, -18, 0, 0, true);
  container(24, -22, 0.18, 1);
  container(-22, 22, -0.1, 2);
  container(26, 18, Math.PI / 2, 3, true);
  container(2, -32, 0.06, 1);
  container(-4, 33, Math.PI / 2 + 0.1, 0);

  // ── crate clusters & low cover ──
  const crateSpots = [
    [-14, -6, 2.2], [-15.5, -8.2, 2.2], [-14.6, -7, 4.2],
    [16, 8, 2.2], [18.2, 8.6, 2.2],
    [-30, 6, 2.2], [34, -4, 2.2], [10, 24, 2.2], [-8, -24, 2.2],
    [36, 30, 2.2], [-36, -32, 2.2],
  ];
  for (const [x, z, s] of crateSpots) addBox(x, 0, z, s, s === 4.2 ? 2.2 : s, s === 4.2 ? 2.2 : s, mat.crate, { rotY: Math.random() * 0.4 });
  // jersey barriers
  for (const [x, z, r] of [[-8, 12, 0.3], [12, -12, -0.2], [22, 2, 1.4], [-24, -8, 1.7], [0, -18, 0.1], [4, 16, 1.2]]) {
    addBox(x, 0, z, 5.4, 1.25, 0.9, mat.concrete, { rotY: r });
  }

  // ── catwalk skybridge across the yard ──
  for (const px of [-19, 19]) addBox(px, 0, -37.5, 1.2, 6, 1.2, mat.steel); // support columns
  addBox(0, 6, -37.5, 42, 0.5, 3.4, mat.steel);            // deck
  addBox(0, 6.5, -39, 42, 1.0, 0.18, mat.steel, { collide: false }); // rails
  addBox(0, 6.5, -36, 42, 1.0, 0.18, mat.steel, { collide: false });
  // access stairs at both ends
  for (let s = 0; s < 10; s++) {
    addBox(-24.5 - s * 0.9, 0, -37.5, 0.9, 6 - s * 0.6, 3.2, mat.concrete);
    addBox(24.5 + s * 0.9, 0, -37.5, 0.9, 6 - s * 0.6, 3.2, mat.concrete);
  }

  // ── sonic jump pads (subtle industrial grates) ──
  const pads = [];
  function jumpPad(x, z) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.22, 20), mat.steel);
    base.position.set(x, 0.11, z);
    base.castShadow = base.receiveShadow = true;
    scene.add(base);
    const glow = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.25, 0.1, 20),
      new THREE.MeshBasicMaterial({ color: 0x3de8ff, transparent: true, opacity: 0.6 })
    );
    glow.position.set(x, 0.26, z);
    scene.add(glow);
    dynamic.padGlow.push(glow);
    pads.push({ x, z, r: 1.7 });
  }
  jumpPad(-19, -33.6);
  jumpPad(19, -33.6);
  jumpPad(30, 12); // boosts onto the tall container stack

  // ── work lights: sodium poles with warm pools ──
  const poleSpots = [[-30, -30], [30, -30], [-30, 30], [30, 30], [0, -12]];
  for (const [x, z] of poleSpots) {
    addBox(x, 0, z, 0.34, 8.4, 0.34, mat.dark);
    const arm = addBox(x + 0.9, 8.0, z, 1.9, 0.16, 0.16, mat.dark, { collide: false });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.24, 0.4), new THREE.MeshBasicMaterial({ color: 0xffc06a }));
    lamp.position.set(x + 1.8, 8.0, z);
    scene.add(lamp);
    const pl = new THREE.PointLight(0xff9d4d, 1.5, 30, 1.8);
    pl.position.set(x + 1.8, 7.6, z);
    scene.add(pl);
    // volumetric-ish glow sprite
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: WORLD._glowSprite(), color: 0xffb060, transparent: true, opacity: 0.35, depthWrite: false }));
    sp.scale.set(6, 6, 1);
    sp.position.set(x + 1.8, 7.8, z);
    scene.add(sp);
  }

  // ── skyline beyond the walls ──
  const rng = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < 26; i++) {
    const ang = (i / 26) * Math.PI * 2 + rng(-0.06, 0.06);
    const dist = rng(96, 170);
    const bw = rng(10, 26), bh = rng(24, 78), bd = rng(10, 22);
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(bw, bh, bd),
      new THREE.MeshBasicMaterial({ map: T.facade(rng(0.05, 0.18)) })
    );
    b.position.set(Math.cos(ang) * dist, bh / 2 - 2, Math.sin(ang) * dist);
    b.rotation.y = -ang;
    scene.add(b);
  }

  // ── neon accents on the perimeter walls ──
  const signs = [
    ['樂浪突擊', '#ff3da0', true], ['SOUNDWAVE', '#3de8ff', false],
    ['STRIKE', '#ffc24d', false], ['声波酒場', '#7dff8a', true],
    ['LIVE ♪', '#ff6a5e', false],
  ];
  const signSpots = [
    [-S - 0.9, 4.4, -20, Math.PI / 2], [10, 4.6, -S - 0.9, 0],
    [S + 0.9, 4.4, 14, -Math.PI / 2], [-18, 4.6, S + 0.9, Math.PI],
    [S + 0.9, 3.6, -26, -Math.PI / 2],
  ];
  signs.forEach(([txt, col, vert], i) => {
    const t = T.neon(txt, col, vert);
    const w = vert ? 1.6 : 7, h = vert ? 6 : 1.8;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: t, transparent: true })
    );
    const [x, y, z, ry] = signSpots[i];
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
    dynamic.signs.push({ mesh: m, phase: Math.random() * 10, col });
    const pl = new THREE.PointLight(new THREE.Color(col), 0.55, 14, 2);
    pl.position.set(x + Math.sin(ry) * 1.4, y, z + Math.cos(ry) * 1.4);
    scene.add(pl);
  });

  // ── equalizer tower: one animated billboard reacting to the music ──
  const eqGroup = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1, 1.1),
      new THREE.MeshBasicMaterial({ color: i < 5 ? 0x3de8ff : (i < 7 ? 0xffc24d : 0xff3da0) })
    );
    bar.position.x = (i - 4) * 1.7;
    eqGroup.add(bar);
    dynamic.eq.push(bar);
  }
  eqGroup.position.set(0, 9.5, -S - 1.2);
  scene.add(eqGroup);

  // ── rain ──
  const rainCount = 700;
  const rainGeo = new THREE.BufferGeometry();
  const rp = new Float32Array(rainCount * 6);
  const rainData = [];
  for (let i = 0; i < rainCount; i++) {
    const x = rng(-70, 70), y = rng(0, 40), z = rng(-70, 70);
    rp[i * 6] = x; rp[i * 6 + 1] = y; rp[i * 6 + 2] = z;
    rp[i * 6 + 3] = x; rp[i * 6 + 4] = y - 1.5; rp[i * 6 + 5] = z;
    rainData.push({ speed: rng(34, 48) });
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x46587e, transparent: true, opacity: 0.22 }));
  scene.add(rain);

  // ── spawns & nav points ──
  const spawns = [
    { x: -38, y: 0, z: -38 }, { x: 38, y: 0, z: -38 },
    { x: -38, y: 0, z: 38 }, { x: 38, y: 0, z: 38 },
    { x: 0, y: 0, z: -42 }, { x: 0, y: 0, z: 42 },
    { x: -40, y: 0, z: 0 }, { x: 40, y: 0, z: 0 },
    { x: 0, y: 6.5, z: -37.5 },
  ];
  const navPoints = [
    { x: 0, y: 2.4, z: 0 }, { x: -26, y: 0, z: -12 }, { x: 24, y: 0, z: -16 },
    { x: -22, y: 0, z: 16 }, { x: 26, y: 0, z: 24 }, { x: 0, y: 0, z: -24 },
    { x: 0, y: 0, z: 26 }, { x: -36, y: 0, z: 0 }, { x: 36, y: 0, z: 0 },
    { x: 12, y: 0, z: 12 }, { x: -12, y: 0, z: -14 }, { x: 18, y: 0, z: -30 },
    { x: -18, y: 0, z: 30 },
  ];

  return {
    colliders, solids, spawns, navPoints, pads,
    bounds: S,
    update(dt, time, beatPhase) {
      // rain fall
      const pos = rainGeo.attributes.position.array;
      for (let i = 0; i < rainCount; i++) {
        const fall = rainData[i].speed * dt;
        pos[i * 6 + 1] -= fall;
        pos[i * 6 + 4] -= fall;
        if (pos[i * 6 + 1] < 0) {
          const ny = rng(30, 42);
          pos[i * 6 + 1] = ny; pos[i * 6 + 4] = ny - 1.5;
          pos[i * 6] = pos[i * 6 + 3] = rng(-70, 70);
          pos[i * 6 + 2] = pos[i * 6 + 5] = rng(-70, 70);
        }
      }
      rainGeo.attributes.position.needsUpdate = true;

      // equalizer bars bounce on the beat
      const energy = 1 - beatPhase;
      dynamic.eq.forEach((bar, i) => {
        const h = 0.6 + Math.abs(Math.sin(time * 2.1 + i * 1.7)) * 2.6 * (0.35 + energy * 0.65);
        bar.scale.y = h;
        bar.position.y = h / 2;
      });

      // neon flicker
      for (const s of dynamic.signs) {
        const f = Math.sin(time * 13 + s.phase) + Math.sin(time * 29 + s.phase * 2);
        s.mesh.material.opacity = f < -1.82 ? 0.25 : 1;
      }
      // jump pad glow pulse
      for (const g of dynamic.padGlow) {
        g.material.opacity = 0.35 + energy * 0.45;
        g.scale.setScalar(1 + energy * 0.1);
      }
    },
  };
};

WORLD._glowSprite = function () {
  if (WORLD._glowTex) return WORLD._glowTex;
  const [c, x] = _canvas(64, 64);
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  WORLD._glowTex = new THREE.CanvasTexture(c);
  return WORLD._glowTex;
};
