// Original vector garden, inspired by Ion Garden's sage/cream palette.
export class TempoGarden {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.particles = []; this.blooms = 0; this.palette = 0; this.cheer = 0; this.scenery = document.createElement('canvas'); this.sceneryKey = ''; this.resize(); }
  resize() { const r = this.canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 2); this.w = r.width; this.h = r.height; this.canvas.width = r.width * ratio; this.canvas.height = r.height * ratio; this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0); }
  ellipse(x, y, rx, ry, color) { const c = this.ctx; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill(); }
  tree(x, y, size, variant = 0) {
    const c = this.ctx; this.ellipse(x, y + size * .65, size * .52, size * .14, '#55734b28');
    c.fillStyle = '#a79066'; c.fillRect(x - size * .055, y, size * .11, size * .62);
    this.ellipse(x, y - size * .2, size * .5, size * .58, variant ? '#829e70' : '#75956c');
    this.ellipse(x - size * .2, y - size * .08, size * .36, size * .37, variant ? '#96ae7b' : '#87a577');
    this.ellipse(x + size * .14, y - size * .36, size * .32, size * .36, '#a2b888');
  }
  flower(x, y, size, color) {
    const c = this.ctx; c.strokeStyle = '#729368'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y + size * 2.4); c.stroke();
    for (let n = 0; n < 5; n++) { const a = n * Math.PI * 2 / 5; this.ellipse(x + Math.cos(a) * size * .6, y + Math.sin(a) * size * .6, size * .55, size * .55, color); }
    this.ellipse(x, y, size * .35, size * .35, '#fff1bd');
  }
  celebrate(reduced = false) { this.cheer = reduced ? 0 : .5; this.blooms = Math.min(45, this.blooms + 3); if (!reduced) this.burst(this.w * .17, this.h * .52, 0); }
  burst(x, y, lane) { for (let i = 0; i < 7 && this.particles.length < 42; i++) this.particles.push({ x, y, vx: (Math.random() - .5) * 100, vy: -35 - Math.random() * 60, life: .65, lane }); }
  drawScenery() {
    const c = this.ctx, w = this.w, h = this.h;
    c.fillStyle = this.palette % 2 ? '#b9cda0' : '#b7c99a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#f2eed055'; c.beginPath(); c.ellipse(w * .12, h * .25, w * .42, h * .4, -.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#95ad8050'; c.beginPath(); c.ellipse(w * .92, h * .65, w * .38, h * .52, .3, 0, Math.PI * 2); c.fill();
    this.ellipse(w * .16, h * .65, w * .14, h * .13, '#8eab8425');
    this.ellipse(w * .13, h * .73, Math.min(95, w * .1), 39, '#7ba59b');
    this.ellipse(w * .13, h * .72, Math.min(88, w * .09), 31, '#a6c8b0');
    this.ellipse(w * .13, h * .72, Math.min(75, w * .075), 24, '#92bca9');
    c.strokeStyle = '#d5e0bc'; c.lineWidth = 2; c.beginPath(); c.ellipse(w * .13, h * .72, Math.min(50, w * .05), 12, 0, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 12; i++) {
      const side = i % 2, x = side ? w * (.87 + Math.sin(i * 4) * .07) : w * (.08 + Math.sin(i * 4) * .06);
      const y = h * (.2 + (i % 6) * .13); this.tree(x, y, 30 + (i % 3) * 9, i % 2);
    }
    for (let i = 0; i < 68; i++) {
      const x = ((i * 313.7) % 997) / 997 * w, y = ((i * 197.3) % 983) / 983 * h;
      if (x > w * .28 && x < w * .72) continue;
      this.flower(x, y, 2.5 + i % 3, ['#e4b5a3', '#f0dfad', '#d0c2d8'][i % 3]);
    }
    // Garden growth responds to successful corrections.
    for (let i = 0; i < Math.min(this.blooms, 45); i++) this.flower(w * (.79 + (i % 5) * .028), h * (.67 + Math.floor(i / 5) * .018), 3.5, '#f1c7a5');
  }
  draw(dt, beat = 0, reduced = false) {
    const c = this.ctx, w = this.w, h = this.h;
    const sceneryKey = `${this.canvas.width}/${this.canvas.height}/${this.palette % 2}/${this.blooms}`;
    if (this.sceneryKey !== sceneryKey) {
      this.scenery.width = this.canvas.width; this.scenery.height = this.canvas.height;
      this.ctx = this.scenery.getContext('2d'); this.ctx.setTransform(this.canvas.width / w, 0, 0, this.canvas.height / h, 0, 0);
      this.drawScenery(); this.ctx = c; this.sceneryKey = sceneryKey;
    }
    c.drawImage(this.scenery, 0, 0, w, h);
    this.cheer = Math.max(0, this.cheer - dt);
    const bob = reduced ? 0 : Math.sin(beat * Math.PI) * 2 - Math.sin(this.cheer / .5 * Math.PI) * 9;
    this.ellipse(w * .17, h * .52 + 16, 29, 9, '#49684125');
    this.ellipse(w * .17, h * .52 + bob, 28, 20, '#d5ad83');
    this.ellipse(w * .17 + 18, h * .52 - 7 + bob, 17, 16, '#e5c59e');
    this.ellipse(w * .17 + 18, h * .52 - 22 + bob, 5, 6, '#caa17b');
    this.ellipse(w * .17 + 23, h * .52 - 9 + bob, 2, 2, '#415a42');
    this.ellipse(w * .17 + 33, h * .52 + bob, 4, 2, '#836a4d');
    if (!reduced) {
      let alive = 0;
      for (const p of this.particles) { if (p.life <= 0) continue; this.particles[alive++] = p; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 110 * dt; c.globalAlpha = Math.max(0, p.life / .65); this.ellipse(p.x, p.y, 4, 2, ['#f7ead0', '#e9b391', '#cadbb7'][p.lane % 3]); }
      this.particles.length = alive; c.globalAlpha = 1;
    } else this.particles = [];
  }
}
