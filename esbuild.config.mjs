import esbuild from 'esbuild'
import { watch as fsWatch } from 'fs'
import { copyFile, mkdir } from 'fs/promises'
import { dirname, join } from 'path'
import console from 'console'
import process from 'process'
import { builtinModules as builtins } from 'module'
import { fileURLToPath } from 'url'

const banner = `/*
THIS IS A GENERATED/COMPILED FILE AND NOT MEANT TO BE EDITED.
*/
`

const mode = process.argv[2] ?? 'watch'
const prod = mode === 'production'
const watch = mode === 'watch'
const rootDir = dirname(fileURLToPath(import.meta.url))
const outputFile = join(rootDir, 'main.js')
const demoPluginDir = join(rootDir, 'demo-vault', '.obsidian', 'plugins', 'penny-wallet')
const watchedAssetNames = new Set(['manifest.json', 'styles.css'])

let syncInFlight = false
let syncQueued = false

async function syncDemoVault() {
  await mkdir(demoPluginDir, { recursive: true })

  await Promise.all([
    copyFile(outputFile, join(demoPluginDir, 'main.js')),
    copyFile(join(rootDir, 'manifest.json'), join(demoPluginDir, 'manifest.json')),
    copyFile(join(rootDir, 'styles.css'), join(demoPluginDir, 'styles.css')),
  ])

  console.log(`[dev-sync] Synced plugin files to ${demoPluginDir}`)
}

async function requestSync() {
  if (syncInFlight) {
    syncQueued = true
    return
  }

  syncInFlight = true

  try {
    await syncDemoVault()
  } finally {
    syncInFlight = false

    if (syncQueued) {
      syncQueued = false
      await requestSync()
    }
  }
}

function watchStaticAssets() {
  return fsWatch(rootDir, { persistent: true }, async (_eventType, filename) => {
    const changedFile = filename?.toString()
    if (!changedFile || !watchedAssetNames.has(changedFile)) {
      return
    }

    try {
      await requestSync()
    } catch (error) {
      console.error(`[dev-sync] Failed to sync asset change from ${changedFile}`, error)
    }
  })
}

const context = await esbuild.context({
  banner: { js: banner },
  entryPoints: ['src/main.ts'],
  bundle: true,
  loader: {
    '.svg': 'text',
  },
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr',
    ...builtins,
  ],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  minify: prod,
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: outputFile,
  plugins: [
    {
      name: 'sync-demo-vault',
      setup(build) {
        if (prod) {
          return
        }

        build.onEnd(async (result) => {
          if (result.errors.length > 0) {
            return
          }

          await requestSync()
        })
      },
    },
  ],
})

if (!watch) {
  await context.rebuild()
  process.exit(0)
} else {
  const watcher = watchStaticAssets()
  process.once('exit', () => {
    watcher.close()
  })

  await context.watch()
}
