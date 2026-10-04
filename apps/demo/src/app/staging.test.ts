import { describe, expect, it } from 'vitest';
import type { AckResult, CommandInput } from '@pme/controller';
import { Staging } from './staging.ts';

const ack = (c: CommandInput): Promise<AckResult> => Promise.resolve({ accepted: true, tick: 1, commandId: c.id ?? 'x', rttMs: 0 });

describe('staged changes', () => {
  it('a later edit of the same control replaces the earlier one; commit sends one stage group with the onset', async () => {
    const sent: CommandInput[] = [];
    const s = new Staging('t', (c) => (sent.push(c), ack(c)));
    s.submit({ type: 'setTarget', variable: 'hr', value: 90 }, 'v-hr', 'HR target 90 bpm');
    s.submit({ type: 'setTarget', variable: 'hr', value: 110 }, 'v-hr', 'HR target 110 bpm');
    s.submit({ type: 'setRhythm', rhythm: 'afib' } as CommandInput, 'rhythm', 'Rhythm: Atrial fibrillation');
    expect(s.size).toBe(2);
    expect(s.lines).toEqual(['HR target 110 bpm', 'Rhythm: Atrial fibrillation']);
    s.transitionS = 30;
    await s.commit();
    expect(sent).toHaveLength(2);
    expect(new Set(sent.map((c) => (c as { stageGroup?: string }).stageGroup)).size).toBe(1);
    expect(sent[0]).toMatchObject({ type: 'setTarget', value: 110, ramp: { durationS: 30, curve: 'linear' } });
    expect(sent[1]).not.toHaveProperty('ramp'); // a rhythm change has no onset
    expect(s.size).toBe(0);
  });
  it('"Apply at once" sends at once and stages nothing', () => {
    const sent: CommandInput[] = [];
    const s = new Staging('t', (c) => (sent.push(c), ack(c)));
    s.autoApply = true;
    s.submit({ type: 'release', variable: 'spo2' }, 'v-spo2', 'SpO₂ returned to the model');
    expect(sent).toHaveLength(1);
    expect(s.size).toBe(0);
  });
});
