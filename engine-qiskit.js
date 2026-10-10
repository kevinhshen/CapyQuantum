// Qollab engine: runs experiments as real Qiskit circuits (quantum/qec.py)
// on the backend picked in Qollab's Select QPU dialog.
//
// The game sends every circuit it needs in a single run() call with one shot
// count, which qec.run_specs submits as a single job. That also satisfies
// IonQ backends, which accept only one job per run.

export async function createQiskitEngine(qec, backend) {
  const info = JSON.parse(await qec.backend_info.callPromising(backend));
  return {
    label: `Qiskit on ${info.name}`,
    async run(specs, shots) {
      return JSON.parse(await qec.run_specs.callPromising(backend, JSON.stringify(specs), JSON.stringify(shots)));
    },
  };
}
