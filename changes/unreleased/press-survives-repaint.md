### Fixed

- **A press held across a repaint is no longer lost.** A browser sends a click only when the press and the release
  land on the same node, and several pages replaced or re-inserted the node under the pointer when they repainted: in
  Safari and on every iPad or iPhone a press over changing words (the Hamilton-style face's alarm banner, Silence; the
  instructor's step rows while a countdown ticks; the Drug sheet's tags; the header's clock; the phone's "Hold the
  timer"), and in every browser a press on a control that was rebuilt (Room setup's openers every second, the header's
  Sound switch and Room link, the phone's mode badge, every pump button when the rack changed, a step row moving
  between the list and "Not due now", a preparation's or a pump mismatch's Show button when another card changed). The
  app now repaints in one shared way that writes text into the existing text node and keeps the nodes of a list in
  place (`apps/demo/src/app/keep.ts`); every one of these surfaces uses it, nothing they show changed. The live regions
  (the EDP-TS alarm box and its two status lines, the builder's run line, the preparation and mismatch cards' shown
  lines) are written only when their words change, so a screen reader does not hear them again. The e2e fixture
  records every plain press whose pressed node was taken out before its release, or whose release landed elsewhere,
  in the test's annotations and in CI's summary.
