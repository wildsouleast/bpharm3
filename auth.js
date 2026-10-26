/* Account: register / login (email or phone + password), header "Hi <name>", progress + plan sync. */
(function () {
  "use strict";
  var API = "https://pharma3sem-auth.sites.tab.bot/api";
  var K_TOK = "bp3acct_token", K_USER = "bp3acct_user", K_DIRTY = "bp3acct_dirty", K_NUDGE = "bp3acct_nudge";
  var PFX = "bp3_";
  var KEEP_ON_LOGOUT = /^bp3_(theme2|free_|used_codes)/;
  var LS = window.localStorage;
  function g(k) { try { return LS.getItem(k); } catch (e) { return null; } }
  function s(k, v) { try { LS.setItem(k, v); } catch (e) {} }
  function r(k) { try { LS.removeItem(k); } catch (e) {} }
  function user() { try { return JSON.parse(g(K_USER) || "null"); } catch (e) { return null; } }
  function token() { return g(K_TOK); }
  function loggedIn() { return !!(token() && user()); }
  function firstName(n) { n = String(n || "").trim().split(" ")[0] || ""; return n.length > 12 ? n.slice(0, 11) + "…" : n; }

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") e.textContent = attrs[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function toast(m) { if (window.BP3App && BP3App.toast) BP3App.toast(m); }

  function api(path, method, body, timeoutMs) {
    var ctl = window.AbortController ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, timeoutMs || 15000) : null;
    var hd = { "Content-Type": "application/json" };
    if (token()) hd.Authorization = "Bearer " + token();
    return fetch(API + path, { method: method || "GET", headers: hd, body: body ? JSON.stringify(body) : undefined, signal: ctl ? ctl.signal : undefined, cache: "no-store" })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (j) { j.status = res.status; return j; }); })
      .catch(function () { return { ok: false, status: 0, error: "Internet nahi mil raha. Net on karke dobara try karo." }; })
      .then(function (j) { if (t) clearTimeout(t); return j; });
  }

  // ---------- local snapshot + merge ----------
  function snapshot() {
    var out = {}, days = [];
    for (var i = 0; i < LS.length; i++) {
      var k = LS.key(i);
      if (!k || k.indexOf(PFX) !== 0 || k === "bp3_theme2") continue;
      if (k.indexOf("bp3_day_") === 0) days.push(k); else out[k] = g(k);
    }
    days.sort().slice(-45).forEach(function (k) { out[k] = g(k); });
    var size = JSON.stringify(out).length;
    days.sort().slice(0, -7).forEach(function (k) {           // keep it small: older days lose typed answers first
      if (size < 140000 || !out[k]) return;
      try { var d = JSON.parse(out[k]); var before = out[k].length; d.answers = {}; out[k] = JSON.stringify(d); size -= before - out[k].length; } catch (e) {}
    });
    return out;
  }
  function P(v) { try { return JSON.parse(v); } catch (e) { return null; } }
  function n(o) { return o ? Object.keys(o).length : 0; }
  function pick(k, a, b) {           // a = local, b = server (raw JSON strings)
    if (a == null) return b; if (b == null || a === b) return a;
    var x = P(a), y = P(b);
    if (k.indexOf("bp3_day_") === 0) { var sa = x ? n(x.results) + n(x.mcq) + n(x.answers) : 0, sb = y ? n(y.results) + n(y.mcq) + n(y.answers) : 0; return sb > sa ? b : a; }
    if (k.indexOf("bp3_free_") === 0) return (Number(y) || 0) > (Number(x) || 0) ? b : a;
    if (k === "bp3_pro") return (y && y.until || 0) > (x && x.until || 0) ? b : a;
    if (k === "bp3_used_codes") { var u = (x || []).slice(); (y || []).forEach(function (c) { if (u.indexOf(c) < 0) u.push(c); }); return JSON.stringify(u); }
    if (k === "bp3_streak") { if (!x) return b; if (!y) return a; if ((y.last || "") !== (x.last || "")) return (y.last || "") > (x.last || "") ? b : a; return (y.count || 0) > (x.count || 0) ? b : a; }
    if (k === "bp3_plan2") { if (!x) return b; if (!y) return a; return n(y.done) > n(x.done) ? b : a; }
    return a;
  }
  var applying = false;
  function mergeIn(server) {       // returns true when anything local changed
    if (!server || typeof server !== "object") return false;
    var changed = false; applying = true;
    Object.keys(server).forEach(function (k) {
      if (k.indexOf(PFX) !== 0 || k === "bp3_theme2") return;
      var a = g(k), v = pick(k, a, server[k]);
      if (v != null && v !== a) { s(k, v); changed = true; }
    });
    applying = false;
    return changed;
  }

  // ---------- push (debounced) ----------
  var pushTimer = null, synced = false;
  function markDirty() { if (!loggedIn() || applying) return; s(K_DIRTY, "1"); if (!synced) return; clearTimeout(pushTimer); pushTimer = setTimeout(push, 2500); }
  function push() {
    if (!loggedIn()) return Promise.resolve(false);
    return api("/sync", "PUT", { data: snapshot() }).then(function (j) {
      if (j.ok) { r(K_DIRTY); return true; }
      if (j.status === 401) localLogout(false);
      return false;
    });
  }
  (function hookStorage() {
    try {
      var proto = Object.getPrototypeOf(LS), set = proto.setItem, rem = proto.removeItem;
      proto.setItem = function (k, v) { set.call(this, k, v); if (this === LS && String(k).indexOf(PFX) === 0 && k !== "bp3_theme2") markDirty(); };
      proto.removeItem = function (k) { rem.call(this, k); if (this === LS && String(k).indexOf(PFX) === 0 && String(k).indexOf("bp3_free_") !== 0) markDirty(); };
    } catch (e) {}
  })();
  window.addEventListener("pagehide", function () {
    if (!loggedIn() || !g(K_DIRTY) || !synced) return;
    try { fetch(API + "/sync", { method: "PUT", keepalive: true, headers: { "Content-Type": "application/json", Authorization: "Bearer " + token() }, body: JSON.stringify({ data: snapshot() }) }); } catch (e) {}
  });
  window.addEventListener("online", function () { if (loggedIn() && g(K_DIRTY) && synced) push(); });

  function startSync() {          // on page load when logged in
    if (!loggedIn()) return;
    var t0 = Date.now();
    api("/me").then(function (j) {
      if (j.status === 401) { localLogout(false); paintHeader(); toast("Login session khatam, dobara login karo"); return; }
      if (!j.ok) return;          // offline: keep working locally
      if (j.user) { s(K_USER, JSON.stringify(j.user)); paintHeader(); }
      var changed = mergeIn(j.data);
      synced = true;
      push();
      if (changed && window.BP3App && BP3App.reload) {
        var busy = document.activeElement && /TEXTAREA|INPUT/.test(document.activeElement.tagName);
        if (!busy || Date.now() - t0 < 1500) BP3App.reload();
      }
    });
  }

  function localLogout(keepData) {
    r(K_TOK); r(K_USER); r(K_DIRTY); synced = false;
    if (keepData) return;
    var del = [];
    for (var i = 0; i < LS.length; i++) { var k = LS.key(i); if (k && k.indexOf(PFX) === 0 && !KEEP_ON_LOGOUT.test(k)) del.push(k); }
    applying = true; del.forEach(r); applying = false;
  }
  function logout() {
    var btn = document.getElementById("acctOut"); if (btn) btn.disabled = true;
    push().then(function (ok) {
      if (!ok && !confirm("Internet nahi hai. Abhi logout karne se is phone ka naya progress account mein save nahi hoga. Phir bhi logout karein?")) { if (btn) btn.disabled = false; return; }
      return api("/logout", "POST", {}, 5000).then(function () {
        localLogout(false);
        location.hash = "#/"; location.reload();
      });
    });
  }

  // ---------- header ----------
  function paintHeader() {
    var bar = document.querySelector(".topbar .bar"), theme = document.getElementById("themeBtn");
    if (!bar || !theme) return;
    var box = document.getElementById("acctBox");
    if (!box) { box = h("div", { id: "acctBox", class: "acct" }); bar.insertBefore(box, theme); }
    var u = user();
    if (loggedIn()) {
      box.replaceChildren(
        h("span", { class: "acct-hi", title: u.ident || "" }, [h("span", { class: "acct-av", "aria-hidden": "true", text: (u.name || "?").trim().charAt(0).toUpperCase() }), h("span", { class: "acct-nm", text: "Hi " + firstName(u.name) })]),
        h("button", { id: "acctOut", class: "acct-out", type: "button", onclick: logout }, ["Logout"])
      );
      document.body.classList.add("logged-in");
    } else {
      box.replaceChildren(h("a", { class: "acct-login", href: "#/login" }, ["Login"]));
      document.body.classList.remove("logged-in");
    }
  }

  // ---------- pages ----------
  function capsule() {
    var ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 64 64"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("class", "au-ic");
    svg.innerHTML = '<g transform="rotate(-35 32 32)"><rect x="10" y="22" width="44" height="20" rx="10" fill="#fff"/><path d="M32 22h12a10 10 0 0 1 0 20H32z" fill="#fde68a"/><rect x="10" y="22" width="44" height="20" rx="10" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"/></g><circle cx="50" cy="14" r="3" fill="#99f6e4"/><circle cx="14" cy="52" r="2" fill="#99f6e4"/>';
    return svg;
  }
  function field(label, attrs, extra) {
    var inp = h("input", attrs);
    var err = h("p", { class: "au-err", role: "alert", hidden: true });
    var wrap = h("div", { class: "au-wrap" }, [inp].concat(extra ? [extra(inp)] : []));
    var f = h("label", { class: "au-field" }, [h("span", { class: "au-lb", text: label }), wrap, err]);
    f.inp = inp; f.err = err; return f;
  }
  function eye(inp) {
    return h("button", { type: "button", class: "au-eye", "aria-label": "Password dikhao", onclick: function () { var show = inp.type === "password"; inp.type = show ? "text" : "password"; this.textContent = show ? "Chhupao" : "Dikhao"; } }, ["Dikhao"]);
  }
  function page(mode, app) {
    if (window.BP3App && BP3App.setTop) BP3App.setTop(mode === "register" ? "Register" : "Login", "Free account · B.Pharm Study Plan", "#/");
    var u = user();
    if (loggedIn()) {
      app.replaceChildren(h("section", { class: "au" }, [
        h("div", { class: "au-hero" }, [capsule(), h("h1", { text: "Hi " + firstName(u.name) + " 👋" }), h("p", { text: "Aap logged in ho: " + (u.ident || "") })]),
        h("div", { class: "au-card" }, [h("p", { class: "au-note", text: "Progress, streak aur ₹49 plan is account se jude hain. Dusre phone pe isi email/number se login karo." }),
          h("a", { class: "btn au-go", href: "#/practice" }, ["Practice shuru karo →"]),
          h("button", { class: "btn ghost au-go", type: "button", onclick: logout }, ["Logout"])])
      ]));
      return;
    }
    var isReg = mode === "register";
    var tabs = h("div", { class: "au-tabs", role: "tablist" }, [
      h("a", { href: "#/login", role: "tab", "aria-selected": String(!isReg), class: isReg ? "" : "on" }, ["Login"]),
      h("a", { href: "#/register", role: "tab", "aria-selected": String(isReg), class: isReg ? "on" : "" }, ["Register"])
    ]);
    var fName = field("Aapka naam", { type: "text", name: "name", autocomplete: "name", placeholder: "jaise Rahul Kumar", maxlength: "40", required: true });
    var fId = field("Email ya mobile number", { type: "text", name: "username", autocomplete: "username", inputmode: "email", placeholder: "you@gmail.com ya 98XXXXXXXX", autocapitalize: "off", spellcheck: "false", required: true });
    var fPw = field("Password", { type: "password", name: "password", autocomplete: isReg ? "new-password" : "current-password", placeholder: isReg ? "kam se kam 6 akshar" : "aapka password", minlength: "6", required: true }, eye);
    var formErr = h("p", { class: "au-err au-formerr", role: "alert", hidden: true });
    var btn = h("button", { class: "btn au-submit", type: "submit" }, [isReg ? "Account banao" : "Login karo"]);
    var fields = isReg ? [fName, fId, fPw] : [fId, fPw];
    function showErr(f, msg) { [fName, fId, fPw].forEach(function (x) { x.err.hidden = true; x.classList.remove("bad"); }); formErr.hidden = true;
      var target = f || null; if (target) { target.err.textContent = msg; target.err.hidden = false; target.classList.add("bad"); target.inp.focus(); } else { formErr.textContent = msg; formErr.hidden = false; } }
    var form = h("form", { class: "au-form", novalidate: true }, fields.concat([formErr, btn]));
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var id = fId.inp.value.trim(), pw = fPw.inp.value, nm = fName.inp.value.trim();
      if (isReg && nm.length < 2) return showErr(fName, "Apna naam daalo");
      if (!id) return showErr(fId, "Email ya mobile number daalo");
      if (id.indexOf("@") < 0 && id.replace(/\D/g, "").length < 10) return showErr(fId, "10 digit mobile number ya sahi email daalo");
      if (pw.length < 6) return showErr(fPw, isReg ? "Password kam se kam 6 akshar ka rakho" : "Password daalo");
      btn.disabled = true; btn.textContent = isReg ? "Account ban raha hai…" : "Login ho raha hai…";
      var body = isReg ? { id: id, name: nm, password: pw, data: snapshot() } : { id: id, password: pw };
      api(isReg ? "/register" : "/login", "POST", body).then(function (j) {
        btn.disabled = false; btn.textContent = isReg ? "Account banao" : "Login karo";
        if (!j.ok) { var f = j.field === "name" ? fName : j.field === "id" ? fId : j.field === "password" ? fPw : null; return showErr(f, j.error || "Kuch gadbad hui, dobara try karo"); }
        s(K_TOK, j.token); s(K_USER, JSON.stringify(j.user));
        mergeIn(j.data); synced = true;
        var after = function () { s("bp3acct_welcome", isReg ? "reg" : "login"); var back = sessionStorage.getItem("bp3acct_back") || "#/"; sessionStorage.removeItem("bp3acct_back"); location.hash = back; location.reload(); };
        push().then(after, after);
      });
    });
    var forgot = isReg ? null : h("details", { class: "au-forgot" }, [h("summary", null, ["Password bhool gaye?"]),
      h("p", null, ["Abhi OTP wala reset nahi hai. WhatsApp pe message karo: apna registered email/number aur naam likho. Verify karke naya password bhej diya jayega. ", h("a", { href: "#/contact", text: "Contact →" })])]);
    var hero = h("div", { class: "au-hero" }, [capsule(),
      h("h1", { text: isReg ? "Free account banao" : "Wapas swagat hai" }),
      h("p", { text: isReg ? "Progress, streak aur ₹49 plan har phone pe safe. OTP nahi, bas email/number + password." : "Email ya mobile number aur password se login karo." })]);
    var perks = isReg ? h("ul", { class: "au-perks" }, ["Daily score aur streak save", "₹49 plan account se juda, phone badlo to bhi", "Bilkul free, koi OTP nahi"].map(function (t) { return h("li", { text: t }); })) : null;
    var switcher = h("p", { class: "au-switch" }, isReg ? ["Account pehle se hai? ", h("a", { href: "#/login", text: "Login karo" })] : ["Naya account? ", h("a", { href: "#/register", text: "Register karo (free)" })]);
    app.replaceChildren(h("section", { class: "au" }, [hero, h("div", { class: "au-card" }, [tabs, form, forgot, switcher].filter(Boolean)), perks, h("p", { class: "au-later" }, [h("a", { href: "#/", text: "Abhi nahi, bina login ke use karo →" })])].filter(Boolean)));
    setTimeout(function () { (isReg ? fName : fId).inp.focus({ preventScroll: true }); }, 50);
  }

  // ---------- nudges ----------
  function afterRoute(where, app) {
    var w = g("bp3acct_welcome");
    if (w && loggedIn()) { r("bp3acct_welcome"); setTimeout(function () { toast(w === "reg" ? "Account ban gaya ✓ Hi " + firstName(user().name) + "!" : "Login ho gaye ✓ Hi " + firstName(user().name) + "!"); }, 300); }
    if (loggedIn()) return;
    if (where === "home") {
      var last = Number(g(K_NUDGE) || 0);
      if (Date.now() - last < 3 * 864e5) return;
      var hero = app.querySelector(".hero"); if (!hero) return;
      var card = h("div", { class: "au-nudge" }, [
        h("span", { class: "au-nicon", "aria-hidden": "true", text: "🔐" }),
        h("div", { class: "au-ntext" }, [h("b", { text: "Free account banao" }), h("span", { text: "Progress aur ₹49 plan har phone pe safe rahega" })]),
        h("a", { class: "btn au-nbtn", href: "#/register", onclick: function () { sessionStorage.setItem("bp3acct_back", "#/"); } }, ["Register"]),
        h("button", { class: "au-nx", type: "button", "aria-label": "Band karo", onclick: function () { s(K_NUDGE, String(Date.now())); card.remove(); } }, ["✕"])
      ]);
      hero.parentNode.insertBefore(card, hero.nextSibling);
    } else if (where === "buy" || where === "plan") {
      var anchor = app.querySelector(".subhead"); if (!anchor || app.querySelector(".au-inline")) return;
      anchor.parentNode.insertBefore(h("p", { class: "au-inline" }, ["🔐 Plan lene se pehle ", h("a", { href: "#/register", onclick: function () { sessionStorage.setItem("bp3acct_back", "#/" + where); }, text: "free account bana lo" }), " ya ", h("a", { href: "#/login", onclick: function () { sessionStorage.setItem("bp3acct_back", "#/" + where); }, text: "login karo" }), ", taaki plan phone badalne pe bhi rahe."]), anchor.nextSibling);
    }
  }

  window.BP3Auth = { page: page, afterRoute: afterRoute, loggedIn: loggedIn, user: user, logout: logout, paintHeader: paintHeader, push: push };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paintHeader); else paintHeader();
  startSync();
})();
