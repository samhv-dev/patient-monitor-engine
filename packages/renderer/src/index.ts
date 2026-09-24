// @pme/renderer public API. The IIFE build exposes this module as window.PatientMonitor (brief §7.6).
export const version = '0.0.0';
export { createEngine } from '@pme/engine-core';
export * from './calibration.ts';
export * from './decimate.ts';
export { SweepLane, type LaneConfig, type SampleSource } from './sweep-lane.ts';
export { MonitorCore } from './monitor-core.ts';
export { NumericTile, formatNumeric } from './numerics-dom.ts';
export { mountMonitor, type MonitorHandle, type MonitorRole, type MountOptions } from './mount.ts';
export type { RenderPath } from './worker-host.ts';
/** The five transport adapters of @pme/controller (brief §7.5; renderer request R-2, ruling R25). */
export { transports } from '@pme/controller';
