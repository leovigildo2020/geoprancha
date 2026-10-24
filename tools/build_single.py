"""Gera dist/GeoPrancha.html: um único arquivo com tudo embutido (uso no computador sem servidor).
Uso: python3 tools/build_single.py
Observação: a versão de arquivo único não tem GPS nem modo offline (exigem HTTPS e service worker)."""
import pathlib, re
R = pathlib.Path(__file__).resolve().parent.parent
html = (R / 'index.html').read_text(encoding='utf-8')
def inline_css(m):
    return '<style>' + (R / m.group(1)).read_text(encoding='utf-8') + '</style>'
def inline_js(m):
    return '<script>' + (R / m.group(1)).read_text(encoding='utf-8') + '</script>'
html = re.sub(r'<link rel="stylesheet" href="((?:vendor|css)/[^"]+)">', inline_css, html)
html = re.sub(r'<script src="((?:vendor|js)/[^"]+)"></script>', inline_js, html)
html = re.sub(r'<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n?', '', html)
out = R / 'dist' / 'GeoPrancha.html'; out.parent.mkdir(exist_ok=True); out.write_text(html, encoding='utf-8')
print(f'{out} ({out.stat().st_size // 1024} KB)')
