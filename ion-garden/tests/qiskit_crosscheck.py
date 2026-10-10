"""Consume browser-generated fixtures and independently evaluate Qiskit circuits."""
import json
import math
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity
from qiskit.providers.basic_provider import BasicSimulator
from quantum.garden import circuit, kernel, run_json

fixtures=json.load(sys.stdin)
table=kernel()
for f in fixtures:
    qc=QuantumCircuit(5)
    qc.ry(f['theta'],0)
    qc.p(f['phi'],0)
    qc=qc.compose(circuit(f['mask'],f['clue'],decode=True))
    rho=partial_trace(Statevector.from_instruction(qc),[1,2,3,4])
    target=Statevector([math.cos(f['theta']/2),np.exp(1j*f['phi'])*math.sin(f['theta']/2)])
    fidelity=float(state_fidelity(rho,target))
    assert abs(fidelity-f['fidelity'])<1e-9,(f,fidelity)
    key=''.join(map(str,f['mask']))+':'+''.join(map(str,f['clue']))
    assert table[key]==f['frame'],(key,table[key],f['frame'])
data=json.loads(run_json(BasicSimulator(),))
assert len(data['kernel'])==32
assert data['shots']==128
assert all(bits.replace(' ','')[-1]=='0' for bits in data['counts'])
print(f'{len(fixtures)} browser/Qiskit fidelity comparisons passed; all 32 recovery rules agree; BasicSimulator adapter passed (128 shots).')
