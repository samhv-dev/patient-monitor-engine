// The learner action remote's page (plan learner-action-remote.md L6, §4 D1, D9; LQ1 ruled 9 November): a phone that
// picked "Learner remote" on the instrument picker opens `?join=CODE#/remote/learner`. The page asks first for the
// LEARNER PIN the instructor reads out, in P7's form (pin-form.ts: the keypad, the code, the words of each state with
// "learner PIN" in them). The PIN is held in this page's memory only: the form has no name for it and never submits, so it
// is never in the address or the history, and nothing here writes it to the phone's store; the field is emptied at sign-in
// and when the page is left. At sign-in the page mounts the follower (views/follower.ts) whose every hello says
// `{role: 'learner', show: 'learner', device, pin}`; the laptop's host grants it on the learner PIN (L4). Granted, the
// page shows the patient's monitor as a strip at the top, three tabs (Drugs, Infusions, Labs) and, under them, the
// follower's connection line with its own Sound, Silence and "Change" (back to the picker). L7 puts the drugs menu (the
// bench and the tray, remote/drugs.ts) in the Drugs tab (`drugs`); Infusions (L8) and Labs (L11) are still empty frames
// that say so. Each sign-in mounts a new follower: `onSignedIn` hands it to the menus once the host grants it. A refusal (a wrong
// learner PIN, too many tries, the learner PIN changed on the laptop) tears the follower down and shows the form again
// with the reason in words.
import { INSTRUCTOR_REASONS, LEARNER_REASONS, type RelayFrame, type WireMessage } from '@pme/controller';
import type { View } from '../shell.ts';
import { h, setText, tabs } from '../ui.ts';
import type { Follower } from './follower.ts';
import { PHONE_WORDS, pinForm } from './pin-form.ts';

/** Plan P7 §1: an older kit's relay refuses the learner's hello or an older host never answers; the phone gives up [ENG: ui; P7's 10 s]. */
export const LEARNER_GIVE_UP_MS = 10_000;

/** The remote's tabs, in this order (§3): L7 fills Drugs, L8 Infusions, L11 Labs. */
export const LEARNER_TABS = [
  { id: 'drugs', label: 'Drugs' },
  { id: 'infusions', label: 'Infusions' },
  { id: 'labs', label: 'Labs' },
] as const;
export type LearnerTab = (typeof LEARNER_TABS)[number]['id'];

/**
 * The page's words: P7's states (pin-form.ts PHONE_WORDS) with "learner PIN" in them, and each empty tab's one line (the
 * product does not do it yet, so the page says so).
 */
export const LEARNER_WORDS = {
  title: 'Learner remote',
  lede: 'Enter the learner PIN the instructor reads out. This phone does not keep it.',
  pinLabel: 'Learner PIN',
  badPin: 'The learner PIN has 4 to 8 digits.',
  signingIn: "Signing in: waiting for the instructor's computer…",
  signedIn: (code: string) => `Signed in as a learner remote · ${code}`,
  wrongPin: 'Wrong learner PIN. Enter the learner PIN the instructor reads out.',
  tooManyTries: 'Too many wrong learner PINs from this phone. Wait a minute, then enter the learner PIN again.',
  pinChanged: "The learner PIN was changed on the instructor's computer. Enter the new learner PIN.",
  noRemote: "The instructor's computer does not take a learner remote.",
  samePins: "The instructor's computer cannot take a learner remote until it draws a new learner PIN. Ask the instructor.",
  full: 'This room is full: no more phones can join it.',
  kitTooOld: 'This classroom kit does not take a learner remote. Use the kit from the same release as the app.',
  noHost: PHONE_WORDS.noHost,
  unreachable: PHONE_WORDS.unreachable,
  change: 'Change',
  tabsLabel: 'Learner remote',
  empty: {
    infusions: 'Starting and changing infusions from this phone: not in this release yet.',
    labs: 'Sending samples and reading their results on this phone: not in this release yet.',
  } satisfies Record<Exclude<LearnerTab, 'drugs'>, string>,
} as const;

/** What the phone says for a refusal: the host's reason (its grant) or the relay's (its error frame), in the page's words. */
export function learnerRefusalWords(a: { reason?: string; code?: string }): string {
  if (a.code === 'too-many-tries') return LEARNER_WORDS.tooManyTries;
  if (a.code === 'full') return LEARNER_WORDS.full;
  if (a.code === 'forbidden') return LEARNER_WORDS.kitTooOld; // a relay from before L3 refuses the role
  if (a.reason === INSTRUCTOR_REASONS.wrongPin) return LEARNER_WORDS.wrongPin;
  if (a.reason === LEARNER_REASONS.pinChanged) return LEARNER_WORDS.pinChanged;
  if (a.reason === LEARNER_REASONS.noRemote) return LEARNER_WORDS.noRemote;
  if (a.reason === LEARNER_REASONS.samePins) return LEARNER_WORDS.samePins;
  return `Not signed in: ${a.reason ?? "the instructor's computer refused the phone"}.`;
}

export interface LearnerRemoteOptions {
  /** The room code (`?join=`), filled into the form. */
  code: string;
  /**
   * Mount the follower for `code` with its status line and buttons in `bar`, saying `{role: 'learner', show: 'learner',
   * device, pin: pin()}` on every hello (main.ts: mountFollower over the relay). Called at each sign-in.
   */
  follow(code: string, bar: HTMLElement, pin: () => string): Follower;
  /** The monitor's region (the shell's stage): hidden until the host grants the remote. */
  stage?: HTMLElement;
  /** L7: the Drugs tab's menu (remote/drugs.ts), mounted in its panel. */
  drugs?: HTMLElement;
}

/** L7: what a menu does with a granted follower; its return is called when that follower goes (a refusal, a new sign-in). */
export type OnSignedIn = (f: Follower) => (() => void) | void;

export interface LearnerRemote extends View {
  /** The three tabs' mount points: L7's drugs menu is in `drugs`; L8 and L11 put theirs in the other two. */
  readonly panels: Readonly<Record<LearnerTab, HTMLElement>>;
  /** The follower while signed in or signing in, else null. */
  follower(): Follower | null;
  /** Open a tab. */
  select(tab: LearnerTab): void;
  /**
   * L7: call `fn` with each follower once the host grants it (each sign-in mounts a new one; a re-grant of the same follower
   * after a reconnect does not call it again), and `fn`'s return when that follower is torn down. Returns the unsubscribe.
   */
  onSignedIn(fn: OnSignedIn): () => void;
}

/** The learner remote's page: the learner-PIN form first; signed in, the monitor strip, the three tabs, the connection line. */
export function learnerRemoteView(o: LearnerRemoteOptions): LearnerRemote {
  const { form, pinIn, err, clear } = pinForm({
    title: LEARNER_WORDS.title,
    lede: LEARNER_WORDS.lede,
    code: o.code,
    pinLabel: LEARNER_WORDS.pinLabel,
    badPin: LEARNER_WORDS.badPin,
    onSignIn: (code, pin) => signIn(code, pin),
  });
  // Before the sign-in the picker is one tap away too (the follower bar's "Change" replaces it once signed in)
  form.append(h('p', { class: 'lr-change' }, h('a', { class: 'btn small', href: '#/pick' }, LEARNER_WORDS.change)));
  const status = h('p', { class: 'status-pill lr-status', role: 'status' });
  const panels = Object.fromEntries(LEARNER_TABS.map((t) => [t.id, h('div', { class: 'lr-panel', 'data-panel': t.id }, ...(t.id === 'drugs' ? (o.drugs ? [o.drugs] : []) : [h('p', { class: 'hint lr-empty' }, LEARNER_WORDS.empty[t.id])]))])) as unknown as Record<LearnerTab, HTMLElement>;
  const hooks = new Set<OnSignedIn>();
  const tabSet = tabs(LEARNER_WORDS.tabsLabel, LEARNER_TABS.map((t) => ({ id: t.id, label: t.label, render: () => panels[t.id] })), 'drugs', undefined, 'tabs lr-tabs');
  // The follower's line (its status, Sound, Silence here, Change), under the tabs
  const bar = h('div', { class: 'follower-bar lr-bar', role: 'toolbar', 'aria-label': 'Learner remote connection' });
  const signedIn = h('div', { class: 'lr-signed' }, h('div', { class: 'lr-head' }, h('h1', { class: 'lr-title' }, LEARNER_WORDS.title), status), tabSet.el);
  signedIn.hidden = true;
  const el = h('section', { class: 'lr', 'aria-label': LEARNER_WORDS.title }, form, signedIn, bar);
  bar.hidden = true;
  if (o.stage) o.stage.hidden = true;

  let live: { follower: Follower; stop(): void; hooked: Array<() => void> | null } | null = null;
  const showForm = (why: string) => {
    live?.stop();
    live = null;
    pinIn.inp.value = '';
    setText(err, why);
    form.hidden = false;
    signedIn.hidden = true;
    bar.hidden = true;
    if (o.stage) o.stage.hidden = true;
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
      // The host's answer to this socket's learner hello (the relay sends a grant to the socket it names only)
      f.transport.onMessage((m: WireMessage) => {
        if (m.kind === 'hello' && m.role === 'host') hostSeen = true;
        if (m.kind !== 'grant') return;
        if (m.granted) return void ((granted = true), draw());
        refuse(learnerRefusalWords({ ...(m.reason !== undefined ? { reason: m.reason } : {}) }));
      }),
      // The relay's refusal (too many tries, a full room, an older kit); its `denied` follows the host's grant, whose words stand
      f.transport.onRelayFrame?.((fr: RelayFrame) => {
        if (fr.relay !== 'error' || fr.code === 'denied') return;
        if (fr.code === 'too-many-tries' || fr.code === 'full' || fr.code === 'forbidden') refuse(learnerRefusalWords({ code: fr.code, reason: fr.message }));
      }) ?? (() => undefined),
    ];
    const giveUp = setTimeout(() => {
      if (!granted) refuse(!opened ? LEARNER_WORDS.unreachable : !hostSeen ? LEARNER_WORDS.noHost : LEARNER_WORDS.kitTooOld);
    }, LEARNER_GIVE_UP_MS);
    const draw = () => {
      if (!granted) return;
      clearTimeout(giveUp);
      form.hidden = true;
      signedIn.hidden = false;
      bar.hidden = false;
      if (o.stage) o.stage.hidden = false;
      setText(status, LEARNER_WORDS.signedIn(code));
      status.dataset.state = 'granted';
      // L7: the menus take this follower once (its prep events, its command path)
      if (live && live.follower === f && live.hooked === null) live.hooked = [...hooks].map((fn) => fn(f) ?? (() => undefined));
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
    // Until the grant the form stays, saying it is signing in
    setText(err, LEARNER_WORDS.signingIn);
  }

  return {
    id: 'remote',
    el,
    panels,
    follower: () => live?.follower ?? null,
    select: (t) => tabSet.select(t),
    onSignedIn: (fn) => (hooks.add(fn), () => void hooks.delete(fn)),
    leave: clear,
  };
}
