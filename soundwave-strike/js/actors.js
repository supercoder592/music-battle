/* ── Actors: character models, bot AI, remote players ────────────────
   One soldier rig shared by bots and online opponents: CS-ish
   proportions, tactical vest, glowing visor in the actor's color,
   holding a compact brass instrument. Origin at the feet. */

const ACTOR_COLORS = [0xff3da0, 0x3de8ff, 0xffc24d, 0x7dff8a, 0xb78bff, 0xff6a5e, 0x6ab8ff, 0xffe95e];
const BOT_NAMES = ['Staccato', 'Vibrato', 'Fortissimo', 'DaCapo', 'Tremolo', 'Marcato', 'Rubato', 'Sforzando'];

function buildSoldier(colorHex) {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.9 });
  const vest = new THREE.MeshStandardMaterial({ color: 0x1b1d24, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x8a7364, roughness: 0.8 });
  const accent = new THREE.MeshBasicMaterial({ color: colorHex });

  const parts = {};

  // legs
  parts.legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.86, 0.26), cloth);
  parts.legL.position.set(-0.15, 0.43, 0);
  parts.legR = parts.legL.clone();
  parts.legR.position.x = 0.15;
  g.add(parts.legL, parts.legR);
  // boots
  for (const s of [-1, 1]) {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.36), vest);
    boot.position.set(s * 0.15, 0.07, -0.04);
    g.add(boot);
  }

  // torso + vest
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.32), cloth);
  torso.position.y = 1.16;
  g.add(torso);
  const vestM = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.44, 0.38), vest);
  vestM.position.y = 1.2;
  g.add(vestM);
  // chest light + shoulder stripes in team color
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.02), accent);
  chest.position.set(-0.16, 1.32, -0.2);
  g.add(chest);
  for (const s of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.3), accent);
    stripe.position.set(s * 0.32, 1.42, 0);
    g.add(stripe);
  }

  // arms (aim group swivels with pitch)
  parts.aim = new THREE.Group();
  parts.aim.position.set(0, 1.36, 0);
  g.add(parts.aim);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.5), cloth);
    arm.position.set(s * 0.24, -0.06, -0.22);
    parts.aim.add(arm);
  }
  // held instrument: compact horn
  const horn = new THREE.Group();
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), GOLD);
  pipe.rotation.x = Math.PI / 2;
  horn.add(pipe);
  const hbell = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.04, 0.16, 10, 1, true), GOLD);
  hbell.rotation.x = -Math.PI / 2;
  hbell.position.z = -0.3;
  horn.add(hbell);
  horn.position.set(0.06, -0.08, -0.42);
  parts.aim.add(horn);
  parts.muzzle = new THREE.Object3D();
  parts.muzzle.position.set(0.06, -0.08, -0.8);
  parts.aim.add(parts.muzzle);

  // head: helmet + glowing visor
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.28), skin);
  head.position.y = 1.62;
  g.add(head);
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.34), vest);
  helmet.position.y = 1.74;
  g.add(helmet);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.02), accent);
  visor.position.set(0, 1.64, -0.16);
  g.add(visor);

  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

  // invisible hitbox for hitscan
  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.85, 0.85),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.position.y = 0.925;
  g.add(hitbox);

  return { group: g, parts, hitbox };
}

function makeNameSprite(name, colorCss) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 56;
  const x = c.getContext('2d');
  x.font = '700 30px "Bai Jamjuree", sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = 'rgba(0,0,0,0.9)'; x.shadowBlur = 6;
  x.fillStyle = colorCss;
  x.fillText(name.slice(0, 14), 128, 28);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  sp.scale.set(1.7, 0.37, 1);
  sp.position.y = 2.15;
  return sp;
}

/* ── shared actor shell ── */
class Actor {
  constructor(id, name, colorHex, scene) {
    this.id = id;
    this.name = name;
    this.colorHex = colorHex;
    this.colorCss = '#' + colorHex.toString(16).padStart(6, '0');
    const { group, parts, hitbox } = buildSoldier(colorHex);
    this.model = group;
    this.parts = parts;
    this.hitbox = hitbox;
    hitbox.userData.actorId = id;
    this.nameSprite = makeNameSprite(name, this.colorCss);
    group.add(this.nameSprite);
    scene.add(group);
    this.hp = 100;
    this.kills = 0;
    this.deaths = 0;
    this.alive = true;
    this.walkCycle = 0;
  }

  setVisible(v) { this.model.visible = v; }

  animate(dt, speed) {
    this.walkCycle += dt * Math.min(10, speed * 1.6);
    const sw = Math.sin(this.walkCycle) * Math.min(0.6, speed * 0.09);
    this.parts.legL.rotation.x = sw;
    this.parts.legR.rotation.x = -sw;
  }

  dispose(scene) {
    scene.remove(this.model);
  }
}

/* ── Bot AI: free-for-all deathmatch brain ── */
class Bot extends Actor {
  constructor(id, name, colorHex, scene, game, opts = {}) {
    super(id, name, colorHex, scene);
    this.game = game;
    this.dummy = !!opts.dummy;   // training target: never moves, never fights back
    this.post = opts.post || null;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = Math.random() * Math.PI * 2;
    this.targetYaw = this.yaw;
    this.nav = null;
    this.navTimer = 0;
    this.thinkTimer = Math.random() * 0.25;
    this.fireTimer = 1 + Math.random();
    this.burst = 0;
    this.strafeDir = 1;
    this.enemy = null;
    this.respawnTimer = 0;
    this.aimPitch = 0;
    this.skill = 0.55 + Math.random() * 0.35;
    // every bot plays its own instrument (tracer color / killfeed / sound)
    this.w = [0, 1, 2, 3, 7][(Math.random() * 5) | 0];
    this.ctl = 0; // podium seconds (hall)
    this.respawn();
  }

  respawn() {
    const s = this.dummy ? this.post : this.game.pickSpawn();
    this.pos.set(s.x, s.y, s.z);
    this.vel.set(0, 0, 0);
    this.hp = 100;
    this.alive = true;
    this.setVisible(true);
    this.nav = null;
    this.enemy = null;
    if (this.dummy) {
      this.model.position.copy(this.pos);
      VFX.ring(new THREE.Vector3(this.pos.x, this.pos.y + 0.2, this.pos.z), 0xffc24d, 3);
    }
  }

  die() {
    this.alive = false;
    this.deaths++;
    this.setVisible(false);
    this.respawnTimer = this.dummy ? 2 : 3;
    VFX.noteBurst(this.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), this.colorHex, 5);
    VFX.spark(this.pos.clone().add(new THREE.Vector3(0, 1, 0)), this.colorHex, 16, 6);
  }

  eyePos() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z); }

  update(dt) {
    const g = this.game;
    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawn();
      return;
    }

    if (this.dummy) {
      // practice target: hold the post, always face the player
      const to = new THREE.Vector3().subVectors(g.pos, this.pos);
      this.yaw = Math.atan2(-to.x, -to.z);
      this.model.position.copy(this.pos);
      this.model.rotation.y = this.yaw;
      return;
    }

    this.thinkTimer -= dt;
    if (this.thinkTimer <= 0) {
      this.thinkTimer = 0.22;
      this.think();
    }

    // steering
    let wish = new THREE.Vector3();
    if (this.enemy) {
      const to = new THREE.Vector3().subVectors(this.enemy.pos, this.pos);
      const dist = to.length();
      to.y = 0; to.normalize();
      this.targetYaw = Math.atan2(-to.x, -to.z);
      // keep mid range + strafe
      if (dist > 26) wish.add(to);
      else if (dist < 9) wish.addScaledVector(to, -1);
      wish.add(new THREE.Vector3(-to.z, 0, to.x).multiplyScalar(this.strafeDir * 0.8));
      this.aimPitch = Math.atan2((this.enemy.pos.y + 1.3) - (this.pos.y + 1.6), dist);
    } else if (this.nav) {
      const to = new THREE.Vector3(this.nav.x - this.pos.x, 0, this.nav.z - this.pos.z);
      if (to.length() < 2.5 || this.navTimer <= 0) this.nav = null;
      else {
        to.normalize();
        wish.add(to);
        this.targetYaw = Math.atan2(-to.x, -to.z);
      }
      this.navTimer -= dt;
      this.aimPitch *= 0.9;
    }

    // smooth turn
    let dy = this.targetYaw - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += dy * Math.min(1, dt * (this.enemy ? 7 : 4));

    // physics (same collision as the player)
    if (wish.lengthSq() > 0) wish.normalize();
    // precipice avoidance: don't walk onto a drop unless a bridge carries it
    if (g.world.podium && wish.lengthSq() > 0) {
      const ax = this.pos.x + wish.x * 1.5, az = this.pos.z + wish.z * 1.5;
      if (g.world.groundY(ax, az) < -1 && this.pos.y > -1) {
        let onBridge = false;
        for (const c of g.world.colliders) {
          if (ax > c.minX && ax < c.maxX && az > c.minZ && az < c.maxZ && c.maxY >= -0.2 && c.maxY <= 0.8) { onBridge = true; break; }
        }
        if (!onBridge) {
          // slide along the rim instead
          const tx = -wish.z, tz = wish.x;
          wish.set(tx * this.strafeDir, 0, tz * this.strafeDir);
        }
      }
    }
    const speed = 5.4;
    this.vel.x += (wish.x * speed - this.vel.x) * Math.min(1, dt * 8);
    this.vel.z += (wish.z * speed - this.vel.z) * Math.min(1, dt * 8);
    this.vel.y -= 26 * dt;
    const grounded = g.moveWithCollisions(this.pos, this.vel, dt, 0.42, 1.8);
    if (grounded && this.enemy && Math.random() < dt * 0.35) this.vel.y = 8.5; // combat hop
    g.checkJumpPad(this);

    // the precipice spares no one
    if (this.pos.y < -5) {
      this.die();
      g.killfeed('THE PRECIPICE', this.name, '🕳️', false);
      return;
    }
    // contest the podium
    if (g.world.podium && g.mode !== 'training' &&
        Math.hypot(this.pos.x, this.pos.z) <= g.world.podium.r && this.pos.y > 0.3) {
      this.ctl += dt;
    }

    // firing
    if (this.enemy) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        if (this.burst > 0) {
          this.burst--;
          this.fireTimer = 0.13;
          this.shootAt(this.enemy);
        } else {
          this.burst = 2 + (Math.random() * 3 | 0);
          this.fireTimer = 0.55 + Math.random() * 0.7 * (1.4 - this.skill);
        }
      }
    }

    // pose
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.yaw;
    this.parts.aim.rotation.x = this.aimPitch;
    this.animate(dt, new THREE.Vector2(this.vel.x, this.vel.z).length());
  }

  think() {
    const g = this.game;
    // choose nearest visible enemy among all combatants
    let best = null, bestD = 55;
    for (const other of g.allCombatants()) {
      if (other === this || !other.alive) continue;
      const d = this.pos.distanceTo(other.pos);
      if (d < bestD && g.hasLineOfSight(this.eyePos(), other.eyePos())) {
        best = other; bestD = d;
      }
    }
    this.enemy = best;
    if (Math.random() < 0.3) this.strafeDir *= -1;
    if (!this.enemy && !this.nav) {
      // on the hall map, bots want the podium (KOTH); elsewhere they roam
      if (g.world.podium && g.mode !== 'training' && Math.random() < 0.45) {
        this.nav = g.world.navPoints[0];
      } else {
        this.nav = g.world.navPoints[(Math.random() * g.world.navPoints.length) | 0];
      }
      this.navTimer = 9;
    }
  }

  shootAt(target) {
    const g = this.game;
    const from = this.eyePos();
    const to = target.eyePos().clone();
    // lead + error scaled by skill and distance
    const dist = from.distanceTo(to);
    const err = (1.15 - this.skill) * (0.35 + dist * 0.045);
    to.x += (Math.random() - 0.5) * err;
    to.y += (Math.random() - 0.5) * err;
    to.z += (Math.random() - 0.5) * err;
    const dir = to.sub(from).normalize();
    const wDef = WEAPONS[this.w];
    const hit = g.raycastShot(from, dir, 70, this.id);
    const end = hit ? hit.point : from.clone().addScaledVector(dir, 70);
    const mzl = new THREE.Vector3();
    this.parts.muzzle.getWorldPosition(mzl);
    VFX.tracer(mzl, end, wDef.tracerColor);
    VFX.flash(mzl, wDef.tracerColor, 1.2, 5);
    // their instrument, audible when the fight is near
    if (dist < 55 && Math.random() < 0.45) wDef.sfx();
    if (hit && hit.actor) g.applyDamage(hit.actor, 7, this, hit.point);
    else if (hit) VFX.spark(hit.point, 0xaab0c0, 4, 5);
  }
}

/* ── Remote player avatar (online) ── */
class RemoteAvatar extends Actor {
  constructor(id, name, colorHex, scene) {
    super(id, name, colorHex, scene);
    this.pos = new THREE.Vector3(0, -50, 0);
    this.snaps = [];       // interpolation buffer {t, x,y,z, yaw, pitch}
    this.lastSpeed = 0;
    this.setVisible(false);
  }

  pushSnap(s) {
    s.t = performance.now() / 1000;
    this.snaps.push(s);
    if (this.snaps.length > 20) this.snaps.shift();
  }

  update(dt) {
    if (!this.alive) { this.setVisible(false); return; }
    const renderT = performance.now() / 1000 - 0.13; // interpolation delay
    const s = this.snaps;
    if (s.length === 0) return;
    let a = s[0], b = s[s.length - 1];
    for (let i = 0; i < s.length - 1; i++) {
      if (s[i].t <= renderT && s[i + 1].t >= renderT) { a = s[i]; b = s[i + 1]; break; }
    }
    const span = Math.max(0.001, b.t - a.t);
    const f = Math.min(1, Math.max(0, (renderT - a.t) / span));
    const nx = a.x + (b.x - a.x) * f;
    const ny = a.y + (b.y - a.y) * f;
    const nz = a.z + (b.z - a.z) * f;
    this.lastSpeed = new THREE.Vector2(nx - this.pos.x, nz - this.pos.z).length() / Math.max(dt, 0.001);
    this.pos.set(nx, ny, nz);
    let dyaw = b.yaw - a.yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    const yaw = a.yaw + dyaw * f;
    const pitch = a.pitch + (b.pitch - a.pitch) * f;
    this.model.position.copy(this.pos);
    this.model.rotation.y = yaw;
    this.parts.aim.rotation.x = pitch;
    this.setVisible(true);
    this.animate(dt, this.lastSpeed);
  }

  eyePos() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z); }
}
