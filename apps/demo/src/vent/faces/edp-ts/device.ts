// The drawn EDP-TS device (brief 159): the housing and the screen on ONE fixed design grid (face.json layout.grid, every
// box measured on the rectified photographs, research/57 P-20 to P-35), scaled as a whole by face.ts, never reflowed.
// It builds the DOM once and paints any View (view.ts) into it; it holds no state of the ventilator and makes no
// decision: a press goes to the handlers (face.ts gives them the knob). A control's hit box is its own button, sized for
// a finger where the drawn part is smaller (a limit tag's half), with the drawing under it. Three conditions are drawn
// apart: live (the device's look), faint on the DEVICE (`.dim`: the device itself greys it, research/57 R-34, R-36), and
// not simulated yet (`data-unsim`: drawn exactly as live, nothing written on the device; aria-disabled with the reason
// as its description; the drawer's switch overlays a mark).
import { setText } from '../../../app/keep.ts';
import { el } from '../../dom.ts';
import { CONTROLS, scaleCtl, type Ctl, type WindowId } from './controls.ts';
import { DATA, LAYOUT, num, reason, word, type Leaf, type ReasonId, type WordId } from './data.ts';
import { picto, type PictoId } from './pictograms.ts';
import type { Q } from './screen.ts';
import type { GraphicsView, LampState, LimitView, TagView, View } from './view.ts';

/** The keys that act while held, not on a click (research/57 H-12, H-19). */
const HELD = new Set(['under:inspExpPause', 'under:lock']);

type Box = [number, number, number, number];
const G = DATA.layout.grid;
const minHit = (G.minHit as Leaf<number>).v;
const gv = <T>(l: unknown): T => (l as Leaf<T>).v;
const W = (id: WordId) => word(id);
const ctl = (id: string): Ctl => CONTROLS.find((x) => x.id === id) as Ctl;
const place = (e: HTMLElement, [x, y, w, h]: Box) => { e.style.left = `${x}px`; e.style.top = `${y}px`; e.style.width = `${w}px`; e.style.height = `${h}px`; return e; };

export interface DeviceHandlers {
  press(id: string): void;
  touch(win: WindowId, item: number): void;
  explain(r: ReasonId): void;
  /** A held key pressed down, and released (Insp/Exp Pause, the padlock: research/57 H-12, H-19). */
  down(id: string): void;
  up(id: string): void;
}
export interface Device {
  /** The drawn device (housing and screen), devW × devH design px before face.ts scales it. */
  dev: HTMLElement;
  knob: HTMLButtonElement;
  knobMark: HTMLElement;
  /** The reasons as descriptions for assistive technology (outside the device: the caller puts it in the page). */
  reasons: HTMLElement;
  paint(v: View): void;
  /** The curves and loops of the screen now painted, with their axes (rebuilt when the screen or a scale changes). */
  lanes: Array<{ cv: HTMLCanvasElement; lo: number; hi: number; key: Q }>;
  loops: Array<{ cv: HTMLCanvasElement; x: Q; y: Q; xr: [number, number]; yr: [number, number] }>;
}

export function createDevice(h: DeviceHandlers): Device {
  const dev = el('div', { class: 'edp-dev' });
  const devW = gv<number>(G.devW), devH = gv<number>(G.devH);
  dev.style.width = `${devW}px`;
  dev.style.height = `${devH}px`;
  dev.append(place(el('div', { class: 'edp-face' }), gv<Box>(G.face)), place(el('div', { class: 'edp-frame' }), gv<Box>(G.frame)));
  const scr = place(el('div', { class: 'edp-screen' }), [gv<number>(G.lcdX), gv<number>(G.lcdY), num(LAYOUT.screenW), num(LAYOUT.screenH)]);
  dev.append(scr);

  // the reasons, once per not-simulated control, as descriptions (outside the device, hidden)
  const reasons = el('div', { class: 'edp-sr', id: 'edp-reasons' });
  const described = new Map<ReasonId, string>();
  const describe = (b: HTMLElement, r: ReasonId) => {
    let id = described.get(r);
    if (!id) { id = `edp-why-${r}`; described.set(r, id); reasons.append(el('span', { id }, reason(r))); }
    b.setAttribute('aria-disabled', 'true');
    b.setAttribute('aria-describedby', id);
    b.dataset.unsim = r;
  };
  const undescribe = (b: HTMLElement) => { b.removeAttribute('aria-disabled'); b.removeAttribute('aria-describedby'); delete b.dataset.unsim; };
  /** A button of the control table: a live control presses through the knob; a not-simulated one shows its reason. */
  const button = (cls: string, id: string, ...kids: Array<Node | string | null>) => {
    const b = el('button', { class: cls, type: 'button', 'data-ctl': id }, ...kids) as HTMLButtonElement;
    b.onclick = () => h.press(id);
    const x = ctl(id);
    if (x?.kind === 'unavailable') describe(b, x.reason);
    return b;
  };

  // ---- the header (research/57 R-06, R-07; P-21, P-22) ----
  const tl = place(el('div', { class: 'edp-tl' }), gv<Box>(G.topLeft));
  const cat = el('div', { class: 'cat' }), mode = el('div', { class: 'mn' }), backup = el('div', { class: 'bk' }), date = el('div', { class: 'dt' }), time = el('div', { class: 'tm' });
  tl.append(cat, mode, backup, date, time);
  const head = place(el('div', { class: 'edp-head' }), gv<Box>(G.head));
  scr.append(head, tl);
  const TOP: Array<[WordId, WordId, boolean]> = [['peakFlow', 'uLmin', false], ['ti', 'uS', false], ['te', 'uS', false], ['ie', 'current', false], ['fTotal', 'uBpm', true], ['vt', 'uL', false], ['ve', 'uLmin', true], ['oxygen', 'uPct', false]];
  const x0 = gv<number>(G.cellX0), cw = gv<number>(G.cellW);
  const topV = TOP.map(([n, u, styled], i) => {
    const v = el('span', { class: 'v' });
    const cell = place(el('div', { class: 'edp-cell' }, v, el('span', { class: 'u' }, W(u)), el('span', { class: `n${styled ? ` ${n}` : ''}` }, W(n))), [x0 + i * cw, 0, cw, gv<Box>(G.head)[3]]);
    scr.append(cell);
    return { v, cell };
  });

  // ---- the alarm-limit tags (R-11, R-12, L-17; P-09, P-23) ----
  const tagY = gv<number>(G.tagY), tagH = gv<number>(G.tagH);
  type TagEls = { box: HTMLElement; hi?: HTMLElement; lo?: HTMLElement };
  /** A drawn tag at `box`; its one or two limits are buttons whose hit box is at least minHit design px high. */
  const tagAt = (box: Box, t: TagView, name: string, cls = '') => {
    const d = place(el('div', { class: `edp-tag ${cls}`.trim() }, picto('step', t.side)), box);
    scr.append(d);
    const out: TagEls = { box: d };
    const half = (lv: LimitView | undefined, which: 'hi' | 'lo') => {
      if (!lv) return undefined;
      const two = t.hi && t.lo;
      const [bx, by, bw, bh] = box;
      const tv = el('span', { class: 'tv' });
      const hit: Box = two ? (which === 'hi' ? [bx, by - 14, bw, bh / 2 + 14] : [bx, by + bh / 2, bw, bh / 2 + 14]) : [bx, by - Math.max(0, (minHit - bh) / 2), bw, Math.max(minHit, bh)];
      const b = place(button('edp-limit', lv.ctl, tv), hit);
      // the value sits on its line of the drawn tag: high on the first, low on the second (one value: the first)
      // a left-column key (Pressure Limits): the value large, above its symbol (high) or below it (low), as photographed
      const key = cls.includes('key');
      const line = two ? (which === 'hi' ? 14 + 1 : 0) : key ? (which === 'hi' ? 2 : bh - 26) : (hit[3] - bh) / 2 + (bh - 13) / 2;
      tv.style.top = `${line}px`;
      if (two && which === 'hi') tv.style.height = `${bh / 2}px`;
      b.dataset.name = name;
      scr.append(b);
      return b;
    };
    out.hi = half(t.hi, 'hi');
    out.lo = half(t.lo, 'lo');
    return out;
  };
  const tagBox = (i: number): Box => [x0 + i * cw + 2, tagY, cw - 4, tagH];
  let tagEls: Record<keyof View['tags'], TagEls> | null = null;

  // ---- the message bar (R-13; P-08, P-24) ----
  const msgTxt = el('span', { class: 'txt' });
  const msg = place(el('div', { class: 'edp-msg' },
    el('span', { class: 'ico on' }, picto('volComp')), el('span', { class: 'ico' }, picto('faintA')), el('span', { class: 'ico' }, picto('faintB')), el('span', { class: 'ico' }, picto('faintC')), msgTxt), gv<Box>(G.msg));
  scr.append(msg);

  // ---- the left column (R-18 to R-25; P-10, P-25) ----
  const [lx, , lw] = gv<Box>(G.left);
  const leftEl = place(el('div', { class: 'edp-left' }), gv<Box>(G.left));
  scr.append(leftEl);
  const lval: Record<string, HTMLElement> = {};
  const lung = el('span', { class: 'lung' }, picto('lungs'));
  const LEFTWORD: Record<string, WordId> = { peak: 'peak', trach: 'trach', plateau: 'plateau', mean: 'mean', peep: 'peep', plimits: 'pressureLimits' };
  const leftRows = gv<Array<[number, string]>>(G.leftRows);
  for (const [y, what] of leftRows) {
    const at = (e: HTMLElement, hgt: number) => scr.append(place(e, [lx, y, lw, hgt]));
    if (what === 'battery') at(el('span', { class: 'battery' }, picto('battery')), 16);
    else if (what === 'lungs') at(lung, 44);
    else if (what === 'rule') at(el('span', { class: 'rule' }), 2);
    else if (what.endsWith('V')) { lval[what.slice(0, -1)] = el('span', { class: 'lv' }); at(lval[what.slice(0, -1)]!, 22); }
    else if (LEFTWORD[what]) { at(el('span', { class: `lab ${what}` }, W(LEFTWORD[what]!)), what === 'plimits' ? 28 : 14); if (what === 'trach' || what === 'plateau') { lval[what] = el('span', { class: 'lv' }); at(lval[what]!, 22); lval[what]!.style.top = `${y + 15}px`; } }
  }
  const leftTagY = (n: string) => leftRows.find(([, w]) => w === n)![0];

  // ---- the curves and loops of the chosen screen (R-26 to R-31; P-11, P-12, P-26, P-27; K-10, K-11) ----
  // rebuilt when the screen or a scale changes; a scale strip is the touch key of its quantity's axis numbers (K-11)
  const curves = el('div', { class: 'edp-curves' });
  scr.append(curves);
  const laneScaleW = gv<number>(G.scaleW), loopScaleW = num(DATA.graphics.scaleW), timeH = gv<number>(G.timeH);
  const TITLE: Record<Q, WordId> = { p: 'paw', v: 'vtL', f: 'flowL' };
  const DEC: Record<Q, number> = { p: 0, v: 1, f: 0 };
  const labelsOn = (host: HTMLElement, labels: number[], lo: number, hi: number, axis: 'y' | 'x', decimals: number) => {
    for (const v of labels) {
      const f = (axis === 'y' ? hi - v : v - lo) / (hi - lo);
      const s = el('span', { class: f <= 0.001 ? 'first' : f >= 0.999 ? 'last' : '' }, v === 0 ? '0' : Math.abs(v).toFixed(decimals));
      s.style[axis === 'y' ? 'top' : 'left'] = `${f * 100}%`;
      host.append(s);
    }
  };
  const lanes: Device['lanes'] = [];
  const loops: Device['loops'] = [];
  let dataRows: HTMLElement | null = null;
  let curvesKey = '';
  const scaleKeys: HTMLElement[] = [];
  const strip = (q: Q, cls: string, box: Box) => {
    const b = place(button(cls, scaleCtl(q)), box);
    b.setAttribute('aria-label', W(TITLE[q]));
    b.dataset.q = q;
    scaleKeys.push(b);
    return b;
  };
  const buildCurves = (g: GraphicsView) => {
    curves.replaceChildren();
    lanes.length = loops.length = scaleKeys.length = 0;
    dataRows = null;
    const A = g.axes;
    for (const pn of g.panels) {
      const [x, y, w, h] = pn.box;
      if (pn.kind === 'lane') {
        const a = A[pn.key];
        const sc = strip(pn.key, 'edp-scale', [x - laneScaleW, y, laneScaleW, h]);
        labelsOn(sc, a.labels, a.lo, a.hi, 'y', DEC[pn.key]);
        const cv = el('canvas') as HTMLCanvasElement;
        const panel = place(el('div', { class: 'edp-panel' }, cv, el('span', { class: 'lt' }, W(TITLE[pn.key])), el('span', { class: 's' }, W('secs'))), [x, y, w, h]);
        const ts = place(el('div', { class: 'edp-time' }), [x - laneScaleW, y + h, laneScaleW + w, timeH]);
        const tl = place(el('div', { class: 'tl' }), [laneScaleW, 0, w, timeH]);
        labelsOn(tl, gv<number[]>(G.timeLabels), 0, num(LAYOUT.sweepS), 'x', 0);
        ts.append(tl);
        curves.append(sc, panel, ts);
        lanes.push({ cv, lo: a.lo, hi: a.hi, key: pn.key });
      } else if (pn.kind === 'loop') {
        const ax = A[pn.x], ay = A[pn.y];
        const sc = strip(pn.y, 'edp-scale', [x - loopScaleW, y, loopScaleW, h]);
        labelsOn(sc, ay.labels, ay.lo, ay.hi, 'y', DEC[pn.y]);
        const cv = el('canvas') as HTMLCanvasElement;
        // the axis names as photographed: the y name right of the zero axis at the top, the x name at the right on the zero line
        const zx = ((0 - ax.lo) / (ax.hi - ax.lo)) * w, zy = ((ay.hi - 0) / (ay.hi - ay.lo)) * h;
        const yt = el('span', { class: 'lt' }, W(TITLE[pn.y])); yt.style.left = `${zx + 8}px`;
        const xt = el('span', { class: 'lx' }, W(TITLE[pn.x])); xt.style.top = `${zy + 2}px`;
        const panel = place(el('div', { class: 'edp-panel loop' }, cv, yt, xt, el('span', { class: 'ref' }, g.refAt)), [x, y, w, h]);
        const ts = place(el('div', { class: 'edp-time' }), [x - loopScaleW, y + h, loopScaleW + w, timeH]);
        const tl = place(el('div', { class: 'tl' }), [loopScaleW, 0, w, timeH]);
        labelsOn(tl, [...ax.labels].reverse(), ax.lo, ax.hi, 'x', DEC[pn.x]);
        ts.append(tl);
        // the x axis's numbers: a touch key over the drawn strip, as high as a finger needs (the strip is 12 px)
        const hit = Math.max(timeH, minHit);
        const xk = strip(pn.x, 'edp-axis-hit', [x, y + h + timeH / 2 - hit / 2, w, hit]);
        xk.dataset.strip = 'x';
        curves.append(sc, panel, ts, xk);
        loops.push({ cv, x: pn.x, y: pn.y, xr: [ax.lo, ax.hi], yr: [ay.lo, ay.hi] });
      } else {
        dataRows = place(el('div', { class: 'edp-data' }), [x, y, w, h]);
        curves.append(dataRows);
      }
    }
  };

  // ---- the pictogram column (R-33; P-07, P-28) ----
  const RIGHT: Array<[string, PictoId]> = [['right:graphics', 'graphics'], ['right:freeze', 'freeze'], ['right:respMech', 'respMech'], ['right:saveLoop', 'saveLoop'], ['right:nebulizer', 'nebulizer'], ['right:help', 'help'], ['right:standby', 'standby']];
  const rkeys = RIGHT.map(([id, p], i) => {
    const x = ctl(id);
    const b = place(button('edp-rkey', id, picto(p)), [gv<number>(G.rkeyX), gv<number>(G.rkeyY0) + i * gv<number>(G.rkeyPitch), gv<number>(G.rkeyW), gv<number>(G.rkeyH)]);
    if ((x.kind === 'unavailable' || x.kind === 'action') && x.word) b.setAttribute('aria-label', W(x.word));
    scr.append(b);
    return b;
  });

  // ---- the settings row (R-35; P-13, P-29) ----
  const row = el('div', { class: 'edp-row-host' });
  scr.append(row);
  let rowKey = '';
  type TileEls = { b: HTMLButtonElement; v: HTMLElement; u: HTMLElement; n: HTMLElement };
  let tiles: TileEls[] = [];

  // ---- the alarm box (R-16, R-17; placed and drawn as the manual's screen picture, S-01, S-02) and the window layer (P-19, P-30) ----
  const alarmBox = place(el('div', { class: 'edp-alarm', role: 'alert' }), gv<Box>(G.alarmBox));
  alarmBox.hidden = true;
  const winHost = el('div', { class: 'edp-winhost' });
  scr.append(alarmBox, winHost);

  // ---- the housing (H-01 to H-31; P-14 to P-17, P-31 to P-35) ----
  const lampsX = gv<number>(G.lampsX), [lampW, lampH] = gv<[number, number]>(G.lampSize), lampY = gv<number[]>(G.lampY);
  const lamp = (cls: string, which: string, y: number) => place(el('div', { class: `edp-lamp ${cls}`, 'data-lamp': which, 'data-state': 'off' }), [lampsX, y, lampW, lampH]);
  const lampInop = lamp('tri', 'inop', lampY[0]!), lampHigh = lamp('tri', 'high', lampY[1]!), lampMed = lamp('circ', 'med', lampY[2]!);
  describe(lampInop, 'ventInop'); // the model has no technical fault (plan GA14): drawn unlit, as photographed (S-04)
  const legend = (wd: WordId, box: Box, cls = '') => place(el('div', { class: `edp-legend ${cls}`.trim() }, W(wd)), box);
  dev.append(
    legend('alarmSignals', [lampsX - 40, gv<number>(G.signalsY) - 6, 80, 26], 'r'),
    legend('ventInop', [lampsX - 50, lampY[0]! + 4, 48, 28], 'r'), lampInop,
    legend('high', [lampsX - 50, lampY[1]! + 10, 48, 16], 'r'), lampHigh,
    legend('medLow', [lampsX - 50, lampY[2]! + 4, 44, 28], 'r'), lampMed,
  );
  const sideKey = ([x, y, w, hh, id]: [number, number, number, number, string]) => {
    const x2 = ctl(id);
    let inner: Node[] = [];
    if (id === 'side:alarmLimits') inner = [el('span', { class: 'kw' }, W('alarmLimits')), el('span', { class: 'kp' }, picto('alarmLim'))];
    else if (id === 'side:silence') inner = [picto('bellX')];
    else if (x2.kind === 'action' && x2.word) inner = [el('span', { class: 'kw' }, W(x2.word))];
    const b = button(`edp-hkey${id === 'side:mode' ? ' outlined' : ''}`, id, el('span', { class: 'cap' }, ...inner));
    // the hit box is the key padded to a finger's size; the drawn cap keeps the photographed size (P-33)
    place(b, [x - 6, y - 6, w + 12, hh + 12]);
    if (id === 'side:silence') b.setAttribute('aria-label', W('silence'));
    return b;
  };
  for (const k of gv<Array<[number, number, number, number, string]>>(G.sideKeys)) dev.append(sideKey(k));
  const sk = gv<Array<[number, number, number, number, string]>>(G.sideKeys)[1]!;
  dev.append(legend('silence', [sk[0] - 10, gv<number>(G.silenceTextY), sk[2] + 20, 14], 'c'));
  let ctrlKey: HTMLElement | null = null;
  const underKeys: HTMLElement[] = [];
  /** A key that acts while held: down on the pointer or Space/Enter, up on their release (or the pointer lost). */
  const holdable = (b: HTMLElement, id: string) => {
    b.onclick = null;
    let isDown = false;
    const down = () => { if (!isDown) { isDown = true; h.down(id); } };
    const up = () => { if (isDown) { isDown = false; h.up(id); } };
    b.addEventListener('pointerdown', (e) => { b.setPointerCapture?.(e.pointerId); down(); });
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
    b.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) down(); } });
    b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); up(); } });
    b.addEventListener('blur', up);
  };
  for (const [x, y, w, hh, id] of gv<Array<[number, number, number, number, string]>>(G.underKeys)) {
    const x2 = ctl(id);
    const inner = id === 'under:lock' ? picto('padlock') : el('span', { class: 'kw' }, x2.kind !== 'setting' && x2.kind !== 'limit' && x2.word ? W(x2.word) : '');
    const b = place(button('edp-hkey', id, el('span', { class: 'cap' }, inner)), [x - 6, y - 6, w + 12, hh + 12]);
    if (id === 'under:lock') b.setAttribute('aria-label', W('screenLock'));
    if (HELD.has(id)) holdable(b, id);
    underKeys.push(b);
    if (id === 'under:ctrl') ctrlKey = b;
    dev.append(b);
  }
  const [px, py, bx, by] = gv<[number, number, number, number]>(G.power);
  dev.append(
    place(el('div', { class: 'edp-legend pw' }, picto('plug'), el('span', {}, W('vac'))), [px, py, 120, 18]),
    place(el('div', { class: 'edp-legend pw' }, picto('batteryOutline'), el('span', {}, W('battery'))), [bx, by, 160, 22]),
  );
  const [kx, ky, kr, kR] = gv<[number, number, number, number]>(G.knob);
  const knobMark = el('div', { class: 'mark' });
  // the knob (P-17): a base disc in the housing, and a cream cylinder standing out of it toward the lower right
  const knob = el('button', { class: 'edp-knob', type: 'button', 'aria-label': W('knob'), 'data-ctl': 'side:knobPress' }, el('span', { class: 'ring' }), el('span', { class: 'base' }), el('span', { class: 'cap' }, knobMark)) as HTMLButtonElement;
  // the button's box holds the base and the cylinder's face, which stands 38 px right and 25 px down (P-34)
  place(knob, [kx - kR, ky - kR, kR * 2 + Math.max(0, 38 + kr - kR), kR * 2 + Math.max(0, 25 + kr - kR)]);
  knob.style.setProperty('--cap', `${kr * 2}px`);
  knob.style.setProperty('--base', `${kR * 2}px`);
  dev.append(knob);

  // ---- painting a View ----
  // a pictogram and a window are rebuilt only when they change (app/keep.ts)
  let winKey = '';
  const setUnsim = (b: HTMLElement, r: ReasonId | null) => (r ? describe(b, r) : undescribe(b));
  const paintTag = (els: TagEls, t: TagView) => {
    for (const which of ['hi', 'lo'] as const) {
      const b = els[which], lv = t[which];
      if (!b || !lv) continue;
      setText(b.querySelector('.tv')!, lv.text);
      b.classList.toggle('sel', lv.sel);
      setUnsim(b, lv.unsim);
      b.setAttribute('aria-label', `${b.dataset.name} ${lv.text}`);
    }
    els.box.classList.toggle('sel', !!(t.hi?.sel || t.lo?.sel));
  };
  const buildTiles = (v: View) => {
    row.replaceChildren();
    const tx = gv<number>(G.tileX0), tp = gv<number>(G.tilePitch), tw = gv<number>(G.tileW), ty = gv<number>(G.tileY), th = gv<number>(G.tileH);
    tiles = v.tiles.map((t, i) => {
      const vv = el('span', { class: 'v' }), u = el('span', { class: 'u' }), n = el('span', { class: `n${t.label === W('f') ? ' f' : ''}` });
      const b = place(button(`edp-tile${typeof t.value === 'string' ? '' : ' pict'}`, t.ctl, vv, u, n), [tx + i * tp, ty, tw, th]) as HTMLButtonElement;
      row.append(b);
      return { b, v: vv, u, n };
    });
  };
  const paintWindow = (v: View) => {
    const w = v.window;
    const key = w ? JSON.stringify(w) : '';
    if (key === winKey) return;
    winKey = key;
    if (!w) return void winHost.replaceChildren();
    const box = gv<Box>(G.win);
    const win = place(el('div', { class: `edp-win${w.id === 'confirm' ? ' conf' : ''}`, role: 'dialog', 'aria-label': w.title }), box);
    win.append(el('div', { class: 't' }, ...(w.lines ? [] : [w.title])));
    if (w.lines) {
      // the confirmation (research/57 O-14): "Mode" and the mode's name, then the two instructions
      const [first, ...rest] = w.lines;
      (win.firstChild as HTMLElement).append(...(first ?? []).flatMap((t, i) => (i ? [' ', el('span', {}, t)] : [el('span', {}, t)])));
      for (const ln of rest) win.append(el('p', {}, ...ln));
    }
    if (w.page) win.append(el('span', { class: 'pg' }, w.page)); // the page number at the top right (N-02)
    if (w.text) win.append(el('p', { class: 'help' }, w.text));
    // Patient's Data's rows are read, not chosen: a compact pitch, no knob stop
    const read = w.page !== undefined;
    const y0 = gv<number>(G.winEntryY0), eh = gv<number>(read ? G.dataEntryH : G.winEntryH), ep = gv<number>(read ? G.dataEntryPitch : G.winEntryPitch), inset = gv<number>(G.winEntryInset);
    w.entries.forEach((e, i) => {
      const at: Box = [inset, y0 + i * ep, box[2] - 2 * inset, eh];
      if (read) {
        const r = place(el('div', { class: 'edp-entry data' }, el('span', { class: 'lbl' }, e.label), el('span', { class: 'val' }, e.value ?? '')), at);
        if (e.unsim) describe(r, e.unsim);
        return void win.append(r);
      }
      if (e.cells) {
        const r = place(el('div', { class: 'edp-entry cells' }, el('span', { class: 'lbl' }, e.label)), at);
        for (const c of e.cells as Array<LimitView & { item: number; focus: boolean }>) {
          const b = el('button', { class: `edp-cell-btn${c.sel ? ' sel' : ''}${c.focus ? ' focus' : ''}`, type: 'button', 'data-ctl': c.ctl }, el('span', {}, c.text)) as HTMLButtonElement;
          b.onclick = () => h.touch(w.id as WindowId, c.item);
          r.append(b);
        }
        return void win.append(r);
      }
      const b = place(el('button', { class: `edp-entry${e.focus ? ' focus' : ''}`, type: 'button' }, el('span', { class: 'lbl' }, e.label),
        e.value !== undefined ? el('span', { class: `val${e.valueSel ? ' sel' : ''}` }, e.value) : null, e.more ? el('span', { class: 'more' }, W('more')) : null) as HTMLButtonElement, at) as HTMLButtonElement;
      if (e.unsim) { describe(b, e.unsim); b.onclick = () => h.explain(e.unsim!); }
      else b.onclick = () => h.touch(w.id as WindowId, e.item);
      win.append(b);
    });
    if (w.footer) win.append(place(el('div', { class: 'ft' }, w.footer), [0, gv<number>(G.winFootY), box[2], 16]));
    winHost.replaceChildren(win);
  };

  /** Patient's Data beside the curves (the "Curves and Patient's Data" screen, K-10): its first page's rows. */
  let dataKey = '';
  const paintData = (host: HTMLElement, rows: NonNullable<View['data']>) => {
    const k = JSON.stringify(rows);
    if (k === dataKey && host.childElementCount) return;
    dataKey = k;
    host.replaceChildren(...rows.map((r) => el('div', { class: 'dr' }, el('span', { class: 'lbl' }, r.label), el('span', { class: 'val' }, r.value))));
  };

  /** A lamp lit (VF's look, as photographed: P-15, C-12, C-13) or unlit (P-58); flashing fast or slow (H-06) for a period
   *  of face.json's (eng), lit for its first half; steady for a low alarm or a remaining signal (A-16). */
  const paintLamp = (e: HTMLElement, st: LampState, on: string) => {
    e.dataset.state = st;
    e.classList.toggle(on, st !== 'off');
    e.classList.toggle('flash-fast', st === 'fast');
    e.classList.toggle('flash-slow', st === 'slow');
    const per = st === 'fast' ? num(LAYOUT.lampFastS) : st === 'slow' ? num(LAYOUT.lampSlowS) : 0;
    e.style.animationDuration = per ? `${per}s` : '';
  };
  const paint = (v: View) => {
    cat.textContent = v.category; mode.textContent = v.mode; backup.textContent = v.backup; date.textContent = v.date; time.textContent = v.time;
    v.top.forEach((t, i) => { topV[i]!.v.textContent = t.v; topV[i]!.cell.classList.toggle('dim', t.dim); });
    if (!tagEls) {
      const lt = (n: string): Box => [3, leftTagY(n), lw - 4, n === 'tag' ? 24 : n === 'keyHi' ? 46 : 44];
      tagEls = {
        fTotal: tagAt(tagBox(4), v.tags.fTotal, W('fTotal')), vt: tagAt(tagBox(5), v.tags.vt, W('vt')), ve: tagAt(tagBox(6), v.tags.ve, W('ve')), oxygen: tagAt(tagBox(7), v.tags.oxygen, W('oxygen')),
        peep: tagAt(lt('tag'), v.tags.peep, W('peep'), 'pale'), pHi: tagAt(lt('keyHi'), v.tags.pHi, W('pressureLimits'), 'key hi'), pLo: tagAt(lt('keyLo'), v.tags.pLo, W('pressureLimits'), 'key lo'),
      };
    }
    for (const k of Object.keys(tagEls) as Array<keyof View['tags']>) paintTag(tagEls[k], v.tags[k]);
    msgTxt.textContent = v.message;
    lung.classList.toggle('on', v.lung);
    lval.peak!.textContent = v.left.peak; lval.trach!.textContent = v.left.trach; lval.plateau!.textContent = v.left.plateau; lval.mean!.textContent = v.left.mean; lval.peep!.textContent = v.left.peep;
    const key = v.tiles.map((t) => t.ctl).join();
    if (key !== rowKey) { rowKey = key; buildTiles(v); }
    v.tiles.forEach((t, i) => {
      const k = tiles[i]!;
      if (typeof t.value === 'string') { delete k.v.dataset.picto; setText(k.v, t.value); }
      else {
        const pk = `${t.value.picto} ${t.value.o ?? ''}`;
        if (k.v.dataset.picto !== pk) { k.v.dataset.picto = pk; k.v.replaceChildren(picto(t.value.picto, t.value.o)); }
      }
      setText(k.u, t.unit);
      setText(k.n, t.label);
      k.b.classList.toggle('sel', t.sel);
      k.b.classList.toggle('dim', t.dim);
      if (t.unsim) describe(k.b, t.unsim);
      else if (t.dim) { undescribe(k.b); k.b.setAttribute('aria-disabled', 'true'); }
      else undescribe(k.b);
    });
    for (const b of rkeys) { b.classList.toggle('dim', v.rightDim.includes(b.dataset.ctl!)); b.classList.toggle('lit', v.lit.includes(b.dataset.ctl!)); }
    for (const b of underKeys) if (b !== ctrlKey) b.classList.toggle('lit', v.lit.includes(b.dataset.ctl!));
    const ck = JSON.stringify([v.graphics.panels, v.graphics.axes, v.graphics.refAt]);
    if (ck !== curvesKey) { curvesKey = ck; buildCurves(v.graphics); }
    for (const b of scaleKeys) {
      const on = v.graphics.axes[b.dataset.q as Q].sel;
      b.classList.toggle('sel', on);
      if (b.dataset.strip === 'x') b.previousElementSibling?.classList.toggle('sel', on); // the drawn strip under it
    }
    if (dataRows) paintData(dataRows, v.data ?? []);
    paintWindow(v);
    alarmBox.hidden = !v.alarm;
    if (v.alarm) { alarmBox.className = `edp-alarm ${v.alarm.priority}`; setText(alarmBox, v.alarm.text); }
    paintLamp(lampInop, v.lamps.inop, 'on-high');
    paintLamp(lampHigh, v.lamps.high, 'on-high');
    paintLamp(lampMed, v.lamps.med, 'on-med');
    knob.classList.toggle('lit', v.ring);
    ctrlKey?.classList.toggle('lit', v.ctrl);
  };

  return { dev, knob, knobMark, reasons, paint, lanes, loops };
}

/** The face's colours, fonts and lane colours as custom properties on an element (face.json → CSS). */
export function applyTokens(e: HTMLElement): () => void {
  const set: string[] = [];
  for (const [k, l] of Object.entries(DATA.colours)) { e.style.setProperty(`--edp-${k}`, (l as Leaf<string>).v); set.push(`--edp-${k}`); }
  e.style.setProperty('--edp-font', gv<string>(DATA.fonts.screen)); set.push('--edp-font');
  return () => { for (const k of set) e.style.removeProperty(k); };
}
