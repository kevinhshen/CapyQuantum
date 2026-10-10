// Qubit Factory: run a quantum factory and protect your products from
// quantum glitches using real error-correction techniques.
//
// Each product is a qubit stored in d copies (a repetition code). Glitches
// flip copies at random. Warning lights between copies show where neighbours
// disagree (the syndrome). At the end of the belt, a quality check reads the
// copies and takes a majority vote. Every light pattern and every quality
// check result comes from a real Qiskit circuit, fetched in one batch at load.

import { specKey, decode, logicalValue } from './circuits.js';
import { circuitView } from './circuit-view.js';

const SHOTS = 32;
const DAYS = 5;
const DAY_SECONDS = 60;
const BELT_SECONDS = 14;     // time for a product to cross the belt
const SPAWN_EVERY = [2.4, 2.1, 1.8, 1.6, 1.4]; // seconds between products: the factory grows each day
const PRICE = 20;            // paid for a good product
const REFUND = 15;           // lost for a corrupted product
const COPY_COST = 1;         // materials per physical copy
const GLITCH_RATE = [0.03, 0.045, 0.06, 0.075, 0.09]; // glitches per copy per second, by day
const PHASE_SHARE = [0, 0, 0.4, 0.45, 0.5];       // share of glitches that are phase flips
const BILL = [30, 60, 100, 140, 180];              // electricity bill at the end of each day
const BOT_AT = 0.62;         // where the decoder bot sits on the belt (0..1)

const UPGRADES = [
  {
    id: 'rep', name: 'Repetition Code', cost: 60, icon: '🧩',
    text: 'Build every product from <b>3 linked copies</b>, with warning lights between them. A light turns on when the two copies beside it disagree, so you can find and fix a broken copy.',
    real: 'This is the <b>repetition code</b>, one of the first quantum error-correcting codes. Asking “do these two agree?” instead of “what’s your value?” is called measuring the <b>syndrome</b>. It finds errors without destroying the qubit.',
  },
  {
    id: 'bot', name: 'Decoder Bot', cost: 140, icon: '🤖', needs: 'rep', levels: 3,
    text: 'A robot on the belt reads the lights and fixes products for you. Each level makes it faster.',
    real: 'A <b>decoder</b> is ordinary software that reads the syndrome and decides the fix. It has to be incredibly fast: real machines decode millions of times per second.',
  },
  {
    id: 'goggles', name: 'Phase Goggles', cost: 120, icon: '👓', needs: 'rep',
    text: 'Adds <b>purple lights</b> that catch <b>phase flips</b>: sneaky glitches that start on day 3 and that your orange lights can’t see.',
    real: 'Qubits suffer two kinds of error: <b>bit flips</b> and <b>phase flips</b>. Catching phase flips means comparing qubits in a rotated way (with <b>Hadamard gates</b>). The <b>surface code</b>, used by Google and others, checks for both kinds at once.',
  },
  {
    id: 'big', name: 'Bigger Code', cost: 260, icon: '🛡️', needs: 'rep',
    text: 'Products use <b>5 copies</b>, so they survive <b>2 broken copies</b> at once. But more copies cost more, and give glitches more places to land.',
    real: 'More copies make a bigger code with a higher <b>distance</b>. Each step up fixes one more error at a time, so failures get much rarer, as long as the hardware is good enough.',
  },
  {
    id: 'cool', name: 'Cryo Cooling', cost: 100, icon: '❄️', levels: 3,
    text: 'Colder machines, fewer glitches: each level cuts glitches by 25%.',
    real: 'Real qubits are kept colder than outer space. Error correction only pays off when each qubit’s error rate is below a <b>threshold</b> (around 1%). Above it, adding copies makes things worse.',
  },
];

// Plain-language glossary, opened from the 📘 Quantum 101 button.
const GLOSSARY = [
  ['Qubit', 'The building block of a quantum computer. A normal bit is a coin lying flat: heads (0) or tails (1). A qubit is like a coin that’s still <b>spinning</b>: it holds a mix of both at once.'],
  ['Glitch (error)', 'Heat, vibration or stray light can disturb a qubit and corrupt what it holds. Even the best qubits today glitch about once every thousand operations.'],
  ['Measurement', 'Reading a qubit is like slapping down a spinning coin: you get heads or tails, and the spin is gone. That’s why you can’t just look at a qubit to check whether it’s broken.'],
  ['Bit flip', 'A glitch that knocks the coin over: heads becomes tails. Orange lights catch these.'],
  ['Phase flip', 'A sneakier glitch that reverses the coin’s spin. Heads and tails don’t change, so orange lights can’t see it, but the qubit is still ruined. Purple lights (Phase Goggles) catch these.'],
  ['Repetition code', 'Store one qubit across several linked qubits (entanglement) that always share the same value. If one glitches, it disagrees with the others.'],
  ['Syndrome (warning lights)', 'The trick of quantum error correction: ask pairs “are you two the same?”, never “what’s your value?”. The answers point to the broken copy without destroying anything.'],
  ['Majority vote', 'At the end, the copies are read and the majority wins. One broken copy is outvoted; too many broken copies win the vote and the product fails.'],
  ['Decoder', 'Software that turns the pattern of lights into a fix, automatically and very fast.'],
  ['Code distance', 'How big the code is. 3 copies survive 1 broken copy, 5 survive 2, 7 survive 3.'],
  ['Threshold', 'Error correction only helps if the hardware is good enough. Below the threshold error rate, bigger codes win; above it, they make things worse.'],
];

// Briefing for players with zero quantum background.
const BRIEFING = [
  { art: '<span class="coin flat">🪙</span><span class="vs">vs</span><span class="coin spin">🪙</span>', title: 'A qubit is like a spinning coin',
    text: 'A normal computer bit is a coin lying flat: heads (0) or tails (1). A <b>qubit</b> is a coin that’s still <b>spinning</b>. It holds a mix of both, and that’s what makes quantum computers powerful.' },
  { art: '⚡🪙', title: 'Glitches knock coins over',
    text: 'Heat, vibration, stray light: tiny disturbances corrupt qubits. Scientists call these <b>errors</b>. Your factory makes qubits, and glitches will ruin some before they reach the customer.' },
  { art: '👀❌', title: 'You can’t just look',
    text: 'To check a spinning coin you’d have to stop it, and then it’s not spinning anymore. <b>Looking at a qubit destroys what it holds.</b> So how do you find a broken one without looking? That’s the puzzle of <b>quantum error correction</b>.' },
  { art: '🏭💰', title: 'Your job',
    text: 'Deliver good qubits (<b class="pos">+$20</b>), avoid refunds (<b class="neg">−$15</b>), and pay the electricity bill each night. Spend your profit on upgrades. <b>Every upgrade is a real technique</b> scientists use to protect qubits.' },
];

// ---------------------------------------------------------------- circuits

// Bit flips are seen by the bit-flip code's checks; phase flips by the
// phase-flip code's checks. Each product runs one circuit of each kind.
const xSpec = (d, errs) => ({ code: 'bit', d, errors: errs.flatMap((e, q) => (e ? [{ q, p: 'X' }] : [])) });
const zSpec = (d, errs) => ({ code: 'phase', d, errors: errs.flatMap((e, q) => (e ? [{ q, p: 'Z' }] : [])) });

function allSpecs() {
  const specs = [];
  for (const d of [1, 3, 5]) {
    for (let mask = 0; mask < 1 << d; mask++) {
      const errs = Array.from({ length: d }, (_, q) => (mask >> q) & 1);
      specs.push(xSpec(d, errs), zSpec(d, errs));
    }
  }
  return specs;
}

// ---------------------------------------------------------------- sound

function makeSound() {
  let ctx = null;
  let muted = false;
  const tone = (freq, dur, type = 'sine', gain = 0.06, slide = 0) => {
    if (muted) return;
    try {
      ctx ||= new AudioContext();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, ctx.currentTime + dur);
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch { /* audio unavailable */ }
  };
  return {
    get muted() { return muted; },
    toggle() { muted = !muted; },
    glitch: () => tone(1100, 0.15, 'sawtooth', 0.025, 0.3),
    fix: () => { tone(700, 0.08); setTimeout(() => tone(1050, 0.1), 60); },
    oops: () => tone(220, 0.2, 'square', 0.04),
    cash: () => tone(1300, 0.08, 'triangle', 0.05),
    refund: () => tone(160, 0.3, 'sawtooth', 0.05, 0.6),
    buy: () => [660, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, 0.12), i * 80)),
  };
}

// ---------------------------------------------------------------- game

export async function startGame(root, engine, { speed = 1 } = {}) {
  const sound = makeSound();
  const cache = new Map();
  let nextId = 1;
  const g = {
    screen: 'loading', day: 0, money: 100, best: 0,
    owned: { rep: 0, bot: 0, goggles: 0, big: 0, cool: 0 },
    items: [], clock: 0, spawnIn: 0, botBusy: 0,
    paused: false, relaxed: false, report: null, log: [],
    stats: null, total: { good: 0, bad: 0, fixes: 0 },
    slide: 0, coach: null, taught: new Set(), trained: new Set(), training: null, glossary: false,
  };

  root.innerHTML = `<div class="factory">
      <div id="screen"></div>
      <footer class="footer">⚛ Every warning light and quality check is a Qiskit circuit run on <b>${esc(engine.label)}</b> · This effort is supported by Qollab &amp; IonQ</footer>
      <div class="sr-only" aria-live="polite" id="live"></div>
    </div>`;
  const screen = root.querySelector('#screen');
  const live = root.querySelector('#live');
  const say = msg => { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 30); };

  const distance = () => (g.owned.big ? 5 : g.owned.rep ? 3 : 1);
  const glitchRate = () => GLITCH_RATE[g.day] * 0.75 ** g.owned.cool;
  const beltSeconds = () => BELT_SECONDS * (g.relaxed ? 1.8 : 1);

  // Sample one real shot from the cached Qiskit results for this circuit.
  function shot(spec) {
    const rows = cache.get(specKey(spec));
    let x = Math.random() * rows.reduce((s, r) => s + r.count, 0);
    return rows.find(r => (x -= r.count) < 0) || rows[0];
  }

  function measure(item) {
    item.xLights = shot(xSpec(item.d, item.x)).syn;
    item.zLights = g.owned.goggles ? shot(zSpec(item.d, item.z)).syn : item.zLights.map(() => 0);
    item.dirty = true;
  }

  // ------------------------------------------------------------ teaching

  // The foreman explains something the first time it happens, with the belt
  // paused, so new players are never left guessing.
  function teach(id, html, item = null) {
    if (g.taught.has(id) || g.coach) return;
    g.taught.add(id);
    g.coach = { html };
    if (item) item.highlight = true;
    g.paused = true;
    render(true);
  }

  function closeCoach() {
    g.coach = null;
    g.paused = false;
    g.items.forEach(i => { if (i.highlight) { i.highlight = false; i.dirty = true; } });
    render();
  }

  // ------------------------------------------------------------ simulation

  function spawn() {
    const d = distance();
    g.money -= d * COPY_COST;
    g.stats.materials += d * COPY_COST;
    const item = { id: nextId++, d, pos: 0, x: new Array(d).fill(0), z: new Array(d).fill(0), xLights: new Array(d - 1).fill(0), zLights: new Array(d - 1).fill(0), flash: 0, dirty: true };
    g.items.push(item);
  }

  function glitch(item) {
    const q = Math.floor(Math.random() * item.d);
    const phase = Math.random() < PHASE_SHARE[g.day];
    (phase ? item.z : item.x)[q] ^= 1;
    item.flash = 0.35;
    measure(item);
    sound.glitch();
    if (item.d === 1) {
      teach('glitch', '⚡ <b>A glitch just hit this product!</b> Its qubit is now corrupted, but from the outside it looks exactly the same. With a single qubit there’s no way to check it without destroying it. Watch what happens at the truck.', item);
    }
  }

  // Tapping a copy applies the fix the lights point to. With no light
  // pointing at it, you've "fixed" a healthy copy, which breaks it.
  function repair(item, q) {
    const xFix = item.xLights.some(Boolean) && decode(item.xLights).includes(q);
    const zFix = item.zLights.some(Boolean) && decode(item.zLights).includes(q);
    if (xFix) item.x[q] ^= 1;
    if (zFix) item.z[q] ^= 1;
    if (!xFix && !zFix) {
      item.x[q] ^= 1;
      sound.oops();
      toast(item, 'Oops! That copy was fine');
      teach('oops', '🙈 <b>That copy was healthy</b>, so “fixing” it just broke it. Only tap copies the lights point to: the one that disagrees with its lit neighbours.', item);
    } else {
      sound.fix();
      g.stats.fixes++;
    }
    measure(item);
  }

  function botFix(item) {
    let fixed = false;
    for (const q of decode(item.xLights)) { item.x[q] ^= 1; fixed = true; }
    if (g.owned.goggles) for (const q of decode(item.zLights)) { item.z[q] ^= 1; fixed = true; }
    if (fixed) {
      measure(item);
      g.stats.botFixes++;
      g.botBusy = 2.4 / g.owned.bot;
      item.botFlash = 0.5;
      teach('bot', '🤖 <b>Your Decoder Bot just fixed a product by itself.</b> It read the lights and worked out which copy to flip, exactly like the decoders that run inside real quantum computers, millions of times per second.', item);
    }
  }

  // Quality check: read every copy (a real measurement) and majority-vote.
  function deliver(item) {
    const xs = xSpec(item.d, item.x), zs = zSpec(item.d, item.z);
    const bitBad = logicalValue(xs, shot(xs).data), phaseBad = logicalValue(zs, shot(zs).data);
    if (bitBad || phaseBad) {
      g.money -= REFUND;
      g.stats.bad++;
      sound.refund();
      floatText(`−$${REFUND}`, 'bad');
      if (item.d === 1) {
        g.stats.badSingle++;
        teach('refund1', '💸 <b>Refund!</b> At the truck, the customer measured the qubit and found it had been flipped by a glitch. Single qubits can’t be protected. Save up for the <b>🧩 Repetition Code</b> in the shop tonight.');
      } else if (phaseBad && !g.owned.goggles) {
        g.stats.badPhase++;
        teach('refundGhost', '👻 <b>That product had no lights on, yet it failed!</b> A <b>phase flip</b> got it. Picture the spinning coin: a phase flip reverses its spin without changing heads or tails, so your orange lights can’t see it. <b>👓 Phase Goggles</b> can.');
      } else {
        g.stats.badVote++;
        teach('refundVote', '💸 <b>Refund!</b> At the truck, the copies are read and the <b>majority wins</b>. This product had too many broken copies at once, so the wrong answer won the vote. Fix products quickly, before a second glitch lands.');
      }
    } else {
      g.money += PRICE;
      g.stats.good++;
      sound.cash();
      floatText(`+$${PRICE}`, 'good');
    }
  }

  function step(dt) {
    g.clock += dt;
    g.spawnIn -= dt;
    g.botBusy = Math.max(0, g.botBusy - dt);
    if (g.spawnIn <= 0 && g.clock < DAY_SECONDS) {
      spawn();
      g.spawnIn = SPAWN_EVERY[g.day] * (g.relaxed ? 1.8 : 1);
    }
    for (const item of g.items) {
      item.pos += dt / beltSeconds();
      item.flash = Math.max(0, item.flash - dt);
      item.botFlash = Math.max(0, (item.botFlash || 0) - dt);
      if (Math.random() < glitchRate() * item.d * dt) glitch(item); // every copy can glitch
      if (g.owned.bot && !g.botBusy && Math.abs(item.pos - BOT_AT) < 0.03 && !item.botSeen) {
        item.botSeen = true;
        botFix(item);
      }
    }
    for (const item of g.items.filter(i => i.pos >= 1)) deliver(item);
    g.items = g.items.filter(i => i.pos < 1);
    if (g.clock >= DAY_SECONDS && g.items.length === 0) endDay();
  }

  // ------------------------------------------------------------ days

  function startDay() {
    Object.assign(g, { screen: 'play', clock: 0, spawnIn: 0.5, items: [], paused: false, botBusy: 0 });
    g.stats = { good: 0, bad: 0, badSingle: 0, badPhase: 0, badVote: 0, fixes: 0, botFixes: 0, materials: 0, startMoney: g.money };
    render(true);
    if (g.day === 0) {
      teach('day1', '👷 <b>Welcome to the factory floor!</b> Each box on the belt is one qubit heading to the delivery truck. Glitches (⚡) will hit some of them, and with no protection you can’t do anything about it yet. Watch how it goes, earn some money, then upgrade tonight.');
    } else if (g.day === 2) {
      teach('ghosts', '⚠ <b>New threat: phase flips!</b> A phase flip doesn’t knock the coin over; it reverses its spin. Heads and tails stay the same, so orange lights miss it, but the qubit is still ruined. ' +
        (g.owned.goggles ? 'Good thing you have 👓 Phase Goggles: watch the purple lights.' : 'Consider 👓 Phase Goggles tonight.'));
    } else if (g.owned.big && !g.taught.has('big')) {
      teach('big', '🛡️ <b>Bigger Code installed:</b> 5 copies per product. The majority vote now survives 2 broken copies. The catch: more copies cost more and give glitches more places to land. That trade-off is real in quantum computing too.');
    } else if (g.owned.cool && !g.taught.has('cool')) {
      teach('cool', '❄️ <b>Cryo Cooling installed.</b> Colder qubits glitch less. In real labs, qubits sit in fridges colder than outer space, because error correction only works when the hardware is good enough to begin with.');
    }
  }

  // ------------------------------------------------------------ training
  // A hands-on lesson on a stopped belt, the first time a technique is bought.

  const TRAININGS = {
    rep: [
      { setup: t => {}, text: 'Your new products are built from <b>3 linked copies</b> of the qubit. They always share the same value (physicists call this <b>entanglement</b>).<br><br>Between each pair sits a <b>warning light</b>. It asks one question: <i>“are you two the same?”</i> It never asks <i>what</i> the value is, so nothing gets destroyed.', next: 'Show me a glitch' },
      { setup: t => { t.item.x[1] = 1; t.mark = 1; }, text: '⚡ A glitch flipped <b>copy 2</b>. Now copy 2 disagrees with <i>both</i> of its neighbours, so <b>both lights beside it turn on</b>.<br><br><b>Tap copy 2</b> to flip it back.', expect: true },
      { setup: t => { t.mark = null; }, text: '✅ <b>Fixed!</b> The lights only told you <i>where</i> copies disagree, never the value itself. Scientists call this pattern of lights the <b>syndrome</b>.', next: 'Try one on my own' },
      { setup: t => { t.item.x[Math.random() < 0.5 ? 0 : 2] = 1; }, text: 'Your turn. A glitch hit <i>somewhere</i>. Which copy is the odd one out? Hint: a copy at the edge only has one neighbour, so only one light turns on.', expect: true },
      { setup: t => {}, text: '🎯 <b>Nice!</b> One last thing: at the truck, the copies are read and the <b>majority wins</b>. One broken copy gets outvoted, so the product is still fine. But if <b>two</b> copies break before you fix them, the wrong answer wins the vote and you pay a refund. <b>Fix fast!</b>', next: 'Start the day' },
    ],
    goggles: [
      { setup: t => { t.item.z[2] = 1; t.mark = 2; t.goggles = false; }, text: '⚡ A <b>phase flip</b> hit <b>copy 3</b>. Look: the orange lights stay dark. They compare heads vs tails, and a phase flip doesn’t change that.', next: 'Put on the goggles 👓' },
      { setup: t => { t.goggles = true; }, text: 'The goggles compare the copies in a rotated way (using <b>Hadamard gates</b>), which turns phase flips into differences the lights can see: <b>purple lights</b>. <b>Tap the copy the purple light points to.</b>', expect: true },
      { setup: t => { t.mark = null; }, text: '✅ <b>Fixed!</b> Real quantum computers must catch <b>both</b> kinds of error. Famous designs like the <b>surface code</b> run both kinds of check side by side.', next: 'Start the day' },
    ],
  };

  function startTraining(kind) {
    g.trained.add(kind);
    const t = { kind, step: 0, item: { id: 0, d: 3, x: [0, 0, 0], z: [0, 0, 0], xLights: [0, 0], zLights: [0, 0] }, mark: null, goggles: true, hint: '' };
    g.training = t;
    g.screen = 'training';
    enterStep();
  }

  function enterStep() {
    const t = g.training;
    TRAININGS[t.kind][t.step].setup(t);
    trainingLights();
    t.hint = '';
    render(true);
  }

  function trainingLights() {
    const t = g.training;
    t.item.xLights = shot(xSpec(3, t.item.x)).syn;
    t.item.zLights = t.goggles ? shot(zSpec(3, t.item.z)).syn : [0, 0];
  }

  function trainingTap(q) {
    const t = g.training;
    const lights = t.kind === 'goggles' ? t.item.zLights : t.item.xLights;
    if (!lights.some(Boolean) || !decode(lights).includes(q)) {
      t.hint = 'Not that one. Look for the copy that sits next to the lit lights and disagrees with its neighbours.';
      sound.oops();
      render();
      say(t.hint);
      return;
    }
    (t.kind === 'goggles' ? t.item.z : t.item.x)[q] ^= 1;
    sound.fix();
    t.step++;
    enterStep();
  }

  function trainingNext() {
    const t = g.training;
    if (t.step === TRAININGS[t.kind].length - 1) {
      g.training = null;
      return startDay();
    }
    t.step++;
    enterStep();
  }

  function beginDay() {
    const next = ['rep', 'goggles'].find(k => g.owned[k] && !g.trained.has(k));
    if (next) startTraining(next);
    else startDay();
  }

  function endDay() {
    const bill = BILL[g.day];
    g.money -= bill;
    g.report = { ...g.stats, bill, profit: g.money - g.stats.startMoney };
    g.total.good += g.stats.good;
    g.total.bad += g.stats.bad;
    if (g.money < 0) { g.screen = 'bankrupt'; g.best = Math.max(g.best, 0); }
    else if (g.day === DAYS - 1) { g.screen = 'win'; g.best = Math.max(g.best, g.money); }
    else g.screen = 'report';
    render(true);
    say(`Day ${g.day + 1} over. Money: ${g.money} dollars.`);
  }

  function newGame(relaxed) {
    Object.assign(g, {
      day: 0, money: 100, relaxed, owned: { rep: 0, bot: 0, goggles: 0, big: 0, cool: 0 },
      total: { good: 0, bad: 0, fixes: 0 }, taught: new Set(), trained: new Set(), coach: null, slide: 0,
    });
    g.screen = 'briefing';
    render(true);
  }

  function buy(id) {
    const u = UPGRADES.find(x => x.id === id);
    if (g.money < u.cost) return;
    g.money -= u.cost;
    g.owned[id]++;
    sound.buy();
    render();
    say(`Bought ${u.name}.`);
  }

  // ------------------------------------------------------------ effects

  function floatText(text, kind) {
    const truck = screen.querySelector('.truck');
    if (!truck) return;
    const el = document.createElement('span');
    el.className = `float ${kind}`;
    el.setAttribute('aria-hidden', 'true');
    el.textContent = text;
    truck.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  function toast(item, text) {
    const el = screen.querySelector(`[data-item="${item.id}"]`);
    if (!el) return;
    const t = document.createElement('span');
    t.className = 'toast';
    t.setAttribute('aria-hidden', 'true');
    t.textContent = text;
    el.appendChild(t);
    setTimeout(() => t.remove(), 1100);
    say(text);
  }

  function banner(text) {
    const el = screen.querySelector('.banner');
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    say(text);
    setTimeout(() => { el.hidden = true; }, 6000);
  }

  // ------------------------------------------------------------ render

  function render(moveFocus = false) {
    const focusId = document.activeElement?.id;
    screen.innerHTML = {
      loading: () => `<div class="card center"><p role="status">Calibrating the factory on ${esc(engine.label)}…</p></div>`,
      title: titleHTML, briefing: briefingHTML, training: trainingHTML,
      play: playHTML, report: reportHTML, win: endHTML, bankrupt: endHTML,
    }[g.screen]() + (g.glossary ? glossaryHTML() : '');
    bind();
    itemEls.clear();
    if (g.screen === 'play') drawBelt();
    const again = !moveFocus && focusId && screen.querySelector(`#${CSS.escape(focusId)}`);
    if (again) again.focus();
    else if (moveFocus) screen.querySelector('[data-autofocus]')?.focus();
  }

  function titleHTML() {
    return `<div class="card center title-card">
      <div class="title-art" aria-hidden="true">📦⚡🏭</div>
      <h1>Qubit Factory</h1>
      <p class="tagline">You run a factory that makes <b>qubits</b>, the building blocks of quantum computers.
      Glitches keep breaking them. Learn the real tricks scientists use to protect qubits, and make as much money as you can in ${DAYS} days.</p>
      <p class="hint">No quantum knowledge needed. You’ll learn everything as you play.</p>
      <button type="button" class="big-btn" id="start" data-autofocus>Open the factory</button>
      <label class="toggle"><input type="checkbox" id="relaxed" ${g.relaxed ? 'checked' : ''}> Relaxed mode (slower belt)</label>
      <button type="button" class="tool" id="open-glossary">📘 Quantum 101</button>
      ${g.best ? `<p class="best">Best: $${g.best.toLocaleString()}</p>` : ''}
    </div>`;
  }

  function briefingHTML() {
    const b = BRIEFING[g.slide];
    const last = g.slide === BRIEFING.length - 1;
    return `<div class="card center briefing">
      <p class="step-dots" aria-label="Slide ${g.slide + 1} of ${BRIEFING.length}">${BRIEFING.map((_, i) => `<span class="${i === g.slide ? 'on' : ''}"></span>`).join('')}</p>
      <div class="brief-art" aria-hidden="true">${b.art}</div>
      <h1 tabindex="-1" data-autofocus>${b.title}</h1>
      <p class="brief-text">${b.text}</p>
      <div class="row-center">
        ${g.slide ? '<button type="button" class="tool" id="brief-back">← Back</button>' : ''}
        <button type="button" class="big-btn" id="brief-next">${last ? 'Start day 1 →' : 'Next →'}</button>
      </div>
      ${last ? '' : '<button type="button" class="link" id="brief-skip">Skip intro</button>'}
    </div>`;
  }

  function trainingHTML() {
    const t = g.training;
    const s = TRAININGS[t.kind][t.step];
    const { item } = t;
    const parts = [];
    for (let q = 0; q < 3; q++) {
      parts.push(`<button type="button" class="copy big ${t.mark === q ? 'marked' : ''}" data-train="${q}" id="t-${q}"
        aria-label="Copy ${q + 1}${t.mark === q ? ', hit by the glitch' : ''}" ${s.expect ? '' : 'disabled'}>${q + 1}${t.mark === q ? '<span class="mark" aria-hidden="true">⚡</span>' : ''}</button>`);
      if (q < 2) {
        const x = item.xLights[q], z = item.zLights[q];
        parts.push(`<span class="lamps big" role="img" aria-label="Light between copies ${q + 1} and ${q + 2}: orange ${x ? 'on' : 'off'}${t.kind === 'goggles' ? `, purple ${z ? 'on' : 'off'}` : ''}">
          <span class="lamp ${x ? 'on' : ''}"></span>${t.kind === 'goggles' && t.goggles ? `<span class="lamp phase ${z ? 'on' : ''}"></span>` : ''}</span>`);
      }
    }
    return `<div class="card training">
      <p class="kicker">Training · ${UPGRADES.find(u => u.id === t.kind).icon} ${UPGRADES.find(u => u.id === t.kind).name}</p>
      <div class="coach-row"><span class="avatar" aria-hidden="true">👷</span><p class="bubble" id="train-text" tabindex="-1" data-autofocus>${s.text}</p></div>
      <div class="train-stage"><div class="product row-product">${parts.join('')}</div></div>
      ${t.hint ? `<p class="train-hint" role="status">${t.hint}</p>` : ''}
      ${s.next ? `<button type="button" class="big-btn" id="train-next">${s.next}</button>` : ''}
      <details class="peek"><summary>Show the real Qiskit circuit behind these lights</summary>${circuitView(t.kind === 'goggles' && t.goggles ? zSpec(3, item.z) : xSpec(3, item.x))}
        <p class="hint">Data qubits q0–q2 are the copies. Red gates are the glitches. Helper qubits a0 and a1 measure the lights.</p></details>
    </div>`;
  }

  function glossaryHTML() {
    return `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="gl-title">
      <div class="card glossary">
        <h2 id="gl-title" tabindex="-1">📘 Quantum 101</h2>
        <dl>${GLOSSARY.map(([term, def]) => `<div><dt>${term}</dt><dd>${def}</dd></div>`).join('')}</dl>
        <button type="button" class="big-btn" id="close-glossary">Back to the factory</button>
      </div></div>`;
  }

  function playHTML() {
    const left = Math.max(0, Math.ceil(DAY_SECONDS - g.clock));
    return `<div class="hud">
        <span>Day <b>${g.day + 1}</b>/${DAYS}</span>
        <span class="money" id="money" aria-live="off">$${g.money}</span>
        <span id="clock">${left > 0 ? `⏱ ${left}s` : 'Closing…'}</span>
      </div>
      <div class="banner" hidden role="status"></div>
      ${g.coach ? `<div class="coach" role="dialog" aria-labelledby="coach-text">
          <span class="avatar" aria-hidden="true">👷</span>
          <div><p id="coach-text">${g.coach.html}</p>
          <button type="button" class="big-btn small" id="coach-ok" data-autofocus>Got it</button></div></div>` : ''}
      <div class="floor">
        <div class="belt" aria-label="Conveyor belt">
          <div class="belt-surface" aria-hidden="true"></div>
          ${g.owned.bot ? `<div class="bot" style="--at:${BOT_AT * 100}%" aria-hidden="true"><span>🤖</span><small>Lv ${g.owned.bot}</small></div>` : ''}
          <div class="items" id="items"></div>
        </div>
        <div class="truck" aria-hidden="true">🚚</div>
      </div>
      <p class="legend">${g.owned.rep
        ? `💡 A <span class="lamp-key">light</span> turns on when the copies beside it disagree. <b>Tap the odd copy out</b> to fix it.${g.owned.goggles ? ' <span class="lamp-key phase">Purple lights</span> show phase flips.' : ''}`
        : '💡 Each box is a single qubit (🪙). One glitch ruins it, and you can’t check it without destroying it. Save up for the <b>🧩 Repetition Code</b>.'}</p>
      <div class="controls">
        <button type="button" class="tool" id="pause">${g.paused && !g.coach ? '▶ Resume' : '⏸ Pause'} <kbd>P</kbd></button>
        <button type="button" class="tool" id="open-glossary">📘 Quantum 101</button>
        <button type="button" class="tool" id="mute" aria-pressed="${sound.muted}">${sound.muted ? '🔇' : '🔊'} Sound</button>
      </div>
      ${g.paused && !g.coach ? pauseHTML() : ''}`;
  }

  function pauseHTML() {
    const item = g.items[g.items.length - 1];
    return `<div class="pause-panel"><h2>Paused</h2>
      ${item ? `<p>The real Qiskit circuit behind the newest product’s warning lights:</p>${circuitView(xSpec(item.d, item.x))}` : ''}
      <p class="hint">Red X gates are glitches. a0, a1… are helper qubits that measure the warning lights.</p></div>`;
  }

  // Items are positioned every frame; their insides only re-render when they change.
  const itemEls = new Map();
  function drawBelt() {
    const box = screen.querySelector('#items');
    if (!box) return;
    const vertical = box.clientHeight > box.clientWidth;
    for (const [id, el] of itemEls) if (!g.items.some(i => i.id === id)) { el.remove(); itemEls.delete(id); }
    for (const item of g.items) {
      let el = itemEls.get(item.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'item';
        el.dataset.item = item.id;
        box.appendChild(el);
        itemEls.set(item.id, el);
        item.dirty = true;
      }
      if (item.dirty) { el.innerHTML = itemHTML(item); item.dirty = false; }
      // Slide from one end of the belt to the other, whatever the product's size.
      // On narrow screens the belt runs top to bottom.
      if (vertical) {
        el.style.top = `${item.pos * 100}%`;
        el.style.transform = `translate(-50%, ${-item.pos * 100}%)`;
      } else {
        el.style.left = `${item.pos * 100}%`;
        el.style.transform = `translate(${-item.pos * 100}%, -50%)`;
      }
      el.classList.toggle('flash', item.flash > 0);
      el.classList.toggle('bot-flash', item.botFlash > 0);
    }
    const money = screen.querySelector('#money');
    if (money) money.textContent = `$${g.money}`;
    const clock = screen.querySelector('#clock');
    const left = Math.max(0, Math.ceil(DAY_SECONDS - g.clock));
    if (clock) clock.textContent = left > 0 ? `⏱ ${left}s` : 'Closing…';
  }

  function itemHTML(item) {
    if (item.d === 1) {
      return `<div class="product single ${item.highlight ? 'highlight' : ''}" role="img" aria-label="Product ${item.id}: single qubit, can't be checked">
        <span class="copy">🪙</span></div>`;
    }
    const parts = [];
    for (let q = 0; q < item.d; q++) {
      parts.push(`<button type="button" class="copy" data-copy="${q}" id="c${item.id}-${q}" aria-label="Product ${item.id}, copy ${q + 1}">${q + 1}</button>`);
      if (q < item.d - 1) {
        const x = item.xLights[q], z = item.zLights[q];
        const label = [x && 'bit light on', z && 'phase light on'].filter(Boolean).join(', ') || 'lights off';
        parts.push(`<span class="lamps" role="img" aria-label="Between copies ${q + 1} and ${q + 2}: ${label}">
          <span class="lamp ${x ? 'on' : ''}"></span>${g.owned.goggles ? `<span class="lamp phase ${z ? 'on' : ''}"></span>` : ''}</span>`);
      }
    }
    return `<div class="product d${item.d} ${item.highlight ? 'highlight' : ''}">${parts.join('')}</div>`;
  }

  function reportHTML() {
    const r = g.report;
    const cards = UPGRADES.map(u => {
      const lvl = g.owned[u.id];
      const maxed = lvl >= (u.levels || 1);
      const locked = u.needs && !g.owned[u.needs];
      const cost = u.cost * (lvl + 1);
      return `<li class="upgrade ${maxed ? 'owned' : ''}">
        <div class="up-head"><span class="up-icon" aria-hidden="true">${u.icon}</span><h3>${u.name}${u.levels ? ` <small>Lv ${lvl}/${u.levels}</small>` : ''}</h3></div>
        <p>${u.text}</p>
        <p class="real">🔬 <b>In real quantum computers:</b> ${u.real}</p>
        ${maxed ? '<p class="owned-tag">✓ Installed</p>'
          : locked ? `<p class="locked-tag">Needs ${UPGRADES.find(x => x.id === u.needs).name}</p>`
          : `<button type="button" class="buy" data-buy="${u.id}" id="buy-${u.id}" ${g.money < cost ? 'disabled' : ''}>Buy · $${cost}</button>`}
      </li>`;
    }).join('');
    return `<div class="card">
      <h1 tabindex="-1" data-autofocus>Day ${g.day + 1} report</h1>
      <dl class="report">
        <div><dt>Delivered</dt><dd>${r.good} × $${PRICE}</dd></div>
        <div><dt>Refunds</dt><dd class="neg">${r.bad} × −$${REFUND}</dd></div>
        <div><dt>Materials</dt><dd class="neg">−$${r.materials}</dd></div>
        <div><dt>Electricity bill</dt><dd class="neg">−$${r.bill}</dd></div>
        <div class="total"><dt>Profit today</dt><dd class="${r.profit < 0 ? 'neg' : 'pos'}">${r.profit < 0 ? '−' : '+'}$${Math.abs(r.profit)}</dd></div>
      </dl>
      ${insightHTML(r)}
      <p class="cash">Cash: <b>$${g.money}</b> · Tomorrow’s bill: $${BILL[g.day + 1]}${g.day + 1 === 2 ? ' · ⚠ Forecast: ghost glitches (phase flips)' : ''}</p>
      <h2>Upgrade shop</h2>
      <p class="hint">Every upgrade is a real technique for protecting qubits. Not sure what something means? <button type="button" class="link" id="open-glossary">📘 Quantum 101</button></p>
      <ul class="shop">${cards}</ul>
      <button type="button" class="big-btn" id="next-day" data-autofocus>Start day ${g.day + 2} →</button>
    </div>`;
  }

  // One line explaining why today's refunds happened, pointing at the fix.
  function insightHTML(r) {
    const lines = [];
    if (r.badSingle) lines.push(`${r.badSingle} refund${r.badSingle > 1 ? 's' : ''} came from single qubits hit by glitches. Nothing could save them. The <b>🧩 Repetition Code</b> lets you find and fix broken copies.`);
    if (r.badPhase) lines.push(`${r.badPhase} refund${r.badPhase > 1 ? 's' : ''} came from <b>phase flips</b> your orange lights couldn’t see. <b>👓 Phase Goggles</b> reveal them.`);
    if (r.badVote) lines.push(`${r.badVote} refund${r.badVote > 1 ? 's' : ''} happened because too many copies broke before they were fixed, and the wrong answer won the majority vote. Fix faster, or try the <b>🤖 Decoder Bot</b> or <b>🛡️ Bigger Code</b>.`);
    if (!lines.length) lines.push('🎉 <b>Perfect day: zero refunds!</b> Every qubit reached the customer intact.');
    return `<div class="insight"><h2>What happened today</h2>${lines.map(l => `<p>${l}</p>`).join('')}</div>`;
  }

  function endHTML() {
    const won = g.screen === 'win';
    const learned = UPGRADES.filter(u => g.owned[u.id]).map(u => `<li><b>${u.icon} ${u.name}:</b> ${u.real}</li>`).join('');
    return `<div class="card center">
      <h1 tabindex="-1" data-autofocus>${won ? '🏆 Season complete!' : '💸 Bankrupt!'}</h1>
      <p class="final-score">${won ? `$${g.money.toLocaleString()} in the bank` : 'The electricity bill was more than your cash.'}</p>
      <p>${g.total.good} products delivered · ${g.total.bad} refunds</p>
      ${learned ? `<div class="recap"><h2>What you learned about quantum computers</h2><ul>${learned}</ul></div>`
        : '<p>Tip: buy the Repetition Code early. Single qubits can’t be protected.</p>'}
      <button type="button" class="big-btn" id="again">Play again</button>
    </div>`;
  }

  function bind() {
    const on = (id, fn) => { const el = screen.querySelector('#' + id); if (el) el.onclick = fn; };
    on('start', () => newGame(screen.querySelector('#relaxed').checked));
    on('next-day', () => { g.day++; beginDay(); });
    on('brief-next', () => { if (g.slide === BRIEFING.length - 1) startDay(); else { g.slide++; render(true); } });
    on('brief-back', () => { g.slide--; render(true); });
    on('brief-skip', startDay);
    on('train-next', trainingNext);
    on('coach-ok', closeCoach);
    on('open-glossary', () => { g.glossary = true; g.wasPaused = g.paused; g.paused = true; render(); screen.querySelector('#gl-title')?.focus(); });
    on('close-glossary', () => { g.glossary = false; g.paused = g.wasPaused; render(true); });
    screen.querySelectorAll('[data-train]').forEach(b => { b.onclick = () => trainingTap(+b.dataset.train); });
    on('again', () => { g.screen = 'title'; render(true); });
    on('pause', togglePause);
    on('mute', () => { sound.toggle(); render(); });
    screen.querySelectorAll('[data-buy]').forEach(b => { b.onclick = () => buy(b.dataset.buy); });
    const box = screen.querySelector('#items');
    // pointerdown so moving targets are easy to hit; click covers keyboard activation.
    if (box) {
      const handle = e => {
        const btn = e.target.closest('[data-copy]');
        if (!btn || g.paused) return;
        e.preventDefault();
        const item = g.items.find(i => i.id === +btn.closest('[data-item]').dataset.item);
        if (item) repair(item, +btn.dataset.copy);
      };
      box.addEventListener('pointerdown', handle);
      box.addEventListener('click', e => { if (e.detail === 0) handle(e); });
    }
  }

  function togglePause() {
    if (g.screen !== 'play' || g.coach || g.glossary) return;
    g.paused = !g.paused;
    render();
  }

  // Keyboard: number keys fix that copy on the product closest to the truck
  // that has a light on.
  document.addEventListener('keydown', e => {
    if (g.screen !== 'play' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { togglePause(); return; }
    const n = +e.key;
    if (!n || g.paused) return;
    const target = [...g.items].sort((a, b) => b.pos - a.pos)
      .find(i => i.d > 1 && (i.xLights.some(Boolean) || i.zLights.some(Boolean)));
    if (target && n <= target.d) { repair(target, n - 1); e.preventDefault(); }
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000) * speed;
    last = now;
    if (g.screen === 'play' && !g.paused) {
      step(dt);
      if (g.screen === 'play') drawBelt();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  render();
  const specs = allSpecs();
  const results = await engine.run(specs, SHOTS);
  specs.forEach((s, i) => cache.set(specKey(s), results[i]));
  g.screen = 'title';
  render(true);
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
