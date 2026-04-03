import { Notice, ObsidianProtocolData, Plugin, WorkspaceLeaf } from 'obsidian'
import { WalletFile } from './io/WalletFile'
import { TransactionModal } from './modal/TransactionModal'
import { DashboardView, DASHBOARD_VIEW_TYPE } from './view/DashboardView'
import { DetailView, DETAIL_VIEW_TYPE } from './view/DetailView'
import { TrendView, TREND_VIEW_TYPE } from './view/TrendView'
import { PennyWalletSettingTab } from './settings/SettingTab'
import { TransactionModalParams } from './types'
import { initI18n, t } from './i18n'

export default class PennyWalletPlugin extends Plugin {
  walletFile!: WalletFile

  async onload() {
    initI18n()

    this.walletFile = new WalletFile(this.app)

    // ── All synchronous registrations FIRST (so ribbon/commands survive restart) ──
    this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf, this.walletFile))
    this.registerView(DETAIL_VIEW_TYPE, (leaf) => new DetailView(leaf, this.walletFile))
    this.registerView(TREND_VIEW_TYPE, (leaf) => new TrendView(leaf, this.walletFile))

    this.addRibbonIcon('wallet', 'PennyWallet', () => this.openDashboard())

    this.addCommand({ id: 'open-dashboard', name: 'Open Dashboard', callback: () => this.openDashboard() })
    this.addCommand({ id: 'add-transaction', name: 'Add Transaction', callback: () => this.openTransactionModal() })
    this.addCommand({ id: 'open-detail', name: 'Open Detail View', callback: () => this.openDetailView() })

    this.addSettingTab(new PennyWalletSettingTab(this.app, this, this.walletFile))

    this.registerObsidianProtocolHandler('penny-wallet', (params: ObsidianProtocolData) => {
      this.handleURI(params)
    })

    // ── Async work AFTER all synchronous registrations ──
    try {
      await this.walletFile.loadConfig()
      await this.walletFile.bootstrapFrontmatter()

      // First-launch onboarding: only one default wallet
      const config = this.walletFile.getConfig()
      if (config.wallets.length === 1 && config.wallets[0].type === 'cash') {
        new Notice(t('onboard.welcome'), 8000)
      }
    } catch (e) {
      console.error('PennyWallet: failed to load config', e)
      new Notice(t('notice.loadFailed'))
    }
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(DASHBOARD_VIEW_TYPE)
    this.app.workspace.detachLeavesOfType(DETAIL_VIEW_TYPE)
    this.app.workspace.detachLeavesOfType(TREND_VIEW_TYPE)
  }

  // ── Open Views ──────────────────────────────────────────────────────────────

  async openDashboard() {
    const existing = this.app.workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE)
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0])
      return
    }
    const leaf = this.app.workspace.getLeaf('tab')
    await leaf.setViewState({ type: DASHBOARD_VIEW_TYPE, active: true })
    this.app.workspace.revealLeaf(leaf)
  }

  async openDetailView(yearMonth?: string) {
    const leaf = this.app.workspace.getLeaf('tab')
    await leaf.setViewState({
      type: DETAIL_VIEW_TYPE,
      active: true,
      state: yearMonth ? { yearMonth } : undefined,
    })
    this.app.workspace.revealLeaf(leaf)
  }

  openTransactionModal(params: TransactionModalParams = {}) {
    new TransactionModal(
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

    if (data['type']) params.type = data['type'] as any
    if (data['amount']) params.amount = parseFloat(data['amount'])
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
      (leaf.view as DashboardView).render()
    })
    this.app.workspace.getLeavesOfType(DETAIL_VIEW_TYPE).forEach((leaf: WorkspaceLeaf) => {
      (leaf.view as DetailView).render()
    })
  }
}
