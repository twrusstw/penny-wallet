import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/penny-wallet/',

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      title: 'PennyWallet',
      description: 'Personal finance tracker Obsidian plugin — log expenses, income, transfers, and credit card repayments as plain Markdown files in your vault.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/getting-started' },
          { text: 'GitHub', link: 'https://github.com/twrusstw/penny-wallet' },
        ],
        sidebar: [
          {
            text: 'User Guide',
            items: [
              { text: 'Getting Started', link: '/getting-started' },
              { text: 'Accounts', link: '/accounts' },
              { text: 'Transactions', link: '/transactions' },
              { text: 'Credit Card Workflow', link: '/credit-card-workflow' },
              { text: 'Views', link: '/views' },
              { text: 'Settings', link: '/settings' },
              { text: 'URI Handler & iOS Shortcuts', link: '/uri-handler' },
              { text: 'Data Format', link: '/data-format' },
              { text: 'FAQ', link: '/faq' },
            ],
          },
          {
            text: 'Developer',
            items: [
              { text: 'Developer Guide', link: '/developer-guide' },
              { text: 'Testing', link: '/testing' },
            ],
          },
        ],
      },
    },

    zh: {
      label: '繁體中文',
      lang: 'zh-TW',
      title: 'PennyWallet',
      description: 'Obsidian 個人財務記帳外掛 — 以 Markdown 檔案記錄支出、收入、轉帳與信用卡還款。',
      themeConfig: {
        nav: [
          { text: '使用指南', link: '/zh/getting-started' },
          { text: 'GitHub', link: 'https://github.com/twrusstw/penny-wallet' },
        ],
        sidebar: [
          {
            text: '使用者指南',
            items: [
              { text: '快速開始', link: '/zh/getting-started' },
              { text: '帳戶', link: '/zh/accounts' },
              { text: '交易記錄', link: '/zh/transactions' },
              { text: '信用卡流程', link: '/zh/credit-card-workflow' },
              { text: '介面與檢視', link: '/zh/views' },
              { text: '設定', link: '/zh/settings' },
              { text: 'URI Handler 與 iOS 捷徑', link: '/zh/uri-handler' },
              { text: '資料格式', link: '/zh/data-format' },
              { text: '常見問題', link: '/zh/faq' },
            ],
          },
          {
            text: '開發者',
            items: [
              { text: '開發者指南', link: '/zh/developer-guide' },
              { text: '測試', link: '/zh/testing' },
            ],
          },
        ],
      },
    },
  },

  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/twrusstw/penny-wallet' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 twrusstw',
    },
  },
})
