# Tamponade S2 happy path: why sysMaxAtRosc reads 210.8 with the CPR coronary reading (191.07 without)

Ruling of 5 November 2026 (owner): re-record sysMaxAtRosc as 210.8 ± 5 and sysPlus60 as 123.1 ± 5 in
`apps/demo/src/app/showcase/stab-wound-tamponade.slow.test.ts`. The sysPlus60 cause (the kIsch residue after the CPR
stop) was traced in an earlier investigation note (BAND-NOTE.md, outside the repo); its numbers are restated in §1–§4.

Measured 2026-11-05, read-only, no code change. Trees: the escape-onset branch merged with main (merge commit ed9878b5)
and main 8d79f188. Probe: an untracked copy of the showcase harness with one hook
after each `advanceTo` that reads the engine state (`engine.st`) every 0.1 s; the run is the test's own happy path
(CPR 10 s after the PEA, drainage 2 min into CPR, "Pulse back: stop CPR" 10 s after the pulse). The probe reproduces
the test exactly: sysMaxAtRosc 210.80 (head) / 191.07 (main), both at t = 706 s. The probe and its raw logs were kept outside
the repo (never committed).

Course (both trees): pulse loss 470 s, CPR pressed 482 s, drainage 602.1 s, ROSC 698 s, CPR stopped 708 s.

## 1. The coronary reading, every 2 s, pulse loss to ROSC + 30 s

470–698 s: **identical in both trees** at every printed digit (the arrested heart is `noBeat`, so the PR's
compression branch is never reached). Excerpt (cpp mmHg / supply:demand ratio / kIsch):

| t | cpp | ratio | kIsch |
|---|---|---|---|
| 470 (pulse loss) | 2.3 | 0.00 | 0.098 |
| 520 | 3.0 | 0.00 | 0.065 |
| 600 | 2.9 | 0.00 | 0.033 |
| 610 (after drainage) | 20.7 | 0.98 | 0.067 |
| 650 | 23.5 | 1.46 | 0.506 |
| 698 (ROSC) | 21.6 | 1.13 | 0.778 |

From ROSC (both trees, CPR still running until 708 s, then off):

| t | head cpp | head ratio | head kIsch | main cpp | main ratio | main kIsch | kIsch gap |
|---|---|---|---|---|---|---|---|
| 698 | 21.6 | 1.13 | 0.778 | 21.6 | 1.13 | 0.778 | +0.000 |
| 700 | 64.7 | 18.79 | 0.785 | -11.9 | 0.03 | 0.704 | +0.081 |
| 702 | 139.3 | 3.40 | 0.792 | 86.8 | 1.50 | 0.699 | +0.093 |
| 704 | 155.9 | 3.79 | 0.799 | 131.1 | 2.58 | 0.709 | +0.090 |
| 706 | 110.2 | 4.31 | 0.806 | 109.2 | 3.80 | 0.719 | +0.087 |
| 708 | 84.8 | 3.97 | 0.812 | 88.0 | 4.35 | 0.728 | +0.084 |
| 710 | 71.5 | 4.52 | 0.818 | 63.3 | 3.86 | 0.737 | +0.081 |
| 712 | 61.9 | 4.04 | 0.824 | 61.1 | 4.08 | 0.745 | +0.079 |
| 714 | 53.7 | 3.20 | 0.830 | 52.7 | 3.25 | 0.754 | +0.076 |
| 716 | 63.7 | 3.05 | 0.836 | 61.7 | 2.99 | 0.762 | +0.074 |
| 718 | 65.2 | 3.23 | 0.841 | 64.2 | 3.22 | 0.770 | +0.071 |
| 720 | 67.6 | 3.18 | 0.846 | 69.0 | 3.24 | 0.777 | +0.069 |
| 722 | 71.5 | 3.53 | 0.851 | 69.7 | 3.64 | 0.784 | +0.067 |
| 724 | 65.6 | 3.43 | 0.856 | 63.7 | 3.42 | 0.791 | +0.065 |
| 726 | 69.4 | 3.35 | 0.861 | 67.5 | 3.31 | 0.798 | +0.063 |
| 728 | 68.8 | 3.44 | 0.865 | 66.6 | 3.41 | 0.805 | +0.060 |

The divergence starts at 699–700 s: on main the beating heart's supply under compressions is read from the beat's
onset LV pressure, which fell inside a compression (cpp −11.9 at 700 s, ratio 0.03, deficit 0.972), so kIsch FELL
0.778 → 0.694 over 2–3 s; with the PR the supply is the relaxation-phase CPP (64.7 at 700 s, ratio 18.8), so kIsch
kept rising (0.778 → 0.812 at the CPR stop). Peak gap 0.087 at 706–708 s; after the stop both recover on the same
τ_up 60 s and the gap shrinks (0.060 at 728 s).

## 2. What kIsch feeds: LV contractility kLv (`model.ts`: kLv = … · min(ext.kIsch, kIschRef) · endoEesF · …)

| instant | head kIsch | head kLv | main kIsch | main kLv |
|---|---|---|---|---|
| ROSC 698 s | 0.778 | 0.9996 | 0.778 | 0.9996 |
| sysMax 706 s | 0.8057 | 0.9184 | 0.7186 | 0.8266 |
| CPR stop 708 s | 0.8121 | 0.887 | 0.7278 | 0.7975 |
| peak kLv in the window | | 1.134 (700.76 s) | | 0.997 (700.76 s) |

kLv 706 s: +11.1 % (0.9184 / 0.8266), exactly the kIsch ratio (0.8057 / 0.7186 = 1.121; the other factors equal).
Equal in both trees at every instant: LV p.eesLv 2.0917, kIschRv, hyp 0, kChem 1, drug ees 1.

## 3. Epinephrine effect level (not the cause)

The happy path gives no epinephrine: `mods.epinephrineAtS` null, exogenous epi `epiExo` 0, drug ees factor 1.000 in
both trees. Endogenous catecholamines and their contractility factor:

| instant | epi pg/mL head / main | NE head / main | endoEesF head / main |
|---|---|---|---|
| ROSC 698 s | 269.46 / 269.46 | 285.08 / 285.08 | 1.1416 / 1.1416 |
| sysMax 706 s | 261.62 / 261.63 | 287.02 / 287.02 | 1.1450 / 1.1450 |
| CPR stop 708 s | 259.57 / 259.58 | 287.60 / 287.59 | 1.1459 / 1.1459 |

## 4. Beat by beat after ROSC (engine truth, site systolic of each completed beat; CPR on until 708 s)

| # | head t | head sbp | head kLv | main t | main sbp | main kLv | Δ sbp |
|---|---|---|---|---|---|---|---|
| 1 | 698.423 | 92.5 | 1.006 | 698.423 | 92.5 | 1.006 | +0.0 |
| 2 | 698.866 | 92.6 | 1.021 | 698.866 | 92.6 | 0.966 | +0.0 |
| 3 | 699.323 | 98.5 | 1.040 | 699.323 | 98.1 | 0.985 | +0.4 |
| 4 | 699.784 | 120.3 | 1.070 | 699.784 | 118.0 | 0.959 | +2.3 |
| 5 | 700.264 | 174.6 | 1.101 | 700.264 | 168.0 | 0.986 | +6.6 |
| 6 | 700.757 | 201.7 | 1.134 | 700.757 | 194.2 | 0.997 | +7.5 |
| 7 | 701.272 | 217.7 | 1.128 | 701.273 | 207.7 | 0.992 | +10.0 |
| 8 | 701.794 | 223.3 | 1.122 | 701.794 | 213.5 | 0.990 | +9.8 |
| 9 | 702.342 | 225.2 | 1.105 | 702.339 | 215.3 | 0.975 | +9.9 |
| 10 | 702.926 | 213.7 | 1.086 | 702.916 | 205.4 | 0.961 | +8.3 |
| 11 | 703.555 | 176.6 | 1.050 | 703.533 | 175.8 | 0.940 | +0.8 |
| 12 | 704.234 | 146.2 | 0.997 | 704.197 | 151.4 | 0.890 | -5.2 |
| 13 | 704.974 | 160.5 | 0.935 | 704.911 | 147.7 | 0.848 | +12.8 |
| 14 | 705.732 | 143.6 | 0.906 | 705.646 | 160.1 | 0.816 | -16.5 |
| 15 | 706.621 | 144.0 | 0.891 | 706.483 | 128.6 | 0.804 | +15.4 |
| 16 | 707.655 | 118.9 | 0.883 | 707.486 | 118.0 | 0.797 | +0.9 |
| 17 | 708.625 | 101.1 | 0.879 | 708.447 | 98.3 | 0.795 | +2.8 |
| 18 | 709.562 | 98.1 | 0.877 | 709.374 | 94.5 | 0.795 | +3.6 |
| 19 | 710.530 | 98.5 | 0.879 | 710.320 | 94.6 | 0.798 | +3.9 |
| 20 | 711.517 | 100.7 | 0.882 | 711.285 | 96.6 | 0.803 | +4.1 |

Truth beats above 200 mmHg: head 5 (700.76–702.93 s, max 225.2), main 4 (701.27–702.92 s, max 215.3). Truth peak
gap +9.9 mmHg. Beats 4–10 (the overshoot, under continuing compressions) are +2.3 to +10.0 higher on head; beats
11–15 alternate (−16.5 to +15.4) because head's beats now fall 0.02–0.25 s later against the compression cycle; from
beat 16 (around the CPR stop) head is +0.9 to +4.1 higher, the residue BAND-NOTE.md traced to sysPlus60.

## 5. How the numeric (the band's quantity) becomes 210.8 vs 191.07

The ABP systolic numeric is the mean of the last ≤ 6 detected pulses (`numerics.ts` `pressureNumerics`); a detected
pulse is pushed when its NEXT foot is found (entry t = that foot). Detected pulses (end-foot t / sys / interval):

| head | main |
|---|---|
| 700.248 / 120.7 / 0.592 | 700.256 / 118.5 / 0.600 |
| 700.760 / 176.1 / 0.512 | 700.760 / 169.2 / 0.504 |
| 701.352 / 203.5 / 0.592 | 701.344 / 196.0 / 0.584 |
| 701.896 / 219.2 / 0.544 | 701.896 / 209.3 / 0.552 |
| 702.448 / 224.7 / 0.552 | 702.448 / 214.7 / 0.552 |
| 702.992 / 226.5 / 0.544 | 702.992 / 216.3 / 0.544 |
| 705.128 / 214.8 / 2.136 | 704.376 / 206.4 / 1.384 |
| 706.768 / 161.3 / 1.640 | 705.096 / 151.9 / 0.720 |
| 707.792 / 144.8 / 1.024 | 705.712 / 147.8 / 0.616 |
|  | 706.632 / 160.7 / 0.920 |
|  | 707.632 / 128.8 / 1.000 |

At 706 s:
- head: last six = 176.1, 203.5, 219.2, 224.7, 226.5, 214.8 → mean **210.8**;
- main: last six = 209.3, 214.7, 216.3, 206.4, 151.9, 147.8 → mean **191.07**.

The +19.7 splits into two parts:
- **+8.9, contractility.** The same six pulses by ordinal (the 2nd to 7th from 700 s) average 210.8 on head and 201.98
  on main (169.2, 196.0, 209.3, 214.7, 216.3, 206.4). Pulse for pulse head is +6.9 to +10.2 higher, matching the truth
  beats (+6.6 to +10.0) and kLv +11 to +14 %.
- **+10.9, detector timing.** After the 702.99 s foot, head's detector found the next foot only at 705.13 s (a 2.136 s
  interval, so at least one truth foot missed; truth beats there are 702.93, 703.56, 704.23, 704.97 s). It found the
  following one at 706.77 s, so at 706 s head's six-pulse window still holds only the peak pulses. Main's detector
  found feet at 704.38 (1.384 s, one missed), 705.10 and 705.71 s, so by 706 s two post-peak pulses (151.9, 147.8) had
  already entered and pulled the mean down. Both trees miss feet in this window (compressions over a beating heart);
  where they fall moves with the beat timing that the contractility change shifts by 0.06–0.25 s from beat 12 on.

## Overshoot or sustained

A brief overshoot. The numeric is above 200 for **2 s** on head (706, 707 s: 210.8, 208.3) and 0 s on main (max
191.1 at 706–707 s). On head it is back to 173.6 at 709 s, 123.0 at 713 s, and settles at 122–124 from 724 s (main
120–122). Truth beats above 200 last 2.2 s on head (5 beats) and 1.7 s on main (4 beats), all before the CPR stop.

## The paragraph

The one-line `stepCoronary` change moves a single state, the LV ischaemia index `hemo.circ.cor.kIsch`, and only in the
10 s window between ROSC (698 s) and the CPR stop (708 s), when compressions run over a heart that beats again. Before
ROSC every coronary number is bit-identical. On main the beating heart's supply was read at the beat's onset, an
instant that fell inside a compression (CPP −11.9 mmHg, supply:demand 0.03 at 700 s), so kIsch fell from 0.778 to
0.694 just as the circulation came back. With the PR the supply is the relaxation-phase CPP (64.7 mmHg, ratio 18.8),
so kIsch rises to 0.806 by 706 s against main's 0.719 (gap 0.087). kIsch multiplies LV elastance one for one: kLv
0.918 vs 0.827 at 706 s (+11 %), peak 1.134 vs 0.997 (+14 %). Epinephrine is not involved: none is given, and
endogenous epi, NE and their contractility factor (endoEesF 1.145) are equal in both trees. The stronger ventricle
ejects pulses +7 to +10 mmHg higher in the first post-ROSC beats, which are still under compressions (truth peak 225.2
vs 215.3). That is about +9 of the +19.7. The other +10.9 is the arterial detector's 6-pulse average: through the
703–706 s compression-over-beat window, head's detector found its next foot only at 706.77 s, so at 706 s its average
still holds only the six peak pulses, while main's detector had already let in two post-peak pulses of about 150. The
reading is a 2-second overshoot (above 200 at 706–707 s only; 123 by 713 s; settles 122–124), not a sustained level.
