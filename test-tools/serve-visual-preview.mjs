// Serve only the CI-built visual fixture and its public narration data on loopback.
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve(process.argv[2] || 'test-artifacts/hologram-preview/dist/visual-preview')
const narration = path.resolve('test-artifacts/briefing-fixture.json')
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.ttf':'font/ttf', '.svg':'image/svg+xml', '.json':'application/json' }
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1')
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return }
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)
    const file = relative === '/briefing-fixture.json' ? narration : path.resolve(root, '.' + relative)
    if (file !== narration && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return }
    const bytes = await fs.readFile(file)
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' })
    res.end(req.method === 'HEAD' ? undefined : bytes)
  } catch { res.writeHead(404); res.end('Local visual fixture not found') }
}).listen(4175, '127.0.0.1', () => console.log('Read-only visual fixture: http://127.0.0.1:4175'))
