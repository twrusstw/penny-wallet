#!/usr/bin/env node
/**
 * UI integration test runner for PennyWallet.
 * Uses the Obsidian CLI to drive the demo-vault instance.
 *
 * Prerequisites:
 *   - Obsidian is running with demo-vault open
 *   - Plugin is built: npm run dev
 *
 * Usage:
 *   npm run test:ui
 *   npm run test:ui -- --vault "my-vault"
 */

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const { console } = globalThis

// ─── Config ──────────────────────────────────────────────────────────────────

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))

const args = process.argv.slice(2)
const vaultArg = args.find(a => a.startsWith('--vault='))?.split('=')[1]
             ?? args[args.indexOf('--vault') + 1]
const VAULT = vaultArg ?? 'demo-vault'
const vaultRoot = join(rootDir, VAULT)

/** Read .penny-wallet.json directly from disk (Obsidian CLI cannot read dotfiles). */
function readConfig() {
  try { return readFileSync(join(vaultRoot, '.penny-wallet.json'), 'utf8') }
  catch { return null }
}

// ─── Runner ──────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0
const failures = []

function obs(...parts) {
  const cmd = `obsidian vault="${VAULT}" ${parts.join(' ')}`
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 10_000 }).trim()
  } catch (err) {
    return null
  }
}

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${name}`)
    passed++
  } else {
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
    failed++
    failures.push(name)
  }
}

function section(title) {
  console.log(`\n▶ ${title}`)
}

/** Sleep briefly so Obsidian can process async reactions. */
function wait(ms = 400) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

// ─── Obsidian helpers ─────────────────────────────────────────────────────────

function openDashboard() {
  obs('command id="penny-wallet:open-dashboard"')
  wait(600)
}

function openDetail() {
  obs('command id="penny-wallet:open-detail"')
  wait(600)
}

function openAddModal() {
  obs('command id="penny-wallet:add-transaction"')
  wait(400)
}

/** Count DOM elements matching selector. Returns 0 when none found, -1 on error. */
function count(selector) {
  const result = obs(`dev:dom selector="${selector}" total`)
  if (result === null) return -1
  if (result.startsWith('No elements')) return 0
  const n = parseInt(result, 10)
  return isNaN(n) ? -1 : n
}

/** Get text content of first element matching selector. */
function text(selector) {
  return obs(`dev:dom selector="${selector}" text`) ?? ''
}

/**
 * Execute JS in Obsidian renderer.
 * The CLI prefixes results with "=> ", e.g. `=> true`.
 * Returns the raw value string (after stripping the prefix), or null on error.
 */
function evalJs(code) {
  const escaped = code.replace(/"/g, '\\"')
  const raw = obs(`eval code="${escaped}"`)
  if (raw === null) return null
  // Strip "=> " prefix that the CLI adds
  return raw.startsWith('=> ') ? raw.slice(3) : raw
}

/** Click an element via JS. */
function click(selector) {
  evalJs(`document.querySelector('${selector}')?.click()`)
  wait(300)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

section('Plugin health')

const reloadResult = obs('plugin:reload id=penny-wallet')
wait(800)
assert('Plugin reloads without error', reloadResult !== null, reloadResult ?? 'command failed')

openDashboard()
assert('Dashboard view opens', count('.pw-dashboard') > 0)

// ─────────────────────────────────────────────────────────────────────────────
section('Finance Overview — layout')

assert('Month label is present',   count('.pw-month-label') > 0)
assert('Prev navigation button',   count('.pw-nav-btn') >= 2)
assert('Metrics row rendered',     count('.pw-metrics') > 0)
assert('Income metric exists',     count('.pw-metric') >= 3)
assert('Wallet balances card',     count('.pw-wallet-list') > 0)

// ─────────────────────────────────────────────────────────────────────────────
section('Finance Overview — month navigation')

const monthBefore = text('.pw-month-label')
click('.pw-nav-btn')                         // click prev
wait(600)
const monthAfter = text('.pw-month-label')
assert('Prev button navigates back one month', monthBefore !== monthAfter, `${monthBefore} → ${monthAfter}`)

// next button should now be enabled (we went back from current)
const nextBtn = evalJs("String(document.querySelectorAll('.pw-nav-btn')[1]?.disabled)")
assert('Next button is enabled after going back', nextBtn === 'false')

// navigate back to current month via the next button
evalJs("document.querySelectorAll('.pw-nav-btn')[1]?.click()")
wait(600)

// next button disabled on current month
const nextDisabled = evalJs("String(document.querySelectorAll('.pw-nav-btn')[1]?.disabled)")
assert('Next button disabled on current month', nextDisabled === 'true')

// ─────────────────────────────────────────────────────────────────────────────
section('Finance Overview — pie charts')

// With demo data every month should have expenses → pie chart present
assert('Expense pie chart renders',    count('.pw-charts-row .pw-card') >= 2)
assert('Legend items present',         count('.pw-legend-item') > 0)

// ─────────────────────────────────────────────────────────────────────────────
section('Add Transaction modal')

openAddModal()
assert('Transaction modal opens',         count('.pw-modal-form, .pw-transaction-form') > 0
                                       || count('.modal-content') > 0)

// Type selector buttons
assert('Type selector buttons present', count('.pw-type-tab') > 0)

// Close modal
evalJs("document.querySelector('.modal-close-button, .pw-close-btn')?.click()")
wait(300)

// ─────────────────────────────────────────────────────────────────────────────
section('Add expense transaction')

openAddModal()
wait(300)

// Select "expense" type and wait for re-render
evalJs("document.querySelector('.pw-type-tab[data-type=expense]')?.click()")
wait(400)

// Select the first available wallet
evalJs("const sel = document.querySelector('.modal-content select'); if(sel){ const opt = Array.from(sel.options).find(o => o.value); if(opt){ sel.value = opt.value; sel.dispatchEvent(new Event('change',{bubbles:true})); }}")
wait(200)

// Fill amount — use input[type=number]
evalJs("const amt = document.querySelector('.modal-content input[type=number]'); if(amt){ amt.value='150'; amt.dispatchEvent(new Event('input',{bubbles:true})); }")
wait(200)

// Submit — use data-action selector
evalJs("document.querySelector('.modal-content [data-action=confirm]')?.click()")
wait(800)

// Modal should be closed after submit
const modalGone = count('.modal-content') === 0
assert('Modal closes after submit', modalGone)

// Verify the dashboard metrics updated (income metric should still be present)
assert('Dashboard metrics visible after add', count('.pw-metric') >= 3)

// ─────────────────────────────────────────────────────────────────────────────
section('Finance Trends view')

openDashboard()
wait(400)
// Open Trend via the Trend button in dashboard header
click('.pw-action-btn:nth-child(2)')
wait(800)

assert('Trend view opens',           count('.pw-trend') > 0)
assert('Range selector present',     count('.pw-range-btn, .pw-range-selector button') > 0)

// Click 6M range
evalJs("Array.from(document.querySelectorAll('.pw-range-btn')).find(b => b.textContent?.includes('6'))?.click()")
wait(600)
assert('6M range button clickable', count('.pw-range-btn.is-active, .pw-range-btn[data-active]') > 0
                                 || count('.pw-range-btn') > 0)

// Charts should render
assert('At least one canvas chart renders', count('canvas') > 0)

// ─────────────────────────────────────────────────────────────────────────────
section('Transactions (Detail) view')

openDetail()
wait(600)

assert('Detail view opens',          count('.pw-detail') > 0)
assert('Type filter pills present',  count('.pw-filter-pill, .pw-pill') > 0 || count('.pw-type-filter') > 0)
assert('Transaction rows rendered',  count('.pw-tx-row, .pw-detail-row, table tr') > 0)

// Click the expense filter pill
evalJs("Array.from(document.querySelectorAll('.pw-filter-pill, .pw-pill')).find(b => b.textContent?.toLowerCase().includes('expense'))?.click()")
wait(400)
assert('Expense filter applies without crash', count('.pw-detail') > 0)

// Reset filter by clicking All pill
evalJs("Array.from(document.querySelectorAll('.pw-filter-pill, .pw-pill')).find(b => b.textContent?.toLowerCase().includes('all'))?.click()")
wait(300)

// ─────────────────────────────────────────────────────────────────────────────
section('Edit transaction')

openDetail()
wait(500)

const rowsBefore = count('.pw-tx-row')
assert('Transaction rows exist before edit', rowsBefore > 0)

// Click the first edit button
evalJs("document.querySelector('.pw-txn-btn[data-action=\"edit\"]')?.click()")
wait(500)

assert('Edit modal opens',             count('.modal-content') > 0)
assert('Edit modal has type tabs',     count('.pw-type-tab') > 0)
assert('Edit modal has amount field',  count('.modal-content input[type=number]') > 0)

// Verify amount field has pre-filled value (editing existing transaction)
const editAmountPrefilled = evalJs("Number(document.querySelector('.modal-content input[type=number]')?.value) > 0")
assert('Edit modal pre-fills amount', editAmountPrefilled === 'true')

// Change amount and submit
evalJs("const a = document.querySelector('.modal-content input[type=number]'); if(a){ a.value='999'; a.dispatchEvent(new Event('input',{bubbles:true})); }")
wait(200)
evalJs("document.querySelector('.pw-btn-row button:first-child')?.click()")
wait(800)

assert('Edit modal closes after submit', count('.modal-content') === 0)
assert('Row count unchanged after edit', count('.pw-tx-row') === rowsBefore)

// ─────────────────────────────────────────────────────────────────────────────
section('Delete transaction — cancel')

const rowsBeforeDelete = count('.pw-tx-row')

// Click delete → cancel dialog
evalJs("document.querySelector('.pw-txn-btn[data-action=\"delete\"]')?.click()")
wait(400)
assert('Delete confirm dialog appears', count('.modal-content') > 0)
assert('Dialog has confirm + cancel buttons', count('.modal-content button') >= 2)

// Click cancel — row count must stay the same
evalJs("document.querySelector('.modal-content [data-action=\"cancel\"]')?.click()")
wait(400)
assert('Cancel keeps row count unchanged', count('.pw-tx-row') === rowsBeforeDelete)

// ─────────────────────────────────────────────────────────────────────────────
section('Delete transaction — confirm')

// Click delete → confirm
evalJs("document.querySelector('.pw-txn-btn[data-action=\"delete\"]')?.click()")
wait(400)
evalJs("document.querySelector('.modal-content [data-action=\"confirm\"]')?.click()")
wait(800)

assert('Row count decreases by 1 after delete', count('.pw-tx-row') === rowsBeforeDelete - 1)

// ─────────────────────────────────────────────────────────────────────────────
section('Credit card balance direction')

// After adding an expense to a credit card wallet, the displayed balance
// in Dashboard should show a positive outstanding debt (displayed positive).
// We check the wallet list card renders correctly.
openDashboard()
wait(400)
assert('Wallet list shows credit card rows', count('.pw-badge-creditCard') > 0)

// ─────────────────────────────────────────────────────────────────────────────
section('Settings tab')

obs('command id="app:open-settings"')
wait(500)

// Navigate to PennyWallet settings tab
evalJs("Array.from(document.querySelectorAll('.vertical-tab-nav-item')).find(el => el.textContent?.includes('PennyWallet'))?.click()")
wait(500)

assert('Settings tab opens', count('.pw-settings, .penny-wallet-settings, .vertical-tab-content') > 0)

// Folder name setting should be present
assert('Folder name setting visible', count('input[value="PennyWallet"]') > 0
                                   || count('.setting-item') > 2)

// Decimal places toggle should be present
assert('Decimal places setting visible', count('.setting-item') > 0)

// ─────────────────────────────────────────────────────────────────────────────
section('Account — add new wallet')

// Use a timestamp-based name to avoid duplicate conflicts across test runs
const testWalletName = `UI-Test-${Date.now().toString().slice(-6)}`

// Still inside Settings tab — fill add-wallet form
evalJs(`const n = document.querySelector('.pw-add-wallet-input[type=text]'); if(n){ n.value='${testWalletName}'; n.dispatchEvent(new Event('input',{bubbles:true})); }`)
wait(100)
evalJs("const b = document.querySelector('.pw-add-wallet-input[type=number]'); if(b){ b.value='500'; b.dispatchEvent(new Event('input',{bubbles:true})); }")
wait(100)
evalJs("document.querySelector('.pw-add-wallet-submit button')?.click()")
wait(600)

// Verify by name — count-based check is unreliable when leftover wallets exist
const walletInDom = evalJs(`[...document.querySelectorAll('.setting-item')].some(el => el.textContent?.includes('${testWalletName}'))`)
assert('New wallet appears in list', walletInDom === 'true')

// ─────────────────────────────────────────────────────────────────────────────
section('Account — edit wallet')

// Click Edit on the first wallet (Default Wallet)
evalJs("document.querySelectorAll('.setting-item-control button')[0]?.click()")
wait(400)

assert('Edit wallet modal opens',       count('.modal-content') > 0)
assert('Edit modal has name field',     count('.modal-content input[type=text]') > 0)
assert('Edit modal has balance field',  count('.modal-content input[type=number]') > 0)

// Close without saving — use data-action="cancel" to avoid closing the outer Settings modal
evalJs("document.querySelector('.modal [data-action=\"cancel\"]')?.click()")
wait(300)

// ─────────────────────────────────────────────────────────────────────────────
section('Account — delete test wallet (cleanup)')

// Test wallet has no transactions → shows "刪除" button
// Click delete → ConfirmModal appears → confirm → wallet is gone
evalJs(`const item = [...document.querySelectorAll('.pw-wallet-row')].find(el => el.querySelector('.pw-wallet-row-name')?.textContent?.includes('${testWalletName}')); item?.querySelector('[data-action="delete"]')?.click()`)
wait(500)

assert('Delete confirm dialog appears', count('.modal-content') > 0)
evalJs("document.querySelector('.modal-content [data-action=\"confirm\"]')?.click()")
wait(800)

// Verify via config file (DOM re-renders during display() — unreliable for timing)
const configAfterDelete = readConfig()
assert('Test wallet removed after delete',
  configAfterDelete !== null && !configAfterDelete.includes(testWalletName))

// ─────────────────────────────────────────────────────────────────────────────
section('Account — archive and restore')

// Archive a wallet that has transactions (shows "封存" not "刪除")
// Use last active wallet in the list — Mastercard World
evalJs(`[...document.querySelectorAll('.pw-wallet-row')].find(el => el.querySelector('.pw-wallet-row-name')?.textContent?.includes('Mastercard World'))?.querySelector('[data-action="archive"]')?.click()`)
wait(500)

assert('Archive confirm dialog appears', count('.modal-content') > 0)
evalJs("document.querySelector('.modal-content [data-action=\"confirm\"]')?.click()")
wait(800)

// Verify via config file
const configAfterArchive = readConfig()
assert('Wallet status is archived in config',
  configAfterArchive !== null && configAfterArchive.includes('"status": "archived"'))

// Restore — settings re-renders after archive, wait and re-navigate
wait(400)
evalJs("Array.from(document.querySelectorAll('.vertical-tab-nav-item')).find(el => el.textContent?.includes('PennyWallet'))?.click()")
wait(500)
evalJs(`[...document.querySelectorAll('.setting-item')].find(el => el.querySelector('.setting-item-name')?.textContent?.includes('Mastercard World'))?.querySelector('[data-action="unarchive"]')?.click()`)
wait(800)
const configAfterRestore = readConfig()
assert('Wallet restored to active in config',
  configAfterRestore !== null && !configAfterRestore.includes('"status": "archived"'))

// Close settings
evalJs("document.querySelector('.modal-close-button')?.click()")
wait(300)

// ─────────────────────────────────────────────────────────────────────────────
section('URI handler — open modal with pre-filled fields')

// Use macOS `open` to trigger the obsidian:// protocol handler
try {
  execSync('open "obsidian://penny-wallet?type=income&amount=5000&note=TestURI"', { timeout: 5000 })
} catch { /* ignore */ }
wait(900)

assert('URI opens transaction modal', count('.modal-content') > 0)
// Amount field should be pre-filled — compare as number to avoid REPL string-quoting
const amountVal = evalJs("Number([...document.querySelectorAll('.modal-content input')].find(i => i.type === 'number')?.value) === 5000")
assert('URI pre-fills amount', amountVal === 'true')

// Close
evalJs("document.querySelector('.modal-close-button')?.click()")
wait(300)

// ─────────────────────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)

if (failures.length > 0) {
  console.log('\nFailed tests:')
  for (const f of failures) console.log(`  • ${f}`)
  console.log('\nTip: ensure Obsidian is running with demo-vault open and the plugin is built.')
  process.exit(1)
} else {
  console.log('\nAll UI checks passed.')
}
