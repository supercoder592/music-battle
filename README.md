# Music Battle

Two playable browser games built from the studio's design docs:

1. **[Symphonic Fracture](#symphonic-fracture-交響奇幻聲界破滅)** (repo root) — 2D floating-instrument roguelite
2. **[Soundwave Strike](#soundwave-strike-樂浪突擊)** (`soundwave-strike/`) — 3D FPS with online PvP

---

## Soundwave Strike 樂浪突擊

A 3D first-person shooter from the Soundwave Strike proposal: instrument
guns, a rain-soaked night cargo yard under a neon skyline, and every shot
quantized to the music. Open `soundwave-strike/index.html` (serve the folder
over HTTP for module-free script loading, e.g. `python3 -m http.server`).

- **Arsenal (per the proposal's mapping):** trumpet = shotgun, snare = SMG,
  trombone = sniper (RMB zoom), tuba = rocket launcher with splash knockback
  (rocket jumps work).
- **Movement:** sprint, jump, power slide (vinyl-scratch sfx), and the
  proposal's **Beat Dash** — dash on the musical beat for bonus distance.
  Sonic jump pads launch you to catwalk height.
- **Deathmatch vs bots:** 5 AI combatants with line-of-sight checks, free-for-all
  scoring, kill feed, scoreboard, first-to-20 or 5:00.
- **Online PvP (published artifact only):** uses the artifact `room`
  capability — everyone viewing the artifact is a peer. Movement replicates
  through presence (~20 Hz), shots/hits/deaths through room events;
  damage is victim-authoritative. No game server anywhere.
- **Art:** procedural canvas textures (asphalt, concrete, ribbed containers,
  building facades), real-time shadow maps, ACES filmic tone mapping, rain,
  sodium work lights, and beat-reactive neon signage.
- **Audio:** procedural 120 BPM electro underscore; all weapon sounds are
  synthesized and quantized to E minor, with sidechain ducking on heavy hits.

Three.js r128 is vendored at `soundwave-strike/vendor/three.min.js`; the
published artifact loads the same build from cdnjs.

---

## Symphonic Fracture 交響奇幻：聲界破滅

A playable browser build of the **Symphonic Fracture** GDD — a roguelite arena
action game where every weapon is a floating classical instrument and every
fight stays in key.

**Play it:** open `index.html` in any modern browser (or serve the folder with
`python3 -m http.server` and visit `http://localhost:8000`). No build step, no
dependencies — pure Canvas 2D + Web Audio.

## The game

You are a hovering conductor on the fractured stage of a ruined neon-steampunk
concert hall. Waves of dissonance creatures pour in; your orchestra floats
around you and fights back.

| Input | Instrument | Effect |
|---|---|---|
| **LMB** (hold) | Piccolo of the Gale 🪈 | Fast sonic wind blades. Applies **Auditory Tear** (+15% damage taken). |
| **RMB** | Aureate Shockhorn 🎺 | 60° concussive cone. Massive knockback — wall slams stun and deal bonus damage. |
| **E** | Prism Chordbow 🎻 | Pure-tone laser chaining between up to 5 enemies, prefers Resonance-marked targets. |
| *(auto)* | Chromatic Chimes 🛎️ | Fires 7 bouncing Do‑Re‑Mi notes; alternating fire/ice elements. Higher pitch flies farther. |
| **Q** | Pulse Kit 🥁 | **Bass Drop** finisher: `FinalDamage = Base × (1 + debuffCount × 0.75)` per enemy, consuming their debuffs. |
| **WASD** | — | Move |
| **Space** | — | Dash (brief i-frames) |

Start with flute + drums (the GDD's MVP loadout); unlock the rest as
between-wave "encore" upgrades. Every 5th movement summons the **Maestro of
Discord**.

### Harmonic synergies (from the GDD's combo matrix)

- Wind blade on a **Blast**-marked enemy → *Wind Pressure Burst* (1.5× AoE)
- Wind blade on a **Frozen** enemy → *Ice Shatter*
- Wall-slamming an enemy carrying an element mark → detonates it
- Bass Drop on enemies with 2+ debuffs → *Harmonic* multiplier popup

## Implementation notes (per the GDD spec)

- `FloatingInstrumentBase` (`js/weapons.js`) — instruments are **not**
  attached to the player; they follow on a Unity-style critically-damped
  spring (`smoothDamp`), with recoil kick and a particle tether to the
  conductor's hand on fire.
- `HarmonicComboManager` — tracks per-enemy debuff flags
  (`tear` / `blast` / `resonance` / `burn` / `freeze`) and resolves synergy
  detonations.
- **Game feel:** hit-stop on heavy impacts, trauma-based screen shake,
  full-screen shockwave rings and flash on the Bass Drop.
- **Audio** (`js/audio.js`): fully procedural and DMCA-free. A lookahead
  scheduler plays an original Am–F–C–G underscore at 112 BPM; every combat
  sound is quantized to the game's scale so heavy fights stay musical, and a
  sidechain **duck** drops the music bus on Bass Drops and heavy hits
  (the GDD's dynamic audio matrix).
- **Art** (`js/art.js`): all vector-drawn at runtime — pre-rendered concert
  hall (balconies, broken pillars, gilded podium), rotating fractured gear
  rings, parallax dust, additive-blend glow, and per-instrument drawings.

## Files

```
index.html      page shell, HUD, menus
css/style.css   UI styling (Cinzel + Rajdhani)
js/audio.js     procedural score + SFX engine
js/art.js       background, particles, instrument/character art
js/entities.js  player, enemies, projectiles
js/weapons.js   floating instrument system + combo engine
js/game.js      main loop, waves, upgrades, HUD
```
