# CLAUDE.md — The Safehouse

This file provides context for AI assistants working on this codebase.

## Project Overview

**The Safehouse** is a single-page, client-side web application that presents an
interactive retro terminal (CRT) interface for an atompunk cocktail bar located
in the Susukino district of Sapporo, Japan. It is a narrative/interactive
fiction project with no backend, no build system, and no external dependencies.

The terminal simulates a Unix-like filesystem with guest and staff access tiers,
atmospheric lore content, mini-games, and a mobile fallback UI.

Version: `v6.4`

---

## Repository Structure

```
the-safehouse/
├── index.html      # HTML5 entry point (21 lines)
├── style.css       # Minimal stylesheet with CSS custom properties (10 lines)
├── main.js         # All application logic + embedded filesystem (~737 lines)
└── CLAUDE.md       # This file
```

There is no `package.json`, no `node_modules`, no build tooling, and no test
suite. The entire application ships as three static files.

---

## Tech Stack

- **Language:** Vanilla JavaScript (ES6+), no frameworks
- **Markup:** HTML5
- **Styling:** CSS3 with custom properties (`--bg`, `--ph`, `--dim`, `--warn`, `--err`)
- **Platform:** Browser-only, client-side only
- **Dependencies:** None (zero npm packages, zero CDN imports)

---

## Running the App

Open `index.html` directly in a browser, or serve the directory with any static
file server. No build step is needed.

```sh
# Example using Python
python3 -m http.server 8080

# Example using Node
npx serve .
```

Mobile detection is based on `window.matchMedia('(max-width: 767px)')` and
`'ontouchstart' in window`. On mobile, the terminal UI is hidden and a card-based
UI is rendered instead.

---

## Architecture

### Entry Point (`main.js`)

The file uses a two-level structure:

1. **IIFE wrapper** (lines 1–11): catches boot errors and displays them in the
   `#boot` element.
2. **`initSafehouse()`** (lines 13–687): the entire desktop terminal application,
   containing the embedded filesystem, all command handlers, UI helpers, and
   input logic.
3. **`renderMobileUI(_, FS)`** (lines 689–737): the alternative mobile card UI,
   called from within `initSafehouse()` when a mobile device is detected.

### Simulated Filesystem (`FS`)

The `FS` constant (lines 25–357) is a plain JavaScript object that maps
absolute POSIX-style paths to either:

- **`Array<string>`** — a directory listing (array of child names, not full paths)
- **`string`** — file contents

Directory structure:

```
/
├── home/
│   ├── guest/          # Public-facing content (README, map, FAQ, lore)
│   ├── bar/            # Staff bar content (recipes, inventory, ops)
│   └── founder/        # Historical lore, journals, staff profiles
├── etc/
│   ├── motd            # Message of the day
│   ├── drinks.txt      # Quick drink reference
│   └── secret/         # Staff-only documents (ops manual, codes, roster)
└── var/
    ├── ops/            # Incident logs, maintenance notes
    └── log/            # Guest log, staff log, rad log
```

### State Variables

Declared at the top of `initSafehouse()`:

| Variable  | Type      | Purpose                                        |
|-----------|-----------|------------------------------------------------|
| `staff`   | `boolean` | Whether the user has authenticated as staff    |
| `username`| `string`  | Current logged-in username (default: `"guest"`)|
| `tries`   | `number`  | Failed login attempt counter                   |
| `running` | `number\|null` | ID of the active `setInterval` (for follow/tail) |
| `cwd`     | `string`  | Current working directory path                 |
| `pending` | `string\|null` | Pending suggested command awaiting Y/n confirmation |
| `history` | `Array`   | Command history for arrow-key navigation       |
| `hIndex`  | `number`  | Current position in command history            |

### Authentication

Staff login is handled by `startStaffLogin()`. Valid access codes (hardcoded,
intentionally weak — this is a roleplay mechanic):

```
admin, 0000, 1234, staff, letmein, password, safehouse, user, hack, bypass
```

After 3 failed attempts, a `lockdown` CSS animation briefly fires. Logging out
resets `staff`, `username`, and `cwd` to guest defaults.

---

## Command System

### Guest Commands

Available before authentication:

| Command           | Action                              |
|-------------------|-------------------------------------|
| `help`            | List available commands             |
| `info`            | Show bar story / about text         |
| `hours`           | Opening times                       |
| `map`             | ASCII sector map                    |
| `contacts`        | Phone, email, Instagram             |
| `staff`           | Initiate staff login                |
| `sudo please`     | Polite shortcut to staff login      |
| `term night on\|off` | Toggle night-ops CSS theme       |
| `term audio on\|off` | Toggle audio (stub)              |
| `clear`           | Clear the screen                    |

### Staff Commands

Available after authentication (`staff` merged on top of `guest`):

| Command                       | Action                                        |
|-------------------------------|-----------------------------------------------|
| `ls [path]`                   | List directory contents                       |
| `cd [path\|..\|back]`         | Change directory                              |
| `pwd`                         | Print current path                            |
| `cat <file>`                  | Display file contents                         |
| `open <file\|dir>`            | Open file or cd into directory                |
| `tree [path]`                 | Recursive directory tree                      |
| `logs show\|follow`           | Guest log; `follow` streams live entries      |
| `staff_logs show\|follow`     | Staff log; `follow` streams live entries      |
| `stop`                        | Stop any running `setInterval` stream         |
| `drinks list\|show\|random`   | Drinks menu helpers                           |
| `recipes [--json\|random]`    | Recipes or experimental random combination    |
| `inventory`                   | Show inventory snapshot                       |
| `tail -f /dev/rad`            | Simulated radiation stream                    |
| `lock set A\|B\|C <00-99>`   | 3-rotor lock mini-game (target: 50,50,50)     |
| `lock unlock`                 | Unlock if all rotors at target                |
| `emerg pressurize`            | Animated pressurization sequence              |
| `emerg wirecut red\|yellow\|green` | Random-correct wire cutting game        |
| `emerg morse ... --- ...`     | SOS morse check                               |
| `reviews add`                 | Multi-line heredoc input → mailto link        |
| `reviews list`                | List reviews (stub)                           |
| `safehousectl do-not-press`   | Easter egg containment gag                    |
| `staff logs\|follow\|logout`  | Staff meta-commands while logged in           |

---

## Key Functions

| Function                        | Location       | Purpose                                      |
|---------------------------------|----------------|----------------------------------------------|
| `initSafehouse()`               | line 13        | Main app entry point                         |
| `resolveCaseInsensitive(path)`  | line 366       | Case-insensitive path resolution through FS  |
| `aliasPath(p)`                  | line 383       | Expands aliases (`secret` → `/etc/secret`, `~` → `/home/guest`) |
| `resolvePath(path)`             | line 388       | Combines `aliasPath` + `resolveCaseInsensitive` |
| `fuzzy(name)`                   | line 394       | Fuzzy filename search across FS              |
| `isSecret(p)`                   | line 400       | Returns true if path is under `/etc/secret`  |
| `print(t, cls)`                 | line 403       | Append a div to `#screen`                    |
| `suggest(cmd)`                  | line 427       | Show a Y/n command suggestion                |
| `startStaffLogin(fromSudo)`     | line 463       | Initiate interactive staff login flow        |
| `ask(label, cb)`                | line 637       | Prompt user for input, call `cb` on Enter    |
| `greet(user)`                   | line 641       | Show personalized greeting per known username|
| `route(raw)`                    | line 654       | Parse and dispatch a raw command string      |
| `heredoc(done)`                 | line 661       | Multi-line input mode (ends with `EOF`)      |
| `keyHandler(e)`                 | line 665       | Keyboard event handler (Enter, arrows, Ctrl+C)|
| `renderMobileUI(_, FS)`         | line 689       | Render mobile card-based UI                  |

---

## CSS Conventions

All colors are CSS custom properties on `:root`:

| Variable   | Default      | Semantic use          |
|------------|--------------|-----------------------|
| `--bg`     | `#050a07`    | Page background       |
| `--ph`     | `#afffd1`    | Primary text (phosphor green) |
| `--dim`    | `#7ecaa5`    | Muted/secondary text  |
| `--warn`   | `#ff9a5c`    | Warnings              |
| `--err`    | `#ff5c5c`    | Errors                |

Night mode is toggled via the `data-night` attribute on `<html>`:
```js
document.documentElement.setAttribute('data-night', 'on');
```

Output CSS utility classes used via `print()`:

| Class       | Color/effect                  |
|-------------|-------------------------------|
| `.ok`       | Bright green (`#7fffb2`)      |
| `.warn`     | Orange (`--warn`)             |
| `.err`      | Red (`--err`)                 |
| `.muted`    | Dim green (`#7ecaa5`)         |
| `.small`    | Smaller muted text            |
| `.lockdown` | Flashing animation (on auth failure) |

---

## HTML Structure

```html
<body>
  <div id="mobile" hidden>     <!-- Mobile UI (shown on touch/small screens) -->
  <div id="crt">
    <div id="boot">            <!-- Boot sequence text (animated) -->
    <div id="screen" hidden>   <!-- Command output -->
    <div id="prompt" hidden>
      <span id="ps1">          <!-- Shell prompt (e.g. guest@safehouse:~$) -->
      <input id="cmd">         <!-- Command input -->
    </div>
  </div>
</body>
```

---

## Coding Conventions

- **Naming:** camelCase for variables and functions; UPPERCASE for top-level
  constants (`FS`).
- **DOM shorthand:** `const $ = (s, c=document) => c.querySelector(s)` (line 17).
- **No semicolons on object methods** — standard JS function expressions used
  throughout.
- **Arrow functions** preferred for short utilities; named functions for larger
  blocks.
- **Single-file layout:** all logic lives in `main.js` in order of execution.
  Do not split into modules without a compelling reason — there is no bundler.
- **Inline HTML in `print()`:** the `print()` helper sets `innerHTML`, so
  content passed to it may include `<span>` tags for color. Never pass
  untrusted user input directly to `print()`.
- **`isDir` / `isFile`** are the canonical checks; always use them rather than
  `typeof FS[p]` directly.

---

## Mobile UI

When `__MOBILE__` is `true`, `initSafehouse()` calls `renderMobileUI({}, FS)`
and returns early. The mobile UI:

- Is rendered entirely inside `<div id="mobile">`.
- Duplicates `isDir`, `isFile`, and `norm` locally (they are not shared from
  `initSafehouse`'s closure).
- Hardcodes the valid access codes in the login handler (same list as desktop).
- Provides card-based navigation: About, Hours, Map, Contacts, Staff Login,
  Files (browseable), Logs, Diagnostics, Pressurize.

---

## Known Limitations / Design Decisions

- **No persistence:** all state is in memory; refreshing resets everything.
- **Weak auth by design:** the staff password list is intentionally silly — this
  is a roleplay / immersive fiction mechanic, not a security boundary.
- **`isSecret()` is the only access control:** files under `/etc/secret` are
  blocked from guest-mode `cat`/`open` via the `publicOnly` flag in
  `resolveFile()`. Staff mode bypasses this.
- **`reviews add`** opens a `mailto:` link with the review body — no server-side
  storage.
- **`tail -f /dev/rad`** and `logs follow` / `staff_logs follow` use
  `setInterval`; only one interval runs at a time (`running`). Use `stop` or
  Ctrl+C to cancel.
- **No error handling for `FS` mutations:** the `FS` object is treated as
  read-only at runtime; no commands modify it.

---

## Development Workflow

There is no build step, test suite, linter, or CI pipeline. Development workflow:

1. Edit `main.js`, `style.css`, or `index.html` directly.
2. Reload the browser to test changes.
3. Verify both desktop (>767px) and mobile (<768px) viewports.
4. Commit with a descriptive message.

For substantial changes to the command system, check all three places where
valid-command lists are defined or referenced:
- `guest` object (line 431) — guest command handlers
- `staffCmd` object (line 480) — staff command handlers
- `route()` (line 654) — dispatch logic merging both objects
- `help()` in each object — the help text shown to users

---

## Lore Reference (for content changes)

- **Setting:** Post-war atompunk shelter bar, Susukino district, Sapporo
- **Coordinates:** 43.055N / 141.353E
- **Version:** v6.4
- **Contact:** contact@safehouse.bar / +81 (0)11-SAFE-BAR / @safehouse.bar
- **Hours:** Tue–Sun 18:00–01:00, last call 00:30, Mon closed
- **Key staff:** JN, MK, Erik, Theo, Luporosso, Andrea, Ju, Nicola, Giuliano
- **Radiation threshold:** 0.35 μSv/h (warn guests indirectly; never announce numbers)
- **Map pins:** document movement, never correct the arrows
- **The neon hum:** if it hums, guests are safe; if it hisses, serve water
