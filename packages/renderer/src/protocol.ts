// Messages between the main thread and the engine+renderer worker (brief §3.4). Raw samples never cross.
import type { Command, DispatchResult, EngineEvent, EngineOptions, LeadId, PatientSnapshot } from '@pme/engine-core';

export interface Size {
  cssW: number;
  cssH: number;
  dpr: number;
}

export interface CoreOptions {
  engine?: EngineOptions;
  /** Displayed ECG leads, one per lane (1–3). Default ['ecgII', 'V5']. */
  lanes?: LeadId[];
  pxPerMm?: number;
  fps?: 60 | 30;
}

/** Wall/sim clock anchor sent with every event batch (brief §3.4). epochMs = timeOrigin + now. */
export interface ClockAnchor {
  simT: number;
  epochMs: number;
  timeScale: number;
}

export type ToWorker =
  | { type: 'init'; canvas: OffscreenCanvas; size: Size; opts: CoreOptions; mainPump: boolean }
  | { type: 'frame'; epochMs: number }
  | { type: 'catchUp'; epochMs: number }
  | { type: 'command'; reqId: number; cmd: Command }
  | { type: 'resize'; size: Size }
  | { type: 'timeScale'; k: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'fps'; fps: 60 | 30 }
  | { type: 'calibrate'; pxPerMm: number }
  | { type: 'visible'; visible: boolean }
  // Renderer request R-1 (ruling R25): engine snapshot/restore through the worker.
  | { type: 'snapshot'; reqId: number }
  | { type: 'restore'; reqId: number; snapshot: PatientSnapshot };

export type FromWorker =
  | { type: 'ready'; path: 'worker-raf' | 'worker-pump' }
  | { type: 'events'; anchor: ClockAnchor; events: EngineEvent[] }
  | { type: 'result'; reqId: number; result: DispatchResult }
  | { type: 'error'; message: string }
  | { type: 'snapshot'; reqId: number; snapshot: PatientSnapshot }
  | { type: 'restored'; reqId: number; error?: string };
