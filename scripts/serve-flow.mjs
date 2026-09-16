// Minimal static file server for the IFMP Retail demo build.
//
// Why this exists instead of `vite preview`: the demo is served from whichever
// machine runs the Cloudflare tunnel connector. That machine may not have this
// repository, or its node_modules. This script needs only Node and a built
// `dist/` directory, so shipping the build means copying one folder.
//
// It handles the one thing a plain static host gets wrong for a React Router
// app: unknown paths must return index.html with a 200, otherwise a refresh on
// /flow/roster/swaps returns 404.
//
// Usage:
//   node scripts/serve-flow.mjs
//   node scripts/serve-flow.mjs --dir apps/web/dist --port 4174 --host 127.0.0.1
//
// Defaults: --dir apps/web/dist, --port 4174, --host 127.0.0.1

import { createServer } from 'node:http'
import { createReadStream, promises as fs } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'

// ---- options --------------------------------------------------------------

const args = process.argv.slice(2)
function option(name, fallback) {
  const at = args.indexOf(`--${name}`)
  return at !== -1 && args[at + 1] ? args[at + 1] : fallback
}

const root = resolve(option('dir', 'apps/web/dist'))
const port = Number(option('port', '4174'))
const host = option('host', '127.0.0.1')

if (!Number.isFinite(port) || port <= 0) {
  console.error(`Invalid --port: ${option('port', '')}`)
  process.exit(1)
}

try {
  await fs.access(join(root, 'index.html'))
} catch {
  console.error(`No index.html in ${root}`)
  console.error('Build first:  cd apps/web && npm run build')
  process.exit(1)
}

// ---- content types -------------------------------------------------------

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json; charset=utf-8',
}

function contentType(path) {
  return TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream'
}

/**
 * Reject anything that escapes the served directory.
 *
 * The request path is attacker-controlled, and `..` segments or an absolute
 * path could otherwise read files outside the build output.
 */
function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0])
  const candidate = resolve(join(root, normalize(decoded)))
  return candidate === root || candidate.startsWith(root + sep) ? candidate : null
}

async function statFile(path) {
  try {
    const info = await fs.stat(path)
    return info.isFile() ? info : null
  } catch {
    return null
  }
}

// Vite fingerprints everything under /assets, so those can be cached hard.
// index.html must never be cached, or a deploy would not be picked up.
function cacheHeader(path) {
  if (path.endsWith('index.html')) return 'no-cache'
  if (path.includes(`${sep}assets${sep}`)) return 'public, max-age=31536000, immutable'
  return 'public, max-age=3600'
}

// ---- server -------------------------------------------------------------

const server = createServer(async (req, res) => {
  const startedAt = Date.now()
  const urlPath = req.url ?? '/'

  const send = (status, headers, body, note) => {
    res.writeHead(status, headers)
    if (req.method === 'HEAD' || !body) res.end()
    else res.end(body)
    console.log(`${status} ${req.method} ${urlPath} ${Date.now() - startedAt}ms${note ? ` ${note}` : ''}`)
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' }, 'Method Not Allowed')
    return
  }

  const target = safePath(urlPath)
  if (!target) {
    send(400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad Request')
    return
  }

  // A real file wins, so assets, fonts and images are served directly.
  const file = await statFile(target)
  if (file) {
    const stream = createReadStream(target)
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      }
      res.end()
    })
    res.writeHead(200, {
      'Content-Type': contentType(target),
      'Content-Length': file.size,
      'Cache-Control': cacheHeader(target),
      'X-Content-Type-Options': 'nosniff',
    })
    if (req.method === 'HEAD') res.end()
    else stream.pipe(res)
    console.log(`200 ${req.method} ${urlPath} ${Date.now() - startedAt}ms`)
    return
  }

  // Anything else is treated as a client route: hand back the shell and let
  // React Router resolve it. Deliberately a 200, not a 404.
  const indexPath = join(root, 'index.html')
  const index = await statFile(indexPath)
  if (!index) {
    send(500, { 'Content-Type': 'text/plain; charset=utf-8' }, 'index.html missing')
    return
  }

  const html = await fs.readFile(indexPath)
  send(
    200,
    {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': html.byteLength,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
    html,
    'spa-fallback',
  )
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the other server, or pass --port.`)
  } else {
    console.error(error.message)
  }
  process.exit(1)
})

server.listen(port, host, () => {
  console.log('IFMP Retail demo build')
  console.log(`  root  ${root}`)
  console.log(`  url   http://${host}:${port}/flow`)
  console.log('')
  console.log('Deep links fall back to index.html. Ctrl+C to stop.')
})
