// @vitest-environment happy-dom
// E128 (owner, 26 October): after Load from the Scenarios page the Instructor panel showed "Vitals & rhythm" (the last
// tab used, or the default) and the case's next-step buttons were out of sight. Every Load now opens the Scenario tab —
// whoever loaded it — and nothing else moves the panel off the tab the instructor chose.
import { afterEach, describe, expect, it } from 'vitest';
import { ScenarioView, type ScenarioDoc } from '@pme/controller';
import type { Link } from '../link.ts';
import { DEFAULT_SITE } from '../site.ts';
import { mountPanel, type PanelHandle } from './panel.ts';

const DOC = { schema: 'pme-scenario/1', id: 'test-load-tab', title: 'Load tab', initialState: 'a', states: [{ id: 'a', label: 'A' }] } as ScenarioDoc;

function rig(tab: string) {
  const sv = new ScenarioView();
  const fns = new Set<() => void>();
  const link = {
    ctl: { scenario: sv, bookmarks: [], simT: 0, state: null, rhythm: null, log: [], send: async () => ({ accepted: true, tick: 0 }) },
    host: null, alarms: null, simT: 0, log: [], ramps: new Map(),
    send: async () => ({ accepted: true, tick: 0 }),
    note: () => undefined,
    onChange: (fn: () => void) => (fns.add(fn), () => void fns.delete(fn)),
  } as unknown as Link;
  const changed = () => fns.forEach((fn) => fn());
  /** What the controller does with a `scenario load` it sees applied (any source), then tells its listeners. */
  const load = () => {
    sv.onEvent({ type: 'commandApplied', commandId: `x${sv.docVersion}`, tick: 0, resolved: { command: { id: 'x', issuedBy: 'instructor', type: 'scenario', action: 'load', doc: DOC } } } as never);
    changed();
  };
  const panel = mountPanel(link, { site: DEFAULT_SITE, weightKg: () => 70, tab });
  document.body.append(panel.el);
  const selected = () => panel.el.querySelector('[role=tab][aria-selected=true]')?.getAttribute('data-tab');
  return { panel, sv, load, changed, selected };
}

let open: PanelHandle | null = null;
afterEach(() => {
  open?.destroy();
  open = null;
  document.body.replaceChildren();
});

describe('E128: Load selects the Scenario tab', () => {
  for (const tab of ['vitals', 'devices', 'log']) {
    it(`a Load while the panel shows ${tab} opens the Scenario tab, with the running case in it`, () => {
      const r = rig(tab);
      open = r.panel;
      expect(r.selected()).toBe(tab);
      r.changed(); // any other change (a state event, a log line) leaves the tab alone
      expect(r.selected()).toBe(tab);
      r.load();
      expect(r.selected()).toBe('scenario');
      expect((r.panel.el.querySelector('#tp-scenario') as HTMLElement).hidden).toBe(false);
      expect(r.panel.el.querySelector('section[aria-label="Running scenario"]')).not.toBeNull();
    });
  }

  it('after a Load the instructor may move on; only the next Load brings the Scenario tab back', () => {
    const r = rig('vitals');
    open = r.panel;
    r.load();
    r.panel.select('drugs');
    r.changed();
    expect(r.selected()).toBe('drugs');
    r.load(); // the next case
    expect(r.selected()).toBe('scenario');
  });

  it('a new patient without a case (the document version bumps to none) does not move the tab', () => {
    const r = rig('vitals');
    open = r.panel;
    r.load();
    r.panel.select('airway');
    r.sv.reset(); // a patient restart
    r.changed();
    expect(r.selected()).toBe('airway');
  });
});
