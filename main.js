(function () {
  function showFatal(error) {
    const target = document.getElementById("boot") || document.body.appendChild(document.createElement("pre"));
    target.style.whiteSpace = "pre-wrap";
    target.textContent = "BOOT FAILURE\n" + (error && (error.stack || String(error)) ? (error.stack || String(error)) : "unknown");
    const screen = document.getElementById("screen");
    if (screen) {
      screen.hidden = false;
    }
  }

  function boot() {
    try {
      initSafehouse();
    } catch (error) {
      showFatal(error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

function initSafehouse() {
  const $ = (selector, ctx = document) => ctx.querySelector(selector);

  const boot = $("#boot");
  const screen = $("#screen");
  const prompt = $("#prompt");
  const input = $("#cmd");
  const ps1 = $("#ps1");
  const terminal = $("#crt");

  if (!boot || !screen || !prompt || !input || !ps1 || !terminal) {
    throw new Error("terminal DOM missing required elements");
  }

  const fs = createFilesystem();

  const state = {
    staff: false,
    username: "guest",
    cwd: "/bar/frontdesk",
    phase: "booting",
    tries: 0,
    history: [],
    historyIndex: 0,
    pendingPrompt: null,
    streamHandle: null,
    streamKind: null,
    uiTicker: null,
    quickActions: [],
    bootTimers: [],
    guestMenu: {
      actions: [],
      index: 0,
      rows: [],
      onBack: null
    },
    reviews: [],
    panel: {
      lights: "warm",
      music: "low",
      airlock: "sealed",
      cellar: 4.2,
      co2: 71,
      generator: "online"
    }
  };

  const STAFF_CODES = new Set(["admin", "0000", "1234", "staff", "letmein", "password", "safehouse", "user", "hack", "bypass"]);

  const RESTRICTED_PREFIXES = ["/secure"];
  const RESTRICTED_EXACT = new Set([
    "/var/log/staff.log",
    "/var/log/internal.log",
    "/var/log/security.log"
  ]);

  const COMMANDS = [
    "help",
    "guide",
    "quick",
    "home",
    "paths",
    "files",
    "menu",
    "location",
    "about",
    "hours",
    "events",
    "booking",
    "contacts",
    "motd",
    "story",
    "status",
    "monitor",
    "drinks",
    "ls",
    "cd",
    "goto",
    "pwd",
    "cat",
    "open",
    "tree",
    "find",
    "history",
    "whoami",
    "logs",
    "staff_logs",
    "employees",
    "lore",
    "chat",
    "inventory",
    "recipes",
    "panel",
    "ops",
    "dossier",
    "reviews",
    "tail",
    "term",
    "login",
    "staff",
    "sudo",
    "stop",
    "clear"
  ];

  function line(text = "", className = "") {
    const row = document.createElement("div");
    if (className) {
      row.className = className;
    }
    row.textContent = text;
    screen.appendChild(row);
    screen.scrollTop = screen.scrollHeight;
    return row;
  }

  function configureInputMode() {
    input.setAttribute("type", "text");
    input.setAttribute("autocomplete", "new-password");
    input.setAttribute("autocapitalize", "none");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("inputmode", "text");
    input.setAttribute("name", "safehouse_console_field");
    input.setAttribute("aria-autocomplete", "none");
    input.setAttribute("autofill", "off");
    input.setAttribute("data-form-type", "other");
    input.setAttribute("readonly", "readonly");
    input.setAttribute("data-lpignore", "true");
    input.setAttribute("data-1p-ignore", "true");
    requestAnimationFrame(() => {
      input.removeAttribute("readonly");
    });
  }

  function banner(title) {
    line("");
    line("[ " + title + " ]", "muted");
  }

  function ok(text) {
    line(text, "ok");
  }

  function warn(text) {
    line(text, "warn");
  }

  function err(text) {
    line(text, "err");
  }

  function updatePrompt() {
    const user = state.staff ? state.username : "guest";
    ps1.textContent = user + "@safehouse:" + state.cwd + "$";
  }

  function normalizePath(path) {
    let value = String(path || "").trim();
    if (!value) {
      return "/";
    }
    value = value.replace(/\\/g, "/");
    value = value.replace(/\/+/g, "/");
    if (!value.startsWith("/")) {
      value = "/" + value;
    }
    if (value.length > 1 && value.endsWith("/")) {
      value = value.slice(0, -1);
    }
    return value;
  }

  function joinPath(base, child) {
    return normalizePath((base === "/" ? "" : base) + "/" + child);
  }

  function isDir(path) {
    return Array.isArray(fs[path]);
  }

  function isFile(path) {
    return typeof fs[path] === "string";
  }

  function isRestricted(path) {
    if (!path) {
      return false;
    }
    if (RESTRICTED_EXACT.has(path)) {
      return true;
    }
    return RESTRICTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
  }

  function canSee(path) {
    return state.staff || !isRestricted(path);
  }

  function canAccess(path) {
    if (canSee(path)) {
      return true;
    }
    err("restricted area. staff login required.");
    setQuickActions("ACCESS OPTIONS", [
      { label: "staff login", command: "login" },
      { label: "show public paths", command: "paths" },
      { label: "list current folder", command: "ls" }
    ]);
    return false;
  }

  function resolveRelative(basePath, rawPath) {
    const aliases = {
      "~": "/bar/frontdesk",
      front: "/bar/frontdesk",
      menu: "/bar/menu",
      service: "/bar/service",
      monitors: "/monitors",
      public: "/public",
      secure: "/secure"
    };

    let value = String(rawPath || "").trim();
    if (!value) {
      return basePath;
    }

    const alias = aliases[value.toLowerCase()];
    if (alias) {
      value = alias;
    }

    const absolute = value.startsWith("/")
      ? normalizePath(value)
      : normalizePath((basePath === "/" ? "" : basePath) + "/" + value);

    const segments = absolute.split("/").filter(Boolean);
    let current = "/";

    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      if (segment === ".") {
        continue;
      }
      if (segment === "..") {
        if (current !== "/") {
          const parts = current.split("/").filter(Boolean);
          parts.pop();
          current = parts.length ? "/" + parts.join("/") : "/";
        }
        continue;
      }

      const listing = fs[current];
      if (!Array.isArray(listing)) {
        return null;
      }

      const match = listing.find((name) => name.toLowerCase() === segment.toLowerCase());
      if (!match) {
        return null;
      }
      current = joinPath(current, match);
    }

    return current;
  }

  function resolveLooseToken(basePath, token) {
    if (!token || token.includes("/")) {
      return null;
    }
    const listing = fs[basePath];
    if (!Array.isArray(listing)) {
      return null;
    }

    const lower = token.toLowerCase();
    const exact = listing.find((name) => name.toLowerCase() === lower);
    if (exact) {
      return joinPath(basePath, exact);
    }

    const starts = listing.filter((name) => name.toLowerCase().startsWith(lower));
    if (starts.length === 1) {
      return joinPath(basePath, starts[0]);
    }

    return null;
  }

  function resolvePath(rawPath, options = {}) {
    const base = options.base || state.cwd;
    const allowLoose = Boolean(options.allowLoose);

    const direct = resolveRelative(base, rawPath);
    if (direct) {
      return direct;
    }

    if (allowLoose) {
      return resolveLooseToken(base, String(rawPath || "").trim());
    }

    return null;
  }

  function suggestPaths(token) {
    const needle = String(token || "").toLowerCase();
    if (!needle) {
      return [];
    }
    const hits = [];
    const keys = Object.keys(fs);
    for (let i = 0; i < keys.length; i += 1) {
      const path = keys[i];
      if (!canSee(path)) {
        continue;
      }
      const name = path.split("/").pop().toLowerCase();
      if (name.includes(needle)) {
        hits.push(path + (isDir(path) ? "/" : ""));
      }
      if (hits.length >= 6) {
        break;
      }
    }
    return hits;
  }

  function printPathNotFound(rawPath) {
    const hints = suggestPaths(rawPath);
    if (!hints.length) {
      err("path not found");
      setQuickActions("RECOVERY", [
        { label: "list current folder", command: "ls" },
        { label: "show key files", command: "files" },
        { label: "show path shortcuts", command: "paths" }
      ]);
      return;
    }
    warn("path not found. maybe:");
    hints.forEach((hit) => line("  " + hit, "muted"));
    setQuickActions("MATCHED PATHS", hints.map((hit) => ({
      label: "open " + hit,
      command: "open " + hit.replace(/\/$/, "")
    })));
  }

  function listDirectory(path) {
    if (!isDir(path)) {
      err("not a directory");
      return;
    }
    if (!canAccess(path)) {
      return;
    }

    const entries = fs[path]
      .map((name) => ({ name, full: joinPath(path, name) }))
      .filter((entry) => canSee(entry.full));

    if (!entries.length) {
      line("(no visible entries)", "muted");
      return;
    }

    entries.forEach((entry) => {
      const type = isDir(entry.full) ? "d" : "f";
      line(type + "  " + entry.name);
    });
  }

  function readFile(path) {
    if (!isFile(path)) {
      err("not a file");
      return;
    }
    if (!canAccess(path)) {
      return;
    }
    banner(path);
    line(fs[path]);
  }

  function openPath(path) {
    if (isDir(path)) {
      if (!canAccess(path)) {
        return;
      }
      state.cwd = path;
      updatePrompt();
      listDirectory(path);
      return;
    }
    readFile(path);
  }

  function printTree(startPath, maxDepth) {
    if (!isDir(startPath)) {
      err("not a directory");
      return;
    }
    if (!canAccess(startPath)) {
      return;
    }

    banner("TREE " + startPath);
    const lines = [];
    lines.push(startPath === "/" ? "/" : startPath.split("/").pop() + "/");

    function walk(path, prefix, depth) {
      if (depth >= maxDepth) {
        return;
      }
      const listing = fs[path] || [];
      const visible = listing
        .map((name) => ({ name, full: joinPath(path, name) }))
        .filter((entry) => canSee(entry.full));

      visible.forEach((entry, index) => {
        const isLast = index === visible.length - 1;
        const branch = isLast ? "`-- " : "|-- ";
        const marker = isDir(entry.full) ? "/" : "";
        lines.push(prefix + branch + entry.name + marker);
        if (isDir(entry.full)) {
          walk(entry.full, prefix + (isLast ? "    " : "|   "), depth + 1);
        }
      });
    }

    walk(startPath, "", 0);
    lines.forEach((row) => line(row));
  }

  function findInTree(keyword, basePath) {
    const needle = String(keyword || "").toLowerCase();
    if (!needle) {
      warn("usage: find <keyword> [path]");
      return;
    }

    const root = resolvePath(basePath || state.cwd);
    if (!root || !isDir(root)) {
      err("invalid path");
      return;
    }
    if (!canAccess(root)) {
      return;
    }

    const hits = [];

    function walk(path) {
      const listing = fs[path];
      if (!Array.isArray(listing)) {
        return;
      }
      for (let i = 0; i < listing.length; i += 1) {
        const name = listing[i];
        const full = joinPath(path, name);
        if (!canSee(full)) {
          continue;
        }
        if (name.toLowerCase().includes(needle) || full.toLowerCase().includes(needle)) {
          hits.push(full + (isDir(full) ? "/" : ""));
        }
        if (isDir(full)) {
          walk(full);
        }
      }
    }

    walk(root);

    banner("FIND " + needle);
    if (!hits.length) {
      line("no matches", "muted");
      return;
    }

    hits.slice(0, 80).forEach((hit) => line(hit));
    if (hits.length > 80) {
      line("... " + (hits.length - 80) + " more", "muted");
    }
  }

  function tokenize(raw) {
    const out = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let m = re.exec(raw);
    while (m) {
      out.push(m[1] || m[2] || m[3]);
      m = re.exec(raw);
    }
    return out;
  }

  function suggestCommand(cmd) {
    const lower = String(cmd || "").toLowerCase();
    const hints = COMMANDS.filter((name) => name.startsWith(lower)).slice(0, 6);
    if (hints.length) {
      warn("command not found. maybe:");
      hints.forEach((hint) => line("  " + hint, "muted"));
      setQuickActions("COMMAND SUGGESTIONS", hints.map((hint) => ({
        label: hint,
        command: hint
      })));
      return;
    }
    err("command not found. type 'help'.");
  }

  function unique(list) {
    return [...new Set(list)];
  }

  function filterByPrefix(options, prefix) {
    const p = String(prefix || "").toLowerCase();
    return unique(options)
      .filter((option) => option.toLowerCase().startsWith(p))
      .sort((a, b) => a.localeCompare(b));
  }

  function visibleEntries(dirPath) {
    if (!isDir(dirPath)) {
      return [];
    }
    return fs[dirPath]
      .map((name) => ({ name, full: joinPath(dirPath, name) }))
      .filter((entry) => canSee(entry.full));
  }

  function setQuickActions(title, actions) {
    const normalized = (actions || [])
      .filter((action) => action && action.command)
      .slice(0, 9)
      .map((action) => ({
        label: String(action.label || action.command),
        command: String(action.command).trim()
      }))
      .filter((action) => action.command);

    state.quickActions = normalized;
    if (!normalized.length) {
      return;
    }

    banner(title);
    normalized.forEach((action, index) => {
      line(String(index + 1) + ") " + action.label);
    });
    line("type 1-9 to run. press TAB for autocomplete.", "muted");
  }

  function showDefaultQuickActions() {
    if (state.staff) {
      setQuickActions("STAFF QUICK ACTIONS", [
        { label: "ops dashboard", command: "ops" },
        { label: "open lore archive", command: "lore" },
        { label: "open personnel profiles", command: "employees" },
        { label: "open chat rooms", command: "chat list" },
        { label: "panel status", command: "panel status" },
        { label: "inventory deep view", command: "inventory" },
        { label: "go to secure root", command: "goto secure" }
      ]);
      return;
    }

    if (state.phase === "menu") {
      setQuickActions("GUEST MAIN MENU", [
        { label: "hours", command: "hours" },
        { label: "location", command: "location" },
        { label: "menu", command: "menu" },
        { label: "events", command: "events" },
        { label: "contatti", command: "contacts" },
        { label: "login", command: "login" },
        { label: "terminale", command: "terminale" }
      ]);
      return;
    }

    setQuickActions("GUEST QUICK ACTIONS", [
      { label: "hours", command: "hours" },
      { label: "location", command: "location" },
      { label: "menu", command: "menu" },
      { label: "events", command: "events" },
      { label: "contatti", command: "contacts" },
      { label: "login", command: "login" },
      { label: "terminale", command: "terminale" }
    ]);
  }

  function showQuickActions() {
    if (!state.quickActions.length) {
      showDefaultQuickActions();
      return;
    }

    banner("QUICK ACTIONS");
    state.quickActions.forEach((action, index) => {
      line(String(index + 1) + ") " + action.label + " -> " + action.command);
    });
    line("type 1-9 to run.", "muted");
  }

  function stopUiTicker() {
    if (state.uiTicker) {
      clearInterval(state.uiTicker);
      state.uiTicker = null;
    }
  }

  function clearGuestMenuState() {
    state.guestMenu.actions = [];
    state.guestMenu.index = 0;
    state.guestMenu.rows = [];
    state.guestMenu.onBack = null;
  }

  function drawSafehouseHeader() {
    const art = [
      "  _____           ______ ______ _    _  ____  _    _  _____ ______ ",
      " / ____|   /\\    |  ____|  ____| |  | |/ __ \\| |  | |/ ____|  ____|",
      "| (___    /  \\   | |__  | |__  | |__| | |  | | |  | | (___ | |__   ",
      " \\___ \\  / /\\ \\  |  __| |  __| |  __  | |  | | |  | |\\___ \\|  __|  ",
      " ____) |/ ____ \\ | |    | |____| |  | | |__| | |__| |____) | |____ ",
      "|_____//_/    \\_\\|_|    |______|_|  |_|\\____/ \\____/|_____/|______|"
    ];
    art.forEach((row) => line(row, "ascii-title"));
    line("");
    line("TERMINAL P-59", "title title-secondary muted");
  }

  function drawCompactHeader(title) {
    line("SAFEHOUSE", "title");
    line("TERMINAL P-59", "title title-secondary muted");
    if (title) {
      line(title, "title title-version muted");
    }
  }

  function setGuestMenuActions(actions, onBack) {
    const normalized = (actions || []).filter((action) => action && typeof action.onSelect === "function");
    state.guestMenu.index = 0;
    state.guestMenu.onBack = onBack || null;
    state.guestMenu.actions = normalized;
    state.quickActions = normalized.slice(0, 9).map((action) => ({
      label: action.label,
      command: String(action.command || action.label || "").trim() || action.label
    }));
    state.guestMenu.rows = normalized.map((action, index) => {
      return line("  " + String(index + 1) + ") " + action.label, "menu-item");
    });
    updateGuestMenuCursor();
    line("");
    line("UP/DOWN move  ENTER select  ESC back", "muted");
  }

  function updateGuestMenuCursor() {
    if (state.phase !== "menu") {
      return;
    }
    const rows = state.guestMenu.rows || [];
    const actions = state.guestMenu.actions || [];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (!row) {
        continue;
      }
      const selected = i === state.guestMenu.index;
      const label = actions[i] ? actions[i].label : "";
      row.textContent = (selected ? "> " : "  ") + String(i + 1) + ") " + label;
      row.classList.toggle("selected", selected);
    }
  }

  function moveGuestMenuCursor(delta) {
    const total = (state.guestMenu.actions || []).length;
    if (!total) {
      return;
    }
    const next = (state.guestMenu.index + delta + total) % total;
    state.guestMenu.index = next;
    updateGuestMenuCursor();
  }

  function runGuestMenuSelection() {
    const selected = state.guestMenu.actions[state.guestMenu.index];
    if (!selected) {
      return;
    }
    if (selected.command) {
      line("-> " + selected.command, "muted");
    } else {
      line("-> " + selected.label, "muted");
    }
    state.history.push(selected.command || selected.label);
    state.historyIndex = state.history.length;
    selected.onSelect();
  }

  function renderMenuScreen(title, lines, actions, onBack) {
    stopStream(false);
    stopUiTicker();
    clearGuestMenuState();
    state.phase = "menu";
    screen.innerHTML = "";
    drawSafehouseHeader();
    line("");
    if (title) {
      line(title, "title title-version muted");
      line("");
    }
    (lines || []).forEach((row) => line(row));
    if (actions && actions.length) {
      line("");
      setGuestMenuActions(actions, onBack);
    }
    input.blur();
  }

  function renderDocument(path, onBack, title) {
    if (!isFile(path)) {
      renderMenuScreen(
        "FILE ERROR",
        ["Unable to open: " + path],
        [{ label: "back", onSelect: onBack || renderGuestHome }],
        onBack || renderGuestHome
      );
      return;
    }

    const lines = String(fs[path]).split("\n");
    renderMenuScreen(
      title || path,
      lines,
      [{ label: "back", onSelect: onBack || renderGuestHome }],
      onBack || renderGuestHome
    );
  }

  function renderLocationImage(onBack) {
    stopStream(false);
    stopUiTicker();
    clearGuestMenuState();
    state.phase = "menu";
    screen.innerHTML = "";
    drawCompactHeader("LOCATION MAP");
    line("");

    const frame = document.createElement("div");
    frame.className = "map-frame";
    const map = document.createElement("img");
    map.className = "map-image";
    map.src = "assets/location-map.png?v=20260221-map2";
    map.alt = "Safehouse district map";
    frame.appendChild(map);

    const pin = document.createElement("div");
    pin.className = "map-pin";
    pin.textContent = "SAFEHOUSE *";
    frame.appendChild(pin);

    screen.appendChild(frame);

    line("SAFEHOUSE marker is shown on the map.", "muted");
    line("Directions:", "muted");
    line("1) Follow MAIN ARTERY east-west until the canal crossing.");
    line("2) Turn toward CURVED RING ROAD at the lower junction.");
    line("3) Safehouse entrance is near the canal-side service lane.");
    line("");
    const backFn = onBack || renderGuestHome;
    setGuestMenuActions([
      { label: "back", onSelect: backFn },
      { label: "contatti", onSelect: () => renderDocument("/bar/service/contacts.txt", backFn, "CONTATTI") }
    ], backFn);
  }

  function randomCorruptPayload(length) {
    const chars = "0123456789ABCDEF[]{}<>|/\\\\*#@!?$%&=:+-";
    let out = "";
    for (let i = 0; i < length; i += 1) {
      const roll = Math.random();
      if (roll < 0.14) {
        out += " ";
      } else {
        out += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    return out;
  }

  function renderCorruptedPublicFile(onBack) {
    stopStream(false);
    stopUiTicker();
    clearGuestMenuState();
    state.phase = "menu";
    screen.innerHTML = "";
    drawCompactHeader("PUBLIC FILES / CORRUPTED BLOCK");
    line("");
    line("record: /public/file-corrotto-77.bin", "muted corrupt-filename");
    line("status: CRC mismatch / payload unreadable", "warn");
    line("hint: scan frames, hidden credentials may surface", "muted");
    line("");

    const rows = [];
    const secretUser = "vault_maintenance";
    const secretPass = "p59_relay_7734";
    const revealUserRow = 2;
    const revealPassRow = 7;
    for (let i = 0; i < 10; i += 1) {
      const addr = "0x77" + (i * 16).toString(16).padStart(2, "0");
      rows.push(line(addr + "  " + randomCorruptPayload(64), "corrupt-row"));
    }

    const status = line("decoder: scanning damaged sectors ...", "muted");
    let tick = 0;
    const states = [
      "decoder: parity map unstable",
      "decoder: symbol table missing",
      "decoder: checksum diverged",
      "decoder: noisy carrier detected",
      "decoder: salvage window open"
    ];

    const update = () => {
      tick += 1;
      rows.forEach((row, idx) => {
        const addr = "0x77" + (idx * 16).toString(16).padStart(2, "0");
        if (idx === revealUserRow && tick % 9 === 0) {
          row.textContent = addr + "  <<< USERNAME:: " + secretUser + " >>>";
        } else if (idx === revealPassRow && tick % 11 === 0) {
          row.textContent = addr + "  <<< PASSWORD:: " + secretPass + " >>>";
        } else {
          row.textContent = addr + "  " + randomCorruptPayload(64);
        }
        row.classList.toggle("burst", Math.random() > 0.88);
      });
      status.textContent = states[tick % states.length] + " :: frame " + String(tick).padStart(3, "0");
    };

    state.uiTicker = setInterval(update, 130);
    line("");
    const backFn = onBack || renderGuestHome;
    setGuestMenuActions([
      {
        label: "retry decode",
        onSelect: () => renderCorruptedPublicFile(backFn)
      },
      { label: "back", onSelect: backFn }
    ], backFn);
  }

  function renderPublicFilesMenu(onBack) {
    const backFn = onBack || renderGuestHome;
    const self = () => renderPublicFilesMenu(backFn);
    renderMenuScreen(
      "PUBLIC FILES",
      [
        "Guest-access documents and notices.",
        "Select a file:"
      ],
      [
        { label: "faq", command: "faq", onSelect: () => renderDocument("/public/faq.txt", self, "FAQ") },
        { label: "chi siamo", command: "chi-siamo", onSelect: () => renderDocument("/public/chi-siamo.txt", self, "CHI SIAMO") },
        { label: "guida ospite", command: "guida", onSelect: () => renderDocument("/public/guest-guide.txt", self, "GUIDA OSPITE") },
        { label: "come arrivare", command: "arrivare", onSelect: () => renderDocument("/public/arrivare-safehouse.txt", self, "COME ARRIVARE") },
        { label: "press notes", command: "press", onSelect: () => renderDocument("/public/press-notes.txt", self, "PRESS NOTES") },
        { label: "file corrotto [rec-77]", command: "corrotto", onSelect: () => renderCorruptedPublicFile(self) },
        { label: "back", command: "back", onSelect: backFn }
      ],
      backFn
    );
  }

  function renderRadiationMonitor(onBack) {
    stopStream(false);
    stopUiTicker();
    clearGuestMenuState();
    state.phase = "menu";
    screen.innerHTML = "";
    drawSafehouseHeader();
    line("");
    line("RADIATION MONITOR", "title muted");
    line("");

    const levelRow = line("level: --.-- uSv/h");
    const trendRow = line("trend: stable");
    const alarmRow = line("alarm: none");

    const update = () => {
      const value = (Math.random() * 0.2 + 0.1).toFixed(2);
      const numeric = parseFloat(value);
      const trend = numeric > 0.29 ? "rising" : numeric > 0.2 ? "watch" : "stable";
      const alarm = numeric > 0.33 ? "yellow" : "none";
      levelRow.textContent = "level: " + value + " uSv/h";
      trendRow.textContent = "trend: " + trend;
      alarmRow.textContent = "alarm: " + alarm;
    };
    update();
    state.uiTicker = setInterval(update, 1300);

    line("");
    const goBack = onBack || renderGuestHome;
    setGuestMenuActions([
      {
        label: "back",
        onSelect: () => {
          stopUiTicker();
          goBack();
        }
      }
    ], () => {
      stopUiTicker();
      goBack();
    });
  }

  function renderDirectoryMenu(path, title, onBack) {
    if (!isDir(path)) {
      renderMenuScreen(
        "PATH ERROR",
        ["Not a directory: " + path],
        [{ label: "back", onSelect: onBack || renderGuestHome }],
        onBack || renderGuestHome
      );
      return;
    }

    const entries = visibleEntries(path);
    const self = () => renderDirectoryMenu(path, title, onBack);
    const actions = entries.map((entry) => ({
      label: entry.name + (isDir(entry.full) ? "/" : ""),
      onSelect: () => {
        if (isDir(entry.full)) {
          renderDirectoryMenu(entry.full, title + " / " + entry.name, self);
          return;
        }
        renderDocument(entry.full, self, entry.full);
      }
    }));
    actions.push({ label: "back", onSelect: onBack || renderGuestHome });

    renderMenuScreen(title, ["path: " + path], actions, onBack || renderGuestHome);
  }

  function renderGuestHelp() {
    renderMenuScreen(
      "HELP",
      [
        "This build is in navigation mode.",
        "No command input required.",
        "",
        "Controls:",
        "  ArrowUp/ArrowDown: move selection",
        "  Enter: open selected item",
        "  Esc: go back"
      ],
      [{ label: "back", onSelect: renderGuestHome }],
      renderGuestHome
    );
  }

  function renderControlPanelMenu(onBack) {
    const next = onBack || renderStaffMainMenu;
    const lightModes = ["warm", "service", "dim", "blackout"];
    const musicModes = ["low", "mid", "high", "silent", "vinyl"];
    const rotate = (list, value) => {
      const idx = list.indexOf(value);
      return list[(idx + 1) % list.length];
    };

    renderMenuScreen(
      "CONTROL PANEL",
      [
        "lights    : " + state.panel.lights,
        "music     : " + state.panel.music,
        "airlock   : " + state.panel.airlock,
        "generator : " + state.panel.generator,
        "cellar    : " + state.panel.cellar.toFixed(1) + " C",
        "co2       : " + state.panel.co2 + "%"
      ],
      [
        {
          label: "cycle lights",
          onSelect: () => {
            state.panel.lights = rotate(lightModes, state.panel.lights);
            renderControlPanelMenu(next);
          }
        },
        {
          label: "cycle music",
          onSelect: () => {
            state.panel.music = rotate(musicModes, state.panel.music);
            renderControlPanelMenu(next);
          }
        },
        {
          label: "run opening preset",
          onSelect: () => {
            state.panel.lights = "warm";
            state.panel.music = "low";
            state.panel.airlock = "sealed";
            state.panel.generator = "online";
            renderControlPanelMenu(next);
          }
        },
        {
          label: "run lockdown preset",
          onSelect: () => {
            state.panel.lights = "dim";
            state.panel.music = "silent";
            state.panel.airlock = "sealed";
            state.panel.generator = "standby";
            renderControlPanelMenu(next);
          }
        },
        { label: "back", onSelect: next }
      ],
      next
    );
  }

  function renderStaffMainMenu() {
    renderMenuScreen(
      "STAFF CONSOLE",
      ["restricted archive unlocked"],
      [
        { label: "operations dashboard", onSelect: () => renderOpsDashboardMenu() },
        { label: "lore archive", onSelect: () => renderDirectoryMenu("/secure/lore", "LORE ARCHIVE", renderStaffMainMenu) },
        { label: "personnel files", onSelect: () => renderDirectoryMenu("/secure/personnel", "PERSONNEL FILES", renderStaffMainMenu) },
        { label: "chat logs", onSelect: () => renderDirectoryMenu("/secure/chats", "CHAT LOGS", renderStaffMainMenu) },
        { label: "incident logs", onSelect: () => renderDirectoryMenu("/secure/incidents", "INCIDENT LOGS", renderStaffMainMenu) },
        { label: "radiation monitor", onSelect: () => renderRadiationMonitor(renderStaffMainMenu) },
        { label: "control panel", onSelect: () => renderControlPanelMenu(renderStaffMainMenu) },
        { label: "logout staff session", onSelect: () => { state.staff = false; state.username = "guest"; renderGuestHome(); } },
        { label: "back to guest", onSelect: renderGuestHome }
      ],
      renderGuestHome
    );
  }

  function renderOpsDashboardMenu() {
    renderMenuScreen(
      "OPERATIONS DASHBOARD",
      [
        "lights mode : " + state.panel.lights,
        "music level : " + state.panel.music,
        "airlock     : " + state.panel.airlock,
        "generator   : " + state.panel.generator,
        "cellar temp : " + state.panel.cellar.toFixed(1) + " C",
        "co2         : " + state.panel.co2 + "%"
      ],
      [
        { label: "inventory report", onSelect: () => renderDocument("/secure/ops/inventory-deep-2026-02-21.txt", renderOpsDashboardMenu, "INVENTORY REPORT") },
        { label: "shift briefing", onSelect: () => renderDocument("/secure/ops/shift-briefing-2026-02-21.txt", renderOpsDashboardMenu, "SHIFT BRIEFING") },
        { label: "back", onSelect: renderStaffMainMenu }
      ],
      renderStaffMainMenu
    );
  }

  function renderStaffAccessMenu() {
    if (state.staff) {
      renderStaffMainMenu();
      return;
    }
    renderMenuScreen(
      "STAFF ACCESS",
      [
        "Text login is disabled in navigation mode.",
        "Use authenticated staff session entry below."
      ],
      [
        {
          label: "authenticate staff session",
          onSelect: () => {
            state.staff = true;
            state.username = "staff";
            renderStaffMainMenu();
          }
        },
        { label: "back", onSelect: renderGuestHome }
      ],
      renderGuestHome
    );
  }

  function renderGuestHome() {
    renderMenuScreen(
      "SOFTWARE UNIX/59 v8.4.59",
      ["Select an item:"],
      [
        { label: "hours", command: "hours", onSelect: () => renderDocument("/bar/service/hours.txt", renderGuestHome, "HOURS") },
        { label: "location", command: "location", onSelect: () => renderLocationImage(renderGuestHome) },
        {
          label: "menu",
          command: "menu",
          onSelect: () => renderMenuScreen(
            "HOUSE MENU",
            (fs["/bar/menu/house-menu.txt"] + "\n\n" + fs["/bar/menu/seasonal-board-2026-02.txt"]).split("\n"),
            [{ label: "back", onSelect: renderGuestHome }],
            renderGuestHome
          )
        },
        { label: "events", command: "events", onSelect: () => renderDocument("/bar/service/events-calendar-2026.txt", renderGuestHome, "EVENTS") },
        { label: "contatti", command: "contacts", onSelect: () => renderDocument("/bar/service/contacts.txt", renderGuestHome, "CONTATTI") },
        { label: "public files", command: "public", onSelect: () => renderPublicFilesMenu(renderGuestHome) },
        { label: "login", command: "login", onSelect: renderStaffAccessMenu },
        { label: "terminale", command: "terminale", onSelect: () => {} }
      ],
      null
    );
  }

  function printOpsDashboard() {
    if (!state.staff) {
      err("staff only command");
      return;
    }
    banner("OPERATIONS DASHBOARD");
    printPanelStatus();
    line("secure datasets:");
    line("  lore        -> narrative archive");
    line("  employees   -> personnel profiles");
    line("  chat list   -> internal room logs");
    line("  panel list  -> control modules");
    line("  inventory   -> deep stock report");
    line("  tree /secure  for full structure", "muted");
    setQuickActions("OPS CONSOLE", [
      { label: "panel list", command: "panel list" },
      { label: "panel run opening", command: "panel run opening" },
      { label: "panel run lockdown", command: "panel run lockdown" },
      { label: "lore route", command: "lore route" },
      { label: "employees", command: "employees" },
      { label: "chat list", command: "chat list" },
      { label: "tree /secure", command: "tree /secure" }
    ]);
  }

  function printDossier() {
    if (!state.staff) {
      err("staff only command");
      return;
    }
    banner("RESTRICTED DOSSIER INDEX");
    line("Lore:");
    line("  /secure/lore/timeline-1947-1962.md");
    line("  /secure/lore/journal-1968.md");
    line("  /secure/lore/red-button-origin.md");
    line("  /secure/lore/hospitality-engineering-manifesto.md");
    line("");
    line("Personnel:");
    line("  /secure/personnel/roster-2026.txt");
    line("  /secure/personnel/shift-reviews-2026-02.md");
    line("  /secure/personnel/profiles/");
    line("");
    line("Operations:");
    line("  /secure/control/");
    line("  /secure/ops/");
    line("  /secure/incidents/");
    line("  /secure/archive/");
    setQuickActions("DOSSIER SHORTCUTS", [
      { label: "open timeline", command: "open /secure/lore/timeline-1947-1962.md" },
      { label: "open roster", command: "open /secure/personnel/roster-2026.txt" },
      { label: "open incidents", command: "open /secure/incidents/maintenance-2026-02-19.log" },
      { label: "open panel manual", command: "open /secure/control/panel-manual.md" },
      { label: "open ops briefing", command: "open /secure/ops/shift-briefing-2026-02-21.txt" }
    ]);
  }

  function buildCommandWithCompletion(tokens, lastIndex, completion) {
    const next = tokens.slice();
    next[lastIndex] = completion;
    return next
      .filter((token, index) => !(index === next.length - 1 && token === ""))
      .join(" ")
      .trim();
  }

  function completePathToken(token) {
    const raw = String(token || "");
    let prefix = "";
    let part = raw;
    let dirPath = state.cwd;

    if (raw.includes("/")) {
      const cut = raw.lastIndexOf("/");
      prefix = raw.slice(0, cut + 1);
      part = raw.slice(cut + 1);

      if (raw.startsWith("/")) {
        const absDir = raw.slice(0, cut) || "/";
        dirPath = resolvePath(absDir, { base: "/", allowLoose: true });
      } else {
        const relDir = raw.slice(0, cut) || ".";
        dirPath = resolvePath(relDir, { base: state.cwd, allowLoose: true });
      }
    }

    if (!dirPath || !isDir(dirPath)) {
      return [];
    }

    const needle = part.toLowerCase();
    return visibleEntries(dirPath)
      .map((entry) => {
        const suffix = isDir(entry.full) ? "/" : "";
        return prefix + entry.name + suffix;
      })
      .filter((candidate) => candidate.toLowerCase().startsWith((prefix + needle).toLowerCase()));
  }

  function commandTokenCompletions(command, tokens, lastIndex) {
    const current = String(tokens[lastIndex] || "");
    const second = String(tokens[1] || "").toLowerCase();

    if (lastIndex === 1) {
      if (command === "help") {
        return filterByPrefix(["staff"], current);
      }
      if (command === "goto") {
        const options = ["front", "menu", "service", "monitors", "public"];
        if (state.staff) {
          options.push("secure");
        }
        return filterByPrefix(options, current);
      }
      if (command === "monitor") {
        return filterByPrefix(["snapshot", "list", "rad", "flow", "service", "stock"], current);
      }
      if (command === "logs" || command === "staff_logs") {
        return filterByPrefix(["show", "follow"], current);
      }
      if (command === "drinks") {
        return filterByPrefix(["list", "show", "random"], current);
      }
      if (command === "chat") {
        return filterByPrefix(["list", "open", "follow"], current);
      }
      if (command === "panel") {
        return filterByPrefix(["list", "status", "set", "run", "test"], current);
      }
      if (command === "term") {
        return filterByPrefix(["night"], current);
      }
      if (command === "staff") {
        return filterByPrefix(["logs", "logout"], current);
      }
      if (command === "lore" && state.staff) {
        const loreFiles = (fs["/secure/lore"] || []).concat(["route"]);
        return filterByPrefix(loreFiles, current);
      }
      if (command === "employees" && state.staff) {
        return filterByPrefix(fs["/secure/personnel/profiles"] || [], current);
      }
    }

    if (command === "monitor" && lastIndex === 2) {
      return filterByPrefix(["follow"], current);
    }

    if (command === "term" && second === "night" && lastIndex === 2) {
      return filterByPrefix(["on", "off"], current);
    }

    if (command === "chat" && second === "open" && lastIndex === 2 && state.staff) {
      return filterByPrefix(fs["/secure/chats"] || [], current);
    }

    if (command === "chat" && second === "follow" && lastIndex === 2 && state.staff) {
      return filterByPrefix(["ops-nightshift", "bar-backchannel", "incident-chat"], current);
    }

    if (command === "panel" && second === "set" && lastIndex === 2) {
      return filterByPrefix(["lights", "music", "airlock", "generator", "cellar", "co2"], current);
    }

    if (command === "panel" && second === "set" && lastIndex === 3) {
      const module = String(tokens[2] || "").toLowerCase();
      if (module === "lights") {
        return filterByPrefix(["warm", "service", "dim", "blackout"], current);
      }
      if (module === "music") {
        return filterByPrefix(["low", "mid", "high", "silent", "vinyl"], current);
      }
      if (module === "airlock") {
        return filterByPrefix(["sealed", "open", "cycle"], current);
      }
      if (module === "generator") {
        return filterByPrefix(["online", "standby", "maintenance"], current);
      }
    }

    if (command === "panel" && second === "run" && lastIndex === 2) {
      return filterByPrefix(["opening", "lockdown", "quiet-reset"], current);
    }

    if (command === "panel" && second === "test" && lastIndex === 2) {
      return filterByPrefix(["power", "airlock", "co2", "cellar"], current);
    }

    if (command === "drinks" && second === "show" && lastIndex === 2) {
      const drinkNames = getDrinkLines().map((row) => row.split(/\s+/)[0]);
      return filterByPrefix(drinkNames, current);
    }

    return [];
  }

  function getAutoCompleteContext() {
    const rawValue = input.value;
    const endsWithSpace = /\s$/.test(rawValue);
    const tokens = tokenize(rawValue);
    if (endsWithSpace) {
      tokens.push("");
    }

    if (!tokens.length) {
      return { tokens: [""], lastIndex: 0, completions: COMMANDS.slice() };
    }

    if (tokens.length === 1) {
      return {
        tokens,
        lastIndex: 0,
        completions: filterByPrefix(COMMANDS, tokens[0])
      };
    }

    const command = tokens[0].toLowerCase();
    const lastIndex = tokens.length - 1;
    const specific = commandTokenCompletions(command, tokens, lastIndex);
    if (specific.length) {
      return { tokens, lastIndex, completions: specific };
    }

    const pathCommands = new Set(["ls", "cd", "cat", "open", "tree"]);
    if (pathCommands.has(command) && lastIndex >= 1) {
      return { tokens, lastIndex, completions: completePathToken(tokens[lastIndex]) };
    }
    if (command === "find" && lastIndex >= 2) {
      return { tokens, lastIndex, completions: completePathToken(tokens[lastIndex]) };
    }

    return { tokens, lastIndex, completions: [] };
  }

  function autocompleteInput() {
    const context = getAutoCompleteContext();
    const completions = context.completions || [];

    if (!completions.length) {
      warn("no completion");
      return;
    }

    if (completions.length === 1) {
      const next = buildCommandWithCompletion(context.tokens, context.lastIndex, completions[0]);
      const appendSpace = context.lastIndex === 0 || !completions[0].endsWith("/");
      input.value = next + (appendSpace ? " " : "");
      input.focus();
      return;
    }

    setQuickActions("COMPLETIONS", completions.map((completion) => ({
      label: completion,
      command: buildCommandWithCompletion(context.tokens, context.lastIndex, completion)
    })));
    warn("multiple completions. type a number or more letters then TAB.");
  }

  function ask(label, hidden, callback) {
    state.pendingPrompt = { label, hidden, callback };
    input.value = "";
    input.placeholder = label + " >";
    configureInputMode();
    input.name = "safehouse_prompt_" + label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    input.focus();
  }

  function flashLockdown() {
    const row = document.createElement("div");
    row.className = "lockdown err";
    row.textContent = "*** LOCKDOWN ***";
    screen.appendChild(row);
    screen.scrollTop = screen.scrollHeight;
    setTimeout(() => row.remove(), 1900);
  }

  function startStaffLogin(fromSudo) {
    banner(fromSudo ? "SUDO PLEASE -> STAFF AUTH" : "STAFF AUTH");
    ask("OPERATOR ID", false, (user) => {
      ask("ACCESS KEY", true, (code) => {
        const valid = STAFF_CODES.has(String(code || "").toLowerCase());
        if (!valid) {
          state.tries += 1;
          err("access denied");
          line("hint: demo access key is 'staff'", "muted");
          if (state.tries >= 3) {
            flashLockdown();
          }
          return;
        }

        state.phase = "terminal";
        state.staff = true;
        state.username = user || "staff";
        state.tries = 0;
        updatePrompt();
        ok("staff access granted");
        line("restricted archive unlocked: /secure", "muted");
        showDefaultQuickActions();
      });
    });
  }

  function nowStamp() {
    return new Date().toISOString().replace("T", " ").split(".")[0];
  }

  function nowClock() {
    return new Date().toTimeString().slice(0, 8);
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function sample(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function stopStream(notify) {
    if (state.streamHandle) {
      clearInterval(state.streamHandle);
      state.streamHandle = null;
      state.streamKind = null;
      if (notify !== false) {
        ok("stream stopped");
      }
      return;
    }
    if (notify) {
      warn("no stream running");
    }
  }

  function startStream(title, intervalMs, producer) {
    stopStream(false);
    banner(title);
    state.streamKind = "stream";
    state.streamHandle = setInterval(() => {
      line(producer());
    }, intervalMs);
  }

  function startSequence(title, steps, onDone) {
    stopStream(false);
    banner(title);
    let index = 0;
    state.streamKind = "sequence";
    state.streamHandle = setInterval(() => {
      line(steps[index]);
      index += 1;
      if (index >= steps.length) {
        clearInterval(state.streamHandle);
        state.streamHandle = null;
        state.streamKind = null;
        if (onDone) {
          onDone();
        }
        ok("sequence complete");
      }
    }, 650);
  }

  function monitorSnapshot() {
    return {
      rad: (Math.random() * 0.21 + 0.11).toFixed(2),
      flow: randomInt(12, 37),
      queue: randomInt(1, 12),
      stock: randomInt(62, 96)
    };
  }

  function printStatus() {
    const snap = monitorSnapshot();
    banner("LIVE STATUS");
    line("radiation     : " + snap.rad + " uSv/h (public monitor)");
    line("guest flow    : " + snap.flow + " heads/hour");
    line("queue         : " + snap.queue + " waiting");
    line("stock health  : " + snap.stock + "%");
    line("lights mode   : " + state.panel.lights);
    line("music level   : " + state.panel.music);
    line("airlock       : " + state.panel.airlock);
  }

  function printMonitor(mode) {
    const target = String(mode || "").toLowerCase();
    if (!target || target === "snapshot" || target === "show") {
      readFile("/monitors/snapshot.txt");
      printStatus();
      return;
    }

    if (target === "list") {
      banner("MONITORS");
      line("rad        radiation public channel");
      line("flow       frontdoor throughput");
      line("service    service desk activity");
      line("stock      inventory pressure");
      line("usage: monitor <name> [follow]");
      setQuickActions("MONITOR SHORTCUTS", [
        { label: "monitor snapshot", command: "monitor snapshot" },
        { label: "monitor rad follow", command: "monitor rad follow" },
        { label: "monitor flow follow", command: "monitor flow follow" },
        { label: "monitor service follow", command: "monitor service follow" },
        { label: "monitor stock follow", command: "monitor stock follow" },
        { label: "stop stream", command: "stop" }
      ]);
      return;
    }

    const map = {
      rad: "/monitors/radiation-public.log",
      flow: "/monitors/flow-public.log",
      service: "/monitors/service-public.log",
      stock: "/monitors/stock-public.log"
    };

    if (!map[target]) {
      warn("unknown monitor. use: monitor list");
      return;
    }

    readFile(map[target]);
  }

  function followMonitor(mode) {
    const target = String(mode || "").toLowerCase();

    if (target === "rad") {
      startStream("RAD MONITOR FOLLOW", 1700, () => {
        const value = (Math.random() * 0.20 + 0.10).toFixed(2);
        const label = parseFloat(value) > 0.30 ? "watch" : "stable";
        return "[" + nowClock() + "] RAD " + value + " uSv/h  " + label;
      });
      return;
    }

    if (target === "flow") {
      startStream("FLOW MONITOR FOLLOW", 1900, () => {
        return "[" + nowClock() + "] door throughput " + randomInt(8, 22) + " guests / 10m";
      });
      return;
    }

    if (target === "service") {
      startStream("SERVICE MONITOR FOLLOW", 2100, () => {
        return "[" + nowClock() + "] queue " + randomInt(0, 11) + " | avg wait " + randomInt(2, 18) + "m";
      });
      return;
    }

    if (target === "stock") {
      startStream("STOCK MONITOR FOLLOW", 2600, () => {
        return "[" + nowClock() + "] citrus " + randomInt(40, 96) + "% | ice " + randomInt(50, 99) + "% | bitters " + randomInt(35, 92) + "%";
      });
      return;
    }

    warn("unknown monitor. use: monitor list");
  }

  function printHelp(scope) {
    const target = String(scope || "").toLowerCase();

    banner("HELP");
    line("Base:");
    line("  help [staff]   command directory");
    line("  guide          quick start route");
    line("  quick          show numbered shortcuts");
    line("  home           return to guest home screen");
    line("  files          key paths");
    line("  paths          navigation shortcuts");
    line("  location       public location map");
    line("  clear history whoami");
    line("  TAB            autocomplete command/path");

    line("");
    line("Guest bar terminal:");
    line("  menu about hours events booking contacts motd story");
    line("  status monitor <rad|flow|service|stock> [follow]");
    line("  drinks list|show|random");
    line("  ls cd goto pwd cat open tree find");
    line("  login | staff | sudo please");

    if (state.staff || target === "staff") {
      line("");
      line("Staff operations:");
      line("  ops             staff dashboard with shortcuts");
      line("  dossier         restricted index of key docs");
      line("  staff_logs show|follow");
      line("  lore [file]         secure archive lore");
      line("  employees [name]    personnel files");
      line("  chat list|open|follow <room>");
      line("  inventory recipes [random]");
      line("  panel list|status|set|run|test");
      line("  tail -f /dev/rad    private radiation channel");
      line("  reviews add <text> | reviews list");
      line("  stop | staff logout");
    }

    showDefaultQuickActions();
  }

  function printGuide() {
    banner("GUIDE");
    line("Guest quick route:");
    line("  1) home");
    line("  2) menu");
    line("  3) status");
    line("  4) monitor rad follow");
    line("  5) stop");
    line("  6) events");
    line("  7) booking");
    line("  8) login");
    if (state.staff) {
      line("");
      line("Staff quick route:");
      line("  ops");
      line("  dossier");
      line("  lore");
      line("  employees");
      line("  chat list");
      line("  panel status");
    }
    line("Shortcuts: '/' focus input, TAB autocomplete, 1-9 quick action.", "muted");
    showDefaultQuickActions();
  }

  function printPaths() {
    banner("PATH SHORTCUTS");
    line("front      -> /bar/frontdesk");
    line("menu       -> /bar/menu");
    line("service    -> /bar/service");
    line("monitors   -> /monitors");
    line("public     -> /public");
    if (state.staff) {
      line("secure     -> /secure");
    }
    line("Examples:");
    line("  goto menu");
    line("  ls /bar/frontdesk");
    line("  open terminal-guide.txt");
    setQuickActions("PATH SHORTCUTS", [
      { label: "goto front", command: "goto front" },
      { label: "goto menu", command: "goto menu" },
      { label: "goto service", command: "goto service" },
      { label: "goto monitors", command: "goto monitors" },
      { label: "goto public", command: "goto public" },
      ...(state.staff ? [{ label: "goto secure", command: "goto secure" }] : [])
    ]);
  }

  function printFiles(scope) {
    const target = String(scope || "").toLowerCase();
    banner("KEY FILES");

    line("Guest area:");
    line("  /bar/frontdesk/welcome.txt");
    line("  /bar/menu/house-menu.txt");
    line("  /bar/service/events-calendar-2026.txt");
    line("  /monitors/snapshot.txt");
    line("  /public/about-safehouse.txt");

    if (state.staff || target === "secure") {
      line("");
      line("Restricted archive:");
      line("  /secure/lore/");
      line("  /secure/personnel/profiles/");
      line("  /secure/chats/");
      line("  /secure/control/");
      line("  /secure/incidents/");
      line("  /secure/ops/");
    } else {
      line("", "muted");
      line("login as staff to unlock /secure", "muted");
    }

    if (state.staff) {
      setQuickActions("FILE JUMP", [
        { label: "open frontdesk welcome", command: "open /bar/frontdesk/welcome.txt" },
        { label: "open secure readme", command: "open /secure/readme-restricted.txt" },
        { label: "open lore list", command: "lore" },
        { label: "open employees", command: "employees" },
        { label: "open chat list", command: "chat list" }
      ]);
    } else {
      setQuickActions("FILE JUMP", [
        { label: "open frontdesk welcome", command: "open /bar/frontdesk/welcome.txt" },
        { label: "open menu", command: "open /bar/menu/house-menu.txt" },
        { label: "open event calendar", command: "open /bar/service/events-calendar-2026.txt" },
        { label: "open monitor snapshot", command: "open /monitors/snapshot.txt" },
        { label: "staff login", command: "login" }
      ]);
    }
  }

  function getDrinkLines() {
    return fs["/bar/menu/house-menu.txt"]
      .split("\n")
      .map((row) => row.trim())
      .filter((row) => row && !row.toLowerCase().startsWith("house menu"));
  }

  function runDrinks(sub, query) {
    const mode = String(sub || "list").toLowerCase();
    const drinks = getDrinkLines();

    if (mode === "list") {
      banner("DRINKS");
      drinks.forEach((row) => line(row));
      return;
    }

    if (mode === "show") {
      const needle = String(query || "").toLowerCase();
      if (!needle) {
        warn("usage: drinks show <name>");
        return;
      }
      const match = drinks.find((row) => row.toLowerCase().startsWith(needle));
      if (!match) {
        err("drink not found");
        return;
      }
      ok(match);
      return;
    }

    if (mode === "random") {
      ok("random -> " + sample(drinks));
      return;
    }

    warn("usage: drinks list|show <name>|random");
  }

  function resolveInDirectory(baseDir, token) {
    if (!token) {
      return null;
    }
    if (String(token).includes("/")) {
      return resolvePath(token, { allowLoose: true });
    }

    const listing = fs[baseDir];
    if (!Array.isArray(listing)) {
      return null;
    }

    const lower = String(token).toLowerCase();
    const exact = listing.find((name) => name.toLowerCase() === lower);
    if (exact) {
      return joinPath(baseDir, exact);
    }

    const starts = listing.filter((name) => name.toLowerCase().startsWith(lower));
    if (starts.length === 1) {
      return joinPath(baseDir, starts[0]);
    }

    return null;
  }

  function printPanelModules() {
    banner("CONTROL MODULES");
    line("lights     warm | service | dim | blackout");
    line("music      low | mid | high | silent | vinyl");
    line("airlock    sealed | open | cycle");
    line("generator  online | standby | maintenance");
    line("cellar     2.0..9.0 C");
    line("co2        45..90 %");
    line("commands:");
    line("  panel status");
    line("  panel set <module> <value>");
    line("  panel run opening|lockdown|quiet-reset");
    line("  panel test power|airlock|co2|cellar");
    setQuickActions("PANEL SHORTCUTS", [
      { label: "panel status", command: "panel status" },
      { label: "panel run opening", command: "panel run opening" },
      { label: "panel run lockdown", command: "panel run lockdown" },
      { label: "panel test power", command: "panel test power" },
      { label: "panel test airlock", command: "panel test airlock" },
      { label: "panel set lights warm", command: "panel set lights warm" }
    ]);
  }

  function printPanelStatus() {
    banner("PANEL STATUS");
    line("lights     : " + state.panel.lights);
    line("music      : " + state.panel.music);
    line("airlock    : " + state.panel.airlock);
    line("generator  : " + state.panel.generator);
    line("cellar     : " + state.panel.cellar.toFixed(1) + " C");
    line("co2        : " + state.panel.co2 + "%");
  }

  function setPanel(module, valueTokens) {
    const key = String(module || "").toLowerCase();
    const value = valueTokens.join(" ").toLowerCase().trim();

    if (!key || !value) {
      warn("usage: panel set <module> <value>");
      return;
    }

    if (key === "lights") {
      const valid = new Set(["warm", "service", "dim", "blackout"]);
      if (!valid.has(value)) {
        warn("lights values: warm|service|dim|blackout");
        return;
      }
      state.panel.lights = value;
      ok("lights -> " + value);
      return;
    }

    if (key === "music") {
      const valid = new Set(["low", "mid", "high", "silent", "vinyl"]);
      if (!valid.has(value)) {
        warn("music values: low|mid|high|silent|vinyl");
        return;
      }
      state.panel.music = value;
      ok("music -> " + value);
      return;
    }

    if (key === "airlock") {
      const valid = new Set(["sealed", "open", "cycle"]);
      if (!valid.has(value)) {
        warn("airlock values: sealed|open|cycle");
        return;
      }
      state.panel.airlock = value;
      ok("airlock -> " + value);
      return;
    }

    if (key === "generator") {
      const valid = new Set(["online", "standby", "maintenance"]);
      if (!valid.has(value)) {
        warn("generator values: online|standby|maintenance");
        return;
      }
      state.panel.generator = value;
      ok("generator -> " + value);
      return;
    }

    if (key === "cellar") {
      const temp = parseFloat(value);
      if (!Number.isFinite(temp) || temp < 2 || temp > 9) {
        warn("cellar value must be between 2 and 9 C");
        return;
      }
      state.panel.cellar = temp;
      ok("cellar -> " + temp.toFixed(1) + " C");
      return;
    }

    if (key === "co2") {
      const co2 = parseInt(value, 10);
      if (!Number.isFinite(co2) || co2 < 45 || co2 > 90) {
        warn("co2 value must be between 45 and 90");
        return;
      }
      state.panel.co2 = co2;
      ok("co2 -> " + co2 + "%");
      return;
    }

    warn("unknown panel module");
  }

  function runPanelSequence(name) {
    const mode = String(name || "").toLowerCase();

    if (mode === "opening") {
      startSequence(
        "PANEL RUN OPENING",
        [
          "relay check ........ ok",
          "tube rail preheat ... ok",
          "airlock cycle ....... ok",
          "lights -> warm",
          "music bus -> low",
          "cellar loop -> nominal",
          "service gate -> open"
        ],
        () => {
          state.panel.lights = "warm";
          state.panel.music = "low";
          state.panel.airlock = "sealed";
          state.panel.generator = "online";
        }
      );
      return;
    }

    if (mode === "lockdown") {
      startSequence(
        "PANEL RUN LOCKDOWN",
        [
          "guest floor broadcast ........ active",
          "service gate ................. hold",
          "airlock .............. sealed",
          "lights ............... dim",
          "music bus ............ silent",
          "generator ............ standby"
        ],
        () => {
          state.panel.lights = "dim";
          state.panel.music = "silent";
          state.panel.airlock = "sealed";
          state.panel.generator = "standby";
        }
      );
      return;
    }

    if (mode === "quiet-reset") {
      startSequence(
        "PANEL RUN QUIET RESET",
        [
          "flush alert queue ............ done",
          "lights ............... service",
          "music bus ............ vinyl",
          "airlock .............. cycle",
          "cellar drift check ........... done",
          "system mood .......... stable"
        ],
        () => {
          state.panel.lights = "service";
          state.panel.music = "vinyl";
          state.panel.airlock = "cycle";
        }
      );
      return;
    }

    warn("usage: panel run opening|lockdown|quiet-reset");
  }

  function runPanelTest(target) {
    const mode = String(target || "").toLowerCase();

    if (mode === "power") {
      banner("POWER TEST");
      const v5 = (4.9 + Math.random() * 0.2).toFixed(2);
      const v12 = (11.8 + Math.random() * 0.3).toFixed(2);
      line("+5V rail  : " + v5 + "V");
      line("+12V rail : " + v12 + "V");
      ok("power test passed");
      return;
    }

    if (mode === "airlock") {
      banner("AIRLOCK TEST");
      line("door A seal : ok");
      line("door B seal : ok");
      line("cycle time  : " + randomInt(4, 8) + "s");
      ok("airlock test passed");
      return;
    }

    if (mode === "co2") {
      banner("CO2 TEST");
      const ppm = randomInt(520, 820);
      line("sensor ppm  : " + ppm);
      if (ppm > 760) {
        warn("co2 high, increase ventilation");
      } else {
        ok("co2 within target");
      }
      return;
    }

    if (mode === "cellar") {
      banner("CELLAR TEST");
      const temp = (state.panel.cellar + (Math.random() * 0.8 - 0.4)).toFixed(1);
      line("cellar temp : " + temp + " C");
      if (parseFloat(temp) > 6.8) {
        warn("cellar warm warning");
      } else {
        ok("cellar stable");
      }
      return;
    }

    warn("usage: panel test power|airlock|co2|cellar");
  }

  function runCommand(raw) {
    const source = String(raw || "").trim();
    if (!source) {
      return;
    }

    const tokens = tokenize(source);
    if (!tokens.length) {
      return;
    }

    const cmd = tokens[0].toLowerCase();
    const args = tokens.slice(1);

    if (state.phase === "menu" && cmd !== "home") {
      state.phase = "terminal";
      clearGuestMenuState();
    }

    switch (cmd) {
      case "help":
      case "?":
        printHelp(args[0]);
        break;

      case "guide":
        printGuide();
        break;

      case "quick":
        showQuickActions();
        break;

      case "home":
        renderGuestHome();
        break;

      case "paths":
        printPaths();
        break;

      case "files":
        printFiles(args[0]);
        break;

      case "menu":
        readFile("/bar/menu/house-menu.txt");
        readFile("/bar/menu/seasonal-board-2026-02.txt");
        break;

      case "about":
        readFile("/public/about-safehouse.txt");
        break;

      case "location":
        readFile("/public/map-public.txt");
        break;

      case "hours":
        readFile("/bar/service/hours.txt");
        break;

      case "events":
        readFile("/bar/service/events-calendar-2026.txt");
        break;

      case "booking":
        readFile("/bar/frontdesk/reservations-today.txt");
        break;

      case "contacts":
        readFile("/bar/service/contacts.txt");
        break;

      case "motd":
        readFile("/public/motd.txt");
        break;

      case "story":
        readFile("/public/story-card.txt");
        break;

      case "status":
        printStatus();
        break;

      case "monitor": {
        if (!args.length) {
          printMonitor("snapshot");
          break;
        }
        const mode = args[0].toLowerCase();
        const follow = (args[1] || "").toLowerCase() === "follow";
        if (follow) {
          followMonitor(mode);
        } else {
          printMonitor(mode);
        }
        break;
      }

      case "drinks":
        runDrinks(args[0], args[1]);
        break;

      case "ls": {
        const path = resolvePath(args[0] || state.cwd, { allowLoose: true });
        if (!path) {
          printPathNotFound(args[0]);
          break;
        }
        if (isFile(path)) {
          line("f  " + path.split("/").pop());
          break;
        }
        listDirectory(path);
        break;
      }

      case "cd": {
        const target = args[0] || "/bar/frontdesk";
        const path = resolvePath(target, { allowLoose: true });
        if (!path) {
          printPathNotFound(target);
          break;
        }
        if (!isDir(path)) {
          err("not a directory");
          break;
        }
        if (!canAccess(path)) {
          break;
        }
        state.cwd = path;
        updatePrompt();
        break;
      }

      case "goto": {
        const key = String(args[0] || "").toLowerCase();
        const map = {
          front: "/bar/frontdesk",
          menu: "/bar/menu",
          service: "/bar/service",
          monitors: "/monitors",
          public: "/public",
          secure: "/secure"
        };
        if (!map[key]) {
          warn("usage: goto front|menu|service|monitors|public" + (state.staff ? "|secure" : ""));
          break;
        }
        const path = map[key];
        if (!canAccess(path)) {
          break;
        }
        state.cwd = path;
        updatePrompt();
        listDirectory(path);
        break;
      }

      case "pwd":
        line(state.cwd);
        break;

      case "cat": {
        if (!args[0]) {
          warn("usage: cat <file>");
          break;
        }
        const path = resolvePath(args[0], { allowLoose: true });
        if (!path) {
          printPathNotFound(args[0]);
          break;
        }
        readFile(path);
        break;
      }

      case "open": {
        if (!args[0]) {
          warn("usage: open <path>");
          break;
        }
        const path = resolvePath(args[0], { allowLoose: true });
        if (!path) {
          printPathNotFound(args[0]);
          break;
        }
        openPath(path);
        break;
      }

      case "tree": {
        const path = resolvePath(args[0] || state.cwd);
        if (!path) {
          printPathNotFound(args[0]);
          break;
        }
        printTree(path, 6);
        break;
      }

      case "find":
        findInTree(args[0], args[1]);
        break;

      case "history":
        banner("HISTORY");
        if (!state.history.length) {
          line("(empty)", "muted");
        } else {
          state.history.slice(-60).forEach((entry, index) => {
            line(String(index + 1).padStart(2, "0") + "  " + entry);
          });
        }
        break;

      case "whoami":
        line("user: " + state.username);
        line("role: " + (state.staff ? "staff" : "guest"));
        line("cwd : " + state.cwd);
        break;

      case "logs": {
        const mode = (args[0] || "show").toLowerCase();
        if (mode === "follow") {
          startStream("GUEST LOG FOLLOW", 2400, () => {
            const rows = [
              "[" + nowStamp() + "] host desk    queue update",
              "[" + nowStamp() + "] floor        water service",
              "[" + nowStamp() + "] dispatch      table rotation",
              "[" + nowStamp() + "] ambient       music check"
            ];
            return sample(rows);
          });
        } else {
          readFile("/var/log/guest.log");
          line("tip: logs follow", "muted");
        }
        break;
      }

      case "staff_logs": {
        if (!state.staff) {
          err("staff only command");
          break;
        }
        const mode = (args[0] || "show").toLowerCase();
        if (mode === "follow") {
          startStream("STAFF LOG FOLLOW", 2900, () => {
            const rows = [
              "[" + nowStamp() + "] Erik: spec check complete",
              "[" + nowStamp() + "] Theo: front flow normal",
              "[" + nowStamp() + "] Andrea: garnish policy enforced",
              "[" + nowStamp() + "] Ju: locker inventory verified",
              "[" + nowStamp() + "] Nicola: stir timing corrected",
              "[" + nowStamp() + "] Giuliano: hum frequency acceptable"
            ];
            return sample(rows);
          });
        } else {
          readFile("/var/log/staff.log");
        }
        break;
      }

      case "employees": {
        if (!state.staff) {
          err("staff only command");
          break;
        }
        if (!args[0]) {
          banner("EMPLOYEES");
          listDirectory("/secure/personnel/profiles");
          line("open a profile: employees <name>", "muted");
          const profiles = (fs["/secure/personnel/profiles"] || []).slice(0, 6);
          setQuickActions("EMPLOYEE SHORTCUTS", profiles.map((profile) => ({
            label: "employees " + profile.replace(/\.md$/, ""),
            command: "employees " + profile
          })));
          break;
        }
        const path = resolveInDirectory("/secure/personnel/profiles", args[0]);
        if (!path) {
          printPathNotFound(args[0]);
          break;
        }
        readFile(path);
        break;
      }

      case "lore": {
        if (!state.staff) {
          err("staff only command");
          break;
        }
        if (!args[0]) {
          banner("LORE ARCHIVE");
          listDirectory("/secure/lore");
          line("open a file: lore <name>", "muted");
          setQuickActions("LORE SHORTCUTS", [
            { label: "lore route", command: "lore route" },
            { label: "first door dossier", command: "lore first-door-dossier.md" },
            { label: "journal 1968", command: "lore journal-1968.md" },
            { label: "false arrow protocol", command: "lore false-arrow-protocol.md" },
            { label: "map pin anomalies", command: "lore map-pin-anomalies-2025.log" },
            { label: "hospitality manifesto", command: "lore hospitality-engineering-manifesto.md" }
          ]);
          break;
        }
        if (args[0].toLowerCase() === "route") {
          banner("LORE ROUTE");
          line("lore first-door-dossier.md");
          line("lore journal-1968.md");
          line("lore false-arrow-protocol.md");
          line("lore map-pin-anomalies-2025.log");
          line("lore geiger-symphony-d-notes.md");
          break;
        }
        const path = resolveInDirectory("/secure/lore", args[0]);
        if (!path) {
          printPathNotFound(args[0]);
          break;
        }
        readFile(path);
        break;
      }

      case "chat": {
        if (!state.staff) {
          err("staff only command");
          break;
        }

        const sub = (args[0] || "list").toLowerCase();

        if (sub === "list") {
          banner("CHAT ROOMS");
          listDirectory("/secure/chats");
          line("chat open <file>", "muted");
          line("chat follow <room>", "muted");
          setQuickActions("CHAT SHORTCUTS", [
            { label: "open ops nightshift log", command: "chat open ops-nightshift-2026-02-20.log" },
            { label: "open bar backchannel", command: "chat open bar-backchannel-2026-02.log" },
            { label: "follow ops nightshift", command: "chat follow ops-nightshift" },
            { label: "follow bar backchannel", command: "chat follow bar-backchannel" },
            { label: "follow incident chat", command: "chat follow incident-chat" },
            { label: "stop stream", command: "stop" }
          ]);
          break;
        }

        if (sub === "open") {
          if (!args[1]) {
            warn("usage: chat open <file>");
            break;
          }
          const path = resolveInDirectory("/secure/chats", args[1]);
          if (!path) {
            printPathNotFound(args[1]);
            break;
          }
          readFile(path);
          break;
        }

        if (sub === "follow") {
          const room = String(args[1] || "ops-nightshift").toLowerCase();
          const feedMap = {
            "ops-nightshift": [
              "Theo: booth C handoff complete",
              "Erik: martini line stable",
              "Ju: locker B checked",
              "Andrea: syrup station clean"
            ],
            "bar-backchannel": [
              "MK: ice run in 12 minutes",
              "Nicola: coupe stock at 18",
              "Theo: queue at 5",
              "Erik: thyme bitters low"
            ],
            "incident-chat": [
              "Ops: guest asked about portal again",
              "Floor: water protocol applied",
              "Ops: no escalation",
              "Lead: log and continue service"
            ]
          };
          const feed = feedMap[room] || feedMap["ops-nightshift"];
          startStream("CHAT FOLLOW " + room.toUpperCase(), 2000, () => {
            return "[" + nowClock() + "] " + sample(feed);
          });
          break;
        }

        warn("usage: chat list | chat open <file> | chat follow <room>");
        break;
      }

      case "inventory":
        if (!state.staff) {
          err("staff only command");
          break;
        }
        readFile("/secure/ops/inventory-deep-2026-02-21.txt");
        break;

      case "recipes": {
        if (args[0] && args[0].toLowerCase() === "random") {
          const parts = ["gin", "rye", "mezcal", "amaro", "vermouth", "honey", "citrus", "coffee", "herbal bitters"];
          ok("experimental -> " + sample(parts) + " + " + sample(parts) + " + " + sample(parts));
          break;
        }
        if (!state.staff) {
          readFile("/bar/menu/house-menu.txt");
          line("staff mode unlocks deep recipe notes", "muted");
          break;
        }
        readFile("/secure/ops/recipe-notes-classified.md");
        break;
      }

      case "panel": {
        if (!state.staff) {
          err("staff only command");
          break;
        }
        const sub = (args[0] || "status").toLowerCase();
        if (sub === "list") {
          printPanelModules();
        } else if (sub === "status") {
          printPanelStatus();
        } else if (sub === "set") {
          setPanel(args[1], args.slice(2));
        } else if (sub === "run") {
          runPanelSequence(args[1]);
        } else if (sub === "test") {
          runPanelTest(args[1]);
        } else {
          warn("usage: panel list|status|set|run|test");
        }
        break;
      }

      case "ops":
        printOpsDashboard();
        break;

      case "dossier":
        printDossier();
        break;

      case "reviews": {
        const sub = (args[0] || "").toLowerCase();
        if (sub === "add") {
          const text = args.slice(1).join(" ").trim();
          if (!text) {
            warn("usage: reviews add <text>");
            break;
          }
          state.reviews.push("[" + nowStamp() + "] " + state.username + ": " + text);
          ok("review captured");
        } else if (sub === "list") {
          banner("REVIEWS");
          if (!state.reviews.length) {
            line("no reviews captured", "muted");
          } else {
            state.reviews.forEach((entry) => line(entry));
          }
        } else {
          warn("usage: reviews add <text> | reviews list");
        }
        break;
      }

      case "tail":
        if (!state.staff) {
          err("staff only command");
          break;
        }
        if (args[0] === "-f" && args[1] === "/dev/rad") {
          startStream("PRIVATE RAD CHANNEL", 1500, () => {
            const value = (Math.random() * 0.28 + 0.08).toFixed(2);
            const tag = parseFloat(value) > 0.34 ? "hazard" : "stable";
            return "[" + nowClock() + "] rad=" + value + " uSv/h  " + tag;
          });
        } else {
          warn("usage: tail -f /dev/rad");
        }
        break;

      case "term": {
        const sub = (args[0] || "").toLowerCase();
        const value = (args[1] || "").toLowerCase();
        if (sub === "night") {
          if (value === "on") {
            document.documentElement.setAttribute("data-night", "on");
            ok("night phosphor on");
          } else if (value === "off") {
            document.documentElement.setAttribute("data-night", "off");
            ok("night phosphor off");
          } else {
            warn("usage: term night on|off");
          }
        } else {
          warn("usage: term night on|off");
        }
        break;
      }

      case "staff": {
        const sub = (args[0] || "").toLowerCase();
        if (!state.staff) {
          startStaffLogin(false);
          break;
        }

        if (sub === "logout") {
          stopStream(false);
          state.staff = false;
          state.phase = "terminal";
          state.username = "guest";
          if (isRestricted(state.cwd)) {
            state.cwd = "/bar/frontdesk";
          }
          updatePrompt();
          ok("staff session closed");
        } else if (sub === "logs") {
          readFile("/var/log/staff.log");
        } else {
          ok("staff session active. use: staff logs | staff logout");
        }
        break;
      }

      case "login":
        if (!state.staff) {
          startStaffLogin(false);
        } else {
          ok("already logged in as staff");
        }
        break;

      case "sudo":
        if ((args[0] || "").toLowerCase() === "please") {
          startStaffLogin(true);
        } else {
          warn("usage: sudo please");
        }
        break;

      case "stop":
        stopStream(true);
        break;

      case "clear":
        screen.innerHTML = "";
        break;

      default:
        suggestCommand(cmd);
        break;
    }
  }

  function handleEnter() {
    const raw = input.value.trim();
    if (state.pendingPrompt) {
      const request = state.pendingPrompt;
      state.pendingPrompt = null;
      line(request.label + ": " + (request.hidden ? "******" : raw));
      input.value = "";
      input.placeholder = "";
      configureInputMode();
      request.callback(raw);
      return;
    }

    if (!raw) {
      if (state.phase === "menu" && state.guestMenu.actions.length) {
        runGuestMenuSelection();
      }
      return;
    }

    line(ps1.textContent + " " + raw);
    input.value = "";

    if (/^\d+$/.test(raw) && state.quickActions.length) {
      const index = parseInt(raw, 10) - 1;
      const action = state.quickActions[index];
      if (!action) {
        warn("quick action not found");
        return;
      }
      line("-> " + action.command, "muted");
      state.history.push(action.command);
      state.historyIndex = state.history.length;
      runCommand(action.command);
      return;
    }

    state.history.push(raw);
    state.historyIndex = state.history.length;
    runCommand(raw);
  }

  function keyHandler(event) {
    if (state.phase === "booting" || state.phase === "await_key") {
      return;
    }

    if (state.phase === "menu") {
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      if (!state.pendingPrompt) {
        autocompleteInput();
      }
      return;
    }

    if (event.key === "Enter") {
      handleEnter();
      return;
    }

    if (event.key === "Escape" && state.pendingPrompt) {
      state.pendingPrompt = null;
      input.value = "";
      input.placeholder = "";
      configureInputMode();
      warn("prompt cancelled");
      return;
    }

    if (state.pendingPrompt) {
      return;
    }

    if (event.key === "ArrowUp") {
      if (!state.history.length) {
        return;
      }
      event.preventDefault();
      state.historyIndex = Math.max(0, state.historyIndex - 1);
      input.value = state.history[state.historyIndex] || "";
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }

    if (event.key === "ArrowDown") {
      if (!state.history.length) {
        return;
      }
      event.preventDefault();
      state.historyIndex = Math.min(state.history.length, state.historyIndex + 1);
      input.value = state.history[state.historyIndex] || "";
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "c") {
      stopStream(true);
    }
  }

  function queueBoot(fn, delayMs) {
    const handle = setTimeout(() => {
      state.bootTimers = state.bootTimers.filter((id) => id !== handle);
      fn();
    }, delayMs);
    state.bootTimers.push(handle);
  }

  function clearBootTimers() {
    state.bootTimers.forEach((handle) => clearTimeout(handle));
    state.bootTimers = [];
  }

  function openGuestConsole() {
    boot.hidden = true;
    screen.hidden = false;
    prompt.hidden = true;
    prompt.style.display = "none";
    input.disabled = true;
    input.blur();
    updatePrompt();
    configureInputMode();
    renderGuestHome();
  }

  function startBootSequence() {
    clearBootTimers();
    state.phase = "booting";
    boot.hidden = false;
    screen.hidden = true;
    prompt.hidden = true;
    boot.textContent = "";

    const frames = [
      { text: "Safehouse Instrumentation Works", wait: 190 },
      { text: "PROM Monitor P-59 Rev 4.12 (C) 1962-1986", wait: 160 },
      { text: "", wait: 80 },
      { text: "Machine: P-59 Relay/Tube Hybrid Console", wait: 90 },
      { text: "CPU0: AURORA-9/66 vacuum-core scalar processor", wait: 85 },
      { text: "Real memory = 8192K ferrite-core", wait: 80 },
      { text: "Extended memory = 65536K magneto-drum cache", wait: 85 },
      { text: "", wait: 80 },
      { text: "Boot device: /dev/sd0a", wait: 90 },
      { text: "Loading /boot/unix59 ...", wait: 110 },
      { text: "", wait: 70 },
      { text: "Safehouse UNIX/59 8.4: Sat Feb 21 2026", wait: 95 },
      { text: "Copyright (c) Safehouse Systems", wait: 80 },
      { text: "", wait: 70 },
      { text: "mainbus0 at root", wait: 80 },
      { text: "cpu0 at mainbus0: AURORA-9/66 stepping 5", wait: 72 },
      { text: "fpu0 at cpu0: vector coprocessor", wait: 68 },
      { text: "mem0 at mainbus0: 8192K", wait: 66 },
      { text: "mcache0 at mainbus0: 65536K drum-cache", wait: 66 },
      { text: "tty0 at mainbus0: teletype console", wait: 68 },
      { text: "rad0 at mainbus0: geiger mesh interface", wait: 70 },
      { text: "airlock0 at mainbus0: pressure interlock", wait: 72 },
      { text: "bar0 at mainbus0: service matrix bus", wait: 70 },
      { text: "ide0 at mainbus0", wait: 64 },
      { text: "sd0 at ide0 drive 0: <SAFEHOUSE, VaultDisk, 7.2>", wait: 74 },
      { text: "sd0: 4096MB, 8320 cyl, 16 head, 63 sec, 512 bytes/sect", wait: 75 },
      { text: "securefs0 at sd0a: encrypted archive volume (locked)", wait: 78 },
      { text: "", wait: 75 },
      { text: "init: /sbin/init", wait: 90 },
      { text: "init: entering multi-user mode", wait: 86 },
      { text: "rc: checking local filesystems", wait: 82 },
      { text: "/dev/sd0a: clean, 12411 files, 90322 blocks", wait: 80 },
      { text: "/dev/mon0: clean", wait: 76 },
      { text: "rc: starting syslogd ........ done", wait: 74 },
      { text: "rc: starting cron ........... done", wait: 72 },
      { text: "rc: starting radmond ........ done", wait: 74 },
      { text: "rc: starting baropsd ........ done", wait: 74 },
      { text: "rc: secure archive remains locked (staff auth required)", wait: 84 },
      { text: "rc: guest console profile loaded", wait: 90 },
      { text: "", wait: 70 },
      { text: "PRESS ANY KEY TO CONTINUE", wait: 0 }
    ];

    let index = 0;
    const step = () => {
      if (index >= frames.length) {
        state.phase = "await_key";
        return;
      }
      boot.textContent += frames[index].text + "\n";
      boot.scrollTop = boot.scrollHeight;
      const wait = frames[index].wait;
      index += 1;
      if (wait > 0) {
        queueBoot(step, wait);
      } else {
        state.phase = "await_key";
      }
    };

    step();
  }

  document.addEventListener("keydown", (event) => {
    if (state.phase === "booting") {
      return;
    }

    if (state.phase === "await_key") {
      event.preventDefault();
      openGuestConsole();
      return;
    }

    if (state.phase === "menu") {
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        moveGuestMenuCursor(-1);
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        moveGuestMenuCursor(1);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        runGuestMenuSelection();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if (typeof state.guestMenu.onBack === "function") {
          state.guestMenu.onBack();
        } else {
          renderGuestHome();
        }
        return;
      }
      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        const idx = parseInt(event.key, 10) - 1;
        if (state.guestMenu.actions[idx]) {
          state.guestMenu.index = idx;
          updateGuestMenuCursor();
          runGuestMenuSelection();
        }
      }
      return;
    }

    if (event.key === "/" && document.activeElement !== input && !input.disabled) {
      event.preventDefault();
      input.focus();
    }
  });

  input.addEventListener("keydown", keyHandler);
  terminal.addEventListener("pointerdown", () => {
    if (state.phase === "await_key") {
      openGuestConsole();
      return;
    }
    if (state.phase !== "booting" && !input.disabled) {
      input.focus();
    }
  });

  updatePrompt();
  configureInputMode();
  startBootSequence();
}

function createFilesystem() {
  return {
    "/": ["bar", "monitors", "public", "var", "secure"],

    "/bar": ["frontdesk", "menu", "service", "office"],

    "/bar/frontdesk": [
      "welcome.txt",
      "terminal-guide.txt",
      "reservations-today.txt",
      "queue-live.txt",
      "house-rules.txt",
      "payment-policy.txt"
    ],
    "/bar/frontdesk/welcome.txt":
      "WELCOME TO THE SAFEHOUSE TERMINAL\n" +
      "This is the frontdesk operator interface for guest-facing service.\n" +
      "For command overview type: help\n" +
      "For live telemetry type: status",
    "/bar/frontdesk/terminal-guide.txt":
      "TERMINAL QUICK GUIDE\n" +
      "help         command directory\n" +
      "menu         current bar menu and specials\n" +
      "status       live service snapshot\n" +
      "monitor rad follow   live radiation feed\n" +
      "events       upcoming house events",
    "/bar/frontdesk/reservations-today.txt":
      "RESERVATIONS - TODAY\n" +
      "19:30  K. Matsu  x2\n" +
      "20:15  S. Reed   x4\n" +
      "21:00  VIP (redacted)\n" +
      "22:20  Walk-in queue priority",
    "/bar/frontdesk/queue-live.txt":
      "QUEUE LIVE\n" +
      "Current wait: 11m\n" +
      "Booth availability: B2 pending, C1 occupied\n" +
      "Water service protocol: active",
    "/bar/frontdesk/house-rules.txt":
      "HOUSE RULES\n" +
      "1) No open flame near paper menus\n" +
      "2) Water service on request and by judgment\n" +
      "3) Keep voice level below booth glass line\n" +
      "4) Respect no-photo zones",
    "/bar/frontdesk/payment-policy.txt":
      "PAYMENT POLICY\n" +
      "Card and cash accepted\n" +
      "Unrecognized commemorative coins not accepted\n" +
      "Staff gratuity split nightly",

    "/bar/menu": [
      "house-menu.txt",
      "seasonal-board-2026-02.txt",
      "non-alcoholic.txt",
      "allergens.txt",
      "pairings.txt",
      "coffee-program.txt"
    ],
    "/bar/menu/house-menu.txt":
      "HOUSE MENU\n" +
      "thyme-lord           sour      butterfly-pea gin/lemon/orgeat/thyme bitters/egg white\n" +
      "one-piece            tropical  dark jamaican rum/lime/coconut/pineapple bitters\n" +
      "masaya-chai          spirit    assam vodka/demerara/masala bitters\n" +
      "montorsats           built     aquavit/honey/chamomile\n" +
      "the-boring-cocktail  highball  vodka/soda/ice (yes, really) - Y5000\n" +
      "remedy-shot          shot      secret parting shot served at close",
    "/bar/menu/seasonal-board-2026-02.txt":
      "PRE-WAR COCKTAILS\n" +
      "old-fashioned        classic   bourbon/angostura/sugar\n" +
      "margarita            sour      tequila/cointreau/lime\n" +
      "daiquiri             sour      white rum/lime/sugar\n" +
      "espresso-martini     after     vodka/coffee liqueur/fresh espresso\n" +
      "penicillin           smoky     scotch/lemon/honey/ginger/islay float\n" +
      "moscow-mule          mule      vodka/lime/ginger beer\n" +
      "sazerac              stirred   cognac/absinthe/sugar/peychaud's bitters\n" +
      "100-years-old-cigar  bitter    absinthe/aged rum/cynar/benedictine/laphroaig/angostura\n" +
      "grasshopper          dessert   creme de menthe/creme de cacao/cream\n" +
      "brandy-alexander     dessert   cognac/dark creme de cacao/cream",
    "/bar/menu/non-alcoholic.txt":
      "NON-ALCOHOLIC\n" +
      "shelter-water     chilled water, lemon oils\n" +
      "dry-arc           lapsang tea, grapefruit, tonic\n" +
      "night-porter      cold brew, cacao, soda",
    "/bar/menu/allergens.txt":
      "ALLERGEN REFERENCE\n" +
      "Egg: thyme-lord\n" +
      "Nut: thyme-lord (orgeat)\n" +
      "Coconut: one-piece\n" +
      "Dairy: grasshopper, brandy-alexander",
    "/bar/menu/pairings.txt":
      "PAIRINGS\n" +
      "thyme-lord -> roasted almonds, citrus olives\n" +
      "one-piece -> citrus nuts, grilled pineapple bite\n" +
      "masaya-chai -> spiced dark chocolate shard\n" +
      "old-fashioned -> smoked pecans, hard cheese\n" +
      "espresso-martini -> cocoa nib biscotti",
    "/bar/menu/coffee-program.txt":
      "COFFEE PROGRAM\n" +
      "single-origin cold brew daily\n" +
      "espresso cut-off: 00:15",

    "/bar/service": [
      "hours.txt",
      "contacts.txt",
      "events-calendar-2026.txt",
      "lost-and-found-public.txt",
      "water-policy-public.txt"
    ],
    "/bar/service/hours.txt":
      "HOURS\n" +
      "Tue-Sun 18:00-01:00\n" +
      "Monday closed\n" +
      "Last call 00:30",
    "/bar/service/contacts.txt":
      "CONTACTS\n" +
      "Phone: +81 (0)11-SAFE-BAR\n" +
      "Mail: contact@safehouse.bar\n" +
      "IG: @safehouse.bar",
    "/bar/service/events-calendar-2026.txt":
      "EVENT CALENDAR 2026\n" +
      "2026-02-24  Quiet Vinyl Night\n" +
      "2026-02-27  Staff Recipe Lab (invite)\n" +
      "2026-03-05  Pre-War Martini Workshop",
    "/bar/service/lost-and-found-public.txt":
      "LOST + FOUND\n" +
      "- brass lighter (initials M.K.)\n" +
      "- black notebook (grid, no name)\n" +
      "- silver tie clip",
    "/bar/service/water-policy-public.txt":
      "WATER POLICY\n" +
      "Water is hospitality, not penalty.\n" +
      "Offer proactively for guests under stress.",

    "/bar/office": [
      "supply-request-form.txt",
      "maintenance-request-form.txt",
      "broadcast-notice.txt"
    ],
    "/bar/office/supply-request-form.txt":
      "SUPPLY REQUEST\n" +
      "Date:\n" +
      "Requested by:\n" +
      "Items:\n" +
      "Urgency: normal|high",
    "/bar/office/maintenance-request-form.txt":
      "MAINTENANCE REQUEST\n" +
      "Location:\n" +
      "Issue:\n" +
      "Safety impact: none|watch|critical",
    "/bar/office/broadcast-notice.txt":
      "BROADCAST NOTICE\n" +
      "Keep announcements short and calm.\n" +
      "Never read technical alarm figures to guest floor.",

    "/monitors": [
      "snapshot.txt",
      "radiation-public.log",
      "flow-public.log",
      "service-public.log",
      "stock-public.log"
    ],
    "/monitors/snapshot.txt":
      "MONITOR SNAPSHOT\n" +
      "Use: status\n" +
      "Use: monitor <rad|flow|service|stock> [follow]",
    "/monitors/radiation-public.log":
      "RADIATION PUBLIC LOG\n" +
      "[18:00] 0.12 stable\n" +
      "[19:00] 0.18 stable\n" +
      "[20:30] 0.29 watch",
    "/monitors/flow-public.log":
      "FLOW PUBLIC LOG\n" +
      "[18:10] throughput 11/10m\n" +
      "[19:20] throughput 16/10m\n" +
      "[20:40] throughput 14/10m",
    "/monitors/service-public.log":
      "SERVICE PUBLIC LOG\n" +
      "[18:12] queue 2\n" +
      "[19:05] queue 5\n" +
      "[20:41] queue 4",
    "/monitors/stock-public.log":
      "STOCK PUBLIC LOG\n" +
      "[18:00] citrus 92%\n" +
      "[19:30] ice 87%\n" +
      "[20:45] bitters 74%",

    "/public": ["motd.txt", "about-safehouse.txt", "chi-siamo.txt", "press-notes.txt", "faq.txt", "guest-guide.txt", "arrivare-safehouse.txt", "story-card.txt", "map-public.txt", "file-corrotto-77.bin"],
    "/public/motd.txt": "MOTD: Keep lights warm. Keep voices low. Keep water ready.",
    "/public/about-safehouse.txt":
      "ABOUT SAFEHOUSE\n" +
      "A cocktail bar built around precision service and calm atmosphere.\n" +
      "The terminal you see is part menu board, part operations theater.",
    "/public/chi-siamo.txt":
      "CHI SIAMO\n" +
      "Safehouse e un cocktail bar narrativo: servizio preciso, atmosfera calma,\n" +
      "ricette curate e una forte identita atompunk.\n" +
      "Ogni drink racconta una storia, ma il comfort del cliente viene prima di tutto.",
    "/public/press-notes.txt":
      "PRESS NOTES\n" +
      "The last bar before sense returns.\n" +
      "A room that feels like memory with better glassware.",
    "/public/faq.txt":
      "FAQ\n" +
      "Q: Reservations?\n" +
      "A: Limited nightly slots.\n" +
      "Q: Dress code?\n" +
      "A: Smart casual.\n" +
      "Q: Do you serve non-alcoholic options?\n" +
      "A: Yes, ask for the zero-proof board.\n" +
      "Q: Is there a no-photo area?\n" +
      "A: Yes, selected zones are no-photo.",
    "/public/guest-guide.txt":
      "GUIDA OSPITE\n" +
      "1) Usa le frecce per muoverti nel terminale.\n" +
      "2) Premi ENTER per aprire la voce selezionata.\n" +
      "3) Premi ESC per tornare indietro.\n" +
      "4) Per assistenza rapida, apri CONTATTI.",
    "/public/arrivare-safehouse.txt":
      "COME ARRIVARE\n" +
      "Punto di riferimento: tratto centrale della MAIN ARTERY.\n" +
      "Attraversa verso il canale e segui la CURVED RING ROAD.\n" +
      "L'ingresso Safehouse e sulla service lane lato canale.",
    "/public/story-card.txt":
      "HOUSE STORY (PUBLIC)\n" +
      "We built this room to slow the world down for one drink at a time.",
    "/public/file-corrotto-77.bin":
      "BINARY PAYLOAD\n" +
      "checksum failed\n" +
      "open from PUBLIC FILES menu for live damaged stream",
    "/public/map-public.txt":
      "CITY GRID // NIGHT SCAN\n" +
      "NORTH UP\n" +
      "\n" +
      "+------------------------------------------------------------------------+\n" +
      "| |   |   |   |   |        |        | || |        |        |   |   |    |\n" +
      "| |---+---+---+---+--------+--------| || |--------+--------+---+---+----|\n" +
      "| |   |   |   |   |        |        | || |        |        |   |   |    |\n" +
      "| |   |   |   |   |        |        | || |        |        |   |   |    |\n" +
      "| +============================= MAIN ARTERY ==========================+  |\n" +
      "| |   |   |   |   |        |  ~~~   |        |   ||   |   |   |      |  |\n" +
      "| |---+---+---+---+--------| ~~ ~~  |--------+---||---+---+---+------+--|\n" +
      "| |   |   |   |   |        |  ~~~   |        |   ||   |   |   |      |  |\n" +
      "| |   |   |   |   |        | ~~ ~~  |        |   ||   |   |   |      |  |\n" +
      "| |---+---+---+---+--------|  ~~~   |--------+---||---+---+---+------+--|\n" +
      "| |   |   |   |   |        | ~~ ~~  |        |   ||   |   |   |      |  |\n" +
      "| +------------------------------ CURVED RING ROAD --------------------+ |\n" +
      "|    \\                                                                    |\n" +
      "|     \\___________________________ SAFEHOUSE * ___________________________|\n" +
      "|                                                                        |\n" +
      "+------------------------------------------------------------------------+\n" +
      "Legend: ~ canal  = arterial road  * safehouse",

    "/var": ["log"],
    "/var/log": ["guest.log", "rad.log", "staff.log", "internal.log", "security.log"],
    "/var/log/guest.log":
      "[2026-02-21 18:02] door/open      ok\n" +
      "[2026-02-21 18:14] host/queue     updated\n" +
      "[2026-02-21 19:03] service/water  proactive\n" +
      "[2026-02-21 19:38] guest/request  no-photo zone reminder",
    "/var/log/rad.log":
      "[18:00] 0.12 stable\n" +
      "[19:00] 0.18 stable\n" +
      "[20:30] 0.31 watch",
    "/var/log/staff.log":
      "[18:00:01] shift/open     JN: lights on\n" +
      "[18:11:47] bar/spec       Erik: thyme batch #4 strong\n" +
      "[19:10:09] floor/guest    Theo: queue at 5\n" +
      "[20:05:12] ops/map        pins moved again",
    "/var/log/internal.log":
      "INTERNAL LOG\n" +
      "relay bus drift 0.3%\n" +
      "co2 sensor recalib due monday",
    "/var/log/security.log":
      "SECURITY LOG\n" +
      "failed auth 3x (redacted)\n" +
      "restricted panel accessed by staff",

    "/secure": [
      "readme-restricted.txt",
      "lore",
      "personnel",
      "chats",
      "incidents",
      "control",
      "ops",
      "archive"
    ],
    "/secure/readme-restricted.txt":
      "RESTRICTED ARCHIVE\n" +
      "Contains lore records, personnel files, incident reports, ops chats, and system controls.",

    "/secure/lore": [
      "timeline-1947-1962.md",
      "journal-1963-day0.md",
      "journal-1963-day11.md",
      "journal-1968.md",
      "journal-1972.md",
      "first-door-dossier.md",
      "second-lock-report.md",
      "map-pin-anomalies-2025.log",
      "hum-frequency-notes.md",
      "vault-myth-index.txt",
      "red-button-origin.md",
      "sunlight-vial-notes.md",
      "false-arrow-protocol.md",
      "booth-c-memory-test.md",
      "geiger-symphony-d-notes.md",
      "corridor-season-shift.md",
      "north-cellar-anecdotes.md",
      "founder-audio-transcript-07.txt",
      "stairwell-coins-theory.md",
      "hospitality-engineering-manifesto.md",
      "field-manual-guest-calming-1964.md",
      "booth-d-anomaly-audio-log-1981.txt",
      "night-of-three-clocks-1997.md",
      "stairwell-weather-table-2024-2026.csv",
      "vault-room-smell-index.md",
      "glassware-omen-catalog.md",
      "silent-minute-protocol.md",
      "radio-room-fragments-1988.log"
    ],
    "/secure/lore/timeline-1947-1962.md":
      "TIMELINE 1947-1962\n" +
      "1947: first basement lease signed\n" +
      "1954: relay console prototype delivered\n" +
      "1961: pressure door frame prepared\n" +
      "1962: room renamed SAFEHOUSE",
    "/secure/lore/journal-1963-day0.md":
      "DAY 0\n" +
      "They said it was a drill.\n" +
      "The bartender kept service open anyway.\n" +
      "We sealed the first door before midnight.",
    "/secure/lore/journal-1963-day11.md":
      "DAY 11\n" +
      "A woman traded a story for a drink.\n" +
      "The story weighed more than the bottle.",
    "/secure/lore/journal-1968.md":
      "1968 JOURNAL\n" +
      "When map pins move, let them.\n" +
      "Arrows are for comfort, not navigation.",
    "/secure/lore/journal-1972.md":
      "1972 JOURNAL\n" +
      "Second lock added.\n" +
      "People stopped laughing about the first.",
    "/secure/lore/first-door-dossier.md":
      "FIRST DOOR DOSSIER\n" +
      "Material: reinforced steel skin, brass latch\n" +
      "Behavior note: low-frequency hum after close",
    "/secure/lore/second-lock-report.md":
      "SECOND LOCK REPORT\n" +
      "Install date: 1972-04-16\n" +
      "Reason: unknown corridor pressure events",
    "/secure/lore/map-pin-anomalies-2025.log":
      "MAP PIN ANOMALIES 2025\n" +
      "2025-06-18 20:33 moved 3cm west\n" +
      "2025-08-10 19:59 moved 1cm north\n" +
      "2025-11-02 21:14 moved overnight",
    "/secure/lore/hum-frequency-notes.md":
      "HUM FREQUENCY NOTES\n" +
      "Target comfort range: 72-83 Hz\n" +
      "Above 90 Hz guests report stairwell tension.",
    "/secure/lore/vault-myth-index.txt":
      "VAULT MYTH INDEX\n" +
      "- sunlight vial\n" +
      "- wrong-decade coins\n" +
      "- red button\n" +
      "- third key",
    "/secure/lore/red-button-origin.md":
      "RED BUTTON ORIGIN\n" +
      "Original function unknown.\n" +
      "Current policy: shielded, never demo on guest floor.",
    "/secure/lore/sunlight-vial-notes.md":
      "SUNLIGHT VIAL NOTES\n" +
      "Keep sealed in locker 3.\n" +
      "Do not expose to cold room LEDs for more than 30s.",
    "/secure/lore/false-arrow-protocol.md":
      "FALSE ARROW PROTOCOL\n" +
      "If asked for directions, provide story path.\n" +
      "Do not correct wall arrows.",
    "/secure/lore/booth-c-memory-test.md":
      "BOOTH C MEMORY TEST\n" +
      "Subjective reports: deja vu 4/10\n" +
      "No measurable hazard detected.",
    "/secure/lore/geiger-symphony-d-notes.md":
      "GEIGER SYMPHONY IN D\n" +
      "Busy nights produce near-musical tick clusters.\n" +
      "Recordings archived in tape room.",
    "/secure/lore/corridor-season-shift.md":
      "CORRIDOR SEASON SHIFT\n" +
      "Witness report: stairwell opened to winter air in August.\n" +
      "Duration: 43 seconds.",
    "/secure/lore/north-cellar-anecdotes.md":
      "NORTH CELLAR ANECDOTES\n" +
      "Bottles found rearranged after close on three occasions.",
    "/secure/lore/founder-audio-transcript-07.txt":
      "TRANSCRIPT 07\n" +
      "Keep lights warm. Keep talk warmer.\n" +
      "If pins move, log and let them move.",
    "/secure/lore/stairwell-coins-theory.md":
      "STAIRWELL COINS THEORY\n" +
      "Coins in ductwork dampen harmonic resonance.\n" +
      "Unverified but operationally tolerated.",
    "/secure/lore/hospitality-engineering-manifesto.md":
      "HOSPITALITY ENGINEERING MANIFESTO\n" +
      "A bar is a safety system in evening clothes.\n" +
      "A recipe is a protocol with empathy.",
    "/secure/lore/field-manual-guest-calming-1964.md":
      "FIELD MANUAL 1964 - GUEST CALMING\n" +
      "Step 1: lower tone before lowering lights.\n" +
      "Step 2: water first, options second.\n" +
      "Step 3: never argue with fear, redirect it.",
    "/secure/lore/booth-d-anomaly-audio-log-1981.txt":
      "BOOTH D AUDIO LOG 1981\n" +
      "[00:11] low hum at 77hz\n" +
      "[00:13] glass resonance, no break\n" +
      "[00:15] anomaly ended after music bus mute",
    "/secure/lore/night-of-three-clocks-1997.md":
      "NIGHT OF THREE CLOCKS - 1997\n" +
      "The wall clock, wristwatch, and register clock split by 9 minutes.\n" +
      "Staff completed full service with paper timestamps only.",
    "/secure/lore/stairwell-weather-table-2024-2026.csv":
      "date,reported_weather,observed_weather,duration_sec\n" +
      "2024-11-02,clear,winter_fog,31\n" +
      "2025-08-17,humid,dry_wind,52\n" +
      "2026-01-09,snow,rain,18",
    "/secure/lore/vault-room-smell-index.md":
      "VAULT ROOM SMELL INDEX\n" +
      "amber: old paper + citrus peel\n" +
      "blue: ozone + wet stone\n" +
      "red: iron + coffee\n" +
      "note: red requires room vent cycle",
    "/secure/lore/glassware-omen-catalog.md":
      "GLASSWARE OMEN CATALOG\n" +
      "coupe fogging without pour -> incoming crowd surge\n" +
      "nick&nora ringing at rest -> monitor hum spike likely",
    "/secure/lore/silent-minute-protocol.md":
      "SILENT MINUTE PROTOCOL\n" +
      "Trigger: sustained guest-floor noise over threshold.\n" +
      "Action: mute music, serve water rounds, hold orders for 60s.",
    "/secure/lore/radio-room-fragments-1988.log":
      "[radio/1988-03-04] signal repeats 'keep arrows wrong'\n" +
      "[radio/1988-06-11] static burst during closing ledger\n" +
      "[radio/1988-09-29] unidentified voice requested booth C",

    "/secure/personnel": [
      "roster-2026.txt",
      "shift-reviews-2026-02.md",
      "disciplinary-notes-2025.txt",
      "hiring-pipeline-2026.md",
      "training-track-levels.md",
      "payroll-redacted-2026-02.csv",
      "medical-notes-redacted.txt",
      "handover-notes-2026-02-21.md",
      "staff-compatibility-matrix.csv",
      "uniform-specs.txt",
      "profiles"
    ],
    "/secure/personnel/roster-2026.txt":
      "ROSTER 2026\n" +
      "JN, MK, Erik, Theo, Luporosso, Andrea, Ju, Nicola, Giuliano, Sara, Kenji",
    "/secure/personnel/shift-reviews-2026-02.md":
      "SHIFT REVIEWS FEB 2026\n" +
      "Erik: 4.9 consistency\n" +
      "Theo: 4.8 floor calm\n" +
      "Andrea: 4.7 garnish standards",
    "/secure/personnel/disciplinary-notes-2025.txt":
      "DISCIPLINARY NOTES\n" +
      "- one warning for unauthorized playlist override\n" +
      "- one warning for unlabeled syrup batch",
    "/secure/personnel/hiring-pipeline-2026.md":
      "HIRING PIPELINE\n" +
      "Candidates in tasting stage: 3\n" +
      "Next trial shift: 2026-03-02",
    "/secure/personnel/training-track-levels.md":
      "TRAINING TRACKS\n" +
      "L1 barback fundamentals\n" +
      "L2 station execution\n" +
      "L3 narrative service\n" +
      "L4 emergency protocols",
    "/secure/personnel/payroll-redacted-2026-02.csv":
      "name,period,hours,redacted\n" +
      "erik,2026-02,164,***\n" +
      "theo,2026-02,158,***",
    "/secure/personnel/medical-notes-redacted.txt":
      "MEDICAL NOTES REDACTED\n" +
      "Access tier required: management",
    "/secure/personnel/handover-notes-2026-02-21.md":
      "HANDOVER NOTES 2026-02-21\n" +
      "- booth B light jitter solved\n" +
      "- cellar north rack relabeled\n" +
      "- keep reserve vermouth near station C",
    "/secure/personnel/staff-compatibility-matrix.csv":
      "pairing,efficiency,notes\n" +
      "erik+theo,0.96,peak flow control\n" +
      "andrea+nicola,0.91,stirred program consistency\n" +
      "ju+mk,0.89,prep and retrieval speed",
    "/secure/personnel/uniform-specs.txt":
      "UNIFORM SPECS\n" +
      "shirt: charcoal\n" +
      "apron: black waxed canvas\n" +
      "pin: brass safehouse mark",

    "/secure/personnel/profiles": [
      "erik.md",
      "theo.md",
      "luporosso.md",
      "andrea.md",
      "ju.md",
      "nicola.md",
      "giuliano.md",
      "mk.md",
      "jn.md",
      "sara.md",
      "kenji.md"
    ],
    "/secure/personnel/profiles/erik.md":
      "ERIK - Senior Bartender\n" +
      "Role: spec guardian, martini lead\n" +
      "Strength: consistency under pressure\n" +
      "Notes: trusted with off-menu service",
    "/secure/personnel/profiles/theo.md":
      "THEO - Floor and Ops\n" +
      "Role: flow control, guest comfort\n" +
      "Strength: de-escalation and speed",
    "/secure/personnel/profiles/luporosso.md":
      "LUPOROSSO - Night Lead\n" +
      "Role: night command\n" +
      "Strength: long memory, short speeches",
    "/secure/personnel/profiles/andrea.md":
      "ANDREA - Bar Ops\n" +
      "Role: ratio tuning, garnish policy\n" +
      "Strength: glass discipline",
    "/secure/personnel/profiles/ju.md":
      "JU - Logistics and Lost+Found\n" +
      "Role: item chain and locker control\n" +
      "Strength: retrieval speed",
    "/secure/personnel/profiles/nicola.md":
      "NICOLA - Stir and Strain Specialist\n" +
      "Role: stirred specs and timing\n" +
      "Strength: patience and precision",
    "/secure/personnel/profiles/giuliano.md":
      "GIULIANO - Atmosphere Engineer\n" +
      "Role: light and sound control\n" +
      "Strength: subtle mood correction",
    "/secure/personnel/profiles/mk.md":
      "MK - Prep and Cold Chain\n" +
      "Role: ice, citrus, pre-service setup\n" +
      "Strength: anticipates shortages",
    "/secure/personnel/profiles/jn.md":
      "JN - General Lead\n" +
      "Role: systems owner\n" +
      "Strength: calm decision making",
    "/secure/personnel/profiles/sara.md":
      "SARA - Guest Memory Steward\n" +
      "Role: no-photo zone mediation, story pacing\n" +
      "Strength: reads crowd mood quickly\n" +
      "Notes: maintains booth C oral archive",
    "/secure/personnel/profiles/kenji.md":
      "KENJI - Technical Cellar Ops\n" +
      "Role: cold chain and relay diagnostics\n" +
      "Strength: fast fault isolation\n" +
      "Notes: signed off tube-bank maintenance protocol",

    "/secure/chats": [
      "ops-nightshift-2026-02-20.log",
      "bar-backchannel-2026-02.log",
      "founder-thread-archive-01.log",
      "incident-chat-portal-question.log",
      "music-queue-votes.log",
      "maintenance-thread-2026-02.log",
      "quiet-room-observations.log"
    ],
    "/secure/chats/ops-nightshift-2026-02-20.log":
      "[19:08] Theo: queue at five\n" +
      "[19:09] Erik: martini line stable\n" +
      "[19:12] Ju: lighter claimed, verified\n" +
      "[19:14] Andrea: bitters low, ordering",
    "/secure/chats/bar-backchannel-2026-02.log":
      "[20:01] MK: block ice in 18 min\n" +
      "[20:02] Nicola: coupes at 14\n" +
      "[20:04] Theo: table 3 requests quiet booth",
    "/secure/chats/founder-thread-archive-01.log":
      "[archive] keep arrows wrong\n" +
      "[archive] story first, recipe second\n" +
      "[archive] water is never wrong",
    "/secure/chats/incident-chat-portal-question.log":
      "[22:05] Floor: guest asked about portal\n" +
      "[22:05] Ops: water protocol and calm script\n" +
      "[22:07] Floor: resolved",
    "/secure/chats/music-queue-votes.log":
      "[21:10] vote: low vinyl +2\n" +
      "[21:13] vote: no brass tonight +1\n" +
      "[21:20] final: low vinyl",
    "/secure/chats/maintenance-thread-2026-02.log":
      "[17:03] Kenji: condenser cleaned\n" +
      "[17:15] JN: relay hum normalized\n" +
      "[17:19] MK: ice room latch tightened",
    "/secure/chats/quiet-room-observations.log":
      "[20:44] Sara: booth D settled after water service\n" +
      "[21:02] Theo: voice levels normal\n" +
      "[21:28] Andrea: no escalation needed",

    "/secure/incidents": [
      "incident-2024-11-03.log",
      "incident-2025-06-18.log",
      "incident-2025-12-31.log",
      "maintenance-2026-02-19.log",
      "airlock-cycle-anomaly-2026-02-11.log",
      "coin-audit-2026-01.log",
      "vault-alarm-dryrun-2026-02-01.log",
      "incident-2026-02-20-glass-hum.log"
    ],
    "/secure/incidents/incident-2024-11-03.log":
      "[22:14] coin toss settled recipe dispute\n" +
      "[22:51] brass lighter moved to locker B\n" +
      "[23:06] time-vortex request, water served",
    "/secure/incidents/incident-2025-06-18.log":
      "[19:09] booth A power flicker, auto stabilized\n" +
      "[20:33] map pins moved, card replaced\n" +
      "[21:55] inventory mismatch beans +1 -1",
    "/secure/incidents/incident-2025-12-31.log":
      "[23:43] countdown crowd surge controlled\n" +
      "[23:58] one table evacuated due glass break",
    "/secure/incidents/maintenance-2026-02-19.log":
      "[16:02] relay rail tightened\n" +
      "[16:18] geiger calibration pass\n" +
      "[16:40] cellar compressor cleaned",
    "/secure/incidents/airlock-cycle-anomaly-2026-02-11.log":
      "cycle duration spiked to 11.2s\n" +
      "cause: dust on sensor B\n" +
      "fix: cleaned, retested",
    "/secure/incidents/coin-audit-2026-01.log":
      "3 coins stamped with impossible dates\n" +
      "stored in sealed envelope locker C",
    "/secure/incidents/vault-alarm-dryrun-2026-02-01.log":
      "dry run complete in 01:26\n" +
      "response rating: acceptable",
    "/secure/incidents/incident-2026-02-20-glass-hum.log":
      "[20:51] booth C stemware resonated at 83hz\n" +
      "[20:52] music lowered to low\n" +
      "[20:56] event closed without guest impact",

    "/secure/control": [
      "panel-manual.md",
      "access-codes-fragment.txt",
      "co2-thresholds.txt",
      "lighting-zones.txt",
      "generator-switchback-procedure.md",
      "airlock-safety-checklist.md",
      "cellar-temp-standards.txt",
      "music-policy-night-ops.md",
      "booth-soundstage-calibration.md",
      "panic-light-drill-procedure.md"
    ],
    "/secure/control/panel-manual.md":
      "PANEL MANUAL\n" +
      "panel status\n" +
      "panel set lights warm\n" +
      "panel run opening\n" +
      "panel test power",
    "/secure/control/access-codes-fragment.txt":
      "ACCESS CODES FRAGMENT\n" +
      "vault: XXXX-XX-XX\n" +
      "panel override: redacted",
    "/secure/control/co2-thresholds.txt":
      "CO2 THRESHOLDS\n" +
      "green: < 700ppm\n" +
      "yellow: 700-850ppm\n" +
      "red: > 850ppm",
    "/secure/control/lighting-zones.txt":
      "LIGHTING ZONES\n" +
      "A frontdesk\n" +
      "B main bar\n" +
      "C booth corridor\n" +
      "D stairwell",
    "/secure/control/generator-switchback-procedure.md":
      "GENERATOR SWITCHBACK\n" +
      "1) confirm stable rail\n" +
      "2) set generator standby\n" +
      "3) monitor 3 min",
    "/secure/control/airlock-safety-checklist.md":
      "AIRLOCK SAFETY CHECKLIST\n" +
      "seal A/B\n" +
      "cycle duration\n" +
      "manual override test",
    "/secure/control/cellar-temp-standards.txt":
      "CELLAR TEMP STANDARD\n" +
      "target: 3.8C to 5.4C\n" +
      "warning: > 6.8C",
    "/secure/control/music-policy-night-ops.md":
      "MUSIC POLICY NIGHT OPS\n" +
      "keep baseline under conversation level\n" +
      "switch to silent on lockdown",
    "/secure/control/booth-soundstage-calibration.md":
      "BOOTH SOUNDSTAGE CALIBRATION\n" +
      "target corridor noise: 41-48 dBA\n" +
      "calibrate A/B mics before each weekend shift",
    "/secure/control/panic-light-drill-procedure.md":
      "PANIC LIGHT DRILL\n" +
      "1) panel set lights dim\n" +
      "2) announce calm hold on guest floor\n" +
      "3) restore warm after 90 seconds",

    "/secure/ops": [
      "shift-briefing-2026-02-21.txt",
      "inventory-deep-2026-02-21.txt",
      "prep-notes-2026-02-21.txt",
      "water-policy.md",
      "emergency-script.md",
      "recipe-notes-classified.md",
      "handover-script-guest-floor.md",
      "closing-sequence-quickref.txt"
    ],
    "/secure/ops/shift-briefing-2026-02-21.txt":
      "SHIFT BRIEFING\n" +
      "VIP at 21:00\n" +
      "watch queue after 20:30\n" +
      "run quiet reset if noise rises",
    "/secure/ops/inventory-deep-2026-02-21.txt":
      "INVENTORY DEEP\n" +
      "gin reserve: 11 bottles\n" +
      "rye reserve: 9 bottles\n" +
      "vermouth dry: 6 bottles\n" +
      "orgeat: 1.8L\n" +
      "coconut cream: 2.4L\n" +
      "block ice: 42kg",
    "/secure/ops/prep-notes-2026-02-21.txt":
      "PREP NOTES\n" +
      "label thyme bitters batch #4\n" +
      "freeze coupes from 18:05\n" +
      "check cellar humidity at 19:00",
    "/secure/ops/water-policy.md":
      "WATER POLICY INTERNAL\n" +
      "If guest shows stress markers, serve water before recommendation.\n" +
      "Never frame water as refusal.",
    "/secure/ops/emergency-script.md":
      "EMERGENCY SCRIPT\n" +
      "Keep tone calm.\n" +
      "Move guests to front corridor.\n" +
      "Do not announce raw sensor numbers.",
    "/secure/ops/recipe-notes-classified.md":
      "CLASSIFIED RECIPE NOTES\n" +
      "THYME LORD v4\n" +
      "- gin 50, lemon 25, orgeat 15, egg white 25\n" +
      "- thyme bitters #4: 1.5 dash max\n\n" +
      "SPENT SUNSET v2\n" +
      "- mezcal 35, rye 25, rosso 20\n" +
      "- stir 32 sec, orange oils",
    "/secure/ops/handover-script-guest-floor.md":
      "HANDOVER SCRIPT - GUEST FLOOR\n" +
      "Incoming lead brief:\n" +
      "1) queue and wait estimate\n" +
      "2) sensitive tables\n" +
      "3) active anomalies and mitigation",
    "/secure/ops/closing-sequence-quickref.txt":
      "CLOSING SEQUENCE QUICKREF\n" +
      "panel run quiet-reset\n" +
      "logs show\n" +
      "staff_logs show\n" +
      "verify secure lock state",

    "/secure/archive": [
      "guestbook-full-2025.log",
      "supplier-contracts-redacted.pdf.txt",
      "blueprint-room-a.txt",
      "blueprint-room-b.txt",
      "memo-keep-arrows-wrong.md",
      "founder-letter-jn.md",
      "chronicle-fragments.md",
      "terminal-bluebook-1959.txt",
      "audio-reel-index-1970-1982.md"
    ],
    "/secure/archive/guestbook-full-2025.log":
      "GUESTBOOK FULL 2025\n" +
      "[entries redacted for brevity]\n" +
      "theme frequency: safe, hum, memory, water",
    "/secure/archive/supplier-contracts-redacted.pdf.txt":
      "SUPPLIER CONTRACTS REDACTED\n" +
      "ice, citrus, spirits agreements archived",
    "/secure/archive/blueprint-room-a.txt":
      "BLUEPRINT ROOM A\n" +
      "main bar 14m\n" +
      "booths 3\n" +
      "service alley 1",
    "/secure/archive/blueprint-room-b.txt":
      "BLUEPRINT ROOM B\n" +
      "airlock corridor\n" +
      "storage vault\n" +
      "stairwell",
    "/secure/archive/memo-keep-arrows-wrong.md":
      "MEMO\n" +
      "Do not correct arrows.\n" +
      "They are part of guest calming protocol.",
    "/secure/archive/founder-letter-jn.md":
      "FOUNDER LETTER\n" +
      "Keep lights warm and talk warmer.\n" +
      "Log the anomalies. Keep pouring.",
    "/secure/archive/chronicle-fragments.md":
      "CHRONICLE FRAGMENTS\n" +
      "The geiger sings in D on crowded nights.\n" +
      "Hospitality is a kind of engineering.",
    "/secure/archive/terminal-bluebook-1959.txt":
      "TERMINAL BLUEBOOK 1959\n" +
      "Model P-series operation notes.\n" +
      "Keep relay housings dry and warm before startup.",
    "/secure/archive/audio-reel-index-1970-1982.md":
      "AUDIO REEL INDEX 1970-1982\n" +
      "reel-07: founder briefing\n" +
      "reel-19: geiger symphony draft\n" +
      "reel-24: service doctrine update"
  };
}
