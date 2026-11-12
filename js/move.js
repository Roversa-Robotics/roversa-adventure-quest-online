// Sending players to the new address.
//
// The game moved from roversa-robotics.github.io to quest.roversa.com because
// many school networks block GitHub. On the old address:
// - In a browser, visitors go straight to the new address, keeping the screen
//   they asked for (for example #roversa-robot).
// - An installed app stays tied to the address it was installed from, so it
//   can't just move. It shows a note at the top of the title screen saying
//   where the game is now and to install it again from there.
// Saved progress (stars, settings) stays with the old address.
(function (root) {
  'use strict';

  const NEW_ORIGIN = 'https://quest.roversa.com';
  const OLD_HOST = 'roversa-robotics.github.io';

  if (location.hostname !== OLD_HOST) return;

  const installed = navigator.standalone === true
    || !!(root.matchMedia && root.matchMedia('(display-mode: standalone)').matches);

  if (!installed) {
    const path = location.pathname.split('/').slice(2).join('/');
    location.replace(NEW_ORIGIN + '/' + path + location.search + location.hash);
    return;
  }

  function showNote() {
    const note = document.getElementById('moved-note');
    if (note) note.hidden = false;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showNote);
  else showNote();
})(globalThis);
