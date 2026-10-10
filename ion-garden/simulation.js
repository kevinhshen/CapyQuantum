import { syndrome, recover, memoryFidelity } from "./quantum.js";
export const COLS = 12,
  ROWS = 9;
export const EQUIPMENT = {
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
export const RHYTHMS = { balanced: 2.5, frequent: 1, gentle: 5 };
export const CONTRACTS = [
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
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const blocked = (x, y) =>
  x < 0 ||
  x >= COLS ||
  y < 0 ||
  y >= ROWS ||
  (x < 3 && y < 3) ||
  (x === 0 && y > 6) ||
  (x > 9 && y === 0);
export function createGarden(seed = 48123) {
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
export function random(s) {
  s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
export function place(s, type, x, y) {
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
export function sell(s, id) {
  const e = s.equipment.find((e) => e.id === id);
  if (!e) return 0;
  if (s.run && (e.active || e.job)) return -1;
  s.equipment = s.equipment.filter((e) => e.id !== id);
  const refund = Math.floor(EQUIPMENT[e.type].cost * 0.8);
  s.coins += refund;
  return refund;
}
export function support(s, h) {
  return {
    lanterns: s.equipment.filter(
      (e) => e.type === "lantern" && distance(e, h) <= EQUIPMENT.lantern.radius,
    ),
    coolers: s.equipment.filter(
      (e) => e.type === "cooler" && distance(e, h) <= EQUIPMENT.cooler.radius,
    ),
  };
}
export function contractFor(s) {
  return CONTRACTS[Math.min(s.day, CONTRACTS.length - 1)];
}
export function canStart(s) {
  const c = contractFor(s),
    h = s.equipment.filter((e) => e.type === "habitat");
  if (s.run) return "A contract is already underway.";
  if (h.length < c.habitats)
    return `Plant ${c.habitats - h.length} more habitat${c.habitats - h.length === 1 ? "" : "s"} for this letter.`;
  if (h.some((e) => !support(s, e).lanterns.length))
    return "Every habitat needs a helper lantern within reach.";
  return null;
}
export function beginContract(s) {
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
export function step(s, dt) {
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
export function finishContract(s) {
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
export function setRhythm(s, id, value) {
  const h = s.equipment.find((e) => e.id === id && e.type === "habitat");
  if (!h || !RHYTHMS[value]) return false;
  h.rhythm = value;
  if (s.run) h.nextDue = s.run.time + RHYTHMS[value];
  return true;
}
export function serialize(s) {
  const { effects, ...rest } = s;
  return JSON.stringify(rest);
}
export function restore(raw) {
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
