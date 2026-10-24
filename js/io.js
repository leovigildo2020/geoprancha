'use strict';
/* ===================== Importação ===================== */
async function importFiles(fileList){ const files=[...fileList]; if(!files.length) return; busy('Lendo arquivos…'); let n=0;
  try{ const groups={}; files.forEach(f=>{ const m=f.name.match(/^(.*)\.([^.]+)$/); const base=(m?m[1]:f.name), ext=(m?m[2]:'').toLowerCase(); const k=base.toLowerCase(); (groups[k]=groups[k]||{_base:base})[ext]=f; });
    for(const g of Object.values(groups)){
      if(g.zip) n+=await importZip(g.zip);
      if(g.shp) n+=await importShpSet(g);
      if(g.kmz) n+=await importZip(g.kmz);
      if(g.kml) n+=importKMLText(await g.kml.text(),g._base);
      if(g.geojson||g.json) n+=await importGeoJSONText(await (g.geojson||g.json).text(),g._base);
      if(g.gpx) n+=addFeatures(g._base,new ol.format.GPX().readFeatures(await g.gpx.text(),readOpts('EPSG:4326')));
      if(g.tif||g.tiff) n+=await importGeoTIFF(g.tif||g.tiff);
      const img=g.png||g.jpg||g.jpeg; if(img){ const wf=g.pgw||g.jgw||g.pngw||g.jpgw||g.wld; if(!wf) toast('Imagem sem arquivo de georreferência (.pgw/.jgw/.wld). Selecione os dois juntos.',5000); else n+=await importWorldImage(img,wf,g.prj); }
      if((g.csv||g.txt)&&!g.shp){ busy(false); const f=g.csv||g.txt; openCoordsModal(await f.text(),g._base); }
      if(g.dbf&&!g.shp&&!g.zip) toast('Selecione também o arquivo .shp (e de preferência .shx, .dbf, .prj) do mesmo shapefile.',5000);
    }
    if(n) toast(`${nfi(n)} feição(ões) importada(s).`);
  }catch(e){ console.error(e); toast('Não foi possível importar: '+(e.message||e),6500); } finally{ busy(false); } }
function readOpts(dataProj){ return isLocal()?{}:{dataProjection:dataProj,featureProjection:S.crs}; }
function flatten(feats){ const out=[]; feats.forEach(f=>{ const g=f.getGeometry(); if(!g) return; if(g.getType()==='GeometryCollection'){ g.getGeometries().forEach(gg=>{ const c=f.clone(); c.setGeometry(gg); out.push(c); }); } else out.push(f); });
  out.forEach(f=>{ if(f.get('nome')===undefined&&f.get('name')!==undefined){ f.set('nome',f.get('name')); f.unset('name'); } f.unset('_fid',true); ensureFid(f); ['styleUrl','visibility'].forEach(k=>f.unset(k,true)); }); return out; }
function importStyle(feats){ const t=feats[0]?.getGeometry()?.getType()||''; return {showVtx:false,showDist:false,showArea:false,fillOp:t.includes('Polygon')?0.22:0.12,width:2}; }
function addFeatures(name,feats){ feats=flatten(feats); if(!feats.length){ toast('Nenhuma feição encontrada em “'+name+'”.'); return 0; }
  const L=createVectorLayer({name,features:feats,style:importStyle(feats)}); commit(); zoomToExtent(L.source.getExtent()); return feats.length; }
function importKMLText(txt,name){ if(isLocal()) toast('Projeto em plano local: coordenadas do KML foram mantidas sem conversão.');
  const feats=new ol.format.KML({extractStyles:false,showPointNames:false}).readFeatures(txt,readOpts('EPSG:4326')); return addFeatures(name,feats); }
async function importGeoJSONText(txt,name){ const obj=JSON.parse(txt); let code='EPSG:4326'; const cn=obj.crs?.properties?.name; if(cn){ const m=String(cn).match(/EPSG::?(\d+)/i); if(m&&CRS_INFO['EPSG:'+m[1]]) code='EPSG:'+m[1]; else if(/CRS84/i.test(cn)) code='EPSG:4326'; }
  else { const c=firstCoord(obj); if(c&&(Math.abs(c[0])>180||Math.abs(c[1])>90)){ code=await askCRS(`O GeoJSON “${name}” parece estar em coordenadas projetadas. Em qual SRC estão?`,isMetric()&&!isLocal()?S.crs:autoZone()); if(!code) return 0; } }
  return addFeatures(name,gjson.readFeatures(obj,readOpts(code))); }
function firstCoord(o){ let c=null; const walk=x=>{ if(c) return; if(Array.isArray(x)&&typeof x[0]==='number'){ c=x; return; } if(Array.isArray(x)) x.forEach(walk); else if(x&&typeof x==='object'){ if(x.coordinates) walk(x.coordinates); else if(x.geometry) walk(x.geometry); else if(x.features) walk(x.features); else if(x.geometries) walk(x.geometries); } }; walk(o); return c; }
async function importZip(file){ const zip=await JSZip.loadAsync(await file.arrayBuffer()); const names=Object.keys(zip.files).filter(n=>!zip.files[n].dir&&!/__MACOSX/.test(n));
  const shps=names.filter(n=>/\.shp$/i.test(n)); let n=0;
  if(shps.length){ for(const s of shps){ const base=s.replace(/\.shp$/i,''); const get=ext=>{ const k=names.find(x=>x.toLowerCase()===(base+'.'+ext).toLowerCase()); return k?zip.file(k):null; };
      const dbf=get('dbf'), prj=get('prj'), cpg=get('cpg');
      n+=await addShapefile(base.split('/').pop(),await get('shp').async('arraybuffer'),dbf?await dbf.async('arraybuffer'):null,prj?await prj.async('string'):null,cpg?await cpg.async('string'):null); } return n; }
  const kml=names.find(x=>/\.kml$/i.test(x)); if(kml) return importKMLText(await zip.file(kml).async('string'),file.name.replace(/\.(zip|kmz)$/i,''));
  const gj=names.find(x=>/\.(geo)?json$/i.test(x)); if(gj) return importGeoJSONText(await zip.file(gj).async('string'),gj.replace(/\.[^.]+$/,''));
  toast('O arquivo compactado não contém shapefile, KML ou GeoJSON.'); return 0; }
async function importShpSet(g){ return addShapefile(g._base,await g.shp.arrayBuffer(),g.dbf?await g.dbf.arrayBuffer():null,g.prj?await g.prj.text():null,g.cpg?await g.cpg.text():null); }
function dbfEncoding(buf,cpg){ if(cpg&&cpg.trim()) return cpg.trim(); const u=new Uint8Array(buf); if(u[29]&&u[29]!==0) return 'windows-1252';
  try{ new TextDecoder('utf-8',{fatal:true}).decode(u); return 'UTF-8'; }catch(e){ return 'windows-1252'; } }
async function addShapefile(name,shpBuf,dbfBuf,prjText,cpgText){
  let code=prjText?detectCRSfromWKT(prjText):null; let geoms=null, wgs=false;
  if(!code&&prjText){ try{ geoms=shp.parseShp(shpBuf,prjText); wgs=true; }catch(e){ geoms=null; } }
  if(!geoms) geoms=shp.parseShp(shpBuf);
  if(!code&&!wgs){ const c=firstCoord({features:geoms.map(g=>({geometry:g}))}); const guess=c&&Math.abs(c[0])<=180&&Math.abs(c[1])<=90?'EPSG:4674':(isMetric()&&!isLocal()?S.crs:autoZone());
    code=await askCRS(`O shapefile “${name}” não tem .prj reconhecido. Em qual sistema estão as coordenadas?`,guess); if(!code) return 0; }
  let props=geoms.map(()=>({})); if(dbfBuf){ try{ props=shp.parseDbf(dbfBuf,dbfEncoding(dbfBuf,cpgText)); }catch(e){ try{ props=shp.parseDbf(dbfBuf); }catch(_){} } }
  const fc=shp.combine([geoms,props]); return addFeatures(name,gjson.readFeatures(fc,readOpts(wgs?'EPSG:4326':code))); }

/* Raster */
async function importGeoTIFF(file){ busy('Lendo GeoTIFF…'); const tiff=await GeoTIFF.fromArrayBuffer(await file.arrayBuffer()); const img=await tiff.getImage();
  const bbox=img.getBoundingBox(); const gk=img.getGeoKeys()||{}; let ep=gk.ProjectedCSTypeGeoKey||gk.GeographicTypeGeoKey; let code=ep&&ep!==32767&&CRS_INFO['EPSG:'+ep]?'EPSG:'+ep:null;
  if(!code){ busy(false); code=await askCRS(`O GeoTIFF “${file.name}” não informa um SRC reconhecido (código ${ep||'ausente'}). Escolha o sistema:`,isMetric()&&!isLocal()?S.crs:'EPSG:4674'); if(!code) return 0; busy('Processando imagem…'); }
  const W=img.getWidth(),H=img.getHeight(),sc=Math.min(1,4096/Math.max(W,H)),w=Math.max(1,Math.round(W*sc)),h=Math.max(1,Math.round(H*sc));
  const spp=img.getSamplesPerPixel(), ph=img.fileDirectory.PhotometricInterpretation; const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const ctx=cv.getContext('2d'); const id=ctx.createImageData(w,h), d=id.data;
  const nd=img.getGDALNoData();
  if(spp>=3||ph===3||ph===6){ const rgb=await img.readRGB({width:w,height:h,interleave:true,enableAlpha:true}); const k=rgb.length/(w*h); let mx=0; for(let i=0;i<rgb.length;i++) if(rgb[i]>mx) mx=rgb[i]; const f=mx>255?255/mx:1;
    for(let i=0,j=0;i<w*h;i++,j+=k){ d[i*4]=rgb[j]*f; d[i*4+1]=rgb[j+1]*f; d[i*4+2]=rgb[j+2]*f; d[i*4+3]=k===4?rgb[j+3]:255; if(k===4&&f!==1) d[i*4+3]=rgb[j+3]>0?255:0; } }
  else { const r=(await img.readRasters({width:w,height:h,samples:[0],interleave:true})); let mn=Infinity,mx=-Infinity; for(const v of r){ if(v===nd||!isFinite(v)) continue; if(v<mn) mn=v; if(v>mx) mx=v; } const sp=(mx-mn)||1;
    for(let i=0;i<r.length;i++){ const v=r[i]; if(v===nd||!isFinite(v)){ d[i*4+3]=0; continue; } const g=Math.round((v-mn)/sp*255); d[i*4]=d[i*4+1]=d[i*4+2]=g; d[i*4+3]=255; } }
  ctx.putImageData(id,0,0); const url=URL.createObjectURL(await canvasBlob(cv)); addRaster(file.name,url,bbox,code); return 1; }
async function importWorldImage(imgFile,wfFile,prjFile){ const wf=(await wfFile.text()).trim().split(/\s+/).map(parseFloat); if(wf.length<6||wf.some(isNaN)) throw new Error('arquivo de georreferência inválido');
  const [A,D,B,E,C,F]=wf; if(Math.abs(D)>1e-9||Math.abs(B)>1e-9) toast('A imagem tem rotação no world file; ela será exibida sem rotação.',5000);
  const url=URL.createObjectURL(imgFile); const im=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
  const minx=C-A/2, maxy=F-E/2, maxx=minx+A*im.naturalWidth, miny=maxy+E*im.naturalHeight;
  let code=prjFile?detectCRSfromWKT(await prjFile.text()):null; if(!code){ busy(false); code=await askCRS(`Em qual SRC está a imagem “${imgFile.name}”?`,isMetric()&&!isLocal()?S.crs:'EPSG:4674'); if(!code) return 0; }
  addRaster(imgFile.name,url,[minx,miny,maxx,maxy],code); return 1; }
function addRaster(name,url,extent,code){ const proj=isLocal()?'LOCAL':code; const src=new ol.source.ImageStatic({url,imageExtent:extent,projection:proj,interpolate:true});
  createRasterLayer(name,new ol.layer.Image({source:src})); zoomToExtent(isLocal()?extent:ol.proj.transformExtent(extent,code,S.crs),22); toast('Imagem carregada: '+name); }

/* ===================== Entrada por tabela de coordenadas ===================== */
function splitTable(text){ const lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean); if(!lines.length) return [];
  let sep; if(lines.some(l=>l.includes('\t'))) sep='\t'; else if(lines.some(l=>l.includes(';'))) sep=';'; else if(lines.every(l=>(l.match(/,/g)||[]).length>=2&&!/\d,\d{1,3}(\D|$)/.test(l.replace(/,\s/g,'|')))) sep=','; else sep=/\s+/;
  return lines.map(l=>l.split(sep).map(s=>s.trim())); }
function openCoordsModal(text='',fname=''){
  modal({title:'Coordenadas por tabela (CSV/TXT)',wide:true,body:`<p class="note" style="margin-top:0">Cole ou carregue a lista de vértices, um por linha. Ex.: <code>M-01; 800905,12; 8507011,30</code> ou <code>P1; -48,3012; -13,4970</code>. Aceita vírgula decimal, tabulação e graus/minutos/segundos.</p>
   <textarea id="cvTxt" rows="9" placeholder="M-01;800905,12;8507011,30&#10;M-02;801210,55;8507090,80&#10;M-03;801320,00;8506660,15">${esc(text)}</textarea>
   <div class="form" style="grid-template-columns:auto 1fr auto 1fr;margin-top:10px">
    <label for="cvFile">Arquivo</label><input type="file" id="cvFile" accept=".csv,.txt">
    <label for="cvCrs">SRC das coordenadas</label><select id="cvCrs">${crsOptions(isLocal()?'LOCAL':S.crs)}</select>
    <label for="cvName">Coluna do nome</label><select id="cvName"></select>
    <label for="cvX">Coluna E / X / Long.</label><select id="cvX"></select>
    <label for="cvY">Coluna N / Y / Lat.</label><select id="cvY"></select>
    <label for="cvGeom">Criar como</label><select id="cvGeom"><option value="poligono">Polígono</option><option value="linha">Linha</option><option value="pontos">Pontos</option></select>
    <label for="cvLayer">Destino</label><select id="cvLayer"><option value="nova">Nova camada</option><option value="ativa">Camada ativa</option></select>
    <label class="chk" style="grid-column:span 2"><input type="checkbox" id="cvHead"> 1ª linha é cabeçalho</label>
   </div><p class="note" id="cvInfo"></p>`,
   buttons:[{label:'Cancelar'},{label:'Criar no mapa',primary:true,action:()=>createFromCSV(fname)}],
   onOpen:()=>{ const parse=(auto)=>{ const rows=splitTable($('#cvTxt').value); const info=$('#cvInfo'); if(!rows.length){ info.textContent='Aguardando dados.'; ['#cvName','#cvX','#cvY'].forEach(s=>$(s).innerHTML=''); return; }
       const first=rows[0]; const numeric=v=>!isNaN(parseCoordVal(v))&&/\d/.test(v);
       if(auto) $('#cvHead').checked=first.filter(numeric).length<2;
       const head=$('#cvHead').checked; const ncol=Math.max(...rows.map(r=>r.length)); const lab=i=>head?(first[i]||'Coluna '+(i+1)):'Coluna '+(i+1);
       const opts=Array.from({length:ncol},(_,i)=>`<option value="${i}">${esc(lab(i))}</option>`).join('');
       const prev=['#cvName','#cvX','#cvY'].map(s=>$(s).value); $('#cvName').innerHTML='<option value="-1">— sem nome —</option>'+opts; $('#cvX').innerHTML=opts; $('#cvY').innerHTML=opts;
       if(auto){ const data=head?rows.slice(1):rows; const s=data[0]||[]; let nm=-1,x=-1,y=-1;
         if(head){ first.forEach((h,i)=>{ const u=h.toLowerCase(); if(nm<0&&/^(nome|name|ponto|v[eé]rtice|id|c[oó]d)/.test(u)) nm=i; else if(x<0&&/^(e|x|este|leste|east|lon|long|longitude)\b/.test(u)) x=i; else if(y<0&&/^(n|y|norte|north|lat|latitude)\b/.test(u)) y=i; }); }
         s.forEach((v,i)=>{ if(numeric(v)){ if(x<0&&i!==y&&i!==nm) x=i; else if(y<0&&i!==x&&i!==nm) y=i; } else if(nm<0) nm=i; });
         $('#cvName').value=nm; $('#cvX').value=Math.max(0,x); $('#cvY').value=Math.max(0,y);
         const xv=parseCoordVal(s[x]), yv=parseCoordVal(s[y]); if(isFinite(xv)&&Math.abs(xv)<=180&&Math.abs(yv)<=90&&!isLocal()) $('#cvCrs').value='EPSG:4674'; }
       else { $('#cvName').value=prev[0]; $('#cvX').value=prev[1]; $('#cvY').value=prev[2]; }
       const n=(head?rows.length-1:rows.length); info.textContent=`${n} linha(s) lida(s). Confira as colunas e o SRC antes de criar.`; };
     $('#cvTxt').oninput=()=>parse(true); $('#cvHead').onchange=()=>parse(false); parse(true);
     $('#cvFile').onchange=async e=>{ const f=e.target.files[0]; if(!f) return; fname=f.name.replace(/\.[^.]+$/,''); $('#cvTxt').value=await f.text(); parse(true); }; }}); }
function createFromCSV(fname){ const rows=splitTable($('#cvTxt').value); const head=$('#cvHead').checked; const data=head?rows.slice(1):rows;
  const ni=+$('#cvName').value, xi=+$('#cvX').value, yi=+$('#cvY').value, code=$('#cvCrs').value, gt=$('#cvGeom').value;
  const pts=[]; data.forEach((r,i)=>{ const x=parseCoordVal(r[xi]), y=parseCoordVal(r[yi]); if(!isFinite(x)||!isFinite(y)) return; let c=[x,y];
    if(!isLocal()&&code!=='LOCAL') c=ol.proj.transform(c,code,S.crs); pts.push({c,name:ni>=0?(r[ni]||''):'P'+(i+1)}); });
  if(pts.length<(gt==='poligono'?3:gt==='linha'?2:1)){ toast('Coordenadas insuficientes para '+(gt==='poligono'?'um polígono (mín. 3).':gt==='linha'?'uma linha (mín. 2).':'pontos.')); return false; }
  let L; if($('#cvLayer').value==='ativa'&&isVec(activeLayer())) L=activeLayer(); else L=createVectorLayer({name:fname||(gt==='pontos'?'Pontos':'Vértices importados')});
  const feats=[]; if(gt==='pontos'){ pts.forEach(p=>feats.push(ensureFid(new ol.Feature({geometry:new ol.geom.Point(p.c),nome:p.name})))); if(!L.style.labelField) L.style.labelField='nome'; }
  else { const cs=pts.map(p=>p.c); const g=gt==='poligono'?new ol.geom.Polygon([cs.concat([cs[0]])]):new ol.geom.LineString(cs); feats.push(ensureFid(new ol.Feature({geometry:g,nome:fname||(gt==='poligono'?'Polígono':'Linha')})));
    const m=pts.map(p=>String(p.name).match(/^(.*?)(\d+)$/)); if(m.every(Boolean)&&m.every(x=>x[1]===m[0][1])){ L.style.vtxPrefix=m[0][1]; L.style.vtxStart=+m[0][2]; } }
  L.source.addFeatures(feats); styleChanged(L); commit(); zoomToExtent(L.source.getExtent()); if(feats.length===1) selectFeature(feats[0]); toast(`${pts.length} vértice(s) inserido(s) em “${L.name}”.`); }

/* ===================== Azimute/rumo e distância ===================== */
function parseTraverse(text){ const out=[], bad=[]; text.split(/\r?\n/).forEach((ln,i)=>{ const l=ln.trim(); if(!l) return; let az,d; const parts=l.split(/[;\t|]/).map(s=>s.trim()).filter(Boolean);
    if(parts.length>=2){ az=parseAngle(parts[0]); d=parseNum(parts[1]); } else { const t=l.split(/\s+/); d=parseNum(t.pop()); az=parseAngle(t.join(' ')); }
    if(isFinite(az)&&isFinite(d)&&d>0) out.push({az,d}); else bad.push(i+1); }); return {out,bad}; }
function traversePoints(E,N,legs){ const pts=[[E,N]]; legs.forEach(s=>{ const p=pts[pts.length-1]; pts.push([p[0]+s.d*Math.sin(s.az*RAD),p[1]+s.d*Math.cos(s.az*RAD)]); }); return pts; }
function openTraverseModal(){ if(!isMetric()) return toast('Para azimute e distância use um SRC em metros (UTM ou plano local). Troque na barra inferior.',5000);
  const c=map.getView().getCenter();
  modal({title:'Poligonal por azimute/rumo e distância',wide:true,body:`<div class="form" style="grid-template-columns:auto 1fr auto 1fr"><label for="tvE">Ponto inicial E/X</label><input type="text" id="tvE" value="${c[0].toFixed(3)}"><label for="tvN">N/Y</label><input type="text" id="tvN" value="${c[1].toFixed(3)}"></div>
   <p class="note">Uma linha por lado, no formato <code>ângulo ; distância</code>. Ângulo como azimute (<code>124.2561</code>, <code>124 15 22</code>, <code>124°15'22"</code>) ou rumo (<code>S 55 44 38 E</code>, <code>55°44'38" SE</code>, também com L/O).</p>
   <textarea id="tvTxt" rows="8" placeholder="90 00 00 ; 245,31&#10;180 00 00 ; 120,50&#10;270 00 00 ; 245,31&#10;0 00 00 ; 120,50"></textarea>
   <div class="form" style="grid-template-columns:auto 1fr auto 1fr;margin-top:10px"><label for="tvGeom">Criar como</label><select id="tvGeom"><option value="poligono">Polígono</option><option value="linha">Linha (poligonal aberta)</option></select><label for="tvPre">Prefixo dos vértices</label><input type="text" id="tvPre" value="M-"></div>
   <p class="note" id="tvInfo"></p>`,
   buttons:[{label:'Cancelar'},{label:'Criar no mapa',primary:true,action:()=>{ const {out}=parseTraverse($('#tvTxt').value); if(!out.length){ toast('Nenhum lado válido.'); return false; }
      const E=parseNum($('#tvE').value), N=parseNum($('#tvN').value); let pts=traversePoints(E,N,out); const poly=$('#tvGeom').value==='poligono';
      if(poly){ const err=dist(pts[0],pts[pts.length-1]); if(err<Math.max(0.5,out.reduce((s,x)=>s+x.d,0)*0.01)) pts.pop(); if(pts.length<3){ toast('Um polígono precisa de ao menos 3 vértices.'); return false; } }
      const L=ensureDrawLayer(); const g=poly?new ol.geom.Polygon([pts.concat([pts[0]])]):new ol.geom.LineString(pts); const f=ensureFid(new ol.Feature({geometry:g,nome:poly?'Poligonal':'Caminhamento'}));
      L.style.vtxPrefix=$('#tvPre').value; styleChanged(L); L.source.addFeature(f); commit(); zoomToExtent(g.getExtent()); selectFeature(f); }}],
   onOpen:()=>{ const up=()=>{ const {out,bad}=parseTraverse($('#tvTxt').value); const info=$('#tvInfo'); if(!out.length){ info.textContent=bad.length?`Linhas não reconhecidas: ${bad.join(', ')}.`:'Aguardando os lados.'; info.className='note'+(bad.length?' warn':''); return; }
       const pts=traversePoints(parseNum($('#tvE').value),parseNum($('#tvN').value),out); const per=out.reduce((s,x)=>s+x.d,0); const err=dist(pts[0],pts[pts.length-1]);
       let t=`${out.length} lado(s) · perímetro ${nf(per)} m`; if($('#tvGeom').value==='poligono'){ t+=` · erro de fechamento ${nf(err,3)} m`; if(err>1e-6) t+=` (precisão 1:${nfi(per/err)})`; if(err>=Math.max(0.5,per*0.01)) t+=' · o último vértice será ligado ao inicial automaticamente'; }
       if(bad.length) t+=` · ignoradas as linhas ${bad.join(', ')}`; info.textContent=t; info.className='note'+(bad.length?' warn':''); };
     ['#tvTxt','#tvE','#tvN','#tvGeom'].forEach(s=>$(s).addEventListener('input',up)); $('#tvTxt').focus(); up(); }}); }
function openRectModal(){ if(!isMetric()) return toast('Retângulo por medidas exige SRC em metros (UTM ou plano local).',5000); const c=map.getView().getCenter();
  modal({title:'Retângulo por medidas',body:`<div class="form"><label for="rcW">Largura (m)</label><input type="text" id="rcW" value="10"><label for="rcH">Profundidade (m)</label><input type="text" id="rcH" value="20"><label for="rcAz">Azimute da frente</label><input type="text" id="rcAz" value="90" title="90 = frente voltada para leste"><label for="rcE">Canto inicial E/X</label><input type="text" id="rcE" value="${c[0].toFixed(2)}"><label for="rcN">Canto inicial N/Y</label><input type="text" id="rcN" value="${c[1].toFixed(2)}"></div><p class="note">O retângulo parte do canto inicial, segue a largura no azimute informado e a profundidade à esquerda dele. Útil para cômodos, galpões, parcelas e talhões.</p>`,
   buttons:[{label:'Cancelar'},{label:'Criar',primary:true,action:()=>{ const w=parseNum($('#rcW').value),h=parseNum($('#rcH').value),az=parseAngle($('#rcAz').value),E=parseNum($('#rcE').value),N=parseNum($('#rcN').value);
     if(!(w>0&&h>0&&isFinite(az)&&isFinite(E)&&isFinite(N))){ toast('Verifique os valores.'); return false; }
     const v=a=>[Math.sin(a*RAD),Math.cos(a*RAD)]; const u=v(az), p=v(az-90); const p0=[E,N], p1=[E+u[0]*w,N+u[1]*w], p2=[p1[0]+p[0]*h,p1[1]+p[1]*h], p3=[E+p[0]*h,N+p[1]*h];
     const L=ensureDrawLayer(); const f=ensureFid(new ol.Feature({geometry:new ol.geom.Polygon([[p0,p1,p2,p3,p0]]),nome:`Retângulo ${nf(w)} × ${nf(h)} m`})); L.source.addFeature(f); commit(); zoomToExtent(f.getGeometry().getExtent()); selectFeature(f); }}]}); }
function openGotoModal(){ const def=isLocal()?'LOCAL':isMetric()?S.crs:'EPSG:4674';
  modal({title:'Ir para coordenada',body:`<div class="form"><label for="goCrs">SRC</label><select id="goCrs">${crsOptions(def)}</select><label for="goX">E / X / Longitude</label><input type="text" id="goX" placeholder="ex.: 800900 ou -48°18'07&quot; W"><label for="goY">N / Y / Latitude</label><input type="text" id="goY" placeholder="ex.: 8507000 ou -13°29'49&quot; S"></div>`,
   buttons:[{label:'Cancelar'},{label:'Ir',primary:true,action:()=>{ const x=parseCoordVal($('#goX').value), y=parseCoordVal($('#goY').value); if(!isFinite(x)||!isFinite(y)){ toast('Coordenada inválida.'); return false; }
     let c=[x,y]; const code=$('#goCrs').value; if(!isLocal()&&code!=='LOCAL') c=ol.proj.transform(c,code,S.crs); tempSource.clear(); tempSource.addFeature(new ol.Feature(new ol.geom.Point(c))); map.getView().animate({center:c,duration:400}); showCoordPopup(c); }}]}); }
function openXYZModal(){ modal({title:'Mapa de fundo XYZ personalizado',body:`<div class="form"><label for="xyzU">URL</label><input type="text" id="xyzU" value="${esc(S.customXYZ)}" placeholder="https://servidor/{z}/{x}/{y}.png"></div><p class="note">Use os marcadores {x}, {y} e {z}. Serve para servidores de tiles do seu órgão ou de projetos como o QGIS Cloud.</p>`,
  buttons:[{label:'Cancelar'},{label:'Usar',primary:true,action:()=>{ const u=$('#xyzU').value.trim(); if(!/\{z\}/.test(u)){ toast('A URL precisa conter {z}, {x} e {y}.'); return false; } S.customXYZ=u; delete srcCache.custom; S.basemap='custom'; applyBasemap(); }}]}); }

/* ===================== Exportação vetorial ===================== */
function exportFeatures(scope,outCode){ const Ls=scope==='ativa'?[activeLayer()].filter(isVec):S.layers.filter(L=>isVec(L)&&L.visible);
  return Ls.map(L=>({L,feats:L.source.getFeatures().map(f=>{ const c=new ol.Feature(); const p={}; Object.entries(f.getProperties()).forEach(([k,v])=>{ if(k==='geometry'||k.startsWith('_')) return; p[k]=v; });
    if(f.get('_kind')) p.tipo=f.get('_kind'); if(scope!=='ativa') p.camada=L.name; c.setProperties(p); const g=f.getGeometry().clone(); if(outCode&&outCode!==S.crs&&!isLocal()) g.transform(S.crs,outCode); c.setGeometry(g); return c; })})); }
function openExportVector(){ if(!S.layers.some(isVec)) return toast('Não há camadas vetoriais para exportar.');
  modal({title:'Exportar vetores',body:`<div class="form"><label for="evFmt">Formato</label><select id="evFmt"><option value="shp">Shapefile (.zip)</option><option value="dxf">DXF (AutoCAD / CAD)</option><option value="kml">KML (Google Earth)</option><option value="geojson">GeoJSON</option><option value="csv">CSV de vértices (Excel)</option></select>
    <label for="evScope">Camadas</label><select id="evScope"><option value="ativa">Somente a camada ativa</option><option value="visiveis">Todas as visíveis</option></select>
    <label for="evCrs">SRC de saída</label><select id="evCrs"><option value="proj">SRC do projeto (${esc(crsInfo().name)})</option>${isLocal()?'':'<option value="EPSG:4674">SIRGAS 2000 geográficas</option><option value="EPSG:4326">WGS 84 geográficas</option>'}</select>
    <label class="chk full" id="evLabW"><input type="checkbox" id="evLab" checked> Incluir rótulos (vértices, distâncias, áreas e textos)</label></div><p class="note" id="evNote"></p>`,
   buttons:[{label:'Cancelar'},{label:'Exportar',primary:true,action:()=>doExportVector($('#evFmt').value,$('#evScope').value,$('#evCrs').value,$('#evLab').checked)}],
   onOpen:()=>{ const up=()=>{ const f=$('#evFmt').value; $('#evLabW').hidden=f!=='dxf'; $('#evCrs').disabled=f==='kml'||f==='dxf';
     $('#evNote').textContent={shp:'Um conjunto .shp/.shx/.dbf/.prj/.cpg por camada e tipo de geometria, compactados em .zip. Abre no QGIS, ArcGIS e SIGEF.',dxf:'Desenho em coordenadas do projeto, com uma layer CAD por camada. Textos com altura de 2 mm na escala do layout (1:'+nfi(LY().scale)+').',kml:'Sempre em WGS 84 geográficas, como exige o Google Earth.',geojson:'Formato aberto para web e QGIS.',csv:'Tabela com vértice, coordenadas, azimute e distância, separada por ponto e vírgula.'}[f]; if(f==='kml'&&isLocal()) $('#evNote').textContent='KML exige georreferência; indisponível em plano local.'; };
     $('#evFmt').onchange=up; up(); }}); }
async function doExportVector(fmt,scope,crsSel,labels){ const out=crsSel==='proj'?S.crs:crsSel; const base=safeName(scope==='ativa'?activeLayer()?.name:S.projName);
  try{
  if(fmt==='geojson'){ const sets=exportFeatures(scope,out); const fc=gjson.writeFeaturesObject(sets.flatMap(s=>s.feats)); if(out!=='EPSG:4326'&&out!=='LOCAL') fc.crs={type:'name',properties:{name:'urn:ogc:def:crs:'+out.replace(':','::')}};
    download(new Blob([JSON.stringify(fc)],{type:'application/geo+json'}),base+'.geojson'); }
  else if(fmt==='kml'){ if(isLocal()){ toast('KML exige coordenadas georreferenciadas.'); return false; } const sets=exportFeatures(scope,null); const feats=sets.flatMap(s=>s.feats); feats.forEach(f=>{ if(f.get('nome')!==undefined) f.set('name',String(f.get('nome'))); });
    download(new Blob([new ol.format.KML().writeFeatures(feats,{featureProjection:S.crs,dataProjection:'EPSG:4326',decimals:8})],{type:'application/vnd.google-earth.kml+xml'}),base+'.kml'); }
  else if(fmt==='shp'){ const zip=new JSZip(); let n=0; exportFeatures(scope,out).forEach(({L,feats})=>{ n+=addShpToZip(zip,safeName(L.name),feats,out); }); if(!n){ toast('Nada para exportar.'); return false; }
    download(await zip.generateAsync({type:'blob',compression:'DEFLATE'}),base+'_shp.zip'); }
  else if(fmt==='dxf'){ const Ls=scope==='ativa'?[activeLayer()].filter(isVec):S.layers.filter(L=>isVec(L)&&L.visible); download(new Blob([buildDXF(Ls,labels)],{type:'application/dxf'}),base+'.dxf'); }
  else if(fmt==='csv'){ download(new Blob(['﻿'+buildCSV(scope,out)],{type:'text/csv;charset=utf-8'}),base+'_vertices.csv'); }
  toast('Arquivo exportado.'); }catch(e){ console.error(e); toast('Falha na exportação: '+e.message,6000); return false; } }
function buildCSV(scope,out){ const Ls=scope==='ativa'?[activeLayer()].filter(isVec):S.layers.filter(L=>isVec(L)&&L.visible); const geo=!!CRS_INFO[out]?.geo; const lines=[`camada;feicao;vertice;${geo?'longitude;latitude':'E;N'};azimute;distancia_m`];
  const n=(v,d)=>v.toFixed(d).replace('.',',');
  Ls.forEach(L=>L.source.getFeatures().forEach(f=>{ if(f.get('_kind')) return; const {rows}=featureRows(f,L); rows.forEach(r=>{ let c=r.c; if(out!==S.crs&&!isLocal()) c=ol.proj.transform(c,S.crs,out);
    lines.push([L.name,f.get('nome')||'',r.name,geo?n(c[0],8):n(c[0],3),geo?n(c[1],8):n(c[1],3),r.az!==undefined?dms(r.az):'',r.d!==undefined?n(r.d,2):''].map(v=>String(v).replace(/;/g,',')).join(';')); }); })); return lines.join('\r\n'); }

/* Shapefile (escrita própria, sem dependências) */
function ringArea(r){ let s=0; for(let i=0,n=r.length;i<n-1;i++) s+=r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1]; return s/2; }
function addShpToZip(zip,name,feats,code){ const fam={pontos:[],linhas:[],poligonos:[]};
  feats.forEach(f=>{ const g=f.getGeometry(); const t=g.getType();
    if(t==='Point') fam.pontos.push({f,parts:[[g.getCoordinates()]]}); else if(t==='MultiPoint') g.getCoordinates().forEach(c=>fam.pontos.push({f,parts:[[c]]}));
    else if(t==='LineString') fam.linhas.push({f,parts:[g.getCoordinates()]}); else if(t==='MultiLineString') fam.linhas.push({f,parts:g.getCoordinates()});
    else if(t==='Polygon'||t==='MultiPolygon'){ const polys=t==='Polygon'?[g.getCoordinates()]:g.getCoordinates(); const parts=[]; polys.forEach(p=>p.forEach((r,i)=>{ const a=ringArea(r); const rr=r.map(c=>[c[0],c[1]]); if((i===0&&a>0)||(i>0&&a<0)) rr.reverse(); parts.push(rr); })); fam.poligonos.push({f,parts}); } });
  let n=0; const prj=crsWKT(code);
  for(const [k,recs] of Object.entries(fam)){ if(!recs.length) continue; const type=k==='pontos'?1:k==='linhas'?3:5; const {shp,shx}=writeShp(recs,type); const fn=`${name}_${k}`;
    zip.file(fn+'.shp',shp); zip.file(fn+'.shx',shx); zip.file(fn+'.dbf',writeDbf(recs.map(r=>r.f.getProperties()))); zip.file(fn+'.cpg','UTF-8'); if(prj) zip.file(fn+'.prj',prj); n+=recs.length; }
  return n; }
function writeShp(recs,type){ const lens=recs.map(r=>{ if(type===1) return 20; const np=r.parts.reduce((s,p)=>s+p.length,0); return 44+4*r.parts.length+16*np; });
  const total=100+lens.reduce((s,l)=>s+8+l,0); const shp=new DataView(new ArrayBuffer(total)), shx=new DataView(new ArrayBuffer(100+8*recs.length));
  let bb=[Infinity,Infinity,-Infinity,-Infinity]; recs.forEach(r=>r.parts.forEach(p=>p.forEach(c=>{ bb[0]=Math.min(bb[0],c[0]); bb[1]=Math.min(bb[1],c[1]); bb[2]=Math.max(bb[2],c[0]); bb[3]=Math.max(bb[3],c[1]); })));
  const head=(dv,len)=>{ dv.setInt32(0,9994,false); dv.setInt32(24,len/2,false); dv.setInt32(28,1000,true); dv.setInt32(32,type,true); bb.forEach((v,i)=>dv.setFloat64(36+8*i,v,true)); };
  head(shp,total); head(shx,100+8*recs.length); let o=100;
  recs.forEach((r,i)=>{ shx.setInt32(100+8*i,o/2,false); shx.setInt32(104+8*i,lens[i]/2,false); shp.setInt32(o,i+1,false); shp.setInt32(o+4,lens[i]/2,false); let p=o+8; shp.setInt32(p,type,true); p+=4;
    if(type===1){ shp.setFloat64(p,r.parts[0][0][0],true); shp.setFloat64(p+8,r.parts[0][0][1],true); }
    else { const pts=r.parts.flat(); const b=[Infinity,Infinity,-Infinity,-Infinity]; pts.forEach(c=>{ b[0]=Math.min(b[0],c[0]); b[1]=Math.min(b[1],c[1]); b[2]=Math.max(b[2],c[0]); b[3]=Math.max(b[3],c[1]); });
      b.forEach((v,k)=>shp.setFloat64(p+8*k,v,true)); p+=32; shp.setInt32(p,r.parts.length,true); shp.setInt32(p+4,pts.length,true); p+=8; let idx=0; r.parts.forEach(pt=>{ shp.setInt32(p,idx,true); p+=4; idx+=pt.length; });
      pts.forEach(c=>{ shp.setFloat64(p,c[0],true); shp.setFloat64(p+8,c[1],true); p+=16; }); }
    o+=8+lens[i]; });
  return {shp:shp.buffer,shx:shx.buffer}; }
function writeDbf(props){ const enc=new TextEncoder(); const keys=[]; props.forEach(p=>Object.keys(p).forEach(k=>{ if(k!=='geometry'&&!keys.includes(k)) keys.push(k); })); if(!keys.length) keys.push('id');
  const used=new Set(); const fields=keys.map(k=>{ let nm=k.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9_]/g,'_').slice(0,10)||'campo'; let b=nm,i=1; while(used.has(nm.toUpperCase())){ nm=b.slice(0,8)+'_'+(i++); } used.add(nm.toUpperCase());
    const vals=props.map(p=>k==='id'&&p[k]===undefined?props.indexOf(p)+1:p[k]); const num=vals.every(v=>v===undefined||v===null||v===''||typeof v==='number'&&isFinite(v)) && vals.some(v=>typeof v==='number');
    if(num){ const dec=vals.some(v=>typeof v==='number'&&!Number.isInteger(v))?6:0; return {k,nm,t:'N',len:19,dec,vals}; }
    const len=Math.min(254,Math.max(1,...vals.map(v=>enc.encode(v==null?'':String(v)).length))); return {k,nm,t:'C',len,dec:0,vals}; });
  const hl=32+32*fields.length+1, rl=1+fields.reduce((s,f)=>s+f.len,0); const buf=new Uint8Array(hl+rl*props.length+1); const dv=new DataView(buf.buffer); const d=new Date();
  buf[0]=3; buf[1]=d.getFullYear()-1900; buf[2]=d.getMonth()+1; buf[3]=d.getDate(); dv.setUint32(4,props.length,true); dv.setUint16(8,hl,true); dv.setUint16(10,rl,true);
  fields.forEach((f,i)=>{ const o=32+32*i; for(let j=0;j<f.nm.length;j++) buf[o+j]=f.nm.charCodeAt(j); buf[o+11]=f.t.charCodeAt(0); buf[o+16]=f.len; buf[o+17]=f.dec; });
  buf[hl-1]=0x0d; let o=hl;
  props.forEach((p,ri)=>{ buf[o++]=0x20; fields.forEach(f=>{ const v=f.vals[ri]; let bytes;
      if(f.t==='N'){ const s=(v===undefined||v===null||v==='')?'':(f.dec?Number(v).toFixed(f.dec):String(Math.round(v))); bytes=enc.encode(s.slice(0,f.len).padStart(f.len,' ')); }
      else { let b=enc.encode(v==null?'':String(v)); if(b.length>f.len){ let s=String(v); while(enc.encode(s).length>f.len) s=s.slice(0,-1); b=enc.encode(s); } bytes=new Uint8Array(f.len).fill(0x20); bytes.set(b); }
      buf.set(bytes,o); o+=f.len; }); });
  buf[o]=0x1a; return buf.buffer; }

/* DXF R12 */
function dxfStr(s){ return String(s??'').replace(/[\r\n]+/g,' ').replace(/[^\x20-\x7e]/g,ch=>'\\U+'+ch.charCodeAt(0).toString(16).toUpperCase().padStart(4,'0')); }
function dxfLayer(s){ return (s||'0').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[<>\/\\":;?*|=`,\s]+/g,'_').slice(0,60)||'0'; }
function aci(hex){ const t=[[1,255,0,0],[2,255,255,0],[3,0,255,0],[4,0,255,255],[5,0,0,255],[6,255,0,255],[7,255,255,255],[8,128,128,128],[30,255,127,0],[140,0,170,255],[200,170,0,255]];
  const n=parseInt((hex||'#ffffff').slice(1),16), r=n>>16&255,g=n>>8&255,b=n&255; let best=7,bd=1e9; t.forEach(([c,R,G,B])=>{ const d=(r-R)**2+(g-G)**2+(b-B)**2; if(d<bd){bd=d;best=c;} }); return best; }
function buildDXF(Ls,labels){ const scale=LY().scale; const hText=2*scale/1000; const out=[]; const P=(...a)=>{ for(let i=0;i<a.length;i+=2) out.push(String(a[i]),String(a[i+1])); };
  const layers=[]; const addL=(n,c)=>{ if(!layers.some(l=>l.n===n)) layers.push({n,c}); return n; };
  const ents=[]; const E=(...a)=>ents.push(a); const num=v=>v.toFixed(4);
  const pline=(lay,cs,closed)=>{ E(0,'POLYLINE',8,lay,66,1,70,closed?1:0,10,'0.0',20,'0.0',30,'0.0'); cs.forEach(c=>E(0,'VERTEX',8,lay,10,num(c[0]),20,num(c[1]),30,'0.0')); E(0,'SEQEND',8,lay); };
  const text=(lay,c,h,s,rot=0,al=1)=>E(0,'TEXT',8,lay,10,num(c[0]),20,num(c[1]),30,'0.0',40,num(h),1,dxfStr(s),50,(rot||0).toFixed(3),72,al,11,num(c[0]),21,num(c[1]),31,'0.0');
  Ls.forEach(L=>{ const ln=addL(dxfLayer(L.name),aci(L.style.stroke)); const st=L.style; const lr=labels?addL(ln+'_ROTULOS',7):null;
    L.source.getFeatures().forEach(f=>{ const g=f.getGeometry(), t=g.getType(), k=f.get('_kind');
      if(k==='texto'){ const tl=addL(ln+'_TEXTOS',aci(f.get('_cor')||st.labelColor)); text(tl,g.getCoordinates(),(+f.get('_tam')||14)*0.2646*scale/1000,f.get('texto'),-(+f.get('_rot')||0)); return; }
      if(k==='cota'){ const cl=addL(ln+'_COTAS',7); const c=g.getCoordinates(); const a=c[0],b=c[c.length-1]; pline(cl,[a,b],false); const ang=Math.atan2(b[1]-a[1],b[0]-a[0]); const T=1.2*scale/1000; const t1=ang+Math.PI/4;
        [a,b].forEach(p=>pline(cl,[[p[0]-Math.cos(t1)*T,p[1]-Math.sin(t1)*T],[p[0]+Math.cos(t1)*T,p[1]+Math.sin(t1)*T]],false));
        let deg=ang/RAD; if(deg>90) deg-=180; if(deg<-90) deg+=180; const off=hText*0.8; text(cl,[(a[0]+b[0])/2-Math.sin(deg*RAD)*off,(a[1]+b[1])/2+Math.cos(deg*RAD)*off],hText,nf(dist(a,b))+' m',deg); return; }
      if(t==='Point') E(0,'POINT',8,ln,10,num(g.getCoordinates()[0]),20,num(g.getCoordinates()[1]),30,'0.0');
      else if(t==='MultiPoint') g.getCoordinates().forEach(c=>E(0,'POINT',8,ln,10,num(c[0]),20,num(c[1]),30,'0.0'));
      geomParts(g).forEach(p=>pline(ln,p.c,p.closed));
      if(labels){ let kk=+st.vtxStart||1; const parts=geomParts(g);
        if(st.showVtx) parts.forEach(p=>p.c.forEach(c=>{ text(lr,[c[0]+hText*0.6,c[1]+hText*0.6],hText,vtxName(st,kk++),0,0); }));
        if(st.showDist||st.showAz) parts.forEach(p=>{ const n=p.c.length, segs=p.closed?n:n-1; for(let i=0;i<segs;i++){ const a=p.c[i], b=p.c[(i+1)%n]; let deg=Math.atan2(b[1]-a[1],b[0]-a[0])/RAD; if(deg>90) deg-=180; if(deg<-90) deg+=180; const nx=-Math.sin(deg*RAD), ny=Math.cos(deg*RAD); const m=[(a[0]+b[0])/2,(a[1]+b[1])/2];
            if(st.showDist) text(lr,[m[0]+nx*hText*0.7,m[1]+ny*hText*0.7],hText,nf(dist(a,b))+' m',deg); if(st.showAz) text(lr,[m[0]-nx*hText*1.3,m[1]-ny*hText*1.3],hText*0.85,azTxt(azim(a,b),st.azMode),deg); } });
        if(t.includes('Polygon')&&(st.showArea||f.get('nome'))){ const ip=t==='Polygon'?g.getInteriorPoint().getCoordinates():g.getInteriorPoints().getFirstCoordinate(); const A=gArea(g); if(f.get('nome')) text(lr,[ip[0],ip[1]+hText*0.9],hText*1.2,f.get('nome'));
          if(st.showArea) text(lr,[ip[0],ip[1]-hText*0.9],hText*1.2,st.areaUnit==='m2'?nf(A)+' m²':nf(A/1e4,4)+' ha'); }
        else if(f.get('nome')&&(t==='Point'||t.includes('Line'))){ const c=t==='Point'?g.getCoordinates():t==='LineString'?g.getCoordinateAt(0.5):g.getFirstCoordinate(); text(lr,[c[0],c[1]+hText],hText,f.get('nome')); } } }); });
  P(0,'SECTION',2,'HEADER',9,'$ACADVER',1,'AC1009',9,'$INSUNITS',70,6,0,'ENDSEC');
  P(0,'SECTION',2,'TABLES',0,'TABLE',2,'LTYPE',70,1,0,'LTYPE',2,'CONTINUOUS',70,0,3,'Solid line',72,65,73,0,40,'0.0',0,'ENDTAB');
  P(0,'TABLE',2,'LAYER',70,layers.length+1,0,'LAYER',2,'0',70,0,62,7,6,'CONTINUOUS'); layers.forEach(l=>P(0,'LAYER',2,l.n,70,0,62,l.c,6,'CONTINUOUS')); P(0,'ENDTAB',0,'ENDSEC');
  P(0,'SECTION',2,'ENTITIES'); ents.forEach(a=>P(...a)); P(0,'ENDSEC',0,'EOF'); return out.join('\r\n'); }

/* ===================== Renderização fora da tela ===================== */
function compositeMap(m,pr){ const size=m.getSize(); const W=Math.round(size[0]*pr), H=Math.round(size[1]*pr); const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const ctx=cv.getContext('2d'); ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H);
  m.getViewport().querySelectorAll('.ol-layer canvas, canvas.ol-layer').forEach(c=>{ if(!c.width) return; const op=c.parentNode.style.opacity||c.style.opacity; ctx.globalAlpha=op===''?1:Number(op);
    let mt; const tr=c.style.transform; if(tr){ const mm=tr.match(/^matrix\(([^(]*)\)$/); mt=mm?mm[1].split(',').map(Number):[1,0,0,1,0,0]; } else mt=[parseFloat(c.style.width)/c.width,0,0,parseFloat(c.style.height)/c.height,0,0];
    ctx.setTransform(mt[0]*pr,mt[1]*pr,mt[2]*pr,mt[3]*pr,mt[4]*pr,mt[5]*pr); ctx.drawImage(c,0,0); });
  ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha=1; return cv; }
async function renderOffscreen(cssW,cssH,center,res,pr,timeout=25000){ const div=document.createElement('div'); div.style.cssText=`position:fixed;left:-30000px;top:0;width:${cssW}px;height:${cssH}px;`; document.body.appendChild(div);
  const layers=[]; if(baseLayer.getVisible()&&baseLayer.getSource()) layers.push(new ol.layer.Tile({source:baseLayer.getSource(),opacity:baseLayer.getOpacity()}));
  S.layers.forEach(L=>{ if(!L.visible) return; if(isVec(L)) layers.push(new ol.layer.Vector({source:L.source,style:L.olLayer.getStyle(),opacity:L.opacity})); else layers.push(new ol.layer.Image({source:L.olLayer.getSource(),opacity:L.opacity})); });
  const m=new ol.Map({target:div,layers,controls:[],interactions:[],pixelRatio:pr,view:new ol.View({projection:S.crs,center,resolution:res,constrainResolution:false,smoothResolutionConstraint:false,maxZoom:40,minZoom:-10})});
  await new Promise(r=>{ let done=false; const fin=()=>{ if(!done){ done=true; r(); } }; m.once('rendercomplete',fin); setTimeout(fin,timeout); });
  let cv; try{ cv=compositeMap(m,pr); } finally{ m.setTarget(null); div.remove(); } return cv; }

/* ===================== Exportar imagem do mapa ===================== */
function openExportImage(){ modal({title:'Exportar imagem do mapa',body:`<div class="form"><label for="eiFmt">Formato</label><select id="eiFmt"><option value="png">PNG</option>${isLocal()?'':'<option value="pgw">PNG georreferenciado (.png + .pgw + .prj)</option><option value="tif">GeoTIFF</option>'}</select>
   <label for="eiRes">Resolução</label><select id="eiRes"><option value="1">Tela (1×)</option><option value="2" selected>Alta (2×)</option><option value="3">Muito alta (3×)</option></select></div><p class="note">Exporta exatamente a área visível no mapa. Para uma prancha com título, legenda e carimbo use o Compositor de impressão.</p>`,
   buttons:[{label:'Cancelar'},{label:'Exportar',primary:true,action:()=>exportImage($('#eiFmt').value,+$('#eiRes').value)}]}); }
async function exportImage(fmt,mult){ const v=map.getView(), size=map.getSize(), res=v.getResolution(), c=v.getCenter(); busy('Gerando imagem…');
  try{ const cv=await renderOffscreen(size[0],size[1],c,res,mult); const ex=[c[0]-size[0]/2*res,c[1]-size[1]/2*res,c[0]+size[0]/2*res,c[1]+size[1]/2*res]; const base=safeName(S.projName);
    const rx=(ex[2]-ex[0])/cv.width, ry=(ex[3]-ex[1])/cv.height;
    if(fmt==='png') download(await canvasBlob(cv),base+'.png');
    else if(fmt==='pgw'){ const zip=new JSZip(); zip.file(base+'.png',await canvasBlob(cv)); zip.file(base+'.pgw',[rx,0,0,-ry,ex[0]+rx/2,ex[3]-ry/2].map(v=>v.toFixed(10)).join('\r\n')); const w=crsWKT(S.crs); if(w) zip.file(base+'.prj',w); download(await zip.generateAsync({type:'blob'}),base+'_georref.zip'); }
    else if(fmt==='tif') download(geotiffBlob(cv,ex,S.crs),base+'.tif');
    toast('Imagem exportada.'); }
  catch(e){ console.error(e); toast(e.name==='SecurityError'?'O mapa de fundo atual não permite exportar imagem (bloqueio do provedor). Troque para “Esri Satélite” e tente de novo.':'Falha ao exportar: '+e.message,7000); } finally{ busy(false); } }
function geotiffBlob(cv,ex,code){ const w=cv.width,h=cv.height; const px=cv.getContext('2d').getImageData(0,0,w,h).data; const n=w*h*3; const info=CRS_INFO[code]; const epsg=parseInt(code.split(':')[1],10); const geog=!!info.geo;
  const keys=[1,1,0,3,1024,0,1,geog?2:1,1025,0,1,1,geog?2048:3072,0,1,epsg]; const rx=(ex[2]-ex[0])/w, ry=(ex[3]-ex[1])/h;
  const tags=[[256,4,[w]],[257,4,[h]],[258,3,[8,8,8]],[259,3,[1]],[262,3,[2]],[273,4,[0]],[277,3,[3]],[278,4,[h]],[279,4,[n]],[284,3,[1]],[33550,12,[rx,ry,0]],[33922,12,[0,0,0,ex[0],ex[3],0]],[34735,3,keys]];
  const tsz={3:2,4:4,12:8}; const ifd=8, ifdLen=2+tags.length*12+4; let extra=ifd+ifdLen; const offs=tags.map(([,t,v])=>{ const sz=tsz[t]*v.length; if(sz<=4) return null; const o=extra; extra+=sz+(sz%2); return o; });
  const imgOff=extra+(8-extra%8)%8; const buf=new ArrayBuffer(imgOff+n); const dv=new DataView(buf); dv.setUint16(0,0x4949,true); dv.setUint16(2,42,true); dv.setUint32(4,ifd,true); dv.setUint16(ifd,tags.length,true);
  const wv=(t,o,v)=>{ if(t===3) dv.setUint16(o,v,true); else if(t===4) dv.setUint32(o,v,true); else dv.setFloat64(o,v,true); };
  tags.forEach(([tag,t,v],i)=>{ const e=ifd+2+i*12; dv.setUint16(e,tag,true); dv.setUint16(e+2,t,true); dv.setUint32(e+4,v.length,true); if(tag===273) v=[imgOff];
    if(offs[i]===null) v.forEach((x,k)=>wv(t,e+8+k*tsz[t],x)); else { dv.setUint32(e+8,offs[i],true); v.forEach((x,k)=>wv(t,offs[i]+k*tsz[t],x)); } });
  dv.setUint32(ifd+2+tags.length*12,0,true); const out=new Uint8Array(buf,imgOff);
  for(let i=0,j=0;i<px.length;i+=4,j+=3){ const a=px[i+3]/255; out[j]=px[i]*a+255*(1-a); out[j+1]=px[i+1]*a+255*(1-a); out[j+2]=px[i+2]*a+255*(1-a); }
  return new Blob([buf],{type:'image/tiff'}); }
