#!/usr/bin/env node

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { dirname } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const { console } = globalThis

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const vaultRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.join(rootDir, 'demo-vault')
const seed = 20260403

const CASH_WALLET = 'Default Wallet'
const PRIMARY_BANK = 'HSBC Premier'
const SECONDARY_BANK = 'Citibank'
const PRIMARY_CARD = 'Visa Platinum'
const SECONDARY_CARD = 'Mastercard World'

const wallets = [
  {
    name: CASH_WALLET,
    type: 'cash',
    initialBalance: 8000,
    status: 'active',
    includeInNetAsset: true,
  },
  {
    name: PRIMARY_BANK,
    type: 'bank',
    initialBalance: 120000,
    status: 'active',
    includeInNetAsset: true,
  },
  {
    name: SECONDARY_BANK,
    type: 'bank',
    initialBalance: 45000,
    status: 'active',
    includeInNetAsset: true,
  },
  {
    name: PRIMARY_CARD,
    type: 'creditCard',
    initialBalance: 2500,
    status: 'active',
    includeInNetAsset: true,
  },
  {
    name: SECONDARY_CARD,
    type: 'creditCard',
    initialBalance: 1800,
    status: 'active',
    includeInNetAsset: true,
  },
]

const config = {
  wallets,
  defaultWallet: CASH_WALLET,
  folderName: 'PennyWallet',
  decimalPlaces: 0,
  options: {
    types: { default: ['expense', 'income', 'transfer', 'repayment'], custom: [] },
    categories: {
      expense: { default: ['food', 'transport', 'shopping', 'entertainment', 'medical', 'housing', 'other'], custom: [] },
      income:  { default: ['salary', 'bonus', 'side_income', 'other'], custom: [] },
    },
  },
}

const configPath = path.join(vaultRoot, '.penny-wallet.json')
const dataDir = path.join(vaultRoot, config.folderName)
const legacyDataDirs = ['PennyWallet', 'ledgers']
  .filter(dirName => dirName !== config.folderName)
  .map(dirName => path.join(vaultRoot, dirName))

const expenseWalletPool = [CASH_WALLET, PRIMARY_BANK, SECONDARY_BANK, PRIMARY_CARD, SECONDARY_CARD]
const incomeWalletPool = [PRIMARY_BANK, SECONDARY_BANK, CASH_WALLET]
const creditCards = [PRIMARY_CARD, SECONDARY_CARD]
const notes = {
  food: ['Breakfast', 'Lunch', 'Dinner', 'Coffee', 'Snack'],
  transport: ['Metro', 'Bus', 'Parking', 'High Speed Rail'],
  shopping: ['Groceries', 'Online Shopping', 'Clothing', 'Electronics'],
  entertainment: ['Movie', 'Dining Out', 'Streaming', 'Weekend Trip'],
  medical: ['Clinic Visit', 'Pharmacy', 'Health Check'],
  housing: ['Rent', 'Utilities', 'Management Fee', 'Internet Bill'],
  other: ['Insurance', 'Service Fee', 'Miscellaneous'],
  salary: ['Monthly Salary'],
  bonus: ['Performance Bonus', 'Year-end Bonus'],
  side_income: ['Freelance Work', 'Marketplace Sale', 'Investment Cashback'],
}

function mulberry32(value) {
  let seedValue = value >>> 0
  return function random() {
    seedValue += 0x6D2B79F5
    let t = seedValue
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = mulberry32(seed)

function randInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min
}

function chance(rate) {
  return random() < rate
}

function pick(list) {
  return list[randInt(0, list.length - 1)]
}

function weightedPick(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = random() * total
  for (const entry of entries) {
    roll -= entry.weight
    if (roll <= 0) return entry.value
  }
  return entries[entries.length - 1].value
}

function formatMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthDay(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function createDate(year, monthIndex, day) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  return new Date(year, monthIndex, Math.min(day, daysInMonth))
}

function makeTransaction(date, type, partial) {
  const createdAt = new Date(date)
  createdAt.setHours(randInt(0, 23), randInt(0, 59), randInt(0, 59), randInt(0, 999))
  return {
    date,
    type,
    wallet: partial.wallet,
    fromWallet: partial.fromWallet,
    toWallet: partial.toWallet,
    category: partial.category,
    note: partial.note ?? '',
    amount: partial.amount,
    createdAt: createdAt.toISOString(),
  }
}

function formatRow(tx) {
  return `| ${formatMonthDay(tx.date)} | ${tx.type} | ${tx.wallet ?? '-'} | ${tx.fromWallet ?? '-'} | ${tx.toWallet ?? '-'} | ${tx.category ?? '-'} | ${tx.note || '-'} | ${tx.amount} | ${tx.createdAt ?? '-'} |`
}

function computeSummary(transactions) {
  let income = 0
  let expense = 0
  for (const tx of transactions) {
    if (tx.type === 'income') income += tx.amount
    if (tx.type === 'expense') expense += tx.amount
  }
  return { income, expense, netAsset: 0 }
}

function buildMonthContent(yearMonth, transactions) {
  const summary = computeSummary(transactions)
  const frontmatter = `---\nincome: ${summary.income}\nexpense: ${summary.expense}\nnetAsset: ${summary.netAsset}\n---\n`
  const header = `\n## ${yearMonth}\n\n| Date | Type | Wallet | From | To | Category | Note | Amount | CreatedAt |\n|------|------|--------|------|----|----------|------|--------|-----------|`
  const rows = transactions.map(formatRow).join('\n')
  return frontmatter + header + (rows ? `\n${rows}` : '') + '\n'
}

function applyTransaction(state, tx) {
  switch (tx.type) {
    case 'income':
      if (tx.wallet) state.balances[tx.wallet] += tx.amount
      break
    case 'expense': {
      if (!tx.wallet) break
      const walletType = state.walletTypes[tx.wallet]
      if (walletType === 'creditCard') state.balances[tx.wallet] += tx.amount
      else state.balances[tx.wallet] -= tx.amount
      break
    }
    case 'transfer':
      if (tx.fromWallet) state.balances[tx.fromWallet] -= tx.amount
      if (tx.toWallet) state.balances[tx.toWallet] += tx.amount
      break
    case 'repayment':
      if (tx.fromWallet) state.balances[tx.fromWallet] -= tx.amount
      if (tx.toWallet) state.balances[tx.toWallet] -= tx.amount
      break
  }
}

function generateFoodExpense(year, monthIndex) {
  const wallet = weightedPick([
    { value: CASH_WALLET, weight: 4 },
    { value: PRIMARY_CARD, weight: 3 },
    { value: SECONDARY_CARD, weight: 2 },
    { value: SECONDARY_BANK, weight: 1 },
  ])
  return makeTransaction(createDate(year, monthIndex, randInt(1, 28)), 'expense', {
    wallet,
    category: 'food',
    note: pick(notes.food),
    amount: randInt(90, 420),
  })
}

function generateTransportExpense(year, monthIndex) {
  const wallet = weightedPick([
    { value: CASH_WALLET, weight: 5 },
    { value: SECONDARY_BANK, weight: 2 },
    { value: PRIMARY_CARD, weight: 1 },
  ])
  return makeTransaction(createDate(year, monthIndex, randInt(1, 28)), 'expense', {
    wallet,
    category: 'transport',
    note: pick(notes.transport),
    amount: randInt(35, 220),
  })
}

function generateLifestyleExpense(year, monthIndex, category, walletOptions, amountRange) {
  return makeTransaction(createDate(year, monthIndex, randInt(1, 28)), 'expense', {
    wallet: pick(walletOptions),
    category,
    note: pick(notes[category]),
    amount: randInt(amountRange[0], amountRange[1]),
  })
}

function generateMonthTransactions(monthDate, state) {
  const year = monthDate.getFullYear()
  const monthIndex = monthDate.getMonth()
  const monthNumber = monthIndex + 1
  const transactions = []

  const salaryAmount = randInt(68000, 78000)
  transactions.push(makeTransaction(createDate(year, monthIndex, randInt(3, 5)), 'income', {
    wallet: PRIMARY_BANK,
    category: 'salary',
    note: pick(notes.salary),
    amount: salaryAmount,
  }))

  transactions.push(makeTransaction(createDate(year, monthIndex, randInt(5, 8)), 'transfer', {
    fromWallet: PRIMARY_BANK,
    toWallet: CASH_WALLET,
    note: 'Cash Withdrawal',
    amount: randInt(6000, 12000),
  }))

  if (chance(0.8)) {
    transactions.push(makeTransaction(createDate(year, monthIndex, randInt(6, 10)), 'income', {
      wallet: pick(incomeWalletPool),
      category: 'side_income',
      note: pick(notes.side_income),
      amount: randInt(1800, 12000),
    }))
  }

  if ([1, 4, 8, 12].includes(monthNumber) || chance(0.15)) {
    transactions.push(makeTransaction(createDate(year, monthIndex, randInt(8, 12)), 'income', {
      wallet: SECONDARY_BANK,
      category: 'bonus',
      note: pick(notes.bonus),
      amount: randInt(8000, 30000),
    }))
  }

  transactions.push(makeTransaction(createDate(year, monthIndex, 2), 'expense', {
    wallet: PRIMARY_BANK,
    category: 'housing',
    note: 'Rent',
    amount: randInt(17000, 22000),
  }))

  transactions.push(makeTransaction(createDate(year, monthIndex, randInt(10, 13)), 'expense', {
    wallet: SECONDARY_BANK,
    category: 'housing',
    note: pick(['Utilities', 'Management Fee', 'Internet Bill']),
    amount: randInt(1200, 3200),
  }))

  transactions.push(makeTransaction(createDate(year, monthIndex, randInt(7, 10)), 'transfer', {
    fromWallet: PRIMARY_BANK,
    toWallet: SECONDARY_BANK,
    note: 'Transfer to Savings',
    amount: randInt(8000, 18000),
  }))

  const foodCount = randInt(10, 18)
  const transportCount = randInt(6, 12)
  const shoppingCount = randInt(2, 5)
  const entertainmentCount = randInt(1, 4)
  const medicalCount = chance(0.55) ? randInt(0, 2) : 0
  const otherCount = randInt(1, 3)

  for (let index = 0; index < foodCount; index++) {
    transactions.push(generateFoodExpense(year, monthIndex))
  }
  for (let index = 0; index < transportCount; index++) {
    transactions.push(generateTransportExpense(year, monthIndex))
  }
  for (let index = 0; index < shoppingCount; index++) {
    transactions.push(generateLifestyleExpense(year, monthIndex, 'shopping', expenseWalletPool, [350, 4200]))
  }
  for (let index = 0; index < entertainmentCount; index++) {
    transactions.push(generateLifestyleExpense(year, monthIndex, 'entertainment', [PRIMARY_CARD, SECONDARY_CARD, SECONDARY_BANK], [280, 3600]))
  }
  for (let index = 0; index < medicalCount; index++) {
    transactions.push(generateLifestyleExpense(year, monthIndex, 'medical', [CASH_WALLET, SECONDARY_CARD, SECONDARY_BANK], [180, 1800]))
  }
  for (let index = 0; index < otherCount; index++) {
    transactions.push(generateLifestyleExpense(year, monthIndex, 'other', [PRIMARY_BANK, SECONDARY_BANK, PRIMARY_CARD], [120, 2600]))
  }

  const monthlyCardSpend = Object.fromEntries(creditCards.map(card => [card, 0]))
  for (const tx of transactions) {
    if (tx.type === 'expense' && creditCards.includes(tx.wallet ?? '')) {
      monthlyCardSpend[tx.wallet] += tx.amount
    }
  }

  for (const card of creditCards) {
    const outstandingDebt = state.balances[card] + monthlyCardSpend[card]
    const paymentBase = monthlyCardSpend[card] * (0.86 + random() * 0.1)
    const extraPaydown = outstandingDebt > 5000 ? randInt(300, 1200) : 0
    const repayment = Math.min(outstandingDebt, Math.round(paymentBase + extraPaydown))
    if (repayment <= 0) continue
    transactions.push(makeTransaction(createDate(year, monthIndex, randInt(24, 27)), 'repayment', {
      fromWallet: weightedPick([
        { value: PRIMARY_BANK, weight: 4 },
        { value: SECONDARY_BANK, weight: 2 },
      ]),
      toWallet: card,
      note: 'Card Payment',
      amount: repayment,
    }))
  }

  const ascending = [...transactions].sort((left, right) => {
    const dateCompare = left.date - right.date
    if (dateCompare !== 0) return dateCompare
    return left.createdAt.localeCompare(right.createdAt)
  })
  for (const tx of ascending) {
    applyTransaction(state, tx)
  }

  return ascending.sort((left, right) => {
    const dateCompare = right.date - left.date
    if (dateCompare !== 0) return dateCompare
    return right.createdAt.localeCompare(left.createdAt)
  })
}

async function clearExistingMonthFiles() {
  const entries = await fs.readdir(dataDir, { withFileTypes: true })
  await Promise.all(entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => fs.unlink(path.join(dataDir, entry.name))))
}

async function removeLegacyDataDirs() {
  await Promise.all(legacyDataDirs.map(async (dirPath) => {
    await fs.rm(dirPath, { recursive: true, force: true })
  }))
}

async function main() {
  await fs.mkdir(dataDir, { recursive: true })
  await removeLegacyDataDirs()
  await clearExistingMonthFiles()
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')

  const state = {
    balances: Object.fromEntries(wallets.map(wallet => [wallet.name, wallet.initialBalance])),
    walletTypes: Object.fromEntries(wallets.map(wallet => [wallet.name, wallet.type])),
  }

  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)

  const months = []
  for (let offset = 11; offset >= 0; offset--) {
    months.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - offset, 1))
  }

  for (const monthDate of months) {
    const yearMonth = formatMonth(monthDate)
    const transactions = generateMonthTransactions(monthDate, state)
    const content = buildMonthContent(yearMonth, transactions)
    await fs.writeFile(path.join(dataDir, `${yearMonth}.md`), content, 'utf8')
  }

  const summary = wallets.map(wallet => {
    const balance = Math.round(state.balances[wallet.name])
    return `${wallet.name}: ${balance}`
  }).join(', ')

  console.log(`Generated 12 months of demo data in ${dataDir}`)
  console.log(`Wallet snapshot: ${summary}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
