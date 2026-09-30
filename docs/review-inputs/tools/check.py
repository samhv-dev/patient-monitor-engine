# Apply edits.py to origin/main in ORDER; each find must occur exactly once in the applied state AND on origin/main;
# compare the result with the prototype worktree.
import subprocess, importlib.util, os, sys
S='/private/tmp/claude-501/-Users-samhv-Desktop-Claude-CODE/2b10d933-783e-4f38-a50e-c0183b91ca63/scratchpad/fu-10'
WT=S+'/wt'; BASE=sys.argv[1] if len(sys.argv)>1 else 'origin/main'
spec=importlib.util.spec_from_file_location('e', S+'/plan/edits.py'); E=importlib.util.module_from_spec(spec); spec.loader.exec_module(E)
state={}; mainc={}; prob=0; warn=0; n=0
def mt(p):
    if p not in mainc:
        r=subprocess.run(['git','-C',WT,'show',f'{BASE}:packages/engine-core/{p}'],capture_output=True,text=True)
        mainc[p]=r.stdout if r.returncode==0 else None
    return mainc[p]
for task in E.ORDER:
    for (p,f,r) in E.T[task]:
        n+=1
        if p not in state:
            t=mt(p)
            if t is None: print('MISSING on base:',p); prob+=1; continue
            state[p]=t
        c=state[p].count(f); cm=(mt(p) or '').count(f)
        if c!=1: print(f'{task} {p}: {c}x in applied state: {f[:70]!r}'); prob+=1; continue
        if cm!=1: warn+=1; print(f'{task} {p}: {cm}x on {BASE} (applied-state 1): {f[:60]!r}')
        state[p]=state[p].replace(f,r,1)
diff=[p for p,t in state.items() if open(f'{WT}/packages/engine-core/{p}').read()!=t]
print(f'{n} find/replace blocks in {len(E.ORDER)} tasks; {prob} problems; {warn} not exactly-once on {BASE}; files differing from the prototype: {diff or "none"}')
