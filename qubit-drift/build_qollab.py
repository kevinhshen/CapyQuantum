"""Generate Qollab's documented index.html/main.js/main.css + Python layout.

The platform's actual bridge, sandbox and simulator still need a live test.
"""
from pathlib import Path
import re
root=Path(__file__).resolve().parent
out=root/'qollab'
(out/'quantum').mkdir(parents=True,exist_ok=True)
html=(root/'index.html').read_text().replace('href="style.css"','href="main.css"').replace('<script type="module" src="game.js"></script>','')
html=html.replace('Local exact simulation · Qiskit verification available with Python dependencies.','Qollab preview · progress lasts for this run only · one free-simulator job per run.')
(out/'index.html').write_text(html)
(out/'main.css').write_text((root/'style.css').read_text())
quantum=re.sub(r'^export ', '', (root/'quantum.js').read_text(),flags=re.MULTILINE)
game=re.sub(r'^import .*?;\n', '', (root/'game.js').read_text(),count=1)
game=game.replace('setTimeout(', 'window.setTimeout(').replace('clearTimeout(', 'window.clearTimeout(')
adapter=r'''
// Qollab supplies the backend and Python import bridge.
$('#qiskit-check').textContent='RUN ON QOLLAB';
$('#check-note').textContent='One selected free-simulator job per project run. Ideal fidelity and sampled counts are separate.';
let qollabJobUsed=false;
$('#qiskit-check').onclick=async()=>{
  if(qollabJobUsed)return;
  if(runState)pause(true);
  const p=clone(program),token=++checkToken,button=$('#qiskit-check');
  button.disabled=true;qollabJobUsed=true;
  const errors=['I',selected===1||(runState&&currentWeather()==='Z')?'Z':'X','I'];
  $('#check-note').textContent='Submitting the installed circuit to the selected free simulator…';
  try{
    const raw=await quantumBridge.run_json.callPromising(backend,JSON.stringify(p),errors.join(''));
    const result=JSON.parse(typeof raw==='string'?raw:raw.toJs());
    if(token===checkToken)$('#check-note').textContent=`Qiskit ideal mean fidelity ${pct(result.ideal_mean)} · backend sampled P(+) ${pct(result.sampled_pplus)} (${result.shots} shots on |+⟩). Counts may differ with noise or finite sampling.`;
    button.textContent='COMPLETE · RERUN FOR ANOTHER JOB';
  }catch(e){$('#check-note').textContent=String(e)+' Rerun the Qollab project before trying again.';button.textContent='RERUN QOLLAB TO RETRY';}
};
'''
(out/'main.js').write_text("import * as quantumBridge from 'quantum.engine';\n"+quantum+'\n'+game+adapter)
server=(root/'server.py').read_text()
functions=server[server.index('def build_circuit'):server.index('class Handler')]
backend=r'''
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
'''
(out/'quantum/engine.py').write_text('import json\nimport math\n\n'+functions+backend)
(out/'quantum/__init__.py').write_text('"""Qubit Drift quantum experiments."""\n')
print(out)
