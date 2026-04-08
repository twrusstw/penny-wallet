# Changelog

All notable changes to PennyWallet will be documented in this file.

## [0.0.2] - 2026-04-08

### Added
- `createdAt` field on each transaction for stable same-date ordering
- Transactions on the same date now sort by creation time (newest first)
- Add Command `refresh` that can be reload data

### Fixed
- iOS touch event handling and lint issues
- Mobile detail view now shows correct wallet name
- Improve archived wallet settings UX

## [0.0.1] - 2026-04-06

### Added
- Initial release
- Finance Overview with monthly income / expense summary, account balances, net asset, asset allocation pie chart, and category pie charts (legends show name, amount, and percentage)
- Transactions view with multi-select type filter, category checklist dropdown, keyword search on notes, sticky subtotals, inline edit and delete
- Finance Trends view with 3 / 6 / 12-month income/expense bar chart, category trend line chart, net asset line chart, and per-account balance trend
- Multiple account types: cash, bank, credit card (with debt tracking)
- Custom expense and income categories
- Credit card repayment workflow with automatic debt calculation
- iOS Shortcuts support via `obsidian://penny-wallet` URI handler
- Bilingual support: English and Traditional Chinese
- Plain Markdown storage — one file per month, compatible with Git sync and Dataview
- Config stored as `.penny-wallet.json` at vault root
