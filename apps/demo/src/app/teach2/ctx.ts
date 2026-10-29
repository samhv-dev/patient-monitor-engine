// What every slot of the Instructor v2 view gets (design `docs/plans/instructor-panel-redesign.md`, plan IP4): the Link,
// the site, the patient's weight, the keyboard registries and the dock's two open areas. A slot is mounted once into
// its own element and answers `refresh()` (the view's ≤ 2 Hz repaint, while the view is shown) and `destroy()`.
// IP5 (strip, cue), IP6 (action) and IP7 (sheets) replace only the bodies of their stub files; this contract is fixed.
import type { Link } from '../link.ts';
import type { SiteProfile } from '../site.ts';
import type { Keys } from './keys.ts';

export interface Teach2Ctx {
  link: Link;
  site: SiteProfile;
  weightKg(): number;
  /** Digits 1–9, the letters and Esc (keys.ts); Space, Shift+S/P/N are the view's own. */
  keys: Keys;
  /** The dock's tool area (left) and note area (beside the marks): empty until IP7 fills them. */
  dock: { tools: HTMLElement; note: HTMLElement };
  /** Opens a sheet by id ('devices' for the alarm count). A no-op until the sheets slot (IP7) replaces it. */
  openSheet(id: string): void;
}

export interface Slot {
  refresh(): void;
  destroy(): void;
}

export type MountSlot = (el: HTMLElement, ctx: Teach2Ctx) => Slot;
