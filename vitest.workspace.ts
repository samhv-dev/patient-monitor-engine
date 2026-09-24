// Lets `pnpm exec vitest` at the repo root run every package's tests at once.
// CI uses `pnpm -r test` (one Vitest run per package) instead.
export default ['packages/*', 'apps/*'];
