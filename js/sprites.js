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

  // Draws a sprite from rows of characters; '.' is transparent.
  function fromRows(rows, palette, base) {
    const c = base || canvas();
    const g = c.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const col = palette[row[x]];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    });
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

  const ROBOT_ROWS = [
    '................',
    '....rRRRRRRr....',
    '...rRYRRRRYRr...',
    '...RRRRRRRRRR...',
    '.KKRggggggggRKK.',
    '.kKRgDDDDDDgRKk.',
    '.KKRgDLDDLDgRKK.',
    '.kKRgDDDDDDgRKk.',
    '.KKRgLDDDDLgRKK.',
    '.kKRgDLLLLDgRKk.',
    '.KKRgDDDDDDgRKK.',
    '...RggggggggR...',
    '...RgGgGgGgGR...',
    '...RggggggggR...',
    '...rRRRRRRRRr...',
    '................',
  ];

  // Robot facing up (north). The game rotates it for other directions.
  function robot(body, dark) {
    return fromRows(ROBOT_ROWS, {
      R: body, r: dark, Y: '#fff59d', g: '#d4d8de', G: '#7d8590',
      D: '#1b1b1f', L: '#ff4436', K: '#222222', k: '#5a5a5a',
    });
  }

  const FLAG = [
    '................',
    '....KrRRRR......',
    '....KRRRRRRR....',
    '....KrRRRRRRR...',
    '....KRRRRRRR....',
    '....KRRRRR......',
    '....K...........',
    '....K...........',
    '....K...........',
    '....K...........',
    '....K...........',
    '....K...........',
    '...KKK..........',
    '..ddddd.........',
    '................',
    '................',
  ];

  const CHEST = [
    '................',
    '................',
    '................',
    '...KKKKKKKKKK...',
    '..KbbbbbbbbbbK..',
    '..KbBBBBBBBBbK..',
    '..KKKKKKKKKKKK..',
    '..KbbbbYYbbbbK..',
    '..KbBBBYYBBBbK..',
    '..KbbbbbbbbbbK..',
    '..KbBBBBBBBBbK..',
    '..KKKKKKKKKKKK..',
    '...dddddddddd...',
    '................',
    '................',
    '................',
  ];

  const GEM = [
    '................',
    '................',
    '....KKKKKKKK....',
    '...KcCCcCCcCK...',
    '..KcCCCcCCCcCK..',
    '.KKKKKKKKKKKKKK.',
    '..KCccCCCCccCK..',
    '...KCcCCCCcCK...',
    '....KCcCCcCK....',
    '.....KCcCcK.....',
    '......KCcK......',
    '.......KK.......',
    '....dddddddd....',
    '................',
    '................',
    '................',
  ];

  const SHADOW = 'rgba(0,0,0,0.28)';
  const goals = {
    A: fromRows(FLAG, { K: '#4a2f17', R: '#e53935', r: '#ff8a80', d: SHADOW }),
    B: fromRows(CHEST, { K: '#3b2412', b: '#b06a2c', B: '#7a4520', Y: '#ffd23f', d: SHADOW }),
    C: fromRows(GEM, { K: '#1a2a6c', C: '#3fb6f0', c: '#c4f1ff', d: SHADOW }),
  };

  const TEAM_COLORS = [
    { name: 'Red', body: '#c8372d', dark: '#7d241b', css: '#e0483c' },
    { name: 'Blue', body: '#2f6fd8', dark: '#1c428a', css: '#4a8cf0' },
  ];

  root.RoversaSprites = {
    SIZE, rng, grass, flowers, sand, tree, rock, water, startPad, robot, goals, TEAM_COLORS,
  };
})(globalThis);
