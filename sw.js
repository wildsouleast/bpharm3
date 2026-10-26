/* B.Pharm Study Plan service worker: network-first (always revalidates, so new versions show at once), cache only as offline fallback. */
const C = "bp3-v10-acct";
const CORE = ["./", "index.html", "styles.css?v=10a", "app.js?v=10a", "auth.js?v=10a", "core.js?v=10a", "pci.js?v=10a", "codes.js?v=10a", "config.js?v=10a", "vendor/qrcode.js?v=10a",
  "data/bp301t.js?v=10a", "data/bp302t.js?v=10a", "data/bp303t.js?v=10a", "data/bp304t.js?v=10a", "icon-192.png", "manifest.json"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).catch(() => {})); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // account API etc. go straight to the network
  e.respondWith(fetch(req, { cache: "no-cache" }).then(r => {
    if (r && r.ok && r.type === "basic") { const copy = r.clone(); caches.open(C).then(c => c.put(req, copy)); }
    return r;
  }).catch(() => caches.match(req).then(m => m || (req.mode === "navigate" ? caches.match("index.html") : undefined))));
});
