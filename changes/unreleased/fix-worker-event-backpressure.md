### Fixed

- A page slower than its monitor's engine worker no longer falls seconds behind it, and an instructor's command is no
  longer answered seconds late on such a page. The worker posted a batch of events at every frame whether or not the
  page had read the last one, so a slow page queued them without bound and a command's answer, on the same channel,
  waited behind the queue (on WebKit in CI at 1990 px wide: batches 3.4 s late at a press, 9.2 s at worst). The worker
  now keeps one batch in flight: it merges what it generates until the page has read the last batch, and sends the
  merged events before any answer. No event is dropped or reordered; a page that keeps up sees the same events as
  before.
