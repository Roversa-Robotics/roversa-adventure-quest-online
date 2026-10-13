#!/usr/bin/env node
// Makes many Random Challenges for each difficulty and checks every one:
// it can be won in its slots with its pieces, reef rock is only on the edge,
// and it was quick to make. Usage: node tools/check-random.js [how many]
const path = require('path');
const Engine = require(path.join(__dirname, '..', 'js', 'engine.js'));
const R = require(path.join(__dirname, '..', 'js', 'random.js'));

const count = Number(process.argv[2]) || 40;
let failed = false;
R.ORDER.forEach((diff) => {
  const times = [];
  for (let i = 0; i < count; i++) {
    const t = Date.now();
    const level = R.generate(diff);
    times.push(Date.now() - t);
    const problems = [];
    if (!level) problems.push('no challenge was made');
    else {
      const map = Engine.parseMap(level.map);
      const sol = Engine.solve(level, level.slots);
      if (!sol) problems.push(`cannot be solved in ${level.slots} slots`);
      else if (sol.length !== level.best) problems.push(`best is ${sol.length}, not ${level.best}`);
      if (map.goals.length !== R.DIFFICULTIES[diff].goals) problems.push('wrong number of destinations');
      map.grid.forEach((row, y) => row.forEach((ch, x) => {
        const edge = x === 0 || y === 0 || x === map.cols - 1 || y === map.rows - 1;
        if (ch === '#' && !edge) problems.push('reef rock not on the edge');
      }));
    }
    if (problems.length) {
      failed = true;
      console.log(`FAIL ${diff}: ${problems.join('; ')}\n  ${level ? level.map.join('\n  ') : ''}`);
    }
  }
  times.sort((a, b) => a - b);
  console.log(`ok   ${diff}: ${count} challenges, median ${times[count >> 1]} ms, slowest ${times[count - 1]} ms`);
});
process.exit(failed ? 1 : 0);
