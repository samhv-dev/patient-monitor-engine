// Proof (b): the six-card rehearsal (Stage 11) against the BUILT kit served by its PERL server, on WebKit and Chromium
// at 1440×900. Each case: a fresh page load at #/teach → Scenario tab → Showcase filter → Load → ×4 → the card's own
// buttons at the run sheet's clock times (docs/plans/stage-11-scenarios.md, "Run sheets"). Assertions are smoke checks
// with generous windows (directions and floors, never calibration bands: those are the Vitest scenario tests in
// apps/demo/src/app/showcase/*.slow.test.ts). Every observed number and every visible label is written to
// docs/showcase/results/ — the JSON as before, and one run-sheet table per case and browser (clock, monitor, presenter
// action) that the Stage 11 gate gathers into docs/gates/stage-11/run-sheet-numbers.md.
// The DEFAULT monitor (Saadat-style) is used throughout; it shows a CO2 tile, read from the DOM.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { alarms, barClock, co2Tile, hist, latest, loadShowcase, maxOf, meanOf, minOf, openTeach, OUT, r1, record, runText, save, shot, simNow, stateId, waitSim, waitUntilSim, watchConsole } from './showcase-support.ts';

type Row = { clock: string; monitor: string; presenter: string };
type Result = { case: string; browser: string; server: string; base: string; t0: number; steps: Array<Record<string, unknown>>; sheet: Row[]; labels: Record<string, string>; checks: Array<{ what: string; expected: string; observed: unknown; pass: boolean }>; errors: string[] };

function begin(name: string, browser: string): Result {
  return { case: name, browser, server: process.env.SHOWCASE_SERVER ?? '', base: process.env.SHOWCASE_BASE ?? '', t0: 0, steps: [], sheet: [], labels: {}, checks: [], errors: [] };
}
function check(r: Result, what: string, expected: string, observed: unknown, pass: boolean): void {
  r.checks.push({ what, expected, observed, pass });
  expect.soft(pass, `${what}: expected ${expected}, observed ${JSON.stringify(observed)}`).toBe(true);
}
const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
/** One run-sheet row: the scenario clock, what the monitor shows, and what the presenter did or says there. */
async function step(r: Result, page: Page, what: string, extra: Record<string, unknown> = {}): Promise<void> {
  const v = await latest(page);
  const simT = await simNow(page);
  const state = await stateId(page);
  r.steps.push({ simT: r1(simT), what, state, hr: r1(v.hr), art: `${r1(v.abpSys)}/${r1(v.abpDia)} (${r1(v.abpMean)})`, spo2: r1(v.spo2), etco2: r1(v.etco2), rr: r1(v.rr), ...extra });
  const n = (x: number | null | undefined) => (typeof x === 'number' ? Math.round(x) : '–');
  r.sheet.push({ clock: mmss(simT - r.t0), monitor: `HR ${n(v.hr)}, ART ${n(v.abpSys)}/${n(v.abpDia)} (${n(v.abpMean)}), SpO2 ${n(v.spo2)}, EtCO2 ${n(v.etco2)}, RR ${n(v.rr)} · state ${state}`, presenter: what });
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** Press a card button and record the row (the presenter column is the button's label). The name is matched EXACTLY:
 *  the panel's state list renders every other state as a "Jump to <label>" button, and a state label can contain a
 *  button's label ("Ephedrine 10 mg given", "Dantrolene 2.5 mg/kg given"), which a substring match would click. */
async function press(r: Result, page: Page, label: string): Promise<number> {
  await page.locator('section[aria-label="Running scenario"]').getByRole('button', { name: label, exact: true }).click();
  const t = await simNow(page);
  await page.waitForTimeout(800);
  r.labels[`after ${label}`] = await runText(page);
  await step(r, page, `press **${label}**`);
  return t;
}
const until = (page: Page, maxSimS: number, id: string) => waitSim(page, maxSimS, async () => (await stateId(page)) === id);

async function start(page: Page, r: Result, title: string): Promise<number> {
  const errs = watchConsole(page);
  r.errors = errs;
  await openTeach(page);
  Object.assign(r.labels, await loadShowcase(page, title));
  await record(page);
  const t = await simNow(page);
  r.t0 = t;
  await step(r, page, `loaded "${title}" at ×4`);
  return t;
}
async function finish(page: Page, r: Result, browser: string): Promise<void> {
  r.labels.finalRun = await runText(page).catch(() => '');
  await shot(page, `${slug(r.case)}-${browser}`);
  r.steps.push({ alarmsRaised: (await alarms(page)).map((a) => `${r1(a.t - r.t0)} s ${a.text}`).slice(0, 40) });
  check(r, 'no console error or page error', 'none', r.errors.slice(0, 5), r.errors.length === 0);
  save(`rehearsal-${slug(r.case)}-${browser}.json`, r);
  const md = [`### ${r.case} (${browser})`, '', '| Clock | Monitor | Presenter |', '|---|---|---|', ...r.sheet.map((x) => `| ${x.clock} | ${x.monitor} | ${x.presenter} |`),
    '', `Alarms raised (scenario clock): ${(await alarms(page)).slice(0, 25).map((a) => `${mmss(a.t - r.t0)} ${a.text}`).join(' · ') || 'none'}`,
    '', `Checks: ${r.checks.map((c) => `${c.pass ? 'PASS' : 'FAIL'} ${c.what} (${JSON.stringify(c.observed)})`).join(' · ')}`, ''];
  writeFileSync(join(OUT, 'results', `run-sheet-${slug(r.case)}-${browser}.md`), md.join('\n'));
}

test('Healthy induction', async ({ page }) => {
  const browserName = test.info().project.name;
  const r = begin('Healthy induction', browserName);
  try {
    const t0 = await start(page, r, 'Healthy induction');
    await waitUntilSim(page, t0 + 30);
    r.labels.co2TileAwake = (await co2Tile(page)).text;
    const baseMap = meanOf(await hist(page, t0 + 15, t0 + 30), 'abpMean');
    await waitUntilSim(page, t0 + 180);
    await step(r, page, '3 min of preoxygenation (FiO2 1.0 held until induction)', { baselineMap: r1(baseMap) });
    const tInd = await press(r, page, 'Induce now');
    await waitSim(page, 120, async () => (await alarms(page)).some((x) => x.t > tInd && /apn/i.test(x.text)));
    const apnAlarm = (await alarms(page)).find((x) => x.t > tInd && /apn/i.test(x.text));
    await step(r, page, 'apnoea alarm', { apnoeaAlarm: apnAlarm?.text ?? null, co2Tile: (await co2Tile(page)).text });
    check(r, 'apnoea alarm after "Induce now"', 'within 75 s sim', apnAlarm ? `${r1(apnAlarm.t - tInd)} s "${apnAlarm.text}"` : 'none within 120 s', !!apnAlarm && apnAlarm.t - tInd <= 75);
    await waitUntilSim(page, tInd + 90);
    const tInt = await press(r, page, 'Intubate and ventilate');
    const tCo2 = await waitSim(page, 90, async () => ((await co2Tile(page)).value ?? 0) > 25);
    await step(r, page, 'EtCO2 back on the CO2 tile', { co2Tile: (await co2Tile(page)).text });
    check(r, 'EtCO2 on the CO2 tile after "Intubate and ventilate"', '> 25 mmHg within 90 s', tCo2 === null ? 'not within 90 s' : `${r1(tCo2 - tInt)} s`, tCo2 !== null);
    await waitUntilSim(page, tInd + 240);
    const nadir = minOf(await hist(page, tInd, tInd + 240), 'abpMean');
    await step(r, page, '4 min after induction', { mapNadir: r1(nadir) });
    check(r, 'arterial mean falls after induction', '≥ 10 mmHg below baseline', `${r1(baseMap)} → nadir ${r1(nadir)}`, baseMap !== null && nadir !== null && baseMap - nadir >= 10);
    await waitUntilSim(page, t0 + 480);
    await step(r, page, 'end (8:00)');
  } finally {
    await finish(page, r, browserName);
  }
});

test('Healthy induction, airway not secured, rescued', async ({ page }) => {
  test.setTimeout(20 * 60_000);
  const browserName = test.info().project.name;
  const r = begin('Healthy induction, airway not secured, rescued', browserName);
  try {
    const t0 = await start(page, r, 'Healthy induction');
    await waitUntilSim(page, t0 + 180);
    const tInd = await press(r, page, 'Induce now');
    const tDesat = await until(page, 720, 'desaturating');
    await step(r, page, 'state "SpO₂ below 90 %" (nothing pressed)');
    check(r, 'desaturation after induction with nothing done', 'state desaturating 6–11 min after induction', tDesat === null ? 'never' : `${r1((tDesat - tInd) / 60)} min`, tDesat !== null && tDesat - tInd >= 360 && tDesat - tInd <= 660);
    const tBrady = await until(page, 300, 'bradycardic');
    await step(r, page, 'state "SpO₂ below 60 %: hypoxic bradycardia"');
    check(r, 'hypoxic bradycardia follows', 'state bradycardic within 3 min of the desaturation', tBrady === null ? 'never' : `${r1((tBrady - (tDesat ?? 0)) / 60)} min`, tBrady !== null);
    await waitUntilSim(page, (tBrady ?? (await simNow(page))) + 10);
    const tBvm = await press(r, page, 'Bag-mask ventilate, FiO₂ 1.0');
    const t90 = await waitSim(page, 120, (_n, v) => typeof v.spo2 === 'number' && v.spo2 >= 90);
    await step(r, page, 'SpO2 back to 90 %');
    check(r, 'SpO2 recovers after bag-mask ventilation', '≥ 90 within 120 s', t90 === null ? 'not within 120 s' : `${r1(t90 - tBvm)} s`, t90 !== null);
    await waitUntilSim(page, tBvm + 60);
    await press(r, page, 'Intubate and ventilate, FiO₂ 1.0');
    await waitUntilSim(page, t0 + 900);
    const v = await latest(page);
    await step(r, page, 'end (15:00)');
    check(r, 'rescued: a pulse and a saturation at 15:00', 'HR ≥ 60 and SpO2 ≥ 90', `HR ${r1(v.hr)}, SpO2 ${r1(v.spo2)}`, (v.hr ?? 0) >= 60 && (v.spo2 ?? 0) >= 90);
  } finally {
    await finish(page, r, browserName);
  }
});

test('Induction after fentanyl and midazolam', async ({ page }) => {
  const browserName = test.info().project.name;
  const r = begin('Induction after fentanyl and midazolam', browserName);
  try {
    const t0 = await start(page, r, 'Induction after fentanyl and midazolam');
    const tPre = await until(page, 60, 'premedicated');
    await step(r, page, 'premedication given by itself (fentanyl 2 µg/kg, midazolam 0.03 mg/kg)');
    check(r, 'the premedication starts by itself', 'state premedicated within 30 s of load', tPre === null ? 'never' : `${r1(tPre - t0)} s`, tPre !== null && tPre - t0 <= 30);
    await waitUntilSim(page, t0 + 120);
    await step(r, page, '2:00 — breathing slows');
    await waitUntilSim(page, t0 + 180);
    const tInd = await press(r, page, 'Induce now');
    await waitUntilSim(page, tInd + 90);
    await press(r, page, 'Intubate and ventilate');
    const tLow = await waitSim(page, 180, (_n, x) => typeof x.abpMean === 'number' && x.abpMean < 60);
    await step(r, page, 'mean arterial pressure below 60');
    check(r, 'the mean falls below 60 after the premedicated induction', 'within 3 min of intubation', tLow === null ? 'not within 180 s' : `${r1(tLow - tInd)} s after induction`, tLow !== null);
    if (tLow === null) return;
    await waitUntilSim(page, tLow + 20);
    const tE = await press(r, page, 'Ephedrine 10 mg');
    const t65 = await waitSim(page, 240, (_n, x) => typeof x.abpMean === 'number' && x.abpMean >= 65);
    await step(r, page, 'mean arterial pressure back to 65');
    check(r, 'the mean recovers after ephedrine', '≥ 65 within 4 min', t65 === null ? 'not within 240 s' : `${r1(t65 - tE)} s`, t65 !== null);
    await waitUntilSim(page, t0 + 480);
    await step(r, page, 'end (8:00)');
  } finally {
    await finish(page, r, browserName);
  }
});

test('Anaphylaxis under anaesthesia', async ({ page }) => {
  const browserName = test.info().project.name;
  const r = begin('Anaphylaxis under anaesthesia', browserName);
  try {
    await start(page, r, 'Anaphylaxis under anaesthesia');
    const tA = await until(page, 120, 'anaphylaxis');
    await step(r, page, 'reaction started (automatically, 60 s after load)');
    r.labels.afterReaction = await runText(page);
    check(r, 'the reaction starts by itself', 'state "Anaphylaxis" within 120 s', tA === null ? 'no' : 'yes', tA !== null);
    if (tA === null) return;
    await waitUntilSim(page, tA + 118);
    const hrWin = maxOf(await hist(page, tA + 100, tA + 118), 'hr');
    await step(r, page, '≈ 2 min into the reaction', { hrMax100to118: r1(hrWin) });
    check(r, 'HR about 2 min into the Anaphylaxis state', '> 120', r1(hrWin), hrWin !== null && hrWin > 120);
    const tE = await press(r, page, 'Give epinephrine 100 µg');
    const tUp = await waitSim(page, 90, (_n, v) => typeof v.abpSys === 'number' && v.abpSys > 110);
    await step(r, page, 'systolic above 110');
    check(r, 'systolic after epinephrine', '> 110 within 60 s sim', tUp === null ? `not within 90 s (latest ${r1((await latest(page)).abpSys)})` : `${r1(tUp - tE)} s`, tUp !== null && tUp - tE <= 60);
    await waitUntilSim(page, tE + 120);
    await step(r, page, '2 min after epinephrine');
  } finally {
    await finish(page, r, browserName);
  }
});

test('Malignant hyperthermia', async ({ page }) => {
  test.setTimeout(40 * 60_000); // 40 sim-min at ×4 = 10 min of wall time, with a margin for a loaded machine
  const browserName = test.info().project.name;
  const r = begin('Malignant hyperthermia', browserName);
  const CRISIS = 'MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate';
  try {
    const t0 = await start(page, r, 'Malignant hyperthermia');
    await waitUntilSim(page, t0 + 240);
    await press(r, page, 'Start surgery: rocuronium 0.6 mg/kg');
    const tEarly = await until(page, 720, 'earlySigns');
    await step(r, page, 'state "Early signs" (EtCO2 above 45 at the same ventilation)');
    check(r, 'early signs', 'state earlySigns 4–12 min after load', tEarly === null ? 'never' : `${r1((tEarly - t0) / 60)} min`, tEarly !== null && tEarly - t0 >= 240 && tEarly - t0 <= 720);
    for (const m of [9, 13, 17]) {
      await waitUntilSim(page, t0 + m * 60);
      await step(r, page, `${m}:00 (fast-forward here with Stage 10)`);
    }
    const tEst = await until(page, 900, 'established');
    await step(r, page, 'state "Established MH" — Explore → "Changed only"');
    check(r, 'established crisis', 'state established 14–26 min after load', tEst === null ? 'never' : `${r1((tEst - t0) / 60)} min`, tEst !== null && tEst - t0 >= 840 && tEst - t0 <= 1560);
    if (tEst === null) return;
    await waitUntilSim(page, tEst + 60);
    const tC = await press(r, page, CRISIS);
    await waitUntilSim(page, tC + 60);
    const tD = await press(r, page, 'Dantrolene 2.5 mg/kg');
    await waitUntilSim(page, tC + 90);
    await press(r, page, 'Cool: 2 L saline at room temperature');
    await waitUntilSim(page, tC + 120);
    await press(r, page, 'Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose');
    await waitUntilSim(page, tC + 150);
    await press(r, page, 'Sodium bicarbonate 1 mmol/kg');
    await waitUntilSim(page, tC + 600);
    await press(r, page, 'Dantrolene 2.5 mg/kg');
    const tRec = await until(page, 900, 'recovering');
    await step(r, page, 'state "Recovering: EtCO₂ below 45"');
    check(r, 'recovery after dantrolene', 'state recovering within 20 min of the first dose', tRec === null ? 'never' : `${r1((tRec - tD) / 60)} min`, tRec !== null && tRec - tD <= 1200);
    const tLow = await waitSim(page, 900, (_n, v) => typeof v.etco2 === 'number' && v.etco2 < 38);
    if (tLow !== null) await press(r, page, 'EtCO₂ normal: ventilation back to 12 × 500');
    await waitUntilSim(page, t0 + 2400);
    const low = minOf(await hist(page, tC, Infinity), 'abpSys');
    await step(r, page, 'end (40:00)', { minSystolicAfterCall: r1(low) });
    check(r, 'no arrest on the treated path', 'arterial systolic never below 60 after the call', r1(low), low !== null && low >= 60);
  } finally {
    await finish(page, r, browserName);
  }
});

test('Stab wound: tamponade, PEA and pericardiocentesis', async ({ page }) => {
  test.setTimeout(20 * 60_000);
  const browserName = test.info().project.name;
  const r = begin('Stab wound: tamponade, PEA and pericardiocentesis', browserName);
  try {
    const t0 = await start(page, r, 'Stab wound: tamponade, PEA and pericardiocentesis');
    for (const m of [1, 3, 6]) {
      await waitUntilSim(page, t0 + m * 60);
      await step(r, page, `${m}:00`);
    }
    const tPea = await until(page, 480, 'pea');
    await step(r, page, 'state "PEA" (sinus on the ECG, no pulse)');
    check(r, 'PEA without drainage', 'state pea 5–11 min after load', tPea === null ? 'never' : `${r1((tPea - t0) / 60)} min`, tPea !== null && tPea - t0 >= 300 && tPea - t0 <= 660);
    if (tPea === null) return;
    await waitUntilSim(page, tPea + 10);
    const tCpr = await press(r, page, 'Start CPR, intubate, FiO₂ 1.0');
    await waitUntilSim(page, tCpr + 120);
    const tD = await press(r, page, 'Pericardiocentesis during CPR');
    // the pulse returns ≈ 96 s after the drainage (scenario test S2): stop CPR 2 min after it, then the pulse must hold
    await waitUntilSim(page, tD + 120);
    const tStop = await press(r, page, 'Pulse back: stop CPR');
    await waitUntilSim(page, tStop + 30);
    const sys = minOf(await hist(page, tStop + 10, tStop + 30), 'abpSys');
    await step(r, page, '30 s after stopping CPR', { minSys10to30: r1(sys) });
    check(r, 'the pulse holds after CPR stops (drained)', 'arterial systolic > 90 from 10 to 30 s after stopping', r1(sys), sys !== null && sys > 90);
    await press(r, page, 'Crystalloid 500 mL');
    await waitUntilSim(page, t0 + 900);
    await step(r, page, 'end (15:00)');
  } finally {
    await finish(page, r, browserName);
  }
});

test('Class IV haemorrhage, PEA and resuscitation', async ({ page }) => {
  test.setTimeout(20 * 60_000);
  const browserName = test.info().project.name;
  const r = begin('Class IV haemorrhage, PEA and resuscitation', browserName);
  try {
    const t0 = await start(page, r, 'Class IV haemorrhage, PEA and resuscitation');
    for (const m of [2, 4, 6, 8]) {
      await waitUntilSim(page, t0 + m * 60);
      await step(r, page, `${m} min of bleeding`);
    }
    // Pulse lost = arterial systolic < 20, OR the monitor blanks systolic/diastolic and keeps only the mean (its
    // "IBP1 STATIC PRESSURE" state: no pulsatile trace).
    const lost = (v: { abpSys?: number | null; abpMean?: number | null }) => (typeof v.abpSys === 'number' && v.abpSys < 20) || (v.abpSys === null && typeof v.abpMean === 'number');
    const tPoll = await waitSim(page, 7 * 60, (_n, v) => lost(v));
    const first = (await hist(page, t0 + 60, Infinity)).find((s) => lost(s));
    const tLoss = tPoll === null ? null : (first?.t ?? tPoll);
    await step(r, page, 'pulse lost (systolic < 20 or static arterial pressure)', { firstLostSample: first ?? null });
    check(r, 'pulse lost', 'between 8 and 13 min sim', tLoss === null ? 'not by 15 min' : `${r1((tLoss - t0) / 60)} min`, tLoss !== null && tLoss - t0 >= 480 && tLoss - t0 <= 780);
    if (tLoss === null) return;
    // the run-sheet cue: press about 10 s after the "SPO2 NO PULSE" alarm
    const tNp = await waitSim(page, 180, async () => (await alarms(page)).some((a) => /NO PULSE/i.test(a.text)));
    await step(r, page, 'monitor alarm "SPO2 NO PULSE"');
    await waitUntilSim(page, (tNp ?? (await simNow(page))) + 10);
    const tC = await press(r, page, 'Start CPR, 2 L and epinephrine');
    const tR = await waitSim(page, 8 * 60, (_n, v) => typeof v.abpSys === 'number' && v.abpSys > 90);
    await step(r, page, 'arterial systolic > 90 (pulse back)');
    check(r, 'circulation returns during CPR', 'arterial systolic > 90 within 7 min sim', tR === null ? `not within 8 min (max ${r1(maxOf(await hist(page, tC, Infinity), 'abpSys'))})` : `${r1((tR - tC) / 60)} min`, tR !== null && tR - tC <= 420);
    const tStop = await press(r, page, 'Pulse back: stop CPR');
    check(r, '"Pulse back: stop CPR" moves the scenario on', 'state rosc', await stateId(page), (await stateId(page)) === 'rosc');
    await waitUntilSim(page, tStop + 60);
    await step(r, page, '1 min after stopping CPR', { minSys20to60: r1(minOf(await hist(page, tStop + 20, tStop + 60), 'abpSys')) });
  } finally {
    await finish(page, r, browserName);
  }
});

test('A second scenario in the same page restarts the clock', async ({ page }) => {
  const browserName = test.info().project.name;
  const r = begin('Second scenario load restarts the clock', browserName);
  try {
    const t0 = await start(page, r, 'Healthy induction');
    await waitUntilSim(page, t0 + 120);
    const c1 = await barClock(page);
    await step(r, page, 'first case running 2 min', { clock: c1.text });
    await page.locator('section[aria-label="Running scenario"] button', { hasText: 'Choose another scenario' }).click();
    await page.waitForTimeout(600);
    r.labels.libraryDuringRun = (await page.locator('section[aria-label="Scenario library"]').innerText()).split('\n').slice(0, 4).join(' | ');
    r.labels.backButton = (await page.getByRole('button', { name: 'Back to the running case' }).count()) ? 'Back to the running case' : 'not shown';
    Object.assign(r.labels, Object.fromEntries(Object.entries(await loadShowcase(page, 'Stab wound: tamponade, PEA and pericardiocentesis', { speed: false })).map(([k, v]) => [`second_${k}`, v])));
    await page.waitForTimeout(1500);
    const c2 = await barClock(page);
    const inState = (await page.locator('section[aria-label="Running scenario"]').innerText()).match(/Time in state\s+(\d+:\d+)/)?.[1] ?? '?';
    await step(r, page, 'second case loaded', { clock: c2.text, timeInState: inState });
    check(r, 'the clock restarts on the second load', 'session-bar clock < 00:20 just after loading', `${c1.text} → ${c2.text} (time in state ${inState})`, c2.s < 20);
    await page.waitForTimeout(8000);
    const c3 = await barClock(page);
    await step(r, page, '8 s (wall) later', { clock: c3.text });
    check(r, 'the clock runs after the second load', 'advances', `${c2.text} → ${c3.text}`, c3.s > c2.s);
  } finally {
    await finish(page, r, browserName);
  }
});
