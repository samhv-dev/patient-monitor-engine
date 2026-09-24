// Stage 4a preview page: every skin/preset × theme drawn statically, plus each alarm sound profile playable on
// demand through the real look-ahead ToneScheduler and AlarmSounder. `?skin=&theme=&static=1` gives a deterministic
// frame for the gate screenshots; window.__pme4a exposes state and an OfflineAudioContext timing renderer.
import {
  AlarmSounder, createTonePlayer, getAlarmProfile, pitchHz, playAlarmPulse, ToneScheduler, unlockAudio,
  type AlarmLevel, type AlarmToneRequest, type AudioOut, type ToneLogEntry, type ToneRequest,
} from '@pme/audio';
import { PRESET_IDS, resolveSkin, SKIN_IDS, THEME_IDS, type ResolvedSkin } from '@pme/skins';
import { renderScreen } from './screen.ts';
import { measureOnsets, type OnsetReport } from './timing.ts';

const q = new URLSearchParams(location.search);
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const skinSel = $<HTMLSelectElement>('skin');
const themeSel = $<HTMLSelectElement>('theme');
for (const id of [...SKIN_IDS, ...PRESET_IDS]) skinSel.add(new Option(id, id));
themeSel.add(new Option('(skin default)', ''));
for (const id of THEME_IDS) themeSel.add(new Option(id, id));
skinSel.value = q.get('skin') ?? 'saadat-like';
themeSel.value = q.get('theme') ?? '';
const animate = q.get('static') !== '1';

let resolved: ResolvedSkin = resolveSkin(skinSel.value, themeSel.value ? { theme: themeSel.value } : {});
let audio: AudioOut | null = null;
let sched: ToneScheduler | null = null;
let sounder: AlarmSounder | null = null;
const t0 = performance.now();
const simNow = () => (performance.now() - t0) / 1000; // sim time = wall time on this page

function overrides(r: ResolvedSkin) {
  const a = r.audio.alarm;
  return { repeatS: a.repeatS, lowPulses: a.lowPulses, volume: a.volume, silence: a.silence };
}

function buildSounder(): void {
  sounder?.dispose();
  if (!sched) return;
  sounder = new AlarmSounder(sched, getAlarmProfile(resolved.audio.alarm.profile), { overrides: overrides(resolved) });
  syncVolume();
}

function syncVolume(): void {
  const v = resolved.audio.alarm.volume;
  const vol = $<HTMLInputElement>('vol');
  vol.min = String(v.min);
  vol.max = String(v.max);
  vol.value = String(sounder?.volume ?? v.default);
  $('volVal').textContent = vol.value;
}

function render(): void {
  resolved = resolveSkin(skinSel.value, themeSel.value ? { theme: themeSel.value } : {});
  renderScreen($('screen'), resolved, animate);
  const names = resolved.skin.alarms.levelNames;
  $('levels').innerHTML = [1, 2, 3].map((l) => `<button data-level="${l}">Raise ${resolved.audio.alarm.profile} level ${names[l - 1]}</button>`).join(' ');
  buildSounder();
  syncVolume();
  (window as unknown as { __pme4a: object }).__pme4a = api;
  api.ready = true;
}

$('sound').addEventListener('click', async () => {
  if (audio) return;
  audio = await unlockAudio(() => sched?.clear());
  const out = audio;
  sched = new ToneScheduler({
    audioNow: () => out.ctx.currentTime,
    perfToAudio: out.perfToAudio,
    outputLatency: out.outputLatency,
    play: (tone, when) => createTonePlayer(out.ctx, out.master, { profile: getAlarmProfile(resolved.audio.alarm.profile), toneSet: resolved.skin.defib?.toneSet ?? 'zoll-like' })(tone, when),
  });
  sched.clock.setAnchor({ simT: 0, perfMs: t0, timeScale: 1 });
  sched.start();
  buildSounder();
  setInterval(() => sounder?.pump(simNow()), 25);
  $('sound').textContent = 'Sound on';
});

let raised = 0;
$('levels').addEventListener('click', (e) => {
  const lvl = Number((e.target as HTMLElement).dataset.level) as AlarmLevel;
  if (lvl && sounder) sounder.raise(`demo-${lvl}-${raised++}`, lvl, simNow());
});
$('clear').addEventListener('click', () => {
  sounder?.dispose();
  buildSounder();
});
$('silence').addEventListener('click', () => {
  if (!sounder) return;
  if (sounder.silencedUntil === null) sounder.silenceAll(simNow());
  else sounder.endSilence(simNow());
});
$<HTMLInputElement>('vol').addEventListener('input', (e) => {
  sounder?.setVolume(Number((e.target as HTMLInputElement).value));
  $('volVal').textContent = String(sounder?.volume ?? '');
});
$('devtones').innerHTML = ['charge', 'chargeReady', 'shock', 'nibpDone'].map((k) => `<button data-tone="${k}">${k}</button>`).join(' ');
$('devtones').addEventListener('click', (e) => {
  const kind = (e.target as HTMLElement).dataset.tone;
  if (kind && sched) sched.enqueue({ t: simNow() + 0.05, id: `dev-${kind}-${performance.now()}`, kind, ...(kind === 'charge' ? { chargeS: 5 } : {}) } as ToneRequest);
});
$('beeps').innerHTML = [100, 90, 80].map((s) => `<button data-spo2="${s}">Beep SpO2 ${s}</button>`).join(' ');
$('beeps').addEventListener('click', (e) => {
  const spo2 = Number((e.target as HTMLElement).dataset.spo2);
  const f = pitchHz(resolved.audio.beep.pitchMap, spo2, resolved.audio.beep.baseHz);
  if (spo2 && f !== null && sched) sched.enqueue({ t: simNow() + 0.05, id: `beep-${performance.now()}`, kind: 'qrs', freqHz: f });
});
skinSel.addEventListener('change', render);
themeSel.addEventListener('change', render);

setInterval(() => {
  const until = sounder?.silencedUntil;
  const log: readonly ToneLogEntry[] = sched?.log ?? [];
  $('diag').textContent =
    `profile ${resolved.audio.alarm.profile}  sounding ${sounder?.sounding ?? '-'}  ` +
    `${until != null ? `SILENCE ${Math.max(0, Math.ceil(until - simNow()))} s  ` : ''}tones ${log.length}\n` +
    `lane contract: ${resolved.render.lanes.map((l) => `${l.lane} ${l.color} ${l.mmPerS}mm/s`).join(' | ')}\n` +
    `ECG filter ${resolved.render.ecgFilter.name} ${resolved.render.ecgFilter.band.join('–')} Hz → engine '${resolved.render.ecgFilter.engineMode}'${resolved.render.ecgFilter.exact ? '' : ' (approximate)'}`;
}, 250);

/** Render one profile level offline and measure pulse onsets (gate evidence; BUILD-PLAN Stage 4 acceptance 1). */
async function renderTiming(profileId: string, level: AlarmLevel, seconds: number, skinId?: string): Promise<OnsetReport> {
  const sr = 48_000;
  const ctx = new OfflineAudioContext(1, Math.ceil(sr * seconds), sr);
  const profile = getAlarmProfile(profileId);
  const ov = skinId ? overrides(resolveSkin(skinId)) : {};
  const fake = {
    clock: { timeScale: 1 },
    enqueue: (t: ToneRequest) => void playAlarmPulse(ctx, ctx.destination, t.t, t as AlarmToneRequest, profile.harmonicsDb, profile.rampMs),
    cancel: () => undefined,
  };
  const s = new AlarmSounder(fake, profile, { overrides: ov, horizonS: seconds });
  s.raise('offline', level, 0);
  const buf = await ctx.startRendering();
  return measureOnsets(buf.getChannelData(0), sr);
}

const api = { ready: false, get resolved() { return resolved; }, renderTiming };
render();
