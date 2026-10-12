// Checks the rules the Dice Quest relay keeps for a game on several devices
// (relay/room.js): joining, the version check, whose moves count, leaving
// and the timeouts. Run with: node tools/check-relay.js
'use strict';

const assert = require('assert');
const { Room, LOBBY_MS, IDLE_MS, EMPTY_MS } = require('../relay/room.js');

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log('ok  ' + name);
}
const sent = (out, t) => out.filter((o) => o.msg.t === t);

check('making a game, and its code being taken', () => {
  const room = new Room('0123');
  const a = room.join({ t: 'hello', v: 1, create: true }, 0);
  assert.strictEqual(a.seat, 0);
  assert.strictEqual(a.out[0].msg.t, 'welcome');
  assert.deepStrictEqual(room.join({ t: 'hello', v: 1, create: true }, 1), { error: 'taken' });
});

check('joining: no game, wrong version, full, already started', () => {
  const empty = new Room('7777');
  assert.strictEqual(empty.join({ t: 'hello', v: 1 }, 0).error, 'nogame');
  const room = new Room('0123');
  room.join({ t: 'hello', v: 2, create: true }, 0);
  assert.deepStrictEqual(room.join({ t: 'hello', v: 1 }, 0), { error: 'version', v: 2 });
  for (let i = 1; i < 4; i++) assert.strictEqual(room.join({ t: 'hello', v: 2 }, 0).seat, i);
  assert.strictEqual(room.join({ t: 'hello', v: 2 }, 0).error, 'full');
  const two = new Room('0001');
  two.join({ t: 'hello', v: 1, create: true }, 0);
  two.join({ t: 'hello', v: 1 }, 0);
  two.handle(0, { t: 'costume', id: 'tiger' }, 0);
  two.handle(1, { t: 'costume', id: 'turtle' }, 0);
  two.handle(0, { t: 'start', map: ['1.......'] }, 0);
  assert.strictEqual(two.join({ t: 'hello', v: 1 }, 0).error, 'started');
});

check('costumes are one per player', () => {
  const room = new Room('0123');
  room.join({ t: 'hello', v: 1, create: true }, 0);
  room.join({ t: 'hello', v: 1 }, 0);
  room.handle(0, { t: 'costume', id: 'tiger' }, 0);
  assert.strictEqual(sent(room.handle(1, { t: 'costume', id: 'tiger' }, 0), 'costumeTaken').length, 1);
  assert.strictEqual(sent(room.handle(1, { t: 'costume', id: 'unicorn' }, 0), 'seats').length, 0);
});

function startedRoom(players) {
  const room = new Room('0123');
  const tokens = [];
  const looks = ['octopus', 'turtle', 'monkey', 'tiger'];
  for (let i = 0; i < players; i++) {
    const res = room.join({ t: 'hello', v: 1, create: i === 0 }, 0);
    tokens.push(res.out[0].msg.token);
    room.handle(i, { t: 'costume', id: looks[i] }, 0);
  }
  assert.strictEqual(room.handle(1, { t: 'start', map: ['x'] }, 0).length, 0, 'only the host starts');
  room.handle(0, { t: 'start', map: ['1......2'] }, 0);
  return { room, tokens };
}

check('moves are numbered, and a move for a finished turn is refused', () => {
  const { room } = startedRoom(2);
  const roll = sent(room.handle(0, { t: 'ev', ev: { t: 'roll', turn: 0, faces: ['F', 'F', 'L', 'R', 'W'], id: 'a' } }, 1), 'ev')[0].msg.ev;
  assert.strictEqual(roll.n, 1);
  assert.strictEqual(roll.seat, 0);
  const go = sent(room.handle(0, { t: 'ev', ev: { t: 'go', turn: 0, program: [{ t: 'F' }], id: 'b' } }, 2), 'ev')[0].msg.ev;
  assert.strictEqual(go.n, 2);
  assert.strictEqual(room.state.turn, 1);
  // Turn 0 is over: a late move for it gets the whole game back instead.
  const late = room.handle(0, { t: 'ev', ev: { t: 'go', turn: 0, program: [], id: 'c' } }, 3);
  assert.strictEqual(late[0].msg.t, 'welcome');
  assert.strictEqual(room.state.log.length, 3);
});

check('arranging pieces goes to the others only, and is not kept', () => {
  const { room } = startedRoom(3);
  const out = room.handle(1, { t: 'live', program: [{ t: 'F' }], tray: [] }, 1);
  assert.deepStrictEqual(out[0].to, { not: 1 });
  assert.ok(Room.wants(out[0].to, 0) && !Room.wants(out[0].to, 1));
  assert.strictEqual(room.state.log.length, 1);
});

check('a dropped device rejoins its seat with its token', () => {
  const { room, tokens } = startedRoom(2);
  room.disconnect(1, 5);
  assert.strictEqual(room.publicSeats().find((p) => p.seat === 1).connected, false);
  const back = room.join({ t: 'hello', v: 1, token: tokens[1] }, 6);
  assert.strictEqual(back.seat, 1);
  assert.strictEqual(back.out[0].msg.log.length, 1);
});

check('leaving: in the lobby, the host ends it; in a game, the others keep playing', () => {
  const lobby = new Room('0123');
  lobby.join({ t: 'hello', v: 1, create: true }, 0);
  lobby.join({ t: 'hello', v: 1 }, 0);
  lobby.handle(1, { t: 'leave' }, 0);
  assert.strictEqual(lobby.publicSeats().length, 1);
  assert.strictEqual(sent(lobby.handle(0, { t: 'leave' }, 0), 'closed')[0].msg.why, 'hostLeft');
  const { room } = startedRoom(3);
  const ev = sent(room.handle(2, { t: 'leave' }, 1), 'ev')[0].msg.ev;
  assert.deepStrictEqual([ev.t, ev.seat], ['leave', 2]);
  assert.strictEqual(room.publicSeats().find((p) => p.seat === 2).left, true);
});

check('timeouts: unstarted, idle, and empty games close', () => {
  const lobby = new Room('0123');
  lobby.join({ t: 'hello', v: 1, create: true }, 0);
  assert.strictEqual(lobby.tick(LOBBY_MS - 1).next, LOBBY_MS);
  assert.strictEqual(sent(lobby.tick(LOBBY_MS).out, 'closed')[0].msg.why, 'lobby');
  const { room } = startedRoom(2);
  assert.strictEqual(sent(room.tick(IDLE_MS).out, 'closed')[0].msg.why, 'idle');
  const gone = startedRoom(2).room;
  gone.disconnect(0, 10);
  gone.disconnect(1, 10);
  assert.ok(gone.tick(10 + EMPTY_MS).forget);
  // A closed code can be used for a new game.
  assert.strictEqual(gone.join({ t: 'hello', v: 1, create: true }, 0).seat, 0);
});

console.log(passed + ' relay checks passed');
