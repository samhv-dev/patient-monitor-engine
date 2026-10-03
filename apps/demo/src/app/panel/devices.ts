// Devices & alarms (research/13 §4.3 item 6). The alarm list mirrors the monitor in the SKIN's colours, steady (the
// monitor flashes; its mirror must not pull the instructor's eye), with the priority as a marker and a word as well
// (IEC 60601-1-8; research/13-ui-design-references rules 3, 4). Silence and pause show the IEC 60417 bell-cancel /
// alarm-inhibit meaning in words with a countdown. Sensors attach and detach per channel (Laerdal: traces appear only
// once attached).
import type { SensorId } from '@pme/engine-core';
import { alarmLine } from '../alarms.ts';
import { describeCommand, SENSORS } from '../describe.ts';
import { LEVEL_MARK, LEVEL_NAME } from '../shell.ts';
import { button, clock, h, select, setText, toast, toggle } from '../ui.ts';
import type { PanelCtx } from './ctx.ts';

const CHANNELS: ReadonlyArray<[SensorId, 'on' | 'connected']> = [['ecg', 'on'], ['spo2', 'on'], ['nibp', 'on'], ['co2', 'on'], ['temp', 'on'], ['abp', 'connected'], ['cvp', 'connected'], ['pap', 'connected']];

export function devicesTab(c: PanelCtx): HTMLElement {
  const { link } = c;
  const now = async (cmd: Record<string, unknown>) => {
    const r = await link.send(cmd as never);
    toast(r.accepted ? describeCommand(cmd) : `Not done: ${r.reason ?? 'refused'}`);
    return r.accepted;
  };
  const dev = (action: Record<string, unknown>) => now({ type: 'device', action });

  // ---- alarms ----
  const list = h('ul', { class: 'alarms', 'aria-label': 'Active alarms' });
  const live = h('div', { class: 'sr-only', 'aria-live': 'assertive' });
  const status = h('p', { class: 'hint', role: 'status' });
  let announced = new Set<string>();
  const actions = h('div', { class: 'row' },
    button('Silence', () => void dev({ device: 'alarm', action: 'silence' }), 'primary'),
    button('Pause alarms', () => void dev({ device: 'alarm', action: 'pause' })),
    button('Acknowledge', () => void dev({ device: 'alarm', action: 'ack' })),
    button('All alarms on', () => void dev({ device: 'alarm', action: 'enableAll', value: true }), 'ghost'));

  // ---- sensors ----
  const host = link.host;
  const attached = new Map<SensorId, boolean>(CHANNELS.map(([s]) => [s, host ? host.spec.attached && ['ecg', 'spo2', 'nibp', 'co2', 'temp'].includes(s) : false]));
  const toggles = CHANNELS.map(([s, onState]) => toggle(SENSORS[s] ?? 'Sensor', attached.get(s) ?? false, (on) => {
    attached.set(s, on);
    void now({ type: 'attachSensor', sensor: s, state: on ? onState : s === 'abp' || s === 'cvp' || s === 'pap' ? 'none' : 'off' });
  }));
  // A Remote does not know which sensors are attached (the engine does not report it yet, R-S9-6): its toggles start
  // with no pressed state, and the first tap attaches the sensor (R50 review F14).
  if (!host) for (const b of toggles) b.removeAttribute('aria-pressed');
  const sensors = h('div', { class: 'toggles' }, ...toggles);

  // ---- NIBP ----
  const interval = select('Automatic interval', [['0', 'Off (manual)'], ['1', 'Every 1 min'], ['3', 'Every 3 min'], ['5', 'Every 5 min'], ['10', 'Every 10 min'], ['15', 'Every 15 min']], '0', (v) =>
    void dev(Number(v) > 0 ? { device: 'nibp', action: 'auto', intervalMin: Number(v) } : { device: 'nibp', action: 'manual' }));
  const nibp = h('div', { class: 'row' }, button('Start NIBP now', () => void dev({ device: 'nibp', action: 'start' })), interval.el);

  c.onRefresh(() => {
    const a = link.alarms;
    const act = a?.active ?? [];
    list.replaceChildren(...[...act].sort((x, y) => x.level - y.level).map((x) => {
      const lv = LEVEL_NAME[x.level];
      // glossary words outside the monitor frame (review F4); the monitor's own text is the tooltip
      return h('li', { 'data-level': lv, title: `On the monitor: ${x.text}`, 'data-vendor-title': '' },
        h('span', { class: 'pri', 'data-level': lv }, `${LEVEL_MARK[x.level]} ${lv[0]?.toUpperCase()}${lv.slice(1)}`),
        h('span', {}, alarmLine(x).text, x.latched ? h('span', { class: 'muted' }, ' (latched)') : null),
        h('span', { class: 'num muted' }, x.acked ? 'acknowledged' : clock(x.since)));
    }));
    if (!act.length) list.replaceChildren(h('li', { class: 'none' }, a?.allOff ? 'All alarms are off on this monitor' : 'No active alarms'));
    const simT = a?.t ?? link.simT;
    const parts: string[] = [];
    if (a?.silencedUntil && a.silencedUntil > simT) parts.push(`Sound silenced, ${clock(a.silencedUntil - simT)} left`);
    if (a?.pausedUntil && a.pausedUntil > simT) parts.push(`Alarms paused, ${clock(a.pausedUntil - simT)} left`);
    if (a?.allOff) parts.push('Alarms off (the monitor was found this way)');
    setText(status, parts.join('. ') || 'Alarm sound on');
    const highs = act.filter((x) => x.level === 1 && !announced.has(x.id));
    if (highs.length) setText(live, `High priority alarm: ${highs.map((x) => alarmLine(x).text).join(', ')}`);
    announced = new Set(act.map((x) => x.id));
  });

  return h('div', {}, h('h3', {}, 'Alarms'), status, list, live, actions, h('h3', {}, 'Sensors'), h('p', { class: 'hint' }, 'A trace appears on the monitor only while its sensor is attached.'),
    host ? null : h('p', { class: 'hint' }, 'On a remote the sensors show no state until you set them: the monitor does not report which are attached yet.'), sensors, h('h3', {}, 'NIBP'), nibp);
}
