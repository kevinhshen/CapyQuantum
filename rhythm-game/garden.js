// Original wireframe field. Decorative terrain is schematic, not quantum data.
// Keep the renderer API stable for the rhythm/feedback loop and standalone build.
export class TempoGarden {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.particles = []; this.blooms = 0; this.palette = 0; this.cheer = 0;
    this.ambientTime = 0;
    this.scenery = document.createElement('canvas'); this.sceneryKey = ''; this.resize();
  }
  resize() {
    const r = this.canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 2);
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.canvas.width = this.w * ratio; this.canvas.height = this.h * ratio;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0); this.sceneryKey = '';
  }
  celebrate(reduced = false) {
    this.cheer = reduced ? 0 : .6; this.blooms = Math.min(45, this.blooms + 3);
    if (!reduced) this.burst(this.w * .17, this.h * .68, 0);
  }
  burst(x, y, lane) {
    for (let i = 0; i < 7 && this.particles.length < 42; i++) {
      const angle = i / 7 * Math.PI * 2;
      this.particles.push({ x, y, vx: Math.cos(angle) * 55, vy: Math.sin(angle) * 55, life: .65, lane });
    }
  }
  drawScenery(c) {
    const w = this.w, h = this.h;
    c.fillStyle = '#070b12'; c.fillRect(0, 0, w, h);
    const glow = c.createRadialGradient(w * .24, h * .44, 0, w * .24, h * .44, w * .6);
    glow.addColorStop(0, '#17263465'); glow.addColorStop(1, '#070b1200');
    c.fillStyle = glow; c.fillRect(0, 0, w, h);
    c.lineWidth = .6; c.strokeStyle = '#b1cbde0d'; c.beginPath();
    for (let x = w * .04; x < w; x += w * .225) { c.moveTo(x, 0); c.lineTo(x, h); }
    for (let y = h * .12; y < h; y += h * .25) { c.moveTo(0, y); c.lineTo(w, y); } c.stroke();
    // A low-contrast perspective mesh leaves foreground text and checks clear.
    const point = (x, depth) => {
      const perspective = .13 + depth ** 1.8 * 1.35;
      const wave = Math.sin(x * .42 + depth * 8) * Math.cos(x * .17 - depth * 5);
      return [w / 2 + x / 22 * w * perspective, h * .63 + depth ** 1.6 * h * .52 + wave * 17 * (1 - depth)];
    };
    c.strokeStyle = '#89a9c31c'; c.lineWidth = .6;
    for (let row = 0; row <= 22; row++) {
      c.beginPath(); for (let col = -22; col <= 22; col++) { const [x, y] = point(col, row / 22); col === -22 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();
    }
    for (let col = -22; col <= 22; col++) {
      c.beginPath(); for (let row = 0; row <= 22; row++) { const [x, y] = point(col, row / 22); row ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    }
    // Deterministic nodes: no flickering random positions between frames.
    for (let i = 0; i < 32; i++) {
      const x = (i * 313.7 % 997) / 997 * w, y = (i * 197.3 % 983) / 983 * h;
      c.fillStyle = i < this.blooms ? '#dceb5580' : '#8fabbc28'; c.fillRect(x, y, 1.4, 1.4);
    }
  }
  draw(dt, beat = 0, reduced = false, ambient = false) {
    const c = this.ctx, w = this.w, h = this.h;
    const key = `${this.canvas.width}/${this.canvas.height}/${this.blooms}`;
    if (this.sceneryKey !== key) {
      this.scenery.width = this.canvas.width; this.scenery.height = this.canvas.height;
      const cached = this.scenery.getContext('2d'); cached.setTransform(this.canvas.width / w, 0, 0, this.canvas.height / h, 0, 0);
      this.drawScenery(cached); this.sceneryKey = key;
    }
    c.drawImage(this.scenery, 0, 0, w, h); this.cheer = Math.max(0, this.cheer - dt);
    if (!reduced && ambient) {
      this.ambientTime += dt;
      for (let i = 0; i < 2; i++) {
        const travel = (this.ambientTime * .065 + i * .5) % 1;
        const x = w * (.12 + travel * .72), y = h * (.76 + .045 * Math.sin(travel * Math.PI * 2 + i));
        const signal = c.createRadialGradient(x, y, 0, x, y, 32);
        signal.addColorStop(0, '#82d2dc14'); signal.addColorStop(1, '#82d2dc00');
        c.fillStyle = signal; c.fillRect(x - 32, y - 32, 64, 64);
        c.fillStyle = '#82d2dc55'; c.fillRect(x, y, 2, 2);
      }
    }
    if (!reduced && beat > 0) {
      const pulse = (Math.sin(beat * Math.PI * 2) + 1) / 2;
      c.strokeStyle = `rgba(220,235,85,${.015 + pulse * .025})`; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, h * .63); c.lineTo(w, h * .63); c.stroke();
    }
    if (reduced) { this.particles = []; return; }
    let alive = 0;
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      this.particles[alive++] = p;
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      c.globalAlpha = Math.max(0, p.life / .65); c.strokeStyle = p.lane % 2 ? '#82d2dc' : '#dceb55';
      c.beginPath(); c.moveTo(p.x - 3, p.y); c.lineTo(p.x + 3, p.y); c.moveTo(p.x, p.y - 3); c.lineTo(p.x, p.y + 3); c.stroke();
    }
    this.particles.length = alive; c.globalAlpha = 1;
  }
}
