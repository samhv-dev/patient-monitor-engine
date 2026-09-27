// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/
// EnergyModel.cpp (summit metabolism 21·W^0.75 reached 1.8 °C below the shivering threshold; sweat gain 0.25·h_sw),
// Copyright 2018-2025 Kitware, Inc. and Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research
// Associates, Inc.; licensed under the Apache License, Version 2.0; modified: re-expressed in TypeScript; thresholds,
// anaesthetic depth, set point, NMB and the caps are ours (see NOTICES N-P17).
//
// Thermoregulatory thresholds and effectors (tables §5c; Sessler 2008/2016 via research 09 §7; annex B3 Pulse
// shivering/sweat forms). Pure functions of core temperature, the thermoregulatory DEPTH d (0 awake → 1 typical
// general anaesthesia; > 1 deeper; 7f supplies it, else the `thermal` event), the set-point shift (fever/MANUAL
// target) and neuromuscular block. Anaesthetics widen the interthreshold range: vasoconstriction and shivering
// thresholds fall, the sweating threshold rises (tables: GA sweat 38.0 / vaso 34.5 / shiver 33.5 vs awake 37.2 /
// 36.9 / 36.0). Linear in d between the awake and GA rows, extrapolated for d > 1 (propofol/volatile thresholds fall
// linearly with concentration, Sessler) and clamped to [0, 1.5].
import {
  SHIVER_MAX_X, SHIVER_SPAN_C, SUMMIT_W_PER_KG075, SWEAT_MAX_W_70, SWEAT_W_PER_C, THR_SHIVER_AWAKE, THR_SHIVER_GA,
  THR_SWEAT_AWAKE, THR_SWEAT_GA, THR_VASO_AWAKE, VASOCONSTRICT_C, W_VASO_AWAKE, W_VASO_GA,
} from './params.ts';

export interface Thresholds {
  vaso: number; // logistic centre, °C
  vasoW: number; // logistic width, °C
  shiver: number;
  sweat: number;
}

const lerp = (a: number, b: number, d: number) => a + (b - a) * d;

/** Thresholds at depth d with every threshold shifted by `setShiftC` (fever raises the set point). */
export function thresholds(depth: number, setShiftC: number): Thresholds {
  const d = Math.min(1.5, Math.max(0, depth));
  return {
    vaso: lerp(THR_VASO_AWAKE, VASOCONSTRICT_C, d) + setShiftC,
    vasoW: lerp(W_VASO_AWAKE, W_VASO_GA, Math.min(1, d)),
    shiver: lerp(THR_SHIVER_AWAKE, THR_SHIVER_GA, d) + setShiftC,
    sweat: lerp(THR_SWEAT_AWAKE, THR_SWEAT_GA, d) + setShiftC,
  };
}

/** Vasomotor dilation fraction f (0 = fully constricted, 1 = fully dilated). */
export function vasoDilation(tc: number, thr: Thresholds): number {
  return 1 / (1 + Math.exp(-(tc - thr.vaso) / thr.vasoW));
}

/**
 * Shivering heat, W, on top of the basal m0 (Pulse PH/Energy 617–624 form): linear from the threshold to the summit
 * 21·W^0.75 reached SHIVER_SPAN_C below it; the summit is capped at SHIVER_MAX_X × m0 (tables × 5); neuromuscular
 * block abolishes it (nmb 0–1).
 */
export function shiverW(tc: number, thr: Thresholds, m0: number, effKg: number, nmb: number): number {
  const deficit = thr.shiver - tc;
  if (deficit <= 0) return 0;
  const summit = Math.min(SUMMIT_W_PER_KG075 * effKg ** 0.75, SHIVER_MAX_X * m0);
  return Math.max(0, summit - m0) * Math.min(1, deficit / SHIVER_SPAN_C) * (1 - Math.min(1, Math.max(0, nmb)));
}

/** Sweat evaporative heat loss, W (Pulse PH/Energy 668–679 gain, capped for draped skin [ENG]). */
export function sweatW(tc: number, thr: Thresholds, effKg: number): number {
  const over = tc - thr.sweat;
  return over <= 0 ? 0 : Math.min(SWEAT_MAX_W_70 * (effKg / 70), SWEAT_W_PER_C * over);
}
