#!/usr/bin/env node
// Checks every adventure level: the map is rectangular, has a start and
// destinations, and can be solved with the pieces and slots it gives.
// Usage: node tools/check-levels.js
const path = require('path');
const Engine = require(path.join(__dirname, '..', 'js', 'engine.js'));
require(path.join(__dirname, '..', 'js', 'levels.js'));

let failed = false;
globalThis.ROVERSA_LEVELS.forEach((level, i) => {
  const label = `${i + 1}. ${level.name}`;
  const widths = new Set(level.map.map((r) => r.length));
  const map = Engine.parseMap(level.map);
  const problems = [];
  if (widths.size !== 1) problems.push('map rows are different lengths');
  if (!map.starts['1']) problems.push('no S start square');
  if (!map.goals.length) problems.push('no destinations (A, B or C)');
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
