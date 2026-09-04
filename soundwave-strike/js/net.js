/* ── Online adapter over the artifact `room` capability ──────────────
   Real-time PvP with no game server: every viewer of the published
   page is a peer. High-rate movement rides on presence (coalesced by
   the platform ~30/s); discrete combat moments (shots, hits, deaths)
   ride on emit topics opened to all viewers at publish time.
   In the repo build `window.claude` doesn't exist → bots-only mode. */

const NET = {
  available: false,
  connected: false,
  room: null,
  myPeerId: null,
  // callbacks the game installs
  onPeersChanged: null,
  onFire: null,
  onHit: null,
  onDie: null,
  onStatus: null,

  async init() {
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      const room = await window.claude.use('room');
      if (!room) return;
      this.room = room;
      this.available = true;
      this._status();

      room.onConnection(c => {
        this.connected = c;
        this._status();
      }, () => { this.available = false; this._status(); });

      room.onPeers(change => {
        if (!this.myPeerId) {
          for (const p of change.peers) {
            if (p.isMe && p.sameTab) { this.myPeerId = p.peer; break; }
          }
        }
        if (this.onPeersChanged) this.onPeersChanged(change);
      }, () => {});

      room.on('fire', m => { if (!m.sameTab && this.onFire) this.onFire(m); }, () => {});
      room.on('hit', m => { if (!m.sameTab && this.onHit) this.onHit(m); }, () => {});
      room.on('die', m => { if (!m.sameTab && this.onDie) this.onDie(m); }, () => {});
    } catch (e) {
      this.available = false;
    }
  },

  _status() { if (this.onStatus) this.onStatus(); },

  peers() { return this.room ? this.room.peers() : []; },

  /* count of OTHER viewers currently in the room */
  otherViewers() {
    let n = 0;
    for (const p of this.peers()) {
      if (!p.isMe && p.kind === 'viewer') n++;
    }
    return n;
  },

  presence(patch) {
    if (this.room) this.room.presence(patch).catch(() => {});
  },

  emit(topic, data) {
    if (this.room) this.room.emit(topic, data).catch(() => {});
  },
};
