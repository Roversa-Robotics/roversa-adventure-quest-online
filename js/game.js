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
  const DICE_FACES = ['F', 'B', 'L', 'R', 'W', 'P'];
  const GOAL_NAMES = named('goal.');
  const TILE_NAMES = named('tile.');

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
    predict: null,
    trail: [],
    particles: [],
    runIndex: -1,
    shownPiece: null, // the piece being run, drawn on the map by the robot
    doneUpTo: -1,
    stepping: null, // a program being run one piece at a time: { r, steps, i }
    quest: null,
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

    // Faint grid: each square is one Forward or Backward step.
    g.fillStyle = 'rgba(0, 0, 0, 0.16)';
    for (let c = 1; c < v.cols; c++) g.fillRect(c * S - 1, 0, 2, board.height);
    for (let r = 1; r < v.rows; r++) g.fillRect(0, r * S - 1, board.width, 2);

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
      // In Dice Quest each player who found this treasure plants a small flag on it.
      if (game.mode === 'quest') {
        who.forEach((r, k) => {
          const fw = r.flag.width * SCALE / 2, fh = r.flag.height * SCALE / 2;
          const fx = k === 0 ? goal.x * S - SCALE : (goal.x + 1) * S - fw + SCALE;
          g.drawImage(r.flag, fx, (goal.y + 1) * S - fh, fw, fh);
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

    if (game.shownPiece) drawShownPiece(g, now, S);

    // Sparkles.
    game.particles = game.particles.filter((p) => p.life > 0);
    game.particles.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
      g.fillStyle = p.color;
      g.fillRect(p.x, p.y, SCALE * 2, SCALE * 2);
    });
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
    if (id === 'levels') { renderCostumeBar(); renderLevelGrid(); }
  }

  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { SND.tap(); show(b.dataset.go); }));
  document.querySelectorAll('[data-players]').forEach((b) => b.addEventListener('click', () => { SND.tap(); chooseCharacters(Number(b.dataset.players)); }));
  $('#btn-ai').addEventListener('click', () => { SND.tap(); chooseAiLevel(); });

  $('#btn-back').addEventListener('click', () => {
    if (game.running) return;
    SND.tap();
    closeModal();
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

  // Titles and button words on the game screen that depend on the mode and language.
  function syncGameText() {
    if (game.mode === 'level') {
      $('#game-title').textContent = (game.levelIndex + 1) + '. ' + I18N.levelText(game.levelIndex, game.level).name;
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
      const name = GOAL_NAMES[g.id];
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
    if (game.predict) parts.push(tr('sr.guess', { where: where(game.predict.x, game.predict.y) }));
    parts.push(tr('sr.keys'));
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
      const card = document.createElement('button');
      card.className = 'level-card';
      const map = E.parseMap(level.map);
      const v = buildView(map, i + 1);
      const c = document.createElement('canvas');
      c.width = v.bg.width;
      c.height = v.bg.height;
      const g = c.getContext('2d');
      g.drawImage(v.bg, 0, 0);
      map.goals.forEach((goal) => g.drawImage(SP.goals[goal.id], goal.x * T, goal.y * T, T, T));
      const st = map.starts['1'];
      g.save();
      g.translate(st.x * T + T / 2, st.y * T + T / 2);
      g.rotate((E.DIR_NAMES[level.startDir || 'N'] * Math.PI) / 2);
      g.drawImage(thumbRobot, -T / 2, -T / 2, T, T);
      g.restore();
      const n = stars[level.name] || 0;
      card.innerHTML = '<div class="num">' + tr('levelNum', { n: i + 1 }) + '</div><div class="name"></div>' +
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
    show('game');
    sizeBoard();
    game.trail = [];
    game.predict = null;
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
    game.map = E.parseMap(level.map);
    game.view = buildView(game.map, i + 1);
    game.robots = [makeRobot(game.map.starts['1'], E.DIR_NAMES[level.startDir || 'N'], 0)];
    const costume = loadCostume();
    if (costume) wearCostume(game.robots[0], costume);
    game.active = 0;
    game.limits = Object.assign({}, level.pieces);
    game.slots = level.slots;
    game.quest = null;
    $('#scoreboard').hidden = !costume;
    $('#btn-roll').hidden = true;
    syncGameText();
    enterGame();
    setMessage(levelHint());
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
    $('#btn-roll').hidden = !quest || quest.phase !== 'roll' || isAiTurn();
    $('#btn-roll').disabled = busy;
  }

  function renderAll() {
    describeBoard();
    renderPool();
    renderProgram();
    renderScoreboard();
    renderButtons();
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
  }

  async function addPiece(key, at) {
    if (!editable()) return;
    if (game.program.length >= game.slots) {
      setMessage(tr('msg.full'), 'bad');
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
    say(PIECE_NAMES[piece.chosen || piece.t]);
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

  // ---------- Prediction: tap the map to guess where Roversa stops ----------

  board.addEventListener('click', (e) => {
    if (game.running || !game.view) return;
    const r = board.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * game.view.cols);
    const y = Math.floor(((e.clientY - r.top) / r.height) * game.view.rows);
    if (!E.inBounds(game.map.grid, x, y)) return;
    if (game.predict && game.predict.x === x && game.predict.y === y) clearGuess();
    else setGuess(x, y);
  });

  function setGuess(x, y) {
    game.predict = { x, y };
    setMessage(tr('msg.guess'));
    announce(tr('sr.guessAt', { where: where(x, y) }));
    describeBoard();
    SND.tap();
  }

  function clearGuess() {
    game.predict = null;
    setMessage(tr('msg.guessRemoved'));
    describeBoard();
    SND.tap();
  }

  // Keyboard: arrow keys move the guess square, Delete or Escape removes it.
  board.addEventListener('keydown', (e) => {
    if (game.running || !game.view) return;
    const moves = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (moves[e.key]) {
      e.preventDefault();
      const r = game.robots[game.active];
      const from = game.predict || { x: r.x, y: r.y };
      const nx = Math.max(0, Math.min(game.map.cols - 1, from.x + (game.predict ? moves[e.key][0] : 0)));
      const ny = Math.max(0, Math.min(game.map.rows - 1, from.y + (game.predict ? moves[e.key][1] : 0)));
      setGuess(nx, ny);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && game.predict) {
      e.preventDefault();
      clearGuess();
    }
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
        setMessage(tr('msg.reached', { goal: tr('goalTo.' + goal.id) }), 'good');
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
    st.i++;
    return res;
  }

  function endRun(st, outcome) {
    game.runIndex = -1;
    game.shownPiece = null;
    game.running = false;
    game.stepping = null;
    renderProgram();
    if (game.mode === 'level') finishLevelRun(st.r, outcome);
    else finishQuestTurn(st.r, outcome);
  }

  // GO runs the whole program, or the rest of it after some Steps.
  async function run(byAi) {
    if (game.running || !game.program.length || (isAiTurn() && byAi !== true)) return;
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
    if (game.running || !game.program.length || isAiTurn()) return;
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

  function predictionNote(r) {
    if (!game.predict) return '';
    const right = game.predict.x === r.x && game.predict.y === r.y;
    game.predict = null;
    if (right) { setTimeout(SND.predict, 400); return tr('msg.guessRight'); }
    return tr('msg.guessWrong');
  }

  function finishLevelRun(r, outcome) {
    const note = predictionNote(r);
    const allDone = game.map.goals.every((g) => r.visited.has(g.id));
    if (allDone) {
      const used = game.program.length;
      const best = par(game.levelIndex);
      const stars = used <= best ? 3 : used <= best + 2 ? 2 : 1;
      saveStars(game.level.name, stars);
      setMessage(tr('msg.didIt') + note, 'good');
      setTimeout(() => {
        SND.win();
        confetti();
        const next = game.levelIndex + 1 < LEVELS.length;
        openModal(
          '<h3>' + tr('modal.levelDone') + '</h3>' +
          '<div class="big-stars">' + [0, 1, 2].map((k) => '<span class="' + (k < stars ? 'on' : '') + '">&#9733;</span>').join('') + '</div>' +
          '<p>' + tr('modal.used', { n: used }) +
          (stars < 3 ? tr('modal.canYou', { n: best }) : tr('modal.fewest')) + note + '</p>' +
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
      setMessage(tr('msg.bumpLevel', { what: outcome.what }) + note, 'bad');
    } else {
      const left = game.map.goals.filter((g) => !r.visited.has(g.id)).map((g) => GOAL_NAMES[g.id]);
      setMessage(tr('msg.almost', { list: left.join(tr('and')) }) + note, 'bad');
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
    text += note;
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
      // Start the level fresh: Roversa back on the start, an empty program row
      // and a clean map, with a sparkle so the restart is easy to see.
      const r = game.robots[0];
      resetRobot(r);
      game.program = [];
      game.trail = [];
      game.predict = null;
      clearRunMarks();
      renderAll();
      sparkle(r.x, r.y);
      setMessage(levelHint());
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

  // ---------- Language ----------

  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    SND.tap();
    I18N.setLang(b.dataset.lang);
  }));
  I18N.onChange(() => {
    syncGameText();
    if ($('#screen-levels').classList.contains('active')) { renderCostumeBar(); renderLevelGrid(); }
    if (game.map) { renderAll(); describeBoard(); }
  });
  I18N.applyStatic();

  // ---------- Start ----------

  const titleRobot = $('#title-robot');
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
  SP.ready.then(() => {
    titleRobot.getContext('2d').drawImage(SP.smileyRobot(), 0, 0);
    openFromHash();
  });
})();
