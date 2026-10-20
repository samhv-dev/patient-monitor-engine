// Main-thread device chrome (brief §3.1 "DOM numerics tiles (≤1 Hz, CSS flash)"; §6.4 visuals; §6.4.1; §6.9):
// the alarm header (lamp, message bar, silence/pause countdown, all-off bell, layout badge, date), the skin's
// numeric tiles (colours, fonts, glyphs, crossed bells, limits, flashing numerics; request RR-5) and the PUMP
// watermark. What to show comes from alarm-view.ts; this file only paints the DOM.
import type { EngineEvent, Measured, NumericId } from '@pme/engine-core';
import { formatDate, type ResolvedSkin, type TileParam, type TileSpec } from '@pme/skins';
import { barView, tileAlarmView, TILE_NUMERICS, type AlarmStatus } from './alarm-view.ts';
import { formatNibp, formatWallTime } from './numerics-hemo.ts';
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
    '.pme-watermark{position:absolute;left:30%;top:2%;font-size:64px;font-weight:700;opacity:.25;pointer-events:none}',
    // Portrait tiles (a phone): a third of the width each, numerics as large as that leaves
    '.pme-portrait .pme-stile{padding:3px 6px;border-left:1px solid var(--pme-divider);min-width:0}',
    '.pme-portrait .pme-stile .h{font-size:12px;gap:3px}',
    '.pme-portrait .pme-stile .lim{display:none}',
    '.pme-portrait .pme-stile .v{font-size:min(9vw,36px);white-space:nowrap}',
    '.pme-portrait .pme-stile.large .v{font-size:min(11vw,44px)}',
    '.pme-portrait .pme-stile .s{font-size:12px;white-space:nowrap;overflow:hidden;min-height:14px}',
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
  lim: HTMLSpanElement;
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
        const el = doc.createElement('div');
        // The HR tile keeps the original class `pme-tile`, which the IIFE smoke test (and embedders) look up
        el.className = `${spec.param === 'HR' ? 'pme-tile ' : ''}pme-stile${spec.size === 'large' ? ' large' : ''}`;
        el.dataset.param = spec.param;
        el.style.color = r.render.tileColors[spec.param] ?? r.render.foreground;
        el.style.fontFamily = r.render.fontStack;
        el.innerHTML = `<div class="h"><span data-pme="lbl">${spec.param}</span><span data-pme="bell"></span><span class="u">${UNIT[spec.param] ?? ''}</span></div><div class="lim"><span data-pme="lim"></span></div><div class="v" data-pme="v"></div><div class="s" data-pme="s"></div>`;
        const v = el.querySelector('[data-pme="v"]') as HTMLDivElement;
        v.style.fontWeight = String(r.render.numericWeight);
        this.tileList.push({ spec, el, label: el.querySelector('[data-pme="lbl"]') as HTMLSpanElement, value: v, sub: el.querySelector('[data-pme="s"]') as HTMLDivElement, bell: el.querySelector('[data-pme="bell"]') as HTMLSpanElement, lim: el.querySelector('[data-pme="lim"]') as HTMLSpanElement });
        c.append(el);
      }
      this.tiles.append(c);
    }
    this.paintTiles(this.status?.t ?? 0);
    this.paintHeader(this.status?.t ?? 0);
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
    } else if (e.type === 'nibp') {
      this.nibpEv = e;
      if (e.result) this.nibpPr = e.result.pr;
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
  private hrTile(): { main: string; label: string } {
    const g = this.r.skin.glyphs;
    if (this.dev?.hrDashes) return { main: g.hrUnavailable, label: 'HR' };
    const hr = this.values.hr;
    if (hr && hr.value !== null && hr.flag !== 'invalid') return { main: this.text(hr), label: 'HR' };
    if (!this.status?.active.some((a) => a.id === 'ecgLeadsOff')) return { main: g.noValue, label: 'HR' };
    const h = this.r.skin.hr;
    if (h.source === 'AUTO' && h.relabelNonEcgAs) {
      for (const k of h.autoPriority) {
        const src = PULSE_SOURCE[k];
        const m = src ? this.values[src] : undefined;
        if (m && m.value !== null && m.flag === 'valid') return { main: this.text(m), label: h.relabelNonEcgAs };
      }
    }
    return { main: g.hrUnavailable, label: 'HR' };
  }

  /**
   * The skin's tile extras ("PR 76", "PI 1.6", "awRR 12", "T2 36.4", "ΔT 0.4", "ST-II -0.1"). MEAN is the pressure
   * tiles' own sub-line and NMT/BFA extras are drawn by their formatters.
   */
  private extras(spec: TileSpec): string {
    const v = this.values;
    const out: string[] = [];
    for (const x of spec.extras ?? []) {
      if (x === 'PR' && spec.param === 'NIBP') out.push(`PR ${this.nibpPr ?? this.r.skin.glyphs.noValue}`);
      else if (x === 'PR') out.push(`PR ${this.text(v.pr)}`);
      else if (x === 'PI') out.push(`PI ${this.text(v.pi, 1)}`);
      else if (x === 'AWRR') out.push(`awRR ${this.text(v.awrr)}`);
      else if (x === 'IMCO2') out.push(`${this.r.skin.id === 'philips-like' ? 'imCO2' : 'FiCO2'} ${this.text(v.imco2)}`); // Glossary #16
      else if (x === 'T2') out.push(`T2 ${this.text(v.tempSite, 1)}`);
      else if (x === 'ST') out.push(`ST-II ${this.text(v.stII, 1)}`); // research/11 glossary #22 (the lead-II ST numeric)
      else if (x === 'DT') {
        const a = v.tempCore;
        const b = v.tempSite;
        const ok = a && b && a.value !== null && b.value !== null && a.flag !== 'invalid' && b.flag !== 'invalid';
        out.push(`ΔT ${ok ? Math.abs((a.value as number) - (b.value as number)).toFixed(1) : this.r.skin.glyphs.noValue}`);
      }
    }
    return out.join('  ');
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
      tile.el.style.display = modulePresent(p, v, t) ? '' : 'none'; // NMT/BFA only while the module publishes
      if (p === 'HR') ({ main, label } = this.hrTile());
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
      } else if (TILE_NUMERICS[p].numerics.length === 3) {
        const [s, d, m] = TILE_NUMERICS[p].numerics.map((k) => v[k]);
        main = `${this.text(s)}/${this.text(d)}`;
        sub = `(${this.text(m)})`;
      } else if (TILE_NUMERICS[p].numerics.length === 1) {
        const id = TILE_NUMERICS[p].numerics[0] as NumericId;
        main = this.text(v[id], p === 'TEMP' || p === 'ST' ? 1 : 0, id);
      }
      const extra = this.extras(tile.spec);
      if (extra) sub = sub ? `${sub}  ${extra}` : extra;
      tile.label.textContent = label;
      tile.value.textContent = main;
      // a three-part pressure ("117/80") overflows a 180 px column at the 40 px numeric size on wide skin fonts [ENG]
      tile.value.style.fontSize = main.length > 5 ? (tile.spec.size === 'large' ? '48px' : '32px') : '';
      tile.sub.textContent = sub;
      const av = tileAlarmView(p, this.status, this.r, t, this.pump);
      tile.bell.innerHTML = av.bellOff && this.r.skin.alarms.alarmOffIcon === 'crossed-bell-red' ? BELL_OFF_SVG : av.bellOff ? '🔕' : '';
      tile.lim.textContent = av.limits;
      tile.value.className = av.flash === 1 ? 'v pme-f1' : av.flash === 2 ? 'v pme-f2' : 'v';
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
    this.style.remove();
    this.watermark.remove();
  }
}
