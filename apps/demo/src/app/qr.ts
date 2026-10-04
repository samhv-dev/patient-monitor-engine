// A small QR Code encoder for the Remote pairing link (research/13 §4.4: "pairing by code and QR"; no dependency).
// Byte mode, error-correction level M, versions 1–10 (up to 213 bytes: a pairing URL is ≈ 60). Structure follows
// ISO/IEC 18004 as laid out in Project Nayuki's public description of the algorithm; the code is written here, not
// copied. Mask choice uses penalty rules 1, 2 and 4 (rule 3 is optional for a valid symbol).

// Error-correction level M, index = version (0 unused).
const ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const M_FORMAT = 0; // format bits for level M

const rawModules = (ver: number): number => {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
};
const dataCodewords = (ver: number): number => Math.floor(rawModules(ver) / 8) - (ECC_PER_BLOCK[ver] as number) * (NUM_BLOCKS[ver] as number);

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}
function rsDivisor(degree: number): number[] {
  const r = new Array<number>(degree).fill(0);
  r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = gfMul(r[j] as number, root);
      if (j + 1 < r.length) r[j] = (r[j] as number) ^ (r[j + 1] as number);
    }
    root = gfMul(root, 0x02);
  }
  return r;
}
function rsRemainder(data: readonly number[], div: readonly number[]): number[] {
  const r = new Array<number>(div.length).fill(0);
  for (const b of data) {
    const f = b ^ (r.shift() as number);
    r.push(0);
    for (let i = 0; i < div.length; i++) r[i] = (r[i] as number) ^ gfMul(div[i] as number, f);
  }
  return r;
}

const alignPositions = (ver: number, size: number): number[] => {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
  const out = [6];
  for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
};

const MASKS: ReadonlyArray<(x: number, y: number) => boolean> = [
  (x, y) => (x + y) % 2 === 0, (_x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** The symbol as rows of booleans (true = dark), without the quiet zone. Throws when the text is too long. */
export function encodeQr(text: string): boolean[][] {
  const bytes = [...new TextEncoder().encode(text)];
  let ver = 1;
  const need = (v: number) => 4 + (v < 10 ? 8 : 16) + bytes.length * 8;
  while (ver <= 10 && need(ver) > dataCodewords(ver) * 8) ver++;
  if (ver > 10) throw new Error('text too long for the pairing QR code');
  const cap = dataCodewords(ver) * 8;
  const bits: number[] = [];
  const put = (v: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
  };
  put(0b0100, 4);
  put(bytes.length, ver < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  put(0, Math.min(4, cap - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

  // error correction and interleaving
  const nb = NUM_BLOCKS[ver] as number;
  const eccLen = ECC_PER_BLOCK[ver] as number;
  const raw = Math.floor(rawModules(ver) / 8);
  const nShort = nb - (raw % nb);
  const shortLen = Math.floor(raw / nb);
  const div = rsDivisor(eccLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, div);
    if (i < nShort) dat.push(0);
    blocks.push([...dat, ...ecc]);
  }
  const words: number[] = [];
  for (let i = 0; i < (blocks[0] as number[]).length; i++) {
    for (let j = 0; j < blocks.length; j++) if (i !== shortLen - eccLen || j >= nShort) words.push((blocks[j] as number[])[i] as number);
  }

  // function patterns
  const size = ver * 4 + 17;
  const mod = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, dark: boolean) => {
    (mod[y] as boolean[])[x] = dark;
    (fn[y] as boolean[])[x] = true;
  };
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]] as const) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
    }
  }
  const al = alignPositions(ver, size);
  for (let i = 0; i < al.length; i++) {
    for (let j = 0; j < al.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set((al[i] as number) + dx, (al[j] as number) + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  const drawFormat = (mask: number) => {
    const d = (M_FORMAT << 3) | mask;
    let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const b = ((d << 10) | rem) ^ 0x5412;
    const bit = (i: number) => ((b >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  if (ver >= 7) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const b = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((b >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const c = Math.floor(i / 3);
      set(a, c, dark);
      set(c, a, dark);
    }
  }

  // data, zigzag from the bottom right
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? size - 1 - v : v;
        if (!(fn[y] as boolean[])[x] && i < words.length * 8) {
          (mod[y] as boolean[])[x] = (((words[i >>> 3] as number) >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
  }

  // mask: the lowest penalty wins
  const apply = (m: number) => {
    const f = MASKS[m] as (x: number, y: number) => boolean;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!(fn[y] as boolean[])[x] && f(x, y)) (mod[y] as boolean[])[x] = !(mod[y] as boolean[])[x];
  };
  let best = 0;
  let bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    apply(m);
    drawFormat(m);
    const s = penalty(mod);
    if (s < bestScore) {
      bestScore = s;
      best = m;
    }
    apply(m);
  }
  apply(best);
  drawFormat(best);
  return mod;
}

function penalty(m: boolean[][]): number {
  const n = m.length;
  let score = 0;
  let dark = 0;
  for (let a = 0; a < n; a++) {
    for (const horizontal of [true, false]) {
      let run = 1;
      for (let b = 1; b < n; b++) {
        const cur = horizontal ? (m[a] as boolean[])[b] : (m[b] as boolean[])[a];
        const prev = horizontal ? (m[a] as boolean[])[b - 1] : (m[b - 1] as boolean[])[a];
        if (cur === prev) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score++;
        } else run = 1;
      }
    }
  }
  for (let y = 0; y < n - 1; y++) {
    for (let x = 0; x < n - 1; x++) {
      const c = (m[y] as boolean[])[x];
      if (c === (m[y] as boolean[])[x + 1] && c === (m[y + 1] as boolean[])[x] && c === (m[y + 1] as boolean[])[x + 1]) score += 3;
    }
  }
  for (const row of m) for (const c of row) if (c) dark++;
  const k = Math.ceil(Math.abs(dark * 20 - n * n * 10) / (n * n)) - 1;
  return score + Math.max(0, k) * 10;
}

/** The symbol as an SVG element with a 4-module quiet zone, black on white. */
export function qrSvg(text: string, px = 180, doc: Document = document): SVGSVGElement {
  const m = encodeQr(text);
  const n = m.length + 8;
  let d = '';
  m.forEach((row, y) => row.forEach((dark, x) => {
    if (dark) d += `M${x + 4} ${y + 4}h1v1h-1z`;
  }));
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${n} ${n}`);
  svg.setAttribute('width', String(px));
  svg.setAttribute('height', String(px));
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.innerHTML = `<rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/>`;
  return svg;
}
