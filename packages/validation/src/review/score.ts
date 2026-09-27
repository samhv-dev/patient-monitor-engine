// Scoring of one rater's blind review (brief §9 step 4): per channel, identification accuracy (chance 50 %; pass
// ≤ 60 %), mean realism of synthetic clips (pass ≥ 4.0) and the real − synthetic gap (pass ≤ 0.5 [ENG]), with an
// exact two-sided binomial p for "accuracy ≠ 50 %". Entry: `pnpm --filter @pme/validation review:score --key K
// --answers A [--out docs/validation/review]` writes <session>-<rater>.md/.json (derived numbers only).
import type { ReviewAnswers, ReviewChannel, ReviewKey, ReviewBundle } from './types.ts';

export interface ChannelScore { channel: ReviewChannel; n: number; accuracy: number; pBinomial: number; realismReal: number; realismSynthetic: number; gap: number; pass: { accuracy: boolean; synthetic: boolean; gap: boolean } }

function binom(k: number, n: number): number {
  let lg = 0;
  for (let i = 1; i <= n; i++) lg += Math.log(i);
  const lf = (m: number) => { let s = 0; for (let i = 2; i <= m; i++) s += Math.log(i); return s; };
  let p = 0;
  const pk = Math.exp(lg - lf(k) - lf(n - k) - n * Math.LN2);
  for (let j = 0; j <= n; j++) {
    const pj = Math.exp(lg - lf(j) - lf(n - j) - n * Math.LN2);
    if (pj <= pk + 1e-12) p += pj;
  }
  return Math.min(1, p);
}

export function scoreReview(bundle: ReviewBundle, key: ReviewKey, ans: ReviewAnswers): ChannelScore[] {
  if (key.session !== ans.session || bundle.session !== key.session) throw new Error('bundle, key and answers come from different sessions');
  const byId = new Map(bundle.clips.map((c) => [c.id, c]));
  const out: ChannelScore[] = [];
  for (const channel of ['ecgII', 'abp', 'pleth', 'co2'] as const) {
    const a = ans.answers.filter((x) => byId.get(x.id)?.channel === channel);
    if (!a.length) continue;
    const correct = a.filter((x) => key.entries[x.id]?.kind === x.guess).length;
    const mean = (kind: 'real' | 'synthetic') => {
      const r = a.filter((x) => key.entries[x.id]?.kind === kind).map((x) => x.realism);
      return r.length ? r.reduce((p, q) => p + q, 0) / r.length : Number.NaN;
    };
    const accuracy = correct / a.length;
    const rr = mean('real');
    const rs = mean('synthetic');
    out.push({ channel, n: a.length, accuracy, pBinomial: binom(correct, a.length), realismReal: rr, realismSynthetic: rs, gap: rr - rs, pass: { accuracy: accuracy <= 0.6, synthetic: rs >= 4.0, gap: rr - rs <= 0.5 } });
  }
  return out;
}

export function scoreMarkdown(ans: ReviewAnswers, s: ChannelScore[]): string {
  const f = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '—');
  const ok = (b: boolean) => (b ? 'pass' : '**fail**');
  const L = [`# Blind realism review — ${ans.rater}, session ${ans.session}`, '', `${ans.startedAt} → ${ans.finishedAt}. Pass (brief §9): identification ≤ 60 % per channel (chance 50 %), mean synthetic realism ≥ 4.0, real − synthetic ≤ 0.5.`, '',
    '| Channel | n | Identified | p (≠ 50 %) | Realism real | Realism synthetic | Gap | Verdict |', '|---|---|---|---|---|---|---|---|'];
  for (const c of s) L.push(`| ${c.channel} | ${c.n} | ${f(100 * c.accuracy, 0)} % | ${f(c.pBinomial, 3)} | ${f(c.realismReal)} | ${f(c.realismSynthetic)} | ${f(c.gap)} | ${ok(c.pass.accuracy)} / ${ok(c.pass.synthetic)} / ${ok(c.pass.gap)} |`);
  const comments = ans.answers.filter((a) => a.comment.trim());
  if (comments.length) L.push('', '## Comments (clip id → comment)', '', ...comments.map((a) => `- \`${a.id}\`: ${a.comment.replace(/\n/g, ' ')}`));
  return `${L.join('\n')}\n`;
}
