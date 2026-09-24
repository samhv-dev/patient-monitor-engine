// NOTICE-ID: N-006
// cyrb53 (c) 2018 bryc (github.com/bryc), https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
// Upstream header: "License: Public domain (or MIT if needed). Attribution appreciated."
// Upstream LICENSE.md: public domain; where that is unavailable the author approves MIT as a fallback:
//
//   Copyright (c) 2024 bryc
//   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
//   documentation files (the "Software"), to deal in the Software without restriction, including without limitation
//   the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
//   to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//   The above copyright notice and this permission notice shall be included in all copies or substantial portions
//   of the Software.
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
//   THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
//   CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//   DEALINGS IN THE SOFTWARE.
//
// Changes from upstream: TypeScript; `seed` renamed `salt`; returns the two 32-bit halves [h1, h2] instead of the
// 53-bit number (4294967296 · (2097151 & h2) + h1). The mixing constants and steps are unchanged.

/** cyrb53 string hash, returning its two 32-bit halves. Used to seed the PRNG streams (brief §3.3). */
export function hash53(str: string, salt = 0): [number, number] {
  let h1 = 0xdeadbeef ^ salt;
  let h2 = 0x41c6ce57 ^ salt;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return [h1 >>> 0, h2 >>> 0];
}
