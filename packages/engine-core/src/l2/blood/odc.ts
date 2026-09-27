// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/
// Saturation.cpp (lines 931–1053), Copyright 2018-2025 Kitware, Inc. and Contributors, itself a fork of BioGears 6.1.1,
// Copyright 2015 Applied Research Associates, Inc.; licensed under the Apache License, Version 2.0; modified:
// re-expressed in TypeScript and simplified for the monitor tick (closed-form Hill curve, no per-compartment Newton
// solve) (see NOTICES N-P09). Primary model: Dash & Bassingthwaighte, Ann Biomed Eng 2004;32:1676 (erratum 2010;
// 38:1683); Dash, Korman & Bassingthwaighte, Eur J Appl Physiol 2016;116:97.
//
// Oxygen dissociation (tables §5b.3 P50 row; audit #6, A14): SHbO2 = x^n/(1 + x^n), x = PO2/P50, with
//   n   = 2.7 − 1.1·S_CO                                   (CO flattens the curve)
//   P50 = (26.8 − 20·S_CO) · Π_k (P50_k / 26.8)            (independent shifts, multiplicative)
//   P50_pH   = 26.765 − 21.279·ΔpH + 8.872·ΔpH²            ΔpH = pH − 7.4
//   P50_PCO2 = 26.80 + 0.0428·ΔPCO2 + 3.64e-5·ΔPCO2²       ΔPCO2 = PCO2 − 40
//   P50_DPG  = 26.8 + 795.63·ΔDPG − 19660.89·ΔDPG²         ΔDPG = [DPG] − 4.65e-3 mol/L
//   P50_T    = 26.8 + 1.4945·ΔT + 0.04335·ΔT² + 0.0007·ΔT³ ΔT = T − 37
// S_CO is the COHb fraction of total Hb. The returned saturation is FUNCTIONAL (HbO2 over Hb available for O2,
// i.e. excluding COHb and MetHb); content multiplies by (1 − COHb − MetHb).

export interface OdcCtx {
  hb: number; // g/dL
  ph: number;
  dpgMmolL: number; // 2,3-DPG, mmol/L red cell (4.65 normal)
  cohb: number; // fraction 0–1
  methb: number; // fraction 0–1
}

export const ODC_DEFAULT: OdcCtx = { hb: 15, ph: 7.4, dpgMmolL: 4.65, cohb: 0, methb: 0 };

/** P50 (mmHg) for the given state. At pH 7.4, PCO2 40, 37 °C, DPG 4.65, no CO: 26.8 (± 0.04). */
export function p50(ctx: OdcCtx, pco2: number, tempC: number): number {
  const dph = ctx.ph - 7.4;
  const dco2 = Math.max(5, pco2) - 40;
  const ddpg = (ctx.dpgMmolL - 4.65) / 1000;
  const dt = tempC - 37;
  const fPh = (26.765 - 21.279 * dph + 8.872 * dph * dph) / 26.8;
  const fCo2 = (26.8 + 0.0428 * dco2 + 3.64e-5 * dco2 * dco2) / 26.8;
  const fDpg = (26.8 + 795.63 * ddpg - 19660.89 * ddpg * ddpg) / 26.8;
  const fT = (26.8 + 1.4945 * dt + 0.04335 * dt * dt + 0.0007 * dt * dt * dt) / 26.8;
  return Math.max(5, (26.8 - 20 * ctx.cohb) * fPh * fCo2 * fDpg * fT);
}

/** Hill coefficient: 2.7 − 1.1·S_CO. */
export function hillN(ctx: OdcCtx): number {
  return 2.7 - 1.1 * ctx.cohb;
}

/** Functional HbO2 saturation 0–1. */
export function satDB(po2: number, pco2: number, tempC: number, ctx: OdcCtx): number {
  if (po2 <= 0) return 0;
  const x = (po2 / p50(ctx, pco2, tempC)) ** hillN(ctx);
  return x / (1 + x);
}

/** O2 content, mL O2 per L blood: 13.4·Hb·S·(1 − COHb − MetHb) + 0.03·PO2 (tables §5b.3 caO2 row, ×10 for per L). */
export function contentDB(po2: number, pco2: number, tempC: number, ctx: OdcCtx): number {
  return 13.4 * ctx.hb * satDB(po2, pco2, tempC, ctx) * Math.max(0, 1 - ctx.cohb - ctx.methb) + 0.03 * Math.max(0, po2);
}

/**
 * What a two-wavelength pulse oximeter reports (0–1) for a functional saturation `s` (plan decision 12; research 03
 * §3.6): COHb reads as O2Hb; MetHb pulls the reading toward 85 % (weight min(1, MetHb/0.3)) [TXT shape, ENG weight].
 * Identity when COHb = MetHb = 0.
 */
export function pulseOxApparent(s: number, ctx: OdcCtx): number {
  if (ctx.cohb === 0 && ctx.methb === 0) return s;
  const a = s * (1 - ctx.cohb - ctx.methb) + ctx.cohb;
  const w = Math.min(1, ctx.methb / 0.3);
  return a * (1 - w) + 0.85 * w;
}
