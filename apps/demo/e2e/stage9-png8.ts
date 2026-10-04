// Indexed-colour PNG for gate screenshots (≤ 60 KB each, no dependency): the page's canvas decodes and scales the
// Playwright screenshot, Node builds a ≤ 256-colour palette by popularity (5 bits per channel) and deflates it.
// Measured in the Stage 9 prototype: 1280×800 views 44–48 KB at scale 1; 1920×1080 views 42–52 KB at scale 0.75.
import { deflateSync } from 'node:zlib';
import type { Page } from '@playwright/test';

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf: Uint8Array): number {
  let c = -1;
  for (const b of buf) c = (CRC[(c ^ b) & 0xff] as number) ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** RGBA pixels → an 8-bit indexed PNG. */
export function png8(rgba: Uint8Array, w: number, h: number): Buffer {
  const key = (i: number) => (((rgba[i] as number) >> 3) << 10) | (((rgba[i + 1] as number) >> 3) << 5) | ((rgba[i + 2] as number) >> 3);
  const count = new Map<number, number>();
  for (let i = 0; i < rgba.length; i += 4) count.set(key(i), (count.get(key(i)) ?? 0) + 1);
  const pal = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 256).map(([k]) => [((k >> 10) & 31) * 8 + 4, ((k >> 5) & 31) * 8 + 4, (k & 31) * 8 + 4] as const);
  const idx = new Map<number, number>();
  const near = (k: number): number => {
    const hit = idx.get(k);
    if (hit !== undefined) return hit;
    const r = ((k >> 10) & 31) * 8 + 4;
    const g = ((k >> 5) & 31) * 8 + 4;
    const b = (k & 31) * 8 + 4;
    let best = 0;
    let bd = Infinity;
    pal.forEach(([pr, pg, pb], j) => {
      const d = (pr - r) ** 2 * 2 + (pg - g) ** 2 * 4 + (pb - b) ** 2 * 3;
      if (d < bd) {
        bd = d;
        best = j;
      }
    });
    idx.set(k, best);
    return best;
  };
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw[y * (w + 1) + 1 + x] = near(key((y * w + x) * 4));
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 3;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('PLTE', Buffer.from(pal.flat())), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Screenshot the page and return it as an indexed PNG, scaled by `scale` in the page's own canvas. */
export async function shot8(page: Page, scale = 1): Promise<Buffer> {
  const b64 = (await page.screenshot()).toString('base64');
  const r = await page.evaluate(async ({ b64, scale }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let s = '';
    for (let i = 0; i < d.length; i += 8192) s += String.fromCharCode(...d.subarray(i, i + 8192));
    return { w: c.width, h: c.height, data: btoa(s) };
  }, { b64, scale });
  return png8(new Uint8Array(Buffer.from(r.data, 'base64')), r.w, r.h);
}
