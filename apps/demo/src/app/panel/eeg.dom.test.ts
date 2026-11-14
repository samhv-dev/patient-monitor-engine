// @vitest-environment happy-dom
// EEG plan E12, the owner's Q9: the instructor's EEG artefact controls (panel/eeg.ts, the Devices sheet's group "EEG
// device: artefacts": the owner ruled on 12 November that "the EEG should go into devices as a device"). One switch per artefact the engine has an instructor command for — a loose electrode and ECG pickup (`device
// eeg impedance`, `device eeg ecgPickup`) — each sending the engine's own command at once (no artefact drawn here),
// each showing the state the ENGINE reports in its `state` event (never the press alone), each a Log line. Muscle
// (EMG) and blinks have no switch: the engine computes them from the patient (D5), and the sheet says so. Diathermy and
// mains are the ECG model's `setModifiers`, which no Instructor view may send (plan instructor-peer-role.md §2): not
// in this group until that is ruled. While no EEG device is on, the group is not shown.
import { describe, expect, it } from 'vitest';
import type { AckResult, CommandInput } from '@pme/controller';
import type { Link } from '../link.ts';
import { EEG_ARTEFACTS, eegArtefactCmd, eegGroup, LOOSE_ELECTRODE_KOHM } from './eeg.ts';

const OK: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 };
const ON_STATE = { model: 'generic', impedanceKOhm: [2, 2, 2], ecgPickup: false };
type EegView = { model: string; impedanceKOhm: number[]; ecgPickup: boolean };

function rig(eeg: Partial<EegView> | null, ack: AckResult = OK) {
  const sent: CommandInput[] = [];
  const link = {
    simT: 100,
    ctl: { state: { type: 'state', t: 100, ...(eeg ? { eeg: { ...ON_STATE, ...eeg } } : {}) } },
    send: async (c: CommandInput) => (sent.push(c), ack),
    onChange: () => () => undefined,
  } as { simT: number; ctl: { state: Record<string, unknown> } };
  const g = eegGroup(link as unknown as Link);
  const el = g.el;
  const refresh = g.refresh;
  document.body.replaceChildren(el);
  refresh();
  const btn = (name: string) => [...el.querySelectorAll('button')].find((b) => b.textContent === name) as HTMLButtonElement;
  const press = async (name: string) => {
    btn(name).click();
    await new Promise((r) => setTimeout(r, 0));
  };
  const pressed = (name: string) => btn(name).getAttribute('aria-pressed');
  const setState = (v: Partial<EegView> | null) => {
    link.ctl.state = { type: 'state', t: 101, ...(v ? { eeg: { ...ON_STATE, ...v } } : {}) };
    refresh();
  };
  const stateText = (id: string) => el.querySelector(`[data-artefact="${id}"] .eeg-state`)?.textContent;
  return { el, sent, btn, press, pressed, setState, stateText, refresh: () => refresh() };
}

describe("Q9: the instructor's EEG artefact controls", () => {
  it("one switch per artefact with an instructor command, in this order; EMG and blinks named as the patient's, without a switch", () => {
    const r = rig(ON_STATE);
    expect(EEG_ARTEFACTS.map((a) => a.label)).toEqual(['Loose electrode', 'ECG pickup']);
    for (const a of EEG_ARTEFACTS) expect(r.pressed(a.label), a.label).toBe('false');
    expect(r.el.textContent).toMatch(/Muscle activity \(EMG\) and eye blinks come from the patient/);
    expect(r.el.querySelector('.eeg-device')?.textContent).toBe('Processed EEG (generic)');
    expect(r.el.querySelector('h3')?.textContent).toBe('EEG device: artefacts');
    expect(r.el.hidden).toBe(false);
  });

  it("each sends the engine's own command, at once (never staged); off sends the engine's default back", async () => {
    const r = rig(ON_STATE);
    await r.press('Loose electrode');
    await r.press('ECG pickup');
    expect(r.sent).toEqual([
      { type: 'device', action: { device: 'eeg', action: 'impedance', value: [2, 2, LOOSE_ELECTRODE_KOHM] } },
      { type: 'device', action: { device: 'eeg', action: 'ecgPickup', value: true } },
    ]);
    expect(eegArtefactCmd.electrode(false)).toEqual({ type: 'device', action: { device: 'eeg', action: 'impedance', value: 2 } });
    expect(eegArtefactCmd.ecgPickup(false)).toEqual({ type: 'device', action: { device: 'eeg', action: 'ecgPickup', value: false } });
  });

  it('each shows the state the ENGINE reports: on while its state says so, off again when it does not', () => {
    const r = rig(ON_STATE);
    expect(r.stateText('electrode')).toBe('Electrodes 2 · 2 · 2 kΩ');
    r.setState({ impedanceKOhm: [2, 2, 20], ecgPickup: true });
    expect([r.pressed('Loose electrode'), r.pressed('ECG pickup')]).toEqual(['true', 'true']);
    expect(r.stateText('electrode')).toBe('Electrodes 2 · 2 · 20 kΩ');
    expect(r.stateText('pickup')).toBe('On');
    // a scenario's or the developer page's value is the engine's too: any electrode not at the default is "loose"
    r.setState({ impedanceKOhm: [9, 2, 2] });
    expect(r.pressed('Loose electrode')).toBe('true');
    r.setState(ON_STATE);
    expect([r.pressed('Loose electrode'), r.pressed('ECG pickup')]).toEqual(['false', 'false']);
    expect(r.stateText('pickup')).toBe('Off');
  });

  it('a press waits for the engine to report it (up to 3 s), so a repaint before the next state does not flip it back', async () => {
    const r = rig(ON_STATE);
    await r.press('ECG pickup');
    r.refresh(); // the old state (pickup off) again
    expect(r.pressed('ECG pickup')).toBe('true');
  });

  it('no EEG device on: the group is not shown; it appears when the engine reports one, and goes when it reports none', () => {
    const r = rig(null);
    expect(r.el.hidden).toBe(true);
    r.setState(ON_STATE);
    expect(r.el.hidden).toBe(false);
    r.setState(null);
    expect(r.el.hidden).toBe(true);
  });

  it("a refused command shows the engine's reason, and the switch follows the engine (off)", async () => {
    const r = rig(ON_STATE, { accepted: false, tick: 0, commandId: 'c1', rttMs: 0, reason: 'eeg is off: switch it on first' });
    await r.press('ECG pickup');
    r.refresh();
    expect(r.pressed('ECG pickup')).toBe('false');
    expect(document.body.textContent).toMatch(/Not done: eeg is off/);
  });
});
