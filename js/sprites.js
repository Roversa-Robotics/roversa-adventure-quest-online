// 16x16 pixel art, drawn once into small canvases and scaled up with
// smoothing off for the chunky 8-bit look.
(function (root) {
  'use strict';

  const SIZE = 16;

  function canvas() {
    const c = document.createElement('canvas');
    c.width = SIZE;
    c.height = SIZE;
    return c;
  }

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function speckle(g, rand, colors, count) {
    for (let i = 0; i < count; i++) {
      g.fillStyle = colors[i % colors.length];
      g.fillRect(Math.floor(rand() * SIZE), Math.floor(rand() * SIZE), 1, 1);
    }
  }

  function grass(seed) {
    const c = canvas();
    const g = c.getContext('2d');
    const rand = rng(seed);
    g.fillStyle = '#5ca838';
    g.fillRect(0, 0, SIZE, SIZE);
    speckle(g, rand, ['#4a8f2c', '#4a8f2c', '#77c24d'], 14);
    // A few little grass tufts.
    for (let i = 0; i < 2; i++) {
      const x = 1 + Math.floor(rand() * 13);
      const y = 2 + Math.floor(rand() * 12);
      g.fillStyle = '#3f7d25';
      g.fillRect(x, y, 1, 1);
      g.fillRect(x + 2, y, 1, 1);
      g.fillRect(x + 1, y - 1, 1, 1);
    }
    return c;
  }

  function flowers(seed) {
    const c = grass(seed);
    const g = c.getContext('2d');
    const rand = rng(seed * 7 + 3);
    const petals = ['#ffffff', '#ff8fc8', '#ffd84d'];
    for (let i = 0; i < 3; i++) {
      const x = 2 + Math.floor(rand() * 11);
      const y = 2 + Math.floor(rand() * 11);
      g.fillStyle = petals[i % 3];
      g.fillRect(x - 1, y, 1, 1);
      g.fillRect(x + 1, y, 1, 1);
      g.fillRect(x, y - 1, 1, 1);
      g.fillRect(x, y + 1, 1, 1);
      g.fillStyle = '#f2a516';
      g.fillRect(x, y, 1, 1);
    }
    return c;
  }

  function sand(seed) {
    const c = canvas();
    const g = c.getContext('2d');
    const rand = rng(seed);
    g.fillStyle = '#e2c27a';
    g.fillRect(0, 0, SIZE, SIZE);
    speckle(g, rand, ['#c9a55c', '#f0d89c'], 16);
    return c;
  }

  // A shaded blob: dark outline, highlight towards the top left.
  function blob(g, rand, cx, cy, r, cols) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const d = Math.sqrt(dx * dx + dy * dy) + (rand() - 0.5) * 0.8;
        if (d > r) continue;
        let col = cols.mid;
        if (d > r - 1.1) col = cols.edge;
        else if (dx + dy < -r * 0.55) col = cols.light;
        else if (dx + dy > r * 0.6) col = cols.dark;
        else if (rand() < 0.12) col = cols.dark;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
  }

  function tree(seed) {
    const c = grass(seed);
    const g = c.getContext('2d');
    const rand = rng(seed * 13 + 1);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(3, 12, 11, 3);
    blob(g, rand, 8, 7.5, 7.4, { edge: '#1d4a1a', dark: '#2a6b25', mid: '#358a2e', light: '#5fbf4a' });
    return c;
  }

  function rock(seed) {
    const c = grass(seed);
    const g = c.getContext('2d');
    const rand = rng(seed * 17 + 5);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(3, 11, 11, 3);
    blob(g, rand, 8, 8.5, 6, { edge: '#3c3f47', dark: '#6b707c', mid: '#8d929e', light: '#c3c7cf' });
    return c;
  }

  function water(seed, frame) {
    const c = canvas();
    const g = c.getContext('2d');
    g.fillStyle = '#2f6fd0';
    g.fillRect(0, 0, SIZE, SIZE);
    g.fillStyle = '#4c8ce6';
    const rand = rng(seed);
    for (let i = 0; i < 3; i++) {
      const y = 2 + i * 5 + Math.floor(rand() * 2);
      const x = (Math.floor(rand() * 10) + frame * 3) % 12;
      g.fillRect(x, y, 4, 1);
      g.fillStyle = '#a9d2ff';
      g.fillRect(x + 1, y - 1, 2, 1);
      g.fillStyle = '#4c8ce6';
    }
    return c;
  }

  function startPad(seed) {
    const c = grass(seed);
    const g = c.getContext('2d');
    g.fillStyle = '#c9c2a8';
    g.fillRect(2, 2, 12, 12);
    g.fillStyle = '#a69e82';
    g.fillRect(2, 13, 12, 1);
    g.fillRect(13, 2, 1, 12);
    g.fillStyle = '#e9e3cc';
    g.fillRect(2, 2, 12, 1);
    g.fillRect(2, 2, 1, 12);
    return c;
  }

  // ---------- Sprites made from the Roversa brand art (see tools/pixelate.py) ----------

  const ASSETS = 'assets/sprites/';

  // Blank canvases are handed out right away and painted once the images load,
  // so drawing code never has to wait for them.
  function imageCanvas(file, size) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    c.loaded = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { c.getContext('2d').drawImage(img, 0, 0, size, size); resolve(c); };
      img.onerror = () => resolve(c);
      img.src = ASSETS + file;
    });
    return c;
  }

  const TEAM_COLORS = [
    { name: 'Red', css: '#ff3638', dark: '#8f1513', flag: 'red' },
    { name: 'Blue', css: '#2f7bff', dark: '#0d3a8a', flag: 'blue' },
  ];

  // Flags come in the puzzle piece colors, like the printed flags on the real robots.
  const FLAG_COLORS = {
    red: { css: '#d43a32', dark: '#7e1d18' },
    orange: { css: '#ff8529', dark: '#a84f0c' },
    yellow: { css: '#e3dc38', dark: '#8f8a14' },
    green: { css: '#488f3f', dark: '#264f20' },
    blue: { css: '#466fc4', dark: '#273f7a' },
    purple: { css: '#b665c7', dark: '#6f347d' },
  };

  // The Roversa pennant: a triangle on a tall pole with little holes cut out of it,
  // drawn upright with the pole at the right and the bottom of the pole at the bottom.
  const FLAG_W = 14, FLAG_H = 19;
  function flag(color) {
    const col = FLAG_COLORS[color] || FLAG_COLORS.red;
    const c = document.createElement('canvas');
    c.width = FLAG_W;
    c.height = FLAG_H;
    const g = c.getContext('2d');
    const OUT = '#14162b', POLE = '#e8e4d8';
    const cloth = [];
    for (let y = 2; y <= 10; y++) {
      for (let x = 1 + Math.round((y - 2) * 1.15); x <= 11; x++) cloth.push([x, y]);
    }
    // Outline first, one pixel bigger all round, then the cloth on top.
    g.fillStyle = OUT;
    cloth.forEach(([x, y]) => g.fillRect(x - 1, y - 1, 3, 3));
    g.fillRect(11, 0, 3, FLAG_H);
    g.fillStyle = col.css;
    cloth.forEach(([x, y]) => g.fillRect(x, y, 1, 1));
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(1, 2, 10, 1);
    // The cut-outs, in the same zig-zag as the holes in the printed flag.
    g.fillStyle = col.dark;
    [[4, 3], [8, 3], [6, 5], [10, 5], [8, 7], [10, 9]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
    g.fillStyle = POLE;
    g.fillRect(12, 1, 1, FLAG_H - 2);
    return c;
  }

  // The top-down Roversa, facing up (north); the game rotates it for other directions.
  const robotBase = imageCanvas('robot.png', 32);

  // In Dice Quest each robot gets wheels in its flag color, so two robots on
  // one map are easy to tell apart. With no color, it is the plain robot.
  function robot(color) {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const paint = () => {
      const g = c.getContext('2d');
      g.clearRect(0, 0, 32, 32);
      g.drawImage(robotBase, 0, 0);
      const col = FLAG_COLORS[color];
      if (!col) return;
      for (const x of [0, 29]) {
        g.fillStyle = col.dark;
        g.fillRect(x, 1, 3, 13);
        g.fillStyle = col.css;
        g.fillRect(x, 2, 3, 11);
        g.fillStyle = col.dark;
        for (let y = 3; y < 13; y += 2) g.fillRect(x, y, 3, 1);
      }
    };
    paint();
    robotBase.loaded.then(paint);
    return c;
  }

  // The micro:bit on top of the robot, showing a smiley face on its 5x5 LEDs.
  // Each LED is one pixel, two pixels apart, starting at (11, 4).
  const SMILEY = [
    '.....',
    '.#.#.',
    '.....',
    '#...#',
    '.###.',
  ];

  function smileyRobot() {
    const c = robot();
    const paint = () => {
      const g = c.getContext('2d');
      SMILEY.forEach((row, r) => [...row].forEach((on, col) => {
        const x = 11 + col * 2, y = 4 + r * 2;
        if (on === '#') {
          // A dim red glow around each lit LED, like the real ones.
          g.fillStyle = '#5c1418';
          g.fillRect(x - 1, y, 3, 1);
          g.fillRect(x, y - 1, 1, 3);
        }
      }));
      SMILEY.forEach((row, r) => [...row].forEach((on, col) => {
        g.fillStyle = on === '#' ? '#ff3b30' : '#909090';
        g.fillRect(11 + col * 2, 4 + r * 2, 1, 1);
      }));
    };
    paint();
    robotBase.loaded.then(paint);
    return c;
  }

  // Destinations: A treasure chest, B bags of gold, C gold coins.
  const goals = {
    A: imageCanvas('treasure-chest.png', 32),
    B: imageCanvas('treasure-bags.png', 32),
    C: imageCanvas('treasure-coins.png', 32),
  };

  // Robot costumes players can pick in Dice Quest, each with its own flag color.
  const CHARACTERS = [
    { id: 'octopus', name: 'Octopus', flag: 'red' },
    { id: 'turtle', name: 'Turtle', flag: 'green' },
    { id: 'monkey', name: 'Monkey', flag: 'yellow' },
    { id: 'tiger', name: 'Tiger', flag: 'orange' },
    { id: 'elephant', name: 'Elephant', flag: 'purple' },
    { id: 'manatee', name: 'Manatee', flag: 'blue' },
  ].map((ch) => Object.assign(ch, { sprite: imageCanvas('char-' + ch.id + '.png', 32) }));

  const ready = Promise.all([robotBase.loaded, ...Object.values(goals).map((g) => g.loaded), ...CHARACTERS.map((ch) => ch.sprite.loaded)]);

  root.RoversaSprites = {
    SIZE, rng, grass, flowers, sand, tree, rock, water, startPad, robot, smileyRobot, flag, FLAG_COLORS, goals, TEAM_COLORS, CHARACTERS, ready,
  };
})(globalThis);
