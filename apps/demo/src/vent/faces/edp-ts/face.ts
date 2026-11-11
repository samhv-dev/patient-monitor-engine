// The EDP-TS face (plan vent-skin-edp-ts.md §2, §4.3, §5, §6, piece V1): the screen of research/57 §2 and the keys of
// §3 drawn from plain shapes (mock-up m1) on the cockpit core. It draws and takes input only: every control comes from
// the control table (controls.ts), the knob's state from knob.ts, every word, colour and layout number from face.json
// (data.ts; provenance.test.ts). The face carries no Persian (plan §6, VQ10): the device's words as the device prints
// them, the simulator's reasons in English. The maker and the device are named in face.json's provenance and the docs,
// never drawn: the bezel is plain. The "Simulator" handle outside the bezel opens the instructor's tools (an app string).
import { modeName, type VentConfig } from '@pme/ventilator';
import type { Cockpit } from '../../core/cockpit.ts';
import type { FaceEnv, FaceModule } from '../../core/types.ts';
import { $, el } from '../../dom.ts';
import type { SimTools } from '../../sim-tools.ts';
import { CONTROLS, formatIe, LIMITS, ROWS, SETTINGS, settingState, WINDOWS, type Ctl, type FaceMode, type Row, type WindowId } from './controls.ts';
import { DATA, dec, LAYOUT, num, reason, word, type Leaf, type ReasonId, type WordId } from './data.ts';
import css from './face.css?inline';
import { createKnob, type Knob } from './knob.ts';
import { alarmText, EDP_SPEC } from './modes.ts';

type Cfg = Readonly<VentConfig>;
const DEV_W = 1000;
const DEV_H = 724;
const SIM_WORD = 'Simulator'; // an app string outside the device (plan §6): Persian only through the app's table (env.translate)

const ctl = (id: string): Ctl => CONTROLS.find((x) => x.id === id) as Ctl;
const reasonEl = (r: ReasonId) => el('span', { class: 'r' }, reason(r));
const W = (id: WordId) => word(id);

function mountEdp(c: Cockpit, tools: SimTools, env: FaceEnv = {}): { draw(ts: number): void; stop(): void } {
  const knob: Knob = createKnob(c);
  const body = document.body;
  const style = el('style', { 'data-face': 'edp-ts' }, css);
  document.head.append(style);
  body.classList.add('edp-ts');
  for (const [k, l] of Object.entries(DATA.colours)) body.style.setProperty(`--edp-${k}`, (l as Leaf<string>).v);
  const screenHost = $('screen');
  const saved = [...screenHost.childNodes];

  // ---- the device ----
  const root = el('main', { class: 'edp', 'aria-label': W('faceName') });
  const dev = el('div', { class: 'edp-dev' });
  const scr = el('div', { class: 'edp-screen' });
  root.append(el('h1', { class: 'edp-sr' }, W('faceName')), dev);
  dev.append(scr);

  const btn = (cls: string, id: string, ...kids: Array<Node | string | null>) => {
    const b = el('button', { class: cls, type: 'button', 'data-ctl': id }, ...kids) as HTMLButtonElement;
    b.onclick = () => knob.press(id);
    return b;
  };
  const offBtn = (cls: string, id: string, label: Node | string | null) => {
    const x = ctl(id);
    const b = btn(`${cls} off`, id, label, x.kind === 'unavailable' ? reasonEl(x.reason) : null);
    b.setAttribute('aria-disabled', 'true');
    return b;
  };

  // header and top row (research/57 R-05 to R-07)
  const head = el('div', { class: 'edp-head' });
  const mn = el('div', { class: 'mn' });
  const date = el('span'), time = el('span');
  head.append(el('div', { class: 'edp-hdr' }, el('div', { class: 'cat' }, W('adl')), mn, el('div', { class: 'bk' }, W('backupOff')), el('div', { class: 'dt' }, date, time)));
  const TOP: Array<[WordId, WordId | null, WordId | null]> = [
    ['peakFlow', 'uLmin', null], ['ti', 'uS', null], ['te', 'uS', null], ['ie', null, 'current'], ['fTotal', 'uBpm', null], ['vt', 'uL', null], ['ve', 'uLmin', null], ['oxygen', 'uPct', null],
  ];
  const topV: HTMLElement[] = TOP.map(([n, u, cw]) => {
    const v = el('span', { class: 'v' });
    head.append(el('div', { class: 'edp-cell' }, v, u ? el('span', { class: 'u' }, W(u)) : el('span', { class: 'c' }, W(cw!)), el('span', { class: 'n' }, W(n))));
    return v;
  });

  // alarm-limit tags (research/57 R-11, R-12, L-17: the symbol says high or low)
  const tagEls = new Map<string, HTMLElement>();
  const tag = (id: string, side: 'hi' | 'lo') => {
    const x = ctl(id);
    const v = el('span', { class: 'tv' });
    // a tag is too small for its reason: the reason shows in the message bar when it is pressed (aria-label carries it)
    const b = btn(x.kind === 'unavailable' ? 'edp-tag off' : 'edp-tag', id);
    if (x.kind === 'unavailable') { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-label', reason(x.reason)); }
    b.prepend(el('span', { class: `sym ${side}` }), v);
    tagEls.set(id, b);
    return b;
  };
  const tags = el('div', { class: 'edp-tags' }, el('span'));
  const TAGS: Array<Array<[string, 'hi' | 'lo']>> = [[], [], [], [], [['tag:fHi', 'hi']], [['tag:vtHi', 'hi'], ['tag:vtLo', 'lo']], [['tag:mvHi', 'hi'], ['tag:mvLo', 'lo']], [['tag:o2Hi', 'hi'], ['tag:o2Lo', 'lo']]];
  for (const slot of TAGS) tags.append(el('div', { class: 'edp-tagpair' }, ...slot.map(([id, s]) => tag(id, s))));

  // message bar (R-13: four icons, the first lit; "Volume compensation", GP20)
  const msgTxt = el('span', { class: 'txt' });
  const msg = el('div', { class: 'edp-msg' }, el('span', { class: 'ico on' }), el('span', { class: 'ico' }), el('span', { class: 'ico' }), el('span', { class: 'ico' }), msgTxt);

  // left column (R-18 to R-25)
  const lv = (n: WordId) => { const v = el('div', { class: 'lv' }); return [el('div', { class: 'lab' }, W(n)), v] as const; };
  const lung = el('div', { class: 'lung' });
  const [pkL, pkV] = lv('peak');
  const [plL, plV] = lv('plateau');
  const [meL, meV] = lv('mean');
  const [peL, peV] = lv('peep');
  const left = el('div', { class: 'edp-left' }, el('div', { class: 'bat' }), lung, pkL, pkV, el('div', {}, W('trach')), el('div', {}, W('dashes')), plL, plV, meL, meV, peL, peV,
    tag('tag:peepHi', 'hi'), el('div', { class: 'lab' }, W('pressureLimits')), tag('tag:pmax', 'hi'), tag('tag:pLo', 'lo'));

  // curves and loops (R-26 to R-32)
  const lane = (title: WordId, lo: number, hi: number, labels: number[], decimals: number) => {
    const ax = el('div', { class: 'ax' });
    for (const v of labels) ax.append(el('span', { style: `top:${((hi - v) / (hi - lo)) * 100}%` }, v === 0 ? '0' : Math.abs(v).toFixed(decimals)));
    const cv = el('canvas') as HTMLCanvasElement;
    return { el: el('div', { class: 'edp-lane' }, ax, el('div', { style: 'position:relative;min-height:0' }, cv), el('span', { class: 'lt' }, W(title)), el('span', { class: 's' }, W('secs'))), cv, lo, hi };
  };
  const pawLo = num(LAYOUT.pawMin), pawHi = num(LAYOUT.pawMax), vtLo = num(LAYOUT.vtMin), vtHi = num(LAYOUT.vtMax), fLo = num(LAYOUT.flowMin), fHi = num(LAYOUT.flowMax);
  const lanes = {
    p: lane('paw', pawLo, pawHi, (LAYOUT.pawLabels as Leaf<number[]>).v, 0),
    v: lane('vtL', vtLo, vtHi, [vtHi, 0, vtLo], 1),
    f: lane('flowL', fLo, fHi, [fHi, 0, fLo], 0),
  };
  const loop = (y: WordId, x: WordId) => { const cv = el('canvas') as HTMLCanvasElement; return { el: el('div', { class: 'edp-loop' }, cv, el('span', { class: 'lt' }, W(y)), el('span', { class: 'lx' }, W(x))), cv }; };
  const loops = { vp: loop('vtL', 'paw'), fv: loop('flowL', 'vtL') };
  const curves = el('div', { class: 'edp-curves' }, lanes.p.el, lanes.v.el, lanes.f.el);
  const loopsEl = el('div', { class: 'edp-loops' }, loops.vp.el, loops.fv.el);

  // right column (R-33)
  const right = el('div', { class: 'edp-right' });
  for (const x of CONTROLS.filter((k) => k.region === 'right')) right.append(offBtn('edp-rkey', x.id, x.kind === 'unavailable' && x.word ? W(x.word) : null));

  // bottom row: the mode's settings (D-01, D-02, D-12)
  const bottom = el('div', { class: 'edp-bottom' });
  let rowOf: FaceMode | null = null;
  const keyEls = new Map<string, { b: HTMLElement; v: HTMLElement; u: HTMLElement; r: HTMLElement }>();
  const buildRow = (m: FaceMode) => {
    rowOf = m;
    bottom.replaceChildren();
    keyEls.clear();
    for (const id of ROWS[m]) {
      const s = SETTINGS[id]!;
      const v = el('span', { class: 'v' }), u = el('span', { class: 'u' }), r = el('span', { class: 'r' });
      const b = btn('edp-key', `key:${id}`, v, u, el('span', { class: 'n' }, W(s.word)));
      b.insertBefore(r, b.lastChild);
      keyEls.set(id, { b, v, u, r });
      bottom.append(b);
    }
  };

  // alarm box (R-16, R-17) and windows
  const alarmBox = el('div', { class: 'edp-alarm', role: 'alert' });
  alarmBox.hidden = true;
  const wins = el('div', { class: 'edp-wins' });
  scr.append(head, tags, msg, left, curves, loopsEl, right, bottom, alarmBox, wins);

  // hardware (H-01 to H-31)
  const lamp = (cls: string) => el('div', { class: `edp-lamp ${cls}` });
  const lampHigh = lamp('tri'), lampMed = lamp('circ');
  const knobMark = el('div', { class: 'mark' });
  const knobEl = el('button', { class: 'edp-knob', type: 'button', 'aria-label': W('knob'), 'data-ctl': 'side:knobPress' }, knobMark) as HTMLButtonElement;
  const hk = (id: string) => { const x = ctl(id); return x.kind === 'unavailable' ? offBtn('edp-hkey', id, x.word ? W(x.word) : null) : btn('edp-hkey', id, x.kind === 'action' && x.word ? W(x.word) : null); };
  const ctrlKey = hk('under:ctrl');
  dev.append(
    el('div', { class: 'edp-side' },
      el('div', { class: 'edp-lamps' }, el('div', {}, W('alarmSignals')), el('div', {}, W('ventInop')), lamp('tri'), el('div', {}, W('high')), lampHigh, el('div', {}, W('medLow')), lampMed),
      hk('side:alarmLimits'), hk('side:silence'), hk('side:menu'), hk('side:mode'), knobEl),
    el('div', { class: 'edp-under' },
      offBtn('edp-hkey', 'under:lock', el('span', { class: 'edp-lock', 'aria-hidden': 'true' })),
      hk('under:suction'), hk('under:manualInsp'), hk('under:inspExpPause'), ctrlKey, hk('under:esc'),
      el('div', { class: 'edp-power' }, el('span', { class: 'on' }, W('vac')), el('span', {}, W('battery')))),
  );
  dev.querySelector('[data-ctl="under:lock"]')?.setAttribute('aria-label', reason('v4'));

  // the knob: wheel, a drag around it, a press; arrows and Enter when focused (the device: turn, press: research/57 H-26)
  let angle = 0;
  const turn = (n: number) => { angle += n * num(LAYOUT.knobDetentDeg); knobMark.style.transform = `rotate(${angle}deg)`; knob.turn(n); };
  knobEl.addEventListener('wheel', (e) => { e.preventDefault(); turn(e.deltaY < 0 ? 1 : -1); }, { passive: false });
  let drag: { a: number; moved: boolean } | null = null;
  const angleOf = (e: PointerEvent) => { const r = knobEl.getBoundingClientRect(); return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI; };
  knobEl.addEventListener('pointerdown', (e) => { drag = { a: angleOf(e), moved: false }; knobEl.setPointerCapture?.(e.pointerId); });
  knobEl.addEventListener('pointermove', (e) => {
    if (!drag) return;
    let d = angleOf(e) - drag.a;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    const det = num(LAYOUT.knobDetentDeg);
    if (Math.abs(d) >= det) { const n = Math.trunc(d / det); turn(n); drag.a += n * det; drag.moved = true; }
  });
  knobEl.addEventListener('pointerup', () => { if (drag && !drag.moved) knob.push(); drag = null; });
  knobEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); turn(1); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); turn(-1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); knob.push(); }
  });

  screenHost.replaceChildren(root);
  const handle = el('button', { class: 'edp-simhandle', type: 'button' }) as HTMLButtonElement;
  handle.textContent = SIM_WORD;
  void env.translate?.(SIM_WORD).then((t) => { if (t) handle.textContent = t; }).catch(() => {});
  handle.onclick = () => tools.open();
  body.append(handle);

  const fit = () => {
    const s = Math.min(innerWidth / DEV_W, innerHeight / DEV_H);
    dev.style.transform = `translate(-50%, -50%) scale(${s})`;
  };
  fit();
  addEventListener('resize', fit);

  // ---- drawing the state ----
  const fmtDate = (d: Date) => [d.getDate(), d.getMonth() + 1, d.getFullYear() % 100].map((x) => String(x).padStart(2, '0')).join('/');
  const fmtTime = (d: Date) => [d.getHours(), d.getMinutes()].map((x) => String(x).padStart(2, '0')).join(':');
  const dashes = W('dashes');
  const keyIcon = (id: string, cfg: Cfg): SVGElement | null => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 34 26');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    if (id === 'riseTime') {
      // the slope of the rise: steep for a short time (research/57 T-23: an icon with no number)
      const [lo, hi] = [num(DATA.settings.riseTime.min), num(DATA.settings.riseTime.max)];
      const x = 4 + ((cfg.riseTime - lo) / (hi - lo)) * 22;
      path.setAttribute('d', `M3 23 L${x.toFixed(1)} 4 L31 4`);
    } else if (id === 'flowWaveform') path.setAttribute('d', cfg.flowPattern === 'square' ? 'M3 23 L3 5 L31 5 L31 23' : 'M3 23 L3 5 L31 18 L31 23');
    else return null;
    svg.append(path);
    return svg;
  };
  const renderRow = () => {
    const cfg = knob.shown();
    const m = knob.rowMode();
    if (m !== rowOf) buildRow(m);
    for (const [id, k] of keyEls) {
      const s = SETTINGS[id]!;
      const st = settingState(id, cfg);
      const sel = knob.pending.key === `key:${id}`;
      const v = sel ? (knob.pending.value as number) : s.read(cfg);
      const f = s.format(v, cfg);
      if (f === null) k.v.replaceChildren(keyIcon(id, cfg) ?? '');
      else k.v.textContent = f;
      const u = s.unit(cfg);
      k.u.textContent = u ? W(u) : '';
      k.b.className = 'edp-key' + (sel ? ' sel' : '') + (st === 'shown' ? ' shown' : '') + (typeof st === 'object' ? ' off' : '');
      k.r.textContent = typeof st === 'object' ? reason(st.reason) : '';
      if (typeof st === 'object' || st === 'shown') k.b.setAttribute('aria-disabled', 'true');
      else k.b.removeAttribute('aria-disabled');
    }
  };
  const renderTags = () => {
    for (const [id, b] of tagEls) {
      const tv = b.querySelector('.tv') as HTMLElement;
      const x = ctl(id);
      if (x.kind !== 'limit') { tv.textContent = dashes; continue; }
      const L = LIMITS[x.limit]!;
      const sel = knob.pending.key === id;
      tv.textContent = L.format(sel ? (knob.pending.value as number) : L.read(c.cfg));
      b.classList.toggle('sel', sel);
    }
  };
  const winEl = (id: WindowId, focusIdx: number, isTop: boolean) => {
    const def = WINDOWS[id];
    const items = knob.items(id);
    const rows = el('div', { class: 'rows' });
    def.rows.forEach((r: Row, i) => {
      const itemIdx = items.findIndex((it) => it.row === i && !it.cell);
      if (r.kind === 'off' || r.kind === 'mode-off') {
        rows.append(el('div', { class: 'edp-row off', 'aria-disabled': 'true' }, el('span', {}, W(r.word)), r.kind === 'off' && r.value ? el('span', {}, W(r.value)) : null, reasonEl(r.reason)));
        return;
      }
      if (r.kind === 'limits') {
        const cells = el('span', { class: 'cells' });
        for (const cell of r.cells) {
          const ci = items.findIndex((it) => it.row === i && it.cell === cell);
          const L = LIMITS[cell]!;
          const sel = knob.pending.key === `tag:${cell}`;
          const b = el('button', { class: 'edp-tag' + (sel ? ' sel' : '') + (isTop && ci === focusIdx && !sel ? ' focus' : ''), type: 'button' },
            el('span', { class: `sym ${L.side}` }), el('span', {}, L.format(sel ? (knob.pending.value as number) : L.read(c.cfg))));
          if (isTop && ci === focusIdx && !sel) b.style.outline = `3px solid var(--edp-selected)`;
          b.onclick = () => knob.touchRow(id, ci);
          cells.append(b);
        }
        const row = el('div', { class: 'edp-row' + (r.off ? ' off' : '') }, el('span', {}, W(r.word)), r.off ? reasonEl(r.off.reason) : cells);
        rows.append(row);
        return;
      }
      let value: Node | string | null = null;
      if (r.kind === 'open') value = W('more');
      if (r.kind === 'setting') {
        const s = SETTINGS[r.setting]!;
        const sel = knob.pending.key === `row:${r.setting}`;
        const st = settingState(r.setting, c.cfg);
        const v = sel ? (knob.pending.value as number) : s.read(c.cfg);
        const f = s.format(v, c.cfg);
        const u = s.unit(c.cfg);
        value = el('span', {}, f === null ? W('off') : f, u ? ` ${W(u)}` : '');
        if (typeof st === 'object') {
          rows.append(el('div', { class: 'edp-row off', 'aria-disabled': 'true' }, el('span', {}, W(r.word)), value, reasonEl(st.reason)));
          return;
        }
        if (sel) value = el('span', { class: 'edp-tag sel' }, value);
      }
      const b = el('button', { class: 'edp-row' + (isTop && itemIdx === focusIdx ? ' focus' : ''), type: 'button' }, el('span', {}, W(r.word)), value);
      b.onclick = () => knob.touchRow(id, itemIdx);
      rows.append(b);
    });
    return el('div', { class: 'edp-win', role: 'dialog', 'aria-label': W(def.title) }, el('div', { class: 't' }, W(def.title)), rows, def.footer ? el('div', { class: 'ft' }, W('footer')) : null);
  };
  const renderWins = () => {
    const ws = knob.windows();
    const out: HTMLElement[] = ws.slice(-2).map((w, i, a) => winEl(w.id, w.focus, i === a.length - 1 && !knob.confirming()));
    const m = knob.confirming();
    if (m) {
      out.push(el('div', { class: 'edp-win conf', role: 'dialog', 'aria-label': W('modeWord') },
        el('div', { class: 't' }, el('span', {}, W('modeWord')), ' ', el('span', {}, W(m as WordId))),
        el('p', {}, W('pressKnob')), el('p', {}, W('pressEsc'))));
    }
    wins.replaceChildren(...out);
  };
  const PRI = { high: 0, medium: 1, low: 2 } as const;
  const renderNumbers = () => {
    const r = c.record();
    const m = c.measured();
    const d = new Date();
    date.textContent = fmtDate(d);
    time.textContent = fmtTime(d);
    mn.textContent = modeName(c.cfg);
    const fx = (v: number | undefined, n: number) => (v === undefined || !Number.isFinite(v) ? dashes : v.toFixed(n));
    const ieNow = r ? (r.ti >= r.te ? r.ti / r.te - 1 : 1 - r.te / r.ti) : undefined;
    const vals = [fx(r?.peakFlowLpm, dec('mPeakFlow')), fx(r?.ti, dec('mTi')), fx(r?.te, dec('mTe')), ieNow === undefined ? dashes : formatIe(ieNow),
      fx(m.RR, dec('mF')), fx(m.VTE / 1000, dec('mVt')), fx(m.MV, dec('mVe')), fx(c.cfg.fio2, dec('mOxygen'))];
    vals.forEach((v, i) => { topV[i]!.textContent = v; });
    pkV.textContent = fx(m.PIP, dec('mPeak'));
    // Plateau: with a pause or a hold only (research/57 R-21)
    plV.textContent = c.cfg.mode === 'VC' && c.cfg.pause > 0 ? fx(m.PLAT, dec('mPlateau')) : dashes;
    meV.textContent = fx(m.Pmean, dec('mMean'));
    peV.textContent = fx(r?.peepEnd, dec('mPeep'));
    lung.classList.toggle('on', c.p.lastPtT !== null && c.p.t - c.p.lastPtT < num(LAYOUT.lungIconS));
    // the alarm: the highest priority only (research/57 A-03); lamps steady (flashing and latching are V3's, plan GA16)
    const act = [...c.alarms().active].sort((a, b) => PRI[a.priority] - PRI[b.priority]);
    const top = act[0];
    alarmBox.hidden = !top;
    if (top) { alarmBox.className = `edp-alarm ${top.priority}`; alarmBox.textContent = alarmText(top.id); }
    lampHigh.classList.toggle('on-high', act.some((a) => a.priority === 'high'));
    lampMed.classList.toggle('on-med', act.some((a) => a.priority !== 'high'));
    const why = knob.note();
    msgTxt.textContent = why ? reason(why) : W('volComp');
    msgTxt.classList.toggle('why', why !== null);
    ctrlKey.classList.toggle('lit', knob.ctrl());
  };
  const render = () => { renderNumbers(); renderRow(); renderTags(); renderWins(); };

  // canvases: a 12 s sweep left to right (R-26), inspiration green, expiration red (R-30); loops of the current breath (V-14)
  const ink = (k: string) => (DATA.colours as Record<string, Leaf<string>>)[k]!.v;
  const sized = (cv: HTMLCanvasElement) => {
    const w = Math.max(1, cv.parentElement!.offsetWidth * 2), h = Math.max(1, cv.parentElement!.offsetHeight * 2);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const g = cv.getContext('2d');
    if (g) g.clearRect(0, 0, w, h);
    return g;
  };
  const zero = (g: CanvasRenderingContext2D, y: number, w: number) => {
    g.setLineDash([4, 4]); g.strokeStyle = ink('grid'); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); g.setLineDash([]);
  };
  const drawPaths = (g: CanvasRenderingContext2D, pts: Array<[number, number, boolean, boolean]>) => {
    // pts: [x, y, inspiration, break-before]
    for (const insp of [true, false]) {
      g.strokeStyle = ink(insp ? 'insp' : 'exp');
      g.lineWidth = 3;
      g.beginPath();
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1]!;
        const [x, y, ph, brk] = pts[i]!;
        if (brk || ph !== insp) continue;
        g.moveTo(x0, y0);
        g.lineTo(x, y);
      }
      g.stroke();
    }
  };
  const drawLanes = () => {
    const B = c.buf;
    const n = B.t.length;
    const sw = num(LAYOUT.sweepS);
    for (const [key, ln] of Object.entries(lanes) as Array<['p' | 'v' | 'f', (typeof lanes)['p']]>) {
      const g = sized(ln.cv);
      if (!g) continue;
      const w = ln.cv.width, h = ln.cv.height;
      const Y = (v: number) => h - ((v - ln.lo) / (ln.hi - ln.lo)) * h;
      zero(g, Y(0), w);
      if (!n) continue;
      const tNow = B.t[n - 1]!;
      const pts: Array<[number, number, boolean, boolean]> = [];
      let px = -1;
      for (let i = 0; i < n; i++) {
        const t = B.t[i]!;
        if (t <= tNow - sw) continue;
        const x = ((t % sw) / sw) * w;
        const val = key === 'p' ? B.p[i]! : key === 'f' ? B.f[i]! : B.vb[i]! / 1000;
        pts.push([x, Y(Math.max(ln.lo, Math.min(ln.hi, val))), B.ph[i] !== 'exp', x < px]);
        px = x;
      }
      drawPaths(g, pts);
    }
  };
  const drawLoops = () => {
    const B = c.buf;
    const n = B.t.length;
    let s = n - 1;
    while (s > 0 && !(B.ph[s] !== 'exp' && B.ph[s - 1] === 'exp')) s--;
    for (const [lp, xs, ys] of [[loops.vp, 'p', 'v'], [loops.fv, 'v', 'f']] as const) {
      const g = sized(lp.cv);
      if (!g) continue;
      const w = lp.cv.width, h = lp.cv.height;
      const rng = { p: [pawLo, pawHi], v: [vtLo, vtHi], f: [fLo, fHi] } as const;
      const X = (v: number) => ((v - rng[xs][0]) / (rng[xs][1] - rng[xs][0])) * w;
      const Y = (v: number) => h - ((v - rng[ys][0]) / (rng[ys][1] - rng[ys][0])) * h;
      zero(g, Y(0), w);
      const val = (k: 'p' | 'v' | 'f', i: number) => (k === 'p' ? B.p[i]! : k === 'f' ? B.f[i]! : B.vb[i]! / 1000);
      const pts: Array<[number, number, boolean, boolean]> = [];
      for (let i = Math.max(0, s); i < n; i++) pts.push([X(val(xs, i)), Y(val(ys, i)), B.ph[i] !== 'exp', false]);
      drawPaths(g, pts);
    }
  };

  const offs = [knob.onChange(render), c.onChange(() => render())];
  render();
  let lastRender = 0;
  return {
    draw(ts) {
      if (ts - lastRender > 250) { lastRender = ts; render(); }
      drawLanes();
      drawLoops();
    },
    stop() {
      for (const off of offs) off();
      removeEventListener('resize', fit);
      handle.remove();
      style.remove();
      body.classList.remove('edp-ts');
      for (const k of Object.keys(DATA.colours)) body.style.removeProperty(`--edp-${k}`);
      screenHost.replaceChildren(...saved);
    },
  };
}

export const edpFace: FaceModule = { spec: EDP_SPEC, mount: mountEdp };
