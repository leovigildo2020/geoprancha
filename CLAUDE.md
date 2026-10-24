# CLAUDE.md — guia do projeto GeoPrancha

App web estático (sem build, sem framework) de GIS + CAD em **português do Brasil**, publicado no GitHub Pages como PWA. Usuário principal: engenheiro florestal que faz plantas topográficas, PRAD, ASV e medições de campo no Cerrado (SIRGAS 2000 / UTM).

## Regras de ouro

- **Interface sempre em pt-BR.** Termos técnicos brasileiros: vértice, azimute, rumo, memorial descritivo, carimbo, prancha, SRC, fuso, MC.
- **Sem etapa de build.** O navegador carrega os arquivos como estão. Não introduza npm, bundler ou TypeScript sem pedido explícito.
- **Leveza e facilidade de uso** vêm antes de recursos avançados. O público é iniciante em CAD/GIS.
- **Ao alterar qualquer arquivo carregado pelo app, aumente `VERSION` em `sw.js`** (ex.: `gp-app-v2` → `gp-app-v3`). Se o arquivo for novo, adicione-o também à lista `SHELL`. Sem isso, os celulares continuam com a versão antiga em cache.
- Bibliotecas ficam em `vendor/` (cópias locais, necessárias para o modo offline). Não troque por links de CDN.
- Rode `python3 tests/smoke_test.py` antes de concluir. Ele simula os servidores de mapas e o GPS, então não precisa de internet.

## Estrutura

```
index.html          marcação da interface (faixa de ferramentas, painéis, compositor) + ordem dos scripts
css/app.css         tema claro/escuro via tokens em :root (não use cores literais fora dos tokens)
js/core.js          utilidades, SRC (proj4), estado S, mapa OpenLayers, estilos/rótulos, camadas,
                    interações de desenho, histórico (desfazer), painel da feição, memorial, modal
js/io.js            importação (SHP/KML/GeoJSON/GPX/CSV/GeoTIFF/world file), entrada por azimute,
                    exportação (SHP e DBF com escritores próprios, DXF R12, KML, GeoJSON, CSV),
                    renderização fora da tela e GeoTIFF
js/layout.js        compositor de impressão: elementos em mm, desenho em canvas, PDF via jsPDF,
                    GeoPDF (injeta /VP /Measure /GEO no PDF e reconstrói a tabela xref)
js/symbology.js     simbologia: estilo efetivo (camada + categoria + _st da feição), formatos de ponto,
                    hachuras, tipos de linha, estilos prontos, desenho de símbolos para legenda/prévias
js/gps.js           caminhamento GPS (por vértice com média ponderada, contínuo com filtros), painel de campo
js/offline.js       registro do service worker, instalação PWA, download de tiles para uso offline
js/projects.js      Meus projetos: vários projetos no IndexedDB (salvamento automático, rasters incluídos),
                    arquivo .geoprancha.json com imagens embutidas
js/main.js          ligação da interface (ações, teclado, abas), projeto de exemplo, inicialização
sw.js               cache do app (rede primeiro para HTML) e cache de tiles (cache primeiro)
tools/build_single.py  gera dist/GeoPrancha.html em arquivo único (sem GPS/offline)
tests/smoke_test.py    teste de ponta a ponta com Playwright
```

Os scripts são clássicos (não são módulos ES) e compartilham o escopo global. **A ordem em `index.html` importa:** core → io → layout → symbology → gps → offline → projects → main.

## Conceitos-chave

- **Estado global `S`:** `S.crs` (SRC do projeto), `S.layers` (camadas; `type:'vector'|'raster'`), `S.activeId`, `S.layout`.
- **Geometrias:** sempre no SRC do projeto (`S.crs`). Ao trocar o SRC (`setCRS`), todas as feições são transformadas.
- **Medidas:**
  - SRC em metros (UTM ou `LOCAL`): cálculo plano.
  - SRC geográfico ou 3857: cálculo geodésico (`ol.sphere`).
  - Use sempre `dist()`, `azim()`, `gArea()` e `gLength()`.
- **Propriedades internas de feição** começam com `_` (`_fid`, `_kind` = `texto`|`cota`, `_tam`, `_rot`, `_st` = estilo próprio da feição) e nunca são exportadas.
- **Simbologia:** `L.style` guarda o símbolo da camada (`stroke`, `width`, `dash`, `fill`, `fillOp`, `fillPattern`, `pointShape`, `pointFill`, `pointStroke`, `pointSize`) e o modo `symMode` (`unico`|`categorizado`, com `catField` e `cats`). Use `effStyle(L,f)` para o estilo final e `drawSym()` para desenhar símbolos em canvas.
- **Histórico:** `commit()` grava um snapshot depois de cada alteração. Chame-o após qualquer edição de feições.
- **Estilo de camada (`L.style`):** controla também os rótulos automáticos. Depois de alterar, chame `styleChanged(L)`.
- **Compositor:** unidades em milímetros. `drawLayout(ctx, k)` desenha com `k` = pixels por mm, e o mesmo código serve para a pré-visualização e a exportação.
- **GPS:** pontos guardados em lon/lat (WGS 84) e convertidos para `S.crs` apenas na exibição e ao salvar. A sessão é persistida em `localStorage` (`geoprancha:gps`). O GPS exige HTTPS ou localhost.
- **Persistência:** `scheduleSave()` → `persistProject()` grava o projeto aberto (`S.projId`) no IndexedDB `geoprancha` (stores `projetos` e `meta`), inclusive os blobs das camadas raster. O `localStorage` só é usado como reserva. O arquivo `.geoprancha.json` leva as imagens em base64.

## Testes

```bash
pip install playwright && python -m playwright install chromium
python3 tests/smoke_test.py --shots   # capturas em tests/output/
```

Se o Chromium do Playwright não puder ser baixado no ambiente, ao menos rode `node --check js/*.js sw.js`.

## Cuidados

- O GeoPDF depende do formato do PDF gerado pelo jsPDF 2.5.1. Se atualizar o jsPDF, rode o teste da prancha GeoPDF.
- Mapas Google podem bloquear CORS. O app tenta um “modo compatível” automaticamente (`noCorsKeys` em `core.js`), e nesse caso a exportação de imagem com esse fundo falha.
- Não habilite download em massa de tiles de OSM, OpenTopoMap ou Carto: as políticas desses serviços proíbem (`NO_BULK` em `offline.js`).
