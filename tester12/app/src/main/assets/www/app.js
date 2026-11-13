/* 12 Testers Free — giao diện chính (bản 2: nền đen, 4 tab) */
(function () {
  "use strict";

  // ================================================================ helpers
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const A = window.Android || null;
  const ST = window.STARS;
  const CG = window.COMMUNITY_GROUP;
  const root = $("#root"), layer = $("#layer");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function fmt(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars ? vars[k] : "{" + k + "}"));
  }
  let LANG = "en";
  function t(k, vars) {
    const d = I18N[LANG] || {};
    const v = d[k] != null ? d[k] : (I18N.en[k] != null ? I18N.en[k] : k);
    return fmt(v, vars);
  }
  const pad = n => String(n).padStart(2, "0");
  function dstr(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return dstr(new Date()); }
  function parseD(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
  function addDays(s, n) { const d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); }
  function diffDays(a, b) { return Math.round((parseD(b) - parseD(a)) / 86400000); }
  function ms(ts) {
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (ts instanceof Date) return ts.getTime();
    return typeof ts === "number" ? ts : 0;
  }
  function ago(ts) {
    const m = ms(ts); if (!m) return "";
    const s = Math.max(0, (Date.now() - m) / 1000);
    if (s < 3600) return t("agoM", { n: Math.max(1, Math.floor(s / 60)) });
    if (s < 86400) return t("agoH", { n: Math.floor(s / 3600) });
    if (s < 86400 * 14) return t("agoD", { n: Math.floor(s / 86400) });
    return t("agoW", { n: Math.floor(s / 604800) });
  }
  function untilMidnight() {
    const n = new Date(), e = new Date(n); e.setHours(24, 0, 0, 0);
    const m = Math.floor((e - n) / 60000);
    return Math.floor(m / 60) + "h " + pad(m % 60) + "m";
  }
  const COLORS = ["#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#059669", "#0891B2", "#4F46E5", "#B45309"];
  function colorFor(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; }
  function iconHtml(a, cls) {
    if (a && a.icon) return `<img class="ico ${cls || ""}" src="${esc(a.icon)}" alt="">`;
    const ch = (String((a && a.name) || "?").trim()[0] || "?").toUpperCase();
    return `<div class="ico ${cls || ""}" style="background:${colorFor((a && a.pkg) || ch)}">${esc(ch)}</div>`;
  }
  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.classList.remove("hidden");
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.add("hidden"), 2600);
  }
  function openUrl(u) { if (A) A.openUrl(u); else window.open(u, "_blank"); }
  const optinUrl = pkg => "https://play.google.com/apps/testing/" + pkg;
  const playUrl = pkg => "https://play.google.com/store/apps/details?id=" + pkg;
  const isGmail = e => /^[a-z0-9._%+-]+@(gmail|googlemail)\.com$/i.test(String(e).trim());
  const isPkg = p => /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(p);
  function pkgFrom(s) {
    s = String(s || "").trim();
    const m = s.match(/[?&]id=([a-zA-Z0-9_.]+)/) || s.match(/apps\/testing\/([a-zA-Z0-9_.]+)/);
    return m ? m[1] : s;
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
      ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (_) {}
      ta.remove(); return ok;
    }
  }
  function busy(btn, on) { if (btn) btn.disabled = !!on; }
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  // Chọn ảnh rồi nén JPEG (ảnh chụp màn hình) hoặc cắt vuông (icon)
  function pickImage(opt) {
    opt = opt || {};
    return new Promise(resolve => {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*";
      inp.onchange = () => {
        const f = inp.files && inp.files[0]; if (!f) return resolve(null);
        const fat = f.lastModified || 0;
        const img = new Image();
        img.onload = () => {
          let out = "";
          const limit = opt.limit || 110000;
          if (opt.square) {
            const side = Math.min(img.width, img.height), S = opt.square;
            const c = document.createElement("canvas"); c.width = c.height = S;
            c.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
            out = c.toDataURL("image/jpeg", 0.85);
          } else {
            let maxSide = opt.max || 1000, q = 0.6;
            for (let i = 0; i < 6; i++) {
              const k = Math.min(1, maxSide / Math.max(img.width, img.height));
              const c = document.createElement("canvas");
              c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
              c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
              out = c.toDataURL("image/jpeg", q);
              if (out.length < limit) break;
              maxSide = Math.round(maxSide * 0.8); q = Math.max(0.4, q - 0.05);
            }
          }
          URL.revokeObjectURL(img.src);
          const okImg = out.length < limit * 1.2 ? out : null;
          resolve(opt.withTime ? (okImg ? { img: okImg, at: fat } : null) : okImg);
        };
        img.onerror = () => resolve(null);
        img.src = URL.createObjectURL(f);
      };
      inp.click();
    });
  }

  // ---- gọi máy (Android) có hồi đáp
  let cbN = 0;
  function nativeCb(fn) { const id = "__cb" + (++cbN); window[id] = v => { delete window[id]; fn(v); }; return id; }
  // Ảnh chụp màn hình + giờ chụp (máy thật đọc từ thư viện ảnh)
  function pickShot() {
    if (A && A.pickShot) return new Promise(res => A.pickShot(nativeCb(v => {
      try { v = typeof v === "string" ? JSON.parse(v) : v; } catch (e) { v = null; }
      res(v && v.img ? v : null);
    })));
    return pickImage({ withTime: true });
  }
  // Đọc chữ trong ảnh (ML Kit trên máy). null = máy không đọc được
  function ocrImage(img) {
    if (!A || !A.ocr) return Promise.resolve(null);
    return new Promise(res => { A.ocr(img, nativeCb(v => res(typeof v === "string" ? v : null))); setTimeout(() => res(null), 20000); });
  }
  // App đã cài chưa, có cài từ Google Play không
  function installState(pkg) {
    if (!A || !A.isInstalled) return { installed: true, fromPlay: true };
    const inst = !!A.isInstalled(pkg);
    let src = "com.android.vending";
    try { if (A.installerOf) src = A.installerOf(pkg) || ""; } catch (e) {}
    return { installed: inst, fromPlay: inst && src === "com.android.vending" };
  }
  const hm = ts => { const d = new Date(ts); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };

  // ================================================================ overlays
  const stack = [];
  function sheet(html, onMount) {
    const ov = document.createElement("div");
    ov.className = "overlay";
    ov.innerHTML = `<div class="sheet"><div class="grab"></div>${html}</div>`;
    ov.addEventListener("click", e => { if (e.target === ov) closeTop(); });
    layer.appendChild(ov); stack.push(ov);
    if (onMount) onMount(ov.firstElementChild);
    return ov;
  }
  function page(title, html, onMount) {
    const pg = document.createElement("div");
    pg.className = "page";
    pg.innerHTML = `<div class="bar-top"><button class="back" data-back>${IC.back}</button><h2>${esc(title)}</h2></div><div class="inner">${html}</div>`;
    $("[data-back]", pg).onclick = closeTop;
    layer.appendChild(pg); stack.push(pg);
    if (onMount) onMount(pg);
    return pg;
  }
  function closeTop() { const ov = stack.pop(); if (ov) ov.remove(); }
  function closeAll() { while (stack.length) closeTop(); }
  function ask(message, okLabel, danger) {
    return new Promise(res => {
      sheet(`<p style="font-size:16px;margin:8px 0 4px">${esc(message)}</p>
        <div class="btns"><button class="btn ghost" data-a="no">${esc(t("cancel"))}</button>
        <button class="btn ${danger ? "red" : ""}" data-a="yes">${esc(okLabel || t("confirm"))}</button></div>`,
        el => el.addEventListener("click", e => {
          const a = e.target.closest("[data-a]"); if (!a) return;
          closeTop(); res(a.dataset.a === "yes");
        }));
    });
  }
  window.onAndroidBack = function () {
    if (stack.length) { closeTop(); return true; }
    if (S.user && S.me && S.tab !== "test") { go("test"); return true; }
    return false;
  };
  window.onAndroidResume = function () {
    if (backFromApp()) return;
    if (curTest && curTest.pg.isConnected) { curTest.paint(); return; }
    if (S.user && S.me && !stack.length && (S.tab === "test" || S.tab === "tasks")) renderTab();
  };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) backFromApp(); });

  // ================================================================ icons
  const IC = {
    dl: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    swap: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h12l-3-3M17 17H5l3 3"/></svg>',
    cal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    back: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
    search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5" stroke-linecap="round"/></svg>',
    check: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 10"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01" stroke-linecap="round"/></svg>',
    flag: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 21V4h11l-1.5 4L16 12H5"/></svg>',
    share: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5"/></svg>',
    copy: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg>',
    cam: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    img: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="4" width="15" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M3 16l4-4 5 5M19 2v6M16 5h6"/></svg>',
    ext: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>',
    help: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17h.01"/></svg>',
    bell: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15zM10 21h4"/></svg>',
    bellP: '<path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15zM10 21h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
    chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
    edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    star: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.2 6.6.7-5 4.5 1.4 6.6L12 17.2l-5.9 3.3 1.4-6.6-5-4.5 6.6-.7z"/></svg>',
    home: '<path d="M4 11l8-7 8 7v9H4z M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    market: '<path d="M4 9l1.5-5h13L20 9M4 9h16v11H4zM4 9c0 2 3.5 2 4 0 .5 2 3.5 2 4 0 .5 2 3.5 2 4 0 .5 2 4 2 4 0M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M7 15h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    tasks: '<rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12.5l2.7 2.7L16 9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    user: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  };
  const starTxt = n => `<span class="star">${IC.star}</span><b>${n || 0}</b>`;

  // Hình minh họa Play Console (vẽ dạng màn hình điện thoại)
  function phoneSvg() {
    return `<svg class="phone" viewBox="0 0 230 400" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,Roboto,sans-serif">
      <rect x="2" y="2" width="226" height="396" rx="28" fill="#1C1C1E" stroke="#3A3A3C" stroke-width="3"/>
      <rect x="12" y="14" width="206" height="372" rx="20" fill="#fff"/>
      <rect x="92" y="20" width="46" height="7" rx="3.5" fill="#1C1C1E"/>
      <rect x="12" y="36" width="206" height="38" fill="#F1F3F4"/>
      <path d="M26 55l6-6M26 55l6 6M26 55h12" stroke="#5F6368" stroke-width="2" stroke-linecap="round"/>
      <text x="48" y="59" font-size="12" font-weight="700" fill="#202124">${esc(t("phTrack"))}</text>
      <text x="26" y="95" font-size="10.5" fill="#5F6368">${esc(t("phTabTrack"))}</text>
      <text x="118" y="95" font-size="10.5" font-weight="700" fill="#1A73E8">${esc(t("phTabTesters"))}</text>
      <rect x="112" y="100" width="70" height="2.5" rx="1" fill="#1A73E8"/>
      <line x1="12" y1="103" x2="218" y2="103" stroke="#E0E0E0"/>
      <circle cx="30" cy="126" r="6" fill="none" stroke="#9AA0A6" stroke-width="1.6"/>
      <text x="44" y="130" font-size="11" fill="#3C4043">${esc(t("phEmails"))}</text>
      <circle cx="30" cy="152" r="6" fill="none" stroke="#1A73E8" stroke-width="1.6"/><circle cx="30" cy="152" r="3" fill="#1A73E8"/>
      <text x="44" y="156" font-size="11" font-weight="700" fill="#202124">Google Groups</text>
      <rect x="22" y="170" width="186" height="64" rx="6" fill="none" stroke="#EF4444" stroke-width="2.5"/>
      <text x="32" y="188" font-size="9" fill="#5F6368">${esc(t("phEmailAddr"))}</text>
      <rect x="30" y="194" width="170" height="28" rx="4" fill="#F8F9FA" stroke="#DADCE0"/>
      <text x="35" y="212" font-size="8.9" font-weight="700" fill="#202124">${esc(CG.email)}</text>
      <path d="M196 262 L172 238" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/>
      <path d="M170 248 L170 236 L182 236" fill="none" stroke="#EF4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="26" y="262" font-size="9.5" fill="#5F6368">${esc(t("phPaste"))}</text>
      <rect x="140" y="330" width="64" height="30" rx="15" fill="#1A73E8"/>
      <text x="172" y="349" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">${esc(t("phSave"))}</text>
    </svg>`;
  }

  // ================================================================ state
  const S = { user: null, me: null, tab: "test", sub: "need", apps: null, appsAt: 0, joined: null, mine: null, mineT: {},
    openMine: null, q: "", rejs: [], shown: 15, moreFn: null };
  let auth, db, FV;
  let pendingName = "", skipOnboard = false;

  // ================================================================ language
  const SUPPORTED = ["vi", "en", "hi", "id", "pt", "es", "fr", "de", "ru", "tr", "ar", "bn", "ur", "th", "ms", "fil", "zh", "ja", "ko", "it"];
  function deviceLang() {
    let d = String(A && A.deviceLang ? A.deviceLang() : (navigator.language || "en")).toLowerCase();
    d = d.split(/[-_]/)[0];
    if (d === "tl") d = "fil"; if (d === "in") d = "id";
    return SUPPORTED.includes(d) ? d : "en";
  }
  // tên bản ngữ, xếp theo mức phổ biến
  const LANG_NAMES = { en: "English", es: "Español", pt: "Português", hi: "हिन्दी", id: "Bahasa Indonesia", vi: "Tiếng Việt",
    fr: "Français", de: "Deutsch", ru: "Русский", tr: "Türkçe", ar: "العربية", bn: "বাংলা", ur: "اردو", zh: "中文",
    ja: "日本語", ko: "한국어", th: "ไทย", ms: "Bahasa Melayu", fil: "Filipino", it: "Italiano" };
  function langPref() { return LS.get("langPref", "auto"); }
  function resolveLang() { if (!LS.get("langChosen", false)) return "en"; const p = langPref(); return p === "auto" ? deviceLang() : (SUPPORTED.includes(p) ? p : "en"); }
  function loadLang(l) {
    return new Promise(res => {
      if (I18N[l]) return res();
      const s = document.createElement("script");
      s.src = "lang/" + l + ".js"; s.onload = res; s.onerror = res;
      document.head.appendChild(s);
    });
  }
  async function applyLang() {
    let l = resolveLang();
    await loadLang(l);
    if (!I18N[l]) l = "en";
    LANG = l;
    document.documentElement.lang = l;
    document.documentElement.dir = (l === "ar" || l === "ur") ? "rtl" : "ltr";
  }

  // ================================================================ boot
  async function boot() {
    await applyLang();
    if (typeof firebase === "undefined") {
      root.innerHTML = `<div class="empty"><div class="big">📶</div><p>${esc(t("errNet"))}</p>
        <button class="btn" onclick="location.reload()">${esc(t("retry"))}</button></div>`;
      return;
    }
    firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth(); db = firebase.firestore();
    try { db.settings({ experimentalAutoDetectLongPolling: true, merge: true }); } catch (e) {}
    FV = firebase.firestore.FieldValue;
    auth.onAuthStateChanged(async u => {
      closeAll();
      Object.assign(S, { user: u, me: null, apps: null, joined: null, mine: null, mineT: {}, tab: "test", sub: "need", openMine: null, q: "", rejs: [] });
      skipOnboard = false; SU = null;
      Object.keys(proofs).forEach(k => delete proofs[k]); away = null; curTest = null;
      if (!u) { renderAuth("login"); return; }
      if (!LS.get("langChosen", false)) { LS.set("langChosen", true); if (LS.get("langPref", null) == null) LS.set("langPref", "auto"); await applyLang(); }
      root.innerHTML = `<div class="spinner"></div>`;
      try {
        await loadMe(); await Promise.all([loadMine(), loadJoined(), loadApps()]);
        await missionCheck(); setupNotify(); renderShell();
        loadMineTesters().then(refreshDot).catch(() => {}); reconcileRejects().then(refreshDot);
      }
      catch (e) {
        console.error(e);
        root.innerHTML = `<div class="empty"><div class="big">⚠️</div><p>${esc(t("errNet"))}</p>
          <button class="btn" id="rt">${esc(t("retry"))}</button></div>`;
        $("#rt").onclick = () => location.reload();
      }
    });
  }
  const userRef = () => db.collection("users").doc(S.user.uid);
  const appRef = id => db.collection("apps").doc(id);
  const testerRef = (appId, uid) => appRef(appId).collection("testers").doc(uid);

  async function loadMe() {
    const snap = await userRef().get();
    if (!snap.exists) {
      const data = {
        name: (pendingName || S.user.displayName || (S.user.email || "").split("@")[0]).slice(0, 40),
        testerEmail: isGmail(S.user.email || "") ? S.user.email.toLowerCase() : "",
        stars: 0, lang: LANG, setup: false, createdAt: FV.serverTimestamp()
      };
      await userRef().set(data);
      S.me = Object.assign({}, data, { stars: 0 });
      pendingName = "";
    } else {
      S.me = snap.data();
      if (S.me.stars == null) S.me.stars = 0;
    }
  }

  // ================================================================ auth screen
  function logoHtml() { return `<div class="logo"><b>12</b><small>TESTERS</small><i>FREE</i></div>`; }
  function googleReady() {
    return !!(A && A.googleSignIn && window.GOOGLE_WEB_CLIENT_ID && /\.apps\.googleusercontent\.com$/.test(GOOGLE_WEB_CLIENT_ID));
  }
  function signOut() { if (A && A.googleSignOut) A.googleSignOut(); if (A && A.setNotify) A.setNotify(""); return auth.signOut(); }

  let langOpen = false;
  function renderAuth(mode) {
    const reg = mode === "register";
    const keep = ["aname", "aemail", "apass"].map(id => { const e = document.getElementById(id); return e ? e.value : ""; });
    root.innerHTML = `
      <div class="auth">
        <div class="lwrap" dir="ltr">
          <button class="lsel ${langOpen ? "open" : ""}" id="alang"><span>🌐</span><b class="grow">${esc(LANG_NAMES[LANG] || "English")}</b><span class="car">▾</span></button>
          ${langOpen ? `<div class="llist">${[deviceLang()].concat(Object.keys(LANG_NAMES).filter(k => k !== deviceLang())).map(k => `<button class="lopt ${k === LANG ? "on" : ""}" data-l="${k}">
            <b>${esc(LANG_NAMES[k])}</b>${k === deviceLang() ? `<small>📱</small>` : ""}${k === LANG ? `<i>✓</i>` : ""}</button>`).join("")}</div>` : ""}
        </div>
        ${logoHtml()}
        <h1>12 Testers Free</h1>
        <p class="tag2">${esc(t("tagline"))}</p>
        ${googleReady() ? `<button class="btn block gbtn" id="agoogle">
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
          ${esc(t("googleLogin"))}</button>
        <div class="or"><span>${esc(t("orEmail"))}</span></div>` : ""}
        <div class="card">
          ${reg ? `<label class="l" style="margin-top:0">${esc(t("name"))}</label><input id="aname" type="text" maxlength="40">` : ""}
          <label class="l" ${reg ? "" : 'style="margin-top:0"'}>${esc(t("email"))}</label><input id="aemail" type="email" autocomplete="email" placeholder="you@gmail.com">
          <label class="l">${esc(t("password"))}</label><input id="apass" type="password" autocomplete="${reg ? "new-password" : "current-password"}">
          <div class="err" id="aerr"></div>
          <button class="btn block" id="ago">${esc(reg ? t("register") : t("login"))}</button>
          <div class="row" style="justify-content:space-between;margin-top:6px">
            <button class="link" id="aswitch">${esc(reg ? t("haveAcc") : t("noAcc"))}</button>
            ${reg ? "" : `<button class="link muted" id="aforgot">${esc(t("forgot"))}</button>`}
          </div>
        </div>
      </div>`;
    const err = $("#aerr");
    ["aname", "aemail", "apass"].forEach((id, i) => { const e = document.getElementById(id); if (e && keep[i]) e.value = keep[i]; });
    $("#alang").onclick = () => { langOpen = !langOpen; renderAuth(mode); };
    $$("[data-l]").forEach(b => b.onclick = async () => {
      LS.set("langPref", b.dataset.l); LS.set("langChosen", true); langOpen = false;
      await applyLang(); renderAuth(mode);
    });
    $("#aswitch").onclick = () => renderAuth(reg ? "login" : "register");
    const gb = $("#agoogle");
    if (gb) gb.onclick = () => {
      err.textContent = ""; busy(gb, true);
      window.onGoogleToken = async tok => {
        try { await auth.signInWithCredential(firebase.auth.GoogleAuthProvider.credential(tok)); }
        catch (e) {
          console.error(e); busy(gb, false);
          err.textContent = String(e && e.code).includes("account-exists") ? t("errGoogleExists") : t("errGoogle") + " [" + ((e && (e.code || e.message)) || "?") + "]";
        }
      };
      window.onGoogleError = msg => { busy(gb, false); if (msg !== "cancel") { console.error(msg); err.textContent = t("errGoogle") + " [" + String(msg).slice(0, 160) + "]"; } };
      A.googleSignIn(GOOGLE_WEB_CLIENT_ID);
    };
    if (!reg) $("#aforgot").onclick = async () => {
      const em = $("#aemail").value.trim();
      if (!/^\S+@\S+\.\S+$/.test(em)) { err.textContent = t("errEmail"); return; }
      try { await auth.sendPasswordResetEmail(em); err.textContent = ""; toast(t("resetSent")); }
      catch (e) { err.textContent = t("errNet"); }
    };
    $("#ago").onclick = async ev => {
      const em = $("#aemail").value.trim(), pw = $("#apass").value;
      const nm = reg ? $("#aname").value.trim() : "";
      if (reg && !nm) { err.textContent = t("errName"); return; }
      if (!/^\S+@\S+\.\S+$/.test(em)) { err.textContent = t("errEmail"); return; }
      if (pw.length < 6) { err.textContent = t("errPass"); return; }
      err.textContent = ""; busy(ev.target, true);
      try {
        if (reg) { pendingName = nm; await auth.createUserWithEmailAndPassword(em, pw); }
        else await auth.signInWithEmailAndPassword(em, pw);
      } catch (e) {
        const c = (e && e.code) || "";
        err.textContent = c.includes("email-already") ? t("errExists")
          : (c.includes("wrong-password") || c.includes("user-not-found") || c.includes("invalid-credential") || c.includes("invalid-login")) ? t("errLogin")
          : c.includes("invalid-email") ? t("errEmail") : c.includes("weak-password") ? t("errPass") : t("errNet");
        busy(ev.target, false);
      }
    };
  }

  // ================================================================ onboarding (nhóm chung)
  const onboarded = () => LS.get("onboard_" + S.user.uid, false);
  const setOnboarded = () => LS.set("onboard_" + S.user.uid, true);
  function copyRowHtml() {
    return `<div class="copyrow" data-copy><div class="grow"><small>${esc(t("tapCopy"))}</small><b>${esc(CG.email)}</b></div><div class="cbtn">${IC.copy}</div></div>`;
  }
  function bindCopy(el) {
    $$("[data-copy]", el).forEach(b => b.onclick = async () => toast((await copyText(CG.email)) ? t("copiedGroup") : CG.email));
  }
  function onboardHtml(inSheet) {
    return `
      ${inSheet ? `<h2>${esc(t("obTitle"))}</h2>` : `${logoHtml()}<h1 style="text-align:center;font-size:23px;margin:0 0 6px">${esc(t("obTitle"))}</h1>`}
      <p class="sub" style="${inSheet ? "" : "text-align:center;"}margin:0 0 16px">${esc(t("obIntro"))}</p>
      <div class="card">
        <div class="row" style="align-items:flex-start"><div class="num">1</div>
          <div class="grow"><div class="title" style="font-size:16px">${esc(t("ob1Title"))}</div>
          <div class="sub">${esc(t("ob1Body", { email: S.me.testerEmail || S.user.email || "" }))}</div></div></div>
        <button class="btn block" data-ob="join" style="margin-top:12px">${esc(t("ob1Btn"))}</button>
      </div>
      <div class="card">
        <div class="row" style="align-items:flex-start"><div class="num">2</div>
          <div class="grow"><div class="title" style="font-size:16px">${esc(t("ob2Title"))}</div>
          <div class="sub">${esc(t("ob2Body"))}</div></div></div>
        ${copyRowHtml()}
        <div class="btns"><button class="btn ghost" data-ob="console">${IC.ext} ${esc(t("goConsole"))}</button>
          <button class="btn" data-ob="guide">${IC.help} ${esc(t("guideBtn"))}</button></div>
        <div class="hint">${esc(t("ob2Skip"))}</div>
      </div>
      ${inSheet ? `<button class="btn block ghost" data-ob="close">${esc(t("close"))}</button>` : `
      <button class="btn block" data-ob="done">${esc(t("obDone"))}</button>
      <div class="row" style="justify-content:center"><button class="link muted" data-ob="later">${esc(t("obLater"))}</button></div>`}`;
  }
  function bindOnboard(el) {
    bindCopy(el);
    $$("[data-ob]", el).forEach(b => b.onclick = () => {
      const k = b.dataset.ob;
      if (k === "join") openUrl(CG.link);
      else if (k === "console") openUrl(CONSOLE_URL);
      else if (k === "guide") slideGuide();
      else if (k === "close") closeTop();
      else if (k === "done") { setOnboarded(); renderShell(); }
      else if (k === "later") { skipOnboard = true; renderShell(); }
    });
  }

  // ================================================================ shell
  const TABS = [["test", "tabTest", IC.flask], ["tasks", "tabTasks", IC.tasks], ["mine", "tabMine", IC.market], ["me", "tabMe", IC.user]];
  function renderShell() {
    root.innerHTML = `<main id="main"></main>
      <nav class="tabs">${TABS.map(([id, k, svg]) =>
        `<button data-tab="${id}"><svg viewBox="0 0 24 24">${svg}</svg>${esc(t(k))}</button>`).join("")}</nav>`;
    $$("nav.tabs button").forEach(b => b.onclick = () => go(b.dataset.tab));
    go(S.tab);
  }
  function go(tab, opts) {
    S.tab = tab; S.shown = PAGE; S.moreFn = null;
    $$("nav.tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    window.scrollTo(0, 0);
    renderTab(opts);
  }
  function renderTab(opts) {
    const m = $("#main"); if (!m) return;
    if (S.tab === "test") return renderTest(m);
    if (S.tab === "tasks") return renderTasks(m);
    if (S.tab === "mine") return renderMine(m);
    return renderMe(m);
  }
  function spin(m) { m.innerHTML = `<div class="spinner"></div>`; }
  function failBox(m, fn) {
    m.innerHTML = `<div class="empty"><div class="big">⚠️</div><p>${esc(t("errNet"))}</p><button class="btn" id="rt">${esc(t("retry"))}</button></div>`;
    $("#rt").onclick = fn;
  }
  function header(title, subtitle, right) {
    return `<div class="ph"><div class="grow"><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>${right || ""}</div>`;
  }

  // ================================================================ data
  async function loadApps(force) {
    if (!force && S.apps && Date.now() - S.appsAt < 120000) return S.apps;
    const q = await db.collection("apps").orderBy("createdAt", "desc").limit(100).get();
    const list = []; q.forEach(d => list.push(Object.assign({ id: d.id }, d.data())));
    // tạm dừng = chủ app quá IDLE_DAYS ngày chưa test app người khác (testedAt; app mới tính từ lúc đăng)
    list.forEach(a => { const base = ms(a.testedAt) || ms(a.createdAt); a.paused = !!base && Date.now() - base > IDLE_DAYS * 86400000; });
    S.apps = list; S.appsAt = Date.now();
    if (A && A.markSeen) A.markSeen(String(Date.now()));
    return list;
  }
  async function loadJoined(force) {
    if (S.joined && !force) return S.joined;
    const q = await userRef().collection("joined").get();
    const map = {}; q.forEach(d => { map[d.id] = Object.assign({ id: d.id }, d.data()); });
    S.joined = map; return map;
  }
  async function loadMine(force) {
    if (S.mine && !force) return S.mine;
    const q = await db.collection("apps").where("ownerUid", "==", S.user.uid).get();
    const list = []; q.forEach(d => list.push(Object.assign({ id: d.id }, d.data())));
    list.forEach(a => { const base = ms(a.testedAt) || ms(a.createdAt); a.paused = !!base && Date.now() - base > IDLE_DAYS * 86400000; });
    list.sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
    S.mine = list; return list;
  }
  async function loadMineTesters() {
    S.mineT = {};
    await Promise.all((S.mine || []).map(async a => {
      const q = await appRef(a.id).collection("testers").get();
      const arr = []; q.forEach(d => arr.push(d.data()));
      arr.sort((x, y) => ms(x.joinedAt) - ms(y.joinedAt));
      S.mineT[a.id] = arr;
    }));
  }
  // trạng thái từng ngày của 1 người test (a: duyệt, r: từ chối, p: chờ duyệt, m: bỏ lỡ)
  function dayInfo(td) {
    td = td || {};
    const join = td.joinDay || today(), now = today();
    const sub = td.sub || {}, rev = td.rev || {};
    const cur = diffDays(join, now) + 1;
    const cells = [];
    let done = 0, ok = 0;
    for (let i = 0; i < 14; i++) {
      const d = addDays(join, i);
      let s = "";
      if (rev[d] === "a") s = "a"; else if (rev[d] === "r") s = "r"; else if (sub[d]) s = "p";
      else if (d < now) s = "m";
      if (sub[d]) done++;
      if (rev[d] === "a") ok++;
      cells.push({ d, s, today: d === now });
    }
    const pending = Object.keys(sub).filter(d => !rev[d]).sort();
    return { cur, cells, done, ok, pending, finished: cur > 14, todayDone: !!sub[now] };
  }
  const daysStrip = info => `<div class="days">${info.cells.map(c => `<i class="${c.s} ${c.today ? "t" : ""}"></i>`).join("")}</div>`;
  const legend = () => `<div class="legend"><span class="a">${esc(t("stA"))}</span><span class="p">${esc(t("stP"))}</span><span class="r">${esc(t("stR"))}</span><span class="m">${esc(t("stM"))}</span></div>`;

  // ================================================================ 3.0 — dữ liệu & nhiệm vụ ngày
  const MISSION = 12, STALE_DAYS = 15, UPD_GAP_DAYS = 7, IDLE_DAYS = 5;
  const verOf = pkg => { try { return A && A.versionOf ? (Number(A.versionOf(pkg)) || 0) : 0; } catch (e) { return 0; } };
  function stale(a) { const s = ms(a.ownerSeen); return !!s && Date.now() - s > STALE_DAYS * 86400000; }
  const jOf = a => (S.joined || {})[a.id];
  const doneTodayJ = j => !!j && j.lastDay === today();
  function testable(a) { return a.ownerUid !== S.user.uid && a.active !== false && !a.done && !stale(a); }
  const availApps = () => (S.apps || []).filter(a => testable(a) && !a.paused);
  function missionN() { return Object.values(S.joined || {}).filter(doneTodayJ).length; }
  function missionT() { return Math.min(MISSION, availApps().length); }
  function daysUp(a) { const c = ms(a.createdAt); return c ? Math.max(1, diffDays(dstr(new Date(c)), today()) + 1) : 1; }
  const hasIssue = a => issList(a).length >= 2;

  // có bản cập nhật không, và có nhận được +5⭐ cập nhật không
  function updState(a, j) {
    if (!j) return { has: false, can: false, iv: 0 };
    const iv = verOf(a.pkg), auto = (a.ver || 0) > (j.ver || 0), man = !!a.upAt && ms(a.upAt) > (j.updAt || 0);
    let can = false;
    if (auto) can = iv >= a.ver && iv > (j.ver || 0);
    else if (man) can = j.ver ? iv > j.ver : installState(a.pkg).installed;
    return { has: auto || man, can, iv };
  }

  const needList = () => availApps().filter(a => !doneTodayJ(jOf(a))).sort(cmpApps);
  const nextApp = ex => needList().find(a => a.id !== ex);
  function awardInfo(b, stars, countMission) {
    const day = today(), md = S.me.mdays || {}, u = { stars: FV.increment(stars) };
    if (countMission) {
      u["mdays." + day + ".n"] = FV.increment(1);
      u["mdays." + day + ".t"] = missionT();
      Object.keys(md).filter(k => k < addDays(day, -10)).forEach(k => { u["mdays." + k] = FV.delete(); });
    }
    b.update(userRef(), u);
  }
  function gotAward(stars, countMission) {
    S.me.stars = (S.me.stars || 0) + stars;
    $$(".mystars").forEach(el => el.innerHTML = starTxt(S.me.stars));
    if (countMission) {
      const day = today(), md = (S.me.mdays = S.me.mdays || {}), e = md[day] || (md[day] = { n: 0, t: 0 });
      e.n++; e.t = missionT();
    }
  }
  const getReminder = () => LS.get("mrem", { on: true });
  function pushMission() {
    if (!(A && A.setMission)) return;
    const n = missionN(), tt = missionT();
    A.setMission(JSON.stringify({ on: getReminder().on !== false, day: today(), n, t: tt,
      title: t("mTitle"), body: t("mBody", { n: "{n}", t: "{t}", l: "{l}", s: "{s}" }), per: ST.test }));
  }

  // ---- kiểm tra nhiệm vụ hôm qua: chưa đủ → tạm dừng 1 app / ngày bỏ lỡ (không cộng dồn nhiệm vụ)
  async function missionCheck() {
    if (!S.mine) return;
    const tdy = today(), me = S.me;
    const lastSeen = LS.get("seenAt_" + S.user.uid, 0);
    try {
      if (S.mine.length && Date.now() - lastSeen > 4 * 3600000) {
        const b = db.batch();
        S.mine.forEach(a => {
          const u = { ownerSeen: FV.serverTimestamp() };
          if (S.apps && !availApps().length) u.testedAt = FV.serverTimestamp();
          const iv = verOf(a.pkg), src = A && A.installerOf ? A.installerOf(a.pkg) : "";
          if (iv > (a.ver || 0) && src === "com.android.vending") { u.ver = iv; a.ver = iv; }
          b.update(appRef(a.id), u);
        });
        await b.commit(); LS.set("seenAt_" + S.user.uid, Date.now());
      }
      if (me.chk !== tdy) { await userRef().update({ chk: tdy }); me.chk = tdy; }
    } catch (e) { console.error(e); }
  }
  // chủ app vừa test app người khác → ghi mốc hoạt động lên các app của mình (hết tạm dừng)
  async function touchOwn() {
    const mine = (S.mine || []).filter(a => !a.done);
    if (!mine.length) return;
    try {
      const b = db.batch(); mine.forEach(a => b.update(appRef(a.id), { testedAt: FV.serverTimestamp() })); await b.commit();
      const was = mine.some(a => a.paused);
      mine.forEach(a => { a.testedAt = new Date(); a.paused = false; });
      (S.apps || []).forEach(a => { if (a.ownerUid === S.user.uid && !a.done) { a.testedAt = new Date(); a.paused = false; } });
      if (was) toast(t("unpausedOk"));
    } catch (e) { console.error(e); }
  }
  // chủ app từ chối ngày test → người test bị trừ 5⭐ (tự trừ khi mở app)
  async function reconcileRejects() {
    S.rejs = [];
    try {
      const lim = addDays(today(), -16);
      const js = Object.values(S.joined || {}).filter(j => (j.joinDay || "") >= lim).slice(0, 25);
      for (const j of js) {
        const s = await testerRef(j.id, S.user.uid).get(); if (!s.exists) continue;
        const td = s.data(), rev = td.rev || {}, why = td.why || {}, pen = j.pen || {};
        for (const d of Object.keys(rev).filter(k => rev[k] === "r")) {
          S.rejs.push({ app: j.name, day: d, why: why[d] || "" });
          if (pen[d]) continue;
          const pay = Math.min(ST.test, S.me.stars || 0);
          const b = db.batch();
          if (pay === ST.test) b.update(userRef(), { stars: FV.increment(-ST.test) });
          b.update(userRef().collection("joined").doc(j.id), { ["pen." + d]: true });
          await b.commit();
          j.pen = Object.assign({}, j.pen, { [d]: true });
          if (pay === ST.test) S.me.stars -= ST.test;
        }
      }
      $$(".mystars").forEach(el => el.innerHTML = starTxt(S.me.stars));
    } catch (e) { console.error(e); }
  }

  // ================================================================ 3.1 — tab Test (1 danh sách gộp) + tab Nhiệm vụ
  const PAGE = 15, POST_COST = 10;
  const notifCount = () => notifItems().filter(x => x.hot).length;
  const bellHtml = () => { const n = notifCount(); return `<button class="rbtn bell" data-bell>${IC.bell}${n ? `<i>${n}</i>` : ""}</button>`; };
  const topRight = () => `<span class="starpill mystars">${starTxt(S.me.stars)}</span>${bellHtml()}`;
  function refreshDot() {
    const n = notifCount();
    $$(".bell").forEach(b => { let i = $("i", b); if (n) { if (!i) { i = document.createElement("i"); b.appendChild(i); } i.textContent = n; } else if (i) i.remove(); });
  }
  document.addEventListener("click", e => { if (e.target.closest("[data-bell]")) openNotif(); });
  window.addEventListener("scroll", () => {
    if (S.moreFn && !stack.length && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 400) S.moreFn();
  }, { passive: true });

  // tên hiển thị gọn như tên nhà phát hành: tối đa 2 từ cuối, 18 ký tự
  const shortName = n => { const w = String(n || "").trim().split(/\s+/).filter(Boolean); const r = (w.length > 2 ? w.slice(-2) : w).join(" "); return r.length > 18 ? r.slice(0, 17) + "…" : r; };
  const isOwn = a => a.ownerUid === S.user.uid;
  const ownList = () => (S.apps || []).filter(a => isOwn(a) && a.active !== false && !a.done && !a.paused);
  const rank = a => { const j = jOf(a); return j ? (doneTodayJ(j) ? 2 : 1) : 3; };
  function cmpApps(x, y) {
    const rx = rank(x), ry = rank(y);
    if (rx !== ry) return rx - ry;
    if (hasIssue(x) !== hasIssue(y)) return hasIssue(x) ? 1 : -1;
    if (rx === 1) { const a = String(jOf(x).lastDay || ""), b = String(jOf(y).lastDay || ""); return a < b ? -1 : a > b ? 1 : 0; }
    if (rx === 3) return (x.testersCount || 0) - (y.testersCount || 0) || ms(y.createdAt) - ms(x.createdAt);
    return 0;
  }
  function listFor(sub) {
    if (sub === "stop") return (S.apps || []).filter(a => a.paused && a.active !== false && !a.done && !stale(a));
    return ownList().concat(availApps().sort(cmpApps));
  }
  function openOwn(a) { if (A && A.openApp) A.openApp(a.pkg); else openUrl(playUrl(a.pkg)); }

  async function renderTest(m) {
    if (!S.apps) spin(m);
    try { await Promise.all([loadApps(), loadJoined(), S.mine ? null : loadMine()]); }
    catch (e) { console.error(e); return failBox(m, () => renderTest(m)); }
    if (S.tab !== "test") return;
    paintTest(m); pushMission(); refreshDot();
  }
  function rowHtml(a, kind) {
    const own = isOwn(a), j = jOf(a), us = updState(a, j), td = doneTodayJ(j), up = daysUp(a), bd = [];
    if (own) bd.push(`<span class="b w">${esc(t("ownerBadge"))}</span>`);
    if (a.paused) bd.push(`<span class="b wa">⏸ ${esc(t("bPaused"))}</span>`);
    if (!own) bd.push(td ? `<span class="b ok">✓ ${esc(t("bToday"))}</span>` : j ? `<span class="b wa">⏳ ${esc(t("bNotToday"))}</span>` : `<span class="b">${esc(t("bNever"))}</span>`);
    if (!own && us.has) bd.push(`<span class="b wa">⤓ ${esc(t("bUpd"))}</span>`);
    if (hasIssue(a)) bd.push(`<span class="b er">⚠ ${esc(t("bLink"))}</span>`);
    const go = own ? `<span class="go">${esc(t("openBtnOwn"))}</span>` : a.paused ? `<span class="go dn">⏸</span>`
      : td ? (us.has ? `<span class="go">⤓ +${ST.upd}⭐</span>` : `<span class="go dn">✓</span>`) : `<span class="go">+${ST.test}⭐</span>`;
    return `<div class="lrow ${own ? "own" : ""}" data-app="${esc(a.id)}">${iconHtml(a, "s")}
      <div class="g"><div class="nm ell">${esc(a.name)}<small>${esc(shortName(a.ownerName))}</small></div>
        <div class="bd">${bd.join("")}</div>
        <div class="mt"><span>👥 ${esc(t("nInstalled", { n: a.testersCount || 0 }))}</span><span>📅 ${up}/14</span></div></div>${go}</div>`;
  }
  function missionCard() {
    const n = missionN(), tt = missionT(), nxt = nextApp(""), l = Math.max(0, tt - n);
    const btn = `<button class="bigbtn" id="tnext" ${nxt ? "" : "disabled"}>▶ ${esc(t("btnTest"))}</button>`;
    if (n === 0) return `<div class="mis solo"><div class="t" style="justify-content:center"><b>${esc(t("missionTitle"))}</b></div>${tt ? "" : `<small style="margin-top:6px">${esc(t("noNext"))}</small>`}${btn}</div>`;
    return `<div class="mis"><div class="t"><b>${esc(t("missionTitle"))}</b><span class="n">${n}<span class="of">/${tt}</span></span></div>
      <div class="bar"><i style="width:${tt ? Math.min(100, n / tt * 100) : 100}%"></i></div>
      <small>${esc(l > 0 ? t("missionLeft", { l, t: tt }) : t("missionDone2"))}</small>${btn}</div>`;
  }
  function bindMission(m) {
    const nx = $("#tnext", m); if (nx) nx.onclick = () => { const a = nextApp(""); if (a) openTest(a.id); };
  }
  function rowTap(id) {
    const a = (S.apps || []).find(x => x.id === id); if (!a) return;
    if (isOwn(a)) return openOwn(a);
    if (a.paused) return toast(t("pausedHint"));
    openTest(id);
  }
  function paintRows(m) {
    const sub = S.sub === "stop" ? "stop" : "act", list = listFor(sub), box = $("#tlist", m); if (!box) return;
    box.innerHTML = list.length ? list.slice(0, S.shown).map(a => rowHtml(a, sub)).join("")
      : `<div class="empty"><div class="big">${sub === "act" ? "🎉" : "🫥"}</div><p>${esc(t(sub === "act" ? "noNeed" : "noneHere"))}</p></div>`;
    $$("[data-app]", box).forEach(el => el.onclick = () => rowTap(el.dataset.app));
    S.moreFn = S.shown < list.length ? () => { S.shown += PAGE; paintRows(m); } : null;
  }
  function paintTest(m) {
    const sub = S.sub === "stop" ? "stop" : "act", nA = listFor("act").length, nS = listFor("stop").length;
    S.shown = S.shown || PAGE;
    m.innerHTML = `<div class="ph"><div class="grow"><h1>${esc(t("tabTest"))}</h1></div>${topRight()}</div>
      ${missionCard()}
      <div class="stabs"><button data-s="act" class="${sub === "act" ? "on" : ""}">${esc(t("tabActive"))} ${nA}</button>
        <button data-s="stop" class="${sub === "stop" ? "on" : ""}">${esc(t("tabStopped"))} ${nS}</button></div>
      <div id="tlist"></div>`;
    bindMission(m);
    $$("[data-s]", m).forEach(b => b.onclick = () => { S.sub = b.dataset.s; S.shown = PAGE; paintTest(m); });
    paintRows(m);
  }

  // ---- tab Nhiệm vụ: tiến độ hôm nay + lịch sử test
  async function renderTasks(m) {
    if (!S.apps) spin(m);
    try { await Promise.all([loadApps(), loadJoined(), S.mine ? null : loadMine()]); }
    catch (e) { console.error(e); return failBox(m, () => renderTasks(m)); }
    if (S.tab !== "tasks") return;
    paintTasks(m); pushMission(); refreshDot();
  }
  function histRow(j) {
    return `<div class="lrow" data-hist="${esc(j.id)}">${iconHtml(j, "s")}
      <div class="g"><div class="nm ell">${esc(j.name)}<small>${esc(shortName(j.ownerName))}</small></div>
        <div class="mt"><span>🔁 ${esc(t("nTimes", { n: j.days || 1 }))}</span><span>📅 ${esc(t("lastTest", { d: j.lastDay || "" }))}</span></div></div>
      ${doneTodayJ(j) ? `<span class="go dn">✓</span>` : ""}</div>`;
  }
  function fillHist(m) {
    const js = Object.values(S.joined || {});
    const td = js.filter(doneTodayJ).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const ev = js.filter(j => !doneTodayJ(j)).sort((a, b) => String(b.lastDay || "") > String(a.lastDay || "") ? 1 : -1);
    let left = S.shown, html = "";
    const part = (title, arr) => { if (!arr.length || left <= 0) return; html += `<div class="sec3">${esc(title)} · ${arr.length}</div>`; arr.slice(0, left).forEach(j => html += histRow(j)); left -= arr.length; };
    part(t("histToday"), td); part(t("histEver"), ev);
    const box = $("#hlist", m);
    box.innerHTML = html || `<div class="empty"><div class="big">🫥</div><p>${esc(t("noneHere"))}</p></div>`;
    $$("[data-hist]", box).forEach(el => el.onclick = () => { const id = el.dataset.hist; (S.apps || []).some(a => a.id === id) ? openTest(id) : toast(t("goneHint")); });
    S.moreFn = S.shown < td.length + ev.length ? () => { S.shown += PAGE; fillHist(m); } : null;
  }
  function paintTasks(m) {
    S.shown = S.shown || PAGE;
    m.innerHTML = `<div class="ph"><div class="grow"><h1>${esc(t("tabTasks"))}</h1></div>${topRight()}</div>${missionCard()}<div id="hlist"></div>`;
    bindMission(m); fillHist(m);
  }

  // ================================================================ Trang test 1 app (4 bước, nút luôn sáng)
  const USE_MS = 15000, MAX_SHOTS = 3;
  const proofs = {};
  let away = null, curTest = null;
  function proof(id) {
    let p = proofs[id];
    if (!p || p.day !== today()) p = proofs[id] = { day: today(), openAt: 0, leftAt: 0, used: 0, imgs: [], note: p ? p.note : "" };
    return p;
  }
  function startUse(id, pkg, repaint) {
    const p = proof(id), now = Date.now();
    p.leftAt = now; if (!p.openAt) p.openAt = now;
    away = { id, repaint };
    if (A) A.openApp(pkg); else openUrl(playUrl(pkg));
  }
  function backFromApp() {
    if (!away) return false;
    const w = away; away = null;
    const p = proof(w.id);
    if (p.leftAt) { p.used += Date.now() - p.leftAt; p.leftAt = 0; }
    if (p.used < USE_MS) toast(t("useToast", { u: Math.floor(p.used / 1000), s: Math.ceil((USE_MS - p.used) / 1000) }));
    try { w.repaint(); } catch (e) {}
    return true;
  }
  function shotProblem(sh, p) {
    if (!sh.at) return t("shotNoTime");
    if (dstr(new Date(sh.at)) !== today() || sh.at > Date.now() + 120000) return t("shotNotToday");
    if (sh.at < p.openAt + USE_MS) return t("shotTooEarly");
    return "";
  }
  function dayDoc(p) {
    return { img: p.imgs[0].img, more: p.imgs.slice(1).map(x => x.img), note: String(p.note || "").trim().slice(0, 200),
      used: Math.floor(p.used / 1000), shotAt: Math.max.apply(null, p.imgs.map(x => x.at || 0)), at: FV.serverTimestamp() };
  }
  function stepRow(key, ok, title, sub, btn) {
    return `<div class="step ${ok ? "ok" : "no"}" data-st="${key}"><span class="n">${ok ? "✓" : "✗"}</span>
      <div class="g"><b>${esc(title)}</b><small>${esc(sub)}</small></div>${btn || ""}</div>`;
  }
  function testHtml(a) {
    const j = jOf(a), p = proof(a.id), st = installState(a.pkg), us = updState(a, j);
    const instOk = st.installed && st.fromPlay, used = p.used >= USE_MS, today1 = doneTodayJ(j);
    const iss = (a.issues || {})[S.user.uid];
    const head = `<div class="card" style="padding:12px">
      <div class="row">${iconHtml(a)}<div class="grow"><div class="title ell">${esc(a.name)}</div><div class="sub ell">${esc(a.pkg)} · ${esc(shortName(a.ownerName))}</div></div>
        <div class="iconbtns"><button class="ibtn" data-x="share">${IC.share}</button><button class="ibtn r" data-x="report">${IC.flag}</button></div></div>
      <div class="st3"><div><b>${a.testersCount || 0}/${a.target || 12}</b><small>${esc(t("stInstalledS"))}</small></div>
        <div><b>${daysUp(a)}/14</b><small>${esc(t("stAppDays"))}</small></div>
        <div><b>${j ? (j.days || 1) : 0}</b><small>${esc(t("stYourDays"))}</small></div></div></div>
      ${a.instr || a.desc ? `<div class="instr" style="margin-bottom:10px">${IC.info}<div>${esc(a.instr || a.desc)}</div></div>` : ""}`;
    if (today1) {
      return head + `<div class="okbox">${IC.check}<div>${esc(t("todayTested"))}<small>${esc(t("comeBack"))}</small></div></div>
        ${us.has ? `${stepRow("upd", us.can, t("stepUpd"), us.can ? t("updReady", { p: ST.upd }) : t("updHint", { p: ST.upd }), us.can ? "" : `<button class="pill" data-x="upd">⤓ ${esc(t("btnUpdate"))}</button>`)}
        <button class="btn bl block" data-x="claim" style="margin-top:10px">${esc(t("claimUpd", { p: ST.upd }))}</button>` : ""}`;
    }
    const shots = `<div class="step col ${p.imgs.length ? "ok" : "no"}" data-st="shot">
        <div class="srow"><span class="n">${p.imgs.length ? "✓" : "✗"}</span>
          <div class="g"><b>${esc(t("stepShot3"))}</b><small>${esc(p.imgs.length ? t("shotsN", { n: p.imgs.length, m: MAX_SHOTS }) : used ? t("shotHint") : t("shotLocked"))}</small></div></div>
        <div class="shots">${[0, 1, 2].map(i => p.imgs[i] ? `<span class="tile f"><img src="${p.imgs[i].img}" alt=""><button class="thx" data-x="del" data-i="${i}">✕</button></span>`
          : `<button class="tile e" data-x="shot">${IC.cam}<span>＋ ${esc(t("addShot"))}</span></button>`).join("")}</div></div>`;
    return head + `
      ${stepRow("inst", instOk, t("stepInstall"), instOk ? t("instOk") : st.installed ? t("instNotPlay") : t("instHint"),
        instOk ? "" : `<button class="pill" data-x="gplay">⤓ ${esc(t("btnInstall"))}</button>`)}
      ${!instOk ? (iss ? `<div class="issme">⚠ ${esc(t("issSent", { r: t(iss.r) }))}</div>` : `<button class="link muted" data-x="cant" style="display:block;margin:2px auto 0">${esc(t("cantInstall"))}</button>`) : ""}
      ${us.has ? stepRow("upd", us.can, t("stepUpd"), us.can ? t("updReady", { p: ST.upd }) : t("updHint", { p: ST.upd }), us.can ? "" : `<button class="pill" data-x="upd">⤓ ${esc(t("btnUpdate"))}</button>`) : ""}
      ${stepRow("use", used, t("stepUse"), used ? t("usedSec", { s: Math.floor(p.used / 1000) }) : p.used ? t("useMore", { s: Math.ceil((USE_MS - p.used) / 1000) }) : t("useHint"),
        used ? "" : `<button class="pill" data-x="use">▶ ${esc(t("openBtn"))}</button>`)}
      ${shots}
      <textarea class="dnote" maxlength="200" rows="2" placeholder="${esc(t("notePh2"))}">${esc(p.note || "")}</textarea>
      <button class="btn bl block" data-x="send" style="margin-top:10px;padding:15px">${esc(t("sendResult", { p: ST.test }))}</button>
      <div class="hint" style="text-align:center">${esc(t("sendHint"))}</div>`;
  }
  function openTest(id) {
    const a = (S.apps || []).find(x => x.id === id); if (!a) return;
    if (!setupDone()) return groupGate(() => openTest(id));
    const pg = page(a.name, "", null);
    const inner = $(".inner", pg);
    const paint = () => { if (!pg.isConnected) return; const y = pg.scrollTop; inner.innerHTML = testHtml(a); bindTest(inner, a, paint, pg); pg.scrollTop = y; };
    curTest = { pg, paint };
    paint();
  }
  function flash(inner, keys) {
    keys.forEach(k => { const el = $(`[data-st="${k}"]`, inner); if (el) { el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); } });
    const f = $(`[data-st="${keys[0]}"]`, inner); if (f) f.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function bindTest(inner, a, paint, pg) {
    const p = proof(a.id), nt = $(".dnote", inner); if (nt) nt.oninput = () => { p.note = nt.value; };
    $$("[data-x]", inner).forEach(b => b.onclick = async ev => {
      ev.stopPropagation();
      const k = b.dataset.x;
      if (k === "share") { const txt = t("shareText", { name: a.name }) + "\n" + optinUrl(a.pkg); if (A) A.share(txt); else copyText(txt).then(() => toast(t("copied"))); }
      else if (k === "report") report({ type: "app", appId: a.id });
      else if (k === "gplay") openUrl(optinUrl(a.pkg));
      else if (k === "upd") openUrl(playUrl(a.pkg));
      else if (k === "cant") cantInstallSheet(a, paint);
      else if (k === "use") {
        if (A && A.isInstalled && !A.isInstalled(a.pkg)) { toast(t("instNo")); flash(inner, ["inst"]); return; }
        startUse(a.id, a.pkg, paint);
      }
      else if (k === "shot") {
        if (p.used < USE_MS) { toast(t("shotLocked")); flash(inner, ["use"]); return; }
        const sh = await pickShot(); if (!sh) { toast(t("imgBad")); return; }
        const bad = shotProblem(sh, p);
        if (bad) { sheet(`<h3>📷 ${esc(t("shotBadTitle"))}</h3><p class="sub">${esc(bad)}</p><button class="btn block" data-close>${esc(t("close"))}</button>`, el => $("[data-close]", el).onclick = closeTop); return; }
        p.imgs.push({ img: sh.img, at: sh.at }); paint();
      }
      else if (k === "del") { p.imgs.splice(+b.dataset.i || 0, 1); paint(); }
      else if (k === "send") submitTest(a, b, inner, paint);
      else if (k === "claim") claimUpdate(a, b, paint);
    });
  }

  // báo phiên bản app đang cài (2 người khác nhau báo cùng số thì thành "bản mới nhất")
  function reportVersion(a, iv) {
    if (!iv || iv <= (a.ver || 0)) return;
    const pend = a.verPend, me = S.user.uid;
    let u = null;
    if (pend && pend.v === iv && pend.by !== me) { u = { ver: iv }; a.ver = iv; }
    else if (!pend || pend.v < iv) { u = { verPend: { v: iv, by: me } }; a.verPend = u.verPend; }
    if (u) appRef(a.id).update(u).catch(() => {});
  }
  async function submitTest(a, btn, inner, paint) {
    if (!isGmail(S.me.testerEmail || "")) { toast(t("needGmail")); editProfile(); return; }
    const j = jOf(a), p = proof(a.id), uid = S.user.uid, day = today(), st = installState(a.pkg);
    const miss = [];
    if (!(st.installed && st.fromPlay)) miss.push("inst");
    if (p.used < USE_MS) miss.push("use");
    if (!p.imgs.length) miss.push("shot");
    if (miss.length) { toast(t("missSteps", { n: miss.length })); flash(inner, miss); return; }
    busy(btn, true);
    const us = updState(a, j), iv = us.iv || verOf(a.pkg), bonus = us.can ? ST.upd : 0, stars = ST.test + bonus;
    const nBefore = missionN(), tBefore = missionT();
    try {
      const b = db.batch(), tr = testerRef(a.id, uid), jr = userRef().collection("joined").doc(a.id), now = Date.now();
      b.set(tr.collection("days").doc(day), dayDoc(p));
      if (!j) {
        b.set(tr, { uid, name: S.me.name, email: S.me.testerEmail, joinedAt: FV.serverTimestamp(), joinDay: day, sub: { [day]: true }, rev: {}, ver: iv });
        b.set(jr, { appId: a.id, name: a.name, pkg: a.pkg, icon: a.icon || "", ownerUid: a.ownerUid, ownerName: a.ownerName || "",
          joinedAt: FV.serverTimestamp(), joinDay: day, lastDay: day, days: 1, ver: iv, updAt: now });
        b.update(appRef(a.id), { testersCount: FV.increment(1) });
      } else {
        b.update(tr, { ["sub." + day]: true, ver: iv });
        b.update(jr, { lastDay: day, days: FV.increment(1), ver: iv || j.ver || 0, updAt: now });
      }
      awardInfo(b, stars, true);
      await b.commit();
      gotAward(stars, true);
      if (!j) { a.testersCount = (a.testersCount || 0) + 1; S.joined[a.id] = { id: a.id, appId: a.id, name: a.name, pkg: a.pkg, icon: a.icon, ownerUid: a.ownerUid, joinDay: day, lastDay: day, days: 1, ver: iv, updAt: now }; }
      else Object.assign(j, { lastDay: day, days: (j.days || 1) + 1, ver: iv || j.ver || 0, updAt: now });
      delete proofs[a.id];
      reportVersion(a, iv);
      const completed = nBefore < tBefore && missionN() >= missionT();
      touchOwn();
      pushMission();
      afterTest(a, stars, bonus, completed);
    } catch (e) { busy(btn, false); toast(failMsg(e)); }
  }
  async function claimUpdate(a, btn, paint) {
    const j = jOf(a), us = updState(a, j);
    if (!us.can) { toast(t("updNot")); return; }
    busy(btn, true);
    try {
      const b = db.batch(), now = Date.now();
      b.update(testerRef(a.id, S.user.uid), { ver: us.iv });
      b.update(userRef().collection("joined").doc(a.id), { ver: us.iv, updAt: now });
      awardInfo(b, ST.upd, false);
      await b.commit();
      gotAward(ST.upd, false); Object.assign(j, { ver: us.iv, updAt: now });
      reportVersion(a, us.iv);
      toast(t("updOk", { p: ST.upd })); paint();
      const m = $("#main"); if (m && S.tab === "test") paintTest(m);
    } catch (e) { busy(btn, false); toast(failMsg(e)); }
  }
  // sau khi test xong: cộng sao + gợi ý app tiếp theo
  function afterTest(a, stars, bonus, completed) {
    closeAll(); curTest = null;
    const m = $("#main"); if (m && S.tab === "test") paintTest(m);
    const n = missionN(), tt = missionT(), nxt = nextApp(a.id);
    sheet(`<div style="text-align:center">
        <div class="bigstar">⭐ +${stars}</div>
        <div class="sub" style="margin-top:2px">${esc(bonus ? t("popBonus", { p: bonus }) : t("popSaved"))}</div>
        <div style="font-weight:800;font-size:17px;margin:12px 0 2px">${esc(completed ? t("popMissionDone") : t("popProgress", { n, t: tt }))}</div>
        ${nxt ? `<div class="lbl">${esc(t("nextApp"))}</div>
          <div class="row" style="justify-content:center;margin-bottom:12px">${iconHtml(nxt, "s")}<div style="text-align:left"><b>${esc(nxt.name)}</b><div class="sub">${esc(shortName(nxt.ownerName))}</div></div></div>
          <button class="btn bl block" data-n="go">▶ ${esc(t("testNext"))}</button>` : ""}
        <button class="btn ghost block" data-n="x" style="margin-top:8px">${esc(nxt ? t("later") : t("close"))}</button></div>`, el => {
      $("[data-n=x]", el).onclick = closeTop;
      const g = $("[data-n=go]", el); if (g) g.onclick = () => { closeTop(); openTest(nxt.id); };
    });
  }
  function cantInstallSheet(a, repaint) {
    sheet(`<h3>${esc(t("cantTitle"))}</h3><p class="sub" style="margin-top:0">${esc(t("cantSub"))}</p>
      ${ISS.map(r => `<button class="opt" data-r="${r}"><b>${esc(t(r))}</b><small>${esc(t(r + "H"))}</small></button>`).join("")}
      <button class="btn block ghost" data-close style="margin-top:6px">${esc(t("close"))}</button>`, el => {
      $("[data-close]", el).onclick = closeTop;
      $$("[data-r]", el).forEach(b => b.onclick = async () => {
        const r = b.dataset.r, v = { r, n: S.me.name, at: Date.now() };
        busy(b, true);
        try {
          await appRef(a.id).update({ ["issues." + S.user.uid]: v });
          a.issues = Object.assign({}, a.issues, { [S.user.uid]: v });
          closeTop(); toast(t("issSentToast")); repaint();
          if (r === "issElig") eligSheet();
        } catch (e) { busy(b, false); toast(failMsg(e)); }
      });
    });
  }
  function eligSheet() {
    sheet(`<h3>${esc(t("eligTitle"))}</h3>
      <div class="issrow"><span class="num">1</span><div><b>${esc(t("elig1"))}</b><button class="btn small" data-g style="margin-top:6px">${esc(t("ob1Btn"))}</button></div></div>
      <div class="issrow"><span class="num">2</span><div><b>${esc(t("elig2"))}</b></div></div>
      <div class="issrow"><span class="num">3</span><div><small>${esc(t("elig3"))}</small></div></div>
      <button class="btn block ghost" data-close style="margin-top:10px">${esc(t("close"))}</button>`, el => {
      $("[data-close]", el).onclick = closeTop; $("[data-g]", el).onclick = () => openUrl(CG.link);
    });
  }
  function report(info) {
    ask(t("reportAsk"), t("report"), true).then(async ok => {
      if (!ok) return;
      try { await db.collection("reports").add(Object.assign({ by: S.user.uid, createdAt: FV.serverTimestamp() }, info)); toast(t("reportOk")); }
      catch (e) { toast(failMsg(e)); }
    });
  }
  async function leaveApp(j) {
    const uid = S.user.uid, ref = appRef(j.id);
    try {
      const dq = await testerRef(j.id, uid).collection("days").get();
      if (!dq.empty) { const b1 = db.batch(); dq.forEach(d => b1.delete(d.ref)); await b1.commit(); }
    } catch (e) {}
    let exists = false; try { exists = !!(await testerRef(j.id, uid).get()).exists; } catch (e) {}
    const b = db.batch();
    b.delete(userRef().collection("joined").doc(j.id));
    if (exists) { b.delete(testerRef(j.id, uid)); b.update(ref, { testersCount: FV.increment(-1) }); }
    try { await b.commit(); delete S.joined[j.id]; }
    catch (e) {
      console.error(e);
      try { await userRef().collection("joined").doc(j.id).delete(); delete S.joined[j.id]; } catch (e2) { toast(failMsg(e2)); }
    }
  }

  const ISS = ["issLink", "issCountry", "issElig"];
  const ISS_FIX = { issLink: "issFixLink", issCountry: "issFixCountry", issElig: "issFixElig" };
  function issList(a) { return Object.values(a.issues || {}).filter(x => x && x.r); }
  function issBoxHtml(a) {
    const L = issList(a); if (!L.length) return "";
    const by = {}; L.forEach(x => by[x.r] = (by[x.r] || 0) + 1);
    return `<div class="issbox" data-stop>
      <b>⚠ ${esc(t("issOwnerTitle", { n: L.length }))}</b>
      ${ISS.filter(r => by[r]).map(r => `<div class="issrow"><span class="tag r">${by[r]}</span><div><b>${esc(t(r))}</b><small>${esc(t(ISS_FIX[r]))}</small></div></div>`).join("")}
      <div class="btns"><button class="btn ghost small" data-iss="console" data-id="${esc(a.id)}">${IC.ext} ${esc(t("goConsole"))}</button>
        <button class="btn green small" data-iss="fixed" data-id="${esc(a.id)}">✓ ${esc(t("issFixed"))}</button></div></div>`;
  }
  // ================================================================ TAB: App của tôi (không giới hạn số app)
  const okDays = ts => ts.filter(x => (x.joinDay || "9999") <= addDays(today(), -13)).length;
  const pendOf = a => (S.mineT[a.id] || []).reduce((s, x) => s + dayInfo(x).pending.length, 0);
  const actMine = () => (S.mine || []).filter(a => !a.done);
  async function renderMine(m) {
    if (!S.mine) spin(m);
    try { await Promise.all([loadMine(true), loadApps(), loadJoined()]); await loadMineTesters(); }
    catch (e) { console.error(e); return failBox(m, () => renderMine(m)); }
    if (S.tab !== "mine") return;
    paintMine(m); refreshDot();
  }
  function startAdd() {
    if (!setupDone()) return groupGate(startAdd);
    const have = S.me.stars || 0;
    if (actMine().length >= 1 && have < POST_COST) {
      sheet(`<h2>⭐ ${esc(t("postNeedTitle"))}</h2><p class="sub" style="margin-top:0">${esc(t("errNoStars", { c: POST_COST, n: POST_COST - have }))}</p>
        <div class="btns"><button class="btn ghost" data-u="x">${esc(t("cancel"))}</button><button class="btn bl" data-u="t">${esc(t("goTest"))}</button></div>`, el => {
        $("[data-u=x]", el).onclick = closeTop;
        $("[data-u=t]", el).onclick = () => { closeTop(); go("test"); };
      });
      return;
    }
    addAppPage(null);
  }
  function paintMine(m) {
    const act = actMine(), fin = S.mine.filter(a => a.done);
    let html = header(t("tabMine"), "", topRight());
    html += `<button class="btn bl block addrow" id="madd">＋ ${esc(t("addApp"))}${act.length ? ` · ${POST_COST}⭐` : ""}</button>`;
    html += act.map(mineCard).join("");
    if (!act.length && !fin.length) html += `<div class="empty"><div class="big">📦</div><p>${esc(t("noMine"))}</p></div>`;
    if (fin.length) html += `<div class="lbl">${esc(t("finishedApps"))}</div>` + fin.map(a => `<div class="lrow">${iconHtml(a, "s")}<div class="g"><div class="nm ell">${esc(a.name)}</div><div class="mt"><span>🏁 ${esc(t("bDone"))}</span></div></div>
      <button class="go" data-reopen="${esc(a.id)}">↺ ${esc(t("reopen"))}</button></div>`).join("");
    m.innerHTML = html;
    $("#madd", m).onclick = startAdd;
    $$("[data-reopen]", m).forEach(b => b.onclick = async () => {
      try { await appRef(b.dataset.reopen).update({ done: false, active: true }); S.apps = null; S.mine = null; renderTab(); } catch (e) { toast(failMsg(e)); }
    });
    $$("[data-iss]", m).forEach(b => b.onclick = async ev => {
      ev.stopPropagation();
      if (b.dataset.iss === "console") return openUrl(CONSOLE_URL);
      busy(b, true);
      try {
        await appRef(b.dataset.id).update({ issues: {} });
        const a = S.mine.find(x => x.id === b.dataset.id); if (a) a.issues = {};
        toast(t("issCleared")); paintMine(m);
      } catch (e) { busy(b, false); toast(failMsg(e)); }
    });
    $$("[data-mine]", m).forEach(el => el.addEventListener("click", e => {
      if (e.target.closest("[data-stop]")) return;
      const id = el.dataset.mine;
      S.openMine = S.openMine === id ? null : id;
      paintMine(m);
    }));
    if (S.openMine) {
      const el = $(`[data-mine="${S.openMine}"]`, m), a = S.mine.find(x => x.id === S.openMine);
      if (el && a) bindMineExpanded(el, a);
    }
  }
  function mineCard(a) {
    const ts = S.mineT[a.id] || [], n = ts.length, target = a.target || 12, pend = pendOf(a), od = okDays(ts);
    const open = S.openMine === a.id;
    const chips = [`<span class="chip">👥 ${n}/${target}</span>`, `<span class="chip ${od >= target ? "w" : ""}">🏁 ${esc(t("fullDays", { a: od, b: target }))}</span>`];
    if (a.paused) chips.unshift(`<span class="chip wa">⏸ ${esc(t("bPaused"))}</span>`);
    if (a.active === false) chips.unshift(`<span class="chip">${esc(t("hidden"))}</span>`);
    return `<div class="mc ${open ? "open" : ""}" data-mine="${esc(a.id)}">
      <div class="row">${iconHtml(a, "s")}<div class="grow"><div class="nm ell">${esc(a.name)}</div>
        <div class="chips">${chips.join("")}</div></div>${pend ? `<span class="badge">${esc(t("pendingN", { n: pend }))}</span>` : ""}</div>
      ${a.paused ? `<div class="issme" style="margin-top:8px">⏸ ${esc(t("pausedOwn", { n: MISSION }))}</div>` : ""}
      ${issBoxHtml(a)}
      ${open ? `<div class="xp" data-stop>${mineExpandedHtml(a, ts)}</div>` : ""}
    </div>`;
  }
  function mineExpandedHtml(a, ts) {
    const pend = pendOf(a);
    return `
      ${pend ? `<div class="sec3" style="margin-top:0">${esc(t("pendReports"))} (${pend})</div><div data-pend><div class="sub">${esc(t("loading"))}</div></div>` : ""}
      <div class="sec3" ${pend ? "" : 'style="margin-top:0"'}>${esc(t("testersList"))} (${ts.length})</div>
      ${ts.length ? ts.map(x => `<div class="trow"><div class="avatar">${esc((x.name || "?")[0].toUpperCase())}</div><b class="ell">${esc(x.name)}</b>
        <span class="sub">${esc(t("nDays", { n: Object.keys(x.sub || {}).length }))}</span></div>`).join("") : `<p class="sub" style="margin:0">${esc(t("noTesters"))}</p>`}
      <div class="mbtns"><button class="btn bl small" data-act="upd">⤓ ${esc(t("ownerUpd"))}</button>
        <button class="btn ghost small" data-act="done">🏁 ${esc(t("ownerDone"))}</button>
        <button class="btn ghost small" data-act="more">⋯ ${esc(t("moreBtn"))}</button></div>`;
  }
  async function mineAct(k, a, ts) {
    if (k === "copy") toast((await copyText(ts.map(x => x.email).filter(Boolean).join(", "))) ? t("copied") : t("errNet"));
    else if (k === "share") {
      const txt = t("shareText", { name: a.name }) + "\n" + optinUrl(a.pkg);
      if (A) A.share(txt); else copyText(txt).then(() => toast(t("copied")));
    } else if (k === "edit") addAppPage(a);
    else if (k === "upd") {
      const last = ms(a.upAt), gap = last ? UPD_GAP_DAYS - Math.floor((Date.now() - last) / 86400000) : 0;
      if (gap > 0) return toast(t("ownerUpdWait", { d: gap }));
      if (!(await ask(t("ownerUpdAsk", { p: ST.upd }), t("ownerUpd")))) return;
      try { await appRef(a.id).update({ upAt: FV.serverTimestamp() }); a.upAt = new Date(); S.apps = null; toast(t("ownerUpdOk")); } catch (e) { toast(failMsg(e)); }
    } else if (k === "done") {
      if (!(await ask(t("ownerDoneAsk"), t("ownerDone")))) return;
      try { await appRef(a.id).update({ done: true }); S.apps = null; S.mine = null; S.openMine = null; renderTab(); } catch (e) { toast(failMsg(e)); }
    } else if (k === "toggle") {
      try { await appRef(a.id).update({ active: a.active === false }); S.apps = null; S.mine = null; renderTab(); } catch (e) { toast(failMsg(e)); }
    } else if (k === "del") {
      if (!(await ask(t("delAsk"), t("del"), true))) return;
      try { await deleteAppDeep(a.id); S.openMine = null; S.apps = null; S.mine = null; renderTab(); } catch (e) { toast(failMsg(e)); }
    }
  }
  async function bindMineExpanded(el, a) {
    const ts = S.mineT[a.id] || [];
    $$("[data-act]", el).forEach(b => b.onclick = () => {
      const k = b.dataset.act;
      if (k !== "more") return mineAct(k, a, ts);
      sheet(`<h3>${esc(a.name)}</h3>
        ${ts.length ? `<button class="opt" data-mo="copy"><b>${esc(t("copyEmails"))}</b></button>` : ""}
        <button class="opt" data-mo="share"><b>${esc(t("share"))}</b></button>
        <button class="opt" data-mo="edit"><b>${esc(t("edit"))}</b></button>
        <button class="opt" data-mo="toggle"><b>${esc(a.active === false ? t("reopen") : t("hideApp"))}</b></button>
        <button class="opt" data-mo="del"><b style="color:var(--red)">${esc(t("del"))}</b></button>
        <button class="btn block ghost" data-close style="margin-top:6px">${esc(t("close"))}</button>`, sh => {
        $("[data-close]", sh).onclick = closeTop;
        $$("[data-mo]", sh).forEach(o => o.onclick = () => { closeTop(); mineAct(o.dataset.mo, a, ts); });
      });
    });
    const box = $("[data-pend]", el); if (!box) return;
    const items = [];
    await Promise.all(ts.map(async x => {
      for (const d of dayInfo(x).pending) {
        let data = {};
        try { const s = await testerRef(a.id, x.uid).collection("days").doc(d).get(); if (s.exists) data = s.data(); } catch (e) {}
        items.push({ x, d, data });
      }
    }));
    items.sort((p, q) => p.d < q.d ? -1 : p.d > q.d ? 1 : 0);
    box.innerHTML = items.map(({ x, d, data }) => `<div class="proof" data-day="${esc(d)}" data-uid="${esc(x.uid)}">
      <div class="row" style="margin-bottom:6px"><b class="grow ell">${esc(x.name)}</b><span class="sub">${esc(d)}</span></div>
      ${data.img ? `<div class="pimgs">${[data.img].concat(data.more || []).map(u => `<img src="${esc(u)}" alt="">`).join("")}</div>` : ""}
      ${data.used ? `<div class="sub" style="margin-top:6px">${esc(t("usedLine", { s: data.used, h: data.shotAt ? hm(data.shotAt) : "–" }))}</div>` : ""}
      ${data.note ? `<div class="sub" style="margin-top:6px">${esc(data.note)}</div>` : ""}
      <div class="btns"><button class="btn red small" data-rv="r">✗ ${esc(t("reject"))}</button><button class="btn green small" data-rv="a">✓ ${esc(t("approve"))}</button></div>
    </div>`).join("");
    $$(".proof .pimgs img", box).forEach(im => im.onclick = () => sheet(`<img src="${im.src}" style="width:100%;border-radius:12px" alt="">`));
    $$("[data-rv]", box).forEach(b => b.onclick = async () => {
      const pr = b.closest("[data-day]"), d = pr.dataset.day, uid = pr.dataset.uid, v = b.dataset.rv, x = ts.find(z => z.uid === uid);
      let why = "";
      if (v === "r") { why = await askReason(t("rejectTitle"), ["rsWrongApp", "rsBlurry", "rsSame", "rsOther"]); if (!why) return; }
      busy(b, true);
      try {
        await testerRef(a.id, uid).update(v === "r" ? { ["rev." + d]: v, ["why." + d]: why } : { ["rev." + d]: v });
        if (x) x.rev = Object.assign({}, x.rev, { [d]: v });
        pr.remove(); toast(v === "a" ? t("approved") : t("rejected")); refreshDot();
      } catch (e) { busy(b, false); toast(failMsg(e)); }
    });
  }

  // ================================================================ Thông báo (trang mở từ chuông)
  function notifItems() {
    const items = [];
    if (!S.apps || !S.joined) return items;
    const n = missionN(), tt = missionT();
    if (tt > 0 && n < tt) items.push({ hot: true, ic: "🎯", title: t("nMission", { n, t: tt }), sub: t("nMissionSub", { l: tt - n, s: (tt - n) * ST.test }), act: "test" });
    (S.mine || []).forEach(a => {
      const pend = S.mineT && S.mineT[a.id] ? pendOf(a) : 0;
      if (pend) items.push({ hot: true, ic: "📝", title: t("nReview", { n: pend, name: a.name }), sub: t("nReviewSub"), act: "mine", open: a.id });
      const ni = issList(a).length;
      if (ni) items.push({ hot: true, ic: "⚠", title: t("nIssue", { n: ni, name: a.name }), sub: t("nIssueSub"), act: "mine", open: a.id });
      if (a.paused) items.push({ hot: true, ic: "⏸", title: t("nPaused", { name: a.name }), sub: t("nPausedSub", { n: MISSION }), act: "test" });
    });
    (S.rejs || []).forEach(r => items.push({ hot: false, ic: "✗", title: t("nReject", { name: r.app, day: r.day }), sub: r.why }));
    const ups = availApps().filter(a => updState(a, jOf(a)).has).length;
    if (ups) items.push({ hot: false, ic: "⤓", title: t("nUpdates", { n: ups }), sub: t("nUpdatesSub", { p: ST.upd }), act: "test" });
    return items;
  }
  async function openNotif() {
    if (!S.user || !S.me) return;
    const pg = page(t("tabNotif"), `<div class="spinner"></div>`);
    const inner = $(".inner", pg);
    try {
      await Promise.all([loadApps(), loadJoined(), loadMine()]);
      if (S.mine.length && !Object.keys(S.mineT || {}).length) await loadMineTesters();
    } catch (e) { inner.innerHTML = `<div class="empty"><p>${esc(t("errNet"))}</p></div>`; return; }
    if (!pg.isConnected) return;
    const items = notifItems();
    inner.innerHTML = (items.length ? items.map((x, i) => `<div class="nrow" data-n="${i}"><span class="nic">${x.ic}</span><div class="g"><b>${esc(x.title)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ""}</div>${x.act ? `<span class="chev">${IC.chev}</span>` : ""}</div>`).join("")
        : `<div class="empty"><div class="big">✅</div><p>${esc(t("allDone"))}</p></div>`) +
      `<div class="lbl">${esc(t("nHow"))}</div><div class="sub" style="padding:0 2px">${esc(t("nHowBody"))}</div>`;
    $$("[data-n]", inner).forEach(el => el.onclick = () => { const x = items[+el.dataset.n]; if (x.act) { closeAll(); if (x.open) S.openMine = x.open; go(x.act); } });
    refreshDot();
  }

  // ================================================================ thông báo ngầm
  function setupNotify() {
    if (!(A && A.setNotify)) return;
    A.setNotify(JSON.stringify({
      uid: S.user.uid, apiKey: FIREBASE_CONFIG.apiKey, projectId: FIREBASE_CONFIG.projectId,
      newApps: t("nfNewApps"), newTester: t("nfNewTester"), newFb: t("nfNewFb"), title: "12 Testers Free"
    }));
    pushMission();
  }

  async function deleteAppDeep(appId) {
    const ref = appRef(appId);
    const tq = await ref.collection("testers").get();
    const refs = [];
    for (const d of tq.docs) {
      const dq = await d.ref.collection("days").get();
      dq.forEach(x => refs.push(x.ref));
      refs.push(d.ref);
    }
    const fq = await ref.collection("feedback").get(); fq.forEach(d => refs.push(d.ref));
    for (let i = 0; i < refs.length; i += 400) {
      const b = db.batch(); refs.slice(i, i + 400).forEach(r => b.delete(r)); await b.commit();
    }
    await ref.delete();
  }

  // ================================================================ Trang đăng / sửa app
  const CHIPS = ["chip14", "chipDaily", "chipFb", "chipShot"];
  // Từ khóa nhận biết "đã là thành viên" / "chưa tham gia" trên trang Google Groups (nhiều ngôn ngữ)
  const MEMBER_KW = ["rời khỏi nhóm", "rời nhóm", "bạn là thành viên", "leave group", "you're a member", "you are a member",
    "gruppe verlassen", "abandonar grupo", "salir del grupo", "quitter le groupe", "sair do grupo", "abbandona gruppo",
    "покинуть группу", "gruptan ayrıl", "keluar dari grup", "keluar kumpulan", "umalis sa grupo", "退出群组", "退出群組",
    "グループを退会", "그룹 탈퇴", "समूह छोड़ें", "مغادرة المجموعة", "ออกจากกลุ่ม"];
  const JOIN_KW = ["tham gia nhóm", "yêu cầu tham gia", "join group", "ask to join", "unirse al grupo", "unirme al grupo", "rejoindre le groupe",
    "gruppe beitreten", "participar do grupo", "participar no grupo", "iscriviti al gruppo", "unisciti al gruppo", "присоединиться к группе",
    "gruba katıl", "gabung grup", "bergabung dengan grup", "sertai kumpulan", "sumali sa grupo", "加入群组", "加入群組", "グループに参加",
    "그룹 가입", "समूह से जुड़ें", "انضم إلى المجموعة", "เข้าร่วมกลุ่ม"];
  async function scanShot(kind, sh, since) {
    if (sh.at && since && sh.at < since - 5000) return { st: "fail", msg: t("scanOld") };
    const txt = await ocrImage(sh.key || sh.img);
    if (txt == null) return { st: "unsure" };
    const low = String(txt).toLowerCase().replace(/[’`]/g, "'"), flat = low.replace(/\s+/g, "");
    const words = low.replace(/\s+/g, " ").trim().length;
    if (kind === "group") {
      const has = flat.includes("12testersfree"), join = JOIN_KW.some(k => low.includes(k));
      if (MEMBER_KW.some(k => low.includes(k))) return has ? { st: "ok" } : { st: "fail", msg: t("scanNoGroup") };
      if (has && !join) return { st: "ok" };
      if (join) return { st: "fail", msg: t("scanNotMember") };
      return words > 40 ? { st: "fail", msg: t("scanNoGroup") } : { st: "unsure" };
    }
    if (flat.includes("12testersfree@googlegroups.com") || flat.includes("12testersfree@")) return { st: "ok" };
    return words > 40 ? { st: "fail", msg: t("scanNoEmail") } : { st: "unsure" };
  }
  function vshotHtml(key, v, label) {
    if (v.st === "ok" && !v.busy) return `<div class="vmini">
      <img src="${v.img}" alt=""><span class="grow">✓ ${esc(t(key === "g" ? "grpShotOk" : "conShotOk"))}</span>
      <button class="thx" data-v="${key}-del">✕</button></div>`;
    const cls = v.busy ? "" : v.st === "ok" ? "ok" : v.st === "unsure" ? "mid" : v.st === "fail" ? "bad" : "";
    const msg = v.busy ? t("scanning") : v.st === "ok" ? t("scanOk") : v.st === "unsure" ? t("scanUnsure") : v.st === "fail" ? v.msg : t("tapToPick");
    return `<div class="vshot ${cls}" data-v="${key}">
      ${v.img ? `<span class="thumbw"><img class="thumb" src="${v.img}" alt=""><button class="thx" data-v="${key}-del">✕</button></span>` : `<span class="vcam">${IC.cam}</span>`}
      <div class="grow"><b>${esc(label)}</b><small>${esc(msg)}</small></div>
      <span class="vst">${v.busy ? `<i class="mini-spin"></i>` : v.st === "ok" ? "✓" : v.st === "unsure" ? "?" : v.st === "fail" ? "✗" : ""}</span></div>`;
  }
  const GV_KEY = () => "grpVerified_" + S.user.uid;
  const setupDone = () => !(S.me && S.me.setup === false) || LS.get("setup_" + S.user.uid, false) || LS.get(GV_KEY(), false);
  const vOk = v => v.st === "ok" || v.st === "unsure";
  // chọn ảnh → đọc chữ → ghi kết quả vào vs[g|c]
  function bindVshots(el, vs, since, repaint) {
    $$("[data-v]", el).forEach(b => b.onclick = async ev => {
      ev.stopPropagation();
      const k = b.dataset.v, v = vs[k[0]];
      if (k.endsWith("-del")) { v.img = null; v.st = null; repaint(); return; }
      if (v.busy) return;
      const sh = await pickShot(); if (!sh) { toast(t("imgBad")); return; }
      v.img = sh.img; v.st = null; v.busy = true; repaint();
      const r = await scanShot(k[0] === "g" ? "group" : "console", sh, since);
      v.busy = false; v.st = r.st; v.msg = r.msg || ""; repaint();
    });
  }

  // ================================================================ cổng vào nhóm Google (chỉ hỏi khi lần đầu Test / đăng app)
  function groupGate(then) {
    const g = { st: null, img: null }, since = Date.now();
    page(t("gateTitle"), `<div class="card sucard" id="gg">
        <div class="sub" style="margin:0 0 10px">${esc(t("gateNote"))}</div>
        <div class="title" style="font-size:16px">${esc(t("ob1Title"))}</div>
        <div class="sub">${esc(t("ob1Body", { email: S.me.testerEmail || S.user.email || "" }))}</div>
        <button class="btn block" id="gjoin" style="margin:12px 0 8px">${esc(t("ob1Btn"))}</button>
        <div id="gshot"></div></div>
      <button class="btn block" id="gdone" style="padding:16px;font-size:16px">${esc(t("setupDone"))}</button>`, pg => {
      const paint = () => { $("#gshot", pg).innerHTML = vshotHtml("g", g, t("grpShot")); bindVshots($("#gshot", pg), { g }, since, paint); };
      paint();
      $("#gjoin", pg).onclick = () => openUrl(CG.link);
      $("#gdone", pg).onclick = async ev => {
        if (!vOk(g)) { toast(t("setupHint")); const e = $("#gg", pg); e.classList.remove("flash"); void e.offsetWidth; e.classList.add("flash"); return; }
        busy(ev.target, true);
        LS.set("setup_" + S.user.uid, true);
        try { await userRef().update({ setup: true }); } catch (e) { console.error(e); }
        S.me.setup = true; closeTop(); then();
      };
    });
  }

  // ================================================================ màn thiết lập lần đầu (1 trang, 2 bước, bắt buộc)
  let SU = null;
  function renderSetup() {
    if (!SU) SU = { g: { st: null, img: null }, c: { st: null, img: null }, since: Date.now() };
    const stk = v => `<span class="stk ${vOk(v) ? "ok" : "no"}">${vOk(v) ? "✓" : "✗"}</span>`;
    const paint = () => {
      root.innerHTML = `<div class="auth" style="justify-content:flex-start;padding-top:18px">
        <div class="lwrap" dir="ltr">
          <button class="lsel ${langOpen ? "open" : ""}" id="alang"><span>🌐</span><b class="grow">${esc(LANG_NAMES[LANG] || "English")}</b><span class="car">▾</span></button>
          ${langOpen ? `<div class="llist">${[deviceLang()].concat(Object.keys(LANG_NAMES).filter(k => k !== deviceLang())).map(k => `<button class="lopt ${k === LANG ? "on" : ""}" data-l="${k}">
            <b>${esc(LANG_NAMES[k])}</b>${k === deviceLang() ? `<small>📱</small>` : ""}${k === LANG ? `<i>✓</i>` : ""}</button>`).join("")}</div>` : ""}
        </div>
        <h1 style="text-align:center;font-size:22px;margin:16px 0 4px">${esc(t("setupTitle"))}</h1>
        <p class="sub" style="text-align:center;margin:0 0 14px">${esc(t("setupSub"))}</p>
        <div class="card sucard" id="su1">${stk(SU.g)}
          <div class="row" style="align-items:flex-start;padding-right:34px"><div class="num">1</div>
            <div class="grow"><div class="title" style="font-size:16px">${esc(t("ob1Title"))}</div>
            <div class="sub">${esc(t("ob1Body", { email: S.me.testerEmail || S.user.email || "" }))}</div></div></div>
          <button class="btn block" id="sjoin" style="margin:12px 0 8px">${esc(t("ob1Btn"))}</button>
          ${vshotHtml("g", SU.g, t("grpShot"))}</div>
        <div class="card sucard" id="su2">${stk(SU.c)}
          <div class="row" style="align-items:flex-start;padding-right:34px"><div class="num">2</div>
            <div class="grow"><div class="title" style="font-size:16px">${esc(t("ob2Title"))}</div>
            <div class="sub">${esc(t("ob2Body"))}</div></div></div>
          ${copyRowHtml()}
          <div class="btns"><button class="btn ghost" id="scons">${IC.ext} ${esc(t("goConsole"))}</button>
            <button class="btn" id="sguide">${IC.help} ${esc(t("guideBtn"))}</button></div>
          ${vshotHtml("c", SU.c, t("conShot"))}</div>
        <button class="btn block" id="sdone" style="padding:16px;font-size:16px">${esc(t("setupDone"))}</button>
      </div>`;
      $("#alang").onclick = () => { langOpen = !langOpen; paint(); };
      $$("[data-l]").forEach(b => b.onclick = async () => {
        LS.set("langPref", b.dataset.l); LS.set("langChosen", true); langOpen = false; await applyLang(); paint();
      });
      bindCopy(root);
      $("#sjoin").onclick = () => openUrl(CG.link);
      $("#scons").onclick = () => openUrl(CONSOLE_URL);
      $("#sguide").onclick = () => slideGuide();
      bindVshots(root, SU, SU.since, paint);
      $("#sdone").onclick = async ev => {
        const miss = [!vOk(SU.g) && "su1", !vOk(SU.c) && "su2"].filter(Boolean);
        if (miss.length) {
          toast(t("setupHint"));
          miss.forEach(id => { const e = document.getElementById(id); e.classList.remove("flash"); void e.offsetWidth; e.classList.add("flash"); });
          document.getElementById(miss[0]).scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        busy(ev.target, true);
        LS.set("setup_" + S.user.uid, true);
        try { await userRef().update({ setup: true }); } catch (e) { console.error(e); }
        S.me.setup = true; SU = null; renderShell();
      };
    };
    paint();
  }

  // ================================================================ Trang đăng / sửa app
  function addAppPage(a) {
    const isNew = !a, cost = isNew && actMine().length >= 1 ? POST_COST : 0;
    a = a || { name: "", pkg: "", icon: "", instr: "", target: 12 };
    let icon = a.icon || "", countries = false;
    const since = Date.now(), cv = { st: null, img: null };
    const instr0 = a.instr || a.desc || "";
    page(isNew ? t("addApp") : t("edit"), `
      ${isNew ? `<div class="card pre">
        <h4 style="margin-top:0">${esc(t("preConsole"))}</h4>
        <button class="link" id="ptogg" style="display:block">▾ ${esc(t("guideToggle"))}</button>
        <div id="pmore" class="hidden">
          <div class="warn">⚠️ ${esc(t("preWarn"))}</div>
          ${copyRowHtml()}
          <div class="btns"><button class="btn ghost" id="pconsole">${IC.ext} ${esc(t("goConsole"))}</button>
            <button class="btn" id="pguide">${IC.help} ${esc(t("guideBtn"))}</button></div>
        </div>
        <div id="pcon"></div>
        <div class="toggle" id="ptoggle"><div class="sw"></div>
          <div><b>🌍 ${esc(t("countryConfirm"))}</b><small>${esc(t("countryConfirmBody"))}</small></div></div>
      </div>` : ""}
      <div class="card">
        <div class="title" style="font-size:17px">${esc(t("appDetails"))}</div>
        <div class="upicon" id="picon">${icon ? `<img src="${esc(icon)}" alt="">` : `<div>${IC.img}<div>${esc(t("uploadIcon"))} <span style="color:var(--red)">*</span></div></div>`}</div>
        <label class="l">${esc(t("appNameL"))}</label>
        <input id="pname" type="text" maxlength="30" value="${esc(a.name)}" placeholder="${esc(t("appNamePh"))}">
        <div class="count"><span id="pnc">${a.name.length}</span>/30</div>
        <label class="l">${esc(t("playLinkL"))}</label>
        <input id="plink" type="url" value="${esc(a.pkg)}" ${isNew ? "" : "disabled"} placeholder="https://play.google.com/store/apps/details?id=..." autocapitalize="off" spellcheck="false">
        <div class="hint" id="ppkg">${esc(t("playLinkHint"))}</div>
      </div>
      <div class="card">
        <div class="title" style="font-size:17px">${esc(t("testReq"))}</div>
        <label class="l">${esc(t("targetL"))}</label>
        <input id="ptarget" type="number" min="12" max="100" value="${a.target || 12}">
        <label class="l">${esc(t("instrL"))} *</label>
        <textarea id="pinstr" maxlength="250" placeholder="${esc(t("instrPh"))}">${esc(instr0)}</textarea>
        <div class="count"><span id="pic">${instr0.length}</span>/250</div>
        <div class="chips">${CHIPS.map(k => `<button data-chip="${k}">+ ${esc(t(k + "L"))}</button>`).join("")}</div>
      </div>
      ${cost ? `<div class="hint" style="margin:0 0 10px">⭐ ${esc(t("postCostNote", { c: cost }))}</div>` : ""}
      <div class="err" id="perr"></div>
      <button class="btn block" id="psave" style="padding:16px;font-size:16px">${esc(isNew ? t("addAppBtn") + (cost ? " · " + cost + "⭐" : "") : t("save"))}</button>`,
    pg => {
      const paintPre = () => {
        if (!isNew) return;
        $("#pcon", pg).innerHTML = vshotHtml("c", cv, t("conShot"));
        bindVshots($("#pcon", pg), { c: cv }, since, paintPre);
      };
      if (isNew) {
        paintPre(); bindCopy(pg);
        const tg = $("#ptogg", pg); tg.onclick = () => { $("#pmore", pg).classList.toggle("hidden"); tg.textContent = ($("#pmore", pg).classList.contains("hidden") ? "▾ " : "▴ ") + t("guideToggle"); };
        $("#pconsole", pg).onclick = () => openUrl(CONSOLE_URL);
        $("#pguide", pg).onclick = () => slideGuide();
        $("#ptoggle", pg).onclick = () => { countries = !countries; $("#ptoggle", pg).classList.toggle("on", countries); };
      }
      $("#picon", pg).onclick = async () => {
        const d = await pickImage({ square: 160, limit: 60000 });
        if (!d) { toast(t("imgBad")); return; }
        icon = d; $("#picon", pg).innerHTML = `<img src="${d}" alt="">`;
      };
      const nm = $("#pname", pg), ins = $("#pinstr", pg), lk = $("#plink", pg);
      nm.oninput = () => $("#pnc", pg).textContent = nm.value.length;
      ins.oninput = () => $("#pic", pg).textContent = ins.value.length;
      lk.oninput = () => {
        const p = pkgFrom(lk.value);
        $("#ppkg", pg).innerHTML = isPkg(p) ? `✓ <b style="color:var(--green)">${esc(p)}</b>` : esc(t("playLinkHint"));
      };
      $$("[data-chip]", pg).forEach(b => b.onclick = () => {
        const add = t(b.dataset.chip + "T");
        let v = ins.value.trim(); v = v ? v + (/[.!?]$/.test(v) ? " " : ". ") + add : add;
        ins.value = v.slice(0, 250); ins.oninput();
      });
      $("#psave", pg).onclick = async ev => {
        const err = $("#perr", pg);
        const name = nm.value.trim(), pkg = isNew ? pkgFrom(lk.value) : a.pkg, instr = ins.value.trim();
        const target = Math.max(12, Math.min(100, parseInt($("#ptarget", pg).value, 10) || 12));
        if (isNew) {
          const bad = !vOk(cv) ? ["errConShot", "#pcon"] : !countries ? ["errCountry", "#ptoggle"] : null;
          if (bad) { err.textContent = t(bad[0]); $(bad[1], pg).scrollIntoView({ behavior: "smooth", block: "center" }); return; }
        }
        if (!icon) { err.textContent = t("errIcon"); return; }
        if (!name) { err.textContent = t("errAppName"); return; }
        if (isNew && !isPkg(pkg)) { err.textContent = t("errPkg"); return; }
        if (instr.length < 5) { err.textContent = t("errInstr"); return; }
        err.textContent = ""; busy(ev.target, true);
        try {
          if (isNew) {
            const mine = await loadMine(true), c2 = mine.filter(x => !x.done).length >= 1 ? POST_COST : 0;
            if (c2 && (S.me.stars || 0) < c2) { err.textContent = t("errNoStars", { c: c2, n: c2 - (S.me.stars || 0) }); busy(ev.target, false); return; }
            const dup = await db.collection("apps").where("pkg", "==", pkg).limit(1).get();
            if (!dup.empty) { err.textContent = t("errDupPkg"); busy(ev.target, false); return; }
            const b = db.batch();
            b.set(db.collection("apps").doc(), {
              ownerUid: S.user.uid, ownerName: shortName(S.me.name), ownerSeen: FV.serverTimestamp(),
              name, pkg, icon, instr, target, mode: "community", active: true,
              testersCount: 0, feedbackCount: 0, createdAt: FV.serverTimestamp()
            });
            if (c2) b.update(userRef(), { stars: FV.increment(-c2) });
            await b.commit();
            if (c2) S.me.stars -= c2;
          } else {
            await appRef(a.id).update({ name, icon, instr, target });
          }
          closeAll(); toast(t("saved"));
          S.apps = null; S.mine = null; S.openMine = null;
          if (S.tab !== "mine") go("mine"); else renderTab();
        } catch (e) { err.textContent = failMsg(e); busy(ev.target, false); }
      };
    });
  }

  const CONSOLE_URL = "https://play.google.com/console/u/0/developers";
  // 5 hình vẽ mô phỏng Play Console (khung trắng, ô tím là chỗ cần bấm)
  function slideSvg(i) {
    const P = '#8B5CF6', TX = '#202124', MU = '#5F6368', BL = '#1A73E8';
    const box = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="none" stroke="${P}" stroke-width="3"/>`;
    const txt = (x, y, s, c, sz, w) => `<text x="${x}" y="${y}" font-size="${sz || 12}" fill="${c || TX}" ${w ? 'font-weight="700"' : ""}>${s}</text>`;
    const cb = (x, y) => `<rect x="${x}" y="${y}" width="13" height="13" rx="2" fill="${BL}"/><path d="M${x + 3} ${y + 7}l3 3 5-6" stroke="#fff" stroke-width="2" fill="none"/>`;
    const tabs = act => ["Releases", "Countries/regions", "Testers"].map((n, k) => {
      const xs = [14, 82, 196][k];
      return txt(xs, 26, n, k === act ? BL : MU, 11.5, k === act) + (k === act ? `<rect x="${xs - 4}" y="32" width="${[60, 108, 50][k]}" height="3" fill="${BL}"/>` : "");
    }).join("") + `<line x1="0" y1="35" x2="300" y2="35" stroke="#E0E0E0"/>`;
    const S = [
      // 1: menu
      `<rect width="300" height="40" fill="#fff"/><path d="M14 14h16M14 20h16M14 26h16" stroke="${MU}" stroke-width="2"/>
       <path d="M42 12l14 8-14 8z" fill="${BL}"/>${txt(62, 25, "Google Play", MU, 13)}${txt(140, 25, "Console", BL, 13)}
       ${["Dashboard", "Statistics", "Publishing overview"].map((n, k) => txt(46, 66 + k * 26, n, TX, 12)).join("")}
       <rect x="10" y="136" width="200" height="186" rx="12" fill="#D3E3FD"/>${txt(46, 158, "Test and release", BL, 12.5, 1)}
       ${["Latest releases and bundles", "Production"].map((n, k) => `<rect x="18" y="${170 + k * 32}" width="184" height="26" rx="6" fill="#fff"/>` + txt(28, 188 + k * 32, n, TX, 11)).join("")}
       <rect x="18" y="234" width="184" height="84" rx="6" fill="#fff"/>${txt(28, 252, "Testing  ▴", TX, 11)}
       ${txt(40, 272, "Open testing", TX, 11)}${txt(40, 293, "Closed testing", TX, 11, 1)}${box(32, 279, 102, 20)}${txt(40, 314, "Internal testing", TX, 11)}`,
      // 2: manage track
      `${txt(14, 34, "Closed testing", TX, 17, 1)}<rect x="190" y="50" width="96" height="26" rx="4" fill="${BL}"/>${txt(204, 67, "Create track", "#fff", 11, 1)}
       ${txt(14, 100, "Test pre-release versions with your own groups", MU, 10)}<line x1="14" y1="118" x2="286" y2="118" stroke="#E0E0E0"/>
       ${txt(14, 148, "Tracks", TX, 15, 1)}${txt(14, 182, "Closed testing - Alpha", TX, 12.5)}${txt(14, 200, "1 (1.0.0) · Last updated", MU, 10)}
       ${txt(206, 186, "Manage track", BL, 11.5, 1)}${box(198, 170, 88, 24)}`,
      // 3: countries
      `${tabs(1)}${txt(14, 68, "Countries/regions", TX, 16, 1)}<rect x="14" y="82" width="150" height="24" rx="4" fill="#E8F0FE"/>${txt(22, 98, "All countries/regions ▾", BL, 10.5)}
       <line x1="14" y1="150" x2="286" y2="150" stroke="#E0E0E0"/>${cb(22, 132)}${box(16, 126, 25, 25)}${txt(48, 143, "Country / region", MU, 10.5)}${txt(200, 143, "Status", MU, 10.5)}
       ${["Albania", "Algeria", "Angola", "Argentina"].map((n, k) => cb(22, 164 + k * 32) + txt(48, 175 + k * 32, n, TX, 11.5) + txt(200, 175 + k * 32, "✓ Targeted", "#188038", 11)).join("")}`,
      // 4: testers
      `${tabs(2)}${txt(14, 68, "Testers", TX, 16, 1)}${txt(14, 96, "Choose who can access your test.", MU, 10.5)}
       <circle cx="24" cy="124" r="7" fill="none" stroke="${MU}" stroke-width="1.6"/>${txt(40, 128, "Email lists", TX, 11.5)}
       <circle cx="24" cy="156" r="7" fill="none" stroke="${BL}" stroke-width="1.6"/><circle cx="24" cy="156" r="3.5" fill="${BL}"/>${txt(40, 160, "Google Groups", TX, 11.5, 1)}${box(12, 143, 118, 26)}
       ${txt(40, 192, "Email addresses", MU, 10)}<rect x="40" y="200" width="246" height="56" rx="4" fill="#fff" stroke="#DADCE0"/>
       <rect x="48" y="212" width="226" height="24" rx="12" fill="#F1F3F4" stroke="#DADCE0"/>${txt(58, 228, esc(CG.email), TX, 10.5)}${box(36, 196, 254, 64)}
       ${txt(40, 280, "Only members of the Google Groups", MU, 9.5)}${txt(40, 293, "you specify can join your test.", MU, 9.5)}`,
      // 5: save & send
      `${txt(14, 26, "If you save, changes will be ready to send", MU, 10.5)}${txt(14, 40, "for review.", MU, 10.5)}
       ${txt(170, 70, "Discard", MU, 11.5)}<rect x="222" y="54" width="60" height="26" rx="4" fill="${BL}"/>${txt(238, 71, "Save", "#fff", 11.5, 1)}${box(216, 48, 72, 38)}
       <rect x="10" y="100" width="280" height="96" rx="8" fill="#fff" stroke="#DADCE0"/>${txt(22, 124, "Go to Publishing overview?", TX, 12.5, 1)}
       ${txt(22, 144, "Your change has been saved.", MU, 10)}${txt(110, 180, "Not now", MU, 11)}<rect x="170" y="164" width="108" height="24" rx="4" fill="${BL}"/>${txt(184, 181, "Go to overview", "#fff", 11, 1)}${box(164, 158, 120, 36)}
       ${txt(14, 232, "Changes not yet sent for review", TX, 13.5, 1)}<rect x="20" y="248" width="170" height="28" rx="4" fill="${BL}"/>${txt(32, 267, "Send 1 change for review", "#fff", 11, 1)}${box(14, 242, 182, 40)}`
    ];
    return `<svg viewBox="0 0 300 330" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,Roboto,sans-serif" style="width:100%;display:block;background:#fff;border-radius:16px">${S[i]}</svg>`;
  }
  function slideGuide() {
    let i = 0; const N = 5;
    sheet(`<div id="sg"></div>`, el => {
      const paint = () => {
        $("#sg", el).innerHTML = `
          <div class="row"><h2 class="grow" style="margin:0">${esc(t("slTitle"))}</h2><button class="ibtn" data-s="x">✕</button></div>
          <div class="row" style="margin:6px 0 12px"><span class="sub grow">${esc(t("slStep", { a: i + 1, b: N }))}</span>
            <span class="dots" style="margin:0">${Array.from({ length: N }, (_, k) => `<i class="${k <= i ? "on" : ""}" style="width:${k === i ? 22 : 9}px"></i>`).join("")}</span></div>
          ${slideSvg(i)}
          <p style="margin:12px 2px 0;font-size:15px">${esc(t("sl" + (i + 1), { email: CG.email }))}</p>
          ${i === 3 ? copyRowHtml() : ""}
          <div class="btns">${i ? `<button class="btn ghost" data-s="b">${esc(t("back"))}</button>` : `<button class="btn ghost" data-s="c">${IC.ext} ${esc(t("goConsole"))}</button>`}
            <button class="btn" data-s="n">${esc(i === N - 1 ? t("doneBtn") : t("next"))}</button></div>`;
        bindCopy(el);
        $$("[data-s]", el).forEach(b => b.onclick = () => {
          const k = b.dataset.s;
          if (k === "x") closeTop();
          else if (k === "c") openUrl(CONSOLE_URL);
          else if (k === "b") { i--; paint(); }
          else if (i === N - 1) closeTop(); else { i++; paint(); }
        });
      };
      paint();
    });
  }

  function guideSheet(kind) {
    const steps = kind === "post" ? ["gp1", "gp2", "gp3", "gp4", "gp5"] : ["gt1", "gt2", "gt3", "gt4", "gt5"];
    sheet(`<h2>${esc(t(kind === "post" ? "guidePost" : "guideTest"))}</h2>
      <ol class="guide">${steps.map(k => `<li>${esc(t(k, { email: CG.email }))}</li>`).join("")}</ol>
      ${kind === "post" ? phoneSvg() + `<div class="btns"><button class="btn ghost" id="gcons">${esc(t("openConsole"))}</button></div>` : ""}
      <button class="btn block ghost" style="margin-top:12px" id="gclose">${esc(t("close"))}</button>`, el => {
      $("#gclose", el).onclick = closeTop;
      const c = $("#gcons", el); if (c) c.onclick = () => openUrl("https://play.google.com/console");
    });
  }

  // ================================================================ lỗi ghi dữ liệu: báo đúng nguyên nhân
  function failMsg(e) {
    const c = String((e && e.code) || "");
    console.error(e);
    if (c.includes("permission-denied")) return t("errPerm");
    if (c.includes("not-found")) return t("goneHint");
    if (c.includes("unavailable") || c.includes("deadline") || (typeof navigator !== "undefined" && navigator.onLine === false)) return t("errNet");
    if (c.includes("invalid-argument") || c.includes("resource-exhausted")) return t("errTooBig");
    return t("errSave") + (c ? " (" + c.replace("firestore/", "") + ")" : "");
  }

  // Hỏi lý do khi từ chối: chọn sẵn hoặc tự ghi. Trả về chuỗi lý do, hoặc null nếu hủy
  function askReason(title, keys) {
    return new Promise(res => {
      let picked = null, done = false;
      const finish = v => { if (done) return; done = true; res(v); };
      sheet(`<h3>${esc(title)}</h3><p class="sub" style="margin-top:0">${esc(t("reasonSub"))}</p>
        ${keys.map(k => `<button class="opt" data-rs="${k}"><b>${esc(t(k))}</b></button>`).join("")}
        <textarea id="rsx" maxlength="150" rows="2" placeholder="${esc(t("reasonPh"))}" style="margin-top:8px"></textarea>
        <div class="err" id="rserr"></div>
        <div class="btns"><button class="btn ghost" data-rs-x>${esc(t("close"))}</button><button class="btn red" data-rs-ok>${esc(t("decline"))}</button></div>`, el => {
        $$("[data-rs]", el).forEach(b => b.onclick = () => { picked = b.dataset.rs; $$("[data-rs]", el).forEach(z => z.classList.toggle("on", z === b)); });
        $("[data-rs-x]", el).onclick = () => { closeTop(); finish(null); };
        $("[data-rs-ok]", el).onclick = () => {
          const extra = $("#rsx", el).value.trim();
          if (!picked && extra.length < 3) { $("#rserr", el).textContent = t("reasonNeed"); return; }
          if (picked === "rsOther" && extra.length < 3) { $("#rserr", el).textContent = t("reasonNeedText"); return; }
          const txt = (picked && picked !== "rsOther" ? t(picked) : "") + (extra ? (picked && picked !== "rsOther" ? " — " : "") + extra : "");
          closeTop(); finish(txt.slice(0, 200));
        };
      });
    });
  }

  // ================================================================ TAB 4: Cá nhân
  function editProfile() {
    sheet(`<h2>${esc(t("profile"))}</h2>
      <label class="l" style="margin-top:0">${esc(t("name"))}</label><input id="pn" type="text" maxlength="40" value="${esc(S.me.name)}">
      <label class="l">${esc(t("testerEmailL"))}</label><input id="pm" type="email" value="${esc(S.me.testerEmail || "")}" placeholder="you@gmail.com" autocapitalize="off">
      <div class="hint">${esc(t("testerEmailHint"))}</div><div class="err" id="pe"></div>
      <button class="btn block" id="ps">${esc(t("save"))}</button>`, el => {
      $("#ps", el).onclick = async ev => {
        const name = $("#pn", el).value.trim(), mail = $("#pm", el).value.trim().toLowerCase(), err = $("#pe", el);
        if (!name) { err.textContent = t("errName"); return; }
        if (!isGmail(mail)) { err.textContent = t("errGmail"); return; }
        busy(ev.target, true);
        try {
          const b = db.batch();
          b.update(userRef(), { name, testerEmail: mail });
          await b.commit();
          S.me.name = name; S.me.testerEmail = mail; closeTop(); toast(t("saved")); if (S.tab === "me") renderTab();
        } catch (e) { err.textContent = failMsg(e); busy(ev.target, false); }
      };
    });
  }
  function renderMe(m) {
    const r = getReminder();
    m.innerHTML = header(t("tabMe"), "", topRight()) + `
      <div class="card"><div class="prow">
        <div class="avatar">${esc((S.me.name || "?")[0].toUpperCase())}</div>
        <div class="grow"><div class="title ell">${esc(S.me.name)}</div><div class="sub ell">${esc(S.me.testerEmail || S.user.email || "")}</div></div>
        <button class="ibtn" id="medit">${IC.edit}</button></div></div>
      <div class="card" style="padding:4px 14px">
        <div class="mi"><div class="grow"><b>🌐 ${esc(t("langL"))}</b></div>
          <select id="mlang"><option value="auto">${esc(t("langAuto"))}</option>${Object.keys(LANG_NAMES).map(k => `<option value="${k}">${esc(LANG_NAMES[k])}</option>`).join("")}</select></div>
        <div class="mi" id="mrem"><div class="grow"><b>⏰ ${esc(t("reminderL"))}</b><small class="sub" style="display:block">${esc(t("reminderSub"))}</small></div><div class="sw ${r.on !== false ? "on" : ""}" id="msw"></div></div>
        <div class="mi" data-m="batt"><div class="grow"><b>🔋 ${esc(t("battL"))}</b></div><span class="chev">${IC.chev}</span></div>
      </div>
      <div class="card" style="padding:4px 14px">
        <div class="mi" data-m="post"><div class="grow"><b>📘 ${esc(t("guidePost"))}</b></div><span class="chev">${IC.chev}</span></div>
        <div class="mi" data-m="test"><div class="grow"><b>🧪 ${esc(t("guideTest"))}</b></div><span class="chev">${IC.chev}</span></div>
        <div class="mi" data-m="group"><div class="grow"><b>👥 ${esc(t("obMenu"))}</b></div><span class="chev">${IC.chev}</span></div>
      </div>
      <div class="card rate"><div class="mi" data-m="rate" style="border:0;padding:6px 0">
        <div style="font-size:28px">⭐</div><div class="grow"><b>${esc(t("rateTitle"))}</b><span class="sub">${esc(t("rateBody"))}</span></div><span class="chev">${IC.chev}</span></div></div>
      <div class="foot"><button class="link muted" id="mout">${esc(t("logout"))}</button><button class="link muted" id="mdel" style="color:var(--red)">${esc(t("deleteAcc"))}</button></div>
      <p class="sub" style="text-align:center;margin-top:10px">v${esc(A && A.appVersion ? A.appVersion() : "web")}</p>`;
    $("#medit").onclick = editProfile;
    const sel = $("#mlang"); sel.value = langPref();
    sel.onchange = async () => {
      LS.set("langPref", sel.value); await applyLang();
      try { await userRef().update({ lang: LANG }); } catch (e) {}
      setupNotify(); renderShell();
    };
    $("#mrem").onclick = () => {
      const nr = { on: !(getReminder().on !== false) }; LS.set("mrem", nr);
      $("#msw").classList.toggle("on", nr.on); pushMission();
    };
    $$("[data-m]", m).forEach(el => el.onclick = () => {
      const k = el.dataset.m;
      if (k === "post") slideGuide(); else if (k === "test") guideSheet("test");
      else if (k === "group") sheet(onboardHtml(true), bindOnboard);
      else if (k === "batt") sheet(`<h2>🔋 ${esc(t("battL"))}</h2><p class="sub" style="margin-top:0">${esc(t("battBody"))}</p><button class="btn block bl" data-close>${esc(t("gotIt"))}</button>`, el => $("[data-close]", el).onclick = closeTop);
      else if (k === "rate") openUrl(A ? "market://details?id=" + OUR_PACKAGE : playUrl(OUR_PACKAGE));
    });
    $("#mout").onclick = () => signOut();
    $("#mdel").onclick = deleteAccount;
  }
  async function deleteAccount() {
    if (!(await ask(t("deleteAsk"), t("deleteAcc"), true))) return;
    const uid = S.user.uid;
    try {
      const joined = await loadJoined(true);
      for (const j of Object.values(joined)) {
        try {
          const fq = await appRef(j.id).collection("feedback").where("uid", "==", uid).get();
          for (const d of fq.docs) await d.ref.delete();
        } catch (e) {}
        await leaveApp(j);
      }
      const mine = await loadMine(true);
      for (const a of mine) await deleteAppDeep(a.id);
      await userRef().delete();
      if (A && A.setMission) A.setMission("");
      if (A && A.setNotify) A.setNotify("");
      await S.user.delete();
    } catch (e) {
      console.error(e);
      if (String(e && e.code).includes("requires-recent-login")) { toast(t("reauth")); await signOut(); }
      else toast(failMsg(e));
    }
  }

  // đồng hồ đếm ngược trong ngày
  setInterval(() => { const v = untilMidnight(); $$(".timer").forEach(el => el.textContent = (el.textContent.startsWith("⏱") ? "⏱ " : "") + v); }, 30000);

  boot();
})();
