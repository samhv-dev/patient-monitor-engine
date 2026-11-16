// The host's book of signed-in devices: what it keeps across the host page's reload, and what it never keeps.
import { describe, expect, it } from 'vitest';
import { CHAINS_MAX, SignInBook, type BookKeep } from '../../src/session/sign-in-book.ts';
import { TICKET_RE } from '../../src/guard.ts';

const S = 'RMW234';
const memory = (): BookKeep & { v: string | null } => {
  const k = { v: null as string | null, read: () => k.v, write: (s: string) => void (k.v = s) };
  return k;
};

describe('SignInBook', () => {
  it('hands on a well-formed ticket and keeps only its hash; a second book on the same keep finds it (the reload)', async () => {
    const keep = memory();
    const a = new SignInBook(S, keep);
    const { chain, ticket } = await a.issue('learner', 'remote0001', 'lr.1');
    expect(ticket).toMatch(TICKET_RE);
    expect(ticket.startsWith(`${a.id}.`)).toBe(true);
    expect(keep.v).not.toContain(ticket.split('.')[1]);
    const b = new SignInBook(S, keep);
    expect(b.id).toBe(a.id);
    const f = await b.find(ticket);
    expect(f).toMatchObject({ current: true, chain: { id: chain, role: 'learner', device: 'remote0001', from: 'lr.1' } });
    expect(b.current(chain)).toBeUndefined(); // the clear ticket lived in the first page's memory only
  });

  it('a rotation keeps the replaced ticket as prev; an older one is not known', async () => {
    const b = new SignInBook(S);
    const t1 = await b.issue('pump', 'tablet0001', 'p.1');
    const t2 = await b.issue('pump', 'tablet0001', 'p.1', t1.chain);
    const t3 = await b.issue('pump', 'tablet0001', 'p.1', t1.chain);
    expect(t3.chain).toBe(t1.chain);
    expect(await b.find(t3.ticket)).toMatchObject({ current: true });
    expect(await b.find(t2.ticket)).toMatchObject({ current: false });
    expect(await b.find(t1.ticket)).toBeNull();
    expect(b.current(t1.chain)).toBe(t3.ticket);
  });

  it('another session code, or a keep that cannot be read, is a new book: its tickets are another book\'s', async () => {
    const keep = memory();
    const a = new SignInBook(S, keep);
    const { ticket } = await a.issue('instructor', null, 'ins.1');
    expect(await new SignInBook('XYZ789', keep).find(ticket)).toBe('other-book');
    const broken = { read: () => { throw new Error('blocked'); }, write: () => { throw new Error('blocked'); } };
    expect(await new SignInBook(S, broken).find(ticket)).toBe('other-book');
  });

  it('void and left change what a chain admits, and are kept', async () => {
    const keep = memory();
    const a = new SignInBook(S, keep);
    const x = await a.issue('learner', 'remote0001', 'lr.1');
    const y = await a.issue('pump', 'tablet0001', 'p.1');
    a.void((c) => c.role === 'learner', 'the learner PIN was changed');
    a.left('p.1');
    const b = new SignInBook(S, keep);
    expect(await b.find(x.ticket)).toMatchObject({ chain: { void: 'the learner PIN was changed', from: null } });
    expect(await b.find(y.ticket)).toMatchObject({ chain: { from: null } });
    expect((await b.find(y.ticket) as { chain: { void?: string } }).chain.void).toBeUndefined();
  });

  it(`keeps at most ${CHAINS_MAX} chains, the oldest going first`, async () => {
    const b = new SignInBook(S);
    const first = await b.issue('learner', 'remote0001', 'lr.0');
    for (let i = 1; i <= CHAINS_MAX; i++) await b.issue('learner', 'remote0001', `lr.${i}`);
    expect(await b.find(first.ticket)).toBeNull();
    expect(b.current(first.chain)).toBeUndefined();
  });
});
