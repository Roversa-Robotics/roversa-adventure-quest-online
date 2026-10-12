"""Builds the app icons in icons/ from the robot sprite (needs Pillow).

Run from the repo root:  python3 tools/make-icons.py

Each icon is drawn on a small pixel grid and scaled up with nearest-neighbour
so it keeps the 8-bit look at every size.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ROBOT = Image.open(ROOT / 'assets/sprites/robot.png').convert('RGBA')
OUT = ROOT / 'icons'

NAVY = (27, 31, 59, 255)       # --bg
NAVY2 = (38, 43, 82, 255)      # --bg2
YELLOW = (251, 189, 39, 255)   # --brand-yellow
SHADOW = (14, 16, 36, 255)     # --edge


def tile(grid, robot_at, border):
    """grid: size of the pixel grid; robot_at: top-left of the 32px robot."""
    im = Image.new('RGBA', (grid, grid), NAVY)
    # Checkerboard floor, like the map grid.
    for y in range(0, grid, 4):
        for x in range(0, grid, 4):
            if (x // 4 + y // 4) % 2:
                im.paste(NAVY2, (x, y, x + 4, y + 4))
    if border:
        # Stepped yellow frame with rounded 8-bit corners.
        for i in range(grid):
            for j in (1, grid - 2):
                if 3 <= i <= grid - 4:
                    im.putpixel((i, j), YELLOW)
                    im.putpixel((j, i), YELLOW)
        for cx, cy in ((2, 2), (grid - 3, 2), (2, grid - 3), (grid - 3, grid - 3)):
            im.putpixel((cx, cy), YELLOW)
    x, y = robot_at
    shadow = Image.new('RGBA', ROBOT.size, SHADOW)
    shadow.putalpha(ROBOT.getchannel('A'))
    im.alpha_composite(shadow, (x + 1, y + 2))
    im.alpha_composite(ROBOT, (x, y))
    return im


def save(im, name, size):
    im.resize((size, size), Image.NEAREST).save(OUT / name, optimize=True)


def main():
    OUT.mkdir(exist_ok=True)
    plain = tile(44, (6, 5), border=True)       # robot fills about 70%
    safe = tile(56, (12, 11), border=False)     # robot inside the maskable safe zone
    save(plain, 'icon-192.png', 192)
    save(plain, 'icon-512.png', 512)
    # The robot sprite is already 32px, so the favicon is just the robot on navy.
    fav = Image.new('RGBA', ROBOT.size, NAVY)
    fav.alpha_composite(ROBOT)
    fav.save(OUT / 'favicon-32.png', optimize=True)
    save(safe, 'icon-maskable-512.png', 512)
    # iOS adds its own rounded corners and has no transparency, so use the full-bleed tile.
    save(tile(44, (6, 5), border=False), 'apple-touch-icon.png', 180)


if __name__ == '__main__':
    main()
