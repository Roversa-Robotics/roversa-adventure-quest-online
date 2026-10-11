# Roversa Adventure Quest (online)

A browser game for all ages, based on the Roversa Adventure Quest classroom game
from [Roversa Robotics](https://roversa.com). Line up Roversa gamepieces to build a
program, press **GO**, and watch the robot drive to every destination.

Works on computers, tablets and phones. No install, no build step: it is plain
HTML, CSS and JavaScript, so GitHub Pages serves it as is.

## Ways to play

- **Adventures**: eight short levels that introduce one idea at a time
  (forward, turns, obstacles, back, repeat). Earn up to three stars by using the
  fewest pieces.
- **Dice Quest**: the classroom game. Roll the Roversa die five times, arrange all
  five pieces, and run them. Roversa stays where it stops. First robot to visit
  all three treasures wins. One or two players, each picking a robot costume.

Tap the map before pressing GO to guess where Roversa will stop.

## Gamepieces

The pieces match the 3D-printed ones in
[roversa-quest](https://github.com/Roversa-Robotics/roversa-quest), and the Dice
Quest die has the same six faces.

| Piece | Color | What it does |
| --- | --- | --- |
| Up arrow | purple | Drive one square forward |
| Down arrow | yellow | Drive one square backward (no turning) |
| Curved arrows | orange (left), blue (right) | Turn 90 degrees in place |
| Roversa word | red | Repeat the piece before it |
| Roversa logo | green | Wild: becomes any arrow you choose (Dice Quest) |

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

Settings > Pages > Build and deployment > Source: **Deploy from a branch**,
Branch: `main`, folder `/ (root)`.

## Art

The robot, treasures and robot costumes are 8-bit versions of Roversa brand
art. Reduced copies of the originals live in `assets/source/`, and
`python3 tools/pixelate.py` (needs Pillow) rebuilds `assets/sprites/` from them.
The top-down robot is drawn pixel by pixel in that script so the micro:bit and
button pad stay readable. Map tiles (grass, trees, rocks, water) are drawn in
`js/sprites.js`.

## Credits

Game design: Roversa Adventure Quest by Roversa Robotics LLC, CC BY-NC-SA 4.0.
