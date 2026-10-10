"""Generate a local Qiskit-backed preview from one free BasicSimulator job."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from qiskit.providers.basic_provider import BasicSimulator
from quantum.rhythm import run_batch, all_specs

specs = all_specs()
rows = json.loads(run_batch(BasicSimulator(seed_simulator=42), json.dumps(specs), 64))
payload = {'label': 'Qiskit · BasicSimulator (cached shots)', 'specs': specs, 'rows': rows}
(ROOT / 'qiskit-results.json').write_text(json.dumps(payload), encoding='utf-8')
print('Prepared 298 Qiskit cases in one free BasicSimulator job. Open qiskit.html after starting the preview server.')
