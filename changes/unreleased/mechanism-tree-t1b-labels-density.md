### Changed

- **Explore: the mechanism tree reads clinically and opens uncrowded (brief 104, plan piece T1b).** Every node now
  carries a clinical label and its unit ("Propofol effect-site concentration, µg/mL", "Drug effect on SVR") instead of
  its engine key, which stays in the tooltip; 151 labels, 31 of them the clinical glossary's own, all marked as under
  the clinical owner's review on the page and in `docs/plans/mechanism-tree-labels.md`. The page opens on the trigger
  and 4 generations past it (6 to 13 nodes) instead of the whole tree (74 to 93 nodes): "+n" on a node draws one
  generation more, a node with more than six effects folds the rest into "n more", the monitor's values fold into one
  box, "Path to" keeps only the routes to one monitor value, and "Whole tree" draws everything as before. Each
  trigger's opening view fits one 1440 × 900 screen and prints on one A4 page.
