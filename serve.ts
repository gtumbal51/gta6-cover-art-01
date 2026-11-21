// A minimal static file server for trying the app locally.
//
//   node serve.ts            ->  http://localhost:8080
//
// It serves only the app/ folder beside this file, picks a Content-Type
// from the file extension, and turns anything that would escape app/
// into a 403. Node 22 standard library only; there is no build step
// and nothing to install.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const PORT = 8080;

const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
  ['.woff', 'font/woff'],
  ['.ttf', 'font/ttf'],
]);

function sendText(res, status, body) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(body);
}

const server = createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  } catch {
    sendText(res, 400, 'bad request\n');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  const target = resolve(join(APP_ROOT, normalize(pathname)));
  if (target !== APP_ROOT && !target.startsWith(APP_ROOT + sep)) {
    sendText(res, 403, 'forbidden\n');
    return;
  }

  let size;
  try {
    const info = statSync(target);
    if (!info.isFile()) throw new Error('directory');
    size = info.size;
  } catch {
    sendText(res, 404, 'not found\n');
    return;
  }

  res.writeHead(200, {
    'content-type': TYPES.get(extname(target).toLowerCase()) ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(target).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Vice Heat Studio is live at http://localhost:${PORT}`);
});
