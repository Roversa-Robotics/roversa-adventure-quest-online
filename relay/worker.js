// The Dice Quest relay: a Cloudflare Worker that passes moves between the
// devices playing one game. Each game is one Durable Object, named by its
// 4-picture code. Game rules live in the browser; see relay/room.js for what
// the relay keeps and README.md ("Playing on several devices") for setup.
//
// Nothing about players is kept: no names, no accounts, no logs. A game is
// deleted 10 minutes after its last device leaves.
import { DurableObject } from 'cloudflare:workers';
import './room.js';

const { Room } = globalThis.RoversaRoom;
const MAX_MESSAGE = 4096; // bytes; the biggest real message is well under 1 KB
const MAX_PER_10S = 60; // messages per device; arranging pieces sends a few a second at most

function allowedOrigin(env, origin) {
  const list = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return !origin || !list.length || list.includes(origin);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin');
    const cors = origin && allowedOrigin(env, origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    // The game checks this before showing the join screens, to tell
    // "can't connect" apart from "too many games right now".
    if (url.pathname === '/v1/health') return new Response('ok', { headers: Object.assign({ 'Cache-Control': 'no-store' }, cors) });
    const m = url.pathname.match(/^\/v1\/room\/([0-7]{4})$/);
    if (!m) return new Response('Not found', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    if (!allowedOrigin(env, origin)) return new Response('Forbidden', { status: 403 });
    const stub = env.ROOMS.get(env.ROOMS.idFromName('v1:' + m[1]));
    return stub.fetch(req);
  },
};

export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // Keep-alive pings are answered without waking the game up.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.room = null;
    this.rate = new Map();
  }

  async load(code) {
    if (!this.room) this.room = new Room(code, (await this.ctx.storage.get('room')) || null);
    return this.room;
  }

  async save() {
    await this.ctx.storage.put('room', this.room.state);
    const t = this.room.tick(Date.now());
    if (t.next) await this.ctx.storage.setAlarm(t.next);
  }

  async fetch(req) {
    const code = new URL(req.url).pathname.split('/').pop();
    await this.load(code);
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ seat: null, code });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  send(out) {
    const sockets = this.ctx.getWebSockets();
    for (const { to, msg } of out) {
      const text = JSON.stringify(msg);
      for (const ws of sockets) {
        const a = ws.deserializeAttachment() || {};
        if (a.seat == null || !Room.wants(to, a.seat)) continue;
        try { ws.send(text); } catch (e) { /* closing */ }
      }
    }
  }

  tooChatty(ws) {
    const now = Date.now();
    const r = this.rate.get(ws) || { since: now, n: 0 };
    if (now - r.since > 10000) { r.since = now; r.n = 0; }
    r.n++;
    this.rate.set(ws, r);
    return r.n > MAX_PER_10S;
  }

  async webSocketMessage(ws, data) {
    if (typeof data !== 'string' || data.length > MAX_MESSAGE || this.tooChatty(ws)) { ws.close(1009, 'too much'); return; }
    let msg;
    try { msg = JSON.parse(data); } catch (e) { return; }
    const a = ws.deserializeAttachment() || {};
    const room = await this.load(a.code);
    const now = Date.now();
    if (a.seat == null) {
      if (!msg || msg.t !== 'hello') return;
      const res = room.join(msg, now);
      if (res.error) {
        ws.send(JSON.stringify({ t: 'error', why: res.error, v: res.v }));
        ws.close(4000, res.error);
        return;
      }
      // A refreshed page takes over its seat from the old connection.
      for (const other of this.ctx.getWebSockets()) {
        const o = other.deserializeAttachment() || {};
        if (other !== ws && o.seat === res.seat) { other.serializeAttachment({ seat: null, code: a.code }); other.close(4001, 'replaced'); }
      }
      ws.serializeAttachment({ seat: res.seat, code: a.code });
      this.send(res.out);
    } else {
      const out = room.handle(a.seat, msg, now);
      this.send(out);
      if (msg.t === 'leave') { ws.serializeAttachment({ seat: null, code: a.code }); ws.close(1000, 'left'); }
    }
    await this.save();
  }

  async gone(ws) {
    const a = ws.deserializeAttachment() || {};
    this.rate.delete(ws);
    if (a.seat == null) return;
    const room = await this.load(a.code);
    const stillHere = this.ctx.getWebSockets().some((o) => o !== ws && (o.deserializeAttachment() || {}).seat === a.seat);
    if (stillHere) return;
    this.send(room.disconnect(a.seat, Date.now()));
    await this.save();
  }

  async webSocketClose(ws) { await this.gone(ws); }
  async webSocketError(ws) { await this.gone(ws); }

  async alarm() {
    const room = await this.load(null);
    const t = room.tick(Date.now());
    this.send(t.out);
    if (t.close || t.forget) {
      for (const ws of this.ctx.getWebSockets()) { ws.serializeAttachment({ seat: null }); try { ws.close(1000, 'closed'); } catch (e) { /* already closed */ } }
    }
    if (t.forget) {
      await this.ctx.storage.deleteAll();
      this.room = null;
      return;
    }
    await this.ctx.storage.put('room', room.state);
    if (t.next) await this.ctx.storage.setAlarm(t.next);
    else if (t.close) await this.ctx.storage.setAlarm(Date.now() + 10 * 60 * 1000);
  }
}
