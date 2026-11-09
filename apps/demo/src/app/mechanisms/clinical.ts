// A mechanism-tree node's words (brief 104): the clinical glossary's label where it has one (glossary.ts), else the
// tree's own clinical label (labels.ts). Its own file so the labels table stays importable by a Node script
// (scripts/mechanism-labels.ts) without the glossary's engine import.
import { labelOf } from '../glossary.ts';
import { nodeLabel } from './labels.ts';

export const clinicalLabel = (path: string): string | null => labelOf(path) ?? nodeLabel(path)?.label ?? null;
