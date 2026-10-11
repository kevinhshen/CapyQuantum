"""Reference repetition-code circuits for 3–7 data qubits (max 13 physical).

All measurements are terminal. Neighbor ancillas store the injected-error
syndrome. Net X residuals classify multi-key recovery under ideal gates.
The exhaustive bank is for local cross-checks. Qollab submits a single
four-data-qubit recovery experiment; IonQ's simulator rejects circuit batches.
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
        circuits = transpile(circuits, backend, optimization_level=0, num_processes=1)
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


def run_reference(backend, shots=64):
    """One real |+> recovery experiment, not a noisy gameplay lookup bank."""
    if type(shots) is not int or not 1 <= shots <= 1024:
        raise ValueError('Expected 1–1024 shots')
    spec = {'d': 4, 'error': 2, 'fix': 2, 'state': '+'}
    circuit = build_circuit(spec)
    circuit.name = 'qubit_tempo_recovery'
    name = backend_name(backend)
    print(f'Preparing one recovery experiment on {name}: 7 qubits, {shots} shots.', flush=True)
    # One process is required in the browser. Level 1 is also recommended by
    # qiskit-ionq and reduces the gates added by IBM connectivity routing.
    try:
        circuit = transpile(circuit, backend, optimization_level=1,
                            num_processes=1, seed_transpiler=7)
    except (AttributeError, NotImplementedError):
        # Minimal run-only adapters can accept these standard gates directly.
        pass
    print('Submitting one circuit in one job; waiting for measurement results.', flush=True)
    result = backend.run(circuit, shots=shots).result()
    if getattr(result, 'success', True) is False:
        raise RuntimeError(f'{name} did not complete the recovery experiment')
    counts = result.get_counts()
    if not isinstance(counts, dict) or not counts or sum(counts.values()) != shots:
        raise ValueError('The backend returned incomplete measurement counts')
    normalized = {}
    for key, count in counts.items():
        bits = str(key).replace(' ', '')
        if not bits or any(bit not in '01' for bit in bits) or len(bits) > 7:
            raise ValueError('Expected seven classical measurement bits')
        if type(count) is not int or count < 0:
            raise ValueError('Expected nonnegative integer measurement counts')
        bits = bits.zfill(7)
        normalized[bits] = normalized.get(bits, 0) + count
    print('Recovery experiment complete. Gameplay uses the exact ideal model.', flush=True)
    return json.dumps({'version': 1, **spec, 'shots': shots, 'backend': name,
                       'counts': normalized})
