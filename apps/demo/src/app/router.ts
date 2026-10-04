// Hash routing without a router dependency (research/13 brief §5): `#/teach`, `#/explore/respiratory`, `#/validate/review`.
// Views are sections toggled with `hidden`; the monitor region is never unmounted while the session lives.
export const ROUTES = ['start', 'monitor', 'teach', 'remote', 'explore', 'vent', 'validate', 'dev', 'settings'] as const;
export type RouteId = (typeof ROUTES)[number];
export interface Route {
  id: RouteId;
  /** The rest of the path ("respiratory" in #/explore/respiratory), or ''. */
  sub: string;
}

/** Views that need the engine session (every other view works without one, e.g. a paired Remote). */
export const HOST_ROUTES: ReadonlySet<RouteId> = new Set(['monitor', 'teach', 'explore', 'vent', 'start']);

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const [head = '', ...rest] = path.split('/').filter(Boolean);
  const id = (ROUTES as readonly string[]).includes(head) ? (head as RouteId) : 'start';
  return { id, sub: id === head ? rest.join('/') : '' };
}

export const hrefOf = (id: RouteId, sub = ''): string => `#/${id === 'start' ? '' : id}${sub ? `/${sub}` : ''}`;

/** Calls `fn` now and on every hash change; returns the unsubscribe. */
export function onRoute(fn: (r: Route) => void, win: Window = window): () => void {
  const run = () => fn(parseRoute(win.location.hash));
  win.addEventListener('hashchange', run);
  run();
  return () => win.removeEventListener('hashchange', run);
}
