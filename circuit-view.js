// Draws the Qiskit circuit behind a spec as an SVG (same gates as quantum/qec.py).
import { buildOps } from './circuits.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const labelCols = label => Math.ceil((label.length * 7.5 + 10) / 40);

export function circuitView(spec) {
  const { ops, nQubits } = buildOps(spec);
  const d = spec.d ?? 3;
  const W = 40, H = 34, LEFT = 44, TOP = 26;
  const last = new Array(nQubits).fill(-1);
  const sections = [];
  let col = 0, sectionStart = 0, maxCol = -1;
  const placed = [];
  for (const op of ops) {
    if (op.g === 'section') {
      // Leave room for the previous section's label, even if it holds one gate.
      const prev = sections[sections.length - 1];
      sectionStart = Math.max(maxCol + 1, prev ? prev.col + labelCols(prev.label) : 0);
      sections.push({ label: op.label, col: sectionStart });
      continue;
    }
    const lo = Math.min(...op.q), hi = Math.max(...op.q);
    col = sectionStart;
    for (let w = lo; w <= hi; w++) col = Math.max(col, last[w] + 1);
    for (let w = lo; w <= hi; w++) last[w] = col;
    maxCol = Math.max(maxCol, col);
    placed.push({ op, col });
  }
  const lastSection = sections[sections.length - 1];
  const width = LEFT + Math.max(maxCol + 1, lastSection.col + labelCols(lastSection.label)) * W + 10;
  const height = TOP + nQubits * H;
  const y = q => TOP + q * H + H / 2;
  const x = c => LEFT + c * W + W / 2;
  let svg = '';
  for (let q = 0; q < nQubits; q++) {
    svg += `<text class="wire-label" x="4" y="${y(q) + 4}">${q < d ? 'q' + q : 'a' + (q - d)}</text>`;
    svg += `<line class="wire" x1="${LEFT - 6}" x2="${width - 6}" y1="${y(q)}" y2="${y(q)}"/>`;
  }
  sections.forEach(s => {
    svg += `<text class="section-label" x="${LEFT + s.col * W + 2}" y="14">${s.label}</text>`;
    if (s.col > 0) svg += `<line class="section-line" x1="${LEFT + s.col * W}" x2="${LEFT + s.col * W}" y1="18" y2="${height}"/>`;
  });
  for (const { op, col } of placed) {
    const cx = x(col);
    if (op.g === 'cx') {
      const [c, t] = op.q;
      svg += `<line class="ctrl-line" x1="${cx}" x2="${cx}" y1="${y(c)}" y2="${y(t)}"/>
        <circle class="ctrl" cx="${cx}" cy="${y(c)}" r="4"/>
        <circle class="target" cx="${cx}" cy="${y(t)}" r="9"/>
        <line class="target-plus" x1="${cx - 9}" x2="${cx + 9}" y1="${y(t)}" y2="${y(t)}"/>
        <line class="target-plus" x1="${cx}" x2="${cx}" y1="${y(t) - 9}" y2="${y(t) + 9}"/>`;
    } else {
      const label = op.g === 'measure' ? 'M' : op.g === 'ry' ? 'Ry' : op.g.toUpperCase();
      const cls = op.stage === 'error' ? 'gate err' : op.stage === 'fix' ? 'gate fixg' : 'gate';
      svg += `<rect class="${cls}" x="${cx - 13}" y="${y(op.q[0]) - 12}" width="26" height="24" rx="4"/>
        <text class="gate-text" x="${cx}" y="${y(op.q[0]) + 4}">${label}</text>`;
    }
  }
  const errs = [...(spec.errors || []), ...(spec.late || [])].map(e => `${e.p} error on q${e.q}`);
  const summary = `Circuit with ${nQubits} qubits: encode, ${errs.join(', ') || 'no errors'}, ` +
    `${d > 1 ? 'parity checks into ancillas, ' : ''}${spec.fix?.length ? `fix on q${spec.fix.join(', q')}, ` : ''}measure.`;
  return `<div class="circuit">
    <div class="circuit-scroll"><svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(summary)}">${svg}</svg></div>
    </div>`;
}
