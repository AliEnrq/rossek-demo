import { readdir, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { chapters } from '../chapters.js';

const source = (await readdir('.')).find(name => name.startsWith('Gojo VS Sukuna Animation') && name.endsWith('.mp4'));
if (!source) throw new Error('Falta el video aportado.');
await mkdir('public/assets/chapters', { recursive: true });
function run(args) {
  const result = spawnSync(ffmpeg, ['-loglevel', 'error', ...args, '-y'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
}
for (const [index, chapter] of chapters.entries()) {
  const base = `public/assets/chapters/scene-${index + 1}`;
  // Original timing and artist marks. Only audio is removed.
  run(['-ss', String(chapter.start), '-i', source, '-t', String(chapter.end - chapter.start), '-map', '0:v:0', '-an', '-vf', 'setsar=1', '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-g', '6', '-keyint_min', '6', '-sc_threshold', '0', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}.mp4`]);
  run(['-i', `${base}.mp4`, '-an', '-vf', 'scale=960:540', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-g', '6', '-keyint_min', '6', '-sc_threshold', '0', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}-mobile.mp4`]);
  run(['-i', `${base}.mp4`, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '88', `${base}-poster.webp`]);
  run(['-i', `${base}.mp4`, '-vf', 'fps=1/2,scale=480:-1,tile=3x2', '-frames:v', '1', '-update', '1', `production/scene-${index + 1}-review.jpg`]);
  console.log(`Sección ${index + 1}: ${chapter.start}–${chapter.end} s, sin audio.`);
}
