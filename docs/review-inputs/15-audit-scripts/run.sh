#!/bin/sh
# Runs a script of this folder against this checkout's engine (or PME_ENGINE): ./run.sh cli.ts NN-01
cd "$(dirname "$0")" && exec node --import ./hooks.mjs --experimental-strip-types "$@"
