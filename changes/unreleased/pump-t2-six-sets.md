### Changed

- **Engine: the six TCI model sets are registered from their papers, Marsh in two variants, and sufentanil's PK follows
  Gepts 1995's estimated parameters (pump-rack plan, T2).** Two readers read each set against its paper in the
  workspace library, mostly from page photographs, and agreed digit for digit.
  - **Registered:** seven sets, each a module in `tci-sets/`:
    - propofol: Eleveld, Schnider, Marsh and modified Marsh;
    - remifentanil: Minto;
    - fentanyl: Shafer;
    - sufentanil: Gepts.

    Each module carries its paper, table, page, population, ke0 source, worked values and both readers.
  - **The engine reads them:** its patient models and the TCI command's accepted ids now come from the registry.
  - **A new ke0 kind, `device`** (the owner's ruling TQ2): for a value a named device ran whose derivation a
    peer-reviewed paper reports as unpublished. Marsh's 0.26 /min, the Diprifusor's, is labelled "device value;
    derivation unpublished" (Absalom 2009, p. 30). Modified Marsh carries Struys 2000's 1.21 /min.
  - **Values:**
    - Bit-identical to before: Eleveld, Schnider, Minto, Shafer and both Marsh sets.
    - **Gepts changed:** the engine used the paper's rounded derived microconstants. These gave V3 251.9 L and Vss
      330 L, against the 261.6 L and 339 L the paper estimates (Table 3, p. 1201). It now uses the estimated volumes
      and clearances. Its ke0, refitted to Shafer & Varvel's 5.6 min time to peak, stays 0.176 /min.
  - **The papers' own inconsistencies, recorded without changing anything:**
    - Eleveld's corrigendum puts the reference Q2 at 1.83 L/min, as the engine computes.
    - Schnider 1999 prints 0.456 and 0.459. The owner ruled for 0.456 (TQ1).
    - Marsh's k12 0.112 differs from Gepts 1987's mean 0.1140.
    - Absalom's Table 1 prints a 4.5 min time to peak beside ke0 0.26.

  Details: `docs/guides/tci-sets.md`, "The T2 reading".
