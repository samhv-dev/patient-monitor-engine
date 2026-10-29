// Instructor v2, the sheets slot: a stub until IP7 builds it.
// IP7 fills it with the sheets over ACTION, the dock tools and note field, and the staged cache.
// The view (views/teach2.ts) mounts it once with the fixed signature `mount(el, ctx) => { refresh(), destroy() }`;
// IP7 replaces only this body (plan IP4).
import type { Slot, Teach2Ctx } from './ctx.ts';

/** Mount this slot into `el` (the fixed slot signature, teach2/ctx.ts). */
export function mount(el: HTMLElement, ctx: Teach2Ctx): Slot {
  void ctx;
  el.dataset.stub = 'IP7';
  return { refresh: () => undefined, destroy: () => undefined };
}
