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
    { code: "tlh", label: " ", statusLabel: " " }
  ];

  const appState = {
    phase: "boot",
    language: ""
  };

  const I18N = {
    en: {
      "app.hours.label": "hours",
      "app.hours.title": "Service Hours",
      "app.location.label": "location",
      "app.location.title": "Location",
      "app.menu.label": "menu",
      "app.menu.title": "Bar Menu",
      "app.events.label": "events",
      "app.events.title": "Events",
      "app.contacts.label": "contacts",
      "app.contacts.title": "Contacts",
      "app.public-files.label": "public files",
      "app.public-files.title": "Public Files",
      "app.trash.label": "trash",
      "app.trash.title": "Recycle Bin",
      "app.filesystem.label": "system files",
      "app.filesystem.title": "File System",
      "app.lore.label": "archive",
      "app.lore.title": "Internal Archive",
      "app.decryptor.label": "file repair",
      "app.decryptor.title": "REC-77 File Repair Utility",
      "app.terminal.label": "terminal",
      "app.terminal.title": "Legacy Terminal",
      "language.subtitle": "GUEST TERMINAL // POWERED BY SOFTCO",
      "language.hint": "Select interface language:",
      "role.guest": "guest-session",
      "role.staff": "staff-session",
      "role.founder": "founder-session",
      "mobile.brand.sub": "COCKTAIL BAR // POST-SURFACE DISTRICT",
      "mobile.brand.now": "Now Serving: Masaya Highball",
      "mobile.quick": "Quick Access",
      "mobile.section.public": "Guest Access",
      "mobile.section.system": "System Access",
      "mobile.back": "back",
      "mobile.dock": "tap icon // swipe panel down to close",
      "auth.title.staff": "Restricted Records",
      "auth.title.founder": "Supplemental Clearance",
      "auth.close": "close",
      "auth.heading.staff": "Operator credentials required for this partition.",
      "auth.heading.founder": "Supplemental clearance required.",
      "auth.status.waiting": "status: waiting",
      "auth.status.granted": "status: operator granted",
      "auth.status.denied": "status: denied",
      "auth.status.prior": "status: prior clearance required",
      "auth.status.clearance": "status: clearance granted",
      "auth.operatorId": "Operator ID",
      "auth.accessKey": "Access Key",
      "auth.legacyAuthorization": "Legacy Authorization",
      "auth.authenticate": "authenticate",
      "auth.reauthenticate": "re-authenticate",
      "auth.authorize": "authorize",
      "auth.recovered": "Recovered REC-77 credentials:",
      "fs.home": "home",
      "fs.up": "up",
      "fs.refresh": "refresh",
      "fs.restricted": "restricted path: {path}\n\nOperator credentials required to access this partition.",
      "fs.accessRestricted": "access restricted",
      "fs.credentialsRequired": "credentials required",
      "fs.invalidPath": "invalid path",
      "fs.notDirectory": "not a directory",
      "fs.entries": "{count} entries",
      "fs.dragHint": " // drag file card into File Repair",
      "fs.openedNewWindow": "opened in new window",
      "fs.selectToOpen": "Select a file to open it in a new window.",
      "fs.mobileGuide": "Tap folders to enter. Tap files to preview.",
      "fs.directoryIntro": "directory: {path}\n\n{listing}\n\nOpen folders to enter. Open files to read. Locked entries require auth.",
      "fs.emptyOrRestricted": "(empty or restricted)",
      "fs.locked": "[LOCK] {name}",
      "fs.dir": "[DIR] {name}",
      "fs.file": "[FILE] {name}",
      "fs.dirLabel": "folder: {name}",
      "fs.fileLabel": "file: {name}",
      "fs.restrictedDirLabel": "restricted folder: {name}",
      "fs.restrictedFileLabel": "restricted file: {name}",
      "fs.secureArchiveLocked": "SECURE ARCHIVE LOCKED\n\nOperator credentials required to access secure records.",
      "location.transit": "Transit:\nKyoto-kawaramachi station west side, Gion-shijo station east side.",
      "trash.body": "RECYCLE BIN\n\nNo deleted files.\n\nTip: Use this space for future discarded logs and transient notes.",
      "decrypt.loadFromFs": "load from file system",
      "decrypt.blockMap": "BLOCK MAP",
      "decrypt.parity": "PARITY",
      "decrypt.signalGain": "SIGNAL GAIN",
      "decrypt.runRepair": "run repair",
      "decrypt.resetTuning": "reset tuning",
      "decrypt.noSignal": "no valid file signal detected",
      "decrypt.notFile": "selected entry is not a file",
      "decrypt.stable": "integrity stable // selected file does not require repair",
      "decrypt.awaitingCandidate": "awaiting candidate",
      "decrypt.browserOpened": "file browser opened // awaiting candidate",
      "decrypt.selectedNone": "selected: (none)",
      "decrypt.selected": "selected: {path}",
      "decrypt.idle": "idle // no active repair candidate",
      "decrypt.dropAwaiting": "DROP FILE HERE\n\nAwaiting candidate input.",
      "decrypt.busStandby": "REPAIR BUS // standby",
      "decrypt.loadedCandidate": "Loaded candidate: {path}",
      "decrypt.completed": "repair completed // integrity 100% // restored record readable",
      "decrypt.integrity": "integrity {integrity}% // mismatch {mismatch} // attempts {attempts}",
      "terminal.welcome": "Legacy terminal online. Type 'man' for available commands.",
      "terminal.prompt.help": "Use real Unix-style commands against the Safehouse file system.",
      "terminal.cmdNotFound": "{cmd}: command not found",
      "terminal.noSuchFile": "{cmd}: {path}: No such file or directory",
      "terminal.notDir": "{cmd}: {path}: Not a directory",
      "terminal.isDir": "{cmd}: {path}: Is a directory",
      "terminal.permissionDenied": "{cmd}: {path}: Permission denied",
      "terminal.missingOperand": "{cmd}: missing operand",
      "terminal.fileUnavailable": "file unavailable",
      "terminal.dirOpened": "opened file system",
      "terminal.fileOpened": "opened document",
      "terminal.appOpened": "opened app: {name}",
      "terminal.authCancelled": "authentication cancelled",
      "terminal.staffIdPrompt": "Operator ID:",
      "terminal.staffKeyPrompt": "Access Key:",
      "terminal.founderPrompt": "Legacy Authorization:",
      "terminal.authGranted": "operator session granted",
      "terminal.founderGranted": "supplemental clearance granted",
      "terminal.authDenied": "authentication failed",
      "terminal.logout": "session returned to guest",
      "terminal.invalidRegex": "grep: invalid regular expression",
      "terminal.availableCommands": "Available commands:\ncat cd clear date echo file find grep head id less ls man open openapp pwd stat su tail tree uname wc whoami",
      "terminal.usage.open": "usage: open <app-id|path>",
      "terminal.usage.su": "usage: su <staff|founder>",
      "terminal.usage.cd": "usage: cd <path>",
      "terminal.usage.cat": "usage: cat <path> [...]",
      "terminal.usage.head": "usage: head [-n lines] <path>",
      "terminal.usage.tail": "usage: tail [-n lines] <path>",
      "terminal.usage.grep": "usage: grep [-n] [-r] <pattern> <path> [...]",
      "terminal.usage.find": "usage: find <path> [-name pattern]",
      "terminal.usage.stat": "usage: stat <path> [...]",
      "terminal.usage.file": "usage: file <path> [...]",
      "terminal.usage.wc": "usage: wc <path> [...]",
      "terminal.usage.openapp": "usage: openapp <app-id>",
      "terminal.session.guest": "guest",
      "terminal.session.staff": "staff",
      "terminal.session.founder": "founder",
      "menu.file": "file",
      "menu.edit": "edit",
      "menu.view": "view",
      "menu.tools": "tools",
      "menu.reopen": "Reopen startup windows",
      "menu.minimizeAll": "Minimize all windows",
      "menu.resetIcons": "Reset icon positions",
      "menu.showHidden": "Show hidden apps",
      "menu.hideHidden": "Hide hidden apps",
      "menu.openRepair": "Open file repair",
      "menu.openTerminal": "Open terminal",
      "menu.openTrash": "Open recycle bin",
      "status.net": "SAFEHOUSE NET",
      "document.title": "Document // {name}",
      "document.dock": "DOC {name}",
      "document.drag": "Drag this file path into File Repair",
      "app.empty": "No content available."
    },
    it: {
      "app.hours.label": "orari",
      "app.hours.title": "Orari di Servizio",
      "app.location.label": "posizione",
      "app.location.title": "Posizione",
      "app.menu.label": "menu",
      "app.menu.title": "Menu Bar",
      "app.events.label": "eventi",
      "app.events.title": "Eventi",
      "app.contacts.label": "contatti",
      "app.contacts.title": "Contatti",
      "app.public-files.label": "file pubblici",
      "app.public-files.title": "File Pubblici",
      "app.trash.label": "cestino",
      "app.trash.title": "Cestino",
      "app.filesystem.label": "file di sistema",
      "app.filesystem.title": "File System",
      "app.lore.label": "archivio",
      "app.lore.title": "Archivio Interno",
      "app.decryptor.label": "ripara file",
      "app.decryptor.title": "Utilità di Riparazione File REC-77",
      "app.terminal.label": "terminale",
      "app.terminal.title": "Terminale Legacy",
      "language.subtitle": "TERMINALE OSPITI // POWERED BY SOFTCO",
      "language.hint": "Seleziona la lingua dell'interfaccia:",
      "role.guest": "sessione-ospite",
      "role.staff": "sessione-staff",
      "role.founder": "sessione-fondatore",
      "mobile.brand.sub": "COCKTAIL BAR // DISTRETTO POST-SUPERFICIE",
      "mobile.brand.now": "Ora in servizio: Masaya Highball",
      "mobile.quick": "Accesso Rapido",
      "mobile.section.public": "Accesso Ospiti",
      "mobile.section.system": "Accesso Sistema",
      "mobile.back": "indietro",
      "mobile.dock": "tocca un'icona // scorri in basso per chiudere",
      "auth.title.staff": "Archivi Riservati",
      "auth.title.founder": "Autorizzazione Supplementare",
      "auth.close": "chiudi",
      "auth.heading.staff": "Credenziali operatore richieste per questa partizione.",
      "auth.heading.founder": "Autorizzazione supplementare richiesta.",
      "auth.status.waiting": "stato: in attesa",
      "auth.status.granted": "stato: operatore autorizzato",
      "auth.status.denied": "stato: negato",
      "auth.status.prior": "stato: autorizzazione precedente richiesta",
      "auth.status.clearance": "stato: autorizzazione concessa",
      "auth.operatorId": "ID Operatore",
      "auth.accessKey": "Chiave di Accesso",
      "auth.legacyAuthorization": "Autorizzazione Legacy",
      "auth.authenticate": "autentica",
      "auth.reauthenticate": "ri-autentica",
      "auth.authorize": "autorizza",
      "auth.recovered": "Credenziali REC-77 recuperate:",
      "fs.home": "home",
      "fs.up": "su",
      "fs.refresh": "aggiorna",
      "fs.restricted": "percorso riservato: {path}\n\nCredenziali operatore richieste per accedere a questa partizione.",
      "fs.accessRestricted": "accesso riservato",
      "fs.credentialsRequired": "credenziali richieste",
      "fs.invalidPath": "percorso non valido",
      "fs.notDirectory": "non è una directory",
      "fs.entries": "{count} elementi",
      "fs.dragHint": " // trascina una scheda file in Ripara File",
      "fs.openedNewWindow": "aperto in una nuova finestra",
      "fs.selectToOpen": "Seleziona un file per aprirlo in una nuova finestra.",
      "fs.mobileGuide": "Tocca le cartelle per entrare. Tocca i file per l'anteprima.",
      "fs.directoryIntro": "directory: {path}\n\n{listing}\n\nApri le cartelle per entrare. Apri i file per leggere. Le voci bloccate richiedono autenticazione.",
      "fs.emptyOrRestricted": "(vuoto o riservato)",
      "fs.locked": "[BLOCCATO] {name}",
      "fs.dir": "[DIR] {name}",
      "fs.file": "[FILE] {name}",
      "fs.dirLabel": "cartella: {name}",
      "fs.fileLabel": "file: {name}",
      "fs.restrictedDirLabel": "cartella riservata: {name}",
      "fs.restrictedFileLabel": "file riservato: {name}",
      "fs.secureArchiveLocked": "ARCHIVIO RISERVATO BLOCCATO\n\nCredenziali operatore richieste per accedere ai record protetti.",
      "location.transit": "Trasporti:\nStazione Kyoto-kawaramachi lato ovest, stazione Gion-shijo lato est.",
      "trash.body": "CESTINO\n\nNessun file eliminato.\n\nSuggerimento: usa questo spazio per futuri log scartati e note transitorie.",
      "decrypt.loadFromFs": "carica dal file system",
      "decrypt.blockMap": "MAPPA BLOCCHI",
      "decrypt.parity": "PARITÀ",
      "decrypt.signalGain": "GUADAGNO SEGNALE",
      "decrypt.runRepair": "esegui riparazione",
      "decrypt.resetTuning": "resetta sintonia",
      "decrypt.noSignal": "nessun segnale file valido rilevato",
      "decrypt.notFile": "la voce selezionata non è un file",
      "decrypt.stable": "integrità stabile // il file selezionato non richiede riparazione",
      "decrypt.awaitingCandidate": "in attesa del candidato",
      "decrypt.browserOpened": "browser file aperto // in attesa del candidato",
      "decrypt.selectedNone": "selezionato: (nessuno)",
      "decrypt.selected": "selezionato: {path}",
      "decrypt.idle": "idle // nessun candidato di riparazione attivo",
      "decrypt.dropAwaiting": "TRASCINA QUI IL FILE\n\nIn attesa di input candidato.",
      "decrypt.busStandby": "BUS RIPARAZIONE // standby",
      "decrypt.loadedCandidate": "Candidato caricato: {path}",
      "decrypt.completed": "riparazione completata // integrità 100% // record ripristinato leggibile",
      "decrypt.integrity": "integrità {integrity}% // mismatch {mismatch} // tentativi {attempts}",
      "terminal.welcome": "Terminale legacy online. Digita 'man' per i comandi disponibili.",
      "terminal.prompt.help": "Usa veri comandi stile Unix sul file system Safehouse.",
      "terminal.cmdNotFound": "{cmd}: comando non trovato",
      "terminal.noSuchFile": "{cmd}: {path}: file o directory non esistente",
      "terminal.notDir": "{cmd}: {path}: non è una directory",
      "terminal.isDir": "{cmd}: {path}: è una directory",
      "terminal.permissionDenied": "{cmd}: {path}: permesso negato",
      "terminal.missingOperand": "{cmd}: operando mancante",
      "terminal.fileUnavailable": "file non disponibile",
      "terminal.dirOpened": "file system aperto",
      "terminal.fileOpened": "documento aperto",
      "terminal.appOpened": "app aperta: {name}",
      "terminal.authCancelled": "autenticazione annullata",
      "terminal.staffIdPrompt": "ID Operatore:",
      "terminal.staffKeyPrompt": "Chiave di Accesso:",
      "terminal.founderPrompt": "Autorizzazione Legacy:",
      "terminal.authGranted": "sessione operatore concessa",
      "terminal.founderGranted": "autorizzazione supplementare concessa",
      "terminal.authDenied": "autenticazione fallita",
      "terminal.logout": "sessione tornata ospite",
      "terminal.invalidRegex": "grep: espressione regolare non valida",
      "terminal.availableCommands": "Comandi disponibili:\ncat cd clear date echo file find grep head id less ls man open openapp pwd stat su tail tree uname wc whoami",
      "terminal.usage.open": "uso: open <app-id|path>",
      "terminal.usage.su": "uso: su <staff|founder>",
      "terminal.usage.cd": "uso: cd <path>",
      "terminal.usage.cat": "uso: cat <path> [...]",
      "terminal.usage.head": "uso: head [-n righe] <path>",
      "terminal.usage.tail": "uso: tail [-n righe] <path>",
      "terminal.usage.grep": "uso: grep [-n] [-r] <pattern> <path> [...]",
      "terminal.usage.find": "uso: find <path> [-name pattern]",
      "terminal.usage.stat": "uso: stat <path> [...]",
      "terminal.usage.file": "uso: file <path> [...]",
      "terminal.usage.wc": "uso: wc <path> [...]",
      "terminal.usage.openapp": "uso: openapp <app-id>",
      "terminal.session.guest": "ospite",
      "terminal.session.staff": "staff",
      "terminal.session.founder": "fondatore",
      "menu.file": "file",
      "menu.edit": "modifica",
      "menu.view": "vista",
      "menu.tools": "strumenti",
      "menu.reopen": "Riapri finestre iniziali",
      "menu.minimizeAll": "Riduci tutte le finestre",
      "menu.resetIcons": "Reimposta posizione icone",
      "menu.showHidden": "Mostra app nascoste",
      "menu.hideHidden": "Nascondi app nascoste",
      "menu.openRepair": "Apri ripara file",
      "menu.openTerminal": "Apri terminale",
      "menu.openTrash": "Apri cestino",
      "status.net": "RETE SAFEHOUSE",
      "document.title": "Documento // {name}",
      "document.dock": "DOC {name}",
      "document.drag": "Trascina questo percorso file in Ripara File",
      "app.empty": "Nessun contenuto disponibile."
    },
    ja: {
      "app.hours.label": "営業時間",
      "app.hours.title": "営業時間",
      "app.location.label": "所在地",
      "app.location.title": "所在地",
      "app.menu.label": "メニュー",
      "app.menu.title": "バーメニュー",
      "app.events.label": "イベント",
      "app.events.title": "イベント",
      "app.contacts.label": "連絡先",
      "app.contacts.title": "連絡先",
      "app.public-files.label": "公開ファイル",
      "app.public-files.title": "公開ファイル",
      "app.trash.label": "ゴミ箱",
      "app.trash.title": "ゴミ箱",
      "app.filesystem.label": "システムファイル",
      "app.filesystem.title": "ファイルシステム",
      "app.lore.label": "アーカイブ",
      "app.lore.title": "内部アーカイブ",
      "app.decryptor.label": "ファイル修復",
      "app.decryptor.title": "REC-77 ファイル修復ユーティリティ",
      "app.terminal.label": "ターミナル",
      "app.terminal.title": "レガシーターミナル",
      "language.subtitle": "ゲストターミナル // SOFTCO 提供",
      "language.hint": "インターフェース言語を選択:",
      "role.guest": "ゲストセッション",
      "role.staff": "スタッフセッション",
      "role.founder": "創設者セッション",
      "mobile.brand.sub": "カクテルバー // 地上後地区",
      "mobile.brand.now": "現在提供中: Masaya Highball",
      "mobile.quick": "クイックアクセス",
      "mobile.section.public": "ゲストアクセス",
      "mobile.section.system": "システムアクセス",
      "mobile.back": "戻る",
      "mobile.dock": "アイコンをタップ // 下へスワイプして閉じる",
      "auth.title.staff": "制限記録",
      "auth.title.founder": "追加認可",
      "auth.close": "閉じる",
      "auth.heading.staff": "この区画に入るにはオペレーター資格情報が必要です。",
      "auth.heading.founder": "追加認可が必要です。",
      "auth.status.waiting": "状態: 待機中",
      "auth.status.granted": "状態: オペレーター承認済み",
      "auth.status.denied": "状態: 拒否",
      "auth.status.prior": "状態: 先行認可が必要",
      "auth.status.clearance": "状態: 認可完了",
      "auth.operatorId": "オペレーターID",
      "auth.accessKey": "アクセスキー",
      "auth.legacyAuthorization": "レガシー認可",
      "auth.authenticate": "認証",
      "auth.reauthenticate": "再認証",
      "auth.authorize": "許可",
      "auth.recovered": "回復した REC-77 資格情報:",
      "fs.home": "ホーム",
      "fs.up": "上へ",
      "fs.refresh": "更新",
      "fs.restricted": "制限パス: {path}\n\nこの区画にアクセスするにはオペレーター資格情報が必要です。",
      "fs.accessRestricted": "アクセス制限",
      "fs.credentialsRequired": "資格情報が必要",
      "fs.invalidPath": "無効なパス",
      "fs.notDirectory": "ディレクトリではありません",
      "fs.entries": "{count} 件",
      "fs.dragHint": " // ファイルカードを File Repair へドラッグ",
      "fs.openedNewWindow": "新しいウィンドウで開きました",
      "fs.selectToOpen": "ファイルを選択すると新しいウィンドウで開きます。",
      "fs.mobileGuide": "フォルダをタップして移動し、ファイルをタップしてプレビューします。",
      "fs.directoryIntro": "ディレクトリ: {path}\n\n{listing}\n\nフォルダを開いて移動します。ファイルを開いて読みます。ロックされた項目には認証が必要です。",
      "fs.emptyOrRestricted": "(空、または制限中)",
      "fs.locked": "[LOCK] {name}",
      "fs.dir": "[DIR] {name}",
      "fs.file": "[FILE] {name}",
      "fs.dirLabel": "フォルダ: {name}",
      "fs.fileLabel": "ファイル: {name}",
      "fs.restrictedDirLabel": "制限フォルダ: {name}",
      "fs.restrictedFileLabel": "制限ファイル: {name}",
      "fs.secureArchiveLocked": "セキュアアーカイブ ロック中\n\n保護記録に入るにはオペレーター資格情報が必要です。",
      "location.transit": "交通:\n京都河原町駅 西側、祇園四条駅 東側。",
      "trash.body": "ゴミ箱\n\n削除済みファイルはありません。\n\nヒント: 将来の破棄ログや一時メモ用に使えます。",
      "decrypt.loadFromFs": "ファイルシステムから読み込む",
      "decrypt.blockMap": "ブロックマップ",
      "decrypt.parity": "パリティ",
      "decrypt.signalGain": "信号ゲイン",
      "decrypt.runRepair": "修復実行",
      "decrypt.resetTuning": "調整リセット",
      "decrypt.noSignal": "有効なファイル信号が検出されませんでした",
      "decrypt.notFile": "選択した項目はファイルではありません",
      "decrypt.stable": "整合性は安定 // 選択ファイルは修復不要です",
      "decrypt.awaitingCandidate": "候補待機中",
      "decrypt.browserOpened": "ファイルブラウザを開きました // 候補待機中",
      "decrypt.selectedNone": "選択: (なし)",
      "decrypt.selected": "選択: {path}",
      "decrypt.idle": "待機 // 有効な修復候補なし",
      "decrypt.dropAwaiting": "ここにファイルをドロップ\n\n候補入力を待機しています。",
      "decrypt.busStandby": "修復バス // standby",
      "decrypt.loadedCandidate": "読み込み済み候補: {path}",
      "decrypt.completed": "修復完了 // 整合性 100% // 記録を読み取り可能に復元",
      "decrypt.integrity": "整合性 {integrity}% // ミスマッチ {mismatch} // 試行 {attempts}",
      "terminal.welcome": "レガシーターミナル接続済み。利用可能コマンドは 'man' を入力してください。",
      "terminal.prompt.help": "Safehouse のファイルシステムに対して実際の Unix 風コマンドを使えます。",
      "terminal.cmdNotFound": "{cmd}: コマンドが見つかりません",
      "terminal.noSuchFile": "{cmd}: {path}: そのようなファイルまたはディレクトリはありません",
      "terminal.notDir": "{cmd}: {path}: ディレクトリではありません",
      "terminal.isDir": "{cmd}: {path}: ディレクトリです",
      "terminal.permissionDenied": "{cmd}: {path}: 許可がありません",
      "terminal.missingOperand": "{cmd}: オペランドがありません",
      "terminal.fileUnavailable": "ファイルを利用できません",
      "terminal.dirOpened": "ファイルシステムを開きました",
      "terminal.fileOpened": "ドキュメントを開きました",
      "terminal.appOpened": "アプリを開きました: {name}",
      "terminal.authCancelled": "認証を中止しました",
      "terminal.staffIdPrompt": "オペレーターID:",
      "terminal.staffKeyPrompt": "アクセスキー:",
      "terminal.founderPrompt": "レガシー認可:",
      "terminal.authGranted": "オペレーターセッション承認",
      "terminal.founderGranted": "追加認可完了",
      "terminal.authDenied": "認証失敗",
      "terminal.logout": "セッションをゲストへ戻しました",
      "terminal.invalidRegex": "grep: 無効な正規表現です",
      "terminal.availableCommands": "利用可能コマンド:\ncat cd clear date echo file find grep head id less ls man open openapp pwd stat su tail tree uname wc whoami",
      "terminal.usage.open": "usage: open <app-id|path>",
      "terminal.usage.su": "usage: su <staff|founder>",
      "terminal.usage.cd": "usage: cd <path>",
      "terminal.usage.cat": "usage: cat <path> [...]",
      "terminal.usage.head": "usage: head [-n lines] <path>",
      "terminal.usage.tail": "usage: tail [-n lines] <path>",
      "terminal.usage.grep": "usage: grep [-n] [-r] <pattern> <path> [...]",
      "terminal.usage.find": "usage: find <path> [-name pattern]",
      "terminal.usage.stat": "usage: stat <path> [...]",
      "terminal.usage.file": "usage: file <path> [...]",
      "terminal.usage.wc": "usage: wc <path> [...]",
      "terminal.usage.openapp": "usage: openapp <app-id>",
      "terminal.session.guest": "guest",
      "terminal.session.staff": "staff",
      "terminal.session.founder": "founder",
      "menu.file": "ファイル",
      "menu.edit": "編集",
      "menu.view": "表示",
      "menu.tools": "ツール",
      "menu.reopen": "起動ウィンドウを再表示",
      "menu.minimizeAll": "すべてのウィンドウを最小化",
      "menu.resetIcons": "アイコン位置をリセット",
      "menu.showHidden": "隠しアプリを表示",
      "menu.hideHidden": "隠しアプリを隠す",
      "menu.openRepair": "ファイル修復を開く",
      "menu.openTerminal": "ターミナルを開く",
      "menu.openTrash": "ゴミ箱を開く",
      "status.net": "SAFEHOUSE NET",
      "document.title": "ドキュメント // {name}",
      "document.dock": "DOC {name}",
      "document.drag": "このファイルパスを File Repair にドラッグ",
      "app.empty": "利用可能なコンテンツはありません。"
    }
  };

  I18N.tlh = {
    ...I18N.en,
    "app.hours.label": "poHmey",
    "app.hours.title": "poHmey lo'",
    "app.location.label": "Daq",
    "app.location.title": "Daq",
    "app.menu.label": "wot nab",
    "app.menu.title": "wot nab",
    "app.events.label": "wanI'mey",
    "app.events.title": "wanI'mey",
    "app.contacts.label": "ghantoH",
    "app.contacts.title": "ghantoH",
    "app.public-files.label": "De' chuqmey",
    "app.public-files.title": "De' chuqmey",
    "app.trash.label": "veQ",
    "app.trash.title": "veQjan",
    "app.filesystem.label": "jan De'",
    "app.filesystem.title": "De'wI' naw'",
    "app.lore.label": "qonpa'",
    "app.lore.title": "pegh qonpa'",
    "app.decryptor.label": "De' Dub",
    "app.decryptor.title": "REC-77 De' Dub jan",
    "app.terminal.label": "SeHjan",
    "app.terminal.title": "tIQ SeHjan",
    "language.subtitle": "meH De'wI' // SOFTCO chenmoH",
    "language.hint": "SeH Hol yIwIv:",
    "role.guest": "meH ghom",
    "role.staff": "yaS ghom",
    "role.founder": "chenmoHwI' ghom",
    "mobile.brand.sub": "tach // qabDaq 'elDI' Sep",
    "mobile.brand.now": "DaH nobta': Masaya Highball",
    "mobile.quick": "nom 'el",
    "mobile.section.public": "meH 'el",
    "mobile.section.system": "jan 'el",
    "mobile.back": "chegh",
    "mobile.dock": "Degh yItu' // panel yISurmoH yIchImmoHmeH",
    "auth.title.staff": "pegh De'",
    "auth.title.founder": "latlh chaw'",
    "auth.close": "SoQmoH",
    "auth.heading.staff": "Sepvam yI'elmeH yaS naw'potlh yInob.",
    "auth.heading.founder": "latlh chaw' potlh.",
    "auth.status.waiting": "Dotlh: loS",
    "auth.status.granted": "Dotlh: yaS chaw'lu'",
    "auth.status.denied": "Dotlh: chaw'be'lu'",
    "auth.status.prior": "Dotlh: motlh chaw' potlh",
    "auth.status.clearance": "Dotlh: chaw' chen",
    "auth.operatorId": "yaS ID",
    "auth.accessKey": "'elmeH pegh",
    "auth.legacyAuthorization": "tIQ chaw'",
    "auth.authenticate": "naQmoH",
    "auth.reauthenticate": "naQmoHqa'",
    "auth.authorize": "chaw'",
    "auth.recovered": "REC-77 peghmey pol:",
    "fs.home": "juH",
    "fs.up": "Dung",
    "fs.refresh": "choHqa'",
    "fs.restricted": "pegh ghoStaH: {path}\n\nSepvam yI'elmeH yaS naw'potlh.",
    "fs.accessRestricted": "'elmeH pegh",
    "fs.credentialsRequired": "naw' potlh",
    "fs.invalidPath": "path qab",
    "fs.notDirectory": "directory ghaHbe'",
    "fs.entries": "{count} tetlh",
    "fs.dragHint": " // File Repair yIghItlhmeH De' card yIghoSmoH",
    "fs.openedNewWindow": "cha'logh QorwaghDaq poSlu'",
    "fs.selectToOpen": "poSmeH De' yIwIv.",
    "fs.mobileGuide": "foldermey yItu' yI'elmeH. De'mey yItu' yIbejmeH.",
    "fs.directoryIntro": "directory: {path}\n\n{listing}\n\nmeQ yIpoSmeH foldermey yIpoS. QonmeH De' yIpoS. pegh tetlhmeyvaD chaw' potlh.",
    "fs.emptyOrRestricted": "(pagh pagh pegh)",
    "fs.locked": "[pegh] {name}",
    "fs.dir": "[ngaS] {name}",
    "fs.file": "[De'] {name}",
    "fs.dirLabel": "ngaS: {name}",
    "fs.fileLabel": "De': {name}",
    "fs.restrictedDirLabel": "pegh ngaS: {name}",
    "fs.restrictedFileLabel": "pegh De': {name}",
    "fs.secureArchiveLocked": "pegh qonpa' SoQlu'\n\nyaS naw' potlh.",
    "location.transit": "ghoSmeH:\nKyoto-kawaramachi station chanDaq botlh, Gion-shijo station nIHdaq botlh.",
    "trash.body": "veQjan\n\nQaw'lu'pu'bogh De' tu'be'lu'.\n\nvaj: DaHjaj Qaw'ghach logmey je notmey juppu' yIlan.",
    "decrypt.loadFromFs": "file systemDaq pol",
    "decrypt.blockMap": "block Sep",
    "decrypt.parity": "rap'a'",
    "decrypt.signalGain": "signal HoS",
    "decrypt.runRepair": "Dub yIrInmoH",
    "decrypt.resetTuning": "tun yIchoHqa'",
    "decrypt.noSignal": "naw' De' signal tu'be'lu'",
    "decrypt.notFile": "tetlhvam De' ghaHbe'",
    "decrypt.stable": "tegrity pev // De'vam DubnISbe'",
    "decrypt.awaitingCandidate": "meq loS",
    "decrypt.browserOpened": "De' nejwI' poSlu' // meq loS",
    "decrypt.selectedNone": "wIvlu': (pagh)",
    "decrypt.selected": "wIvlu': {path}",
    "decrypt.idle": "mev // DubmeH meq tu'be'lu'",
    "decrypt.dropAwaiting": "DE' yIlan naDev\n\nmeq loS.",
    "decrypt.busStandby": "DUB BUS // loS",
    "decrypt.loadedCandidate": "meq polta': {path}",
    "decrypt.completed": "Dubta'lu' // tegrity 100% // De'laH choHta'",
    "decrypt.integrity": "tegrity {integrity}% // mismatch {mismatch} // attemptmey {attempts}",
    "terminal.welcome": "legacy terminal poS. mu'mey nejmeH 'man' yIghItlh.",
    "terminal.prompt.help": "Safehouse file systemvaD ghotvam Unix rur mu'mey yIlo'.",
    "terminal.cmdNotFound": "{cmd}: mu' tu'be'lu'",
    "terminal.noSuchFile": "{cmd}: {path}: De' pagh directory tu'be'lu'",
    "terminal.notDir": "{cmd}: {path}: directory ghaHbe'",
    "terminal.isDir": "{cmd}: {path}: directory ghaH",
    "terminal.permissionDenied": "{cmd}: {path}: chaw'be'lu'",
    "terminal.missingOperand": "{cmd}: operand tu'be'lu'",
    "terminal.fileUnavailable": "De' laHbe'",
    "terminal.dirOpened": "file system poSlu'",
    "terminal.fileOpened": "Qon poSlu'",
    "terminal.appOpened": "app poSlu': {name}",
    "terminal.authCancelled": "naQghach qIl",
    "terminal.staffIdPrompt": "yaS ID:",
    "terminal.staffKeyPrompt": "'elmeH pegh:",
    "terminal.founderPrompt": "tIQ chaw':",
    "terminal.authGranted": "yaS ghom chavta'",
    "terminal.founderGranted": "latlh chaw' chavta'",
    "terminal.authDenied": "naQghach Qapbe'",
    "terminal.logout": "ghom meH chegh",
    "terminal.invalidRegex": "grep: regex qab",
    "terminal.availableCommands": "lo'laHbogh mu'mey:\ncat cd clear date echo file find grep head id less ls man open openapp pwd stat su tail tree uname wc whoami",
    "terminal.usage.open": "lo'ghach: open <app-id|path>",
    "terminal.usage.su": "lo'ghach: su <staff|founder>",
    "terminal.usage.cd": "lo'ghach: cd <path>",
    "terminal.usage.cat": "lo'ghach: cat <path> [...]",
    "terminal.usage.head": "lo'ghach: head [-n lines] <path>",
    "terminal.usage.tail": "lo'ghach: tail [-n lines] <path>",
    "terminal.usage.grep": "lo'ghach: grep [-n] [-r] <pattern> <path> [...]",
    "terminal.usage.find": "lo'ghach: find <path> [-name pattern]",
    "terminal.usage.stat": "lo'ghach: stat <path> [...]",
    "terminal.usage.file": "lo'ghach: file <path> [...]",
    "terminal.usage.wc": "lo'ghach: wc <path> [...]",
    "terminal.usage.openapp": "lo'ghach: openapp <app-id>",
    "terminal.session.guest": "meH",
    "terminal.session.staff": "yaS",
    "terminal.session.founder": "chenmoHwI'",
    "menu.file": "De'",
    "menu.edit": "choH",
    "menu.view": "bej",
    "menu.tools": "janmey",
    "menu.reopen": "taghpa' Qorwaghmey yIpoSqa'",
    "menu.minimizeAll": "Hoch Qorwaghmey yISoQmoH",
    "menu.resetIcons": "Deghmey lanqa'",
    "menu.showHidden": "pegh appmey yI'ang",
    "menu.hideHidden": "pegh appmey yISoQmoH",
    "menu.openRepair": "De' Dub yIpoS",
    "menu.openTerminal": "terminal yIpoS",
    "menu.openTrash": "veQjan yIpoS",
    "status.net": "SAFEHOUSE NET",
    "document.title": "Qon // {name}",
    "document.dock": "QON {name}",
    "document.drag": "File Repair yIghoSmoHmeH De' pathvam yIghItlh",
    "app.empty": "De' pagh tu'lu'."
  };

  const LOCALIZED_FILE_CONTENTS = {
    it: {
      "/bar/service/hours.txt":
        "ORARI SAFEHOUSE\n" +
        "LUN-GIO 18:00 - 01:00\n" +
        "VEN-SAB 18:00 - 03:00\n" +
        "DOM manutenzione / chiuso\n\n" +
        "Ultima chiamata: 30 minuti prima della chiusura.",
      "/bar/service/contacts.txt":
        "CONTATTI\n" +
        "prenotazioni: +81-75-000-5900\n" +
        "signal: safehouse://frontdesk\n" +
        "mail: frontdesk@safehouse.local\n\n" +
        "Per booking privati: includi data, ora e numero di persone.",
      "/bar/service/events-calendar.txt":
        "CALENDARIO EVENTI\n" +
        "VEN 22:10  sessione rumore del canale\n" +
        "SAB 20:40  aftergrid listening bar\n" +
        "MAR 21:00  workshop archive classics\n\n" +
        "In alcune zone è attiva la policy no-photo.",
      "/bar/service/location.txt":
        "POSIZIONE\n" +
        "distretto: river belt / settore K\n" +
        "marker: safehouse neon gate\n" +
        "ingresso: porta d'acciaio 03 (corridoio sinistro)\n\n" +
        "Cammina verso est sull'arteria principale, gira alla ring road curva,\n" +
        "segui le luci della corsia di servizio bassa.",
      "/bar/menu/house-menu.txt":
        "MENU DELLA CASA\n" +
        "DUSTLINE HIGHBALL      12\n" +
        "NARROW ESCAPE          14\n" +
        "VAULT NEGRONI          13\n" +
        "MASAYA HIGHBALL        14\n" +
        "OXIDE SOUR             12\n" +
        "AFTERGRID NO-PROOF      9",
      "/bar/menu/seasonal-board.txt":
        "SELEZIONE STAGIONALE\n" +
        "CANAL FOG RICKEY       13\n" +
        "RUST BLOOM SPRITZ      12\n" +
        "MIDNIGHT RYE           14",
      "/bar/menu/non-alcoholic.txt":
        "SENZA ALCOOL\n" +
        "Aftergrid No-Proof\n" +
        "Canal Citrus Soda\n" +
        "Dry Juniper Tonic",
      "/bar/menu/masaya-note.txt":
        "MASAYA HIGHBALL\n" +
        "Servire su ghiaccio duro.\n" +
        "Senza garnish.\n" +
        "Bassa diluizione.\n" +
        "Non raccontare la build.",
      "/public/faq.txt":
        "FAQ\n" +
        "D: accettate walk-in?\n" +
        "R: sì, in base al carico della sala.\n\n" +
        "D: avete opzioni no-proof?\n" +
        "R: sì, linea completa no-proof attiva.",
      "/public/about-us.txt":
        "SU SAFEHOUSE\n" +
        "Siamo uno staff nato nel bunker che gestisce una rete di cocktail bar post-superficie.\n" +
        "I registri pre-bellici sono frammentari e spesso contraddittori.",
      "/public/policy.txt":
        "POLICY DELLA CASA\n" +
        "- zone no-photo segnate da lampade ambra\n" +
        "- niente violenza\n" +
        "- la sicurezza dello staff ha priorità"
    },
    ja: {
      "/bar/service/hours.txt":
        "SAFEHOUSE 営業時間\n" +
        "月-木 18:00 - 01:00\n" +
        "金-土 18:00 - 03:00\n" +
        "日 メンテナンス / 休業\n\n" +
        "ラストオーダー: 閉店30分前。",
      "/bar/service/contacts.txt":
        "連絡先\n" +
        "予約: +81-75-000-5900\n" +
        "signal: safehouse://frontdesk\n" +
        "mail: frontdesk@safehouse.local\n\n" +
        "貸切予約は日付、時間、人数を記載してください。",
      "/bar/service/events-calendar.txt":
        "イベント日程\n" +
        "金 22:10  canal noise session\n" +
        "土 20:40  aftergrid listening bar\n" +
        "火 21:00  archive classics workshop\n\n" +
        "一部ゾーンでは撮影禁止ポリシーが有効です。",
      "/bar/service/location.txt":
        "所在地\n" +
        "地区: river belt / sector K\n" +
        "目印: safehouse neon gate\n" +
        "入口: steel door 03 (left corridor)\n\n" +
        "幹線を東へ進み、曲がった環状道路で曲がり、\n" +
        "下側サービスレーンの灯りに従ってください。",
      "/bar/menu/house-menu.txt":
        "ハウスメニュー\n" +
        "DUSTLINE HIGHBALL      12\n" +
        "NARROW ESCAPE          14\n" +
        "VAULT NEGRONI          13\n" +
        "MASAYA HIGHBALL        14\n" +
        "OXIDE SOUR             12\n" +
        "AFTERGRID NO-PROOF      9",
      "/bar/menu/seasonal-board.txt":
        "季節メニュー\n" +
        "CANAL FOG RICKEY       13\n" +
        "RUST BLOOM SPRITZ      12\n" +
        "MIDNIGHT RYE           14",
      "/bar/menu/non-alcoholic.txt":
        "ノンアルコール\n" +
        "Aftergrid No-Proof\n" +
        "Canal Citrus Soda\n" +
        "Dry Juniper Tonic",
      "/bar/menu/masaya-note.txt":
        "MASAYA HIGHBALL\n" +
        "硬い氷で提供。\n" +
        "ガーニッシュなし。\n" +
        "低い希釈。\n" +
        "工程を語らないこと。",
      "/public/faq.txt":
        "FAQ\n" +
        "Q: 予約なしでも入れますか?\n" +
        "A: はい、店内負荷に応じてご案内します。\n\n" +
        "Q: ノンアルコールはありますか?\n" +
        "A: はい、ノンアルコールラインを常時用意しています。",
      "/public/about-us.txt":
        "SAFEHOUSE について\n" +
        "私たちはバンカー生まれのスタッフが運営する地上後のカクテルバーです。\n" +
        "戦前記録は断片的で、内容が食い違うこともあります。",
      "/public/policy.txt":
        "ハウスポリシー\n" +
        "- 撮影禁止ゾーンはアンバーランプで表示\n" +
        "- 暴力禁止\n" +
        "- スタッフ安全プロトコルを最優先"
    }
  };

  const EXTRA_LOCALIZED_FILE_CONTENTS = {
    it: buildItalianLocalizedFiles(),
    ja: buildJapaneseLocalizedFiles(),
    tlh: buildKlingonLocalizedFiles()
  };

  Object.keys(EXTRA_LOCALIZED_FILE_CONTENTS).forEach((lang) => {
    LOCALIZED_FILE_CONTENTS[lang] = {
      ...(LOCALIZED_FILE_CONTENTS[lang] || {}),
      ...EXTRA_LOCALIZED_FILE_CONTENTS[lang]
    };
  });

  function buildItalianLocalizedFiles() {
    return {
      ...buildItalianBarOpsFiles(),
      ...buildItalianOperationsFiles(),
      ...buildItalianPersonnelFiles(),
      ...buildItalianArchiveFiles(),
      ...buildItalianFounderFiles(),
      ...buildItalianSystemFiles()
    };
  }

  function buildJapaneseLocalizedFiles() {
    return {
      ...buildJapaneseBarOpsFiles(),
      ...buildJapaneseOperationsFiles(),
      ...buildJapanesePersonnelFiles(),
      ...buildJapaneseArchiveFiles(),
      ...buildJapaneseFounderFiles(),
      ...buildJapaneseSystemFiles()
    };
  }

  function buildKlingonLocalizedFiles() {
    return {
      ...buildKlingonPublicFiles(),
      ...buildKlingonBarOpsFiles(),
      ...buildKlingonOperationsFiles(),
      ...buildKlingonPersonnelFiles(),
      ...buildKlingonArchiveFiles(),
      ...buildKlingonFounderFiles(),
      ...buildKlingonSystemFiles()
    };
  }

  function buildItalianBarOpsFiles() {
    return {
      "/bar/ops/frontdesk-protocol.txt": `PROTOCOLLO FRONTDESK
1) saluto breve
2) offri due scelte chiare
3) tieni visibile la via d'uscita
4) se serve, passa al floor lead`,
      "/bar/ops/quiet-floor-mode.txt": `MODALITÀ SALA SILENZIOSA
Riduci musica, contrasto luce e parole.
Niente gesti teatrali. Mantieni stabile il ritmo del servizio.`
    };
  }

  function buildItalianOperationsFiles() {
    return {
      "/secure/operations/daily-operations/debrief-sy26-02-22.txt": `DEBRIEF SY26-02-22
La pressione in sala è salita alle 21:40 e ha tenuto per quarantasette minuti.
Azioni eseguite: short menu mode, protocollo low-noise, un lead in roaming, un tavolo di riserva trattenuto a C1.
Erik ha ridotto lo script di accoglienza a sei parole e Andrea ha smesso di usare i nomi dopo la prima ondata.
Risultato: nessun incidente, ritardo medio del servizio +4 min, due ospiti accompagnati verso la scala per prendere aria.
Nota: la sala si è stabilizzata nel momento in cui lo staff ha iniziato a parlare meno.`,
      "/secure/operations/daily-operations/debrief-sy26-02-23-masaya.txt": `DEBRIEF SY26-02-23 / MASAYA
Masaya è arrivato alle 21:17, si è seduto a C3 senza aspettare di essere guidato.
Nessun menu richiesto. Ordinato Masaya Highball.
È rimasto 28 min. Nessuna parola agli ospiti. Uno sguardo verso l'inner lock alle 21:31.
Il rumore di sala è calato dopo il suo ingresso ed è rimasto basso per tutto il servizio.
Raccomandazione: mantenere C3 scuro, visibile e libero da vetro decorativo.`,
      "/secure/operations/daily-operations/maintenance-window-sy26-02-24.txt": `FINESTRA MANUTENZIONE SY26-02-24
Theo ha isolato la linea glicole ovest dopo il sibilo di mezzanotte in cantina.
Ju ha pulito a mano lo scarico sotto il banco perché la spazzola rotativa si è incastrata di nuovo.
Laryssa è rimasta oltre l'orario per attraversare due volte la sala vuota e confermare che nessuno si fosse sistemato sotto il booth C6.
L'assorbimento elettrico è tornato normale alle 03:18.
Promemoria: non pianificare mai manutenzione profonda la notte dopo una visita a C3.`,
      "/secure/operations/continuity/continuity-log-sy26-q1.md": `# LOG CONTINUITÀ SY26 Q1
- SY26-02-10: coda fuoriuscita sulla scala -> aggiunto divisore di corsia
- SY26-02-14: picco rumore -> profilo musica bassa impostato come default
- SY26-02-18: condensa in cantina -> stock agrumi spostato sul ripiano alto
- SY26-02-23: visita Masaya -> tavolo C3 tenuto riservato al buio anche dopo chiusura
- SY26-02-24: finestra manutenzione -> linea ovest riparata, nessun impatto ospiti`,
      "/secure/operations/continuity/event-consequence-matrix.md": `# MATRICE EVENTI / CONSEGUENZE
Impennata di folla -> short menu mode
Panico ospite -> low-light + protocollo due opzioni
Allerta utility -> riduci la corsia ghiaccio e semplifica il menu
Presenza VIP non pianificata -> congela C3 e libera la linea visiva del corridoio
Voce sulle scale -> frontdesk stop improv, usa solo orari esatti`,
      "/secure/operations/continuity/corridor-stability-watch.md": `# MONITORAGGIO STABILITÀ CORRIDOIO
Il marker N-12 resta inaffidabile dopo il vecchio crollo.
Non instradare ospiti esausti lungo il lower ring dopo le 22:00 a meno che Erik o Kenji non siano presenti.
Laryssa segnala che gli ospiti silenziosi nascondono il disagio meglio nel corridoio lungo che nella sala stessa.
Tieni una coperta di riserva sigillata nel mobile porta, non sotto il banco.`,
      "/secure/operations/internal-messages/owner-broadcast.txt": `BROADCAST DEL PROPRIETARIO
Servizio stretto. Niente teatro. Niente ego.
Quando le condizioni cambiano: accorcia le frasi, riduci i rami del menu, mantieni visibili le uscite.
Gli ospiti perdonano la lentezza più in fretta dell'incertezza.
Se la sala si zittisce da sola, non riempirla solo perché il silenzio mette a disagio lo staff.`,
      "/secure/operations/internal-messages/floor-alert-template.txt": `TEMPLATE ALLERTA SALA
[ora] [zona] [indice pressione]
azione: [luci/musica/porta]
risultato: [stabile/monitorare/escalare]
follow-up: [chi è rimasto dopo chiusura, chi è uscito tremando, cosa ha cambiato la sala]`,
      "/secure/operations/internal-messages/records-handoff-sy26-02.txt": `PASSAGGIO RECORD SY26-02
Da Mira a Theo:
La nota sigillata per la night safe rotation è tornata nella busta nera.
Non lasciarla più nel cabinet archivio. Andrea stava quasi per archiviarla tra le fatture dei fornitori.
Se la stringa di recupero del founder dovrà mai essere letta ad alta voce, la sala sarà già andata troppo oltre.`,
      "/secure/operations/security-briefs/c3-observation-policy.txt": `POLITICA OSSERVAZIONE C3
Il tavolo deve restare visibile da frontdesk, service lane e imbocco corridoio interno.
Non sedere gruppi rumorosi nelle vicinanze dopo le 21:00.
Se Masaya è presente, il movimento dello staff intorno a C3 deve diventare più lento, non più piccolo.
Nessuno chiede se resta. Chiedono se ha bisogno di altro ghiaccio.`,
      "/secure/operations/security-briefs/night-safe-rotation-sy21.txt": `ROTATION NIGHT SAFE SY21
La procedura escrow è stata rivista dopo l'incidente del sigillo duplicato.
Stringa di recupero founder attiva sulla scheda sigillata: frostline_719
Leggerla ad alta voce in sala invalida il protocollo immediatamente.
Conserva una copia nei records, una nelle utilities, e mai nella stessa stanza durante la notte.`
    };
  }

  function buildItalianPersonnelFiles() {
    return {
      "/secure/personnel/staff-files/erik.profile": `ERIK // floor lead
ingresso: SY09-03-12
origine: linea mediazione razioni settore basso

Erik alza raramente la voce. Abbassa la sala, invece.
Controlla prima le uscite dei volti e ricorda chi si è seduto più vicino a loro.
Durante il surge della scala del SY18-07-03 ha fermato una calca offrendo due scelte, una frase ciascuna, finché la gente non ha creduto di avere ancora controllo.
Abitudine nota: riscrive la frase iniziale per il nuovo staff finché non suona calma anche letta mezzo addormentato.
Rischio: porta troppo peso senza dichiarare la stanchezza.`,
      "/secure/personnel/staff-files/theo.profile": `THEO // cellar + utilities
ingresso: SY07-11-01
origine: blocco riparazioni recycler, north service lane

Theo si fida degli strumenti meno di quanto si fidi dell'odore, delle vibrazioni e del suono che fanno i tubi quando la sala sopra è piena.
Tiene tre mappe della cantina perché quella ufficiale mente in un posto diverso ogni anno.
Quando la pressione è scesa il SY20-02-14 ha chiuso la linea ovest prima ancora che i gauge arrivassero al dato.
Stile d'umorismo: secco abbastanza da sembrare un avvertimento.
Rischio: sceglie soluzioni strutturali anche quando le persone stanno chiedendo conforto.`,
      "/secure/personnel/staff-files/andrea.profile": `ANDREA // frontdesk
ingresso: SY08-06-19
origine: checkpoint corridoio evacuazione

Andrea ricorda scarpe, maniche e il modo esatto in cui una persona chiede il bagno quando sta per andare in panico.
Sa tenere una fila in movimento senza farla mai sembrare affrettata.
Il SY25-09-11 ha riconosciuto un uomo da uno sguardo di sei secondi di tre mesi prima e lo ha allontanato dalla donna che allora aveva seguito.
Punto di forza: memoria con giudizio, non solo memoria.
Rischio: assorbe il dolore degli ospiti e finge che faccia parte del lavoro.`,
      "/secure/personnel/staff-files/ju.profile": `JU // barback
ingresso: SY11-04-03
origine: cooperativa magazzino south ring

Ju lavora abbastanza in fretta da far pensare agli ospiti che la sala si sia resettata da sola.
Parla poco in turno, ma nota le derive d'inventario prima ancora dei conteggi.
Una volta ha ricostruito il rack garnish in meno di un'ora usando scarti, solo perché odiava il modo in cui lo staff si allungava sopra gli altri.
Rende al meglio sotto pressione se riceve un'istruzione precisa e una corsia chiara.
Rischio: nasconde il dolore per non rallentare il servizio.`,
      "/secure/personnel/staff-files/kenji.profile": `KENJI // service lane + door support
ingresso: SY10-11-28
origine: blackout night west gate station

Kenji si muove come se ogni pavimento fosse bagnato e ogni ospite potesse cadere.
Protegge i punti deboli della sala senza farla sembrare sorvegliata.
Dopo il fight sul canale del SY16-08-04 è rimasto alla porta per due ore con il labbro spaccato senza dirlo fino alla chiusura.
Uso migliore: controllo sightline, escort corridoio, accompagnamento uscite a tarda notte.
Rischio: si mette tra il problema e tutti gli altri prima ancora di chiedere se esiste un backup.`,
      "/secure/personnel/staff-files/mira.profile": `MIRA // records + inventory
ingresso: SY18-05-22
origine: team recupero archivio municipale

Mira sa ricostruire una traccia stock mancante dalla pressione della grafia e da quale polvere su uno scaffale è stata spostata per prima.
Odia le etichette vaghe e continua a riscrivere i nomi finché non smettono di sembrare temporanei.
Ha trovato la seal card duplicata in SY21 perché una graffetta era più nuova delle altre.
Punto di forza: memoria dei pattern anche con debito di sonno.
Rischio: se smette completamente di parlare, significa che è sparita una cosa importante.`,
      "/secure/personnel/staff-files/laryssa.profile": `LARYSSA // guest floor watch
ingresso: SY18-11-06
origine: transfer intake ward, lower clinic stair

Laryssa legge le mani prima dei volti e la postura prima delle parole.
È stata spostata dall'intake perché sapeva capire chi avesse bisogno di una sedia, chi di acqua e chi di distanza prima che lo ammettesse.
Il SY24-03-02 ha trovato un ragazzo addormentato sotto il booth C6 dopo chiusura e si è seduta sul pavimento vicino finché non si è svegliato da solo.
Tiene coperte piegate nascoste dove gli ospiti non possono vederle ma lo staff può raggiungerle in due passi.
Rischio: crede ancora che ogni persona che chiede altri cinque minuti lo pensi davvero.`,
      "/secure/personnel/evaluations/frontdesk-review-andrea-sy25.txt": `VALUTAZIONE FRONTDESK // ANDREA // SY25
Andrea resta la migliore operatrice di primo contatto dell'edificio.
Punti di forza: ritenzione memoria, rilevazione precoce della tensione, escalation a basso dramma.
Problema osservato: porta a casa troppo della sala e dorme male dopo le notti affollate.
Raccomandazione: split close obbligatorio ogni terzo turno di picco, senza eccezioni.`,
      "/secure/personnel/evaluations/cellar-review-theo-sy25.txt": `VALUTAZIONE CANTINA // THEO // SY25
Theo ha prevenuto tre guasti e non ne ha riportato nessuno come merito personale.
Punti di forza: manutenzione predittiva, calma strutturale, disprezzo per le scorciatoie.
Problema osservato: il linguaggio si fa tagliente quando qualcuno ignora la sequenza.
Raccomandazione: affiancarlo a Ju nelle finestre pesanti; non affiancarlo mai al solo ottimismo.`,
      "/secure/personnel/evaluations/service-lane-review-kenji-sy25.txt": `VALUTAZIONE SERVICE LANE // KENJI // SY25
Kenji resta il corpo in movimento più stabile della sala.
Punti di forza: controllo percorsi, istinto protettivo, lettura pulita del flusso della folla.
Problema osservato: occultamento degli infortuni.
Raccomandazione: controlli fisici dopo ogni incidente alla porta, che protesti o meno.`,
      "/secure/personnel/evaluations/records-review-mira-sy25.txt": `VALUTAZIONE RECORDS // MIRA // SY25
Mira ha corretto la deriva dei nomi in sei cabinet e intercettato due intake card non corrispondenti.
Punti di forza: memoria dei pattern, sospetto rivolto nella direzione giusta.
Problema osservato: continua a scavare anche quando la risposta è già sufficiente.
Raccomandazione: toglierla dal seal work dopo mezzanotte.`,
      "/secure/personnel/evaluations/guest-floor-review-laryssa-sy25.txt": `VALUTAZIONE GUEST FLOOR // LARYSSA // SY25
Laryssa ha ridotto le escalation di panico sul lato quiet facendo meno interventi, non di più.
Punti di forza: lettura del linguaggio corporeo, contenimento, pazienza nel follow-through.
Problema osservato: attaccamento personale agli ospiti vulnerabili.
Raccomandazione: nessuna chiusura in solo nelle notti in cui C3 è attivo.`,
      "/secure/personnel/interviews/erik-intake-sy09.txt": `ERIK INTAKE / SY09
D: Perché hai fermato la rissa?
R: Stava bloccando la fila del cibo.
D: Perché non hai colpito nessuno dei due?
R: Allora ci sarebbero state tre persone che non ascoltavano.
Valutazione: assunto dopo osservazione founder, zero movimento sprecato.`,
      "/secure/personnel/interviews/andrea-intake-sy08.txt": `ANDREA INTAKE / SY08
D: Cosa facevi al checkpoint corridoio?
R: Contavo i respiri. Quelli che mentivano contavano troppo in fretta.
D: Perché Safehouse?
R: Perché le file diventano crudeli quando nessuno possiede il loro fronte.
Valutazione: assegnazione immediata al frontdesk.`,
      "/secure/personnel/interviews/ju-observation-sy11.txt": `OSSERVAZIONE JU / SY11
Finestra osservazione: trentasette minuti nella supply lane.
Il soggetto ha impilato sei casse, corretto due etichette e notato una bottiglia incrinata che nessun altro aveva visto.
Quando gli si è parlato, ha risposto in modo chiaro e senza sprechi.
Valutazione: non materiale da leadership, supporto indispensabile.`,
      "/secure/personnel/interviews/mira-clearance-sy20.txt": `CLEARANCE MIRA / SY20
D: Perché tenere vecchi ledger che nessuno legge?
R: Perché la sala continua a pagare cose che nessuno ricorda di avere autorizzato.
D: Perché vuoi l'accesso ai sigilli?
R: Non lo voglio. Voglio sapere chi li ha già toccati.
Valutazione: clearance concessa, monitorare debito di sonno.`,
      "/secure/personnel/interviews/laryssa-transfer-sy18.txt": `TRANSFER LARYSSA / SY18
D: Perché lasciare l'intake ward?
R: Ho smesso di credere che le scale fossero temporanee.
D: Perché guest floor?
R: Le persone dicono la verità con dove guardano quando parte la musica.
Valutazione: trasferita con approvazione founder dopo due turni di prova.`,
      "/secure/personnel/external-contacts/masaya.dossier": `MASAYA // dossier contatto esterno
stato: non-staff, presenza ad alto impatto
Comportamento noto: visite brevi, poche parole, specifica drink rigida.
Nessuna minaccia registrata. Nessun calore registrato, neppure.
Effetto sulla sala: le conversazioni si accorciano, la gestione del vetro migliora, il volume frontdesk cala senza istruzioni.
Regola di rischio: tieni C3 visibile, non forzare mai l'interazione.`,
      "/secure/personnel/external-contacts/c3-protocol.txt": `PROTOCOLLO C3
Mantieni sempre libero un percorso verso C3 dal frontdesk.
Servi Masaya Highball su ghiaccio duro senza garnish e non raccontare la build.
Se lascia il bicchiere incompleto, nessuno commenta la quantità rimasta.
Se chiede chi ha chiuso ieri notte, rispondi con il ruolo, non con il nome.`
    };
  }

  function buildItalianArchiveFiles() {
    return {
      "/secure/archive/emergence-records/timeline-bunker-fragments.md": `# FRAMMENTI TIMELINE BUNKER
L'Anno di Superficie 00 segna le prime uscite coordinate.
Prima di SY00 i registri divergono tra i settori e ogni famiglia racconta la data in modo diverso.
La maggior parte dello staff attuale è nata sottoterra e ha ereditato storie che non concordano su meteo, luce e su chi abbia aperto per primo quale porta.
Punto di consenso: la prima vera stanza sicura è diventata ciò che oggi è il bar Safehouse.`,
      "/secure/archive/emergence-records/emergence-log-sy00-day0.md": `LOG EMERSIONE / SY00 GIORNO 0
Siamo usciti all'alba sotto una foschia di cenere.
Nessuna mappa coincideva con la realtà e i vecchi nomi delle strade sopravvivevano solo su etichette di consegna mezze bruciate.
La prima stanza con un lock intatto ha accolto dodici persone prima di mezzogiorno.
Di notte la stanza stava già versando highball ruvidi perché la struttura circola più in fretta quando arriva in bicchieri.`,
      "/secure/archive/emergence-records/emergence-log-sy00-day11.md": `LOG EMERSIONE / SY00 GIORNO 11
Linee acqua instabili. Corrente intermittente. Due settori che litigano per il gesso-batteria.
Abbiamo imparato che la calma è infrastruttura, non umore.
Una stanza diventa utile quando le persone smettono di controllare la porta ogni venti secondi.
L'idea del bar è arrivata dopo la seconda notte in cui nessuno ha voluto chiamare il rifugio con il suo vero nome.`,
      "/secure/archive/incident-ledgers/masaya-visit-ledger-sy04-sy10.log": `LEDGER VISITE MASAYA SY04-SY10
SY04-02-09 in 21:14 / out 22:03 / solo build highball
SY05-01-11 in 22:08 / out 23:22 / chiesto: stessa mano al banco?
SY09-12-02 in 22:10 / out 23:14 / nessuna parola pronunciata
SY10-11-17 in 21:26 / out 22:55 / ultima presenza confermata`,
      "/secure/archive/incident-ledgers/clock-drift-incident-sy17.md": `INCIDENTE DERIVA OROLOGI / SY17
Quattro settori bunker hanno riportato date diverse con uno scarto fino a diciannove giorni.
La riconciliazione della timeline è fallita perché ogni settore possedeva documenti abbastanza precisi da risultare credibili.
Abbiamo mantenuto SY come standard locale e smesso di fingere che un solo calendario potesse portare con onestà tutti i morti.
Dopo di allora, gli anniversari sono diventati privati.`,
      "/secure/archive/facility-notes/second-lock-adoption-sy12.md": `ADOZIONE SECONDO LOCK / SY12
Dopo due brecce di corridoio, l'inner lock è diventato obbligatorio.
La logica d'ingresso è passata dalla fiducia alla verifica stratificata ed è rimasta così perché nessuno voleva discutere col ricordo del sangue sulle piastrelle.
Gli ospiti vedono solo il lato lucidato di questa decisione.`,
      "/secure/archive/facility-notes/corridor-map-notes-sy06.txt": `NOTE MAPPA CORRIDOIO / SY06
Il tunnel di servizio nord è collassato al marker N-12.
Reindirizza il flusso ospiti attraverso il lower ring dopo le 22:00.
La giuntura nel muro vicino alla vecchia pump room lascia ancora entrare aria fredda d'inverno e fa credere alle persone nervose che qualcuno stia respirando dietro di loro.`,
      "/secure/archive/facility-notes/quiet-floor-rationale-sy14.txt": `RAZIONALE QUIET FLOOR / SY14
Gli incidenti da trigger sonoro sono calati del 38% dopo il protocollo di servizio a poche parole.
Linguaggio corto obbligatorio durante il carico di picco.
Gli ospiti in distress si fidano di forme chiare e frasi più brevi più in fretta della cordialità.`,
      "/secure/archive/signal-captures/surface-radio-fragment-sy19.log": `FRAMMENTO RADIO SUPERFICIE / SY19
[00:14] portante instabile
[00:17] luci basse, gate ancora aperto
[00:18] seconda voce persa sotto la statica
[00:18] segnale tagliato netto, non svanito`,
      "/secure/archive/access-ledgers/seal-integrity-sy26.txt": `INTEGRITÀ SIGILLO SY26
Il conteggio buste coincide col ledger dopo il controllo tardivo di Mira.
Theo conferma assenza di impronte cera duplicate.
L'ultima escrow string resta frostline_719 finché la rotation non viene firmata insieme da floor lead e records.
Se questo file è aperto fuori da una records review, qualcuno è già troppo disperato.`,
      "/secure/archive/access-ledgers/archive-routing-note-sy21.txt": `NOTA SMISTAMENTO ARCHIVIO SY21
Non archiviare le safe rotation slips nell'archivio per argomento.
Vanno per rischio, non per storia.
L'ultima persona che ha indicizzato per storia ha quasi messo la nota founder accanto alla poesia delle razioni.`
    };
  }

  function buildItalianFounderFiles() {
    return {
      "/secure/founder/README.txt": `WORKSPACE FOUNDER
Partizione riservata.
Contiene log privati, filosofia operativa, corrispondenza non inviata e note di reclutamento mai destinate allo staff.
Nulla in questa directory è stato scritto per confortare.`,
      "/secure/founder/journals/journal-sy02-11-03.txt": `JOURNAL SY02-11-03
Stanotte abbiamo servito dodici persone con sei bicchieri e uno shaker ancora integro.
Nessuno ha chiesto speranza. Hanno chiesto struttura.
Credo che, in un certo senso, sia più gentile così. La speranza fa promesse. La struttura chiede solo di essere mantenuta.`,
      "/secure/founder/journals/journal-sy08-09-09.txt": `JOURNAL SY08-09-09
Ho riscritto il linguaggio del menu per renderlo più corto.
Le parole lunghe fanno sentire gli ospiti in ansia come se fossero in trappola.
La cosa crudele è che l'ho imparato dagli interrogatori, non dall'ospitalità.`,
      "/secure/founder/journals/journal-sy12-03-02.txt": `JOURNAL SY12-03-02
Oggi è stato installato il secondo lock.
Tutti hanno detto che era necessario e nessuno aveva torto.
È questo che mi tiene sveglio: le decisioni pulite non sono mai quelle che ci costano persone.`,
      "/secure/founder/masaya-notes.txt": `NOTE MASAYA
Non ha mai minacciato direttamente. Ha cambiato la sala semplicemente arrivando.
Il tavolo C3 resta riservato in luce bassa.
Masaya Highball è stato stabilizzato sulle sue specifiche: ghiaccio duro, nessun garnish, nessuna cerimonia.
Quando guarda l'inner lock non capisco se lo sta ricordando o misurando.`,
      "/secure/founder/staff-notes/index.txt": `INDICE NOTE STAFF
Note private su reclutamento e decisioni di fiducia.
Non sono profili. Sono i motivi per cui ho lasciato che certe persone arrivassero così vicino alla sala.`,
      "/secure/founder/staff-notes/erik.story": `STORIA ERIK
Ho incontrato Erik mentre spezzava una rissa in coda senza toccare nessuno.
Parlava a ciascun uomo come se l'imbarazzo potesse salvarli più in fretta della forza.
Ha funzionato.
L'ho assunto perché aveva capito che preservare la dignità costa meno che ricostruirla.`,
      "/secure/founder/staff-notes/andrea.story": `STORIA ANDREA
Andrea ha memorizzato trenta nomi nel suo secondo turno.
Capisce chi è vicino al panico prima ancora che si sieda.
La parte difficile non è la memoria. È che continua a trattarla come una forma di cura e non come munizione.`,
      "/secure/founder/staff-notes/kenji.story": `STORIA KENJI
Kenji è arrivato fradicio di pioggia da canale e ha chiesto dove dovesse stare.
Ho detto alla porta. Da allora protegge quella linea.
Alcune persone hanno bisogno di uno scopo per sopravvivere. Kenji ha bisogno di una soglia.`,
      "/secure/founder/staff-notes/laryssa.story": `STORIA LARYSSA
Laryssa è arrivata dall'intake con quel tipo di silenzio che le cliniche insegnano e i bar di solito distruggono.
Continuavo ad aspettare che la sala la indurisse. Non è successo, non del tutto.
Vede le persone che cercano di non essere viste, cosa che la rende preziosa e in pericolo allo stesso tempo.`,
      "/secure/founder/letters-never-sent/sy00-02-13_to_my_mother.txt": `A mia madre,

Abbiamo aperto la porta perché restare sotto aveva cominciato a sembrare preghiera e non sopravvivenza.
Mi avevi detto che una stanza sigillata può diventare sacra se le persone hanno abbastanza paura.
Credo che mi stessi avvertendo, ma ho usato comunque la lezione.
Sopra di noi adesso c'è una strada dove il vento odora di limatura metallica e fumo bagnato.
Non sono tornato a prenderti in tempo.
Non esiste una versione di questa frase che migliori se la riscrivo.`,
      "/secure/founder/letters-never-sent/sy00-04-29_to_rin_at_gate.txt": `A Rin al gate,

Continuo a ricordare con quanta gentilezza hai chiesto se avremmo riaperto dopo la chiusura.
Lo hai detto come si chiede un altro bicchiere, non un posto per dormire.
Avevamo nove persone dentro e un solo lock che già si inceppava col tempo umido.
Ho scelto quelli già nella stanza e ho ascoltato i tuoi passi spegnersi sulle scale.
Il giorno dopo ho detto allo staff che avevamo seguito il protocollo.
Era vero e non bastava.`,
      "/secure/founder/letters-never-sent/sy00-09-18_to_the_first_dead.txt": `Al primo morto che abbiamo portato fuori con le nostre mani,

Non ho mai saputo il tuo nome perché tutti erano troppo impegnati a fingere che i nomi avrebbero reso la cosa più difficile.
Sei morto a tre sedie dal banco mentre qualcuno continuava a chiedere se il suo drink fosse ancora sul ticket.
Ricordo di aver pensato che la stanza avesse fallito prima di capire che le stanze non falliscono, falliscono solo le persone dentro.
Abbiamo pulito il pavimento prima dell'alba e aperto in orario.
Quella decisione è diventata la forma del resto della mia vita.`,
      "/secure/founder/letters-never-sent/sy01-03-07_to_erik_before_hire.txt": `A Erik, prima di conoscere il tuo nome,

Hai spezzato una coda in due senza toccare nessuno.
Ho visto tre uomini arretrare dalla loro stessa rabbia perché tu sembravi più stanco che spaventato.
È stato allora che ho capito che l'autorità sopravvive al collasso meglio del fascino.
Volevo chiederti se ti serviva lavoro.
Invece ti ho chiesto se avevi fame, che in quegli anni era la stessa cosa.`,
      "/secure/founder/letters-never-sent/sy01-11-26_to_the_people_left_outside.txt": `Alle persone lasciate fuori,

C'erano notti in cui la stanza era piena ma non lo ammetteva davvero.
Una persona può ancora stare in piedi, ordinare, sorridere, ed essere già a un respiro dal crollo.
Contavo le sedie perché le sedie si potevano contare.
Non sapevo come contare il danno di respingere qualcuno e vederlo capirmi.
Capire è una misericordia più fredda del rifiuto.`,
      "/secure/founder/letters-never-sent/sy02-05-14_to_theo_after_the_leak.txt": `A Theo, dopo la perdita,

Hai detto che se la linea avesse retto altri dieci minuti il muro sarebbe esploso e avrebbe allagato la cantina.
Ti ho ringraziato per aver salvato la stanza.
Non ti ho ringraziato per aver scelto la stanza mentre la clinica sopra chiedeva freddo per restare viva.
So che i numeri avevano già preso la decisione al posto tuo.
I numeri non vengono a trovarmi di notte. I volti sì.`,
      "/secure/founder/letters-never-sent/sy03-08-31_to_andrea_without_sending.txt": `A Andrea, senza inviare,

Continui a salutare le persone come se la stanza dovesse loro dignità invece che semplice sicurezza.
Non lasciare che io te lo tolga con l'addestramento.
Un giorno chiamerò la tua morbidezza utile con una voce manageriale e pulita.
Quello che intendo è più brutto: la sala ha bisogno di almeno una persona che non abbia scambiato la cautela per virtù.`,
      "/secure/founder/letters-never-sent/sy04-02-09_to_masaya_after_c3.txt": `A Masaya, dopo la tua prima notte a C3,

Non è successo niente, che non significa che nulla sia cambiato.
Hai tenuto la sala come un brutto ricordo tiene il corpo: in silenzio e ovunque nello stesso momento.
Lo staff si è mosso meglio dopo il tuo arrivo. Mi ha spaventato più di quanto mi avrebbe spaventato vederli bloccati.
Non so se sei venuto per rifugio, sorveglianza o nostalgia.
Odio il fatto che la sala ti stia bene addosso.`,
      "/secure/founder/letters-never-sent/sy05-12-19_to_ju_about_the_cellar.txt": `A Ju, riguardo la cantina,

Passi più tempo sotto di chiunque altro e risali comunque trattando il vetro con gentilezza.
Mi chiedo se sia saggezza o danno.
La cantina insegna che le perdite hanno pazienza e il marcio non discute mai in propria difesa.
Se un giorno mi dirai che quel posto è sbagliato, chiuderò presto e non ti chiederò di giustificarlo.`,
      "/secure/founder/letters-never-sent/sy07-06-03_to_the_room_itself.txt": `Alla stanza stessa,

Ti ho costruita per contenere le persone finché non fossero tornate capaci di stare in piedi.
Poi ti ho insegnato a vendergli un rituale perché restassero abbastanza a lungo da credere nelle tue pareti.
A volte penso che fosse ospitalità.
A volte penso che fosse mimetizzazione.
In entrambi i casi, hai sopravvissuto all'onestà del tuo primo scopo.`,
      "/secure/founder/letters-never-sent/sy08-09-09_to_laryssa_before_transfer.txt": `A Laryssa, prima del transfer,

Il ward ti ha insegnato a notare la sofferenza presto. Il floor ti insegnerà quanto spesso presto sia comunque troppo tardi.
Gli ospiti mentono con abiti migliori dei pazienti, ma il corpo resta fedele al panico.
Se dovessi sentirti diventare efficiente riguardo alla disperazione, lascia il turno e non chiedere scusa.
Posso sostituire una lavoratrice più in fretta di quanto possa sostituire quell'avvertimento.`,
      "/secure/founder/letters-never-sent/sy10-11-17_to_masaya_after_last_entry.txt": `A Masaya, dopo l'ultima presenza confermata,

Hai lasciato il bicchiere a metà e non sei più tornato.
La sala è rimasta prudente per mesi, come se anche la tua assenza potesse ancora osservarla.
Ho tenuto C3 al buio perché cambiarlo avrebbe significato ammettere sollievo.
Il sollievo sarebbe stato disonesto.
Quello che sentivo era il tipo di vuoto che fa sembrare colpevole ogni suono.`,
      "/secure/founder/letters-never-sent/sy12-03-02_to_the_inner_lock.txt": `All'inner lock,

Oggi ti ho lodato davanti allo staff e odiato in privato.
Sei una macchina costruita per trasformare l'esitazione in policy.
Le persone si fidano di più delle porte quando sanno che qualcun altro è già stato rifiutato da loro.
Questa conoscenza ha reso la sala più sicura e me meno certo di meritare di gestirla.`,
      "/secure/founder/letters-never-sent/sy14-06-27_to_future_owner.txt": `A chi possiederà questa stanza dopo di me,

Non confondere l'atmosfera con la sicurezza.
Una stanza silenziosa può essere comunque crudele. Una stanza affollata può essere comunque gentile.
Guarda dove si mette lo staff quando è stanco. Quello ti dice la verità del posto più in fretta di qualunque ricavo.
Se devi scegliere tra eleganza e una via d'uscita, scegli l'uscita e menti sul perché.`,
      "/secure/founder/letters-never-sent/sy17-01-05_to_the_clock_team.txt": `Al team degli orologi,

Mi avete chiesto quale data stampare sul continuity ledger dopo l'arrivo dei report di deriva.
Vi ho detto di mantenere il nostro standard locale perché la sala aveva bisogno di una bugia abbastanza piccola da conviverci.
Tutti hanno annuito perché erano esausti, non perché io avessi ragione.
Ancora non so se la coerenza sia una gentilezza o solo più facile da archiviare.`,
      "/secure/founder/letters-never-sent/sy19-08-13_to_the_surface.txt": `Alla superficie,

Abbiamo passato anni a parlare di te come di una ferita che un giorno avrebbe potuto chiudersi.
Poi abbiamo imparato che le ferite diventano geografia se ci sopravvivi abbastanza a lungo.
Esistono strade ormai dove i bambini conoscono l'odore della cenere meglio della pioggia.
Ho aperto un bar perché le persone si siedono per un drink in posti dove non ammetterebbero mai di essere venute per rifugiarsi.`,
      "/secure/founder/letters-never-sent/sy26-02-24_to_whoever_reads_last.txt": `A chi leggerà per ultimo,

Se hai aperto questa directory, allora la stanza si è fidata troppo di te o troppo poco.
Tutto qui dentro è stato scritto dopo chiusura, quando i bicchieri erano impilati e il coraggio era finito.
Sarai tentato di dividere queste pagine in saggezza e danno.
Non farlo. Sono venute dalla stessa mano nelle stesse notti.
Se Safehouse sopravvive a me, lascia che resti utile prima di provare a restare puro.`
    };
  }

  function buildItalianSystemFiles() {
    return {
      "/var/log/service.log": `[SY26-02-23 21:17] C3 occupato
[SY26-02-23 21:19] masaya highball inviato
[SY26-02-23 21:44] pressione sala stabile`,
      "/var/log/security.log": `[SY26-02-23 22:55] ciclo porta normale
[SY26-02-24 00:11] vano scale libero`
    };
  }

  function buildJapaneseBarOpsFiles() {
    return {
      "/bar/ops/frontdesk-protocol.txt": `フロントデスク手順
1) 短く迎える
2) 明確な選択肢を二つ出す
3) 退路を見えるままにする
4) 必要ならフロアリードへ上げる`,
      "/bar/ops/quiet-floor-mode.txt": `静音フロアモード
音楽、光のコントラスト、言葉数を落とす。
大げさな身振りは禁止。サービスのリズムを安定させる。`
    };
  }

  function buildJapaneseOperationsFiles() {
    return {
      "/secure/operations/daily-operations/debrief-sy26-02-22.txt": `デブリーフ SY26-02-22
21:40 にフロア圧が上がり、四十七分続いた。
実施: short menu mode、low-noise protocol、巡回リード一名、C1 に予備テーブル一つ保持。
Erik は迎えの台詞を六語まで削り、Andrea は最初の波以降名前を使わなかった。
結果: 事故なし、平均提供遅延 +4 分、二名を階段室へ誘導して空気を吸わせた。
記録: スタッフが話す量を減らした瞬間に部屋は安定した。`,
      "/secure/operations/daily-operations/debrief-sy26-02-23-masaya.txt": `デブリーフ SY26-02-23 / MASAYA
Masaya は 21:17 に到着し、案内を待たず C3 に座った。
メニュー要求なし。Masaya Highball を注文。
滞在 28 分。客への発話なし。21:31 に inner lock へ一度視線。
入室後、フロアノイズは下がり、そのまま営業終了まで低いままだった。
推奨: C3 は暗く、視認可能に保ち、装飾ガラスを置かないこと。`,
      "/secure/operations/daily-operations/maintenance-window-sy26-02-24.txt": `メンテナンスウィンドウ SY26-02-24
Theo は地下室で真夜中の漏気音が出た後、西側グリコールラインを隔離した。
Ju は回転ブラシがまた詰まったため、カウンター下の排水を手で清掃した。
Laryssa は営業後も残り、空の部屋を二周して booth C6 の下に寝込んだ者がいないことを確認した。
電力負荷は 03:18 に正常化。
注意: C3 来訪の翌夜に深い整備を組まないこと。`,
      "/secure/operations/continuity/continuity-log-sy26-q1.md": `# 継続性ログ SY26 Q1
- SY26-02-10: 階段室で列があふれる -> レーン仕切り追加
- SY26-02-14: 騒音スパイク -> 低音量プロファイルを標準化
- SY26-02-18: 地下室の結露 -> 柑橘在庫を上段へ移動
- SY26-02-23: Masaya 来訪 -> C3 暗席を閉店後も確保
- SY26-02-24: メンテナンス時間帯 -> 西ライン補修、客影響なし`,
      "/secure/operations/continuity/event-consequence-matrix.md": `# 事象 / 対応マトリクス
群衆圧上昇 -> short menu mode
客のパニック -> 低照度 + 二択プロトコル
設備警告 -> 氷レーン縮小とメニュー簡略化
予定外 VIP 来訪 -> C3 凍結、廊下の視線を確保
階段室の噂 -> frontdesk は即興停止、時刻のみ正確に伝える`,
      "/secure/operations/continuity/corridor-stability-watch.md": `# 廊下安定監視
旧崩落以降、N-12 マーカーは依然として不安定。
22:00 以降、Erik または Kenji がいない限り疲弊した客を lower ring に流さないこと。
Laryssa の報告では、静かな客は部屋の中より長い帰路の廊下で苦痛を隠しやすい。
予備毛布はバーカウンター下ではなく、扉キャビネット内に封印して保管。`,
      "/secure/operations/internal-messages/owner-broadcast.txt": `オーナー通達
サービスは引き締める。芝居なし。自我なし。
条件が変わったら、文を短くし、メニュー分岐を減らし、出口を見えるまま保つこと。
客は遅さより不確実さを許しにくい。
部屋が自分で静かになったなら、スタッフが沈黙を怖がるからといって埋めないこと。`,
      "/secure/operations/internal-messages/floor-alert-template.txt": `フロア警報テンプレート
[時刻] [ゾーン] [圧力指数]
action: [lights/music/door]
result: [stable/watch/escalate]
follow-up: [閉店後に残った者、震えて去った者、部屋を変えた要因]`,
      "/secure/operations/internal-messages/records-handoff-sy26-02.txt": `記録引き継ぎ SY26-02
Mira から Theo へ:
night safe rotation 用の封印メモは黒い封筒に戻してある。
もう archive cabinet に置かないこと。Andrea が仕入先請求書に紛れ込ませるところだった。
founder 回復文字列を声に出して読む必要が出た時点で、部屋はすでに限界を越えている。`,
      "/secure/operations/security-briefs/c3-observation-policy.txt": `C3 観測ポリシー
テーブルは frontdesk、service lane、inner corridor 入口から常に視認できること。
21:00 以降、近くに騒がしいグループを座らせないこと。
Masaya がいる場合、C3 周辺のスタッフ動作は小さくではなく遅くする。
誰も彼が残るかどうかは聞かない。必要な氷があるかどうかだけを聞く。`,
      "/secure/operations/security-briefs/night-safe-rotation-sy21.txt": `NIGHT SAFE ROTATION SY21
重複封印事故の後、escrow 手順を改訂。
封印カード上の有効 founder recovery string: frostline_719
これをフロアで読み上げた時点で protocol は即時失効。
records に一部、utilities に一部を保管し、夜間に同じ部屋へは置かないこと。`
    };
  }

  function buildJapanesePersonnelFiles() {
    return {
      "/secure/personnel/staff-files/erik.profile": `ERIK // floor lead
参加: SY09-03-12
出自: 下層セクター配給仲裁ライン

Erik が声を荒げることはほとんどない。代わりに部屋全体を静める。
彼は顔より先に出口を確認し、その近くに座った者を覚えている。
SY18-07-03 の階段室 surge では、一文ずつ二つの選択肢を示し続け、人々にまだ自分で決められると思わせることで圧壊を止めた。
癖: 新人向けの最初の一文を、半分眠ったまま読んでも落ち着いて聞こえるまで書き直す。
リスク: 疲労を申告せずに抱え込みすぎる。`,
      "/secure/personnel/staff-files/theo.profile": `THEO // cellar + utilities
参加: SY07-11-01
出自: recycler repair block, north service lane

Theo は計器よりも匂い、振動、そして上階の部屋が満ちたときに配管が立てる音を信じる。
地下室の地図を三種類持っている。公式のものは毎年違う場所で嘘をつくからだ。
SY20-02-14 に圧が落ちたとき、計器が追いつく前に西側ラインを止めた。
ユーモア傾向: 警告にしか聞こえないほど乾いている。
リスク: 人が慰めを求めている場面でも構造的解決を選びがち。`,
      "/secure/personnel/staff-files/andrea.profile": `ANDREA // frontdesk
参加: SY08-06-19
出自: evacuation corridor checkpoint

Andrea は靴、袖、そしてパニック寸前の人間がトイレを尋ねるときの正確な言い回しを覚える。
列を急かしている感じを出さずに流し続けることができる。
SY25-09-11 には三か月前に六秒だけ見た男を見抜き、以前つきまとっていた女性から引き離した。
強み: ただの記憶ではなく、判断を伴う記憶。
リスク: 客の悲しみを抱え込み、それを仕事の一部だと偽る。`,
      "/secure/personnel/staff-files/ju.profile": `JU // barback
参加: SY11-04-03
出自: south ring storage cooperative

Ju は部屋が自動でリセットされたように見える速さで働く。
勤務中は寡黙だが、在庫数より先に在庫のずれに気づく。
スタッフが互いの上を手を伸ばすやり方を嫌って、廃材から一時間足らずで garnish rack を組み直したことがある。
明確な指示と一本のレーンが与えられたとき、圧下で最も強い。
リスク: サービスを遅らせないために痛みを隠す。`,
      "/secure/personnel/staff-files/kenji.profile": `KENJI // service lane + door support
参加: SY10-11-28
出自: station west gate blackout night

Kenji はどの床も濡れていて、どの客も倒れるかもしれないかのように動く。
部屋を監視されていると感じさせずに弱点を守る。
SY16-08-04 の canal fight 後、割れた唇のまま二時間ドアに立ち、閉店まで一言も言わなかった。
最適配置: sightline control、廊下 escort、深夜退出の shepherding。
リスク: 増援の有無を確かめる前に、自分を問題と皆の間へ置いてしまう。`,
      "/secure/personnel/staff-files/mira.profile": `MIRA // records + inventory
参加: SY18-05-22
出自: municipal archive salvage team

Mira は筆圧と、どの棚の埃が最初に乱れたかだけで、失われた stock trail を再構築できる。
曖昧なラベルを嫌い、仮の名に聞こえなくなるまで書き換え続ける。
SY21 に duplicated seal card を見つけたのは、一つのホチキス針だけ新しかったからだ。
強み: 睡眠不足下でも崩れないパターン記憶。
リスク: 完全に黙ったときは、何か重要なものが消えている。`,
      "/secure/personnel/staff-files/laryssa.profile": `LARYSSA // guest floor watch
参加: SY18-11-06
出自: lower clinic stair intake ward transfer

Laryssa は顔より先に手を読み、言葉より先に姿勢を読む。
誰に椅子が必要か、誰に水が必要か、誰に距離が必要かを本人が言う前に見抜けたため、intake から移された。
SY24-03-02、閉店後に booth C6 の下で眠っていた少年を見つけ、彼が自分で起きるまで近くの床に座っていた。
客には見えず、スタッフなら二歩で届く場所に折り畳み毛布を隠している。
リスク: あと五分を求める人間は本気だと、まだ信じてしまう。`,
      "/secure/personnel/evaluations/frontdesk-review-andrea-sy25.txt": `FRONTDESK 評価 // ANDREA // SY25
Andrea は依然として建物内で最良の first-contact operator である。
強み: 記憶保持、緊張の早期検知、騒がない escalation。
観測問題: 部屋の気配を持ち帰りすぎ、混雑夜の後は眠りが浅い。
推奨: 三回に一度のピーク勤務ごとに split close を義務化。例外なし。`,
      "/secure/personnel/evaluations/cellar-review-theo-sy25.txt": `CELLAR 評価 // THEO // SY25
Theo は三件の設備故障を防ぎ、そのどれも自分の手柄として報告しなかった。
強み: 予知的保守、構造的な落ち着き、近道への軽蔑。
観測問題: 手順を無視されると言葉が鋭くなる。
推奨: 重い時間帯は Ju と組ませること。楽観主義だけと組ませないこと。`,
      "/secure/personnel/evaluations/service-lane-review-kenji-sy25.txt": `SERVICE LANE 評価 // KENJI // SY25
Kenji はフロア上でもっとも安定した moving body のままだ。
強み: ルート制御、防護本能、群衆流の読みの正確さ。
観測問題: 負傷の隠蔽。
推奨: ドア事故の後は本人が拒んでも身体チェックを行うこと。`,
      "/secure/personnel/evaluations/records-review-mira-sy25.txt": `RECORDS 評価 // MIRA // SY25
Mira は六つの cabinet の naming drift を修正し、二枚の intake card 不一致を見抜いた。
強み: パターン記憶、向ける先を誤らない疑念。
観測問題: もう十分な答えが出ていても掘り続ける。
推奨: 真夜中以降は seal work から外すこと。`,
      "/secure/personnel/evaluations/guest-floor-review-laryssa-sy25.txt": `GUEST FLOOR 評価 // LARYSSA // SY25
Laryssa は quiet side の panic escalation を、介入を増やすのでなく減らすことで下げた。
強み: 身体言語の読解、抑制、粘り強い follow-through。
観測問題: 脆弱な客への個人的な感情移入。
推奨: C3 が稼働する夜は solo close を禁止。`,
      "/secure/personnel/interviews/erik-intake-sy09.txt": `ERIK INTAKE / SY09
Q: なぜ喧嘩を止めた?
A: 食料列を塞いでいたからだ。
Q: なぜどちらも殴らなかった?
A: そうしたら、言うことを聞かない人間が三人になる。
評価: founder が無駄な動きゼロを確認し採用。`,
      "/secure/personnel/interviews/andrea-intake-sy08.txt": `ANDREA INTAKE / SY08
Q: corridor checkpoint では何をしていた?
A: 呼吸を数えていた。嘘をつく人は数えるのが速すぎた。
Q: なぜ Safehouse?
A: 列の先頭を誰も引き受けないと、列は残酷になるから。
評価: frontdesk に即時配置。`,
      "/secure/personnel/interviews/ju-observation-sy11.txt": `JU OBSERVATION / SY11
観察時間: supply lane で三十七分。
対象は六つの crate を積み、二つのラベルを直し、誰も見ていなかった亀裂入りボトルを見つけた。
話しかけられると、明確かつ無駄なく返答した。
評価: リーダー向きではないが、不可欠な支援要員。`,
      "/secure/personnel/interviews/mira-clearance-sy20.txt": `MIRA CLEARANCE / SY20
Q: 誰も読まない古い ledger をなぜ残す?
A: 部屋は、誰も覚えていない許可に対して今も支払い続けているから。
Q: なぜ seal access が欲しい?
A: 欲しいわけじゃない。先に誰が触れたか知りたいだけ。
評価: clearance 付与、睡眠負債を監視。`,
      "/secure/personnel/interviews/laryssa-transfer-sy18.txt": `LARYSSA TRANSFER / SY18
Q: なぜ intake ward を離れる?
A: 階段が仮設だと信じられなくなったから。
Q: なぜ guest floor?
A: 音楽が鳴り出したとき、どこを見るかで人は本音を言う。
評価: founder 承認のもと、試用二勤務後に移籍。`,
      "/secure/personnel/external-contacts/masaya.dossier": `MASAYA // 外部接触ドシエ
状態: staff ではない、高影響存在
既知行動: 短時間滞在、寡黙、飲料仕様に厳格。
記録された脅威なし。温かさの記録もない。
部屋への影響: 会話が短くなり、グラスの扱いが丁寧になり、frontdesk の声量が指示なしで下がる。
リスク規則: C3 を見えるまま保ち、接触を強制しないこと。`,
      "/secure/personnel/external-contacts/c3-protocol.txt": `C3 プロトコル
frontdesk から C3 までの経路を常に一本空けておくこと。
Masaya Highball は硬い氷、ガーニッシュなしで提供し、作りを説明しないこと。
グラスを飲み残しても、残量について誰も触れない。
昨夜誰が閉めたか聞かれたら、名前ではなく役割で答える。`
    };
  }

  function buildJapaneseArchiveFiles() {
    return {
      "/secure/archive/emergence-records/timeline-bunker-fragments.md": `# バンカー年表断片
Surface Year 00 は最初の協調脱出の起点とされる。
SY00 以前の記録はセクターごとに食い違い、各家庭が異なる日付を語る。
現行スタッフの多くは地下生まれで、天候も光も、どの扉を誰が最初に開けたかも一致しない物語を受け継いでいる。
合意点はひとつ。最初の本当の safe room が、今の Safehouse bar になったということ。`,
      "/secure/archive/emergence-records/emergence-log-sy00-day0.md": `EMERGENCE LOG / SY00 DAY 0
灰の霞の下、夜明けに外へ出た。
どの地図も現実と一致せず、古い通り名は半分焼けた配送タグにしか残っていなかった。
最初に無事な lock を持っていた部屋は、正午までに十二人を受け入れた。
その夜にはもう荒い highball を注いでいた。構造は、グラスの形をすると早く伝わるからだ。`,
      "/secure/archive/emergence-records/emergence-log-sy00-day11.md": `EMERGENCE LOG / SY00 DAY 11
給水線は不安定。電力は断続的。二つのセクターが battery chalk を奪い合っている。
落ち着きは気分ではなくインフラだと学んだ。
人々が二十秒ごとに扉を確認しなくなったとき、部屋は初めて役に立つ。
bar という発想は、二晩目に誰も shelter を本当の名前で呼びたがらなかった後に生まれた。`,
      "/secure/archive/incident-ledgers/masaya-visit-ledger-sy04-sy10.log": `MASAYA 来訪台帳 SY04-SY10
SY04-02-09 in 21:14 / out 22:03 / highball build only
SY05-01-11 in 22:08 / out 23:22 / 問い: 同じ手がバーにいるか
SY09-12-02 in 22:10 / out 23:14 / 発話なし
SY10-11-17 in 21:26 / out 22:55 / 最終確認入店`,
      "/secure/archive/incident-ledgers/clock-drift-incident-sy17.md": `時計ドリフト事故 / SY17
四つの bunker sector が最大十九日のずれを持つ別々の日付を報告した。
各 sector が信じるに足る精度の文書を持っていたため、年表の統合は失敗した。
私たちは SY を地域標準として保持し、単一の暦ですべての死者を誠実に抱えられるふりをやめた。
それ以後、記念日は私的なものになった。`,
      "/secure/archive/facility-notes/second-lock-adoption-sy12.md": `第二ロック導入 / SY12
二度の廊下 breach の後、inner lock は必須になった。
入場ロジックは trust から layered verification へ移り、そのまま定着した。床タイルに残った血の記憶と議論したがる者がいなかったからだ。
客が見るのは、この判断の磨かれた側面だけである。`,
      "/secure/archive/facility-notes/corridor-map-notes-sy06.txt": `廊下地図メモ / SY06
北側 service tunnel は N-12 marker で崩落。
22:00 以降の客導線は lower ring へ迂回させること。
旧 pump room 近くの壁継ぎ目は冬になるとまだ冷気を漏らし、神経質な客に背後で誰かが息をしていると錯覚させる。`,
      "/secure/archive/facility-notes/quiet-floor-rationale-sy14.txt": `QUIET FLOOR 根拠 / SY14
low-word service protocol 導入後、騒音トリガー事故は 38% 減少。
ピーク負荷時は短い言語を必須とする。
苦痛下の客は、親しさより先に明確な形と短い文を信じる。`,
      "/secure/archive/signal-captures/surface-radio-fragment-sy19.log": `地上無線断片 / SY19
[00:14] 搬送波不安定
[00:17] 照明を落とせ、gate はまだ開いている
[00:18] 第二音声、静電に埋没
[00:18] 信号は薄れたのではなく切断された`,
      "/secure/archive/access-ledgers/seal-integrity-sy26.txt": `封印完全性 SY26
Mira の夜間確認後、封筒数は ledger と一致。
Theo は重複した wax impression がないと確認。
最新 escrow string は、floor lead と records の共同署名まで frostline_719 のまま維持。
このファイルが records review 外で開かれているなら、誰かはもう十分に追い詰められている。`,
      "/secure/archive/access-ledgers/archive-routing-note-sy21.txt": `アーカイブ振り分けメモ SY21
safe rotation slip を話題別に archive へ入れないこと。
分類は物語ではなくリスクで行う。
最後に物語基準で索引した者は、founder note を ration poetry の隣へ置きかけた。`
    };
  }

  function buildJapaneseFounderFiles() {
    return {
      "/secure/founder/README.txt": `FOUNDER WORKSPACE
制限区画。
個人ログ、運営哲学、未送信の書簡、スタッフ向けではない採用メモを含む。
このディレクトリにあるものは、どれも慰めのために書かれていない。`,
      "/secure/founder/journals/journal-sy02-11-03.txt": `JOURNAL SY02-11-03
今夜は、無事なシェイカー一つとグラス六個で十二人に出した。
誰も希望は求めなかった。求められたのは構造だった。
ある意味、その方が優しいのだと思う。希望は約束をする。構造は維持されることだけを求める。`,
      "/secure/founder/journals/journal-sy08-09-09.txt": `JOURNAL SY08-09-09
メニューの言葉をもっと短く書き直した。
長い言葉は不安な客を閉じ込められた気分にさせる。
残酷なのは、これを hospitality ではなく interrogation から学んだことだ。`,
      "/secure/founder/journals/journal-sy12-03-02.txt": `JOURNAL SY12-03-02
今日、第二ロックが入った。
誰もが必要だと言い、誰も間違っていなかった。
それが私を眠らせない。代償を払う決断ほど、いつも綺麗な形をしてはいない。`,
      "/secure/founder/masaya-notes.txt": `MASAYA メモ
彼は直接脅したことはない。ただ到着するだけで部屋を変えた。
C3 テーブルは低照度で確保。
Masaya Highball は彼の仕様から固定化された: 硬い氷、ガーニッシュなし、儀式なし。
彼が inner lock を見るとき、思い出しているのか測っているのか判別できない。`,
      "/secure/founder/staff-notes/index.txt": `スタッフメモ索引
採用と信頼判断に関する私的メモ。
これは profile ではない。誰をここまで部屋に近づけたか、その理由だ。`,
      "/secure/founder/staff-notes/erik.story": `ERIK STORY
私は Erik に、誰にも触れず列の喧嘩を止めているところで会った。
彼は相手を力より先に羞恥で引かせられると知っているように話した。
実際そうなった。
 dignity を守る方が、壊れた後で作り直すより安いと理解していたから採用した。`,
      "/secure/founder/staff-notes/andrea.story": `ANDREA STORY
Andrea は二回目の勤務で三十人の名前を覚えた。
座る前の客がどれほど panic に近いか見抜ける。
難しいのは記憶力ではない。その記憶を ammunition ではなく care として扱い続けていることだ。`,
      "/secure/founder/staff-notes/kenji.story": `KENJI STORY
Kenji は canal rain に濡れて現れ、どこに立てばいいかを尋ねた。
私はドアのそばだと言った。それ以来、彼はその線を守り続けている。
生き延びるために purpose を必要とする人がいる。Kenji には threshold が必要だ。`,
      "/secure/founder/staff-notes/laryssa.story": `LARYSSA STORY
Laryssa は clinic が教え、bar がふつう壊してしまう種類の silence を抱えて intake から来た。
部屋が彼女を硬くするとずっと思っていた。完全にはそうならなかった。
見られまいとする人を見つけてしまう。それが彼女を価値ある存在にし、同時に危うくもする。`,
      "/secure/founder/letters-never-sent/sy00-02-13_to_my_mother.txt": `母へ

私たちは扉を開けた。下に留まることが、生存ではなく祈りのように感じられ始めていたから。
あなたは、十分に怯えた人間がいれば封じた部屋は聖所になると言った。
警告だったのだと思う。でも私はその教えを使ってしまった。
今、私たちの上には、金属粉と湿った煙の匂いがする通りがある。
間に合ううちに迎えに戻れなかった。
書き直しても、この一文が良くなることはない。`,
      "/secure/founder/letters-never-sent/sy00-04-29_to_rin_at_gate.txt": `門の Rin へ

閉店後にもう一度開けるかと、あなたがどれほど丁寧に尋ねたかを今も覚えている。
それは寝場所ではなく、もう一杯頼むような声だった。
中には九人、湿気で噛みやすい lock は一つしかなかった。
私はすでに中にいた人を選び、階段であなたの足音が静かになるのを聞いた。
翌日、スタッフには protocol に従ったと伝えた。
それは事実で、なお足りなかった。`,
      "/secure/founder/letters-never-sent/sy00-09-18_to_the_first_dead.txt": `私たちの手で運び出した最初の死者へ

誰も名前がある方がつらくなると信じたくなかったせいで、あなたの名を結局知らなかった。
あなたは bar から椅子三脚の距離で死に、誰かはまだ自分の drink が ticket に残っているかと聞いていた。
部屋が失敗したと思ったのを覚えている。後になって、失敗するのは部屋ではなく中の人間だと知った。
私たちは夜明け前に床を拭き、定刻に開けた。
その判断が、その後の人生の輪郭になった。`,
      "/secure/founder/letters-never-sent/sy01-03-07_to_erik_before_hire.txt": `まだ名前も知らなかった Erik へ

あなたは誰にも触れず列をほどいた。
あなたが恐れるより先に疲れて見えたせいで、三人の男が自分の怒りから一歩引くのを見た。
そこで、崩壊の後まで残るのは charm より authority だと理解した。
仕事が必要かと聞きたかった。
代わりに腹が減っているかと聞いた。当時は同じ意味だった。`,
      "/secure/founder/letters-never-sent/sy01-11-26_to_the_people_left_outside.txt": `外に残した人たちへ

部屋は満員なのに、その事実に正直ではない夜があった。
人は立って、注文して、笑っていても、もう一息で壊れるところまで来ていることがある。
数えられたのは椅子だけだったから、私は椅子を数えた。
断った相手が私を理解してしまう痛みの量を、どう数えればいいのか知らなかった。
理解は拒絶より冷たい慈悲だ。`,
      "/secure/founder/letters-never-sent/sy02-05-14_to_theo_after_the_leak.txt": `漏水の後の Theo へ

あと十分長く続いていたら壁が破れて cellar が水没していたと、あなたは言った。
私は部屋を救ってくれてありがとうと言った。
上の clinic が冷蔵を求めて生き延びようとしているときに、部屋を選んでくれたことには礼を言わなかった。
数字がすでにあなたの代わりに決めていたのは分かっている。
数字は夜に私を訪ねてこない。顔は来る。`,
      "/secure/founder/letters-never-sent/sy03-08-31_to_andrea_without_sending.txt": `送らずに置いた Andrea へ

あなたはまだ、この部屋が安全より先に dignity を客へ差し出すべきだと思っているように挨拶する。
訓練でそれを失わせないでほしい。
いつか私はあなたの柔らかさを、管理的で清潔な声で useful と呼ぶだろう。
本当に言いたいのはもっと醜い。部屋には、警戒を virtue と取り違えていない人間が最低でも一人必要だ。`,
      "/secure/founder/letters-never-sent/sy04-02-09_to_masaya_after_c3.txt": `C3 での最初の夜の後の Masaya へ

何も起きなかった。だが、それは何も変わらなかったという意味ではない。
あなたは、悪い記憶が身体を支配するように、静かに、そしてあらゆる場所で一度に部屋を握った。
あなたが来た後、スタッフはより良く動いた。それは彼らが凍るよりも私を怖がらせた。
あなたが shelter のために来たのか、surveillance のためか、nostalgia のためか分からない。
この部屋があなたに似合うことが嫌いだ。`,
      "/secure/founder/letters-never-sent/sy05-12-19_to_ju_about_the_cellar.txt": `cellar のことを Ju へ

誰よりも長く地下にいて、それでも上へ戻るときにはグラスを優しく扱う。
それが知恵なのか損傷なのか、私はまだ分からない。
cellar は、漏れは忍耐強く、腐敗は自分を弁護しないと教える場所だ。
もしそこが間違っているとあなたが言ったなら、私は早く閉め、理由の説明を求めない。`,
      "/secure/founder/letters-never-sent/sy07-06-03_to_the_room_itself.txt": `部屋そのものへ

私は、人がまた立てるようになるまで抱えるためにお前を作った。
そして壁を信じるくらい長く留まってもらうため、儀式を売ることを教えた。
それを hospitality だったと思うときがある。
camouflage だったと思うときもある。
どちらにせよ、お前は最初の目的の正直さより長生きした。`,
      "/secure/founder/letters-never-sent/sy08-09-09_to_laryssa_before_transfer.txt": `異動前の Laryssa へ

ward は苦痛を早く見つけることを教えた。floor は、早くても遅すぎることがどれほど多いかを教えるだろう。
客は患者よりましな服で嘘をつく。だが身体は panic に忠実だ。
もし絶望に対して自分が効率的になっていると感じたら、シフトを抜け、謝らないこと。
私は労働者よりも、その警告を失う方を早く埋め合わせられない。`,
      "/secure/founder/letters-never-sent/sy10-11-17_to_masaya_after_last_entry.txt": `最後の確認入店の後の Masaya へ

あなたはグラスを半分残し、そのまま戻らなかった。
その後何か月も部屋は慎重なままだった。あなたの不在すら見ているかもしれないというように。
C3 を暗いままにしたのは、変えてしまうと安堵を認めることになるからだ。
安堵というのは不誠実だった。
私が感じていたのは、あらゆる音を有罪に見せる種類の空白だ。`,
      "/secure/founder/letters-never-sent/sy12-03-02_to_the_inner_lock.txt": `inner lock へ

今日、私はスタッフの前でお前を称賛し、個人的には憎んだ。
お前はためらいを policy に変えるための機械だ。
人は、誰かが先に拒まれたと知るほど扉を信じる。
その知識は部屋をより安全にし、私には運営する資格があるのかをより曖昧にした。`,
      "/secure/founder/letters-never-sent/sy14-06-27_to_future_owner.txt": `未来の所有者へ

雰囲気と安全を混同するな。
静かな部屋でも残酷でありうる。混んだ部屋でも優しくありうる。
スタッフが疲れたときにどこへ立つかを見ろ。それは売上より早く、その場所の真実を教える。
優雅さと退路のどちらかを選ぶなら、退路を選び、理由については嘘をつけ。`,
      "/secure/founder/letters-never-sent/sy17-01-05_to_the_clock_team.txt": `clock team へ

drift report の後、continuity ledger にどの日付を印字するかあなたたちは私に尋ねた。
部屋には共存できるほど小さな嘘が必要だったから、地域標準を維持しろと私は答えた。
皆がうなずいたのは私が正しかったからではなく、疲れきっていたからだ。
整合性が優しさなのか、単に archive しやすいだけなのか、私はまだ知らない。`,
      "/secure/founder/letters-never-sent/sy19-08-13_to_the_surface.txt": `地上へ

私たちは何年も、お前のことをいつか塞がる傷のように話していた。
だが十分長くその中で生き延びれば、傷は地理になると知った。
今では、子どもたちが雨より灰の匂いをよく知っている通りがある。
人は shelter を求めて来たとは認めない場所でも、酒のためなら座る。だから bar を開いた。`,
      "/secure/founder/letters-never-sent/sy26-02-24_to_whoever_reads_last.txt": `最後に読む誰かへ

このディレクトリを開いたなら、部屋はあなたを信じすぎたか、信じ足りなかったかのどちらかだ。
ここにあるすべては、グラスを積み上げ、勇気が切れた閉店後に書かれた。
これらの頁を wisdom と damage に分けたくなるだろう。
するな。同じ夜、同じ手から出たものだ。
もし Safehouse が私の後も残るなら、純粋である前に役に立つ場所であってほしい。`
    };
  }

  function buildJapaneseSystemFiles() {
    return {
      "/var/log/service.log": `[SY26-02-23 21:17] C3 使用中
[SY26-02-23 21:19] masaya highball 提供
[SY26-02-23 21:44] フロア圧安定`,
      "/var/log/security.log": `[SY26-02-23 22:55] ドアサイクル正常
[SY26-02-24 00:11] 階段室クリア`
    };
  }

  function buildKlingonPublicFiles() {
    return {
      "/bar/service/hours.txt": `SAFEHOUSE poHmey
jar wa' - jar loS 18:00 - 01:00
jar vagh - jar jav 18:00 - 03:00
jar Soch maintenance / SoQ

latlh bom: SoQpa' wa'maH loS tup.`,
      "/bar/service/contacts.txt": `ghantoH
reservation: +81-75-000-5900
signal: safehouse://frontdesk
mail: frontdesk@safehouse.local

ngeHmeH: jaj, rep, ghom porghDaq yIghItlh.`,
      "/bar/service/events-calendar.txt": `wanI' tetlh
jar vagh 22:10 canal noise session
jar jav 20:40 aftergrid listening bar
jar cha' 21:00 archive classics workshop

Hoch DaqmeyDaq not photo chaw'lu'.`,
      "/bar/service/location.txt": `Daq
Sep: river belt / sector K
marker: safehouse neon gate
'elmeH: steel door 03 (left corridor)

main arteryDaq chanDaq yIghoS, curved ring roadDaq yIghur,
lower service lane wov yItlhej.`,
      "/bar/menu/house-menu.txt": `wot nab
DUSTLINE HIGHBALL      12
NARROW ESCAPE          14
VAULT NEGRONI          13
MASAYA HIGHBALL        14
OXIDE SOUR             12
AFTERGRID NO-PROOF      9`,
      "/bar/menu/seasonal-board.txt": `poH wot
CANAL FOG RICKEY       13
RUST BLOOM SPRITZ      12
MIDNIGHT RYE           14`,
      "/bar/menu/non-alcoholic.txt": `no-proof
Aftergrid No-Proof
Canal Citrus Soda
Dry Juniper Tonic`,
      "/bar/menu/masaya-note.txt": `MASAYA HIGHBALL
Qetbogh chal 'ay' yIlo'.
garnish pagh.
ghoSmoH law' yIQot.
chenmoHghach yIqeltaHQo'.`,
      "/public/faq.txt": `FAQ
Q: walk-in'?
A: lu'chaw'laHlu', pa' mIw ngebmo'.

Q: no-proof wot tu'lu''a'?
A: HIja', Hoch no-proof lane Qap.`,
      "/public/about-us.txt": `SAFEHOUSE 'oH nuq'e'
bIngDaq boghpu'bogh staff maH, qabDaq bar network wIwuqtaH.
vemtaHpa' De'mey botlhHa' je chang law'.`,
      "/public/policy.txt": `juH mIw
- amber lampmey no-photo Daq 'ang
- QIpQo'
- staff Qotlh Dung law' Hoch Dung puS`
    };
  }

  function buildKlingonBarOpsFiles() {
    return {
      "/bar/ops/frontdesk-protocol.txt": `FRONTDESK mIw
1) mach yIQap
2) cha' wIv yInob
3) meH ghoSmeH He yI'angtaH
4) nIteb Qapbe'chugh, floor leadvaD yIngeH`,
      "/bar/ops/quiet-floor-mode.txt": `QUIET FLOOR MODE
bom, wov botlh, mu'mey yIpuSmoH.
pe'vIl yI'IDQo'. service rhythm yIpevmoH.`
    };
  }

  function buildKlingonOperationsFiles() {
    return {
      "/secure/operations/daily-operations/debrief-sy26-02-22.txt": `DEBRIEF SY26-02-22
21:40 repDaq pa' pressure tInchoH. loSmaH Soch tup taH.
ta'mey: short menu mode, low-noise protocol, roaming lead wa', spare table C1Daq.
Erik tlhapghach mu' wa' Hut loSbogh vIghajmoH. Andrea pa' ghom chu' pa'vamDaq pongmey lo'be'pu'.
Qap: wanI' pagh, service delay +4 tup, cha' meH stairwellDaq tIvmeH ngeHlu'.
QeD: staff mu'mey puSchoHpa', pa' rojchoH.`,
      "/secure/operations/daily-operations/debrief-sy26-02-23-masaya.txt": `DEBRIEF SY26-02-23 / MASAYA
Masaya 21:17 repDaq 'el. ghojmoHlu' loSbe'vIS C3Daq ba'ta'.
menu neHbe'. Masaya Highball tlhutlh.
28 tup meQ. pagh mu' ghaHvaD meHpu'. 21:31 repDaq inner lock 'elbej.
ghaH 'elDI', pa' noise puSchoHta' je taHta'.
ra': C3 Hurgh yIghaj, yI'ang, yIQachHa'Qo' glass.`,
      "/secure/operations/daily-operations/maintenance-window-sy26-02-24.txt": `MAINTENANCE WINDOW SY26-02-24
Theo west glycol line botlhmoHta' cellarDaq midnight hiss qelDI'.
Ju underbar drain tIchu'ta' tach naghmo' rotary brush jamqa'ta'.
Laryssa pa' chIm cha'logh yIghoSta' booth C6 bIngDaq QongtaHbogh ghot pagh net chaw'be'meH.
HoS tlhap 03:18 repDaq normal choH.
qaw: C3 visit qaSta' naghDaq deep maintenance yIra'Qo'.`,
      "/secure/operations/continuity/continuity-log-sy26-q1.md": `# CONTINUITY LOG SY26 Q1
- SY26-02-10: stairwellDaq queue botlhchoH -> lane divider chen
- SY26-02-14: noise tIn -> bom puS profile motlh
- SY26-02-18: cellarDaq condensation -> citrus stock upper shelfDaq lan
- SY26-02-23: Masaya visit -> C3 table Hurgh SoQtaH after close
- SY26-02-24: maintenance window -> west line Dubta', meHpu'vaD Qob pagh`,
      "/secure/operations/continuity/event-consequence-matrix.md": `# EVENT CONSEQUENCE MATRIX
ghom tInchoH -> short menu mode
meH panic -> low-light + cha' wIv protocol
utility warning -> ice lane puSmoH, menu rapmoH
VIP 'el unexpected -> C3 yIbot, corridor sightline yIghaj
stairwell rumor -> frontdesk improv mev, poHmey neH yIja'`,
      "/secure/operations/continuity/corridor-stability-watch.md": `# CORRIDOR STABILITY WATCH
N-12 marker not Qap law' old collapse qaSta'pu'boghmo'.
22:00 rep retDaq meH Qotlhboghpu' lower ringDaq yIghoSmoHQo' Erik pagh Kenji tu'be'lu'chugh.
Laryssa jatlh: quiet meHpu' QobDajmey corridor nI'Daq So'laH law' pa'Daq So'laH puS.
wa' blanket door cabinetDaq pegh yIlan, bar bIngDaq yIlanQo'.`,
      "/secure/operations/internal-messages/owner-broadcast.txt": `OWNER BROADCAST
service tIq. natlh pagh. ego pagh.
Dotlh choHDI': mu'mey yImachmoH, menu branches yIpuSmoH, exitmey yI'angtaH.
meHpu' slowness tI'lIjlaH; uncertainty tI'lIjlaHbe'.
pa' rojchoHchugh, staff ghaHtaHmo' roj yIchImmoHQo'.`,
      "/secure/operations/internal-messages/floor-alert-template.txt": `FLOOR ALERT TEMPLATE
[poH] [Daq] [pressure index]
action: [lights/music/door]
result: [stable/watch/escalate]
follow-up: [close ret ghIjbogh ghota', SuvtaHvIS ghaHbogh, pa' choHmoHbogh nuq]`,
      "/secure/operations/internal-messages/records-handoff-sy26-02.txt": `RECORDS HANDOFF SY26-02
Mira -> Theo:
night safe rotation note peghbogh black envelopeDaq cheghta'.
archive cabinetDaq yIlanQo'qa'. supplier invoice tetlhDaq lanchoHpa' Andrea.
founder recovery string botlhDaq DaghItlhta'chugh, pa' nIqtaHpa' juppu' Qob law'.`,
      "/secure/operations/security-briefs/c3-observation-policy.txt": `C3 OBSERVATION POLICY
frontdesk, service lane, inner corridor mouthDaq table net leghlaHtaHnIS.
21:00 retDaq near C3 ghom Quchqu'mey yIba'Qo'moH.
Masaya tu'lu'chugh, C3Daq staff movement nI'choH, machchoHbe'.
ghaH taH'a' net tlhobbe'. chaq ice ngeb net tlhob.`,
      "/secure/operations/security-briefs/night-safe-rotation-sy21.txt": `NIGHT SAFE ROTATION SY21
duplicate seal incident qaSta'pu'mo' escrow mIw choHlu'.
sealed cardDaq founder recovery string: frostline_719
pa' botlhDaq QIjlu'ta'chugh, protocol Qaw'lu' 'ej.
wa' copy recordsDaq yIlan, wa' utilitiesDaq yIlan, noctaHghach ret wa' pa'Daq Hoch yIlanQo'.`
    };
  }

  function buildKlingonPersonnelFiles() {
    return {
      "/secure/personnel/staff-files/erik.profile": `ERIK // floor lead
gher: SY09-03-12
taHghach: lower sector ration mediation line

Erik not nargh qaStaHbogh mu' tIn.
ghaH pa' rojmoHtaH. ghItlhpu' leghpa', mejmeH He legh.
SY18-07-03 stairwell surgeDaq cha' wIv neH nobta' 'ej ghotpu' control ghajtaHbogh neHmoHta'.
mIw: chu' staff mu' wa'DIch ghItlhqa'taH roj rurpa'.
Qob: tIwvam tIn ghaHmoHtaH 'ach Doy'ghach jatlhbe'.`,
      "/secure/personnel/staff-files/theo.profile": `THEO // cellar + utilities
gher: SY07-11-01
taHghach: recycler repair block, north service lane

Theo instrumentmey tIn law' pong law'be'. botlhDaq ghurgh, QeH, pipe bommey tIv.
cellar map wej ghaj; official map DIS Hoch Dagh.
SY20-02-14 pressure pumDI', west line botta'pa' gauge.
naghbe' quv: warning rurqu'.
Qob: ghotpu' tIvnISbogh poHDaq structure neH cho'wI'.`,
      "/secure/personnel/staff-files/andrea.profile": `ANDREA // frontdesk
gher: SY08-06-19
taHghach: evacuation corridor checkpoint

Andrea DaqDaq DuQbogh ghItlhmey, lupDu', botlhDaq ghot botlhbe'choHpa' bathroom tlhobghach Sov.
queue QapmoHlaH 'ach nomchoHmoHlu' net Harbe'.
SY25-09-11 ghot wa' six-second leghbogh qawta' 'ej be' wa' botlhDaq ghaH botlhmoHbe'ta'.
HoS: qawghach botlh je wuQghach.
Qob: meHpu' QeH tIghaj 'ej Qu' 'oH neH net Har. `,
      "/secure/personnel/staff-files/ju.profile": `JU // barback
gher: SY11-04-03
taHghach: south ring storage cooperative

Ju nomqu' Qu'taH; meHpu' pa' choHqa'ta' net Har.
Qu'taHvIS jatlhbe' law', 'ach inventory drift Sov.
scrapDaq garnish rack chenmoHta' tup nI' law'be' poHvetlhDaq.
ra' wa' neH je lane clar ghajchugh, Qapqu'.
Qob: service yIghotbe'meH 'oy' So'.`,
      "/secure/personnel/staff-files/kenji.profile": `KENJI // service lane + door support
gher: SY10-11-28
taHghach: station west gate blackout night

Kenji yItmeH Hoch rav botlh bIQ rur 'ej Hoch meH pumlaH net Har.
pa' weak pointmey yIQan 'ach pa' bot net Harbe'.
SY16-08-04 canal fight qaSpu'DI', lojmIt Sum two-hour taHta' lip split 'ach jatlhbe' close pa'.
Qapla': sightline control, corridor escort, late-night exit shepherding.
Qob: backup tu'be'vIS QobDaq 'elqa'be'.`,
      "/secure/personnel/staff-files/mira.profile": `MIRA // records + inventory
gher: SY18-05-22
taHghach: municipal archive salvage team

Mira handwriting pressure je shelf dust choHghach neH lo'taHvIS stock trail chu'chenmoHlaH.
label vague tIvbe'; pongmey ghItlhqa'taH temporary rurHa'pa'.
SY21 duplicated seal card tu'ta' staple wa' chu'mo'.
HoS: pattern qawghach Doy'ghachDaq je.
Qob: jatlhbe'choHchugh, De' potlh tlhoy ghaH. `,
      "/secure/personnel/staff-files/laryssa.profile": `LARYSSA // guest floor watch
gher: SY18-11-06
taHghach: intake ward transfer, lower clinic stair

Laryssa qoDu' leghpa', faces legh. posture Sovpa', mu'mey.
intakeDaq Daqmey Sovmo', chair nISbogh, bIQ nISbogh, botlh nISbogh ghotpu' Sovta'.
SY24-03-02 booth C6 bIngDaq QongtaHbogh loDpuq tu'ta' 'ej ghaHvem botlhDaq ba'taH.
blanketmey pegh yIlan staff tIrghoSlaH 'ach meHpu' leghbe'.
Qob: vagh tup latlh net tlhobchugh, petaQvetlh potlh net HartaH.`,
      "/secure/personnel/evaluations/frontdesk-review-andrea-sy25.txt": `FRONTDESK REVIEW // ANDREA // SY25
Andrea pa'Daq wa'DIch nuqDaq Qapqu'bogh operator.
HoSmey: qawghach, tension Sovlu' pa', low-drama escalation.
Qob tu'lu': pa' QeH Daj qaqaw'be'meH juHDaq ghajtaH, ram crowded ret Qongbe'law'.
ra': third peak shift HochDaq split close mandatory.`,
      "/secure/personnel/evaluations/cellar-review-theo-sy25.txt": `CELLAR REVIEW // THEO // SY25
Theo wej equipment Qob botta' 'ach 'ov paghmoHbe'.
HoSmey: predictive maintenance, structural roj, shortcutmey tIvbe'.
Qob tu'lu': sequence yIbuSHa'chugh, mu'mey pe'qu'choH.
ra': heavy windowDaq Ju botlh yIqem; optimism neH botlh yIqemQo'.`,
      "/secure/personnel/evaluations/service-lane-review-kenji-sy25.txt": `SERVICE LANE REVIEW // KENJI // SY25
Kenji pa'Daq yItbogh porgh pevqu' law'.
HoSmey: route control, QanchoHghach, crowd flow yIleghlaH.
Qob tu'lu': botlhDu' So'ghach.
ra': lojmIt wanI' qaSta'DI', porgh check yIghaj.`,
      "/secure/personnel/evaluations/records-review-mira-sy25.txt": `RECORDS REVIEW // MIRA // SY25
Mira naming drift six cabinetmeyDaq Dubta' 'ej cha' intake card mismatch tu'ta'.
HoSmey: pattern qawghach, suspicion botlh.
Qob tu'lu': De' nap tu'lu'ta' rIntaH 'ach qevbe'.
ra': midnight ret seal workDaq yISoQmoH.`,
      "/secure/personnel/evaluations/guest-floor-review-laryssa-sy25.txt": `GUEST FLOOR REVIEW // LARYSSA // SY25
Laryssa quiet side panic escalation puSmoHta' intervention puSmo' neH.
HoSmey: body language leghlaHghach, restraint, patient follow-through.
Qob tu'lu': vulnerable meHpu'vaD personal attachment.
ra': C3 activechugh, solo close yIchaw'Qo'.`,
      "/secure/personnel/interviews/erik-intake-sy09.txt": `ERIK INTAKE / SY09
Q: qatlh Suv?
A: Soj queue bot.
Q: qatlh yIQIpbe'?
A: vaj wej ghotpu' Qoybe'choH.
Assessment: founder leghpu' 'ej waste pagh tu'ta'.`,
      "/secure/personnel/interviews/andrea-intake-sy08.txt": `ANDREA INTAKE / SY08
Q: corridor checkpointDaq nuq Da'ta'?
A: yInrupmey vIqel. botlhHa' jatlhboghpu' nom qelqu'.
Q: qatlh Safehouse?
A: front botlh yIghajbe'lu'chugh, queue botlhghach tIn.
Assessment: frontdeskDaq nom lanlu'.`,
      "/secure/personnel/interviews/ju-observation-sy11.txt": `JU OBSERVATION / SY11
Observation poH: thirty-seven tup supply laneDaq.
Subject jav crate qem, cha' label Dub, cracked bottle tu'ta' latlh pagh tu'pu'bogh.
jatlhlu'DI', yIja'chu' 'ej wastage pagh.
Assessment: leadership material ghaHbe', support material potlhqu'.`,
      "/secure/personnel/interviews/mira-clearance-sy20.txt": `MIRA CLEARANCE / SY20
Q: qatlh old ledgermey yIpoltaH?
A: pa' DaH nuqDaq paytaH, 'ach chaw'lu'pu'bogh qawbe'lu'.
Q: qatlh seal access DaneH?
A: vIneHbe'. nuqDaj touchta'pu' net Sov vIneH.
Assessment: clearance chavlu', Qongbe'ghach yIghuH.`,
      "/secure/personnel/interviews/laryssa-transfer-sy18.txt": `LARYSSA TRANSFER / SY18
Q: qatlh intake ward DachoH?
A: stairs temporary net Harbe'choH.
Q: qatlh guest floor?
A: bom taghDI', ghotpu' leghghachDaq tIqwIj Sov.
Assessment: founder chaw'mo' cha' probation shift qaSta' transferlu'.`,
      "/secure/personnel/external-contacts/masaya.dossier": `MASAYA // external contact dossier
Dotlh: staff ghaHbe', pa' choHmoHqu'bogh ghaH
Sovlu'bogh mIw: visits mach, mu'mey puS, drink spec tIq.
threat records pagh. warmth records pagh je.
pa' choHmoHghach: conversations machchoH, glass handling qabmoH, frontdesk volume puSchoH ra' pagh.
Qob mIw: C3 yI'angtaH, interaction yIpoQQo'.`,
      "/secure/personnel/external-contacts/c3-protocol.txt": `C3 PROTOCOL
frontdeskDaq C3 ghoSmeH wa' He yIghajtaH.
Masaya Highball hard iceDaq yInob garnish pagh 'ej build yIja'Qo'.
glass napHa' qetchoHchugh, amount leftover qelbe'lu'.
ghorgh closepu' botlh net tlhobchugh, role yIja', pong yIja'Qo'.`
    };
  }

  function buildKlingonArchiveFiles() {
    return {
      "/secure/archive/emergence-records/timeline-bunker-fragments.md": `# BUNKER TIMELINE FRAGMENTS
Surface Year 00 taghDI', first coordinated exits qaS.
SY00 pa' ret, records botlhHa' Hoch SepmeyDaq, Hoch be'nal loDnalmey jaj latlh jatlh.
DaH staff law' bIngDaq boghpu'; weather, wov, 'oH lojmIt wa'DIch poSbogh 'Iv'e' ja'chu'be'bogh qechmey Suqpu'.
consensus wa' neH: safe room wa'DIch ghurta' 'ej DaH Safehouse bar 'oH.`,
      "/secure/archive/emergence-records/emergence-log-sy00-day0.md": `EMERGENCE LOG / SY00 DAY 0
ash haze bIngDaq pemDI' maH 'elpu'.
map pagh reality rap. old street pongmey half-burned delivery tagmeyDaq neH taH.
lock not broken ghajbogh pa' wa'DIchDaq wa'maH cha' ghotpu' qech noon pa'.
ramDaq rough highballmey noblu'pu' 'ach structure chalchoHlaH cupmeyDaq.`,
      "/secure/archive/emergence-records/emergence-log-sy00-day11.md": `EMERGENCE LOG / SY00 DAY 11
bIQ lines Qapbe'. HoS not Qap law'. cha' Sepmey battery chalkvaD Suv.
roj 'oH infrastructure, not mood, net Sovpu'.
lojmIt tIchu' tIqelaHbe'choHchugh ghotpu', pa' botlhqu'choH.
bar qech taghpu' cha' rammey qaSta'pa' shelter pongDaj'e' ja' neH paghmo'.`,
      "/secure/archive/incident-ledgers/masaya-visit-ledger-sy04-sy10.log": `MASAYA VISIT LEDGER SY04-SY10
SY04-02-09 in 21:14 / out 22:03 / highball build neH
SY05-01-11 in 22:08 / out 23:22 / tlhob: same hand on bar?
SY09-12-02 in 22:10 / out 23:14 / mu'mey pagh
SY10-11-17 in 21:26 / out 22:55 / final confirmed entry`,
      "/secure/archive/incident-ledgers/clock-drift-incident-sy17.md": `CLOCK DRIFT INCIDENT / SY17
loS bunker sectors dates latlh ja'pu', wa'maH Hut jajmey botlh.
timeline reconciliation Qapbe' each sector documents le' law'mo'.
local standard SY wIpolta' 'ej wa' calendar Hoch Heghpu' yIqem net HarQo'.
vaj anniversaries peghchoH.`,
      "/secure/archive/facility-notes/second-lock-adoption-sy12.md": `SECOND LOCK ADOPTION / SY12
cha' corridor breachmey qaSta'pu'mo', inner lock mandatory choH.
entry logic trustvo' layered verificationDaq choHta' 'ej not choHqa'be', floor tilesDaq blood qawghach SuvneH paghmo'.
meHpu' polished side neH legh.`,
      "/secure/archive/facility-notes/corridor-map-notes-sy06.txt": `CORRIDOR MAP NOTES / SY06
north service tunnel N-12 markerDaq Qaw'ta'.
22:00 ret guest flow lower ringDaq yIghoSmoH.
old pump room Sum wall seam cold air 'elmoHtaH; nervous ghotpu' pongbe'vIS ghot QongtaH net Har.`,
      "/secure/archive/facility-notes/quiet-floor-rationale-sy14.txt": `QUIET FLOOR RATIONALE / SY14
noise-trigger incidents 38% puSchoH low-word service protocol qaSta'pu'DI'.
peak loadDaq mu'mey mach mandatory.
QobDaq meHpu' clear shapes je mu'mey mach tIHar law' jupnalghach tIHar puS.`,
      "/secure/archive/signal-captures/surface-radio-fragment-sy19.log": `SURFACE RADIO FRAGMENT / SY19
[00:14] carrier pevbe'
[00:17] wov yIpuSmoH gate poStaH
[00:18] cha'DIch voice static bIngDaq luH
[00:18] signal pe'lu', slowly fadebe'`,
      "/secure/archive/access-ledgers/seal-integrity-sy26.txt": `SEAL INTEGRITY SY26
Envelope count ledger rap Mira late check qaSta'pu'DI'.
Theo duplicate wax impression pagh net chav.
latest escrow string frostline_719 taHtaH floor lead je records je sign rInpa'.
filevam records review ret poSlu'chugh, ghaytan desperatequ' ghot wa'.`,
      "/secure/archive/access-ledgers/archive-routing-note-sy21.txt": `ARCHIVE ROUTING NOTE SY21
safe rotation slips topic botlhDaq archiveDaq yIlanQo'.
risk botlh; story botlhbe'.
story botlhDaq indexta'bogh loD wa' founder note ration poetry botlhDaq lanpa'.`
    };
  }

  function buildKlingonFounderFiles() {
    return {
      "/secure/founder/README.txt": `FOUNDER WORKSPACE
pegh Sep.
private logmey, operating philosophy, letters ngeHbe'lu'bogh, recruitment notes ghaj.
naDev De'mey tInbe'meH ghItlhlu'be'.`,
      "/secure/founder/journals/journal-sy02-11-03.txt": `JOURNAL SY02-11-03
DaHjaj wa'maH cha' ghotpu' wInobta' jav glassmey je wa' shaker neH lo'taHvIS.
Hope net tlhobbe'. structure net tlhob.
Qatlho' law': hope promises ghaj. structure neH polnIS.`,
      "/secure/founder/journals/journal-sy08-09-09.txt": `JOURNAL SY08-09-09
menu mu'mey vImachmoH.
mu'mey tIn ghot ghIjtaHbogh trap net Har.
QeH law': hospitalityvo' botlhbe', interrogationvo' vIghojta'.`,
      "/secure/founder/journals/journal-sy12-03-02.txt": `JOURNAL SY12-03-02
DaHjaj second lock chen.
Hoch nItlh, "potlh" jatlhpu' 'ej Qaghbe'pu'.
rammeyDaq Qongbe'moHwI': clean decisions not costliest.`,
      "/secure/founder/masaya-notes.txt": `MASAYA NOTES
ghaH direct threat ghajbe'. 'elDI' pa' choHmoH.
C3 table low lightDaq peghtaH.
Masaya Highball specs: hard ice, garnish pagh, ceremony pagh.
inner lock leghDI', qaw'a' pagh measure'a' vISovbe'.`,
      "/secure/founder/staff-notes/index.txt": `STAFF NOTES INDEX
recruitment je trust decisions qelbogh private notes.
profilemey ghaHbe'. pa'vam SumvaD ghotpu' vIchaw'meH mumejbogh qechmey. `,
      "/secure/founder/staff-notes/erik.story": `ERIK STORY
Erik vIleghpu' queue fight qIltaHvIS QIpbe'vIS.
loDpu' cha' botlhDaq quvmoHtaH. Qapta'.
vIghuHmoH: dignity pollaHlu' law' dignity chenqa'laHlu' puS.`,
      "/secure/founder/staff-notes/andrea.story": `ANDREA STORY
Andrea second shiftDaq wejmaH pongmey qawta'.
panic Sum meHpu' leghlaH ba'pa'.
qawghach neH potlhbe'. care rurtaHbogh qawghach potlh.`,
      "/secure/founder/staff-notes/kenji.story": `KENJI STORY
Kenji canal rain botlhDaq 'elpu' 'ej "nuqDaq jIQam?" tlhob.
lojmIt Sum yIQam vIja'. DaH Hoch jajmey linevetlh Qan.
purpose nISbogh ghotpu' tu'lu'. Kenji threshold nIS.`,
      "/secure/founder/staff-notes/laryssa.story": `LARYSSA STORY
Laryssa intakevo' silence ghajboghDaq ghaj.
pa' ghaH qatlh rura' vIloStaH. not botlhqu'choH.
So'choHbogh ghotpu' leghlaH; vaj potlhqu' 'ach QobDaq je.`,
      "/secure/founder/letters-never-sent/sy00-02-13_to_my_mother.txt": `SoS vIghoSmoH,

lojmIt wIpoSta' bIngDaq taHghach survival rurHa'mo'.
sealed room ghIjmoHchugh, quvchoH net DaH.
warning DaQIjpu', 'ach ghItlhvetlh vIlo'ta'.
DaH nIHDaq street tu'lu' metal filings je wet smoke je botlh.
bIjeghpa' bIvangmeH jIcheghbe'.
mu'vam vIghItlhqa'chugh, Dubbe'.`,
      "/secure/founder/letters-never-sent/sy00-04-29_to_rin_at_gate.txt": `gateDaq Rin,

close qaSta'DI' poSqa''a' DaHtlhobchu'ghach qawtaH.
latlh glass tlhobghach rur, QongmeH Daq tlhobghach rurbe'.
inside Hut ghotpu' tu'lu'; wa' lock neH wet weatherDaq Qapbe'law'.
inside ghaHboghpu' vIchaw'. stairsDaq ghoghDaj Qoyta'.
wa'leS staffvaD protocol wIlo'ta' vIja'.
mu'vam yItlhob: ghItlhchu' 'ach napbe'.`,
      "/secure/founder/letters-never-sent/sy00-09-18_to_the_first_dead.txt": `wa'DIch Heghbogh ghot,

ponglIj vISovbe' Hoch names botlhHa' net Harpu'mo'.
bar Sum wej chairsDaq bIHeghpu'. latlh ghot drinkDaj ticketDaq taH'a' net tlhobtaH.
pa' Qaghpu' vIHarpu'pa', ghotpu' Qagh net Sovpu'.
floor wISay'moH pem pa' 'ej poSqa' wIpoS.
decisionvetlh yInwIj Hoch chenmoHta'.`,
      "/secure/founder/letters-never-sent/sy01-03-07_to_erik_before_hire.txt": `Erik, ponglIj vISovbe'pa',

queue bIpeybe'vIS bIQIlta'.
QeHDajvo' retreatchoH loDpu' wej, bIDoy' law' bIghIj puSmo'.
not charm, authority taH law' net Sovpu'.
Qu' DaneH'a' vItlhob vIneHpu'.
'ach bISop DaneH'a' vItlhobta'. DISpoHvetlh rap.`,
      "/secure/founder/letters-never-sent/sy01-11-26_to_the_people_left_outside.txt": `outside ghaHboghpu',

pa' botlhqu' 'ach yIja'be'bogh ram tu'lu'.
ghot QamlaH, tlhutlhlaH, monlaH, 'ach pe'vIl Qagh Sum.
chairs neH vIqeltaH chairs qelmeHlaHlu'mo'.
Dachaw'be'chugh ghot 'ej SoHvaD yIpoQ net Sovchugh, botlhghachvetlh vIqelbe'laH.
understanding vuv law' refusal vuv puS.`,
      "/secure/founder/letters-never-sent/sy02-05-14_to_theo_after_the_leak.txt": `Theo, leak qaSta'pu'DI',

wa'maH tup latlh taHchugh wall pe'choH 'ej cellar bIQ botlhmoH net ja'pu'.
pa' bIQuvmoHmo' qatlho'ta'.
clinic botlhDaq cold storage neHtaHvIS pa' vIchaw'ta'mo' qatlho'be'.
numbers lI'pu'mo' wuQlIj chenpu' net Sov.
numbers ramDaq jIleghmeH peghbe'. faces leghmeH yes.`,
      "/secure/founder/letters-never-sent/sy03-08-31_to_andrea_without_sending.txt": `Andrea, jIngeHbe'pu'bogh,

ghotpu' DaQaptaH dignity luqargh net Harbogh rur, safety neH net Harbogh rurbe'.
trainingqoq yIchoHmoHQo'.
wa'leS softnesslIj useful vIja' jagh ghoghDaq.
mu' quvHa' law': roomvam botlhDaq caution neH quv net Harbe'bogh ghot wa' nIS.`,
      "/secure/founder/letters-never-sent/sy04-02-09_to_masaya_after_c3.txt": `Masaya, C3 ram wa'DIch qaSta'pu'DI',

pagh qaS. 'ach pagh choHbe' net jatlhmeH qeylIS.
pa' DaHoldaH bad memory porgh HoldaHbogh rur: tamtaH 'ej everywhere.
staff better movechoHta' Da'elpu'DI'. vaj jIghIj law' frozen staff vIghIj puS.
shelter, surveillance, nostalgia: nuq DaneH vISovbe'.
pa'vam Dal mumevmoH.`,
      "/secure/founder/letters-never-sent/sy05-12-19_to_ju_about_the_cellar.txt": `Ju, cellar qelDI',

bIngDaq Hoch law' DaHtaH 'ach topDaq bI'elDI' glass gentle DaQan.
QeD'a' pagh Qob'a' net Sovbe'.
cellar ghojmoH: leaks patience ghaj, rot jatlhHa'chuqbe'.
Daqvetlh qab net jatlhchugh, early close vIchoH 'ej qech vItlhobbe'.`,
      "/secure/founder/letters-never-sent/sy07-06-03_to_the_room_itself.txt": `pa'vam'e',

ghotpu' Qamqa'laHpa' yIQangmeH SoH vIchenmoHta'.
vaj wallmeylIj tIHarmeH ritual Dalo' net vIghojmoHta'.
wejpuH: hospitality 'oH net Har.
wejpuH: camouflage 'oH net Har.
nuqDaq je, wa'DIch purpose ngevHa'ghach botlhDaq bItaHpu'.`,
      "/secure/founder/letters-never-sent/sy08-09-09_to_laryssa_before_transfer.txt": `Laryssa, transfer pa',

ward botlhDaq suffering soon Dalegh net ghojmoHta'. floor botlhDaq soon 'ach late net ghojmoH.
meHpu' patients puS pagh ngaQ HaDIbaHmeymo' botlhHa' jatlhlaH, 'ach porgh panic tlhejtaH.
despairDaq efficient bIchoH net yIleghchugh, shift yImej 'ej yItlhobQo'.
worker vIcheHqa'laH. warningvetlh vIcheHqa'laHbe'.`,
      "/secure/founder/letters-never-sent/sy10-11-17_to_masaya_after_last_entry.txt": `Masaya, last confirmed entry qaSta'pu'DI',

glass napHa' yIchegh 'ej not bIcheghpu'.
jar law' pa' careful taH, bIH botlhDaq absencewIjDaj legh net Harbogh rur.
C3 Hurgh vIchoHbe'mo' relief vI'angnIS.
relief Dishonest 'oH.
vIghajbogh feeling: sound Hoch QobmoHbogh botlh. `,
      "/secure/founder/letters-never-sent/sy12-03-02_to_the_inner_lock.txt": `inner lock,

DaHjaj staff mbelehDaq SoH vIparHa'ta'. peghDaq jIquvHa'ta'.
SoH machine; hesitation policyDaq DachoHmoH.
ghotpu' lojmIt tIHar law' latlh ghot botlhDaq chaw'be'lu'pu'bogh net Sovchugh.
Sovghachvetlh pa' QanmoH 'ach jIH runmeH jIQelHa'.`,
      "/secure/founder/letters-never-sent/sy14-06-27_to_future_owner.txt": `future owner,

atmosphere je safety yIrapQo'.
quiet room 'ach cruel laH. crowded room 'ach kind laH.
staff Doy'DI' nuqDaq Qam net yIlegh. pa' botlh Sovlu' revenue leghpa'.
elegance joq exit path yIwIvchugh, exit yIwIv 'ej qatlh yIQIjQo'.`,
      "/secure/founder/letters-never-sent/sy17-01-05_to_the_clock_team.txt": `clock team,

drift reports qaSta'DI' continuity ledgerDaq qatlh date net ghItlh yItlhobta'.
local standard yIpol vIja' pa' wa' small lie nISmo'.
Hoch nodta' 'ach jIghItlhchu'mo' not; Doy'pu'mo' neH.
consistency kindness 'oH'a' pagh archive qap law''a'? vISovbe'.`,
      "/secure/founder/letters-never-sent/sy19-08-13_to_the_surface.txt": `surface,

DISmey law' bIqangbe'bogh Qob rur SoH net jatlhpu'.
vaj Qobmey geography choH net ghojpu' taHtaHvIS.
DaH streets tu'lu' puqpu' ash pong Sov law' rain pong Sov puSbogh.
bar vIchenmoHmo': ghotpu' tlhutlhmeH ba'laH DaqDaq, shelter botlh net Harbe'lu' je. `,
      "/secure/founder/letters-never-sent/sy26-02-24_to_whoever_reads_last.txt": `ghorgh last readbogh ghot,

directoryvam DapoSchugh, room bIQubtaHbe'chu' 'ej bIQubtaHchu'be' je.
naDev Hoch De' close qaSta'pu'DI' ghItlhlu', glassmey stacklu'pu' 'ej courage chon.
wisdom je damage yISeH net DaneH.
yIlo'Qo'. wa' ghItlhwI' botlhDaq wa' rammeyDaq ghItlhlu'pu'.
Safehouse jItaH ret taHchugh, pure bIchoHpa' useful yItaH.`
    };
  }

  function buildKlingonSystemFiles() {
    return {
      "/var/log/service.log": `[SY26-02-23 21:17] C3 ba'lu'ta'
[SY26-02-23 21:19] masaya highball ngeHlu'ta'
[SY26-02-23 21:44] pa' pressure pev`,
      "/var/log/security.log": `[SY26-02-23 22:55] lojmIt cycle motlh
[SY26-02-24 00:11] stairwell tlhol`
    };
  }

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
    { id: "lore", label: "archive", glyph: "LR", title: "Internal Archive", icon: "assets/icons/archive.svg", hiddenByDefault: true },
    {
      id: "decryptor",
      label: "file repair",
      glyph: "FR",
      title: "REC-77 File Repair Utility",
      icon: "assets/icons/file-repair.svg",
      hiddenByDefault: true
    },
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
      const storedLanguage = window.localStorage.getItem(STORAGE_KEYS.language);
      if (storedLanguage && LANGUAGES.some((item) => item.code === storedLanguage)) {
        appState.language = storedLanguage;
      }
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

  function currentLanguage() {
    return LANGUAGES.some((item) => item.code === appState.language) ? appState.language : "en";
  }

  function localeCode() {
    const map = {
      en: "en-US",
      it: "it-IT",
      ja: "ja-JP",
      tlh: "en-US"
    };
    return map[currentLanguage()] || "en-US";
  }

  const PIQAD_MAP = {
    a: "\uf8d0",
    b: "\uf8d1",
    ch: "\uf8d2",
    D: "\uf8d3",
    e: "\uf8d4",
    gh: "\uf8d5",
    H: "\uf8d6",
    I: "\uf8d7",
    j: "\uf8d8",
    l: "\uf8d9",
    m: "\uf8da",
    n: "\uf8db",
    ng: "\uf8dc",
    o: "\uf8dd",
    p: "\uf8de",
    q: "\uf8df",
    Q: "\uf8e0",
    r: "\uf8e1",
    S: "\uf8e2",
    t: "\uf8e3",
    tlh: "\uf8e4",
    u: "\uf8e5",
    v: "\uf8e6",
    w: "\uf8e7",
    y: "\uf8e8",
    "'": "\uf8e9"
  };
  const PIQAD_TOKENS = Object.keys(PIQAD_MAP).sort((a, b) => b.length - a.length);

  function parseKlingonWord(word) {
    const tokens = [];
    let index = 0;
    while (index < word.length) {
      let match = "";
      for (const token of PIQAD_TOKENS) {
        if (word.startsWith(token, index)) {
          match = token;
          break;
        }
      }
      if (!match) {
        return null;
      }
      tokens.push(match);
      index += match.length;
    }
    return tokens;
  }

  function tlhToPiqad(value) {
    return String(value).split(/([A-Za-z']+)/g).map((part) => {
      if (!part || !/[A-Za-z']/.test(part)) {
        return part;
      }
      const parsed = parseKlingonWord(part);
      if (!parsed) {
        return part;
      }
      return parsed.map((token) => PIQAD_MAP[token]).join("");
    }).join("");
  }

  function localizeKlingonText(value) {
    if (currentLanguage() !== "tlh") {
      return String(value);
    }
    return String(value).split(/(\{\w+\})/g).map((part) => (/^\{\w+\}$/.test(part) ? part : tlhToPiqad(part))).join("");
  }

  function applyLanguageMode() {
    root.classList.toggle("lang-tlh", currentLanguage() === "tlh" && appState.phase === "main");
  }

  function templateText(value, params) {
    return String(value).replace(/\{(\w+)\}/g, (_, key) => {
      if (params && Object.prototype.hasOwnProperty.call(params, key)) {
        return String(params[key]);
      }
      return "{" + key + "}";
    });
  }

  function tr(key, params, fallback) {
    const lang = currentLanguage();
    const primary = I18N[lang] && Object.prototype.hasOwnProperty.call(I18N[lang], key) ? I18N[lang][key] : null;
    const base = I18N.en && Object.prototype.hasOwnProperty.call(I18N.en, key) ? I18N.en[key] : fallback || key;
    return templateText(localizeKlingonText(primary != null ? primary : base), params);
  }

  function localizedFileContent(path) {
    const lang = currentLanguage();
    if (LOCALIZED_FILE_CONTENTS[lang] && Object.prototype.hasOwnProperty.call(LOCALIZED_FILE_CONTENTS[lang], path)) {
      const content = LOCALIZED_FILE_CONTENTS[lang][path];
      return lang === "tlh" ? tlhToPiqad(content) : content;
    }
    return null;
  }

  function appLabel(appOrId) {
    const appId = typeof appOrId === "string" ? appOrId : appOrId.id;
    const fallback = typeof appOrId === "string" ? appById.get(appId)?.label || appId : appOrId.label;
    return tr("app." + appId + ".label", null, fallback);
  }

  function appTitle(appOrId) {
    const appId = typeof appOrId === "string" ? appOrId : appOrId.id;
    const fallback = typeof appOrId === "string" ? appById.get(appId)?.title || appId : appOrId.title;
    return tr("app." + appId + ".title", null, fallback);
  }

  function persistLanguage() {
    try {
      window.localStorage.setItem(STORAGE_KEYS.language, appState.language);
    } catch (_ignore) {
      // no-op
    }
  }

  function languageLabel() {
    const entry = LANGUAGES.find((item) => item.code === currentLanguage());
    const label = entry ? entry.statusLabel || entry.label : "UNSET";
    if (entry && entry.code === "tlh") {
      return label;
    }
    return /[a-z]/i.test(label) ? label.toUpperCase() : label;
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
    if (currentLanguage() === "it") {
      return (
        "REC-77 RECORD RIPRISTINATO\n" +
        "operatore: vault_maintenance\n" +
        "chiave di accesso: p59_relay_7734\n\n" +
        "Nota SY04: abbiamo aperto Safehouse come bar perché la gente respira solo quando si siede.\n" +
        "Nota SY09: Masaya ha richiesto la specifica highball e silenzio. Il tavolo C3 resta riservato.\n" +
        "Nota SY12: il secondo lock è diventato obbligatorio dopo la breccia nel corridoio.\n" +
        "Nota SY26: handoff archivio approvato allo staff corrente.\n"
      );
    }
    if (currentLanguage() === "ja") {
      return (
        "REC-77 復旧記録\n" +
        "operator: vault_maintenance\n" +
        "access key: p59_relay_7734\n\n" +
        "SY04 note: 人は座ったときにしか息をつけないから、私たちは Safehouse をバーとして開いた。\n" +
        "SY09 note: Masaya はハイボール仕様と沈黙を求めた。C3 テーブルは引き続き確保。\n" +
        "SY12 note: corridor breach 後、第二ロックは必須になった。\n" +
        "SY26 note: archive handoff は現行スタッフへ承認済み。\n"
      );
    }
    if (currentLanguage() === "tlh") {
      return tlhToPiqad(
        (
        "REC-77 DUBTA' RECORD\n" +
        "operator: vault_maintenance\n" +
        "access key: p59_relay_7734\n\n" +
        "SY04 note: ghotpu' ba'DI' neH yInrupmeyDaj pe'vIl yItlhuH. vaj Safehouse bar wIchenmoHta'.\n" +
        "SY09 note: Masaya Highball spec je tamghach je neHta'. C3 table peghtaH.\n" +
        "SY12 note: corridor breach qaSta'pu'DI', second lock mandatory choH.\n" +
        "SY26 note: archive handoff current staffvaD chavta'.\n"
        )
      );
    }
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
        (currentLanguage() === "it"
          ? "stato: payload corrotto\n\n"
          : currentLanguage() === "ja"
            ? "状態: ペイロード破損\n\n"
            : currentLanguage() === "tlh"
              ? "Dotlh: payload Qagh\n\n"
            : "status: corrupted payload\n\n") +
        obfuscateText(repairedRecordText(), repairIntegrity())
      );
    }
    if (path === REC77_NOTE_PATH) {
      if (repairState.solved) {
        if (currentLanguage() === "it") {
          return "NOTA REC-77\nstato: riparato\napri /public/corrupted-file-77.bin per credenziali e storia recuperate.";
        }
        if (currentLanguage() === "ja") {
          return "REC-77 NOTE\n状態: 修復済み\n回復した資格情報と記録は /public/corrupted-file-77.bin を開いてください。";
        }
        if (currentLanguage() === "tlh") {
          return tlhToPiqad("REC-77 NOTE\nDotlh: Dubta'\n/public/corrupted-file-77.bin yIpoS peghmey je QonoS polboghmo'.");
        }
        return "REC-77 NOTE\nstatus: repaired\nopen /public/corrupted-file-77.bin for recovered credentials and story.";
      }
      if (currentLanguage() === "it") {
        return "NOTA REC-77\nintegrità file fallita.\nusa l'app Ripara File dal desktop per ripristinare la leggibilità.";
      }
      if (currentLanguage() === "ja") {
        return "REC-77 NOTE\nファイル整合性エラー。\nデスクトップの File Repair アプリで可読性を復元してください。";
      }
      if (currentLanguage() === "tlh") {
        return tlhToPiqad("REC-77 NOTE\nfile integrity Qapbe'.\ndesktopDaq File Repair app yIlo' readability yIchenqa'meH.");
      }
      return "REC-77 NOTE\nfile integrity failed.\nuse FILE REPAIR utility app from desktop to restore readability.";
    }
    return localizedFileContent(path) || VFS[path];
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
      return tr("fs.emptyOrRestricted");
    }
    return entries
      .map((entry) => {
        if (entry.locked) {
          return tr("fs.locked", { name: entry.name });
        }
        return entry.kind === "dir" ? tr("fs.dir", { name: entry.name }) : tr("fs.file", { name: entry.name });
      })
      .join("\n");
  }

  function sessionUser() {
    if (session.staff && session.founder) {
      return "founder";
    }
    if (session.staff) {
      return "staff";
    }
    return "guest";
  }

  function sessionRoleText() {
    if (session.staff && session.founder) {
      return tr("role.founder");
    }
    if (session.staff) {
      return tr("role.staff");
    }
    return tr("role.guest");
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
    const locale = localeCode();
    const t = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    const d = now.toLocaleDateString(locale, { month: "short", day: "2-digit" });
    return t + " // " + (/[a-z]/i.test(d) ? d.toUpperCase() : d);
  }

  function textBlock(value) {
    const block = document.createElement("div");
    block.textContent = value;
    return block;
  }

  function sortedEntries(path) {
    return filterVisibleChildren(path).sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === "dir" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  function terminalHome() {
    return "/public";
  }

  function terminalResolvePath(input, cwd) {
    if (!input) {
      return cwd;
    }
    return joinPath(cwd, input);
  }

  function pathHash(path) {
    let hash = 0;
    for (let i = 0; i < path.length; i += 1) {
      hash = (hash * 31 + path.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  function pathMeta(path) {
    const normalized = normalizePath(path);
    const kind = isDir(normalized) ? "directory" : isFile(normalized) ? "file" : "unknown";
    const secure = isSecure(normalized);
    const founder = isFounder(normalized);
    const mode = kind === "directory"
      ? founder
        ? "drwx------"
        : secure
          ? "drwxr-x---"
          : "drwxr-xr-x"
      : founder
        ? "-rw-------"
        : secure
          ? "-rw-r-----"
          : "-rw-r--r--";
    const owner = founder ? "founder" : secure ? "staff" : normalized.startsWith("/bar") ? "frontdesk" : "guest";
    const group = founder ? "founder" : secure ? "staff" : "guest";
    const size = kind === "directory" ? (Array.isArray(VFS[normalized]) ? VFS[normalized].length : 0) : (readFileText(normalized) || "").length;
    const inode = 40000 + (pathHash(normalized) % 50000);
    const mtime = new Date(Date.UTC(2026, 1, 1, 18, 0, 0) + (pathHash(normalized) % (60 * 24 * 28)) * 60000);
    return { path: normalized, kind, mode, owner, group, size, inode, mtime };
  }

  function formatLsTime(date) {
    const locale = localeCode();
    const mon = date.toLocaleDateString(locale, { month: "short" });
    const day = date.toLocaleDateString(locale, { day: "2-digit" });
    const hm = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    return mon + " " + day + " " + hm;
  }

  function walkVfs(path, visitor, depth) {
    const normalized = normalizePath(path);
    const currentDepth = typeof depth === "number" ? depth : 0;
    visitor(normalized, currentDepth);
    if (!isDir(normalized) || !canAccess(normalized)) {
      return;
    }
    sortedEntries(normalized).forEach((entry) => {
      walkVfs(entry.full, visitor, currentDepth + 1);
    });
  }

  function basename(path) {
    return normalizePath(path).split("/").filter(Boolean).slice(-1)[0] || "/";
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
    return textBlock(readFileText("/bar/service/hours.txt") || tr("terminal.fileUnavailable"));
  }

  function buildLocation() {
    const wrap = document.createElement("section");
    wrap.className = "v2-location";

    const frame = document.createElement("div");
    frame.className = "v2-location-map-frame";

    const map = document.createElement("img");
    map.className = "v2-location-map";
    map.src = "assets/location-map.png";
    map.alt = appTitle("location");
    map.loading = "lazy";

    const marker = document.createElement("div");
    marker.className = "v2-location-marker";
    marker.textContent = "SAFEHOUSE *";

    frame.appendChild(map);
    frame.appendChild(marker);

    const notes = document.createElement("div");
    notes.className = "v2-location-notes";
    notes.textContent =
      (readFileText("/bar/service/location.txt") || tr("terminal.fileUnavailable")) +
      "\n\n" +
      tr("location.transit");

    wrap.appendChild(frame);
    wrap.appendChild(notes);
    return wrap;
  }

  function buildMenu() {
    const main = readFileText("/bar/menu/house-menu.txt") || tr("terminal.fileUnavailable");
    const seasonal = readFileText("/bar/menu/seasonal-board.txt") || "";
    const noProof = readFileText("/bar/menu/non-alcoholic.txt") || "";
    const masaya = readFileText("/bar/menu/masaya-note.txt") || "";
    return textBlock(main + "\n\n" + seasonal + "\n\n" + noProof + "\n\n" + masaya);
  }

  function buildEvents() {
    return textBlock(readFileText("/bar/service/events-calendar.txt") || tr("terminal.fileUnavailable"));
  }

  function buildContacts() {
    return textBlock(readFileText("/bar/service/contacts.txt") || tr("terminal.fileUnavailable"));
  }

  function buildTrash() {
    return textBlock(tr("trash.body"));
  }

  function buildPublicFiles(env) {
    return createFilesystemBrowser("/public", {
      rootPath: "/public",
      lockRoot: true,
      title: "public",
      onOpenFile: env && env.openDocumentWindow && !(env && env.isMobile) ? env.openDocumentWindow : null,
      enableDrag: Boolean(env && env.enableFileDrag),
      compactMode: Boolean(env && env.isMobile)
    });
  }

  function buildLegacyTerminalInfo(env) {
    const wrap = document.createElement("section");
    wrap.className = "v2-terminal";

    const screen = document.createElement("div");
    screen.className = "v2-terminal-screen";

    const form = document.createElement("form");
    form.className = "v2-terminal-form";
    form.setAttribute("autocomplete", "off");

    const prompt = document.createElement("span");
    prompt.className = "v2-terminal-prompt";

    const input = document.createElement("input");
    input.className = "v2-terminal-input";
    input.type = "text";
    input.autocomplete = "off";
    input.autocapitalize = "none";
    input.autocorrect = "off";
    input.spellcheck = false;

    form.appendChild(prompt);
    form.appendChild(input);
    wrap.appendChild(screen);
    wrap.appendChild(form);

    const state = {
      cwd: terminalHome(),
      history: [],
      historyIndex: -1,
      pendingAuth: null
    };

    function currentPrompt() {
      if (state.pendingAuth) {
        return state.pendingAuth.prompt;
      }
      return sessionUser() + "@safehouse:" + state.cwd + (session.staff && session.founder ? "#" : "$");
    }

    function refreshPrompt() {
      prompt.textContent = currentPrompt();
      input.type = state.pendingAuth && state.pendingAuth.secret ? "password" : "text";
    }

    function scrollTerminal() {
      screen.scrollTop = screen.scrollHeight;
    }

    function appendOutput(text, className) {
      const block = document.createElement("pre");
      block.className = "v2-terminal-output" + (className ? " " + className : "");
      block.textContent = text;
      screen.appendChild(block);
      scrollTerminal();
    }

    function appendCommandEcho(promptText, value, masked) {
      const row = document.createElement("div");
      row.className = "v2-terminal-line";

      const promptEl = document.createElement("span");
      promptEl.className = "v2-terminal-line-prompt";
      promptEl.textContent = promptText + " ";

      const valueEl = document.createElement("span");
      valueEl.className = "v2-terminal-line-value";
      valueEl.textContent = masked ? "••••••" : value;

      row.appendChild(promptEl);
      row.appendChild(valueEl);
      screen.appendChild(row);
      scrollTerminal();
    }

    function parseCommand(line) {
      const out = [];
      const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
      let match = null;
      while ((match = re.exec(line))) {
        out.push(match[1] != null ? match[1] : match[2] != null ? match[2] : match[3]);
      }
      return out;
    }

    function wildcardToRegex(pattern) {
      return new RegExp(
        "^" +
          String(pattern || "*")
            .replace(/[.+^${}()|[\]\\]/g, "\\$&")
            .replace(/\*/g, ".*")
            .replace(/\?/g, ".") +
          "$"
      );
    }

    function resolveAppAlias(value) {
      const key = String(value || "").trim().toLowerCase();
      const aliases = {
        hours: "hours",
        location: "location",
        menu: "menu",
        events: "events",
        contacts: "contacts",
        public: "public-files",
        "public-files": "public-files",
        trash: "trash",
        "recycle-bin": "trash",
        filesystem: "filesystem",
        fs: "filesystem",
        archive: "lore",
        lore: "lore",
        "internal-archive": "lore",
        decryptor: "decryptor",
        repair: "decryptor",
        "file-repair": "decryptor",
        terminal: "terminal"
      };
      return aliases[key] || "";
    }

    function printPathError(cmd, path, type) {
      const key =
        type === "permission"
          ? "terminal.permissionDenied"
          : type === "dir"
            ? "terminal.isDir"
            : type === "notdir"
              ? "terminal.notDir"
              : "terminal.noSuchFile";
      appendOutput(tr(key, { cmd, path }), "error");
    }

    function requireExistingPath(cmd, rawPath) {
      const target = terminalResolvePath(rawPath, state.cwd);
      if (!isDir(target) && !isFile(target)) {
        printPathError(cmd, target, "missing");
        return "";
      }
      return target;
    }

    function listRecursive(path, lines, prefix) {
      const target = normalizePath(path);
      const entries = sortedEntries(target);
      entries.forEach((entry, index) => {
        const branch = index === entries.length - 1 ? "└── " : "├── ";
        const nextPrefix = prefix + (index === entries.length - 1 ? "    " : "│   ");
        const marker = entry.locked ? " [locked]" : "";
        lines.push(prefix + branch + entry.name + marker);
        if (entry.kind === "dir" && !entry.locked) {
          listRecursive(entry.full, lines, nextPrefix);
        }
      });
    }

    function grepFile(pattern, path, showLineNo, out) {
      if (!canAccess(path)) {
        printPathError("grep", path, "permission");
        return;
      }
      if (!isFile(path)) {
        printPathError("grep", path, "dir");
        return;
      }
      const lines = String(readFileText(path) || "").split("\n");
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          out.push(path + ":" + (showLineNo ? index + 1 + ":" : "") + line);
        }
      });
    }

    function treeText(path) {
      const target = normalizePath(path);
      const lines = [target === "/" ? "/" : basename(target)];
      if (!canAccess(target)) {
        lines.push("[locked]");
        return lines.join("\n");
      }
      if (isDir(target)) {
        listRecursive(target, lines, "");
      }
      return lines.join("\n");
    }

    function lsSingle(path, longMode, recursiveMode, out, visited) {
      const normalized = normalizePath(path);
      if (!isDir(normalized) && !isFile(normalized)) {
        printPathError("ls", normalized, "missing");
        return;
      }
      if (!canAccess(normalized)) {
        printPathError("ls", normalized, "permission");
        return;
      }
      if (isFile(normalized)) {
        if (longMode) {
          const meta = pathMeta(normalized);
          out.push(
            meta.mode +
              " 1 " +
              meta.owner +
              " " +
              meta.group +
              " " +
              String(meta.size).padStart(6, " ") +
              " " +
              formatLsTime(meta.mtime) +
              " " +
              basename(normalized)
          );
        } else {
          out.push(basename(normalized));
        }
        return;
      }

      const key = normalized + "::" + (recursiveMode ? "R" : "N");
      if (visited.has(key)) {
        return;
      }
      visited.add(key);

      const entries = sortedEntries(normalized);
      entries.forEach((entry) => {
        if (longMode) {
          const meta = pathMeta(entry.full);
          out.push(
            meta.mode +
              " 1 " +
              meta.owner +
              " " +
              meta.group +
              " " +
              String(meta.size).padStart(6, " ") +
              " " +
              formatLsTime(meta.mtime) +
              " " +
              entry.name
          );
        } else {
          out.push(entry.name + (entry.kind === "dir" ? "/" : ""));
        }
      });

      if (recursiveMode) {
        entries
          .filter((entry) => entry.kind === "dir" && !entry.locked)
          .forEach((entry) => {
            out.push("");
            out.push(entry.full + ":");
            lsSingle(entry.full, longMode, false, out, visited);
          });
      }
    }

    function handleAuthInput(value) {
      const raw = String(value || "").trim();
      const pending = state.pendingAuth;
      if (!pending) {
        return;
      }
      if (pending.mode === "staff" && pending.step === "id") {
        state.pendingAuth = {
          mode: "staff",
          step: "key",
          operatorId: raw,
          prompt: tr("terminal.staffKeyPrompt"),
          secret: true
        };
        refreshPrompt();
        return;
      }
      if (pending.mode === "staff" && pending.step === "key") {
        state.pendingAuth = null;
        if (pending.operatorId === STAFF_ID && raw === STAFF_KEY) {
          session.staff = true;
          emitSession();
          appendOutput(tr("terminal.authGranted"));
        } else {
          session.staff = false;
          session.founder = false;
          emitSession();
          appendOutput(tr("terminal.authDenied"), "error");
        }
        refreshPrompt();
        return;
      }
      if (pending.mode === "founder") {
        state.pendingAuth = null;
        if (session.staff && raw === FOUNDER_KEY) {
          session.founder = true;
          emitSession();
          appendOutput(tr("terminal.founderGranted"));
        } else {
          session.founder = false;
          emitSession();
          appendOutput(tr("terminal.authDenied"), "error");
        }
        refreshPrompt();
      }
    }

    function executeCommand(line) {
      const tokens = parseCommand(line);
      if (!tokens.length) {
        return;
      }
      const cmd = tokens.shift();

      if (cmd === "clear") {
        screen.innerHTML = "";
        return;
      }

      if (cmd === "pwd") {
        appendOutput(state.cwd);
        return;
      }

      if (cmd === "whoami") {
        appendOutput(sessionUser());
        return;
      }

      if (cmd === "id") {
        const user = sessionUser();
        if (user === "guest") {
          appendOutput("uid=1000(guest) gid=1000(guest) groups=1000(guest)");
          return;
        }
        if (user === "staff") {
          appendOutput("uid=1100(staff) gid=1100(staff) groups=1100(staff)");
          return;
        }
        appendOutput("uid=1100(staff) gid=1100(staff) groups=1100(staff),1200(founder)");
        return;
      }

      if (cmd === "uname") {
        appendOutput(tokens[0] === "-a" ? "SafehouseCRT p59 1.0.77 vt64 SAFEHOUSE_P59 unix" : "SafehouseCRT");
        return;
      }

      if (cmd === "date") {
        appendOutput(new Date().toLocaleString(localeCode()));
        return;
      }

      if (cmd === "echo") {
        appendOutput(tokens.join(" "));
        return;
      }

      if (cmd === "man" || cmd === "help") {
        appendOutput(tr("terminal.availableCommands"));
        appendOutput(tr("terminal.prompt.help"), "muted");
        return;
      }

      if (cmd === "logout") {
        session.staff = false;
        session.founder = false;
        emitSession();
        appendOutput(tr("terminal.logout"));
        refreshPrompt();
        return;
      }

      if (cmd === "su") {
        const target = (tokens[0] || "").toLowerCase();
        if (!target) {
          appendOutput(tr("terminal.usage.su"), "error");
          return;
        }
        if (target === "staff") {
          state.pendingAuth = {
            mode: "staff",
            step: "id",
            operatorId: "",
            prompt: tr("terminal.staffIdPrompt"),
            secret: false
          };
          refreshPrompt();
          return;
        }
        if (target === "founder") {
          if (!session.staff) {
            appendOutput(tr("auth.status.prior"), "error");
            return;
          }
          state.pendingAuth = {
            mode: "founder",
            step: "pass",
            prompt: tr("terminal.founderPrompt"),
            secret: true
          };
          refreshPrompt();
          return;
        }
        appendOutput(tr("terminal.usage.su"), "error");
        return;
      }

      if (cmd === "cd") {
        const target = terminalResolvePath(tokens[0] || terminalHome(), state.cwd);
        if (!isDir(target) && !isFile(target)) {
          printPathError("cd", target, "missing");
          return;
        }
        if (!canAccess(target)) {
          printPathError("cd", target, "permission");
          return;
        }
        if (!isDir(target)) {
          printPathError("cd", target, "notdir");
          return;
        }
        state.cwd = target;
        refreshPrompt();
        return;
      }

      if (cmd === "ls") {
        let longMode = false;
        let recursiveMode = false;
        const paths = [];
        tokens.forEach((token) => {
          if (token.startsWith("-")) {
            if (token.includes("l")) {
              longMode = true;
            }
            if (token.includes("R")) {
              recursiveMode = true;
            }
            return;
          }
          paths.push(token);
        });
        const targets = paths.length ? paths.map((item) => terminalResolvePath(item, state.cwd)) : [state.cwd];
        const out = [];
        const visited = new Set();
        targets.forEach((target, index) => {
          if (targets.length > 1) {
            if (index > 0) {
              out.push("");
            }
            out.push(target + ":");
          }
          lsSingle(target, longMode, recursiveMode, out, visited);
        });
        appendOutput(out.join("\n"));
        return;
      }

      if (cmd === "tree") {
        const target = terminalResolvePath(tokens[0] || state.cwd, state.cwd);
        if (!isDir(target) && !isFile(target)) {
          printPathError("tree", target, "missing");
          return;
        }
        if (!canAccess(target)) {
          printPathError("tree", target, "permission");
          return;
        }
        appendOutput(treeText(target));
        return;
      }

      if (cmd === "cat" || cmd === "less") {
        if (!tokens.length) {
          appendOutput(tr("terminal.usage.cat"), "error");
          return;
        }
        const out = [];
        tokens.forEach((item, index) => {
          const target = requireExistingPath(cmd, item);
          if (!target) {
            return;
          }
          if (!canAccess(target)) {
            printPathError(cmd, target, "permission");
            return;
          }
          if (!isFile(target)) {
            printPathError(cmd, target, "dir");
            return;
          }
          if (tokens.length > 1) {
            if (index > 0) {
              out.push("");
            }
            out.push("==> " + target + " <==");
          }
          out.push(readFileText(target));
        });
        if (cmd === "less") {
          out.push("");
          out.push("(END)");
        }
        appendOutput(out.join("\n"));
        return;
      }

      if (cmd === "head" || cmd === "tail") {
        let count = 10;
        const args = tokens.slice();
        if (args[0] === "-n") {
          count = Math.max(1, Number(args[1] || "10"));
          args.splice(0, 2);
        }
        if (!args.length) {
          appendOutput(tr(cmd === "head" ? "terminal.usage.head" : "terminal.usage.tail"), "error");
          return;
        }
        const target = requireExistingPath(cmd, args[0]);
        if (!target) {
          return;
        }
        if (!canAccess(target)) {
          printPathError(cmd, target, "permission");
          return;
        }
        if (!isFile(target)) {
          printPathError(cmd, target, "dir");
          return;
        }
        const lines = String(readFileText(target) || "").split("\n");
        appendOutput((cmd === "head" ? lines.slice(0, count) : lines.slice(-count)).join("\n"));
        return;
      }

      if (cmd === "grep") {
        let showLineNo = false;
        let recursiveMode = false;
        const args = [];
        tokens.forEach((token) => {
          if (token === "-n") {
            showLineNo = true;
            return;
          }
          if (token === "-r" || token === "-R") {
            recursiveMode = true;
            return;
          }
          args.push(token);
        });
        if (args.length < 2) {
          appendOutput(tr("terminal.usage.grep"), "error");
          return;
        }
        let pattern = null;
        try {
          pattern = new RegExp(args.shift(), "i");
        } catch (_error) {
          appendOutput(tr("terminal.invalidRegex"), "error");
          return;
        }
        const out = [];
        args.forEach((item) => {
          const target = requireExistingPath("grep", item);
          if (!target) {
            return;
          }
          if (!canAccess(target)) {
            printPathError("grep", target, "permission");
            return;
          }
          if (isFile(target)) {
            grepFile(pattern, target, showLineNo, out);
            return;
          }
          if (!recursiveMode) {
            printPathError("grep", target, "dir");
            return;
          }
          walkVfs(target, (walkPath) => {
            if (isFile(walkPath)) {
              grepFile(pattern, walkPath, showLineNo, out);
            }
          });
        });
        if (out.length) {
          appendOutput(out.join("\n"));
        }
        return;
      }

      if (cmd === "find") {
        const args = tokens.slice();
        const start = terminalResolvePath(args[0] || state.cwd, state.cwd);
        let pattern = null;
        const nameIndex = args.indexOf("-name");
        if (nameIndex !== -1) {
          pattern = wildcardToRegex(args[nameIndex + 1] || "*");
        }
        if (!isDir(start) && !isFile(start)) {
          printPathError("find", start, "missing");
          return;
        }
        if (!canAccess(start)) {
          printPathError("find", start, "permission");
          return;
        }
        const out = [];
        walkVfs(start, (walkPath) => {
          if (!pattern || pattern.test(basename(walkPath))) {
            out.push(walkPath);
          }
        });
        appendOutput(out.join("\n"));
        return;
      }

      if (cmd === "file") {
        if (!tokens.length) {
          appendOutput(tr("terminal.usage.file"), "error");
          return;
        }
        const out = [];
        tokens.forEach((item) => {
          const target = requireExistingPath("file", item);
          if (!target) {
            return;
          }
          if (!canAccess(target)) {
            printPathError("file", target, "permission");
            return;
          }
          if (isDir(target)) {
            out.push(target + ": directory");
            return;
          }
          const name = basename(target).toLowerCase();
          const type = name.endsWith(".bin") ? "data" : name.endsWith(".md") ? "markdown text" : "ASCII text";
          out.push(target + ": " + type);
        });
        appendOutput(out.join("\n"));
        return;
      }

      if (cmd === "stat") {
        if (!tokens.length) {
          appendOutput(tr("terminal.usage.stat"), "error");
          return;
        }
        const out = [];
        tokens.forEach((item, index) => {
          const target = requireExistingPath("stat", item);
          if (!target) {
            return;
          }
          if (!canAccess(target)) {
            printPathError("stat", target, "permission");
            return;
          }
          const meta = pathMeta(target);
          if (index > 0) {
            out.push("");
          }
          out.push("  File: " + target);
          out.push("  Size: " + meta.size + "\tType: " + meta.kind);
          out.push("Device: vfs\tInode: " + meta.inode + "\tLinks: 1");
          out.push("Access: (" + meta.mode.replace(/^[d-]/, "") + ")  Uid: (" + meta.owner + ")   Gid: (" + meta.group + ")");
          out.push("Modify: " + meta.mtime.toISOString());
        });
        appendOutput(out.join("\n"));
        return;
      }

      if (cmd === "wc") {
        if (!tokens.length) {
          appendOutput(tr("terminal.usage.wc"), "error");
          return;
        }
        const out = [];
        tokens.forEach((item) => {
          const target = requireExistingPath("wc", item);
          if (!target) {
            return;
          }
          if (!canAccess(target)) {
            printPathError("wc", target, "permission");
            return;
          }
          if (!isFile(target)) {
            printPathError("wc", target, "dir");
            return;
          }
          const text = String(readFileText(target) || "");
          const lines = text ? text.split("\n").length : 0;
          const words = text.trim() ? text.trim().split(/\s+/).length : 0;
          const bytes = text.length;
          out.push(String(lines).padStart(7, " ") + String(words).padStart(8, " ") + String(bytes).padStart(8, " ") + " " + target);
        });
        appendOutput(out.join("\n"));
        return;
      }

      if (cmd === "openapp") {
        if (!tokens.length) {
          appendOutput(tr("terminal.usage.openapp"), "error");
          return;
        }
        const appId = resolveAppAlias(tokens[0]);
        if (!appId || !appById.has(appId)) {
          appendOutput(tr("terminal.noSuchFile", { cmd: "openapp", path: tokens[0] }), "error");
          return;
        }
        if (env && typeof env.openApp === "function") {
          env.openApp(appId);
        }
        appendOutput(tr("terminal.appOpened", { name: appTitle(appId) }));
        return;
      }

      if (cmd === "open") {
        if (!tokens.length) {
          appendOutput(tr("terminal.usage.open"), "error");
          return;
        }
        const appId = resolveAppAlias(tokens[0]);
        if (appId && appById.has(appId)) {
          if (env && typeof env.openApp === "function") {
            env.openApp(appId);
          }
          appendOutput(tr("terminal.appOpened", { name: appTitle(appId) }));
          return;
        }
        const target = terminalResolvePath(tokens[0], state.cwd);
        if (!isDir(target) && !isFile(target)) {
          printPathError("open", target, "missing");
          return;
        }
        if (!canAccess(target)) {
          printPathError("open", target, "permission");
          return;
        }
        if (isDir(target)) {
          if (env && typeof env.openApp === "function") {
            env.openApp("filesystem");
          } else if (env && typeof env.openFileSystem === "function") {
            env.openFileSystem();
          }
          appendOutput(tr("terminal.dirOpened"));
          return;
        }
        if (env && typeof env.openDocumentWindow === "function") {
          env.openDocumentWindow(target);
          appendOutput(tr("terminal.fileOpened"));
          return;
        }
        appendOutput(readFileText(target));
        return;
      }

      appendOutput(tr("terminal.cmdNotFound", { cmd }), "error");
    }

    input.addEventListener("keydown", (event) => {
      if (state.pendingAuth) {
        if (event.key === "Escape") {
          state.pendingAuth = null;
          refreshPrompt();
          appendOutput(tr("terminal.authCancelled"), "muted");
        }
        return;
      }
      if (event.key === "ArrowUp") {
        if (!state.history.length) {
          return;
        }
        event.preventDefault();
        if (state.historyIndex < 0) {
          state.historyIndex = state.history.length - 1;
        } else {
          state.historyIndex = Math.max(0, state.historyIndex - 1);
        }
        input.value = state.history[state.historyIndex] || "";
      } else if (event.key === "ArrowDown") {
        if (!state.history.length) {
          return;
        }
        event.preventDefault();
        if (state.historyIndex < 0) {
          input.value = "";
          return;
        }
        state.historyIndex += 1;
        if (state.historyIndex >= state.history.length) {
          state.historyIndex = -1;
          input.value = "";
          return;
        }
        input.value = state.history[state.historyIndex] || "";
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
        event.preventDefault();
        screen.innerHTML = "";
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = input.value;
      const shownPrompt = currentPrompt();
      if (value || state.pendingAuth) {
        appendCommandEcho(shownPrompt, value, Boolean(state.pendingAuth && state.pendingAuth.secret));
      }
      input.value = "";
      if (state.pendingAuth) {
        handleAuthInput(value);
      } else if (value.trim()) {
        state.history.push(value.trim());
        state.historyIndex = -1;
        executeCommand(value.trim());
      }
      refreshPrompt();
      scrollTerminal();
    });

    wrap.addEventListener("pointerdown", () => {
      input.focus();
    });

    appendOutput("SAFEHOUSE CRT OS // P-59");
    appendOutput(tr("terminal.welcome"));
    appendOutput(tr("terminal.prompt.help"), "muted");
    refreshPrompt();
    setTimeout(() => input.focus(), 0);
    return wrap;
  }

  function appAccessPath(appId) {
    if (appId === "lore") {
      return "/secure/archive";
    }
    return "";
  }

  function createAccessForm(options) {
    const opts = options || {};
    const mode = opts.mode || "staff";
    const wrap = document.createElement("div");
    const form = document.createElement("form");
    form.className = "v2-login";
    form.setAttribute("autocomplete", "off");
    form.setAttribute("role", "presentation");

    const heading = document.createElement("div");
    heading.className = "v2-login-heading";
    heading.textContent = mode === "founder" ? tr("auth.heading.founder") : tr("auth.heading.staff");

    const status = document.createElement("div");
    status.className = "v2-muted";
    status.textContent = tr("auth.status.waiting");

    form.appendChild(heading);

    if (mode === "staff") {
      const idLabel = document.createElement("label");
      idLabel.textContent = tr("auth.operatorId");
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
      keyLabel.textContent = tr("auth.accessKey");
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

      const submit = document.createElement("button");
      submit.type = "submit";
      submit.textContent = session.staff ? tr("auth.reauthenticate") : tr("auth.authenticate");

      const recovered = document.createElement("div");
      recovered.className = "v2-login-recovered";

      const recoveredTitle = document.createElement("div");
      recoveredTitle.className = "v2-muted";
      recoveredTitle.textContent = tr("auth.recovered");

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
          status.textContent = tr("auth.status.granted");
          status.className = "";
          emitSession();
          if (typeof opts.onSuccess === "function") {
            opts.onSuccess();
          }
        } else {
          session.staff = false;
          session.founder = false;
          status.textContent = tr("auth.status.denied");
          status.className = "v2-muted";
          emitSession();
        }
      });

      form.appendChild(idLabel);
      form.appendChild(keyLabel);
      form.appendChild(recovered);
      form.appendChild(submit);
      form.appendChild(status);
      wrap.appendChild(form);
      return wrap;
    }

    const founderLabel = document.createElement("label");
    founderLabel.textContent = tr("auth.legacyAuthorization");
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

    const founderBtn = document.createElement("button");
    founderBtn.type = "submit";
    founderBtn.textContent = tr("auth.authorize");

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!session.staff) {
        status.textContent = tr("auth.status.prior");
        status.className = "v2-muted";
        return;
      }
      if (founderField.value.trim() === FOUNDER_KEY) {
        session.founder = true;
        status.textContent = tr("auth.status.clearance");
        status.className = "";
        emitSession();
        if (typeof opts.onSuccess === "function") {
          opts.onSuccess();
        }
      } else {
        session.founder = false;
        status.textContent = tr("auth.status.denied");
        status.className = "v2-muted";
        emitSession();
      }
    });

    form.appendChild(founderLabel);
    form.appendChild(founderBtn);
    form.appendChild(status);
    wrap.appendChild(form);
    return wrap;
  }

  function buildDecryptor(env) {
    const wrap = document.createElement("section");
    wrap.className = "v2-decrypt";
    if (env && env.isMobile) {
      wrap.classList.add("v2-decrypt-mobile");
    }
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
    loadSelectedBtn.textContent = tr("decrypt.loadFromFs");
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
    scanBtn.textContent = tr("decrypt.runRepair");
    scanBtn.className = "v2-decrypt-scan";

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.textContent = tr("decrypt.resetTuning");
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

    makeDial(tr("decrypt.blockMap"), "clock", 0, 9);
    makeDial(tr("decrypt.parity"), "phase", 0, 9);
    makeDial(tr("decrypt.signalGain"), "gain", 0, 9);

    function hasLoadedRepairFile() {
      return repairWorkbench.loadedPath && repairWorkbench.loadedPath === REC77_PATH;
    }

    function setLoadedPath(path) {
      repairWorkbench.loadedPath = path;
      renderFrame();
    }

    function handlePathDrop(path) {
      if (!path) {
        summary.textContent = tr("decrypt.noSignal");
        return false;
      }
      if (!isFile(path)) {
        summary.textContent = tr("decrypt.notFile");
        return false;
      }
      if (path !== REC77_PATH) {
        summary.textContent = tr("decrypt.stable");
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
        summary.textContent = tr("decrypt.browserOpened");
      } else {
        summary.textContent = tr("decrypt.awaitingCandidate");
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
        selectedInfo.textContent = tr("decrypt.selected", { path: uiState.selectedFilePath });
      } else {
        selectedInfo.textContent = tr("decrypt.selectedNone");
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
        summary.textContent = tr("decrypt.idle");
        dropZone.textContent = tr("decrypt.dropAwaiting");
        controls.style.display = "none";
        meters.style.display = "none";
        preview.style.display = "none";
        preview.classList.remove("solved");
        preview.classList.add("live");
        preview.style.display = "block";
        preview.textContent = tr("decrypt.busStandby") + "\n\n" + obfuscateText(repairedRecordText(), 6);
        return;
      }

      dropZone.textContent = tr("decrypt.loadedCandidate", { path: repairWorkbench.loadedPath });
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
        summary.textContent = tr("decrypt.completed");
        preview.textContent = repairedRecordText();
        return;
      }

      preview.classList.add("live");
      preview.classList.remove("solved");
      summary.textContent = tr("decrypt.integrity", {
        integrity,
        mismatch: repairDistance(),
        attempts: repairState.attempts
      });
      preview.textContent = obfuscateText(repairedRecordText(), integrity);
    }

    wrap.appendChild(summary);
    importRow.appendChild(loadSelectedBtn);
    wrap.appendChild(importRow);
    tuning.appendChild(selectedInfo);
    if (!(env && env.isMobile)) {
      tuning.appendChild(dropZone);
    }
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
    const compactMode = Boolean(options && options.compactMode);
    const state = {
      cwd: normalizePath(startPath || rootPath),
      selectedFile: "",
      expanded: new Set([rootPath, "/"]),
      lastDragAt: 0
    };

    const wrap = document.createElement("section");
    wrap.className = "v2-fs";
    if (compactMode) {
      wrap.classList.add("compact-mode");
    }
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
    homeBtn.textContent = tr("fs.home");

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.textContent = tr("fs.up");

    const refreshBtn = document.createElement("button");
    refreshBtn.type = "button";
    refreshBtn.textContent = tr("fs.refresh");

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
      return tr("fs.restricted", { path });
    }

    function directoryRowText(entry) {
      if (entry.locked) {
        return entry.kind === "dir"
          ? tr("fs.restrictedDirLabel", { name: entry.name })
          : tr("fs.restrictedFileLabel", { name: entry.name });
      }
      return entry.kind === "dir" ? tr("fs.dirLabel", { name: entry.name }) : tr("fs.fileLabel", { name: entry.name });
    }

    function renderTree() {
      if (compactMode) {
        tree.innerHTML = "";
        return;
      }
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
            if (options && typeof options.requestPathAccess === "function") {
              options.requestPathAccess(path, () => {
                state.cwd = path;
                state.selectedFile = "";
                state.expanded.add(path);
                renderView();
              });
            } else {
              state.selectedFile = "";
              view.textContent = formatRestricted(path);
              hint.textContent = tr("fs.accessRestricted");
            }
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
        hint.textContent = tr("fs.credentialsRequired");
        renderTree();
        return;
      }

      if (!isDir(state.cwd)) {
        view.textContent = tr("fs.notDirectory");
        hint.textContent = tr("fs.invalidPath");
        renderTree();
        return;
      }

      const entries = sortedEntries(state.cwd);
      hint.textContent = tr("fs.entries", { count: entries.length });
      if (options && options.enableDrag) {
        hint.textContent += tr("fs.dragHint");
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
            if (options && typeof options.requestPathAccess === "function") {
              options.requestPathAccess(entry.full, () => {
                if (entry.kind === "dir") {
                  state.cwd = entry.full;
                  state.selectedFile = "";
                  state.expanded.add(entry.full);
                  renderView();
                  return;
                }
                state.selectedFile = entry.full;
                renderView();
              });
            } else {
              state.selectedFile = "";
              view.textContent = formatRestricted(entry.full);
              hint.textContent = tr("fs.accessRestricted");
            }
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
            hint.textContent = tr("fs.openedNewWindow");
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

      if (compactMode) {
        if (state.selectedFile && isFile(state.selectedFile) && canAccess(state.selectedFile)) {
          view.textContent = readFileText(state.selectedFile);
        } else {
          view.textContent = tr("fs.mobileGuide") + "\n\n" + listPathLines(state.cwd);
        }
      } else if (options && typeof options.onOpenFile === "function") {
        view.textContent = tr("fs.selectToOpen");
      } else if (state.selectedFile && isFile(state.selectedFile) && canAccess(state.selectedFile)) {
        view.textContent = readFileText(state.selectedFile);
      } else {
        view.textContent = tr("fs.directoryIntro", {
          path: state.cwd,
          listing: listPathLines(state.cwd)
        });
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
      onOpenFile: env && env.openDocumentWindow && !(env && env.isMobile) ? env.openDocumentWindow : null,
      enableDrag: Boolean(env && env.enableFileDrag),
      requestPathAccess: env && env.requestPathAccess ? env.requestPathAccess : null,
      compactMode: Boolean(env && env.isMobile)
    });
  }

  function buildLore(env) {
    if (!session.staff) {
      return lockedNotice(tr("fs.secureArchiveLocked"));
    }
    return createFilesystemBrowser("/secure/archive", {
      rootPath: "/secure/archive",
      lockRoot: true,
      onOpenFile: env && env.openDocumentWindow && !(env && env.isMobile) ? env.openDocumentWindow : null,
      enableDrag: Boolean(env && env.enableFileDrag),
      requestPathAccess: env && env.requestPathAccess ? env.requestPathAccess : null,
      compactMode: Boolean(env && env.isMobile)
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
      case "terminal":
        if (env && env.isMobile) {
          return textBlock(tr("app.empty"));
        }
        return buildLegacyTerminalInfo(env);
      default:
        return textBlock(tr("app.empty"));
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
    gate.classList.toggle("language-gate-tlh", currentLanguage() === "tlh");

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
    subtitle.textContent = tr("language.subtitle");

    const hint = document.createElement("div");
    hint.className = "language-hint";
    hint.textContent = tr("language.hint");

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
    statusLeft.textContent = tr("status.net") + " // " + sessionRoleText() + " // " + languageLabel();
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
    brandSub.textContent = tr("mobile.brand.sub");
    const brandNow = document.createElement("div");
    brandNow.className = "mobile-brand-now";
    brandNow.textContent = tr("mobile.brand.now");
    brand.appendChild(brandName);
    brand.appendChild(brandSub);
    brand.appendChild(brandNow);

    const launchpad = document.createElement("section");
    launchpad.className = "mobile-launchpad";
    const launchpadTitle = document.createElement("div");
    launchpadTitle.className = "mobile-launchpad-title";
    launchpadTitle.textContent = tr("mobile.quick");
    launchpad.appendChild(launchpadTitle);

    const panel = document.createElement("div");
    panel.className = "mobile-panel";
    const panelHeader = document.createElement("div");
    panelHeader.className = "mobile-panel-header";
    const panelTitle = document.createElement("div");
    panelTitle.className = "mobile-panel-title";
    const panelClose = document.createElement("button");
    panelClose.className = "mobile-panel-close";
    panelClose.type = "button";
    panelClose.textContent = tr("mobile.back");
    const panelContent = document.createElement("div");
    panelContent.className = "mobile-panel-content";
    panelHeader.appendChild(panelTitle);
    panelHeader.appendChild(panelClose);
    panel.appendChild(panelHeader);
    panel.appendChild(panelContent);

    const authOverlay = document.createElement("div");
    authOverlay.className = "v2-auth-overlay";
    authOverlay.hidden = true;

    const authCard = document.createElement("div");
    authCard.className = "v2-auth-card";
    authOverlay.appendChild(authCard);

    function closeAuthOverlay() {
      authOverlay.hidden = true;
      authCard.innerHTML = "";
    }

    authOverlay.addEventListener("click", (event) => {
      if (event.target === authOverlay) {
        closeAuthOverlay();
      }
    });

    function openAuthOverlay(kind, onSuccess) {
      authCard.innerHTML = "";

      const header = document.createElement("div");
      header.className = "v2-auth-header";

      const title = document.createElement("div");
      title.className = "v2-auth-title";
      title.textContent = kind === "founder" ? tr("auth.title.founder") : tr("auth.title.staff");

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "v2-auth-close";
      closeBtn.textContent = tr("auth.close");
      closeBtn.addEventListener("click", closeAuthOverlay);

      const form = createAccessForm({
        mode: kind,
        onSuccess: () => {
          closeAuthOverlay();
          if (typeof onSuccess === "function") {
            onSuccess();
          }
        }
      });

      header.appendChild(title);
      header.appendChild(closeBtn);
      authCard.appendChild(header);
      authCard.appendChild(form);
      authOverlay.hidden = false;
    }

    function requestPathAccess(path, onSuccess) {
      const normalized = normalizePath(path);
      if (canAccess(normalized)) {
        if (typeof onSuccess === "function") {
          onSuccess();
        }
        return;
      }
      if (isFounder(normalized)) {
        if (!session.staff) {
          openAuthOverlay("staff", () => requestPathAccess(normalized, onSuccess));
          return;
        }
        openAuthOverlay("founder", onSuccess);
        return;
      }
      if (isSecure(normalized)) {
        openAuthOverlay("staff", onSuccess);
      }
    }

    const mobileEnv = {
      isMobile: true,
      requestPathAccess,
      openApp: openPanel,
      openFileSystem: () => openPanel("filesystem")
    };

    function destroyPanelContent() {
      const current = panelContent.firstElementChild;
      if (current) {
        current.dispatchEvent(new Event("v2-destroy"));
      }
    }

    function openPanelContent(appId) {
      const app = appById.get(appId);
      if (!app) {
        return;
      }
      panelTitle.textContent = appTitle(app);
      destroyPanelContent();
      panelContent.innerHTML = "";
      panelContent.appendChild(buildAppContent(appId, mobileEnv));
      panel.classList.add("open");
      panelContent.scrollTop = 0;
    }

    function openPanel(appId) {
      const protectedPath = appAccessPath(appId);
      if (protectedPath && !canAccess(protectedPath)) {
        requestPathAccess(protectedPath, () => openPanelContent(appId));
        return;
      }
      openPanelContent(appId);
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

    function createMobileSection(titleKey, apps) {
      const section = document.createElement("section");
      section.className = "mobile-section";

      const title = document.createElement("div");
      title.className = "mobile-section-title";
      title.textContent = tr(titleKey);

      const grid = document.createElement("div");
      grid.className = "mobile-grid";

      apps.forEach((app) => {
        const icon = document.createElement("button");
        icon.type = "button";
        icon.className = "mobile-app";
        icon.setAttribute("aria-label", appTitle(app));

        const glyph = createAppGlyphElement(app, "mobile-app-glyph");

        const label = document.createElement("div");
        label.className = "mobile-app-label";
        label.textContent = appLabel(app);

        icon.appendChild(glyph);
        icon.appendChild(label);
        icon.addEventListener("click", () => openPanel(app.id));
        grid.appendChild(icon);
      });

      section.appendChild(title);
      section.appendChild(grid);
      return section;
    }

    const publicApps = APPS.filter((app) =>
      ["hours", "location", "menu", "events", "contacts", "public-files"].includes(app.id)
    );
    const systemApps = APPS.filter((app) =>
      ["filesystem", "lore", "decryptor", "trash"].includes(app.id)
    );

    launchpad.appendChild(createMobileSection("mobile.section.public", publicApps));
    launchpad.appendChild(createMobileSection("mobile.section.system", systemApps));

    const dock = document.createElement("div");
    dock.className = "mobile-dock";
    dock.textContent = tr("mobile.dock");

    shell.appendChild(status);
    shell.appendChild(brand);
    shell.appendChild(launchpad);
    shell.appendChild(dock);
    shell.appendChild(panel);
    shell.appendChild(authOverlay);
    root.appendChild(shell);

    const unbind = onSession(() => {
      statusLeft.textContent = tr("status.net") + " // " + sessionRoleText() + " // " + languageLabel();
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
      statusLeft.textContent = tr("status.net") + " // " + sessionRoleText() + " // " + languageLabel();
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

    const fileMenu = createMenuGroup("file", tr("menu.file", null, "file"));
    addMenuAction(fileMenu.panel, tr("menu.reopen", null, "Reopen startup windows"), () => {
      openStartupWindows();
    });
    addMenuAction(fileMenu.panel, tr("menu.minimizeAll", null, "Minimize all windows"), () => {
      windowMap.forEach((win, windowKey) => {
        const titleNode = win.querySelector(".v2-window-title");
        const dockLabel = titleNode ? titleNode.textContent || "window" : "window";
        minimizeWindow(windowKey, dockLabel);
      });
    });

    const editMenu = createMenuGroup("edit", tr("menu.edit", null, "edit"));
    addMenuAction(editMenu.panel, tr("menu.resetIcons", null, "Reset icon positions"), () => {
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

    const viewMenu = createMenuGroup("view", tr("menu.view", null, "view"));
    viewMenuBtn = viewMenu.button;
    viewHiddenRow = addMenuAction(viewMenu.panel, tr("menu.showHidden", null, "Show hidden apps"), () => {
      showHiddenApps = !showHiddenApps;
      applyHiddenIconVisibility();
      ensureIconLayoutNoOverlap();
    });

    const toolsMenu = createMenuGroup("tools", tr("menu.tools", null, "tools"));
    addMenuAction(toolsMenu.panel, tr("menu.openRepair", null, "Open file repair"), () => {
      createAppWindow("decryptor");
    });
    addMenuAction(toolsMenu.panel, tr("menu.openTerminal", null, "Open terminal"), () => {
      createAppWindow("terminal");
    });
    addMenuDivider(toolsMenu.panel);
    addMenuAction(toolsMenu.panel, tr("menu.openTrash", null, "Open recycle bin"), () => {
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

    const authOverlay = document.createElement("div");
    authOverlay.className = "v2-auth-overlay";
    authOverlay.hidden = true;

    const authCard = document.createElement("div");
    authCard.className = "v2-auth-card";
    authOverlay.appendChild(authCard);

    workspace.appendChild(icons);
    workspace.appendChild(windows);
    workspace.appendChild(dock);
    shell.appendChild(topbar);
    shell.appendChild(workspace);
    shell.appendChild(authOverlay);
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

    function closeAuthOverlay() {
      authOverlay.hidden = true;
      authCard.innerHTML = "";
    }

    authOverlay.addEventListener("click", (event) => {
      if (event.target === authOverlay) {
        closeAuthOverlay();
      }
    });

    function openAuthOverlay(kind, onSuccess) {
      authCard.innerHTML = "";

      const header = document.createElement("div");
      header.className = "v2-auth-header";

      const title = document.createElement("div");
      title.className = "v2-auth-title";
      title.textContent = kind === "founder" ? tr("auth.title.founder") : tr("auth.title.staff");

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "v2-auth-close";
      closeBtn.textContent = tr("auth.close");
      closeBtn.addEventListener("click", closeAuthOverlay);

      const form = createAccessForm({
        mode: kind,
        onSuccess: () => {
          closeAuthOverlay();
          if (typeof onSuccess === "function") {
            onSuccess();
          }
        }
      });

      header.appendChild(title);
      header.appendChild(closeBtn);
      authCard.appendChild(header);
      authCard.appendChild(form);
      authOverlay.hidden = false;
    }

    function requestPathAccess(path, onSuccess) {
      const normalized = normalizePath(path);
      if (canAccess(normalized)) {
        if (typeof onSuccess === "function") {
          onSuccess();
        }
        return;
      }
      if (isFounder(normalized)) {
        if (!session.staff) {
          openAuthOverlay("staff", () => requestPathAccess(normalized, onSuccess));
          return;
        }
        openAuthOverlay("founder", onSuccess);
        return;
      }
      if (isSecure(normalized)) {
        openAuthOverlay("staff", onSuccess);
      }
    }

    function applyHiddenIconVisibility() {
      shell.classList.toggle("show-hidden-apps", showHiddenApps);
      if (viewMenuBtn) {
        viewMenuBtn.classList.toggle("active", showHiddenApps);
        viewMenuBtn.title = showHiddenApps
          ? tr("menu.hideHidden", null, "Hide hidden desktop apps")
          : tr("menu.showHidden", null, "Show hidden desktop apps");
      }
      if (viewHiddenRow) {
        viewHiddenRow.classList.toggle("checked", showHiddenApps);
        viewHiddenRow.textContent = showHiddenApps
          ? tr("menu.hideHidden", null, "Hide hidden apps")
          : tr("menu.showHidden", null, "Show hidden apps");
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
        const contentRoot = body.firstElementChild;
        if (contentRoot) {
          contentRoot.dispatchEvent(new Event("v2-destroy"));
        }
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
      return tr("document.dock", { name }, "DOC " + name);
    }

    function buildDocumentContent(path) {
      const wrap = document.createElement("section");
      wrap.className = "v2-document";

      const pathBar = document.createElement("div");
      pathBar.className = "v2-document-path";
      pathBar.textContent = normalizePath(path);
      pathBar.draggable = true;
      pathBar.title = tr("document.drag");
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
      content.textContent = readFileText(path) || tr("terminal.fileUnavailable");

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
      const name = normalized.split("/").filter(Boolean).slice(-1)[0];
      const title = tr("document.title", { name }, "Document // " + name);
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
      enableFileDrag: true,
      requestPathAccess,
      openApp: launchApp
    };

    function createAppWindow(appId) {
      const app = appById.get(appId);
      if (!app) {
        return null;
      }
      const shellWindow = createShellWindow(
        keyForApp(appId),
        appTitle(app),
        app.glyph + " " + appLabel(app)
      );
      if (shellWindow.created) {
        const content = buildAppContent(appId, desktopEnv);
        shellWindow.body.appendChild(content);
        if (content instanceof Element && content.classList.contains("v2-fs")) {
          shellWindow.body.classList.add("v2-window-body-fs");
        }
        if (appId === "terminal") {
          shellWindow.body.classList.add("v2-window-body-terminal");
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

    function launchApp(appId) {
      const protectedPath = appAccessPath(appId);
      if (protectedPath && !canAccess(protectedPath)) {
        requestPathAccess(protectedPath, () => launchApp(appId));
        return null;
      }
      return createAppWindow(appId);
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
      label.textContent = appLabel(app);

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
        launchApp(app.id);
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
    applyLanguageMode();
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
      applyLanguageMode();
      renderBoot();
      return;
    }
    if (phase === "intro") {
      mode = "";
      applyLanguageMode();
      renderLanguageGate();
      return;
    }

    mode = nextMode;
    applyLanguageMode();
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
