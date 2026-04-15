#!/usr/bin/env node
/**
 * migrate-add-tags.mjs
 *
 * Migration script: insert `-` Tags column into existing month files.
 *
 * Usage:
 *   node scripts/migrate-add-tags.mjs [vault-path]
 *
 * vault-path defaults to the current directory.
 * Reads .penny-wallet.json to find folderName.
 */

import * as fs from 'fs'
import * as path from 'path'

const vaultPath = process.argv[2] ?? process.cwd()
const configPath = path.join(vaultPath, '.penny-wallet.json')

if (!fs.existsSync(configPath)) {
  console.error(`Config not found: ${configPath}`)
  process.exit(1)
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
const folderName = config.folderName ?? 'PennyWallet'
const folderPath = path.join(vaultPath, folderName)

if (!fs.existsSync(folderPath)) {
  console.error(`Wallet folder not found: ${folderPath}`)
  process.exit(1)
}

const files = fs.readdirSync(folderPath).filter(f => /^\d{4}-\d{2}\.md$/.test(f))
let totalRows = 0

for (const file of files) {
  const filePath = path.join(folderPath, file)
  const lines = fs.readFileSync(filePath, 'utf8').split('\n')
  let changed = false

  const updated = lines.map(line => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) return line

    const cols = trimmed.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1)

    // Header row: add Tags column before Amount (index 7)
    if (cols[0] === 'Date' || cols[0] === '日期') {
      if (!cols.includes('Tags')) {
        const newCols = [...cols.slice(0, 7), 'Tags', ...cols.slice(7)]
        changed = true
        return '| ' + newCols.join(' | ') + ' |'
      }
      return line
    }

    // Separator row
    if (cols.every(c => /^-+$/.test(c))) {
      if (cols.length === 8 || cols.length === 9) {
        const newCols = [...cols.slice(0, 7), '----', ...cols.slice(7)]
        changed = true
        return '| ' + newCols.join(' | ') + ' |'
      }
      return line
    }

    // Data row: only update 8-col or 9-col rows where col[7] is numeric (old format)
    if (cols.length === 8 || cols.length === 9) {
      if (!isNaN(parseFloat(cols[7]))) {
        const newCols = [...cols.slice(0, 7), '-', ...cols.slice(7)]
        changed = true
        totalRows++
        return '| ' + newCols.join(' | ') + ' |'
      }
    }

    return line
  })

  if (changed) {
    fs.writeFileSync(filePath, updated.join('\n'), 'utf8')
    console.log(`  Updated: ${file}`)
  }
}

console.log(`Done. Migrated ${totalRows} transaction rows across ${files.length} files.`)
