import { describe, expect, it } from 'vitest';
import { KEY_LABELS } from './glossary-data.ts';
import { ALL_ENTRIES, canon, describeEntry, drugName, drugWords, entry, labelOf, lookup, nameOf, rowKey, setDrugNames, shortLabel, STATE_VAR_ENTRY, unitOf } from './glossary.ts';
import { DRUGS } from '@pme/engine-core';
import { DRUG_NAMES } from './glossary-data.ts';
import { VITALS } from './vitals.ts';

describe('R56 glossary', () => {
  it('has unique entry numbers, and every entry the app refers to exists', () => {
    const ns = ALL_ENTRIES.map((e) => e.n);
    expect(new Set(ns).size).toBe(ns.length);
    expect(ns.length).toBeGreaterThanOrEqual(299);
    for (const n of Object.values(STATE_VAR_ENTRY)) expect(() => entry(n)).not.toThrow();
    for (const v of VITALS) expect(() => entry(v.n)).not.toThrow();
    for (const n of [7, 296, 297]) expect(() => entry(n)).not.toThrow();
  });
  it('resolves truth paths, per-side paths and per-key labels', () => {
    expect(labelOf('mon.hr')).toBe('HR');
    expect(labelOf('mon.nibpDia')).toBe('NIBP D');
    expect(labelOf('resp.lung.lp.side.1.vdAlv')).toBe('R VD alv fraction');
    expect(labelOf('hemo.circ.someInternalGain')).toBeNull();
    for (const k of Object.keys(KEY_LABELS)) expect(lookup(k), k).not.toBeNull();
  });
  it('keeps the collision rulings (research/11 §5.16 rule 3)', () => {
    expect(labelOf('mon.cpp')).toBe('CPP'); // cerebral
    expect(labelOf('ev.circ.cpp')).toBe('CoPP'); // coronary
    expect(labelOf('mon.pi')).toBe('PI');
    expect(labelOf('ev.circ.lvad.pi')).toBe('PI (LVAD)');
    expect(labelOf('mon.sr')).toBe('SR'); // suppression ratio, depth tile only
    expect(ALL_ENTRIES.filter((e) => e.label === 'SR').map((e) => e.n)).toEqual([28]);
    expect(labelOf('ev.labs.values.so2')).toBe('FO₂Hb');
    expect(labelOf('resp.o2.sa')).toBe('SaO₂');
  });
  it('never gives two different quantities the same label (review F1; research/11 §5.16 rule 3)', () => {
    // every key of every entry, with its wildcards filled in: both sides, two drugs, any segment
    const fill = (k: string): string[] =>
      k.includes('#') ? [...fill(k.replace('#', '0')), ...fill(k.replace('#', '1'))]
        : /<[a-z]+>/.test(k) ? [...fill(k.replace(/<[a-z]+>/, 'propofol')), ...fill(k.replace(/<[a-z]+>/, 'rocuronium'))]
          : k.includes('*') ? [...fill(k.replace('*', 'x')), ...fill(k.replace('*', 'y'))] : [k];
    const byLabel = new Map<string, Set<string>>();
    for (const e of ALL_ENTRIES) for (const k of e.keys) for (const p of fill(k)) {
      const l = labelOf(p);
      if (l === null) continue; // a '*' path without its own label is a model internal

      byLabel.set(l, (byLabel.get(l) ?? new Set()).add(rowKey(p) as string));
    }
    const shared = [...byLabel].filter(([, keys]) => keys.size > 1); // one label, two quantities
    expect(shared.map(([l, keys]) => `${l}: ${[...keys].join(' / ')}`)).toEqual([]);
    expect(shortLabel(entry(19))).toBe('T1'); // core temperature
    expect(shortLabel(entry(263))).toBe('TOF T1'); // first twitch
    expect(labelOf('hemo.circ.p.rSys')).toBe('SVR (model)');
    expect(labelOf('ev.circ.svr')).toBe('SVR');
    expect(labelOf('resp.etco2')).toBe('EtCO₂ (true)');
    expect(labelOf('ev.drugs.drugs.propofol.cp')).toBe('Cp (Propofol)');
    expect(labelOf('pk.bus.agents.rocuronium.nmj')).toBe('Ce NMJ (Rocuronium)');
    expect(canon(233)).toBe(31); // ICP truth = ICP monitor: one row in Explore
    expect(rowKey('mon.icpMean')).toBe(rowKey('ev.organs.brain.icp'));
    expect(rowKey('mon.etco2')).not.toBe(rowKey('resp.etco2'));
    expect(labelOf('resp.temp.sites.nasopharyngeal')).toBe('Tnaso');
    expect(labelOf('pk.bus.cns.loc')).toBeNull(); // '*' key: Model internals
  });
  it('drug names come from the glossary, in the site\'s set (orchestrator ruling 5)', () => {
    for (const d of Object.values(DRUGS)) if (d.cls !== 'placeholder') expect(DRUG_NAMES[d.id], d.id).toBeDefined();
    expect(drugName('norepinephrine')).toBe('Norepinephrine'); // default set: epinephrine / norepinephrine
    expect(labelOf('ev.endo.norepinephrinePgMl')).toBe('Norepinephrine'); // the plasma level follows the drug's name
    setDrugNames('uk');
    try {
      expect(drugName('epinephrine')).toBe('Adrenaline');
      expect(drugName('propofol')).toBe('Propofol');
      expect(labelOf('ev.endo.epinephrinePgMl')).toBe('Adrenaline');
      expect(drugWords('Give epinephrine after the second shock')).toBe('Give adrenaline after the second shock');
    } finally {
      setDrugNames('us');
    }
    expect(drugWords('Give adrenaline after the second shock')).toBe('Give epinephrine after the second shock');
    expect(nameOf(entry(259))).toBe('Plasma norepinephrine');
  });
  it('shows clinical units and names only (no notes written for the model authors)', () => {
    for (const e of ALL_ENTRIES) {
      expect(unitOf(e), `unit of ${e.n}`).not.toMatch(/engine|\(/);
      expect(nameOf(e), `name of ${e.n}`).not.toMatch(/\bengine\b|research\/|Stage \d|R\d{2}\b/);
      expect(describeEntry(e)).not.toMatch(/\bengine\b/);
    }
    expect(unitOf(entry(18))).toBe('/min');
    expect(unitOf(entry(130))).toBe('%');
  });
});
