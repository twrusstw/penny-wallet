import { ItemView, WorkspaceLeaf } from 'obsidian'
import { WalletFile } from '../io/WalletFile'
import { TransactionModal } from '../modal/TransactionModal'
import { t, translateCategory } from '../i18n'

export const DASHBOARD_VIEW_TYPE = 'penny-wallet-dashboard'

const PIE_COLORS = ['#D85A30','#378ADD','#7F77DD','#1D9E75','#EF9F27','#888780','#5DC8C8','#E8A0BF']

export class DashboardView extends ItemView {
  private walletFile: WalletFile
  private currentYearMonth: string

  constructor(leaf: WorkspaceLeaf, walletFile: WalletFile) {
    super(leaf)
    this.walletFile = walletFile
    this.currentYearMonth = currentYearMonth()
  }

  getViewType() { return DASHBOARD_VIEW_TYPE }
  getDisplayText() { return 'PennyWallet' }
  getIcon() { return 'wallet' }

  async onOpen() {
    this.registerEvent(
      (this.app.workspace as any).on('penny-wallet:refresh', () => this.render())
    )
    await this.render()
  }
  async onClose() { this.contentEl.empty() }

  async render() {
    const { contentEl } = this
    contentEl.empty()
    contentEl.addClass('pw-dashboard')

    const transactions = await this.walletFile.readMonth(this.currentYearMonth)
    const walletBalances = await this.walletFile.calculateAllWalletBalances()
    const netAsset = this.walletFile.computeNetAsset(walletBalances)

    // ── Header ──────────────────────────────────────────────────────────────
    const header = contentEl.createDiv('pw-nav-row')

    const monthNav = header.createDiv('pw-month-nav')
    const prevBtn = monthNav.createEl('button', { text: '‹', cls: 'pw-nav-btn' })
    monthNav.createEl('span', { text: this.currentYearMonth, cls: 'pw-month-label' })
    const nextBtn = monthNav.createEl('button', { text: '›', cls: 'pw-nav-btn' })

    const isNextFuture = isAfterCurrentMonth(stepMonth(this.currentYearMonth, 1))
    nextBtn.disabled = isNextFuture

    prevBtn.addEventListener('click', async () => {
      this.currentYearMonth = stepMonth(this.currentYearMonth, -1)
      await this.render()
    })
    nextBtn.addEventListener('click', async () => {
      if (!isNextFuture) { this.currentYearMonth = stepMonth(this.currentYearMonth, 1); await this.render() }
    })

    const headerActions = header.createDiv('pw-nav-right')
    const detailBtn = headerActions.createEl('button', { text: t('ui.detail'), cls: 'pw-action-btn' })
    const trendBtn  = headerActions.createEl('button', { text: t('ui.trend'),  cls: 'pw-action-btn' })
    const addBtn    = headerActions.createEl('button', { text: '+ ' + t('ui.addTransaction'), cls: 'pw-action-btn' })

    detailBtn.addEventListener('click', () => {
      this.app.workspace.getLeaf('tab').setViewState({
        type: 'penny-wallet-detail', active: true,
        state: { yearMonth: this.currentYearMonth },
      })
    })
    trendBtn.addEventListener('click', () => {
      this.app.workspace.getLeaf('tab').setViewState({ type: 'penny-wallet-trend', active: true })
    })
    addBtn.addEventListener('click', () => {
      new TransactionModal(this.app, this.walletFile, {}, null, null,
        () => (this.app.workspace as any).trigger('penny-wallet:refresh')
      ).open()
    })

    // ── Metrics ─────────────────────────────────────────────────────────────
    let monthIncome = 0, monthExpense = 0
    for (const tx of transactions) {
      if (tx.type === 'income') monthIncome += tx.amount
      if (tx.type === 'expense') monthExpense += tx.amount
    }
    const monthBalance = monthIncome - monthExpense

    const dp = this.walletFile.getConfig().decimalPlaces ?? 0

    const metricsEl = contentEl.createDiv('pw-metrics')
    createMetric(metricsEl, t('dash.income'),  monthIncome,   'income',   dp)
    createMetric(metricsEl, t('dash.expense'), monthExpense,  'expense',  dp)
    createMetric(metricsEl, t('dash.balance'), monthBalance,  monthBalance >= 0 ? 'positive' : 'negative', dp)

    // ── Wallet balances card ─────────────────────────────────────────────────
    const walletCard = contentEl.createDiv('pw-card')
    walletCard.createEl('div', { text: t('dash.walletBalances'), cls: 'pw-card-title' })
    const walletList = walletCard.createDiv('pw-wallet-list')

    for (const { wallet, balance } of walletBalances) {
      if (wallet.status === 'archived') continue
      const row = walletList.createDiv('pw-wallet-row')
      const left = row.createDiv('pw-wallet-left')
      left.createEl('span', {
        text: t(`walletType.${wallet.type}` as any),
        cls: `pw-wallet-badge pw-badge-${wallet.type}`,
      })
      left.createEl('span', { text: wallet.name, cls: 'pw-wallet-name' })

      const displayBalance = wallet.type === 'creditCard' ? -balance : balance
      row.createEl('span', {
        text: formatAmount(displayBalance, dp),
        cls: 'pw-wallet-balance' + (displayBalance < 0 ? ' is-negative' : ''),
      })
    }

    const netRow = walletCard.createDiv('pw-wallet-row pw-net-asset-row')
    netRow.createEl('span', { text: t('dash.netAsset'), cls: 'pw-net-label' })
    netRow.createEl('span', {
      text: formatAmount(netAsset, dp),
      cls: 'pw-net-value' + (netAsset < 0 ? ' is-negative' : ''),
    })

    // ── Pie charts (2 cards side by side) ────────────────────────────────────
    const chartsRow = contentEl.createDiv('pw-charts-row')

    const expenseMap = this.walletFile.groupByCategory(transactions, 'expense')
    const incomeMap  = this.walletFile.groupByCategory(transactions, 'income')

    const expCard = chartsRow.createDiv('pw-card')
    expCard.createEl('div', { text: t('dash.expenseByCategory'), cls: 'pw-card-title' })
    if (expenseMap.size > 0) drawPie(expCard, expenseMap)
    else expCard.createEl('p', { text: t('dash.noData'), cls: 'pw-no-data' })

    const incCard = chartsRow.createDiv('pw-card')
    incCard.createEl('div', { text: t('dash.incomeByCategory'), cls: 'pw-card-title' })
    if (incomeMap.size > 0) drawPie(incCard, incomeMap)
    else incCard.createEl('p', { text: t('dash.noData'), cls: 'pw-no-data' })
  }
}

// ─── Pie chart ────────────────────────────────────────────────────────────────

function drawPie(container: HTMLElement, data: Map<string, number>) {
  const total = [...data.values()].reduce((a, b) => a + b, 0)

  const segments: { label: string; value: number; color: string; start: number; end: number }[] = []
  let angle = -Math.PI / 2
  let ci = 0
  for (const [key, value] of data) {
    const slice = (value / total) * Math.PI * 2
    segments.push({
      label: translateCategory(key),
      value,
      color: PIE_COLORS[ci % PIE_COLORS.length],
      start: angle,
      end: angle + slice,
    })
    angle += slice
    ci++
  }

  const pieWrap = container.createDiv('pw-pie-wrap')

  const SIZE = 120
  const dpr = window.devicePixelRatio || 1
  const CX = SIZE / 2, CY = SIZE / 2
  const R = SIZE / 2 - 8

  const canvas = pieWrap.createEl('canvas')
  canvas.width = SIZE * dpr
  canvas.height = SIZE * dpr
  canvas.style.width = SIZE + 'px'
  canvas.style.height = SIZE + 'px'

  function redraw(hiIdx: number) {
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, SIZE, SIZE)
    segments.forEach((seg, i) => {
      const expand = hiIdx === i ? 4 : 0
      ctx.beginPath()
      ctx.moveTo(CX, CY)
      ctx.arc(CX, CY, R + expand, seg.start, seg.end)
      ctx.closePath()
      ctx.fillStyle = seg.color
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
  }
  redraw(-1)

  const legend = pieWrap.createDiv('pw-pie-legend')
  segments.forEach((seg, i) => {
    const item = legend.createDiv('pw-legend-item')
    const dot = item.createEl('span', { cls: 'pw-legend-dot' })
    dot.style.backgroundColor = seg.color
    item.createEl('span', { text: seg.label, cls: 'pw-legend-name' })
    const pct = Math.round((seg.value / total) * 100)
    item.createEl('span', { text: `${pct}%`, cls: 'pw-legend-pct' })

    item.addEventListener('mouseenter', () => redraw(i))
    item.addEventListener('mouseleave', () => redraw(-1))
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createMetric(container: HTMLElement, label: string, value: number, cls: string, dp: 0 | 2 = 0) {
  const card = container.createDiv('pw-metric')
  card.createEl('div', { text: label, cls: 'pw-metric-label' })
  const prefix = cls === 'income' || cls === 'positive' ? '+' : cls === 'expense' || cls === 'negative' ? '-' : ''
  card.createEl('div', {
    text: prefix + formatAmount(Math.abs(value), dp),
    cls: `pw-metric-value ${cls}`,
  })
}

function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function stepMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function isAfterCurrentMonth(ym: string): boolean {
  return ym > currentYearMonth()
}

function formatAmount(n: number, dp: 0 | 2 = 0): string {
  return Math.abs(n).toLocaleString('zh-TW', { minimumFractionDigits: dp, maximumFractionDigits: dp })
}
