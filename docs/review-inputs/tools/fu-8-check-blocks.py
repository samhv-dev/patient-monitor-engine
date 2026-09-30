#!/usr/bin/env python3
"""FU-8 plan block checker (mechanical find-block check).

Usage: fu-8-check-blocks.py [--part A|B|AB] [--apply] [--base REF] [--upto "Task A20"] [--git REPO] <plan.md> <repo-or-worktree>
(--git: the repository to read REF from when the tree is a plain export, e.g. a `git archive` of origin/main)

Parses the plan's edit blocks in document order ("In `path`, find:" + fenced old text + "Replace with:" + fenced new
text; "Create `path`:" + fenced body), grouped by the "## Part A" / "## Part B" headings. For every find block it reports
how often the old text occurs (1) in the file as it is on REF (default origin/main) and (2) in the file as it is at that
point of the sequence (earlier blocks applied in memory). The sequence count must be exactly 1; the base count must
be 1, or 0 for a CHAINED block — one that edits text an earlier FU-8 block wrote (reported, and listed with --verbose).
--upto stops before the named task heading (an intermediate tree: every commit of the plan can be rebuilt and tested).
With --apply the result is written into the given tree (use a throwaway worktree). Exit status 1 if any block fails.
"""
import re, subprocess, sys

args = sys.argv[1:]
part = 'AB'
apply = False
base = 'origin/main'
upto = None
verbose = False
gitdir = None
while args and args[0].startswith('--'):
    a = args.pop(0)
    if a == '--part': part = args.pop(0)
    elif a == '--apply': apply = True
    elif a == '--base': base = args.pop(0)
    elif a == '--upto': upto = args.pop(0)
    elif a == '--verbose': verbose = True
    elif a == '--git': gitdir = args.pop(0)
plan, tree = args
text = open(plan, encoding='utf-8').read()

FENCE = re.compile(r'```[a-z]*\n(.*?)\n```', re.S)
blocks = []  # (part, kind, path, old, new)
cur = None
pos = 0
pat = re.compile(r'^## Part (A|B)\b|^In `([^`]+)`, find:\s*$|^Create `([^`]+)`:\s*$', re.M)
if upto:
    cut = re.search(r'^### ' + re.escape(upto) + r'\b', text, re.M)
    assert cut, f'no heading "### {upto}"'
    text = text[:cut.start()]
for m in pat.finditer(text):
    if m.group(1):
        cur = m.group(1)
        continue
    if cur is None or cur not in part:
        continue
    after = text[m.end():]
    if m.group(2):
        f1 = FENCE.search(after)
        rest = after[f1.end():]
        assert rest.lstrip().startswith('Replace with:'), f'no "Replace with:" after find block for {m.group(2)}'
        f2 = FENCE.search(rest)
        blocks.append((cur, 'edit', m.group(2), f1.group(1) + '\n', f2.group(1) + '\n'))
    else:
        f1 = FENCE.search(after)
        blocks.append((cur, 'create', m.group(3), None, f1.group(1) + '\n'))

def on_base(path):
    r = subprocess.run(['git', '-C', gitdir or tree, 'show', f'{base}:{path}'], capture_output=True)
    return r.stdout.decode('utf-8') if r.returncode == 0 else None

state = {}
bad = 0
chained = 0
n_edit = n_create = 0
for p, kind, path, old, new in blocks:
    if path not in state:
        state[path] = on_base(path)
    if kind == 'create':
        n_create += 1
        if state[path] is not None:
            print(f'[{p}] CREATE over an existing file: {path}'); bad += 1
        state[path] = new
        continue
    n_edit += 1
    b = on_base(path) or ''
    nb, nc = b.count(old), (state[path] or '').count(old)
    if nb == 0 and nc == 1:
        chained += 1
        if verbose: print(f'[{p}] chained: {path} — {old.strip().splitlines()[0][:80]!r}')
    elif nb != 1 or nc != 1:
        bad += 1
        print(f'[{p}] {path}: find block occurs {nb}x on {base}, {nc}x at its place in the sequence — {old.strip().splitlines()[0][:80]!r}')
        continue
    state[path] = state[path].replace(old, new, 1)
print(f'{n_edit} find/replace blocks ({chained} chained on an earlier FU-8 block), {n_create} creates checked (parts {part}, base {base}{", up to " + upto if upto else ""}); problems: {bad}')
if apply:
    import os
    for path, body in state.items():
        full = os.path.join(tree, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        tmp = full + '.fu8tmp'  # write-and-rename: never truncate an inode a hard-linked tree shares
        open(tmp, 'w', encoding='utf-8').write(body)
        os.replace(tmp, full)
    print(f'applied {len(state)} files to {tree}')
sys.exit(1 if bad else 0)
