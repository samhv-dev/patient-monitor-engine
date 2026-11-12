// The pump page (plan pump-rack-tci.md A1; §4 D1, §7): a tablet that picked "Infusion pumps" on the instrument picker
// opens `?join=CODE#/pump`. As the learner remote (views/learner-remote.ts, L6), whose pattern this is, it asks first for
// the LEARNER PIN in P7's form; the PIN is held in this page's memory only (never in the address, the history or the
// tablet's store). At sign-in it mounts the follower, whose every hello says `{role: 'pump', show: 'pump', device, pin}`;
// the rack shows once the host grants it. The page shows no monitor (a tower's pumps have none: the stage stays hidden)
// and carries none of the monitor's sound.
// What this page owns, and reads from the follower:
//   - the room's rack setting: the host's `style` event names each channel's kind (`pumps`, Room setup's setting; 1–8
//     channels of `syringe` or `drip`), at every hello and every change; a setting outside that is ignored;
//   - the channels' state: the follower ENGINE's `drugs` event (E1's `pumps` rows), projected at once by face-row.ts to
//     the programme only. This is the one place the page touches an engine row; the rack and its faces see FaceRows.
// The host does not yet grant a pump hello (that is C2): until it does, the tablet says after 10 s that the instructor's
// computer did not sign it in.
import { INSTRUCTOR_REASONS, LEARNER_REASONS, type RelayFrame, type WireMessage } from '@pme/controller';
import type { EngineEvent } from '@pme/engine-core';
import type { View } from '../shell.ts';
import { pumpRackOf } from '../site.ts';
import { h, setText } from '../ui.ts';
import type { Follower } from '../views/follower.ts';
import { PHONE_WORDS, pinForm } from '../views/pin-form.ts';
import { faceRow } from './face-row.ts';
import type { FaceProfiles } from './face.ts';
import { rackView, type Rack, type RackChannel } from './rack.ts';

/** As the learner remote (P7 §1): an older kit's relay refuses the hello, or the host never answers [ENG: ui; P7's 10 s]. */
export const PUMP_GIVE_UP_MS = 10_000;

/** The page's words (the app's chrome; the faces' own words are face.ts FACE_LABELS). English, as every pump word. */
export const PUMP_WORDS = {
  title: 'Infusion pumps',
  lede: 'Enter the learner PIN the instructor reads out. This tablet does not keep it.',
  pinLabel: 'Learner PIN',
  badPin: 'The learner PIN has 4 to 8 digits.',
  signingIn: "Signing in: waiting for the instructor's computer…",
  signedIn: (code: string) => `Signed in as the room's infusion pumps · ${code}`,
  wrongPin: 'Wrong learner PIN. Enter the learner PIN the instructor reads out.',
  tooManyTries: 'Too many wrong learner PINs from this tablet. Wait a minute, then enter the learner PIN again.',
  pinChanged: "The learner PIN was changed on the instructor's computer. Enter the new learner PIN.",
  noRemote: "The instructor's computer does not take a learner PIN yet: it has none set on Room setup.",
  samePins: "The instructor's computer cannot take a pump tablet until it draws a new learner PIN. Ask the instructor.",
  full: 'This room is full: no more devices can join it.',
  kitTooOld: 'This classroom kit does not take a pump tablet. Use the kit from the same release as the app.',
  notTaken: "The instructor's computer did not sign this tablet in: its app does not take pump tablets yet.",
  noHost: PHONE_WORDS.noHost,
  unreachable: PHONE_WORDS.unreachable,
  change: 'Change',
  barLabel: 'Infusion pumps connection',
};

/** What the tablet says for a refusal: the host's reason (its grant) or the relay's (its error frame). */
export function pumpRefusalWords(a: { reason?: string; code?: string }): string {
  if (a.code === 'too-many-tries') return PUMP_WORDS.tooManyTries;
  if (a.code === 'full') return PUMP_WORDS.full;
  if (a.code === 'forbidden') return PUMP_WORDS.kitTooOld;
  if (a.reason === INSTRUCTOR_REASONS.wrongPin) return PUMP_WORDS.wrongPin;
  if (a.reason === LEARNER_REASONS.pinChanged) return PUMP_WORDS.pinChanged;
  if (a.reason === LEARNER_REASONS.noRemote) return PUMP_WORDS.noRemote;
  if (a.reason === LEARNER_REASONS.samePins) return PUMP_WORDS.samePins;
  return `Not signed in: ${a.reason ?? "the instructor's computer refused the tablet"}.`;
}

export interface PumpPageOptions {
  code: string;
  /** Mount the follower for `code`, its connection line in `bar`, saying `{role: 'pump', show: 'pump', device, pin: pin()}`. */
  follow(code: string, bar: HTMLElement, pin: () => string): Follower;
  /** The monitor's region (the shell's stage): hidden on this page. */
  stage?: HTMLElement;
  /** The device profiles (D12, S1); null until S1 has merged: the faces say the profile is not loaded. */
  profiles: FaceProfiles | null;
}

export interface PumpPage extends View {
  readonly rack: Rack;
  follower(): Follower | null;
  /** A2: `fn` with each follower once the host grants it, and its return when that follower goes. */
  onSignedIn(fn: (f: Follower, channels: () => RackChannel[]) => (() => void) | void): () => void;
}

export function pumpPageView(o: PumpPageOptions): PumpPage {
  const { form, pinIn, err, clear } = pinForm({
    title: PUMP_WORDS.title,
    lede: PUMP_WORDS.lede,
    code: o.code,
    pinLabel: PUMP_WORDS.pinLabel,
    badPin: PUMP_WORDS.badPin,
    onSignIn: (code, pin) => signIn(code, pin),
  });
  form.append(h('p', { class: 'lr-change' }, h('a', { class: 'btn small', href: '#/pick' }, PUMP_WORDS.change)));
  const rack = rackView({ profiles: o.profiles });
  const status = h('p', { class: 'status-pill pump-status', role: 'status' });
  const bar = h('div', { class: 'follower-bar pump-bar', role: 'toolbar', 'aria-label': PUMP_WORDS.barLabel });
  const signed = h('div', { class: 'pump-signed' }, h('div', { class: 'pump-head' }, h('h1', { class: 'pump-title' }, PUMP_WORDS.title), status), rack.el);
  signed.hidden = true;
  bar.hidden = true;
  const el = h('section', { class: 'pump-page', 'aria-label': PUMP_WORDS.title }, form, signed, bar);
  if (o.stage) o.stage.hidden = true; // no monitor on the pump tablet, signed in or not
  const hooks = new Set<Parameters<PumpPage['onSignedIn']>[0]>();

  let live: { follower: Follower; stop(): void; hooked: Array<() => void> | null } | null = null;
  const showForm = (why: string) => {
    live?.stop();
    live = null;
    pinIn.inp.value = '';
    setText(err, why);
    form.hidden = false;
    signed.hidden = true;
    bar.hidden = true;
    rack.update([]);
    pinIn.inp.focus();
  };

  function signIn(code: string, pin: string): void {
    live?.stop();
    bar.replaceChildren();
    const f = o.follow(code, bar, () => pin); // the PIN lives in this closure, and nowhere else
    let opened = false;
    let hostSeen = false;
    let granted = false;
    let refused = false;
    const refuse = (why: string) => {
      if (refused) return;
      refused = true;
      showForm(why);
    };
    const offs: Array<() => void> = [
      f.transport.onStatus((s) => void (s === 'open' && (opened = true))),
      f.transport.onPresence?.((p) => void (p.hostOnline && (hostSeen = true))) ?? (() => undefined),
      f.transport.onMessage((m: WireMessage) => {
        if (m.kind === 'hello' && m.role === 'host') hostSeen = true;
        if (m.kind === 'event') {
          for (const e of m.body) {
            if (e.type !== 'style') continue;
            const kinds = pumpRackOf(e.pumps); // 1–8 channels of the two kinds, or ignored
            if (kinds) rack.setKinds(kinds);
          }
          return;
        }
        if (m.kind !== 'grant') return;
        if (m.granted) return void ((granted = true), draw());
        refuse(pumpRefusalWords({ ...(m.reason !== undefined ? { reason: m.reason } : {}) }));
      }),
      f.transport.onRelayFrame?.((fr: RelayFrame) => {
        if (fr.relay !== 'error' || fr.code === 'denied') return;
        if (fr.code === 'too-many-tries' || fr.code === 'full' || fr.code === 'forbidden') refuse(pumpRefusalWords({ code: fr.code, reason: fr.message }));
      }) ?? (() => undefined),
      // The follower engine's channels, the programme only from here on (face-row.ts)
      f.monitor.on((e: EngineEvent) => {
        if (e.type === 'drugs') rack.update((e.pumps ?? []).map(faceRow));
      }),
    ];
    const giveUp = setTimeout(() => {
      if (!granted) refuse(!opened ? PUMP_WORDS.unreachable : !hostSeen ? PUMP_WORDS.noHost : PUMP_WORDS.notTaken);
    }, PUMP_GIVE_UP_MS);
    const draw = () => {
      if (!granted) return;
      clearTimeout(giveUp);
      form.hidden = true;
      signed.hidden = false;
      bar.hidden = false;
      setText(status, PUMP_WORDS.signedIn(code));
      status.dataset.state = 'granted';
      if (live && live.follower === f && live.hooked === null) live.hooked = [...hooks].map((fn) => fn(f, () => rack.channels()) ?? (() => undefined));
    };
    live = {
      follower: f,
      hooked: null,
      stop() {
        clearTimeout(giveUp);
        for (const off of this.hooked?.splice(0) ?? []) off();
        for (const off of offs.splice(0)) off();
        f.destroy();
        bar.replaceChildren();
      },
    };
    setText(err, PUMP_WORDS.signingIn);
  }

  return {
    id: 'pump',
    el,
    rack,
    follower: () => live?.follower ?? null,
    onSignedIn: (fn) => (hooks.add(fn), () => void hooks.delete(fn)),
    leave: clear,
  };
}
