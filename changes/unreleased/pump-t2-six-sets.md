### Changed

- **Engine: five TCI model sets registered from their papers; sufentanil's PK follows Gepts 1995's estimated
  parameters (pump-rack plan, T2).** Two readers read each set against its paper in the workspace library, mostly from
  page photographs, and agreed digit for digit.
  - **Registered:** Eleveld and Schnider for propofol, Minto for remifentanil, Shafer for fentanyl and Gepts for
    sufentanil. Each is a module in `tci-sets/` with its paper, table, page, population, ke0 source, worked values and
    both readers.
  - **The engine reads them:** its patient models and the TCI command's accepted ids now come from the registry, and
    `models.ts` keeps only Marsh and the time-to-peak tools.
  - **Values:** four sets are bit-identical to before. **Gepts changed:** the engine used the paper's rounded derived
    microconstants. These gave V3 251.9 L and Vss 330 L, against the 261.6 L and 339 L the paper estimates (Table 3,
    p. 1201). It now uses the estimated volumes and clearances. Its ke0, refitted to Shafer & Varvel's 5.6 min time to
    peak, stays 0.176 /min.
  - **Marsh stays pending:** Table I confirms its PK, but its ke0 of 0.26 /min has no source.
  - **Paper discrepancies recorded:**
    - Eleveld's corrigendum puts the reference Q2 at 1.83 L/min, as the engine computes.
    - Schnider 1999 prints its ke0 as both 0.456 and 0.459.

  Details: `docs/guides/tci-sets.md`, "The T2 reading".
