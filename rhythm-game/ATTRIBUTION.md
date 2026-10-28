# Attribution and starting points

This effort is supported by Qollab & IonQ

- **Starting point:** the team's existing [CapyQuantum / Qubit Factory](https://github.com/kevinhshen/CapyQuantum/tree/codex/archive-qubit-factory-2026-10-10) at commit `4bf75fd`, inspected during October 10, 2026. The rhythm MVP follows its three-qubit neighbor-parity convention, explicit X-error injection, Python-module Qollab bridge, single batched backend job, MIT license, capybara theme, and just-in-time beginner teaching. The factory code is preserved on `codex/archive-qubit-factory-2026-10-10`. Rhythm gameplay, layout, circuit implementation, six-state preservation experiment, and tests were written for this MVP.
- **Visual direction:** the team's `codex/ion-garden` branch at commit `2100d7f`, inspected October 10, 2026, supplied the cream/sage/peach palette, garden-first composition, small mono labels, and quiet serif tone. This revision uses newly drawn Canvas vector scenery and a new vertical game layout, rather than copying its scene assets.
- **Gameplay reference:** the team's `qubit-symphony` branch at commit `c6d2ad4` supplied the idea of falling encoded registers, live neighbor-parity lamps, player-selected qubit flips, and clear/corrupted musical feedback. This implementation retains Qiskit-backed state-preservation validation, a separate rhythm clock, 3–7 lanes, and its own application code.
- **Quantum concepts:** the standard repetition code, encoding with CX gates, syndrome extraction, and X recovery are established techniques. Reference: [IBM Quantum, Correcting quantum errors](https://learning.quantum.ibm.com/course/foundations-of-quantum-error-correction/correcting-quantum-errors). These techniques are not claimed as novel inventions.
- **Qiskit:** uses [Qiskit](https://github.com/Qiskit/qiskit), Apache-2.0, supplied by Qollab or installed locally. Qiskit's own license remains Apache-2.0; application code is MIT. No external application repository or game template is required.
- **Platform:** targets [Qollab's JS / Qiskit runtime](https://qollab.xyz/learn/docs/js-qiskit-projects), following the main project's documented bridge pattern. Live platform execution and publication must be verified separately.
- **AI assistance:** this project was developed with AI assistance (OpenAI Codex and Claude) under the team's direction, covering parts of the application code, tests, documentation and original synthesized audio/art. The team directed the design and reviewed the results.
- **Assets and libraries:** system fonts, original Canvas vector art, and original synthesized Web Audio tones. No downloaded art, music, fonts, UI templates, or third-party JavaScript packages.
- **Contribution claimed:** the parity-decoding vertical rhythm recovery interaction, 3–7 lane chords and rapid sequences, post-map timing/recovery feedback, accessible practice, teammate content port, and reproducible quantum checks. Educational effectiveness and novelty scores have not been established by a user study or judging.

Build date: October 10, 2026, within the hackathon's submission window. This file documents starting points; it is not a certification of submission eligibility.

## Team contributions

- **Tutorial levels:** teammate's `game-tutorial` contribution (commit `414d9d6`) supplies the Seedling, Sprout, Sapling and Bloom level presets and the five illustrated animation sequences, now in `content.js` and `tutorial.js`.
- **Songs:** teammate's `new-music` contribution (commit `e3ebd5d`) supplies the ten synthesized tune arrangements, pacing, melody ownership and backing fills.

## Revision notes

Later revisions added hold notes, hit-feedback animations and audio buses, a wireframe/Bloch-sphere visual theme (inspired by [Orano's innovation experience](https://www.orano.group/experience/innovation/en); no Orano code, logos, models, fonts or assets were copied), a ten-song difficulty progression, and onset-synchronized charts. All of this is original Canvas/SVG/CSS/Web Audio work with no new external assets or runtime libraries. The osu!-inspired navigation copies no osu! assets, sounds or code. The sphere is illustrative single-qubit state space and does not claim hardware evolution or live backend output.

## Music credits

- **Music (CC0, no attribution required, credited anyway):** "1-2-3-4 (Chiptune)" by Pro Sensory (https://opengameart.org/content/1-2-3-4-chiptune) and "Mecha Collection" by Jonathan So (https://opengameart.org/content/mecha-collection). Both CC0 on OpenGameArt; transcoded to 64 kbps mono AAC to fit Qollab's 2 MB file limit. BPM/offset were estimated automatically and charts are authored on a fixed grid, so verify alignment by ear.
- **More music (CC0, credited anyway):** "Funked Up" by Joth (https://opengameart.org/content/funked-up), "Oldskool (CC0)" by Of Far Different Nature (https://opengameart.org/node/107451), and "Loop" by cubedcanada (https://opengameart.org/node/88983). Transcoded to 64 kbps mono AAC; BPM/offset estimated automatically, so verify by ear.
