// Blind realism review page (brief §9 steps 2–3, 6). Loads a bundle (packages/validation review:build), shuffles it
// once per session, draws each clip live with the renderer's SweepLane (25 mm/s; CO2 6.25 mm/s, the skin defaults),
// collects real/synthetic + realism 1–5 + comment, keeps progress in localStorage (per bundle session and rater) and
// downloads the answers JSON for `review:score`. The page never sees the key.
import { DEFAULT_PX_PER_MM, SweepLane, WAVE_STYLE, scaleFor } from '@pme/renderer';

interface Clip { id: string; channel: 'ecgII' | 'abp' | 'pleth' | 'co2'; fs: number; unit: string; range: [number, number] | null; x: number[] }
interface Bundle { schema: 'pme-review-bundle/1'; session: string; clips: Clip[] }
interface Answer { id: string; guess: 'real' | 'synthetic'; realism: 1 | 2 | 3 | 4 | 5; comment: string; order: number }

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('lane');
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
let bundle: Bundle | null = null;
let order: number[] = [];
let k = 0;
let answers: Answer[] = [];
let startedAt = '';
let guess: Answer['guess'] | null = null;
let realism: Answer['realism'] | null = null;
let raf = 0;

const storeKey = () => `pme-review:${bundle?.session}:${$<HTMLInputElement>('rater').value.trim()}`;
function save(): void {
  try { localStorage.setItem(storeKey(), JSON.stringify({ order, k, answers, startedAt })); } catch { /* private mode: progress is not kept */ }
}
function restore(): boolean {
  try {
    const s = JSON.parse(localStorage.getItem(storeKey()) ?? 'null') as { order: number[]; k: number; answers: Answer[]; startedAt: string } | null;
    if (!s) return false;
    ({ order, k, answers, startedAt } = s);
    return true;
  } catch { return false; }
}

function play(c: Clip): void {
  cancelAnimationFrame(raf);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 940 * dpr;
  canvas.height = 220 * dpr;
  const style = c.channel === 'ecgII' ? { color: '#00ff66', range: null as [number, number] | null, mmPerS: 25 } : { color: WAVE_STYLE[c.channel].color, range: WAVE_STYLE[c.channel].range, mmPerS: WAVE_STYLE[c.channel].mmPerS ?? 25 };
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of c.x) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const [a, b] = c.range ?? style.range ?? (c.channel === 'ecgII' ? [lo - 0.2, hi + 0.2] : [lo - 0.1 * (hi - lo), hi + 0.1 * (hi - lo)]);
  const h = 200;
  const sc = c.channel === 'ecgII' ? { baseline: 0.6, gainMmPerMv: 10 } : scaleFor(a, b, h, DEFAULT_PX_PER_MM);
  const lane = new SweepLane({ x: 10, y: 10, width: 920, height: h, baseline: sc.baseline, rate: c.fs, mmPerS: style.mmPerS, pxPerMm: DEFAULT_PX_PER_MM, gainMmPerMv: sc.gainMmPerMv, color: style.color, background: '#000', lineWidth: 1.8, eraseGapPx: 16 }, dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 940, 220);
  const n = c.x.length;
  const t0 = performance.now();
  // the clip loops; sample index i maps to x[i mod n] so the sweep never runs dry
  const read = (from: number, out: Float32Array) => {
    for (let i = 0; i < out.length; i++) out[i] = c.x[(((from + i) % n) + n) % n] as number;
    return out.length;
  };
  const frame = () => {
    lane.draw(ctx, (performance.now() - t0) / 1000, read);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

function show(): void {
  if (!bundle) return;
  if (k >= order.length) {
    cancelAnimationFrame(raf);
    $('status').textContent = `Done: ${answers.length} clips rated. Download the answers and send the file back.`;
    $<HTMLButtonElement>('next').disabled = true;
    return;
  }
  const c = bundle.clips[order[k] as number] as Clip;
  guess = null;
  realism = null;
  $<HTMLTextAreaElement>('comment').value = '';
  document.querySelectorAll('button[data-guess],button[data-r]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  $<HTMLButtonElement>('next').disabled = true;
  $('status').textContent = `Clip ${k + 1} of ${order.length} · ${c.channel === 'ecgII' ? 'ECG II' : WAVE_STYLE[c.channel].label} · 10 s, looping`;
  play(c);
}

document.querySelectorAll<HTMLButtonElement>('button[data-guess]').forEach((b) => b.addEventListener('click', () => {
  guess = b.dataset.guess as Answer['guess'];
  document.querySelectorAll('button[data-guess]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  $<HTMLButtonElement>('next').disabled = !(guess && realism);
}));
document.querySelectorAll<HTMLButtonElement>('button[data-r]').forEach((b) => b.addEventListener('click', () => {
  realism = Number(b.dataset.r) as Answer['realism'];
  document.querySelectorAll('button[data-r]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  $<HTMLButtonElement>('next').disabled = !(guess && realism);
}));
$('next').addEventListener('click', () => {
  if (!bundle || !guess || !realism) return;
  const c = bundle.clips[order[k] as number] as Clip;
  answers.push({ id: c.id, guess, realism, comment: $<HTMLTextAreaElement>('comment').value, order: k });
  k++;
  save();
  show();
});
$('save').addEventListener('click', () => {
  if (!bundle) return;
  const out = { schema: 'pme-review-answers/1', session: bundle.session, rater: $<HTMLInputElement>('rater').value.trim(), startedAt, finishedAt: new Date().toISOString(), answers };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }));
  a.download = `answers-${out.session}-${out.rater.replace(/\W+/g, '-') || 'rater'}.json`;
  a.click();
});
$<HTMLInputElement>('file').addEventListener('change', async (ev) => {
  const f = (ev.target as HTMLInputElement).files?.[0];
  if (!f) return;
  if (!$<HTMLInputElement>('rater').value.trim()) { alert('Enter your name first (it keys your saved progress).'); return; }
  bundle = JSON.parse(await f.text()) as Bundle;
  if (bundle.schema !== 'pme-review-bundle/1') { alert('Not a review bundle'); return; }
  if (!restore()) {
    order = bundle.clips.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j] as number, order[i] as number]; }
    k = 0;
    answers = [];
    startedAt = new Date().toISOString();
  }
  $('setup').classList.add('hidden');
  $('review').classList.remove('hidden');
  (window as unknown as { __pmeReview: unknown }).__pmeReview = { get k() { return k; }, get n() { return order.length; }, answers };
  show();
});
