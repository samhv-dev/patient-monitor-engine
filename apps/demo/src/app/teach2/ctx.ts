// What every slot of the Instructor v2 view gets (design `docs/plans/instructor-panel-redesign.md`, plan IP4): the Link,
// the site, the patient's weight, the keyboard registries and the dock's two open areas. A slot is mounted once into
// its own element and answers `refresh()` (the view's ≤ 2 Hz repaint, while the view is shown) and `destroy()`.
// The strip, the cue box, ACTION and the sheets are slots with this fixed contract.
import type { Link } from '../link.ts';
import type { SiteProfile } from '../site.ts';
import type { Keys } from './keys.ts';

export interface Teach2Ctx {
  link: Link;
  site: SiteProfile;
  weightKg(): number;
  /** Digits 1–9, the letters and Esc (keys.ts); Space, Shift+S/P/N are the view's own. */
  keys: Keys;
  /** The dock's tool area (left) and note area (beside the marks): the sheets slot fills them. */
  dock: { tools: HTMLElement; note: HTMLElement };
  /** Opens a sheet by id ('devices' for the alarm count); the sheets slot sets it when it mounts. */
  openSheet(id: string): void;
}

export interface Slot {
  refresh(): void;
  destroy(): void;
}

export type MountSlot = (el: HTMLElement, ctx: Teach2Ctx) => Slot;
