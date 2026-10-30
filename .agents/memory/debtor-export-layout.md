---
name: Debtor export layout
description: User requirements for the complete debtor-data spreadsheet.
---

Only the “Devedores com dados” export may use the consolidated format: one row per debtor, unique phone numbers in separate columns, a total debt amount, and installment number, amount, and due date in separate columns. All other spreadsheet outputs must keep their existing format. Preserve support for every existing input format, especially XLS and XLSX.

**Why:** The user explicitly limited the consolidated structure to the complete debtor export, agreed that installment amount and due date remain separate, and emphasized that both inputs must continue supporting XLS/XLSX and the other existing formats.

**How to apply:** Preserve every other export and existing input format when changing this output; consolidate debtors by normalized name and deduplicate phone numbers.
