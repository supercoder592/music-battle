/* ── Soundwave Strike — main game ────────────────────────────────────
   FPS controller, combat, match flow, HUD, and the online layer. */

const $ = id => document.getElementById(id);

class Game {
  constructor() {
    // renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
    this.scene.add(this.camera);
    // soft fill so the view-model brass reads at night
    const vmFill = new THREE.PointLight(0xfff0dc, 0.65, 2.2, 1.5);
    vmFill.position.set(0.25, 0.05, -0.25);
    this.camera.add(vmFill);

    this.world = WORLD.build(this.scene);
    VFX.init(this.scene);

    // player state
    this.pos = new THREE.Vector3(0, 0, 30);   // feet
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.eyeH = 1.62;
    this.hp = 100;
    this.kills = 0; this.deaths = 0;
    this.alive = true;
    this.respawnT = 0;
    this.spawnProt = 0;
    this.lastCombat = 0;
    this.grounded = false;
    this.sliding = 0;
    this.slideDir = new THREE.Vector3();
    this.dashCd = 0;
    this.crouchLerp = 0;

    // weapons
    this.weaponIdx = 0;
    this.wstate = WEAPONS.map(w => ({ mag: w.mag, cd: 0, reloadT: 0 }));
    this.viewModels = WEAPONS.map(w => {
      const vm = VIEWMODELS[w.id]();
      vm.position.set(0.3, -0.26, -0.55);
      vm.visible = false;
      this.camera.add(vm);
      return vm;
    });
    this.vmKick = 0;
    this.bobT = 0;
    this.zoomed = false;
    this.spread = 0;

    // match
    this.state = 'menu';   // menu | playing | paused | dead | end
    this.mode = 'bots';
    this.matchTime = 300;
    this.killGoal = 20;
    this.bots = [];
    this.remotes = new Map(); // peer -> RemoteAvatar
    this.myColorIdx = (Math.random() * ACTOR_COLORS.length) | 0;

    this.input = { keys: {}, fire: false, aim: false };
    this.time = 0;
    this.lastTs = 0;
    this.netTick = 0;

    this.bindInput();
    this.bindMenu();
    this.initNet();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    requestAnimationFrame(ts => this.frame(ts));
  }

  /* ── input ── */
  bindInput() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', () => {
      if (this.state === 'playing' || this.state === 'dead') {
        if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
      }
    });
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== canvas && this.state === 'playing') this.pause();
    });
    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement !== canvas) return;
      const sens = 0.0021 * (this.zoomed ? 0.45 : 1);
      this.yaw -= e.movementX * sens;
      this.pitch -= e.movementY * sens;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    });
    document.addEventListener('mousedown', e => {
      if (this.state !== 'playing' || document.pointerLockElement !== canvas) return;
      if (e.button === 0) { this.input.fire = true; this.tryFire(); }
      if (e.button === 2) this.input.aim = true;
    });
    document.addEventListener('mouseup', e => {
      if (e.button === 0) this.input.fire = false;
      if (e.button === 2) this.input.aim = false;
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('wheel', e => {
      if (this.state !== 'playing') return;
      this.switchWeapon(this.weaponIdx + (e.deltaY > 0 ? 1 : -1));
    });
    document.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (k === 'tab') { e.preventDefault(); if (this.state === 'playing' || this.state === 'dead') $('scoreboard').classList.remove('hidden'); }
      if (this.state !== 'playing') { this.input.keys[k] = true; return; }
      this.input.keys[k] = true;
      if (k === ' ') { e.preventDefault(); this.tryJump(); }
      if (k === 'shift') this.tryDash();
      if (k === 'c' || k === 'control') this.trySlide();
      if (k === 'r') this.tryReload();
      if (k >= '1' && k <= '4') this.switchWeapon(+k - 1);
    });
    document.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      this.input.keys[k] = false;
      if (k === 'tab') $('scoreboard').classList.add('hidden');
    });
  }

  bindMenu() {
    const saved = (() => { try { return localStorage.getItem('sw_callsign'); } catch (e) { return null; } })();
    $('callsign').value = saved || 'MAESTRO-' + (100 + Math.random() * 900 | 0);
    $('btn-bots').addEventListener('click', () => this.startMatch('bots'));
    $('btn-online').addEventListener('click', () => this.startMatch('online'));
    $('btn-resume').addEventListener('click', () => this.resume());
    $('btn-quit').addEventListener('click', () => this.toMenu());
    $('btn-again').addEventListener('click', () => this.startMatch(this.mode));
    $('btn-menu').addEventListener('click', () => this.toMenu());
  }

  get callsign() {
    const v = $('callsign').value.trim() || 'MAESTRO';
    try { localStorage.setItem('sw_callsign', v); } catch (e) {}
    return v.toUpperCase().slice(0, 14);
  }

  /* ── net ── */
  async initNet() {
    NET.onStatus = () => this.refreshOnlineUI();
    NET.onPeersChanged = ch => this.onPeers(ch);
    NET.onFire = m => this.onRemoteFire(m);
    NET.onHit = m => this.onRemoteHit(m);
    NET.onDie = m => this.onRemoteDie(m);
    await NET.init();
    this.refreshOnlineUI();
    setInterval(() => this.refreshOnlineUI(), 2000);
  }

  refreshOnlineUI() {
    const btn = $('btn-online'), st = $('online-status');
    if (!NET.available) {
      btn.classList.add('hidden');
      st.textContent = window.claude ? 'ONLINE UNAVAILABLE IN THIS VIEW — BOTS READY' : '';
      return;
    }
    btn.classList.remove('hidden');
    const n = NET.otherViewers();
    st.innerHTML = n > 0
      ? `<b>${n}</b> OTHER PLAYER${n > 1 ? 'S' : ''} IN THE ROOM`
      : 'ROOM EMPTY — SHARE THIS ARTIFACT LINK TO JAM';
  }

  onPeers(change) {
    for (const p of [...change.joined, ...change.updated]) {
      if (p.isMe || p.kind !== 'viewer') continue;
      const pr = p.presence || {};
      if (pr.st === 'lobby') {
        const av = this.remotes.get(p.peer);
        if (av) { av.dispose(this.scene); this.remotes.delete(p.peer); }
        continue;
      }
      if (pr.st === 'game' || pr.st === 'dead') {
        let av = this.remotes.get(p.peer);
        if (!av) {
          av = new RemoteAvatar(p.peer, String(pr.n || 'PLAYER').slice(0, 14), ACTOR_COLORS[(pr.c || 0) % ACTOR_COLORS.length], this.scene);
          this.remotes.set(p.peer, av);
        }
        av.kills = pr.k || 0;
        av.deaths = pr.d || 0;
        av.hp = pr.hp != null ? pr.hp : 100;
        av.alive = pr.st === 'game' && av.hp > 0;
        if (typeof pr.x === 'number') av.pushSnap({ x: pr.x, y: pr.y, z: pr.z, yaw: pr.yw || 0, pitch: pr.pt || 0 });
      }
    }
    for (const p of change.left) {
      const av = this.remotes.get(p.peer);
      if (av) { av.dispose(this.scene); this.remotes.delete(p.peer); }
    }
    this.refreshOnlineUI();
  }

  onRemoteFire(m) {
    const d = m.data || {};
    if (!Array.isArray(d.o) || !Array.isArray(d.e)) return;
    const from = new THREE.Vector3(...d.o.map(Number));
    const to = new THREE.Vector3(...d.e.map(Number));
    const w = WEAPONS[(d.w | 0) % WEAPONS.length];
    VFX.tracer(from, to, w.tracerColor);
    VFX.flash(from, w.tracerColor, 1.1, 5);
    if (d.w === 3) VFX.spawnRocket(from, to.clone().sub(from).normalize(), m.peer);
    const dist = from.distanceTo(new THREE.Vector3(this.pos.x, this.pos.y + this.eyeH, this.pos.z));
    if (dist < 70) AUDIO.smgShot();
  }

  onRemoteHit(m) {
    const d = m.data || {};
    if (d.t !== NET.myPeerId || !this.alive || this.state === 'menu') return;
    const dmg = Math.min(100, Math.max(0, Number(d.d) || 0));
    if (this.spawnProt > 0) return;
    this.takeDamage(dmg, { name: this.peerName(m.peer), peer: m.peer });
  }

  onRemoteDie(m) {
    const d = m.data || {};
    const victim = this.peerName(m.peer);
    const killerName = d.k === NET.myPeerId ? this.callsign : this.peerName(d.k);
    this.killfeed(killerName, victim, WEAPONS[(d.w | 0) % WEAPONS.length].icon, d.k === NET.myPeerId);
    if (d.k === NET.myPeerId) {
      this.kills++;
      AUDIO.killJingle();
      this.showHitmarker(true);
      this.pushPresence(true);
      this.updateHud();
    }
  }

  peerName(peerId) {
    const av = this.remotes.get(peerId);
    if (av) return av.name;
    for (const p of NET.peers()) if (p.peer === peerId) return String((p.presence || {}).n || 'PLAYER');
    return 'PLAYER';
  }

  pushPresence(force) {
    if (this.mode !== 'online' || !NET.available) return;
    NET.presence({
      n: this.callsign, c: this.myColorIdx,
      st: this.alive ? 'game' : 'dead',
      hp: Math.round(this.hp), k: this.kills, d: this.deaths, w: this.weaponIdx,
      x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
      yw: +this.yaw.toFixed(3), pt: +this.pitch.toFixed(3),
    });
  }

  /* ── match flow ── */
  startMatch(mode) {
    AUDIO.init();
    this.mode = mode;
    this.state = 'playing';
    this.kills = 0; this.deaths = 0;
    this.hp = 100;
    this.alive = true;
    this.matchTime = mode === 'bots' ? 300 : 0;
    this.weaponIdx = 0;
    this.wstate = WEAPONS.map(w => ({ mag: w.mag, cd: 0, reloadT: 0 }));
    for (const b of this.bots) b.dispose(this.scene);
    this.bots = [];
    if (mode === 'bots') {
      for (let i = 0; i < 5; i++) {
        this.bots.push(new Bot('bot' + i, BOT_NAMES[i], ACTOR_COLORS[(this.myColorIdx + 1 + i) % ACTOR_COLORS.length], this.scene, this));
      }
    }
    this.input.keys = {};
    this.input.fire = false;
    const s = this.pickSpawn();
    this.pos.set(s.x, s.y, s.z);
    this.vel.set(0, 0, 0);
    this.yaw = Math.atan2(this.pos.x, this.pos.z); // face arena center
    this.pitch = 0;
    this.spawnProt = 2;
    $('menu').classList.add('hidden');
    $('pause').classList.add('hidden');
    $('matchend').classList.add('hidden');
    $('respawn-msg').classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('match-goal').textContent = mode === 'bots' ? `FIRST TO ${this.killGoal}` : 'ONLINE JAM';
    this.buildWeaponRow();
    this.switchWeapon(0);
    this.updateHud();
    this.renderer.domElement.requestPointerLock && this.renderer.domElement.requestPointerLock();
    this.pushPresence(true);
    this.centerMsg(mode === 'bots' ? 'DROP THE BEAT' : 'JAM SESSION LIVE', 1.4);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    $('pause').classList.remove('hidden');
  }

  resume() {
    this.state = 'playing';
    $('pause').classList.add('hidden');
    this.renderer.domElement.requestPointerLock();
  }

  toMenu() {
    this.state = 'menu';
    document.exitPointerLock && document.exitPointerLock();
    for (const b of this.bots) b.dispose(this.scene);
    this.bots = [];
    $('pause').classList.add('hidden');
    $('matchend').classList.add('hidden');
    $('hud').classList.add('hidden');
    $('menu').classList.remove('hidden');
    if (NET.available) NET.presence({ st: 'lobby', n: this.callsign, c: this.myColorIdx });
  }

  endMatch(won, reason) {
    this.state = 'end';
    document.exitPointerLock && document.exitPointerLock();
    $('hud').classList.add('hidden');
    $('end-title').textContent = won ? 'HEADLINER' : 'OPENING ACT';
    $('end-kicker').textContent = reason;
    const acc = this.deaths === 0 ? this.kills : (this.kills / Math.max(1, this.deaths)).toFixed(2);
    $('end-stats').innerHTML =
      `ELIMINATIONS <b>${this.kills}</b> · DEATHS <b>${this.deaths}</b> · K/D <b>${acc}</b>`;
    $('matchend').classList.remove('hidden');
  }

  /* ── movement helpers shared with bots ── */
  moveWithCollisions(pos, vel, dt, r, h) {
    const cols = this.world.colliders;
    const S = this.world.bounds;

    // X axis
    pos.x += vel.x * dt;
    for (const c of cols) {
      if (pos.x + r > c.minX && pos.x - r < c.maxX && pos.z + r > c.minZ && pos.z - r < c.maxZ &&
          pos.y < c.maxY - 0.001 && pos.y + h > c.minY) {
        if (c.maxY - pos.y <= 0.62 && vel.y <= 0.1) { pos.y = c.maxY; continue; } // step up
        pos.x = vel.x > 0 ? c.minX - r : c.maxX + r;
        vel.x = 0;
      }
    }
    // Z axis
    pos.z += vel.z * dt;
    for (const c of cols) {
      if (pos.x + r > c.minX && pos.x - r < c.maxX && pos.z + r > c.minZ && pos.z - r < c.maxZ &&
          pos.y < c.maxY - 0.001 && pos.y + h > c.minY) {
        if (c.maxY - pos.y <= 0.62 && vel.y <= 0.1) { pos.y = c.maxY; continue; }
        pos.z = vel.z > 0 ? c.minZ - r : c.maxZ + r;
        vel.z = 0;
      }
    }
    // Y axis
    const prevY = pos.y;
    pos.y += vel.y * dt;
    let grounded = false;
    if (pos.y <= 0) { pos.y = 0; vel.y = 0; grounded = true; }
    for (const c of cols) {
      if (pos.x + r > c.minX && pos.x - r < c.maxX && pos.z + r > c.minZ && pos.z - r < c.maxZ) {
        if (vel.y <= 0 && prevY >= c.maxY - 0.05 && pos.y < c.maxY) {
          pos.y = c.maxY; vel.y = 0; grounded = true;
        } else if (vel.y > 0 && prevY + h <= c.minY + 0.05 && pos.y + h > c.minY) {
          pos.y = c.minY - h; vel.y = 0;
        }
      }
    }
    // arena clamp
    pos.x = Math.max(-S + r, Math.min(S - r, pos.x));
    pos.z = Math.max(-S + r, Math.min(S - r, pos.z));
    return grounded;
  }

  checkJumpPad(actor) {
    for (const p of this.world.pads) {
      const dx = actor.pos.x - p.x, dz = actor.pos.z - p.z;
      if (dx * dx + dz * dz < p.r * p.r && actor.pos.y < 0.5 && actor.vel.y <= 1) {
        actor.vel.y = 14.5;
        if (actor === this) AUDIO.jumpPad();
        VFX.ring(new THREE.Vector3(p.x, 0.2, p.z), 0x3de8ff, 4);
      }
    }
  }

  hasLineOfSight(from, to) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const dist = dir.length();
    dir.normalize();
    const rc = new THREE.Raycaster(from, dir, 0.1, dist - 0.4);
    return rc.intersectObjects(this.world.solids, false).length === 0;
  }

  allCombatants() {
    const list = [...this.bots];
    if (this.alive && this.state !== 'menu') {
      list.push(this);
    }
    return list;
  }

  pickSpawn() {
    const enemies = [...this.bots.filter(b => b.alive), ...[...this.remotes.values()].filter(r => r.alive)];
    let best = this.world.spawns[0], bestD = -1;
    for (const s of this.world.spawns) {
      let d = Infinity;
      for (const e of enemies) d = Math.min(d, (e.pos.x - s.x) ** 2 + (e.pos.z - s.z) ** 2);
      if (enemies.length === 0) d = Math.random() * 100;
      if (d > bestD) { bestD = d; best = s; }
    }
    return best;
  }

  /* player is also a combatant target for bots */
  get eyeY() { return this.pos.y + this.eyeH; }
  eyePos() { return new THREE.Vector3(this.pos.x, this.eyeY, this.pos.z); }

  /* ── combat ── */
  raycastShot(from, dir, range, excludeId) {
    const rc = new THREE.Raycaster(from, dir, 0.05, range);
    const targets = [];
    for (const b of this.bots) if (b.alive && b.id !== excludeId) targets.push(b.hitbox);
    for (const r of this.remotes.values()) if (r.alive && r.id !== excludeId) targets.push(r.hitbox);
    // player hitbox for bot shots: approximate with a temp check afterwards
    const hits = rc.intersectObjects([...targets, ...this.world.solids], false);
    let best = null;
    for (const h of hits) {
      if (h.object.userData.actorId === excludeId) continue;
      best = h;
      break;
    }
    // manual player capsule test (the player has no mesh)
    if (excludeId !== 'me' && this.alive) {
      const toP = new THREE.Vector3(this.pos.x, this.pos.y + 0.95, this.pos.z).sub(from);
      const t = toP.dot(dir);
      if (t > 0 && t < range && (!best || t < best.distance)) {
        const closest = from.clone().addScaledVector(dir, t);
        const dy = Math.abs(closest.y - (this.pos.y + 0.95));
        const dxz = new THREE.Vector2(closest.x - this.pos.x, closest.z - this.pos.z).length();
        if (dy < 1.0 && dxz < 0.5) {
          return { point: closest, actor: this, distance: t };
        }
      }
    }
    if (!best) return null;
    const actorId = best.object.userData.actorId;
    let actor = null;
    if (actorId) {
      actor = this.bots.find(b => b.id === actorId) || this.remotes.get(actorId) || null;
    }
    return { point: best.point, actor, distance: best.distance };
  }

  applyDamage(target, dmg, attacker, point) {
    if (target === this) {
      if (this.spawnProt > 0) return;
      this.takeDamage(dmg, attacker);
      return;
    }
    if (target instanceof RemoteAvatar) {
      // victim-authoritative online damage
      NET.emit('hit', { t: target.id, d: Math.round(dmg) });
      VFX.spark(point || target.eyePos(), 0xff5060, 6, 5);
      if (attacker === this) { this.showHitmarker(false); AUDIO.hitmark(); }
      return;
    }
    // bot
    target.hp -= dmg;
    VFX.spark(point || target.eyePos(), 0xff5060, 6, 5);
    if (attacker === this) { this.showHitmarker(target.hp <= 0); AUDIO.hitmark(); }
    if (target.hp <= 0 && target.alive) {
      target.die();
      const aName = attacker === this ? this.callsign : attacker.name;
      const icon = attacker === this ? WEAPONS[this.weaponIdx].icon : '🎵';
      this.killfeed(aName, target.name, icon, attacker === this);
      if (attacker === this) {
        this.kills++;
        AUDIO.killJingle();
        this.updateHud();
        if (this.mode === 'bots' && this.kills >= this.killGoal) this.endMatch(true, 'SET COMPLETE — CROWD GOES WILD');
      } else if (attacker instanceof Bot) {
        attacker.kills++;
        if (this.mode === 'bots' && attacker.kills >= this.killGoal) this.endMatch(false, `${attacker.name.toUpperCase()} STOLE THE SHOW`);
      }
    }
  }

  takeDamage(dmg, attacker) {
    if (!this.alive) return;
    this.hp -= dmg;
    this.lastCombat = this.time;
    AUDIO.hurt();
    $('dmg-vignette').style.opacity = Math.min(0.9, 0.35 + dmg * 0.02);
    setTimeout(() => { $('dmg-vignette').style.opacity = this.hp < 30 ? 0.35 : 0; }, 130);
    if (this.hp <= 0) this.dieBy(attacker);
    this.updateHud();
  }

  dieBy(attacker) {
    this.alive = false;
    this.deaths++;
    this.hp = 0;
    this.state = 'dead';
    this.respawnT = 3;
    AUDIO.die();
    const aName = attacker ? (attacker.name || 'THE VOID') : 'THE VOID';
    this.killfeed(aName, this.callsign, '💀', false, true);
    if (attacker instanceof Bot) {
      attacker.kills++;
      if (this.mode === 'bots' && attacker.kills >= this.killGoal) { this.endMatch(false, `${attacker.name.toUpperCase()} STOLE THE SHOW`); return; }
    }
    if (this.mode === 'online') {
      NET.emit('die', { k: attacker && attacker.peer ? attacker.peer : (attacker ? attacker.id : null), w: this.weaponIdx });
      this.pushPresence(true);
    }
    $('respawn-msg').classList.remove('hidden');
    this.updateHud();
  }

  respawnPlayer() {
    const s = this.pickSpawn();
    this.pos.set(s.x, s.y, s.z);
    this.vel.set(0, 0, 0);
    this.hp = 100;
    this.alive = true;
    this.state = 'playing';
    this.spawnProt = 2;
    $('respawn-msg').classList.add('hidden');
    $('dmg-vignette').style.opacity = 0;
    this.pushPresence(true);
    this.updateHud();
  }

  /* ── weapons ── */
  switchWeapon(idx) {
    idx = ((idx % WEAPONS.length) + WEAPONS.length) % WEAPONS.length;
    this.weaponIdx = idx;
    this.viewModels.forEach((vm, i) => vm.visible = i === idx);
    this.wstate[idx].cd = Math.max(this.wstate[idx].cd, 0.25);
    this.zoomed = false;
    this.updateHud();
  }

  tryReload() {
    const w = WEAPONS[this.weaponIdx], st = this.wstate[this.weaponIdx];
    if (st.reloadT > 0 || st.mag === w.mag) return;
    st.reloadT = w.reload;
    AUDIO.reload();
    this.updateHud();
  }

  tryJump() {
    if (this.grounded) {
      this.vel.y = 9.2;
      this.sliding = 0;
    }
  }

  tryDash() {
    if (this.dashCd > 0) return;
    const onBeat = AUDIO.onBeat();
    this.dashCd = 2.2;
    const dir = this.wishDir();
    if (dir.lengthSq() === 0) dir.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const power = onBeat ? 17 : 12; // the proposal's Beat Dash: +30%+ on the beat
    this.vel.x = dir.x * power;
    this.vel.z = dir.z * power;
    AUDIO.dash(onBeat);
    if (onBeat) this.centerMsg('BEAT DASH', 0.5);
  }

  trySlide() {
    if (!this.grounded || this.sliding > 0) return;
    const sp = new THREE.Vector2(this.vel.x, this.vel.z).length();
    if (sp < 4) return;
    this.sliding = 0.8;
    this.slideDir.set(this.vel.x, 0, this.vel.z).normalize();
    AUDIO.slide();
  }

  wishDir() {
    const k = this.input.keys;
    let f = 0, s = 0;
    if (k['w']) f += 1;
    if (k['s']) f -= 1;
    if (k['a']) s -= 1;
    if (k['d']) s += 1;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const dir = new THREE.Vector3(-sin * f + cos * s, 0, -cos * f - sin * s);
    if (dir.lengthSq() > 0) dir.normalize();
    return dir;
  }

  tryFire() {
    if (this.state !== 'playing' || !this.alive) return;
    const w = WEAPONS[this.weaponIdx], st = this.wstate[this.weaponIdx];
    if (st.cd > 0 || st.reloadT > 0) return;
    if (st.mag <= 0) { this.tryReload(); return; }
    st.mag--;
    st.cd = w.rate;
    this.spawnProt = 0;
    this.vmKick = 1;
    this.spread = Math.min(1, this.spread + w.kick * 6);
    w.sfx();

    const origin = this.eyePos();
    const moveSpread = this.zoomed ? 0 : Math.min(0.03, new THREE.Vector2(this.vel.x, this.vel.z).length() * 0.0022);

    if (w.mode === 'projectile') {
      const dir = this.aimDir(0);
      VFX.spawnRocket(origin.clone().addScaledVector(dir, 0.8).add(new THREE.Vector3(0, -0.15, 0)), dir, 'me');
      if (this.mode === 'online') {
        const end = origin.clone().addScaledVector(dir, 2);
        NET.emit('fire', { o: this.v3(origin), e: this.v3(end), w: 3 });
      }
    } else {
      for (let p = 0; p < w.pellets; p++) {
        const dir = this.aimDir(w.spread + moveSpread);
        const hit = this.raycastShot(origin, dir, w.range, 'me');
        let end = hit ? hit.point : origin.clone().addScaledVector(dir, w.range);
        const mzl = this.muzzleWorld();
        VFX.tracer(mzl, end, w.tracerColor);
        if (hit) {
          if (hit.actor && hit.actor !== this) {
            let dmg = w.dmg;
            if (w.id === 'trumpet') dmg *= Math.max(0.35, 1 - hit.distance / w.range);
            this.applyDamage(hit.actor, dmg, this, hit.point);
          } else {
            VFX.spark(hit.point, 0xaab0c0, 4, 5);
          }
        }
        if (this.mode === 'online' && p === 0) {
          NET.emit('fire', { o: this.v3(mzl), e: this.v3(end), w: this.weaponIdx });
        }
      }
      VFX.flash(this.muzzleWorld(), w.tracerColor, 1.6, 6);
    }
    if (st.mag === 0) this.tryReload();
    this.updateHud();
  }

  v3(v) { return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]; }

  aimDir(spread) {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    if (spread > 0) {
      dir.x += (Math.random() - 0.5) * spread * 2;
      dir.y += (Math.random() - 0.5) * spread * 2;
      dir.z += (Math.random() - 0.5) * spread * 2;
      dir.normalize();
    }
    return dir;
  }

  muzzleWorld() {
    const vm = this.viewModels[this.weaponIdx];
    const p = new THREE.Vector3(0, 0, -0.6);
    vm.localToWorld(p);
    return p;
  }

  updateRockets(dt) {
    for (let i = VFX.rockets.length - 1; i >= 0; i--) {
      const r = VFX.rockets[i];
      r.life -= dt;
      const step = r.vel.clone().multiplyScalar(dt);
      r.mesh.position.add(step);
      const p = r.mesh.position;
      let boom = r.life <= 0 || p.y <= 0.05;
      if (!boom) {
        for (const c of this.world.colliders) {
          if (p.x > c.minX && p.x < c.maxX && p.y > c.minY && p.y < c.maxY && p.z > c.minZ && p.z < c.maxZ) { boom = true; break; }
        }
      }
      if (!boom) {
        for (const t of this.allCombatants()) {
          if ((r.ownerId === 'me' && t === this) || t.id === r.ownerId) continue;
          const ep = t === this ? this.eyePos() : t.eyePos();
          if (p.distanceTo(ep) < 1.2 || p.distanceTo(t === this ? this.pos : t.pos) < 1.2) { boom = true; break; }
        }
        for (const rm of this.remotes.values()) {
          if (rm.id === r.ownerId || !rm.alive) continue;
          if (p.distanceTo(rm.eyePos()) < 1.3) { boom = true; break; }
        }
      }
      if (boom) {
        this.explode(p.clone(), r.ownerId);
        this.scene.remove(r.mesh);
        VFX.rockets.splice(i, 1);
      }
    }
  }

  explode(p, ownerId) {
    VFX.explosion(p);
    AUDIO.explosion();
    const w = WEAPONS[3];
    const attacker = ownerId === 'me' ? this : (this.bots.find(b => b.id === ownerId) || this.remotes.get(ownerId) || null);
    // damage bots + remote players (only if we own the rocket)
    if (ownerId === 'me') {
      for (const b of this.bots) {
        if (!b.alive) continue;
        const d = p.distanceTo(b.eyePos());
        if (d < w.splash) this.applyDamage(b, w.dmg * Math.max(0.2, 1 - d / w.splash), this, b.eyePos());
      }
      for (const rm of this.remotes.values()) {
        if (!rm.alive) continue;
        const d = p.distanceTo(rm.eyePos());
        if (d < w.splash) this.applyDamage(rm, w.dmg * Math.max(0.2, 1 - d / w.splash), this, rm.eyePos());
      }
    }
    // self knockback + self damage (rocket jump!)
    const dSelf = p.distanceTo(this.eyePos());
    if (dSelf < w.splash + 1) {
      const push = new THREE.Vector3().subVectors(this.eyePos(), p).normalize().multiplyScalar(Math.max(0, 1 - dSelf / (w.splash + 1)) * 16);
      this.vel.add(push);
      if (ownerId === 'me' && this.alive && dSelf < w.splash * 0.7) {
        this.takeDamage(Math.round(20 * (1 - dSelf / w.splash)), { name: this.callsign });
      } else if (attacker && attacker !== this && this.alive && dSelf < w.splash && ownerId !== 'me' && !(attacker instanceof RemoteAvatar)) {
        this.takeDamage(Math.round(w.dmg * Math.max(0.2, 1 - dSelf / w.splash)), attacker);
      }
    }
  }

  /* ── HUD ── */
  buildWeaponRow() {
    const row = $('weapon-row');
    row.innerHTML = '';
    WEAPONS.forEach((w, i) => {
      const d = document.createElement('div');
      d.className = 'wpip' + (i === this.weaponIdx ? ' sel' : '');
      d.textContent = w.icon;
      row.appendChild(d);
    });
  }

  updateHud() {
    $('hp-num').textContent = Math.max(0, Math.ceil(this.hp));
    const bar = $('hp-bar');
    bar.style.width = `${Math.max(0, this.hp)}%`;
    bar.classList.toggle('low', this.hp < 35);
    const w = WEAPONS[this.weaponIdx], st = this.wstate[this.weaponIdx];
    $('weapon-name').textContent = w.name;
    $('ammo-mag').textContent = st.reloadT > 0 ? '––' : st.mag;
    $('ammo-max').textContent = w.mag;
    $('match-score').textContent = this.kills;
    [...$('weapon-row').children].forEach((el, i) => el.classList.toggle('sel', i === this.weaponIdx));
  }

  killfeed(killer, victim, icon, mine, meVictim) {
    const el = document.createElement('div');
    el.className = 'kf' + (mine ? ' me' : '');
    el.innerHTML = `<span class="k">${killer}</span><span class="w">${icon}</span><span class="v">${meVictim ? 'YOU' : victim}</span>`;
    $('killfeed').prepend(el);
    while ($('killfeed').children.length > 5) $('killfeed').lastChild.remove();
    setTimeout(() => el.remove(), 6000);
  }

  showHitmarker(kill) {
    const hm = $('hitmarker');
    hm.classList.remove('hidden');
    hm.classList.toggle('kill', !!kill);
    clearTimeout(this._hmT);
    this._hmT = setTimeout(() => hm.classList.add('hidden'), kill ? 300 : 120);
  }

  centerMsg(text, dur) {
    const el = $('center-msg');
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(this._cmT);
    this._cmT = setTimeout(() => el.classList.add('hidden'), dur * 1000);
  }

  updateScoreboard() {
    const rows = [];
    rows.push({ name: this.callsign, k: this.kills, d: this.deaths, me: true });
    for (const b of this.bots) rows.push({ name: b.name, k: b.kills, d: b.deaths });
    for (const r of this.remotes.values()) rows.push({ name: r.name, k: r.kills, d: r.deaths });
    rows.sort((a, b) => b.k - a.k);
    $('score-table').innerHTML =
      '<tr><th>PLAYER</th><th>ELIMS</th><th>DEATHS</th></tr>' +
      rows.map(r => `<tr class="${r.me ? 'me' : ''}"><td>${r.name}</td><td>${r.k}</td><td>${r.d}</td></tr>`).join('');
  }

  /* ── main loop ── */
  frame(ts) {
    const dt = Math.min(0.04, (ts - this.lastTs) / 1000 || 0.016);
    this.lastTs = ts;
    this.time += dt;

    const beat = AUDIO.enabled ? AUDIO.beatPhase() : (this.time * 2) % 1;

    if (this.state === 'playing' || this.state === 'dead') {
      this.update(dt);
    }
    for (const r of this.remotes.values()) r.update(dt);
    this.world.update(dt, this.time, beat);
    VFX.update(dt);
    this.updateRockets(dt);

    // beat ring pulse near the crosshair
    if (this.state === 'playing') {
      $('beat-ring').classList.toggle('pulse', beat < 0.14 || beat > 0.86);
    }

    // camera
    const crouch = this.sliding > 0 ? 0.55 : 0;
    this.crouchLerp += (crouch - this.crouchLerp) * Math.min(1, dt * 10);
    this.camera.position.set(this.pos.x, this.pos.y + this.eyeH - this.crouchLerp, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

    // view model animation
    const vm = this.viewModels[this.weaponIdx];
    if (vm) {
      const speed = new THREE.Vector2(this.vel.x, this.vel.z).length();
      this.bobT += dt * (4 + speed * 1.1);
      const bob = this.grounded ? Math.sin(this.bobT) * 0.006 * Math.min(1, speed / 6) : 0;
      this.vmKick = Math.max(0, this.vmKick - dt * 7);
      const k = this.vmKick;
      const zoomIn = this.zoomed ? 1 : 0;
      vm.position.set(
        0.3 - zoomIn * 0.3,
        -0.26 + bob + k * 0.03 - zoomIn * 0.09,
        -0.55 + k * 0.12
      );
      vm.rotation.set(k * 0.35 + bob * 0.6, 0, 0);
    }

    // zoom fov
    const w = WEAPONS[this.weaponIdx];
    const wantZoom = !!(w.zoom && this.input.aim && this.state === 'playing');
    if (wantZoom !== this.zoomed) this.zoomed = wantZoom;
    const targetFov = this.zoomed ? 30 : 75;
    if (Math.abs(this.camera.fov - targetFov) > 0.5) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 12);
      this.camera.updateProjectionMatrix();
    }

    // crosshair spread
    this.spread = Math.max(0, this.spread - dt * 2.2);
    const sp = 4 + this.spread * 16 + Math.min(12, new THREE.Vector2(this.vel.x, this.vel.z).length() * 0.9);
    $('crosshair').style.setProperty('--sp', sp + 'px');

    if (!$('scoreboard').classList.contains('hidden')) this.updateScoreboard();

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(t => this.frame(t));
  }

  update(dt) {
    // timers
    if (this.spawnProt > 0) this.spawnProt -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    const st = this.wstate[this.weaponIdx];
    if (st.cd > 0) st.cd -= dt;
    if (st.reloadT > 0) {
      st.reloadT -= dt;
      if (st.reloadT <= 0) { st.mag = WEAPONS[this.weaponIdx].mag; this.updateHud(); }
    }

    // match clock
    if (this.mode === 'bots') {
      this.matchTime -= dt;
      if (this.matchTime <= 0) {
        const topBot = Math.max(0, ...this.bots.map(b => b.kills));
        this.endMatch(this.kills >= topBot, 'CURFEW — SHOW OVER');
        return;
      }
      const m = Math.max(0, this.matchTime);
      $('match-time').textContent = `${(m / 60) | 0}:${String((m % 60) | 0).padStart(2, '0')}`;
    } else {
      this.matchTime += dt;
      $('match-time').textContent = `${(this.matchTime / 60) | 0}:${String((this.matchTime % 60) | 0).padStart(2, '0')}`;
    }

    // dead → respawn
    if (!this.alive) {
      this.respawnT -= dt;
      $('rs-count').textContent = ` ${Math.ceil(Math.max(0, this.respawnT))}`;
      if (this.respawnT <= 0) this.respawnPlayer();
    } else {
      // hp regen out of combat
      if (this.time - this.lastCombat > 5 && this.hp < 100) {
        this.hp = Math.min(100, this.hp + dt * 9);
        this.updateHud();
      }

      // movement
      const wish = this.wishDir();
      let speed = 7.2;
      if (this.sliding > 0) {
        this.sliding -= dt;
        this.vel.x = this.slideDir.x * (7 + this.sliding * 8);
        this.vel.z = this.slideDir.z * (7 + this.sliding * 8);
      } else {
        const accel = this.grounded ? 10 : 3;
        this.vel.x += (wish.x * speed - this.vel.x) * Math.min(1, dt * accel);
        this.vel.z += (wish.z * speed - this.vel.z) * Math.min(1, dt * accel);
      }
      this.vel.y -= 26 * dt;
      this.grounded = this.moveWithCollisions(this.pos, this.vel, dt, 0.45, 1.8);
      this.checkJumpPad(this);

      // auto fire
      if (this.input.fire && WEAPONS[this.weaponIdx].auto) this.tryFire();
    }

    // bots
    for (const b of this.bots) b.update(dt);

    // presence stream
    this.netTick -= dt;
    if (this.mode === 'online' && this.netTick <= 0) {
      this.netTick = 1 / 20;
      this.pushPresence();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.GAME = new Game();
});
