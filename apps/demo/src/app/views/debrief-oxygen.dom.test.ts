// @vitest-environment happy-dom
// E121b: oxygen given from the Instructor panel is a line of the Debrief's timeline in clinical words, with its device,
// flow and FiO₂ ("Oxygen by face mask 10 L/min (FiO₂ 60 %)"), and so is taking it off.
import type { WireEvent } from '@pme/controller';
import { afterEach, describe, expect, it } from 'vitest';
import type { AppSession } from '../session.ts';
import type { Link } from '../link.ts';
import { oxygen } from '../oxygen.ts';
import { RunRecord } from '../record.ts';
import { debriefView } from './debrief.ts';

const applied = (tick: number, command: Record<string, unknown>): WireEvent =>
  ({ type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, issuedBy: 'instructor', ...command } } }) as WireEvent;

describe('Debrief: the oxygen line (E121b)', () => {
  let leave: (() => void) | undefined;
  afterEach(() => (leave?.(), document.body.replaceChildren()));

  it('prints "Oxygen by face mask 10 L/min (FiO₂ 60 %)" and the room air after it in the timeline', () => {
    const record = new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 }), () => 1_000);
    record.wire(applied(3000, oxygen('mask', 10))); // 01:00
    record.wire(applied(9000, oxygen('none', 0))); // 03:00
    const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
    const view = debriefView({ record } as unknown as AppSession, link);
    document.body.append(view.el);
    view.enter?.('');
    leave = view.leave;
    const rows = [...view.el.querySelectorAll('.db-timeline tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent));
    expect(rows).toContainEqual(['01:00', expect.any(String), 'Oxygen by face mask 10 L/min (FiO₂ 60 %)']);
    expect(rows).toContainEqual(['03:00', expect.any(String), 'Oxygen off: room air (FiO₂ 21 %)']);
  });
});
