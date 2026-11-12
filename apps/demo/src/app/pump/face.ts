// The generic pump face (plan pump-rack-tci.md A1, §5): one component for both channel kinds, one per channel of the
// rack. Two layers, so a skin (SK1: a stylesheet plus a labels file) changes the look and the words without touching the
// logic, and A2's flows attach without a redraw:
//   - `faceModel` (pure): a channel's row (face-row.ts: the PROGRAMME, never the contents), its kind, the device
//     profiles and the labels → the header and the list of fields. Which fields a channel shows is ONE table,
//     `FACE_FIELDS`, keyed by kind and mode, so the two kinds differ there and nowhere else, and E2's TCI mode is a
//     compile error here until its fields are written.
//   - `faceView`: a stable DOM keyed by `data-field`; `update` sets text only. The `actions` slot is A2's (Load, Program,
//     Rate, …): it is created once and never redrawn. `data-kind`, `data-mode`, `data-state` and `data-skin` are the
//     skins' hooks (SK2 picks the SP-500, OT-701 or SP5 TCI skin by kind and mode).
// No number is typed here: values come from the engine's row, the IV set and syringe size it carries, and the device
// profile (D12, S1); a profile's gap is said in the face's own words ("near-end time not set"), never filled, and the
// gap's own text (which names the device's manual) is not shown: the generic face names no maker or model. English only
// (the owner's ruling of 10 November: a device's face carries no Persian), `lang="en"`, left to right.
import { unitText } from '../drugs.ts';
import { drugName } from '../glossary.ts';
import { h, setText } from '../ui.ts';
import type { FaceRow } from './face-row.ts';

export type ChannelKind = FaceRow['kind'];
type Mode = FaceRow['mode'];

/** A device-profile value or its gap, as S1 writes them (packages/controller/pump-devices/*.json, PR 412). */
export type ProfileValue = { gap: string } | ({ src: string } & Record<string, unknown>);
/**
 * What the face reads of the device profiles (D12): the SP-500's `nearEnd` on a syringe channel, the OT-701's
 * `kvo.after` on a drip channel. The shape of S1's files (PR 412, not on main yet): main.ts passes S1's profiles once
 * it has merged; until then null, and the face says the profile is not loaded.
 */
export interface FaceProfiles {
  syringe: { nearEnd: ProfileValue };
  drip: { kvo: { after: ProfileValue } & Record<string, unknown> };
  /** sp5-tci.json (S1): the TCI mode of a syringe channel; its highest TCI rate is a gap until the SP5 TCI manual. */
  tci: { tci: { maxRate: ProfileValue } & Record<string, unknown> };
}

/** The face's words, every one (SK1 replaces this object with a skin's labels file, each label with its provenance). */
export const FACE_LABELS = {
  kind: { syringe: 'Syringe', drip: 'Drip' } satisfies Record<ChannelKind, string>,
  channel: (ch: number, kind: string) => `Channel ${ch} · ${kind}`,
  state: { notLoaded: 'Not loaded', loaded: 'Loaded', running: 'Running', paused: 'Paused', alarm: 'Alarm' } satisfies Record<FaceRow['state'], string>,
  notProgrammed: 'Not programmed',
  field: {
    syringe: 'Syringe',
    set: 'IV set',
    rate: 'Rate',
    dose: 'Dose rate',
    rateOther: 'Same rate',
    limit: 'Volume limit',
    infused: 'Infused',
    remaining: 'Remaining',
    toEmpty: 'Time to empty',
    alarms: 'Alarms',
    almostEmpty: 'Almost Empty',
    kvo: 'KVO',
    // E2, a syringe channel in TCI (§5): the set, the mode (Cp or Ce), the target, the pump's own predicted Cp and Ce
    tciSet: 'TCI model',
    tciMode: 'Target',
    target: 'Target value',
    cp: 'Predicted Cp',
    ce: 'Predicted Ce',
    tciMaxRate: 'TCI rate limit',
  },
  // "Cp" and "Ce" are displayed tokens (§5): they stay as they are
  tciMode: { plasma: 'Cp', effect: 'Ce', stopped: 'Stopped' },
  // The catalogues' alarm names (D8; research/50 SP-17, OT-17)
  alarm: { end: 'End', emptyContainer: 'Empty Container', infusionComplete: 'Infusion Complete' } satisfies Record<FaceRow['alarms'][number], string>,
  none: 'None',
  dash: '—',
  inMl: (amount: string, unit: string, ml: string) => `${amount} ${unit} in ${ml} mL`,
  perMl: (amount: string, unit: string) => `${amount} ${unit}/mL`,
  // A device profile's gap, in the face's words (D8: the plan's words for each)
  gap: { nearEnd: 'near-end time not set', kvoAfter: 'KVO not set from the manual', tciMaxRate: 'maximum TCI rate not set' },
  noProfile: 'device profile not loaded',
  history: 'History',
  historyEmpty: "This channel's history: not in this release yet.",
  actions: 'Channel controls',
};
export type FaceLabels = typeof FACE_LABELS;

export type FieldKey = keyof FaceLabels['field'];
/** The faces a channel can show: each kind in rate mode, and a syringe channel in TCI (E2; a drip pump has no TCI, D2). */
export type FaceLayout = 'syringe:rate' | 'drip:rate' | 'syringe:tci';
/** The fields each layout shows, in order (§5): the kinds and modes differ here only. */
export const FACE_FIELDS: Record<FaceLayout, readonly FieldKey[]> = {
  'syringe:rate': ['syringe', 'rate', 'dose', 'infused', 'remaining', 'toEmpty', 'alarms', 'almostEmpty'],
  'drip:rate': ['set', 'rate', 'rateOther', 'limit', 'infused', 'remaining', 'toEmpty', 'alarms', 'kvo'],
  'syringe:tci': ['syringe', 'tciSet', 'tciMode', 'target', 'cp', 'ce', 'rate', 'infused', 'remaining', 'toEmpty', 'alarms', 'tciMaxRate'],
};
/** A channel's layout. The engine refuses TCI on a drip channel (E2), so a drip row is drawn in rate mode; a new mode
 *  is a compile error here (the `never` below) until its layout is written. */
export function faceLayout(kind: ChannelKind, mode: Mode): FaceLayout {
  switch (mode) {
    case 'rate':
      return kind === 'syringe' ? 'syringe:rate' : 'drip:rate';
    case 'tci':
      return kind === 'syringe' ? 'syringe:tci' : 'drip:rate';
    default: {
      const none: never = mode;
      return none;
    }
  }
}

export interface FaceField {
  key: FieldKey;
  label: string;
  value: string;
}
export interface FaceModelOut {
  title: string;
  programmed: string;
  state: FaceRow['state'];
  stateText: string;
  kind: ChannelKind;
  mode: Mode;
  fields: FaceField[];
}

/** A number for the face: at most three significant digits under 100, whole above (display only, the value kept). */
export function faceNum(x: number): string {
  if (!Number.isFinite(x)) return FACE_LABELS.dash;
  const a = Math.abs(x);
  const s = a >= 100 ? x.toFixed(0) : a >= 10 ? x.toFixed(1) : a >= 1 ? x.toFixed(2) : x.toPrecision(2);
  return s.includes('.') && !s.includes('e') ? s.replace(/\.?0+$/, '') : s;
}

const isGap = (v: ProfileValue | undefined): v is { gap: string } => !!v && typeof (v as { gap?: unknown }).gap === 'string';

/** Minutes as "1 h 54 min" or "38 min". */
function duration(min: number): string {
  const m = Math.round(min);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

/** The face's model of one channel (no DOM): the header and its fields, from the programme only. */
export function faceModel(row: FaceRow | null, kind: ChannelKind, profiles: FaceProfiles | null, L: FaceLabels = FACE_LABELS): FaceModelOut {
  const k: ChannelKind = row && row.state !== 'notLoaded' ? row.kind : kind;
  const mode: Mode = row?.mode ?? 'rate';
  const p = row?.programmed ?? null;
  const tci = row?.tci ?? null;
  const c = p?.concentration ?? null;
  const unit = c ? unitText(c.unit) : '';
  const perMl = c ? c.amount / c.perMl : null; // the programme's amount per mL: what the pump believes it gives
  const programmed = p && c ? `${drugName(p.drugId)} ${c.perMl === 1 ? L.perMl(faceNum(c.amount), unit) : L.inMl(faceNum(c.amount), unit, faceNum(c.perMl))}` : L.notProgrammed;
  const ml = (x: number | null | undefined) => (x === null || x === undefined ? L.dash : `${faceNum(x)} mL`);
  const flowing = row !== null && (row.rate !== null || mode === 'tci'); // in TCI the pump sets its own rate
  const value: Record<FieldKey, () => string | null> = {
    syringe: () => ml(row?.syringeMl),
    set: () => (row?.set ? `${faceNum(row.set)} drops/mL` : L.dash),
    rate: () => {
      if (row && mode === 'tci') return `${faceNum(row.rateMlH)} mL/h`; // the rate the TCI controller runs now
      if (!row || !row.rate) return L.dash;
      return k === 'drip' && row.rate.unit === 'drops/min' ? `${faceNum(row.rate.rate)} drops/min` : `${faceNum(row.rateMlH)} mL/h`;
    },
    rateOther: () => {
      if (!row || !row.rate || !row.set) return L.dash;
      // mL/h = drops/min × 60 ÷ drops/mL (D2 item 3), and back
      return row.rate.unit === 'drops/min' ? `${faceNum(row.rateMlH)} mL/h` : `${faceNum((row.rateMlH * row.set) / 60)} drops/min`;
    },
    dose: () => {
      if (!row || !row.rate) return L.dash;
      if (row.rate.unit !== 'mL/h' && row.rate.unit !== 'drops/min') return `${faceNum(row.rate.rate)} ${unitText(row.rate.unit)}`;
      return perMl === null ? L.dash : `${faceNum(row.rateMlH * perMl)} ${unit}/h`;
    },
    limit: () => (!row || row.state === 'notLoaded' ? L.dash : row.limitMl === null ? L.none : ml(row.limitMl)),
    infused: () => (!row || row.state === 'notLoaded' ? L.dash : `${ml(row.infusedMl)}${perMl === null ? '' : ` · ${faceNum(row.infusedMl * perMl)} ${unit}`}`),
    remaining: () => (!row || row.state === 'notLoaded' ? L.dash : ml(row.volumeMl)),
    toEmpty: () => (flowing && row?.timeToEmptyMin !== null && row?.timeToEmptyMin !== undefined ? duration(row.timeToEmptyMin) : L.dash),
    alarms: () => (!row || row.state === 'notLoaded' ? L.dash : row.alarms.length ? row.alarms.map((a) => L.alarm[a]).join(', ') : L.none),
    // The profile's gaps (D8): the face's words; a sourced value instead is not made into an alarm here (the engine
    // raises none in E1), so the line goes
    almostEmpty: () => (!profiles ? L.noProfile : isGap(profiles.syringe.nearEnd) ? L.gap.nearEnd : null),
    kvo: () => (!profiles ? L.noProfile : isGap(profiles.drip.kvo.after) ? L.gap.kvoAfter : null),
    // E2: the pump's own prediction and its target, read only (setting a target is A2's flow)
    tciSet: () => tci?.setId ?? L.dash,
    tciMode: () => (!tci ? L.dash : tci.mode === null ? L.tciMode.stopped : L.tciMode[tci.mode]),
    target: () => (tci && tci.target !== null && tci.mode !== null ? `${faceNum(tci.target)} ${unitText(tci.unit)}` : L.dash),
    cp: () => (tci ? `${faceNum(tci.cp)} ${unitText(tci.unit)}` : L.dash),
    ce: () => (tci ? `${faceNum(tci.ce)} ${unitText(tci.unit)}` : L.dash),
    tciMaxRate: () => (!profiles ? L.noProfile : isGap(profiles.tci.tci.maxRate) ? L.gap.tciMaxRate : null),
  };
  const fields: FaceField[] = [];
  for (const key of FACE_FIELDS[faceLayout(k, mode)]) {
    const v = value[key]();
    if (v !== null) fields.push({ key, label: L.field[key], value: v });
  }
  const state = row?.state ?? 'notLoaded';
  return { title: L.channel(row?.ch ?? 0, L.kind[k]), programmed, state, stateText: L.state[state], kind: k, mode, fields };
}

export interface FaceView {
  readonly el: HTMLElement;
  /** A2's slot: its controls for this channel are mounted here once and survive every update. */
  readonly actions: HTMLElement;
  /** The channel's history list (C2 sends the rows; A1 says it is not in this release). */
  readonly history: HTMLElement;
  update(row: FaceRow | null): void;
  /** Room setup's kind for this channel (shown while it holds nothing). */
  setKind(kind: ChannelKind): void;
}

/** One channel's face. */
export function faceView(ch: number, kind: ChannelKind, profiles: FaceProfiles | null, L: FaceLabels = FACE_LABELS): FaceView {
  const titleId = `pf-${ch}-h`;
  const title = h('h2', { class: 'pf-title', id: titleId });
  const programmed = h('p', { class: 'pf-drug', 'data-face': 'programmed' });
  const state = h('p', { class: 'pf-state', 'data-face': 'state' });
  const list = h('dl', { class: 'pf-fields' });
  const actions = h('div', { class: 'pf-actions', role: 'group', 'aria-label': `${L.actions} ${ch}` });
  const history = h('section', { class: 'pf-history', 'aria-label': `${L.history} ${ch}` }, h('h3', {}, L.history), h('p', { class: 'small muted' }, L.historyEmpty));
  const el = h('article', { class: 'pump-face', 'data-skin': 'generic', 'data-ch': String(ch), lang: 'en', dir: 'ltr', 'aria-labelledby': titleId },
    h('header', { class: 'pf-head' }, title, programmed, state), list, actions, history);
  let setupKind = kind;
  let last: FaceRow | null = null;
  let layout = '';
  const cells = new Map<FieldKey, HTMLElement>();
  const draw = () => {
    const m = faceModel(last ? last : null, setupKind, profiles, L);
    const shape = m.fields.map((f) => f.key).join();
    if (shape !== layout) {
      // the kind, the mode or a profile line changed: the field list is rebuilt; the actions slot is not touched
      layout = shape;
      cells.clear();
      list.replaceChildren(...m.fields.map((f) => {
        const dd = h('dd', {});
        cells.set(f.key, dd);
        return h('div', { class: 'pf-field', 'data-field': f.key }, h('dt', {}, f.label), dd);
      }));
    }
    for (const f of m.fields) setText(cells.get(f.key) as HTMLElement, f.value);
    setText(title, L.channel(ch, L.kind[m.kind]));
    setText(programmed, m.programmed);
    setText(state, m.stateText);
    Object.assign(el.dataset, { kind: m.kind, mode: m.mode, state: m.state });
  };
  draw();
  return {
    el,
    actions,
    history,
    update(row) {
      last = row;
      draw();
    },
    setKind(k) {
      setupKind = k;
      draw();
    },
  };
}
