import { statevector, recover } from "../quantum.js";
const fixtures = [];
for (let m = 0; m < 8; m++)
  for (let c = 0; c < 4; c++)
    for (const [theta, phi] of [
      [0, 0],
      [Math.PI, 0],
      [Math.PI / 2, 0],
      [Math.PI / 2, Math.PI],
      [Math.PI / 2, Math.PI / 2],
      [Math.PI / 2, (3 * Math.PI) / 2],
      [0.47, 1.23],
      [2.19, 4.67],
    ]) {
      const mask = [0, 1, 2].map((q) => (m >> q) & 1),
        clue = [0, 1].map((q) => (c >> q) & 1);
      fixtures.push({
        mask,
        clue,
        theta,
        phi,
        frame: recover(mask, clue),
        fidelity: statevector(mask, theta, phi, true, clue).fidelity,
      });
    }
console.log(JSON.stringify(fixtures));
