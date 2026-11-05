// The instructor's "Recognised" press (Debrief 2, D5; plan Decision 3, the owner's ruling of 5 November, DQ4): the /1
// fallback for the moment the team named the problem. On a /1 card with a recognition objective it sends exactly the
// Scenario tab's tick of that objective (panel/scenario.ts), so the Debrief reads one tick however it was made; on any
// other /1 card, or a free run, one note with the run event 'recognised' (record.ts). A pme-scenario/2 card has no
// press: its recognition is the card's timed action (`recognition: true`), pressed in Instructor v2 and graded. The
// session bar and the Instructor v2 dock carry the button; it has no keyboard key (the FX-18 typing guard).
import { asV1, isV2, type AnyScenarioDoc } from '@pme/controller';
import { drugWords } from './glossary.ts';
import type { Link } from './link.ts';
import { objectiveText } from './scenarios.ts';
import { clock, h, toast } from './ui.ts';

/** The note a press sends on `doc` (null: a free run), or null on a /2 card (no press there). */
export function recognisedNote(doc: AnyScenarioDoc | null): { text: string; ev?: 'recognised' } | null {
  if (doc && isV2(doc)) return null;
  const o = (asV1(doc)?.objectives ?? []).find((x) => typeof x !== 'string' && x.debrief === 'recognition');
  return o ? { text: `Objective met: ${drugWords(objectiveText(o))}` } : { text: 'Recognised (instructor)', ev: 'recognised' };
}

/** The button (`cls` its classes where it sits): hidden on a /2 card (`refresh` reads the card loaded now). */
export function recognisedButton(link: Link, cls: string): { el: HTMLButtonElement; refresh(): void } {
  const el = h('button', {
    type: 'button', class: cls, title: 'The team named the problem: records the moment for the debrief',
    onclick: () => {
      const n = recognisedNote(link.ctl.scenario.doc);
      if (!n) return;
      link.note(n.text, 'marker', n.ev);
      toast(`Recognised at ${clock(link.simT)}`);
    },
  }, 'Recognised') as HTMLButtonElement;
  const refresh = () => void (el.hidden = recognisedNote(link.ctl.scenario.doc) === null);
  refresh();
  return { el, refresh };
}
