import { Events, ItemView, Platform, WorkspaceLeaf } from 'obsidian'
import { WalletFile } from '../io/WalletFile'
import { TransactionModal } from '../modal/TransactionModal'
import { MobileTransactionModal } from '../modal/MobileTransactionModal'
import { t, formatMonthLabel, formatYearMonth } from '../i18n'
import { currentYearMonth, stepMonth, isAfterCurrentMonth, createMetric } from '../utils'
import { TransactionType } from '../types'
import { DETAIL_VIEW_TYPE } from './DetailView'
import { ASSET_VIEW_TYPE } from './AssetView'
import { MonthData, drawIncExpChart, drawPie, addRectLegend, getMonthRangeEndingAt } from './charts'

export const DASHBOARD_VIEW_TYPE = 'penny-wallet-dashboard'

const C_INCOME  = '#1D9E75'
const C_EXPENSE = '#D85A30'

export class DashboardView extends ItemView {
  private walletFile: WalletFile
  private currentYearMonth: string

  constructor(leaf: WorkspaceLeaf, walletFile: WalletFile) {
    super(leaf)
    this.walletFile = walletFile
    this.currentYearMonth = currentYearMonth()
  }

  getViewType() { return DASHBOARD_VIEW_TYPE }
  getDisplayText() { return t('dashboard.title') }
  getIcon() { return 'pw-icon' }

  async onOpen() {
    this.registerEvent(
      (this.app.workspace as Events).on('penny-wallet:refresh', () => { void this.render() })
    )
    await this.render()
  }

  onClose(): Promise<void> {
    this.contentEl.empty()
    return Promise.resolve()
  }

  async render() {
    const { contentEl } = this
    contentEl.empty()
    contentEl.addClass('pw-dashboard')

    const months = getMonthRangeEndingAt(this.currentYearMonth, 6)

    const [transactions, summaries, netTimeline] = await Promise.all([
      this.walletFile.readMonth(this.currentYearMonth),
      this.walletFile.getMonthSummaries(months),
      this.walletFile.getNetAssetTimeline(months),
    ])

    // ── Header ──────────────────────────────────────────────────────────────
    const header = contentEl.createDiv('pw-nav-row')

    const monthNav = header.createDiv('pw-month-nav')
    const prevBtn = monthNav.createEl('button', { text: '‹', cls: 'pw-nav-btn' })
    monthNav.createEl('span', { text: this.currentYearMonth, cls: 'pw-month-label' })
    const nextBtn = monthNav.createEl('button', { text: '›', cls: 'pw-nav-btn' })

    const isNextFuture = isAfterCurrentMonth(stepMonth(this.currentYearMonth, 1))
    nextBtn.disabled = isNextFuture

    prevBtn.addEventListener('click', () => {
      this.currentYearMonth = stepMonth(this.currentYearMonth, -1)
      void this.render()
    })
    nextBtn.addEventListener('click', () => {
      if (!isNextFuture) { this.currentYearMonth = stepMonth(this.currentYearMonth, 1); void this.render() }
    })

    const headerActions = header.createDiv('pw-nav-right')
    const assetBtn  = headerActions.createEl('button', { text: t('ui.asset'),           cls: 'pw-action-btn' })
    const detailBtn = headerActions.createEl('button', { text: t('ui.detail'),          cls: 'pw-action-btn' })
    const addBtn    = headerActions.createEl('button', { text: '+ ' + t('ui.addTransaction'), cls: 'pw-action-btn' })

    assetBtn.addEventListener('click', () => {
      void this.openOrRevealView(ASSET_VIEW_TYPE)
    })
    detailBtn.addEventListener('click', () => {
      void this.openOrRevealView(DETAIL_VIEW_TYPE, {
        state: { yearMonth: this.currentYearMonth },
      })
    })
    addBtn.addEventListener('click', () => {
      addBtn.disabled = true
      const ModalClass = Platform.isMobile ? MobileTransactionModal : TransactionModal
      new ModalClass(this.app, this.walletFile, {}, null, null,
        () => (this.app.workspace as Events).trigger('penny-wallet:refresh'),
        () => { addBtn.disabled = false },
      ).open()
    })

    const dp = this.walletFile.getConfig().decimalPlaces ?? 0

    // ── Monthly metrics ──────────────────────────────────────────────────────
    let monthIncome = 0, monthExpense = 0
    for (const tx of transactions) {
      if (tx.type === 'income') monthIncome += tx.amount
      if (tx.type === 'expense') monthExpense += tx.amount
    }
    const monthBalance = monthIncome - monthExpense

    const metricsEl = contentEl.createDiv('pw-metrics')
    createMetric(metricsEl, t('dash.income'),  monthIncome,   'income',   dp)
    createMetric(metricsEl, t('dash.expense'), monthExpense,  'expense',  dp)
    createMetric(metricsEl, t('dash.balance'), monthBalance,  monthBalance >= 0 ? 'positive' : 'negative', dp)

    // ── 6-month bar chart ────────────────────────────────────────────────────
    const data: MonthData[] = months.map(ym => ({
      monthLabel: formatMonthLabel(ym),
      tooltipLabel: formatYearMonth(ym, 'short'),
      income: summaries.get(ym)?.income ?? 0,
      expense: summaries.get(ym)?.expense ?? 0,
      net: netTimeline.get(ym) ?? null,
    }))

    // ── 2-column grid: bar chart left, pie charts right ─────────────────────
    const grid2 = contentEl.createDiv('pw-grid-2')

    const incExpCard = grid2.createDiv('pw-card pw-inc-exp-card')
    incExpCard.createEl('div', { text: t('trend.monthlyIncomeExpense'), cls: 'pw-card-title' })
    const legRow = incExpCard.createDiv('pw-leg-row')
    addRectLegend(legRow, C_INCOME, t('dash.income'))
    addRectLegend(legRow, C_EXPENSE, t('dash.expense'))
    const incExpChartWrap = incExpCard.createDiv('pw-chart-wrap')
    const incExpTooltip = incExpChartWrap.createDiv('pw-tooltip')
    incExpTooltip.hide()
    requestAnimationFrame(() => drawIncExpChart(incExpChartWrap, incExpTooltip, data, dp))

    // ── Category pies ────────────────────────────────────────────────────────
    const gridRight = grid2.createDiv('pw-grid-right')

    const expenseMap = this.walletFile.groupByCategory(transactions, 'expense')
    const incomeMap  = this.walletFile.groupByCategory(transactions, 'income')

    const expCard = gridRight.createDiv('pw-card')
    expCard.createEl('div', { text: t('dash.expenseByCategory'), cls: 'pw-card-title' })
    if (expenseMap.size > 0) drawPie(expCard, expenseMap, dp, (cat) => { void this.openDetailWithFilter('expense', cat) }, 160)
    else expCard.createEl('p', { text: t('dash.noData'), cls: 'pw-no-data' })

    const incCard = gridRight.createDiv('pw-card')
    incCard.createEl('div', { text: t('dash.incomeByCategory'), cls: 'pw-card-title' })
    if (incomeMap.size > 0) drawPie(incCard, incomeMap, dp, (cat) => { void this.openDetailWithFilter('income', cat) }, 160)
    else incCard.createEl('p', { text: t('dash.noData'), cls: 'pw-no-data' })
  }

  private async openDetailWithFilter(type: TransactionType, category: string) {
    await this.openOrRevealView(DETAIL_VIEW_TYPE, {
      state: { yearMonth: this.currentYearMonth, filterType: type, filterCategory: category },
    })
  }

  private async openOrRevealView(type: string, options?: { state?: Record<string, unknown> }) {
    const existing = this.app.workspace.getLeavesOfType(type)
    const leaf = existing[0] ?? this.app.workspace.getLeaf('tab')

    await leaf.setViewState({
      type,
      active: true,
      state: options?.state,
    })

    void this.app.workspace.revealLeaf(leaf)
  }
}
