# Roversa Adventure Quest (online)

A browser game for all ages, based on the Roversa Adventure Quest classroom game
from [Roversa Robotics](https://roversa.com). Line up Roversa puzzle pieces to build a
program, press **GO**, and watch the robot drive to every destination.

**[▶ Play it now](https://roversa-robotics.github.io/roversa-adventure-quest-online/)** at https://roversa-robotics.github.io/roversa-adventure-quest-online/

Works on computers, tablets and phones. No build step: it is plain HTML, CSS
and JavaScript.

## Installing it like an app

The game can be installed with its own Roversa icon and opens full screen:

- **Android and Chromebooks (Chrome)**: tap **Install app** on the title screen,
  or use the browser menu's *Install app* / *Add to Home screen*.
- **iPhone and iPad (Safari)**: tap **Share**, then **Add to Home Screen**. The
  title screen shows this hint until it is closed.

Once installed (or after one visit), it also works offline.

## Ways to play

- **Adventures**: starts with **Meet Roversa**, a guided tutorial where a pointing
  hand shows which end is Roversa's front and how puzzle pieces line up into an
  algorithm. It opens on its own the first time. Then eight short levels introduce
  one idea at a time (Forward, Turn Left and Turn Right, obstacles, Backward,
  repeat); a level with a new puzzle piece shows what it does first. Earn up to
  three stars by using the fewest pieces.
- **Dice Quest**: the classroom game. Roll the Roversa die five times, arrange all
  five pieces, and run them. Roversa stays where it stops. First robot to visit
  all three treasures wins. One or two players, each picking a robot costume.

## Puzzle pieces

The pieces match the 3D-printed ones in
[roversa-quest](https://github.com/Roversa-Robotics/roversa-quest), and the Dice
Quest die has the same six faces.

| Piece | Name | Color | What it does |
| --- | --- | --- | --- |
| Up arrow | Forward | purple | Drive one square forward |
| Down arrow | Backward | yellow | Drive one square backward (no turning) |
| Curved arrows | Turn Left, Turn Right | orange (left), blue (right) | Turn 90 degrees in place |
| Roversa word | Repeat | red | Repeat the piece before it |
| Roversa logo | Wild | green | Becomes any arrow you choose (Dice Quest) |

The game always calls the directions **Forward**, **Backward**, **Turn Left** and
**Turn Right**.

## Running it locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

Shortcuts for testing: `index.html#level=3` opens level 3, `index.html#quest=2`
starts a two-player Dice Quest.

## Adding or changing levels

Levels live in [`js/levels.js`](js/levels.js). Each one is a small text map plus
the pieces the player gets; the key is at the top of the file. After editing, run

```
node tools/check-levels.js
```

to make sure every level can be solved and to see the shortest solution (that
number is what earns three stars).

## Publishing on GitHub Pages

Settings > Pages > Build and deployment > Source: **GitHub Actions**.

Every merge to `main` runs [`.github/workflows/pages.yml`](.github/workflows/pages.yml),
which publishes the game and replaces each `__BUILD__` in the HTML and
JavaScript with the commit id. To publish again by hand: Actions > Deploy to
GitHub Pages > Run workflow.

## Updates and the offline copy

[`sw.js`](sw.js) is a small offline helper (service worker). It loads every
file **from the network first**, so a player who is online always gets the
newest release, and keeps a saved copy only for when there is no connection.

- The build stamp is added to every script, style and image link
  (`?v=<commit>`), so a browser never mixes old and new files, even without
  the helper. This replaces the old "hard refresh to see new text" problem.
- Each release has its own saved copy, and the old one is deleted.
- If an update lands while the game is open, the title screen shows
  **New version! Tap to refresh**. It never interrupts a puzzle.
- **Off switch**: set `OFFLINE = false` in `sw.js` and merge. Each device
  deletes its saved copy and removes the helper the next time it opens the
  game online.

The app icons in `icons/` are built from the robot sprite by
`python3 tools/make-icons.py` (needs Pillow).

## Art

The robot, treasures and robot costumes (octopus, turtle, monkey, tiger, elephant and
manatee) are 8-bit versions of Roversa brand
art. Reduced copies of the originals live in `assets/source/`, and
`python3 tools/pixelate.py` (needs Pillow) rebuilds `assets/sprites/` from them.
The top-down robot is drawn pixel by pixel in that script so the micro:bit and
button pad stay readable. Map tiles (grass, trees, rocks, water) are drawn in
`js/sprites.js`.

Fonts and colors follow the Roversa Brand Guidelines (May 2026): Bevan for
headings, Open Sans for body text and Space Mono for labels, all from Google
Fonts. The pixel font Press Start 2P stays on the title and buttons for the
8-bit look. The brand colors are CSS tokens at the top of `style.css`.

## Credits

Game design: Roversa Adventure Quest by Roversa Robotics LLC, CC BY-NC-SA 4.0.
