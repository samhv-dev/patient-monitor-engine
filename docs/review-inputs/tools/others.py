# List other plans' find blocks that touch the files FU-10 edits (overlap check).
import re, sys
P='/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo/docs/plans/'
FILES=sys.argv[1:]
for plan in ['fu-6-respiratory-integration.md','fu-7-drug-layer.md','fu-8-followups.md','fu-9-blood-fluids.md','stage-7k-respiratory-mechanics.md']:
    doc=open(P+plan).read()
    # every "... `path` ... find:" followed by a code block; track last-mentioned path
    cur=None
    for m in re.finditer(r'`(packages/engine-core/src/[^`]+\.ts)`|()[Ff]ind[^\n]*:\s*\n\n```\w*\n(.*?)```', doc, re.S):
        if m.group(1): cur=m.group(1); continue
        body=m.group(3)
        if cur and any(cur.endswith(f) for f in FILES):
            print(f'--- {plan} {cur}\n{body.rstrip()[:300]}')
