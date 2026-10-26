// "SIMULATION · not a clinical monitor" on every monitor surface (the owner, 26 October: the Monitor view, the learner
// monitor window, a learner's phone), never on the instructor's pages. A skin with a two-row header (saadat-like) prints
// it in the header's free centre, where a real monitor prints the patient's name, in the header's own font and size, so
// no lane or tile moves (renderer `setHeaderNote`). A phone held upright prints it in its one-row header's message area
// while no message shows (a strip would shorten the lanes: the ECG gain dropped to ×0.5, fx24). A one-row header on a
// wide screen (the other skins) has no free area: the line is then a thin strip above the monitor, 16 px. The page footer's disclaimer is not
// shown on a monitor surface (app.css), so this line is the one thing that says it.
import { resolveSkin } from '@pme/skins';
import type { MonitorHandle } from '@pme/renderer';
import { h } from './ui.ts';

export const SIM_LINE = 'SIMULATION · not a clinical monitor';

/** Whether this skin's header carries the line (the two-row header; on a phone held upright, the idle message area). */
export function headerHasRoom(skin: string, theme: string, portrait: boolean): boolean {
  if (portrait) return true;
  try {
    return resolveSkin(skin, theme ? { theme } : {}).skin.layout.headerStyle === 'two-row';
  } catch {
    return false;
  }
}

export interface SimLine {
  /** Show (`on`) or remove the line for this monitor and skin; call again after a remount or a skin change. */
  set(monitor: MonitorHandle | null | undefined, look: { skin: string; theme: string }, on: boolean): void;
  readonly strip: HTMLElement;
}

/** The line for the monitor in `stage` (its strip is placed in the stage, above the monitor). */
export function simLine(stage: HTMLElement, portrait = false): SimLine {
  const strip = h('div', { class: 'sim-strip', role: 'note', hidden: true }, SIM_LINE);
  stage.prepend(strip);
  return {
    strip,
    set(monitor, look, on) {
      monitor?.setHeaderNote(on ? SIM_LINE : '');
      const inStrip = on && !headerHasRoom(look.skin, look.theme, portrait);
      strip.hidden = !inStrip;
      stage.classList.toggle('sim-strip-on', inStrip);
      const r = monitor?.skin?.render;
      if (r) strip.style.cssText = `font-family:${r.fontStack};color:${r.foreground};background:${r.background};`;
    },
  };
}
