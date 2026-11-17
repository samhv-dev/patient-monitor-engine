// The host's book of signed-in devices: a device admitted on a PIN is handed a one-time ticket, and the next time it says
// hello (a new socket, or this page reloaded) it proves the ticket instead of the PIN and is handed the next one. The book
// keeps, per device, a chain: the SHA-256 of its current ticket and of the one before, its role and device key, and the
// peer id it was last admitted under; never a ticket in clear, never anything derived from a PIN. A ticket starts with the
// book's own id, so a ticket of another book (another session, or a host that lost its book) is told apart from a
// forged or spent one. The clear current ticket of each chain is held in this page's memory only, to answer a holder that
// says its hello again before its grant arrived.
import type { Role } from '../protocol.ts';

export type TicketRole = Extract<Role, 'instructor' | 'ventilator' | 'learner' | 'pump'>;

export interface Chain {
  id: string;
  /** SHA-256 (hex) of the current ticket. */
  h: string;
  /** SHA-256 (hex) of the ticket it replaced: said again by the holder its grant did not reach, or by a copy. */
  prev: string | null;
  role: TicketRole;
  device: string | null;
  /** The peer id it was last admitted under; null once that socket left (no one may then say the replaced ticket). */
  from: string | null;
  /** Why it no longer admits (the host's reason, said to whoever proves it). */
  void?: string;
}

/** Where the book is kept across the host page's reload (the app: the tab's sessionStorage). */
export interface BookKeep {
  read(): string | null;
  write(s: string): void;
}

interface Kept {
  schema: 'pme-sign-ins/1';
  session: string;
  id: string;
  chains: Chain[];
}

/** The most chains a book keeps; the oldest go first [ENG: network; four times the relay's 60 peers and 2 instructor places]. */
export const CHAINS_MAX = 248;

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = (n: number) => b64url(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');

export type Found = { chain: Chain; current: boolean } | 'other-book' | null;

export class SignInBook {
  readonly id: string;
  private chains: Chain[];
  private readonly clear = new Map<string, string>();
  private readonly session: string;
  private readonly keep: BookKeep | undefined;

  constructor(session: string, keep?: BookKeep) {
    this.session = session;
    this.keep = keep;
    const k = SignInBook.read(session, keep);
    this.id = k?.id ?? random(6);
    this.chains = k?.chains ?? [];
    if (!k) this.save();
  }

  private static read(session: string, keep?: BookKeep): Kept | null {
    try {
      const k = JSON.parse(keep?.read() ?? 'null') as Kept | null;
      return k?.schema === 'pme-sign-ins/1' && k.session === session && typeof k.id === 'string' && Array.isArray(k.chains) ? k : null;
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      this.keep?.write(JSON.stringify({ schema: 'pme-sign-ins/1', session: this.session, id: this.id, chains: this.chains } satisfies Kept));
    } catch {
      // a store that cannot keep it: the book lives as long as this page, and a reload asks for the PIN again
    }
  }

  /** The chain `ticket` names: its current ticket, or the one it replaced. */
  async find(ticket: string): Promise<Found> {
    if (!ticket.startsWith(`${this.id}.`)) return 'other-book';
    const h = await sha256(ticket);
    const chain = this.chains.find((c) => c.h === h || c.prev === h);
    return chain ? { chain, current: chain.h === h } : null;
  }

  /** A new ticket for `chain` (a new chain when absent), admitted under `from`; the one it replaces is kept as `prev`. */
  async issue(role: TicketRole, device: string | null, from: string, chain?: string): Promise<{ chain: string; ticket: string }> {
    const ticket = `${this.id}.${random(16)}`;
    const h = await sha256(ticket);
    const old = chain !== undefined ? this.chains.find((c) => c.id === chain) : undefined;
    const id = old?.id ?? random(9);
    this.chains = [...this.chains.filter((c) => c !== old), { id, h, prev: old?.h ?? null, role, device, from }].slice(-CHAINS_MAX);
    this.clear.set(id, ticket);
    for (const k of this.clear.keys()) if (!this.chains.some((c) => c.id === k)) this.clear.delete(k);
    this.save();
    return { chain: id, ticket };
  }

  /** The current ticket of `chain` in clear, when this page issued it. */
  current(chain: string): string | undefined {
    return this.clear.get(chain);
  }

  /** The chains that admit no more, each with the reason its holder is told. */
  void(match: (c: Chain) => boolean, reason: string): void {
    let n = 0;
    for (const c of this.chains) if (!c.void && match(c)) (c.void = reason), (c.from = null), this.clear.delete(c.id), n++;
    if (n) this.save();
  }

  /** The socket under `from` left: the ticket its chain replaced can no longer be said by anyone. */
  left(from: string): void {
    let n = 0;
    for (const c of this.chains) if (c.from === from) (c.from = null), n++;
    if (n) this.save();
  }
}
