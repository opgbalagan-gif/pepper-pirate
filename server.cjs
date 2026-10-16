const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const base = __dirname, port = Number(process.env.PORT || 4174);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.svg':'image/svg+xml','.json':'application/json'};
const allowed = new Set(['index.html', 'style.css', 'polish.css', 'engine.js', 'app.js', 'dog-animation.js', 'leaderboard.js']);
http.createServer((req, res) => {
  let name;
  try { name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html'; }
  catch { res.writeHead(400).end(); return; }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
  if (!allowed.has(name) && !/^assets\/[\w.-]+\.(png|webp|mp4|svg|json)$/.test(name)) { res.writeHead(404).end(); return; }
  const file = path.join(base, name);
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404).end(); return; }
    let start = 0, end = stat.size - 1, status = 200;
    if (req.headers.range) {
      const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if (!m || +m[1] >= stat.size || (m[2] && +m[2] < +m[1])) {
        res.writeHead(416, {'Content-Range': 'bytes */' + stat.size}).end(); return;
      }
      start = +m[1]; end = m[2] ? Math.min(+m[2], end) : end; status = 206;
    }
    res.writeHead(status, {'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Content-Length': end - start + 1, 'Accept-Ranges':'bytes', 'Cache-Control':'no-cache',
      ...(status === 206 ? {'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size} : {})});
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file, {start, end}).on('error', () => res.destroy()).pipe(res);
  });
}).listen(port, '127.0.0.1', () => console.log('Pepper Pirate: http://localhost:' + port));
