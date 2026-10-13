#!/usr/bin/env node
// Plays Dice Quest games with the AI Opponent driving every robot, from tricky
// spots, and checks every game ends. The "three turns on one square" rule
// (Engine.countStay) is what keeps a stuck robot from stopping the game.
// Usage: node tools/check-ai.js [games per spot and skill level]
const path = require('path');
const E = require(path.join(__dirname, '..', 'js', 'engine.js'));
const AI = require(path.join(__dirname, '..', 'js', 'ai.js'));

const FACES = ['F', 'B', 'L', 'R', 'W', 'P'];
const MAX_TURNS = 400;
const count = Number(process.argv[2]) || 40;

// Tom's game (2026-10-13): robot 1 sits on treasure C with water, a tree and a
// rock on three sides. Robot 2 has found A and B, needs C, and stands on the
// fourth side, so neither robot can move. It used to go on forever.
const SPOTS = [{
  name: 'player boxed in on the AI\'s last treasure',
  map: [
    '.......2',
    '...WWR..',
    '....CT..',
    '.R..R...',
    '........',
    '........',
    '.......B',
    '1...A...',
  ],
  robots: [
    { x: 4, y: 2, dir: 2, visited: ['A', 'C'] },
    { x: 3, y: 2, dir: 1, visited: ['A', 'B'] },
  ],
}];

let failed = false;
const check = (ok, text) => { if (!ok) failed = true; console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`); };

// The rule itself: home on the third turn ended on one square, never on the start square.
{
  const r = { sx: 0, sy: 0, x: 0, y: 0, stay: 0, stayAt: null };
  const ends = [[0, 0], [1, 0], [1, 0], [1, 0]].map(([x, y]) => { r.x = x; r.y = y; return E.countStay(r); });
  check(ends.join() === 'false,false,false,true' && r.stay === 3, 'three turns ended on one square sends a robot home; its start square never counts');
}

// One turn the way js/game.js plays it.
// With `blind`, the AI plans as if it did not know the rule, like a player who
// just keeps bumping: the rule alone has to end the game.
function playTurn(map, robots, i, level, blind) {
  const r = robots[i];
  const occupied = (x, y) => robots.some((o) => o !== r && o.x === x && o.y === y);
  const tray = [0, 1, 2, 3, 4].map(() => ({ t: FACES[Math.floor(Math.random() * FACES.length)] }));
  const program = AI.plan(map, blind ? { ...r, stay: undefined } : r, tray, level, occupied);
  for (const cmd of E.resolve(program)) {
    const res = E.step(map.grid, r, cmd, occupied);
    if (res.result === 'move' || res.result === 'turn') {
      Object.assign(r, { x: res.x, y: res.y, dir: res.dir });
      const goal = map.goals.find((g) => g.x === r.x && g.y === r.y);
      if (goal) r.visited.add(goal.id);
    } else if (res.result === 'bump') break;
    else if (res.result === 'off') {
      if (!occupied(r.sx, r.sy)) Object.assign(r, { x: r.sx, y: r.sy, dir: r.sdir });
      break;
    }
  }
  if (r.visited.size === map.goals.length) return true;
  if (E.countStay(r) && !occupied(r.sx, r.sy)) Object.assign(r, { x: r.sx, y: r.sy, dir: r.sdir, stay: 0, stayAt: null });
  return false;
}

SPOTS.forEach((spot) => {
  const map = E.parseMap(spot.map);
  [...AI.LEVELS.map((level) => ({ level })), { level: 'hard', blind: true }].forEach(({ level, blind }) => {
    const lengths = [];
    for (let game = 0; game < count; game++) {
      const robots = spot.robots.map((s, i) => {
        const start = map.starts[String(i + 1)];
        return { ...s, sx: start.x, sy: start.y, sdir: 0, visited: new Set(s.visited), stay: 0, stayAt: null };
      });
      let turn = 0;
      while (turn < MAX_TURNS && !playTurn(map, robots, turn % robots.length, level, blind)) turn++;
      lengths.push(turn + 1);
    }
    const stuck = lengths.filter((n) => n > MAX_TURNS).length;
    lengths.sort((a, b) => a - b);
    check(stuck === 0, `${spot.name}, ${level}${blind ? ', AI not told the rule' : ''}: ${count - stuck} of ${count} games ended (median ${lengths[lengths.length >> 1]} turns)`);
  });
});
process.exit(failed ? 1 : 0);
