// @vitest-environment happy-dom
// UI review #14 follow-up: scenarios now cycle the cuff, and a phone that resyncs (or a restored bookmark) cleared the
// tiles and refilled them from the restored engine's next events — but the engine emits the NIBP result only when it
// measures, so the tile showed "/" for up to 5 min beside a host that showed the result. The mount now reads the cuff's
// last result from the snapshot it restores (the path checked here) and seeds the tile; never after a failed cycle.
import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { resolveSkin } from '@pme/skins';
import { DeviceUI } from '../src/device-ui.ts';

type Nb = { phase: string; last: { sys: number; dia: number; map: number; at: number } | null };
const nibpOf = (s: { state: unknown }) => (s.state as { st: { hemo: { nibp: Nb } } }).st.hemo.nibp;

describe('the NIBP result after a restore', () => {
  it('the snapshot holds the last result where mount.ts reads it, and a seeded tile shows it at once', () => {
    const e = createEngine({ seed: 3, device: { skin: 'saadat-like' } } as never);
    let result: { sys: number; dia: number } | undefined;
    e.on((x: EngineEvent) => void (x.type === 'nibp' && x.result && (result = x.result)));
    expect(e.dispatch({ id: 'cuff', issuedBy: 'test', type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 5 } } as never).accepted).toBe(true);
    e.advanceTo(90);
    expect(result).toBeDefined();
    const nb = nibpOf(e.snapshot() as never);
    expect(nb.phase).not.toBe('failed');
    expect(nb.last).toMatchObject({ sys: result?.sys, dia: result?.dia });

    const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like'));
    document.body.append(ui.tiles);
    ui.reset(90); // what a restore does: the tiles refill from the restored engine
    const v = () => ui.tiles.querySelector('.pme-stile[data-param="NIBP"] [data-pme="v"]')?.textContent;
    expect(v()).not.toMatch(/\d/);
    ui.seedNibp(nb.last as NonNullable<Nb['last']>);
    ui.paint(90);
    expect(v()).toBe(`${result?.sys} / ${result?.dia}`);
    ui.destroy();
  });
});
