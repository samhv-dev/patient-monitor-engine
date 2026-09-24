// Stage 2 numeric tiles (brief §6.1, §6.3): ABP/PAP "S/D (M)", CVP mean, PR, PI and NIBP with its measuring
// state, live cuff pressure and "hh:mm" timestamp. Pure formatters are exported for tests (Node has no DOM).
import type { EngineEvent, Measured } from '@pme/engine-core';

type NibpEvent = Extract<EngineEvent, { type: 'nibp' }>;

/** "120/80" and "(95)"; dashes when any part is missing or invalid. */
export function formatPressure(sys: Measured | undefined, dia: Measured | undefined, mean: Measured | undefined): { main: string; sub: string } {
  const ok = (m: Measured | undefined): m is Measured & { value: number } => !!m && m.value !== null && m.flag !== 'invalid';
  const main = ok(sys) && ok(dia) ? `${Math.round(sys.value)}/${Math.round(dia.value)}` : '---/---';
  const sub = ok(mean) ? `(${Math.round(mean.value)})` : '(---)';
  return { main, sub };
}

/** Sim seconds → "hh:mm" on a clock that starts at 00:00 when the engine starts. */
export function formatClock(simT: number): string {
  const m = Math.floor(simT / 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export interface NibpView {
  main: string; // last result "S/D" or the live cuff pressure while measuring
  sub: string; // "(M)" or the phase
  status: string; // timestamp, countdown or failure text
}

/** NIBP tile text from the latest nibp event and the last result (brief §6.3 state machine). */
export function formatNibp(e: NibpEvent | undefined, last: { sys: number; dia: number; map: number; at: number } | null): NibpView {
  const res = last ? { main: `${last.sys}/${last.dia}`, sub: `(${last.map})` } : { main: '---/---', sub: '(---)' };
  if (!e) return { ...res, status: last ? formatClock(last.at) : 'MANUAL' };
  if (e.phase === 'inflating' || e.phase === 'deflating') return { main: String(e.cuffMmHg ?? 0), sub: 'mmHg', status: e.phase === 'inflating' ? 'NBP inflating' : 'NBP measuring' };
  if (e.phase === 'failed') return { ...res, status: 'NBP measurement failed' };
  const next = e.nextInS !== undefined ? `  next ${Math.floor(e.nextInS / 60)}:${String(Math.round(e.nextInS % 60)).padStart(2, '0')}` : '';
  return { ...res, status: `${last ? formatClock(last.at) : ''}${next}`.trim() || 'MANUAL' };
}

function tileShell(parent: HTMLElement, label: string, unit: string, color: string) {
  const doc = parent.ownerDocument;
  const el = doc.createElement('div');
  el.className = 'pme-tile';
  el.style.cssText = `color:${color};font-family:system-ui,sans-serif;padding:6px 12px;line-height:1.05;border-top:1px solid #222;`;
  const head = doc.createElement('div');
  head.style.cssText = 'font-size:14px;display:flex;justify-content:space-between;gap:12px;';
  head.innerHTML = `<span>${label}</span><span style="opacity:.8">${unit}</span>`;
  el.append(head);
  parent.append(el);
  const line = (css: string) => {
    const d = doc.createElement('div');
    d.style.cssText = css;
    el.append(d);
    return d;
  };
  return { el, line };
}

/** "S/D" large with "(M)" below (ABP, PAP, NIBP), or a single mean (CVP, PR, PI). */
export class PressureTile {
  private readonly main: HTMLDivElement;
  private readonly sub: HTMLDivElement;
  private readonly status: HTMLDivElement;

  constructor(parent: HTMLElement, label: string, unit: string, color: string) {
    const t = tileShell(parent, label, unit, color);
    this.main = t.line('font-size:34px;font-weight:600;text-align:right;font-variant-numeric:tabular-nums;');
    this.sub = t.line('font-size:20px;text-align:right;font-variant-numeric:tabular-nums;');
    this.status = t.line('font-size:12px;text-align:right;opacity:.85;min-height:14px;');
    this.main.textContent = '---/---';
  }

  set(main: string, sub: string, status = ''): void {
    this.main.textContent = main;
    this.sub.textContent = sub;
    this.status.textContent = status;
  }
}
