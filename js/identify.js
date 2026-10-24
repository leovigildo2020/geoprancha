'use strict';
/* =====================================================================
   Ferramenta Informações (ⓘ): toque numa feição e veja os atributos
   num popup, no formato "campo: valor", mais as medidas da geometria.
   Quando várias feições se sobrepõem, as setas navegam entre elas.
   ===================================================================== */
const ID={ov:null,hits:[],i:0};
const idSource=new ol.source.Vector();
map.addLayer(new ol.layer.Vector({source:idSource,zIndex:975,style:f=>{ const g=f.getGeometry(); const gc=geomClass(g);
  const s=[new ol.style.Style({stroke:new ol.style.Stroke({color:'#00e5ff',width:gc==='P'?0:4}),fill:new ol.style.Fill({color:'rgba(0,229,255,.12)'})})];
  if(gc==='P') s.push(new ol.style.Style({image:new ol.style.Circle({radius:12,stroke:new ol.style.Stroke({color:'#00e5ff',width:3})})}));
  return s; }}));
function fmtVal(v){ if(v===undefined||v===null||v==='') return '<span class="nd">—</span>'; if(typeof v==='boolean') return v?'Sim':'Não';
  if(typeof v==='number') return Number.isInteger(v)?v.toLocaleString('pt-BR'):v.toLocaleString('pt-BR',{maximumFractionDigits:6});
  if(typeof v==='object') return esc(JSON.stringify(v)); const s=String(v); if(/^https?:\/\/\S+$/.test(s)) return `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(s)}</a>`; return esc(s); }
function geomInfo(f){ const g=f.getGeometry(); if(!g) return []; const t=g.getType(), k=f.get('_kind'); const out=[];
  if(k==='texto') return [['Tipo','Texto']]; if(k==='cota'){ return [['Tipo','Cota'],['Comprimento',nf(gLength(g))+' m']]; }
  if(t.includes('Polygon')){ const A=gArea(g); out.push(['Tipo','Polígono'],['Área',`${nf(A/1e4,4)} ha (${nf(A)} m²)`],['Perímetro',nf(gLength(g))+' m'],['Vértices',vertexCoords(g).length]); }
  else if(t.includes('Line')) out.push(['Tipo','Linha'],['Comprimento',nf(gLength(g))+' m'],['Vértices',vertexCoords(g).length]);
  else { const c=t==='Point'?g.getCoordinates():g.getFirstCoordinate(); out.push(['Tipo','Ponto']); if(isMetric()) out.push(['E',nf(c[0])+' m'],['N',nf(c[1])+' m']); if(!isLocal()){ const ll=toLL(c); out.push(['Latitude',latTxt(ll[1])],['Longitude',lonTxt(ll[0])]); } }
  return out; }
function identifyAt(e){ const hits=[], seen=new Set();
  map.forEachFeatureAtPixel(e.pixel,(f,lyr)=>{ const L=S.layers.find(x=>isVec(x)&&x.olLayer===lyr); if(L&&!seen.has(f)){ seen.add(f); hits.push({f,L}); } },{hitTolerance:8,layerFilter:l=>S.layers.some(L=>isVec(L)&&L.visible&&L.olLayer===l)});
  if(!hits.length){ closeIdentify(); toast('Nenhuma feição neste ponto. Toque sobre uma linha, ponto ou polígono.',2500); return; }
  ID.hits=hits; ID.i=0; ID.at=e.coordinate; renderIdentify(); }
function renderIdentify(){ const h=ID.hits[ID.i]; if(!h) return; const {f,L}=h;
  if(!ID.ov){ const el=document.createElement('div'); el.className='popup idpop'; ID.ov=new ol.Overlay({element:el,positioning:'bottom-center',offset:[0,-14],autoPan:{animation:{duration:200},margin:20},stopEvent:true}); map.addOverlay(ID.ov);
    el.addEventListener('click',ev=>{ const b=ev.target.closest('[data-id]'); if(!b) return; const a=b.dataset.id; const cur=ID.hits[ID.i];
      if(a==='x') closeIdentify(); if(a==='prev'){ ID.i=(ID.i-1+ID.hits.length)%ID.hits.length; renderIdentify(); } if(a==='next'){ ID.i=(ID.i+1)%ID.hits.length; renderIdentify(); }
      if(a==='copy'){ copyText(el.dataset.txt); } if(a==='sel'){ closeIdentify(); setTool('select'); S.activeId=cur.L.id; renderLayers(); selectFeature(cur.f); }
      if(a==='tab'){ closeIdentify(); S.activeId=cur.L.id; renderLayers(); $('#attr').hidden=false; renderAttrTable(); selectFeature(cur.f); setTimeout(()=>$('#attrWrap tr.sel')?.scrollIntoView({block:'center'}),50); } }); }
  const fields=fieldsOf(L); if(f.get('_kind')==='texto'&&!fields.includes('texto')) fields.unshift('texto'); Object.keys(f.getProperties()).forEach(k=>{ if(k!=='geometry'&&!k.startsWith('_')&&!fields.includes(k)) fields.push(k); });
  const gi=geomInfo(f); const line=(k,v)=>`<p><b>${esc(k)}:</b> ${v}</p>`;
  const el=ID.ov.getElement();
  el.innerHTML=`<header><svg class="i sm" viewBox="0 0 24 24">${ICONS.info}</svg><b class="ttl" title="${esc(L.name)}">${esc(L.name)}</b>${ID.hits.length>1?`<button class="nav" data-id="prev" aria-label="Anterior">‹</button><span class="cnt">${ID.i+1}/${ID.hits.length}</span><button class="nav" data-id="next" aria-label="Próxima">›</button>`:''}<button class="x" data-id="x" aria-label="Fechar">×</button></header>
    <div class="idbody">${fields.length?fields.map(k=>line(k,fmtVal(f.get(k)))).join(''):'<p class="nd">Sem atributos. Adicione campos na tabela de atributos.</p>'}
    <div class="sub">Geometria</div>${gi.map(([k,v])=>line(k,typeof v==='number'?v.toLocaleString('pt-BR'):esc(v))).join('')}</div>
    <footer><button class="tb" data-id="sel">Selecionar</button><button class="tb" data-id="tab">Ver na tabela</button><button class="tb" data-id="copy">Copiar</button></footer>`;
  el.dataset.txt=[`Camada: ${L.name}`].concat(fields.map(k=>`${k}: ${f.get(k)??''}`),gi.map(([k,v])=>`${k}: ${v}`)).join('\n');
  idSource.clear(); idSource.addFeature(new ol.Feature(f.getGeometry().clone()));
  const g=f.getGeometry(); let pos=ID.at; if(geomClass(g)==='P') pos=g.getType()==='Point'?g.getCoordinates():g.getFirstCoordinate(); ID.ov.setPosition(pos); }
function closeIdentify(){ if(ID.ov) ID.ov.setPosition(undefined); idSource.clear(); ID.hits=[]; }
