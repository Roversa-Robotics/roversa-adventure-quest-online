// One Dice Quest game played on several devices: who is in it, and the list of
// moves so far. No network code, so the Cloudflare relay (relay/worker.js), the
// in-browser test relay (js/net.js) and tools/check-relay.js share it.
//
// The room does not know the game's rules. It keeps seats, checks whose
// message is allowed, numbers the moves and remembers them so a device that
// drops can catch up. Each device replays the moves with js/engine.js.
//
// Every method returns a list of messages to send: { to, msg } where `to` is a
// seat number, 'all', or { not: seat } (everyone else).
(function (root) {
  'use strict';

  const MAX_SEATS = 4;
  const MIN = 60 * 1000;
  const LOBBY_MS = 15 * MIN; // a game nobody starts closes after 15 minutes
  const IDLE_MS = 20 * MIN; // a started game with no moves for 20 minutes closes
  const EMPTY_MS = 10 * MIN; // kept this long after the last device disconnects
  const MAX_MS = 3 * 60 * MIN; // no game lasts longer than 3 hours
  const MAX_LOG = 3000;
  const COSTUMES = ['octopus', 'turtle', 'monkey', 'tiger', 'elephant', 'manatee'];
  const GAME_EVENTS = ['roll', 'go', 'skip'];

  function newToken() {
    const c = root.crypto;
    if (c && c.randomUUID) return c.randomUUID();
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }

  class Room {
    // `state` is what was saved before (relay/worker.js keeps it between messages).
    constructor(code, state) {
      this.s = state || { code, v: null, created: 0, active: 0, started: false, closed: null, seats: [], log: [], turn: 0, emptySince: null };
    }

    get state() { return this.s; }
    get exists() { return this.s.seats.length > 0 && !this.s.closed; }

    seat(n) { return this.s.seats.find((p) => p.seat === n); }
    // Seats still in the game: in the lobby, players who left are dropped.
    present() { return this.s.seats.filter((p) => !p.left); }

    publicSeats() {
      return this.present().map((p) => ({ seat: p.seat, costume: p.costume, connected: p.connected, host: p.seat === 0 }))
        .concat(this.s.seats.filter((p) => p.left && this.s.started).map((p) => ({ seat: p.seat, costume: p.costume, connected: false, left: true })));
    }

    snapshot(seat, token) {
      const s = this.s;
      return { t: 'welcome', seat, token, code: s.code, v: s.v, started: s.started, turn: s.turn, seats: this.publicSeats(), log: s.log };
    }

    seatsMsg() { return { to: 'all', msg: { t: 'seats', seats: this.publicSeats() } }; }

    // The first message from a device: { t: 'hello', v, create, token }.
    // Returns { error, v } or { seat, out }.
    join(hello, now) {
      const s = this.s;
      const v = Number(hello && hello.v) || 0;
      if (hello.create) {
        if (this.exists) return { error: 'taken' };
        this.s = { code: s.code, v, created: now, active: now, started: false, closed: null, seats: [], log: [], turn: 0, emptySince: null };
        const token = newToken();
        this.s.seats.push({ seat: 0, token, costume: null, connected: true, left: false });
        return { seat: 0, out: [{ to: 0, msg: this.snapshot(0, token) }] };
      }
      if (!this.exists) return { error: 'nogame' };
      if (v !== s.v) return { error: 'version', v: s.v };
      const back = hello.token && s.seats.find((p) => p.token === hello.token && !p.left);
      if (back) {
        back.connected = true;
        s.emptySince = null;
        return { seat: back.seat, out: [{ to: back.seat, msg: this.snapshot(back.seat, back.token) }, this.seatsMsg()] };
      }
      if (s.started) return { error: 'started' };
      if (this.present().length >= MAX_SEATS) return { error: 'full' };
      const seat = s.seats.reduce((m, p) => Math.max(m, p.seat), -1) + 1;
      const token = newToken();
      s.seats.push({ seat, token, costume: null, connected: true, left: false });
      s.emptySince = null;
      return { seat, out: [{ to: seat, msg: this.snapshot(seat, token) }, this.seatsMsg()] };
    }

    // Any later message from a seated device.
    handle(n, msg, now) {
      const s = this.s;
      const me = this.seat(n);
      if (!me || me.left || s.closed || !msg) return [];
      switch (msg.t) {
        case 'costume': {
          if (s.started || !COSTUMES.includes(msg.id)) return [];
          if (this.present().some((p) => p.seat !== n && p.costume === msg.id)) return [{ to: n, msg: { t: 'costumeTaken', id: msg.id } }];
          me.costume = msg.id;
          return [this.seatsMsg()];
        }
        case 'start': {
          // Only the player who made the game starts it (and starts the next one).
          if (n !== 0) return [];
          const players = this.present().filter((p) => p.costume).map((p) => ({ seat: p.seat, costume: p.costume }));
          if (players.length < 2 || !Array.isArray(msg.map) || msg.map.length > 16) return [];
          s.started = true;
          s.turn = 0;
          s.active = now;
          s.log = [{ t: 'start', n: 0, map: msg.map.map(String), players }];
          return [{ to: 'all', msg: { t: 'ev', ev: s.log[0] } }];
        }
        case 'ev': {
          const ev = msg.ev || {};
          if (!s.started || !GAME_EVENTS.includes(ev.t)) return [];
          // A move made for a turn that already ended (say, it was skipped while
          // this device was offline) is refused, and the device catches up.
          if (ev.turn !== s.turn || s.log.length >= MAX_LOG) return [{ to: n, msg: this.snapshot(n, me.token) }];
          const out = { t: ev.t, n: s.log.length, seat: n, turn: s.turn, id: String(ev.id || '') };
          if (ev.t === 'roll') out.faces = (ev.faces || []).slice(0, 5).map(String);
          if (ev.t === 'go') out.program = (ev.program || []).slice(0, 5).map((p) => ({ t: String(p.t), chosen: p.chosen ? String(p.chosen) : undefined }));
          if (ev.t === 'skip') out.who = Number(ev.who);
          if (ev.t === 'go' || ev.t === 'skip') s.turn++;
          s.log.push(out);
          s.active = now;
          return [{ to: 'all', msg: { t: 'ev', ev: out } }];
        }
        case 'live':
          // The pieces being arranged right now, so others can watch. Not saved.
          if (!s.started) return [];
          return [{ to: { not: n }, msg: { t: 'live', seat: n, turn: s.turn, program: (msg.program || []).slice(0, 5), tray: (msg.tray || []).slice(0, 5) } }];
        case 'leave': return this.leave(n, now);
        case 'sync': return [{ to: n, msg: this.snapshot(n, me.token) }];
        default: return [];
      }
    }

    leave(n, now) {
      const s = this.s;
      const me = this.seat(n);
      if (!me || me.left) return [];
      me.left = true;
      me.connected = false;
      if (!s.started) {
        // The host leaving the lobby ends the game for everyone.
        if (n === 0) return this.close('hostLeft');
        s.seats = s.seats.filter((p) => p !== me);
        return [this.seatsMsg()];
      }
      const ev = { t: 'leave', n: s.log.length, seat: n };
      s.log.push(ev);
      s.active = now;
      return [{ to: 'all', msg: { t: 'ev', ev } }, this.seatsMsg()];
    }

    // A device's connection closed (it may come back with its token).
    disconnect(n, now) {
      const me = this.seat(n);
      if (!me || !me.connected) return [];
      me.connected = false;
      if (!this.s.seats.some((p) => p.connected)) this.s.emptySince = now;
      return [this.seatsMsg()];
    }

    close(why) {
      this.s.closed = why;
      this.s.seats.forEach((p) => { p.connected = false; });
      return [{ to: 'all', msg: { t: 'closed', why } }];
    }

    // Checked by a timer. Returns { out, close, forget } and when to check next.
    tick(now) {
      const s = this.s;
      if (!s.seats.length || s.closed) return { forget: true, out: [] };
      if (s.emptySince != null && now - s.emptySince >= EMPTY_MS) return { forget: true, out: this.close('empty') };
      if (!s.started && now - s.created >= LOBBY_MS) return { close: true, out: this.close('lobby') };
      if (s.started && now - s.active >= IDLE_MS) return { close: true, out: this.close('idle') };
      if (now - s.created >= MAX_MS) return { close: true, out: this.close('idle') };
      const next = [s.started ? s.active + IDLE_MS : s.created + LOBBY_MS, s.created + MAX_MS];
      if (s.emptySince != null) next.push(s.emptySince + EMPTY_MS);
      return { out: [], next: Math.min.apply(null, next) };
    }

    // Where a message goes: does seat n get it?
    static wants(to, n) {
      if (to === 'all') return true;
      if (typeof to === 'number') return to === n;
      return !!to && to.not !== n;
    }
  }

  const api = { Room, MAX_SEATS, LOBBY_MS, IDLE_MS, EMPTY_MS, MAX_MS, COSTUMES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.RoversaRoom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
