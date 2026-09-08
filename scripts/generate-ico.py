#!/usr/bin/env python3
"""Packs a set of PNG files into a single multi-resolution Windows .ico
using the PNG-embedded ICO format (supported since Windows Vista)."""
import os
import struct

BASE = os.path.join(os.path.dirname(__file__), '..', 'build-resources')
SIZES = [16, 32, 48, 256]
OUT_PATH = os.path.join(BASE, 'icon.ico')


def build_ico(sizes, out_path):
    entries = []
    images = []
    for size in sizes:
        with open(os.path.join(BASE, f'icon-{size}.png'), 'rb') as f:
            data = f.read()
        images.append(data)
        dim = 0 if size == 256 else size
        entries.append((dim, dim, len(data)))

    header = struct.pack('<HHH', 0, 1, len(sizes))
    offset = 6 + 16 * len(sizes)
    dir_entries = b''
    for (w, h, length), _ in zip(entries, images):
        dir_entries += struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, length, offset)
        offset += length

    with open(out_path, 'wb') as f:
        f.write(header)
        f.write(dir_entries)
        for data in images:
            f.write(data)


if __name__ == '__main__':
    build_ico(SIZES, OUT_PATH)
    print(f'Wrote {OUT_PATH}')
