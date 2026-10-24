"""Teste de fumaça do GeoPrancha (Playwright + Chromium).

Uso:
    pip install playwright && python -m playwright install chromium
    python3 tests/smoke_test.py            # sobe um servidor local e testa
    python3 tests/smoke_test.py --shots    # também salva capturas em tests/output/

Cobre: carregamento sem erros, desenho, exportações (SHP/DXF/KML/GeoJSON/CSV),
prancha PDF/GeoPDF, caminhamento GPS simulado (por vértice e contínuo) e abertura offline.
Os servidores de mapas são simulados (tiles verdes), então o teste roda sem internet.
"""
import asyncio, base64, functools, http.server, os, pathlib, sys, threading, zlib, struct
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'tests' / 'output'
SHOTS = '--shots' in sys.argv
CHROME = os.environ.get('CHROME_PATH')  # opcional: caminho de um Chromium já instalado

def png_tile():
    w = h = 256; raw = b''.join(b'\x00' + bytes((60, 140, 70)) * w for _ in range(h))
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
TILE = png_tile()

def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    handler.log_message = lambda *a: None
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}/'

async def main():
    srv, url = serve(); OUT.mkdir(parents=True, exist_ok=True); fails = []
    def check(cond, msg):
        print(('OK   ' if cond else 'FALHA') + ' ' + msg)
        if not cond: fails.append(msg)
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}))
        ctx = await b.new_context(viewport={'width': 1366, 'height': 860}, accept_downloads=True,
                                  permissions=['geolocation'], geolocation={'latitude': -13.497, 'longitude': -48.302, 'accuracy': 4})
        async def route(r):
            u = r.request.url
            if u.startswith(url): return await r.continue_()
            if any(h in u for h in ('arcgisonline', 'google.com', 'openstreetmap', 'opentopomap', 'cartocdn')):
                return await r.fulfill(status=200, body=TILE, headers={'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*'})
            await r.abort()
        await ctx.route('**/*', route)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url); await pg.wait_for_timeout(2500)
        check(await pg.evaluate('S.layers.length') >= 3, 'app carrega com o exemplo')
        check(await pg.evaluate('async()=>!!(await navigator.serviceWorker.ready).active'), 'service worker ativo')

        # desenho por entrada CAD
        area = await pg.evaluate('''()=>{ setTool('poligono'); const c=map.getView().getCenter(); cadAppend(c);
            const add=(d,az)=>{const q=lastFixed(); cadAppend([q[0]+d*Math.sin(az*RAD),q[1]+d*Math.cos(az*RAD)]);};
            add(100,90); add(50,180); add(100,270); I.draw.finishDrawing(); setTool('select');
            const f=activeLayer().source.getFeatures().slice(-1)[0]; return gArea(f.getGeometry()); }''')
        check(abs(area - 5000) < 0.01, f'polígono por distância/azimute = {area:.2f} m²')

        async def dl(js):
            async with pg.expect_download(timeout=90000) as d: await pg.evaluate(js)
            v = await d.value; path = OUT / v.suggested_filename; await v.save_as(path); return path
        for fmt in ('shp', 'dxf', 'kml', 'geojson', 'csv'):
            f = await dl(f"doExportVector('{fmt}','visiveis','proj',true)"); check(f.stat().st_size > 100, f'exporta {fmt}')
        await pg.evaluate('openLayout()'); await pg.wait_for_timeout(1500)
        for k in ('pdf', 'geopdf'):
            f = await dl(f"exportLayout('{k}')"); data = f.read_bytes()
            check(data.startswith(b'%PDF') and (k == 'pdf' or b'/GPTS' in data), f'prancha {k}')
        await pg.evaluate('closeLayout()')

        # GPS simulado: coleta por vértice
        await pg.evaluate('gpsOpen()'); await pg.wait_for_timeout(800)
        await pg.click('[data-gp=start]')
        base = (-13.497, -48.302); d = 0.0009  # ~100 m
        for lat, lon in [(0, 0), (0, d), (-d, d), (-d, 0)]:
            await ctx.set_geolocation({'latitude': base[0] + lat, 'longitude': base[1] + lon, 'accuracy': 4})
            await pg.evaluate('gpsCollectVertex()'); await pg.wait_for_timeout(200)
            for _ in range(3):
                await ctx.set_geolocation({'latitude': base[0] + lat + 1e-6, 'longitude': base[1] + lon, 'accuracy': 4}); await pg.wait_for_timeout(150)
                await ctx.set_geolocation({'latitude': base[0] + lat, 'longitude': base[1] + lon, 'accuracy': 4}); await pg.wait_for_timeout(150)
            await pg.evaluate('gpsUseNow()')
        st = await pg.evaluate('gpsStats()')
        check(st['n'] == 4 and 8000 < st['area'] < 11000, f"GPS por vértice: {st['n']} vértices, área {st['area']:.0f} m²")
        if SHOTS: await pg.screenshot(path=str(OUT / 'gps_vertices.png'))
        await pg.click('[data-gp=finish]'); await pg.wait_for_timeout(300); await pg.click('.modal .foot .primary'); await pg.wait_for_timeout(300)
        check(await pg.evaluate('S.layers.some(L=>L.name==="Caminhamento GPS"&&L.source.getFeatures().length===1)'), 'GPS salva polígono em camada')

        # GPS simulado: contínuo, linha
        await pg.evaluate('gpsOpen()'); await pg.wait_for_timeout(300)
        await pg.click('#gpMode [data-v=continuo]'); await pg.click('#gpGeom [data-v=linha]'); await pg.click('[data-gp=start]')
        for i in range(12):
            await ctx.set_geolocation({'latitude': base[0], 'longitude': base[1] + i * 0.00005, 'accuracy': 25 if i == 5 else 4}); await pg.wait_for_timeout(180)
        st = await pg.evaluate('gpsStats()')
        check(st['n'] == 11 and 55 < st['d'] < 65, f"GPS contínuo: {st['n']} pontos (1 imprecisa descartada), {st['d']:.1f} m")
        await pg.evaluate('GPS.session=null; gpsSave(); trackSource.clear(); gpsClose()')

        # abertura offline
        await pg.wait_for_timeout(1500); await ctx.set_offline(True); await pg.reload(); await pg.wait_for_timeout(2500)
        check(await pg.evaluate('typeof ol==="object" && S.layers.length>0'), 'abre offline pelo cache do app')
        if SHOTS: await pg.screenshot(path=str(OUT / 'offline.png'))
        check(not errs, 'sem erros de JavaScript' + (f': {errs[:3]}' if errs else ''))
        await b.close()
    srv.shutdown(); print('\n' + ('TUDO OK' if not fails else f'{len(fails)} FALHA(S)')); sys.exit(1 if fails else 0)

asyncio.run(main())
