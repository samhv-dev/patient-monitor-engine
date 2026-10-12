// Stage 13 e2e support (not a test file): the text of a PDF that Chromium's `page.pdf()` wrote, with node:zlib only — no
// PDF library (the debrief adds no dependency). It inflates the streams, reads each font's ToUnicode map (bfchar and
// bfrange, the code length from its codespace) and decodes the hex strings of every page's content in order, one line
// per text object. Enough for Skia's output (Type3 or CID fonts, hex strings); not a general PDF parser.
import { inflateSync } from 'node:zlib';

type Obj = { dict: string; stream: Buffer | null };

function objects(pdf: Buffer): Map<number, Obj> {
  const out = new Map<number, Obj>();
  const s = pdf.toString('latin1');
  const re = /(\d+) 0 obj\s*([\s\S]*?)endobj/g;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    const body = m[2] ?? '';
    const at = body.indexOf('stream');
    if (at < 0) {
      out.set(Number(m[1]), { dict: body, stream: null });
      continue;
    }
    const dict = body.slice(0, at);
    let start = at + 'stream'.length;
    if (body[start] === '\r') start++;
    if (body[start] === '\n') start++;
    const len = Number(/\/Length (\d+)/.exec(dict)?.[1] ?? 0);
    const raw = Buffer.from(body.slice(start, start + len), 'latin1');
    out.set(Number(m[1]), { dict, stream: dict.includes('/FlateDecode') ? inflateSync(raw) : raw });
  }
  return out;
}

const utf16 = (hex: string): string => {
  let r = '';
  for (let i = 0; i + 4 <= hex.length; i += 4) r += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
  return r;
};

function cmap(text: string): { bytes: number; map: Map<number, string> } {
  const map = new Map<number, string>();
  const cs = /begincodespacerange\s*<([0-9A-Fa-f]+)>/.exec(text);
  const bytes = cs ? (cs[1] as string).length / 2 : 2;
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const p of (block[1] ?? '').matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) map.set(parseInt(p[1] as string, 16), utf16(p[2] as string));
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const p of (block[1] ?? '').matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<[0-9A-Fa-f]+>|\[[^\]]*\])/g)) {
      const lo = parseInt(p[1] as string, 16);
      const hi = parseInt(p[2] as string, 16);
      const dst = p[3] as string;
      if (dst.startsWith('[')) [...dst.matchAll(/<([0-9A-Fa-f]+)>/g)].forEach((d, i) => map.set(lo + i, utf16(d[1] as string)));
      else {
        const base = parseInt(dst.slice(1, -1), 16);
        for (let c = lo; c <= hi; c++) map.set(c, String.fromCharCode(base + c - lo));
      }
    }
  }
  return { bytes, map };
}

/** The text of every page, in order; pages separated by a form feed. */
export function pdfText(pdf: Buffer): { text: string; pages: number } {
  const objs = objects(pdf);
  const ref = (d: string, key: string): number[] => {
    const m = new RegExp(`/${key}\\s*(\\[[^\\]]*\\]|\\d+ 0 R)`).exec(d);
    return m ? [...(m[1] as string).matchAll(/(\d+) 0 R/g)].map((x) => Number(x[1])) : [];
  };
  const fonts = new Map<number, ReturnType<typeof cmap>>();
  const fontOf = (n: number) => {
    if (!fonts.has(n)) {
      const tu = ref(objs.get(n)?.dict ?? '', 'ToUnicode')[0];
      fonts.set(n, cmap(tu !== undefined ? (objs.get(tu)?.stream?.toString('latin1') ?? '') : ''));
    }
    return fonts.get(n) as ReturnType<typeof cmap>;
  };
  const pagesObj = [...objs.values()].find((o) => /\/Type\s*\/Pages\b/.test(o.dict));
  const order = pagesObj ? ref(pagesObj.dict, 'Kids') : [];
  const out: string[] = [];
  for (const p of order) {
    const page = objs.get(p);
    if (!page) continue;
    let res = page.dict;
    const resRef = /\/Resources\s+(\d+) 0 R/.exec(res);
    if (resRef) res = objs.get(Number(resRef[1]))?.dict ?? '';
    const fontDict = /\/Font\s*<<([\s\S]*?)>>/.exec(res)?.[1] ?? '';
    const names = new Map([...fontDict.matchAll(/\/(\S+?)\s+(\d+) 0 R/g)].map((m) => [m[1] as string, Number(m[2])]));
    const content = ref(page.dict, 'Contents').map((n) => objs.get(n)?.stream?.toString('latin1') ?? '').join('\n');
    let font: ReturnType<typeof cmap> | null = null;
    let line = '';
    const lines: string[] = [];
    for (const tok of content.matchAll(/\/(\S+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]*)>|\bET\b/g)) {
      if (tok[1] !== undefined) font = names.has(tok[1]) ? fontOf(names.get(tok[1]) as number) : null;
      else if (tok[2] !== undefined && font) {
        const hex = tok[2];
        const step = font.bytes * 2;
        for (let i = 0; i + step <= hex.length; i += step) line += font.map.get(parseInt(hex.slice(i, i + step), 16)) ?? '';
      } else if (tok[0] === 'ET') {
        if (line) lines.push(line);
        line = '';
      }
    }
    out.push(lines.join('\n'));
  }
  return { text: out.join('\f'), pages: order.length };
}

/**
 * What a PDF says about itself without reading any font (R50 I-2: the same on every platform, the Linux CI runner
 * included): the document title of the Info dictionary (a literal or a UTF-16 hex string) and each page's MediaBox in
 * points.
 */
export function pdfInfo(pdf: Buffer): { title: string | null; boxes: number[][] } {
  const s = pdf.toString('latin1');
  const t = /\/Title\s*(\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f]*>)/.exec(s)?.[1];
  const title = !t ? null : t.startsWith('(') ? t.slice(1, -1).replace(/\\(.)/g, '$1') : utf16(t.slice(5, -1)); // <FEFF…>: skip the mark
  const boxes = [...s.matchAll(/\/MediaBox\s*\[([^\]]*)\]/g)].map((m) => (m[1] as string).trim().split(/\s+/).map(Number));
  return { title, boxes };
}

/** Text without whitespace, to compare a row however the PDF spaced it. */
export const squash = (s: string): string => s.replace(/\s+/g, '');
