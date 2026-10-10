"""Reference repetition-code circuits for 3–7 data qubits (max 13 physical).

All measurements are terminal. Neighbor ancillas store the injected-error
syndrome. Net X residuals classify multi-key recovery under ideal gates.
The bank is a reference experiment; provider noise is not a full trajectory.
"""
import json
from qiskit import QuantumCircuit, transpile

STATES = ('0', '1', '+', '-', '+i', '-i')


def all_specs():
    specs = []
    for d in range(3, 8):
        specs.extend({'d': d, 'error': e, 'fix': 0, 'state': '0'} for e in range(1 << d))
        specs.extend({'d': d, 'error': e, 'fix': 0, 'state': s}
                     for e in (0, (1 << d) - 1) for s in STATES[1:])
    return specs


def build_circuit(spec, measure=True):
    d, error, fix, state = spec.get('d', 3), spec['error'], spec.get('fix', 0), spec['state']
    if type(d) is not int or d not in range(3, 8):
        raise ValueError('Expected 3–7 data qubits')
    if any(type(m) is not int or not 0 <= m < 1 << d for m in (error, fix)) or state not in STATES:
        raise ValueError('Invalid error, correction, or input state')
    n = 2 * d - 1
    qc = QuantumCircuit(n, n) if measure else QuantumCircuit(n)
    if state == '1': qc.x(0)
    if state in ('+', '-', '+i', '-i'): qc.h(0)
    if state == '-': qc.z(0)
    if state == '+i': qc.s(0)
    if state == '-i': qc.sdg(0)
    for q in range(1, d): qc.cx(0, q)
    for q in range(d):
        if error >> q & 1: qc.x(q)
    for q in range(d - 1):
        qc.cx(q, d + q)
        qc.cx(q + 1, d + q)
    for q in range(d):
        if fix >> q & 1: qc.x(q)
    for q in range(d - 1, 0, -1): qc.cx(0, q)
    if state == '1': qc.x(0)
    if state == '+i': qc.sdg(0)
    if state == '-i': qc.s(0)
    if state == '-': qc.z(0)
    if state in ('+', '-', '+i', '-i'): qc.h(0)
    if measure: qc.measure(range(n), range(n))
    return qc


def run_batch(backend, specs_json, shots=64):
    specs = json.loads(specs_json)
    if specs != all_specs():
        raise ValueError('Expected the complete 298-case reference bank')
    circuits = [build_circuit(s) for s in specs]
    try:
        circuits = transpile(circuits, backend, optimization_level=0)
    except (AttributeError, NotImplementedError):
        pass
    result = backend.run(circuits, shots=int(shots)).result()
    rows = []
    for i, spec in enumerate(specs):
        d = spec['d']
        rows.append([{'syn': [int(b) for b in key.replace(' ', '')[::-1][d:]],
                      'pass': key.replace(' ', '')[::-1][:d] == '0' * d,
                      'weight': int(count)} for key, count in result.get_counts(i).items()])
    return json.dumps(rows)


def backend_name(backend):
    name = getattr(backend, 'name', type(backend).__name__)
    return str(name() if callable(name) else name)
