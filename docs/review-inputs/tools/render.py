# Render the plan's task sections: prose from tasks.py, find/replace blocks from edits.py (byte-identical to the
# verified prototype). Usage: python3 render.py A1 A2 … > out.md
import importlib.util, sys
S = '/private/tmp/claude-501/-Users-samhv-Desktop-Claude-CODE/2b10d933-783e-4f38-a50e-c0183b91ca63/scratchpad/fu-10'


def load(name):
    spec = importlib.util.spec_from_file_location(name, f'{S}/plan/{name}.py')
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


E = load('edits')
P = load('tasks')
out = []
for k in sys.argv[1:]:
    out.append(P.TASKS[k].rstrip() + '\n\n')
    if k in E.T:
        out.append('- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are\n'
                   '  marked "(chained on <task>)" and match once in the applied state):\n\n')
        for (p, f, r) in E.T[k]:
            out.append(f'In `packages/engine-core/{p}`, find:\n\n```ts\n{f}```\n\nReplace with:\n\n```ts\n{r}```\n\n')
    out.append(P.TAILS[k].rstrip() + '\n\n---\n\n')
sys.stdout.write(''.join(out))
