"""A coherent three-qubit bit-flip code with two syndrome ancillas.

Ideal operations, selected Pauli errors, one correction round. This is not
a full quantum error-correcting code, a hardware noise model, or fault tolerance.
"""
from __future__ import annotations

import argparse
import json
import math

import numpy as np
from qiskit import QuantumCircuit
from qiskit.primitives import StatevectorSampler
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity


def build_circuit(theta: float, phi: float, errors: list[str], stage: int = 4) -> QuantumCircuit:
    """Stages: 0 prepare, 1 encode, 2 inject, 3 syndrome, 4 recover/decode.

    q0 is the logical input, q1/q2 are data helpers, q3=s01 and q4=s02.
    Syndrome measurement is deferred: ancillas control unitary correction gates.
    """
    if len(errors) != 3 or any(e not in "IXYZ" or len(e) != 1 for e in errors):
        raise ValueError("Specify exactly three errors chosen from I, X, Y, Z")
    if stage not in range(5):
        raise ValueError("stage must be 0..4")
    qc = QuantumCircuit(5, name="capy_recovery")
    qc.ry(theta, 0)
    qc.p(phi, 0)
    if stage >= 1:
        qc.cx(0, 1)
        qc.cx(0, 2)
    if stage >= 2:
        qc.barrier()
        for q, error in enumerate(errors):
            if error != "I":
                getattr(qc, error.lower())(q)
    if stage >= 3:
        qc.barrier()
        qc.cx(0, 3)
        qc.cx(1, 3)
        qc.cx(0, 4)
        qc.cx(2, 4)
    if stage >= 4:
        # s01 s02 = 11 -> q0, 10 -> q1, 01 -> q2.
        qc.ccx(3, 4, 0)
        qc.x(4)
        qc.ccx(3, 4, 1)
        qc.x(4)
        qc.x(3)
        qc.ccx(3, 4, 2)
        qc.x(3)
        qc.cx(0, 2)
        qc.cx(0, 1)
    return qc


def analyze(theta: float, phi: float, errors: list[str]) -> dict:
    qc = build_circuit(theta, phi, errors)
    sv = Statevector.from_instruction(qc)
    rho = partial_trace(sv, [1, 2, 3, 4])
    target = Statevector([math.cos(theta / 2), np.exp(1j * phi) * math.sin(theta / 2)])
    flips = [int(e in ("X", "Y")) for e in errors]
    return {
        "fidelity": float(state_fidelity(rho, target)),
        "syndrome": [flips[0] ^ flips[1], flips[0] ^ flips[2]],
        "p0_z": float(rho.data[0, 0].real),
        "pplus_x": float(0.5 + rho.data[0, 1].real),
        "statevector": [[float(x.real), float(x.imag)] for x in sv.data],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--theta", type=float, default=90, help="Polar angle in degrees")
    parser.add_argument("--phi", type=float, default=0, help="Relative phase in degrees")
    parser.add_argument("--errors", nargs=3, choices=list("IXYZ"), default=["I", "X", "I"])
    parser.add_argument("--shots", type=int, default=1024)
    parser.add_argument("--json", action="store_true", help="Exact diagnostic JSON without sampling")
    args = parser.parse_args()
    if not (0 <= args.theta <= 180 and 0 <= args.phi <= 360) or args.shots < 1:
        parser.error("theta must be 0..180, phi 0..360, shots positive")
    theta, phi = math.radians(args.theta), math.radians(args.phi)
    result = analyze(theta, phi, args.errors)
    if args.json:
        print(json.dumps(result))
        return
    circuit = build_circuit(theta, phi, args.errors)
    print(circuit.draw(output="text"))
    print(f"Recovered-state fidelity: {result['fidelity']:.6f}")
    print("Syndrome s01,s02:", result["syndrome"])
    for basis in ("Z", "X"):
        measured = circuit.copy()
        if basis == "X":
            measured.h(0)
        measured.measure_all()
        counts = StatevectorSampler(seed=42).run([measured], shots=args.shots).result()[0].data.meas.get_counts()
        print(f"{basis} basis sampled counts (q4 q3 q2 q1 q0):", counts)


if __name__ == "__main__":
    main()
