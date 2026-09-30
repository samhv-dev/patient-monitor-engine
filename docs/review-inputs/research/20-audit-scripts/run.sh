#!/bin/sh
# Runs a script of this folder against the pinned worktree: ./run.sh cli.ts DV-01
: "${PME_ENGINE:=/private/tmp/claude-501/-Users-samhv-Desktop-Claude-CODE/2b10d933-783e-4f38-a50e-c0183b91ca63/scratchpad/cov-dv/wt/packages/engine-core/src/index.ts}"
export PME_ENGINE
cd "$(dirname "$0")" && exec node --import ./hooks.mjs --experimental-strip-types "$@"
