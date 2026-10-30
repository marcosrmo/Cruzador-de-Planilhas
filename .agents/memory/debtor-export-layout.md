---
name: Debtor export layout
description: User requirements for the complete debtor-data spreadsheet.
---

The “Devedores com dados” export has one row per debtor, unique phone columns, and financial/date fields sourced only from active debt rows. Use one document-number source column, never combine “Nosso Número” and “Seu Número”. Both “Sem Devedores” exports keep one row per client with unique phone columns; leave debt value, due date, and sale date blank there. “Simples” may repeat a debtor name once per unique phone; keep the detailed report unchanged. Preserve all existing input formats, especially XLS and XLSX.

**Why:** The user clarified that multiple phones belong in both no-debtor exports and in the simple export, repeated names are allowed only in the simple export, and only unpaid debt rows should contribute debt values/dates.

**How to apply:** Keep each export's row behavior distinct, deduplicate phone values, select one document column by its explicit header (confirm ambiguous real schemas from a sample), and do not alter other outputs or formats unless explicitly requested.
