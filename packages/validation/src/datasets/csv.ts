// Minimal CSV reading for the dataset metadata files (quoted cells, header row → objects).
import { csvCells } from '../templates/compare-ptbxl.ts';

export function readCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const head = csvCells(lines[0] ?? '').map((h) => h.trim());
  return lines.slice(1).map((l) => {
    const c = csvCells(l);
    return Object.fromEntries(head.map((h, i) => [h, (c[i] ?? '').trim()]));
  });
}
