/* Plan hidden (Nov 8 2026, per Anish): the ₹49 Exam Plan is not shown anywhere on the site.
   Hide only: no content is unlocked, no page is removed. #/plan and #/buy send the visitor to the home page.
   To restore the plan, delete this file and its <script src="planoff.js"> line in index.html. */
(function () {
  "use strict";
  var BAD = /₹\s?49\b|\b49\s?plan\b/i;
  var SENT = /(?<=[.!?।])\s+/;
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, TITLE: 1, HEAD: 1 };

  function guard() {
    var h = location.hash || "";
    if (/^#\/(buy|plan)(\/|$)/.test(h)) { location.hash = "#/"; }
  }

  function scrubLinks(root) {
    var as = root.querySelectorAll('a[href*="#/buy"], a[href*="#/plan"]');
    for (var i = 0; i < as.length; i++) {
      var a = as[i];
      if (!a.parentNode) continue;
      // a plan card (home "Exam date daalo" promo, mode card) goes whole; other links go alone
      var card = a.closest ? a.closest(".promo, .mode-plan, .planbar") : null;
      var gone = card && card !== root && card.parentNode ? card : a;
      var par = gone.parentNode;
      par.removeChild(gone);
      if (par && par !== root && !par.textContent.trim() && par.children.length === 0 && par.parentNode) par.parentNode.removeChild(par);
    }
  }

  function scrubText(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = w.nextNode())) {
      var p = n.parentNode;
      if (!p || SKIP[p.nodeName]) continue;
      if (BAD.test(n.nodeValue)) nodes.push(n);
    }
    nodes.forEach(function (t) {
      var parts = t.nodeValue.split(SENT).filter(function (s) { return !BAD.test(s); });
      var txt = parts.join(" ").trim();
      if (txt) t.nodeValue = txt; else if (t.parentNode) t.parentNode.removeChild(t);
    });
    // the Diwali banner (diwali.js) and any other element carrying the price in its markup
    var bn = root.querySelectorAll(".dw-banner");
    for (var j = 0; j < bn.length; j++) if (bn[j].parentNode) bn[j].parentNode.removeChild(bn[j]);
  }

  var queued = false;
  function run() {
    queued = false;
    guard();
    if (!document.body) return;
    scrubLinks(document.body);
    scrubText(document.body);
  }
  function schedule() {
    if (queued) return;
    queued = true;
    setTimeout(run, 30);
  }

  run();
  window.addEventListener("hashchange", schedule);
  var mo = new MutationObserver(schedule);
  var start = function () { mo.observe(document.body, { childList: true, subtree: true, characterData: true }); run(); };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
