// Mirrors changes from a source blog directory into ./blog so the
// running `vuepress dev` server picks them up and re-renders.
//
// Usage: node watch.js <source-dir>
//
// Mapping follows deploy.sh: <source>/public/* -> blog/.vuepress/public/*,
// everything else -> blog/*.

const chokidar = require('chokidar')
const fs = require('fs')
const path = require('path')

const source = process.argv[2]
if (!source) {
  console.error('Usage: node watch.js <source-dir>')
  process.exit(1)
}

const src = path.resolve(source)
const dest = path.resolve(__dirname, 'blog')

function target(file) {
  const rel = path.relative(src, file)
  if (rel === 'public' || rel.startsWith('public' + path.sep)) {
    return path.join(dest, '.vuepress', rel)
  }
  return path.join(dest, rel)
}

function log(event, file) {
  console.log(`[watch] ${event} ${path.relative(src, file)}`)
}

function copy(file) {
  const to = target(file)
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(file, to)
}

function remove(file) {
  fs.rmSync(target(file), { recursive: true, force: true })
}

function safely(fn, event) {
  return (file) => {
    try {
      fn(file)
      log(event, file)
    } catch (err) {
      console.error(`[watch] ${event} failed for ${file}: ${err.message}`)
    }
  }
}

chokidar
  .watch(src, {
    ignoreInitial: true,
    ignored: [
      /(^|[/\\])\.git([/\\]|$)/,
      /(^|[/\\])node_modules([/\\]|$)/,
      /(^|[/\\])\.DS_Store$/,
      path.join(src, '.temp'),
      path.join(src, '.vuepress', 'dist'),
    ],
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  })
  .on('add', safely(copy, 'add'))
  .on('change', safely(copy, 'change'))
  .on('unlink', safely(remove, 'unlink'))
  .on(
    'addDir',
    safely((file) => fs.mkdirSync(target(file), { recursive: true }), 'addDir')
  )
  .on('unlinkDir', safely(remove, 'unlinkDir'))
  .on('ready', () => console.log(`[watch] Watching ${src} -> ${dest}`))
  .on('error', (err) => console.error(`[watch] ${err.message}`))
