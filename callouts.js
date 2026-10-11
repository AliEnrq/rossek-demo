// Manually verified coordinates on the supplied 1280 × 720 manga footage.
// Labels are limited to two windows that keep the torso anchors readable.
const tracks = [
  { chapter: 4, from: 2.764, to: 3.834, points: [[2.764, 0.51, 0.435], [3.353, 0.514, 0.45], [3.834, 0.52, 0.47]], label: [0.33, 0.30], id: 'gojo-callout' },
  { chapter: 3, from: 5.415, to: 5.667, points: [[5.415, 0.29, 0.51], [5.539, 0.29, 0.50], [5.667, 0.30, 0.50]], label: [0.13, 0.30], id: 'gojo-callout' },
  { chapter: 3, from: 5.415, to: 5.667, points: [[5.415, 0.71, 0.61], [5.539, 0.755, 0.61], [5.667, 0.755, 0.58]], label: [0.87, 0.30], id: 'sukuna-callout' },
];

export function updateCallouts(chapter, video, hidden) {
  document.querySelectorAll('.callout').forEach(element => { element.hidden = true; });
  if (hidden || video.readyState < 2 || video.seeking || !video.classList.contains('has-frame')) return;
  const frame = video.getBoundingClientRect();
  const window = document.querySelector('.film-window').getBoundingClientRect();
  const style = getComputedStyle(video);
  const scale = style.objectFit === 'contain' ? Math.min(frame.width / 1280, frame.height / 720) : Math.max(frame.width / 1280, frame.height / 720);
  const offsetX = frame.left - window.left + (frame.width - 1280 * scale) * 0.5;
  const offsetY = frame.top - window.top + (frame.height - 720 * scale) * 0.5;
  const map = (x, y) => [offsetX + x * 1280 * scale, offsetY + y * 720 * scale];

  for (const track of tracks) {
    if (track.chapter !== chapter || video.currentTime < track.from || video.currentTime > track.to) continue;
    const next = track.points.findIndex(point => point[0] >= video.currentTime);
    const a = track.points[Math.max(0, next - 1)];
    const b = track.points[Math.max(0, next)];
    const ratio = b[0] === a[0] ? 0 : (video.currentTime - a[0]) / (b[0] - a[0]);
    const [anchorX, anchorY] = map(a[1] + (b[1] - a[1]) * ratio, a[2] + (b[2] - a[2]) * ratio);
    const [labelX, labelY] = map(...track.label);
    // Crop-aware guard: hide a label if either its endpoint or text leaves frame.
    if (Math.min(anchorX, labelX - 30) < 10 || Math.max(anchorX, labelX + 30) > window.width - 10 || Math.min(anchorY, labelY) < 10 || Math.max(anchorY, labelY) > window.height - 10) continue;
    const element = document.getElementById(track.id);
    element.hidden = false;
    const name = element.querySelector('.callout-name');
    const line = element.querySelector('.callout-line');
    const point = element.querySelector('.callout-point');
    name.style.left = `${labelX}px`;
    name.style.top = `${labelY}px`;
    const startX = labelX + (anchorX > labelX ? 20 : -26);
    const startY = labelY + 9;
    line.style.left = `${startX}px`;
    line.style.top = `${startY}px`;
    line.style.width = `${Math.hypot(anchorX - startX, anchorY - startY)}px`;
    line.style.transform = `rotate(${Math.atan2(anchorY - startY, anchorX - startX)}rad)`;
    point.style.left = `${anchorX}px`;
    point.style.top = `${anchorY}px`;
  }
}
