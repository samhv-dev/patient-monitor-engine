// Instructor v2, the ACTION slot: a stub until IP6 builds it.
// IP6 fills it with the steps, automatic rows, judged objectives, Finished and Off the card.
// The view (views/teach2.ts) mounts it once with the fixed signature `mount(el, ctx) => { refresh(), destroy() }`;
// IP6 replaces only this body (plan IP4).
import type { Slot, Teach2Ctx } from './ctx.ts';

/** Mount this slot into `el` (the fixed slot signature, teach2/ctx.ts). */
export function mount(el: HTMLElement, ctx: Teach2Ctx): Slot {
  void ctx;
  el.dataset.stub = 'IP6';
  return { refresh: () => undefined, destroy: () => undefined };
}
