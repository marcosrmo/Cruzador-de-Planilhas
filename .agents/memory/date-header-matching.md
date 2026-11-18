---
name: Date header matching
description: Avoid false matches between due dates and payment-status dates.
---

Only rows with no settlement/payment date are active debt, and every export must use that same classification. Filter paid/settled rows from debtor exports; place a client in “Sem Devedores” only when no open row remains. Match aliases such as “Data da Baixa”, “Data do Pagamento”, “Baixado em”, and “Pago em”; inspect all recognized settlement columns and never confuse them with due dates.

**Why:** The user requires payment/settlement dates to prevent paid rows from appearing as debts in every output. A sheet containing only “Data de Vencimento” was previously mistaken for a payment-date column.

**How to apply:** When adding aliases, match settlement phrases explicitly, treat empty/placeholder date cells as blank, and verify paid rows are excluded from all debtor outputs while due-date-only rows remain open.
