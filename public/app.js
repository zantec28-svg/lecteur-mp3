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
    grid.innerHTML = `<p class="empty">${albums.length ? 'Aucun album trouvé.' : 'Aucun album pour le moment : clique sur « 📁 Choisir un dossier ».'}</p>`;
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
let blobUrl = null;
function playAlbum(a, i) {
  queue = a;
  index = i;
  const t = a.tracks[i];
  // Fichier choisi via le bouton : lu directement depuis l'appareil
  if (t.blob) {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(t.blob);
  }
  audio.src = t.blob ? blobUrl : t.url;
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

// ---------- Choix du dossier via le bouton ----------
// Le dossier choisi est lu par le navigateur : rien n'est envoyé sur internet.
const AUDIO_EXT = ['mp3', 'm4a', 'flac', 'ogg', 'wav', 'aac', 'opus'];
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });
const ext = (n) => n.split('.').pop().toLowerCase();
let coverUrls = [];

function albumsFromFiles(files) {
  coverUrls.forEach(URL.revokeObjectURL);
  coverUrls = [];
  // chemin : DossierChoisi/Album/…/fichier.mp3 → 1 sous-dossier = 1 album
  const byAlbum = new Map();
  for (const f of files) {
    const parts = f.webkitRelativePath.split('/');
    if (parts.length < 3 || parts.some((p) => p.startsWith('.'))) continue;
    if (!byAlbum.has(parts[1])) byAlbum.set(parts[1], []);
    byAlbum.get(parts[1]).push({ path: parts.slice(2).join('/'), f });
  }
  const list = [];
  for (const [name, items] of byAlbum) {
    items.sort((a, b) => collator.compare(a.path, b.path));
    const tracks = items.filter((i) => AUDIO_EXT.includes(ext(i.f.name)));
    if (!tracks.length) continue;
    const images = items.filter((i) => IMAGE_EXT.includes(ext(i.f.name)));
    const base = (i) => i.f.name.replace(/\.[^.]+$/, '').toLowerCase();
    const img = ['cover', 'folder', 'front', 'album'].map((p) => images.find((i) => base(i) === p)).find(Boolean) || images[0];
    let cover = null;
    if (img) { cover = URL.createObjectURL(img.f); coverUrls.push(cover); }
    list.push({
      name, cover,
      tracks: tracks.map((i) => ({
        title: i.f.name.replace(/\.[^.]+$/, '').replace(/^\s*\d{1,3}\s*[-._)\s]\s*/, '').trim() || i.f.name,
        file: i.path,
        blob: i.f,
      })),
    });
  }
  return list.sort((a, b) => collator.compare(a.name, b.name));
}

$('pick').onclick = () => $('dir-input').click();
$('dir-input').onchange = (e) => {
  if (!e.target.files.length) return;
  albums = albumsFromFiles(e.target.files);
  $('panel').classList.add('hidden');
  $('search').value = '';
  renderGrid();
  e.target.value = '';
};

// ---------- Bibliothèque fournie par le serveur (node server.js) ----------
fetch('/api/albums')
  .then((r) => r.json())
  .then((data) => { albums = data; renderGrid(); })
  .catch(() => { renderGrid(); });
