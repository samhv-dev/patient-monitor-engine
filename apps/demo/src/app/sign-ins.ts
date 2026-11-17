// The host's book of signed-in devices (@pme/controller sign-in-book.ts), kept in this tab's sessionStorage under the
// session code, as the running case's position is (position.ts): a reload of this page, or the hand-over to another tab
// (host-guard.ts), keeps the phones and tablets signed in; another session, or a closed tab, starts an empty book. The
// book holds hashes of tickets, never a ticket in clear and nothing derived from a PIN.
import { SignInBook } from '@pme/controller';

export const SIGN_INS_KEY = 'pme.signIns';

/** The book for `code`; none on a page that is not a secure context (no SHA-256 there): every sign-in is then on a PIN. */
export function signInBook(code: string): SignInBook | undefined {
  if (!globalThis.crypto?.subtle) return undefined;
  return new SignInBook(code, { read: () => sessionStorage.getItem(SIGN_INS_KEY), write: (s) => sessionStorage.setItem(SIGN_INS_KEY, s) });
}
