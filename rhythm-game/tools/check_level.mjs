import { readFile } from 'node:fs/promises';
import { validateMap } from '../maps.js';
import { beatToSeconds } from '../timing.js';
import { allSpecs, localEngine, makeBank } from '../model.js';
import { RhythmRun } from '../rhythm.js';
const path = process.argv[2];
if (!path) { console.error('Usage: node tools/check_level.mjs path/to/level.json'); process.exitCode = 1; }
else {
  try {
    const map = validateMap(JSON.parse(await readFile(path, 'utf8')));
    const specs = allSpecs(), bank = makeBank(specs, await localEngine.run(specs), () => .5);
    const run = new RhythmRun(map, bank);
    for (const note of run.notes) run.press(note.lane, note.at);
    run.advance(beatToSeconds(map, map.durationBeats) + 1);
    const result = run.summary();
    if (result.restored !== map.events.length || result.grade !== 'S' || result.holdsCompleted !== result.holds) throw new Error('Perfect-solution recovery check failed.');
    console.log(JSON.stringify({id:map.id,lanes:map.qubits,seconds:beatToSeconds(map,map.durationBeats),packets:map.events.length,notes:result.total,holds:result.holds,restored:result.restored,grade:result.grade,check:'Local reference model; verify soundtrack alignment and human difficulty in play.'},null,2));
  } catch (error) { console.error(`Invalid level: ${error.message}`); process.exitCode = 1; }
}
