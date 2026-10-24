'use strict';
/* =====================================================================
   Simbologia: formatos de ponto, hachuras, tipos de linha, estilo por
   feição (_st), simbologia categorizada por campo e estilos prontos.
   O estilo efetivo de uma feição = estilo da camada + categoria + _st.
   ===================================================================== */
const SYM_KEYS=['stroke','width','dash','fill','fillOp','fillPattern','pointShape','pointFill','pointStroke','pointSize'];
const SYM_DEF={fillPattern:'solido',pointShape:'circulo',pointFill:'',pointStroke:'#1b1b1b',symMode:'unico',catField:'',cats:[],catOther:'#9e9e9e'};
const POINT_SHAPES=[['circulo','Círculo'],['quadrado','Quadrado'],['triangulo','Triângulo'],['losango','Losango'],['estrela','Estrela'],['cruz','Cruz'],['x','X'],['pino','Alfinete']];
const FILL_PATTERNS=[['solido','Sólido'],['nenhum','Sem preenchimento'],['diagonal','Hachura diagonal ╱'],['diagonal2','Hachura diagonal ╲'],['cruzado','Hachura cruzada'],['horizontal','Linhas horizontais'],['vertical','Linhas verticais'],['grade','Grade'],['pontos','Pontilhado']];
const DASHES=[['solid','Contínua'],['dash','Tracejada'],['longdash','Traço longo'],['dot','Pontilhada'],['dashdot','Traço-ponto']];
const CAT_PALETTE=['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6','#bcf60c','#008080','#9a6324','#800000','#aaffc3','#808000','#000075','#fabebe'];
const dashArr=(d,w=1)=>({dash:[10,6],longdash:[18,7],dot:[1.5,5],dashdot:[12,4,2,4]}[d]);
function darken(hex,f=0.35){ const n=parseInt((hex||'#888888').slice(1),16); const c=v=>Math.max(0,Math.round(v*(1-f))).toString(16).padStart(2,'0'); return '#'+c(n>>16&255)+c(n>>8&255)+c(n&255); }
const geomClass=g=>{ const t=g?g.getType():''; return t.includes('Polygon')?'A':t.includes('Line')?'L':'P'; };

/* Estilo efetivo */
function effStyle(L,f){ const st=L.style; let e=st;
  if(st.symMode==='categorizado'&&st.catField){ const v=String(f.get(st.catField)??''); const c=(st.cats||[]).find(x=>x.v===v); const col=c?c.color:st.catOther;
    const gc=geomClass(f.getGeometry()); e=Object.assign({},st,{fill:col,pointFill:col,stroke:gc==='L'?col:(c&&c.stroke)||darken(col)}); }
  const o=f.get('_st'); if(o&&typeof o==='object') e=Object.assign({},e,o); return e; }

/* Padrões de preenchimento (hachuras) */
const patCache=new Map();
function patternCanvas(color,type,s=10,lw=1.2){ const c=document.createElement('canvas'); c.width=c.height=s; const x=c.getContext('2d'); x.strokeStyle=color; x.fillStyle=color; x.lineWidth=lw; x.lineCap='square';
  const line=(a,b,cc,d)=>{ x.beginPath(); x.moveTo(a,b); x.lineTo(cc,d); x.stroke(); };
  if(type==='diagonal'||type==='cruzado') for(const o of [-s,0,s]) line(o,s,o+s,0);
  if(type==='diagonal2'||type==='cruzado') for(const o of [-s,0,s]) line(o,0,o+s,s);
  if(type==='horizontal'||type==='grade') line(0,s/2,s,s/2);
  if(type==='vertical'||type==='grade') line(s/2,0,s/2,s);
  if(type==='pontos'){ x.beginPath(); x.arc(s/2,s/2,Math.max(0.8,s*0.13),0,Math.PI*2); x.fill(); }
  return c; }
function patternFill(color,type){ const k=color+type; if(!patCache.has(k)) patCache.set(k,document.createElement('canvas').getContext('2d').createPattern(patternCanvas(color,type),'repeat')); return patCache.get(k); }

/* Símbolo de ponto */
function pointImage(e){ const r=Math.max(1,+e.pointSize||6), col=e.pointFill||e.stroke, sc=e.pointStroke||'#1b1b1b';
  const F=new ol.style.Fill({color:col}), St=new ol.style.Stroke({color:sc,width:1.5});
  switch(e.pointShape){
    case 'quadrado': return new ol.style.RegularShape({points:4,radius:r*1.2,angle:Math.PI/4,fill:F,stroke:St});
    case 'triangulo': return new ol.style.RegularShape({points:3,radius:r*1.35,angle:0,fill:F,stroke:St});
    case 'losango': return new ol.style.RegularShape({points:4,radius:r*1.35,angle:0,fill:F,stroke:St});
    case 'estrela': return new ol.style.RegularShape({points:5,radius:r*1.5,radius2:r*0.62,angle:0,fill:F,stroke:St});
    case 'cruz': return new ol.style.RegularShape({points:4,radius:r*1.4,radius2:0,angle:0,stroke:new ol.style.Stroke({color:col,width:Math.max(2,r*0.45)})});
    case 'x': return new ol.style.RegularShape({points:4,radius:r*1.4,radius2:0,angle:Math.PI/4,stroke:new ol.style.Stroke({color:col,width:Math.max(2,r*0.45)})});
    case 'pino': return new ol.style.Icon({src:pinSVG(col,sc),anchor:[0.5,1],scale:r/6});
    default: return new ol.style.Circle({radius:r,fill:F,stroke:St}); } }
function pinSVG(col,sc){ return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="34" viewBox="0 0 24 34"><path d="M12 33s-10-12.5-10-20a10 10 0 0 1 20 0c0 7.5-10 20-10 20z" fill="${col}" stroke="${sc}" stroke-width="1.6"/><circle cx="12" cy="12.5" r="4" fill="#fff"/></svg>`); }

/* Estilos OpenLayers com cache */
const symCache=new Map();
function symStyles(e,gc){ const key=gc+'|'+SYM_KEYS.map(k=>e[k]).join('|'); let s=symCache.get(key); if(s) return s; if(symCache.size>800) symCache.clear();
  const dash=e.dash&&e.dash!=='solid'?dashArr(e.dash):undefined;
  const stroke=new ol.style.Stroke({color:e.stroke,width:+e.width,lineDash:dash,lineCap:dash?'butt':'round',lineJoin:'round'});
  if(gc==='A'){ const pat=e.fillPattern||'solido'; s=[];
    if(pat==='nenhum') s.push(new ol.style.Style({fill:new ol.style.Fill({color:'rgba(0,0,0,0.01)'})}));
    else { if(+e.fillOp>0) s.push(new ol.style.Style({fill:new ol.style.Fill({color:hexA(e.fill,pat==='solido'?+e.fillOp:Math.min(+e.fillOp,0.35))})}));
      else s.push(new ol.style.Style({fill:new ol.style.Fill({color:'rgba(0,0,0,0.01)'})}));
      if(pat!=='solido') s.push(new ol.style.Style({fill:new ol.style.Fill({color:patternFill(e.fill,pat)})})); }
    s.push(new ol.style.Style({stroke})); }
  else if(gc==='L') s=[new ol.style.Style({stroke})];
  else s=[new ol.style.Style({image:pointImage(e)})];
  symCache.set(key,s); return s; }
function featureSymbology(L,f){ const g=f.getGeometry(); return symStyles(effStyle(L,f),geomClass(g)); }

/* Desenho do símbolo em canvas (legenda da prancha, prévias). Coordenadas em px; k = px por mm */
function drawSym(ctx,x,y,w,h,e,gc,k){ ctx.save(); const lw=Math.min(0.75,Math.max(0.2,(+e.width||2)*0.17))*k; const dash=e.dash&&e.dash!=='solid'?dashArr(e.dash).map(v=>v*0.16*k):[];
  if(gc==='A'){ const pat=e.fillPattern||'solido';
    if(pat!=='nenhum'){ ctx.fillStyle=hexA(e.fill,pat==='solido'?Math.max(0.2,+e.fillOp):Math.min(0.35,+e.fillOp)); ctx.fillRect(x,y,w,h);
      if(pat!=='solido'){ const s=Math.max(4,Math.round(1.7*k)); ctx.fillStyle=ctx.createPattern(patternCanvas(e.fill,pat,s,Math.max(0.6,0.18*k)),'repeat'); ctx.fillRect(x,y,w,h); } }
    ctx.setLineDash(dash); ctx.strokeStyle=e.stroke; ctx.lineWidth=lw; ctx.strokeRect(x,y,w,h); }
  else if(gc==='L'){ ctx.setLineDash(dash); ctx.strokeStyle=e.stroke; ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(x,y+h/2); ctx.lineTo(x+w,y+h/2); ctx.stroke(); }
  else { const r=Math.min(h*0.48,Math.max(0.9*k,(+e.pointSize||6)*0.22*k)); drawShape(ctx,x+w/2,y+h/2,r,e.pointShape,e.pointFill||e.stroke,e.pointStroke||'#1b1b1b',Math.max(0.6,0.12*k)); }
  ctx.restore(); }
function drawShape(ctx,cx,cy,r,shape,fill,stroke,lw){ ctx.save(); ctx.fillStyle=fill; ctx.strokeStyle=stroke; ctx.lineWidth=lw; ctx.setLineDash([]); ctx.beginPath();
  const reg=(n,R,a0,R2)=>{ const pts=R2!==undefined?n*2:n; for(let i=0;i<pts;i++){ const rr=R2!==undefined&&i%2?R2:R; const a=a0+i*Math.PI*2/pts; const px=cx+rr*Math.sin(a), py=cy-rr*Math.cos(a); i?ctx.lineTo(px,py):ctx.moveTo(px,py); } ctx.closePath(); };
  if(shape==='quadrado') reg(4,r*1.15,Math.PI/4); else if(shape==='triangulo') reg(3,r*1.3,0); else if(shape==='losango') reg(4,r*1.3,0); else if(shape==='estrela') reg(5,r*1.45,0,r*0.6);
  else if(shape==='cruz'||shape==='x'){ const a=shape==='x'?Math.PI/4:0, R=r*1.3; ctx.strokeStyle=fill; ctx.lineWidth=Math.max(lw*2,r*0.42); for(const b of [a,a+Math.PI/2]){ ctx.moveTo(cx-R*Math.sin(b),cy+R*Math.cos(b)); ctx.lineTo(cx+R*Math.sin(b),cy-R*Math.cos(b)); } ctx.stroke(); ctx.restore(); return; }
  else if(shape==='pino'){ const R=r*0.95; ctx.moveTo(cx,cy+R*1.6); ctx.bezierCurveTo(cx-R*1.6,cy-R*0.2,cx-R*1.1,cy-R*1.6,cx,cy-R*1.6); ctx.bezierCurveTo(cx+R*1.1,cy-R*1.6,cx+R*1.6,cy-R*0.2,cx,cy+R*1.6); ctx.closePath(); }
  else ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fill(); ctx.stroke(); ctx.restore(); }
function symDataURL(e,gc,w=40,h=24){ const c=document.createElement('canvas'); const d=2; c.width=w*d; c.height=h*d; const x=c.getContext('2d'); drawSym(x,3*d,4*d,(w-6)*d,(h-8)*d,e,gc,4*d); return c.toDataURL(); }

/* Estilos prontos */
const PRESETS=[
  {n:'Limite do imóvel',g:'A',s:{stroke:'#ffd21f',width:2.6,dash:'solid',fill:'#ffd21f',fillOp:0.08,fillPattern:'nenhum',showVtx:true,showDist:true,showArea:true}},
  {n:'APP',g:'A',s:{stroke:'#1565c0',width:2,dash:'solid',fill:'#42a5f5',fillOp:0.15,fillPattern:'diagonal'}},
  {n:'Reserva Legal',g:'A',s:{stroke:'#1b5e20',width:2,dash:'solid',fill:'#43a047',fillOp:0.18,fillPattern:'cruzado'}},
  {n:'Vegetação nativa',g:'A',s:{stroke:'#2e7d32',width:1.5,dash:'solid',fill:'#66bb6a',fillOp:0.45,fillPattern:'solido'}},
  {n:'Supressão (ASV)',g:'A',s:{stroke:'#c62828',width:2,dash:'dash',fill:'#ef5350',fillOp:0.15,fillPattern:'diagonal2'}},
  {n:'PRAD / recuperar',g:'A',s:{stroke:'#795548',width:2,dash:'solid',fill:'#bcaaa4',fillOp:0.25,fillPattern:'pontos'}},
  {n:'Pastagem',g:'A',s:{stroke:'#9e9d24',width:1.5,dash:'solid',fill:'#dce775',fillOp:0.4,fillPattern:'solido'}},
  {n:'Área construída',g:'A',s:{stroke:'#424242',width:2,dash:'solid',fill:'#9e9e9e',fillOp:0.25,fillPattern:'grade'}},
  {n:'Parede (arquitetura)',g:'A',s:{stroke:'#111111',width:3.5,dash:'solid',fill:'#757575',fillOp:0.2,fillPattern:'cruzado'}},
  {n:'Curso d\'água',g:'L',s:{stroke:'#1565c0',width:2.5,dash:'solid'}},
  {n:'Estrada / acesso',g:'L',s:{stroke:'#6d4c41',width:3,dash:'dash'}},
  {n:'Cerca / divisa',g:'L',s:{stroke:'#212121',width:1.5,dash:'dashdot'}},
  {n:'Rede elétrica',g:'L',s:{stroke:'#f57c00',width:1.8,dash:'longdash'}},
  {n:'Marco / vértice',g:'P',s:{pointShape:'triangulo',pointFill:'#e53935',pointStroke:'#1b1b1b',pointSize:7,stroke:'#e53935'}},
  {n:'Árvore / indivíduo',g:'P',s:{pointShape:'circulo',pointFill:'#2e7d32',pointStroke:'#ffffff',pointSize:5,stroke:'#2e7d32'}},
  {n:'Nascente',g:'P',s:{pointShape:'estrela',pointFill:'#1e88e5',pointStroke:'#0d47a1',pointSize:7,stroke:'#1e88e5'}},
  {n:'Benfeitoria',g:'P',s:{pointShape:'quadrado',pointFill:'#455a64',pointStroke:'#ffffff',pointSize:6,stroke:'#455a64'}},
  {n:'Ponto de interesse',g:'P',s:{pointShape:'pino',pointFill:'#d81b60',pointStroke:'#ffffff',pointSize:7,stroke:'#d81b60'}}];

/* Janela de simbologia (camada ou feição) */
function symFieldHTML(e,gcs,pre=''){ const sel=(id,opts,v)=>`<select id="${pre}${id}" data-s="${id}">${opts.map(([a,b])=>`<option value="${a}" ${a===v?'selected':''}>${b}</option>`).join('')}</select>`;
  let h='';
  if(gcs.includes('A')||gcs.includes('L')) h+=`<div class="sub">${gcs.includes('A')?'Linha e contorno':'Linha'}</div><div class="form"><label>Cor / espessura</label><div class="pair"><input type="color" data-s="stroke" value="${e.stroke}" aria-label="Cor da linha"><input type="number" data-s="width" min="0.5" max="20" step="0.5" value="${e.width}" title="Espessura (px)" aria-label="Espessura"></div><label for="${pre}dash">Tipo de linha</label>${sel('dash',DASHES,e.dash||'solid')}</div>`;
  if(gcs.includes('A')) h+=`<div class="sub">Preenchimento</div><div class="form"><label>Cor / opacidade</label><div class="pair"><input type="color" data-s="fill" value="${e.fill}" aria-label="Cor do preenchimento"><input type="number" data-s="fillOp" min="0" max="1" step="0.05" value="${e.fillOp}" title="Opacidade de 0 a 1" aria-label="Opacidade"></div><label for="${pre}fillPattern">Padrão</label>${sel('fillPattern',FILL_PATTERNS,e.fillPattern||'solido')}</div>`;
  if(gcs.includes('P')) h+=`<div class="sub">Pontos</div><div class="form"><label for="${pre}pointShape">Formato</label>${sel('pointShape',POINT_SHAPES,e.pointShape||'circulo')}<label>Cor / borda</label><div class="pair"><input type="color" data-s="pointFill" value="${e.pointFill||e.stroke}" aria-label="Cor do ponto"><input type="color" data-s="pointStroke" value="${e.pointStroke||'#1b1b1b'}" aria-label="Cor da borda"></div><label for="${pre}pointSize">Tamanho</label><input type="number" id="${pre}pointSize" data-s="pointSize" min="2" max="30" value="${e.pointSize}"></div>`;
  return h; }
function layerGeomClasses(L){ const c=geomSummary(L); const out=[]; if(c.A) out.push('A'); if(c.L) out.push('L'); if(c.P) out.push('P'); return out.length?out:['A','L','P']; }
const GC_NAME={A:'Polígonos',L:'Linhas',P:'Pontos'};
function openSymbology(L){ L=L||activeLayer(); if(!isVec(L)) return toast('Selecione uma camada vetorial.'); Object.keys(SYM_DEF).forEach(k=>{ if(L.style[k]===undefined) L.style[k]=Array.isArray(SYM_DEF[k])?[]:SYM_DEF[k]; });
  const st=L.style; const gcs=layerGeomClasses(L); let tab='simbolo';
  const m=modal({title:'Simbologia · '+L.name,wide:true,body:'<div id="symBody"></div>',buttons:[{label:'Concluir',primary:true}],onOpen:bg=>{ bg.classList.add('see'); render(); }});
  function render(){ const box=$('#symBody'); if(!box) return; const fields=fieldsOf(L);
    let h=`<div class="seg" style="margin-bottom:12px">${[['simbolo','Símbolo'],['categorias','Por categoria'],['prontos','Estilos prontos'],['rotulos','Rótulos']].map(([v,l])=>`<button data-tab="${v}" aria-pressed="${tab===v}">${l}</button>`).join('')}</div>`;
    if(tab==='simbolo'){ h+=`<div class="symprev">${gcs.map(g=>`<figure><img alt="" src="${symDataURL(st,g,64,36)}"><figcaption>${GC_NAME[g]}</figcaption></figure>`).join('')}</div>`;
      h+=symFieldHTML(st,gcs,'s');
      if(st.symMode==='categorizado') h+=`<p class="note">A camada usa cores por categoria (campo “${esc(st.catField)}”). As cores de preenchimento vêm das categorias; linhas e espessuras daqui continuam valendo.</p>`; }
    else if(tab==='categorias'){ h+=`<div class="form"><label for="catMode">Modo</label><select id="catMode"><option value="unico" ${st.symMode!=='categorizado'?'selected':''}>Símbolo único</option><option value="categorizado" ${st.symMode==='categorizado'?'selected':''}>Categorizado por campo</option></select>
        <label for="catField">Campo</label><select id="catField"><option value="">— escolha —</option>${fields.map(f=>`<option ${f===st.catField?'selected':''}>${esc(f)}</option>`).join('')}</select><span></span><button class="tb primary" id="catBuild">Classificar valores</button></div>`;
      if(st.cats&&st.cats.length) h+=`<div class="vwrap" style="margin-top:10px;max-height:300px"><table class="cattab"><thead><tr><th>Cor</th><th>Valor</th><th>Texto na legenda</th><th>Qtd.</th></tr></thead><tbody>${st.cats.map((c,i)=>`<tr><td><input type="color" data-cat="${i}" data-ck="color" value="${c.color}" aria-label="Cor"></td><td>${esc(c.v||'(vazio)')}</td><td><input class="inp" data-cat="${i}" data-ck="label" value="${esc(c.label)}" aria-label="Texto na legenda"></td><td class="num">${c.n}</td></tr>`).join('')}</tbody></table></div><div class="form" style="margin-top:8px"><label for="catOther">Outros valores</label><input type="color" id="catOther" value="${st.catOther}"></div>`;
      else h+='<p class="note">Escolha um campo (ex.: uso_solo, classe, fitofisionomia) e toque em “Classificar valores”. Cada valor recebe uma cor e aparece na legenda da prancha.</p>'; }
    else if(tab==='prontos'){ h+=`<p class="note" style="margin-top:0">Aplicam cores, padrão e tipo de linha à camada inteira. Você pode ajustar depois na aba Símbolo.</p><div class="presets">${PRESETS.map((p,i)=>`<button class="preset" data-preset="${i}"><img alt="" src="${symDataURL(Object.assign({},DEF_STYLE(),SYM_DEF,p.s),p.g,56,30)}"><span>${esc(p.n)}</span></button>`).join('')}</div>`; }
    else { h+=`<div class="form"><label class="chk full"><input type="checkbox" data-l="showVtx" ${st.showVtx?'checked':''}> Numerar vértices</label>
        <label>Prefixo / início</label><div class="pair"><input type="text" data-l="vtxPrefix" value="${esc(st.vtxPrefix)}" aria-label="Prefixo"><input type="number" data-l="vtxStart" min="0" value="${st.vtxStart}" aria-label="Número inicial"></div>
        <label>Cor do vértice</label><input type="color" data-l="vtxColor" value="${st.vtxColor}">
        <label class="chk full"><input type="checkbox" data-l="showDist" ${st.showDist?'checked':''}> Distâncias nos lados</label>
        <label class="chk"><input type="checkbox" data-l="showAz" ${st.showAz?'checked':''}> Ângulo</label><select data-l="azMode" aria-label="Tipo"><option value="az" ${st.azMode==='az'?'selected':''}>Azimute</option><option value="rumo" ${st.azMode==='rumo'?'selected':''}>Rumo</option></select>
        <label class="chk"><input type="checkbox" data-l="showArea" ${st.showArea?'checked':''}> Área</label><select data-l="areaUnit" aria-label="Unidade"><option value="ha" ${st.areaUnit==='ha'?'selected':''}>hectares</option><option value="m2" ${st.areaUnit==='m2'?'selected':''}>m²</option></select>
        <label>Rótulo por campo</label><select data-l="labelField"><option value="">— nenhum —</option>${fields.map(k=>`<option ${k===st.labelField?'selected':''}>${esc(k)}</option>`).join('')}</select>
        <label>Texto (px / cor)</label><div class="pair"><input type="number" data-l="labelSize" min="7" max="28" value="${st.labelSize}"><input type="color" data-l="labelColor" value="${st.labelColor}" aria-label="Cor do texto"></div></div>`; }
    box.innerHTML=h; }
  const changed=()=>{ styleChanged(L); $('#styleSec').dataset.for=''; renderLayers(); };
  const el=m.el;
  el.addEventListener('click',ev=>{ const t=ev.target.closest('[data-tab]'); if(t&&t.closest('#symBody')){ tab=t.dataset.tab; render(); return; }
    const p=ev.target.closest('[data-preset]'); if(p){ const P=PRESETS[+p.dataset.preset]; Object.assign(st,P.s); if(P.g!=='P'&&!P.s.pointFill) st.pointFill=P.s.stroke; changed(); tab='simbolo'; render(); toast('Estilo “'+P.n+'” aplicado.'); return; }
    if(ev.target.id==='catBuild'){ const fld=$('#catField').value; if(!fld){ toast('Escolha o campo.'); return; } const cnt=new Map(); L.source.getFeatures().forEach(f=>{ if(f.get('_kind')) return; const v=String(f.get(fld)??''); cnt.set(v,(cnt.get(v)||0)+1); });
      const vals=[...cnt.keys()].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true})).slice(0,60); const old=new Map((st.cats||[]).map(c=>[c.v,c]));
      st.cats=vals.map((v,i)=>({v,label:old.get(v)?.label??(v||'(vazio)'),color:old.get(v)?.color||CAT_PALETTE[i%CAT_PALETTE.length],n:cnt.get(v)})); st.catField=fld; st.symMode='categorizado'; changed(); render();
      if(cnt.size>60) toast('Mais de 60 valores; os demais usam a cor de “outros valores”.'); } });
  el.addEventListener('input',ev=>{ const t=ev.target;
    if(t.dataset.s){ let v=t.value; if(['width','fillOp','pointSize'].includes(t.dataset.s)) v=+v; st[t.dataset.s]=v; changed(); const pv=el.querySelector('.symprev'); if(pv) pv.innerHTML=gcs.map(g=>`<figure><img alt="" src="${symDataURL(st,g,64,36)}"><figcaption>${GC_NAME[g]}</figcaption></figure>`).join(''); }
    else if(t.dataset.l){ let v=t.type==='checkbox'?t.checked:t.value; if(['vtxStart','labelSize'].includes(t.dataset.l)) v=+v; st[t.dataset.l]=v; changed(); }
    else if(t.dataset.cat!==undefined){ st.cats[+t.dataset.cat][t.dataset.ck]=t.value; changed(); }
    else if(t.id==='catOther'){ st.catOther=t.value; changed(); } });
  el.addEventListener('change',ev=>{ if(ev.target.id==='catMode'){ st.symMode=ev.target.value; changed(); render(); } else if(ev.target.id==='catField'&&st.symMode==='categorizado'&&ev.target.value!==st.catField){ st.cats=[]; st.catField=ev.target.value; changed(); render(); } }); }
function openFeatureStyle(){ const f=selFeature(); if(!f) return toast('Selecione uma feição.'); const L=layerOfFeature(f); if(f.get('_kind')) return toast('Textos e cotas têm estilo no painel da feição.');
  const gc=geomClass(f.getGeometry()); const base=effStyle(L,f); const own=Object.assign({},f.get('_st')||{});
  const m=modal({title:'Estilo desta feição',body:`<p class="note" style="margin-top:0">Muda só a feição “${esc(f.get('nome')||'sem nome')}”, sem alterar o restante da camada “${esc(L.name)}”.</p><div class="symprev" id="fsPrev"></div>${symFieldHTML(base,[gc],'f')}`,
    buttons:[{label:'Usar estilo da camada',noEsc:true,action:()=>{ f.unset('_st'); commit(); toast('A feição voltou ao estilo da camada.'); }},{label:'Concluir',primary:true,action:()=>{ commit(); }}],
    onOpen:bg=>{ bg.classList.add('see'); const pv=()=>$('#fsPrev').innerHTML=`<figure><img alt="" src="${symDataURL(Object.assign({},base,own),gc,64,36)}"><figcaption>Prévia</figcaption></figure>`; pv();
      bg.addEventListener('input',ev=>{ const t=ev.target; if(!t.dataset.s) return; let v=t.value; if(['width','fillOp','pointSize'].includes(t.dataset.s)) v=+v; own[t.dataset.s]=v; f.set('_st',Object.assign({},own)); pv(); S.mapVersion++; }); }}); }
