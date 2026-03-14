const CACHE_NAME = "rixal-pos-v1";

const APP_SHELL = [

"/",
"/index.html",
"/pos.html",

"/assets/js/config.js",
"/assets/js/auth.js",
"/assets/js/pos.js",

"/assets/vendor/jquery.min.js",
"/assets/vendor/bootstrap.bundle.min.js",
"/assets/vendor/bootstrap.min.css",
"/assets/vendor/bootstrap-icons.css",
"/assets/vendor/toastr.min.js",
"/assets/vendor/toastr.min.css",

"/assets/images/logo.png"

];

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL);
    })
  );

});

self.addEventListener("fetch", event => {

  event.respondWith(

    caches.match(event.request).then(response => {

      if (response) return response;

      return fetch(event.request).then(networkResponse => {

        return caches.open(CACHE_NAME).then(cache => {

          cache.put(event.request, networkResponse.clone());
          return networkResponse;

        });

      }).catch(() => {

        if (event.request.mode === "navigate") {
          return caches.match("/index.html");
        }

      });

    })

  );

});
