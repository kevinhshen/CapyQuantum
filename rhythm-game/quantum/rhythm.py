"""Five-qubit repetition-code experiments; one backend job for every game case.

Prepare one of six Pauli eigenstates, encode, inject X errors, extract two
syndromes, apply a candidate correction, undo encoding and preparation.
P(data=000) is fidelity with the original encoded pure state, not majority vote.
Ancillas retain the pre-correction syndrome. All measurements are terminal.
"""
import json
from qiskit import QuantumCircuit, transpile


def build_circuit(spec, measure=True):
    error, fix, state = spec['error'], spec['fix'], spec['state']
    if type(error) is not int or error not in range(8) or fix not in (0, 1, 2, 4):
        raise ValueError('Unsupported error or correction')
    if state not in ('0', '1', '+', '-', '+i', '-i'):
        raise ValueError('Unsupported input state')
    qc = QuantumCircuit(5, 5) if measure else QuantumCircuit(5)
    if state == '1': qc.x(0)
    if state in ('+', '-', '+i', '-i'): qc.h(0)
    if state == '-': qc.z(0)
    if state == '+i': qc.s(0)
    if state == '-i': qc.sdg(0)
    qc.cx(0, 1)
    qc.cx(0, 2)
    for q in range(3):
        if error >> q & 1: qc.x(q)
    qc.cx(0, 3)
    qc.cx(1, 3)
    qc.cx(1, 4)
    qc.cx(2, 4)
    for q in range(3):
        if fix >> q & 1: qc.x(q)
    qc.cx(0, 2)
    qc.cx(0, 1)
    if state == '1': qc.x(0)
    if state == '+i': qc.sdg(0)
    if state == '-i': qc.s(0)
    if state == '-': qc.z(0)
    if state in ('+', '-', '+i', '-i'): qc.h(0)
    if measure: qc.measure(range(5), range(5))
    return qc


def run_batch(backend, specs_json, shots=128):
    specs = json.loads(specs_json)
    if len(specs) != 192:
        raise ValueError('Expected all 192 rhythm experiments')
    circuits = [build_circuit(s) for s in specs]
    # Keep the existing project's provider-compatible transpilation behavior.
    try:
        circuits = transpile(circuits, backend, optimization_level=0)
    except (AttributeError, NotImplementedError):
        pass
    result = backend.run(circuits, shots=int(shots)).result()
    rows = []
    for i in range(len(specs)):
        group = []
        for key, count in result.get_counts(i).items():
            bits = key.replace(' ', '')[::-1]
            group.append({'syn': [int(bits[3]), int(bits[4])],
                          'pass': bits[:3] == '000', 'weight': int(count)})
        rows.append(group)
    return json.dumps(rows)


def backend_name(backend):
    name = getattr(backend, 'name', type(backend).__name__)
    return str(name() if callable(name) else name)
