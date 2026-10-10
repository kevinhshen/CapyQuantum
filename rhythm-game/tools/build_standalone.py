"""Build a one-file, offline player; optionally embed verified Qiskit shots."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
modules = []
for name in ('model.js', 'timing.js', 'maps.js', 'rhythm.js', 'audio.js', 'garden.js', 'content.js', 'tutorial.js', 'game.js'):
    source = re.sub(r'^import .*?;\n', '', (ROOT / name).read_text(), flags=re.M)
    modules.append(re.sub(r'\bexport\s+', '', source))
cache = ROOT / 'qiskit-results.json'
if cache.exists():
    data = json.loads(cache.read_text())
    engine = "const snapshot = " + json.dumps(data) + ";\nconst playerEngine = { label: 'Qiskit · BasicSimulator (recorded shots)', kind: 'qiskit', async run(specs) { if (specs.length !== snapshot.specs.length || specs.some((s,i) => keyOf(s) !== keyOf(snapshot.specs[i]))) throw new Error('Recorded circuit mismatch'); return snapshot.rows; } };"
else:
    engine = 'const playerEngine = localEngine;'
script = '\n'.join(modules) + '\n' + engine + "\nawait startGame(document.getElementById('app'), playerEngine);"
script = script.replace('</script', '<\\/script')
css = (ROOT / 'main.css').read_text()
html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Qubit Tempo · CapyQuantum</title><style>' + css + '</style></head><body><div id="app"><p class="loading" role="status">Preparing Qubit Tempo…</p></div><script type="module">' + script + '</script></body></html>'
(ROOT / 'PLAY.html').write_text(html, encoding='utf-8')
print('Created PLAY.html with ' + ('recorded Qiskit BasicSimulator results.' if cache.exists() else 'the exact local JS simulator.'))
