### Fixed

- On a browser whose monitor worker has no animation-frame clock of its own (the `worker-pump` path: the page posts
  the frames), an instructor's command no longer waits seconds, and longer as the case runs, before the monitor applies
  it. The page posted a frame at every display refresh whether or not the worker had drawn the last one, so where one
  frame took longer than a refresh the worker's queue grew without bound and every command waited behind it. The
  page now keeps one frame in flight and posts the next once the worker says it drew the last, as the worker's own
  clock does. With frames forced to cost 25 ms, a command was answered within 26 ms throughout 40 s instead of not at all.
