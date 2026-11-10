// The drug model's couplings on the paths of the three first drug triggers (propofol, phenylephrine, esmolol): the
// bolus → the bus and the circulation multipliers (l2/pk/combine.ts), sized by the drug rows (l2/pk/data/), and the
// inputs the drug model reads from the patient (cardiac output, pH, catecholamine responsiveness).
import { ef, st, tr } from './nodes.ts';
import type { ConstRef, Coupling } from './types.ts';

const PROP: ConstRef = 'l2/pk/data/rows-anaesthetic.ts#ANAESTHETIC_ROWS.propofol';
const PHE: ConstRef = 'l2/pk/data/rows-cardiovascular.ts#CARDIOVASCULAR_ROWS.phenylephrine';
const ESM: ConstRef = 'l2/pk/data/rows-cardiovascular.ts#CARDIOVASCULAR_ROWS.esmolol';
const SYN: readonly ConstRef[] = ['l2/pk/combine.ts#HEMO_SYN_MAX', 'l2/pk/combine.ts#HEMO_SYN_U50'];
const CE = st('pk.bus.cns.propCe');
const p = (row: Omit<Coupling, 'module'>): Coupling => ({ module: 'pharmacology', ...row });

export const PHARMACOLOGY: readonly Coupling[] = [
  p({ id: 'pharmacology.propofol.ce', from: [tr('trigger.drug.propofol'), st('hemo.circ.qFwd', 'pharmacology ctx pkCtx.coLpm'), st('blood.core.co0', 'pharmacology ctx pkCtx.coRefLpm')], to: CE, sign: '+', form: 'state', params: [PROP], note: 'Eleveld PK to the effect site; the row is flow-dependent (flowDist), so CO / the settled resting CO scales V1 and the intercompartmental clearances.' }),
  p({ id: 'pharmacology.propofol.svr', from: [CE], to: st('pk.fx.svr'), sign: '−', form: 'factor', params: [PROP, ...SYN], note: 'SVR × (1 − 0.45·E), E = Ce/(Ce + 3.5); an opioid on board deepens it (the haemodynamic synergy).' }),
  p({ id: 'pharmacology.propofol.ees', from: [CE], to: st('pk.fx.ees'), sign: '−', form: 'factor', params: [PROP], note: 'Contractility × (1 − 0.2·E).' }),
  p({ id: 'pharmacology.propofol.venous', from: [CE], to: st('pk.fx.v0Frac'), sign: '+', form: 'term', params: [PROP, ...SYN], note: 'Venodilation + 8 %·E of blood volume into the unstressed pool.' }),
  p({ id: 'pharmacology.propofol.reflex', from: [CE], to: st('pk.fx.gv'), sign: '−', form: 'factor', params: [PROP], note: 'Baroreflex gains × (1 − 0.6·E).' }),
  p({ id: 'pharmacology.propofol.reflexHr', from: [CE], to: st('pk.fx.gvHr'), sign: '−', form: 'factor', params: [PROP], note: 'The chronotropic reflex arm × (1 − 0.7·E).' }),
  p({ id: 'pharmacology.propofol.sympatholysis', from: [CE], to: st('pk.fx.symp'), sign: '−', form: 'factor', params: ['l2/pk/data/rows-anaesthetic.ts#PROPOFOL_SYMP'], note: 'Delivered sympathetic output × (1 − E), EC50 1 µg/mL, Hill 2.' }),
  p({ id: 'pharmacology.propofol.setPoint', from: [CE], to: st('pk.fx.setF'), sign: '−', form: 'factor', params: ['l2/pk/data/rows-anaesthetic.ts#PROPOFOL_SETF'], note: 'Baroreflex set point × (1 − 0.15·E). The comment that sizes it sits above PROPOFOL_SYMP, so this constant reads as untagged.' }),
  p({ id: 'pharmacology.propofol.hypnotic', from: [CE], to: st('pk.bus.cns.hypPropEq'), sign: '+', form: 'state', params: ['l2/pk/combine.ts#PROP_HYP_C50_REF'], note: 'The one hypnotic-potency output: the propofol Ce with the same hypnotic effect at this age.' }),
  p({ id: 'pharmacology.propofol.ventilatory', from: [CE], to: ef('pk.bus.cns.hypVentPropEq'), sign: '+', form: 'state', params: ['l2/pk/combine.ts#PROP_HYP_C50_REF'], note: 'The propofol equivalent at the ventilatory site (ventShare-weighted), read by the neuro model\'s drive.' }),
  p({ id: 'pharmacology.phenylephrine.svr', from: [tr('trigger.drug.phenylephrine')], to: st('pk.fx.svr'), sign: '+', form: 'factor', params: [PHE], note: 'α1 vasoconstriction, Emax +100 % at the rate-equivalent EC50; a catecholamine row (× acidosis factor × responsiveness).' }),
  p({ id: 'pharmacology.phenylephrine.pvr', from: [tr('trigger.drug.phenylephrine')], to: st('pk.fx.pvr'), sign: '+', form: 'factor', params: [PHE], note: 'PVR Emax +15 %.' }),
  p({ id: 'pharmacology.phenylephrine.venous', from: [tr('trigger.drug.phenylephrine')], to: st('pk.fx.v0Frac'), sign: '−', form: 'term', params: [PHE], note: 'Venoconstriction −4.5 % of blood volume at Emax.' }),
  p({ id: 'pharmacology.cyp.hypothermia', from: [st('resp.temp.tc', 'pharmacology ctx pkCtx.tempC'), st('organs.liver.liverFn', 'pharmacology ctx pkCtx.liverFn')], to: st('pk.bus.cns.hypByClass'), sign: '−', form: 'gain', params: ['l2/pk/pipeline.ts#CYP_TEMP_PER_C', 'l2/pk/pipeline.ts#CYP_TEMP_REF_C'], note: 'The clearance factor of a CYP450-cleared row (elim.cyp: midazolam, ketamine, fentanyl, sufentanil, the amides) × (1 − 0.111 per °C below 36.5 °C), on hepatic flow or on the organ model\'s liver function without its own temperature term (research/44 L2-27; Hostler 2010 inside Tortorici 2007). The node is the hypnotic units by class, which these rows\' concentrations feed (warmer: faster clearance, fewer units).' }),
  p({ id: 'pharmacology.catecholamine.acidosis', from: [st('blood.core.ab.ph', 'pharmacology ctx pkCtx.ph')], to: st('pk.fx.svr'), sign: '+', form: 'gain', params: [], note: 'A catecholamine row\'s effect × acidosisFactor(pH) = max(0.4, 1 − 2.5·(7.4 − pH)); the numbers are inline in l2/pk/pd.ts.' }),
  p({ id: 'pharmacology.catecholamine.responsiveness', from: [st('cond.vasoResp', 'pharmacology ctx pkCtx.vasoResp')], to: st('pk.fx.svr'), sign: '+', form: 'gain', params: [], note: 'A catecholamine row\'s effect × vasoResp (the endocrine model\'s cortisol permissive effect).' }),
  p({ id: 'pharmacology.esmolol.occupancy', from: [tr('trigger.drug.esmolol')], to: st('pk.betaBlockAdd'), sign: '+', form: 'state', params: [ESM], note: 'β-receptor occupancy Emax 0.9, EC50 100 (rate-equivalent); combined competitively with the profile\'s own.' }),
  p({ id: 'pharmacology.esmolol.hr', from: [tr('trigger.drug.esmolol')], to: st('pk.fx.hr'), sign: '−', form: 'factor', params: [ESM], note: 'Direct HR × (1 − 0.35·E).' }),
  p({ id: 'pharmacology.esmolol.ees', from: [tr('trigger.drug.esmolol')], to: st('pk.fx.ees'), sign: '−', form: 'factor', params: [ESM], note: 'Contractility × (1 − 0.2·E).' }),
];
