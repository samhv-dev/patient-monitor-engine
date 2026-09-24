#!/usr/bin/env python3
# Stage 4a gate helper (deviation from the plan, recorded in docs/gates/stage-4a.md): the Playwright screenshots are
# 20-165 KB; the gate caps each PNG at 60 KB. Run after the e2e test, from the repository root:
#   for f in docs/gates/stage-4a/*.png; do python3 docs/gates/stage-4a/shrink-png.py "$f" "$f" 256; done
# Needs ffmpeg/ffprobe on PATH (quantiser only); the PNG writer is stdlib (zlib). Anti-aliased edge pixels change,
# flat colours are kept exactly (96-99 % of pixels identical on the 11 gate images).
"""shrink.py IN.png OUT.png COLOURS — palette-quantise a screenshot (ffmpeg palettegen/paletteuse, no dither) and
write it as an indexed PNG at the smallest bit depth (1/2/4/8) with the best of five row-filter strategies + zlib 9."""
import struct, subprocess, sys, zlib
src, dst, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
w, h = map(int, subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src]).decode().strip().split(','))
raw = subprocess.check_output(['ffmpeg', '-loglevel', 'error', '-i', src, '-vf', f'split[a][b];[a]palettegen=max_colors={n}:stats_mode=full:reserve_transparent=0[p];[b][p]paletteuse=dither=none', '-f', 'rawvideo', '-pix_fmt', 'pal8', '-'])
idx, pal = raw[: w * h], raw[w * h : w * h + 1024]
used = sorted(set(idx))
remap = {c: i for i, c in enumerate(used)}
rgb = b''.join(bytes([pal[4 * c + 2], pal[4 * c + 1], pal[4 * c]]) for c in used)  # BGRA little-endian -> RGB
depth = next(d for d in (1, 2, 4, 8) if len(used) <= 1 << d)
per = 8 // depth
rows = []
for y in range(h):
    r = [remap[c] for c in idx[y * w : (y + 1) * w]]
    out = bytearray()
    for x in range(0, w, per):
        b = 0
        for k in range(per):
            b = (b << depth) | (r[x + k] if x + k < w else 0)
        out.append(b)
    rows.append(bytes(out))
def filt(t, cur, prev):
    if t == 0: return cur
    o = bytearray(len(cur))
    for i in range(len(cur)):
        a = cur[i - 1] if i else 0; up = prev[i]; c = prev[i - 1] if i else 0
        if t == 1: p = a
        elif t == 2: p = up
        elif t == 3: p = (a + up) // 2
        else:
            pa, pb, pc = abs(up - c), abs(a - c), abs(a + up - 2 * c)
            p = a if pa <= pb and pa <= pc else up if pb <= pc else c
        o[i] = (cur[i] - p) & 255
    return bytes(o)
best = None
for strat in (0, 1, 2, 4, 'min'):
    data = bytearray(); prev = bytes(len(rows[0]))
    for r in rows:
        if strat == 'min':
            cands = [(t, filt(t, r, prev)) for t in range(5)]
            t, f = min(cands, key=lambda tf: sum(v if v < 128 else 256 - v for v in tf[1]))
        else:
            t, f = strat, filt(strat, r, prev)
        data += bytes([t]) + f; prev = r
    z = zlib.compress(bytes(data), 9)
    if best is None or len(z) < len(best): best = z
def chunk(k, d): return struct.pack('>I', len(d)) + k + d + struct.pack('>I', zlib.crc32(k + d) & 0xFFFFFFFF)
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, depth, 3, 0, 0, 0)) + chunk(b'PLTE', rgb) + chunk(b'IDAT', best) + chunk(b'IEND', b'')
open(dst, 'wb').write(png)
print(f'{src} -> {dst}: {len(used)} colours, {depth}-bit, {len(png)} bytes')
