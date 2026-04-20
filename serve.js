const http = require('http');
const fs = require('fs');
const path = require('path');
const { build } = require('./build.js');

const PORT = 8080;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  build();

  const filePath = req.url === '/' ? 'index.html' : req.url.replace(/^\//, '');
  const fullPath = path.join(__dirname, filePath);

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(fs.readFileSync(fullPath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
  console.log('Rebuilds index.html on every browser refresh.');
});
