/* Service worker do GeoPrancha.
   - App (HTML/CSS/JS/bibliotecas): guardado na instalação, abre offline.
   - Tiles de mapas de fundo: cache-first, guardados conforme são vistos ou baixados.
   Ao alterar qualquer arquivo do app, AUMENTE a versão abaixo para os usuários receberem a atualização. */
const VERSION='gp-app-v2';
const TILE_CACHE='gp-tiles-v1';
const FONT_CACHE='gp-fonts-v1';
const SHELL=['./','index.html','manifest.webmanifest','css/app.css',
  'vendor/ol.css','vendor/ol.js','vendor/proj4.js','vendor/jszip.min.js','vendor/shp.min.js','vendor/jspdf.umd.min.js','vendor/geotiff.js',
  'js/core.js','js/io.js','js/layout.js','js/gps.js','js/offline.js','js/main.js',
  'icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png'];
const TILE_HOSTS=/arcgisonline\.com|google\.com|openstreetmap\.org|opentopomap\.org|cartocdn\.com/;

self.addEventListener('install',e=>{ e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('gp-app-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return; const url=new URL(req.url);
  if(url.origin===location.origin){
    if(req.mode==='navigate'){ // rede primeiro para receber atualizações; cache se offline
      e.respondWith(fetch(req).then(r=>{ const cp=r.clone(); caches.open(VERSION).then(c=>c.put('index.html',cp)); return r; }).catch(()=>caches.match('index.html',{ignoreSearch:true})));
      return; }
    e.respondWith(caches.match(req,{ignoreSearch:true}).then(c=>c||fetch(req))); return; }
  if(TILE_HOSTS.test(url.hostname)){
    e.respondWith(caches.open(TILE_CACHE).then(async c=>{ const hit=await c.match(req.url); if(hit) return hit;
      try{ const r=await fetch(req); if(r.ok||r.type==='opaque') c.put(req.url,r.clone()); return r; }catch(err){ return Response.error(); } }));
    return; }
  if(/fonts\.(googleapis|gstatic)\.com/.test(url.hostname)){
    e.respondWith(caches.open(FONT_CACHE).then(async c=>{ const hit=await c.match(req); const net=fetch(req).then(r=>{ if(r.ok||r.type==='opaque') c.put(req,r.clone()); return r; }).catch(()=>hit); return hit||net; }));
  }
});
