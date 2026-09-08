#!/usr/bin/env python3
"""Generates a 1024x1024 app icon: a rounded blue square with a white
pictogram of a person, matching the tray icon's silhouette. Pure stdlib.
"""
import struct
import zlib
import os

SIZE = 1024
BG = (47, 127, 242, 255)  # accent blue
FG = (255, 255, 255, 255)
CORNER_RADIUS = 225

FIGURE_SCALE = SIZE / 32 * (18 / 32)  # figure box ~18/32 of canvas, same proportions as tray icon
OFFSET = (SIZE - 32 * FIGURE_SCALE) / 2


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


def to_local(x, y):
    return (x - OFFSET) / FIGURE_SCALE, (y - OFFSET) / FIGURE_SCALE


def in_head(lx, ly):
    return (lx - 16) ** 2 + (ly - 8) ** 2 <= 4.5 ** 2


def in_body(lx, ly):
    return 12 <= lx <= 20 and 14 <= ly <= 23


def in_arm_left(lx, ly):
    return 8 <= lx <= 11 and 15 <= ly <= 21


def in_arm_right(lx, ly):
    return 21 <= lx <= 24 and 15 <= ly <= 21


def in_leg_left(lx, ly):
    return 12 <= lx <= 15 and 24 <= ly <= 30


def in_leg_right(lx, ly):
    return 17 <= lx <= 20 and 24 <= ly <= 30


def in_figure(x, y):
    lx, ly = to_local(x, y)
    return (
        in_head(lx, ly)
        or in_body(lx, ly)
        or in_arm_left(lx, ly)
        or in_arm_right(lx, ly)
        or in_leg_left(lx, ly)
        or in_leg_right(lx, ly)
    )


def pixel(x, y):
    if not in_rounded_rect(x, y, SIZE, SIZE, CORNER_RADIUS):
        return (0, 0, 0, 0)
    if in_figure(x, y):
        return FG
    return BG


def write_png(filename, width, height, get_pixel):
    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)

    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw.extend(get_pixel(x, y))

    idat = zlib.compress(bytes(raw), 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")

    with open(filename, "wb") as f:
        f.write(png)


if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "build-resources")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "icon-1024.png")
    write_png(out_path, SIZE, SIZE, pixel)
    print(f"Wrote {out_path}")
