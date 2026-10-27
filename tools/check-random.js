#!/usr/bin/env node
// Makes many Random Challenges for each difficulty and checks every one:
// it can be won in its slots with its pieces, reef rock is only on the edge,
// and it was quick to make. Then makes Dice Quest maps for 1-4 players and
// checks that no robot is more than QUEST_FAIR puzzle pieces closer to the treasures. Usage: node tools/check-random.js [how many]
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
[1, 2, 3, 4].forEach((players) => {
  const times = [];
  for (let i = 0; i < count * 5; i++) {
    const t = Date.now();
    const rows = R.questMap(players);
    times.push(Date.now() - t);
    const map = Engine.parseMap(rows);
    const problems = [];
    if (map.goals.length !== 3) problems.push('wrong number of treasures');
    if (Object.keys(map.starts).length !== players) problems.push('wrong number of starts');
    const gap = R.questGap(rows, players);
    if (gap > R.QUEST_FAIR) problems.push(`one robot is ${gap} puzzle pieces closer`);
    if (problems.length) {
      failed = true;
      console.log(`FAIL quest ${players}p: ${problems.join('; ')}\n  ${rows.join('\n  ')}`);
    }
  }
  times.sort((a, b) => a - b);
  console.log(`ok   quest ${players}p: ${times.length} maps, median ${times[times.length >> 1]} ms, slowest ${times[times.length - 1]} ms`);
});
process.exit(failed ? 1 : 0);
