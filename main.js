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
    corruptGame: null,
    recoveredCreds: {
      unlocked: false,
      operatorId: "",
      accessKey: ""
    },
    staffLoginDraft: {
      operatorId: "",
      accessKey: "",
      notice: ""
    },
    founderUnlocked: false,
    founderAttempts: 0,
    founderVaultDraft: {
      passphrase: "",
      notice: ""
    },
    panel: {
      lights: "warm",
      music: "low",
      airlock: "sealed",
      cellar: 4.2,
      co2: 71,
      generator: "online"
    }
  };

  const RECOVERED_OPERATOR_ID = "vault_maintenance";
  const RECOVERED_ACCESS_KEY = "p59_relay_7734";
  const FOUNDER_WORKSPACE_PASSWORD = "frostline_719";
  let touchNavRoot = null;
  const prefersTouchNav = Boolean(
    (window.matchMedia && (window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(hover: none)").matches)) ||
    ("ontouchstart" in window) ||
    (navigator.maxTouchPoints > 0)
  );

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

  function ensureTouchNav() {
    if (touchNavRoot && touchNavRoot.isConnected) {
      return touchNavRoot;
    }

    const nav = document.createElement("div");
    nav.id = "touch-nav";
    nav.hidden = true;
    nav.setAttribute("aria-label", "mobile controls");

    [
      { action: "up", label: "UP" },
      { action: "down", label: "DOWN" },
      { action: "select", label: "SELECT" },
      { action: "back", label: "BACK" }
    ].forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "touch-nav-btn";
      button.setAttribute("data-action", entry.action);
      button.textContent = entry.label;
      nav.appendChild(button);
    });

    nav.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const button = target.closest("button[data-action]");
      if (!button || !(button instanceof HTMLButtonElement) || button.disabled) {
        return;
      }
      event.preventDefault();
      const action = button.getAttribute("data-action");
      if (!action || state.phase !== "menu") {
        return;
      }
      if (action === "up") {
        moveGuestMenuCursor(-1);
        return;
      }
      if (action === "down") {
        moveGuestMenuCursor(1);
        return;
      }
      if (action === "select") {
        runGuestMenuSelection();
        return;
      }
      if (action === "back") {
        runMenuBackAction();
      }
    });

    terminal.appendChild(nav);
    touchNavRoot = nav;
    return touchNavRoot;
  }

  function setTouchNavVisible(visible) {
    if (!prefersTouchNav) {
      if (touchNavRoot) {
        touchNavRoot.hidden = true;
      }
      terminal.classList.remove("touch-nav-visible");
      return;
    }
    const nav = ensureTouchNav();
    const show = Boolean(visible);
    nav.hidden = !show;
    terminal.classList.toggle("touch-nav-visible", show);
    updateTouchNavState();
  }

  function updateTouchNavState() {
    if (!touchNavRoot) {
      return;
    }
    const inMenu = state.phase === "menu";
    const hasActions = (state.guestMenu.actions || []).length > 0;
    touchNavRoot.querySelectorAll("button[data-action]").forEach((button) => {
      const action = button.getAttribute("data-action");
      if (!inMenu) {
        button.disabled = true;
        return;
      }
      if (action === "back") {
        button.disabled = false;
        return;
      }
      button.disabled = !hasActions;
    });
  }

  function runMenuBackAction() {
    if (typeof state.guestMenu.onBack === "function") {
      state.guestMenu.onBack();
      return;
    }
    renderGuestHome();
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
      if ((path === "/secure/founder" || path.startsWith("/secure/founder/")) && !state.founderUnlocked) {
        err("founder workspace locked. authentication required.");
        setQuickActions("FOUNDER ACCESS", [
          { label: "open founder auth", onSelect: renderFounderVaultGate },
          { label: "back to staff menu", onSelect: renderStaffMainMenu },
          { label: "show secure paths", command: "paths" }
        ]);
        return false;
      }
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
        { label: "open files index", command: "open /secure/files/index.txt" },
        { label: "open staff profiles", command: "employees" },
        { label: "open internal messages", command: "chat list" },
        { label: "panel status", command: "panel status" },
        { label: "stock audit", command: "inventory" },
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
        { label: "contacts", command: "contacts" },
        { label: "staff login", command: "login" },
        { label: "terminal", command: "terminal" }
      ]);
      return;
    }

    setQuickActions("GUEST QUICK ACTIONS", [
      { label: "hours", command: "hours" },
      { label: "location", command: "location" },
      { label: "menu", command: "menu" },
      { label: "events", command: "events" },
      { label: "contacts", command: "contacts" },
      { label: "staff login", command: "login" },
      { label: "terminal", command: "terminal" }
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
    const mobileHeader = window.innerWidth <= 760;
    const compactHeader = !mobileHeader && window.innerWidth <= 900;
    const art = mobileHeader
      ? [
          "### ### ### ### # # ### # # ### ###",
          "#   # # #   #   # # # # # # #   #  ",
          "##  ### ##  ##  ### # # # # ##  ## ",
          "  # # # #   #   # # # # # # #   #  ",
          "### # # #   ### # # ###  #  ### ###"
        ]
      : compactHeader
        ? [
            " ___   _   ___ ___ _  _  ___ _   _ ___ ___ ",
            "| _ \\ /_\\ | __| __| || |/ _ \\ | | / __| __|",
            "|  _// _ \\| _|| _|| __ | (_) | |_| \\__ \\ _|",
            "|_| /_/ \\_\\___|___|_||_|\\___/ \\___/|___/___|"
          ]
        : [
            "  _____           ______ ______ _    _  ____  _    _  _____ ______ ",
            " / ____|   /\\    |  ____|  ____| |  | |/ __ \\| |  | |/ ____|  ____|",
            "| (___    /  \\   | |__  | |__  | |__| | |  | | |  | | (___ | |__   ",
            " \\___ \\  / /\\ \\  |  __| |  __| |  __  | |  | | |  | |\\___ \\|  __|  ",
            " ____) |/ ____ \\ | |    | |____| |  | | |__| | |__| |____) | |____ ",
            "|_____//_/    \\_\\|_|    |______|_|  |_|\\____/ \\____/|_____/|______|"
          ];
    const className = mobileHeader
      ? "ascii-title ascii-title-mobile"
      : compactHeader
        ? "ascii-title ascii-title-compact"
        : "ascii-title";
    art.forEach((row) => line(row, className));
    line("");
    line(
      "TERMINAL P-59",
      mobileHeader || compactHeader
        ? "title title-secondary title-secondary-compact muted"
        : "title title-secondary muted"
    );
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
      const rowClass = action.rowClass ? "menu-item " + action.rowClass : "menu-item";
      const row = line("  " + String(index + 1) + ") " + action.label, rowClass);
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.addEventListener("pointerdown", () => {
        if (state.phase !== "menu") {
          return;
        }
        state.guestMenu.index = index;
        updateGuestMenuCursor();
      });
      row.addEventListener("click", (event) => {
        event.preventDefault();
        if (state.phase !== "menu") {
          return;
        }
        state.guestMenu.index = index;
        updateGuestMenuCursor();
        runGuestMenuSelection();
      });
      return row;
    });
    updateGuestMenuCursor();
    setTouchNavVisible(true);
    updateTouchNavState();
    line("");
    line("UP/DOWN move  ENTER select  ESC back  TAP select", "muted");
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
    updateTouchNavState();
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
    screen.classList.remove("corrupt-game-screen");
    setTouchNavVisible(false);
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
    screen.classList.remove("corrupt-game-screen");
    drawSafehouseHeader();
    line("");
    line("LOCATION MAP", "title title-version muted");
    line("");

    const frame = document.createElement("div");
    frame.className = "map-frame";
    const map = document.createElement("img");
    map.className = "map-image";
    map.src = "assets/location-map.png?v=21260221-map2";
    map.alt = "Safehouse district map";
    frame.appendChild(map);

    const pin = document.createElement("div");
    pin.className = "map-pin";
    pin.textContent = "SAFEHOUSE";
    frame.appendChild(pin);

    screen.appendChild(frame);

    line("SAFEHOUSE marker shown on the map.", "muted");
    line("Directions:", "muted");
    line("1) Follow MAIN ARTERY east-west until the canal crossing.");
    line("2) Turn toward CURVED RING ROAD at the lower junction.");
    line("3) Safehouse entrance is near the canal-side service lane.");
    line("");
    const backFn = onBack || renderGuestHome;
    setGuestMenuActions([
      { label: "back", onSelect: backFn },
      { label: "contacts", onSelect: () => renderDocument("/bar/service/contacts.txt", backFn, "CONTACTS") }
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

  const CORRUPT_CHANNELS = ["CLOCK", "PHASE", "GAIN"];
  const CORRUPT_TARGET = [6, 3, 8];
const CORRUPT_STORY = [
    "JOURNAL RECOVERED // SAFEHOUSE ARCHIVE 77B",
    "After Surface Year 00, the relay basement was rebuilt by hand.",
    "Logs were split across ferrite blocks to survive radiation surges.",
    "Chief operator Mira Kade left an emergency access protocol.",
    "Operator id: " + RECOVERED_OPERATOR_ID,
    "Access key: " + RECOVERED_ACCESS_KEY,
    "Protocol note: use only for archive recovery."
  ];

  function createRandomChannels(width) {
    const list = [];
    for (let i = 0; i < width; i += 1) {
      list.push(Math.floor(Math.random() * 10));
    }
    return list;
  }

  function createCorruptMiniGameState() {
    return {
      values: createRandomChannels(CORRUPT_CHANNELS.length),
      selected: 0,
      scanHints: new Array(CORRUPT_CHANNELS.length).fill("?"),
      attemptsLeft: 12,
      maxAttempts: 12,
      frame: 0,
      completed: false,
      lastEvent: "decoder offline. run SCAN SIGNAL",
      menuIndex: 0
    };
  }

  function corruptGameLog(game, message) {
    game.lastEvent = message;
  }

  function computeCorruptDistance(values) {
    let sum = 0;
    for (let i = 0; i < CORRUPT_TARGET.length; i += 1) {
      sum += Math.abs(values[i] - CORRUPT_TARGET[i]);
    }
    return sum;
  }

  function computeCorruptClarity(values) {
    const distance = computeCorruptDistance(values);
    const ratio = 1 - distance / 27;
    return Math.max(0, Math.min(1, ratio));
  }

  function makeCorruptScanHints(values) {
    return values.map((value, index) => {
      const target = CORRUPT_TARGET[index];
      if (value === target) {
        return "LOCK";
      }
      return value < target ? "LOW" : "HIGH";
    });
  }

  function formatCorruptChannelLine(game) {
    return CORRUPT_CHANNELS.map((name, index) => {
      const token = name + ":" + game.values[index];
      return index === game.selected ? "[" + token + "]" : token;
    }).join("  ");
  }

  function formatCorruptHintLine(game) {
    return CORRUPT_CHANNELS.map((name, index) => name + ":" + game.scanHints[index]).join("  ");
  }

  function obfuscateStoryLine(text, clarity, salt) {
    if (clarity >= 0.995) {
      return text;
    }
    const noise = "#$%&*+/=?<>[]{};:!0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const revealThreshold = Math.floor(Math.pow(clarity, 1.18) * 100);
    let out = "";
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (char === " ") {
        out += " ";
        continue;
      }
      const seed = (i * 37 + salt * 19 + text.length * 11) % 100;
      if (seed <= revealThreshold) {
        out += char;
      } else {
        out += noise[(seed + i + salt) % noise.length];
      }
    }
    return out;
  }

  function renderCorruptedPublicFile(onBack, resetGame) {
    stopStream(false);
    stopUiTicker();
    clearGuestMenuState();
    state.phase = "menu";
    if (resetGame || !state.corruptGame) {
      state.corruptGame = createCorruptMiniGameState();
    }
    const game = state.corruptGame;
    const backFn = onBack || renderGuestHome;
    const compactHeader = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
    const clarity = computeCorruptClarity(game.values);
    const clarityPct = Math.round(clarity * 100);
    const distance = computeCorruptDistance(game.values);

    screen.innerHTML = "";
    screen.classList.add("corrupt-game-screen");
    if (compactHeader) {
      drawCompactHeader("CORRUPTED FILE // REC-77");
      line("");
    } else {
      drawSafehouseHeader();
      line("");
      line("CORRUPTED FILE // REC-77", "title title-version muted");
      line("");
    }

    line("record: /public/corrupted-file-77.bin", "muted corrupt-filename");
    line("status: CRC mismatch / payload unreadable", "warn");
    line("decoder clarity: " + clarityPct + "% | error distance: " + distance, clarityPct >= 85 ? "ok" : clarityPct >= 55 ? "muted" : "warn");
    line("controls: select CHANNEL, tune +/- , run SCAN SIGNAL", "small");
    line("channels: " + formatCorruptChannelLine(game), "muted");
    line("scan: " + formatCorruptHintLine(game), "small");
    line("attempts: " + game.attemptsLeft + "/" + game.maxAttempts, game.attemptsLeft <= 2 && !game.completed ? "warn" : "small");
    line("event: " + game.lastEvent, "small");
    if (game.completed) {
      line("archive fully recovered. credentials extracted.", "ok");
    } else if (game.attemptsLeft === 0) {
      line("buffer locked. run REBOOT STAGE.", "warn");
    }

    line("");
    for (let i = 0; i < CORRUPT_STORY.length; i += 1) {
      const row = game.completed ? CORRUPT_STORY[i] : obfuscateStoryLine(CORRUPT_STORY[i], clarity, game.frame + i * 7);
      line(row, clarity >= 0.8 ? "corrupt-row reveal" : "corrupt-row");
    }

    line("");
    const actions = [
      {
        label: "select channel",
        onSelect: () => {
          game.selected = (game.selected + 1) % CORRUPT_CHANNELS.length;
          game.menuIndex = 0;
          game.frame += 1;
          corruptGameLog(game, "channel focus -> " + CORRUPT_CHANNELS[game.selected]);
          renderCorruptedPublicFile(backFn, false);
        }
      },
      {
        label: "tune +1",
        onSelect: () => {
          if (!game.completed && game.attemptsLeft > 0) {
            game.values[game.selected] = Math.min(9, game.values[game.selected] + 1);
            game.menuIndex = 1;
            game.frame += 1;
            corruptGameLog(game, CORRUPT_CHANNELS[game.selected] + " raised");
          }
          renderCorruptedPublicFile(backFn, false);
        }
      },
      {
        label: "tune -1",
        onSelect: () => {
          if (!game.completed && game.attemptsLeft > 0) {
            game.values[game.selected] = Math.max(0, game.values[game.selected] - 1);
            game.menuIndex = 2;
            game.frame += 1;
            corruptGameLog(game, CORRUPT_CHANNELS[game.selected] + " lowered");
          }
          renderCorruptedPublicFile(backFn, false);
        }
      },
      {
        label: "scan signal",
        onSelect: () => {
          game.menuIndex = 3;
          if (game.completed) {
            corruptGameLog(game, "archive already stable");
            renderCorruptedPublicFile(backFn, false);
            return;
          }
          if (game.attemptsLeft <= 0) {
            corruptGameLog(game, "scan blocked. reboot stage");
            renderCorruptedPublicFile(backFn, false);
            return;
          }
          game.scanHints = makeCorruptScanHints(game.values);
          game.attemptsLeft = Math.max(0, game.attemptsLeft - 1);
          game.frame += 1;
          if (computeCorruptDistance(game.values) === 0) {
            game.completed = true;
            state.recoveredCreds.unlocked = true;
            state.recoveredCreds.operatorId = RECOVERED_OPERATOR_ID;
            state.recoveredCreds.accessKey = RECOVERED_ACCESS_KEY;
            corruptGameLog(game, "alignment lock acquired");
          } else {
            corruptGameLog(game, "scan " + game.scanHints.join(" | "));
          }
          renderCorruptedPublicFile(backFn, false);
        }
      },
      {
        label: "reboot stage",
        onSelect: () => {
          game.menuIndex = 4;
          if (!game.completed) {
            game.values = createRandomChannels(CORRUPT_CHANNELS.length);
            game.scanHints = new Array(CORRUPT_CHANNELS.length).fill("?");
            game.selected = 0;
            game.attemptsLeft = game.maxAttempts;
            game.frame += 1;
            corruptGameLog(game, "stage reboot complete");
          }
          renderCorruptedPublicFile(backFn, false);
        }
      },
      {
        label: "back",
        onSelect: () => {
          state.corruptGame = null;
          backFn();
        }
      }
    ];

    setGuestMenuActions(actions, () => {
      state.corruptGame = null;
      backFn();
    });
    state.guestMenu.index = Math.max(0, Math.min(actions.length - 1, game.menuIndex || 0));
    updateGuestMenuCursor();
    screen.scrollTop = 0;
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
        { label: "about us", command: "about-us", onSelect: () => renderDocument("/public/about-us.txt", self, "ABOUT US") },
        { label: "corrupted file [rec-77]", command: "corrupted", rowClass: "corrupt-option", onSelect: () => renderCorruptedPublicFile(self) },
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
    screen.classList.remove("corrupt-game-screen");
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
        "service gate : " + state.panel.airlock,
        "backup power : " + state.panel.generator,
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

  function renderLiveMonitorBoard(title, subtitle, buildRows, actions, onBack) {
    stopStream(false);
    stopUiTicker();
    clearGuestMenuState();
    state.phase = "menu";
    screen.innerHTML = "";
    screen.classList.remove("corrupt-game-screen");
    drawSafehouseHeader();
    line("");
    line(title, "title title-version muted");
    line("");
    if (subtitle) {
      line(subtitle, "muted");
      line("");
    }

    const renderRows = () => {
      const snapshot = buildRows();
      return snapshot.map((row) => line(row.text, row.className || ""));
    };

    let rows = renderRows();
    const refresh = () => {
      const snapshot = buildRows();
      const max = Math.max(snapshot.length, rows.length);
      for (let i = 0; i < max; i += 1) {
        if (!rows[i] && snapshot[i]) {
          rows[i] = line(snapshot[i].text, snapshot[i].className || "");
          continue;
        }
        if (rows[i] && !snapshot[i]) {
          rows[i].textContent = "";
          rows[i].className = "";
          continue;
        }
        if (rows[i] && snapshot[i]) {
          rows[i].textContent = snapshot[i].text;
          rows[i].className = snapshot[i].className || "";
        }
      }
    };
    state.uiTicker = setInterval(refresh, 1500);

    line("");
    const backFn = onBack || renderStaffMainMenu;
    const menuActions = (actions || []).concat([
      {
        label: "back",
        onSelect: () => {
          stopUiTicker();
          backFn();
        }
      }
    ]);
    setGuestMenuActions(menuActions, () => {
      stopUiTicker();
      backFn();
    });
  }

  function renderServiceFloorMonitor(onBack) {
    const next = onBack || renderStaffMonitorsMenu;
    renderLiveMonitorBoard(
      "SERVICE FLOOR TELEMETRY",
      "Live feed from host station and order queue.",
      () => {
        const queue = randomInt(2, 13);
        const wait = Math.max(4, Math.round(queue * 1.8 + randomInt(0, 6)));
        const load = Math.min(99, randomInt(52, 97));
        const mood = queue > 10 ? "rush control" : queue > 6 ? "steady pressure" : "calm";
        return [
          { text: "queue depth   : " + queue + " parties" },
          { text: "avg wait      : " + wait + " min" },
          { text: "bar load      : " + load + "%" },
          { text: "pending tabs  : " + randomInt(3, 18) },
          { text: "reserve stock : " + randomInt(68, 100) + "%" },
          { text: "floor mood    : " + mood, className: mood === "rush control" ? "warn" : "ok" }
        ];
      },
      [
        { label: "open operations panel", onSelect: () => { stopUiTicker(); renderOpsDashboardMenu(); } }
      ],
      next
    );
  }

  function renderCellarMonitor(onBack) {
    const next = onBack || renderStaffMonitorsMenu;
    renderLiveMonitorBoard(
      "CELLAR ENVIRONMENT",
      "Cold chain, gas mix, and stock-condition monitors.",
      () => {
        const liveTemp = Math.max(2, Math.min(9, state.panel.cellar + (Math.random() * 0.6 - 0.3)));
        const liveCo2 = Math.max(45, Math.min(90, state.panel.co2 + randomInt(-3, 4)));
        const lineState = liveTemp > 6.6 || liveCo2 > 80 ? "watch" : "stable";
        return [
          { text: "cellar temp   : " + liveTemp.toFixed(1) + " C" },
          { text: "humidity      : " + randomInt(58, 74) + "%" },
          { text: "co2 level     : " + liveCo2 + "%" },
          { text: "ice output    : " + randomInt(72, 100) + "%" },
          { text: "citrus stock  : " + randomInt(54, 93) + "%" },
          { text: "status line   : " + lineState, className: lineState === "watch" ? "warn" : "ok" }
        ];
      },
      [
        { label: "open operations panel", onSelect: () => { stopUiTicker(); renderOpsDashboardMenu(); } }
      ],
      next
    );
  }

  function renderUtilitiesMonitor(onBack) {
    const next = onBack || renderStaffMonitorsMenu;
    renderLiveMonitorBoard(
      "UTILITIES AND SAFETY BUS",
      "Power, ventilation, and recycler subsystems.",
      () => {
        const recycler = sample(["nominal", "filter rinse", "surge flush"]);
        const alarm = state.panel.generator === "maintenance" ? "maintenance hold" : "none";
        return [
          { text: "generator     : " + state.panel.generator },
          { text: "power bus A   : " + randomInt(97, 100) + "%" },
          { text: "power bus B   : " + randomInt(94, 100) + "%" },
          { text: "air handling  : " + sample(["stable", "high circulation", "boost cycle"]) },
          { text: "recycler loop : " + recycler },
          { text: "alarm state   : " + alarm, className: alarm === "none" ? "ok" : "warn" }
        ];
      },
      [
        { label: "open operations panel", onSelect: () => { stopUiTicker(); renderOpsDashboardMenu(); } }
      ],
      next
    );
  }

  function renderStaffMonitorsMenu() {
    renderMenuScreen(
      "MONITOR STACK",
      ["Real-time sensor feeds and floor telemetry."],
      [
        { label: "service floor telemetry", onSelect: () => renderServiceFloorMonitor(renderStaffMonitorsMenu) },
        { label: "cellar environment", onSelect: () => renderCellarMonitor(renderStaffMonitorsMenu) },
        { label: "utilities and safety bus", onSelect: () => renderUtilitiesMonitor(renderStaffMonitorsMenu) },
        { label: "radiation monitor", onSelect: () => renderRadiationMonitor(renderStaffMonitorsMenu) },
        { label: "back", onSelect: renderStaffMainMenu }
      ],
      renderStaffMainMenu
    );
  }

  function renderStaffFilesMenu() {
    const self = () => renderStaffFilesMenu();
    renderMenuScreen(
      "FILES",
      ["Indexed records, reports, and operating documents."],
      [
        { label: "daily operations", onSelect: () => renderDirectoryMenu("/secure/files/daily-operations", "FILES / DAILY OPERATIONS", self) },
        { label: "staff records", onSelect: () => renderDirectoryMenu("/secure/files/staff-records", "FILES / STAFF RECORDS", self) },
        { label: "internal messages", onSelect: () => renderDirectoryMenu("/secure/files/internal-messages", "FILES / INTERNAL MESSAGES", self) },
        { label: "continuity chain", onSelect: () => renderDirectoryMenu("/secure/files/continuity-chain", "FILES / CONTINUITY CHAIN", self) },
        { label: "incident reports", onSelect: () => renderDirectoryMenu("/secure/files/incident-reports", "FILES / INCIDENT REPORTS", self) },
        { label: "procurement and finance", onSelect: () => renderDirectoryMenu("/secure/files/procurement", "FILES / PROCUREMENT", self) },
        { label: "maintenance", onSelect: () => renderDirectoryMenu("/secure/files/maintenance", "FILES / MAINTENANCE", self) },
        { label: "recipe development", onSelect: () => renderDirectoryMenu("/secure/files/recipe-development", "FILES / RECIPE DEVELOPMENT", self) },
        { label: "compliance", onSelect: () => renderDirectoryMenu("/secure/files/compliance", "FILES / COMPLIANCE", self) },
        { label: "context records", onSelect: () => renderDirectoryMenu("/secure/files/context-records", "FILES / CONTEXT RECORDS", self) },
        { label: "back", onSelect: renderStaffMainMenu }
      ],
      renderStaffMainMenu
    );
  }

  function ensureFounderVaultDraft() {
    if (!state.founderVaultDraft) {
      state.founderVaultDraft = { passphrase: "", notice: "" };
    }
    return state.founderVaultDraft;
  }

  function submitFounderVaultUnlock(passphraseValue) {
    const draft = ensureFounderVaultDraft();
    if (typeof passphraseValue === "string") {
      draft.passphrase = passphraseValue;
    }
    const key = String(draft.passphrase || "").trim();
    if (key === FOUNDER_WORKSPACE_PASSWORD) {
      state.founderUnlocked = true;
      draft.notice = "founder workspace unlocked";
      renderDirectoryMenu("/secure/founder", "FOUNDER WORKSPACE", renderStaffMainMenu);
      return;
    }
    state.founderAttempts += 1;
    draft.notice = "access denied (" + state.founderAttempts + ")";
    renderFounderVaultGate();
  }

  function submitFounderUnlockFromScreen() {
    const passField = screen.querySelector('[data-role="founder-pass"]');
    submitFounderVaultUnlock(passField ? passField.value : "");
  }

  function renderFounderVaultGate() {
    if (state.founderUnlocked) {
      renderDirectoryMenu("/secure/founder", "FOUNDER WORKSPACE", renderStaffMainMenu);
      return;
    }
    stopStream(false);
    stopUiTicker();
    clearGuestMenuState();
    state.phase = "founder_gate";
    screen.innerHTML = "";
    screen.classList.remove("corrupt-game-screen");
    setTouchNavVisible(false);

    const draft = ensureFounderVaultDraft();

    drawSafehouseHeader();
    line("");
    line("FOUNDER WORKSPACE / AUTH", "title title-version muted");
    line("");
    line("Encrypted personal partition.");
    line("");

    const form = document.createElement("div");
    form.className = "staff-login-form";

    const passField = createStaffLoginField("passphrase", "password", draft.passphrase, "");
    passField.inputEl.setAttribute("data-role", "founder-pass");
    passField.inputEl.addEventListener("input", () => {
      draft.passphrase = passField.inputEl.value;
      draft.notice = "";
    });
    form.appendChild(passField.row);

    const actions = document.createElement("div");
    actions.className = "staff-actions";

    const unlockBtn = document.createElement("button");
    unlockBtn.type = "button";
    unlockBtn.className = "staff-action-btn";
    unlockBtn.textContent = "unlock founder workspace";
    unlockBtn.addEventListener("click", () => submitFounderVaultUnlock(passField.inputEl.value));

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "staff-action-btn";
    clearBtn.textContent = "clear";
    clearBtn.addEventListener("click", () => {
      passField.inputEl.value = "";
      draft.passphrase = "";
      draft.notice = "";
      passField.inputEl.focus();
    });

    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "staff-action-btn";
    backBtn.textContent = "back";
    backBtn.addEventListener("click", renderStaffMainMenu);

    actions.appendChild(unlockBtn);
    actions.appendChild(clearBtn);
    actions.appendChild(backBtn);
    form.appendChild(actions);

    const status = document.createElement("div");
    status.className = "staff-status " + (draft.notice.startsWith("founder workspace unlocked") ? "ok" : draft.notice ? "warn" : "small");
    status.textContent = draft.notice || "status: locked";
    form.appendChild(status);

    screen.appendChild(form);
    line("");
    line("ENTER unlock  ESC back", "muted");
    passField.inputEl.focus();
  }

  function renderStaffMainMenu() {
    const founderLabel = state.founderUnlocked ? "founder workspace (unlocked)" : "founder workspace (locked)";
    renderMenuScreen(
      "STAFF CONSOLE",
      [
        "authenticated session active",
        "role: operations staff"
      ],
      [
        { label: "live monitors", onSelect: () => renderStaffMonitorsMenu() },
        { label: "operational panels", onSelect: () => renderOpsDashboardMenu() },
        { label: "files", onSelect: () => renderStaffFilesMenu() },
        { label: founderLabel, onSelect: renderFounderVaultGate },
        {
          label: "logout staff session",
          onSelect: () => {
            state.staff = false;
            state.username = "guest";
            state.founderUnlocked = false;
            state.founderAttempts = 0;
            state.founderVaultDraft = { passphrase: "", notice: "" };
            renderGuestHome();
          }
        },
        { label: "back to guest", onSelect: renderGuestHome }
      ],
      renderGuestHome
    );
  }

  function renderOpsDashboardMenu() {
    const lightModes = ["warm", "service", "dim", "blackout"];
    const musicModes = ["low", "mid", "high", "silent", "vinyl"];
    const rotate = (list, value) => {
      const idx = list.indexOf(value);
      return list[(idx + 1) % list.length];
    };

    const runOpeningService = () => {
      state.panel.lights = "warm";
      state.panel.music = "low";
      state.panel.airlock = "sealed";
      state.panel.generator = "online";
    };

    const runRushService = () => {
      state.panel.lights = "service";
      state.panel.music = "mid";
      state.panel.airlock = "cycle";
      state.panel.generator = "online";
    };

    const runClosingService = () => {
      state.panel.lights = "dim";
      state.panel.music = "silent";
      state.panel.airlock = "sealed";
      state.panel.generator = "standby";
    };

    const adjustCellar = (delta) => {
      const next = Math.max(2, Math.min(9, state.panel.cellar + delta));
      state.panel.cellar = Math.round(next * 10) / 10;
    };

    const adjustCo2 = (delta) => {
      state.panel.co2 = Math.max(45, Math.min(90, state.panel.co2 + delta));
    };

    const serviceProfile = state.panel.lights === "service" && (state.panel.music === "mid" || state.panel.music === "high")
      ? "rush"
      : state.panel.lights === "dim" || state.panel.music === "silent"
      ? "closing"
      : "standard";

    renderMenuScreen(
      "OPERATIONS DASHBOARD",
      [
        "service profile : " + serviceProfile,
        "lights mode : " + state.panel.lights,
        "music level : " + state.panel.music,
        "service gate: " + state.panel.airlock,
        "backup power: " + state.panel.generator,
        "cellar temp : " + state.panel.cellar.toFixed(1) + " C",
        "co2         : " + state.panel.co2 + "%"
      ],
      [
        {
          label: "run opening service",
          onSelect: () => {
            runOpeningService();
            renderOpsDashboardMenu();
          }
        },
        {
          label: "run rush-hour service",
          onSelect: () => {
            runRushService();
            renderOpsDashboardMenu();
          }
        },
        {
          label: "run closing service",
          onSelect: () => {
            runClosingService();
            renderOpsDashboardMenu();
          }
        },
        {
          label: "cycle lights",
          onSelect: () => {
            state.panel.lights = rotate(lightModes, state.panel.lights);
            renderOpsDashboardMenu();
          }
        },
        {
          label: "cycle music",
          onSelect: () => {
            state.panel.music = rotate(musicModes, state.panel.music);
            renderOpsDashboardMenu();
          }
        },
        {
          label: "cellar cooler -0.5 C",
          onSelect: () => {
            adjustCellar(-0.5);
            renderOpsDashboardMenu();
          }
        },
        {
          label: "cellar warmer +0.5 C",
          onSelect: () => {
            adjustCellar(0.5);
            renderOpsDashboardMenu();
          }
        },
        {
          label: "vent co2 -5%",
          onSelect: () => {
            adjustCo2(-5);
            renderOpsDashboardMenu();
          }
        },
        {
          label: "open live monitors",
          onSelect: () => renderStaffMonitorsMenu()
        },
        {
          label: "open files index",
          onSelect: () => renderStaffFilesMenu()
        },
        {
          label: "open full control panel",
          onSelect: () => renderControlPanelMenu(renderOpsDashboardMenu)
        },
        { label: "back", onSelect: renderStaffMainMenu }
      ],
      renderStaffMainMenu
    );
  }

  function ensureStaffLoginDraft() {
    if (!state.staffLoginDraft) {
      state.staffLoginDraft = { operatorId: "", accessKey: "", notice: "" };
    }
    return state.staffLoginDraft;
  }

  function submitStaffLogin(operatorValue, keyValue) {
    const draft = ensureStaffLoginDraft();
    if (typeof operatorValue === "string") {
      draft.operatorId = operatorValue;
    }
    if (typeof keyValue === "string") {
      draft.accessKey = keyValue;
    }
    const operator = String(draft.operatorId || "").trim();
    const key = String(draft.accessKey || "").trim();
    const valid = operator === RECOVERED_OPERATOR_ID && key === RECOVERED_ACCESS_KEY;
    if (valid) {
      state.staff = true;
      state.username = "staff";
      draft.notice = "access granted";
      renderStaffMainMenu();
      return;
    }
    state.tries += 1;
    draft.notice = "access denied (" + state.tries + ")";
    renderStaffAccessMenu();
  }

  function submitStaffLoginFromScreen() {
    const operatorField = screen.querySelector('[data-role="staff-id"]');
    const keyField = screen.querySelector('[data-role="staff-key"]');
    const operatorValue = operatorField ? operatorField.value : "";
    const keyValue = keyField ? keyField.value : "";
    submitStaffLogin(operatorValue, keyValue);
  }

  function createStaffLoginField(labelText, inputType, value, placeholderText) {
    const row = document.createElement("div");
    row.className = "staff-field";

    const label = document.createElement("label");
    label.className = "staff-label";
    label.textContent = labelText;

    const inputEl = document.createElement("textarea");
    inputEl.className = "staff-login-input";
    inputEl.rows = 1;
    inputEl.wrap = "off";
    if (inputType === "password") {
      inputEl.classList.add("staff-login-masked");
    }
    inputEl.value = value || "";
    inputEl.placeholder = placeholderText || "";
    inputEl.autocomplete = "off";
    inputEl.autocorrect = "off";
    inputEl.autocapitalize = "none";
    inputEl.spellcheck = false;
    inputEl.inputMode = "text";
    inputEl.setAttribute("aria-autocomplete", "none");
    inputEl.setAttribute("autofill", "off");
    inputEl.setAttribute("data-form-type", "other");
    inputEl.setAttribute("data-bwignore", "true");
    inputEl.setAttribute("data-lpignore", "true");
    inputEl.setAttribute("data-1p-ignore", "true");
    inputEl.setAttribute("readonly", "readonly");
    requestAnimationFrame(() => inputEl.removeAttribute("readonly"));
    inputEl.addEventListener("input", () => {
      if (inputEl.value.indexOf("\n") !== -1) {
        inputEl.value = inputEl.value.replace(/\n/g, "");
      }
    });

    row.appendChild(label);
    row.appendChild(inputEl);

    return { row, inputEl };
  }

  function renderStaffAccessMenu() {
    if (state.staff) {
      renderStaffMainMenu();
      return;
    }
    stopStream(false);
    stopUiTicker();
    clearGuestMenuState();
    state.phase = "login_form";
    screen.innerHTML = "";
    screen.classList.remove("corrupt-game-screen");
    setTouchNavVisible(false);

    const draft = ensureStaffLoginDraft();
    const unlocked = !!state.recoveredCreds.unlocked;

    drawSafehouseHeader();
    line("");
    line("STAFF LOGIN", "title title-version muted");
    line("");
    line("Restricted archive access.");
    line("");

    const form = document.createElement("div");
    form.className = "staff-login-form";

    const operatorField = createStaffLoginField("id", "text", draft.operatorId, "");
    operatorField.inputEl.setAttribute("data-role", "staff-id");
    const keyField = createStaffLoginField("password", "password", draft.accessKey, "");
    keyField.inputEl.setAttribute("data-role", "staff-key");

    operatorField.inputEl.addEventListener("input", () => {
      draft.operatorId = operatorField.inputEl.value;
      draft.notice = "";
    });
    keyField.inputEl.addEventListener("input", () => {
      draft.accessKey = keyField.inputEl.value;
      draft.notice = "";
    });

    form.appendChild(operatorField.row);
    if (unlocked) {
      const userSuggestWrap = document.createElement("div");
      userSuggestWrap.className = "staff-suggest";
      const userFill = document.createElement("button");
      userFill.type = "button";
      userFill.className = "staff-fill-btn";
      userFill.textContent = "autofill id: " + state.recoveredCreds.operatorId;
      userFill.addEventListener("click", () => {
        operatorField.inputEl.value = state.recoveredCreds.operatorId;
        draft.operatorId = state.recoveredCreds.operatorId;
        draft.notice = "";
        operatorField.inputEl.focus();
      });
      userSuggestWrap.appendChild(userFill);
      form.appendChild(userSuggestWrap);
    }

    form.appendChild(keyField.row);
    if (unlocked) {
      const keySuggestWrap = document.createElement("div");
      keySuggestWrap.className = "staff-suggest";
      const keyFill = document.createElement("button");
      keyFill.type = "button";
      keyFill.className = "staff-fill-btn";
      keyFill.textContent = "autofill password: " + state.recoveredCreds.accessKey;
      keyFill.addEventListener("click", () => {
        keyField.inputEl.value = state.recoveredCreds.accessKey;
        draft.accessKey = state.recoveredCreds.accessKey;
        draft.notice = "";
        keyField.inputEl.focus();
      });
      keySuggestWrap.appendChild(keyFill);
      form.appendChild(keySuggestWrap);
    }

    const actions = document.createElement("div");
    actions.className = "staff-actions";

    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.className = "staff-action-btn";
    submitBtn.textContent = "submit login";
    submitBtn.addEventListener("click", () => {
      submitStaffLogin(operatorField.inputEl.value, keyField.inputEl.value);
    });

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "staff-action-btn";
    clearBtn.textContent = "clear";
    clearBtn.addEventListener("click", () => {
      operatorField.inputEl.value = "";
      keyField.inputEl.value = "";
      draft.operatorId = "";
      draft.accessKey = "";
      draft.notice = "";
      operatorField.inputEl.focus();
    });

    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "staff-action-btn";
    backBtn.textContent = "back";
    backBtn.addEventListener("click", () => renderGuestHome());

    actions.appendChild(submitBtn);
    actions.appendChild(clearBtn);
    actions.appendChild(backBtn);
    form.appendChild(actions);

    const status = document.createElement("div");
    status.className = "staff-status " + (draft.notice.startsWith("access granted") ? "ok" : draft.notice ? "warn" : "small");
    status.textContent = draft.notice || "status: waiting for id/password";
    form.appendChild(status);

    screen.appendChild(form);
    line("");
    line("TAB move fields  ENTER submit  ESC back", "muted");

    if (!draft.operatorId) {
      operatorField.inputEl.focus();
    } else if (!draft.accessKey) {
      keyField.inputEl.focus();
    } else {
      submitBtn.focus();
    }
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
            (fs["/bar/menu/house-menu.txt"] + "\n\n" + fs["/bar/menu/seasonal-board-2126-02.txt"]).split("\n"),
            [{ label: "back", onSelect: renderGuestHome }],
            renderGuestHome
          )
        },
        { label: "events", command: "events", onSelect: () => renderDocument("/bar/service/events-calendar-2126.txt", renderGuestHome, "EVENTS") },
        { label: "contacts", command: "contacts", onSelect: () => renderDocument("/bar/service/contacts.txt", renderGuestHome, "CONTACTS") },
        { label: "public files", command: "public", onSelect: () => renderPublicFilesMenu(renderGuestHome) },
        { label: "staff login", command: "login", onSelect: renderStaffAccessMenu },
        { label: "terminal", command: "terminal", onSelect: () => {} }
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
    line("  monitors    -> live sensor buses");
    line("  files       -> indexed records");
    line("  employees   -> staff profiles");
    line("  chat list   -> internal message logs");
    line("  panel list  -> operational controls");
    line("  tree /secure  for full structure", "muted");
    setQuickActions("OPS CONSOLE", [
      { label: "panel list", command: "panel list" },
      { label: "panel run opening", command: "panel run opening" },
      { label: "panel run lockdown", command: "panel run lockdown" },
      { label: "open files index", command: "open /secure/files/index.txt" },
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
    line("Records:");
    line("  /secure/files/daily-operations/");
    line("  /secure/files/internal-messages/");
    line("  /secure/files/continuity-chain/");
    line("  /secure/files/incident-reports/");
    line("  /secure/files/recipe-development/");
    line("");
    line("Staff:");
    line("  /secure/files/staff-records/roster-2126-q1.csv");
    line("  /secure/files/staff-records/profiles/");
    line("");
    line("Operations and systems:");
    line("  /secure/operations/");
    line("  /secure/monitors/");
    line("  /secure/founder/ (locked)");
    setQuickActions("DOSSIER SHORTCUTS", [
      { label: "open files index", command: "open /secure/files/index.txt" },
      { label: "open roster", command: "open /secure/files/staff-records/roster-2126-q1.csv" },
      { label: "open continuity log", command: "open /secure/files/continuity-chain/continuity-log-2126-q1.md" },
      { label: "open incidents", command: "open /secure/files/incident-reports/incident-2126-02-20-service-floor.log" },
      { label: "open panel manual", command: "open /secure/operations/panel-manual.md" },
      { label: "open monitor map", command: "open /secure/monitors/bus-map.txt" }
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
        const loreFiles = (fs["/secure/files/context-records"] || []).concat(["route"]);
        return filterByPrefix(loreFiles, current);
      }
      if (command === "employees" && state.staff) {
        return filterByPrefix(fs["/secure/files/staff-records/profiles"] || [], current);
      }
    }

    if (command === "monitor" && lastIndex === 2) {
      return filterByPrefix(["follow"], current);
    }

    if (command === "term" && second === "night" && lastIndex === 2) {
      return filterByPrefix(["on", "off"], current);
    }

    if (command === "chat" && second === "open" && lastIndex === 2 && state.staff) {
      return filterByPrefix(fs["/secure/files/internal-messages"] || [], current);
    }

    if (command === "chat" && second === "follow" && lastIndex === 2 && state.staff) {
      return filterByPrefix(["ops-nightshift", "floor-channel", "incident-chat"], current);
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
      line("  lore [file]         context records archive");
      line("  employees [name]    operational staff profiles");
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
    line("  8) staff login");
    if (state.staff) {
      line("");
      line("Staff quick route:");
      line("  ops");
      line("  dossier");
      line("  open /secure/files/index.txt");
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
    line("  /bar/service/events-calendar-2126.txt");
    line("  /monitors/snapshot.txt");
    line("  /public/about-safehouse.txt");

    if (state.staff || target === "secure") {
      line("");
      line("Restricted archive:");
      line("  /secure/monitors/");
      line("  /secure/operations/");
      line("  /secure/files/");
      line("  /secure/files/staff-records/profiles/");
      line("  /secure/founder/ (password protected)");
    } else {
      line("", "muted");
      line("login as staff to unlock /secure", "muted");
    }

    if (state.staff) {
      setQuickActions("FILE JUMP", [
        { label: "open frontdesk welcome", command: "open /bar/frontdesk/welcome.txt" },
        { label: "open secure overview", command: "open /secure/system-overview.txt" },
        { label: "open files index", command: "open /secure/files/index.txt" },
        { label: "open employees", command: "employees" },
        { label: "open chat list", command: "chat list" }
      ]);
    } else {
      setQuickActions("FILE JUMP", [
        { label: "open frontdesk welcome", command: "open /bar/frontdesk/welcome.txt" },
        { label: "open menu", command: "open /bar/menu/house-menu.txt" },
        { label: "open event calendar", command: "open /bar/service/events-calendar-2126.txt" },
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
    line("service gate (airlock)    sealed | open | cycle");
    line("backup power (generator)  online | standby | maintenance");
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
    line("service gate : " + state.panel.airlock);
    line("backup power : " + state.panel.generator);
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
        readFile("/bar/menu/seasonal-board-2126-02.txt");
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
        readFile("/bar/service/events-calendar-2126.txt");
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
              "[" + nowStamp() + "] floor        calm service",
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
          listDirectory("/secure/files/staff-records/profiles");
          line("open a profile: employees <name>", "muted");
          const profiles = (fs["/secure/files/staff-records/profiles"] || []).slice(0, 6);
          setQuickActions("EMPLOYEE SHORTCUTS", profiles.map((profile) => ({
            label: "employees " + profile.replace(/\.md$/, ""),
            command: "employees " + profile
          })));
          break;
        }
        const path = resolveInDirectory("/secure/files/staff-records/profiles", args[0]);
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
          banner("CONTEXT RECORDS");
          listDirectory("/secure/files/context-records");
          line("open a file: lore <name>", "muted");
          setQuickActions("RECORD SHORTCUTS", [
            { label: "lore route", command: "lore route" },
            { label: "site timeline", command: "lore bunker-to-surface-timeline.md" },
            { label: "emergence journal", command: "lore emergence-journal-day11.txt" },
            { label: "guest calm protocol", command: "lore guest-calm-protocol-sy04.md" },
            { label: "canal weather readings", command: "lore canal-weather-table-sy24-sy26.csv" },
            { label: "hospitality doctrine", command: "lore hospitality-systems-doctrine.md" }
          ]);
          break;
        }
        if (args[0].toLowerCase() === "route") {
          banner("RECORD ROUTE");
          line("lore bunker-to-surface-timeline.md");
          line("lore emergence-journal-day11.txt");
          line("lore hospitality-systems-doctrine.md");
          line("lore canal-weather-table-sy24-sy26.csv");
          line("lore booth-c-audio-log-sy19.txt");
          break;
        }
        const path = resolveInDirectory("/secure/files/context-records", args[0]);
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
          listDirectory("/secure/files/internal-messages");
          line("chat open <file>", "muted");
          line("chat follow <room>", "muted");
          setQuickActions("CHAT SHORTCUTS", [
            { label: "open ops channel log", command: "chat open ops-channel-2126-02-22.log" },
            { label: "open floor channel log", command: "chat open floor-channel-2126-02-22.log" },
            { label: "follow ops nightshift", command: "chat follow ops-nightshift" },
            { label: "follow floor channel", command: "chat follow floor-channel" },
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
          const path = resolveInDirectory("/secure/files/internal-messages", args[1]);
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
              "Lead: queue stable at six",
              "Bar: station two on citrus prep",
              "Host: two walk-ins seated",
              "Ops: floor noise below threshold"
            ],
            "floor-channel": [
              "Host: table 5 asks for no-photo booth",
              "Floor: calm service running",
              "Barback: glass pickup in progress",
              "Ops: service lane clear"
            ],
            "incident-chat": [
              "Ops: minor spill at station B",
              "Floor: hazard mat deployed",
              "Ops: no guest impact",
              "Lead: incident logged and cleared"
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
        readFile("/secure/files/procurement/stock-audit-2126-02-21.txt");
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
        readFile("/secure/files/recipe-development/house-formulas-private.md");
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
          state.founderUnlocked = false;
          state.founderAttempts = 0;
          state.founderVaultDraft = { passphrase: "", notice: "" };
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
    setTouchNavVisible(false);
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
    setTouchNavVisible(false);

    const frames = [
      { text: "Safehouse Instrumentation Works", wait: 190 },
      { text: "PROM Monitor P-59 Rev 4.12 (Era marks rebuilt SY26)", wait: 160 },
      { text: "", wait: 80 },
      { text: "Machine: P-59 Relay/Tube Hybrid Console", wait: 90 },
      { text: "CPU0: AURORA-9/66 vacuum-core scalar processor", wait: 85 },
      { text: "Real memory = 8192K ferrite-core", wait: 80 },
      { text: "Extended memory = 65536K magneto-drum cache", wait: 85 },
      { text: "", wait: 80 },
      { text: "Boot device: /dev/sd0a", wait: 90 },
      { text: "Loading /boot/unix59 ...", wait: 110 },
      { text: "", wait: 70 },
      { text: "Safehouse UNIX/59 8.4: Sat Feb 21 2126 (SY26)", wait: 95 },
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

    if (state.phase === "login_form") {
      if (event.key === "Escape") {
        event.preventDefault();
        renderGuestHome();
        return;
      }
      if (event.key === "Enter" && document.activeElement && document.activeElement.classList && document.activeElement.classList.contains("staff-login-input")) {
        event.preventDefault();
        submitStaffLoginFromScreen();
        return;
      }
      return;
    }

    if (state.phase === "founder_gate") {
      if (event.key === "Escape") {
        event.preventDefault();
        renderStaffMainMenu();
        return;
      }
      if (event.key === "Enter" && document.activeElement && document.activeElement.classList && document.activeElement.classList.contains("staff-login-input")) {
        event.preventDefault();
        submitFounderUnlockFromScreen();
        return;
      }
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
        runMenuBackAction();
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
  if (prefersTouchNav) {
    ensureTouchNav();
  }
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
      "Service stabilization protocol: active",
    "/bar/frontdesk/house-rules.txt":
      "HOUSE RULES\n" +
      "1) No open flame near paper menus\n" +
      "2) Offer low-proof and no-proof options when needed\n" +
      "3) Keep voice level below booth glass line\n" +
      "4) Respect no-photo zones",
    "/bar/frontdesk/payment-policy.txt":
      "PAYMENT POLICY\n" +
      "Card and cash accepted\n" +
      "Unrecognized commemorative coins not accepted\n" +
      "Staff gratuity split nightly",

    "/bar/menu": [
      "house-menu.txt",
      "seasonal-board-2126-02.txt",
      "non-alcoholic.txt",
      "allergens.txt",
      "pairings.txt",
      "coffee-program.txt"
    ],
    "/bar/menu/house-menu.txt":
      "HOUSE MENU\n" +
      "thyme-lord           sour      butterfly-pea gin/lemon/orgeat/thyme bitters/egg white\n" +
      "one-piece            tropical  dark jamaican rum/lime/coconut/pineapple bitters\n" +
      "masaya-chai          spirit    chilled assam vodka/demerara/masala bitters\n" +
      "montorsats           built     aquavit/honey/chamomile\n" +
      "the-boring-cocktail  highball  vodka/soda/ice (yes, really) - Y5000\n" +
      "remedy-shot          shot      secret parting shot served at close",
    "/bar/menu/seasonal-board-2126-02.txt":
      "ARCHIVE CLASSICS\n" +
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
      "shelter-line      chilled citrus cordial, lemon oils\n" +
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
      "masaya-chai -> spiced dark chocolate shard (cold serve)\n" +
      "old-fashioned -> smoked pecans, hard cheese\n" +
      "espresso-martini -> cocoa nib biscotti",
    "/bar/menu/coffee-program.txt":
      "COFFEE PROGRAM\n" +
      "single-origin cold brew daily\n" +
      "espresso cut-off: 00:15",

    "/bar/service": [
      "hours.txt",
      "contacts.txt",
      "events-calendar-2126.txt",
      "lost-and-found-public.txt",
      "service-standards-public.txt"
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
    "/bar/service/events-calendar-2126.txt":
      "EVENT CALENDAR 2126\n" +
      "2126-02-24  Quiet Vinyl Night\n" +
      "2126-02-27  Staff Recipe Lab (invite)\n" +
      "2126-03-05  Archive Martini Workshop",
    "/bar/service/lost-and-found-public.txt":
      "LOST + FOUND\n" +
      "- brass lighter (initials M.K.)\n" +
      "- black notebook (grid, no name)\n" +
      "- silver tie clip",
    "/bar/service/service-standards-public.txt":
      "SERVICE STANDARDS\n" +
      "Keep communication clear and calm.\n" +
      "Prioritize comfort, pacing, and consistency.",

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

    "/public": ["motd.txt", "about-safehouse.txt", "about-us.txt", "faq.txt", "story-card.txt", "map-public.txt", "corrupted-file-77.bin"],
    "/public/motd.txt": "MOTD: Keep lights warm. Keep voices low. Keep service steady.",
    "/public/about-safehouse.txt":
      "ABOUT SAFEHOUSE\n" +
      "A cocktail bar built by bunker-born staff after Surface Year 00.\n" +
      "We run on precision service and calm atmosphere.\n" +
      "The terminal you see is part menu board, part operations theater.",
    "/public/about-us.txt":
      "ABOUT US\n" +
      "Safehouse is a narrative cocktail bar built around precision service,\n" +
      "quiet atmosphere, and an atompunk identity.\n" +
      "Most of us were born below ground; stories about the pre-war world conflict.\n" +
      "Every drink tells a story, but guest comfort always comes first.",
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
    "/public/story-card.txt":
      "HOUSE STORY (PUBLIC)\n" +
      "We built this room to slow the world down for one drink at a time.",
    "/public/corrupted-file-77.bin":
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
      "[2126-02-21 18:02] door/open      ok\n" +
      "[2126-02-21 18:14] host/queue     updated\n" +
      "[2126-02-21 19:03] service/reset  proactive\n" +
      "[2126-02-21 19:38] guest/request  no-photo zone reminder",
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
      "system-overview.txt",
      "readme-restricted.txt",
      "monitors",
      "operations",
      "files",
      "founder"
    ],
    "/secure/system-overview.txt":
      "SECURE SYSTEM OVERVIEW\n" +
      "This partition is the internal operations environment for Safehouse.\n" +
      "Use /secure/monitors for live sensor indexes.\n" +
      "Use /secure/operations for runbooks and control procedures.\n" +
      "Use /secure/files for reports, staff records, and archived context.\n" +
      "Dating standard: Surface Year (SY) starts at 2100; bunker dates are approximate.\n" +
      "Use /secure/founder only with founder key authorization.",
    "/secure/readme-restricted.txt":
      "RESTRICTED ARCHIVE\n" +
      "Internal records for operations, staffing, incidents, compliance, and founder materials.",

    "/secure/monitors": [
      "bus-map.txt",
      "service-floor.feed",
      "cellar-environment.feed",
      "utilities.feed",
      "radiation-private.log"
    ],
    "/secure/monitors/bus-map.txt":
      "MONITOR BUS MAP\n" +
      "bus-01: service floor telemetry\n" +
      "bus-02: cellar environment loop\n" +
      "bus-03: utilities and safety bus\n" +
      "bus-04: radiation channel (private)\n" +
      "refresh window: 1.5s",
    "/secure/monitors/service-floor.feed":
      "SERVICE FLOOR FEED\n" +
      "queue depth, bar load, table turn rate, reserve stock",
    "/secure/monitors/cellar-environment.feed":
      "CELLAR ENVIRONMENT FEED\n" +
      "temperature, humidity, co2, ice production",
    "/secure/monitors/utilities.feed":
      "UTILITIES FEED\n" +
      "generator state, bus voltage, recycler state, ventilation",
    "/secure/monitors/radiation-private.log":
      "[2126-02-23 19:00] 0.17 uSv/h stable\n" +
      "[2126-02-23 20:00] 0.19 uSv/h stable\n" +
      "[2126-02-23 21:00] 0.22 uSv/h watch",

    "/secure/operations": [
      "panel-manual.md",
      "service-presets.md",
      "emergency-playbook.md",
      "night-shutdown-checklist.txt",
      "service-stability-policy.md"
    ],
    "/secure/operations/panel-manual.md":
      "PANEL MANUAL\n" +
      "panel status\n" +
      "panel set lights warm|service|dim|blackout\n" +
      "panel set music low|mid|high|silent|vinyl\n" +
      "panel set cellar 2.0..9.0\n" +
      "panel set co2 45..90\n" +
      "panel run opening|lockdown|quiet-reset",
    "/secure/operations/service-presets.md":
      "SERVICE PRESETS\n" +
      "opening: warm lights, low music, sealed access\n" +
      "rush: service lights, mid music, cycle lane\n" +
      "closing: dim lights, silent bus, standby generator",
    "/secure/operations/emergency-playbook.md":
      "EMERGENCY PLAYBOOK\n" +
      "1) stabilize floor tone\n" +
      "2) pause high-proof service for stressed tables\n" +
      "3) move guests away from active station\n" +
      "4) call incident code and log time",
    "/secure/operations/night-shutdown-checklist.txt":
      "NIGHT SHUTDOWN CHECKLIST\n" +
      "confirm tabs closed\n" +
      "panel run quiet-reset\n" +
      "flush line B\n" +
      "seal storage lockers\n" +
      "export incident deltas",
    "/secure/operations/service-stability-policy.md":
      "SERVICE STABILITY POLICY\n" +
      "When floor tension rises, simplify menu execution and slow service tempo.\n" +
      "Prioritize predictable service over novelty.\n" +
      "If risk signs persist, hand table to floor lead and log action.",

    "/secure/files": [
      "index.txt",
      "daily-operations",
      "staff-records",
      "internal-messages",
      "continuity-chain",
      "incident-reports",
      "procurement",
      "maintenance",
      "recipe-development",
      "compliance",
      "context-records"
    ],
    "/secure/files/index.txt":
      "FILES INDEX\n" +
      "OPS  daily-operations   shift plans and service execution\n" +
      "OPS  staff-records      roster, training, staff profiles\n" +
      "OPS  internal-messages  operational chats and handovers\n" +
      "OPS  continuity-chain   cross-file event continuity and post-shift fallout\n" +
      "OPS  incident-reports   documented disruptions and corrective action\n" +
      "OPS  procurement        stock audits, vendor ledgers, purchase records\n" +
      "OPS  maintenance        plant checks, calibration, service notes\n" +
      "OPS  recipe-development private formulas and trials\n" +
      "OPS  compliance         legal, audit, and policy records\n" +
      "STORY context-records   site history and long-term observations",

    "/secure/files/daily-operations": [
      "shift-schedule-2126-w08.csv",
      "opening-checklist.txt",
      "closing-checklist.txt",
      "floor-layout-zones.txt",
      "station-load-targets.txt",
      "service-handoff-2126-02-23.txt",
      "table-c3-standing-reservation.txt",
      "quiet-corner-service-protocol.txt",
      "debrief-2126-02-22.txt",
      "debrief-2126-02-23-masaya.txt"
    ],
    "/secure/files/daily-operations/shift-schedule-2126-w08.csv":
      "date,lead,barback,floor,cellar\n" +
      "2126-02-23,theo,mk,ju,kenji\n" +
      "2126-02-24,erik,andrea,sara,nicola\n" +
      "2126-02-25,luporosso,mk,ju,kenji",
    "/secure/files/daily-operations/opening-checklist.txt":
      "OPENING CHECKLIST\n" +
      "lights warm\n" +
      "music low\n" +
      "ice stock >= 80%\n" +
      "service station primed\n" +
      "card terminal sync",
    "/secure/files/daily-operations/closing-checklist.txt":
      "CLOSING CHECKLIST\n" +
      "cash reconcile complete\n" +
      "line sanitation complete\n" +
      "incident notes exported\n" +
      "all lockers sealed",
    "/secure/files/daily-operations/floor-layout-zones.txt":
      "FLOOR LAYOUT ZONES\n" +
      "zone A: host and quick turnover seats\n" +
      "zone B: low-noise booths\n" +
      "zone C: no-photo service corridor\n" +
      "zone D: reserve overflow",
    "/secure/files/daily-operations/station-load-targets.txt":
      "STATION LOAD TARGETS\n" +
      "station 1: max 18 tickets per 20m\n" +
      "station 2: max 16 tickets per 20m\n" +
      "floor handoff threshold: queue > 9",
    "/secure/files/daily-operations/service-handoff-2126-02-23.txt":
      "SERVICE HANDOFF 2126-02-23\n" +
      "Queue normalized by 21:10 after moving one barback to host lane.\n" +
      "Booth C requested extended quiet mode and low-light service.\n" +
      "Reserve citrus moved to cold rack 2 after station-2 overspend.\n" +
      "No floor escalations, but corridor watch stayed active until close.\n" +
      "Recommendation for next shift: keep one reserve coupe stack hidden behind station B.",
    "/secure/files/daily-operations/table-c3-standing-reservation.txt":
      "TABLE C3 STANDING RESERVATION\n" +
      "status: permanent hold (owner authorization)\n" +
      "location: corner C, low-light angle, line-of-sight to both exits\n" +
      "table state before open:\n" +
      "- one heavy rocks glass, chilled\n" +
      "- one linen napkin folded flat\n" +
      "- no menu on table\n" +
      "- no direct greeting unless requested\n" +
      "notes:\n" +
      "This hold exists even on sold-out nights.\n" +
      "If unused by 23:40, table may be released only by floor lead.",
    "/secure/files/daily-operations/quiet-corner-service-protocol.txt":
      "QUIET CORNER SERVICE PROTOCOL\n" +
      "Purpose: maintain calm service for high-tension guests without turning the room theatrical.\n" +
      "1) First contact stays short: two menu options, exit path visible.\n" +
      "2) No hovering near the table. Check every 9 minutes unless called.\n" +
      "3) No camera flash, no loud garnish prep nearby.\n" +
      "4) If guest scans exits repeatedly, reduce questions, increase predictability.\n" +
      "5) If tone hardens, call floor lead through internal channel only.",
    "/secure/files/daily-operations/debrief-2126-02-22.txt":
      "POST-SHIFT DEBRIEF / 2126-02-22\n" +
      "What happened:\n" +
      "- queue pressure peaked between 20:40 and 21:05\n" +
      "- station 2 ran citrus low earlier than forecast\n" +
      "- one tense table settled after quiet-booth relocation\n" +
      "\n" +
      "What changed for next shift:\n" +
      "- reserve citrus moved closer to host lane\n" +
      "- low-noise script pinned for new floor staff\n" +
      "- C3 path kept clear before first rush",
    "/secure/files/daily-operations/debrief-2126-02-23-masaya.txt":
      "POST-SHIFT DEBRIEF / 2126-02-23 / C3 EVENT\n" +
      "Summary:\n" +
      "- known high-pressure guest seated at C3 without floor announcement\n" +
      "- Masaya Chai served cold in 84 seconds\n" +
      "- room noise dropped 12 dB within 4 minutes\n" +
      "\n" +
      "Follow-up:\n" +
      "- keep one senior-only C3 runner on rotation\n" +
      "- pre-chill C3 glassware before open\n" +
      "- sync notes with continuity-chain before next service",

    "/secure/files/continuity-chain": [
      "continuity-log-2126-q1.md",
      "event-consequence-matrix.md",
      "debrief-link-map.txt"
    ],
    "/secure/files/continuity-chain/continuity-log-2126-q1.md":
      "CONTINUITY LOG / 2126 Q1\n" +
      "2126-01-14  co2 spike resolved -> filter cycle shortened from 14d to 10d\n" +
      "2126-01-19  shortened cycle raised maintenance load -> added backup tech on Fridays\n" +
      "2126-02-20  booth C resonance -> glass placement map revised in zone C\n" +
      "2126-02-22  queue surge -> host lane staffing rule updated\n" +
      "2126-02-23  C3 pressure event -> cold-service pre-stage added to opening checklist\n" +
      "\n" +
      "rule: no incident closes until at least one downstream procedure is updated.",
    "/secure/files/continuity-chain/event-consequence-matrix.md":
      "EVENT -> CONSEQUENCE MATRIX\n" +
      "if queue > 12 for 10m\n" +
      "  then reduce active menu branches and assign one roaming floor lead\n" +
      "\n" +
      "if C3 occupied by watch-profile guest\n" +
      "  then lock senior-only service path and mute nearby station banter\n" +
      "\n" +
      "if supply dip > 8m\n" +
      "  then switch to reserve script and push procurement alert within shift\n" +
      "\n" +
      "if mechanical alarm repeats in same week\n" +
      "  then raise maintenance priority and log owner-level follow-up",
    "/secure/files/continuity-chain/debrief-link-map.txt":
      "DEBRIEF LINK MAP\n" +
      "debrief-2126-02-22.txt -> continuity-log-2126-q1.md (queue branch)\n" +
      "debrief-2126-02-23-masaya.txt -> continuity-log-2126-q1.md (C3 branch)\n" +
      "incident-2126-02-20-service-floor.log -> event-consequence-matrix.md\n" +
      "rule: every debrief must point to one procedural change.",

    "/secure/files/staff-records": [
      "roster-2126-q1.csv",
      "training-progress-2126-q1.csv",
      "performance-notes-2126-02.md",
      "payroll-redacted-2126-02.csv",
      "profiles"
    ],
    "/secure/files/staff-records/roster-2126-q1.csv":
      "name,role,primary_shift,backup_role\n" +
      "erik,senior bartender,night,service lead\n" +
      "theo,operations lead,night,floor control\n" +
      "andrea,bar ops,night,prep lead\n" +
      "ju,floor logistics,night,lost+found\n" +
      "kenji,cellar tech,night,maintenance",
    "/secure/files/staff-records/training-progress-2126-q1.csv":
      "name,module,status,last_check\n" +
      "erik,high-volume spec,complete,2126-02-14\n" +
      "theo,de-escalation,complete,2126-02-10\n" +
      "ju,incident logging,complete,2126-02-21\n" +
      "kenji,gas-monitor service,in-progress,2126-02-22",
    "/secure/files/staff-records/performance-notes-2126-02.md":
      "PERFORMANCE NOTES FEB 2126\n" +
      "Theo: floor stabilization strong under peak load.\n" +
      "Erik: recipe consistency remains top tier.\n" +
      "Ju: zero-miss recovery on misplaced guest property.\n" +
      "Kenji: preventive maintenance quality above target.",
    "/secure/files/staff-records/payroll-redacted-2126-02.csv":
      "name,period,hours,compensation\n" +
      "erik,2126-02,164,***\n" +
      "theo,2126-02,158,***\n" +
      "ju,2126-02,149,***",
    "/secure/files/staff-records/profiles": [
      "erik.md",
      "theo.md",
      "andrea.md",
      "ju.md",
      "kenji.md",
      "sara.md"
    ],
    "/secure/files/staff-records/profiles/erik.md":
      "ERIK\n" +
      "Role: senior bartender\n" +
      "Specialty: high-volume classics and spec retention\n" +
      "Notes: trusted on all VIP service nights.",
    "/secure/files/staff-records/profiles/theo.md":
      "THEO\n" +
      "Role: operations lead\n" +
      "Specialty: queue control and floor tone management",
    "/secure/files/staff-records/profiles/andrea.md":
      "ANDREA\n" +
      "Role: bar operations\n" +
      "Specialty: garnish standards and station hygiene",
    "/secure/files/staff-records/profiles/ju.md":
      "JU\n" +
      "Role: floor logistics\n" +
      "Specialty: rapid handoff and guest issue recovery",
    "/secure/files/staff-records/profiles/kenji.md":
      "KENJI\n" +
      "Role: cellar systems technician\n" +
      "Specialty: cooling loop diagnostics and relay service",
    "/secure/files/staff-records/profiles/sara.md":
      "SARA\n" +
      "Role: guest memory steward\n" +
      "Specialty: low-noise mediation and no-photo enforcement",

    "/secure/files/internal-messages": [
      "ops-channel-2126-02-22.log",
      "floor-channel-2126-02-22.log",
      "maintenance-channel-2126-02-22.log",
      "owner-broadcast-2126-02-20.txt",
      "handover-night-2126-02-22.txt",
      "visitor-watch-masaya.log",
      "service-thread-c3.log"
    ],
    "/secure/files/internal-messages/ops-channel-2126-02-22.log":
      "[19:04] Lead: queue steady at 6\n" +
      "[19:18] Bar: station 2 requested citrus refill\n" +
      "[20:02] Ops: move one floor hand to host\n" +
      "[20:26] Lead: load normalized",
    "/secure/files/internal-messages/floor-channel-2126-02-22.log":
      "[19:31] Floor: table 7 requests quiet booth\n" +
      "[19:33] Host: moved to zone B\n" +
      "[20:14] Floor: calm service pass on table 4\n" +
      "[20:15] Lead: acknowledged",
    "/secure/files/internal-messages/maintenance-channel-2126-02-22.log":
      "[17:05] Kenji: condenser flush complete\n" +
      "[17:42] Kenji: co2 sensor recalibrated\n" +
      "[18:03] Ops: startup checks all green",
    "/secure/files/internal-messages/owner-broadcast-2126-02-20.txt":
      "OWNER BROADCAST\n" +
      "No heroics, no drama. Consistency first.\n" +
      "If conditions change, lower noise, slow service tempo, log facts.",
    "/secure/files/internal-messages/handover-night-2126-02-22.txt":
      "NIGHT HANDOVER\n" +
      "- if founder partition requests key, use chiller token from Plant-B weekly checklist\n" +
      "- keep this note in operations-only thread\n" +
      "- do not broadcast key material on floor channels",
    "/secure/files/internal-messages/visitor-watch-masaya.log":
      "[20:41] floor: possible visual on Masaya near canal-side stairs\n" +
      "[20:42] ops: keep C3 held, no announcement to guest floor\n" +
      "[20:44] host: dark coat, no companion, declined menu at entry\n" +
      "[20:46] floor: seated C3, requested Masaya Chai cold spec only\n" +
      "[20:51] bar: preparing Masaya Chai, half sweetness, no garnish, cold block\n" +
      "[21:03] ops: room noise dropped after seating, maintain low tone\n" +
      "[21:29] floor: tab closed cash, no receipt requested\n" +
      "[21:30] host: exited via side corridor, no incident",
    "/secure/files/internal-messages/service-thread-c3.log":
      "[thread] C3 protocol reminder\n" +
      "- do not assign trainees to C3 first contact\n" +
      "- no station banter within earshot\n" +
      "- if guest asks for Masaya Chai, prioritize cold stir service under 90 sec\n" +
      "- keep path to door clear of stock crates",

    "/secure/files/incident-reports": [
      "incident-2126-02-20-service-floor.log",
      "incident-2126-01-14-co2-spike.log",
      "incident-2125-12-31-crowd-surge.log",
      "incident-2125-08-09-utility-line.log",
      "incident-template.txt"
    ],
    "/secure/files/incident-reports/incident-2126-02-20-service-floor.log":
      "INCIDENT 2126-02-20 / SERVICE FLOOR\n" +
      "time: 20:51\n" +
      "event: localized glass resonance on booth row C\n" +
      "action: music lowered, seating adjusted, service tempo reduced\n" +
      "result: resolved without evacuation",
    "/secure/files/incident-reports/incident-2126-01-14-co2-spike.log":
      "INCIDENT 2126-01-14 / CO2 SPIKE\n" +
      "peak: 84%\n" +
      "cause: intake filter saturation\n" +
      "action: switched to vent boost, replaced filter",
    "/secure/files/incident-reports/incident-2125-12-31-crowd-surge.log":
      "INCIDENT 2125-12-31 / CROWD SURGE\n" +
      "peak queue: 17 parties\n" +
      "action: activated rush profile, reduced menu complexity for 18m\n" +
      "result: stabilized by 23:58",
    "/secure/files/incident-reports/incident-2125-08-09-utility-line.log":
      "INCIDENT 2125-08-09 / UTILITY LINE DROP\n" +
      "supply pressure dipped for 11m\n" +
      "backup reserve engaged\n" +
      "guest service unaffected",
    "/secure/files/incident-reports/incident-template.txt":
      "INCIDENT TEMPLATE\n" +
      "date:\n" +
      "time:\n" +
      "event:\n" +
      "action:\n" +
      "resolution:\n" +
      "follow-up owner:",

    "/secure/files/procurement": [
      "stock-audit-2126-02-21.txt",
      "vendor-ledger-2126-q1.csv",
      "spirits-order-2126-02-20.csv",
      "citrus-contract-2126.pdf.txt",
      "budget-watchlist-2126-02.txt"
    ],
    "/secure/files/procurement/stock-audit-2126-02-21.txt":
      "STOCK AUDIT 2126-02-21\n" +
      "gin reserve        11 bottles\n" +
      "rye reserve         9 bottles\n" +
      "dry vermouth        6 bottles\n" +
      "orgeat             1.8 L\n" +
      "coconut cream      2.4 L\n" +
      "block ice          42 kg\n" +
      "reserve supply     84%",
    "/secure/files/procurement/vendor-ledger-2126-q1.csv":
      "vendor,category,avg_lead_days,reliability\n" +
      "north-citrus,citrus,2,0.96\n" +
      "kamo-ice,ice,1,0.98\n" +
      "osaka-spirits,spirits,4,0.93",
    "/secure/files/procurement/spirits-order-2126-02-20.csv":
      "sku,qty,status\n" +
      "gin-house-001,24,arrived\n" +
      "rye-batch-014,18,in-transit\n" +
      "amaro-cyn-07,12,arrived",
    "/secure/files/procurement/citrus-contract-2126.pdf.txt":
      "CITRUS CONTRACT 2126 (TEXT EXPORT)\n" +
      "delivery window: Tue-Sat 14:00-16:00\n" +
      "quality clause: reject if brix below threshold",
    "/secure/files/procurement/budget-watchlist-2126-02.txt":
      "BUDGET WATCHLIST\n" +
      "espresso beans +12%\n" +
      "glass replacement +9%\n" +
      "co2 cartridges +4%",

    "/secure/files/maintenance": [
      "weekly-checklist-2126-w08.txt",
      "chiller-plant-b-weekly-checklist-2126-w08.txt",
      "geiger-calibration-2126-02-19.log",
      "power-relay-service-2126-02-18.log",
      "filter-replacement-2126-02.txt"
    ],
    "/secure/files/maintenance/weekly-checklist-2126-w08.txt":
      "WEEKLY CHECKLIST W08\n" +
      "ice plant inspection\n" +
      "recycler filter status\n" +
      "co2 line purge\n" +
      "lighting relay tolerance\n" +
      "ups battery test",
    "/secure/files/maintenance/chiller-plant-b-weekly-checklist-2126-w08.txt":
      "CHILLER PLANT-B / WEEKLY CHECKLIST W08\n" +
      "compressor pressure ........ within range\n" +
      "condenser coil ............. cleaned\n" +
      "pump vibration ............. nominal\n" +
      "archive export token ....... frostline_719\n" +
      "note: token used by owner during cold-room archive exports",
    "/secure/files/maintenance/geiger-calibration-2126-02-19.log":
      "[17:01] baseline set\n" +
      "[17:04] tube response pass\n" +
      "[17:07] alarm threshold pass",
    "/secure/files/maintenance/power-relay-service-2126-02-18.log":
      "[16:03] bus A contacts cleaned\n" +
      "[16:19] bus B tolerance pass\n" +
      "[16:27] cabinet resealed",
    "/secure/files/maintenance/filter-replacement-2126-02.txt":
      "FILTER REPLACEMENT 2126-02\n" +
      "air intake filter replaced 2126-02-14\n" +
      "recycler carbon stage replaced 2126-02-08",

    "/secure/files/recipe-development": [
      "house-formulas-private.md",
      "r-and-d-log-2126-02.md",
      "batch-yield-sheet-2126-02.csv",
      "no-service-experiments.txt"
    ],
    "/secure/files/recipe-development/house-formulas-private.md":
      "HOUSE FORMULAS PRIVATE\n" +
      "THYME LORD v4\n" +
      "- gin 50 / lemon 25 / orgeat 15 / egg white 25\n" +
      "- thyme bitters #4: 1.5 dash max\n" +
      "- shake long, strain fine\n\n" +
      "NIGHT SIGNAL v2\n" +
      "- rye 40 / amaro 25 / dry vermouth 20 / saline 1 drop\n" +
      "- stir 30 sec on dense cube\n" +
      "- target dilution 23%",
    "/secure/files/recipe-development/r-and-d-log-2126-02.md":
      "R&D LOG FEB 2126\n" +
      "Trial 12: clarified citrus held 9h stable.\n" +
      "Trial 14: smoke rinse too dominant for booth service.\n" +
      "Trial 17: low-proof menu variant approved for events.",
    "/secure/files/recipe-development/batch-yield-sheet-2126-02.csv":
      "batch,output_ml,waste_ml,notes\n" +
      "thyme-bitters-04,920,40,strong finish\n" +
      "ginger-honey-02,1800,60,stable",
    "/secure/files/recipe-development/no-service-experiments.txt":
      "NO-SERVICE EXPERIMENTS\n" +
      "Never trial new bitters on live floor.\n" +
      "Pilot in post-close only.",

    "/secure/files/compliance": [
      "shelter-code-check-2126-02.pdf.txt",
      "health-audit-2126-01.txt",
      "age-verification-protocol.md",
      "cash-reconciliation-protocol.md"
    ],
    "/secure/files/compliance/shelter-code-check-2126-02.pdf.txt":
      "SHELTER CODE CHECK 2126-02 (TEXT EXPORT)\n" +
      "status: compliant\n" +
      "pending action: signage contrast upgrade",
    "/secure/files/compliance/health-audit-2126-01.txt":
      "HEALTH AUDIT 2126-01\n" +
      "cold chain: pass\n" +
      "surface sanitation: pass\n" +
      "allergen labeling: pass",
    "/secure/files/compliance/age-verification-protocol.md":
      "AGE VERIFICATION PROTOCOL\n" +
      "ID check mandatory for all uncertain cases.\n" +
      "No exceptions on peak nights.",
    "/secure/files/compliance/cash-reconciliation-protocol.md":
      "CASH RECONCILIATION PROTOCOL\n" +
      "two-person closeout\n" +
      "variance threshold: <= 0.5%",

    "/secure/files/context-records": [
      "bunker-to-surface-timeline.md",
      "bunker-ledger-fragments.txt",
      "emergence-journal-day0.txt",
      "emergence-journal-day11.txt",
      "guest-calm-protocol-sy04.md",
      "booth-c-audio-log-sy19.txt",
      "canal-weather-table-sy24-sy26.csv",
      "hospitality-systems-doctrine.md",
      "staircase-coin-audit.md",
      "clock-drift-incident-sy17.md",
      "route-board-adjustments-2125.log",
      "radio-room-fragments-sy08.log",
      "vault-room-air-index.md"
    ],
    "/secure/files/context-records/bunker-to-surface-timeline.md":
      "BUNKER -> SURFACE TIMELINE (RECONSTRUCTED)\n" +
      "BKR-??   first surviving shelter ledgers begin (clock origin unknown)\n" +
      "BKR-73   relay room assembled from mixed scavenged boards\n" +
      "BKR-91   old district names stop matching map walls\n" +
      "2100     first full exit from bunker network (Surface Year 00)\n" +
      "2103     SAFEHOUSE opens as controlled service room\n" +
      "2126     current operating year\n" +
      "\n" +
      "note: pre-2100 dating is approximate; bunker clocks drifted by district.",
    "/secure/files/context-records/bunker-ledger-fragments.txt":
      "BUNKER LEDGER FRAGMENTS\n" +
      "fragment A:\n" +
      "\"child cohort born below gate 3, no surface records attached\"\n" +
      "\n" +
      "fragment C:\n" +
      "\"lesson schedule changed again; old-world history removed due contradictions\"\n" +
      "\n" +
      "fragment H:\n" +
      "\"multiple elders disagree on war start date. no consensus archived\"\n" +
      "\n" +
      "summary:\n" +
      "we inherited procedures, not certainty.",
    "/secure/files/context-records/emergence-journal-day0.txt":
      "EMERGENCE JOURNAL / DAY 0 (SY00)\n" +
      "Gate opened with half the crew expecting ash and silence.\n" +
      "Instead we found broken streets, stale air, and too much sky.\n" +
      "Nobody argued about who was right about the old world.\n" +
      "Everyone argued about where to put lights first.\n" +
      "Safehouse started as one lit room and a short menu.",
    "/secure/files/context-records/emergence-journal-day11.txt":
      "EMERGENCE JOURNAL / DAY 11 (SY00)\n" +
      "People came in carrying bunker habits: watch exits, sit with backs to walls,\n" +
      "ask twice if the door locks from inside.\n" +
      "We kept service simple and repeated specs exactly.\n" +
      "Routine beat fear more reliably than speeches.",
    "/secure/files/context-records/guest-calm-protocol-sy04.md":
      "GUEST CALM PROTOCOL / SY04\n" +
      "Lower volume first.\n" +
      "Offer a short pause and two clear options on first contact when a table is tense.\n" +
      "Keep instructions short and human.\n" +
      "\n" +
      "Operational notes:\n" +
      "- Avoid technical jargon during stress spikes.\n" +
      "- Never corner a guest physically while trying to help.\n" +
      "- Give two clear options, not ten anxious options.\n" +
      "- Do not confuse speed with care.",
    "/secure/files/context-records/booth-c-audio-log-sy19.txt":
      "BOOTH C AUDIO LOG / SY19\n" +
      "[00:11] harmonic hum at 77hz\n" +
      "[00:13] glass resonance without fracture\n" +
      "[00:15] resolved after music bus reduction\n" +
      "[00:16] guest conversation resumed normal tone\n" +
      "[00:18] follow-up showed no structural issue\n" +
      "Comment: pattern repeats under high crowd pressure + brass-heavy playlist.",
    "/secure/files/context-records/canal-weather-table-sy24-sy26.csv":
      "date,outdoor_temp_c,canal_temp_c,humidity_pct,notes\n" +
      "2124-11-02,8.1,10.3,74,low fog over canal\n" +
      "2125-08-17,29.4,27.8,68,hot wind from east corridor\n" +
      "2126-01-09,1.0,3.4,81,cold front with rain",
    "/secure/files/context-records/hospitality-systems-doctrine.md":
      "HOSPITALITY SYSTEMS DOCTRINE\n" +
      "A bar is part social room, part emergency infrastructure.\n" +
      "Precision exists to protect calm.\n" +
      "\n" +
      "Doctrine clauses:\n" +
      "1) The first duty is safety, the second is dignity.\n" +
      "2) Procedure should disappear behind good service.\n" +
      "3) A drink can be memorable, but a stable room is non-negotiable.\n" +
      "4) Every night must be reproducible under stress.",
    "/secure/files/context-records/staircase-coin-audit.md":
      "STAIRCASE COIN AUDIT\n" +
      "Old practice used weighted coins near vent grilles to damp rattle.\n" +
      "2126 audit found loose placement causing additional vibration noise.\n" +
      "Action: removed coins, installed fixed damping strip.",
    "/secure/files/context-records/clock-drift-incident-sy17.md":
      "CLOCK DRIFT INCIDENT / SY17\n" +
      "Wall clock, register clock, and wristwatch drifted apart by nine minutes.\n" +
      "Nobody trusted time, so service switched to paper marks per round.\n" +
      "Orders stayed accurate. Last table left without noticing.\n" +
      "Conclusion from shift lead: when systems disagree, human pacing wins.",
    "/secure/files/context-records/route-board-adjustments-2125.log":
      "ROUTE BOARD ADJUSTMENTS 2125\n" +
      "2125-06-18 20:33 board shifted during queue reroute\n" +
      "2125-08-10 19:59 marker card replaced after spill\n" +
      "2125-11-02 21:14 board misaligned after cleaning\n" +
      "Policy: reset before open and log all visible changes.",
    "/secure/files/context-records/radio-room-fragments-sy08.log":
      "[radio/SY08-03-04] repeat phrase: hold north vent\n" +
      "[radio/SY08-06-11] static burst during closing ledger entry\n" +
      "[radio/SY08-09-29] unidentified voice requested booth C by number\n" +
      "[radio/SY08-09-29] no known transmitter matched signal profile",
    "/secure/files/context-records/vault-room-air-index.md":
      "VAULT ROOM AIR INDEX\n" +
      "baseline: old paper + citrus peel\n" +
      "ozone note: check relay cleaning status\n" +
      "metal note: inspect filter saturation\n" +
      "action: run vent cycle 3 before entry after long sessions.",

    "/secure/founder": [
      "README-PRIVATE.txt",
      "founder-private-index.txt",
      "journal-sy02-11-03.txt",
      "journal-sy03-04-17.txt",
      "journal-sy08-09-09.txt",
      "cocktail-notebook-core-specs.md",
      "service-ethics-memo.txt",
      "supplier-blackbook.txt",
      "letters-never-sent.txt",
      "aftershock-observations.txt",
      "cellar-drafts-raw.md",
      "night-letter-to-erik.txt",
      "last-transit-shutdown-sy06.txt",
      "founder-arc-sy00-sy26.md",
      "staff-notes",
      "masaya-dossier.txt",
      "masaya-visit-ledger-sy04-sy10.log",
      "table-c3-standing-order.txt",
      "masaya-chai-development-notes.md",
      "audio-transcript-masaya-night-05.txt"
    ],
    "/secure/founder/README-PRIVATE.txt":
      "FOUNDER PRIVATE WORKSPACE\n" +
      "Personal records, non-public service doctrine, and unpublished formulas.\n" +
      "Staff listed here were born in bunkers; pre-war history remains disputed.\n" +
      "Do not mirror to guest systems.\n" +
      "Do not summarize to floor staff unless asked by owner.\n" +
      "Some records are emotional, not operational. Treat accordingly.",
    "/secure/founder/founder-private-index.txt":
      "FOUNDER PRIVATE INDEX\n" +
      "01 STORY journals               early surface-era notes\n" +
      "02 OPS/STORY cocktail notebook  private formulas and operating philosophy\n" +
      "03 STORY letters-never-sent     unsent correspondence\n" +
      "04 OPS/STORY masaya dossier set recurring high-pressure guest profile\n" +
      "05 OPS/STORY cellar drafts      unfinished formulas and rejects with shift context\n" +
      "06 STORY night-letter-to-erik   private handover never sent\n" +
      "07 STORY last-transit-shutdown  transit collapse night log\n" +
      "08 STORY staff-notes            personal staff histories and character reads\n" +
      "09 STORY founder-arc-sy00-sy26 leadership phases and doctrine shifts\n" +
      "access note: read in order if you want full context",
    "/secure/founder/journal-sy02-11-03.txt":
      "SY02-11-03 (2102-11-03)\n" +
      "Power failed at 18:12. District radios died ten minutes later.\n" +
      "At 18:40, people started arriving not for drinks, but for light.\n" +
      "I kept one lamp on the back shelf and closed half the room to save fuel.\n" +
      "No one asked for music. No one asked for ice.\n" +
      "They asked if this place would still be open in an hour.\n" +
      "I said yes before I knew if it was true.\n" +
      "By midnight, the bar was quieter than any church I ever entered.\n" +
      "That night I understood the job: not to impress, to stabilize.",
    "/secure/founder/journal-sy03-04-17.txt":
      "SY03-04-17 (2103-04-17)\n" +
      "Supply truck never arrived.\n" +
      "By open we had one tea crate, one sugar sack, and less neutral spirit than planned.\n" +
      "Two men offered double cash to buy the remaining bottles before service.\n" +
      "I refused and switched to measured pours for everyone.\n" +
      "They called me a coward for rationing the room.\n" +
      "Later that night one of them came back sober and apologized.\n" +
      "I wrote the first ration protocol before close.\n" +
      "I did it because I never wanted to make that choice by instinct again.",
    "/secure/founder/journal-sy08-09-09.txt":
      "SY08-09-09 (2108-09-09)\n" +
      "Signed the first permanent roster today.\n" +
      "No more 'temporary staff', no more guessing at midnight.\n" +
      "I assigned one person to queue control, one to corridor watch, one to C3.\n" +
      "That table is now permanent hold.\n" +
      "Not because of superstition, because hesitation causes chaos.\n" +
      "If a known pressure guest arrives, the room must already know what to do.\n" +
      "Discipline is cheaper than panic.",
    "/secure/founder/cocktail-notebook-core-specs.md":
      "FOUNDER COCKTAIL NOTEBOOK / CORE SPECS\n" +
      "Rule 1: if a guest is visibly unstable, start with low-proof or no-proof matched to profile.\n" +
      "Rule 2: stabilize service tempo before changing room atmosphere.\n" +
      "Rule 3: every signature drink must have a no-proof counterpart.\n" +
      "Rule 4: repeat guests should receive reproducible specs every visit.\n" +
      "\n" +
      "TECHNICAL BASELINE\n" +
      "- target service temp for shaken citrus drinks: 1.5C to 2.2C\n" +
      "- target dilution for stirred dark builds: 22% to 25%\n" +
      "- acceptable garnish prep noise: below conversation band\n" +
      "\n" +
      "SHELTER LINE 03\n" +
      "- rye 35 / fortified wine 25 / bitter cordial 20\n" +
      "- saline 1 drop / orange oil\n" +
      "- stir slow, do not rush service\n" +
      "\n" +
      "MASAYA CHAI (PRIVATE BASE)\n" +
      "- assam-infused vodka 45\n" +
      "- dark jaggery reduction 12\n" +
      "- spiced black tea concentrate 25\n" +
      "- acid-adjusted citrus 4\n" +
      "- serve stirred over one cold clear block, no garnish, no questions",
    "/secure/founder/service-ethics-memo.txt":
      "SERVICE ETHICS MEMO / FOUNDER TO FLOOR LEADS\n" +
      "I watched a bartender turn a frightened table into a performance.\n" +
      "The drinks were perfect. The guests still left shaken.\n" +
      "\n" +
      "Read this carefully:\n" +
      "- fear is not ambience\n" +
      "- confusion is not mystique\n" +
      "- silence is not always calm\n" +
      "\n" +
      "When the floor is unstable, shorten sentences, shorten menus, shorten distance to exits.\n" +
      "We are not here to look clever. We are here to keep people steady.",
    "/secure/founder/supplier-blackbook.txt":
      "SUPPLIER BLACKBOOK / PRACTICAL LESSONS\n" +
      "Winter SY06, citrus line collapsed for nine days.\n" +
      "We survived because we had backups and because we did not lie to each other.\n" +
      "\n" +
      "Fallback priority:\n" +
      "1) reserve essentials for core menu only\n" +
      "2) keep ice continuity and glass rotation stable\n" +
      "3) reduce menu branches before quality drops\n" +
      "4) announce substitutions internally, never improvise silently\n" +
      "\n" +
      "A guest can forgive scarcity.\n" +
      "A guest does not forgive inconsistency.",
    "/secure/founder/letters-never-sent.txt":
      "LETTERS NEVER SENT\n" +
      "Letter 1 / unsent\n" +
      "I built this place as if you would come back for one last drink.\n" +
      "You did not. The room stayed anyway.\n" +
      "Half the room still argues about what the world was before the bunkers.\n" +
      "No one argues about what this room must be now.\n" +
      "The first years I kept one bottle behind the register for your return.\n" +
      "By the time I opened it, the label had gone soft from humidity and waiting.\n" +
      "\n" +
      "Letter 4 / unsent\n" +
      "You once said bars are confession machines with better lighting.\n" +
      "Now I know they are also triage rooms with better glassware.\n" +
      "People arrive with stories they cannot carry alone.\n" +
      "We cannot fix their world, but we can hold a steady minute for them.\n" +
      "\n" +
      "Letter 9 / unsent\n" +
      "There is a man who visits without warning.\n" +
      "He sits in the same dark corner and asks for the same cold drink.\n" +
      "No threats. No kindness either. Just pressure in human form.\n" +
      "I keep his table ready because uncertainty is worse than fear.\n" +
      "\n" +
      "Letter 12 / unsent\n" +
      "If I disappear, keep the policies, not the legends.\n" +
      "Warm lights. Short instructions. Keep the room predictable.\n" +
      "Make the room feel survivable.",
    "/secure/founder/aftershock-observations.txt":
      "AFTERSHOCK OBSERVATIONS / SELECT NIGHTS\n" +
      "Night after sirens, guests stop experimenting.\n" +
      "They order what they survived with before.\n" +
      "\n" +
      "Table 6 asked for three old-fashioneds in a row.\n" +
      "Not because they were thirsty, because repetition felt safe.\n" +
      "Table 2 sent back a creative special and asked for a basic highball.\n" +
      "\n" +
      "Conclusion:\n" +
      "on unstable nights, familiarity is part of service.\n" +
      "Do not upsell fear.",
    "/secure/founder/cellar-drafts-raw.md":
      "CELLAR DRAFTS (RAW) / NOTEBOOK PAGES\n" +
      "R-12 looked beautiful under low light.\n" +
      "Guests hated it after two sips. Too sharp, too long, too loud.\n" +
      "Killed it same night.\n" +
      "\n" +
      "C-09 began as a late-hour safety build.\n" +
      "Tea structure held up, spice did not spike anxiety,\n" +
      "finish stayed short enough for slow conversation.\n" +
      "This draft later fed the cold Masaya profile.\n" +
      "\n" +
      "Rule from cellar:\n" +
      "if a drink tastes impressive but destabilizes the room, it fails.",
    "/secure/founder/night-letter-to-erik.txt":
      "NIGHT LETTER TO ERIK (UNSENT)\n" +
      "Erik,\n" +
      "if you are reading this, it means I finally admitted I cannot run every shift forever.\n" +
      "You already know the recipes. What I need you to keep is the cadence.\n" +
      "When the room gets loud, you lower your voice first. Keep doing that.\n" +
      "When someone tries to turn fear into a scene, you never perform back. Keep doing that.\n" +
      "And if C3 fills, no hero moves, no clever lines. Just precision.\n" +
      "A calm bar is built one boring correct choice at a time.\n" +
      "- JN",
    "/secure/founder/last-transit-shutdown-sy06.txt":
      "LAST TRANSIT SHUTDOWN / SY06-12-03 (2106-12-03)\n" +
      "Transit shut down before 21:00.\n" +
      "By 21:30 half the room was stranded with nowhere safe to go.\n" +
      "We moved stools from storage, cut the music, and switched to short menu mode.\n" +
      "Nobody complained when we removed half the specials.\n" +
      "At 00:10 a couple asked if they could sleep in booth B until first light.\n" +
      "We said yes and locked the front from inside.\n" +
      "That was the night Safehouse became literal.",
    "/secure/founder/founder-arc-sy00-sy26.md":
      "FOUNDER ARC / SY00-SY26\n" +
      "PHASE 1 - SURVIVAL (SY00-SY03)\n" +
      "Goal: keep one room lit, fed, and non-violent.\n" +
      "Tools: short menu, hard door rules, strict rationing.\n" +
      "\n" +
      "PHASE 2 - PROFESSIONALIZATION (SY04-SY12)\n" +
      "Goal: turn instinct into repeatable system.\n" +
      "Tools: written protocols, staff specialization, training tracks.\n" +
      "\n" +
      "PHASE 3 - CONTROLLED CHAOS (SY13-SY26)\n" +
      "Goal: absorb unpredictable nights without breaking guest trust.\n" +
      "Tools: continuity chain, debrief culture, founder/staff narrative handover.\n" +
      "\n" +
      "Core doctrine across all phases:\n" +
      "predictability protects people.",
    "/secure/founder/staff-notes": [
      "index.txt",
      "erik.story",
      "theo.story",
      "andrea.story",
      "ju.story",
      "kenji.story",
      "sara.story",
      "nicola.story",
      "giuliano.story",
      "mk.story",
      "luporosso.story"
    ],
    "/secure/founder/staff-notes/index.txt":
      "FOUNDER STAFF NOTES / PRIVATE\n" +
      "These are not HR summaries.\n" +
      "These are founder reads: first contact, pressure behavior, trust signals.\n" +
      "Use for succession only.\n" +
      "\n" +
      "files:\n" +
      "- erik.story\n" +
      "- theo.story\n" +
      "- andrea.story\n" +
      "- ju.story\n" +
      "- kenji.story\n" +
      "- sara.story\n" +
      "- nicola.story\n" +
      "- giuliano.story\n" +
      "- mk.story\n" +
      "- luporosso.story",
    "/secure/founder/staff-notes/erik.story":
      "ERIK / HOW I MET HIM\n" +
      "Met him on a night when half the bar called in sick.\n" +
      "He stepped behind station two without asking for permission,\n" +
      "then matched specs from memory after seeing each bottle once.\n" +
      "Character read: severe on details, gentle with guests, no ego on service.\n" +
      "Trust reason: when pressure rises, he gets quieter, not louder.",
    "/secure/founder/staff-notes/theo.story":
      "THEO / HOW I MET HIM\n" +
      "He arrived as a guest and spent twenty minutes watching queue flow.\n" +
      "Before ordering, he pointed out our blind spot near host lane.\n" +
      "He was right.\n" +
      "Character read: strategic, direct, allergic to drama.\n" +
      "Trust reason: he can de-escalate a room without making it feel managed.",
    "/secure/founder/staff-notes/andrea.story":
      "ANDREA / HOW I MET HER\n" +
      "She came in to return a mislabeled syrup crate from another bar.\n" +
      "Instead of complaining, she showed how they broke traceability.\n" +
      "Character read: exacting, principled, not easily impressed.\n" +
      "Trust reason: she protects standards when everyone else wants shortcuts.",
    "/secure/founder/staff-notes/ju.story":
      "JU / HOW I MET HIM\n" +
      "He found a guest's missing ring under floor trim before close.\n" +
      "No speech, no applause, just a logged chain-of-custody note.\n" +
      "Character read: fast, observant, emotionally contained.\n" +
      "Trust reason: if something goes missing, he turns panic into sequence.",
    "/secure/founder/staff-notes/kenji.story":
      "KENJI / HOW I MET HIM\n" +
      "We met during a compressor failure when the whole cellar was warming.\n" +
      "He listened to the relay panel for ten seconds and named the failing stage.\n" +
      "Character read: technical, patient, speaks only when useful.\n" +
      "Trust reason: he diagnoses before he dramatizes.",
    "/secure/founder/staff-notes/sara.story":
      "SARA / HOW I MET HER\n" +
      "She stopped a no-photo conflict with one sentence and one hand gesture.\n" +
      "Nobody lost face, nobody raised voice.\n" +
      "Character read: empathic, sharp, excellent memory for people.\n" +
      "Trust reason: she reads tension before it becomes event.",
    "/secure/founder/staff-notes/nicola.story":
      "NICOLA / HOW I MET HIM\n" +
      "First shift trial, he stirred one drink for a full minute,\n" +
      "then dumped it because dilution was wrong.\n" +
      "Character read: disciplined, old-school, stubborn in a useful way.\n" +
      "Trust reason: he values consistency over speed when it matters.",
    "/secure/founder/staff-notes/giuliano.story":
      "GIULIANO / HOW I MET HIM\n" +
      "He used to tune theater sound systems.\n" +
      "In his first week he fixed our bass bleed just by moving one panel.\n" +
      "Character read: artistic but methodical, calm under interruption.\n" +
      "Trust reason: he can shift mood without guests noticing the mechanism.",
    "/secure/founder/staff-notes/mk.story":
      "MK / HOW I MET HER\n" +
      "She arrived early for interview and reorganized our prep fridge\n" +
      "while waiting because 'labels were fighting each other'.\n" +
      "Character read: anticipatory, practical, relentless on prep hygiene.\n" +
      "Trust reason: she prevents crises by seeing them a shift ahead.",
    "/secure/founder/staff-notes/luporosso.story":
      "LUPOROSSO / HOW I MET HIM\n" +
      "He never asked for title, only asked who makes final call after 23:00.\n" +
      "When I said 'whoever stays calm', he stayed.\n" +
      "Character read: stoic, loyal, intimidating in useful ways.\n" +
      "Trust reason: he holds line when the room turns uncertain.",
    "/secure/founder/masaya-dossier.txt":
      "MASAYA DOSSIER / STAFF STORY FILE\n" +
      "first logged visit: SY04-02-09\n" +
      "last confirmed visit: SY10-11-17\n" +
      "\n" +
      "He never enters like a customer.\n" +
      "He enters like someone checking whether the room still remembers him.\n" +
      "\n" +
      "First night, founder offered a warm chai build.\n" +
      "Masaya did not touch it. He said: \"Cold. No steam. No show.\"\n" +
      "That sentence became a recipe and then a rule.\n" +
      "\n" +
      "What repeats every time:\n" +
      "- unannounced arrival after first rush\n" +
      "- table C3 only, with view of both exits\n" +
      "- minimal speech, no menu\n" +
      "- same drink: Masaya Chai, stirred cold\n" +
      "\n" +
      "Operational read:\n" +
      "- not violent, but strongly intimidating\n" +
      "- room volume drops when he sits\n" +
      "- staff confidence matters more than speed\n" +
      "\n" +
      "Protocol:\n" +
      "- keep C3 available nightly\n" +
      "- first contact by senior staff only\n" +
      "- no floor commentary, no trainee approach",
    "/secure/founder/masaya-visit-ledger-sy04-sy10.log":
      "NIGHTS WITH MASAYA / EXCERPTS SY04-SY10\n" +
      "SY04-02-09\n" +
      "He sat before anyone could greet him.\n" +
      "Founder served warm chai; he pushed it back once.\n" +
      "\"Cold,\" he said. \"Keep your hand steady.\"\n" +
      "\n" +
      "SY05-01-11\n" +
      "He looked at the bar lead and asked one thing:\n" +
      "\"Same hand on bar?\"\n" +
      "When Erik nodded, he stopped scanning the room.\n" +
      "\n" +
      "SY07-09-28\n" +
      "He left an envelope at C3.\n" +
      "Inside: blank paper, folded three times.\n" +
      "Founder kept it anyway.\n" +
      "\n" +
      "SY09-12-02\n" +
      "No words all night.\n" +
      "One cold Masaya Chai, half sweet, no garnish.\n" +
      "He paid exact cash and left before last call.\n" +
      "\n" +
      "SY10-11-17\n" +
      "Final confirmed visit.\n" +
      "Before leaving he tapped the glass once and said:\n" +
      "\"Good. You kept it cold.\"",
    "/secure/founder/table-c3-standing-order.txt":
      "TABLE C3 STANDING ORDER\n" +
      "authorized by founder\n" +
      "effective: permanent\n" +
      "rationale: reduce volatility during unannounced high-pressure visits\n" +
      "origin note: first enforced after SY04-02-09 disturbance chain\n" +
      "\n" +
      "room setup before open:\n" +
      "- chair angle 17 degrees toward corridor\n" +
      "- one dim filament above table, shielded\n" +
      "- no mirror reflection line toward seat\n" +
      "- no decorative glass on adjacent shelf\n" +
      "\n" +
      "service rules:\n" +
      "- first line spoken by staff: \"Table is set. Order when ready.\"\n" +
      "- menu only if requested\n" +
      "- keep checks silent and short\n" +
      "- if he leaves abruptly, do not follow",
    "/secure/founder/masaya-chai-development-notes.md":
      "MASAYA CHAI / ORIGIN NOTES\n" +
      "The drink started as a mistake.\n" +
      "Founder's first build was warm.\n" +
      "Masaya sent it back and said: \"Cold. Steam makes people nervous.\"\n" +
      "He was right. With no steam, the table stopped feeling like a stage.\n" +
      "\n" +
      "What changed after that night:\n" +
      "- tea moved from hot infusion to cold concentrate\n" +
      "- sweetness reduced to half-bar standard\n" +
      "- garnish removed to keep service silent\n" +
      "\n" +
      "Current spec (cold service):\n" +
      "- assam-infused vodka 45\n" +
      "- dark jaggery reduction 12\n" +
      "- spiced black tea concentrate 25\n" +
      "- acid-adjusted citrus 4\n" +
      "- stir 24 seconds, one clear cold block, no garnish\n" +
      "\n" +
      "Staff memory line:\n" +
      "Masaya Chai is not a comfort drink.\n" +
      "It is a control drink.",
    "/secure/founder/audio-transcript-masaya-night-05.txt":
      "MASAYA NIGHT 05 / TRANSCRIPT FRAGMENT\n" +
      "[21:17] C3 occupied, coat still on, menu untouched\n" +
      "[21:19] founder to bar: \"wait for his cue\"\n" +
      "[21:22] voice (low): \"you still hold this table\"\n" +
      "[21:22] founder: \"we hold what keeps the room steady\"\n" +
      "[21:29] voice: \"same chai\"\n" +
      "[21:30] bar note: stirred cold, single clear block, no garnish\n" +
      "[21:31] room-level meter: crowd noise down from 63 dB to 51 dB\n" +
      "[21:48] C3 cleared, cash exact, no receipt\n" +
      "post-note: no incident, but staff reported pressure lingered through close.",

    "/secure/lore": [
      "timeline-bunker-fragments.md",
      "emergence-log-sy00-day0.md",
      "emergence-log-sy00-day11.md",
      "service-rewrite-sy08.md",
      "second-lock-adoption-sy12.md",
      "first-door-dossier.md",
      "second-lock-report.md",
      "route-board-adjustments-2125.log",
      "hum-frequency-notes.md",
      "vault-rumor-index.txt",
      "alarm-switch-origin.md",
      "emergency-lamp-notes.md",
      "decoy-signage-protocol.md",
      "booth-c-repeat-guest-notes.md",
      "geiger-pattern-notes.md",
      "stairwell-draft-events.log",
      "north-cellar-irregularities.md",
      "founder-audio-transcript-07.txt",
      "stairwell-coins-audit.md",
      "hospitality-engineering-manifesto.md",
      "field-manual-guest-calming-sy04.md",
      "booth-d-audio-log-sy19.txt",
      "clock-drift-incident-sy17.md",
      "stairwell-air-reading-table-sy24-sy26.csv",
      "vault-room-air-index.md",
      "glassware-signal-catalog.md",
      "silent-minute-protocol.md",
      "radio-room-fragments-sy08.log"
    ],
    "/secure/lore/timeline-bunker-fragments.md":
      "TIMELINE / BUNKER FRAGMENTS + SURFACE YEARS\n" +
      "BKR fragment A: war began after a failed evacuation convoy.\n" +
      "BKR fragment B: no one agrees there was a single 'war day'.\n" +
      "BKR fragment C: district clocks diverged, dates became local myths.\n" +
      "2100 (SY00): first coordinated exit from bunker network.\n" +
      "2103 (SY03): SAFEHOUSE opens as controlled service room.\n" +
      "2126 (SY26): current operations baseline.\n" +
      "\n" +
      "note: pre-surface chronology remains disputed by design and by damage.",
    "/secure/lore/emergence-log-sy00-day0.md":
      "EMERGENCE LOG / SY00 DAY 0\n" +
      "They told us to expect silence outside.\n" +
      "Instead we found wind in broken signage and doors that no longer matched maps.\n" +
      "By nightfall, the first rule was already clear: keep one room predictable.",
    "/secure/lore/emergence-log-sy00-day11.md":
      "EMERGENCE LOG / SY00 DAY 11\n" +
      "Guests still spoke in bunker shorthand and checked exits before sitting.\n" +
      "We switched from storytelling service to repeatable short scripts.\n" +
      "That change became the core of Safehouse hospitality.",
    "/secure/lore/service-rewrite-sy08.md":
      "SERVICE REWRITE / SY08\n" +
      "Old menu language was too ornamental for stressed guests.\n" +
      "Replaced long descriptions with concise, consistent service calls.\n" +
      "Escalations dropped after two weeks.",
    "/secure/lore/second-lock-adoption-sy12.md":
      "SECOND LOCK ADOPTION / SY12\n" +
      "Second lock added after repeated corridor pressure events.\n" +
      "Staff initially mocked it as overreaction.\n" +
      "After quarter-end incident review, no one argued against it.",
    "/secure/lore/first-door-dossier.md":
      "FIRST DOOR DOSSIER\n" +
      "Material: reinforced steel skin, brass latch\n" +
      "Behavior note: low-frequency hum after close\n" +
      "Maintenance: hinge lubrication every 14 days",
    "/secure/lore/second-lock-report.md":
      "SECOND LOCK REPORT\n" +
      "Install date: 2112-04-16 (SY12)\n" +
      "Reason: repeated unauthorized movement near service corridor",
    "/secure/lore/route-board-adjustments-2125.log":
      "ROUTE BOARD ADJUSTMENTS 2125\n" +
      "2125-06-18 20:33 board shifted 3cm west during crowd reroute\n" +
      "2125-08-10 19:59 marker card replaced after spill damage\n" +
      "2125-11-02 21:14 board re-centered before open",
    "/secure/lore/hum-frequency-notes.md":
      "HUM FREQUENCY NOTES\n" +
      "Target comfort range: 72-83 Hz\n" +
      "Above 90 Hz guests report stairwell tension.",
    "/secure/lore/vault-rumor-index.txt":
      "VAULT RUMOR INDEX\n" +
      "- hidden tunnel under corridor (false)\n" +
      "- third key for founder partition (unverified)\n" +
      "- panic-switch bypass route (false)\n" +
      "- off-hours stock lift near north cellar (confirmed, fixed)",
    "/secure/lore/alarm-switch-origin.md":
      "ALARM SWITCH ORIGIN\n" +
      "Installed during late bunker era as a ventilation cutoff.\n" +
      "Repurposed in SY03 as full-floor emergency hold.\n" +
      "Current policy: sealed cover, supervisor key only.",
    "/secure/lore/emergency-lamp-notes.md":
      "EMERGENCY LAMP NOTES\n" +
      "Backup phosphor cartridge stored in locker 3.\n" +
      "Swap cycle: every 90 days or after blackout run.\n" +
      "Do not expose cartridge core to direct bar lamps over 30s.",
    "/secure/lore/decoy-signage-protocol.md":
      "DECOY SIGNAGE PROTOCOL\n" +
      "Purpose: slow unauthorized movement toward staff-only corridors.\n" +
      "Guest-facing staff must always provide clear real directions verbally.\n" +
      "Review signage placement every quarter.",
    "/secure/lore/booth-c-repeat-guest-notes.md":
      "BOOTH C / REPEAT GUEST NOTES\n" +
      "High-repeat guests request this booth for line-of-sight privacy.\n" +
      "Observed effect: lower escalation risk when seating is predictable.\n" +
      "No measurable environmental hazard detected.",
    "/secure/lore/geiger-pattern-notes.md":
      "GEIGER PATTERN NOTES\n" +
      "Busy nights produce clustered ticks in the 82-88 range.\n" +
      "Treat as occupancy baseline unless paired with vent alarm.\n" +
      "Calibration logs archived in maintenance partition.",
    "/secure/lore/stairwell-draft-events.log":
      "STAIRWELL DRAFT EVENTS\n" +
      "2125-01-13 23:14 cold draft 41s, seal rechecked\n" +
      "2125-08-22 20:03 warm draft 33s, damper adjusted\n" +
      "2126-01-09 21:45 no recurrence after replacement",
    "/secure/lore/north-cellar-irregularities.md":
      "NORTH CELLAR IRREGULARITIES\n" +
      "Three rack shifts traced to loose caster locks, not intrusion.\n" +
      "One mislabeled crate caused false stock-loss alert.\n" +
      "Corrective action: lock pins added and relabel audit enforced.",
    "/secure/lore/founder-audio-transcript-07.txt":
      "TRANSCRIPT 07\n" +
      "Keep lights warm. Keep talk warmer.\n" +
      "If route boards drift, log and reset before open.",
    "/secure/lore/stairwell-coins-audit.md":
      "STAIRWELL COINS AUDIT\n" +
      "Loose coins in vent duct increased rattle under high airflow.\n" +
      "Items removed, bagged, and logged in evidence locker C.\n" +
      "Post-removal noise dropped 6 dBA.",
    "/secure/lore/hospitality-engineering-manifesto.md":
      "HOSPITALITY ENGINEERING MANIFESTO\n" +
      "A bar is a safety system in evening clothes.\n" +
      "A recipe is a protocol with empathy.\n" +
      "Consistency is not aesthetics; it is trust under pressure.",
    "/secure/lore/field-manual-guest-calming-sy04.md":
      "FIELD MANUAL SY04 - GUEST CALMING\n" +
      "Step 1: lower tone before lowering lights.\n" +
      "Step 2: on first contact present two clear options and avoid long explanations.\n" +
      "Step 3: never argue with fear, redirect it.\n" +
      "Step 4: log trigger and response before shift handover.",
    "/secure/lore/booth-d-audio-log-sy19.txt":
      "BOOTH D AUDIO LOG / SY19\n" +
      "[00:11] low hum at 77hz\n" +
      "[00:13] glass resonance, no break\n" +
      "[00:15] hum ended after music bus mute",
    "/secure/lore/clock-drift-incident-sy17.md":
      "CLOCK DRIFT INCIDENT / SY17\n" +
      "Wall clock, register clock, and wristwatch diverged by 9 minutes.\n" +
      "Cause traced to unstable transformer rail after storm.\n" +
      "Staff completed service with handwritten timestamps.",
    "/secure/lore/stairwell-air-reading-table-sy24-sy26.csv":
      "date,outdoor_temp_c,stairwell_temp_c,delta_c,notes\n" +
      "2124-11-02,8.1,5.2,-2.9,night vent stuck open\n" +
      "2125-08-17,29.4,33.1,+3.7,damper lag under peak load\n" +
      "2126-01-09,1.0,4.5,+3.5,heater relay overshoot",
    "/secure/lore/vault-room-air-index.md":
      "VAULT ROOM AIR INDEX\n" +
      "baseline: old paper + oak + citrus oil trace\n" +
      "ozone spike: check relay cleaning status\n" +
      "metallic note: inspect filter saturation\n" +
      "coffee trace: normal after night shift close",
    "/secure/lore/glassware-signal-catalog.md":
      "GLASSWARE SIGNAL CATALOG\n" +
      "coupe fogging before first pour -> cellar door likely left ajar\n" +
      "nick&nora ringing at rest -> bass bleed from booth monitor\n" +
      "rocks glass micro-fog -> dishwasher cycle too hot",
    "/secure/lore/silent-minute-protocol.md":
      "SILENT MINUTE PROTOCOL\n" +
      "Trigger: sustained guest-floor noise over threshold.\n" +
      "Action: mute music, run calm floor round, hold new orders for 60s.",
    "/secure/lore/radio-room-fragments-sy08.log":
      "[radio/SY08-03-04] maintenance loop repeats 'hold north vent'\n" +
      "[radio/SY08-06-11] static burst during closing ledger\n" +
      "[radio/SY08-09-29] unidentified call requested booth C by code",

    "/secure/personnel": [
      "README-MOVED.txt",
      "legacy-snapshot-2126.txt"
    ],
    "/secure/personnel/README-MOVED.txt":
      "PERSONNEL PARTITION STATUS\n" +
      "This partition is kept for backward compatibility only.\n" +
      "Canonical operational records moved to: /secure/files/staff-records\n" +
      "Canonical personal narrative notes moved to: /secure/founder/staff-notes\n" +
      "Do not create new files here.",
    "/secure/personnel/legacy-snapshot-2126.txt":
      "LEGACY SNAPSHOT / 2126\n" +
      "Snapshot retained after archive cleanup.\n" +
      "Use updated records in /secure/files and /secure/founder.\n" +
      "Reason: removed duplicate and contradictory staff datasets.",

    "/secure/chats": [
      "ops-nightshift-2126-02-20.log",
      "bar-backchannel-2126-02.log",
      "founder-thread-archive-01.log",
      "incident-chat-restricted-access.log",
      "music-queue-votes.log",
      "maintenance-thread-2126-02.log",
      "quiet-room-observations.log"
    ],
    "/secure/chats/ops-nightshift-2126-02-20.log":
      "[19:08] Theo: queue at five\n" +
      "[19:09] Erik: martini line stable\n" +
      "[19:12] Ju: lighter claimed, verified\n" +
      "[19:14] Andrea: bitters low, ordering",
    "/secure/chats/bar-backchannel-2126-02.log":
      "[20:01] MK: block ice in 18 min\n" +
      "[20:02] Nicola: coupes at 14\n" +
      "[20:04] Theo: table 3 requests quiet booth",
    "/secure/chats/founder-thread-archive-01.log":
      "[archive] keep signage controlled near staff corridor\n" +
      "[archive] story first, recipe second\n" +
      "[archive] consistency is never wrong",
    "/secure/chats/incident-chat-restricted-access.log":
      "[22:05] Floor: guest asked about staff-only corridor\n" +
      "[22:05] Ops: apply standard redirect and escort script\n" +
      "[22:07] Floor: resolved",
    "/secure/chats/music-queue-votes.log":
      "[21:10] vote: low vinyl +2\n" +
      "[21:13] vote: no brass tonight +1\n" +
      "[21:20] final: low vinyl",
    "/secure/chats/maintenance-thread-2126-02.log":
      "[17:03] Kenji: condenser cleaned\n" +
      "[17:15] JN: relay hum normalized\n" +
      "[17:19] MK: ice room latch tightened",
    "/secure/chats/quiet-room-observations.log":
      "[20:44] Sara: booth D settled after calm service reset\n" +
      "[21:02] Theo: voice levels normal\n" +
      "[21:28] Andrea: no escalation needed",

    "/secure/incidents": [
      "incident-2124-11-03.log",
      "incident-2125-06-18.log",
      "incident-2125-12-31.log",
      "maintenance-2126-02-19.log",
      "airlock-cycle-anomaly-2126-02-11.log",
      "coin-audit-2126-01.log",
      "vault-alarm-dryrun-2126-02-01.log",
      "incident-2126-02-20-glass-hum.log"
    ],
    "/secure/incidents/incident-2124-11-03.log":
      "[22:14] coin toss settled recipe dispute\n" +
      "[22:51] brass lighter moved to locker B\n" +
      "[23:06] unauthorized basement-tour request redirected with standard script",
    "/secure/incidents/incident-2125-06-18.log":
      "[19:09] booth A power flicker, auto stabilized\n" +
      "[20:33] map pins moved, card replaced\n" +
      "[21:55] inventory mismatch beans +1 -1",
    "/secure/incidents/incident-2125-12-31.log":
      "[23:43] countdown crowd surge controlled\n" +
      "[23:58] one table evacuated due glass break",
    "/secure/incidents/maintenance-2126-02-19.log":
      "[16:02] relay rail tightened\n" +
      "[16:18] geiger calibration pass\n" +
      "[16:40] cellar compressor cleaned",
    "/secure/incidents/airlock-cycle-anomaly-2126-02-11.log":
      "cycle duration spiked to 11.2s\n" +
      "cause: dust on sensor B\n" +
      "fix: cleaned, retested",
    "/secure/incidents/coin-audit-2126-01.log":
      "3 commemorative coins with filed-off dates\n" +
      "stored in sealed envelope locker C",
    "/secure/incidents/vault-alarm-dryrun-2126-02-01.log":
      "dry run complete in 01:26\n" +
      "response rating: acceptable",
    "/secure/incidents/incident-2126-02-20-glass-hum.log":
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
      "shift-briefing-2126-02-21.txt",
      "inventory-deep-2126-02-21.txt",
      "prep-notes-2126-02-21.txt",
      "floor-stability-policy.md",
      "emergency-script.md",
      "recipe-notes-classified.md",
      "handover-script-guest-floor.md",
      "closing-sequence-quickref.txt"
    ],
    "/secure/ops/shift-briefing-2126-02-21.txt":
      "SHIFT BRIEFING\n" +
      "VIP at 21:00\n" +
      "watch queue after 20:30\n" +
      "run quiet reset if noise rises",
    "/secure/ops/inventory-deep-2126-02-21.txt":
      "INVENTORY DEEP\n" +
      "gin reserve: 11 bottles\n" +
      "rye reserve: 9 bottles\n" +
      "vermouth dry: 6 bottles\n" +
      "orgeat: 1.8L\n" +
      "coconut cream: 2.4L\n" +
      "block ice: 42kg",
    "/secure/ops/prep-notes-2126-02-21.txt":
      "PREP NOTES\n" +
      "label thyme bitters batch #4\n" +
      "freeze coupes from 18:05\n" +
      "check cellar humidity at 19:00",
    "/secure/ops/floor-stability-policy.md":
      "FLOOR STABILITY POLICY\n" +
      "If a guest shows stress markers, switch to short service scripts and slower pacing.\n" +
      "Keep communication factual, brief, and non-confrontational.",
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
      "3) active irregular events and mitigation",
    "/secure/ops/closing-sequence-quickref.txt":
      "CLOSING SEQUENCE QUICKREF\n" +
      "panel run quiet-reset\n" +
      "logs show\n" +
      "staff_logs show\n" +
      "verify secure lock state",

    "/secure/archive": [
      "guestbook-full-2125.log",
      "supplier-contracts-redacted.pdf.txt",
      "blueprint-room-a.txt",
      "blueprint-room-b.txt",
      "memo-decoy-signage.md",
      "founder-letter-jn.md",
      "chronicle-fragments.md",
      "terminal-bluebook-bunker-era.txt",
      "audio-reel-index-sy10-sy22.md"
    ],
    "/secure/archive/guestbook-full-2125.log":
      "GUESTBOOK FULL 2125\n" +
      "2125-01-12  \"Best Negroni in this district. Quiet room, good staff.\"\n" +
      "2125-04-07  \"Came in shaking, left calm. Thank you for no questions.\"\n" +
      "2125-08-19  \"Music level perfect. Please never change booth C lighting.\"\n" +
      "2125-11-02  \"Staff handled a tense crowd without drama. Respect.\"\n" +
      "theme frequency: calm, consistency, shelter, memory",
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
    "/secure/archive/memo-decoy-signage.md":
      "MEMO\n" +
      "Do not expose staff-corridor signage logic to guests.\n" +
      "Public signage is intentionally simplified for crowd control.",
    "/secure/archive/founder-letter-jn.md":
      "FOUNDER LETTER\n" +
      "Keep lights warm and talk warmer.\n" +
      "Log irregular events. Keep service steady.",
    "/secure/archive/chronicle-fragments.md":
      "CHRONICLE FRAGMENTS\n" +
      "Monitor chatter spikes on crowded nights.\n" +
      "Hospitality is a kind of engineering.",
    "/secure/archive/terminal-bluebook-bunker-era.txt":
      "TERMINAL BLUEBOOK / BUNKER ERA COPY\n" +
      "Original publication year unknown (header damaged).\n" +
      "Model P-series operation notes.\n" +
      "Keep relay housings dry and warm before startup.",
    "/secure/archive/audio-reel-index-sy10-sy22.md":
      "AUDIO REEL INDEX SY10-SY22\n" +
      "reel-07: founder briefing\n" +
      "reel-19: geiger pattern briefing\n" +
      "reel-24: service doctrine update"
  };
}
