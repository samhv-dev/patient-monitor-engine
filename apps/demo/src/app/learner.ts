// Learner controls (orchestrator ruling 4 on the R50 review; brief Q12): the Stage 6b "Learner:" bar as a strip under
// the learner's monitor. OFF by default; the instructor switches it on for the running scenario (Scenario tab), or a
// scenario's card meta does (`learnerControls`); loading another scenario or restarting the patient switches it off.
// Each button is what the team at the bedside does (charge, shock, CPR, a drug); it goes through the same link as the
// instructor's commands and is logged as a learner action. The actions are the 6b runner's own list (imported).
import { LEARNER_ACTIONS, type LearnerAction } from '../stage6b/actions.ts';
import { describeCommand } from './describe.ts';
import { drugWords } from './glossary.ts';
import type { Link } from './link.ts';
import { button, h, toast } from './ui.ts';

/** A learner button's label in the site's drug names ("Epinephrine 1 mg" or "Adrenaline 1 mg"). */
export const learnerLabel = (a: LearnerAction): string => drugWords(a.label);

export function learnerStrip(link: Link): HTMLElement {
  const el = h('div', { class: 'learner-strip', role: 'toolbar', 'aria-label': 'Learner controls' });
  for (const a of LEARNER_ACTIONS) {
    let on = false; // CPR is a toggle
    const b = button(learnerLabel(a), async () => {
      const cmd = { type: 'applyEvent', event: a.off && on ? a.off : a.event };
      const r = await link.send(cmd as never, 'learner');
      if (r.accepted && a.off) {
        on = !on;
        b.textContent = on ? 'Stop CPR' : learnerLabel(a);
      }
      toast(r.accepted ? describeCommand(cmd) : 'Not done (see the log)');
    }, 'small');
    el.append(b);
  }
  return el;
}
