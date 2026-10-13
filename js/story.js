// Storybook: a picture book for the youngest players. Roversa drives along a
// path through the three worlds, finds each puzzle piece and meets the characters.
// Every line is read aloud, and the child taps the one glowing thing to move on.
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
  // Each chapter is one world. A page has a map (same letters as js/levels.js),
  // where Roversa starts (`robot`: x, y and the way it faces), the characters
  // standing on the map (`items`), the dotted path ahead (`path`), and beats:
  // the steps of the page, in order. Each beat shows `say` (a key in js/i18n.js,
  // read aloud) and waits for one tap:
  //   { tap: 'robot', run: ['F', 'F'] }  tap Roversa, it drives those pieces
  //   { find: { t, x, y } }               a puzzle piece glows on the map; tap it
  //   { piece: 'F', run: ['F'] }           the piece pops up big; tap it and Roversa
  //                                        does `run`, and the piece goes in the pouch
  //   { choice: 'W' }                      Wild: tap any arrow, Roversa does it
  // A beat with none of these ends the page. Beats can also add a speech
  // `bubble` (text key) over the character at `at`, add a `friend` to the pouch,
  // `reveal` a new picture on a square, or turn on Toothie's `light`.
  // Page options: `count` numbers each square Roversa lands on, `dark` dims the
  // map around Toothie, `parade` lists friends who follow Roversa.
  const POND_1 = ['L..V...L', 'S.......', '......L.', 'V..L...V'];
  const POND_2 = ['L.V....L', 'S...V...', '......L.', 'V..L...V'];
  const ISLAND_1 = ['OO..PM.M', 'OS==..fP', 'OO.=...M', 'OOOf.P.f'];
  const ISLAND_2 = ['OO..PM.M', 'OS===K.P', 'OO....fM', 'OOOf.P.f'];
  const ISLAND_3 = ['OOM.P.fM', 'OS=...YP', 'OO====.M', 'OOOf.P.f'];
  const SEA_1 = ['#....*.#', 'S.......', '..%.....', '#...*..#'];
  const SEA_2 = ['#....*.#', '....%...', '..%.....', '#...*..#'];
  const SEA_3 = ['#.*....#', '........', '....%...', '#......#'];

  const CHAPTERS = [
    {
      world: 'pond',
      pages: [
        { map: POND_1, robot: [0, 1, 'E'], path: [[1, 1], [2, 1], [3, 1]], beats: [
          { say: 'story.1.a', tap: 'robot', run: ['L', 'R', 'R', 'L'] },
          { say: 'story.1.b' },
        ] },
        { map: POND_1, robot: [0, 1, 'E'], path: [[2, 1], [3, 1]], beats: [
          { say: 'story.2.a', find: { t: 'F', x: 1, y: 1 } },
          { say: 'story.2.b', piece: 'F', run: ['F'] },
          { say: 'story.2.c' },
        ] },
        { map: POND_2, robot: [1, 1, 'E'], path: [[2, 1], [3, 1]], beats: [
          { say: 'story.drive', tap: 'robot', run: ['F', 'F'] },
          { say: 'story.3.b', find: { t: 'L', x: 3, y: 0 } },
          { say: 'story.3.c', piece: 'L', run: ['L'] },
          { say: 'story.3.d' },
        ] },
        { map: POND_2, robot: [3, 1, 'N'], path: [[3, 0], [4, 0], [5, 0]], items: [[6, 0, 'duck']], beats: [
          { say: 'story.drive', tap: 'robot', run: ['F'] },
          { say: 'story.4.b', find: { t: 'R', x: 4, y: 0 } },
          { say: 'story.4.c', piece: 'R', run: ['R'] },
          { say: 'story.4.d' },
        ] },
        { map: POND_2, robot: [3, 0, 'E'], path: [[4, 0], [5, 0]], items: [[6, 0, 'duck']], beats: [
          { say: 'story.5.a', tap: 'robot', run: ['F', 'F'] },
          { say: 'story.5.b', bubble: 'story.5.bubble', at: [6, 0], friend: 'duck' },
        ] },
      ],
    },
    {
      world: 'island',
      pages: [
        { map: ISLAND_1, robot: [1, 1, 'E'], path: [[2, 1], [3, 1]], items: [[2, 2, 'duck']], beats: [
          { say: 'story.6.a', tap: 'robot', run: ['F', 'F'] },
          { say: 'story.6.b' },
        ] },
        { map: ISLAND_2, robot: [3, 1, 'E'], path: [[4, 1]], beats: [
          { say: 'story.drive', tap: 'robot', run: ['F'] },
          { say: 'story.7.b', bubble: 'story.7.bubble', at: [5, 1], find: { t: 'B', x: 3, y: 1 } },
          { say: 'story.7.c', piece: 'B', run: ['B'] },
          { say: 'story.7.d', friend: 'pirate' },
        ] },
        { map: ISLAND_3, robot: [2, 2, 'E'], path: [[3, 2], [4, 2]], count: true, beats: [
          { say: 'story.drive', tap: 'robot', run: ['F'] },
          { say: 'story.8.b', bubble: 'story.8.bubble', at: [6, 1], find: { t: 'P', x: 4, y: 1 } },
          { say: 'story.8.c', piece: 'P', run: ['F'] },
          { say: 'story.8.d', friend: 'byteclaw' },
        ] },
        { map: ISLAND_3, robot: [4, 2, 'E'], path: [[5, 2]], items: [[6, 2, 'x']], beats: [
          { say: 'story.drive', tap: 'robot', run: ['F'] },
          { say: 'story.9.b', reveal: [6, 2, 'chest'] },
        ] },
      ],
    },
    {
      world: 'sea',
      pages: [
        { map: SEA_1, robot: [0, 1, 'E'], path: [[1, 1], [2, 1]], items: [[3, 1, 'octopus']], beats: [
          { say: 'story.10.a', tap: 'robot', run: ['F', 'F'] },
          { say: 'story.10.b', bubble: 'story.10.bubble', at: [3, 1], friend: 'octopus' },
        ] },
        { map: SEA_1, robot: [2, 1, 'E'], items: [[3, 0, 'octopus']], beats: [
          { say: 'story.11.a', find: { t: 'W', x: 3, y: 1 } },
          { say: 'story.11.b', choice: 'W' },
        ] },
        { map: SEA_2, robot: [2, 2, 'E'], path: [[3, 2]], items: [[4, 2, 'toothie'], [7, 2, 'sunken']], dark: [4, 2], beats: [
          { say: 'story.12.a', tap: 'robot', run: ['F'] },
          { say: 'story.12.b', bubble: 'story.12.bubble', at: [4, 2], friend: 'toothie', light: true },
        ] },
        { map: SEA_3, robot: [2, 1, 'E'], path: [[3, 1], [4, 1], [5, 1], [6, 1]], parade: ['duck', 'pirate', 'byteclaw', 'octopus', 'toothie'], beats: [
          { say: 'story.13.a', tap: 'robot', run: ['F', 'F', 'F', 'F'] },
          { say: 'story.13.b' },
        ] },
      ],
    },
  ];

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

  // The map background for a page: the world's tiles, plus characters that stand on a square.
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

  // A small still picture of a page, for the chapter shelf.
  function thumbnail(c) {
    const page = CHAPTERS[c].pages[0];
    const bg = background(CHAPTERS[c].world, page.map);
    const g = bg.getContext('2d');
    const [x, y, d] = page.robot;
    g.save();
    g.translate((x + 0.5) * S, (y + 0.5) * S);
    g.rotate(DIRS[d] * Math.PI / 2);
    g.drawImage(robotSprite, -S / 2, -S / 2, S, S);
    g.restore();
    (page.items || []).forEach(([ix, iy, s]) => g.drawImage(PICS[s], ix * S, iy * S, S, S));
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
  // Storybook reads every line unless read-aloud was turned off. Each word lights
  // up as it is spoken, where the browser says which word it is on.

  let speechId = 0;
  function speak(text, force) {
    const words = $('#story-text') ? [...$('#story-text').querySelectorAll('.w')] : [];
    words.forEach((w) => w.classList.remove('on'));
    if (!('speechSynthesis' in window) || (!force && !UI.voiceOn())) return;
    const id = ++speechId;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9;
      u.lang = I18N.speechLang;
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

  // ---------- Reading a page ----------

  const DIRS = { N: 0, E: 1, S: 2, W: 3 };
  const DX = [0, 1, 0, -1];
  const DY = [-1, 0, 1, 0];
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

  let view = null; // the page being read: { c, i, page, ... }

  function openPage(c, i) {
    hush();
    const page = CHAPTERS[c].pages[i];
    const [x, y, d] = page.robot;
    view = {
      c, i, page, token: {},
      bg: background(CHAPTERS[c].world, page.map),
      robot: { x, y, dir: DIRS[d], rx: x, ry: y, ang: DIRS[d] * Math.PI / 2 },
      items: (page.items || []).map(([ix, iy, s]) => ({ x: ix, y: iy, s })),
      visited: [], nums: [], bubbles: [], sparks: [],
      mapPiece: null,
      light: page.dark ? 2.6 : 0,
      beat: -1, done: false, got: { pieces: [], friends: [] }, text: '',
    };
    renderPage();
    nextBeat();
  }

  function renderPage() {
    const { c, i } = view;
    const chap = CHAPTERS[c];
    body.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'story-page';
    el.innerHTML =
      '<p class="story-chapter">' + tr('story.chapter', { n: c + 1 }) + ' · ' + tr('world.' + chap.world) + '</p>' +
      '<button type="button" class="icon-btn story-prev" aria-label="' + tr('story.prev') + '">◀</button>' +
      '<div class="story-map"><canvas id="story-canvas" role="img"></canvas><div class="story-layer"></div></div>' +
      '<button type="button" class="icon-btn story-next" aria-label="' + tr('story.next') + '">▶</button>' +
      '<div class="story-say"><button type="button" class="story-replay" aria-label="' + tr('story.replay') + '">🔊</button>' +
      '<p id="story-text" aria-live="polite"></p></div>' +
      '<div class="story-pouch"><p class="story-pouch-label">' + tr('story.pouch') + '</p><div class="story-pouch-row"></div></div>' +
      '<p class="story-dots" aria-label="' + pageNumber(c, i) + ' / ' + ALL_PAGES.length + '">' +
      chap.pages.map((_, k) => '<span class="' + (k === i ? 'on' : '') + '"></span>').join('') + '</p>';
    body.appendChild(el);
    const cv = el.querySelector('canvas');
    cv.width = view.bg.width;
    cv.height = view.bg.height;
    el.querySelector('.story-map').style.setProperty('--cols', view.page.map[0].length);
    el.querySelector('.story-map').style.setProperty('--rows', view.page.map.length);
    el.querySelector('.story-prev').addEventListener('click', () => { SND.tap(); goPrev(); });
    el.querySelector('.story-next').addEventListener('click', () => { if (canGoOn()) { SND.tap(); goNext(); } });
    el.querySelector('.story-replay').addEventListener('click', () => { SND.tap(); speak(view.text, true); });
    swipe(el);
    showText(view.text);
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

  const canGoOn = () => view && (view.done || readChapters() > view.c);
  function syncNext() {
    const b = body.querySelector('.story-next');
    if (!b) return;
    b.disabled = !canGoOn();
    b.classList.toggle('ready', view.done);
  }

  function goNext() {
    const { c, i } = view;
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
      syncNext();
      layer();
      return;
    }
    showText(tr(b.say));
    if (b.bubble) v.bubbles.push({ x: b.at[0], y: b.at[1], key: b.bubble });
    if (b.friend) { v.got.friends.push(b.friend); renderPouch(); SND.goal(); burst(b.at || [v.robot.x, v.robot.y]); }
    if (b.reveal) {
      const [x, y, s] = b.reveal;
      v.items = v.items.filter((it) => it.x !== x || it.y !== y).concat([{ x, y, s }]);
      SND.goal();
      burst([x, y]);
    }
    if (b.light) tween(900, (k) => { v.light = 2.6 + k * 3.5; });
    if (b.find) v.mapPiece = b.find;
    speak(v.text);
    const interactive = b.tap || b.find || b.piece || b.choice;
    if (!interactive) {
      v.done = true;
      syncNext();
    }
    layer();
  }

  async function act(fn) {
    const v = view;
    v.busy = true;
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
    const cols = v.page.map[0].length, rows = v.page.map.length;
    const place = (node, x, y) => { node.style.left = (x / cols) * 100 + '%'; node.style.top = (y / rows) * 100 + '%'; el.appendChild(node); return node; };
    v.bubbles.forEach((bb) => place(Object.assign(document.createElement('div'), { className: 'story-bubble', textContent: tr(bb.key) }), bb.x + 0.5, bb.y));
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
    if (b.tap === 'robot') {
      hit(v.robot.x, v.robot.y, tr('story.tapRobot'), () => { SND.tap(); act(() => run(b.run)); });
    } else if (b.find) {
      hit(b.find.x, b.find.y, tr('story.tapPiece', { name: tr('piece.' + b.find.t) }), () => {
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
          await run(b.run);
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
            await run([t]);
            v.got.pieces.push(b.choice);
            renderPouch();
            SND.drop();
            await sleep(400);
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

  // Roversa does each puzzle piece in turn.
  async function run(moves) {
    const v = view;
    for (const m of moves) {
      if (view !== v) return;
      const r = v.robot;
      if (m === 'F' || m === 'B') {
        const s = m === 'F' ? 1 : -1;
        const fx = r.x, fy = r.y;
        r.x += DX[r.dir] * s;
        r.y += DY[r.dir] * s;
        SND.move();
        await tween(MOVE_MS, (k) => { r.rx = fx + (r.x - fx) * k; r.ry = fy + (r.y - fy) * k; });
        v.visited.push([r.x, r.y]);
        if (v.page.count) v.nums.push({ x: r.x, y: r.y, n: v.nums.length + 1 });
      } else {
        const s = m === 'R' ? 1 : -1;
        const from = r.ang;
        r.dir = (r.dir + s + 4) % 4;
        SND.turn();
        await tween(TURN_MS, (k) => { r.ang = from + (s * Math.PI / 2) * k; });
      }
      await sleep(120);
    }
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
    if (!v || !cv || !$('#screen-story').classList.contains('active')) return;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(v.bg, 0, 0);

    // The dotted path: white ahead, yellow where Roversa has been.
    const dots = (x, y, color) => {
      g.fillStyle = color;
      [-1, 0, 1].forEach((k) => g.fillRect((x + 0.5) * S + k * SCALE * 4 - SCALE, (y + 0.5) * S - SCALE, SCALE * 2, SCALE * 2));
    };
    (v.page.path || []).forEach(([x, y]) => { if (!v.visited.some((p) => p[0] === x && p[1] === y)) dots(x, y, 'rgba(255,255,255,0.8)'); });
    v.visited.forEach(([x, y]) => dots(x, y, '#fbbd27'));
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

    // Friends in the parade follow along behind Roversa.
    const r = v.robot;
    (v.page.parade || []).forEach((n, k) => g.drawImage(PICS[n], (r.rx - k - 1) * S, r.ry * S + Math.round(Math.sin(now / 150 + k) * 1.5) * SCALE, S, S));

    g.save();
    g.translate((r.rx + 0.5) * S, (r.ry + 0.5) * S);
    g.rotate(r.ang);
    g.drawImage(robotSprite, -S / 2, -S / 2, S, S);
    g.restore();

    // Numbered squares (Repeat page): a small badge in the corner of each square Roversa landed on.
    v.nums.forEach((n) => {
      const cx = (n.x + 0.78) * S, cy = (n.y + 0.78) * S;
      g.fillStyle = '#14172e';
      g.beginPath(); g.arc(cx, cy, S * 0.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fbbd27';
      g.beginPath(); g.arc(cx, cy, S * 0.16, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#14172e';
      g.font = Math.round(S * 0.18) + 'px "Press Start 2P", monospace';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(n.n), cx + 1, cy + 2);
    });

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

  let entered = false;
  document.addEventListener('roversa:screen', (e) => {
    if (e.detail !== 'story') { hush(); return; }
    // Read aloud starts on for the storybook, unless it was turned off before.
    let choice = null;
    try { choice = localStorage.getItem('roversa-voice'); } catch (err) { /* storage blocked */ }
    if (choice === null && 'speechSynthesis' in window) UI.setVoice(true);
    if (!entered || !view) showShelf();
    entered = true;
  });
  $('#story-back').addEventListener('click', () => {
    SND.tap();
    if (view || body.querySelector('.story-end')) showShelf();
    else UI.show('title');
  });

  I18N.onChange(() => {
    if (!$('#screen-story').classList.contains('active')) return;
    if (!view) { if (body.querySelector('.story-end')) showEnd(); else showShelf(); return; }
    const b = view.page.beats[view.beat];
    if (b) showText(tr(b.say));
    renderPage();
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
