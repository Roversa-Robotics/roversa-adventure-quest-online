// Moving players from the old address to the new one.
//
// The game moved from roversa-robotics.github.io to play.roversa.com because
// many school networks block GitHub. Saved progress (stars, costume, language,
// sound) is kept per address, and an installed app stays tied to the address
// it was installed from, so on the old address a note offers to move: its
// button opens play.roversa.com with the progress in the link (after the #, so
// it never reaches a server), and the new address saves it on arrival.
//
// RETIRED = false: the old address still runs the game and shows a note that
//   can be closed.
// RETIRED = true: the old address sends new visitors straight to the new one,
//   and players with saved progress (or the installed app) get a note that
//   stays, so they can bring their progress along.
//
// Loaded before every other script, so carried progress is saved before the
// game reads it.
(function (root) {
  'use strict';

  const RETIRED = false;
  const NEW_ORIGIN = 'https://play.roversa.com';
  const OLD_HOST = 'roversa-robotics.github.io';
  const CARRY = '#carry=';
  const CLOSED_KEY = 'roversa-moved-note-closed';
  // Not worth carrying: which algorithm a level showed first last time, a
  // game on several devices that was in progress, and this note's own state.
  const SKIP = ['roversa-guess-first-', 'roversa-net-game', CLOSED_KEY];

  function savedKeys() {
    try {
      return Object.keys(localStorage).filter((k) => k.startsWith('roversa-') && !SKIP.some((s) => k.startsWith(s)));
    } catch (e) { return []; }
  }

  function encode(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(text) {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  }

  // The new address, carrying this device's saved progress.
  function carryUrl() {
    const data = {};
    savedKeys().forEach((k) => { try { data[k] = localStorage.getItem(k); } catch (e) { /* storage blocked */ } });
    return NEW_ORIGIN + '/' + (Object.keys(data).length ? CARRY + encode(data) : '');
  }

  // Best of both for stars and solved counts; anything else is only filled in
  // where this address has nothing yet, so it never undoes a newer choice.
  function mergeBest(oldJson, newJson) {
    let a = {};
    let b = {};
    try { a = JSON.parse(oldJson) || {}; } catch (e) { /* ignore */ }
    try { b = JSON.parse(newJson) || {}; } catch (e) { /* ignore */ }
    Object.keys(b).forEach((k) => { if (!(Number(a[k]) >= Number(b[k]))) a[k] = b[k]; });
    return JSON.stringify(a);
  }

  function receive() {
    if (!location.hash.startsWith(CARRY)) return;
    try {
      const data = decode(location.hash.slice(CARRY.length));
      Object.keys(data).forEach((k) => {
        if (!k.startsWith('roversa-') || typeof data[k] !== 'string') return;
        const here = localStorage.getItem(k);
        if (k === 'roversa-stars' || k === 'roversa-random-solved') localStorage.setItem(k, mergeBest(here, data[k]));
        else if (here === null) localStorage.setItem(k, data[k]);
      });
    } catch (e) { /* a broken link or storage blocked: start as usual */ }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* not allowed here */ }
  }

  const onOldHost = location.hostname === OLD_HOST;
  const installed = navigator.standalone === true
    || !!(root.matchMedia && root.matchMedia('(display-mode: standalone)').matches);

  receive();

  // Once retired, a visitor with nothing saved just goes to the new address,
  // keeping the screen they asked for.
  if (onOldHost && RETIRED && !installed && !savedKeys().length) {
    const path = location.pathname.split('/').slice(2).join('/');
    location.replace(NEW_ORIGIN + '/' + path + location.search + location.hash);
    return;
  }

  function showNote() {
    const note = document.getElementById('moved-note');
    if (!note || !onOldHost) return;
    let closed = false;
    try { closed = localStorage.getItem(CLOSED_KEY) === '1'; } catch (e) { /* storage blocked */ }
    if (closed && !RETIRED) return;
    const go = document.getElementById('moved-go');
    const close = document.getElementById('moved-close');
    // Built when tapped, so it carries the latest progress.
    go.addEventListener('click', (ev) => { go.href = carryUrl(); if (installed) { ev.preventDefault(); root.open(go.href, '_blank', 'noopener'); } });
    if (RETIRED) close.hidden = true;
    close.addEventListener('click', () => {
      note.hidden = true;
      try { localStorage.setItem(CLOSED_KEY, '1'); } catch (e) { /* storage blocked */ }
    });
    note.hidden = false;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showNote);
  else showNote();

  root.RoversaMove = { carryUrl, RETIRED };
})(globalThis);
