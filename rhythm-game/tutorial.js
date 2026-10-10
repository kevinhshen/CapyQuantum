// Animated tutorial adapted from teammate commit 414d9d6.
// Timers reset on navigation/close; no browser storage or extra quantum job.
export function initTutorial(root, onLessons) {
    root.insertAdjacentHTML('beforeend', `<dialog id="tutorial" class="tutorial" aria-labelledby="tut-title" aria-describedby="tut-text"><div class="tut-card">
      <div class="tut-top"><div class="eyebrow" id="tut-eyebrow">TUTORIAL</div><button id="tut-skip" class="text-button tut-skip">Skip tutorial ✕</button></div>
      <h2 id="tut-title"></h2>
      <div id="tut-stage" class="tut-stage" data-step="0" aria-hidden="true">
        <div id="tut-note" class="tut-note"></div><div id="tut-spark" class="tut-spark">✸</div><div id="tut-flower" class="tut-flower">✿</div>
        <div id="tut-packet" class="tut-packet"><div class="packet-tag">ENCODED MEMORY</div><div class="packet-register" style="--lanes:3">${[0, 1, 2].map(q => `<span class="packet-qubit" data-q="${q}">✦<small>Q${q + 1}</small></span>${q < 2 ? `<span class="parity-lamp" data-l="${q}" style="left:${(q + 1) / 3 * 100}%">=</span>` : ''}`).join('')}</div></div>
        <div class="tut-table" data-for="2"><div data-row="0"><span>≠ =</span><b>flip Q1</b></div><div data-row="1"><span>≠ ≠</span><b>flip Q2</b></div><div data-row="2"><span>= ≠</span><b>flip Q3</b></div><div data-row="3"><span>= =</span><b>wait</b></div></div>
        <div class="tut-hit" data-for="3 4"><span>RECOVER HERE</span></div>
        <div class="tut-keys" data-for="3 4">${['D', 'F', 'J'].map((key, i) => `<div class="tut-key" data-key="${i}">${key}</div>`).join('')}</div>
      </div>
      <p id="tut-text" class="tut-text" aria-live="polite"></p>
      <div class="tut-nav"><div id="tut-dots" class="tut-dots"></div><button id="tut-replay" class="subtle">↻ Replay</button><button id="tut-back" class="subtle">Back</button><button id="tut-next" class="primary">Next ↗</button></div>
      <button id="tut-lessons" class="text-button tut-lesson-link">Explore the quantum lessons →</button>
    </div></dialog>`);
    const $ = id => root.querySelector(`#${id}`);
    const overlay = $('tutorial'), stage = $('tut-stage'), packet = $('tut-packet'), note = $('tut-note'), spark = $('tut-spark'), flower = $('tut-flower');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const view = { q: [0, 0, 0], hidden: [false, false, false], lamps: [0, 0], lampsHidden: false };
    let step = 0, timers = [], opener = null;
    const say = text => { note.textContent = text; };
    const paint = () => {
      stage.querySelectorAll('[data-q]').forEach(el => { const i = Number(el.dataset.q); el.dataset.flip = String(view.q[i]); el.dataset.hidden = view.hidden[i] ? '1' : '0'; });
      stage.querySelectorAll('[data-l]').forEach(el => { const i = Number(el.dataset.l); el.textContent = view.lamps[i] ? '≠' : '='; el.dataset.alert = String(view.lamps[i]); el.dataset.hidden = view.lampsHidden ? '1' : '0'; });
    };
    // Lamps show whether neighbours differ. They update a beat after the qubits so the cause comes before the effect.
    const sync = () => { view.lamps = [view.q[0] ^ view.q[1], view.q[1] ^ view.q[2]]; paint(); };
    const pop = selector => stage.querySelectorAll(selector).forEach(el => { el.classList.remove('tut-pop'); void el.offsetWidth; el.classList.add('tut-pop'); });
    const setTop = (y, animate, ms = 1500) => { packet.style.transition = 'none'; void packet.offsetWidth; if (animate && !reduce) packet.style.transition = `top ${ms}ms linear`; packet.style.top = `${y}px`; };
    const press = i => { const key = stage.querySelector(`[data-key="${i}"]`); key.classList.add('pressed'); timers.push(setTimeout(() => key.classList.remove('pressed'), 240)); };
    const reset = () => {
      timers.forEach(clearTimeout); timers = [];
      Object.assign(view, { q: [0, 0, 0], hidden: [false, false, false], lamps: [0, 0], lampsHidden: false });
      setTop(34, false); spark.style.transition = 'none'; spark.style.opacity = '0'; spark.style.top = '-24px'; flower.classList.remove('go');
      stage.querySelectorAll('.tut-key').forEach(key => key.classList.remove('pressed'));
      stage.querySelectorAll('[data-row]').forEach(row => { row.dataset.active = '0'; });
      note.textContent = ''; paint();
    };
    const STEPS = [
      { title: 'One memory, three qubits', text: 'A qubit is fragile: noise can flip it without warning. We encode one logical qubit across three physical qubits, without making independent copies. In this example their computational-basis values agree. The lamps between neighbours read = while they match.',
        run({ at }) {
          view.hidden = [true, false, true]; view.lampsHidden = true; paint(); say('One qubit holds the memory…');
          at(900, () => { view.hidden = [false, false, false]; paint(); pop('[data-q="0"],[data-q="2"]'); say('…encoded across three physical qubits.'); });
          at(2200, () => { view.lampsHidden = false; sync(); pop('[data-l]'); say('Every neighbour agrees, so both lamps read =  ✓'); });
        } },
      { title: 'Noise strikes', text: 'Now a stray error flips one qubit. The lamps never look at the memory itself. They only compare neighbours: ≠ means those two qubits disagree. That is how errors are found without reading the memory.',
        run({ at }) {
          sync(); say('Everything agrees…');
          at(900, () => { spark.style.transition = reduce ? 'none' : 'top .55s ease-in, opacity .15s'; spark.style.opacity = '1'; spark.style.top = '60px'; say('…until noise strikes Q2.'); });
          at(1500, () => { spark.style.opacity = '0'; view.q[1] = 1; paint(); pop('[data-q="1"]'); say('Q2 flips.'); });
          at(2300, () => { sync(); pop('[data-l]'); say('Both lamps beside Q2 now read ≠ : “these two disagree”.'); });
        } },
      { title: 'Read the lamps', text: 'Each pattern of lamps points to one culprit. For three qubits with at most one bit flip: ≠ = points to Q1, ≠ ≠ to Q2, and = ≠ to Q3. All = means wait within this error limit.',
        run({ at }) {
          const cases = [[1, 0, 0, 0, 'Only Q1 disagrees → flip Q1'], [0, 1, 0, 1, 'Q2 disagrees with both neighbours → flip Q2'], [0, 0, 1, 2, 'Only Q3 disagrees → flip Q3'], [0, 0, 0, 3, 'Everyone agrees → nothing to fix, wait.']];
          const show = c => { view.q = [c[0], c[1], c[2]]; sync(); pop('[data-l]'); stage.querySelectorAll('[data-row]').forEach(row => { row.dataset.active = row.dataset.row === String(c[3]) ? '1' : '0'; }); say(c[4]); };
          if (reduce) { show(cases[1]); return; }
          const loop = () => { cases.forEach((c, i) => at(i * 2300, () => show(c))); at(cases.length * 2300, loop); };
          loop();
        } },
      { title: 'Fix it on the beat', text: 'In the game each packet falls toward the recovery line. Decide which qubit is faulty from the lamps, then press its key as the packet arrives. The keys never reveal the answer, and a wrong flip adds a new error.',
        run({ at }) {
          view.q = [0, 1, 0]; sync(); say('Lamps read ≠ ≠ → Q2 is the odd one out.');
          at(1100, () => { setTop(108, true, 1500); say('Press the key as the packet reaches the line.'); });
          at(2600, () => {
            press(1); view.q[1] = 0; sync(); pop('[data-q="1"]'); pop('[data-l]'); if (!reduce) flower.classList.add('go');
            say('Flipped Q2 back on the beat → Perfect ✿ Every lamp reads = again.');
          });
        } },
      { title: 'Know the limits', text: 'Three or four qubits guarantee repair of one bit flip; five or six repair two, and seven repair three. The animation shows three lanes; the game starts with four (D F J K). Beyond the correction limit, the lamps can be fooled, as shown here. This code also only watches bit flips, not phase errors. Use untimed practice to learn at your own pace.',
        run({ at }) {
          setTop(108, false); sync(); say('Suppose two flips strike at once: Q1 and Q3.');
          at(1000, () => { view.q = [1, 0, 1]; paint(); pop('[data-q="0"],[data-q="2"]'); });
          at(1900, () => { sync(); pop('[data-l]'); say('The lamps look exactly like a single flip on Q2.'); });
          at(3600, () => { press(1); view.q[1] = 1; sync(); pop('[data-q="1"]'); say('The “fix” backfires: all three are flipped and every lamp reads =.'); });
        } },
    ];
    const last = STEPS.length - 1, dots = $('tut-dots');
    dots.innerHTML = STEPS.map((_, i) => `<button class="tut-dot" data-dot="${i}" aria-label="Go to step ${i + 1}"></button>`).join('');
    function goTo(n) {
      step = Math.max(0, Math.min(last, n)); reset();
      const current = STEPS[step];
      stage.dataset.step = String(step); $('tut-eyebrow').textContent = `TUTORIAL · ${step + 1} OF ${STEPS.length}`;
      $('tut-title').textContent = current.title; $('tut-text').textContent = current.text;
      dots.querySelectorAll('[data-dot]').forEach(dot => { if (Number(dot.dataset.dot) === step) dot.setAttribute('aria-current', 'step'); else dot.removeAttribute('aria-current'); });
      $('tut-back').disabled = step === 0; $('tut-next').textContent = step === last ? 'Go to main menu →' : 'Next →';
      current.run({ at: reduce ? (ms, fn) => fn() : (ms, fn) => timers.push(setTimeout(fn, ms)) });
    }
    function openTutorial() {
      opener = document.activeElement; overlay.showModal(); goTo(0); $('tut-next').focus();
    }
    function closeTutorial() {
      reset(); overlay.close();
      (opener && opener !== document.body && opener.isConnected ? opener : $('home-start')).focus();
    }
    $('tut-next').onclick = () => { if (step === last) closeTutorial(); else goTo(step + 1); };
    $('tut-back').onclick = () => goTo(step - 1);
    $('tut-replay').onclick = () => goTo(step);
    $('tut-skip').onclick = closeTutorial;
    dots.addEventListener('click', e => { const dot = e.target.closest('[data-dot]'); if (dot) goTo(Number(dot.dataset.dot)); });
    $('tut-lessons').onclick = () => { closeTutorial(); onLessons(); };
    overlay.addEventListener('cancel', e => { e.preventDefault(); closeTutorial(); });
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeTutorial(); }
      else if (e.key === 'ArrowRight' && !/INPUT/.test(e.target.tagName)) { e.preventDefault(); $('tut-next').click(); }
      else if (e.key === 'ArrowLeft' && !/INPUT/.test(e.target.tagName)) { e.preventDefault(); if (step > 0) goTo(step - 1); }
      else if (e.key === 'Tab') {
        const focusable = [...overlay.querySelectorAll('button:not([disabled]),input')];
        const first = focusable[0], end = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); end.focus(); }
        else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); first.focus(); }
      }
    });
    return openTutorial;
  }
