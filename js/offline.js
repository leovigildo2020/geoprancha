'use strict';
/* =====================================================================
   Uso offline: service worker, instalação como app e download de mapas
   de fundo para a área de trabalho.
   ===================================================================== */
const TILE_CACHE='gp-tiles-v1';
const NO_BULK=new Set(['osm','otm','carto_claro','carto_escuro']); // políticas desses serviços proíbem download em massa
let installEvt=null;
function swAllowed(){ return 'serviceWorker' in navigator&&(location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname)); }
if(swAllowed()){ window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').then(r=>{ r.addEventListener('updatefound',()=>{ const w=r.installing; w&&w.addEventListener('statechange',()=>{ if(w.state==='installed'&&navigator.serviceWorker.controller) toast('Nova versão do GeoPrancha disponível. Feche e reabra o app para atualizar.',7000); }); }); }).catch(e=>console.warn('SW',e)); }); }
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); installEvt=e; const b=$('[data-act="instalar"]'); b&&(b.disabled=false); });
async function installApp(){ if(installEvt){ installEvt.prompt(); await installEvt.userChoice; installEvt=null; return; }
  modal({title:'Instalar o GeoPrancha no aparelho',body:`<ol style="margin:0;padding-left:20px;line-height:1.6"><li><b>Android (Chrome):</b> menu ⋮ › <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li><li><b>iPhone (Safari):</b> botão Compartilhar › <b>Adicionar à Tela de Início</b>.</li><li><b>Computador (Chrome/Edge):</b> ícone de instalação na barra de endereço.</li></ol><p class="note">${swAllowed()?'Depois de instalado, o app abre sem internet.':'A instalação só funciona quando o app é aberto pelo endereço HTTPS publicado (GitHub Pages).'}</p>`,buttons:[{label:'Entendi',primary:true}]}); }

/* Download de tiles */
function tileUrlsFor(ext,zmin,zmax){ const src=baseLayer.getSource(); if(!src||!src.getTileUrlFunction) return [];
  const grid=src.getTileGrid(), fn=src.getTileUrlFunction(), p3857=ol.proj.get('EPSG:3857'); const e=ol.proj.transformExtent(ext,S.crs,'EPSG:3857'); const urls=[];
  for(let z=zmin;z<=zmax;z++){ grid.forEachTileCoord(e,z,tc=>{ const u=fn(tc,1,p3857); if(u) urls.push(u); }); if(urls.length>60000) break; } return urls; }
function offlineArea(scope){ if(scope==='projeto'){ const ex=allExtent(); if(ex) return ol.extent.buffer(ex,Math.max(ex[2]-ex[0],ex[3]-ex[1])*0.15); } return map.getView().calculateExtent(map.getSize()); }
async function openOfflineModal(){ if(isLocal()||S.basemap==='nenhum') return toast('Escolha um mapa de fundo georreferenciado antes de baixar.');
  const bm=BASEMAPS[S.basemap]; const z0=Math.max(1,Math.floor(map.getView().getZoom())); const zMax=bm.max||19; let used='';
  try{ const est=await navigator.storage?.estimate?.(); if(est) used=`Armazenamento em uso: ${nf(est.usage/1048576,1)} MB de ~${nfi(est.quota/1048576)} MB disponíveis.`; }catch(e){}
  const blocked=NO_BULK.has(S.basemap);
  modal({title:'Mapa offline para campo',body:`<p style="margin-top:0">Baixa as imagens do mapa <b>${esc(bm.name)}</b> para usar sem internet. Áreas já visualizadas também ficam guardadas automaticamente.</p>
    ${blocked?`<p class="note warn">A política de uso do ${esc(bm.name)} não permite download em massa. Escolha Esri Satélite, Esri Topográfico ou Google na aba Mapa de fundo.</p>`:''}
    <div class="form"><label for="ofScope">Área</label><select id="ofScope"><option value="vista">Área visível no mapa</option>${allExtent()?'<option value="projeto">Feições do projeto + 15%</option>':''}</select>
    <label for="ofZ0">Do zoom</label><input type="number" id="ofZ0" min="1" max="${zMax}" value="${Math.min(z0,zMax)}"><label for="ofZ1">Até o zoom</label><input type="number" id="ofZ1" min="1" max="${zMax}" value="${Math.min(zMax,z0+3)}"></div>
    <p class="note" id="ofInfo"></p><div class="gp-prog" id="ofProg" hidden><i></i></div><p class="note">${used} Limite por download: 5.000 imagens. ${swAllowed()?'':'<b>Atenção:</b> o uso offline só funciona com o app aberto pelo endereço HTTPS publicado.'}</p>`,
   buttons:[{label:'Fechar'},{label:'Limpar mapas offline',keep:true,action:async()=>{ await caches.delete(TILE_CACHE); toast('Mapas offline removidos.'); }},{label:'Baixar',primary:true,keep:true,action:async(bg)=>{ if(blocked) return; await downloadTiles(bg); }}],
   onOpen:()=>{ const up=()=>{ const z0=+$('#ofZ0').value, z1=+$('#ofZ1').value; const n=tileUrlsFor(offlineArea($('#ofScope').value),Math.min(z0,z1),Math.max(z0,z1)).length; $('#ofInfo').textContent=`${nfi(n)} imagens · aprox. ${nf(n*0.025,1)} MB${n>5000?' · acima do limite: reduza o zoom máximo ou a área':''}`; $('#ofInfo').className='note'+(n>5000?' warn':''); };
     ['#ofScope','#ofZ0','#ofZ1'].forEach(s=>$(s).addEventListener('input',up)); up(); }}); }
async function downloadTiles(bg){ if(!('caches' in window)){ toast('Este navegador não permite guardar mapas offline.'); return; }
  const z0=+$('#ofZ0').value, z1=+$('#ofZ1').value; const urls=[...new Set(tileUrlsFor(offlineArea($('#ofScope').value),Math.min(z0,z1),Math.max(z0,z1)))]; if(urls.length>5000){ toast('Muitas imagens. Reduza o zoom máximo ou a área.'); return; }
  try{ await navigator.storage?.persist?.(); }catch(e){}
  const cache=await caches.open(TILE_CACHE); const k=S.basemap, b=BASEMAPS[k]; const mode=!noCorsKeys.has(k)&&(b.cors||(b.g&&googleCORS)||k==='custom')?'cors':'no-cors';
  const prog=$('#ofProg'), bar=prog.firstElementChild; prog.hidden=false; let done=0, fail=0, i=0; const btn=bg.querySelector('.foot .primary'); btn.disabled=true;
  const worker=async()=>{ while(i<urls.length&&document.body.contains(bg)){ const u=urls[i++]; try{ if(!(await cache.match(u))){ const r=await fetch(u,{mode}); if(r.ok||r.type==='opaque') await cache.put(u,r); else fail++; } }catch(e){ fail++; } done++; if(done%10===0||done===urls.length){ bar.style.width=(done/urls.length*100)+'%'; $('#ofInfo').textContent=`Baixando ${nfi(done)} de ${nfi(urls.length)}…${fail?` (${fail} falhas)`:''}`; } } };
  await Promise.all(Array.from({length:6},worker)); btn.disabled=false;
  if(document.body.contains(bg)) $('#ofInfo').textContent=`Concluído: ${nfi(done-fail)} imagens guardadas${fail?`, ${fail} falharam`:''}.`; toast('Mapa offline pronto para esta área.'); }
