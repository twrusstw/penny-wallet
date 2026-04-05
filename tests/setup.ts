import { vi } from 'vitest'

// ── Obsidian API stubs ────────────────────────────────────────────────────────

class TFile {
  path: string = ''
  basename: string = ''
  constructor(path: string = '') {
    this.path = path
    this.basename = path ? path.split('/').pop()!.replace(/\.md$/, '') : ''
  }
}

vi.mock('obsidian', () => ({
  normalizePath: (p: string) => p.replace(/\\/g, '/'),
  TFile,
  App: class App {},
  Modal: class Modal {
    app: unknown
    contentEl = { empty: vi.fn(), createEl: vi.fn(), createDiv: vi.fn(), addClass: vi.fn() }
    constructor(app: unknown) { this.app = app }
    open() {}
    close() {}
  },
  Notice: class Notice { constructor(_: string) {} },
  Plugin: class Plugin {},
}))

// ── window.moment stub (used by getLocaleCashName) ────────────────────────────
Object.defineProperty(global, 'window', {
  value: { moment: { locale: () => 'en' } },
  writable: true,
})
