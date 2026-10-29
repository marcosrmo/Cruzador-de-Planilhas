---
name: Date header matching
description: Avoid false matches between due dates and payment-status dates.
---

Use explicit aliases or clear text matches for date fields that determine whether a debt is paid; do not use fuzzy matching between semantically distinct date headers.

**Why:** A sheet containing only “Data de Vencimento” was also matched as “Data de Pagamento,” causing unpaid rows to be excluded.

**How to apply:** When adding alternate date-column labels, match the intended phrase explicitly and verify that a sheet without a payment-date column still retains open records.
