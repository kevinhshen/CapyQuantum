"""Generate a local Qiskit-backed preview from one free BasicSimulator job."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from qiskit.providers.basic_provider import BasicSimulator
from quantum.rhythm import run_batch

specs = [{'error': error, 'fix': fix, 'state': state}
         for error in range(8) for fix in (0, 1, 2, 4)
         for state in ('0', '1', '+', '-', '+i', '-i')]
rows = json.loads(run_batch(BasicSimulator(seed_simulator=42), json.dumps(specs), 128))
payload = {'label': 'Qiskit · BasicSimulator (cached shots)', 'specs': specs, 'rows': rows}
(ROOT / 'qiskit-results.json').write_text(json.dumps(payload), encoding='utf-8')
print('Prepared 192 Qiskit cases in one free BasicSimulator job. Open qiskit.html after starting the preview server.')
