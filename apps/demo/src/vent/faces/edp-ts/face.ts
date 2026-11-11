// The EDP-TS face (plan vent-skin-edp-ts.md §2, §4.3, §5, §6; pieces V1 and VF): the device drawn to the owner's
// photographs (device.ts, on one design grid scaled as a whole), painted from the View of the cockpit and the knob
// (view.ts), on the control table (controls.ts) and the knob (knob.ts) of V1, whose behaviour VF leaves exactly as it
// was. Every word, colour and layout number comes from face.json (data.ts; provenance.test.ts). The face carries no
// Persian (plan §6, VQ10). The maker is named in face.json's provenance and the docs, never drawn. OUTSIDE the drawn
// device: the simulator's strip (why a control does nothing yet, in a resident's words: brief 159, R20) and the
// "Simulator" handle that opens the instructor's tools; the drawer gains the switch that marks what is not simulated.
import type { Cockpit } from '../../core/cockpit.ts';
import type { FaceEnv, FaceModule } from '../../core/types.ts';
import { $, el } from '../../dom.ts';
import type { SimTools } from '../../sim-tools.ts';
import { DATA, LAYOUT, num, reason, word, type Leaf } from './data.ts';
import { applyTokens, createDevice, type Device } from './device.ts';
import css from './face.css?inline';
import { createKnob, type Knob } from './knob.ts';
import { EDP_SPEC } from './modes.ts';
import { viewOf } from './view.ts';

const SIM_WORD = 'Simulator'; // an app string outside the device (plan §6): Persian only through the app's table (env.translate)
const UNSIM_WORD = 'Show what is not simulated yet'; // the drawer's switch (brief 159, R20), an app string

/** The device scaled as a whole to the space it is given above the strip (R19: no reflow, no relative change). */
export function fitDevice(dev: HTMLElement, w: number, h: number): number {
  const G = DATA.layout.grid;
  const s = Math.min(w / (G.devW as Leaf<number>).v, h / (G.devH as Leaf<number>).v);
  dev.style.left = `${w / 2}px`;
  dev.style.top = `${h / 2}px`;
  dev.style.transform = `translate(-50%, -50%) scale(${s})`;
  return s;
}

/** The lanes and loops of the cockpit's buffer: a 12 s sweep (R-26), inspiration green and expiration red (R-30). */
export function drawTraces(d: Device, B: Cockpit['buf']): void {
  const ink = (k: string) => (DATA.colours as Record<string, Leaf<string>>)[k]!.v;
  const sized = (cv: HTMLCanvasElement) => {
    const w = Math.max(1, cv.parentElement!.offsetWidth * 2), h = Math.max(1, cv.parentElement!.offsetHeight * 2);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const g = cv.getContext('2d');
    if (g) g.clearRect(0, 0, w, h);
    return g;
  };
  // the white dotted zero line (research/57 P-11)
  const dotted = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => {
    g.setLineDash([3, 5]); g.strokeStyle = ink('inkLight'); g.lineWidth = 2;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]);
  };
  const paths = (g: CanvasRenderingContext2D, pts: Array<[number, number, boolean, boolean]>) => {
    for (const insp of [true, false]) {
      g.strokeStyle = ink(insp ? 'insp' : 'exp');
      g.lineWidth = 4; // the photographs' trace is about two screen pixels (P-11)
      g.lineJoin = 'round';
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
  const n = B.t.length;
  const sw = num(LAYOUT.sweepS);
  const val = (k: 'p' | 'v' | 'f', i: number) => (k === 'p' ? B.p[i]! : k === 'f' ? B.f[i]! : B.vb[i]! / 1000);
  for (const ln of d.lanes) {
    const g = sized(ln.cv);
    if (!g) continue;
    const w = ln.cv.width, h = ln.cv.height;
    const Y = (v: number) => h - ((v - ln.lo) / (ln.hi - ln.lo)) * h;
    dotted(g, 0, Y(0), w, Y(0));
    if (!n) continue;
    const tNow = B.t[n - 1]!;
    const pts: Array<[number, number, boolean, boolean]> = [];
    let px = -1;
    for (let i = 0; i < n; i++) {
      const t = B.t[i]!;
      if (t <= tNow - sw) continue;
      const x = ((t % sw) / sw) * w;
      pts.push([x, Y(Math.max(ln.lo, Math.min(ln.hi, val(ln.key, i)))), B.ph[i] !== 'exp', x < px]);
      px = x;
    }
    paths(g, pts);
  }
  let s = n - 1;
  while (s > 0 && !(B.ph[s] !== 'exp' && B.ph[s - 1] === 'exp')) s--;
  const rng = { p: [num(LAYOUT.pawMin), num(LAYOUT.pawMax)], v: [num(LAYOUT.vtMin), num(LAYOUT.vtMax)], f: [num(LAYOUT.flowMin), num(LAYOUT.flowMax)] } as const;
  for (const lp of d.loops) {
    const g = sized(lp.cv);
    if (!g) continue;
    const w = lp.cv.width, h = lp.cv.height;
    const X = (v: number) => ((v - rng[lp.x][0]) / (rng[lp.x][1] - rng[lp.x][0])) * w;
    const Y = (v: number) => h - ((v - rng[lp.y][0]) / (rng[lp.y][1] - rng[lp.y][0])) * h;
    dotted(g, 0, Y(0), w, Y(0));
    dotted(g, X(0), 0, X(0), h);
    const pts: Array<[number, number, boolean, boolean]> = [];
    for (let i = Math.max(0, s); i < n; i++) pts.push([X(val(lp.x, i)), Y(val(lp.y, i)), B.ph[i] !== 'exp', false]);
    paths(g, pts);
  }
}

function mountEdp(c: Cockpit, tools: SimTools, env: FaceEnv = {}): { draw(ts: number): void; stop(): void } {
  const knob: Knob = createKnob(c);
  const body = document.body;
  const style = el('style', { 'data-face': 'edp-ts' }, css);
  document.head.append(style);
  body.classList.add('edp-ts');
  const untoken = applyTokens(body);
  const screenHost = $('screen');
  const saved = [...screenHost.childNodes];

  const d = createDevice({ press: (id) => knob.press(id), touch: (w, i) => knob.touchRow(w, i), explain: (r) => knob.explain(r) });
  const root = el('main', { class: 'edp', 'aria-label': word('faceName') });
  root.append(el('h1', { class: 'edp-sr' }, word('faceName')), d.dev);
  screenHost.replaceChildren(root);

  // the knob: wheel, a drag around it, a press; arrows and Enter when focused (the device: turn, press: research/57 H-26)
  const knobEl = d.knob;
  let angle = 0;
  const turn = (n: number) => { angle += n * num(LAYOUT.knobDetentDeg); d.knobMark.style.transform = `rotate(${angle}deg)`; knob.turn(n); };
  knobEl.addEventListener('wheel', (e) => { e.preventDefault(); turn(e.deltaY < 0 ? 1 : -1); }, { passive: false });
  let drag: { a: number; moved: boolean } | null = null;
  const angleOf = (e: PointerEvent) => { const r = knobEl.getBoundingClientRect(); return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI; };
  knobEl.addEventListener('pointerdown', (e) => { drag = { a: angleOf(e), moved: false }; knobEl.setPointerCapture?.(e.pointerId); });
  knobEl.addEventListener('pointermove', (e) => {
    if (!drag) return;
    let dd = angleOf(e) - drag.a;
    if (dd > 180) dd -= 360;
    if (dd < -180) dd += 360;
    const det = num(LAYOUT.knobDetentDeg);
    if (Math.abs(dd) >= det) { const n = Math.trunc(dd / det); turn(n); drag.a += n * det; drag.moved = true; }
  });
  knobEl.addEventListener('pointerup', () => { if (drag && !drag.moved) knob.push(); drag = null; });
  knobEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); turn(1); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); turn(-1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); knob.push(); }
  });

  // OUTSIDE the device: the simulator's strip (the reason, the Simulator handle) and the reasons for assistive technology
  const why = el('span', { class: 'why', role: 'status' });
  const handle = el('button', { class: 'edp-simhandle', type: 'button' }) as HTMLButtonElement;
  handle.textContent = SIM_WORD;
  void env.translate?.(SIM_WORD).then((t) => { if (t) handle.textContent = t; }).catch(() => {});
  handle.onclick = () => tools.open();
  const strip = el('div', { class: 'edp-strip' }, why, handle);
  body.append(strip, d.reasons);

  // the drawer's switch: marks every control not simulated yet (off by default; face state only, never written to cfg,
  // which travels over the link)
  let showUnsim = false;
  const offSwitch = tools.addSection?.(() => {
    const cb = el('input', { type: 'checkbox' }) as HTMLInputElement;
    cb.checked = showUnsim;
    cb.onchange = () => { showUnsim = cb.checked; root.classList.toggle('edp-show-unsim', showUnsim); };
    return el('div', { class: 'dfld' }, el('label', { class: 'en' }, cb, UNSIM_WORD));
  });

  const fit = () => fitDevice(d.dev, innerWidth, innerHeight - num(DATA.layout.grid.stripH));
  fit();
  addEventListener('resize', fit);

  const render = () => {
    d.paint(viewOf(c, knob));
    const r = knob.note();
    why.textContent = r ? reason(r) : '';
  };
  const offs = [knob.onChange(render), c.onChange(() => render())];
  render();
  let lastRender = 0;
  return {
    draw(ts) {
      if (ts - lastRender > 250) { lastRender = ts; render(); }
      drawTraces(d, c.buf);
    },
    stop() {
      for (const off of offs) off();
      offSwitch?.();
      removeEventListener('resize', fit);
      strip.remove();
      d.reasons.remove();
      style.remove();
      body.classList.remove('edp-ts');
      untoken();
      screenHost.replaceChildren(...saved);
    },
  };
}

export const edpFace: FaceModule = { spec: EDP_SPEC, mount: mountEdp };
