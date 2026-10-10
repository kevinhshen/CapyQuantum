// One shared musical timeline for chart validation, judgement and audio.
export function beatToSeconds(map, beat) {
  if (beat < 0) return beat * 60 / map.bpm;
  let seconds = 0, start = 0, bpm = map.bpm;
  for (const change of map.tempoChanges || []) {
    if (change.beat > beat) break;
    seconds += (change.beat - start) * 60 / bpm;
    start = change.beat; bpm = change.bpm;
  }
  return seconds + (beat - start) * 60 / bpm;
}
export function secondsToBeat(map, seconds) {
  if (seconds < 0) return seconds * map.bpm / 60;
  let elapsed = 0, start = 0, bpm = map.bpm;
  for (const change of map.tempoChanges || []) {
    const next = elapsed + (change.beat - start) * 60 / bpm;
    if (seconds < next) break;
    elapsed = next; start = change.beat; bpm = change.bpm;
  }
  return start + (seconds - elapsed) * bpm / 60;
}
