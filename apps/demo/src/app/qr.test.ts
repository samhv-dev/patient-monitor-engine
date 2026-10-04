import { describe, expect, it } from 'vitest';
import { encodeQr } from './qr.ts';

// The encoder was checked in the Stage 9 prototype by decoding versions 1, 4, 6, 8 and 10 with macOS CoreImage
// (CIDetectorTypeQRCode). CI has no decoder, so this pins the structure and one symbol's checksum.
const finder = (m: boolean[][], x0: number, y0: number) => {
  for (let dy = 0; dy < 7; dy++) {
    for (let dx = 0; dx < 7; dx++) {
      const d = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      expect(m[y0 + dy]?.[x0 + dx], `finder at ${x0},${y0} (${dx},${dy})`).toBe(d !== 2);
    }
  }
};
/** Format bits (15) read from around the top-left finder, then BCH-checked and unmasked. */
function formatOf(m: boolean[][]): { ecl: number; mask: number } {
  const bit = (x: number, y: number) => (m[y]?.[x] ? 1 : 0);
  let v = 0;
  const seq: Array<[number, number]> = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
  seq.forEach(([x, y], i) => (v |= bit(x, y) << i));
  v ^= 0x5412;
  let rem = v >>> 10;
  const data = rem;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  expect((v & 0x3ff) >>> 0).toBe(rem & 0x3ff);
  return { ecl: data >>> 3, mask: data & 7 };
}

describe('pairing QR code', () => {
  it('picks the smallest version (level M, byte mode) and draws the three finder patterns', () => {
    for (const [text, size] of [['HELLO', 21], ['http://192.168.1.20:5173/#/remote?code=AGD5YJ', 33], ['A'.repeat(200), 57]] as const) {
      const m = encodeQr(text);
      expect(m.length).toBe(size);
      finder(m, 0, 0);
      finder(m, size - 7, 0);
      finder(m, 0, size - 7);
      expect(formatOf(m).ecl).toBe(0); // level M
    }
  });
  it('is deterministic (checksum of one symbol)', () => {
    const m = encodeQr('http://192.168.1.20:5173/#/remote?code=AGD5YJ');
    const s = m.flat().reduce((a, d, i) => (d ? (a * 31 + i) % 1_000_000_007 : a), 7);
    expect(s).toMatchInlineSnapshot(`2785361`);
  });
  it('refuses text longer than version 10 holds', () => {
    expect(() => encodeQr('x'.repeat(300))).toThrow(/too long/);
  });
});
