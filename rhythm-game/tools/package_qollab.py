"""Build Qollab's upload layout, stylesheet bundle, and project-page write-up."""
import json
import re
from pathlib import Path
from shutil import rmtree
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
FILES = ('index.html', 'main.js', 'main.css', 'game.js', 'tutorial.js', 'model.js', 'timing.js', 'maps.js', 'songs.js', 'rhythm.js', 'audio.js', 'garden.js', 'sphere.js', 'feedback.js', 'content.js',
         'LEVEL_AUTHORING.md', 'level-making-rules.md', 'content-assets.json',
         'quantum/__init__.py', 'quantum/rhythm.py', 'requirements.txt', 'LICENSE', 'README.md', 'ATTRIBUTION.md')
assets = json.loads((ROOT / 'content-assets.json').read_text())
if not isinstance(assets, list) or any(not isinstance(name, str) for name in assets):
    raise ValueError('content-assets.json must be an array of local asset paths.')
FILES = tuple(dict.fromkeys((*FILES, *assets)))
if len(FILES) > 100: raise ValueError('Qollab allows at most 100 files.')
contents = {}
for name in FILES:
    source = (ROOT / ('QOLLAB_PROJECT.md' if name == 'README.md' else name)).resolve()
    if Path(name).is_absolute() or '..' in Path(name).parts or not source.is_relative_to(ROOT.resolve()):
        raise ValueError(f'Asset must stay inside the game folder: {name}')
    if not source.is_file():
        raise ValueError(f'Missing Qollab file: {name}')
    contents[name] = source.read_bytes()

# Qollab injects body markup and loads only main.css, not linked stylesheets.
body = re.search(r'<body\b[^>]*>(.*?)</body\s*>', contents['index.html'].decode('utf-8'), re.I | re.S)
if body is None:
    raise ValueError('The source index.html must have a body to package.')
contents['index.html'] = (body.group(1).strip() + '\n').encode('utf-8')
contents['main.css'] += b'\n\n/* Bundled hit and hold feedback for Qollab. */\n' + (ROOT / 'feedback.css').read_bytes()
for name, data in contents.items():
    if len(data) > 2_000_000:
        raise ValueError(f'Qollab file too large: {name}')
if len(contents['README.md'].decode('utf-8')) > 65_000:
    raise ValueError('Qollab project write-up exceeds 65,000 characters.')

target = ROOT / 'upload'
# Recreate generated output so removed songs/styles cannot survive a rebuild.
if target.is_symlink():
    raise ValueError('The generated upload folder must not be a symlink.')
if target.exists():
    rmtree(target)
target.mkdir()
with ZipFile(ROOT / 'qubit-tempo-qollab.zip', 'w', ZIP_DEFLATED) as archive:
    for name, data in contents.items():
        destination = target / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
        archive.writestr(name, data)
print(f'Staged {len(FILES)} files in upload/ and qubit-tempo-qollab.zip. Choose Upload your own files; the runtime is JS / Qiskit.')
