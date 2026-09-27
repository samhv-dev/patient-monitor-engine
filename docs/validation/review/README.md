# Blind realism review (brief §9)

1. The operator builds a bundle: `npx -y pnpm@9.15.9 --filter @pme/validation review:build --per-channel 20`. It lands in the git-ignored cache as `review/<session>/bundle.json` (clips, no answers) and `key.json` (which clip is real — keep it away from raters).
2. The rater opens `validation-review.html` (`npx -y pnpm@9.15.9 --filter @pme/demo dev`, then `/validation-review.html`), types a name, loads `bundle.json`, rates every clip (real/synthetic, realism 1–5, optional comment) and downloads `answers-<session>-<name>.json`. Progress survives a reload on the same browser.
3. The operator scores: `npx -y pnpm@9.15.9 --filter @pme/validation review:score --bundle <bundle.json> --key <key.json> --answers <answers.json>` → `docs/validation/review/<session>-<name>.md/.json` (numbers and comments only; commit these).
4. Pass (brief §9): identification ≤ 60 % per channel, mean synthetic realism ≥ 4.0, real − synthetic ≤ 0.5. A second clinician repeats step 2 with the same bundle; each rater's file is scored separately.
