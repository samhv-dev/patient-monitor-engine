// What the EDP-TS screen and housing show at one moment (brief 159): a plain-data View. The live face computes it from
// the cockpit and the knob (viewOf); the drawing (device.ts) paints ANY View, so the comparison rig can paint the
// photographed states (a mode the model does not run yet, a selected tile, an open window) without the model and
// without a single line of behaviour in the product. Every word here is a face.json word or reason, or a number.
import { modeName, type VentConfig } from '@pme/ventilator';
import type { Cockpit } from '../../core/cockpit.ts';
import { CONTROLS, faceMode, formatIe, LIMITS, ROWS, SETTINGS, settingState, WINDOWS, type Ctl, type Row, type WindowId } from './controls.ts';
import { dec, L, LAYOUT, num, word, type Leaf, type ReasonId, type WordId } from './data.ts';
import type { Knob } from './knob.ts';
import { alarmText } from './modes.ts';
import type { PictoId } from './pictograms.ts';

type Cfg = Readonly<VentConfig>;
export type Side = 'hi' | 'lo' | 'both';

/** One drawn limit tag: one or two limits (high over low) behind one symbol (research/57 L-17, P-09). */
export interface TagView { hi?: LimitView; lo?: LimitView; side: Side }
export interface LimitView { ctl: string; text: string; sel: boolean; unsim: ReasonId | null }
/** A key of the settings row (research/57 P-13). `dim`: the device draws it faint; `unsim`: not simulated yet. */
export interface TileView { ctl: string; value: string | { picto: PictoId; o?: string }; unit: string; label: string; sel: boolean; dim: boolean; unsim: ReasonId | null }
/** A window's entry (research/57 P-19): its words, a value at its right or a "+", whether the knob is on it. */
export interface EntryView { label: string; value?: string; more?: boolean; focus: boolean; unsim: ReasonId | null; item: number; cells?: LimitView[]; valueSel?: boolean }
export interface WindowView { id: WindowId | 'confirm'; title: string; entries: EntryView[]; footer: string | null; lines?: string[][] }

export interface View {
  category: string; mode: string; backup: string; date: string; time: string;
  /** The eight measured values (Peak Flow … Oxygen), and which the device shows faint (research/57 R-36). */
  top: Array<{ v: string; dim: boolean }>;
  tags: { fTotal: TagView; vt: TagView; ve: TagView; oxygen: TagView; peep: TagView; pHi: TagView; pLo: TagView };
  message: string;
  lung: boolean;
  left: { peak: string; trach: string; plateau: string; mean: string; peep: string };
  tiles: TileView[];
  /** The pictogram column's keys the device shows faint now (research/57 R-34). */
  rightDim: string[];
  window: WindowView | null;
  alarm: { text: string; priority: 'high' | 'medium' | 'low' } | null;
  lamps: { inop: boolean; high: boolean; med: boolean };
  /** The knob's ring: lit while a selection or a window is active (research/57 P-06). */
  ring: boolean;
  ctrl: boolean;
}

const W = (id: WordId) => word(id);
const ctl = (id: string): Ctl => CONTROLS.find((x) => x.id === id) as Ctl;
const dashes = W('dashes');
const fixed = (v: unknown, n: number) => (v as Leaf<number>).v.toFixed(n);

/** A limit tag's half: the live limit (pending value while selected) or the not-simulated one with the manual's value. */
function limitView(c: Cockpit, knob: Knob, id: string, cfg: Cfg): LimitView {
  const x = ctl(`tag:${id}`);
  if (x.kind === 'limit') {
    const Lm = LIMITS[x.limit]!;
    const sel = knob.pending.key === x.id;
    return { ctl: x.id, text: Lm.format(sel ? (knob.pending.value as number) : Lm.read(cfg)), sel, unsim: null };
  }
  const shown: Record<string, string> = { pLo: fixed(L.pLo.init, dec('lPmax')), peepHi: fixed(L.peepHi.init, dec('lPeep')), o2Hi: fixed(L.o2Hi.init, dec('lO2')), o2Lo: fixed(L.o2Lo.init, dec('lO2')) };
  return { ctl: x.id, text: shown[id] ?? dashes, sel: false, unsim: x.kind === 'unavailable' ? x.reason : null };
}

const fmtDate = (d: Date) => [d.getDate(), d.getMonth() + 1, d.getFullYear() % 100].map((x) => String(x).padStart(2, '0')).join('/');
const fmtTime = (d: Date) => [d.getHours(), d.getMinutes()].map((x) => String(x).padStart(2, '0')).join(':');
const PRI = { high: 0, medium: 1, low: 2 } as const;

function windowView(c: Cockpit, knob: Knob, id: WindowId, focus: number): WindowView {
  const def = WINDOWS[id];
  const items = knob.items(id);
  const entries: EntryView[] = [];
  def.rows.forEach((r: Row, i) => {
    const item = items.findIndex((it) => it.row === i && !it.cell);
    const base = { label: W(r.word), focus: item >= 0 && item === focus, item, unsim: null as ReasonId | null };
    if (r.kind === 'mode-off') return void entries.push({ ...base, unsim: r.reason });
    if (r.kind === 'off') return void entries.push({ ...base, unsim: r.reason, ...(r.value ? { value: W(r.value) } : {}), ...(r.more ? { more: true } : {}) });
    if (r.kind === 'open') return void entries.push({ ...base, more: true });
    if (r.kind === 'mode' || r.kind === 'accept') return void entries.push(base);
    if (r.kind === 'limits') {
      if (r.off) return void entries.push({ ...base, unsim: r.off.reason });
      const cells = r.cells.map((cell) => {
        const ci = items.findIndex((it) => it.row === i && it.cell === cell);
        const Lm = LIMITS[cell]!;
        const sel = knob.pending.key === `tag:${cell}`;
        return { ctl: `tag:${cell}`, text: Lm.format(sel ? (knob.pending.value as number) : Lm.read(c.cfg)), sel, unsim: null, item: ci, focus: ci === focus && !sel } as LimitView & { item: number; focus: boolean };
      });
      return void entries.push({ ...base, cells });
    }
    // a setting edited in the window (Inspiratory pause, research/57 T-28)
    const s = SETTINGS[r.setting]!;
    const sel = knob.pending.key === `row:${r.setting}`;
    const wc = knob.windowCfg(id); // the Backup window shows its draft (research/57 T-41)
    const st = settingState(r.setting, wc);
    const f = s.format(sel ? (knob.pending.value as number) : s.read(wc), wc);
    const u = s.unit(wc);
    entries.push({ ...base, value: `${f === null ? W('off') : f}${u ? ` ${W(u)}` : ''}`, valueSel: sel, unsim: typeof st === 'object' ? st.reason : null });
  });
  return { id, title: W(def.title), entries, footer: def.footer ? W('footer') : null };
}

/** The top-left block's backup (research/57 R-05, R-06): the kind armed in PSV/CPAP, otherwise OFF. */
const backupWord = (c: Cfg): string => (faceMode(c) === 'PSV/CPAP' ? W(c.backupMode === 'PC' ? 'backupPCV' : 'backupVCV') : W('backupOff'));

/** The live View: the cockpit's model and the knob's state, as V1 drew them. */
export function viewOf(c: Cockpit, knob: Knob, now: Date = new Date()): View {
  const r = c.record();
  const m = c.measured();
  const cfg = c.cfg;
  const fx = (v: number | undefined, n: number) => (v === undefined || !Number.isFinite(v) ? dashes : v.toFixed(n));
  const ieNow = r ? (r.ti >= r.te ? r.ti / r.te - 1 : 1 - r.te / r.ti) : undefined;
  const top = [fx(r?.peakFlowLpm, dec('mPeakFlow')), fx(r?.ti, dec('mTi')), fx(r?.te, dec('mTe')), ieNow === undefined ? dashes : formatIe(ieNow),
    fx(m.RR, dec('mF')), fx(m.VTE / 1000, dec('mVt')), fx(m.MV, dec('mVe')), fx(cfg.fio2, dec('mOxygen'))].map((v) => ({ v, dim: false }));
  const lim = (id: string) => limitView(c, knob, id, cfg);

  // the settings row of the mode shown (the draft's while a mode waits for its confirmation, research/57 O-15)
  const shown = knob.shown();
  const tiles: TileView[] = ROWS[knob.rowMode()].map((id) => {
    const s = SETTINGS[id]!;
    const st = settingState(id, shown);
    const sel = knob.pending.key === `key:${id}`;
    const v = sel ? (knob.pending.value as number) : s.read(shown);
    const f = s.format(v, shown);
    const u = s.unit(shown);
    const value: TileView['value'] = f !== null ? f : id === 'riseTime' ? { picto: 'riseTime' } : { picto: 'flowWave', o: shown.flowPattern === 'square' ? 'square' : 'descending' };
    return { ctl: `key:${id}`, value, unit: u ? W(u) : '', label: W(s.word), sel, dim: st === 'shown', unsim: typeof st === 'object' ? st.reason : null };
  });

  const ws = knob.windows();
  const topWin = ws[ws.length - 1];
  const conf = knob.confirming();
  const window: WindowView | null = conf
    ? { id: 'confirm', title: W('modeWord'), entries: [], footer: null, lines: [[W('modeWord'), W(conf as WordId)], [W('pressKnob')], [W('pressEsc')]] }
    : topWin ? windowView(c, knob, topWin.id, topWin.focus) : null;

  const act = [...c.alarms().active].sort((a, b) => PRI[a.priority] - PRI[b.priority]);
  const alarm = act[0] ? { text: alarmText(act[0].id) ?? '', priority: act[0].priority } : null;

  return {
    category: W('adl'), mode: modeName(cfg), backup: backupWord(cfg), date: fmtDate(now), time: fmtTime(now),
    top,
    tags: {
      fTotal: { hi: lim('fHi'), side: 'hi' }, vt: { hi: lim('vtHi'), lo: lim('vtLo'), side: 'both' }, ve: { hi: lim('mvHi'), lo: lim('mvLo'), side: 'both' },
      oxygen: { hi: lim('o2Hi'), lo: lim('o2Lo'), side: 'both' }, peep: { hi: lim('peepHi'), side: 'hi' }, pHi: { hi: lim('pmax'), side: 'hi' }, pLo: { lo: lim('pLo'), side: 'lo' },
    },
    message: W('volComp'),
    lung: c.p.lastPtT !== null && c.p.t - c.p.lastPtT < num(LAYOUT.lungIconS),
    left: {
      peak: fx(m.PIP, dec('mPeak')), trach: '',
      // Plateau: with a pause or a hold only (research/57 R-21)
      plateau: cfg.mode === 'VC' && cfg.pause > 0 ? fx(m.PLAT, dec('mPlateau')) : '',
      mean: fx(m.Pmean, dec('mMean')), peep: fx(r?.peepEnd, dec('mPeep')),
    },
    tiles,
    // research/57 R-34: Respiratory mechanics and Standby are faint while a window is open
    rightDim: topWin || conf ? ['right:respMech', 'right:standby'] : [],
    window,
    alarm,
    // the lamps steady (flashing and latching are V3's, plan GA16)
    lamps: { inop: false, high: act.some((a) => a.priority === 'high'), med: act.some((a) => a.priority !== 'high') },
    ring: ws.length > 0 || conf !== null || knob.pending.key !== null,
    ctrl: knob.ctrl(),
  };
}

