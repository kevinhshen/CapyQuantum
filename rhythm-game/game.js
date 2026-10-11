import { BlochSphere } from './sphere.js';
import { initTutorial } from './tutorial.js';
import { learningPath } from './content.js';
import { beatToSeconds, secondsToBeat } from './timing.js';
import { allSpecs, makeBank, COUNTS } from './model.js';
import { getMap, listMaps, registerMap, laneKeys } from './maps.js';
import { RhythmRun, WINDOWS } from './rhythm.js';
import { MusicTransport, registerComposer } from './audio.js';
import { TempoGarden } from './garden.js';
import { HitFeedback } from './feedback.js';

const html = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// The mesh and state vector are projected in sphere.js; poles stay identifiable.
const stateSphere = `<svg class="state-sphere" viewBox="0 0 520 400" role="img" aria-labelledby="sphere-title sphere-desc">
  <title id="sphere-title">Single-qubit state space</title><desc id="sphere-desc">A rotating view of a Bloch sphere: zero and one are its poles, and psi marks one fixed pure state on its surface. This illustration is separate from the four-qubit register below; it is not live quantum data.</desc>
  <defs><radialGradient id="sphere-glow"><stop stop-color="#deeb4922"/><stop offset="1" stop-color="#deeb4900"/></radialGradient></defs>
  <circle cx="260" cy="198" r="178" fill="url(#sphere-glow)"/>
  <g class="sphere-reticle" fill="none" stroke="currentColor"><circle cx="260" cy="198" r="165" stroke-dasharray="1 14"/><path d="M74 198H92M428 198H446M260 12V30M260 366V384"/></g>
  <g class="sphere-mesh" fill="none" stroke="currentColor" stroke-width=".7"><path data-mesh-back opacity=".23"/><circle cx="260" cy="198" r="143" opacity=".55"/><path data-mesh-front opacity=".8"/></g>
  <g class="sphere-axes" fill="none" stroke="currentColor" stroke-dasharray="3 5"><path data-axes/></g>
  <g class="sphere-state" fill="none" stroke="currentColor"><path data-state-guide stroke-dasharray="3 5" opacity=".28"/><path data-vector stroke-width="1.8"/><circle data-state-tip r="5" fill="currentColor"/><circle data-state-halo r="13" opacity=".35"/></g>
  <circle cx="260" cy="198" r="3" fill="#e8edf2"/>
  <g class="sphere-labels" fill="currentColor"><text x="271" y="37">|0⟩</text><text x="271" y="374">|1⟩</text><text data-state-label class="psi-label">|ψ⟩</text><text data-axis-x>x</text><text data-axis-y>y</text></g>
</svg>`;
const pct = n => `${(n * 100).toFixed(1)}%`;
export async function startGame(root, engine) {
  root.innerHTML = `<main class="garden-game" data-state="home">
    <canvas id="garden" aria-hidden="true"></canvas>
    <header class="hud"><a class="brand" href="#" aria-label="Home"><span class="brand-orbit" aria-hidden="true"><i></i><i></i><i></i></span><span>QUBIT <em>TEMPO</em><small>QUANTUM ERROR CORRECTION</small></span></a><div class="song-label"><b id="song-name">Morning dew</b><span id="section">Read checks. Choose a correction.</span></div><div class="score-pill"><b id="score">000000</b><small>SCORE</small></div><nav><button id="sound" aria-label="Mute music" aria-pressed="false">♫</button><button id="help" aria-label="How to play">?</button><button id="pause" aria-label="Pause map" disabled>Ⅱ</button></nav></header>
    <div class="song-progress" role="progressbar" aria-label="Map progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="song-fill"></i></div>
    <section id="deck" class="deck" aria-label="Vertical qubit note highway"><div class="highway"><div id="lane-grid" class="lane-grid" aria-hidden="true"></div><div class="highway-grain" aria-hidden="true"></div><div class="hit-line" aria-hidden="true"><span>RECOVER HERE</span></div><div id="notes" class="notes" aria-hidden="true"></div><div id="judgement" class="judgement" aria-hidden="true"></div><div class="combo-display"><b id="combo">0</b><span id="combo-label">COMBO</span></div><div id="receptors" class="receptors"></div><div id="count-in" class="count-in" aria-hidden="true"></div></div><div class="deck-caption"><span id="keys-caption">D · F · J</span><span id="clue-caption">three qubits, one protected memory</span></div></section>
    <section id="home-page" class="page home-page" aria-labelledby="home-title">
      <div class="home-demo">
        <div class="demo-caption"><span class="signal-dot"></span> SINGLE-QUBIT STATE SPACE <span class="figure-number">FIG. 01</span></div>
        ${stateSphere}
        <div class="sphere-caption"><span>Pure states lie on the surface.</span><button id="sphere-motion" type="button" aria-pressed="false">Pause rotation</button></div>
        <div class="register-example" role="img" aria-label="Four physical qubits. A bit flip on Q2 makes both adjacent parity checks different; one X correction on Q2 repairs this example.">
          <div class="demo-caption">ENCODED REGISTER <span class="figure-number">Q1 — Q4</span></div>
          <div class="memory-art"><span>Q1</span><i class="alert">≠</i><span class="fault">Q2</span><i class="alert">≠</i><span>Q3</span><i>=</i><span>Q4</span></div>
          <div class="demo-answer">Two different checks. <b>One X correction on Q2.</b></div>
        </div>
      </div>
      <div class="home-copy"><div class="eyebrow"><span></span> CAPYQUANTUM / INTERACTIVE QEC</div><h1 id="home-title" tabindex="-1">QUBIT<br>TEMPO<span>.</span></h1><p class="home-intro">Protect quantum information.<br>One correction at a time.</p><p class="home-explainer">Read the checks between qubits. Find the error.<br>Apply a correction on the beat.</p><div class="home-actions"><button id="home-start" class="primary">Start experience <span>→</span></button><button id="home-learn">Learn the science <span>↗</span></button><button id="home-settings">Settings <span>＋</span></button></div><p class="small-note">New to quantum? Explore Learn or try untimed practice.</p><div class="home-sequence" aria-label="Game sequence"><span><b>01</b> ENCODE</span><i>—</i><span><b>02</b> DETECT</span><i>—</i><span><b>03</b> CORRECT</span></div></div>
    </section>
    <section id="levels-page" class="page levels-page" aria-labelledby="levels-title" hidden><div class="page-heading"><button id="levels-home" class="back">← Home</button><div><div class="eyebrow">PLAY</div><h1 id="levels-title" tabindex="-1">Choose a level</h1></div></div><div class="level-layout"><div id="level-list" class="level-list" aria-label="Levels"></div><aside id="map-letter" class="level-detail"><div class="eyebrow" id="level-difficulty">LEVEL DETAILS</div><h2 id="level-title">Morning dew</h2><p id="level-description"></p><label class="field" hidden>MAP<select id="map-select" aria-label="Map"></select></label><label class="field">PHYSICAL QUBITS<select id="qubits" aria-label="Qubit count">${COUNTS.map(d => `<option value="${d}" ${d === 4 ? 'selected' : ''}>${d} lanes · correct up to ${Math.floor((d - 1) / 2)} bit flip${d > 4 ? 's' : ''}</option>`).join('')}</select></label><div class="map-info"><span id="map-bpm"></span><span id="map-duration"></span><span id="map-notes"></span></div><div id="chart-preview" class="chart-preview" aria-label="Timing preview"></div><p class="small-note">Timing preview · taller marks indicate chords.</p><button id="play" class="primary" disabled>Preparing Qiskit…</button><button id="practice" class="subtle" disabled>Untimed practice</button></aside></div></section>
    <section id="learn-page" class="page learn-page" aria-labelledby="learn-title" hidden><div class="page-heading"><button id="learn-home" class="back">← Home</button><div><div class="eyebrow">LEARN</div><h1 id="learn-title" tabindex="-1">Quantum, one idea at a time</h1></div></div><div class="learn-layout"><nav id="lesson-tabs" class="lesson-tabs" aria-label="Lessons"></nav><article id="lesson-body" class="lesson-body"></article></div></section>
    <section id="settings-page" class="page settings-page" aria-labelledby="settings-title" hidden><div class="page-heading"><button id="settings-home" class="back">← Home</button><div><div class="eyebrow">SETTINGS</div><h1 id="settings-title" tabindex="-1">Make it comfortable</h1></div></div><div id="settings-body" class="settings-body"></div></section>
    <p id="load-status" class="runtime-status" role="status" aria-live="polite">Preparing quantum reference experiments.</p>
    <div id="practice-hint" class="practice-hint" hidden><span>✧</span><p id="practice-text">Read the clues, then catch the notes.</p><button id="practice-next" hidden>Continue [W]</button></div>
    <div class="bottom-note"><span>✧ This effort is supported by Qollab & IonQ</span><span id="bottom-status">Bit-flip repetition code · educational simulation</span></div>
    <div id="live" class="sr-only" role="status" aria-live="polite"></div>
    <dialog id="dialog" aria-labelledby="dialog-title"><div id="dialog-body"></div><div id="dialog-actions"></div></dialog>
  </main>`;
  const $ = id => root.querySelector(`#${id}`), main = root.querySelector('main');
  const music = new MusicTransport(), art = new TempoGarden($('garden')), hooks = new EventTarget();
  const sphere = new BlochSphere(root.querySelector('.state-sphere'), $('sphere-motion'));
  const reducedPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const highway = root.querySelector('.highway'), judgement = $('judgement'), comboDisplay = root.querySelector('.combo-display');
  const feedback = new HitFeedback(highway, judgement, comboDisplay);
  let reportedResults = 0, receptors = [], highwayHeight = 0, comboMilestone = 0;
  const laneSources = new Map();
  function reportPackets() {
    for (const event of run.feedbackEvents) {
      const {note, type} = event, cue = note.cue;
      if (type === 'note-miss') {
        if (cue.missReported) continue; cue.missReported = true;
        if (cue.notes.every(n => n.done)) { cue.exitUntil = performance.now() + 280; feedback.miss(cue); } else feedback.miss();
        feedback.judge('Miss', 'miss');
        announce('Missed correction beat. Combo reset.');
        emit('note-miss', { packetId: note.packet.id, cueId: cue.id });
      } else {
        feedback.judge(note.holdSuccess ? 'Hold complete' : 'Hold released early', note.holdSuccess ? 'hit' : 'miss');
        if (note.holdSuccess) { feedback.hit(note.heldLane, note.outcome.timing, true); music.hit(note.heldLane); }
        else if (cue.notes.every(n => n.done)) { cue.exitUntil = performance.now() + 280; feedback.miss(cue, true); } else feedback.miss();
        announce(note.holdSuccess ? 'Hold complete. One correction applied.' : 'Released early. Hold rhythm credit lost; no extra X gate was applied.');
        emit(type, { lane: note.heldLane, packetId: note.packet.id });
      }
      judgementUntil = performance.now() + 650;
    }
    run.feedbackEvents.length = 0;
    for (; reportedResults < run.results.length; reportedResults++) {
      const result = run.results[reportedResults]; if (!practice) music.memory(result.restored, reportedResults); emit('packet-resolved', result);
    }
    if (!run.combo) comboMilestone = 0;
    const milestone = Math.floor(run.combo / 10);
    if (milestone > comboMilestone) { comboMilestone = milestone; feedback.milestone(milestone * 10); art.celebrate(still); $('combo-label').textContent = `${milestone * 10} · STREAK`; }
    else if (!run.combo) $('combo-label').textContent = 'COMBO';
  }
  function clearInputs() { held.clear(); laneSources.clear(); receptors.forEach(button => button.classList.remove('pressed', 'holding')); }
  function inputDown(lane, source) {
    if (paused || !['playing', 'practice'].includes(mode)) return;
    const sources = laneSources.get(lane) || new Set();
    if (sources.has(source)) return;
    sources.add(source); laneSources.set(lane, sources);
    if (sources.size === 1) act(lane);
  }
  function inputUp(lane, source) {
    const sources = laneSources.get(lane); if (!sources) return;
    sources.delete(source); if (sources.size) return; laneSources.delete(lane);
    if (run && !paused && ['playing', 'practice'].includes(mode)) {
      run.release(lane, currentTime() + (practice ? 0 : offsetMs / 1000)); reportPackets();
      $('score').textContent = String(run.score).padStart(6, '0'); $('combo').textContent = String(run.combo); drawNotes(currentTime());
    }
  }
  let bank = null, run = null, mode = 'home', map = getMap('morning-dew', 4), practice = false, practiceIndex = 0, practiceTime = 0;
  let approach = 2.4, offsetMs = 0, still = reducedPreference.matches;
  let paused = false, pausedAt = 0, lastFrame = performance.now(), lastSection = '', lastClue = '', judgementUntil = 0, held = new Set();
  main.dataset.reduced = String(still);
  reducedPreference.addEventListener('change', e => { still = e.matches; feedback.reduced = still; main.dataset.reduced = String(still); if ($('static-mode')) $('static-mode').checked = still; });
  function emit(type, detail) { hooks.dispatchEvent(new CustomEvent(type, { detail })); }
  function announce(text) { $('live').textContent = text; }
  function menuStatus(text) { $('load-status').textContent = text; }
  function setState(state) {
    mode = state; main.dataset.state = state;
    for (const page of ['home', 'levels', 'learn', 'settings']) $(`${page}-page`).hidden = state !== page;
    const active = ['playing', 'practice'].includes(state);
    $('deck').hidden = !active; $('pause').hidden = !active; $('pause').disabled = !active;
    root.querySelector('.song-progress').hidden = !active; root.querySelector('.score-pill').hidden = !active;
    root.querySelector('.song-label').hidden = !active; $('load-status').hidden = active;
  }
  function navigate(page) { closeDialog(); setState(page); $(`${page === 'home' ? 'home' : page}-title`)?.focus(); }

  function populateMaps(selected = $('map-select').value || 'morning-dew') {
    $('map-select').innerHTML = listMaps().map(m => `<option value="${html(m.id)}">${html(m.title)}</option>`).join(''); $('map-select').value = selected; renderLevelList();
  }
  function refreshMap() {
    const definition = listMaps().find(m => m.id === $('map-select').value);
    if (definition?.qubits) $('qubits').value = String(definition.qubits);
    $('qubits').disabled = Boolean(definition?.qubits);
    map = getMap($('map-select').value, Number($('qubits').value));
    $('song-name').textContent = map.title; $('section').textContent = map.artist;
    $('map-bpm').textContent = `${[map.bpm, ...map.tempoChanges.map(change => change.bpm)].filter((bpm, index, values) => !index || bpm !== values[index - 1]).join(' → ')} BPM`; $('map-duration').textContent = `${Math.round(beatToSeconds(map, map.durationBeats))} seconds`;
    $('keys-caption').textContent = laneKeys(map.qubits).join(' · ');
    $('clue-caption').textContent = `${map.qubits} qubits · one protected memory`;
    $('deck').style.setProperty('--lanes', map.qubits); $('deck').style.setProperty('--deck-width', `${240 + map.qubits * 55}px`);
    $('lane-grid').innerHTML = laneKeys(map.qubits).map((key, lane) => `<div class="lane" style="--lane:${lane}"><span>Q${lane + 1}</span></div>`).join('');
    $('receptors').innerHTML = laneKeys(map.qubits).map((key, lane) => `<button data-lane="${lane}" aria-label="Flip qubit ${lane + 1}, ${key === 'SPACE' ? 'Space' : key}"><span>${key === 'SPACE' ? '␣' : key}</span><small>Q${lane + 1}</small></button>`).join('');
    receptors = [...$('receptors').querySelectorAll('button')]; feedback.configure(receptors, still);
    receptors.forEach(button => {
      button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); inputDown(Number(button.dataset.lane), `pointer-${e.pointerId}`); });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, e => inputUp(Number(button.dataset.lane), `pointer-${e.pointerId}`));
      button.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inputDown(Number(button.dataset.lane), 'enter'); } });
      button.addEventListener('keyup', e => { if (e.key === 'Enter') { e.preventDefault(); inputUp(Number(button.dataset.lane), 'enter'); } });
      button.addEventListener('click', e => { if (e.detail === 0) { inputDown(Number(button.dataset.lane), 'accessible'); inputUp(Number(button.dataset.lane), 'accessible'); } });
    });
    $('level-difficulty').textContent = 'LEVEL DETAILS';
    $('level-title').textContent = map.title;
    $('level-description').textContent = map.description || ({ 'morning-dew': 'Short phrases and generous gaps for learning the checks.', 'lantern-waltz': 'Practice offbeats, changing gaps, and longer musical phrases.', 'firefly-rush': 'Faster syncopation and short rests. Try wider lanes for chords and rapid corrections.' })[map.id] || 'A team-authored map. Use untimed practice to learn its correction patterns.';
    const holdCount = map.events.reduce((total, event) => total + event.steps.reduce((n, step) => n + (step.holdBeats ? step.lanes.length : 0), 0), 0);
    $('map-notes').textContent = `${map.events.reduce((n, e) => n + e.steps.reduce((a, step) => a + step.lanes.length, 0), 0)} notes · ${holdCount} holds`;
    $('chart-preview').innerHTML = `<svg viewBox="0 0 400 45" role="img" aria-label="Correction times across this level"><path d="M0 38H400" stroke="currentColor" opacity=".2"/>${map.events.flatMap(e => e.steps.map(step => `<path d="M${(e.beat + step.offset) / map.durationBeats * 400} 38v-${9 + step.lanes.length * 7}" stroke="currentColor" stroke-width="3"/>`)).join('')}</svg>`;
    renderLevelList();

  }
  function renderLevelList() {
    $('level-list').innerHTML = listMaps().map((entry, i) => {
      const preview = getMap(entry.id, Number($('qubits').value));
      return `<button class="level-card ${entry.id === $('map-select').value ? 'selected' : ''}" data-map="${html(entry.id)}" aria-pressed="${entry.id === $('map-select').value}"><span class="level-number">${String(i + 1).padStart(2, '0')}</span><span><b>${html(entry.title)}</b><small>${preview.bpm} BPM · ${Math.round(beatToSeconds(preview, preview.durationBeats))}s · ${html(entry.artist)}</small></span><span class="level-arrow">→</span></button>`;
    }).join('') + `<details class="learning-path"><summary>Guided learning path</summary><div class="path-presets">${learningPath.map((level, i) => `<button data-preset="${i}"><b>${html(level.name)}</b><small>${html(level.description)}</small></button>`).join('')}</div></details>`;
    root.querySelectorAll('[data-map]').forEach(button => button.onclick = () => { const id = button.dataset.map; $('map-select').value = id; refreshMap(); [...root.querySelectorAll('[data-map]')].find(item => item.dataset.map === id)?.focus(); });
    root.querySelectorAll('[data-preset]').forEach(button => button.onclick = () => {
      const level = learningPath[Number(button.dataset.preset)];
      $('map-select').value = level.map; $('qubits').value = String(level.qubits); refreshMap();
      $('level-difficulty').textContent = `LEARNING PATH · ${level.name.toUpperCase()}`;
      $('play').focus(); announce(`${level.name}: ${level.description}`);
    });
  }
  function showDialog(body, actions) {
    $('dialog-body').innerHTML = body; $('dialog-actions').innerHTML = actions;
    if (!$('dialog').open) $('dialog').showModal();
  }
  function closeDialog() { if ($('dialog').open) $('dialog').close(); }
  async function pauseGame() {
    if (!['playing', 'practice'].includes(mode) || paused) return;
    paused = true; pausedAt = performance.now(); feedback.pause(true); run?.suspendHolds(); clearInputs(); await music.pause();
    showDialog(`<div class="eyebrow">PAUSED</div><h2 id="dialog-title">Map paused.</h2><p>${html(map.title)} · the music and map are paused. Re-press any held keys after resuming to finish their tails.</p>`, '<button id="resume" class="primary">Resume map ↗</button><button id="restart" class="subtle">Start again</button><button id="choose" class="subtle">Choose a map</button>');
    $('resume').onclick = resumeGame; $('restart').onclick = () => { closeDialog(); start(practice); }; $('choose').onclick = toMenu;
  }
  async function resumeGame() { closeDialog(); await music.resume(); const elapsed = performance.now() - pausedAt; judgementUntil += elapsed; for (const cue of run.cues) if (cue.exitUntil > pausedAt) cue.exitUntil += elapsed; feedback.pause(false); paused = false; lastFrame = performance.now(); }
  function toMenu() {
    closeDialog(); music.stop(); feedback.reset(); music.context?.resume(); paused = false; clearInputs(); run = null; setState('levels');
    $('practice-hint').hidden = true; menuStatus(engine.label); $('judgement').textContent = ''; $('song-fill').style.width = '0%'; root.querySelector('.song-progress').setAttribute('aria-valuenow', '0'); refreshMap(); $('levels-title').focus();
  }
  async function start(untimed = false) {
    if (!bank || mode === 'starting') return; setState('starting'); closeDialog(); refreshMap(); practice = untimed; paused = false; clearInputs(); lastSection = lastClue = '';
    let playMap = structuredClone(map);
    if (practice) {
      const choices = [map.events[0], map.events[1], map.events.find(e => e.steps.some(s => s.holdBeats > 0)), map.events.find(e => e.steps.some(s => s.lanes.length > 1)), map.events.find(e => e.steps.length > 1), map.events.find(e => !e.error.length)];
      const chosen = [...new Set(choices.filter(Boolean))];
      for (const event of map.events) { if (chosen.length >= 6) break; if (!chosen.includes(event)) chosen.push(event); }
      playMap.events = structuredClone(chosen.sort((a, b) => a.beat - b.beat));
    }
    run = new RhythmRun(playMap, bank, { untimed: practice }); reportedResults = comboMilestone = 0; art.blooms = 0; art.particles = []; practiceIndex = 0;
    judgement.textContent = ''; judgementUntil = 0; feedback.reduced = still; main.dataset.reduced = String(still);
    $('play').disabled = $('practice').disabled = true; menuStatus('Starting the music…');
    try {
      if (practice) { await music.init(); music.stop(); music.map = map; music.external = Boolean(map.music.url); music.paused = false; music.updateGains(); setState('practice'); practiceTime = run.packets[0].at; }
      else { await music.start(map); setState('playing'); }
    } catch (error) { music.stop(); setState('levels'); menuStatus(error.message); $('play').disabled = $('practice').disabled = false; return; }
    $('play').disabled = $('practice').disabled = false; $('practice-hint').hidden = !practice;
    $('notes').innerHTML = run.cues.map(c => `<div id="cue-${c.id}" class="error-packet ${c.endAt > c.at ? 'hold-packet' : ''}">${c.endAt > c.at ? '<div class="hold-body" aria-hidden="true"><span>HOLD</span></div>' : ''}<div class="packet-tag">${c.endAt > c.at ? 'HOLD · ' : ''}${c.clean ? 'WAIT · NO CORRECTION' : `FLIP ${c.notes.length} QUBIT${c.notes.length > 1 ? 'S' : ''}`} ${c.total > 1 ? `· ${c.order + 1}/${c.total}` : ''}</div><div class="packet-register" style="--lanes:${map.qubits}">${laneKeys(map.qubits).map((key, q) => `<span class="packet-qubit" data-qubit="${q}"><i class="qubit-orbit" aria-hidden="true"></i><small>Q${q + 1}</small></span>${q < map.qubits - 1 ? `<span class="parity-lamp" data-check="${q}" style="left:${(q + 1) / map.qubits * 100}%">=</span>` : ''}`).join('')}</div></div>`).join('');
    run.cues.forEach(c => { c.element = $(`cue-${c.id}`); c.register = c.element.querySelector('.packet-register'); c.body = c.element.querySelector('.hold-body'); c.lamps = [...c.element.querySelectorAll('[data-check]')]; c.qubits = [...c.element.querySelectorAll('[data-qubit]')]; c.element.hidden = true; });
    highwayHeight = highway.clientHeight; $('combo').textContent = '0'; $('combo-label').textContent = 'COMBO'; $('score').textContent = '000000';
    emit('map-start', { map: structuredClone(map), practice }); announce(`Starting ${map.title}, ${map.qubits} lanes. Keys: ${laneKeys(map.qubits).join(', ')}.`);
    $('receptors').querySelector('button')?.focus(); lastFrame = performance.now(); drawNotes(currentTime());
  }
  function currentTime() { return practice ? practiceTime : music.time(); }
  function finishPracticePacket() {
    const p = run.packets[practiceIndex];
    if (!p) return finish();
    run.advance(p.end + .001); reportPackets(); practiceIndex++;
    if (practiceIndex >= run.packets.length) return finish();
    practiceTime = run.packets[practiceIndex].at; drawNotes(practiceTime);
  }
  function act(lane) {
    if (!run || paused || !['playing', 'practice'].includes(mode)) return;
    const time = currentTime() + (practice ? 0 : offsetMs / 1000);
    const event = run.press(lane, time); reportPackets();
    if (event.type === 'hold-resume') { announce(`Continue holding qubit ${lane + 1}. No extra X gate applied.`); drawNotes(currentTime()); return; }
    receptors[lane].classList.add('pressed');

    $('score').textContent = String(run.score).padStart(6, '0'); $('combo').textContent = String(run.combo);
    feedback.judge(event.type === 'hit' ? event.correct ? event.holding ? `Hold · ${event.timing}` : event.timing : 'Added an error' : event.correct === false ? 'Added an error' : 'Stray', event.correct === false ? 'wrong' : event.type, !practice && event.correct && event.type === 'hit' ? event.delta * 1000 : null); judgementUntil = performance.now() + 450;
    if (event.type === 'hit' && event.correct) {
      music.hit(lane); feedback.hit(lane, event.timing);
      emit('note-hit', { mapId: map.id, lane, timing: event.timing, correct: event.correct, deltaMs: event.delta * 1000, combo: run.combo, packetId: event.note.packet.id });
    } else { music.errorTone(); feedback.wrong(lane); emit(event.type === 'hit' ? 'wrong-correction' : 'stray-input', { lane, time, correct: event.correct }); }
    if (event.packet) announce(`Qubit ${lane + 1} flipped. Checks: ${run.checks(event.packet).map(b => b ? 'different' : 'same').join(', ')}.`);
    if (practice) { const remaining = run.cues.find(c => c.packet === run.packets[practiceIndex] && c.notes.some(n => !n.done)); if (remaining) practiceTime = remaining.at; drawNotes(practiceTime); }
  }
  function drawNotes(time) {
    const height = highwayHeight, hit = height - 92, now = performance.now();
    const currentPacket = practice ? run.packets[practiceIndex] : run.packets.find(p => !p.done && p.end >= time);
    const closest = run.cues.find(c => !c.packet.done && (!practice || c.packet === currentPacket) && (c.clean || c.notes.some(n => !n.done))) || run.cues.filter(c => c.packet === currentPacket).at(-1);
    for (const cue of run.cues) {
      const y = hit - (cue.at - time) / approach * (hit - 25);
      const sustaining = cue.notes.some(n => n.holding);
      const positionY = still || practice || sustaining ? hit : y;
      const exiting = cue.exitUntil > now;
      const display = exiting || !cue.exitUntil && !cue.packet.done && (practice || time <= (cue.endAt > cue.at ? cue.endAt : cue.at) + WINDOWS.good) && positionY > -100 && positionY < height && (!practice || (cue.packet === currentPacket && cue === closest)) && (!still || cue === closest);
      if (cue.element.hidden === display) cue.element.hidden = !display;
      if (display) {
        cue.element.style.transform = `translateY(${(exiting ? hit : positionY) - 40}px)`;
        const body = cue.body;
        if (body) { body.hidden = !exiting && cue.notes.every(n => n.done); if (!exiting) body.style.height = `${Math.max(0, cue.endAt - Math.max(cue.at, time)) / approach * (hit - 25)}px`; }
        cue.element.classList.toggle('sustaining', sustaining);
        if (cue.lastApplied !== cue.packet.applied) {
          const checks = run.checks(cue.packet); cue.lastApplied = cue.packet.applied;
          cue.lamps.forEach((lamp, index) => { const bit = checks[index]; lamp.textContent = bit ? '≠' : '='; lamp.dataset.alert = String(bit); });
          cue.qubits.forEach((q, index) => q.classList.toggle('applied', Boolean(cue.packet.applied >> index & 1)));
        }
      }
    }
    receptors.forEach((button, lane) => { button.classList.toggle('pressed', Boolean(laneSources.get(lane)?.size)); button.classList.toggle('holding', run.notes.some(n => n.holding && !n.suspended && n.heldLane === lane)); });
    if (time < 0 && !practice) $('count-in').textContent = String(Math.max(1, Math.ceil(-time / (60 / map.bpm)))); else $('count-in').textContent = '';
    if (currentPacket) {
      const checks = run.checks(currentPacket), clue = checks.map(b => b ? '≠' : '=').join(' ');
      $('clue-caption').textContent = `checks ${clue}${closest?.endAt > closest?.at ? ` · HOLD ${Math.max(0, closest.endAt - Math.max(time, closest.at)).toFixed(1)}s` : ''}${still && !practice && closest ? ` · ${Math.max(0, closest.at - time).toFixed(1)}s` : ''}`;
      if (practice) {
        $('practice-text').textContent = 'Untimed: hold notes use one press; sustain is not scored. Find the smallest set of qubit flips that makes every lamp =. Recheck after each input; W advances when you are satisfied.';
        if (currentPacket.id !== lastClue) { lastClue = currentPacket.id; announce(`New memory. Checks: ${clue}. Choose the faulty qubits.`); }
      }
    }
    $('practice-next').hidden = !practice;
  }

  function finish() {
    if (!run || mode === 'result') return;
    music.stop(); feedback.reset(); paused = false; setState('result'); $('practice-hint').hidden = true; $('song-fill').style.width = '100%'; root.querySelector('.song-progress').setAttribute('aria-valuenow', '100');
    const result = run.summary(); $('notes').innerHTML = ''; $('count-in').textContent = '';
    const timingPlot = result.deltas.slice(0, 140).map((x, i) => `<circle cx="${20 + i / Math.max(1, Math.min(result.deltas.length, 140) - 1) * 420}" cy="${45 + Math.max(-145, Math.min(145, x)) / 145 * 30}" r="2.5" fill="#dceb55"/>`).join('');
    showDialog(`<div class="eyebrow">${practice ? 'UNTIMED PRACTICE' : 'MAP COMPLETE'}</div><div class="result-title"><h2 id="dialog-title">${html(map.title)}<em>${practice ? 'Practice results' : 'Rhythm and recovery results'}</em></h2><span class="grade">${practice ? '✓' : result.grade}</span></div><div class="result-stats"><div><b>${practice ? `${result.hits}/${result.total}` : pct(result.accuracy)}</b><small>${practice ? 'NOTES CAUGHT' : 'CORRECT ON BEAT'}</small></div><div><b>${result.best}</b><small>BEST COMBO</small></div><div><b>${result.restored}/${result.packets}</b><small>MEMORIES RESTORED</small></div></div>${!practice && result.holds ? `<p>Hold notes: ${result.holdsCompleted}/${result.holds} completed · ${result.holdsBroken} released early or not resumed.</p>` : ''}<p class="choice-result">Correction choices: ${result.choiceAccuracy === null ? 'no inputs' : pct(result.choiceAccuracy)} · ${result.goodFixes} repairs / ${result.badFixes} added errors</p>${practice ? '<p>Timing was not scored. Now try the same patterns with the music.</p>' : `<div class="judgement-row">${Object.entries(result.judgements).map(([name, count]) => `<span><b>${count}</b>${name}</span>`).join('')}<span><b>${result.strays}</b>Strays</span></div><div class="timing-chart"><svg viewBox="0 0 460 90" role="img" aria-label="Timing errors: dots above center are early, below center are late"><rect x="12" y="35" width="436" height="20" rx="5" fill="#192737"/><path d="M12 45H448" stroke="#647487" stroke-dasharray="3 4"/>${timingPlot}</svg><div><span>EARLY ↑</span><span>${result.meanOffset === null ? 'No timed hits' : `Mean ${Math.round(result.meanOffset)} ms`}</span><span>LATE ↓</span></div></div>`}<p class="result-insight">${result.restored === result.packets ? 'Your net corrections returned every memory to the original encoded state.' : 'A wrong choice or missed correction can leave an error behind. Matching parity lamps alone cannot detect a logical flip.'}</p><details><summary>Quantum results & map details</summary><p>${map.qubits} data qubits protect one logical state; this code guarantees up to ${Math.floor((map.qubits - 1) / 2)} simultaneous X flips. ${map.qubits % 2 === 0 ? 'The even lane count adds rhythm complexity; it has the same guaranteed correction capacity as the previous odd count.' : ''}</p><p>Mean reference preservation: ${pct(result.fidelity)}. Source: ${html(engine.label)}. Net X residuals use an ideal-gate repetition-code reference. Sampled noisy-backend references do not model the full gate-noise history of each rapid input. Each packet is a fresh encoded register, not continuous memory.</p><p>Score ${result.score}; ${map.bpm} BPM; ${html(map.music.credit || map.artist)}. ${practice ? 'Untimed practice has no rhythm rank.' : 'Accuracy includes timing weights and penalizes stray input.'}</p></details>`, '<button id="again" class="primary">Play this map ↗</button><button id="choose-result" class="subtle">Choose another map</button>');
    $('again').onclick = () => start(false); $('choose-result').onclick = toMenu;
    emit('map-end', { mapId: map.id, practice, summary: result }); announce(`${map.title} complete. ${result.restored} of ${result.packets} memories restored.`);
  }
  async function guide() {
    const active = ['playing', 'practice'].includes(mode);
    if (!active) { navigate('learn'); return; }
    if (!paused) { paused = true; pausedAt = performance.now(); feedback.pause(true); run.suspendHolds(); clearInputs(); await music.pause(); }
    showDialog(`<div class="eyebrow">HOW TO PLAY</div><h2 id="dialog-title">Read, choose, correct.</h2><p>The lamps compare neighboring qubits: ≠ means different; = means same. Find the smallest set of flips that explains the pattern. Apply those keys as the packet reaches the line.</p><p>For four lanes: ≠ = = points to Q1; ≠ ≠ = to Q2; = ≠ ≠ to Q3; = = ≠ to Q4. A healthy memory needs no input. Multiple correction beats share one memory; checks update after every flip.</p><p>For long packets, hold the chosen key until the tail reaches the line; holding applies only one X gate. Releasing early loses rhythm credit, without reversing your repair. Re-press held keys after resuming. P / Escape pauses. This code protects against bit flips, not phase errors.</p>`, '<button id="close-help" class="primary">Resume</button>'); $('close-help').onclick = resumeGame;
  }
  const lessons = [
    ['A qubit', 'A bit is 0 or 1. A qubit can be in a superposition α|0⟩ + β|1⟩. Measuring it in the 0/1 basis gives one outcome, with probabilities |α|² and |β|².', 'A qubit does not reveal two readable answers at once. Quantum algorithms control amplitudes and interference before measurement.'],
    ['Why errors matter', 'Unwanted interactions can change a quantum state. An X error swaps |0⟩ and |1⟩; a Z error changes their relative phase.', 'This game explores X errors. A bit-flip code alone cannot repair Z errors. The falling speed is a game mechanic, not the speed of a real quantum processor.'],
    ['Protect one state', 'A repetition code encodes one logical qubit across several physical qubits: α|0000⟩ + β|1111⟩ for four lanes.', 'These are not four independent copies. Neighbor checks reveal bit-flip clues without reading the stored logical value. Four physical qubits guarantee correction of one X error; five guarantee two.'],
    ['Try the checks', 'Choose an injected bit flip, then apply X gates until the checks are equal. An X applied twice cancels.', 'Try “Flip all” after a successful repair: the checks stay equal, but the reference preservation changes. A logical error can hide from the checks.'],
  ];
  let lessonIndex = 0, labError = 2, labApplied = 0;
  function showLesson(index) {
    lessonIndex = index;
    $('lesson-tabs').innerHTML = lessons.map((lesson, i) => `<button data-lesson="${i}" aria-current="${index === i ? 'step' : 'false'}"><small>0${i + 1}</small>${lesson[0]}</button>`).join('');
    root.querySelectorAll('[data-lesson]').forEach(button => button.onclick = () => { showLesson(Number(button.dataset.lesson)); $('lesson-heading').focus(); });
    const lesson = lessons[index];
    $('lesson-body').innerHTML = `<div class="eyebrow">LESSON ${index + 1} OF 4</div><h2 id="lesson-heading" tabindex="-1">${lesson[0]}</h2><p>${lesson[1]}</p><div class="lesson-note">${lesson[2]}</div>${index === 3 ? `<div class="parity-lab"><label class="field">INJECTED ERROR<select id="lab-error"><option value="0">No error</option><option value="1">Q1</option><option value="2" selected>Q2</option><option value="4">Q3</option><option value="8">Q4</option></select></label><div id="lab-checks" class="lab-checks"></div><div class="lab-keys">${[0,1,2,3].map(q => `<button data-lab-lane="${q}">X on Q${q+1}</button>`).join('')}</div><p id="lab-result" role="status" aria-live="polite"></p><div class="lab-actions"><button id="lab-reset">Reset corrections</button><button id="lab-all">Flip all</button></div><small>Reference preservation averages six test input states. Equal checks alone cannot confirm recovery.</small></div>` : `<div class="lesson-visual">${index === 0 ? 'α|0⟩ + β|1⟩' : index === 1 ? 'X: |0⟩ ↔ |1⟩' : 'α|0000⟩ + β|1111⟩'}</div>`}<div class="lesson-actions"><button id="lesson-next" class="primary">${index === 3 ? 'Choose a level →' : 'Next idea →'}</button><a href="https://quantum.cloud.ibm.com/learning/en/courses/foundations-of-quantum-error-correction/correcting-quantum-errors/introduction" target="_blank" rel="noopener">Learn more at IBM Quantum ↗</a></div>`;
    $('lesson-next').onclick = () => index === 3 ? navigate('levels') : showLesson(index + 1);
    if (index === 3) {
      $('lab-error').value = String(labError);
      $('lab-error').onchange = () => { labError = Number($('lab-error').value); labApplied = 0; drawLab(); };
      root.querySelectorAll('[data-lab-lane]').forEach(button => button.onclick = () => { labApplied ^= 1 << Number(button.dataset.labLane); drawLab(); });
      $('lab-reset').onclick = () => { labApplied = 0; drawLab(); };
      $('lab-all').onclick = () => { labApplied ^= 15; drawLab(); };
      drawLab();
    }
  }
  function drawLab() {
    const residual = labError ^ labApplied;
    const checks = Array.from({ length: 3 }, (_, i) => (residual >> i & 1) ^ (residual >> (i + 1) & 1));
    $('lab-checks').innerHTML = [0,1,2,3].map(q => `<span>Q${q+1}</span>${q < 3 ? `<b>${checks[q] ? '≠' : '='}</b>` : ''}`).join('');
    $('lab-result').textContent = `${checks.every(x => !x) ? 'Checks equal.' : 'Checks differ.'} ${bank ? `Reference preservation: ${pct(bank.fidelity(labError, labApplied, 4))}. ${residual === 0 ? 'Original encoded state restored.' : residual === 15 ? 'Logical X remains: quiet checks can hide an error.' : 'A bit-flip error remains.'}` : 'Qiskit reference is loading.'}`;
  }
  function tuning() {
    navigate('settings');
    $('settings-body').innerHTML = `<label class="tune-field">Note travel <input id="travel" type="range" min="1.2" max="3.6" step=".1" value="${approach}"><span id="travel-value">${approach.toFixed(1)} seconds</span></label><p>Longer travel gives you more time to read the checks. It does not change the song or hit times.</p><label class="tune-field">Input compensation <input id="offset" type="range" min="-200" max="200" step="5" value="${offsetMs}"><span id="offset-value">${offsetMs} ms</span></label><p>Positive compensation treats your input as later. Use the early/late plot after a level to adjust.</p><label class="check-field"><input id="static-mode" type="checkbox" ${still ? 'checked' : ''}> Still notes / reduced motion</label><p>Show the next correction at the line with a countdown. Untimed practice removes the timing demand.</p><label class="tune-field">Music volume <input id="music-volume" type="range" min="0" max="100" step="1" value="${Math.round(music.musicVolume * 100)}"><span id="music-volume-value">${Math.round(music.musicVolume * 100)}%</span></label><label class="tune-field">Effects volume <input id="effects-volume" type="range" min="0" max="100" step="1" value="${Math.round(music.effectsVolume * 100)}"><span id="effects-volume-value">${Math.round(music.effectsVolume * 100)}%</span></label><p>Recorded songs use soft tap feedback. Set effects to 0% to hear only the song.</p><label class="check-field"><input id="mute-setting" type="checkbox" ${music.muted ? 'checked' : ''}> Mute music and effects</label><p class="small-note">Settings last for this session.</p>`;
    $('travel').oninput = () => { approach = Number($('travel').value); $('travel-value').textContent = `${approach.toFixed(1)} seconds`; };
    $('offset').oninput = () => { offsetMs = Number($('offset').value); $('offset-value').textContent = `${offsetMs} ms`; };
    $('static-mode').onchange = () => { still = $('static-mode').checked; feedback.reduced = still; main.dataset.reduced = String(still); };
    for (const channel of ['music', 'effects']) $(`${channel}-volume`).oninput = () => { music.setVolumes(Number($('music-volume').value) / 100, Number($('effects-volume').value) / 100); $(`${channel}-volume-value`).textContent = `${$(`${channel}-volume`).value}%`; };
    $('mute-setting').onchange = () => setMuted($('mute-setting').checked);
  }
  function setMuted(value) { music.setMuted(value); $('sound').setAttribute('aria-pressed', String(value)); $('sound').setAttribute('aria-label', value ? 'Unmute music' : 'Mute music'); $('sound').textContent = value ? '♪̸' : '♫'; }
  populateMaps(); refreshMap();
  $('map-select').onchange = refreshMap; $('qubits').onchange = refreshMap; $('play').onclick = () => start(false); $('practice').onclick = () => start(true);
  $('pause').onclick = pauseGame; $('help').onclick = guide; $('home-settings').onclick = tuning;
  root.querySelector('.brand').onclick = e => { e.preventDefault(); if (['playing', 'practice'].includes(mode)) pauseGame(); else navigate('home'); };
  $('sound').onclick = () => setMuted(!music.muted);
  $('practice-next').onclick = finishPracticePacket;
  const openTutorial = initTutorial(main, () => { showLesson(0); navigate('learn'); });
  $('home-start').onclick = () => navigate('levels'); $('home-learn').onclick = openTutorial;
  for (const page of ['levels', 'learn', 'settings']) $(`${page}-home`).onclick = () => navigate('home');
  showLesson(0); setState('home'); openTutorial();
  $('dialog').addEventListener('cancel', e => { if (paused && ['playing', 'practice'].includes(mode)) { e.preventDefault(); resumeGame(); } else if (mode === 'result') { e.preventDefault(); toMenu(); } });
  window.addEventListener('keydown', e => {
    if ($('tutorial').open) return;
    if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'Escape' || e.key.toLowerCase() === 'p') { if (['playing', 'practice'].includes(mode)) { e.preventDefault(); if (paused) resumeGame(); else pauseGame(); } return; }
    if (e.repeat || held.has(e.code) || $('dialog').open) return;
    if (e.key.toLowerCase() === 'w' && practice && !$('practice-next').hidden) { e.preventDefault(); finishPracticePacket(); return; }
    const key = e.code === 'Space' ? 'SPACE' : e.key.toUpperCase(), lane = laneKeys(map.qubits).indexOf(key);
    if (lane >= 0 && ['playing', 'practice'].includes(mode)) { e.preventDefault(); held.add(e.code); inputDown(lane, e.code); }
  });
  window.addEventListener('keyup', e => { held.delete(e.code); const key = e.code === 'Space' ? 'SPACE' : e.key.toUpperCase(), lane = laneKeys(map.qubits).indexOf(key); if (lane >= 0) inputUp(lane, e.code); });
  window.addEventListener('blur', () => { held.clear(); pauseGame(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { held.clear(); pauseGame(); } });
  window.addEventListener('resize', () => { art.resize(); if (['playing', 'practice'].includes(mode)) highwayHeight = highway.clientHeight; });
  window.QubitTempo = {
    registerMap(input) { const id = registerMap(input); populateMaps(); return id; }, registerComposer,
    maps: () => listMaps(), selectMap(id) { if (!['home', 'levels'].includes(mode)) throw new Error('Return to map selection first.'); $('map-select').value = id; refreshMap(); },
    on(type, handler) { const listener = e => handler(e.detail); hooks.addEventListener(type, listener); return () => hooks.removeEventListener(type, listener); },
    state: () => ({ mode, mapId: map.id, paused, qubits: map.qubits, combo: run?.combo ?? 0, time: run && !paused ? currentTime() : null }),
  };
  function frame(now) {
    const dt = Math.min(.05, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now;
    let beat = 0;
    if (run && ['playing', 'practice'].includes(mode) && !paused) {
      const time = currentTime(), adjusted = time + (practice ? 0 : offsetMs / 1000); beat = secondsToBeat(map, time);
      if (!practice) {
        run.advance(adjusted); reportPackets(); $('score').textContent = String(run.score).padStart(6, '0');
        const progress = Math.max(0, Math.min(100, beat / map.durationBeats * 100)); $('song-fill').style.width = `${progress}%`; root.querySelector('.song-progress').setAttribute('aria-valuenow', String(Math.round(progress)));
        $('combo').textContent = String(run.combo);
        const section = [...map.sections].reverse().find(s => s.beat <= beat);
        if (section && section.label !== lastSection) { lastSection = section.label; $('section').textContent = section.label; art.palette++; emit('section-change', { mapId: map.id, section: structuredClone(section) }); }
        if (beat > map.durationBeats + 1 && run.packets.every(p => p.done)) finish();
      }
      if (['playing', 'practice'].includes(mode)) drawNotes(time);
    }
    if (now > judgementUntil && judgement.textContent) feedback.clearJudge();
    const menuVisible = ['home', 'levels', 'learn', 'settings'].includes(mode) && !document.hidden && !$('tutorial').open && !$('dialog').open;
    sphere.frame(dt, still, mode === 'home' && menuVisible);
    art.draw(dt, beat, still, menuVisible && !sphere.paused); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  try {
    const specs = allSpecs(); bank = makeBank(specs, await engine.run(specs));
    $('play').disabled = $('practice').disabled = false; $('play').innerHTML = 'Play level <span>→</span>';
    menuStatus(engine.label); if (lessonIndex === 3) drawLab(); $('bottom-status').textContent = 'Bit-flip repetition code · educational simulation';
  } catch (error) { menuStatus(`Quantum setup failed: ${error.message}. On Qollab, select a free simulator and Run again.`); }
}
