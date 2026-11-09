# Learners' phones: the run sheet (Stage 12)

*For the presenter and the helper. The phones are LIVE followers of the instructor's case: they show the same
patient, clock and numbers as the main screen, over the venue network. The second screen in the same browser
("Open on a second screen") is unchanged and is the fallback whenever the phones cannot join.*

## Pre-flight checklist (the owner; do it the day before)

Open questions for the owner (Q5): **which network on the day** (venue Wi-Fi, a travel router or this Mac's hotspot)
and **the presenting Mac's Node.js**. Until they are settled, tick every line:

- [ ] **Node.js 22 or later on the presenting Mac.** In Terminal: `node -v` prints `v22…` or later. If it prints an
  older version or "command not found", install the **LTS** from **nodejs.org** (the macOS installer), then check
  again. (The kit's own `runtime/` is empty when it was built with Homebrew's Node; "Start Classroom" says which Node it
  found and stops with this same instruction if it is too old.)
- [ ] **Start Classroom runs**: double-click it; its window says "THE CLASSROOM IS RUNNING" and lists "learners'
  phones reach it at: http://…". Click **Allow** if macOS asks about incoming connections for "node".
- [ ] **The relay carries frames, not only pages**: the pre-flight relay test sends a real frame (`check-relay.mjs`
  when the kit is built, `KIT-GATE.md`; here, 10 s after the simulator opens the black window still says "THE
  CLASSROOM IS RUNNING": a kit built before the KR-A1 fix stopped at that moment).
- [ ] **The hotspot path works** (the fallback network you carry): turn on the Mac's hotspot (System Settings >
  General > Sharing > Internet Sharing, to Wi-Fi), join it with **your own phone**, open Home → **Start here**
  (the **Room**), scan: your phone shows the monitor within a few seconds and the count says "1 phone following". Note
  how many phones you could test with.
- [ ] **The venue network works**, if you can reach it: the same scan on the venue Wi-Fi. "This phone cannot reach the
  instructor's laptop" means the Wi-Fi keeps devices apart: plan on the hotspot or a travel router.
- [ ] **The QR code points at this laptop**, never at the hosted site: the code shows `http://<this Mac's address>:…`.
  The hosted (https) copy cannot reach the laptop; a phone that opens it only waits ("Waiting for the instructor…").
- [ ] **A Windows PC as the backup** (optional): `Start Classroom.cmd` in the kit, untested on Windows at rc.3; tick the
  10-line checklist in the kit's `READ ME FIRST.txt` (section WINDOWS) on the room's PC before the day.
  A kit built with `node scripts/showcase/make-bundle.mjs <out> --win-node node-v22.x.y-win-x64.zip` (the official
  zip from nodejs.org, downloaded beforehand with its `SHASUMS256.txt` beside it, or named by `--win-node-sums`)
  carries `runtime\node.exe` and needs **no Node.js install** on the PC: both `.cmd` launchers use it before an installed one. The
  bundler refuses a zip whose SHA-256 is not the one `SHASUMS256.txt` lists, takes only `node.exe` and its `LICENSE`
  (as `runtime\NODE-LICENSE.txt`), and writes the version and both checksums to `runtime\NODE-VERSION.txt` and a
  line to `VERSION.txt`. It does not check the signature of `SHASUMS256.txt` itself: fetch both files from
  `https://nodejs.org/dist/` yourself. If Windows says "Windows protected your PC" (SmartScreen): **More info** →
  **Run anyway**; `node.exe` is the official build, its checksum in `NODE-VERSION.txt`. A kit built without the option
  still works on a PC with Node.js 22 or later installed (the launchers then find it on PATH or in Program Files).

## What the room sees

- A learner scans the QR code on the projector. The phone opens **the monitor alone**, upright: the waveforms over the
  full width, the numbers in a grid under them, the alarm bar at the top, and under it a line such as
  "Following session QFBAWA", **Sound off** and **Silence here**. Nothing on the phone can change the case.
- The phones wear **your monitor style** (Saadat-style, Philips-style, …) upright, and follow when you change it.
- Phones start **silent**. A learner who wants the alarm sound taps **Sound off** (it turns to **Sound on**);
  **Silence here** quiets that phone only.
- Speed (×1–×8), Pause and the 2- and 5-minute **fast-forward** reach every phone (the fast-forward panel shows on the
  phones too, and the phones catch up at its end).
- While the **Ventilator view** is on the main screen, the phones cannot follow the patient (the cockpit's breaths do
  not go over the network): they hold still and say "The ventilator is on the main screen". When you leave the
  Ventilator view the phones follow again at once (under a second), and the patient is handed to the engine's own
  ventilator at the cockpit's settings, so the phones follow it with no repeated fresh starts. Going back to the
  Ventilator view restarts the cockpit at the engine's current settings and holds the phones again until you leave
  it.
- **The ventilator on its own screen.** On the Room page, the Ventilator card's **New window** opens the cockpit in a
  window of its own on the laptop (drag it to a second screen); the main window keeps the instructor's pages. On a
  tablet: scan the room's QR code, choose **Ventilator** → **Show here**, and enter the PIN from the Room page's
  **Instructor's phone** card (press and hold to see it there); the cockpit then fills the tablet's screen. Either way,
  only one cockpit drives the patient at a time (opening one hands the other over first), the phones hold while it
  drives, and the Room page's table says "Ventilator · driving" or "handed over". Closing the window, hiding the
  tablet's page or a tablet that goes silent for 1 s (Wi-Fi lost) hands the patient to the engine's own ventilator at
  the cockpit's last settings, and the phones follow again; the tablet signs in again by itself when its network comes
  back and takes over from the engine's settings at that moment. The PIN is typed on the tablet only: it is in no
  address and no QR code.
- A phone that is locked, switched to another app or loses the Wi-Fi for a moment catches up by itself when it comes
  back ("Connection lost: reconnecting…" while it is away).
- One session takes up to **60 phones**; the 61st is told "This session is full: please watch the main screen".

## The instructor's phone

You can run the case from your own phone as well as from the laptop. The laptop always commands; the phone is a
second pair of hands, signed in with a PIN that only the laptop knows.

- **The PIN** is on the Room page, card **Instructor's phone**: four digits, drawn by the laptop the first time and kept
  on it. They show only while you **hold** "Hold to show the PIN" (mouse, finger or the space bar), so a laptop
  mirrored to the projector never shows them. **Change the PIN** draws new digits and signs the phone out at once; it
  signs in again with the new PIN.
- **The phone's address**: open "The phone's QR code" on the same card and scan it with your phone (or type the
  address under it). It opens the instructor remote with the session code filled in. The address carries no PIN.
- **Signing in**: type the PIN on the phone's keypad and press **Sign in**. The phone says "Signing in…", then
  "Signed in as the instructor's remote", and shows the instructor panel. The Room page's row says "Signed in since
  hh:mm".
- **One phone at a time.** Another phone that enters the PIN takes over: the first phone says "Taken over by another
  phone at mm:ss" (the case clock) and the Room row says "another phone took over". A lost phone never blocks the case:
  the row says "Lost", the case runs on, and any phone with the PIN signs in at once.
- **What the phone says when it cannot sign in**: "Wrong PIN" (the Room page counts the wrong PINs of the last
  minute); "Too many wrong PINs from this phone" (five in a minute: that phone waits a minute, the other phones are not
  affected); "The PIN was changed on the instructor's computer"; "The instructor's computer restarted at mm:ss" (the
  laptop reloaded: presses the phone was still waiting on were not given, and the phone signs in again by itself);
  after 10 s with no answer, "This classroom kit does not take an instructor phone" (a kit from an older release:
  use the kit from the same release as the app).
- The PIN is kept in the phone's page only while it is open: a reload of the phone asks for it again.

## One instructor tab

Run the session in **one** tab. The phones follow the tab that runs the session; a second tab that started its own
session would have a new code, and the phones would stay with the first one. So when the app's address is opened in
another tab of the same browser (or typed again without its `?session=` part) while a session is running, it asks
first: "A classroom session is already running in another tab (code ……)". **Open that tab's session here** moves the
session to the new tab: the same code, the case where it was (as after a reload), and the phones and second screens
follow it there; the old tab stops and says "This session moved to another tab". **Start a new session** gives the new
tab its own code; the phones stay with the old tab. The new tab learns of the running session from the browser itself,
so a tab the browser has put to sleep in the background (Safari, after about 4 minutes hidden) is still found. Such a
tab can only hand its case over once it runs again: the new tab then says "Waiting for the other tab to hand over its
session"; click the old tab once and the session moves with its case, or press **Start here without its case** (same
code, the phones come to the new tab, the case starts again). Only tabs of the same browser are found. An old browser
(Safari before 15.4) or the instructor's page opened at the laptop's network address instead of `127.0.0.1` cannot
ask the browser: there the tabs are asked directly, and a sleeping tab is missed as before (the new tab starts its own
session).

## The same drug twice (the laptop and a second device)

When a drug is given as a bolus, the same drug is refused for the next **10 seconds of simulated time**, whoever
presses it: the laptop, a Remote or the instructor's phone (the owner's ruling of 5 November 2026: two people entering
the one dose the learners asked for would give the patient two). The device that pressed is told why, for example
"… not given (given 4 s ago from the laptop)"; a Remote counts as "the phone". Meanwhile the drug's row on
every Instructor view reads "given 0:04 ago · 6 s left", counting down, and is live again after 10 s. Infusions, TCI,
the vaporiser, fluids, CPR, defibrillation and the airway are never locked, nor is anything the card gives by itself.
A card step whose button gives a drug given in the last 10 seconds is refused the same way and the card does not move;
press it again once the lock is over (the card's own doses are never changed).
The refused press is not in the debrief; it shows only in the pressing device's log and the laptop's console.

## The day before (at the venue if at all possible)

1. Start the kit with **Start Classroom** on the presenting Mac. When macOS asks whether "node" may accept incoming
   network connections, click **Allow** (if it was refused once: System Settings > Network > Firewall > Options, set
   node to "Allow incoming connections").
2. Join the network you will use (a or b below), open Home → **Start here** (the **Room**). Scan the code with **your
   own phone** on the same network. If the phone shows the monitor within a few seconds, the network works. If it
   shows "this phone cannot reach the instructor's laptop", the network keeps devices apart (client isolation, common
   on guest and hotel Wi-Fi): use (b).

## (a) Venue Wi-Fi

1. Mac and phones on the same Wi-Fi (the guest network usually isolates devices: ask for the staff network, or test as
   above).
2. Double-click **Start Classroom**; leave its black window open.
3. Load the case as usual (Scenarios > Open the library > Load, or the Instructor view's case list).
4. **The QR moment** (below), then back to the case (**Instructor** in the rail); teach as usual.

## (b) A local network you bring (the Mac's own hotspot or a travel router)

1. **Travel router (recommended for 30 phones):** power it on, join the Mac to it, put its network name and password
   on the first slide. No internet is needed.
2. **The Mac's hotspot** (System Settings > General > Sharing > Internet Sharing, "Share from" a wired or iPhone-USB
   connection, "to" Wi-Fi): it needs a second connection to share, and how many phones it carries was NOT measured
   here — test with as many phones as you can the day before. A phone's own hotspot carries only a handful of devices:
   not for a room.
3. Then (a) steps 2–4. The QR code uses the hotspot's address first.

## (c) No usable network

Do not show the QR code. Use **Start Simulator** as before and **Open on a second screen** for the projector. If
learners scanned a code anyway, their phones say "Waiting for the instructor: this phone cannot reach the instructor's
laptop. Is it on the classroom Wi-Fi?" — nothing breaks.

## The QR moment (what to say and do)

1. The **Room** on the projector: Home → **Start here**, or **Room** in the rail at the left (the Monitor view's
   **Phones** button opens it too). It shows the QR code, the 6-letter code, the address and "0 phones following".
   For a hall, click **Show large** under the QR code (or press **Q**): the same code fills the screen's height, with
   the 6-letter code, the address and the count beneath; **Escape** (or Q, or **Back to the Room**) returns.
2. Say: *"Please join the Wi-Fi called ‹network› and scan this code with your camera. You will get the monitor on your
   phone — it follows what I do here. It is silent: tap Sound off if you want to hear it."*
3. Watch the count rise ("12 phones following"). If a phone does not open the page: is it on that Wi-Fi? (mobile data
   cannot reach the laptop). If the code does not open, the Room lists the laptop's other addresses to type in.
4. Go on to the case (**Scenarios** or **Instructor** in the rail). The Room shows the QR again at any time (late
   arrivals).

## If something goes wrong

| What you see | What to do |
|---|---|
| "Start Classroom" says it needs Node.js | Use **Start Simulator**: everything but the phones works. |
| The sheet says "The relay does not answer" | Close the Classroom window, double-click **Start Classroom** again, reload the page. |
| The sheet says "This computer is on no network" | Join the Wi-Fi (or turn on the hotspot), click **Phones** again. |
| Phones say "cannot reach the instructor's laptop" | They are on another network, or the Wi-Fi isolates devices: use (b), or (c). |
| Phones say "The instructor's monitor is not answering" | The instructor's page was closed or reloaded: reopen it from the Classroom window's address; the phones find it again. |
| A phone says "The ventilator is on the main screen" | Expected while the Ventilator view, the ventilator window or the ventilator tablet drives the patient; it follows again when that cockpit closes or hands over. |
| The ventilator tablet says "Wrong PIN" | Enter the PIN the Room page shows under **Instructor's phone** (press and hold). After a **Change the PIN** the tablet signs in again with the new one. |
| A phone says "This session is full" | 60 phones are following; ask a neighbour to share a screen. |

Measured on the presenting Mac class of machine (Apple M3, Stage 12 plan "Capacity"): 30 phones cost the relay under
2 % of one core and under 70 MB; each phone receives about 1.3 KB/s at ×1 and about 10 KB/s at ×8 (30 phones at ×8:
≈ 0.3 MB/s on the Wi-Fi), and about 100 KB once when it joins or catches up.
