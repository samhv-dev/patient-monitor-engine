// The rack (plan pump-rack-tci.md A1, §5; PQ1 = C): as many channels as the instructor chose on Room setup (1–8), each of
// the kind chosen there (syringe or drip), side by side as on an anaesthesia tower: four across, five to eight in two
// rows. The rack owns the channel list and their faces (one face per channel, made once and kept, so A2's controls in a
// face's actions slot survive every update and every change of the setting); the rows come from pump/page.ts, already
// projected (face-row.ts). A channel the engine holds loaded keeps the engine's kind, whatever Room setup says, and one
// beyond the chosen count stays on view: a running infusion with no face would be the worse failure (refusing the
// change on Room setup is the host's, C2).
import { h, setText } from '../ui.ts';
import type { FaceRow } from './face-row.ts';
import { FACE_LABELS, faceView, type ChannelKind, type FaceLabels, type FaceProfiles, type FaceView } from './face.ts';

/** A channel as A2 sees it: its face, its actions slot, its current row and each new one. */
export interface RackChannel {
  readonly ch: number;
  readonly el: HTMLElement;
  readonly actions: HTMLElement;
  row(): FaceRow | null;
  onRow(fn: (row: FaceRow | null) => void): () => void;
}

export interface Rack {
  readonly el: HTMLElement;
  /** Room setup's channels, in order (index 0 is channel 1); null: the room's setting has not arrived. */
  setKinds(kinds: readonly ChannelKind[] | null): void;
  /** The engine's channel rows, as the face may show them. */
  update(rows: readonly FaceRow[]): void;
  channel(ch: number): RackChannel | undefined;
  channels(): RackChannel[];
}

/** The rack's words (the app's chrome around the faces). */
export const RACK_WORDS = {
  label: 'Infusion pumps',
  waiting: "Waiting for the room's pump setting from the instructor's computer…",
};

/** Channels per row of the rack (§5: "four 44 px-target columns of about 300 px each at 1280 px", ENG: ui). */
const PER_ROW = 4;

export function rackView(o: { profiles: FaceProfiles | null; labels?: FaceLabels }): Rack {
  const L = o.labels ?? FACE_LABELS;
  const waiting = h('p', { class: 'pump-wait hint', role: 'status' }, RACK_WORDS.waiting);
  const grid = h('div', { class: 'pump-grid' });
  const el = h('section', { class: 'pump-rack', 'aria-label': RACK_WORDS.label }, waiting, grid);
  type Slot = { face: FaceView; row: FaceRow | null; fns: Set<(r: FaceRow | null) => void>; api: RackChannel };
  const slots = new Map<number, Slot>();
  let kinds: readonly ChannelKind[] | null = null;
  let rows = new Map<number, FaceRow>();

  const slot = (ch: number): Slot => {
    let s = slots.get(ch);
    if (s) return s;
    const face = faceView(ch, kinds?.[ch - 1] ?? 'syringe', o.profiles, L);
    const fns = new Set<(r: FaceRow | null) => void>();
    const made: Slot = {
      face,
      row: null,
      fns,
      api: {
        ch,
        el: face.el,
        actions: face.actions,
        row: () => made.row,
        onRow: (fn) => (fns.add(fn), () => void fns.delete(fn)),
      },
    };
    slots.set(ch, (s = made));
    return s;
  };

  const shown = (): number[] => {
    if (kinds === null) return [];
    const chs = new Set<number>(kinds.map((_, i) => i + 1));
    for (const r of rows.values()) if (r.state !== 'notLoaded') chs.add(r.ch);
    return [...chs].sort((a, b) => a - b);
  };

  const layout = () => {
    const chs = shown();
    waiting.hidden = kinds !== null;
    setText(waiting, RACK_WORDS.waiting);
    for (const ch of chs) {
      const s = slot(ch);
      s.face.setKind(kinds?.[ch - 1] ?? s.row?.kind ?? 'syringe');
    }
    grid.replaceChildren(...chs.map((ch) => slot(ch).face.el));
    el.dataset.rows = String(Math.max(1, Math.ceil(chs.length / PER_ROW)));
    el.dataset.channels = String(chs.length);
  };

  layout();
  return {
    el,
    setKinds(k) {
      kinds = k ? [...k] : null;
      layout();
    },
    update(next) {
      rows = new Map(next.map((r) => [r.ch, r]));
      const before = grid.childElementCount;
      const chs = shown();
      for (const ch of new Set([...chs, ...slots.keys()])) {
        const s = slot(ch);
        const r = rows.get(ch) ?? null;
        const changed = r !== null || s.row !== null; // a new row each event; an empty channel that stays empty is no news
        s.row = r;
        s.face.update(r);
        if (changed) for (const fn of s.fns) fn(r);
      }
      if (chs.length !== before || chs.some((ch, i) => grid.children[i] !== slot(ch).face.el)) layout();
    },
    channel: (ch) => (shown().includes(ch) ? slot(ch).api : undefined),
    channels: () => shown().map((ch) => slot(ch).api),
  };
}
