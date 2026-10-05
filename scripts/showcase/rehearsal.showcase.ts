// Proof (b): the five-case rehearsal against the BUILT kit served by its PERL server, on WebKit and Chromium at
// 1440×900. Each case: a fresh page load at #/teach → Scenario tab → Showcase filter → Load → ×4 → its on-panel action
// buttons. Expected values come from the orchestrator's manual rehearsal (generous windows: a smoke rehearsal, not a
// calibration test). Every observed number and every visible label is written to docs/showcase/results/.
// The DEFAULT monitor (Saadat-style) is used throughout; since the showcase hotfix it shows a CO2 tile, read from the DOM.
// Written to hold on the hotfix build (main f29951b) AND the FU-7 drug-layer build: assertions are directions with
// generous floors, never calibration bands.
import { expect, test, type Page } from '@playwright/test';
import { action, alarms, barClock, co2Tile, hist, latest, loadShowcase, maxOf, meanOf, minOf, openTeach, r1, record, runText, save, shot, simNow, stateId, waitSim, waitUntilSim, watchConsole } from './showcase-support.ts';

type Result = { case: string; browser: string; server: string; base: string; steps: Array<Record<string, unknown>>; labels: Record<string, string>; checks: Array<{ what: string; expected: string; observed: unknown; pass: boolean }>; errors: string[] };

function begin(name: string, browser: string): Result {
  return { case: name, browser, server: process.env.SHOWCASE_SERVER ?? '', base: process.env.SHOWCASE_BASE ?? '', steps: [], labels: {}, checks: [], errors: [] };
}
function check(r: Result, what: string, expected: string, observed: unknown, pass: boolean): void {
  r.checks.push({ what, expected, observed, pass });
  expect.soft(pass, `${what}: expected ${expected}, observed ${JSON.stringify(observed)}`).toBe(true);
}
async function step(r: Result, page: Page, what: string, extra: Record<string, unknown> = {}): Promise<void> {
  const v = await latest(page);
  r.steps.push({ simT: r1(await simNow(page)), what, state: await stateId(page), hr: r1(v.hr), art: `${r1(v.abpSys)}/${r1(v.abpDia)} (${r1(v.abpMean)})`, spo2: r1(v.spo2), etco2: r1(v.etco2), rr: r1(v.rr), ...extra });
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function start(page: Page, r: Result, title: string): Promise<number> {
  const errs = watchConsole(page);
  r.errors = errs;
  await openTeach(page);
  if (process.env.SHOWCASE_VENT_FIRST) {
    // probe: the Ventilator view opened in this page before the case is loaded (its cockpit keeps running)
    await page.evaluate(() => (location.hash = '#/vent'));
    await page.waitForTimeout(5000);
    await page.evaluate(() => (location.hash = '#/teach'));
    await page.waitForTimeout(1200);
    r.labels.ventFirst = 'Ventilator view opened for 5 s before loading';
  }
  Object.assign(r.labels, await loadShowcase(page, title));
  await record(page);
  const t = await simNow(page);
  await step(r, page, `loaded "${title}" at ×4`);
  return t;
}
async function finish(page: Page, r: Result, browser: string): Promise<void> {
  r.labels.finalRun = await runText(page).catch(() => '');
  await shot(page, `${slug(r.case)}-${browser}${process.env.SHOWCASE_TAG ?? ""}`);
  r.steps.push({ alarmsRaised: (await alarms(page)).map((a) => `${r1(a.t)} s ${a.text}`).slice(0, 40) });
  check(r, 'no console error or page error', 'none', r.errors.slice(0, 5), r.errors.length === 0);
  save(`rehearsal-${slug(r.case)}-${browser}${process.env.SHOWCASE_TAG ?? ""}.json`, r);
}

test('Healthy induction', async ({ page }) => {
  const browserName = test.info().project.name;
  const r = begin('Healthy induction', browserName);
  try {
    const t0 = await start(page, r, 'Healthy induction');
    await waitUntilSim(page, t0 + 30);
    r.labels.co2TileAwake = (await co2Tile(page)).text;
    const baseMap = meanOf(await hist(page, t0 + 15, t0 + 30), 'abpMean');
    await step(r, page, 'baseline (15–30 s after load)', { baselineMap: r1(baseMap) });
    const tInd = await action(page, 'Induce now');
    await page.waitForTimeout(800);
    r.labels.afterInduce = await runText(page);
    await step(r, page, 'pressed "Induce now"');
    // smoke check: the apnoea ALARM shows 55–62 s after the button depending on where in the breath it is pressed
    await waitSim(page, 120, async () => (await alarms(page)).some((x) => x.t > tInd && /apn/i.test(x.text)));
    const apnAlarm = (await alarms(page)).find((x) => x.t > tInd && /apn/i.test(x.text));
    await step(r, page, 'apnoea alarm', { apnoeaAlarm: apnAlarm?.text ?? null, alarmButton: await page.locator('.alarm-count').innerText(), co2Tile: (await co2Tile(page)).text });
    check(r, 'apnoea alarm after "Induce now"', 'within 70 s sim', apnAlarm ? `${r1(apnAlarm.t - tInd)} s "${apnAlarm.text}"` : 'no apnoea alarm within 120 s', !!apnAlarm && apnAlarm.t - tInd <= 70);
    await waitUntilSim(page, tInd + 120);
    await step(r, page, '2 min after induction');
    const tInt = await action(page, 'Intubate and ventilate');
    await page.waitForTimeout(800);
    r.labels.afterIntubate = await runText(page);
    await step(r, page, 'pressed "Intubate and ventilate"');
    const tCo2 = await waitSim(page, 90, async () => ((await co2Tile(page)).value ?? 0) > 25);
    const tile = await co2Tile(page);
    await step(r, page, 'EtCO2 back on the monitor CO2 tile', { co2Tile: tile.text });
    check(r, 'EtCO2 number on the Saadat CO2 tile after "Intubate and ventilate"', '> 25 mmHg', tCo2 === null ? `not within 90 s (tile "${tile.text}")` : `${tile.value} after ${r1(tCo2 - tInt)} s`, tCo2 !== null);
    await waitUntilSim(page, tInd + 240);
    const nadir = minOf(await hist(page, tInd, tInd + 240), 'abpMean');
    await step(r, page, '4 min after induction', { mapNadir: r1(nadir) });
    check(r, 'arterial mean falls after induction', '≥ 10 mmHg below baseline', `${r1(baseMap)} → nadir ${r1(nadir)}`, baseMap !== null && nadir !== null && baseMap - nadir >= 10);
  } finally {
    await finish(page, r, browserName);
  }
});

test('Anaphylaxis under anaesthesia', async ({ page }) => {
  const browserName = test.info().project.name;
  const r = begin('Anaphylaxis under anaesthesia', browserName);
  try {
    await start(page, r, 'Anaphylaxis under anaesthesia');
    const tA = await waitSim(page, 120, async () => (await stateId(page)) === 'anaphylaxis');
    await step(r, page, 'reaction started (automatically, 60 s after load)');
    r.labels.afterReaction = await runText(page);
    check(r, 'the reaction starts by itself', 'state "Anaphylaxis" within 120 s', tA === null ? 'no' : 'yes', tA !== null);
    if (tA === null) return;
    await waitUntilSim(page, tA + 118);
    const hrWin = maxOf(await hist(page, tA + 100, tA + 118), 'hr');
    await step(r, page, '≈ 2 min into Anaphylaxis', { hrMax100to118: r1(hrWin) });
    check(r, 'HR about 2 min into the Anaphylaxis state', '> 120', r1(hrWin), hrWin !== null && hrWin > 120);
    const tE = await action(page, 'Give epinephrine 100 µg');
    await page.waitForTimeout(800);
    r.labels.afterEpinephrine = await runText(page);
    await step(r, page, 'pressed "Give epinephrine 100 µg"');
    const tUp = await waitSim(page, 90, (_n, v) => typeof v.abpSys === 'number' && v.abpSys > 110);
    await step(r, page, 'systolic recovered');
    check(r, 'systolic after epinephrine', '> 110 within 60 s sim', tUp === null ? `not within 90 s (latest ${r1((await latest(page)).abpSys)})` : `${r1(tUp - tE)} s`, tUp !== null && tUp - tE <= 60);
    await waitUntilSim(page, tE + 120);
    await step(r, page, '2 min after epinephrine');
  } finally {
    await finish(page, r, browserName);
  }
});

test('Severe bronchospasm on the ventilator', async ({ page }) => {
  const browserName = test.info().project.name;
  const r = begin('Severe bronchospasm on the ventilator', browserName);
  const ventText = async () => {
    const f = page.frames().find((x) => x.url().includes('vent-hamilton'));
    return f ? (await f.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 900) : 'no ventilator frame';
  };
  const vte = (t: string): number | null => {
    const m = /(\d+)\s*VTE ml/.exec(t);
    return m ? Number(m[1]) : null;
  };
  const atVent = async (what: string, file: string | null): Promise<number | null> => {
    await page.evaluate(() => (location.hash = '#/vent'));
    await page.waitForTimeout(5000);
    const text = await ventText();
    await step(r, page, what, { vte: vte(text), vent: text, co2Tile: (await co2Tile(page)).text });
    if (file) await shot(page, file);
    await page.evaluate(() => (location.hash = '#/teach'));
    await page.waitForTimeout(1200);
    await page.click('[role=tab][data-tab=scenario]');
    return vte(text);
  };
  try {
    const t0 = await start(page, r, 'Severe bronchospasm on the ventilator');
    await waitUntilSim(page, t0 + 60);
    const vte0 = await atVent('#/vent before salbutamol', `severe-bronchospasm-on-the-ventilator-vent-before-${browserName}`);
    const before = await stateId(page);
    const tS = await action(page, 'Give salbutamol 250 µg');
    await page.waitForTimeout(1000);
    r.labels.afterSalbutamol = await runText(page);
    const after = await stateId(page);
    await step(r, page, 'pressed "Give salbutamol 250 µg"');
    check(r, 'the button changes the scenario state', 'spasm → treatedByButton', `${before} → ${after}`, before === 'spasm' && after === 'treatedByButton');
    const label = 'Salbutamol given: ventilation recovering';
    check(r, 'the new state label is shown', `"${label}" in the state strip`, r.labels.afterSalbutamol.includes(label) ? label : r.labels.afterSalbutamol.split('\n').slice(3, 6).join(' | '), r.labels.afterSalbutamol.includes(label));
    await waitUntilSim(page, tS + 180);
    const vte3 = await atVent('#/vent 3 min after salbutamol', `severe-bronchospasm-on-the-ventilator-vent-after-${browserName}`);
    check(r, 'delivered tidal volume recovers after salbutamol', 'VTE rises by ≥ 100 mL within 3 min', `${vte0} → ${vte3} mL`, vte0 !== null && vte3 !== null && vte3 - vte0 >= 100);
    await waitUntilSim(page, tS + 360);
    await atVent('#/vent 6 min after salbutamol (observation only)', null);
  } finally {
    await finish(page, r, browserName);
  }
});

test('Severe tamponade, then induction', async ({ page }) => {
  const browserName = test.info().project.name;
  const r = begin('Severe tamponade, then induction', browserName);
  try {
    const t0 = await start(page, r, 'Severe tamponade, then induction');
    await waitUntilSim(page, t0 + 30);
    await step(r, page, 'compensating, 30 s after load');
    const tP = await action(page, 'Give propofol 2 mg/kg');
    await page.waitForTimeout(800);
    r.labels.afterPropofol = await runText(page);
    await step(r, page, 'pressed "Give propofol 2 mg/kg"');
    const tLow = await waitSim(page, 300, (_n, v) => typeof v.abpMean === 'number' && v.abpMean < 40);
    await step(r, page, 'arterial mean < 40');
    check(r, 'arterial mean after propofol', '< 40 mmHg (within 5 min sim)', tLow === null ? `not within 300 s (latest ${r1((await latest(page)).abpMean)})` : `${r1(tLow - tP)} s`, tLow !== null);
    await waitUntilSim(page, tP + 125);
    // observations for the run sheet (no assertion): apnoea alarm, pressures at 1 and 2 min, when the pulse is lost
    // (arterial systolic/diastolic blank = "IBP1 STATIC PRESSURE", or systolic < 20)
    const h = await hist(page, tP, tP + 125);
    const ha = h.filter((s) => 'abpMean' in s); // measurement events can be partial
    const hh = h.filter((s) => 'hr' in s);
    const nearIn = (xs: typeof h, t: number) => xs.reduce((a, s) => (Math.abs(s.t - t) < Math.abs(a.t - t) ? s : a), xs[0]);
    const near = (t: number) => ({ ...nearIn(ha, t), hr: hh.length ? nearIn(hh, t).hr : null });
    const art = (s: { abpSys?: number | null; abpDia?: number | null; abpMean?: number | null; hr?: number | null }) => `${r1(s.abpSys)}/${r1(s.abpDia)} (${r1(s.abpMean)}) HR ${r1(s.hr)}`;
    const lostAt = h.find((s) => (s.abpSys === null && typeof s.abpMean === 'number') || (typeof s.abpSys === 'number' && s.abpSys < 20));
    const al = (await alarms(page)).filter((x) => x.t > tP);
    await step(r, page, '2 min after propofol', {
      apnoeaAlarmAfterS: r1((al.find((x) => /apn/i.test(x.text))?.t ?? NaN) - tP), at1min: ha.length ? art(near(tP + 60)) : null, at2min: ha.length ? art(near(tP + 120)) : null,
      pulselessAfterS: lostAt ? r1(lostAt.t - tP) : null, alarmsAfterPropofol: al.map((x) => `${r1(x.t - tP)} s ${x.text}`),
    });
  } finally {
    await finish(page, r, browserName);
  }
});

test('Class IV haemorrhage, PEA and resuscitation', async ({ page }) => {
  const browserName = test.info().project.name;
  const r = begin('Class IV haemorrhage, PEA and resuscitation', browserName);
  try {
    const t0 = await start(page, r, 'Class IV haemorrhage, PEA and resuscitation');
    for (const m of [2, 4, 6, 8]) {
      await waitUntilSim(page, t0 + m * 60);
      await step(r, page, `${m} min of bleeding`);
    }
    // Pulse lost = arterial systolic < 20, OR the monitor blanks systolic/diastolic and keeps only the mean (its
    // "IBP1 STATIC PRESSURE" state: no pulsatile trace). Measured on the first run: the static-pressure state comes
    // first (≈ 10 min) and the systolic number never goes below 20, it disappears.
    const lost = (v: { abpSys?: number | null; abpMean?: number | null }) => (typeof v.abpSys === 'number' && v.abpSys < 20) || (v.abpSys === null && typeof v.abpMean === 'number');
    const tPoll = await waitSim(page, 7 * 60, (_n, v) => lost(v));
    const first = (await hist(page, t0 + 60, Infinity)).find((s) => lost(s));
    const tLoss = tPoll === null ? null : (first?.t ?? tPoll);
    const al = await alarms(page);
    await step(r, page, 'pulse lost (systolic < 20 or static arterial pressure)', {
      firstLostSample: first ?? null,
      staticPressureAlarm: r1(al.find((a) => /STATIC/i.test(a.text))?.t), noPulseAlarm: r1(al.find((a) => /NO PULSE/i.test(a.text))?.t),
    });
    check(r, 'pulse lost', 'between 8 and 13 min sim', tLoss === null ? 'not by 15 min' : `${r1((tLoss - t0) / 60)} min`, tLoss !== null && tLoss - t0 >= 480 && tLoss - t0 <= 780);
    if (tLoss === null) return;
    // WHEN to press CPR matters (measured, docs/showcase/KIT-GATE.md): pressed ≈ 25 s after the arterial trace goes
    // static (10:28) the rhythm turned to VF within 5 s and no pulse returned in 8 min (both browsers); pressed after
    // the "SPO2 NO PULSE" alarm (≈ 10:40; probes at 10:52 and 11:47) the pulse returned after 4.3 min. The rehearsal
    // follows the run-sheet cue: press about 10 s after "SPO2 NO PULSE". SHOWCASE_CPR_AT=<sim s> probes others.
    const cprAt = Number(process.env.SHOWCASE_CPR_AT ?? 0);
    if (cprAt) await waitUntilSim(page, cprAt); // absolute sim time = the session-bar clock (10:28 → 628)
    else {
      const tNp = await waitSim(page, 180, async () => (await alarms(page)).some((a) => /NO PULSE/i.test(a.text)));
      await step(r, page, 'monitor alarm "SPO2 NO PULSE"');
      await waitUntilSim(page, (tNp ?? (await simNow(page))) + 10);
    }
    const tC = await action(page, 'Start CPR, 2 L and epinephrine');
    await page.waitForTimeout(800);
    r.labels.afterCpr = await runText(page);
    await step(r, page, 'pressed "Start CPR, 2 L and epinephrine"');
    const tR = await waitSim(page, 8 * 60, (_n, v) => typeof v.abpSys === 'number' && v.abpSys > 90);
    await step(r, page, 'arterial systolic > 90');
    check(r, 'circulation returns during CPR', 'arterial systolic > 90 within 7 min sim', tR === null ? `not within 8 min (max ${r1(maxOf(await hist(page, tC, Infinity), 'abpSys'))})` : `${r1((tR - tC) / 60)} min`, tR !== null && tR - tC <= 420);
    const tStop = await action(page, 'Pulse back: stop CPR');
    await page.waitForTimeout(800);
    r.labels.afterStopCpr = await runText(page);
    await step(r, page, 'pressed "Pulse back: stop CPR"');
    check(r, '"Pulse back: stop CPR" moves the scenario on', 'state rosc', await stateId(page), (await stateId(page)) === 'rosc');
    await waitUntilSim(page, tStop + 60);
    const sys = minOf(await hist(page, tStop + 20, tStop + 60), 'abpSys');
    await step(r, page, '1 min after stopping CPR (observation only)', { minSys20to60: r1(sys) });
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
    Object.assign(r.labels, Object.fromEntries(Object.entries(await loadShowcase(page, 'Severe tamponade, then induction', { speed: false })).map(([k, v]) => [`second_${k}`, v])));
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
