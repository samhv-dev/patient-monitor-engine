// @vitest-environment happy-dom
// The owner's review of 30 October: the Monitor view's return controls (Instructor view, Full screen, Open on a second
// screen, Home) sat on the monitor, over the right half of the ECG lane. They belong under it, in the Monitor view's
// own row, never inside the stage the monitor fills (the box check, both skins, is e2e/monitor-return-controls.e2e.ts).
import { describe, expect, it } from 'vitest';
import type { Link } from '../link.ts';
import type { AppSession } from '../session.ts';
import { Shell } from '../shell.ts';
import { monitorView } from './monitor.ts';

describe('the Monitor view', () => {
  it('puts its return controls under the monitor, outside the stage', () => {
    document.body.replaceChildren();
    const shell = new Shell(document.body, { hostless: false });
    const session = { onLearner: () => undefined } as unknown as AppSession;
    shell.add(monitorView(shell.stage, { session, link: {} as Link, learnerUrl: 'about:blank' }));
    shell.show({ id: 'monitor', sub: '' });
    const strip = document.querySelector('[role="toolbar"][aria-label="Monitor view"]') as HTMLElement;
    expect([...strip.querySelectorAll('a, button')].map((b) => b.textContent)).toEqual(['Instructor view', 'Full screen', 'Open on a second screen', 'Home']);
    expect(shell.stage.contains(strip)).toBe(false);
    expect(strip.closest('.view')?.getAttribute('data-view')).toBe('monitor');
    expect(shell.stage.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // under it
  });
});
