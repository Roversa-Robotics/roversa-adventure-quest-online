#!/usr/bin/env node
// Plays the AI Opponent through tricky Dice Quest spots with many random rolls
// and checks it never leaves another robot boxed in with no way to move.
// Usage: node tools/check-ai.js [rolls per spot]
const path = require('path');
const E = require(path.join(__dirname, '..', 'js', 'engine.js'));
const AI = require(path.join(__dirname, '..', 'js', 'ai.js'));

const FACES = ['F', 'B', 'L', 'R', 'W', 'P'];
const count = Number(process.argv[2]) || 300;

// Tom's game (2026-10-13): the AI (2) has found A and B, and its last treasure C
// is under the player (1), who has water, a tree and a rock on three sides.
// The AI kept bumping into the player from the fourth side, so neither could move.
const SPOTS = [{
  name: 'last treasure under a boxed-in player',
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
  player: { x: 4, y: 2 },
  ai: { x: 3, y: 2, dir: 3, visited: ['A', 'B'] },
}];

function trapped(grid, p, isRobot) {
  for (let d = 0; d < 4; d++) {
    const nx = p.x + E.DX[d], ny = p.y + E.DY[d];
    if (nx < 0 || ny < 0 || ny >= grid.length || nx >= grid[0].length) return false;
    if (!E.isBlocked(grid, nx, ny) && !isRobot(nx, ny)) return false;
  }
  return true;
}

let failed = false;
SPOTS.forEach((spot) => {
  const map = E.parseMap(spot.map);
  const start = map.starts['2'];
  AI.LEVELS.forEach((level) => {
    let bad = 0;
    for (let i = 0; i < count; i++) {
      const tray = [0, 1, 2, 3, 4].map(() => ({ t: FACES[Math.floor(Math.random() * FACES.length)] }));
      const robot = { ...spot.ai, sx: start.x, sy: start.y, sdir: 0, visited: new Set(spot.ai.visited) };
      const occupied = (x, y) => x === spot.player.x && y === spot.player.y;
      const program = AI.plan(map, robot, tray, level, occupied);
      const end = AI.simulate(map.grid, map.goals, robot, program, occupied).pos;
      const boxes = (pos) => trapped(map.grid, spot.player, (x, y) => x === pos.x && y === pos.y);
      // Some rolls (all turns, say) cannot move the AI away; only count the rest.
      const canLeave = AI.candidates(tray.map((p) => p.t))
        .some((prog) => !boxes(AI.simulate(map.grid, map.goals, robot, prog, occupied).pos));
      if (canLeave && boxes(end)) bad++;
    }
    const ok = bad === 0;
    if (!ok) failed = true;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${spot.name}, ${level}: player boxed in after ${bad} of ${count} AI turns`);
  });
});
process.exit(failed ? 1 : 0);
