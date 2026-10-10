"""Build a one-file, offline player; optionally embed verified Qiskit shots."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
model = re.sub(r'\bexport\s+', '', (ROOT / 'model.js').read_text())
game = re.sub(r'^import .*?;\n', '', (ROOT / 'game.js').read_text(), flags=re.M)
game = re.sub(r'\bexport\s+', '', game)
cache = ROOT / 'qiskit-results.json'
if cache.exists():
    data = json.loads(cache.read_text())
    engine = "const snapshot = " + json.dumps(data) + ";\nconst playerEngine = { label: 'Qiskit · BasicSimulator (recorded shots)', kind: 'qiskit', async run(specs) { if (specs.length !== snapshot.specs.length || specs.some((s,i) => keyOf(s) !== keyOf(snapshot.specs[i]))) throw new Error('Recorded circuit mismatch'); return snapshot.rows; } };"
else:
    engine = 'const playerEngine = localEngine;'
script = model + '\n' + game + '\n' + engine + "\nawait startGame(document.getElementById('app'), playerEngine);"
script = script.replace('</script', '<\\/script')
css = (ROOT / 'main.css').read_text()
html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Qubit Tempo · CapyQuantum</title><style>' + css + '</style></head><body><div id="app"><p class="loading" role="status">Preparing Qubit Tempo…</p></div><script type="module">' + script + '</script></body></html>'
(ROOT / 'PLAY.html').write_text(html, encoding='utf-8')
print('Created PLAY.html with ' + ('recorded Qiskit BasicSimulator results.' if cache.exists() else 'the exact local JS simulator.'))
