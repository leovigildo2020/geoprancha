'use strict';
/* ===================== Utilidades ===================== */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-3);
const nf=(n,d=2)=>Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const nfi=n=>Math.round(n).toLocaleString('pt-BR');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RAD=Math.PI/180;
const todayBR=()=>new Date().toLocaleDateString('pt-BR');
function parseNum(s){ if(typeof s==='number') return s; s=String(s??'').trim().replace(/\s/g,''); if(!s) return NaN;
  if(s.includes(',')&&s.includes('.')){ if(s.lastIndexOf(',')>s.lastIndexOf('.')) s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(/,/g,''); }
  else if(s.includes(',')) s=s.replace(',','.');
  return Number(s); }
function hexA(hex,a){ const h=(hex||'#000000').replace('#',''); const n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; }
function isDarkColor(hex){ const h=(hex||'#000').replace('#',''); const n=parseInt(h,16); const r=n>>16&255,g=n>>8&255,b=n&255; return (0.299*r+0.587*g+0.114*b)<150; }
function dms(v,dec=0){ const neg=v<0; v=Math.abs(v); let d=Math.floor(v), m=Math.floor((v-d)*60), s=((v-d)*60-m)*60;
  s=Number(s.toFixed(dec)); if(s>=60){s-=60;m++;} if(m>=60){m-=60;d++;}
  const ss=dec? s.toFixed(dec).replace('.',',').padStart(3+dec,'0') : String(Math.round(s)).padStart(2,'0');
  return `${neg?'-':''}${d}°${String(m).padStart(2,'0')}'${ss}"`; }
const latTxt=v=>dms(Math.abs(v),2)+(v<0?' S':' N');
const lonTxt=v=>dms(Math.abs(v),2)+(v<0?' W':' E');
function rumo(az){ az=((az%360)+360)%360; if(az<=90) return dms(az)+' NE'; if(az<=180) return dms(180-az)+' SE'; if(az<=270) return dms(az-180)+' SO'; return dms(360-az)+' NO'; }
function azTxt(az,mode){ return mode==='rumo'? rumo(az) : dms(az); }
function parseAngle(str){
  let s=String(str||'').trim().toUpperCase().replace(/,/g,'.').replace(/º/g,'°'); if(!s) return NaN;
  let q1=null,q2=null; let m=s.match(/^([NS])\s*(.*?)\s*([ELWO])$/); if(m){q1=m[1];q2=m[3];s=m[2];}
  else { m=s.match(/^(.*?)\s*([NS])([ELWO])$/); if(m){s=m[1];q1=m[2];q2=m[3];} }
  const nums=(s.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number); if(!nums.length) return NaN;
  const neg=nums[0]<0; let v=Math.abs(nums[0])+(nums[1]||0)/60+(nums[2]||0)/3600; if(neg) v=-v;
  if(q1){ const e=(q2==='E'||q2==='L'); if(q1==='N') v= e? v : 360-v; else v= e? 180-v : 180+v; }
  return ((v%360)+360)%360; }
function parseCoordVal(s){ s=String(s||'').trim(); if(/[°'"NSEWLO]/i.test(s)&&/\d/.test(s)&&!/^[-\d.,\s]+$/.test(s)){
    const up=s.toUpperCase(); const neg=/[SWO]\s*$/.test(up)||/^\s*[SWO]/.test(up)||up.trim().startsWith('-');
    const nums=(up.replace(/,/g,'.').match(/\d+(?:\.\d+)?/g)||[]).map(Number); const v=(nums[0]||0)+(nums[1]||0)/60+(nums[2]||0)/3600; return neg?-v:v; }
  return parseNum(s); }
function niceStep(x){ const p=Math.pow(10,Math.floor(Math.log10(x))); const f=x/p; return (f<1.5?1:f<2.25?2:f<3.5?2.5:f<7.5?5:10)*p; }
function toast(msg,ms=3200){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,ms); }
function busy(msg){ const b=$('#busy'); if(msg===false){b.hidden=true;return;} $('#busyMsg').textContent=msg||'Processando…'; b.hidden=false; }
function download(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000); }
function safeName(s){ return (s||'arquivo').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w\-]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'')||'arquivo'; }
async function copyText(t){ try{ await navigator.clipboard.writeText(t); toast('Copiado para a área de transferência.'); }catch(e){ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');toast('Copiado.');}catch(_){toast('Não foi possível copiar automaticamente; selecione e copie manualmente.');} ta.remove(); } }
const canvasBlob=(c,type='image/png',q)=>new Promise((res,rej)=>{ try{ c.toBlob(b=>b?res(b):rej(new Error('blob')),type,q);}catch(e){rej(e);} });

/* Ícones */
const ICONS={
 select:'<path d="M5 3.5l12.5 7.2-5.3 1.6-2.4 5.2z"/><path d="M12.6 13.2l4.4 5"/>',
 ponto:'<circle cx="12" cy="12" r="3.2" fill="currentColor"/><circle cx="12" cy="12" r="7.5"/>',
 linha:'<path d="M3.5 18.5L9.5 7.5 15 14l5.5-8.5"/><circle cx="3.5" cy="18.5" r="1.5" fill="currentColor"/><circle cx="9.5" cy="7.5" r="1.5" fill="currentColor"/><circle cx="15" cy="14" r="1.5" fill="currentColor"/><circle cx="20.5" cy="5.5" r="1.5" fill="currentColor"/>',
 poligono:'<path d="M4.5 8.5L12 3.5l7.5 5-2.5 11h-10z" fill="currentColor" fill-opacity=".15"/><circle cx="4.5" cy="8.5" r="1.5" fill="currentColor"/><circle cx="12" cy="3.5" r="1.5" fill="currentColor"/><circle cx="19.5" cy="8.5" r="1.5" fill="currentColor"/><circle cx="17" cy="19.5" r="1.5" fill="currentColor"/><circle cx="7" cy="19.5" r="1.5" fill="currentColor"/>',
 retangulo:'<rect x="4" y="6" width="16" height="12" fill="currentColor" fill-opacity=".15"/>',
 circulo:'<circle cx="12" cy="12" r="8" fill="currentColor" fill-opacity=".15"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
 texto:'<path d="M5 6.5V4.5h14v2M12 4.5v15M9 19.5h6"/>',
 cota:'<path d="M3.5 7v10M20.5 7v10M3.5 12h17M5 13.5l2-3M17 13.5l2-3"/>',
 tabela:'<rect x="3.5" y="4.5" width="17" height="15" rx="1"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15"/>',
 azimute:'<path d="M12 21V3M10 5l2-2 2 2"/><path d="M12 13l7-5"/><path d="M12 8.5a4.5 4.5 0 0 1 3.4 1.5"/><circle cx="19" cy="8" r="1.4" fill="currentColor"/>',
 retmed:'<rect x="5" y="8.5" width="13" height="10"/><path d="M5 5h13M5 3.5v3M18 3.5v3M21 8.5v10M19.5 8.5h3M19.5 18.5h3"/>',
 vertices:'<path d="M5 8l7-4.5 7 4.5-2 11H7z"/><rect x="3.3" y="6.3" width="3.4" height="3.4" fill="currentColor"/><rect x="15.3" y="17.3" width="3.4" height="3.4" fill="currentColor"/><rect x="10.3" y="1.8" width="3.4" height="3.4" fill="currentColor"/>',
 mover:'<path d="M12 3v18M3 12h18M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5"/>',
 duplicar:'<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
 excluir:'<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>',
 desfazer:'<path d="M9 7L4.5 11.5 9 16"/><path d="M4.5 11.5H15a4.5 4.5 0 0 1 0 9h-3"/>',
 refazer:'<path d="M15 7l4.5 4.5L15 16"/><path d="M19.5 11.5H9a4.5 4.5 0 0 0 0 9h3"/>',
 atributos:'<rect x="3.5" y="5" width="17" height="14" rx="1"/><path d="M3.5 9.5h17M3.5 14h17M8.5 9.5V19M14.5 9.5V19"/>',
 regua:'<path d="M3 16l13-13 5 5L8 21z"/><path d="M7 12l2 2M10 9l2 2M13 6l2 2"/>',
 area:'<path d="M4 7.5l7-3.5 9 4.5-3 11.5H6z"/><path d="M7 16l6-6M10 18l7-7M5.5 12l6-6" opacity=".55"/>',
 alvo:'<circle cx="12" cy="12" r="7"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
 irpara:'<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
 limpar:'<path d="M14.5 4l5.5 5.5-9.5 9.5H5v-5.5z"/><path d="M9 9.5l5.5 5.5M4 21h16"/>',
 novo:'<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4M12 11v6M9 14h6"/>',
 abrir:'<path d="M3.5 6.5h6l2 2h9v10.5h-17z"/>',
 salvar:'<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
 importar:'<path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5"/><path d="M4 16v4h16v-4"/>',
 exportar:'<path d="M12 14.5v-11M7.5 8l4.5-4.5L16.5 8"/><path d="M4 16v4h16v-4"/>',
 imagem:'<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-5 4 4 3-3 4 4"/>',
 camadas:'<path d="M12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M3.5 12.5L12 17l8.5-4.5M3.5 16L12 20.5 20.5 16"/>',
 layout:'<rect x="4" y="3.5" width="16" height="17" rx="1"/><rect x="6.5" y="6" width="7" height="9"/><path d="M15.5 6h2.5M15.5 9h2.5M15.5 12h2.5M6.5 17.5h11"/>',
 gps:'<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><path d="M9 10.5l2 2 4-4"/>',
 nuvem:'<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.6 4.5 4.5 0 0 0 7 18.5z"/><path d="M12 10.5v6M9.5 14l2.5 2.5 2.5-2.5"/>',
 instalar:'<rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M12 7v7M9.5 11.5L12 14l2.5-2.5M10.5 18.5h3"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r="1.1" fill="currentColor"/>',
 pasta:'<path d="M3.5 6.5h6l2 2h9v10.5h-17z"/><path d="M3.5 10.5h17"/>',
 simbologia:'<circle cx="7" cy="7" r="3" fill="currentColor" fill-opacity=".25"/><path d="M14 4.5l3.5 6h-7z"/><rect x="4" y="14" width="6" height="6"/><path d="M13.5 14l7 6M20.5 14l-7 6" opacity=".7"/>',
 pincel:'<path d="M19.5 3.5l-9 9"/><path d="M10.5 12.5c-2.5 0-4 1.5-4 3.5 0 1.6-1 2.6-2.5 3 3.5 1 8 .5 8.5-3.5.2-1.3-.6-2.4-2-3z"/>',
 xyz:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17"/>'
};
const ic=(n,cls='i')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||''}</svg>`;

/* ===================== Sistemas de referência ===================== */
const CRS_INFO={};
function addCRS(code,name,def,info){ if(def) proj4.defs(code,def); CRS_INFO[code]=Object.assign({code,name},info); }
(function(){
  const sg='+ellps=GRS80 +towgs84=0,0,0,0,0,0,0';
  addCRS('EPSG:4674','SIRGAS 2000 · geográficas (lat/long)','+proj=longlat '+sg+' +no_defs',{geo:true,datum:'SIRGAS2000',main:true});
  for(let z=18;z<=25;z++) addCRS('EPSG:'+(31960+z),`SIRGAS 2000 · UTM ${z}S`,`+proj=utm +zone=${z} +south ${sg} +units=m +no_defs`,{utm:z,south:true,datum:'SIRGAS2000',main:true});
  for(let z=18;z<=22;z++) addCRS('EPSG:'+(31954+z),`SIRGAS 2000 · UTM ${z}N`,`+proj=utm +zone=${z} ${sg} +units=m +no_defs`,{utm:z,south:false,datum:'SIRGAS2000',main:true});
  addCRS('EPSG:4326','WGS 84 · geográficas',null,{geo:true,datum:'WGS84',main:true});
  addCRS('EPSG:3857','WGS 84 · Pseudo-Mercator (web)',null,{merc:true,datum:'WGS84',main:true});
  const sad='+ellps=aust_SA +towgs84=-67.35,3.88,-38.22,0,0,0,0';
  addCRS('EPSG:4618','SAD69 · geográficas','+proj=longlat '+sad+' +no_defs',{geo:true,datum:'SAD69'});
  for(let z=18;z<=25;z++) addCRS('EPSG:'+(29170+z),`SAD69 · UTM ${z}S`,`+proj=utm +zone=${z} +south ${sad} +units=m +no_defs`,{utm:z,south:true,datum:'SAD69'});
  for(let z=18;z<=25;z++) addCRS('EPSG:'+(32700+z),`WGS 84 · UTM ${z}S`,`+proj=utm +zone=${z} +south +datum=WGS84 +units=m +no_defs`,{utm:z,south:true,datum:'WGS84'});
  for(let z=18;z<=22;z++) addCRS('EPSG:'+(32600+z),`WGS 84 · UTM ${z}N`,`+proj=utm +zone=${z} +datum=WGS84 +units=m +no_defs`,{utm:z,south:false,datum:'WGS84'});
  ol.proj.proj4.register(proj4);
  Object.values(CRS_INFO).forEach(i=>{ const p=ol.proj.get(i.code); if(!p) return;
    if(i.utm){ p.setExtent(i.south?[-1500000,0,2500000,10000000]:[-1500000,-500000,2500000,9300000]); }
    if(i.geo&&i.code!=='EPSG:4326'){ p.setExtent([-180,-90,180,90]); p.setWorldExtent([-180,-90,180,90]); p.setGlobal(true); } });
  ol.proj.addProjection(new ol.proj.Projection({code:'LOCAL',units:'m',extent:[-1e7,-1e7,1e7,1e7]}));
  CRS_INFO.LOCAL={code:'LOCAL',name:'Plano local · sem georreferência (m)',local:true,main:true};
})();
function crsWKT(code){ const i=CRS_INFO[code]; if(!i||i.local) return null;
  const G={SIRGAS2000:'GEOGCS["GCS_SIRGAS_2000",DATUM["D_SIRGAS_2000",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]',
    WGS84:'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]',
    SAD69:'GEOGCS["GCS_South_American_1969",DATUM["D_South_American_1969",SPHEROID["GRS_1967_Truncated",6378160.0,298.25]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]'};
  const g=G[i.datum]; if(i.geo) return g;
  if(i.merc) return 'PROJCS["WGS_1984_Web_Mercator_Auxiliary_Sphere",'+G.WGS84+',PROJECTION["Mercator_Auxiliary_Sphere"],PARAMETER["False_Easting",0.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",0.0],PARAMETER["Standard_Parallel_1",0.0],PARAMETER["Auxiliary_Sphere_Type",0.0],UNIT["Meter",1.0]]';
  const cm=-183+6*i.utm, dn=i.datum==='SIRGAS2000'?'SIRGAS_2000':i.datum==='SAD69'?'SAD_1969':'WGS_1984';
  return `PROJCS["${dn}_UTM_Zone_${i.utm}${i.south?'S':'N'}",${g},PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",${i.south?'10000000.0':'0.0'}],PARAMETER["Central_Meridian",${cm}.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]`; }
function crsDesc(code){ const i=CRS_INFO[code]; if(!i) return code; if(i.local) return 'Plano topográfico local, sem georreferência. Unidades em metros.';
  const dt=i.datum==='SIRGAS2000'?'SIRGAS 2000':i.datum==='SAD69'?'SAD69':'WGS 84';
  if(i.utm){ const cm=-183+6*i.utm; return `Datum ${dt} · Projeção UTM · Fuso ${i.utm}${i.south?'S':'N'} · MC ${Math.abs(cm)}° W`; }
  if(i.merc) return 'WGS 84 · Pseudo-Mercator (EPSG:3857)'; return `Datum ${dt} · Coordenadas geográficas`; }
function detectCRSfromWKT(w){ if(!w) return null; const u=w.toUpperCase(); const z=u.match(/ZONE_?(\d{1,2})_?([NS])/);
  const dt=u.includes('SIRGAS')?'S':u.includes('SOUTH_AMERICAN_1969')||u.includes('SAD')?'A':u.includes('WGS')?'W':null;
  if(z){ const n=+z[1], s=z[2]==='S'; if(dt==='S') return 'EPSG:'+(s?31960+n:31954+n); if(dt==='A'&&s) return 'EPSG:'+(29170+n); if(dt==='W') return 'EPSG:'+(s?32700+n:32600+n); }
  if(u.startsWith('GEOGCS')){ if(dt==='S') return 'EPSG:4674'; if(dt==='W') return 'EPSG:4326'; if(dt==='A') return 'EPSG:4618'; }
  if(u.includes('MERCATOR_AUXILIARY')||u.includes('PSEUDO')) return 'EPSG:3857'; return null; }
const crsInfo=()=>CRS_INFO[S.crs];
const isMetric=(code=S.crs)=>{ const i=CRS_INFO[code]; return !!(i&&(i.utm||i.local)); };
const isLocal=()=>S.crs==='LOCAL';
function gpu(code,c){ const i=CRS_INFO[code]; if(!i||i.utm||i.local) return 1; const ll=ol.proj.toLonLat(c,code); const cl=Math.cos(ll[1]*RAD); return i.geo?111319.49*cl:cl; }
function toLL(c,code=S.crs){ return code==='LOCAL'?null:ol.proj.toLonLat(c,code); }
function dist(a,b){ if(isMetric()) return Math.hypot(b[0]-a[0],b[1]-a[1]); return ol.sphere.getDistance(toLL(a),toLL(b)); }
function azim(a,b){ if(isMetric()) return (Math.atan2(b[0]-a[0],b[1]-a[1])/RAD+360)%360;
  const p=toLL(a),q=toLL(b),f1=p[1]*RAD,f2=q[1]*RAD,dl=(q[0]-p[0])*RAD; const y=Math.sin(dl)*Math.cos(f2),x=Math.cos(f1)*Math.sin(f2)-Math.sin(f1)*Math.cos(f2)*Math.cos(dl); return (Math.atan2(y,x)/RAD+360)%360; }
function gArea(g){ return isMetric()? g.getArea() : ol.sphere.getArea(g,{projection:S.crs}); }
function gLength(g){ if(!isMetric()) return ol.sphere.getLength(g,{projection:S.crs});
  const t=g.getType(); if(t==='Polygon') return g.getLinearRings().reduce((s,r)=>s+new ol.geom.LineString(r.getCoordinates()).getLength(),0);
  if(t==='MultiPolygon') return g.getPolygons().reduce((s,p)=>s+gLength(p),0); return g.getLength?g.getLength():0; }
function fmtXY(c){ if(!c) return ''; if(isMetric()) return `E ${nf(c[0])} · N ${nf(c[1])}`; const ll=toLL(c); return `${latTxt(ll[1])} · ${lonTxt(ll[0])}`; }

/* ===================== Estado ===================== */
const S={crs:'EPSG:31982',layers:[],activeId:null,basemap:'esri_img',baseOpacity:1,customXYZ:'',tool:'select',snap:true,ortho:false,gridSnap:false,gridStep:1,showGrid:false,mapVersion:0,layout:null,projName:'Projeto sem título'};
const PALETTE=['#ffd21f','#ff5a36','#22c55e','#38bdf8','#c084fc','#fb923c','#f472b6','#2dd4bf'];
const DEF_STYLE=()=>({stroke:'#ffd21f',width:2.5,fill:'#ffd21f',fillOp:0.12,dash:'solid',pointSize:6,vtxColor:'#e0218a',showVtx:true,vtxPrefix:'M-',vtxStart:1,showDist:true,showAz:false,azMode:'az',showArea:true,areaUnit:'ha',labelField:'',labelSize:11,labelColor:'#111111',fillPattern:'solido',pointShape:'circulo',pointFill:'',pointStroke:'#1b1b1b',symMode:'unico',catField:'',cats:[],catOther:'#9e9e9e'});
const getLayer=id=>S.layers.find(l=>l.id===id);
const activeLayer=()=>getLayer(S.activeId);
const isVec=L=>L&&L.type==='vector';
const layerOfFeature=f=>S.layers.find(L=>isVec(L)&&L.source.hasFeature(f));
const ensureFid=f=>{ if(!f.get('_fid')) f.set('_fid',uid(),true); return f; };
function findFeatureByFid(fid){ for(const L of S.layers){ if(!isVec(L)) continue; const f=L.source.getFeatures().find(x=>x.get('_fid')===fid); if(f) return {f,L}; } return null; }

/* ===================== Mapas base ===================== */
const BASEMAPS={
  nenhum:{name:'Sem mapa de fundo',chip:'#ffffff'},
  esri_img:{name:'Esri Satélite',url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',attr:'Imagem © Esri, Maxar, Earthstar Geographics',max:19,cors:true,chip:'#3d5b3a'},
  g_sat:{name:'Google Satélite',url:'https://mt{0-3}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',attr:'Imagem © Google',max:21,g:true,chip:'#2f4a2c'},
  g_hib:{name:'Google Híbrido',url:'https://mt{0-3}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',attr:'Imagem © Google',max:21,g:true,chip:'#4a5a37'},
  g_rua:{name:'Google Ruas',url:'https://mt{0-3}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',attr:'Mapa © Google',max:21,g:true,chip:'#e9e5dc'},
  g_ter:{name:'Google Terreno',url:'https://mt{0-3}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',attr:'Mapa © Google',max:20,g:true,chip:'#d9dcc4'},
  esri_topo:{name:'Esri Topográfico',url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',attr:'Mapa © Esri',max:19,cors:true,chip:'#e6dfc8'},
  esri_rua:{name:'Esri Ruas',url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',attr:'Mapa © Esri',max:19,cors:true,chip:'#f1ece0'},
  esri_relevo:{name:'Esri Relevo sombreado',url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',attr:'Relevo © Esri',max:13,cors:true,chip:'#cfcfcf'},
  esri_cinza:{name:'Esri Cinza claro',url:'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',attr:'Mapa © Esri',max:16,cors:true,chip:'#e3e3e3'},
  osm:{name:'OpenStreetMap',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attr:'© colaboradores do OpenStreetMap',max:19,cors:true,chip:'#f2efe9'},
  otm:{name:'OpenTopoMap',url:'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',attr:'© OpenStreetMap, SRTM · estilo © OpenTopoMap (CC-BY-SA)',max:17,cors:true,chip:'#cdd8b0'},
  carto_claro:{name:'Carto Claro',url:'https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',attr:'© OpenStreetMap · © CARTO',max:20,cors:true,chip:'#fafaf8'},
  carto_escuro:{name:'Carto Escuro',url:'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',attr:'© OpenStreetMap · © CARTO',max:20,cors:true,chip:'#262626'},
  custom:{name:'XYZ personalizado',chip:'#7c8a85'}
};
let googleCORS=false;
(function probe(){ const im=new Image(); im.crossOrigin='anonymous'; im.onload=()=>{googleCORS=true; const b=BASEMAPS[S.basemap]; if(b&&b.g){ srcCache={}; applyBasemap(); }}; im.onerror=()=>{googleCORS=false;}; im.src='https://mt1.google.com/vt/lyrs=s&x=0&y=0&z=0'; })();
let srcCache={};
const noCorsKeys=new Set(); let bmWarned=false;
function basemapSource(key){ if(srcCache[key]) return srcCache[key]; const b=BASEMAPS[key]; let url=b.url; if(key==='custom') url=S.customXYZ; if(!url) return null;
  const cors=!noCorsKeys.has(key)&&(b.cors||(b.g&&googleCORS)||key==='custom');
  const src=new ol.source.XYZ({url,maxZoom:b.max||20,crossOrigin:cors?'anonymous':undefined,attributions:b.attr||'',reprojectionErrorThreshold:0.5});
  const st={ok:0,err:0};
  src.on('tileloadend',()=>{ st.ok++; });
  src.on('tileloaderror',()=>{ st.err++; if(st.ok>0||st.err!==8||S.basemap!==key) return;
    if(cors){ // a rede/servidor recusou o acesso com CORS: tenta o modo compatível
      noCorsKeys.add(key); delete srcCache[key]; applyBasemap();
      toast('O servidor de mapas recusou o acesso direto; o fundo foi recarregado em modo compatível. A exportação de imagem/PDF com este fundo pode ficar bloqueada.',7000); }
    else if(!bmWarned){ bmWarned=true; basemapHelp(); } });
  srcCache[key]=src; return src; }
function basemapHelp(){ modal({title:'Mapa de fundo não carregou',body:`<p style="margin-top:0">O navegador não conseguiu baixar as imagens do servidor de mapas. As causas mais comuns:</p>
  <ol style="margin:0;padding-left:20px;line-height:1.55"><li><b>Arquivo aberto dentro de um visualizador</b> (app do Claude, WhatsApp, Drive, e-mail). Esses visualizadores bloqueiam acessos externos. Baixe o arquivo e abra direto no <b>Chrome</b> ou <b>Edge</b> (no computador: clique com o botão direito › Abrir com).</li>
  <li><b>Sem internet</b> ou rede corporativa com proxy/firewall bloqueando servidores de mapas. Teste em outra rede ou peça liberação à TI dos domínios <code>server.arcgisonline.com</code>, <code>mt*.google.com</code>, <code>tile.openstreetmap.org</code>.</li>
  <li>Experimente outro mapa na aba <b>Mapa de fundo</b>.</li></ol><p class="note">O desenho, as medições e as exportações vetoriais funcionam normalmente mesmo sem mapa de fundo.</p>`,buttons:[{label:'Entendi',primary:true}]}); }
function basemapCredit(){ const b=BASEMAPS[S.basemap]; if(!b||S.basemap==='nenhum'||isLocal()) return ''; return b.attr||b.name; }

/* ===================== Mapa ===================== */
const DEFAULT_LL=[-48.302,-13.497];
const baseLayer=new ol.layer.Tile({zIndex:-10});
const gridLayer=new ol.layer.Vector({source:new ol.source.Vector(),zIndex:900,style:gridStyle});
const measureSource=new ol.source.Vector();
const MEAS_ST=Object.assign(DEF_STYLE(),{showVtx:false,showDist:true,showArea:true,labelColor:'#0b5563',labelSize:12});
const measureLayer=new ol.layer.Vector({source:measureSource,zIndex:950,style:(f,res)=>{ const out=[new ol.style.Style({stroke:new ol.style.Stroke({color:'#00b4d8',width:2.2,lineDash:[8,6]}),fill:new ol.style.Fill({color:'rgba(0,180,216,.14)'})})]; addLabels(f,f.getGeometry(),MEAS_ST,res,out); return out; }});
const tempSource=new ol.source.Vector();
const tempLayer=new ol.layer.Vector({source:tempSource,zIndex:960,style:new ol.style.Style({image:new ol.style.Circle({radius:7,fill:new ol.style.Fill({color:'rgba(224,33,138,.35)'}),stroke:new ol.style.Stroke({color:'#e0218a',width:2.5})})})});
const map=new ol.Map({target:'map',layers:[baseLayer,gridLayer,measureLayer,tempLayer],
  controls:ol.control.defaults.defaults({rotate:false,attributionOptions:{collapsible:true}}).extend([new ol.control.ScaleLine({units:'metric'})]),
  view:new ol.View({projection:S.crs,center:ol.proj.fromLonLat(DEFAULT_LL,S.crs),zoom:15,maxZoom:40})});
function applyBasemap(){ if(isLocal()||S.basemap==='nenhum'){ baseLayer.setSource(null); baseLayer.setVisible(false); }
  else { const src=basemapSource(S.basemap); baseLayer.setSource(src); baseLayer.setVisible(!!src); }
  baseLayer.setOpacity(S.baseOpacity); S.mapVersion++; renderBasemapUI(); scheduleSave(); }

/* ===================== Estilos ===================== */
const FONT=(w,s)=>`${w} ${s}px Barlow, "Segoe UI", Arial, sans-serif`;
function baseStyle(L){ if(L._base) return L._base; const st=L.style;
  const dash=st.dash==='dash'?[10,6]:st.dash==='dot'?[1.5,5]:st.dash==='dashdot'?[12,4,2,4]:undefined;
  L._base=new ol.style.Style({stroke:new ol.style.Stroke({color:st.stroke,width:+st.width,lineDash:dash,lineCap:dash?'butt':'round',lineJoin:'round'}),
    fill:new ol.style.Fill({color:hexA(st.fill,+st.fillOp)}),
    image:new ol.style.Circle({radius:+st.pointSize,fill:new ol.style.Fill({color:st.stroke}),stroke:new ol.style.Stroke({color:isDarkColor(st.stroke)?'#ffffff':'#1b1b1b',width:1.5})})});
  return L._base; }
function haloFor(color){ return new ol.style.Stroke({color:isDarkColor(color)?'rgba(255,255,255,.92)':'rgba(0,0,0,.85)',width:3}); }
function readableRot(ang){ let r=-ang; if(r>Math.PI/2) r-=Math.PI; if(r<-Math.PI/2) r+=Math.PI; return r; }
function geomParts(g){ const t=g.getType(), out=[];
  if(t==='Polygon') g.getCoordinates().forEach(r=>out.push({c:r.slice(0,-1),closed:true}));
  else if(t==='MultiPolygon') g.getCoordinates().forEach(p=>p.forEach(r=>out.push({c:r.slice(0,-1),closed:true})));
  else if(t==='LineString') out.push({c:g.getCoordinates(),closed:false});
  else if(t==='MultiLineString') g.getCoordinates().forEach(l=>out.push({c:l,closed:false}));
  return out; }
const vtxName=(st,i)=>(st.vtxPrefix??'')+String(i).padStart(i<100?2:3,'0');
function addLabels(f,g,st,res,out){ if(!g) return; const t=g.getType(); const parts=geomParts(g);
  const fill=new ol.style.Fill({color:st.labelColor}), halo=haloFor(st.labelColor), sz=+st.labelSize;
  let nseg=0; parts.forEach(p=>nseg+=p.c.length);
  if((st.showDist||st.showAz)&&nseg<=600){ for(const P of parts){ const c=P.c,n=c.length,segs=P.closed?n:n-1;
      for(let i=0;i<segs;i++){ const a=c[i],b=c[(i+1)%n]; const pl=Math.hypot(b[0]-a[0],b[1]-a[1])/res; if(pl<52) continue;
        const mid=new ol.geom.Point([(a[0]+b[0])/2,(a[1]+b[1])/2]); const rot=readableRot(Math.atan2(b[1]-a[1],b[0]-a[0]));
        if(st.showDist) out.push(new ol.style.Style({geometry:mid,text:new ol.style.Text({text:nf(dist(a,b))+' m',font:FONT(600,sz),rotation:rot,offsetY:-sz*0.85,fill,stroke:halo,overflow:true})}));
        if(st.showAz) out.push(new ol.style.Style({geometry:mid,text:new ol.style.Text({text:(st.azMode==='rumo'?'':'Az ')+azTxt(azim(a,b),st.azMode),font:FONT(500,sz-1),rotation:rot,offsetY:sz*0.95,fill,stroke:halo,overflow:true})})); } } }
  if(st.showVtx&&parts.length&&nseg<=400){ let k=+st.vtxStart||1; const ex=g.getExtent(); const cx=(ex[0]+ex[2])/2, cy=(ex[1]+ex[3])/2;
    const dot=new ol.style.Circle({radius:4.2,fill:new ol.style.Fill({color:'#ffffff'}),stroke:new ol.style.Stroke({color:st.vtxColor,width:2.2})});
    for(const P of parts){ for(const v of P.c){ let dx=v[0]-cx, dy=v[1]-cy; const d=Math.hypot(dx,dy)||1; dx/=d; dy/=d;
        out.push(new ol.style.Style({geometry:new ol.geom.Point(v),image:dot,text:new ol.style.Text({text:vtxName(st,k++),font:FONT(600,sz-0.5),offsetX:dx*17,offsetY:-dy*15,fill:new ol.style.Fill({color:'#1b1b1b'}),backgroundFill:new ol.style.Fill({color:'rgba(255,255,255,.9)'}),backgroundStroke:new ol.style.Stroke({color:st.vtxColor,width:1}),padding:[1,3,0,3]})})); } } }
  const lab=st.labelField?f.get(st.labelField):'';
  if((t==='Polygon'||t==='MultiPolygon')&&(st.showArea||lab)){ let ipc; try{ ipc=t==='Polygon'?g.getInteriorPoint().getCoordinates().slice(0,2):g.getInteriorPoints().getFirstCoordinate().slice(0,2); }catch(e){ ipc=ol.extent.getCenter(g.getExtent()); } if(!isFinite(ipc[0])) ipc=ol.extent.getCenter(g.getExtent()); const pt=new ol.geom.Point(ipc);
    const A=gArea(g); const lines=[]; if(lab) lines.push(String(lab)); if(st.showArea) lines.push(st.areaUnit==='m2'? nf(A,2)+' m²' : nf(A/1e4,4)+' ha');
    out.push(new ol.style.Style({geometry:pt,text:new ol.style.Text({text:lines.join('\n'),font:FONT(700,sz+2),fill,stroke:halo,overflow:true})})); }
  else if(lab&&(t==='LineString'||t==='MultiLineString')){ const ls=t==='LineString'?g:g.getLineString(0); out.push(new ol.style.Style({geometry:new ol.geom.Point(ls.getCoordinateAt(0.5)),text:new ol.style.Text({text:String(lab),font:FONT(600,sz),placement:'point',offsetY:-sz,fill,stroke:halo})})); }
  else if(lab&&(t==='Point'||t==='MultiPoint')){ out.push(new ol.style.Style({text:new ol.style.Text({text:String(lab),font:FONT(600,sz),offsetY:-(+st.pointSize+sz*0.8),fill,stroke:halo})})); } }
function textStyle(f,st){ const col=f.get('_cor')||st.labelColor;
  return [new ol.style.Style({image:new ol.style.Circle({radius:6,fill:new ol.style.Fill({color:'rgba(0,0,0,0.01)'})}),text:new ol.style.Text({text:String(f.get('texto')??''),font:FONT(f.get('_negrito')?700:500,+f.get('_tam')||14),fill:new ol.style.Fill({color:col}),stroke:haloFor(col),rotation:(+f.get('_rot')||0)*RAD,overflow:true})})]; }
function cotaStyle(f,st,res){ const g=f.getGeometry(), c=g.getCoordinates(); if(c.length<2) return []; const a=c[0], b=c[c.length-1];
  const col=st.labelColor; const ang=Math.atan2(b[1]-a[1],b[0]-a[0]); const T=5*res, E=8*res, t1=ang+Math.PI/4, pa=ang+Math.PI/2;
  const tick=p=>[[p[0]-Math.cos(t1)*T,p[1]-Math.sin(t1)*T],[p[0]+Math.cos(t1)*T,p[1]+Math.sin(t1)*T]];
  const ext=p=>[[p[0]-Math.cos(pa)*E,p[1]-Math.sin(pa)*E],[p[0]+Math.cos(pa)*E,p[1]+Math.sin(pa)*E]];
  return [new ol.style.Style({stroke:new ol.style.Stroke({color:col,width:1.2})}),
    new ol.style.Style({geometry:new ol.geom.MultiLineString([tick(a),tick(b),ext(a),ext(b)]),stroke:new ol.style.Stroke({color:col,width:1.8})}),
    new ol.style.Style({geometry:new ol.geom.Point([(a[0]+b[0])/2,(a[1]+b[1])/2]),text:new ol.style.Text({text:nf(dist(a,b))+' m',font:FONT(600,+st.labelSize),rotation:readableRot(ang),offsetY:-(+st.labelSize*0.85),fill:new ol.style.Fill({color:col}),stroke:haloFor(col),overflow:true})})]; }
function makeStyleFn(L){ return function(f,res){ const g=f.getGeometry(); if(!g) return null; const k=f.get('_kind');
  if(k==='texto') return textStyle(f,L.style); if(k==='cota') return cotaStyle(f,L.style,res);
  const out=featureSymbology(L,f).slice(); addLabels(f,g,L.style,res,out); return out; }; }
function vertexCoords(g){ const t=g.getType(); if(t==='Point') return [g.getCoordinates()]; if(t==='MultiPoint'||t==='LineString') return g.getCoordinates();
  if(t==='MultiLineString') return g.getCoordinates().flat(); if(t==='Polygon') return g.getCoordinates().flatMap(r=>r.slice(0,-1));
  if(t==='MultiPolygon') return g.getCoordinates().flatMap(p=>p.flatMap(r=>r.slice(0,-1))); return []; }
function selectStyle(f,res){ const L=layerOfFeature(f); const base=L?(L.olLayer.getStyleFunction()(f,res)||[]):[]; const g=f.getGeometry(); if(!g) return base;
  const hl=[new ol.style.Style({stroke:new ol.style.Stroke({color:'rgba(0,229,255,.55)',width:(L?+L.style.width:2)+6}),zIndex:-1})];
  const pts=vertexCoords(g); if(pts.length&&pts.length<3000) hl.push(new ol.style.Style({geometry:new ol.geom.MultiPoint(pts),image:new ol.style.RegularShape({points:4,radius:6,angle:Math.PI/4,fill:new ol.style.Fill({color:'#00e5ff'}),stroke:new ol.style.Stroke({color:'#00353d',width:1})}),zIndex:5}));
  return hl.concat(Array.isArray(base)?base:[base]); }
function gridStyle(f){ const k=f.get('k'); if(k==='l') return new ol.style.Style({stroke:new ol.style.Stroke({color:'rgba(242,182,48,.75)',width:1,lineDash:[4,4]})});
  return new ol.style.Style({text:new ol.style.Text({text:f.get('t'),font:FONT(600,11),fill:new ol.style.Fill({color:'#1a1a1a'}),backgroundFill:new ol.style.Fill({color:'rgba(242,182,48,.92)'}),padding:[1,4,0,4],textAlign:f.get('a')||'center',offsetY:f.get('oy')||0,offsetX:f.get('ox')||0})}); }

/* ===================== Camadas ===================== */
function nextLayerName(){ let n=S.layers.length+1; while(S.layers.some(l=>l.name==='Camada '+n)) n++; return 'Camada '+n; }
function createVectorLayer(o={}){
  const used=new Set(S.layers.filter(isVec).map(l=>l.style.stroke)); const col=PALETTE.find(c=>!used.has(c))||PALETTE[S.layers.length%PALETTE.length];
  const L={id:o.id||uid(),type:'vector',name:o.name||nextLayerName(),visible:o.visible!==false,opacity:o.opacity??1,style:Object.assign(DEF_STYLE(),{stroke:col,fill:col},o.style||{})};
  L.source=new ol.source.Vector();
  L.olLayer=new ol.layer.Vector({source:L.source,style:makeStyleFn(L),visible:L.visible,opacity:L.opacity,updateWhileInteracting:true,updateWhileAnimating:true});
  if(o.features){ o.features.forEach(ensureFid); L.source.addFeatures(o.features); }
  S.layers.push(L); map.addLayer(L.olLayer); restack(); if(o.activate!==false) S.activeId=L.id; renderLayers(); refreshSnaps(); return L; }
function createRasterLayer(name,olLayer,o={}){ const L={id:o.id||uid(),type:'raster',name,visible:o.visible!==false,opacity:o.opacity??1,olLayer}; olLayer.setVisible(L.visible); olLayer.setOpacity(L.opacity); S.layers.push(L); map.addLayer(olLayer); restack(); S.activeId=L.id; renderLayers(); S.mapVersion++; return L; }
function restack(){ S.layers.forEach((L,i)=>L.olLayer.setZIndex(10+i)); }
function styleChanged(L){ L._base=null; L.olLayer.changed(); S.mapVersion++; scheduleSave(); if(I.select) I.select.getFeatures().forEach(f=>f.changed()); }
function removeLayer(L){ map.removeLayer(L.olLayer); S.layers=S.layers.filter(x=>x!==L); if(S.activeId===L.id) S.activeId=S.layers.length?S.layers[S.layers.length-1].id:null; clearSelection(); renderLayers(); refreshSnaps(); commit(); }
function ensureDrawLayer(){ let L=activeLayer(); if(!isVec(L)){ L=[...S.layers].reverse().find(isVec); if(!L) L=createVectorLayer({name:'Desenho'}); S.activeId=L.id; renderLayers(); }
  if(!L.visible){ L.visible=true; L.olLayer.setVisible(true); renderLayers(); } return L; }
function zoomToExtent(ex,maxZoom=19){ if(!ex||!isFinite(ex[0])) return; if(ex[0]===ex[2]&&ex[1]===ex[3]){ map.getView().animate({center:[ex[0],ex[1]],duration:300}); return; } map.getView().fit(ex,{padding:[90,60,60,60],duration:350,maxZoom:isLocal()?40:maxZoom}); }
function allExtent(onlyVisible=true){ let ex=ol.extent.createEmpty(); S.layers.forEach(L=>{ if(!isVec(L)||(onlyVisible&&!L.visible)) return; if(L.source.getFeatures().length) ol.extent.extend(ex,L.source.getExtent()); }); return ol.extent.isEmpty(ex)?null:ex; }

/* ===================== Interações ===================== */
const I={select:null,modify:null,translate:null,draw:null,snaps:[],sketch:null,noCad:false,coordKey:null,mKey:null};
I.select=new ol.interaction.Select({style:selectStyle,hitTolerance:7,layers:l=>S.layers.some(L=>isVec(L)&&L.olLayer===l)});
I.select.on('select',()=>{ renderFeaturePanel(); highlightAttrRow(); });
const selFeature=()=>{ const a=I.select.getFeatures().getArray(); return a.length?a[a.length-1]:null; };
function clearSelection(){ I.select.getFeatures().clear(); renderFeaturePanel(); }
function selectFeature(f,zoom){ I.select.getFeatures().clear(); if(f) I.select.getFeatures().push(f); renderFeaturePanel(); highlightAttrRow(); if(f&&zoom) zoomToExtent(f.getGeometry().getExtent()); }
const HINTS={
  select:'<b>Selecionar:</b> clique numa feição para ver medidas, vértices e memorial. <b>Delete</b> exclui · <b>Ctrl+Z</b> desfaz.',
  vertices:'<b>Editar vértices:</b> selecione a feição e arraste os vértices. Arraste o meio de um lado para criar vértice · <b>Alt+clique</b> remove vértice.',
  mover:'<b>Mover:</b> clique na feição para selecioná-la e arraste-a para a nova posição.',
  ponto:'<b>Ponto:</b> clique no mapa ou digite E/N na barra inferior.',
  linha:'<b>Linha:</b> clique para inserir vértices, <b>duplo clique</b> conclui. Use a barra inferior para digitar distância e azimute. <b>Backspace</b> remove o último vértice · <b>Esc</b> cancela.',
  poligono:'<b>Polígono:</b> clique nos vértices, <b>duplo clique</b> fecha. Distância/azimute ou E/N podem ser digitados na barra inferior. <b>Backspace</b> desfaz vértice · <b>Esc</b> cancela.',
  retangulo:'<b>Retângulo:</b> clique num canto e depois no canto oposto. Para medidas exatas use <b>Retângulo por medidas</b>.',
  circulo:'<b>Círculo:</b> clique no centro e depois na borda (raio).',
  texto:'<b>Texto:</b> clique onde o texto deve ficar.',
  cota:'<b>Cota:</b> clique no ponto inicial e no final. A distância aparece automaticamente com traços de cota.',
  mdist:'<b>Medir distância:</b> clique os pontos, duplo clique conclui. Os valores ficam no mapa até você limpar.',
  marea:'<b>Medir área:</b> clique os vértices, duplo clique fecha o polígono.',
  info:'<b>Informações:</b> toque numa feição para ver os atributos. Se houver feições sobrepostas, use as setas ‹ › do popup.',
  coord:'<b>Coordenada:</b> clique em qualquer ponto para ver E/N e latitude/longitude.'
};
function setTool(t){
  [I.draw,I.modify,I.translate].forEach(x=>x&&map.removeInteraction(x)); I.draw=I.modify=I.translate=null; I.sketch=null;
  map.removeInteraction(I.select); if(I.coordKey){ ol.Observable.unByKey(I.coordKey); I.coordKey=null; }
  if(typeof closeIdentify==='function') closeIdentify();
  S.tool=t; $$('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===t?'true':'false'));
  $('#hint').innerHTML=HINTS[t]||''; $('#cadbar').hidden=!['ponto','linha','poligono','cota'].includes(t); $('#map').classList.toggle('crosshair',!['select','vertices','mover'].includes(t));
  if(['select','vertices','mover'].includes(t)){ map.addInteraction(I.select);
    if(t==='vertices'){ I.modify=new ol.interaction.Modify({features:I.select.getFeatures(),pixelTolerance:12}); I.modify.on('modifyend',()=>{commit();renderFeaturePanel();}); map.addInteraction(I.modify); }
    if(t==='mover'){ I.translate=new ol.interaction.Translate({features:I.select.getFeatures()}); I.translate.on('translateend',()=>{commit();renderFeaturePanel();}); map.addInteraction(I.translate); } }
  else if(['ponto','linha','poligono','retangulo','circulo','texto','cota'].includes(t)) startDraw(t);
  else if(t==='mdist'||t==='marea') startMeasure(t==='mdist'?'LineString':'Polygon');
  else if(t==='coord') I.coordKey=map.on('singleclick',e=>showCoordPopup(e.coordinate));
  else if(t==='info') I.coordKey=map.on('singleclick',e=>identifyAt(e));
  refreshSnaps(); }
function cadGeom(type){ return function(coords,geom){ const pts=type==='Polygon'?coords[0]:coords;
    if(pts.length&&!I.noCad){ const last=pts[pts.length-1];
      if(S.gridSnap&&S.gridStep>0){ last[0]=Math.round(last[0]/S.gridStep)*S.gridStep; last[1]=Math.round(last[1]/S.gridStep)*S.gridStep; }
      if(S.ortho&&pts.length>=2){ const p=pts[pts.length-2]; if(Math.abs(last[0]-p[0])>=Math.abs(last[1]-p[1])) last[1]=p[1]; else last[0]=p[0]; } }
    if(type==='Polygon'){ const ring=pts.concat([pts[0]]); if(geom) geom.setCoordinates([ring]); else geom=new ol.geom.Polygon([ring]); }
    else { if(geom) geom.setCoordinates(pts); else geom=new ol.geom.LineString(pts); }
    return geom; }; }
const KIND_LABEL={ponto:'Ponto',linha:'Linha',poligono:'Polígono',retangulo:'Retângulo',circulo:'Círculo',cota:'Cota',texto:'Texto'};
function startDraw(kind){ const L=ensureDrawLayer(); let type, o={};
  if(kind==='ponto'||kind==='texto') type='Point';
  else if(kind==='linha'){ type='LineString'; o.geometryFunction=cadGeom('LineString'); }
  else if(kind==='poligono'){ type='Polygon'; o.geometryFunction=cadGeom('Polygon'); }
  else if(kind==='cota'){ type='LineString'; o.maxPoints=2; o.geometryFunction=cadGeom('LineString'); }
  else if(kind==='retangulo'){ type='Circle'; o.geometryFunction=ol.interaction.Draw.createBox(); }
  else if(kind==='circulo'){ type='Circle'; o.geometryFunction=ol.interaction.Draw.createRegularPolygon(72); }
  I.draw=new ol.interaction.Draw(Object.assign({source:L.source,type},o));
  I.draw.on('drawstart',e=>{ I.sketch=e.feature; });
  I.draw.on('drawabort',()=>{ I.sketch=null; });
  I.draw.on('drawend',e=>{ I.sketch=null; const f=e.feature; ensureFid(f);
    if(kind==='texto'){ f.set('_kind','texto'); setTimeout(()=>askText(L,f),0); return; }
    if(kind==='cota') f.set('_kind','cota');
    const n=L.source.getFeatures().filter(x=>!x.get('_kind')).length+1; if(kind!=='cota') f.set('nome',`${KIND_LABEL[kind]} ${n}`);
    setTimeout(()=>{ commit(); if(kind!=='cota'&&kind!=='ponto') selectFeatureSilently(f); },0); });
  map.addInteraction(I.draw); }
function selectFeatureSilently(f){ I.select.getFeatures().clear(); I.select.getFeatures().push(f); renderFeaturePanel(); }
function lastFixed(){ if(!I.sketch) return null; const g=I.sketch.getGeometry(); if(g.getType()==='Polygon'){ const r=g.getCoordinates()[0]; return r.length>=3?r[r.length-3]:null; } if(g.getType()==='Point') return null; const c=g.getCoordinates(); return c.length>=2?c[c.length-2]:null; }
function cadAppend(pt){ if(!I.draw) return; if(S.tool==='ponto'||S.tool==='texto'){ I.noCad=true; I.draw.appendCoordinates([pt]); I.noCad=false; return; } I.noCad=true; try{ I.draw.appendCoordinates([pt]); } finally{ I.noCad=false; } map.getView().animate({center:pt,duration:250}); }
function startMeasure(type){ I.draw=new ol.interaction.Draw({source:measureSource,type,style:new ol.style.Style({stroke:new ol.style.Stroke({color:'#00b4d8',width:2,lineDash:[6,5]}),fill:new ol.style.Fill({color:'rgba(0,180,216,.12)'}),image:new ol.style.Circle({radius:4,fill:new ol.style.Fill({color:'#00b4d8'})})})});
  let tip; I.draw.on('drawstart',e=>{ const el=document.createElement('div'); el.className='tip'; tip=new ol.Overlay({element:el,offset:[12,-12],positioning:'bottom-left'}); map.addOverlay(tip); measureSource._tips=(measureSource._tips||[]).concat(tip);
    const g=e.feature.getGeometry(); I.mKey=g.on('change',()=>{ el.innerHTML=measureText(g); let p; try{ p=type==='Polygon'?g.getInteriorPoint().getCoordinates().slice(0,2):g.getLastCoordinate(); }catch(_){ p=g.getLastCoordinate?g.getLastCoordinate():null; } if(p&&isFinite(p[0])) tip.setPosition(p); }); });
  I.draw.on('drawend',()=>{ ol.Observable.unByKey(I.mKey); if(tip){ tip.getElement().classList.add('static'); tip.setOffset([0,-8]); tip.setPositioning('bottom-center'); } });
  map.addInteraction(I.draw); }
function measureText(g){ if(g.getType()==='Polygon'){ const A=gArea(g); return `Área ${nf(A/1e4,4)} ha · ${nf(A)} m²<br>Perímetro ${nf(gLength(g))} m`; } return `Comprimento ${nf(gLength(g))} m`; }
function clearMeasures(){ measureSource.clear(); (measureSource._tips||[]).forEach(o=>map.removeOverlay(o)); measureSource._tips=[]; if(popupOv) popupOv.setPosition(undefined); tempSource.clear(); }
let popupOv=null;
function showCoordPopup(c){ if(!popupOv){ const el=document.createElement('div'); el.className='popup'; popupOv=new ol.Overlay({element:el,positioning:'bottom-center',offset:[0,-12],autoPan:{animation:{duration:200}}}); map.addOverlay(popupOv);
    el.addEventListener('click',ev=>{ if(ev.target.closest('.x')) popupOv.setPosition(undefined); if(ev.target.closest('[data-copy]')) copyText(el.dataset.txt); }); }
  const el=popupOv.getElement(); let txt='', html='<button class="x" aria-label="Fechar">×</button><b>Coordenada</b><div class="mono" style="margin-top:4px">';
  if(isMetric()){ html+=`E ${nf(c[0],3)} m<br>N ${nf(c[1],3)} m`; txt+=`E ${c[0].toFixed(3)}\tN ${c[1].toFixed(3)}`; }
  if(!isLocal()){ const ll=toLL(c); html+=`${isMetric()?'<br>':''}Lat ${latTxt(ll[1])}<br>Lon ${lonTxt(ll[0])}<br><span style="color:var(--dim)">${ll[1].toFixed(7)}, ${ll[0].toFixed(7)}</span>`; txt+=`${txt?'\t':''}${ll[1].toFixed(7)}\t${ll[0].toFixed(7)}`; }
  html+=`</div><div style="margin-top:7px"><button class="tb" data-copy>Copiar</button></div>`; el.innerHTML=html; el.dataset.txt=txt; popupOv.setPosition(c);
  tempSource.clear(); tempSource.addFeature(new ol.Feature(new ol.geom.Point(c))); }
function refreshSnaps(){ I.snaps.forEach(s=>map.removeInteraction(s)); I.snaps=[]; if(!S.snap) return;
  if(!['vertices','mover','ponto','linha','poligono','retangulo','circulo','texto','cota','mdist','marea','coord'].includes(S.tool)) return;
  S.layers.forEach(L=>{ if(isVec(L)&&L.visible){ const s=new ol.interaction.Snap({source:L.source,pixelTolerance:12}); map.addInteraction(s); I.snaps.push(s); } }); }

/* ===================== Histórico e salvamento ===================== */
const H={stack:[],idx:-1};
const gjson=new ol.format.GeoJSON();
function snapshot(){ return JSON.stringify(S.layers.filter(isVec).map(L=>({id:L.id,fc:gjson.writeFeaturesObject(L.source.getFeatures())}))); }
function commit(){ const s=snapshot(); if(H.stack[H.idx]!==s){ H.stack=H.stack.slice(0,H.idx+1); H.stack.push(s); if(H.stack.length>80) H.stack.shift(); H.idx=H.stack.length-1; } S.mapVersion++; afterChange(); }
function resetHistory(){ H.stack=[snapshot()]; H.idx=0; }
function restore(s){ const arr=JSON.parse(s); I.select.getFeatures().clear(); arr.forEach(o=>{ const L=getLayer(o.id); if(!L) return; L.source.clear(); L.source.addFeatures(gjson.readFeatures(o.fc)); }); S.mapVersion++; afterChange(); }
function undo(){ if(I.sketch&&I.draw){ I.draw.removeLastPoint(); return; } if(H.idx>0){ H.idx--; restore(H.stack[H.idx]); toast('Desfeito.',1200); } else toast('Nada para desfazer.',1400); }
function redo(){ if(H.idx<H.stack.length-1){ H.idx++; restore(H.stack[H.idx]); toast('Refeito.',1200); } }
function afterChange(){ renderLayers(); renderFeaturePanel(); if(!$('#attr').hidden) renderAttrTable(); scheduleSave(); }
let saveT=null;
function scheduleSave(){ clearTimeout(saveT); if(typeof saveState==='function'&&S.projId) saveState('saving'); saveT=setTimeout(()=>{ if(typeof persistProject==='function'&&S.projId) persistProject(); else { try{ localStorage.setItem('geoprancha:auto',JSON.stringify(projectObj())); }catch(e){} } },1200); }
function projectObj(){ const v=map.getView(); return {app:'GeoPrancha',version:2,id:S.projId,name:S.projName,crs:S.crs,view:{center:v.getCenter(),resolution:v.getResolution()},basemap:S.basemap,baseOpacity:S.baseOpacity,customXYZ:S.customXYZ,activeId:S.activeId,
  layers:S.layers.map(L=>isVec(L)?({id:L.id,name:L.name,visible:L.visible,opacity:L.opacity,style:L.style,fc:gjson.writeFeaturesObject(L.source.getFeatures())}):({id:L.id,type:'raster',name:L.name,visible:L.visible,opacity:L.opacity})),layout:S.layout}; }
function clearProject(){ S.layers.forEach(L=>map.removeLayer(L.olLayer)); S.layers=[]; S.activeId=null; I.select.getFeatures().clear(); clearMeasures(); }
function loadProject(p,rasters=[]){ clearProject(); S.projId=p.id||uid(); S.projName=p.name||'Projeto'; $('#projName').value=S.projName;
  S.crs=CRS_INFO[p.crs]?p.crs:'EPSG:31982'; S.basemap=BASEMAPS[p.basemap]?p.basemap:'esri_img'; S.baseOpacity=p.baseOpacity??1; S.customXYZ=p.customXYZ||''; srcCache={};
  map.setView(new ol.View({projection:S.crs,center:p.view?.center||ol.proj.fromLonLat(DEFAULT_LL,S.crs),resolution:p.view?.resolution||2,maxZoom:40}));
  bindView(); (p.layers||[]).forEach(o=>{ if(o.type==='raster'){ const r=rasters.find(x=>x.id===o.id); if(r&&r.blob) addRaster(o.name,r.blob,r.extent,r.code,{id:o.id,zoom:false,visible:o.visible,opacity:o.opacity}); return; }
    createVectorLayer({id:o.id,name:o.name,visible:o.visible,opacity:o.opacity,style:o.style,features:gjson.readFeatures(o.fc),activate:false}); });
  S.activeId=getLayer(p.activeId)?p.activeId:(S.layers[S.layers.length-1]?.id||null);
  S.layout=p.layout?Object.assign(newLayout(),p.layout):null; if(S.layout) S.layout.els=mergeEls(S.layout.els);
  applyBasemap(); renderCRSSelect(); renderLayers(); renderStyleEditor(); renderFeaturePanel(); resetHistory(); updateGrid(); }

/* ===================== Troca de SRC ===================== */
function featureCount(){ return S.layers.reduce((s,L)=>s+(isVec(L)?L.source.getFeatures().length:0),0); }
function setCRS(code){ if(code===S.crs) return; const from=S.crs;
  if((from==='LOCAL')!==(code==='LOCAL')&&featureCount()>0){ toast('Não é possível converter entre plano local e sistema georreferenciado com feições no projeto. Crie um novo projeto para trocar.',5200); renderCRSSelect(); return; }
  const v=map.getView(); const c=v.getCenter(), res=v.getResolution();
  let nc=c, nres=res; if(from!=='LOCAL'&&code!=='LOCAL'){ nc=ol.proj.transform(c,from,code); nres=res*gpu(from,c)/gpu(code,nc);
    S.layers.forEach(L=>{ if(isVec(L)) L.source.getFeatures().forEach(f=>{ const g=f.getGeometry(); if(g) g.transform(from,code); }); }); }
  S.crs=code; clearMeasures(); I.select.getFeatures().clear();
  map.setView(new ol.View({projection:code,center:nc,resolution:nres,maxZoom:40})); bindView();
  S.layers.forEach(L=>{ if(isVec(L)){ L._base=null; L.olLayer.changed(); } });
  if(S.layout) S.layout.center=null;
  applyBasemap(); renderCRSSelect(); resetHistory(); afterChange(); updateGrid(); if(typeof gpsUpdateTrack==='function'){ gpsSource.clear(); gpsUpdateTrack(); } toast('SRC do projeto: '+CRS_INFO[code].name); }
function autoZone(){ if(isLocal()) return null; const ll=toLL(map.getView().getCenter()); const z=Math.floor((ll[0]+180)/6)+1; const south=ll[1]<0; return 'EPSG:'+(south?31960+z:31954+z); }

/* ===================== Grade de coordenadas no mapa ===================== */
function geoStep(span){ const st=[1/3600,2/3600,5/3600,10/3600,15/3600,30/3600,1/60,2/60,5/60,10/60,15/60,30/60,1,2,5,10]; return st.find(s=>span/s<=8)||10; }
function updateGrid(){ const src=gridLayer.getSource(); src.clear(); if(!S.showGrid) return;
  const ex=map.getView().calculateExtent(map.getSize()); const w=ex[2]-ex[0]; const metric=!crsInfo().geo;
  let step=metric?niceStep(w/7):geoStep(w); if(S.gridSnap&&metric&&S.gridStep>0&&w/S.gridStep<=60) step=S.gridStep;
  const feats=[]; const fmt=v=>metric?nfi(v):dms(v);
  const res=map.getView().getResolution(), pad=14*res;
  for(let x=Math.ceil(ex[0]/step)*step;x<=ex[2];x+=step){ feats.push(new ol.Feature({geometry:new ol.geom.LineString([[x,ex[1]],[x,ex[3]]]),k:'l'})); feats.push(new ol.Feature({geometry:new ol.geom.Point([x,ex[3]-pad]),k:'t',t:(metric?'E ':'')+fmt(x)})); }
  for(let y=Math.ceil(ex[1]/step)*step;y<=ex[3];y+=step){ feats.push(new ol.Feature({geometry:new ol.geom.LineString([[ex[0],y],[ex[2],y]]),k:'l'})); feats.push(new ol.Feature({geometry:new ol.geom.Point([ex[0]+4*res,y]),k:'t',t:(metric?'N ':'')+fmt(y),a:'left'})); }
  src.addFeatures(feats); }

/* ===================== Status / escala ===================== */
const SCALES=[100,200,250,500,750,1000,1500,2000,2500,3000,4000,5000,7500,10000,15000,20000,25000,30000,40000,50000,75000,100000,150000,200000,250000,500000,1000000];
function currentScale(){ const v=map.getView(); return v.getResolution()*gpu(S.crs,v.getCenter())/(0.0254/96); }
function setScale(sc){ const v=map.getView(); v.setResolution(sc*(0.0254/96)/gpu(S.crs,v.getCenter())); }
function bindView(){ const v=map.getView(); v.on('change:resolution',()=>{ if(document.activeElement!==$('#scaleIn')) $('#scaleIn').value=nfi(currentScale()); }); $('#scaleIn').value=nfi(currentScale()); }
map.on('pointermove',e=>{ if(e.dragging) return; const c=e.coordinate; let h='';
  if(isMetric()) h=`E ${nf(c[0])}  N ${nf(c[1])}`; if(!isLocal()){ const ll=toLL(c); h+=`${h?'  <small>':''}${latTxt(ll[1])} ${lonTxt(ll[0])}${h?'</small>':''}`; }
  $('#coordOut').innerHTML=h; });
map.on('moveend',()=>{ updateGrid(); scheduleSave(); });

/* ===================== Painel de camadas ===================== */
function geomSummary(L){ const fs=L.source.getFeatures(); const c={P:0,L:0,A:0}; fs.forEach(f=>{ if(f.get('_kind')) return; const t=f.getGeometry()?.getType()||''; if(t.includes('Polygon')) c.A++; else if(t.includes('Line')) c.L++; else if(t.includes('Point')) c.P++; }); return c; }
function dominantType(L){ const c=geomSummary(L); if(c.A>=c.L&&c.A>=c.P&&c.A>0) return 'A'; if(c.L>=c.P&&c.L>0) return 'L'; if(c.P>0) return 'P'; return null; }
function renderLayers(){ const ul=$('#layerList'); if(!ul) return; ul.innerHTML=[...S.layers].reverse().map(L=>{
    const sw=isVec(L)?`<img class="swi" alt="" src="${symDataURL(L.style,dominantType(L)||'A',30,20)}">`:`<span class="sw" style="border-color:var(--dim);background:linear-gradient(135deg,#6b8f5e,#c9b98a)" title="Imagem raster"></span>`;
    const ct=isVec(L)?L.source.getFeatures().length:'img';
    return `<li data-id="${L.id}" class="${L.id===S.activeId?'active':''}"><input type="checkbox" ${L.visible?'checked':''} aria-label="Visível">${sw}<span class="nm" title="Duplo clique para renomear">${esc(L.name)}</span><span class="ct">${ct}</span></li>`; }).join('')||'<li style="cursor:default;color:var(--dim)">Nenhuma camada. Desenhe ou importe dados.</li>';
  renderStyleEditor(); }
$('#layerList').addEventListener('click',e=>{ const li=e.target.closest('li[data-id]'); if(!li) return; const L=getLayer(li.dataset.id);
  if(e.target.matches('input[type=checkbox]')){ L.visible=e.target.checked; L.olLayer.setVisible(L.visible); S.mapVersion++; refreshSnaps(); scheduleSave(); return; }
  if(S.activeId!==L.id){ S.activeId=L.id; renderLayers(); if(!$('#attr').hidden) renderAttrTable(); if(S.tool!=='select'&&I.draw&&['ponto','linha','poligono','retangulo','circulo','texto','cota'].includes(S.tool)) setTool(S.tool); } });
$('#layerList').addEventListener('dblclick',e=>{ const li=e.target.closest('li[data-id]'); if(!li) return; renameLayer(getLayer(li.dataset.id)); });
function renameLayer(L){ modal({title:'Renomear camada',body:`<div class="form"><label for="rnm">Nome</label><input type="text" id="rnm" value="${esc(L.name)}"></div>`,buttons:[{label:'Cancelar'},{label:'Salvar',primary:true,action:()=>{ L.name=$('#rnm').value.trim()||L.name; renderLayers(); S.mapVersion++; scheduleSave(); }}],onOpen:()=>{$('#rnm').select();}}); }
function renderStyleEditor(){ const sec=$('#styleSec'); const L=activeLayer(); if(!L){ sec.innerHTML='<h3>Estilo da camada</h3><p class="empty">Selecione uma camada.</p>'; return; }
  if(sec.dataset.for===L.id+':'+S.layers.length&&sec.contains(document.activeElement)) return; sec.dataset.for=L.id+':'+S.layers.length;
  if(!isVec(L)){ sec.innerHTML=`<h3>Imagem · ${esc(L.name)}</h3><div class="form"><label for="rOp">Opacidade</label><input type="range" id="rOp" min="0" max="1" step="0.05" value="${L.opacity}"><label>Renomear</label><button class="tb" data-act="renomear">Renomear camada</button></div><p class="note">A imagem fica salva junto com o projeto neste aparelho.</p>`;
    $('#rOp').oninput=e=>{ L.opacity=+e.target.value; L.olLayer.setOpacity(L.opacity); S.mapVersion++; scheduleSave(); }; return; }
  const st=L.style; const fields=fieldsOf(L);
  sec.innerHTML=`<h3>Estilo · ${esc(L.name)}</h3><div class="symhead"><img alt="" src="${symDataURL(st,dominantType(L)||'A',64,36)}"><button class="tb primary" data-act="simbologia">Simbologia completa…</button></div>${st.symMode==='categorizado'?`<p class="note">Cores por categoria do campo “${esc(st.catField)}”.</p>`:''}<div class="form">
   <label for="s_stroke">Contorno</label><div class="pair"><input type="color" id="s_stroke" data-k="stroke" value="${st.stroke}"><input type="number" data-k="width" min="0.5" max="12" step="0.5" value="${st.width}" title="Espessura (px)" aria-label="Espessura"></div>
   <label for="s_fill">Preenchimento</label><div class="pair"><input type="color" id="s_fill" data-k="fill" value="${st.fill}"><input type="number" data-k="fillOp" min="0" max="1" step="0.05" value="${st.fillOp}" title="Opacidade 0–1" aria-label="Opacidade do preenchimento"></div>
   <label for="s_dash">Tipo de linha</label><select id="s_dash" data-k="dash"><option value="solid">Contínua</option><option value="dash">Tracejada</option><option value="longdash">Traço longo</option><option value="dot">Pontilhada</option><option value="dashdot">Traço-ponto</option></select>
   <label for="s_fp">Padrão</label><select id="s_fp" data-k="fillPattern">${FILL_PATTERNS.map(([a,b])=>`<option value="${a}" ${a===st.fillPattern?'selected':''}>${b}</option>`).join('')}</select>
   <label for="s_psh">Ponto</label><div class="pair"><select id="s_psh" data-k="pointShape" style="width:62%">${POINT_SHAPES.map(([a,b])=>`<option value="${a}" ${a===st.pointShape?'selected':''}>${b}</option>`).join('')}</select><input type="number" id="s_ps" data-k="pointSize" min="2" max="30" value="${st.pointSize}" aria-label="Tamanho do ponto"></div>
   <label for="s_pf">Cor do ponto</label><input type="color" id="s_pf" data-k="pointFill" value="${st.pointFill||st.stroke}">
  </div>
  <div class="sub">Rótulos e cotas automáticas</div>
  <div class="form">
   <label class="chk full"><input type="checkbox" data-k="showVtx" ${st.showVtx?'checked':''}> Numerar vértices</label>
   <label for="s_pre">Prefixo / início</label><div class="pair"><input type="text" id="s_pre" data-k="vtxPrefix" value="${esc(st.vtxPrefix)}" style="width:60%"><input type="number" data-k="vtxStart" min="0" value="${st.vtxStart}" aria-label="Número inicial"></div>
   <label for="s_vc">Cor do vértice</label><input type="color" id="s_vc" data-k="vtxColor" value="${st.vtxColor}">
   <label class="chk full"><input type="checkbox" data-k="showDist" ${st.showDist?'checked':''}> Distâncias nos lados</label>
   <label class="chk"><input type="checkbox" data-k="showAz" ${st.showAz?'checked':''}> Ângulo</label><select data-k="azMode" aria-label="Tipo de ângulo"><option value="az">Azimute</option><option value="rumo">Rumo</option></select>
   <label class="chk"><input type="checkbox" data-k="showArea" ${st.showArea?'checked':''}> Área</label><select data-k="areaUnit" aria-label="Unidade de área"><option value="ha">hectares</option><option value="m2">m²</option></select>
   <label for="s_lf">Rótulo por campo</label><select id="s_lf" data-k="labelField"><option value="">— nenhum —</option>${fields.map(k=>`<option ${k===st.labelField?'selected':''}>${esc(k)}</option>`).join('')}</select>
   <label for="s_ls">Texto (px / cor)</label><div class="pair"><input type="number" id="s_ls" data-k="labelSize" min="7" max="28" value="${st.labelSize}"><input type="color" data-k="labelColor" value="${st.labelColor}" aria-label="Cor do texto"></div>
  </div>
  <div class="ltools" style="margin-top:10px"><button class="tb" data-act="renomear">Renomear</button><button class="tb" data-act="presetLimite">Padrão “limite de imóvel”</button></div>`;
  sec.querySelector('[data-k=dash]').value=st.dash; sec.querySelector('[data-k=azMode]').value=st.azMode; sec.querySelector('[data-k=areaUnit]').value=st.areaUnit; }
$('#styleSec').addEventListener('input',e=>{ const k=e.target.dataset.k; if(!k) return; const L=activeLayer(); if(!isVec(L)) return;
  let v=e.target.type==='checkbox'?e.target.checked:e.target.value; if(['width','fillOp','pointSize','vtxStart','labelSize'].includes(k)) v=+v; L.style[k]=v; styleChanged(L); if(k==='stroke') renderLayersListOnly(); });
function renderLayersListOnly(){ const f=document.activeElement; renderLayers(); if(f&&f.dataset&&f.dataset.k){ const el=$(`#styleSec [data-k="${f.dataset.k}"]`); el&&el.focus(); } }
function fieldsOf(L){ const s=new Set(); L.source.getFeatures().slice(0,500).forEach(f=>Object.keys(f.getProperties()).forEach(k=>{ if(k!=='geometry'&&!k.startsWith('_')) s.add(k); })); return [...s]; }

/* ===================== Painel da feição ===================== */
function featureRows(f,L){ const g=f.getGeometry(); const st=L?L.style:DEF_STYLE(); const parts=geomParts(g); if(!parts.length) return {rows:[],closed:false};
  const P=parts[0], c=P.c, n=c.length, rows=[]; let k=+st.vtxStart||1;
  for(let i=0;i<n;i++){ const j=P.closed?(i+1)%n:i+1; const r={name:vtxName(st.vtxPrefix?st:{vtxPrefix:'V-'},k++),c:c[i]}; if(j<n){ r.az=azim(c[i],c[j]); r.d=dist(c[i],c[j]); r.to=j; } rows.push(r); }
  rows.forEach(r=>{ if(r.to!==undefined) r.toName=rows[r.to].name; }); return {rows,closed:P.closed}; }
function coordCells(c){ if(isMetric()) return [nf(c[0]),nf(c[1])]; const ll=toLL(c); return [lonTxt(ll[0]),latTxt(ll[1])]; }
function renderFeaturePanel(){ const el=$('#featPanel'); if(!el) return; const f=selFeature();
  if(!f){ el.innerHTML=`<div class="empty">Nenhuma feição selecionada.<ol><li>Escolha a camada à esquerda.</li><li>Use a aba <b>Desenhar</b> para criar pontos, linhas e polígonos, ou <b>Arquivo › Importar</b>.</li><li>Clique numa feição com <b>Selecionar</b> para ver área, perímetro, tabela de vértices e gerar o memorial descritivo.</li></ol></div>`; return; }
  const L=layerOfFeature(f); const g=f.getGeometry(); const t=g.getType(); const kind=f.get('_kind');
  const tl=kind==='texto'?'Texto':kind==='cota'?'Cota':t.includes('Polygon')?'Polígono':t.includes('Line')?'Linha':'Ponto';
  let h=`<input class="fp-name" id="fpNome" value="${esc(kind==='texto'?f.get('texto'):f.get('nome')||'')}" placeholder="${kind==='texto'?'Texto':'Nome da feição'}" aria-label="Nome"><div style="margin-top:6px;display:flex;gap:6px;align-items:center"><span class="tag">${tl}</span><span class="note" style="margin:0">${esc(L?L.name:'')}</span></div>`;
  if(kind==='texto'){ h+=`<div class="form" style="margin-top:10px"><label for="fpTam">Tamanho (px)</label><input type="number" id="fpTam" min="6" max="72" value="${+f.get('_tam')||14}"><label for="fpRot">Rotação (°)</label><input type="number" id="fpRot" step="1" value="${+f.get('_rot')||0}"><label class="chk full"><input type="checkbox" id="fpBold" ${f.get('_negrito')?'checked':''}> Negrito</label><label for="fpCor">Cor</label><input type="color" id="fpCor" value="${f.get('_cor')||L.style.labelColor}"></div>`; }
  else if(t.includes('Polygon')){ const A=gArea(g); h+=`<div class="metrics"><div class="metric"><span>Área</span><b>${nf(A/1e4,4)} ha</b></div><div class="metric"><span>Área</span><b>${nf(A)} m²</b></div><div class="metric"><span>Perímetro</span><b>${nf(gLength(g))} m</b></div><div class="metric"><span>Vértices</span><b>${vertexCoords(g).length}</b></div></div>`; }
  else if(t.includes('Line')){ h+=`<div class="metrics"><div class="metric"><span>Comprimento</span><b>${nf(gLength(g))} m</b></div><div class="metric"><span>Vértices</span><b>${vertexCoords(g).length}</b></div></div>`; }
  else { const c=t==='Point'?g.getCoordinates():g.getFirstCoordinate(); const cc=coordCells(c); h+=`<div class="metrics"><div class="metric"><span>${isMetric()?'E':'Longitude'}</span><b style="font-size:13px">${cc[0]}</b></div><div class="metric"><span>${isMetric()?'N':'Latitude'}</span><b style="font-size:13px">${cc[1]}</b></div></div>`; }
  if(!kind&&!t.includes('Point')){ const {rows}=featureRows(f,L); const lim=rows.slice(0,400);
    h+=`<div class="sub">Tabela de vértices</div><div class="vwrap"><table class="vtab"><thead><tr><th>Vért.</th><th>${isMetric()?'E (m)':'Long.'}</th><th>${isMetric()?'N (m)':'Lat.'}</th><th>${L.style.azMode==='rumo'?'Rumo':'Azimute'}</th><th>Dist. (m)</th></tr></thead><tbody>${lim.map(r=>{ const cc=coordCells(r.c); return `<tr><td>${esc(r.name)}</td><td>${cc[0]}</td><td>${cc[1]}</td><td>${r.az!==undefined?azTxt(r.az,L.style.azMode):''}</td><td>${r.d!==undefined?nf(r.d):''}</td></tr>`; }).join('')}</tbody></table></div>${rows.length>400?'<p class="note">Mostrando 400 vértices.</p>':''}`; }
  h+=`<div class="acts">${t.includes('Polygon')&&!kind?'<button class="tb primary" data-act="memorial" style="grid-column:1/-1">Gerar memorial descritivo</button>':''}
   ${!kind&&!t.includes('Point')?'<button class="tb" data-act="copiarvert">Copiar vértices</button>':''}
   ${!kind?'<button class="tb" data-act="estilofeicao">Estilo desta feição</button>':''}
   <button class="tb" data-act="zoomfeat">Aproximar</button>
   ${!kind&&!t.includes('Point')?'<button class="tb" data-act="inverter">Inverter sentido</button>':''}
   ${t.includes('Polygon')&&!kind?'<button class="tb" data-act="usarquadro">Usar no layout</button>':''}
   <button class="tb" data-act="duplicar">Duplicar</button>
   <button class="tb danger" data-act="excluir">Excluir</button></div>`;
  el.innerHTML=h; }
$('#featPanel').addEventListener('input',e=>{ const f=selFeature(); if(!f) return; const id=e.target.id;
  if(id==='fpNome'){ if(f.get('_kind')==='texto') f.set('texto',e.target.value); else f.set('nome',e.target.value); }
  else if(id==='fpTam') f.set('_tam',+e.target.value); else if(id==='fpRot') f.set('_rot',+e.target.value); else if(id==='fpBold') f.set('_negrito',e.target.checked); else if(id==='fpCor') f.set('_cor',e.target.value);
  clearTimeout(renderFeaturePanel._t); renderFeaturePanel._t=setTimeout(()=>{ commit(); },700); });
function reverseFeature(f){ const g=f.getGeometry(), t=g.getType();
  if(t==='LineString') g.setCoordinates(g.getCoordinates().reverse());
  else if(t==='Polygon') g.setCoordinates(g.getCoordinates().map(r=>{ const o=r.slice(0,-1); const rr=[o[0],...o.slice(1).reverse()]; rr.push(rr[0]); return rr; }));
  else if(t==='MultiLineString') g.setCoordinates(g.getCoordinates().map(l=>l.reverse()));
  else if(t==='MultiPolygon') g.setCoordinates(g.getCoordinates().map(p=>p.map(r=>{ const o=r.slice(0,-1); const rr=[o[0],...o.slice(1).reverse()]; rr.push(rr[0]); return rr; }))); commit(); }
function duplicateSelected(){ const f=selFeature(); if(!f) return toast('Selecione uma feição para duplicar.'); const L=layerOfFeature(f); const c=f.clone(); c.set('_fid',uid()); if(c.get('nome')) c.set('nome',c.get('nome')+' (cópia)');
  const res=map.getView().getResolution(); c.getGeometry().translate(20*res,-20*res); L.source.addFeature(c); commit(); selectFeature(c); toast('Cópia criada. Use “Mover feição” para posicioná-la.'); }
function deleteSelected(){ const fs=I.select.getFeatures().getArray().slice(); if(!fs.length) return toast('Selecione uma feição para excluir.'); fs.forEach(f=>{ const L=layerOfFeature(f); L&&L.source.removeFeature(f); }); I.select.getFeatures().clear(); commit(); toast(fs.length>1?`${fs.length} feições excluídas.`:'Feição excluída. Ctrl+Z desfaz.'); }

/* ===================== Memorial descritivo ===================== */
function memorialText(f,startIdx,clockwise){ const L=layerOfFeature(f); const {rows}=featureRows(f,L); if(rows.length<3) return 'Polígono inválido.';
  let pts=rows.map(r=>({name:r.name,c:r.c}));
  let s2=0; for(let i=0;i<pts.length;i++){ const a=pts[i].c,b=pts[(i+1)%pts.length].c; const A=isMetric()?a:toLL(a), B=isMetric()?b:toLL(b); s2+=A[0]*B[1]-B[0]*A[1]; }
  if(clockwise&&s2>0) pts=[pts[0],...pts.slice(1).reverse()];
  const si=pts.findIndex(p=>p.name===startIdx); if(si>0) pts=pts.slice(si).concat(pts.slice(0,si));
  const g=f.getGeometry(); const A=gArea(g), P=gLength(g); const i=crsInfo(); const nome=f.get('nome')||'Imóvel';
  const cstr=c=>{ if(isMetric()) return `N ${nf(c[1])} m e E ${nf(c[0])} m`; const ll=toLL(c); return `latitude ${latTxt(ll[1])} e longitude ${lonTxt(ll[0])}`; };
  let t=`MEMORIAL DESCRITIVO\n\nImóvel: ${nome}\nÁrea: ${nf(A/1e4,4)} ha (${nf(A)} m²)\nPerímetro: ${nf(P)} m\nSistema de referência: ${crsDesc(S.crs)}\n\n`;
  t+=`Inicia-se a descrição deste perímetro no vértice ${pts[0].name}, de coordenadas ${cstr(pts[0].c)}; `;
  for(let k=0;k<pts.length;k++){ const a=pts[k], b=pts[(k+1)%pts.length]; const last=k===pts.length-1;
    t+=`deste, segue com azimute de ${dms(azim(a.c,b.c))} e distância de ${nf(dist(a.c,b.c))} m até o vértice ${b.name}${last?', ponto inicial da descrição deste perímetro.':`, de coordenadas ${cstr(b.c)}; `}`; }
  if(i.utm) t+=`\n\nTodas as coordenadas aqui descritas estão georreferenciadas ao Sistema Geodésico Brasileiro e encontram-se representadas no Sistema UTM, referenciadas ao Meridiano Central ${-183+6*i.utm}° (fuso ${i.utm}${i.south?'S':'N'}), tendo como datum o ${i.datum==='SIRGAS2000'?'SIRGAS 2000':i.datum}. Todos os azimutes, distâncias, área e perímetro foram calculados no plano de projeção UTM.`;
  else if(i.local) t+='\n\nCoordenadas em sistema topográfico local, sem georreferenciamento.';
  else t+='\n\nCoordenadas geográficas. Distâncias e área calculadas sobre o elipsoide/esfera de referência.';
  return t; }
function openMemorial(){ const f=selFeature(); if(!f||!f.getGeometry().getType().includes('Polygon')) return toast('Selecione um polígono.'); const L=layerOfFeature(f); const {rows}=featureRows(f,L);
  const m=modal({title:'Memorial descritivo',wide:true,body:`<div class="form" style="grid-template-columns:auto 1fr auto 1fr;margin-bottom:10px"><label for="memStart">Iniciar no vértice</label><select id="memStart">${rows.map(r=>`<option>${esc(r.name)}</option>`).join('')}</select><label class="chk" style="grid-column:span 2"><input type="checkbox" id="memCw" checked> Percorrer em sentido horário</label></div><textarea id="memTxt" rows="16" readonly></textarea><p class="note">Revise os nomes dos vértices e confrontantes antes de protocolar. Se a peça for para o SIGEF/INCRA, a área oficial é calculada pelo próprio sistema no Sistema Geodésico Local, e pode diferir ligeiramente da área no plano UTM.</p>`,
    buttons:[{label:'Fechar'},{label:'Baixar .txt',keep:true,action:()=>download(new Blob([$('#memTxt').value],{type:'text/plain;charset=utf-8'}),'memorial_'+safeName(f.get('nome'))+'.txt')},{label:'Copiar texto',primary:true,keep:true,action:()=>copyText($('#memTxt').value)}],
    onOpen:()=>{ const up=()=>$('#memTxt').value=memorialText(f,$('#memStart').value,$('#memCw').checked); $('#memStart').onchange=up; $('#memCw').onchange=up; up(); }}); }

/* ===================== Tabela de atributos ===================== */
function renderAttrTable(){ const L=activeLayer(); const w=$('#attrWrap'); if(!isVec(L)){ w.innerHTML='<p class="empty" style="padding:12px">Selecione uma camada vetorial.</p>'; return; }
  $('#attrTitle').textContent='Atributos · '+L.name; const fs=L.source.getFeatures().slice(0,1500); const fields=fieldsOf(L); if(!fields.includes('nome')) fields.unshift('nome');
  w.innerHTML=`<table><thead><tr><th>#</th>${fields.map(k=>`<th>${esc(k)}</th>`).join('')}<th>Área (ha)</th><th>Perím./Compr. (m)</th></tr></thead><tbody>${fs.map((f,i)=>{ const g=f.getGeometry(); const t=g?g.getType():''; const ar=t.includes('Polygon')?nf(gArea(g)/1e4,4):''; const ln=t.includes('Polygon')||t.includes('Line')?nf(gLength(g)):'';
    return `<tr data-fid="${f.get('_fid')}"><td class="num">${i+1}</td>${fields.map(k=>`<td><input data-k="${esc(k)}" value="${esc(f.get(k)??'')}" aria-label="${esc(k)}"></td>`).join('')}<td class="num">${ar}</td><td class="num">${ln}</td></tr>`; }).join('')}</tbody></table>${L.source.getFeatures().length>1500?'<p class="note" style="padding:6px 10px">Mostrando as primeiras 1.500 feições.</p>':''}`;
  highlightAttrRow(); }
function highlightAttrRow(){ if($('#attr').hidden) return; const f=selFeature(); const fid=f?f.get('_fid'):null; $$('#attrWrap tr[data-fid]').forEach(tr=>tr.classList.toggle('sel',tr.dataset.fid===fid)); }
$('#attrWrap').addEventListener('change',e=>{ const inp=e.target.closest('input[data-k]'); if(!inp) return; const fid=inp.closest('tr').dataset.fid; const r=findFeatureByFid(fid); if(!r) return; const v=inp.value; const n=parseNum(v); r.f.set(inp.dataset.k,v!==''&&!isNaN(n)&&/^[-\d.,\s]+$/.test(v)?n:v); commit(); });
$('#attrWrap').addEventListener('click',e=>{ const tr=e.target.closest('tr[data-fid]'); if(!tr||e.target.matches('input')) return; const r=findFeatureByFid(tr.dataset.fid); if(r) selectFeature(r.f,true); });

/* ===================== Modal ===================== */
function modal({title,body,buttons=[{label:'OK',primary:true}],onOpen,wide}){ const bg=document.createElement('div'); bg.className='modal-bg';
  bg.innerHTML=`<div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h2>${esc(title)}</h2><div class="body">${body}</div><div class="foot">${buttons.map((b,i)=>`<button class="tb ${b.primary?'primary':''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
  document.body.appendChild(bg); const close=()=>{ bg.remove(); document.removeEventListener('keydown',kd,true); };
  const kd=ev=>{ if(ev.key==='Escape'){ ev.stopPropagation(); const c=buttons.find(b=>!b.primary&&!b.keep&&!b.noEsc); c&&c.action&&c.action(); close(); } };
  document.addEventListener('keydown',kd,true);
  bg.querySelector('.foot').addEventListener('click',async e=>{ const b=e.target.closest('[data-i]'); if(!b) return; const def=buttons[+b.dataset.i]; let r; if(def.action) r=await def.action(bg); if(r===false||def.keep) return; close(); });
  if(onOpen) onOpen(bg); else { const f=bg.querySelector('input,select,textarea'); f&&f.focus(); } return {el:bg,close}; }
function askText(L,f){ modal({title:'Inserir texto',body:`<div class="form"><label for="txIn">Texto</label><input type="text" id="txIn" placeholder="ex.: Sede, Córrego Bonito"><label for="txSz">Tamanho (px)</label><input type="number" id="txSz" value="14" min="6" max="72"><label class="chk full"><input type="checkbox" id="txB"> Negrito</label></div>`,
  buttons:[{label:'Cancelar',action:()=>{ L.source.removeFeature(f); }},{label:'Inserir',primary:true,action:()=>{ const v=$('#txIn').value.trim(); if(!v){ L.source.removeFeature(f); return; } f.set('texto',v); f.set('_tam',+$('#txSz').value||14); f.set('_negrito',$('#txB').checked); commit(); }}],onOpen:()=>{ $('#txIn').focus(); $('#txIn').onkeydown=e=>{ if(e.key==='Enter') $('.modal .foot .primary').click(); }; }}); }
function crsOptions(sel,all=true){ const groups={'Principais':[],'SAD69 (dados antigos)':[],'WGS 84 UTM':[]}; Object.values(CRS_INFO).forEach(i=>{ if(i.main) groups['Principais'].push(i); else if(i.datum==='SAD69') groups['SAD69 (dados antigos)'].push(i); else groups['WGS 84 UTM'].push(i); });
  return Object.entries(groups).filter(([k])=>all||k==='Principais').map(([k,arr])=>`<optgroup label="${k}">${arr.map(i=>`<option value="${i.code}" ${i.code===sel?'selected':''}>${esc(i.name)}${i.code.startsWith('EPSG')?' · '+i.code:''}</option>`).join('')}</optgroup>`).join(''); }
function askCRS(msg,def){ return new Promise(res=>{ modal({title:'Sistema de coordenadas',body:`<p style="margin-top:0">${esc(msg)}</p><select id="acrs" class="inp">${crsOptions(def||S.crs)}</select>`,buttons:[{label:'Cancelar',action:()=>res(null)},{label:'Usar este SRC',primary:true,action:()=>res($('#acrs').value)}]}); }); }
