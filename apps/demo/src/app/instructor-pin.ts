// The instructor phone's PIN (plan instructor-peer-role.md §1, Q2): kept on the laptop only, in the app's store
// (localStorage `pme.instructorPin`), four random digits drawn at first use, changed on the Room page. The host reads it
// through `get` at every instructor hello, so a change applies at once. It never goes into an address, a QR code, the
// tab's sessionStorage (position.ts, the items host-guard.ts hands to another tab) or the record: nothing here writes
// anywhere else.
// Plan learner-action-remote.md L4 (§4 D9, LQ1 ruled 9 November): the LEARNER PIN is kept the same way, under
// `pme.learnerPin`, drawn once and changed on request (Room setup's "New learner PIN", L6); it is never the instructor's PIN,
// and the instructor's PIN is never drawn equal to it, so neither ever opens the other's role (the host refuses both
// while they are equal: host-session.ts LEARNER_REASONS.samePins).
import { PIN_RE } from '@pme/controller';
import { store } from './store.ts';

/** The store's key (store.ts prefixes `pme.`). */
export const PIN_KEY = 'instructorPin';
/** L4: the learner PIN's key in the same store. */
export const LEARNER_PIN_KEY = 'learnerPin';

export interface PinStore {
  get(): string | null;
  set(v: string): void;
}

export interface InstructorPin {
  /** The PIN, drawn and kept at first use (held in memory too, for a store that cannot keep it). */
  get(): string;
  /** Draw a new PIN, different from the current one, keep it, and tell the listeners (the host revokes the phone). */
  change(): string;
  onChange(fn: (pin: string) => void): () => void;
}

/** Four random digits from the platform's cryptographic source. */
export function drawPin(random: (n: number) => number = cryptoInt): string {
  return String(random(10_000)).padStart(4, '0');
}

function cryptoInt(n: number): number {
  const a = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / n) * n; // rejection sampling: no bias toward the low PINs
  do crypto.getRandomValues(a);
  while ((a[0] as number) >= limit);
  return (a[0] as number) % n;
}

const keyStore = (key: string): PinStore => ({ get: () => store.get(key), set: (v) => store.set(key, v) });

/** `avoid`: the other role's PIN, never drawn (L4: the instructor's and the learner PIN stay apart). */
export function instructorPin(s: PinStore = keyStore(PIN_KEY), random?: (n: number) => number, avoid: () => string | null = () => null): InstructorPin {
  const fns = new Set<(pin: string) => void>();
  const kept = s.get();
  const draw = (not: string | null) => {
    let next = drawPin(random);
    while (next === not || next === avoid()) next = drawPin(random);
    return next;
  };
  // In memory too: a private window whose store throws still has one PIN for this page's life
  let pin = kept !== null && PIN_RE.test(kept) && kept !== avoid() ? kept : draw(null);
  if (pin !== kept) s.set(pin);
  return {
    get: () => pin,
    change() {
      const next = draw(pin);
      pin = next;
      s.set(pin);
      for (const fn of [...fns]) fn(pin);
      return pin;
    },
    onChange(fn) {
      fns.add(fn);
      return () => void fns.delete(fn);
    },
  };
}

/**
 * L4: the learner PIN — the same keeping as the instructor's (four digits drawn at first use [ENG: ui; P7's PIN rule], a
 * new one on request, the listeners told so the host revokes every learner remote), never equal to `instructor()`.
 */
export function learnerPin(instructor: () => string | null, s: PinStore = keyStore(LEARNER_PIN_KEY), random?: (n: number) => number): InstructorPin {
  return instructorPin(s, random, instructor);
}
