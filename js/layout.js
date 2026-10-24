'use strict';
/* ===================== Compositor de impressão ===================== */
const PAGES={A4:[297,210],A3:[420,297],A2:[594,420],A1:[841,594],A0:[1189,841]};
const EL_NAMES={mapa:'Mapa',titulo:'Título',norte:'Indicação do norte',escala:'Escala gráfica e numérica',legenda:'Legenda',coords:'Quadro de coordenadas',notas:'Notas',selo:'Carimbo (selo)',logo:'Logotipo'};
function defaultEls(){ return [
  {id:'mapa',type:'mapa',vis:true,p:{border:true,grid:true,gridType:'linhas',gridInt:0,gridLabels:true,gridColor:'#3b3b3b'}},
  {id:'titulo',type:'titulo',vis:true,p:{text:'PLANTA TOPOGRÁFICA',sub:'Levantamento planimétrico georreferenciado',size:15,border:true}},
  {id:'norte',type:'norte',vis:true,p:{style:'seta',conv:true,border:true}},
  {id:'escala',type:'escala',vis:true,p:{bar:true,text:true,border:true}},
  {id:'legenda',type:'legenda',vis:true,p:{title:'LEGENDA',credit:true,border:true}},
  {id:'coords',type:'coords',vis:true,p:{title:'QUADRO DE COORDENADAS',border:true}},
  {id:'notas',type:'notas',vis:true,p:{title:'NOTAS',text:'',auto:true,size:6.5,border:true}},
  {id:'selo',type:'selo',vis:true,p:{conteudo:'PLANTA TOPOGRÁFICA',imovel:'',municipio:'',proprietario:'',area:'',perimetro:'',resp:'',registro:'',data:todayBR(),folha:'01/01',border:true}},
  {id:'logo',type:'logo',vis:false,p:{src:null,border:false}}]; }
function newLayout(){ const L={page:'A3',orient:'paisagem',scale:5000,dpi:200,center:null,refFid:null,margins:{l:20,t:10,r:10,b:10},els:defaultEls()}; return L; }
function mergeEls(els){ const d=defaultEls(); return d.map(def=>{ const o=(els||[]).find(e=>e.id===def.id); return o?Object.assign({},def,o,{p:Object.assign({},def.p,o.p)}):def; }); }
function LY(){ if(!S.layout){ S.layout=newLayout(); arrange(); } if(!S.layout.els[0].w) arrange(); return S.layout; }
const elById=id=>LY().els.find(e=>e.id===id);
function pageDims(){ const Lo=S.layout||newLayout(); const [a,b]=PAGES[Lo.page]; return Lo.orient==='paisagem'?[a,b]:[b,a]; }
function arrange(){ const Lo=S.layout; const [W,H]=pageDims(), m=Lo.margins; const x0=m.l,y0=m.t,x1=W-m.r,y1=H-m.b, iw=x1-x0, ih=y1-y0; const set=(id,x,y,w,h)=>Object.assign(Lo.els.find(e=>e.id===id),{x,y,w,h});
  const f=Math.sqrt(W*H/(420*297));
  if(W>=H){ const sw=Math.min(125*f,Math.max(78,iw*0.27)), sx=x1-sw; set('mapa',x0,y0,iw-sw,ih);
    let y=y0; const tH=24*f, nH=32*f; set('titulo',sx,y,sw,tH); y+=tH; set('norte',sx,y,sw*0.36,nH); set('escala',sx+sw*0.36,y,sw*0.64,nH); y+=nH;
    const seloH=Math.min(66*f,ih*0.34), notasH=22*f, legH=Math.max(28,Math.min(46*f,ih*0.2)); set('legenda',sx,y,sw,legH); y+=legH;
    const rest=y1-seloH-notasH-y; set('coords',sx,y,sw,Math.max(rest,12)); set('notas',sx,y1-seloH-notasH,sw,notasH); set('selo',sx,y1-seloH,sw,seloH); set('logo',sx+sw-30,y0+2,27,20); }
  else { const mh=ih*0.63; set('mapa',x0,y0,iw,mh); const by=y0+mh, bh=ih-mh; const cA=iw*0.27,cB=iw*0.33,cC=iw-cA-cB;
    set('norte',x0,by,cA,bh*0.45); set('escala',x0,by+bh*0.45,cA,bh*0.55); set('legenda',x0+cA,by,cB,bh*0.5); set('notas',x0+cA,by+bh*0.5,cB,bh*0.5);
    set('titulo',x0+cA+cB,by,cC,bh*0.26); set('selo',x0+cA+cB,by+bh*0.26,cC,bh*0.74); set('coords',x1-80,y0+4,76,Math.min(72,mh*0.45)); set('logo',x0+4,y0+4,27,18); } }
function layCenter(){ const Lo=LY(); if(!Lo.center) Lo.center=map.getView().getCenter(); return Lo.center; }
function refFeature(){ const Lo=LY(); let r=Lo.refFid?findFeatureByFid(Lo.refFid):null; if(r&&r.L.visible) return r;
  for(const L of [...S.layers].reverse()){ if(!isVec(L)||!L.visible) continue; const f=L.source.getFeatures().find(x=>!x.get('_kind')&&x.getGeometry()?.getType().includes('Polygon')); if(f) return {f,L}; } return null; }
function notesText(){ const i=crsInfo(); const cr=basemapCredit(); const n=[]; n.push('Sistema de referência: '+crsDesc(S.crs)+'.');
  n.push(i.utm?'Distâncias, azimutes, área e perímetro calculados no plano de projeção UTM.':i.local?'Coordenadas em sistema topográfico local.':'Distâncias e áreas calculadas sobre o elipsoide de referência.');
  if(cr) n.push('Imagem de fundo: '+cr+'.'); n.push('Prancha gerada no GeoPrancha em '+todayBR()+'.'); return n.map((t,k)=>`${k+1}. ${t}`).join('\n'); }

/* Primitivas de desenho (unidades em mm, k = px por mm) */
const UIF='Barlow,"Segoe UI",Arial,sans-serif', MONOF='"IBM Plex Mono",Consolas,"Courier New",monospace';
function setFont(ctx,k,pt,w=500,mono=false,it=false){ ctx.font=`${it?'italic ':''}${w} ${Math.max(1,pt*0.3528*k)}px ${mono?MONOF:UIF}`; }
function txt(ctx,k,s,x,y,pt,o={}){ setFont(ctx,k,pt,o.w||500,o.mono,o.it); ctx.textAlign=o.align||'left'; ctx.textBaseline=o.base||'alphabetic';
  if(o.halo){ ctx.lineJoin='round'; ctx.strokeStyle='rgba(255,255,255,.92)'; ctx.lineWidth=0.7*k; ctx.strokeText(s,x*k,y*k); } ctx.fillStyle=o.color||'#111'; ctx.fillText(s,x*k,y*k); }
function tw(ctx,k,s,pt,w=500,mono=false){ setFont(ctx,k,pt,w,mono); return ctx.measureText(s).width/k; }
function fit(ctx,k,s,pt,w,maxW,mono){ s=String(s??''); if(tw(ctx,k,s,pt,w,mono)<=maxW) return s; while(s.length>1&&tw(ctx,k,s+'…',pt,w,mono)>maxW) s=s.slice(0,-1); return s+'…'; }
function wrapLines(ctx,k,text,pt,w,maxW){ const out=[]; String(text||'').split('\n').forEach(par=>{ const words=par.split(/\s+/); let line=''; words.forEach(wd=>{ const t=line?line+' '+wd:wd; if(tw(ctx,k,t,pt,w)>maxW&&line){ out.push(line); line=wd; } else line=t; }); out.push(line); }); return out; }
function rectPath(ctx,k,x,y,w,h){ ctx.beginPath(); ctx.rect(x*k,y*k,w*k,h*k); }
function frame(ctx,k,e,fill=true,lw=0.3){ if(fill){ ctx.fillStyle='#ffffff'; ctx.fillRect(e.x*k,e.y*k,e.w*k,e.h*k); } if(e.p.border){ ctx.strokeStyle='#111'; ctx.lineWidth=lw*k; ctx.strokeRect(e.x*k,e.y*k,e.w*k,e.h*k); } }
function poly(ctx,k,pts,fill,stroke,lw=0.25){ ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p[0]*k,p[1]*k):ctx.moveTo(p[0]*k,p[1]*k)); ctx.closePath(); if(fill){ ctx.fillStyle=fill; ctx.fill(); } if(stroke){ ctx.strokeStyle=stroke; ctx.lineWidth=lw*k; ctx.lineJoin='miter'; ctx.stroke(); } }
function niceFloor(x){ const p=Math.pow(10,Math.floor(Math.log10(x))); const f=x/p; return (f>=5?5:f>=2.5?2.5:f>=2?2:1)*p; }

const DRAW={
  mapa(ctx,k,e,img){ ctx.save(); rectPath(ctx,k,e.x,e.y,e.w,e.h); ctx.clip();
    if(img){ const o=LS.panOff||[0,0]; ctx.drawImage(img,(e.x+o[0])*k,(e.y+o[1])*k,e.w*k,e.h*k); } else { ctx.fillStyle='#eef1f0'; ctx.fillRect(e.x*k,e.y*k,e.w*k,e.h*k); txt(ctx,k,'Gerando mapa…',e.x+e.w/2,e.y+e.h/2,10,{align:'center',color:'#777'}); }
    if(e.p.grid&&!LS.panOff) drawGrid(ctx,k,e); ctx.restore();
    if(e.p.border){ ctx.strokeStyle='#111'; ctx.lineWidth=0.5*k; ctx.strokeRect(e.x*k,e.y*k,e.w*k,e.h*k); } },
  titulo(ctx,k,e){ frame(ctx,k,e); const p=e.p; const sz=+p.size||14; const lines=wrapLines(ctx,k,p.text,sz,700,e.w-6); const sub=p.sub?wrapLines(ctx,k,p.sub,sz*0.52,500,e.w-6):[];
    const lh=sz*0.3528*1.15, sh=sz*0.52*0.3528*1.3; const tot=lines.length*lh+(sub.length?1.5+sub.length*sh:0); let y=e.y+(e.h-tot)/2;
    lines.forEach(l=>{ txt(ctx,k,l,e.x+e.w/2,y,sz,{w:700,align:'center',base:'top'}); y+=lh; }); y+=1.5; sub.forEach(l=>{ txt(ctx,k,l,e.x+e.w/2,y,sz*0.52,{align:'center',base:'top',color:'#333'}); y+=sh; }); },
  norte(ctx,k,e){ frame(ctx,k,e); const i=crsInfo(); const conv=e.p.conv&&i.utm; const top=e.y+2.5, bot=e.y+e.h-(conv?5.5:2.5); const cx=e.x+e.w/2; const st=e.p.style;
    if(st==='rosa'){ const R=Math.max(3,Math.min(e.w,bot-top)/2-4); const cy=(top+bot)/2;
      ctx.beginPath(); ctx.arc(cx*k,cy*k,R*0.62*k,0,Math.PI*2); ctx.strokeStyle='#111'; ctx.lineWidth=0.2*k; ctx.stroke();
      [45,135,225,315,0,90,180,270].forEach(a=>{ const card=a%90===0; const len=card?R:R*0.6, r0=R*0.15; const P=[cx+Math.sin(a*RAD)*len,cy-Math.cos(a*RAD)*len]; const B1=[cx+Math.sin((a-45)*RAD)*r0,cy-Math.cos((a-45)*RAD)*r0], B2=[cx+Math.sin((a+45)*RAD)*r0,cy-Math.cos((a+45)*RAD)*r0];
        poly(ctx,k,[[cx,cy],P,B1],'#111','#111',0.2); poly(ctx,k,[[cx,cy],P,B2],'#fff','#111',0.2); });
      [['N',0],['L',90],['S',180],['O',270]].forEach(([l,a])=>txt(ctx,k,l,cx+Math.sin(a*RAD)*(R+2.3),cy-Math.cos(a*RAD)*(R+2.3),a?6.5:8,{w:700,align:'center',base:'middle'})); }
    else { txt(ctx,k,'N',cx,top,st==='simples'?11:10,{w:700,align:'center',base:'top'}); const t=top+5.2, ah=Math.max(3,bot-t), aw=Math.min(ah*0.5,e.w*0.42);
      if(st==='simples'){ poly(ctx,k,[[cx,t],[cx+aw/2,bot],[cx-aw/2,bot]],'#111'); }
      else { const nt=[cx,bot-ah*0.3]; poly(ctx,k,[[cx,t],[cx-aw/2,bot],nt],'#111','#111',0.25); poly(ctx,k,[[cx,t],nt,[cx+aw/2,bot]],'#fff','#111',0.25); } }
    if(conv){ const ll=toLL(layCenter()); const cm=-183+6*i.utm; const g=Math.atan(Math.tan((ll[0]-cm)*RAD)*Math.sin(ll[1]*RAD))/RAD; txt(ctx,k,fit(ctx,k,`NQ · conv. meridiana ${g<0?'−':''}${dms(Math.abs(g))}`,4.6,500,e.w-2),cx,e.y+e.h-1.6,4.6,{align:'center',color:'#333'}); } },
  escala(ctx,k,e){ frame(ctx,k,e); const sc=LY().scale; const cx=e.x+e.w/2; let y=e.y+e.h/2-(e.p.bar&&e.p.text?6:e.p.bar?3:1.5);
    if(e.p.text){ txt(ctx,k,'ESCALA 1:'+nfi(sc),cx,y,Math.min(10,e.w*0.11),{w:700,align:'center',base:'top'}); y+=5.5; }
    if(e.p.bar){ const g=sc/1000, maxBar=e.w*0.78; const step=niceFloor(maxBar*g/4); const bm=step*4/g; const bx=cx-bm/2, bh=1.5; y+=0.6;
      for(let s=0;s<4;s++){ ctx.fillStyle=s%2?'#fff':'#111'; ctx.fillRect((bx+s*bm/4)*k,y*k,bm/4*k,bh*k); } ctx.strokeStyle='#111'; ctx.lineWidth=0.2*k; ctx.strokeRect(bx*k,y*k,bm*k,bh*k);
      const km=step*4>=2000; const fmtv=v=>{ const x=km?v/1000:v; return Number.isInteger(x)?nfi(x):nf(x,x<10?1:0); };
      for(let s=0;s<=4;s++) txt(ctx,k,fmtv(step*s),bx+s*bm/4,y+bh+0.8,5.2,{align:'center',base:'top'});
      txt(ctx,k,km?'quilômetros':'metros',cx,y+bh+3.6,4.8,{align:'center',base:'top',color:'#444'}); } },
  legenda(ctx,k,e){ frame(ctx,k,e); txt(ctx,k,e.p.title||'LEGENDA',e.x+3,e.y+2.8,7.5,{w:700,base:'top'}); const items=legendItems();
    const credit=e.p.credit?basemapCredit():''; const bottom=e.y+e.h-(credit?5:2); const rowH=5; const y0=e.y+8.2; const perCol=Math.max(1,Math.floor((bottom-y0)/rowH)); const cols=Math.min(3,Math.ceil(items.length/perCol)); const cw=(e.w-4)/Math.max(1,cols);
    items.forEach((it,i)=>{ const col=Math.floor(i/perCol), row=i%perCol; if(col>=3) return; const x=e.x+3+col*cw+(it.indent?2.5:0), y=y0+row*rowH; const sw=7.5, sh=3.6; const avail=cw-sw-3-(it.indent?2.5:0);
      if(it.head){ txt(ctx,k,fit(ctx,k,it.head,6.6,700,cw-2),x,y+sh/2,6.6,{w:700,base:'middle'}); return; }
      if(it.vtx){ ctx.beginPath(); ctx.arc((x+sw/2)*k,(y+sh/2)*k,1.1*k,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill(); ctx.strokeStyle=it.vtx.style.vtxColor; ctx.lineWidth=0.45*k; ctx.stroke(); txt(ctx,k,fit(ctx,k,'Vértice ('+vtxName(it.vtx.style,1)+')',6.8,500,avail),x+sw+2,y+sh/2,6.8,{base:'middle'}); return; }
      drawSym(ctx,x*k,y*k,sw*k,sh*k,it.sym,it.gc,k); txt(ctx,k,fit(ctx,k,it.label,6.8,500,avail),x+sw+2,y+sh/2,6.8,{base:'middle'}); });
    if(!items.length) txt(ctx,k,'Sem camadas visíveis.',e.x+3,y0,6.5,{base:'top',color:'#777'});
    if(credit) txt(ctx,k,fit(ctx,k,'Fundo: '+credit,4.8,500,e.w-6,false),e.x+3,e.y+e.h-1.6,4.8,{it:true,color:'#555'}); },
  coords(ctx,k,e){ frame(ctx,k,e); const r=refFeature(); txt(ctx,k,fit(ctx,k,e.p.title||'QUADRO DE COORDENADAS',7,700,e.w-4),e.x+e.w/2,e.y+2.4,7,{w:700,align:'center',base:'top'});
    if(!r){ txt(ctx,k,'Selecione um polígono no mapa e use “Usar no layout”.',e.x+e.w/2,e.y+e.h/2,5.5,{align:'center',color:'#777'}); return; }
    const {rows}=featureRows(r.f,r.L); const metric=isMetric(); const heads=metric?['Vértice','E (m)','N (m)',r.L.style.azMode==='rumo'?'Rumo':'Azimute','Dist. (m)']:['Vértice','Longitude','Latitude','Azimute','Dist. (m)'];
    const wf=metric?[.15,.22,.25,.21,.17]:[.13,.25,.25,.2,.17]; const top=e.y+6.6, foot=4.6; const avail=e.h-(top-e.y)-foot-1; let rh=Math.min(3.8,Math.max(2.5,avail/(rows.length+1))); let maxR=Math.floor(avail/rh)-1; const shown=rows.length>maxR?rows.slice(0,Math.max(0,maxR-1)):rows;
    const pt=Math.min(6.2,rh*0.62/0.3528); const iw=e.w-3, x0=e.x+1.5; const cx=[]; let acc=x0; wf.forEach(f=>{ cx.push(acc); acc+=f*iw; }); cx.push(x0+iw);
    ctx.fillStyle='#e8ebea'; ctx.fillRect(x0*k,top*k,iw*k,rh*k);
    heads.forEach((h,i)=>txt(ctx,k,fit(ctx,k,h,pt,700,cx[i+1]-cx[i]-0.6),(cx[i]+cx[i+1])/2,top+rh/2,pt,{w:700,align:'center',base:'middle'}));
    shown.forEach((rw,j)=>{ const y=top+rh*(j+1); const cc=coordCells(rw.c); const vals=[rw.name,cc[0],cc[1],rw.az!==undefined?azTxt(rw.az,r.L.style.azMode):'—',rw.d!==undefined?nf(rw.d):'—'];
      if(j%2) { ctx.fillStyle='#f6f7f7'; ctx.fillRect(x0*k,y*k,iw*k,rh*k); } vals.forEach((v,i)=>txt(ctx,k,fit(ctx,k,v,pt,i?400:600,cx[i+1]-cx[i]-0.6,i>0),(cx[i]+cx[i+1])/2,y+rh/2,pt,{w:i?400:600,mono:i>0,align:'center',base:'middle'})); });
    let yEnd=top+rh*(shown.length+1); if(shown.length<rows.length){ txt(ctx,k,`… e mais ${rows.length-shown.length} vértice(s). Aumente o quadro ou exporte o CSV.`,e.x+e.w/2,yEnd+rh/2,pt*0.9,{align:'center',base:'middle',color:'#555',it:true}); yEnd+=rh; }
    ctx.strokeStyle='#555'; ctx.lineWidth=0.12*k; ctx.strokeRect(x0*k,top*k,iw*k,(yEnd-top)*k); cx.slice(1,-1).forEach(x=>{ ctx.beginPath(); ctx.moveTo(x*k,top*k); ctx.lineTo(x*k,yEnd*k); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(x0*k,(top+rh)*k); ctx.lineTo((x0+iw)*k,(top+rh)*k); ctx.stroke();
    const g=r.f.getGeometry(); txt(ctx,k,`Área ${nf(gArea(g)/1e4,4)} ha (${nf(gArea(g))} m²) · Perímetro ${nf(gLength(g))} m`,e.x+e.w/2,e.y+e.h-2,5.8,{w:600,align:'center'}); },
  notas(ctx,k,e){ frame(ctx,k,e); txt(ctx,k,e.p.title||'NOTAS',e.x+3,e.y+2.4,7,{w:700,base:'top'}); const sz=+e.p.size||6.5; const t=e.p.auto?notesText():e.p.text; const lines=wrapLines(ctx,k,t,sz,500,e.w-6); const lh=sz*0.3528*1.35; let y=e.y+7.2;
    lines.forEach(l=>{ if(y+lh>e.y+e.h-0.5) return; txt(ctx,k,l,e.x+3,y,sz,{base:'top',color:'#222'}); y+=lh; }); },
  selo(ctx,k,e){ const p=e.p; ctx.fillStyle='#fff'; ctx.fillRect(e.x*k,e.y*k,e.w*k,e.h*k); const r=refFeature(); const g=r?r.f.getGeometry():null;
    const area=p.area||(g?nf(gArea(g)/1e4,4)+' ha':'—'), per=p.perimetro||(g?nf(gLength(g))+' m':'—');
    const rows=[[{l:'CONTEÚDO',v:p.conteudo,w:1,big:true}],[{l:'IMÓVEL',v:p.imovel,w:.6},{l:'MUNICÍPIO / UF',v:p.municipio,w:.4}],[{l:'PROPRIETÁRIO',v:p.proprietario,w:1}],
      [{l:'ÁREA',v:area,w:.34},{l:'PERÍMETRO',v:per,w:.33},{l:'ESCALA',v:'1:'+nfi(LY().scale),w:.33}],[{l:'SISTEMA DE REFERÊNCIA',v:crsDesc(S.crs),w:1,small:true}],
      [{l:'RESPONSÁVEL TÉCNICO',v:p.resp,w:.66},{l:'DATA',v:p.data,w:.34}],[{l:'REGISTRO PROFISSIONAL',v:p.registro,w:.66},{l:'FOLHA',v:p.folha,w:.34}]];
    const wts=rows.map((_,i)=>i?1:1.45); const unit=e.h/wts.reduce((a,b)=>a+b,0); let y=e.y;
    rows.forEach((row,ri)=>{ const h=unit*wts[ri]; let x=e.x; row.forEach(c=>{ const w=e.w*c.w; ctx.strokeStyle='#111'; ctx.lineWidth=0.18*k; ctx.strokeRect(x*k,y*k,w*k,h*k);
        const lp=Math.min(4.6,h*0.3/0.3528); txt(ctx,k,c.l,x+1.2,y+0.9,lp,{w:600,base:'top',color:'#555'});
        if(c.big){ const sz=Math.min(10.5,h*0.42/0.3528); txt(ctx,k,fit(ctx,k,c.v,sz,700,w-3),x+w/2,y+h*0.62,sz,{w:700,align:'center',base:'middle'}); }
        else { const sz=Math.min(c.small?6:7,h*0.42/0.3528); txt(ctx,k,fit(ctx,k,c.v||'',sz,600,w-2.4),x+1.2,y+h-1,sz,{w:600}); }
        x+=w; }); y+=h; });
    ctx.strokeStyle='#111'; ctx.lineWidth=0.45*k; ctx.strokeRect(e.x*k,e.y*k,e.w*k,e.h*k); },
  logo(ctx,k,e,_,preview){ const im=e.p.src?logoImage(e.p.src):null; if(im&&im.complete&&im.naturalWidth){ const s=Math.min(e.w/im.naturalWidth,e.h/im.naturalHeight); const w=im.naturalWidth*s,h=im.naturalHeight*s; ctx.drawImage(im,(e.x+(e.w-w)/2)*k,(e.y+(e.h-h)/2)*k,w*k,h*k); }
    else if(preview){ ctx.setLineDash([1.2*k,1*k]); ctx.strokeStyle='#999'; ctx.lineWidth=0.25*k; ctx.strokeRect(e.x*k,e.y*k,e.w*k,e.h*k); ctx.setLineDash([]); txt(ctx,k,'Logotipo',e.x+e.w/2,e.y+e.h/2,6,{align:'center',base:'middle',color:'#999'}); }
    if(e.p.border){ ctx.strokeStyle='#111'; ctx.lineWidth=0.3*k; ctx.strokeRect(e.x*k,e.y*k,e.w*k,e.h*k); } } };
const logoCache={};
function logoImage(src){ if(logoCache.src===src) return logoCache.img; const im=new Image(); im.onload=()=>drawPreview(); im.src=src; logoCache.src=src; logoCache.img=im; return im; }
function drawGrid(ctx,k,e){ const Lo=LY(), c=layCenter(); const upm=(Lo.scale/1000)/gpu(S.crs,c); const geo=!!crsInfo().geo;
  const x0=c[0]-e.w/2*upm, x1=c[0]+e.w/2*upm, y0=c[1]-e.h/2*upm, y1=c[1]+e.h/2*upm;
  let step=+e.p.gridInt>0?+e.p.gridInt:(geo?[1,2,5,10,15,30,60,120,300,600,900,1800,3600,7200].map(s=>s/3600).find(s=>(x1-x0)/s<=6)||1:niceStep((x1-x0)/5));
  const px=E=>e.x+e.w/2+(E-c[0])/upm, py=N=>e.y+e.h/2-(N-c[1])/upm; const col=e.p.gridColor||'#3b3b3b';
  const xs=[],ys=[]; for(let v=Math.ceil(x0/step)*step;v<=x1;v+=step) xs.push(v); for(let v=Math.ceil(y0/step)*step;v<=y1;v+=step) ys.push(v);
  ctx.strokeStyle=col; ctx.lineWidth=0.14*k;
  if(e.p.gridType==='cruzetas'){ const L=2.2; xs.forEach(X=>ys.forEach(Y=>{ const a=px(X),b=py(Y); ctx.beginPath(); ctx.moveTo((a-L)*k,b*k); ctx.lineTo((a+L)*k,b*k); ctx.moveTo(a*k,(b-L)*k); ctx.lineTo(a*k,(b+L)*k); ctx.stroke(); }));
    ctx.lineWidth=0.25*k; xs.forEach(X=>{ const a=px(X); ctx.beginPath(); ctx.moveTo(a*k,e.y*k); ctx.lineTo(a*k,(e.y+1.8)*k); ctx.moveTo(a*k,(e.y+e.h)*k); ctx.lineTo(a*k,(e.y+e.h-1.8)*k); ctx.stroke(); });
    ys.forEach(Y=>{ const b=py(Y); ctx.beginPath(); ctx.moveTo(e.x*k,b*k); ctx.lineTo((e.x+1.8)*k,b*k); ctx.moveTo((e.x+e.w)*k,b*k); ctx.lineTo((e.x+e.w-1.8)*k,b*k); ctx.stroke(); }); }
  else { xs.forEach(X=>{ const a=px(X); ctx.beginPath(); ctx.moveTo(a*k,e.y*k); ctx.lineTo(a*k,(e.y+e.h)*k); ctx.stroke(); }); ys.forEach(Y=>{ const b=py(Y); ctx.beginPath(); ctx.moveTo(e.x*k,b*k); ctx.lineTo((e.x+e.w)*k,b*k); ctx.stroke(); }); }
  if(!e.p.gridLabels) return; const fx=v=>geo?dms(Math.abs(v))+(v<0?' W':' E'):'E '+nfi(v), fy=v=>geo?dms(Math.abs(v))+(v<0?' S':' N'):'N '+nfi(v); const pt=5.4;
  xs.forEach(X=>{ const a=px(X); if(a<e.x+9||a>e.x+e.w-9) return; txt(ctx,k,fx(X),a,e.y+1.1,pt,{align:'center',base:'top',halo:true,w:600}); txt(ctx,k,fx(X),a,e.y+e.h-1.1,pt,{align:'center',base:'bottom',halo:true,w:600}); });
  ys.forEach(Y=>{ const b=py(Y); if(b<e.y+12||b>e.y+e.h-12) return; ctx.save(); ctx.translate((e.x+1.1)*k,b*k); ctx.rotate(-Math.PI/2); txt(ctx,k,fy(Y),0,0,pt,{align:'center',base:'top',halo:true,w:600}); ctx.restore();
    ctx.save(); ctx.translate((e.x+e.w-1.1)*k,b*k); ctx.rotate(-Math.PI/2); txt(ctx,k,fy(Y),0,0,pt,{align:'center',base:'bottom',halo:true,w:600}); ctx.restore(); }); }
function drawLayout(ctx,k,mapImg,preview){ const [W,H]=pageDims(), Lo=LY(), m=Lo.margins; ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W*k,H*k);
  Lo.els.forEach(e=>{ if(!e.vis||!e.w) return; ctx.save(); DRAW[e.type](ctx,k,e,mapImg,preview); ctx.restore(); });
  ctx.strokeStyle='#111'; ctx.lineWidth=0.6*k; ctx.strokeRect(m.l*k,m.t*k,(W-m.l-m.r)*k,(H-m.t-m.b)*k); ctx.restore(); }

/* Pré-visualização interativa */
const LS={k:1,dpr:1,sel:'mapa',drag:null,mapImg:null,mapKey:'',tok:0,panMode:false,panOff:null,timer:null};
function sizeCanvas(){ const st=$('#layStage'), cv=$('#layCanvas'); const [W,H]=pageDims(); const pad=28; const aw=Math.max(100,st.clientWidth-pad*2), ah=Math.max(100,st.clientHeight-pad*2);
  const css=Math.min(aw/W,ah/H); LS.dpr=Math.min(2,window.devicePixelRatio||1); LS.k=css*LS.dpr; cv.width=Math.round(W*LS.k); cv.height=Math.round(H*LS.k); cv.style.width=W*css+'px'; cv.style.height=H*css+'px'; }
function drawPreview(){ if($('#lay').hidden) return; const cv=$('#layCanvas'), ctx=cv.getContext('2d'); const k=LS.k; drawLayout(ctx,k,LS.mapImg,true);
  const e=elById(LS.sel); if(e&&e.vis){ ctx.save(); ctx.setLineDash([4,3]); ctx.strokeStyle='#e08a00'; ctx.lineWidth=1.5*LS.dpr; ctx.strokeRect(e.x*k,e.y*k,e.w*k,e.h*k); ctx.setLineDash([]); ctx.fillStyle='#e08a00'; const hs=7*LS.dpr; ctx.fillRect((e.x+e.w)*k-hs,(e.y+e.h)*k-hs,hs,hs); ctx.restore(); } }
function mapKey(k){ const e=elById('mapa'); return [e.w.toFixed(1),e.h.toFixed(1),layCenter().map(v=>v.toFixed(2)).join(','),LY().scale,k.toFixed(3),S.mapVersion,S.basemap,S.baseOpacity,S.crs].join('|'); }
function scheduleMap(){ clearTimeout(LS.timer); LS.timer=setTimeout(refreshMapPreview,220); }
async function refreshMapPreview(){ if($('#lay').hidden) return; const e=elById('mapa'); if(!e.vis) return; const k=LS.k; const key=mapKey(k); if(key===LS.mapKey&&LS.mapImg) return; LS.mapKey=key; const tok=++LS.tok;
  const pr=k*25.4/96; const res=(LY().scale/1000)/gpu(S.crs,layCenter())*(25.4/96);
  try{ const img=await renderOffscreen(Math.round(e.w*96/25.4),Math.round(e.h*96/25.4),layCenter(),res,pr,9000); if(tok!==LS.tok) return; LS.mapImg=img; LS.panOff=null; drawPreview(); }catch(err){ console.error(err); } }
function toMM(ev){ const r=$('#layCanvas').getBoundingClientRect(); return [(ev.clientX-r.left)*LS.dpr/LS.k,(ev.clientY-r.top)*LS.dpr/LS.k]; }
function hitEl(p){ const els=LY().els.filter(e=>e.vis&&e.w); for(let i=els.length-1;i>=0;i--){ const e=els[i]; if(p[0]>=e.x&&p[0]<=e.x+e.w&&p[1]>=e.y&&p[1]<=e.y+e.h) return e; } return null; }
function bindLayoutCanvas(){ const cv=$('#layCanvas');
  cv.addEventListener('pointerdown',ev=>{ const p=toMM(ev); const sel=elById(LS.sel); const hs=7/(LS.k/LS.dpr);
    if(sel&&sel.vis&&Math.abs(p[0]-(sel.x+sel.w))<hs&&Math.abs(p[1]-(sel.y+sel.h))<hs){ LS.drag={mode:'resize',e:sel,p0:p,g0:{...sel}}; }
    else { const e=hitEl(p); if(!e){ LS.sel=null; renderLaySide(); drawPreview(); return; }
      if(e.id==='mapa'&&LS.panMode){ LS.drag={mode:'pan',e,p0:p,c0:layCenter().slice()}; } else { if(LS.sel!==e.id){ LS.sel=e.id; renderLaySide(); } LS.drag={mode:'move',e,p0:p,g0:{...e}}; } }
    cv.setPointerCapture(ev.pointerId); drawPreview(); });
  cv.addEventListener('pointermove',ev=>{ const d=LS.drag; if(!d) { const p=toMM(ev); const e=hitEl(p); cv.style.cursor=e?(e.id==='mapa'&&LS.panMode?'grab':'move'):'default'; return; } const p=toMM(ev), dx=p[0]-d.p0[0], dy=p[1]-d.p0[1]; const sn=v=>Math.round(v*2)/2;
    if(d.mode==='move'){ d.e.x=sn(d.g0.x+dx); d.e.y=sn(d.g0.y+dy); } else if(d.mode==='resize'){ d.e.w=Math.max(8,sn(d.g0.w+dx)); d.e.h=Math.max(6,sn(d.g0.h+dy)); } else if(d.mode==='pan'){ LS.panOff=[dx,dy]; } drawPreview(); });
  const end=ev=>{ const d=LS.drag; if(!d) return; LS.drag=null; const p=toMM(ev);
    if(d.mode==='pan'){ const upm=(LY().scale/1000)/gpu(S.crs,d.c0); LY().center=[d.c0[0]-(p[0]-d.p0[0])*upm,d.c0[1]+(p[1]-d.p0[1])*upm]; scheduleMap(); }
    if(d.e.id==='mapa'&&d.mode==='resize') scheduleMap(); renderLaySide(true); scheduleSave(); };
  cv.addEventListener('pointerup',end); cv.addEventListener('pointercancel',end);
  cv.addEventListener('wheel',ev=>{ const p=toMM(ev); const e=hitEl(p); if(!e||e.id!=='mapa') return; ev.preventDefault(); const i=SCALES.findIndex(s=>s>=LY().scale); const ni=Math.max(0,Math.min(SCALES.length-1,(i<0?SCALES.length-1:i)+(ev.deltaY>0?1:-1))); LY().scale=SCALES[ni]; renderLaySide(true); drawPreview(); scheduleMap(); },{passive:false}); }

function fitLayoutToContent(){ const Lo=LY(); const r=refFeature(); let ex=allExtent(); if(!ex&&r) ex=r.f.getGeometry().getExtent(); if(!ex){ Lo.center=map.getView().getCenter(); Lo.scale=nearestScale(currentScale()); return; }
  const e=elById('mapa'); const c=ol.extent.getCenter(ex); const g=gpu(S.crs,c); const need=Math.max((ex[2]-ex[0])*g/(e.w*0.88),(ex[3]-ex[1])*g/(e.h*0.88))*1000; Lo.center=c; Lo.scale=SCALES.find(s=>s>=need)||Math.ceil(need/1000)*1000; }
function nearestScale(v){ return SCALES.reduce((a,b)=>Math.abs(b-v)<Math.abs(a-v)?b:a); }
function openLayout(){ const fresh=!S.layout; LY(); if(fresh){ const e=elById('selo'); Object.assign(e.p,LAYOUT_DEFAULTS()); fitLayoutToContent(); } if(!LY().center) fitLayoutToContent();
  $('#lay').hidden=false; LS.sel=LS.sel||'mapa'; $('#layDpi').value=String(LY().dpi); requestAnimationFrame(()=>{ sizeCanvas(); renderLaySide(); LS.mapKey=''; drawPreview(); refreshMapPreview(); }); }
function closeLayout(){ $('#lay').hidden=true; scheduleSave(); }

/* Painel lateral do compositor */
function renderLaySide(keepFocus){ const box=$('#laySide'); if(keepFocus&&box.contains(document.activeElement)&&document.activeElement.matches('input,textarea,select')){ updateGeomFields(); return; }
  const Lo=LY(); const e=elById(LS.sel); const polys=[]; S.layers.forEach(L=>{ if(isVec(L)) L.source.getFeatures().forEach(f=>{ if(!f.get('_kind')&&f.getGeometry()?.getType().includes('Polygon')&&polys.length<300) polys.push({fid:f.get('_fid'),n:(f.get('nome')||'Polígono')+' · '+L.name}); }); });
  const rf=refFeature();
  let h=`<section class="sec"><h3>Folha</h3><div class="form"><label for="lyPage">Tamanho</label><select id="lyPage" data-L="page">${Object.keys(PAGES).map(p=>`<option ${p===Lo.page?'selected':''}>${p}</option>`).join('')}</select>
    <label>Orientação</label><div class="seg"><button data-orient="paisagem" aria-pressed="${Lo.orient==='paisagem'}">Paisagem</button><button data-orient="retrato" aria-pressed="${Lo.orient==='retrato'}">Retrato</button></div>
    <span></span><button class="tb" data-lact="arrange">Reorganizar elementos</button></div></section>
   <section class="sec"><h3>Mapa na prancha</h3><div class="form"><label for="lyScale">Escala 1:</label><input type="text" id="lyScale" list="scaleList" value="${nfi(Lo.scale)}">
    <span></span><div class="pair" style="flex-wrap:wrap"><button class="tb" data-lact="fit">Enquadrar feições</button><button class="tb" data-lact="view">Usar vista do mapa</button></div>
    <span></span><button class="tb ${LS.panMode?'primary':''}" data-lact="pan" aria-pressed="${LS.panMode}">${LS.panMode?'✓ ':''}Arrastar mapa no quadro</button></div>
    <p class="note">Role a roda do mouse sobre o mapa da prancha para trocar a escala.</p></section>
   <section class="sec"><h3>Elementos</h3><ul class="ellist">${Lo.els.map(x=>`<li data-el="${x.id}" class="${x.id===LS.sel?'on':''}"><input type="checkbox" data-vis="${x.id}" ${x.vis?'checked':''} aria-label="Mostrar ${EL_NAMES[x.type]}"> ${EL_NAMES[x.type]}</li>`).join('')}</ul></section>`;
  if(e){ const p=e.p; h+=`<section class="sec"><h3>${EL_NAMES[e.type]}</h3><div class="form">`;
    const I=(lab,key,val,type='text')=>`<label for="lp_${key}">${lab}</label><input type="${type}" id="lp_${key}" data-p="${key}" value="${esc(val??'')}">`;
    if(e.type==='mapa') h+=`<label class="chk full"><input type="checkbox" data-p="grid" ${p.grid?'checked':''}> Grade de coordenadas</label><label for="lp_gt">Tipo</label><select id="lp_gt" data-p="gridType"><option value="linhas" ${p.gridType==='linhas'?'selected':''}>Linhas contínuas</option><option value="cruzetas" ${p.gridType==='cruzetas'?'selected':''}>Cruzetas</option></select>${I(crsInfo().geo?'Intervalo (graus, 0=auto)':'Intervalo (m, 0=auto)','gridInt',p.gridInt,'number')}<label class="chk full"><input type="checkbox" data-p="gridLabels" ${p.gridLabels?'checked':''}> Rótulos das coordenadas</label><label for="lp_gc">Cor da grade</label><input type="color" id="lp_gc" data-p="gridColor" value="${p.gridColor||'#3b3b3b'}">`;
    if(e.type==='titulo') h+=I('Título','text',p.text)+I('Subtítulo','sub',p.sub)+I('Tamanho (pt)','size',p.size,'number');
    if(e.type==='norte') h+=`<label for="lp_ns">Estilo</label><select id="lp_ns" data-p="style"><option value="seta" ${p.style==='seta'?'selected':''}>Seta técnica</option><option value="rosa" ${p.style==='rosa'?'selected':''}>Rosa dos ventos</option><option value="simples" ${p.style==='simples'?'selected':''}>Triângulo simples</option></select><label class="chk full"><input type="checkbox" data-p="conv" ${p.conv?'checked':''}> Mostrar convergência meridiana (UTM)</label>`;
    if(e.type==='escala') h+=`<label class="chk full"><input type="checkbox" data-p="text" ${p.text?'checked':''}> Escala numérica</label><label class="chk full"><input type="checkbox" data-p="bar" ${p.bar?'checked':''}> Escala gráfica</label>`;
    if(e.type==='legenda') h+=I('Título','title',p.title)+`<label class="chk full"><input type="checkbox" data-p="credit" ${p.credit?'checked':''}> Crédito do mapa de fundo</label><p class="note full">A legenda lista as camadas vetoriais visíveis com seus nomes. Renomeie as camadas no painel principal para ajustar o texto.</p>`;
    if(e.type==='coords') h+=I('Título','title',p.title)+`<label for="lp_ref">Polígono</label><select id="lp_ref" data-L="refFid">${polys.map(o=>`<option value="${o.fid}" ${rf&&rf.f.get('_fid')===o.fid?'selected':''}>${esc(o.n)}</option>`).join('')||'<option value="">— nenhum polígono —</option>'}</select>`;
    if(e.type==='notas') h+=I('Título','title',p.title)+I('Tamanho (pt)','size',p.size,'number')+`<label class="full" for="lp_nt">Texto</label><textarea id="lp_nt" class="full inp" rows="6" data-p="text">${esc(p.auto?notesText():p.text)}</textarea><span></span><button class="tb" data-lact="notesauto">Texto automático</button>`;
    if(e.type==='selo') h+=I('Conteúdo','conteudo',p.conteudo)+I('Imóvel','imovel',p.imovel)+I('Município/UF','municipio',p.municipio)+I('Proprietário','proprietario',p.proprietario)+I('Área (vazio = auto)','area',p.area)+I('Perímetro (vazio = auto)','perimetro',p.perimetro)+I('Responsável técnico','resp',p.resp)+I('Registro (CREA/CFT)','registro',p.registro)+I('Data','data',p.data)+I('Folha','folha',p.folha);
    if(e.type==='logo') h+=`<label for="lp_logo">Imagem</label><input type="file" id="lp_logo" accept="image/png,image/jpeg,image/svg+xml">${p.src?'<span></span><button class="tb danger" data-lact="nologo">Remover imagem</button>':''}`;
    if(e.type!=='mapa'&&e.type!=='selo') h+=`<label class="chk full"><input type="checkbox" data-p="border" ${p.border?'checked':''}> Moldura</label>`;
    h+=`</div><div class="sub">Posição e tamanho (mm)</div><div class="form" style="grid-template-columns:auto 1fr auto 1fr"><label for="g_x">X</label><input type="number" step="0.5" id="g_x" data-g="x" value="${e.x}"><label for="g_y">Y</label><input type="number" step="0.5" id="g_y" data-g="y" value="${e.y}"><label for="g_w">Larg.</label><input type="number" step="0.5" id="g_w" data-g="w" value="${e.w}"><label for="g_h">Alt.</label><input type="number" step="0.5" id="g_h" data-g="h" value="${e.h}"></div></section>`; }
  else h+=`<section class="sec"><p class="empty">Clique num elemento da prancha para editá-lo. Arraste para mover e use o quadrado laranja do canto para redimensionar.</p></section>`;
  box.innerHTML=h; }
function updateGeomFields(){ const e=elById(LS.sel); if(!e) return; ['x','y','w','h'].forEach(k=>{ const i=$(`#laySide [data-g="${k}"]`); if(i&&document.activeElement!==i) i.value=e[k]; }); const s=$('#lyScale'); if(s&&document.activeElement!==s) s.value=nfi(LY().scale); }
function bindLayoutSide(){ const box=$('#laySide');
  box.addEventListener('input',ev=>{ const t=ev.target; const e=elById(LS.sel);
    if(t.dataset.p&&e){ const k=t.dataset.p; let v=t.type==='checkbox'?t.checked:t.value; if(t.type==='number') v=parseNum(v)||0; if(e.type==='notas'&&k==='text') e.p.auto=false; e.p[k]=v; if(e.type==='mapa') { if(k==='gridInt'||k==='grid'||k==='gridType'||k==='gridLabels'||k==='gridColor') {} } drawPreview(); scheduleSave(); }
    else if(t.dataset.g&&e){ const v=parseNum(t.value); if(isFinite(v)){ e[t.dataset.g]=v; drawPreview(); if(e.id==='mapa') scheduleMap(); } }
    else if(t.id==='lyScale'){ const v=parseNum(String(t.value).replace(/\./g,'')); if(v>=10){ LY().scale=Math.round(v); drawPreview(); scheduleMap(); } } });
  box.addEventListener('change',async ev=>{ const t=ev.target;
    if(t.dataset.L==='page'){ LY().page=t.value; arrange(); sizeCanvas(); LS.mapKey=''; drawPreview(); scheduleMap(); renderLaySide(); }
    else if(t.dataset.L==='refFid'){ LY().refFid=t.value; drawPreview(); }
    else if(t.dataset.vis){ elById(t.dataset.vis).vis=t.checked; if(t.dataset.vis==='mapa'&&t.checked) scheduleMap(); drawPreview(); }
    else if(t.id==='lp_logo'&&t.files[0]){ const fr=new FileReader(); fr.onload=()=>{ elById('logo').p.src=fr.result; elById('logo').vis=true; renderLaySide(); drawPreview(); }; fr.readAsDataURL(t.files[0]); } });
  box.addEventListener('click',ev=>{ const li=ev.target.closest('li[data-el]'); if(li&&!ev.target.matches('input')){ LS.sel=li.dataset.el; renderLaySide(); drawPreview(); return; }
    const o=ev.target.closest('[data-orient]'); if(o){ LY().orient=o.dataset.orient; arrange(); sizeCanvas(); LS.mapKey=''; renderLaySide(); drawPreview(); scheduleMap(); return; }
    const a=ev.target.closest('[data-lact]'); if(!a) return; const act=a.dataset.lact;
    if(act==='arrange'){ arrange(); scheduleMap(); } if(act==='fit'){ fitLayoutToContent(); scheduleMap(); } if(act==='view'){ LY().center=map.getView().getCenter(); LY().scale=nearestScale(currentScale()); scheduleMap(); }
    if(act==='pan'){ LS.panMode=!LS.panMode; } if(act==='notesauto'){ elById('notas').p.auto=true; } if(act==='nologo'){ elById('logo').p.src=null; }
    renderLaySide(); drawPreview(); }); }

/* Exportação da prancha */
async function exportLayout(kind){ const [W,H]=pageDims(); let dpi=+$('#layDpi').value||200; LY().dpi=dpi; let k=dpi/25.4; while(W*k*H*k>90e6&&dpi>100){ dpi-=25; k=dpi/25.4; }
  if(dpi!==LY().dpi) toast(`Resolução reduzida para ${dpi} dpi para caber na memória do navegador.`);
  if(kind==='geopdf'&&isLocal()){ toast('GeoPDF exige SRC georreferenciado. Exportando como PDF comum.'); kind='pdf'; }
  busy('Renderizando o mapa em alta resolução…'); const base=safeName(S.projName);
  try{ const e=elById('mapa'); let mimg=null; if(e.vis){ const res=(LY().scale/1000)/gpu(S.crs,layCenter())*(25.4/96); mimg=await renderOffscreen(Math.round(e.w*96/25.4),Math.round(e.h*96/25.4),layCenter(),res,k*25.4/96,45000); }
    busy('Montando a prancha…'); if(document.fonts&&document.fonts.ready) await document.fonts.ready;
    const cv=document.createElement('canvas'); cv.width=Math.round(W*k); cv.height=Math.round(H*k); drawLayout(cv.getContext('2d'),k,mimg,false);
    if(kind==='png'){ download(await canvasBlob(cv),base+'_prancha.png'); }
    else { const {jsPDF}=window.jspdf; const doc=new jsPDF({orientation:W>H?'l':'p',unit:'mm',format:[W,H],compress:true});
      doc.addImage(cv.toDataURL('image/jpeg',0.93),'JPEG',0,0,W,H,undefined,'FAST'); doc.setProperties({title:S.projName,subject:elById('titulo').p.text,creator:'GeoPrancha'});
      let bin=doc.output(); if(kind==='geopdf') bin=injectGeoPDF(bin,W,H,e); const u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i)&255;
      download(new Blob([u8],{type:'application/pdf'}),base+(kind==='geopdf'?'_geopdf.pdf':'_prancha.pdf')); }
    toast(kind==='geopdf'?'GeoPDF exportado. Abra no QGIS, Avenza Maps ou Adobe para ler coordenadas.':'Prancha exportada.',5000); }
  catch(err){ console.error(err); toast(err.name==='SecurityError'?'O mapa de fundo atual não permite exportação (bloqueio do provedor). Troque para “Esri Satélite” ou outro mapa e exporte de novo.':'Falha ao exportar: '+err.message,8000); }
  finally{ busy(false); } }
function injectGeoPDF(bin,W,H,e){ const pt=v=>(v*72/25.4).toFixed(3); const c=layCenter(); const upm=(LY().scale/1000)/gpu(S.crs,c); const hw=e.w/2*upm, hh=e.h/2*upm;
  const geoCode=crsInfo().datum==='SIRGAS2000'?'EPSG:4674':'EPSG:4326'; const corners=[[c[0]-hw,c[1]-hh],[c[0]-hw,c[1]+hh],[c[0]+hw,c[1]+hh],[c[0]+hw,c[1]-hh]].map(p=>ol.proj.transform(p,S.crs,geoCode));
  const gpts=corners.map(p=>`${p[1].toFixed(9)} ${p[0].toFixed(9)}`).join(' '); const code=S.crs.split(':')[1]; const geog=!!crsInfo().geo; const w=crsWKT(S.crs);
  const gcs=`<< /Type /${geog?'GEOGCS':'PROJCS'} /EPSG ${code} /WKT (${w}) >>`;
  const vp=`/VP [ << /Type /Viewport /Name (Mapa) /BBox [${pt(e.x)} ${pt(H-e.y-e.h)} ${pt(e.x+e.w)} ${pt(H-e.y)}] /Measure << /Type /Measure /Subtype /GEO /Bounds [0 0 0 1 1 1 1 0] /GPTS [${gpts}] /LPTS [0 0 0 1 1 1 1 0] /GCS ${gcs} /PDU [/M /SQM /DEG] >> >> ]`;
  const m=bin.match(/\/Type \/Page(?!s)/); if(!m) return bin; const at=m.index+m[0].length; let s=bin.slice(0,at)+'\n'+vp+bin.slice(at);
  const xi=s.lastIndexOf('\nxref\n'); const ti=s.indexOf('trailer',xi); const si=s.indexOf('startxref',ti); if(xi<0||ti<0||si<0) return s; const trailer=s.slice(ti,si); const size=+((trailer.match(/\/Size (\d+)/)||[])[1]||0); const body=s.slice(0,xi+1);
  const offs={}; const re=/(^|\n)(\d+) 0 obj/g; let mm; while((mm=re.exec(body))){ const n=+mm[2]; if(offs[n]===undefined) offs[n]=mm.index+mm[1].length; }
  let x='xref\n0 '+size+'\n0000000000 65535 f \n'; for(let i=1;i<size;i++) x+=offs[i]!==undefined?String(offs[i]).padStart(10,'0')+' 00000 n \n':'0000000000 65535 f \n';
  return body+x+trailer+'startxref\n'+body.length+'\n%%EOF'; }
let LAYOUT_DEFAULTS=()=>({});

/* Itens da legenda: camadas, categorias e feições com estilo próprio */
function legendItems(){ const items=[];
  [...S.layers].reverse().forEach(L=>{ if(!isVec(L)||!L.visible) return; const fs=L.source.getFeatures().filter(f=>!f.get('_kind')); if(!fs.length) return; const gc=dominantType(L)||'A'; const st=L.style;
    if(st.symMode==='categorizado'&&st.catField&&(st.cats||[]).length){ items.push({head:L.name});
      const present=new Set(fs.map(f=>String(f.get(st.catField)??'')));
      st.cats.filter(c=>present.has(c.v)).forEach(c=>items.push({indent:true,gc,label:c.label||c.v||'(vazio)',sym:Object.assign({},st,{fill:c.color,pointFill:c.color,stroke:gc==='L'?c.color:darken(c.color)})})); }
    else items.push({gc,label:L.name,sym:st});
    const own=fs.filter(f=>f.get('_st')&&f.get('nome')).slice(0,8); own.forEach(f=>items.push({indent:true,gc:geomClass(f.getGeometry()),label:String(f.get('nome')),sym:Object.assign({},st,f.get('_st'))})); });
  const vl=S.layers.find(L=>isVec(L)&&L.visible&&L.style.showVtx&&dominantType(L)&&dominantType(L)!=='P'); if(vl) items.push({vtx:vl});
  return items; }
