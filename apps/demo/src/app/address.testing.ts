// For tests: the parts of an address that can carry a secret (its user info, path, query and fragment), without its host
// and port, which hold no secret and can hold the same digits as one by chance (a random port and a PIN).
export function carried(url: string): string {
  const u = new URL(url);
  return `${u.username}${u.password}${u.pathname}${u.search}${u.hash}`;
}
