#!/usr/bin/env python3
"""Generates several 1024x1024 app icon variants for comparison.
Pure stdlib (struct + zlib + math), no external image libraries.
"""
import math
import os
import struct
import zlib

SIZE = 1024
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'build-resources', 'icon-examples')

COLORS = {
    'blue': (47, 127, 242, 255),
    'green': (39, 174, 96, 255),
    'coral': (240, 98, 76, 255),
}
WHITE = (255, 255, 255, 255)


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


def in_rounded_rect(x, y, w, h, r):
    if x < r and y < r:
        return (x - r) ** 2 + (y - r) ** 2 <= r ** 2
    if x > w - r and y < r:
        return (x - (w - r)) ** 2 + (y - r) ** 2 <= r ** 2
    if x < r and y > h - r:
        return (x - r) ** 2 + (y - (h - r)) ** 2 <= r ** 2
    if x > w - r and y > h - r:
        return (x - (w - r)) ** 2 + (y - (h - r)) ** 2 <= r ** 2
    return 0 <= x <= w and 0 <= y <= h


def in_circle_bg(x, y, size):
    cx = cy = size / 2
    r = size / 2
    return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2


def make_local(scale, offset):
    def to_local(x, y):
        return (x - offset) / scale, (y - offset) / scale
    return to_local


def in_rotated_rect(lx, ly, cx, cy, w, h, angle_deg):
    angle = math.radians(-angle_deg)
    dx, dy = lx - cx, ly - cy
    rx = dx * math.cos(angle) - dy * math.sin(angle)
    ry = dx * math.sin(angle) + dy * math.cos(angle)
    return -w / 2 <= rx <= w / 2 and -h / 2 <= ry <= h / 2


def figure_standing(lx, ly):
    if (lx - 16) ** 2 + (ly - 8) ** 2 <= 4.5 ** 2:
        return True
    if 12 <= lx <= 20 and 14 <= ly <= 23:
        return True
    if 8 <= lx <= 11 and 15 <= ly <= 21:
        return True
    if 21 <= lx <= 24 and 15 <= ly <= 21:
        return True
    if 12 <= lx <= 15 and 24 <= ly <= 30:
        return True
    if 17 <= lx <= 20 and 24 <= ly <= 30:
        return True
    return False


def figure_running(lx, ly):
    if (lx - 17) ** 2 + (ly - 7) ** 2 <= 4.3 ** 2:
        return True
    if in_rotated_rect(lx, ly, 16, 17, 7, 9, 12):
        return True
    if in_rotated_rect(lx, ly, 12, 23, 3.2, 9, -40):
        return True
    if in_rotated_rect(lx, ly, 21, 26, 3.2, 10, 22):
        return True
    if in_rotated_rect(lx, ly, 22, 16, 3, 7, -55):
        return True
    if in_rotated_rect(lx, ly, 10, 19, 3, 7, 45):
        return True
    return False


def figure_bell(lx, ly):
    cx, cy = 16, 15
    dx, dy = lx - cx, ly - cy
    dist = math.sqrt(dx * dx + dy * dy)
    if dy <= 3 and dist <= 9.5 and dy >= -9:
        angle_ok = True
        if dy > 0:
            angle_ok = abs(dx) <= 9.5 * math.sqrt(max(0, 1 - (dy / 9.5) ** 2)) + 0.5
        if angle_ok:
            return True
    if -1 <= lx - 16 <= 1 and 3 <= ly - cy <= 5:
        pass
    if 9 <= lx <= 23 and 24 <= ly <= 26.5:
        return True
    if 14.5 <= lx <= 17.5 and 27 <= ly <= 30:
        if (lx - 16) ** 2 + (ly - 27) ** 2 <= 2.2 ** 2 or 15 <= lx <= 17:
            return True
    if (lx - 16) ** 2 + (ly - 4) ** 2 <= 1.3 ** 2:
        return True
    return False


def build_variant(name, bg_shape, color, figure_fn, corner_radius=225, figure_frac=18 / 32):
    scale = SIZE / 32 * figure_frac
    offset = (SIZE - 32 * scale) / 2
    to_local = make_local(scale, offset)

    def pixel(x, y):
        if bg_shape == 'rounded_square':
            inside_bg = in_rounded_rect(x, y, SIZE, SIZE, corner_radius)
        else:
            inside_bg = in_circle_bg(x, y, SIZE)
        if not inside_bg:
            return (0, 0, 0, 0)
        lx, ly = to_local(x, y)
        if figure_fn(lx, ly):
            return WHITE
        return color

    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, f'{name}.png')
    write_png(out_path, SIZE, SIZE, pixel)
    print(f'Wrote {out_path}')


if __name__ == '__main__':
    build_variant('01-person-blue-square', 'rounded_square', COLORS['blue'], figure_standing)
    build_variant('02-person-running-blue', 'rounded_square', COLORS['blue'], figure_running)
    build_variant('03-person-green-square', 'rounded_square', COLORS['green'], figure_standing)
    build_variant('04-person-coral-circle', 'circle', COLORS['coral'], figure_standing)
    build_variant('05-bell-blue', 'rounded_square', COLORS['blue'], figure_bell, figure_frac=20 / 32)
