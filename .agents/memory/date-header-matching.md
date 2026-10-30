---
name: Date header matching
description: Avoid false matches between due dates and payment-status dates.
---

Only rows with no settlement/payment date are active debt. Match clear aliases for settlement dates (including “Data da Baixa” and “Data do Pagamento”) and never confuse them with due dates.

**Why:** A sheet containing only “Data de Vencimento” was once matched as “Data de Pagamento,” and the user requires values and debt dates to come only from genuinely unpaid rows.

**How to apply:** When adding aliases, match settlement phrases explicitly, treat empty/placeholder date cells as blank, and verify that due-date-only sheets retain open records.
