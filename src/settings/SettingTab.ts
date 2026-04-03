import { App, Modal, Notice, PluginSettingTab, Setting } from 'obsidian'
import { WalletFile } from '../io/WalletFile'
import { Wallet, WalletBalance, WalletType } from '../types'
import { t, tn } from '../i18n'

export class PennyWalletSettingTab extends PluginSettingTab {
  private walletFile: WalletFile

  constructor(app: App, plugin: any, walletFile: WalletFile) {
    super(app, plugin)
    this.walletFile = walletFile
  }

  async display(): Promise<void> {
    const { containerEl } = this
    containerEl.empty()
    containerEl.createEl('h2', { text: t('settings.title') })

    let walletBalances: WalletBalance[] = []
    try {
      walletBalances = await this.walletFile.calculateAllWalletBalances()
    } catch { /* show initial balance only if calculation fails */ }

    this.renderGeneral()
    this.renderActiveWallets(walletBalances)
    this.renderArchivedWallets()
    this.renderAddWallet()
    this.renderCategories()
  }

  private renderGeneral() {
    const config = this.walletFile.getConfig()
    const { containerEl } = this

    containerEl.createEl('h3', { text: t('settings.general') })

    new Setting(containerEl)
      .setName(t('settings.folderName'))
      .setDesc(t('settings.folderNameDesc'))
      .addText(text => text
        .setValue(config.folderName)
        .onChange(async (value) => {
          if (value.trim()) {
            this.walletFile.updateConfig({ folderName: value.trim() })
            await this.walletFile.saveConfig()
          }
        }))

    new Setting(containerEl)
      .setName(t('settings.defaultWallet'))
      .setDesc(t('settings.defaultWalletDesc'))
      .addDropdown(drop => {
        const active = config.wallets.filter(w => w.status === 'active')
        for (const w of active) drop.addOption(w.name, w.name)
        drop.setValue(config.defaultWallet)
        drop.onChange(async (value) => {
          this.walletFile.updateConfig({ defaultWallet: value })
          await this.walletFile.saveConfig()
        })
      })
  }

  private renderActiveWallets(walletBalances: WalletBalance[]) {
    const config = this.walletFile.getConfig()
    const { containerEl } = this

    containerEl.createEl('h3', { text: t('settings.activeWallets') })

    const active = config.wallets.filter(w => w.status === 'active')
    if (active.length === 0) {
      containerEl.createEl('p', { text: t('settings.noActiveWallets'), cls: 'pw-settings-empty' })
      return
    }

    for (const wallet of active) {
      const wb = walletBalances.find(b => b.wallet.name === wallet.name)
      const currentBalance = wb?.balance ?? wallet.initialBalance
      const displayCurrent = wallet.type === 'creditCard'
        ? `${t('settings.creditDebtPrefix')}${currentBalance.toLocaleString()}`
        : currentBalance.toLocaleString()

      const desc = `${t('settings.initialBalance')}: ${wallet.initialBalance.toLocaleString()}　｜　${t('settings.currentBalance')}: ${displayCurrent}`

      new Setting(containerEl)
        .setName(`${wallet.name}（${t(`walletType.${wallet.type}` as any)}）`)
        .setDesc(desc)
        .addButton(btn => btn
          .setButtonText(t('ui.edit'))
          .onClick(() => {
            new WalletEditModal(this.app, wallet, async (updated) => {
              const wallets = config.wallets.map(w => w.name === wallet.name ? { ...w, ...updated } : w)
              if (updated.name && updated.name !== wallet.name && config.defaultWallet === wallet.name) {
                this.walletFile.updateConfig({ wallets, defaultWallet: updated.name })
              } else {
                this.walletFile.updateConfig({ wallets })
              }
              await this.walletFile.saveConfig()
              this.display()
            }).open()
          }))
        .addButton(async btn => {
          const hasHistory = await this.walletFile.walletHasTransactions(wallet.name)
          if (hasHistory) {
            btn.setButtonText(t('ui.archive'))
              .setWarning()
              .onClick(() => {
                new ConfirmModal(this.app, t('confirm.archiveWallet'), async () => {
                  const wallets = config.wallets.map(w =>
                    w.name === wallet.name ? { ...w, status: 'archived' as const } : w,
                  )
                  this.walletFile.updateConfig({ wallets })
                  await this.walletFile.saveConfig()
                  this.display()
                }).open()
              })
          } else {
            btn.setButtonText(t('ui.delete'))
              .setWarning()
              .onClick(() => {
                new ConfirmModal(this.app, t('confirm.deleteWallet'), async () => {
                  const wallets = config.wallets.filter(w => w.name !== wallet.name)
                  const defaultWallet = config.defaultWallet === wallet.name
                    ? (wallets.find(w => w.status === 'active')?.name ?? '')
                    : config.defaultWallet
                  this.walletFile.updateConfig({ wallets, defaultWallet })
                  await this.walletFile.saveConfig()
                  this.display()
                }).open()
              })
          }
        })
    }
  }

  private renderArchivedWallets() {
    const config = this.walletFile.getConfig()
    const { containerEl } = this

    const archived = config.wallets.filter(w => w.status === 'archived')
    if (archived.length === 0) return

    containerEl.createEl('h3', { text: t('settings.archivedWallets') })

    for (const wallet of archived) {
      new Setting(containerEl)
        .setName(`${wallet.name}（${t(`walletType.${wallet.type}` as any)}）`)
        .addToggle(toggle => toggle
          .setValue(wallet.includeInNetAsset)
          .setTooltip(t('settings.includeInNetAsset'))
          .onChange(async (value) => {
            const wallets = config.wallets.map(w =>
              w.name === wallet.name ? { ...w, includeInNetAsset: value } : w,
            )
            this.walletFile.updateConfig({ wallets })
            await this.walletFile.saveConfig()
          }))
    }
  }

  private renderAddWallet() {
    const { containerEl } = this
    containerEl.createEl('h3', { text: t('settings.addWallet') })

    let newName = ''
    let newType: WalletType = 'cash'
    let newBalance = 0

    const formEl = containerEl.createDiv('pw-add-wallet-form')

    new Setting(formEl)
      .setName(t('settings.walletName'))
      .addText(text => text
        .setPlaceholder(t('settings.walletName'))
        .onChange(v => { newName = v.trim() }))

    let balanceHintEl: HTMLElement
    new Setting(formEl)
      .setName(t('settings.walletType'))
      .addDropdown(drop => {
        drop.addOption('cash', t('walletType.cash'))
        drop.addOption('bank', t('walletType.bank'))
        drop.addOption('creditCard', t('walletType.creditCard'))
        drop.setValue('cash')
        drop.onChange(v => {
          newType = v as WalletType
          updateBalanceHint()
        })
      })

    new Setting(formEl)
      .setName(t('settings.initialBalance'))
      .addText(text => text
        .setPlaceholder('0')
        .onChange(v => { newBalance = parseFloat(v) || 0 }))

    balanceHintEl = formEl.createDiv('pw-balance-hint')
    updateBalanceHint()

    function updateBalanceHint() {
      balanceHintEl.textContent = newType === 'creditCard'
        ? t('settings.creditBalanceHint')
        : t('settings.cashBankBalanceHint')
    }

    const submitRow = formEl.createDiv('pw-add-wallet-submit')
    const addBtn = submitRow.createEl('button', {
      text: t('settings.addWallet'),
      cls: 'mod-cta',
    })
    addBtn.addEventListener('click', async () => {
      const config = this.walletFile.getConfig()
      if (!newName) { new Notice(t('err.walletNameEmpty')); return }
      if (config.wallets.some(w => w.name === newName)) {
        new Notice(t('err.walletNameDuplicate')); return
      }
      if ((newType === 'cash' || newType === 'bank') && newBalance < 0) {
        new Notice(t('err.cashBankNegativeBalance')); return
      }
      if (newType === 'creditCard' && newBalance < 0) {
        new Notice(t('err.creditNegativeBalance')); return
      }
      const newWallet: Wallet = {
        name: newName,
        type: newType,
        initialBalance: newBalance,
        status: 'active',
        includeInNetAsset: true,
      }
      const wallets = [...config.wallets, newWallet]
      this.walletFile.updateConfig({ wallets })
      await this.walletFile.saveConfig()
      new Notice(tn('notice.walletAdded', { name: newName }))
      this.display()
    })
  }

  private renderCategories() {
    const config = this.walletFile.getConfig()
    const { containerEl } = this

    this.renderCategorySection(
      containerEl,
      t('settings.expenseCategories'),
      config.customExpenseCategories,
      async (updated) => {
        this.walletFile.updateConfig({ customExpenseCategories: updated })
        await this.walletFile.saveConfig()
        this.display()
      },
    )

    this.renderCategorySection(
      containerEl,
      t('settings.incomeCategories'),
      config.customIncomeCategories,
      async (updated) => {
        this.walletFile.updateConfig({ customIncomeCategories: updated })
        await this.walletFile.saveConfig()
        this.display()
      },
    )
  }

  private renderCategorySection(
    container: HTMLElement,
    title: string,
    categories: string[],
    onChange: (updated: string[]) => void,
  ) {
    container.createEl('h3', { text: title })

    const tagsEl = container.createDiv('pw-category-tags')
    for (const cat of categories) {
      const tag = tagsEl.createDiv('pw-category-tag')
      tag.createEl('span', { text: cat })
      const removeBtn = tag.createEl('button', { text: '×', cls: 'pw-tag-remove' })
      removeBtn.addEventListener('click', () => {
        onChange(categories.filter(c => c !== cat))
      })
    }

    const addRow = container.createDiv('pw-category-add-row')
    const input = addRow.createEl('input', {
      type: 'text',
      placeholder: t('settings.categoryPlaceholder'),
      cls: 'pw-category-input',
    })
    const addBtn = addRow.createEl('button', { text: t('settings.addCategory'), cls: 'mod-cta' })
    addBtn.addEventListener('click', () => {
      const val = input.value.trim()
      if (!val) return
      if (categories.includes(val)) { new Notice(t('err.categoryExists')); return }
      onChange([...categories, val])
    })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addBtn.click()
    })
  }
}

// ─── Wallet Edit Modal ────────────────────────────────────────────────────────

class WalletEditModal extends Modal {
  private wallet: Wallet
  private onSave: (patch: Partial<Wallet>) => void
  private name: string
  private balance: number

  constructor(app: App, wallet: Wallet, onSave: (patch: Partial<Wallet>) => void) {
    super(app)
    this.wallet = wallet
    this.onSave = onSave
    this.name = wallet.name
    this.balance = wallet.initialBalance
  }

  onOpen() {
    const { contentEl } = this
    contentEl.createEl('h2', { text: t('ui.edit') })

    const nameRow = contentEl.createDiv('pw-field-row')
    nameRow.createEl('label', { text: t('settings.walletName'), cls: 'pw-field-label' })
    const nameInput = nameRow.createEl('input', { type: 'text', cls: 'pw-field-input' })
    nameInput.value = this.name
    nameInput.addEventListener('input', () => { this.name = nameInput.value.trim() })

    const balanceRow = contentEl.createDiv('pw-field-row')
    balanceRow.createEl('label', { text: t('settings.initialBalance'), cls: 'pw-field-label' })
    const balInput = balanceRow.createEl('input', { type: 'number', cls: 'pw-field-input' })
    balInput.value = String(this.balance)
    balInput.setAttribute('min', '0')
    balInput.addEventListener('input', () => { this.balance = parseFloat(balInput.value) || 0 })

    contentEl.createEl('p', {
      text: this.wallet.type === 'creditCard'
        ? t('settings.creditBalanceHint')
        : t('settings.cashBankBalanceHint'),
      cls: 'pw-balance-hint',
    })

    const btnRow = contentEl.createDiv('pw-btn-row')
    btnRow.createEl('button', { text: t('ui.save'), cls: 'mod-cta' }).addEventListener('click', () => {
      if (!this.name) { new Notice(t('err.walletNameEmpty')); return }
      if ((this.wallet.type === 'cash' || this.wallet.type === 'bank') && this.balance < 0) {
        new Notice(t('err.cashBankNegativeBalance')); return
      }
      if (this.wallet.type === 'creditCard' && this.balance < 0) {
        new Notice(t('err.creditNegativeBalanceShort')); return
      }
      this.onSave({ name: this.name, initialBalance: this.balance })
      this.close()
    })
    btnRow.createEl('button', { text: t('ui.cancel') }).addEventListener('click', () => this.close())
  }

  onClose() { this.contentEl.empty() }
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

class ConfirmModal extends Modal {
  private message: string
  private onConfirm: () => void

  constructor(app: App, message: string, onConfirm: () => void) {
    super(app)
    this.message = message
    this.onConfirm = onConfirm
  }

  onOpen() {
    const { contentEl } = this
    contentEl.createEl('p', { text: this.message })
    const row = contentEl.createDiv('pw-btn-row')
    row.createEl('button', { text: t('ui.confirm'), cls: 'mod-warning' })
      .addEventListener('click', () => { this.close(); this.onConfirm() })
    row.createEl('button', { text: t('ui.cancel') })
      .addEventListener('click', () => this.close())
  }

  onClose() { this.contentEl.empty() }
}
