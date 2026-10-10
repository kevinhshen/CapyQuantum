"""Package an offline launcher and a Qollab JS/Qiskit project."""
from pathlib import Path
import re
import shutil
root = Path(__file__).resolve().parents[1]
sources = ['quantum.js', 'simulation.js', 'art.js', 'game.js']
imports = r'^import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+[\'"][^\'"]+[\'"];\s*\n|^export '
combined = '\n'.join(re.sub(imports, '', (root/name).read_text(), flags=re.M) for name in sources)
css = (root/'style.css').read_text()
html = (root/'index.html').read_text()
standalone = html.replace('<link rel="stylesheet" href="style.css">', '<style>'+css+'</style>').replace('<script type="module" src="game.js"></script>', '<script>'+combined+'</script>')
(root/'PLAY.html').write_text(standalone)
dist = root/'dist'
dist.mkdir(exist_ok=True)
(dist/'index.html').write_text(standalone)
out = root/'qollab'
(out/'quantum').mkdir(parents=True, exist_ok=True)
(out/'index.html').write_text(html.replace('href="style.css"','href="main.css"').replace('<script type="module" src="game.js"></script>',''))
(out/'main.css').write_text(css)
adapter = r'''
// One selected-simulator submission attempt per Qollab project run.
let qollabAttempted=false;
window.ionGardenPrepare=async()=>{
 if(qollabAttempted)throw Error('Rerun the Qollab project before trying again.');
 qollabAttempted=true;
 const raw=await gardenQuantum.run_json.callPromising(backend);
 const data=JSON.parse(typeof raw==='string'?raw:raw.toJs());
 installRecoveryKernel(data.kernel);
 document.querySelector('#runtime-note').textContent='Qiskit recovery kernel active in gameplay. Selected simulator sampled '+data.shots+' shots of the single-error recovery circuit. Those counts are separate from game delivery diagnostics.';
};
document.querySelector('#runtime-note').textContent='Qollab version: the first contract loads its recovery rules from Qiskit and submits one free-simulator job. Progress may be session-only.';
'''
(out/'main.js').write_text("import * as gardenQuantum from 'quantum.garden';\n"+combined+adapter)
for name in ['__init__.py','garden.py']: shutil.copyfile(root/'quantum'/name,out/'quantum'/name)
print('Built PLAY.html, dist/index.html, and qollab/.')
