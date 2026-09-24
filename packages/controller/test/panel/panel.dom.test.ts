// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { mountInstructorPanel, type PanelHandle } from '../../src/panel/panel.ts';
import { stage1Vocabulary, type Vocabulary } from '../../src/vocabulary.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';

let cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
  document.body.replaceChildren();
});

async function setup(vocab: Vocabulary = stage1Vocabulary()) {
  const host = manualHost();
  const hub = createInProcessHub();
  const hs = new HostSession({ session: 'PNL234', target: host, stateIntervalMs: 0 });
  hs.addTransport(hub.connect());
  const s = new ControllerSession({ session: 'PNL234', transport: hub.connect() });
  await waitFor(() => s.hostOnline);
  const panel = mountInstructorPanel(document.body, { session: s, vocabulary: vocab });
  cleanup.push(() => panel.destroy(), () => s.close(), () => hs.close());
  return { host, hs, s, panel };
}

const click = (el: Element | null) => (el as HTMLElement).click();
const q = <T extends Element>(p: PanelHandle, sel: string) => p.el.querySelector(sel) as T;

describe('instructor panel (DOM)', () => {
  it('starts hidden and toggles with the `i` key', async () => {
    const { panel } = await setup();
    expect(panel.isOpen).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i' }));
    expect(panel.isOpen).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i' }));
    expect(panel.isOpen).toBe(false);
  });

  it('generates one target row per vocabulary variable — new variables appear without UI changes', async () => {
    const v = stage1Vocabulary();
    v.variables.push({ id: 'spo2', label: 'SpO2', unit: '%', min: 0, max: 100, step: 1, normal: 97, rampable: true, pinnable: true });
    const { panel } = await setup(v);
    expect([...panel.el.querySelectorAll('[data-var]')].map((r) => (r as HTMLElement).dataset.var)).toEqual(['hr', 'spo2']);
    const pin = panel.el.querySelector('[data-var=spo2] [data-action=pin]') as HTMLButtonElement;
    expect(pin.disabled).toBe(true); // manual mode
  });

  it('Set sends a ramped setTarget that the host engine accepts', async () => {
    const { panel, hs } = await setup();
    q<HTMLInputElement>(panel, 'input[name=hr-value]').value = '120';
    q<HTMLInputElement>(panel, 'input[name=hr-ramp]').value = '10';
    q<HTMLSelectElement>(panel, 'select[name=hr-curve]').value = 'sigmoid';
    click(q(panel, '[data-var=hr] [data-action=set]'));
    await waitFor(() => hs.stats.applied === 1);
  });

  it('stage then commit sends staged changes together (one tick)', async () => {
    const { panel, s, hs } = await setup();
    q<HTMLInputElement>(panel, 'input[name=stage]').checked = true;
    click(q(panel, '[data-var=hr] [data-action=set]'));
    click(q(panel, '[data-action=rhythm]'));
    expect(q<HTMLElement>(panel, '.pme-staged').textContent).toBe('2 staged');
    expect(hs.stats.applied).toBe(0);
    click(q(panel, '[data-action=commit]'));
    await waitFor(() => hs.stats.applied === 2);
    const acks = s.log.filter((l) => l.kind === 'ack');
    expect(acks).toHaveLength(2);
  });

  it('logs notes, and lists and restores bookmarks', async () => {
    const { panel, s, hs, host } = await setup();
    q<HTMLInputElement>(panel, 'input[name=note]').value = 'airway checked';
    click(q(panel, '[data-action=note]'));
    expect(s.log.at(-1)?.text).toBe('airway checked');
    host.advance(1000);
    q<HTMLInputElement>(panel, 'input[name=bookmark]').value = 'before VF';
    click(q(panel, '[data-action=bookmark]'));
    await waitFor(() => s.bookmarks.includes('before VF'));
    expect(hs.bookmarks()).toEqual(['before VF']);
    host.advance(3000);
    click(q(panel, '.pme-bookmarks [data-action=restore]'));
    await waitFor(() => host.engine.now().tick === 50);
  });
});
