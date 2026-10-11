import { sceneAt } from './scene.js';
import { chapters, productUrl } from './chapters.js';
import { updateCallouts } from './callouts.js';

const cinema = document.querySelector('.cinema');
const stage = document.querySelector('.cinema-stage');
const film = document.querySelector('.film-window');
const motionButton = document.querySelector('.motion-toggle');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const mediaMessage = document.querySelector('.media-message');
const mobile = matchMedia('(max-width: 700px)').matches;
const asset = path => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
let reduced = motionPreference.matches;
let scheduled = false;
let chapter = -1;
let targetTime = 0;

film.insertAdjacentHTML('afterbegin', chapters.map((item, index) => `
  <section class="shot" id="scene-${index + 1}" aria-label="${item.title}" ${index ? 'hidden' : ''}>
    <img src="${asset(`/assets/chapters/scene-${index + 1}-poster.webp`)}" width="1280" height="720" alt="${item.caption}" ${index ? 'loading="lazy"' : ''} />
    <video muted playsinline preload="none" poster="${asset(`/assets/chapters/scene-${index + 1}-poster.webp`)}" aria-hidden="true" tabindex="-1" disablepictureinpicture disableremoteplayback data-desktop="${asset(`/assets/chapters/scene-${index + 1}.mp4`)}" data-mobile="${asset(`/assets/chapters/scene-${index + 1}-mobile.mp4`)}"></video>
  </section>`).join(''));
document.querySelector('.initial-frame').remove();
const shots = [...document.querySelectorAll('.shot')];
const videos = shots.map(shot => shot.querySelector('video'));
const navigation = document.querySelector('.chapters');
navigation.innerHTML = chapters.map((item, index) => `<button class="chapter-button" type="button" aria-label="Sección ${index + 1}: ${item.title}" aria-pressed="false">${String(index + 1).padStart(2, '0')}</button>`).join('');
const buttons = [...navigation.querySelectorAll('button')];

// Native scroll seeks paused videos; there is no independent playback clock.
function seek() {
  const video = videos[chapter];
  if (reduced || !video || video.readyState < 2 || video.seeking || !Number.isFinite(video.duration)) return;
  const target = Math.min(targetTime * video.duration, Math.max(0, video.duration - 1 / 24));
  if (Math.abs(video.currentTime - target) > 1 / 40) video.currentTime = target;
}

function loadFilms(index) {
  if (reduced) return;
  // Load the current scene and its next neighbor; the other clips wait.
  for (const video of videos.slice(index, index + 2)) {
    if (video.getAttribute('src')) continue;
    video.preload = 'auto';
    video.src = mobile ? video.dataset.mobile : video.dataset.desktop;
    video.load();
  }
}

videos.forEach(video => {
  video.muted = true;
  video.addEventListener('loadeddata', () => { video.classList.add('has-frame'); schedule(); });
  video.addEventListener('seeked', schedule);
  video.addEventListener('error', () => {
    video.classList.remove('has-frame');
    mediaMessage.hidden = false;
    mediaMessage.textContent = 'Podés seguir explorando con los fotogramas.';
    schedule();
  });
});

function render() {
  scheduled = false;
  const travel = cinema.offsetHeight - stage.offsetHeight;
  const progress = Math.max(0, Math.min(1, -cinema.getBoundingClientRect().top / Math.max(1, travel)));
  const scene = sceneAt(progress);
  targetTime = scene.time;
  stage.dataset.progress = progress;
  stage.style.setProperty('--transition', reduced ? 0 : scene.blackout);
  if (chapter !== scene.chapter) {
    chapter = scene.chapter;
    const item = chapters[chapter];
    stage.dataset.chapter = chapter;
    shots.forEach((shot, index) => { shot.hidden = index !== chapter; });
    document.querySelector('#scene-title').textContent = item.title;
    document.querySelector('#scene-caption').textContent = item.caption;
    document.querySelector('#section-name').textContent = `Jujutsu Kaisen / ${String(chapter + 1).padStart(2, '0')}`;
    document.querySelector('#product-name').textContent = item.product;
    const image = document.querySelector('#product-image');
    image.src = asset(item.image);
    image.alt = item.product;
    document.querySelector('#product-link').href = productUrl(item);
    document.querySelector('#product-picture-link').href = productUrl(item);
    document.querySelector('#chapter-announcement').textContent = `Sección ${chapter + 1}: ${item.caption} ${item.product}.`;
    buttons.forEach((button, index) => {
      button.classList.toggle('is-active', index === chapter);
      button.setAttribute('aria-pressed', String(index === chapter));
    });
    if (chapters[chapter + 1]) { const nextImage = new Image(); nextImage.src = asset(chapters[chapter + 1].image); }
  }
  if (cinema.getBoundingClientRect().top < innerHeight * 1.7) loadFilms(chapter);
  seek();
  updateCallouts(chapter, videos[chapter], reduced || scene.blackout > 0);
}

function schedule() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(render); }
}

function setReduced(value) {
  reduced = value;
  document.documentElement.classList.toggle('reduced-motion', reduced);
  motionButton.setAttribute('aria-pressed', String(reduced));
  motionButton.textContent = reduced ? 'Activar movimiento' : 'Reducir movimiento';
  schedule();
}

buttons.forEach((button, index) => button.addEventListener('click', () => {
  const start = cinema.getBoundingClientRect().top + scrollY;
  const travel = cinema.offsetHeight - stage.offsetHeight;
  scrollTo({ top: start + travel * (index + 0.08) / 8, behavior: 'instant' });
}));
motionButton.addEventListener('click', () => setReduced(!reduced));
motionPreference.addEventListener('change', event => setReduced(event.matches));
window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', schedule, { passive: true });
window.addEventListener('pageshow', schedule);
setReduced(reduced);
render();
