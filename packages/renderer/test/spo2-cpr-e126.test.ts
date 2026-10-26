// @vitest-environment happy-dom
// E126 (owner ruling 2026-10-26, "mimic the real monitor"): what the saadat-like SpO2 tile and its message show, driven
// by the engine itself. Pulseless with no compressions: a blank value and "SPO2 NO PULSE"; compressions: the model's
// number (no "?" mark) with a low-signal message ("SPO2 LOW PERFUSION" / "SPO2 LOW SIGNAL IQ"); a pulse back: the
// number with no SpO2 message. Sources: Masimo Radical-7 Operator's Manual LAB-5476J p. 113–114; research/06 §4.2.
import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { resolveSkin } from '@pme/skins';
import { DeviceUI } from '../src/device-ui.ts';

const cmd = (id: string, body: Record<string, unknown>) => ({ id, issuedBy: 'test', ...body }) as never;
const cpr = (active: boolean) => ({ type: 'applyEvent', event: { kind: 'cpr', active, rate: 110, quality: 1 } });

function rig() {
  const e = createEngine({ seed: 7, mode: 'modeled', device: { skin: 'saadat-like' }, patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { spo2: 'on', co2: 'on' } } } as never);
  const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like', { sensors: { co2: true } }));
  e.on((x: EngineEvent) => ui.onEvent(x));
  const tile = () => (ui.tiles.querySelector('.pme-stile[data-param="SpO2"] [data-pme="v"]') ?? ui.strip.querySelector('.pme-stile[data-param="SpO2"] [data-pme="v"]'))?.textContent;
  const hrTile = () => ui.tiles.querySelector('[data-param="HR"] [data-pme="v"]')?.textContent ?? null;
  // the saadat-like bar rotates the INOPs in under a red top (alarm-view barView): every message seen over 8 s
  const bar = () => ui.header.querySelector('[data-pme="bar"]')?.textContent ?? '';
  const at = (t: number) => {
    const msgs = new Set<string>();
    let shown = '';
    for (let u = t - 8; u <= t + 1e-9; u += 0.5) {
      e.advanceTo(u);
      ui.paint(u);
      msgs.add(bar());
      shown = tile() ?? '';
    }
    return { tile: shown, hr: hrTile(), spo2Msgs: [...msgs].filter((x) => x.startsWith('SPO2')).sort() };
  };
  e.dispatch(cmd('ett', { type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } }));
  e.dispatch(cmd('vent', { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 } }));
  return { e, ui, at };
}

describe('E126: the SpO2 tile and its message in arrest and CPR (saadat-like)', () => {
  it('VF without compressions → blank + SPO2 NO PULSE; compressions → a number + a low-signal message; the pulse check → blank again', () => {
    const { e, ui, at } = rig();
    expect(at(30).tile).toMatch(/^\d+$/);
    e.dispatch(cmd('vf', { type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' }));
    // owner ruling 2026-10-26: VF has no QRS — the HR field is blank (no number, no dashes), the SpO2 field blank too
    expect(at(55)).toEqual({ tile: '', hr: '', spo2Msgs: ['SPO2 NO PULSE'] });
    e.dispatch(cmd('cpr1', cpr(true)));
    const during = at(100);
    expect(during.tile).toMatch(/^\d+$/); // the number, never "99?"
    expect(during.hr).toBe(''); // VF under compressions: still no QRS counted
    expect(during.spo2Msgs.length).toBe(1);
    expect(['SPO2 LOW PERFUSION', 'SPO2 LOW SIGNAL IQ']).toContain(during.spo2Msgs[0]);
    e.dispatch(cmd('check', cpr(false))); // at 100 s: the pulse check
    expect(at(116)).toEqual({ tile: '', hr: '', spo2Msgs: ['SPO2 NO PULSE'] });
    ui.destroy();
  });

  it('compressions over a beating heart, then stopped (the pulse back): the number with no SpO2 message', () => {
    const { e, ui, at } = rig();
    at(20);
    e.dispatch(cmd('cpr1', cpr(true)));
    at(50);
    e.dispatch(cmd('stop', cpr(false)));
    const after = at(80);
    expect(after.tile).toMatch(/^\d+$/);
    expect(after.spo2Msgs).toEqual([]);
    expect(after.hr).toMatch(/^\d+$/);
    ui.destroy();
  });
});
