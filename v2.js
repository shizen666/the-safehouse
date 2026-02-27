(function () {
  const root = document.getElementById("v2-app");
  if (!root) {
    return;
  }

  const APPS = [
    { id: "hours", label: "hours", glyph: "H", title: "Service Hours" },
    { id: "location", label: "location", glyph: "L", title: "Location" },
    { id: "menu", label: "menu", glyph: "M", title: "Bar Menu" },
    { id: "events", label: "events", glyph: "E", title: "Events" },
    { id: "contacts", label: "contacts", glyph: "C", title: "Contacts" },
    { id: "public-files", label: "public files", glyph: "F", title: "Public Files" },
    { id: "staff-login", label: "staff login", glyph: "S", title: "Staff Login" },
    { id: "terminal", label: "terminal", glyph: "T", title: "Legacy Terminal" }
  ];

  const appById = new Map(APPS.map((app) => [app.id, app]));
  let mode = "";
  let clockHandle = null;

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
    const d = now
      .toLocaleDateString([], { month: "short", day: "2-digit" })
      .toUpperCase();
    return t + " // " + d;
  }

  function textBlock(value) {
    const block = document.createElement("div");
    block.textContent = value;
    return block;
  }

  function buildHours() {
    return [
      "SAFEHOUSE SERVICE HOURS",
      "",
      "MON  18:00 - 01:00",
      "TUE  18:00 - 01:00",
      "WED  18:00 - 01:00",
      "THU  18:00 - 01:00",
      "FRI  18:00 - 03:00",
      "SAT  18:00 - 03:00",
      "SUN  MAINTENANCE / CLOSED",
      "",
      "Last call: 30 minutes before shutdown",
      "Kitchen lane: 19:00 - 23:30"
    ].join("\n");
  }

  function buildLocation() {
    const wrap = document.createElement("div");
    const kv = document.createElement("div");
    kv.className = "v2-kv";

    [
      ["district", "river belt / sector K"],
      ["marker", "safehouse neon gate"],
      ["landmark", "canal crossing + stair lane"],
      ["transit", "line K stop // kawaramachi"],
      ["entry", "steel door 03 (left corridor)"]
    ].forEach((row) => {
      const k = document.createElement("div");
      k.className = "v2-muted";
      k.textContent = row[0];
      const v = document.createElement("div");
      v.textContent = row[1];
      kv.appendChild(k);
      kv.appendChild(v);
    });

    wrap.appendChild(kv);
    wrap.appendChild(textBlock("\nWalk east on main artery, then turn at the curved ring road. Follow the lower service lane lights to the Safehouse entry."));
    return wrap;
  }

  function buildMenu() {
    return [
      "HOUSE MENU // TONIGHT",
      "",
      "01  DUSTLINE HIGHBALL      12",
      "02  NARROW ESCAPE          14",
      "03  VAULT NEGRONI          13",
      "04  MASAYA CHAI (cold)     11",
      "05  OXIDE SOUR             12",
      "06  AFTERGRID NO-PROOF      9",
      "",
      "Notes:",
      "- Masaya Chai is served cold, low sugar, no garnish.",
      "- Ask staff for low-proof variants."
    ].join("\n");
  }

  function buildEvents() {
    return [
      "UPCOMING EVENTS",
      "",
      "FRI 22:10  CANAL NOISE SESSION",
      "SAT 20:40  AFTERGRID LISTENING BAR",
      "TUE 21:00  ARCHIVE CLASSICS WORKSHOP",
      "",
      "Booking required for groups > 4",
      "No-photo policy active in selected zones"
    ].join("\n");
  }

  function buildContacts() {
    return [
      "CONTACTS",
      "",
      "Reserv.: +81-75-000-5900",
      "Signal : safehouse://frontdesk",
      "Mail   : frontdesk@safehouse.local",
      "",
      "For private bookings include:",
      "date, party size, preferred time"
    ].join("\n");
  }

  function buildPublicFiles() {
    return [
      "PUBLIC FILE INDEX",
      "",
      "- faq",
      "- about safehouse",
      "- house policy",
      "- service charter",
      "- rec-77 (corrupted archive)",
      "",
      "REC-77 hint:",
      "clock 6 / phase 3 / gain 8"
    ].join("\n");
  }

  function buildTerminalInfo() {
    return [
      "LEGACY TERMINAL",
      "",
      "The command-line build is still available.",
      "Open: /index.html",
      "",
      "This V2 interface is GUI-first and touch-ready."
    ].join("\n");
  }

  function buildStaffLogin() {
    const wrap = document.createElement("div");
    const form = document.createElement("form");
    form.className = "v2-login";

    const idLabel = document.createElement("label");
    idLabel.textContent = "Operator ID";
    const idField = document.createElement("input");
    idField.type = "text";
    idField.name = "operator";
    idField.autocomplete = "off";
    idField.autocapitalize = "none";
    idField.autocorrect = "off";
    idField.spellcheck = false;
    idField.setAttribute("data-lpignore", "true");
    idField.setAttribute("data-1p-ignore", "true");
    idLabel.appendChild(idField);

    const keyLabel = document.createElement("label");
    keyLabel.textContent = "Access Key";
    const keyField = document.createElement("input");
    keyField.type = "password";
    keyField.name = "key";
    keyField.autocomplete = "new-password";
    keyField.autocapitalize = "none";
    keyField.autocorrect = "off";
    keyField.spellcheck = false;
    keyField.setAttribute("data-lpignore", "true");
    keyField.setAttribute("data-1p-ignore", "true");
    keyLabel.appendChild(keyField);

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "authenticate";

    const status = document.createElement("div");
    status.className = "v2-muted";
    status.textContent = "status: waiting";

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const ok = idField.value.trim() === "vault_maintenance" && keyField.value.trim() === "p59_relay_7734";
      status.textContent = ok ? "status: granted (staff console unlocked)" : "status: denied";
      status.className = ok ? "" : "v2-muted";
    });

    form.appendChild(idLabel);
    form.appendChild(keyLabel);
    form.appendChild(submit);
    form.appendChild(status);
    wrap.appendChild(form);
    return wrap;
  }

  function buildAppContent(appId) {
    switch (appId) {
      case "hours":
        return textBlock(buildHours());
      case "location":
        return buildLocation();
      case "menu":
        return textBlock(buildMenu());
      case "events":
        return textBlock(buildEvents());
      case "contacts":
        return textBlock(buildContacts());
      case "public-files":
        return textBlock(buildPublicFiles());
      case "staff-login":
        return buildStaffLogin();
      case "terminal":
        return textBlock(buildTerminalInfo());
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
    statusLeft.textContent = "SAFEHOUSE NET";
    const statusRight = document.createElement("span");
    statusRight.textContent = clockText();
    status.appendChild(statusLeft);
    status.appendChild(statusRight);

    const brand = document.createElement("div");
    brand.className = "mobile-brand";
    const brandName = document.createElement("div");
    brandName.className = "mobile-brand-name";
    brandName.textContent = "SAFEHOUSE";
    const brandSub = document.createElement("div");
    brandSub.className = "mobile-brand-sub";
    brandSub.textContent = "CRT HOME // P-59";
    brand.appendChild(brandName);
    brand.appendChild(brandSub);

    const grid = document.createElement("div");
    grid.className = "mobile-grid";

    const panel = document.createElement("div");
    panel.className = "mobile-panel";
    const panelHeader = document.createElement("div");
    panelHeader.className = "mobile-panel-header";
    const panelTitle = document.createElement("div");
    panelTitle.className = "mobile-panel-title";
    panelTitle.textContent = "";
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
      panelContent.appendChild(buildAppContent(appId));
      panel.classList.add("open");
      panelContent.scrollTop = 0;
    }

    function closePanel() {
      panel.classList.remove("open");
    }

    panelClose.addEventListener("click", closePanel);

    APPS.forEach((app) => {
      const icon = document.createElement("button");
      icon.type = "button";
      icon.className = "mobile-app";
      icon.setAttribute("aria-label", app.title);

      const glyph = document.createElement("div");
      glyph.className = "mobile-app-glyph";
      glyph.textContent = app.glyph;

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
    dock.textContent = "tap icon // open module";

    shell.appendChild(status);
    shell.appendChild(brand);
    shell.appendChild(grid);
    shell.appendChild(dock);
    shell.appendChild(panel);
    root.appendChild(shell);

    stopClock();
    clockHandle = setInterval(() => {
      statusRight.textContent = clockText();
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
    brand.textContent = "safehouse crt os // p-59";
    const clock = document.createElement("div");
    clock.className = "desktop-clock";
    clock.textContent = clockText();
    topbar.appendChild(brand);
    topbar.appendChild(clock);

    const workspace = document.createElement("div");
    workspace.className = "desktop-workspace";

    const icons = document.createElement("div");
    icons.className = "desktop-icons";

    const windows = document.createElement("div");
    windows.className = "desktop-windows";

    workspace.appendChild(icons);
    workspace.appendChild(windows);
    shell.appendChild(topbar);
    shell.appendChild(workspace);
    root.appendChild(shell);

    const windowMap = new Map();
    let zCursor = 40;

    function bringToFront(win) {
      zCursor += 1;
      win.style.zIndex = String(zCursor);
      windows.querySelectorAll(".v2-window").forEach((node) => node.classList.remove("active"));
      win.classList.add("active");
    }

    function clampWindow(win) {
      const rect = workspace.getBoundingClientRect();
      const w = win.offsetWidth;
      const h = win.offsetHeight;
      let left = parseFloat(win.style.left || "0");
      let top = parseFloat(win.style.top || "0");
      left = Math.max(140, Math.min(rect.width - w - 8, left));
      top = Math.max(8, Math.min(rect.height - h - 8, top));
      win.style.left = left + "px";
      win.style.top = top + "px";
    }

    function createWindow(appId) {
      const app = appById.get(appId);
      if (!app) {
        return null;
      }

      if (windowMap.has(appId)) {
        const existing = windowMap.get(appId);
        bringToFront(existing);
        return existing;
      }

      const win = document.createElement("article");
      win.className = "v2-window";

      const header = document.createElement("header");
      header.className = "v2-window-header";

      const title = document.createElement("div");
      title.className = "v2-window-title";
      title.textContent = app.title;

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
      body.appendChild(buildAppContent(appId));

      win.appendChild(header);
      win.appendChild(body);
      windows.appendChild(win);

      const offset = windowMap.size;
      win.style.left = 160 + offset * 28 + "px";
      win.style.top = 24 + offset * 22 + "px";

      windowMap.set(appId, win);
      bringToFront(win);
      requestAnimationFrame(() => clampWindow(win));

      closeBtn.addEventListener("click", () => {
        windowMap.delete(appId);
        win.remove();
      });

      minBtn.addEventListener("click", () => {
        win.style.display = "none";
        setTimeout(() => {
          if (!windowMap.has(appId)) {
            return;
          }
          win.style.display = "grid";
          bringToFront(win);
          clampWindow(win);
        }, 180);
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
        const rect = workspace.getBoundingClientRect();
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

      return win;
    }

    APPS.forEach((app) => {
      const icon = document.createElement("button");
      icon.type = "button";
      icon.className = "desktop-icon";
      icon.textContent = app.glyph + "  " + app.label;
      icon.addEventListener("click", () => createWindow(app.id));
      icons.appendChild(icon);
    });

    createWindow("hours");
    createWindow("menu");

    stopClock();
    clockHandle = setInterval(() => {
      clock.textContent = clockText();
    }, 1000 * 30);
  }

  function render() {
    const nextMode = isMobileMode() ? "mobile" : "desktop";
    if (nextMode === mode) {
      return;
    }
    mode = nextMode;
    if (mode === "mobile") {
      renderMobile();
    } else {
      renderDesktop();
    }
  }

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      mode = "";
      render();
    }, 140);
  });

  render();
})();
