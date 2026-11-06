// Lecteur MP3 personnel — serveur local sans dépendance
// Usage : node server.js "C:\Chemin\Vers\Ma Musique" [port]

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const MUSIC_DIR = path.resolve(process.argv[2] || process.env.MUSIC_DIR || '.');
const PORT = Number(process.argv[3] || process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');

const AUDIO_EXT = new Set(['.mp3', '.m4a', '.flac', '.ogg', '.wav', '.aac', '.opus']);
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac',
  '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif',
};

const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });

if (!fs.existsSync(MUSIC_DIR) || !fs.statSync(MUSIC_DIR).isDirectory()) {
  console.error(`Dossier introuvable : ${MUSIC_DIR}`);
  console.error('Usage : node server.js "C:\\Chemin\\Vers\\Ma Musique"');
  process.exit(1);
}

// Liste récursive des fichiers d'un album (gère les sous-dossiers CD1/CD2…)
function listFiles(dir, rel = '') {
  let out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  entries.sort((a, b) => collator.compare(a.name, b.name));
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out = out.concat(listFiles(path.join(dir, e.name), r));
    else out.push(r);
  }
  return out;
}

function pickCover(images) {
  const pref = ['cover', 'folder', 'front', 'album'];
  for (const p of pref) {
    const hit = images.find((f) => path.basename(f, path.extname(f)).toLowerCase() === p);
    if (hit) return hit;
  }
  return images[0] || null;
}

function prettyTitle(file) {
  return path.basename(file, path.extname(file))
    .replace(/^\s*\d{1,3}\s*[-._)\s]\s*/, '') // "01 - Titre" → "Titre"
    .trim() || path.basename(file);
}

function scanLibrary() {
  const dirs = fs.readdirSync(MUSIC_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
    .sort(collator.compare);

  const albums = [];
  for (const name of dirs) {
    const files = listFiles(path.join(MUSIC_DIR, name));
    const tracks = files.filter((f) => AUDIO_EXT.has(path.extname(f).toLowerCase()));
    if (!tracks.length) continue;
    const images = files.filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()));
    const cover = pickCover(images);
    const base = '/music/' + encodeURIComponent(name) + '/';
    const enc = (f) => base + f.split('/').map(encodeURIComponent).join('/');
    albums.push({
      name,
      cover: cover ? enc(cover) : null,
      tracks: tracks.map((f) => ({ title: prettyTitle(f), file: f, url: enc(f) })),
    });
  }
  return albums;
}

// Envoi de fichier avec support des requêtes Range (pour pouvoir avancer dans la piste)
function sendFile(req, res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); return res.end('Introuvable'); }
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m && m[1] ? parseInt(m[1], 10) : 0;
      let end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
      if (m && !m[1] && m[2]) { start = stat.size - parseInt(m[2], 10); end = stat.size - 1; }
      if (start >= stat.size || end >= stat.size || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        return res.end();
      }
      res.writeHead(206, {
        'Content-Type': type, 'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': end - start + 1,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

// Empêche de sortir du dossier autorisé (../)
function safeJoin(root, urlPath) {
  const p = path.resolve(root, '.' + path.sep + urlPath);
  return p === root || p.startsWith(root + path.sep) ? p : null;
}

const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { res.writeHead(400); return res.end(); }

  if (pathname === '/api/albums') {
    try {
      const body = JSON.stringify(scanLibrary());
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(body);
    } catch (e) {
      res.writeHead(500); return res.end(String(e));
    }
  }

  if (pathname.startsWith('/music/')) {
    const p = safeJoin(MUSIC_DIR, pathname.slice('/music/'.length));
    if (!p) { res.writeHead(403); return res.end(); }
    return sendFile(req, res, p);
  }

  const p = safeJoin(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname.slice(1));
  if (!p) { res.writeHead(403); return res.end(); }
  sendFile(req, res, p);
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`🎵 Musique : ${MUSIC_DIR}`);
  console.log(`🎧 Lecteur prêt sur ${url}  (Ctrl+C pour arrêter)`);
  if (!process.env.NO_OPEN) {
    const cmd = process.platform === 'win32' ? `start "" "${url}"`
      : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    exec(cmd, () => {});
  }
});
