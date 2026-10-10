"""Read JS fixtures from stdin and independently compare using Qiskit."""
import json
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import analyze, validate, build_circuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity
import numpy as np

fixtures=json.load(sys.stdin)
count=0
for row in fixtures:
    for item in row['cases']:
        sv=Statevector.from_instruction(build_circuit(row['program'],item['errors'],item['theta'],item['phi']))
        rho=partial_trace(sv,[1,2,3,4])
        target=Statevector([np.cos(item['theta']/2),np.exp(1j*item['phi'])*np.sin(item['theta']/2)])
        actual=float(state_fidelity(rho,target))
        assert abs(actual-item['fidelity'])<1e-9,(row['program']['name'],item,actual)
        assert np.max(np.abs(sv.data-np.array(item['statevector'])[:,0]-1j*np.array(item['statevector'])[:,1]))<1e-9
        count+=1
print(f'{count} browser/Qiskit full-statevector and fidelity comparisons passed.')
