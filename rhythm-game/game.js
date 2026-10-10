import { allSpecs, makeBank, COUNTS, weight } from './model.js';
import { getMap, listMaps, registerMap, laneKeys } from './maps.js';
import { RhythmRun, WINDOWS } from './rhythm.js';
import { MusicTransport, registerComposer } from './audio.js';
import { TempoGarden } from './garden.js';

const html = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pct = n => `${(n * 100).toFixed(1)}%`;
export async function startGame(root, engine) {
  root.innerHTML = `<main class="garden-game" data-state="menu">
    <canvas id="garden" aria-hidden="true"></canvas>
    <header class="hud"><a class="brand" href="#" aria-label="Choose a map"><span class="brand-flower">✿</span><span>qubit <em>tempo.</em><small>A LITTLE RHYTHM GOES A LONG WAY</small></span></a><div class="song-label"><b id="song-name">Morning dew</b><span id="section">a garden for fragile memories</span></div><div class="score-pill"><b id="score">000000</b><small>SCORE</small></div><nav><button id="sound" aria-label="Mute music" aria-pressed="false">♫</button><button id="help" aria-label="How to play">?</button><button id="pause" aria-label="Pause map" disabled>Ⅱ</button></nav></header>
    <div class="song-progress" role="progressbar" aria-label="Map progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="song-fill"></i></div>
    <section id="deck" class="deck" aria-label="Vertical qubit note highway"><div class="highway"><div id="lane-grid" class="lane-grid" aria-hidden="true"></div><div class="highway-grain" aria-hidden="true"></div><div class="hit-line" aria-hidden="true"><span>RECOVER HERE</span></div><div id="notes" class="notes" aria-hidden="true"></div><div id="judgement" class="judgement" aria-hidden="true"></div><div class="combo-display"><b id="combo">0</b><span id="combo-label">COMBO</span></div><div id="receptors" class="receptors"></div><div id="count-in" class="count-in" aria-hidden="true"></div></div><div class="deck-caption"><span id="keys-caption">D · F · J</span><span id="clue-caption">three qubits, one protected memory</span></div></section>
    <aside id="map-letter" class="map-letter"><div class="eyebrow">A SONG FOR YOUR GARDEN</div><span class="letter-stamp">✧</span><h1>Let the<br><em>notes bloom.</em></h1><p>Decode falling memories on the line.<br>Read the parity lamps.<br>Choose which qubits to flip.</p><label class="field">MAP<select id="map-select" aria-label="Map"></select></label><label class="field">DIFFICULTY<select id="qubits" aria-label="Qubit count">${COUNTS.map(d => `<option value="${d}">${d} qubits · up to ${Math.floor((d - 1) / 2)} flip${d > 4 ? 's' : ''}</option>`).join('')}</select></label><div class="map-info"><span id="map-bpm">86 BPM</span><span id="map-duration">39 seconds</span></div><button id="play" class="primary" disabled>Preparing memories… <span>↗</span></button><button id="practice" class="text-button" disabled>Try six packets without a timer</button><div class="author-actions"><button id="import-map">+ Map</button><button id="import-music">+ Music</button><button id="settings">Tune</button></div><span id="music-name" class="music-name">Original garden soundtrack</span><button id="clear-music" class="text-button" hidden>Use the original soundtrack</button><input id="map-file" type="file" accept=".json,application/json" hidden><input id="music-file" type="file" accept="audio/*" hidden><p id="load-status" class="runtime-note" role="status" aria-live="polite">Preparing quantum reference experiments.</p></aside>
    <div id="practice-hint" class="practice-hint" hidden><span>✧</span><p id="practice-text">Read the clues, then catch the notes.</p><button id="practice-next" hidden>Continue [W]</button></div>
    <div class="bottom-note"><span>✧ This effort is supported by Qollab & IonQ</span><span id="bottom-status">a new map, a little care</span></div>
    <div id="live" class="sr-only" role="status" aria-live="polite"></div>
    <dialog id="dialog" aria-labelledby="dialog-title"><div id="dialog-body"></div><div id="dialog-actions"></div></dialog>
  </main>`;
  const $ = id => root.querySelector(`#${id}`), main = root.querySelector('main');
  const music = new MusicTransport(), art = new TempoGarden($('garden')), hooks = new EventTarget();
  let reported = new Set();
  function reportPackets() { run.results.forEach(result => { if (!reported.has(result.id)) { reported.add(result.id); if (!practice) music.memory(result.restored, run.results.indexOf(result)); emit('packet-resolved', result); } }); }
  let bank = null, run = null, mode = 'menu', map = getMap('morning-dew', 3), practice = false, practiceIndex = 0, practiceTime = 0;
  let approach = 2.4, offsetMs = 0, still = matchMedia('(prefers-reduced-motion: reduce)').matches, selectedAudio = false;
  let paused = false, lastFrame = performance.now(), lastSection = '', lastClue = '', judgementUntil = 0, held = new Set();
  function emit(type, detail) { hooks.dispatchEvent(new CustomEvent(type, { detail })); }
  function announce(text) { $('live').textContent = text; }
  function menuStatus(text) { $('load-status').textContent = text; }
  function setState(state) { mode = state; main.dataset.state = state; $('pause').disabled = !['playing', 'practice'].includes(state); }
  function populateMaps(selected = $('map-select').value || 'morning-dew') {
    $('map-select').innerHTML = listMaps().map(m => `<option value="${html(m.id)}">${html(m.title)}</option>`).join(''); $('map-select').value = selected;
  }
  function refreshMap() {
    const definition = listMaps().find(m => m.id === $('map-select').value);
    if (definition?.qubits) $('qubits').value = String(definition.qubits);
    $('qubits').disabled = Boolean(definition?.qubits);
    map = getMap($('map-select').value, Number($('qubits').value));
    $('song-name').textContent = map.title; $('section').textContent = map.artist;
    $('map-bpm').textContent = `${map.bpm} BPM`; $('map-duration').textContent = `${Math.round(map.durationBeats * 60 / map.bpm)} seconds`;
    $('keys-caption').textContent = laneKeys(map.qubits).join(' · ');
    $('clue-caption').textContent = `${map.qubits} qubits · one protected memory`;
    $('deck').style.setProperty('--lanes', map.qubits); $('deck').style.setProperty('--deck-width', `${240 + map.qubits * 55}px`);
    $('lane-grid').innerHTML = laneKeys(map.qubits).map((key, lane) => `<div class="lane" style="--lane:${lane}"><span>Q${lane + 1}</span></div>`).join('');
    $('receptors').innerHTML = laneKeys(map.qubits).map((key, lane) => `<button data-lane="${lane}" aria-label="Flip qubit ${lane + 1}, ${key === 'SPACE' ? 'Space' : key}"><span>${key === 'SPACE' ? '␣' : key}</span><small>Q${lane + 1}</small></button>`).join('');
    root.querySelectorAll('[data-lane]').forEach(button => {
      button.addEventListener('pointerdown', e => { e.preventDefault(); act(Number(button.dataset.lane)); });
      button.addEventListener('click', e => { if (e.detail === 0) act(Number(button.dataset.lane)); });
    });
    if (mode === 'menu') drawAttract();
  }
  function drawAttract() {
    $('notes').innerHTML = [0, 1, 2].map(i => `<div class="error-packet preview-note" style="top:${12 + i * 25}%"><div class="packet-tag">ENCODED MEMORY</div><div class="packet-register" style="--lanes:${map.qubits}">${laneKeys(map.qubits).map((_, q) => `<span class="packet-qubit">✦<small>Q${q + 1}</small></span>${q < map.qubits - 1 ? `<span class="parity-lamp" data-alert="${q === i % (map.qubits - 1) ? 1 : 0}" style="left:${(q + 1) / map.qubits * 100}%">${q === i % (map.qubits - 1) ? '≠' : '='}</span>` : ''}`).join('')}</div></div>`).join('');
    $('combo').textContent = '✿'; $('combo-label').textContent = 'READY TO BLOOM'; $('score').textContent = '000000';
    $('count-in').textContent = '';
  }
  function showDialog(body, actions) {
    $('dialog-body').innerHTML = body; $('dialog-actions').innerHTML = actions;
    if (!$('dialog').open) $('dialog').showModal();
  }
  function closeDialog() { if ($('dialog').open) $('dialog').close(); }
  async function pauseGame() {
    if (!['playing', 'practice'].includes(mode) || paused) return;
    paused = true; await music.pause();
    showDialog(`<div class="eyebrow">TAKE A BREATH</div><h2 id="dialog-title">The garden can wait.</h2><p>${html(map.title)} · your place in the music is held.</p>`, '<button id="resume" class="primary">Resume map ↗</button><button id="restart" class="subtle">Start again</button><button id="choose" class="subtle">Choose a map</button>');
    $('resume').onclick = resumeGame; $('restart').onclick = () => { closeDialog(); start(practice); }; $('choose').onclick = toMenu;
  }
  async function resumeGame() { closeDialog(); await music.resume(); paused = false; lastFrame = performance.now(); }
  function toMenu() {
    closeDialog(); music.stop(); music.context?.resume(); paused = false; held.clear(); run = null; setState('menu');
    $('practice-hint').hidden = true; menuStatus('Your garden is ready.'); $('song-fill').style.width = '0%'; root.querySelector('.song-progress').setAttribute('aria-valuenow', '0'); refreshMap();
  }
  async function start(untimed = false) {
    if (!bank) return; closeDialog(); refreshMap(); practice = untimed; paused = false; held.clear(); lastSection = lastClue = '';
    let playMap = structuredClone(map);
    if (practice) {
      const choices = [map.events[0], map.events[1], map.events.find(e => e.steps.some(s => s.lanes.length > 1)), map.events.find(e => e.steps.length > 1), map.events.find(e => !e.error.length)];
      const chosen = [...new Set(choices.filter(Boolean))];
      for (const event of map.events) { if (chosen.length >= 6) break; if (!chosen.includes(event)) chosen.push(event); }
      playMap.events = structuredClone(chosen.sort((a, b) => a.beat - b.beat));
    }
    run = new RhythmRun(playMap, bank); reported = new Set(); art.blooms = 0; art.particles = []; practiceIndex = 0;
    $('play').disabled = $('practice').disabled = true; menuStatus('Starting the music…');
    try {
      if (practice) { await music.init(); music.stop(); music.master.gain.value = music.muted ? 0 : .6; setState('practice'); practiceTime = run.packets[0].at; }
      else { await music.start(map, selectedAudio); setState('playing'); }
    } catch (error) { music.stop(); setState('menu'); menuStatus(error.message); $('play').disabled = $('practice').disabled = false; return; }
    $('play').disabled = $('practice').disabled = false; $('practice-hint').hidden = !practice;
    $('notes').innerHTML = run.cues.map(c => `<div id="cue-${c.id}" class="error-packet"><div class="packet-tag">ENCODED MEMORY ${c.total > 1 ? `· ${c.order + 1}/${c.total}` : ''}</div><div class="packet-register" style="--lanes:${map.qubits}">${laneKeys(map.qubits).map((key, q) => `<span class="packet-qubit" data-qubit="${q}">✦<small>Q${q + 1}</small></span>${q < map.qubits - 1 ? `<span class="parity-lamp" data-check="${q}" style="left:${(q + 1) / map.qubits * 100}%">=</span>` : ''}`).join('')}</div></div>`).join('');
    run.cues.forEach(c => { c.element = $(`cue-${c.id}`); }); $('combo').textContent = '0'; $('combo-label').textContent = 'COMBO'; $('score').textContent = '000000';
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
    root.querySelector(`[data-lane="${lane}"]`).classList.add('pressed');
    setTimeout(() => root.querySelector(`[data-lane="${lane}"]`)?.classList.remove('pressed'), 90);
    $('score').textContent = String(run.score).padStart(6, '0'); $('combo').textContent = String(run.combo);
    $('judgement').textContent = event.type === 'hit' ? event.correct ? event.timing : 'Added an error' : event.correct === false ? 'Added an error' : 'Stray';
    $('judgement').dataset.kind = event.correct === false ? 'stray' : event.type; judgementUntil = performance.now() + 450;
    if (event.type === 'hit' && event.correct) {
      if (practice) music.tone(440 * 2 ** (lane / 12), .15, .04, 'sine'); else music.hit(lane);
      const r = $('receptors').getBoundingClientRect(), deck = $('deck').getBoundingClientRect();
      art.burst(deck.left + (lane + .5) * deck.width / map.qubits, r.top, lane);
      emit('note-hit', { mapId: map.id, lane, timing: event.timing, correct: event.correct, deltaMs: event.delta * 1000, combo: run.combo, packetId: event.note.packet.id });
    } else { music.errorTone?.(lane); emit(event.type === 'hit' ? 'wrong-correction' : 'stray-input', { lane, time, correct: event.correct }); }
    if (event.packet) announce(`Qubit ${lane + 1} flipped. Checks: ${run.checks(event.packet).map(b => b ? 'different' : 'same').join(', ')}.`);
    if (practice) { const remaining = run.cues.find(c => c.packet === run.packets[practiceIndex] && c.notes.some(n => !n.done)); if (remaining) practiceTime = remaining.at; drawNotes(practiceTime); }
  }
  function drawNotes(time) {
    const height = root.querySelector('.highway').clientHeight, hit = height - 92;
    const currentPacket = practice ? run.packets[practiceIndex] : run.packets.find(p => !p.done && p.end >= time);
    const closest = run.cues.find(c => !c.packet.done && (!practice || c.packet === currentPacket) && (c.clean || c.notes.some(n => !n.done))) || run.cues.filter(c => c.packet === currentPacket).at(-1);
    for (const cue of run.cues) {
      const y = hit - (cue.at - time) / approach * (hit - 25);
      const display = !cue.packet.done && (practice || time <= cue.at + WINDOWS.good) && y > -100 && y < height && (!practice || (cue.packet === currentPacket && cue === closest)) && (!still || cue === closest);
      cue.element.hidden = !display;
      if (display) {
        cue.element.style.transform = `translateY(${(still || practice ? hit : y) - 32}px)`;
        const checks = run.checks(cue.packet);
        cue.element.querySelectorAll('[data-check]').forEach(lamp => { const bit = checks[Number(lamp.dataset.check)]; lamp.textContent = bit ? '≠' : '='; lamp.dataset.alert = String(bit); });
        cue.element.querySelectorAll('[data-qubit]').forEach(q => { q.classList.toggle('applied', Boolean(cue.packet.applied >> Number(q.dataset.qubit) & 1)); });
      }
    }
    if (time < 0 && !practice) $('count-in').textContent = String(Math.max(1, Math.ceil(-time / (60 / map.bpm)))); else $('count-in').textContent = '';
    if (currentPacket) {
      const checks = run.checks(currentPacket), clue = checks.map(b => b ? '≠' : '=').join(' ');
      $('clue-caption').textContent = `checks ${clue}${still && !practice && closest ? ` · ${Math.max(0, closest.at - time).toFixed(1)}s` : ''}`;
      if (practice) {
        $('practice-text').textContent = 'Find the smallest set of qubit flips that makes every lamp =. Recheck after each input; W advances when you are satisfied.';
        if (currentPacket.id !== lastClue) { lastClue = currentPacket.id; announce(`New memory. Checks: ${clue}. Choose the faulty qubits.`); }
      }
    }
    $('practice-next').hidden = !practice;
  }

  function finish() {
    if (!run || mode === 'result') return;
    music.stop(); paused = false; setState('result'); $('practice-hint').hidden = true; $('song-fill').style.width = '100%'; root.querySelector('.song-progress').setAttribute('aria-valuenow', '100');
    const result = run.summary(); $('notes').innerHTML = ''; $('count-in').textContent = '';
    const timingPlot = result.deltas.slice(0, 140).map((x, i) => `<circle cx="${20 + i / Math.max(1, Math.min(result.deltas.length, 140) - 1) * 420}" cy="${45 + Math.max(-145, Math.min(145, x)) / 145 * 30}" r="2.5" fill="#78966b"/>`).join('');
    showDialog(`<div class="eyebrow">${practice ? 'UNTIMED PRACTICE' : 'YOUR MAP, IN BLOOM'}</div><div class="result-title"><h2 id="dialog-title">${html(map.title)}<em>${practice ? 'a little practice goes a long way.' : result.accuracy >= .8 ? 'a lovely little recovery.' : 'another song, another chance.'}</em></h2><span class="grade">${practice ? '✿' : result.grade}</span></div><div class="result-stats"><div><b>${practice ? `${result.hits}/${result.total}` : pct(result.accuracy)}</b><small>${practice ? 'NOTES CAUGHT' : 'CORRECT ON BEAT'}</small></div><div><b>${result.best}</b><small>BEST COMBO</small></div><div><b>${result.restored}/${result.packets}</b><small>MEMORIES RESTORED</small></div></div><p class="choice-result">Correction choices: ${result.choiceAccuracy === null ? 'no inputs' : pct(result.choiceAccuracy)} · ${result.goodFixes} repairs / ${result.badFixes} added errors</p>${practice ? '<p>Timing was not scored. Now try the same patterns with the music.</p>' : `<div class="judgement-row">${Object.entries(result.judgements).map(([name, count]) => `<span><b>${count}</b>${name}</span>`).join('')}<span><b>${result.strays}</b>Strays</span></div><div class="timing-chart"><svg viewBox="0 0 460 90" role="img" aria-label="Timing errors: dots above center are early, below center are late"><rect x="12" y="35" width="436" height="20" rx="5" fill="#e8edcf"/><path d="M12 45H448" stroke="#bdc99e" stroke-dasharray="3 4"/>${timingPlot}</svg><div><span>EARLY ↑</span><span>${result.meanOffset === null ? 'No timed hits' : `Mean ${Math.round(result.meanOffset)} ms`}</span><span>LATE ↓</span></div></div>`}<p class="result-insight">${result.restored === result.packets ? 'Your net corrections returned every memory to the original encoded state.' : 'A wrong choice or missed correction can leave an error behind. Matching parity lamps alone cannot detect a logical flip.'}</p><details><summary>Quantum results & map details</summary><p>${map.qubits} data qubits protect one logical state; this code guarantees up to ${Math.floor((map.qubits - 1) / 2)} simultaneous X flips. ${map.qubits % 2 === 0 ? 'The even lane count adds rhythm complexity; it has the same guaranteed correction capacity as the previous odd count.' : ''}</p><p>Mean reference preservation: ${pct(result.fidelity)}. Source: ${html(engine.label)}. Net X residuals use an ideal-gate repetition-code reference. Sampled noisy-backend references do not model the full gate-noise history of each rapid input. Each packet is a fresh encoded register, not continuous memory.</p><p>Score ${result.score}; ${map.bpm} BPM; ${html(selectedAudio ? music.loadedName : map.music.credit || map.artist)}. ${practice ? 'Untimed practice has no rhythm rank.' : 'Accuracy includes timing weights and penalizes stray input.'}</p></details>`, '<button id="again" class="primary">Play this map ↗</button><button id="choose-result" class="subtle">Choose another map</button>');
    $('again').onclick = () => start(false); $('choose-result').onclick = toMenu;
    emit('map-end', { mapId: map.id, practice, summary: result }); announce(`${map.title} complete. ${result.restored} of ${result.packets} memories restored.`);
  }
  async function guide() {
    const active = ['playing', 'practice'].includes(mode); if (active && !paused) { paused = true; await music.pause(); }
    showDialog(`<div class="eyebrow">A FIELD GUIDE</div><h2 id="dialog-title">Small notes.<em>Fragile memories.</em></h2><p>Encoded memory packets fall from the top. The lamps between qubits show neighboring parity: ≠ means different, = means same. Decide which qubits flipped, then press their keys as the packet reaches the recovery line. Keys never reveal the answer. Numbered packets share one memory and provide rapid correction beats.</p><p>Each packet protects one quantum state across several physical qubits. Read the parity pattern to choose the smallest set of flips within the code’s guarantee. For three qubits: ≠ = means Q1, ≠ ≠ means Q2, = ≠ means Q3, and = = means wait. The lamps update after every flip. For larger codes, repair the smallest set of qubits that makes all lamps equal. You can choose any order for multi-qubit corrections.</p><p>3 / 4 qubits guarantee one bit flip, 5 / 6 guarantee two, and 7 guarantee three. We keep errors within those limits. This repetition code does not protect against phase errors.</p><p>Use untimed practice to learn the patterns. P or Escape pauses; Space is a lane key in 5- and 7-qubit maps. Music sections change the garden and accompaniment, and caught notes grow flowers.</p><details><summary>Credits and quantum source</summary><p>${html(engine.label)}. Qiskit supplies 298 reference circuits in one job for 3–7 data qubits. The local player identifies recorded results. This is an educational simulation, not quantum hardware timing or general fault tolerance.</p><p>Visual direction from the team’s Ion Garden branch; new vector art, original synthesized music, and code drafted with OpenAI Codex assistance. MIT application. This effort is supported by Qollab & IonQ.</p></details>`, '<button id="close-help" class="primary">Back to the garden ↗</button>'); $('close-help').onclick = active ? resumeGame : closeDialog;
  }
  function tuning() {
    showDialog(`<div class="eyebrow">FIND YOUR RHYTHM</div><h2 id="dialog-title">A little tuning.</h2><label class="tune-field">Note travel <input id="travel" type="range" min="1.2" max="3.6" step=".1" value="${approach}"><span id="travel-value">${approach.toFixed(1)} seconds</span></label><label class="tune-field">Input compensation <input id="offset" type="range" min="-200" max="200" step="5" value="${offsetMs}"><span id="offset-value">${offsetMs} ms</span></label><p>Positive compensation treats your input as later on the song clock. Use the early/late plot after a map to adjust. This is a manual setting, not an automatic device calibration.</p><label class="check-field"><input id="static-mode" type="checkbox" ${still ? 'checked' : ''}> Still notes / reduced motion</label><p>Still notes show the next chord on the line with a countdown. Untimed practice removes the timing demand entirely.</p><button id="export-map" class="subtle">Export selected map JSON</button>`, '<button id="close-tune" class="primary">Ready to bloom ↗</button>');
    $('travel').oninput = () => { approach = Number($('travel').value); $('travel-value').textContent = `${approach.toFixed(1)} seconds`; };
    $('offset').oninput = () => { offsetMs = Number($('offset').value); $('offset-value').textContent = `${offsetMs} ms`; };
    $('static-mode').onchange = () => { still = $('static-mode').checked; };
    $('export-map').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' })), a = document.createElement('a'); a.href = url; a.download = `${map.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    $('close-tune').onclick = closeDialog;
  }
  populateMaps(); refreshMap();
  $('map-select').onchange = refreshMap; $('qubits').onchange = refreshMap; $('play').onclick = () => start(false); $('practice').onclick = () => start(true);
  $('pause').onclick = pauseGame; $('help').onclick = guide; $('settings').onclick = tuning;
  root.querySelector('.brand').onclick = e => { e.preventDefault(); if (['playing', 'practice'].includes(mode)) pauseGame(); else toMenu(); };
  $('sound').onclick = () => { music.setMuted(!music.muted); $('sound').setAttribute('aria-pressed', String(music.muted)); $('sound').setAttribute('aria-label', music.muted ? 'Unmute music' : 'Mute music'); $('sound').textContent = music.muted ? '♪̸' : '♫'; };
  $('practice-next').onclick = finishPracticePacket;
  $('import-map').onclick = () => $('map-file').click(); $('import-music').onclick = () => $('music-file').click();
  $('map-file').onchange = async () => {
    try { const file = $('map-file').files[0]; if (!file) return; if (file.size > 2_000_000) throw new Error('Map files must be under 2 MB.'); const id = registerMap(JSON.parse(await file.text())); populateMaps(id); refreshMap(); menuStatus(`Loaded ${map.title}.`); emit('map-import', { id }); }
    catch (error) { menuStatus(error.message); } finally { $('map-file').value = ''; }
  };
  $('music-file').onchange = async () => {
    try { const file = $('music-file').files[0]; if (!file) return; if (file.size > 30_000_000) throw new Error('Local music files must be under 30 MB.'); await music.loadFile(file); selectedAudio = true; $('music-name').textContent = file.name; $('clear-music').hidden = false; menuStatus('Local music loaded. Match the map’s BPM and offset before playing.'); }
    catch (error) { menuStatus(error.message); } finally { $('music-file').value = ''; }
  };
  $('clear-music').onclick = () => { selectedAudio = false; $('music-name').textContent = 'Original garden soundtrack'; $('clear-music').hidden = true; };
  $('dialog').addEventListener('cancel', e => { if (paused && ['playing', 'practice'].includes(mode)) { e.preventDefault(); resumeGame(); } else if (mode === 'result') { e.preventDefault(); toMenu(); } });
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'Escape' || e.key.toLowerCase() === 'p') { if (['playing', 'practice'].includes(mode)) { e.preventDefault(); if (paused) resumeGame(); else pauseGame(); } return; }
    if (e.repeat || held.has(e.code) || $('dialog').open) return;
    if (e.key.toLowerCase() === 'w' && practice && !$('practice-next').hidden) { e.preventDefault(); finishPracticePacket(); return; }
    const key = e.code === 'Space' ? 'SPACE' : e.key.toUpperCase(), lane = laneKeys(map.qubits).indexOf(key);
    if (lane >= 0 && ['playing', 'practice'].includes(mode)) { e.preventDefault(); held.add(e.code); act(lane); }
  });
  window.addEventListener('keyup', e => { held.delete(e.code); });
  window.addEventListener('blur', () => { held.clear(); pauseGame(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { held.clear(); pauseGame(); } });
  window.addEventListener('resize', () => art.resize());
  window.QubitTempo = {
    registerMap(input) { const id = registerMap(input); populateMaps(); return id; }, registerComposer,
    maps: () => listMaps(), selectMap(id) { if (mode !== 'menu') throw new Error('Return to map selection first.'); $('map-select').value = id; refreshMap(); },
    on(type, handler) { const listener = e => handler(e.detail); hooks.addEventListener(type, listener); return () => hooks.removeEventListener(type, listener); },
    state: () => ({ mode, mapId: map.id, paused, qubits: map.qubits, combo: run?.combo ?? 0, time: run && !paused ? currentTime() : null }),
  };
  function frame(now) {
    const dt = Math.min(.05, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now;
    let beat = 0;
    if (run && ['playing', 'practice'].includes(mode) && !paused) {
      const time = currentTime(), adjusted = time + (practice ? 0 : offsetMs / 1000); beat = time * map.bpm / 60;
      if (!practice) {
        run.advance(adjusted); reportPackets();
        const progress = Math.max(0, Math.min(100, beat / map.durationBeats * 100)); $('song-fill').style.width = `${progress}%`; root.querySelector('.song-progress').setAttribute('aria-valuenow', String(Math.round(progress)));
        $('combo').textContent = String(run.combo);
        const section = [...map.sections].reverse().find(s => s.beat <= beat);
        if (section && section.label !== lastSection) { lastSection = section.label; $('section').textContent = section.label; art.palette++; emit('section-change', { mapId: map.id, section: structuredClone(section) }); }
        if (beat > map.durationBeats + 1 && run.packets.every(p => p.done)) finish();
      }
      if (['playing', 'practice'].includes(mode)) drawNotes(time);
    }
    if (now > judgementUntil) $('judgement').textContent = '';
    art.draw(dt, beat, still); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  try {
    const specs = allSpecs(); bank = makeBank(specs, await engine.run(specs));
    $('play').disabled = $('practice').disabled = false; $('play').innerHTML = 'Play this map <span>↗</span>';
    menuStatus('Your garden is ready.'); $('bottom-status').textContent = 'read the rhythm · protect the memory';
  } catch (error) { menuStatus(`Quantum setup failed: ${error.message}. On Qollab, select a free simulator and Run again.`); }
}
