"""Stage only Qollab runtime files; no local preview or development dependencies."""
from pathlib import Path
from shutil import copyfile
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
FILES = ('index.html', 'main.js', 'main.css', 'game.js', 'model.js',
         'quantum/__init__.py', 'quantum/rhythm.py', 'LICENSE', 'README.md', 'ATTRIBUTION.md')
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
