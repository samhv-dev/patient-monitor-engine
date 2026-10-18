# Persian Debrief handout (گزارش دبریفینگ به فارسی)

A **handout script, not an app feature.** `scripts/showcase/debrief-fa.mjs` reads the JSON that the Debrief view saves
("Download the record (JSON)", schema `pme-debrief/1`, Stage 13 ruling Q3: the same data as the printed report) and
prints a right-to-left A4 PDF in Persian. The app, its tests, scenarios and bands are untouched; an in-app translation
is the v1.1 roadmap item. The English report stays the reference.

## How to run

1. In the simulator, open **Debrief** (session bar) after a case and press **Download the record (JSON)**.
2. From the repository root (Node ≥ 22, dependencies installed with `npx -y pnpm@9.15.9 install`; Playwright's
   Chromium, the browser the Stage 13 print checks use):

   ```sh
   node scripts/showcase/debrief-fa.mjs debrief-showcase-mh-2026-10-17.json --version 1.0.0-rc.1 --fonts ~/Downloads/vazirmatn/fonts/ttf
   ```

   `--version` is required: the JSON (`pme-debrief/1`) carries the build but not the version, so give the version that
   build printed on its Start screen and in the English Debrief footer (the release kit 3db25a3b: `1.0.0-rc.1`; kits
   built before the release, such as 62e521c3, printed no version and their packages said `0.0.0`). Without it the
   script stops with an error before printing anything. If a later export adds a `version` field, that field wins.

   The PDF is written beside the JSON as `<name>.fa.pdf` (`--out-dir DIR` to put it elsewhere). Several JSON files may
   be given at once. `--html` also writes the HTML; `--text` writes the printed Persian strings one per line (for the
   spelling pass below).
3. **Font.** Vazirmatn (SIL Open Font License, free to embed) is not in the repository. Download it from
   <https://github.com/rastikerdar/vazirmatn/releases> (or Google Fonts) and pass the folder holding
   `Vazirmatn-Regular.ttf` and `Vazirmatn-Bold.ttf` (or the variable `Vazirmatn[wght].ttf`) with `--fonts`, or set
   `PME_FA_FONTS`; the script also looks in `~/Library/Fonts`, `~/.fonts`, `/Library/Fonts` and
   `/usr/share/fonts/truetype/vazirmatn`. The font is embedded in the PDF, so the reader needs nothing installed.

At the end of each file the script prints the page count, the number of table entries it used (and how many are still
unreviewed), and **"N strings without translation"** with the list. An untranslated string is printed in English
(italic) in its place, never dropped.

## What is translated

Everything the English Debrief prints, in its order: the title, the case lines (scenario, patient, start time,
duration) and the "Run by" line; the objectives with their verdict words and the reason line; the measured facts with
the labs row (one lab per line); the six trend charts (captions; the time axis runs left to right as on the monitor);
drugs and fluids with the bolus totals; the timeline with the undone course struck through and marked «لغوشده با
بازگشت n»; bookmarks; an empty notes box; the one-row-per-minute appendix; the footer (the release wording of the
English footer, "Not a medical device and not clinically validated", then the version, «(پیش‌انتشار)» for a
pre-release, and the build) and «صفحه‌ی n از N» on every page.

| English | Persian | Status |
|---|---|---|
| For education only. Not a medical device and not clinically validated: never use it for patient care. Version {code} (pre-release), build {code}. | فقط برای آموزش. این نرم‌افزار وسیله‌ی پزشکی نیست و از نظر بالینی اعتبارسنجی نشده است؛ نباید هرگز در مراقبت از بیمار به کار رود. نسخه‌ی {code} (پیش‌انتشار)، ساخت {code}. | added 2026-10-18 (footer) |
| … Version {code}, build {code}. (a release without a suffix) | … نسخه‌ی {code}، ساخت {code}. | added 2026-10-18 (footer) |
| not clinically validated | از نظر بالینی اعتبارسنجی نشده است | added 2026-10-18 (footer) |
| pre-release | پیش‌انتشار | added 2026-10-18 (footer) |
| Version / build | نسخه / ساخت | added 2026-10-18 (footer) |

The two footer templates replace the pre-release one ("Not a medical device: never use it for patient care. Build
{code}.", «… نسخه‌ی ساخت {code}.»), which the app no longer prints. The reused wording («فقط برای آموزش»، «وسیله‌ی
پزشکی نیست»، «نباید هرگز در مراقبت از بیمار به کار رود») is the earlier entry's. The version and the build id are each
one left-to-right run (LRI…PDI) held to the word before them by a no-break space, so a wrapped footer never splits
«ساخت» from its id.

`fa-debrief.json` is the translation table. Every entry carries `en`, `fa`, `source` (the app file the English comes
from) and `reviewed: false`. It has three parts:

- **groups**: vocabularies a sentence may name: drug names (all 65 of the glossary's `DRUG_NAMES`, with the drug id),
  conditions, lung conditions, rhythms, alarm words, sensors, monitor labels, and the **titles, state labels and
  objective texts of the three showcase-2 cases** (bronchospasm, tamponade, malignant hyperthermia; plus the E22 MH
  objective text and the `heldThen` reason lines, written against branch `fix-e22-mh-rule` and on main since PR #69:
  kit round Q1 printed the release build's MH report with 0 strings left in English);
- **strings**: exact strings (section titles, verdict words, fixed timeline lines);
- **templates**: the sentences the app builds (`describe.ts` event lines, `debrief.ts` reasons and facts,
  `alarms.ts` "label high/low") with placeholders: `{t}` mm:ss, `{span}` a duration, `{n}` a number, `{u}` a unit,
  `{v}` a value with its unit, `{c}` a count, `{code}` a Latin code, and a group name (`{drug}`, `{state}`, `{ev}` an
  event phrase, `{limit}` "above/below a value") whose words come from that group.

**Not translated (falls back to English and is listed):** objective and state texts of the other scenarios in the
library, instructor notes typed during the run, bookmark labels the instructor typed, an alarm the app itself shows
in the monitor's own words (`alarmLine` "known: false"), and patient comorbidities. Monitor abbreviations stay in Latin
as the Persian clinical community writes them (HR, SpO₂, EtCO₂, ART S, NIBP M, CVP, FiO₂, PEEP, PEA, ROSC); drug names
are written in Persian script (اپی‌نفرین، دانترولن، سالبوتامول), the usual form in Persian clinical prose.

## Register and numerals (the choices to review)

**Reviewed 2026-10-18:** the owner accepted the register as written.

- **Register:** formal academic/clinical Persian (رسمی‌علمی، نگارش علمی): full written verb forms («است»، «شد»), no
  «می‌باشد», objectives as verbal nouns («تشخیص…»، «شروع احیای قلبی‌ریوی…»), «احیای قلبی‌ریوی» rather than "CPR" in
  prose, Persian punctuation (، ؛ «») and نیم‌فاصله throughout; no em dashes.
- **Digits:** Persian digits for prose (counts such as «۳ نوبت», «بازگشت ۱», item numbers, page numbers and the start
  date); **Western digits for clinical values**: vital signs, doses, times on the session clock and durations
  (`95 %`, `250 µg`, `07:48`, `2 دقیقه و 04 ثانیه`), with their units unchanged (mmHg, mL, mg/kg, L/min, cmH₂O). Each
  run of value and unit is kept whole and left to right inside the Persian line and never broken across lines.
  Durations use Persian unit words (ثانیه، دقیقه) with Western digits.
- **Start time** is given in both calendars: Solar Hijri with weekday and clock time, then the Gregorian date
  («شنبه ۲۵ مهر ۱۴۰۵، ساعت ۲۳:۴۹ (۱۷ اکتبر ۲۰۲۶ میلادی)»), in the time zone of the computer that prints.
- Clock spans are written «از 07:51 تا 09:21» (Vazirmatn has no arrow glyph, and «تا» reads naturally in Persian).

## Review status

**Every one of the 495 entries is `reviewed: false`: an unreviewed machine translation until the project's clinical owner reads it.**
While any entry printed in a PDF is unreviewed, the first page carries the line «ترجمه‌ی فارسی این گزارش هنوز به
تأیید بالینی نرسیده است. متن مرجع، گزارش انگلیسی همین اجراست.»; it disappears by itself when every entry used is set
to `reviewed: true`. To correct a term, edit its `fa` (keep the placeholders) and set `reviewed: true`; a `note` field
marks the few entries with a question for the reviewer.

**Owner review, 2026-10-18:** the owner accepted all 12 terms put to him (the owner sheet of 18 October, part 4) and
the register as written. This note does not change the `reviewed` flags in `fa-debrief.json`: the sentence above stays
true of the table until those flags are set.

## The Persian-writing pass (skill `persian-writing` 1.4.0)

The table and the printed text were checked with the skill's bundled toolkit before the PDFs were made; every count,
suggestion and decision is in `docs/showcase/kit-round-a/fa/skill-pass.json`. Result on the committed table: the
editorial steps changed **0 of 443** Persian entries and **0 of 176** printed strings (the table was written to these
rules); the spell-checker made **31** distinct suggestions, **1 accepted** («هدف‌مند» → «هدفمند»), 30 rejected
(several would have changed the clinical meaning, e.g. «هیپرونتیلاسیون» → «هیپوونتیلاسیون», «بدترشدن» → «بهترشدن»);
`fa_lint` found no register or AI tell, and its bidi-start count in the table fell from 31 to 15 after 16 alarm words
and reason templates were rewritten to open with a Persian word (the 15 left open with a placeholder or a monitor
label, which the PDF isolates); its latin-digits notes are the deliberate clinical-value rule. The steps:

- register detected and held: formal academic/clinical;
- `persian_cleanup.py` editorial steps (paknevis/davat: Arabic ي/ك, Persian punctuation and «گیومه», نیم‌فاصله for
  verbs, suffixes, possessives and compound verbs, punctuation spacing, ellipsis, repeated marks, extra spaces) run
  over every Persian entry and every printed string, with Latin runs, Western-digit values and `{placeholders}`
  protected. Two steps were deliberately left out: digit conversion (it would turn clinical values into Persian
  digits, against the numeral rule above) and `fix_ezafe` (it rewrites «لوله‌ی» as «لولهٔ»; this table keeps the ‌ی
  form consistently);
- its spell-checker run as a report (its nearest-dictionary-word replacement is unsafe for transliterated drug names
  and clinical terms); each suggestion was read and accepted or rejected by hand;
- `fa_lint.py --check` (bureaucratic and AI tells, em dashes, attached «میشود», هکسره, bidi) on the table and the text;
- `verify_pdf.py --expect-font Vazirmatn` on each PDF, and `pdffonts`: Vazirmatn only, no fallback font.

## Evidence

`docs/showcase/kit-round-a/fa/`: the three Debrief JSON exports (`debrief-*.json`), each with the kit-round record of
the run that produced it (`*-kit-round-chromium.{json,md}`), the English PDF of the tamponade run for comparison, the
diff of the uncommitted capture copy of the kit-round script (`capture-kitround.diff`: it only adds the JSON download
to the kit round's Debrief read), the rendered Persian PDFs and page images, and `skill-pass.json`.
