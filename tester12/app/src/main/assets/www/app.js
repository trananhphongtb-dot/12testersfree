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
    if (S.user && S.tab !== "home") { go("home"); return true; }
    return false;
  };
  window.onAndroidResume = function () {
    if (backFromApp()) return;
    if (S.user && S.me && !stack.length && (S.tab === "tasks" || S.tab === "home")) renderTab();
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
    chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
    edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    star: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.2 6.6.7-5 4.5 1.4 6.6L12 17.2l-5.9 3.3 1.4-6.6-5-4.5 6.6-.7z"/></svg>',
    home: '<path d="M4 11l8-7 8 7v9H4z M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    market: '<path d="M4 9l1.5-5h13L20 9M4 9h16v11H4zM4 9c0 2 3.5 2 4 0 .5 2 3.5 2 4 0 .5 2 3.5 2 4 0 .5 2 4 2 4 0M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M7 15h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
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
  const S = { user: null, me: null, tab: "home", apps: null, appsAt: 0, joined: null, mine: null, mineT: {},
    tdocs: {}, open: null, openTask: null, openMine: null, q: "", swaps: null };
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
      Object.assign(S, { user: u, me: null, apps: null, joined: null, mine: null, mineT: {}, tdocs: {}, tab: "home", open: null, openTask: null, openMine: null, q: "", swaps: null });
      skipOnboard = false;
      [joinState, proofs].forEach(o => Object.keys(o).forEach(k => delete o[k])); away = null;
      if (!u) { renderAuth("login"); return; }
      if (!LS.get("langChosen", false)) { LS.set("langChosen", true); if (LS.get("langPref", null) == null) LS.set("langPref", "auto"); await applyLang(); }
      root.innerHTML = `<div class="spinner"></div>`;
      try { await loadMe(); await Promise.all([loadMine(), loadJoined()]); setupNotify(); renderShell(); }
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
        stars: 0, lang: LANG, createdAt: FV.serverTimestamp()
      };
      await userRef().set(data);
      S.me = Object.assign({}, data, { stars: 0 });
      pendingName = "";
    } else {
      S.me = snap.data();
      if (S.me.stars == null) S.me.stars = 0;
    }
  }

  // Cộng sao: cập nhật hồ sơ + đồng bộ số sao hiển thị trên các app của mình
  async function addStarsTo(b, delta) {
    try { const f = await userRef().get(); if (f.exists) S.me.stars = f.data().stars || 0; } catch (e) {}
    const ns = (S.me.stars || 0) + delta;
    b.update(userRef(), { stars: FV.increment(delta) });
    (S.mine || []).forEach(a => b.update(appRef(a.id), { ownerStars: ns }));
    return ns;
  }
  function gotStars(ns) {
    if (ns == null) return;
    S.me.stars = ns; (S.mine || []).forEach(a => a.ownerStars = ns);
    $$(".mystars").forEach(el => el.innerHTML = starTxt(ns));
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
          err.textContent = String(e && e.code).includes("account-exists") ? t("errGoogleExists") : t("errGoogle");
        }
      };
      window.onGoogleError = msg => { busy(gb, false); if (msg !== "cancel") { console.error(msg); err.textContent = t("errGoogle"); } };
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
  const TABS = [["home", "tabHome", IC.home], ["explore", "tabExplore", IC.market], ["tasks", "tabTasks", IC.flask], ["me", "tabMe", IC.user]];
  function renderShell() {
    if (!onboarded() && !skipOnboard) {
      root.innerHTML = `<div class="auth" style="justify-content:flex-start;padding-top:28px">${onboardHtml(false)}</div>`;
      bindOnboard(root); return;
    }
    root.innerHTML = `<main id="main"></main>
      <nav class="tabs">${TABS.map(([id, k, svg]) =>
        `<button data-tab="${id}"><svg viewBox="0 0 24 24">${svg}</svg>${esc(t(k))}${id === "tasks" ? '<i class="dot hidden" id="taskdot"></i>' : ""}</button>`).join("")}</nav>`;
    $$("nav.tabs button").forEach(b => b.onclick = () => go(b.dataset.tab));
    go(S.tab);
  }
  function go(tab, opts) {
    S.tab = tab;
    $$("nav.tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    window.scrollTo(0, 0);
    renderTab(opts);
  }
  function renderTab(opts) {
    const m = $("#main"); if (!m) return;
    if (S.tab === "home") return renderHome(m);
    if (S.tab === "explore") return renderExplore(m, opts);
    if (S.tab === "tasks") return renderTasks(m);
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

  // ================================================================ TAB 1: Trang chủ (app của tôi)
  async function renderHome(m) {
    if (!S.mine) spin(m);
    try {
      await Promise.all([loadMine(true), loadApps(), loadJoined(), loadSwaps()]);
      await loadMineTesters();
    } catch (e) { console.error(e); return failBox(m, () => renderHome(m)); }
    if (S.tab !== "home") return;
    const right = `<span class="starpill mystars">${starTxt(S.me.stars)}</span>`;
    const todo = buildTodo();
    const todoHtml = todo.length ? `<div class="sec" style="margin-top:4px"><h2>${esc(t("todoTitle"))}</h2><span>${todo.length}</span></div>
      <div class="carousel tcar">${todo.map(x => todoCardHtml(x, true)).join("")}</div>` : "";
    if (!S.mine.length) {
      m.innerHTML = header(t("homeTitle"), t("homeSub"), right) + todoHtml + `
        <div class="card" style="text-align:center;padding:30px 18px;margin-top:12px">
          <div style="font-size:46px">🚀</div>
          <div class="title" style="margin:6px 0 4px">${esc(t("noAppTitle"))}</div>
          <p class="sub" style="margin:0 0 18px">${esc(t("noAppBody"))}</p>
          <button class="btn block" id="addbig" style="font-size:17px;padding:16px">＋ ${esc(t("addApp"))}</button>
        </div>`;
      $("#addbig").onclick = () => addAppPage(null);
      bindTodo(m);
      return;
    }
    m.innerHTML = header(t("homeTitle"), t("homeSub"), right) + todoHtml +
      `<div class="sec"><h2>${esc(t("myApps"))}</h2><span>${S.mine.length}</span></div>` +
      `<button class="btn block" id="addapp" style="margin-bottom:14px">＋ ${esc(t("addApp"))}</button>` +
      S.mine.map(a => mineCard(a)).join("");
    $("#addapp").onclick = () => addAppPage(null);
    bindTodo(m);
    $$("[data-iss]", m).forEach(b => b.onclick = async ev => {
      ev.stopPropagation();
      if (b.dataset.iss === "console") return openUrl(CONSOLE_URL);
      busy(b, true);
      try {
        await appRef(b.dataset.id).update({ issues: {} });
        const a = S.mine.find(x => x.id === b.dataset.id); if (a) a.issues = {};
        toast(t("issCleared")); renderHome(m);
      } catch (e) { busy(b, false); toast(failMsg(e)); }
    });
    $$("[data-mine]", m).forEach(el => el.addEventListener("click", e => {
      if (e.target.closest("[data-stop]")) return;
      const id = el.dataset.mine;
      S.openMine = S.openMine === id ? null : id;
      renderHome(m);
    }));
    if (S.openMine) {
      const el = $(`[data-mine="${S.openMine}"]`, m);
      const a = S.mine.find(x => x.id === S.openMine);
      if (el && a) bindMineExpanded(el, a);
    }
  }
  function mineCard(a) {
    const ts = S.mineT[a.id] || [], n = ts.length, target = a.target || 12;
    const pend = ts.reduce((s, x) => s + dayInfo(x).pending.length, 0);
    const doneToday = ts.filter(x => dayInfo(x).todayDone).length;
    const open = S.openMine === a.id;
    return `<div class="acard ${open ? "open" : ""}" data-mine="${esc(a.id)}">
      <div class="top">${iconHtml(a)}
        <div class="grow">
          <div class="head"><div class="name ell">${esc(a.name)}</div>
            ${a.active === false ? `<span class="tag m">${esc(t("hidden"))}</span>` : n >= target ? `<span class="tag g">${esc(t("enough"))}</span>` : `<span class="tag b">${esc(t("recruiting"))}</span>`}</div>
          ${statsHtml(Object.assign({}, a, { testersCount: n }))}
          <div class="bar ${n >= target ? "full" : ""}"><i style="width:${Math.min(100, n / target * 100)}%"></i></div>
          <div class="meta" style="margin-top:8px">
            ${pend ? `<span class="badge">${esc(t("pendingN", { n: pend }))}</span>` : ""}
            <span class="sub">${esc(t("todayN", { a: doneToday, b: n }))}</span>
          </div>
        </div></div>
      ${issBoxHtml(a)}
      ${open ? `<div class="xp" data-stop>${mineExpandedHtml(a, ts)}</div>` : ""}
    </div>`;
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
  function mineExpandedHtml(a, ts) {
    const joinedSet = S.joined || {};
    return `
      <div class="sec" style="margin-top:0"><h2 style="font-size:16px">${esc(t("testersList"))} (${ts.length})</h2>
        ${ts.length ? `<button class="link" data-act="copy">${esc(t("copyEmails"))}</button>` : ""}</div>
      ${ts.length ? ts.map(x => {
        const info = dayInfo(x);
        const back = (S.apps || []).find(o => o.ownerUid === x.uid && o.active !== false && !joinedSet[o.id]);
        return `<div class="person">
          <div class="row"><div class="avatar">${esc((x.name || "?")[0].toUpperCase())}</div>
            <div class="grow"><div style="font-weight:700" class="ell">${esc(x.name)}</div><div class="sub ell">${esc(x.email)}</div></div>
            <div class="sub" style="text-align:right">${esc(info.finished ? t("days14") : t("dayX", { d: info.cur }))}</div></div>
          ${daysStrip(info)}
          ${back ? `<button class="btn small amber" style="margin-top:8px" data-goback="${esc(back.id)}">↩ ${esc(t("testBack"))}: ${esc(back.name)}</button>` : ""}
          ${info.pending.length ? `<div data-proofs="${esc(x.uid)}"><div class="sub" style="margin-top:6px">${esc(t("loading"))}</div></div>` : ""}
        </div>`;
      }).join("") + legend() : `<p class="sub" style="margin:0">${esc(t("noTesters"))}</p>`}
      <div class="sec"><h2 style="font-size:16px">${esc(t("feedbacks"))}</h2></div>
      <div data-fbs><div class="sub">${esc(t("loading"))}</div></div>
      <div class="btns"><button class="btn ghost small" data-act="share">${IC.share} ${esc(t("share"))}</button>
        <button class="btn ghost small" data-act="edit">${IC.edit} ${esc(t("edit"))}</button></div>
      <div class="btns"><button class="btn ghost small" data-act="toggle">${esc(a.active === false ? t("reopen") : t("hideApp"))}</button>
        <button class="btn red small" data-act="del">${esc(t("del"))}</button></div>`;
  }
  async function bindMineExpanded(el, a) {
    const ts = S.mineT[a.id] || [];
    $$("[data-act]", el).forEach(b => b.onclick = async () => {
      const k = b.dataset.act;
      if (k === "copy") toast((await copyText(ts.map(x => x.email).filter(Boolean).join(", "))) ? t("copied") : t("errNet"));
      else if (k === "share") {
        const txt = t("shareText", { name: a.name }) + "\n" + optinUrl(a.pkg);
        if (A) A.share(txt); else copyText(txt).then(() => toast(t("copied")));
      } else if (k === "edit") addAppPage(a);
      else if (k === "toggle") {
        try { await appRef(a.id).update({ active: a.active === false }); S.apps = null; renderTab(); } catch (e) { toast(failMsg(e)); }
      } else if (k === "del") {
        if (!(await ask(t("delAsk"), t("del"), true))) return;
        try { await deleteAppDeep(a.id); S.openMine = null; S.apps = null; S.mine = null; renderTab(); } catch (e) { toast(failMsg(e)); }
      }
    });
    $$("[data-goback]", el).forEach(b => b.onclick = () => go("explore", { open: b.dataset.goback }));
    // ảnh chờ duyệt
    for (const box of $$("[data-proofs]", el)) {
      const uid = box.dataset.proofs, x = ts.find(z => z.uid === uid); if (!x) continue;
      const info = dayInfo(x);
      const docs = await Promise.all(info.pending.map(d => testerRef(a.id, uid).collection("days").doc(d).get().catch(() => null)));
      box.innerHTML = docs.map((s, i) => {
        const d = info.pending[i], data = s && s.exists ? s.data() : {};
        const idx = diffDays(x.joinDay || d, d) + 1;
        return `<div class="proof" data-day="${esc(d)}">
          <div class="row" style="margin-bottom:6px"><b class="grow">${esc(t("dayX", { d: idx }))}</b><span class="tag a">${esc(t("stP"))}</span></div>
          ${data.img ? `<div class="pimgs">${[data.img].concat(data.more || []).map(u => `<img src="${esc(u)}" alt="">`).join("")}</div>` : ""}
          ${data.used ? `<div class="sub" style="margin-top:6px">${esc(t("usedLine", { s: data.used, h: data.shotAt ? hm(data.shotAt) : "–" }))}</div>` : ""}
          ${data.note ? `<div class="sub" style="margin-top:6px">${esc(data.note)}</div>` : ""}
          <div class="btns"><button class="btn red small" data-rv="r">✗ ${esc(t("reject"))}</button><button class="btn green small" data-rv="a">✓ ${esc(t("approve"))}</button></div>
        </div>`;
      }).join("");
      $$(".proof .pimgs img", box).forEach(im => im.onclick = () => sheet(`<img src="${im.src}" style="width:100%;border-radius:12px" alt="">`));
      $$("[data-rv]", box).forEach(b => b.onclick = async () => {
        const d = b.closest("[data-day]").dataset.day, v = b.dataset.rv;
        let why = "";
        if (v === "r") { why = await askReason(t("rejectTitle"), ["rsWrongApp", "rsBlurry", "rsSame", "rsOther"]); if (!why) return; }
        busy(b, true);
        try {
          await testerRef(a.id, uid).update(v === "r" ? { ["rev." + d]: v, ["why." + d]: why } : { ["rev." + d]: v });
          x.rev = Object.assign({}, x.rev, { [d]: v });
          b.closest("[data-day]").remove();
          toast(v === "a" ? t("approved") : t("rejected"));
        } catch (e) { busy(b, false); toast(failMsg(e)); }
      });
    }
    // góp ý
    try {
      const fq = await appRef(a.id).collection("feedback").get();
      const fbs = []; fq.forEach(d => fbs.push(Object.assign({ id: d.id }, d.data())));
      fbs.sort((p, q) => ms(q.createdAt) - ms(p.createdAt));
      const box = $("[data-fbs]", el);
      if (box) box.innerHTML = fbs.length ? fbs.map(f => `<div class="fb"><b>${esc(f.name)}</b> <span class="sub">· ${esc(ago(f.createdAt))}</span>
        <button class="link muted" style="float:right;padding:0;font-size:12px" data-rep="${esc(f.id)}">${esc(t("report"))}</button><p>${esc(f.text)}</p></div>`).join("")
        : `<p class="sub" style="margin:0">${esc(t("noFeedback"))}</p>`;
      $$("[data-rep]", el).forEach(b => b.onclick = () => report({ type: "feedback", appId: a.id, fbId: b.dataset.rep }));
    } catch (e) {}
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
  // Từ khóa nhận biết "đã là thành viên" / "chưa tham gia" trên trang Google Groups
  const MEMBER_KW = ["rời khỏi nhóm", "rời nhóm", "bạn là thành viên", "leave group", "you're a member", "you are a member",
    "gruppe verlassen", "abandonar grupo", "salir del grupo", "quitter le groupe", "sair do grupo", "abbandona gruppo",
    "покинуть группу", "gruptan ayrıl", "keluar dari grup", "keluar kumpulan", "umalis sa grupo", "退出群组", "退出群組",
    "グループを退会", "그룹 탈퇴", "समूह छोड़ें", "مغادرة المجموعة", "ออกจากกลุ่ม"];
  const JOIN_KW = ["tham gia nhóm", "join group", "ask to join group", "yêu cầu tham gia"];
  async function scanShot(kind, sh, since) {
    if (sh.at && since && sh.at < since - 5000) return { st: "fail", msg: t("scanOld") };
    const txt = await ocrImage(sh.key || sh.img);
    if (txt == null) return { st: "unsure" };
    const low = String(txt).toLowerCase().replace(/[’`]/g, "'"), flat = low.replace(/\s+/g, "");
    const words = low.replace(/\s+/g, " ").trim().length;
    if (kind === "group") {
      const has = flat.includes("12testersfree");
      if (MEMBER_KW.some(k => low.includes(k))) return has ? { st: "ok" } : { st: "fail", msg: t("scanNoGroup") };
      if (JOIN_KW.some(k => low.includes(k))) return { st: "fail", msg: t("scanNotMember") };
      if (has) return { st: "unsure" };
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

  function addAppPage(a) {
    const isNew = !a;
    a = a || { name: "", pkg: "", icon: "", instr: "", target: 12 };
    let icon = a.icon || "", countries = false;
    const since = Date.now();
    const gv = { st: LS.get(GV_KEY(), false) ? "done" : null, img: null }, cv = { st: null, img: null };
    const instr0 = a.instr || a.desc || "";
    page(isNew ? t("addApp") : t("edit"), `
      ${isNew ? `<div class="card pre">
        <h3>${esc(t("preTitle"))}</h3>
        <h4>1. ${esc(t("preJoin"))}</h4>
        <div id="pgroup"></div>
        <h4>2. ${esc(t("preConsole"))}</h4>
        <div class="warn">⚠️ ${esc(t("preWarn"))}</div>
        ${copyRowHtml()}
        <div class="btns"><button class="btn ghost" id="pconsole">${IC.ext} ${esc(t("goConsole"))}</button>
          <button class="btn" id="pguide">${IC.help} ${esc(t("guideBtn"))}</button></div>
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
      <div class="err" id="perr"></div>
      <button class="btn block" id="psave" style="padding:16px;font-size:16px">${esc(isNew ? t("addAppBtn") : t("save"))}</button>`,
    pg => {
      const okSt = v => v.st === "ok" || v.st === "unsure" || v.st === "done";
      const paintPre = () => {
        if (!isNew) return;
        $("#pgroup", pg).innerHTML = gv.st === "done"
          ? `<div class="okbox">${IC.check}<div>${esc(t("grpVerified"))}<small>${esc(CG.email)}</small></div></div>`
          : `<button class="btn block" id="pjoin">${esc(t("ob1Btn"))}</button>${vshotHtml("g", gv, t("grpShot"))}`;
        $("#pcon", pg).innerHTML = vshotHtml("c", cv, t("conShot"));
        const j = $("#pjoin", pg); if (j) j.onclick = () => openUrl(CG.link);
        $$("[data-v]", pg).forEach(b => b.onclick = async ev => {
          ev.stopPropagation();
          const k = b.dataset.v, v = k[0] === "g" ? gv : cv;
          if (k.endsWith("-del")) { v.img = null; v.st = null; paintPre(); return; }
          if (v.busy) return;
          const sh = await pickShot(); if (!sh) { toast(t("imgBad")); return; }
          v.img = sh.img; v.st = null; v.busy = true; paintPre();
          const r = await scanShot(k === "g" ? "group" : "console", sh, since);
          v.busy = false; v.st = r.st; v.msg = r.msg || "";
          if (k === "g" && r.st === "ok") LS.set(GV_KEY(), true);
          paintPre();
        });
      };
      if (isNew) {
        paintPre(); bindCopy(pg);
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
          const bad = !okSt(gv) ? ["errGrpShot", "#pgroup"] : !okSt(cv) ? ["errConShot", "#pcon"] : !countries ? ["errCountry", "#ptoggle"] : null;
          if (bad) { err.textContent = t(bad[0]); $(bad[1], pg).scrollIntoView({ behavior: "smooth", block: "center" }); return; }
          if (gv.st !== "done") setOnboarded();
        }
        if (!icon) { err.textContent = t("errIcon"); return; }
        if (!name) { err.textContent = t("errAppName"); return; }
        if (isNew && !isPkg(pkg)) { err.textContent = t("errPkg"); return; }
        if (instr.length < 5) { err.textContent = t("errInstr"); return; }
        err.textContent = ""; busy(ev.target, true);
        try {
          if (isNew) {
            const mine = await loadMine(true);
            if (mine.filter(x => x.active !== false).length >= 5) { err.textContent = t("maxApps"); busy(ev.target, false); return; }
            const dup = await db.collection("apps").where("pkg", "==", pkg).limit(1).get();
            if (!dup.empty) { err.textContent = t("errDupPkg"); busy(ev.target, false); return; }
            await db.collection("apps").add({
              ownerUid: S.user.uid, ownerName: S.me.name, ownerStars: S.me.stars || 0,
              name, pkg, icon, instr, target, mode: "community", active: true,
              testersCount: 0, feedbackCount: 0, createdAt: FV.serverTimestamp()
            });
          } else {
            await appRef(a.id).update({ name, icon, instr, target, ownerName: S.me.name });
          }
          closeAll(); toast(t("saved"));
          S.apps = null; S.mine = null; S.openMine = null;
          if (S.tab !== "home") go("home"); else renderTab();
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

  // ================================================================ yêu cầu test chéo
  const swapsCol = () => db.collection("swaps");
  async function loadSwaps() {
    const uid = S.user.uid;
    const [a, b] = await Promise.all([swapsCol().where("toUid", "==", uid).get(), swapsCol().where("fromUid", "==", uid).get()]);
    const list = [];
    a.forEach(d => list.push(Object.assign({ id: d.id, dir: "in" }, d.data())));
    b.forEach(d => list.push(Object.assign({ id: d.id, dir: "out" }, d.data())));
    S.swaps = list.filter(s => s.status === "pending" || s.status === "accepted" || (s.status === "declined" && s.dir === "out"));
    // bên gửi: được đồng ý thì cộng 1 lượt test chéo cho app của mình
    S.swaps.filter(s => s.dir === "out" && s.status === "accepted" && !s.fromCounted).forEach(s => {
      s.fromCounted = true;
      const bt = db.batch();
      bt.update(swapsCol().doc(s.id), { fromCounted: true });
      bt.update(appRef(s.fromAppId), { swapCount: FV.increment(1) });
      bt.commit().catch(() => {});
    });
    return S.swaps;
  }
  // app mà mình phải test trong 1 yêu cầu test chéo
  const swapTarget = s => s.dir === "in" ? { id: s.fromAppId, name: s.fromAppName, icon: s.fromIcon, who: s.fromName }
                                          : { id: s.toAppId, name: s.toAppName, icon: s.toIcon, who: s.toName };
  function swapFor(appId) { return (S.swaps || []).find(s => swapTarget(s).id === appId); }
  function swapAccepted(appId) { const s = swapFor(appId); return s && s.status === "accepted"; }

  // Danh sách việc cần làm (trang chủ + nhiệm vụ)
  function buildTodo() {
    const out = [], joined = S.joined || {}, seen = new Set();
    (S.swaps || []).forEach(s => {
      const tg = swapTarget(s);
      if (s.dir === "in" && s.status === "pending") out.push({ kind: "req", s, tg });
      else if (s.status === "accepted" && !joined[tg.id]) { out.push({ kind: "start", s, tg }); seen.add(tg.id); }
      else if (s.dir === "out" && s.status === "pending") { out.push({ kind: "wait", s, tg }); seen.add(tg.id); }
      else if (s.dir === "out" && s.status === "declined") out.push({ kind: "nope", s, tg });
    });
    const backers = new Set(); Object.values(S.mineT || {}).forEach(arr => arr.forEach(x => backers.add(x.uid)));
    (S.apps || []).filter(a => backers.has(a.ownerUid) && a.active !== false && !joined[a.id] && !seen.has(a.id))
      .forEach(a => out.push({ kind: "back", a, tg: { id: a.id, name: a.name, icon: a.icon, who: a.ownerName } }));
    const order = { req: 0, nope: 1, start: 2, back: 3, wait: 4 };
    return out.sort((x, y) => order[x.kind] - order[y.kind]);
  }
  function todoCardHtml(x, wide) {
    const ic = iconHtml({ icon: x.tg.icon, name: x.tg.name, pkg: x.tg.id }, "s");
    let title = "", sub = "", btns = "";
    if (x.kind === "req") {
      title = t("tdReqTitle", { name: x.s.fromName });
      sub = t("tdReqSub", { mine: x.s.toAppName, theirs: x.s.fromAppName });
      btns = `<button class="btn small ghost" data-td="decline" data-id="${esc(x.s.id)}">${esc(t("decline"))}</button>
              <button class="btn small green" data-td="accept" data-id="${esc(x.s.id)}">${esc(t("accept"))}</button>`;
    } else if (x.kind === "start") {
      title = t("tdStartTitle", { name: x.tg.who });
      sub = t("tdStartSub", { app: x.tg.name });
      btns = `<button class="btn small" data-td="open" data-app="${esc(x.tg.id)}">${esc(t("startTest"))}</button>`;
    } else if (x.kind === "nope") {
      title = t("tdNopeTitle", { name: x.tg.who || "" });
      sub = t("tdNopeSub", { why: x.s.reason || "–" });
      btns = `<button class="btn small ghost" data-td="gotit" data-id="${esc(x.s.id)}">${esc(t("gotIt"))}</button>`;
    } else if (x.kind === "back") {
      title = t("tdBackTitle", { name: x.tg.who });
      sub = t("tdBackSub", { app: x.tg.name });
      btns = `<button class="btn small amber" data-td="open" data-app="${esc(x.tg.id)}">↩ ${esc(t("testBack"))}</button>`;
    } else {
      title = t("tdWaitTitle", { name: x.tg.who });
      sub = t("tdWaitSub", { app: x.tg.name });
      btns = `<button class="btn small ghost" data-td="cancel" data-id="${esc(x.s.id)}">${esc(t("cancelReq"))}</button>`;
    }
    const tag = { req: `<span class="tag b">${esc(t("tgReq"))}</span>`, start: `<span class="tag g">${esc(t("tgSwap"))}</span>`,
      back: `<span class="tag a">${esc(t("tgBack"))}</span>`, nope: `<span class="tag r">${esc(t("tgNope"))}</span>`, wait: `<span class="tag m">${esc(t("tgWait"))}</span>` }[x.kind];
    return `<div class="acard tcard ${wide ? "" : "flat"}"><div class="top" style="align-items:flex-start">${ic}
      <div class="grow"><div class="head"><div class="name ell" style="font-size:15px">${esc(title)}</div></div>
      <div class="sub" style="margin-top:2px">${esc(sub)}</div><div style="margin-top:6px">${tag}</div></div></div>
      <div class="btns" style="margin-top:10px">${btns}</div></div>`;
  }
  function bindTodo(m) {
    $$("[data-td]", m).forEach(b => b.onclick = async ev => {
      ev.stopPropagation();
      const k = b.dataset.td;
      if (k === "open") { go("explore", { open: b.dataset.app }); return; }
      busy(b, true);
      try {
        if (k === "accept") {
          const sw = (S.swaps || []).find(z => z.id === b.dataset.id);
          const bt = db.batch();
          bt.update(swapsCol().doc(b.dataset.id), { status: "accepted", answeredAt: FV.serverTimestamp() });
          if (sw) bt.update(appRef(sw.toAppId), { swapCount: FV.increment(1) });
          await bt.commit(); toast(t("swapAccepted"));
        }
        else if (k === "decline") {
          const why = await askReason(t("declineTitle"), ["rsNotFit", "rsFull", "rsUnsafe", "rsOther"]);
          if (!why) { busy(b, false); return; }
          await swapsCol().doc(b.dataset.id).update({ status: "declined", reason: why, answeredAt: FV.serverTimestamp() }); toast(t("swapDeclined"));
        }
        else if (k === "gotit") { await swapsCol().doc(b.dataset.id).delete(); }
        else if (k === "cancel") { await swapsCol().doc(b.dataset.id).update({ status: "cancelled" }); toast(t("swapCancelled")); }
        renderTab();
      } catch (e) { busy(b, false); toast(failMsg(e)); }
    });
  }
  function swapSheet(a) {
    const mine = (S.mine || []).filter(x => x.active !== false);
    if (!mine.length) {
      sheet(`<h2>${esc(t("swapTitle"))}</h2><p class="sub">${esc(t("swapNeedApp"))}</p>
        <div class="btns"><button class="btn ghost" data-a="x">${esc(t("close"))}</button><button class="btn" data-a="add">＋ ${esc(t("addApp"))}</button></div>`,
        el => el.addEventListener("click", e => { const k = e.target.closest("[data-a]"); if (!k) return; closeTop(); if (k.dataset.a === "add") addAppPage(null); }));
      return;
    }
    let pick = mine[0].id;
    sheet(`<h2>${esc(t("swapTitle"))}</h2>
      <p class="sub" style="margin:0 0 10px">${esc(t("swapIntro", { name: a.ownerName || "", app: a.name }))}</p>
      <div class="sub" style="font-weight:700;color:var(--ink);margin-bottom:6px">${esc(t("swapPick"))}</div>
      <div id="swl">${mine.map(x => `<button class="stepbtn" data-pick="${esc(x.id)}">${iconHtml(x, "s")}<span class="grow">${esc(x.name)}</span><span class="n">✓</span></button>`).join("")}</div>
      <input id="swmsg" type="text" maxlength="200" placeholder="${esc(t("swapMsgPh"))}" style="margin-top:10px">
      <div class="btns"><button class="btn ghost" data-a="x">${esc(t("cancel"))}</button><button class="btn" id="swgo">${esc(t("swapSend"))}</button></div>`, el => {
      const paint = () => $$("[data-pick]", el).forEach(b => { const on = b.dataset.pick === pick; b.classList.toggle("ok", on); $(".n", b).style.visibility = on ? "visible" : "hidden"; });
      $$("[data-pick]", el).forEach(b => b.onclick = () => { pick = b.dataset.pick; paint(); });
      paint();
      $("[data-a=x]", el).onclick = closeTop;
      $("#swgo", el).onclick = async ev => {
        const my = mine.find(x => x.id === pick);
        busy(ev.target, true);
        try {
          await swapsCol().add({
            fromUid: S.user.uid, fromName: S.me.name, fromAppId: my.id, fromAppName: my.name, fromIcon: my.icon || "",
            toUid: a.ownerUid, toName: a.ownerName || "", toAppId: a.id, toAppName: a.name, toIcon: a.icon || "",
            msg: ($("#swmsg", el).value || "").trim().slice(0, 200), status: "pending", createdAt: FV.serverTimestamp()
          });
          closeTop(); toast(t("swapSent", { name: a.ownerName || "" }));
          await loadSwaps(); paintList();
        } catch (e) { busy(ev.target, false); toast(failMsg(e)); }
      };
    });
  }

  // ================================================================ TAB 2: Khám phá
  function sortApps(list) {
    const me = S.user.uid;
    return list.slice().sort((x, y) => {
      if ((x.ownerUid === me) !== (y.ownerUid === me)) return x.ownerUid === me ? 1 : -1;
      const fx = (x.testersCount || 0) >= (x.target || 12), fy = (y.testersCount || 0) >= (y.target || 12);
      if (fx !== fy) return fx ? 1 : -1;
      if (!fx && (y.ownerStars || 0) !== (x.ownerStars || 0)) return (y.ownerStars || 0) - (x.ownerStars || 0);
      return ms(y.createdAt) - ms(x.createdAt);
    });
  }
  async function renderExplore(m, opts) {
    if (opts && opts.open) { S.open = opts.open; S.q = ""; }
    if (!S.apps) spin(m);
    try { await Promise.all([loadApps(), loadJoined(), S.mine ? null : loadMine(), S.swaps ? null : loadSwaps()]); await loadTaskDocs(); }
    catch (e) { console.error(e); return failBox(m, () => renderExplore(m)); }
    if (S.tab !== "explore") return;
    const visible = S.apps.filter(a => a.active !== false);
    const latest = visible.slice(0, 6);
    m.innerHTML = header(t("exTitle"), t("exSub"),
      `<button class="rbtn g" id="xgroup">${IC.check}</button><button class="rbtn a" id="xhelp">?</button>`) + `
      <div class="search">${IC.search}<input id="xq" type="text" placeholder="${esc(t("searchPh"))}" value="${esc(S.q)}"></div>
      <div id="xlatest">${latest.length ? `<div class="sec"><h2>${esc(t("latest"))}</h2></div>
        <div class="carousel" id="xcar">${latest.map(a => appCard(a, true)).join("")}</div>
        <div class="dots" id="xdots">${latest.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>` : ""}</div>
      <div class="sec"><h2>${esc(t("allApps"))}</h2><span id="xcount"></span></div>
      <div id="xlist"></div>`;
    $("#xgroup").onclick = () => sheet(onboardHtml(true), bindOnboard);
    $("#xhelp").onclick = () => guideSheet("test");
    const car = $("#xcar");
    if (car) {
      car.onscroll = () => {
        const w = car.firstElementChild ? car.firstElementChild.offsetWidth + 12 : 1;
        const i = Math.round(Math.abs(car.scrollLeft) / w);
        $$("#xdots i").forEach((d, j) => d.classList.toggle("on", j === i));
      };
      $$("[data-app]", car).forEach(el => el.onclick = () => { S.open = el.dataset.app; S.q = ""; $("#xq").value = ""; paintList(true); });
    }
    const q = $("#xq");
    q.oninput = () => { S.q = q.value; $("#xlatest").classList.toggle("hidden", !!S.q.trim()); paintList(); };
    $("#xlatest").classList.toggle("hidden", !!S.q.trim());
    paintList(!!S.open);
  }
  function paintList(scroll) {
    const box = $("#xlist"); if (!box) return;
    const qq = S.q.trim().toLowerCase();
    let list = sortApps(S.apps.filter(a => a.active !== false));
    if (qq) list = list.filter(a => (a.name || "").toLowerCase().includes(qq) || (a.ownerName || "").toLowerCase().includes(qq) || (a.pkg || "").toLowerCase().includes(qq));
    $("#xcount").textContent = t("nApps", { n: list.length });
    box.innerHTML = list.length ? list.map(a => appCard(a, false)).join("")
      : `<div class="empty"><div class="big">🚀</div><p>${esc(qq ? t("noResult") : t("noApps"))}</p></div>`;
    $$("[data-c]", box).forEach(b => b.onclick = e => {
      e.stopPropagation();
      const id = b.closest("[data-app]").dataset.app, a = S.apps.find(x => x.id === id);
      if (b.dataset.c === "swap") return swapSheet(a);
      if (b.dataset.c === "open") { S.open = id; return paintList(true); }
      (joinState[id] || (joinState[id] = { mode: null })).mode = b.dataset.c === "solo" ? "solo" : "swap";
      S.open = id; paintList(true);
    });
    $$("[data-app]", box).forEach(el => el.addEventListener("click", e => {
      if (e.target.closest("[data-stop]")) return;
      S.open = S.open === el.dataset.app ? null : el.dataset.app;
      paintList();
    }));
    if (S.open) {
      const el = $(`[data-app="${S.open}"]`, box);
      const a = S.apps.find(x => x.id === S.open);
      if (el && a) { bindExpanded(el, a); if (scroll) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 60); }
    }
  }
  function backedMe(a) {
    return Object.values(S.mineT || {}).some(arr => arr.some(x => x.uid === a.ownerUid));
  }
  function daysUp(a) { const c = ms(a.createdAt); return c ? Math.max(1, diffDays(dstr(new Date(c)), today()) + 1) : 1; }
  function statsHtml(a) {
    const n = a.testersCount || 0, target = a.target || 12;
    return `<div class="stats">
      <span title="${esc(t("stInstalled"))}" class="${n >= target ? "full" : ""}">${IC.dl}<b>${n}</b>/${target}</span>
      <span title="${esc(t("stSwaps"))}">${IC.swap}<b>${a.swapCount || 0}</b></span>
      <span title="${esc(t("stDays"))}">${IC.cal}<b>${daysUp(a)}</b></span></div>`;
  }
  function appCard(a, mini) {
    const mine = a.ownerUid === S.user.uid, joined = S.joined && S.joined[a.id];
    const sw = swapFor(a.id);
    const open = !mini && S.open === a.id;
    const showActs = !mini && !mine && !joined;
    const tag = mine ? `<span class="tag m">${esc(t("yours"))}</span>`
      : joined ? `<span class="tag g">${esc(t(joined.mode === "swap" ? "swapDone" : "testing"))}</span>`
      : mini && sw && sw.status === "accepted" ? `<span class="tag g">${esc(t("swapDone"))}</span>`
      : mini && sw ? `<span class="tag m">${esc(t("tgWait"))}</span>`
      : issList(a).length >= 2 ? `<span class="tag r">⚠ ${esc(t("tgIssue"))}</span>`
      : backedMe(a) ? `<span class="tag a">${esc(t("testedYou"))}</span>` : "";
    // nút test chéo: chưa kết nối → gửi yêu cầu; đang chờ; đã kết nối → đã test chéo
    const swBtn = !sw ? `<button class="act sw1" data-c="swap">⇄ ${esc(t("swapTitle"))}</button>`
      : sw.status === "accepted" ? `<button class="act ok" data-c="go">✓ ${esc(t("swapDone"))}</button>`
      : `<button class="act wait" data-c="open">⏳ ${esc(t("tgWait"))}</button>`;
    const acts = showActs ? `<div class="acts">${swBtn}
        ${sw && sw.status === "accepted" ? "" : `<button class="act solo" data-c="solo">▶ ${esc(t("soloTitle"))}</button>`}</div>` : "";
    return `<div class="acard ${open ? "open" : ""}" data-app="${esc(a.id)}">
      <div class="top">${iconHtml(a)}
        <div class="grow">
          <div class="head"><div class="name ell">${esc(a.name)}</div>${tag}</div>
          <div class="meta"><span class="chip">${esc(a.ownerName || "")}</span><span style="display:inline-flex;align-items:center;gap:3px">${starTxt(a.ownerStars)}</span></div>
          ${statsHtml(a)}
        </div>${acts}</div>
      ${open ? `<div class="xp" data-stop>${expandedHtml(a)}</div>` : ""}
    </div>`;
  }

  // ---- bằng chứng test: cài từ Play → dùng ≥15 giây → ảnh chụp sau đó
  const USE_MS = 15000;
  const MAX_SHOTS = 3;
  const proofs = {}; // appId -> {day, inst, openAt, leftAt, used, imgs:[{img,at}], note}
  let away = null;    // {id, repaint}
  function proof(id) {
    let p = proofs[id];
    if (!p || p.day !== today()) p = proofs[id] = { day: today(), inst: p ? p.inst : false, openAt: 0, leftAt: 0, used: 0, imgs: [], note: p ? p.note : "" };
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
  async function takeShot(p, repaint) {
    if (p.imgs.length >= MAX_SHOTS) return toast(t("max3"));
    const sh = await pickShot(); if (!sh) { toast(t("imgBad")); return; }
    const bad = shotProblem(sh, p);
    if (bad) { sheet(`<h3>📷 ${esc(t("shotBadTitle"))}</h3><p class="sub">${esc(bad)}</p><button class="btn block" data-close>${esc(t("close"))}</button>`, el => $("[data-close]", el).onclick = closeTop); return; }
    p.imgs.push({ img: sh.img, at: sh.at }); repaint();
  }
  function installStepHtml(a, p) {
    if (p.inst) return `<div class="stepbtn ok"><span class="n">✓</span><span class="grow">${esc(t("stepInstall"))}<small class="ss">${esc(t("instOk"))}</small></span></div>`;
    const iss = (a.issues || {})[S.user.uid];
    return `<div class="stepbox"><div class="row"><span class="n">1</span><div class="grow"><b>${esc(t("stepInstall"))}</b><small class="ss">${esc(t("instHint"))}</small></div></div>
      <div class="btns"><button class="btn small ghost" data-x="gplay">${IC.ext} Google Play</button><button class="btn small green" data-x="inst">✓ ${esc(t("instDone"))}</button></div>
      ${iss ? `<div class="issme">⚠ ${esc(t("issSent", { r: t(iss.r) }))}</div>` : `<button class="link muted" data-x="cant" style="display:block;margin:8px auto 0">${esc(t("cantInstall"))}</button>`}</div>`;
  }
  function useStepHtml(n, p, attr, locked) {
    const ok = p.used >= USE_MS, left = Math.ceil((USE_MS - p.used) / 1000);
    const sub = ok ? t("usedSec", { s: Math.floor(p.used / 1000) }) : locked ? t("doStepBefore") : p.used ? t("useMore", { s: left }) : t("useHint");
    return `<button class="stepbtn ${ok ? "ok" : ""} ${locked ? "lock" : ""}" ${attr}="use"><span class="n">${ok ? "✓" : n}</span>
      <span class="grow">${esc(t("stepUse"))}<small class="ss">${esc(sub)}</small></span>
      ${ok ? "" : `<span class="pill">▶ ${esc(t("openBtn"))}</span>`}</button>`;
  }
  function shotStepHtml(n, p, attr, locked) {
    const has = p.imgs.length;
    const sub = has ? t(has >= MAX_SHOTS ? "shotsFull" : "shotsN", { n: has, m: MAX_SHOTS }) : locked ? t("shotLocked") : t("shotHint");
    return `<div class="stepbtn ${has ? "ok" : ""} ${locked ? "lock" : ""}" ${attr}="shot"><span class="n">${has ? "✓" : n}</span>
      <span class="grow">${esc(t("stepShot2"))}<small class="ss">${esc(sub)}</small></span>
      ${has ? `<span class="thumbs">${p.imgs.map((x, i) => `<span class="thumbw sm"><img class="thumb" src="${x.img}" alt=""><button class="thx" ${attr}="del" data-i="${i}">✕</button></span>`).join("")}${has < MAX_SHOTS ? `<span class="addth">+</span>` : ""}</span>` : `<span class="sub">${IC.cam}</span>`}</div>
      <textarea class="dnote" maxlength="200" rows="2" placeholder="${esc(t("notePh2"))}" ${locked ? "disabled" : ""}>${esc(p.note || "")}</textarea>`;
  }
  // xử lý chung cho bước "dùng" + "ảnh" (Khám phá & Nhiệm vụ)
  function dayDoc(p) {
    return { img: p.imgs[0].img, more: p.imgs.slice(1).map(x => x.img), note: String(p.note || "").trim().slice(0, 200),
      used: Math.floor(p.used / 1000), shotAt: Math.max.apply(null, p.imgs.map(x => x.at || 0)), at: FV.serverTimestamp() };
  }
  async function proofAction(k, id, pkg, p, repaint, needInst, idx) {
    if (k === "use") { if (needInst && !p.inst) return toast(t("doStepBefore")); startUse(id, pkg, repaint); }
    else if (k === "shot") { if (p.used < USE_MS) return toast(t("shotLocked")); await takeShot(p, repaint); }
    else if (k === "del") { p.imgs.splice(+idx || 0, 1); repaint(); }
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

  const joinState = {}; // appId -> {mode}
  function expandedHtml(a) {
    const n = a.testersCount || 0, target = a.target || 12;
    const mine = a.ownerUid === S.user.uid, joined = S.joined && S.joined[a.id];
    const st = joinState[a.id] || (joinState[a.id] = { mode: null });
    const sw = swapFor(a.id);
    if (sw && sw.status === "accepted" && !st.mode) st.mode = "swap";
    const top = `<div class="row" style="margin-bottom:10px">
        <div class="grow"><div class="bar ${n >= target ? "full" : ""}"><i style="width:${Math.max(3, Math.min(100, n / target * 100))}%"></i></div></div>
        <div class="iconbtns"><button class="ibtn" data-x="share">${IC.share}</button>${mine ? "" : `<button class="ibtn r" data-x="report">${IC.flag}</button>`}</div></div>
      ${a.instr || a.desc ? `<div class="instr">${IC.info}<div>${esc(a.instr || a.desc)}</div></div>` : ""}`;
    if (mine) return top + `<button class="btn block ghost" style="margin-top:12px" data-x="home">${esc(t("yourApp"))}</button>`;
    if (joined) return top + dailyPanelHtml(S.joined[a.id], "x");
    if (sw && sw.status === "pending" && sw.dir === "out")
      return top + `<div class="okbox wait" style="margin-top:12px">⏳<div>${esc(t("tdWaitTitle", { name: a.ownerName || "" }))}<small>${esc(t("swapWaitHint"))}</small></div></div>
        <button class="btn block ghost" style="margin-top:8px" data-x="cancel" data-id="${esc(sw.id)}">${esc(t("cancelReq"))}</button>`;
    if (!st.mode) return top;
    const p = proof(a.id), used = p.used >= USE_MS;
    return top + `
      ${st.mode === "swap" ? `<div class="hint" style="margin-top:10px">🔁 ${esc(t("swapOkHint", { name: a.ownerName || "" }))}</div>` : ""}
      ${installStepHtml(a, p)}
      ${useStepHtml(2, p, "data-x", !p.inst)}
      ${shotStepHtml(3, p, "data-x", !used)}
      <button class="btn block green" style="margin-top:12px" data-x="done" ${p.inst && used && p.imgs.length ? "" : "disabled"}>${esc(t("confirmTested", { p: ST.join }))}</button>
      ${st.mode === "solo" ? `<button class="link muted" data-x="back" style="display:block;margin:6px auto 0">${esc(t("back"))}</button>` : ""}`;
  }
  function bindExpanded(el, a) {
    if (S.joined && S.joined[a.id]) { bindDaily(el, S.joined[a.id], () => paintList()); }
    $$("[data-x]", el).forEach(b => b.onclick = async ev => {
      ev.stopPropagation();
      const k = b.dataset.x, st = joinState[a.id];
      if (k === "share") { const txt = t("shareText", { name: a.name }) + "\n" + optinUrl(a.pkg); if (A) A.share(txt); else copyText(txt).then(() => toast(t("copied"))); }
      else if (k === "report") report({ type: "app", appId: a.id });
      else if (k === "home") go("home");
      else if (k === "solo") { st.mode = "solo"; paintList(); }
      else if (k === "swap") swapSheet(a);
      else if (k === "back") { st.mode = null; paintList(); }
      else if (k === "cancel") { try { await swapsCol().doc(b.dataset.id).update({ status: "cancelled" }); await loadSwaps(); paintList(); } catch (e) { toast(failMsg(e)); } }
      else if (k === "gplay") openUrl(optinUrl(a.pkg));
      else if (k === "inst") {
        const s2 = installState(a.pkg), p = proof(a.id);
        if (!s2.installed) toast(t("instNo"));
        else if (!s2.fromPlay) toast(t("instNotPlay"));
        else {
          p.inst = true; paintList();
          if ((a.issues || {})[S.user.uid]) {   // cài được rồi → tự gỡ báo lỗi của mình
            appRef(a.id).update({ ["issues." + S.user.uid]: FV.delete() }).then(() => { delete a.issues[S.user.uid]; paintList(); }).catch(() => {});
          }
        }
      }
      else if (k === "cant") cantInstallSheet(a, () => paintList());
      else if (k === "use" || k === "shot" || k === "del") {
        if (k === "shot" && ev.target.closest("[data-x=del]")) return;
        proofAction(k, a.id, a.pkg, proof(a.id), () => paintList(), true, b.dataset.i);
      }
      else if (k === "done") doJoin(a, b);
    });
    const nt = $(".dnote", el); if (nt && !(S.joined && S.joined[a.id])) nt.oninput = () => proof(a.id).note = nt.value;
  }

  async function doJoin(a, btn) {
    if (!isGmail(S.me.testerEmail || "")) { toast(t("needGmail")); go("me"); editProfile(); return; }
    const st = joinState[a.id] || {}, p = proof(a.id);
    if (!p.inst || p.used < USE_MS || !p.imgs.length) return;
    busy(btn, true);
    const uid = S.user.uid, day = today();
    try {
      const b = db.batch();
      b.set(testerRef(a.id, uid), { uid, name: S.me.name, email: S.me.testerEmail, joinedAt: FV.serverTimestamp(), joinDay: day, sub: { [day]: true }, rev: {} });
      b.set(testerRef(a.id, uid).collection("days").doc(day), dayDoc(p));
      b.set(userRef().collection("joined").doc(a.id), {
        appId: a.id, name: a.name, pkg: a.pkg, icon: a.icon || "", ownerUid: a.ownerUid, ownerName: a.ownerName || "",
        joinedAt: FV.serverTimestamp(), joinDay: day, fbGiven: false, bonus: false, mode: st.mode || "solo"
      });
      b.update(appRef(a.id), { testersCount: FV.increment(1) });
      const ns = await addStarsTo(b, ST.join);
      await b.commit();
      gotStars(ns);
      a.testersCount = (a.testersCount || 0) + 1;
      S.joined[a.id] = { id: a.id, appId: a.id, name: a.name, pkg: a.pkg, icon: a.icon, ownerUid: a.ownerUid, ownerName: a.ownerName, joinDay: day, fbGiven: false, mode: st.mode };
      S.tdocs[a.id] = { joinDay: day, sub: { [day]: true }, rev: {} };
      delete joinState[a.id]; delete proofs[a.id];
      const r = getReminder(); if (!r.set) applyReminder({ on: true, time: r.time || "20:00", set: true });
      toast(t("joinedOk"));
      paintList();
    } catch (e) { busy(btn, false); toast(failMsg(e)); }
  }

  function report(info) {
    ask(t("reportAsk"), t("report"), true).then(async ok => {
      if (!ok) return;
      try { await db.collection("reports").add(Object.assign({ by: S.user.uid, createdAt: FV.serverTimestamp() }, info)); toast(t("reportOk")); }
      catch (e) { toast(failMsg(e)); }
    });
  }

  // ================================================================ Bảng việc hằng ngày (dùng ở Khám phá và Nhiệm vụ)
  function dailyPanelHtml(j, pfx) {
    const info = dayInfo(S.tdocs[j.id]);
    const p = proof(j.id), used = p.used >= USE_MS;
    const pair = pairInfo(j);
    return `
      <div class="row" style="margin-top:12px"><b class="grow">${esc(info.finished ? t("days14") : t("dayOf", { d: info.cur }))}</b>
        ${info.finished ? "" : `<span class="timer">⏱ ${esc(untilMidnight())}</span>`}</div>
      ${pair ? `<div class="dual">
          <div class="drow"><span class="who">${esc(t("you"))}</span>${daysStrip(info)}<b>${info.done}/14</b></div>
          <div class="drow"><span class="who ell">${esc(j.ownerName || "")}</span>${daysStrip(pair)}<b>${pair.done}/14</b></div>
          ${legend()}</div>`
        : `${daysStrip(info)}
      <div class="duo"><div class="y"><b>${info.done}/14</b><small>${esc(t("youTested"))}</small></div>
        <div class="t"><b>–</b><small>${esc(t("theyTested"))}</small></div></div>`}
      ${rejectNote(S.tdocs[j.id])}
      ${info.finished ? "" : info.todayDone
        ? `<div class="okbox" style="margin-top:12px">${IC.check}<div>${esc(t("todaySent"))}<small>${esc(t("comeBack"))}</small></div></div>`
        : `<div class="sub" style="margin-top:12px;font-weight:700;color:var(--ink)">${esc(t("todayJobs"))}</div>
          ${useStepHtml(1, p, "data-d", false)}
          ${shotStepHtml(2, p, "data-d", !used)}
          <button class="btn block green" style="margin-top:10px" data-d="submit" ${used && p.imgs.length ? "" : "disabled"}>${esc(t("submitDay", { p: ST.day }))}</button>`}
      <div class="btns"><button class="btn ghost small" data-d="fb">💬 ${esc(t("feedback"))}</button>
        <button class="btn ghost small" data-d="play">${esc(t("openPlay"))}</button>
        <button class="btn ghost small" data-d="more" style="flex:0 0 46px">⋯</button></div>`;
  }
  function rejectNote(td) {
    const why = (td && td.why) || {}, rev = (td && td.rev) || {};
    const d = Object.keys(why).filter(k => rev[k] === "r").sort().pop();
    if (!d) return "";
    const idx = diffDays(td.joinDay || d, d) + 1;
    return `<div class="issme">✗ ${esc(t("rejectedDay", { d: idx }))}: ${esc(why[d])}</div>`;
  }
  function bindDaily(el, j, repaint) {
    const nt = $(".dnote", el); if (nt) nt.oninput = () => proof(j.id).note = nt.value;
    $$("[data-d]", el).forEach(b => b.onclick = async ev => {
      ev.stopPropagation();
      const k = b.dataset.d;
      if (k === "use" || k === "shot" || k === "del") {
        if (k === "shot" && ev.target.closest("[data-d=del]")) return;
        if (k === "use" && A && A.isInstalled && !A.isInstalled(j.pkg)) return toast(t("instNo"));
        proofAction(k, j.id, j.pkg, proof(j.id), repaint, false, b.dataset.i);
      }
      else if (k === "submit") submitDay(j, b, repaint);
      else if (k === "play") openUrl(optinUrl(j.pkg));
      else if (k === "fb") feedbackSheet(j);
      else if (k === "more") moreTask(j);
    });
  }
  async function submitDay(j, btn, repaint) {
    const day = today(), p = proof(j.id); if (!p.imgs.length || p.used < USE_MS) return;
    busy(btn, true);
    try {
      const b = db.batch();
      b.set(testerRef(j.id, S.user.uid).collection("days").doc(day), dayDoc(p));
      b.update(testerRef(j.id, S.user.uid), { ["sub." + day]: true });
      const ns = await addStarsTo(b, ST.day);
      await b.commit();
      gotStars(ns);
      S.tdocs[j.id].sub = Object.assign({}, S.tdocs[j.id].sub, { [day]: true });
      delete proofs[j.id];
      toast(t("daySent", { p: ST.day }));
      repaint();
      cleanupOld(j);
    } catch (e) { busy(btn, false); toast(failMsg(e)); }
  }

  // ================================================================ TAB 3: Nhiệm vụ
  async function loadTaskDocs(force) {
    const ids = Object.keys(S.joined || {});
    await Promise.all(ids.map(async id => {
      if (!force && S.tdocs[id]) return;
      try { const s = await testerRef(id, S.user.uid).get(); S.tdocs[id] = s.exists ? s.data() : null; }
      catch (e) { S.tdocs[id] = null; }
    }));
  }
  async function renderTasks(m) {
    if (!S.joined) spin(m);
    try {
      await Promise.all([loadJoined(true), loadApps(), S.mine ? null : loadMine(), loadSwaps()]);
      await Promise.all([loadTaskDocs(true), loadMineTesters()]);
    } catch (e) { console.error(e); return failBox(m, () => renderTasks(m)); }
    if (S.tab !== "tasks") return;
    const todoT = [], doneT = [], finished = [], gone = [];
    Object.values(S.joined).forEach(j => {
      const td = S.tdocs[j.id];
      if (!td) { gone.push(j); return; }
      const i = dayInfo(td);
      (i.finished ? finished : i.todayDone ? doneT : todoT).push(j);
    });
    const extra = buildTodo().filter(x => x.kind !== "wait");
    const waits = buildTodo().filter(x => x.kind === "wait");
    const nTodo = todoT.length + extra.length;
    const dot = $("#taskdot"); if (dot) dot.classList.toggle("hidden", !nTodo);

    m.innerHTML = header(t("tasksTitle"), t("tasksSub"), `<span class="starpill mystars">${starTxt(S.me.stars)}</span>`) +
      `<div class="sec"><h2>🔔 ${esc(t("todoNow"))}</h2><span>${nTodo}</span></div>` +
      (nTodo ? extra.map(x => todoCardHtml(x, false)).join("") + todoT.map(j => taskCard(j)).join("")
        : `<div class="card empty" style="padding:18px">✅ ${esc(t("allDone"))}</div>`) +
      (doneT.length ? `<div class="sec"><h2>✓ ${esc(t("doneToday"))}</h2><span>${doneT.length}</span></div>` + doneT.map(j => taskCard(j)).join("") : "") +
      (waits.length ? `<div class="sec"><h2>⏳ ${esc(t("waiting"))}</h2><span>${waits.length}</span></div>` + waits.map(x => todoCardHtml(x, false)).join("") : "") +
      (finished.length ? `<div class="sec"><h2>🏁 ${esc(t("doneTests"))}</h2><span>${finished.length}</span></div>` + finished.map(j => taskCard(j, true)).join("") : "") +
      (gone.length ? `<div class="sec"><h2>${esc(t("goneTests"))}</h2></div>` + gone.map(j => `<div class="acard"><div class="top">${iconHtml(j, "s")}<div class="grow"><div class="name ell" style="font-size:15px">${esc(j.name)}</div><div class="sub">${esc(t("goneHint"))}</div></div><button class="btn small ghost" data-rm="${esc(j.id)}">${esc(t("remove"))}</button></div></div>`).join("") : "") +
      (!Object.keys(S.joined).length && !extra.length ? `<div class="empty"><div class="big">🧪</div><p>${esc(t("tasksEmpty"))}</p><button class="btn" id="goex">${esc(t("tabExplore"))}</button></div>` : "");
    const ge = $("#goex"); if (ge) ge.onclick = () => go("explore");
    bindTodo(m);
    $$("[data-rm]", m).forEach(b => b.onclick = async () => { try { await userRef().collection("joined").doc(b.dataset.rm).delete(); renderTasks(m); } catch (e) { toast(failMsg(e)); } });
    $$("[data-task]", m).forEach(el => el.addEventListener("click", e => {
      if (e.target.closest("[data-stop]")) return;
      S.openTask = S.openTask === el.dataset.task ? null : el.dataset.task; renderTasks(m);
    }));
    if (S.openTask) { const el = $(`[data-task="${S.openTask}"]`, m); if (el && S.joined[S.openTask]) bindDaily(el, S.joined[S.openTask], () => renderTasks($("#main"))); }
    claimBonuses(finished);
  }
  function pairInfo(j) {
    let best = null;
    Object.values(S.mineT || {}).forEach(arr => arr.forEach(x => { if (x.uid === j.ownerUid) { const i = dayInfo(x); if (!best || i.done > best.done) best = i; } }));
    return best;
  }
  function taskCard(j, finished) {
    const td = S.tdocs[j.id], info = dayInfo(td), open = S.openTask === j.id;
    return `<div class="acard ${open ? "open" : ""}" data-task="${esc(j.id)}">
      <div class="top">${iconHtml(j)}
        <div class="grow">
          <div class="head"><div class="name ell">${esc(j.name)}</div>
            ${finished ? `<span class="tag g">${esc(t("finished"))}</span>` : info.todayDone ? `<span class="tag g">✓ ${esc(t("todayOk"))}</span>` : `<span class="tag a">${esc(t("todayTodo"))}</span>`}</div>
          <div class="cnt">${esc(finished ? t("days14") : t("dayOf", { d: info.cur }))}${finished ? "" : ` · <span class="timer">${esc(untilMidnight())}</span>`}</div>
          ${daysStrip(info)}
        </div></div>
      ${open ? `<div class="xp" data-stop>${dailyPanelHtml(j, "t")}</div>` : ""}
    </div>`;
  }
  // xóa ảnh cũ hơn 16 ngày để tiết kiệm dung lượng
  async function cleanupOld(j) {
    try {
      const td = S.tdocs[j.id]; const limit = addDays(today(), -16);
      const old = Object.keys(td.sub || {}).filter(d => d < limit);
      if (!old.length) return;
      const b = db.batch(); old.forEach(d => b.delete(testerRef(j.id, S.user.uid).collection("days").doc(d))); await b.commit();
    } catch (e) {}
  }
  async function claimBonuses(done) {
    for (const j of done) {
      if (j.bonus) continue;
      const info = dayInfo(S.tdocs[j.id]);
      if (info.done < 10) continue;
      try {
        const b = db.batch();
        b.update(userRef().collection("joined").doc(j.id), { bonus: true });
        const ns = await addStarsTo(b, ST.finish);
        await b.commit(); j.bonus = true; gotStars(ns); toast(t("bonusOk", { p: ST.finish }));
      } catch (e) {}
    }
  }
  function feedbackSheet(j) {
    sheet(`<h2>💬 ${esc(t("feedback"))} · ${esc(j.name)}</h2>
      <textarea id="fbt" maxlength="1000" placeholder="${esc(t("feedbackPh"))}"></textarea>
      <div class="hint">${esc(t("playFbHint"))}</div>
      <div class="btns"><button class="btn" id="fbs">${esc(t("sendFeedback"))}${j.fbGiven ? "" : ` (+${ST.feedback}⭐)`}</button></div>`, el => {
      $("#fbs", el).onclick = async ev => {
        const text = $("#fbt", el).value.trim();
        if (text.length < 15) { toast(t("feedbackShort")); return; }
        busy(ev.target, true);
        try {
          const b = db.batch();
          b.set(appRef(j.id).collection("feedback").doc(), { uid: S.user.uid, name: S.me.name, text, createdAt: FV.serverTimestamp() });
          b.update(appRef(j.id), { feedbackCount: FV.increment(1) });
          let ns;
          if (!j.fbGiven) { b.update(userRef().collection("joined").doc(j.id), { fbGiven: true }); ns = await addStarsTo(b, ST.feedback); }
          await b.commit();
          if (!j.fbGiven) { j.fbGiven = true; gotStars(ns); }
          closeTop(); toast(t("feedbackOk"));
        } catch (e) { busy(ev.target, false); toast(failMsg(e)); }
      };
    });
  }
  function moreTask(j) {
    sheet(`<h2>${esc(j.name)}</h2>
      <div class="btns" style="flex-direction:column">
        <button class="btn ghost" data-a="play">${esc(t("openPlay"))}</button>
        <button class="btn red" data-a="leave">${esc(t("leave"))}</button>
      </div>`, el => el.addEventListener("click", async e => {
      const a = e.target.closest("[data-a]"); if (!a) return;
      if (a.dataset.a === "play") openUrl(playUrl(j.pkg));
      else if (await ask(t("leaveAsk"), t("leave"), true)) { closeAll(); await leaveApp(j); S.openTask = null; renderTab(); }
    }));
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

  // ================================================================ TAB 4: Cá nhân
  function getReminder() { return LS.get("reminder", { on: false, time: "20:00", set: false }); }
  function applyReminder(r) {
    LS.set("reminder", r);
    const [h, mi] = (r.time || "20:00").split(":").map(Number);
    if (A && A.setReminder) A.setReminder(!!r.on, h || 20, mi || 0, t("reminderTitle"), t("reminderBody"));
  }
  function setupNotify() {
    if (!(A && A.setNotify)) return;
    A.setNotify(JSON.stringify({
      uid: S.user.uid, apiKey: FIREBASE_CONFIG.apiKey, projectId: FIREBASE_CONFIG.projectId,
      newApps: t("nfNewApps"), newTester: t("nfNewTester"), newFb: t("nfNewFb"), title: "12 Testers Free"
    }));
    const r = getReminder(); if (r.on) applyReminder(r);
  }
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
          (S.mine || []).forEach(a => b.update(appRef(a.id), { ownerName: name }));
          await b.commit();
          S.me.name = name; S.me.testerEmail = mail; closeTop(); toast(t("saved")); if (S.tab === "me") renderTab();
        } catch (e) { err.textContent = failMsg(e); busy(ev.target, false); }
      };
    });
  }
  function renderMe(m) {
    const r = getReminder();
    m.innerHTML = header(t("tabMe"), "", `<span class="starpill mystars">${starTxt(S.me.stars)}</span>`) + `
      <div class="card"><div class="prow">
        <div class="avatar">${esc((S.me.name || "?")[0].toUpperCase())}</div>
        <div class="grow"><div class="title ell">${esc(S.me.name)}</div><div class="sub ell">${esc(S.me.testerEmail || S.user.email || "")}</div></div>
        <button class="ibtn" id="medit">${IC.edit}</button></div></div>
      <div class="card" style="padding:4px 14px">
        <div class="mi"><div class="grow"><b>🌐 ${esc(t("langL"))}</b></div>
          <select id="mlang"><option value="auto">${esc(t("langAuto"))}</option>${Object.keys(LANG_NAMES).map(k => `<option value="${k}">${esc(LANG_NAMES[k])}</option>`).join("")}</select></div>
        <div class="mi" id="mrem"><div class="grow"><b>⏰ ${esc(t("reminderL"))}</b></div><div class="sw ${r.on ? "on" : ""}" id="msw"></div></div>
        <div class="mi ${r.on ? "" : "hidden"}" id="mremt"><div class="grow"><b>${esc(t("reminderTime"))}</b></div><input type="time" id="mtime" value="${esc(r.time || "20:00")}"></div>
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
      const cur = getReminder(); const nr = Object.assign({}, cur, { on: !cur.on, set: true });
      applyReminder(nr); $("#msw").classList.toggle("on", nr.on); $("#mremt").classList.toggle("hidden", !nr.on);
    };
    $("#mtime").onchange = e => applyReminder(Object.assign({}, getReminder(), { time: e.target.value || "20:00", set: true }));
    $$("[data-m]", m).forEach(el => el.onclick = () => {
      const k = el.dataset.m;
      if (k === "post") slideGuide(); else if (k === "test") guideSheet("test");
      else if (k === "group") sheet(onboardHtml(true), bindOnboard);
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
      applyReminder({ on: false, time: getReminder().time, set: true });
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
