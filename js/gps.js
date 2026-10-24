'use strict';
/* =====================================================================
   Caminhamento GPS — coleta de vértices/trilha com o GPS do aparelho.
   Pontos são guardados em lon/lat (WGS 84 ≈ SIRGAS 2000) e convertidos
   para o SRC do projeto só na exibição e ao finalizar.
   ===================================================================== */
const GPS={watch:null,last:null,session:null,follow:true,collecting:null,wake:null,errShown:false};
const GPS_DEF={mode:'vertice',geom:'poligono',maxAcc:10,minDist:3,nAvg:10};
const GPS_TRACK_ST=Object.assign(DEF_STYLE(),{showVtx:true,vtxPrefix:'P-',showDist:true,showArea:true,labelColor:'#0b4f5c',labelSize:12,vtxColor:'#0891b2'});
const gpsSource=new ol.source.Vector();
const gpsLayer=new ol.layer.Vector({source:gpsSource,zIndex:990,style:f=>{
  if(f.get('k')==='acc') return new ol.style.Style({fill:new ol.style.Fill({color:'rgba(30,136,229,.14)'}),stroke:new ol.style.Stroke({color:'rgba(30,136,229,.55)',width:1})});
  return new ol.style.Style({image:new ol.style.Circle({radius:8,fill:new ol.style.Fill({color:'#1e88e5'}),stroke:new ol.style.Stroke({color:'#ffffff',width:3})})}); }});
const trackSource=new ol.source.Vector();
const trackLayer=new ol.layer.Vector({source:trackSource,zIndex:985,style:(f,res)=>{ const g=f.getGeometry(); const out=[new ol.style.Style({stroke:new ol.style.Stroke({color:'#06b6d4',width:3,lineDash:[9,6]}),fill:new ol.style.Fill({color:'rgba(6,182,212,.13)'})})];
  const s=GPS.session; const st=Object.assign({},GPS_TRACK_ST,{showVtx:s&&s.mode==='vertice',showDist:s&&s.mode==='vertice'}); addLabels(f,g,st,res,out); return out; }});
map.addLayer(trackLayer); map.addLayer(gpsLayer);

const gpsPts=()=>GPS.session?GPS.session.pts:[];
const llToMap=ll=>ol.proj.fromLonLat(ll,S.crs);
const llDist=(a,b)=>ol.sphere.getDistance(a,b);
function gpsSave(){ try{ if(GPS.session) localStorage.setItem('geoprancha:gps',JSON.stringify(GPS.session)); else localStorage.removeItem('geoprancha:gps'); }catch(e){} }
function gpsSecureOK(){ if(!('geolocation' in navigator)){ toast('Este navegador não oferece GPS.'); return false; }
  if(!window.isSecureContext){ modal({title:'GPS indisponível neste endereço',body:'<p style="margin-top:0">O navegador só libera o GPS para páginas servidas por <b>HTTPS</b>. Abra o GeoPrancha pelo endereço publicado no GitHub Pages (ou instalado como app) para usar o caminhamento.</p>',buttons:[{label:'Entendi',primary:true}]}); return false; }
  if(isLocal()){ toast('O projeto está em plano local. Crie um projeto georreferenciado (UTM SIRGAS 2000) para usar o GPS.',5500); return false; } return true; }

/* Escuta da posição */
function gpsWatchStart(){ if(GPS.watch!==null) return; GPS.errShown=false;
  GPS.watch=navigator.geolocation.watchPosition(gpsOnPos,gpsOnErr,{enableHighAccuracy:true,maximumAge:0,timeout:30000}); gpsRender(); }
function gpsWatchStop(){ if(GPS.watch!==null) navigator.geolocation.clearWatch(GPS.watch); GPS.watch=null; GPS.last=null; gpsSource.clear(); gpsRender(); }
function gpsOnPos(p){ const ll=[p.coords.longitude,p.coords.latitude]; GPS.last={ll,acc:p.coords.accuracy,t:p.timestamp,alt:p.coords.altitude};
  const c=llToMap(ll); gpsSource.clear(); const r=p.coords.accuracy/gpu(S.crs,c);
  gpsSource.addFeatures([new ol.Feature({geometry:new ol.geom.Circle(c,r),k:'acc'}),new ol.Feature({geometry:new ol.geom.Point(c),k:'pos'})]);
  if(GPS.follow) map.getView().animate({center:c,duration:250});
  const s=GPS.session;
  if(GPS.collecting){ const C=GPS.collecting; if(p.coords.accuracy<=s.maxAcc*1.5) C.readings.push({ll,acc:p.coords.accuracy}); else C.rejected++; if(C.readings.length>=C.need) gpsFinishVertex(); }
  else if(s&&!s.paused&&s.mode==='continuo'&&p.coords.accuracy<=s.maxAcc){ const lp=s.pts[s.pts.length-1]; if(!lp||llDist(lp.ll,ll)>=s.minDist) gpsAddPoint({ll,acc:p.coords.accuracy,t:p.timestamp}); }
  gpsRender(); }
function gpsOnErr(e){ if(e.code!==1&&GPS.last&&Date.now()-GPS.last.t<30000) return; /* falha momentânea com posição recente: ignora */ const msg={1:'Permissão de localização negada. Libere a localização para este site nas configurações do navegador.',2:'Posição indisponível. Vá para céu aberto e verifique se o GPS do aparelho está ligado.',3:'O GPS demorou a responder. Continuando a tentar…'}[e.code]||e.message;
  if(e.code===1){ gpsWatchStop(); } if(!GPS.errShown||e.code===1){ toast(msg,6500); GPS.errShown=true; } gpsRender(); }

/* Sessão de caminhamento */
function gpsNewSession(){ GPS.session=Object.assign({id:uid(),started:Date.now(),pts:[],paused:false},GPS_DEF,gpsReadSettings()); gpsSave(); gpsUpdateTrack(); gpsRender(); requestWake(); GPS.follow=true; if(map.getView().getZoom()<17) map.getView().animate({zoom:18,duration:400});
  toast(GPS.session.mode==='vertice'?'Caminhamento iniciado. Pare em cada vértice e toque em “Coletar vértice”.':'Caminhamento iniciado. Caminhe pelo perímetro; os pontos são gravados sozinhos.',5000); }
function gpsReadSettings(){ const o={}; const g=id=>$(id); if(g('#gpMode')) o.mode=$('#gpMode [aria-pressed="true"]')?.dataset.v||GPS_DEF.mode; if(g('#gpGeom')) o.geom=$('#gpGeom [aria-pressed="true"]')?.dataset.v||GPS_DEF.geom;
  if(g('#gpMaxAcc')) o.maxAcc=parseNum($('#gpMaxAcc').value)||GPS_DEF.maxAcc; if(g('#gpMinDist')) o.minDist=parseNum($('#gpMinDist').value)||GPS_DEF.minDist; if(g('#gpNAvg')) o.nAvg=Math.max(1,Math.round(parseNum($('#gpNAvg').value)||GPS_DEF.nAvg)); return o; }
function gpsAddPoint(pt){ GPS.session.pts.push(pt); gpsSave(); gpsUpdateTrack(); if(navigator.vibrate) navigator.vibrate(40); }
function gpsCollectVertex(){ if(!GPS.session) return; if(!GPS.last){ toast('Aguardando sinal do GPS…'); return; } GPS.collecting={readings:[],need:GPS.session.nAvg,rejected:0}; gpsRender(); }
function gpsFinishVertex(){ const C=GPS.collecting; GPS.collecting=null; if(!C||!C.readings.length) return gpsRender();
  let sw=0,sx=0,sy=0; C.readings.forEach(r=>{ const w=1/Math.max(1,r.acc)**2; sw+=w; sx+=r.ll[0]*w; sy+=r.ll[1]*w; }); const ll=[sx/sw,sy/sw];
  const spread=Math.sqrt(C.readings.reduce((s,r)=>s+llDist(r.ll,ll)**2,0)/C.readings.length); const accMean=C.readings.reduce((s,r)=>s+r.acc,0)/C.readings.length;
  gpsAddPoint({ll,acc:Math.max(spread,accMean/Math.sqrt(C.readings.length)),accRaw:accMean,n:C.readings.length,t:Date.now()});
  toast(`Vértice ${gpsPts().length} coletado (média de ${C.readings.length} leituras, ±${nf(gpsPts().slice(-1)[0].acc,1)} m).`,2600); gpsRender(); }
function gpsUseNow(){ if(!GPS.collecting) return; if(GPS.collecting.readings.length) gpsFinishVertex(); else if(GPS.last){ GPS.collecting=null; gpsAddPoint({ll:GPS.last.ll,acc:GPS.last.acc,n:1,t:Date.now()}); gpsRender(); } }
function gpsUndo(){ if(!GPS.session||!GPS.session.pts.length) return; GPS.session.pts.pop(); gpsSave(); gpsUpdateTrack(); gpsRender(); }
function gpsTrackGeom(){ const s=GPS.session; if(!s) return null; const cs=s.pts.map(p=>llToMap(p.ll));
  if(s.geom==='poligono'&&cs.length>=3) return new ol.geom.Polygon([cs.concat([cs[0]])]); if(cs.length>=2) return new ol.geom.LineString(cs); if(cs.length===1) return new ol.geom.Point(cs[0]); return null; }
function gpsUpdateTrack(){ trackSource.clear(); const g=gpsTrackGeom(); if(g) trackSource.addFeature(new ol.Feature(g)); }
function gpsStats(){ const s=GPS.session; if(!s) return null; const pts=s.pts; let d=0; for(let i=1;i<pts.length;i++) d+=llDist(pts[i-1].ll,pts[i].ll);
  const closing=s.geom==='poligono'&&pts.length>=3?llDist(pts[pts.length-1].ll,pts[0].ll):0; let area=0;
  if(s.geom==='poligono'&&pts.length>=3) area=ol.sphere.getArea(new ol.geom.Polygon([pts.map(p=>p.ll).concat([pts[0].ll])]),{projection:'EPSG:4326'});
  const acc=pts.length?pts.reduce((a,p)=>a+p.acc,0)/pts.length:0; return {n:pts.length,d,closing,per:d+closing,area,acc}; }
function gpsFinish(){ const s=GPS.session; if(!s) return; const st=gpsStats(); const need=s.geom==='poligono'?3:2;
  if(st.n<need){ toast(`São necessários ao menos ${need} pontos para ${s.geom==='poligono'?'um polígono':'uma linha'}.`); return; }
  const unc=st.per*st.acc/2; const isPoly=s.geom==='poligono'; const defName=(isPoly?'Área GPS ':'Percurso GPS ')+new Date().toLocaleDateString('pt-BR');
  const vecs=S.layers.filter(isVec); const gpsLayerExisting=vecs.find(L=>L.name==='Caminhamento GPS');
  modal({title:isPoly?'Fechar polígono':'Salvar percurso',body:`<div class="metrics" style="margin-top:0">
    ${isPoly?`<div class="metric"><span>Área</span><b>${nf(st.area/1e4,4)} ha</b></div><div class="metric"><span>Perímetro</span><b>${nf(st.per)} m</b></div>`:`<div class="metric"><span>Distância</span><b>${nf(st.d)} m</b></div><div class="metric"><span>Pontos</span><b>${st.n}</b></div>`}
    <div class="metric"><span>Precisão média</span><b>±${nf(st.acc,1)} m</b></div>${isPoly?`<div class="metric"><span>Incerteza da área</span><b>±${nf(unc/1e4,3)} ha</b></div>`:''}</div>
    <div class="form"><label for="gfName">Nome</label><input type="text" id="gfName" value="${esc(defName)}"><label for="gfLayer">Camada</label><select id="gfLayer">${gpsLayerExisting?'':'<option value="__new">Nova camada “Caminhamento GPS”</option>'}${vecs.map(L=>`<option value="${L.id}" ${L===gpsLayerExisting?'selected':''}>${esc(L.name)}</option>`).join('')}</select></div>
    ${isPoly?`<p class="note">A incerteza é uma estimativa simples (perímetro × precisão média ÷ 2). Medição de celular não substitui levantamento GNSS geodésico para INCRA/SIGEF.</p>`:''}`,
   buttons:[{label:'Voltar'},{label:isPoly?'Fechar e salvar':'Salvar',primary:true,action:()=>{ const g=gpsTrackGeom(); if(!g) return false; let L=$('#gfLayer').value==='__new'?null:getLayer($('#gfLayer').value);
      if(!L) L=createVectorLayer({name:'Caminhamento GPS',style:{stroke:'#06b6d4',fill:'#06b6d4',fillOp:0.15,showVtx:true,vtxPrefix:'P-',showDist:s.mode==='vertice',showArea:true}});
      const f=ensureFid(new ol.Feature({geometry:g,nome:$('#gfName').value||defName,data:new Date().toLocaleString('pt-BR'),modo:s.mode==='vertice'?'por vértice':'contínuo',n_pontos:st.n,precisao_m:+st.acc.toFixed(2)}));
      L.source.addFeature(f); S.activeId=L.id; GPS.session=null; GPS.collecting=null; gpsSave(); trackSource.clear(); releaseWake(); commit(); renderLayers(); selectFeature(f,true); gpsRender(); toast('Medição salva em “'+L.name+'”.'); }}]}); }
function gpsCancel(){ modal({title:'Descartar caminhamento',body:`<p style="margin:0">Descartar os ${gpsPts().length} ponto(s) coletados?</p>`,buttons:[{label:'Manter'},{label:'Descartar',primary:true,action:()=>{ GPS.session=null; GPS.collecting=null; gpsSave(); trackSource.clear(); releaseWake(); gpsRender(); }}]}); }

/* Tela ligada durante a coleta (o navegador suspende o GPS com a tela apagada) */
async function requestWake(){ try{ if('wakeLock' in navigator&&!GPS.wake) { GPS.wake=await navigator.wakeLock.request('screen'); GPS.wake.addEventListener('release',()=>{ GPS.wake=null; }); } }catch(e){} }
function releaseWake(){ try{ GPS.wake&&GPS.wake.release(); }catch(e){} GPS.wake=null; }
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&GPS.session) requestWake(); });

/* Painel */
function gpsOpen(){ if(!gpsSecureOK()) return; $('#gpsPanel').hidden=false; $('#hint').hidden=true; $('#cadbar').hidden=true; gpsWatchStart(); gpsRender(); }
function gpsClose(){ if(GPS.session){ toast('O caminhamento continua salvo. Reabra o painel para continuar.',4000); } $('#gpsPanel').hidden=true; $('#hint').hidden=false; if(!GPS.session) gpsWatchStop(); }
function seg(id,opts,val){ return `<div class="seg" id="${id}">${opts.map(([v,l])=>`<button data-v="${v}" aria-pressed="${v===val}">${l}</button>`).join('')}</div>`; }
function gpsRender(){ const el=$('#gpsPanel'); if(!el||el.hidden) return; const s=GPS.session, L=GPS.last; const cfg=s||Object.assign({},GPS_DEF,gpsReadSettings());
  const q=!L?'wait':L.acc<=5?'good':L.acc<=cfg.maxAcc?'ok':'bad'; const qtxt={wait:GPS.watch===null?'GPS desligado':'Aguardando sinal…',good:`±${nf(L?.acc||0,1)} m · bom`,ok:`±${nf(L?.acc||0,1)} m · aceitável`,bad:`±${nf(L?.acc||0,1)} m · fraco`}[q];
  const st=gpsStats(); const C=GPS.collecting;
  let h=`<div class="gp-head"><span class="gp-sig ${q}"><i></i>${qtxt}</span><span class="grow"></span><label class="chk"><input type="checkbox" id="gpFollow" ${GPS.follow?'checked':''}> Seguir</label><button class="tb" data-gp="close" aria-label="Fechar painel">✕</button></div>`;
  if(!s){ h+=`<div class="gp-row"><span class="lab">Coleta</span>${seg('gpMode',[['vertice','Por vértice'],['continuo','Contínua']],cfg.mode)}</div>
     <div class="gp-row"><span class="lab">Resultado</span>${seg('gpGeom',[['poligono','Polígono (área)'],['linha','Linha (distância)']],cfg.geom)}</div>
     <details class="gp-adv"><summary>Ajustes de precisão</summary><div class="form" style="margin-top:8px"><label for="gpMaxAcc">Precisão máxima aceita (m)</label><input type="number" id="gpMaxAcc" value="${cfg.maxAcc}" min="1"><label for="gpMinDist">Distância mínima entre pontos (m)</label><input type="number" id="gpMinDist" value="${cfg.minDist}" min="0.5" step="0.5"><label for="gpNAvg">Leituras por vértice</label><input type="number" id="gpNAvg" value="${cfg.nAvg}" min="1" max="60"></div></details>
     <p class="note">${cfg.mode==='vertice'?'Pare em cada canto e colete o vértice. O app faz a média das leituras: é o modo mais preciso para áreas.':'Os pontos são gravados enquanto você caminha, descartando leituras imprecisas. Bom para trilhas, estradas e perímetros irregulares.'} Mantenha a tela ligada durante a coleta.</p>
     <button class="gp-big primary" data-gp="start" ${GPS.watch===null?'disabled':''}>Iniciar caminhamento</button>`; }
  else { h+=`<div class="gp-stats"><div><span>Pontos</span><b>${st.n}</b></div><div><span>${s.geom==='poligono'?'Perímetro':'Distância'}</span><b>${nf(s.geom==='poligono'?st.per:st.d,1)} m</b></div>${s.geom==='poligono'?`<div><span>Área</span><b>${nf(st.area/1e4,4)} ha</b></div>`:''}<div><span>Precisão</span><b>±${nf(st.acc,1)} m</b></div></div>`;
    if(s.mode==='vertice'){ h+=C?`<button class="gp-big primary" data-gp="usenow">Coletando ${C.readings.length}/${C.need}… toque para concluir agora</button>`:`<button class="gp-big primary" data-gp="vertex" ${L?'':'disabled'}>Coletar vértice ${st.n+1}</button>`; }
    else h+=`<button class="gp-big ${s.paused?'primary':''}" data-gp="pause">${s.paused?'Retomar gravação':'Pausar gravação'}</button>`;
    h+=`<div class="gp-acts"><button class="tb" data-gp="undo" ${st.n?'':'disabled'}>Desfazer ponto</button><button class="tb primary" data-gp="finish">${s.geom==='poligono'?'Fechar polígono':'Salvar percurso'}</button><button class="tb danger" data-gp="cancel">Descartar</button></div>`; }
  el.innerHTML=h; }
document.addEventListener('click',e=>{ const b=e.target.closest('[data-gp]'); if(b&&!b.closest('.modal')){ const a=b.dataset.gp;
    if(a==='close') gpsClose(); if(a==='start') gpsNewSession(); if(a==='vertex') gpsCollectVertex(); if(a==='usenow') gpsUseNow(); if(a==='undo') gpsUndo(); if(a==='finish') gpsFinish(); if(a==='cancel') gpsCancel();
    if(a==='pause'&&GPS.session){ GPS.session.paused=!GPS.session.paused; gpsSave(); gpsRender(); } return; }
  const sb=e.target.closest('#gpMode button, #gpGeom button'); if(sb){ sb.parentNode.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===sb)); gpsRender(); } });
document.addEventListener('change',e=>{ if(e.target.id==='gpFollow') GPS.follow=e.target.checked; });
map.on('pointerdrag',()=>{ if(GPS.follow&&GPS.watch!==null){ GPS.follow=false; const c=$('#gpFollow'); if(c) c.checked=false; } });
function gpsLocateOnce(){ if(!gpsSecureOK()) return; toast('Buscando sua posição…',2500); navigator.geolocation.getCurrentPosition(p=>{ const c=llToMap([p.coords.longitude,p.coords.latitude]); map.getView().animate({center:c,zoom:Math.max(map.getView().getZoom(),17),duration:400}); showCoordPopup(c); toast(`Posição obtida (±${nf(p.coords.accuracy,1)} m).`); },gpsOnErr,{enableHighAccuracy:true,timeout:30000,maximumAge:5000}); }
function gpsResumeCheck(){ try{ const s=JSON.parse(localStorage.getItem('geoprancha:gps')||'null'); if(!s||!s.pts) return; GPS.session=s; gpsUpdateTrack();
  modal({title:'Caminhamento em andamento',body:`<p style="margin:0">Há um caminhamento não finalizado com ${s.pts.length} ponto(s), iniciado em ${new Date(s.started).toLocaleString('pt-BR')}. Deseja continuar?</p>`,buttons:[{label:'Descartar',action:()=>{ GPS.session=null; gpsSave(); trackSource.clear(); }},{label:'Continuar',primary:true,action:()=>{ gpsOpen(); requestWake(); }}]}); }catch(e){} }
