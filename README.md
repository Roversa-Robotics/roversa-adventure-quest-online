# Roversa Adventure Quest (online)

A browser game for all ages, based on the Roversa Adventure Quest classroom game
from [Roversa Robotics](https://roversa.com). Line up Roversa puzzle pieces to build an
algorithm, press **GO**, and watch the robot drive to every destination.

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
  algorithm. It opens on its own the first time. Then ten short levels introduce
  one idea at a time (Forward, Turn Left and Turn Right, obstacles, Backward,
  repeat, Wild); a level with a new puzzle piece shows what it does first. If an
  algorithm misses, Roversa shows where it stopped, then goes back to the start,
  where every GO begins. Earn up to three stars by using the fewest pieces.
- **Dice Quest**: the classroom game. Roll the Roversa die five times, arrange all
  five pieces, and run them. Roversa stays where it stops. First robot to visit
  all three treasures wins. One or two players on one device (or against the AI
  Opponent), each picking a robot costume, or 2 to 4 players on their own
  devices (see below).

## Playing on several devices

**Play on 2-4 devices** (on the Dice Quest screen) lets each player use their own
tablet, phone or computer. One player starts a game and gets a code made of 4
pictures; the others tap **Join a game** and tap the same pictures. Everyone picks
a robot, the first player presses **Start**, and each device shows the other
players' rolls, algorithms and runs as they happen.

How it works:

- The game itself stays on GitHub Pages. Only tiny moves travel between devices
  (the map, each roll, each algorithm), through a small relay on Cloudflare
  ([`relay/`](relay/)): a Worker, plus one Durable Object per game that keeps the
  game's moves so a device that drops can catch up. Every device plays the moves
  out with the same rules ([`js/engine.js`](js/engine.js)).
- Nothing about players is stored: no names, no accounts, no logs. A game is
  deleted 10 minutes after its last device leaves, after 15 minutes if nobody
  starts it, after 20 minutes with no moves, and after 3 hours at most.
- Nothing else in the game uses the relay. If it can't be reached, Adventures,
  Dice Quest on one device and the AI Opponent work as usual; only the
  2-4 devices screens say "Can't connect". The button stays hidden until a
  relay is set up.
- [`js/net.js`](js/net.js) has `VERSION`. Bump it whenever the messages between
  devices change: a device on an older version is asked to update before
  joining, and games already running are not affected.
- Players who drop are skipped after a minute until they come back. A player
  idle for 2 minutes on their own turn is asked "Are you still there?".

### Setting up the relay (once)

All on Cloudflare's free plan, with no credit card:

1. Create a free Cloudflare account (a shared Roversa email is best, with
   two-factor sign-in) and pick a `workers.dev` name when asked.
2. Create an API token from the **Edit Cloudflare Workers** template.
3. In this repository, Settings > Secrets and variables > Actions:
   - Secrets: `CLOUDFLARE_API_TOKEN` (the token) and `CLOUDFLARE_ACCOUNT_ID`
     (from the Cloudflare dashboard).
   - Variables: `RELAY_URL`, the relay's address, like
     `https://roversa-quest-relay.<your-name>.workers.dev`.
4. Run Actions > **Dice Quest relay** > Run workflow (it also runs on every merge
   that changes `relay/`), then Actions > **Deploy to GitHub Pages** > Run
   workflow, so the game picks up `RELAY_URL`.

[`relay/wrangler.toml`](relay/wrangler.toml) lists the pages allowed to open
games (`ALLOWED_ORIGINS`); add a new address there if the game moves.

### Testing it

- `node tools/check-relay.js` checks the relay's rules.
- `index.html?relay=local` plays with no relay at all: open the game in two or
  more tabs of one browser, start a game in one tab and join it from the others.
  The tab that started the game runs it, so closing that tab ends it.
- To run the real relay on a computer, `npx wrangler dev` in `relay/` (port 8787),
  serve the game on port 8000 (above), and open
  `http://localhost:8000/?relay=http://localhost:8787`.

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
| Roversa logo | Wild | green | Becomes any arrow you choose |

The game always calls the directions **Forward**, **Backward**, **Turn Left** and
**Turn Right**.

## Running it locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

Shortcuts for testing: `index.html#level=3` opens level 3, `index.html#quest=2`
starts a two-player Dice Quest, and `index.html?relay=local` turns on
**Play on 2-4 devices** between tabs of one browser.

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
