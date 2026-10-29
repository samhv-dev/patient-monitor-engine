// Instructor v2, the cue-box slot: a stub until IP5 builds it.
// IP5 fills it with the stage name, time in stage, how it was entered and the Say line.
// The view (views/teach2.ts) mounts it once with the fixed signature `mount(el, ctx) => { refresh(), destroy() }`;
// IP5 replaces only this body (plan IP4).
import type { Slot, Teach2Ctx } from './ctx.ts';

/** Mount this slot into `el` (the fixed slot signature, teach2/ctx.ts). */
export function mount(el: HTMLElement, ctx: Teach2Ctx): Slot {
  void ctx;
  el.dataset.stub = 'IP5';
  return { refresh: () => undefined, destroy: () => undefined };
}
