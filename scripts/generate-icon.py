#!/usr/bin/env python3
"""Generates a simple pixel-art 'person' tray icon as a transparent PNG.

Pure stdlib (struct + zlib), no external image libraries required.
Produces a black silhouette on transparent background so macOS can
treat it as a menu bar "template" image (auto light/dark adaptation).
"""
import struct
import zlib
import os

SIZE = 32
BLACK = (20, 20, 20, 255)
TRANSPARENT = (0, 0, 0, 0)


def in_head(x, y):
    cx, cy, r = 16, 8, 4.5
    return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2


def in_body(x, y):
    return 12 <= x <= 20 and 14 <= y <= 23


def in_arm_left(x, y):
    return 8 <= x <= 11 and 15 <= y <= 21


def in_arm_right(x, y):
    return 21 <= x <= 24 and 15 <= y <= 21


def in_leg_left(x, y):
    return 12 <= x <= 15 and 24 <= y <= 30


def in_leg_right(x, y):
    return 17 <= x <= 20 and 24 <= y <= 30


def pixel(x, y):
    if (
        in_head(x, y)
        or in_body(x, y)
        or in_arm_left(x, y)
        or in_arm_right(x, y)
        or in_leg_left(x, y)
        or in_leg_right(x, y)
    ):
        return BLACK
    return TRANSPARENT


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
        raw.append(0)  # filter type: none
        for x in range(width):
            raw.extend(get_pixel(x, y))

    idat = zlib.compress(bytes(raw), 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")

    with open(filename, "wb") as f:
        f.write(png)


if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "iconTemplate.png")
    write_png(out_path, SIZE, SIZE, pixel)
    print(f"Wrote {out_path}")
