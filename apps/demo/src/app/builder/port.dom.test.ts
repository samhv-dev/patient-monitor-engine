// @vitest-environment happy-dom
// The builder's port-check line (docs/plans/scenario-builder.md §7.1, §7.3; piece B7): a /1 library card is offered for
// conversion; the draft it opens as keeps the original's id and format in its metadata (not in the card); each of the
// converter's flags shows at the field it concerns, in the refusal style, and is listed in the checks column without
// counting as a refusal; and the checks column says the port check's last result in words, read from ports.json (a card
// with no row: no port yet), never computed in the page.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ScenarioDoc } from '@pme/controller/scenario';
import { asFactory, MemoryIDB } from '../memory-idb.ts';
import { MemoryStorage } from '../memory-storage.ts';
import { LIBRARY } from '../scenarios.ts';
import { CHECK_DELAY_MS } from './checks.ts';
import { convertV1 } from './convert.ts';
import { Drafts } from './drafts.ts';
import { builderPage, SAVE_DELAY_MS } from './page.ts';
import { flagLine, portCheckLine, type PortCheckRow } from './port.ts';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const settled = () => wait(Math.max(CHECK_DELAY_MS, SAVE_DELAY_MS) + 60);

describe('the port check’s words (pure)', () => {
  const rows: PortCheckRow[] = [{ card: 'nmb-sux-burn', result: 'Port check: command stream identical; trace identical; 0 beats changed by design' }];
  it('a card with a row: the row’s last result, as CI wrote it', () => {
    expect(portCheckLine(['nmb-sux-burn-copy', 'nmb-sux-burn'], rows)).toBe('Port check: command stream identical; trace identical; 0 beats changed by design');
  });
  it('a converted card with no row: no port yet', () => {
    expect(portCheckLine(['depth-awareness'], rows)).toBe('Port check: no port of this card in ports.json yet, so no twin run has been read');
  });
  it('a flag in words: its place, what the beat was, what a port must decide', () => {
    const f = convertV1(LIBRARY.find((c) => c.id === 'depth-awareness')!.doc as ScenarioDoc).flags.find((x) => x.kind === 'afterS')!;
    expect(flagLine(f)).toBe(`${f.at}: ${f.was}. A port must ${f.decide}.`);
  });
});

describe('a /1 card in the builder', () => {
  let b: { idb: MemoryIDB; ls: MemoryStorage };
  const store = () => new Drafts(() => b.ls, () => asFactory(b.idb));
  beforeEach(() => {
    b = { idb: new MemoryIDB(), ls: new MemoryStorage() };
  });
  afterEach(() => {
    document.body.replaceChildren();
    location.hash = '';
  });

  it('is offered for conversion; the draft opens with each flag at its field and the port-check line', async () => {
    const s = store();
    const p = builderPage(s);
    document.body.append(p.el);
    await p.enter('');
    const offers = [...p.el.querySelectorAll<HTMLButtonElement>('.sb-convert button')].map((x) => x.getAttribute('aria-label'));
    expect(offers.length).toBe(16);
    expect(offers).toContain('Convert Unexpected awareness: TIVA line disconnected to a pme-scenario/2 draft');
    const item = [...p.el.querySelectorAll('.sb-convert .scen-item')].find((x) => x.textContent?.includes('depth-awareness'))!;
    expect(item.textContent).toContain('2 places flagged for a port to decide');
    item.querySelector('button')!.click();
    for (let i = 0; i < 20 && !location.hash.startsWith('#/scenarios/builder/'); i++) await wait(5);
    const id = location.hash.split('/').at(-1)!;
    expect(s.get(id)).toMatchObject({ cardId: 'depth-awareness-copy', from: 'converted from the pme-scenario/1 library card depth-awareness', origin: { id: 'depth-awareness', schema: 'pme-scenario/1' } });
    await p.enter(id);
    await settled();
    const flags = convertV1(LIBRARY.find((c) => c.id === 'depth-awareness')!.doc as ScenarioDoc).flags;
    // the checks column: the validator's refusal (the flagged phase has no rule), then the converter's flags, uncounted
    const items = [...p.el.querySelectorAll('.sb-checks li')].map((x) => x.textContent ?? '');
    expect(items[0]).toMatch(/^The validator refuses this draft: 1 refusal/);
    expect(items).toContain(`The converter flagged ${flags.length} places of the pme-scenario/1 card: each is shown at its field. A port decides each (a sourced truth rule the owner signs, or an instructor-pressed event); none is a refusal.`);
    for (const f of flags) expect(items.some((t) => t.startsWith(`The converter: ${flagLine(f)}`)), flagLine(f)).toBe(true);
    expect(items).toContain('Port check: no port of this card in ports.json yet, so no twin run has been read');
    // in place, at its field: the timer's flag on the phase's rule, in the refusal style
    const shown = [...p.el.querySelectorAll('.sb-pane .sb-refuse, .sb-root .sb-refuse')].map((x) => x.textContent ?? '');
    const afterS = flags.find((f) => f.kind === 'afterS')!;
    expect(shown.some((t) => t === `The converter flags: ${flagLine(afterS)}`), shown.join('\n')).toBe(false); // not on the Header pane
    const phases = [...p.el.querySelectorAll<HTMLButtonElement>('.sb-out')].find((x) => x.textContent?.startsWith('Phases'))!;
    phases.click();
    const inPhases = [...p.el.querySelectorAll('.sb-pane .sb-refuse')].map((x) => x.textContent ?? '');
    expect(inPhases).toContain(`The converter flags: ${flagLine(afterS)}`);
  });
});
