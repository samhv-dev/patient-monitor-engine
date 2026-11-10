// The builder's validation (docs/plans/scenario-builder.md §5.1, §5.5; piece B1): the controller's own validator, run on
// the document the form would write, so the author sees exactly what a load would see; debounced, so typing does not
// validate every keystroke; each line placed on its field. Pure but for the timer; no DOM.
import { validateScenario, type ValidateOptions, type ValidationResult } from '@pme/controller/scenario';
import { fieldOf, type FieldRef } from './fields.ts';
import { docOf, type CardForm } from './form.ts';

/** The pause after the last change before the card is validated (§5.1). */
export const CHECK_DELAY_MS = 300;

/** One validator line where the builder shows it: a refusal (an error: Run, Export and Submit wait) or a warning. */
export interface Placed { kind: 'refusal' | 'warning'; line: string; text: string; at: FieldRef }

const LINE = /^(\/\S*): ([\s\S]*)$/;

/** Every line of a validation result on its field, errors first, each list in the validator's order. */
export function place(r: ValidationResult): Placed[] {
  const one = (kind: Placed['kind']) => (line: string): Placed => {
    const m = LINE.exec(line);
    return { kind, line, text: m ? m[2]! : line, at: fieldOf(m ? m[1]! : '/') };
  };
  return [...(r.ok ? [] : r.errors.map(one('refusal'))), ...r.warnings.map(one('warning'))];
}

/** Validation on every change: `change(form)` (re)starts the delay; when it ends, the form as it then is is written and
 *  validated, and `onResult` gets the placed lines. `flush` validates a pending change now, `cancel` drops it. */
export function checker(onResult: (placed: Placed[], result: ValidationResult) => void, options: ValidateOptions = {}) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let form: CardForm | null = null;
  const run = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (!form) return;
    const f = form;
    form = null;
    const r = validateScenario(docOf(f), options);
    onResult(place(r), r);
  };
  return {
    change(f: CardForm): void {
      form = f;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(run, CHECK_DELAY_MS);
    },
    flush: run,
    cancel(): void {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      form = null;
    },
  };
}
