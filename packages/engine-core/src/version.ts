export const version = '1.0.0-rc.4';

// The build id. The release build sets it to the tagged commit's short hash (PME_BUILD, through the `define` in the
// engine-core and renderer vite.config.ts); everywhere else — the workspace, Vitest, the demo's Vite — the identifier
// is not defined and the build is 'dev'. Named __PME_ENGINE_BUILD__, never __PME_BUILD__ (the demo's date-stamped
// Debrief id, which the demo's Vite would otherwise apply to this file too).
declare const __PME_ENGINE_BUILD__: string | undefined;
export const build: string = typeof __PME_ENGINE_BUILD__ === 'string' ? __PME_ENGINE_BUILD__ : 'dev';

/** The snapshot compatibility key: a snapshot restores only into an engine of the same version AND build. */
export const engineKey = `${version}+${build}`;
