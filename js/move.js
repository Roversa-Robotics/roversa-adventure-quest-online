// Telling players about the new address.
//
// The game moved from roversa-robotics.github.io to quest.roversa.com because
// many school networks block GitHub. An installed app stays tied to the
// address it was installed from, so on the old address a note at the top of
// the title screen says where the game is now and how to install it again.
// Saved progress (stars, settings) stays with the old address.
//
// RETIRED = false: the old address still runs the game, and the note can be
//   closed.
// RETIRED = true: visitors in a browser go straight to the new address,
//   keeping the screen they asked for. The installed app shows the note, with
//   no close button, so its players know what to do.
(function (root) {
  'use strict';

  const RETIRED = false;
  const NEW_ORIGIN = 'https://quest.roversa.com';
  const OLD_HOST = 'roversa-robotics.github.io';
  const CLOSED_KEY = 'roversa-moved-note-closed';

  if (location.hostname !== OLD_HOST) return;

  const installed = navigator.standalone === true
    || !!(root.matchMedia && root.matchMedia('(display-mode: standalone)').matches);

  if (RETIRED && !installed) {
    const path = location.pathname.split('/').slice(2).join('/');
    location.replace(NEW_ORIGIN + '/' + path + location.search + location.hash);
    return;
  }

  function showNote() {
    const note = document.getElementById('moved-note');
    if (!note) return;
    let closed = false;
    try { closed = localStorage.getItem(CLOSED_KEY) === '1'; } catch (e) { /* storage blocked */ }
    if (closed && !RETIRED) return;
    const close = document.getElementById('moved-close');
    if (RETIRED) close.hidden = true;
    close.addEventListener('click', () => {
      note.hidden = true;
      try { localStorage.setItem(CLOSED_KEY, '1'); } catch (e) { /* storage blocked */ }
    });
    note.hidden = false;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showNote);
  else showNote();
})(globalThis);
