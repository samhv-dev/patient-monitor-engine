// P7's PIN form (plan instructor-peer-role.md P7), on its own so the instructor's phone (views/remote.ts) and the
// ventilator's own page (R8d, src/vent/hamilton-page.ts) sign in with the same form: the room code, a PIN field with a
// numeric keypad, and the words of each state. The PIN is held in the page's memory only (Q3): the form has no name for
// it and never submits, so it is never in the address or the history; the field is emptied at sign-in and whenever the
// page is left (another route, the tab hidden or closed).
import { INSTRUCTOR_REASONS, normalizeSessionCode, PIN_RE, type InstructorAccess } from '@pme/controller';
import { button, h, input, setText } from '../ui.ts';

/** The words of each state the instructor's phone can be in (plan P7). `at`: the case clock, mm:ss. */
export const PHONE_WORDS = {
  signingIn: "Signing in: waiting for the instructor's computer…",
  signedIn: (code: string) => `Signed in as the instructor's remote · ${code}`,
  signingInAgain: "Signing in again: waiting for the instructor's computer…",
  wrongPin: "Wrong PIN. Enter the PIN the instructor's computer shows on its Room page.",
  tooManyTries: 'Too many wrong PINs from this phone. Wait a minute, then enter the PIN again.',
  takenOver: (at: string) => `Taken over by another phone at ${at}. Enter the PIN to sign in again.`,
  pinChanged: "The PIN was changed on the instructor's computer. Enter the new PIN.",
  noPhone: "The instructor's computer does not take an instructor phone.",
  restarted: (at: string) => `The instructor's computer restarted at ${at}: presses still waiting for an answer were not given.`,
  kitTooOld: 'This classroom kit does not take an instructor phone. Use the kit from the same release as the app.',
  noHost: "The instructor's computer is not in this session: check the code, and that the app is open on the laptop.",
  unreachable: "This phone cannot reach the instructor's computer: check that it is on the same Wi-Fi, then try again.",
  badCode: 'Error: the code has 6 letters and digits, as shown on the Room page.',
  badPin: 'The PIN has 4 to 8 digits.',
} as const;

/** What the phone says for a refusal (`denied` or `revoked`): the host's or the relay's reason, in the page's words. */
export function refusalWords(a: Pick<InstructorAccess, 'reason' | 'code'>, at: string): string {
  if (a.code === 'too-many-tries') return PHONE_WORDS.tooManyTries;
  if (a.reason === INSTRUCTOR_REASONS.wrongPin) return PHONE_WORDS.wrongPin;
  if (a.reason === INSTRUCTOR_REASONS.takenOver) return PHONE_WORDS.takenOver(at);
  if (a.reason === INSTRUCTOR_REASONS.pinChanged) return PHONE_WORDS.pinChanged;
  if (a.reason === INSTRUCTOR_REASONS.noPhone) return PHONE_WORDS.noPhone;
  return `Not signed in: ${a.reason ?? "the instructor's computer refused the phone"}.`;
}

export interface PinForm {
  form: HTMLFormElement;
  codeIn: { el: HTMLElement; inp: HTMLInputElement };
  pinIn: { el: HTMLElement; inp: HTMLInputElement };
  err: HTMLElement;
  /** Empty the PIN field. */
  clear(): void;
}

/**
 * The form: `onSignIn` gets the code and the PIN once both are well formed; the PIN goes from the field into the caller's
 * closure and the field is emptied first.
 */
export function pinForm(o: { title: string; lede: string; code: string; onSignIn(code: string, pin: string): void }): PinForm {
  const codeIn = input('Session code', { maxlength: 8, autocapitalize: 'characters', autocomplete: 'off', inputmode: 'text', placeholder: 'For example AGD5YJ', class: 'input ip-peer-code' });
  codeIn.inp.value = o.code;
  // No `name`: the form never submits, and a browser that did submit it could not put the PIN in the address
  const pinIn = input('PIN', { type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: 8, autocomplete: 'off', enterkeyhint: 'go', class: 'input ip-peer-pin' });
  const err = h('p', { class: 'error ip-peer-error', role: 'alert' });
  const type = (d: string) => {
    if (pinIn.inp.value.length < 8) pinIn.inp.value += d;
  };
  const keys = h('div', { class: 'ip-peer-keypad', role: 'group', 'aria-label': 'Keypad' },
    ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => button(d, () => type(d), 'ip-peer-key')),
    button('⌫', () => void (pinIn.inp.value = pinIn.inp.value.slice(0, -1)), 'ip-peer-key ip-peer-del', { 'aria-label': 'Delete the last digit' }),
    button('0', () => type('0'), 'ip-peer-key'),
    h('button', { type: 'submit', class: 'btn primary ip-peer-key ip-peer-go' }, 'Sign in'));
  const submit = () => {
    const code = normalizeSessionCode(codeIn.inp.value);
    const pin = pinIn.inp.value;
    pinIn.inp.value = ''; // the PIN is in the caller's closure from here on, nowhere else
    if (!code) return void (setText(err, PHONE_WORDS.badCode), codeIn.inp.focus());
    if (!PIN_RE.test(pin)) return void (setText(err, PHONE_WORDS.badPin), pinIn.inp.focus());
    o.onSignIn(code, pin);
  };
  const form = h('form', { class: 'setup narrow ip-peer-form', autocomplete: 'off', onsubmit: (e: Event) => (e.preventDefault(), submit()) },
    h('h1', {}, o.title), h('p', { class: 'lede' }, o.lede), codeIn.el, pinIn.el, err, keys);
  // The field is emptied whenever the page is left (another route, the tab hidden or closed)
  const clear = () => void (pinIn.inp.value = '');
  addEventListener('pagehide', clear);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && clear());
  return { form, codeIn, pinIn, err, clear };
}
