"""Stage only Qollab runtime files; no local preview or development dependencies."""
import json
from pathlib import Path
from shutil import copyfile
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
FILES = ('index.html', 'main.js', 'main.css', 'game.js', 'model.js', 'timing.js', 'maps.js', 'rhythm.js', 'audio.js', 'garden.js', 'content.js',
         'LEVEL_AUTHORING.md', 'content-assets.json',
         'quantum/__init__.py', 'quantum/rhythm.py', 'LICENSE', 'README.md', 'ATTRIBUTION.md')
assets = json.loads((ROOT / 'content-assets.json').read_text())
if not isinstance(assets, list) or any(not isinstance(name, str) for name in assets):
    raise ValueError('content-assets.json must be an array of local asset paths.')
FILES = tuple(dict.fromkeys((*FILES, *assets)))
if len(FILES) > 100: raise ValueError('Qollab allows at most 100 files.')
for name in FILES:
    source = (ROOT / name).resolve()
    if Path(name).is_absolute() or '..' in Path(name).parts or not source.is_relative_to(ROOT.resolve()):
        raise ValueError(f'Asset must stay inside the game folder: {name}')
    if not source.is_file() or source.stat().st_size > 2_000_000:
        raise ValueError(f'Missing or oversized Qollab file: {name}')
target = ROOT / 'upload'
target.mkdir(exist_ok=True)
with ZipFile(ROOT / 'qubit-tempo-qollab.zip', 'w', ZIP_DEFLATED) as archive:
    for name in FILES:
        source = ROOT / name
        if source.stat().st_size > 2_000_000: raise ValueError(f'Qollab file too large: {name}')
        destination = target / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        copyfile(source, destination)
        archive.write(source, name)
print(f'Staged {len(FILES)} files in upload/ and qubit-tempo-qollab.zip. Select a JS / Qiskit project and a free simulator.')
