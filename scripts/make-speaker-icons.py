#!/usr/bin/env python3
"""Convierte las imágenes de Rubén (megáfono con bandera, JPG con fondo blanco) en los íconos
public/icons/speaker-us.webp y public/icons/speaker-uk.webp: recorta al dibujo, vuelve transparente
solo el blanco del fondo (el conectado con los bordes, así el blanco de la bandera se conserva) y
exporta a 96 px de alto, por debajo de 15 KB.

Uso:  python3 scripts/make-speaker-icons.py --us us.jpg --uk uk.jpg [--crop-us x0,y0,x1,y1] [--crop-uk ...]
Requiere Pillow con WebP.
"""
import argparse
import os
from PIL import Image, ImageDraw

KEY = (255, 0, 255)
HEIGHT = 96
MAX_BYTES = 15 * 1024
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')


def cut_background(img, thresh):
    rgb = img.convert('RGB')
    w, h = rgb.size
    step = max(1, min(w, h) // 64)
    seeds = [(x, 0) for x in range(0, w, step)] + [(x, h - 1) for x in range(0, w, step)]
    seeds += [(0, y) for y in range(0, h, step)] + [(w - 1, y) for y in range(0, h, step)]
    for seed in seeds:
        r, g, b = rgb.getpixel(seed)
        if min(r, g, b) >= 255 - thresh:
            ImageDraw.floodfill(rgb, seed, KEY, thresh=thresh)
    rgba = rgb.convert('RGBA')
    px = rgba.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][:3] == KEY:
                px[x, y] = (255, 255, 255, 0)
    return rgba


def convert(src, name, crop, thresh):
    img = Image.open(src)
    if crop:
        img = img.crop(tuple(int(v) for v in crop.split(',')))
    rgba = cut_background(img, thresh)
    box = rgba.getchannel('A').getbbox()
    if not box:
        raise SystemExit(f'{src}: no quedó nada tras quitar el fondo')
    rgba = rgba.crop(box)
    w, h = rgba.size
    rgba = rgba.resize((max(1, round(w * HEIGHT / h)), HEIGHT), Image.LANCZOS)
    path = os.path.join(OUT, f'speaker-{name}.webp')
    for quality in (90, 82, 74, 66, 58, 50):
        rgba.save(path, 'WEBP', quality=quality, method=6)
        if os.path.getsize(path) <= MAX_BYTES:
            break
    print(f'{path}: {rgba.size[0]}x{rgba.size[1]}, {os.path.getsize(path)} bytes')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--us', required=True)
    ap.add_argument('--uk', required=True)
    ap.add_argument('--crop-us')
    ap.add_argument('--crop-uk')
    ap.add_argument('--thresh', type=int, default=28, help='tolerancia del blanco del fondo (0-255)')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    convert(a.us, 'us', a.crop_us, a.thresh)
    convert(a.uk, 'uk', a.crop_uk, a.thresh)


if __name__ == '__main__':
    main()
