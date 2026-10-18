# Authoring skins

Skins are **data**: JSON documents validated by JSON Schemas in `@pme/skins`, resolved into what the renderer and the
audio need (`resolveSkin(id, { theme })`). A skin never contains code, logos or vendor trade dress (brief §3.8, R13).

## Kinds

| Kind | Schema | What it is | Where |
|---|---|---|---|
| base | `pme-skin/1` | IEC-style defaults every vendor skin inherits | `packages/skins/src/data/base/` |
| skin | `pme-skin/1` | a monitor look and behaviour (`saadat-like`, `philips-like`, …) | `src/data/skins/` |
| preset | `pme-preset/1` | overrides on one skin (a ward's "as found" setup) | `src/data/presets/` |
| theme | `pme-theme/1` | a colour scheme applied last (`projector-light`, `ecg-grid`) | `src/data/themes/` |

Resolution order: base ← skin ← preset overrides ← theme; objects merge, arrays replace. What each resolved field
drives in the renderer and the audio is the contract in `packages/skins/CONTRACT.md`.

## Provenance is required

Every leaf value carries a provenance entry `{ "tag", "source", "note"? }` — `tag` is one of `documented`,
`measured`, `assumed`, `unverified`, `conflict`, `inferred`, `eng` —, keyed by its path (or a covering parent path). `documented` values cite a manual page or a photo
checklist item; `eng` values are engineering choices and say why. A missing provenance fails the tests. A limit or
table a manual does not publish stays `null` — never invent it; the UI marks inherited limits as approximate.

## The quickest path: a preset

<!-- example: pme-preset/1 -->
```json
{
  "schema": "pme-preset/1",
  "kind": "preset",
  "id": "or-teaching",
  "label": "Philips-like, OR teaching layout",
  "base": "philips-like",
  "overrides": {
    "layout": { "lanes": ["ECG1", "ART", "PLETH", "CO2"] }
  },
  "provenance": {
    "overrides.layout.lanes": { "tag": "eng", "source": "ENG", "note": "teaching layout: ECG, arterial line, pleth, capnogram" }
  }
}
```

Check a document with `validate('preset', doc)` from `@pme/skins/validate` (also `'skin'`, `'skinSource'`,
`'theme'`); it returns `{ ok, errors }`.

## Adding a skin, preset or theme to the library (1.0.0-rc.1)

In this release skins are resolved from the built-in registry; there is no runtime registration API (not planned for 1.x; see `docs/roadmap/`). To
add one:

1. Put the JSON under the matching `packages/skins/src/data/` folder, with provenance for every value.
2. Import and list it in `packages/skins/src/registry.ts` (`SKINS`, `PRESETS` or `THEMES`).
3. Run `pnpm --filter @pme/skins test`: schema validity, provenance coverage, colour contrast on the background and
   the snapshot tests. Update a snapshot only for your new id.
4. Mount it: `mountMonitor(el, { skin: 'or-teaching' })`, and look at it in `apps/demo/stage4a-skins.html`.
5. If the skin reproduces a real device's behaviour (alarm tones, NIBP cycle, limits), cite the manual pages in
   provenance and add a row to `NOTICES.md` for any table you transcribed.

## Colours and contrast

Waveform and numeric colours are checked against the skin's background for contrast; the `projector-light` theme
darkens colours to a minimum contrast of 4.5:1. Keep the conventional colour language (ECG green, arterial red, SpO2
cyan, CO2 yellow) unless the device you model documents otherwise.
