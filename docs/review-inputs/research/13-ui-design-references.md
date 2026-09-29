# Design references for a dark clinical-simulator UI — research report (2026-09-28)

*Delivered by the UI benchmark study's standards/design-systems sweep after its parent report; filed by the orchestrator verbatim from the sweep's hand-back. Companion to `13-ui-benchmarks.md` and `13-ui-design-brief-draft.md`. Items marked secondary were not read from the primary standard (IEC 60601-1-8, HE75, IEC 62366-1 and ISA-101.01 are paywalled).*

## Source reliability
- **IEC 60601-1-8:** numbers from an interactive annotated copy (standards.har-el.com), the official iTeh preview of Amendment 2, a peer-reviewed paper reproducing the table (Damasceno et al., JBTH), and US patent 11797158.
- **HE75:** no public numbers found; MIL-STD-1472H (free) used instead.
- **ISA-101:** Hollifield's free High Performance HMI (HPHMI) article.

## 1. IEC 60601-1-8 (alarm systems): visual requirements
**Colours and flashing by priority** (Table 2; secondary):

| Priority | Colour | Flash frequency | Duty cycle |
|---|---|---|---|
| High | Red | 1.4–2.8 Hz | 20–60 % on |
| Medium | Yellow | 0.4–0.8 Hz | 20–60 % on |
| Low | Cyan or yellow | Steady | 100 % |

- Confirmed by Damasceno et al., JBTH (Table 1, NBR IEC 60601-1-8:2022): https://jbth.com.br/index.php/JBTH/article/download/322/259/
- The 20–60 % duty cycle appears only in US patent 11797158. Verify Table 2 against a licensed copy.

**Distance and viewing conditions** (6.3.2): at 4 m the operator must perceive an alarm and its priority; at 1 m the specific condition must be identifiable and legible; viewing cone 30°; test lighting 100–1,500 lx; with several alarms the indicator shows the highest priority and each condition is still shown individually; flashing text is discouraged (alternating normal/reverse video is acceptable). https://standards.har-el.com/Projects/181701/60601-1-8/html/6-3-2-Visual-Generation.htm

**Priority markers and colour blindness** (rationale 6.3.2.2): the triangle symbols 60417-5307/5308 were rejected as priority markers (indistinguishable at 4 m); red colouring/background plus extra symbols, letters or words allowed (e.g. 3/2/1 triangles); vendors use `***`/`**`/`*` or `!!!`/`!!`/`!`; cyan for low priority as a complementary colour; shape coding needed for colour-blind users.

**Symbols for inactivation states** (verified against glossaries and ISO OBP / Wikimedia):

| Number | Title | Use |
|---|---|---|
| IEC 60417-5307 | Alarm, general | triangle; multi-function alarm control |
| IEC 60417-5308 | Urgent alarm | |
| IEC 60417-5309 | Alarm system clear (reset) | |
| IEC 60417-5319 | Alarm inhibit | solid X = ALARM OFF; dashed X (5319-2) = ALARM PAUSED |
| IEC 60417-5576 | Bell cancel | bell with X = AUDIO OFF |
| IEC 60417-5576-2 | Bell, cancel temporary | dashed X = AUDIO PAUSED |
| IEC 60417-5436 | Loudspeaker-X | sound mute |

Rule: solid X = off until changed; dashed X = timed; show a countdown and the bell-X alongside. (Correction to the brief: 5319 is "alarm inhibit"/ALARM OFF, 5576 is "bell cancel"/AUDIO OFF.) Sources: har-el 6.8.5; Medela symbols glossary; Hillrom glossary; Wikimedia 5319.

**Amendment 2 (2020)** (iTeh preview, primary): new definitions ADVISORY and ALARM FATIGUE (3.38, 3.39), RESPONSIBILITY ACCEPTED/REJECTED/UNDEFINED, ESCALATION, REDIRECTION; 6.3.2.2.2 retitled "1 m visual ALARM SIGNALS and INFORMATION SIGNALS" with Note 5: visual information signals must not be confusable with alarm signals — **advisory messages ("lab result ready") must not use alarm colours or flashing**; auditory signals rewritten (Annex G sound set with IEC .WAV files); 6.11 distributed alarms (DIS/DAS); 6.8.1 during ALARM OFF/PAUSED processing may stop (then no logging); Table 5 ACKNOWLEDGED rows; no change to visual colours or rates. https://cdn.standards.iteh.ai/samples/72634/16a0c04b456f4f73a3a93287aaf46f69/IEC-60601-1-8-2006-Amd-2-2020.pdf

## 2. HE75, IEC 62366-1, FDA 2016
- ANSI/AAMI HE75:2025 (paywalled; first revision since 2009; adds accessibility §16). No public numbers.
- **MIL-STD-1472H numbers to use instead** (free): display characters ≥ 16 arcmin at the longest viewing distance; labels 15 arcmin minimum (height = distance × 0.004), 20 arcmin preferred (× 0.006); Table XVIII minimum character height 0.5–1 m 4.7 mm, 1–2 m 9.4 mm, 2–4 m 18 mm, 4–9 m 38 mm (so priority text at 4 m ≈ 18 mm+); colour ≤ 11 nameable categories, never the only code, warm = action, cool = background, colour-identified symbols ≥ 20 arcmin; flash coding only for critical events, ≤ 2 rates ≥ 2 Hz apart, fastest ≤ 5 Hz, duty ≥ 50 % on, synchronise same-rate items, never flash text that must be read (flash a marker/background), provide acknowledge/suppress, small flashing area; brightness coding ≤ 2 levels at ≥ 2:1, reverse video reserved for alerting; touch targets 15 × 15 mm min, 38 mm max, keypads 16 × 16 mm with 2 mm gaps, +5 mm for gloves; a touchscreen should not be the only input for a critical task, require confirmation. https://cvgstrategy.com/wp-content/uploads/2023/04/MIL-STD-1472G.pdf
- IEC 62366-1 / FDA guidance (3 Feb 2016): use-related risk analysis, formative testing, summative validation. Not a regulatory requirement for a simulator; valuable as method (write instructor/trainee use scenarios; formative-test the alarm and ventilator panels).

## 3. Colour-vision deficiency and WCAG 2.2
- ~1 in 12 men. Webb & Blaise, BJA Open 2026;17:100536: high-contrast pairs (black/white/blue/yellow), a mandatory second indicator besides colour, check with a CVD simulator. https://pmc.ncbi.nlm.nih.gov/articles/PMC12927273/
- Conventional parameter colours (ECG green, SpO2 cyan/yellow, ABP red, CO2 yellow/white) are vendor convention, not IEC 60601-1-8.
- Conflicts: a red ABP trace vs high-priority alarm red (keep the trace in its lane; alarm state never by hue alone); for deuteranopes green ECG next to red/amber alarms merges — priority in text and marker too.
- WCAG 2.2: 1.4.3 text 4.5:1 (3:1 large); 1.4.11 3:1 component boundaries; 1.4.1 not colour alone; 2.5.8 targets ≥ 24 × 24 CSS px (2.5.5 AAA 44 × 44); 2.4.7 focus visible; 2.4.11 focus not obscured; 2.3.1 three flashes (keep flashing areas small).
- Contrast against Carbon g100 #161616: Astro critical #FF3838 5.06; Carbon red-50 #FA4D56 5.40; pure #FF0000 4.53; Astro caution #FCE83A 14.4; Astro standby #2DCCFF 9.65; Carbon border gray-70 #525252 2.32 (**fails** 3:1 if meaningful). **White text on #FF3838 is 3.57:1 and fails** — use black text on bright red (5.87) or white on #DA1E28 (5.0).
- APCA was removed from the WCAG 3 draft (July 2023); keep WCAG 2 as the rule.

## 4. Dark design systems and fonts: licences (verified 2026-09-28)

| System | Licence | MIT-compatible | Notes |
|---|---|---|---|
| IBM Carbon `@carbon/themes` | Apache-2.0 | yes | g100: bg #161616; layers #262626/#393939/#525252; text #F4F4F4/#C6C6C6; error #FA4D56, success #42BE65, warning #F1C21B, interactive #4589FF; focus #FFFFFF |
| Material `material-color-utilities` | Apache-2.0 | yes | dark surface #121212, desaturated accents |
| Radix Colors | MIT | yes | 12-step dark scales with semantic steps |
| Open Props | MIT | yes | |
| Tailwind palette | MIT | yes | |
| GitHub Primer primitives | MIT | yes | dark colour-blind and tritanopia themes |
| Atlassian `@atlaskit/tokens` | Apache-2.0 on npm | caution | styles/assets under the Atlassian Design Guidelines licence |
| Grafana core | AGPL-3.0 | **no** | `grafana-ui`/`grafana-data` Apache-2.0; ideas only |
| Astro UXDS | custom | caution | package says MIT, repo LICENSE is custom with an indemnification clause; copying hex values is safest; code needs a NOTICES row and legal review |
| NASA Open MCT | Apache-2.0 | yes | telemetry plots and limit styling |

Astro status system (dark hex): Critical #FF3838, Serious #FFB302, Caution #FCE83A, Normal #56F000, Standby #2DCCFF, Off #A4ABB6; every state has a shape; red reserved for urgent; roll-up = highest wins.

| Font | Licence | Notes |
|---|---|---|
| Inter | OFL-1.1 | `tabular-nums` |
| IBM Plex Sans / Mono | OFL-1.1 | |
| JetBrains Mono | OFL-1.1 | |
| Roboto Mono | OFL-1.1 (not Apache) | |
| B612 / B612 Mono | EPL-2.0 / EDL-1.0 / OFL-1.1 | Airbus/ENAC cockpit font, "maximize the distance between the forms of the characters"; strong candidate for numeric tiles |

Project rule check: DESIGN-BRIEF §8 "May borrow" lists MIT and Apache-2.0 only — **OFL is not listed**; NOTICES.md requires a row per bundled item; bundling an OFL font needs Ali's ruling, a NOTICES row and the OFL text in `LICENSES/` (OFL: text travels with the font; bundling allowed; selling the font alone not; Reserved Font Name only if modified). Alternative: a system font stack.

## 5. Native platform features (MDN BCD 8.1.3)
`<dialog>`/`showModal()` iOS 15.4; `inert` 15.5; `:focus-visible` 15.4; container queries 16; `prefers-contrast` 14.5; `prefers-reduced-motion` 10.3; `oklch()` 15.4; `tabular-nums` 9.3; `popover` 18.3 (desktop Safari 17); invoker commands 26.2 (too new); anchor positioning 26 (partial). Recommendation: floor iPadOS 16.4+; `<dialog>` for modals; `popover` only with a fallback.

## 6. Performance: Canvas2D alongside DOM tiles
Batch reads then writes once per rAF; tiles update `textContent` in fixed-size boxes with tabular numerals; `contain: strict` on tiles and lanes (Safari 15.4+); `content-visibility: auto` for off-screen console panels (Safari 18+); `will-change` sparingly; separate canvases for static grid and live sweep; `getContext('2d', {alpha: false})`; scale by `devicePixelRatio`; integer coordinates, one polyline per `stroke()`; redraw only the erase-bar region; avoid `shadowBlur` and per-frame text; OffscreenCanvas 2D in a worker since Safari 16.4; iOS Low Power Mode caps rAF at ~30 fps; cross-origin iframes throttled until interaction; **advance sweep position and flash phases from `performance.now()` deltas, not frame count.**

## 7. Cockpit and control-room principles
Airbus "dark cockpit"/"lights out": dark annunciator = normal; Boeing "quiet and dark" uses white to confirm normal. ISA-101/HPHMI (Hollifield): alarm colours never for non-alarm purposes; no red/green on-off; alarms redundantly coded (shape + colour + text); grey background and muted colours; analog indicators with the normal range drawn in; four display levels (overview, unit, detail, diagnostic). A dark monitor theme is consistent with HPHMI as long as colour stays reserved for abnormal states.

## 12 design rules derived from these references
1. **Reserve alarm colours.** Red, yellow, cyan only for alarms of that priority; traces, buttons and branding never use alarm red; shift the ABP trace to a distinct red-magenta.
2. **Flash at the standard rates on a time base.** High: red 2 Hz, 50 %; medium: yellow 0.6 Hz, 50 %; low: cyan steady; phase from `performance.now()`.
3. **Never flash text.** Flash the banner background or marker, or alternate reverse video; small area; synchronise same-priority flashing.
4. **Code priority three ways:** colour, marker (`!!!`/`!!`/`!` or 3/2/1 triangles), and the word.
5. **Pass the 4 m / 1 m test:** priority readable at 4 m (≥ 18 mm), message legible at 1 m (≥ 16–20 arcmin ≈ 4.7–5.8 mm).
6. **Use the IEC inactivation symbols:** solid X OFF, dashed X PAUSED (5319/5319-2 alarms, 5576/5576-2 audio) with a countdown.
7. **Keep advisories out of alarm styling** (Amd 2 Note 5).
8. **Dark and quiet when normal:** neutral surfaces (#161616/#262626/#393939), no decorative colour, normal ranges as muted bands; colour only on deviation.
9. **Meet WCAG 2.2 contrast:** text 4.5:1, edges 3:1; black text on bright-red banners.
10. **Size targets for a tablet in a clinic:** ≥ 24 × 24 CSS px everywhere, ≥ 44 px on iPad; critical controls (silence, pause, vent mode) ≥ 15 mm with 3–5 mm gaps, confirmation, not touch-only.
11. **Stable numerics:** tabular numerals in fixed-size `contain: strict` tiles, batched writes once per rAF; B612 Mono / Inter `tnum` / Plex Mono subject to the OFL ruling.
12. **No UI library dependencies:** `<dialog>`, `inert`, `:focus-visible`, container queries, `prefers-reduced-motion`, `prefers-contrast`; `popover` only with a fallback; borrow ideas from Astro/Grafana, not code.
