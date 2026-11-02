/* ===== DIWALI 2026 THEME (added Nov 2 2026) =====
   To remove: delete this file and the one <script src="diwali.js"> line in index.html.
   It also switches itself off after 15 Nov 2026 (IST), or with ?nodiwali in the URL. */
(function () {
  "use strict";
  var END = Date.parse("2026-11-16T00:00:00+05:30");
  if (Date.now() >= END || /[?&]nodiwali\b/.test(location.search)) return;
  if (document.getElementById("dw-css")) return;

  var CSS = [
  /* warm accents */
  "html.diwali:not([data-theme=dark]){--brand:#c2410c;--brand-ink:#fff;--brand-soft:#ffedd5;--bg:#fdf8f1;--line:#f1e3d0;--mark:#fde68a}",
  "html.diwali[data-theme=dark]{--brand:#fbbf24;--brand-ink:#2a1500;--brand-soft:#3a2a0c}",
  "html.diwali:not([data-theme=dark]),html.diwali:not([data-theme=dark]) body{background-color:#fdf8f1}",
  /* faint rangoli motif in the page background */
  "html.diwali body{background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23ea580c' stroke-opacity='.07' stroke-width='1.4'%3E%3Ccircle cx='60' cy='60' r='9'/%3E%3Ccircle cx='60' cy='60' r='20'/%3E%3Cpath d='M60 34 L66 50 L60 46 L54 50Z M60 86 L66 70 L60 74 L54 70Z M34 60 L50 54 L46 60 L50 66Z M86 60 L70 54 L74 60 L70 66Z'/%3E%3Cpath d='M42 42 Q50 46 48 52 M78 42 Q70 46 72 52 M42 78 Q50 74 48 68 M78 78 Q70 74 72 68'/%3E%3C/g%3E%3C/svg%3E\");background-size:120px 120px}",
  "html.diwali .topbar{border-bottom:2px solid #f59e0b}",
  "html.diwali .logo{background:linear-gradient(135deg,#f59e0b,#c2410c)!important;color:#fff!important}",
  /* hero gets warm festive colours */
  "html.diwali .hero{background:radial-gradient(circle at 1px 1px,rgba(255,236,179,.14) 1.2px,transparent 1.6px) 0 0/18px 18px,radial-gradient(110% 80% at 100% 0%,#f59e0b 0%,rgba(245,158,11,0) 55%),radial-gradient(80% 70% at 0% 100%,rgba(250,204,21,.25) 0%,rgba(250,204,21,0) 60%),linear-gradient(160deg,#9a3412 0%,#5b0f1a 100%);box-shadow:0 10px 30px rgba(120,30,10,.28)}",
  "html.diwali .hero h1 .grad{background-image:linear-gradient(90deg,#fde68a,#fb923c)}",
  "html.diwali .hero .hero-btn{color:#9a3412}",
  /* string lights (jhalar) */
  ".dw-lights{position:relative;height:50px;overflow:hidden;pointer-events:none;-webkit-user-select:none;user-select:none}",
  ".dw-lights svg.dw-wire{position:absolute;left:0;top:0;width:100%;height:30px}",
  ".dw-row{position:absolute;left:0;right:0;top:0;height:50px}",
  ".dw-b{position:absolute;top:0;width:2px;height:var(--h,12px);background:#5b4636;transform-origin:50% 0;animation:dwSway var(--sd,3.2s) ease-in-out var(--dl,0s) infinite alternate}",
  ".dw-b i{position:absolute;left:50%;top:100%;width:10px;height:15px;margin-left:-5px;border-radius:50% 50% 50% 50%/40% 40% 60% 60%;background:var(--c);box-shadow:0 0 6px 2px var(--c),0 0 14px 3px var(--g);animation:dwTw var(--td,1.6s) ease-in-out var(--dl,0s) infinite alternate}",
  ".dw-b i:before{content:'';position:absolute;left:2px;top:-3px;width:6px;height:4px;border-radius:2px;background:#8a6a2f}",
  "@keyframes dwSway{from{transform:rotate(-9deg)}to{transform:rotate(9deg)}}",
  "@keyframes dwTw{0%{opacity:.45;filter:brightness(.8)}100%{opacity:1;filter:brightness(1.25)}}",
  /* banner */
  ".dw-banner{position:relative;max-width:1040px;margin:0 auto;padding:0 16px}",
  ".dw-card{position:relative;overflow:hidden;margin:2px -4px 4px;border-radius:20px;padding:14px 16px 14px 62px;color:#fff7e6;border:1.5px solid #f6c453;background:radial-gradient(70% 120% at 100% 0%,rgba(251,191,36,.35),rgba(251,191,36,0) 60%),linear-gradient(120deg,#5b0f1a 0%,#8a1c1c 45%,#b45309 100%);box-shadow:0 8px 24px rgba(120,30,10,.22)}",
  ".dw-card:after{content:'';position:absolute;right:-38px;bottom:-38px;width:130px;height:130px;opacity:.22;background:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='none' stroke='%23fde68a' stroke-width='2'%3E%3Ccircle cx='50' cy='50' r='8'/%3E%3Ccircle cx='50' cy='50' r='18'/%3E%3Ccircle cx='50' cy='50' r='30'/%3E%3Cpath d='M50 2 L56 20 L50 16 L44 20Z M50 98 L56 80 L50 84 L44 80Z M2 50 L20 44 L16 50 L20 56Z M98 50 L80 44 L84 50 L80 56Z M16 16 L30 26 L24 28 L26 34Z M84 84 L70 74 L76 72 L74 66Z M84 16 L74 30 L72 24 L66 26Z M16 84 L26 70 L28 76 L34 74Z'/%3E%3C/g%3E%3C/svg%3E\") center/contain no-repeat;pointer-events:none}",
  ".dw-diya{position:absolute;left:12px;top:50%;margin-top:-24px;width:40px;height:48px}",
  ".dw-flame{transform-origin:50% 100%;animation:dwFl 1.1s ease-in-out infinite alternate}",
  "@keyframes dwFl{0%{transform:scale(.9,1) rotate(-4deg)}100%{transform:scale(1.05,1.12) rotate(4deg)}}",
  ".dw-t1{margin:0;font-size:22px;line-height:1.15;font-weight:900;letter-spacing:-.01em;background:linear-gradient(90deg,#fde68a,#fbbf24,#fff3c4);-webkit-background-clip:text;background-clip:text;color:transparent}",
  ".dw-t2{margin:3px 0 0;font-size:15px;font-weight:800;color:#fff}",
  ".dw-t2 b{color:#fde68a}",
  ".dw-t3{margin:2px 0 0;font-size:13px;color:#ffe9c7;line-height:1.4}",
  ".dw-cta{display:inline-block;margin-top:9px;padding:8px 14px;border-radius:999px;background:linear-gradient(90deg,#fde68a,#f59e0b);color:#4a1206!important;font-weight:800;font-size:14px;text-decoration:none;box-shadow:0 2px 10px rgba(253,230,138,.35);position:relative;z-index:1}",
  ".dw-x{position:absolute;right:6px;top:6px;width:30px;height:30px;border:0;border-radius:50%;background:rgba(0,0,0,.18);color:#ffe9c7;font-size:17px;line-height:30px;cursor:pointer;z-index:2;padding:0}",
  ".dw-sp{position:absolute;width:8px;height:8px;pointer-events:none;background:radial-gradient(circle,#fff 0 20%,rgba(255,236,179,.0) 60%);animation:dwSp 2.4s ease-in-out infinite}",
  ".dw-sp:before,.dw-sp:after{content:'';position:absolute;left:50%;top:50%;background:#fff3c4;border-radius:2px}",
  ".dw-sp:before{width:2px;height:12px;margin:-6px 0 0 -1px}.dw-sp:after{width:12px;height:2px;margin:-1px 0 0 -6px}",
  "@keyframes dwSp{0%,100%{opacity:0;transform:scale(.3) rotate(0)}50%{opacity:1;transform:scale(1) rotate(90deg)}}",
  "html:not(.dw-home) .dw-banner{display:none}",
  ".dw-banner.dw-closed{display:none}",
  /* hanging lanterns on wide screens, in the empty side margins only */
  ".dw-lan{display:none}",
  "@media(min-width:1240px){.dw-lan{display:block;position:absolute;top:0;width:44px;pointer-events:none;transform-origin:50% 0;animation:dwSway 3.6s ease-in-out infinite alternate;z-index:1}.dw-lan.l{left:max(18px,calc(50% - 600px))}.dw-lan.r{right:max(18px,calc(50% - 600px));animation-delay:-1.8s}}",
  "@media(max-width:380px){.dw-card{padding-left:54px}.dw-t1{font-size:20px}.dw-diya{left:8px}}",
  "@media(prefers-reduced-motion:reduce){.dw-b,.dw-b i,.dw-flame,.dw-sp,.dw-lan{animation:none!important}}"
  ].join("\n");

  var st = document.createElement("style"); st.id = "dw-css"; st.textContent = CSS; document.head.appendChild(st);
  var root = document.documentElement; root.classList.add("diwali");

  function h(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e; }

  /* ---- string lights ---- */
  var COLORS = [["#ff4d4d", "rgba(255,77,77,.5)"], ["#ffd23f", "rgba(255,210,63,.55)"], ["#3ddc84", "rgba(61,220,132,.5)"], ["#4dabff", "rgba(77,171,255,.5)"], ["#ff7ae0", "rgba(255,122,224,.5)"], ["#ff9f1c", "rgba(255,159,28,.55)"]];
  var lights = h("div", { class: "dw-lights", "aria-hidden": "true" });
  var wire = '<svg class="dw-wire" viewBox="0 0 1000 30" preserveAspectRatio="none"><path d="M0 2 Q 62 30 125 2 T 250 2 T 375 2 T 500 2 T 625 2 T 750 2 T 875 2 T 1000 2" fill="none" stroke="#5b4636" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';
  lights.innerHTML = wire;
  var row = h("div", { class: "dw-row" }); lights.appendChild(row);
  function build() {
    var w = lights.clientWidth || window.innerWidth, n = Math.max(10, Math.round(w / 34)), html = "";
    for (var i = 0; i < n; i++) {
      var x = (i + .5) / n, seg = (x * 8) % 1, sag = 56 * seg * (1 - seg); // follow the wire's droop
      var c = COLORS[i % COLORS.length];
      html += '<span class="dw-b" style="left:' + (x * 100).toFixed(2) + '%;top:' + (sag + 1.5).toFixed(1) + 'px;--h:' + (8 + (i % 3) * 3) + 'px;--c:' + c[0] + ';--g:' + c[1] + ';--sd:' + (2.6 + (i % 4) * .35).toFixed(2) + 's;--td:' + (1.1 + (i % 5) * .25).toFixed(2) + 's;--dl:-' + ((i * .37) % 2.5).toFixed(2) + 's"><i></i></span>';
    }
    row.innerHTML = html;
  }

  /* ---- banner ---- */
  var C = window.PCI_CONFIG || {}, price = C.PRICE || 49, days = C.DAYS || 30;
  var diya = '<svg class="dw-diya" viewBox="0 0 40 48" aria-hidden="true"><defs><radialGradient id="dwg" cx="50%" cy="60%" r="50%"><stop offset="0" stop-color="#fff7cc"/><stop offset=".5" stop-color="#ffcf3f"/><stop offset="1" stop-color="#ff7a00" stop-opacity="0"/></radialGradient></defs><circle cx="20" cy="18" r="14" fill="url(#dwg)" opacity=".55"/><path class="dw-flame" d="M20 6 C 25 14 25 20 20 24 C 15 20 15 14 20 6Z" fill="#ffcf3f"/><path class="dw-flame" d="M20 12 C 22.5 16 22.5 19 20 22 C 17.5 19 17.5 16 20 12Z" fill="#fff4c2"/><path d="M3 26 Q20 24 37 26 Q34 40 20 41 Q6 40 3 26Z" fill="#d9480f"/><path d="M5 27 Q20 31 35 27" fill="none" stroke="#fde68a" stroke-width="1.6"/><path d="M9 33 h22" stroke="#fbbf24" stroke-width="1.2" stroke-dasharray="2 2.5"/><ellipse cx="20" cy="43" rx="9" ry="2.2" fill="#9a3412"/></svg>';
  var banner = h("div", { class: "dw-banner" });
  banner.innerHTML = '<section class="dw-card" aria-label="Happy Diwali, Diwali Sale">' + diya +
    '<span class="dw-sp" style="right:22%;top:12px"></span><span class="dw-sp" style="right:9%;top:40%;animation-delay:-.8s"></span><span class="dw-sp" style="right:16%;bottom:14px;animation-delay:-1.6s"></span>' +
    '<button class="dw-x" type="button" aria-label="Close Diwali banner">×</button>' +
    '<p class="dw-t1">🪔 Happy Diwali!</p>' +
    '<p class="dw-t2">Diwali Sale — <b>Diwali tak sale!</b></p>' +
    '<p class="dw-t3">₹' + price + ' Exam Plan: sabhi Short + Long answers, roz ' + (C.PLAN_PER_DAY || 40) + ' MCQ, ' + days + '-din exam plan.</p>' +
    '<a class="dw-cta" href="#/buy">✨ Diwali Sale: ₹' + price + ' Plan lo →</a></section>';
  try { if (sessionStorage.getItem("dw_closed") === "1") banner.classList.add("dw-closed"); } catch (e) {}
  banner.querySelector(".dw-x").addEventListener("click", function () { banner.classList.add("dw-closed"); try { sessionStorage.setItem("dw_closed", "1"); } catch (e) {} });

  /* ---- lanterns (wide screens only) ---- */
  function lantern(side) {
    return h("div", { class: "dw-lan " + side, "aria-hidden": "true" }, '<svg viewBox="0 0 44 110" width="44" height="110"><line x1="22" y1="0" x2="22" y2="40" stroke="#8a6a2f" stroke-width="1.5"/><rect x="14" y="38" width="16" height="5" rx="2" fill="#b45309"/><path d="M8 46 Q22 40 36 46 L33 76 Q22 82 11 76Z" fill="#e8590c"/><path d="M14 47 L13 76 M22 44 L22 80 M30 47 L31 76" stroke="#fde68a" stroke-width="1" opacity=".7"/><ellipse cx="22" cy="61" rx="7" ry="10" fill="#ffd43b" opacity=".55"/><rect x="15" y="78" width="14" height="4" rx="2" fill="#b45309"/><path d="M18 82 L16 100 M22 82 L22 104 M26 82 L28 100" stroke="#f59e0b" stroke-width="1.4"/></svg>');
  }

  function mount() {
    var header = document.querySelector("header.topbar"); if (!header) return;
    var wrap = h("div", { class: "dw-wrap", style: "position:relative" });
    wrap.appendChild(lights); wrap.appendChild(lantern("l")); wrap.appendChild(lantern("r")); wrap.appendChild(banner);
    header.parentNode.insertBefore(wrap, header.nextSibling);
    build();
    var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(build, 200); });
    function onRoute() { var p = (location.hash || "#/").replace(/^#\/?/, "").split("/")[0]; root.classList.toggle("dw-home", !p || ["practice", "how", "syllabus", "tips", "faq", "about", "contact"].indexOf(p) >= 0); }
    window.addEventListener("hashchange", onRoute); onRoute();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
