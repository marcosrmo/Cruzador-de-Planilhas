---
name: Debtor export layout
description: User requirements for the complete debtor-data spreadsheet.
---

The “Devedores com dados” export has one row per debtor, unique phone columns, a total debt amount, and separate installment number, amount, and due-date columns. Both “Sem Devedores” exports keep one row per client and put unique phones in separate columns. “Simples” may repeat a debtor name once per unique phone; keep the detailed report unchanged. Preserve all existing input formats, especially XLS and XLSX.

**Why:** The user clarified that multiple phones belong in both no-debtor exports and in the simple export, while repeated names are allowed only in the simple export.

**How to apply:** Keep each export's row behavior distinct, deduplicate phone values, and do not alter the detailed report or existing input-format support unless explicitly requested.
