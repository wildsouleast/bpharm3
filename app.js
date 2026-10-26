(function () {
  "use strict";
  var SUBJECTS = [
    { id: "bp301t", accent: "--c1" },
    { id: "bp302t", accent: "--c2" },
    { id: "bp303t", accent: "--c3" },
    { id: "bp304t", accent: "--c4" }
  ];
  var PER_DAY = { mcq: 30, a: 4, b: 5, c: 3 };
  var ALL_TODAY = PER_DAY.mcq + PER_DAY.a + PER_DAY.b + PER_DAY.c;
  var BANKS = window.BANKS || {};
  var CFG = window.PCI_CONFIG || { UPI_ID: "PENDING", PAYEE_NAME: "B.Pharm Study Plan", PRICE: 49, DAYS: 30, FREE_PER_DAY: 10, PLAN_PER_DAY: 40, WHATSAPP: "916204453997", NOTE: "PCI Plan" };
  var PCI = window.PCI;
  var app = document.getElementById("app");
  var LS = "bp3_";

  // ---------- storage ----------
  function load(key, dflt) {
    try { var v = localStorage.getItem(LS + key); return v ? JSON.parse(v) : dflt; } catch (e) { return dflt; }
  }
  function save(key, val) { try { localStorage.setItem(LS + key, JSON.stringify(val)); } catch (e) {} }

  // ---------- IST date ----------
  function istNow() { return new Date(Date.now() + 330 * 60000); }
  function istKey(d) { d = d || istNow(); return d.toISOString().slice(0, 10); }
  function prettyDate(key) {
    var d = new Date(key + "T00:00:00Z");
    var m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()];
    var w = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getUTCDay()];
    return w + ", " + d.getUTCDate() + " " + m + " " + d.getUTCFullYear();
  }

  var todays = window.BP3Core.todays, check = window.BP3Core.check, dayNumber = window.BP3Core.dayNumber;

  // ---------- state ----------
  var today = istKey();
  var state = load("day_" + today, { answers: {}, results: {}, mcq: {} });
  state.mcq = state.mcq || {};
  function persist() { save("day_" + today, state); }

  function recordActivity() {
    var s = load("streak", { last: null, count: 0, best: 0 });
    if (s.last === today) return;
    var y = istKey(new Date(Date.parse(today + "T00:00:00Z") - 86400000));
    s.count = (s.last === y) ? s.count + 1 : 1;
    s.best = Math.max(s.best || 0, s.count);
    s.last = today;
    save("streak", s);
  }
  function streakNow() {
    var s = load("streak", { last: null, count: 0 });
    var y = istKey(new Date(Date.parse(today + "T00:00:00Z") - 86400000));
    return (s.last === today || s.last === y) ? s.count : 0;
  }
  function todayTotals(subj) {
    var got = 0, total = 0, done = 0;
    Object.keys(state.results).forEach(function (id) {
      var r = state.results[id];
      if (subj && r.s !== subj) return;
      got += r.got; total += r.total; done++;
    });
    return { got: got, total: total, done: done };
  }

  // ---------- helpers ----------
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "class") e.className = attrs[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function toast(msg) {
    var t = document.querySelector(".toast") || document.body.appendChild(el("div", { class: "toast", role: "status" }));
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }
  function unitName(b, u) { return (b.units && b.units[String(u)]) ? "Unit " + u + " · " + b.units[String(u)] : "Unit " + u; }

  // ---------- theme ----------
  function applyTheme(t) { document.documentElement.setAttribute("data-theme", t); var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", t === "dark" ? "#0f1a19" : "#ffffff"); }
  // Always open light; dark only after the reader taps the toggle (saved under a new key, so older saved/system dark is ignored).
  var theme = load("theme2", "light") === "dark" ? "dark" : "light";
  applyTheme(theme);
  document.getElementById("themeBtn").addEventListener("click", function () { theme = theme === "dark" ? "light" : "dark"; applyTheme(theme); save("theme2", theme); });
  var backTo = "#/";
  document.getElementById("backBtn").addEventListener("click", function () { location.hash = backTo; });

  // ---------- pools ----------
  function marksOf(q, fallback) { var m = Number(q.m || q.marks); return (m === 2 || m === 5 || m === 10) ? m : fallback; }
  function pools(b) {
    var p = { a: [], b: [], c: [] };
    (b.short || []).forEach(function (q) { var m = marksOf(q, 2); (m === 10 ? p.b : m === 5 ? p.c : p.a).push(q); });
    (b.long || []).forEach(function (q) { var m = marksOf(q, 10); (m === 2 ? p.a : m === 5 ? p.c : p.b).push(q); });
    return p;
  }
  function mcqList(b) { return b.mcq || b.mcqs || []; }
  function todaySet(id) {
    var b = BANKS[id], p = pools(b);
    return {
      mcq: todays(mcqList(b), PER_DAY.mcq, id, "mcq", today),
      a: todays(p.a, PER_DAY.a, id, "a", today),
      b: todays(p.b, PER_DAY.b, id, "b", today),
      c: todays(p.c, PER_DAY.c, id, "c", today)
    };
  }
  function mcqTotals(subj) {
    var right = 0, done = 0;
    Object.keys(state.mcq || {}).forEach(function (id) { var r = state.mcq[id]; if (subj && r.s !== subj) return; done++; if (r.ok) right++; });
    return { right: right, done: done };
  }

  // ---------- views ----------
  function home() {
    document.getElementById("backBtn").hidden = true;
    document.getElementById("topTitle").textContent = "B.Pharm Study Plan";
    document.getElementById("topSub").textContent = "3rd Semester · PCI Syllabus";
    document.body.classList.remove("in-subject");
    var t = todayTotals(), m = mcqTotals();
    var hero = el("section", { class: "hero", "aria-labelledby": "hero-h" }, [
      el("p", { class: "eyebrow light", text: "PCI syllabus · " + prettyDate(today) }),
      el("h1", { id: "hero-h" }, ["Welcome to ", el("span", { class: "grad", text: "B.Pharm" })]),
      el("p", { class: "tagline", text: "3rd Semester Study Plan" }),
      el("p", { class: "sub", text: "Every day, for each of the 4 subjects: " + PER_DAY.mcq + " MCQs, " + PER_DAY.a + " two-mark, " + PER_DAY.c + " five-mark and " + PER_DAY.b + " ten-mark questions, checked instantly with model answers. Free: " + CFG.FREE_PER_DAY + " MCQs a day, full syllabus and sample model answers (2 short + 1 long). ₹" + CFG.PRICE + " plan: all " + (PER_DAY.a + PER_DAY.c) + " short + " + PER_DAY.b + " long answers, " + (CFG.PLAN_PER_DAY || 40) + " MCQs a day + your own exam-date plan." }),
      el("div", { class: "cta" }, [
        el("a", { class: "btn hero-btn", href: "#/practice" }, ["Start today's practice"]),
        el("a", { class: "btn hero-ghost", href: "#/plan" }, ["₹" + CFG.PRICE + " Exam Plan"])
      ]),
      el("ul", { class: "facts" }, [
        el("li", null, [el("b", { text: "4" }), " subjects"]),
        el("li", null, [el("b", { text: String(4 * ALL_TODAY) }), " Qs a day"]),
        el("li", null, [el("b", { text: "520" }), " Qs in bank"]),
        el("li", null, [el("b", { text: "75" }), " marks paper"])
      ])
    ]);
    var chips = el("nav", { class: "chips", "aria-label": "Jump to section" }, [
      ["#/how", "How it works"], ["#/syllabus", "Syllabus"], ["#/plan", "₹" + CFG.PRICE + " Exam Plan"], ["#/tips", "Exam tips"], ["#/faq", "FAQ"], ["#/about", "Creator"], ["#/contact", "Contact"]
    ].map(function (c) { return el("a", { href: c[0] }, [c[1]]); }));
    var stats = el("div", { class: "stats" }, [
      el("div", { class: "stat" }, [el("b", { text: "🔥 " + streakNow() }), el("span", { text: "day streak" })]),
      el("div", { class: "stat" }, [el("b", { text: m.right + "/" + m.done }), el("span", { text: "MCQs right today" })]),
      el("div", { class: "stat" }, [el("b", { text: t.got + "/" + t.total }), el("span", { text: "key points today" })])
    ]);
    var grid = el("div", { class: "subjects" });
    SUBJECTS.forEach(function (s) {
      var b = BANKS[s.id]; if (!b) return;
      var p = pools(b);
            var set = todaySet(s.id), pr = subjProgress(s.id, set);
      var card = el("article", { class: "subject", style: "--accent:var(" + s.accent + ")" }, [
        el("a", { class: "sj-head", href: "#/" + s.id, "aria-label": "Open " + b.name }, [
          ico(SUBJ_ICON[s.id] || "flask", "sj-ic"),
          el("span", { class: "sj-txt" }, [el("span", { class: "code", text: b.code }), el("h3", { text: b.name }), el("span", { class: "meta", text: "Bank: " + mcqList(b).length + " MCQ · " + (p.a.length + p.c.length) + " short · " + p.b.length + " long" })]),
          ring(pr.pct)
        ]),
        el("div", { class: "row three" }, [
          el("a", { class: "pill", href: "#/" + s.id + "/mcq" }, [ico("capsule", "pi"), el("strong", { text: "MCQ" }), el("small", { text: PER_DAY.mcq + " today" })]),
          el("a", { class: "pill", href: "#/" + s.id + "/short" }, [ico("pen", "pi"), el("strong", { text: "Short" }), el("small", { text: (PER_DAY.a + PER_DAY.c) + " today" })]),
          el("a", { class: "pill", href: "#/" + s.id + "/long" }, [ico("doc", "pi"), el("strong", { text: "Long" }), el("small", { text: PER_DAY.b + " today" })])
        ]),
        el("div", { class: "progress", "aria-hidden": "true" }, [el("i", { style: "width:" + pr.pct + "%" })])
      ]);
      grid.appendChild(card);
    });
    var practice = el("section", { class: "sec first", id: "practice", "aria-labelledby": "prac-h" }, [
      el("p", { class: "eyebrow", text: "Today's practice" }),
      el("h2", { id: "prac-h", text: "Pick a subject" }),
      el("p", { class: "lead", text: "Aaj ke naye questions ready hain. Answer likho, Check dabao." }),
      meterBox(), stats, grid
    ]);
    app.replaceChildren(hero, chips, planPromo(), practice);
  }

  function sectionHead(title, sub) { return el("div", { class: "sechead" }, [el("h2", { text: title }), el("span", { text: sub })]); }

  // ---------- v3 UI: pharmacy icons (static SVG strings, no user data) ----------
  var ICONS = {
    flask: '<path d="M9 3h6M10 3v6.5L4.6 18.4A2 2 0 0 0 6.3 21.5h11.4a2 2 0 0 0 1.7-3.1L14 9.5V3"/><path d="M7.2 15h9.6"/><circle cx="10" cy="18" r=".8" fill="currentColor"/><circle cx="13.5" cy="17.2" r=".6" fill="currentColor"/>',
    mortar: '<path d="M3 11h18"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M9 21h6M12 18v3"/><path d="M13.5 11 19 3.5"/>',
    microbe: '<circle cx="12" cy="12" r="5"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M5.3 18.7l2.8-2.8M15.9 8.1l2.8-2.8"/><circle cx="10.4" cy="11" r="1" fill="currentColor"/><circle cx="13.6" cy="13.4" r=".8" fill="currentColor"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.9 1.9M17.5 17.5l1.9 1.9M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.9-1.9M17.5 6.5l1.9-1.9"/><circle cx="12" cy="12" r="6.5"/>',
    capsule: '<g transform="rotate(-45 12 12)"><rect x="3" y="8" width="18" height="8" rx="4"/><path d="M12 8h-5a4 4 0 0 0 0 8h5z" fill="currentColor" fill-opacity=".3"/><path d="M12 8v8"/></g>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/><path d="M14 20h6"/>',
    doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7M9 8h3"/>',
    plan: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8.5 15l2 2 4-4"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="16" r="1.2" fill="currentColor"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M8 7h8M8 11h6"/>'
  };
  var SUBJ_ICON = { bp301t: "flask", bp302t: "mortar", bp303t: "microbe", bp304t: "gear" };
  function ico(name, cls) {
    var s = el("span", { class: "ico " + (cls || ""), "aria-hidden": "true" });
    s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || "") + "</svg>";
    return s;
  }
  function subjAccent(id) { for (var i = 0; i < SUBJECTS.length; i++) if (SUBJECTS[i].id === id) return SUBJECTS[i].accent; return "--brand"; }
  function ring(pct, label) {
    return el("span", { class: "ring", style: "--p:" + pct, role: "img", "aria-label": pct + "% " + (label || "done today") }, [el("b", { text: pct + "%" }), el("small", { text: label || "aaj" })]);
  }
  // today's progress for one subject, split by mode
  function subjProgress(id, set) {
    var m = 0, mr = 0, s = 0, l = 0;
    set.mcq.forEach(function (q) { var r = state.mcq[q.id]; if (r) { m++; if (r.ok) mr++; } });
    set.a.concat(set.c).forEach(function (q) { if (state.results[q.id]) s++; });
    set.b.forEach(function (q) { if (state.results[q.id]) l++; });
    var total = set.mcq.length + set.a.length + set.c.length + set.b.length;
    var done = m + s + l;
    return { m: m, mr: mr, s: s, l: l, done: done, total: total, pct: total ? Math.round(100 * done / total) : 0 };
  }
  function modeCards(id, set, kind, asTabs) {
    var pro = proInfo();
    var nShort = set.a.length + set.c.length;
    var modes = [
      { k: "mcq", icon: "capsule", t: "MCQ Practice", d: set.mcq.length + " Qs · 1 mark · turant result", badge: pro ? mcqLimit() + "/din" : CFG.FREE_PER_DAY + " free/din", go: "Start MCQ" },
      { k: "short", icon: "pen", t: "Short Answer", d: set.a.length + " × 2 marks + " + set.c.length + " × 5 marks", badge: pro ? "Sab unlocked" : Math.min(FREE_SAMPLE.short, nShort) + " free", go: "Likhna shuru" },
      { k: "long", icon: "doc", t: "Long Answer", d: set.b.length + " × 10 marks · exam pattern", badge: pro ? "Sab unlocked" : Math.min(FREE_SAMPLE.long, set.b.length) + " free", go: "Likhna shuru" }
    ];
    var wrap = el("nav", { class: "modes" + (asTabs ? " as-tabs" : ""), "aria-label": "Practice mode" });
    if (asTabs) wrap.setAttribute("role", "tablist");
    modes.forEach(function (m) {
      var sel = asTabs && m.k === kind;
      var a = el("a", { class: "mode mode-" + m.k + (sel ? " on" : ""), href: "#/" + id + "/" + m.k }, [
        ico(m.icon, "mi"),
        el("span", { class: "mtxt" }, [el("strong", { text: m.t }), el("small", { text: m.d })]),
        el("span", { class: "mbadge" + (pro ? " pro" : "") }, [m.badge]),
        el("span", { class: "mgo" }, [m.go, ico("chev", "tiny")])
      ]);
      if (asTabs) { a.setAttribute("role", "tab"); a.setAttribute("aria-selected", String(sel)); }
      wrap.appendChild(a);
    });
    return wrap;
  }
  function subjectHero(id, b, set, compact) {
    var pr = subjProgress(id, set);
    return el("section", { class: "shero" + (compact ? " compact" : ""), style: "--accent:var(" + subjAccent(id) + ")" }, [
      ico(SUBJ_ICON[id] || "flask", "sh-bg"),
      el("div", { class: "sh-row" }, [
        ico(SUBJ_ICON[id] || "flask", "sh-ic"),
        el("div", { class: "sh-txt" }, [
          el("p", { class: "sh-code" }, [el("span", { text: b.code }), el("span", { class: "rx", text: "℞" }), el("span", { text: "PCI · Sem 3" })]),
          el("h1", { text: b.name }),
          el("p", { class: "sh-sub", text: "Aaj ka set · " + prettyDate(today) })
        ]),
        ring(pr.pct)
      ]),
      el("div", { class: "sh-stats" }, [
        el("span", null, [el("b", { text: pr.mr + "/" + set.mcq.length }), " MCQ sahi"]),
        el("span", null, [el("b", { text: pr.s + "/" + (set.a.length + set.c.length) }), " short"]),
        el("span", null, [el("b", { text: pr.l + "/" + set.b.length }), " long"])
      ])
    ]);
  }
  function unitFilter(b, list, qs) {
    var units = [];
    qs.forEach(function (q) { if (units.indexOf(String(q.unit)) < 0) units.push(String(q.unit)); });
    units.sort(function (x, y) { return Number(x) - Number(y); });
    if (units.length < 2) return null;
    var row = el("div", { class: "ufilter", role: "group", "aria-label": "Filter by unit" });
    function pick(u, btn) {
      Array.prototype.forEach.call(row.children, function (c) { c.setAttribute("aria-pressed", String(c === btn)); });
      Array.prototype.forEach.call(list.querySelectorAll("[data-unit]"), function (c) { c.hidden = !(u === "all" || c.getAttribute("data-unit") === u); });
    }
    var all = el("button", { type: "button", "aria-pressed": "true", onclick: function () { pick("all", all); } }, ["Sab units"]);
    row.appendChild(all);
    units.forEach(function (u) {
      var nm = b.units && b.units[u];
      var bt = el("button", { type: "button", "aria-pressed": "false", title: nm ? "Unit " + u + " · " + nm : "Unit " + u, onclick: function () { pick(u, bt); } }, ["Unit " + u]);
      row.appendChild(bt);
    });
    return row;
  }
  function subjectHub(id, b, set) {
    var units = Object.keys(b.units || {}).sort(function (x, y) { return Number(x) - Number(y); });
    var mcqs = mcqList(b), p = pools(b);
    var cnt = function (arr, u) { return arr.filter(function (q) { return String(q.unit) === u; }).length; };
    var ulist = el("ol", { class: "units" }, units.map(function (u) {
      return el("li", null, [
        el("span", { class: "un", text: u }),
        el("span", { class: "ut" }, [el("strong", { text: b.units[u] }), el("small", { text: cnt(mcqs, u) + " MCQ · " + (cnt(p.a, u) + cnt(p.c, u)) + " short · " + cnt(p.b, u) + " long in bank" })])
      ]);
    }));
    return [
      el("div", { class: "hubhead" }, [el("h2", { text: "Aaj kya practice karna hai?" }), el("p", { text: "Ek mode chuno. Har din naye questions, raat 12 baje (IST) badalte hain." })]),
      modeCards(id, set, null, false),
      el("a", { class: "mode mode-plan", href: proInfo() ? "#/plan" : "#/buy" }, [
        ico("plan", "mi"),
        el("span", { class: "mtxt" }, [el("strong", { text: CFG.DAYS + "-din Exam Plan + Mock test" }), el("small", { text: proInfo() ? "Apna exam-date plan kholo" : "₹" + CFG.PRICE + " · sabhi answers + roz " + (CFG.PLAN_PER_DAY || 40) + " MCQ" })]),
        el("span", { class: "mbadge" + (proInfo() ? " pro" : " gold") }, [proInfo() ? "Active ✓" : "₹" + CFG.PRICE]),
        el("span", { class: "mgo" }, [proInfo() ? "Open" : "Plan dekho", ico("chev", "tiny")])
      ]),
      units.length ? el("section", { class: "unitsec" }, [
        el("div", { class: "sechead" }, [el("h2", null, [ico("book", "tiny"), " Syllabus units"]), el("span", { text: units.length + " units · PCI" })]),
        ulist
      ]) : null
    ];
  }

  function subject(id, kind) {
    var b = BANKS[id]; if (!b) { location.hash = "#/"; return; }
    kind = (kind === "long" || kind === "mcq" || kind === "short") ? kind : null;
    document.getElementById("backBtn").hidden = false; backTo = kind ? "#/" + id : "#/";
    document.getElementById("topTitle").textContent = b.code;
    document.getElementById("topSub").textContent = b.name;
    document.body.classList.add("in-subject");
    var set = todaySet(id);
    if (!kind) { app.replaceChildren.apply(app, [subjectHero(id, b, set, false), meterBox()].concat(subjectHub(id, b, set).filter(Boolean))); return; }
    var head = subjectHero(id, b, set, true);
    var tabs = modeCards(id, set, kind, true);
    var list = el("div", { class: "qlist" });
    var qs = [];
    function add(card, q) { card.setAttribute("data-unit", String(q.unit)); qs.push(q); list.appendChild(card); }
    if (kind === "mcq") {
      list.appendChild(sectionHead("Objective MCQs", "1 mark each · tap an option"));
      var score = el("div", { class: "mcqscore", "aria-live": "polite" });
      var bar = el("i");
      var upd = function () {
        var r = 0, d = 0; set.mcq.forEach(function (q) { var s = state.mcq[q.id]; if (s) { d++; if (s.ok) r++; } });
        bar.style.width = (set.mcq.length ? Math.round(100 * d / set.mcq.length) : 0) + "%";
        score.replaceChildren(el("span", { class: "msbar", "aria-hidden": "true" }, [bar]), el("b", { text: r + "/" + set.mcq.length }), el("span", { text: d === set.mcq.length ? (r >= 0.8 * set.mcq.length ? " Shandaar! 🎉" : r >= 0.5 * set.mcq.length ? " Achha hai, galat waale dobara padho" : " Revise karo, kal phir try karo") : " correct · " + d + "/" + set.mcq.length + " attempted" }));
      };
      set.mcq.forEach(function (q, i) { add(mcqCard(id, q, i + 1, b, upd), q); });
      if (!set.mcq.length) list.appendChild(el("p", { class: "empty", text: "MCQs coming soon." }));
      else { upd(); list.appendChild(score); }
    } else if (kind === "short") {
      list.appendChild(sectionHead("Section A", "2 marks each · " + set.a.length + " questions"));
      set.a.forEach(function (q, i) { add(questionCard(id, "short", q, i + 1, b, 2, i >= FREE_SAMPLE.short), q); });
      list.appendChild(sectionHead("Section C", "5 marks each · " + set.c.length + " questions"));
      set.c.forEach(function (q, i) { add(questionCard(id, "mid", q, i + 1, b, 5, set.a.length + i >= FREE_SAMPLE.short), q); });
    } else {
      list.appendChild(sectionHead("Section B", "10 marks each · " + set.b.length + " questions"));
      set.b.forEach(function (q, i) { add(questionCard(id, "long", q, i + 1, b, 10, i >= FREE_SAMPLE.long), q); });
    }
    app.replaceChildren(head, meterBox(), tabs, unitFilter(b, list, qs) || el("span"), list);
  }

  function mcqCard(subj, q, n, b, onDone, store) {
    store = store || { get: function (id) { return state.mcq[id]; }, put: function (id, r) { state.mcq[id] = r; persist(); recordActivity(); }, gated: true };
    var opts = q.options || q.o || [];
    var ans = (q.answer != null ? q.answer : (q.c != null ? q.c : q.ans));
    if (typeof ans === "string" && /^[A-Da-d]$/.test(ans)) ans = "abcd".indexOf(ans.toLowerCase());
    ans = Number(ans);
    var expl = q.explain || q.explanation || q.x || "";
    var res = el("div", { "aria-live": "polite" });
    var btns = [];
    function show(choice) {
      btns.forEach(function (bt, i) { bt.disabled = true; if (i === ans) bt.classList.add("right"); if (i === choice && choice !== ans) bt.classList.add("wrong"); });
      var ok = choice === ans;
      res.replaceChildren(el("div", { class: "result " + (ok ? "good" : "bad") }, [
        el("div", { class: "score" }, [el("b", { text: ok ? "✓ Sahi!" : "✗ Galat" }), el("span", { text: ok ? "" : "Correct: " + "ABCD"[ans] + ". " + (opts[ans] || "") })]),
        expl ? el("p", { class: "expl", text: expl }) : null
      ]));
    }
    opts.forEach(function (o, i) {
      var bt = el("button", { class: "opt", onclick: function () {
        if (store.get(q.id)) return;
        if (store.gated && !canAttempt()) { res.replaceChildren(limitBox()); res.scrollIntoView && res.scrollIntoView({ block: "nearest", behavior: "smooth" }); return; }
        if (store.gated) useOne();
        store.put(q.id, { s: subj, c: i, ok: i === ans }); show(i); onDone();
      } }, [el("span", { class: "letter", text: "ABCD"[i] }), el("span", { text: String(o) })]);
      btns.push(bt);
    });
    var card = el("article", { class: "q", id: "q-" + q.id }, [
      el("div", { class: "top" }, [el("span", { class: "num", text: String(n) }), el("span", { class: "unit", text: unitName(b, q.unit) }), el("span", { class: "marks", text: "1 mark" }), q.pyq ? el("span", { class: "pyq", text: "PYQ" }) : null]),
      el("h3", { text: q.q }),
      el("div", { class: "opts" }, btns),
      res
    ]);
    if (store.get(q.id)) show(store.get(q.id).c);
    return card;
  }

  // Free users: only the first FREE_SAMPLE.short short and FREE_SAMPLE.long long answers per set; the rest need the plan.
  var FREE_SAMPLE = { short: 2, long: 1 };
  function lockedCard(kind, q, n, b, marks) {
    // the model answer / key points are never put in the page for a locked card
    return el("article", { class: "q locked", id: "q-" + q.id }, [
      el("div", { class: "top" }, [el("span", { class: "num", text: String(n) }), el("span", { class: "unit", text: unitName(b, q.unit) }), el("span", { class: "marks", text: marks + " marks" }), q.pyq ? el("span", { class: "pyq", text: "PYQ" }) : null, el("span", { class: "done lockic" }, [ico("lock", "tiny")])]),
      el("h3", { text: q.q }),
      el("div", { class: "lockpanel" }, [ico("lock", "lp-ic"), el("p", { class: "locknote" }, ["Free mein sirf sample answers khule hain. ", el("b", { text: planGives() })])]),
      el("div", { class: "actions" }, [el("a", { class: "btn lockbtn", href: "#/buy" }, ["🔒 ₹" + CFG.PRICE + " plan lo — sabhi answers unlock"])])
    ]);
  }
  function questionCard(subj, kind, q, n, b, marks, sampleLocked) {
    if (sampleLocked && !proInfo()) return lockedCard(kind, q, n, b, marks);
    var saved = state.answers[q.id] || "";
    var ta = el("textarea", { class: kind === "long" ? "long" : kind === "mid" ? "mid" : "", placeholder: kind !== "short" ? "Apna answer yahan likho (intro, points, diagram, conclusion)…" : "Apna answer yahan likho…", "aria-label": "Your answer to question " + n });
    ta.value = saved;
    ta.addEventListener("input", function () { state.answers[q.id] = ta.value; persist(); });
    var res = el("div", { "aria-live": "polite" });
    var doneTag = el("span", { class: "done" });
    var checkBtn = el("button", { class: "btn", onclick: function () { doCheck(true); } }, ["Check"]);
    var showBtn = el("button", { class: "btn ghost", onclick: function () { res.replaceChildren(modelBox(kind, q, null)); } }, ["Show answer"]);
    function doCheck(user) {
      var text = ta.value.trim();
      if (!text) { if (user) toast("Pehle answer likho ✍️"); return; }
      var hits = check(text, q.kp);
      var got = hits.filter(Boolean).length, total = q.kp.length;
      if (user) {
        state.results[q.id] = { s: subj, got: got, total: total };
        persist(); recordActivity();
      }
      var ratio = got / total;
      var cls = ratio >= 0.8 ? "good" : ratio >= 0.5 ? "mid" : "bad";
      var verdict = ratio === 1 ? "Perfect! Saare key points aa gaye 🎉" : ratio >= 0.8 ? "Bahut badhiya, almost complete 👍" : ratio >= 0.5 ? "Thik hai, par kuch points missing hain" : "Incomplete – neeche model answer padho";
      var kpl = el("ul", { class: "kps" }, q.kp.map(function (kp, i) {
        return el("li", { class: hits[i] ? "hit" : "miss" }, [el("span", { class: "ic", "aria-hidden": "true", text: hits[i] ? "✓" : "✗" }), el("span", { text: kp.t + (hits[i] ? "" : " (missing)") })]);
      }));
      var box = el("div", { class: "result " + cls }, [
        el("div", { class: "score" }, [el("b", { text: got + "/" + total + " key points" }), el("span", { text: verdict })]),
        kpl
      ]);
      var kids = [box];
      if (ratio < 1) kids.push(modelBox(kind, q, hits));
      else kids.push(el("div", { class: "actions" }, [el("button", { class: "btn ghost", onclick: function (e) { e.target.replaceWith(modelBox(kind, q, hits)); } }, ["See model answer"])]));
      res.replaceChildren.apply(res, kids);
      doneTag.textContent = got + "/" + total;
      doneTag.style.color = "var(--" + (cls === "good" ? "good" : cls === "mid" ? "warn" : "bad") + ")";
    }
    var card = el("article", { class: "q", id: "q-" + q.id }, [
      el("div", { class: "top" }, [el("span", { class: "num", text: String(n) }), el("span", { class: "unit", text: unitName(b, q.unit) }), el("span", { class: "marks", text: marks + " marks" }), q.pyq ? el("span", { class: "pyq", text: "PYQ" }) : null, doneTag]),
      el("h3", { text: q.q }),
      q.hi ? el("p", { class: "hint" }, [el("b", { text: "Hint: " }), q.hi]) : null,
      ta,
      el("div", { class: "actions" }, [checkBtn, showBtn]),
      res
    ]);
    if (state.results[q.id] && saved.trim()) doCheck(false);
    return card;
  }

  function highlightMissing(text, kp, hits) {
    // mark the first occurrence of a missing key point's keyword inside the model answer text
    var frag = document.createDocumentFragment();
    if (!hits) { frag.appendChild(document.createTextNode(text)); return frag; }
    var ranges = [];
    var lower = text.toLowerCase();
    kp.forEach(function (p, i) {
      if (hits[i]) return;
      (p.k || []).some(function (kw) {
        var w = String(kw).toLowerCase().trim(); if (w.length < 3) return false;
        var at = lower.indexOf(w);
        if (at === -1) return false;
        var end = at + w.length; while (end < text.length && /[a-z0-9\-]/i.test(text[end])) end++;
        var start = at; while (start > 0 && /[a-z0-9]/i.test(text[start - 1])) start--;
        ranges.push([start, end]); return true;
      });
    });
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var pos = 0;
    ranges.forEach(function (r) { if (r[0] < pos) return; frag.appendChild(document.createTextNode(text.slice(pos, r[0]))); frag.appendChild(el("mark", { text: text.slice(r[0], r[1]) })); pos = r[1]; });
    frag.appendChild(document.createTextNode(text.slice(pos)));
    return frag;
  }

  function modelBox(kind, q, hits) {
    var box = el("div", { class: "model" }, [el("h4", { text: "Model answer" })]);
    var hl = function (t) { return highlightMissing(t, q.kp, hits); };
    if (typeof q.a === "string") {
      box.appendChild(el("p", null, [hl(String(q.a))]));
    } else {
      var a = q.a || {};
      if (a.intro) box.appendChild(el("p", null, [hl(a.intro)]));
      if (a.points && a.points.length) box.appendChild(el("ol", null, a.points.map(function (p) { return el("li", null, [hl(p)]); })));
      if (a.diagram) box.appendChild(el("p", { class: "diag" }, [el("b", { text: "Diagram: " }), hl(a.diagram)]));
      if (a.conclusion) box.appendChild(el("p", null, [hl(a.conclusion)]));
    }
    if (hits && hits.some(function (h) { return !h; })) box.appendChild(el("p", { class: "hint" }, ["Yellow = jo points tumhare answer mein missing the."]));
    return box;
  }

  // ---------- free tier + ₹49 plan ----------
  var DAY_MS = 86400000;
  function proInfo() { var p = load("pro", null); return (p && p.until > Date.now()) ? p : null; }
  function freeUsed() { return Number(load("free_" + today, 0)) || 0; }
  // one daily MCQ counter: free users FREE_PER_DAY, plan users PLAN_PER_DAY (IST day)
  function mcqLimit() { return proInfo() ? (CFG.PLAN_PER_DAY || 40) : CFG.FREE_PER_DAY; }
  function freeLeft() { return Math.max(0, mcqLimit() - freeUsed()); }
  function canAttempt() { return freeLeft() > 0; }
  function useOne() { save("free_" + today, freeUsed() + 1); refreshMeters(); }
  function planGives() { return "₹" + CFG.PRICE + " plan lene par: sabhi " + (PER_DAY.a + PER_DAY.c) + " Short + " + PER_DAY.b + " Long answers + roz " + (CFG.PLAN_PER_DAY || 40) + " MCQ + " + CFG.DAYS + "-din exam plan"; }
  (function cleanOldFree() { try { for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (k && k.indexOf(LS + "free_") === 0 && k !== LS + "free_" + today) localStorage.removeItem(k); } } catch (e) {} })();
  function shortDate(ms) { return prettyDate(istKey(new Date(ms + 330 * 60000))).replace(/^\w+, /, ""); }
  function waLink(text) { return "https://wa.me/" + CFG.WHATSAPP + "?text=" + encodeURIComponent(text); }
  function upiLink() { return "upi://pay?pa=" + encodeURIComponent(CFG.UPI_ID) + "&pn=" + encodeURIComponent(CFG.PAYEE_NAME) + "&am=" + CFG.PRICE + "&cu=INR&tn=" + encodeURIComponent(CFG.NOTE); }
  function upiReady() { return CFG.UPI_ID && CFG.UPI_ID !== "PENDING" && CFG.UPI_ID.indexOf("@") > 0; }

  function meterBox() {
    var box = el("div", { class: "meter", "data-meter": "1" });
    fillMeter(box); return box;
  }
  function fillMeter(box) {
    var p = proInfo();
    var left = freeLeft();
    box.classList.toggle("empty0", left === 0);
    if (p) box.replaceChildren(el("span", null, [el("span", { class: "mt-pro", text: "✓ Plan active" }), " · ", el("b", { text: left + "/" + mcqLimit() }), " MCQ bache aaj"]), el("span", { class: "mt-till", text: shortDate(p.until) + " tak" }));
    else box.replaceChildren(el("span", null, [el("b", { text: left + "/" + CFG.FREE_PER_DAY }), " free MCQ bache aaj"]), el("a", { href: "#/buy", text: "₹" + CFG.PRICE + " plan →" }));
  }
  function refreshMeters() { Array.prototype.forEach.call(document.querySelectorAll("[data-meter]"), fillMeter); }

  function limitBox() {
    if (proInfo()) return el("div", { class: "limit", role: "alert" }, [
      el("p", { class: "lt", text: "Aaj ke " + mcqLimit() + " MCQ pure ho gaye 💪" }),
      el("p", { text: "Kal phir " + mcqLimit() + " naye MCQ milenge. Tab tak short/long answers aur apna exam plan padho." }),
      el("a", { class: "btn", href: "#/plan" }, ["Mera plan kholo"])
    ]);
    return el("div", { class: "limit", role: "alert" }, [
      el("p", { class: "lt", text: "Aaj ki free limit khatam 🙏" }),
      el("p", { text: "Aaj ke " + CFG.FREE_PER_DAY + " free MCQ ho gaye. Kal phir " + CFG.FREE_PER_DAY + " free milenge. Notes aur syllabus free hi rahenge." }),
      el("p", { class: "gives" }, [el("b", { text: planGives() })]),
      el("a", { class: "btn", href: "#/buy" }, ["₹" + CFG.PRICE + " Plan lo"])
    ]);
  }

  function planPromo() {
    var p = proInfo(), ps = load("plan2", null);
    if (p) {
      var plan = ps && ps.exam ? PCI.buildPlan(ps.start, ps.exam, CFG.DAYS) : null;
      var cur = plan && !plan.error ? Math.min(plan.total, dayNumber(today) - dayNumber(plan.start) + 1) : 0;
      return el("a", { class: "promo pro", href: "#/plan" }, [
        el("span", { class: "pt", text: plan && !plan.error ? "Your exam plan · Day " + Math.max(1, cur) + " of " + plan.total : "₹" + CFG.PRICE + " Plan active ✓" }),
        el("span", { class: "ps", text: plan && !plan.error ? "Aaj ke topics aur daily quiz dekho →" : "Exam date daalo, plan ready ho jayega →" })
      ]);
    }
    return el("div", { class: "promo" }, [
      el("span", { class: "badge", text: "₹" + CFG.PRICE + " · " + CFG.DAYS + " din" }),
      el("span", { class: "pt", text: "Exam date daalo → apna 30-din ka plan" }),
      el("span", { class: "ps", text: "Sabhi short + long answers, roz " + (CFG.PLAN_PER_DAY || 40) + " MCQ, daily topics, revision days aur exam se pehle mock test." }),
      el("div", { class: "row2" }, [el("a", { class: "btn", href: "#/plan" }, ["Plan banao"]), el("a", { class: "btn ghost", href: "#/buy" }, ["₹" + CFG.PRICE + " Plan lo"])])
    ]);
  }

  function setTop(title, sub, back) {
    var bb = document.getElementById("backBtn"); bb.hidden = false; backTo = back || "#/";
    document.getElementById("topTitle").textContent = title;
    document.getElementById("topSub").textContent = sub;
    document.body.classList.add("in-subject");
  }

  // ---------- unlock ----------
  function unlock(raw) {
    var code = PCI.normCode(raw);
    if (!code || code.length < 8) return { ok: false, msg: "Code poora likho, jaise PCI-AB12CD" };
    var hashes = window.PCI_CODE_HASHES || [];
    var h = PCI.codeHash(code);
    if (hashes.indexOf(h) === -1) return { ok: false, msg: "Ye code sahi nahi hai. Check karke dobara likho." };
    var used = load("used_codes", []), p = proInfo();
    if (p && p.h === h.slice(0, 16)) return { ok: true, msg: "Plan pehle se active hai ✓" };
    if (used.indexOf(h.slice(0, 16)) !== -1) return { ok: false, msg: "Ye code is phone pe pehle use ho chuka hai. Naye " + CFG.DAYS + " din ke liye naya code lo." };
    var start = p ? p.until : Date.now();
    save("pro", { until: start + CFG.DAYS * DAY_MS, at: Date.now(), h: h.slice(0, 16) });
    used.push(h.slice(0, 16)); save("used_codes", used);
    return { ok: true, msg: "🎉 Plan unlock ho gaya! " + CFG.DAYS + " din: sabhi answers + roz " + (CFG.PLAN_PER_DAY || 40) + " MCQ." };
  }
  function codeBox() {
    var inp = el("input", { type: "text", class: "codein", placeholder: "PCI-XXXXXX", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", "aria-label": "Unlock code" });
    var msg = el("p", { class: "codemsg", "aria-live": "polite" });
    function go() {
      var r = unlock(inp.value);
      msg.textContent = r.msg; msg.className = "codemsg " + (r.ok ? "ok" : "err");
      if (r.ok) { refreshMeters(); toast(r.msg); setTimeout(function () { location.hash = "#/plan"; if (location.hash === "#/plan") route(); }, 900); }
    }
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    return el("div", { class: "codebox", id: "unlock" }, [
      el("label", { class: "cl", text: "Unlock code daalo" }),
      el("div", { class: "coderow" }, [inp, el("button", { class: "btn", type: "button", onclick: go }, ["Unlock"])]),
      msg
    ]);
  }

  // ---------- buy page ----------
  function buyPage() {
    setTop("₹" + CFG.PRICE + " Exam Plan", "PCI 3rd Semester · " + CFG.DAYS + " days", "#/plan");
    var p = proInfo();
    var head = el("section", { class: "subhead" }, [el("h1", { text: "₹" + CFG.PRICE + " Plan lo" }), el("p", { text: CFG.DAYS + " din ke liye, ek baar ka payment. Koi auto-renew nahi." }), el("p", { class: "gives" }, [el("b", { text: planGives() })])]);
    var perks = el("ul", { class: "perks" }, [
      "Apni exam date daalo → " + CFG.DAYS + "-din ka personal study plan (sab 4 subjects, 20 units)",
      "Har din ke topics + us din ka quiz",
      "Revision days aur exam se pehle full mock test",
      "Sabhi " + (PER_DAY.a + PER_DAY.c) + " Short + " + PER_DAY.b + " Long model answers + answer check, har subject (free mein sirf 2 short + 1 long sample)",
      "Roz " + (CFG.PLAN_PER_DAY || 40) + " MCQ (free mein " + CFG.FREE_PER_DAY + "/din)",
      "Progress ticks: kitne din pure hue, sab phone pe saved"
    ].map(function (t) { return el("li", { text: t }); }));
    var kids = [head];
    if (p) kids.push(el("div", { class: "okbar" }, [el("b", { text: "✓ Plan active hai" }), " · " + shortDate(p.until) + " tak. ", el("a", { href: "#/plan", text: "Plan kholo →" })]));
    kids.push(el("div", { class: "paycard" }, [el("div", { class: "price" }, [el("b", { text: "₹" + CFG.PRICE }), el("span", { text: " / " + CFG.DAYS + " din" })]), perks]));
    var step1 = el("div", { class: "step" }, [el("span", { class: "sn", text: "1" }), el("div", null, [el("h3", { text: "₹" + CFG.PRICE + " pay karo (koi bhi UPI app)" })])]);
    var payBody = step1.lastChild;
    var ready = upiReady();
    var qrWrap = el("div", { class: "qr" + (ready ? "" : " pending"), role: "img", "aria-label": ready ? "UPI QR code for ₹" + CFG.PRICE : "Payment option coming soon" });
    if (ready) {
      try { var qr = window.qrcode(0, "M"); qr.addData(upiLink()); qr.make(); qrWrap.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); } catch (e) { qrWrap.textContent = "QR load nahi hua, neeche UPI ID use karo."; }
    } else {
      qrWrap.appendChild(el("span", { class: "qrwait" }, [el("b", { text: "⏳" }), "Payment option jaldi aa raha hai"]));
    }
    var upiCard = el("div", { class: "upicard" }, [
      el("p", { class: "uc-s", text: ready ? "Scan this code to pay" : "UPI payment" }),
      el("p", { class: "uc-n", text: CFG.PAYEE_NAME }),
      qrWrap,
      ready ? el("div", { class: "uc-id" }, [el("span", { text: "UPI ID: " }), el("b", { text: CFG.UPI_ID }), el("button", { class: "uc-copy", type: "button", onclick: function () {
        var done = function () { toast("UPI ID copy ho gaya"); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(CFG.UPI_ID).then(done, function () { fallbackCopy(CFG.UPI_ID); done(); }); else { fallbackCopy(CFG.UPI_ID); done(); }
      } }, ["Copy"])]) : el("p", { class: "uc-id", text: "Thodi der mein yahan QR aur UPI ID lag jayegi." }),
      el("p", { class: "uc-amt", text: "Amount: ₹" + CFG.PRICE })
    ]);
    payBody.appendChild(el("p", { class: "muted", text: ready ? "QR scan karo (PhonePe, GPay, Paytm, BHIM). Amount ₹" + CFG.PRICE + " pehle se bhara hoga." : "Payment option jaldi aa raha hai. Tab tak plan ka preview free mein dekho." }));
    payBody.appendChild(upiCard);
    if (ready) {
      payBody.appendChild(el("a", { class: "btn upibtn", href: upiLink() }, ["Pay ₹" + CFG.PRICE + " with any UPI app"]));
      payBody.appendChild(el("p", { class: "muted small", text: "Button phone par kaam karta hai. Laptop par ho to QR scan karo." }));
    }
    var waText = "Hi, maine ₹" + CFG.PRICE + " PCI Plan ka payment kiya hai. Screenshot bhej raha/rahi hoon, unlock code de do.";
    var step2 = el("div", { class: "step" }, [el("span", { class: "sn", text: "2" }), el("div", null, [
      el("h3", { text: "Screenshot WhatsApp karo" }),
      el("p", { text: "Payment karke screenshot WhatsApp karo, aapko unlock code milega." }),
      el("a", { class: "wa-btn", href: waLink(waText), target: "_blank", rel: "noopener" }, ["WhatsApp pe screenshot bhejo"])
    ])]);
    var step3 = el("div", { class: "step" }, [el("span", { class: "sn", text: "3" }), el("div", null, [el("h3", { text: "Code daalo, plan unlock" }), el("p", { class: "muted", text: "Ek code ek student, ek phone ke liye. " + CFG.DAYS + " din chalega." }), codeBox()])]);
    kids.push(step1, step2, step3);
    kids.push(el("p", { class: "note center", text: "Notes, syllabus, sample answers aur roz " + CFG.FREE_PER_DAY + " MCQ hamesha free rahenge." }));
    app.replaceChildren.apply(app, kids);
  }
  function fallbackCopy(t) { var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove(); }

  // ---------- plan page ----------
  var TYPE = { learn: ["Learn", "ph-learn"], revise: ["Revision", "ph-revise"], final: ["Final revision", "ph-final"], mock: ["Mock test", "ph-mock"] };
  function planQuestions(day, plan) {
    var per = day.type === "mock" ? 0 : day.type === "learn" ? (day.quiz.length >= 3 ? 6 : 10) : day.type === "final" ? 2 : 4;
    var out = [];
    if (day.type === "mock") {
      ["bp301t", "bp302t", "bp303t", "bp304t"].forEach(function (s) { if (BANKS[s]) out = out.concat(seeded(mcqList(BANKS[s]), "mock" + plan.exam).slice(0, 10).map(function (q) { return [s, q]; })); });
      return out;
    }
    day.quiz.forEach(function (x) {
      var b = BANKS[x[0]]; if (!b) return;
      var qs = mcqList(b).filter(function (q) { return Number(q.unit) === Number(x[1]); });
      out = out.concat(seeded(qs, day.n + ":" + plan.exam + ":" + x[0] + x[1]).slice(0, per).map(function (q) { return [x[0], q]; }));
    });
    return out.slice(0, day.type === "final" ? 40 : 25);
  }
  function seeded(arr, key) {
    var h = 2166136261; for (var i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
    var s = h >>> 0, a = arr.slice();
    function r() { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(r() * (j + 1)); var t = a[j]; a[j] = a[k]; a[k] = t; }
    return a;
  }
  function unitLabel(s, u) { var x = PCI.SYL[s] && PCI.SYL[s][String(u)]; return "Unit " + u + ": " + (x ? x.n : ""); }
  function dayCard(day, plan, ps, cur, locked) {
    var t = TYPE[day.type];
    var lines = [];
    if (day.type === "learn") day.sessions.forEach(function (x) {
      var syl = PCI.SYL[x[0]] && PCI.SYL[x[0]][String(x[1])];
      var topic = syl ? (x[2] ? syl.p[x[2] - 1] : syl.p.join("; ")) : "";
      lines.push(el("li", null, [el("span", { class: "s s-" + x[0], text: PCI.SHORT[x[0]] }), el("span", { class: "w" }, [el("b", { text: unitLabel(x[0], x[1]) + (x[2] ? " (part " + x[2] + "/2)" : "") }), topic ? el("small", { text: topic }) : null])]));
    });
    else if (day.type === "revise") {
      var bySub = {};
      day.quiz.forEach(function (x) { (bySub[x[0]] = bySub[x[0]] || []).push(x[1]); });
      Object.keys(bySub).forEach(function (s) { lines.push(el("li", null, [el("span", { class: "s s-" + s, text: PCI.SHORT[s] }), el("span", { class: "w", text: (bySub[s].length === 5 ? "Full subject revision, units 1–5" : "Revise unit " + bySub[s].join(", ")) + ": notes, diagrams, reactions, key points" })])); });
      lines.push(el("li", null, [el("span", { class: "s", text: "Write" }), el("span", { class: "w", text: "1 Section C answer on paper from these units, then check with the model answer" })]));
    } else if (day.type === "final") {
      lines.push(el("li", null, [el("span", { class: "s", text: "All 4" }), el("span", { class: "w", text: "Final revision: definitions, formulas, mechanisms, labelled diagrams of all 20 units. No new topics today." })]));
    } else {
      lines.push(el("li", null, [el("span", { class: "s", text: "Mock" }), el("span", { class: "w", text: "Full mock: 40 MCQs (10 per subject) below + write 1 Section B and 2 Section C answers per subject in exam time (3 h). Sleep early 😴" })]));
    }
    var qn = planQuestions(day, plan).length;
    var done = !!(ps.done && ps.done[day.n]);
    var sc = ps.scores && ps.scores[day.n];
    var tick = el("button", { class: "tick" + (done ? " on" : ""), type: "button", "aria-pressed": String(done), onclick: function () {
      ps.done = ps.done || {}; if (ps.done[day.n]) delete ps.done[day.n]; else ps.done[day.n] = 1; save("plan2", ps); planPage(true);
    } }, [done ? "✓ Done" : "Mark done"]);
    var foot = el("div", { class: "pfoot" }, [
      el("a", { class: "btn sm qbtn", href: "#/plan/day/" + day.n }, [(day.type === "mock" ? "Mock test" : "Daily quiz") + " · " + qn + " Qs" + (sc ? " · " + sc.r + "/" + sc.t : "")]),
      tick
    ]);
    var li = el("li", { class: "pday " + t[1] + (day.n === cur ? " today" : "") + (day.n < cur ? " past" : "") + (done ? " isdone" : ""), "data-day": String(day.n) }, [
      el("div", { class: "dh" }, [el("b", { text: "Day " + day.n }), el("span", { class: "dd", text: prettyDate(day.date).replace(/ \d{4}$/, "") }), el("span", { class: "tag", text: t[0] })]),
      el("ul", null, lines),
      locked ? null : foot
    ]);
    return li;
  }
  function planPage(keepScroll) {
    setTop("Exam Plan", "PCI 3rd Semester", "#/");
    var y = window.pageYOffset;
    var p = proInfo(), ps = load("plan2", null) || {};
    var kids = [el("section", { class: "subhead" }, [el("h1", { text: "Your exam plan" }), el("p", { text: "Exam date daalo, plan apne aap ban jayega: PCI ke 4 subjects, 20 units." })])];
    kids.push(meterBox());
    var dateIn = el("input", { type: "date", class: "datein", min: istKey(new Date(Date.parse(today + "T00:00:00Z") + DAY_MS)), "aria-label": "Exam date" });
    if (ps.exam) dateIn.value = ps.exam;
    var err = el("p", { class: "codemsg err", "aria-live": "polite" });
    var form = el("div", { class: "planform" }, [
      el("label", { class: "cl", text: ps.exam ? "Exam date (badalna ho to)" : "Pehla paper kab hai?" }),
      el("div", { class: "coderow" }, [dateIn, el("button", { class: "btn", type: "button", onclick: function () {
        var v = dateIn.value;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { err.textContent = "Date chuno"; return; }
        if (dayNumber(v) <= dayNumber(today)) { err.textContent = "Exam date aaj ke baad ki honi chahiye"; return; }
        if (ps.exam === v) { toast("Same date hai"); return; }
        save("plan2", { exam: v, start: today, done: {}, scores: {} }); toast("Plan ready ✓"); planPage();
      } }, [ps.exam ? "Update" : "Plan banao"])]),
      err
    ]);
    kids.push(form);
    if (ps.exam) {
      var plan = PCI.buildPlan(ps.start, ps.exam, CFG.DAYS);
      if (plan.error) { kids.push(el("p", { class: "empty", text: "Ye exam date nikal chuki hai. Nayi date daalo." })); }
      else {
        var cur = dayNumber(today) - dayNumber(plan.start) + 1;
        var doneN = Object.keys(ps.done || {}).length;
        var status = cur > plan.total ? (dayNumber(today) >= dayNumber(plan.exam) ? "Exam aa gaya. All the best! 🎯" : "Plan ke din pure. Ab revision + mock dobara karo.") : "Aaj Day " + cur + " of " + plan.total + " hai.";
        kids.push(el("div", { class: "planbar" }, [
          el("p", null, [el("b", { text: status }), " Exam: " + prettyDate(plan.exam) + (plan.gap > CFG.DAYS ? " (plan ke " + CFG.DAYS + " din ke baad bhi revision chalu rakho)" : "")]),
          el("div", { class: "pbar", "aria-label": doneN + " of " + plan.total + " days done" }, [el("i", { style: "width:" + Math.round(100 * doneN / plan.total) + "%" })]),
          el("small", { text: doneN + "/" + plan.total + " din done" })
        ]));
        kids.push(el("div", { class: "legend" }, [el("span", { class: "lg ph-learn", text: "Learn" }), el("span", { class: "lg ph-revise", text: "Revision" }), el("span", { class: "lg ph-final", text: "Final revision" }), el("span", { class: "lg ph-mock", text: "Mock test" })]));
        var list = el("ol", { class: "plan", id: "planList" });
        if (p) plan.days.forEach(function (d) { list.appendChild(dayCard(d, plan, ps, cur, false)); });
        else plan.days.slice(0, 2).forEach(function (d) { list.appendChild(dayCard(d, plan, ps, cur, true)); });
        list.appendChild(el("li", { class: "pday examday" }, [el("div", { class: "dh" }, [el("b", { text: "🎯 Exam" }), el("span", { class: "dd", text: prettyDate(plan.exam).replace(/ \d{4}$/, "") })]), el("p", { text: "All the best! Time plan follow karo, har sawal attempt karo." })]));
        kids.push(list);
        if (!p) {
          var hidden = plan.total - 2;
          kids.push(el("div", { class: "lockcard" }, [
            el("p", { class: "lt", text: "🔒 Baaki " + Math.max(0, hidden) + " din ka plan + daily quiz locked hai" }),
            el("p", { class: "gives" }, [el("b", { text: planGives() })]),
            el("p", { text: "Poora plan, har din ka quiz, revision + mock test." }),
            el("a", { class: "btn", href: "#/buy" }, ["₹" + CFG.PRICE + " Plan lo"]),
            codeBox()
          ]));
          // the locked list is shown first; move lock card right after the 2 preview days
          list.insertBefore(kids.pop(), list.lastChild);
        }
      }
    } else if (!p) {
      kids.push(el("div", { class: "lockcard soft" }, [el("p", { text: "Plan free mein dekh sakte ho (pehle 2 din). Poora plan + daily quiz: ₹" + CFG.PRICE + "." }), el("a", { class: "btn ghost", href: "#/buy" }, ["₹" + CFG.PRICE + " Plan lo"]), codeBox()]));
    }
    app.replaceChildren.apply(app, kids);
    if (keepScroll) window.scrollTo(0, y);
  }
  function scrollToToday() {
    var t = document.querySelector("#planList .today"); if (!t) return false;
    var y = t.getBoundingClientRect().top + window.pageYOffset - 80; window.scrollTo(0, Math.max(0, y)); return true;
  }

  function planQuiz(n) {
    var ps = load("plan2", null);
    if (!proInfo()) { location.replace("#/buy"); return; }
    if (!ps || !ps.exam) { location.replace("#/plan"); return; }
    var plan = PCI.buildPlan(ps.start, ps.exam, CFG.DAYS);
    var day = plan.days && plan.days[n - 1];
    if (!day) { location.replace("#/plan"); return; }
    setTop("Day " + n + " quiz", TYPE[day.type][0] + " · " + prettyDate(day.date), "#/plan");
    var qs = planQuestions(day, plan);
    var key = "planq_" + ps.exam + "_" + n;
    var st = load(key, {});
    var store = { get: function (id) { return st[id]; }, put: function (id, r) { st[id] = r; save(key, st); recordActivity(); }, gated: false };
    var score = el("div", { class: "mcqscore", "aria-live": "polite" });
    var upd = function () {
      var r = 0, d = 0; qs.forEach(function (x) { var s = st[x[1].id]; if (s) { d++; if (s.ok) r++; } });
      score.replaceChildren(el("b", { text: r + "/" + qs.length }), el("span", { text: d === qs.length ? " · Day " + n + " done ✓" : " correct · " + d + "/" + qs.length + " attempted" }));
      if (d === qs.length && qs.length) {
        ps.scores = ps.scores || {}; ps.done = ps.done || {};
        if (!ps.done[n] || !ps.scores[n] || ps.scores[n].r !== r) { ps.scores[n] = { r: r, t: qs.length }; ps.done[n] = 1; save("plan2", ps); }
      }
    };
    var head = el("section", { class: "subhead" }, [el("h1", { text: "Day " + n + " · " + (day.type === "mock" ? "Mock test" : "Daily quiz") }), el("p", { text: qs.length + " MCQs from today's units · 1 mark each" })]);
    var list = el("div");
    var lastS = null;
    qs.forEach(function (x, i) {
      if (x[0] !== lastS) { list.appendChild(sectionHead(BANKS[x[0]].name, BANKS[x[0]].code)); lastS = x[0]; }
      list.appendChild(mcqCard(x[0], x[1], i + 1, BANKS[x[0]], upd, store));
    });
    upd(); list.appendChild(score);
    list.appendChild(el("div", { class: "actions center" }, [el("a", { class: "btn ghost", href: "#/plan" }, ["← Back to plan"])]));
    app.replaceChildren(head, list);
  }
  // ---------- router ----------
  var SECTIONS = ["practice", "how", "syllabus", "tips", "faq", "about", "contact"];
  function route() {
    var nowKey = istKey();
    if (nowKey !== today) { today = nowKey; state = load("day_" + today, { answers: {}, results: {}, mcq: {} }); state.mcq = state.mcq || {}; }
    var parts = (location.hash || "#/").replace(/^#\/?/, "").split("/");
    var more = document.getElementById("more");
    if (parts[0] && BANKS[parts[0]]) { more.hidden = true; subject(parts[0], parts[1]); window.scrollTo(0, 0); return; }
    if (parts[0] === "plan" || parts[0] === "buy") {
      more.hidden = true;
      if (parts[0] === "buy") buyPage(); else if (parts[1] === "day") planQuiz(Number(parts[2])); else planPage();
      if (!(parts[0] === "plan" && !parts[1] && scrollToToday())) window.scrollTo(0, 0);
      return;
    }
    more.hidden = false;
    home();
    var target = SECTIONS.indexOf(parts[0]) >= 0 ? document.getElementById(parts[0]) : null;
    if (target) { var y = target.getBoundingClientRect().top + window.pageYOffset - 70; window.scrollTo(0, Math.max(0, y)); }
    else window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
