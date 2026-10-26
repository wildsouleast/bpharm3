/* Paid content: answers + plan MCQs live encrypted in data/paid.bin. The key is unwrapped from an unlock code
   (or arrives with a logged-in account that unlocked before) and kept as bp3_ck; nothing locked is in the page otherwise. */
(function (root) {
  "use strict";
  var KEY = "bp3_ck", VER = "12a", st = { open: false, err: null, p: null };
  function b64d(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function b64e(u) { var s = ""; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function getK() { try { var v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function sub() { return root.crypto && root.crypto.subtle; }
  function merge(data) {
    Object.keys(data).forEach(function (s) {
      var b = (root.BANKS || {})[s], L = data[s]; if (!b || !L) return;
      ["short", "long"].forEach(function (k) { (b[k] || []).forEach(function (q) { var x = L.qa[q.id]; if (x) Object.keys(x).forEach(function (f) { q[f] = x[f]; }); }); });
      (b.mcq || []).forEach(function (q) { var x = L.mcq[q.id]; if (x) { Object.keys(x).forEach(function (f) { q[f] = x[f]; }); q.full = 1; } });
    });
  }
  function load() {
    if (st.open) return Promise.resolve(true);
    if (st.p) return st.p;
    var k = getK(); if (!k || !sub()) return Promise.resolve(false);
    st.p = Promise.all([
      sub().importKey("raw", b64d(k), "AES-GCM", false, ["decrypt"]),
      fetch("data/paid.bin?v=" + VER).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.arrayBuffer(); })
    ]).then(function (a) {
      var buf = new Uint8Array(a[1]);
      return sub().decrypt({ name: "AES-GCM", iv: buf.slice(0, 12) }, a[0], buf.slice(12));
    }).then(function (pt) {
      merge(JSON.parse(new TextDecoder().decode(pt))); st.open = true; return true;
    }).catch(function (e) { st.err = String(e && e.message || e); st.p = null; return false; });
    return st.p;
  }
  function unwrap(code, h16) {
    var w = (root.PCI_KEY_WRAPS || {})[h16];
    if (!w || !sub()) return Promise.resolve(false);
    var enc = new TextEncoder(), raw = b64d(w);
    return sub().importKey("raw", enc.encode(code), "PBKDF2", false, ["deriveKey"]).then(function (base) {
      return sub().deriveKey({ name: "PBKDF2", salt: enc.encode("pci3sem-kek:" + h16), iterations: root.PCI_KDF_ITERS || 20000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    }).then(function (kek) { return sub().decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, kek, raw.slice(12)); })
      .then(function (K) { try { localStorage.setItem(KEY, JSON.stringify(b64e(new Uint8Array(K)))); } catch (e) {} return load(); })
      .catch(function () { return false; });
  }
  root.BP3Paid = { load: load, unwrap: unwrap, hasKey: function () { return !!getK(); }, isOpen: function () { return st.open; }, error: function () { return st.err; } };
})(window);
