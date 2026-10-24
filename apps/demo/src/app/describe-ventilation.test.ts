// F29: the Debrief timeline (and the log) printed "PEEP undefined cmH₂O" for a bag-mask ventilation event that carries no
// PEEP (the healthy-induction card's "Bag-mask ventilate, FiO₂ 1.0"). The words follow what the engine applies
// (l2/resp/pipeline.ts applyEvent 'ventilation'): bag-mask ventilation has no PEEP valve in the model, so its PEEP is
// always 0, whatever the event says; a ventilator event without a PEEP keeps the ventilator's previous PEEP, which the
// event does not know, so the text leaves PEEP out.
import { describe, expect, it } from 'vitest';
import { describeCommand } from './describe.ts';

const vent = (event: Record<string, unknown>) => describeCommand({ type: 'applyEvent', event: { kind: 'ventilation', ...event } });

describe('ventilation events in clinical words (F29)', () => {
  it('a bag-mask event without a PEEP prints the PEEP the engine applies, 0', () => {
    expect(vent({ source: 'bvm', rr: 12, vtMl: 500, fio2: 1 })).toBe('Bag-mask: RR 12 /min, VT 500 mL, PEEP 0 cmH₂O, FiO₂ 100 %');
  });

  it('a bag-mask event that names a PEEP still prints 0: the model has no PEEP valve on the bag', () => {
    expect(vent({ source: 'bvm', rr: 10, vtMl: 500, peep: 5, fio2: 1 })).toBe('Bag-mask: RR 10 /min, VT 500 mL, PEEP 0 cmH₂O, FiO₂ 100 %');
  });

  it('a ventilator event without a PEEP leaves PEEP out (the ventilator keeps its previous one)', () => {
    expect(vent({ source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5 })).toBe('Ventilator: RR 12 /min, VT 500 mL, FiO₂ 50 %');
  });

  it('a ventilator event with a PEEP prints it as before', () => {
    expect(vent({ source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 })).toBe('Ventilator: RR 12 /min, VT 500 mL, PEEP 5 cmH₂O, FiO₂ 50 %');
  });

  it('no ventilation event of the showcase cards prints "undefined"', async () => {
    const { LIBRARY } = await import('./scenarios.ts');
    for (const c of LIBRARY)
      for (const s of c.doc.states)
        for (const cmd of s.onEnter ?? [])
          if (cmd.type === 'applyEvent' && cmd.event.kind === 'ventilation') expect(describeCommand(cmd as never), `${c.id}/${s.id}`).not.toMatch(/undefined/);
  });
});
