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
    iconLayout: "safehouse.v2.icon.layout"
  };

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
    loadedPath: ""
  };

  const uiState = {
    selectedFilePath: ""
  };

  const APPS = [
    { id: "hours", label: "hours", glyph: "H", title: "Service Hours", icon: "assets/icons/hours.svg" },
    { id: "location", label: "location", glyph: "L", title: "Location", icon: "assets/icons/location.svg" },
    { id: "menu", label: "menu", glyph: "M", title: "Bar Menu", icon: "assets/icons/menu.svg" },
    { id: "events", label: "events", glyph: "E", title: "Events", icon: "assets/icons/events.svg" },
    { id: "contacts", label: "contacts", glyph: "C", title: "Contacts", icon: "assets/icons/contacts.svg" },
    { id: "public-files", label: "public files", glyph: "P", title: "Public Files", icon: "assets/icons/public-files.svg" },
    { id: "filesystem", label: "system files", glyph: "FS", title: "File System", icon: "assets/icons/system-files.svg" },
    { id: "lore", label: "archive", glyph: "LR", title: "Lore Archive", icon: "assets/icons/archive.svg" },
    { id: "decryptor", label: "file repair", glyph: "FR", title: "REC-77 File Repair Utility", icon: "assets/icons/file-repair.svg" },
    { id: "staff-login", label: "staff login", glyph: "S", title: "Staff Login", icon: "assets/icons/staff-login.svg" },
    { id: "terminal", label: "terminal", glyph: "T", title: "Legacy Terminal", icon: "assets/icons/terminal.svg" }
  ];

  const appById = new Map(APPS.map((app) => [app.id, app]));

  const VFS = createVfs();
  const listeners = new Set();
  let mode = "";
  let clockHandle = null;

  loadStoredState();

  function loadStoredState() {
    try {
      const solved =
        window.localStorage.getItem(STORAGE_KEYS.repairSolved) === "1" ||
        window.localStorage.getItem(STORAGE_KEYS.decryptSolvedLegacy) === "1";
      repairState.solved = solved;
      if (repairState.solved) {
        repairState.clock = REC77_TARGET.clock;
        repairState.phase = REC77_TARGET.phase;
        repairState.gain = REC77_TARGET.gain;
      }
    } catch (_ignore) {
      repairState.solved = false;
    }
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
    uiState.selectedFilePath = normalizePath(path || "");
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
      "SY09 note: Masaya requested cold chai and silence. C3 table remains reserved.\n" +
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
        "MASAYA CHAI (cold)     11\n" +
        "OXIDE SOUR             12\n" +
        "AFTERGRID NO-PROOF      9",
      "/bar/menu/seasonal-board.txt":
        "SEASONAL BOARD\n" +
        "CANAL FOG RICKEY       13\n" +
        "RUST BLOOM SPRITZ      12\n" +
        "MIDNIGHT BLACK TEA     10",
      "/bar/menu/non-alcoholic.txt":
        "NO-PROOF\n" +
        "Aftergrid No-Proof\n" +
        "Canal Citrus Soda\n" +
        "Dry Juniper Tonic",
      "/bar/menu/masaya-note.txt":
        "MASAYA CHAI\n" +
        "Serve cold.\n" +
        "No garnish.\n" +
        "Low sugar.\n" +
        "Do not warm under any condition.",

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

      "/secure": ["files", "lore", "founder"],

      "/secure/files": ["daily-operations", "staff-records", "internal-messages", "continuity-chain"],
      "/secure/files/daily-operations": ["debrief-sy26-02-22.txt", "debrief-sy26-02-23-masaya.txt"],
      "/secure/files/daily-operations/debrief-sy26-02-22.txt":
        "DEBRIEF SY26-02-22\n" +
        "Crowd pressure rose at 21:40.\n" +
        "Actions: short menu mode, low-noise protocol, one roaming lead.\n" +
        "Result: no incidents, average service delay +4 min.",
      "/secure/files/daily-operations/debrief-sy26-02-23-masaya.txt":
        "DEBRIEF SY26-02-23 / MASAYA\n" +
        "Masaya arrived 21:17, sat at C3.\n" +
        "No menu requested. Ordered Masaya Chai cold.\n" +
        "Stayed 28 min. No spoken words to guests.\n" +
        "Floor noise dropped after his entry.",

      "/secure/files/staff-records": ["erik.profile", "theo.profile", "andrea.profile", "ju.profile", "kenji.profile"],
      "/secure/files/staff-records/erik.profile":
        "ERIK // floor lead\n" +
        "Met during ration line disputes in lower sector.\n" +
        "Trait: calm under pressure, minimal speech, fast decisions.",
      "/secure/files/staff-records/theo.profile":
        "THEO // cellar + utilities\n" +
        "Met during recycler repair shift.\n" +
        "Trait: obsessive precision, no shortcuts, dry humor.",
      "/secure/files/staff-records/andrea.profile":
        "ANDREA // frontdesk\n" +
        "Met on evacuation corridor route SY08.\n" +
        "Trait: excellent memory for names, reads tension early.",
      "/secure/files/staff-records/ju.profile":
        "JU // barback\n" +
        "Met in storage cooperative SY11.\n" +
        "Trait: extremely fast setup, silent on shift.",
      "/secure/files/staff-records/kenji.profile":
        "KENJI // service lane\n" +
        "Met at station west gate blackout night.\n" +
        "Trait: disciplined movement, protects weak guests first.",

      "/secure/files/internal-messages": ["owner-broadcast.txt", "floor-alert-template.txt"],
      "/secure/files/internal-messages/owner-broadcast.txt":
        "OWNER BROADCAST\n" +
        "Keep service tight. No theater. No ego.\n" +
        "When conditions shift: shorten sentences, reduce menu branches.",
      "/secure/files/internal-messages/floor-alert-template.txt":
        "FLOOR ALERT TEMPLATE\n" +
        "[time] [zone] [pressure index]\n" +
        "action: [lights/music/door]\n" +
        "result: [stable/watch/escalate]",

      "/secure/files/continuity-chain": ["continuity-log-sy26-q1.md", "event-consequence-matrix.md"],
      "/secure/files/continuity-chain/continuity-log-sy26-q1.md":
        "# CONTINUITY LOG SY26 Q1\n" +
        "- SY26-02-10: queue spill -> added lane divider\n" +
        "- SY26-02-14: noise spike -> default low music profile\n" +
        "- SY26-02-23: Masaya visit -> C3 dark table kept reserved",
      "/secure/files/continuity-chain/event-consequence-matrix.md":
        "# EVENT CONSEQUENCE MATRIX\n" +
        "Crowd surge -> short menu mode\n" +
        "Guest panic -> low-light + two-option protocol\n" +
        "Utility warning -> reduce ice lane and simplify menu",

      "/secure/lore": [
        "timeline-bunker-fragments.md",
        "emergence-log-sy00-day0.md",
        "emergence-log-sy00-day11.md",
        "masaya-visit-ledger-sy04-sy10.log",
        "second-lock-adoption-sy12.md",
        "clock-drift-incident-sy17.md"
      ],
      "/secure/lore/timeline-bunker-fragments.md":
        "# BUNKER TIMELINE FRAGMENTS\n" +
        "Surface Year 00 marks first coordinated exits.\n" +
        "Before SY00, records conflict across sectors.\n" +
        "Most staff were born underground and inherit contradictory stories.",
      "/secure/lore/emergence-log-sy00-day0.md":
        "EMERGENCE LOG / SY00 DAY 0\n" +
        "We stepped out at dawn under ash haze.\n" +
        "No map matched reality.\n" +
        "First safe room became what is now the Safehouse bar.",
      "/secure/lore/emergence-log-sy00-day11.md":
        "EMERGENCE LOG / SY00 DAY 11\n" +
        "Water lines unstable. Power intermittent.\n" +
        "We learned calm is infrastructure, not mood.",
      "/secure/lore/masaya-visit-ledger-sy04-sy10.log":
        "MASAYA VISIT LEDGER SY04-SY10\n" +
        "SY04-02-09 in 21:14 / out 22:03 / hot tea build only\n" +
        "SY05-01-11 in 22:08 / out 23:22 / asked: same hand on bar?\n" +
        "SY09-12-02 in 22:10 / out 23:14 / no spoken words\n" +
        "SY10-11-17 in 21:26 / out 22:55 / final confirmed entry",
      "/secure/lore/second-lock-adoption-sy12.md":
        "SECOND LOCK ADOPTION / SY12\n" +
        "After two corridor breaches, the inner lock became mandatory.\n" +
        "Entry logic switched from trust to layered verification.",
      "/secure/lore/clock-drift-incident-sy17.md":
        "CLOCK DRIFT INCIDENT / SY17\n" +
        "Four bunker sectors reported different dates by up to 19 days.\n" +
        "Timeline reconciliation failed. We retained SY as local standard.",

      "/secure/founder": [
        "README.txt",
        "journal-sy02-11-03.txt",
        "journal-sy08-09-09.txt",
        "letter-never-sent.txt",
        "masaya-notes.txt",
        "staff-notes"
      ],
      "/secure/founder/README.txt":
        "FOUNDER WORKSPACE\n" +
        "Restricted partition.\n" +
        "Contains private logs, recipe philosophy, and dark-era records.",
      "/secure/founder/journal-sy02-11-03.txt":
        "JOURNAL SY02-11-03\n" +
        "Tonight we served twelve people with six glasses and one intact shaker.\n" +
        "No one asked for hope. They asked for structure.",
      "/secure/founder/journal-sy08-09-09.txt":
        "JOURNAL SY08-09-09\n" +
        "I rewrote the menu language to be shorter.\n" +
        "Long words make anxious guests feel trapped.",
      "/secure/founder/letter-never-sent.txt":
        "LETTER NEVER SENT\n" +
        "If you read this, the plan worked and failed at the same time.\n" +
        "We built a safe room that became a bar because people only sit when they trust the room.\n" +
        "Trust is expensive. Keep paying for it.",
      "/secure/founder/masaya-notes.txt":
        "MASAYA NOTES\n" +
        "He never threatened directly. He changed the room by arriving.\n" +
        "Table C3 stays reserved in low light.\n" +
        "Masaya Chai was stabilized from his specs: cold, no garnish, no ceremony.",

      "/secure/founder/staff-notes": ["index.txt", "erik.story", "andrea.story", "kenji.story"],
      "/secure/founder/staff-notes/index.txt":
        "STAFF NOTES INDEX\n" +
        "private notes on recruitment and trust decisions",
      "/secure/founder/staff-notes/erik.story":
        "ERIK STORY\n" +
        "I met Erik breaking up a queue fight without touching anyone.\n" +
        "He speaks less than most, but every sentence lowers temperature in the room.",
      "/secure/founder/staff-notes/andrea.story":
        "ANDREA STORY\n" +
        "Andrea memorized thirty names on her second shift.\n" +
        "She can tell who is near panic before they sit.",
      "/secure/founder/staff-notes/kenji.story":
        "KENJI STORY\n" +
        "Kenji arrived soaked from canal rain and asked where to stand.\n" +
        "I said by the door. He has protected that line ever since.",

      "/var": ["log"],
      "/var/log": ["service.log", "security.log"],
      "/var/log/service.log":
        "[SY26-02-23 21:17] C3 occupied\n" +
        "[SY26-02-23 21:19] masaya chai sent cold\n" +
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
    const entries = filterVisibleChildren(path);
    if (!entries.length) {
      return "(empty or restricted)";
    }
    return entries
      .map((entry) => {
        if (entry.locked) {
          return "[L] " + entry.name;
        }
        return (entry.kind === "dir" ? "[D] " : "[F] ") + entry.name;
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
      glyph.appendChild(img);
      return glyph;
    }
    glyph.textContent = app.glyph;
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

    const summary = document.createElement("div");
    summary.className = "v2-muted";

    const importRow = document.createElement("div");
    importRow.className = "v2-repair-import";

    const loadTargetBtn = document.createElement("button");
    loadTargetBtn.type = "button";
    loadTargetBtn.textContent = "load target rec-77";
    loadTargetBtn.className = "v2-decrypt-reset";

    const loadSelectedBtn = document.createElement("button");
    loadSelectedBtn.type = "button";
    loadSelectedBtn.textContent = "load selected file";
    loadSelectedBtn.className = "v2-decrypt-reset";

    const selectedInfo = document.createElement("div");
    selectedInfo.className = "v2-muted";

    const meters = document.createElement("div");
    meters.className = "v2-decrypt-meters";

    const preview = document.createElement("div");
    preview.className = "v2-decrypt-preview";

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
        summary.textContent = "drop rejected: no file payload";
        return;
      }
      if (!isFile(path)) {
        summary.textContent = "drop rejected: source is not a file";
        return;
      }
      if (path !== REC77_PATH) {
        summary.textContent = "unsupported file. only REC-77 can be repaired in this utility.";
        return;
      }
      setLoadedPath(path);
    }

    loadTargetBtn.addEventListener("click", () => {
      handlePathDrop(REC77_PATH);
    });

    loadSelectedBtn.addEventListener("click", () => {
      handlePathDrop(uiState.selectedFilePath);
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
      if (uiState.selectedFilePath) {
        selectedInfo.textContent = "selected: " + uiState.selectedFilePath;
      } else {
        selectedInfo.textContent = "selected: (none)";
      }
    }

    refreshSelectedInfo();
    const onSelect = () => refreshSelectedInfo();
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
        summary.textContent = "load target file first";
        dropZone.textContent =
          "DROP FILE HERE\n\nTarget: /public/corrupted-file-77.bin\nDrag the file from File System into this area.";
        controls.style.display = "none";
        meters.style.display = "none";
        preview.style.display = "none";
        return;
      }

      dropZone.textContent = "Loaded: " + repairWorkbench.loadedPath;
      controls.style.display = "grid";
      meters.style.display = "flex";
      preview.style.display = "block";

      const integrity = repairIntegrity();
      const solved = repairDistance() === 0 || repairState.solved;

      if (solved) {
        repairState.solved = true;
        persistRepairSolved();
        summary.textContent =
          "REC-77 repaired // integrity 100% // credentials available in Staff Login and file system";
        preview.textContent = repairedRecordText();
        return;
      }

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
    importRow.appendChild(loadTargetBtn);
    importRow.appendChild(loadSelectedBtn);
    wrap.appendChild(importRow);
    wrap.appendChild(selectedInfo);
    wrap.appendChild(dropZone);
    wrap.appendChild(controls);
    wrap.appendChild(meters);
    wrap.appendChild(preview);
    renderFrame();
    return wrap;
  }

  function createFilesystemBrowser(startPath, options) {
    const rootPath = normalizePath(options && options.rootPath ? options.rootPath : "/");
    const state = {
      cwd: normalizePath(startPath || rootPath),
      selectedFile: "",
      viewMode: "tree",
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
    const viewModes = document.createElement("div");
    viewModes.className = "v2-fs-viewmodes";

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

    const treeModeBtn = document.createElement("button");
    treeModeBtn.type = "button";
    treeModeBtn.textContent = "tree";

    const listModeBtn = document.createElement("button");
    listModeBtn.type = "button";
    listModeBtn.textContent = "list";

    viewModes.appendChild(treeModeBtn);
    viewModes.appendChild(listModeBtn);

    toolbar.appendChild(pathEl);
    toolbar.appendChild(actions);
    toolbar.appendChild(viewModes);

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
        return "[L] " + entry.name;
      }
      return (entry.kind === "dir" ? "[D] " : "[F] ") + entry.name;
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
        const marker = locked ? "x" : expanded ? "▾" : "▸";
        row.textContent = marker + " " + (name || "/");

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

      treeModeBtn.classList.toggle("active", state.viewMode === "tree");
      listModeBtn.classList.toggle("active", state.viewMode === "list");
      wrap.classList.toggle("list-mode", state.viewMode === "list");
      tree.classList.toggle("hidden", state.viewMode !== "tree");

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

        const glyph = document.createElement("span");
        glyph.className = "v2-fs-entry-glyph";
        glyph.textContent = entry.locked ? "L" : entry.kind === "dir" ? "D" : "F";

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

      if (state.viewMode === "list" && options && typeof options.onOpenFile === "function") {
        view.textContent = "Select a file to open it in a new window.";
      } else if (state.selectedFile && isFile(state.selectedFile) && canAccess(state.selectedFile)) {
        view.textContent = readFileText(state.selectedFile);
      } else {
        view.textContent =
          "directory: " +
          state.cwd +
          "\n\n" +
          listPathLines(state.cwd) +
          "\n\nOpen [D] to enter, [F] to read, [L] requires auth.";
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

    treeModeBtn.addEventListener("click", () => {
      state.viewMode = "tree";
      renderView();
    });

    listModeBtn.addEventListener("click", () => {
      state.viewMode = "list";
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
        "LORE ARCHIVE LOCKED\n\nStaff login required to access /secure/lore.\nUse File Repair app to restore REC-77, then authenticate in Staff Login."
      );
    }
    return createFilesystemBrowser("/secure/lore", {
      rootPath: "/secure/lore",
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

  function renderMobile() {
    root.innerHTML = "";
    const shell = document.createElement("div");
    shell.className = "mobile-shell";

    const status = document.createElement("div");
    status.className = "mobile-status";
    const statusLeft = document.createElement("span");
    statusLeft.textContent = "SAFEHOUSE NET // " + sessionRoleText();
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
    brandNow.textContent = "Now Serving: Masaya Chai (cold)";
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
      statusLeft.textContent = "SAFEHOUSE NET // " + sessionRoleText();
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
      statusLeft.textContent = "SAFEHOUSE NET // " + sessionRoleText();
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
    brand.textContent = "safehouse crt os // p-59    file  edit  view  tools";

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

    const windowMap = new Map();
    const minimizedMap = new Map();
    let zCursor = 40;

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
      win.style.width = "760px";
      win.style.height = "520px";
      win.style.left = 160 + offset * 28 + "px";
      win.style.top = 24 + offset * 22 + "px";

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

    const desktopEnv = {
      openDocumentWindow,
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
        shellWindow.body.appendChild(buildAppContent(appId, desktopEnv));
      }
      return shellWindow.win;
    }

    function readStoredIconLayout() {
      try {
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
        window.localStorage.setItem(STORAGE_KEYS.iconLayout, JSON.stringify(layout));
      } catch (_ignore) {
        // no-op
      }
    }

    function defaultIconPosition(index) {
      const rows = 6;
      const col = Math.floor(index / rows);
      const row = index % rows;
      return {
        x: 16 + col * 112,
        y: 14 + row * 96
      };
    }

    function snapToGrid(value, step) {
      return Math.round(value / step) * step;
    }

    function clampIconPosition(pos, iconEl) {
      const rect = workspace.getBoundingClientRect();
      const w = iconEl.offsetWidth || 94;
      const h = iconEl.offsetHeight || 84;
      return {
        x: Math.max(8, Math.min(rect.width - w - 8, pos.x)),
        y: Math.max(8, Math.min(rect.height - h - 44, pos.y))
      };
    }

    const iconLayout = readStoredIconLayout();

    APPS.forEach((app) => {
      const icon = document.createElement("button");
      icon.type = "button";
      icon.className = "desktop-icon";

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
      },
      { once: true }
    );
  }

  function render(force) {
    const nextMode = isMobileMode() ? "mobile" : "desktop";
    const shouldRerender = Boolean(force) || nextMode !== mode || !root.childElementCount;
    if (!shouldRerender) {
      return;
    }

    const previous = root.firstElementChild;
    if (previous) {
      previous.dispatchEvent(new Event("v2-destroy"));
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
      window.dispatchEvent(new Event("v2-layout-resize"));
      const nextMode = isMobileMode() ? "mobile" : "desktop";
      if (nextMode !== mode) {
        render(true);
      }
    }, 140);
  });

  render();
})();
