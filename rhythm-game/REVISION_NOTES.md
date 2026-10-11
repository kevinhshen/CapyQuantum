# Qubit Tempo revision — October 10, 2026

## Delivered behavior

- Separate Home (Start / Learn / Settings), Levels, Learn, Settings and gameplay screens.
- Bright sage/cream/peach presentation; short educational text replaces promotional slogans.
- Four keyboard lanes by default (D F J K). Generated maps support 3–7 lanes; team-authored maps fix their own count.
- Irregular musical phrases, fractional beats, rests, changing gaps, chords and rapid corrections for wider codes. Lantern glow demonstrates 112 → 124 → 112 BPM.
- Shared beat/second conversion drives chart validation, game judgement, soundtrack scheduling, progress and duration.
- Four short lessons and a parity lab. The lab demonstrates equal checks with either a restored memory or an undetected logical X, using the existing quantum reference bank.
- Player map/music imports and chart exports removed. Team-controlled content.js and content-assets.json support backend content authoring and audio packaging.
- Existing Qiskit/Qollab Python bridge preserved; one 298-circuit backend batch per Run. No game framework, new network service, persistent storage or worker dependency added.

## Evidence

- 16 automated tests passed, including exact tempo conversion, offbeat melody scheduling, malformed tempo rejection, ambiguous packet-window rejection, varied built-in timing and perfect recovery for all 15 map/lane configurations.
- Qiskit 2.5.2 cross-check passed: 1,638 complex statevectors; 298 reference circuits at 64 shots in one BasicSimulator job.
- Regenerated recorded bank and standalone player from Qiskit BasicSimulator.
- Browser: standalone loads with recorded-Qiskit label; Home/Levels/Learn/Settings transitions work; default four lanes; practice updates =/≠ checks and scores after a correct Q3 input; pause/return works; a timed map completes into the results report without browser errors; seven-lane practice renders correctly.
- Browser: logical-error lab repair changes reference preservation from 0% to 100%; Flip all then leaves checks equal with 33.3% mean reference preservation.
- Browser: mute and reduced-motion settings update; 390×844 mobile settings and four-lane touch practice work. Mobile level page scroll width equals its 351px content width; body width is 390px (no horizontal overflow). Temporary viewport override reset after checks.
- Packager test: a listed local soundtrack is included automatically alongside timing.js; an escaping ../ asset path is rejected. Packaged runtime files are each below Qollab's documented 2 MB limit.

## Remaining limits

The local player uses recorded Qiskit shots, not a live backend job. The modular developer page labels its JavaScript reference simulator. The live Qollab entry calls Python/Qiskit with the selected backend and has not been executed in the actual Qollab/IonQ iframe in this revision. Platform publication, public demo video, project page and formal submission remain to be completed by the team. Perceptual soundtrack quality, player/device latency and difficulty balance need human playtesting. No automatic beat detection is included. Hold support was added in the subsequent revision below.

This effort is supported by Qollab & IonQ

## Main-branch integration

Merged the teammate’s `game-tutorial` contribution from main. Its four named difficulty presets now live in `content.js` and appear under Guided learning path on the separate Levels page. The conflicting generated player is rebuilt from source, retaining both the page redesign and tutorial presets.

## Animated tutorial integration

Integrated teammate commit `414d9d6` from `game-tutorial`. Its five-step animated walkthrough now runs automatically at startup and restarts when Home → Learn is pressed. A native modal supports Skip, Back, Next, Replay, step buttons, arrow keys and Escape, with focus restored on close. The quantum lessons/lab remain available from the tutorial. Animations/timers reset between steps and on close; reduced-motion uses static final states. No browser storage is required, so the walkthrough appears on each Qollab Run. The three-lane example explicitly distinguishes the four-lane gameplay default, encoding from independent copying, and correction guarantees. The shared source module is included in the standalone builder and Qollab package.

Validation: all 16 existing tests pass; browser checks confirm startup, animation state changes, completion to Home, Learn replay from step one, arrow navigation and Escape exit. The modular player also opens the tutorial and reports no browser errors. Quantum circuits are unchanged.

## Hold notes and authoring rules

Maps now support step.holdBeats, neutral hold ribbons and keyboard/touch sustain input. Holds apply one X at the head and earn rhythm credit on completion; early release never reverses a quantum repair. Pausing suspends holds until the player re-presses them. Untimed practice uses one press for accessibility. All built-in maps mix taps and short holds; the animated tutorial now has six steps including a hold demonstration. Tail timing follows tempo changes and validation prevents tails beyond the song, overlapping packet windows and invalid durations. New level-making-rules.md documents exact limits, music alignment, hold/chord authoring, difficulty guidelines and submission checks; a JSON example and local chart checker are included. Quantum circuits and the single-job bridge are unchanged.

Validation: 25 Node tests pass, including successful holds, early release, chords, pause/resume, tempo-changing tails and all 15 built-in map/lane combinations. The sample chart checker reports four notes, two holds, five recovered packets and S grade. Browser checks confirm the new tutorial step animates through completion, hold ribbons render, and correct tap/hold practice inputs update checks and scores; no browser warnings/errors were recorded. The standalone player and 20-file Qollab package were rebuilt. Timed sustain logic is covered by automated tests; live Qollab execution and device-specific playtesting remain unverified.

## Hit/miss feedback and recording-friendly audio — October 11

Added pooled hit rings/petals, receptor rebound, explicit packet-wide miss fragments/fade, distinct wrong-correction feedback, hold completion/early-release effects and ten-note combo reactions. Miss feedback never reveals a correction lane. An active member of a hold chord remains visible if another member is missed. Pause suspends visual animations and preserves their remaining display time. Reduced motion retains clear text/static feedback and omits bursts.

Recorded soundtracks play continuously with short original unpitched tap/error samples; fixed pitched hit/recovery notes no longer play over recordings. Synthesized maps retain musical accents. Music and effects have independent volume buses with smooth gain changes. Master mute preserves both volume preferences, and effects at zero leaves the music alone. No song assets or external runtime dependencies were added.

Optimization: a fixed effect-element pool per lane; replacement/cancellation of active animations; cached receptor/parity DOM references and highway dimensions; outcome events consumed once instead of scanning all holds/results every frame; cached garden scenery; bounded decorative particles and input audio allocation; reusable tap samples and disconnected completed audio graphs. These are implementation-level improvements, not a claim of a measured FPS gain on all devices.

Validation: 27 automated tests pass. Chrome checks cover keyboard hits, misses, hold release, pause/resume, separate volume controls, recorded WAV decoding with no pitched effect tones, mixed hold/missed-head chords, mobile touch, reduced motion and no horizontal overflow. A 200-input stress check retained the same 39 effect elements for four lanes, kept animations bounded and cleared them after completion. An unchanged garden reused its scenery cache across successive frames. No browser errors were recorded. Rebuilt the recorded-Qiskit standalone player and 21-file Qollab package. Sound balance with the team's actual songs and live Qollab execution still need human/platform verification.
