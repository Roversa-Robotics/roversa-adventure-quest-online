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
  the flag, the chest and the gem wins. One or two players.

Tap the map before pressing GO to guess where Roversa will stop.

## Gamepieces

| Piece | What it does |
| --- | --- |
| Forward | Drive one square ahead |
| Back | Drive one square backward (no turning) |
| Turn left / Turn right | Turn 90 degrees in place |
| Repeat | Do the piece before it again |
| Wild (Dice Quest) | Becomes any arrow you choose |

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

## Credits

Game design: Roversa Adventure Quest by Roversa Robotics LLC, CC BY-NC-SA 4.0.
