---
name: Debtor export layout
description: User requirements for the complete debtor-data spreadsheet.
---

The “Devedores com dados” export has one row per debtor, unique phone columns (including telephone, WhatsApp, and fax), and financial/date fields sourced only from active debt rows. When multiple document-number columns exist, select the value with the fewest digits and label the output column “Nota Fiscal”; do not combine document numbers. Both “Sem Devedores” exports keep one row per client with unique phone columns; leave debt value, due date, and sale date blank there. Preserve all existing input formats, especially XLS and XLSX.

**Why:** The user clarified that phone, WhatsApp, and fax fields should become numbered phone columns, document values should be selected by the fewest digits, and only unpaid debt rows should contribute debt values/dates.

**How to apply:** Keep each export's row behavior distinct, number and deduplicate all phone values, select one shortest document value, and do not alter input formats unless explicitly requested.
