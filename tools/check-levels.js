#!/usr/bin/env node
// Checks every adventure level: the map is rectangular, has a start and
// destinations, and can be solved with the pieces and slots it gives.
// Find the Square levels instead need algorithms that never bump or drive off the map.
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
  if (level.algorithms) {
    if (map.goals.length) problems.push('Find the Square maps have no destinations (A, B or C)');
    if (level.algorithms.length < 2) problems.push('needs at least 2 algorithms, so a wrong guess can try another');
  } else if (!map.goals.length) problems.push('no destinations (A, B or C)');
  // Reef rock is drawn as the shore, so it only belongs on the edge of the map.
  map.grid.forEach((row, y) => row.forEach((ch, x) => {
    const edge = x === 0 || y === 0 || x === map.cols - 1 || y === map.rows - 1;
    if (ch === '#' && !edge) problems.push(`reef rock (#) at column ${x + 1}, row ${y + 1} is not on the edge`);
  }));
  if (level.algorithms && !problems.length) {
    const ends = level.algorithms.map((text) => {
      const t = Engine.trace(level, Engine.parseAlgorithm(text));
      if (t.stopped >= 0) problems.push(`'${text}' bumps or drives off the map at piece ${t.stopped + 1}`);
      return `'${text}' stops at column ${t.end.x + 1}, row ${t.end.y + 1}`;
    });
    if (!problems.length) { console.log(`ok   ${label}: ${ends.join('; ')}`); return; }
  }
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
