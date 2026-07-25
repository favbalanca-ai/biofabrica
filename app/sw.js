// Service worker do app BioFábrica (PWA no GitHub Pages).
//
// Objetivo: o app abre e funciona SEM internet.
// Estratégia offline-first:
//   • App (HTML/JS/CSS/ícone): responde na hora pelo cache e, quando há internet,
//     atualiza a cópia em segundo plano (stale-while-revalidate). Assim o app abre
//     instantâneo, funciona offline e pega a versão nova sozinho no próximo acesso.
//   • Chamadas ao Google Apps Script (outra origem): NÃO são interceptadas — vão
//     direto para a internet, para a fila offline do próprio app tratar as falhas.
//   • Navegação sem internet: cai no index.html guardado no cache.
var CACHE = "biofabrica-app-v7";
var ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return; // POST ao Apps Script etc. passam direto.

  // Só cuidamos das requisições do próprio app (mesma origem).
  // Google Apps Script (script.google.com) e outras origens vão direto para a rede,
  // para a fila offline do app tratar as falhas — não devolvemos HTML no lugar de JSON.
  var url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  // Navegação (abrir o app): tenta a rede; sem internet, serve o app do cache.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (m) {
          return m || caches.match("./index.html") || caches.match("./");
        });
      })
    );
    return;
  }

  // Demais arquivos do app: responde na hora pelo cache e atualiza em segundo plano.
  e.respondWith(
    caches.match(req).then(function (cached) {
      var rede = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || rede;
    })
  );
});
