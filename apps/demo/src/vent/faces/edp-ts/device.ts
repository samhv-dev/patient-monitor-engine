// The drawn EDP-TS device (brief 159): the housing and the screen on ONE fixed design grid (face.json layout.grid, every
// box measured on the rectified photographs, research/57 P-20 to P-35), scaled as a whole by face.ts, never reflowed.
// It builds the DOM once and paints any View (view.ts) into it; it holds no state of the ventilator and makes no
// decision: a press goes to the handlers (face.ts gives them the knob). A control's hit box is its own button, sized for
// a finger where the drawn part is smaller (a limit tag's half), with the drawing under it. Three conditions are drawn
// apart: live (the device's look), faint on the DEVICE (`.dim`: the device itself greys it, research/57 R-34, R-36), and
// not simulated yet (`data-unsim`: drawn exactly as live, nothing written on the device; aria-disabled with the reason
// as its description; the drawer's switch overlays a mark).
import { el } from '../../dom.ts';
import { CONTROLS, type Ctl, type WindowId } from './controls.ts';
import { DATA, LAYOUT, num, reason, word, type Leaf, type ReasonId, type WordId } from './data.ts';
import { picto, type PictoId } from './pictograms.ts';
import type { LampState, LimitView, TagView, View } from './view.ts';

type Box = [number, number, number, number];
const G = DATA.layout.grid;
const gv = <T>(l: unknown): T => (l as Leaf<T>).v;
const W = (id: WordId) => word(id);
const ctl = (id: string): Ctl => CONTROLS.find((x) => x.id === id) as Ctl;
const place = (e: HTMLElement, [x, y, w, h]: Box) => { e.style.left = `${x}px`; e.style.top = `${y}px`; e.style.width = `${w}px`; e.style.height = `${h}px`; return e; };

export interface DeviceHandlers {
  press(id: string): void;
  touch(win: WindowId, item: number): void;
  explain(r: ReasonId): void;
}
export interface Device {
  /** The drawn device (housing and screen), devW × devH design px before face.ts scales it. */
  dev: HTMLElement;
  knob: HTMLButtonElement;
  knobMark: HTMLElement;
  /** The reasons as descriptions for assistive technology (outside the device: the caller puts it in the page). */
  reasons: HTMLElement;
  paint(v: View): void;
  lanes: Array<{ cv: HTMLCanvasElement; lo: number; hi: number; key: 'p' | 'v' | 'f' }>;
  loops: Array<{ cv: HTMLCanvasElement; x: 'p' | 'v'; y: 'v' | 'f' }>;
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
  /** A drawn tag at `box`; its one or two limits are buttons whose hit box is at least 26 design px high. */
  const tagAt = (box: Box, t: TagView, name: string, cls = '') => {
    const d = place(el('div', { class: `edp-tag ${cls}`.trim() }, picto('step', t.side)), box);
    scr.append(d);
    const out: TagEls = { box: d };
    const half = (lv: LimitView | undefined, which: 'hi' | 'lo') => {
      if (!lv) return undefined;
      const two = t.hi && t.lo;
      const [bx, by, bw, bh] = box;
      const tv = el('span', { class: 'tv' });
      const hit: Box = two ? (which === 'hi' ? [bx, by - 14, bw, bh / 2 + 14] : [bx, by + bh / 2, bw, bh / 2 + 14]) : [bx, by - Math.max(0, (26 - bh) / 2), bw, Math.max(26, bh)];
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

  // ---- the three curves and the two loops (R-26 to R-31; P-11, P-12, P-26, P-27) ----
  const scaleX = gv<number>(G.scaleX), scaleW = gv<number>(G.scaleW), laneX = gv<number>(G.laneX), laneW = gv<number>(G.laneW), laneH = gv<number>(G.laneH), timeH = gv<number>(G.timeH);
  const labelsOn = (host: HTMLElement, labels: number[], lo: number, hi: number, axis: 'y' | 'x', decimals: number) => {
    for (const v of labels) {
      const f = (axis === 'y' ? hi - v : v - lo) / (hi - lo);
      const s = el('span', { class: f <= 0.001 ? 'first' : f >= 0.999 ? 'last' : '' }, v === 0 ? '0' : Math.abs(v).toFixed(decimals));
      s.style[axis === 'y' ? 'top' : 'left'] = `${f * 100}%`;
      host.append(s);
    }
  };
  const pawLo = num(LAYOUT.pawMin), pawHi = num(LAYOUT.pawMax), vtLo = num(LAYOUT.vtMin), vtHi = num(LAYOUT.vtMax), fLo = num(LAYOUT.flowMin), fHi = num(LAYOUT.flowMax);
  const LANES: Array<['p' | 'v' | 'f', WordId, number, number, number[], number]> = [
    ['p', 'paw', pawLo, pawHi, gv<number[]>(LAYOUT.pawLabels), 0], ['v', 'vtL', vtLo, vtHi, gv<number[]>(G.vtLabels), 1], ['f', 'flowL', fLo, fHi, gv<number[]>(G.flowLabels), 0]];
  const lanes = LANES.map(([key, title, lo, hi, labels, d], i) => {
    const y = gv<number[]>(G.laneY)[i]!;
    const sc = place(el('div', { class: 'edp-scale' }), [scaleX, y, scaleW, laneH]);
    labelsOn(sc, labels, lo, hi, 'y', d);
    const cv = el('canvas') as HTMLCanvasElement;
    const panel = place(el('div', { class: 'edp-panel' }, cv, el('span', { class: 'lt' }, W(title)), el('span', { class: 's' }, W('secs'))), [laneX, y, laneW, laneH]);
    const ts = place(el('div', { class: 'edp-time' }), [scaleX, y + laneH, laneX - scaleX + laneW, timeH]);
    const tl2 = el('div', { class: 'tl' });
    place(tl2, [laneX - scaleX, 0, laneW, timeH]);
    labelsOn(tl2, gv<number[]>(G.timeLabels), 0, num(LAYOUT.sweepS), 'x', 0);
    ts.append(tl2);
    scr.append(sc, panel, ts);
    return { cv, lo, hi, key };
  });
  const loopScaleX = gv<number>(G.loopScaleX), loopX = gv<number>(G.loopX), loopW = gv<number>(G.loopW);
  const LOOPS: Array<['p' | 'v', 'v' | 'f', WordId, WordId, number[], number, number, number, number[], number, number, number]> = [
    ['p', 'v', 'vtL', 'paw', gv<number[]>(G.vtLabels), vtLo, vtHi, 1, gv<number[]>(G.loopPLabels), pawLo, pawHi, 0],
    ['v', 'f', 'flowL', 'vtL', gv<number[]>(G.flowLabels), fLo, fHi, 0, gv<number[]>(G.loopVLabels), vtLo, vtHi, 1]];
  const loops = LOOPS.map(([xk, yk, ytitle, xtitle, ylab, ylo, yhi, yd, xlab, xlo, xhi, xd], i) => {
    const y = gv<number[]>(G.loopY)[i]!, lh = gv<number[]>(G.loopH)[i]!;
    const sc = place(el('div', { class: 'edp-scale' }), [loopScaleX, y, loopX - loopScaleX, lh]);
    labelsOn(sc, ylab, ylo, yhi, 'y', yd);
    const cv = el('canvas') as HTMLCanvasElement;
    // the axis names as photographed: the y name right of the zero axis at the top, the x name at the right on the zero line
    const zx = ((0 - xlo) / (xhi - xlo)) * loopW, zy = ((yhi - 0) / (yhi - ylo)) * lh;
    const yt = el('span', { class: 'lt' }, W(ytitle)); yt.style.left = `${zx + 8}px`;
    const xt = el('span', { class: 'lx' }, W(xtitle)); xt.style.top = `${zy + 2}px`;
    const panel = place(el('div', { class: 'edp-panel loop' }, cv, yt, xt), [loopX, y, loopW, lh]);
    const ts = place(el('div', { class: 'edp-time' }), [loopScaleX, y + lh, loopX - loopScaleX + loopW, timeH]);
    const tl2 = place(el('div', { class: 'tl' }), [loopX - loopScaleX, 0, loopW, timeH]);
    labelsOn(tl2, xlab, xlo, xhi, 'x', xd);
    ts.append(tl2);
    scr.append(sc, panel, ts);
    return { cv, x: xk, y: yk };
  });

  // ---- the pictogram column (R-33; P-07, P-28) ----
  const RIGHT: Array<[string, PictoId]> = [['right:graphics', 'graphics'], ['right:freeze', 'freeze'], ['right:respMech', 'respMech'], ['right:saveLoop', 'saveLoop'], ['right:nebulizer', 'nebulizer'], ['right:help', 'help'], ['right:standby', 'standby']];
  const rkeys = RIGHT.map(([id, p], i) => {
    const x = ctl(id);
    const b = place(button('edp-rkey', id, picto(p)), [gv<number>(G.rkeyX), gv<number>(G.rkeyY0) + i * gv<number>(G.rkeyPitch), gv<number>(G.rkeyW), gv<number>(G.rkeyH)]);
    if (x.kind === 'unavailable' && x.word) b.setAttribute('aria-label', W(x.word));
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
  for (const [x, y, w, hh, id] of gv<Array<[number, number, number, number, string]>>(G.underKeys)) {
    const x2 = ctl(id);
    const inner = id === 'under:lock' ? picto('padlock') : el('span', { class: 'kw' }, x2.kind !== 'setting' && x2.kind !== 'limit' && x2.word ? W(x2.word) : '');
    const b = place(button('edp-hkey', id, el('span', { class: 'cap' }, inner)), [x - 6, y - 6, w + 12, hh + 12]);
    if (id === 'under:lock') b.setAttribute('aria-label', reason('lock'));
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
  const setUnsim = (b: HTMLElement, r: ReasonId | null) => (r ? describe(b, r) : undescribe(b));
  const paintTag = (els: TagEls, t: TagView) => {
    for (const which of ['hi', 'lo'] as const) {
      const b = els[which], lv = t[which];
      if (!b || !lv) continue;
      (b.querySelector('.tv') as HTMLElement).textContent = lv.text;
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
    const y0 = gv<number>(G.winEntryY0), eh = gv<number>(G.winEntryH), ep = gv<number>(G.winEntryPitch), inset = gv<number>(G.winEntryInset);
    w.entries.forEach((e, i) => {
      const at: Box = [inset, y0 + i * ep, box[2] - 2 * inset, eh];
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
      if (typeof t.value === 'string') k.v.textContent = t.value;
      else k.v.replaceChildren(picto(t.value.picto, t.value.o));
      k.u.textContent = t.unit;
      k.n.textContent = t.label;
      k.b.classList.toggle('sel', t.sel);
      k.b.classList.toggle('dim', t.dim);
      if (t.unsim) describe(k.b, t.unsim);
      else if (t.dim) { undescribe(k.b); k.b.setAttribute('aria-disabled', 'true'); }
      else undescribe(k.b);
    });
    for (const b of rkeys) b.classList.toggle('dim', v.rightDim.includes(b.dataset.ctl!));
    paintWindow(v);
    alarmBox.hidden = !v.alarm;
    if (v.alarm) { alarmBox.className = `edp-alarm ${v.alarm.priority}`; alarmBox.textContent = v.alarm.text; }
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
