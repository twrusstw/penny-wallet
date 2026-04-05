import { describe, it, expect } from 'vitest'
import { WalletFile } from '../../src/io/WalletFile'
import { DEFAULT_CONFIG } from '../../src/types'
import { createMockApp } from '../helpers/mockApp'

// ── loadConfig ────────────────────────────────────────────────────────────────

describe('loadConfig', () => {
  it('creates a default config on first launch (no file)', async () => {
    const { app, store } = createMockApp() // empty vault
    const wf = new WalletFile(app)
    const config = await wf.loadConfig()

    expect(config.wallets).toHaveLength(1)
    // setup.ts stubs window.moment.locale() → 'en', so default wallet name is 'Cash'
    expect(config.wallets[0].name).toBeTruthy()
    expect(store.has('.penny-wallet.json')).toBe(true)
  })

  it('loads config from existing .penny-wallet.json', async () => {
    const saved = { ...DEFAULT_CONFIG, defaultWallet: 'MyBank', wallets: [
      { name: 'MyBank', type: 'bank' as const, initialBalance: 9999, status: 'active' as const, includeInNetAsset: true },
    ]}
    const { app } = createMockApp({ '.penny-wallet.json': JSON.stringify(saved) })
    const wf = new WalletFile(app)
    const config = await wf.loadConfig()

    expect(config.defaultWallet).toBe('MyBank')
    expect(config.wallets[0].initialBalance).toBe(9999)
  })

  it('falls back to DEFAULT_CONFIG for malformed JSON', async () => {
    const { app } = createMockApp({ '.penny-wallet.json': '{ invalid json }' })
    const wf = new WalletFile(app)
    const config = await wf.loadConfig()

    expect(config.wallets).toEqual(DEFAULT_CONFIG.wallets)
    expect(config.folderName).toBe(DEFAULT_CONFIG.folderName)
  })
})

// ── saveConfig / updateConfig ─────────────────────────────────────────────────

describe('saveConfig + updateConfig', () => {
  it('persists a patched config to the vault', async () => {
    const { app, store } = createMockApp({ '.penny-wallet.json': JSON.stringify(DEFAULT_CONFIG) })
    const wf = new WalletFile(app)
    await wf.loadConfig()

    wf.updateConfig({ defaultWallet: 'Updated' })
    await wf.saveConfig()

    const raw = store.get('.penny-wallet.json')!
    const parsed = JSON.parse(raw)
    expect(parsed.defaultWallet).toBe('Updated')
  })

  it('getConfig returns the in-memory config after updateConfig', async () => {
    const { app } = createMockApp({ '.penny-wallet.json': JSON.stringify(DEFAULT_CONFIG) })
    const wf = new WalletFile(app)
    await wf.loadConfig()

    wf.updateConfig({ folderName: 'MyLedgers' })
    expect(wf.getConfig().folderName).toBe('MyLedgers')
  })
})
