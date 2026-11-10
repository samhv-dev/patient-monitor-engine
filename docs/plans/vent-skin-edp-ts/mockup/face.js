// Mock-up builder for the EDP-TS-style face (plan docs/plans/vent-skin-edp-ts.md). Plain shapes only; the traces are an
// ILLUSTRATIVE breath sequence drawn by this script (two volume-controlled breaths and two pressure-supported breaths,
// SIMV(VCV)+PSV at the settings the bottom row shows), not the simulator's output and not traced from a photograph.
/* exported face */
function face(o) {
  const H = (t, a = {}, ...k) => { const e = document.createElement(t); for (const n in a) n === 'html' ? (e.innerHTML = a[n]) : e.setAttribute(n, a[n]); k.forEach((c) => e.append(c)); return e; };
  const dev = H('div', { class: 'device' });
  const scr = H('div', { class: 'screen' });
  dev.append(scr);
  // header
  const hdr = H('div', { class: 'hdr' });
  hdr.append(H('div', { class: 'who', html: `<div class="cat">ADL</div><div class="mode">${o.mode}</div><div class="backup">Backup: OFF</div>` }));
  hdr.append(H('div', { class: 'clock', html: '10/11/26<br>09:41' }));
  const vals = H('div', { class: 'vals' });
  [['42', 'L/min', 'Peak Flow'], ['1.40', 's', 'Ti'], ['3.60', 's', 'Te'], ['1:2.6', 'Current', 'I:E'], ['14', 'bpm', 'fTotal'], ['0.498', 'L', 'VT'], ['6.80', 'L/min', 'V&#775;E'], ['40', '%', 'Oxygen']]
    .forEach(([v, u, l]) => vals.append(H('div', { class: 'cell', html: `<b>${v}</b><i>${u}</i><span>${l}</span>` })));
  hdr.append(vals);
  const tags = H('div', { class: 'tags' });
  ['', '', '', '', '30', '0.750<br>0.250', '8.50<br>2.41', '50<br>30'].forEach((t) => tags.append(t ? H('div', { class: 'tag', html: `<span>${t}</span>` }) : H('div')));
  hdr.append(tags);
  scr.append(hdr);
  const msg = H('div', { class: 'msg', html: '<div class="icons"><i class="on"></i><i></i><i></i><i></i></div>Volume compensation' });
  if (o.alarm) msg.append(H('div', { class: 'alarm', html: o.alarm }));
  scr.append(msg);
  // left column
  const left = H('div', { class: 'left', html: `<div class="bat"></div><div class="lung"></div>
    <div class="lab">Peak</div><div class="v">${o.peak ?? 21}</div><div style="font-size:13px">Trach.</div>
    <div class="lab">Plateau</div><div class="v">&nbsp;</div>
    <div class="lab">Mean</div><div class="v">9.0</div><div class="lab">PEEP</div><div class="v">5.1</div>
    <div class="key small">20.0</div><div style="font-size:12px;line-height:1.1">Pressure<br>Limits</div>
    <div class="key">40</div><div class="key">5</div>` });
  scr.append(left);
  // waveform panels + loops
  const waves = H('div', { class: 'waves' });
  const loops = H('div', { class: 'loops' });
  const seq = breaths();
  const lanes = [['Paw(cmH2O)', 'p', -7, 35, [35, 28, 21, 14, 7, 0]], ['VT(L)', 'v', -0.2, 1.0, [1.0, 0.8, 0.6, 0.4, 0.2, 0]], ['V&#775;(L/min)', 'f', -60, 60, [60, 40, 20, 0, -20, -40]]];
  lanes.forEach(([ttl, key, lo, hi, ticks], i) => {
    const top = i * 168, ph = 146;
    const p = H('div', { class: 'panel', style: `left:0;top:${top}px;width:500px;height:${ph}px` });
    p.append(H('div', { class: 'axis', style: `left:0;top:0;width:28px;height:${ph}px` }));
    ticks.forEach((t) => p.append(H('div', { class: 'axis', style: `left:2px;top:${4 + (hi - t) / (hi - lo) * (ph - 14)}px;background:none;color:#10233e`, html: `${Math.abs(t)}` })));
    p.append(H('div', { class: 'ttl', html: ttl }));
    const ax = H('div', { class: 'axis', style: `left:0;top:${top + ph}px;width:500px;height:18px;padding-left:30px;word-spacing:58px`, html: '0 2 4 6 8 10 12' });
    p.append(trace(seq, key, lo, hi, 470, ph - 10), H('div', { class: 'ttl', style: 'left:auto;right:8px;top:auto;bottom:4px;font-size:12px', html: '(s)' }));
    waves.append(p, ax);
  });
  [['VT(L)', 'Paw(cmH2O)', 'p', 'v', -7, 35, -0.2, 1.0], ['V&#775;(L/min)', 'VT(L)', 'v', 'f', -0.2, 1.0, -60, 60]].forEach(([yl, xl, xk, yk, x0, x1, y0, y1], i) => {
    const top = i * 252, ph = 230;
    const p = H('div', { class: 'panel', style: `left:0;top:${top}px;width:312px;height:${ph}px` });
    p.append(H('div', { class: 'ttl', style: 'left:70px', html: yl }), H('div', { class: 'ttl', style: 'left:auto;right:8px;top:auto;bottom:22px', html: xl }));
    p.append(loop(seq, xk, yk, x0, x1, y0, y1, 312, ph));
    loops.append(p, H('div', { class: 'axis', style: `left:0;top:${top + ph}px;width:312px;height:18px` }));
  });
  scr.append(waves, loops);
  // right column of icon keys (the manual's list, p. 15 and p. 130)
  const right = H('div', { class: 'right' });
  [['Graphics', ''], ['Freeze', ''], ['Resp.<br>mech.', ''], ['Save<br>loop', ''], ['Nebul.', 'grey'], ['?', ''], ['Standby', '']]
    .forEach(([t, c]) => right.append(H('div', { class: 'ikey ' + c, html: t })));
  scr.append(right);
  // bottom row of set parameters
  const params = H('div', { class: 'params' });
  const SIMV = [['0.500', 'L', 'VT'], ['1.40', 's', 'Ti'], ['1:2.6', '', 'I:E'], ['12', 'bpm', 'f'], ['8', 'cmH2O', 'PSV'], ['25', '%', 'Exp. Sensitiv.'], ['5', 'cmH2O', 'PEEP'], ['3.0', 'L/min', 'Sens'], ['40', '%', 'Oxygen'], ['⟋', '', 'Rise Time'], ['◣', '', 'Flow Waveform']];
  // VCV: the device leaves the PSV places empty (manual p. 70, Figure 8-2); 'wave' is the Flow Waveform icon
  const VCV = [['0.500', 'L', 'VT'], ['1.40', 's', 'Ti'], ['1:2.6', '', 'I:E'], ['12', 'bpm', 'f'], null, null, ['5', 'cmH2O', 'PEEP'], ['3.0', 'L/min', 'Sens'], ['40', '%', 'Oxygen'], null, [o.wave ?? '◣', '', 'Flow Waveform']];
  (o.mode === 'VCV' ? VCV : SIMV)
    .forEach((k) => params.append(k ? H('div', { class: 'pk' + (o.sel === k[2] ? ' sel' : '') + (k[2] === 'I:E' ? ' ghost' : ''), html: `<b>${k[0]}</b><i>${k[1]}</i><span>${k[2]}</span>` }) : H('div')));
  scr.append(params);
  // hardware beside and under the screen
  const side = H('div', { class: 'hw', style: 'left:1010px;top:36px;width:150px' });
  side.innerHTML = `<div>Alarm Signals</div>
    <div style="margin-top:8px">Vent Inop</div><div class="lamp"></div>
    <div>High</div><div class="lamp high ${o.high ? 'on' : ''}"></div>
    <div>Med / Low</div><div class="lamp round med ${o.med ? 'on' : ''}"></div>`;
  dev.append(side);
  [['Alarm<br>Limits', 330], ['silence<br>30–60 s', 410], ['Menu', 520], ['Mode', 630]]
    .forEach(([t, y]) => dev.append(H('div', { class: 'hw', style: `left:1048px;top:${y}px` }, H('div', { class: 'hk', html: t }))));
  [['lock', 150], ['Suction<br>%O2', 330], ['Manual<br>Insp.', 420], ['Insp/Exp<br>Pause', 510], ['Ctrl', 690], ['Esc', 780]]
    .forEach(([t, x]) => dev.append(H('div', { class: 'hw', style: `left:${x}px;top:762px` }, H('div', { class: 'hk', style: 'height:44px', html: t }))));
  const knob = H('div', { class: 'knob', style: 'left:1018px;top:712px' });
  dev.append(knob);
  dev.append(H('div', { class: 'note', html: o.note ?? '' }));
  (o.extra ?? []).forEach((f) => f(scr, H));
  document.body.append(dev);
}
// An illustrative breath sequence over 12 s: VC breath (VT 0.5 L, Ti 1.4 s, descending ramp), PS breath, VC, PS.
function breaths() {
  const out = []; const dt = 0.02; let v = 0;
  const C = 0.045, R = 12, peep = 5, ps = 8; // L/cmH2O, cmH2O/L/s
  const plan = [[0.0, 'vc'], [3.0, 'ps'], [5.0, 'vc'], [8.2, 'ps'], [10.0, 'vc']];
  for (let t = 0; t < 12; t += dt) {
    const [st, kind] = plan.filter(([s]) => s <= t).pop() ?? [0, 'vc'];
    const x = t - st; let f, p, insp;
    if (kind === 'vc' && x < 1.4) { const pk = (0.5 / 1.4) * 2; f = pk * (1 - x / 1.4); insp = true; }
    else if (kind === 'ps' && x < 0.9) { insp = true; f = Math.max(0, (ps / R) * Math.exp(-x / (R * C)) * Math.min(1, x / 0.12)); }
    else { insp = false; f = -(v / (R * C)); }
    v = Math.max(0, v + f * dt);
    p = insp ? (kind === 'vc' ? peep + v / C + f * R : peep + ps * Math.min(1, x / 0.12)) : peep + Math.max(0, f * R + v / C) * 0.15;
    out.push({ t, p, v, f: Math.max(-58, Math.min(58, f * 60)), insp });
  }
  return out;
}
function trace(seq, key, lo, hi, w, h) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('width', w); svg.setAttribute('height', h); svg.style.left = '30px'; svg.style.top = '6px';
  const x = (t) => (t / 12) * w, y = (v) => h - ((v - lo) / (hi - lo)) * h;
  let seg = [], ins = seq[0].insp;
  const flush = () => { if (seg.length > 1) { const pl = document.createElementNS(ns, 'polyline'); pl.setAttribute('points', seg.join(' ')); pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', ins ? 'var(--edp-insp)' : 'var(--edp-exp)'); pl.setAttribute('stroke-width', '2.2'); svg.append(pl); } };
  seq.forEach((s) => { const pt = `${x(s.t).toFixed(1)},${y(s[key]).toFixed(1)}`; if (s.insp !== ins) { seg.push(pt); flush(); seg = [pt]; ins = s.insp; } else seg.push(pt); });
  flush();
  const zero = document.createElementNS(ns, 'line'); zero.setAttribute('x1', 0); zero.setAttribute('x2', w); zero.setAttribute('y1', y(0)); zero.setAttribute('y2', y(0)); zero.setAttribute('stroke', '#cfd6e6'); zero.setAttribute('stroke-dasharray', '3 3'); svg.prepend(zero);
  return svg;
}
function loop(seq, xk, yk, x0, x1, y0, y1, w, h) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('width', w); svg.setAttribute('height', h); svg.style.left = '0'; svg.style.top = '0';
  const X = (v) => 20 + ((v - x0) / (x1 - x0)) * (w - 30), Y = (v) => h - 10 - ((v - y0) / (y1 - y0)) * (h - 20);
  const last = seq.filter((s) => s.t >= 5.0 && s.t < 8.2);
  let seg = [], ins = last[0].insp;
  const flush = () => { if (seg.length > 1) { const pl = document.createElementNS(ns, 'polyline'); pl.setAttribute('points', seg.join(' ')); pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', ins ? 'var(--edp-insp)' : 'var(--edp-exp)'); pl.setAttribute('stroke-width', '2.2'); svg.append(pl); } };
  last.forEach((s) => { const pt = `${X(s[xk]).toFixed(1)},${Y(s[yk]).toFixed(1)}`; if (s.insp !== ins) { seg.push(pt); flush(); seg = [pt]; ins = s.insp; } else seg.push(pt); });
  flush();
  [[X(0), 0, X(0), h, ''], [0, Y(0), w, Y(0), '']].forEach(([a, b, c, d]) => { const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', a); l.setAttribute('y1', b); l.setAttribute('x2', c); l.setAttribute('y2', d); l.setAttribute('stroke', '#cfd6e6'); l.setAttribute('stroke-dasharray', '3 3'); svg.prepend(l); });
  return svg;
}
