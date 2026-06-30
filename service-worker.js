/* ═══════════════════════════════════════════════════
   GRAMMATIK-ODYSSEE — SERVICE WORKER
   Push-Benachrichtigungen für Streak-Reminder
   ═══════════════════════════════════════════════════ */

const CACHE_NAME = "grammatik-odyssee-v1";
const ASSETS = [
  "./Index100_fixed-6.html"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){return n!==CACHE_NAME;}).map(function(n){return caches.delete(n);})
      );
    })
  );
  self.clients.claim();
});

/* Fetch: bei Offline aus Cache */
self.addEventListener("fetch", function(e){
  e.respondWith(
    fetch(e.request).catch(function(){
      return caches.match(e.request);
    })
  );
});

/* ═══ PUSH-BENACHRICHTIGUNGEN ═══ */

self.addEventListener("push", function(e){
  var data = {};
  try{
    data = e.data ? e.data.json() : {};
  }catch(ex){
    data = {title: "Grammatik-Odyssee", body: e.data ? e.data.text() : ""};
  }

  var title = data.title || "Grammatik-Odyssee";
  var options = {
    body: data.body || "Du hast deine Streak noch nicht gesichert!",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🔥%3C/text%3E%3C/svg%3E",
    badge: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🔥%3C/text%3E%3C/svg%3E",
    tag: "streak-push",
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "./Index100_fixed-6.html"
    }
  };

  e.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/* Klick auf Benachrichtigung → App öffnen */
self.addEventListener("notificationclick", function(e){
  e.notification.close();
  var url = e.notification.data && e.notification.data.url ? e.notification.data.url : "./Index100_fixed-6.html";
  e.waitUntil(
    clients.matchAll({type: "window", includeUncontrolled: true}).then(function(clientList){
      for(var i=0; i<clientList.length; i++){
        var client = clientList[i];
        if(client.url.indexOf("Index100_fixed-6") !== -1 && "focus" in client){
          return client.focus();
        }
      }
      if(clients.openWindow){
        return clients.openWindow(url);
      }
    })
  );
});
