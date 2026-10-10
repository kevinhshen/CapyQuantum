"""Build the documented Qollab JS/Qiskit layout from the local app sources."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "qollab"
DEST.mkdir(exist_ok=True)
(DEST / "quantum").mkdir(exist_ok=True)
html = (ROOT / "web/index.html").read_text()
html = html.replace('href="style.css"', 'href="main.css"')
html = html.replace('<script type="module" src="app.js"></script>', '')
html = html.replace('Browser statevector lab · MIT', 'Qiskit + browser statevector lab · MIT')
html = html.replace('The browser runs its own exact statevector model. Export produces the equivalent Qiskit circuit; no Qollab or quantum-hardware job is sent from this page.', 'The browser provides ideal statevector diagnostics. The Qollab button submits one X-basis circuit to your selected free simulator; sampled counts are separate from ideal fidelity. Rerun the project to submit another job.')
(DEST / "index.html").write_text(html)
(DEST / "main.css").write_text((ROOT / "web/style.css").read_text())
engine = (ROOT / "web/engine.js").read_text().replace("export ", "")
app = (ROOT / "web/app.js").read_text().split("\n", 1)[1]
adapter = r'''
// Qollab injects the selected backend. Its documented Python import bridge is
// asynchronous; a page run sends at most one backend job (IonQ's run limit).
$('#verify-qiskit').textContent='Run X basis on Qollab';
$('#qiskit-verification').textContent='Choose a free simulator in Qollab. One sampled backend job per project run.';
let qollabJobUsed=false;
$('#verify-qiskit').onclick=async()=>{
  if(qollabJobUsed)return;
  stop();step=4;render();const generation=checkGeneration,button=$('#verify-qiskit'),label=$('#qiskit-verification');
  button.disabled=true;label.textContent='Running the circuit on your selected free simulator…';
  try{
    const raw=await quantum.run_backend_json.callPromising(backend,theta,phi,errors.join(''),'X',256);
    const result=JSON.parse(typeof raw==='string'?raw:raw.toJs());
    qollabJobUsed=true;
    if(generation===checkGeneration)label.textContent=`Selected simulator · sampled P(+) ${(100*result.sampled_probability).toFixed(1)}% (${result.shots} shots). Ideal Qiskit fidelity ${pct(result.ideal_fidelity)}. Noise and finite sampling can change the counts.`;
    button.textContent='Job complete · rerun Qollab for another';
  }catch(error){label.textContent=String(error);}
  finally{button.disabled=qollabJobUsed;}
};
'''
(DEST / "main.js").write_text("import * as quantum from 'quantum.bitflip';\n" + engine + "\n" + app + adapter)
python = (ROOT / "quantum/bitflip.py").read_text()
python += '''

def run_backend_json(backend, theta_deg, phi_deg, errors_string, basis="X", shots=256):
    """One measured circuit job, using Qollab's pre-created backend.

    Exact fidelity is an ideal statevector diagnostic, NOT estimated hardware
    fidelity. Actual backend counts are reported separately.
    """
    from qiskit import transpile
    # BackendV2 (including BasicSimulator) has no configuration() method.
    known_local = type(backend).__name__ in ("BasicSimulator", "AerSimulator") or type(backend).__name__.startswith("Fake")
    config = backend.configuration() if hasattr(backend, "configuration") else None
    if not (known_local or getattr(config, "simulator", False)):
        raise ValueError("Choose a free simulator; this MVP does not submit paid hardware jobs.")
    theta, phi = math.radians(theta_deg), math.radians(phi_deg)
    circuit = build_circuit(theta, phi, list(errors_string))
    if basis == "X":
        circuit.h(0)
    elif basis != "Z":
        raise ValueError("basis must be X or Z")
    circuit.measure_all()
    compiled = transpile(circuit, basis_gates=["rx", "ry", "rz", "h", "x", "y", "z", "cx"], optimization_level=1)
    job = backend.run(compiled, shots=shots)
    counts = job.result().get_counts()
    total = sum(counts.values())
    probability = sum(n for bits, n in counts.items() if bits.replace(" ", "")[-1] == "0") / total
    ideal = analyze(theta, phi, list(errors_string))
    return json.dumps({"counts": counts, "shots": total, "sampled_probability": probability,
        "ideal_fidelity": ideal["fidelity"], "basis": basis})
'''
(DEST / "quantum/bitflip.py").write_text(python)
(DEST / "quantum/__init__.py").write_text((ROOT / "quantum/__init__.py").read_text())
print("Built qollab/: index.html, main.js, main.css, quantum/bitflip.py")
