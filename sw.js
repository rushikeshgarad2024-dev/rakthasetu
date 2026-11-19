/* रक्तसेतू — ऑफलाइन कॅशे
   -----------------------------------------------------------
   • data.js / index.html → Network-First (रक्तपेढी, रुग्णालय, सूचना अद्ययावत राहाव्यात)
   • उरलेल्या स्थिर फाइल्स → Cache-First
   • फाईल्स बदलल्यास CACHE चे नाव बदला!
     (v2 → v3 …) — नाहीतर जुनी JS/CSS मुलांमध्येच राहील.
   ----------------------------------------------------------- */

var CACHE = 'rakthasetu-v6';
var CORE_ASSETS = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './data.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE_ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

function networkFirst(req, e) {
  /* ताजी फाइल आधी — असन्तोष/गोंधळ टाळायला */
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req);
    })
  );
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = e.request.url;
  if (url.indexOf('data.js') !== -1 || url.indexOf('index.html') !== -1) {
    networkFirst(e.request, e);
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      });
    })
  );
});
