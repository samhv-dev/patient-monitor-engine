// What a signing-in device proves in its hello: the PIN typed into its form until the host hands it a ticket
// (sign-in-book.ts), then that ticket alone. Both live in this object only, in the page's memory; the PIN is let go at the
// first ticket, so a device that was admitted holds no PIN from then on.
import type { WireMessage } from '../protocol.ts';

export class SignInCredential {
  #pin: string | null;
  #ticket: string | null = null;

  constructor(pin: string) {
    this.#pin = pin;
  }

  /** The hello's proof. */
  proof(): { pin: string } | { ticket: string } {
    return this.#ticket !== null ? { ticket: this.#ticket } : { pin: this.#pin as string };
  }

  /** A grant this device received: keep the ticket it hands on, and forget the PIN. */
  take(m: WireMessage): void {
    if (m.kind !== 'grant' || !m.granted || m.ticket === undefined) return;
    this.#ticket = m.ticket;
    this.#pin = null;
  }
}
