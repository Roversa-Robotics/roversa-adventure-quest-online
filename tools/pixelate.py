#!/usr/bin/env python3
"""Turns the Roversa brand art in assets/source/ into small 8-bit style sprites
in assets/sprites/. Needs Pillow (python3 -m pip install pillow).

Usage: python3 tools/pixelate.py

Each sprite is: background removed, cropped, shrunk to a small pixel size,
reduced to a few colors, with hard (on/off) transparency. The game draws them
scaled up with smoothing turned off, which gives the chunky look.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'source'
OUT = ROOT / 'assets' / 'sprites'

# The character drawings carry a small "Roversa" label; these boxes (in each
# drawing's own pixels) cover it, and it is painted over with the color around
# it before shrinking.
BADGES = {
    'char-octopus.png': (838, 893, 962, 937),
    'char-turtle.png': (720, 1205, 915, 1258),
    'char-monkey.png': (188, 238, 272, 270),
    'char-tiger.png': (245, 422, 352, 456),
    'char-elephant.png': (170, 372, 285, 410),
    'char-manatee.png': (357, 310, 440, 333),
    'goal-duck.png': (1930, 1790, 2275, 2390),
    'char-toothie.png': (935, 1180, 1085, 1240),
}

# Optional crops (in the assets/source/ copies) applied before shrinking, so a
# small detail fills more of the sprite. The coins keep the parrot and the stack
# it stands on, because the whole pile hides the parrot at 32 pixels.
CROPS = {
    'treasure-coins.png': (0, 0, 268, 305),
}

# name: (source, size in pixels, colors, punch)
# punch > 1 boosts color and contrast so small details survive shrinking.
SPRITES = {
    'treasure-chest.png': ('treasure-chest.png', 32, 32),
    'treasure-bags.png': ('treasure-bags.png', 32, 32),
    'treasure-coins.png': ('treasure-coins.png', 32, 48, 1.35),
    'char-octopus.png': ('char-octopus.png', 32, 16, 1.3),
    'char-turtle.png': ('char-turtle.png', 32, 16, 1.3),
    'char-monkey.png': ('char-monkey.png', 32, 16, 1.3),
    'char-tiger.png': ('char-tiger.png', 32, 16, 1.3),
    'char-elephant.png': ('char-elephant.png', 32, 16, 1.3),
    'char-manatee.png': ('char-manatee.png', 32, 16, 1.3),
    # Adventure world characters (issue #17).
    'goal-duck.png': ('goal-duck.png', 32, 24, 1.3),
    'char-byteclaw.png': ('char-byteclaw.png', 32, 16, 1.3),
    'char-captain.png': ('char-captain.png', 32, 16, 1.3),
    'char-toothie.png': ('char-toothie.png', 32, 32),
}

# Toothie's eye and teeth turn to mush at 32 pixels, so after shrinking its
# colors are snapped to the drawing's flat palette and those parts are redrawn
# by hand. Key: # black, g green, m magenta, w cream, . gray, d dark gray.
TOOTHIE_PALETTE = [(0, 0, 0), (126, 196, 56), (160, 0, 96), (214, 0, 138), (255, 247, 232), (150, 150, 150)]
TOOTHIE_PATCHES = [
    (18, 0, [
        '  ####  ',
        ' #mmmm# ',
        '#wwwwww#',
        '#ww##ww#',
        '#ww##ww#',
        ' #wwww# ',
        '  ####  ',
    ]),
    (9, 9, [
        'ggg#######ggg',
        'g##wwwwwww##g',
        '#wwwwwwwwwww#',
        '#w.w.w.w.w.w#',
        '#.d.d.d.d.d.#',
        '#..d..d..d..#',
        '#d.w.d.w.d.w#',
        '#ww.ww.ww.ww#',
        'g###########g',
    ]),
]
PATCH_COLORS = {'#': (0, 0, 0, 255), 'g': (126, 196, 56, 255), 'm': (160, 0, 96, 255), 'w': (255, 247, 232, 255),
                '.': (150, 150, 150, 255), 'd': (90, 90, 90, 255)}


def touch_up_toothie(im):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a:
                near = min(TOOTHIE_PALETTE, key=lambda p: (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2)
                px[x, y] = near + (255,)
    for x0, y0, rows in TOOTHIE_PATCHES:
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                px[x0 + i, y0 + j] = PATCH_COLORS[ch] if ch != ' ' else (0, 0, 0, 0)
    return im


def remove_badge(im, box):
    x0, y0, x1, y1 = box
    # The badge color is the most common color just outside the box's left and right edges.
    samples = [im.getpixel((x, y)) for y in range(y0, y1) for x in (max(0, x0 - 4), min(im.width - 1, x1 + 4))]
    samples = [p for p in samples if p[3] and sum(p[:3]) > 90]  # skip outlines and see-through edges
    color = max(set(samples), key=samples.count) if samples else (255, 255, 255, 255)
    ImageDraw.Draw(im).rectangle((x0, y0, x1, y1), fill=color)
    return im


def white_to_transparent(im):
    """Flood-fills the white paper background from the corners, leaving white eyes alone."""
    im = im.convert('RGBA')
    marker = (255, 0, 255, 0)
    for corner in [(0, 0), (im.width - 1, 0), (0, im.height - 1), (im.width - 1, im.height - 1)]:
        if sum(im.getpixel(corner)[:3]) > 700:
            ImageDraw.floodfill(im, corner, marker, thresh=40)
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y] == marker:
                px[x, y] = (0, 0, 0, 0)
    return im


def pixelate(im, size, colors):
    im = im.crop(im.getbbox())
    ratio = size / max(im.size)
    w, h = max(1, round(im.width * ratio)), max(1, round(im.height * ratio))
    small = im.resize((w, h), Image.LANCZOS)
    alpha = small.getchannel('A').point(lambda a: 255 if a >= 110 else 0)
    rgb = Image.new('RGB', small.size, (0, 0, 0))
    rgb.paste(small, mask=small.getchannel('A'))
    rgb = rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    sprite = rgb.convert('RGBA')
    sprite.putalpha(alpha)
    out.paste(sprite, ((size - w) // 2, size - h), sprite)
    return out


def add_outline(im, color):
    """Adds a one-pixel dark edge so a sprite stands out from the grass."""
    out = im.copy()
    src, dst = im.load(), out.load()
    for y in range(im.height):
        for x in range(im.width):
            if src[x, y][3]:
                continue
            near = [(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            if any(0 <= nx < im.width and 0 <= ny < im.height and src[nx, ny][3] for nx, ny in near):
                dst[x, y] = color
    return out


def draw_robot():
    """The top-down robot is drawn pixel by pixel from assets/source/robot-top.png,
    because shrinking the drawing loses the micro:bit and the button pad."""
    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    outline, wheel, tread = '#141414', '#3b3b3e', '#626268'
    # Wheels, front half.
    for x0 in (0, 29):
        d.rectangle((x0, 1, x0 + 2, 13), fill=wheel, outline=outline)
        for y in range(3, 13, 2):
            d.line((x0 + 1, y, x0 + 1, y), fill=tread)
    # micro:bit: black board, green edges, yellow corner stripes, 5x5 LEDs, A and B buttons.
    d.rectangle((3, 0, 28, 13), fill='#202226', outline=outline)
    d.rectangle((4, 1, 5, 12), fill='#1f8f3e')
    d.rectangle((26, 1, 27, 12), fill='#1f8f3e')
    for i, y in enumerate((1, 2)):
        d.line((6, y, 9 - i * 2, y), fill='#f2c230')
    d.rectangle((14, 1, 17, 2), outline='#c9ccd1')
    for x in range(11, 21, 2):
        for y in range(4, 12, 2):
            d.point((x, y), fill='#8b9099')
    d.point((7, 7), fill='#c9ccd1')
    d.point((24, 7), fill='#c9ccd1')
    # Wooden body with the button pad.
    d.rectangle((3, 13, 28, 31), fill='#e6c48d', outline=outline)
    d.line((4, 14, 27, 14), fill='#c79a5f')
    buttons = [
        ((14, 16), '#8e43c6'),  # forward
        ((9, 20), '#124eaf'),   # turn left
        ((19, 20), '#f56a00'),  # turn right
        ((14, 23), '#fbbd27'),  # back
        ((8, 27), '#ff3633'),   # stop
        ((14, 27), '#17c065'),  # go
        ((20, 27), '#9a9aa0'),  # menu
    ]
    for (x, y), color in buttons:
        d.rectangle((x, y, x + 3, y + 2), fill=color)
        d.point((x + 1, y + 1), fill='#ffffff')
        d.point((x + 2, y + 1), fill='#ffffff')
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    draw_robot().save(OUT / 'robot.png')
    print('wrote', (OUT / 'robot.png').relative_to(ROOT))
    for name, (source, size, colors, *rest) in SPRITES.items():
        im = Image.open(SRC / source).convert('RGBA')
        if source in CROPS:
            im = im.crop(CROPS[source])
        punch = rest[0] if rest else 1
        if punch != 1:
            alpha = im.getchannel('A')
            im = ImageEnhance.Contrast(ImageEnhance.Color(im.convert('RGB')).enhance(punch)).enhance(1 + (punch - 1) / 2).convert('RGBA')
            im.putalpha(alpha)
        if source in BADGES:
            im = remove_badge(im, BADGES[source])
        if im.getpixel((0, 0))[3] == 255:
            im = white_to_transparent(im)
        sprite = pixelate(im, size, colors)
        if name.startswith('treasure'):
            sprite = add_outline(sprite, (42, 26, 14, 255))
        if name == 'goal-duck.png':
            sprite = add_outline(sprite, (20, 20, 20, 255))
        if name == 'char-toothie.png':
            sprite = touch_up_toothie(sprite)
        sprite.save(OUT / name)
        print('wrote', (OUT / name).relative_to(ROOT))


if __name__ == '__main__':
    main()
