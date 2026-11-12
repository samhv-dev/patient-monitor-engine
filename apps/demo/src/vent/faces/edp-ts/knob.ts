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
// - Menu pressed again: Ventilatory adjuncts, then Tools, then the main menu (H-10).
// A pressed control that is not honoured yet shows its reason for a few seconds (since VF in the simulator's strip
// outside the device, never on it: brief 159, R20).
import type { VentConfig } from '@pme/ventilator';
import type { Cockpit } from '../../core/cockpit.ts';
import { createPending, type Pending } from '../../core/pending.ts';
import type { Setting, Target } from '../../core/types.ts';
import { CONTROLS, faceMode, LIMITS, SETTINGS, settingState, WINDOWS, type FaceMode, type Row, type SettingCtl, type WindowId } from './controls.ts';
import { LAYOUT, num, type ReasonId } from './data.ts';
import { MODES } from './modes.ts';

type Cfg = Readonly<VentConfig>;

/** A row's focusable part: the row itself, or one limit cell of it. */
export interface Item { row: number; cell?: string }
export interface Win { id: WindowId; focus: number }

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
  ctrl(): boolean;
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
  /** Subscribe to state changes the face must draw. */
  onChange(fn: () => void): () => void;
}

export function createKnob(c: Cockpit, now: () => number = () => performance.now()): Knob {
  const pending = createPending(c, now);
  let wins: Win[] = [];
  let confirming: string | null = null;
  let edits: Partial<VentConfig> = {};
  let ctrl = false;
  let note: { r: ReasonId; until: number } | null = null;
  let menuPresses = 0;
  let selSetting: Setting & { ctrl?: number | ReasonId; ends?: SettingCtl['ends'] } | null = null;
  const subs = new Set<() => void>();
  const changed = () => { for (const fn of [...subs]) fn(); };
  const say = (r: ReasonId) => { note = { r, until: now() + num(LAYOUT.reasonMs) }; };

  const draftCfg = (): Cfg => {
    if (!confirming) return c.cfg;
    const m = MODES[confirming]!;
    return { ...c.cfg, ...m.patch, ...m.carry?.(c.cfg), mode: m.mode, modeLabel: m.label, ...edits };
  };
  const live: Target = { cfg: () => c.cfg, apply: (p) => c.write(p) };
  const draft: Target = { cfg: draftCfg, apply: (p) => void Object.assign(edits, p) };
  const target = () => (confirming ? draft : live);

  const items = (id: WindowId): Item[] => {
    const out: Item[] = [];
    WINDOWS[id].rows.forEach((r: Row, i) => {
      if (r.kind === 'mode' || r.kind === 'open') out.push({ row: i });
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
    confirming = null;
    edits = {};
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
    if (row.kind === 'setting') select(`row:${row.setting}`, SETTINGS[row.setting]!, live);
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
  };

  const k: Knob = {
    pending,
    windows: () => wins,
    items,
    confirming: () => confirming,
    shown: draftCfg,
    rowMode: () => faceMode(draftCfg()),
    ctrl: () => ctrl,
    note: () => (note && now() < note.until ? note.r : null),
    explain(r) { say(r); changed(); },
    press(id) {
      const ctl = CONTROLS.find((x) => x.id === id);
      if (!ctl) return;
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
      } else if (ctl.kind === 'limit') select(id, LIMITS[ctl.limit]!, live);
      else if (ctl.action === 'mode') openOnly('modes');
      else if (ctl.action === 'alarmLimits') openOnly('alarms');
      else if (ctl.action === 'menu') {
        menuPresses = wins[0]?.id === 'menu' && !confirming ? (menuPresses % 3) + 1 : 1;
        openOnly('menu');
        if (menuPresses === 2) wins.push({ id: 'adjuncts', focus: 0 });
        if (menuPresses === 3) wins.push({ id: 'tools', focus: 0 });
      } else if (ctl.action === 'ctrl') ctrl = !ctrl;
      else if (ctl.action === 'esc') {
        // research/57 H-25: cancels the operation; closes the window
        if (pending.key !== null) pending.cancel();
        else if (confirming) { confirming = null; edits = {}; }
        else wins.pop();
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
      if (pending.key !== null && selSetting) {
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
      if (pending.key !== null) { pending.confirm(); ctrl = false; }
      else if (confirming) commit();
      else if (top()) activate(top()!);
      changed();
    },
    onChange: (fn) => (subs.add(fn), () => void subs.delete(fn)),
  };
  return k;
}
