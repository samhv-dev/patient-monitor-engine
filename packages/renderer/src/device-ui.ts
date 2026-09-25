// Main-thread device chrome (brief §3.1 "DOM numerics tiles (≤1 Hz, CSS flash)"; §6.4 visuals; §6.4.1; §6.9):
// the alarm header (lamp, message bar, silence/pause countdown, all-off bell, layout badge, date), the skin's
// numeric tiles (colours, fonts, glyphs, crossed bells, limits, flashing numerics; request RR-5) and the PUMP
// watermark. What to show comes from alarm-view.ts; this file only paints the DOM.
import type { EngineEvent, Measured, NumericId } from '@pme/engine-core';
import { formatDate, type ResolvedSkin, type TileParam, type TileSpec } from '@pme/skins';
import { barView, tileAlarmView, TILE_NUMERICS, type AlarmStatus } from './alarm-view.ts';
import { formatNibp } from './numerics-hemo.ts';

type NibpEvent = Extract<EngineEvent, { type: 'nibp' }>;
type DeviceStatus = Extract<EngineEvent, { type: 'deviceStatus' }>;

const UNIT: Partial<Record<TileParam, string>> = {
  HR: 'bpm', NIBP: 'mmHg', ART: 'mmHg', CVP: 'mmHg', PAP: 'mmHg', IBP1: 'mmHg', IBP2: 'mmHg', IBP3: 'mmHg', IBP4: 'mmHg', SpO2: '%', TEMP: '°C', RR: 'rpm', CO2: 'mmHg', ST: 'mV',
};
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
    '.pme-cd{min-width:4.5em;font-variant-numeric:tabular-nums}',
    '.pme-badge{font-size:11px;border:1px solid currentColor;padding:1px 4px;opacity:.9}',
    '.pme-stile{padding:4px 10px;line-height:1.05;border-top:1px solid var(--pme-divider)}',
    '.pme-stile .h{display:flex;gap:6px;align-items:center;font-size:13px}',
    '.pme-stile .h .u{margin-left:auto;opacity:.8}',
    '.pme-stile .lim{font-size:11px;opacity:.9;min-height:12px;text-align:right}',
    '.pme-stile .v{font-size:40px;text-align:right;font-variant-numeric:tabular-nums}',
    '.pme-stile.large .v{font-size:60px}',
    '.pme-stile .s{font-size:16px;text-align:right;font-variant-numeric:tabular-nums;min-height:18px}',
    '.pme-watermark{position:absolute;left:30%;top:2%;font-size:64px;font-weight:700;opacity:.25;pointer-events:none}',
  ].join('\n');
}

interface Tile {
  spec: TileSpec;
  el: HTMLDivElement;
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
  private status: AlarmStatus | null = null;
  private dev: DeviceStatus | null = null;
  private readonly lamp: HTMLDivElement;
  private readonly bar: HTMLDivElement;
  private readonly cd: HTMLSpanElement;
  private readonly allOff: HTMLSpanElement;
  private readonly badge: HTMLSpanElement;
  private readonly date: HTMLSpanElement;

  constructor(doc: Document, waveArea: HTMLElement, r: ResolvedSkin, page?: string) {
    this.r = r;
    this.style = doc.createElement('style');
    doc.head.append(this.style);
    this.header = doc.createElement('div');
    this.header.className = 'pme-hdr';
    this.header.innerHTML =
      '<div class="pme-lamp" data-pme="lamp"></div><div class="pme-bar" data-pme="bar"></div><span class="pme-cd" data-pme="cd"></span>' +
      '<span data-pme="alloff"></span><span class="pme-badge" data-pme="badge"></span><span data-pme="date"></span>';
    const q = <T extends HTMLElement>(k: string) => this.header.querySelector(`[data-pme="${k}"]`) as T;
    this.lamp = q('lamp');
    this.bar = q('bar');
    this.cd = q('cd');
    this.allOff = q('alloff');
    this.badge = q('badge');
    this.date = q('date');
    this.tiles = doc.createElement('div');
    this.tiles.style.cssText = 'display:flex;flex:none;overflow:hidden;';
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
    this.style.textContent = flashCss(r);
    this.header.style.cssText = `background:${r.render.background};color:${r.render.foreground};font-family:${r.render.fontStack};border-bottom:1px solid ${r.skin.chrome.divider};`;
    this.badge.textContent = r.skin.layout.badge ?? '';
    this.badge.style.display = r.skin.layout.badge ? '' : 'none';
    this.tiles.style.background = r.render.background;
    this.tiles.style.setProperty('--pme-divider', r.skin.chrome.divider);
    this.tiles.replaceChildren();
    this.tileList = [];
    const doc = this.tiles.ownerDocument;
    for (const col of r.skin.layout.tiles) {
      const c = doc.createElement('div');
      c.style.cssText = `width:180px;border-left:1px solid ${r.skin.chrome.divider};`;
      for (const spec of col) {
        const el = doc.createElement('div');
        el.className = `pme-stile${spec.size === 'large' ? ' large' : ''}`;
        el.dataset.param = spec.param;
        el.style.color = r.render.tileColors[spec.param] ?? r.render.foreground;
        el.style.fontFamily = r.render.fontStack;
        el.innerHTML = `<div class="h"><span>${spec.param}</span><span data-pme="bell"></span><span class="u">${UNIT[spec.param] ?? ''}</span></div><div class="lim"><span data-pme="lim"></span></div><div class="v" data-pme="v"></div><div class="s" data-pme="s"></div>`;
        const v = el.querySelector('[data-pme="v"]') as HTMLDivElement;
        v.style.fontWeight = String(r.render.numericWeight);
        this.tileList.push({ spec, el, value: v, sub: el.querySelector('[data-pme="s"]') as HTMLDivElement, bell: el.querySelector('[data-pme="bell"]') as HTMLSpanElement, lim: el.querySelector('[data-pme="lim"]') as HTMLSpanElement });
        c.append(el);
      }
      this.tiles.append(c);
    }
    this.paintTiles(this.status?.t ?? 0);
    this.paintHeader(this.status?.t ?? 0);
  }

  onEvent(e: EngineEvent): void {
    if (e.type === 'measurement') {
      Object.assign(this.values, e.values);
      if (e.values.nibpSys?.value != null) this.nibpLast = { sys: e.values.nibpSys.value, dia: e.values.nibpDia?.value ?? 0, map: e.values.nibpMean?.value ?? 0, at: e.t };
    } else if (e.type === 'nibp') this.nibpEv = e;
    else if (e.type === 'alarmStatus') this.status = e;
    else if (e.type === 'deviceStatus') this.dev = e;
  }

  /** Repaint for sim time t (called with every event batch, ≤ 4 Hz). */
  paint(t: number): void {
    this.paintHeader(t);
    this.paintTiles(t);
  }

  private text(m: Measured | undefined, digits = 0): string {
    return m && m.value !== null && m.flag !== 'invalid' ? m.value.toFixed(digits) : this.r.skin.glyphs.noValue;
  }

  private paintTiles(t: number): void {
    const g = this.r.skin.glyphs;
    const box = this.r.skin.alarms.numericStyle === 'flash-box';
    for (const tile of this.tileList) {
      const p = tile.spec.param;
      const v = this.values;
      let main = g.noValue;
      let sub = '';
      if (p === 'HR') main = this.dev?.hrDashes ? g.hrUnavailable : this.text(v.hr);
      else if (p === 'NIBP') {
        const n = formatNibp(this.nibpEv, this.nibpLast);
        main = n.main === '---/---' ? `${g.noValue}/${g.noValue}` : n.main;
        sub = `${n.sub === '(---)' ? '' : n.sub} ${n.status}`.trim();
      } else if (TILE_NUMERICS[p].numerics.length === 3) {
        const [s, d, m] = TILE_NUMERICS[p].numerics.map((k) => v[k]);
        main = `${this.text(s)}/${this.text(d)}`;
        sub = `(${this.text(m)})`;
      } else if (TILE_NUMERICS[p].numerics.length === 1) main = this.text(v[TILE_NUMERICS[p].numerics[0] as NumericId], p === 'TEMP' || p === 'ST' ? 1 : 0);
      if (p === 'SpO2') sub = `PR ${this.text(v.pr)}  PI ${this.text(v.pi, 1)}`;
      tile.value.textContent = main;
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
    const lampColor = b.lamp.startsWith('red') ? '#F00000' : b.lamp.startsWith('yellow') ? '#F0F000' : b.lamp.startsWith('cyan') ? '#00D0D0' : 'transparent';
    this.lamp.style.background = lampColor;
    this.lamp.style.border = `1px solid ${this.r.skin.chrome.divider}`;
    this.lamp.className = `pme-lamp${b.flashHz > 0 ? (b.flashHz === this.r.skin.alarms.lamp.flashHz.L1 ? ' pme-f1' : ' pme-f2') : ''}`;
    this.lamp.dataset.lamp = b.lamp;
    this.cd.textContent = b.countdownS !== null ? `${b.countdownKind === 'pause' ? 'PAUSE' : '🔇'} ${b.countdownS}s` : '';
    this.cd.className = `pme-cd${b.countdownKind === 'silence' ? ' pme-f2' : ''}`;
    this.allOff.innerHTML = b.allOffBell ? BELL_OFF_SVG : '';
    const cal = this.r.skin.calendar;
    this.date.textContent = formatDate(new Date(), cal.default, cal.gregorianFormat);
  }

  destroy(): void {
    this.style.remove();
    this.watermark.remove();
  }
}
