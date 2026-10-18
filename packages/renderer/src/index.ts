// @pme/renderer public API. The IIFE build exposes this module as window.PatientMonitor (brief §7.6).
export const version = '1.0.0-rc.1';
export { createEngine } from '@pme/engine-core';
export * from './calibration.ts';
export * from './decimate.ts';
export { SweepLane, type LaneConfig, type SampleSource } from './sweep-lane.ts';
export { MonitorCore } from './monitor-core.ts';
export { NumericTile, formatNumeric } from './numerics-dom.ts';
export { mountMonitor, type MonitorHandle, type MonitorRole, type MountOptions, type ViewerClock } from './mount.ts';
export type { RenderPath } from './worker-host.ts';
export { WAVE_STYLE, scaleFor, autoRange, type WaveLaneId, type WaveStyle } from './wave-lanes.ts';
export { PressureTile, formatPressure, formatNibp, formatClock, type NibpView } from './numerics-hemo.ts';
/** The five transport adapters of @pme/controller (brief §7.5). */
export { transports } from '@pme/controller';
export { renderPlan, legacyPlan, filterModeFor, ecgLabel, type RenderPlan, type PlanLane } from './skin-plan.ts';
export { barView, tileAlarmView, visibleAlarms, type AlarmStatus, type BarView, type TileAlarmView } from './alarm-view.ts';
export { AlarmAudioBridge } from './alarm-audio.ts';
export { DeviceUI, flashCss } from './device-ui.ts';
export { draw12Lead, drawTrend, report12Size, PAPER, type TrendSeries } from './views.ts';
export { Overlays, drawMark, drawLeadOffDashes } from './overlays.ts';
export { formatEtco2, formatRr, formatSpo2, formatTemp } from './numerics-resp.ts';
export { formatIcp, formatPbto2, formatUop } from './numerics-organs.ts';
export { formatBfa, formatNmt, modulePresent, MODULE_TILES } from './numerics-neuro.ts';
export { createDrugPanel, type DrugPanel } from './drug-panel.ts';
export { LAB_ROWS, labFlag, mountLabPanel } from './lab-panel.ts';
export { mountEndoPanel } from './endo-panel.ts';
