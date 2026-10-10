"""Cross-check the browser's independent statevector implementation with Qiskit."""
import itertools
import json
import math
import os
from pathlib import Path
import subprocess
import unittest

import numpy as np
from qiskit.quantum_info import Statevector
from quantum.bitflip import analyze, build_circuit

ROOT = Path(__file__).resolve().parents[1]


class QiskitTests(unittest.TestCase):
    def test_single_bit_flips_preserve_general_states(self):
        for theta, phi in [(0, 0), (math.pi, 0), (math.pi / 2, 0), (.81, 1.37)]:
            for q in range(3):
                errors = ["I"] * 3
                errors[q] = "X"
                self.assertAlmostEqual(analyze(theta, phi, errors)["fidelity"], 1)

    def test_failure_missions(self):
        self.assertAlmostEqual(analyze(math.pi, 0, ["X", "X", "I"])["fidelity"], 0)
        hidden = analyze(math.pi / 2, 0, ["I", "Z", "I"])
        self.assertEqual(hidden["syndrome"], [0, 0])
        self.assertAlmostEqual(hidden["p0_z"], .5)
        self.assertAlmostEqual(hidden["pplus_x"], 0)
        self.assertAlmostEqual(hidden["fidelity"], 0)

    def test_browser_statevectors_match_qiskit_all_error_combinations_and_stages(self):
        node = os.environ.get("NODE_BIN", "node")
        script = """
import {experiment,qiskitSource} from './web/engine.js';
const records=[];
for(const a of ['I','X','Y','Z'])for(const b of ['I','X','Y','Z'])for(const c of ['I','X','Y','Z'])for(let stage=0;stage<5;stage++) {
  records.push({errors:[a,b,c],stage,v:[...experiment(.81,1.37,[a,b,c],stage).v]});
}
console.log(JSON.stringify({records,exported:qiskitSource(.81,1.37,['Y','Z','X'])}));
"""
        output = subprocess.check_output([node, "--input-type=module", "-e", script], cwd=ROOT, text=True)
        data = json.loads(output)
        for record in data["records"]:
            v = np.array(record["v"])
            actual = v[::2] + 1j * v[1::2]
            expected = Statevector.from_instruction(build_circuit(.81, 1.37, record["errors"], record["stage"])).data
            np.testing.assert_allclose(actual, expected, atol=1e-12)
        # Execute the actual UI code generator, including the sampling API.
        namespace = {}
        exec(compile(data["exported"], "exported_experiment.py", "exec"), namespace)
        np.testing.assert_allclose(namespace["sv"].data,
            Statevector.from_instruction(build_circuit(.81, 1.37, ["Y", "Z", "X"])).data, atol=1e-12)


if __name__ == "__main__":
    unittest.main()
