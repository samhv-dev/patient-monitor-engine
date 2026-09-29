#!/usr/bin/env python3
"""Apply every Create/Modify block of the FU-4 plan, in order, to a tree; each find must match exactly once at its point.
Usage: verify.py <plan.md> <tree-root> [--dry]   (--dry: work on an in-memory copy, write nothing)"""
import re, sys, os
plan, root = sys.argv[1], sys.argv[2]
dry = '--dry' in sys.argv
only = next((set(a.split('=')[1].split(',')) for a in sys.argv if a.startswith('--tasks=')), None)
lines = open(plan, encoding='utf-8').read().split('\n')
files = {}  # path -> content (in-memory view)
def get(path):
    if path not in files:
        p = os.path.join(root, path)
        files[path] = open(p, encoding='utf-8').read() if os.path.exists(p) else None
    return files[path]
cur = None; mode = None; i = 0; errors = []; nedits = 0; ncreate = 0
fence = re.compile(r'^```')
def read_block(i):
    # i points at a fence line; return (content, next index)
    assert fence.match(lines[i]), (i, lines[i])
    j = i + 1; buf = []
    while not lines[j].startswith('```'):
        buf.append(lines[j]); j += 1
    return '\n'.join(buf), j + 1
pending_find = None; task = '?'
while i < len(lines):
    L = lines[i]
    m = re.match(r'^### Task (\d+)', L)
    if m: task = m.group(1)
    m = re.match(r'^#### (Create|Modify) `([^`]+)`', L)
    if m:
        mode, cur = m.group(1), m.group(2); i += 1
        if mode == 'Create':
            while not fence.match(lines[i]): i += 1
            content, i = read_block(i)
            if only is not None and task not in only: continue
            if get(cur) is not None: errors.append(f'T{task} create {cur}: file exists')
            files[cur] = content + '\n'; ncreate += 1
        continue
    if re.match(r'^Edit \d+ — find', L) and mode == 'Modify':
        while not fence.match(lines[i]): i += 1
        find, i = read_block(i)
        while not lines[i].startswith('replace with'): i += 1
        while not fence.match(lines[i]): i += 1
        rep, i = read_block(i)
        if only is not None and task not in only: continue
        s = get(cur)
        if s is None:
            errors.append(f'T{task} {cur}: missing file'); continue
        n = s.count(find)
        if n != 1:
            errors.append(f'T{task} {cur}: find matched {n}× :: {find[:90]!r}')
            continue
        files[cur] = s.replace(find, rep); nedits += 1
        continue
    i += 1
print(f'{ncreate} creates, {nedits} edits, {len(errors)} errors')
for e in errors: print('  ', e)
if not dry and not errors:
    for p, s in files.items():
        if s is None: continue
        full = os.path.join(root, p); os.makedirs(os.path.dirname(full), exist_ok=True)
        open(full, 'w', encoding='utf-8').write(s)
    print('written', len(files), 'files')
sys.exit(1 if errors else 0)
