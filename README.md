# Qubit Factory

**Run a quantum factory. Quantum glitches keep breaking your products. Use real quantum error-correction techniques to stop them, and make as much money as you can in 5 days.**

Theme: **Quantum Unlocked** · Qollab + IonQ Hackathon 2026
*This effort is supported by Qollab & IonQ.*

## Additional MVP: Qubit Tempo

[Qubit Tempo](rhythm-game/README.md) is a separate vertical rhythm game with a garden inspired by the team's Ion Garden branch. Play 3–7 qubit lanes, chords, and rapid recovery sequences; see rhythm and quantum results after the song. Your teammate can add maps and music through `content.js` and [the authoring port](rhythm-game/LEVEL_AUTHORING.md). Open `rhythm-game/PLAY.html` for the standalone player, or follow its README for Qollab and local Qiskit previews. Qubit Factory remains the default root project.

## The problem
Quantum error correction is the reason large quantum computers are possible, yet it's usually explained with stabilizer algebra. Qubit Factory puts it in a setting anyone understands: a production line where quality failures cost money, and every upgrade is a real QEC technique.

## Built for zero quantum background
No prior knowledge needed. The game teaches each idea at the moment it matters:
- **Briefing:** four short slides built on one analogy. A qubit is a **spinning coin**, a glitch knocks it over, and looking at it makes it land.
- **Foreman tips:** the belt pauses the first time something new happens (first glitch, first refund, first wrong tap, first invisible phase flip) for a one- or two-sentence explanation.
- **Hands-on training:** the first time you install the Repetition Code or Phase Goggles, you fix a product step by step on a stopped belt. Its lights are real Qiskit results.
- **Daily insight:** each report explains *why* today's refunds happened and which technique would prevent them.
- **📘 Quantum 101:** a plain-language glossary, available any time.
- **Every shop card** pairs what the upgrade does in the game with what it is in real quantum computers.

## How to play
- Products (qubits) ride the conveyor belt to the delivery truck. A good product earns **$20**; a corrupted one costs a **$15 refund**.
- **Quantum glitches** hit products at random, and there are more each day.
- A **warning light** turns on when the two copies beside it disagree. **Tap the odd copy out** to fix it. Tapping a healthy copy breaks it.
- After each day, pay the electricity bill and spend your profit in the **upgrade shop**.

| Upgrade | Real QEC technique |
|---|---|
| 🧩 Repetition Code | Store each qubit in 3 copies and measure neighbour parities (the syndrome) without reading the data |
| 🤖 Decoder Bot | A classical decoder that turns syndromes into corrections automatically |
| 👓 Phase Goggles | Phase-flip checks (Hadamard-basis parities) for the "ghost" glitches that start on day 3 |
| 🛡️ Bigger Code | Distance 5: survives 2 errors at once, at a higher material cost per product |
| ❄️ Cryo Cooling | Better physical qubits: lower error rates, the precondition for codes to help (the threshold) |

Trade-offs are built into the economy, because they're real: more copies means more materials **and** more places for glitches to land.

## Where Qiskit comes in
Every warning light and every quality check is the result of a Qiskit circuit (`quantum/qec.py`):
- **Warning lights:** for a product's current error pattern, a repetition-code circuit encodes the copies, applies the glitches as explicit X or Z gates, and measures neighbour parities into ancilla qubits. Those syndrome bits are the lights.
- **Quality check:** the same circuit's data-qubit measurements are majority-voted, exactly as a logical readout works.
- **One job:** all 84 possible circuits (distance 1, 3 and 5; bit- and phase-flip codes; every error pattern) run in **one job** at startup, and the game samples real shots from the results. On a noisy backend (IBM noise models, IonQ simulator), the lights genuinely flicker with device noise.
- **See it yourself:** press **Pause** in game to see the circuit behind the newest product.

## How to run it
**On Qollab:** press **Run on Qollab** and pick any backend in *Select QPU*. The built-in simulator gives clean lights; noise-model backends add real device noise.

**Locally (preview):** `npm run dev`, then open <http://localhost:8765/dev.html> (add `?speed=4` to playtest faster). The local preview swaps Qiskit for a small JS statevector simulator. `npm test` checks it against Qiskit on 109 circuits (needs a `.venv` with `qiskit`).

## How it's built
```
quantum/qec.py      Qiskit: repetition-code circuits from JSON specs, batched into one job
engine-qiskit.js    Bridge from the game to qec.py on Qollab
game.js             Factory simulation, shop, UI
circuits.js         Same circuits as gate lists, the decoder, majority vote
circuit-view.js     Draws the circuit diagram shown on pause
main.js             Qollab entry point
engine-local.js     Local preview simulator (not used on Qollab)
```

## Extend it
- **Add an upgrade:** add an entry to `UPGRADES` in `game.js` and apply its effect in the simulation (`step`, `glitch`, `deliver`).
- **Add a new code:** extend `build_circuit` in `qec.py` and `buildOps` in `circuits.js`, run `npm test`, and add its specs to `allSpecs()`.

## Accessibility
- **Keyboard:** number keys fix that copy on the product closest to the truck with a light on; **P** pauses.
- **Screen readers:** every copy and light has a text label, and money and events are announced through a live region.
- **Relaxed mode** slows the belt down.
- **Not just color:** bit lights are round and phase lights are diamonds.
- **Themes:** light and dark themes, and reduced motion is respected.

## Attribution and disclosure
- Built during the hackathon window (Oct 9–11, 2026). No pre-existing project code.
- Uses [Qiskit](https://github.com/Qiskit/qiskit) (Apache-2.0) via Qollab's runtime. No other libraries.
- AI assistance: the code and docs were drafted with Claude Code (Anthropic) and directed and reviewed by the team.
- License: MIT (see `LICENSE`).
