import { Events, ItemView, Platform, WorkspaceLeaf } from 'obsidian'
import { WalletFile } from '../io/WalletFile'
import { TransactionModal } from '../modal/TransactionModal'
import { MobileTransactionModal } from '../modal/MobileTransactionModal'
import { t, formatMonthLabel, formatYearMonth } from '../i18n'
import { formatAmount } from '../utils'
import { DETAIL_VIEW_TYPE } from './DetailView'
import { DASHBOARD_VIEW_TYPE } from './DashboardView'
import { MonthData, drawNetChart, drawPie, getMonthRange } from './charts'

export const ASSET_VIEW_TYPE = 'penny-wallet-asset'

export class AssetView extends ItemView {
  private walletFile: WalletFile
  private range: number = 6

  constructor(leaf: WorkspaceLeaf, walletFile: WalletFile) {
    super(leaf)
    this.walletFile = walletFile
  }

  getViewType() { return ASSET_VIEW_TYPE }
  getDisplayText() { return t('asset.title') }
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
    const savedScroll = contentEl.scrollTop
    contentEl.empty()
    contentEl.addClass('pw-asset')

    const months = getMonthRange(this.range)

    const [walletBalances, summaries, netTimeline] = await Promise.all([
      this.walletFile.calculateAllWalletBalances(),
      this.walletFile.getMonthSummaries(months),
      this.walletFile.getNetAssetTimeline(months),
    ])

    const netAsset = this.walletFile.computeNetAsset(walletBalances)
    const dp = this.walletFile.getConfig().decimalPlaces ?? 0

    // ── Header ──────────────────────────────────────────────────────────────
    const header = contentEl.createDiv('pw-nav-row')

    const headerActions = header.createDiv('pw-nav-right')
    const overviewBtn = headerActions.createEl('button', { text: t('ui.overview'),              cls: 'pw-action-btn' })
    const detailBtn   = headerActions.createEl('button', { text: t('ui.detail'),                cls: 'pw-action-btn' })
    const addBtn      = headerActions.createEl('button', { text: '+ ' + t('ui.addTransaction'), cls: 'pw-action-btn' })

    overviewBtn.addEventListener('click', () => void this.openOrRevealView(DASHBOARD_VIEW_TYPE))
    detailBtn.addEventListener('click', () => void this.openOrRevealView(DETAIL_VIEW_TYPE))
    addBtn.addEventListener('click', () => {
      addBtn.disabled = true
      const ModalClass = Platform.isMobile ? MobileTransactionModal : TransactionModal
      new ModalClass(this.app, this.walletFile, {}, null, null,
        () => (this.app.workspace as Events).trigger('penny-wallet:refresh'),
        () => { addBtn.disabled = false },
      ).open()
    })

    // ── 2-column grid ────────────────────────────────────────────────────────
    const grid = contentEl.createDiv('pw-grid-2 pw-asset-grid')

    // ── Left column ─────────────────────────────────────────────────────────
    const leftCol = grid.createDiv('pw-asset-left')

    // Wallet balances card
    const walletCard = leftCol.createDiv('pw-card')
    walletCard.createEl('div', { text: t('dash.walletBalances'), cls: 'pw-card-title' })
    const walletList = walletCard.createDiv('pw-wallet-list')

    for (const { wallet, balance } of walletBalances) {
      if (wallet.status === 'archived') continue
      const row = walletList.createDiv('pw-wallet-row')
      const left = row.createDiv('pw-wallet-left')
      left.createEl('span', {
        text: t(`walletType.${wallet.type}`),
        cls: `pw-wallet-badge pw-badge-${wallet.type}`,
      })
      left.createEl('span', { text: wallet.name, cls: 'pw-wallet-name' })

      const displayBalance = wallet.type === 'creditCard' ? -balance : balance
      row.createEl('span', {
        text: formatAmount(Math.abs(displayBalance), dp),
        cls: 'pw-wallet-balance' + (displayBalance < 0 ? ' is-negative' : ''),
      })
    }

    const netRow = walletCard.createDiv('pw-wallet-row pw-net-asset-row')
    netRow.createEl('span', { text: t('dash.netAsset'), cls: 'pw-net-label' })
    netRow.createEl('span', {
      text: formatAmount(Math.abs(netAsset), dp),
      cls: 'pw-net-value' + (netAsset < 0 ? ' is-negative' : ''),
    })

    // Asset allocation pie (≥2 positive-balance non-credit wallets)
    const assetMap = new Map<string, number>()
    for (const { wallet, balance } of walletBalances) {
      if (wallet.status === 'archived') continue
      if (wallet.type === 'creditCard') continue
      if (balance > 0) assetMap.set(wallet.name, balance)
    }
    if (assetMap.size >= 2) {
      const assetCard = leftCol.createDiv('pw-card')
      assetCard.createEl('div', { text: t('dash.assetAllocation'), cls: 'pw-card-title' })
      drawPie(assetCard, assetMap, dp)
    }

    // ── Right column ─────────────────────────────────────────────────────────
    const rightCol = grid.createDiv('pw-asset-right')

    // Net asset trend card (with range picker inside)
    const netCard = rightCol.createDiv('pw-card')
    const netCardHeader = netCard.createDiv('pw-card-header-row')
    netCardHeader.createEl('div', { text: t('asset.netAssetTrend'), cls: 'pw-card-title' })
    const rangeRow = netCardHeader.createDiv('pw-range-row')
    for (const r of [3, 6, 12]) {
      rangeRow.createEl('button', {
        text: t(`trend.${r}m` as 'trend.3m' | 'trend.6m' | 'trend.12m'),
        cls: 'pw-range-btn' + (this.range === r ? ' is-active' : ''),
      }).addEventListener('click', () => {
        this.range = r
        void this.render()
      })
    }

    const data: MonthData[] = months.map(ym => ({
      monthLabel: formatMonthLabel(ym),
      tooltipLabel: formatYearMonth(ym, 'short'),
      income: summaries.get(ym)?.income ?? 0,
      expense: summaries.get(ym)?.expense ?? 0,
      net: netTimeline.get(ym) ?? null,
    }))

    const netChartWrap = netCard.createDiv('pw-chart-wrap')
    const netTooltip = netChartWrap.createDiv('pw-tooltip')
    netTooltip.hide()

    requestAnimationFrame(() => {
      drawNetChart(netChartWrap, netTooltip, data, dp)
      contentEl.scrollTop = savedScroll
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
