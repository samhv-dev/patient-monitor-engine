// A ventilator linked to a room drives the room's patient through the room's host, which takes from it only what a
// ventilator does: its breaths (the VentFrame), its own circuit at the Y-piece, its settings for a hand-over, and its own
// state for the room's bookmarks (the `state` it reports, the `deviceState` the link keeps in the engine, the answer to
// a restore). The patient (lungs, effort, disease, circulation) and the session's clock are the room's: anything else is refused.
import type { Command } from '@pme/engine-core';
import type { LinkMsg, LinkPort, MonitorLike } from './port.ts';

type Rule<T extends Command['type']> = (c: Extract<Command, { type: T }>) => boolean;

/** What a room's ventilator may send its host: the link messages, and the engine commands its `cmds` may carry. */
export const ROOM_VENT_MAY_SEND: {
  readonly messages: ReadonlySet<LinkMsg['kind']>;
  readonly commands: { readonly [T in Command['type']]?: Rule<T> };
} = {
  messages: new Set<LinkMsg['kind']>(['cmds', 'settings', 'state', 'restored']),
  commands: {
    externalDrive: (c) => c.source === 'ventilator',
    applyEvent: (c) => c.event.kind === 'airway',
    deviceState: (c) => c.source === 'ventilator',
  },
};

const named = (c: Command): string => (c.type === 'applyEvent' ? `applyEvent ${c.event.kind}` : c.type);

/** Why the host refuses this command from a room's ventilator, or null when a ventilator may send it. */
export function roomVentCommandRefusal(c: Command): string | null {
  const ok = ROOM_VENT_MAY_SEND.commands[c.type] as ((c: Command) => boolean) | undefined;
  return ok?.(c) ? null : `a ventilator in a room may not send ${named(c)}: the patient is the room's`;
}

/** Why the host refuses this link message from a room's ventilator, or null when a ventilator may send it. */
export function roomVentMessageRefusal(m: LinkMsg): string | null {
  return ROOM_VENT_MAY_SEND.messages.has(m.kind) ? null : `a ventilator in a room may not send '${m.kind}'`;
}

/** The host's end of a room ventilator's link: a message it may not send reaches no listener; `onRefused` hears it. */
export function roomVentPort(port: LinkPort, onRefused: (kind: string, reason: string) => void): LinkPort {
  return {
    post: (m) => port.post(m),
    onMessage: (fn) => port.onMessage((m) => {
      const why = roomVentMessageRefusal(m);
      if (why === null) fn(m);
      else onRefused(m.kind, why);
    }),
    close: () => port.close(),
  };
}

/** The monitor as a room ventilator's link may drive it: a command it may not send is refused with its reason. */
export function roomVentMonitor(mon: MonitorLike): MonitorLike {
  return {
    ...mon,
    dispatch: (c) => {
      const why = roomVentCommandRefusal(c);
      return why === null ? mon.dispatch(c) : { accepted: false, tick: -1, reason: why };
    },
  };
}
