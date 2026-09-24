// How the hidden same-screen panel is revealed (BUILD-PLAN Stage 6: three-finger long-press or Ctrl+Shift+I;
// this plan adds the plain `i` key and a 5-tap top-left corner for iPads without keyboards). Pure logic; the
// DOM wiring is attachReveal().
export interface RevealOptions {
  cornerPx: number; // tap zone size at the top-left corner
  taps: number; // taps needed
  windowMs: number; // …within this long
  longPressMs: number; // three-finger hold
}
export const DEFAULT_REVEAL: RevealOptions = { cornerPx: 64, taps: 5, windowMs: 3000, longPressMs: 800 };

export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  /** Tag name of the focused element: typing in a field never toggles the panel. */
  targetTag: string;
}

export class RevealGesture {
  private readonly o: RevealOptions;
  private readonly onToggle: () => void;
  private tapTimes: number[] = [];
  private pressTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(onToggle: () => void, o: Partial<RevealOptions> = {}) {
    this.onToggle = onToggle;
    this.o = { ...DEFAULT_REVEAL, ...o };
  }

  /** Returns true when the key toggled the panel (the caller then calls preventDefault). */
  key(e: KeyLike): boolean {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.targetTag.toUpperCase())) return false;
    const plainI = e.key.toLowerCase() === 'i' && !e.ctrlKey && !e.altKey && !e.metaKey;
    const ctrlShiftI = e.key.toLowerCase() === 'i' && e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey;
    if (!plainI && !ctrlShiftI) return false;
    this.onToggle();
    return true;
  }

  /** A touch/pointer went down at (x, y) with `touches` fingers, at time t (ms). */
  down(x: number, y: number, touches: number, t: number): void {
    if (touches >= 3) {
      this.cancelPress();
      this.pressTimer = setTimeout(() => {
        this.pressTimer = null;
        this.onToggle();
      }, this.o.longPressMs);
      return;
    }
    if (touches !== 1 || x > this.o.cornerPx || y > this.o.cornerPx) {
      this.tapTimes = [];
      return;
    }
    this.tapTimes = [...this.tapTimes.filter((s) => t - s <= this.o.windowMs), t];
    if (this.tapTimes.length >= this.o.taps) {
      this.tapTimes = [];
      this.onToggle();
    }
  }

  /** Fingers lifted or moved away: a pending three-finger hold is cancelled. */
  up(): void {
    this.cancelPress();
  }

  private cancelPress(): void {
    if (this.pressTimer !== null) clearTimeout(this.pressTimer);
    this.pressTimer = null;
  }
}

/** Wire a RevealGesture to a window. Returns a detach function. */
export function attachReveal(win: Window, g: RevealGesture): () => void {
  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as Element | null)?.tagName ?? '';
    if (g.key({ key: e.key, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey, targetTag: tag })) e.preventDefault();
  };
  const onTouchStart = (e: TouchEvent) => {
    const t0 = e.touches[0];
    if (t0) g.down(t0.clientX, t0.clientY, e.touches.length, e.timeStamp);
  };
  const onMouseDown = (e: MouseEvent) => g.down(e.clientX, e.clientY, 1, e.timeStamp);
  const onUp = () => g.up();
  win.addEventListener('keydown', onKey);
  win.addEventListener('touchstart', onTouchStart, { passive: true });
  win.addEventListener('mousedown', onMouseDown);
  win.addEventListener('touchend', onUp);
  win.addEventListener('touchcancel', onUp);
  return () => {
    win.removeEventListener('keydown', onKey);
    win.removeEventListener('touchstart', onTouchStart);
    win.removeEventListener('mousedown', onMouseDown);
    win.removeEventListener('touchend', onUp);
    win.removeEventListener('touchcancel', onUp);
  };
}
