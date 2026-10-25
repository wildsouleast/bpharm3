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
  document.getElementById("backBtn").addEventListener("click", function () { location.hash = "#/"; });

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
    document.getElementById("topSub").textContent = "3rd Semester · BUHS / PCI";
    document.body.classList.remove("in-subject");
    var t = todayTotals(), m = mcqTotals();
    var hero = el("section", { class: "hero", "aria-labelledby": "hero-h" }, [
      el("p", { class: "eyebrow light", text: "BUHS · PCI syllabus · " + prettyDate(today) }),
      el("h1", { id: "hero-h" }, ["Welcome to ", el("span", { class: "grad", text: "B.Pharm" })]),
      el("p", { class: "tagline", text: "3rd Semester Study Plan" }),
      el("p", { class: "sub", text: "Every day, for each of the 4 subjects: " + PER_DAY.mcq + " MCQs, " + PER_DAY.a + " two-mark, " + PER_DAY.c + " five-mark and " + PER_DAY.b + " ten-mark questions, checked instantly with model answers. Plus the full syllabus, a 30-day plan and exam tips. Free, no login." }),
      el("div", { class: "cta" }, [
        el("a", { class: "btn hero-btn", href: "#/practice" }, ["Start today's practice"]),
        el("a", { class: "btn hero-ghost", href: "#/plan" }, ["30-day plan"])
      ]),
      el("ul", { class: "facts" }, [
        el("li", null, [el("b", { text: "4" }), " subjects"]),
        el("li", null, [el("b", { text: String(4 * ALL_TODAY) }), " Qs a day"]),
        el("li", null, [el("b", { text: "520" }), " Qs in bank"]),
        el("li", null, [el("b", { text: "75" }), " marks paper"])
      ])
    ]);
    var chips = el("nav", { class: "chips", "aria-label": "Jump to section" }, [
      ["#/how", "How it works"], ["#/syllabus", "Syllabus"], ["#/plan", "30-day plan"], ["#/tips", "Exam tips"], ["#/faq", "FAQ"], ["#/about", "Creator"], ["#/contact", "Contact"]
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
      var done = todayTotals(s.id).done + mcqTotals(s.id).done;
      var card = el("article", { class: "subject", style: "--accent:var(" + s.accent + ")" }, [
        el("div", { class: "code", text: b.code }),
        el("h3", { text: b.name }),
        el("p", { class: "meta", text: done + "/" + ALL_TODAY + " done today · bank: " + mcqList(b).length + " MCQ, " + (p.a.length + p.c.length) + " short, " + p.b.length + " long" }),
        el("div", { class: "row three" }, [
          el("a", { class: "pill", href: "#/" + s.id + "/mcq" }, [el("strong", { text: "MCQ" }), el("small", { text: PER_DAY.mcq + " today" })]),
          el("a", { class: "pill", href: "#/" + s.id + "/short" }, [el("strong", { text: "Short Answer" }), el("small", { text: (PER_DAY.a + PER_DAY.c) + " today" })]),
          el("a", { class: "pill", href: "#/" + s.id + "/long" }, [el("strong", { text: "Long Answer" }), el("small", { text: PER_DAY.b + " today" })])
        ]),
        el("div", { class: "progress", "aria-hidden": "true" }, [el("i", { style: "width:" + Math.round(100 * done / ALL_TODAY) + "%" })])
      ]);
      grid.appendChild(card);
    });
    var practice = el("section", { class: "sec first", id: "practice", "aria-labelledby": "prac-h" }, [
      el("p", { class: "eyebrow", text: "Today's practice" }),
      el("h2", { id: "prac-h", text: "Pick a subject" }),
      el("p", { class: "lead", text: "Aaj ke naye questions ready hain. Answer likho, Check dabao." }),
      stats, grid
    ]);
    app.replaceChildren(hero, chips, practice);
  }

  function sectionHead(title, sub) { return el("div", { class: "sechead" }, [el("h2", { text: title }), el("span", { text: sub })]); }

  function subject(id, kind) {
    var b = BANKS[id]; if (!b) { location.hash = "#/"; return; }
    kind = (kind === "long" || kind === "mcq") ? kind : "short";
    document.getElementById("backBtn").hidden = false;
    document.getElementById("topTitle").textContent = b.code;
    document.getElementById("topSub").textContent = b.name;
    document.body.classList.add("in-subject");
    var set = todaySet(id);
    var head = el("section", { class: "subhead" }, [el("h1", { text: b.name }), el("p", { text: "Today's set · " + prettyDate(today) + " · exam pattern: 75 marks, 3 hrs" })]);
    var labels = { mcq: "MCQ (" + set.mcq.length + ")", short: "Short (" + (set.a.length + set.c.length) + ")", long: "Long (" + set.b.length + ")" };
    var tabs = el("div", { class: "tabs", role: "tablist" }, ["mcq", "short", "long"].map(function (k) {
      return el("button", { class: "tab", role: "tab", "aria-selected": String(k === kind), onclick: function () { location.hash = "#/" + id + "/" + k; } }, [labels[k]]);
    }));
    var list = el("div");
    if (kind === "mcq") {
      list.appendChild(sectionHead("Objective MCQs", "1 mark each · tap an option"));
      var score = el("div", { class: "mcqscore", "aria-live": "polite" });
      var upd = function () {
        var r = 0, d = 0; set.mcq.forEach(function (q) { var s = state.mcq[q.id]; if (s) { d++; if (s.ok) r++; } });
        score.replaceChildren(el("b", { text: r + "/" + set.mcq.length }), el("span", { text: d === set.mcq.length ? (r >= 0.8 * set.mcq.length ? " Shandaar! 🎉" : r >= 0.5 * set.mcq.length ? " Achha hai, galat waale dobara padho" : " Revise karo, kal phir try karo") : " correct · " + d + "/" + set.mcq.length + " attempted" }));
      };
      set.mcq.forEach(function (q, i) { list.appendChild(mcqCard(id, q, i + 1, b, upd)); });
      if (!set.mcq.length) list.appendChild(el("p", { class: "empty", text: "MCQs coming soon." }));
      else { upd(); list.appendChild(score); }
    } else if (kind === "short") {
      list.appendChild(sectionHead("Section A", "2 marks each · " + set.a.length + " questions"));
      set.a.forEach(function (q, i) { list.appendChild(questionCard(id, "short", q, i + 1, b, 2)); });
      list.appendChild(sectionHead("Section C", "5 marks each · " + set.c.length + " questions"));
      set.c.forEach(function (q, i) { list.appendChild(questionCard(id, "mid", q, i + 1, b, 5)); });
    } else {
      list.appendChild(sectionHead("Section B", "10 marks each · " + set.b.length + " questions"));
      set.b.forEach(function (q, i) { list.appendChild(questionCard(id, "long", q, i + 1, b, 10)); });
    }
    app.replaceChildren(head, tabs, list);
  }

  function mcqCard(subj, q, n, b, onDone) {
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
        if (state.mcq[q.id]) return;
        state.mcq[q.id] = { s: subj, c: i, ok: i === ans }; persist(); recordActivity(); show(i); onDone();
      } }, [el("span", { class: "letter", text: "ABCD"[i] }), el("span", { text: String(o) })]);
      btns.push(bt);
    });
    var card = el("article", { class: "q", id: "q-" + q.id }, [
      el("div", { class: "top" }, [el("span", { class: "num", text: String(n) }), el("span", { class: "unit", text: unitName(b, q.unit) }), el("span", { class: "marks", text: "1 mark" }), q.pyq ? el("span", { class: "pyq", text: "PYQ" }) : null]),
      el("h3", { text: q.q }),
      el("div", { class: "opts" }, btns),
      res
    ]);
    if (state.mcq[q.id]) show(state.mcq[q.id].c);
    return card;
  }

  function questionCard(subj, kind, q, n, b, marks) {
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

  // ---------- 30-day plan dates ----------
  function setupPlan() {
    var list = document.getElementById("planList"); if (!list) return;
    var status = document.getElementById("planStatus");
    var start = load("plan_start", null);
    if (!start) { start = today; save("plan_start", start); }
    var startN = Date.parse(start + "T00:00:00Z"), todayN = Date.parse(today + "T00:00:00Z");
    var cur = Math.floor((todayN - startN) / 86400000) + 1;
    Array.prototype.forEach.call(list.querySelectorAll(".pday"), function (li) {
      var d = Number(li.getAttribute("data-day"));
      var key = new Date(startN + (d - 1) * 86400000).toISOString().slice(0, 10);
      li.querySelector(".dd").textContent = prettyDate(key).replace(/ \d{4}$/, "");
      li.classList.toggle("today", d === cur);
      li.classList.toggle("past", d < cur);
    });
    if (cur >= 1 && cur <= 30) status.replaceChildren(el("b", { text: "Today is Day " + cur + " of 30." }), " " + (cur === 1 ? "Start with the first two units." : "Pichla din chhoot gaya? Catch-up days 21 and 26 hain."));
    else if (cur > 30) status.textContent = "Your 30 days are done. Restart the plan for another round.";
    else status.textContent = "Your plan starts " + prettyDate(start) + ".";
  }
  document.getElementById("planReset").addEventListener("click", function () {
    save("plan_start", today); setupPlan(); toast("Plan starts today: Day 1");
    var t = document.querySelector("#planList .today"); if (t && t.scrollIntoView) t.scrollIntoView({ block: "center", behavior: "smooth" });
  });

  // ---------- router ----------
  var SECTIONS = ["practice", "how", "syllabus", "plan", "tips", "faq", "about", "contact"];
  function route() {
    var nowKey = istKey();
    if (nowKey !== today) { today = nowKey; state = load("day_" + today, { answers: {}, results: {}, mcq: {} }); state.mcq = state.mcq || {}; }
    var parts = (location.hash || "#/").replace(/^#\/?/, "").split("/");
    var more = document.getElementById("more");
    if (parts[0] && BANKS[parts[0]]) { more.hidden = true; subject(parts[0], parts[1]); window.scrollTo(0, 0); return; }
    more.hidden = false;
    home(); setupPlan();
    var target = SECTIONS.indexOf(parts[0]) >= 0 ? document.getElementById(parts[0]) : null;
    if (target) { var y = target.getBoundingClientRect().top + window.pageYOffset - 70; window.scrollTo(0, Math.max(0, y)); }
    else window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();

  if ("serviceWorker" in navigator && location.protocol === "https:" && /sites\.tab\.bot$/.test(location.hostname)) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
