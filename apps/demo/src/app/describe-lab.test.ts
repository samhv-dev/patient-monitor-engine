// N84 (brief 161, plan learner-action-remote.md L11): the log and the record named every laboratory sample a blood gas.
// Since L10a a sample is one of four panels; the line names the one that was sent.
import { describe, expect, it } from 'vitest';
import { describeCommand } from './describe.ts';

const lab = (panel: string) => describeCommand({ type: 'applyEvent', event: { kind: 'lab', panel } });

describe('a laboratory sample in clinical words (N84)', () => {
  it('names the panel that was sent', () => {
    expect(lab('abg')).toBe('Arterial blood gas sent');
    expect(lab('vbg')).toBe('Venous blood gas sent');
    expect(lab('chem')).toBe('Chemistry sample sent');
    expect(lab('coag')).toBe('Coagulation sample sent');
  });
});
