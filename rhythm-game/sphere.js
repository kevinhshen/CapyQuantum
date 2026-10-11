// A rotating VIEW of one fixed pure state, not a simulation of evolving hardware.
const SPHERE_RADIUS = 143, SPHERE_CENTER = [260, 198];
const orbitPoint = (theta, phi) => [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
const sphereLoops = [
  ...Array.from({length:8}, (_, i) => Array.from({length:65}, (_, j) => orbitPoint(j / 64 * Math.PI * 2, i / 8 * Math.PI))),
  ...Array.from({length:7}, (_, i) => Array.from({length:65}, (_, j) => orbitPoint((i + 1) / 8 * Math.PI, j / 64 * Math.PI * 2))),
];

// Orthographic projection preserves geometry while the camera turns about z.
export function projectBlochPoint([x, y, z], yaw, elevation = .24) {
  const horizontal = x * Math.cos(yaw) - y * Math.sin(yaw);
  const away = x * Math.sin(yaw) + y * Math.cos(yaw);
  return {x:260 + SPHERE_RADIUS * horizontal, y:198 - SPHERE_RADIUS * (z * Math.cos(elevation) - away * Math.sin(elevation)), depth:away * Math.cos(elevation) + z * Math.sin(elevation)};
}

export class BlochSphere {
  constructor(svg, toggle) {
    this.svg = svg; this.toggle = toggle; this.yaw = -.35; this.elapsed = 0;
    this.offset = [0, 0]; this.target = [0, 0]; this.paused = false; this.reduced = false;
    this.back = svg.querySelector('[data-mesh-back]'); this.front = svg.querySelector('[data-mesh-front]');
    this.axes = svg.querySelector('[data-axes]'); this.vector = svg.querySelector('[data-vector]');
    this.tip = svg.querySelector('[data-state-tip]'); this.halo = svg.querySelector('[data-state-halo]');
    this.guide = svg.querySelector('[data-state-guide]'); this.state = svg.querySelector('.sphere-state');
    this.label = svg.querySelector('[data-state-label]'); this.xLabel = svg.querySelector('[data-axis-x]'); this.yLabel = svg.querySelector('[data-axis-y]');
    toggle.addEventListener('click', () => { this.paused = !this.paused; this.updateToggle(); });
    svg.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || this.paused || this.reduced) return;
      const bounds = svg.getBoundingClientRect();
      this.target = [(e.clientX - bounds.left) / bounds.width * .4 - .2, (e.clientY - bounds.top) / bounds.height * .12 - .06];
    });
    svg.addEventListener('pointerleave', () => { this.target = [0, 0]; });
    this.render(); this.updateToggle();
  }
  updateToggle() {
    this.toggle.textContent = this.reduced ? 'Rotation off' : this.paused ? 'Resume rotation' : 'Pause rotation';
    this.toggle.setAttribute('aria-pressed', String(this.paused || this.reduced)); this.toggle.disabled = this.reduced;
    this.svg.dataset.motion = this.reduced || this.paused ? 'paused' : 'rotating';
  }
  frame(dt, reduced, visible) {
    if (reduced !== this.reduced) { this.reduced = reduced; this.target = [0, 0]; this.updateToggle(); }
    if (!visible || reduced || this.paused) return;
    this.elapsed += dt;
    // Share the game's frame loop, but only rebuild these paths at 30 fps.
    if (this.elapsed < 1 / 30) return;
    const step = this.elapsed; this.elapsed = 0; this.yaw += step * .16;
    const ease = 1 - Math.exp(-step * 4);
    this.offset = this.offset.map((value, i) => value + (this.target[i] - value) * ease);
    this.render();
  }
  render() {
    const project = v => projectBlochPoint(v, this.yaw + this.offset[0], .24 + this.offset[1]);
    const pathPoint = p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    const paths = ['', ''];
    for (const loop of sphereLoops) {
      let last = project(loop[0]), previousSide = -1;
      for (const v of loop.slice(1)) {
        const next = project(v), side = (last.depth + next.depth) / 2 >= 0 ? 1 : 0;
        if (side !== previousSide) paths[side] += `M${pathPoint(last)}`;
        paths[side] += `L${pathPoint(next)}`; last = next; previousSide = side;
      }
    }
    this.back.setAttribute('d', paths[0]); this.front.setAttribute('d', paths[1]);
    this.axes.setAttribute('d', [[1.22,0,0],[0,1.22,0],[0,0,1.14]].map(v => `M${pathPoint(project(v.map(x => -x)))}L${pathPoint(project(v))}`).join(''));
    const v = orbitPoint(.88, .72), tip = project(v), foot = project([v[0], v[1], 0]);
    const dx = tip.x - SPHERE_CENTER[0], dy = tip.y - SPHERE_CENTER[1], length = Math.hypot(dx,dy);
    const ux = dx / length, uy = dy / length;
    this.vector.setAttribute('d', `M260 198L${pathPoint(tip)}M${(tip.x - ux * 10 + uy * 4).toFixed(2)} ${(tip.y - uy * 10 - ux * 4).toFixed(2)}L${pathPoint(tip)}L${(tip.x - ux * 10 - uy * 4).toFixed(2)} ${(tip.y - uy * 10 + ux * 4).toFixed(2)}`);
    for (const circle of [this.tip, this.halo]) { circle.setAttribute('cx', tip.x.toFixed(2)); circle.setAttribute('cy', tip.y.toFixed(2)); }
    this.guide.setAttribute('d', `M${pathPoint(tip)}L${pathPoint(foot)}L260 198`);
    this.state.setAttribute('opacity', tip.depth < 0 ? '.58' : '1');
    this.label.setAttribute('x', (tip.x + (dx < 0 ? -35 : 17)).toFixed(2)); this.label.setAttribute('y', (tip.y - 9).toFixed(2));
    for (const [label, v] of [[this.xLabel,[1.29,0,0]],[this.yLabel,[0,1.29,0]]]) { const p = project(v); label.setAttribute('x', p.x.toFixed(2)); label.setAttribute('y', p.y.toFixed(2)); }
  }
}
