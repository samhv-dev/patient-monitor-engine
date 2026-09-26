// The v1.9 Hamilton-style front end (ventilator-sim-hamilton.html "UI" block), ported to TypeScript and
// rendering from @pme/ventilator instead of page globals. Markup and CSS are the original's (vent-hamilton.html).
// Deviations from v1.9, all forced by the live patient behind the ventilator: Freeze freezes the DISPLAY only
// (the physics keeps running, as on a real ventilator); holds run on sim time (v1.9 ran 2 steps per frame);
// the sample buffers are filled here from the driver's steps.
import {
  bannerText, clamp, HAMILTON_MODES, loadPreset, manualBreath, MODE_MAP, modeName, pbw, PRESETS, resetPhysics, runScenario,
  SCENARIOS, lungBaseOf, setMode, silenceAlarms, toggleHold, DT, type PresetId, type VentConfig, type VentDriver, type VentMode,
} from '@pme/ventilator';

type Num = keyof { [K in keyof VentConfig as VentConfig[K] extends number ? K : never]: 1 };
type Bool = keyof { [K in keyof VentConfig as VentConfig[K] extends boolean ? K : never]: 1 };
const $ = (id: string) => document.getElementById(id) as HTMLElement;
function el(t: string, a: Record<string, string | number> = {}, ...k: Array<Node | string | null>): HTMLElement {
  const e = document.createElement(t);
  for (const n in a) {
    if (n === 'class') e.className = String(a[n]);
    else if (n === 'html') e.innerHTML = String(a[n]);
    else e.setAttribute(n, String(a[n]));
  }
  k.forEach((c) => c != null && e.append(c));
  return e;
}
const cssv = (v: string) => getComputedStyle(document.body).getPropertyValue(v).trim();

export function mountHamiltonUi(d: VentDriver): { stop(): void } {
  const vs = d.vs;
  const S = vs.cfg;
  const P = vs.p;
  const num = S as unknown as Record<Num, number>;
  const bool = S as unknown as Record<Bool, boolean>;
  const BUF = { p: [] as number[], f: [] as number[], v: [] as number[], t: [] as number[] };
  let frozen = false;
  let numsDirty = true;
  let lastNumT = 0;
  let viewMode: 'graphics' | 'cockpit' = 'graphics';
  let cockpitPaw: HTMLCanvasElement | null = null;
  let lungCanvas: HTMLCanvasElement | null = null;
  let pendingMode: string | null = null;
  let sheetTab: 'basic' | 'more' | 'apnea' = 'basic';
  const M = () => P.shown ?? P.measured;
  /** The drawer edits the patient's lung: it becomes the lungState base (link/core.ts patchVent). */
  const syncBase = () => { d.core.lung.base = lungBaseOf(S); };
  const isSpontMode = () => S.mode === 'PSV' || S.mode === 'PAV';
  const vcTi = () => S.vt / 1000 / Math.max(0.05, S.vcFlow / 60);

  // ---- header ----
  function syncHeader() {
    $('mnMain').textContent = modeName(S);
    const b = bannerText(vs);
    const a = $('alarmBanner');
    a.className = b.cls;
    a.textContent = b.cls === 'silenced' ? `🔕 ${b.text}` : b.text;
  }
  // ---- numeric monitoring ----
  function buildNums() {
    const wrap = $('nums');
    const m = M();
    const tiles: Array<[string, string, string | number, boolean, string?]> = [
      ['RR', '/min', Math.round(m.RR), m.RR > 35, 'fTotal'],
      ['VTE', 'ml', Math.round(m.VTE), false],
      ['Ppeak', 'cmH₂O', Math.round(m.PIP), m.PIP > 35],
      ['MVe', 'l/min', m.MV.toFixed(1), m.MV > 12, 'ExpMinVol'],
      ['Pmean', 'cmH₂O', Math.round(m.Pmean), false],
    ];
    if (isSpontMode() && S.showP01) tiles.push(['P0.1', 'cmH₂O', m.P01.toFixed(1), m.P01 > 3.5]);
    wrap.innerHTML = '';
    tiles.forEach(([lab, u, val, warn, alt]) =>
      wrap.append(el('div', { class: 'num' + (warn ? ' warn' : '') }, el('div', { class: 'v' }, '' + val), el('div', { class: 'l', html: `${alt ?? lab} <span class="u">${u}</span>` }))),
    );
  }
  // ---- waveforms ----
  const LANES = [
    { key: 'p' as const, unit: 'Paw  cmH₂O', color: '--paw' },
    { key: 'f' as const, unit: 'Flow  l/min', color: '--flow' },
    { key: 'v' as const, unit: 'Volume  ml', color: '--vol' },
  ];
  const canvases: Partial<Record<'p' | 'f' | 'v', HTMLCanvasElement>> = {};
  function buildWaves() {
    const w = $('waves');
    w.innerHTML = '';
    LANES.forEach((l) => {
      const wv = el('div', { class: 'wv' });
      const cv = el('canvas') as HTMLCanvasElement;
      wv.append(cv);
      w.append(wv);
      canvases[l.key] = cv;
    });
    sizeCanvases();
  }
  function sizeOne(cv: HTMLCanvasElement | null | undefined) {
    if (!cv) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.clientWidth * DPR;
    cv.height = cv.clientHeight * DPR;
    cv.getContext('2d')?.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function sizeCanvases() {
    LANES.forEach((l) => sizeOne(canvases[l.key]));
    sizeOne(cockpitPaw);
    sizeOne(lungCanvas);
  }
  window.addEventListener('resize', sizeCanvases);
  function buildCockpit() {
    const c = $('cockpit');
    c.innerHTML = '';
    const paw = el('div', { class: 'cpaw' });
    cockpitPaw = el('canvas') as HTMLCanvasElement;
    paw.append(cockpitPaw);
    const low = el('div', { class: 'clow' });
    const lw = el('div', { id: 'lungWrap' });
    lungCanvas = el('canvas') as HTMLCanvasElement;
    lw.append(lungCanvas);
    const panels = el('div', { class: 'panels' });
    ['Oxygenation', 'CO₂ Elimination', 'Spont / Activity'].forEach((t) => {
      const p = el('div', { class: 'ipanel' });
      p.append(el('div', { class: 'pt' }, t), el('div', { class: 'bars' }));
      panels.append(p);
    });
    low.append(lw, panels);
    c.append(paw, low);
    sizeCanvases();
    updatePanels();
  }
  function updatePanels() {
    const m = M();
    const rsb = m.VTE > 10 ? m.RR / (m.VTE / 1000) : 0;
    const last = P.markers.slice(-8);
    const fspont = last.length ? Math.round((last.filter((k) => k.type === 'pt').length / Math.min(8, P.markers.length)) * 100) : 0;
    const defs: Array<Array<[string, number, number, number, string]>> = [
      [['Oxygen', S.fio2, 21, 100, '#46c9e0'], ['PEEP', S.peep, 0, 20, '#46c9e0']],
      [['MinVol', +m.MV.toFixed(1), 0, 20, '#40d47f'], ['Ppeak', Math.round(m.PIP), 0, 45, '#40d47f']],
      [['RSB', Math.round(rsb), 0, 150, '#ffd21e'], ['%Spont', fspont, 0, 100, '#ffd21e']],
    ];
    document.querySelectorAll('#cockpit .ipanel').forEach((p, i) => {
      const row = defs[i];
      if (!row) return;
      const bars = p.querySelector('.bars') as HTMLElement;
      bars.innerHTML = '';
      row.forEach(([nm, val, mn, mx, col]) => {
        const h = clamp((val - mn) / (mx - mn || 1), 0, 1) * 100;
        bars.append(el('div', { class: 'ibar' }, el('div', { class: 'val' }, '' + val), el('div', { class: 'fill', style: `height:${h}%;background:${col}` }), el('div', { class: 'nm' }, nm)));
      });
    });
  }
  function drawLung(cv: HTMLCanvasElement | null) {
    if (!cv) return;
    const cx = cv.getContext('2d') as CanvasRenderingContext2D;
    const W = cv.clientWidth;
    const H = cv.clientHeight;
    cx.clearRect(0, 0, W, H);
    const infl = clamp(P.V / Math.max(500, pbw(S) * 9), 0, 1);
    const comp = clamp(S.compliance / 55, 0.5, 1.15);
    const airwayW = clamp(13 - S.resistance * 0.22, 3.5, 13);
    const good = S.compliance >= 35 && S.resistance <= 15;
    const warn = S.compliance >= 24 && S.resistance <= 26;
    const border = good ? '#40d47f' : warn ? '#ffd21e' : '#e0625d';
    const cxm = W / 2, topY = H * 0.1, lobeTop = H * 0.26, lobeH = H * 0.48 * (0.62 + 0.38 * infl), lobeW = W * 0.17 * comp;
    cx.strokeStyle = '#a9c8ea'; cx.lineWidth = airwayW; cx.lineCap = 'round';
    cx.beginPath(); cx.moveTo(cxm, topY); cx.lineTo(cxm, lobeTop); cx.stroke();
    cx.lineWidth = Math.max(2, airwayW * 0.6);
    cx.beginPath(); cx.moveTo(cxm, lobeTop); cx.lineTo(cxm - lobeW * 0.5, lobeTop + lobeH * 0.16); cx.moveTo(cxm, lobeTop); cx.lineTo(cxm + lobeW * 0.5, lobeTop + lobeH * 0.16); cx.stroke();
    const lobe = (dir: number) => {
      const bt = lobeTop + lobeH * 0.1, bb = lobeTop + lobeH, bx = cxm + dir * lobeW * 0.6;
      const g = cx.createLinearGradient(0, bt, 0, bb);
      g.addColorStop(0, 'rgba(120,185,235,.92)'); g.addColorStop(1, 'rgba(40,105,170,.85)');
      cx.beginPath(); cx.moveTo(cxm + dir * airwayW * 0.4, bt);
      cx.quadraticCurveTo(bx + dir * lobeW, bt, bx + dir * lobeW * 1.05, (bt + bb) / 2);
      cx.quadraticCurveTo(bx + dir * lobeW * 0.85, bb, cxm + dir * lobeW * 0.18, bb - 2);
      cx.quadraticCurveTo(cxm + dir * airwayW * 0.3, (bt + bb) / 2, cxm + dir * airwayW * 0.4, bt);
      cx.closePath(); cx.fillStyle = g; cx.fill(); cx.strokeStyle = border; cx.lineWidth = 2.5; cx.lineJoin = 'round'; cx.stroke();
    };
    lobe(-1); lobe(1);
    const dy = lobeTop + lobeH + 5;
    cx.strokeStyle = '#4a6a92'; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(cxm - lobeW * 1.5, dy - 6 * (1 - infl)); cx.quadraticCurveTo(cxm, dy + 6 * infl, cxm + lobeW * 1.5, dy - 6 * (1 - infl)); cx.stroke();
    if (P.lastPtT !== null && P.t - P.lastPtT < 0.4) {
      cx.fillStyle = '#ff6b6b'; cx.beginPath(); cx.arc(cxm, topY - 1, 3.5 + 2.5 * Math.abs(Math.sin(P.t * 26)), 0, 7); cx.fill();
    }
    const m = M();
    const cst = m.PLAT > S.peep + 0.5 ? m.VTE / (m.PLAT - S.peep) : S.compliance;
    cx.textAlign = 'center'; cx.fillStyle = '#cfe0ff'; cx.font = '700 11px ' + cssv('--font');
    cx.fillText('Dynamic Lung', cxm, H - 28);
    cx.fillStyle = border; cx.font = '10px ' + cssv('--mono');
    cx.fillText(`Cstat ${cst > 0 ? cst.toFixed(0) : '--'}   Raw ${S.resistance}   VT ${Math.round(m.VTE)}`, cxm, H - 13);
  }
  function niceTicks(mn: number, mx: number, n: number) {
    const span = mx - mn;
    let step = Math.pow(10, Math.floor(Math.log10(span / n)));
    const e = span / n / step;
    if (e > 5) step *= 10; else if (e > 2) step *= 5; else if (e > 1) step *= 2;
    const t: number[] = [];
    for (let v = Math.ceil(mn / step) * step; v <= mx + 1e-6; v += step) t.push(v);
    return t;
  }
  function drawLaneOn(cv: HTMLCanvasElement | null | undefined, lane: (typeof LANES)[number]) {
    if (!cv) return;
    const cx = cv.getContext('2d') as CanvasRenderingContext2D;
    const W = cv.clientWidth, H = cv.clientHeight;
    cx.clearRect(0, 0, W, H);
    const mL = 34, mR = 6, mT = 12, mB = 13, plotW = W - mL - mR, plotH = H - mT - mB, n = BUF.t.length, sweep = S.sweepSec, arr = BUF[lane.key];
    let mn: number, mx: number;
    if (lane.key === 'p') { mn = -10; let hi = 30; for (let i = 0; i < n; i++) hi = Math.max(hi, arr[i] as number); mx = Math.max(30, Math.ceil(hi / 5) * 5); }
    else if (lane.key === 'f') { let Mx = 40; for (let i = 0; i < n; i++) Mx = Math.max(Mx, Math.abs(arr[i] as number)); Mx = Math.ceil(Mx / 10) * 10; mn = -Mx; mx = Mx; }
    else { mn = 0; let hi = 100; for (let i = 0; i < n; i++) hi = Math.max(hi, arr[i] as number); mx = Math.max(100, Math.ceil(hi / 50) * 50 + 50); }
    const span = mx - mn || 1;
    const xOf = (t: number) => mL + ((((t % sweep) + sweep) % sweep) / sweep) * plotW;
    const yOf = (v: number) => mT + plotH - ((v - mn) / span) * plotH;
    cx.font = '9px ' + cssv('--font'); cx.textBaseline = 'middle'; cx.strokeStyle = cssv('--grid'); cx.lineWidth = 1;
    niceTicks(mn, mx, 4).forEach((v) => {
      const y = yOf(v);
      cx.beginPath(); cx.moveTo(mL, y); cx.lineTo(W - mR, y); cx.stroke();
      if (y > mT + 10) { cx.fillStyle = cssv('--dim'); cx.textAlign = 'right'; cx.fillText(Math.abs(v) < 1 ? '0' : '' + Math.round(v), mL - 3, y); }
    });
    cx.textAlign = 'center'; cx.textBaseline = 'top';
    for (let s = 0; s <= sweep; s += 2) {
      const x = mL + (s / sweep) * plotW;
      cx.strokeStyle = cssv('--grid'); cx.beginPath(); cx.moveTo(x, mT); cx.lineTo(x, mT + plotH); cx.stroke();
      cx.fillStyle = cssv('--dim'); cx.fillText('' + s, x, mT + plotH + 2);
    }
    cx.textAlign = 'left'; cx.fillStyle = cssv('--numlab'); cx.font = '9px ' + cssv('--font'); cx.fillText(lane.unit, 2, 2);
    if (lane.key === 'p') { cx.strokeStyle = cssv('--redline'); cx.setLineDash([5, 3]); const yh = yOf(Math.min(mx, S.pmax)); cx.beginPath(); cx.moveTo(mL, yh); cx.lineTo(W - mR, yh); cx.stroke(); cx.setLineDash([]); }
    if (lane.key === 'f') { cx.strokeStyle = cssv('--zero'); cx.setLineDash([3, 3]); const yz = yOf(0); cx.beginPath(); cx.moveTo(mL, yz); cx.lineTo(W - mR, yz); cx.stroke(); cx.setLineDash([]); }
    cx.save(); cx.beginPath(); cx.rect(mL, mT, plotW, plotH); cx.clip();
    if (n >= 2) {
      const tEnd = BUF.t[n - 1] as number, xc = xOf(tEnd), gap = Math.max(7, plotW * 0.02), win = 2;
      const pts: Array<{ x: number; y: number; wrap: boolean }> = [];
      let px: number | null = null;
      for (let i = 0; i < n; i++) {
        const t = BUF.t[i] as number;
        if (tEnd - t >= sweep) continue;
        let s = 0, c = 0;
        for (let k = -win; k <= win; k++) { const j = i + k; if (j >= 0 && j < n) { s += arr[j] as number; c++; } }
        pts.push({ x: xOf(t), y: yOf(s / c), wrap: px != null && xOf(t) < px - plotW * 0.5 });
        px = xOf(t);
      }
      cx.strokeStyle = cssv(lane.color); cx.lineWidth = 1.8; cx.lineJoin = 'round'; cx.lineCap = 'round'; cx.beginPath();
      let started = false;
      let prev: { x: number; y: number } | null = null;
      for (const p of pts) {
        if (!started || p.wrap || !prev) { cx.moveTo(p.x, p.y); started = true; prev = p; continue; }
        cx.quadraticCurveTo(prev.x, prev.y, (prev.x + p.x) / 2, (prev.y + p.y) / 2);
        prev = p;
      }
      if (prev && started) cx.lineTo(prev.x, prev.y);
      cx.stroke();
      cx.fillStyle = '#061530';
      if (xc + gap <= W - mR) cx.fillRect(xc, mT, gap, plotH);
      else { cx.fillRect(xc, mT, W - mR - xc, plotH); cx.fillRect(mL, mT, xc + gap - (W - mR), plotH); }
      if (frozen || vs.hold) { cx.strokeStyle = cssv('--dim'); cx.setLineDash([4, 4]); cx.beginPath(); cx.moveTo(xc, mT); cx.lineTo(xc, mT + plotH); cx.stroke(); cx.setLineDash([]); }
      if (lane.key === 'p') {
        P.markers.forEach((mk) => {
          if (tEnd - mk.t >= sweep || mk.type !== 'pt') return;
          const x = xOf(mk.t);
          cx.fillStyle = cssv('--redline'); cx.beginPath(); cx.moveTo(x, mT + plotH - 7); cx.lineTo(x - 4, mT + plotH); cx.lineTo(x + 4, mT + plotH); cx.closePath(); cx.fill();
        });
      }
    }
    cx.restore();
  }
  // ---- round setting buttons (right rail) ----
  const HKNOBS: Record<VentMode, Array<[Num, string, string]>> = {
    VC: [['vt', 'VT', 'ml'], ['rate', 'Rate', 'b/min'], ['peep', 'PEEP', 'cmH₂O'], ['fio2', 'Oxygen', '%']],
    PC: [['pc', 'Pinsp', 'cmH₂O'], ['rate', 'Rate', 'b/min'], ['itime', 'Ti', 's'], ['peep', 'PEEP', 'cmH₂O'], ['fio2', 'Oxygen', '%']],
    PRVC: [['prvcTarget', 'VT', 'ml'], ['rate', 'Rate', 'b/min'], ['itime', 'Ti', 's'], ['peep', 'PEEP', 'cmH₂O'], ['fio2', 'Oxygen', '%']],
    PSV: [['ps', 'Psupp', 'cmH₂O'], ['peep', 'PEEP', 'cmH₂O'], ['cycleOff', 'ETS', '%'], ['fio2', 'Oxygen', '%']],
    PAV: [['pavAssist', '%Supp', '%'], ['peep', 'PEEP', 'cmH₂O'], ['fio2', 'Oxygen', '%']],
  };
  const KRANGE: Partial<Record<Num, [number, number, number]>> = { peep: [0, 20, 1], vt: [150, 800, 10], vcFlow: [10, 120, 1], rate: [4, 40, 1], pause: [0, 0.6, 0.05], fio2: [21, 100, 1], pc: [5, 40, 1], itime: [0.3, 2.5, 0.05], riseTime: [0.02, 0.6, 0.01], prvcTarget: [150, 800, 10], pmax: [15, 60, 1], ps: [0, 40, 1], cycleOff: [5, 70, 1], pavAssist: [10, 90, 5] };
  function buildRail() {
    const rail = $('rail');
    rail.innerHTML = '';
    HKNOBS[S.mode].forEach(([key, lab, u]) => {
      const [min, max, step] = KRANGE[key] ?? [0, 100, 1];
      const dl = el('div', { class: 'dial', 'data-key': key });
      const dv = el('div', { class: 'dv' }, '');
      dl.append(dv, el('div', { class: 'du' }, u), el('div', { class: 'dl' }, lab));
      const show = () => (dv.textContent = step < 1 ? (+num[key]).toFixed(step < 0.1 ? 2 : 1) : '' + num[key]);
      const change = (v: number) => { num[key] = clamp(Math.round(v / step) * step, min, max); show(); numsDirty = true; };
      show();
      let dg = false, sy = 0, sv = 0;
      dl.onpointerdown = (e) => { dg = true; sy = e.clientY; sv = num[key]; try { dl.setPointerCapture(e.pointerId); } catch { /* synthetic events */ } dl.classList.add('turning'); e.preventDefault(); };
      dl.onpointermove = (e) => { if (dg) change(sv + Math.round((sy - e.clientY) / 4) * step); };
      const end = () => { dg = false; dl.classList.remove('turning'); };
      dl.onpointerup = end; dl.onpointercancel = end;
      dl.onwheel = (e) => { e.preventDefault(); change(num[key] + (e.deltaY < 0 ? step : -step)); };
      dl.ondblclick = () => openSheet('controls');
      rail.append(dl);
    });
    const ctrl = el('div', { class: 'railbtn' }, 'Controls'); ctrl.onclick = () => openSheet('controls');
    const alarms = el('div', { class: 'railbtn' }, 'Alarms'); alarms.onclick = () => openSheet('alarms');
    rail.append(ctrl, alarms);
    const mini = el('div', { class: 'railmini' });
    const mk = (t: string, fn: () => void, on = false) => { const b = el('div', { class: 'railbtn' + (on ? ' on' : '') }, t); b.onclick = fn; return b; };
    mini.append(
      mk(frozen ? 'Resume' : 'Freeze', () => { frozen = !frozen; buildRail(); }, frozen),
      mk('Insp hold', () => { toggleHold(vs, 'insp'); buildRail(); }, vs.hold === 'insp'),
      mk('Exp hold', () => { toggleHold(vs, 'exp'); buildRail(); }, vs.hold === 'exp'),
      mk('Patient', () => openDrawer()),
      mk('Man. breath', () => manualBreath(vs)),
      mk('Reset', () => { resetPhysics(vs); clearBuf(); }),
    );
    rail.append(mini);
  }
  // ---- settings sheet ----
  function sld(key: Num, label: string, min: number, max: number, step: number, unit: string, fmt?: (v: number) => string, after?: () => void) {
    const f = el('div', { class: 'fld' });
    const lab = el('div', { class: 'lab' });
    lab.append(el('span', {}, label), el('span', { class: 'u' }));
    const inp = el('input', { type: 'range', min, max, step, value: num[key] }) as HTMLInputElement;
    inp.dataset.key = key;
    const upd = () => ((lab.querySelector('.u') as HTMLElement).textContent = (fmt ? fmt(num[key]) : num[key]) + (unit ? ' ' + unit : ''));
    inp.oninput = () => { num[key] = parseFloat(inp.value); upd(); after?.(); numsDirty = true; buildRail(); };
    f.append(lab, inp);
    upd();
    return f;
  }
  function numFld(key: Num, label: string) {
    const f = el('div', { class: 'fld' });
    f.append(el('div', { class: 'lab' }, el('span', {}, label)));
    const inp = el('input', { type: 'number', value: num[key] }) as HTMLInputElement;
    inp.oninput = () => { const v = parseFloat(inp.value); if (!Number.isNaN(v)) { num[key] = v; numsDirty = true; buildRail(); } };
    f.append(inp);
    return f;
  }
  function seg<K extends 'flowPattern' | 'trigType'>(key: K, label: string, opts: Array<[VentConfig[K], string]>) {
    const f = el('div', { class: 'fld' });
    if (label) f.append(el('div', { class: 'lab' }, el('span', {}, label)));
    const g = el('div', { class: 'seg2' });
    opts.forEach(([v, t]) => {
      const b = el('button', {}, t);
      if (S[key] === v) b.classList.add('on');
      b.onclick = () => { S[key] = v; [...g.children].forEach((c) => c.classList.remove('on')); b.classList.add('on'); buildRail(); };
      g.append(b);
    });
    f.append(g);
    return f;
  }
  function sheetTog(key: Bool, label: string, after?: () => void) {
    const f = el('div', { class: 'fld' });
    const w = el('label', { class: 'en', style: 'font-size:13px;color:var(--ink);gap:8px' });
    const c = el('input', { type: 'checkbox' }) as HTMLInputElement;
    c.checked = bool[key];
    c.onchange = () => { bool[key] = c.checked; after?.(); buildRail(); };
    w.append(c, label);
    f.append(w);
    return f;
  }
  function ieHelper() {
    const Ti = vcTi(), period = 60 / Math.max(4, S.rate), te = Math.max(0.05, period - Ti - S.pause);
    return el('div', { class: 'helper', id: 'ieh' }, `Ti ${Ti.toFixed(2)}s · I:E 1:${(te / Ti).toFixed(1)}`);
  }
  function buildSheet(which: 'modes' | 'controls' | 'alarms') {
    $('sheetTitle').textContent = { modes: 'Modes', controls: 'Controls', alarms: 'Alarms' }[which];
    const b = $('sheetBody');
    b.innerHTML = '';
    if (which === 'modes') return buildModes(b);
    if (which === 'alarms') return buildAlarms(b);
    const tabs = el('div', { class: 'sheettabs' });
    ([['basic', 'Basic'], ['more', 'More'], ['apnea', 'Apnea']] as const).forEach(([k, t]) => {
      const bt = el('button', { class: 'stab' + (sheetTab === k ? ' on' : '') }, t);
      bt.onclick = () => { sheetTab = k; buildSheet('controls'); };
      tabs.append(bt);
    });
    b.append(tabs);
    const g = el('div', { class: 'sheetgrid' });
    if (sheetTab === 'basic') buildBasic(g); else if (sheetTab === 'more') buildMore(g); else buildApnea(g);
    b.append(g);
  }
  function buildModes(b: HTMLElement) {
    b.append(el('div', { class: 'helper' }, 'Select a mode, then Confirm. (All modes drive the same single-compartment lung model — the point is navigating the menu.)'));
    pendingMode ??= modeName(S);
    HAMILTON_MODES.forEach(([grp, list]) => {
      b.append(el('div', { class: 'modegrp' }, grp));
      const row = el('div', { class: 'moderow' });
      list.forEach(([nm]) => {
        const bt = el('button', { class: 'modebtn' + (pendingMode === nm ? ' on' : '') }, nm);
        bt.onclick = () => { pendingMode = nm; buildSheet('modes'); };
        row.append(bt);
      });
      b.append(row);
    });
    const foot = el('div', { class: 'modefoot' });
    const cancel = el('button', { class: 'railbtn' }, 'Cancel');
    cancel.onclick = () => { pendingMode = null; closeSheet(); };
    const confirm = el('button', { class: 'railbtn on' }, 'Confirm');
    confirm.onclick = () => { const nm = pendingMode ?? '(S)CMV+'; setMode(vs, MODE_MAP[nm] ?? 'VC'); S.modeLabel = nm; pendingMode = null; syncAll(); closeSheet(); };
    foot.append(cancel, confirm);
    b.append(foot);
  }
  function buildBasic(g: HTMLElement) {
    g.append(sld('peep', 'PEEP / CPAP', 0, 20, 1, 'cmH₂O'));
    if (S.mode === 'VC') {
      g.append(numFld('vt', 'Tidal Volume (ml)'));
      const fl = el('div');
      fl.append(sld('vcFlow', 'Flow', 10, 120, 1, 'l/min', undefined, () => document.getElementById('ieh')?.replaceWith(ieHelper())), ieHelper());
      g.append(fl, sld('rate', 'Rate', 4, 40, 1, 'b/min'));
    } else if (S.mode === 'PC') g.append(sld('pc', 'Pcontrol (Pinsp)', 5, 40, 1, 'cmH₂O'), sld('rate', 'Rate', 4, 40, 1, 'b/min'), sld('itime', 'Ti', 0.3, 2.5, 0.05, 's', (v) => v.toFixed(2)));
    else if (S.mode === 'PRVC') g.append(sld('prvcTarget', 'Target VT', 150, 800, 10, 'ml'), sld('rate', 'Rate', 4, 40, 1, 'b/min'), sld('itime', 'Ti', 0.3, 2.5, 0.05, 's', (v) => v.toFixed(2)));
    else if (S.mode === 'PSV') g.append(sld('ps', 'Psupport', 0, 40, 1, 'cmH₂O'), sld('cycleOff', 'ETS (exp. trigger)', 5, 70, 1, '%'));
    else g.append(sld('pavAssist', '% Support', 10, 90, 5, '%'));
    g.append(sld('fio2', 'Oxygen', 21, 100, 1, '%'));
  }
  function buildMore(g: HTMLElement) {
    g.append(sld('riseTime', 'Pramp (rise time)', 0.02, 0.6, 0.01, 's', (v) => v.toFixed(2)));
    if (S.mode === 'VC') g.append(seg('flowPattern', 'Flow Pattern', [['square', 'Constant'], ['decel', 'Decel']]), sld('pause', 'Insp. Pause', 0, 0.6, 0.05, 's', (v) => v.toFixed(2)));
    if (S.mode === 'PRVC') g.append(sld('pmax', 'Pmax', 15, 60, 1, 'cmH₂O'));
    g.append(seg('trigType', 'Trigger type', [['pressure', 'P-trig'], ['flow', 'Flowtrigger']]));
    g.append(sld('flowTrig', 'Trigger sens.', 0.3, 10, 0.1, 'l/min', (v) => v.toFixed(1)));
    g.append(sheetTog('sigh', 'Sigh (a deep breath every ~50 breaths)'));
    g.append(sheetTog('trc', 'TRC — Tube Resistance Compensation', () => buildSheet('controls')));
    if (S.trc) g.append(sld('trcPct', 'TRC compensation', 0, 100, 5, '%'));
  }
  function buildApnea(g: HTMLElement) {
    g.append(el('div', { class: 'helper', style: 'grid-column:1/-1' }, 'Apnea backup takes over if no breath is detected within the apnea time (available in spontaneous modes).'));
    g.append(sheetTog('backup', 'Apnea backup ventilation'), sld('apneaTime', 'Apnea time', 10, 60, 1, 's'), sld('backupRate', 'Backup rate', 6, 30, 1, 'b/min'));
  }
  function buildAlarms(b: HTMLElement) {
    b.append(el('div', { class: 'helper' }, 'Set alarm limits — crossing one raises the banner alarm (high-priority in red). Tap the banner to silence for 2 min.'));
    const g = el('div', { class: 'sheetgrid' });
    g.append(
      sld('pmax', 'Pressure limit (Pmax)', 15, 70, 1, 'cmH₂O'),
      sld('almMVlo', 'ExpMinVol low', 0, 20, 0.5, 'l/min', (v) => v.toFixed(1)),
      sld('almMVhi', 'ExpMinVol high', 1, 30, 0.5, 'l/min', (v) => v.toFixed(1)),
      sld('almFlo', 'fTotal low', 0, 40, 1, 'b/min'),
      sld('almFhi', 'fTotal high', 10, 80, 1, 'b/min'),
      sld('almVTlo', 'Vt low', 0, 800, 10, 'ml'),
      sld('almVThi', 'Vt high', 200, 2000, 10, 'ml'),
      sld('apneaTime', 'Apnea time', 10, 60, 1, 's'),
    );
    b.append(g);
  }
  // ---- patient drawer ----
  function dSld(key: Num, label: string, min: number, max: number, step: number, unit: string, fmt?: (v: number) => string, status?: () => string) {
    const f = el('div', { class: 'dfld' });
    const lab = el('div', { class: 'lab' });
    const txt = () => `${label}: ${fmt ? fmt(num[key]) : num[key]}${unit ? ' ' + unit : ''}`;
    lab.append(el('span', {}, txt()));
    const inp = el('input', { type: 'range', min, max, step, value: num[key] }) as HTMLInputElement;
    const st = status ? el('div', { class: 'status' }, status()) : null;
    inp.oninput = () => { num[key] = parseFloat(inp.value); syncBase(); (lab.firstChild as HTMLElement).textContent = txt(); if (st && status) st.textContent = status(); numsDirty = true; buildRail(); };
    f.append(lab, inp);
    if (st) f.append(st);
    return f;
  }
  function dTog(key: Bool, label: string) {
    const en = el('label', { class: 'en' });
    const c = el('input', { type: 'checkbox' }) as HTMLInputElement;
    c.checked = bool[key];
    c.onchange = () => { bool[key] = c.checked; syncBase(); buildDrawer(); };
    en.append(c, 'Enable');
    return el('div', { class: 'dfld' }, el('div', { class: 'lab' }, el('span', {}, label), en));
  }
  function buildDrawer() {
    const dc = $('dcols');
    dc.innerHTML = '';
    const L = el('div'), R = el('div');
    L.append(el('h3', {}, 'Patient Characteristics'));
    const pr = el('div', { class: 'presets' });
    (Object.entries(PRESETS) as Array<[PresetId, (typeof PRESETS)[PresetId]]>).forEach(([id, p]) => {
      const b = el('button', { class: p.cls }, p.label);
      b.onclick = () => { loadPreset(vs, id); syncBase(); syncAll(); };
      pr.append(b);
    });
    L.append(el('div', { style: 'font-size:12px;color:var(--numlab);margin-bottom:6px' }, 'Presets'), pr);
    L.append(dSld('compliance', 'Compliance', 10, 90, 1, 'ml/cmH₂O', undefined, () => (S.compliance >= 40 ? 'Normal' : S.compliance >= 25 ? 'Reduced' : 'Severely reduced')));
    L.append(dSld('resistance', 'Resistance', 5, 50, 1, 'cmH₂O/l/s', undefined, () => (S.resistance <= 15 ? 'Normal' : S.resistance <= 25 ? 'Elevated' : 'High')));
    const tau = (S.resistance * S.compliance) / 1000;
    L.append(el('div', { class: 'dfld' }, el('div', { class: 'lab' }, el('span', {}, `Time Constant τ: ${tau.toFixed(2)} s`)), el('div', { class: 'status', style: 'color:var(--numlab)' }, `95% equilibration ${(3 * tau).toFixed(2)} s`)));
    L.append(el('div', { class: 'hr' }), dTog('airwayClosure', 'Airway Closure'));
    if (S.airwayClosure) L.append(dSld('recruitedVol', 'Recruited Volume', 0, 400, 10, 'ml'), dSld('openPressure', 'Opening Pressure', 0, 25, 1, 'cmH₂O'));
    L.append(el('div', { class: 'hr' }), dTog('stressIdx', 'Stress Index'));
    if (S.stressIdx) L.append(dSld('stressB', 'Stress Index', 0.7, 1.4, 0.01, '', (v) => v.toFixed(2), () => (S.stressB < 0.9 ? 'SI<0.9 concave' : S.stressB > 1.1 ? 'SI>1.1 convex' : 'SI 0.9–1.1 normal')));
    L.append(el('div', { class: 'hr' }), dTog('reverseTrig', 'Reverse Triggering'), dTog('spont', 'Spontaneous Breathing'));
    if (S.spont) L.append(dSld('spontRate', 'Spont. Rate', 6, 40, 1, '/min'), dSld('pmus', 'Peak Effort (Pmus)', 0, 20, 0.5, 'cmH₂O', (v) => v.toFixed(1)), dSld('responsiveness', 'Responsiveness', 0, 100, 5, '%'));
    R.append(el('h3', {}, 'Advanced'), dTog('efl', 'Expiratory Flow Limitation'));
    if (S.efl) R.append(dSld('pcrit', 'Critical Closing P', 2, 15, 1, 'cmH₂O'), dSld('peepStent', 'PEEP Stenting', 0, 100, 5, '%'));
    R.append(dTog('cardiac', 'Cardiac Oscillations'));
    if (S.cardiac) R.append(dSld('hr', 'Heart Rate', 40, 140, 1, 'bpm'));
    R.append(dTog('variability', 'Natural Variability'));
    if (S.variability) R.append(dSld('varPct', 'Variability', 5, 20, 1, '%'));
    R.append(dTog('uip', 'Upper Inflection'));
    if (S.uip) R.append(dSld('uipThresh', 'UIP Threshold', 20, 40, 1, 'cmH₂O'));
    R.append(el('div', { class: 'hr' }), dTog('showP01', 'Show P0.1'));
    dc.append(L, R);
  }
  function buildAsync() {
    const w = $('asyncBtns');
    w.innerHTML = '';
    Object.entries(SCENARIOS).forEach(([id, s]) => {
      const b = el('button', {}, s.name);
      b.onclick = () => { runScenario(vs, id); clearBuf(); syncAll(); closeDrawer(); };
      w.append(b);
    });
  }
  // ---- open/close ----
  const openSheet = (which: 'modes' | 'controls' | 'alarms') => { if (which === 'controls') sheetTab = 'basic'; if (which === 'modes') pendingMode = null; buildSheet(which); $('sheet').classList.add('on'); $('scrim').classList.add('on'); };
  const closeSheet = () => { $('sheet').classList.remove('on'); $('scrim').classList.remove('on'); };
  const openDrawer = () => { buildDrawer(); $('drawer').classList.add('on'); $('scrim').classList.add('on'); };
  const closeDrawer = () => { $('drawer').classList.remove('on'); $('scrim').classList.remove('on'); };
  $('closeSheet').onclick = closeSheet;
  $('closeDrawer').onclick = closeDrawer;
  $('scrim').onclick = () => { closeSheet(); closeDrawer(); };
  $('modesBtn').onclick = () => openSheet('modes');
  $('tabUtil').onclick = () => openDrawer();
  $('tabSystem').onclick = () => openSheet('controls');
  $('alarmBanner').onclick = () => silenceAlarms(vs);
  document.querySelectorAll<HTMLElement>('.vtab').forEach((bt) => (bt.onclick = () => {
    viewMode = bt.dataset.view === 'cockpit' ? 'cockpit' : 'graphics';
    document.querySelectorAll('.vtab').forEach((x) => x.classList.toggle('on', x === bt));
    $('waves').style.display = viewMode === 'graphics' ? '' : 'none';
    $('cockpit').style.display = viewMode === 'cockpit' ? '' : 'none';
    sizeCanvases();
    if (viewMode === 'cockpit') updatePanels();
  }));
  const syncAll = () => { buildWaves(); buildNums(); buildRail(); buildDrawer(); syncHeader(); };
  const clearBuf = () => { BUF.p.length = BUF.f.length = BUF.v.length = BUF.t.length = 0; };
  // ---- main loop: the driver steps the ventilator (and posts link frames); every 5 ms step is sampled ----
  let raf = 0;
  const keep = () => Math.ceil(((S.sweepSec || 12) * 1.15) / DT) + 40;
  d.onStep = () => {
    if (frozen) return;
    BUF.p.push(P.dispPaw); BUF.f.push(P.dispFlowLpm); BUF.v.push(P.V); BUF.t.push(P.t);
    const k = keep();
    while (BUF.t.length > k) { BUF.p.shift(); BUF.f.shift(); BUF.v.shift(); BUF.t.shift(); }
  };
  function loop(ts: number) {
    d.frame(ts);
    if (viewMode === 'graphics') LANES.forEach((l) => drawLaneOn(canvases[l.key], l));
    else { drawLaneOn(cockpitPaw, LANES[0]!); drawLung(lungCanvas); }
    if (numsDirty || P.t - lastNumT > 1.4) { buildNums(); if (viewMode === 'cockpit') updatePanels(); lastNumT = P.t; numsDirty = false; }
    syncHeader();
    raf = requestAnimationFrame(loop);
  }
  d.onControl = syncAll; // a remote patch (link page, demo) redraws the knobs and sheets
  buildWaves(); buildCockpit(); buildNums(); buildRail(); buildDrawer(); buildAsync(); syncHeader();
  raf = requestAnimationFrame(loop);
  return { stop: () => { cancelAnimationFrame(raf); d.onStep = undefined; d.onControl = undefined; } };
}
