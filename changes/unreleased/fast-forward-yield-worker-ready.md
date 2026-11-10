### Fixed

- **A fast-forward no longer freezes the page when the monitor runs on the page's main thread (brief 126, defect N47).**
  On a busy computer the engine falls behind the fast-forward's pace, and the main-thread path then ran the whole span
  without once giving the page its turn: nothing was drawn, no click answered and the fast-forward panel never showed
  until the span ended (measured at background QoS: one 11–13 s task, the page's frames 11–13 s apart). The main thread
  now gives the page a turn whenever the engine has worked as long as the page's last turn took (50–250 ms, the rule the
  main thread's clock already keeps per frame), and the span's first slice waits for the panel to be drawn: measured
  the same way, the panel shows 0.5–0.8 s after the click, frames come at most 0.2–0.45 s apart and the span takes
  16–28 s (it ran 11–13 s frozen; the worker path is unchanged). The span is the same span: the same ticks, events and
  final state, bit for bit, as before and as on the worker. A command sent during a step lands when the step has
  ended, as on the worker.
- **The monitor no longer drops its worker in silence when the worker is slow to start (brief 126, defect N48).** A
  worker not ready after 2 s used to be abandoned for the main thread for good, without a word (on a loaded dev server,
  4 of 5 page loads). The monitor now waits for a worker that is still loading, and says so: a toast, and session-log
  lines when it was late and when it started. A worker that fails before it is ready still leaves the engine on the
  main thread, and that is said too (a toast and a session-log line naming the reason).
