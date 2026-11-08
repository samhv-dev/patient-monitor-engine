// The circulation's couplings on the paths of the six first triggers (docs/plans/mechanism-tree.md §7 R1): the
// baroreflex, the chemoreflex, the effector products of l2/circ/model.ts's control step (rSys, v0Sv, cSv, pvrL/R,
// kLv/kRv, the model RR) and the circuit's venous return. Read from the code as it is; ABSENT rows draw the autonomic
// hub research/44 L2-02–L2-05 finds missing.
import { ef, st, tr } from './nodes.ts';
import type { ConstRef, Coupling } from './types.ts';

const BR = (n: string): ConstRef => `l2/circ/baroreflex.ts#${n}`;
const PA = (n: string): ConstRef => `l2/circ/params.ts#${n}`;
const MO = (n: string): ConstRef => `l2/circ/model.ts#${n}`;
const CO = (n: string): ConstRef => `l2/circ/coronary.ts#${n}`;
const DRUG = 'engine-runtime ext drug';
const BBA = st('pk.betaBlockAdd', 'engine-runtime ext betaBlockAdd');
const GAINS = ef('circ.baro.gains');
const ES = st('hemo.circ.baro.es');
const RR = ef('circ.rr');
const RSYS = st('hemo.circ.p.rSys');
const V0SV = st('hemo.circ.p.v0Sv');
const RECRUIT = ef('circ.recruit');
const KLV = st('hemo.circ.kLv');
const KRV = st('hemo.circ.kRv');
const HUB = ef('absent.autonomic.sympatheticOutflow');
const c = (row: Omit<Coupling, 'module'>): Coupling => ({ module: 'circulation', ...row });

export const CIRCULATION: readonly Coupling[] = [
  // ---- volume, venous return, output, arterial pressure ----
  c({ id: 'circulation.volume', from: [st('hemo.circ.vol')], to: st('hemo.circOut.pSv'), sign: '+', form: 'term', params: [PA('C_SV')], note: 'The volume queue (bleed −, infusion +) integrates into the systemic venous volume; its pressure is the stressed volume over the venous compliance.' }),
  c({ id: 'circulation.venousReturn', from: [st('hemo.circOut.pSv'), st('hemo.circOut.pRa')], to: ef('circ.venousReturn'), sign: '±', form: 'term', params: [PA('R_VR'), PA('R_VR_BACK')], note: 'Venous return = (pSv − pRa) / rVr, retrograde flow through R_VR_BACK × rVr: rises with pSv, falls with pRa.' }),
  c({ id: 'circulation.intrathoracic', from: [ef('resp.pleural', 'pressure-waveforms ctx advanceHemo.pIt'), st('hemo.circ.ext.pPtx')], to: ef('circ.pIt'), sign: '+', form: 'term', params: [], note: 'The heart sees the lungs\' pleural pressure plus ext.pPtx (0 unless a test pokes it: the lungs own the one tension-PTX source).' }),
  c({ id: 'circulation.intrathoracicRa', from: [ef('circ.pIt')], to: st('hemo.circOut.pRa'), sign: '+', form: 'term', params: [], note: 'The intrathoracic chambers are referenced to pIt: a higher pIt raises the right-atrial pressure and so lowers the venous-return gradient.' }),
  c({ id: 'circulation.output', from: [ef('circ.venousReturn'), KLV], to: st('hemo.circ.qFwd'), sign: '+', form: 'state', tau: MO('CO_TAU_S'), params: [PA('EES_LV'), PA('V0_LV'), PA('BETA_LV'), PA('A_LV')], note: 'Forward aortic flow from the time-varying-elastance LV (Emax × kLv) filled by the venous return; qFwd is its low-pass.' }),
  c({ id: 'circulation.arterial', from: [st('hemo.circ.qFwd'), RSYS], to: st('hemo.circOut.pRad'), sign: '+', form: 'state', params: [PA('ZC_AO')], note: 'Arterial pressure from the ejected flow into the arterial compliance draining through rSys.' }),
  c({ id: 'circulation.mapNow', from: [st('hemo.circOut.pRad')], to: st('hemo.circ.mapNow'), sign: '+', form: 'state', tau: MO('MAP_NOW_TAU_S'), params: [], note: 'Mean radial pressure low-passed at the 10 Hz control step (the endocrine and organ models read it).' }),
  // ---- the arterial and cardiopulmonary baroreflex (l2/circ/baroreflex.ts) ----
  c({ id: 'circulation.baro.sense', from: [st('hemo.circOut.pRad')], to: st('hemo.circ.baro.mapLp'), sign: '+', form: 'state', tau: BR('MAP_TAU_S'), params: [BR('K_PP')], note: 'Sensed pressure = MAP + K_PP·(PP − PP_rest), low-passed: a narrower pulse pressure unloads the receptors at the same mean.' }),
  c({ id: 'circulation.baro.reset', from: [st('hemo.circ.baro.mapLp')], to: st('hemo.circ.baro.set'), sign: '+', form: 'state', delay: BR('RESET_HOLD_S'), params: [BR('RESET_FRAC'), BR('RESET_HOLD_S'), BR('RESET_GAIN')], note: 'Resetting: MAP more than RESET_FRAC off the set for RESET_HOLD_S moves the set RESET_GAIN of the way.' }),
  c({ id: 'circulation.baro.errorSymp', from: [st('hemo.circ.baro.set'), st('hemo.circ.baro.mapLp')], to: ES, sign: '±', form: 'state', delay: BR('SYMP_DELAY_S'), tau: BR('SYMP_TAU_S'), params: [BR('BARO_DT')], note: 'e = set·setF − MAP (+ = hypotension), delayed and low-passed for the sympathetic limb.' }),
  c({ id: 'circulation.baro.errorVagal', from: [st('hemo.circ.baro.set'), st('hemo.circ.baro.mapLp')], to: st('hemo.circ.baro.ev'), sign: '±', form: 'state', delay: BR('VAGAL_DELAY_S'), tau: BR('VAGAL_TAU_S'), params: [BR('BARO_DT')], note: 'The same error, delayed and low-passed for the fast vagal limb.' }),
  c({ id: 'circulation.baro.cardiopulmonary', from: [st('hemo.circOut.pRa')], to: st('hemo.circ.baro.cpLp'), sign: '+', form: 'state', tau: BR('CP_TAU_S'), params: [], note: 'The low-pressure limb senses the transmural right-atrial pressure, low-passed.' }),
  c({ id: 'circulation.baro.gainDrug', from: [st('pk.fx.gv', DRUG)], to: GAINS, sign: '+', form: 'gain', params: [], note: 'gVagal and gSymp × the drug model\'s reflex factor gv (propofol, volatiles lower it).' }),
  c({ id: 'circulation.baro.gainHr', from: [st('pk.fx.gvHr', DRUG)], to: GAINS, sign: '+', form: 'gain', params: [], note: 'hrGain: × on the sympathetic HR arm only (drug depression of the chronotropic reflex).' }),
  c({ id: 'circulation.baro.gainOutput', from: [st('pk.fx.symp', DRUG)], to: GAINS, sign: '+', form: 'gain', params: [BR('TONIC_EES_SHARE')], note: 'outF: × on the delivered sympathetic output after saturation; it also removes the profile\'s tonic share of resting SVR and contractility (central sympatholysis).' }),
  c({ id: 'circulation.baro.gainSetPoint', from: [st('pk.fx.setF', DRUG), st('hemo.circ.ext.surgeF', 'endocrine-thermal ext surgeF')], to: GAINS, sign: '+', form: 'gain', params: [], note: 'setF: × on the set point the error is taken against (anaesthetic resetting, the nociceptive surge).' }),
  c({ id: 'circulation.baro.gainBeta', from: [BBA], to: GAINS, sign: '−', form: 'gain', params: [], note: 'betaBlock and betaBlockC = min(0.95, profile + betaBlockAdd·(1 − profile)): remove the β-mediated HR and contractility gain (the 0.95 cap is inline).' }),
  c({ id: 'circulation.baro.gainBrainstem', from: [st('hemo.circ.ext.cbfRel', 'organs ext cbfRel')], to: GAINS, sign: '+', form: 'threshold', params: [BR('CBF_REFLEX_FULL'), BR('CBF_REFLEX_ZERO')], note: 'brainF: the vasomotor centre fails linearly between CBF_REFLEX_FULL and CBF_REFLEX_ZERO of normal cerebral flow.' }),
  c({ id: 'circulation.baro.hr', from: [ES, GAINS], to: ef('circ.baro.hrF'), sign: '+', form: 'factor', saturation: BR('SYMP_SAT'), blockedBy: BBA, params: [BR('G_HS'), BR('SYMP_WITHDRAW_HR')], note: 'HR × (1 + o·clamp(G_HS·gSymp·hrGain·(1 − betaBlock)·e_s)), withdrawal × SYMP_WITHDRAW_HR.' }),
  c({ id: 'circulation.baro.svr', from: [ES, GAINS], to: ef('circ.baro.svrF'), sign: '+', form: 'factor', saturation: BR('SYMP_SAT'), params: [BR('G_R'), BR('SYMP_WITHDRAW')], note: 'SVR × (1 − tonic·(1 − outF) + o·clamp(G_R·s·e_s + G_CP_R·s·e_cp)).' }),
  c({ id: 'circulation.baro.svrCardiopulmonary', from: [st('hemo.circ.baro.cpLp'), GAINS], to: ef('circ.baro.svrF'), sign: '−', form: 'factor', saturation: BR('CP_CLAMP'), params: [BR('G_CP_R'), BR('SYMP_WITHDRAW')], note: 'Unloading the atrial receptors (e_cp = set − RA_tm) constricts before the arterial pressure falls.' }),
  c({ id: 'circulation.baro.ees', from: [ES, GAINS], to: ef('circ.baro.eesF'), sign: '+', form: 'factor', saturation: BR('SYMP_SAT'), blockedBy: BBA, params: [BR('G_C'), BR('SYMP_WITHDRAW'), BR('TONIC_EES_SHARE')], note: 'Contractility × (1 − TONIC_EES_SHARE·tonic·(1 − outF) + o·clamp(G_C·s·(1 − betaBlockC)·e_s)).' }),
  c({ id: 'circulation.baro.venous', from: [ES, GAINS], to: ef('circ.baro.dV0'), sign: '−', form: 'term', saturation: BR('V0_RECRUIT_MAX_ML_KG'), params: [BR('G_V'), BR('SYMP_WITHDRAW')], note: 'Venous unstressed volume −G_V·W/70·s·e_s mL (e_s clamped at ±40 mmHg inline): hypotension recruits.' }),
  c({ id: 'circulation.baro.venousCardiopulmonary', from: [st('hemo.circ.baro.cpLp'), GAINS], to: ef('circ.baro.dV0'), sign: '+', form: 'term', saturation: BR('CP_CLAMP'), params: [BR('G_CP_V')], note: 'Atrial unloading recruits splanchnic volume (−G_CP_V·W/70·s·e_cp).' }),
  c({ id: 'circulation.baro.compliance', from: [ES, GAINS], to: ef('circ.baro.cSvF'), sign: '−', form: 'factor', saturation: BR('SYMP_SAT'), params: [BR('G_CSV')], note: 'Venous compliance × (1 − 0.5·o·clamp(G_CSV·s·e_s)) (the 0.5 is inline).' }),
  c({ id: 'circulation.baro.vagal', from: [st('hemo.circ.baro.ev'), GAINS], to: ef('circ.baro.rrMs'), sign: '−', form: 'term', saturation: BR('VAGAL_MAX_MS'), params: [BR('VAGAL_STEADY'), BR('VAGAL_MAX_MS'), BR('VAGAL_WITHDRAW_MS')], note: 'RR += −VAGAL_STEADY·gVagal·e_v ms, between −VAGAL_WITHDRAW_MS and +VAGAL_MAX_MS.' }),
  // ---- the chemoreflex (l2/circ/model.ts chemoFactors) ----
  c({ id: 'circulation.chemo.hr', from: [st('hemo.circ.chemo.sao2'), st('hemo.circ.chemo.paco2')], to: ef('circ.chemo.hrF'), sign: '±', form: 'factor', params: [], note: 'Hypoxic HR × (brady in neonate/infant or SaO2 < 0.6, else tachy) and hypercapnic × (1 + 1 %/mmHg above 50, cap 20 %). Its numbers are inline literals tagged FIT in the code (research/44 L2-04), not exported constants: no row can name them.' }),
  c({ id: 'circulation.chemo.svr', from: [st('hemo.circ.chemo.paco2')], to: ef('circ.chemo.svrF'), sign: '+', form: 'factor', params: [], note: 'Hypercapnic pressor SVR × (1 + 1 %/mmHg above 50, cap 20 %); inline FIT literals (research/44 L2-04).' }),
  c({ id: 'circulation.chemo.pvrL', from: [st('hemo.circ.chemo.paco2')], to: st('hemo.circ.p.pvrL'), sign: '+', form: 'factor', params: [PA('K_PVR_CO2')], note: 'Hypercapnic pulmonary vasoconstriction × (1 + K_PVR_CO2·(PaCO2 − 40)⁺), off while the instructor pins PVR.' }),
  c({ id: 'circulation.chemo.pvrR', from: [st('hemo.circ.chemo.paco2')], to: st('hemo.circ.p.pvrR'), sign: '+', form: 'factor', params: [PA('K_PVR_CO2')], note: 'As circulation.chemo.pvrL, right bed.' }),
  // ---- systemic resistance p.rSys (seven factors) ----
  c({ id: 'circulation.rSys.baro', from: [ef('circ.baro.svrF')], to: RSYS, sign: '+', form: 'factor', params: [], note: 'b.svrF, the baroreflex factor.' }),
  c({ id: 'circulation.rSys.drug', from: [st('pk.fx.svr', DRUG)], to: RSYS, sign: '+', form: 'factor', params: [], note: 'de.svr: the bolus list × the drug model\'s svr multiplier.' }),
  c({ id: 'circulation.rSys.histamine', from: [st('pk.bus.airway.histamine', 'engine-runtime ext histamine', 'engine-runtime bus-read bus.airway.histamine')], to: RSYS, sign: '−', form: 'factor', params: [PA('HIST_SVR')], note: 'de.svr × (1 − HIST_SVR·histamine): drug-released histamine dilates.' }),
  c({ id: 'circulation.rSys.chemo', from: [ef('circ.chemo.svrF')], to: RSYS, sign: '+', form: 'factor', params: [], note: 'ch.svrF, the chemoreflex factor.' }),
  c({ id: 'circulation.rSys.cushing', from: [st('hemo.circ.ext.rSysF', 'organs ext rSysF')], to: RSYS, sign: '+', form: 'factor', params: [], note: 'x.rSysF, the Cushing response (organs).' }),
  c({ id: 'circulation.rSys.endocrine', from: [ef('circ.endoSvr')], to: RSYS, sign: '+', form: 'factor', params: [], note: 'endoSvr, the endocrine factor with its humoral share withdrawn under arrest.' }),
  c({ id: 'circulation.rSys.viscosity', from: [st('hemo.circ.ext.viscF', 'blood ext viscF')], to: RSYS, sign: '+', form: 'factor', params: [], note: 'x.viscF, blood viscosity from the haematocrit (blood).' }),
  c({ id: 'circulation.endoSvr', from: [st('hemo.circ.ext.endoSvrF', 'endocrine-thermal ext endoSvrF'), st('hemo.circ.ext.endoHumSvrF', 'endocrine-thermal ext endoHumSvrF')], to: ef('circ.endoSvr'), sign: '+', form: 'factor', params: ['l2/circ/arrest.ts#NO_FLOW_S'], note: 'endoSvrF with its humoral share 1 + (hsv − 1)·humF, humF ramped to 0 over NO_FLOW_S of a declared arrest (ischaemic vasoplegia).' }),
  // ---- venous unstressed volume p.v0Sv and compliance p.cSv ----
  c({ id: 'circulation.recruit.baro', from: [ef('circ.baro.dV0')], to: RECRUIT, sign: '+', form: 'term', params: [], note: 'b.dV0 into the one splanchnic reservoir.' }),
  c({ id: 'circulation.recruit.betaAgonist', from: [st('hemo.circ.ext.betaAgonistU', 'engine-runtime ext betaAgonistU')], to: RECRUIT, sign: '−', form: 'term', blockedBy: BBA, params: [BR('V0_RECRUIT_MAX_ML_KG')], note: 'β-agonist venous recruitment hill(u, competitive EC50 of the β occupancy) × BETA_V0_MAX_ML_KG·W (venous.ts; an alias of V0_RECRUIT_MAX_ML_KG).' }),
  c({ id: 'circulation.recruit.humoral', from: [st('hemo.circ.ext.endoHumDV0Frac', 'endocrine-thermal ext endoHumDV0Frac')], to: RECRUIT, sign: '+', form: 'term', params: [], note: 'The humoral arm\'s recruitment, a fraction of blood volume; kept through an arrest (mechanics, not a delivered effect).' }),
  c({ id: 'circulation.v0Sv.recruit', from: [RECRUIT], to: V0SV, sign: '+', form: 'term', saturation: BR('V0_RECRUIT_MAX_ML_KG'), params: [BR('V0_RECRUIT_MAX_ML_KG')], note: 'recruit = max(−V0_RECRUIT_MAX_ML_KG·W, min(b.dV0 − dv0Beta, humMl)).' }),
  c({ id: 'circulation.v0Sv.endocrine', from: [st('hemo.circ.ext.endoDV0Frac', 'endocrine-thermal ext endoDV0Frac')], to: V0SV, sign: '−', form: 'factor', params: [], note: 'base.v0Sv × (1 − endoDV0Frac): sympathetic stress venoconstriction.' }),
  c({ id: 'circulation.v0Sv.drug', from: [st('pk.fx.v0Frac', DRUG), st('pk.bus.airway.histamine')], to: V0SV, sign: '+', form: 'term', params: [PA('HIST_V0')], note: 'de.v0Frac × blood volume: drug venodilation (+) or venoconstriction (−), plus HIST_V0·histamine.' }),
  c({ id: 'circulation.cSv.baro', from: [ef('circ.baro.cSvF')], to: st('hemo.circ.p.cSv'), sign: '+', form: 'factor', params: [], note: 'base.cSv × b.cSvF.' }),
  // ---- pulmonary resistance p.pvrL / p.pvrR ----
  c({ id: 'circulation.pvrL.drug', from: [st('pk.fx.pvr', DRUG)], to: st('hemo.circ.p.pvrL'), sign: '+', form: 'factor', params: [], note: 'de.pvr.' }),
  c({ id: 'circulation.pvrR.drug', from: [st('pk.fx.pvr', DRUG)], to: st('hemo.circ.p.pvrR'), sign: '+', form: 'factor', params: [], note: 'de.pvr.' }),
  c({ id: 'circulation.pvrL.lung', from: [st('hemo.circ.ext.pvrLung', 'lungs ext pvrLung'), st('hemo.circ.ext.pvrLungL', 'lungs ext pvrLungL')], to: st('hemo.circ.p.pvrL'), sign: '+', form: 'factor', params: [], note: 'The lungs\' global × per-side multipliers (HPV, collapse).' }),
  c({ id: 'circulation.pvrR.lung', from: [st('hemo.circ.ext.pvrLung', 'lungs ext pvrLung'), st('hemo.circ.ext.pvrLungR', 'lungs ext pvrLungR')], to: st('hemo.circ.p.pvrR'), sign: '+', form: 'factor', params: [], note: 'As circulation.pvrL.lung, right bed.' }),
  // ---- contractility m.kLv / m.kRv (eight factors each) ----
  c({ id: 'circulation.kLv.baro', from: [ef('circ.baro.eesF')], to: KLV, sign: '+', form: 'factor', params: [], note: 'b.eesF.' }),
  c({ id: 'circulation.kLv.drug', from: [st('pk.fx.ees', DRUG)], to: KLV, sign: '+', form: 'factor', params: [], note: 'de.ees.' }),
  c({ id: 'circulation.kLv.ischaemia', from: [st('hemo.circ.ext.kIsch', 'pressure-waveforms ext kIsch')], to: KLV, sign: '+', form: 'factor', params: [CO('G_ISCH')], note: 'min(kIsch, kIschRef); ischaemic diastolic stiffening β_LV × (1 + 0.5·(1 − kIsch)/G_ISCH) beside it.' }),
  c({ id: 'circulation.kLv.endocrine', from: [st('hemo.circ.ext.endoEesF', 'endocrine-thermal ext endoEesF')], to: KLV, sign: '+', form: 'factor', blockedBy: BBA, params: [], note: 'betaBlunt(endoEesF, betaBlockAdd): β-blockade blunts the surge.' }),
  c({ id: 'circulation.kLv.chemistry', from: [st('hemo.circ.ext.kChem', 'blood ext kChem')], to: KLV, sign: '+', form: 'factor', params: [], note: 'kChem: pH, ionised Ca and K (blood).' }),
  c({ id: 'circulation.kLv.hypoxia', from: [ef('circ.kHyp')], to: KLV, sign: '+', form: 'factor', params: [], note: 'kHyp, hypoxic myocardial depression.' }),
  c({ id: 'circulation.kRv.baro', from: [ef('circ.baro.eesF')], to: KRV, sign: '+', form: 'factor', params: [], note: 'b.eesF.' }),
  c({ id: 'circulation.kRv.drug', from: [st('pk.fx.ees', DRUG)], to: KRV, sign: '+', form: 'factor', params: [], note: 'de.ees.' }),
  c({ id: 'circulation.kRv.ischaemia', from: [st('hemo.circ.cor.kIschRv')], to: KRV, sign: '+', form: 'factor', params: [], note: 'RV ischaemia (MODELED).' }),
  c({ id: 'circulation.kRv.endocrine', from: [st('hemo.circ.ext.endoEesF', 'endocrine-thermal ext endoEesF')], to: KRV, sign: '+', form: 'factor', blockedBy: BBA, params: [], note: 'betaBlunt(endoEesF, betaBlockAdd).' }),
  c({ id: 'circulation.kRv.chemistry', from: [st('hemo.circ.ext.kChem', 'blood ext kChem')], to: KRV, sign: '+', form: 'factor', params: [], note: 'kChem.' }),
  c({ id: 'circulation.kRv.hypoxia', from: [ef('circ.kHyp')], to: KRV, sign: '+', form: 'factor', params: [], note: 'kHyp.' }),
  c({ id: 'circulation.kHyp', from: [st('hemo.circ.cor.hyp')], to: ef('circ.kHyp'), sign: '−', form: 'factor', saturation: MO('K_HYP_MIN'), params: [MO('K_HYP_MIN')], note: 'kHyp = max(K_HYP_MIN, 1 − cor.hyp).' }),
  c({ id: 'circulation.coronary.ischaemia', from: [st('hemo.circOut.pAo'), st('hemo.circOut.pRa')], to: st('hemo.circ.cor.kIsch'), sign: '+', form: 'state', params: [CO('G_ISCH'), CO('P_ZF'), CO('TAU_ISCH_DOWN_S'), CO('TAU_ISCH_UP_S')], note: 'Coronary supply from the relaxation-phase perfusion pressure against demand; the contractility loss kIsch = 1 − G_ISCH·δ follows with its two time constants.' }),
  c({ id: 'circulation.coronary.hypoxia', from: [st('hemo.circ.chemo.sao2')], to: st('hemo.circ.cor.hyp'), sign: '−', form: 'state', params: [CO('SAO2_REF'), CO('TAU_HYP_S')], note: 'Hypoxic myocardial depression from SaO2 below SAO2_REF.' }),
  // ---- the model RR (the HR set the rhythm clock is asked for) ----
  c({ id: 'circulation.rr.baro', from: [ef('circ.baro.hrF')], to: RR, sign: '−', form: 'factor', params: [], note: 'RR = 60/(hrRest·b.hrF·…): a higher HR factor shortens RR.' }),
  c({ id: 'circulation.rr.vagal', from: [ef('circ.baro.rrMs')], to: RR, sign: '+', form: 'term', params: [], note: '+ b.rrMs/1000, additive at the SA node.' }),
  c({ id: 'circulation.rr.drug', from: [st('pk.fx.hr', DRUG)], to: RR, sign: '−', form: 'factor', params: [], note: 'de.hr (esmolol lowers it).' }),
  c({ id: 'circulation.rr.drugVagal', from: [st('pk.fx.vagalMs', DRUG)], to: RR, sign: '+', form: 'term', params: [], note: '+ de.vagalMs/1000 (opioids, neostigmine), already × (1 − muscarinic occupancy).' }),
  c({ id: 'circulation.rr.chemo', from: [ef('circ.chemo.hrF')], to: RR, sign: '−', form: 'factor', params: [], note: 'ch.hrF.' }),
  c({ id: 'circulation.rr.endocrine', from: [st('hemo.circ.ext.endoHrF', 'endocrine-thermal ext endoHrF')], to: RR, sign: '−', form: 'factor', blockedBy: BBA, params: [], note: 'betaBlunt(endoHrF, betaBlockAdd).' }),
  c({ id: 'circulation.rr.hypoxia', from: [st('hemo.circ.cor.hyp')], to: RR, sign: '+', form: 'factor', params: [MO('G_SA')], note: 'Hypoxic SA-node depression hypF = max(0.05, 1 − G_SA·hyp − kSa).' }),
  c({ id: 'circulation.rr.potassium', from: [st('hemo.circ.ext.kEcg', 'blood ext kEcg')], to: RR, sign: '+', form: 'threshold', params: [MO('G_SA_K')], note: 'SA-node slowing G_SA_K per mmol/L of membrane-effective K above 7 (inline), inside hypF.' }),
  c({ id: 'circulation.hrModel', from: [RR], to: st('hemo.circ.hrModel'), sign: '−', form: 'state', params: [], note: 'hrModel = min(hrMax, max(30, 60/RR)).' }),
  // ---- the tension-pneumothorax alias (l2/circ/aliases.ts) ----
  c({ id: 'circulation.tensionPtxAlias', from: [tr('trigger.condition.tensionPtx')], to: st('resp.lung.lp.pPtx'), sign: '+', form: 'state', params: ['../data/lung-pathology.ts#LUNG_CONDITIONS.ptxTension'], note: 'The circulation\'s tensionPtx is routed to the lung condition ptxTension (side R): the lungs\' pleural pressure is the one source.' }),
  // ---- ABSENT: the autonomic hub (research/44 L2-02–L2-04) and the arrest substrate (L2-05) ----
  c({ id: 'circulation.absent.baroAfferent', from: [st('hemo.circOut.pRad')], to: ef('absent.autonomic.baroAfferent'), sign: '+', form: 'state', params: [], absent: 'research/44 L2-03', note: 'A sigmoid baroreceptor afferent (Kent/Ursino form) whose operating point gives the activation/withdrawal asymmetry, in place of linear gains with fixed asymmetry multipliers.' }),
  c({ id: 'circulation.absent.baroToHub', from: [ef('absent.autonomic.baroAfferent')], to: HUB, sign: '−', form: 'factor', params: [], absent: 'research/44 L2-03', note: 'The baroreceptor afferent inhibiting one central sympathetic efferent state.' }),
  c({ id: 'circulation.absent.chemoAfferent', from: [st('resp.o2.pao2'), st('resp.co2.pf')], to: ef('absent.autonomic.chemoAfferent'), sign: '±', form: 'state', params: [], absent: 'research/44 L2-04', note: 'Carotid and central chemoreceptor firing from PaO2 and PaCO2.' }),
  c({ id: 'circulation.absent.chemoToHub', from: [ef('absent.autonomic.chemoAfferent')], to: HUB, sign: '+', form: 'factor', params: [], absent: 'research/44 L2-04', note: 'The chemoreceptor afferent feeding the same sympathetic state (today: three parallel paths, chemoFactors, the endocrine hypercapnia term and the adrenal drives).' }),
  c({ id: 'circulation.absent.chemoVagal', from: [ef('absent.autonomic.chemoAfferent'), st('resp.spont.vt')], to: RR, sign: '±', form: 'factor', params: [], absent: 'research/44 L2-04', note: 'Primary hypoxic bradycardia against the secondary tachycardia of lung inflation, in place of the age-band switch.' }),
  c({ id: 'circulation.absent.hubToSaNode', from: [HUB], to: RR, sign: '−', form: 'factor', params: [], absent: 'research/44 L2-02', note: 'The SA node reads the one sympathetic state.' }),
  c({ id: 'circulation.absent.hubToVessels', from: [HUB], to: RSYS, sign: '+', form: 'factor', params: [], absent: 'research/44 L2-02', note: 'Vasomotor tone reads the one sympathetic state.' }),
  c({ id: 'circulation.absent.hubToHeart', from: [HUB], to: KLV, sign: '+', form: 'factor', params: [], absent: 'research/44 L2-02', note: 'Contractility reads the one sympathetic state.' }),
  c({ id: 'circulation.absent.hubToVeins', from: [HUB], to: V0SV, sign: '−', form: 'term', params: [], absent: 'research/44 L2-02', note: 'Venous tone reads the one sympathetic state.' }),
  c({ id: 'circulation.absent.epSubstrate', from: [st('blood.out.kEcg'), st('hemo.circ.cor.kIsch'), st('resp.temp.tc')], to: ef('absent.ecg.epSubstrate'), sign: '±', form: 'state', params: [], absent: 'research/44 L2-05', note: 'Resting membrane potential from K, conduction and refractoriness by temperature, ischaemic depolarisation from the coronary model.' }),
  c({ id: 'circulation.absent.epToRhythm', from: [ef('absent.ecg.epSubstrate')], to: st('rhythm.id'), sign: '±', form: 'threshold', params: [], absent: 'research/44 L2-05', note: 'VF, asystole and ROSC out of that substrate, in place of hazard timers on K, temperature and catecholamines.' }),
];
