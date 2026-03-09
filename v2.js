(function () {
  const root = document.getElementById("v2-app");
  if (!root) {
    return;
  }

  const STAFF_ID = "vault_maintenance";
  const STAFF_KEY = "p59_relay_7734";
  const FOUNDER_KEY = "frostline_719";

  const session = {
    staff: false,
    founder: false
  };

  const STORAGE_KEYS = {
    repairSolved: "safehouse.v2.repair.solved",
    decryptSolvedLegacy: "safehouse.v2.decrypt.solved",
    iconLayout: "safehouse.v2.icon.layout",
    iconLayoutVersion: "safehouse.v2.icon.layout.version",
    language: "safehouse.v2.language"
  };
  const ICON_LAYOUT_VERSION = "20260306-icons-v2";

  const REC77_TARGET = {
    clock: 6,
    phase: 3,
    gain: 8
  };

  const REC77_PATH = "/public/corrupted-file-77.bin";
  const REC77_NOTE_PATH = "/public/rec-77-note.txt";

  const repairState = {
    clock: 5,
    phase: 4,
    gain: 1,
    attempts: 0,
    solved: false
  };

  const repairWorkbench = {
    loadedPath: "",
    waitingForSelection: false
  };

  const uiState = {
    selectedFilePath: ""
  };

  const LANGUAGES = [
    { code: "en", label: "English" },
    { code: "ja", label: "日本語" },
    { code: "it", label: "Italiano" },
    { code: "tlh", label: " ", statusLabel: "tlhIngan Hol" }
  ];

  const appState = {
    phase: "boot",
    language: ""
  };

  const APPS = [
    { id: "hours", label: "hours", glyph: "H", title: "Service Hours", icon: "assets/icons/hours.svg" },
    { id: "location", label: "location", glyph: "L", title: "Location", icon: "assets/icons/location.svg" },
    { id: "menu", label: "menu", glyph: "M", title: "Bar Menu", icon: "assets/icons/menu.svg" },
    { id: "events", label: "events", glyph: "E", title: "Events", icon: "assets/icons/events.svg" },
    { id: "contacts", label: "contacts", glyph: "C", title: "Contacts", icon: "assets/icons/contacts.svg" },
    { id: "public-files", label: "public files", glyph: "P", title: "Public Files", icon: "assets/icons/public-files.svg" },
    { id: "trash", label: "trash", glyph: "TR", title: "Recycle Bin", icon: "assets/icons/trash.svg" },
    {
      id: "filesystem",
      label: "system files",
      glyph: "FS",
      title: "File System",
      icon: "assets/icons/system-files.svg",
      hiddenByDefault: true
    },
    { id: "lore", label: "archive", glyph: "LR", title: "Lore Archive", icon: "assets/icons/archive.svg", hiddenByDefault: true },
    {
      id: "decryptor",
      label: "file repair",
      glyph: "FR",
      title: "REC-77 File Repair Utility",
      icon: "assets/icons/file-repair.svg",
      hiddenByDefault: true
    },
    { id: "staff-login", label: "staff login", glyph: "S", title: "Staff Login", icon: "assets/icons/staff-login.svg", hiddenByDefault: true },
    { id: "terminal", label: "terminal", glyph: "T", title: "Legacy Terminal", icon: "assets/icons/terminal.svg", hiddenByDefault: true }
  ];

  const appById = new Map(APPS.map((app) => [app.id, app]));

  const VFS = createVfs();
  const listeners = new Set();
  let mode = "";
  let renderedPhase = "";
  let clockHandle = null;

  loadStoredState();

  function loadStoredState() {
    try {
      // Always start a fresh REC-77 puzzle on new page load.
      repairState.solved = false;
      repairState.clock = 5;
      repairState.phase = 4;
      repairState.gain = 1;
      repairState.attempts = 0;
      window.localStorage.removeItem(STORAGE_KEYS.repairSolved);
      window.localStorage.removeItem(STORAGE_KEYS.decryptSolvedLegacy);
    } catch (_ignore) {
      repairState.solved = false;
    }
  }

  function persistLanguage() {
    try {
      window.localStorage.setItem(STORAGE_KEYS.language, appState.language);
    } catch (_ignore) {
      // no-op
    }
  }

  function languageLabel() {
    const entry = LANGUAGES.find((item) => item.code === appState.language);
    const label = entry ? entry.statusLabel || entry.label : "UNSET";
    return label.toUpperCase();
  }

  function persistRepairSolved() {
    try {
      const v = repairState.solved ? "1" : "0";
      window.localStorage.setItem(STORAGE_KEYS.repairSolved, v);
      window.localStorage.setItem(STORAGE_KEYS.decryptSolvedLegacy, v);
    } catch (_ignore) {
      // no-op
    }
  }

  function setSelectedFilePath(path) {
    uiState.selectedFilePath = path ? normalizePath(path) : "";
    window.dispatchEvent(
      new CustomEvent("v2-file-selected", {
        detail: { path: uiState.selectedFilePath }
      })
    );
  }

  function randomNoiseChar() {
    const chars = "!@#$%^&*()_+-=[]{};:<>?/\\|0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return chars[Math.floor(Math.random() * chars.length)];
  }

  function repairedRecordText() {
    return (
      "REC-77 REPAIRED RECORD\n" +
      "operator: vault_maintenance\n" +
      "access key: p59_relay_7734\n\n" +
      "SY04 note: We opened Safehouse as a bar because people only breathe when they sit.\n" +
      "SY09 note: Masaya requested the highball spec and silence. C3 table remains reserved.\n" +
      "SY12 note: second lock became mandatory after corridor breach.\n" +
      "SY26 note: archive handoff approved to current staff.\n"
    );
  }

  function repairDistance() {
    return (
      Math.abs(repairState.clock - REC77_TARGET.clock) +
      Math.abs(repairState.phase - REC77_TARGET.phase) +
      Math.abs(repairState.gain - REC77_TARGET.gain)
    );
  }

  function repairIntegrity() {
    const score = 100 - repairDistance() * 11;
    return Math.max(6, Math.min(100, score));
  }

  function obfuscateText(text, clarity) {
    const revealChance = clarity / 100;
    let out = "";
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === "\n" || ch === " " || ch === ":" || ch === "/" || ch === "-" || ch === "_") {
        out += ch;
        continue;
      }
      out += Math.random() < revealChance ? ch : randomNoiseChar();
    }
    return out;
  }

  function readFileText(path) {
    if (path === REC77_PATH) {
      if (repairState.solved) {
        return repairedRecordText();
      }
      return (
        "REC-77 BINARY BLOCK\n" +
        "status: corrupted payload\n\n" +
        obfuscateText(repairedRecordText(), repairIntegrity())
      );
    }
    if (path === REC77_NOTE_PATH) {
      if (repairState.solved) {
        return (
          "REC-77 NOTE\n" +
          "status: repaired\n" +
          "open /public/corrupted-file-77.bin for recovered credentials and story."
        );
      }
      return (
        "REC-77 NOTE\n" +
        "file integrity failed.\n" +
        "use FILE REPAIR utility app from desktop to restore readability."
      );
    }
    return VFS[path];
  }

  function createVfs() {
    return {
      "/": ["bar", "public", "secure", "var"],

      "/bar": ["service", "menu", "ops"],
      "/bar/service": ["hours.txt", "contacts.txt", "events-calendar.txt", "location.txt"],
      "/bar/service/hours.txt":
        "SAFEHOUSE SERVICE HOURS\n" +
        "MON-THU 18:00 - 01:00\n" +
        "FRI-SAT 18:00 - 03:00\n" +
        "SUN maintenance / closed\n\n" +
        "Last call: 30 minutes before shutdown.",
      "/bar/service/contacts.txt":
        "CONTACTS\n" +
        "reservations: +81-75-000-5900\n" +
        "signal: safehouse://frontdesk\n" +
        "mail: frontdesk@safehouse.local\n\n" +
        "Private booking: include date, time, party size.",
      "/bar/service/events-calendar.txt":
        "EVENTS CALENDAR\n" +
        "FRI 22:10  canal noise session\n" +
        "SAT 20:40  aftergrid listening bar\n" +
        "TUE 21:00  archive classics workshop\n\n" +
        "No-photo policy active in selected zones.",
      "/bar/service/location.txt":
        "LOCATION\n" +
        "district: river belt / sector K\n" +
        "marker: safehouse neon gate\n" +
        "entry: steel door 03 (left corridor)\n\n" +
        "Walk east on main artery, turn at curved ring road,\n" +
        "follow lower service lane lights.",

      "/bar/menu": ["house-menu.txt", "seasonal-board.txt", "non-alcoholic.txt", "masaya-note.txt"],
      "/bar/menu/house-menu.txt":
        "HOUSE MENU\n" +
        "DUSTLINE HIGHBALL      12\n" +
        "NARROW ESCAPE          14\n" +
        "VAULT NEGRONI          13\n" +
        "MASAYA HIGHBALL        14\n" +
        "OXIDE SOUR             12\n" +
        "AFTERGRID NO-PROOF      9",
      "/bar/menu/seasonal-board.txt":
        "SEASONAL BOARD\n" +
        "CANAL FOG RICKEY       13\n" +
        "RUST BLOOM SPRITZ      12\n" +
        "MIDNIGHT RYE           14",
      "/bar/menu/non-alcoholic.txt":
        "NO-PROOF\n" +
        "Aftergrid No-Proof\n" +
        "Canal Citrus Soda\n" +
        "Dry Juniper Tonic",
      "/bar/menu/masaya-note.txt":
        "MASAYA HIGHBALL\n" +
        "Serve over hard ice.\n" +
        "No garnish.\n" +
        "Low dilution.\n" +
        "Do not narrate the build.",

      "/bar/ops": ["frontdesk-protocol.txt", "quiet-floor-mode.txt"],
      "/bar/ops/frontdesk-protocol.txt":
        "FRONTDESK PROTOCOL\n" +
        "1) greet short\n" +
        "2) offer two clear choices\n" +
        "3) keep exit lane visible\n" +
        "4) escalate to floor lead if needed",
      "/bar/ops/quiet-floor-mode.txt":
        "QUIET FLOOR MODE\n" +
        "Reduce music, reduce light contrast, reduce words.\n" +
        "No dramatic gestures. Keep service rhythm stable.",

      "/public": ["faq.txt", "about-us.txt", "policy.txt", "rec-77-note.txt", "corrupted-file-77.bin"],
      "/public/faq.txt":
        "FAQ\n" +
        "Q: walk-ins?\n" +
        "A: yes, based on floor load.\n\n" +
        "Q: no-proof options?\n" +
        "A: yes, full no-proof lane active.",
      "/public/about-us.txt":
        "ABOUT SAFEHOUSE\n" +
        "We are bunker-born staff operating a post-surface bar network.\n" +
        "Pre-war records are fragmented and often contradictory.",
      "/public/policy.txt":
        "HOUSE POLICY\n" +
        "- no-photo zones marked by amber lamps\n" +
        "- no violence\n" +
        "- staff safety protocol has priority",
      "/public/rec-77-note.txt":
        "REC-77 NOTE\n" +
        "file integrity failed.\n" +
        "use FILE REPAIR utility app from desktop to restore readability.",
      "/public/corrupted-file-77.bin":
        "REC-77 BINARY BLOCK\n" +
        "status: unreadable payload",

      "/secure": ["operations", "personnel", "archive", "founder"],

      "/secure/operations": ["daily-operations", "continuity", "internal-messages", "security-briefs"],
      "/secure/operations/daily-operations": [
        "debrief-sy26-02-22.txt",
        "debrief-sy26-02-23-masaya.txt",
        "maintenance-window-sy26-02-24.txt"
      ],
      "/secure/operations/daily-operations/debrief-sy26-02-22.txt": [
        "DEBRIEF SY26-02-22",
        "Crowd pressure rose at 21:40 and held for forty-seven minutes.",
        "Actions taken: short menu mode, low-noise protocol, one roaming lead, one held spare table at C1.",
        "Erik cut the greeting script down to six words and Andrea stopped using names after the first wave.",
        "Result: no incidents, average service delay +4 min, two guests escorted to stairwell for air.",
        "Note: the room stabilized the moment staff started speaking less."
      ].join("\n"),
      "/secure/operations/daily-operations/debrief-sy26-02-23-masaya.txt": [
        "DEBRIEF SY26-02-23 / MASAYA",
        "Masaya arrived 21:17, sat at C3 without waiting to be guided.",
        "No menu requested. Ordered Masaya Highball.",
        "Stayed 28 min. No spoken words to guests. One glance toward the inner lock at 21:31.",
        "Floor noise dropped after his entry and remained low for the rest of service.",
        "Recommendation: keep C3 dark, visible, and free of decorative glass."
      ].join("\n"),
      "/secure/operations/daily-operations/maintenance-window-sy26-02-24.txt": [
        "MAINTENANCE WINDOW SY26-02-24",
        "Theo isolated the west glycol line after midnight hiss in the cellar.",
        "Ju scrubbed the underbar drain by hand because the rotary brush jammed again.",
        "Laryssa stayed late to walk the empty room twice and confirm no one had bedded down under booth C6.",
        "Power draw normalized by 03:18.",
        "Reminder: never schedule deep maintenance on the night after a C3 visit."
      ].join("\n"),

      "/secure/operations/continuity": [
        "continuity-log-sy26-q1.md",
        "event-consequence-matrix.md",
        "corridor-stability-watch.md"
      ],
      "/secure/operations/continuity/continuity-log-sy26-q1.md": [
        "# CONTINUITY LOG SY26 Q1",
        "- SY26-02-10: queue spill at stairwell -> added lane divider",
        "- SY26-02-14: noise spike -> default low music profile",
        "- SY26-02-18: cellar condensation -> shifted citrus stock to upper shelf",
        "- SY26-02-23: Masaya visit -> C3 dark table kept reserved after close",
        "- SY26-02-24: maintenance window -> west line patched, no guest impact"
      ].join("\n"),
      "/secure/operations/continuity/event-consequence-matrix.md": [
        "# EVENT CONSEQUENCE MATRIX",
        "Crowd surge -> short menu mode",
        "Guest panic -> low-light + two-option protocol",
        "Utility warning -> reduce ice lane and simplify menu",
        "Unscheduled VIP presence -> freeze C3 and clear corridor sightline",
        "Stairwell rumor -> frontdesk stops improv, switches to exact times only"
      ].join("\n"),
      "/secure/operations/continuity/corridor-stability-watch.md": [
        "# CORRIDOR STABILITY WATCH",
        "Marker N-12 remains unreliable after the old collapse.",
        "Do not route exhausted guests through lower ring after 22:00 unless Erik or Kenji is present.",
        "Laryssa reports that quiet guests hide distress better on the long return corridor than in the room itself.",
        "Keep one spare blanket sealed in the door cabinet, not under the bar."
      ].join("\n"),

      "/secure/operations/internal-messages": [
        "owner-broadcast.txt",
        "floor-alert-template.txt",
        "records-handoff-sy26-02.txt"
      ],
      "/secure/operations/internal-messages/owner-broadcast.txt": [
        "OWNER BROADCAST",
        "Keep service tight. No theater. No ego.",
        "When conditions shift: shorten sentences, reduce menu branches, keep exits visible.",
        "Guests forgive slowness faster than uncertainty.",
        "If the room goes quiet on its own, do not fill it just because silence scares staff."
      ].join("\n"),
      "/secure/operations/internal-messages/floor-alert-template.txt": [
        "FLOOR ALERT TEMPLATE",
        "[time] [zone] [pressure index]",
        "action: [lights/music/door]",
        "result: [stable/watch/escalate]",
        "follow-up: [who stayed after close, who left shaking, what changed the room]"
      ].join("\n"),
      "/secure/operations/internal-messages/records-handoff-sy26-02.txt": [
        "RECORDS HANDOFF SY26-02",
        "Mira to Theo:",
        "The sealed note for the night safe rotation is back in the black envelope.",
        "Do not leave it in the archive cabinet again. Andrea nearly filed it under supplier invoices.",
        "If the founder recovery string ever has to be read aloud, the room is already too far gone."
      ].join("\n"),

      "/secure/operations/security-briefs": ["c3-observation-policy.txt", "night-safe-rotation-sy21.txt"],
      "/secure/operations/security-briefs/c3-observation-policy.txt": [
        "C3 OBSERVATION POLICY",
        "Table must remain visible from frontdesk, service lane, and inner corridor mouth.",
        "Do not seat loud parties nearby after 21:00.",
        "If Masaya is present, staff movement around C3 becomes slower, not smaller.",
        "No one asks if he is staying. They ask whether he needs more ice."
      ].join("\n"),
      "/secure/operations/security-briefs/night-safe-rotation-sy21.txt": [
        "NIGHT SAFE ROTATION SY21",
        "Escrow procedure revised after duplicate seal incident.",
        "Active founder recovery string on sealed card: frostline_719",
        "Reading it out on the floor voids protocol immediately.",
        "Store one copy with records, one with utilities, and neither in the same room overnight."
      ].join("\n"),

      "/secure/personnel": ["staff-files", "evaluations", "interviews", "external-contacts"],
      "/secure/personnel/staff-files": [
        "erik.profile",
        "theo.profile",
        "andrea.profile",
        "ju.profile",
        "kenji.profile",
        "mira.profile",
        "laryssa.profile"
      ],
      "/secure/personnel/staff-files/erik.profile": [
        "ERIK // floor lead",
        "joined: SY09-03-12",
        "origin: lower sector ration mediation line",
        "",
        "Erik rarely raises his voice. He lowers the room instead.",
        "He scans exits before faces and remembers who sat closest to them.",
        "During the stairwell surge on SY18-07-03 he stopped a crush by offering two choices, one sentence each, until people believed they still had control.",
        "Known habit: rewrites the opening line for new staff until it sounds calm when read half-asleep.",
        "Risk: carries too much without reporting fatigue."
      ].join("\n"),
      "/secure/personnel/staff-files/theo.profile": [
        "THEO // cellar + utilities",
        "joined: SY07-11-01",
        "origin: recycler repair block, north service lane",
        "",
        "Theo trusts instruments less than smell, vibration, and the sound pipes make when the room above is full.",
        "He keeps three maps of the cellar because the official one lies in a different place each year.",
        "When pressure dropped on SY20-02-14 he shut down the west line before the gauges even caught up.",
        "Humor style: dry enough to feel like a warning.",
        "Risk: chooses structural solutions even when people are asking for comfort."
      ].join("\n"),
      "/secure/personnel/staff-files/andrea.profile": [
        "ANDREA // frontdesk",
        "joined: SY08-06-19",
        "origin: evacuation corridor checkpoint",
        "",
        "Andrea remembers shoes, sleeves, and the exact way a person asks for the bathroom when they are about to panic.",
        "She can keep a line moving without ever making it feel hurried.",
        "On SY25-09-11 she recognized a man from a six-second glance three months earlier and moved him away from the woman he had followed back then.",
        "Strength: memory with judgment, not just memory.",
        "Risk: absorbs guest grief and pretends that counts as part of the job."
      ].join("\n"),
      "/secure/personnel/staff-files/ju.profile": [
        "JU // barback",
        "joined: SY11-04-03",
        "origin: storage cooperative south ring",
        "",
        "Ju works fast enough that guests think the room reset itself.",
        "Speaks little on shift, but notices inventory drift before the counts do.",
        "He once rebuilt the garnish rack from scrap in under an hour because he hated the way staff were reaching across one another.",
        "Best under pressure when given one exact instruction and a clear lane.",
        "Risk: hides pain to avoid slowing service."
      ].join("\n"),
      "/secure/personnel/staff-files/kenji.profile": [
        "KENJI // service lane + door support",
        "joined: SY10-11-28",
        "origin: station west gate blackout night",
        "",
        "Kenji moves like every floor is wet and every guest might fall.",
        "He protects weak points in the room without making the room feel guarded.",
        "After the canal fight on SY16-08-04 he stood by the door for two hours with a split lip and never mentioned it until close.",
        "Best use: sightline control, corridor escort, late-night exit shepherding.",
        "Risk: will put himself between trouble and everyone else before asking if backup exists."
      ].join("\n"),
      "/secure/personnel/staff-files/mira.profile": [
        "MIRA // records + inventory",
        "joined: SY18-05-22",
        "origin: municipal archive salvage team",
        "",
        "Mira can reconstruct a missing stock trail from handwriting pressure and which shelf dust got disturbed first.",
        "She hates vague labels and keeps rewriting names until they stop sounding temporary.",
        "Found the duplicated seal card in SY21 because one staple was newer than the others.",
        "Strength: pattern memory under sleep debt.",
        "Risk: if she stops talking entirely, something important has gone missing."
      ].join("\n"),
      "/secure/personnel/staff-files/laryssa.profile": [
        "LARYSSA // guest floor watch",
        "joined: SY18-11-06",
        "origin: intake ward transfer, lower clinic stair",
        "",
        "Laryssa reads hands before faces and posture before words.",
        "She was moved from intake because she could tell who needed a chair, who needed water, and who needed distance before they admitted any of it.",
        "On SY24-03-02 she found a boy asleep beneath booth C6 after close and sat on the floor nearby until he woke on his own.",
        "She keeps folded blankets hidden where guests cannot see them but staff can reach them in two steps.",
        "Risk: still believes every person who asks for five more minutes might mean it."
      ].join("\n"),

      "/secure/personnel/evaluations": [
        "frontdesk-review-andrea-sy25.txt",
        "cellar-review-theo-sy25.txt",
        "service-lane-review-kenji-sy25.txt",
        "records-review-mira-sy25.txt",
        "guest-floor-review-laryssa-sy25.txt"
      ],
      "/secure/personnel/evaluations/frontdesk-review-andrea-sy25.txt": [
        "FRONTDESK REVIEW // ANDREA // SY25",
        "Andrea remains the best first-contact operator in the building.",
        "Strengths: memory retention, early tension detection, low-drama escalation.",
        "Observed issue: takes home too much of the room and sleeps badly after crowded nights.",
        "Recommendation: mandatory split close every third peak shift, no exceptions."
      ].join("\n"),
      "/secure/personnel/evaluations/cellar-review-theo-sy25.txt": [
        "CELLAR REVIEW // THEO // SY25",
        "Theo prevented three equipment failures and reported none of them as personal credit.",
        "Strengths: predictive maintenance, structural calm, contempt for shortcuts.",
        "Observed issue: language can turn sharp when people ignore sequence.",
        "Recommendation: pair with Ju for heavy windows; never pair with optimism alone."
      ].join("\n"),
      "/secure/personnel/evaluations/service-lane-review-kenji-sy25.txt": [
        "SERVICE LANE REVIEW // KENJI // SY25",
        "Kenji remains the steadiest body in motion on the floor.",
        "Strengths: route control, protective instinct, clean reads on crowd flow.",
        "Observed issue: injury concealment.",
        "Recommendation: physical checks after any door incident, whether he protests or not."
      ].join("\n"),
      "/secure/personnel/evaluations/records-review-mira-sy25.txt": [
        "RECORDS REVIEW // MIRA // SY25",
        "Mira fixed naming drift across six cabinets and caught two mismatched intake cards.",
        "Strengths: pattern memory, suspicion aimed in the correct direction.",
        "Observed issue: will keep digging after the answer is already enough.",
        "Recommendation: rotate her off seal work after midnight."
      ].join("\n"),
      "/secure/personnel/evaluations/guest-floor-review-laryssa-sy25.txt": [
        "GUEST FLOOR REVIEW // LARYSSA // SY25",
        "Laryssa reduced panic escalations on the quiet side by making fewer interventions, not more.",
        "Strengths: body-language reading, restraint, patient follow-through.",
        "Observed issue: personal attachment to vulnerable guests.",
        "Recommendation: no solo close on nights when C3 is active."
      ].join("\n"),

      "/secure/personnel/interviews": [
        "erik-intake-sy09.txt",
        "andrea-intake-sy08.txt",
        "ju-observation-sy11.txt",
        "mira-clearance-sy20.txt",
        "laryssa-transfer-sy18.txt"
      ],
      "/secure/personnel/interviews/erik-intake-sy09.txt": [
        "ERIK INTAKE / SY09",
        "Q: Why did you stop the fight?",
        "A: It was blocking the food line.",
        "Q: Why not hit either of them?",
        "A: Then there would be three people not listening.",
        "Assessment: hired after founder observed zero wasted movement."
      ].join("\n"),
      "/secure/personnel/interviews/andrea-intake-sy08.txt": [
        "ANDREA INTAKE / SY08",
        "Q: What did you do at the corridor checkpoint?",
        "A: Counted breaths. The people who lied counted too fast.",
        "Q: Why Safehouse?",
        "A: Because lines get cruel when no one owns the front of them.",
        "Assessment: immediate placement at frontdesk."
      ].join("\n"),
      "/secure/personnel/interviews/ju-observation-sy11.txt": [
        "JU OBSERVATION / SY11",
        "Observation window: thirty-seven minutes in supply lane.",
        "Subject stacked six crates, corrected two labels, and noticed a cracked bottle no one else had seen.",
        "When spoken to, answered clearly and without waste.",
        "Assessment: not leadership material, indispensable support material."
      ].join("\n"),
      "/secure/personnel/interviews/mira-clearance-sy20.txt": [
        "MIRA CLEARANCE / SY20",
        "Q: Why keep old ledgers no one reads?",
        "A: Because the room keeps paying for things no one remembers authorizing.",
        "Q: Why do you want seal access?",
        "A: I do not want it. I want to know who already touched it.",
        "Assessment: clearance granted, monitor sleep debt."
      ].join("\n"),
      "/secure/personnel/interviews/laryssa-transfer-sy18.txt": [
        "LARYSSA TRANSFER / SY18",
        "Q: Why leave intake ward?",
        "A: I stopped believing the stairs were temporary.",
        "Q: Why guest floor?",
        "A: People tell the truth with where they look when music starts.",
        "Assessment: transferred with founder approval after two probation shifts."
      ].join("\n"),

      "/secure/personnel/external-contacts": ["masaya.dossier", "c3-protocol.txt"],
      "/secure/personnel/external-contacts/masaya.dossier": [
        "MASAYA // external contact dossier",
        "status: non-staff, high-impact presence",
        "Known behavior: short visits, low speech, strict drink spec.",
        "No recorded threats. No recorded warmth either.",
        "Room effect: conversations shorten, glass handling improves, frontdesk volume drops without instruction.",
        "Risk rule: keep C3 visible, never force interaction."
      ].join("\n"),
      "/secure/personnel/external-contacts/c3-protocol.txt": [
        "C3 PROTOCOL",
        "Keep one path to C3 clear from frontdesk at all times.",
        "Serve Masaya Highball over hard ice without garnish and do not narrate the build.",
        "If he leaves a glass unfinished, no one comments on the amount left.",
        "If he asks who closed last night, answer with the role, not the name."
      ].join("\n"),

      "/secure/archive": ["emergence-records", "incident-ledgers", "facility-notes", "signal-captures", "access-ledgers"],
      "/secure/archive/emergence-records": [
        "timeline-bunker-fragments.md",
        "emergence-log-sy00-day0.md",
        "emergence-log-sy00-day11.md"
      ],
      "/secure/archive/emergence-records/timeline-bunker-fragments.md": [
        "# BUNKER TIMELINE FRAGMENTS",
        "Surface Year 00 marks first coordinated exits.",
        "Before SY00, records conflict across sectors and every family tells the date differently.",
        "Most current staff were born underground and inherited stories that disagree on weather, light, and who opened which door first.",
        "Consensus: the first true safe room became what is now the Safehouse bar."
      ].join("\n"),
      "/secure/archive/emergence-records/emergence-log-sy00-day0.md": [
        "EMERGENCE LOG / SY00 DAY 0",
        "We stepped out at dawn under ash haze.",
        "No map matched reality and the old street names survived only in half-burned delivery tags.",
        "The first room with an intact lock took in twelve people before noon.",
        "By night the room was already pouring rough highballs because structure travels faster when it comes in glasses."
      ].join("\n"),
      "/secure/archive/emergence-records/emergence-log-sy00-day11.md": [
        "EMERGENCE LOG / SY00 DAY 11",
        "Water lines unstable. Power intermittent. Two sectors fighting over battery chalk.",
        "We learned calm is infrastructure, not mood.",
        "A room becomes useful when people stop checking the door every twenty seconds.",
        "The bar idea arrived after the second night no one wanted to call shelter by its real name."
      ].join("\n"),

      "/secure/archive/incident-ledgers": ["masaya-visit-ledger-sy04-sy10.log", "clock-drift-incident-sy17.md"],
      "/secure/archive/incident-ledgers/masaya-visit-ledger-sy04-sy10.log": [
        "MASAYA VISIT LEDGER SY04-SY10",
        "SY04-02-09 in 21:14 / out 22:03 / highball build only",
        "SY05-01-11 in 22:08 / out 23:22 / asked: same hand on bar?",
        "SY09-12-02 in 22:10 / out 23:14 / no spoken words",
        "SY10-11-17 in 21:26 / out 22:55 / final confirmed entry"
      ].join("\n"),
      "/secure/archive/incident-ledgers/clock-drift-incident-sy17.md": [
        "CLOCK DRIFT INCIDENT / SY17",
        "Four bunker sectors reported different dates by up to nineteen days.",
        "Timeline reconciliation failed because each sector had documents precise enough to be believed.",
        "We retained SY as local standard and stopped pretending a single calendar could carry all the dead honestly.",
        "After that, anniversaries became private."
      ].join("\n"),

      "/secure/archive/facility-notes": [
        "second-lock-adoption-sy12.md",
        "corridor-map-notes-sy06.txt",
        "quiet-floor-rationale-sy14.txt"
      ],
      "/secure/archive/facility-notes/second-lock-adoption-sy12.md": [
        "SECOND LOCK ADOPTION / SY12",
        "After two corridor breaches, the inner lock became mandatory.",
        "Entry logic changed from trust to layered verification and then stayed that way because no one wanted to argue with the memory of the blood on the floor tiles.",
        "Guests only see the polished side of this decision."
      ].join("\n"),
      "/secure/archive/facility-notes/corridor-map-notes-sy06.txt": [
        "CORRIDOR MAP NOTES / SY06",
        "North service tunnel collapsed at marker N-12.",
        "Re-route guest flow through lower ring after 22:00.",
        "Wall seam near old pump room still leaks cold air in winter and makes nervous people think someone is breathing behind them."
      ].join("\n"),
      "/secure/archive/facility-notes/quiet-floor-rationale-sy14.txt": [
        "QUIET FLOOR RATIONALE / SY14",
        "Noise-trigger incidents dropped 38% after low-word service protocol.",
        "Short language is mandatory during peak load.",
        "Guests in distress trust clear shapes and shorter sentences faster than friendliness."
      ].join("\n"),

      "/secure/archive/signal-captures": ["surface-radio-fragment-sy19.log"],
      "/secure/archive/signal-captures/surface-radio-fragment-sy19.log": [
        "SURFACE RADIO FRAGMENT / SY19",
        "[00:14] carrier unstable",
        "[00:17] keep lights low gate still open",
        "[00:18] second voice lost under static",
        "[00:18] signal cut hard, not faded"
      ].join("\n"),

      "/secure/archive/access-ledgers": ["seal-integrity-sy26.txt", "archive-routing-note-sy21.txt"],
      "/secure/archive/access-ledgers/seal-integrity-sy26.txt": [
        "SEAL INTEGRITY SY26",
        "Envelope count matches ledger after late check by Mira.",
        "Theo confirms no duplicate wax impressions.",
        "Latest escrow string remains frostline_719 until rotation is signed by floor lead and records together.",
        "If this file is open outside records review, someone is already too desperate."
      ].join("\n"),
      "/secure/archive/access-ledgers/archive-routing-note-sy21.txt": [
        "ARCHIVE ROUTING NOTE SY21",
        "Do not file safe rotation slips under archive by topic.",
        "They go by risk, not by story.",
        "The last person who indexed by story nearly got the founder note shelved beside ration poetry."
      ].join("\n"),

      "/secure/founder": ["README.txt", "journals", "letters-never-sent", "masaya-notes.txt", "staff-notes"],
      "/secure/founder/README.txt": [
        "FOUNDER WORKSPACE",
        "Restricted partition.",
        "Contains private logs, operating philosophy, unsent correspondence, and recruitment notes never meant for staff view.",
        "Nothing in this directory was written for comfort."
      ].join("\n"),
      "/secure/founder/journals": ["journal-sy02-11-03.txt", "journal-sy08-09-09.txt", "journal-sy12-03-02.txt"],
      "/secure/founder/journals/journal-sy02-11-03.txt": [
        "JOURNAL SY02-11-03",
        "Tonight we served twelve people with six glasses and one intact shaker.",
        "No one asked for hope. They asked for structure.",
        "I think that is kinder, in a way. Hope makes promises. Structure only asks to be maintained."
      ].join("\n"),
      "/secure/founder/journals/journal-sy08-09-09.txt": [
        "JOURNAL SY08-09-09",
        "I rewrote the menu language to be shorter.",
        "Long words make anxious guests feel trapped.",
        "The cruel thing is that I learned this from interrogations, not hospitality."
      ].join("\n"),
      "/secure/founder/journals/journal-sy12-03-02.txt": [
        "JOURNAL SY12-03-02",
        "The second lock went in today.",
        "Everyone said it was necessary and no one was wrong.",
        "That is what keeps me awake: the clean decisions are never the ones that cost us people."
      ].join("\n"),
      "/secure/founder/masaya-notes.txt": [
        "MASAYA NOTES",
        "He never threatened directly. He changed the room by arriving.",
        "Table C3 stays reserved in low light.",
        "Masaya Highball was stabilized from his specs: hard ice, no garnish, no ceremony.",
        "When he looks at the inner lock I cannot tell whether he is remembering it or measuring it."
      ].join("\n"),

      "/secure/founder/staff-notes": ["index.txt", "erik.story", "andrea.story", "kenji.story", "laryssa.story"],
      "/secure/founder/staff-notes/index.txt": [
        "STAFF NOTES INDEX",
        "Private notes on recruitment and trust decisions.",
        "These are not profiles. They are the reasons I let people this close to the room."
      ].join("\n"),
      "/secure/founder/staff-notes/erik.story": [
        "ERIK STORY",
        "I met Erik breaking up a queue fight without touching anyone.",
        "He spoke to each man as if embarrassment might save them faster than force.",
        "It did.",
        "I hired him because he understood that dignity is cheaper to preserve than to rebuild."
      ].join("\n"),
      "/secure/founder/staff-notes/andrea.story": [
        "ANDREA STORY",
        "Andrea memorized thirty names on her second shift.",
        "She can tell who is near panic before they sit.",
        "The hard part is not her memory. It is that she still treats memory like a form of care instead of ammunition."
      ].join("\n"),
      "/secure/founder/staff-notes/kenji.story": [
        "KENJI STORY",
        "Kenji arrived soaked from canal rain and asked where to stand.",
        "I said by the door. He has protected that line ever since.",
        "Some people need purpose to survive. Kenji needs a threshold."
      ].join("\n"),
      "/secure/founder/staff-notes/laryssa.story": [
        "LARYSSA STORY",
        "Laryssa came from intake carrying the kind of silence that clinics teach and bars usually ruin.",
        "I kept waiting for the room to harden her. It has not, not entirely.",
        "She sees the people trying not to be seen, which makes her invaluable and in danger at the same time."
      ].join("\n"),

      "/secure/founder/letters-never-sent": [
        "sy00-02-13_to_my_mother.txt",
        "sy00-04-29_to_rin_at_gate.txt",
        "sy00-09-18_to_the_first_dead.txt",
        "sy01-03-07_to_erik_before_hire.txt",
        "sy01-11-26_to_the_people_left_outside.txt",
        "sy02-05-14_to_theo_after_the_leak.txt",
        "sy03-08-31_to_andrea_without_sending.txt",
        "sy04-02-09_to_masaya_after_c3.txt",
        "sy05-12-19_to_ju_about_the_cellar.txt",
        "sy07-06-03_to_the_room_itself.txt",
        "sy08-09-09_to_laryssa_before_transfer.txt",
        "sy10-11-17_to_masaya_after_last_entry.txt",
        "sy12-03-02_to_the_inner_lock.txt",
        "sy14-06-27_to_future_owner.txt",
        "sy17-01-05_to_the_clock_team.txt",
        "sy19-08-13_to_the_surface.txt",
        "sy26-02-24_to_whoever_reads_last.txt"
      ],
      "/secure/founder/letters-never-sent/sy00-02-13_to_my_mother.txt": [
        "To my mother,",
        "",
        "We opened the door because staying below had started to feel like prayer and not survival.",
        "You told me a sealed room can turn holy if people are frightened enough.",
        "I think you were warning me, but I used the lesson anyway.",
        "There is a street above us now where the wind smells like metal filings and wet smoke.",
        "I did not come back for you in time.",
        "There is no version of that sentence I can improve by rewriting it."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy00-04-29_to_rin_at_gate.txt": [
        "To Rin at the gate,",
        "",
        "I keep remembering how politely you asked whether we would open again after close.",
        "You said it like you were asking for another glass, not a place to sleep.",
        "We had nine inside and one lock that already stuck in wet weather.",
        "I chose the people already in the room and listened to your steps go quiet on the stairs.",
        "The next day I told staff we had followed protocol.",
        "That was true and not enough."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy00-09-18_to_the_first_dead.txt": [
        "To the first dead we carried out ourselves,",
        "",
        "I never learned your name because everyone was too busy pretending names would make it harder.",
        "You died three chairs from the bar while someone kept asking whether their drink was still on the ticket.",
        "I remember thinking the room had failed before I understood rooms cannot fail, only people inside them.",
        "We cleaned the floor before sunrise and opened on time.",
        "That decision became the shape of the rest of my life."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy01-03-07_to_erik_before_hire.txt": [
        "To Erik, before I knew your name,",
        "",
        "You broke a queue apart without touching anyone.",
        "I watched three men back away from their own anger because you sounded more tired than afraid.",
        "That was when I understood authority survives the collapse better than charm does.",
        "I wanted to ask whether you needed work.",
        "Instead I asked whether you were hungry, which was the same thing in those years."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy01-11-26_to_the_people_left_outside.txt": [
        "To the people left outside,",
        "",
        "There were nights when the room was full but not honest about it.",
        "A person can still stand, still order, still smile, and already be one breath from breaking.",
        "I counted chairs because chairs were countable.",
        "I did not know how to count the damage of turning someone away and having them understand me.",
        "Understanding is a colder mercy than refusal."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy02-05-14_to_theo_after_the_leak.txt": [
        "To Theo, after the leak,",
        "",
        "You said if the line had gone ten minutes longer the wall would have burst and drowned the cellar.",
        "I thanked you for saving the room.",
        "I did not thank you for choosing the room while the clinic upstairs begged for cold storage to stay alive.",
        "I know the numbers made your decision for you.",
        "The numbers do not visit me at night. The faces do."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy03-08-31_to_andrea_without_sending.txt": [
        "To Andrea, without sending,",
        "",
        "You still greet people as if the room owes them dignity instead of merely safety.",
        "Do not let me train that out of you.",
        "One day I will call your softness useful in a voice that sounds managerial and clean.",
        "What I mean is uglier: the room needs at least one person who has not mistaken caution for virtue."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy04-02-09_to_masaya_after_c3.txt": [
        "To Masaya, after your first night at C3,",
        "",
        "Nothing happened, which is not the same as saying nothing changed.",
        "You held the room the way a bad memory holds the body: quietly and everywhere at once.",
        "Staff moved better after you arrived. That frightened me more than if they had frozen.",
        "I do not know whether you came for shelter, surveillance, or nostalgia.",
        "I hate that the room suits you."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy05-12-19_to_ju_about_the_cellar.txt": [
        "To Ju, about the cellar,",
        "",
        "You spend more time below than anyone and still come upstairs gentle with the glass.",
        "I wonder if that is wisdom or damage.",
        "The cellar teaches a person that leaks are patient and rot never argues for itself.",
        "If you ever tell me the place feels wrong, I will close early and not ask you to justify it."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy07-06-03_to_the_room_itself.txt": [
        "To the room itself,",
        "",
        "I built you to hold people until they could stand again.",
        "Then I taught you to sell them a ritual so they would stay long enough to believe in your walls.",
        "Sometimes I think that was hospitality.",
        "Sometimes I think it was camouflage.",
        "Either way, you have outlived the honesty of your first purpose."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy08-09-09_to_laryssa_before_transfer.txt": [
        "To Laryssa, before transfer,",
        "",
        "The ward taught you to notice suffering early. The floor will teach you how often early is still too late.",
        "Guests lie with better clothes than patients do, but the body is faithful to panic.",
        "If you ever feel yourself becoming efficient about despair, leave the shift and do not apologize.",
        "I can replace a worker faster than I can replace that warning."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy10-11-17_to_masaya_after_last_entry.txt": [
        "To Masaya, after the last confirmed entry,",
        "",
        "You left the glass half-finished and never came back.",
        "The room stayed careful for months, as if your absence might still be watching it.",
        "I kept C3 dark because changing it felt like admitting relief.",
        "Relief would have been dishonest.",
        "What I felt was the kind of vacancy that makes every sound look guilty."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy12-03-02_to_the_inner_lock.txt": [
        "To the inner lock,",
        "",
        "Today I praised you in front of staff and hated you in private.",
        "You are a machine built to turn hesitation into policy.",
        "People trust doors more when they know someone else was denied by them first.",
        "That knowledge has made the room safer and me less certain I deserve to run it."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy14-06-27_to_future_owner.txt": [
        "To whoever owns this room after me,",
        "",
        "Do not confuse atmosphere with safety.",
        "A quiet room can still be cruel. A crowded room can still be kind.",
        "Watch where staff stand when they are tired. That tells you the truth of the place faster than revenue ever will.",
        "If you must choose between elegance and an exit path, choose the exit and lie about why."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy17-01-05_to_the_clock_team.txt": [
        "To the clock team,",
        "",
        "You asked me which date to print on the continuity ledger after the drift reports arrived.",
        "I told you to keep our local standard because the room needed one lie small enough to live with.",
        "Everyone nodded because they were exhausted, not because I was right.",
        "I still do not know whether consistency is a kindness or only easier to archive."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy19-08-13_to_the_surface.txt": [
        "To the surface,",
        "",
        "We spent years talking about you like a wound that might someday close.",
        "Then we learned wounds become geography if you survive inside them long enough.",
        "There are streets now where children know the ash smell better than rain.",
        "I opened a bar because people will sit for a drink in places where they would never admit they came for shelter."
      ].join("\n"),
      "/secure/founder/letters-never-sent/sy26-02-24_to_whoever_reads_last.txt": [
        "To whoever reads last,",
        "",
        "If you have this directory open, then the room either trusted you too much or not enough.",
        "Everything here was written after close, when the glasses were stacked and the courage wore off.",
        "You will be tempted to sort these pages into wisdom and damage.",
        "Do not. They came from the same hand on the same nights.",
        "If Safehouse survives me, let it stay useful before it tries to stay pure."
      ].join("\n"),

      "/var": ["log"],
      "/var/log": ["service.log", "security.log"],
      "/var/log/service.log":
        "[SY26-02-23 21:17] C3 occupied\n" +
        "[SY26-02-23 21:19] masaya highball sent\n" +
        "[SY26-02-23 21:44] floor pressure stable",
      "/var/log/security.log":
        "[SY26-02-23 22:55] door cycle normal\n" +
        "[SY26-02-24 00:11] stairwell clear"
    };
  }

  function normalizePath(path) {
    const input = String(path || "").trim();
    if (!input || input === "/") {
      return "/";
    }
    const parts = input.split("/");
    const out = [];
    parts.forEach((part) => {
      if (!part || part === ".") {
        return;
      }
      if (part === "..") {
        out.pop();
        return;
      }
      out.push(part);
    });
    return "/" + out.join("/");
  }

  function joinPath(base, child) {
    if (String(child).startsWith("/")) {
      return normalizePath(child);
    }
    return normalizePath((base === "/" ? "" : base) + "/" + child);
  }

  function isDir(path) {
    return Array.isArray(VFS[path]);
  }

  function isFile(path) {
    return typeof VFS[path] === "string";
  }

  function isSecure(path) {
    return path === "/secure" || path.startsWith("/secure/");
  }

  function isFounder(path) {
    return path === "/secure/founder" || path.startsWith("/secure/founder/");
  }

  function canAccess(path) {
    if (isFounder(path)) {
      return session.staff && session.founder;
    }
    if (isSecure(path)) {
      return session.staff;
    }
    return true;
  }

  function filterVisibleChildren(path) {
    const names = Array.isArray(VFS[path]) ? VFS[path] : [];
    return names
      .map((name) => {
        const full = joinPath(path, name);
        return {
          name,
          full,
          kind: isDir(full) ? "dir" : isFile(full) ? "file" : "unknown",
          locked: !canAccess(full)
        };
      })
      .filter((entry) => entry.kind !== "unknown");
  }

  function listPathLines(path) {
    const entries = filterVisibleChildren(path).sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === "dir" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    if (!entries.length) {
      return "(empty or restricted)";
    }
    return entries
      .map((entry) => {
        if (entry.locked) {
          return "[LOCK] " + entry.name;
        }
        return (entry.kind === "dir" ? "[DIR] " : "[FILE] ") + entry.name;
      })
      .join("\n");
  }

  function sessionRoleText() {
    if (session.staff && session.founder) {
      return "founder-session";
    }
    if (session.staff) {
      return "staff-session";
    }
    return "guest-session";
  }

  function emitSession() {
    listeners.forEach((fn) => fn());
  }

  function onSession(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function isMobileMode() {
    const narrow = window.matchMedia("(max-width: 900px)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    return narrow || coarse;
  }

  function stopClock() {
    if (clockHandle) {
      clearInterval(clockHandle);
      clockHandle = null;
    }
  }

  function clockText() {
    const now = new Date();
    const t = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const d = now.toLocaleDateString([], { month: "short", day: "2-digit" }).toUpperCase();
    return t + " // " + d;
  }

  function textBlock(value) {
    const block = document.createElement("div");
    block.textContent = value;
    return block;
  }

  function createAppGlyphElement(app, className) {
    const glyph = document.createElement("span");
    glyph.className = className;
    if (app.icon) {
      const img = document.createElement("img");
      img.src = app.icon;
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", () => {
        glyph.textContent = app.glyph;
      });
      glyph.appendChild(img);
      return glyph;
    }
    glyph.textContent = app.glyph;
    return glyph;
  }

  function createFsGlyphElement(kind, className) {
    const glyph = document.createElement("span");
    glyph.className = className;
    const img = document.createElement("img");
    img.alt = "";
    img.loading = "lazy";
    img.src = kind === "dir" ? "assets/icons/fs-folder.svg" : "assets/icons/fs-file.svg";
    img.addEventListener("error", () => {
      glyph.textContent = kind === "dir" ? "[]" : "--";
    });
    glyph.appendChild(img);
    return glyph;
  }

  function lockedNotice(text) {
    const wrap = document.createElement("div");
    wrap.appendChild(textBlock(text));
    return wrap;
  }

  function buildHours() {
    return textBlock(readFileText("/bar/service/hours.txt") || "hours unavailable");
  }

  function buildLocation() {
    const wrap = document.createElement("section");
    wrap.className = "v2-location";

    const frame = document.createElement("div");
    frame.className = "v2-location-map-frame";

    const map = document.createElement("img");
    map.className = "v2-location-map";
    map.src = "assets/location-map.png";
    map.alt = "Safehouse district map";
    map.loading = "lazy";

    const marker = document.createElement("div");
    marker.className = "v2-location-marker";
    marker.textContent = "SAFEHOUSE *";

    frame.appendChild(map);
    frame.appendChild(marker);

    const notes = document.createElement("div");
    notes.className = "v2-location-notes";
    notes.textContent =
      (readFileText("/bar/service/location.txt") || "location unavailable") +
      "\n\nTransit:\nKyoto-kawaramachi station west side, Gion-shijo station east side.";

    wrap.appendChild(frame);
    wrap.appendChild(notes);
    return wrap;
  }

  function buildMenu() {
    const main = readFileText("/bar/menu/house-menu.txt") || "menu unavailable";
    const seasonal = readFileText("/bar/menu/seasonal-board.txt") || "";
    const noProof = readFileText("/bar/menu/non-alcoholic.txt") || "";
    const masaya = readFileText("/bar/menu/masaya-note.txt") || "";
    return textBlock(main + "\n\n" + seasonal + "\n\n" + noProof + "\n\n" + masaya);
  }

  function buildEvents() {
    return textBlock(readFileText("/bar/service/events-calendar.txt") || "events unavailable");
  }

  function buildContacts() {
    return textBlock(readFileText("/bar/service/contacts.txt") || "contacts unavailable");
  }

  function buildTrash() {
    return textBlock(
      "RECYCLE BIN\n\nNo deleted files.\n\nTip: Use this space for future discarded logs and transient notes."
    );
  }

  function buildPublicFiles(env) {
    return createFilesystemBrowser("/public", {
      rootPath: "/public",
      lockRoot: true,
      title: "public",
      onOpenFile: env && env.openDocumentWindow ? env.openDocumentWindow : null,
      enableDrag: Boolean(env && env.enableFileDrag)
    });
  }

  function buildLegacyTerminalInfo() {
    return textBlock(
      "LEGACY TERMINAL\n\nOpen: /index.html\n\nUse File System for navigation and File Repair utility for REC-77."
    );
  }

  function buildStaffLogin() {
    const wrap = document.createElement("div");
    const form = document.createElement("form");
    form.className = "v2-login";
    form.setAttribute("autocomplete", "off");
    form.setAttribute("role", "presentation");

    const idLabel = document.createElement("label");
    idLabel.textContent = "Operator ID";
    const idField = document.createElement("input");
    idField.type = "text";
    idField.name = "opid_field";
    idField.autocomplete = "off";
    idField.autocapitalize = "none";
    idField.autocorrect = "off";
    idField.spellcheck = false;
    idField.inputMode = "text";
    idField.setAttribute("data-lpignore", "true");
    idField.setAttribute("data-1p-ignore", "true");
    idLabel.appendChild(idField);

    const keyLabel = document.createElement("label");
    keyLabel.textContent = "Access Key";
    const keyField = document.createElement("input");
    keyField.type = "text";
    keyField.name = "access_field";
    keyField.autocomplete = "off";
    keyField.autocapitalize = "none";
    keyField.autocorrect = "off";
    keyField.spellcheck = false;
    keyField.inputMode = "text";
    keyField.setAttribute("data-lpignore", "true");
    keyField.setAttribute("data-1p-ignore", "true");
    keyLabel.appendChild(keyField);

    const founderLabel = document.createElement("label");
    founderLabel.textContent = "Founder Passphrase";
    const founderField = document.createElement("input");
    founderField.type = "text";
    founderField.name = "founder_field";
    founderField.autocomplete = "off";
    founderField.autocapitalize = "none";
    founderField.autocorrect = "off";
    founderField.spellcheck = false;
    founderField.inputMode = "text";
    founderField.setAttribute("data-lpignore", "true");
    founderField.setAttribute("data-1p-ignore", "true");
    founderLabel.appendChild(founderField);

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = session.staff ? "re-authenticate" : "authenticate staff";

    const founderBtn = document.createElement("button");
    founderBtn.type = "button";
    founderBtn.textContent = "unlock founder";

    const status = document.createElement("div");
    status.className = "v2-muted";
    status.textContent =
      "status: " +
      (session.founder ? "founder unlocked" : session.staff ? "staff active" : "waiting");

    const recovered = document.createElement("div");
    recovered.className = "v2-login-recovered";

    const recoveredTitle = document.createElement("div");
    recoveredTitle.className = "v2-muted";
    recoveredTitle.textContent = "Recovered REC-77 credentials:";

    const fillId = document.createElement("button");
    fillId.type = "button";
    fillId.textContent = "vault_maintenance";

    const fillKey = document.createElement("button");
    fillKey.type = "button";
    fillKey.textContent = "p59_relay_7734";

    fillId.addEventListener("click", () => {
      idField.value = STAFF_ID;
      idField.focus();
    });
    fillKey.addEventListener("click", () => {
      keyField.value = STAFF_KEY;
      keyField.focus();
    });

    recovered.appendChild(recoveredTitle);
    recovered.appendChild(fillId);
    recovered.appendChild(fillKey);

    function syncRecoveredState() {
      recovered.style.display = repairState.solved ? "grid" : "none";
    }

    syncRecoveredState();
    if (!repairState.solved) {
      window.addEventListener(
        "v2-rec77-solved",
        () => {
          syncRecoveredState();
        },
        { once: true }
      );
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const ok = idField.value.trim() === STAFF_ID && keyField.value.trim() === STAFF_KEY;
      if (ok) {
        session.staff = true;
        status.textContent = "status: staff granted";
        status.className = "";
        emitSession();
      } else {
        session.staff = false;
        session.founder = false;
        status.textContent = "status: denied";
        status.className = "v2-muted";
        emitSession();
      }
    });

    founderBtn.addEventListener("click", () => {
      if (!session.staff) {
        status.textContent = "status: staff auth required first";
        status.className = "v2-muted";
        return;
      }
      if (founderField.value.trim() === FOUNDER_KEY) {
        session.founder = true;
        status.textContent = "status: founder unlocked";
        status.className = "";
        emitSession();
      } else {
        session.founder = false;
        status.textContent = "status: founder passphrase invalid";
        status.className = "v2-muted";
        emitSession();
      }
    });

    form.appendChild(idLabel);
    form.appendChild(keyLabel);
    form.appendChild(recovered);
    form.appendChild(submit);
    form.appendChild(founderLabel);
    form.appendChild(founderBtn);
    form.appendChild(status);
    wrap.appendChild(form);
    return wrap;
  }

  function buildDecryptor(env) {
    const wrap = document.createElement("section");
    wrap.className = "v2-decrypt";
    // Always require explicit manual load when File Repair opens.
    setSelectedFilePath("");
    repairWorkbench.loadedPath = "";
    repairWorkbench.waitingForSelection = false;

    const summary = document.createElement("div");
    summary.className = "v2-decrypt-status";

    const importRow = document.createElement("div");
    importRow.className = "v2-repair-import";

    const loadSelectedBtn = document.createElement("button");
    loadSelectedBtn.type = "button";
    loadSelectedBtn.textContent = "load from file system";
    loadSelectedBtn.className = "v2-decrypt-reset";

    const selectedInfo = document.createElement("div");
    selectedInfo.className = "v2-decrypt-selected";

    const meters = document.createElement("div");
    meters.className = "v2-decrypt-meters";

    const preview = document.createElement("div");
    preview.className = "v2-decrypt-preview";

    const main = document.createElement("div");
    main.className = "v2-decrypt-main";

    const tuning = document.createElement("div");
    tuning.className = "v2-decrypt-tuning";

    const controls = document.createElement("div");
    controls.className = "v2-decrypt-controls";

    const dropZone = document.createElement("div");
    dropZone.className = "v2-repair-dropzone";

    function makeDial(label, key, min, max) {
      const row = document.createElement("div");
      row.className = "v2-decrypt-row";

      const name = document.createElement("div");
      name.className = "v2-decrypt-name";
      name.textContent = label;

      const minus = document.createElement("button");
      minus.type = "button";
      minus.textContent = "-";

      const value = document.createElement("div");
      value.className = "v2-decrypt-value";

      const plus = document.createElement("button");
      plus.type = "button";
      plus.textContent = "+";

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = String(min);
      slider.max = String(max);
      slider.step = "1";
      slider.className = "v2-decrypt-slider";

      function refreshValue() {
        value.textContent = String(repairState[key]);
        slider.value = String(repairState[key]);
      }

      minus.addEventListener("click", () => {
        repairState[key] = Math.max(min, repairState[key] - 1);
        refreshValue();
        renderFrame();
      });

      plus.addEventListener("click", () => {
        repairState[key] = Math.min(max, repairState[key] + 1);
        refreshValue();
        renderFrame();
      });

      slider.addEventListener("input", () => {
        repairState[key] = Math.max(min, Math.min(max, Number(slider.value)));
        refreshValue();
        renderFrame();
      });

      row.appendChild(name);
      row.appendChild(minus);
      row.appendChild(value);
      row.appendChild(plus);
      row.appendChild(slider);
      controls.appendChild(row);
      refreshValue();
    }

    const scanBtn = document.createElement("button");
    scanBtn.type = "button";
    scanBtn.textContent = "run repair";
    scanBtn.className = "v2-decrypt-scan";

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.textContent = "reset tuning";
    resetBtn.className = "v2-decrypt-reset";

    scanBtn.addEventListener("click", () => {
      repairState.attempts += 1;
      if (repairDistance() === 0 && !repairState.solved) {
        repairState.solved = true;
        persistRepairSolved();
        window.dispatchEvent(new Event("v2-rec77-solved"));
      }
      renderFrame();
    });

    resetBtn.addEventListener("click", () => {
      if (repairState.solved) {
        repairState.clock = REC77_TARGET.clock;
        repairState.phase = REC77_TARGET.phase;
        repairState.gain = REC77_TARGET.gain;
        renderFrame();
        return;
      }
      repairState.clock = 5;
      repairState.phase = 4;
      repairState.gain = 1;
      repairState.attempts = 0;
      renderFrame();
    });

    meters.appendChild(scanBtn);
    meters.appendChild(resetBtn);

    makeDial("BLOCK MAP", "clock", 0, 9);
    makeDial("PARITY", "phase", 0, 9);
    makeDial("SIGNAL GAIN", "gain", 0, 9);

    function hasLoadedRepairFile() {
      return repairWorkbench.loadedPath && repairWorkbench.loadedPath === REC77_PATH;
    }

    function setLoadedPath(path) {
      repairWorkbench.loadedPath = path;
      renderFrame();
    }

    function handlePathDrop(path) {
      if (!path) {
        summary.textContent = "no valid file signal detected";
        return false;
      }
      if (!isFile(path)) {
        summary.textContent = "selected entry is not a file";
        return false;
      }
      if (path !== REC77_PATH) {
        summary.textContent = "integrity stable // selected file does not require repair";
        return false;
      }
      setLoadedPath(path);
      repairWorkbench.waitingForSelection = false;
      return true;
    }

    loadSelectedBtn.addEventListener("click", () => {
      repairWorkbench.waitingForSelection = true;
      if (env && typeof env.openFileSystem === "function") {
        env.openFileSystem();
        summary.textContent = "file browser opened // awaiting candidate";
      } else {
        summary.textContent = "awaiting candidate";
      }
    });

    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone.classList.add("drag-over");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("drag-over");
    });

    dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropZone.classList.remove("drag-over");
      const data = event.dataTransfer;
      const droppedPath =
        (data && data.getData("text/safehouse-path")) ||
        (data && data.getData("text/plain")) ||
        "";
      handlePathDrop(normalizePath(droppedPath));
    });

    wrap.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    wrap.addEventListener("drop", (event) => {
      if (event.target === dropZone || (event.target instanceof Node && dropZone.contains(event.target))) {
        return;
      }
      event.preventDefault();
      const data = event.dataTransfer;
      const droppedPath =
        (data && data.getData("text/safehouse-path")) ||
        (data && data.getData("text/plain")) ||
        "";
      handlePathDrop(normalizePath(droppedPath));
    });

    function refreshSelectedInfo() {
      if (uiState.selectedFilePath && uiState.selectedFilePath !== "/") {
        selectedInfo.textContent = "selected: " + uiState.selectedFilePath;
      } else {
        selectedInfo.textContent = "selected: (none)";
      }
    }

    refreshSelectedInfo();
    const onSelect = () => {
      refreshSelectedInfo();
      if (repairWorkbench.waitingForSelection && uiState.selectedFilePath) {
        handlePathDrop(uiState.selectedFilePath);
      }
    };
    window.addEventListener("v2-file-selected", onSelect);
    wrap.addEventListener(
      "v2-destroy",
      () => {
        window.removeEventListener("v2-file-selected", onSelect);
      },
      { once: true }
    );

    function renderFrame() {
      if (!hasLoadedRepairFile()) {
        summary.textContent = "idle // no active repair candidate";
        dropZone.textContent =
          "DROP FILE HERE\n\nAwaiting candidate input.";
        controls.style.display = "none";
        meters.style.display = "none";
        preview.style.display = "none";
        preview.classList.remove("solved");
        preview.classList.add("live");
        preview.style.display = "block";
        preview.textContent =
          "REPAIR BUS // standby\n\n" +
          obfuscateText(repairedRecordText(), 6);
        return;
      }

      dropZone.textContent = "Loaded candidate: " + repairWorkbench.loadedPath;
      controls.style.display = "grid";
      meters.style.display = "flex";
      preview.style.display = "block";

      const integrity = repairIntegrity();
      const solved = repairDistance() === 0 || repairState.solved;

      if (solved) {
        repairState.solved = true;
        persistRepairSolved();
        preview.classList.remove("live");
        preview.classList.add("solved");
        summary.textContent =
          "repair completed // integrity 100% // credentials available in staff login and file system";
        preview.textContent = repairedRecordText();
        return;
      }

      preview.classList.add("live");
      preview.classList.remove("solved");
      summary.textContent =
        "integrity " +
        integrity +
        "% // mismatch " +
        repairDistance() +
        " // attempts " +
        repairState.attempts;
      preview.textContent = obfuscateText(repairedRecordText(), integrity);
    }

    wrap.appendChild(summary);
    importRow.appendChild(loadSelectedBtn);
    wrap.appendChild(importRow);
    tuning.appendChild(selectedInfo);
    tuning.appendChild(dropZone);
    tuning.appendChild(controls);
    tuning.appendChild(meters);
    main.appendChild(preview);
    main.appendChild(tuning);
    wrap.appendChild(main);
    renderFrame();
    return wrap;
  }

  function createFilesystemBrowser(startPath, options) {
    const rootPath = normalizePath(options && options.rootPath ? options.rootPath : "/");
    const state = {
      cwd: normalizePath(startPath || rootPath),
      selectedFile: "",
      expanded: new Set([rootPath, "/"]),
      lastDragAt: 0
    };

    const wrap = document.createElement("section");
    wrap.className = "v2-fs";
    if (options && typeof options.onOpenFile === "function") {
      wrap.classList.add("has-external-view");
    }

    const toolbar = document.createElement("div");
    toolbar.className = "v2-fs-toolbar";

    const pathEl = document.createElement("div");
    pathEl.className = "v2-fs-path";

    const actions = document.createElement("div");
    actions.className = "v2-fs-actions";

    const homeBtn = document.createElement("button");
    homeBtn.type = "button";
    homeBtn.textContent = "home";

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.textContent = "up";

    const refreshBtn = document.createElement("button");
    refreshBtn.type = "button";
    refreshBtn.textContent = "refresh";

    actions.appendChild(homeBtn);
    actions.appendChild(upBtn);
    actions.appendChild(refreshBtn);

    toolbar.appendChild(pathEl);
    toolbar.appendChild(actions);

    const body = document.createElement("div");
    body.className = "v2-fs-body";

    const tree = document.createElement("div");
    tree.className = "v2-fs-tree";

    const main = document.createElement("div");
    main.className = "v2-fs-main";

    const list = document.createElement("div");
    list.className = "v2-fs-list";

    const view = document.createElement("div");
    view.className = "v2-fs-view";

    main.appendChild(list);
    main.appendChild(view);
    body.appendChild(tree);
    body.appendChild(main);

    const hint = document.createElement("div");
    hint.className = "v2-fs-hint v2-muted";

    wrap.appendChild(toolbar);
    wrap.appendChild(body);
    wrap.appendChild(hint);

    function canEnter(path) {
      if (!canAccess(path)) {
        return false;
      }
      if (options && options.lockRoot) {
        return path === rootPath || path.startsWith(rootPath + "/");
      }
      return true;
    }

    function sortedEntries(path) {
      return filterVisibleChildren(path).sort((a, b) => {
        if (a.kind !== b.kind) {
          return a.kind === "dir" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    }

    function formatRestricted(path) {
      return (
        "restricted path: " +
        path +
        "\n\nAuthenticate in Staff Login to access secure partitions."
      );
    }

    function directoryRowText(entry) {
      if (entry.locked) {
        return "restricted " + (entry.kind === "dir" ? "folder: " : "file: ") + entry.name;
      }
      return (entry.kind === "dir" ? "folder: " : "file: ") + entry.name;
    }

    function renderTree() {
      tree.innerHTML = "";

      function walk(path, depth) {
        if (!isDir(path)) {
          return;
        }
        const row = document.createElement("button");
        row.type = "button";
        row.className = "v2-fs-tree-row";
        row.style.paddingLeft = 8 + depth * 14 + "px";

        const isRootNode = path === rootPath;
        const name = isRootNode ? rootPath : path.split("/").filter(Boolean).slice(-1)[0];
        const locked = !canAccess(path);
        const expanded = state.expanded.has(path);
        const marker = document.createElement("span");
        marker.className = "v2-fs-tree-marker";
        marker.textContent = expanded ? "-" : "+";

        const glyph = createFsGlyphElement("dir", "v2-fs-tree-glyph");

        const label = document.createElement("span");
        label.className = "v2-fs-tree-label";
        label.textContent = name || "/";

        row.appendChild(marker);
        row.appendChild(glyph);
        row.appendChild(label);

        if (locked) {
          row.classList.add("locked");
        }
        if (path === state.cwd) {
          row.classList.add("active");
        }

        row.addEventListener("click", () => {
          if (locked) {
            state.selectedFile = "";
            view.textContent = formatRestricted(path);
            hint.textContent = "access restricted";
            return;
          }
          state.cwd = path;
          state.selectedFile = "";
          if (state.expanded.has(path) && path !== rootPath) {
            state.expanded.delete(path);
          } else {
            state.expanded.add(path);
          }
          renderView();
        });

        tree.appendChild(row);

        if (!expanded || locked) {
          return;
        }
        sortedEntries(path)
          .filter((entry) => entry.kind === "dir")
          .forEach((entry) => walk(entry.full, depth + 1));
      }

      walk(rootPath, 0);
    }

    function renderView() {
      pathEl.textContent = state.cwd;
      list.innerHTML = "";
      view.innerHTML = "";

      if (!canAccess(state.cwd)) {
        view.textContent = formatRestricted(state.cwd);
        hint.textContent = "login required (open Staff Login)";
        renderTree();
        return;
      }

      if (!isDir(state.cwd)) {
        view.textContent = "not a directory";
        hint.textContent = "invalid path";
        renderTree();
        return;
      }

      const entries = sortedEntries(state.cwd);
      hint.textContent = entries.length + " entries";
      if (options && options.enableDrag) {
        hint.textContent += " // drag file card into File Repair";
      }

      entries.forEach((entry) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "v2-fs-entry";
        row.title = directoryRowText(entry);

        const glyph = createFsGlyphElement(entry.kind, "v2-fs-entry-glyph");

        const label = document.createElement("span");
        label.className = "v2-fs-entry-label";
        label.textContent = entry.name;

        row.appendChild(glyph);
        row.appendChild(label);

        if (options && options.enableDrag && entry.kind === "file" && !entry.locked) {
          row.draggable = true;
          row.classList.add("draggable-file");
          row.addEventListener("dragstart", (event) => {
            state.lastDragAt = Date.now();
            setSelectedFilePath(entry.full);
            const dt = event.dataTransfer;
            if (!dt) {
              return;
            }
            dt.effectAllowed = "copyMove";
            dt.setData("text/safehouse-path", entry.full);
            dt.setData("text/plain", entry.full);
          });
          row.addEventListener("dragend", () => {
            state.lastDragAt = Date.now();
          });
        }
        if (entry.locked) {
          row.classList.add("locked");
        }

        row.addEventListener("click", () => {
          if (Date.now() - state.lastDragAt < 220) {
            return;
          }
          if (entry.locked) {
            state.selectedFile = "";
            view.textContent = formatRestricted(entry.full);
            hint.textContent = "access restricted";
            return;
          }
          if (entry.kind === "dir") {
            state.cwd = entry.full;
            state.selectedFile = "";
            state.expanded.add(entry.full);
            renderView();
            return;
          }
          setSelectedFilePath(entry.full);
          if (options && typeof options.onOpenFile === "function") {
            options.onOpenFile(entry.full);
            hint.textContent = "opened in new window";
            return;
          }
          state.selectedFile = entry.full;
          renderView();
        });

        if (state.selectedFile === entry.full) {
          row.classList.add("active");
        }
        list.appendChild(row);
      });

      if (options && typeof options.onOpenFile === "function") {
        view.textContent = "Select a file to open it in a new window.";
      } else if (state.selectedFile && isFile(state.selectedFile) && canAccess(state.selectedFile)) {
        view.textContent = readFileText(state.selectedFile);
      } else {
        view.textContent =
          "directory: " +
          state.cwd +
          "\n\n" +
          listPathLines(state.cwd) +
          "\n\nOpen folders to enter. Open files to read. Locked entries require auth.";
      }

      renderTree();
      const parent = normalizePath("/" + state.cwd.split("/").filter(Boolean).slice(0, -1).join("/"));
      const canGoUp = state.cwd !== rootPath && canEnter(parent);
      upBtn.disabled = !canGoUp;
    }

    homeBtn.addEventListener("click", () => {
      state.cwd = rootPath;
      state.selectedFile = "";
      renderView();
    });

    upBtn.addEventListener("click", () => {
      if (state.cwd === rootPath) {
        return;
      }
      const parts = state.cwd.split("/").filter(Boolean);
      parts.pop();
      const next = "/" + parts.join("/");
      const normalized = normalizePath(next || "/");
      if (!canEnter(normalized)) {
        return;
      }
      state.cwd = normalized;
      state.selectedFile = "";
      renderView();
    });

    refreshBtn.addEventListener("click", () => {
      renderView();
    });

    if (!canEnter(state.cwd)) {
      state.cwd = rootPath;
    }

    renderView();
    return wrap;
  }

  function buildFilesystem(env) {
    return createFilesystemBrowser("/", {
      rootPath: "/",
      onOpenFile: env && env.openDocumentWindow ? env.openDocumentWindow : null,
      enableDrag: Boolean(env && env.enableFileDrag)
    });
  }

  function buildLore(env) {
    if (!session.staff) {
      return lockedNotice(
        "SECURE ARCHIVE LOCKED\n\nStaff login required to access /secure.\nUse File Repair app to restore REC-77, then authenticate in Staff Login."
      );
    }
    return createFilesystemBrowser("/secure/archive", {
      rootPath: "/secure/archive",
      lockRoot: true,
      onOpenFile: env && env.openDocumentWindow ? env.openDocumentWindow : null,
      enableDrag: Boolean(env && env.enableFileDrag)
    });
  }

  function buildAppContent(appId, env) {
    switch (appId) {
      case "hours":
        return buildHours();
      case "location":
        return buildLocation();
      case "menu":
        return buildMenu();
      case "events":
        return buildEvents();
      case "contacts":
        return buildContacts();
      case "trash":
        return buildTrash();
      case "public-files":
        return buildPublicFiles(env);
      case "filesystem":
        return buildFilesystem(env);
      case "lore":
        return buildLore(env);
      case "decryptor":
        return buildDecryptor(env);
      case "staff-login":
        return buildStaffLogin();
      case "terminal":
        return buildLegacyTerminalInfo();
      default:
        return textBlock("No content available.");
    }
  }

  function renderBoot() {
    stopClock();
    root.innerHTML = "";
    const shell = document.createElement("section");
    shell.className = "boot-screen";

    const title = document.createElement("div");
    title.className = "boot-title";
    title.textContent = "SAFEHOUSE SYSTEMS // P-59 MAIN TERMINAL";

    const log = document.createElement("pre");
    log.className = "boot-log";

    const prompt = document.createElement("div");
    prompt.className = "boot-prompt";
    prompt.textContent = "INITIALIZING GUEST INTERFACE...";

    shell.appendChild(title);
    shell.appendChild(log);
    shell.appendChild(prompt);
    root.appendChild(shell);

    const lines = [
      "[0000.001] Boot ROM: SoftCo Microkernel Loader 8.4.59",
      "[0000.014] CPU Cluster: VT-Radial 12 Core ............... OK",
      "[0000.027] Core Memory Bank A ............................ OK",
      "[0000.039] Core Memory Bank B ............................ OK",
      "[0000.052] I/O Bus Bridge ................................. OK",
      "[0000.066] Glass-TTY Matrix .............................. READY",
      "[0000.081] Storage Array /bar /public /secure ............ MOUNTED",
      "[0000.098] Service Modules: menu contacts events .......... LOADED",
      "[0000.112] Staff Partition ................................ LOCKED",
      "[0000.129] Guest Console ................................. ONLINE",
      "[0000.146] Security Checksum: 9A1F-3C44 .................. VALID",
      "[0000.159] Hand-off: SAFEHOUSE GUEST TERMINAL"
    ];

    let idx = 0;
    let timer = null;
    let advanceTimer = null;

    function cleanup() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (advanceTimer) {
        clearTimeout(advanceTimer);
        advanceTimer = null;
      }
    }

    function finishBoot() {
      prompt.classList.add("visible");
      advanceTimer = setTimeout(() => {
        cleanup();
        appState.phase = "intro";
        render(true);
      }, 950);
    }

    timer = setInterval(() => {
      if (idx >= lines.length) {
        cleanup();
        finishBoot();
        return;
      }
      log.textContent += lines[idx] + "\n";
      log.scrollTop = log.scrollHeight;
      idx += 1;
    }, 95);

    shell.addEventListener(
      "v2-destroy",
      () => {
        cleanup();
      },
      { once: true }
    );
  }

  function renderLanguageGate() {
    stopClock();
    root.innerHTML = "";
    const gate = document.createElement("section");
    gate.className = "language-gate";

    const logo = document.createElement("div");
    logo.className = "language-logo";

    const picture = document.createElement("picture");
    picture.className = "language-logo-picture";

    const sourceMobile = document.createElement("source");
    sourceMobile.media = "(max-width: 760px)";
    sourceMobile.srcset = "assets/language-logo-mobile-crop.png?v=20260303-logo2";

    const img = document.createElement("img");
    img.className = "language-logo-image";
    img.src = "assets/language-logo-desktop-crop.png?v=20260303-logo2";
    img.alt = "The Safehouse";
    img.loading = "eager";

    picture.appendChild(sourceMobile);
    picture.appendChild(img);
    logo.appendChild(picture);

    const subtitle = document.createElement("div");
    subtitle.className = "language-subtitle";
    subtitle.textContent = "GUEST TERMINAL // POWERED BY SOFTCO";

    const hint = document.createElement("div");
    hint.className = "language-hint";
    hint.textContent = "Select interface language:";

    const choices = document.createElement("div");
    choices.className = "language-choices";

    LANGUAGES.forEach((lang) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "language-button";
      if (lang.code === "tlh") {
        button.classList.add("language-button-klingon");
      }
      button.textContent = lang.label;
      button.addEventListener("click", () => {
        appState.language = lang.code;
        persistLanguage();
        appState.phase = "main";
        mode = "";
        render(true);
      });
      choices.appendChild(button);
    });

    gate.appendChild(logo);
    gate.appendChild(subtitle);
    gate.appendChild(hint);
    gate.appendChild(choices);
    root.appendChild(gate);
  }

  function renderMobile() {
    root.innerHTML = "";
    const shell = document.createElement("div");
    shell.className = "mobile-shell";

    const status = document.createElement("div");
    status.className = "mobile-status";
    const statusLeft = document.createElement("span");
    statusLeft.textContent = "SAFEHOUSE NET // " + sessionRoleText() + " // " + languageLabel();
    const statusRight = document.createElement("span");
    statusRight.textContent = clockText();
    status.appendChild(statusLeft);
    status.appendChild(statusRight);

    const brand = document.createElement("div");
    brand.className = "mobile-brand";
    const brandName = document.createElement("div");
    brandName.className = "mobile-brand-name";
    brandName.textContent = "THE SAFEHOUSE";
    const brandSub = document.createElement("div");
    brandSub.className = "mobile-brand-sub";
    brandSub.textContent = "COCKTAIL BAR // POST-SURFACE DISTRICT";
    const brandNow = document.createElement("div");
    brandNow.className = "mobile-brand-now";
    brandNow.textContent = "Now Serving: Masaya Highball";
    brand.appendChild(brandName);
    brand.appendChild(brandSub);
    brand.appendChild(brandNow);

    const grid = document.createElement("div");
    grid.className = "mobile-grid";

    const launchpad = document.createElement("section");
    launchpad.className = "mobile-launchpad";
    const launchpadTitle = document.createElement("div");
    launchpadTitle.className = "mobile-launchpad-title";
    launchpadTitle.textContent = "Quick Access";
    launchpad.appendChild(launchpadTitle);
    launchpad.appendChild(grid);

    const panel = document.createElement("div");
    panel.className = "mobile-panel";
    const panelHeader = document.createElement("div");
    panelHeader.className = "mobile-panel-header";
    const panelTitle = document.createElement("div");
    panelTitle.className = "mobile-panel-title";
    const panelClose = document.createElement("button");
    panelClose.className = "mobile-panel-close";
    panelClose.type = "button";
    panelClose.textContent = "back";
    const panelContent = document.createElement("div");
    panelContent.className = "mobile-panel-content";
    panelHeader.appendChild(panelTitle);
    panelHeader.appendChild(panelClose);
    panel.appendChild(panelHeader);
    panel.appendChild(panelContent);

    function openPanel(appId) {
      const app = appById.get(appId);
      if (!app) {
        return;
      }
      panelTitle.textContent = app.title;
      panelContent.innerHTML = "";
      panelContent.appendChild(buildAppContent(appId, null));
      panel.classList.add("open");
      panelContent.scrollTop = 0;
    }

    function closePanel() {
      panel.style.transition = "";
      panel.style.transform = "";
      panel.classList.remove("open");
    }

    panelClose.addEventListener("click", closePanel);

    let swipe = null;
    panelHeader.addEventListener("touchstart", (event) => {
      if (!panel.classList.contains("open")) {
        return;
      }
      if (!event.touches || event.touches.length !== 1) {
        return;
      }
      swipe = {
        startY: event.touches[0].clientY,
        dy: 0
      };
      panel.style.transition = "none";
    });

    panelHeader.addEventListener("touchmove", (event) => {
      if (!swipe || !event.touches || event.touches.length !== 1) {
        return;
      }
      swipe.dy = Math.max(0, event.touches[0].clientY - swipe.startY);
      panel.style.transform = "translateY(" + swipe.dy + "px)";
    });

    function endSwipe() {
      if (!swipe) {
        return;
      }
      const shouldClose = swipe.dy > 90;
      swipe = null;
      panel.style.transition = "";
      panel.style.transform = "";
      if (shouldClose) {
        closePanel();
      }
    }

    panelHeader.addEventListener("touchend", endSwipe);
    panelHeader.addEventListener("touchcancel", endSwipe);

    APPS.forEach((app) => {
      const icon = document.createElement("button");
      icon.type = "button";
      icon.className = "mobile-app";
      icon.setAttribute("aria-label", app.title);

      const glyph = createAppGlyphElement(app, "mobile-app-glyph");

      const label = document.createElement("div");
      label.className = "mobile-app-label";
      label.textContent = app.label;

      icon.appendChild(glyph);
      icon.appendChild(label);
      icon.addEventListener("click", () => openPanel(app.id));
      grid.appendChild(icon);
    });

    const dock = document.createElement("div");
    dock.className = "mobile-dock";
    dock.textContent = "tap icon // swipe panel down to close";

    shell.appendChild(status);
    shell.appendChild(brand);
    shell.appendChild(launchpad);
    shell.appendChild(dock);
    shell.appendChild(panel);
    root.appendChild(shell);

    const unbind = onSession(() => {
      statusLeft.textContent = "SAFEHOUSE NET // " + sessionRoleText() + " // " + languageLabel();
    });
    shell.addEventListener(
      "v2-destroy",
      () => {
        unbind();
      },
      { once: true }
    );

    stopClock();
    clockHandle = setInterval(() => {
      statusRight.textContent = clockText();
      statusLeft.textContent = "SAFEHOUSE NET // " + sessionRoleText() + " // " + languageLabel();
    }, 1000 * 30);
  }

  function renderDesktop() {
    root.innerHTML = "";
    const shell = document.createElement("div");
    shell.className = "desktop-shell";

    const topbar = document.createElement("div");
    topbar.className = "desktop-topbar";
    const brand = document.createElement("div");
    brand.className = "desktop-brand";

    const brandTitle = document.createElement("span");
    brandTitle.className = "desktop-brand-title";
    brandTitle.textContent = "safehouse crt os // p-59";

    const menu = document.createElement("div");
    menu.className = "desktop-menu";
    const menuGroups = new Map();
    let openMenuName = "";
    let showHiddenApps = false;
    let viewMenuBtn = null;
    let viewHiddenRow = null;

    function setMenuOpen(menuId) {
      openMenuName = menuId || "";
      menuGroups.forEach((entry, id) => {
        const isOpen = openMenuName === id;
        entry.group.classList.toggle("open", isOpen);
        entry.button.classList.toggle("menu-open", isOpen);
        entry.button.setAttribute("aria-expanded", isOpen ? "true" : "false");
        entry.panel.hidden = !isOpen;
      });
    }

    function closeMenus() {
      setMenuOpen("");
    }

    function createMenuGroup(menuId, label) {
      const group = document.createElement("div");
      group.className = "desktop-menu-group";
      group.dataset.menu = menuId;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "desktop-menu-item";
      button.textContent = label;
      button.setAttribute("aria-haspopup", "true");
      button.setAttribute("aria-expanded", "false");

      const panel = document.createElement("div");
      panel.className = "desktop-menu-panel";
      panel.hidden = true;

      group.appendChild(button);
      group.appendChild(panel);
      menu.appendChild(group);
      menuGroups.set(menuId, { group, button, panel });

      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setMenuOpen(openMenuName === menuId ? "" : menuId);
      });

      return { button, panel };
    }

    function addMenuAction(panel, label, onSelect, opts) {
      const options = opts || {};
      const row = document.createElement("button");
      row.type = "button";
      row.className = "desktop-menu-row";
      row.textContent = label;
      if (options.checked) {
        row.classList.add("checked");
      }
      if (options.disabled) {
        row.disabled = true;
      }
      row.addEventListener("click", (event) => {
        event.stopPropagation();
        if (row.disabled) {
          return;
        }
        if (typeof onSelect === "function") {
          onSelect();
        }
        closeMenus();
      });
      panel.appendChild(row);
      return row;
    }

    function addMenuDivider(panel) {
      const divider = document.createElement("div");
      divider.className = "desktop-menu-divider";
      panel.appendChild(divider);
    }

    const fileMenu = createMenuGroup("file", "file");
    addMenuAction(fileMenu.panel, "Reopen startup windows", () => {
      openStartupWindows();
    });
    addMenuAction(fileMenu.panel, "Minimize all windows", () => {
      windowMap.forEach((win, windowKey) => {
        const titleNode = win.querySelector(".v2-window-title");
        const dockLabel = titleNode ? titleNode.textContent || "window" : "window";
        minimizeWindow(windowKey, dockLabel);
      });
    });

    const editMenu = createMenuGroup("edit", "edit");
    addMenuAction(editMenu.panel, "Reset icon positions", () => {
      Object.keys(iconLayout).forEach((key) => {
        delete iconLayout[key];
      });
      APPS.forEach((app, index) => {
        const iconEl = icons.querySelector(".desktop-icon[data-app-id='" + app.id + "']");
        if (!iconEl) {
          return;
        }
        const next = clampIconPosition(defaultIconPosition(index), iconEl);
        iconEl.style.left = next.x + "px";
        iconEl.style.top = next.y + "px";
      });
      saveStoredIconLayout(iconLayout);
    });

    const viewMenu = createMenuGroup("view", "view");
    viewMenuBtn = viewMenu.button;
    viewHiddenRow = addMenuAction(viewMenu.panel, "Show hidden apps", () => {
      showHiddenApps = !showHiddenApps;
      applyHiddenIconVisibility();
      ensureIconLayoutNoOverlap();
    });

    const toolsMenu = createMenuGroup("tools", "tools");
    addMenuAction(toolsMenu.panel, "Open file repair", () => {
      createAppWindow("decryptor");
    });
    addMenuAction(toolsMenu.panel, "Open terminal", () => {
      createAppWindow("terminal");
    });
    addMenuDivider(toolsMenu.panel);
    addMenuAction(toolsMenu.panel, "Open recycle bin", () => {
      createAppWindow("trash");
    });

    brand.appendChild(brandTitle);
    brand.appendChild(menu);

    const right = document.createElement("div");
    right.className = "desktop-topbar-right";

    const role = document.createElement("div");
    role.className = "desktop-role";
    role.textContent = sessionRoleText();

    const clock = document.createElement("div");
    clock.className = "desktop-clock";
    clock.textContent = clockText();

    right.appendChild(role);
    right.appendChild(clock);

    topbar.appendChild(brand);
    topbar.appendChild(right);

    const workspace = document.createElement("div");
    workspace.className = "desktop-workspace";

    const icons = document.createElement("div");
    icons.className = "desktop-icons";

    const windows = document.createElement("div");
    windows.className = "desktop-windows";

    const dock = document.createElement("div");
    dock.className = "desktop-dock";

    workspace.appendChild(icons);
    workspace.appendChild(windows);
    workspace.appendChild(dock);
    shell.appendChild(topbar);
    shell.appendChild(workspace);
    root.appendChild(shell);

    const onGlobalPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!topbar.contains(target)) {
        closeMenus();
      }
    };

    const onGlobalKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMenus();
      }
    };

    window.addEventListener("pointerdown", onGlobalPointerDown);
    window.addEventListener("keydown", onGlobalKeyDown);

    const windowMap = new Map();
    const minimizedMap = new Map();
    let zCursor = 40;

    function applyHiddenIconVisibility() {
      shell.classList.toggle("show-hidden-apps", showHiddenApps);
      if (viewMenuBtn) {
        viewMenuBtn.classList.toggle("active", showHiddenApps);
        viewMenuBtn.title = showHiddenApps ? "Hide hidden desktop apps" : "Show hidden desktop apps";
      }
      if (viewHiddenRow) {
        viewHiddenRow.classList.toggle("checked", showHiddenApps);
        viewHiddenRow.textContent = (showHiddenApps ? "Hide hidden apps" : "Show hidden apps");
      }
    }

    function keyForApp(appId) {
      return "app:" + appId;
    }

    function keyForFile(path) {
      return "file:" + normalizePath(path);
    }

    function bringToFront(win) {
      zCursor += 1;
      win.style.zIndex = String(zCursor);
      windows.querySelectorAll(".v2-window").forEach((node) => node.classList.remove("active"));
      win.classList.add("active");
    }

    function clampWindow(win) {
      const rect = windows.getBoundingClientRect();
      const minW = 320;
      const minH = 220;
      const maxW = Math.max(minW, rect.width - 16);
      const maxH = Math.max(minH, rect.height - 16);
      let w = win.offsetWidth;
      let h = win.offsetHeight;
      if (w > maxW) {
        w = maxW;
        win.style.width = w + "px";
      }
      if (h > maxH) {
        h = maxH;
        win.style.height = h + "px";
      }
      let left = parseFloat(win.style.left || "0");
      let top = parseFloat(win.style.top || "0");
      left = Math.max(8, Math.min(rect.width - w - 8, left));
      top = Math.max(8, Math.min(rect.height - h - 8, top));
      win.style.left = left + "px";
      win.style.top = top + "px";
    }

    function removeFromDock(windowKey) {
      const chip = minimizedMap.get(windowKey);
      if (!chip) {
        return;
      }
      chip.remove();
      minimizedMap.delete(windowKey);
    }

    function restoreWindow(windowKey) {
      const win = windowMap.get(windowKey);
      if (!win) {
        return;
      }
      win.dataset.minimized = "0";
      win.style.display = "grid";
      removeFromDock(windowKey);
      bringToFront(win);
      clampWindow(win);
    }

    function minimizeWindow(windowKey, dockLabel) {
      const win = windowMap.get(windowKey);
      if (!win) {
        return;
      }
      if (minimizedMap.has(windowKey)) {
        return;
      }
      win.dataset.minimized = "1";
      win.style.display = "none";

      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "desktop-dock-item";
      chip.textContent = dockLabel;
      chip.addEventListener("click", () => restoreWindow(windowKey));
      dock.appendChild(chip);
      minimizedMap.set(windowKey, chip);
    }

    function createShellWindow(windowKey, titleText, dockLabel) {
      if (windowMap.has(windowKey)) {
        const existing = windowMap.get(windowKey);
        if (existing.dataset.minimized === "1") {
          restoreWindow(windowKey);
        }
        bringToFront(existing);
        return {
          win: existing,
          body: existing.querySelector(".v2-window-body"),
          created: false
        };
      }

      const win = document.createElement("article");
      win.className = "v2-window";
      win.dataset.minimized = "0";

      const header = document.createElement("header");
      header.className = "v2-window-header";

      const title = document.createElement("div");
      title.className = "v2-window-title";
      title.textContent = titleText;

      const controls = document.createElement("div");
      controls.className = "v2-window-controls";

      const minBtn = document.createElement("button");
      minBtn.className = "v2-window-btn";
      minBtn.type = "button";
      minBtn.textContent = "_";

      const closeBtn = document.createElement("button");
      closeBtn.className = "v2-window-btn";
      closeBtn.type = "button";
      closeBtn.textContent = "x";

      controls.appendChild(minBtn);
      controls.appendChild(closeBtn);
      header.appendChild(title);
      header.appendChild(controls);

      const body = document.createElement("div");
      body.className = "v2-window-body";

      const resizer = document.createElement("div");
      resizer.className = "v2-window-resize";
      resizer.setAttribute("aria-hidden", "true");

      win.appendChild(header);
      win.appendChild(body);
      win.appendChild(resizer);
      windows.appendChild(win);

      const offset = windowMap.size;
      const bounds = windows.getBoundingClientRect();
      const defaultW = Math.max(560, Math.min(980, Math.round(bounds.width * 0.54)));
      const defaultH = Math.max(360, Math.min(640, Math.round(bounds.height * 0.56)));
      const anchorLeft = Math.max(24, Math.round((bounds.width - defaultW) * 0.5));
      const anchorTop = Math.max(18, Math.round((bounds.height - defaultH) * 0.2));
      win.style.width = defaultW + "px";
      win.style.height = defaultH + "px";
      win.style.left = anchorLeft + offset * 22 + "px";
      win.style.top = anchorTop + offset * 18 + "px";

      windowMap.set(windowKey, win);
      bringToFront(win);
      requestAnimationFrame(() => clampWindow(win));

      closeBtn.addEventListener("click", () => {
        removeFromDock(windowKey);
        windowMap.delete(windowKey);
        win.remove();
      });

      minBtn.addEventListener("click", () => {
        minimizeWindow(windowKey, dockLabel);
      });

      win.addEventListener("pointerdown", () => bringToFront(win));

      let drag = null;
      header.addEventListener("pointerdown", (event) => {
        const target = event.target;
        if (target instanceof Element && target.closest(".v2-window-btn")) {
          return;
        }
        bringToFront(win);
        const box = win.getBoundingClientRect();
        drag = {
          id: event.pointerId,
          dx: event.clientX - box.left,
          dy: event.clientY - box.top
        };
        header.setPointerCapture(event.pointerId);
      });

      header.addEventListener("pointermove", (event) => {
        if (!drag || event.pointerId !== drag.id) {
          return;
        }
        const rect = windows.getBoundingClientRect();
        const left = event.clientX - rect.left - drag.dx;
        const top = event.clientY - rect.top - drag.dy;
        win.style.left = left + "px";
        win.style.top = top + "px";
        clampWindow(win);
      });

      function stopDrag(event) {
        if (!drag || event.pointerId !== drag.id) {
          return;
        }
        drag = null;
        try {
          header.releasePointerCapture(event.pointerId);
        } catch (_ignore) {
          // no-op
        }
      }

      header.addEventListener("pointerup", stopDrag);
      header.addEventListener("pointercancel", stopDrag);

      let resize = null;
      resizer.addEventListener("pointerdown", (event) => {
        bringToFront(win);
        resize = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startW: win.offsetWidth,
          startH: win.offsetHeight
        };
        resizer.setPointerCapture(event.pointerId);
      });

      resizer.addEventListener("pointermove", (event) => {
        if (!resize || event.pointerId !== resize.id) {
          return;
        }
        const rect = windows.getBoundingClientRect();
        const left = parseFloat(win.style.left || "0");
        const top = parseFloat(win.style.top || "0");
        const maxW = Math.max(320, rect.width - left - 8);
        const maxH = Math.max(220, rect.height - top - 8);
        const nextW = Math.max(320, Math.min(maxW, resize.startW + (event.clientX - resize.startX)));
        const nextH = Math.max(220, Math.min(maxH, resize.startH + (event.clientY - resize.startY)));
        win.style.width = nextW + "px";
        win.style.height = nextH + "px";
      });

      function stopResize(event) {
        if (!resize || event.pointerId !== resize.id) {
          return;
        }
        resize = null;
        try {
          resizer.releasePointerCapture(event.pointerId);
        } catch (_ignore) {
          // no-op
        }
        clampWindow(win);
      }

      resizer.addEventListener("pointerup", stopResize);
      resizer.addEventListener("pointercancel", stopResize);
      return { win, body, created: true };
    }

    function documentDockLabel(path) {
      const name = normalizePath(path).split("/").filter(Boolean).slice(-1)[0] || "file";
      return "DOC " + name;
    }

    function buildDocumentContent(path) {
      const wrap = document.createElement("section");
      wrap.className = "v2-document";

      const pathBar = document.createElement("div");
      pathBar.className = "v2-document-path";
      pathBar.textContent = normalizePath(path);
      pathBar.draggable = true;
      pathBar.title = "Drag this file path into File Repair";
      pathBar.addEventListener("dragstart", (event) => {
        const dt = event.dataTransfer;
        if (!dt) {
          return;
        }
        const normalized = normalizePath(path);
        dt.effectAllowed = "copyMove";
        dt.setData("text/safehouse-path", normalized);
        dt.setData("text/plain", normalized);
      });

      const content = document.createElement("pre");
      content.className = "v2-document-content";
      content.textContent = readFileText(path) || "file unavailable";

      wrap.appendChild(pathBar);
      wrap.appendChild(content);
      return wrap;
    }

    function openDocumentWindow(path) {
      const normalized = normalizePath(path);
      if (!isFile(normalized)) {
        return;
      }
      if (!canAccess(normalized)) {
        return;
      }
      const title = "Document // " + normalized.split("/").filter(Boolean).slice(-1)[0];
      const windowKey = keyForFile(normalized);
      const shellWindow = createShellWindow(windowKey, title, documentDockLabel(normalized));
      if (shellWindow.created) {
        shellWindow.body.appendChild(buildDocumentContent(normalized));
      }
    }

    function openFileSystemWindow() {
      return createAppWindow("filesystem");
    }

    const desktopEnv = {
      openDocumentWindow,
      openFileSystem: openFileSystemWindow,
      enableFileDrag: true
    };

    function createAppWindow(appId) {
      const app = appById.get(appId);
      if (!app) {
        return null;
      }
      const shellWindow = createShellWindow(
        keyForApp(appId),
        app.title,
        app.glyph + " " + app.label
      );
      if (shellWindow.created) {
        const content = buildAppContent(appId, desktopEnv);
        shellWindow.body.appendChild(content);
        if (content instanceof Element && content.classList.contains("v2-fs")) {
          shellWindow.body.classList.add("v2-window-body-fs");
        }
        if (appId === "decryptor") {
          const bounds = windows.getBoundingClientRect();
          setWindowFrame(shellWindow.win, {
            width: Math.max(920, Math.min(1360, Math.round(bounds.width * 0.82))),
            height: Math.max(620, Math.min(920, Math.round(bounds.height * 0.8))),
            left: Math.max(12, Math.round(bounds.width * 0.04)),
            top: Math.max(10, Math.round(bounds.height * 0.04))
          });
        }
      }
      return shellWindow.win;
    }

    function setWindowFrame(win, frame) {
      if (!win || !frame) {
        return;
      }
      if (typeof frame.width === "number") {
        win.style.width = Math.round(frame.width) + "px";
      }
      if (typeof frame.height === "number") {
        win.style.height = Math.round(frame.height) + "px";
      }
      if (typeof frame.left === "number") {
        win.style.left = Math.round(frame.left) + "px";
      }
      if (typeof frame.top === "number") {
        win.style.top = Math.round(frame.top) + "px";
      }
      clampWindow(win);
    }

    function openStartupWindows() {
      const bounds = windows.getBoundingClientRect();
      if (bounds.width < 820 || bounds.height < 520) {
        createAppWindow("hours");
        createAppWindow("contacts");
        createAppWindow("location");
        return;
      }

      const pad = 14;
      const gap = 14;
      const usableWidth = Math.max(640, bounds.width - pad * 2 - gap);
      let leftWidth = Math.round(usableWidth * 0.43);
      leftWidth = Math.max(360, Math.min(620, leftWidth));
      let rightWidth = usableWidth - leftWidth;
      if (rightWidth < 420) {
        rightWidth = 420;
        leftWidth = Math.max(320, usableWidth - rightWidth);
      }

      const leftX = pad;
      const rightX = leftX + leftWidth + gap;
      const topY = pad;
      const hoursHeight = Math.max(250, Math.min(390, Math.round(bounds.height * 0.33)));
      const contactsHeight = Math.max(250, Math.min(370, Math.round(bounds.height * 0.31)));
      const contactsTop = topY + hoursHeight + gap;
      const locationHeight = Math.max(440, Math.min(bounds.height - pad * 2, Math.round(bounds.height * 0.88)));

      const hoursWin = createAppWindow("hours");
      const contactsWin = createAppWindow("contacts");
      const locationWin = createAppWindow("location");

      setWindowFrame(hoursWin, {
        left: leftX,
        top: topY,
        width: leftWidth,
        height: hoursHeight
      });
      setWindowFrame(contactsWin, {
        left: leftX,
        top: contactsTop,
        width: leftWidth,
        height: contactsHeight
      });
      setWindowFrame(locationWin, {
        left: rightX,
        top: topY,
        width: rightWidth,
        height: locationHeight
      });

      if (locationWin) {
        bringToFront(locationWin);
      }
    }

    function readStoredIconLayout() {
      try {
        const version = window.localStorage.getItem(STORAGE_KEYS.iconLayoutVersion);
        if (version !== ICON_LAYOUT_VERSION) {
          window.localStorage.removeItem(STORAGE_KEYS.iconLayout);
          window.localStorage.setItem(STORAGE_KEYS.iconLayoutVersion, ICON_LAYOUT_VERSION);
          return {};
        }
        const raw = window.localStorage.getItem(STORAGE_KEYS.iconLayout);
        if (!raw) {
          return {};
        }
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      } catch (_ignore) {
        // no-op
      }
      return {};
    }

    function saveStoredIconLayout(layout) {
      try {
        window.localStorage.setItem(STORAGE_KEYS.iconLayoutVersion, ICON_LAYOUT_VERSION);
        window.localStorage.setItem(STORAGE_KEYS.iconLayout, JSON.stringify(layout));
      } catch (_ignore) {
        // no-op
      }
    }

    function gridRows() {
      const rect = workspace.getBoundingClientRect();
      const estimated = Math.floor((rect.height - 28) / 176);
      return Math.max(4, Math.min(6, estimated));
    }

    function defaultIconPosition(index) {
      const rows = gridRows();
      const col = Math.floor(index / rows);
      const row = index % rows;
      return {
        x: 22 + col * 192,
        y: 18 + row * 176
      };
    }

    function snapToGrid(value, step) {
      return Math.round(value / step) * step;
    }

    function clampIconPosition(pos, iconEl) {
      const rect = workspace.getBoundingClientRect();
      const w = iconEl.offsetWidth || 152;
      const h = iconEl.offsetHeight || 132;
      return {
        x: Math.max(8, Math.min(rect.width - w - 8, pos.x)),
        y: Math.max(8, Math.min(rect.height - h - 44, pos.y))
      };
    }

    const iconLayout = readStoredIconLayout();

    function iconBoxesOverlap(a, b) {
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    function collectVisibleIconBoxes() {
      const boxes = [];
      icons.querySelectorAll(".desktop-icon").forEach((iconEl) => {
        const icon = iconEl;
        if (!showHiddenApps && icon.classList.contains("desktop-icon-hidden")) {
          return;
        }
        const left = parseFloat(icon.style.left || "0");
        const top = parseFloat(icon.style.top || "0");
        const width = icon.offsetWidth || 152;
        const height = icon.offsetHeight || 156;
        boxes.push({
          left,
          top,
          right: left + width,
          bottom: top + height
        });
      });
      return boxes;
    }

    function hasVisibleIconOverlap() {
      const boxes = collectVisibleIconBoxes();
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          if (iconBoxesOverlap(boxes[i], boxes[j])) {
            return true;
          }
        }
      }
      return false;
    }

    function resetIconLayoutToGrid() {
      Object.keys(iconLayout).forEach((key) => {
        delete iconLayout[key];
      });
      APPS.forEach((app, index) => {
        const icon = icons.querySelector(".desktop-icon[data-app-id='" + app.id + "']");
        if (!icon) {
          return;
        }
        const next = clampIconPosition(defaultIconPosition(index), icon);
        icon.style.left = next.x + "px";
        icon.style.top = next.y + "px";
        iconLayout[app.id] = { x: next.x, y: next.y };
      });
      saveStoredIconLayout(iconLayout);
    }

    function ensureIconLayoutNoOverlap() {
      if (!hasVisibleIconOverlap()) {
        return;
      }
      resetIconLayoutToGrid();
    }

    APPS.forEach((app) => {
      const icon = document.createElement("button");
      icon.type = "button";
      icon.className = "desktop-icon";
      icon.dataset.appId = app.id;
      if (app.hiddenByDefault) {
        icon.classList.add("desktop-icon-hidden");
      }

      const glyph = createAppGlyphElement(app, "desktop-icon-glyph");

      const label = document.createElement("span");
      label.className = "desktop-icon-label";
      label.textContent = app.label;

      icon.appendChild(glyph);
      icon.appendChild(label);

      const saved = iconLayout[app.id];
      const base = saved && typeof saved.x === "number" && typeof saved.y === "number"
        ? { x: saved.x, y: saved.y }
        : defaultIconPosition(APPS.indexOf(app));
      const clamped = clampIconPosition(base, icon);
      icon.style.left = clamped.x + "px";
      icon.style.top = clamped.y + "px";

      let drag = null;
      icon.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) {
          return;
        }
        drag = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: parseFloat(icon.style.left || "0"),
          originY: parseFloat(icon.style.top || "0"),
          moved: false
        };
        icon.setPointerCapture(event.pointerId);
      });

      icon.addEventListener("pointermove", (event) => {
        if (!drag || event.pointerId !== drag.id) {
          return;
        }
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          drag.moved = true;
        }
        if (!drag.moved) {
          return;
        }
        const next = clampIconPosition({ x: drag.originX + dx, y: drag.originY + dy }, icon);
        icon.style.left = next.x + "px";
        icon.style.top = next.y + "px";
      });

      function stopIconDrag(event) {
        if (!drag || event.pointerId !== drag.id) {
          return;
        }
        const moved = drag.moved;
        drag = null;
        try {
          icon.releasePointerCapture(event.pointerId);
        } catch (_ignore) {
          // no-op
        }

        if (moved) {
          const snapped = clampIconPosition(
            {
              x: snapToGrid(parseFloat(icon.style.left || "0"), 8),
              y: snapToGrid(parseFloat(icon.style.top || "0"), 8)
            },
            icon
          );
          icon.style.left = snapped.x + "px";
          icon.style.top = snapped.y + "px";
          iconLayout[app.id] = {
            x: parseFloat(icon.style.left || "0"),
            y: parseFloat(icon.style.top || "0")
          };
          saveStoredIconLayout(iconLayout);
          return;
        }
        createAppWindow(app.id);
      }

      icon.addEventListener("pointerup", stopIconDrag);
      icon.addEventListener("pointercancel", stopIconDrag);
      icons.appendChild(icon);
    });

    applyHiddenIconVisibility();
    ensureIconLayoutNoOverlap();
    openStartupWindows();

    function clampDesktopLayout() {
      windowMap.forEach((win) => {
        if (win.dataset.minimized !== "1") {
          clampWindow(win);
        }
      });
      icons.querySelectorAll(".desktop-icon").forEach((iconEl) => {
        const icon = iconEl;
        const snapped = clampIconPosition(
          {
            x: parseFloat(icon.style.left || "0"),
            y: parseFloat(icon.style.top || "0")
          },
          icon
        );
        icon.style.left = snapped.x + "px";
        icon.style.top = snapped.y + "px";
      });
    }

    const onLayoutResize = () => {
      clampDesktopLayout();
    };
    window.addEventListener("v2-layout-resize", onLayoutResize);
    requestAnimationFrame(clampDesktopLayout);

    const unbind = onSession(() => {
      role.textContent = sessionRoleText();
    });

    stopClock();
    clockHandle = setInterval(() => {
      role.textContent = sessionRoleText();
      clock.textContent = clockText();
    }, 1000 * 30);

    // Clean up listener on next full rerender.
    shell.addEventListener(
      "v2-destroy",
      () => {
        unbind();
        window.removeEventListener("v2-layout-resize", onLayoutResize);
        window.removeEventListener("pointerdown", onGlobalPointerDown);
        window.removeEventListener("keydown", onGlobalKeyDown);
      },
      { once: true }
    );
  }

  function render(force) {
    const phase = appState.phase;
    const nextMode = isMobileMode() ? "mobile" : "desktop";
    const shouldRerender =
      Boolean(force) ||
      phase !== renderedPhase ||
      (phase === "main" && (nextMode !== mode || !root.childElementCount));
    if (!shouldRerender) {
      return;
    }

    const previous = root.firstElementChild;
    if (previous) {
      previous.dispatchEvent(new Event("v2-destroy"));
    }

    renderedPhase = phase;
    if (phase === "boot") {
      mode = "";
      renderBoot();
      return;
    }
    if (phase === "intro") {
      mode = "";
      renderLanguageGate();
      return;
    }

    mode = nextMode;
    if (mode === "mobile") {
      renderMobile();
    } else {
      renderDesktop();
    }
  }

  onSession(() => {
    window.dispatchEvent(new Event("v2-session-updated"));
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (appState.phase !== "main") {
        return;
      }
      window.dispatchEvent(new Event("v2-layout-resize"));
      const nextMode = isMobileMode() ? "mobile" : "desktop";
      if (nextMode !== mode) {
        render(true);
      }
    }, 140);
  });

  render();
})();
