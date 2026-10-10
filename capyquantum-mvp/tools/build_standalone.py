"""Generate a single HTML preview; the optional Python check needs server.py."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "dist"
DEST.mkdir(exist_ok=True)
html = (ROOT / "web/index.html").read_text()
css = (ROOT / "web/style.css").read_text()
engine = (ROOT / "web/engine.js").read_text().replace("export ", "")
app = (ROOT / "web/app.js").read_text().split("\n", 1)[1]
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + css + '</style>')
html = html.replace('<script type="module" src="app.js"></script>', '<script type="module">' + engine + '\n' + app + '</script>')
(DEST / "CapyQuantum.html").write_text(html)
print(DEST / "CapyQuantum.html")
