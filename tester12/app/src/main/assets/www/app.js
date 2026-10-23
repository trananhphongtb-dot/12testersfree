/* 12 Testers Free — giao diện chính */
(function () {
  "use strict";

  // ---------------------------------------------------------------- helpers
  const $ = (s, el) => (el || document).querySelector(s);
  const A = window.Android || null;
  const P = window.POINTS;
  const root = $("#root"), layer = $("#layer");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function fmt(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars ? vars[k] : "{" + k + "}"));
  }
  let LANG = "vi";
  function t(k, vars) {
    const d = I18N[LANG] || I18N.vi;
    return fmt(d[k] != null ? d[k] : (I18N.vi[k] != null ? I18N.vi[k] : k), vars);
  }
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function ms(ts) {
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === "number") return ts;
    return 0;
  }
  function ago(ts) {
    const m = ms(ts); if (!m) return "";
    const n = Math.floor((Date.now() - m) / 86400000);
    return n <= 0 ? t("today") : t("daysAgo", { n });
  }
  const COLORS = ["#0F766E", "#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#059669", "#0891B2", "#4F46E5", "#B45309"];
  function colorFor(s) {
    let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return COLORS[h % COLORS.length];
  }
  function icon(name, pkg) {
    const ch = (String(name).trim()[0] || "?").toUpperCase();
    return `<div class="appicon" style="background:${colorFor(pkg || name)}">${esc(ch)}</div>`;
  }
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg; el.classList.remove("hidden");
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.add("hidden"), 2600);
  }
  function openUrl(u) { if (A) A.openUrl(u); else window.open(u, "_blank"); }
  const optinUrl = pkg => "https://play.google.com/apps/testing/" + pkg;
  const playUrl = pkg => "https://play.google.com/store/apps/details?id=" + pkg;
  const isGmail = e => /^[a-z0-9._%+-]+@(gmail|googlemail)\.com$/i.test(String(e).trim());
  const isPkg = p => /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(p);
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
      ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (_) {}
      ta.remove(); return ok;
    }
  }
  function busy(btn, on) { if (btn) btn.disabled = !!on; }

  // Chọn ảnh chụp màn hình rồi nén thành JPEG nhỏ (< ~250 KB) để lưu thẳng vào Firestore
  // (Firebase Storage giờ cần gói trả phí nên không dùng).
  function pickImage() {
    return new Promise(resolve => {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*";
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        if (!f) return resolve(null);
        const img = new Image();
        img.onload = () => {
          let maxSide = 1280, q = 0.6, out = "";
          for (let i = 0; i < 6; i++) {
            const k = Math.min(1, maxSide / Math.max(img.width, img.height));
            const c = document.createElement("canvas");
            c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            out = c.toDataURL("image/jpeg", q);
            if (out.length < 250000) break;
            maxSide = Math.round(maxSide * 0.8); q = Math.max(0.4, q - 0.05);
          }
          URL.revokeObjectURL(img.src);
          resolve(out.length < 290000 ? out : null);
        };
        img.onerror = () => resolve(null);
        img.src = URL.createObjectURL(f);
      };
      inp.click();
    });
  }
  function proofPicker(el, onPick) {
    const box = $(".proofbox", el);
    $(".proofbtn", el).onclick = async () => {
      const data = await pickImage();
      if (!data) { toast(t("proofBad")); return; }
      box.innerHTML = `<img class="proofimg" src="${data}" alt="">`;
      onPick(data);
    };
  }

  // ---------------------------------------------------------------- overlays
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
  function closeTop() { const ov = stack.pop(); if (ov) ov.remove(); }
  function closeAll() { while (stack.length) closeTop(); }
  function ask(message, okLabel, danger) {
    return new Promise(res => {
      sheet(`<p style="font-size:16px;margin:8px 0 4px">${esc(message)}</p>
        <div class="btns"><button class="btn ghost" data-a="no">${esc(t("cancel"))}</button>
        <button class="btn ${danger ? "danger" : ""}" data-a="yes">${esc(okLabel || t("confirm"))}</button></div>`,
        el => el.addEventListener("click", e => {
          const a = e.target.closest("[data-a]"); if (!a) return;
          closeTop(); res(a.dataset.a === "yes");
        }));
    });
  }
  window.onAndroidBack = function () {
    if (stack.length) { closeTop(); return true; }
    if (S.user && S.tab !== "explore") { go("explore"); return true; }
    return false;
  };
  window.onAndroidResume = function () {
    if (S.user && S.tab === "testing") renderTab();
  };

  // ---------------------------------------------------------------- state
  const S = {
    user: null,       // firebase user
    me: null,         // users/{uid} data
    tab: "explore",
    filter: "need",
    apps: null,       // explore list
    joined: null,     // map appId -> joined doc
    mine: null,       // my apps
  };
  let auth, db, FV;
  let pendingName = "";

  // ---------------------------------------------------------------- boot
  function boot() {
    const pref = (() => { try { return localStorage.getItem("lang"); } catch (e) { return null; } })();
    const dev = A && A.deviceLang ? A.deviceLang() : (navigator.language || "vi");
    LANG = pref || (String(dev).toLowerCase().startsWith("vi") ? "vi" : "en");
    document.documentElement.lang = LANG;

    if (typeof firebase === "undefined") {
      root.innerHTML = `<div class="empty"><div class="big">📶</div><p>${esc(t("errNet"))}</p>
        <button class="btn" onclick="location.reload()">${esc(t("retry"))}</button></div>`;
      return;
    }
    if (!window.FIREBASE_CONFIG || /DAN_API_KEY/.test(FIREBASE_CONFIG.apiKey)) {
      root.innerHTML = `<div class="empty"><div class="big">⚙️</div><p>${esc(t("missingConfig"))}</p></div>`;
      return;
    }
    firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
    try { db.settings({ experimentalAutoDetectLongPolling: true, merge: true }); } catch (e) {}
    FV = firebase.firestore.FieldValue;

    auth.onAuthStateChanged(async u => {
      closeAll();
      S.user = u; S.me = null; S.apps = null; S.joined = null; S.mine = null; S.tab = "explore";
      if (!u) { renderAuth("login"); return; }
      root.innerHTML = `<div class="spinner"></div>`;
      try {
        await loadMe();
        renderShell();
      } catch (e) {
        console.error(e);
        root.innerHTML = `<div class="empty"><div class="big">⚠️</div><p>${esc(t("errNet"))}</p>
          <button class="btn" id="rt">${esc(t("retry"))}</button></div>`;
        $("#rt").onclick = () => location.reload();
      }
    });
  }

  async function loadMe() {
    const ref = db.collection("users").doc(S.user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      const data = {
        name: pendingName || S.user.displayName || (S.user.email || "").split("@")[0],
        testerEmail: isGmail(S.user.email || "") ? S.user.email.toLowerCase() : "",
        points: 0, lang: LANG,
        createdAt: FV.serverTimestamp()
      };
      await ref.set(data);
      S.me = Object.assign({}, data, { points: 0 });
      pendingName = "";
    } else {
      S.me = snap.data();
    }
  }
  function addPoints(n) {
    S.me.points = (S.me.points || 0) + n;
    const el = $("#pts"); if (el) el.innerHTML = `<b>${S.me.points}</b> ${esc(t("points"))}`;
  }

  // ---------------------------------------------------------------- auth screen
  function renderAuth(mode) {
    const reg = mode === "register";
    root.innerHTML = `
      <div class="auth">
        <div class="logo"><svg width="44" height="44" viewBox="0 0 108 108"><circle cx="42" cy="40" r="9" fill="#fff"/><path d="M27 70c0-9 7-15 15-15s15 6 15 15z" fill="#fff"/><circle cx="64" cy="44" r="8" fill="#CCFBF1"/><path d="M51 72c0-8 6-13 13-13s13 5 13 13z" fill="#CCFBF1"/><circle cx="72" cy="66" r="10" fill="#F59E0B"/><path d="M67 66l3.5 3.5 6.5-7" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <h1>${esc(t("appName"))}<span class="free">FREE</span></h1>
        <p class="tag">${esc(t("tagline"))}</p>
        ${googleReady() ? `<button class="btn block gbtn" id="agoogle">
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
          ${esc(t("googleLogin"))}</button>
        <div class="or"><span>${esc(t("orEmail"))}</span></div>` : ""}
        <div class="card">
          ${reg ? `<label>${esc(t("name"))}</label><input id="aname" type="text" maxlength="40" autocomplete="nickname">` : ""}
          <label>${esc(t("email"))}</label><input id="aemail" type="email" autocomplete="email" placeholder="ban@gmail.com">
          <label>${esc(t("password"))}</label><input id="apass" type="password" autocomplete="${reg ? "new-password" : "current-password"}">
          <div class="err" id="aerr"></div>
          <button class="btn block" id="ago">${esc(reg ? t("register") : t("login"))}</button>
          <div class="row" style="justify-content:space-between;margin-top:6px">
            <button class="link" id="aswitch">${esc(reg ? t("haveAcc") : t("noAcc"))}</button>
            ${reg ? "" : `<button class="link muted" id="aforgot">${esc(t("forgot"))}</button>`}
          </div>
        </div>
        <div class="row" style="justify-content:center">
          <button class="link muted" id="alang">${LANG === "vi" ? "English" : "Tiếng Việt"}</button>
        </div>
      </div>`;
    const err = $("#aerr");
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
      window.onGoogleError = msg => {
        busy(gb, false);
        if (msg !== "cancel") { console.error(msg); err.textContent = t("errGoogle"); }
      };
      A.googleSignIn(GOOGLE_WEB_CLIENT_ID);
    };
    $("#alang").onclick = () => { setLang(LANG === "vi" ? "en" : "vi"); renderAuth(mode); };
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
        if (reg) {
          pendingName = nm; // loadMe() dùng tên này khi tạo hồ sơ
          await auth.createUserWithEmailAndPassword(em, pw);
        } else {
          await auth.signInWithEmailAndPassword(em, pw);
        }
      } catch (e) {
        const c = (e && e.code) || "";
        err.textContent = c.includes("email-already") ? t("errExists")
          : (c.includes("wrong-password") || c.includes("user-not-found") || c.includes("invalid-credential") || c.includes("invalid-login")) ? t("errLogin")
          : c.includes("invalid-email") ? t("errEmail")
          : c.includes("weak-password") ? t("errPass") : t("errNet");
        busy(ev.target, false);
      }
    };
  }

  function googleReady() {
    return !!(A && A.googleSignIn && window.GOOGLE_WEB_CLIENT_ID && /\.apps\.googleusercontent\.com$/.test(GOOGLE_WEB_CLIENT_ID));
  }
  function signOut() {
    if (A && A.googleSignOut) A.googleSignOut();
    return auth.signOut();
  }

  function setLang(l) {
    LANG = l; document.documentElement.lang = l;
    try { localStorage.setItem("lang", l); } catch (e) {}
  }

  // ---------------------------------------------------------------- shell
  const TABS = [
    ["explore", "tabExplore", '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm3.5 6.5l-2 5-5 2 2-5 5-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'],
    ["testing", "tabTesting", '<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'],
    ["mine", "tabMine", '<rect x="4" y="3" width="16" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 17h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'],
    ["me", "tabMe", '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>']
  ];
  function renderShell() {
    root.innerHTML = `
      <header class="top"><h1 id="ttl"></h1><span class="pts" id="pts"><b>${S.me.points || 0}</b> ${esc(t("points"))}</span></header>
      <main id="main"></main>
      <nav class="tabs">${TABS.map(([id, k, svg]) =>
        `<button data-tab="${id}"><svg viewBox="0 0 24 24">${svg}</svg>${esc(t(k))}</button>`).join("")}</nav>`;
    root.querySelectorAll("nav.tabs button").forEach(b => b.onclick = () => go(b.dataset.tab));
    go(S.tab);
  }
  function go(tab) {
    S.tab = tab;
    root.querySelectorAll("nav.tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    const k = { explore: "tabExplore", testing: "tabTesting", mine: "tabMine", me: "tabMe" }[tab];
    $("#ttl").textContent = tab === "explore" ? t("appName") : t(k);
    window.scrollTo(0, 0);
    renderTab();
  }
  function renderTab() {
    const m = $("#main"); if (!m) return;
    if (S.tab === "explore") return renderExplore(m);
    if (S.tab === "testing") return renderTesting(m);
    if (S.tab === "mine") return renderMine(m);
    return renderMe(m);
  }
  function spin(m) { m.innerHTML = `<div class="spinner"></div>`; }
  function failBox(m, fn) {
    m.innerHTML = `<div class="empty"><div class="big">⚠️</div><p>${esc(t("errNet"))}</p>
      <button class="btn" id="rt">${esc(t("retry"))}</button></div>`;
    $("#rt").onclick = fn;
  }

  // ---------------------------------------------------------------- data loaders
  async function loadJoined(force) {
    if (S.joined && !force) return S.joined;
    const q = await db.collection("users").doc(S.user.uid).collection("joined").get();
    const map = {}; q.forEach(d => { map[d.id] = Object.assign({ id: d.id }, d.data()); });
    S.joined = map; return map;
  }
  // Giữ danh sách 2 phút để tiết kiệm lượt đọc (gói Firebase miễn phí: 50.000 lượt/ngày)
  async function loadApps() {
    if (S.apps && Date.now() - (S.appsAt || 0) < 120000) return S.apps;
    const q = await db.collection("apps").orderBy("bumpedAt", "desc").limit(60).get();
    const list = []; q.forEach(d => list.push(Object.assign({ id: d.id }, d.data())));
    S.apps = list; S.appsAt = Date.now(); return list;
  }
  async function loadMine(force) {
    if (S.mine && !force) return S.mine;
    const q = await db.collection("apps").where("ownerUid", "==", S.user.uid).get();
    const list = []; q.forEach(d => list.push(Object.assign({ id: d.id }, d.data())));
    list.sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
    S.mine = list; return list;
  }

  // ---------------------------------------------------------------- explore
  async function renderExplore(m) {
    spin(m);
    try { await Promise.all([loadApps(), loadJoined()]); }
    catch (e) { console.error(e); return failBox(m, () => renderExplore(m)); }
    if (S.tab !== "explore") return;
    const now = Date.now();
    let list = S.apps.filter(a => a.active !== false);
    if (S.filter === "need") list = list.filter(a => (a.testersCount || 0) < 12);
    if (S.filter === "notjoined") list = list.filter(a => !S.joined[a.id] && a.ownerUid !== S.user.uid);
    m.innerHTML = `
      <p class="sub" style="margin:2px 2px 12px;white-space:normal">${esc(t("exploreHint"))}</p>
      <div class="seg">
        <button data-f="need">${esc(t("filterNeed"))}</button>
        <button data-f="notjoined">${esc(t("filterNotJoined"))}</button>
        <button data-f="all">${esc(t("filterAll"))}</button>
      </div>
      <div id="list">${list.length ? list.map(a => appCard(a, now)).join("") :
        `<div class="empty"><div class="big">🚀</div><p>${esc(t("noApps"))}</p>
         <button class="btn" id="post1">${esc(t("addApp"))}</button></div>`}</div>`;
    m.querySelectorAll("[data-f]").forEach(b => {
      b.classList.toggle("on", b.dataset.f === S.filter);
      b.onclick = () => { S.filter = b.dataset.f; renderExplore(m); };
    });
    const p1 = $("#post1"); if (p1) p1.onclick = () => editApp(null);
    m.querySelectorAll("[data-app]").forEach(el => el.onclick = () => {
      const a = S.apps.find(x => x.id === el.dataset.app); if (a) openJoin(a);
    });
  }
  function appCard(a, now) {
    const n = a.testersCount || 0, pct = Math.min(100, Math.round(n / 12 * 100));
    const mine = a.ownerUid === S.user.uid, joined = !!S.joined[a.id];
    const boosted = ms(a.bumpedAt) - ms(a.createdAt) > 60000 && now - ms(a.bumpedAt) < 3 * 86400000;
    const isNew = now - ms(a.createdAt) < 2 * 86400000;
    return `<div class="card" data-app="${esc(a.id)}">
      <div class="row">${icon(a.name, a.pkg)}
        <div class="grow"><div class="title">${esc(a.name)}</div>
        <div class="sub">${esc(t("by"))} ${esc(mine ? t("you") : a.ownerName)} · ${esc(a.pkg)}</div></div>
        ${mine ? "" : joined ? `<span class="chip ok">✓ ${esc(t("joined"))}</span>` : `<button class="btn small">${esc(t("join"))}</button>`}
      </div>
      ${a.desc ? `<p class="desc">${esc(a.desc.length > 160 ? a.desc.slice(0, 160) + "…" : a.desc)}</p>` : ""}
      <div class="bar ${n >= 12 ? "" : "amber"}"><i style="width:${pct}%"></i></div>
      <div class="barlabel"><span>${n}/12 ${esc(t("testers"))}</span>
        <span>${n >= 12 ? esc(t("enough")) : esc(t("needMore", { n: 12 - n }))}</span></div>
      ${(boosted || isNew) ? `<div class="chips">${boosted ? `<span class="chip hot">⚡ ${esc(t("boosted"))}</span>` : ""}${isNew ? `<span class="chip">${esc(t("newApp"))}</span>` : ""}</div>` : ""}
    </div>`;
  }

  // ---------------------------------------------------------------- join flow
  function openJoin(a) {
    const mine = a.ownerUid === S.user.uid;
    const joined = S.joined[a.id];
    const email = S.me.testerEmail || "";
    const groupMode = a.mode !== "email";
    const steps = groupMode ? [
      `${esc(t("stepGroup", { email: email || "—" }))}<div><button class="btn small ghost" data-u="group" style="margin-top:6px">${esc(t("openGroup"))}</button></div>`,
      `${esc(t("stepOptin"))}<div><button class="btn small ghost" data-u="optin" style="margin-top:6px">${esc(t("openOptin"))}</button></div>`,
      `${esc(t("stepInstall"))}<div><button class="btn small ghost" data-u="play" style="margin-top:6px">${esc(t("openPlay"))}</button></div>`,
      `${esc(t("stepProof"))}<div class="proofbox"></div><div><button class="btn small ghost proofbtn" style="margin-top:6px">📷 ${esc(t("pickProof"))}</button></div>`
    ] : [
      esc(t("stepConfirm")),
      esc(t("stepEmail", { email: email || "—" })),
      `${esc(t("stepOptin"))}<div><button class="btn small ghost" data-u="optin" style="margin-top:6px">${esc(t("openOptin"))}</button></div>`,
      `${esc(t("stepInstall"))}<div><button class="btn small ghost" data-u="play" style="margin-top:6px">${esc(t("openPlay"))}</button></div>`
    ];
    sheet(`
      <div class="row">${icon(a.name, a.pkg)}<div class="grow"><h2 style="margin:0">${esc(a.name)}</h2>
        <div class="sub">${esc(t("by"))} ${esc(a.ownerName)} · ${a.testersCount || 0}/12 ${esc(t("testers"))}</div></div></div>
      ${a.desc ? `<p class="desc">${esc(a.desc)}</p>` : ""}
      ${mine ? `<div class="card" style="margin-top:12px">${esc(t("ownApp"))}</div>` : `
      <div class="card" style="margin-top:12px">
        <div class="title" style="white-space:normal">${esc(t("joinTitle"))}</div>
        <div class="sub" style="white-space:normal">${esc(t("joinIntro"))}</div>
        <ol class="steps">${steps.map((s, i) => `<li class="${joined && (groupMode ? i === 3 : i === 0) ? "done" : ""}">${s}</li>`).join("")}</ol>
        ${joined ? `<button class="btn block ghost" disabled>✓ ${esc(t("joined"))}</button>`
          : `<button class="btn block" id="jconfirm" ${groupMode ? "disabled" : ""}>${esc(t("confirmJoin", { p: P.join }))}</button>
             ${groupMode ? `<div class="hint" id="jhint" style="text-align:center">${esc(t("proofNeed"))}</div>` : ""}`}
      </div>`}
      <div class="btns">
        <button class="btn ghost" data-u="play">${esc(t("openPlay"))}</button>
        ${mine ? "" : `<button class="btn ghost" id="jreport">${esc(t("report"))}</button>`}
      </div>`, el => {
      el.querySelectorAll("[data-u]").forEach(b => b.onclick = () => {
        const k = b.dataset.u;
        if (k === "group") { if (a.groupLink) openUrl(a.groupLink); }
        else if (k === "optin") openUrl(optinUrl(a.pkg));
        else openUrl(playUrl(a.pkg));
      });
      let proof = null;
      const jc = $("#jconfirm", el);
      if (jc) {
        if (groupMode) proofPicker(el, d => { proof = d; jc.disabled = false; const h = $("#jhint", el); if (h) h.remove(); });
        jc.onclick = () => doJoin(a, jc, proof);
      }
      const rp = $("#jreport", el); if (rp) rp.onclick = () => report({ type: "app", appId: a.id });
    });
  }

  async function doJoin(a, btn, proof) {
    if (!isGmail(S.me.testerEmail || "")) { toast(t("needTesterEmail")); closeAll(); go("me"); return; }
    busy(btn, true);
    const uid = S.user.uid, day = todayStr();
    const b = db.batch();
    b.set(db.collection("apps").doc(a.id).collection("testers").doc(uid), {
      uid, name: S.me.name, email: S.me.testerEmail, joinedAt: FV.serverTimestamp(), days: 1, lastDay: day, proof: !!proof
    });
    b.set(db.collection("users").doc(uid).collection("joined").doc(a.id), {
      appId: a.id, name: a.name, pkg: a.pkg, ownerName: a.ownerName || "", mode: a.mode || "group",
      groupLink: a.groupLink || "", joinedAt: FV.serverTimestamp(), days: 1, lastDay: day, fbGiven: false, proof: !!proof
    });
    if (proof) b.set(db.collection("apps").doc(a.id).collection("proofs").doc(uid), { img: proof, createdAt: FV.serverTimestamp() });
    b.update(db.collection("apps").doc(a.id), { testersCount: FV.increment(1) });
    b.update(db.collection("users").doc(uid), { points: FV.increment(P.join) });
    try {
      await b.commit();
      a.testersCount = (a.testersCount || 0) + 1;
      S.joined[a.id] = { id: a.id, appId: a.id, name: a.name, pkg: a.pkg, ownerName: a.ownerName, mode: a.mode,
        groupLink: a.groupLink, joinedAt: new Date(), days: 1, lastDay: day, fbGiven: false, proof: !!proof };
      addPoints(P.join);
      closeAll(); toast(t("joinedOk"));
      renderTab();
    } catch (e) { console.error(e); busy(btn, false); toast(t("errNet")); }
  }

  function report(info) {
    ask(t("reportAsk"), t("report"), true).then(async ok => {
      if (!ok) return;
      try {
        await db.collection("reports").add(Object.assign({ by: S.user.uid, createdAt: FV.serverTimestamp() }, info));
        toast(t("reportOk"));
      } catch (e) { toast(t("errNet")); }
    });
  }

  // ---------------------------------------------------------------- testing
  async function renderTesting(m) {
    spin(m);
    try { await loadJoined(true); } catch (e) { return failBox(m, () => renderTesting(m)); }
    if (S.tab !== "testing") return;
    const list = Object.values(S.joined).sort((a, b) =>
      (a.lastDay === todayStr()) - (b.lastDay === todayStr()) || ms(b.joinedAt) - ms(a.joinedAt));
    if (!list.length) {
      m.innerHTML = `<div class="empty"><div class="big">🧪</div><p>${esc(t("testingEmpty"))}</p>
        <button class="btn" id="goex">${esc(t("tabExplore"))}</button></div>`;
      $("#goex").onclick = () => go("explore"); return;
    }
    const today = todayStr();
    m.innerHTML = list.map(j => {
      const d = Math.min(j.days || 0, 14), done = (j.days || 0) >= 14, checked = j.lastDay === today;
      return `<div class="card" data-j="${esc(j.id)}">
        <div class="row">${icon(j.name, j.pkg)}<div class="grow"><div class="title">${esc(j.name)}</div>
          <div class="sub">${esc(t("by"))} ${esc(j.ownerName)} · ${esc(t("ofDays", { d }))}</div></div></div>
        <div class="days">${Array.from({ length: 14 }, (_, i) => `<i class="${i < d ? "on" : ""}"></i>`).join("")}</div>
        ${done ? `<p class="sub" style="margin:8px 0 0">${esc(t("finished"))}</p>` : ""}
        <div class="btns">
          <button class="btn ${checked ? "ghost" : ""}" data-act="check">${checked ? "✓ " + esc(t("checkedToday")) : esc(t("checkin"))}</button>
        </div>
        <div class="btns" style="margin-top:8px">
          <button class="btn small ghost" data-act="fb">${esc(t("feedback"))}</button>
          ${j.proof ? "" : `<button class="btn small amber" data-act="proof">📷 ${esc(t("sendProof"))}</button>`}
          <button class="btn small ghost" data-act="optin">${esc(t("openOptin"))}</button>
          <button class="btn small ghost" data-act="more">⋯</button>
        </div></div>`;
    }).join("");
    m.querySelectorAll("[data-j]").forEach(card => {
      const j = S.joined[card.dataset.j];
      card.querySelectorAll("[data-act]").forEach(b => b.onclick = () => {
        const act = b.dataset.act;
        if (act === "check") checkin(j, b);
        else if (act === "fb") feedbackSheet(j);
        else if (act === "optin") openUrl(optinUrl(j.pkg));
        else if (act === "proof") proofSheet(j);
        else moreTesting(j);
      });
    });
  }

  async function checkin(j, btn) {
    if (A) A.openApp(j.pkg); else openUrl(playUrl(j.pkg));
    const day = todayStr();
    if (j.lastDay === day) return;
    busy(btn, true);
    const uid = S.user.uid, b = db.batch();
    b.update(db.collection("apps").doc(j.appId).collection("testers").doc(uid), { days: FV.increment(1), lastDay: day });
    b.update(db.collection("users").doc(uid).collection("joined").doc(j.appId), { days: FV.increment(1), lastDay: day });
    b.update(db.collection("users").doc(uid), { points: FV.increment(P.checkin) });
    try {
      await b.commit();
      j.days = (j.days || 0) + 1; j.lastDay = day; addPoints(P.checkin);
      toast(t("checkinOk", { p: P.checkin }));
      if (S.tab === "testing") renderTesting($("#main"));
    } catch (e) {
      console.error(e); busy(btn, false);
      // app có thể đã bị chủ xóa
      if (String(e && e.code).includes("not-found")) moreTesting(j); else toast(t("errNet"));
    }
  }

  function proofSheet(j) {
    let data = null;
    sheet(`<h2>${esc(t("sendProof"))} · ${esc(j.name)}</h2>
      <p class="sub" style="white-space:normal">${esc(t("stepProof"))}</p>
      <div class="proofbox"></div>
      <div class="btns"><button class="btn ghost proofbtn">📷 ${esc(t("pickProof"))}</button>
      <button class="btn" id="psend" disabled>${esc(t("sendProof"))}</button></div>`, el => {
      proofPicker(el, d => { data = d; $("#psend", el).disabled = false; });
      $("#psend", el).onclick = async ev => {
        busy(ev.target, true);
        const uid = S.user.uid, b = db.batch();
        b.set(db.collection("apps").doc(j.appId).collection("proofs").doc(uid), { img: data, createdAt: FV.serverTimestamp() });
        b.update(db.collection("apps").doc(j.appId).collection("testers").doc(uid), { proof: true });
        b.update(db.collection("users").doc(uid).collection("joined").doc(j.appId), { proof: true });
        try { await b.commit(); j.proof = true; closeTop(); toast(t("proofOk")); renderTab(); }
        catch (e) { console.error(e); busy(ev.target, false); toast(t("errNet")); }
      };
    });
  }

  function feedbackSheet(j) {
    sheet(`<h2>${esc(t("feedback"))} · ${esc(j.name)}</h2>
      <textarea id="fbt" maxlength="1000" placeholder="${esc(t("feedbackPh"))}"></textarea>
      <div class="btns"><button class="btn" id="fbs">${esc(t("sendFeedback"))}${j.fbGiven ? "" : ` (+${P.feedback})`}</button></div>`, el => {
      $("#fbs", el).onclick = async ev => {
        const text = $("#fbt", el).value.trim();
        if (text.length < 15) { toast(t("feedbackShort")); return; }
        busy(ev.target, true);
        const uid = S.user.uid, b = db.batch();
        b.set(db.collection("apps").doc(j.appId).collection("feedback").doc(), {
          uid, name: S.me.name, text, createdAt: FV.serverTimestamp()
        });
        if (!j.fbGiven) {
          b.update(db.collection("users").doc(uid).collection("joined").doc(j.appId), { fbGiven: true });
          b.update(db.collection("users").doc(uid), { points: FV.increment(P.feedback) });
        }
        try {
          await b.commit();
          if (!j.fbGiven) { j.fbGiven = true; addPoints(P.feedback); }
          closeTop(); toast(t("feedbackOk"));
        } catch (e) { console.error(e); busy(ev.target, false); toast(t("errNet")); }
      };
    });
  }

  function moreTesting(j) {
    sheet(`<h2>${esc(j.name)}</h2>
      <div class="btns" style="flex-direction:column">
        <button class="btn ghost" data-a="play">${esc(t("openPlay"))}</button>
        ${j.mode !== "email" && j.groupLink ? `<button class="btn ghost" data-a="group">${esc(t("openGroup"))}</button>` : ""}
        <button class="btn danger" data-a="leave">${esc(t("leave"))}</button>
      </div>`, el => el.addEventListener("click", async e => {
      const a = e.target.closest("[data-a]"); if (!a) return;
      if (a.dataset.a === "play") openUrl(playUrl(j.pkg));
      else if (a.dataset.a === "group") openUrl(j.groupLink);
      else if (await ask(t("leaveAsk"), t("leave"), true)) {
        closeAll(); await leaveApp(j); renderTab();
      }
    }));
  }

  async function leaveApp(j) {
    const uid = S.user.uid;
    const appRef = db.collection("apps").doc(j.appId);
    let exists = false;
    try { exists = (await appRef.get()).exists; } catch (e) {}
    const b = db.batch();
    b.delete(db.collection("users").doc(uid).collection("joined").doc(j.appId));
    if (exists) {
      b.delete(appRef.collection("testers").doc(uid));
      b.delete(appRef.collection("proofs").doc(uid));
      b.update(appRef, { testersCount: FV.increment(-1) });
    }
    try { await b.commit(); delete S.joined[j.appId]; }
    catch (e) {
      console.error(e);
      // nếu app/người test đã bị xóa, ít nhất xóa khỏi danh sách của mình
      try { await db.collection("users").doc(uid).collection("joined").doc(j.appId).delete(); delete S.joined[j.appId]; }
      catch (e2) { toast(t("errNet")); }
    }
  }

  // ---------------------------------------------------------------- my apps
  async function renderMine(m) {
    spin(m);
    try { await loadMine(true); } catch (e) { console.error(e); return failBox(m, () => renderMine(m)); }
    if (S.tab !== "mine") return;
    m.innerHTML = `
      <button class="btn block" id="addapp" style="margin-bottom:14px">＋ ${esc(t("addApp"))}</button>
      ${S.mine.length ? S.mine.map(a => {
        const n = a.testersCount || 0;
        return `<div class="card" data-mine="${esc(a.id)}">
          <div class="row">${icon(a.name, a.pkg)}<div class="grow"><div class="title">${esc(a.name)}</div>
            <div class="sub">${esc(a.pkg)}</div></div>
            ${a.active === false ? `<span class="chip">${esc(t("doneTag"))}</span>` : ""}</div>
          <div class="bar ${n >= 12 ? "" : "amber"}"><i style="width:${Math.min(100, n / 12 * 100)}%"></i></div>
          <div class="barlabel"><span>${n}/12 ${esc(t("testers"))}</span><span>›</span></div>
        </div>`;
      }).join("") : `<div class="empty"><div class="big">📱</div><p>${esc(t("mineEmpty"))}</p></div>`}`;
    $("#addapp").onclick = () => editApp(null);
    m.querySelectorAll("[data-mine]").forEach(el => el.onclick = () => {
      const a = S.mine.find(x => x.id === el.dataset.mine); if (a) manageApp(a);
    });
  }

  function editApp(a) {
    const isNew = !a;
    a = a || { name: "", pkg: "", mode: "group", groupLink: "", desc: "" };
    sheet(`<h2>${esc(isNew ? t("addApp") : t("editApp"))}</h2>
      <label>${esc(t("appNameL"))}</label><input id="ename" type="text" maxlength="50" value="${esc(a.name)}">
      <label>${esc(t("pkgL"))}</label><input id="epkg" type="text" maxlength="150" value="${esc(a.pkg)}" ${isNew ? "" : "disabled"} autocapitalize="off" spellcheck="false">
      <div class="hint">${esc(t("pkgHint"))}</div>
      <label>${esc(t("modeL"))}</label>
      <div class="seg" id="emode"><button data-m="group">${esc(t("modeGroup"))}</button><button data-m="email">${esc(t("modeEmail"))}</button></div>
      <div id="egroupbox"><label style="margin-top:0">${esc(t("groupL"))}</label>
        <input id="egroup" type="url" value="${esc(a.groupLink)}" placeholder="https://groups.google.com/g/..." autocapitalize="off" spellcheck="false">
        <div class="hint">${esc(t("groupHint"))}</div></div>
      <div id="emailbox" class="hint">${esc(t("emailModeHint"))}</div>
      <label>${esc(t("descL"))}</label><textarea id="edesc" maxlength="600" placeholder="${esc(t("descPh"))}">${esc(a.desc)}</textarea>
      <div class="err" id="eerr"></div>
      <div class="btns"><button class="btn ghost" id="ecancel">${esc(t("cancel"))}</button><button class="btn" id="esave">${esc(t("save"))}</button></div>`,
      el => {
        let mode = a.mode || "group";
        const paint = () => {
          el.querySelectorAll("[data-m]").forEach(b => b.classList.toggle("on", b.dataset.m === mode));
          $("#egroupbox", el).classList.toggle("hidden", mode !== "group");
          $("#emailbox", el).classList.toggle("hidden", mode !== "email");
        };
        el.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { mode = b.dataset.m; paint(); });
        paint();
        $("#ecancel", el).onclick = closeTop;
        $("#esave", el).onclick = async ev => {
          const err = $("#eerr", el);
          const name = $("#ename", el).value.trim();
          const pkg = $("#epkg", el).value.trim();
          const groupLink = $("#egroup", el).value.trim();
          const desc = $("#edesc", el).value.trim();
          if (!name) { err.textContent = t("errAppName"); return; }
          if (isNew && !isPkg(pkg)) { err.textContent = t("errPkg"); return; }
          if (mode === "group" && !/^https:\/\/groups\.google\.com\//i.test(groupLink)) { err.textContent = t("errGroup"); return; }
          err.textContent = ""; busy(ev.target, true);
          try {
            if (isNew) {
              const mine = await loadMine(true);
              if (mine.filter(x => x.active !== false).length >= 5) { err.textContent = t("maxApps"); busy(ev.target, false); return; }
              const dup = await db.collection("apps").where("pkg", "==", pkg).limit(1).get();
              if (!dup.empty) { err.textContent = t("errDupPkg"); busy(ev.target, false); return; }
              await db.collection("apps").add({
                ownerUid: S.user.uid, ownerName: S.me.name, name, pkg, mode,
                groupLink: mode === "group" ? groupLink : "", desc, active: true, testersCount: 0,
                createdAt: FV.serverTimestamp(), bumpedAt: FV.serverTimestamp()
              });
            } else {
              await db.collection("apps").doc(a.id).update({
                name, mode, groupLink: mode === "group" ? groupLink : "", desc
              });
            }
            closeAll(); toast(t("saved"));
            S.apps = null;
            if (S.tab !== "mine") go("mine"); else renderTab();
          } catch (e) { console.error(e); err.textContent = t("errNet"); busy(ev.target, false); }
        };
      });
  }

  async function manageApp(a) {
    const ov = sheet(`<div class="spinner"></div>`);
    const body = ov.firstElementChild;
    let testers = [], fbs = [];
    try {
      const ref = db.collection("apps").doc(a.id);
      const [ts, fs] = await Promise.all([ref.collection("testers").get(), ref.collection("feedback").get()]);
      ts.forEach(d => testers.push(d.data()));
      fs.forEach(d => fbs.push(Object.assign({ id: d.id }, d.data())));
      testers.sort((x, y) => ms(x.joinedAt) - ms(y.joinedAt));
      fbs.sort((x, y) => ms(y.createdAt) - ms(x.createdAt));
    } catch (e) { console.error(e); body.innerHTML = `<div class="grab"></div><p class="empty">${esc(t("errNet"))}</p>`; return; }
    const pts = S.me.points || 0;
    body.innerHTML = `<div class="grab"></div>
      <div class="row">${icon(a.name, a.pkg)}<div class="grow"><h2 style="margin:0">${esc(a.name)}</h2>
        <div class="sub">${esc(a.pkg)} · ${testers.length}/12 ${esc(t("testers"))}</div></div></div>

      <div class="card" style="margin-top:12px">
        <button class="btn block amber" id="mbump" ${pts < P.bumpCost || a.active === false ? "disabled" : ""}>⚡ ${esc(t("bump", { p: P.bumpCost }))}</button>
        <div class="hint" style="margin-top:8px">${esc(pts < P.bumpCost ? t("bumpNeed", { p: P.bumpCost }) : t("bumpInfo"))}</div>
      </div>

      <div class="section-h">${esc(t("testersList"))} (${testers.length})</div>
      <div class="card">
        ${testers.length ? testers.map(x => `<div class="person"><div class="avatar">${esc((x.name || "?")[0].toUpperCase())}</div>
          <div class="grow"><div style="font-weight:600">${esc(x.name)}</div><div class="sub">${esc(x.email)}</div></div>
          ${x.proof ? `<button class="btn small ghost" data-proof="${esc(x.uid)}">📷</button>` : `<span class="chip">${esc(t("noProof"))}</span>`}
          <span class="chip ${x.lastDay === todayStr() ? "ok" : ""}">${Math.min(x.days || 0, 14)}/14</span></div>`).join("")
          : `<p class="sub" style="white-space:normal;margin:0">${esc(t("noTesters"))}</p>`}
        ${testers.length ? `<button class="btn block ghost" id="mcopy" style="margin-top:10px">${esc(t("copyEmails"))}</button>` : ""}
      </div>

      <div class="section-h">${esc(t("feedbacks"))} (${fbs.length})</div>
      <div class="card">
        ${fbs.length ? fbs.map(f => `<div class="fb"><div class="who">${esc(f.name)} <span class="when">· ${esc(ago(f.createdAt))}</span>
          <button class="link muted" style="float:right;padding:0;font-size:12px" data-rep="${esc(f.id)}">${esc(t("report"))}</button></div>
          <p>${esc(f.text)}</p></div>`).join("") : `<p class="sub" style="margin:0">${esc(t("noFeedback"))}</p>`}
      </div>

      <div class="btns">
        <button class="btn ghost" id="mshare">${esc(t("share"))}</button>
        <button class="btn ghost" id="medit">${esc(t("editApp"))}</button>
      </div>
      <div class="btns">
        <button class="btn ghost" id="mtoggle">${esc(a.active === false ? t("reopen") : t("markDone"))}</button>
        <button class="btn danger" id="mdel">${esc(t("del"))}</button>
      </div>`;

    $("#mbump", body).onclick = async ev => {
      busy(ev.target, true);
      const b = db.batch();
      b.update(db.collection("apps").doc(a.id), { bumpedAt: FV.serverTimestamp() });
      b.update(db.collection("users").doc(S.user.uid), { points: FV.increment(-P.bumpCost) });
      try { await b.commit(); addPoints(-P.bumpCost); S.apps = null; closeAll(); toast(t("bumpOk")); }
      catch (e) { console.error(e); busy(ev.target, false); toast(t("errNet")); }
    };
    const cp = $("#mcopy", body);
    if (cp) cp.onclick = async () => {
      const ok = await copyText(testers.map(x => x.email).filter(Boolean).join(", "));
      toast(ok ? t("copied") : t("errNet"));
    };
    body.querySelectorAll("[data-proof]").forEach(b => b.onclick = async () => {
      const ov2 = sheet(`<div class="spinner"></div>`);
      try {
        const d = await db.collection("apps").doc(a.id).collection("proofs").doc(b.dataset.proof).get();
        const who = testers.find(x => x.uid === b.dataset.proof) || {};
        ov2.firstElementChild.innerHTML = `<div class="grab"></div><h2>${esc(who.name || "")}</h2>
          <div class="sub">${esc(who.email || "")}</div>
          ${d.exists ? `<img class="proofimg" src="${esc(d.data().img)}" alt="">` : `<p>${esc(t("noProof"))}</p>`}
          <button class="btn block ghost" style="margin-top:12px" onclick="this.closest('.overlay').click()">${esc(t("close"))}</button>`;
      } catch (e) { closeTop(); toast(t("errNet")); }
    });
    body.querySelectorAll("[data-rep]").forEach(b => b.onclick = () => report({ type: "feedback", appId: a.id, fbId: b.dataset.rep }));
    $("#mshare", body).onclick = () => {
      const txt = t("shareText", { name: a.name }) + "\n" + optinUrl(a.pkg);
      if (A) A.share(txt); else copyText(txt).then(() => toast(t("copied")));
    };
    $("#medit", body).onclick = () => { closeAll(); editApp(a); };
    $("#mtoggle", body).onclick = async () => {
      try {
        await db.collection("apps").doc(a.id).update({ active: a.active === false });
        closeAll(); S.apps = null; renderTab();
      } catch (e) { toast(t("errNet")); }
    };
    $("#mdel", body).onclick = async () => {
      if (!(await ask(t("delAsk"), t("del"), true))) return;
      try { await deleteAppDeep(a.id); closeAll(); S.apps = null; renderTab(); }
      catch (e) { console.error(e); toast(t("errNet")); }
    };
  }

  async function deleteAppDeep(appId) {
    const ref = db.collection("apps").doc(appId);
    for (const sub of ["testers", "feedback", "proofs"]) {
      const q = await ref.collection(sub).get();
      const docs = []; q.forEach(d => docs.push(d.ref));
      for (let i = 0; i < docs.length; i += 400) {
        const b = db.batch(); docs.slice(i, i + 400).forEach(r => b.delete(r)); await b.commit();
      }
    }
    await ref.delete();
  }

  // ---------------------------------------------------------------- me
  function getReminder() {
    try { return JSON.parse(localStorage.getItem("reminder") || "null") || { on: false, time: "20:00" }; }
    catch (e) { return { on: false, time: "20:00" }; }
  }
  function applyReminder(r) {
    try { localStorage.setItem("reminder", JSON.stringify(r)); } catch (e) {}
    const [h, mi] = r.time.split(":").map(Number);
    if (A && A.setReminder) A.setReminder(!!r.on, h || 20, mi || 0, t("reminderTitle"), t("reminderBody"));
  }

  async function renderMe(m) {
    const r = getReminder();
    const nJoined = S.joined ? Object.keys(S.joined).length : 0;
    const nMine = S.mine ? S.mine.length : 0;
    m.innerHTML = `
      <div class="card">
        <div class="row"><div class="avatar" style="width:48px;height:48px;font-size:20px">${esc((S.me.name || "?")[0].toUpperCase())}</div>
          <div class="grow"><div class="title">${esc(S.me.name)}</div><div class="sub">${esc(S.user.email)}</div>
          <div class="sub" id="mestats">${esc(t("stats", { a: nJoined, b: nMine }))}</div></div></div>
      </div>
      <div class="section-h">${esc(t("profile"))}</div>
      <div class="card">
        <label style="margin-top:0">${esc(t("name"))}</label><input id="pname" type="text" maxlength="40" value="${esc(S.me.name)}">
        <label>${esc(t("testerEmailL"))}</label><input id="pmail" type="email" value="${esc(S.me.testerEmail || "")}" placeholder="ban@gmail.com" autocapitalize="off">
        <div class="hint">${esc(t("testerEmailHint"))}</div>
        <div class="err" id="perr"></div>
        <button class="btn block" id="psave">${esc(t("save"))}</button>
      </div>
      <div class="section-h">${esc(t("langL"))}</div>
      <div class="seg"><button data-l="vi">Tiếng Việt</button><button data-l="en">English</button></div>
      <div class="card">
        <div class="switch"><span style="font-weight:600">${esc(t("reminderL"))}</span><input type="checkbox" id="rem" ${r.on ? "checked" : ""}></div>
        <div class="switch"><span>${esc(t("reminderTime"))}</span><input type="time" id="remt" value="${esc(r.time)}" style="width:auto;padding:6px 10px;border:1px solid var(--line);border-radius:8px"></div>
      </div>
      <div class="card">
        <button class="link" id="phow" style="display:block">📘 ${esc(t("howto"))}</button>
        <button class="link" id="pabout" style="display:block">ℹ️ ${esc(t("about"))}</button>
      </div>
      <div class="btns"><button class="btn ghost" id="pout">${esc(t("logout"))}</button></div>
      <div class="btns"><button class="btn danger" id="pdel">${esc(t("deleteAcc"))}</button></div>
      <p class="sub" style="text-align:center;margin-top:16px">v${esc(A && A.appVersion ? A.appVersion() : "web")}</p>`;

    m.querySelectorAll("[data-l]").forEach(b => {
      b.classList.toggle("on", b.dataset.l === LANG);
      b.onclick = async () => {
        setLang(b.dataset.l);
        try { await db.collection("users").doc(S.user.uid).update({ lang: LANG }); } catch (e) {}
        applyReminder(getReminder());
        renderShell();
      };
    });
    $("#psave").onclick = async ev => {
      const name = $("#pname").value.trim(), mail = $("#pmail").value.trim().toLowerCase();
      const err = $("#perr");
      if (!name) { err.textContent = t("errName"); return; }
      if (!isGmail(mail)) { err.textContent = t("errGmail"); return; }
      err.textContent = ""; busy(ev.target, true);
      try {
        await db.collection("users").doc(S.user.uid).update({ name, testerEmail: mail });
        S.me.name = name; S.me.testerEmail = mail; toast(t("saved"));
      } catch (e) { err.textContent = t("errNet"); }
      busy(ev.target, false);
    };
    const remChange = () => applyReminder({ on: $("#rem").checked, time: $("#remt").value || "20:00" });
    $("#rem").onchange = remChange; $("#remt").onchange = remChange;
    $("#phow").onclick = () => sheet(`<h2>${esc(t("howto"))}</h2><p style="white-space:pre-wrap">${esc(t("howtoBody"))}</p>
      <button class="btn block ghost" onclick="this.closest('.overlay').click()">${esc(t("close"))}</button>`);
    $("#pabout").onclick = () => sheet(`<h2>${esc(t("about"))}</h2><p style="white-space:pre-wrap">${esc(t("aboutBody"))}</p>
      ${window.CONTACT_EMAIL ? `<p><a href="mailto:${esc(CONTACT_EMAIL)}">${esc(CONTACT_EMAIL)}</a></p>` : ""}`);
    $("#pout").onclick = () => signOut();
    $("#pdel").onclick = deleteAccount;

    // cập nhật thống kê nếu chưa có
    if (!S.joined || !S.mine) {
      try {
        await Promise.all([loadJoined(), loadMine()]);
        const st = $("#mestats");
        if (st) st.textContent = t("stats", { a: Object.keys(S.joined).length, b: S.mine.length });
      } catch (e) {}
    }
  }

  async function deleteAccount() {
    if (!(await ask(t("deleteAsk"), t("deleteAcc"), true))) return;
    const uid = S.user.uid;
    try {
      // 1. bỏ test mọi app đang tham gia
      const joined = await loadJoined(true);
      for (const j of Object.values(joined)) {
        try {
          const fq = await db.collection("apps").doc(j.appId).collection("feedback").where("uid", "==", uid).get();
          const refs = []; fq.forEach(d => refs.push(d.ref));
          for (const r of refs) await r.delete();
        } catch (e) {}
        await leaveApp(j);
      }
      // 2. xóa app mình đăng
      const mine = await loadMine(true);
      for (const a of mine) await deleteAppDeep(a.id);
      // 3. xóa hồ sơ và tài khoản
      await db.collection("users").doc(uid).delete();
      applyReminder({ on: false, time: getReminder().time });
      await S.user.delete();
    } catch (e) {
      console.error(e);
      if (String(e && e.code).includes("requires-recent-login")) {
        toast(t("reauth")); await signOut();
      } else toast(t("errNet"));
    }
  }

  boot();
})();
