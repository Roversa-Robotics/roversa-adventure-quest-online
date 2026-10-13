// Storybook: a picture book for the youngest players. Roversa drives along a
// path through the three worlds, finds each puzzle piece and meets the characters.
// The child taps the one glowing thing to move on. Every move Roversa makes in a
// world joins the algorithm row under the map, so by the end of the chapter the
// row shows exactly how Roversa got there.
(function () {
  'use strict';

  const SP = globalThis.RoversaSprites;
  const UI = globalThis.RoversaUI;
  const I18N = globalThis.RoversaI18n;
  const SND = globalThis.RoversaAudio.sfx;
  const tr = I18N.tr;
  const $ = (sel) => document.querySelector(sel);

  const T = SP.SIZE;
  const SCALE = 4;
  const S = T * SCALE; // canvas pixels per square
  const MOVE_MS = 420;
  const TURN_MS = 320;
  const PROGRESS_KEY = 'roversa-story'; // how many chapters have been read

  // ---------- The story ----------
  //
  // Each chapter is one world on one map (same letters as js/levels.js). Roversa
  // starts at `start` (x, y and the way it faces) and keeps going from page to
  // page, never jumping. `path` is the dotted trail. `items` are characters and
  // things standing on a square: [x, y, picture, first page, page it leaves]
  // (pages counted from 0 within the chapter; the last two are optional).
  //
  // Each page is a list of beats, in order. A beat shows `say` (a key in
  // js/i18n.js) and waits for one tap:
  //   { drive: [x, y, 'E'] }  tap Roversa; it drives there with Forward and the
  //                           turns, facing that way (each move joins the algorithm)
  //   { wake: true }          tap Roversa; it wakes up (no move)
  //   { find: [x, y, t] }     puzzle piece t glows on the map; tap it
  //   { piece: 'F' }          the piece pops up big; tap it and Roversa does it
  //                           (Repeat does the piece before it again)
  //   { choice: 'W' }         Wild: tap any arrow, Roversa does it
  // A beat with none of these ends the page. Beats can also add a speech `bubble`
  // (text key) over the square `at`, add a `friend` to the pouch, `reveal` a new
  // picture on a square, turn on Toothie's `light`, or make the algorithm row
  // `glow`. Page options: `dark` dims the map except near that square,
  // `parade` lists friends who follow Roversa.
  const CHAPTERS = [
    {
      world: 'pond',
      map: ['L.V....L', 'S...V...', '......L.', 'V..L...V'],
      start: [0, 1, 'E'],
      path: [[1, 1], [2, 1], [3, 1], [3, 0], [4, 0], [5, 0]],
      items: [[6, 0, 'duck', 3]],
      pages: [
        { beats: [
          { say: 'story.1.a', wake: true },
          { say: 'story.1.b' },
        ] },
        { beats: [
          { say: 'story.2.a', find: [1, 1, 'F'] },
          { say: 'story.2.b', piece: 'F' },
          { say: 'story.2.c', glow: true },
        ] },
        { beats: [
          { say: 'story.drive', drive: [3, 1, 'E'] },
          { say: 'story.3.b', find: [3, 0, 'L'] },
          { say: 'story.3.c', piece: 'L' },
          { say: 'story.3.d' },
        ] },
        { beats: [
          { say: 'story.drive', drive: [3, 0, 'N'] },
          { say: 'story.4.b', find: [4, 0, 'R'] },
          { say: 'story.4.c', piece: 'R' },
          { say: 'story.4.d' },
        ] },
        { beats: [
          { say: 'story.5.a', drive: [5, 0, 'E'] },
          { say: 'story.5.b', bubble: 'story.5.bubble', at: [6, 0], friend: 'duck' },
          { say: 'story.algoDone', glow: true },
        ] },
      ],
    },
    {
      world: 'island',
      map: ['OO..PM.M', 'OS===KYP', 'OO.====.', 'OOOf.P.f'],
      start: [1, 1, 'E'],
      path: [[2, 1], [3, 1], [4, 1], [3, 2], [4, 2], [5, 2], [6, 2]],
      items: [[2, 2, 'duck'], [7, 2, 'x', 0, 3]],
      pages: [
        { beats: [
          { say: 'story.6.a', drive: [3, 1, 'E'] },
          { say: 'story.6.b' },
        ] },
        { beats: [
          { say: 'story.drive', drive: [4, 1, 'E'] },
          { say: 'story.7.b', bubble: 'story.7.bubble', at: [5, 1], find: [3, 1, 'B'] },
          { say: 'story.7.c', piece: 'B' },
          { say: 'story.7.d', friend: 'pirate' },
        ] },
        { beats: [
          { say: 'story.drive', drive: [3, 2, 'E'] },
          { say: 'story.driveF', drive: [4, 2, 'E'] },
          { say: 'story.8.b', bubble: 'story.8.bubble', at: [6, 1], find: [5, 2, 'P'] },
          { say: 'story.8.c', piece: 'P' },
          { say: 'story.8.d', friend: 'byteclaw', glow: true },
        ] },
        { beats: [
          { say: 'story.drive', drive: [6, 2, 'E'] },
          { say: 'story.9.b', reveal: [7, 2, 'chest'] },
          { say: 'story.algoDone', glow: true },
        ] },
      ],
    },
    {
      world: 'sea',
      map: ['#....*.#', 'S.......', '..%.....', '#...*..#'],
      start: [0, 1, 'E'],
      path: [[1, 1], [2, 1], [3, 2], [4, 2], [5, 2], [6, 2]],
      items: [[3, 1, 'octopus', 0, 1], [3, 0, 'octopus', 1, 3], [4, 2, 'toothie', 0, 3], [7, 2, 'sunken']],
      pages: [
        { beats: [
          { say: 'story.10.a', drive: [2, 1, 'E'] },
          { say: 'story.10.b', bubble: 'story.10.bubble', at: [3, 1], friend: 'octopus' },
        ] },
        { beats: [
          { say: 'story.11.a', find: [3, 1, 'W'] },
          { say: 'story.11.b', choice: 'W' },
        ] },
        { dark: [4, 2], beats: [
          { say: 'story.12.a', drive: [3, 2, 'E'] },
          { say: 'story.12.b', bubble: 'story.12.bubble', at: [4, 2], friend: 'toothie', light: true },
        ] },
        { parade: ['toothie', 'octopus', 'duck', 'byteclaw', 'pirate'], beats: [
          { say: 'story.13.a', drive: [6, 2, 'E'] },
          { say: 'story.algoDone', glow: true },
          { say: 'story.13.b' },
        ] },
      ],
    },
  ];

  // Squares Roversa can't drive onto, per world.
  const BLOCKS = { pond: 'LV', island: 'OMPKY', sea: '*%#' };

  const PIECE_ORDER = ['F', 'L', 'R', 'B', 'P', 'W'];
  const FRIENDS = ['duck', 'pirate', 'byteclaw', 'octopus', 'toothie'];
  const ALL_PAGES = CHAPTERS.flatMap((ch, c) => ch.pages.map((p, i) => ({ c, i, page: p })));
  const pageNumber = (c, i) => ALL_PAGES.findIndex((p) => p.c === c && p.i === i) + 1;

  // What a page adds to the pouch.
  function pageFinds(page) {
    const pieces = [], friends = [];
    page.beats.forEach((b) => {
      if (b.piece) pieces.push(b.piece);
      if (b.choice) pieces.push(b.choice);
      if (b.friend) friends.push(b.friend);
    });
    return { pieces, friends };
  }

  // ---------- Pictures ----------

  const W = SP.WORLDS;
  const CHAR = Object.fromEntries(SP.CHARACTERS.map((c) => [c.id, c.sprite]));
  const PICS = {
    duck: W.pond.goals.A, x: W.island.goals.A, chest: W.island.goals.B, sunken: W.sea.goals.A,
    octopus: W.sea.goals.B, toothie: W.sea.goals.C, pirate: W.island.props.K, byteclaw: W.island.props.Y, ...CHAR,
  };
  const robotSprite = SP.robot();

  const pieceImages = {};
  function pieceImage(t) {
    if (!pieceImages[t]) {
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(UI.pieceSvg(t).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="154" height="128" '));
      pieceImages[t] = img;
    }
    return pieceImages[t];
  }

  // The map background for a chapter: the world's tiles, plus characters that stand on a square.
  function background(world, rows) {
    const c = document.createElement('canvas');
    c.width = rows[0].length * S;
    c.height = rows.length * S;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const at = (x, y) => (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length ? undefined : rows[y][x]);
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      g.drawImage(SP.worldTile(world, ch, 5000 + y * 37 + x * 11, (dx, dy) => at(x + dx, y + dy)), x * S, y * S, S, S);
      if (W[world].props[ch]) g.drawImage(W[world].props[ch], x * S, y * S, S, S);
    }));
    return c;
  }

  const DIRS = { N: 0, E: 1, S: 2, W: 3 };
  const DX = [0, 1, 0, -1];
  const DY = [-1, 0, 1, 0];
  const itemsOn = (ch, i) => ch.items.filter(([, , , from = 0, to = Infinity]) => i >= from && i < to);

  // A small still picture of a chapter's map, for the shelf.
  function thumbnail(c) {
    const ch = CHAPTERS[c];
    const bg = background(ch.world, ch.map);
    const g = bg.getContext('2d');
    const [x, y, d] = ch.start;
    g.save();
    g.translate((x + 0.5) * S, (y + 0.5) * S);
    g.rotate(DIRS[d] * Math.PI / 2);
    g.drawImage(robotSprite, -S / 2, -S / 2, S, S);
    g.restore();
    itemsOn(ch, 0).forEach(([ix, iy, s]) => g.drawImage(PICS[s], ix * S, iy * S, S, S));
    if (c > readChapters()) { g.fillStyle = 'rgba(14,16,36,0.55)'; g.fillRect(0, 0, bg.width, bg.height); }
    bg.className = 'story-thumb';
    return bg;
  }

  const spriteCanvas = (name) => {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 32;
    c.getContext('2d').drawImage(PICS[name], 0, 0);
    return c;
  };

  // ---------- Saved progress ----------

  function readChapters() {
    try { return Number(localStorage.getItem(PROGRESS_KEY)) || 0; } catch (e) { return 0; }
  }
  function markRead(c) {
    if (readChapters() > c) return;
    try { localStorage.setItem(PROGRESS_KEY, String(c + 1)); } catch (e) { /* storage blocked */ }
  }

  // ---------- Reading aloud ----------
  // Uses the game's read-aloud setting. Each word lights up as it is spoken,
  // where the browser says which word it is on.

  let speechId = 0;
  function speak(text, force) {
    const words = $('#story-text') ? [...$('#story-text').querySelectorAll('.w')] : [];
    words.forEach((w) => w.classList.remove('on'));
    if (!('speechSynthesis' in window) || (!force && !UI.voiceOn())) return;
    const id = ++speechId;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(UI.speechText(text));
      u.rate = 0.9;
      u.lang = I18N.speechLang;
      const v = UI.bestVoice();
      if (v) u.voice = v;
      u.onboundary = (e) => {
        if (id !== speechId || e.name === 'sentence') return;
        words.forEach((w) => w.classList.toggle('on', Number(w.dataset.at) <= e.charIndex && e.charIndex < Number(w.dataset.end)));
      };
      u.onend = () => { if (id === speechId) words.forEach((w) => w.classList.remove('on')); };
      speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable */ }
  }
  function hush() {
    speechId++;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  // ---------- Where Roversa is in a world ----------
  //
  // The world state carries from page to page: Roversa's square and heading,
  // the squares it has driven over, its algorithm so far, and the Wild choice.
  // Opening a page out of order (going back, or a test link) replays the pages
  // before it instantly, so Roversa is always where the story left it.

  function freshWorld(c) {
    const [x, y, d] = CHAPTERS[c].start;
    return { c, page: 0, robot: { x, y, dir: DIRS[d], rx: x, ry: y, ang: DIRS[d] * Math.PI / 2, hop: 0 }, visited: [], algo: [], followers: [], wild: null };
  }

  function blocked(w, i, x, y) {
    const ch = CHAPTERS[w.c];
    if (y < 0 || y >= ch.map.length || x < 0 || x >= ch.map[0].length) return true;
    if (BLOCKS[ch.world].includes(ch.map[y][x])) return true;
    const parade = ch.pages[i].parade || [];
    return itemsOn(ch, i).some(([ix, iy, s]) => ix === x && iy === y && !parade.includes(s));
  }

  // The fewest Forward, Turn Left and Turn Right pieces from where Roversa is to [x, y, facing].
  function route(w, i, [tx, ty, td]) {
    const goal = DIRS[td];
    const r = w.robot;
    const key = (x, y, d) => x + ',' + y + ',' + d;
    const seen = new Set([key(r.x, r.y, r.dir)]);
    const queue = [{ x: r.x, y: r.y, d: r.dir, moves: [] }];
    while (queue.length) {
      const s = queue.shift();
      if (s.x === tx && s.y === ty && s.d === goal) return s.moves;
      const next = [
        ['F', s.x + DX[s.d], s.y + DY[s.d], s.d],
        ['L', s.x, s.y, (s.d + 3) % 4],
        ['R', s.x, s.y, (s.d + 1) % 4],
      ];
      for (const [t, x, y, d] of next) {
        if (t === 'F' && blocked(w, i, x, y)) continue;
        if (seen.has(key(x, y, d))) continue;
        seen.add(key(x, y, d));
        queue.push({ x, y, d, moves: s.moves.concat(t) });
      }
    }
    return [];
  }

  // What a puzzle piece does: 'F', 'B', 'L' or 'R'. Repeat does the piece before it again.
  function actionOf(w, step) {
    if (step.t === 'W') return step.chosen;
    if (step.t === 'P') {
      for (let k = w.algo.length - 1; k >= 0; k--) if (w.algo[k].t !== 'P') return actionOf(w, w.algo[k]);
      return null;
    }
    return step.t;
  }

  // Does one puzzle piece and adds it to the algorithm. Animated unless `instant`.
  async function doStep(w, step, instant) {
    const a = actionOf(w, step);
    if (step.t === 'P') step = { t: 'P', copies: a };
    w.algo.push(step);
    if (!instant) renderAlgo();
    const r = w.robot;
    if (a === 'F' || a === 'B') {
      const s = a === 'F' ? 1 : -1;
      const fx = r.x, fy = r.y;
      const fol = w.followers.map((f) => ({ f, fx: f.x, fy: f.y }));
      // Each friend in the parade steps into the square of the one ahead of it.
      fol.forEach((o, k) => {
        const ahead = k === 0 ? { x: fx, y: fy } : fol[k - 1];
        o.f.x = ahead.fx === undefined ? ahead.x : ahead.fx;
        o.f.y = ahead.fy === undefined ? ahead.y : ahead.fy;
      });
      r.x += DX[r.dir] * s;
      r.y += DY[r.dir] * s;
      w.visited.push([r.x, r.y]);
      if (instant) {
        r.rx = r.x; r.ry = r.y;
        w.followers.forEach((f) => { f.rx = f.x; f.ry = f.y; });
        return;
      }
      SND.move();
      await tween(MOVE_MS, (k) => {
        r.rx = fx + (r.x - fx) * k; r.ry = fy + (r.y - fy) * k;
        fol.forEach((o) => { o.f.rx = o.fx + (o.f.x - o.fx) * k; o.f.ry = o.fy + (o.f.y - o.fy) * k; });
      });
    } else if (a === 'L' || a === 'R') {
      const s = a === 'R' ? 1 : -1;
      const from = r.dir * Math.PI / 2;
      r.dir = (r.dir + s + 4) % 4;
      if (instant) { r.ang = r.dir * Math.PI / 2; return; }
      SND.turn();
      await tween(TURN_MS, (k) => { r.ang = from + (s * Math.PI / 2) * k; });
      r.ang = r.dir * Math.PI / 2;
    }
    if (!instant) await sleep(140);
  }

  // Sets up the parade: friends line up on the squares Roversa just drove over.
  function startParade(w, page) {
    if (!page.parade || w.followers.length) return;
    const [sx, sy, sd] = CHAPTERS[w.c].start;
    const trail = [];
    w.visited.slice().reverse().concat([[sx, sy]]).forEach(([x, y]) => {
      if ((x !== w.robot.x || y !== w.robot.y) && !trail.some((p) => p[0] === x && p[1] === y)) trail.push([x, y]);
    });
    for (let k = 1; trail.length < page.parade.length; k++) trail.push([sx - DX[DIRS[sd]] * k, sy - DY[DIRS[sd]] * k]);
    w.followers = page.parade.map((s, k) => ({ s, x: trail[k][0], y: trail[k][1], rx: trail[k][0], ry: trail[k][1] }));
  }

  // Plays a page's moves instantly, to catch up when a page is opened out of order.
  function replayPage(w, i) {
    const page = CHAPTERS[w.c].pages[i];
    startParade(w, page);
    for (const b of page.beats) {
      if (b.drive) route(w, i, b.drive).forEach((t) => doStep(w, { t }, true));
      if (b.piece) doStep(w, { t: b.piece }, true);
      if (b.choice) doStep(w, { t: 'W', chosen: w.wild || 'F' }, true);
    }
  }

  // ---------- Reading a page ----------

  const body = $('#story-body');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tween = (ms, fn) => new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      fn(k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
      if (k < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });

  let world = null; // the world being read (see freshWorld)
  let view = null; // the page being read: { c, i, page, beat, ... }
  const bgCache = {};

  function openPage(c, i) {
    hush();
    // Carry on from the page before, or replay the world up to this page.
    if (!world || world.c !== c || world.page !== i) {
      const wild = world && world.c === c ? world.wild : null;
      world = freshWorld(c);
      world.wild = wild;
      for (let k = 0; k < i; k++) replayPage(world, k);
    }
    world.page = i;
    const ch = CHAPTERS[c];
    const page = ch.pages[i];
    startParade(world, page);
    if (!bgCache[c]) bgCache[c] = background(ch.world, ch.map);
    view = {
      c, i, page, bg: bgCache[c],
      items: itemsOn(ch, i).filter(([, , s]) => !(page.parade || []).includes(s)).map(([x, y, s]) => ({ x, y, s })),
      bubbles: [], sparks: [], mapPiece: null,
      light: page.dark ? 2.6 : 0, glow: false,
      beat: -1, done: false, got: { pieces: [], friends: [] }, text: '',
    };
    renderPage();
    nextBeat();
  }

  function renderPage() {
    const { c, i } = view;
    const ch = CHAPTERS[c];
    body.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'story-page';
    el.innerHTML =
      '<p class="story-chapter">' + tr('story.chapter', { n: c + 1 }) + ' · ' + tr('world.' + ch.world) + '</p>' +
      '<button type="button" class="icon-btn story-prev" aria-label="' + tr('story.prev') + '">◀</button>' +
      '<div class="story-map"><canvas id="story-canvas" role="img"></canvas><div class="story-layer"></div></div>' +
      '<button type="button" class="icon-btn story-next" aria-label="' + tr('story.next') + '">▶</button>' +
      '<div class="story-algo"><p class="story-algo-label">' + tr('story.algorithm') + '</p><div class="story-algo-row"></div></div>' +
      '<div class="story-say"><button type="button" class="story-replay" aria-label="' + tr('story.replay') + '">🔊</button>' +
      '<p id="story-text" aria-live="polite"></p></div>' +
      '<div class="story-pouch"><p class="story-pouch-label">' + tr('story.pouch') + '</p><div class="story-pouch-row"></div></div>' +
      '<p class="story-dots" aria-label="' + pageNumber(c, i) + ' / ' + ALL_PAGES.length + '">' +
      ch.pages.map((_, k) => '<span class="' + (k === i ? 'on' : '') + '"></span>').join('') + '</p>';
    body.appendChild(el);
    const cv = el.querySelector('canvas');
    cv.width = view.bg.width;
    cv.height = view.bg.height;
    el.querySelector('.story-map').style.setProperty('--cols', ch.map[0].length);
    el.querySelector('.story-map').style.setProperty('--rows', ch.map.length);
    el.querySelector('.story-prev').addEventListener('click', () => { SND.tap(); goPrev(); });
    el.querySelector('.story-next').addEventListener('click', () => { if (canGoOn()) { SND.tap(); goNext(); } });
    el.querySelector('.story-replay').addEventListener('click', () => { SND.tap(); speak(view.text, true); });
    swipe(el);
    showText(view.text);
    renderAlgo();
    renderPouch();
    syncNext();
  }

  // Pages turn with a swipe too.
  function swipe(el) {
    let start = null;
    el.addEventListener('pointerdown', (e) => { start = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0 && canGoOn()) goNext();
      else if (dx > 0) goPrev();
    });
  }

  // A page that was read before can be skipped; a new one is finished first,
  // so Roversa never skips part of the path.
  const canGoOn = () => view && (view.done || (readChapters() > view.c && !view.busy));
  function syncNext() {
    const b = body.querySelector('.story-next');
    if (!b) return;
    b.disabled = !canGoOn();
    b.classList.toggle('ready', view.done);
  }

  function goNext() {
    const { c, i } = view;
    // Skipping a page that was read before: play its moves so Roversa is in the right place.
    if (!view.done) { world.page = -1; }
    if (i + 1 < CHAPTERS[c].pages.length) { openPage(c, i + 1); return; }
    markRead(c);
    if (c + 1 < CHAPTERS.length) openPage(c + 1, 0);
    else showEnd();
  }
  function goPrev() {
    const { c, i } = view;
    if (i > 0) openPage(c, i - 1);
    else if (c > 0) openPage(c - 1, CHAPTERS[c - 1].pages.length - 1);
    else showShelf();
  }

  function showText(text) {
    view.text = text;
    const p = $('#story-text');
    if (!p) return;
    p.innerHTML = '';
    let at = 0;
    text.split(/(\s+)/).forEach((part) => {
      if (/^\s+$/.test(part) || !part) { p.appendChild(document.createTextNode(part)); at += part.length; return; }
      const w = document.createElement('span');
      w.className = 'w';
      w.textContent = part;
      w.dataset.at = at;
      w.dataset.end = at + part.length;
      p.appendChild(w);
      at += part.length;
    });
  }

  // The algorithm row: every puzzle piece Roversa has done in this world, in order.
  function renderAlgo() {
    const box = body.querySelector('.story-algo');
    if (!box || !world) return;
    box.classList.toggle('glow', view.glow);
    const row = box.querySelector('.story-algo-row');
    row.innerHTML = '';
    world.algo.forEach((step, k) => {
      const s = document.createElement('span');
      s.className = 'story-step' + (k === world.algo.length - 1 && !view.glow ? ' last' : '');
      s.innerHTML = UI.pieceSvg(step.t, step.chosen, step.copies);
      s.setAttribute('role', 'img');
      s.setAttribute('aria-label', step.t === 'W' ? tr('wildAs', { name: tr('piece.' + step.chosen) })
        : step.t === 'P' ? tr('repeatAs', { name: tr('piece.' + step.copies) }) : tr('piece.' + step.t));
      row.appendChild(s);
    });
    if (!world.algo.length) row.innerHTML = '<span class="story-step empty"></span>';
    row.scrollLeft = row.scrollWidth;
  }

  function renderPouch() {
    const row = body.querySelector('.story-pouch-row');
    if (!row) return;
    const have = { pieces: new Set(view.got.pieces), friends: new Set(view.got.friends) };
    ALL_PAGES.slice(0, pageNumber(view.c, view.i) - 1).forEach(({ page }) => {
      const f = pageFinds(page);
      f.pieces.forEach((t) => have.pieces.add(t));
      f.friends.forEach((n) => have.friends.add(n));
    });
    row.innerHTML = '';
    PIECE_ORDER.forEach((t) => {
      const s = document.createElement('span');
      s.className = 'story-slot piece-slot' + (have.pieces.has(t) ? '' : ' missing') + (view.got.pieces.includes(t) ? ' new' : '');
      s.innerHTML = UI.pieceSvg(t);
      row.appendChild(s);
    });
    row.appendChild(Object.assign(document.createElement('span'), { className: 'story-sep' }));
    FRIENDS.forEach((n) => {
      const s = document.createElement('span');
      s.className = 'story-slot' + (have.friends.has(n) ? '' : ' missing') + (view.got.friends.includes(n) ? ' new' : '');
      s.appendChild(spriteCanvas(n));
      row.appendChild(s);
    });
  }

  // ---------- Beats ----------

  function nextBeat() {
    const v = view;
    v.beat++;
    const b = v.page.beats[v.beat];
    if (!b) {
      v.done = true;
      world.page = v.i + 1;
      syncNext();
      layer();
      return;
    }
    showText(tr(b.say));
    if (b.bubble) v.bubbles.push({ x: b.at[0], y: b.at[1], key: b.bubble });
    if (b.friend) { v.got.friends.push(b.friend); renderPouch(); SND.goal(); burst(b.at || [world.robot.x, world.robot.y]); }
    if (b.reveal) {
      const [x, y, s] = b.reveal;
      v.items = v.items.filter((it) => it.x !== x || it.y !== y).concat([{ x, y, s }]);
      SND.goal();
      burst([x, y]);
    }
    if (b.light) tween(900, (k) => { v.light = 2.6 + k * 3.5; });
    if (b.glow) { v.glow = true; renderAlgo(); }
    if (b.find) v.mapPiece = { x: b.find[0], y: b.find[1], t: b.find[2] };
    speak(v.text);
    const interactive = b.drive || b.wake || b.find || b.piece || b.choice;
    if (!interactive && v.beat === v.page.beats.length - 1) {
      v.done = true;
      world.page = v.i + 1;
      syncNext();
    } else if (!interactive) {
      // A line with nothing to tap leads straight on to the next one.
      v.busy = true;
      setTimeout(() => { if (view === v) { v.busy = false; nextBeat(); } }, 2600);
    }
    layer();
  }

  async function act(fn) {
    const v = view;
    v.busy = true;
    syncNext();
    layer();
    await fn();
    if (view !== v) return;
    v.busy = false;
    nextBeat();
  }

  // Buttons and pictures on top of the map: what to tap, the hand, speech bubbles, pop-ups.
  function layer() {
    const v = view;
    const el = body.querySelector('.story-layer');
    if (!el) return;
    el.innerHTML = '';
    const ch = CHAPTERS[v.c];
    const cols = ch.map[0].length, rows = ch.map.length;
    const place = (node, x, y) => { node.style.left = (x / cols) * 100 + '%'; node.style.top = (y / rows) * 100 + '%'; el.appendChild(node); return node; };
    // A bubble on the top row hangs below its square so it stays on the map.
    v.bubbles.forEach((bb) => place(Object.assign(document.createElement('div'), {
      className: 'story-bubble' + (bb.y === 0 ? ' below' : ''), textContent: tr(bb.key),
    }), bb.x + 0.5, bb.y === 0 ? 1 : bb.y));
    const b = v.page.beats[v.beat];
    if (!b || v.busy) return;
    const hit = (x, y, label, onTap) => {
      const btn = place(document.createElement('button'), x, y);
      btn.type = 'button';
      btn.className = 'story-hit';
      btn.setAttribute('aria-label', label);
      btn.addEventListener('click', onTap);
      place(handEl(), x + 0.45, y + 0.5);
    };
    const r = world.robot;
    if (b.drive) {
      hit(r.x, r.y, tr('story.tapRobot'), () => {
        SND.tap();
        act(async () => { for (const t of route(world, v.i, b.drive)) await doStep(world, { t }); });
      });
    } else if (b.wake) {
      hit(r.x, r.y, tr('story.tapRobot'), () => {
        SND.goal();
        act(async () => {
          burst([r.x, r.y]);
          await tween(500, (k) => { r.hop = Math.sin(k * Math.PI * 2); });
          r.hop = 0;
        });
      });
    } else if (b.find) {
      hit(b.find[0], b.find[1], tr('story.tapPiece', { name: tr('piece.' + b.find[2]) }), () => {
        SND.drop();
        v.mapPiece = null;
        act(() => sleep(120));
      });
    } else if (b.piece) {
      const pop = popup();
      const big = document.createElement('button');
      big.type = 'button';
      big.className = 'story-big';
      big.innerHTML = UI.pieceSvg(b.piece) + '<span class="story-big-name">' + tr('piece.' + b.piece) + '</span>';
      big.setAttribute('aria-label', tr('story.tapPiece', { name: tr('piece.' + b.piece) }));
      big.addEventListener('click', () => {
        SND.tap();
        act(async () => {
          await doStep(world, { t: b.piece });
          v.got.pieces.push(b.piece);
          renderPouch();
          SND.drop();
        });
      });
      pop.appendChild(big);
      pop.appendChild(handEl());
    } else if (b.choice) {
      const pop = popup();
      pop.classList.add('choose');
      const label = document.createElement('p');
      label.className = 'story-pop-label';
      label.textContent = tr('story.pickWild');
      pop.appendChild(label);
      const row = document.createElement('div');
      row.className = 'story-choices';
      ['F', 'B', 'L', 'R'].forEach((t) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'story-choice';
        btn.innerHTML = UI.pieceSvg('W', t);
        btn.setAttribute('aria-label', tr('wildAs', { name: tr('piece.' + t) }));
        btn.addEventListener('click', () => {
          SND.tap();
          act(async () => {
            const text = tr('story.wildAs', { name: tr('piece.' + t) });
            showText(text);
            speak(text);
            world.wild = t;
            await doStep(world, { t: 'W', chosen: t });
            v.got.pieces.push(b.choice);
            renderPouch();
            SND.drop();
            await sleep(1200);
          });
        });
        row.appendChild(btn);
      });
      pop.appendChild(row);
    }
    function popup() {
      const pop = document.createElement('div');
      pop.className = 'story-pop';
      el.appendChild(pop);
      return pop;
    }
  }

  function handEl() {
    const h = document.createElement('div');
    h.className = 'guide-hand story-hand';
    h.setAttribute('aria-hidden', 'true');
    h.innerHTML = document.querySelector('.guide-hand') ? document.querySelector('.guide-hand').innerHTML : '';
    return h;
  }

  function burst([x, y]) {
    for (let k = 0; k < 14; k++) {
      view.sparks.push({ x: (x + 0.5) * S, y: (y + 0.4) * S, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 7 - 2, life: 40,
        color: ['#fbbd27', '#fff6b0', '#ffffff'][k % 3] });
    }
  }

  // ---------- Drawing ----------

  function draw(now) {
    requestAnimationFrame(draw);
    const v = view;
    const cv = $('#story-canvas');
    if (!v || !world || !cv || !$('#screen-story').classList.contains('active')) return;
    const ch = CHAPTERS[v.c];
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(v.bg, 0, 0);

    // The dotted path: white ahead, yellow where Roversa has been.
    const dots = (x, y, color) => {
      g.fillStyle = color;
      [-1, 0, 1].forEach((k) => g.fillRect((x + 0.5) * S + k * SCALE * 4 - SCALE, (y + 0.5) * S - SCALE, SCALE * 2, SCALE * 2));
    };
    const been = (x, y) => world.visited.some((p) => p[0] === x && p[1] === y);
    ch.path.forEach(([x, y]) => { if (!been(x, y)) dots(x, y, 'rgba(255,255,255,0.8)'); });
    world.visited.forEach(([x, y]) => dots(x, y, '#fbbd27'));

    v.items.forEach((it, k) => {
      const bob = Math.round(Math.sin(now / 320 + k) * 1.5) * SCALE;
      g.drawImage(PICS[it.s], it.x * S, it.y * S + bob, S, S);
    });

    // A puzzle piece waiting to be found glows and floats.
    if (v.mapPiece) {
      const p = v.mapPiece;
      const img = pieceImage(p.t);
      const bob = Math.sin(now / 260) * SCALE * 1.5;
      g.save();
      g.shadowColor = '#fbbd27';
      g.shadowBlur = 18 + Math.sin(now / 200) * 8;
      if (img.complete) g.drawImage(img, (p.x + 0.12) * S, (p.y + 0.18) * S + bob, S * 0.76, S * 0.63);
      g.restore();
    }

    world.followers.forEach((f, k) => g.drawImage(PICS[f.s], f.rx * S, f.ry * S + Math.round(Math.sin(now / 150 + k) * 1.5) * SCALE, S, S));

    const r = world.robot;
    g.save();
    g.translate((r.rx + 0.5) * S, (r.ry + 0.5) * S - Math.abs(r.hop) * SCALE * 3);
    g.rotate(r.ang);
    g.drawImage(robotSprite, -S / 2, -S / 2, S, S);
    g.restore();

    // Under the sea it is dark, except near Toothie's light.
    if (v.page.dark) {
      const [lx, ly] = v.page.dark;
      const cx = (lx + 0.5) * S, cy = (ly + 0.5) * S;
      const grd = g.createRadialGradient(cx, cy, S * 0.3, cx, cy, S * v.light);
      grd.addColorStop(0, 'rgba(255,240,150,0.18)');
      grd.addColorStop(0.6, 'rgba(6,10,32,0.25)');
      grd.addColorStop(1, 'rgba(6,10,32,0.7)');
      g.fillStyle = grd;
      g.fillRect(0, 0, cv.width, cv.height);
    }

    v.sparks = v.sparks.filter((p) => p.life > 0);
    v.sparks.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life--;
      g.fillStyle = p.color;
      g.fillRect(p.x, p.y, SCALE * 2, SCALE * 2);
    });
  }
  requestAnimationFrame(draw);

  // ---------- The chapter shelf and the last page ----------

  function showShelf() {
    hush();
    view = null;
    world = null;
    body.innerHTML = '';
    const read = readChapters();
    const shelf = document.createElement('div');
    shelf.className = 'story-shelf';
    CHAPTERS.forEach((ch, c) => {
      const open = c <= read;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'story-book' + (open ? '' : ' locked') + (c === read ? ' next' : '');
      b.disabled = !open;
      if (!open) b.setAttribute('aria-label', tr('world.' + ch.world) + '. ' + tr('story.locked'));
      b.appendChild(thumbnail(c));
      const info = document.createElement('span');
      info.className = 'story-book-info';
      info.innerHTML = '<span class="story-book-title">' + tr('world.' + ch.world) + '</span>' +
        '<span class="story-book-sub">' + tr('story.chapter', { n: c + 1 }) + '</span>' +
        '<span class="story-book-state">' + (c < read ? '✔ ' + tr('story.read') : open ? '▶ ' + tr('story.upNext') : '🔒') + '</span>';
      b.appendChild(info);
      b.addEventListener('click', () => { SND.tap(); openPage(c, 0); });
      shelf.appendChild(b);
    });
    body.appendChild(shelf);
  }

  function showEnd() {
    hush();
    view = null;
    world = null;
    SND.win();
    body.innerHTML = '';
    const end = document.createElement('div');
    end.className = 'story-end';
    end.innerHTML = '<h3>' + tr('story.endTitle') + '</h3><div class="story-stickers"></div><div class="story-stickers friends"></div>' +
      '<button type="button" class="btn big green story-build">★ ' + tr('story.build') + '</button>' +
      '<button type="button" class="btn story-again">↺ ' + tr('story.again') + '</button>';
    PIECE_ORDER.forEach((t) => {
      const s = document.createElement('div');
      s.className = 'story-sticker';
      s.innerHTML = UI.pieceSvg(t) + '<span>' + tr('piece.' + t) + '</span>';
      end.querySelector('.story-stickers').appendChild(s);
    });
    FRIENDS.forEach((n) => {
      const s = document.createElement('div');
      s.className = 'story-sticker';
      s.appendChild(spriteCanvas(n));
      s.insertAdjacentHTML('beforeend', '<span>' + tr('story.friend.' + n) + '</span>');
      end.querySelector('.friends').appendChild(s);
    });
    end.querySelector('.story-build').addEventListener('click', () => { SND.tap(); UI.startTutorial(); });
    end.querySelector('.story-again').addEventListener('click', () => { SND.tap(); showShelf(); });
    body.appendChild(end);
    speak(tr('story.endTitle'));
  }

  // ---------- Getting in and out ----------

  // Read-aloud stays as the player set it. When it is off, Storybook offers it
  // once each time it opens.
  function offerVoice() {
    if (!('speechSynthesis' in window) || UI.voiceOn()) return;
    UI.openModal('<h3>' + tr('story.voiceTitle') + '</h3><p>' + tr('story.voiceText') + '</p>' +
      '<div class="choices col"><button type="button" class="btn big green" data-voice="1"><span class="btn-icon story-voice-icon" aria-hidden="true">🔊</span> ' + tr('story.voiceYes') + '</button>' +
      '<button type="button" class="btn" data-voice="0">' + tr('story.voiceNo') + '</button></div>');
    document.querySelectorAll('[data-voice]').forEach((b) => b.addEventListener('click', () => {
      SND.tap();
      const on = b.dataset.voice === '1';
      UI.closeModal();
      if (on) {
        UI.setVoice(true);
        if (view) speak(view.text);
      }
    }));
  }

  let entered = false;
  document.addEventListener('roversa:screen', (e) => {
    if (e.detail !== 'story') { hush(); return; }
    if (!entered || !view) showShelf();
    entered = true;
    offerVoice();
  });
  $('#story-back').addEventListener('click', () => {
    SND.tap();
    if (view || body.querySelector('.story-end')) showShelf();
    else UI.show('title');
  });

  I18N.onChange(() => {
    if (!$('#screen-story').classList.contains('active')) return;
    if (!view) { if (body.querySelector('.story-end')) showEnd(); else showShelf(); return; }
    renderPage();
    const b = view.page.beats[view.beat];
    if (b) showText(tr(b.say));
    layer();
  });

  // Handy for testing: index.html#story=5 opens page 5, #story=end the last page.
  function openFromHash() {
    const m = /^#story=(\d+|end)$/.exec(location.hash);
    if (!m) return;
    UI.show('story');
    if (m[1] === 'end') { showEnd(); return; }
    const p = ALL_PAGES[Math.max(1, Math.min(ALL_PAGES.length, Number(m[1]))) - 1];
    openPage(p.c, p.i);
  }
  window.addEventListener('hashchange', openFromHash);
  SP.ready.then(openFromHash);
})();
