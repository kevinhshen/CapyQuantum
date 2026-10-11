# Attribution and starting points

This effort is supported by Qollab & IonQ

- **Starting point:** the team's existing [CapyQuantum / Qubit Factory](https://github.com/kevinhshen/CapyQuantum/tree/codex/archive-qubit-factory-2026-10-10) at commit `4bf75fd`, inspected during October 10, 2026. The rhythm MVP follows its three-qubit neighbor-parity convention, explicit X-error injection, Python-module Qollab bridge, single batched backend job, MIT license, capybara theme, and just-in-time beginner teaching. The factory code is preserved on `codex/archive-qubit-factory-2026-10-10`. Rhythm gameplay, layout, circuit implementation, six-state preservation experiment, and tests were written for this MVP.
- **Visual direction:** the team's `codex/ion-garden` branch at commit `2100d7f`, inspected October 10, 2026, supplied the cream/sage/peach palette, garden-first composition, small mono labels, and quiet serif tone. This revision uses newly drawn Canvas vector scenery and a new vertical game layout, rather than copying its scene assets.
- **Gameplay reference:** the team's `qubit-symphony` branch at commit `c6d2ad4` supplied the idea of falling encoded registers, live neighbor-parity lamps, player-selected qubit flips, and clear/corrupted musical feedback. This implementation retains Qiskit-backed state-preservation validation, a separate rhythm clock, 3–7 lanes, and its own application code.
- **Quantum concepts:** the standard repetition code, encoding with CX gates, syndrome extraction, and X recovery are established techniques. Reference: [IBM Quantum, Correcting quantum errors](https://learning.quantum.ibm.com/course/foundations-of-quantum-error-correction/correcting-quantum-errors). These techniques are not claimed as novel inventions.
- **Qiskit:** uses [Qiskit](https://github.com/Qiskit/qiskit), Apache-2.0, supplied by Qollab or installed locally. Qiskit's own license remains Apache-2.0; application code is MIT. No external application repository or game template is required.
- **Platform:** targets [Qollab's JS / Qiskit runtime](https://qollab.xyz/learn/docs/js-qiskit-projects), following the main project's documented bridge pattern. Live platform execution and publication must be verified separately.
- **AI assistance:** OpenAI Codex drafted the rhythm game's application code, circuit model, original Canvas garden and capybara illustration, CSS, synthesized audio, tests, and documentation at the team's direction. Disclose this assistance and the team's subsequent contributions on the submission page.
- **Assets and libraries:** system fonts, original Canvas vector art, and original synthesized Web Audio tones. No downloaded art, music, fonts, UI templates, or third-party JavaScript packages.
- **Contribution claimed:** the parity-decoding vertical rhythm recovery interaction, 3–7 lane chords and rapid sequences, post-map timing/recovery feedback, accessible practice, teammate content port, and reproducible quantum checks. Educational effectiveness and novelty scores have not been established by a user study or judging.

Build date: October 10, 2026, within the window specified in the repository's CLAUDE.md. This file documents starting points; it is not a certification of submission eligibility.

- **This revision:** osu!-inspired separate Home/Levels navigation (no copied assets or code), bright educational UI, four short quantum lessons and parity lab, irregular phrase charts, shared tempo-change timing, team-only content workflow, packaging updates and timing tests drafted with OpenAI Codex at the user’s direction.

- **Merged tutorial contribution:** teammate’s `game-tutorial` level presets (Seedling, Sprout, Sapling, Bloom), originally added to generated `PLAY.html`, now live in `content.js` and the Levels page so rebuilds preserve them.

- **Animated tutorial integration:** teammate’s `game-tutorial` contribution at `414d9d6` supplies the five illustrated animation sequences. They now live in `tutorial.js`, available from Learn. Codex adapted the modal, keyboard handling, timer cleanup, Qollab packaging and wording about encoding/correction limits.

- **Hold-note revision:** Codex added sustain input/scoring, neutral hold ribbons, a sixth tutorial step, chart validation/tests and the team authoring rules at the user’s direction. The first five animation sequences retain the teammate attribution above.

- **Hit-feedback revision (October 11):** Codex added pooled hit/miss/hold animations, combo reactions, separate audio buses and volume controls, original unpitched tap samples for recordings, cached scenery, and regression tests at the user’s direction. No new external assets or runtime libraries.

- **Quantum visual revision (October 11):** at the user’s direction, the visual branch takes inspiration from the dark canvas, fine wireframes, and bright accents in [Orano’s innovation experience](https://www.orano.group/experience/innovation/en). The field mesh, single-qubit Bloch-sphere schematic, orbit marks, typography, and interface styling are original Canvas/SVG/CSS work drafted with Codex. No Orano source code, logos, models, fonts, or scene assets were copied. The sphere is illustrative single-qubit state space, distinct from the four-qubit encoded-register example. Correction rules and reference experiments are unchanged.
