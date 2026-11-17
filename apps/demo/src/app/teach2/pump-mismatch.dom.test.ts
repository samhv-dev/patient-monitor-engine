// @vitest-environment happy-dom
// Plan pump-rack-tci.md §8 (PQ8 = A, the owner's ruling, as LQ3) and A2's e2e: a channel whose syringe (or bag) and
// programme differ is the instructor's finding at once, as a card on the laptop's dock, with ONE control, "Show the
// mismatch notice to the learner". The card names the channel, the tablet as Room setup named it, and what is loaded
// against what is programmed; nothing on it changes the channel (D10, PQ9 = A). Once shown, it says when.
import type { PumpMismatchNews } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { disturbed, liveWrites } from '../keep.testing.ts';
import { mountPumpMismatch, MISMATCH_CARD_WORDS } from './pump-mismatch.ts';

const finding = (o: Partial<PumpMismatchNews> = {}): PumpMismatchNews => ({
  news: 'pumpMismatch', ch: 2, kind: 'syringe', device: 'pumptab0001', sender: { role: 'pump', name: 'bed 2 pumps' }, since: 300, notice: null,
  contents: { drugId: 'remifentanil', concentration: { amount: 48, unit: 'mcg', perMl: 1 } }, label: { amount: 50, unit: 'mcg', perMl: 1 }, origin: { stock: 'x' },
  programmed: { drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } },
  text: 'remifentanil 50 mcg/mL programmed as propofol 10 mg/mL', ...o,
});

function stub() {
  const fns = new Set<() => void>();
  const shown: number[] = [];
  const link = {
    pumpFindings: new Map<number, PumpMismatchNews>(),
    onChange: (fn: () => void) => (fns.add(fn), () => void fns.delete(fn)),
    host: { host: { showPumpNotice: (ch: number) => (shown.push(ch), true) } },
  };
  const changed = () => [...fns].forEach((fn) => fn());
  return { link, shown, changed };
}

describe("the instructor's pump-mismatch card (§8, PQ8 = A)", () => {
  it('hidden with no finding; a finding shows the channel, the tablet, what is loaded against the programme, and one control', () => {
    const s = stub();
    const card = mountPumpMismatch(s.link as never);
    expect(card.el.hidden).toBe(true);
    s.link.pumpFindings.set(2, finding());
    s.changed();
    expect(card.el.hidden).toBe(false);
    const li = card.el.querySelector('.ip2-pm-card') as HTMLElement;
    expect(li.querySelector('.ip2-pm-what')?.textContent).toBe('Channel 2 (bed 2 pumps): syringe and programme differ. Loaded: Remifentanil 50 µg/mL; programmed: Propofol 10 mg/mL.');
    const buttons = li.querySelectorAll('button');
    expect([...buttons].map((b) => b.textContent)).toEqual([MISMATCH_CARD_WORDS.show]);
    (buttons[0] as HTMLButtonElement).click();
    expect(s.shown).toEqual([2]);
    s.link.pumpFindings.set(2, finding({ notice: { shownAt: 330 } }));
    s.changed();
    expect(card.el.querySelector('.ip2-pm-card button')).toBeNull();
    expect(card.el.querySelector('.ip2-pm-shown')?.textContent).toBe('Notice shown at 05:30');
    s.link.pumpFindings.clear();
    s.changed();
    expect(card.el.hidden).toBe(true);
    card.destroy();
  });

  it('a bag on a drip channel, and a tablet with no Room-setup name: its number, never its key', () => {
    const s = stub();
    const card = mountPumpMismatch(s.link as never);
    s.link.pumpFindings.set(3, finding({ ch: 3, kind: 'drip', device: 'unnamed0001', sender: { role: 'pump', name: 'Pump tablet 2' } }));
    s.changed();
    expect(card.el.querySelector('.ip2-pm-what')?.textContent).toMatch(/^Channel 3 \(Pump tablet 2\): bag and programme differ\. /);
  });

  it('the device that made the mismatch by its true role: a learner remote is never called a pump tablet; the instructor\'s own change says so', () => {
    const s = stub();
    const card = mountPumpMismatch(s.link as never);
    s.link.pumpFindings.set(1, finding({ ch: 1, device: 'phoneaaaa001', sender: { role: 'learner', name: 'Learner remote 2' } }));
    const { sender: _none, ...laptop } = finding({ ch: 4, device: 'laptop' }); // the Drug sheet's change routed to the channel
    s.link.pumpFindings.set(4, laptop);
    s.changed();
    expect([...card.el.querySelectorAll('.ip2-pm-what')].map((p) => p.textContent?.split(':')[0])).toEqual(['Channel 1 (Learner remote 2)', "Channel 4 (instructor's computer)"]);
  });

  it('a change to one channel\'s finding leaves the other cards as they are: their Show button and their shown line', async () => {
    const s = stub();
    const card = mountPumpMismatch(s.link as never);
    document.body.append(card.el);
    s.link.pumpFindings.set(1, finding({ ch: 1 }));
    s.link.pumpFindings.set(2, finding({ ch: 2, notice: { shownAt: 320 } }));
    s.link.pumpFindings.set(3, finding({ ch: 3 }));
    s.changed();
    const show = card.el.querySelector('.ip2-pm-card[data-ch="1"] .ip2-pm-show')!;
    const shown = card.el.querySelector('.ip2-pm-card[data-ch="2"] .ip2-pm-shown')!;
    const change = async () => {
      s.link.pumpFindings.set(3, finding({ ch: 3, since: 400 }));
      expect(await disturbed([show], s.changed)).toEqual([]);
    };
    expect(await liveWrites([shown], change)).toEqual([0]);
    card.el.remove();
  });
});
