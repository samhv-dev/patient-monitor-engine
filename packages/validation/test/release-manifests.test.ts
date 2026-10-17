// Stage 8b: scripts/release-manifests.ts sets the publish fields of the library manifests and keeps every other key.
import { describe, expect, it } from 'vitest';
import { releaseManifest } from '../../../scripts/release-manifests.ts';

const controller = {
  name: '@pme/controller', version: '0.0.0', private: true, type: 'module',
  exports: { '.': './src/index.ts', './scenario': './src/scenario/index.ts' },
  scripts: { typecheck: 'tsc -p tsconfig.json', build: 'vite build', audit: 'node audit.ts' }, // `audit`: a key a sibling stage added
  dependencies: { '@pme/engine-core': 'workspace:*', ajv: '8.20.0', ws: '8.21.3' },
  devDependencies: { '@types/ws': '8.18.1' },
  bin: { 'pme-relay': './relay/bin.ts' },
  someNewKey: { kept: true },
};

describe('scripts/release-manifests releaseManifest', () => {
  it('drops private, sets the publish fields at fixed places and keeps every other key', () => {
    const r = releaseManifest('controller', controller, '1.0.0-rc.1');
    expect(Object.keys(r)).toEqual(['name', 'version', 'description', 'license', 'author', 'repository', 'type', 'exports', 'files', 'publishConfig', 'scripts', 'dependencies', 'devDependencies', 'bin', 'someNewKey']);
    expect(r.version).toBe('1.0.0-rc.1');
    expect(r.exports).toEqual(controller.exports); // the workspace keeps resolving src/
    expect(r.publishConfig).toMatchObject({ access: 'public', bin: {}, exports: { './scenario': { import: './dist/scenario.js' } } });
    expect(r.scripts).toEqual({ typecheck: 'tsc -p tsconfig.json', build: 'vite build && tsc -p tsconfig.build.json && node --experimental-strip-types ../../scripts/finish-dist.ts', audit: 'node audit.ts' });
    expect(r.dependencies).toEqual({ '@pme/engine-core': 'workspace:*', ajv: '8.20.0' });
    expect(r.devDependencies).toEqual({ '@types/ws': '8.18.1', ws: '8.21.3' });
    expect(r.someNewKey).toEqual({ kept: true });
  });
  it('is idempotent, and gives engine-core its sideEffects list right after "type"', () => {
    const once = releaseManifest('engine-core', { name: '@pme/engine-core', version: '0.0.0', private: true, type: 'module', exports: { '.': './src/index.ts' }, scripts: { build: 'vite build' } }, '1.0.0-rc.1');
    expect(releaseManifest('engine-core', once, '1.0.0-rc.1')).toEqual(once);
    expect(Object.keys(once).indexOf('sideEffects')).toBe(Object.keys(once).indexOf('type') + 1);
    expect(once.sideEffects).toEqual(['./src/l2/ecg/pacing.ts', './src/l2/ecg/arrest/vf.ts']);
  });
});
