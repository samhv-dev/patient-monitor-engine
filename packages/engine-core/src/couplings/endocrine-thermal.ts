// The endocrine model's couplings into the circulation on the haemorrhage, hypoxia and hypercapnia paths: the
// sympathetic stress arm, the adrenal epinephrine, the humoral (AVP/angiotensin) arm and the cortisol responsiveness,
// as l2/endo/{hormones,effects,adapters}.ts compute them; ABSENT rows draw the hormones research/44 L2-01/L2-02 asks for.
import { ef, st } from './nodes.ts';
import type { ConstRef, Coupling } from './types.ts';

const EP = (n: string): ConstRef => `l2/endo/params.ts#${n}`;
const SYMP = st('endo.core.hormones.symp');
const EPI = st('endo.core.hormones.epi');
const HUM = st('endo.core.hormones.hum');
const MAP = st('hemo.circ.mapNow', 'endocrine-thermal ctx endoCtx.hemo');
const DRIVE = ef('endo.adrenalDrive');
const e = (row: Omit<Coupling, 'module'>): Coupling => ({ module: 'endocrine-thermal', ...row });

export const ENDOCRINE: readonly Coupling[] = [
  e({ id: 'endocrine-thermal.humoral.drive', from: [MAP, st('hemo.circ.baro.set', 'endocrine-thermal ctx endoCtx.hemo')], to: HUM, sign: '±', form: 'state', tau: EP('HUM_ON_TAU_S'), saturation: EP('HUM_MAX'), params: [EP('HUM_EC50_MMHG'), EP('HUM_MAX'), EP('HUM_DEADBAND_MMHG'), EP('HUM_ON_TAU_S'), EP('HUM_OFF_TAU_S')], note: 'Baroreceptor unloading u = set − MAP − deadband; target HUM_MAX·u/(u + EC50), first order, not suppressed by an anaesthetic.' }),
  e({ id: 'endocrine-thermal.humoral.svr', from: [HUM], to: st('hemo.circ.ext.endoHumSvrF', 'endocrine-thermal ext endoHumSvrF'), sign: '+', form: 'factor', params: [EP('HUM_SVR')], note: 'The humoral share 1 + HUM_SVR·hum, reported apart so the circulation can withdraw it under arrest.' }),
  e({ id: 'endocrine-thermal.humoral.svrTotal', from: [HUM], to: st('hemo.circ.ext.endoSvrF', 'endocrine-thermal ext endoSvrF'), sign: '+', form: 'factor', params: [EP('HUM_SVR')], note: 'The same factor inside endoSvrF (outside the catecholamine-responsiveness scaling).' }),
  e({ id: 'endocrine-thermal.humoral.venous', from: [HUM], to: st('hemo.circ.ext.endoHumDV0Frac', 'endocrine-thermal ext endoHumDV0Frac'), sign: '−', form: 'term', params: [EP('HUM_V0')], note: '−HUM_V0·hum of blood volume held in the shared unstressed reservoir.' }),
  e({ id: 'endocrine-thermal.adrenal.hypotension', from: [MAP], to: DRIVE, sign: '−', form: 'threshold', params: [EP('DRIVE_HYPOTENSION_PER_MMHG')], note: 'Adrenal drive + DRIVE_HYPOTENSION_PER_MMHG per mmHg below MAP 65 (the 65 is inline).' }),
  e({ id: 'endocrine-thermal.adrenal.hypoxia', from: [st('resp.o2.sa', 'endocrine-thermal ctx endoCtx.resp')], to: DRIVE, sign: '−', form: 'threshold', params: [EP('DRIVE_HYPOXIA_PER_SAT')], note: '+ DRIVE_HYPOXIA_PER_SAT per unit of SaO2 below 0.85 (inline).' }),
  e({ id: 'endocrine-thermal.adrenal.hypercapnia', from: [st('resp.co2.pf', 'endocrine-thermal ctx endoCtx.resp')], to: DRIVE, sign: '+', form: 'threshold', params: [EP('DRIVE_HYPERCAPNIA_PER_MMHG')], note: '+ DRIVE_HYPERCAPNIA_PER_MMHG per mmHg of PaCO2 above 50 (inline).' }),
  e({ id: 'endocrine-thermal.adrenal.sympathetic', from: [SYMP], to: DRIVE, sign: '+', form: 'term', params: [], note: 'The adrenal drive starts from the sympathetic stress activity itself.' }),
  e({ id: 'endocrine-thermal.adrenal.epinephrine', from: [DRIVE], to: EPI, sign: '+', form: 'state', params: [EP('EPI_ADRENAL_GAIN')], note: 'Steady-state epinephrine = basal × (1 + EPI_ADRENAL_GAIN·drive), reached with its clearance time constant.' }),
  e({ id: 'endocrine-thermal.sympathetic.hypercapnia', from: [st('resp.co2.pf', 'endocrine-thermal ctx endoCtx.resp'), st('hemo.circ.ext.cbfRel')], to: SYMP, sign: '+', form: 'threshold', tau: EP('SYMP_ON_TAU_S'), saturation: EP('SYMP_HYPERCAPNIA_MAX'), params: [EP('SYMP_HYPERCAPNIA_FROM_MMHG'), EP('SYMP_HYPERCAPNIA_PER_MMHG'), EP('SYMP_HYPERCAPNIA_MAX')], note: 'The central chemoreflex share of the sympathetic stress target, × brainstem perfusion and the drug model\'s delivered-output factor.' }),
  e({ id: 'endocrine-thermal.stress.svr', from: [SYMP, EPI], to: st('hemo.circ.ext.endoSvrF', 'endocrine-thermal ext endoSvrF'), sign: '+', form: 'factor', params: [EP('G_SYMP_SVR'), EP('EPI_BETA2_SVR'), EP('EPI_EC50_BETA2'), EP('EPI_ALPHA_SVR'), EP('EPI_EC50_ALPHA'), EP('CORT_SVR_PERMISSIVE')], note: '(1 + G_SYMP_SVR·symp)·(1 + β2 dilation)·(1 + α constriction)·cortisol permissive term.' }),
  e({ id: 'endocrine-thermal.stress.hr', from: [SYMP, EPI], to: st('hemo.circ.ext.endoHrF', 'endocrine-thermal ext endoHrF'), sign: '+', form: 'factor', params: [EP('G_SYMP_HR'), EP('EPI_BETA1_HR'), EP('EPI_EC50_BETA1')], note: '(1 + G_SYMP_HR·symp·kHr)·(1 + EPI_BETA1_HR·β1·kHr), kHr = 1 − profile β-block; pre-blunted for the drug β-block.' }),
  e({ id: 'endocrine-thermal.stress.ees', from: [SYMP, EPI], to: st('hemo.circ.ext.endoEesF', 'endocrine-thermal ext endoEesF'), sign: '+', form: 'factor', params: [EP('G_SYMP_EES'), EP('EPI_BETA1_EES'), EP('EPI_EC50_BETA1')], note: '(1 + G_SYMP_EES·symp·kC)·(1 + EPI_BETA1_EES·β1·kC).' }),
  e({ id: 'endocrine-thermal.stress.venous', from: [SYMP], to: st('hemo.circ.ext.endoDV0Frac', 'endocrine-thermal ext endoDV0Frac'), sign: '+', form: 'term', params: [EP('G_SYMP_V0')], note: 'G_SYMP_V0·symp of blood volume, written as a fraction of the venous unstressed volume.' }),
  e({ id: 'endocrine-thermal.surge.setPoint', from: [st('endo.core.hormones.surge')], to: st('hemo.circ.ext.surgeF', 'endocrine-thermal ext surgeF'), sign: '+', form: 'factor', saturation: EP('SURGE_SET_MAX'), params: [EP('SURGE_SET_PER_NOX'), EP('SURGE_SET_MAX')], note: 'The nociceptive surge raises the baroreflex set point, 1 + min(SURGE_SET_MAX, SURGE_SET_PER_NOX·surge).' }),
  e({ id: 'endocrine-thermal.cortisol.responsiveness', from: [st('endo.core.hormones.cort')], to: st('cond.vasoResp', 'endocrine-thermal endo-write writeCond: ps.cond.vasoResp'), sign: '+', form: 'factor', params: [EP('CORT_VASO_RESP')], note: 'Catecholamine responsiveness (1 − CORT_VASO_RESP) + CORT_VASO_RESP·min(1.5, cortResponse·cort/basal), handed to the drug model.' }),
  // ---- ABSENT: the hormones as concentrations, one RAAS, the adrenal medulla fed by the one sympathetic state ----
  e({ id: 'endocrine-thermal.absent.avp', from: [st('hemo.circ.mapNow'), st('blood.out.osm')], to: ef('absent.endo.avp'), sign: '±', form: 'state', params: [], absent: 'research/44 L2-01', note: 'AVP secreted from baroreceptor unloading and osmolality, with its own clearance.' }),
  e({ id: 'endocrine-thermal.absent.avpVessels', from: [ef('absent.endo.avp')], to: st('hemo.circ.p.rSys'), sign: '+', form: 'factor', params: [], absent: 'research/44 L2-01', note: 'V1 receptor dose–response on SVR.' }),
  e({ id: 'endocrine-thermal.absent.avpVeins', from: [ef('absent.endo.avp')], to: st('hemo.circ.p.v0Sv'), sign: '−', form: 'term', params: [], absent: 'research/44 L2-01', note: 'Venous capacitance from AVP, in place of 30 % of blood volume held by a fitted fraction.' }),
  e({ id: 'endocrine-thermal.absent.renin', from: [st('hemo.circ.mapNow'), ef('absent.autonomic.sympatheticOutflow')], to: ef('absent.endo.angiotensin'), sign: '±', form: 'state', params: [], absent: 'research/44 L2-01', note: 'Renin/angiotensin II from renal perfusion pressure and sympathetic β1, shared with the kidney (research/44 L2-07: one RAAS).' }),
  e({ id: 'endocrine-thermal.absent.angiotensinVessels', from: [ef('absent.endo.angiotensin')], to: st('hemo.circ.p.rSys'), sign: '+', form: 'factor', params: [], absent: 'research/44 L2-01', note: 'AT1 receptor dose–response on SVR.' }),
  e({ id: 'endocrine-thermal.absent.adrenalMedulla', from: [ef('absent.autonomic.sympatheticOutflow')], to: EPI, sign: '+', form: 'state', params: [], absent: 'research/44 L2-02', note: 'The adrenal medulla fed by the one sympathetic state, in place of a parallel adrenal drive.' }),
];
