#!/usr/bin/env node
/**
 * migrate-categories.mjs
 *
 * Migrates old PennyWallet transaction files and config to new category schema:
 *   Ledger rows:
 *     - type: repayment  →  type: transfer, category: credit_card_payment
 *     - category: other  →  category: - (displays as 未分類)
 *   Config (.penny-wallet.json):
 *     - types.default: remove "repayment", ensure "transfer" present
 *     - categories.expense/income: remove "other" from default list
 *     - categories: add "transfer" bucket if missing
 *
 * Usage:
 *   node scripts/migrate-categories.mjs <vault-path>          # dry-run
 *   node scripts/migrate-categories.mjs <vault-path> --write  # apply changes
 */

import { readdir, readFile, writeFile } from 'fs/promises'
import { join, basename } from 'path'

const DEFAULT_TRANSFER_CATEGORIES = [
  'account_transfer', 'credit_card_payment',
  'credit_card_refund', 'investment_trade',
]

const [,, vaultPath, flag] = process.argv
const dryRun = flag !== '--write'

if (!vaultPath) {
  console.error('Usage: node scripts/migrate-categories.mjs <vault-path> [--write]')
  process.exit(1)
}

const walletDir = join(vaultPath, 'PennyWallet')

async function findLedgerFiles(dir) {
  let files
  try {
    files = await readdir(dir)
  } catch {
    console.error(`Cannot read directory: ${dir}`)
    process.exit(1)
  }
  return files
    .filter(f => /^\d{4}-\d{2}\.md$/.test(f))
    .map(f => join(dir, f))
}

function migrateRow(line) {
  if (!line.startsWith('|')) return { line, changed: false }

  const cols = line.split('|')
  // Expected: | date | type | wallet | from | to | category | note | amount | [createdAt] |
  if (cols.length < 10) return { line, changed: false }

  const type = cols[2].trim()
  const category = cols[6].trim()

  let newType = type
  let newCategory = category
  let changed = false

  if (type === 'repayment' || type === 'payment') {
    newType = 'transfer'
    if (!newCategory || newCategory === '-') {
      newCategory = 'credit_card_payment'
    }
    changed = true
  }

  if (category === 'other') {
    newCategory = '-'
    changed = true
  }

  if (!changed) return { line, changed: false }

  cols[2] = ` ${newType} `
  cols[6] = ` ${newCategory} `
  return { line: cols.join('|'), changed: true }
}

async function processFile(filePath) {
  const content = await readFile(filePath, 'utf8')
  const lines = content.split('\n')
  let rowsChanged = 0

  const newLines = lines.map(line => {
    const { line: newLine, changed } = migrateRow(line)
    if (changed) rowsChanged++
    return newLine
  })

  return { newContent: newLines.join('\n'), rowsChanged }
}

async function migrateConfig(vaultPath) {
  const configPath = join(vaultPath, '.penny-wallet.json')
  let raw
  try {
    raw = await readFile(configPath, 'utf8')
  } catch {
    console.log('No .penny-wallet.json found, skipping config migration.')
    return
  }

  const config = JSON.parse(raw)
  const changes = []

  // types.default: remove "repayment", ensure "transfer" present
  if (config.options?.types?.default) {
    const types = config.options.types.default
    const hasRepayment = types.includes('repayment')
    const hasTransfer = types.includes('transfer')
    if (hasRepayment || !hasTransfer) {
      config.options.types.default = types
        .filter(t => t !== 'repayment')
        .concat(hasTransfer ? [] : ['transfer'])
      changes.push('types.default: removed "repayment", ensured "transfer" present')
    }
  }

  // categories.expense/income: remove "other" from default
  for (const type of ['expense', 'income']) {
    const bucket = config.options?.categories?.[type]
    if (bucket?.default?.includes('other')) {
      bucket.default = bucket.default.filter(c => c !== 'other')
      changes.push(`categories.${type}.default: removed "other"`)
    }
  }

  // categories.transfer: add if missing
  if (config.options?.categories && !config.options.categories.transfer) {
    config.options.categories.transfer = {
      default: [...DEFAULT_TRANSFER_CATEGORIES],
      custom: [],
    }
    changes.push('categories.transfer: added default transfer bucket')
  }

  if (changes.length === 0) {
    console.log('.penny-wallet.json: no changes needed')
    return
  }

  for (const msg of changes) {
    console.log(`${dryRun ? '[DRY RUN] ' : ''}.penny-wallet.json: ${msg}`)
  }
  if (!dryRun) {
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8')
  }
}

async function main() {
  const files = await findLedgerFiles(walletDir)

  if (files.length === 0) {
    console.log(`No ledger files found in ${walletDir}`)
  }

  let totalFiles = 0
  let totalRows = 0

  for (const filePath of files) {
    const { newContent, rowsChanged } = await processFile(filePath)
    if (rowsChanged > 0) {
      totalFiles++
      totalRows += rowsChanged
      console.log(`${dryRun ? '[DRY RUN] ' : ''}${basename(filePath)}: ${rowsChanged} row(s) updated`)
      if (!dryRun) {
        await writeFile(filePath, newContent, 'utf8')
      }
    }
  }

  if (totalFiles === 0 && files.length > 0) {
    console.log('Ledger files: no changes needed.')
  } else if (totalFiles > 0) {
    console.log(`\nLedger summary: ${totalFiles} file(s), ${totalRows} row(s) ${dryRun ? 'would be ' : ''}updated`)
  }

  await migrateConfig(vaultPath)

  if (dryRun) {
    console.log('\nRun with --write to apply changes.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
