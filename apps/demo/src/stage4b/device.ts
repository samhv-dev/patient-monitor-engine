// Stage 4b demo (BUILD-PLAN Stage 4 "Demo"): the live monitor in each skin, alarm test controls, defibrillator and
// pacer controls, the 12-lead report, trends and the event log with export. window.__pme4b is the e2e hook.
import { RHYTHM_IDS, type Capture12, type Command, type EngineEvent, type NumericId, type RhythmId } from '@pme/engine-core';
import { draw12Lead, drawTrend, mountMonitor, type TrendSeries } from '@pme/renderer';

type CommandBody = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const q = new URLSearchParams(location.search);
const skin0 = q.get('skin') ?? 'saadat-like';
const pm = mountMonitor($('monitor'), {
  skin: skin0,
  ...(q.get('theme') ? { theme: q.get('theme') as string } : {}),
  engine: { seed: Number(q.get('seed') ?? 7), patient: { sensors: { abp: 'connected', cvp: 'connected', spo2: 'on', nibp: 'on' } } },
});
let n = 0;
const events: EngineEvent[] = [];
pm.on((e) => {
  if (e.type !== 'measurement' && e.type !== 'beat' && e.type !== 'tone') events.push(e);
  if (events.length > 5000) events.splice(0, 1000);
});
const send = (c: CommandBody) => pm.dispatch({ id: `4b-${++n}`, issuedBy: 'stage4b', ...c } as Command);
let lastCapture: Capture12 | null = null;
(window as unknown as { __pme4b: unknown }).__pme4b = { pm, send, events, ready: true };

$<HTMLSelectElement>('skin').value = skin0;
const reskin = () => void pm.setSkin($<HTMLSelectElement>('skin').value, { ...($<HTMLSelectElement>('theme').value ? { theme: $<HTMLSelectElement>('theme').value } : {}), ...($<HTMLSelectElement>('page').value ? { page: $<HTMLSelectElement>('page').value } : {}) });
for (const id of ['skin', 'theme', 'page']) $(id).addEventListener('change', reskin);
$('age').addEventListener('change', () => void send({ type: 'device', action: { device: 'monitor', action: 'ageBand', value: $<HTMLSelectElement>('age').value } }));
$('sound').addEventListener('click', () => void pm.enableSound());

const rs = $<HTMLSelectElement>('rhythm');
for (const id of RHYTHM_IDS) rs.add(new Option(id, id));
rs.value = 'sinus';
rs.addEventListener('change', () => void send({ type: 'setRhythm', rhythm: rs.value as RhythmId }));
$('hr').addEventListener('input', () => {
  $('hrVal').textContent = $<HTMLInputElement>('hr').value;
  void send({ type: 'setTarget', variable: 'hr', value: Number($<HTMLInputElement>('hr').value) });
});
const toggle = (id: string, fn: (on: boolean) => void) =>
  $(id).addEventListener('click', () => {
    const on = $(id).getAttribute('aria-pressed') !== 'true';
    $(id).setAttribute('aria-pressed', String(on));
    fn(on);
  });
toggle('leads', (on) => void send({ type: 'attachSensor', sensor: 'ecg', state: on ? 'off' : 'on' }));
toggle('probe', (on) => void send({ type: 'attachSensor', sensor: 'spo2', state: on ? 'off' : 'on' }));
$('nibp').addEventListener('click', () => void send({ type: 'device', action: { device: 'nibp', action: 'start' } }));
for (const a of ['silence', 'pause', 'ack'] as const) $(a).addEventListener('click', () => void send({ type: 'device', action: { device: 'alarm', action: a } }));
$('allOn').addEventListener('click', () => void send({ type: 'device', action: { device: 'alarm', action: 'enableAll', value: true } }));
toggle('arr', (on) => void send({ type: 'device', action: { device: 'alarm', action: 'arrhythmiaAnalysis', value: on } }));

const defib = (action: 'charge' | 'shock' | 'disarm' | 'syncOn' | 'syncOff' | 'preselect', extra: Record<string, unknown> = {}) =>
  send({ type: 'applyEvent', event: { kind: 'defib', action, ...extra } } as CommandBody);
$('charge').addEventListener('click', () => void defib('charge', { energyJ: Number($<HTMLInputElement>('energy').value) }));
$('shock').addEventListener('click', () => {
  const pre = $<HTMLSelectElement>('preselect').value;
  void (pre ? defib('preselect', { outcome: pre }) : Promise.resolve()).then(() => defib('shock'));
});
$('disarm').addEventListener('click', () => void defib('disarm'));
toggle('sync', (on) => void defib(on ? 'syncOn' : 'syncOff'));
toggle('ppause', () => undefined);
$('papply').addEventListener('click', () => {
  void send({ type: 'setTarget', variable: 'paceThresholdMa', value: Number($<HTMLInputElement>('pthr').value) });
  void send({
    type: 'applyEvent',
    event: {
      kind: 'pacer', action: 'set', mode: $<HTMLSelectElement>('pmode').value as 'off', ratePpm: Number($<HTMLInputElement>('prate').value), mA: Number($<HTMLInputElement>('pma').value),
      pause: $('ppause').getAttribute('aria-pressed') === 'true', fault: $<HTMLSelectElement>('pfault').value as 'none',
    },
  });
});

// 12-lead report (brief §6.6): dialog with PNG / JSON / print
$('capture').addEventListener('click', async () => {
  lastCapture = await pm.capture12();
  const c = $<HTMLCanvasElement>('ecg12');
  draw12Lead(c.getContext('2d') as unknown as Parameters<typeof draw12Lead>[0], lastCapture, 4);
  $<HTMLDialogElement>('dlg').showModal();
});
$('close').addEventListener('click', () => $<HTMLDialogElement>('dlg').close());
const download = (name: string, href: string) => Object.assign(document.createElement('a'), { download: name, href }).click();
$('png').addEventListener('click', () => download('12-lead.png', $<HTMLCanvasElement>('ecg12').toDataURL('image/png')));
$('cjson').addEventListener('click', () => {
  if (!lastCapture) return;
  const leads = Object.fromEntries(Object.entries(lastCapture.leads).map(([k, v]) => [k, Array.from(v, (x) => +x.toFixed(4))]));
  download('12-lead.json', URL.createObjectURL(new Blob([JSON.stringify({ ...lastCapture, leads })], { type: 'application/json' })));
});

// trends and event log (brief §6.7)
for (const b of document.querySelectorAll<HTMLButtonElement>('#tabs [data-tab]')) {
  b.addEventListener('click', () => {
    for (const x of document.querySelectorAll('#tabs [data-tab]')) x.setAttribute('aria-selected', String(x === b));
    for (const p of document.querySelectorAll<HTMLElement>('[data-pane]')) p.hidden = p.dataset.pane !== b.dataset.tab;
  });
}
$('csv').addEventListener('click', () => download('event-log.csv', URL.createObjectURL(new Blob([pm.eventLog.toCSV()], { type: 'text/csv' }))));
$('json').addEventListener('click', () => download('event-log.json', URL.createObjectURL(new Blob([JSON.stringify(pm.eventLog.toJSON())], { type: 'application/json' }))));
const SERIES: Array<[NumericId, [number, number]]> = [['hr', [0, 200]], ['abpSys', [0, 200]], ['abpDia', [0, 200]], ['spo2', [50, 100]], ['nibpSys', [0, 200]]];
setInterval(() => {
  const s = pm.skin;
  const color = (id: NumericId) => (id === 'hr' ? s?.skin.colors.HR : id.startsWith('abp') ? (s?.skin.colors.ART ?? s?.skin.colors.IBP1) : id === 'spo2' ? s?.skin.colors.SpO2 : s?.skin.colors.NIBP) ?? '#fff';
  const series: TrendSeries[] = SERIES.map(([id, range]) => ({ id, range, color: color(id) }));
  const to = pm.trends.latestS;
  const c = $<HTMLCanvasElement>('trendCanvas');
  drawTrend(c.getContext('2d') as unknown as Parameters<typeof drawTrend>[0], pm.trends, series, Math.max(0, to - Number($<HTMLSelectElement>('span').value)), Math.max(1, to), c.width, c.height, s?.skin.trend.style ?? 'line', s?.render.background ?? '#000');
  $('log').textContent = pm.eventLog.entries.slice(-200).map((e) => `${e.t.toFixed(1).padStart(8)}  ${e.kind.padEnd(7)} ${e.issuedBy ?? ''}  ${e.text}`).join('\n');
}, 1000);
