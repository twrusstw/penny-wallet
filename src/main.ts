import { Notice, ObsidianProtocolData, Platform, Plugin, WorkspaceLeaf, addIcon } from 'obsidian'
import { WalletFile } from './io/WalletFile'
import { TransactionModal } from './modal/TransactionModal'
import { MobileTransactionModal } from './modal/MobileTransactionModal'
import { DashboardView, DASHBOARD_VIEW_TYPE } from './view/DashboardView'
import { DetailView, DETAIL_VIEW_TYPE } from './view/DetailView'
import { TrendView, TREND_VIEW_TYPE } from './view/TrendView'
import { PennyWalletSettingTab } from './settings/SettingTab'
import { TransactionModalParams, TransactionType } from './types'
import { initI18n, t } from './i18n'
import pluginIcon from './assets/plugin-icon.svg'

export default class PennyWalletPlugin extends Plugin {
  walletFile!: WalletFile

  async onload() {
    initI18n()

    addIcon('pw-icon', pluginIcon.replace(/^<svg[^>]*>|<\/svg>\s*$/g, ''))

    this.walletFile = new WalletFile(this.app)

    // ── All synchronous registrations FIRST (so ribbon/commands survive restart) ──
    this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf, this.walletFile))
    this.registerView(DETAIL_VIEW_TYPE, (leaf) => new DetailView(leaf, this.walletFile))
    this.registerView(TREND_VIEW_TYPE, (leaf) => new TrendView(leaf, this.walletFile))

    this.addRibbonIcon('pw-icon', 'Penny wallet', () => { void this.openDashboard() })

    this.addCommand({ id: 'open-dashboard', name: 'Open finance overview', callback: () => { void this.openDashboard() } })
    this.addCommand({ id: 'add-transaction', name: 'Add transaction', callback: () => this.openTransactionModal() })
    this.addCommand({ id: 'open-detail', name: 'Open transactions', callback: () => { void this.openDetailView() } })

    this.addSettingTab(new PennyWalletSettingTab(this.app, this, this.walletFile))

    this.registerObsidianProtocolHandler('penny-wallet', (params: ObsidianProtocolData) => {
      this.handleURI(params)
    })

    // ── Async work AFTER all synchronous registrations ──
    try {
      await this.walletFile.loadConfig()
      await this.walletFile.bootstrapFrontmatter()

      // First-launch onboarding: only when config is created in this load
      if (this.walletFile.didCreateDefaultConfigOnLastLoad()) {
        new Notice(t('onboard.welcome'), 8000)
      }
    } catch (e) {
      console.error('PennyWallet: failed to load config', e)
      new Notice(t('notice.loadFailed'))
    }
  }

  // ── Open Views ──────────────────────────────────────────────────────────────

  async openDashboard() {
    await this.openOrRevealView(DASHBOARD_VIEW_TYPE)
  }

  async openDetailView(yearMonth?: string) {
    await this.openOrRevealView(DETAIL_VIEW_TYPE, yearMonth ? { yearMonth } : undefined)
  }

  async openTrendView() {
    await this.openOrRevealView(TREND_VIEW_TYPE)
  }

  openTransactionModal(params: TransactionModalParams = {}) {
    const ModalClass = Platform.isMobile ? MobileTransactionModal : TransactionModal
    new ModalClass(
      this.app,
      this.walletFile,
      params,
      null,
      null,
      () => this.refreshViews(),
    ).open()
  }

  // ── URI Handler ─────────────────────────────────────────────────────────────

  private handleURI(data: ObsidianProtocolData) {
    const params: TransactionModalParams = {}

    if (data['type']) params.type = data['type'] as TransactionType
    if (data['amount']) {
      const amount = parseFloat(data['amount'])
      if (!Number.isNaN(amount)) params.amount = amount
    }
    if (data['note']) params.note = data['note']
    if (data['category']) params.category = data['category']
    if (data['wallet']) params.wallet = data['wallet']
    if (data['fromWallet']) params.fromWallet = data['fromWallet']
    if (data['toWallet']) params.toWallet = data['toWallet']
    if (data['date']) params.date = data['date']

    this.openTransactionModal(params)
  }

  // ── Refresh ─────────────────────────────────────────────────────────────────

  private refreshViews() {
    // Refresh all open PennyWallet leaves
    this.app.workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE).forEach((leaf: WorkspaceLeaf) => {
      void (leaf.view as DashboardView).render()
    })
    this.app.workspace.getLeavesOfType(DETAIL_VIEW_TYPE).forEach((leaf: WorkspaceLeaf) => {
      void (leaf.view as DetailView).render()
    })
  }

  private async openOrRevealView(type: string, state?: Record<string, unknown>) {
    const existing = this.app.workspace.getLeavesOfType(type)
    const leaf = existing[0] ?? this.app.workspace.getLeaf('tab')

    await leaf.setViewState({
      type,
      active: true,
      state,
    })

    void this.app.workspace.revealLeaf(leaf)
  }
}
