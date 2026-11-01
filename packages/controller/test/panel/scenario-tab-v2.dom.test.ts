// @vitest-environment happy-dom
// Plan F1: the panel's Scenario tab given a pme-scenario/2 document (as the host would announce one from F2 on): the
// title, no states, no transitions, no goto targets and no timeline; nothing throws. The /1 tab: scenario-tab.dom.test.ts.
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { createStamper } from '../../src/protocol.ts';
import { mountInstructorPanel } from '../../src/panel/panel.ts';
import { stage1Vocabulary } from '../../src/vocabulary.ts';
import { BUILTIN_CATALOGUE } from '../../src/scenario/builtins.ts';
import { minimalV2 } from '../scenario/fixtures-v2.ts';
import { waitFor } from '../helpers.ts';

const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
  document.body.replaceChildren();
});

describe('panel Scenario tab and a pme-scenario/2 document (F1)', () => {
  it('shows the title and gives the states, the transitions, the goto list and the timeline the empty answer', async () => {
    const hub = createInProcessHub();
    const host = hub.connect();
    const s = new ControllerSession({ session: 'TAB234', transport: hub.connect() });
    const panel = mountInstructorPanel(document.body, { session: s, vocabulary: stage1Vocabulary(), scenarios: BUILTIN_CATALOGUE, startOpen: true });
    cleanup.push(() => panel.destroy(), () => s.close());
    const stamp = createStamper('TAB234', 'host-1');
    const doc = minimalV2();
    host.send(stamp({ kind: 'event', body: [
      { type: 'commandApplied', commandId: 'c1', tick: 0, resolved: { command: { id: 'c1', issuedBy: 'host', type: 'scenario', action: 'load', target: doc.id, doc } } },
      { type: 'scenario', t: 1, stateId: 'early', transitionId: 'enter:early' },
    ] } as never));
    await waitFor(() => s.scenario.doc !== null);
    (panel.el.querySelector('[data-tab=scenario]') as HTMLElement).click();
    await waitFor(() => (panel.el.querySelector('.pme-scn-title') as HTMLElement).textContent === 'MH (format 2)');
    const q = (sel: string) => panel.el.querySelector(sel) as HTMLElement;
    expect(q('.pme-scn-live').hidden).toBe(false);
    expect(q('.pme-scn-state').textContent).toBe('Early signs'); // F2: ScenarioView prints the phase's label
    expect(q('.pme-scn-notes').textContent).toBe('');
    expect(panel.el.querySelectorAll('.pme-scn-next li').length).toBe(0);
    expect(panel.el.querySelectorAll('.pme-scn-states li').length).toBe(0);
    expect((panel.el.querySelector('select[name=scenario-goto]') as HTMLSelectElement).options.length).toBe(0);
  });
});
