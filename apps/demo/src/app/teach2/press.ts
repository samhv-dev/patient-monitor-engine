// Instructor v2 (E127): the two presses of the ACTION list, sending exactly what today's Scenario tab sends. A step is
// today's state button (panel/scenario.ts `press`: the label resolved against the CURRENT state, the same toast when
// the case has moved, the same instructor note); a judged objective is today's objectives checkbox ticked (the same
// marker note, which the debrief reads as the instructor's tick).
import { drugWords } from '../glossary.ts';
import { describeCommand } from '../describe.ts';
import { toast } from '../ui.ts';
import { stepCommand } from '../card-read.ts';
import type { Link } from '../link.ts';
import type { CommandInput } from '@pme/controller';
import type { Action } from '@pme/controller/scenario';

/**
 * A pme-scenario/2 A press (plan F6, design §10): the action's prescription as written (its `give`), sent at once as ONE
 * staged batch (one engine instant, one log line; never the cache, Q24), every command stamped with the action's id so
 * the host's driver counts the taking and fires the script entries anchored on it in the same stage group. It moves no
 * phase: the physiology does.
 */
export async function pressAction(link: Link, action: Action): Promise<void> {
  const cmds = (action.give ?? []).map((c) => {
    const { $comment: _drop, ...cmd } = c as typeof c & { $comment?: string };
    return { ...cmd, actionId: action.id } as unknown as CommandInput;
  });
  if (!cmds.length) return void toast(`${action.label}: nothing to give from this row; use a sheet.`);
  await link.sendBatch(cmds);
}

/** Press the step labelled `label`: a copy of panel/scenario.ts `press`. */
export async function pressStep(link: Link, label: string): Promise<void> {
  const sv = link.ctl.scenario;
  const moved = () => toast(`Not available now: ${sv.doc ? `the case has moved to ${sv.current()?.label ?? 'the next state'}` : 'no scenario is running'}.`);
  const cmd = stepCommand(sv.current(), label);
  if (!cmd) return moved();
  const r = await link.ctl.send(cmd); // not link.send: that logs a refused command too
  if (r.accepted) link.note(describeCommand(cmd as Record<string, unknown>), 'instructor');
  else moved();
}

/** Record the judged objective `text` (its words as the card writes them) as met: the Scenario tab's checkbox note. */
export function judge(link: Link, text: string): void {
  link.note(`Objective met: ${drugWords(text)}`, 'marker');
}
