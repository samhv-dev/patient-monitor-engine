// Static skin preview: header, message bar with the three alarm-level bars and lamps, lanes drawn with the
// renderer's own SweepLane using ResolvedSkin.render (the Stage 4b contract), and tiles from layout.tiles.
import { createEngine } from '@pme/engine-core';
import { DEFAULT_PX_PER_MM, SweepLane } from '@pme/renderer';
import { formatDate, type ResolvedSkin, type TileParam } from '@pme/skins';
import { SHAPE_RATE, shapeFor } from './sample-waves.ts';

const SAMPLE: Record<TileParam, { v: string; x?: string }> = {
  HR: { v: '75' }, NIBP: { v: '121/82', x: '(98)' }, ART: { v: '120/80', x: '(93)' }, CVP: { v: '(8)' }, PAP: { v: '25/10', x: '(15)' },
  IBP1: { v: '120/80', x: '(93)' }, IBP2: { v: '(8)' }, IBP3: { v: '25/10' }, IBP4: { v: '(12)' },
  SpO2: { v: '97', x: 'PR 75  PI 3.1' }, TEMP: { v: '36.8', x: 'T2 37.4  DT 0.6' }, RR: { v: '15' }, CO2: { v: '36', x: 'FiCO2 0  AWRR 15' }, ST: { v: '0.1' },
};
const LAMP_COLOR: Record<string, string> = { 'red-flash': '#F00000', 'yellow-flash': '#F0F000', 'yellow-steady': '#F0F000', 'cyan-steady': '#00D0D0', off: '#333333' };

export function renderScreen(root: HTMLElement, r: ResolvedSkin, animate: boolean): void {
  const s = r.skin;
  const doc = root.ownerDocument;
  root.innerHTML = '';
  root.style.background = s.background;
  root.style.color = s.foreground;
  root.style.fontFamily = s.font.stack;
  const up = (x: string) => (s.font.labelCase === 'upper' ? x.toUpperCase() : x);

  // Header
  const header = doc.createElement('div');
  header.id = 'header';
  header.style.borderBottom = `1px solid ${s.chrome.divider}`;
  const date = formatDate(new Date(Date.UTC(2023, 5, 25)), s.calendar.default, s.calendar.gregorianFormat);
  header.innerHTML =
    `<span style="background:${s.chrome.pageBox.bg};color:${s.chrome.pageBox.fg};padding:0 6px">${s.defaultPage}</span>` +
    `<span>BED 01</span><span style="color:${s.chrome.patientCategoryColor}">${up('Adult')}</span>` +
    (s.alarms.factoryEnabled ? '' : `<span style="color:#F00000" title="all alarms off">🔕</span>`) +
    `<span style="margin-left:auto">${r.skinId}${r.presetId ? ` · ${r.presetId}` : ''}${r.themeId ? ` · ${r.themeId}` : ''}</span>` +
    `<span>${date}  12:14:05</span>`;

  // Message bar: idle bar plus one sample bar and lamp per level
  const bar = doc.createElement('div');
  bar.id = 'bar';
  const mb = s.alarms.messageBar;
  const pre = (n: number) => (mb.prefix === 'asterisks' ? '*'.repeat(4 - n) : '');
  const lamp = (k: 'L1' | 'L2' | 'L3') => {
    const style = s.alarms.lamp[k];
    const hz = k === 'L3' ? 0 : s.alarms.lamp.flashHz[k];
    const anim = animate && style.endsWith('flash') ? `animation:pme-flash ${1 / hz}s steps(1) infinite` : '';
    return `<span class="lamp" data-lamp="${k}" data-hz="${hz}" style="background:${LAMP_COLOR[style]};${anim}"></span>`;
  };
  bar.innerHTML =
    `<span style="background:${mb.idle.bg};color:${mb.idle.fg};padding:2px 8px">${up('No alarm')}</span>` +
    `<span id="alarmdemo">` +
    (['L1', 'L2', 'L3'] as const)
      .map((k, i) => `${lamp(k)}<span style="background:${mb[k].bg};color:${mb[k].fg}">${pre(i + 1)}${up(`Level ${s.alarms.levelNames[i]}`)}</span>`)
      .join('') +
    `</span>`;

  // Body: waves + tiles
  const body = doc.createElement('div');
  body.id = 'body';
  const waves = doc.createElement('div');
  waves.id = 'waves';
  waves.style.flex = `0 0 ${Math.round(s.layout.waveAreaFraction * 100)}%`;
  waves.style.borderRight = `1px solid ${s.chrome.divider}`;
  const canvas = doc.createElement('canvas');
  waves.append(canvas);
  const tiles = doc.createElement('div');
  tiles.id = 'tiles';
  for (const col of s.layout.tiles) {
    const c = doc.createElement('div');
    c.className = 'col';
    for (const t of col) {
      const el = doc.createElement('div');
      el.className = `tile${t.size === 'large' ? ' large' : ''}`;
      el.dataset.param = t.param;
      el.style.color = r.render.tileColors[t.param] ?? s.foreground;
      el.style.border = `1px solid ${s.chrome.divider}`;
      const smp = SAMPLE[t.param];
      el.innerHTML =
        `<div>${up(t.param === 'RR' ? 'RR' : t.param)}</div><div class="v" style="font-weight:${s.font.numericWeight}">${smp.v}</div>` +
        (smp.x ? `<div class="x">${smp.x}</div>` : '') +
        (s.alarms.factoryEnabled ? '' : `<span class="bell" style="color:#F00000">🔕</span>`);
      c.append(el);
    }
    tiles.append(c);
  }
  body.append(waves, tiles);
  root.append(header, bar, body);
  drawLanes(canvas, waves, r);
}

function drawLanes(canvas: HTMLCanvasElement, box: HTMLElement, r: ResolvedSkin): void {
  const dpr = globalThis.devicePixelRatio || 1;
  const w = box.clientWidth;
  const h = box.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = r.render.background;
  ctx.fillRect(0, 0, w, h);
  const grid = r.render.grid;
  const pxPerMm = DEFAULT_PX_PER_MM;
  const engine = createEngine({ seed: 4 });
  const lanes = r.render.lanes;
  const laneH = h / lanes.length;
  const labelW = 0;
  lanes.forEach((L, i) => {
    const y = i * laneH;
    const shape = shapeFor(L.lane);
    const rate = shape ? SHAPE_RATE : 500;
    const gain = shape ? (laneH * 0.7) / pxPerMm : L.gainMmPerMv; // shapes are 0..1 → 70 % of the lane
    const lane = new SweepLane(
      {
        x: labelW, y, width: w - labelW, height: laneH, baseline: shape ? 0.85 : 0.6, rate, mmPerS: L.mmPerS, pxPerMm,
        gainMmPerMv: gain, color: L.color, background: r.render.background, lineWidth: r.render.lineWidth, eraseGapPx: r.render.eraseGapPx,
      },
      dpr,
    );
    const laneS = (w - labelW) / (L.mmPerS * pxPerMm);
    const t0 = 2; // skip the engine's first beats
    engine.advanceTo(t0 + laneS + 1);
    const read = (from: number, out: Float32Array) => {
      if (!shape) return engine.readSamples('ecgII', from + t0 * 500, out);
      for (let k = 0; k < out.length; k++) out[k] = shape((from + k) / rate);
      return out.length;
    };
    for (let t = 0.02; t < laneS * 0.97; t += 0.02) lane.draw(ctx, t, read);
    ctx.fillStyle = L.color;
    ctx.font = `12px ${r.render.fontStack}`;
    ctx.textBaseline = 'top';
    ctx.fillText(`${L.label}   ${L.mmPerS} mm/s${L.autoGain ? '  AUTO' : ''}`, 6, y + 4);
    if (i > 0) {
      ctx.fillStyle = r.skin.chrome.divider;
      ctx.fillRect(0, y, w, 1);
    }
  });
  // ECG-paper grid last, multiplied in: pink on the paper, invisible under dark traces (lanes paint their own background).
  if (grid) {
    ctx.globalCompositeOperation = 'multiply';
    for (const [mm, color] of [[grid.minorMm, grid.minor], [grid.majorMm, grid.major]] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += mm * pxPerMm) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += mm * pxPerMm) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
