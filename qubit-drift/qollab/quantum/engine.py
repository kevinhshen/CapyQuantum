import json
import math

def build_circuit(program, errors, theta, phi):
    from qiskit import QuantumCircuit
    qc = QuantumCircuit(5)
    qc.ry(theta, 0)
    qc.p(phi, 0)
    gates = sorted(program['gates'], key=lambda g: (g['col'], g['q']))
    def apply(g):
        if g['type'] == 'CX':
            qc.cx(g['control'], g['q'])
        else:
            getattr(qc, g['type'].lower())(g['q'])
    for g in gates:
        apply(g)
    for q, error in enumerate(errors):
        if error != 'I':
            getattr(qc, error.lower())(q)
    if program['basis'] == 'X':
        for q in range(3): qc.h(q)
    if program['basis'] != 'OFF':
        for a, b in [(0,3), (1,3), (0,4), (2,4)]: qc.cx(a,b)
    for s in ([] if program['basis']=='OFF' else ['00','01','10','11']):
        q = program['decoder'][s]
        if q < 0: continue
        if s[0] == '0': qc.x(3)
        if s[1] == '0': qc.x(4)
        qc.ccx(3,4,q)
        if s[0] == '0': qc.x(3)
        if s[1] == '0': qc.x(4)
    if program['basis'] == 'X':
        for q in range(3): qc.h(q)
    for g in reversed(gates): apply(g)
    return qc


def validate(program, errors):
    if program.get('basis') not in ['X','Z','OFF'] or not isinstance(program.get('gates'), list) or len(program['gates']) > 24:
        raise ValueError('Invalid program')
    used = set()
    for g in program['gates']:
        if g.get('type') not in ['H','X','Z','CX'] or type(g.get('q')) is not int or g['q'] not in range(3) or type(g.get('col')) is not int or g['col'] not in range(8):
            raise ValueError('Invalid gate')
        qs = [g['q']]
        if g['type'] == 'CX':
            if type(g.get('control')) is not int or g['control'] not in range(3) or g['control'] == g['q']:
                raise ValueError('Invalid controlled gate')
            qs.append(g['control'])
        for q in qs:
            key=(g['col'],q)
            if key in used: raise ValueError('Overlapping gates')
            used.add(key)
    if set(program.get('decoder',{})) != {'00','01','10','11'} or any(type(q) is not int or q not in [-1,0,1,2] for q in program['decoder'].values()):
        raise ValueError('Invalid decoder')
    if len(errors) != 3 or any(e not in ['I','X','Y','Z'] for e in errors): raise ValueError('Invalid errors')


def analyze(program, errors):
    import numpy as np
    from qiskit.quantum_info import Statevector, partial_trace, state_fidelity
    validate(program, errors)
    result=[]
    inputs=[(0,0),(math.pi,0),(math.pi/2,0),(math.pi/2,math.pi),(math.pi/2,math.pi/2),(math.pi/2,3*math.pi/2)]
    for theta, phi in inputs:
        qc=build_circuit(program,errors,theta,phi)
        rho=partial_trace(Statevector.from_instruction(qc),[1,2,3,4])
        target=Statevector([math.cos(theta/2),np.exp(1j*phi)*math.sin(theta/2)])
        result.append(float(state_fidelity(rho,target)))
    return {'fidelity':float(np.mean(result)), 'per_state':result,'engine':'Qiskit Statevector'}



def run_json(backend, program_json, error_string):
    from qiskit import transpile
    program=json.loads(program_json)
    errors=list(error_string)
    validate(program,errors)
    known=type(backend).__name__ in ('BasicSimulator','AerSimulator') or type(backend).__name__.startswith('Fake')
    config=backend.configuration() if hasattr(backend,'configuration') else None
    if not (known or getattr(config,'simulator',False)):
        raise ValueError('Choose a free simulator. This game does not submit hardware jobs.')
    circuit=build_circuit(program,errors,math.pi/2,0)
    circuit.h(0)
    circuit.measure_all()
    compiled=transpile(circuit,basis_gates=['rx','ry','rz','h','x','y','z','cx'],optimization_level=1)
    counts=backend.run(compiled,shots=256).result().get_counts()
    total=sum(counts.values())
    pplus=sum(n for bits,n in counts.items() if bits.replace(' ','')[-1]=='0')/total
    return json.dumps({'ideal_mean':analyze(program,errors)['fidelity'],'sampled_pplus':pplus,'shots':total,'counts':counts})
