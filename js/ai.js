// The Dice Quest AI Opponent: given the five rolled puzzle pieces, it tries every
// order (and every direction for wild pieces), plays each one out with the same
// rules as the game, and scores where Roversa ends up. The skill level decides
// how carefully it picks from those programs. No drawing or DOM code, so it can
// be tested with Node.
(function (root) {
  'use strict';

  const E = root.RoversaEngine || (typeof require !== 'undefined' ? require('./engine.js') : null);
  const LEVELS = ['easy', 'medium', 'hard'];
  const WILD_CHOICES = ['F', 'B', 'L', 'R'];

  // Every distinct order of the pieces, with each wild piece set to each direction.
  function candidates(types) {
    const out = [];
    const used = new Array(types.length).fill(false);
    const order = [];
    (function permute() {
      if (order.length === types.length) {
        expandWilds(order.map((i) => types[i]), 0, [], out);
        return;
      }
      const tried = new Set();
      for (let i = 0; i < types.length; i++) {
        if (used[i] || tried.has(types[i])) continue;
        tried.add(types[i]);
        used[i] = true;
        order.push(i);
        permute();
        order.pop();
        used[i] = false;
      }
    })();
    return out;
  }

  function expandWilds(seq, i, acc, out) {
    if (i === seq.length) { out.push(acc.slice()); return; }
    if (seq[i] === 'W') {
      WILD_CHOICES.forEach((c) => { acc.push({ t: 'W', chosen: c }); expandWilds(seq, i + 1, acc, out); acc.pop(); });
    } else {
      acc.push({ t: seq[i] });
      expandWilds(seq, i + 1, acc, out);
      acc.pop();
    }
  }

  // How many squares each square is from a goal, going around rocks, trees and water.
  function distanceMap(grid, goal) {
    const rows = grid.length, cols = grid[0].length;
    const dist = grid.map((r) => r.map(() => Infinity));
    dist[goal.y][goal.x] = 0;
    const queue = [goal];
    while (queue.length) {
      const p = queue.shift();
      for (let d = 0; d < 4; d++) {
        const nx = p.x + E.DX[d], ny = p.y + E.DY[d];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || E.isBlocked(grid, nx, ny)) continue;
        if (dist[ny][nx] <= dist[p.y][p.x] + 1) continue;
        dist[ny][nx] = dist[p.y][p.x] + 1;
        queue.push({ x: nx, y: ny });
      }
    }
    return dist;
  }

  // Plays a program out the way the game does: a bump ends the turn, and driving
  // off the map sends Roversa back to its start square.
  function simulate(grid, goals, robot, program, occupied) {
    let pos = { x: robot.x, y: robot.y, dir: robot.dir };
    const visited = new Set(robot.visited);
    let off = false;
    const steps = E.resolve(program);
    for (const cmd of steps) {
      const res = E.step(grid, pos, cmd, occupied);
      if (res.result === 'move') {
        pos = { x: res.x, y: res.y, dir: res.dir };
        const goal = goals.find((g) => g.x === pos.x && g.y === pos.y);
        if (goal) visited.add(goal.id);
      } else if (res.result === 'turn') {
        pos = { x: res.x, y: res.y, dir: res.dir };
      } else if (res.result === 'bump') {
        break;
      } else if (res.result === 'off') {
        off = true;
        if (!(occupied && occupied(robot.sx, robot.sy))) pos = { x: robot.sx, y: robot.sy, dir: robot.sdir };
        break;
      }
    }
    return { pos, visited, off };
  }

  function score(grid, goals, dists, robot, sim) {
    const found = sim.visited.size - robot.visited.size;
    const left = goals.filter((g) => !sim.visited.has(g.id));
    if (!left.length) return 100000;
    const { x, y, dir } = sim.pos;
    let best = Infinity;
    left.forEach((g) => {
      const dist = dists[g.id];
      const here = dist[y][x];
      // A next square straight ahead or behind needs no turn; one to the side needs one.
      let turn = 1;
      for (let d = 0; d < 4; d++) {
        const nx = x + E.DX[d], ny = y + E.DY[d];
        if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[0].length) continue;
        if (dist[ny][nx] < here && (d === dir || d === (dir + 2) % 4)) turn = 0;
      }
      best = Math.min(best, here * 4 + turn);
    });
    return found * 1000 - best - (sim.off ? 30 : 0);
  }

  // Picks a program for the AI Opponent. tray is the list of rolled pieces
  // ({ t }), robot has x, y, dir, sx, sy, sdir and visited. Returns the pieces
  // in order, with wild pieces given a chosen direction.
  function plan(map, robot, tray, level, occupied, rand) {
    rand = rand || Math.random;
    const all = candidates(tray.map((p) => p.t));
    const dists = {};
    map.goals.forEach((g) => { dists[g.id] = distanceMap(map.grid, g); });
    const scored = all.map((program) => ({ program, score: score(map.grid, map.goals, dists, robot, simulate(map.grid, map.goals, robot, program, occupied)) }));
    scored.sort((a, b) => b.score - a.score);
    let pool;
    // Hard always takes the best program. Medium picks from the best tenth and
    // Easy from the better third, so they make mistakes but still get somewhere.
    const share = { hard: 0, medium: 0.1, easy: 0.3 }[level] ?? 0.5;
    if (!share) pool = scored.filter((s) => s.score === scored[0].score);
    else pool = scored.slice(0, Math.max(1, Math.ceil(scored.length * share)));
    return pool[Math.floor(rand() * pool.length)].program;
  }

  const api = { LEVELS, plan, candidates, simulate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.RoversaAI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
