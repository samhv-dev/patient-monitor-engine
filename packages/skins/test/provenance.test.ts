import { describe, expect, it } from 'vitest';
import { BASES, PRESET_IDS, PRESETS, provenanceGaps, resolveSkin, SKIN_IDS, SKINS, THEMES, type Provenance } from '../src/index.ts';

/** A source must cite a report section, a ruling or a brief section; only tag 'eng' may say ENG alone. */
const SOURCE_RE = /(research\/\d\d (§\d|R\d)|brief §\d)/;

describe('provenance', () => {
  it.each([...SKIN_IDS, ...PRESET_IDS])('%s: every resolved leaf has a covering entry and no entry dangles', (id) => {
    const r = resolveSkin(id);
    expect(provenanceGaps(r.skin as unknown as Record<string, unknown>, r.provenance)).toEqual({ uncovered: [], dangling: [] });
  });

  it.each(SKIN_IDS)('%s: every field the file itself sets is sourced by the file itself', (id) => {
    const src = SKINS[id] as unknown as Record<string, unknown> & { provenance: Provenance };
    expect(provenanceGaps(src, src.provenance)).toEqual({ uncovered: [], dangling: [] });
  });

  it('every source cites a report or brief section', () => {
    const docs = [...Object.values(SKINS), ...Object.values(BASES), ...Object.values(THEMES), ...Object.values(PRESETS)];
    const bad: string[] = [];
    for (const d of docs) {
      for (const [k, e] of Object.entries(d.provenance)) {
        const ok = e.tag === 'eng' ? e.source.startsWith('ENG') || SOURCE_RE.test(e.source) : SOURCE_RE.test(e.source);
        if (!ok) bad.push(`${d.id} ${k}: ${e.source}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('carries research 06 tags into saadat-like', () => {
    const p = resolveSkin('saadat-like').provenance;
    expect(p['colors.IBP3']?.tag).toBe('conflict');
    expect(p['colors.IBP4']?.tag).toBe('conflict');
    expect(p['alarms.lamp.flashHz']?.tag).toBe('assumed');
    expect(p['sweep.gapPx']?.tag).toBe('inferred');
    expect(p['colors.AGENTS']?.tag).toBe('unverified');
    expect(p['arrhythmia.asystoleS']?.tag).toBe('conflict');
    expect(p['beep.pitchMap']?.tag).toBe('unverified');
    expect(p['limits.neo.inherit']?.tag).toBe('unverified');
  });
});
