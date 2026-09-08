#!/usr/bin/env python3
"""Generates a properly-sized macOS menu bar (tray) icon: 22x22 @1x and
44x44 @2x, black-on-transparent template image with generous padding so
it doesn't look oversized next to other menu bar icons. Pure stdlib.
"""
import struct
import zlib
import os

BLACK = (20, 20, 20, 255)
TRANSPARENT = (0, 0, 0, 0)


def write_png(filename, width, height, get_pixel):
    def chunk(tag, data):
        return (
            struct.pack('>I', len(data)) + tag + data
            + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw.extend(get_pixel(x, y))
    idat = zlib.compress(bytes(raw), 9)
    png = sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')
    with open(filename, 'wb') as f:
        f.write(png)


def in_trapezoid(lx, ly, y0, y1, w0, w1, cx):
    if not (y0 <= ly <= y1):
        return False
    t = (ly - y0) / (y1 - y0)
    half_w = (w0 + (w1 - w0) * t) / 2
    return cx - half_w <= lx <= cx + half_w


def in_capsule(lx, ly, cx, cy, w, h):
    r = h / 2
    left = cx - w / 2 + r
    right = cx + w / 2 - r
    top = cy - h / 2
    bottom = cy + h / 2
    if left <= lx <= right:
        return top <= ly <= bottom
    if lx < left:
        return (lx - left) ** 2 + (ly - cy) ** 2 <= r ** 2
    if lx > right:
        return (lx - right) ** 2 + (ly - cy) ** 2 <= r ** 2
    return False


def in_bell(lx, ly):
    if (lx - 16) ** 2 + (ly - 4) ** 2 <= 1.3 ** 2:
        return True
    if ly <= 13 and (lx - 16) ** 2 + (ly - 13) ** 2 <= 8.5 ** 2:
        return True
    if 7.5 <= lx <= 24.5 and 13 <= ly <= 20.5:
        return True
    if in_trapezoid(lx, ly, 20.5, 22.5, 17, 21, 16):
        return True
    if in_capsule(lx, ly, 16, 23.5, 22, 3):
        return True
    if (lx - 16) ** 2 + (ly - 28) ** 2 <= 1.8 ** 2:
        return True
    return False


def make_figure(size, figure_frac):
    scale = size / 32 * figure_frac
    offset = (size - 32 * scale) / 2

    def to_local(x, y):
        return (x - offset) / scale, (y - offset) / scale

    def pixel(x, y):
        lx, ly = to_local(x, y)
        if in_bell(lx, ly):
            return BLACK
        return TRANSPARENT

    return pixel


if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    os.makedirs(out_dir, exist_ok=True)

    # Glyph occupies ~68% of the canvas height, leaving margin like
    # other macOS menu bar icons (Wi-Fi, Bluetooth, etc.).
    FIGURE_FRAC = 0.68

    write_png(os.path.join(out_dir, 'iconTemplate.png'), 22, 22, make_figure(22, FIGURE_FRAC))
    write_png(os.path.join(out_dir, 'iconTemplate@2x.png'), 44, 44, make_figure(44, FIGURE_FRAC))
    print('Wrote assets/iconTemplate.png (22x22) and assets/iconTemplate@2x.png (44x44)')
