import { Clock } from '@pme/engine-core';
import { DEFAULT_PX_PER_MM, sweepPxPerS, sweepX } from '@pme/renderer';

const LANE_W = 1000; // CSS px
const LANE_H = 120;
const MM_PER_S = 25;

const canvas = document.getElementById('lane') as HTMLCanvasElement;
const readout = document.getElementById('readout') as HTMLDivElement;
const dpr = window.devicePixelRatio || 1;
canvas.style.width = `${LANE_W}px`;
canvas.style.height = `${LANE_H}px`;
canvas.width = Math.round(LANE_W * dpr);
canvas.height = Math.round(LANE_H * dpr);
const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const clock = new Clock();
const pxPerS = sweepPxPerS(MM_PER_S, DEFAULT_PX_PER_MM);
let throttle30 = false;
let frameParity = 0;
let lastWall: number | null = null;
let lastWrapWall: number | null = null;
let lastLapS: number | null = null;
let prevX = 0;

function drawStatic(): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, LANE_W, LANE_H);
  ctx.fillStyle = '#555';
  for (let s = 0; s * pxPerS < LANE_W; s++) ctx.fillRect(Math.round(s * pxPerS), LANE_H - 12, 1, 12);
}

function frame(now: number): void {
  requestAnimationFrame(frame);
  if (throttle30 && frameParity++ % 2 === 1) return; // skip every other rAF; wall Δ still counts
  const dt = lastWall === null ? 0 : now - lastWall;
  lastWall = now;
  clock.advance(dt);
  const t = clock.renderT;
  const x = sweepX(t, MM_PER_S, DEFAULT_PX_PER_MM, LANE_W);
  if (x < prevX) {
    if (lastWrapWall !== null) lastLapS = (now - lastWrapWall) / 1000;
    lastWrapWall = now;
  }
  prevX = x;
  drawStatic();
  ctx.fillStyle = '#3f3';
  ctx.fillRect(Math.floor(x), 0, 2, LANE_H - 14);
  const measured = lastLapS === null ? '…' : `${(LANE_W / lastLapS / clock.timeScale).toFixed(2)} px/s per sim s`;
  readout.textContent =
    `simT ${t.toFixed(3)} s   tick ${clock.tick}   scale ${clock.timeScale}×   ` +
    `${throttle30 ? '30' : '60'} fps mode\n` +
    `expected ${pxPerS.toFixed(2)} px/s   last lap ${lastLapS === null ? '…' : lastLapS.toFixed(2) + ' s wall'}   measured ${measured}`;
}

for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-scale]')) {
  b.addEventListener('click', () => {
    clock.timeScale = Number(b.dataset.scale);
    for (const o of document.querySelectorAll('button[data-scale]')) o.setAttribute('aria-pressed', String(o === b));
    lastWrapWall = null;
    lastLapS = null;
  });
}
const pauseBtn = document.getElementById('pause') as HTMLButtonElement;
pauseBtn.addEventListener('click', () => {
  if (clock.paused) clock.resume();
  else clock.pause();
  pauseBtn.textContent = clock.paused ? 'Resume' : 'Pause';
  lastWrapWall = null;
});
const fpsBtn = document.getElementById('fps30') as HTMLButtonElement;
fpsBtn.addEventListener('click', () => {
  throttle30 = !throttle30;
  fpsBtn.setAttribute('aria-pressed', String(throttle30));
});

drawStatic();
requestAnimationFrame(frame);
