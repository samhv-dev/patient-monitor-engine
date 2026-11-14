// Brief 159, the comparison rig: the EDP-TS face's drawing (device.ts) painted with the display state of each of the
// owner's photographs (research/57 rows R-06, R-07, R-12, R-18, R-35, R-36, P-01 to P-19: SIMV(VCV)+PSV with eleven
// keys, which the model does not run before piece V6), WITHOUT the model's decisions: the View is written out below
// as the photographs show it. Only the traces come from the model (a headless run of the face's default breath), since
// a trace's shape is not part of the comparison. Test-only: served by the e2e's Vite dev server, never built, never
// linked; the product's paint() is the same function the live face uses, so the sheets prove the product.
// Address: edp-ts-still.html?shot=1542 (1544, 1545, 1546, 1547); `&strip=0` hides nothing more (the strip is the
// live face's, not drawn here).
import { createVentDriver } from '@pme/ventilator';
import { createCockpit } from '../../src/vent/core/cockpit.ts';
import { DATA, word, type WordId } from '../../src/vent/faces/edp-ts/data.ts';
import { applyTokens, createDevice } from '../../src/vent/faces/edp-ts/device.ts';
import css from '../../src/vent/faces/edp-ts/face.css?inline';
import { drawTraces, fitDevice } from '../../src/vent/faces/edp-ts/face.ts';
import { EDP_SPEC } from '../../src/vent/faces/edp-ts/modes.ts';
import type { EntryView, LimitView, TileView, View, WindowView } from '../../src/vent/faces/edp-ts/view.ts';

const W = (id: WordId) => word(id);
const lim = (ctl: string, text: string): LimitView => ({ ctl, text, sel: false, unsim: null });
const tile = (ctl: string, value: TileView['value'], unit: WordId | null, label: WordId, o: Partial<TileView> = {}): TileView =>
  ({ ctl, value, unit: unit ? W(unit) : '', label: W(label), sel: false, dim: false, unsim: null, ...o });
const entries = (words: string[], focus: number, more: number[] = [], values: Record<number, string> = {}): EntryView[] =>
  words.map((label, i) => ({ label, focus: i === focus, unsim: null, item: i, ...(more.includes(i) ? { more: true } : {}), ...(values[i] ? { value: values[i] } : {}) }));
const win = (title: string, e: EntryView[]): WindowView => ({ id: 'modes', title, entries: e, footer: W('footer') });

// what every photograph shares (IMG_1542, the video V-02, V-03: the department's settings)
const TILES = (sel = -1): TileView[] => [
  tile('key:vt', '0.500', 'uL', 'vt'), tile('key:ti', '1.40', 'uS', 'ti'), tile('key:ie', '1:2.5', null, 'ie'), tile('key:f', '12', 'uBpm', 'f'),
  tile('key:psv', '8', 'uCmH2O', 'psv'), tile('key:expSens', '25', 'uPct', 'expSens'), tile('key:peep', '5', 'uCmH2O', 'peep'), tile('key:sens', '3.0', 'uLmin', 'sens'),
  tile('key:oxygen', '40', 'uPct', 'oxygen'), tile('key:riseTime', { picto: 'riseTime' }, null, 'riseTime'), tile('key:flowWaveform', { picto: 'flowWave', o: 'descending' }, null, 'flowWaveform'),
].map((t, i) => (i === sel ? { ...t, sel: true } : t));
const base = (o: Partial<View>): View => ({
  category: W('adl'), mode: W('SIMV(VCV)+PSV'), backup: W('backupOff'), date: '06/11/26', time: '12:08',
  top: [], message: W('volComp'), lung: false,
  tags: {
    fTotal: { hi: lim('tag:fHi', '30'), side: 'hi' }, vt: { hi: lim('tag:vtHi', '0.750'), lo: lim('tag:vtLo', '0.250'), side: 'both' },
    ve: { hi: lim('tag:mvHi', '8.50'), lo: lim('tag:mvLo', '2.41'), side: 'both' }, oxygen: { hi: lim('tag:o2Hi', '50'), lo: lim('tag:o2Lo', '30'), side: 'both' },
    peep: { hi: lim('tag:peepHi', '20.0'), side: 'hi' }, pHi: { hi: lim('tag:pmax', '40'), side: 'hi' }, pLo: { lo: lim('tag:pLo', '5'), side: 'lo' },
  },
  left: { peak: '', trach: '', plateau: '', mean: '', peep: '' },
  tiles: TILES(), rightDim: ['right:respMech', 'right:standby'], window: null, alarm: null,
  lamps: { inop: false, high: true, med: true }, ring: true, ctrl: false, ...o,
});
const top = (...v: Array<string | [string]>) => v.map((x) => (Array.isArray(x) ? { v: x[0], dim: true } : { v: x, dim: false }));
const MODES1 = ['VCV', 'PCV', 'PSV/CPAP', 'SIMV(PCV)+PSV', 'SIMV(VCV)+PSV', 'Noninvasive (NIV)'].map((w) => W(w as WordId)).concat(W('otherModes'));
const MODES2 = ['MMV+PSV', 'PSV+VT Assured', 'APRV', 'PRVC'].map((w) => W(w as WordId)).concat(W('otherModes'));
const MENU = (['patientsData', 'backupVent', 'ventAdjuncts', 'records', 'tools', 'transport'] as WordId[]).map(W);

export const STILLS: Record<string, View> = {
  // 12:07, no window, the knob's ring dark, the lungs shown (a patient's effort, V-05)
  1542: base({ time: '12:07', top: top('42', '1.40', '1.90', ['1:1.3'], '23', '0.333', '4.14', '43'), lung: true,
    left: { peak: '20', trach: '', plateau: '', mean: '9.0', peep: '5.2' }, ring: false }),
  // the first "Operative Modes" window, SIMV(VCV)+PSV under the knob (the left column is cut off in the photograph)
  1544: base({ top: top('42', '1.40', '1.81', '1:1.2', ['17'], '0.246', '6.19', '45'), lung: true,
    left: { peak: '20', trach: '', plateau: '', mean: '8.5', peep: '4.5' }, window: win(W('ventModes'), entries(MODES1, 4, [6])) }),
  // the second "Operative Modes" window, MMV+PSV under the knob
  1545: base({ top: top('21', '1.77', '1.78', '1:1.0', '17', '0.290', '4.67', '42'), window: win(W('ventModes'), entries(MODES2, 0, [4])) }),
  // Exp. Sensitiv. selected (solid blue), the lungs absent, Ti and Te faint
  1546: base({ top: top('22', ['1.85'], ['2.4'], '1:1.1', '17', '0.305', '4.82', '44'), left: { peak: '16', trach: '', plateau: '', mean: '8.8', peep: '4.8' }, tiles: TILES(5) }),
  // Menu, Patient's Data under the knob; both alarm lamps unlit
  1547: base({ top: top('21', '1.86', '2.5', '1:1.1', ['16'], '0.226', '4.49', '44'), lamps: { inop: false, high: false, med: false },
    window: { ...win(W('menuTitle'), entries(MENU, 0, [1, 2, 3, 4], { 5: W('no') })), id: 'menu' } }),
};

const shot = new URLSearchParams(location.search).get('shot') ?? '1542';
const style = document.createElement('style');
style.textContent = css;
document.head.append(style);
document.body.classList.add('edp-ts');
applyTokens(document.body);
const dev = createDevice({ press: () => {}, touch: () => {}, explain: () => {} });
const root = document.createElement('main');
root.className = 'edp';
root.append(dev.dev);
document.getElementById('screen')!.replaceChildren(root);
const d = createVentDriver(null);
const c = createCockpit(d, EDP_SPEC, { linked: false });
let ms = 0;
for (let i = 0; i < 1300; i++) d.frame((ms += 1000 / 60) );
dev.paint(STILLS[shot] ?? STILLS[1542]!);
const fit = () => fitDevice(dev.dev, innerWidth, innerHeight);
fit();
addEventListener('resize', fit);
drawTraces(dev, c.buf);
(window as unknown as { __still: unknown }).__still = { shot, colours: DATA.colours };
document.body.dataset.ready = '1';
