# Security policy

## Supported versions

Security fixes are made on the latest release (now the `1.0.0-rc.1` pre-release; then the 1.x line).

## Reporting a vulnerability

Please report privately through GitHub's "Report a vulnerability" (Security → Advisories) on
https://github.com/samhv-dev/patient-monitor-engine. Do not open a public issue. You should receive an answer within
two weeks.

## Scope

In scope: the WebSocket relay (`packages/controller/relay`), the transports that accept messages from other windows or
peers (postMessage, BroadcastChannel, WebSocket, WebRTC) and their role/session checks, the loading and validation of
scenario, skin and snapshot JSON, and the published build artefacts.

Out of scope: clinical accuracy (use the "Clinical realism" issue template instead). This software is a teaching
simulator and is not a medical device; it must never be connected to patients or used for clinical decisions.
