import { COLS, ROWS, EQUIPMENT, blocked, distance } from "./simulation.js";
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
export class GardenArt {
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
