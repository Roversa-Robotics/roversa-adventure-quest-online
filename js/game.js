// Screens, drawing, puzzle piece drag-and-drop and running programs.
(function () {
  'use strict';

  const E = globalThis.RoversaEngine;
  const SP = globalThis.RoversaSprites;
  const AI = globalThis.RoversaAI;
  const AUDIO = globalThis.RoversaAudio;
  const SND = AUDIO.sfx;
  const LEVELS = globalThis.ROVERSA_LEVELS;
  const I18N = globalThis.RoversaI18n;
  const tr = I18N.tr;
  // Name tables that always answer in the current language, e.g. PIECE_NAMES.F.
  const named = (prefix) => new Proxy({}, { get: (o, k) => tr(prefix + String(k)) });

  const T = SP.SIZE; // tile size in sprite pixels
  const SCALE = 4; // board canvas pixels per sprite pixel
  const MOVE_MS = 380;
  const TURN_MS = 300;
  const PAUSE_MS = 140;
  const STOP_SHOW_MS = 2000; // how long Roversa waits where it stopped before going back
  const HOME_MS = 110; // per square when Roversa slides back to the start
  const DICE_FACES = ['F', 'B', 'L', 'R', 'W', 'P'];
  const GOAL_NAMES = named('goal.');
  const TILE_NAMES = named('tile.');

  // The Adventure world being played ('pond', 'island' or 'sea'), or null in Dice Quest.
  const world = () => (game.mode === 'level' && game.level && game.level.world) || null;
  // Destination pictures and names depend on the world: ducks in the pond, the X on the island...
  const goalArt = (id, w = world()) => (w ? SP.WORLDS[w].goals[id] : SP.goals[id]);
  const goalName = (id) => (world() ? tr('goal.' + world() + '.' + id) : GOAL_NAMES[id]);
  const goalTo = (id) => tr((world() ? 'goalTo.' + world() + '.' : 'goalTo.') + id);

  const $ = (sel) => document.querySelector(sel);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let uidCounter = 0;
  const uid = () => ++uidCounter;

  // ---------- Saved progress (best stars per level) ----------

  function loadStars() {
    try { return JSON.parse(localStorage.getItem('roversa-stars') || '{}'); } catch (e) { return {}; }
  }
  // The costume picked for Adventures, remembered between visits.
  function loadCostume() {
    try { return SP.CHARACTERS.find((ch) => ch.id === localStorage.getItem('roversa-costume')) || null; } catch (e) { return null; }
  }
  function saveCostume(ch) {
    try { localStorage.setItem('roversa-costume', ch.id); } catch (e) { /* storage blocked */ }
  }

  function saveStars(name, stars) {
    const all = loadStars();
    if ((all[name] || 0) >= stars) return;
    all[name] = stars;
    try { localStorage.setItem('roversa-stars', JSON.stringify(all)); } catch (e) { /* storage blocked */ }
  }

  // ---------- Puzzle piece pictures ----------

  // Colors and icons follow the 3D-printed pieces in Roversa-Robotics/roversa-quest:
  // orange Turn Left, blue Turn Right, purple Forward, yellow Backward,
  // red "Roversa" word (repeat) and green Roversa logo (wild).
  const PIECE_COLORS = {
    F: ['#b665c7', '#6f347d'],
    B: ['#e3dc38', '#8f8a14'],
    L: ['#ff8529', '#a84f0c'],
    R: ['#466fc4', '#273f7a'],
    P: ['#d43a32', '#7e1d18'],
    W: ['#488f3f', '#264f20'],
  };
  const PIECE_NAMES = named('piece.');
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

  // A Repeat puzzle piece in the program shows the piece it copies (copies is that
  // piece's type, or 'W' for a Wild piece not set yet), with a small curved Roversa
  // stamp in the corner, the same way a set Wild piece shows its direction.
  function pieceSvg(t, chosen, copies) {
    const repeatOf = t === 'P' && copies ? copies : null;
    const shown = t === 'W' && chosen ? chosen : repeatOf || t;
    const [color, dark] = PIECE_COLORS[shown];
    const id = 'arc' + uid();
    // A wild piece that has been set takes the color and arrow of the piece it
    // stands for, with a small Roversa logo in the corner to show it is wild.
    // The socket eats into the right side, so the picture sits a little left of the
    // outline's middle to look centered on the solid part of the piece.
    const icon = '<g transform="translate(-5,0)">' + iconMarkup(shown, id) + '</g>';
    return '<svg viewBox="0 0 77 64" aria-hidden="true">' +
      (t === 'P' ? '<defs><path id="' + id + '" d="M33.5,42.6 A15,15 0 1 1 56.5,42.6"/></defs>' : '') +
      '<path d="' + PIECE_SHAPE + '" fill="' + color + '" stroke="' + dark + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M20,3.5 H70" stroke="rgba(255,255,255,0.35)" stroke-width="2.5" stroke-linecap="round"/>' +
      '<g style="color:rgba(0,0,0,0.3)" fill="currentColor" transform="translate(0,2)">' + icon + '</g>' +
      '<g style="color:' + ICON_COLOR + '" fill="currentColor" stroke="' + dark + '" stroke-width="1.4" paint-order="stroke">' + icon + '</g>' +
      (t === 'W' && chosen ? '<g fill="' + ICON_COLOR + '" stroke="' + dark + '" stroke-width="3" paint-order="stroke" transform="translate(41,41) scale(0.32)">' + iconMarkup('W') + '</g>' : '') +
      (repeatOf ? '<g fill="' + ICON_COLOR + '" stroke="' + dark + '" stroke-width="4" paint-order="stroke" transform="translate(35.5,37.5) scale(0.42)">' + iconMarkup('P', id) + '</g>' : '') +
      '</svg>';
  }

  // The same picture as an image the map can draw, cached per piece and wild choice.
  const pieceImages = {};
  function pieceImage(t, chosen, copies) {
    const key = t + (chosen || '') + (t === 'P' && copies ? '>' + copies : '');
    if (!pieceImages[key]) {
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(pieceSvg(t, chosen, copies).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="154" height="128" '));
      pieceImages[key] = img;
    }
    return pieceImages[key];
  }

  // The special puzzle pieces pictured in the Dice Quest rules.
  document.querySelectorAll('.piece-pic[data-piece]').forEach((el) => { el.innerHTML = pieceSvg(el.dataset.piece); });

  // What the Repeat puzzle piece at index i of a program copies: the piece just
  // before it (a set Wild piece counts as its direction, an unset one as 'W'),
  // or null when there is nothing before it.
  function repeatCopies(program, i) {
    for (let j = i - 1; j >= 0; j--) {
      const p = program[j];
      if (p.t === 'P') continue;
      return p.t === 'W' ? p.chosen || 'W' : p.t;
    }
    return null;
  }

  function pieceEl(t, chosen, copies) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'piece';
    el.dataset.t = t;
    el.innerHTML = pieceSvg(t, chosen, copies);
    el.setAttribute('aria-label', t === 'W' && chosen ? tr('wildAs', { name: PIECE_NAMES[chosen] }) :
      t === 'P' && copies ? tr('repeatAs', { name: PIECE_NAMES[copies] }) : PIECE_NAMES[t]);
    return el;
  }

  // ---------- Game state ----------

  const game = {
    mode: null, // 'level' or 'quest'
    aiLevel: null, // 'easy', 'medium' or 'hard' when playing the Dice Quest AI Opponent
    aiToken: 0, // changes whenever an AI Opponent turn should stop
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
    trail: [],
    particles: [],
    runIndex: -1,
    shownPiece: null, // the piece being run, drawn on the map by the robot
    doneUpTo: -1,
    stepping: null, // a program being run one piece at a time: { r, steps, i }
    quest: null,
    guide: null, // the hand guiding the player, see "Guided tutorial" below
    hideGoals: false, // the tutorial's first duck pops up after Roversa is tapped
    stopMark: null, // Adventures: where Roversa stopped on a run that missed { x, y, ang, left }
    homing: null, // changes when Roversa going back to the start should stop
  };

  function makeRobot(start, dir, team, teamWheels) {
    const flagColor = SP.TEAM_COLORS[team].flag;
    return {
      team, flagColor, css: SP.FLAG_COLORS[flagColor].css,
      flag: SP.flag(flagColor),
      charId: null, // set in Dice Quest to the costume the player picked
      ai: null, // the skill level when this robot is the Dice Quest AI Opponent
      // Players are named after their costume, like "Elephant", else "Red Roversa".
      get baseName() { return this.charId ? tr('char.' + this.charId) : tr('robot', { team: tr('team.' + this.team) }); },
      // The AI Opponent always says so in its name, like "Tiger (AI Opponent)".
      get name() { return this.ai ? tr('aiName', { name: this.baseName }) : this.baseName; },
      sprite: SP.robot(teamWheels ? flagColor : undefined),
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

  // `w` is the Adventure world the map belongs to; Dice Quest maps have none.
  function buildView(map, seedBase, w) {
    const bg = document.createElement('canvas');
    bg.width = map.cols * T;
    bg.height = map.rows * T;
    const g = bg.getContext('2d');
    const water = [];
    const props = [];
    const start = map.starts['1'];
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        const seed = seedBase * 1000 + y * 37 + x * 11 + 1;
        const ch = map.grid[y][x];
        let tile;
        if (w) {
          // parseMap turns S and A-C into '.', so put them back for the tile's neighbours.
          const charAt = (xx, yy) => {
            if (!E.inBounds(map.grid, xx, yy)) return undefined;
            if (start && start.x === xx && start.y === yy) return 'S';
            const goal = map.goals.find((gl) => gl.x === xx && gl.y === yy);
            return goal ? goal.id : map.grid[yy][xx];
          };
          tile = SP.worldTile(w, charAt(x, y), seed, (dx, dy) => charAt(x + dx, y + dy));
          if (SP.WORLDS[w].props[ch]) props.push({ x, y, img: SP.WORLDS[w].props[ch] });
        } else if (ch === 'T') tile = SP.tree(seed);
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
    if (!w) Object.values(map.starts).forEach((s) => g.drawImage(SP.startPad(seedBase + s.x), s.x * T, s.y * T));
    return { bg, water, props, cols: map.cols, rows: map.rows };
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

    // Faint grid: each square is one Forward or Backward step.
    g.fillStyle = 'rgba(0, 0, 0, 0.16)';
    for (let c = 1; c < v.cols; c++) g.fillRect(c * S - 1, 0, 2, board.height);
    for (let r = 1; r < v.rows; r++) g.fillRect(0, r * S - 1, board.width, 2);

    // Characters that stand in the way, like the Pirate.
    v.props.forEach((p) => g.drawImage(p.img, p.x * S, p.y * S, S, S));

    // Path the robot drove on this run.
    g.fillStyle = 'rgba(255,255,255,0.55)';
    game.trail.forEach((p) => g.fillRect((p.x + 0.5) * S - SCALE * 1.5, (p.y + 0.5) * S - SCALE * 1.5, SCALE * 3, SCALE * 3));

    // Destinations.
    if (!game.hideGoals) game.map.goals.forEach((goal, i) => {
      const bob = Math.round(Math.sin(now / 300 + i) * 1.5) * SCALE;
      const who = game.robots.filter((r) => r.visited.has(goal.id));
      g.globalAlpha = game.mode === 'level' && who.length ? 0.6 : 1;
      g.drawImage(goalArt(goal.id), goal.x * S, goal.y * S + bob, S, S);
      g.globalAlpha = 1;
      if (game.mode === 'level' && who.length) drawCheck(g, goal.x * S + S * 0.62, goal.y * S + S * 0.05, S * 0.36);
      // In Dice Quest each player who found this treasure plants a small flag on it.
      if (game.mode === 'quest') {
        who.forEach((r, k) => {
          const fw = r.flag.width * SCALE / 2, fh = r.flag.height * SCALE / 2;
          const fx = k === 0 ? goal.x * S - SCALE : (goal.x + 1) * S - fw + SCALE;
          g.drawImage(r.flag, fx, (goal.y + 1) * S - fh, fw, fh);
        });
      }
    });

    if (game.stopMark) drawStopMark(g, S, false);

    // Robots.
    game.robots.forEach((r, i) => {
      g.save();
      g.translate((r.rx + 0.5) * S + r.bump, (r.ry + 0.5) * S);
      g.rotate(r.ang);
      g.scale(r.scale, r.scale);
      g.globalAlpha = r.alpha;
      g.drawImage(r.sprite, -S / 2, -S / 2, S, S);
      g.restore();
      drawRobotFlag(g, r, S);
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

    if (game.stopMark) drawStopMark(g, S, true);
    if (game.guide && !game.running) drawGuide(g, S, now);
    if (game.shownPiece) drawShownPiece(g, now, S);
    placeHand();

    // Sparkles.
    game.particles = game.particles.filter((p) => p.life > 0);
    game.particles.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
      g.fillStyle = p.color;
      g.fillRect(p.x, p.y, SCALE * 2, SCALE * 2);
    });
  }

  // Where Roversa stopped on a run that missed: a dashed yellow square with a
  // "Stopped here" tag, and a faint Roversa there once the real one has gone back.
  function drawStopMark(g, S, tagOnly) {
    const m = game.stopMark;
    const r = game.robots[0];
    if (!tagOnly) {
      if (m.left && (m.x !== r.sx || m.y !== r.sy)) {
        g.save();
        g.translate((m.x + 0.5) * S, (m.y + 0.5) * S);
        g.rotate(m.ang);
        g.globalAlpha = 0.38;
        g.drawImage(r.sprite, -S / 2, -S / 2, S, S);
        g.restore();
      }
      g.save();
      g.strokeStyle = '#f2c230';
      g.lineWidth = SCALE * 1.5;
      g.setLineDash([SCALE * 3.5, SCALE * 2]);
      g.strokeRect(m.x * S + SCALE, m.y * S + SCALE, S - SCALE * 2, S - SCALE * 2);
      g.restore();
      return;
    }
    g.save();
    g.font = 'bold ' + Math.round(S * 0.24) + 'px ' + getComputedStyle(document.body).getPropertyValue('--body');
    g.textBaseline = 'middle';
    const text = tr('stoppedHere');
    const pad = S * 0.1, h = S * 0.34, w = g.measureText(text).width + pad * 2;
    const left = Math.max(SCALE, Math.min(board.width - w - SCALE, (m.x + 0.5) * S - w / 2));
    // Above the square, or below it on the top row.
    const top = m.y > 0 ? m.y * S - h - SCALE : (m.y + 1) * S + SCALE;
    g.fillStyle = '#0e1024';
    g.fillRect(left - SCALE, top - SCALE, w + SCALE * 2, h + SCALE * 2);
    g.fillStyle = '#f2c230';
    g.fillRect(left, top, w, h);
    g.fillStyle = '#0e1024';
    g.fillText(text, left + pad, top + h / 2 + 1);
    g.restore();
  }

  // Roversa's flag stands up from its back right corner, like on the real robot.
  // It is drawn upright whichever way the robot faces, so it always reads as a flag.
  function drawRobotFlag(g, r, S) {
    if (!r.flag || r.alpha < 0.05) return;
    const px = SCALE * 0.5 * r.scale;
    const dx = 0.3 * S, dy = 0.36 * S;
    const c = Math.cos(r.ang), s = Math.sin(r.ang);
    const bx = (r.rx + 0.5) * S + r.bump + (dx * c - dy * s) * r.scale;
    // Keep the whole flag on the map when the robot is on the top row.
    const by = Math.max((r.ry + 0.5) * S + (dx * s + dy * c) * r.scale, r.flag.height * px);
    g.save();
    g.globalAlpha = r.alpha;
    g.drawImage(r.flag, bx - 12.5 * px, by - r.flag.height * px, r.flag.width * px, r.flag.height * px);
    g.restore();
  }

  // The running puzzle piece pops up just above the robot (below it on the top row)
  // and gently pulses while it runs, so players can match the move to the piece.
  function drawShownPiece(g, now, S) {
    const sp = game.shownPiece;
    const r = game.robots[game.active];
    const img = pieceImage(sp.t, sp.chosen, sp.copies);
    if (!r || !img.complete || r.alpha < 0.5) return;
    const age = now - sp.at;
    const pop = Math.min(1, age / 160);
    const pulse = game.running ? 1 + 0.06 * Math.sin(age / 90) : 1;
    const k = (0.6 + 0.4 * pop) * pulse;
    const w = S * 0.8 * k, h = w * 64 / 77;
    const cx = (r.rx + 0.5) * S;
    const above = r.ry >= 0.75;
    const cy = above ? r.ry * S - h / 2 + S * 0.05 : (r.ry + 1) * S + h / 2 - S * 0.05;
    g.save();
    g.globalAlpha = 0.25 + 0.75 * pop;
    g.fillStyle = 'rgba(14, 16, 36, 0.55)';
    g.fillRect(cx - w / 2 + SCALE, cy - h / 2 + SCALE * 2, w - SCALE * 2, h);
    g.imageSmoothingEnabled = true;
    g.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    g.restore();
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

  // `alive` (optional) is checked every frame; once it says no, the tween stops where it is.
  function tween(obj, to, ms, alive) {
    return new Promise((resolve) => {
      const from = {};
      Object.keys(to).forEach((k) => { from[k] = obj[k]; });
      const t0 = performance.now();
      function tick(now) {
        if (alive && !alive()) { resolve(); return; }
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
    if (id === 'levels') { renderCostumeBar(); renderLevelGrid(); }
    document.dispatchEvent(new CustomEvent('roversa:screen', { detail: id }));
  }

  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
    SND.tap();
    // A new player's first tap on Adventures opens the Meet Roversa tutorial.
    if (b.dataset.go === 'levels' && firstVisit()) startLevel(0);
    else show(b.dataset.go);
  }));
  document.querySelectorAll('[data-players]').forEach((b) => b.addEventListener('click', () => { SND.tap(); chooseCharacters(Number(b.dataset.players)); }));
  $('#btn-ai').addEventListener('click', () => { SND.tap(); chooseAiLevel(); });

  $('#btn-back').addEventListener('click', () => {
    if (game.running) return;
    SND.tap();
    closeModal();
    game.guide = null;
    hand.hidden = true;
    show(game.mode === 'level' ? 'levels' : 'quest-setup');
  });

  // Sound and read-aloud buttons sit on every screen and share one setting each.
  const soundBtns = document.querySelectorAll('.btn-sound');
  function syncSoundBtn() { soundBtns.forEach((b) => b.classList.toggle('off', AUDIO.isMuted())); }
  soundBtns.forEach((b) => b.addEventListener('click', () => { AUDIO.setMuted(!AUDIO.isMuted()); syncSoundBtn(); SND.tap(); }));
  syncSoundBtn();

  // Read aloud: speaks messages and piece names for children who are still learning to read.
  let voiceOn = false;
  try { voiceOn = localStorage.getItem('roversa-voice') === '1'; } catch (e) { /* storage blocked */ }
  const voiceBtns = document.querySelectorAll('.btn-voice');
  function syncVoiceBtn() {
    voiceBtns.forEach((b) => {
      b.classList.toggle('off', !voiceOn);
      b.setAttribute('aria-pressed', String(voiceOn));
    });
  }
  function say(text) {
    if (!voiceOn || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.lang = I18N.speechLang;
      speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable */ }
  }
  voiceBtns.forEach((b) => {
    b.hidden = !('speechSynthesis' in window);
    b.addEventListener('click', () => {
      voiceOn = !voiceOn;
      try { localStorage.setItem('roversa-voice', voiceOn ? '1' : '0'); } catch (e) { /* storage blocked */ }
      syncVoiceBtn();
      SND.tap();
      if (voiceOn) say(tr('msg.readAloudOn'));
      else if ('speechSynthesis' in window) speechSynthesis.cancel();
    });
  });
  syncVoiceBtn();

  // Small action buttons show an icon with a short word under it.
  function labelButton(sel, label, aria) {
    const b = $(sel);
    b.querySelector('.btn-label').textContent = label;
    b.setAttribute('aria-label', aria);
  }

  const levelHint = () => I18N.levelText(game.levelIndex, game.level).hint;
  // Level numbers start at 1 after the Meet Roversa tutorial, which has a star instead.
  const FIRST_NUM = LEVELS[0] && LEVELS[0].stages ? 0 : 1;

  // Titles and button words on the game screen that depend on the mode and language.
  function syncGameText() {
    if (game.mode === 'level') {
      $('#game-title').textContent = (game.level.stages ? '\u2605' : (game.levelIndex + FIRST_NUM) + '.') + ' ' + I18N.levelText(game.levelIndex, game.level).name;
      $('#pool-label').textContent = tr('puzzlePieces');
      labelButton('#btn-reset', tr('startOver'), tr('startOver'));
      labelButton('#btn-clear', tr('clear'), tr('clearProgram'));
    } else if (game.mode === 'quest') {
      $('#game-title').textContent = tr('menu.quest');
      $('#pool-label').textContent = tr('yourRoll');
      labelButton('#btn-reset', tr('newGame'), tr('newGame'));
      labelButton('#btn-clear', tr('resetShort'), tr('resetPieces'));
    }
  }

  function setMessage(text, kind) {
    const m = $('#message');
    m.textContent = text;
    m.className = 'message' + (kind ? ' ' + kind : '');
    say(text);
  }

  // Screen reader updates for things that only show on the map.
  function announce(text) {
    const sr = $('#sr-status');
    sr.textContent = '';
    setTimeout(() => { sr.textContent = text; }, 30);
  }

  const DIR_WORDS = named('dir.');
  const where = (x, y) => tr('where', { x: x + 1, y: y + 1 });

  // Text version of the map for screen readers.
  function describeBoard() {
    if (!game.map) return;
    const parts = [tr('sr.map', { cols: game.map.cols, rows: game.map.rows })];
    game.robots.forEach((r) => {
      parts.push(tr('sr.robot', { who: game.robots.length > 1 ? r.name : 'Roversa', where: where(r.x, r.y), dir: DIR_WORDS[r.dir] }));
    });
    game.map.goals.forEach((g) => {
      const done = game.robots.filter((r) => r.visited.has(g.id)).map((r) => r.name);
      const name = goalName(g.id);
      parts.push(tr('sr.goal', { goal: name.charAt(0).toUpperCase() + name.slice(1), where: where(g.x, g.y) }) +
        (done.length ? (game.robots.length > 1 ? tr('sr.visitedBy', { who: done.join(tr('and')) }) : tr('sr.visited')) : '') + '.');
    });
    // Obstacles inside the map (the tree border around most levels is left out).
    const blocked = [];
    game.map.grid.forEach((row, y) => row.forEach((ch, x) => {
      const edge = x === 0 || y === 0 || x === game.map.cols - 1 || y === game.map.rows - 1;
      if (E.isBlocked(game.map.grid, x, y) && !(edge && ch === 'T')) blocked.push(tr('sr.goal', { goal: tr('tileShort.' + ch), where: where(x, y) }));
    }));
    if (blocked.length) parts.push(tr('sr.blocked', { list: blocked.join('; ') }));
    board.setAttribute('aria-label', parts.join(' '));
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

  // The costume row above the levels: who is driving, and a button to change it.
  function renderCostumeBar() {
    const bar = $('#costume-bar');
    const ch = loadCostume();
    bar.innerHTML = '';
    const look = document.createElement('canvas');
    look.width = 32; look.height = 32;
    look.className = 'look';
    look.getContext('2d').drawImage(ch ? ch.sprite : SP.robot(), 0, 0);
    bar.appendChild(look);
    const label = document.createElement('span');
    label.className = 'who';
    if (ch) {
      const f = SP.flag(ch.flag);
      f.className = 'flag';
      label.append(f, tr('char.' + ch.id));
    } else label.textContent = 'Roversa';
    bar.appendChild(label);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn blue';
    btn.textContent = tr(ch ? 'costume.change' : 'costume.pick');
    btn.addEventListener('click', async () => {
      SND.tap();
      const pick = await pickCostume(tr('costume.title'), '', [], ch);
      if (pick) { saveCostume(pick); renderCostumeBar(); renderLevelGrid(); }
      $('#costume-bar .btn').focus();
    });
    bar.appendChild(btn);
  }

  function renderLevelGrid() {
    const grid = $('#level-grid');
    grid.innerHTML = '';
    const stars = loadStars();
    const costume = loadCostume();
    const thumbRobot = SP.robot(costume ? costume.flag : undefined);
    LEVELS.forEach((level, i) => {
      // A heading with the world's name before its first level.
      if (level.world && (i === 0 || LEVELS[i - 1].world !== level.world)) {
        const head = document.createElement('h3');
        head.className = 'level-world';
        head.textContent = tr('world.' + level.world);
        grid.appendChild(head);
      }
      const card = document.createElement('button');
      card.className = 'level-card';
      // The tutorial's card shows its last map.
      const src = level.stages ? level.stages[level.stages.length - 1] : level;
      const map = E.parseMap(src.map);
      const v = buildView(map, i + 1, level.world);
      const c = document.createElement('canvas');
      c.width = v.bg.width;
      c.height = v.bg.height;
      const g = c.getContext('2d');
      g.drawImage(v.bg, 0, 0);
      v.props.forEach((p) => g.drawImage(p.img, p.x * T, p.y * T, T, T));
      map.goals.forEach((goal) => g.drawImage(goalArt(goal.id, level.world), goal.x * T, goal.y * T, T, T));
      const st = map.starts['1'];
      g.save();
      g.translate(st.x * T + T / 2, st.y * T + T / 2);
      g.rotate((E.DIR_NAMES[src.startDir || 'N'] * Math.PI) / 2);
      g.drawImage(thumbRobot, -T / 2, -T / 2, T, T);
      g.restore();
      const n = stars[level.name] || 0;
      card.innerHTML = '<div class="num">' + (level.stages ? tr('tut.label') : tr('levelNum', { n: i + FIRST_NUM })) + '</div><div class="name"></div>' +
        '<div class="stars" aria-label="' + tr('sr.stars', { n }) + '">' +
        [0, 1, 2].map((k) => '<span class="' + (k < n ? 'on' : '') + '">&#9733;</span>').join('') + '</div>';
      card.querySelector('.name').textContent = I18N.levelText(i, level).name;
      card.prepend(c);
      card.addEventListener('click', () => { SND.tap(); startLevel(i); });
      grid.appendChild(card);
    });
  }

  // ---------- Starting a level or a quest ----------

  function enterGame() {
    game.guide = null;
    game.hideGoals = false;
    show('game');
    $('#screen-game').classList.toggle('quest-mode', game.mode === 'quest');
    sizeBoard();
    clearStopMark();
    game.trail = [];
    game.particles = [];
    game.runIndex = -1;
    game.doneUpTo = -1;
    game.shownPiece = null;
    game.program = [];
    renderAll();
  }

  function startLevel(i) {
    const level = LEVELS[i];
    game.mode = 'level';
    game.levelIndex = i;
    game.level = level;
    game.quest = null;
    $('#btn-roll').hidden = true;
    syncGameText();
    if (level.stages) {
      markSeen(TUTORIAL_KEY);
      loadStage(0);
      return;
    }
    setUpMap(level, i + 1);
    setMessage(levelHint());
    if (level.newPiece && !seen(NEW_PIECE_KEY + level.newPiece)) showNewPiece();
  }

  // Puts a level's map (or one stage of the tutorial) on the board, with Roversa on its start.
  function setUpMap(src, seed) {
    game.map = E.parseMap(src.map);
    game.view = buildView(game.map, seed, game.level.world);
    game.robots = [makeRobot(game.map.starts['1'], E.DIR_NAMES[src.startDir || 'N'], 0)];
    const costume = loadCostume();
    if (costume) wearCostume(game.robots[0], costume);
    game.active = 0;
    game.limits = Object.assign({}, src.pieces);
    game.slots = src.slots;
    $('#scoreboard').hidden = !costume;
    enterGame();
  }

  // Builds a random 8x8 quest map with the three treasures.
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

  // The costume picker: a pop-up with every costume. Costumes in taken can't be
  // picked. Resolves to the picked costume, or undefined if the pop-up was closed.
  function pickCostume(title, sub, taken, current) {
    return new Promise((resolve) => {
      openModal('<h3>' + title + '</h3>' + (sub ? '<p>' + sub + '</p>' : '') + '<div class="choices characters"></div>', resolve);
      const box = modal.querySelector('.characters');
      SP.CHARACTERS.forEach((ch) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'character';
        b.style.setProperty('--team', SP.FLAG_COLORS[ch.flag].css);
        b.setAttribute('aria-label', tr('char.' + ch.id));
        b.disabled = taken.includes(ch);
        if (ch === current) b.setAttribute('aria-pressed', 'true');
        const c = document.createElement('canvas');
        c.width = 32; c.height = 32;
        c.getContext('2d').drawImage(ch.sprite, 0, 0);
        b.appendChild(c);
        b.insertAdjacentHTML('beforeend', '<span></span>');
        const f = SP.flag(ch.flag);
        f.className = 'flag';
        b.querySelector('span').append(f, tr('char.' + ch.id));
        b.addEventListener('click', () => { SND.tap(); closeModal(ch); });
        box.appendChild(b);
      });
      const first = box.querySelector('[aria-pressed="true"]') || box.querySelector('button:not(:disabled)');
      if (first) first.focus();
    });
  }

  // Playing the AI Opponent starts with choosing how strong it is.
  function chooseAiLevel() {
    openModal('<h3>' + tr('ai.title') + '</h3><p>' + tr('ai.pick') + '</p><div class="choices ai-levels"></div>', (level) => {
      if (level) chooseCharacters(1, level);
    });
    const box = modal.querySelector('.ai-levels');
    AI.LEVELS.forEach((level) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ai-level ' + { easy: 'green', medium: 'blue', hard: 'red' }[level];
      b.innerHTML = '<span class="ai-level-name"></span><span class="ai-level-desc"></span>';
      b.querySelector('.ai-level-name').textContent = tr('ai.level.' + level);
      b.querySelector('.ai-level-desc').textContent = tr('ai.desc.' + level);
      b.addEventListener('click', () => { SND.tap(); closeModal(level); });
      box.appendChild(b);
    });
    box.querySelector('button').focus();
  }

  // Each player picks a robot costume before a new Dice Quest. Against the AI
  // Opponent only the player picks; the AI Opponent takes another costume.
  async function chooseCharacters(players, aiLevel) {
    game.aiLevel = aiLevel || null;
    const picks = [];
    for (let i = 0; i < players; i++) {
      const pick = await pickCostume(players > 1 ? tr('modal.player', { n: i + 1 }) : tr('modal.pickRobot'),
        players > 1 ? tr('modal.pickRobotBang') : '', picks);
      const left = SP.CHARACTERS.filter((ch) => !picks.includes(ch));
      picks.push(pick || left[Math.floor(Math.random() * left.length)]);
      // Player 1's costume carries over to Adventures if none was picked there yet.
      if (i === 0 && pick && !loadCostume()) saveCostume(pick);
    }
    if (aiLevel) {
      const left = SP.CHARACTERS.filter((ch) => !picks.includes(ch));
      picks.push(left[Math.floor(Math.random() * left.length)]);
    }
    game.characters = picks;
    startQuest(picks.length);
  }

  // Dresses a robot in a costume: its flag, wheel color and name.
  function wearCostume(r, ch) {
    Object.assign(r, {
      character: ch.sprite, charId: ch.id,
      flagColor: ch.flag, css: SP.FLAG_COLORS[ch.flag].css,
      flag: SP.flag(ch.flag), sprite: SP.robot(ch.flag),
    });
  }

  function startQuest(players) {
    game.mode = 'quest';
    game.level = null;
    game.map = questMap(players);
    game.view = buildView(game.map, Math.floor(Math.random() * 1000));
    game.robots = [makeRobot(game.map.starts['1'], 0, 0, true)];
    if (players > 1) game.robots.push(makeRobot(game.map.starts['2'], 2, 1, true));
    (game.characters || []).forEach((ch, i) => { if (game.robots[i]) wearCostume(game.robots[i], ch); });
    if (game.aiLevel && game.robots[1]) game.robots[1].ai = game.aiLevel;
    game.aiToken++;
    game.active = 0;
    game.tray = [];
    game.slots = 5;
    game.quest = { phase: 'roll', round: 1, winner: null };
    $('#scoreboard').hidden = false;
    $('#btn-roll').hidden = false;
    syncGameText();
    enterGame();
    promptRoll();
  }

  function promptRoll() {
    const r = game.robots[game.active];
    const who = game.robots.length > 1 ? tr('msg.whoPrefix', { robot: r.name }) : '';
    setMessage(tr('msg.pressRoll', { who }));
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

  // Re-rendering replaces the piece buttons, so keyboard focus is put back afterwards.
  let pendingFocus = null;
  function restoreFocus(area) {
    if (!pendingFocus || pendingFocus.area !== area) return;
    const f = pendingFocus;
    pendingFocus = null;
    const els = [...(area === 'program' ? programEl : poolEl).querySelectorAll('.piece')];
    let el = area === 'program' ? els[Math.min(f.index, els.length - 1)] : els.find((e) => e.dataset.t === f.t) || els[0];
    if (!el && area === 'program') el = poolEl.querySelector('.piece');
    if (!el) el = $('#btn-go');
    el.focus();
  }

  function usedCount(t) { return game.program.filter((p) => p.t === t).length; }

  function renderProgram(caretAt, hideIndex) {
    programEl.innerHTML = '';
    let shown = 0;
    game.program.forEach((p, i) => {
      if (caretAt != null && shown === caretAt && i !== hideIndex) addCaret();
      const el = pieceEl(p.t, p.chosen, p.t === 'P' ? repeatCopies(game.program, i) : null);
      el.dataset.index = i;
      if (i === hideIndex) el.classList.add('ghost-src');
      else shown++;
      if (i === game.runIndex) el.classList.add('running');
      else if (i <= game.doneUpTo) el.classList.add('done');
      el.setAttribute('aria-label', tr('sr.programPiece', { name: el.getAttribute('aria-label'), n: i + 1, total: game.program.length }));
      el.addEventListener('pointerdown', (e) => startDrag(e, 'program', i, el));
      onActivate(el, () => { pendingFocus = { area: 'program', index: i }; tapProgram(i); });
      el.addEventListener('keydown', (e) => {
        if (!editable()) return;
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          pendingFocus = { area: 'program', index: i };
          removePiece(i);
        } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && i > 0) {
          e.preventDefault();
          pendingFocus = { area: 'program', index: i - 1 };
          movePiece(i, i - 1);
        } else if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && i < game.program.length - 1) {
          e.preventDefault();
          pendingFocus = { area: 'program', index: i + 1 };
          movePiece(i, i + 1);
        }
      });
      programEl.appendChild(el);
    });
    if (caretAt != null && shown === caretAt) addCaret();
    for (let i = game.program.length; i < game.slots; i++) {
      const s = document.createElement('div');
      s.className = 'slot';
      programEl.appendChild(s);
    }
    programEl.setAttribute('aria-label', tr('sr.program', { n: game.program.length, total: game.slots }));
    restoreFocus('program');
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
        el.setAttribute('aria-label', tr('sr.poolPiece', { name: PIECE_NAMES[t], n: left }));
        if (left <= 0) el.classList.add('empty');
        el.addEventListener('pointerdown', (e) => startDrag(e, 'pool', t, el));
        onActivate(el, () => { pendingFocus = { area: 'pool', t }; addPiece(t); });
        poolEl.appendChild(el);
      });
    } else {
      game.tray.forEach((p) => {
        const el = pieceEl(p.t);
        el.addEventListener('pointerdown', (e) => startDrag(e, 'pool', p.id, el));
        onActivate(el, () => { pendingFocus = { area: 'pool', t: p.t }; addPiece(p.id); });
        poolEl.appendChild(el);
      });
      if (!game.tray.length && game.quest.phase === 'arrange') {
        poolEl.innerHTML = '<span class="tip"></span>';
        poolEl.firstChild.textContent = tr('msg.allPlaced');
      }
    }
    restoreFocus('pool');
  }

  function renderScoreboard() {
    const sb = $('#scoreboard');
    if (game.mode !== 'quest' && !(game.robots[0] && game.robots[0].charId)) return;
    sb.innerHTML = '';
    game.robots.forEach((r, i) => {
      const box = document.createElement('div');
      box.className = 'score' + (i === game.active && game.robots.length > 1 ? ' turn' : '');
      const icon = document.createElement('canvas');
      const look = r.character || r.sprite;
      icon.width = look.width; icon.height = look.height;
      icon.getContext('2d').drawImage(look, 0, 0);
      box.appendChild(icon);
      const flagIcon = document.createElement('canvas');
      flagIcon.className = 'flag';
      flagIcon.width = r.flag.width; flagIcon.height = r.flag.height;
      flagIcon.getContext('2d').drawImage(r.flag, 0, 0);
      box.appendChild(flagIcon);
      const label = document.createElement('span');
      label.textContent = r.ai ? r.baseName : r.name;
      if (game.robots.length > 1 && i === game.active) box.setAttribute('aria-label', tr('sr.turn', { team: r.name }));
      box.appendChild(label);
      // In Adventures the costume is shown on its own; the treasures are on the map.
      if (game.mode !== 'quest') { sb.appendChild(box); return; }
      const goals = document.createElement('div');
      goals.className = 'goal-icons';
      ['A', 'B', 'C'].forEach((id) => {
        const gc = document.createElement('canvas');
        gc.width = 32; gc.height = 32;
        gc.getContext('2d').drawImage(SP.goals[id], 0, 0);
        if (r.visited.has(id)) gc.classList.add('got');
        gc.setAttribute('aria-label', tr(r.visited.has(id) ? 'sr.goalVisited' : 'sr.goalNotYet', { goal: GOAL_NAMES[id] }));
        goals.appendChild(gc);
      });
      box.appendChild(goals);
      // The AI Opponent gets a banner across the bottom of its box.
      if (r.ai) {
        const badge = document.createElement('span');
        badge.className = 'ai-badge';
        badge.textContent = tr('ai.badge', { level: tr('ai.level.' + r.ai) });
        box.appendChild(badge);
      }
      sb.appendChild(box);
    });
  }

  // True while it is the AI Opponent's turn, when the player's controls are locked.
  function isAiTurn() {
    return game.mode === 'quest' && !!game.robots[game.active] && !!game.robots[game.active].ai;
  }

  function renderButtons() {
    const busy = game.running || game.rolling || isAiTurn();
    const quest = game.quest;
    const goReady = game.program.length > 0 && (!quest || (quest.phase === 'arrange' && game.tray.length === 0));
    $('#btn-go').disabled = busy || !goReady;
    $('#btn-step').disabled = busy || !goReady;
    $('#btn-reset').disabled = game.running || game.rolling;
    $('#btn-clear').disabled = busy || !game.program.length || (quest && (quest.phase !== 'arrange' || !!game.stepping));
    // While the die rolls, the rolled pieces take the button's place.
    $('#btn-roll').hidden = !quest || quest.phase !== 'roll' || game.rolling || isAiTurn();
    $('#btn-roll').disabled = busy;
  }

  function renderAll() {
    describeBoard();
    renderPool();
    renderProgram();
    renderScoreboard();
    renderButtons();
    syncGuide();
  }

  function editable() {
    if (game.running || game.rolling || isAiTurn()) return false;
    // Once a Dice Quest program starts stepping, the robot has moved, so the turn is locked in.
    return game.mode === 'level' || (game.quest.phase === 'arrange' && !game.stepping);
  }

  // After a run, editing the program clears the old run's marks.
  function clearRunMarks() {
    game.runIndex = -1;
    game.doneUpTo = -1;
    game.stepping = null;
    game.shownPiece = null;
    if (game.guide) game.guide.bad = null;
  }

  async function addPiece(key, at) {
    if (!editable() || guideBlocks('add', key)) return;
    if (game.program.length >= game.slots) {
      setMessage(tr('msg.full'), 'bad');
      SND.bump();
      return;
    }
    let piece;
    if (game.mode === 'level') {
      if (game.limits[key] - usedCount(key) <= 0) { SND.bump(); return; }
      piece = { id: uid(), t: key };
      if (key === 'W') {
        piece.chosen = await pickWild();
        if (!piece.chosen || game.limits[key] - usedCount(key) <= 0 || game.program.length >= game.slots) return;
      }
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
    say(PIECE_NAMES[piece.chosen || piece.t]);
    guideAfterAdd();
    renderAll();
  }

  function removePiece(i) {
    if (!editable() || guideBlocks('remove')) return;
    const [p] = game.program.splice(i, 1);
    if (game.mode === 'quest') game.tray.push({ id: p.id, t: p.t });
    clearRunMarks();
    SND.remove();
    renderAll();
  }

  function tapProgram(i) { removePiece(i); }

  function movePiece(from, to) {
    if (guideBlocks('move')) { renderAll(); return; }
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
    if (src === 'pool' ? guideBlocks('add', key) : guideBlocks('remove')) return;
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

  let modalReturnFocus = null;

  function openModal(html, onClose) {
    modalOpenedAt = performance.now();
    if (modal.hidden) modalReturnFocus = document.activeElement;
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
    if (modal.hidden) {
      const back = modalReturnFocus && modalReturnFocus !== document.body && document.contains(modalReturnFocus) ? modalReturnFocus : null;
      if (back) back.focus();
      else if ($('#screen-game').classList.contains('active')) $('#btn-go').focus();
    }
    modalReturnFocus = null;
  }

  // The tap that opened a pop-up can also land on it; ignore clicks right after it opens.
  modal.addEventListener('click', (e) => {
    if (performance.now() - modalOpenedAt < 400) { e.stopPropagation(); return; }
    if (e.target === modal) closeModal(null);
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(null); });

  function pickWild() {
    return new Promise((resolve) => {
      openModal('<h3>' + tr('modal.wild') + '</h3><p>' + tr('modal.wildWhich') + '</p><div class="choices"></div>', resolve);
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
    const colors = ['#8e43c6', '#124eaf', '#f56a00', '#fbbd27', '#ff3638', '#37c563'];
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

  // ---------- Guided tutorial and new puzzle pieces ----------

  // game.guide is null, or, in the Meet Roversa tutorial (see js/levels.js),
  //   { stage, step, need, bad, wait }
  //       need: how many of the step's piece the algorithm must hold to move on,
  //       bad: the piece that bumped, wait: between steps, nothing works
  // While the hand guides, only the thing it points at works, and the rest dims.

  const TUTORIAL_KEY = 'roversa-tutorial-seen';
  const NEW_PIECE_KEY = 'roversa-new-seen-';
  function seen(key) {
    try { return localStorage.getItem(key) === '1'; } catch (e) { return false; }
  }
  function markSeen(key) {
    try { localStorage.setItem(key, '1'); } catch (e) { /* storage blocked */ }
  }
  // A player who has never opened the tutorial or finished a level.
  function firstVisit() {
    return !!(LEVELS[0] && LEVELS[0].stages) && !seen(TUTORIAL_KEY) && !Object.keys(loadStars()).length;
  }

  // A pixel-art pointing hand.
  const hand = document.createElement('div');
  hand.className = 'guide-hand';
  hand.hidden = true;
  hand.setAttribute('aria-hidden', 'true');
  hand.innerHTML = '<svg viewBox="0 0 12 14" shape-rendering="crispEdges">' +
    '<path fill="#14172e" d="M3 0h2v1h1v4h2v1h2v1h1v1h1v5h-1v1h-1v1H4v-1H3v-1H2v-1H1V9H0V7h1V6h2V1z"/>' +
    '<path fill="#fff" d="M4 1h1v5h1v-1h2v1h-1v1h1v-1h2v1h-1v1h1v-1h1v4h-1v1h-1v1H5v-1H4v-1H3v-1H2V9H1V8h1v1h1v1h1z"/></svg>';
  document.body.appendChild(hand);
  let handAt = null; // { el } or { robot }

  function guideStep() {
    const gd = game.guide;
    if (!gd || !game.level || !game.level.stages) return null;
    return game.level.stages[gd.stage].guide[gd.step] || null;
  }

  function loadStage(k) {
    setUpMap(game.level.stages[k], game.levelIndex + 1 + k);
    game.guide = { stage: k, step: -1 };
    nextGuideStep();
  }

  function nextGuideStep() {
    const gd = game.guide;
    gd.step++;
    gd.bad = null;
    gd.wait = false;
    const spec = guideStep();
    gd.need = spec.do === 'add' ? usedCount(spec.t) + (spec.n || 1) : 0;
    game.hideGoals = spec.do === 'robot';
    setMessage(tr(spec.say), 'guide');
    renderAll();
  }

  // A level's new puzzle piece gets a pop-up the first time the level opens.
  // The ? button next to the hint shows it again.
  function showNewPiece() {
    const t = game.level.newPiece;
    markSeen(NEW_PIECE_KEY + t);
    openModal(
      '<h3>' + tr('new.title') + '</h3>' +
      '<div class="new-piece" role="img" aria-label="' + PIECE_NAMES[t] + '">' + pieceSvg(t) + '</div>' +
      '<p>' + tr('new.' + t) + '</p>' +
      '<div class="choices"><button class="btn big green" data-act="ok">' + tr('new.ok') + '</button></div>'
    );
    say(tr('new.title') + ' ' + tr('new.' + t));
    modal.querySelector('[data-act="ok"]').addEventListener('click', () => { SND.tap(); closeModal(); });
  }

  // True when the hand is guiding and this action isn't the one it points at.
  function guideBlocks(action, key) {
    const gd = game.guide;
    if (!gd) return false;
    const spec = guideStep();
    if (gd.wait || !spec) return true;
    if (spec.do === 'free') return false;
    if (spec.do === 'add') return !(action === 'add' && key === spec.t);
    if (spec.do === 'go') return action !== 'go';
    return true;
  }

  function guideAfterAdd() {
    const gd = game.guide;
    if (!gd) return;
    const spec = guideStep();
    if (spec && spec.do === 'add' && usedCount(spec.t) >= gd.need) nextGuideStep();
  }

  // "Tap Roversa": it nudges forward, so the front is easy to see, and the duck pops up.
  function tapRobot() {
    const gd = game.guide;
    const spec = guideStep();
    if (!spec || spec.do !== 'robot' || gd.wait || game.running) return;
    gd.wait = true;
    renderAll();
    const r = game.robots[0];
    SND.move();
    tween(r, { rx: r.x + E.DX[r.dir] * 0.3, ry: r.y + E.DY[r.dir] * 0.3 }, 200)
      .then(() => tween(r, { rx: r.x, ry: r.y }, 200))
      .then(() => {
        if (game.guide !== gd) return;
        game.hideGoals = false;
        game.map.goals.forEach((goal) => sparkle(goal.x, goal.y));
        SND.goal();
        setTimeout(() => { if (game.guide === gd) nextGuideStep(); }, 700);
      });
  }
  board.addEventListener('click', tapRobot);
  board.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    tapRobot();
  });

  function finishTutorialRun(r, outcome) {
    const gd = game.guide;
    if (game.map.goals.every((g) => r.visited.has(g.id))) {
      gd.wait = true;
      setMessage(tr('tut.yay'), 'good');
      renderAll();
      const last = gd.stage + 1 >= game.level.stages.length;
      const still = () => game.guide === gd && $('#screen-game').classList.contains('active');
      if (!last) {
        setTimeout(() => { if (still()) loadStage(gd.stage + 1); }, 1600);
        return;
      }
      saveStars(game.level.name, 3);
      setTimeout(() => {
        if (!still()) return;
        SND.win();
        confetti();
        openModal(
          '<h3>' + tr('tut.doneTitle') + '</h3>' +
          '<div class="big-stars">' + [0, 1, 2].map(() => '<span class="on">&#9733;</span>').join('') + '</div>' +
          '<p>' + tr('tut.doneText') + '</p>' +
          '<div class="choices">' +
          '<button class="btn gray" data-act="again">' + tr('modal.tryAgain') + '</button>' +
          '<button class="btn big green" data-act="next">' + tr('modal.next') + ' &#9654;</button>' +
          '</div>'
        );
        say(tr('tut.doneTitle') + ' ' + tr('tut.doneText'));
        modal.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
          SND.tap();
          closeModal();
          startLevel(game.levelIndex + (b.dataset.act === 'next' ? 1 : 0));
        }));
        modal.querySelector('.btn.green').focus();
      }, 600);
      return;
    }
    if (outcome.result === 'bump') {
      gd.bad = outcome.index;
      setMessage(tr('tut.oops', { what: outcome.what }), 'bad');
    } else {
      setMessage(tr('tut.notYet'), 'bad');
    }
    renderAll();
    driveBack(r);
  }

  // Dims and locks everything but what the hand points at.
  function syncGuide() {
    document.querySelectorAll('.guide-dim, .guide-lock, .guide-focus, .guide-bad, .guide-num').forEach((el) => {
      el.classList.remove('guide-dim', 'guide-lock', 'guide-focus', 'guide-bad', 'guide-num');
    });
    const gd = game.guide;
    const level = game.mode === 'level' ? game.level : null;
    $('#btn-new-piece').hidden = !(level && level.newPiece && !gd);
    handAt = null;
    hand.hidden = true;
    if (!gd || !level) return;
    const spec = guideStep();
    const dim = (els) => els.forEach((el) => el && el.classList.add('guide-dim'));
    const poolPanel = poolEl.closest('.panel');
    const others = ['#btn-step', '#btn-reset', '#btn-clear'].map($);
    if (gd.wait || !spec) {
      programEl.classList.add('guide-lock');
      poolEl.classList.add('guide-lock');
      return;
    }
    if (spec.do === 'robot') {
      dim([programEl.closest('.panel'), poolPanel, $('#btn-go')].concat(others));
      handAt = { robot: game.robots[0] };
    } else if (spec.do === 'add') {
      const target = poolEl.querySelector('.piece[data-t="' + spec.t + '"]');
      dim([...poolEl.querySelectorAll('.piece')].filter((el) => el !== target).concat($('#btn-go'), others));
      programEl.classList.add('guide-lock');
      if (spec.show === 'count') {
        programEl.querySelectorAll('.slot').forEach((el, j) => {
          el.classList.add('guide-num');
          el.dataset.n = game.program.length + j + 1;
        });
      }
      if (target) {
        target.classList.add('guide-focus');
        handAt = { el: target };
      }
    } else if (spec.do === 'go') {
      dim([poolPanel].concat(others));
      programEl.classList.add('guide-lock');
      $('#btn-go').classList.add('guide-focus');
      handAt = { el: $('#btn-go') };
    } else if (spec.do === 'free' && gd.bad != null) {
      const el = programEl.querySelector('.piece[data-index="' + gd.bad + '"]');
      if (el) {
        el.classList.add('guide-bad');
        handAt = { el };
      }
    }
    hand.hidden = !handAt;
    placeHand();
  }

  // Keeps the hand's fingertip on its target, even as the page scrolls or resizes.
  function placeHand() {
    if (!handAt || hand.hidden) return;
    let rect, ax = 0.55, ay = 0.55;
    if (handAt.el) {
      if (!handAt.el.isConnected) return;
      rect = handAt.el.getBoundingClientRect();
    } else {
      const b = board.getBoundingClientRect();
      const s = b.width / game.view.cols;
      rect = { left: b.left + handAt.robot.rx * s, top: b.top + handAt.robot.ry * s, width: s, height: s };
      ay = 0.85;
    }
    hand.style.left = Math.round(rect.left + window.scrollX + rect.width * ax - hand.offsetWidth * 0.33) + 'px';
    hand.style.top = Math.round(rect.top + window.scrollY + rect.height * ay) + 'px';
  }

  // Where Roversa ends up after these commands, from its start square.
  function endOf(cmds) {
    const r = game.robots[0];
    let pos = { x: r.sx, y: r.sy, dir: r.sdir };
    cmds.forEach((c) => {
      const res = E.step(game.map.grid, pos, c);
      if (res.result === 'move' || res.result === 'turn') pos = res;
    });
    return pos;
  }

  function drawGhost(g, S, x, y, ang, alpha) {
    const r = game.robots[0];
    g.save();
    g.globalAlpha = alpha;
    g.translate((x + 0.5) * S, (y + 0.5) * S);
    g.rotate(ang);
    g.drawImage(r.sprite, -S / 2, -S / 2, S, S);
    g.restore();
  }

  // Yellow chevrons pointing up, drawn in a frame already turned to face a direction.
  function drawChevrons(g, S, from, n, alpha) {
    g.fillStyle = 'rgba(255, 216, 74,' + alpha + ')';
    for (let k = 0; k < n; k++) {
      const y = -S * (from + k * 0.24);
      g.beginPath();
      g.moveTo(-S * 0.2, y + S * 0.1);
      g.lineTo(0, y - S * 0.08);
      g.lineTo(S * 0.2, y + S * 0.1);
      g.lineTo(0, y + S * 0.02);
      g.fill();
    }
  }

  // What the map draws to help: arrows off Roversa's front, the square it will end
  // up on, numbered squares ahead, or an arc for a turn.
  function drawGuide(g, S, now) {
    const gd = game.guide;
    if (gd.wait) return;
    const spec = guideStep();
    const show = spec && spec.show;
    if (!show) return;
    const r = game.robots[0];
    const pulse = 0.6 + 0.4 * Math.sin(now / 200);
    const loop = Math.min(1, (now % 1800) / 1200);
    const ease = loop < 0.5 ? 2 * loop * loop : 1 - Math.pow(-2 * loop + 2, 2) / 2;
    const cx = (r.rx + 0.5) * S, cy = (r.ry + 0.5) * S;
    const dx = E.DX[r.dir], dy = E.DY[r.dir];
    const yellow = (a) => 'rgba(255, 216, 74,' + a + ')';
    g.save();
    if (show === 'front') {
      g.translate(cx, cy);
      g.rotate(r.ang);
      g.fillStyle = yellow(pulse);
      g.fillRect(-S * 0.42, -S * 0.5, S * 0.84, SCALE * 2);
      drawChevrons(g, S, 0.68, 3, pulse);
    } else if (show === 'target') {
      const cmds = E.resolve(game.program);
      if (spec && spec.do === 'add') cmds.push(spec.t);
      const end = endOf(cmds);
      drawGhost(g, S, end.x, end.y, (end.dir * Math.PI) / 2, 0.3 + 0.15 * pulse);
      g.setLineDash([SCALE * 3, SCALE * 2]);
      g.strokeStyle = yellow(pulse);
      g.lineWidth = SCALE * 1.5;
      g.strokeRect(end.x * S + SCALE * 2, end.y * S + SCALE * 2, S - SCALE * 4, S - SCALE * 4);
    } else if (show === 'count') {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = S * 0.2 + 'px "Press Start 2P", monospace';
      for (let k = 1; k <= spec.n; k++) {
        const x = r.x + dx * k, y = r.y + dy * k;
        if (!E.inBounds(game.map.grid, x, y)) break;
        const on = k <= usedCount(spec.t) - (gd.need - spec.n);
        g.fillStyle = yellow(on ? 1 : 0.55 + 0.3 * pulse);
        g.beginPath();
        g.arc((x + 0.5) * S, (y + 0.78) * S, S * 0.17, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#1b1f3b';
        g.fillText(String(k), (x + 0.5) * S, (y + 0.79) * S);
      }
    } else if (show === 'turn') {
      const sign = spec.t === 'L' ? -1 : 1;
      drawGhost(g, S, r.rx, r.ry, r.ang + sign * (Math.PI / 2) * ease, 0.45);
      g.translate(cx, cy);
      g.rotate(r.ang);
      const R = S * 0.62, a0 = -Math.PI / 2 + sign * 0.2, a1 = -Math.PI / 2 + sign * (Math.PI / 2 - 0.25);
      g.strokeStyle = yellow(pulse);
      g.lineWidth = SCALE * 2;
      g.beginPath();
      g.arc(0, 0, R, a0, a1, sign < 0);
      g.stroke();
      // Arrowhead along the arc at its end.
      const ex = R * Math.cos(a1), ey = R * Math.sin(a1);
      const tx = -Math.sin(a1) * sign, ty = Math.cos(a1) * sign;
      const h = S * 0.16;
      g.fillStyle = yellow(pulse);
      g.beginPath();
      g.moveTo(ex + tx * h, ey + ty * h);
      g.lineTo(ex - ty * h * 0.7, ey + tx * h * 0.7);
      g.lineTo(ex + ty * h * 0.7, ey - tx * h * 0.7);
      g.fill();
    }
    g.restore();
  }

  $('#btn-new-piece').addEventListener('click', () => {
    if (!editable() || game.guide || !game.level || !game.level.newPiece) return;
    SND.tap();
    showNewPiece();
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
        setMessage(tr('msg.reached', { goal: goalTo(goal.id) }), 'good');
        renderScoreboard();
      }
    } else if (res.result === 'bump' || (res.result === 'off' && game.mode === 'level')) {
      SND.bump();
      const dx = (res.tx - r.x) * 0.3, dy = (res.ty - r.y) * 0.3;
      await tween(r, { rx: r.x + dx, ry: r.y + dy }, 130);
      await tween(r, { rx: r.x, ry: r.y }, 130);
      for (let i = 0; i < 4; i++) { r.bump = (i % 2 ? -1 : 1) * SCALE * 1.5; await sleep(40); }
      r.bump = 0;
      return { result: 'bump', what: res.result === 'off' ? tr('edge') : occupied(res.tx, res.ty) ? tr('otherRobot') : TILE_NAMES[game.map.grid[res.ty][res.tx]] };
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

  // Starts a program from the beginning: in Adventures the robot goes back to its start first.
  function beginRun() {
    const r = game.robots[game.active];
    clearStopMark();
    if (game.mode === 'level') resetRobot(r);
    game.trail = [{ x: r.x, y: r.y }];
    clearRunMarks();
    return { r, steps: E.resolve(game.program), i: 0 };
  }

  async function runOne(st) {
    game.runIndex = st.i;
    const piece = game.program[st.i];
    game.shownPiece = piece ? { t: piece.t, chosen: piece.chosen, copies: piece.t === 'P' ? repeatCopies(game.program, st.i) : null, at: performance.now() } : null;
    renderProgram();
    const cmd = st.steps[st.i];
    const res = await doStep(st.r, cmd);
    const what = cmd ? PIECE_NAMES[cmd] : tr('sr.repeatNothing');
    const told = tr('told.' + res.result, { where: where(st.r.x, st.r.y), dir: DIR_WORDS[st.r.dir], what: res.what });
    announce(tr('sr.ran', { n: st.i + 1, what, told }));
    describeBoard();
    game.doneUpTo = st.i;
    res.index = st.i;
    st.i++;
    return res;
  }

  function endRun(st, outcome) {
    game.runIndex = -1;
    game.shownPiece = null;
    game.running = false;
    game.stepping = null;
    renderProgram();
    if (game.mode === 'level' && game.level.stages) finishTutorialRun(st.r, outcome);
    else if (game.mode === 'level') finishLevelRun(st.r, outcome);
    else finishQuestTurn(st.r, outcome);
  }

  // GO runs the whole program, or the rest of it after some Steps.
  async function run(byAi) {
    if (game.running || !game.program.length || (isAiTurn() && byAi !== true) || guideBlocks('go')) return;
    closeModal();
    const st = game.stepping || beginRun();
    game.running = true;
    game.stepping = null;
    renderAll();
    setMessage(isAiTurn() ? tr('msg.drivingNamed', { robot: st.r.name }) : tr('msg.driving'));
    let outcome = { result: 'done' };
    while (st.i < st.steps.length) {
      const res = await runOne(st);
      if (res.result === 'bump' || res.result === 'off') { outcome = res; break; }
      await sleep(PAUSE_MS);
    }
    endRun(st, outcome);
  }

  // Step runs just the next piece, so players can watch where the program goes wrong.
  async function step() {
    if (game.running || !game.program.length || isAiTurn() || guideBlocks('step')) return;
    closeModal();
    const st = game.stepping || beginRun();
    game.running = true;
    renderAll();
    const res = await runOne(st);
    if (res.result === 'bump' || res.result === 'off' || st.i >= st.steps.length) {
      endRun(st, res.result === 'move' || res.result === 'turn' || res.result === 'noop' ? { result: 'done' } : res);
      return;
    }
    game.stepping = st;
    game.runIndex = -1;
    game.running = false;
    renderAll();
    if (!$('#message').classList.contains('good')) {
      setMessage(tr('msg.stepDone', { n: st.i, total: st.steps.length }));
    }
  }

  function finishLevelRun(r, outcome) {
    const allDone = game.map.goals.every((g) => r.visited.has(g.id));
    if (allDone) {
      const used = game.program.length;
      const best = par(game.levelIndex);
      const stars = used <= best ? 3 : used <= best + 2 ? 2 : 1;
      saveStars(game.level.name, stars);
      setMessage(tr('msg.didIt'), 'good');
      setTimeout(() => {
        SND.win();
        confetti();
        const next = game.levelIndex + 1 < LEVELS.length;
        openModal(
          '<h3>' + tr('modal.levelDone') + '</h3>' +
          '<div class="big-stars">' + [0, 1, 2].map((k) => '<span class="' + (k < stars ? 'on' : '') + '">&#9733;</span>').join('') + '</div>' +
          '<p>' + tr('modal.used', { n: used }) +
          (stars < 3 ? tr('modal.canYou', { n: best }) : tr('modal.fewest')) + '</p>' +
          '<div class="choices">' +
          '<button class="btn gray" data-act="again">' + tr('modal.tryAgain') + '</button>' +
          (next ? '<button class="btn big green" data-act="next">' + tr('modal.next') + ' &#9654;</button>' : '<button class="btn big green" data-act="levels">' + tr('modal.allLevels') + '</button>') +
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
      setMessage(tr('msg.bumpStop', { what: outcome.what }), 'bad');
      driveBack(r, () => setMessage(tr('msg.bumpBack', { what: outcome.what }), 'bad'));
    } else {
      setMessage(tr('msg.missed'), 'bad');
      driveBack(r, () => setMessage(tr('msg.backStart'), 'bad'));
    }
    renderButtons();
  }

  // After a run that missed, Roversa waits where it stopped so the player can see
  // it, then slides back along its trail to the start, where the next GO begins.
  // A faint Roversa stays on the stop square until the next run.
  async function driveBack(r, then) {
    const token = {};
    game.homing = token;
    game.stopMark = { x: r.x, y: r.y, ang: r.ang, left: false };
    const alive = () => game.homing === token && game.robots[0] === r && !game.running;
    await sleep(STOP_SHOW_MS);
    if (!alive()) return;
    game.stopMark.left = true;
    const path = game.trail.slice(0, -1).reverse();
    const ms = Math.min(HOME_MS, 1500 / Math.max(1, path.length));
    for (const p of path) {
      await tween(r, { rx: p.x, ry: p.y }, ms, alive);
      if (!alive()) return;
    }
    await tween(r, { rx: r.sx, ry: r.sy }, ms, alive);
    // Turn back to the start direction the short way round.
    const home = (r.sdir * Math.PI) / 2;
    const ang = home + Math.round((r.ang - home) / (2 * Math.PI)) * 2 * Math.PI;
    if (Math.abs(ang - r.ang) > 0.01) await tween(r, { ang }, TURN_MS, alive);
    if (!alive()) return;
    resetRobot(r);
    game.homing = null;
    sparkle(r.x, r.y);
    renderAll();
    if (then) then();
  }

  function clearStopMark() {
    game.stopMark = null;
    game.homing = null;
  }

  function finishQuestTurn(r, outcome) {
    r.turns++;
    const q = game.quest;
    if (r.visited.size === 3) {
      q.phase = 'over';
      q.winner = r;
      renderAll();
      setMessage(tr('msg.visitedAll', { robot: r.name }), 'good');
      setTimeout(() => {
        SND.win();
        confetti();
        openModal(
          '<h3>' + (game.robots.length > 1 ? tr('modal.wins', { team: r.name }) : tr('modal.questDone')) + '</h3>' +
          '<canvas class="winner" width="32" height="32" aria-hidden="true"></canvas>' +
          '<p>' + tr('modal.foundAll', { robot: r.name, n: r.turns }) + '</p>' +
          '<div class="choices"><button class="btn gray" data-act="home">' + tr('home') + '</button>' +
          '<button class="btn big green" data-act="again">' + tr('modal.playAgain') + '</button></div>'
        );
        modal.querySelector('.winner').getContext('2d').drawImage(r.character || r.sprite, 0, 0);
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
    if (outcome.result === 'bump') text = tr('msg.bumpQuest', { robot: r.name, what: outcome.what });
    else if (outcome.result === 'off') text = tr('msg.offQuest', { robot: r.name });
    else text = tr('msg.stopped', { robot: r.name });
    q.phase = 'roll';
    if (game.robots.length > 1) {
      game.active = (game.active + 1) % game.robots.length;
      const next = game.robots[game.active];
      text += next.ai ? tr('ai.nextTurn', { robot: next.name }) : tr('msg.nextTurn', { team: next.name });
    } else {
      text += tr('msg.rollAgain');
    }
    setMessage(text, outcome.result === 'done' ? '' : 'bad');
    renderAll();
    if (isAiTurn()) aiTurn();
  }

  // About how long a young reader needs for a message: a little over a second,
  // plus a third of a second per word.
  function readingTime(text) {
    return Math.max(1800, 1200 + text.trim().split(/\s+/).length * 330);
  }

  // The AI Opponent's turn: it rolls, lays out its puzzle pieces one at a time and
  // presses GO, slowly enough for kids to watch. Leaving the game or starting a
  // new one stops it.
  async function aiTurn() {
    const r = game.robots[game.active];
    const token = ++game.aiToken;
    const still = () => token === game.aiToken && game.robots[game.active] === r && game.quest && game.quest.phase !== 'over' &&
      $('#screen-game').classList.contains('active');
    // Leave the last turn's message (like a bump) up long enough to read, and
    // let the voice finish saying it, before the AI Opponent starts talking.
    await sleep(readingTime($('#message').textContent));
    for (let waited = 0; voiceOn && 'speechSynthesis' in window && speechSynthesis.speaking && waited < 15000; waited += 200) await sleep(200);
    if (!still()) return;
    setMessage(tr('ai.rolling', { robot: r.name }));
    await roll(true);
    if (!still()) return;
    setMessage(tr('ai.thinking', { robot: r.name }));
    await sleep(900);
    if (!still()) return;
    const occupied = (x, y) => game.robots.some((o) => o !== r && o.x === x && o.y === y);
    const program = AI.plan(game.map, r, game.tray, r.ai, occupied);
    for (const p of program) {
      const i = game.tray.findIndex((t) => t.t === p.t);
      const [piece] = game.tray.splice(i, 1);
      game.program.push({ id: piece.id, t: p.t, chosen: p.chosen });
      SND.drop();
      renderAll();
      await sleep(500);
      if (!still()) return;
    }
    setMessage(tr('ai.go', { robot: r.name }));
    await sleep(700);
    if (!still()) return;
    run(true);
  }

  async function roll(byAi) {
    const q = game.quest;
    if (!q || q.phase !== 'roll' || game.rolling || (isAiTurn() && byAi !== true)) return;
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
    if (!isAiTurn()) setMessage(tr('msg.arrange'));
  }

  $('#btn-go').addEventListener('click', run);
  $('#btn-step').addEventListener('click', step);

  $('#btn-roll').addEventListener('click', roll);

  $('#btn-clear').addEventListener('click', () => {
    if (!editable() || !game.program.length || guideBlocks('clear')) return;
    if (game.mode === 'quest') game.program.forEach((p) => game.tray.push({ id: p.id, t: p.t }));
    game.program = [];
    clearRunMarks();
    if (game.mode === 'level') clearStopMark();
    SND.remove();
    renderAll();
  });

  $('#btn-reset').addEventListener('click', () => {
    if (game.running || game.rolling || guideBlocks('reset')) return;
    SND.tap();
    if (game.mode === 'level') {
      // Start the level fresh: Roversa back on the start, an empty program row
      // and a clean map, with a sparkle so the restart is easy to see.
      const r = game.robots[0];
      clearStopMark();
      resetRobot(r);
      game.program = [];
      game.trail = [];
      clearRunMarks();
      renderAll();
      sparkle(r.x, r.y);
      if (game.guide) setMessage(tr(guideStep().say), 'guide');
      else setMessage(levelHint());
      return;
    }
    openModal(
      '<h3>' + tr('modal.newGameQ') + '</h3><p>' + tr('modal.newGameText') + '</p>' +
      '<div class="choices"><button class="btn gray" data-act="no">' + tr('modal.keepPlaying') + '</button>' +
      '<button class="btn big red" data-act="yes">' + tr('newGame') + '</button></div>'
    );
    modal.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      SND.tap();
      closeModal();
      if (b.dataset.act === 'yes') startQuest(game.robots.length);
    }));
  });

  // ---------- Start fresh ----------
  // For demos: forget everything this game saved on the device and reload, so
  // it opens just like a first visit.

  $('#btn-fresh').addEventListener('click', () => {
    SND.tap();
    openModal(
      '<h3>' + tr('fresh.title') + '</h3><p>' + tr('fresh.text') + '</p>' +
      '<div class="choices"><button class="btn gray" data-act="no">' + tr('fresh.keep') + '</button>' +
      '<button class="btn big red" data-act="yes">' + tr('fresh.button') + '</button></div>'
    );
    modal.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      SND.tap();
      closeModal();
      if (b.dataset.act !== 'yes') return;
      try {
        Object.keys(localStorage).filter((k) => k.startsWith('roversa-')).forEach((k) => localStorage.removeItem(k));
      } catch (e) { /* storage blocked: nothing was saved */ }
      location.reload();
    }));
  });

  // ---------- Language ----------

  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    SND.tap();
    I18N.setLang(b.dataset.lang);
  }));
  I18N.onChange(() => {
    syncGameText();
    if ($('#screen-levels').classList.contains('active')) { renderCostumeBar(); renderLevelGrid(); }
    if (game.map) { renderAll(); describeBoard(); }
    if (guideStep() && !game.guide.wait && !game.running) setMessage(tr(guideStep().say), 'guide');
  });
  I18N.applyStatic();

  // ---------- Start ----------

  const titleRobot = $('#title-robot');
  requestAnimationFrame(drawFrame);

  // Handy for testing: index.html#level=3 or #quest=2 jumps straight in (#level=0 is the tutorial).
  function openFromHash() {
    const hash = new URLSearchParams(location.hash.slice(1));
    if (game.running || game.rolling) return;
    closeModal();
    if (hash.has('level')) startLevel(Math.max(0, Math.min(LEVELS.length - 1, Number(hash.get('level')) - FIRST_NUM)));
    else if (hash.has('quest')) startQuest(hash.get('quest') === '2' ? 2 : 1);
  }
  window.addEventListener('hashchange', openFromHash);
  SP.ready.then(() => {
    titleRobot.getContext('2d').drawImage(SP.smileyRobot(), 0, 0);
    openFromHash();
  });
})();
