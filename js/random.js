// Random Challenges: fresh Adventure maps made from one world's tiles.
// No drawing or DOM code, so tools/check-random.js can test it in Node.
//
// Each difficulty belongs to a world. A challenge is made by scattering that
// world's destinations and obstacles on an empty map, then asking the solver
// (Engine.solve) for the shortest algorithm. Maps that cannot be won, are too
// easy, or don't need the difficulty's special puzzle pieces are thrown away
// and a new one is tried, so every challenge a player sees can be won.
(function (root) {
  'use strict';

  const E = root.RoversaEngine || (typeof require === 'function' ? require('./engine.js') : null);

  // cols x rows:  map size.
  // goals:        how many destinations (A, B, C) to visit.
  // best:         the shortest algorithm must be this long (min, max).
  // blockers:     obstacles to scatter (repeat a letter to make it more common).
  // edge:         an obstacle that only goes on the map's edge (reef rock).
  // decor:        drivable ground details.
  // pieces:       how many of each puzzle piece the player gets.
  // spare:        extra slots in the algorithm row on top of the shortest answer.
  // needs:        puzzle pieces the map must not be winnable without.
  const DIFFICULTIES = {
    easy: {
      world: 'pond', cols: 6, rows: 3, goals: 1, best: [3, 6],
      blockers: 'LLV', nBlock: [2, 4],
      pieces: () => ({ F: 6, L: 2, R: 2 }), spare: 2, needs: [],
    },
    medium: {
      world: 'island', cols: 7, rows: 3, goals: 2, best: [6, 10],
      blockers: 'MPPKY', nBlock: [3, 5], decor: 'f', nDecor: [1, 3],
      pieces: (rand) => ({ F: 2 + rand(2), B: 2, L: 2, R: 2, P: 4 }), spare: 1, needs: ['B', 'P'],
    },
    hard: {
      world: 'sea', cols: 7, rows: 4, goals: 3, best: [11, 16],
      blockers: '*%%', nBlock: [5, 8], edge: '#', nEdge: [1, 3],
      pieces: (rand) => ({ F: 3 + rand(2), B: 1, L: 1, R: 1, P: 6, W: 1 }), spare: 0, needs: ['W', 'P'],
    },
  };
  const ORDER = ['easy', 'medium', 'hard'];

  // Places the start, destinations and obstacles. Fast, with no solving, so
  // the level picker can also use it for its blurred preview pictures.
  // Returns the map as rows of text, or null if the pieces did not fit.
  function layout(diff, random) {
    const d = DIFFICULTIES[diff];
    const rand = (n) => Math.floor(random() * n);
    const between = (r) => r[0] + rand(r[1] - r[0] + 1);
    const g = [];
    for (let y = 0; y < d.rows; y++) g.push(new Array(d.cols).fill('.'));
    const empty = () => {
      for (let t = 0; t < 50; t++) {
        const x = rand(d.cols), y = rand(d.rows);
        if (g[y][x] === '.') return { x, y };
      }
      return null;
    };
    const s = empty();
    g[s.y][s.x] = 'S';
    // Destinations at least two squares from the start.
    let placed = 0;
    for (let t = 0; placed < d.goals && t < 100; t++) {
      const p = empty();
      if (!p || Math.abs(p.x - s.x) + Math.abs(p.y - s.y) < 2) continue;
      g[p.y][p.x] = 'ABC'[placed++];
    }
    if (placed < d.goals) return null;
    for (let i = between(d.nBlock); i > 0; i--) {
      const p = empty();
      if (p) g[p.y][p.x] = d.blockers[rand(d.blockers.length)];
    }
    if (d.edge) {
      for (let i = between(d.nEdge); i > 0; i--) {
        const p = empty();
        if (p && (p.x === 0 || p.y === 0 || p.x === d.cols - 1 || p.y === d.rows - 1)) g[p.y][p.x] = d.edge;
      }
    }
    if (d.decor) {
      for (let i = between(d.nDecor); i > 0; i--) {
        const p = empty();
        if (p) g[p.y][p.x] = d.decor[rand(d.decor.length)];
      }
    }
    const rows = g.map((row) => row.join(''));
    // There is only one Pirate and one Byteclaw.
    const all = rows.join('');
    if (all.split('K').length > 2 || all.split('Y').length > 2) return null;
    return rows;
  }

  // One try at a challenge: a level object like the ones in js/levels.js, plus
  // `random` (the difficulty) and `best` (the shortest algorithm's length).
  // Returns null when the map it made can't be used.
  function attempt(diff, random) {
    const d = DIFFICULTIES[diff];
    const rand = (n) => Math.floor(random() * n);
    const map = layout(diff, random);
    if (!map) return null;
    const startDir = 'NESW'[rand(4)];
    const pieces = d.pieces(rand);
    const sol = E.solve({ map, pieces, startDir }, d.best[1]);
    if (!sol || sol.length < d.best[0]) return null;
    // The map has to need the difficulty's special pieces.
    if (d.needs.length) {
      const used = new Set(sol.map((c) => c[0]));
      if (!d.needs.every((t) => used.has(t))) return null;
      const without = Object.assign({}, pieces);
      d.needs.forEach((t) => { delete without[t]; });
      if (E.solve({ map, pieces: without, startDir }, d.best[1] + d.spare)) return null;
    }
    return { random: diff, world: d.world, startDir, pieces, slots: sol.length + d.spare, map, best: sol.length };
  }

  const TRIES = 500;

  // Makes a challenge that can be won, or null in the very unlikely case that
  // every try failed.
  function generate(diff, random) {
    for (let i = 0; i < TRIES; i++) {
      const level = attempt(diff, random || Math.random);
      if (level) return level;
    }
    return null;
  }

  // The same, a few tries at a time, so the page keeps drawing while a hard
  // map is being made (that can take a second or two on a phone).
  // Calls done(level) when it is ready.
  function generateSoon(diff, done) {
    let tries = 0;
    (function more() {
      const until = Date.now() + 40;
      while (tries < TRIES && Date.now() < until) {
        tries++;
        const level = attempt(diff, Math.random);
        if (level) { done(level); return; }
      }
      if (tries >= TRIES) done(null);
      else setTimeout(more, 0);
    })();
  }

  const api = { DIFFICULTIES, ORDER, layout, generate, generateSoon };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.RoversaRandom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
