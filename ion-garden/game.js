import { GardenArt } from "./art.js";
import {
  createGarden,
  restore,
  serialize,
  place,
  sell,
  support,
  step,
  contractFor,
  canStart,
  beginContract,
  setRhythm,
  EQUIPMENT,
  COLS,
  ROWS,
} from "./simulation.js";
import { qiskitSource } from "./quantum.js";
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
