# Mechanical self-review: parse the PLAN DOCUMENT's find/replace blocks, apply them in document order to origin/main,
# check each find is exactly once (applied state; and report those not exactly-once on origin/main = chained), and
# compare the result with the prototype worktree.
import re, subprocess, sys
S='/private/tmp/claude-501/-Users-samhv-Desktop-Claude-CODE/2b10d933-783e-4f38-a50e-c0183b91ca63/scratchpad/fu-10'
PLAN=sys.argv[1]; BASE=sys.argv[2] if len(sys.argv)>2 else 'origin/main'
doc=open(PLAN).read()
tok=re.compile(r'(?:In `(?P<in>[^`]+)`, find:|(?P<rep>^Replace with:))\n\n```ts\n(?P<body>.*?)```\n', re.S|re.M)
state={}; mainc={}; cur=None; pending=None; nf=0; prob=0; chained=0
def mt(p):
    if p not in mainc:
        r=subprocess.run(['git','-C',S+'/wt','show',f'{BASE}:{p}'],capture_output=True,text=True)
        mainc[p]=r.stdout if r.returncode==0 else None
    return mainc[p]
for m in tok.finditer(doc):
    body=m.group('body')
    if m.group('in'): cur=m.group('in'); pending=body; continue
    if m.group('rep'):
        p=cur; nf+=1
        if p not in state:
            t=mt(p)
            if t is None: print('MISSING on base:',p); prob+=1; continue
            state[p]=t
        c=state[p].count(pending); cm=(mt(p) or '').count(pending)
        if c!=1: print(f'{p}: {c}x in applied state: {pending[:80]!r}'); prob+=1; continue
        if cm!=1: chained+=1
        state[p]=state[p].replace(pending,body,1)
diff=[p for p,t in state.items() if open(f'{S}/wt/{p}').read()!=t]
print(f'{nf} find/replace blocks in the document; {prob} problems; {chained} chained (not exactly-once on {BASE}); files differing from the prototype: {diff or "none"}')
