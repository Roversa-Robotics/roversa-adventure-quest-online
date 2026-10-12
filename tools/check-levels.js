#!/usr/bin/env node
// Checks every adventure level: the map is rectangular, has a start and
// destinations, and can be solved with the pieces and slots it gives.
// Usage: node tools/check-levels.js
const path = require('path');
const Engine = require(path.join(__dirname, '..', 'js', 'engine.js'));
require(path.join(__dirname, '..', 'js', 'levels.js'));

let failed = false;
// The tutorial (Meet Roversa) is checked one stage at a time.
const maps = [];
globalThis.ROVERSA_LEVELS.forEach((level, i) => {
  if (level.stages) level.stages.forEach((st, k) => maps.push({ label: `${i}. ${level.name} (stage ${k + 1})`, level: st }));
  else maps.push({ label: `${i}. ${level.name}`, level });
});
maps.forEach(({ label, level }) => {
  const widths = new Set(level.map.map((r) => r.length));
  const map = Engine.parseMap(level.map);
  const problems = [];
  if (widths.size !== 1) problems.push('map rows are different lengths');
  if (!map.starts['1']) problems.push('no S start square');
  if (!map.goals.length) problems.push('no destinations (A, B or C)');
  // Reef rock is drawn as the shore, so it only belongs on the edge of the map.
  map.grid.forEach((row, y) => row.forEach((ch, x) => {
    const edge = x === 0 || y === 0 || x === map.cols - 1 || y === map.rows - 1;
    if (ch === '#' && !edge) problems.push(`reef rock (#) at column ${x + 1}, row ${y + 1} is not on the edge`);
  }));
  let solution = null;
  if (!problems.length) {
    solution = Engine.solve(level, level.slots);
    if (!solution) problems.push(`cannot be solved in ${level.slots} slots with these pieces`);
  }
  if (problems.length) {
    failed = true;
    console.log(`FAIL ${label}: ${problems.join('; ')}`);
  } else {
    console.log(`ok   ${label}: best ${solution.length}/${level.slots} -> ${solution.join(' ')}`);
  }
});
process.exit(failed ? 1 : 0);
