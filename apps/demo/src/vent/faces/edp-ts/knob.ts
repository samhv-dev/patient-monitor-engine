// The EDP-TS face's ONE knob-navigation mechanism (plan vent-skin-edp-ts.md §2.4; research/57 H-10, H-25, H-26, O-01 to
// O-16), pure and DOM-free so it is tested headless (knob.test.ts) and every window of every later piece shares it:
// - a selected setting or limit (the core's pending value): the knob turns it, its press stores it, 15 wall-clock
//   seconds drop it (O-03, O-04), Esc cancels it;
// - otherwise the top window: the knob moves its focus over the rows that can be used, its press opens or starts what
//   the row holds, Esc closes the window (H-25);
// - a mode chosen opens its confirmation ("Mode VCV", O-14); the bottom row then shows THAT mode's settings, which may
//   be changed before the press (O-15) into a draft the press commits with the mode;
// - Ctrl lights until the next press or Esc; Ctrl + Oxygen steps by 10 (H-22); on a "*" row whose Ctrl step the manual
//   does not give (O-05) the step stays and the reason says so;
// - Menu pressed again: Ventilatory adjuncts, then Tools, then the main menu (H-10);
// - the alarm keys (V3): the silence key's presses (H-09, A-20); Esc also resets the lamps of the alarms that have
//   ended (H-25); Ctrl + Alarm Limits: the help of the active alarm, or with none active the alarm test (H-21, A-06).
// - the screen's keys (research/57 K-07 to K-14, E-14, E-15): Freeze (left with Freeze or Esc, Y-03), Save loop and
//   Ctrl + Graphics (K-09), the Graphics and Respiratory Mechanics windows (the latter faint, so inert, while another
//   window is open: R-34), a scale selected by touching its axis numbers and turned (with Ctrl: its position, K-13),
//   the "?" key then the key to explain (K-14);
// - the held keys: Insp/Exp Pause while held (H-18, H-19), the padlock held 2 s locks the touch screen and the keys
//   beside it, the keys under the screen and the knob staying live; pressed again it unlocks, and so does an alarm
//   (H-12, H-13).
// A pressed control that is not honoured yet shows its reason for a few seconds (in the simulator's strip outside the
// device, never on it).
import type { VentConfig } from '@pme/ventilator';
import type { Cockpit } from '../../core/cockpit.ts';
import { createPending, type Pending } from '../../core/pending.ts';
import type { Setting, Target } from '../../core/types.ts';
import { CONTROLS, faceMode, LIMITS, SETTINGS, settingState, WINDOWS, type Ctl, type FaceMode, type Row, type SettingCtl, type WindowId } from './controls.ts';
import { DATA, LAYOUT, num, type ReasonId } from './data.ts';
import { createManoeuvres, type Manoeuvres } from './manoeuvres.ts';
import { MODES } from './modes.ts';
import { PAGES } from './patient-data.ts';
import { createScreen, saveLoop, scaleCount, type Q, type Scale, type Screen } from './screen.ts';

type Cfg = Readonly<VentConfig>;

/** A row's focusable part: the row itself, or one limit cell of it. */
export interface Item { row: number; cell?: string }
export interface Win { id: WindowId; focus: number }
/** One step of the alarm test: each priority's lamp and tone in turn, high first (plan GA18) [eng: face.json layout.alarmTestStepS]. */
export type AlarmTestStep = 'high' | 'medium' | 'low';
const TEST_STEPS: readonly AlarmTestStep[] = ['high', 'medium', 'low'];
/** What the screen lock leaves live: the keys under the screen and the knob (research/57 H-12). */
const LIVE_LOCKED = new Set<Ctl['region']>(['under']);
/** The help text of a control (face.json help): a limit tag's is one for all of them. */
export const helpId = (id: string): string => (id.startsWith('tag:') ? 'tags' : id.startsWith('scale:') ? 'scale' : id === 'side:knobPress' || id === 'side:knobTurn' ? 'side:knob' : id);

export interface Knob {
  readonly pending: Pending;
  /** The open windows, bottom first. */
  windows(): readonly Win[];
  /** The rows of a window the knob can stop on. */
  items(id: WindowId): Item[];
  /** The mode waiting for the knob press, or null. */
  confirming(): string | null;
  /** The configuration the bottom row shows: the draft of the mode being confirmed, or the live one. */
  shown(): Cfg;
  /** The bottom row's mode. */
  rowMode(): FaceMode;
  /** The configuration a window's rows show: its draft for a window that has one (the Backup window, T-41). */
  windowCfg(id: WindowId): Cfg;
  ctrl(): boolean;
  /** The alarm test's step now (Ctrl + Alarm Limits with no alarm active, research/57 H-21): the priority whose lamp and
   *  tone are shown in turn, or null when no test runs. */
  alarmTest(): AlarmTestStep | null;
  /** The reason the simulator's strip shows now, or null. */
  note(): ReasonId | null;
  /** Show a reason for a drawn thing that is not a control of the table (a window's row not simulated yet, VF R20).
   *  It moves nothing: no window, no focus, no value. */
  explain(r: ReasonId): void;
  /** A touch on a control of the table (`key:vt`, `tag:pmax`, `side:mode`, `right:freeze`, …). */
  press(id: string): void;
  /** A touch on a window's row (the screen is a touch screen, research/57 R-01): focus it and press. */
  touchRow(win: WindowId, item: number): void;
  /** The knob turned by n detents (negative: anticlockwise). */
  turn(n: number): void;
  /** The knob pressed. */
  push(): void;
  /** A held key (Insp/Exp Pause, the padlock) pressed down, and released. */
  down(id: string): void;
  up(id: string): void;
  /** The curves' screen, scales and saved loops. */
  readonly screen: Screen;
  /** The respiratory-mechanics tests, or null for a cockpit without holds. */
  readonly tests: Manoeuvres | null;
  /** The quantity whose scale is selected, with the scale the knob has turned it to; or null. */
  scaleSel(): { q: Q; scale: Scale } | null;
  /** The Patient's Data page shown (0 or 1). */
  page(): number;
  /** The control whose help the Help window shows, or null; and whether "?" waits for a key. */
  helpFor(): string | null;
  helpArmed(): boolean;
  locked(): boolean;
  /** Subscribe to state changes the face must draw. */
  onChange(fn: () => void): () => void;
}

export function createKnob(c: Cockpit, now: () => number = () => performance.now()): Knob {
  const pending = createPending(c, now);
  let wins: Win[] = [];
  let confirming: string | null = null;
  let edits: Partial<VentConfig> = {};
  /** The open draft window's edits, applied by its Accept row, dropped by Esc (research/57 T-41). */
  let wedits: Partial<VentConfig> = {};
  let ctrl = false;
  let note: { r: ReasonId; until: number } | null = null;
  let menuPresses = 0;
  let testFrom: number | null = null;
  let selSetting: Setting & { ctrl?: number | ReasonId; ends?: SettingCtl['ends'] } | null = null;
  const subs = new Set<() => void>();
  const changed = () => { for (const fn of [...subs]) fn(); };
  const say = (r: ReasonId) => { note = { r, until: now() + num(LAYOUT.reasonMs) }; };
  const screen = createScreen();
  const tests = c.holds ? createManoeuvres(c, () => { say('testDone'); changed(); }) : null;
  let scaleSel: { q: Q; scale: Scale } | null = null;
  let page = 0;
  let helpArmed = false;
  let helpFor: string | null = null;
  let lockDownAt: number | null = null;
  let isLocked = false;
  const lockMs = num(DATA.mechanics.lockHoldS) * 1000;
  const locked = () => isLocked || (lockDownAt !== null && now() - lockDownAt >= lockMs);
  // an alarm unlocks the screen (research/57 H-13)
  c.onAlarm((e) => { if (e.kind === 'raised' && locked()) { isLocked = false; lockDownAt = null; changed(); } });

  const draftCfg = (): Cfg => {
    if (!confirming) return c.cfg;
    const m = MODES[confirming]!;
    return { ...c.cfg, ...m.patch, ...m.carry?.(c.cfg), mode: m.mode, modeLabel: m.label, ...edits };
  };
  const live: Target = { cfg: () => c.cfg, apply: (p) => c.write(p) };
  const draft: Target = { cfg: draftCfg, apply: (p) => void Object.assign(edits, p) };
  const target = () => (confirming ? draft : live);
  const wdraft: Target = { cfg: () => ({ ...c.cfg, ...wedits }), apply: (p) => void Object.assign(wedits, p) };
  const windowCfg = (id: WindowId): Cfg => (WINDOWS[id].draft ? wdraft.cfg() : c.cfg);

  const items = (id: WindowId): Item[] => {
    const out: Item[] = [];
    WINDOWS[id].rows.forEach((r: Row, i) => {
      if (r.kind === 'mode' || r.kind === 'open' || r.kind === 'accept' || r.kind === 'layout' || r.kind === 'test' || r.kind === 'reading' || r.kind === 'toggle') out.push({ row: i });
      else if (r.kind === 'setting' && settingState(r.setting, c.cfg) === 'live') out.push({ row: i });
      else if (r.kind === 'limits') for (const cell of r.cells) out.push({ row: i, cell });
    });
    return out;
  };
  const top = () => wins[wins.length - 1] ?? null;
  const select = (id: string, s: Setting & { ctrl?: number | ReasonId; ends?: SettingCtl['ends'] }, t: Target) => {
    selSetting = s;
    pending.select(id, s, t);
  };
  const openOnly = (id: WindowId) => {
    pending.cancel();
    scaleSel = null;
    page = 0;
    confirming = null;
    edits = {};
    wedits = {};
    wins = [{ id, focus: 0 }];
  };
  const activate = (w: Win) => {
    const it = items(w.id)[w.focus];
    if (!it) return;
    const row = WINDOWS[w.id].rows[it.row]!;
    if (row.kind === 'mode') { confirming = row.mode; edits = {}; return; }
    if (row.kind === 'open') {
      const at = wins.findIndex((x) => x.id === row.window);
      wins = at >= 0 ? wins.slice(0, at + 1) : [...wins, { id: row.window, focus: 0 }];
      return;
    }
    if (row.kind === 'layout') { screen.layout = row.layout; wins = []; return; }
    if (row.kind === 'test') {
      if (!tests?.allowed()) return say('testModes');
      if (tests.start(row.test)) say('testRunning');
      return;
    }
    if (row.kind === 'reading') return say(row.note);
    if (row.kind === 'toggle') { screen.autoscale = !screen.autoscale; return; }
    if (row.kind === 'accept') {
      // research/57 T-41: Accept applies the window's values and closes it
      if (Object.keys(wedits).length) c.write(wedits);
      wedits = {};
      wins = wins.slice(0, -1);
      return;
    }
    if (row.kind === 'setting') select(`row:${row.setting}`, SETTINGS[row.setting]!, WINDOWS[w.id].draft ? wdraft : live);
    if (row.kind === 'limits' && it.cell) select(`tag:${it.cell}`, LIMITS[it.cell]!, live);
  };
  const commit = () => {
    const name = confirming!;
    const e = edits;
    confirming = null;
    edits = {};
    wins = [];
    c.chooseMode(name);
    if (Object.keys(e).length) c.write(e);
    if (name === 'PSV/CPAP') say('psvPressureCycle'); // what the simulated PSV/CPAP breath ends on (research/57 M-06, M-07)
  };

  const k: Knob = {
    pending,
    windows: () => wins,
    items,
    confirming: () => confirming,
    shown: draftCfg,
    rowMode: () => faceMode(draftCfg()),
    windowCfg,
    ctrl: () => ctrl,
    alarmTest: () => {
      if (testFrom === null) return null;
      const i = Math.floor((now() - testFrom) / (num(LAYOUT.alarmTestStepS) * 1000));
      return TEST_STEPS[i] ?? null;
    },
    note: () => (note && now() < note.until ? note.r : null),
    explain(r) { say(r); changed(); },
    press(id) {
      const ctl = CONTROLS.find((x) => x.id === id);
      if (!ctl) return;
      if (locked() && !LIVE_LOCKED.has(ctl.region) && ctl.id !== 'side:knobPress') return void (say('locked'), changed());
      if (helpArmed && id !== 'right:help') {
        helpArmed = false;
        helpFor = helpId(id);
        openOnly('help');
        return void changed();
      }
      if (ctl.kind === 'unavailable') say(ctl.reason);
      else if (ctl.kind === 'setting') {
        const s = SETTINGS[ctl.setting]!;
        const st = settingState(ctl.setting, draftCfg());
        if (st === 'shown') return;
        if (st !== 'live') return void (say(st.reason), changed());
        if (pending.key === id && s.again) {
          target().apply(s.again(target().cfg())); // Sens touched twice: flow ↔ pressure (research/57 O-06)
        }
        select(id, s, target());
      } else if (ctl.kind === 'limit') {
        const L = LIMITS[ctl.limit]!;
        select(id, L, live);
        if (L.note) say(L.note);
      } else if (ctl.action === 'mode') openOnly('modes');
      else if (ctl.action === 'alarmLimits' && ctrl) {
        // research/57 H-21, A-06: with an alarm active, its causes and remedies; else the test
        ctrl = false;
        const active = c.alarms().signals?.message;
        if (active) { helpFor = `alarm:${active.id}`; openOnly('help'); }
        else testFrom = now();
      } else if (ctl.action === 'alarmLimits') openOnly('alarms');
      else if (ctl.action === 'silence') c.silence();
      else if (ctl.action === 'menu') {
        menuPresses = wins[0]?.id === 'menu' && !confirming ? (menuPresses % 3) + 1 : 1;
        openOnly('menu');
        if (menuPresses === 2) wins.push({ id: 'adjuncts', focus: 0 });
        if (menuPresses === 3) wins.push({ id: 'tools', focus: 0 });
      } else if (ctl.action === 'ctrl') ctrl = !ctrl;
      else if (ctl.action === 'graphics' && ctrl) { ctrl = false; screen.refShown = false; } // Ctrl + Graphics: the reference off the screen (K-09)
      else if (ctl.action === 'graphics') openOnly('graphics');
      else if (ctl.action === 'freeze') c.toggleFreeze();
      else if (ctl.action === 'respMech') { if (!wins.length && !confirming) openOnly('respMech'); }
      else if (ctl.action === 'saveLoop') saveLoop(screen, c.buf, new Date());
      else if (ctl.action === 'help') { helpArmed = true; say('helpOn'); }
      else if (ctl.action === 'manualInsp' && ctrl) { ctrl = false; say('deepBreath'); } // Ctrl + Manual Insp.: the deep breath (H-16, H-17)
      else if (ctl.action === 'manualInsp') c.manualBreath(true);
      else if (ctl.action === 'lock') { if (locked()) isLocked = false; } // a press unlocks; locking takes the 2 s hold
      else if (ctl.action === 'scale') { pending.cancel(); scaleSel = { q: id.slice(6) as Q, scale: { ...screen.scale[id.slice(6) as Q] } }; }
      else if (ctl.action === 'esc') {
        // research/57 H-25: resets the lamps of the alarms that have ended; cancels the operation; closes the window
        // [inferred: the manual lists Esc's four functions, not their order; one press does the lamp reset and the first
        // of the others that applies]
        c.esc();
        testFrom = null;
        if (pending.key !== null) pending.cancel();
        else if (scaleSel) scaleSel = null; // K-11: Esc cancels a scale's change
        else if (confirming) { confirming = null; edits = {}; }
        else if (helpArmed) helpArmed = false;
        else if (wins.length) { if (wins.pop() && !wins.some((x) => WINDOWS[x.id].draft)) wedits = {}; } // T-41: back to the previous values
        else if (c.frozen) c.toggleFreeze(); // Y-03: Esc leaves Freeze (p. 40)
        ctrl = false;
        note = null;
      } else if (ctl.action === 'knobPress') k.push();
      changed();
    },
    touchRow(id, item) {
      const w = wins.find((x) => x.id === id);
      if (!w || confirming) return;
      wins = wins.slice(0, wins.indexOf(w) + 1);
      w.focus = item;
      pending.cancel();
      activate(w);
      changed();
    },
    turn(n) {
      const w = top();
      if (scaleSel) {
        if (ctrl) scaleSel.scale.shift += n; // K-13: Ctrl and the knob move the axis
        else scaleSel.scale.idx = Math.max(0, Math.min(scaleCount(scaleSel.q) - 1, scaleSel.scale.idx + n));
      } else if (w && WINDOWS[w.id].pages) page = Math.max(0, Math.min(PAGES.length - 1, page + n));
      else if (pending.key !== null && selSetting) {
        let steps = n;
        if (ctrl && typeof selSetting.ctrl === 'number') steps = n * selSetting.ctrl;
        else if (ctrl && typeof selSetting.ctrl === 'string') say(selSetting.ctrl);
        const stop = pending.turn(steps);
        const why = stop ? selSetting.ends?.[stop] : undefined;
        if (why) say(why);
      } else if (!confirming && top()) {
        const w = top()!;
        w.focus = Math.max(0, Math.min(items(w.id).length - 1, w.focus + n));
      }
      changed();
    },
    push() {
      if (scaleSel) {
        // a scale changed by hand leaves autoscale (K-12: autoscale undoes a scale changed by hand)
        screen.scale[scaleSel.q] = scaleSel.scale;
        screen.autoscale = false;
        scaleSel = null;
        ctrl = false;
      } else if (pending.key !== null) { pending.confirm(); ctrl = false; }
      else if (confirming) commit();
      else if (top()) activate(top()!);
      changed();
    },
    down(id) {
      if (helpArmed) return k.press(id);
      if (id === 'under:inspExpPause' && !c.holds?.key(true)) say('pauseModes');
      if (id === 'under:lock') { if (locked()) { isLocked = false; lockDownAt = null; } else lockDownAt = now(); }
      changed();
    },
    up(id) {
      if (id === 'under:inspExpPause') c.holds?.key(false);
      if (id === 'under:lock' && lockDownAt !== null) { isLocked = locked(); lockDownAt = null; }
      changed();
    },
    screen,
    tests,
    scaleSel: () => scaleSel,
    page: () => page,
    helpFor: () => helpFor,
    helpArmed: () => helpArmed,
    locked,
    onChange: (fn) => (subs.add(fn), () => void subs.delete(fn)),
  };
  return k;
}
