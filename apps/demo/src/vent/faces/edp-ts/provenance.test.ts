// Plan vent-skin-edp-ts.md V1, test (6): the provenance coverage of face.json (§5, the skins' rule copied). Every leaf
// carries {v, p, src}; `src` names rows that EXIST in research/57-edp-ts-ventilator.md (its tables, parsed here) or in
// the plan's gap table (docs/plans/vent-skin-edp-ts.md §3.3); and the leaf's tag agrees with the row's in both
// directions: a `documented` leaf cites only rows read in the manual, a figure, a photograph or the video (M, F, P, V),
// a `measured` one only colour samples (meas), an `eng` one says why, and a `sim` one (the simulator's own words) cites
// the plan. The face's stylesheet holds no colour of its own (face.ts sets them from face.json), and every gap and reason
// the control table names exists.
import type { VentMode } from '@pme/ventilator';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTROLS, WINDOWS } from './controls.ts';
import { helpId } from './knob.ts';
import { labelsOf } from './screen.ts';
import { MODE_WORD, reason, type ReasonId } from './data.ts';
import { MODES } from './modes.ts';
import { filled } from './view.ts';
import FACE from './face.json';

const root = resolve(import.meta.dirname, '../../../../../..');
const note = readFileSync(resolve(root, 'research/57-edp-ts-ventilator.md'), 'utf8');
const plan = readFileSync(resolve(root, 'docs/plans/vent-skin-edp-ts.md'), 'utf8');

/** research/57's rows: id → its tag (the last cell). */
const ROWS = new Map<string, string>();
for (const line of note.split('\n')) {
  const m = /^\| ([A-Z]-\d\d) \|.*\| ([A-Za-z]+) \|\s*$/.exec(line);
  if (m) ROWS.set(m[1] as string, m[2] as string);
}
const GAPS = new Set([...plan.matchAll(/^\| (G[MPDAX]\d+) \|/gm)].map((m) => m[1] as string));
const SECTIONS = new Set([...plan.matchAll(/^#{2,3} (\d+(?:\.\d+)?)\b/gm)].map((m) => `§${m[1]}`));

interface Leaf { v: unknown; p: string; src: string; why?: string }
const leaves: Array<[string, Leaf]> = [];
const walk = (o: unknown, path: string) => {
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    if ('v' in o && 'p' in o) return void leaves.push([path, o as Leaf]);
    for (const [k, v] of Object.entries(o)) if (!k.startsWith('$')) walk(v, `${path}.${k}`);
    return;
  }
  leaves.push([path, { v: o, p: 'MISSING', src: '' }]);
};
walk(FACE, 'face');

describe('face.json: every leaf is sourced', () => {
  it('parses the note and the plan (the test sees what it checks)', () => {
    expect(ROWS.size).toBeGreaterThan(250);
    expect(ROWS.get('T-01')).toBe('M');
    expect(ROWS.get('C-10')).toBe('meas');
    expect(ROWS.get('T-24')).toBe('GAP');
    expect(GAPS.has('GM1') && GAPS.has('GX19')).toBe(true);
    expect(leaves.length).toBeGreaterThan(200);
  });

  it.each(leaves)('%s', (_path, l) => {
    expect(['documented', 'measured', 'inferred', 'eng', 'sim']).toContain(l.p);
    if (l.p === 'sim') {
      const m = /^plan (.+)$/.exec(l.src);
      expect(m, l.src).not.toBeNull();
      for (const id of (m![1] as string).split(', ')) expect(GAPS.has(id) || SECTIONS.has(id), id).toBe(true);
      return;
    }
    const m = /^research\/57 (.+)$/.exec(l.src);
    expect(m, l.src).not.toBeNull();
    const tags = (m![1] as string).split(', ').map((id) => {
      expect(ROWS.has(id), `${id} is a row of research/57`).toBe(true);
      return ROWS.get(id) as string;
    });
    if (l.p === 'documented') for (const t of tags) expect(['M', 'F', 'P', 'V'], `${l.src} (${t})`).toContain(t);
    if (l.p === 'measured') for (const t of tags) expect(t).toBe('meas');
    if (l.p === 'eng' || l.p === 'inferred') expect(l.why ?? '', 'an eng or inferred leaf says why').not.toBe('');
  });
});

describe('the control table and the windows name real reasons and gap rows', () => {
  const reasons = FACE.reasons as Record<string, unknown>;
  const words = FACE.words as Record<string, unknown>;
  it('every unavailable control', () => {
    for (const c of CONTROLS) {
      if (c.kind === 'unavailable') { expect(reasons[c.reason], c.id).toBeDefined(); expect(GAPS.has(c.gap), c.gap).toBe(true); }
      if (c.kind === 'action') expect(GAPS.has(c.gap), c.gap).toBe(true);
      if ('word' in c && c.word) expect(words[c.word], c.id).toBeDefined();
    }
  });
  it('every window row', () => {
    for (const [id, w] of Object.entries(WINDOWS)) {
      expect(words[w.title], id).toBeDefined();
      for (const r of w.rows) {
        expect(words[r.word], `${id}/${r.word}`).toBeDefined();
        if ('reason' in r) { expect(reasons[r.reason]).toBeDefined(); expect(GAPS.has(r.gap), r.gap).toBe(true); }
        if (r.kind === 'limits' && r.off) { expect(reasons[r.off.reason]).toBeDefined(); expect(GAPS.has(r.off.gap)).toBe(true); }
      }
    }
  });
});

describe('the help texts (research/57 K-14, H-21; plan GX8)', () => {
  const help = FACE.help as Record<string, unknown>;
  it('every control of the table and every alarm the face shows has its help, in the simulator\'s words', () => {
    for (const c of CONTROLS) expect(help[helpId(c.id)], c.id).toBeDefined();
    for (const id of Object.keys(FACE.alarms)) expect(help[`alarm:${id}`], id).toBeDefined();
    for (const [k, l] of Object.entries(help)) expect((l as { p: string }).p, k).toBe('sim');
  });
  it('a help text writes none of the face\'s numbers: it names them by their path in face.json, filled when shown', () => {
    for (const [k, l] of Object.entries(help)) {
      const t = (l as { v: string }).v;
      expect(t.replace(/\{[\w.]+\}/g, '').replace(/\b(?:P0\.1|O2|CO2|ETCO2|VD\/VT)\b/g, ''), k).not.toMatch(/\d/);
      expect(() => filled(t), k).not.toThrow();
    }
    expect(filled((FACE.help['under:inspExpPause'] as { v: string }).v)).toContain(`at most ${FACE.mechanics.holdInspMaxS.v} s`);
  });
  it('the reasons that name a mode list or a number read it from face.json: the pause key\'s, each test\'s, P0.1\'s', () => {
    const R = FACE.reasons as Record<string, { v: string }>;
    const T = FACE.mechanics.testModes as Record<string, { v: string[] }>;
    const cases: Array<[string, string, string[]]> = [['pauseModes', 'mechanics.holdModes', FACE.mechanics.holdModes.v],
      ...Object.keys(T).map((id) => [`modes:${id}`, `mechanics.testModes.${id}`, T[id]!.v] as [string, string, string[]])];
    for (const [id, path, modes] of cases) {
      expect(R[id]!.v, id).toContain(`{${path}}`);
      expect(R[id]!.v.replace(/\{[\w.]+\}/g, ''), id).not.toMatch(/\b(?:VCV|PCV|PRVC|PSV)\b/);
      for (const m of modes) expect(reason(id as ReasonId), id).toContain(FACE.words[MODE_WORD[m as VentMode]!].v);
    }
    expect(R.p01Effort!.v).toContain('{mechanics.p01WindowS}');
  });
  it('the device\'s name of each model mode is the one its mode entry carries', () => {
    for (const [name, e] of Object.entries(MODES)) expect(MODE_WORD[e.mode], name).toBe(name);
  });
});

describe('the tests\' modes (research/57 K-15 to K-17, K-19)', () => {
  it('each test\'s modes cite the row that lists them, or are a marked choice with its reason', () => {
    const T = FACE.mechanics.testModes as Record<string, { v: string[]; p: string; src: string; why?: string }>;
    expect(T.autoPeep).toMatchObject({ p: 'documented', src: 'research/57 K-15' });
    expect(T.trapped).toMatchObject({ p: 'documented', src: 'research/57 K-17' });
    for (const id of ['complRes', 'p01']) { expect(T[id]!.p, id).toBe('eng'); expect(T[id]!.why, id).toBeTruthy(); }
    // the rows cited as documented list exactly these modes
    for (const [row, l] of [['K-15', T.autoPeep!], ['K-17', T.trapped!]] as const) {
      const line = note.split('\n').find((x) => x.startsWith(`| ${row} |`))!;
      expect(line, row).toMatch(/VCV, PCV, PRVC/);
      expect(l.v).toEqual(['VC', 'PC', 'PRVC']);
    }
  });
});

describe('the screens of the Graphics window and the scales (research/57 K-10 to K-13)', () => {
  it('every panel of every screen lies in the curves\' area of the photographed screen, between the left column and the pictogram column', () => {
    const G = FACE.layout.grid as Record<string, { v: unknown }>;
    const left = (G.left!.v as number[])[2]!, right = G.rkeyX!.v as number, top = (G.win!.v as number[])[1]!, bottom = G.tileY!.v as number;
    for (const [id, l] of Object.entries(FACE.graphics.layouts)) {
      for (const pn of (l as { v: { panels: Array<{ kind: string; box: number[] }> } }).v.panels) {
        const [x, y, w, h] = pn.box as [number, number, number, number];
        // a curve or a loop carries its scale strip at its left and its time or axis strip under it
        const axes = pn.kind !== 'data';
        const sx = axes ? (FACE.layout.grid.scaleW.v as number) : 0, th = axes ? (G.timeH!.v as number) : 0;
        expect(x - sx >= left && x + w <= right && y >= top && y + h + th <= bottom, `${id} ${pn.box}`).toBe(true);
      }
    }
  });
  it('the starting scales are the photographed ones, and their labels the photographed labels (R-27 to R-29, P-11, P-12)', () => {
    const S = FACE.graphics.scales, I = FACE.graphics.scaleInit.v;
    expect(S.paw.v[I.paw]).toEqual([-7, 35]);
    expect(S.vol.v[I.vol]).toEqual([-0.2, 1.0]);
    expect(S.flow.v[I.flow]).toEqual([-60, 60]);
    expect(labelsOf('p', { idx: I.paw, shift: 0 })).toEqual(FACE.layout.pawLabels.v);
    expect(labelsOf('v', { idx: I.vol, shift: 0 })).toEqual([...(FACE.layout.grid.loopVLabels.v as number[])].reverse());
    expect(labelsOf('f', { idx: I.flow, shift: 0 })).toEqual(FACE.layout.grid.flowLabels.v);
  });
});

describe('the face draws no colour, word or number of its own', () => {
  const src = (f: string) => readFileSync(resolve(import.meta.dirname, f), 'utf8');
  it('face.css: colours only through the custom properties face.ts sets from face.json (and the font token)', () => {
    const css = src('face.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|color-mix\(/g) ?? []).toEqual([]);
    // every --edp-* name (hyphens included, so a typo cannot slip past) is a face.json colour, or the font token
    for (const [, name] of css.matchAll(/var\(--edp-([a-zA-Z0-9-]+)\)/g)) expect(name === 'font' || (FACE.colours as Record<string, unknown>)[name as string] !== undefined, name).toBe(true);
  });
  // VF (brief 159): the drawing is split over face.ts, device.ts (the housing and screen), view.ts (what they show) and
  // pictograms.ts (one drawing per subject); none of them holds a colour, and none writes canvas text of its own
  it.each(['face.ts', 'device.ts', 'view.ts', 'pictograms.ts'])('%s: no colour literal, no canvas text', (f) => {
    const ts = src(f);
    expect(ts.match(/fillText\('/g) ?? []).toEqual([]);
    expect(ts.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|color-mix\(/g) ?? []).toEqual([]);
  });
  it('every region box of the design grid is a measured (or reasoned eng) leaf, inside the device or the screen', () => {
    const G = FACE.layout.grid as Record<string, { v: unknown; p: string }>;
    for (const [k, l] of Object.entries(G)) expect(['measured', 'documented', 'eng'], k).toContain(l.p);
    const box = (k: string) => G[k]!.v as number[];
    for (const k of ['head', 'topLeft', 'msg', 'left', 'win', 'alarmBox']) { const [x, y, w, h] = box(k); expect(x! >= 0 && y! >= 0 && x! + w! <= 800 && y! + h! <= 600, k).toBe(true); }
    for (const k of ['face', 'frame']) { const [x, y, w, h] = box(k); expect(x! + w! <= (G.devW!.v as number) && y! + h! <= (G.devH!.v as number), k).toBe(true); }
  });
});

// Brief 202 (V3 on the redrawn face): every word, colour and position the alarm signals add cites a photograph, a page
// of the manual (research/57 rows), or is a marked choice; and the face's provenance says plainly that the oxygen
// alarms read the SET oxygen (finding N111: the model has no oxygen sensor).
describe('the alarm signals: their sources', () => {
  const L = (o: unknown) => o as { v: unknown; p: string; src: string; why?: string };
  it('the message box: placed and coloured as the manual\'s screen picture shows it (F p. 17, Figure 3-5: S-01, S-02)', () => {
    expect(L(FACE.layout.grid.alarmBox)).toMatchObject({ p: 'documented', src: 'research/57 S-01' });
    expect(L(FACE.colours.alarmHighInk)).toMatchObject({ p: 'documented', src: 'research/57 S-02' });
    // the figure shows a high alarm only: the medium/low box's words are a choice (S-07)
    expect(L(FACE.colours.alarmMedInk).p).toBe('eng');
    expect(ROWS.get('S-01')).toBe('F');
    expect(ROWS.get('S-06'), 'the silenced state on the device: in no source').toBe('GAP');
  });
  it('the lamps: lit and unlit colours measured on the photographs; flash periods a marked choice (H-06 says fast and slow only)', () => {
    for (const k of ['lampHigh', 'lampMed', 'lampOff'] as const) expect(L(FACE.colours[k]).p, k).toBe('measured');
    for (const k of ['lampFastS', 'lampSlowS'] as const) { expect(L(FACE.layout[k]).p, k).toBe('eng'); expect(L(FACE.layout[k]).why, k).toMatch(/half/); }
  });
  it('the lamps unlit and lit as photographed (round 2): a flat unlit lamp at its measured contrast to the bezel (S-10), an even lit fill with its glow outward and no pale centre (S-11)', () => {
    expect(L(FACE.colours.lampUnlit)).toMatchObject({ p: 'measured', src: 'research/57 S-10, P-51' });
    expect(ROWS.get('S-10')).toBe('meas');
    expect(ROWS.get('S-11')).toBe('meas');
    const css = readFileSync(resolve(import.meta.dirname, 'face.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const lampRules = css.split('\n').filter((l) => l.includes('.edp-lamp')).join('\n');
    expect(lampRules).not.toMatch(/radial-gradient|box-shadow/);
    expect(lampRules).toMatch(/var\(--edp-lampUnlit\)/);
    expect(lampRules).toMatch(/drop-shadow\(/);
  });
  it('the simulator\'s words outside the device: the silenced state and the Vent Inop lamp\'s reason', () => {
    expect(L(FACE.reasons.silenced).p).toBe('sim');
    expect(L(FACE.reasons.ventInop)).toMatchObject({ p: 'sim', src: 'plan GA14' });
  });
  it('N111 in plain words: the O2 alarms compare the SET oxygen, there is no oxygen sensor', () => {
    expect(FACE.$about).toMatch(/no oxygen sensor/);
    expect(FACE.$about).toMatch(/SET Oxygen/);
    expect(L(FACE.reasons.o2Set).v).toMatch(/SET Oxygen/);
  });
});
