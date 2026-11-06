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
let currentBlobUrl = null;
let playToken = 0;
async function trackUrl(t) {
  if (t.url) return t.url;               // mode serveur local
  const file = await t.getFile();        // mode dossier choisi dans le navigateur
  if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
  currentBlobUrl = URL.createObjectURL(file);
  return currentBlobUrl;
}

async function playAlbum(a, i) {
  queue = a;
  index = i;
  const t = a.tracks[i];
  const token = ++playToken;
  let src;
  try { src = await trackUrl(t); } catch { return alert(`Impossible de lire « ${t.title} ».`); }
  if (token !== playToken) return;       // un autre titre a été demandé entre-temps
  audio.src = src;
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

// ======================================================================
// Bibliothèque
//  - mode serveur : `node server.js "C:\Musique"` fournit /api/albums
//  - mode navigateur (Vercel, Chromebook…) : on choisit le dossier, le
//    navigateur lit les fichiers sur l'appareil, rien n'est envoyé.
// ======================================================================
const AUDIO_EXT = ['mp3', 'm4a', 'flac', 'ogg', 'wav', 'aac', 'opus'];
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });
const ext = (n) => n.split('.').pop().toLowerCase();
const prettyTitle = (n) =>
  n.replace(/\.[^.]+$/, '').replace(/^\s*\d{1,3}\s*[-._)\s]\s*/, '').trim() || n;
let coverUrls = [];

function setLibrary(list) {
  albums = list;
  $('loading').classList.add('hidden');
  $('welcome').classList.add('hidden');
  $('grid').classList.remove('hidden');
  renderGrid();
}

// entries : [{ album, path, name, getFile }] → liste d'albums
async function buildAlbums(entries) {
  coverUrls.forEach(URL.revokeObjectURL);
  coverUrls = [];
  const byAlbum = new Map();
  for (const e of entries) {
    if (!byAlbum.has(e.album)) byAlbum.set(e.album, []);
    byAlbum.get(e.album).push(e);
  }
  const list = [];
  for (const [name, files] of byAlbum) {
    files.sort((a, b) => collator.compare(a.path, b.path));
    const tracks = files.filter((f) => AUDIO_EXT.includes(ext(f.name)));
    if (!tracks.length) continue;
    const images = files.filter((f) => IMAGE_EXT.includes(ext(f.name)));
    const base = (f) => f.name.replace(/\.[^.]+$/, '').toLowerCase();
    const img = ['cover', 'folder', 'front', 'album'].map((p) => images.find((f) => base(f) === p)).find(Boolean) || images[0];
    let cover = null;
    if (img) {
      try { cover = URL.createObjectURL(await img.getFile()); coverUrls.push(cover); } catch {}
    }
    list.push({
      name, cover,
      tracks: tracks.map((f) => ({ title: prettyTitle(f.name), file: f.path, getFile: f.getFile })),
    });
  }
  return list.sort((a, b) => collator.compare(a.name, b.name));
}

// Parcours d'un dossier choisi avec showDirectoryPicker (Chrome, Edge, ChromeOS)
async function scanHandle(root) {
  const entries = [];
  async function walk(dir, album, rel) {
    for await (const h of dir.values()) {
      if (h.name.startsWith('.')) continue;
      const path = rel ? `${rel}/${h.name}` : h.name;
      if (h.kind === 'directory') await walk(h, album, path);
      else if (album) entries.push({ album, path, name: h.name, getFile: () => h.getFile() });
    }
  }
  for await (const h of root.values()) {
    if (h.kind === 'directory' && !h.name.startsWith('.')) await walk(h, h.name, '');
  }
  return buildAlbums(entries);
}

// Parcours d'une sélection <input webkitdirectory> (tous navigateurs)
function scanFileList(files) {
  const entries = [];
  for (const f of files) {
    const parts = f.webkitRelativePath.split('/'); // Racine/Album/…/fichier
    if (parts.length < 3 || parts.some((p) => p.startsWith('.'))) continue;
    entries.push({ album: parts[1], path: parts.slice(2).join('/'), name: f.name, getFile: async () => f });
  }
  return buildAlbums(entries);
}

// Mémorisation du dossier choisi (IndexedDB) pour ne pas le redemander
function idb(mode, fn) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('lecteur-mp3', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction('kv', mode);
      const r = fn(tx.objectStore('kv'));
      tx.oncomplete = () => resolve(r && r.result);
      tx.onerror = () => reject(tx.error);
    };
  });
}
const saveHandle = (h) => idb('readwrite', (s) => s.put(h, 'dossier')).catch(() => {});
const loadHandle = () => idb('readonly', (s) => s.get('dossier')).catch(() => null);

async function openHandle(handle) {
  $('welcome').classList.add('hidden');
  $('loading').classList.remove('hidden');
  try {
    const list = await scanHandle(handle);
    setLibrary(list);
    $('change-folder').classList.remove('hidden');
  } catch (e) {
    $('loading').classList.add('hidden');
    showWelcome();
    alert('Impossible de lire ce dossier.');
  }
}

async function pickFolder() {
  if ('showDirectoryPicker' in window) {
    let handle;
    try { handle = await window.showDirectoryPicker({ id: 'musique', mode: 'read' }); }
    catch { return; } // annulé
    await saveHandle(handle);
    openHandle(handle);
  } else {
    $('dir-input').click();
  }
}

$('dir-input').onchange = async (e) => {
  if (!e.target.files.length) return;
  $('welcome').classList.add('hidden');
  $('loading').classList.remove('hidden');
  setLibrary(await scanFileList(e.target.files));
  $('change-folder').classList.remove('hidden');
};

async function showWelcome() {
  $('grid').classList.add('hidden');
  $('welcome').classList.remove('hidden');
  const handle = 'showDirectoryPicker' in window ? await loadHandle() : null;
  const resume = $('resume');
  if (handle) {
    resume.textContent = `▶ Reprendre « ${handle.name} »`;
    resume.classList.remove('hidden');
    $('pick').textContent = '📁 Choisir un autre dossier';
    resume.onclick = async () => {
      // le navigateur redemande l'autorisation à chaque ouverture : un clic suffit
      const ok = (await handle.queryPermission({ mode: 'read' })) === 'granted'
        || (await handle.requestPermission({ mode: 'read' })) === 'granted';
      if (ok) openHandle(handle);
    };
  } else {
    resume.classList.add('hidden');
    $('pick').textContent = '📁 Choisir mon dossier de musique';
  }
}

$('pick').onclick = pickFolder;
$('change-folder').onclick = () => { $('panel').classList.add('hidden'); showWelcome(); };

async function init() {
  // 1) Lancé avec node server.js : la bibliothèque vient du serveur
  try {
    const r = await fetch('/api/albums');
    if (r.ok && (r.headers.get('content-type') || '').includes('json')) {
      const data = await r.json();
      if (Array.isArray(data)) return setLibrary(data);
    }
  } catch {}
  // 2) Sinon (Vercel, Chromebook…) : choix du dossier dans le navigateur
  const handle = 'showDirectoryPicker' in window ? await loadHandle() : null;
  if (handle && (await handle.queryPermission({ mode: 'read' })) === 'granted') return openHandle(handle);
  showWelcome();
}
init();

// Application installable (Chromebook, PC, Android)
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
