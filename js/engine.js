// Game rules with no drawing or DOM code, so the browser game and
// tools/check-levels.js share exactly the same behaviour.
(function (root) {
  'use strict';

  // Directions: 0 = north (up), 1 = east, 2 = south, 3 = west.
  const DX = [0, 1, 0, -1];
  const DY = [-1, 0, 1, 0];
  const DIR_NAMES = { N: 0, E: 1, S: 2, W: 3 };

  // Map characters.
  //   .  grass        f  flowers      =  sand path   (all drivable)
  //   T  tree         R  rock         W  water       (all block the robot)
  //   S  start square (level mode)
  //   1, 2  player start squares (quest mode)
  //   A, B, C  destinations (treasure chest, bags of gold, gold coins)
  const BLOCKING = { T: true, R: true, W: true };

  // Gamepiece commands.
  //   F forward, B back, L turn left, R turn right,
  //   P repeat the previous command, W wild (player picks F, B, L or R)
  const COMMANDS = ['F', 'B', 'L', 'R', 'P', 'W'];

  function parseMap(rows) {
    const grid = [];
    const goals = [];
    const starts = {};
    rows.forEach((row, y) => {
      const line = [];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === 'A' || ch === 'B' || ch === 'C') {
          goals.push({ id: ch, x, y });
          line.push('.');
        } else if (ch === 'S' || ch === '1' || ch === '2') {
          starts[ch === 'S' ? '1' : ch] = { x, y };
          line.push('.');
        } else {
          line.push(ch);
        }
      }
      grid.push(line);
    });
    goals.sort((a, b) => a.id.localeCompare(b.id));
    return { grid, goals, starts, cols: grid[0].length, rows: grid.length };
  }

  function inBounds(grid, x, y) {
    return y >= 0 && y < grid.length && x >= 0 && x < grid[0].length;
  }

  function isBlocked(grid, x, y) {
    return !!BLOCKING[grid[y][x]];
  }

  // Turns the program into the moves the robot will actually make:
  // a wild piece becomes the direction the player picked, and a repeat
  // piece becomes whatever ran just before it (nothing, if it is first).
  function resolve(program) {
    const out = [];
    let prev = null;
    for (const piece of program) {
      let t = piece.t === 'W' ? piece.chosen || null : piece.t;
      if (t === 'P') t = prev;
      out.push(t);
      if (t) prev = t;
    }
    return out;
  }

  // One command applied to a robot position.
  // Returns { x, y, dir, result } where result is
  //   'move', 'turn', 'noop', 'bump' (stays put) or 'off' (would leave the board).
  function step(grid, pos, cmd, occupied) {
    const { x, y, dir } = pos;
    if (cmd === 'L') return { x, y, dir: (dir + 3) % 4, result: 'turn' };
    if (cmd === 'R') return { x, y, dir: (dir + 1) % 4, result: 'turn' };
    if (cmd !== 'F' && cmd !== 'B') return { x, y, dir, result: 'noop' };
    const d = cmd === 'F' ? dir : (dir + 2) % 4;
    const nx = x + DX[d];
    const ny = y + DY[d];
    if (!inBounds(grid, nx, ny)) return { x, y, dir, result: 'off', tx: nx, ty: ny };
    if (isBlocked(grid, nx, ny) || (occupied && occupied(nx, ny))) {
      return { x, y, dir, result: 'bump', tx: nx, ty: ny };
    }
    return { x: nx, y: ny, dir, result: 'move' };
  }

  // Finds the shortest program that visits every destination in a level,
  // respecting how many of each gamepiece the level provides.
  // Returns the list of commands, or null if no program fits in maxLen.
  function solve(level, maxLen) {
    const map = parseMap(level.map);
    const start = map.starts['1'];
    const limits = level.pieces;
    const types = Object.keys(limits).filter((t) => t !== 'W');
    const full = (1 << map.goals.length) - 1;
    const goalBit = (x, y) => {
      let m = 0;
      map.goals.forEach((g, i) => { if (g.x === x && g.y === y) m |= 1 << i; });
      return m;
    };
    const startState = {
      x: start.x, y: start.y, dir: DIR_NAMES[level.startDir || 'N'],
      mask: goalBit(start.x, start.y), prev: null,
      used: types.map(() => 0), cmds: [],
    };
    let frontier = [startState];
    const seen = new Set();
    const key = (s) => [s.x, s.y, s.dir, s.mask, s.prev, s.used.join(',')].join('|');
    seen.add(key(startState));
    for (let depth = 0; depth < maxLen; depth++) {
      const next = [];
      for (const s of frontier) {
        types.forEach((t, ti) => {
          if (s.used[ti] >= limits[t]) return;
          const eff = t === 'P' ? s.prev : t;
          const r = step(map.grid, s, eff);
          if (r.result === 'bump' || r.result === 'off') return;
          const used = s.used.slice();
          used[ti]++;
          const ns = {
            x: r.x, y: r.y, dir: r.dir,
            mask: s.mask | goalBit(r.x, r.y),
            prev: eff || s.prev, used, cmds: s.cmds.concat(t),
          };
          if (ns.mask === full) { next.found = ns.cmds; return; }
          const k = key(ns);
          if (seen.has(k)) return;
          seen.add(k);
          next.push(ns);
        });
        if (next.found) return next.found;
      }
      frontier = next;
      if (!frontier.length) break;
    }
    return null;
  }

  const api = { DX, DY, DIR_NAMES, COMMANDS, parseMap, inBounds, isBlocked, resolve, step, solve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.RoversaEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
