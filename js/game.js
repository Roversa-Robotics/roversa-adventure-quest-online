// Screens, drawing, gamepiece drag-and-drop and running programs.
(function () {
  'use strict';

  const E = globalThis.RoversaEngine;
  const SP = globalThis.RoversaSprites;
  const AUDIO = globalThis.RoversaAudio;
  const SND = AUDIO.sfx;
  const LEVELS = globalThis.ROVERSA_LEVELS;

  const T = SP.SIZE; // tile size in sprite pixels
  const SCALE = 4; // board canvas pixels per sprite pixel
  const MOVE_MS = 380;
  const TURN_MS = 300;
  const PAUSE_MS = 140;
  const DICE_FACES = ['F', 'B', 'L', 'R', 'W', 'P'];
  const GOAL_NAMES = { A: 'the flag', B: 'the treasure chest', C: 'the gem' };
  const TILE_NAMES = { T: 'a tree', R: 'a rock', W: 'the water' };

  const $ = (sel) => document.querySelector(sel);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let uidCounter = 0;
  const uid = () => ++uidCounter;

  // ---------- Saved progress (best stars per level) ----------

  function loadStars() {
    try { return JSON.parse(localStorage.getItem('roversa-stars') || '{}'); } catch (e) { return {}; }
  }
  function saveStars(name, stars) {
    const all = loadStars();
    if ((all[name] || 0) >= stars) return;
    all[name] = stars;
    try { localStorage.setItem('roversa-stars', JSON.stringify(all)); } catch (e) { /* storage blocked */ }
  }

  // ---------- Gamepiece pictures ----------

  // Colors and icons follow the 3D-printed pieces in Roversa-Robotics/roversa-quest:
  // orange turn left, blue turn right, purple forward, yellow back,
  // red "Roversa" word (repeat) and green Roversa logo (wild).
  const PIECE_COLORS = {
    F: ['#b665c7', '#6f347d'],
    B: ['#e3dc38', '#8f8a14'],
    L: ['#ff8529', '#a84f0c'],
    R: ['#466fc4', '#273f7a'],
    P: ['#d43a32', '#7e1d18'],
    W: ['#488f3f', '#264f20'],
  };
  const PIECE_NAMES = { F: 'Forward', B: 'Back', L: 'Turn left', R: 'Turn right', P: 'Repeat', W: 'Wild' };
  const ICON_COLOR = '#efe8d6';

  // The direction dot under each arrow, as on the printed pieces.
  const DOT = '<circle cx="45" cy="54" r="3.6"/>';

  function iconMarkup(t, id) {
    // A thick half-circle hook with the arrowhead on top, like the printed turn pieces.
    const turn = '<path d="M40,17.5 H47 A12,12 0 0 1 47,41.5" fill="none" stroke="currentColor" stroke-width="10.5"/>' +
      '<polygon points="25,17.5 41,3.5 41,31.5"/>';
    switch (t) {
      case 'F': return '<polygon points="45,6 60,23 51,23 51,44 39,44 39,23 30,23"/>' + DOT;
      case 'B': return '<polygon points="45,46 60,29 51,29 51,8 39,8 39,29 30,29"/>' + DOT;
      case 'L': return turn + DOT;
      case 'R': return '<g transform="translate(90,0) scale(-1,1)">' + turn + '</g>' + DOT;
      case 'P': return '<text font-family="\'Arial Rounded MT Bold\', \'Trebuchet MS\', system-ui, sans-serif" font-weight="700" font-size="12.5">' +
        '<textPath href="#' + id + '" textLength="68" lengthAdjust="spacing">Roversa</textPath></text>';
      // The Roversa logo's six squares, centered on the piece.
      case 'W': return [[45, 15], [33, 26], [57, 26], [45, 37], [33, 48], [57, 48]]
        .map(([x, y]) => '<rect x="' + (x - 5) + '" y="' + (y - 5) + '" width="10" height="10" rx="2.5"/>').join('');
      default: return '';
    }
  }

  // Puzzle outline: a flat dovetail tab sticks out on the left and a matching
  // socket is cut into the right, so pieces in a row lock together like the real ones.
  const PIECE_SHAPE = 'M20,0 H70 Q77,0 77,7 V20.5 L69,18.6 Q67,18.2 67,20.2 V43.8 Q67,45.8 69,45.4 L77,43.5 ' +
    'V57 Q77,64 70,64 H20 Q13,64 13,57 V43 L5,45.4 Q3,45.8 3,43.8 V20.2 Q3,18.2 5,18.6 L13,21 V7 Q13,0 20,0 Z';

  function pieceSvg(t, chosen) {
    const [color, dark] = PIECE_COLORS[t];
    const id = 'arc' + uid();
    // A wild piece keeps its green logo color but shows the arrow the player picked.
    // The socket eats into the right side, so the picture sits a little left of the
    // outline's middle to look centered on the solid part of the piece.
    const icon = '<g transform="translate(-5,0)">' + iconMarkup(t === 'W' && chosen ? chosen : t, id) + '</g>';
    return '<svg viewBox="0 0 77 64" aria-hidden="true">' +
      (t === 'P' ? '<defs><path id="' + id + '" d="M33.5,42.6 A15,15 0 1 1 56.5,42.6"/></defs>' : '') +
      '<path d="' + PIECE_SHAPE + '" fill="' + color + '" stroke="' + dark + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M20,3.5 H70" stroke="rgba(255,255,255,0.35)" stroke-width="2.5" stroke-linecap="round"/>' +
      '<g style="color:rgba(0,0,0,0.3)" fill="currentColor" transform="translate(0,2)">' + icon + '</g>' +
      '<g style="color:' + ICON_COLOR + '" fill="currentColor">' + icon + '</g>' +
      (t === 'W' && chosen ? '<g fill="' + ICON_COLOR + '" transform="translate(41,41) scale(0.32)">' + iconMarkup('W') + '</g>' : '') +
      '</svg>';
  }

  function pieceEl(t, chosen) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'piece';
    el.dataset.t = t;
    el.innerHTML = pieceSvg(t, chosen);
    el.setAttribute('aria-label', t === 'W' && chosen ? 'Wild: ' + PIECE_NAMES[chosen] : PIECE_NAMES[t]);
    return el;
  }

  // ---------- Game state ----------

  const game = {
    mode: null, // 'level' or 'quest'
    levelIndex: 0,
    level: null,
    map: null,
    view: null,
    robots: [],
    active: 0,
    program: [], // [{ id, t, chosen }]
    limits: {}, // level mode: how many of each piece
    tray: [], // quest mode: rolled pieces not yet placed [{ id, t }]
    slots: 5,
    running: false,
    rolling: false,
    predict: null,
    trail: [],
    particles: [],
    runIndex: -1,
    doneUpTo: -1,
    quest: null,
  };

  function makeRobot(start, dir, team) {
    const colors = SP.TEAM_COLORS[team];
    return {
      team, name: colors.name, css: colors.css,
      sprite: SP.robot(colors.body, colors.dark),
      sx: start.x, sy: start.y, sdir: dir,
      x: start.x, y: start.y, dir,
      rx: start.x, ry: start.y, ang: (dir * Math.PI) / 2, scale: 1, alpha: 1, bump: 0,
      visited: new Set(),
      turns: 0,
    };
  }

  function resetRobot(r) {
    Object.assign(r, { x: r.sx, y: r.sy, dir: r.sdir, rx: r.sx, ry: r.sy, ang: (r.sdir * Math.PI) / 2, scale: 1, alpha: 1 });
    r.visited = new Set();
  }

  // ---------- Board drawing ----------

  const board = $('#board');
  const bctx = board.getContext('2d');

  function buildView(map, seedBase) {
    const bg = document.createElement('canvas');
    bg.width = map.cols * T;
    bg.height = map.rows * T;
    const g = bg.getContext('2d');
    const water = [];
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        const seed = seedBase * 1000 + y * 37 + x * 11 + 1;
        const ch = map.grid[y][x];
        let tile;
        if (ch === 'T') tile = SP.tree(seed);
        else if (ch === 'R') tile = SP.rock(seed);
        else if (ch === 'f') tile = SP.flowers(seed);
        else if (ch === '=') tile = SP.sand(seed);
        else if (ch === 'W') {
          water.push({ x, y, frames: [SP.water(seed, 0), SP.water(seed, 1)] });
          tile = water[water.length - 1].frames[0];
        } else tile = SP.grass(seed);
        g.drawImage(tile, x * T, y * T);
      }
    }
    Object.values(map.starts).forEach((s) => g.drawImage(SP.startPad(seedBase + s.x), s.x * T, s.y * T));
    return { bg, water, cols: map.cols, rows: map.rows };
  }

  function sizeBoard() {
    const v = game.view;
    board.width = v.cols * T * SCALE;
    board.height = v.rows * T * SCALE;
    // Keep the whole board on screen on short, wide displays.
    $('.board-frame').style.maxWidth = 'max(300px, calc((100vh - 230px) * ' + (v.cols / v.rows).toFixed(3) + '))';
  }

  function drawFrame(now) {
    requestAnimationFrame(drawFrame);
    const v = game.view;
    if (!v || !$('#screen-game').classList.contains('active')) return;
    const S = T * SCALE;
    const g = bctx;
    g.imageSmoothingEnabled = false;
    g.drawImage(v.bg, 0, 0, board.width, board.height);
    const frame = Math.floor(now / 600) % 2;
    v.water.forEach((w) => g.drawImage(w.frames[frame], w.x * S, w.y * S, S, S));

    // Path the robot drove on this run.
    g.fillStyle = 'rgba(255,255,255,0.55)';
    game.trail.forEach((p) => g.fillRect((p.x + 0.5) * S - SCALE * 1.5, (p.y + 0.5) * S - SCALE * 1.5, SCALE * 3, SCALE * 3));

    // The player's guess of where Roversa will stop.
    if (game.predict) {
      const pulse = 0.55 + 0.45 * Math.sin(now / 200);
      g.strokeStyle = 'rgba(255, 230, 80,' + pulse + ')';
      g.lineWidth = SCALE * 1.5;
      g.setLineDash([SCALE * 3, SCALE * 2]);
      g.strokeRect(game.predict.x * S + SCALE * 1.5, game.predict.y * S + SCALE * 1.5, S - SCALE * 3, S - SCALE * 3);
      g.setLineDash([]);
      g.fillStyle = 'rgba(255, 230, 80,' + pulse + ')';
      g.font = 'bold ' + S * 0.45 + 'px system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('?', (game.predict.x + 0.5) * S, (game.predict.y + 0.5) * S);
    }

    // Destinations.
    game.map.goals.forEach((goal, i) => {
      const bob = Math.round(Math.sin(now / 300 + i) * 1.5) * SCALE;
      const who = game.robots.filter((r) => r.visited.has(goal.id));
      g.globalAlpha = game.mode === 'level' && who.length ? 0.6 : 1;
      g.drawImage(SP.goals[goal.id], goal.x * S, goal.y * S + bob, S, S);
      g.globalAlpha = 1;
      if (game.mode === 'level' && who.length) drawCheck(g, goal.x * S + S * 0.62, goal.y * S + S * 0.05, S * 0.36);
      if (game.mode === 'quest') {
        who.forEach((r, k) => {
          g.fillStyle = '#0e1024';
          g.fillRect(goal.x * S + S * 0.08 + k * S * 0.3 - SCALE, goal.y * S + S * 0.74 - SCALE, S * 0.24 + SCALE * 2, S * 0.2 + SCALE * 2);
          g.fillStyle = r.css;
          g.fillRect(goal.x * S + S * 0.08 + k * S * 0.3, goal.y * S + S * 0.74, S * 0.24, S * 0.2);
        });
      }
    });

    // Robots.
    game.robots.forEach((r, i) => {
      g.save();
      g.translate((r.rx + 0.5) * S + r.bump, (r.ry + 0.5) * S);
      g.rotate(r.ang);
      g.scale(r.scale, r.scale);
      g.globalAlpha = r.alpha;
      g.drawImage(r.sprite, -S / 2, -S / 2, S, S);
      g.restore();
      if (game.mode === 'quest' && game.robots.length > 1 && i === game.active && r.alpha > 0.5) {
        const bob = Math.round(Math.sin(now / 200) * 1.5) * SCALE;
        const cx = (r.rx + 0.5) * S;
        const top = r.ry * S - SCALE * 2 + bob;
        g.fillStyle = '#0e1024';
        g.beginPath(); g.moveTo(cx - SCALE * 4, top - SCALE * 4); g.lineTo(cx + SCALE * 4, top - SCALE * 4); g.lineTo(cx, top + SCALE); g.fill();
        g.fillStyle = '#f2c230';
        g.beginPath(); g.moveTo(cx - SCALE * 3, top - SCALE * 3.5); g.lineTo(cx + SCALE * 3, top - SCALE * 3.5); g.lineTo(cx, top); g.fill();
      }
    });

    // Sparkles.
    game.particles = game.particles.filter((p) => p.life > 0);
    game.particles.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
      g.fillStyle = p.color;
      g.fillRect(p.x, p.y, SCALE * 2, SCALE * 2);
    });
  }

  function drawCheck(g, x, y, size) {
    g.fillStyle = '#0e1024';
    g.beginPath(); g.arc(x + size / 2, y + size / 2, size / 2 + SCALE, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2fa84f';
    g.beginPath(); g.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff';
    g.lineWidth = SCALE * 1.5;
    g.beginPath();
    g.moveTo(x + size * 0.25, y + size * 0.52);
    g.lineTo(x + size * 0.43, y + size * 0.7);
    g.lineTo(x + size * 0.76, y + size * 0.32);
    g.stroke();
  }

  function sparkle(x, y) {
    const S = T * SCALE;
    const colors = ['#fff59d', '#ffffff', '#ffd23f', '#7cf0a0', '#9fd4ff'];
    for (let i = 0; i < 26; i++) {
      game.particles.push({
        x: (x + 0.5) * S, y: (y + 0.4) * S,
        vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 8 - 2,
        life: 30 + Math.random() * 20, color: colors[i % colors.length],
      });
    }
  }

  function tween(obj, to, ms) {
    return new Promise((resolve) => {
      const from = {};
      Object.keys(to).forEach((k) => { from[k] = obj[k]; });
      const t0 = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - t0) / ms);
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        Object.keys(to).forEach((k) => { obj[k] = from[k] + (to[k] - from[k]) * e; });
        if (p < 1) requestAnimationFrame(tick); else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  // ---------- Screens ----------

  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + id));
    window.scrollTo(0, 0);
    if (id === 'levels') renderLevelGrid();
  }

  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { SND.tap(); show(b.dataset.go); }));
  document.querySelectorAll('[data-players]').forEach((b) => b.addEventListener('click', () => { SND.tap(); startQuest(Number(b.dataset.players)); }));

  $('#btn-back').addEventListener('click', () => {
    if (game.running) return;
    SND.tap();
    closeModal();
    show(game.mode === 'level' ? 'levels' : 'quest-setup');
  });

  const soundBtn = $('#btn-sound');
  function syncSoundBtn() { soundBtn.classList.toggle('off', AUDIO.isMuted()); }
  soundBtn.addEventListener('click', () => { AUDIO.setMuted(!AUDIO.isMuted()); syncSoundBtn(); SND.tap(); });
  syncSoundBtn();

  function setMessage(text, kind) {
    const m = $('#message');
    m.textContent = text;
    m.className = 'message' + (kind ? ' ' + kind : '');
  }

  // ---------- Level picker ----------

  const parCache = {};
  function par(i) {
    if (!(i in parCache)) {
      const sol = E.solve(LEVELS[i], LEVELS[i].slots);
      parCache[i] = sol ? sol.length : LEVELS[i].slots;
    }
    return parCache[i];
  }

  function renderLevelGrid() {
    const grid = $('#level-grid');
    grid.innerHTML = '';
    const stars = loadStars();
    LEVELS.forEach((level, i) => {
      const card = document.createElement('button');
      card.className = 'level-card';
      const map = E.parseMap(level.map);
      const v = buildView(map, i + 1);
      const c = document.createElement('canvas');
      c.width = v.bg.width;
      c.height = v.bg.height;
      const g = c.getContext('2d');
      g.drawImage(v.bg, 0, 0);
      map.goals.forEach((goal) => g.drawImage(SP.goals[goal.id], goal.x * T, goal.y * T));
      const st = map.starts['1'];
      g.save();
      g.translate(st.x * T + T / 2, st.y * T + T / 2);
      g.rotate((E.DIR_NAMES[level.startDir || 'N'] * Math.PI) / 2);
      g.drawImage(SP.robot(SP.TEAM_COLORS[0].body, SP.TEAM_COLORS[0].dark), -T / 2, -T / 2);
      g.restore();
      const n = stars[level.name] || 0;
      card.innerHTML = '<div class="num">LEVEL ' + (i + 1) + '</div><div class="name"></div>' +
        '<div class="stars" aria-label="' + n + ' of 3 stars">' +
        [0, 1, 2].map((k) => '<span class="' + (k < n ? 'on' : '') + '">&#9733;</span>').join('') + '</div>';
      card.querySelector('.name').textContent = level.name;
      card.prepend(c);
      card.addEventListener('click', () => { SND.tap(); startLevel(i); });
      grid.appendChild(card);
    });
  }

  // ---------- Starting a level or a quest ----------

  function enterGame() {
    show('game');
    sizeBoard();
    game.trail = [];
    game.predict = null;
    game.particles = [];
    game.runIndex = -1;
    game.doneUpTo = -1;
    game.program = [];
    renderAll();
  }

  function startLevel(i) {
    const level = LEVELS[i];
    game.mode = 'level';
    game.levelIndex = i;
    game.level = level;
    game.map = E.parseMap(level.map);
    game.view = buildView(game.map, i + 1);
    game.robots = [makeRobot(game.map.starts['1'], E.DIR_NAMES[level.startDir || 'N'], 0)];
    game.active = 0;
    game.limits = Object.assign({}, level.pieces);
    game.slots = level.slots;
    game.quest = null;
    $('#game-title').textContent = (i + 1) + '. ' + level.name;
    $('#scoreboard').hidden = true;
    $('#btn-roll').hidden = true;
    $('#pool-label').textContent = 'Gamepieces';
    $('#btn-reset').setAttribute('aria-label', 'Start over');
    $('#btn-clear').setAttribute('aria-label', 'Clear program');
    enterGame();
    setMessage(level.hint);
  }

  // Builds a random 8x8 quest map with the flag, chest and gem.
  function questMap(players) {
    const N = 8;
    for (let attempt = 0; attempt < 200; attempt++) {
      const rows = [];
      for (let y = 0; y < N; y++) rows.push(new Array(N).fill('.'));
      const starts = [{ x: 0, y: N - 1 }, { x: N - 1, y: 0 }].slice(0, players);
      const near = (x, y, pts, d) => pts.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) < d);
      const free = (x, y) => rows[y][x] === '.' && !near(x, y, starts, 2);
      const rand = (n) => Math.floor(Math.random() * n);
      for (let i = 0; i < 5; i++) {
        const x = rand(N), y = rand(N);
        if (free(x, y)) rows[y][x] = Math.random() < 0.5 ? 'T' : 'R';
      }
      const px = rand(N - 1), py = rand(N);
      if (free(px, py) && free(px + 1, py)) { rows[py][px] = 'W'; rows[py][px + 1] = 'W'; }
      for (let i = 0; i < 6; i++) {
        const x = rand(N), y = rand(N);
        if (free(x, y)) rows[y][x] = 'f';
      }
      const goals = [];
      for (let tries = 0; goals.length < 3 && tries < 200; tries++) {
        const x = rand(N), y = rand(N);
        if (rows[y][x] === 'f' || rows[y][x] === '.') {
          if (near(x, y, starts, 4) || near(x, y, goals, 3)) continue;
          goals.push({ x, y });
        }
      }
      if (goals.length < 3) continue;
      goals.forEach((g, i) => { rows[g.y][g.x] = 'ABC'[i]; });
      starts.forEach((s, i) => { rows[s.y][s.x] = String(i + 1); });
      const strs = rows.map((r) => r.join(''));
      const map = E.parseMap(strs);
      // Every destination must be reachable from every start.
      const ok = starts.every((s) => {
        const seen = new Set([s.x + ',' + s.y]);
        const queue = [s];
        while (queue.length) {
          const p = queue.shift();
          for (let d = 0; d < 4; d++) {
            const nx = p.x + E.DX[d], ny = p.y + E.DY[d];
            const k = nx + ',' + ny;
            if (!E.inBounds(map.grid, nx, ny) || E.isBlocked(map.grid, nx, ny) || seen.has(k)) continue;
            seen.add(k);
            queue.push({ x: nx, y: ny });
          }
        }
        return map.goals.every((g) => seen.has(g.x + ',' + g.y));
      });
      if (ok) return map;
    }
    return E.parseMap(['.......2', 'A.......', '........', '...B....', '........', '......C.', '........', '1.......']);
  }

  function startQuest(players) {
    game.mode = 'quest';
    game.level = null;
    game.map = questMap(players);
    game.view = buildView(game.map, Math.floor(Math.random() * 1000));
    game.robots = [makeRobot(game.map.starts['1'], 0, 0)];
    if (players > 1) game.robots.push(makeRobot(game.map.starts['2'], 2, 1));
    game.active = 0;
    game.tray = [];
    game.slots = 5;
    game.quest = { phase: 'roll', round: 1, winner: null };
    $('#game-title').textContent = 'Dice Quest';
    $('#scoreboard').hidden = false;
    $('#btn-roll').hidden = false;
    $('#pool-label').textContent = 'Your roll';
    $('#btn-reset').setAttribute('aria-label', 'New game');
    $('#btn-clear').setAttribute('aria-label', 'Take pieces out');
    enterGame();
    promptRoll();
  }

  function promptRoll() {
    const r = game.robots[game.active];
    const who = game.robots.length > 1 ? r.name + ' Roversa: ' : '';
    setMessage(who + 'press Roll to get 5 gamepieces!');
  }

  // ---------- Program and pieces ----------

  const programEl = $('#program');
  const poolEl = $('#pool');

  // Pointer taps and drags are handled in startDrag. Keyboard users press Enter
  // or Space. Click events are not used here, because after a tap re-renders
  // the row, the browser can send the click to the new piece under the finger
  // and add it twice.
  function onActivate(el, fn) {
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      fn();
    });
  }

  function usedCount(t) { return game.program.filter((p) => p.t === t).length; }

  function renderProgram(caretAt, hideIndex) {
    programEl.innerHTML = '';
    let shown = 0;
    game.program.forEach((p, i) => {
      if (caretAt != null && shown === caretAt && i !== hideIndex) addCaret();
      const el = pieceEl(p.t, p.chosen);
      el.dataset.index = i;
      if (i === hideIndex) el.classList.add('ghost-src');
      else shown++;
      if (i === game.runIndex) el.classList.add('running');
      else if (i <= game.doneUpTo) el.classList.add('done');
      el.addEventListener('pointerdown', (e) => startDrag(e, 'program', i, el));
      onActivate(el, () => tapProgram(i));
      programEl.appendChild(el);
    });
    if (caretAt != null && shown === caretAt) addCaret();
    for (let i = game.program.length; i < game.slots; i++) {
      const s = document.createElement('div');
      s.className = 'slot';
      programEl.appendChild(s);
    }
  }

  function addCaret() {
    const c = document.createElement('div');
    c.className = 'caret';
    programEl.appendChild(c);
  }

  function renderPool() {
    poolEl.innerHTML = '';
    if (game.mode === 'level') {
      E.COMMANDS.forEach((t) => {
        if (!(t in game.limits)) return;
        const left = game.limits[t] - usedCount(t);
        const el = pieceEl(t);
        el.insertAdjacentHTML('beforeend', '<span class="count">' + left + '</span>');
        el.setAttribute('aria-label', PIECE_NAMES[t] + ', ' + left + ' left');
        if (left <= 0) el.classList.add('empty');
        el.addEventListener('pointerdown', (e) => startDrag(e, 'pool', t, el));
        onActivate(el, () => addPiece(t));
        poolEl.appendChild(el);
      });
    } else {
      game.tray.forEach((p) => {
        const el = pieceEl(p.t);
        el.addEventListener('pointerdown', (e) => startDrag(e, 'pool', p.id, el));
        onActivate(el, () => addPiece(p.id));
        poolEl.appendChild(el);
      });
      if (!game.tray.length && game.quest.phase === 'arrange') {
        poolEl.innerHTML = '<span class="tip">All pieces placed. Press GO!</span>';
      }
    }
  }

  function renderScoreboard() {
    const sb = $('#scoreboard');
    if (game.mode !== 'quest') return;
    sb.innerHTML = '';
    game.robots.forEach((r, i) => {
      const box = document.createElement('div');
      box.className = 'score' + (i === game.active && game.robots.length > 1 ? ' turn' : '');
      const icon = document.createElement('canvas');
      icon.width = T; icon.height = T;
      icon.getContext('2d').drawImage(r.sprite, 0, 0);
      box.appendChild(icon);
      const label = document.createElement('span');
      label.textContent = r.name;
      if (game.robots.length > 1 && i === game.active) box.setAttribute('aria-label', r.name + ", it's your turn");
      box.appendChild(label);
      const goals = document.createElement('div');
      goals.className = 'goal-icons';
      ['A', 'B', 'C'].forEach((id) => {
        const gc = document.createElement('canvas');
        gc.width = T; gc.height = T;
        gc.getContext('2d').drawImage(SP.goals[id], 0, 0);
        if (r.visited.has(id)) gc.classList.add('got');
        gc.setAttribute('aria-label', GOAL_NAMES[id] + (r.visited.has(id) ? ' visited' : ' not yet'));
        goals.appendChild(gc);
      });
      box.appendChild(goals);
      sb.appendChild(box);
    });
  }

  function renderButtons() {
    const busy = game.running || game.rolling;
    const quest = game.quest;
    const goReady = game.program.length > 0 && (!quest || (quest.phase === 'arrange' && game.tray.length === 0));
    $('#btn-go').disabled = busy || !goReady;
    $('#btn-reset').disabled = busy;
    $('#btn-clear').disabled = busy || !game.program.length || (quest && quest.phase !== 'arrange');
    $('#btn-roll').hidden = !quest || quest.phase !== 'roll';
    $('#btn-roll').disabled = busy;
  }

  function renderAll() {
    renderProgram();
    renderPool();
    renderScoreboard();
    renderButtons();
  }

  function editable() {
    return !game.running && !game.rolling && (game.mode === 'level' || game.quest.phase === 'arrange');
  }

  // After a run, editing the program clears the old run's marks.
  function clearRunMarks() {
    game.runIndex = -1;
    game.doneUpTo = -1;
  }

  async function addPiece(key, at) {
    if (!editable()) return;
    if (game.program.length >= game.slots) {
      setMessage('The program row is full. Take a piece out first.', 'bad');
      SND.bump();
      return;
    }
    let piece;
    if (game.mode === 'level') {
      if (game.limits[key] - usedCount(key) <= 0) { SND.bump(); return; }
      piece = { id: uid(), t: key };
    } else {
      const idx = game.tray.findIndex((p) => p.id === key);
      if (idx < 0) return;
      piece = { id: key, t: game.tray[idx].t };
      if (piece.t === 'W') {
        piece.chosen = await pickWild();
        if (!piece.chosen) return;
      }
      game.tray.splice(game.tray.findIndex((p) => p.id === key), 1);
    }
    clearRunMarks();
    if (at == null || at > game.program.length) at = game.program.length;
    game.program.splice(at, 0, piece);
    SND.drop();
    renderAll();
  }

  function removePiece(i) {
    if (!editable()) return;
    const [p] = game.program.splice(i, 1);
    if (game.mode === 'quest') game.tray.push({ id: p.id, t: p.t });
    clearRunMarks();
    SND.remove();
    renderAll();
  }

  function tapProgram(i) { removePiece(i); }

  function movePiece(from, to) {
    const [p] = game.program.splice(from, 1);
    game.program.splice(to, 0, p);
    clearRunMarks();
    SND.drop();
    renderAll();
  }

  // ---------- Drag and drop (mouse and touch) ----------

  let drag = null;

  function startDrag(e, src, key, el) {
    if (!editable() || (e.button != null && e.button > 0)) return;
    if (src === 'pool' && el.classList.contains('empty')) { SND.bump(); return; }
    e.preventDefault();
    drag = { src, key, el, x0: e.clientX, y0: e.clientY, moved: false, ghost: null, insert: null };
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('pointercancel', onDragCancel);
  }

  function overProgram(e) {
    const r = programEl.getBoundingClientRect();
    const pad = 24;
    return e.clientX > r.left - pad && e.clientX < r.right + pad && e.clientY > r.top - pad && e.clientY < r.bottom + pad;
  }

  function insertionIndex(e) {
    const els = [...programEl.querySelectorAll('.piece')].filter((el) => !el.classList.contains('ghost-src'));
    for (let i = 0; i < els.length; i++) {
      const r = els[i].getBoundingClientRect();
      if (e.clientY < r.top) return i;
      if (e.clientY <= r.bottom && e.clientX < r.left + r.width / 2) return i;
    }
    return els.length;
  }

  function onDragMove(e) {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
      drag.moved = true;
      const g = drag.el.cloneNode(true);
      g.classList.add('drag-ghost');
      g.classList.remove('running', 'done');
      g.style.width = drag.el.offsetWidth + 'px';
      g.style.height = drag.el.offsetHeight + 'px';
      document.body.appendChild(g);
      drag.ghost = g;
      if (drag.src === 'program') renderProgram(null, drag.key);
    }
    drag.ghost.style.left = e.clientX + 'px';
    drag.ghost.style.top = e.clientY + 'px';
    const over = overProgram(e);
    programEl.classList.toggle('drop-target', over);
    const fits = drag.src === 'program' || game.program.length < game.slots;
    const idx = over && fits ? insertionIndex(e) : null;
    if (idx !== drag.insert) {
      drag.insert = idx;
      renderProgram(idx, drag.src === 'program' ? drag.key : null);
    }
  }

  function endDragListeners() {
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    window.removeEventListener('pointercancel', onDragCancel);
    programEl.classList.remove('drop-target');
    if (drag && drag.ghost) drag.ghost.remove();
  }

  function onDragCancel() {
    endDragListeners();
    drag = null;
    renderAll();
  }

  function onDragEnd() {
    const d = drag;
    endDragListeners();
    drag = null;
    if (!d) return;
    if (!d.moved) {
      if (d.src === 'pool') addPiece(d.key);
      else removePiece(d.key);
    } else if (d.insert != null) {
      if (d.src === 'pool') addPiece(d.key, d.insert);
      else movePiece(d.key, d.insert);
    } else if (d.src === 'program') {
      removePiece(d.key);
    } else {
      renderAll();
    }
  }

  // ---------- Pop-ups ----------

  const modal = $('#modal');
  let modalClose = null;

  let modalOpenedAt = 0;

  function openModal(html, onClose) {
    modalOpenedAt = performance.now();
    $('#modal-body').innerHTML = html;
    modal.hidden = false;
    modalClose = onClose || null;
    const first = modal.querySelector('button');
    if (first) first.focus();
  }

  function closeModal(value) {
    if (modal.hidden) return;
    modal.hidden = true;
    const cb = modalClose;
    modalClose = null;
    if (cb) cb(value);
  }

  // The tap that opened a pop-up can also land on it; ignore clicks right after it opens.
  modal.addEventListener('click', (e) => {
    if (performance.now() - modalOpenedAt < 400) { e.stopPropagation(); return; }
    if (e.target === modal) closeModal(null);
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(null); });

  function pickWild() {
    return new Promise((resolve) => {
      openModal('<h3>Wild piece!</h3><p>Which way should it go?</p><div class="choices"></div>', resolve);
      const box = modal.querySelector('.choices');
      ['F', 'B', 'L', 'R'].forEach((t) => {
        const el = pieceEl(t);
        el.addEventListener('click', () => { SND.tap(); closeModal(t); });
        box.appendChild(el);
      });
      box.querySelector('button').focus();
    });
  }

  function confetti() {
    const box = $('#confetti');
    const colors = ['#f2c230', '#e0483c', '#4a8cf0', '#2fa84f', '#ffffff', '#ff8fc8'];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('div');
      c.className = 'confetto';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
      c.style.animationDelay = Math.random() * 0.4 + 's';
      box.appendChild(c);
      setTimeout(() => c.remove(), 4000);
    }
  }

  // ---------- Prediction: tap the map to guess where Roversa stops ----------

  board.addEventListener('click', (e) => {
    if (game.running || !game.view) return;
    const r = board.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * game.view.cols);
    const y = Math.floor(((e.clientY - r.top) / r.height) * game.view.rows);
    if (!E.inBounds(game.map.grid, x, y)) return;
    if (game.predict && game.predict.x === x && game.predict.y === y) {
      game.predict = null;
      setMessage('Guess removed.');
    } else {
      game.predict = { x, y };
      setMessage('Your guess: Roversa will stop on the ? square. Press GO to find out!');
    }
    SND.tap();
  });

  // ---------- Running the program ----------

  async function doStep(r, cmd) {
    const occupied = (x, y) => game.robots.some((o) => o !== r && o.x === x && o.y === y);
    const res = E.step(game.map.grid, r, cmd, occupied);
    if (res.result === 'turn') {
      SND.turn();
      await tween(r, { ang: r.ang + (cmd === 'L' ? -1 : 1) * (Math.PI / 2) }, TURN_MS);
      r.dir = res.dir;
    } else if (res.result === 'noop') {
      SND.noop();
      await tween(r, { scale: 1.2 }, 150);
      await tween(r, { scale: 1 }, 150);
    } else if (res.result === 'move') {
      SND.move();
      await tween(r, { rx: res.x, ry: res.y }, MOVE_MS);
      r.x = res.x;
      r.y = res.y;
      game.trail.push({ x: r.x, y: r.y });
      const goal = game.map.goals.find((g) => g.x === r.x && g.y === r.y);
      if (goal && !r.visited.has(goal.id)) {
        r.visited.add(goal.id);
        SND.goal();
        sparkle(r.x, r.y);
        setMessage('You reached ' + GOAL_NAMES[goal.id] + '!', 'good');
        renderScoreboard();
      }
    } else if (res.result === 'bump' || (res.result === 'off' && game.mode === 'level')) {
      SND.bump();
      const dx = (res.tx - r.x) * 0.3, dy = (res.ty - r.y) * 0.3;
      await tween(r, { rx: r.x + dx, ry: r.y + dy }, 130);
      await tween(r, { rx: r.x, ry: r.y }, 130);
      for (let i = 0; i < 4; i++) { r.bump = (i % 2 ? -1 : 1) * SCALE * 1.5; await sleep(40); }
      r.bump = 0;
      return { result: 'bump', what: res.result === 'off' ? 'the edge' : occupied(res.tx, res.ty) ? 'the other robot' : TILE_NAMES[game.map.grid[res.ty][res.tx]] };
    } else if (res.result === 'off') {
      SND.off();
      await tween(r, { rx: r.x + (res.tx - r.x) * 0.7, ry: r.y + (res.ty - r.y) * 0.7, scale: 0.3, alpha: 0 }, 500);
      await sleep(250);
      const blocked = game.robots.some((o) => o !== r && o.x === r.sx && o.y === r.sy);
      if (!blocked) {
        Object.assign(r, { x: r.sx, y: r.sy, dir: r.sdir, rx: r.sx, ry: r.sy, ang: (r.sdir * Math.PI) / 2 });
      } else {
        Object.assign(r, { rx: r.x, ry: r.y });
      }
      sparkle(r.x, r.y);
      await tween(r, { scale: 1, alpha: 1 }, 300);
      return { result: 'off' };
    }
    return { result: res.result };
  }

  async function run() {
    if (game.running || !game.program.length) return;
    const r = game.robots[game.active];
    game.running = true;
    closeModal();
    if (game.mode === 'level') resetRobot(r);
    game.trail = [{ x: r.x, y: r.y }];
    clearRunMarks();
    renderAll();
    setMessage('Roversa is driving...');
    const steps = E.resolve(game.program);
    let outcome = { result: 'done' };
    for (let i = 0; i < steps.length; i++) {
      game.runIndex = i;
      renderProgram();
      const res = await doStep(r, steps[i]);
      game.doneUpTo = i;
      if (res.result === 'bump' || res.result === 'off') { outcome = res; break; }
      await sleep(PAUSE_MS);
    }
    game.runIndex = -1;
    game.running = false;
    renderProgram();
    if (game.mode === 'level') finishLevelRun(r, outcome);
    else finishQuestTurn(r, outcome);
  }

  function predictionNote(r) {
    if (!game.predict) return '';
    const right = game.predict.x === r.x && game.predict.y === r.y;
    game.predict = null;
    if (right) { setTimeout(SND.predict, 400); return ' Your guess was right!'; }
    return ' Your guess was not quite right.';
  }

  function finishLevelRun(r, outcome) {
    const note = predictionNote(r);
    const allDone = game.map.goals.every((g) => r.visited.has(g.id));
    if (allDone) {
      const used = game.program.length;
      const best = par(game.levelIndex);
      const stars = used <= best ? 3 : used <= best + 2 ? 2 : 1;
      saveStars(game.level.name, stars);
      setMessage('You did it!' + note, 'good');
      setTimeout(() => {
        SND.win();
        confetti();
        const next = game.levelIndex + 1 < LEVELS.length;
        openModal(
          '<h3>Level complete!</h3>' +
          '<div class="big-stars">' + [0, 1, 2].map((k) => '<span class="' + (k < stars ? 'on' : '') + '">&#9733;</span>').join('') + '</div>' +
          '<p>You used ' + used + ' piece' + (used === 1 ? '' : 's') + '.' +
          (stars < 3 ? ' Can you do it with only ' + best + '?' : ' That is the fewest possible!') + note + '</p>' +
          '<div class="choices">' +
          '<button class="btn gray" data-act="again">Try again</button>' +
          (next ? '<button class="btn big green" data-act="next">Next &#9654;</button>' : '<button class="btn big green" data-act="levels">All levels</button>') +
          '</div>'
        );
        modal.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
          SND.tap();
          const act = b.dataset.act;
          closeModal();
          if (act === 'next') startLevel(game.levelIndex + 1);
          else if (act === 'levels') show('levels');
        }));
        const nextBtn = modal.querySelector('.btn.green');
        if (nextBtn) nextBtn.focus();
      }, 600);
    } else if (outcome.result === 'bump') {
      setMessage('Bump! Roversa ran into ' + outcome.what + '. Change the program and try again.' + note, 'bad');
    } else {
      const left = game.map.goals.filter((g) => !r.visited.has(g.id)).map((g) => GOAL_NAMES[g.id]);
      setMessage('Almost! Roversa still needs to visit ' + left.join(' and ') + '. Change the program and try again.' + note, 'bad');
    }
    renderButtons();
  }

  function finishQuestTurn(r, outcome) {
    const note = predictionNote(r);
    r.turns++;
    const q = game.quest;
    if (r.visited.size === 3) {
      q.phase = 'over';
      q.winner = r;
      renderAll();
      setMessage(r.name + ' Roversa visited all three!', 'good');
      setTimeout(() => {
        SND.win();
        confetti();
        openModal(
          '<h3>' + (game.robots.length > 1 ? r.name + ' wins!' : 'Quest complete!') + '</h3>' +
          '<p>' + r.name + ' Roversa visited the flag, the chest and the gem in ' + r.turns + ' turn' + (r.turns === 1 ? '' : 's') + '.</p>' +
          '<div class="choices"><button class="btn gray" data-act="home">Home</button>' +
          '<button class="btn big green" data-act="again">Play again</button></div>'
        );
        modal.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
          SND.tap();
          closeModal();
          if (b.dataset.act === 'again') startQuest(game.robots.length);
          else show('title');
        }));
      }, 600);
      return;
    }
    let text = '';
    if (outcome.result === 'bump') text = 'Bump! ' + r.name + ' Roversa ran into ' + outcome.what + ' and stopped.';
    else if (outcome.result === 'off') text = 'Whoops! ' + r.name + ' Roversa drove off the map and went back to the start.';
    else text = r.name + ' Roversa stopped here.';
    text += note;
    q.phase = 'roll';
    if (game.robots.length > 1) {
      game.active = (game.active + 1) % game.robots.length;
      text += ' Now it is ' + game.robots[game.active].name + "'s turn. Press Roll!";
    } else {
      text += ' Press Roll for your next turn.';
    }
    setMessage(text, outcome.result === 'done' ? '' : 'bad');
    renderAll();
  }

  async function roll() {
    const q = game.quest;
    if (!q || q.phase !== 'roll' || game.rolling) return;
    game.rolling = true;
    game.program = [];
    game.trail = [];
    clearRunMarks();
    renderAll();
    const final = [0, 1, 2, 3, 4].map(() => DICE_FACES[Math.floor(Math.random() * DICE_FACES.length)]);
    for (let k = 0; k < 10; k++) {
      game.tray = final.map((t, i) => ({ id: uid(), t: k < 9 - (4 - i) ? DICE_FACES[Math.floor(Math.random() * 6)] : t }));
      renderPool();
      SND.dice();
      await sleep(70 + k * 12);
    }
    game.tray = final.map((t) => ({ id: uid(), t }));
    q.phase = 'arrange';
    game.rolling = false;
    renderAll();
    setMessage('Put all 5 pieces in the program row in the order you want, then press GO.');
  }

  $('#btn-go').addEventListener('click', run);
  $('#btn-roll').addEventListener('click', roll);

  $('#btn-clear').addEventListener('click', () => {
    if (!editable() || !game.program.length) return;
    if (game.mode === 'quest') game.program.forEach((p) => game.tray.push({ id: p.id, t: p.t }));
    game.program = [];
    clearRunMarks();
    SND.remove();
    renderAll();
  });

  $('#btn-reset').addEventListener('click', () => {
    if (game.running || game.rolling) return;
    SND.tap();
    if (game.mode === 'level') {
      resetRobot(game.robots[0]);
      game.trail = [];
      game.predict = null;
      clearRunMarks();
      renderAll();
      setMessage(game.level.hint);
      return;
    }
    openModal(
      '<h3>New game?</h3><p>Start a new Dice Quest with a new map.</p>' +
      '<div class="choices"><button class="btn gray" data-act="no">Keep playing</button>' +
      '<button class="btn big red" data-act="yes">New game</button></div>'
    );
    modal.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      SND.tap();
      closeModal();
      if (b.dataset.act === 'yes') startQuest(game.robots.length);
    }));
  });

  // ---------- Start ----------

  const titleRobot = $('#title-robot');
  titleRobot.getContext('2d').drawImage(SP.robot(SP.TEAM_COLORS[0].body, SP.TEAM_COLORS[0].dark), 0, 0);
  requestAnimationFrame(drawFrame);

  // Handy for testing: index.html#level=3 or #quest=2 jumps straight in.
  function openFromHash() {
    const hash = new URLSearchParams(location.hash.slice(1));
    if (game.running || game.rolling) return;
    closeModal();
    if (hash.has('level')) startLevel(Math.max(0, Math.min(LEVELS.length - 1, Number(hash.get('level')) - 1)));
    else if (hash.has('quest')) startQuest(hash.get('quest') === '2' ? 2 : 1);
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();
})();
