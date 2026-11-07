// The instructor phone's PIN (plan instructor-peer-role.md §1, Q2): kept on the laptop only, in the app's store
// (localStorage `pme.instructorPin`), four random digits drawn at first use, changed on the Room page. The host reads it
// through `get` at every instructor hello, so a change applies at once. It never goes into an address, a QR code, the
// tab's sessionStorage (position.ts, the items host-guard.ts hands to another tab) or the record: nothing here writes
// anywhere else.
import { PIN_RE } from '@pme/controller';
import { store } from './store.ts';

/** The store's key (store.ts prefixes `pme.`). */
export const PIN_KEY = 'instructorPin';

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

export function instructorPin(s: PinStore = { get: () => store.get(PIN_KEY), set: (v) => store.set(PIN_KEY, v) }, random?: (n: number) => number): InstructorPin {
  const fns = new Set<(pin: string) => void>();
  const kept = s.get();
  // In memory too: a private window whose store throws still has one PIN for this page's life
  let pin = kept !== null && PIN_RE.test(kept) ? kept : drawPin(random);
  if (pin !== kept) s.set(pin);
  return {
    get: () => pin,
    change() {
      let next = drawPin(random);
      while (next === pin) next = drawPin(random);
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
