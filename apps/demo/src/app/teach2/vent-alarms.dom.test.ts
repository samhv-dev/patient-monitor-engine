// @vitest-environment happy-dom
// The ventilator's alarms on the instructor's screens, from the host's `ventAlarms` event: the alarm line under the
// monitor (beside the monitor's, by level, marked as the ventilator's, in its priority's colour, silenced shown as
// silenced, a new one announced, the instructor's Silence said to be the monitor's), the Log sheet, the Devices sheet's
// alarm list and the Debrief (its table row with its end, the swimlane's own lane).
import { ControllerSession, createInProcessHub, createStamper, type ManagedTransport, type VentAlarmEntry, type WireEvent } from '@pme/controller';
import { afterEach, describe, expect, it } from 'vitest';
import { Link } from '../link.ts';
import { devicesTab } from '../panel/devices.ts';
import type { PanelCtx } from '../panel/ctx.ts';
import { logTab } from '../panel/log.ts';
import { RunRecord } from '../record.ts';
import type { AppSession } from '../session.ts';
import { debriefView } from '../views/debrief.ts';
import { mountAlarmLine } from './alarm-line.ts';

const S = 'VAD234';
const tick = () => new Promise((r) => setTimeout(r, 0));
const pmax: VentAlarmEntry = { id: 'pmax', text: 'High pressure (Pmax)', priority: 'high', silenced: false };
const mvLow: VentAlarmEntry = { id: 'mvLow', text: 'Low minute volume', priority: 'medium', silenced: false };
const spo2Low = { id: 'SPO2_LOW', level: 2, category: 'physiological', text: '%SPO2 LOW', numeric: 'spo2', since: 30, latched: false, acked: false };

function rig() {
  const hub = createInProcessHub();
  const h = hub.connect();
  const t: ManagedTransport = hub.connect();
  const link = new Link(new ControllerSession({ session: S, transport: t }), t); // as on the instructor's phone: no host
  const stamp = createStamper(S, 'host-1');
  const send = async (...body: WireEvent[]) => (h.send(stamp({ kind: 'event', body })), await tick());
  return { link, send };
}
afterEach(() => document.body.replaceChildren());

describe('the alarm line under the monitor', () => {
  it("shows the ventilator's beside the monitor's by level, marked and coloured; silenced as silenced; Silence is the monitor's", async () => {
    const { link, send } = rig();
    const line = mountAlarmLine(link, () => undefined);
    const texts = () => [...line.el.querySelectorAll('.ip2-alarm-texts > span')].map((s) => [s.textContent, (s as HTMLElement).dataset.vent ?? null]);
    const hint = () => line.el.querySelector('.ip2-alarm-hint')?.textContent;
    expect(line.el.querySelector('.ip2-alarm-count')?.textContent).toBe('No alarms');

    await send({ type: 'alarmStatus', t: 30, active: [spo2Low] } as never, { type: 'ventAlarms', t: 31, screen: 'window', active: [mvLow, pmax] });
    line.refresh();
    expect(line.el.querySelector('.ip2-alarm-count')?.textContent).toBe('3 alarms');
    expect(line.el.dataset.level).toBe('1');
    expect(texts()).toEqual([['Ventilator: High pressure (Pmax)', 'high'], ['SpO₂ low', null], ['Ventilator: Low minute volume', 'medium']]);
    expect(hint()).toBe('Shift+S silences the monitor only · opens the list');
    const live = line.el.querySelector('[aria-live]');
    expect(live?.textContent).toBe('Ventilator alarm: Low minute volume, High pressure (Pmax)');

    await send({ type: 'ventAlarms', t: 40, screen: 'window', active: [{ ...mvLow, silenced: true }, { ...pmax, silenced: true }] });
    line.refresh();
    expect(texts()[0]).toEqual(['Ventilator: High pressure (Pmax) (silenced)', 'high']);
    expect(line.el.querySelector('.ip2-alarm-count')?.textContent, 'silenced is not ended').toBe('3 alarms');

    await send({ type: 'ventAlarms', t: 50, screen: 'window', active: [] }, { type: 'alarmStatus', t: 50, active: [] } as never);
    line.refresh();
    expect(line.el.querySelector('.ip2-alarm-count')?.textContent).toBe('No alarms');
    expect(hint()).toBe('opens the list');
    link.close();
  });
});

describe('the Log and the Devices sheets', () => {
  const ctxOf = (link: Link) => {
    let refresh = () => undefined as void;
    const ctx = { link, staging: {}, site: {}, weightKg: () => 70, onRefresh: (fn: () => void) => (refresh = fn), goTab: () => undefined } as unknown as PanelCtx;
    return { ctx, refresh: () => refresh() };
  };
  it('the Log lists each change with its time; the alarm list names the ventilator, its priority and its silence', async () => {
    const { link, send } = rig();
    await send({ type: 'ventAlarms', t: 75, screen: 'device', active: [pmax] }, { type: 'ventAlarms', t: 95, screen: 'device', active: [{ ...pmax, silenced: true }] });
    const log = ctxOf(link);
    const logEl = logTab(log.ctx);
    log.refresh();
    expect([...logEl.querySelectorAll('ol.log li')].map((li) => li.textContent)).toEqual([
      '01:35AlarmVentilator: High pressure (Pmax) sound silenced on the ventilator',
      '01:15AlarmVentilator: High pressure (Pmax) raised, high priority',
    ]);
    const dev = ctxOf(link);
    const devEl = devicesTab(dev.ctx);
    dev.refresh();
    expect([...devEl.querySelectorAll('ul.alarms li')].map((li) => li.textContent)).toEqual(['!!! HighVentilator: High pressure (Pmax)silenced on the ventilator']);
    link.close();
  });
});

describe('the Debrief', () => {
  it('a ventilator alarm row with its raise and end, and its own swimlane lane', async () => {
    const record = new RunRecord(() => ({ patient: 'F 45 y 68 kg', weightKg: 68 }), () => 0);
    record.wire({ type: 'ventAlarms', t: 75, screen: 'window', active: [pmax] });
    record.wire({ type: 'ventAlarms', t: 140, screen: 'window', active: [] });
    record.data.rows.push({ t: 150, kind: 'action', text: 'Salbutamol 250 µg IV', ev: 'drug:salbutamol' });
    record.data.samples = Array.from({ length: 200 }, (_, t) => ({ t, hr: 80, map: 72, spo2: 98, etco2: 35, rr: 12, temp: 37, k: null, lactate: null, ph: null, glucose: null, tcore: null }));
    const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
    const view = debriefView({ record } as unknown as AppSession, link);
    document.body.append(view.el);
    view.enter?.('');
    expect(view.el.querySelector('#db-moments tr.db-alarms')?.textContent).toBe('Alarms since the last row: Ventilator window: High pressure (Pmax) 01:15 ▸ cleared 02:20');
    const lane = view.el.querySelector('[data-lane="ventilator"]');
    expect(lane?.textContent).toContain('Ventilator alarms');
    expect(lane?.querySelector('.db-swim-a')?.getAttribute('data-end')).toBe('140');
    expect(view.el.querySelector('[data-lane="monitor"]'), 'no monitor alarm, no monitor lane').toBeNull();
  });
});
