const $ = (id) => document.getElementById(id);
const audio = $('audio');

let albums = [];
let shown = null;              // album affiché dans le panneau
let queue = null, index = -1;  // album en cours de lecture + piste

// Couleur stable à partir du nom (pour les albums sans pochette)
function colorFor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 45% 35%)`;
}
function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}
function paintCover(el, album) {
  if (album.cover) {
    el.style.backgroundImage = `url("${album.cover}")`;
    el.textContent = '';
  } else {
    el.style.backgroundImage = '';
    el.style.backgroundColor = colorFor(album.name);
    el.textContent = initials(album.name);
  }
}
const fmt = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');
const plural = (n) => `${n} titre${n > 1 ? 's' : ''}`;

// ---------- Grille d'albums ----------
function renderGrid() {
  const q = $('search').value.trim().toLowerCase();
  const grid = $('grid');
  grid.innerHTML = '';
  const list = albums.filter((a) => a.name.toLowerCase().includes(q));
  if (!list.length) {
    grid.innerHTML = `<p class="empty">${albums.length ? 'Aucun album trouvé.' : 'Aucun album dans ce dossier.'}</p>`;
    return;
  }
  for (const a of list) {
    const card = document.createElement('div');
    card.className = 'album' + (queue === a ? ' playing' : '');
    card.title = a.name;
    const cover = document.createElement('div');
    cover.className = 'cover';
    paintCover(cover, a);
    card.append(cover);
    card.insertAdjacentHTML('beforeend', '<div class="album-name"></div><div class="album-count"></div>');
    card.querySelector('.album-name').textContent = a.name;
    card.querySelector('.album-count').textContent = plural(a.tracks.length);
    // Clic sur l'album : lance l'album et affiche la liste des titres
    card.onclick = () => { showAlbum(a); playAlbum(a, 0); };
    grid.append(card);
  }
}

// ---------- Panneau d'album ----------
function showAlbum(a) {
  shown = a;
  $('panel').classList.remove('hidden');
  paintCover($('panel-cover'), a);
  $('panel-title').textContent = a.name;
  $('panel-count').textContent = plural(a.tracks.length);
  const ol = $('tracklist');
  ol.innerHTML = '';
  a.tracks.forEach((t, i) => {
    const li = document.createElement('li');
    li.textContent = t.title;
    li.title = t.file;
    li.onclick = () => playAlbum(a, i);
    ol.append(li);
  });
  highlight();
}

function highlight() {
  [...$('tracklist').children].forEach((li, i) =>
    li.classList.toggle('current', shown === queue && i === index));
  document.querySelectorAll('.album').forEach((el) =>
    el.classList.toggle('playing', el.title === queue?.name));
}

// ---------- Lecture ----------
function playAlbum(a, i) {
  queue = a;
  index = i;
  const t = a.tracks[i];
  audio.src = t.url;
  audio.play().catch(() => {});
  $('now-title').textContent = t.title;
  $('now-album').textContent = a.name;
  paintCover($('now-cover'), a);
  document.title = `${t.title} — ${a.name}`;
  highlight();
}
function next() { if (queue && index < queue.tracks.length - 1) playAlbum(queue, index + 1); }
function prev() {
  if (!queue) return;
  if (audio.currentTime > 3 || index === 0) audio.currentTime = 0;
  else playAlbum(queue, index - 1);
}
function toggle() {
  if (!queue) { if (albums[0]) { showAlbum(albums[0]); playAlbum(albums[0], 0); } return; }
  audio.paused ? audio.play() : audio.pause();
}

audio.onplay = () => ($('play').textContent = '⏸');
audio.onpause = () => ($('play').textContent = '▶');
audio.onended = next;
audio.ontimeupdate = () => {
  $('cur').textContent = fmt(audio.currentTime);
  $('dur').textContent = fmt(audio.duration);
  if (audio.duration && !seeking) $('progress').value = (audio.currentTime / audio.duration) * 1000;
};

let seeking = false;
$('progress').oninput = () => { seeking = true; };
$('progress').onchange = () => {
  if (audio.duration) audio.currentTime = ($('progress').value / 1000) * audio.duration;
  seeking = false;
};

const savedVol = localStorage.getItem('volume');
if (savedVol !== null) { audio.volume = +savedVol; $('volume').value = savedVol; }
$('volume').oninput = () => {
  audio.volume = $('volume').value;
  try { localStorage.setItem('volume', audio.volume); } catch {}
};

$('play').onclick = toggle;
$('next').onclick = next;
$('prev').onclick = prev;
$('panel-play').onclick = () => shown && playAlbum(shown, 0);
$('panel-close').onclick = () => $('panel').classList.add('hidden');
$('search').oninput = renderGrid;

// Raccourcis clavier : Espace = lecture/pause, Ctrl+← Ctrl+→ = piste précédente/suivante
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  else if (e.code === 'ArrowRight' && e.ctrlKey) next();
  else if (e.code === 'ArrowLeft' && e.ctrlKey) prev();
});

// Touches multimédia du clavier / écran de verrouillage
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('nexttrack', next);
  navigator.mediaSession.setActionHandler('previoustrack', prev);
}

fetch('/api/albums')
  .then((r) => r.json())
  .then((data) => { albums = data; renderGrid(); })
  .catch(() => { $('grid').innerHTML = '<p class="empty">Impossible de lire la bibliothèque.</p>'; });
