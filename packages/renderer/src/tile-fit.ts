// Saadat pass 3 (the owner's 2026-10-23 review): how the parts of a split tile fit their width. Pure, so the rules are
// unit-tested without a layout engine; device-ui.ts measures the texts and applies the result (grid mode only).
//
// A part is laid out as the photo (IMG_8113) has it: a head (label, with its unit beside it or under it) over the value,
// and its limit pair in a narrow column either beside the value (EtCo2, RR, T1/T2) or beside the head (FiCo2, AWRR).
// When the part is too narrow, first the unit goes under the label, then the limits shrink — before anything overlaps.

/** The natural widths (CSS px, limits at full size) of one part's texts. 0 for a text the part does not have. */
export interface PartWidths {
  label: number;
  unit: number;
  lim: number;
  value: number;
}

/** Where a part's limit column sits: beside the value (the first part) or beside the head (the other parts). */
export type LimSide = 'value' | 'head';

export interface PartFit {
  /** The unit goes under the label (it was beside it). */
  unitUnder: boolean;
  /** The limits' size as a fraction of the skin's limit size. */
  limScale: number;
}

/** The limits never shrink below this fraction of their size (≈ 9 px at the 15 px skin size): still legible. */
export const LIM_MIN_SCALE = 0.6;

const clamp = (k: number) => Math.max(LIM_MIN_SCALE, Math.min(1, k));

/**
 * One part of width `w`, its texts' natural widths and the gap between two texts beside each other.
 * - limits beside the value: the unit stays beside the label while label + gap + unit fits, then goes under it; the
 *   limits shrink until limits + gap + value fits;
 * - limits beside the head: the unit is always under the label (the head is as wide as the wider of the two); the
 *   limits shrink until head + gap + limits fits.
 */
export function fitPart(w: number, p: PartWidths, side: LimSide, gap: number): PartFit {
  if (!(w > 0)) return { unitUnder: false, limScale: 1 }; // not laid out (hidden, or no layout engine)
  const unitUnder = side === 'value' && p.unit > 0 && p.label + gap + p.unit > w;
  if (p.lim <= 0) return { unitUnder, limScale: 1 };
  const beside = side === 'value' ? p.value : Math.max(p.label, p.unit);
  return { unitUnder, limScale: clamp((w - gap - beside) / p.lim) };
}

/**
 * A split tile: its parts fitted one by one, then one decision for the tile — the unit under the label if any part
 * needs it, and every limit at the smallest scale any part needs (the pairs of one tile stay one size).
 */
export function fitTile(w: number, parts: ReadonlyArray<{ widths: PartWidths; side: LimSide }>, gap: number): PartFit {
  const fits = parts.map((p) => fitPart(w, p.widths, p.side, gap));
  return { unitUnder: fits.some((f) => f.unitUnder), limScale: Math.min(1, ...fits.map((f) => f.limScale)) };
}
