const clamp = value => Math.max(0, Math.min(1, value));

export function sceneAt(progress) {
  const position = clamp(progress) * 8;
  const chapter = Math.min(7, Math.floor(position));
  const local = position - chapter;
  const start = chapter === 0 ? 0 : 0.045;
  const end = chapter === 7 ? 1 : 0.955;
  return {
    chapter,
    time: clamp((local - start) / (end - start)),
    blackout: local < start ? (start - local) / start : local > end ? (local - end) / (1 - end) : 0,
  };
}
