import { describe, expect, it } from 'vitest';
import { hrefOf, parseRoute } from './router.ts';

describe('hash routes', () => {
  it.each([
    ['', 'start', ''], ['#/', 'start', ''], ['#/teach', 'teach', ''], ['#/explore/respiratory', 'explore', 'respiratory'],
    ['#/validate/review?x=1', 'validate', 'review'], ['#/nonsense/x', 'start', ''], ['#teach', 'teach', ''],
  ])('%s → %s/%s', (hash, id, sub) => expect(parseRoute(hash)).toEqual({ id, sub }));
  it('round-trips', () => {
    expect(parseRoute(hrefOf('explore', 'brain'))).toEqual({ id: 'explore', sub: 'brain' });
    expect(hrefOf('start')).toBe('#/');
  });
});
