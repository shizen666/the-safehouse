// The Safehouse Terminal V6.4 — expanded lore & descriptive help, keeps sudo please & staff shortcuts
(function(){
  function showFatal(e){
    var el = document.getElementById('boot') || document.body.appendChild(document.createElement('pre'));
    el.style.whiteSpace = 'pre-wrap';
    el.textContent = 'BOOT ERROR:\n' + (e && (e.stack || e) || 'unknown');
    var scr = document.getElementById('screen'); if(scr) scr.hidden = false;
  }
  function safeStart(){ try { initSafehouse(); } catch(e){ showFatal(e); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', safeStart); else safeStart();
})();

function initSafehouse(){
  const __MOBILE__=(window.matchMedia && window.matchMedia('(max-width: 767px)').matches)||('ontouchstart' in window);
  if(__MOBILE__){ const m=document.getElementById('mobile'); if(m) m.hidden=false; const c=document.getElementById('crt'); if(c) c.hidden=true; /* wait to render until FS exists */ }

  const $=(s,c=document)=>c.querySelector(s);
  const boot=$('#boot'), screen=$('#screen'), prompt=$('#prompt'), input=$('#cmd'), ps1=$('#ps1');
  if(!boot||!screen||!prompt||!input) throw new Error('DOM not ready');

  let staff=false, username='guest', tries=0, running=null;
  let cwd="/home/guest", pending=null, history=[], hIndex=-1;

  // ---------- FS with long readable content ----------
  const FS={
    "/":["home","etc","var","doc"],
    "/home":["guest","bar","founder"],
    "/home/guest":[
      "README.txt","about.txt","map.txt","house-rules.txt","press.txt",
      "guestbook-entries.txt","rumors-nearby-2025.txt","story-the-first-door.md",
      "faq-visitors.md"
    ],
    "/home/guest/README.txt":
`WELCOME TO THE SAFEHOUSE
This terminal is a polite fiction designed to make you feel safer.
Type 'help' to begin. For staff access: type 'staff' (or try 'sudo please').
Pro tip: names are case-insensitive. Try: 'cat about' or 'open secret'.
Navigation: 'tree' draws the map for staff. Guests get stories instead.`,
    "/home/guest/about.txt":
`ABOUT THE ROOM
We are an atompunk cocktail shelter — pre‑war technique, post‑war manners.
Our recipes are simple because our stories aren't. Hospitality is engineering.
If the neon hums, you're safe. If it hisses, ask for water.`,
    "/home/guest/map.txt":
`+---------------- SUSUKINO SECTOR ----------------+
| .  .  .  .  .  .  .  .  x  .  .  .  .  .  .   |
+------------------------------------------------+
coords: 43.055N / 141.353E (approx)
Legend: x = Safehouse (probably).`,
    "/home/guest/house-rules.txt":
`HOUSE RULES
1) No magic portals.
2) No menus on fire.
3) If the neon hums, you're safe.
4) Ask nicely; the house remembers.
5) Don't follow the arrows.
6) If you see a brass lighter, hand it to Ju.`,
    "/home/guest/press.txt":
`PRESS CLIPPINGS (excerpt)
"The last bar before sense returns." — local weekly
"A room that feels like a memory with better glassware." — traveler`,
    "/home/guest/guestbook-entries.txt":
`GUESTBOOK (selected)
[2025‑06‑03] "Felt like stepping into a memory that never happened." — K.
[2025‑07‑15] "Best martini north of the blast line." — K.M.
[2025‑08‑01] "We followed the arrows. Shouldn't have." — anonymous
[2025‑08‑09] "The hum is not the fridge." — T.
[2025‑08‑10] "The water saved my night." — A person we were glad to see.`,
    "/home/guest/rumors-nearby-2025.txt":
`RUMORS IN THE NEIGHBORHOOD
— The map pins creep when no one watches.
— A door in the stairwell that opens to the wrong season.
— The bartender keeps a vial of sunlight.
— The Geiger counter purrs when the playlist is right.`,
    "/home/guest/story-the-first-door.md":
`STORY — THE FIRST DOOR
They called it The First Door. New metal pretending to be old.
We closed it every night and every night it took a breath with us.
The breath was the hum and the hum was the room saying: stay.`,
    "/home/guest/faq-visitors.md":
`VISITOR FAQ
Q: Do you take reservations?
A: No. The room decides.
Q: What's with the map?
A: It's how we practice not giving directions.
Q: Are the arrows wrong?
A: They are comforting.` ,

    "/home/bar":[
      "recipes.md","inventory.txt","prep-notes-2025-08.txt","menu-changelog.log",
      "supplier-list.txt","cleaning-checklist.txt","shift-briefing-2025-08-10.txt",
      "supply-orders-2025.log","prep-guide-ice-and-glass.md","staff-manual-service.md",
      "ops-checklist-quiet-open.md"
    ],
    "/home/bar/recipes.md":
`## Staff Recipes (extended)
THYME LORD
- gin 50, lemon 25, orgeat 15, egg white 25, 2 dash thyme bitters.
- dry shake hard; add ice; shake again; double strain; thyme oils.

ONE PIECE
- Jamaican rum 45, lime 25, coconut 20, 2 dash pineapple bitters.
- hard shake; dirty dump; mint + lime aroma; no straw.

PRE-WAR MARTINI
- gin 60, dry vermouth 10, 40-second stir; frozen coupe; lemon oils only.

HOUSE OLD FASHIONED
- rye 60, demerara 5, 2 dash bitters; one big cube; orange oils.

SPENT SUNSET (staff)
- mezcal 35, rye 25, vermouth rosso 20, 2 dash bitters. Stir 30s. Orange oils.`,
    "/home/bar/inventory.txt":
`INVENTORY SNAPSHOT
glassware: 32
coasters: 117
beans: 12 (??)
salt: 3kg
bitters: 9
gold dust: 1 vial
thyme bitters: batch #3 (strong)
grenadine: low — reorder
maraschino: ok
coconut cream: prep daily`,
    "/home/bar/prep-notes-2025-08.txt":
`PREP NOTES
[2025‑08‑07] Label thyme bitters batch #3. Strong nose, tiny dash.
[2025‑08‑08] Freeze coupes from 18:00. Martini spec clarified.
[2025‑08‑09] Coconut cream: shake cold; keep 4h max.`,
    "/home/bar/menu-changelog.log":
`MENU CHANGELOG
[2025‑06‑01] Added ONE PIECE (pineapple bitters).
[2025‑07‑12] PRE‑WAR MARTINI: longer stir.
[2025‑08‑01] THYME LORD: thyme bitters batch #3 (strong).`,
    "/home/bar/supplier-list.txt":
`SUPPLIERS
Ice: Old City Ice Co.
Citrus: Nekketsu Market (ask for Aya).
Spirits: Hokkaido Select.`,
    "/home/bar/cleaning-checklist.txt":
`CLEANING CHECKLIST
OPEN: lights, music low, mats, ice wells, knives, rags, bins.
CLOSE: wipe bars, restock, glasswasher drain, CO2 check.`,
    "/home/bar/shift-briefing-2025-08-10.txt":
`SHIFT BRIEFING — 2025‑08‑10
VIP at 21:00. Ask for password politely. No fireworks.`,
    "/home/bar/supply-orders-2025.log":
`SUPPLY ORDERS (2025)
[2025‑05‑02] Order #1149 — gin, vermouth, rye, bitters, coupes (6).
[2025‑06‑19] Order #1281 — Jamaican rum, pineapple bitters, coconut.
[2025‑07‑27] Order #1340 — lemons, limes, sugar, block ice.
[2025‑08‑09] Order #1405 — orgeat syrup (almond-heavy), thyme.`,
    "/home/bar/prep-guide-ice-and-glass.md":
`# Ice & Glass Guide
— Crack big cubes gently; avoid snow.
— Chill coupes at least 20 min before service.
— Wipe condensation before serve to keep labels crisp.`,
    "/home/bar/staff-manual-service.md":
`# Service Manual (extract)
— Build the room before the drink.
— If a guest asks about the map: tell a story, not directions.
— Water is never wrong.`,
    "/home/bar/ops-checklist-quiet-open.md":
`OPS CHECKLIST — QUIET OPEN
— Test music at conversation volume.
— Warm lights. If they hiss, slightly lower power rail.
— Pull 1L cold water; keep lemons ready for oils.` ,

    "/home/founder":[
      "journal-1963.md","journal-1968.md","journal-1972.md","notes-keys.txt","letter-to-jn.md",
      "mission-statement-early.md","after-the-second-lock.md","staff-profiles","chronicle-fragments.md"
    ],
    "/home/founder/journal-1963.md":
`# Day 0
They said it was a drill. The bartender kept the bar open anyway.
We sealed the first door today. It did not feel like safety.

# Day 3
The ice kept its shape longer than we did. People laughed at the sign—
"SAFEHOUSE"—then asked for water. We served martinis instead.

# Day 11
A woman traded a story for a drink. The story was heavier.`,
    "/home/founder/journal-1968.md":
`# Day 1472
The neon hum is comforting. We pretend it is the ocean.
When the map pins move, we let them. The arrows lie so our guests can rest.
Tonight someone asked for sunlight. We pretended not to hear.`,
    "/home/founder/journal-1972.md":
`The second lock was added. People stopped laughing about the first.
We kept pouring as if kindness could be rationed.
The door remembers our hands.`,
    "/home/founder/notes-keys.txt":"Vault code fragment: ████-██-██",
    "/home/founder/letter-to-jn.md":
`Keep the lights warm and the talk warmer.
If the pins move, log it and do not fix the arrows. We guide by feelings here.`,
    "/home/founder/mission-statement-early.md":
`We will be the room where the world pauses.
A drink is a small shelter. A bar is a long one.`,
    "/home/founder/after-the-second-lock.md":
`The first sound after the second lock was laughter.
It has been loud enough ever since.`,
    "/home/founder/chronicle-fragments.md":
`— The Geiger sings in D on busy nights.
— Coins in the ducts keep the stairwell from remembering.
— Hospitality is a kind of engineering.`,
    "/home/founder/staff-profiles":[
      "erik.md","theo.md","luporosso.md","andrea.md","ju.md","nicola.md","giuliano.md"
    ],
    "/home/founder/staff-profiles/erik.md":
`# Erik — Senior Bartender
Role: Spec guardian, Martini czar.
Strengths: Ferocious consistency, quiet hospitality.
Habits: Lines up tins, whispers to the shaker.
Evaluation: 5/5. Trusted with off‑menu service.
Notes: "You know where the bodies are buried. Keep it tidy."`,
    "/home/founder/staff-profiles/theo.md":
`# Theo — Floor & Ops
Role: Pin watcher, guest shepherd.
Strengths: Calm under nonsense, fast with water.
Habits: Hums with the neon.
Evaluation: 4.5/5.
Notes: "If it hums, it works. If it sparks, log it."`,
    "/home/founder/staff-profiles/luporosso.md":
`# Luporosso — Night Lead
Role: Night shift captain.
Strengths: Long memory, short speeches.
Habits: Checks Geiger twice, jokes once.
Evaluation: 4.7/5.
Notes: "The night shift is yours, as always."`,
    "/home/founder/staff-profiles/andrea.md":
`# Andrea — Bar Ops
Role: Spec tuning, garnish policy.
Strengths: Ratios; eyes on glass.
Habits: Smiles at the word "cold".
Evaluation: 4.6/5.
Notes: "Your cocktail ratios are legendary."`,
    "/home/founder/staff-profiles/ju.md":
`# Ju — Lost+Found / Logistics
Role: Finds what others lose.
Strengths: Keys, lighters, stories.
Habits: Knows the lockers by sound.
Evaluation: 4.4/5.
Notes: "The vents are making that noise again."`,
    "/home/founder/staff-profiles/nicola.md":
`# Nicola — Bar Support
Role: Stir & strain specialist.
Strengths: Patience, stir timing.
Habits: Checks Geiger before Table 4.
Evaluation: 4.5/5.`,
    "/home/founder/staff-profiles/giuliano.md":
`# Giuliano — Atmosphere
Role: Light & sound.
Strengths: Mood tuning, subtle hands.
Habits: Keeps the stairwell hum in check.
Evaluation: 4.3/5.
Notes: "Keep the music low and the lights dim."`,

    "/etc":["motd","drinks.txt","secret"],
    "/etc/motd":"WELCOME. Keep lights warm.",
    "/etc/drinks.txt":
`martini      classic   lemon oils
thyme-lord   sour      orgeat, egg white
one-piece    tiki      jamaican rum
old-fashioned stirred  rye/bourbon`,
    "/etc/secret":["ops-manual.md","codes.txt","staff-roster.txt","bar-notices.txt","access-policy.md","briefing-rumors.md"],
    "/etc/secret/ops-manual.md":
`SAFEHOUSE OPERATIONS MANUAL (extract)
PURPOSE: Keep guests safe, keep stories kinder than the day outside.

RADIATION
— If RAD > 0.35 μSv/h: dim lights, lower music, keep voices low.
— Never announce numbers to guests; calm is policy.
— Recalibrate Geiger every Monday open.

MAP & ARROWS
— If pins move: log time precisely. Do not correct the arrows.
— If a guest asks for directions, offer a small story instead.

WATER POLICY
— Water is hospitality, not penance. Pour freely.
— If "vortex" or "portal" is mentioned: water with lemon oils.

CLOSING CHECK
— Airlock cycle. Ice wells drain. Lights to warm.`,
    "/etc/secret/codes.txt":"Vault: ████-██-██ (fragment only)",
    "/etc/secret/staff-roster.txt":"JN, MK, Erik, Theo, Luporosso, Andrea, Ju, Nicola, Giuliano",
    "/etc/secret/bar-notices.txt":"Keep music low. Keep lights dim. No garnishes on Old Fashioned.",
    "/etc/secret/access-policy.md":"Only staff may touch the map pins. Document, don't correct.",
    "/etc/secret/briefing-rumors.md":
`BRIEFING — Rumors worth knowing
— Someone keeps paying with coins from the wrong decade.
— A guest asked if the red button is real. It is. Do not.`,

    "/var":["ops","log"],
    "/var/ops":[
      "incident-2024-11-03.log","incident-2025-06-18.log","maintenance-2025-08-10.log",
      "door-ops-2025-08-10.log","bar-checks-2025-08-10.txt","maintenance-notes-2025-08-10-long.md",
      "ops-journal-rolling.md"
    ],
    "/var/ops/incident-2024-11-03.log":
`[22:14] Coin toss settled a recipe dispute (heads: extra bitters).
[22:51] Lost item: brass lighter 'M.K.' → Locker B. Owner to describe engraving.
[23:06] "Time vortex" requested. Water poured. Guest calmed.`,
    "/var/ops/incident-2025-06-18.log":
`[19:09] Power flicker Booth A. Generator auto-stabilized (0.8s).
[20:33] Map pins moved (again). Card left: DON'T FOLLOW THE ARROWS.
[21:55] Inventory mismatch: beans +1 then -1. (Not funny.)`,
    "/var/ops/maintenance-2025-08-10.log":
`[16:00] Tubes warm-up nominal.
[17:30] Rad sweep OK.
[18:12] Red button guard plate scratched ('DON'T').`,
    "/var/ops/door-ops-2025-08-10.log":
`[18:02] Airlock cycle test OK.
[18:18] Visitor flow steady.`,
    "/var/ops/bar-checks-2025-08-10.txt":
`Bar mats dry, coupes frozen, coasters stacked, dust negligible.`,
    "/var/ops/maintenance-notes-2025-08-10-long.md":
`MAINTENANCE NOTES — 2025-08-10
— Booth A: power flicker; replaced inline fuse; monitor next 48h.
— Stairwell hum: normal range. If pitch rises, check ducts for coins (!).
— Glasswasher: drain slow; cleared lemon pits; add strainers.
— Geiger: stable drift; recalibrate Monday.
— Map board: pins rearranged themselves during cleanup. Documented; no corrections made.`,
    "/var/ops/ops-journal-rolling.md":
`ROLLING OPS JOURNAL
[19:00] "Don't follow the arrows" card replaced (again).
[19:40] VIP early; moved to Booth C. Redacted topic.
[20:05] Guest asked for sunlight. Served water with lemon oils.`,
    "/var/log":["guest.log","staff.log","rad.log","supply-exceptions-2025.log","shift-notes-extended.log"],
    "/var/log/guest.log":
`[2025‑08‑10 18:02] door/open  ok
[2025‑08‑10 18:07] power      calibrated
[2025‑08‑10 18:18] host       reservation requested 21:00 x2
[2025‑08‑10 19:40] guest      asked about 'vortex' — water deployed`,
    "/var/log/staff.log":
`[18:00:01] shift/open     JN: Lights on, music low.
[18:05:22] prep/ice        MK: Ice well topped. Cracked for martinis.
[18:11:47] bar/spec        Erik: Thyme bitters #3 is strong; go easy.
[18:20:10] floor/guest     Theo: Table 2 asked about 'portal'. Water deployed.
[18:33:32] ops/power       JN: Brief flicker, rerouted. Stable.
[18:45:00] bar/stock       Andrea: Gold dust vial accounted for.
[19:02:14] floor/lost+found Ju: Brass lighter 'M.K.' stored in Locker B.
[19:21:59] bar/spec        Nicola: Pre-war martini longer stir confirmed.
[19:50:41] floor/noise     Giuliano: Stairwell hum again, nothing found.
[20:15:03] ops/map         Theo: Pins moved (again). Left the card.`,
    "/var/log/rad.log":
`[18:10] 0.12 stable
[19:00] 0.18 stable
[20:30] 0.33 watch`,
    "/var/log/supply-exceptions-2025.log":
`[2025‑08‑02] Supplier shorted us 1 bottle of vermouth; credited.
[2025‑08‑08] Coconut cream arrived warm; rejected. Replaced same day.`,
    "/var/log/shift-notes-extended.log":
`— Remember: story first, recipe second.
— If a guest brings a coin with a hole, give it back. Politely.`
  }

  // Mobile: now FS exists, render and exit
  if (typeof __MOBILE__ !== 'undefined' && __MOBILE__) { renderMobileUI({}, FS); return; }
;

  function isDir(p){ return Array.isArray(FS[p]); }
  function isFile(p){ return typeof FS[p]==='string'; }
  function norm(p){ p=p.replace(/\/+/g,'/'); if(p.length>1 && p.endsWith('/')) p=p.slice(0,-1); return p; }
  function resolveCaseInsensitive(path){
    path = norm(path);
    if(FS[path]) return path;
    const segs = path.split('/').filter(Boolean);
    let cur = "";
    for(let i=0;i<segs.length;i++){
      cur += "/" + segs[i];
      const parent = cur.substring(0, cur.lastIndexOf('/')) || "/";
      const listing = FS[parent];
      if(!Array.isArray(listing)) return null;
      const wanted = segs[i].toLowerCase();
      const match = listing.find(n => n.toLowerCase() === wanted);
      if(!match) return null;
      cur = parent + "/" + match;
    }
    return cur || "/";
  }
  function aliasPath(p){
    if(/^\/?secret$/i.test(p)) return "/etc/secret";
    if(/^~$/.test(p)) return "/home/guest";
    return p;
  }
  function resolvePath(path){
    if(!path) return cwd;
    path = aliasPath(path);
    if(!path.startsWith("/")) path = (cwd==="/"?"":cwd)+"/"+path;
    return resolveCaseInsensitive(path);
  }
  function fuzzy(name){
    const q=(name||"").toLowerCase(); const res=[];
    const here=FS[cwd]; if(Array.isArray(here)){ here.forEach(n=>{ if(n.toLowerCase().includes(q)) res.push(norm(cwd+"/"+n)); }); }
    if(res.length<5){ Object.keys(FS).forEach(k=>{ if(typeof FS[k]==='string'){ const base=k.split('/').pop().toLowerCase(); if(base.includes(q) && !res.includes(k)) res.push(k); } }); }
    return res.slice(0,5);
  }
  function isSecret(p){ return p && p.startsWith("/etc/secret"); }

  // ---------- UI helpers ----------
  function print(t="",cls=""){ const d=document.createElement('div'); if(cls) d.className=cls; d.innerHTML=t; screen.appendChild(d); screen.scrollTop=screen.scrollHeight; }
  const ok=t=>print(`<span class="ok">${t}</span>`);
  const warn=t=>print(`<span class="warn">${t}</span>`);
  const err=t=>print(`<span class="err">${t}</span>`);
  const banner=t=>print(`\n<span class="muted">—</span> ${t} <span class="muted">—</span>`);
  function updatePS1(){ ps1.textContent=(staff?username:"guest")+"@safehouse:"+cwd+"$"; }

  // ---------- Boot sequence ----------
  boot.hidden=false; screen.hidden=true; prompt.hidden=true;
  const bootLines=[
    "SAFEHOUSE SYSTEM BOOT",
    "PHOSPHOR P1  |  TUBE WARM-UP ........ OK",
    "POWER RAILS  |  +5V +12V ............ OK",
    "AIRLOCK      |  CYCLE TEST .......... OK",
    "RAD MONITOR  |  SENSOR ARRAY ........ OK",
    "NET LINK     |  OFFLINE (EXPECTED)",
    "MOTD         |  LOADED",
    "",
    "SAFEHOUSE TERMINAL v6.4",
    "TYPE 'HELP' FOR AVAILABLE COMMANDS"
  ];
  let bi=0; (function step(){ if(bi<bootLines.length){ boot.textContent+=bootLines[bi++]+"\n"; setTimeout(step,150);} else { boot.hidden=true; screen.hidden=false; prompt.hidden=false; print("WELCOME TO THE SAFEHOUSE TERMINAL\nGuests: type 'help' for info, hours, map, contacts, staff."); input.focus(); } })();

  // ---------- Suggestion Y/N ----------
  function suggest(cmd){ print("No exact match. Did you mean:"); print("  "+cmd); print("Run it? [Y/n]"); pending = cmd; }

  // ---------- Guest ----------
  function denyGuest(){ warn("Staff-only. Type 'staff' to login."); }
  const guest = {
    help(){
      print("Available (guest):");
      const rows=[
        ["info","bar story + about"],
        ["hours","opening times"],
        ["map","ascii sector map"],
        ["contacts","phone / mail / IG"],
        ["staff","login to staff mode"],
        ["sudo please","polite shortcut to staff login"],
        ["term night|audio","toggle theme / audio"],
        ["clear","wipe the screen"]
      ];
      rows.forEach(r=>print("  "+r[0].padEnd(16)+" — "+r[1]));
    },
    info(){ banner("INFO"); print(FS["/home/guest/about.txt"]); },
    hours(){ banner("HOURS"); print("Tue–Sun 18:00–01:00\nMon closed\nLast call 00:30"); },
    map(){ banner("MAP"); print(FS["/home/guest/map.txt"]); },
    contacts(){ banner("CONTACTS"); print("Phone: +81 (0)11‑SAFE‑BAR\nMail: contact@safehouse.bar\nIG: @safehouse.bar"); },
    staff(){ startStaffLogin(); },
    sudo(sub){ if((sub||"").toLowerCase()==="please"){ startStaffLogin(true); } else warn("usage: sudo please"); },
    clear(){ screen.innerHTML=""; },
    term(sub,onoff){
      if(sub==="night"){ if(onoff==="on"){ document.documentElement.setAttribute('data-night','on'); ok('Night Ops ON'); } else if(onoff==="off"){ document.documentElement.setAttribute('data-night','off'); ok('Night Ops OFF'); } else warn("usage: term night on|off"); }
      else if(sub==="audio"){ ok("audio toggled"); }
      else warn("usage: term night on|off | term audio on|off");
    },
    // deny advanced
    ls: denyGuest, cd: denyGuest, pwd: denyGuest, cat: denyGuest, open: denyGuest, tree: denyGuest,
    logs: denyGuest, staff_logs: denyGuest, stop: denyGuest
  };

  function startStaffLogin(fromSudo){
    banner(fromSudo ? "SUDO PLEASE → STAFF LOGIN" : "STAFF LOGIN");
    ask("USER", user=> ask("ACCESS CODE", code=>{
      const valid=["admin","0000","1234","staff","letmein","password","safehouse","user","hack","bypass"];
      if(valid.indexOf((code||"").toLowerCase())===-1){
        tries++; err("access denied");
        if(tries>=3){ const lk=document.createElement('div'); lk.className='lockdown'; lk.textContent='** LOCKDOWN **'; screen.appendChild(lk); setTimeout(()=>lk.remove(),2000); }
        return;
      }
      staff=true; username=(user||"staff"); tries=0; greet(user); updatePS1();
      if(fromSudo) ok("politeness acknowledged. privileges elevated to STAFF+.");
      print("Type 'help' for internal commands.");
    }));
  }

  // ---------- Staff ----------
  function nowISO(){ return new Date().toISOString().replace('T',' ').split('.')[0]; }
  const staffCmd = {
    // 'staff' sub-commands while logged in
    staff(sub){
      if(!sub){ ok(`Already logged in as ${username||"staff"}. Try: staff logs | staff follow | staff logout`); return; }
      const s=sub.toLowerCase();
      if(s==="logs"||s==="show") this.staff_logs("show");
      else if(s==="follow") this.staff_logs("follow");
      else if(s==="logout"){ staff=false; username="guest"; cwd="/home/guest"; updatePS1(); ok("logged out"); }
      else warn("usage: staff logs | staff follow | staff logout");
    },
    help(){
      print("Available (STAFF+):");
      const rows=[
        ["ls [path]","list files/folders"],
        ["cd [path|..]","change directory"],
        ["pwd","print current path"],
        ["cat <file>","show file content"],
        ["open <file|dir>","open file or cd into dir"],
        ["tree [path]","show directory tree"],
        ["logs show|follow","guest logs; follow prints live (stop to end)"],
        ["staff_logs show|follow","internal staff logs"],
        ["stop","stop any follow/tail"],
        ["drinks list|show|random","menu helpers"],
        ["recipes [--json|random]","recipes or generator"],
        ["inventory","quick inventory view"],
        ["tail -f /dev/rad","radiation stream (simulated)"],
        ["lock set/unlock","3‑rotor lock mini‑game"],
        ["emerg pressurize|wirecut|morse","emergency toys"],
        ["reviews add|list","capture feedback"],
        ["safehousectl do-not-press","containment gag"],
        ["term night|audio","toggle theme / audio"],
        ["clear","wipe the screen"]
      ];
      rows.forEach(r=>print("  "+r[0].padEnd(26)+" — "+r[1]));
    },
    // FS basics
    ls(path){ const p=resolvePath(path||cwd); if(!isDir(p)) return err("not a directory"); FS[p].forEach(n=>print(n)); },
    cd(path){
      if(!path){ cwd="/home/guest"; updatePS1(); return; }
      if(path===".."||path==="back"){ const parts=cwd.split('/'); parts.pop(); cwd = parts.join('/') || "/"; updatePS1(); return; }
      const p=resolvePath(path); if(!isDir(p)) return suggest("cd /home"); cwd=p; updatePS1();
    },
    pwd(){ print(cwd); },
    cat(token){ if(!token) return warn("usage: cat <file>"); const r=resolveFile(token,false); if(r){ banner(r); print(FS[r]); } else { const s=fuzzy(token); if(s.length) suggest("cat "+s[0]); else err("no such file"); } },
    open(token){ if(!token) return warn("usage: open <file-or-folder>"); let p=resolvePath(token) || resolveCaseInsensitive(token); if(p && isDir(p)){ cwd=p; updatePS1(); ok("opened "+p); return; } const r=resolveFile(token,false); if(r){ banner(r); print(FS[r]); } else { const s=fuzzy(token); if(s.length){ const first=s[0]; if(isDir(first)) suggest("cd "+first); else suggest("cat "+first); } else err("nothing found"); } },
    tree(path){
      const start = resolvePath(path||"/"); if(!start) return err("no such path");
      const out=[]; function walk(p, pref=""){ if(isDir(p)){ out.push(pref + (p==='/'?'/':p.split('/').pop())); FS[p].forEach(name=>walk(norm(p+"/"+name), pref+"├─ ")); } else if(isFile(p)){ out.push(pref + p.split('/').pop()); } }
      walk(start, ""); banner("TREE " + start); print(out.join("\n"));
    },
    // Logs
    logs(sub){
      if(sub==="follow"){
        banner("LOGS (follow)"); if(running) clearInterval(running);
        const lines=[ "door/open     cycle ok","ambient       noise adjusted","guest         asked about portal (denied)","power         flicker; rerouted" ];
        running = setInterval(()=>{ print("["+nowISO()+"] "+lines[Math.floor(Math.random()*lines.length)]); }, 2500);
      } else { banner("LOGS"); print(FS["/var/log/guest.log"]); print("Use: logs follow  (Ctrl+C via 'stop')"); }
    },
    staff_logs(sub){
      if(sub==="follow"){
        banner("STAFF LOGS (follow)"); if(running) clearInterval(running);
        const samples=[
          "JN: Lights on, music low.","MK: Ice well topped. Cracked for martinis.",
          "Erik: Thyme bitters #3 strong; gentle dash.","Theo: Table 2 asked for portal. Water deployed.",
          "Andrea: Gold dust vial accounted for.","Ju: Brass lighter 'M.K.' stored in Locker B.",
          "Nicola: Pre-war martini longer stir confirmed.","Giuliano: Stairwell hum again. Nothing found.","Theo: Pins moved. Left the card."
        ];
        running = setInterval(()=>{ print("["+nowISO()+"] "+samples[Math.floor(Math.random()*samples.length)]); }, 4200);
      } else { banner("STAFF LOGS"); print(FS["/var/log/staff.log"]); }
    },
    stop(){ if(running){ clearInterval(running); running=null; ok("stopped"); } else warn("nothing running"); },
    // Drinks & recipes
    drinks(sub,arg){
      const list = FS["/etc/drinks.txt"].split("\n");
      if(sub==="list"||!sub){ banner("DRINKS"); print(list.join("\n")); }
      else if(sub==="show"){ const f=list.find(l=> (arg||"") && l.toLowerCase().startsWith(arg.toLowerCase())); if(f) ok(f); else err("not found"); }
      else if(sub==="random"){ ok("Random → " + list[Math.floor(Math.random()*list.length)]); }
      else warn("usage: drinks list|show <name>|random");
    },
    recipes(opt){
      if(opt==="--json"){ print(JSON.stringify({items: FS["/home/bar/recipes.md"]}, null, 2)); }
      else if(opt==="random"){
        const comps=["gin","rum","rye","mezcal","vermouth","orgeat","thyme bitters","pineapple bitters","citrus oils","cold brew"];
        const pick=()=>comps[Math.floor(Math.random()*comps.length)];
        ok(`EXPERIMENTAL: ${pick().toUpperCase()} + ${pick()} + ${pick()}`);
      } else { banner("RECIPES"); print(FS["/home/bar/recipes.md"]); }
    },
    inventory(){ banner("INVENTORY"); print(FS["/home/bar/inventory.txt"]); },
    // Rad
    tail(flag, path){
      if(flag!=="-f"||path!="/dev/rad") return warn("usage: tail -f /dev/rad");
      banner("RAD DEVICE (follow)"); if(running) clearInterval(running);
      running = setInterval(()=>{
        const r=(Math.random()*0.35+0.06).toFixed(2); const lv=parseFloat(r);
        const tag = lv>0.32 ? '<span class="warn">hazard</span>' : '<span class="muted">stable</span>';
        print(`[${new Date().toTimeString().slice(0,8)}] RAD ${r} — ${tag}`);
        if(lv>0.35) print("** SEEK SHELTER **","err");
      },1800);
    },
    // Lock & Emerg
    lock(sub, rotor, val){
      if(!this._lock){ this._lock={A:50,B:50,C:50
    ,
    // ---- Added interactive commands (desktop) ----
    rad(sub){
      if(sub==='start'){ if(running) clearInterval(running); ok('RAD start'); running=setInterval(()=>{ const r=(Math.random()*0.35+0.06).toFixed(2); print('[RAD] '+r+' µSv/h'); }, 600); }
      else if(sub==='stop'){ if(running){ clearInterval(running); running=null; ok('RAD stop'); } else warn('RAD not running'); }
      else if(sub==='reset'){ ok('Baseline reset'); }
      else if(sub==='spike'){ print('[RAD] '+(0.45+Math.random()*0.15).toFixed(2)+' µSv/h','warn'); }
      else warn('usage: rad start|stop|reset|spike');
    },
    lockdown(sub){
      if(sub==='set'){ print('** LOCKDOWN ACTIVE **','err'); }
      else if(sub==='clear'){ ok('Lockdown cleared'); }
      else warn('usage: lockdown set|clear');
    },
    vent(sub){
      if(sub==='start'){ ok('Ventilation: purifying...'); let p=0; const id=setInterval(()=>{ p+=10; print('Purifying '+p+'%'); if(p>=100){ clearInterval(id); ok('Air filtration engaged — contaminants <0.03%'); } }, 200); }
      else if(sub==='stop'){ ok('Ventilation stopped'); }
      else warn('usage: vent start|stop');
    },
    power(sub){
      if(!sub){ banner('POWER REROUTE'); print('[A]───┐      \n     ├─[C]──[D]\n[B]───┘      \n'); ok('Sequence OK — POWER STABLE'); }
      else warn('usage: power');
    }
}; }
      if(sub==="set"){
        if(!rotor||val===undefined) return warn("usage: lock set A|B|C <00-99>");
        const v=parseInt(val,10), target=this._lock[rotor.toUpperCase()], diff=Math.abs(v-target);
        if(diff===0){ ok(`rotor ${rotor.toUpperCase()} aligned`); }
        else if(diff<=5){ print(`rotor ${rotor.toUpperCase()}: <span class="ok">warm</span>`); }
        else print(`rotor ${rotor.toUpperCase()}: <span class="muted">cold</span>`);
      } else if(sub==="unlock"){
        const all=["A","B","C"].every(k=>this._lock[k]===50);
        if(all){ ok("unlocked → DRINKS extended"); } else err("not aligned");
      } else warn("usage: lock set A|B|C <00-99> | lock unlock");
    },
    emerg(act, param){
      if(act==="pressurize"){
        banner("PRESSURIZE"); let n=0;
        const iv=setInterval(()=>{ n=Math.min(100,n+7+Math.floor(Math.random()*6)); const bar="█".repeat(Math.floor(n/5)).padEnd(20,"░"); print(`[${bar}] ${n}%`); if(n>=100){ clearInterval(iv); ok("pressurized"); } },400);
      } else if(act==="wirecut"){
        const pick=(param||"").toLowerCase(); if(!pick) return warn("usage: emerg wirecut red|yellow|green");
        const correct=["red","yellow","green"][Math.floor(Math.random()*3)];
        if(pick===correct) ok("wirecut ok — room secure"); else warn("wrong wire — nothing happened");
      } else if(act==="morse"){
        const pattern=Array.from(arguments).slice(1).join(" "); if(pattern.replace(/\s+/g,'')==="...---...") ok("SOS received"); else warn("bad pattern — try: emerg morse ... --- ...");
      } else warn("usage: emerg pressurize | wirecut <color> | morse ... --- ...");
    },
    reviews(sub){
      if(sub==="add"){
        banner("REVIEW — end with 'EOF'");
        heredoc((text)=>{
          ok("Captured. Opening email…");
          window.location.href = `mailto:reviews@safehouse.bar?subject=${encodeURIComponent('Review — The Safehouse')}&body=${encodeURIComponent(text)}`;
        });
      } else if(sub==="list"){
        banner("REVIEWS"); print("No local reviews saved in staff mode.");
      } else warn("usage: reviews add|list");
    },
    "safehousectl"(sub){
      if(sub==="do-not-press"){ banner("!! CONTAINMENT !!"); print("** WARNING: BREACH DETECTED **","err"); print("{link cut} [##$##]"); }
      else warn("usage: safehousectl do-not-press");
    },
    term: guest.term,
    clear: guest.clear
  };

  // ---------- Input helpers ----------
  function resolveFile(token, publicOnly){
    token = aliasPath(token);
    let exact = resolvePath(token) || resolveCaseInsensitive(token);
    if(exact && isFile(exact) && (!publicOnly || !isSecret(exact))) return exact;
    const here=FS[cwd];
    if(Array.isArray(here)){
      const low=token.toLowerCase(); let cand=null;
      here.forEach(n=>{ const b=n.toLowerCase(); if(b===low || b.startsWith(low)) cand=norm(cwd+"/"+n); });
      if(cand && isFile(cand) && (!publicOnly || !isSecret(cand))) return cand;
    }
    return null;
  }
  function ask(label, cb){
    input.value=""; input.placeholder=label+": ";
    input.onkeydown=(e)=>{ if(e.key==="Enter"){ const v=input.value.trim(); print(label.toUpperCase()+": "+(label==="ACCESS CODE"?"******":(v||"guest"))); input.value=""; input.placeholder=""; input.onkeydown=keyHandler; cb(v); } }; input.focus();
  }
  function greet(user){
    const u=(user||"").toLowerCase();
    const msg={
      "erik":"Welcome back, Erik. You know where the bodies are buried. Keep it tidy.",
      "theo":"Hello Theo. If it hums, it works. If it sparks, log it.",
      "luporosso":"Welcome back, Luporosso. The night shift is yours, as always.",
      "andrea":"Andrea, your cocktail ratios are legendary. Don’t ruin it tonight.",
      "ju":"Ju, the vents are making that noise again. You know what to do.",
      "nicola":"Nicola, check the Geiger counter before serving Table 4.",
      "giuliano":"Giuliano, keep the music low and the lights dim. Just like we agreed."
    }[u] || "Access level elevated: STAFF+";
    ok(msg);
  }
  function route(raw){
    const parts=raw.trim().split(/\s+/); const cmd=parts[0]; const args=parts.slice(1);
    const reg = staff ? Object.assign({}, guest, staffCmd) : guest;
    if(reg[cmd]){ try{ reg[cmd].apply(reg, args); } catch(e){ err("command error"); } }
    else if(cmd==="clear"){ guest.clear(); }
    else err("command not found");
  }
  function heredoc(done){
    const buf=[]; print(">>> ","small"); input.dataset.mode="heredoc"; input.value=""; input.placeholder="type... end with EOF";
    input.onkeydown=(e)=>{ if(e.key==="Enter"){ const line=input.value; if(line==="EOF"){ input.dataset.mode=""; input.placeholder=""; input.onkeydown=keyHandler; done(buf.join("\n")); } else { buf.push(line); print(line); input.value=""; } } };
  }
  function keyHandler(e){
    if(e.key==="Enter"){
      const raw=input.value.trim(); if(!raw) return;
      if(pending){
        const ans = raw.toLowerCase();
        input.value="";
        if(ans==="" || ans==="y" || ans==="yes"){ const cmd=pending; pending=null; print(ps1.textContent+" "+cmd); route(cmd); return; }
        if(ans==="n" || ans==="no"){ pending=null; ok("cancelled"); return; }
      }
      if(input.dataset.mode==="heredoc"){ return; }
      history.push(raw); hIndex = history.length;
      print(ps1.textContent+" "+raw); input.value=""; route(raw);
    } else if(e.key==="ArrowUp"){
      if(history.length){ hIndex=Math.max(0,hIndex-1); input.value=history[hIndex]||""; setTimeout(()=>input.setSelectionRange(999,999)); }
    } else if(e.key==="ArrowDown"){
      if(history.length){ hIndex=Math.min(history.length,hIndex+1); input.value=history[hIndex]||""; setTimeout(()=>input.setSelectionRange(999,999)); }
    } else if(e.key==="c" && e.ctrlKey){
      if(running){ clearInterval(running); running=null; ok("^C"); }
    }
  }
  input.onkeydown=keyHandler;
  updatePS1();
}

function renderMobileUI(_, FS){
  const root=document.getElementById('mobile'); root.innerHTML='';
  const css=document.createElement('style'); css.textContent=`
    .mobile-shell{max-width:980px;margin:24px auto;padding:16px;border:1px solid rgba(227,183,107,.25);border-radius:14px;background:#07100c;box-shadow:0 18px 70px rgba(0,0,0,.6);color:var(--ph)}
    .m-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .m-brand{color:var(--dim);font-size:14px}
    .m-section{margin:10px 0}
    .m-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .m-card{border:1px solid rgba(175,255,209,.25);background:#09150f;border-radius:10px;padding:10px}
    .m-card h3{margin:0 0 6px 0;font-size:14px;color:#afffd1}
    .m-btn{display:inline-block;border:1px solid rgba(175,255,209,.25);padding:8px 10px;border-radius:10px;color:#afffd1;background:#0b1b0b}
    .m-list{border:1px solid rgba(175,255,209,.25);background:#09150f;border-radius:10px;overflow:hidden}
    .m-row{display:flex;gap:8px;align-items:center;padding:10px;border-bottom:1px solid rgba(175,255,209,.18)}
    .m-row:last-child{border-bottom:none}
    .m-breadcrumb{color:var(--dim);font-size:12px;margin-top:4px}
    .m-pre{white-space:pre-wrap;border:1px solid rgba(175,255,209,.25);background:#081408;border-radius:10px;padding:10px}
  `; document.head.appendChild(css);
  const shell=document.createElement('div'); shell.className='mobile-shell'; root.appendChild(shell);
  const header=document.createElement('div'); header.className='m-header'; shell.appendChild(header);
  const brand=document.createElement('div'); brand.className='m-brand'; brand.textContent='SAFEHOUSE-OS v6.4 — Mobile'; header.appendChild(brand);
  const staffBtn=document.createElement('button'); staffBtn.className='m-btn'; staffBtn.textContent='Staff'; header.appendChild(staffBtn);
  const main=document.createElement('div'); shell.appendChild(main);

  function card(title, on){ const c=document.createElement('div'); c.className='m-card'; const h=document.createElement('h3'); h.textContent=title; c.appendChild(h); const b=document.createElement('button'); b.className='m-btn'; b.textContent='OPEN'; b.onclick=on; c.appendChild(b); return c; }
  function guest(){ main.innerHTML=''; const grid=document.createElement('div'); grid.className='m-grid';
    grid.appendChild(card('About',()=>show(FS['/home/guest/about.txt'])));
    grid.appendChild(card('Hours',()=>show('Tue–Sun 18:00–01:00\nMon closed\nLast call 00:30')));
    grid.appendChild(card('Map',()=>show(FS['/home/guest/map.txt'])));
    grid.appendChild(card('Contacts',()=>show('Phone: +81 (0)11‑SAFE‑BAR\nMail: contact@safehouse.bar\nIG: @safehouse.bar')));
    grid.appendChild(card('Staff Login', ()=>login()));
    main.appendChild(grid);
  }
  function show(text){ main.innerHTML=''; const pre=document.createElement('pre'); pre.className='m-pre'; pre.textContent=text||'[no content]'; main.appendChild(pre); const back=document.createElement('button'); back.className='m-btn'; back.textContent='BACK'; back.onclick=guest; main.appendChild(back); }
  function login(){ main.innerHTML=''; const wrap=document.createElement('div'); wrap.className='m-card'; const u=document.createElement('input'); u.placeholder='USER'; u.className='m-btn'; u.style.width='100%'; u.style.background='#09150f'; const p=document.createElement('input'); p.placeholder='ACCESS CODE'; p.type='password'; p.className='m-btn'; p.style.width='100%'; p.style.background='#09150f'; const ok=document.createElement('button'); ok.className='m-btn'; ok.textContent='LOGIN'; const back=document.createElement('button'); back.className='m-btn'; back.textContent='CANCEL'; const info=document.createElement('div'); info.className='m-breadcrumb'; info.textContent='Codes: admin, 0000, 1234, staff, letmein, password, safehouse, user, hack, bypass'; wrap.appendChild(u); wrap.appendChild(document.createElement('div')).style.height='6px'; wrap.appendChild(p); wrap.appendChild(document.createElement('div')).style.height='8px'; const row=document.createElement('div'); row.appendChild(ok); row.appendChild(back); wrap.appendChild(row); wrap.appendChild(info); main.appendChild(wrap); back.onclick=guest; ok.onclick=()=>{ const code=(p.value||'').toLowerCase().trim(); const valid=['admin','0000','1234','staff','letmein','password','safehouse','user','hack','bypass']; if(!valid.includes(code)){ info.textContent='Access denied'; info.style.color='#ff9a5c'; return; } staffHome(u.value||'staff'); }; }
  function staffHome(user){ main.innerHTML=''; const bc=document.createElement('div'); bc.className='m-breadcrumb'; bc.textContent='Hello '+user+' — STAFF+'; main.appendChild(bc); const grid=document.createElement('div'); grid.className='m-grid'; grid.appendChild(card('Files', ()=>files('/'))); grid.appendChild(card('Logs', ()=>logs())); grid.appendChild(card('Radiation', ()=>geigerView())); grid.appendChild(card('Lockdown', ()=>lockdownView())); grid.appendChild(card('Ventilation', ()=>ventView())); grid.appendChild(card('Power', ()=>powerView())); grid.appendChild(card('Diagnostics', ()=>diag())); grid.appendChild(card('Pressurize', ()=>press())); main.appendChild(grid); const out=document.createElement('button'); out.className='m-btn'; out.textContent='LOGOUT'; out.onclick=guest; main.appendChild(out); }
  function isDir(p){ return Array.isArray(FS[p]); } function isFile(p){ return typeof FS[p]==='string'; } function norm(p){ p=p.replace(/\/+/g,'/'); if(p.length>1&&p.endsWith('/')) p=p.slice(0,-1); return p; }
  function files(start){ main.innerHTML=''; const title=document.createElement('h3'); title.textContent='Files'; main.appendChild(title); list(start||'/'); const back=document.createElement('button'); back.className='m-btn'; back.textContent='BACK'; back.onclick=()=>staffHome('staff'); main.appendChild(back); }
  function list(p){ const bc=document.createElement('div'); bc.className='m-breadcrumb'; bc.textContent='Path: '+p; main.appendChild(bc); const box=document.createElement('div'); box.className='m-list'; main.appendChild(box);
    if(p!=='/'){ const row=document.createElement('div'); row.className='m-row'; row.textContent='◀ ..'; row.onclick=()=>{ const parts=p.split('/'); parts.pop(); const up=parts.join('/')||'/'; main.innerHTML=''; files(up); }; box.appendChild(row); }
    (FS[p]||[]).forEach(name=>{ const full=norm((p==='/'?'':p)+'/'+name); const row=document.createElement('div'); row.className='m-row'; if(isDir(full)){ row.textContent='📁 '+name; row.onclick=()=>{ main.innerHTML=''; files(full); }; } else if(isFile(full)){ row.textContent='📄 '+name; row.onclick=()=>open(full); } box.appendChild(row); });
  }
  function open(path){ main.innerHTML=''; const pre=document.createElement('pre'); pre.className='m-pre'; pre.textContent=FS[path]||'[missing]'; main.appendChild(pre); const back=document.createElement('button'); back.className='m-btn'; back.textContent='BACK'; back.onclick=()=>{ const folder=path.substring(0,path.lastIndexOf('/'))||'/'; main.innerHTML=''; files(folder); }; main.appendChild(back); }
  function logs(){
    main.innerHTML='';
    let storeKey='mobile_staff_logs';
    let items=[]; try{ items=JSON.parse(localStorage.getItem(storeKey))||[]; }catch(e){ items=[]; }
    const box=document.createElement('div'); box.className='m-list'; box.style.maxHeight='50vh'; box.style.overflow='auto'; main.appendChild(box);
    const renderList=()=>{
      box.innerHTML='';
      if(items.length===0){
        const row=document.createElement('div'); row.className='m-row'; row.textContent='(no logs yet)'; box.appendChild(row);
      } else {
        items.slice(-300).forEach(({t,u,m})=>{
          const row=document.createElement('div'); row.className='m-row';
          const head=document.createElement('div'); head.className='m-flex';
          const name=document.createElement('span'); name.className='m-badge'; name.textContent=(u||'Staff');
          const time=document.createElement('span'); time.className='m-breadcrumb'; time.style.marginLeft='6px'; time.textContent=t;
          head.appendChild(name); head.appendChild(time);
          const msg=document.createElement('div'); msg.style.whiteSpace='pre-wrap'; msg.style.marginTop='4px'; msg.textContent=m;
          const col=document.createElement('div'); col.style.display='flex'; col.style.flexDirection='column';
          col.appendChild(head); col.appendChild(msg);
          row.appendChild(col); box.appendChild(row);
        });
        box.scrollTop=box.scrollHeight;
      }
    };
    renderList();
    const form=document.createElement('div'); form.className='m-flex'; form.style.marginTop='8px';
    const uIn=document.createElement('input'); uIn.placeholder='user'; uIn.className='m-btn'; uIn.style.flex='0.6'; uIn.style.background='#09150f';
    const mIn=document.createElement('input'); mIn.placeholder='message'; mIn.className='m-btn'; mIn.style.flex='1'; mIn.style.background='#09150f';
    const send=document.createElement('button'); send.className='m-btn'; send.textContent='SEND';
    form.appendChild(uIn); form.appendChild(mIn); form.appendChild(send); main.appendChild(form);
    function nowISO(){ return new Date().toISOString().replace('T',' ').split('.')[0]; }
    send.addEventListener('click',()=>{
      const u=(uIn.value||'Staff').trim();
      const m=(mIn.value||'').trim();
      if(!m) return;
      items.push({t:nowISO(),u,m}); try{ localStorage.setItem(storeKey, JSON.stringify(items)); }catch(e){}
      mIn.value=''; renderList();
    });
    const back=document.createElement('button'); back.className='m-btn'; back.textContent='BACK';
    back.addEventListener('click',()=>renderStaff('staff'));
    main.appendChild(back);

}

  // ===== Mobile interactive actions =====
  function geigerView(){
    main.innerHTML='';
    const wrap=document.createElement('div'); wrap.className='m-card'; main.appendChild(wrap);
    const val=document.createElement('div'); val.style.fontSize='20px'; val.style.marginBottom='6px'; wrap.appendChild(val);
    const bar=document.createElement('div'); bar.className='m-list'; bar.style.height='10px'; bar.style.padding='0'; wrap.appendChild(bar);
    const fill=document.createElement('div'); fill.style.height='10px'; fill.style.width='0%'; fill.style.background='#7fffb2'; bar.appendChild(fill);
    const controls=document.createElement('div'); controls.className='m-flex'; controls.style.marginTop='8px'; wrap.appendChild(controls);
    const startB=btn('Start'), stopB=btn('Stop'), resetB=btn('Reset baseline'), spikeB=btn('Spike test');
    controls.appendChild(startB); controls.appendChild(stopB); controls.appendChild(resetB); controls.appendChild(spikeB);
    const back=document.createElement('button'); back.className='m-btn'; back.textContent='BACK'; back.addEventListener('click',()=>renderStaff('staff')); main.appendChild(back);
    let running=null, x=0.12, baseline=0.12;
    function color(v){ return v>0.35?'#ff5c5c':(v>=0.20?'#ff9a5c':'#7fffb2'); }
    function tick(){
      const drift=(Math.random()-0.5)*0.02;
      x = Math.max(0.04, x + drift);
      x = x*0.85 + baseline*0.15; // ease to baseline
      update(x);
    }
    function update(v){
      val.textContent=v.toFixed(2)+' µSv/h';
      fill.style.width=Math.min(100,(v/0.5)*100)+'%';
      fill.style.background=color(v);
      if(v>0.35){
        if(!document.getElementById('radalert')){
          const al=document.createElement('div'); al.id='radalert'; al.className='m-breadcrumb'; al.style.color='#ff5c5c'; al.textContent='SEEK SHELTER'; main.insertBefore(al, wrap);
        }
      } else {
        const al=document.getElementById('radalert'); if(al) al.remove();
      }
    }
    function btn(t){ const b=document.createElement('button'); b.className='m-btn'; b.textContent=t; return b; }
    startB.addEventListener('click',()=>{ if(running) return; running=setInterval(tick,150); });
    stopB.addEventListener('click',()=>{ if(running){ clearInterval(running); running=null; } });
    resetB.addEventListener('click',()=>{ baseline = x; });
    spikeB.addEventListener('click',()=>{ x = 0.45 + Math.random()*0.15; update(x); });
    update(x);
  }

  function lockdownView(){
    main.innerHTML='';
    const card=document.createElement('div'); card.className='m-card'; main.appendChild(card);
    const h=document.createElement('h3'); h.textContent='Lockdown Control'; card.appendChild(h);
    const pre=document.createElement('pre'); pre.className='m-pre'; pre.textContent='Ready.'; main.appendChild(pre);
    const go=document.createElement('button'); go.className='m-btn m-danger'; go.textContent='ENGAGE LOCKDOWN'; main.appendChild(go);
    const clear=document.createElement('button'); clear.className='m-btn'; clear.textContent='CLEAR'; main.appendChild(clear);
    const back=document.createElement('button'); back.className='m-btn'; back.textContent='BACK'; back.addEventListener('click',()=>renderStaff('staff')); main.appendChild(back);
    let active=false, t=10, timer=null;
    go.addEventListener('click',()=>{
      if(active) return; active=true; t=10; pre.textContent='Lockdown in: '+t; timer=setInterval(()=>{ t--; pre.textContent='Lockdown in: '+t; if(t<=0){ clearInterval(timer); pre.textContent='** LOCKDOWN ACTIVE **'; } },1000);
    });
    clear.addEventListener('click',()=>{ active=false; if(timer){ clearInterval(timer); timer=null; } pre.textContent='Lockdown cleared.'; });
  }

  function ventView(){
    main.innerHTML='';
    const card=document.createElement('div'); card.className='m-card'; main.appendChild(card);
    const h=document.createElement('h3'); h.textContent='Ventilation Override'; card.appendChild(h);
    const pre=document.createElement('pre'); pre.className='m-pre'; pre.textContent='Filters idle.'; main.appendChild(pre);
    const run=document.createElement('button'); run.className='m-btn'; run.textContent='START'; main.appendChild(run);
    const stop=document.createElement('button'); stop.className='m-btn'; stop.textContent='STOP'; main.appendChild(stop);
    const back=document.createElement('button'); back.className='m-btn'; back.textContent='BACK'; back.addEventListener('click',()=>renderStaff('staff')); main.appendChild(back);
    let id=null, p=0;
    run.addEventListener('click',()=>{ if(id) return; p=0; pre.textContent='Purifying...'; id=setInterval(()=>{ p=Math.min(100,p+5); pre.textContent='Purifying... '+p+'%'; if(p>=100){ clearInterval(id); id=null; pre.textContent='Air filtration engaged — contaminants <0.03%'; } },200); });
    stop.addEventListener('click',()=>{ if(id){ clearInterval(id); id=null; pre.textContent='Stopped.'; } });
  }

  function powerView(){
    main.innerHTML='';
    const card=document.createElement('div'); card.className='m-card'; main.appendChild(card);
    const h=document.createElement('h3'); h.textContent='Power Reroute'; card.appendChild(h);
    const pre=document.createElement('pre'); pre.className='m-pre'; pre.textContent='Connect nodes to reroute power.'; main.appendChild(pre);
    const run=document.createElement('button'); run.className='m-btn'; run.textContent='START'; main.appendChild(run);
    const back=document.createElement('button'); back.className='m-btn'; back.textContent='BACK'; back.addEventListener('click',()=>renderStaff('staff')); main.appendChild(back);
    run.addEventListener('click',()=>{
      pre.textContent='[A]───┐      
     ├─[C]──[D]
[B]───┘      

Tap sequence: A B C D';
      setTimeout(()=>{ pre.textContent+='\nOK — POWER STABLE'; }, 2000);
    });
  }
