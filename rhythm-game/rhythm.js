import { beatToSeconds } from './timing.js';
// Timing cues do not reveal correction lanes. Players decode parity themselves.
export const WINDOWS = { perfect: .045, great: .09, good: .145 };
export class RhythmRun {
  constructor(map, bank) {
    this.map = map; this.bank = bank; this.notes = []; this.packets = []; this.cues = []; this.results = [];
    this.score = 0; this.combo = 0; this.best = 0; this.strays = 0; this.goodFixes = 0; this.badFixes = 0;
    for (const event of map.events) {
      const error = event.error.reduce((m, q) => m ^ 1 << q, 0);
      const packet = { id: event.id, error, applied: 0, syn: bank.sample(error, map.qubits), at: beatToSeconds(map, event.beat),
        end: beatToSeconds(map, event.beat + Math.max(0, ...event.steps.map(s => s.offset))) + WINDOWS.good, done: false, notes: [] };
      const steps = event.steps.length ? event.steps : [{ offset: 0, lanes: [] }];
      steps.forEach((step, order) => {
        const cue = { id: this.cues.length, packet, at: beatToSeconds(map, event.beat + step.offset), order, total: steps.length, notes: [], clean: !event.error.length };
        step.lanes.forEach(lane => {
          const note = { id: this.notes.length, lane, at: cue.at, packet, cue, done: false, outcome: null };
          packet.notes.push(note); cue.notes.push(note); this.notes.push(note);
        });
        this.cues.push(cue);
      });
      this.packets.push(packet);
    }
    this.notes.sort((a, b) => a.at - b.at);
    this.cues.sort((a, b) => a.at - b.at);
  }
  checks(packet) {
    return packet.syn.map((bit, i) => bit ^ (packet.applied >> i & 1) ^ (packet.applied >> (i + 1) & 1));
  }
  apply(packet, lane) {
    const correct = Boolean((packet.error ^ packet.applied) >> lane & 1);
    packet.applied ^= 1 << lane;
    if (correct) this.goodFixes++; else this.badFixes++;
    return correct;
  }
  press(lane, time) {
    this.advance(time);
    // Any key may fill a timing slot. The current residual decides correctness.
    const candidates = this.notes.filter(n => !n.done && Math.abs(n.at - time) <= WINDOWS.good);
    candidates.sort((a, b) => Math.abs(a.at - time) - Math.abs(b.at - time));
    const note = candidates[0];
    if (!note) {
      this.strays++; this.combo = 0;
      const packets = this.packets.filter(p => !p.done && (Math.abs(p.at - time) <= WINDOWS.good || p.notes.some(n => Math.abs(n.at - time) <= WINDOWS.good)));
      packets.sort((a, b) => Math.abs(a.at - time) - Math.abs(b.at - time));
      const packet = packets[0], correct = packet ? this.apply(packet, lane) : null;
      return { type: 'stray', lane, at: time, packet, correct };
    }
    const correct = this.apply(note.packet, lane), delta = time - note.at;
    const timing = Math.abs(delta) <= WINDOWS.perfect ? 'Perfect' : Math.abs(delta) <= WINDOWS.great ? 'Great' : 'Good';
    note.done = true; note.outcome = { timing, delta, correct };
    if (correct) {
      this.score += timing === 'Perfect' ? 300 : timing === 'Great' ? 200 : 100;
      this.combo++; this.best = Math.max(this.best, this.combo);
    } else this.combo = 0;
    return { type: 'hit', lane, note, timing, delta, correct, packet: note.packet };
  }
  advance(time) {
    for (const note of this.notes) if (!note.done && time > note.at + WINDOWS.good) { note.done = true; note.outcome = { timing: 'Miss', delta: null, correct: false }; this.combo = 0; }
    const resolved = [];
    for (const p of this.packets) if (!p.done && time > p.end) {
      p.done = true;
      const result = { id: p.id, error: p.error, applied: p.applied, restored: p.error === p.applied, syn: p.syn, fidelity: this.bank.fidelity(p.error, p.applied, this.map.qubits) };
      this.results.push(result); resolved.push(result);
    }
    return resolved;
  }
  summary() {
    const judgements = { Perfect: 0, Great: 0, Good: 0, Wrong: 0, Miss: 0 };
    this.notes.forEach(n => judgements[!n.outcome || n.outcome.timing === 'Miss' ? 'Miss' : n.outcome.correct ? n.outcome.timing : 'Wrong']++);
    const total = this.notes.length, hits = total - judgements.Miss;
    const accuracy = total + this.strays ? (judgements.Perfect + judgements.Great * 2 / 3 + judgements.Good / 3) / (total + this.strays) : 1;
    const deltas = this.notes.filter(n => n.outcome && n.outcome.delta !== null).map(n => n.outcome.delta * 1000);
    return { judgements, total, hits, accuracy, score: this.score, best: this.best, strays: this.strays, goodFixes: this.goodFixes, badFixes: this.badFixes,
      choiceAccuracy: this.goodFixes + this.badFixes ? this.goodFixes / (this.goodFixes + this.badFixes) : null,
      grade: accuracy >= .97 ? 'S' : accuracy >= .9 ? 'A' : accuracy >= .8 ? 'B' : accuracy >= .65 ? 'C' : 'D',
      restored: this.results.filter(r => r.restored).length, packets: this.packets.length,
      fidelity: this.results.length ? this.results.reduce((s, r) => s + r.fidelity, 0) / this.results.length : 0,
      meanOffset: deltas.length ? deltas.reduce((s, x) => s + x, 0) / deltas.length : null, deltas, results: this.results };
  }
}
