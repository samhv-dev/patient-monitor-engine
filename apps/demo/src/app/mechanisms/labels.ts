// The mechanism tree's clinical labels (brief 104, piece T1b): every node the coupling registry names, in the words an
// anaesthetist uses, with its unit where it has one and one sentence of meaning. The page shows these and never an
// engine key (the key stays in the tooltip). Where the clinical glossary (glossary.ts, research/11) already labels the
// key, the label is the glossary's, unchanged (`glossary: true`; labels.test.ts holds them equal to labelOf()).
//
// Why a file of its own and not more glossary.ts entries: the glossary is the clinical views' table (Explore lists
// every key it labels, research/11 numbers each entry, and a label there reaches every screen); most of these nodes are
// model internals (a reflex factor, a hand-off between modules) that must stay out of those views. This table is read
// by the tree alone, and every row is a draft until the clinical owner reviews it: `reviewed` is false on every row,
// and the page says "labels under the owner's review" while any row it draws is unreviewed.
// docs/plans/mechanism-tree-labels.md is the same table for the review, written by scripts/mechanism-labels.ts
// (`node --experimental-strip-types scripts/mechanism-labels.ts`; labels.test.ts fails when it is stale).

export interface NodeLabel {
  path: string;
  label: string;
  /** The unit, '' for none (a flag, a state, a category). A factor is "×" (1 = no change). */
  unit: string;
  meaning: string;
  /** The label is the clinical glossary's, unchanged. */
  glossary?: true;
  /** Read and accepted by the clinical owner. */
  reviewed: boolean;
}

type Row = [path: string, label: string, unit: string, meaning: string, glossary?: 'g'];
const R: readonly Row[] = [
  // ---- triggers ----
  ['trigger.bleed', 'Haemorrhage', 'mL', 'Whole blood leaving the circulation at the ordered rate.'],
  ['trigger.drug.propofol', 'Propofol bolus', 'mg/kg', 'An intravenous propofol bolus.'],
  ['trigger.drug.phenylephrine', 'Phenylephrine bolus', 'µg', 'An intravenous phenylephrine bolus (an α1 agonist).'],
  ['trigger.drug.esmolol', 'Esmolol bolus', 'mg/kg', 'An intravenous esmolol bolus (a short-acting β1 blocker).'],
  ['trigger.lungCondition.ptxTension', 'Tension pneumothorax', '', 'A one-way valve leak into the pleural space on one side.'],
  ['trigger.condition.tensionPtx', 'Tension pneumothorax (circulation alias)', '', 'The same tension pneumothorax ordered as a circulatory condition; the engine routes it to the lung condition.'],
  ['trigger.ventilation.peep', 'PEEP change on the ventilator', 'cmH₂O', 'A new positive end-expiratory pressure set on the ventilator.'],
  // ---- mechanisms the engine does not have (absent) ----
  ['absent.autonomic.baroAfferent', 'Arterial baroreceptor firing (sigmoid)', '', 'Carotid and aortic baroreceptor afferent activity as a sigmoid of pressure; the engine does not have it.'],
  ['absent.autonomic.chemoAfferent', 'Chemoreceptor firing', '', 'Carotid-body and medullary chemoreceptor afferent activity from PaO₂ and PaCO₂; the engine does not have it.'],
  ['absent.autonomic.sympatheticOutflow', 'Central sympathetic outflow', '', 'One brainstem sympathetic efferent state driving heart, vessels and veins; the engine does not have it.'],
  ['absent.ecg.epSubstrate', 'Myocardial electrophysiology', '', 'Membrane potential, conduction and refractoriness from which arrhythmias would arise; the engine does not have it.'],
  ['absent.endo.angiotensin', 'Angiotensin II', '', 'Renin–angiotensin II concentration from renal perfusion and sympathetic drive; the engine does not have it.'],
  ['absent.endo.avp', 'Vasopressin (AVP)', '', 'Plasma vasopressin from baroreceptor unloading and osmolality; the engine does not have it.'],
  // ---- blood ----
  ['blood.core.ab.ph', 'Arterial pH', '', 'Arterial pH from the strong-ion acid–base model.'],
  ['blood.core.co0', 'Resting cardiac output (settled)', 'L/min', 'The cardiac output the patient settled at before any event; drug distribution is scaled against it.'],
  ['blood.core.fl.hbG', 'Red-cell haemoglobin mass', 'g', 'The total haemoglobin mass in the circulating red cells.'],
  ['blood.core.fl.visf', 'Interstitial fluid volume', 'mL', 'The interstitial fluid that refills the plasma after a bleed.'],
  ['blood.core.fl.vp', 'Plasma volume', 'mL', 'The circulating plasma volume.'],
  ['blood.core.odc.hb', 'Hb concentration (blood model)', 'g/dL', 'Haemoglobin mass over blood volume, as the oxygen-content and viscosity models read it.'],
  ['blood.kChem', 'Contractility loss from blood chemistry', '×', 'The fraction of contractility left by acidaemia, low ionised calcium and hyperkalaemia.'],
  ['blood.out.hb', 'Hb', 'g/dL', 'Haemoglobin concentration.', 'g'],
  ['blood.out.iCa', 'iCa²⁺', 'mmol/L', 'Ionised calcium.', 'g'],
  ['blood.out.kEcg', 'Potassium at the cell membrane', 'mmol/L', 'The membrane-effective potassium the heart and the ECG respond to.'],
  ['blood.out.lactate', 'Lactate', 'mmol/L', 'Blood lactate.', 'g'],
  ['blood.out.osm', 'Osm', 'mOsm/kg', 'Plasma osmolality.', 'g'],
  // ---- baroreflex and chemoreflex ----
  ['circ.baro.cSvF', 'Baroreflex effect on venous compliance', '×', 'How much the baroreflex stiffens (or relaxes) the systemic veins.'],
  ['circ.baro.dV0', 'Baroreflex venous recruitment', 'mL', 'Blood the baroreflex moves from the unstressed venous pool into the circulating volume.'],
  ['circ.baro.eesF', 'Baroreflex effect on contractility', '×', 'The sympathetic inotropy the baroreflex adds to (or removes from) both ventricles.'],
  ['circ.baro.gains', 'Baroreflex gain modifiers', '', 'The baroreflex sensitivity as anaesthetics, β-blockade, a nociceptive surge and brainstem perfusion leave it.'],
  ['circ.baro.hrF', 'Baroreflex effect on HR (sympathetic)', '×', 'The tachycardia (or slowing) the sympathetic limb of the baroreflex asks for.'],
  ['circ.baro.rrMs', 'Baroreflex effect on RR interval (vagal)', 'ms', 'The vagal lengthening (or shortening) of the RR interval the baroreflex asks for.'],
  ['circ.baro.svrF', 'Baroreflex effect on SVR', '×', 'The arteriolar constriction (or dilation) the baroreflex asks for.'],
  ['circ.chemo.hrF', 'Chemoreflex effect on heart rate', '×', 'The heart-rate change hypoxaemia and hypercapnia cause through the chemoreflex.'],
  ['circ.chemo.svrF', 'Chemoreflex effect on SVR', '×', 'The pressor response to hypercapnia.'],
  ['hemo.circ.baro.cpLp', 'Atrial stretch receptor input', 'mmHg', 'Transmural right-atrial pressure as the low-pressure receptors sense it.'],
  ['hemo.circ.baro.es', 'Sympathetic tone', 'a.u.', 'Baroreflex sympathetic efferent activity (model units).', 'g'],
  ['hemo.circ.baro.ev', 'Vagal tone', 'a.u.', 'Baroreflex vagal efferent activity (model units).', 'g'],
  ['hemo.circ.baro.mapLp', 'Pressure the baroreceptors sense', 'mmHg', 'Mean arterial pressure corrected for pulse pressure, as the carotid and aortic receptors sense it.'],
  ['hemo.circ.baro.set', 'Baroreflex set point', 'mmHg', 'The mean arterial pressure the baroreflex defends.', 'g'],
  ['hemo.circ.chemo.paco2', 'PaCO₂ sensed by the chemoreflex', 'mmHg', 'The PaCO₂ the cardiovascular chemoreflex reads (end-tidal CO₂ plus the arterial–end-tidal gap).'],
  ['hemo.circ.chemo.sao2', 'SaO₂ sensed by the chemoreflex', 'fraction', 'The arterial oxygen saturation the cardiovascular chemoreflex reads.'],
  // ---- the circulation's effectors ----
  ['circ.endoSvr', 'Stress-hormone effect on SVR', '×', 'The vasoconstriction of the sympathetic and humoral stress response; its humoral share is lost in cardiac arrest.'],
  ['circ.kHyp', 'Hypoxic myocardial depression', '×', 'The fraction of contractility left by myocardial hypoxia.'],
  ['circ.pIt', 'Intrathoracic pressure', 'mmHg', 'The pleural pressure around the heart and great veins.'],
  ['circ.recruit', 'Splanchnic venous recruitment', 'mL', 'Blood moved from the splanchnic reservoir into the circulating volume by the reflex, β-agonist and humoral arms.'],
  ['circ.rr', 'RR interval asked of the sinus node', 's', 'The cardiac cycle length the circulation asks the rhythm for (60 / heart rate).'],
  ['circ.venousReturn', 'Venous return', 'mL/s', 'Flow back to the right heart, driven by the mean systemic venous pressure against the right-atrial pressure.'],
  ['hemo.circ.cor.hyp', 'Myocardial hypoxia', 'fraction', 'How far arterial desaturation has depressed the myocardium and the sinus node.'],
  ['hemo.circ.cor.kIsch', 'LV contractility (ischaemia)', '×', 'The fraction of left-ventricular contractility left by coronary supply below demand.'],
  ['hemo.circ.cor.kIschRv', 'RV contractility (ischaemia)', '×', 'The fraction of right-ventricular contractility left by ischaemia.'],
  ['hemo.circ.hrModel', 'Heart rate the circulation asks for', 'bpm', 'The heart rate the reflexes, drugs and hormones together set, handed to the rhythm.'],
  ['hemo.circ.kLv', 'Left-ventricular contractility', '×', 'Left-ventricular end-systolic elastance relative to rest, all inotropic influences combined.'],
  ['hemo.circ.kRv', 'Right-ventricular contractility', '×', 'Right-ventricular end-systolic elastance relative to rest, all inotropic influences combined.'],
  ['hemo.circ.mapNow', 'MAP (control step)', 'mmHg', 'Mean radial pressure, smoothed, as the hormones and the organs read it.'],
  ['hemo.circ.p.cSv', 'Cv', 'mL/mmHg', 'Systemic venous compliance.', 'g'],
  ['hemo.circ.p.pvrL', 'PVR, left lung', 'mmHg·s/mL', 'The resistance of the left lung\'s vascular bed.'],
  ['hemo.circ.p.pvrR', 'PVR, right lung', 'mmHg·s/mL', 'The resistance of the right lung\'s vascular bed.'],
  ['hemo.circ.p.rSys', 'SVR (model)', 'mmHg·s/mL', 'Systemic vascular resistance.', 'g'],
  ['hemo.circ.p.v0Sv', 'Vu', 'mL', 'Unstressed venous volume: blood in the veins that fills them without raising their pressure.', 'g'],
  ['hemo.circ.qFwd', 'Cardiac output', 'mL/s', 'Forward aortic flow: heart rate times stroke volume.'],
  ['hemo.circ.vol', 'Circulating blood volume', 'mL', 'The blood volume in the circulation after bleeding, infusion and refill.'],
  ['hemo.circOut.pAo', 'Aortic pressure', 'mmHg', 'Central aortic pressure.', 'g'],
  ['hemo.circOut.pRa', 'RAP', 'mmHg', 'Right-atrial pressure.', 'g'],
  ['hemo.circOut.pRad', 'Radial pressure', 'mmHg', 'Radial artery pressure, where the arterial line reads.', 'g'],
  ['hemo.circOut.pSv', 'Psv', 'mmHg', 'Mean systemic venous pressure: the stressed venous volume over the venous compliance.', 'g'],
  // ---- hand-offs into the circulation (another model's result, as the circulation reads it) ----
  ['hemo.circ.ext.betaAgonistU', 'β-agonist effect on the veins', 'units', 'The β-agonist drug load that recruits venous volume.'],
  ['hemo.circ.ext.cbfRel', 'Vasomotor-centre perfusion', '×', 'Cerebral blood flow relative to normal, as the circulation reads it for the brainstem\'s own supply.'],
  ['hemo.circ.ext.endoDV0Frac', 'Stress venoconstriction', 'fraction', 'The share of the unstressed venous volume sympathetic stress mobilises.'],
  ['hemo.circ.ext.endoEesF', 'Stress-hormone effect on contractility', '×', 'The inotropy of sympathetic stress and circulating epinephrine.'],
  ['hemo.circ.ext.endoHrF', 'Stress-hormone effect on heart rate', '×', 'The tachycardia of sympathetic stress and circulating epinephrine.'],
  ['hemo.circ.ext.endoHumDV0Frac', 'Humoral venous recruitment', 'fraction', 'Blood volume the humoral (vasopressin–angiotensin-like) arm holds out of the unstressed pool.'],
  ['hemo.circ.ext.endoHumSvrF', 'Humoral effect on SVR', '×', 'The vasoconstriction of the humoral arm alone, kept apart so it can fade in cardiac arrest.'],
  ['hemo.circ.ext.endoSvrF', 'Stress-hormone effect on SVR (total)', '×', 'The vasoconstriction of sympathetic stress, epinephrine, cortisol and the humoral arm together.'],
  ['hemo.circ.ext.kChem', 'Chemistry inotropy (to the heart)', '×', 'The blood model\'s chemistry factor as the four cardiac chambers read it.'],
  ['hemo.circ.ext.kEcg', 'Potassium the sinus node sees', 'mmol/L', 'The membrane-effective potassium that slows the sinus node in hyperkalaemia.'],
  ['hemo.circ.ext.kIsch', 'Ischaemic inotropy (to the heart)', '×', 'The coronary model\'s contractility loss handed to the ventricles.'],
  ['hemo.circ.ext.pPtx', 'Extra pleural pressure (test input)', 'mmHg', 'A pleural pressure added from outside the lungs; zero unless a test sets it.'],
  ['hemo.circ.ext.pvrLung', 'Lung effect on PVR', '×', 'The lungs\' global multiplier on PVR (lung disease, one-lung ventilation).'],
  ['hemo.circ.ext.pvrLungL', 'Left-lung effect on PVR', '×', 'Hypoxic vasoconstriction and collapse in the left lung, as a multiplier on its PVR.'],
  ['hemo.circ.ext.pvrLungR', 'Right-lung effect on PVR', '×', 'Hypoxic vasoconstriction and collapse in the right lung, as a multiplier on its PVR.'],
  ['hemo.circ.ext.rSysF', 'Cushing response on SVR', '×', 'The vasoconstriction of the Cushing response to a falling cerebral perfusion pressure.'],
  ['hemo.circ.ext.surgeF', 'Baroreflex set-point shift', '×', 'The baroreflex set point raised by a nociceptive surge.', 'g'],
  ['hemo.circ.ext.viscF', 'Blood viscosity effect on SVR', '×', 'The resistance change from the haematocrit\'s effect on viscosity.'],
  ['hr.to', 'Sinus rate the rhythm is asked for', 'bpm', 'The rate the rhythm generator ramps towards.'],
  ['rhythm.id', 'Cardiac rhythm', '', 'The current rhythm (sinus, an arrhythmia, a pulseless rhythm).'],
  // ---- pharmacology ----
  ['pk.betaBlockAdd', 'β-receptor blockade by drugs', 'fraction', 'The share of β-adrenoceptors a β-blocker occupies.'],
  ['pk.bus.airway.histamine', 'Histamine release', 'fraction', 'Drug-released histamine, which dilates arterioles and veins.'],
  ['pk.bus.cns.alpha2Eq', 'α2-agonist effect-site level', 'fraction', 'The α2-agonist (dexmedetomidine) load at the brain.'],
  ['pk.bus.cns.hypByClass', 'Hypnotic effect-site level by drug class', 'µg/mL', 'The propofol-equivalent hypnotic load split by class (GABA-ergic, barbiturate, etomidate, benzodiazepine, dissociative).'],
  ['pk.bus.cns.hypPropEq', 'Ce prop-eq', 'µg/mL', 'Propofol-equivalent effect-site concentration: every hypnotic given, expressed as propofol.', 'g'],
  ['pk.bus.cns.hypVentPropEq', 'Hypnotic level at the respiratory centre', 'µg/mL', 'The propofol-equivalent concentration at the ventilatory site, which depresses the drive to breathe.'],
  ['pk.bus.cns.propCe', 'Propofol effect-site concentration', 'µg/mL', 'Propofol concentration at the effect site (Eleveld model).'],
  ['pk.fx.ees', 'Drug effect on contractility', '×', 'All drugs\' direct inotropic effect together.'],
  ['pk.fx.gv', 'Drug effect on baroreflex gain', '×', 'How much anaesthetics blunt the baroreflex.'],
  ['pk.fx.gvHr', 'Drug effect on the heart-rate reflex', '×', 'How much anaesthetics blunt the reflex heart-rate response in particular.'],
  ['pk.fx.hr', 'Drug effect on heart rate', '×', 'All drugs\' direct chronotropic effect together.'],
  ['pk.fx.pvr', 'Drug effect on PVR', '×', 'All drugs\' direct effect on PVR together.'],
  ['pk.fx.setF', 'Drug effect on the baroreflex set point', '×', 'How much anaesthetics lower the pressure the baroreflex defends.'],
  ['pk.fx.svr', 'Drug effect on SVR', '×', 'All drugs\' direct arteriolar effect together (dilation or constriction).'],
  ['pk.fx.symp', 'Drug sympatholysis', '×', 'The share of sympathetic outflow the hypnotic leaves (central sympatholysis).'],
  ['pk.fx.v0Frac', 'Drug effect on venous capacity', 'fraction', 'Venodilation (or venoconstriction) by drugs, as a share of blood volume moved into (or out of) the unstressed pool.'],
  ['pk.fx.vagalMs', 'Drug vagal effect on the RR interval', 'ms', 'The RR lengthening of vagotonic drugs (opioids, neostigmine).'],
  ['cond.vasoResp', 'Vessel response to catecholamines', '×', 'How strongly the vessels answer a catecholamine, set by cortisol\'s permissive effect.'],
  // ---- endocrine ----
  ['endo.adrenalDrive', 'Adrenal medullary drive', '', 'The drive to the adrenal medulla from hypotension, hypoxaemia, hypercapnia and sympathetic stress.'],
  ['endo.cascade.macF', 'Stress effect on MAC', '×', 'The factor by which the stress state changes the MAC of the volatile agents.'],
  ['endo.core.hormones.cort', 'Cortisol', '', 'Plasma cortisol relative to basal.'],
  ['endo.core.hormones.epi', 'Epinephrine (plasma)', 'pg/mL', 'Circulating epinephrine from the adrenal medulla.'],
  ['endo.core.hormones.hum', 'Humoral pressor response', '0–1', 'The slow vasopressin–angiotensin-like response to sustained hypotension, as one arm.'],
  ['endo.core.hormones.surge', 'Stimulus surge', '0–1', 'Sympathetic surge from noxious stimulation (laryngoscopy, intubation, incision).', 'g'],
  ['endo.core.hormones.symp', 'Sympathetic stress activity', '0–1', 'Sympathetic stress activity from hypercapnia and the stress response.'],
  // ---- brain and organs ----
  ['organs.brain.cbfRel', 'Cerebral blood flow (relative to rest)', '×', 'Brain blood flow relative to normal: autoregulated, pressure-passive outside its limits.'],
  ['organs.brain.cpp', 'Cerebral perfusion pressure', 'mmHg', 'Mean arterial pressure at head height minus the intracranial (or cerebral venous) pressure.'],
  ['organs.brain.cush.drive', 'Cushing response drive', '0–1', 'The brainstem\'s pressor drive when cerebral perfusion pressure stays low.'],
  ['organs.brain.icp', 'Intracranial pressure', 'mmHg', 'Intracranial pressure.'],
  ['organs.liver.liverFn', 'Liver function (relative to normal)', '×', 'The liver\'s working share of its normal metabolic capacity, without the temperature term: 1 is a healthy liver, less is a failing one; it scales the clearance of drugs the liver metabolises.'],
  ['eeg.cortex', 'Cortical state (EEG)', '', 'The cortical state the EEG shows: hyperpolarisation, loss of responsiveness, burst suppression.'],
  ['eeg.ctx.device', 'Mains and ECG pickup for the EEG', '', 'The mains frequency and the heart\'s voltage the EEG electrodes pick up.'],
  ['eeg.signal', 'EEG trace', 'µV', 'The frontal EEG as the monitor draws it: brain signal, muscle activity and artefacts.'],
  ['mods.artefact', 'Signal artefact (diathermy, lead-off)', '', 'The artefact state the monitor\'s signals carry (diathermy, a lead off, motion).'],
  ['neuro.ageY', 'Age', 'years', 'The patient\'s age.'],
  ['neuro.airway', 'Airway (tube in or not)', '', 'Whether a tracheal tube is in place, as the arousal and EMG models read it.'],
  ['neuro.antinoc', 'Antinociception', '0–1', 'How completely analgesia blocks a noxious stimulus.'],
  ['neuro.last.tof.t1', 'TOF T1 (neuromuscular block)', 'fraction', 'The first twitch of the train-of-four relative to control.'],
  ['neuro.resp.hypnoticDep', 'Hypnotic ventilatory depression', 'fraction', 'How much the hypnotic depresses the drive to breathe.'],
  ['neuro.resp.opioidDep', 'Opioid ventilatory depression', 'fraction', 'How much the opioid depresses the drive to breathe.'],
  ['neuro.resp.totalDep', 'Total ventilatory depression', 'fraction', 'Hypnotic and opioid depression of the drive to breathe combined.'],
  ['neuro.stim.level', 'Noxious stimulation', '0–1', 'The current surgical or airway stimulus.'],
  // ---- lungs, breathing, gas exchange ----
  ['l1.coupled.etco2', 'End-tidal CO₂ (true)', 'mmHg', 'The patient\'s true end-tidal CO₂, before the capnograph samples it.'],
  ['l1.coupled.spo2', 'Arterial saturation (true)', '%', 'The patient\'s true arterial saturation, before the oximeter averages it.'],
  ['resp.co2.pf', 'PaCO₂', 'mmHg', 'Arterial CO₂ tension.', 'g'],
  ['resp.driver.vent.peep', 'PEEP', 'cmH₂O', 'The positive end-expiratory pressure set on the ventilator.', 'g'],
  ['resp.lung.aer', 'Lung aeration', 'fraction', 'The share of lung units kept open at end-expiration.'],
  ['resp.lung.lp.pPtx', 'Pleural pressure (pneumothorax)', 'mmHg', 'The pressure trapped in the pleural space by a pneumothorax.'],
  ['resp.lung.lp.pvr', 'Lung disease effect on PVR', '×', 'The pulmonary vascular resistance a lung condition sets (COPD, pulmonary hypertension, one-lung ventilation).'],
  ['resp.lung.lp.side.1.consol', 'Collapse of the right lung', 'fraction', 'The share of the right lung collapsed or consolidated.'],
  ['resp.lung.lp.tIt', 'Airway-to-pleura pressure transmission', 'fraction', 'How much of the airway pressure the lungs pass on to the pleura (lower in stiff lungs).'],
  ['resp.lung.peepTot', 'Total PEEP', 'cmH₂O', 'Set PEEP plus intrinsic PEEP from trapped gas.'],
  ['resp.lung.perf.pvrMult', 'Hypoxic pulmonary vasoconstriction', '×', 'Each lung\'s PVR multiplier from collapse and hypoxic pulmonary vasoconstriction.'],
  ['resp.lung.perf.shunt', 'Shunt fraction', 'fraction', 'The share of pulmonary blood flow passing through unventilated lung.'],
  ['resp.o2.pao2', 'PaO₂', 'mmHg', 'Arterial O₂ tension.', 'g'],
  ['resp.o2.sa', 'SaO₂', '%', 'Arterial O₂ saturation.', 'g'],
  ['resp.pleural', 'Pleural pressure', 'mmHg', 'The pleural pressure the lungs hand to the circulation (ventilation, PEEP, pneumothorax).'],
  ['resp.spont.rr', 'RR (spont)', '/min', 'Spontaneous respiratory rate.', 'g'],
  ['resp.spont.ve', 'V̇E', 'L/min', 'Spontaneous minute ventilation.', 'g'],
  ['resp.spont.vt', 'VT', 'mL', 'Spontaneous tidal volume.', 'g'],
  ['resp.temp.tc', 'Tcore', '°C', 'Core temperature.', 'g'],
  // ---- the monitor (the device layer: what the monitor shows) ----
  ['mon.abpMean', 'ART M', 'mmHg', 'The monitor\'s invasive mean arterial pressure (the radial line\'s beat-averaged mean).', 'g'],
  ['mon.abpSys', 'ART S', 'mmHg', 'The monitor\'s invasive systolic arterial pressure.', 'g'],
  ['mon.etco2', 'EtCO₂', 'mmHg', 'The capnograph\'s end-tidal CO₂.', 'g'],
  ['mon.hr', 'HR', 'bpm', 'The monitor\'s heart rate, counted from the ECG\'s QRS complexes.', 'g'],
  ['mon.rr', 'RR', '/min', 'The monitor\'s respiratory rate.', 'g'],
  ['mon.spo2', 'SpO₂', '%', 'The pulse oximeter\'s averaged saturation.', 'g'],
];

/** Every row, in the order above; `reviewed` false until the owner reads it. */
export const NODE_LABELS: readonly NodeLabel[] = R.map(([path, label, unit, meaning, g]) => ({ path, label, unit, meaning, ...(g ? { glossary: true as const } : {}), reviewed: false }));
const BY_PATH = new Map(NODE_LABELS.map((l) => [l.path, l]));
export const nodeLabel = (path: string): NodeLabel | undefined => BY_PATH.get(path);

/** The review line the page shows while a drawn label is unreviewed (as the Persian draft line does). */
export const REVIEW_LINE = "labels under the owner's review";

const cell = (s: string): string => s.replace(/\|/g, '\\|');
/** The table as docs/plans/mechanism-tree-labels.md prints it (scripts/mechanism-labels.ts writes it). */
export function labelsTable(): string {
  const head = '| Engine key | Clinical label | Unit | Meaning | From | reviewed |\n|---|---|---|---|---|---|';
  return [head, ...NODE_LABELS.map((l) => `| \`${l.path}\` | ${cell(l.label)} | ${cell(l.unit) || '—'} | ${cell(l.meaning)} | ${l.glossary ? 'glossary' : 'tree'} | ${l.reviewed} |`)].join('\n');
}
