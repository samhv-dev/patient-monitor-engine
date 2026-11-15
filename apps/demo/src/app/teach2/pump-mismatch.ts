// Plan pump-rack-tci.md §8 (PQ8 = A, the owner's ruling, as LQ3 for the learner preparations): a pump channel whose
// syringe or bag and programme differ is the instructor's finding at once — a card on the laptop's dock, beside the
// learner preparations' card (learner-preps.ts, whose layout rules it follows: a row of the dock, never laid over a
// sheet) — with ONE control, "Show the mismatch notice to the learner": the host records when (HostSession
// showPumpNotice, C2) and the pump tablet shows "syringe and programme differ" on that channel. The pump never warns by
// itself; nothing here changes the channel (D10, PQ9 = A). The Link keeps the host's findings (link.ts pumpFindings).
// The instructor phone's copy of the card and A3's Pumps sheet are later pieces; this is the laptop's.
import type { PumpMismatchNews } from '@pme/controller';
import { unitText } from '../drugs.ts';
import { drugName } from '../glossary.ts';
import type { Link } from '../link.ts';
import { clock, h, setText, toast } from '../ui.ts';
import './pump-mismatch.css';

/** The card's words (English chrome; keys, so a translation table can hold them: A4). */
export const MISMATCH_CARD_WORDS = {
  title: 'Pump mismatches',
  tablet: 'pump tablet',
  what: (ch: number, who: string, kind: PumpMismatchNews['kind'], loaded: string, programmed: string) =>
    `Channel ${ch} (${who}): ${kind === 'drip' ? 'bag' : 'syringe'} and programme differ. Loaded: ${loaded}; programmed: ${programmed}.`,
  show: 'Show the mismatch notice to the learner',
  shownAt: (t: number) => `Notice shown at ${clock(t)}`,
  notShown: 'Notice not shown: the channel no longer has a mismatch, or its notice was shown already',
};

const conc = (drugId: string, c: { amount: number; unit: string; perMl: number }): string => `${drugName(drugId)} ${+(c.amount / c.perMl).toPrecision(3)} ${unitText(c.unit)}/mL`;

export interface PumpMismatchCard {
  el: HTMLElement;
  refresh(): void;
  destroy(): void;
}

/** The card on the laptop's `link`; hidden while no channel has a standing mismatch. */
export function mountPumpMismatch(link: Pick<Link, 'pumpFindings' | 'onChange' | 'host'>): PumpMismatchCard {
  const list = h('ul', { class: 'ip2-pm-list' });
  const el = h('section', { class: 'ip2-pm', 'aria-label': MISMATCH_CARD_WORDS.title, hidden: true }, list);
  let drawn = '';
  const draw = () => {
    const all = [...(link.pumpFindings?.values() ?? [])] // a test's partial Link has none
      .sort((a, b) => a.ch - b.ch);
    const sig = JSON.stringify(all);
    if (sig === drawn) return; // a button under the pointer stays the same element
    drawn = sig;
    el.hidden = all.length === 0;
    list.replaceChildren(...all.map((f) => {
      const name = link.host?.deviceName(f.device) ?? null;
      const who = name ? `${MISMATCH_CARD_WORDS.tablet}: ${name}` : MISMATCH_CARD_WORDS.tablet;
      const what = MISMATCH_CARD_WORDS.what(f.ch, who, f.kind, conc(f.contents.drugId, f.label), conc(f.programmed.drugId, f.programmed.concentration));
      const control = f.notice
        ? h('p', { class: 'ip2-pm-shown', role: 'status' }, MISMATCH_CARD_WORDS.shownAt(f.notice.shownAt))
        : h('button', { type: 'button', class: 'ip2-pm-show', 'data-ch': String(f.ch), onclick: () => {
          if (!link.host?.host.showPumpNotice(f.ch)) toast(MISMATCH_CARD_WORDS.notShown, 'alert');
        } }, MISMATCH_CARD_WORDS.show);
      const li = h('li', { class: 'ip2-pm-card', 'data-ch': String(f.ch), 'data-kind': f.kind }, h('p', { class: 'ip2-pm-what' }), control);
      setText(li.querySelector('.ip2-pm-what') as HTMLElement, what);
      return li;
    }));
  };
  const off = link.onChange(draw);
  draw();
  return { el, refresh: draw, destroy: off };
}
