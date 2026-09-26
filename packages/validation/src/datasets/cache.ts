// The git-ignored dataset cache (brief §8: raw records are never committed). PME_DATASET_CACHE overrides it.
import { fileURLToPath } from 'node:url';

export function cacheDir(): string {
  return process.env.PME_DATASET_CACHE ?? fileURLToPath(new URL('../../datasets/cache', import.meta.url));
}
