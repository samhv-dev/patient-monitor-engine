// Plan learner-action-remote.md L4: the laptop's copy of the formulary layer, for the host's learner preparations.
import { loadFormulary, type Formulary, type FormularyFiles } from '@pme/controller';

/**
 * L4 (learner-action-remote.md §4 D3, D4): the shipped formulary layer (packages/controller/formulary/, every file but its
 * JSON Schema), loaded once as its own chunk and checked by the same rules as the CI's source check; a layer that breaks
 * one is not used (the host then refuses every preparation, and says so) rather than half-trusted.
 */
export async function loadShippedFormulary(): Promise<Formulary | null> {
  const mods = import.meta.glob<{ default: unknown }>(['../../../../packages/controller/formulary/**/*.json', '!**/schema.json']);
  const files: FormularyFiles = {};
  await Promise.all(Object.entries(mods).map(async ([path, load]) => void (files[path.replace(/^.*\/formulary\//, '')] = (await load()).default)));
  const r = loadFormulary(files);
  if (!r.ok) console.error('[pme] the formulary breaks its source rules; learner preparations are refused', r.problems);
  return r.ok ? r.formulary : null;
}
