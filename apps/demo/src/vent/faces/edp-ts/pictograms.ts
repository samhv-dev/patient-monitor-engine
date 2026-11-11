// The EDP-TS face's pictograms (brief 159, R7, R8, R11, R12, R15, R18): ONE entry per subject the photographs show
// (research/57 P-07 to P-17), each my own drawing of that subject in inline SVG, never a trace of the device's artwork
// and never a bitmap. Strokes and fills are `currentColor` or a class the stylesheet colours from face.json's tokens
// (provenance.test.ts forbids a colour literal here). A later piece that needs a new pictogram adds one entry.
const NS = 'http://www.w3.org/2000/svg';

type Draw = Array<[string, Record<string, string | number>]>;
const svg = (vb: string, parts: Draw, cls = ''): SVGSVGElement => {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', vb);
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  s.setAttribute('class', `picto ${cls}`.trim());
  for (const [tag, at] of parts) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(at)) e.setAttribute(k, String(v));
    s.append(e);
  }
  return s;
};
const line = { fill: 'none', stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const;
const ink = { fill: 'currentColor', stroke: 'none' } as const;
const lungs = (dy = 0): Draw => [
  ['path', { ...ink, class: 'pf', d: `M11 ${4 + dy} C7 ${5 + dy} 3 ${11 + dy} 3 ${19 + dy} C3 ${23 + dy} 6 ${24 + dy} 10 ${22 + dy} L13 ${20 + dy} L13 ${8 + dy} Z` }],
  ['path', { ...ink, class: 'pf', d: `M19 ${4 + dy} C23 ${5 + dy} 27 ${11 + dy} 27 ${19 + dy} C27 ${23 + dy} 24 ${24 + dy} 20 ${22 + dy} L17 ${20 + dy} L17 ${8 + dy} Z` }],
  ['path', { ...line, 'stroke-width': 1.6, d: `M15 ${0 + dy} L15 ${9 + dy} M15 ${9 + dy} L12 ${12 + dy} M15 ${9 + dy} L18 ${12 + dy}` }],
];

/** The pictograms, by subject. `o` carries a drawing's one variable (the tag's side, the waveform's shape). */
export const PICTO = {
  // left column (P-10): the battery, full and green; the lungs that show a patient's effort (research/57 V-05, V-06)
  battery: () => svg('0 0 34 16', [['rect', { x: 1, y: 1, width: 29, height: 14, rx: 2, class: 'bf' }], ['rect', { x: 30, y: 5, width: 3, height: 6, class: 'bf' }]], 'bat'),
  lungs: () => svg('0 0 30 26', lungs()),
  // the alarm-limit step (P-09): a step from low to high with an arrowhead at the side(s) the tag shows
  step: (o: 'hi' | 'lo' | 'both' = 'hi') => svg('0 0 26 22', [
    ['path', { ...line, 'stroke-width': 1.3, d: 'M1 20 L8 20 L16 3 L25 3' }],
    ...(o !== 'lo' ? [['path', { ...ink, d: 'M17 9 L20.5 3.5 L24 9 Z' }] as [string, Record<string, string>]] : []),
    ...(o !== 'hi' ? [['path', { ...ink, d: 'M1 13 L4.5 18.5 L8 13 Z' }] as [string, Record<string, string>]] : []),
  ]),
  // message bar (P-08): volume compensation's icon (a stack of bars in a square), and the three faint status places
  volComp: () => svg('0 0 22 20', [['rect', { ...line, 'stroke-width': 1.4, x: 3, y: 3, width: 16, height: 14, rx: 2 }], ['path', { ...line, 'stroke-width': 1.4, d: 'M7 6 V14 M10 6 V14 M13 6 V14 M16 6 V14' }]]),
  faintA: () => svg('0 0 22 20', [['path', { ...line, 'stroke-width': 1.4, d: 'M6 16 L11 4 L16 16 M8 12 H14' }]]),
  faintB: () => svg('0 0 22 20', [['rect', { ...line, 'stroke-width': 1.4, x: 5, y: 5, width: 12, height: 11, rx: 1 }], ['path', { ...line, 'stroke-width': 1.4, d: 'M8 9 H14 M8 12 H14' }]]),
  faintC: () => svg('0 0 22 20', [['path', { ...line, 'stroke-width': 1.4, d: 'M5 6 L11 15 L17 6 M8 6 H14' }]]),
  // the pictogram column (P-07), top to bottom
  graphics: () => svg('0 0 34 26', [
    ['rect', { ...line, 'stroke-width': 1.4, x: 1, y: 1, width: 32, height: 24, rx: 2 }],
    ['path', { ...line, 'stroke-width': 1.2, d: 'M17 1 V25 M1 9 H17 M1 17 H17 M17 13 H33' }],
    ['path', { ...line, 'stroke-width': 1.2, d: 'M3 6 l2 -2 l2 2 l2 -2 l2 2 l2 -2 M3 14 l3 -2 l3 2 l3 -2 l3 2 M3 22 l2 -2 l2 2 l2 -2 l2 2 l2 -2' }],
    ['path', { ...line, 'stroke-width': 1.2, d: 'M21 11 C21 5 28 4 30 6 M21 23 C22 17 28 16 30 18' }],
  ]),
  freeze: () => svg('0 0 30 30', [['path', { ...line, 'stroke-width': 2.2, d: 'M15 2 V28 M3.7 8.5 L26.3 21.5 M3.7 21.5 L26.3 8.5 M11 4 L15 7.5 L19 4 M11 26 L15 22.5 L19 26 M2.6 12.6 L7.6 11.2 L6.4 6.2 M27.4 17.4 L22.4 18.8 L23.6 23.8 M2.6 17.4 L7.6 18.8 L6.4 23.8 M27.4 12.6 L22.4 11.2 L23.6 6.2' }]]),
  respMech: () => svg('0 0 30 32', [...lungs(-2), ['rect', { ...line, 'stroke-width': 1.3, x: 2, y: 24, width: 26, height: 7, rx: 1 }], ['path', { ...line, 'stroke-width': 1.1, d: 'M6 24 V27 M10 24 V28 M14 24 V27 M18 24 V28 M22 24 V27 M26 24 V28' }]]),
  saveLoop: () => svg('0 0 32 32', [
    ['rect', { ...line, 'stroke-width': 1.3, x: 2, y: 2, width: 15, height: 15, rx: 1 }],
    ['path', { ...line, 'stroke-width': 1.3, d: 'M5 14 C5 7 10 4 14 5 C13 10 9 13 5 14 Z' }],
    ['path', { ...line, 'stroke-width': 1.5, d: 'M22 8 V20 M18.5 16.5 L22 20 L25.5 16.5 M12 22 H30 V30 H12 Z' }],
  ]),
  nebulizer: () => svg('0 0 32 32', [
    ['path', { ...line, 'stroke-width': 1.4, d: 'M7 30 H19 V16 C19 13 17 12 15 12 H11 C9 12 7 13 7 16 Z M10 12 V8 H16 V12 M16 9 H21' }],
    ['path', { ...line, 'stroke-width': 1.1, d: 'M23 9 L29 5 M23 9 L30 9 M23 9 L29 13 M24 6.5 L26 4 M24 11.5 L26 14' }],
  ]),
  help: () => svg('0 0 30 30', [['path', { ...line, 'stroke-width': 3, d: 'M10 10 C10 5 20 5 20 10 C20 14 15 14 15 19' }], ['circle', { ...ink, cx: 15, cy: 25, r: 2 }]]),
  standby: () => svg('0 0 30 30', [...lungs(1), ['circle', { ...line, class: 'pw', 'stroke-width': 2.2, cx: 15, cy: 20, r: 6.5 }], ['path', { ...line, class: 'pw', 'stroke-width': 2.2, d: 'M15 11 V19' }]]),
  // settings row (P-13): Rise Time's slope in a dotted frame; Flow Waveform's shape (square or descending, research/57 T-23)
  riseTime: () => svg('0 0 32 30', [['rect', { ...line, 'stroke-width': 1, 'stroke-dasharray': '1.5 2', x: 7, y: 2, width: 16, height: 26 }], ['path', { ...line, 'stroke-width': 2, d: 'M2 28 L9 28 L21 3 L30 3' }]]),
  flowWave: (o: 'square' | 'descending' = 'descending') => svg('0 0 32 24', [['path', { ...line, class: 'fw', 'stroke-width': 2.6, d: o === 'square' ? 'M3 21 V4 H29 V21' : 'M3 21 V4 L29 18' }]]),
  // the housing (P-14, P-16): the lock key's padlock, the silence key's crossed bell, Alarm Limits' small mark, power
  padlock: () => svg('0 0 24 28', [['path', { ...line, 'stroke-width': 3, d: 'M7 13 V8 C7 2 17 2 17 8 V13' }], ['rect', { ...ink, x: 3, y: 12, width: 18, height: 14, rx: 2 }], ['rect', { x: 10.5, y: 16, width: 3, height: 6, rx: 1, class: 'hole' }]]),
  bellX: () => svg('0 0 30 30', [['path', { ...ink, d: 'M15 4 C9 4 8 9 8 13 C8 18 5 20 5 22 H25 C25 20 22 18 22 13 C22 9 21 4 15 4 Z' }], ['circle', { ...ink, cx: 15, cy: 25, r: 2.5 }], ['path', { ...line, 'stroke-width': 1.6, d: 'M3 3 L27 27 M27 3 L3 27' }]]),
  alarmLim: () => svg('0 0 30 12', [['path', { ...line, 'stroke-width': 1.2, d: 'M1 11 H6 L10 3 H14 M16 11 H21 L25 3 H29' }], ['path', { ...ink, d: 'M3 2 L5 6 L7 2 Z M24 6 L26 2 L28 6 Z' }]]),
  plug: () => svg('0 0 26 14', [['path', { class: 'plugfill', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linejoin': 'round', d: 'M7 1.5 V12.5 H13 C18 12.5 19 9 19 7 C19 5 18 1.5 13 1.5 Z' }], ['path', { ...line, 'stroke-width': 1.6, d: 'M1 4 H7 M1 10 H7 M19 7 H25' }]]),
  batteryOutline: () => svg('0 0 14 24', [['rect', { ...line, 'stroke-width': 1.6, x: 2, y: 4, width: 10, height: 19, rx: 1 }], ['path', { ...line, 'stroke-width': 1.6, d: 'M5 1.5 H9' }]]),
} as const;
export type PictoId = keyof typeof PICTO;
export const picto = (id: PictoId, o?: string): SVGSVGElement => (PICTO[id] as (o?: string) => SVGSVGElement)(o);
