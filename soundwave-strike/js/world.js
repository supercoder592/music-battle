/* ── Worlds ──────────────────────────────────────────────────────────
   Two arenas from the concept art:
   - mixer: "The Mixer" — rain-soaked neon cargo streets, BLUE/RED
     bases, a rotating vinyl deck on the central podium, BASS TRAP
     launch pads, the electric skybridge.
   - hall: "The Ring Concert Hall" — steampunk opera house. A golden
     conductor's podium floats over the Soundwave Precipice; two
     bridges cross the drop. Falling in is a terrain kill.
   All cover is AABB-collidable with step-up. */

const WORLD = {};

/* ── shared canvas-texture helpers ── */
function _canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function _noise(x, w, h, alpha, n = 900) {
  for (let i = 0; i < n; i++) {
    const g = Math.random() * 255 | 0;
    x.fillStyle = `rgba(${g},${g},${g},${alpha})`;
    x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

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

WORLD.tex = {};
WORLD.makeTextures = function () {
  const T = WORLD.tex;

  { // asphalt
    const [c, x] = _canvas(512, 512);
    x.fillStyle = '#0d0e12'; x.fillRect(0, 0, 512, 512);
    _noise(x, 512, 512, 0.04, 4000);
    for (let i = 0; i < 26; i++) {
      x.strokeStyle = `rgba(6,7,9,${0.3 + Math.random() * 0.4})`;
      x.lineWidth = 1 + Math.random();
      x.beginPath();
      let px = Math.random() * 512, py = Math.random() * 512;
      x.moveTo(px, py);
      for (let s = 0; s < 5; s++) { px += (Math.random() - 0.5) * 70; py += (Math.random() - 0.5) * 70; x.lineTo(px, py); }
      x.stroke();
    }
    for (let i = 0; i < 8; i++) {
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

  { // concrete
    const [c, x] = _canvas(512, 512);
    x.fillStyle = '#232529'; x.fillRect(0, 0, 512, 512);
    _noise(x, 512, 512, 0.05, 3200);
    x.strokeStyle = 'rgba(18,19,22,0.55)';
    x.lineWidth = 3;
    for (let i = 0; i <= 2; i++) {
      x.beginPath(); x.moveTo(i * 256, 0); x.lineTo(i * 256, 512); x.stroke();
      x.beginPath(); x.moveTo(0, i * 256); x.lineTo(512, i * 256); x.stroke();
    }
    for (let i = 0; i < 20; i++) {
      const sx = Math.random() * 512;
      const g = x.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, 'rgba(20,22,26,0.25)');
      g.addColorStop(1, 'rgba(20,22,26,0)');
      x.fillStyle = g;
      x.fillRect(sx, 0, 3 + Math.random() * 8, 512);
    }
    const bg = x.createLinearGradient(0, 512, 0, 340);
    bg.addColorStop(0, 'rgba(12,13,15,0.6)');
    bg.addColorStop(1, 'rgba(12,13,15,0)');
    x.fillStyle = bg; x.fillRect(0, 340, 512, 172);
    T.concrete = new THREE.CanvasTexture(c);
    T.concrete.wrapS = T.concrete.wrapT = THREE.RepeatWrapping;
  }

  T.container = (colA, colB, label) => {
    const [c, x] = _canvas(512, 256);
    x.fillStyle = colA; x.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 26; i++) {
      const rx = i * 20;
      const g = x.createLinearGradient(rx, 0, rx + 20, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.42)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.10)');
      g.addColorStop(0.65, colB);
      g.addColorStop(1, 'rgba(0,0,0,0.36)');
      x.fillStyle = g;
      x.fillRect(rx, 0, 20, 256);
    }
    _noise(x, 512, 256, 0.06, 1500);
    for (let i = 0; i < 14; i++) {
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
    return new THREE.CanvasTexture(c);
  };

  { // metal crate
    const [c, x] = _canvas(256, 256);
    x.fillStyle = '#4b4f56'; x.fillRect(0, 0, 256, 256);
    _noise(x, 256, 256, 0.07, 900);
    x.strokeStyle = 'rgba(15,16,20,0.8)'; x.lineWidth = 10;
    x.strokeRect(5, 5, 246, 246);
    x.strokeStyle = 'rgba(120,126,138,0.5)'; x.lineWidth = 3;
    x.strokeRect(12, 12, 232, 232);
    x.beginPath(); x.moveTo(12, 12); x.lineTo(244, 244); x.moveTo(244, 12); x.lineTo(12, 244); x.stroke();
    x.fillStyle = 'rgba(255,180,40,0.55)';
    x.font = '700 26px "Bai Jamjuree", sans-serif';
    x.textAlign = 'center';
    x.fillText('AMP-CRATE', 128, 140);
    T.crate = new THREE.CanvasTexture(c);
  }

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
    return new THREE.CanvasTexture(c);
  };

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

  { // night sky
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
    T.sky = new THREE.CanvasTexture(c);
  }

  { // vinyl record for the Mixer deck
    const [c, x] = _canvas(512, 512);
    x.fillStyle = '#0a0a0d'; x.fillRect(0, 0, 512, 512);
    for (let r = 250; r > 70; r -= 4) {
      x.strokeStyle = `rgba(${30 + Math.random() * 20 | 0},${30 + Math.random() * 20 | 0},40,0.8)`;
      x.lineWidth = 1.6;
      x.beginPath(); x.arc(256, 256, r, 0, Math.PI * 2); x.stroke();
    }
    x.fillStyle = '#c2246a';
    x.beginPath(); x.arc(256, 256, 66, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#f5e5ee';
    x.font = '700 34px "Bai Jamjuree", sans-serif';
    x.textAlign = 'center';
    x.fillText('樂浪突擊', 256, 248);
    x.font = '600 20px "Bai Jamjuree", sans-serif';
    x.fillText('THE MIXER', 256, 280);
    x.fillStyle = '#0a0a0d';
    x.beginPath(); x.arc(256, 256, 8, 0, Math.PI * 2); x.fill();
    T.vinyl = new THREE.CanvasTexture(c);
  }

  { // bass-trap spiral pad
    const [c, x] = _canvas(256, 256);
    x.fillStyle = '#120818'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = '#ff3da0'; x.lineWidth = 7;
    x.shadowColor = '#ff3da0'; x.shadowBlur = 14;
    x.beginPath();
    for (let a = 0; a < Math.PI * 6; a += 0.1) {
      const rr = 10 + a * 6.2;
      const px = 128 + Math.cos(a) * rr, py = 128 + Math.sin(a) * rr;
      a === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
    }
    x.stroke();
    T.bassTrap = new THREE.CanvasTexture(c);
  }

  // ── concert-hall set ──
  { // parquet wood
    const [c, x] = _canvas(512, 512);
    x.fillStyle = '#38220f'; x.fillRect(0, 0, 512, 512);
    for (let py = 0; py < 512; py += 42) {
      for (let px = 0; px < 512; px += 128) {
        const off = (py / 42) % 2 ? 64 : 0;
        const shade = 0.85 + Math.random() * 0.3;
        x.fillStyle = `rgb(${56 * shade | 0},${34 * shade | 0},${15 * shade | 0})`;
        x.fillRect(px + off, py, 124, 38);
        x.strokeStyle = 'rgba(20,10,4,0.7)';
        x.lineWidth = 2;
        x.strokeRect(px + off, py, 124, 38);
        // grain
        x.strokeStyle = 'rgba(30,18,8,0.3)';
        x.lineWidth = 1;
        for (let gI = 0; gI < 3; gI++) {
          const gy = py + 8 + gI * 11;
          x.beginPath(); x.moveTo(px + off + 4, gy); x.lineTo(px + off + 120, gy + (Math.random() - 0.5) * 6); x.stroke();
        }
      }
    }
    T.wood = new THREE.CanvasTexture(c);
    T.wood.wrapS = T.wood.wrapT = THREE.RepeatWrapping;
    T.wood.repeat.set(6, 6);
  }

  { // marble wall with gold trim
    const [c, x] = _canvas(512, 256);
    x.fillStyle = '#3b3230'; x.fillRect(0, 0, 512, 256);
    _noise(x, 512, 256, 0.04, 1200);
    for (let i = 0; i < 12; i++) { // veins
      x.strokeStyle = 'rgba(200,190,180,0.08)';
      x.lineWidth = 1 + Math.random() * 2;
      x.beginPath();
      let px = Math.random() * 512, py = 0;
      x.moveTo(px, py);
      while (py < 256) { px += (Math.random() - 0.5) * 40; py += 20 + Math.random() * 30; x.lineTo(px, py); }
      x.stroke();
    }
    // pilasters
    for (let px = 20; px < 512; px += 122) {
      x.fillStyle = 'rgba(25,20,18,0.7)';
      x.fillRect(px, 0, 14, 256);
      x.fillStyle = 'rgba(212,165,74,0.5)';
      x.fillRect(px + 2, 0, 2, 256);
      x.fillRect(px + 10, 0, 2, 256);
    }
    x.fillStyle = 'rgba(212,165,74,0.55)';
    x.fillRect(0, 6, 512, 5);
    x.fillRect(0, 245, 512, 5);
    T.marble = new THREE.CanvasTexture(c);
    T.marble.wrapS = T.marble.wrapT = THREE.RepeatWrapping;
    T.marble.repeat.set(8, 1);
  }

  { // purple stage curtain
    const [c, x] = _canvas(512, 256);
    for (let px = 0; px < 512; px += 32) {
      const g = x.createLinearGradient(px, 0, px + 32, 0);
      g.addColorStop(0, '#1c0e30');
      g.addColorStop(0.5, '#4a2478');
      g.addColorStop(1, '#170b28');
      x.fillStyle = g;
      x.fillRect(px, 0, 32, 256);
    }
    const sheen = x.createLinearGradient(0, 0, 0, 256);
    sheen.addColorStop(0, 'rgba(140,90,220,0.25)');
    sheen.addColorStop(0.5, 'rgba(0,0,0,0)');
    x.fillStyle = sheen; x.fillRect(0, 0, 512, 256);
    x.fillStyle = 'rgba(212,165,74,0.8)';
    x.fillRect(0, 0, 512, 10);
    T.curtain = new THREE.CanvasTexture(c);
  }

  { // golden podium top
    const [c, x] = _canvas(512, 512);
    const bg = x.createRadialGradient(256, 256, 10, 256, 256, 256);
    bg.addColorStop(0, '#ffe9ad');
    bg.addColorStop(0.5, '#dfae4b');
    bg.addColorStop(1, '#8a5f1a');
    x.fillStyle = bg; x.fillRect(0, 0, 512, 512);
    for (let r = 240; r > 40; r -= 26) {
      x.strokeStyle = 'rgba(120,80,20,0.5)';
      x.lineWidth = 3;
      x.beginPath(); x.arc(256, 256, r, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = 'rgba(255,240,200,0.5)';
      x.lineWidth = 1.2;
      x.beginPath(); x.arc(256, 256, r - 4, 0, Math.PI * 2); x.stroke();
    }
    x.fillStyle = 'rgba(90,55,10,0.85)';
    x.font = '900 150px serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('𝄞', 256, 268);
    T.podium = new THREE.CanvasTexture(c);
  }

  { // precipice water — deep blue with soundwave rings
    const [c, x] = _canvas(512, 512);
    x.fillStyle = '#04101e'; x.fillRect(0, 0, 512, 512);
    for (let r = 40; r < 260; r += 22) {
      x.strokeStyle = `rgba(61,180,255,${0.28 - r * 0.0007})`;
      x.lineWidth = 3;
      x.shadowColor = '#3de8ff'; x.shadowBlur = 10;
      x.beginPath(); x.arc(256, 256, r, 0, Math.PI * 2); x.stroke();
    }
    T.precipice = new THREE.CanvasTexture(c);
  }

  { // velvet seats strip
    const [c, x] = _canvas(256, 128);
    x.fillStyle = '#3f1420'; x.fillRect(0, 0, 256, 128);
    for (let px = 4; px < 256; px += 28) {
      x.fillStyle = '#5c1e2e';
      x.fillRect(px, 14, 22, 100);
      x.fillStyle = 'rgba(255,180,190,0.12)';
      x.fillRect(px, 14, 22, 10);
      x.fillStyle = 'rgba(212,165,74,0.4)';
      x.fillRect(px - 3, 110, 28, 4);
    }
    T.seats = new THREE.CanvasTexture(c);
    T.seats.wrapS = THREE.RepeatWrapping;
  }
};

/* ── entry: build a map into the scene ── */
WORLD.build = function (scene, mapId = 'mixer') {
  WORLD.makeTextures();
  return mapId === 'hall' ? WORLD._buildHall(scene) : WORLD._buildMixer(scene);
};

/* shared box helper factory */
function _boxer(scene, colliders, solids) {
  return function addBox(x, y, z, w, h, d, material, { collide = true, shadow = true, rotY = 0 } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y + h / 2, z);
    m.rotation.y = rotY;
    if (shadow) { m.castShadow = true; m.receiveShadow = true; }
    scene.add(m);
    solids.push(m);
    if (collide) {
      const cw = Math.abs(Math.cos(rotY)) * w + Math.abs(Math.sin(rotY)) * d;
      const cd = Math.abs(Math.sin(rotY)) * w + Math.abs(Math.cos(rotY)) * d;
      colliders.push({ minX: x - cw / 2, maxX: x + cw / 2, minY: y, maxY: y + h, minZ: z - cd / 2, maxZ: z + cd / 2 });
    }
    return m;
  };
}

/* ══════════════════ MAP 1: THE MIXER ══════════════════ */
WORLD._buildMixer = function (scene) {
  const T = WORLD.tex;
  const colliders = [];
  const solids = [];
  const dynamic = { eq: [], signs: [], padGlow: [], vinyl: null };

  scene.fog = new THREE.FogExp2(0x0a0c16, 0.016);
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

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), mat.asphalt);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  solids.push(floor);

  const sheen = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshBasicMaterial({ color: 0x141d36, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  sheen.rotation.x = -Math.PI / 2;
  sheen.position.y = 0.01;
  scene.add(sheen);

  const S = 46;
  const addBox = _boxer(scene, colliders, solids);

  for (const [x, z, w, d] of [
    [0, -S - 1, S * 2 + 6, 2], [0, S + 1, S * 2 + 6, 2],
    [-S - 1, 0, 2, S * 2 + 6], [S + 1, 0, 2, S * 2 + 6],
  ]) addBox(x, 0, z, w, 7, d, mat.concrete);

  // central podium platform + the vinyl deck
  addBox(0, 0, 0, 16, 2.4, 16, mat.concrete);
  for (let s = 0; s < 3; s++) {
    addBox(9.6 + s * 1.6, 0, 0, 1.6, 1.8 - s * 0.6, 6, mat.concrete);
    addBox(-9.6 - s * 1.6, 0, 0, 1.6, 1.8 - s * 0.6, 6, mat.concrete);
  }
  const vinyl = new THREE.Mesh(
    new THREE.CylinderGeometry(6.4, 6.4, 0.12, 40),
    new THREE.MeshStandardMaterial({ map: T.vinyl, roughness: 0.4, metalness: 0.3 })
  );
  vinyl.position.set(0, 2.47, 0);
  vinyl.receiveShadow = true;
  scene.add(vinyl);
  dynamic.vinyl = vinyl;
  addBox(-4, 2.4, -4, 2.2, 2.2, 2.2, mat.crate);
  addBox(4.5, 2.4, 3.5, 2.2, 2.2, 2.2, mat.crate);

  // containers
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

  const crateSpots = [
    [-14, -6, 2.2], [-15.5, -8.2, 2.2], [-14.6, -7, 4.2],
    [16, 8, 2.2], [18.2, 8.6, 2.2],
    [-30, 6, 2.2], [34, -4, 2.2], [10, 24, 2.2], [-8, -24, 2.2],
    [36, 30, 2.2], [-36, -32, 2.2],
  ];
  for (const [x, z, s] of crateSpots) addBox(x, 0, z, s, s === 4.2 ? 2.2 : s, s === 4.2 ? 2.2 : s, mat.crate, { rotY: Math.random() * 0.4 });
  for (const [x, z, r] of [[-8, 12, 0.3], [12, -12, -0.2], [22, 2, 1.4], [-24, -8, 1.7], [0, -18, 0.1], [4, 16, 1.2]]) {
    addBox(x, 0, z, 5.4, 1.25, 0.9, mat.concrete, { rotY: r });
  }

  // electric skybridge
  for (const px of [-19, 19]) addBox(px, 0, -37.5, 1.2, 6, 1.2, mat.steel);
  addBox(0, 6, -37.5, 42, 0.5, 3.4, mat.steel);
  addBox(0, 6.5, -39, 42, 1.0, 0.18, mat.steel, { collide: false });
  addBox(0, 6.5, -36, 42, 1.0, 0.18, mat.steel, { collide: false });
  for (let s = 0; s < 10; s++) {
    addBox(-24.5 - s * 0.9, 0, -37.5, 0.9, 6 - s * 0.6, 3.2, mat.concrete);
    addBox(24.5 + s * 0.9, 0, -37.5, 0.9, 6 - s * 0.6, 3.2, mat.concrete);
  }

  // BASS TRAP launch pads (concept art spirals) + one lift grate
  const pads = [];
  function pad(x, z, trap) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.22, 20), mat.steel);
    base.position.set(x, 0.11, z);
    base.castShadow = base.receiveShadow = true;
    scene.add(base);
    const topMat = trap
      ? new THREE.MeshBasicMaterial({ map: T.bassTrap, transparent: true })
      : new THREE.MeshBasicMaterial({ color: 0x3de8ff, transparent: true, opacity: 0.6 });
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.1, 20), topMat);
    glow.position.set(x, 0.26, z);
    scene.add(glow);
    dynamic.padGlow.push(glow);
    pads.push({ x, z, r: 1.7 });
  }
  pad(-19, -33.6, false);
  pad(19, -33.6, false);
  pad(30, 12, false);
  pad(-30, 14, true);   // BASS TRAP west (concept art)
  pad(30, -8, true);    // BASS TRAP east

  // BLUE / RED bases (corners, per the concept art)
  function base(x, z, colorHex, colorCss, label) {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(4.6, 4.6, 0.14, 28),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.22 })
    );
    disc.position.set(x, 0.08, z);
    scene.add(disc);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(4.6, 0.12, 8, 40),
      new THREE.MeshBasicMaterial({ color: colorHex })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.16, z);
    scene.add(ring);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 1.7),
      new THREE.MeshBasicMaterial({ map: T.neon(label, colorCss), transparent: true })
    );
    sign.position.set(x, 4.4, z + (z < 0 ? -6 : 6));
    if (z > 0) sign.rotation.y = Math.PI;
    scene.add(sign);
    const pl = new THREE.PointLight(colorHex, 1.2, 20, 1.8);
    pl.position.set(x, 4, z);
    scene.add(pl);
  }
  base(-38, -38, 0x3d7bff, '#3d7bff', 'BLUE BASE');
  base(38, 38, 0xff3d5e, '#ff3d5e', 'RED BASE');

  // work lights
  for (const [x, z] of [[-30, -30], [30, -30], [-30, 30], [30, 30], [0, -12]]) {
    addBox(x, 0, z, 0.34, 8.4, 0.34, mat.dark);
    addBox(x + 0.9, 8.0, z, 1.9, 0.16, 0.16, mat.dark, { collide: false });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.24, 0.4), new THREE.MeshBasicMaterial({ color: 0xffc06a }));
    lamp.position.set(x + 1.8, 8.0, z);
    scene.add(lamp);
    const pl = new THREE.PointLight(0xff9d4d, 1.5, 30, 1.8);
    pl.position.set(x + 1.8, 7.6, z);
    scene.add(pl);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: WORLD._glowSprite(), color: 0xffb060, transparent: true, opacity: 0.35, depthWrite: false }));
    sp.scale.set(6, 6, 1);
    sp.position.set(x + 1.8, 7.8, z);
    scene.add(sp);
  }

  // skyline
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

  // neon signage
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
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
    const [x, y, z, ry] = signSpots[i];
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
    dynamic.signs.push({ mesh: m, phase: Math.random() * 10 });
    const pl = new THREE.PointLight(new THREE.Color(col), 0.55, 14, 2);
    pl.position.set(x + Math.sin(ry) * 1.4, y, z + Math.cos(ry) * 1.4);
    scene.add(pl);
  });

  // equalizer billboard
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

  // rain
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
    mapId: 'mixer', colliders, solids, spawns, navPoints, pads,
    bounds: S, circular: false, radius: S, podium: null,
    groundY() { return 0; },
    update(dt, time, beatPhase) {
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

      const energy = 1 - beatPhase;
      dynamic.eq.forEach((bar, i) => {
        const h = 0.6 + Math.abs(Math.sin(time * 2.1 + i * 1.7)) * 2.6 * (0.35 + energy * 0.65);
        bar.scale.y = h;
        bar.position.y = h / 2;
      });
      for (const s of dynamic.signs) {
        const f = Math.sin(time * 13 + s.phase) + Math.sin(time * 29 + s.phase * 2);
        s.mesh.material.opacity = f < -1.82 ? 0.25 : 1;
      }
      for (const g of dynamic.padGlow) {
        g.material.opacity = 0.35 + energy * 0.45;
      }
      dynamic.vinyl.rotation.y = time * 1.4; // 33⅓-and-a-bit rpm
    },
  };
};

/* ══════════════════ MAP 2: THE RING CONCERT HALL ══════════════════ */
WORLD._buildHall = function (scene) {
  const T = WORLD.tex;
  const colliders = [];
  const solids = [];
  const dynamic = { podiumGlow: null, chandeliers: [] };
  const R = 44;          // hall radius
  const PIT_IN = 7.2;    // podium radius
  const PIT_OUT = 15.6;  // precipice outer edge

  scene.fog = new THREE.FogExp2(0x120c07, 0.014);
  scene.add(new THREE.HemisphereLight(0x3e3020, 0x0a0705, 0.3));
  const key = new THREE.DirectionalLight(0xffd9a0, 0.34);
  key.position.set(20, 60, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -60; key.shadow.camera.right = 60;
  key.shadow.camera.top = 60; key.shadow.camera.bottom = -60;
  key.shadow.camera.far = 200;
  key.shadow.bias = -0.0006;
  scene.add(key);

  const addBox = _boxer(scene, colliders, solids);
  const mat = {
    wood: new THREE.MeshStandardMaterial({ map: T.wood, roughness: 0.7, metalness: 0.05 }),
    marble: new THREE.MeshStandardMaterial({ map: T.marble, roughness: 0.75, metalness: 0.08 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc9982f, roughness: 0.32, metalness: 0.9 }),
    goldDark: new THREE.MeshStandardMaterial({ color: 0x7a5a16, roughness: 0.45, metalness: 0.85 }),
    velvet: new THREE.MeshStandardMaterial({ map: T.seats, roughness: 0.95, metalness: 0 }),
    darkwood: new THREE.MeshStandardMaterial({ color: 0x2a1a0c, roughness: 0.85 }),
  };

  // domed ceiling (warm)
  {
    const [c, x] = _canvas(512, 256);
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#1c1208');
    g.addColorStop(0.7, '#241608');
    g.addColorStop(1, '#3a2410');
    x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 40; i++) {
      x.fillStyle = `rgba(255,220,150,${Math.random() * 0.2})`;
      x.fillRect(Math.random() * 512, Math.random() * 120, 1.6, 1.6);
    }
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(70, 32, 16),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.BackSide, fog: false })
    );
    scene.add(dome);
  }

  // outer floor ring (solid) — the precipice is the missing middle
  const floorRing = new THREE.Mesh(new THREE.RingGeometry(PIT_OUT, R + 1, 56), mat.wood);
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.receiveShadow = true;
  scene.add(floorRing);
  solids.push(floorRing);

  // precipice: shaft wall + glowing sound-water far below
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(PIT_OUT, PIT_OUT, 9, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x120b06, roughness: 0.95, side: THREE.BackSide })
  );
  shaft.position.y = -4.5;
  scene.add(shaft);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(PIT_OUT, 48),
    new THREE.MeshBasicMaterial({ map: T.precipice })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -8.5;
  scene.add(water);
  const waterGlow = new THREE.PointLight(0x2a7ab8, 1.2, 30, 1.6);
  waterGlow.position.y = -5;
  scene.add(waterGlow);

  // the golden podium — column from the depths, disc on top
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(PIT_IN - 0.3, PIT_IN + 1.2, 9.2, 40),
    mat.goldDark
  );
  column.position.y = -4;
  column.castShadow = true;
  scene.add(column);
  solids.push(column);
  const podTop = new THREE.Mesh(
    new THREE.CylinderGeometry(PIT_IN, PIT_IN, 0.28, 40),
    new THREE.MeshStandardMaterial({ map: T.podium, roughness: 0.35, metalness: 0.75 })
  );
  podTop.position.y = 0.6 - 0.14;
  podTop.receiveShadow = true;
  scene.add(podTop);
  solids.push(podTop);
  const podRing = new THREE.Mesh(
    new THREE.TorusGeometry(PIT_IN, 0.16, 10, 48),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.7 })
  );
  podRing.rotation.x = Math.PI / 2;
  podRing.position.y = 0.66;
  scene.add(podRing);
  dynamic.podiumGlow = podRing;
  const podLight = new THREE.PointLight(0xffce7a, 1.6, 24, 1.6);
  podLight.position.y = 4;
  scene.add(podLight);

  // bridges over the precipice: two grand (E/W) + one narrow (S)
  const bridgeMat = mat.wood;
  addBox(-(PIT_IN + (PIT_OUT - PIT_IN) / 2), -0.4, 0, PIT_OUT - PIT_IN + 1.4, 0.4, 3.4, bridgeMat);
  addBox((PIT_IN + (PIT_OUT - PIT_IN) / 2), -0.4, 0, PIT_OUT - PIT_IN + 1.4, 0.4, 3.4, bridgeMat);
  addBox(0, -0.4, (PIT_IN + (PIT_OUT - PIT_IN) / 2), 2.0, 0.4, PIT_OUT - PIT_IN + 1.4, bridgeMat);
  // gold bridge rails (visual)
  for (const bx of [-1, 1]) {
    for (const bz of [-1.85, 1.85]) {
      addBox(bx * (PIT_IN + (PIT_OUT - PIT_IN) / 2), 0, bz, PIT_OUT - PIT_IN + 1.4, 0.7, 0.12, mat.gold, { collide: false });
    }
  }

  // circular hall wall
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 1.2, R + 1.2, 15, 56, 1, true),
    new THREE.MeshStandardMaterial({ map: T.marble, roughness: 0.8, side: THREE.BackSide })
  );
  wall.position.y = 7.5;
  scene.add(wall);
  solids.push(wall);
  for (const y of [2.2, 10.5]) {
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(R + 1.0, 0.14, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xd4a54a, transparent: true, opacity: 0.5 })
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.y = y;
    scene.add(trim);
  }

  // stage (north) with purple curtain
  addBox(0, 0, -R + 7, 26, 1.2, 10, mat.darkwood);
  addBox(11, 0, -R + 11.4, 3, 0.6, 2.4, mat.darkwood);  // stage steps
  addBox(-11, 0, -R + 11.4, 3, 0.6, 2.4, mat.darkwood);
  addBox(11, 0, -R + 12.6, 3, 0.3, 1.6, mat.darkwood);
  addBox(-11, 0, -R + 12.6, 3, 0.3, 1.6, mat.darkwood);
  const curtain = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 11),
    new THREE.MeshBasicMaterial({ map: T.curtain })
  );
  curtain.position.set(0, 6.7, -R + 2.4);
  scene.add(curtain);
  solids.push(curtain);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(13.4, 0.5, 10, 30, Math.PI), mat.gold);
  arch.position.set(0, 1.4, -R + 3.2);
  scene.add(arch);
  const stageLight = new THREE.PointLight(0xb070ff, 1.1, 30, 1.8);
  stageLight.position.set(0, 8, -R + 8);
  scene.add(stageLight);

  // giant instrument props & crates as cover on the outer ring
  const rng = (a, b) => a + Math.random() * (b - a);
  for (const [ang, r] of [[0.5, 26], [1.2, 30], [2.0, 24], [2.7, 29], [3.5, 25], [4.2, 30], [5.0, 26], [5.7, 29]]) {
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    const kind = (ang * 10 | 0) % 3;
    if (kind === 0) { // timpani
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.0, 1.5, 18), mat.gold);
      drum.position.set(x, 0.75, z);
      drum.castShadow = drum.receiveShadow = true;
      scene.add(drum);
      solids.push(drum);
      colliders.push({ minX: x - 1.5, maxX: x + 1.5, minY: 0, maxY: 1.5, minZ: z - 1.5, maxZ: z + 1.5 });
    } else if (kind === 1) { // piano-crate
      addBox(x, 0, z, 3.2, 1.7, 2.0, mat.darkwood, { rotY: ang });
    } else { // cello cases leaning
      addBox(x, 0, z, 1.1, 2.6, 0.9, mat.velvet, { rotY: ang });
    }
  }

  // ring of velvet seating (three rising tiers against the wall)
  for (let tier = 0; tier < 3; tier++) {
    const r = 43 - tier * 2.6;
    const segs = 26;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      if (a > Math.PI * 1.32 && a < Math.PI * 1.68) continue; // stage gap (north)
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      addBox(x, tier * 0.7, z, 7, 0.9 + tier * 0.2, 1.8, mat.velvet, { rotY: -a + Math.PI / 2, shadow: false });
    }
  }

  // team alcoves (blue ♪ west, red 𝄢 east) per concept art
  function alcove(x, colorHex, colorCss, glyph) {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.4, 0.12, 24),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.22 })
    );
    disc.position.set(x, 0.08, 0);
    scene.add(disc);
    const [c, cx] = _canvas(128, 128);
    cx.shadowColor = colorCss; cx.shadowBlur = 24;
    cx.fillStyle = colorCss;
    cx.font = '900 90px serif';
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(glyph, 64, 70);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 3),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true })
    );
    sign.position.set(x + (x < 0 ? -3.4 : 3.4), 4.2, 0);
    sign.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(sign);
    const pl = new THREE.PointLight(colorHex, 1.0, 16, 1.8);
    pl.position.set(x, 3.4, 0);
    scene.add(pl);
  }
  alcove(-38, 0x3d7bff, '#3d7bff', '♪');
  alcove(38, 0xff3d5e, '#ff3d5e', '𝄢');

  // chandeliers
  for (const [x, z] of [[-20, -14], [20, -14], [0, 22]]) {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 10), mat.gold);
    grp.add(body);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: WORLD._glowSprite(), color: 0xffd9a0, transparent: true, opacity: 0.55, depthWrite: false }));
    sp.scale.set(7, 7, 1);
    grp.add(sp);
    const pl = new THREE.PointLight(0xffce8a, 1.4, 34, 1.7);
    grp.add(pl);
    grp.position.set(x, 11.5, z);
    scene.add(grp);
    dynamic.chandeliers.push(sp);
  }

  const spawns = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    spawns.push({ x: Math.cos(a) * 30, y: 0, z: Math.sin(a) * 30 });
  }
  const navPoints = [
    { x: 0, y: 0.6, z: 0 },                              // the podium
    { x: -11.4, y: 0, z: 0 }, { x: 11.4, y: 0, z: 0 },   // bridge mouths
    { x: 0, y: 0, z: 11.4 },
    { x: -24, y: 0, z: -14 }, { x: 24, y: 0, z: -14 },
    { x: -26, y: 0, z: 16 }, { x: 26, y: 0, z: 16 },
    { x: 0, y: 0, z: 28 }, { x: 0, y: 1.2, z: -R + 8 },  // stage
    { x: -34, y: 0, z: 2 }, { x: 34, y: 0, z: 2 },
  ];

  return {
    mapId: 'hall', colliders, solids, spawns, navPoints, pads: [],
    bounds: R, circular: true, radius: R,
    podium: { x: 0, z: 0, r: PIT_IN, y: 0.6 },
    groundY(x, z) {
      const rr = Math.hypot(x, z);
      if (rr <= PIT_IN) return 0.6;         // podium top
      if (rr < PIT_OUT) return -30;         // the Soundwave Precipice
      return 0;
    },
    update(dt, time, beatPhase) {
      const energy = 1 - beatPhase;
      dynamic.podiumGlow.material.opacity = 0.4 + energy * 0.5;
      dynamic.podiumGlow.scale.setScalar(1 + energy * 0.03);
      for (const sp of dynamic.chandeliers) {
        sp.material.opacity = 0.5 + Math.sin(time * 7 + sp.position.x) * 0.06;
      }
    },
  };
};
