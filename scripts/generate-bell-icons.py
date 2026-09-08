#!/usr/bin/env python3
"""Generates several bell-icon variants (refined shape) for comparison.
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
    'navy': (30, 41, 59, 255),
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


def figure_bell(lx, ly):
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


def figure_bell_ringing(lx, ly):
    if figure_bell(lx, ly):
        return True
    if in_rotated_rect(lx, ly, 3.5, 17.5, 6, 1.8, 20):
        return True
    if in_rotated_rect(lx, ly, 1, 20.5, 6, 1.8, 10):
        return True
    if in_rotated_rect(lx, ly, 28.5, 17.5, 6, 1.8, -20):
        return True
    if in_rotated_rect(lx, ly, 31, 20.5, 6, 1.8, -10):
        return True
    return False


def build_variant(name, bg_shape, color, figure_fn, corner_radius=225, figure_frac=20 / 32):
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
    build_variant('05-bell-blue', 'rounded_square', COLORS['blue'], figure_bell)
    build_variant('06-bell-green-square', 'rounded_square', COLORS['green'], figure_bell)
    build_variant('07-bell-coral-circle', 'circle', COLORS['coral'], figure_bell)
    build_variant('08-bell-navy-square', 'rounded_square', COLORS['navy'], figure_bell)
    build_variant('09-bell-ringing-blue', 'rounded_square', COLORS['blue'], figure_bell_ringing, figure_frac=22 / 32)
