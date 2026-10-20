// Main-thread device chrome (brief §3.1 "DOM numerics tiles (≤1 Hz, CSS flash)"; §6.4 visuals; §6.4.1; §6.9):
// the alarm header (lamp, message bar, silence/pause countdown, all-off bell, layout badge, date), the skin's
// numeric tiles (colours, fonts, glyphs, crossed bells, limits, flashing numerics; request RR-5) and the PUMP
// watermark. What to show comes from alarm-view.ts; this file only paints the DOM.
import type { EngineEvent, Measured, NumericId } from '@pme/engine-core';
import { formatDate, type ResolvedSkin, type TileParam, type TileSpec } from '@pme/skins';
import { barView, hrStatusLines, tileAlarmView, TILE_NUMERICS, type AlarmStatus } from './alarm-view.ts';
import { formatNibp, formatWallTime, nibpModeLabel } from './numerics-hemo.ts';
import { formatAgents, formatBfa, formatNmt, modulePresent } from './numerics-neuro.ts';

type NibpEvent = Extract<EngineEvent, { type: 'nibp' }>;
type DeviceStatus = Extract<EngineEvent, { type: 'deviceStatus' }>;

const UNIT: Partial<Record<TileParam, string>> = {
  HR: 'bpm', NIBP: 'mmHg', ART: 'mmHg', CVP: 'mmHg', PAP: 'mmHg', IBP1: 'mmHg', IBP2: 'mmHg', IBP3: 'mmHg', IBP4: 'mmHg', SpO2: '%', TEMP: '°C', RR: 'rpm', CO2: 'mmHg', ST: 'mV',
  ICP: 'mmHg', PbtO2: 'mmHg', UO: 'mL/h',
  NMT: 'TOF', // The depth index has no unit
  AGENTS: '%',
};
/** Skin `hr.autoPriority` entries → the pulse numeric each publishes (engine profile.ts PULSE_SOURCE). */
const PULSE_SOURCE: Readonly<Record<string, NumericId>> = { ART: 'prAbp', IBP1: 'prAbp', SpO2: 'pr' };
const BELL_OFF_SVG =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-label="alarm off"><path d="M8 2a4 4 0 0 0-4 4v3l-1.5 2h11L12 9V6a4 4 0 0 0-4-4zm-1.5 11a1.5 1.5 0 0 0 3 0" fill="none" stroke="#F00000" stroke-width="1.4"/><path d="M2 14L14 2" stroke="#F00000" stroke-width="1.6"/></svg>';

/** CSS for the flash classes of this skin: 50 % duty (skin `alarms.lamp.duty`), 2.0 / 0.6 Hz (brief §6.4). */
export function flashCss(r: ResolvedSkin): string {
  const l = r.skin.alarms.lamp;
  const pct = Math.round(l.duty * 100);
  return [
    `@keyframes pme-blink{0%{opacity:1}${pct}%{opacity:0.12}}`,
    `.pme-f1{animation:pme-blink ${(1 / l.flashHz.L1).toFixed(5)}s step-end infinite}`,
    `.pme-f2{animation:pme-blink ${(1 / l.flashHz.L2).toFixed(5)}s step-end infinite}`,
    '.pme-hdr{display:flex;align-items:center;gap:10px;height:30px;padding:0 8px;font-size:15px;box-sizing:border-box}',
    '.pme-bar{flex:1;height:22px;line-height:22px;padding:0 8px;border-radius:2px;white-space:nowrap;overflow:hidden;font-weight:600}',
    '.pme-lamp{width:18px;height:18px;border-radius:50%;flex:none}',
    '.pme-bar.latched{outline:2px solid currentColor;outline-offset:-2px}', // The latched style (text in the level colour, framed)
    '.pme-inop{max-width:40%;height:22px;line-height:22px;padding:0 8px;border-radius:2px;white-space:nowrap;overflow:hidden}',
    '.pme-cd{min-width:4.5em;font-variant-numeric:tabular-nums}',
    '.pme-dev{font-weight:600;white-space:nowrap}',
    '.pme-badge{font-size:11px;border:1px solid currentColor;padding:1px 4px;opacity:.9}',
    // Two-row header (skin layout.headerStyle, research/34 §3 row 7): rows of 5.8 % and 3.0 % of the monitor height
    // [MOCKUP] once the layout sets --pme-h, never below 40 / 22 px; the bar is 43 % of the wave-area width
    '.pme-hdr.two{height:auto;flex-direction:column;align-items:stretch;gap:0;padding:0}',
    '.pme-hdr.two .r1{display:flex;align-items:center;gap:10px;height:max(40px,calc(5.8 * var(--pme-h, 0px) / 100));padding:0 8px;box-sizing:border-box}',
    '.pme-hdr.two .r2{display:flex;align-items:center;gap:8px;height:max(22px,calc(3 * var(--pme-h, 0px) / 100));padding:0 8px 0 0;box-sizing:border-box}',
    '.pme-hdr.two .r2 .pme-bar{flex:none;width:calc(0.43 * (100% - var(--pme-tiles-w, 0px)));font-weight:400}',
    '.pme-hdr.two .pg{font-size:18px;padding:2px 8px;font-weight:600}',
    '.pme-hdr.two .stk{display:flex;flex-direction:column;font-size:15px;line-height:17px;white-space:nowrap}',
    '.pme-hdr.two .sp{flex:1}',
    '.pme-hdr.two .dt{text-align:right;font-variant-numeric:tabular-nums}',
    '.pme-stile{padding:4px 10px;line-height:1.05;border-top:1px solid var(--pme-divider)}',
    '.pme-stile .h{display:flex;gap:6px;align-items:center;font-size:13px}',
    '.pme-stile .h .u{margin-left:auto;opacity:.8}',
    '.pme-stile .lim{font-size:11px;opacity:.9;min-height:12px;text-align:right}',
    '.pme-stile .v{font-size:40px;text-align:right;font-variant-numeric:tabular-nums}',
    '.pme-stile.large .v{font-size:60px}',
    '.pme-stile .s{font-size:16px;text-align:right;font-variant-numeric:tabular-nums;min-height:18px}',
    // rc.3 tile skeleton (opt-in, saadat-like; research/34 §3 rows 4, 8, 12, 14): limit pairs beside the value, high
    // over low; split tiles as parts side by side ('row') or stacked ('column')
    '.pme-stile.rc3 .vrow,.pme-stile.rc3 .srow{display:flex;align-items:center;gap:4px}',
    '.pme-stile.rc3 .vrow .v,.pme-stile.rc3 .srow .s{flex:1;min-width:0}',
    '.pme-stile.rc3 .lim.a,.pme-stile.rc3 .lim.b,.pme-stile.rc3 .lim.c,.pme-stile.rc3 .part .lim{display:flex;flex-direction:column;gap:2px;font-size:11px;line-height:1;min-height:0;text-align:left;opacity:1}',
    '.pme-stile.rc3 [data-lim]{display:flex;flex-direction:column;gap:2px}',
    '.pme-stile.rc3 .limrow{display:flex;justify-content:space-around;font-size:11px;line-height:1;min-height:11px}',
    '.pme-stile.rc3 .limrow [data-lim]{flex-direction:row;gap:6px}',
    '.pme-stile.rc3 [data-pme="ntime"],.pme-stile.rc3 [data-pme="mode"]{font-size:12px;white-space:nowrap}',
    '.pme-stile.rc3 [data-pme="src"]{font-size:12px}',
    '.pme-stile.rc3 .h{gap:4px;white-space:nowrap}',
    '.pme-stile.rc3 .h .u{font-size:11px}',
    '.pme-stile.rc3 [data-pme="mode"]{font-size:11px}',
    '.pme-stile.split .parts{display:flex;gap:4px}',
    '.pme-stile.split.column .parts{flex-direction:column;gap:0}',
    '.pme-stile.split .part{flex:1;min-width:0}',
    '.pme-stile.split .ph{display:flex;gap:4px;align-items:baseline;font-size:13px;white-space:nowrap}',
    '.pme-stile.split.row .ph{flex-direction:column;align-items:flex-start;gap:0;line-height:1.1}', // label over unit: three parts fit a 180 px column
    '.pme-stile.split .pu{font-size:10px;opacity:.85}',
    '.pme-stile.split .pr{display:flex;align-items:center;gap:3px}',
    '.pme-stile.split .pv{flex:1;font-size:28px;line-height:1.05;min-height:1.05em;text-align:right;font-variant-numeric:tabular-nums}',
    '.pme-stile.split.column .pv{font-size:20px}',
    '.pme-stile.split.column .part{margin-bottom:3px}',
    '.pme-stile.split .s:empty{display:none}',
    '.pme-stile.rc3 [data-pme="heart"]{margin-left:6px;opacity:0}',
    '.pme-stile.rc3 [data-pme="heart"].on{opacity:1}',
    '.pme-stile.rc3 [data-pme="st"]{font-size:12px;line-height:1.3}',
    '.pme-stile.rc3 .stl{display:flex;align-items:center;gap:4px}',
    '.pme-watermark{position:absolute;left:30%;top:2%;font-size:64px;font-weight:700;opacity:.25;pointer-events:none}',
    // Portrait tiles (a phone): a third of the width each, numerics as large as that leaves
    '.pme-portrait .pme-stile{padding:3px 6px;border-left:1px solid var(--pme-divider);min-width:0}',
    '.pme-portrait .pme-stile .h{font-size:12px;gap:3px}',
    '.pme-portrait .pme-stile .lim{display:none}',
    '.pme-portrait .pme-stile .v{font-size:min(9vw,36px);white-space:nowrap}',
    '.pme-portrait .pme-stile.large .v{font-size:min(11vw,44px)}',
    '.pme-portrait .pme-stile .s{font-size:12px;white-space:nowrap;overflow:hidden;min-height:14px}',
    // the rc.3 limit pairs stay off a phone, as the old limits do (review T-12)
    '.pme-portrait .pme-stile.rc3 .lim.a,.pme-portrait .pme-stile.rc3 .lim.b,.pme-portrait .pme-stile.rc3 .lim.c,.pme-portrait .pme-stile.rc3 .part .lim,.pme-portrait .pme-stile.rc3 .limrow{display:none}',
  ].join('\n');
}

/** Defibrillator / pacer readout for the header (brief §6.5: energy, charging/ready, SYNC; pacer mode, rate, output). */
export function deviceText(d: DeviceStatus | null): string {
  const out: string[] = [];
  const f = d?.defib;
  if (f && (f.state !== 'idle' || f.sync)) out.push(`${f.energyJ} J${f.state === 'charging' ? ' CHARGING' : f.state === 'ready' ? ' READY' : ''}${f.sync ? ' SYNC' : ''}`);
  const p = d?.pacer;
  if (p && p.mode !== 'off') out.push(`PACER ${p.mode.toUpperCase()} ${p.ratePpm} ppm ${p.mA} mA${p.paused ? ' PAUSED' : ''}`);
  return out.join('  ');
}

interface Tile {
  spec: TileSpec;
  el: HTMLDivElement;
  label: HTMLSpanElement;
  value: HTMLDivElement;
  sub: HTMLDivElement;
  bell: HTMLSpanElement;
  /** The old skeleton's "50–150" limits; null in the rc.3 skeleton (limit pairs instead). */
  lim: HTMLSpanElement | null;
  /** The rc.3 skeleton (skin `alarms.limitsDisplay: 'always'` or a split tile), or null for the old one. */
  rc3: TileRc3 | null;
}

/** The rc.3 tile skeleton's parts (research/34 §3 rows 4, 8, 12, 14; IMG_8113). */
interface TileRc3 {
  /** Limit-pair slots: a left of the value, b right of it, c under the left; row = one row under the value. */
  slots: { a: HTMLElement | null; b: HTMLElement | null; c: HTMLElement | null; row: HTMLElement | null };
  /** Split tiles: part k's label, value and limit slot (part 0's label and value ARE [data-pme=lbl] and [data-pme=v]). */
  parts: Array<{ label: HTMLElement; value: HTMLElement; lim: HTMLElement; limitKey: string | undefined }>;
  /** Last limit HTML per slot (a repaint only touches the DOM when it changes). */
  painted: Map<HTMLElement, string>;
}

export class DeviceUI {
  readonly header: HTMLDivElement;
  readonly tiles: HTMLDivElement;
  private readonly style: HTMLStyleElement;
  private readonly watermark: HTMLDivElement;
  private r: ResolvedSkin;
  private pump = false;
  private tileList: Tile[] = [];
  private values: Partial<Record<NumericId, Measured>> = {};
  private nibpLast: { sys: number; dia: number; map: number; at: number } | null = null;
  private nibpEv: NibpEvent | undefined;
  private nibpPr: number | null = null; // The cuff's pulse rate (the NIBP tile's PR extra)
  /** Wall time at which THIS window received the last NIBP result (rc.3 tile; blank after a restore or a late join, E102). */
  private nibpWallMs: number | null = null;
  private status: AlarmStatus | null = null;
  private dev: DeviceStatus | null = null;
  /** Header items, built once and only re-arranged by a skin switch (one row, or the two-row header). */
  private readonly lamp: HTMLDivElement;
  private readonly bar: HTMLDivElement;
  private readonly inop: HTMLSpanElement;
  private readonly cd: HTMLSpanElement;
  private readonly allOff: HTMLSpanElement;
  private readonly devEl: HTMLSpanElement;
  private readonly badge: HTMLSpanElement;
  private readonly date: HTMLSpanElement;
  private readonly hx: Record<'page' | 'bed' | 'cat' | 'time' | 'who' | 'sp' | 'when' | 'r1' | 'r2', HTMLElement>;
  /** The two-row header is in use (skin `layout.headerStyle`, never in portrait). */
  private two = false;
  private clock: ReturnType<typeof setInterval> | null = null;
  private heartTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly bed: string;
  private page: string | undefined;

  /** The tiles in a grid UNDER the waveforms (a phone held upright), not in columns beside them. */
  private readonly portrait: boolean;

  constructor(doc: Document, waveArea: HTMLElement, r: ResolvedSkin, page?: string, portrait = false, bed = 'BED 01') {
    this.r = r;
    this.portrait = portrait;
    this.bed = bed;
    this.style = doc.createElement('style');
    doc.head.append(this.style);
    this.header = doc.createElement('div');
    const mk = <T extends HTMLElement>(tag: string, cls: string, key?: string): T => {
      const e = doc.createElement(tag) as T;
      if (cls) e.className = cls;
      if (key) e.dataset.pme = key;
      return e;
    };
    this.lamp = mk('div', 'pme-lamp', 'lamp');
    this.bar = mk('div', 'pme-bar', 'bar');
    this.inop = mk('span', 'pme-inop', 'inop');
    this.cd = mk('span', 'pme-cd', 'cd');
    this.devEl = mk('span', 'pme-dev', 'dev');
    this.allOff = mk('span', '', 'alloff');
    this.badge = mk('span', 'pme-badge', 'badge');
    this.date = mk('span', '', 'date');
    this.hx = {
      page: mk('span', 'pg', 'page'), bed: mk('span', '', 'bed'), cat: mk('span', '', 'cat'), time: mk('span', '', 'time'),
      who: mk('span', 'stk'), sp: mk('span', 'sp'), when: mk('span', 'stk dt'), r1: mk('div', 'r1'), r2: mk('div', 'r2'),
    };
    this.tiles = doc.createElement('div');
    // Portrait — the skin's tile columns flow into a 3-column grid, in the skin's order
    this.tiles.style.cssText = portrait ? 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));flex:none;overflow:hidden;' : 'display:flex;flex:none;overflow:hidden;';
    if (portrait) this.tiles.className = 'pme-portrait';
    this.watermark = doc.createElement('div');
    this.watermark.className = 'pme-watermark';
    waveArea.append(this.watermark);
    this.setSkin(r, page);
  }

  setSkin(r: ResolvedSkin, page?: string): void {
    this.r = r;
    const pg = r.skin.pages.find((p) => p.id === (page ?? r.skin.defaultPage));
    this.pump = pg?.kind === 'pump';
    this.watermark.textContent = pg?.pump?.watermark ?? '';
    this.watermark.style.color = r.skin.colors.ECG ?? r.render.foreground;
    this.page = pg?.label;
    this.style.textContent = flashCss(r);
    this.buildHeader();
    this.header.style.cssText = `background:${r.render.background};color:${r.render.foreground};font-family:${r.render.fontStack};border-bottom:1px solid ${r.skin.chrome.divider};`;
    // the bar is 43 % of the WAVE-AREA width [MOCKUP]; in the columns layout the header also spans the tile columns
    if (this.two) this.header.style.setProperty('--pme-tiles-w', `${r.skin.layout.tiles.length * 181}px`);
    this.badge.textContent = r.skin.layout.badge ?? '';
    this.badge.style.display = r.skin.layout.badge ? '' : 'none';
    this.tiles.style.background = r.render.background;
    this.tiles.style.setProperty('--pme-divider', r.skin.chrome.divider);
    this.tiles.replaceChildren();
    this.tileList = [];
    const doc = this.tiles.ownerDocument;
    for (const col of r.skin.layout.tiles) {
      const c = doc.createElement('div');
      c.style.cssText = this.portrait ? 'display:contents' : `width:180px;border-left:1px solid ${r.skin.chrome.divider};`;
      for (const spec of col) {
        const tile = this.buildTile(spec);
        this.tileList.push(tile);
        const el = tile.el;
        c.append(el);
      }
      this.tiles.append(c);
    }
    this.paintTiles(this.status?.t ?? 0);
    this.paintHeader(this.status?.t ?? 0);
  }

  /**
   * One tile. The old skeleton (label, bell, unit / "50–150" / value / sub-line) for every skin that does not opt in;
   * the rc.3 skeleton when the skin prints limits always (`alarms.limitsDisplay`) or the tile is split (`split`).
   */
  private buildTile(spec: TileSpec): Tile {
    const r = this.r;
    const doc = this.tiles.ownerDocument;
    const el = doc.createElement('div');
    // The HR tile keeps the original class `pme-tile`, which the IIFE smoke test (and embedders) look up
    el.className = `${spec.param === 'HR' ? 'pme-tile ' : ''}pme-stile${spec.size === 'large' ? ' large' : ''}`;
    el.dataset.param = spec.param;
    el.style.color = r.render.tileColors[spec.param] ?? r.render.foreground;
    el.style.fontFamily = r.render.fontStack;
    const q = <T extends HTMLElement>(sel: string) => el.querySelector(sel) as T;
    const rc3 = r.skin.alarms.limitsDisplay === 'always' || spec.split !== undefined;
    if (!rc3) {
      el.innerHTML = `<div class="h"><span data-pme="lbl">${spec.param}</span><span data-pme="bell"></span><span class="u">${spec.unit ?? UNIT[spec.param] ?? ''}</span></div><div class="lim"><span data-pme="lim"></span></div><div class="v" data-pme="v"></div><div class="s" data-pme="s"></div>`;
      const v = q<HTMLDivElement>('[data-pme="v"]');
      v.style.fontWeight = String(spec.weight ?? r.render.numericWeight);
      return { spec, el, label: q('[data-pme="lbl"]'), value: v, sub: q('[data-pme="s"]'), bell: q('[data-pme="bell"]'), lim: q('[data-pme="lim"]'), rc3: null };
    }
    el.classList.add('rc3');
    if (spec.split) {
      el.classList.add('split', spec.split);
      const parts = spec.parts ?? [{ label: spec.label ?? spec.param }];
      el.innerHTML =
        `<div class="h"><span data-pme="bell"></span><span class="u">${spec.unit ?? ''}</span></div><div class="parts">` +
        parts.map((pt, k) => `<div class="part" data-part="${k}"><div class="ph"><span class="pl"${k === 0 ? ' data-pme="lbl"' : ''}></span><span class="pu"></span></div><div class="pr"><span class="lim"></span><div class="pv"${k === 0 ? ' data-pme="v"' : ''}></div></div></div>`).join('') +
        '</div><div class="s" data-pme="s"></div>';
      const partEls = parts.map((pt, k) => {
        const root = q<HTMLElement>(`[data-part="${k}"]`);
        (root.querySelector('.pl') as HTMLElement).textContent = pt.label;
        (root.querySelector('.pu') as HTMLElement).textContent = pt.unit ?? '';
        const value = root.querySelector('.pv') as HTMLElement;
        value.style.fontWeight = String(r.render.numericWeight); // M1: the parts' digits at the NIBP weight
        return { label: root.querySelector('.pl') as HTMLElement, value, lim: root.querySelector('.lim') as HTMLElement, limitKey: pt.limit };
      });
      const v = q<HTMLDivElement>('[data-pme="v"]');
      return { spec, el, label: q('[data-pme="lbl"]'), value: v, sub: q('[data-pme="s"]'), bell: q('[data-pme="bell"]'), lim: null, rc3: { slots: { a: null, b: null, c: null, row: null }, parts: partEls, painted: new Map() } };
    }
    el.innerHTML =
      `<div class="h"><span data-pme="lbl"></span><span data-pme="src"></span><span data-pme="bell"></span><span data-pme="mode"></span><span class="u"></span>${spec.status ? `<span data-pme="heart" style="color:${r.skin.colors.PR ?? r.render.foreground}">♥</span>` : ''}</div>` +
      '<div class="vrow"><span class="lim a"></span><div class="v" data-pme="v"></div><span class="lim b"></span></div>' +
      (spec.limitsLayout === 'row' ? '<div class="limrow"></div>' : '') +
      '<div class="srow"><span class="lim c"></span><div class="s" data-pme="s"></div><span data-pme="ntime"></span></div>' +
      (spec.status ? '<div data-pme="st"></div>' : '');
    q<HTMLElement>('.u').textContent = spec.unit ?? UNIT[spec.param] ?? '';
    const v = q<HTMLDivElement>('[data-pme="v"]');
    v.style.fontWeight = String(spec.weight ?? r.render.numericWeight);
    if (spec.italic) v.style.fontStyle = 'italic';
    return {
      spec, el, label: q('[data-pme="lbl"]'), value: v, sub: q('[data-pme="s"]'), bell: q('[data-pme="bell"]'), lim: null,
      rc3: { slots: { a: q('.lim.a'), b: q('.lim.b'), c: q('.lim.c'), row: el.querySelector('.limrow') }, parts: [], painted: new Map() },
    };
  }

  /**
   * rc.3 PR tile (research/34 §3 row 4; E99): the rate source "(ECG)" / "(IBP1)" / "(SPO2)" on skins that relabel a
   * non-ECG rate, the tile in that source's colour (label, source, digits), and the PACE / ST / PVCs status lines.
   */
  private paintPrTile(tile: Tile, source: string | null): void {
    const r = this.r;
    const src = tile.el.querySelector('[data-pme="src"]') as HTMLElement | null;
    const relabels = r.skin.hr.relabelNonEcgAs !== null;
    if (src) src.textContent = relabels && source ? `(${source.toUpperCase()})` : '';
    const c = r.skin.colors;
    const color = source === 'SpO2' ? c.PR : source === 'IBP1' || source === 'ART' ? (c.IBP1 ?? c.ART) : undefined;
    tile.el.style.color = (relabels && color) || (r.render.tileColors.HR ?? r.render.foreground);
    const st = tile.el.querySelector('[data-pme="st"]') as HTMLElement | null;
    if (!st || !tile.spec.status) return;
    const want = { PACE: 'PACE:', ST: 'ST:', PVCS: 'PVCs:' } as const;
    const lines = hrStatusLines(r, this.status, this.text(this.values.stII, 1)).filter((l) => tile.spec.status?.some((k) => l.text.startsWith(want[k])));
    const color2 = r.skin.hr.statusColor ?? c.HR ?? r.render.foreground;
    const html = lines.map((l) => `<div class="stl" style="color:${color2}"><span class="stt">${l.text}</span>${l.bellOff ? BELL_OFF_SVG : ''}</div>`).join('');
    if (st.innerHTML !== html) st.innerHTML = html;
  }

  /** rc.3 skeleton: each limit pair into its slot (a part's own key into its part), in the skin's limit colour. */
  private paintPairs(tile: Tile, pairs: Array<{ key: string; high: string; low: string }>): void {
    const b = tile.rc3 as TileRc3;
    const html = new Map<HTMLElement, string>();
    for (const slot of [b.slots.a, b.slots.b, b.slots.c, b.slots.row, ...b.parts.map((pt) => pt.lim)]) if (slot) html.set(slot, '');
    const color = this.r.skin.alarms.limitsColor ?? '';
    for (const pr of pairs) {
      const part = b.parts.find((pt) => pt.limitKey === pr.key);
      const slot = part ? part.lim : b.slots.row ?? (pr.key.endsWith('_D') ? b.slots.b : pr.key.endsWith('_M') ? b.slots.c : b.slots.a);
      if (!slot) continue;
      const [x, y] = slot === b.slots.row ? [pr.low, pr.high] : [pr.high, pr.low]; // stacked high over low; the row reads low, high
      html.set(slot, `${html.get(slot) ?? ''}<span data-lim="${pr.key}" style="color:${color}"><span>${x}</span><span>${y}</span></span>`);
    }
    for (const [slot, h] of html) {
      if (b.painted.get(slot) === h) continue;
      slot.innerHTML = h;
      b.painted.set(slot, h);
    }
  }

  /**
   * The header's DOM for this skin: the one-row header, or (skin `layout.headerStyle: 'two-row'`, research/34 §3 row 7)
   * page box, bed, category, lamp, … date over time in row 1 and the message bar in row 2. Rebuilt on every skin
   * switch, so a switch between the two leaves nothing behind.
   */
  private buildHeader(): void {
    const r = this.r;
    const h = this.hx;
    if (this.clock !== null) clearInterval(this.clock);
    this.clock = null;
    // a phone held upright keeps the one-row header (as PR-G keeps the columns in portrait)
    this.two = r.skin.layout.headerStyle === 'two-row' && !this.portrait;
    const items = new Set(r.skin.layout.header);
    const show = (el: HTMLElement, on: boolean) => (el.style.display = on ? '' : 'none');
    show(this.lamp, !this.two || items.has('alarmState'));
    show(this.cd, !this.two || items.has('silenceCountdown'));
    if (!this.two) {
      this.header.className = 'pme-hdr';
      this.header.replaceChildren(this.lamp, this.bar, this.inop, this.cd, this.devEl, this.allOff, this.badge, this.date);
      return;
    }
    this.header.className = 'pme-hdr two';
    h.who.replaceChildren(h.bed, h.cat);
    h.when.replaceChildren(this.date, h.time);
    h.r1.replaceChildren(h.page, h.who, h.sp, this.lamp, this.cd, this.devEl, this.allOff, this.badge, h.when);
    h.r2.replaceChildren(this.bar, this.inop);
    this.header.replaceChildren(h.r1, h.r2);
    h.page.style.background = r.skin.chrome.pageBox.bg;
    h.page.style.color = r.skin.chrome.pageBox.fg;
    h.bed.style.color = h.cat.style.color = r.skin.chrome.patientCategoryColor;
    show(h.page, items.has('page'));
    show(h.bed, items.has('bed'));
    show(h.cat, items.has('category'));
    show(h.when, items.has('datetime'));
    // battery, recorder and network are listed by the skin but not modelled: not drawn
    // E104: the clock is the wall clock and runs on its own, also while the simulation is paused or fast
    if (items.has('datetime')) this.clock = setInterval(() => this.paintClock(), 1000);
  }

  /** Two-row header: the local date over the local time (the one-row header keeps its own date call). */
  private paintClock(): void {
    if (!this.two) return;
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const cal = this.r.skin.calendar;
    this.date.textContent = formatDate(local, cal.default, cal.gregorianFormat);
    this.hx.time.textContent = formatWallTime(now.getTime());
  }

  onEvent(e: EngineEvent): void {
    if (e.type === 'measurement') {
      Object.assign(this.values, e.values);
      if (e.values.nibpSys?.value != null) this.nibpLast = { sys: e.values.nibpSys.value, dia: e.values.nibpDia?.value ?? 0, map: e.values.nibpMean?.value ?? 0, at: e.t };
      // A failed cuff cycle blanks the numerics (`invalid`, null) — the last result must go too, or the tile returns to
      // the pre-arrest pressure with the device's next idle event (Ali 2026-10-10)
      else if (e.values.nibpSys?.flag === 'invalid') {
        this.nibpLast = null;
        this.nibpPr = null; // the cuff's pulse rate belonged to the same result
      }
    } else if (e.type === 'tone' && (e.kind === 'qrs' || e.kind === 'pulse')) {
      // E105: the PR tile's heart blinks with each beat (lit 200 ms per beat tone)
      const heart = this.tiles.querySelector('[data-pme="heart"]');
      if (heart) {
        heart.classList.add('on');
        if (this.heartTimer !== null) clearTimeout(this.heartTimer);
        this.heartTimer = setTimeout(() => {
          heart.classList.remove('on');
          this.heartTimer = null;
        }, 200);
      }
    } else if (e.type === 'nibp') {
      this.nibpEv = e;
      if (e.result) {
        this.nibpPr = e.result.pr;
        this.nibpWallMs = Date.now();
      }
    }
    else if (e.type === 'alarmStatus') this.status = e;
    else if (e.type === 'deviceStatus') this.dev = e;
  }

  /**
   * The timeline went back (a bookmark restore, or a viewer's resync). The numerics, the NIBP result and the alarm and
   * device status belonged to the discarded run — a sensor the restored patient does not have would otherwise keep its
   * last number; they are cleared and refill from the restored engine's next events (≤ 1 s).
   */
  reset(t: number): void {
    this.values = {};
    this.nibpLast = null;
    this.nibpEv = undefined;
    this.nibpPr = null;
    this.nibpWallMs = null;
    this.status = null;
    this.dev = null;
    this.paint(t);
  }

  /** Repaint for sim time t (called with every event batch, ≤ 4 Hz). */
  paint(t: number): void {
    this.paintHeader(t);
    this.paintTiles(t);
  }

  /**
   * A numeric as the tile prints it. A questionable value carries the skin's mark ("97?", brief §4.3, research/06
   * §3.2); an invalid one whose technical alarm is active shows the skin's INOP glyph ("-?-", [S2] IFU p. 55–62);
   * otherwise the no-value dashes.
   */
  private text(m: Measured | undefined, digits = 0, id?: NumericId): string {
    const g = this.r.skin.glyphs;
    if (m && m.value !== null && m.flag !== 'invalid') return m.value.toFixed(digits) + (m.flag === 'questionable' ? g.questionable : '');
    return id !== undefined && this.status?.active.some((a) => a.category === 'technical' && a.numeric === id) ? g.inop : g.noValue;
  }

  /**
   * The HR tile. The ECG rate; with the leads off an AUTO skin that relabels shows the first valid pulse of its
   * priority list under that label (saadat-like "PR", research/06 §4.1); otherwise the skin's HR-unavailable glyph
   * (philips-like "-?-", [S2] IFU p. 55 — the pulse stays in its own tile). Never a "0".
   */
  private hrTile(): { main: string; label: string; source: string | null } {
    const g = this.r.skin.glyphs;
    if (this.dev?.hrDashes) return { main: g.hrUnavailable, label: 'HR', source: null };
    const hr = this.values.hr;
    if (hr && hr.value !== null && hr.flag !== 'invalid') return { main: this.text(hr), label: 'HR', source: 'ECG' };
    if (!this.status?.active.some((a) => a.id === 'ecgLeadsOff')) return { main: g.noValue, label: 'HR', source: null };
    const h = this.r.skin.hr;
    if (h.source === 'AUTO' && h.relabelNonEcgAs) {
      for (const k of h.autoPriority) {
        const src = PULSE_SOURCE[k];
        const m = src ? this.values[src] : undefined;
        if (m && m.value !== null && m.flag === 'valid') return { main: this.text(m), label: h.relabelNonEcgAs, source: k };
      }
    }
    return { main: g.hrUnavailable, label: 'HR', source: null };
  }

  /**
   * The skin's tile extras in order, one entry each: label, value, and whether the one-line sub-text prints it ("PR 76",
   * "PI 1.6", "awRR 12", "T2 36.4", "ΔT 0.4", "ST-II -0.1"). MEAN is the pressure tiles' own sub-line and NMT/BFA
   * extras are drawn by their formatters; a split tile shows them as its parts (part k = entry k − 1), where an extra
   * the engine does not publish (SQI%, EMG%) is a blank value under its label (research/34 §8 O1).
   */
  private extraParts(spec: TileSpec): Array<{ label: string; value: string; text: boolean }> {
    const v = this.values;
    const g = this.r.skin.glyphs;
    return (spec.extras ?? []).map((x) => {
      if (x === 'PR' && spec.param === 'NIBP') return { label: 'PR', value: this.nibpPr !== null ? String(this.nibpPr) : g.noValue, text: true };
      if (x === 'PR') return { label: 'PR', value: this.text(v.pr), text: true };
      if (x === 'PI') return { label: 'PI', value: this.text(v.pi, 1), text: true };
      if (x === 'AWRR') return { label: 'awRR', value: this.text(v.awrr), text: true };
      if (x === 'IMCO2') return { label: this.r.skin.id === 'philips-like' ? 'imCO2' : 'FiCO2', value: this.text(v.imco2), text: true }; // Glossary #16
      if (x === 'T2') return { label: 'T2', value: this.text(v.tempSite, 1), text: true };
      if (x === 'ST') return { label: 'ST-II', value: this.text(v.stII, 1), text: true }; // research/11 glossary #22 (the lead-II ST numeric)
      if (x === 'DT') {
        const a = v.tempCore;
        const b = v.tempSite;
        const ok = a && b && a.value !== null && b.value !== null && a.flag !== 'invalid' && b.flag !== 'invalid';
        return { label: 'ΔT', value: ok ? Math.abs((a.value as number) - (b.value as number)).toFixed(1) : g.noValue, text: true };
      }
      if (x === 'BS%' || x === 'SR') return { label: x, value: this.text(v.sr), text: false }; // the BFA formatter's sub-line
      return { label: x, value: '', text: false };
    });
  }

  /** The one-line extras text of the old skeleton and the unsplit rc.3 tiles. */
  private extras(spec: TileSpec): string {
    return this.extraParts(spec).filter((p) => p.text).map((p) => `${p.label} ${p.value}`).join('  ');
  }

  private paintTiles(t: number): void {
    const g = this.r.skin.glyphs;
    const box = this.r.skin.alarms.numericStyle === 'flash-box';
    for (const tile of this.tileList) {
      const p = tile.spec.param;
      const v = this.values;
      let main = g.noValue;
      let sub = '';
      let label: string = p;
      // NMT/BFA only while the module publishes, unless the skin shows the module always (blank, research/34 §8 O1)
      tile.el.style.display = modulePresent(p, v, t) || this.r.skin.layout.showAlways?.includes(p) ? '' : 'none';
      let source: string | null = null; // the HR tile's rate source (ECG, IBP1, SpO2)
      if (p === 'HR') ({ main, label, source } = this.hrTile());
      else if (p === 'NMT') ({ main, sub } = formatNmt(v, g.noValue));
      else if (p === 'BFA') ({ main, sub } = formatBfa(v, tile.spec.extras?.[0] ?? 'SR', g.noValue));
      else if (p === 'AGENTS') {
        ({ main, sub } = formatAgents(v, g.noValue));
        label = 'EtAA';
      }
      else if (p === 'NIBP') {
        const n = formatNibp(this.nibpEv, this.nibpLast);
        // A failed measurement shows the skin's glyph ("-?-" [S2] IFU p. 56; Saadat "?", research/06 §3.2)
        main = this.nibpEv?.phase === 'failed' ? g.nibpFail : n.main === '---/---' ? `${g.noValue}/${g.noValue}` : n.main;
        sub = `${n.sub === '(---)' ? '' : n.sub} ${n.status}`.trim();
        if (tile.rc3) {
          // rc.3 (research/34 §3 row 8, IMG_8113): "119 / 90" spaced, "(101)" under it, the mode label and the time of
          // the result; the inflating and measuring states keep their text
          const measuring = this.nibpEv?.phase === 'inflating' || this.nibpEv?.phase === 'deflating';
          if (!measuring && this.nibpEv?.phase !== 'failed' && this.nibpLast) main = `${this.nibpLast.sys} / ${this.nibpLast.dia}`;
          if (!measuring) sub = n.sub === '(---)' ? '' : n.sub;
          const mode = tile.el.querySelector('[data-pme="mode"]');
          const time = tile.el.querySelector('[data-pme="ntime"]');
          if (mode) mode.textContent = nibpModeLabel(this.nibpEv);
          if (time) time.textContent = this.nibpWallMs !== null ? formatWallTime(this.nibpWallMs) : '';
        }
      } else if (TILE_NUMERICS[p].numerics.length === 3) {
        const [s, d, m] = TILE_NUMERICS[p].numerics.map((k) => v[k]);
        main = `${this.text(s)}/${this.text(d)}`;
        sub = `(${this.text(m)})`;
      } else if (TILE_NUMERICS[p].numerics.length === 1) {
        const id = TILE_NUMERICS[p].numerics[0] as NumericId;
        main = this.text(v[id], p === 'TEMP' || p === 'ST' ? 1 : 0, id);
      }
      const split = tile.rc3 !== null && tile.rc3.parts.length > 0;
      const extra = split ? '' : this.extras(tile.spec);
      if (extra) sub = sub ? `${sub}  ${extra}` : extra;
      if (tile.spec.label !== undefined && label === p) label = tile.spec.label; // a relabel ("PR") wins over the spec's label
      if (split) {
        sub = '';
        const xs = this.extraParts(tile.spec);
        (tile.rc3 as TileRc3).parts.forEach((pt, k) => {
          if (k > 0) pt.value.textContent = xs[k - 1]?.value ?? '';
        });
        label = tile.spec.parts?.[0]?.label ?? label;
      }
      tile.label.textContent = label;
      tile.value.textContent = main;
      if (p === 'HR' && tile.rc3) this.paintPrTile(tile, source);
      // a three-part pressure ("117/80") overflows a 180 px column at the 40 px numeric size on wide skin fonts [ENG]
      if (!split) tile.value.style.fontSize = main.length > 5 ? (tile.spec.size === 'large' ? '48px' : '32px') : '';
      tile.sub.textContent = sub;
      const partKeys = tile.rc3?.parts.flatMap((pt) => (pt.limitKey ? [pt.limitKey] : [])) ?? [];
      const av = tileAlarmView(p, this.status, this.r, t, this.pump, partKeys);
      tile.bell.innerHTML = av.bellOff && this.r.skin.alarms.alarmOffIcon === 'crossed-bell-red' ? BELL_OFF_SVG : av.bellOff ? '🔕' : '';
      if (tile.lim) tile.lim.textContent = av.limits;
      if (tile.rc3) this.paintPairs(tile, av.pairs);
      const base = split ? 'pv' : 'v';
      tile.value.className = av.flash === 1 ? `${base} pme-f1` : av.flash === 2 ? `${base} pme-f2` : base;
      const bar = av.flash !== null ? this.r.skin.alarms.messageBar[`L${av.flash}`] : null;
      tile.value.style.background = box && bar ? bar.bg : '';
      tile.value.style.color = box && bar ? bar.fg : '';
    }
  }

  private paintHeader(t: number): void {
    const b = barView(this.status, this.r, t, this.pump);
    this.bar.textContent = b.text;
    this.bar.style.background = b.bg;
    this.bar.style.color = b.fg;
    this.bar.className = `pme-bar${b.latched ? ' latched' : ''}`;
    this.bar.dataset.latched = String(b.latched);
    this.inop.textContent = b.inop?.text ?? '';
    this.inop.style.display = b.inop ? '' : 'none';
    this.inop.style.background = b.inop?.bg ?? '';
    this.inop.style.color = b.inop?.fg ?? '';
    const lampColor = b.lamp.startsWith('red') ? '#F00000' : b.lamp.startsWith('yellow') ? '#F0F000' : b.lamp.startsWith('cyan') ? '#00D0D0' : 'transparent';
    this.lamp.style.background = lampColor;
    this.lamp.style.border = `1px solid ${this.r.skin.chrome.divider}`;
    this.lamp.className = `pme-lamp${b.flashHz > 0 ? (b.flashHz === this.r.skin.alarms.lamp.flashHz.L1 ? ' pme-f1' : ' pme-f2') : ''}`;
    this.lamp.dataset.lamp = b.lamp;
    this.cd.textContent = b.countdownS !== null ? `${b.countdownKind === 'pause' ? 'PAUSE' : '🔇'} ${b.countdownS}s` : '';
    this.cd.className = `pme-cd${b.countdownKind === 'silence' ? ' pme-f2' : ''}`;
    this.allOff.innerHTML = b.allOffBell ? BELL_OFF_SVG : '';
    this.devEl.textContent = deviceText(this.dev);
    if (this.two) {
      this.hx.page.textContent = this.page ?? '';
      this.hx.bed.textContent = this.bed;
      const band = this.status?.ageBand ?? 'adult'; // before the first status: ADULT [GUESS]
      this.hx.cat.textContent = band === 'paed' ? 'PEDIATRIC' : band === 'neo' ? 'NEONATE' : 'ADULT';
      this.paintClock();
      return;
    }
    const cal = this.r.skin.calendar;
    this.date.textContent = formatDate(new Date(), cal.default, cal.gregorianFormat);
  }

  destroy(): void {
    if (this.clock !== null) clearInterval(this.clock);
    this.clock = null;
    if (this.heartTimer !== null) clearTimeout(this.heartTimer);
    this.heartTimer = null;
    this.style.remove();
    this.watermark.remove();
  }
}
