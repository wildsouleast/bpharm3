(function (root) {
  "use strict";
  function dayNumber(key) { return Math.floor(Date.parse(key + "T00:00:00Z") / 86400000); }
  // ---------- deterministic daily rotation ----------
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffled(arr, seed) { var a = arr.slice(), r = rng(seed); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // Each "cycle" walks through a fresh shuffle of the bank, k questions a day, so no repeats inside a cycle.
  function todays(list, k, subj, kind, key) {
    if (!list || !list.length) return [];
    k = Math.min(k, list.length);
    var per = Math.max(1, Math.floor(list.length / k));
    var day = dayNumber(key);
    var cycle = Math.floor(day / per), pos = day % per;
    var perm = shuffled(list, hashStr(subj + ":" + kind + ":" + cycle));
    return perm.slice(pos * k, pos * k + k);
  }

  // ---------- answer checking ----------
  function norm(s) {
    return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/ph(?=\d)/g, "ph ").replace(/[^a-z0-9\u0370-\u03ff\u0900-\u097f]+/g, " ").trim();
  }
  function lev(a, b) {
    if (a === b) return 0; var m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    var prev = new Array(n + 1), cur = new Array(n + 1), i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) { cur[0] = i; for (j = 1; j <= n; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); } var t = prev; prev = cur; cur = t; }
    return prev[n];
  }
  function tokMatch(a, k) {
    if (a === k) return true;
    if (/^\d+$/.test(k)) return false;
    if (k.length <= 3) return false;
    if (a.indexOf(k) === 0) return true;          // stem: "steril" -> "sterilization"
    if (k.length >= 5) {
      var tol = k.length >= 9 ? 2 : 1;
      if (Math.abs(a.length - k.length) <= tol && lev(a, k) <= tol) return true;
      if (a.length > k.length && lev(a.slice(0, k.length), k) <= tol) return true;   // misspelt stem
    }
    return false;
  }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function kwMatch(tokens, joined, kw, raw) {
    var kt = norm(kw).split(" ").filter(Boolean);
    if (!kt.length) return false;
    var compact = kt.join("");
    if (compact.length <= 2 && /[a-z]/.test(compact)) {
      // tiny symbols like "+i", "-r", "pi": match only as a whole symbol in the raw text
      var k = String(kw).toLowerCase().replace(/\s+/g, "");
      return new RegExp("(^|[^a-z0-9])" + esc(k) + "(?![a-z0-9])").test(raw);
    }
    if (compact.length >= 6 && joined.indexOf(compact) !== -1) return true;
    for (var i = 0; i < tokens.length; i++) {
      if (!tokMatch(tokens[i], kt[0])) continue;
      if (kt.length === 1) return true;
      var ok = true, last = i;
      for (var j = 1; j < kt.length && ok; j++) {
        var found = false;
        for (var x = last + 1; x < Math.min(tokens.length, last + 4); x++) { if (tokMatch(tokens[x], kt[j])) { found = true; last = x; break; } }
        ok = found;
      }
      if (ok) return true;
    }
    return false;
  }
  function check(text, kps) {
    var n = norm(text), tokens = n.split(" ").filter(Boolean), joined = tokens.join("");
    var raw = String(text || "").toLowerCase().replace(/\s+(?=[a-z0-9])/g, function (m, i, s) { return /[+\-]$/.test(s.slice(0, i)) ? "" : m; });
    return kps.map(function (kp) {
      return (kp.k || []).some(function (kw) { return kwMatch(tokens, joined, kw, raw); });
    });
  }

  root.BP3Core = { todays: todays, check: check, norm: norm, dayNumber: dayNumber };
})(typeof window !== "undefined" ? window : globalThis);
