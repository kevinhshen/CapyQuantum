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

- **Motion polish (October 11):** original orthographic Bloch-sphere projection and depth-separated wireframes, pointer-responsive viewing angle, pause/reduced-motion behavior, gentle menu field signals, and UI transitions drafted with Codex. The animation rotates the view of a fixed pure state; it does not claim hardware evolution or live backend output. No additional third-party libraries or assets.

- **Animation refinement on main (October 11):** Codex added original layered hit bursts, hold-contact pulses, timing labels and streak banners, separated theme/effect styles, and measured/optimized animation reuse at the user's direction. No osu! assets, sounds, code or new runtime libraries were used.

- **Song-level integration (October 11):** the teammate’s `new-music` contribution at `e3ebd5d` supplies ten synthesized tune arrangements, pacing, melody ownership and backing fills. Codex moved the standalone-only changes into shared source modules, integrated them with the current visual/effect and audio-volume systems, retained the original levels, and added regression checks. No external recordings or runtime libraries were added.

- **Music (CC0, no attribution required, credited anyway):** "1-2-3-4 (Chiptune)" by Pro Sensory (https://opengameart.org/content/1-2-3-4-chiptune) and "Mecha Collection" by Jonathan So (https://opengameart.org/content/mecha-collection). Both CC0 on OpenGameArt; transcoded to 64 kbps mono AAC to fit Qollab's 2 MB file limit. BPM/offset were estimated automatically and charts are authored on a fixed grid, so verify alignment by ear.
- **More music (CC0, credited anyway):** "Funked Up" by Joth (https://opengameart.org/content/funked-up), "Oldskool (CC0)" by Of Far Different Nature (https://opengameart.org/node/107451), and "Loop" by cubedcanada (https://opengameart.org/node/88983). Transcoded to 64 kbps mono AAC; BPM/offset estimated automatically, so verify by ear.

- **Progressive charts:** Codex integrated the five recorded tracks into the shared 15-level catalog, replaced the original garden tracks, and authored increasing correction density from level 3 onward. Recorded BPM/offset estimates retain the teammate's values and still require listening/playtesting.

- **Ten-song difficulty revision:** at the user's direction, Codex removed the five CC0 recordings from the active catalog, source assets, and runtime package, and widened levels 3–10 with increasing correction density, more frequent multi-flip charts, and an accelerating Symphony No. 5 finale. Earlier contribution notes above describe the integration history.
