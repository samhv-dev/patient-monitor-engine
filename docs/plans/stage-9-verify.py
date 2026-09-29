# Stage 9 plan check: apply every Create and Edit block of docs/plans/stage-9-clinical-ui.md to a clean tree of
# origin/main and compare with the prototype worktree. Usage: python3 stage-9-verify.py PLAN CLEAN_TREE PROTOTYPE_TREE
import os, re, sys
plan, clean, proto = sys.argv[1:4]
md = open(plan).read()
fence = re.compile(r"```[a-z]*\n(.*?)```\n", re.S)
steps = re.finditer(r"- \[ \] \*\*Step \d+: (Create|Edit) `([^`]+)`\*\*", md)
problems, created, edited = [], [], []
for m in steps:
    kind, path = m.group(1), m.group(2)
    rest = md[m.end():]
    blocks = fence.findall(rest)
    target = os.path.join(clean, path)
    if kind == 'Create':
        os.makedirs(os.path.dirname(target), exist_ok=True)
        open(target, 'w').write(blocks[0])
        created.append(path)
    else:
        find, repl = blocks[0], blocks[1]
        s = open(target).read()
        n = s.count(find)
        if n != 1: problems.append(f'{path}: find matches {n}×'); continue
        open(target, 'w').write(s.replace(find, repl))
        edited.append(path)
for p in created + edited:
    a, b = open(os.path.join(clean, p)).read(), open(os.path.join(proto, p)).read()
    if a != b: problems.append(f'{p}: differs from the prototype')
print(f'created {len(created)}, edited {len(edited)}, problems {len(problems)}')
for x in problems: print(' ', x)
