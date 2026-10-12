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

  // ---------- Adventure worlds, themed after the printed Roversa mats ----------

  function px(g, col, x, y, w = 1, h = 1) {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  }

  // Duck Pond (Duck Duck Robot mat): mint water with white ripples.
  function pondWater(seed) {
    const c = canvas();
    const g = c.getContext('2d');
    const rand = rng(seed);
    px(g, '#8fd8c6', 0, 0, SIZE, SIZE);
    speckle(g, rand, ['#7ecbb8', '#a3e3d3'], 10);
    if (rand() < 0.55) {
      const y0 = 4 + Math.floor(rand() * 8);
      const phase = rand() * 6;
      for (let x = 0; x < SIZE; x++) {
        const y = y0 + Math.round(Math.sin((x + phase) / 2.6) * 1.4);
        px(g, '#f7f1e3', x, y);
        if (x % 3) px(g, '#f7f1e3', x, y + 1);
      }
    }
    return c;
  }

  // A wide flat lily pad seen from above, notch toward the middle, with a pink flower.
  function lilyPad(seed) {
    const c = pondWater(seed);
    const g = c.getContext('2d');
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = (x + 0.5 - 8) / 7.2;
        const dy = (y + 0.5 - 8.5) / 5.6;
        const d = Math.hypot(dx, dy);
        if (d > 1) continue;
        if (Math.abs(Math.atan2(dy, dx) + 1.2) < 0.22 && d > 0.12) continue;
        px(g, d > 0.84 ? '#2c7a2e' : dx + dy < -0.6 ? '#7fd06a' : '#4fae45', x, y);
      }
    }
    for (let i = 1; i < 6; i++) {
      px(g, '#3f9a3a', 8 + i, 8 + (i >> 1));
      px(g, '#3f9a3a', 8 - i, 8 + (i >> 1));
    }
    px(g, '#ff9fcf', 10, 10, 3, 2);
    px(g, '#ffd6ea', 11, 9);
    px(g, '#ffd84d', 11, 10);
    return c;
  }

  // A clump of cattails growing out of the pond, like the ones on the mat.
  function cattails(seed) {
    const c = pondWater(seed);
    const g = c.getContext('2d');
    const rand = rng(seed * 7 + 2);
    px(g, '#5e9e86', 2, 13, 12, 2);
    for (let i = 0; i < 4; i++) {
      const x = 3 + i * 3 + (rand() < 0.5 ? 0 : 1);
      const top = 1 + Math.floor(rand() * 3);
      px(g, '#2f6d26', x, top + 5, 1, 14 - top - 5);
      px(g, '#4f9a34', x - 1, 9 + (i % 2), 1, 4);
      px(g, '#3b1d0c', x - 1, top, 3, 6);
      px(g, '#7a3e1e', x, top + 1, 1, 4);
      px(g, '#2f6d26', x, top - 1);
    }
    return c;
  }

  function dock(seed) {
    const c = pondWater(seed);
    const g = c.getContext('2d');
    px(g, '#5a3a1e', 1, 1, 14, 14);
    for (let i = 0; i < 4; i++) {
      px(g, i % 2 ? '#b98a57' : '#c99a64', 2, 2 + i * 3, 12, 2);
      px(g, '#8d6438', 2, 4 + i * 3, 12, 1);
    }
    [[3, 3], [12, 3], [3, 12], [12, 12]].forEach(([x, y]) => px(g, '#3b2510', x, y));
    return c;
  }

  // Roversa Island (Grid Challenges mat): a hand-drawn treasure map in ink.
  const INK = '#2b241c';
  const LAND = '#a9c6a1';

  function land(seed) {
    const c = canvas();
    const g = c.getContext('2d');
    px(g, LAND, 0, 0, SIZE, SIZE);
    speckle(g, rng(seed), ['#98b78f', '#bcd4b3'], 14);
    return c;
  }

  function tuft(seed) {
    const c = land(seed);
    const g = c.getContext('2d');
    const rand = rng(seed * 3 + 1);
    for (let i = 0; i < 3; i++) {
      const x = 2 + Math.floor(rand() * 11);
      const y = 3 + Math.floor(rand() * 10);
      px(g, INK, x, y);
      px(g, INK, x + 2, y);
      px(g, INK, x + 1, y - 1);
    }
    return c;
  }

  // Dashed trail; `open` says which sides it continues to ({ N, E, S, W }).
  function trail(seed, open) {
    const c = land(seed);
    const g = c.getContext('2d');
    px(g, INK, 7, 7, 2, 2);
    if (open.E) px(g, INK, 11, 7, 3, 2);
    if (open.W) px(g, INK, 2, 7, 3, 2);
    if (open.N) px(g, INK, 7, 2, 2, 3);
    if (open.S) px(g, INK, 7, 11, 2, 3);
    return c;
  }

  // Parchment-colored sea; `shore` says which sides touch the island.
  function ocean(seed, shore) {
    const c = canvas();
    const g = c.getContext('2d');
    const rand = rng(seed);
    px(g, '#efe3c4', 0, 0, SIZE, SIZE);
    speckle(g, rand, ['#e2d3ae', '#f6edd6'], 12);
    const x = 2 + Math.floor(rand() * 7);
    const y = 4 + Math.floor(rand() * 7);
    px(g, INK, x, y + 1); px(g, INK, x + 1, y); px(g, INK, x + 2, y + 1); px(g, INK, x + 3, y);
    if (shore.S) { px(g, LAND, 0, 13, SIZE, 3); px(g, INK, 0, 12, SIZE, 1); }
    if (shore.N) { px(g, LAND, 0, 0, SIZE, 3); px(g, INK, 0, 3, SIZE, 1); }
    if (shore.E) { px(g, LAND, 13, 0, 3, SIZE); px(g, INK, 12, 0, 1, SIZE); }
    if (shore.W) { px(g, LAND, 0, 0, 3, SIZE); px(g, INK, 3, 0, 1, SIZE); }
    return c;
  }

  function mountain(seed) {
    const c = land(seed);
    const g = c.getContext('2d');
    for (let y = 2; y < 14; y++) {
      const half = Math.floor((y - 2) * 0.62);
      px(g, '#9aa0a8', 8 - half, y, half * 2 + 1, 1);
      px(g, '#c3c8cf', 8 - half, y, Math.max(1, half - 1), 1);
      px(g, INK, 7 - half, y);
      px(g, INK, 9 + half, y);
    }
    px(g, INK, 1, 14, 15, 1);
    px(g, '#ffffff', 7, 3, 3, 2);
    px(g, '#ffffff', 6, 5, 2, 1);
    return c;
  }

  function pine(seed) {
    const c = land(seed);
    const g = c.getContext('2d');
    for (let y = 1; y < 13; y++) {
      const half = Math.floor((y % 4) + y / 4);
      px(g, '#7a3f2a', 8 - half, y, half * 2 + 1, 1);
    }
    px(g, INK, 7, 12, 2, 3);
    return c;
  }

  // Roversa's charging pad, where it starts on the island (like square B1 on the mat).
  // It lies flat on the ground like the start squares in the other worlds, so it
  // never looks like something Roversa would bump into.
  function chargingStation(seed) {
    const c = land(seed);
    const g = c.getContext('2d');
    px(g, INK, 1, 1, 14, 14);
    px(g, '#2f9a73', 2, 2, 12, 12);
    px(g, '#56c497', 2, 2, 12, 1);
    px(g, '#56c497', 2, 2, 1, 12);
    [[3, 3], [12, 3], [3, 12], [12, 12]].forEach(([x, y]) => px(g, '#bfe6d6', x, y));
    // Lightning bolt.
    [[8, 4, 3], [7, 5, 3], [6, 6, 3], [5, 7, 6], [7, 8, 3], [6, 9, 3], [5, 10, 2]].forEach(([x, y, w]) => px(g, '#ffd84d', x, y, w, 1));
    return c;
  }

  // The red X that marks the spot: a goal picture, so 32x32 like the other goals.
  function xMark() {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const g = c.getContext('2d');
    for (const [col, w, off] of [['#5a1210', 6, -1], ['#d8312b', 4, 0]]) {
      for (let i = 0; i < 22; i++) {
        px(g, col, 4 + i + off, 4 + i + off, w, w);
        px(g, col, 26 - i + off, 4 + i + off, w, w);
      }
    }
    return c;
  }

  // Under the Sea (Underwater Adventure mat): open water with bubbles.
  const SEA = '#3aa6b4';

  function seaWater(seed) {
    const c = canvas();
    const g = c.getContext('2d');
    const rand = rng(seed);
    px(g, SEA, 0, 0, SIZE, SIZE);
    speckle(g, rand, ['#3197a5', '#49b6c2'], 14);
    if (rand() < 0.45) {
      const x = 3 + Math.floor(rand() * 9);
      const y = 2 + Math.floor(rand() * 10);
      px(g, '#c9f3f2', x, y, 2, 1); px(g, '#c9f3f2', x - 1, y + 1, 1, 2);
      px(g, '#c9f3f2', x + 2, y + 1, 1, 2); px(g, '#c9f3f2', x, y + 3, 2, 1);
    }
    return c;
  }

  function seaStar(seed) {
    const c = seaWater(seed);
    const g = c.getContext('2d');
    const o = '#f2789a';
    px(g, '#8a2a48', 6, 2, 4, 6); px(g, '#8a2a48', 2, 6, 12, 4); px(g, '#8a2a48', 4, 8, 4, 5); px(g, '#8a2a48', 8, 8, 4, 5);
    px(g, o, 7, 3, 2, 4); px(g, o, 3, 7, 10, 2); px(g, o, 5, 9, 2, 3); px(g, o, 9, 9, 2, 3); px(g, o, 6, 6, 4, 4);
    px(g, '#ffd2df', 7, 7, 2, 2);
    return c;
  }

  function coral(seed) {
    const c = seaWater(seed);
    const g = c.getContext('2d');
    const o = '#ff6f61';
    const l = '#ffb199';
    px(g, '#b8342c', 7, 9, 2, 6);
    px(g, o, 7, 4, 2, 6); px(g, o, 3, 6, 2, 6); px(g, o, 11, 5, 2, 6);
    px(g, o, 4, 11, 4, 2); px(g, o, 9, 10, 3, 2);
    px(g, l, 7, 3, 2, 1); px(g, l, 3, 5, 2, 1); px(g, l, 11, 4, 2, 1);
    return c;
  }

  // A rocky outcrop with the red-brown rim of the mat's reef walls.
  // A block of the mat's reef wall: sandy rock with a red-brown rim on each
  // side that faces the open sea (`sea` says which sides: { N, E, S, W }).
  // Levels only put reef on the edge of the map, so it reads as the shore.
  function reefRock(seed, sea) {
    const c = canvas();
    const g = c.getContext('2d');
    const rand = rng(seed * 5 + 1);
    px(g, '#c99a6a', 0, 0, SIZE, SIZE);
    speckle(g, rand, ['#a97a4c', '#dcb388', '#b8885a'], 26);
    for (let i = 0; i < 3; i++) {
      const x = 3 + Math.floor(rand() * 9);
      const y = 3 + Math.floor(rand() * 9);
      px(g, '#6e4524', x, y, 2, 1);
      px(g, '#8a5a32', x, y + 1, 2, 1);
    }
    const RIM = '#a8452c';
    const DARK = '#5a2010';
    if (sea.N) { px(g, SEA, 0, 0, SIZE, 2); px(g, RIM, 0, 2, SIZE, 2); px(g, DARK, 0, 4, SIZE, 1); }
    if (sea.S) { px(g, SEA, 0, 14, SIZE, 2); px(g, RIM, 0, 12, SIZE, 2); px(g, DARK, 0, 11, SIZE, 1); }
    if (sea.W) { px(g, SEA, 0, 0, 2, SIZE); px(g, RIM, 2, 0, 2, SIZE); px(g, DARK, 4, 0, 1, SIZE); }
    if (sea.E) { px(g, SEA, 14, 0, 2, SIZE); px(g, RIM, 12, 0, 2, SIZE); px(g, DARK, 11, 0, 1, SIZE); }
    // Dots along the rim, like the pebbles drawn on the mat's reef edge.
    for (let i = 1; i < SIZE; i += 3) {
      if (sea.N) px(g, DARK, i, 3);
      if (sea.S) px(g, DARK, i, 12);
      if (sea.W) px(g, DARK, 3, i);
      if (sea.E) px(g, DARK, 12, i);
    }
    return c;
  }

  function seaStart(seed) {
    const c = seaWater(seed);
    const g = c.getContext('2d');
    px(g, '#8a6a43', 2, 2, 12, 12);
    px(g, '#e6d2a8', 3, 3, 10, 10);
    px(g, '#c9b384', 3, 12, 10, 1);
    px(g, '#c9b384', 12, 3, 1, 10);
    return c;
  }

  // Background tile for one square of a world map. `near(dx, dy)` returns the
  // map character next to this square (undefined off the map).
  function worldTile(world, ch, seed, near) {
    const sides = (test) => ({ N: test(near(0, -1)), E: test(near(1, 0)), S: test(near(0, 1)), W: test(near(-1, 0)) });
    if (world === 'pond') {
      if (ch === 'L') return lilyPad(seed);
      if (ch === 'V') return cattails(seed);
      if (ch === 'S') return dock(seed);
      return pondWater(seed);
    }
    if (world === 'island') {
      if (ch === 'O') return ocean(seed, sides((c) => c !== undefined && c !== 'O'));
      if (ch === 'M') return mountain(seed);
      if (ch === 'P') return pine(seed);
      if (ch === 'f') return tuft(seed);
      if (ch === '=') return trail(seed, sides((c) => c === '=' || c === 'S' || c === 'A' || c === 'B' || c === 'C'));
      if (ch === 'S') return chargingStation(seed);
      return land(seed);
    }
    if (ch === '*') return seaStar(seed);
    if (ch === '%') return coral(seed);
    if (ch === '#') return reefRock(seed, sides((c) => c !== undefined && c !== '#'));
    if (ch === 'S') return seaStart(seed);
    return seaWater(seed);
  }

  // ---------- Sprites made from the Roversa brand art (see tools/pixelate.py) ----------

  const ASSETS = 'assets/sprites/';
  // Same build stamp as the page (see index.html), so new art is never mixed with old.
  const buildMeta = typeof document !== 'undefined' && document.querySelector('meta[name="roversa-build"]');
  const VERSION = buildMeta ? '?v=' + buildMeta.content : '';

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
      img.src = ASSETS + file + VERSION;
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

  // Adventure worlds: what the destinations A, B, C look like in each world,
  // and the characters that stand on a square and block it (drawn full size on top).
  const duck = imageCanvas('goal-duck.png', 32);
  const toothie = imageCanvas('char-toothie.png', 32);
  const byteclaw = imageCanvas('char-byteclaw.png', 32);
  const pirate = imageCanvas('char-captain.png', 32);
  const octopus = CHARACTERS.find((ch) => ch.id === 'octopus').sprite;
  const WORLDS = {
    pond: { goals: { A: duck, B: duck, C: duck }, props: {} },
    island: { goals: { A: xMark(), B: goals.A, C: goals.B }, props: { K: pirate, Y: byteclaw } },
    sea: { goals: { A: goals.A, B: octopus, C: toothie }, props: {} },
  };

  const ready = Promise.all([robotBase.loaded, ...Object.values(goals).map((g) => g.loaded), ...CHARACTERS.map((ch) => ch.sprite.loaded),
    duck.loaded, toothie.loaded, byteclaw.loaded, pirate.loaded]);

  root.RoversaSprites = {
    SIZE, rng, grass, flowers, sand, tree, rock, water, startPad, robot, smileyRobot, flag, FLAG_COLORS, goals, TEAM_COLORS, CHARACTERS,
    WORLDS, worldTile, ready,
  };
})(globalThis);
