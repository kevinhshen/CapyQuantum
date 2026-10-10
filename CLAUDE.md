# Qollab + IonQ 48-Hour Quantum Hackathon

Source: https://qollab.xyz/programs/hackathon/terms (fetched 2026-10-09)

This project is a submission to the Qollab + IonQ hackathon. Everything built here must satisfy the rules below. Treat the **Hard Requirements** as non-negotiable when writing code, docs, or making design decisions.

## Key Dates (all times ET)

| When | What |
|---|---|
| **Oct 9, 19:00** | Build window starts |
| **Oct 11, 19:00** | Build window ends, **submission deadline** |
| Week of Oct 12 | Local (node) judging complete |
| Week of Oct 19 | Global judging complete, winners announced |

All project work must happen inside the 48-hour build window.

## Hard Requirements (submission is invalid without these)

1. **Qiskit**: the project must use the Qiskit framework.
2. **Runs on free simulators**: it must run on Qollab's free simulators, including IonQ's quantum simulator. Judges run it on a free local simulator. IonQ simulator or hardware results neither add nor subtract points, so don't depend on paid hardware.
3. **Published on Qollab.xyz**: the project must be runnable on Qollab.xyz before the deadline.
4. **MIT license**: the project and any external repo it relies on (a separate frontend or backend, for example) must use the MIT license. Include a `LICENSE` file.
5. **Accessible UI**: follow industry best practices for UI accessibility (WCAG: semantic HTML, keyboard navigation, alt text, color contrast, ARIA where needed, no color-only information).
6. **Project page on Qollab.xyz** that covers:
   - what it does
   - the problem it explores
   - how to run it
   - enough detail for others to understand, replicate, or extend it
7. **2–3 minute demo video** at a public link that opens without signing in.
8. **Attribution**: include the line "This effort is supported by Qollab & IonQ".
9. **Disclose all starting points**: any existing code, templates, forks, tutorials, open-source libraries, or AI assistance must be disclosed and attributed. Judging is based only on what the team adds.

## Minimum Bar: "Beyond the Tutorial"

The submission must go beyond a standard reference implementation by showing **at least one** of:
- a novel application or problem context
- a technical extension (noise/error mitigation, parameter optimization, benchmarking, etc.)
- an original analytical or educational contribution

If it doesn't clear this bar, judges may score it **0** on Novelty & Creativity and/or Technical Execution.

## Our Project

- **Theme:** Quantum Unlocked. **Topic:** quantum error correction (QEC).
- **Game: Qubit Factory.** A factory tycoon. Products (qubits) ride a conveyor belt; quantum glitches corrupt them; the goal is to make as much money as possible over 5 days. QEC techniques are upgrades and abilities (Repetition Code, Decoder Bot, Phase Goggles, Bigger Code, Cryo Cooling).
- **Design rule:** someone with **zero** quantum knowledge must understand it. Use the spinning-coin analogy consistently, and teach just-in-time (briefing slides, foreman tips via `teach()`, hands-on `TRAININGS`, daily insight, `GLOSSARY`). Keep it simple and fun for non-experts. Minimal text, learn by playing, and real QEC explained in short "Real-world QEC" notes. (An earlier lesson-style version was rejected as too complicated.)

## Project status
- MVP built. See `PLAN.md` (roadmap and ideas) and `README.md` (the draft project page and architecture).
- Local preview: `npm run dev`, then open http://localhost:8765/dev.html (`?speed=4` to playtest faster). Tests: `npm test` (a JS-vs-Qiskit cross-check; needs `.venv` with qiskit).
- **Keep `quantum/qec.py` `build_circuit` and `circuits.js` `buildOps` in sync**, and run `npm test` after changing either. Any new circuit the game uses must be in `allSpecs()` in `game.js`, which is run as one Qiskit job at startup.
- Upload to Qollab: `index.html`, `main.js`, `main.css`, `game.js`, `circuits.js`, `circuit-view.js`, `engine-qiskit.js`, `quantum/qec.py`, `quantum/__init__.py`. Don't upload the dev files, tests, or `.venv`.

## Qollab Platform (how projects run)

Docs: https://qollab.xyz/learn/docs (see `js-qiskit-projects`, `runtime-environment`, `compute-backends`, `publish`, `write-your-project-page`)

- **Everything runs in the browser.** Python runs on Pyodide (WebAssembly). The only server-side work is a job on a remote IonQ backend.
- **We are building a JS / Qiskit project.** `index.html` + `main.js` (+ optional `main.css`) at the top level. It runs in a sandboxed iframe shown above the console.
  - `main.js` imports from `'qiskit'` (a JS proxy of the Python Qiskit 2.x API): call constructors without `new`, e.g. `QuantumCircuit(2, 2)`; pass kwargs with `.callKwargs({...})`; convert results with `.toJs()`.
  - Put quantum logic in Python files and import them by dotted name: `import * as qec from 'quantum.qec'` for `quantum/qec.py`. Call them with `.callPromising(...)` / `.callPromisingKwargs(...)`. Never use a plain call, which fails on IonQ backends with an XHR error. Never use default imports of Python modules (they return `undefined`).
  - A `backend` object is pre-created (chosen by the user in the Select QPU dialog). `await backend.run(circuit, { shots })`.
  - JS may import `three`, `postprocessing`, `@tweenjs/tween.js`, or any library from a full URL.
- **Sandbox limits:** no localStorage or other browser storage, nothing persists between runs. Only GET network requests are allowed (no POST, WebSocket, or web workers).
- **Packages:** Qiskit (>=2.5.2) is always available; NumPy, SciPy, and Matplotlib load on import. Qiskit Aer is only available via the PQCA library option (`qiskit_aer==0.17.2`); don't depend on it. Extra packages go in `requirements.txt` (pure-Python wheels or Pyodide builds only).
- **Files:** max 100 files, each up to 2 MB.
- **Free backends:** built-in simulator (ideal, 24 qubits, `BasicSimulator`), AWS Braket local (ideal, 25), IBM noise-model simulators (local, free), IonQ remote simulators (free, noise model, 25–29 qubits). Real IonQ hardware costs credits.
- **IonQ remote: one job per run.** A second job errors. Batch circuits into a single `backend.run([...])` call, or rely on local simulators for sweeps.

### Implications for our design
- **Inject errors explicitly as gates** (random X/Z on chosen qubits, driven by a seeded RNG). Then the QEC game works the same on the ideal built-in simulator, the judges' local simulator, and IonQ's simulator, and the player sees exactly which error happened.
- **Keep circuits small.** `BasicSimulator` is a pure statevector simulator running in WebAssembly. Reuse ancillas with mid-circuit measure + reset, and keep most circuits under ~15 qubits. For the threshold sweep, show a precomputed/cached curve plus a live "run a few points" mode.
- **Build the UI in HTML/SVG/CSS** inside `index.html` for accessibility (semantic elements, ARIA live regions, keyboard controls).
- **No save system across runs.** State lives in memory during a session.

## Themes (pick one or more)

Projects should use quantum computing's distinctive properties.

- **Quantum Impact**: solve a real-world problem (logistics, manufacturing, space, finance, energy) with hybrid quantum-classical methods. **Use a public dataset, build a classical baseline, and show measurable gains.**
- **Quantum Playground**: playful, artistic, or unexpected projects. Quantum concepts (superposition, interference, entanglement, measurement) must be **essential**. Random number generation alone doesn't count.
- **Quantum Unlocked**: make complex quantum topics (error correction, fault tolerance, networking, algorithms) intuitive through interactive demos, games, animations, or visualizations.

Off-theme projects can still win placement awards but not theme awards.

## Judging Rubric

1. **Novelty & Creativity**
2. **Technical Execution**
3. **Impact Potential**
4. **Documentation Quality**

Student and Professional tracks use the same rubric and compete for the same awards.

## Prizes

**Global:** 1st $10,000 + $20k compute · 2nd $5,000 + $15k compute · 3rd $2,500 + $10k compute.
Specialty awards ($500 + $5k compute each): Most Novel/Creative, Best of each theme (×3), Most Impact, Best Documentation. A project can win a placement prize and a specialty award.

**Local nodes with 10+ projects:** 1st $500 + $5k compute · 2nd $300 + $3k · 3rd $200 + $2k. The top 3 advance to global judging. Each node can also advance one project per specialty award.

## Team & Eligibility

- Solo or up to 4 people, all 18+. No quantum experience required.
- All team members compete at the same node.
- Student track: every member is enrolled at the designated university node. Everyone else is in the Professional track.
- Multiple projects per team are allowed. Awards are per project.

## Disqualification Triggers (avoid)

- Submitting pre-existing work, in whole or in substantial part, as new
- Copying code, circuits, or write-ups without disclosure and attribution
- Using a template or open-source library without disclosure
- Submitting a project substantially identical to another team's
- Misrepresenting authorship

## After Submission

- Keep the project available on Qollab for **12 months**.
- Have a payment method ready in case of a cash award.
- Winners agree to publicity by Qollab and IonQ, handle their own taxes, and post at least once on social media about participating.

## Contacts

- Node logistics: local organizer Slack channel
- Platform, submission, or hardware issues: global support Slack channel
- General questions and appeals: hello@qollab.xyz (disqualification appeals within 24h)
- Privacy: privacy@qollab.xyz

## Working Guidelines for Claude

- Use the pre-created `backend` and make everything work on the free built-in simulator. Don't depend on Qiskit Aer, and never require paid hardware or credentials to run.
- Keep a running `ATTRIBUTION.md` (or a README section) that lists every template, library, tutorial, and AI-assisted component used.
- Optimize for the rubric. Documentation Quality is 1/4 of the score, so keep the README and project page thorough: problem, approach, how to run, results, and how to extend.
- For Quantum Impact projects, always build a classical baseline and report comparative metrics.
- Check every UI for accessibility.
- Make sure `LICENSE` (MIT) and the Qollab & IonQ attribution line are present before submission.
