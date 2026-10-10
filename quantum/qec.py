"""Error Lab: repetition-code experiments built with Qiskit.

Every experiment in the game is described by a small JSON "spec":

    {
      "code":    "bit" | "phase",  # which repetition code
      "d":       3,                # distance = number of data qubits
      "theta":   1.047,            # Ry angle of the stored logical state
      "errors":  [{"q": 1, "p": "X"}],
      "fix":     [1],              # corrections the player applied
      "late":    [{"q": 2, "p": "X"}],  # errors that strike after the fix
      "basis":   "Z" | "X"         # basis the data qubits are measured in
    }

Qubit layout: data qubits 0..d-1, then ancillas d..2d-2.
Ancilla i checks the parity of data qubits i and i+1.
Classical bit layout: syndrome bits 0..d-2, then data qubits d-1..2d-2.
The game reads the logical value from the data bits: majority vote in the
code's own basis, or parity for an X-basis readout of the bit-flip code.

Errors are injected as explicit Pauli gates, so the game behaves the same
on an ideal simulator and the player always knows the ground truth. On a
noise-model backend, the device's own noise is added on top.
"""

import json

from qiskit import QuantumCircuit, transpile


def build_circuit(spec):
    code = spec.get("code", "bit")
    d = int(spec.get("d", 3))
    theta = float(spec.get("theta", 0.0))
    basis = spec.get("basis", "Z")
    n_anc = d - 1

    qc = QuantumCircuit(d + n_anc, n_anc + d)
    data = list(range(d))
    anc = list(range(d, d + n_anc))

    # 1. Encode the logical state across all data qubits.
    if theta:
        qc.ry(theta, 0)
    for q in data[1:]:
        qc.cx(0, q)
    if code == "phase":
        qc.h(data)
    qc.barrier()

    # 2. Inject the errors the game chose.
    _apply_errors(qc, spec.get("errors", []))
    qc.barrier()

    # 3. Syndrome extraction: each ancilla records a neighbouring parity.
    #    The phase code checks parities in the X basis.
    if n_anc:
        if code == "phase":
            qc.h(data)
        for i, a in enumerate(anc):
            qc.cx(data[i], a)
            qc.cx(data[i + 1], a)
        if code == "phase":
            qc.h(data)
        qc.barrier()

    # 4. The player's corrections.
    for q in spec.get("fix", []):
        if code == "phase":
            qc.z(q)
        else:
            qc.x(q)
    if spec.get("fix"):
        qc.barrier()

    # 5. Errors that strike after the fix.
    if spec.get("late"):
        _apply_errors(qc, spec["late"])
        qc.barrier()

    # 6. Measure every data qubit (in the X basis for the phase code, or
    #    when the game asks for an X-basis readout of the bit-flip code).
    if code == "phase" or basis == "X":
        qc.h(data)
    for i, q in enumerate(data):
        qc.measure(q, n_anc + i)

    for i, a in enumerate(anc):
        qc.measure(a, i)
    return qc


def _apply_errors(qc, errors):
    for err in errors:
        if err["p"] == "X":
            qc.x(err["q"])
        else:
            qc.z(err["q"])


def parse_counts(counts, spec):
    """Turn Qiskit counts into [{"syn": [...], "data": [...], "count": n}]."""
    d = int(spec.get("d", 3))
    n_anc = d - 1
    rows = []
    for key, n in counts.items():
        bits = key.replace(" ", "")[::-1]  # bits[i] is classical bit i
        rows.append({
            "syn": [int(b) for b in bits[:n_anc]],
            "data": [int(b) for b in bits[n_anc:]],
            "count": int(n),
        })
    return rows


def backend_info(backend):
    name = getattr(backend, "name", None)
    if callable(name):
        name = name()
    name = str(name or type(backend).__name__)
    label = (name + " " + type(backend).__module__).lower()
    return json.dumps({"name": name, "one_job": "ionq" in label})


def run_specs(backend, specs_json, shots_json):
    """Run a batch of specs in a single backend job.

    shots_json is either one number or a list with one shot count per spec.
    Different shot counts are grouped, so this is one job per distinct count.
    The engine always sends one count when the backend allows only one job.
    """
    specs = json.loads(specs_json)
    shots = json.loads(shots_json)
    if not isinstance(shots, list):
        shots = [shots] * len(specs)

    circuits = [build_circuit(s) for s in specs]
    try:
        circuits = transpile(circuits, backend, optimization_level=0)
    except Exception:
        pass  # some providers transpile on their side

    results = [None] * len(specs)
    groups = {}
    for i, s in enumerate(shots):
        groups.setdefault(int(s), []).append(i)
    for n_shots, idxs in groups.items():
        job = backend.run([circuits[i] for i in idxs], shots=n_shots)
        result = job.result()
        for j, i in enumerate(idxs):
            results[i] = parse_counts(result.get_counts(j), specs[i])
    return json.dumps(results)


def draw(spec_json):
    return str(build_circuit(json.loads(spec_json)).draw("text", fold=-1))
