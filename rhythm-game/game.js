import { allSpecs, makeBank, chart, correction, keyFor, judge, missed, syndrome } from './model.js';

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const percent = n => `${Math.round(n * 100)}%`;
const checksText = syn => `Q1–Q2 ${syn[0] ? 'different' : 'same'}; Q2–Q3 ${syn[1] ? 'different' : 'same'}`;
const mascot = `<svg viewBox="0 0 80 80" role="img" aria-label="Capybara wearing headphones"><path d="M15 46V35a25 25 0 0 1 50 0v11" fill="none" stroke="currentColor" stroke-width="7"/><path d="M22 33q-7-17 4-14l9 9h18l10-7q8-1 2 15v19q0 15-22 15T20 54z" fill="#e2b99e"/><rect x="9" y="35" width="14" height="22" rx="6" fill="#6ff0c0"/><rect x="62" y="35" width="12" height="22" rx="5" fill="#6ff0c0"/><circle cx="33" cy="43" r="3" fill="#101827"/><circle cx="55" cy="43" r="3" fill="#101827"/><path d="M41 52h9m-5 0v5" stroke="#101827" stroke-width="3" stroke-linecap="round"/></svg>`;

class BeatAudio {
  constructor() { this.enabled = true; this.context = null; }
  async unlock() {
    if (!this.enabled) return;
    try { this.context ??= new (window.AudioContext || window.webkitAudioContext)(); await this.context.resume(); } catch { this.enabled = false; }
  }
  tone(freq, duration, volume, type = 'sine') {
    if (!this.enabled || this.context?.state !== 'running') return;
    const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain(), t = ctx.currentTime;
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume, t); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + duration);
  }
  beat(i) { this.tone(i % 4 === 0 ? 100 : 180, .11, .11); if (i % 2) this.tone(950, .045, .035, 'triangle'); }
  answer(ok, fix) { this.tone(ok ? [330, 392, 494][Math.max(0, Math.log2(fix || 1))] : 130, .17, .075, 'triangle'); }
}

export async function startGame(root, engine) {
  root.innerHTML = `<main class="shell">
    <header class="topbar"><a class="brand" href="#" aria-label="Qubit Tempo home">${mascot}<span>CAPYQUANTUM<small>QUANTUM UNLOCKED / 02</small></span></a><div class="toptools"><span class="edition">RHYTHM EDITION</span><button id="sound" class="tool" aria-pressed="true">♪ Sound on</button><button id="about" class="tool">How it works</button></div></header>
    <section class="hero"><div><div class="eyebrow"><span class="status-dot"></span> A QUANTUM ERROR-CORRECTION RHYTHM GAME</div><h1>Keep the qubits.<br><span>Keep the beat.</span></h1><p class="intro">Three qubits. Two clues. One well-timed correction.<br>Read the signals and protect a fragile quantum state.</p><div class="launch"><button id="train" class="primary" disabled>Learn to play <span>↗</span></button><button id="play" class="secondary" disabled>Start a rhythm run <span>▶</span></button></div><div class="options"><label><input id="relaxed" type="checkbox"> Relaxed tempo</label><label><input id="still" type="checkbox"> Still notes</label><span>About 55 seconds · A / S / D</span></div></div><aside class="mission"><div class="mission-top">YOUR ROLE <span>01 → 03</span></div><p>You’re the<br><strong>quantum DJ.</strong></p><div class="mission-flow"><span>READ<br><b>the clues</b></span><i>→</i><span>CHOOSE<br><b>the qubit</b></span><i>→</i><span>FLIP<br><b>on the beat</b></span></div><small>No quantum knowledge needed.</small></aside></section>
    <section class="console" aria-label="Rhythm controller"><div class="console-top"><div><span class="live-mark">●</span> <strong id="mode">STANDBY</strong><span id="tempo">96 BPM</span></div><button id="pause" class="tool" disabled>Pause [P]</button></div>
      <div class="stats"><div><span>SCORE</span><strong id="score">00000</strong></div><div><span>CORRECT CHOICES</span><strong id="accuracy">—</strong></div><div><span>STREAK</span><strong id="combo">0<span> ×</span></strong></div><div><span>ROUND</span><strong id="round">— / 40</strong></div></div>
      <div class="play-layout"><div class="play-main"><div class="track-header"><span id="track-label">Read both checks. Choose a lane.</span><span id="countdown">READY WHEN YOU ARE</span></div><div id="track" class="track" aria-hidden="true"><div class="lane lane-one"><span>Q1</span></div><div class="lane lane-two"><span>Q2</span></div><div class="lane lane-three"><span>Q3</span></div><div class="hitline"><span>HIT HERE</span></div><div id="packets"></div><div id="track-overlay" class="track-overlay" hidden>PAUSED</div></div><div class="progress" role="progressbar" aria-label="Run progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="progress-fill"></div></div>
      <div class="keypad"><button class="key key-one" data-fix="1"><kbd>A</kbd><span>Flip Q1</span></button><button class="key key-two" data-fix="2"><kbd>S</kbd><span>Flip Q2</span></button><button class="key key-three" data-fix="4"><kbd>D</kbd><span>Flip Q3</span></button></div></div>
      <aside class="decoder"><div class="eyebrow">CURRENT CLUES</div><div id="clues" class="clues" aria-live="polite"><div><span>Q1 ↔ Q2</span><b>—</b></div><div><span>Q2 ↔ Q3</span><b>—</b></div></div><div class="decoder-label">YOUR POCKET DECODER</div><table><caption class="sr-only">Correction rule for at most one bit flip</caption><thead><tr><th>Check 1</th><th>Check 2</th><th>Press</th></tr></thead><tbody><tr><td>Different</td><td>Same</td><td><kbd>A</kbd></td></tr><tr><td>Different</td><td>Different</td><td><kbd>S</kbd></td></tr><tr><td>Same</td><td>Different</td><td><kbd>D</kbd></td></tr><tr><td>Same</td><td>Same</td><td>Wait</td></tr></tbody></table><p class="quiet">No warning? Don’t flip anything.<br>One error per round in this run.</p><button id="lab" class="text-button" disabled>Why two errors break the rule ↗</button></aside></div>
      <div class="feedback-strip"><div id="feedback" role="status" aria-live="polite">Preparing the quantum experiments…</div><button id="next" class="secondary compact" hidden>Next round →</button><button id="wait" class="secondary compact" hidden>Leave it alone [W]</button><span id="timing" class="timing">READ → CHOOSE → FLIP</span></div>
    </section>
    <section id="report" class="report" hidden tabindex="-1"></section>
    <div class="bottom-row"><p><strong>A tiny lesson with a real limit.</strong> The clues tell you where a single flip happened, without revealing the stored quantum value.</p><span id="source" class="source">Preparing simulator</span></div>
    <footer><span>This effort is supported by Qollab & IonQ</span><span>CapyQuantum · Qubit Tempo · MIT · AI assistance disclosed in README</span></footer>
    <dialog id="dialog" aria-labelledby="dialog-title"><div id="dialog-body"></div><button id="close-dialog" class="primary">Back to the deck</button></dialog>
  </main>`;
  const $ = id => root.querySelector(`#${id}`), audio = new BeatAudio();
  let bank, mode = 'idle', events = [], time = 0, last = 0, beatIndex = -1, score = 0, combo = 0, best = 0, results = [], trainingIndex = 0, activeIndex = -1, paused = false, dialogPaused = false, bpm = 96;
  const stillQuery = matchMedia('(prefers-reduced-motion: reduce)');
  $('still').checked = stillQuery.matches;
  const trainingErrors = [1, 2, 4, 0, 2, 1];
  const tips = [
    'Only the first check says different. Q1 is the odd one out. Press A.',
    'Both checks say different. The middle qubit touches both checks. Press S.',
    'Only the second check says different. Q3 is the odd one out. Press D.',
    'Both checks say same. A healthy round needs no correction. Choose “Leave it alone”.',
    'Your turn: use the two clues to choose a correction.',
    'One more without a hint. Which qubit should you flip?',
  ];
  const updateStats = () => {
    $('score').textContent = String(score).padStart(5, '0');
    $('accuracy').textContent = results.length ? percent(results.filter(r => r.correct).length / results.length) : '—';
    $('combo').innerHTML = `${combo}<span> ×</span>`;
    $('round').textContent = `${(mode === 'training' ? trainingIndex + 1 : Math.min(results.length + 1, events.length)) || '—'} / ${events.length || 40}`;
  };
  function say(text, tone = '') { $('feedback').textContent = text; $('feedback').className = tone; }
  function clue(event) {
    $('clues').innerHTML = event ? event.syn.map((b, i) => `<div class="${b ? 'different' : 'same'}"><span>Q${i + 1} ↔ Q${i + 2}</span><b>${b ? '≠ DIFFERENT' : '= SAME'}</b></div>`).join('') : '<div><span>Q1 ↔ Q2</span><b>—</b></div><div><span>Q2 ↔ Q3</span><b>—</b></div>';
  }
  function packet(event, i, position, current) {
    return `<div class="packet ${current ? 'current' : ''}" style="left:${position}%"><span class="packet-id">${String(i + 1).padStart(2, '0')}</span><span class="coin c1">·</span><span class="signal s1 ${event.syn[0] ? 'different' : 'same'}">${event.syn[0] ? '≠' : '='}</span><span class="coin c2">·</span><span class="signal s2 ${event.syn[1] ? 'different' : 'same'}">${event.syn[1] ? '≠' : '='}</span><span class="coin c3">·</span></div>`;
  }
  function draw() {
    const active = events.findIndex(e => !e.done), approach = 4 * 60 / bpm;
    if (active !== activeIndex) { activeIndex = active; clue(events[active]); }
    if (mode === 'training') {
      $('packets').innerHTML = events[trainingIndex] ? packet(events[trainingIndex], trainingIndex, 55, true) : '';
    } else if (mode === 'run') {
      const visible = events.flatMap((e, i) => {
        const position = 18 + (e.at - time) / approach * 78;
        return !e.done && position >= 0 && position <= 105 && (!$('still').checked || i === active) ? [packet(e, i, $('still').checked ? 18 : position, i === active)] : [];
      });
      $('packets').innerHTML = visible.join('');
      const end = events.at(-1).at + .5, p = Math.min(100, time / end * 100);
      $('progress-fill').style.width = `${p}%`;
      root.querySelector('.progress').setAttribute('aria-valuenow', String(Math.round(p)));
      $('countdown').textContent = time < events[0].at - .23 ? `GET READY · ${Math.max(1, Math.ceil((events[0].at - time) / (60 / bpm)))}` : `${Math.max(0, Math.ceil(end - time))}s LEFT`;
      $('track-label').textContent = $('still').checked && events[active] ? `Round ${active + 1} · act in ${Math.max(0, events[active].at - time).toFixed(1)}s` : 'Read the checks. Hit the line on the beat.';
    }
  }
  function reset(nextMode) {
    mode = nextMode; paused = false; score = combo = best = time = 0; results = []; activeIndex = -1; beatIndex = -1; last = performance.now();
    $('report').hidden = true; $('next').hidden = true; $('wait').hidden = nextMode !== 'training';
    $('progress-fill').style.width = '0%'; root.querySelector('.progress').setAttribute('aria-valuenow', '0');
    root.querySelector('.console').scrollIntoView({ block: 'start', behavior: 'instant' });
    $('pause').disabled = nextMode !== 'run'; $('pause').textContent = 'Pause [P]'; $('track-overlay').hidden = true;
    $('train').disabled = $('play').disabled = false; $('relaxed').disabled = nextMode === 'run';
    root.querySelectorAll('[data-fix]').forEach(button => { button.disabled = false; });
    $('mode').textContent = nextMode === 'training' ? 'PRACTICE / NO TIMER' : 'LIVE / SINGLE-FLIP MIX';
    $('timing').textContent = nextMode === 'training' ? 'TAKE YOUR TIME' : 'WAIT FOR THE HIT LINE';
  }
  function practice() {
    reset('training'); trainingIndex = 0;
    events = trainingErrors.map(error => { const syn = bank.sample(error); return { error, syn, expected: correction(syn), done: false }; });
    $('countdown').textContent = 'UNTIMED · 6 ROUNDS'; $('track-label').textContent = 'Two clues locate one error. The dots hide the stored value.';
    say(tips[0]); updateStats(); draw();
  }
  async function run() {
    await audio.unlock(); reset('run'); bpm = $('relaxed').checked ? 70 : 96;
    events = chart(bank, bpm); $('tempo').textContent = `${bpm} BPM`; $('wait').hidden = true;
    say('Read the current clues. A = Q1, S = Q2, D = Q3. If both say same, wait.'); updateStats(); draw();
  }
  function record(event, result, index) {
    event.done = true; const fidelity = bank.fidelity(event.error, result.fix);
    results.push({ ...result, fidelity, error: event.error, syn: event.syn, index });
    score += result.points; combo = result.correct ? combo + 1 : 0; best = Math.max(best, combo);
    const choice = keyFor(result.fix), expected = keyFor(event.expected);
    const text = result.correct ? (result.fix ? `Correct · ${choice} flips Q${Math.log2(result.fix) + 1}.` : 'Correct · no warning, no correction.') : `${result.timing === 'Miss' ? 'Missed' : 'Wrong choice'} · these clues call for ${expected === 'WAIT' ? 'waiting' : expected}.`;
    say(`${text} ${checksText(event.syn)}.`, result.correct ? 'success' : 'error');
    $('timing').textContent = `${result.timing}${result.delta !== null && result.fix ? ` · ${Math.round(result.delta * 1000)} ms` : ''}`;
    audio.answer(result.correct, result.fix); updateStats();
  }
  function act(fix) {
    if (paused || $('dialog').open || !bank) return;
    if (mode === 'training') {
      const event = events[trainingIndex]; if (!event || event.done) return;
      record(event, { correct: fix === event.expected, fix, delta: null, timing: 'Practice', points: fix === event.expected ? 100 : 0 }, trainingIndex);
      $('next').hidden = false; $('wait').hidden = true;
      root.querySelectorAll('[data-fix]').forEach(b => { b.disabled = true; });
      $('next').focus(); return;
    }
    if (mode !== 'run' || fix === 0) return;
    const index = events.findIndex(e => !e.done); if (index < 0) return;
    const event = events[index], result = judge(event, fix, time);
    if (!result) { say(time < event.at ? 'Too early · keep reading, wait for the hit line.' : 'Outside the timing window.', 'error'); $('timing').textContent = 'NO CORRECTION APPLIED'; return; }
    record(event, result, index); draw();
    if (events.every(e => e.done)) finish();
  }
  function finish() {
    const trained = mode === 'training'; mode = 'result'; paused = false;
    $('mode').textContent = trained ? 'PRACTICE COMPLETE' : 'MIX COMPLETE'; $('pause').disabled = true; $('relaxed').disabled = false; $('next').hidden = $('wait').hidden = true;
    $('progress-fill').style.width = '100%'; root.querySelector('.progress').setAttribute('aria-valuenow', '100');
    root.querySelectorAll('[data-fix]').forEach(b => { b.disabled = true; });
    $('round').textContent = `${results.length} / ${events.length}`; $('countdown').textContent = 'NICE WORK · CHECK YOUR MIX';
    $('packets').innerHTML = ''; clue(null); $('track-overlay').hidden = false; $('track-overlay').textContent = trained ? 'PRACTICE COMPLETE' : 'MIX COMPLETE';
    const right = results.filter(r => r.correct).length, timed = results.filter(r => r.correct && r.fix && r.delta !== null), perfect = timed.filter(r => r.timing === 'Perfect').length;
    const f = results.reduce((s, r) => s + r.fidelity, 0) / results.length;
    $('report').innerHTML = `<div class="report-head"><div class="eyebrow">${trained ? 'YOU KNOW THE CONTROLS' : 'YOUR MIX, DECODED'}</div><h2>${right / results.length >= .8 ? 'A steady hand on a fragile state.' : 'Every miss is a clue for the next mix.'}</h2><p>${trained ? 'Now try reading the same clues on the beat.' : 'Choosing a correction and timing it are two separate skills.'}</p></div><div class="report-stats"><div><strong>${right} / ${results.length}</strong><span>Correct choices</span></div><div><strong>${trained ? 'Untimed' : `${perfect} / ${timed.length}`}</strong><span>Perfect hits / correct taps</span></div><div><strong>${best}</strong><span>Best streak</span></div><div><strong>${percent(f)}</strong><span>Mean state preservation*</span></div></div><p class="quiet">*${engine.kind === 'qiskit' ? 'Sampled Qiskit' : 'Exact local simulation'} result across six input states for the error and correction in each round. Each round is a fresh register; this is not continuous quantum memory.</p><details><summary>See the last 10 rounds</summary><div class="table-scroll"><table><thead><tr><th>Round</th><th>Checks</th><th>Your choice</th><th>Timing</th><th>State preservation</th></tr></thead><tbody>${results.slice(-10).map(r => `<tr><td>${r.index + 1}</td><td>${r.syn.join('')}</td><td>${keyFor(r.fix)} · ${r.correct ? 'correct' : 'incorrect'}</td><td>${r.timing}</td><td>${percent(r.fidelity)}</td></tr>`).join('')}</tbody></table></div></details><div class="launch"><button id="again" class="primary">${trained ? 'Start a rhythm run ▶' : 'Play another mix ↗'}</button><button id="report-lab" class="secondary">Try the two-error experiment</button></div>`;
    $('report').hidden = false; $('again').onclick = run; $('report-lab').onclick = lab; $('report').focus();
    say(trained ? 'Practice complete. You’re ready for the rhythm run.' : 'Run complete. Your report separates correct choices from timing.');
  }
  function togglePause(force) {
    if (mode !== 'run') return;
    paused = typeof force === 'boolean' ? force : !paused;
    $('pause').textContent = paused ? 'Resume [P]' : 'Pause [P]'; $('track-overlay').hidden = !paused; $('track-overlay').textContent = 'PAUSED';
    $('mode').textContent = paused ? 'PAUSED' : 'LIVE / SINGLE-FLIP MIX'; last = performance.now();
  }
  function openDialog(html) {
    dialogPaused = mode === 'run' && !paused; if (dialogPaused) togglePause(true);
    $('dialog-body').innerHTML = html; $('dialog').showModal(); $('close-dialog').focus();
  }
  function lab() {
    const single = bank.sample(4), double = bank.sample(3), fix = correction(double);
    openDialog(`<div class="eyebrow">THE TWO-ERROR EXPERIMENT</div><h2 id="dialog-title">Same clues. Different problem.</h2><p>The decoder assumes at most one flip. But Q3 flipping once and Q1 + Q2 flipping together produce the same ideal checks: <strong>same / different</strong>.</p><div class="lab-grid"><article><span class="lab-count">ONE ERROR</span><h3>Q3 flips</h3><p>Observed checks: ${checksText(single)}</p><p>Rule chooses <strong>${keyFor(correction(single))}</strong></p><strong class="lab-value">${percent(bank.fidelity(4, correction(single)))}</strong><small>Mean state preservation</small></article><article><span class="lab-count">TWO ERRORS</span><h3>Q1 + Q2 flip</h3><p>Observed checks: ${checksText(double)}</p><p>Rule chooses <strong>${keyFor(fix)}</strong></p><strong class="lab-value warning">${percent(bank.fidelity(3, fix))}</strong><small>Mean state preservation</small></article></div><p><strong>Why it fails:</strong> flipping Q3 in the second case leaves all three qubits flipped. The checks now agree, but the stored logical state may have changed. “No warning” does not always mean “no damage”.</p><p class="quiet">Two flips in separate rounds can each be corrected. Two simultaneous flips need more information or a stronger code. On a noisy simulator, observed checks and sampled preservation can vary.</p><details><summary>What the quantum experiment measures</summary><p>Each case prepares |0⟩, |1⟩, |+⟩, |−⟩, |+i⟩, and |−i⟩. After correction, we undo encoding and preparation and measure all three data qubits. The probability of 000 is the overlap with the original encoded state. The displayed value averages all six. For a triple X error, the ideal average is 1/3: the two X-basis states survive, while the other four do not.</p></details>`);
  }
  function about() {
    openDialog(`<div class="eyebrow">THE SCIENCE BEHIND THE BEAT</div><h2 id="dialog-title">Protect the state. Read the clues.</h2><p>Think of a qubit as a spinning coin. It can hold a blend of two possibilities; this analogy is only a starting point. Looking directly can disturb that blend.</p><p>We encode <strong>one logical qubit across three physical qubits</strong>, not three independent copies. Two helper qubits check neighboring parity. Their signals reveal where a single bit flip happened, without revealing the protected value.</p><div class="formula">α|0⟩ + β|1⟩ → α|000⟩ + β|111⟩</div><p><strong>A / S / D</strong> apply an X gate to Q1 / Q2 / Q3. An X gate reverses a bit flip. The three-qubit code protects against one bit flip per round; it does not protect against phase errors.</p><p>The rhythm is a learning mechanic. It does not represent hardware speed or a fault-tolerance threshold.</p><details><summary>Simulator and verification details</summary><p>${escape(engine.label)}. The Qollab version builds 192 Qiskit circuits and runs them in one job. Check results are sampled from that job. The local preview uses an independently cross-checked JS simulator. State preservation evaluates six input states, including superpositions. Results are reused across fresh rounds, rather than running a job per keypress.</p><p>This is an educational simulation with explicit X errors and terminal measurements. Ideal gates in the local preview; a selected noisy backend may add noise. No quantum advantage or general error correction is claimed.</p></details>`);
  }
  $('train').onclick = practice; $('play').onclick = run; $('about').onclick = about; $('lab').onclick = lab; $('pause').onclick = () => togglePause();
  root.querySelector('.brand').onclick = e => { e.preventDefault(); if (mode === 'run') togglePause(true); window.scrollTo({ top: 0, behavior: 'instant' }); };
  $('sound').onclick = async () => { audio.enabled = !audio.enabled; $('sound').textContent = audio.enabled ? '♪ Sound on' : '♪ Sound off'; $('sound').setAttribute('aria-pressed', String(audio.enabled)); if (audio.enabled) await audio.unlock(); };
  $('wait').onclick = () => act(0); root.querySelectorAll('[data-fix]').forEach(b => { b.onclick = () => act(Number(b.dataset.fix)); });
  $('next').onclick = () => {
    trainingIndex++; if (trainingIndex === events.length) return finish();
    $('next').hidden = true; $('wait').hidden = false; root.querySelectorAll('[data-fix]').forEach(b => { b.disabled = false; });
    say(tips[trainingIndex]); updateStats(); draw(); root.querySelector('[data-fix]').focus();
  };
  $('close-dialog').onclick = () => $('dialog').close();
  $('dialog').addEventListener('close', () => { if (dialogPaused) togglePause(false); dialogPaused = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) togglePause(true); });
  window.addEventListener('blur', () => { togglePause(true); });
  window.addEventListener('keydown', e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || $('dialog').open) return;
    const key = e.key.toLowerCase();
    if (key === 'p') { e.preventDefault(); togglePause(); }
    const fix = { a: 1, s: 2, d: 4 }[key];
    if (fix) { e.preventDefault(); act(fix); }
    if (key === 'w' && mode === 'training') { e.preventDefault(); act(0); }
  });
  try {
    const specs = allSpecs(); bank = makeBank(specs, await engine.run(specs));
    $('source').textContent = engine.label; $('train').disabled = $('play').disabled = $('lab').disabled = false;
    say('Start with six untimed practice rounds, or jump into the beat.');
    const demo = { syn: syndrome(2) }; $('packets').innerHTML = packet(demo, 0, 63, true); clue(demo);
    root.querySelectorAll('[data-fix]').forEach(b => { b.disabled = true; });
  } catch (err) {
    say(`Could not prepare experiments: ${err.message}. On Qollab, select a free simulator and run again.`, 'error'); $('source').textContent = 'Simulator unavailable'; return;
  }
  function frame(now) {
    if (mode === 'run' && !paused) {
      const elapsed = (now - last) / 1000;
      if (elapsed > 1.5) { togglePause(true); say('Paused after a long frame delay. Resume when you’re ready.'); last = now; requestAnimationFrame(frame); return; }
      time += elapsed;
      const beat = Math.floor(time / (60 / bpm)); if (beat !== beatIndex) { beatIndex = beat; audio.beat(beat); }
      events.forEach((e, i) => { if (!e.done && time > e.at + .23) record(e, missed(e), i); });
      if (events.every(e => e.done)) finish(); else draw();
    }
    last = now; requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
