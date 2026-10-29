import { describe, expect, it } from 'vitest';
import { HOST_ROUTES, hrefOf, parseRoute } from './router.ts';

describe('hash routes', () => {
  it.each([
    ['', 'home', ''], ['#/', 'home', ''], ['#/home', 'home', ''], ['#/start', 'home', ''], ['#/room', 'room', ''],
    ['#/scenarios/library', 'scenarios', 'library'], ['#/teach', 'teach', ''], ['#/teach2', 'teach2', ''], ['#/explore/respiratory', 'explore', 'respiratory'],
    ['#/validate/review?x=1', 'validate', 'review'], ['#/nonsense/x', 'home', ''], ['#teach', 'teach', ''],
  ])('%s → %s/%s', (hash, id, sub) => expect(parseRoute(hash)).toEqual({ id, sub }));
  it('round-trips', () => {
    expect(parseRoute(hrefOf('explore', 'brain'))).toEqual({ id: 'explore', sub: 'brain' });
    expect(hrefOf('home')).toBe('#/');
    expect(parseRoute(hrefOf('scenarios', 'builder'))).toEqual({ id: 'scenarios', sub: 'builder' });
  });
  it('Instructor v2 (E127) is a host route, as Instructor', () => {
    expect(HOST_ROUTES.has('teach2')).toBe(true);
    expect(hrefOf('teach2')).toBe('#/teach2');
  });
});
