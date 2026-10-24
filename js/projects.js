'use strict';
/* =====================================================================
   Meus projetos: vários projetos guardados no aparelho (IndexedDB),
   com salvamento automático, imagens raster incluídas e exportação
   em arquivo .geoprancha.json (com as imagens embutidas).
   ===================================================================== */
const PDB={p:null};
function idb(){ if(PDB.p) return PDB.p; PDB.p=new Promise((res,rej)=>{ const r=indexedDB.open('geoprancha',1);
  r.onupgradeneeded=()=>{ const d=r.result; if(!d.objectStoreNames.contains('projetos')) d.createObjectStore('projetos',{keyPath:'id'}); if(!d.objectStoreNames.contains('meta')) d.createObjectStore('meta'); };
  r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); return PDB.p; }
const reqP=r=>new Promise((res,rej)=>{ r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
async function dbGet(st,k){ const d=await idb(); return reqP(d.transaction(st).objectStore(st).get(k)); }
async function dbAll(st){ const d=await idb(); return reqP(d.transaction(st).objectStore(st).getAll()); }
async function dbPut(st,v,k){ const d=await idb(); const t=d.transaction(st,'readwrite'); k===undefined?t.objectStore(st).put(v):t.objectStore(st).put(v,k); return new Promise((res,rej)=>{ t.oncomplete=()=>res(); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error); }); }
async function dbDel(st,k){ const d=await idb(); const t=d.transaction(st,'readwrite'); t.objectStore(st).delete(k); return new Promise((res,rej)=>{ t.oncomplete=()=>res(); t.onerror=()=>rej(t.error); }); }

/* Indicador “Salvo” */
function saveState(s){ const el=$('#saveState'); if(!el) return; el.dataset.s=s; el.textContent=s==='saving'?'Salvando…':s==='err'?'Não salvo':'Salvo '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); el.title=s==='err'?'O navegador recusou o salvamento. Use Arquivo › Salvar cópia (.json).':'Projeto salvo neste aparelho'; }

function projectRecord(){ const p=projectObj(); const fc=S.layers.reduce((s,L)=>s+(isVec(L)?L.source.getFeatures().length:0),0);
  return {id:S.projId,nome:S.projName||'Projeto',crs:S.crs,criado:S.projCreated||Date.now(),atualizado:Date.now(),camadas:S.layers.length,feicoes:fc,dados:p,
    rasters:S.layers.filter(L=>L.type==='raster'&&L.src).map(L=>({id:L.id,blob:L.src.blob,extent:L.src.extent,code:L.src.code}))}; }
let persistBusy=false, persistAgain=false;
async function persistProject(){ if(!S.projId) return; if(persistBusy){ persistAgain=true; return; } persistBusy=true; saveState('saving');
  try{ const rec=projectRecord(); S.projCreated=rec.criado; await dbPut('projetos',rec); await dbPut('meta',S.projId,'atual'); saveState('ok'); try{ navigator.storage?.persist?.(); }catch(e){} }
  catch(e){ console.warn('IndexedDB',e); try{ localStorage.setItem('geoprancha:auto',JSON.stringify(projectObj())); saveState('ok'); }catch(_){ saveState('err'); } }
  finally{ persistBusy=false; if(persistAgain){ persistAgain=false; setTimeout(persistProject,300); } } }
async function openRecord(rec){ loadProject(Object.assign({},rec.dados,{id:rec.id,name:rec.nome}),rec.rasters||[]); S.projCreated=rec.criado; await dbPut('meta',rec.id,'atual'); saveState('ok'); }

/* Arquivo .json com imagens embutidas */
const blobToDataURL=b=>new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(b); });
async function exportProjectFile(){ busy('Preparando arquivo…'); try{ const p=projectObj(); p.rasters=[]; for(const L of S.layers) if(L.type==='raster'&&L.src) p.rasters.push({id:L.id,extent:L.src.extent,code:L.src.code,data:await blobToDataURL(L.src.blob)});
    download(new Blob([JSON.stringify(p)],{type:'application/json'}),safeName(S.projName)+'.geoprancha.json'); toast('Cópia do projeto salva em arquivo, com as imagens incluídas.'); } finally{ busy(false); } }
async function importProjectFile(file){ try{ const p=JSON.parse(await file.text()); if(p.app!=='GeoPrancha') throw new Error('o arquivo não é um projeto GeoPrancha');
    await persistProject(); const rasters=[]; for(const r of p.rasters||[]) rasters.push({id:r.id,extent:r.extent,code:r.code,blob:await (await fetch(r.data)).blob()});
    delete p.rasters; p.id=uid(); S.projCreated=Date.now(); loadProject(p,rasters); await persistProject(); toast('Projeto aberto e guardado em Meus projetos: '+S.projName); }
  catch(err){ toast('Não foi possível abrir: '+err.message,6000); } }

/* Janela Meus projetos */
async function openProjects(){ await persistProject(); let list=[]; try{ list=await dbAll('projetos'); }catch(e){ toast('Este navegador não permite guardar projetos (modo anônimo?). Use Salvar cópia (.json).',6000); return; }
  list.sort((a,b)=>b.atualizado-a.atualizado); let est=''; try{ const e=await navigator.storage?.estimate?.(); if(e) est=`Espaço usado: ${nf(e.usage/1048576,1)} MB.`; }catch(e){}
  const row=r=>`<li class="prj ${r.id===S.projId?'cur':''}" data-id="${r.id}"><div class="pi"><b>${esc(r.nome)}</b>${r.id===S.projId?'<span class="tag">aberto</span>':''}<small>${new Date(r.atualizado).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})} · ${esc(CRS_INFO[r.crs]?.name||r.crs)} · ${r.camadas} camada(s) · ${r.feicoes} feição(ões)</small></div>
    <div class="pa">${r.id===S.projId?'':'<button class="tb primary" data-pj="abrir">Abrir</button>'}<button class="tb" data-pj="dup">Duplicar</button><button class="tb" data-pj="ren">Renomear</button>${r.id===S.projId?'':'<button class="tb danger" data-pj="del">Excluir</button>'}</div></li>`;
  const m=modal({title:'Meus projetos',wide:true,body:`<div class="ltools" style="margin:0 0 10px"><button class="tb primary" data-pj="novo">+ Novo projeto</button><button class="tb" data-pj="arq">Abrir arquivo (.json)</button><button class="tb" data-pj="exp">Salvar cópia do aberto (.json)</button></div>
      <ul class="prjlist">${list.map(row).join('')||'<li class="empty">Nenhum projeto salvo.</li>'}</ul><p class="note">Os projetos ficam guardados neste aparelho e são salvos automaticamente a cada alteração. Para levar a outro aparelho ou fazer backup, use “Salvar cópia (.json)”. ${est}</p>`,
    buttons:[{label:'Fechar',primary:true}]});
  m.el.addEventListener('click',async ev=>{ const b=ev.target.closest('[data-pj]'); if(!b) return; const a=b.dataset.pj; const li=b.closest('li[data-id]'); const rec=li?list.find(x=>x.id===li.dataset.id):null;
    if(a==='novo'){ m.close(); ACTIONS.novo(); }
    else if(a==='arq'){ m.close(); $('#fileProject').click(); }
    else if(a==='exp'){ exportProjectFile(); }
    else if(a==='abrir'){ busy('Abrindo projeto…'); try{ await persistProject(); await openRecord(await dbGet('projetos',rec.id)); m.close(); toast('Projeto aberto: '+S.projName); } finally{ busy(false); } }
    else if(a==='dup'){ const full=await dbGet('projetos',rec.id); const c=Object.assign({},full,{id:uid(),nome:full.nome+' (cópia)',criado:Date.now(),atualizado:Date.now()}); c.dados=Object.assign({},full.dados,{id:c.id,name:c.nome}); await dbPut('projetos',c); m.close(); openProjects(); toast('Cópia criada.'); }
    else if(a==='ren'){ modal({title:'Renomear projeto',body:`<div class="form"><label for="pjN">Nome</label><input type="text" id="pjN" value="${esc(rec.nome)}"></div>`,buttons:[{label:'Cancelar'},{label:'Salvar',primary:true,action:async()=>{ const n=$('#pjN').value.trim(); if(!n) return false;
        if(rec.id===S.projId){ S.projName=n; $('#projName').value=n; await persistProject(); } else { const full=await dbGet('projetos',rec.id); full.nome=n; full.dados.name=n; await dbPut('projetos',full); } m.close(); openProjects(); }}]}); }
    else if(a==='del'){ if(b.dataset.confirm!=='1'){ b.dataset.confirm='1'; b.textContent='Confirmar exclusão'; setTimeout(()=>{ if(b.isConnected){ b.dataset.confirm=''; b.textContent='Excluir'; } },4000); return; }
      await dbDel('projetos',rec.id); li.remove(); toast('Projeto excluído.'); } }); }

/* Início: abre o último projeto (ou migra o salvamento antigo) */
async function startProjects(){ let rec=null;
  try{ const id=await dbGet('meta','atual'); if(id) rec=await dbGet('projetos',id);
    if(!rec){ const old=localStorage.getItem('geoprancha:auto'); if(old){ const p=JSON.parse(old); if(p&&p.layers){ p.id=uid(); loadProject(p,[]); await persistProject(); localStorage.removeItem('geoprancha:auto'); return 'migrado'; } } } }
  catch(e){ console.warn(e); try{ const old=localStorage.getItem('geoprancha:auto'); if(old){ loadProject(JSON.parse(old),[]); return 'restaurado'; } }catch(_){} }
  if(rec){ await openRecord(rec); return 'restaurado'; } return null; }
