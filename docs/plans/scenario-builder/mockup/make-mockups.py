# Builds the six static mock-ups of docs/plans/scenario-builder.md from the snippets below. Static pages for the owner's
# review: NOT the product, no app code. They link the app's own stylesheets from the source tree, so open them from a
# checkout (the relative path ../../../../apps/demo/src/app/ must exist). Rebuild: python3 -I make-mockups.py
# Card content (labels, rules, criteria, the Instructor v2 rows) is the library card showcase-mh-v2 as on main 8344539d;
# what is illustrative (times, values, names, versions, counts) is listed in README.txt.
import html, os
HERE = os.path.dirname(os.path.abspath(__file__))
APP = '../../../../apps/demo/src/app/'
E = html.escape

def page(title, body, route='scenarios', main_route='scenarios', teach=False):
    css = [APP + 'app.css'] + ([APP + 'teach2/' + f for f in ('teach2.css', 'state.css', 'action.css')] if teach else []) + ['mock.css']
    links = ''.join(f'<link rel="stylesheet" href="{c}">' for c in css)
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{E(title)}</title>{links}</head><body><div id="app"><div class="app has-rail" data-route="{route}">{rail(teach)}'
            f'<main class="main" id="main" data-route="{main_route}">{body}</main></div></div>'
            f'<div class="sb-mock">MOCK-UP · proposed, not built</div></body></html>')

ICONS = [('home', 'Home', 'M3.5 11 12 4l8.5 7M5.5 9.5V20h4.5v-6h4v6h4.5V9.5'), None,
         ('room', 'Room', 'M3 5h12v9H3zM6.5 18h5M9 14v4M17.5 8.5H21V20h-3.5z'),
         ('scenarios', 'Scenarios', 'M4 5h16v14H4zM8 9h8M8 13h5'),
         ('patient', 'Patient', 'M12 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM5 20c.9-3.9 3.6-6 7-6s6.1 2.1 7 6'), None,
         ('teach2', 'Instructor', 'M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1M15 5v4M9 10v4M17 15v4'),
         ('monitor', 'Monitor', 'M3 5h18v14H3zM5 13h3l1.5-4 3 7 1.5-3H19'),
         ('vent', 'Ventilator', 'M3 9h10a3 3 0 1 0-3-3M3 13h14a3 3 0 1 1-3 3M3 17h6'), None,
         ('debrief', 'Debrief', 'M9 4h6v3H9zM7 5.5H5V21h14V5.5h-2M9 14l2 2 4-4'), None,
         ('explore', 'Explore physiology', 'M4 4v16h16M8 15l3.5-4.5 3 3L19 8'),
         ('settings', 'Settings', 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1')]

def rail(strip):
    items = []
    for it in ICONS:
        if it is None:
            items.append('<hr class="rail-hr">'); continue
        r, name, d = it
        cur = ' aria-current="page"' if r == 'scenarios' else ''
        badge = '<small class="rail-badge">21</small>' if r == 'scenarios' else ''
        items.append(f'<a class="rail-item" href="#" data-route="{r}" title="{name}"{cur}><svg viewBox="0 0 24 24" aria-hidden="true" class="rail-ico"><path d="{d}"></path></svg><span class="rail-text">{name}</span>{badge}</a>')
    return ('<nav class="rail" aria-label="Pages"><div class="rail-brand"><span class="mark" aria-hidden="true"></span><span class="rail-text"><b>Patient monitor simulator</b>'
            '<small>1.0.0-rc.5, pre-release</small></span></div><div class="rail-list">' + ''.join(items) + '</div>'
            '<div class="rail-foot"><button type="button" role="switch" class="rail-theme" aria-checked="false"><i class="rail-knob" aria-hidden="true"></i><span class="rail-text">Dark</span></button></div></nav>')

def console(inner):
    return f'<section class="console scenarios view" data-view="scenarios">{inner}</section>'

SAVES = ('<div class="sb-saves" aria-label="Where this draft is saved">'
         '<span class="sb-save"><i></i>This browser · <b>saved 11:42:05</b></span>'
         '<span class="sb-save"><i></i>Kit store (this laptop) · <b>v7, 11:41</b></span>'
         '<span class="sb-save warn"><i></i>Central store · <b>v6 uploaded, unverified</b></span></div>')

def top(section):
    return (f'<div class="sb-top"><div><a class="console-back" href="#">← Scenarios</a><h1>Scenario builder</h1>'
            f'<p class="sb-card"><b>Malignant hyperthermia (phases)</b> · <code>mh-phases-copy</code> · a copy of the library card '
            f'<code>showcase-mh-v2</code> · draft, not signed</p></div><span class="sb-sp"></span>'
            f'<div style="display:grid;gap:10px;justify-items:end">{SAVES}<div class="sb-acts">'
            f'<button class="btn" type="button">Export file</button><button class="btn" type="button">Submit for signing</button>'
            f'<button class="btn primary" type="button">Run in place</button></div></div></div>')

def outline(cur, compact=False):
    def a(key, label, count='', dot=''):
        d = f'<span class="sb-dot{dot}"></span>' if dot is not None and dot != '' else ''
        return f'<a href="#"{" aria-current=\"true\"" if key == cur else ""}>{d}{label}<small>{count}</small></a>'
    ph = ['Baseline', 'Latent', 'Early signs', 'Established', 'Treated', 'Recovering', 'Recrudescence', 'Arrest', 'ROSC']
    s = ['<nav class="sb-panel sb-outline" aria-label="Card outline"><h3>Card</h3>',
         a('head', 'Header and story', '', ' w'), a('patient', 'Patient and sensors'), a('brief', 'Case briefing'),
         '<h3>Course</h3>', a('phases', 'Phases', '9', ' w' if cur != 'phases' else '')]
    if cur == 'phases':
        s += [f'<a href="#" class="sb-sub"{" aria-current=\"true\"" if p == "Early signs" else ""}>{p}{"<small>refused</small>" if p == "Early signs" else ""}</a>' for p in ph]
    s += [a('script', 'Script (card-set)', '1'), '<h3>The team</h3>', a('actions', 'Actions', '17', ' w')]
    if cur == 'actions':
        s += [f'<a href="#" class="sb-sub"{" aria-current=\"true\"" if x == "Dantrolene 2.5 mg/kg" else ""}>{x}</a>' for x in
              ['Induction (5, not graded)', 'MH crisis (decision)', 'Hyperventilate', 'Propofol infusion', 'Dantrolene 2.5 mg/kg', 'Dantrolene again', '… 10 more']]
    s += [a('outcomes', 'Outcomes', '0'), a('viol', 'Violations', '1'),
          '<h3>Debrief</h3>', a('hints', 'Debrief hints', '—'), a('questions', 'Handout questions', '—'), a('take', 'Take-home lines', '4'), '</nav>']
    return ''.join(s)

# ---------------------------------------------------------------------------------------------------------------- 1
CHECKS_MAIN = ('<aside class="sb-panel sb-checks" aria-label="Checks"><h3>Checks</h3><ul>'
  '<li class="bad">The validator refuses this draft: 2 refusals<small>Each is shown at its field; Run in place, Submit and Export wait for 0.</small></li>'
  '<li class="bad"><span><code>/takeHome</code>: must NOT have more than 4 items</span></li>'
  '<li class="bad"><span><code>/phases/2/next/0</code>: no phase "establshed"</span></li>'
  '<li class="warn">Sources: 23 numbers carry no <code>src</code><small>Placeholders, marked for the owner; they do not block a draft, they block the signature (B11).</small></li>'
  '<li>Engine: every drug id, class and route is in this build<small>Build 1.0.0-rc.5 · engine of this app</small></li>'
  '<li class="off">Port check: not a port<small>This card was copied from a /2 card.</small></li>'
  '</ul><h3>History</h3><ul>'
  '<li>v7 · 11:41 · kit store</li><li>v6 · 10:58 · central store, unverified</li><li class="off">v1 · 9 Nov 09:12 · copied from showcase-mh-v2</li></ul></aside>')

EDIT_MAIN = ('<section class="sb-panel sb-edit" aria-label="Header and story"><h2>Header and story <small>what the library and the Case details show</small></h2>'
  '<div class="sb-row" style="--n:3"><label class="field"><span>Title</span><input class="input" value="Malignant hyperthermia (phases)"></label>'
  '<label class="field"><span>Card id</span><input class="input" value="mh-phases-copy"><p class="sb-hint">A built-in card\'s id is refused; a copy gets its own.</p></label>'
  '<label class="field"><span>Category</span><select class="input"><option>Showcase</option></select></label></div>'
  '<div class="sb-row" style="--n:4"><label class="field"><span>Mode</span><select class="input"><option>modeled</option></select></label>'
  '<label class="field"><span>About, minutes</span><input class="input" value="40"></label><label class="field"><span>Seed</span><input class="input" value="7"></label>'
  '<label class="field"><span>Format</span><input class="input" value="pme-scenario/2" disabled></label></div>'
  '<label class="field"><span>Story (the library\'s one sentence is its first)</span><textarea class="input">A fit 35-year-old man on the table, breathing room air: preoxygenated by face mask, premedicated with midazolam and fentanyl on the mask, induced with propofol and succinylcholine, intubated and maintained on sevoflurane 2 %. The jaw is stiff after the succinylcholine. Minutes into surgery the EtCO₂ rises at unchanged ventilation when it should be falling …</textarea></label>'
  '<div class="field bad"><span>Take-home lines (the learner handout; at most four)</span>'
  '<input class="input" value="Early MH: EtCO₂ rising at unchanged ventilation, before the temperature">'
  '<input class="input" value="Call the crisis, stop the trigger, hyperventilate with 100 % O₂">'
  '<input class="input" value="Dantrolene 2.5 mg/kg IV, again while the EtCO₂ climbs">'
  '<input class="input" value="Treat the potassium; cool above 38.5 °C">'
  '<input class="input" value="Ask for help early">'
  '<p class="sb-refuse"><span>The validator refuses: <code>/takeHome</code>: must NOT have more than 4 items. Remove one line.</span></p></div>'
  '<p class="sb-hint">Every change is saved in this browser at once. Ctrl+S also saves to the kit store when the kit runs on this laptop.</p></section>')

p1 = page('Scenario builder: main screen', console(f'<div class="sb-page">{top("head")}<div class="sb-grid">{outline("head")}{EDIT_MAIN}{CHECKS_MAIN}</div></div>'))

# ---------------------------------------------------------------------------------------------------------------- 2
def leaf(kind, *parts, x='remove'):
    return f'<div class="sb-leaf"><span class="sb-kind">{kind}</span>' + ''.join(parts) + f'<span class="sb-x">{x}</span></div>'
v = lambda s: f'<span class="sb-v">{s}</span>'
EDIT_PHASE = ('<section class="sb-panel sb-edit" aria-label="Phase editor"><h2>Phase: Early signs <small>entered by its own rule on the engine\'s truth, never by a press</small></h2>'
  '<div class="sb-flow" aria-label="Where this phase sits">' + ''.join(
      f'<span class="sb-ph"{" aria-current=\"true\"" if p == "Early signs" else ""}>{p}</span>' + ('<span class="sb-ar">→</span>' if i < 3 else '')
      for i, p in enumerate(['Latent', 'Early signs', 'Established · Treated · Arrest'])) + '</div>'
  '<div class="sb-row" style="--n:3"><label class="field"><span>Label (the strip)</span><input class="input" value="Early signs"></label>'
  '<label class="field"><span>Phase id</span><input class="input" value="earlySigns"></label>'
  '<label class="field"><span>Hold, s (the rule holds this long before the phase changes)</span><input class="input" value="20"></label></div>'
  '<div class="sb-row"><label class="field"><span>Learners see (cue)</span><input class="input" value="EtCO₂ climbing, HR up"></label>'
  '<label class="field"><span>Say line (the cue box)</span><input class="input" value="The EtCO₂ is rising at unchanged ventilation when it should be falling, with a rising heart rate: think of MH early."></label></div>'
  '<div class="field"><span>Entered when</span><div class="sb-rule"><span class="sb-op">ALL OF</span>'
  + leaf('value', v('EtCO₂ (etco2)'), v('&gt;'), v('45'), '<span class="sb-hint">mmHg · for</span>', v('—'), '<span class="sb-hint">s</span>')
  + leaf('slope', v('EtCO₂ (etco2)'), v('rising &gt;'), v('0.2'), '<span class="sb-hint">mmHg/min over</span>', v('120'), '<span class="sb-hint">s</span>')
  + leaf('unchanged', v('set minute ventilation'), '<span class="sb-hint">within</span>', v('5'), '<span class="sb-hint">% over</span>', v('120'), '<span class="sb-hint">s</span>')
  + leaf('slope', v('HR (hr)'), v('rising &gt;'), v('0'), '<span class="sb-hint">/min over</span>', v('120'), '<span class="sb-hint">s</span>')
  + '<button class="sb-add" type="button">+ value · slope · unchanged · visited · signal · ALL · ANY · NOT</button></div>'
  '<p class="sb-hint">The leaves read the engine\'s truth (the schema\'s <code>truthVar</code> names). There is no press, event or timer leaf: the validator refuses <code>manual</code>, <code>event</code> and <code>afterS</code> in a phase rule.</p></div>'
  '<div class="field bad"><span>May be followed by (the first rule that holds wins, in this order; drag to reorder)</span><div class="sb-next">'
  + leaf('', '<span class="sb-n">1</span>', v('establshed'), x='remove')
  + leaf('', '<span class="sb-n">2</span>', v('Treated'), x='remove')
  + leaf('', '<span class="sb-n">3</span>', v('Arrest'), x='remove')
  + '</div><p class="sb-refuse"><span>The validator refuses: <code>/phases/2/next/0</code>: no phase "establshed". Pick the phase from the list (Established).</span></p></div>'
  '<div class="sb-preview"><p>On the strip and in ACTION, as Instructor v2 draws this phase\'s rule</p>'
  '<div class="sb-leaf" style="display:block"><b>Early signs</b> <span class="sb-hint">EtCO₂ climbing, HR up · when EtCO₂ &gt; 45 and EtCO₂ rising and set minute ventilation unchanged and HR rising, held 20 s</span></div></div>'
  '</section>')
CHECKS_PHASE = ('<aside class="sb-panel sb-checks" aria-label="Checks"><h3>Checks for this phase</h3><ul>'
  '<li class="bad"><span><code>/phases/2/next/0</code>: no phase "establshed"</span></li>'
  '<li class="warn">Thresholds without a source: 45, 0.2, 5 %, 120 s, 20 s<small>The card\'s note calls them [ENG: scenario] readings of the owner\'s words; the signature asks for each one\'s source or the owner\'s ruling.</small></li>'
  '<li>Reachable: from Latent</li><li>Leads on to: Established, Treated, Arrest</li></ul>'
  '<h3>Last run in place</h3><ul><li>Rule first held 05:39, held 20 s, entered 05:59<small>Times from the author\'s last run (illustrative here).</small></li>'
  '<li class="off">Not reached yet: Established, Recovering, Recrudescence, Arrest, ROSC</li></ul></aside>')
p2 = page('Scenario builder: phase editor', console(f'<div class="sb-page">{top("phases")}<div class="sb-grid">{outline("phases")}{EDIT_PHASE}{CHECKS_PHASE}</div></div>'))

# ---------------------------------------------------------------------------------------------------------------- 3
route = lambda r, on=False, pref=False, note='': f'<span class="sb-tag{" pref" if pref else ""}" aria-pressed="{str(on).lower()}">{r}{f" <em>{note}</em>" if note else ""}</span>'
EDIT_ACTION = ('<section class="sb-panel sb-edit" aria-label="Action editor"><h2>Action: Dantrolene 2.5 mg/kg <small>a drug; graded met · deviation · overdue · failed · not applicable</small></h2>'
  '<div class="sb-row" style="--n:3"><label class="field"><span>Row title</span><input class="input" value="Dantrolene 2.5 mg/kg"></label>'
  '<label class="field"><span>Kind</span><select class="input"><option>drug</option></select></label>'
  '<label class="field"><span>Open in phases</span><input class="input" value="Latent, Early signs, Established, Treated, Recovering, Recrudescence"></label></div>'
  '<div class="sb-cols"><div class="field"><span>Acceptance criteria</span><div class="sb-rule">'
  + leaf('drug', v('dantrolene'), '<span class="sb-hint">by id · or a class · or alternatives</span>', x='')
  + leaf('dose', v('2.5'), v('mg/kg'), '<span class="sb-hint">accepted</span>', v('2'), '<span class="sb-hint">to</span>', v('3'), x='')
  + leaf('cumulative', '<span class="sb-hint">at most</span>', v('10'), v('mg/kg'), x='')
  + '<div class="sb-leaf"><span class="sb-kind">route</span>' + route('iv', True, True) + route('central', True) + route('io', note='modelled') + route('im', note='modelled: no systemic effect') + route('inh', note='not modelled') + '</div>'
  + leaf('rate', v('bolus'), x='')
  + '</div></div>'
  '<div class="field"><span>When (the window and the repeat)</span><div class="sb-rule">'
  + leaf('anchor', v('after the action'), v('MH crisis (callCrisis)'), x='')
  + leaf('within', v('300'), '<span class="sb-hint">s · fail after</span>', v('—'), '<span class="sb-hint">· not before</span>', v('—'), x='')
  + leaf('again', '<span class="sb-hint">while</span>', v('visited Recrudescence'), '<span class="sb-hint">every</span>', v('300–600'), '<span class="sb-hint">s</span>', x='')
  + leaf('precondition', v('—'), x='')
  + '</div></div></div>'
  '<div class="field"><span>Violations (an administration that matches is a red timed line: never a grade, never blocked)</span><div class="sb-rule">'
  + leaf('if given', v('dantrolene'), v('route im'), '<span class="sb-hint">→</span>', v('Dantrolene IM: no effect on the MH, and the solution (pH about 9.5) injures the tissue'), v('harm not modelled'), x='remove')
  + '<button class="sb-add" type="button">+ violation</button></div></div>'
  '<div class="sb-cols"><div class="field"><span>A press gives (the commands the A row sends)</span><div class="sb-rule">'
  + leaf('drug', v('dantrolene 2.5 mg/kg'), v('iv'), x='')
  + '<button class="sb-add" type="button">+ from the Drug sheet</button></div></div>'
  '<div class="field"><span>Sources (src): every number with its quote and page</span><textarea class="input" placeholder="e.g. 2.5 mg/kg: the MHAUS / EMHG guideline, quote, page"></textarea>'
  '<p class="sb-warnline"><span>No source for 2.5, 2–3, 10 mg/kg, 300 s and 300–600 s: placeholders, marked for the owner.</span></p></div></div>'
  '<div class="sb-preview"><p>The row as Instructor v2 draws it</p><ol class="ip2-rows" style="margin:0;padding:0;list-style:none"><li>'
  '<div class="sb-leaf" style="display:block"><b>Dantrolene 2.5 mg/kg</b><br><span class="sb-hint">2–3 mg/kg · IV/CENTRAL · within 5 min of the "callCrisis" action · again every 5–10 min while after recrudescence</span></div></li></ol></div>'
  '</section>')
CHECKS_ACTION = ('<aside class="sb-panel sb-checks" aria-label="Checks"><h3>Checks for this action</h3><ul>'
  '<li>dantrolene is in the engine (65 drug rows)</li>'
  '<li>Every route in the set is modelled for dantrolene</li>'
  '<li>Anchor: action callCrisis exists</li>'
  '<li class="warn">5 numbers without a source</li>'
  '<li class="warn">The press gives 2.5 mg/kg IV: inside the criteria</li></ul>'
  '<h3>How it grades (from the card)</h3><ul class="off">'
  '<li class="off">IV 2.5 mg/kg 4 min after the call: met</li><li class="off">central 2.5 mg/kg: met (allowed)</li>'
  '<li class="off">IV 1 mg/kg: deviation, "dose 1 mg/kg, 2–3 asked"</li><li class="off">IM: the row stays open, a violation line</li></ul></aside>')
p3 = page('Scenario builder: action editor', console(f'<div class="sb-page">{top("actions")}<div class="sb-grid">{outline("actions")}{EDIT_ACTION}{CHECKS_ACTION}</div></div>'))

# ---------------------------------------------------------------------------------------------------------------- 4
IP2 = open(os.path.join(HERE, 'ip2-captured.html'), encoding='utf-8').read()
LEFT = ('<div class="sb-left"><div><a class="console-back" href="#">← Back to the builder</a>'
  '<h1 style="margin:0;font-size:20px;color:var(--text-strong)">Run in place</h1>'
  '<p class="sb-hint" style="margin-top:4px">Draft v7 of <b>Malignant hyperthermia (phases)</b> runs on this computer\'s engine. It is not in the library and no phone follows it unless you open the room.</p></div>'
  '<div class="sb-panel" style="padding:12px;display:grid;gap:8px"><b style="font-size:13px;color:var(--text-strong)">Jump the clock</b><div class="sb-jump">'
  '<button class="btn small" type="button">+2 min</button><button class="btn small" type="button">+5 min</button>'
  '<button class="btn small primary" type="button">To the next phase</button><button class="btn small" type="button">Back to a phase\'s start ▾</button></div>'
  '<p class="sb-hint">To the next phase fast-forwards at top speed and stops at the first phase change (or at 30 min). Back restores the stage mark the runner placed at that phase\'s entry.</p>'
  '<div class="sb-jump"><button class="btn small" type="button">Apply my edits and restart</button><button class="btn small" type="button">Apply from this phase\'s mark</button></div></div>'
  '<div class="sb-panel" style="padding:12px;display:grid;grid-template-rows:auto minmax(0,1fr);gap:8px;min-height:0"><b style="font-size:13px;color:var(--text-strong)">What fired, and why</b><div class="sb-trace">'
  '<div class="sb-ev ph"><time>05:59</time><span><b>Early signs entered</b> by its rule, held 20 s from 05:39<ul><li>EtCO₂ 46 &gt; 45 ✓</li><li>EtCO₂ slope +0.9 mmHg/min &gt; 0.2 over 120 s ✓</li><li>set minute ventilation 6.0 L/min, within 5 % over 120 s ✓</li><li>HR slope +2.1 /min &gt; 0 over 120 s ✓</li></ul></span></div>'
  '<div class="sb-ev"><time>05:59</time><span><b>4 rows open</b>: MH crisis, Hyperventilate, Propofol infusion, Name MH · due by 07:59</span></div>'
  '<div class="sb-ev"><time>05:30</time><span><b>Established</b> not yet: core 37.0 °C ≤ 38.5; MH activity 0.31 ≤ 0.8</span></div>'
  '<div class="sb-ev ph"><time>01:24</time><span><b>Latent entered</b>: MH activity 0.02 &gt; 0.01 ✓, EtCO₂ 38 ≤ 45 ✓, held 60 s</span></div>'
  '<div class="sb-ev"><time>00:24</time><span><b>Script</b> (card-set): condition mh, severity 1, with the Induce press</span></div>'
  '</div></div></div>')
IP2 = IP2.replace('<div class="ip2-ff ip2-ff-row"', '<div class="mock-stage">the learners\' monitor (live in the product)</div><div class="ip2-ff ip2-ff-row"', 1)
p4 = page('Scenario builder: run in place', f'<section class="view" data-view="builder-run" style="background:var(--ip2-page)"><div class="sb-run">{LEFT}{IP2}</div></section>', route='teach2', main_route='builder-run', teach=True)

# ---------------------------------------------------------------------------------------------------------------- 5
def item(t, d, mins, btns, tags='', who=''):
    return (f'<div class="scen-item lib"><div><h3 class="t">{t}{tags}</h3><p class="d">{d}</p>{who}'
            f'<details class="scen-details"><summary>Case details</summary></details></div><span class="scen-dur">{mins}</span><span class="sb-acts">{btns}</span></div>')
load = lambda p=False: f'<button type="button" class="btn{" primary" if p else ""}">Load</button>'
copy = '<button type="button" class="btn ghost">Open in builder</button>'
ver = '<span class="scen-tag">Verified</span>'
unv = '<span class="sb-tag unv" style="margin-left:8px">community, unverified</span>'
LIB = ('<div class="console-page"><a class="console-back" href="#">← Scenarios</a><div class="sb-lib-head"><h1>Scenario library</h1><span class="sb-sp"></span>'
  '<span class="sb-save"><i></i>Central store · <b>reached 11:40</b></span></div>'
  '<p class="console-sub">Verified cases ship with the simulator and run offline. Community cases come from the central store and are not verified: open one in the builder as a copy, or load it to try it.</p>'
  '<section class="scen-group scen-demos"><h2 class="scen-h3">Today\'s demonstrations</h2><div class="scen-list">'
  + item('Malignant hyperthermia (phases)', 'A fit 35-year-old man on the table, breathing room air: preoxygenated by face mask, premedicated with midazolam and fentanyl on the mask, induced with propofol and succinylcholine, intubated and maintained on sevoflurane 2 %.', '40 min', copy + load(True), ver, '<p class="sb-who">Ships in this build · in the repository before the store (BQ12)</p>')
  + item('Class IV haemorrhage, PEA and resuscitation (phases)', 'A 35-year-old man bleeding 2.5 L over 10 minutes, breathing room air: oxygen and the ventilator come only from your steps.', '25 min', copy + load(True), ver, '<p class="sb-who">Ships in this build · in the repository before the store (BQ12)</p>')
  + '</div></section><section class="scen-group"><h2 class="scen-h3">Verified · Showcase</h2><div class="scen-list">'
  + item('Healthy induction', 'A healthy adult induced with propofol, fentanyl and rocuronium, then intubated and ventilated.', '15 min', copy + load(), ver, '<p class="sb-who">Port of the /1 card · beats identical · signed 12 Nov 2026</p>')
  + item('Anaphylaxis under anaesthesia', 'Minutes after the antibiotic, the pressure falls and the airway pressure rises.', '20 min', copy + load(), '<span class="sb-tag" style="margin-left:8px">/1, not ported yet</span>')
  + '</div></section><section class="scen-group"><h2 class="scen-h3">Community, unverified · from the central store</h2><div class="scen-list">'
  + item('Local anaesthetic systemic toxicity after a femoral block', 'Ten minutes after a femoral nerve block, the patient is agitated, then seizes; the QRS widens.', '30 min', copy + load(), unv, '<p class="sb-who">v3 · 8 Nov 2026 · submitted for signing</p>')
  + item('Laryngospasm at emergence', 'A child at emergence, the mask on, with stridor and falling saturation.', '15 min', copy + load(), unv, '<p class="sb-who">v1 · 7 Nov 2026 · draft</p>')
  + '</div></section><section class="scen-group"><h2 class="scen-h3">On this laptop · kit store and this browser</h2><div class="scen-list">'
  + item('Malignant hyperthermia (phases), my copy', 'A copy of the library card, being edited.', '40 min', '<button type="button" class="btn ghost">Open in builder</button>' + load(), '<span class="sb-tag" style="margin-left:8px">draft v7</span>', '<p class="sb-who">Kit store · 11:41 · not uploaded since v6</p>')
  + '</div></section></div>')
p5 = page('Scenario library: verified and community', console(LIB))

# ---------------------------------------------------------------------------------------------------------------- 6
SIGN = ('<div class="console-page"><a class="console-back" href="#">← Scenario library</a><h1>Sign a scenario</h1>'
  '<p class="console-sub">Signing is for verifiers the owner names. A signature is a record in the central store: who, when, and the exact version. The store\'s server then proposes the card to the repository; once merged, it ships in the next kit.</p>'
  '<div class="sb-grid" style="grid-template-columns:minmax(0,1fr) 340px;margin-top:20px">'
  '<section class="sb-panel sb-edit"><h2>Local anaesthetic systemic toxicity after a femoral block <small>version 3 of 3 · submitted 8 Nov 2026 20:14</small></h2>'
  '<div class="sb-row" style="--n:3"><div class="field"><span>Content hash (SHA-256, canonical JSON)</span><code>4f1c…9a07</code></div>'
  '<div class="field"><span>Last signed version</span><span>none (first signature)</span></div>'
  '<div class="field"><span>Validated against</span><span>engine 1.0.0-rc.5 · build of this app</span></div></div>'
  '<div class="field"><span>What changed since version 2 (read every line)</span><pre class="sb-diff">'
  '  phases[3] "collapse"  enter: value <span class="r">- map &lt; 50  forS 30</span>\n'
  '                                   <span class="a">+ map &lt; 55  forS 30</span>\n'
  '  actions[4] "lipidEmulsion" dose <span class="r">- 1.5 mL/kg</span> <span class="a">+ 1.5 mL/kg, 1–1.5 accepted</span>\n'
  '  actions[4] src <span class="a">+ "1.5 mL/kg": the guideline\'s quote, its page</span></pre></div>'
  '<div class="field"><span>Checks the store and this app ran</span><ul style="margin:0;padding-left:18px;line-height:1.7;font-size:14px">'
  '<li>The validator: 0 refusals, 0 warnings</li>'
  '<li>Sources: every number carries a <code>src</code> line (the signature waits for this)</li>'
  '<li>Run in place by this verifier: 2 runs on this version, last 9 Nov 2026 10:52, phases entered: baseline, toxicity, collapse, arrest, ROSC</li>'
  '<li>Not a port: no /1 original to compare</li></ul></div>'
  '<div class="sb-assert"><label class="check" style="align-items:flex-start"><input type="checkbox"><span>I read version 3 of this card whole, ran it in the builder, and I find its clinical content (the phases and their rules, '
  'the actions and their criteria, the violations, the sources) fit to teach from in our department on this engine, within the engine\'s stated known deviations. '
  'I sign this exact version (hash 4f1c…9a07); any later edit is a new version, unverified until signed again.</span></label></div>'
  '<div class="sb-acts"><button class="btn primary" type="button" disabled>Sign version 3</button><button class="btn" type="button">Return to the author with a note</button>'
  '<span class="sb-hint">Signing needs the box ticked and every number sourced.</span></div></section>'
  '<aside class="sb-panel sb-checks"><h3>After you sign</h3><ul>'
  '<li class="off">The store keeps the signature: verifier, time, version, hash<small>Immutable: a signature is never edited or deleted, only superseded.</small></li>'
  '<li class="off">The store\'s bot opens a pull request adding the card and its signature file to the scenario library<small>The bot\'s token lives on the store server only.</small></li>'
  '<li class="off">CI validates the card; the owner merges<small>A red check is never merged past.</small></li>'
  '<li class="off">The next kit ships it under Verified</li></ul>'
  '<h3>Author</h3><ul><li class="off">Shown as the author chose: "a resident, Anaesthesia"<small>No e-mail address is shown or committed.</small></li></ul>'
  '<h3>Signed by you before</h3><ul><li class="off">2 cards · last 5 Nov 2026</li></ul></aside></div></div>')
p6 = page('Sign a scenario', console(SIGN))

for name, body in [('01-builder-main.html', p1), ('02-phase-editor.html', p2), ('03-action-editor.html', p3), ('04-run-in-place.html', p4), ('05-library.html', p5), ('06-sign.html', p6)]:
    with open(os.path.join(HERE, name), 'w', encoding='utf-8') as f:
        f.write(body)
    print('wrote', name)
