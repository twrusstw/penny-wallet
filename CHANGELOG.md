# Changelog

All notable changes to PennyWallet will be documented in this file.

## [0.0.7] - 2026-04-14

### Changed
- Merged `repayment` transaction type into `transfer` — existing repayments are read as `transfer` with category `credit_card_payment`
- Renamed transfer type label from 「轉帳」to 「移轉」(zh) / "Transfer" (en)
- `translateCategory`: empty, `-`, and `other` values now display as 「未分類」/ "Uncategorized" instead of a dash
- Category defaults are now always normalized on config load (`normalizeOptions`), ignoring stale stored defaults

### Added
- Expanded default expense categories: `clothing`, `education`, `cash_expense`, `insurance`, `fees`, `tax`
- Expanded default income categories: `interest`, `lottery`, `rent`, `cashback`, `dividend`, `investment_profit`, `insurance_income`, `pension`
- Default transfer categories: `account_transfer`, `credit_card_payment`, `credit_card_refund`, `investment_trade`
- Custom transfer categories section in Settings
- `scripts/migrate-categories.mjs` — migrates old ledger rows (`repayment`→`transfer`, `other`→`-`) and `.penny-wallet.json` config to the new schema

### Fixed
- `credit_card_refund` balance calculation now correctly adjusts only the single credit card wallet (not double-counted)
- `credit_card_payment` balance calculation now decreases both bank (from) and credit card debt (to)

## [0.0.6] - 2026-04-11

### Changed
- Dashboard and Asset views now use a 2-column grid layout for better use of screen space.

## [0.0.5] - 2026-04-10

### Added
- Add click-through from income and expense pie charts to the Transactions view with related filters.
- Add drag-and-drop wallet reordering in Settings (SortableJS) and improve settings/detail UX.

### Fixed
- Wallet balance ordering now follows the configured wallet order.
- Fix mobile numpad tap feedback on iOS

## [0.0.4] - 2026-04-09

### Changed
- Replace Finance Trends view with the new Asset view.
- Update related dashboard/chart rendering and styling for the new view flow.

### Fixed
- Stabilize UI tests for the updated view behavior.

## [0.0.3] - 2026-04-08

### Fixed
- Prevent iOS dashboard navigation buttons from wrapping in longer locales.
- Improve archived wallet settings UX.

## [0.0.2] - 2026-04-08

### Added
- `createdAt` field on each transaction for stable same-date ordering
- Transactions on the same date now sort by creation time (newest first)

### Fixed
- iOS touch event handling and lint issues
- Mobile detail view now shows correct wallet name

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
