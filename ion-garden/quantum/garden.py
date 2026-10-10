"""Qiskit recovery kernel used directly by the Qollab game simulation.

All 32 error-mask/clue combinations are evaluated by quantum circuits. The
selected free backend samples a separate complete recovery circuit in one job.
The management noise rates and timing remain explicit game assumptions.
"""
import json


def circuit(mask, clue, decode=False):
    from qiskit import QuantumCircuit
    qc = QuantumCircuit(5)
    qc.cx(0, 1)
    qc.cx(0, 2)
    for q, bit in enumerate(mask):
        if bit: qc.x(q)
    qc.cx(0, 3)
    qc.cx(1, 3)
    qc.cx(0, 4)
    qc.cx(2, 4)
    actual = [mask[0] ^ mask[1], mask[0] ^ mask[2]]
    for q in range(2):
        if actual[q] != clue[q]: qc.x(q+3)
    qc.ccx(3, 4, 0)
    qc.x(4)
    qc.ccx(3, 4, 1)
    qc.x(4)
    qc.x(3)
    qc.ccx(3, 4, 2)
    qc.x(3)
    if decode:
        qc.cx(0, 2)
        qc.cx(0, 1)
    return qc


def kernel():
    from qiskit.quantum_info import Statevector
    table = {}
    for m in range(8):
        mask = [(m >> q) & 1 for q in range(3)]
        for c in range(4):
            clue = [(c >> q) & 1 for q in range(2)]
            probs = Statevector.from_instruction(circuit(mask, clue)).probabilities()
            basis = int(probs.argmax())
            table[''.join(map(str, mask))+':'+''.join(map(str, clue))] = [(basis >> q) & 1 for q in range(3)]
    return table


def run_json(backend):
    from qiskit import transpile
    known = type(backend).__name__ in ('BasicSimulator', 'AerSimulator') or type(backend).__name__.startswith('Fake')
    config = backend.configuration() if hasattr(backend, 'configuration') else None
    if not (known or getattr(config, 'simulator', False)):
        raise ValueError('Select a free simulator. Ion Garden does not submit hardware jobs.')
    table = kernel()
    qc = circuit([1, 0, 0], [1, 1], decode=True)
    qc.measure_all()
    compiled = transpile(qc, basis_gates=['rx', 'ry', 'rz', 'h', 'x', 'y', 'z', 'cx'], optimization_level=1)
    counts = backend.run(compiled, shots=128).result().get_counts()
    return json.dumps({'kernel': table, 'counts': counts, 'shots': sum(counts.values()), 'model': 'Qiskit Statevector recovery kernel + selected simulator sample'})
