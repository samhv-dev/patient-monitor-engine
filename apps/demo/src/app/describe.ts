// One clinical line per command, for the instructor log, toasts and the Remote (research/13 brief §7 "Toast": the same
// verb as the button). Engine ids never reach these lines: targets through the glossary, drugs by the library's name,
// conditions and rhythms by their catalogue labels.
import { DRUGS, LUNG_CONDITIONS, RHYTHM_IDS } from '@pme/engine-core';
import { unitText } from './drugs.ts';
import { drugName } from './glossary.ts';
import { showVital, vitalLabel, vitalOf } from './vitals.ts';
import { rhythmLabel } from './rhythms.ts';

type Any = Record<string, unknown>;
const num = (x: unknown): number => (typeof x === 'number' ? x : Number.NaN);
const drug = (id: unknown): string => (DRUGS[String(id)] ? drugName(String(id)) : 'Drug'); // the site's name set (ruling 5)
const over = (s: unknown): string => {
  const n = num(s);
  if (!(n > 0)) return '';
  return n >= 60 ? ` over ${+(n / 60).toFixed(1)} min` : ` over ${n} s`;
};
const grade = (sev: unknown): string => {
  const s = num(sev);
  return s <= 0 ? 'removed' : s < 0.45 ? 'mild' : s < 0.8 ? 'moderate' : 'severe';
};
export const CONDITIONS: Readonly<Record<string, string>> = {
  tamponade: 'Cardiac tamponade', pe: 'Pulmonary embolism', tensionPtx: 'Tension pneumothorax', rvInfarct: 'Right-ventricular infarction',
  anaphylaxis: 'Anaphylaxis', mh: 'Malignant hyperthermia', last: 'Local anaesthetic toxicity', burns: 'Burns', dka: 'Diabetic ketoacidosis', sepsis: 'Sepsis',
};
export const SENSORS: Readonly<Record<string, string>> = {
  ecg: 'ECG leads', spo2: 'SpO₂ probe', nibp: 'NIBP cuff', abp: 'Arterial line', cvp: 'CVP line', pap: 'PA catheter', co2: 'CO₂ sampling line', temp: 'Temperature probe',
};
const AIRWAY: Readonly<Record<string, string>> = {
  patent: 'patent', obstructed: 'obstructed', apnoea: 'apnoeic', disconnected: 'disconnected', oesophageal: 'tube in the oesophagus',
  endobronchial: 'tube endobronchial', bronchospasm: 'bronchospasm',
};

function event(e: Any): string {
  switch (e.kind) {
    case 'drug':
      return `${drug(e.drugId)} ${e.dose} ${unitText(String(e.unit))} ${e.route === 'iv' || e.route === undefined ? 'IV' : String(e.route).toUpperCase()}`;
    case 'infusion':
      return num(e.rate) > 0 ? `${drug(e.drugId)} ${e.rate} ${unitText(String(e.unit))} infusion started` : `${drug(e.drugId)} infusion stopped`;
    case 'tci':
      return num(e.target) > 0 ? `${drug(e.drugId)} target-controlled infusion, ${e.mode === 'effect' ? 'effect-site' : 'plasma'} target ${e.target}` : `${drug(e.drugId)} target-controlled infusion stopped`;
    case 'vaporiser':
      return num(e.dialPct) > 0 ? `${drug(e.agent)} ${e.dialPct} % at ${e.fgfLpm} L/min fresh gas` : `${drug(e.agent)} vaporiser off`;
    case 'fluid':
      return `${String(e.fluid) === 'blood' ? 'Blood' : String(e.fluid) === 'colloid' ? 'Colloid' : 'Crystalloid'} ${e.volumeMl} mL${over(e.overS)}`;
    case 'bleed':
      return e.rateMlPerMin !== undefined ? `Bleeding ${e.rateMlPerMin} mL/min` : `Blood loss ${e.volumeMl} mL${over(e.overS)}`;
    case 'airway':
      return `Airway ${AIRWAY[String(e.state)] ?? 'changed'}`;
    case 'ventilation':
      return e.source === 'ventilator' || e.source === 'bvm'
        ? `${e.source === 'bvm' ? 'Bag-mask' : 'Ventilator'}: RR ${e.rr} /min, VT ${e.vtMl} mL, PEEP ${e.peep} cmH₂O, FiO₂ ${Math.round(num(e.fio2) * 100)} %`
        : e.source === 'spontaneous' ? 'Breathing spontaneously' : 'No ventilation';
    case 'preoxygenate':
      return `Preoxygenation, FiO₂ ${Math.round(num(e.fio2) * 100)} %`;
    case 'cpr':
      return e.active ? `CPR started${e.rate ? `, ${e.rate} /min` : ''}` : 'CPR stopped';
    case 'defib':
      return e.action === 'charge' ? `Defibrillator charging to ${e.energyJ ?? ''} J` : e.action === 'shock' ? 'Shock delivered' : e.action === 'disarm' ? 'Defibrillator disarmed'
        : e.action === 'syncOn' ? 'Synchronised mode on' : e.action === 'syncOff' ? 'Synchronised mode off' : e.action === 'selectEnergy' ? `Energy ${e.energyJ} J` : 'Post-shock rhythm chosen';
    case 'pacer':
      return e.mode === 'off' ? 'Pacer off' : `Pacer ${e.mode}, ${e.ratePpm} /min, ${e.mA} mA${e.pause ? ' (paused)' : ''}`;
    case 'lungCondition': {
      const c = LUNG_CONDITIONS.find((x) => x.id === e.id);
      return `${c?.label ?? 'Lung condition'}: ${grade(e.severity)}${e.side ? ` (${e.side === 'L' ? 'left' : 'right'})` : ''}`;
    }
    case 'condition':
      return `${CONDITIONS[String(e.id)] ?? 'Condition'}: ${grade(e.severity)}`;
    case 'recruit':
      return `Recruitment manoeuvre ${e.pressureCmH2O} cmH₂O for ${e.durationS} s`;
    case 'lab':
      return `${String(e.panel) === 'vbg' ? 'Venous' : 'Arterial'} blood gas sent`;
    case 'mainstem':
      return e.ventilated === 'both' ? 'Both lungs ventilated' : `Only the ${e.ventilated} lung ventilated`;
    default:
      return 'Clinical event';
  }
}

export function describeCommand(c: Any): string {
  switch (c.type) {
    case 'setTarget':
    case 'pin': {
      const s = vitalOf(c.variable as never);
      const val = s ? `${showVital(s, num(c.value))} ${s.unit}` : String(c.value);
      const ramp = (c.ramp as { durationS?: number } | undefined)?.durationS;
      return `${vitalLabel(c.variable as never)} ${c.type === 'pin' ? 'held at' : 'target'} ${val}${over(ramp)}`;
    }
    case 'release':
      return c.variable === 'all' ? 'All values returned to the model' : `${vitalLabel(c.variable as never)} returned to the model`;
    case 'setMode':
      return `Mode: ${String(c.mode).toUpperCase()}`;
    case 'setRhythm':
      return `Rhythm: ${(RHYTHM_IDS as readonly string[]).includes(String(c.rhythm)) ? rhythmLabel(String(c.rhythm)) : 'changed'}`;
    case 'setModifiers':
      return 'ECG modifiers changed';
    case 'setFactor':
      return `Model factor ×${c.factor}`;
    case 'time':
      return c.action === 'pause' ? 'Simulation paused' : c.action === 'resume' ? 'Simulation resumed' : c.action === 'scale' ? `Speed ×${c.value}` : 'Time changed';
    case 'scenario': {
      const doc = c.doc as { title?: string } | undefined;
      const a = String(c.action);
      if (a === 'load') return `Scenario loaded: ${(doc?.title ?? '').replace(/^\[draft\]\s*/i, '') || 'case'}`;
      if (a === 'bookmark') return `Bookmark: ${c.target ?? ''}`.trim();
      if (a === 'restoreBookmark') return `Returned to bookmark ${c.target ?? ''}`.trim();
      if (a === 'goto') return 'Scenario: jumped to a state';
      return a === 'pause' ? 'Scenario timer held' : a === 'resume' ? 'Scenario timer running' : 'Scenario event';
    }
    case 'applyEvent':
      return event((c.event ?? {}) as Any);
    case 'attachSensor':
      return `${SENSORS[String(c.sensor)] ?? 'Sensor'} ${c.state === 'off' || c.state === 'none' ? 'removed' : 'attached'}`;
    case 'device': {
      const a = (c.action ?? {}) as Any;
      if (a.device === 'nibp') return a.action === 'start' ? 'NIBP measurement started' : 'NIBP setting changed';
      if (a.device === 'alarm') return a.action === 'silence' ? 'Alarm sound silenced' : a.action === 'pause' ? 'Alarms paused' : a.action === 'ack' ? 'Alarms acknowledged' : a.action === 'enableAll' ? 'All alarms on' : 'Alarm setting changed';
      if (a.device === 'monitor') return 'Monitor setting changed';
      return 'Device setting changed';
    }
    default:
      return 'Instructor action';
  }
}
