// Deixa o painel abrir sem internet. Este arquivo é um modelo: no build, o vite.config.ts preenche
// a versão do cache e a lista de arquivos gerados (as duas constantes abaixo).
// Página: rede primeiro (pega versão nova), cópia guardada se offline. Demais arquivos: cópia guardada.
const CACHE = 'mb2-painel-__VERSAO__';
const ARQUIVOS = __ARQUIVOS__;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', ...ARQUIVOS])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Apaga caches de versões anteriores.
  e.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok && r.type === 'basic') {
            const copia = r.clone();
            caches.open(CACHE).then((c) => c.put('./', copia));
          }
          return r;
        })
        .catch(() => caches.match('./', { ignoreVary: true })),
    );
    return;
  }

  // ignoreVary: o script do módulo pede com cabeçalho Origin, a cópia guardada não tem.
  e.respondWith(caches.match(req, { ignoreVary: true }).then((guardado) => guardado || fetch(req)));
});
