// Plan learner-action-remote.md L7: the learner remote's Drugs tab: the preparation bench (bench.ts) over the tray
// (tray.ts). The formulary is the shipped one (formulary.ts, the same files and rules the host loads); until it loads the
// tab says so, and a formulary that breaks its source rules is not used (the host refuses every preparation then, too).
// Each granted follower (LearnerRemote.onSignedIn) gives the tray its command path and its `prep` events.
import type { Formulary } from '@pme/controller';
import { h, setText } from '../ui.ts';
import type { Follower } from '../views/follower.ts';
import { benchView, type Bench } from './bench.ts';
import { trayView, type Tray } from './tray.ts';

export const DRUGS_WORDS = {
  loading: 'Loading the formulary…',
  broken: 'This phone’s formulary does not pass its source check: drugs cannot be prepared from it. Tell the instructor.',
} as const;

export interface DrugsMenu {
  el: HTMLElement;
  /** The formulary arrived (null: it breaks its source rules). */
  ready(f: Formulary | null): void;
  /** A granted follower: the tray's command path and news; returns the detach (main.ts passes it to onSignedIn). */
  attach(f: Follower): () => void;
  readonly bench: Bench | null;
  readonly tray: Tray | null;
}

/** The Drugs tab: "Loading the formulary…" until `ready`, then the bench over the tray. */
export function drugsMenu(o: { now(): number | null; tone?: () => void }): DrugsMenu {
  const note = h('p', { class: 'hint lr-loading', role: 'status' }, DRUGS_WORDS.loading);
  const el = h('div', { class: 'lr-drugs' }, note);
  let bench: Bench | null = null;
  let tray: Tray | null = null;
  let follower: Follower | null = null;
  let detach: (() => void) | null = null;
  const link = () => {
    detach?.();
    detach = null;
    if (!tray || !follower?.command) return;
    const f = follower;
    detach = tray.attach({ command: f.command!, onMessage: (fn) => f.transport.onMessage(fn), peerId: f.peerId });
  };
  return {
    el,
    ready(f) {
      if (!f) return setText(note, DRUGS_WORDS.broken);
      note.remove();
      tray = trayView({ formulary: f, now: o.now, ...(o.tone ? { tone: o.tone } : {}) });
      bench = benchView({ formulary: f, onStage: (c) => tray?.stage(c) });
      el.append(bench.el, tray.el);
      link();
    },
    attach(f) {
      follower = f;
      link();
      return () => {
        if (follower !== f) return;
        follower = null;
        detach?.();
        detach = null;
      };
    },
    get bench() { return bench; },
    get tray() { return tray; },
  };
}
