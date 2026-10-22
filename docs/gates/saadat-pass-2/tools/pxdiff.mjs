// Count differing pixels between two same-size PNGs (decoded with ffmpeg) and print the bounding box of the difference.
// usage: node pxdiff.mjs a.png b.png [diff-out.png]
import { execFileSync } from 'node:child_process';

const [a, b, out] = process.argv.slice(2);
const size = (f) => execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f]).toString().trim().split(',').map(Number);
const raw = (f) => execFileSync('ffmpeg', ['-loglevel', 'error', '-i', f, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
const [w, h] = size(a);
const [w2, h2] = size(b);
if (w !== w2 || h !== h2) {
  console.log(`size differs: ${w}x${h} vs ${w2}x${h2}`);
  process.exit(2);
}
const A = raw(a);
const B = raw(b);
let n = 0;
let x0 = w, y0 = h, x1 = -1, y1 = -1;
const D = Buffer.alloc(w * h * 3);
for (let i = 0, p = 0; p < w * h; p++, i += 3) {
  if (A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2]) {
    n++;
    const x = p % w, y = (p / w) | 0;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
    D[i] = 255; D[i + 1] = 0; D[i + 2] = 255;
  } else {
    D[i] = A[i] >> 2; D[i + 1] = A[i + 1] >> 2; D[i + 2] = A[i + 2] >> 2;
  }
}
console.log(n === 0 ? '0 differing pixels' : `${n} differing pixels, box x ${x0}-${x1}, y ${y0}-${y1}`);
if (out && n > 0) execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${w}x${h}`, '-i', '-', out], { input: D });
