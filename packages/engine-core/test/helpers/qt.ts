// Test helper: measure the drawn QT on the waveform, independently of the kernel constants.
// Tangent method (Lepeschkin & Surawicz 1952; the usual manual QT method): T end is where the tangent through the
// steepest point of the T wave's descending limb crosses the isoelectric line.
import { addEventAt, type EcgEvent } from '../../src/l2/ecg/kernels.ts';
import { projectLead } from '../../src/l2/ecg/vcg.ts';

const FS = 2000; // evaluate the kernels at 2 kHz (the waveform is continuous; 500 Hz would quantise to 2 ms)

/** Lead II from the scheduled kernel events only (no wander, no noise: isoelectric line = 0 mV). */
export function leadIIAt(events: readonly EcgEvent[], t: number): number {
  const acc = new Float64Array(3);
  for (const ev of events) if (t >= ev.start && t <= ev.end) addEventAt(ev, t, acc);
  return projectLead('ecgII', acc[0]!, acc[1]!, acc[2]!);
}

/** T peak and tangent T end (absolute s) for the beat whose QRS starts at `onset`; searched in [onset+0.15, onset+maxS]. */
export function tangentTEnd(events: readonly EcgEvent[], onset: number, maxS: number): { peak: number; end: number } {
  let peak = onset + 0.15;
  let vPeak = -Infinity;
  for (let t = onset + 0.15; t <= onset + maxS; t += 1 / FS) {
    const v = leadIIAt(events, t);
    if (v > vPeak) {
      vPeak = v;
      peak = t;
    }
  }
  // Steepest point of the descending limb: stop where the slope turns positive again (the next P or U wave).
  let tS = peak;
  let slope = 0;
  for (let t = peak + 1 / FS; t <= peak + 0.15; t += 1 / FS) {
    const d = (leadIIAt(events, t + 0.5 / FS) - leadIIAt(events, t - 0.5 / FS)) * FS;
    if (d > 0) break;
    if (d < slope) {
      slope = d;
      tS = t;
    }
  }
  return { peak, end: tS - leadIIAt(events, tS) / slope };
}
