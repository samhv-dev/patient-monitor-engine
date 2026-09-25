// Stage 3 demo (BUILD-PLAN Stage 3 "Demo"): ECG II + ABP + pleth + CO2 + RESP lanes; SpO2 (PI), EtCO2/FiCO2/awRR,
// RR and TEMP tiles; ventilation source/settings, airway states, preoxygenation, GA temperature, MH, sensors,
// and a scripted "apnoea after preoxygenation" that shows the whole SpO2 lag story (R8) on a truth-vs-displayed plot.
import type { Command } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';

type CommandBody = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pm = mountMonitor($('monitor'), {
  skin: 'philips-like',
  engine: { seed: 7, patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M', sensors: { abp: 'connected', spo2: 'on', co2: 'on', temp: 'on' } } },
  lanes: ['ecgII'],
  waves: ['abp', 'pleth', 'co2', 'resp'],
  temp: true,
});
let n = 0;
const send = (c: CommandBody) =>
  pm.dispatch({ id: `demo-${++n}`, issuedBy: 'stage3', ...c } as Command).then((r) => {
    if (!r.accepted) console.warn('rejected', c, r.reason);
    return r;
  });
const ev = (event: Record<string, unknown>) => send({ type: 'applyEvent', event } as CommandBody);
const num = (id: string) => Number($<HTMLInputElement>(id).value);
const toggle = (id: string, on: (pressed: boolean) => void) => {
  const b = $<HTMLButtonElement>(id);
  b.addEventListener('click', () => {
    const p = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(p));
    on(p);
  });
};

// Ventilation and airway
const vent = () => ev({ kind: 'ventilation', source: $<HTMLSelectElement>('source').value, rr: num('rr'), vtMl: num('vt'), fio2: num('fio2'), peep: num('peep') });
$('applyVent').addEventListener('click', () => void vent());
$('airway').addEventListener('change', () => void ev({ kind: 'airway', state: $<HTMLSelectElement>('airway').value }));
$('preox').addEventListener('click', () => void ev({ kind: 'preoxygenate', fio2: 1, durationS: 180 }));
toggle('rebreathe', (p) => void ev({ kind: 'ventilation', source: 'ventilator', rr: num('rr'), vtMl: num('vt'), fio2: num('fio2'), peep: num('peep'), fico2: p ? 6 : 0 }));
toggle('cleft', (p) => void ev({ kind: 'ventilation', source: 'ventilator', rr: 8, vtMl: num('vt'), fio2: num('fio2'), peep: num('peep'), effort: p ? 0.6 : 0 }));

// Conditions
toggle('ga', (p) => void ev({ kind: 'thermal', anaesthesia: p ? 'general' : 'none' }));
toggle('mh', (p) => void ev({ kind: 'condition', id: 'mh', severity: p ? 1 : 0 }));
$('vf').addEventListener('click', () => void send({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' } as CommandBody));

// Sensors
$('co2').addEventListener('change', () => {
  const v = $<HTMLSelectElement>('co2').value;
  void send({ type: 'attachSensor', sensor: 'co2', state: v === 'off' ? 'off' : 'on', ...(v === 'off' ? {} : { sampling: v as 'sidestream' | 'mainstream' }) });
});
toggle('sSpo2', (p) => void send({ type: 'attachSensor', sensor: 'spo2', state: p ? 'on' : 'off' }));
toggle('sTemp', (p) => void send({ type: 'attachSensor', sensor: 'temp', state: p ? 'on' : 'off', site: $<HTMLSelectElement>('tsite').value }));
$('tsite').addEventListener('change', () => void send({ type: 'attachSensor', sensor: 'temp', state: 'on', site: $<HTMLSelectElement>('tsite').value }));
$('speed').addEventListener('change', () => pm.setTimeScale(Number($<HTMLSelectElement>('speed').value)));

// Truth vs displayed SpO2 (R8 teaching plot) and the scripted story
const truth: Array<[number, number]> = [];
const shown: Array<[number, number | null]> = [];
let simT = 0;
let story: 'idle' | 'preox' | 'apnoea' | 'rescue' = 'idle';
let storyT = 0;
pm.on((e) => {
  if (e.type === 'state' && e.values.spo2 !== undefined) {
    simT = e.t;
    truth.push([e.t, e.values.spo2]);
    if (story === 'preox' && e.t - storyT >= 180) {
      story = 'apnoea';
      void ev({ kind: 'ventilation', source: 'none' });
      void ev({ kind: 'airway', state: 'apnoea' });
    } else if (story === 'apnoea' && e.values.spo2 <= 85) {
      story = 'rescue';
      void ev({ kind: 'airway', state: 'patent' });
      void ev({ kind: 'ventilation', source: 'bvm', rr: 12, vtMl: 600, fio2: 1 });
    }
  }
  if (e.type === 'measurement' && e.values.spo2) shown.push([e.t, e.values.spo2.value]);
  while (truth.length > 400) truth.shift();
  while (shown.length > 400) shown.shift();
});
$('story').addEventListener('click', () => {
  story = 'preox';
  storyT = simT;
  pm.setTimeScale(4);
  ($<HTMLSelectElement>('speed')).value = '4';
  void ev({ kind: 'thermal', anaesthesia: 'general' });
  void ev({ kind: 'preoxygenate', fio2: 1, durationS: 180 });
});
const lag = $<HTMLCanvasElement>('lag').getContext('2d')!;
function drawLag(): void {
  const W = 600;
  const H = 120;
  lag.fillStyle = '#050505';
  lag.fillRect(0, 0, W, H);
  const t1 = simT;
  const x = (t: number) => W - ((t1 - t) / 360) * W;
  const y = (v: number) => H - ((v - 50) / 50) * H;
  lag.strokeStyle = '#333';
  for (const v of [60, 70, 80, 90]) {
    lag.beginPath();
    lag.moveTo(0, y(v));
    lag.lineTo(W, y(v));
    lag.stroke();
  }
  const line = (pts: Array<[number, number | null]>, color: string) => {
    lag.strokeStyle = color;
    lag.beginPath();
    let pen = false;
    for (const [t, v] of pts) {
      if (v === null) {
        pen = false;
        continue;
      }
      if (pen) lag.lineTo(x(t), y(v));
      else lag.moveTo(x(t), y(v));
      pen = true;
    }
    lag.stroke();
  };
  line(truth, '#fff');
  line(shown, '#00e5ff');
  lag.fillStyle = '#888';
  lag.fillText('SaO2 truth (white) · displayed SpO2 (cyan) · last 6 min', 6, 12);
}

const soundBtn = $<HTMLButtonElement>('sound');
soundBtn.addEventListener('click', () => void pm.enableSound().then(() => ((soundBtn.textContent = 'Sound on'), (soundBtn.disabled = true))));
let path = '…';
void pm.renderPath.then((p) => (path = p));
let last = '';
pm.on((e) => {
  if (e.type === 'state') last = `truth SaO2 ${e.values.spo2?.toFixed(1)}  EtCO2 ${e.values.etco2?.toFixed(1)}  FiO2 ${e.values.fio2?.toFixed(2)}  shunt ${e.values.shunt?.toFixed(2)}  core ${e.values.tempCore?.toFixed(2)} °C  flags ${JSON.stringify(e.control)}`;
});
setInterval(() => {
  drawLag();
  $('diag').textContent = `render path: ${path}   story: ${story}\n${last}`;
}, 500);
