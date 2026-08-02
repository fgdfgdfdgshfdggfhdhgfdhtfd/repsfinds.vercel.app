/* VERSIONE: 1.0.3
   (Aumentata versione per forzare l'aggiornamento con i log)
*/

const CACHE_NAME = 'reps-finds-v1.0.3';

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json'
];

// 1. INSTALLAZIONE
self.addEventListener('install', event => {
    console.log('[SW] Installazione in corso...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting(); 
});

// 2. ATTIVAZIONE E INVIO LOG A VERCEL
self.addEventListener('activate', event => {
    console.log('[SW] Attivazione e pulizia cache...');
    
    event.waitUntil(
        Promise.all([
            // Pulizia vecchie cache
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cache => {
                        if (cache !== CACHE_NAME) {
                            return caches.delete(cache);
                        }
                    })
                );
            }),
            // Notifica apertura a Vercel (Log Server-side)
            self.clients.matchAll().then(clients => {
                // Controllo se è aperta come WebApp (Standalone)
                const isPWA = clients.some(c => c.displayMode === 'standalone');
                const platform = isPWA ? 'WebApp-Installata' : 'Browser-Sito';
                
                // Questa chiamata genera il log nella dashboard di Vercel
                return fetch(`/api/log?type=Accesso&platform=${platform}`).catch(() => {
                    // Ignoriamo l'errore se siamo offline
                });
            })
        ]).then(() => self.clients.claim())
    );
});

// 3. GESTIONE RICHIESTE (FETCH)
self.addEventListener('fetch', event => {
    if (event.request.url.match(/\.(mp4|webm|ogg|wav|mp3)$/i)) return;
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request).then(response => {
                    return response || new Response("Sei offline.", {
                        status: 503,
                        statusText: "Service Unavailable"
                    });
                });
            })
    );
});
