// Plan pump-rack-tci.md A2 (§4 D2, §5 "Buttons", §8): the channel controls on each face of the rack, and the one
// place a flow's command leaves the tablet. Each face's `actions` slot (A1 made it once per channel, so it survives
// every update) gets the buttons §5 names — Load, Program, Rate, TCI, Bolus, Start/Stop, Purge, Unload; a drip channel
// has no TCI and no Bolus — and under them the open flow's form, the line that says what happened, and the instructor's
// mismatch notice. The flows themselves (load.ts … purge.ts) only BUILD one of C1's PUMP_COMMANDS shapes from their
// form; this module sends it through the tablet's follower (its learner-PIN peer, f.command) and shows the host's
// answer. The face decides nothing the host decides: "Sent" until the ack; a refusal is the ack's reason as the host
// wrote it; nothing is said to be loaded, running or delivered that the host has not acknowledged (and what runs is
// the face's own fields, from the follower engine). The face's words are English only (the owner's ruling of
// 10 November: a device's face carries no Persian).
import type { Formulary, PumpDevices } from '@pme/controller';
import { h, setText } from '../ui.ts';
import type { ChannelKind } from './face.ts';
import { FLOW_WORDS, type Flow, type FlowDef, type FlowInput, type PumpBody, type PumpLabel, type PumpLink } from './form.ts';
import type { Rack, RackChannel } from './rack.ts';
import type { Follower } from '../views/follower.ts';
import { BOLUS } from './bolus.ts';
import { LOAD } from './load.ts';
import { PROGRAM } from './program.ts';
import { PURGE } from './purge.ts';
import { RATE } from './rate.ts';
import { TCI } from './tci.ts';

import type { CasePatient } from './form.ts';
export { FLOW_WORDS, type CasePatient, type Flow, type FlowDef, type FlowInput, type PumpBody, type PumpLabel, type PumpLink } from './form.ts';

/** The flows in §5's button order (Start/Stop sits between Bolus and Purge; Unload last). */
const FLOWS: readonly FlowDef[] = [LOAD, PROGRAM, RATE, TCI, BOLUS];

/** One channel's controls in its face's `actions` slot. */
function channelControls(api: RackChannel, ctx: { link: PumpLink; input(api: RackChannel): FlowInput }): { destroy(): void; notice(words: string): void; ack(id: string, accepted: boolean, reason: string | undefined): boolean; refresh(): void } {
  const ch = api.ch;
  const pending = new Map<string, string>(); // command id → what an accepted one did
  const said = h('p', { class: 'pf-said', role: 'status', 'aria-live': 'polite' });
  const notice = h('p', { class: 'pf-notice', role: 'alert' });
  notice.hidden = true;
  const panel = h('div', { class: 'pf-panel' });
  let open: { def: FlowDef; flow: Flow; form: HTMLFormElement } | null = null;

  const sendBody = (body: PumpBody, done: string): void => {
    const id = ctx.link.command(body);
    pending.set(id, done);
    setText(said, FLOW_WORDS.sent);
  };
  const close = () => {
    open?.form.remove();
    open = null;
    for (const b of buttons.querySelectorAll('.pf-btn')) b.setAttribute('aria-expanded', 'false');
  };
  const openFlow = (def: FlowDef) => {
    if (open?.def === def) return close();
    close();
    const flow = def.make(ctx.input(api));
    const form = h('form', { class: 'pf-flow', 'data-flow': def.id, novalidate: true, 'aria-label': `${def.title} · channel ${ch}` },
      h('h3', { class: 'pf-flow-title' }, def.title), flow.el,
      h('div', { class: 'pf-flow-actions' },
        h('button', { type: 'submit', class: 'btn primary pf-send' }, def.submit),
        h('button', { type: 'button', class: 'btn pf-cancel', onclick: () => close() }, FLOW_WORDS.cancel)));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const b = flow.build();
      if (!('type' in b)) return void setText(said, b.why);
      sendBody(b, def.done(ch, api.row()));
      close();
    });
    panel.append(form);
    open = { def, flow, form };
    buttons.querySelector(`.pf-btn[data-flow="${def.id}"]`)?.setAttribute('aria-expanded', 'true');
  };
  const flowButton = (def: FlowDef) => h('button', { type: 'button', class: 'btn pf-btn', 'data-flow': def.id, 'aria-expanded': 'false', onclick: () => openFlow(def) }, def.button);
  const startBtn = h('button', { type: 'button', class: 'btn pf-btn', 'data-flow': 'start', onclick: () => {
    close();
    const running = api.row()?.state === 'running';
    sendBody({ type: 'pump', ch, action: running ? 'stop' : 'start' }, running ? FLOW_WORDS.stopped(ch) : FLOW_WORDS.started(ch));
  } }, FLOW_WORDS.start);
  const unloadBtn = h('button', { type: 'button', class: 'btn pf-btn', 'data-flow': 'unload', onclick: () => (close(), sendBody({ type: 'pump', ch, action: 'unload' }, FLOW_WORDS.unloaded(ch))) }, FLOW_WORDS.unload);
  const byId = new Map(FLOWS.map((d) => [d.id, flowButton(d)]));
  const purgeBtn = flowButton(PURGE);
  const buttons = h('div', { class: 'pf-buttons' }, ...byId.values(), startBtn, purgeBtn, unloadBtn);
  api.actions.append(buttons, panel, said, notice);

  const refresh = () => {
    const kind = (api.el.dataset.kind ?? 'syringe') as ChannelKind;
    for (const d of FLOWS) {
      const b = byId.get(d.id) as HTMLElement;
      b.hidden = !d.kinds.includes(kind);
      if (b.hidden && open?.def === d) close();
    }
    setText(startBtn, api.row()?.state === 'running' ? FLOW_WORDS.stop : FLOW_WORDS.start);
  };
  const offRow = api.onRow(() => refresh());
  refresh();
  return {
    refresh,
    notice(words) {
      notice.hidden = false;
      setText(notice, words);
    },
    ack(id, accepted, reason) {
      const done = pending.get(id);
      if (done === undefined) return false;
      pending.delete(id);
      setText(said, accepted ? done : FLOW_WORDS.refused(reason ?? 'refused'));
      return true;
    },
    destroy() {
      offRow();
      close();
      for (const el of [buttons, panel, said, notice]) el.remove();
    },
  };
}

export interface Flows {
  /** The preparations' labels the host last sent this tablet. */
  readonly labels: readonly PumpLabel[];
  destroy(): void;
}

/**
 * The flows on every channel of `rack`, sending through `link` (a granted pump tablet's follower). Channels that appear
 * later (Room setup's count raised, a loaded channel beyond it) get theirs at the next message.
 */
export function mountFlows(rack: Rack, link: PumpLink, o: { devices: PumpDevices | null; formulary(): Formulary | null }): Flows {
  let labels: readonly PumpLabel[] = [];
  const chans = new Map<number, ReturnType<typeof channelControls>>();
  const input = (api: RackChannel): FlowInput => ({
    ch: api.ch, kind: (api.el.dataset.kind ?? 'syringe') as ChannelKind, row: api.row(), devices: o.devices, formulary: o.formulary(), labels, casePatient: () => link.casePatient(),
  });
  const ensure = () => {
    for (const api of rack.channels()) {
      const c = chans.get(api.ch);
      if (c) c.refresh();
      else chans.set(api.ch, channelControls(api, { link, input }));
    }
  };
  const off = link.onMessage((m) => {
    ensure();
    if (m.kind === 'ack') {
      for (const c of chans.values()) if (c.ack(m.commandId, m.accepted, m.reason)) break;
      return;
    }
    if (m.kind !== 'event') return;
    for (const e of m.body) {
      if (e.type !== 'prep' || e.to !== link.peerId) continue;
      const b = e.body as { news?: string; labels?: PumpLabel[]; ch?: number; words?: string } | null;
      if (b?.news === 'labels' && Array.isArray(b.labels)) labels = b.labels;
      if (b?.news === 'mismatch' && typeof b.ch === 'number' && typeof b.words === 'string') chans.get(b.ch)?.notice(b.words);
    }
  });
  ensure();
  return {
    get labels() {
      return labels;
    },
    destroy() {
      off();
      for (const c of chans.values()) c.destroy();
      chans.clear();
    },
  };
}

/** The case patient as a follower engine's snapshot holds it (the drug model's patient: the case's), or null. */
export function casePatientOf(s: unknown): CasePatient | null {
  const p = (s as { state?: { st?: { pk?: { patient?: Partial<CasePatient> } } } } | null)?.state?.st?.pk?.patient;
  if (!p || typeof p.ageY !== 'number' || typeof p.weightKg !== 'number' || typeof p.heightCm !== 'number' || (p.sex !== 'm' && p.sex !== 'f')) return null;
  return { ageY: p.ageY, weightKg: p.weightKg, heightCm: p.heightCm, sex: p.sex };
}

/** The flows' link on a granted pump tablet's follower (its learner-PIN peer's command), or null when it has none. */
export function pumpLink(f: Follower, device: string): PumpLink | null {
  const command = f.command;
  if (!command) return null;
  return {
    peerId: f.peerId,
    device,
    command: (body) => command(body),
    onMessage: (fn) => f.transport.onMessage(fn),
    casePatient: () => Promise.resolve(f.monitor.snapshot()).then(casePatientOf, () => null),
  };
}
