# Qubit Factory: plan to win

## Why this can win
- **Novelty & Creativity:** QEC as a factory tycoon. Every upgrade is a real technique, and the economy encodes real trade-offs (more copies = more cost and more glitches).
- **Technical Execution:** every light and quality check comes from a real Qiskit circuit, batched into one job, with genuine noise on noisy backends.
- **Impact Potential:** anyone can play in 10 seconds, and the shop's "Real-world QEC" notes and the end screen teach the concepts.
- **Documentation Quality:** the README doubles as the project page.

## MVP status (Fri night)
- [x] Belt, glitches, tap-to-fix, quality check, money, 5 days with rising bills
- [x] Shop: Repetition Code, Decoder Bot, Phase Goggles, Bigger Code, Cryo Cooling
- [x] Qiskit in one batch, a pause view of the real circuit, keyboard, relaxed mode, phone layout
- [ ] **Upload to Qollab and test** on the built-in, IBM noise and IonQ simulators (do this first)

## Ideas for Saturday (team to pick)
- **Balance:** a skilled player should clearly beat an idle one (today the Decoder Bot is too strong). Tune `GLITCH_RATE`, `BILL`, prices and bot speed.
- **More abilities:**
  - Surface Code (late-game, checks both error kinds at once, replaces goggles)
  - Dynamical Decoupling (active ability: freezes phase glitches for 5s, with a cooldown)
  - Error Mitigation (cheap, partial protection for single qubits)
  - Magic State Factory (premium products worth more)
- **Events:** cosmic-ray bursts (correlated errors across many products), a "noisy day" above threshold where bigger codes hurt.
- **Juice:** sprites instead of emoji, combo counter, end-of-season leaderboard (in-session).

## Sunday
- Accessibility pass (VoiceOver plus keyboard only)
- Record the 2–3 min demo video
- Publish by 17:00 ET (2h margin)

## Risks
- **Qollab loading:** how Qollab loads `index.html`/`main.js` isn't documented, so verify on upload.
- **IonQ speed:** IonQ's simulator runs one simulation per shot, so 84 circuits × 32 shots could be slow. Lower `SHOTS` if needed.
