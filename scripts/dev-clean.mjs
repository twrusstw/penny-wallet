#!/usr/bin/env node

import { rm } from 'fs/promises'
import { dirname, join } from 'path'
import process from 'node:process'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const { console } = globalThis

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const demoPluginDir = join(rootDir, 'demo-vault', '.obsidian', 'plugins', 'penny-wallet')

await rm(demoPluginDir, { recursive: true, force: true })
console.log(`[dev-clean] Removed ${demoPluginDir}`)

const child = spawn(process.execPath, [join(rootDir, 'esbuild.config.mjs')], {
  cwd: rootDir,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
