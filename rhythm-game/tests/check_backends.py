"""Native-library compatibility checks; never submits a remote or paid job.

Requires qiskit, qiskit-aer, qiskit-ibm-runtime, qiskit-braket-provider, and
qiskit-ionq in the test environment, not in the Qollab upload requirements.
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from quantum.rhythm import build_circuit, run_reference
from qiskit import QuantumCircuit, transpile
from qiskit.providers.basic_provider import BasicSimulator
from qiskit_braket_provider import BraketLocalBackend
from qiskit_ibm_runtime import fake_provider
from qiskit_ionq import IonQProvider, helpers


class Counted:
    def __init__(self, inner):
        self.inner, self.calls = inner, 0

    def __getattr__(self, key):
        return getattr(self.inner, key)

    def run(self, circuit, **kwargs):
        assert isinstance(circuit, QuantumCircuit), 'IonQ requires a single circuit'
        self.calls += 1
        assert self.calls == 1, 'Only one backend job is permitted'
        return self.inner.run(circuit, **kwargs)


def check(factory, ideal=False):
    started = time.monotonic()
    backend = Counted(factory())
    value = json.loads(run_reference(backend, 64))
    assert backend.calls == 1
    assert value['d'] == 4 and value['error'] == value['fix'] == 2 and value['state'] == '+'
    assert sum(value['counts'].values()) == value['shots'] == 64
    assert all(len(key) == 7 and set(key) <= set('01') for key in value['counts'])
    if ideal:
        assert value['counts'] == {'0110000': 64}
    print(json.dumps({'backend':value['backend'], 'status':'native execution passed',
                      'seconds':round(time.monotonic()-started,2), 'counts':value['counts']}), flush=True)


check(BasicSimulator, True)
check(BraketLocalBackend, True)
for name in ('Boston','Kingston','Pittsburgh','Fez','Marrakesh','Miami','Aachen','Berlin'):
    check(getattr(fake_provider, 'Fake' + name))

# The serializer uses an inert placeholder, and no network method is called.
backend = IonQProvider(token='offline-serialization-only').get_backend('ionq_simulator')
circuit = transpile(build_circuit({'d':4,'error':2,'fix':2,'state':'+'}), backend,
                    optimization_level=1, num_processes=1, seed_transpiler=7)
payload = json.loads(helpers.qiskit_to_ionq(circuit, backend, passed_args={'shots':64}))
assert payload['type'] == 'ionq.circuit.v1'
assert 'circuits' not in payload['input'] and payload['input']['qubits'] == 7
print(json.dumps({'backend':'IonQ', 'status':'offline single-circuit serialization passed; live execution separate'}))
