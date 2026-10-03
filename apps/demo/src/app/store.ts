// Per-viewer conveniences in localStorage (research/13 brief §5), wrapped: private windows and previews can throw.
export const store = {
  get(k: string): string | null {
    try {
      return localStorage.getItem(`pme.${k}`);
    } catch {
      return null;
    }
  },
  set(k: string, v: string): void {
    try {
      localStorage.setItem(`pme.${k}`, v);
    } catch {
      /* per-viewer convenience only */
    }
  },
};

