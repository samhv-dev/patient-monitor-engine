// Lead-off technical flag (brief §5 "leadContact"; research 03 §1.8: leads off is a technical INOP with a flat
// trace, not asystole). The planner emits an 'alarm' event (category 'technical') when the flag changes; Stage 4's
// alarm manager owns presentation (priority/tones) and may re-map it.
import { NEVER, type RhythmCtx, type RhythmState } from '../rhythm-state.ts';

export const LEADS_OFF_ALARM_ID = 'ecgLeadsOff';

export const leadOffClock = {
  next(st: RhythmState, ctx: RhythmCtx): number {
    return ctx.mods.artefact.leadOff !== (st.leadOff ?? false) ? st.planT : NEVER;
  },
  fire(st: RhythmState, t: number, ctx: RhythmCtx): void {
    const off = ctx.mods.artefact.leadOff;
    st.leadOff = off;
    st.records.push({ type: 'alarm', t, id: LEADS_OFF_ALARM_ID, priority: 'medium', category: 'technical', state: off ? 'raised' : 'cleared', text: 'ECG LEADS OFF' });
  },
};
