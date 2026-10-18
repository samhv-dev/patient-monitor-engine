#!/usr/bin/env python3
"""Stage 14 plan tool (Task 3): bring the target audit (research/30-target-audit.csv, outside the repository) into the
repository as docs/validation/target-audit.tsv, keyed by the CURRENT test file and title, so that
scripts/known-misses.ts can show each known miss's audit verdict and proposed band.

The audit names a test by `path:line` on the commit it read (AUDIT_COMMIT, 26e78308 for the 2026-10-11 audit). For
each such row this tool finds, in that commit's copy of the file, the test call that starts at or before the line
(`it.fails`, `test.fail`, `it`, `test`, `.each` forms), takes its title, and carries file and title forward to HEAD:
the file through git's rename detection (AUDIT_COMMIT..HEAD) and the rename maps given, the title through the
title table(s) given (titles.py output: before → after). It then checks that HEAD's file has that title, and records
whether the test is still an expected failure there. Rows that name a calibration-queue entry keep that key; rows
for a list entry or a passing test ("KNOWN list", "it, not it.fails") keep their file and the audit's wording.

Columns of the output: row, kind (fails | passing | list | queue), status (matched | now-passing | unmatched |
not-a-test), file, title, verdict, proposed_band, proposed_sources, grade, likely_not_a_miss, audit_band, measured.
A row the tool cannot carry forward is `unmatched`; write its current file and title into OVERRIDES
(row<TAB>file<TAB>title) and re-run; an override whose title is not a literal test title in that file (a conditional
`(cond ? it.fails : it)(template)` that scripts/deviations.ts cannot read) is recorded as `unlisted`. Exit 1 while any `fails` row is unmatched (unless --allow-unmatched).

Usage (repo root): python3 import_audit.py AUDIT_CSV AUDIT_COMMIT OUT_TSV [--map M.tsv ...] [--titles T.json ...]
                   [--overrides O.tsv] [--allow-unmatched] [--write-carry DIR]
       In the repository (Task 3 copies this file to scripts/import-audit.py and publishes the audit, Question 7):
                   python3 scripts/import-audit.py --repo
       = the published CSV docs/validation/target-audit/30-target-audit.csv, commit 26e78308, out
         docs/validation/target-audit.tsv, and the carry files and overrides kept beside the CSV. --write-carry DIR
         writes DIR/carry-map.tsv and DIR/carry-titles.json: the rename-map rows and title-table rows that the audit's
         rows needed, so that the repository can re-run the import without this stage's tools.
       A test changed later (re-worded, moved): add `row<TAB>current file<TAB>current title` to
       docs/validation/target-audit/overrides.tsv and re-run with --repo.
"""
import csv, json, os, re, subprocess, sys

args = sys.argv[1:]
if '--repo' in args:
    D = 'docs/validation/target-audit/'
    args = [D + '30-target-audit.csv', '26e78308', 'docs/validation/target-audit.tsv', '--map', D + 'carry-map.tsv',
            '--titles', D + 'carry-titles.json', '--overrides', D + 'overrides.tsv'] + [a for a in args if a != '--repo']
def opt(name):
    vals, i = [], 0
    while i < len(args):
        if args[i] == name and i + 1 < len(args): vals.append(args[i + 1]); i += 2
        else: i += 1
    return vals
pos = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or args[i - 1] not in ('--map', '--titles', '--overrides', '--write-carry'))]
audit_csv, commit, out = pos[0], pos[1], pos[2]
git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True).stdout

# files: git rename detection from the audit's commit, then the explicit maps (Stage 14's), longest prefix wins
ren = {}
for l in git('diff', '-M', '--name-status', commit, 'HEAD').split('\n'):
    p = l.split('\t')
    if p and p[0].startswith('R') and len(p) == 3: ren[p[1]] = p[2]
git_ren = set(ren)
for m in opt('--map'):
    if not os.path.exists(m): continue
    for l in open(m).read().split('\n')[1:]:
        p = l.split('\t')
        if len(p) > 1 and p[1] != 'DELETE': ren.setdefault(p[0].rstrip('/'), p[1].rstrip('/'))
used_map = {}
def fwd(path):
    seen = 0
    while seen < 5:
        seen += 1
        if path in ren:
            if path not in git_ren: used_map[path] = ren[path]
            path = ren[path]; continue
        best = max((o for o in ren if path.startswith(o + '/')), key=len, default=None)
        if not best: break
        if best not in git_ren: used_map[best] = ren[best]
        path = ren[best] + path[len(best):]
    return path

tmap = {}
for t in opt('--titles'):
    if not os.path.exists(t): continue
    for r in json.load(open(t)): tmap[(r['before'])] = r['after']
used_titles = {}
overrides = {}
for o in opt('--overrides'):
    if not os.path.exists(o): continue
    for l in open(o).read().split('\n'):
        p = l.split('\t')
        if len(p) == 3 and p[0].isdigit(): overrides[p[0]] = (p[1], p[2])

CALL = re.compile(r'''\b(?:it|test)(?:\.(?:fails|fail|skip|only|concurrent|each\((?:[^()]|\([^()]*\))*\)))*\(\s*(['"`])((?:\\.|(?!\1)[^\\\n])*)\1''')
FAILS = re.compile(r'''\b(?:it|test)\.fails?\b''')
unesc = lambda t: re.sub(r'\\(.)', r'\1', t)

def calls(text):
    out = []
    for m in CALL.finditer(text):
        out.append((text.count('\n', 0, m.start()) + 1, m.group(2), bool(FAILS.match(m.group(0)))))
    return out

cache = {}
def at(rev, path):
    k = (rev, path)
    if k not in cache: cache[k] = subprocess.run(['git', 'show', f'{rev}:{path}'], capture_output=True, text=True).stdout
    return cache[k]

rows, unmatched = [], []
for r in csv.DictReader(open(audit_csv)):
    key = r['file'].strip()
    base = {k: r.get(k, '') for k in ('verdict', 'proposed_band', 'proposed_sources', 'grade', 'likely_not_a_miss')}
    base.update(audit_band=r.get('band', ''), measured=r.get('measured', ''))
    m = re.match(r'^((?:packages|apps|scripts)/[^:\s]+):~?(\d+)\s*(.*)$', key)
    if not m:
        rows.append(dict(row=r['row'], kind='queue', status='not-a-test', file=key.split(' ')[0], title=r['title_or_row'], **base)); continue
    path, line, note = m.group(1), int(m.group(2)), m.group(3)
    kind = 'passing' if 'not it.fails' in note and 'KNOWN list' not in note else 'list' if 'list' in note.lower() else 'fails'
    if kind != 'fails':
        rows.append(dict(row=r['row'], kind=kind, status='not-a-test', file=fwd(path), title=r['title_or_row'], **base)); continue
    if r['row'] in overrides:
        f, t = overrides[r['row']]
    else:
        cs = [c for c in calls(at(commit, path)) if c[0] <= line]
        if not cs: unmatched.append(r['row']); rows.append(dict(row=r['row'], kind=kind, status='unmatched', file=fwd(path), title=r['title_or_row'], **base)); continue
        src_title = cs[-1][1]
        if src_title in tmap: used_titles[src_title] = tmap[src_title]
        f, t = fwd(path), unesc(tmap.get(src_title, src_title))
    now = {unesc(c[1]): c[2] for c in calls(open(f).read())} if os.path.exists(f) else {}  # the working tree: the current files
    status = 'matched' if now.get(t) is True else 'now-passing' if t in now else 'unlisted' if r['row'] in overrides else 'unmatched'
    if status == 'unmatched': unmatched.append(r['row'])
    rows.append(dict(row=r['row'], kind=kind, status=status, file=f, title=t, **base))

cols = ['row', 'kind', 'status', 'file', 'title', 'verdict', 'proposed_band', 'proposed_sources', 'grade', 'likely_not_a_miss', 'audit_band', 'measured']
clean = lambda s: re.sub(r'\s+', ' ', s or '').strip()
os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
with open(out, 'w') as fh:
    fh.write('# Target audit of the acceptance bands, 2026-10-11 (read on ' + commit + '), carried to the current test files and titles.\n')
    fh.write('# GENERATED by scripts/import-audit.py (re-run: python3 scripts/import-audit.py --repo); do not edit. Verdicts: RIGHT, TOO NARROW, TOO WIDE, MIS-SPECIFIED, UNSUPPORTED.\n')
    fh.write('\t'.join(cols) + '\n')
    for x in rows: fh.write('\t'.join(clean(str(x[c])) for c in cols) + '\n')
for d in opt('--write-carry'):
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'carry-map.tsv'), 'w') as fh:
        fh.write('old_path\tnew_path\n' + ''.join(f'{o}\t{n}\n' for o, n in sorted(used_map.items())))
    json.dump([dict(before=b, after=a) for b, a in sorted(used_titles.items())], open(os.path.join(d, 'carry-titles.json'), 'w'), ensure_ascii=False, indent=1)
from collections import Counter
print(f'import_audit: {len(rows)} rows; ' + ', '.join(f'{k}={v}' for k, v in sorted(Counter(x["kind"] for x in rows).items())) + '; status ' +
      ', '.join(f'{k}={v}' for k, v in sorted(Counter(x["status"] for x in rows).items())))
if unmatched: print('unmatched rows (write them into the overrides file):', ' '.join(unmatched))
sys.exit(1 if unmatched and '--allow-unmatched' not in args else 0)
