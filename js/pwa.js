// Installing the game as an app, and keeping it up to date.
// - Starts the offline helper (sw.js).
// - Shows "New version! Tap to refresh" on the title screen when an update
//   arrives while the game is open. It never interrupts a puzzle.
// - Shows an "Install app" button where the browser supports it (Android,
//   desktop Chrome and Edge), and a short how-to on iPhone and iPad.
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const banner = $('#update-banner');
  const installBtn = $('#btn-install');
  const iosHint = $('#ios-install');
  const HINT_KEY = 'roversa-ios-hint-closed';

  // ---------- Updates ----------

  const sw = 'serviceWorker' in navigator ? navigator.serviceWorker : null;
  let registration = null;
  let lastCheck = 0;

  function checkForUpdate() {
    if (!registration || Date.now() - lastCheck < 60 * 1000) return;
    lastCheck = Date.now();
    registration.update().catch(() => {});
  }

  // Files loaded before the helper took over (the first visit) are handed to
  // it so the game also works offline after one visit.
  function saveLoadedFiles() {
    const target = sw && sw.controller;
    if (!target) return;
    const urls = [location.href.split('#')[0]].concat(
      performance.getEntriesByType('resource').map((e) => e.name));
    target.postMessage({ type: 'cache-urls', urls });
  }

  if (sw && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    let hadHelper = !!sw.controller;
    sw.addEventListener('controllerchange', () => {
      if (hadHelper) {
        // A new release took over while this page was open.
        banner.hidden = false;
      } else {
        hadHelper = true;
        saveLoadedFiles();
      }
    });
    window.addEventListener('load', () => {
      sw.register('sw.js', { updateViaCache: 'none' })
        .then((reg) => { registration = reg; saveLoadedFiles(); })
        .catch(() => { /* not supported here (for example a preview page) */ });
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
    document.addEventListener('roversa:screen', (e) => { if (e.detail === 'title') checkForUpdate(); });
    setInterval(checkForUpdate, 15 * 60 * 1000);
  }

  banner.addEventListener('click', () => location.reload());

  // ---------- Install ----------

  const standalone = navigator.standalone === true
    || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  let installPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    installBtn.hidden = false;
  });
  installBtn.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => {});
    installPrompt = null;
    installBtn.hidden = true;
  });
  window.addEventListener('appinstalled', () => { installBtn.hidden = true; });

  // iPhone and iPad have no install prompt, so explain the Share menu instead.
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let hintClosed = false;
  try { hintClosed = localStorage.getItem(HINT_KEY) === '1'; } catch (e) { /* storage blocked */ }
  if (ios && !standalone && !hintClosed) iosHint.hidden = false;
  $('#ios-install-close').addEventListener('click', () => {
    iosHint.hidden = true;
    try { localStorage.setItem(HINT_KEY, '1'); } catch (e) { /* storage blocked */ }
  });
})();
