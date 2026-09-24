import { describe, expect, it } from 'vitest';
import { createEngine, type Command } from '@pme/engine-core';
import { deviceCommand, flagView, modifierCommand, modifierPatch, pinCommand, rampFrom, readout, rhythmCommand, targetCommand } from '../../src/panel/controls.ts';
import { StageBuffer } from '../../src/panel/staging.ts';
import { stage1Vocabulary } from '../../src/vocabulary.ts';
import type { AckResult, CommandInput } from '../../src/protocol.ts';

const vocab = stage1Vocabulary();
const hr = vocab.variables[0]!;

describe('control command builders', () => {
  it('builds targets with clamped values and optional ramps', () => {
    expect(targetCommand(hr, 400, rampFrom(30, 'sigmoid'))).toEqual({ type: 'setTarget', variable: 'hr', value: 300, ramp: { durationS: 30, curve: 'sigmoid' } });
    expect(targetCommand(hr, 80, rampFrom(0, 'linear'))).toEqual({ type: 'setTarget', variable: 'hr', value: 80 });
    expect(rampFrom(5000, 'exp')).toEqual({ durationS: 900, curve: 'exp' });
    expect(rampFrom(Number.NaN, 'exp')).toBeUndefined();
  });

  it('builds modifier patches from dotted paths, and object modifiers as on/off', () => {
    expect(modifierPatch('artefact.noise', 0.5)).toEqual({ artefact: { noise: 0.5 } });
    const pvc = vocab.modifiers.find((m) => m.path === 'pvc')!;
    expect(modifierCommand(pvc, { pattern: 'bigeminy', probability: 0.2 })).toEqual({ type: 'setModifiers', modifiers: { pvc: { pattern: 'bigeminy', probability: 0.2 } } });
    expect(modifierCommand(pvc, null)).toEqual({ type: 'setModifiers', modifiers: { pvc: null } });
  });

  it('every generated Stage 1 command is accepted by a real engine', () => {
    const e = createEngine();
    let n = 0;
    const ok = (c: CommandInput) => e.dispatch({ ...c, id: `x${n++}`, issuedBy: 't' } as Command).accepted;
    expect(ok(targetCommand(hr, 90, rampFrom(10, 'exp')))).toBe(true);
    expect(ok(rhythmCommand('afib', 'nextBeat'))).toBe(true);
    for (const m of vocab.modifiers) expect(ok(m.kind === 'number' ? modifierCommand(m, m.normal) : modifierCommand(m, { pattern: 'single', probability: 0.1 }))).toBe(true);
    const lead = vocab.devices.find((d) => d.action === 'lead')!;
    expect(ok(deviceCommand(lead, 'V2', 1))).toBe(true);
    expect(pinCommand(hr, 60)).toEqual({ type: 'pin', variable: 'hr', value: 60 });
  });

  it('maps control flags to CAE-style badges and formats target/truth/displayed', () => {
    expect(flagView('ramping').className).toContain('pme-flag-blue');
    expect(flagView('override').className).toContain('pme-flag-yellow');
    expect(flagView(undefined).text).toBe('');
    const state = { type: 'state' as const, t: 1, tick: 50, mode: 'manual' as const, values: { hr: 110 }, control: { hr: 'ramping' as const } };
    expect(readout(hr, state, 97.4)).toBe('110 / 110 / 97.4 bpm');
    expect(readout(hr, null, undefined)).toBe('— / — / — bpm');
  });
});

describe('StageBuffer', () => {
  it('replaces a restaged control and commits everything with one stageGroup', async () => {
    const b = new StageBuffer('p1');
    b.stage(targetCommand(hr, 90), 'target.hr');
    b.stage(rhythmCommand('sinus'), 'rhythm');
    b.stage(targetCommand(hr, 100), 'target.hr');
    expect(b.size).toBe(2);
    const sent: CommandInput[] = [];
    const acks = await b.commit(async (c) => (sent.push(c), { accepted: true, tick: 1, commandId: 'x', rttMs: 1 } as AckResult));
    expect(acks).toHaveLength(2);
    expect(sent.map((c) => c.stageGroup)).toEqual(['p1-sg1', 'p1-sg1']);
    expect((sent[0] as { value: number }).value).toBe(100);
    expect(b.size).toBe(0);
  });
});
