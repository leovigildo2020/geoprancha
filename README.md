# GeoPrancha

GIS + CAD leve, em português, para **plantas topográficas e arquitetônicas** e **medição em campo com GPS**. Roda no navegador e pode ser instalado no celular como aplicativo, funcionando sem internet.

## O que faz

- **Desenho CAD simples:** ponto, linha, polígono, retângulo, círculo, texto e cota. Inclui entrada por distância e azimute, coordenadas E/N, SNAP, ORTO e grade.
- **Entrada precisa:** tabela de coordenadas (CSV/TXT), poligonal por azimute ou rumo e distância (com erro de fechamento) e retângulo por medidas.
- **Rótulos automáticos:** vértices numerados, distâncias, azimute ou rumo, e área.
- **Simbologia:** cores, espessuras e 5 tipos de linha; preenchimento sólido ou com hachuras; 8 formatos de ponto; estilo próprio por feição; simbologia categorizada por campo; 18 estilos prontos (APP, Reserva Legal, Supressão, PRAD, cursos d'água, marcos…). A legenda da prancha acompanha tudo.
- **Meus projetos:** vários projetos guardados no aparelho, salvos automaticamente, com as imagens raster. Cópia em arquivo `.json` para backup ou para levar a outro aparelho.
- **Memorial descritivo** gerado a partir do polígono selecionado.
- **Sistemas de referência:** SIRGAS 2000 (geográficas e UTM 18S–25S, 18N–22N), WGS 84, SAD69 e plano local para plantas arquitetônicas.
- **Importa:** Shapefile, KML/KMZ, GeoJSON, GPX, CSV, GeoTIFF e imagem com world file.
- **Exporta:** Shapefile, DXF, KML, GeoJSON, CSV de vértices, PNG, PNG georreferenciado e GeoTIFF.
- **Compositor de impressão** (A4 a A0) com grade de coordenadas, norte, escalas, legenda, quadro de coordenadas, notas e carimbo. Gera PDF, **GeoPDF** e PNG.
- **Mapas de fundo:** Esri, Google, OSM, OpenTopoMap, Carto e XYZ personalizado.
- **Campo (GPS):**
  - **Caminhamento por vértice:** faz a média ponderada de várias leituras em cada canto.
  - **Caminhamento contínuo:** grava a trilha com filtro de precisão e distância mínima entre pontos.
  - Mostra área, perímetro e precisão ao vivo.
  - Retoma a coleta se o app fechar e mantém a tela ligada durante a medição.
- **Offline:** o app inteiro fica guardado no aparelho, e mapas de fundo podem ser baixados para a área de trabalho antes de ir a campo.

> **Precisão do GPS de celular:** 3 a 10 m por ponto, em condições normais. Adequado para estimativas, PRAD, croquis, talhões e conferências. **Não substitui** levantamento com receptor GNSS geodésico para INCRA/SIGEF.

## Publicar no GitHub Pages (uma vez, ~5 minutos)

1. Crie uma conta em [github.com](https://github.com), se ainda não tiver.
2. Clique em **New repository**, use o nome `geoprancha` e marque **Public**. Não adicione README, pois este repositório já tem um. Clique em **Create repository**.
3. Na página do repositório vazio, clique em **uploading an existing file**. Arraste **todo o conteúdo** desta pasta (arquivos e subpastas `css`, `js`, `vendor`, `icons`, `tools`, `tests`, `docs`) e clique em **Commit changes**.
   - Dica: arraste o conteúdo da pasta, não a pasta em si, para o `index.html` ficar na raiz do repositório.
4. Vá em **Settings › Pages**. Em **Build and deployment › Source**, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)**, e clique em **Save**.
5. Aguarde 1 a 2 minutos. O endereço aparece no topo da página Pages, no formato `https://SEU-USUARIO.github.io/geoprancha/`.

### Instalar no celular

1. Abra o endereço no **Chrome (Android)** ou no **Safari (iPhone)**.
2. Instale:
   - Android: menu ⋮ › **Instalar app**.
   - iPhone: Compartilhar › **Adicionar à Tela de Início**.
3. Antes de ir a campo, faça três coisas com internet:
   - Abra o app uma vez.
   - Vá em **Campo (GPS) › Mapa offline** e baixe a área de trabalho.
   - Permita o acesso à localização quando o app pedir.

## Desenvolver com o Claude Code

O projeto não tem etapa de build: os arquivos do repositório são exatamente o que o navegador carrega. Veja o `CLAUDE.md` para a arquitetura e as convenções.

1. Acesse [claude.ai/code](https://claude.ai/code), conecte sua conta GitHub e selecione o repositório `geoprancha`.
2. Descreva a melhoria. Por exemplo: *“Adicione importação de DXF como nova camada”*.
3. O Claude trabalha numa branch, testa e mostra o diff. Revise e crie o Pull Request.
4. Depois do merge na `main`, o GitHub Pages publica a nova versão automaticamente.

Para rodar no seu computador:

```bash
python3 -m http.server 8000      # depois abra http://localhost:8000
python3 tests/smoke_test.py      # teste automatizado (requer: pip install playwright && python -m playwright install chromium)
python3 tools/build_single.py    # gera dist/GeoPrancha.html (arquivo único, sem GPS/offline)
```

## Bibliotecas de terceiros

As bibliotecas estão em `vendor/`, com as licenças em `vendor/licenses/`:

- OpenLayers 9.2.4 (BSD-2)
- proj4js 2.11.0 (MIT)
- JSZip 3.10.1 (MIT/GPLv3)
- shpjs 4.0.4 (MIT)
- jsPDF 2.5.1 (MIT)
- geotiff.js 2.1.3 (MIT)

Ao usar mapas de fundo, respeite os termos de cada provedor: Esri, Google, OpenStreetMap e Carto.

## Licença

Defina a licença do seu código (por exemplo, MIT) antes de tornar o projeto público para terceiros.
