// The two DOM helpers of the v1.9 Hamilton front end, shared by its face and the simulator's tools.
export const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
export function el(t: string, a: Record<string, string | number> = {}, ...k: Array<Node | string | null>): HTMLElement {
  const e = document.createElement(t);
  for (const n in a) {
    if (n === 'class') e.className = String(a[n]);
    else if (n === 'html') e.innerHTML = String(a[n]);
    else e.setAttribute(n, String(a[n]));
  }
  k.forEach((c) => c != null && e.append(c));
  return e;
}
