import * as gardenQuantum from 'quantum.garden';
// Exact five-qubit statevector diagnostics. Three data qubits, two ancillas.
// The management simulation tracks stochastic X errors as an equivalent Pauli frame.
function diagnose(a, b) {
  return a ? (b ? 0 : 1) : b ? 2 : -1;
}
function syndrome(mask) {
  return [mask[0] ^ mask[1], mask[0] ^ mask[2]];
}
let kernel = null;
function installRecoveryKernel(table) {
  for (let m = 0; m < 8; m++)
    for (let c = 0; c < 4; c++) {
      const key =
          [0, 1, 2].map((q) => (m >> q) & 1).join("") +
          ":" +
          [0, 1].map((q) => (c >> q) & 1).join(""),
        v = table?.[key];
      if (
        !Array.isArray(v) ||
        v.length !== 3 ||
        v.some((b) => b !== 0 && b !== 1)
      )
        throw Error("Incomplete Qiskit recovery kernel.");
    }
  kernel = JSON.parse(JSON.stringify(table));
}
function recover(mask, clue = syndrome(mask)) {
  if (kernel) return [...kernel[mask.join("") + ":" + clue.join("")]];
  const next = [...mask],
    q = diagnose(...clue);
  if (q >= 0) next[q] ^= 1;
  return next;
}
function statevector(
  mask,
  theta = Math.PI / 2,
  phi = 0,
  correction = false,
  clue = null,
) {
  const v = new Float64Array(64);
  v[0] = Math.cos(theta / 2);
  v[2] = Math.sin(theta / 2) * Math.cos(phi);
  v[3] = Math.sin(theta / 2) * Math.sin(phi);
  const x = (q, controls = []) => {
    for (let i = 0; i < 32; i++)
      if (!(i & (1 << q)) && controls.every((c) => i & (1 << c))) {
        const j = i | (1 << q);
        [v[2 * i], v[2 * j]] = [v[2 * j], v[2 * i]];
        [v[2 * i + 1], v[2 * j + 1]] = [v[2 * j + 1], v[2 * i + 1]];
      }
  };
  x(1, [0]);
  x(2, [0]);
  mask.forEach((e, q) => {
    if (e) x(q);
  });
  x(3, [0]);
  x(3, [1]);
  x(4, [0]);
  x(4, [2]);
  if (correction) {
    const s = clue || syndrome(mask),
      q = diagnose(...s);
    if (q >= 0) x(q);
  }
  x(2, [0]);
  x(1, [0]);
  let p0 = 0,
    p1 = 0,
    re = 0,
    im = 0;
  for (let i = 0; i < 32; i += 2) {
    const ar = v[2 * i],
      ai = v[2 * i + 1],
      br = v[2 * (i + 1)],
      bi = v[2 * (i + 1) + 1];
    p0 += ar * ar + ai * ai;
    p1 += br * br + bi * bi;
    re += ar * br + ai * bi;
    im += ai * br - ar * bi;
  }
  const r = { x: 2 * re, y: -2 * im, z: p0 - p1 };
  const f =
    (1 +
      r.x * Math.sin(theta) * Math.cos(phi) +
      r.y * Math.sin(theta) * Math.sin(phi) +
      r.z * Math.cos(theta)) /
    2;
  return { v, fidelity: Math.max(0, Math.min(1, f)), r };
}
function memoryFidelity(mask) {
  return (
    [
      [0, 0],
      [Math.PI, 0],
      [Math.PI / 2, 0],
      [Math.PI / 2, Math.PI],
      [Math.PI / 2, Math.PI / 2],
      [Math.PI / 2, (3 * Math.PI) / 2],
    ].reduce((n, [t, p]) => n + statevector(mask, t, p).fidelity, 0) / 6
  );
}
function qiskitSource() {
  return `# Ion Garden: one coherent three-qubit bit-flip recovery round.
# Actual game uses repeated stochastic X errors, limited helper queues, and
# additional classical measurement/gate error probabilities. This circuit
# isolates the ideal correction kernel; it does not validate those assumptions.
import itertools
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity

def circuit(errors, theta, phi):
    qc = QuantumCircuit(5)
    qc.ry(theta, 0)
    qc.p(phi, 0)
    qc.cx(0, 1)
    qc.cx(0, 2)
    for q, error in enumerate(errors):
        if error: qc.x(q)
    qc.cx(0, 3)
    qc.cx(1, 3)
    qc.cx(0, 4)
    qc.cx(2, 4)
    qc.ccx(3, 4, 0)
    qc.x(4)
    qc.ccx(3, 4, 1)
    qc.x(4)
    qc.x(3)
    qc.ccx(3, 4, 2)
    qc.x(3)
    qc.cx(0, 2)
    qc.cx(0, 1)
    return qc

inputs = [(0,0),(np.pi,0),(np.pi/2,0),(np.pi/2,np.pi),(np.pi/2,np.pi/2),(np.pi/2,3*np.pi/2)]
for errors in itertools.product([0,1], repeat=3):
    scores = []
    for theta, phi in inputs:
        rho = partial_trace(Statevector.from_instruction(circuit(errors,theta,phi)),[1,2,3,4])
        target = Statevector([np.cos(theta/2),np.exp(1j*phi)*np.sin(theta/2)])
        scores.append(float(state_fidelity(rho,target)))
    print(errors, 'six-state mean fidelity:', np.mean(scores))
`;
}

const COLS = 12,
  ROWS = 9;
const EQUIPMENT = {
  habitat: {
    cost: 45,
    radius: 0,
    name: "Memory habitat",
    description:
      "Three ion slimes hold one shared memory. Nearby helpers gather clues and correct bit flips.",
  },
  lantern: {
    cost: 35,
    radius: 3.25,
    name: "Helper lantern",
    description:
      "Two helper ion slimes measure pair agreement. Serves one habitat at a time; nearby habitats share the queue.",
  },
  cooler: {
    cost: 25,
    radius: 2.75,
    name: "Dew cooler",
    description:
      "Calms ion motion and makes nearby operations more reliable. It prevents some errors; it does not repair a damaged memory.",
  },
  flower: {
    cost: 8,
    radius: 0,
    name: "Wildflower patch",
    description:
      "A little joy for your garden. Decorative flowers do not change quantum protection.",
  },
};
const RHYTHMS = { balanced: 2.5, frequent: 1, gentle: 5 };
const CONTRACTS = [
  {
    title: "A small beginning",
    name: "First light",
    copy: "Your first three slimes share one precious memory. Plant a helper lantern nearby to keep it safe.",
    habitats: 1,
    duration: 36,
    rate: 0.032,
    target: 2 / 3,
    reward: 65,
  },
  {
    title: "Room for a friend",
    name: "Growing together",
    copy: "The village library has two memories to keep. Add a habitat. Will one lantern have time to care for both?",
    habitats: 2,
    duration: 48,
    rate: 0.043,
    target: 0.75,
    reward: 95,
  },
  {
    title: "A little summer rain",
    name: "Summer rain",
    copy: "Three families need your help. The air gets restless halfway through the day. Dew coolers and spare helpers will help.",
    habitats: 3,
    duration: 60,
    rate: 0.062,
    target: 0.78,
    reward: 125,
  },
  {
    title: "The lantern festival",
    name: "Lantern festival",
    copy: "Four precious memories, one busy garden. Keep the helper queues moving and send at least 80% safely home.",
    habitats: 4,
    duration: 72,
    rate: 0.074,
    target: 0.8,
    reward: 155,
  },
];
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const blocked = (x, y) =>
  x < 0 ||
  x >= COLS ||
  y < 0 ||
  y >= ROWS ||
  (x < 3 && y < 3) ||
  (x === 0 && y > 6) ||
  (x > 9 && y === 0);
function createGarden(seed = 48123) {
  return {
    version: 1,
    seed: seed >>> 0,
    id: 2,
    coins: 80,
    day: 0,
    completed: 0,
    run: null,
    history: [],
    equipment: [
      {
        id: 1,
        type: "habitat",
        x: 5,
        y: 4,
        name: "Clover cottage",
        rhythm: "balanced",
        mask: [0, 0, 0],
        lastClue: null,
        checkedAt: 0,
        flash: 0,
        waiting: false,
        active: false,
      },
    ],
    effects: [],
    lastOutcome: null,
  };
}
function random(s) {
  s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function place(s, type, x, y) {
  const item = EQUIPMENT[type];
  if (!item) return "Choose a garden tool first.";
  if (blocked(x, y)) return "Leave room for the pond and the garden edges.";
  if (s.equipment.some((e) => e.x === x && e.y === y))
    return "Something is already growing here.";
  if (s.coins < item.cost)
    return "Not quite enough seeds. Complete a contract or pack away equipment.";
  s.coins -= item.cost;
  const names = [
    "Clover cottage",
    "Peach nook",
    "Mint meadow",
    "Poppy porch",
    "Honey hollow",
    "Fern corner",
  ];
  const n = s.equipment.filter((e) => e.type === "habitat").length;
  s.equipment.push({
    id: s.id++,
    type,
    x,
    y,
    name: type === "habitat" ? names[n % names.length] : item.name,
    rhythm: "balanced",
    mask: [0, 0, 0],
    lastClue: null,
    checkedAt: 0,
    flash: 0,
    waiting: false,
    active: false,
  });
  s.effects.push({ kind: "plant", x, y, age: 0 });
  return null;
}
function sell(s, id) {
  const e = s.equipment.find((e) => e.id === id);
  if (!e) return 0;
  if (s.run && (e.active || e.job)) return -1;
  s.equipment = s.equipment.filter((e) => e.id !== id);
  const refund = Math.floor(EQUIPMENT[e.type].cost * 0.8);
  s.coins += refund;
  return refund;
}
function support(s, h) {
  return {
    lanterns: s.equipment.filter(
      (e) => e.type === "lantern" && distance(e, h) <= EQUIPMENT.lantern.radius,
    ),
    coolers: s.equipment.filter(
      (e) => e.type === "cooler" && distance(e, h) <= EQUIPMENT.cooler.radius,
    ),
  };
}
function contractFor(s) {
  return CONTRACTS[Math.min(s.day, CONTRACTS.length - 1)];
}
function canStart(s) {
  const c = contractFor(s),
    h = s.equipment.filter((e) => e.type === "habitat");
  if (s.run) return "A contract is already underway.";
  if (h.length < c.habitats)
    return `Plant ${c.habitats - h.length} more habitat${c.habitats - h.length === 1 ? "" : "s"} for this letter.`;
  if (h.some((e) => !support(s, e).lanterns.length))
    return "Every habitat needs a helper lantern within reach.";
  return null;
}
function beginContract(s) {
  const error = canStart(s);
  if (error) return error;
  const c = contractFor(s),
    beds = s.equipment.filter((e) => e.type === "habitat");
  s.lastOutcome = null;
  s.run = {
    time: 0,
    contract: { ...c },
    delivered: 0,
    safe: 0,
    fidelitySum: 0,
    expected: beds.length * (c.duration / 12),
    waitingPeak: 0,
    corrections: 0,
    checks: 0,
    misreads: 0,
    records: [],
    finishing: false,
  };
  beds.forEach((h) =>
    Object.assign(h, {
      mask: [0, 0, 0],
      age: 0,
      nextDue: 0,
      waiting: false,
      delivering: false,
      deliverRequested: 0,
      lastClue: null,
      active: true,
      checkedAt: 0,
      delivered: 0,
      safe: 0,
    }),
  );
  s.equipment
    .filter((e) => e.type === "lantern")
    .forEach((l) => (l.job = null));
  return null;
}
function noiseTick(s, h, dt) {
  const r = s.run,
    c = r.contract,
    cooled = support(s, h).coolers.length > 0;
  const breeze = r.time > c.duration * 0.5 && s.day >= 2 ? 1.6 : 1;
  const rate = c.rate * (cooled ? 0.3 : 1) * breeze;
  for (let q = 0; q < 3; q++)
    if (random(s) < 1 - Math.exp(-rate * dt)) h.mask[q] ^= 1;
}
function deliver(s, h) {
  const r = s.run,
    f = memoryFidelity(h.mask),
    safe = f > 0.99;
  r.delivered++;
  r.safe += Number(safe);
  r.fidelitySum += f;
  h.delivered++;
  h.safe += Number(safe);
  r.records.push({
    habitat: h.name,
    time: +r.time.toFixed(2),
    mask: [...h.mask],
    clue: h.lastClue,
    fidelity: +f.toFixed(6),
    safe,
  });
  s.effects.push({ kind: safe ? "parcel" : "faded", x: h.x, y: h.y, age: 0 });
  h.mask = [0, 0, 0];
  h.age = 0;
  h.delivering = false;
  h.nextDue = r.time + RHYTHMS[h.rhythm];
  h.flash = safe ? 1 : 2;
}
function step(s, dt) {
  if (!Number.isFinite(dt) || dt < 0 || dt > 0.25)
    throw Error("Use finite simulation steps of 0–0.25 seconds.");
  s.effects.forEach((e) => (e.age += dt));
  s.effects = s.effects.filter((e) => e.age < 2);
  s.equipment.forEach((e) => (e.flash = Math.max(0, e.flash - dt)));
  const r = s.run;
  if (!r) return;
  r.time += dt;
  r.finishing = r.time >= r.contract.duration;
  const beds = s.equipment.filter((e) => e.active);
  for (const h of beds) {
    if (!r.finishing || h.delivering) {
      noiseTick(s, h, dt);
      h.age += dt;
    }
    if (h.age >= 12 && !h.delivering && !r.finishing) {
      h.delivering = true;
      h.deliverRequested = r.time;
      h.nextDue = 0;
    }
  }
  // Request final deliveries at the stated deadline, then allow six seconds to settle jobs.
  if (r.finishing)
    for (const h of beds)
      if (!h.finalRequested) {
        h.finalRequested = true;
        if (!h.delivering) {
          h.delivering = true;
          h.deliverRequested = r.time;
          h.nextDue = 0;
        }
      }
  for (const l of s.equipment.filter((e) => e.type === "lantern")) {
    if (l.job) {
      l.job.left -= dt;
      if (l.job.left <= 0) {
        const h = beds.find((e) => e.id === l.job.habitat);
        if (h) {
          const cold = support(s, h).coolers.length > 0;
          let clue = syndrome(h.mask);
          if (random(s) < (cold ? 0.002 : 0.016)) {
            clue[Math.floor(random(s) * 2)] ^= 1;
            r.misreads++;
          }
          const before = [...h.mask];
          h.mask = recover(h.mask, clue);
          if (before.some((e, q) => e !== h.mask[q])) r.corrections++;
          if (random(s) < (cold ? 0.003 : 0.014))
            h.mask[Math.floor(random(s) * 3)] ^= 1;
          h.lastClue = clue;
          h.checkedAt = r.time;
          h.waiting = false;
          h.nextDue = r.time + RHYTHMS[h.rhythm];
          r.checks++;
          h.flash = 0.6;
          if (h.delivering) deliver(s, h);
        }
        l.job = null;
      }
    }
    if (!l.job) {
      const eligible = beds
        .filter(
          (h) =>
            !h.waiting &&
            r.time >= h.nextDue &&
            (!r.finishing || h.delivering) &&
            distance(l, h) <= EQUIPMENT.lantern.radius,
        )
        .sort(
          (a, b) =>
            Number(b.delivering) - Number(a.delivering) ||
            a.nextDue - b.nextDue ||
            a.id - b.id,
        );
      const h = eligible[0];
      if (h) {
        h.waiting = true;
        l.job = {
          habitat: h.id,
          left: 0.65 + distance(l, h) * 0.16,
          total: 0.65 + distance(l, h) * 0.16,
        };
      }
    }
  }
  for (const h of beds)
    if (h.delivering && r.time - h.deliverRequested >= 6 && !h.waiting)
      deliver(s, h);
  const queue = beds.filter(
    (h) => r.time >= h.nextDue && !h.waiting && (!r.finishing || h.delivering),
  ).length;
  r.waitingPeak = Math.max(r.waitingPeak, queue);
  if (
    r.finishing &&
    (beds.every((h) => !h.delivering && !h.waiting) ||
      r.time >= r.contract.duration + 6)
  )
    finishContract(s);
}
function finishContract(s) {
  const r = s.run;
  if (!r) return null;
  const ratio = r.safe / r.expected,
    success = ratio >= r.contract.target;
  const reward = success
    ? r.contract.reward
    : Math.max(15, Math.floor(r.safe * 4));
  s.coins += reward;
  const out = { ...r, ratio, success, reward, day: s.day };
  s.lastOutcome = out;
  s.history.unshift(out);
  s.history = s.history.slice(0, 12);
  s.equipment.forEach((e) => {
    e.active = false;
    e.waiting = false;
    e.finalRequested = false;
    if (e.type === "lantern") e.job = null;
  });
  if (success) {
    s.day = Math.min(s.day + 1, 3);
    s.completed++;
  }
  s.run = null;
  return out;
}
function setRhythm(s, id, value) {
  const h = s.equipment.find((e) => e.id === id && e.type === "habitat");
  if (!h || !RHYTHMS[value]) return false;
  h.rhythm = value;
  if (s.run) h.nextDue = s.run.time + RHYTHMS[value];
  return true;
}
function serialize(s) {
  const { effects, ...rest } = s;
  return JSON.stringify(rest);
}
function restore(raw) {
  try {
    const s = JSON.parse(raw);
    if (
      s.version !== 1 ||
      !Number.isInteger(s.coins) ||
      s.coins < 0 ||
      !Number.isInteger(s.day) ||
      s.day < 0 ||
      s.day > 3 ||
      !Number.isInteger(s.id) ||
      !Array.isArray(s.equipment) ||
      !Array.isArray(s.history) ||
      s.equipment.length > COLS * ROWS
    )
      return null;
    const cells = new Set(),
      ids = new Set();
    for (const e of s.equipment) {
      const cell = e.x + "," + e.y;
      if (
        !EQUIPMENT[e.type] ||
        !Number.isInteger(e.x) ||
        !Number.isInteger(e.y) ||
        blocked(e.x, e.y) ||
        cells.has(cell) ||
        !Number.isInteger(e.id) ||
        ids.has(e.id) ||
        !RHYTHMS[e.rhythm] ||
        !Array.isArray(e.mask) ||
        e.mask.length !== 3 ||
        e.mask.some((b) => b !== 0 && b !== 1)
      )
        return null;
      cells.add(cell);
      ids.add(e.id);
    }
    if (s.run) {
      if (
        !Number.isFinite(s.run.time) ||
        !Number.isFinite(s.run.expected) ||
        !s.run.contract ||
        !Array.isArray(s.run.records)
      )
        return null;
      for (const h of s.equipment.filter((e) => e.active))
        if (!Number.isFinite(h.age) || !Number.isFinite(h.nextDue)) return null;
    }
    s.effects = [];
    s.seed >>>= 0;
    return s;
  } catch {
    return null;
  }
}

const PALETTE = {
  grass: "#a5bc82",
  grass2: "#a9c188",
  edge: "#729469",
  shadow: "#48664d",
  cream: "#f6efd0",
  pink: "#e4a8a0",
  mint: "#9fcbab",
  peach: "#f0c69e",
  soil: "#b3a27b",
};
function hash(a, b = 0) {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
class GardenArt {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.t = 0;
    this.scale = 1;
    this.hover = null;
    this.hoverId = null;
    this.keyboard = null;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.resize();
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.width = Math.max(960, r.width);
    this.height = (this.width * r.height) / r.width;
    this.canvas.width = Math.round(this.width);
    this.canvas.height = Math.round(this.height);
    this.ctx.imageSmoothingEnabled = false;
    this.ox = this.width * 0.43;
    this.oy = this.height * 0.5 - 175;
  }
  tile(x, y) {
    return {
      x: Math.round(this.ox + (x - y) * 36),
      y: Math.round(this.oy + (x + y) * 18),
    };
  }
  inverse(px, py) {
    const r = this.canvas.getBoundingClientRect(),
      x = (px / r.width) * this.width - this.ox,
      y = (py / r.height) * this.height - this.oy;
    return {
      x: Math.floor((x / 36 + y / 18) / 2 + 0.5),
      y: Math.floor((y / 18 - x / 36) / 2 + 0.5),
    };
  }
  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      Math.round(x),
      Math.round(y),
      Math.round(w),
      Math.round(h),
    );
  }
  poly(points, color, stroke = null) {
    const c = this.ctx;
    c.beginPath();
    points.forEach(([x, y], i) =>
      i
        ? c.lineTo(Math.round(x), Math.round(y))
        : c.moveTo(Math.round(x), Math.round(y)),
    );
    c.closePath();
    c.fillStyle = color;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 1;
      c.stroke();
    }
  }
  line(x, y, a, b, color, width = 2) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(Math.round(x), Math.round(y));
    c.lineTo(Math.round(a), Math.round(b));
    c.strokeStyle = color;
    c.lineWidth = width;
    c.stroke();
  }
  ellipse(x, y, rx, ry, color) {
    const c = this.ctx;
    c.beginPath();
    c.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
  }
  text(str, x, y, size = 10, color = "#516949", align = "center") {
    const c = this.ctx;
    c.font = `${size}px monospace`;
    c.textAlign = align;
    c.fillStyle = color;
    c.fillText(str, Math.round(x), Math.round(y));
  }
  diamond(p, color, stroke = null) {
    this.poly(
      [
        [p.x, p.y - 18],
        [p.x + 36, p.y],
        [p.x, p.y + 18],
        [p.x - 36, p.y],
      ],
      color,
      stroke,
    );
  }
  flower(x, y, tint = "#e5b4a1", size = 1) {
    this.rect(x - 1, y, 2, 9 * size, "#6e9259");
    this.rect(x - 5, y + 4, 5, 2, "#7c9e68");
    this.rect(x - 4, y - 4, 9, 5, tint);
    this.rect(x - 2, y - 6, 5, 9, tint);
    this.rect(x - 1, y - 3, 3, 3, "#f8e3a0");
  }
  tuft(x, y, color = "#8ca870") {
    this.rect(x, y, 2, 4, color);
    this.rect(x - 3, y - 2, 2, 5, color);
    this.rect(x + 3, y - 1, 2, 4, color);
  }
  slime(x, y, color = "#9fcbab", phase = 0, size = 1, helper = false) {
    const bob = this.reduced ? 0 : Math.sin(this.t * 2.8 + phase) * 2,
      stretch = this.reduced ? 0 : Math.sin(this.t * 2.8 + phase) * 0.06;
    cSave(this.ctx, () => {
      this.ctx.translate(Math.round(x), Math.round(y + bob));
      this.ctx.scale(size * (1 - stretch), size * (1 + stretch));
      this.ellipse(0, 2, 13, 4, "#55725138");
      this.rect(-12, -11, 24, 11, "#4d725947");
      this.rect(-10, -18, 20, 16, color);
      this.rect(-13, -14, 26, 10, color);
      this.rect(-8, -21, 16, 3, color);
      this.rect(-5, -23, 10, 2, color);
      this.rect(-8, -18, 6, 3, "#eff9d984");
      this.rect(-6, -12, 2, 3, "#385344");
      this.rect(5, -12, 2, 3, "#385344");
      this.rect(-9, -8, 4, 2, "#e3a8a08a");
      this.rect(7, -8, 4, 2, "#e3a8a08a");
      this.rect(-1, -7, 3, 1, "#658667");
      if (helper) {
        this.rect(-7, -24, 14, 3, "#f6e8b6");
        this.rect(-2, -27, 4, 4, "#d4ab68");
      } else {
        this.rect(-1, -27, 2, 6, "#6c955e");
        this.rect(-6, -28, 5, 3, "#92b274");
        this.rect(1, -30, 5, 3, "#779e63");
      }
    });
  }
  tree(x, y, variant = 0) {
    this.ellipse(x, y + 4, 27, 10, "#4e704833");
    this.rect(x - 4, y - 36, 9, 37, "#957959");
    this.rect(x + 2, y - 28, 3, 25, "#b69a72");
    const green = variant ? "#75946a" : "#648968";
    this.rect(x - 20, y - 60, 42, 34, green);
    this.rect(x - 30, y - 53, 61, 22, green);
    this.rect(x - 14, y - 72, 28, 18, green);
    this.rect(x - 24, y - 51, 20, 5, "#8ead78");
    this.rect(x + 5, y - 64, 9, 5, "#8ead78");
    this.rect(x + 13, y - 43, 11, 5, "#87a872");
    this.rect(x - 10, y - 31, 13, 5, "#54785b");
    if (variant) {
      this.rect(x - 18, y - 58, 6, 6, "#e9ba8f");
      this.rect(x + 11, y - 39, 5, 5, "#e9ba8f");
    }
  }
  habitat(e) {
    const p = this.tile(e.x, e.y),
      active = e.active;
    this.ellipse(p.x, p.y + 6, 31, 12, "#617f4c2f");
    this.poly(
      [
        [p.x - 31, p.y - 6],
        [p.x, p.y - 21],
        [p.x + 31, p.y - 6],
        [p.x, p.y + 9],
      ],
      "#e9deb3",
      "#d1c491",
    );
    this.poly(
      [
        [p.x - 31, p.y - 6],
        [p.x, p.y + 9],
        [p.x, p.y + 15],
        [p.x - 31, p.y],
      ],
      "#c5b98b",
    );
    this.poly(
      [
        [p.x, p.y + 9],
        [p.x + 31, p.y - 6],
        [p.x + 31, p.y],
        [p.x, p.y + 15],
      ],
      "#d5c99b",
    );
    this.poly(
      [
        [p.x - 26, p.y - 7],
        [p.x, p.y - 19],
        [p.x + 26, p.y - 7],
        [p.x, p.y + 5],
      ],
      "#becb91",
    );
    for (const [dx, dy] of [
      [-26, -9],
      [26, -9],
      [-1, 7],
    ]) {
      this.rect(p.x + dx - 2, p.y + dy - 21, 4, 22, "#b8ac84");
      this.rect(p.x + dx - 3, p.y + dy - 21, 6, 3, "#f0e4bd");
    }
    this.line(p.x - 27, p.y - 21, p.x, p.y - 35, "#d1c492", 2);
    this.line(p.x, p.y - 35, p.x + 27, p.y - 21, "#d1c492", 2);
    if (active) {
      this.ellipse(p.x, p.y - 11, 19, 6, "#e5edbc33");
      this.line(p.x - 14, p.y - 6, p.x, p.y - 17, "#f5f0c0", 1);
      this.line(p.x, p.y - 17, p.x + 15, p.y - 6, "#f5f0c0", 1);
    }
    this.slime(p.x, p.y - 17, "#b9d9a3", e.id, 0.85);
    this.slime(p.x - 17, p.y - 3, "#a3c8af", e.id + 2, 0.85);
    this.slime(p.x + 17, p.y - 3, "#e7b4a2", e.id + 4, 0.85);
    this.rect(p.x - 9, p.y + 14, 18, 8, "#f5e8c5");
    this.rect(p.x - 5, p.y + 16, 2, 3, "#8aa36e");
    this.rect(p.x, p.y + 16, 2, 3, "#8aa36e");
    this.rect(p.x + 5, p.y + 16, 2, 3, "#8aa36e");
  }
  lantern(e, s) {
    const p = this.tile(e.x, e.y);
    this.ellipse(p.x, p.y + 4, 25, 9, "#48664d30");
    this.poly(
      [
        [p.x - 22, p.y - 5],
        [p.x, p.y - 17],
        [p.x + 22, p.y - 5],
        [p.x, p.y + 6],
      ],
      "#d6c394",
    );
    this.rect(p.x - 3, p.y - 48, 6, 45, "#8b8060");
    this.rect(p.x - 6, p.y - 5, 12, 7, "#a89b71");
    this.rect(p.x - 13, p.y - 50, 26, 4, "#8ca06b");
    this.rect(p.x - 10, p.y - 46, 20, 23, "#f1dfa0");
    this.rect(p.x - 7, p.y - 43, 14, 16, "#fff3ba");
    this.rect(p.x - 13, p.y - 25, 26, 4, "#b4a475");
    this.poly(
      [
        [p.x - 16, p.y - 50],
        [p.x, p.y - 61],
        [p.x + 16, p.y - 50],
      ],
      "#83a273",
    );
    this.rect(p.x - 2, p.y - 65, 4, 5, "#a8bc87");
    if (!this.reduced)
      this.ellipse(
        p.x,
        p.y - 35,
        13 + Math.sin(this.t * 2) * 2,
        17,
        "#f8e5aa25",
      );
    this.slime(p.x - 14, p.y, "#e9cc8d", e.id, 0.55, true);
    this.slime(p.x + 14, p.y, "#f1dca3", e.id + 3, 0.55, true);
    if (e.job) {
      const h = s.equipment.find((a) => a.id === e.job.habitat);
      if (h) {
        const q = this.tile(h.x, h.y),
          f = 1 - e.job.left / e.job.total;
        this.ctx.setLineDash([3, 4]);
        this.line(p.x, p.y - 34, q.x, q.y - 17, "#e9d38ac0", 2);
        this.ctx.setLineDash([]);
        this.ellipse(
          p.x + (q.x - p.x) * f,
          p.y - 34 + (q.y - p.y + 17) * f,
          3,
          3,
          "#fff8dc",
        );
      }
      this.rect(p.x - 12, p.y + 9, 24, 3, "#71855c");
      this.rect(
        p.x - 12,
        p.y + 9,
        24 * (1 - e.job.left / e.job.total),
        3,
        "#f1dca0",
      );
    }
  }
  cooler(e) {
    const p = this.tile(e.x, e.y);
    this.ellipse(p.x, p.y + 5, 24, 8, "#48664d25");
    this.poly(
      [
        [p.x - 23, p.y - 7],
        [p.x, p.y - 19],
        [p.x + 23, p.y - 7],
        [p.x, p.y + 5],
      ],
      "#dbe6c4",
    );
    this.poly(
      [
        [p.x - 23, p.y - 7],
        [p.x, p.y + 5],
        [p.x, p.y + 12],
        [p.x - 23, p.y],
      ],
      "#a2bbb0",
    );
    this.poly(
      [
        [p.x, p.y + 5],
        [p.x + 23, p.y - 7],
        [p.x + 23, p.y],
        [p.x, p.y + 12],
      ],
      "#bad0bb",
    );
    this.ellipse(p.x, p.y - 7, 17, 8, "#82b8b2");
    this.ellipse(p.x, p.y - 7, 12, 5, "#a4d1c2");
    this.rect(p.x - 3, p.y - 35, 6, 27, "#7d9b88");
    this.rect(p.x - 6, p.y - 39, 12, 6, "#d4e4cd");
    this.rect(p.x - 13, p.y - 36, 8, 3, "#bacfb3");
    this.rect(p.x + 5, p.y - 36, 8, 3, "#bacfb3");
    this.rect(p.x - 2, p.y - 46, 4, 6, "#c3d8bf");
    for (let n = 0; n < 3; n++) {
      const a = this.reduced ? n * 0.9 : (this.t * 0.7 + n * 0.9) % 2.8;
      this.rect(p.x - 11 + n * 11, p.y - 15 - a * 10, 2, 3, "#ecf6dc99");
    }
  }
  flowerPatch(e) {
    const p = this.tile(e.x, e.y);
    this.ellipse(p.x, p.y + 2, 23, 8, "#92aa72");
    for (let n = 0; n < 7; n++)
      this.flower(
        p.x + (hash(e.id, n) - 0.5) * 36,
        p.y + (hash(n, e.id) - 0.5) * 12,
        ["#e6b0a2", "#f0dd9b", "#c6bdd5"][n % 3],
      );
  }
  render(s, tool, hover, selected, t) {
    this.t = t;
    const c = this.ctx,
      w = this.width,
      h = this.height;
    c.clearRect(0, 0, w, h);
    this.rect(0, 0, w, h, "#b9ca93");
    // Gentle patterned meadow beyond the garden.
    for (let i = 0; i < 130; i++) {
      const x = hash(i, 1) * w,
        y = hash(i, 2) * h;
      if (y > 85 && y < h - 100) {
        if (i % 9 === 0) this.flower(x, y, "#e7c4a4", 0.6);
        else this.tuft(x, y, "#adbf87");
      }
    }
    const corners = [
      this.tile(-1, -1),
      this.tile(COLS, -1),
      this.tile(COLS, ROWS),
      this.tile(-1, ROWS),
    ];
    this.poly(
      corners.map((p) => [p.x, p.y + 18]),
      "#809b70",
    );
    this.poly(
      corners.map((p) => [p.x, p.y + 8]),
      "#94ae78",
    );
    this.poly(
      corners.map((p) => [p.x, p.y]),
      "#a4bd83",
    );
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const p = this.tile(x, y);
        this.diamond(p, hash(x, y) > 0.5 ? "#a9bf85" : "#a5bc81");
        if (!blocked(x, y) && hash(x + 21, y) > 0.65)
          this.tuft(p.x - 16, p.y + 4, "#98b279");
        if (hash(y + 12, x) > 0.85)
          this.flower(p.x + 15, p.y - 1, "#e8c8a4", 0.6);
        if (tool !== "inspect" && !blocked(x, y)) {
          c.globalAlpha = 0.28;
          this.diamond(p, "#a7bd83", "#758f65");
          c.globalAlpha = 1;
        }
      }
    // Pebble walkway, pond, and wooden garden gate.
    for (let x = 3; x < COLS; x++) {
      const p = this.tile(x, 7);
      this.diamond(p, "#c4bd90");
      for (let i = 0; i < 3; i++)
        this.ellipse(p.x - 15 + i * 14, p.y - 3 + (i % 2) * 5, 7, 3, "#dcd5ac");
    }
    for (let y = 2; y < 7; y++) {
      const p = this.tile(3, y);
      this.diamond(p, "#c4bd90");
      this.ellipse(p.x, p.y, 12, 5, "#dcd5ac");
    }
    const pond = this.tile(1, 1);
    this.ellipse(pond.x, pond.y + 5, 100, 46, "#879f75");
    this.ellipse(pond.x, pond.y, 94, 42, "#9cbbae");
    this.ellipse(pond.x, pond.y - 2, 83, 34, "#8ab5ad");
    this.ellipse(pond.x, pond.y - 8, 65, 22, "#9bc5b6");
    for (let i = 0; i < 6; i++) {
      this.rect(
        pond.x - 56 + i * 19,
        pond.y + Math.sin(i * 2) * 18,
        12,
        2,
        "#b9dac6",
      );
    }
    this.ellipse(pond.x + 36, pond.y + 8, 12, 5, "#7f9c69");
    this.flower(pond.x + 37, pond.y + 7, "#e7b8b0");
    this.ellipse(pond.x - 40, pond.y - 16, 9, 4, "#829f6b");
    this.rect(pond.x - 60, pond.y + 29, 14, 6, "#c4c8a0");
    this.rect(pond.x + 60, pond.y + 20, 12, 8, "#d3d1ad");
    for (let y = 3; y < 8; y++) {
      const p = this.tile(-0.65, y);
      this.rect(p.x - 3, p.y - 16, 6, 19, "#a59a75");
      this.rect(p.x - 4, p.y - 17, 8, 3, "#e1d4aa");
      if (y < 7) {
        const a = this.tile(-0.65, y + 1);
        this.line(p.x, p.y - 10, a.x, a.y - 10, "#c9bc90", 3);
      }
    }
    const gate = this.tile(3, 8.6);
    this.rect(gate.x - 22, gate.y - 40, 5, 40, "#b4a37b");
    this.rect(gate.x + 18, gate.y - 40, 5, 40, "#b4a37b");
    this.rect(gate.x - 22, gate.y - 40, 45, 5, "#d8c799");
    this.rect(gate.x - 16, gate.y - 35, 32, 13, "#f3e7bc");
    this.text("ION", gate.x, gate.y - 26, 8, "#829566");
    const trees = [
      [-0.4, 0, 0],
      [3, -0.6, 1],
      [6, -0.8, 0],
      [9, -0.65, 1],
      [11.8, 1, 0],
      [12, 4, 1],
      [-0.8, 5, 1],
      [-0.5, 8, 0],
      [8, 8.8, 1],
      [11, 8.7, 0],
    ];
    const objects = [
      ...s.equipment.map((e) => ({ depth: e.x + e.y, e })),
      ...trees.map(([x, y, v]) => ({ depth: x + y, tree: [x, y, v] })),
    ].sort((a, b) => a.depth - b.depth);
    // Range is a drawing of service reach, not quantum entanglement geometry.
    const item = s.equipment.find((e) => e.id === selected),
      target = hover && tool !== "inspect" ? { type: tool, ...hover } : item;
    if (target && EQUIPMENT[target.type]?.radius) {
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++)
          if (
            !blocked(x, y) &&
            distance(target, { x, y }) <= EQUIPMENT[target.type].radius
          ) {
            c.globalAlpha = 0.18;
            this.diamond(
              this.tile(x, y),
              target.type === "cooler" ? "#d9f2eb" : "#fbf0bd",
              "#fdf9d7",
            );
            c.globalAlpha = 1;
          }
    }
    if (hover && !blocked(hover.x, hover.y)) {
      const p = this.tile(hover.x, hover.y);
      this.diamond(
        p,
        tool === "inspect"
          ? "#c5d2a280"
          : s.equipment.some((e) => e.x === hover.x && e.y === hover.y)
            ? "#e0a6a580"
            : "#f4edc480",
        "#f8f1d5",
      );
    }
    for (const o of objects) {
      if (o.tree) {
        const [x, y, v] = o.tree,
          p = this.tile(x, y);
        this.tree(p.x, p.y, v);
        continue;
      }
      const e = o.e,
        p = this.tile(e.x, e.y);
      if (e.id === selected) {
        c.globalAlpha = 0.5;
        this.diamond(p, "#fff4bc", "#fff9df");
        c.globalAlpha = 1;
      }
      if (e.type === "habitat") this.habitat(e);
      if (e.type === "lantern") this.lantern(e, s);
      if (e.type === "cooler") this.cooler(e);
      if (e.type === "flower") this.flowerPatch(e);
      if (e.type === "habitat" && e.active && s.run) {
        const due = s.run.time - e.nextDue;
        if (due > 1.5) {
          this.rect(p.x - 4, p.y - 49, 9, 10, "#f1dfac");
          this.text("…", p.x + 1, p.y - 42, 8, "#ae825f");
        }
        if (e.lastClue && s.run.time - e.checkedAt < 1.2)
          this.text(e.lastClue.join(""), p.x, p.y - 46, 9, "#6c8053");
      }
    }
    if (
      hover &&
      tool !== "inspect" &&
      EQUIPMENT[tool] &&
      !blocked(hover.x, hover.y) &&
      !s.equipment.some((e) => e.x === hover.x && e.y === hover.y)
    ) {
      c.globalAlpha = 0.5;
      const e = { ...hover, id: 0, type: tool };
      if (tool === "habitat") this.habitat(e);
      if (tool === "lantern") this.lantern(e, s);
      if (tool === "cooler") this.cooler(e);
      if (tool === "flower") this.flowerPatch(e);
      c.globalAlpha = 1;
    }
    for (const e of s.effects) {
      const p = this.tile(e.x, e.y),
        a = e.age;
      c.globalAlpha = Math.max(0, 1 - a / 2);
      if (e.kind === "plant") {
        for (let k = 0; k < 5; k++)
          this.rect(
            p.x + Math.cos(k * 1.3) * a * 18,
            p.y - 15 + Math.sin(k * 1.3) * a * 12 - a * 15,
            3,
            3,
            "#f8edbd",
          );
      } else {
        const x = p.x + a * 55,
          y = p.y - 25 - a * 45;
        this.rect(
          x - 9,
          y - 7,
          18,
          13,
          e.kind === "parcel" ? "#fbefd0" : "#c6c9b0",
        );
        this.line(x - 9, y - 7, x, y, "#b9a477", 1);
        this.line(x, y, x + 9, y - 7, "#b9a477", 1);
        this.rect(
          x - 2,
          y - 2,
          4,
          4,
          e.kind === "parcel" ? "#91aa72" : "#929e88",
        );
      }
      c.globalAlpha = 1;
    }
    if (!s.run) {
      const p = this.tile(7, 5);
      this.text("A place for precious things.", p.x, p.y + 76, 10, "#6e8859");
    }
    if (!this.reduced)
      for (let i = 0; i < 5; i++) {
        const x = this.ox + Math.sin(t * 0.3 + i * 7) * 240,
          y = this.oy + 160 + Math.cos(t * 0.4 + i * 9) * 130;
        this.rect(x, y, 3, 3, "#f6efbf88");
      }
  }
}
function cSave(ctx, fn) {
  ctx.save();
  fn();
  ctx.restore();
}

const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)],
  KEY = "ion-garden.v1";
let state;
try {
  state = restore(localStorage.getItem(KEY)) || createGarden();
} catch {
  state = createGarden();
}
let tool = "inspect",
  selected = null,
  hover = null,
  paused = !!state.run,
  speed = 1,
  last = performance.now(),
  clock = 0,
  saveClock = 0,
  hudClock = 0,
  toastTimer,
  sound = false,
  audio = null,
  started = false,
  bridgeReady = false;
const art = new GardenArt($("#garden"));
function save() {
  try {
    localStorage.setItem(KEY, serialize(state));
  } catch {}
}
function toast(message) {
  $("#toast").hidden = false;
  $("#toast").textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").hidden = true), 3500);
}
function beep(f = 500) {
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    audio.resume();
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.035, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.2);
  } catch {}
}
function setTool(value) {
  tool = value;
  selected = null;
  $("#inspector").hidden = true;
  $$("[data-tool]").forEach((b) => {
    b.classList.toggle("selected", b.dataset.tool === tool);
    b.setAttribute("aria-pressed", String(b.dataset.tool === tool));
  });
  $("#garden").style.cursor = tool === "inspect" ? "default" : "crosshair";
  if (tool !== "inspect")
    $("#hint-copy").textContent = EQUIPMENT[tool].description;
  else updateHint();
}
function updateHint() {
  const c = contractFor(state),
    beds = state.equipment.filter((e) => e.type === "habitat");
  if (state.run) {
    const pending = beds.filter(
      (e) => e.active && state.run.time - e.nextDue > 1.5,
    );
    $("#hint-copy").textContent = state.run.finishing
      ? "Last parcels are settling. Give your helpers a moment."
      : pending.length
        ? "Helpers have a queue. Add another lantern, or use balanced care."
        : state.day >= 2 && state.run.time > c.duration * 0.5
          ? "Summer air is restless. Dew coolers help your equipment stay reliable."
          : "Your garden is caring for its memories. You can plant more equipment while it works.";
  } else if (beds.some((e) => !support(state, e).lanterns.length))
    $("#hint-copy").textContent =
      "Plant a helper lantern beside each habitat. The pale circle shows its reach.";
  else if (beds.length < c.habitats)
    $("#hint-copy").textContent =
      `A new letter needs ${c.habitats} habitats. Plant another little home.`;
  else if (!state.equipment.some((e) => e.type === "cooler"))
    $("#hint-copy").textContent =
      "A dew cooler makes nearby equipment more reliable. Or accept your letter now.";
  else
    $("#hint-copy").textContent =
      "Your garden is ready. Accept the letter when you feel settled.";
}
function showInspector(id) {
  selected = id;
  tool = "inspect";
  $$("[data-tool]").forEach((b) => {
    b.classList.toggle("selected", b.dataset.tool === tool);
    b.setAttribute("aria-pressed", String(b.dataset.tool === tool));
  });
  $("#garden").style.cursor = "default";
  const e = state.equipment.find((e) => e.id === id);
  if (!e) return;
  $("#inspector").hidden = false;
  $("#inspect-kind").textContent =
    e.type === "habitat" ? "MEMORY HABITAT" : e.type.toUpperCase();
  $("#inspect-name").textContent = e.name;
  $("#inspect-desc").textContent = EQUIPMENT[e.type].description;
  $("#habitat-controls").hidden = e.type !== "habitat";
  $("#policy").value = e.rhythm;
  updateInspector();
}
function updateInspector() {
  const e = state.equipment.find((e) => e.id === selected);
  if (!e) {
    $("#inspector").hidden = true;
    return;
  }
  $("#sell").textContent =
    `Pack away · +${Math.floor(EQUIPMENT[e.type].cost * 0.8)} seeds`;
  $("#sell").disabled = !!(state.run && (e.active || e.job));
  if (e.type === "habitat") {
    const a = support(state, e);
    $("#inspect-syndrome").textContent = e.lastClue
      ? e.lastClue.join(" · ")
      : "Not checked";
    $("#inspect-support").textContent =
      `${a.lanterns.length} / ${a.coolers.length ? "cooled" : "none"}`;
  }
}
function hud() {
  const c = contractFor(state),
    r = state.run;
  $("#coins").textContent = state.coins;
  $("#day-label").textContent = c.name.toUpperCase();
  $("#day-count").textContent =
    `Day ${String(state.completed + 1).padStart(2, "0")}`;
  $("#contract-title").textContent = c.title;
  $("#contract-copy").textContent = c.copy;
  $("#contract-count").textContent =
    c.habitats + " habitat" + (c.habitats > 1 ? "s" : "");
  $("#contract-time").textContent = r
    ? r.finishing
      ? "Settling parcels…"
      : Math.max(0, Math.ceil(c.duration - r.time)) + "s remaining"
    : c.duration + " seconds";
  $("#contract-progress").style.width = r
    ? Math.min(100, (r.time / c.duration) * 100) + "%"
    : "0%";
  $("#delivery-count").textContent = r
    ? `${r.safe} safely home / ${r.delivered} sent`
    : canStart(state) || "Ready when you are";
  $("#reward").textContent = `+${c.reward} seeds`;
  $("#start-contract").disabled = !!r || !!canStart(state);
  $("#start-contract").innerHTML = r
    ? "Caring for memories…"
    : `Accept & begin <span>↗</span>`;
  $("#status-note").textContent = r
    ? `${paused ? "Ⅱ Paused" : "✦ Caring"} · ${r.checks} helper checks · ${Math.round(c.target * 100)}% safe needed`
    : "☀ Plan your little garden";
  $("#pause").textContent = paused ? "▶" : "II";
  $("#pause").setAttribute(
    "aria-label",
    paused ? "Resume garden" : "Pause garden",
  );
  $("#paused-overlay").hidden = !paused || !r;
  $("#speed").textContent = speed + "×";
  updateInspector();
  if (tool === "inspect") updateHint();
}
function clickTile(tile) {
  if (!tile) return;
  if (tool === "inspect") {
    const e = state.equipment.find((e) => e.x === tile.x && e.y === tile.y);
    if (e) showInspector(e.id);
    else {
      selected = null;
      $("#inspector").hidden = true;
    }
  } else {
    const error = place(state, tool, tile.x, tile.y);
    if (error) toast(error);
    else {
      beep(tool === "flower" ? 750 : 450);
      save();
    }
  }
  hud();
}
function pointer(e) {
  const r = $("#garden").getBoundingClientRect(),
    px = ((e.clientX - r.left) / r.width) * art.width,
    py = ((e.clientY - r.top) / r.height) * art.height;
  if (tool === "inspect") {
    const hit = [...state.equipment]
      .sort((a, b) => b.x + b.y - a.x - a.y)
      .find((item) => {
        const p = art.tile(item.x, item.y);
        return (
          Math.abs(px - p.x) < 29 &&
          py >= p.y - (item.type === "lantern" ? 64 : 40) &&
          py <= p.y + 14
        );
      });
    if (hit) return { x: hit.x, y: hit.y };
  }
  return art.inverse(e.clientX - r.left, e.clientY - r.top);
}
$("#garden").addEventListener("pointermove", (e) => (hover = pointer(e)));
$("#garden").addEventListener("pointerleave", () => (hover = null));
$("#garden").addEventListener("pointerdown", (e) => {
  hover = pointer(e);
  clickTile(hover);
  $("#garden").focus({ preventScroll: true });
});
$$("[data-tool]").forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
$("#close-inspector").onclick = () => {
  selected = null;
  $("#inspector").hidden = true;
};
$("#policy").onchange = (e) => {
  setRhythm(state, selected, e.target.value);
  save();
  hud();
};
$("#sell").onclick = () => {
  const result = sell(state, selected);
  if (result < 0) toast("Finish the letter before packing this away.");
  else {
    selected = null;
    $("#inspector").hidden = true;
    beep(350);
    save();
    hud();
  }
};
function showOutcome() {
  const o = state.lastOutcome;
  $("#result-kicker").textContent = o.success
    ? "A LETTER DELIVERED"
    : "A LITTLE MORE CARE";
  $("#result-art").textContent = o.success ? "✿" : "❧";
  $("#result-title").innerHTML = o.success
    ? o.day === 3
      ? "The village glows.<br><em>Your garden did that.</em>"
      : "Precious things,<br><em>safely home.</em>"
    : "Every garden<br><em>takes practice.</em>";
  $("#result-copy").textContent = o.success
    ? o.day === 3
      ? "You’ve completed the four garden letters. Keep tending your garden and take another festival contract whenever you like."
      : "Your neighbors sent seeds and a new letter. Give your garden a little room to grow."
    : `This letter needed ${Math.round(o.contract.target * 100)}% safe deliveries. Try adding cooling, reducing queues, or using balanced care. You still earned seeds for your work.`;
  $("#result-memories").textContent = `${o.safe} / ${o.expected}`;
  $("#result-seeds").textContent = "+" + o.reward;
  $("#result-science").textContent =
    `Helpers performed ${o.checks} checks and ${o.corrections} correction actions. ${o.misreads} checks had a simulated readout error. Each delivered memory was compared with six reference quantum states. A logical bit flip scores 1/3 average fidelity and counts as a damaged delivery. Two bit flips can mimic one and mislead recovery. Largest helper queue: ${o.waitingPeak}. The three-qubit code here does not correct phase errors.`;
  $("#result").showModal();
  beep(o.success ? 740 : 330);
  save();
  hud();
}
$("#start-contract").onclick = async () => {
  if (bridgeReady === false && window.ionGardenPrepare) {
    $("#start-contract").disabled = true;
    $("#start-contract").textContent = "Waking the helpers…";
    try {
      await window.ionGardenPrepare();
      bridgeReady = true;
    } catch (e) {
      toast("Qollab preparation failed: " + String(e));
      hud();
      return;
    }
  }
  const error = beginContract(state);
  if (error) toast(error);
  else {
    paused = false;
    $("#retry-contract").hidden = true;
    beep(600);
    save();
    hud();
  }
};
$("#continue").onclick = () => {
  $("#result").close();
  state.lastOutcome = null;
  save();
  hud();
};
$("#retry-contract").onclick = () => $("#start-contract").click();
$("#pause").onclick = async () => {
  if (paused && state.run && !bridgeReady && window.ionGardenPrepare) {
    try {
      await window.ionGardenPrepare();
      bridgeReady = true;
    } catch (e) {
      toast("Qollab preparation failed: " + String(e));
      return;
    }
  }
  paused = !paused;
  hud();
};
$("#speed").onclick = () => {
  speed = speed === 1 ? 2 : 1;
  hud();
};
$("#sound").onclick = () => {
  sound = !sound;
  $("#sound").style.background = sound ? "#dde8bf" : "";
  $("#sound").setAttribute(
    "aria-label",
    sound ? "Disable garden sound" : "Enable garden sound",
  );
  beep();
};
function pauseModal(dialog) {
  dialog.dataset.wasPaused = String(paused);
  paused = true;
  dialog.showModal();
  hud();
}
$("#guide").onclick = () => pauseModal($("#field-guide"));
$("#close-guide").onclick = () => $("#field-guide").close();
$("#field-guide").addEventListener("close", () => {
  paused = $("#field-guide").dataset.wasPaused === "true";
  hud();
});
$("#new-garden").onclick = () => pauseModal($("#reset-dialog"));
$("#cancel-reset").onclick = () => $("#reset-dialog").close();
$("#reset-dialog").addEventListener("close", () => {
  paused = $("#reset-dialog").dataset.wasPaused === "true";
  hud();
});
$("#confirm-reset").onclick = () => {
  state = createGarden();
  selected = null;
  setTool("inspect");
  $("#reset-dialog").dataset.wasPaused = "false";
  $("#reset-dialog").close();
  save();
  hud();
};
function download(name, text, type = "text/plain") {
  const a = document.createElement("a"),
    url = URL.createObjectURL(new Blob([text], { type }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#export-log").onclick = () =>
  download(
    "ion-garden-report.json",
    JSON.stringify(
      {
        game: "Ion Garden",
        model:
          "Repeated stochastic X errors; three-qubit repetition code; simulated noisy checks; six-state diagnostics",
        history: state.history,
        layout: state.equipment.map(({ id, type, x, y, rhythm }) => ({
          id,
          type,
          x,
          y,
          rhythm,
        })),
      },
      null,
      2,
    ),
    "application/json",
  );
$("#export-qiskit").onclick = () =>
  download("ion_garden_kernel.py", qiskitSource());
$("#begin").onclick = () => {
  $("#welcome").close();
  started = true;
  save();
  hud();
};
document.addEventListener("keydown", (e) => {
  if (
    document.querySelector("dialog[open]") ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)
  )
    return;
  if (["1", "2", "3", "4", "5"].includes(e.key))
    setTool(["inspect", "habitat", "lantern", "cooler", "flower"][+e.key - 1]);
  if (e.key === "Escape") setTool("inspect");
  if (e.key === " ") {
    e.preventDefault();
    paused = !paused;
    hud();
  }
  if (e.key.toLowerCase() === "b") $("#guide").click();
  if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].includes(
      e.key,
    ) &&
    e.target === $("#garden")
  ) {
    e.preventDefault();
    if (
      !hover ||
      hover.x < 0 ||
      hover.x >= COLS ||
      hover.y < 0 ||
      hover.y >= ROWS
    )
      hover = { x: 5, y: 4 };
    if (e.key === "ArrowLeft") hover.x--;
    if (e.key === "ArrowRight") hover.x++;
    if (e.key === "ArrowUp") hover.y--;
    if (e.key === "ArrowDown") hover.y++;
    hover.x = Math.max(0, Math.min(COLS - 1, hover.x));
    hover.y = Math.max(0, Math.min(ROWS - 1, hover.y));
    if (e.key === "Enter") clickTile(hover);
  }
});
window.addEventListener("resize", () => art.resize());
window.addEventListener("pagehide", save);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    paused = true;
    save();
    hud();
  }
  last = performance.now();
});
function frame(now) {
  const realDt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  clock += realDt;
  const modal = !!document.querySelector("dialog[open]");
  if (
    started &&
    !paused &&
    !modal &&
    (!state.run || bridgeReady || !window.ionGardenPrepare)
  ) {
    let dt = realDt * speed;
    while (dt > 0) {
      const amount = Math.min(0.05, dt),
        hadRun = !!state.run;
      step(state, amount);
      dt -= amount;
      if (hadRun && !state.run) {
        showOutcome();
        break;
      }
    }
  }
  saveClock += realDt;
  hudClock += realDt;
  if (saveClock > 3) {
    save();
    saveClock = 0;
  }
  if (hudClock > 0.15) {
    hud();
    hudClock = 0;
  }
  art.render(state, tool, hover, selected, clock);
  requestAnimationFrame(frame);
}
// A small inspection surface for browser QA and the optional Qollab adapter.
window.ionGarden = {
  get state() {
    return state;
  },
  tile: (x, y) => art.tile(x, y),
  get dimensions() {
    return { width: art.width, height: art.height };
  },
  setTool,
  step: (dt) => {
    const hadRun = !!state.run;
    step(state, dt);
    if (hadRun && !state.run) showOutcome();
    hud();
  },
  start: () => {
    const e = beginContract(state);
    hud();
    return e;
  },
  export: () => serialize(state),
};
hud();
requestAnimationFrame(frame);
if (state.lastOutcome) {
  started = true;
  showOutcome();
} else if (state.equipment.length === 1 && state.day === 0 && !state.run) {
  $("#welcome").showModal();
} else started = true;

// One selected-simulator submission attempt per Qollab project run.
let qollabAttempted=false;
window.ionGardenPrepare=async()=>{
 if(qollabAttempted)throw Error('Rerun the Qollab project before trying again.');
 qollabAttempted=true;
 const raw=await gardenQuantum.run_json.callPromising(backend);
 const data=JSON.parse(typeof raw==='string'?raw:raw.toJs());
 installRecoveryKernel(data.kernel);
 document.querySelector('#runtime-note').textContent='Qiskit recovery kernel active in gameplay. Selected simulator sampled '+data.shots+' shots of the single-error recovery circuit. Those counts are separate from game delivery diagnostics.';
};
document.querySelector('#runtime-note').textContent='Qollab version: the first contract loads its recovery rules from Qiskit and submits one free-simulator job. Progress may be session-only.';
