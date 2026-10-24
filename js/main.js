'use strict';
/* ===================== Interface ===================== */
$$('[data-ic]').forEach(b=>{ b.insertAdjacentHTML('afterbegin',ic(b.dataset.ic,b.classList.contains('btn-print')?'i sm':'i')); });
$$('[data-ic-inline]').forEach(s=>{ s.innerHTML=ICONS[s.dataset.icInline]; });
function showTab(t){ $$('.tabs [data-tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t?'true':'false')); $$('.rpanel').forEach(p=>p.hidden=p.dataset.panel!==t); }
$('.tabs').addEventListener('click',e=>{ const b=e.target.closest('[data-tab]'); if(b) showTab(b.dataset.tab); });
function renderBasemapUI(){ $('#bmGrid').innerHTML=Object.entries(BASEMAPS).filter(([k])=>k!=='custom'||S.customXYZ).map(([k,b])=>`<button class="bmbtn" data-bm="${k}" aria-pressed="${S.basemap===k}" ${isLocal()&&k!=='nenhum'?'disabled':''}><i style="background:${b.chip}"></i>${esc(b.name)}</button>`).join('');
  $('#bmSelect').innerHTML=Object.entries(BASEMAPS).filter(([k])=>k!=='custom'||S.customXYZ).map(([k,b])=>`<option value="${k}" ${S.basemap===k?'selected':''}>${esc(b.name)}</option>`).join(''); $('#bmSelect').disabled=isLocal(); $('#bmOpacity').value=S.baseOpacity; }
$('#bmGrid').addEventListener('click',e=>{ const b=e.target.closest('[data-bm]'); if(!b) return; S.basemap=b.dataset.bm; applyBasemap(); if(BASEMAPS[S.basemap].g&&!googleCORS) toast('Mapas Google aparecem na tela, mas o provedor pode bloquear a exportação de imagem. Para exportar, prefira Esri Satélite.',6000); });
$('#bmSelect').addEventListener('change',e=>{ S.basemap=e.target.value; applyBasemap(); });
$('#bmOpacity').addEventListener('input',e=>{ S.baseOpacity=+e.target.value; baseLayer.setOpacity(S.baseOpacity); S.mapVersion++; scheduleSave(); });
function renderCRSSelect(){ $('#crsSelect').innerHTML=crsOptions(S.crs,false)+`<option value="__auto">↻ Fuso UTM automático (SIRGAS 2000)</option>`; $('#crsSelect').value=S.crs; }
$('#crsSelect').addEventListener('change',e=>{ let v=e.target.value; if(v==='__auto'){ v=autoZone(); if(!v){ renderCRSSelect(); return; } } setCRS(v); });
$('#scaleList').innerHTML=SCALES.map(s=>`<option value="${nfi(s)}">`).join('');
$('#scaleIn').addEventListener('change',e=>{ const v=parseNum(String(e.target.value).replace(/\./g,'')); if(v>0) setScale(v); });
$('#scaleIn').addEventListener('keydown',e=>{ if(e.key==='Enter') e.target.blur(); });
const tog=(id,key,after)=>{ $(id).addEventListener('click',()=>{ S[key]=!S[key]; $(id).setAttribute('aria-pressed',S[key]); after&&after(); }); };
tog('#tgSnap','snap',refreshSnaps); tog('#tgOrtho','ortho'); tog('#tgGridSnap','gridSnap',updateGrid); tog('#tgShowGrid','showGrid',updateGrid);
$('#gridStep').addEventListener('change',e=>{ const v=parseNum(e.target.value); if(v>0){ S.gridStep=v; updateGrid(); } });
$('#projName').addEventListener('input',e=>{ S.projName=e.target.value||'Projeto'; scheduleSave(); });
$('#btnTheme').addEventListener('click',()=>{ const r=document.documentElement; const dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches; r.dataset.theme=dark?'light':'dark'; try{ localStorage.setItem('geoprancha:theme',r.dataset.theme); }catch(e){} });
try{ const t=localStorage.getItem('geoprancha:theme'); if(t) document.documentElement.dataset.theme=t; }catch(e){}

/* Ações */
const ACTIONS={
  novo:()=>modal({title:'Novo projeto',body:`<p style="margin-top:0">O projeto atual continua guardado em <b>Meus projetos</b>.</p><div class="form"><label for="npName">Nome</label><input type="text" id="npName" value="Novo projeto"><label for="npCrs">SRC</label><select id="npCrs">${crsOptions(autoZone()||'EPSG:31982',false)}</select></div><p class="note">Para plantas arquitetônicas sem coordenadas, escolha “Plano local”.</p>`,
    buttons:[{label:'Cancelar'},{label:'Criar',primary:true,action:async()=>{ await persistProject(); const name=$('#npName').value||'Novo projeto', crs=$('#npCrs').value; S.projCreated=Date.now(); const c=isLocal()||crs==='LOCAL'?[0,0]:ol.proj.transform(map.getView().getCenter(),S.crs,crs);
      loadProject({name,crs,view:{center:crs==='LOCAL'?[0,0]:c,resolution:crs==='LOCAL'?0.05:map.getView().getResolution()*gpu(S.crs,map.getView().getCenter())/gpu(crs,c)},basemap:crs==='LOCAL'?'nenhum':S.basemap,layers:[]}); S.layout=null; createVectorLayer({name:crs==='LOCAL'?'Paredes':'Limites'}); if(crs==='LOCAL'){ S.gridSnap=true; S.gridStep=0.05; $('#tgGridSnap').setAttribute('aria-pressed','true'); $('#gridStep').value='0.05'; activeLayer().style=Object.assign(activeLayer().style,{stroke:'#1f2933',fill:'#9aa5b1',fillOp:0.08,width:3,showVtx:false,showDist:true,showArea:true,areaUnit:'m2',labelColor:'#111111'}); styleChanged(activeLayer()); renderLayers(); } resetHistory(); scheduleSave(); }}]}),
  abrir:()=>$('#fileProject').click(), projetos:()=>openProjects(), exportarproj:()=>exportProjectFile(),
  simbologia:()=>openSymbology(), estilofeicao:()=>openFeatureStyle(),
  salvar:async()=>{ clearTimeout(saveT); await persistProject(); toast($('#saveState')?.dataset.s==='err'?'Não foi possível salvar no aparelho. Use “Salvar cópia (.json)”.':'Projeto salvo neste aparelho. Ele aparece em Meus projetos.'); },
  importar:()=>{ $('#fileImport').accept='.zip,.shp,.dbf,.prj,.cpg,.shx,.kml,.kmz,.geojson,.json,.gpx,.csv,.txt,.tif,.tiff,.png,.jpg,.jpeg,.pgw,.jgw,.pngw,.jpgw,.wld'; $('#fileImport').click(); },
  raster:()=>{ $('#fileImport').accept='.tif,.tiff,.png,.jpg,.jpeg,.pgw,.jgw,.pngw,.jpgw,.wld,.prj'; $('#fileImport').click(); toast('GeoTIFF sozinho, ou imagem + world file (.pgw/.jgw) selecionados juntos.',4500); },
  csv:()=>openCoordsModal(), azdist:()=>openTraverseModal(), retmed:()=>openRectModal(), irpara:()=>openGotoModal(), xyz:()=>openXYZModal(),
  expvet:()=>openExportVector(), expimg:()=>openExportImage(), layout:()=>openLayout(),
  duplicar:()=>duplicateSelected(), excluir:()=>deleteSelected(), desfazer:()=>undo(), refazer:()=>redo(),
  atributos:()=>{ const a=$('#attr'); a.hidden=!a.hidden; if(!a.hidden) renderAttrTable(); },
  addcampo:()=>{ const L=activeLayer(); if(!isVec(L)) return; modal({title:'Novo campo',body:`<div class="form"><label for="nfN">Nome do campo</label><input type="text" id="nfN" placeholder="ex.: matricula, uso_solo"></div>`,buttons:[{label:'Cancelar'},{label:'Adicionar',primary:true,action:()=>{ const n=$('#nfN').value.trim().replace(/\s+/g,'_'); if(!n||n.startsWith('_')) return false; L.source.getFeatures().forEach(f=>{ if(f.get(n)===undefined) f.set(n,''); }); commit(); renderAttrTable(); renderStyleEditor(); }}]}); },
  limparmed:()=>{ clearMeasures(); toast('Medições removidas.'); },
  novacamada:()=>{ createVectorLayer(); commit(); renameLayer(activeLayer()); },
  subir:()=>moveLayer(1), descer:()=>moveLayer(-1),
  zoomcamada:()=>{ const L=activeLayer(); if(!L) return; if(isVec(L)) zoomToExtent(L.source.getExtent()); else { const s=L.olLayer.getSource(); zoomToExtent(ol.proj.transformExtent(s.getImageExtent(),s.getProjection(),S.crs)); } },
  excluircamada:()=>{ const L=activeLayer(); if(!L) return; modal({title:'Excluir camada',body:`<p style="margin:0">Excluir a camada <b>${esc(L.name)}</b>${isVec(L)?` e suas ${L.source.getFeatures().length} feições`:''}?</p>`,buttons:[{label:'Cancelar'},{label:'Excluir',primary:true,action:()=>removeLayer(L)}]}); },
  renomear:()=>{ const L=activeLayer(); L&&renameLayer(L); },
  presetLimite:()=>{ const L=activeLayer(); if(!isVec(L)) return; Object.assign(L.style,{stroke:'#ffd21f',fill:'#ffd21f',fillOp:0.1,width:2.5,dash:'solid',showVtx:true,vtxPrefix:L.style.vtxPrefix||'M-',showDist:true,showAz:true,azMode:'az',showArea:true,areaUnit:'ha',labelColor:'#111111',vtxColor:'#e0218a'}); styleChanged(L); $('#styleSec').dataset.for=''; renderLayers(); },
  memorial:()=>openMemorial(), copiarvert:()=>{ const f=selFeature(); if(!f) return; const L=layerOfFeature(f); const {rows}=featureRows(f,L); copyText([`Vertice\t${isMetric()?'E\tN':'Longitude\tLatitude'}\tAzimute\tDistancia`].concat(rows.map(r=>{ const c=isMetric()?r.c:toLL(r.c); return [r.name,c[0].toFixed(isMetric()?3:8).replace('.',','),c[1].toFixed(isMetric()?3:8).replace('.',','),r.az!==undefined?dms(r.az):'',r.d!==undefined?r.d.toFixed(2).replace('.',','):''].join('\t'); })).join('\n')); },
  zoomfeat:()=>{ const f=selFeature(); f&&zoomToExtent(f.getGeometry().getExtent()); }, inverter:()=>{ const f=selFeature(); if(f){ reverseFeature(f); toast('Sentido invertido. A numeração dos vértices foi refeita.'); } },
  usarquadro:()=>{ const f=selFeature(); if(!f) return; LY().refFid=f.get('_fid'); toast('Polígono definido para o quadro de coordenadas, carimbo e enquadramento do layout.'); },
  gps:()=>gpsOpen(), minhapos:()=>gpsLocateOnce(), offline:()=>openOfflineModal(), instalar:()=>installApp(),
  openLeft:()=>$('#left').classList.add('open'), closeLeft:()=>$('#left').classList.remove('open'), openRight:()=>$('#right').classList.add('open'), closeRight:()=>$('#right').classList.remove('open')
};
function moveLayer(dir){ const L=activeLayer(); if(!L) return; const i=S.layers.indexOf(L), j=i+dir; if(j<0||j>=S.layers.length) return; S.layers.splice(i,1); S.layers.splice(j,0,L); restack(); renderLayers(); S.mapVersion++; scheduleSave(); }
document.addEventListener('click',e=>{ const t=e.target.closest('[data-tool]'); if(t&&!t.closest('.modal')){ setTool(t.dataset.tool); return; } const a=e.target.closest('[data-act]'); if(a&&ACTIONS[a.dataset.act]&&!a.closest('.modal')){ ACTIONS[a.dataset.act](); } });
$('#btnLayout').addEventListener('click',()=>openLayout());
$('#fileImport').addEventListener('change',e=>{ importFiles(e.target.files); e.target.value=''; });
$('#fileProject').addEventListener('change',async e=>{ const f=e.target.files[0]; e.target.value=''; if(f) importProjectFile(f); });
const mw=$('#mapwrap'); mw.addEventListener('dragover',e=>{ e.preventDefault(); }); mw.addEventListener('drop',e=>{ e.preventDefault(); if(e.dataTransfer.files.length) importFiles(e.dataTransfer.files); });

/* Barra CAD */
$('#cadAddPolar').addEventListener('click',()=>{ const d=parseNum($('#cadDist').value), az=parseAngle($('#cadAz').value); if(!(d>0)||!isFinite(az)) return toast('Informe a distância (m) e o azimute (graus).');
  if(!isMetric()) return toast('Entrada por distância exige SRC em metros (UTM ou plano local).'); const p=lastFixed(); if(!p) return toast('Marque o primeiro vértice (clique no mapa ou digite E/N).');
  cadAppend([p[0]+d*Math.sin(az*RAD),p[1]+d*Math.cos(az*RAD)]); $('#cadDist').value=''; $('#cadDist').focus(); });
$('#cadAddAbs').addEventListener('click',()=>{ const x=parseCoordVal($('#cadE').value), y=parseCoordVal($('#cadN').value); if(!isFinite(x)||!isFinite(y)) return toast('Informe E/X e N/Y.'); let c=[x,y]; if(!isMetric()) c=ol.proj.fromLonLat([x,y],S.crs); cadAppend(c); $('#cadE').value=''; $('#cadN').value=''; $('#cadE').focus(); });
['#cadDist','#cadAz'].forEach(s=>$(s).addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); $('#cadAddPolar').click(); } }));
['#cadE','#cadN'].forEach(s=>$(s).addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); $('#cadAddAbs').click(); } }));
$('#cadUndo').addEventListener('click',()=>{ I.draw&&I.draw.removeLastPoint(); });
$('#cadFinish').addEventListener('click',()=>{ if(I.draw&&I.sketch) I.draw.finishDrawing(); else toast('Nada sendo desenhado.'); });

/* Teclado */
document.addEventListener('keydown',e=>{ const tag=(e.target.tagName||'').toLowerCase(); const typing=tag==='input'||tag==='textarea'||tag==='select'||e.target.isContentEditable; if(document.querySelector('.modal-bg')) return;
  if(!$('#lay').hidden){ if(typing) return; const el=elById(LS.sel); if(el&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){ e.preventDefault(); const s=e.shiftKey?5:0.5; if(e.key==='ArrowLeft') el.x-=s; if(e.key==='ArrowRight') el.x+=s; if(e.key==='ArrowUp') el.y-=s; if(e.key==='ArrowDown') el.y+=s; renderLaySide(true); drawPreview(); } if(e.key==='Escape') closeLayout(); return; }
  if(typing) return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){ e.preventDefault(); e.shiftKey?redo():undo(); return; }
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){ e.preventDefault(); redo(); return; }
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){ e.preventDefault(); ACTIONS.salvar(); return; }
  if(e.key==='Escape'){ if(I.draw&&I.sketch) I.draw.abortDrawing(); else if(S.tool!=='select') setTool('select'); else clearSelection(); return; }
  if(e.key==='Backspace'&&I.draw&&I.sketch){ e.preventDefault(); I.draw.removeLastPoint(); return; }
  if((e.key==='Delete'||e.key==='Backspace')&&selFeature()){ e.preventDefault(); deleteSelected(); return; }
  const sc={i:'info',v:'select',p:'poligono',l:'linha',t:'texto',c:'cota',e:'vertices',m:'mover'}[e.key.toLowerCase()]; if(sc&&!e.ctrlKey&&!e.metaKey&&!e.altKey) setTool(sc); });

/* Compositor */
$('#layBack').addEventListener('click',closeLayout);
$('#layPng').addEventListener('click',()=>exportLayout('png')); $('#layPdf').addEventListener('click',()=>exportLayout('pdf')); $('#layGeoPdf').addEventListener('click',()=>exportLayout('geopdf'));
$('#layDpi').addEventListener('change',e=>{ LY().dpi=+e.target.value; });
bindLayoutCanvas(); bindLayoutSide();
window.addEventListener('resize',()=>{ if(!$('#lay').hidden){ sizeCanvas(); LS.mapKey=''; drawPreview(); scheduleMap(); } });
LAYOUT_DEFAULTS=()=>({conteudo:'PLANTA TOPOGRÁFICA',imovel:S.projName,municipio:'',data:todayBR()});

/* ===================== Exemplo inicial ===================== */
function loadSample(){ S.projId=uid(); S.projCreated=Date.now(); const P=ll=>ol.proj.fromLonLat(ll,S.crs);
  const ring=[[-48.3060,-13.4935],[-48.2985,-13.4928],[-48.2962,-13.4990],[-48.3008,-13.5021],[-48.3071,-13.4987]].map(P); ring.push(ring[0]);
  const lim=createVectorLayer({name:'Limite do imóvel (exemplo)',style:{stroke:'#ffd21f',fill:'#ffd21f',fillOp:0.1,width:2.6,showVtx:true,vtxPrefix:'M-',showDist:true,showAz:false,showArea:true,labelField:'nome'},
    features:[new ol.Feature({geometry:new ol.geom.Polygon([ring]),nome:'Fazenda Exemplo'})]});
  createVectorLayer({name:'Estrada de acesso (exemplo)',style:{stroke:'#ff7a1a',fill:'#ff7a1a',fillOp:0,width:3,dash:'dash',showVtx:false,showDist:false,showArea:false},
    features:[new ol.Feature({geometry:new ol.geom.LineString([[-48.3112,-13.4885],[-48.3046,-13.4946],[-48.3016,-13.4970],[-48.2990,-13.4985]].map(P)),nome:'Estrada vicinal'})]});
  createVectorLayer({name:'Benfeitorias (exemplo)',style:{stroke:'#38bdf8',fill:'#38bdf8',pointSize:6,showVtx:false,showDist:false,showArea:false,labelField:'nome',labelColor:'#ffffff'},
    features:[new ol.Feature({geometry:new ol.geom.Point(P([-48.3016,-13.4972])),nome:'Sede'}),new ol.Feature({geometry:new ol.geom.Point(P([-48.2998,-13.4962])),nome:'Curral'})]});
  S.activeId=lim.id; S.projName='Fazenda Exemplo'; $('#projName').value=S.projName; renderLayers(); zoomToExtent(lim.source.getExtent(),17);
  S.layout=null; LY(); const sp=elById('selo').p; Object.assign(sp,{imovel:'Fazenda Exemplo (dados fictícios)',municipio:'Minaçu – GO',proprietario:'—',resp:'Eng. Florestal Leovigildo',registro:'CREA-GO 2417068605/V'});
  LY().refFid=lim.source.getFeatures()[0].get('_fid'); }

/* ===================== Início ===================== */
(async function init(){ renderCRSSelect(); renderBasemapUI(); bindView(); let restored=false;
  try{ restored=!!(await startProjects()); }catch(e){ console.warn(e); }
  if(!restored){ applyBasemap(); loadSample(); persistProject(); }
  setTool('select'); resetHistory(); setTimeout(gpsResumeCheck,800); renderFeaturePanel(); showTab('desenhar');
  let framed=false; try{ framed=window.self!==window.top; }catch(e){ framed=true; }
  if(framed){ setTimeout(()=>modal({title:'Abra o GeoPrancha direto no navegador',body:'<p style="margin-top:0">Este arquivo está sendo exibido dentro de um visualizador, que bloqueia os mapas de fundo e os downloads.</p><p>Abra o GeoPrancha direto no <b>Chrome</b> ou <b>Edge</b>, pelo endereço publicado (GitHub Pages) ou pelo app instalado. Todas as funções passam a funcionar.</p>',buttons:[{label:'Continuar assim mesmo',primary:true}]}),600); }
  toast(restored?'Projeto “'+S.projName+'” reaberto. Seus outros projetos estão em Meus projetos.':'Bem-vindo! Um imóvel de exemplo foi carregado para você explorar. Use Arquivo › Novo projeto para começar o seu.',5500); })();
