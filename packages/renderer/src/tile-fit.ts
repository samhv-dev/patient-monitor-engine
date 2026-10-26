// Saadat pass 3 (the owner's 2026-10-23 review): how the parts of a split tile fit their width. Pure, so the rules are
// unit-tested without a layout engine; device-ui.ts measures the texts and applies the result (grid mode only).
//
// A part is laid out as the photo (IMG_8113) has it: a head (label, with its unit beside it or under it) over the value,
// and its limit pair in a narrow column either beside the value (EtCo2, RR, T1/T2) or beside the head (FiCo2, AWRR).
// When the part is too narrow, first the unit goes under the label, then the limits shrink — before anything overlaps.
// Only a value that still does not fit with the limits at their floor (a 3-digit EtCO2 at a 1000 px pane) shrinks last.

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
  /** The digits' size as a fraction of the skin's value size (the last step; 1 almost always). */
  valScale: number;
}

/** The limits never shrink below this fraction of their size (≈ 9 px at the 15 px skin size): still legible. */
export const LIM_MIN_SCALE = 0.6;
/** UI review #24: nor below this many CSS px, whatever the monitor height. The grid's sizes scale with the monitor's
 *  height, so on the 1280 × 800 Instructor view (a 634 px monitor) the fraction alone let the T column's 13 px limits
 *  fall to ≈ 6 px; the digits beside them give way instead (VAL_MIN_SCALE). */
export const LIM_MIN_PX = 9;
/** Nor the digits below this fraction of theirs. */
export const VAL_MIN_SCALE = 0.7;

const clamp = (k: number, min = LIM_MIN_SCALE) => Math.max(min, Math.min(1, k));

/**
 * One part of width `w`, its texts' natural widths and the gap between two texts beside each other.
 * - limits beside the value: the unit stays beside the label while label + gap + unit fits, then goes under it; the
 *   limits shrink until limits + gap + value fits (never below their floor; `limPx`, their full size in px, sets the
 *   LIM_MIN_PX floor);
 * - limits beside the head: the unit is always under the label (the head is as wide as the wider of the two); the
 *   limits shrink until head + gap + limits fits.
 */
export function fitPart(w: number, p: PartWidths, side: LimSide, gap: number, limPx = 0): PartFit {
  if (!(w > 0)) return { unitUnder: false, limScale: 1, valScale: 1 }; // not laid out (hidden, or no layout engine)
  const unitUnder = side === 'value' && p.unit > 0 && p.label + gap + p.unit > w;
  const beside = side === 'value' ? p.value : Math.max(p.label, p.unit);
  // the floor: LIM_MIN_SCALE, and never below LIM_MIN_PX when the limits' full size `limPx` is known (#24)
  const floor = limPx > 0 ? Math.min(1, Math.max(LIM_MIN_SCALE, LIM_MIN_PX / limPx)) : LIM_MIN_SCALE;
  const limScale = p.lim <= 0 ? 1 : clamp((w - gap - beside) / p.lim, floor);
  // the value's own room: beside the limits (at their final size), or the whole part when the limits sit by the head
  const room = side === 'value' && p.lim > 0 ? w - gap - p.lim * limScale : w;
  const valScale = p.value <= 0 ? 1 : clamp(room / p.value, VAL_MIN_SCALE);
  return { unitUnder, limScale, valScale };
}

/**
 * A split tile: its parts fitted one by one, then one decision for the tile — the unit under the label if any part
 * needs it, and every limit at the smallest scale any part needs (the pairs of one tile stay one size).
 */
export function fitTile(w: number, parts: ReadonlyArray<{ widths: PartWidths; side: LimSide }>, gap: number, limPx = 0): PartFit {
  const fits = parts.map((p) => fitPart(w, p.widths, p.side, gap, limPx));
  return { unitUnder: fits.some((f) => f.unitUnder), limScale: Math.min(1, ...fits.map((f) => f.limScale)), valScale: Math.min(1, ...fits.map((f) => f.valScale)) };
}
