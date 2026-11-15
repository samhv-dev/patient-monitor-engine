// What every instructor tab gets: the link (commands, state, log), the staging buffer, the site profile and a
// refresh registration (the panel repaints at most twice a second, research/13 brief §10).
import type { Link } from '../link.ts';
import type { ScenarioCard } from '../scenarios.ts';
import type { SiteProfile } from '../site.ts';
import type { Staging } from '../staging.ts';

export interface PanelCtx {
  link: Link;
  staging: Staging;
  site: SiteProfile;
  /** The patient's weight for per-kg doses (the host's patient; a Remote reads the scenario's or 70 kg). */
  weightKg(): number;
  /** Register a repaint for live values; called ≤ 2 Hz while the tab is visible. */
  onRefresh(fn: () => void): void;
  /** Host only: load a scenario (restarts the patient). */
  loadScenario?(card: ScenarioCard): boolean;
  /** Move to another tab (the alarm count opens Devices & alarms). */
  goTab(id: string): void;
  /** False on the laptop's Instructor sheets (the owner's ruling of 12 November, brief 208: no hold in a modelled run):
   *  in MODELED a value the model computes is changed through its cause, never held. Absent (today's panel, which the
   *  instructor phone mounts): a MODELED Set holds the value. */
  holds?: boolean;
}
