# Roversa Adventure Quest (online)

A browser game for all ages, based on the Roversa Adventure Quest classroom game
from [Roversa Robotics](https://roversa.com). Line up Roversa gamepieces to build a
program, press **GO**, and watch the robot drive to every destination.

Works on computers, tablets and phones. No install, no build step: it is plain
HTML, CSS and JavaScript, so GitHub Pages serves it as is.

## Ways to play

- **Adventures**: twelve short levels that introduce one idea at a time
  (Forward, Turn Left and Turn Right, obstacles, Backward, repeat). Earn up to three stars by using the
  fewest pieces. Levels 9 to 12 are 6 x 4 maps based on the printed Roversa mats
  (Duck Duck Robot, I Feel, Grid Challenges and Underwater Adventure).
- **Dice Quest**: the classroom game. Roll the Roversa die five times, arrange all
  five pieces, and run them. Roversa stays where it stops. First robot to visit
  all three treasures wins. One or two players, each picking a robot costume.

Tap the map before pressing GO to guess where Roversa will stop.

## Gamepieces

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

Settings > Pages > Build and deployment > Source: **Deploy from a branch**,
Branch: `main`, folder `/ (root)`.

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
