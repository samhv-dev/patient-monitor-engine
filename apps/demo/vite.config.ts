import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Multi-page demo: one page per stage (BUILD-PLAN "Monorepo layout").
const page = (name: string) => resolve(import.meta.dirname, `${name}.html`);

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: page('index'), stage0: page('stage0'), stage1: page('stage1'), stage5: page('stage5'),
        stage2: page('stage2'), // Stage 2
        stage3: page('stage3'), // Stage 3
        stage7b: page('stage7b'), // Stage 7b
        stage6a: page('stage6a'), 'stage6a-remote': page('stage6a-remote'), 'stage6a-viewer': page('stage6a-viewer'),
        'stage4a-skins': page('stage4a-skins'),
        'stage4b-device': page('stage4b-device'), // Stage 4b
        'stage6b-acls': page('stage6b-acls'),
        'vent-hamilton': page('vent-hamilton'), // Stage V
        'vent-link': page('vent-link'), // Stage V
        stage7a: page('stage7a'), // Stage 7a
      },
    },
  },
});
