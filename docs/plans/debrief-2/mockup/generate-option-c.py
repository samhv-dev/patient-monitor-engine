# Static mock-up of Option C ("Debrief 2"), research only. Measured values come from the pme-debrief/1 JSON of the
# tamponade cue-card run (kit round A3.1). Values rc.1 does NOT record (SBP/DBP/CVP, alarm end times, a Recognised
# mark) are ILLUSTRATIVE: printed grey italic with a dagger and a footnote. Usage: python3 generate-option-c.py <json> <outdir>
import json, sys, html, os
src, outdir = sys.argv[1], sys.argv[2]
D = json.load(open(src)); R = D['record']; doc = R['doc']
rows = [x for x in R['rows'] if x.get('undone') is None]
S = {s['t']: s for s in R['samples']}
END = max([x['t'] for x in rows] + [s['t'] for s in R['samples']])
E = html.escape
mm = lambda t: f"{int(t//60):02d}:{int(t%60):02d}"
def span(s):
    s = round(s); return f"{s} s" if s < 60 else f"{s//60} min {s%60:02d} s"
def at(t, k):
    for dt in range(4):
        s = S.get(int(t) + dt)
        if s and s.get(k) is not None: return s[k]
    return None
FOOT = ("For education only. Not a medical device and not clinically validated: never use it for patient care. "
        "Version 1.0.0-rc.1 (pre-release), build 3db25a3b 2026-10-18.")
MOCK = "MOCK-UP for discussion (research/33, option C), not the product. Measured: the tamponade cue-card run, kit round A3.1. † = illustrative."
ILL = '<span class="ill">{}†</span>'
NOTE = '<p class="fn">† Illustrative: not recorded in rc.1. Option C would record it; the value shown is invented for the layout, made consistent with the measured MAP where one exists.</p>'
states = {s['id']: s for s in doc['states']}
first = lambda ev: next((x['t'] for x in rows if x.get('ev') == ev), None)
pl, cpr, rosc, drained, stop, fluid = first('pulseLoss'), first('cpr'), first('rosc'), first('state:cprDrained'), first('state:rosc'), first('fluid')
DET = first('state:deteriorating')
RECOG = 130.0  # illustrative Recognised mark at 02:10

# key moments (same rule as option B: manual-only transitions = team)
prev = None; km = []
for x in rows:
    ev = x.get('ev', '')
    if ev.startswith('state:'):
        sid = ev[6:]
        if prev:
            trs = [t for t in states[prev].get('transitions', []) if t['to'] == sid]
            km.append(dict(t=x['t'], who='Team' if trs and all('manual' in t['when'] for t in trs) else 'Patient', text=states[sid].get('label', sid)))
        prev = sid
    elif ev in ('pulseLoss', 'rosc'):
        km.append(dict(t=x['t'], who='Patient', text={'pulseLoss': 'Pulse lost (the model)', 'rosc': 'Circulation returned (the model)'}[ev]))
km.sort(key=lambda m: m['t'])
clean = []
for m in km:
    if clean and m['who'] == 'Patient' and clean[-1]['who'] == 'Patient' and m['t'] - clean[-1]['t'] < 3:
        clean[-1]['text'] += ' · ' + m['text'].split(':')[0]; continue
    clean.append(m)
km = [dict(t=RECOG, who='Team', text='Recognised: "tamponade" named (instructor mark)', ill=True)] + clean
# illustrative SBP / DBP / CVP, consistent with the measured MAP at each moment (MAP ≈ (SBP + 2·DBP)/3)
ILLV = {130: (96, 78, 17), DET: (84, 64, 19), pl: (26, 18, 22), cpr: (28, 16, 22), drained: (42, 21, 12), rosc: (66, 35, 10), stop: (92, 49, 9), fluid: (118, 76, 8)}

alarms = [x for x in rows if x['kind'] == 'alarm']
# illustrative end times (rc.1 records raises only; a re-raise of ART S low / ART D low at 07:57 shows they had ended)
END_ILL = {22: drained, 359: rosc, 366: 470, 423: rosc, 430: 460, 437: 470, 441: 690, 451: stop, 465: 560, 477: stop, 664: END}

# ---------------------------------------------------------------- swimlane
def swimlane(learner=False):
    W, L, Rm = 720, 92, 12
    x = lambda t: L + t / END * (W - L - Rm)
    lanes = []; y = 8
    out = []
    def lane(name, h):
        nonlocal y
        lanes.append((name, y, h)); y += h + 4
        return y - h - 4
    yP = lane('Patient', 26); yT = lane('Team', 26)
    # alarms: greedy rows
    rowsA = []; place = []
    for a in alarms:
        e = END_ILL.get(int(a['t']), a['t'] + 30)
        for i, r in enumerate(rowsA):
            if r < a['t'] - 2: rowsA[i] = e; place.append((a, e, i)); break
        else:
            rowsA.append(e); place.append((a, e, len(rowsA) - 1))
    yA = lane('Monitor alarms', 11 * len(rowsA) + 4) if not learner else None
    yD = lane('Drugs, fluids', 18)
    yM = lane('MAP', 40); yE = lane('EtCO₂', 34)
    H = y + 16
    o = [f'<svg class="swim" viewBox="0 0 {W} {H}" role="img" aria-label="Swimlane of the run">']
    for name, ly, lh in lanes:
        o.append(f'<rect class="lanebg" x="{L}" y="{ly}" width="{W-L-Rm}" height="{lh}"/><text class="lane" x="{L-6}" y="{ly+lh/2+4}" text-anchor="end">{name}</text>')
    o.append(f'<rect class="band" x="{x(pl):.1f}" y="{yP}" width="{x(rosc)-x(pl):.1f}" height="{yE+34-yP}"/>')
    t = 0
    while t <= END:
        o.append(f'<line class="grid" x1="{x(t):.1f}" x2="{x(t):.1f}" y1="{yP}" y2="{y-4}"/><text class="tick" x="{x(t):.1f}" y="{y+8}" text-anchor="middle">{mm(t)}</text>'); t += 60
    # patient lane
    for m in km:
        if m['who'] != 'Patient': continue
        o.append(f'<circle class="pt" cx="{x(m["t"]):.1f}" cy="{yP+13}" r="5"/>')
    lab = [(DET, 'systolic < 80', 1), (pl, 'pulse lost', 1), (rosc, 'pulse back', -1)]
    for tt, s, sg in lab: o.append(f'<text class="ev" x="{x(tt)+7*sg:.1f}" y="{yP+10}" text-anchor="{"start" if sg>0 else "end"}">{s}</text>')
    o.append(f'<text class="ev muted" x="{x(1)+2:.1f}" y="{yP+10}">arrival: tachycardic, narrow pulse pressure, raised CVP</text>')
    # team lane
    for m in km:
        if m['who'] != 'Team': continue
        if m.get('ill'):
            o.append(f'<path class="recog" d="M{x(m["t"]):.1f} {yT+5} l7 8 l-7 8 l-7 -8 z"/><text class="ev ill" x="{x(m["t"])+9:.1f}" y="{yT+17}">Recognised†</text>')
        else:
            o.append(f'<rect class="team" x="{x(m["t"])-5:.1f}" y="{yT+8}" width="10" height="10" rx="1.5"/>')
    for tt, s, dx, yy in [(cpr, 'CPR + tube', 7, yT+6), (drained, 'drained', 7, yT+6), (stop, 'CPR stopped', -7, yT+25)]:
        o.append(f'<text class="ev" x="{x(tt)+dx:.1f}" y="{yy}" text-anchor="{"end" if dx<0 else "start"}">{s}</text>')
    # alarms lane
    if not learner:
        for a, e, i in place:
            yy = yA + 3 + i * 11
            o.append(f'<rect class="alill" x="{x(a["t"]):.1f}" y="{yy}" width="{max(x(e)-x(a["t"]),2):.1f}" height="8"/>'
                     f'<line class="alon" x1="{x(a["t"]):.1f}" x2="{x(a["t"]):.1f}" y1="{yy-1}" y2="{yy+9}"/>'
                     + (f'<text class="al" x="{x(a["t"])-3:.1f}" y="{yy+6.5}" text-anchor="end">{E(a["text"])}</text>' if x(a['t']) > W - 90 else f'<text class="al" x="{x(a["t"])+3:.1f}" y="{yy+6.5}">{E(a["text"])}</text>'))
    # drugs
    o.append(f'<path class="drug" d="M{x(fluid):.1f} {yD+3} l6 11 h-12 z"/><text class="ev" x="{x(fluid)-8:.1f}" y="{yD+13}" text-anchor="end">crystalloid 500 mL</text>')
    # measured traces
    for k, yy, lo, hi in (('map', yM, 0, 130), ('etco2', yE, 0, 45)):
        h = 40 if k == 'map' else 34
        d = ''; pv = None
        for s in R['samples']:
            v = s.get(k)
            if v is None: pv = None; continue
            d += f"{'M' if pv is None or s['t']-pv > 5 else 'L'}{x(s['t']):.1f} {yy + h - (min(max(v,lo),hi)-lo)/(hi-lo)*h:.1f}"; pv = s['t']
        o.append(f'<path class="trace" d="{d}"/><text class="tick" x="{W-Rm-2}" y="{yy+8}" text-anchor="end">{hi}</text>')
    o.append('</svg>')
    return ''.join(o)

CSS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock.css')).read() + '''
.ill{color:#7a7f88;font-style:italic}
.fn{font-size:7pt;color:#5a5f69;margin:1.5mm 0 0}
.swim{width:100%;height:auto;display:block}
.swim .lanebg{fill:#f6f7f9}.swim .lane{font-size:10px;font-weight:600;fill:#16181d}
.swim .grid{stroke:#dfe2e6;stroke-width:.5}.swim .tick{font-size:8.5px;fill:#5a5f69}
.swim .band{fill:#e6e8ec;opacity:.7}
.swim .pt{fill:#D55E00}.swim .team{fill:#0072B2}.swim .recog{fill:#fff;stroke:#7a7f88;stroke-width:1.2;stroke-dasharray:2 1.5}
.swim .ev{font-size:8.5px;fill:#16181d}.swim .ev.muted{fill:#5a5f69;font-style:italic}.swim .ev.ill{fill:#7a7f88;font-style:italic}
.swim .alill{fill:url(#none);fill:#eef0f3;stroke:#9aa0a8;stroke-width:.6;stroke-dasharray:2 1.5}
.swim .alon{stroke:#16181d;stroke-width:1.4}.swim .al{font-size:7px;fill:#3a3f47}
.swim .drug{fill:#16181d}.swim .trace{fill:none;stroke:#16181d;stroke-width:1.1}
table.km td.ill,table.km th.ill{color:#7a7f88;font-style:italic}
.hints{display:grid;grid-template-columns:1fr 1fr;gap:2mm}.hints>div{border:0.6pt solid var(--rule);border-radius:1.5mm;padding:2mm 2.5mm}
.hints ul{margin:.8mm 0 0;padding-left:4mm}.hints li{margin:.6mm 0}
.authored{font-size:7pt;color:#8a4b00;border:0.6pt dashed #8a4b00;border-radius:1mm;padding:0 1.2mm;margin-left:1.5mm;font-weight:400}
table.modes{width:100%;border-collapse:collapse;font-size:8pt}table.modes th{text-align:left;font-weight:500;color:var(--muted);font-size:7.3pt;border-bottom:0.7pt solid var(--ink);padding:.8mm 1.2mm}
table.modes td{border-bottom:0.5pt solid var(--rule);padding:1mm 1.2mm;vertical-align:top}
.learner .band{border-bottom-color:#0072B2}
.prompt{border:0.6pt solid var(--rule);border-radius:1.5mm;padding:2mm 2.5mm;margin-bottom:2mm}
.prompt b{display:block;margin-bottom:.6mm}.prompt .lines{height:8mm;background:repeating-linear-gradient(#fff 0 6mm,#e3e5e9 6mm 6.3mm)}
'''
def page(body, label, cls=''):
    return (f'<section class="sheet {cls}"><div class="mock">{E(MOCK)}</div>{body}'
            f'<footer><span>{E(FOOT)}</span><span>{label}</span></footer></section>')
header = lambda kicker: (f'<header class="band"><div><div class="kicker">{kicker}</div><h1>{E(doc["title"])}</h1>'
          f'<div class="sub">{E(R["patient"])} · {mm(END)} simulated (3 min 36 s on the clock) · 18 October 2026 · Run by: Showcase 2</div></div>'
          f'<div class="brand">Patient Monitor Engine<br><span>teaching simulator</span></div></header>')

# ================= page 1: facilitator =================
tiles = [
    ('Recognition (instructor mark)', ILL.format(span(RECOG)), 'arrival → "tamponade" named · asked ≤ 3 min', 'ok'),
    ('Recognition → first team action', ILL.format(span(cpr - RECOG)), f'{ILL.format(mm(RECOG))} → {mm(cpr)} (CPR)', ''),
    ('No-flow: pulse lost → CPR', span(cpr - pl), f'{mm(pl)} → {mm(cpr)} · asked ≤ 10 s', 'ok'),
    ('CPR → pericardiocentesis', span(drained - cpr), f'{mm(cpr)} → {mm(drained)} · asked ≤ 2 min', 'ok'),
]
T = ''.join(f'<div class="tile {c}"><div class="tl">{E(a)}</div><div class="tv">{b}</div><div class="ts">{s}</div></div>' for a, b, s, c in tiles)
OBJ = [
    ('Instructor', 'Named the tamponade from the monitor', f'Observed at {ILL.format(mm(RECOG))} (instructor mark), {ILL.format(span(RECOG))} after arrival; asked within 3 min.', None),
    ('Observed', 'Started CPR after the pulse loss', f'{span(cpr-pl)} after the pulse loss ({mm(pl)} → {mm(cpr)}); asked within 10 s.', (cpr-pl, 10)),
    ('Observed', 'Drained the pericardium during CPR', f'{span(drained-cpr)} into CPR ({mm(cpr)} → {mm(drained)}); asked within 2 min.', (drained-cpr, 120)),
    ('Observed', 'Stopped CPR when the pulse returned', f'{span(stop-rosc)} after the pulse returned ({mm(rosc)} → {mm(stop)}); asked within 30 s.', (stop-rosc, 30)),
    ('Gap to explore', 'Drain before the pulse loss, while the systolic is above 60', f'Not observed: the pulse was lost at {mm(pl)}; drainage came during CPR, at {mm(drained)}. Systolic below 80 from {mm(DET)}.', None),
]
def bar(a, b, w=120):
    sc = w / b; return (f'<svg class="ibar" viewBox="0 0 {w+2} 12" width="{w+2}" height="12"><rect x="1" y="2" width="{w}" height="8" class="asked"/>'
                        f'<rect x="1" y="2" width="{max(a*sc,1.5):.1f}" height="8" class="taken"/></svg>')
chipc = {'Observed': ('met', '✓'), 'Gap to explore': ('not-met', '◆'), 'Instructor': ('not-assessable', '○')}
O = ''.join(f'<li class="o"><span class="chip {chipc[s][0]}"><b>{chipc[s][1]}</b> {s}</span><div class="ot">{E(t)}<div class="ow">{w}</div></div>'
            f'<div class="ob">{(bar(*b) + f"<span>{span(b[0])} of {span(b[1])}</span>") if b else ""}</div></li>' for s, t, w, b in OBJ)
p1 = (header('Debrief · facilitator · simulated case') +
      '<h2>Key times <small>intervals from the moment named; † not recorded in rc.1</small></h2>' f'<div class="tiles" style="grid-template-columns:repeat(4,1fr)">{T}</div>' +
      '<h2>The run, lane by lane <small><span class="lg pt">● patient</span> <span class="lg team">■ team</span> ◇ recognised† · alarm bars: raise measured │, end illustrative ┄</small></h2>' +
      swimlane() +
      '<h2>Objectives, in behavioural words <small>observed against expected; it reads the run, it does not grade the person</small></h2>' f'<ol class="objs">{O}</ol>' + NOTE)

# ================= page 2: key moments + scenario hints =================
K = ''
for n, m in enumerate(km, 1):
    f = lambda k: '–' if at(max(m['t'], 3), k) is None else f"{at(max(m['t'],3), k):.0f}"
    sbp, dbp, cvp = ILLV.get(m['t'], ILLV.get(int(m['t']), (None, None, None)))
    il = lambda v: f'<td class="v ill">{v}†</td>' if v is not None else '<td class="v">–</td>'
    who = f'<span class="who {"team" if m["who"]=="Team" else "pt"}">{"◇" if m.get("ill") else ("■" if m["who"]=="Team" else "●")} {m["who"]}</span>'
    txt = f'<span class="ill">{E(m["text"])}†</span>' if m.get('ill') else E(m['text'])
    tt = ILL.format(mm(m['t'])) if m.get('ill') else mm(m['t'])
    K += (f'<tr><td class="n">{n}</td><td class="t">{tt}</td><td>{who}</td><td>{txt}</td><td class="v">{f("hr")}</td>'
          + il(sbp) + il(dbp) + f'<td class="v">{f("map")}</td>' + il(cvp) + f'<td class="v">{f("spo2")}</td><td class="v">{f("etco2")}</td></tr>')
p2 = ('<h2>Key moments and what the monitor showed <small>HR, MAP, SpO₂, EtCO₂ measured; SBP, DBP, CVP and the recognition row illustrative†</small></h2>'
      '<table class="km"><thead><tr><th></th><th>Time</th><th>Who</th><th>What happened</th><th>HR</th><th class="ill">SBP†</th><th class="ill">DBP†</th><th>MAP</th><th class="ill">CVP†</th><th>SpO₂</th><th>EtCO₂</th></tr></thead>'
      f'<tbody>{K}</tbody></table>' + NOTE +
      '<h2>Debrief hints for this scenario <small>from the scenario file <span class="authored">placeholder wording, not reviewed by the owner</span></small></h2>'
      '<div class="hints"><div><b>What this case is built to show</b><ul>'
      '<li>Tamponade is an obstructive shock: tachycardia, a narrow pulse pressure and a raised CVP come before the arrest.</li>'
      '<li>Induction drugs can remove the compensation that keeps the pressure up.</li>'
      '<li>In PEA from tamponade, compressions alone do not refill the heart: decompression is the treatment.</li></ul></div>'
      f'<div><b>Openers for the analysis</b> (advocacy-inquiry)<ul>'
      f'<li>"I saw the systolic go below 80 at {mm(DET)} [moment 2]. I\'m curious what you were weighing then."</li>'
      f'<li>"The drainage came {span(drained-cpr)} into CPR [moment 5]. What would have let it come before {mm(pl)}?"</li></ul></div></div>'
      '<h2>Choosing a mode for each gap <small>PEARLS analysis; the author suggests, the facilitator decides</small></h2>'
      '<table class="modes"><thead><tr><th>Gap or strength</th><th>Domain</th><th>Rationale evident?</th><th>Suggested mode</th></tr></thead><tbody>'
      '<tr><td>◆ Drain before the pulse loss</td><td>cognitive (anticipation)</td><td>no</td><td>focused facilitation (advocacy-inquiry)</td></tr>'
      '<tr><td>✓ CPR within 3 s of the pulse loss</td><td>technical / team</td><td>yes</td><td>learner self-assessment: what made it fast?</td></tr>'
      '<tr><td>✓ CPR stopped 2 s after the pulse returned</td><td>cognitive (re-evaluation)</td><td>yes</td><td>brief directive: the arterial line and capnogram cue</td></tr>'
      '</tbody></table>'
      '<p class="next">Next pages (facilitator): trends with the same markers; drugs, fluids and the full timeline; bookmarks; the one-row-per-minute appendix with SBP, DBP and CVP columns. Learner handout: printed separately, overleaf.</p>')

# ================= page 3: learner handout (no verdicts) =================
L = ''.join(f'<tr><td class="t">{ILL.format(mm(m["t"])) if m.get("ill") else mm(m["t"])}</td><td>{("<span class=ill>" + E(m["text"]) + "†</span>") if m.get("ill") else E(m["text"])}</td></tr>' for m in km)
p3 = (header('Learner handout · your case · no marks, no verdicts') +
      '<p style="margin:0 0 2mm">This sheet is yours to keep. It shows what happened and when, so you can think it through; the conversation, not this page, is the debrief.</p>'
      '<h2>Your run at a glance <small>patient events ● and team actions ■ on one time axis</small></h2>' + swimlane(learner=True) +
      '<h2>Key moments</h2><table class="km"><tbody>' + L + '</tbody></table>' +
      '<h2>Questions to think about <small>write a line or two before the debrief</small></h2>'
      f'<div class="prompt"><b>At {mm(DET)} the systolic fell below 80. What did you notice on the monitor, and what did you make of it?</b><div class="lines"></div></div>'
      f'<div class="prompt"><b>The pulse was lost at {mm(pl)} and the pericardium drained at {mm(drained)}. What would have let you drain earlier?</b><div class="lines"></div></div>'
      '<div class="prompt"><b>One thing you will keep doing, one thing you will do differently.</b><div class="lines"></div></div>'
      '<h2>Take-home and next steps <small><span class="authored">placeholder wording from the scenario hints</span></small></h2>'
      '<ul style="margin:0;padding-left:5mm"><li>Narrow pulse pressure + raised CVP + tachycardia after chest trauma: think tamponade, plan drainage early.</li>'
      '<li>Before induction in a compensating patient, ask what keeps the pressure up.</li>'
      '<li>Practise: run this case again from the bookmark at arrival and aim to drain before the pulse loss.</li></ul>' + NOTE)
H = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Debrief mock-up C</title>'
     f'<style>{CSS}</style></head><body>' + page(p1, 'Page 1 of 7') + page(p2, 'Page 2 of 7') + page(p3, 'Learner handout · 1 of 1', 'learner') + '</body></html>')
open(os.path.join(outdir, 'option-c-debrief2.html'), 'w').write(H)
print('ok', len(km))
