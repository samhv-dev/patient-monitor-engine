// The analyser rows (plan docs/plans/learner-action-remote.md §L10a; the owner's ruling LQ2): one data row per blood-gas
// analyser and one for the laboratory, each with the analytes it reports and its own turnaround, read from its source.
// A panel returns the analytes of its row that the engine computes (`panelValues`), so a piece that computes a new
// analyte (creatinine L10b, the coagulation tests L10c, CK L10d) adds one key to the sample (labs.ts `labSample`) and
// it appears in every row that names it, with no change here. Another device is another row; the room's analyser is a
// setting the host puts on the sample (the `lab` event's `analyser`, absent = `DEFAULT_ANALYSER`; a learner's device
// cannot set it, controller protocol.ts LAB_EVENT_KEYS), as the pump's device profiles: the engine holds the rows. Turnarounds are the machine's or the
// laboratory's own time: the walk or the transport to it has no source and is not added ("analyser time only").
import type { AnalyserRow, AnalyserSection, AnalyteId, LabPanelId, LabValues } from '../../types-blood.ts';

/** Radiometer's specification sheet for the ABL800 FLEX family, read for both rows below. */
const ABL800_SHEET = 'Radiometer Medical ApS, "ABL800 FLEX analyzer Specifications", 928-544, 201104M (2011)';
/**
 * Measured on both the ABL825 and the ABL837 (the sheet's "Parameters" table): pH, pCO2, pO2, cCl⁻, cCa²⁺ (ionised),
 * cK⁺, cNa⁺, cGlu, cLac, ctHb, sO2, FO2Hb (the engine's `so2` is fractional, FO2Hb), FCOHb, FMetHb, FHHb; derived
 * ("Derived parameters"): cHCO3⁻(P), cBase(Ecf), Anion Gap (Na⁺ − Cl⁻ − HCO3⁻) and mOsm. Magnesium is not on the sheet.
 */
const ABL_GAS: readonly AnalyteId[] = [
  'ph', 'pco2', 'po2', 'hco3', 'be', 'so2', 'cohb', 'methb', 'hhb', 'lactate', 'na', 'k', 'cl', 'iCa', 'hb', 'glucose', 'ag', 'osm',
];
const ABL_ANALYTES_SRC = `${ABL800_SHEET}: "Parameters" table (the model columns) and "Derived parameters"`;

export const ANALYSER_IDS = ['abl825', 'abl837'] as const;
export type AnalyserId = (typeof ANALYSER_IDS)[number];

/** The point-of-care rows. The sheet gives measuring times for these two models only ("Other analyzer versions will have other measuring times"). */
export const ANALYSERS: Readonly<Record<AnalyserId, AnalyserRow>> = {
  abl825: {
    id: 'abl825', name: 'Radiometer ABL825 FLEX', kind: 'poc', src: ABL800_SHEET, analytesSrc: ABL_ANALYTES_SRC,
    sections: [{
      panels: ['abg', 'vbg'], analytes: ABL_GAS, turnaroundS: 80,
      turnaroundSrc: `${ABL800_SHEET}, "Sample volume" table: ABL825, all parameters, 195 µL, measuring time 80 s (cycle time 150 s)`,
    }],
  },
  abl837: {
    id: 'abl837', name: 'Radiometer ABL837 FLEX', kind: 'poc', src: ABL800_SHEET, analytesSrc: `${ABL_ANALYTES_SRC}; the ABL837 also measures cCrea, ctBil and FHbF`,
    sections: [{
      panels: ['abg', 'vbg'], analytes: [...ABL_GAS, 'creatinine', 'tbil', 'hbf'], turnaroundS: 100,
      turnaroundSrc: `${ABL800_SHEET}, "Sample volume" table: ABL837, all parameters, 250 µL, measuring time 100 s (cycle time 170 s)`,
    }],
  },
};

/**
 * The room's analyser when the room has not set one: a CHOICE awaiting the owner, not a source value. He ruled "the
 * Radiometer ABL800" (LQ2); the family has no single time, and the department's model is not yet named. The ABL825
 * (orchestrator's ruling, 11 Nov 2026): its analytes are the set common to both sourced models, so the default claims
 * nothing a department's ABL800 FLEX might not measure (a creatinine on the gas panel would be wrong on an ABL825).
 */
export const DEFAULT_ANALYSER: AnalyserId = 'abl825';

const HAWKINS = 'Hawkins RC, Laboratory turnaround time, Clin Biochem Rev 2007;28(4):179–94 (PMC2282400)';
/**
 * The laboratory row, until the owner's laboratory gives its own figure (LQ2). Its analytes are the owner's ruling
 * (LQ2: electrolytes, creatinine, CK; coagulation, fibrinogen, INR) on the department's results page (research/49 §3:
 * Biochemistry Cr, CPK, Calcium, Mg; Electrolytes; Coagulation PT, INR, APTT, fibrinogen; Hematology PLT). The
 * laboratory's calcium is total calcium, which the engine does not compute (it computes iCa), so `chem` has none.
 * Turnarounds: Hawkins Table 6, the means of an Italian external quality programme (the Study Group for the
 * Standardization and Promotion of Turnaround Time Control, Hawkins refs 43–44): urgent intra-laboratory TAT, specimen
 * receipt to report, the 2001 cycle; transport is not included. The web edition prints no page; the table is the
 * locator. The owner's own laboratory figure replaces these when he gives it.
 */
export const LABORATORY: AnalyserRow = {
  id: 'laboratory', name: 'Hospital laboratory', kind: 'laboratory', src: HAWKINS,
  analytesSrc: 'the owner\'s ruling LQ2 (docs/plans/learner-action-remote.md §0) on the department\'s results page (research/49 §3)',
  sections: [
    {
      panels: ['chem'], analytes: ['na', 'k', 'cl', 'caTotal', 'mg', 'glucose', 'creatinine', 'ck'], turnaroundS: 2766,
      turnaroundSrc: `${HAWKINS}, Table 6: urgent K, 2001 cycle, mean intra-laboratory TAT 46.1 min (receipt to report) = 2766 s`,
    },
    {
      panels: ['coag'], analytes: ['inr', 'pt', 'aptt', 'fibrinogen', 'platelets'], turnaroundS: 2730,
      turnaroundSrc: `${HAWKINS}, Table 6: urgent prothrombin time, 2001 cycle, mean intra-laboratory TAT 45.5 min (receipt to report) = 2730 s`,
    },
  ],
};

export const LAB_PANELS: readonly LabPanelId[] = ['abg', 'vbg', 'chem', 'coag'];
export const isAnalyserId = (x: unknown): x is AnalyserId => (ANALYSER_IDS as readonly unknown[]).includes(x);

/** The row and section a panel runs on: the gas panels on the room's analyser, the others on the laboratory. */
export function sectionFor(panel: LabPanelId, analyser: AnalyserId = DEFAULT_ANALYSER): { row: AnalyserRow; section: AnalyserSection } {
  const row = panel === 'abg' || panel === 'vbg' ? ANALYSERS[analyser] : LABORATORY;
  const section = row.sections.find((s) => s.panels.includes(panel));
  if (!section) throw new Error(`no section of ${row.id} serves the ${panel} panel`);
  return { row, section };
}

/** The panel's turnaround, s, before any card override (the lab views' "result expected" line reads it). */
export const turnaroundFor = (panel: LabPanelId, analyser?: AnalyserId): number => sectionFor(panel, analyser).section.turnaroundS;

/** The section's analytes that the sample holds (the engine computes), in the row's order; nothing else. */
export function panelValues(sample: LabValues, section: AnalyserSection): LabValues {
  const out: LabValues = {};
  for (const a of section.analytes) {
    const v = sample[a];
    if (v !== undefined) out[a] = v;
  }
  return out;
}
