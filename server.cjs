'use strict';
// 零依賴靜態 server：伺服 dist/ + SPA fallback（react-router 需要）
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4048;
const DIST = path.join(__dirname, 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

http
  .createServer((req, res) => {
    try {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = path.normalize(path.join(DIST, p));
      if (file !== DIST && !file.startsWith(DIST + path.sep)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        file = path.join(DIST, 'index.html'); // SPA fallback
      }
      const ext = path.extname(file).toLowerCase();
      // vite 產物帶 hash → 長快取；index.html 永遠即時
      const cache = /-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(file)
        ? 'public, max-age=31536000, immutable'
        : 'no-cache';
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': cache,
        'X-Content-Type-Options': 'nosniff',
      });
      fs.createReadStream(file).pipe(res);
    } catch (err) {
      res.writeHead(500).end('error');
    }
  })
  .listen(PORT, () => process.stdout.write(`happybook static on :${PORT}\n`));
