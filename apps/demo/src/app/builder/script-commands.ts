// The Script section's commands from the Airway, Defib · CPR and Devices sheets (docs/plans/scenario-builder.md §5.2;
// piece 162, finding N83 of B5): an airway state, who breathes with the bag's or the ventilator's settings, oxygen for
// the spontaneously breathing patient, the defibrillator's charge, shock, disarm and synchronised mode, the pacer, CPR
// started or stopped, a sensor attached or removed, and the NIBP. Each command is the sheet's own builder
// (panel/airway.ts, panel/defib.ts, panel/devices.ts), its fields have the sheet's words, units, limits and first
// values (the same exported constants the sheet's steppers take), and a number outside the sheet's limits is refused in
// place and not written. `seedOf` reads a card's command back into the form only when the form builds that very
// command again, so editing never rewrites a command the form cannot say; anything else stays as the card has it.
// Two kinds the plan names are not here: a lung condition and a TCI. The `/2` schema's script command is `/1`'s, whose
// event kinds do not include `lungCondition` or `tci`, so the validator refuses either in a card (piece 162's report).
import { SENSORS } from '../describe.ts';
import { O2_DEFAULT, O2_FLOWS, oxygen, type O2Device } from '../oxygen.ts';
import { AIRWAY, airwayCmd, BREATHING, breathingCmd, O2_CHOICES, VENT_LIMITS } from '../panel/airway.ts';
import { CPR_QUALITY, CPR_RATE, cprCmd, defibCmd, ENERGY_LIMITS, PACER_LIMITS, PACER_MODES, pacerCmd } from '../panel/defib.ts';
import { CHANNELS, NIBP_INTERVALS, nibpCmd, sensorCmd } from '../panel/devices.ts';
import { defibDefaults } from '../site.ts';
import { h } from '../ui.ts';
import type { CommandFormOpts } from './action-editor.ts';
import { select } from './phase-editor.ts';

type Rec = Record<string, unknown>;
type More = NonNullable<CommandFormOpts['more']>;
/** A stepper's limits as the sheet declares them. */
export interface Limit { readonly label: string; readonly unit: string; readonly min: number; readonly max: number; readonly step: number; readonly value?: number }

/** The defibrillator's actions, in the sheet's words (its buttons and its Synchronised switch). */
export const DEFIB_ACTIONS: Array<[string, string]> = [['charge', 'Charge'], ['shock', 'Shock'], ['disarm', 'Disarm'], ['syncOn', 'Synchronised on'], ['syncOff', 'Synchronised off']];
/** The energy a new charge or shock starts on: the sheet's with no defibrillator model chosen (a card names no room). */
const ENERGY_FIRST = defibDefaults(null).energyAdultJ;
const ATTACHED: Array<[string, string]> = [['on', 'Attached'], ['off', 'Removed']];

const has = (xs: ReadonlyArray<readonly [string, ...unknown[]]>, v: string) => xs.some(([x]) => x === v);
/** A number the sheet's stepper could hold: a whole number (its steppers show no decimals) within its limits. */
export const within = (v: unknown, l: Limit): v is number => typeof v === 'number' && Number.isInteger(v) && v >= l.min && v <= l.max;
const limitWords = (l: Limit) => `a whole number from ${l.min} to ${l.max} ${l.unit}, the sheet’s limits`;

/** The groups the form's "what" offers, each value `<kind>:<id>`. [ENG: ui] the group names are the sheets'. */
export const SHEET_GROUPS: More['groups'] = [
  ['Airway (Airway sheet)', AIRWAY.map(([v, t]) => [`airway:${v}`, `Airway: ${t}`] as [string, string])],
  ['Breathing (Airway sheet)', BREATHING.map(([v, t]) => [`vent:${v}`, `Breathing: ${t}`] as [string, string])],
  ['Oxygen (Airway sheet)', O2_CHOICES.map(([v, t]) => [`o2:${v}`, `Oxygen: ${t}`] as [string, string])],
  ['Defibrillator (Defib · CPR sheet)', DEFIB_ACTIONS.map(([v, t]) => [`defib:${v}`, `Defibrillator: ${t}`] as [string, string])],
  ['Pacing (Defib · CPR sheet)', PACER_MODES.map(([v, t]) => [`pacer:${v}`, `Pacer: ${t}`] as [string, string])],
  ['CPR (Defib · CPR sheet)', [['cpr:start', 'Start CPR'], ['cpr:stop', 'Stop CPR']]],
  ['Sensors (Devices sheet)', CHANNELS.map(([s]) => [`sensor:${s}`, `Sensor: ${SENSORS[s] ?? s}`] as [string, string])],
  ['NIBP (Devices sheet)', [['nibp:start', 'Start NIBP now'], ['nibp:interval', 'NIBP: automatic interval']]],
];

/** The fields of a sheet kind, null for a kind that is not one. `st` holds what the fields edit; a value already in it
 *  (an edited command's) is kept, else the sheet's first value is written. */
export function sheetFields(kind: string, id: string, st: Rec, ready: () => void, who: string): Array<HTMLElement | string> | null {
  const num = (k: string, l: Limit) => {
    if (st[k] === undefined && l.value !== undefined) st[k] = l.value;
    const i = h('input', { type: 'number', step: 'any', inputmode: 'decimal', class: 'input sb-num', min: String(l.min), max: String(l.max), 'aria-label': `${who}: ${l.label} (${l.unit})` });
    i.value = typeof st[k] === 'number' ? String(st[k]) : '';
    const why = h('span', { class: 'sb-numwhy', 'aria-live': 'polite' });
    const say = () => {
      const ok = within(st[k], l);
      why.textContent = ok ? '' : `${l.label}: ${limitWords(l)}: not written`;
      if (ok) i.removeAttribute('aria-invalid');
      else i.setAttribute('aria-invalid', 'true');
    };
    i.addEventListener('input', () => {
      st[k] = i.value.trim() === '' ? undefined : Number(i.value);
      say();
      ready();
    });
    say();
    return h('span', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, l.label), i, h('span', { class: 'sb-hint' }, l.unit), why);
  };
  const pick = (k: string, label: string, xs: Array<[string, string]>, first: string) => {
    if (typeof st[k] !== 'string') st[k] = first;
    const s = select(String(st[k]), [[null, xs]], `${who}: ${label}`);
    s.addEventListener('change', () => ((st[k] = s.value), ready()));
    return h('span', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, label), s);
  };
  switch (kind) {
    case 'airway':
      return [];
    case 'vent':
      return id === 'spontaneous' ? [] : [num('rr', VENT_LIMITS.rr), num('vt', VENT_LIMITS.vt), num('peep', VENT_LIMITS.peep), num('fio2', VENT_LIMITS.fio2)];
    case 'o2': {
      const flows = O2_FLOWS[id as O2Device] ?? [];
      if (id === 'none' || !flows.length) return [];
      return [pick('flow', 'Flow', flows.map((x) => [String(x), `${x} L/min`] as [string, string]), String(O2_DEFAULT[id as O2Device]))];
    }
    case 'defib':
      return id === 'charge' || id === 'shock' ? [num('energy', { ...ENERGY_LIMITS, value: ENERGY_FIRST })] : [];
    case 'pacer':
      return [num('rate', PACER_LIMITS.rate), num('ma', PACER_LIMITS.ma)];
    case 'cpr':
      return id === 'start' ? [num('rate', CPR_RATE), pick('quality', 'Compression quality', CPR_QUALITY, '0.8')] : [];
    case 'sensor':
      return [pick('on', 'Sensor', ATTACHED, 'on')];
    case 'nibp':
      return id === 'interval' ? [pick('interval', 'Automatic interval', NIBP_INTERVALS, '5')] : [];
    default:
      return null;
  }
}

/** The command a sheet kind builds from its fields, null while a field is outside the sheet's limits or the item is not
 *  the sheet's. */
export function sheetBuild(kind: string, id: string, st: Rec): Rec | null {
  const n = (k: string, l: Limit) => within(st[k], l);
  switch (kind) {
    case 'airway':
      return has(AIRWAY, id) ? airwayCmd(id) : null;
    case 'vent':
      if (!has(BREATHING, id)) return null;
      if (id === 'spontaneous') return breathingCmd(id, 0, 0, 0, 0);
      return n('rr', VENT_LIMITS.rr) && n('vt', VENT_LIMITS.vt) && n('peep', VENT_LIMITS.peep) && n('fio2', VENT_LIMITS.fio2)
        ? breathingCmd(id, st.rr as number, st.vt as number, st.peep as number, st.fio2 as number) : null;
    case 'o2': {
      if (!has(O2_CHOICES, id)) return null;
      const flow = id === 'none' ? 0 : Number(st.flow);
      return (O2_FLOWS[id as O2Device] as readonly number[]).includes(flow) ? oxygen(id as O2Device, flow) : null;
    }
    case 'defib':
      if (!has(DEFIB_ACTIONS, id)) return null;
      if (id !== 'charge' && id !== 'shock') return defibCmd(id);
      return n('energy', ENERGY_LIMITS) ? defibCmd(id, st.energy as number) : null;
    case 'pacer':
      return has(PACER_MODES, id) && n('rate', PACER_LIMITS.rate) && n('ma', PACER_LIMITS.ma) ? pacerCmd(id, st.rate as number, st.ma as number) : null;
    case 'cpr':
      if (id === 'stop') return cprCmd(false);
      return id === 'start' && n('rate', CPR_RATE) && has(CPR_QUALITY, String(st.quality)) ? cprCmd(true, st.rate as number, Number(st.quality)) : null;
    case 'sensor': {
      const s = CHANNELS.find(([x]) => x === id)?.[0];
      return s && has(ATTACHED, String(st.on)) ? sensorCmd(s, st.on === 'on') : null;
    }
    case 'nibp':
      if (id === 'start') return nibpCmd('start');
      return id === 'interval' && has(NIBP_INTERVALS, String(st.interval)) ? nibpCmd(Number(st.interval)) : null;
    default:
      return null;
  }
}

/** The form's item and fields for a card's command, before checking (kinds of the sheets and the card-set events). */
function guess(c: Rec): { what: string; st: Rec } | null {
  const e = (c.type === 'applyEvent' && c.event && typeof c.event === 'object' ? c.event : {}) as Rec;
  const pct = (x: unknown) => (typeof x === 'number' ? Math.round(x * 100 * 1e9) / 1e9 : x);
  if (c.type === 'attachSensor') return { what: `sensor:${String(c.sensor)}`, st: { on: c.state === 'off' || c.state === 'none' ? 'off' : 'on' } };
  if (c.type === 'device') {
    const a = (c.action ?? {}) as Rec;
    if (a.device !== 'nibp') return null;
    return a.action === 'start' ? { what: 'nibp:start', st: {} } : { what: 'nibp:interval', st: { interval: a.action === 'manual' ? '0' : String(a.intervalMin) } };
  }
  if (c.type === 'setRhythm') return { what: `rhythm:${String(c.rhythm)}`, st: {} };
  switch (e.kind) {
    case 'airway':
      return { what: `airway:${String(e.state)}`, st: {} };
    case 'ventilation':
      return e.o2Device !== undefined ? { what: `o2:${String(e.o2Device)}`, st: { flow: String(e.o2FlowLpm ?? 0) } }
        : { what: `vent:${String(e.source)}`, st: { rr: e.rr, vt: e.vtMl, peep: e.peep, fio2: pct(e.fio2) } };
    case 'defib':
      return { what: `defib:${String(e.action)}`, st: e.energyJ === undefined ? {} : { energy: e.energyJ } };
    case 'pacer':
      return { what: `pacer:${String(e.mode)}`, st: { rate: e.ratePpm, ma: e.mA } };
    case 'cpr':
      return e.active === true ? { what: 'cpr:start', st: { rate: e.rate, quality: String(e.quality) } } : { what: 'cpr:stop', st: {} };
    case 'condition':
      return { what: `cond:${String(e.id)}`, st: { sev: e.severity } };
    case 'bleed':
      return { what: 'bleed:', st: { vol: e.volumeMl, min: typeof e.overS === 'number' ? e.overS / 60 : undefined } };
    default:
      return null;
  }
}

/** Two commands with the same content, in any key order. */
export function sameCommand(a: unknown, b: unknown): boolean {
  const canon = (x: unknown): unknown => (Array.isArray(x) ? x.map(canon) : x && typeof x === 'object'
    ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon((x as Rec)[k])])) : x);
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}

/** What the form starts on to edit a card's command, or null: only when the form, untouched, builds that very command
 *  again (its `$comment` aside, which the edit keeps). `build` is the form's own (the sheets' kinds and the card-set
 *  events). */
export function seedOf(c: Rec, build: More['build']): { what: string; st: Rec } | null {
  const g = guess(c);
  if (!g) return null;
  const [kind, id] = g.what.split(':') as [string, string];
  const { $comment: _, ...bare } = c;
  const back = build(kind, id, { ...g.st });
  return back && sameCommand(back, bare) ? g : null;
}

/** The command an edit writes: the card's own object when the form built the same content (no byte moves), else the new
 *  command with the card's `$comment` kept in front. */
export function edited(old: Rec, built: Rec): Rec {
  const { $comment, ...bare } = old;
  if (sameCommand(bare, built)) return old;
  return $comment === undefined ? built : { $comment, ...built };
}
