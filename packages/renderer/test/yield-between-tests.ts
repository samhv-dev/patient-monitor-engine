// Every renderer test hands the event loop back to Node before the next one starts. Vitest runs a file's tests one
// after another on promise continuations only, so a file of synchronous tests is one unbroken block of the worker's
// event loop; the worker's progress messages to the main process ("onTaskUpdate") wait for a reply on a 60 s timer,
// and a reply can only be read when the loop turns. ecg-auto-gain.test.ts (ten synchronous real-engine tests) ran
// ≈ 75 s as one block on the loaded CI runner, so the timer fired although the main process had answered (run
// 41259720728). With this hook the longest block is the longest single test, not the sum of a file's tests.
import { afterEach } from 'vitest';

afterEach(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
