// Talking to the Dice Quest relay, for games played on several devices.
// Nothing here runs until a player taps "Play on 2-4 devices", so the rest of
// the game works the same when the relay can't be reached.
//
// Where the relay is:
// - RELAY below. .github/workflows/pages.yml fills it in from the repository
//   variable RELAY_URL. While it is empty, the button stays hidden.
// - For testing, ?relay=<address> in the page link (kept for the visit), or
//   ?relay=local: browser tabs on one computer play each other with no relay.
(function (root) {
  'use strict';

  // Bump whenever the messages between devices change (see relay/room.js).
  // Devices on different versions can't join each other's games.
  const VERSION = 1;
  const RELAY = '__RELAY_URL__';
  const RECONNECT_FOR_MS = 2 * 60 * 1000; // then the game says the connection is lost
  const HELLO_MS = 8000;
  const PING_MS = 25000;
  const SAVED = 'roversa-net-game';

  // The relay picked with ?relay= for this visit, if any (invites carry it along).
  function override() {
    try { return sessionStorage.getItem('roversa-relay'); } catch (e) { return null; }
  }

  function relayUrl() {
    let pick = null;
    try {
      const q = new URLSearchParams(location.search).get('relay');
      if (q) sessionStorage.setItem('roversa-relay', q);
      pick = sessionStorage.getItem('roversa-relay');
    } catch (e) { /* storage blocked */ }
    if (pick) return pick === 'local' ? 'local' : pick.replace(/\/+$/, '');
    return /^https?:\/\//.test(RELAY) ? RELAY.replace(/\/+$/, '') : null;
  }

  // Is the relay there? 'ok', 'busy' (too many games: Cloudflare's free daily
  // limit) or 'down' (offline, or blocked by the network).
  async function check() {
    const url = relayUrl();
    if (!url) return 'down';
    if (url === 'local') return 'BroadcastChannel' in root ? 'ok' : 'down';
    const ctl = 'AbortController' in root ? new AbortController() : null;
    const timer = setTimeout(() => ctl && ctl.abort(), 6000);
    try {
      const res = await fetch(url + '/v1/health', { cache: 'no-store', signal: ctl && ctl.signal });
      if (res.ok) return 'ok';
      return res.status === 429 || res.status === 503 || res.status === 1027 ? 'busy' : 'down';
    } catch (e) {
      return 'down';
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------- Test relay: tabs on one computer, no server ----------
  // The tab that makes a game runs it (relay/room.js) and passes messages
  // to the other tabs over a BroadcastChannel. Closing that tab ends it.

  const local = { rooms: new Map(), bus: null, id: Math.random().toString(36).slice(2) };

  function localBus() {
    if (local.bus) return local.bus;
    local.bus = new BroadcastChannel('roversa-relay');
    local.bus.onmessage = (e) => {
      const d = e.data || {};
      const room = local.rooms.get(d.code);
      if (d.kind === 'up' && room) room.receive(d.cid, d.data);
      if (d.kind === 'down' && local.sockets.has(d.cid)) local.sockets.get(d.cid).deliver(d.data);
      if (d.kind === 'bye' && room) room.drop(d.cid);
    };
    return local.bus;
  }
  local.sockets = new Map();

  function localRoom(code) {
    const Room = root.RoversaRoom.Room;
    const room = new Room(code);
    const conns = new Map(); // cid -> seat
    const send = (out) => out.forEach(({ to, msg }) => conns.forEach((seat, cid) => {
      if (seat != null && Room.wants(to, seat)) post(cid, msg);
    }));
    const post = (cid, msg) => {
      const sock = local.sockets.get(cid);
      if (sock) setTimeout(() => sock.deliver(JSON.stringify(msg)), 0);
      else localBus().postMessage({ kind: 'down', cid, data: JSON.stringify(msg) });
    };
    const timer = setInterval(() => {
      const t = room.tick(Date.now());
      send(t.out);
      if (t.close || t.forget) { clearInterval(timer); local.rooms.delete(code); }
    }, 5000);
    return {
      receive(cid, text) {
        const msg = JSON.parse(text);
        const now = Date.now();
        if (!conns.has(cid) || conns.get(cid) == null) {
          if (msg.t !== 'hello') return;
          const res = room.join(msg, now);
          if (res.error) { post(cid, { t: 'error', why: res.error, v: res.v }); return; }
          conns.forEach((seat, other) => { if (seat === res.seat) conns.set(other, null); });
          conns.set(cid, res.seat);
          send(res.out);
        } else {
          send(room.handle(conns.get(cid), msg, now));
          if (msg.t === 'leave') conns.delete(cid);
        }
      },
      drop(cid) {
        const seat = conns.get(cid);
        conns.delete(cid);
        if (seat != null && ![...conns.values()].includes(seat)) send(room.disconnect(seat, Date.now()));
      },
    };
  }

  // Looks like a WebSocket to the code below.
  function localSocket(code, create) {
    const cid = local.id + Math.random().toString(36).slice(2);
    const bus = localBus();
    const sock = {
      readyState: 0,
      send(text) {
        const room = local.rooms.get(code);
        if (room) room.receive(cid, text); else bus.postMessage({ kind: 'up', code, cid, data: text });
      },
      close() {
        if (sock.readyState === 3) return;
        sock.readyState = 3;
        local.sockets.delete(cid);
        const room = local.rooms.get(code);
        if (room) room.drop(cid); else bus.postMessage({ kind: 'bye', code, cid });
        setTimeout(() => sock.onclose && sock.onclose({ code: 1000 }), 0);
      },
      deliver(text) { if (sock.readyState === 1 && sock.onmessage) sock.onmessage({ data: text }); },
    };
    local.sockets.set(cid, sock);
    if (create && !local.rooms.has(code)) local.rooms.set(code, localRoom(code));
    setTimeout(() => { sock.readyState = 1; if (sock.onopen) sock.onopen(); }, 0);
    // With no tab running that game, nobody answers: the hello times out as "no game".
    sock.noAnswerMeans = 'nogame';
    return sock;
  }

  function openSocket(code, create) {
    const url = relayUrl();
    if (url === 'local') return localSocket(code, create);
    return new WebSocket(url.replace(/^http/, 'ws') + '/v1/room/' + code);
  }

  // ---------- A game connection ----------
  //
  // join({ code, create, token, on }) keeps one game's connection open,
  // reconnecting on its own. `on` gets:
  //   welcome(w)  joined (or rejoined): seat, token, seats, log, started...
  //   msg(m)      every later message from the relay
  //   status(s)   'online', 'reconnecting', or 'lost' (gave up after 2 minutes)
  //   fail(why)   could not join: 'down', 'nogame', 'full', 'started', 'taken',
  //               'version' (with the game's version), 'closed'
  //   closed(why) the relay ended the game: 'idle', 'lobby', 'hostLeft'
  function join(opts) {
    const on = opts.on;
    const conn = { code: opts.code, token: opts.token || null, seat: null, ws: null, ended: false, status: 'connecting' };
    let welcomed = false;
    let lostAt = 0;
    let retryTimer = null;
    let pingTimer = null;
    let tries = 0;

    function setStatus(s) {
      if (conn.status === s) return;
      conn.status = s;
      on.status && on.status(s);
    }

    function connect() {
      clearTimeout(retryTimer);
      let ws;
      try { ws = openSocket(conn.code, opts.create && !welcomed); } catch (e) { return dropped(); }
      conn.ws = ws;
      let answered = false;
      const helloTimer = setTimeout(() => {
        if (answered || conn.ws !== ws) return;
        if (!welcomed && ws.noAnswerMeans) { give(ws.noAnswerMeans); return; }
        ws.close();
      }, ws.noAnswerMeans ? 2500 : HELLO_MS);
      ws.onopen = () => {
        ws.send(JSON.stringify({ t: 'hello', v: VERSION, create: !!(opts.create && !welcomed), token: conn.token }));
      };
      ws.onmessage = (e) => {
        if (conn.ws !== ws || e.data === 'pong') return;
        let m;
        try { m = JSON.parse(e.data); } catch (err) { return; }
        if (m.t === 'error') {
          answered = true;
          clearTimeout(helloTimer);
          // Rejoining a game that is gone: tell the player it ended.
          if (welcomed) { end(); on.closed && on.closed(m.why === 'nogame' ? 'idle' : m.why); return; }
          give(m.why, m.v);
          return;
        }
        if (m.t === 'welcome') {
          answered = true;
          clearTimeout(helloTimer);
          welcomed = true;
          tries = 0;
          lostAt = 0;
          conn.seat = m.seat;
          conn.token = m.token;
          save(conn.code, m.token);
          setStatus('online');
          clearInterval(pingTimer);
          pingTimer = setInterval(() => { try { ws.send('ping'); } catch (err) { /* closing */ } }, PING_MS);
          on.welcome && on.welcome(m);
          return;
        }
        if (m.t === 'closed') { end(); on.closed && on.closed(m.why); return; }
        on.msg && on.msg(m);
      };
      ws.onclose = () => {
        clearTimeout(helloTimer);
        if (conn.ws !== ws) return;
        dropped();
      };
      ws.onerror = () => {};
    }

    function give(why, v) {
      end();
      on.fail && on.fail(why, v);
    }

    function dropped() {
      clearInterval(pingTimer);
      if (conn.ended) return;
      if (!welcomed) { give('down'); return; }
      if (!lostAt) lostAt = Date.now();
      if (Date.now() - lostAt > RECONNECT_FOR_MS) { setStatus('lost'); return; }
      setStatus('reconnecting');
      tries++;
      retryTimer = setTimeout(connect, Math.min(8000, 500 * Math.pow(2, tries)));
    }

    function end() {
      conn.ended = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      const ws = conn.ws;
      conn.ws = null;
      if (ws) try { ws.close(); } catch (e) { /* already closed */ }
    }

    conn.send = (msg) => {
      if (conn.ws && conn.ws.readyState === 1 && conn.status === 'online') { conn.ws.send(JSON.stringify(msg)); return true; }
      return false;
    };
    // "Try again" after the connection was lost.
    conn.retry = () => { if (conn.ended) return; lostAt = Date.now(); tries = 0; setStatus('reconnecting'); connect(); };
    conn.leave = () => { conn.send({ t: 'leave' }); forget(); end(); };
    conn.close = () => { end(); };
    connect();
    return conn;
  }

  // A refreshed page rejoins its game for a while.
  function save(code, token) {
    try { sessionStorage.setItem(SAVED, JSON.stringify({ code, token, at: Date.now() })); } catch (e) { /* storage blocked */ }
  }
  function forget() {
    try { sessionStorage.removeItem(SAVED); } catch (e) { /* storage blocked */ }
  }
  function saved() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SAVED) || 'null');
      return s && Date.now() - s.at < 30 * 60 * 1000 ? s : null;
    } catch (e) { return null; }
  }

  root.RoversaNet = { VERSION, available: () => !!relayUrl(), override, check, join, saved, forget };
})(globalThis);
