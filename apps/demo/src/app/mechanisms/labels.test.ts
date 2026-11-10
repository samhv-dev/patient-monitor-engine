// The mechanism tree's clinical labels (brief 104): a row for every node the registry names, the glossary's label
// unchanged where it has one, every row unreviewed, and docs/plans/mechanism-tree-labels.md equal to the table.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { labelsDoc, LABELS_DOC } from '../../../../../scripts/mechanism-labels.ts';
import { labelOf } from '../glossary.ts';
import { NODE_LABELS, nodeLabel } from './labels.ts';
import { REGISTRY } from './registry-data.ts';

const registryNodes = (): Set<string> => {
  const all = new Set<string>([...REGISTRY.triggers.map((t) => t.path), ...REGISTRY.nodes.map((n) => n.path)]);
  for (const r of REGISTRY.rows) for (const p of [...r.from, r.to]) all.add(p);
  return all;
};

describe('the clinical labels table', () => {
  it('has one row for every node the registry names, and no other', () => {
    const nodes = registryNodes();
    expect(nodes.size).toBe(152);
    expect([...nodes].filter((p) => !nodeLabel(p))).toEqual([]);
    expect(NODE_LABELS.map((l) => l.path).filter((p) => !nodes.has(p))).toEqual([]);
    expect(new Set(NODE_LABELS.map((l) => l.path)).size).toBe(NODE_LABELS.length);
  });
  it('uses the glossary label unchanged where the glossary has one (31 rows), and only there', () => {
    const fromGlossary = NODE_LABELS.filter((l) => labelOf(l.path) !== null);
    expect(fromGlossary).toHaveLength(31);
    for (const l of NODE_LABELS) {
      if (labelOf(l.path) !== null) expect({ path: l.path, label: l.label, glossary: l.glossary }).toEqual({ path: l.path, label: labelOf(l.path), glossary: true });
      else expect(l.glossary, l.path).toBeUndefined();
    }
  });
  it('every row carries a label, a meaning sentence and reviewed: false; no label is an engine key', () => {
    for (const l of NODE_LABELS) {
      expect(l.label.length, l.path).toBeGreaterThan(1);
      expect(l.meaning, l.path).toMatch(/^[A-Z].*\.$/);
      expect(l.reviewed, l.path).toBe(false);
      expect(l.label).not.toMatch(/^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/);
    }
  });
  it('docs/plans/mechanism-tree-labels.md is the table (node --experimental-strip-types scripts/mechanism-labels.ts)', () => {
    expect(readFileSync(LABELS_DOC, 'utf8')).toBe(labelsDoc());
  });
});
