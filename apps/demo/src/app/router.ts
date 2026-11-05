// Hash routing without a router dependency (research/13 brief §5): `#/teach`, `#/explore/respiratory`, `#/validate/review`.
// Views are sections toggled with `hidden`; the monitor region is never unmounted while the session lives.
// E125 (owner, 26 October): the app opens on Home (`#/`, `#/home`); the old `#/start` address still reaches it.
// E127: `#/teach2` is Instructor v2, built beside today's Instructor view (`#/teach`).
export const ROUTES = ['home', 'room', 'scenarios', 'patient', 'monitor', 'teach', 'teach2', 'remote', 'explore', 'vent', 'validate', 'dev', 'settings', 'debrief'] as const;
export type RouteId = (typeof ROUTES)[number];
export interface Route {
  id: RouteId;
  /** The rest of the path ("respiratory" in #/explore/respiratory), or ''. */
  sub: string;
}

/** Views that need the engine session (every other view works without one, e.g. a paired Remote). */
export const HOST_ROUTES: ReadonlySet<RouteId> = new Set(['monitor', 'teach', 'teach2', 'explore', 'vent', 'home', 'room', 'scenarios', 'patient', 'debrief']);

/** The pages before a session (Home, Room, Scenarios, Patient): full pages beside the rail, with no top bar, no session
 *  bar and no monitor stage. */
export const CONSOLE_ROUTES: ReadonlySet<RouteId> = new Set(['home', 'room', 'scenarios', 'patient']);

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const [raw = '', ...rest] = path.split('/').filter(Boolean);
  const head = raw === 'start' ? 'home' : raw;
  const id = (ROUTES as readonly string[]).includes(head) ? (head as RouteId) : 'home';
  return { id, sub: id === head ? rest.join('/') : '' };
}

/** The `i` key and the reveal gestures: the monitor opens the chosen Instructor view, either Instructor view goes back
 *  to the monitor; any other page, nothing. */
export const revealTarget = (from: RouteId, instructor: RouteId): RouteId | null =>
  from === 'monitor' ? instructor : from === 'teach' || from === 'teach2' ? 'monitor' : null;

export const hrefOf = (id: RouteId, sub = ''): string => `#/${id === 'home' ? '' : id}${sub ? `/${sub}` : ''}`;

/** Calls `fn` now and on every hash change; returns the unsubscribe. */
export function onRoute(fn: (r: Route) => void, win: Window = window): () => void {
  const run = () => fn(parseRoute(win.location.hash));
  win.addEventListener('hashchange', run);
  run();
  return () => win.removeEventListener('hashchange', run);
}
