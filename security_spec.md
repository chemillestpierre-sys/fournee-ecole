# Security Specification — Précommande Pains au Chocolat

## 1. Data Invariants
1. **PII Isolation**: `/orders/{orderId}` contains parent emails and child names. Only verified admins (`chemille.stpierre@ec49.fr` or `/admins/{uid}`) may `get`, `list`, `update`, or `delete` orders.
2. **Strict Schema & Bounds**: Every order has exact fields `childFirstName` (1..80 chars), `childLastName` (1..80 chars), `parentEmail` (valid email, 5..150 chars), `quantity` (integer 1..50), `unitPrice == 1`, `totalAmount == quantity`, `paymentStatus in ['pending', 'paid']`, `distributed is bool`, and server timestamps `createdAt == request.time`, `updatedAt == request.time`.
3. **Deadline Enforcement**: Public parent pre-orders are only accepted before December 16, 2026 (`request.time < timestamp.date(2026, 12, 16)`).
4. **Atomic Summary Sync**: Creating a public order requires atomically updating `/campaign/summary` in the same batch/transaction so `totalPastries` and `totalOrders` remain exact and cannot be inflated arbitrarily without a valid new order.
5. **Immutable Audit Fields**: `createdAt` cannot be modified after creation.

## 2. The "Dirty Dozen" Attack Payloads (All Must Yield PERMISSION_DENIED)
1. **Unauthenticated PII Read**: Unauthenticated `get` or `list` on `/orders` -> DENIED (`isAdmin()` required).
2. **Non-Admin Authenticated PII Read**: Signed-in parent user (`other@example.com`) `list` on `/orders` -> DENIED.
3. **Unverified Admin Email Spoof**: User token with `email == 'chemille.stpierre@ec49.fr'` and `email_verified == false` -> DENIED.
4. **Shadow Field Injection**: Public `create` on `/orders/{id}` containing extra field `isAdmin: true` or `discount: 100` -> DENIED (`keys().hasOnly(...)`).
5. **Price Tampering**: Public `create` on `/orders/{id}` with `quantity: 10, unitPrice: 0, totalAmount: 0` -> DENIED (`unitPrice == 1 && totalAmount == quantity`).
6. **Pre-Paid Spoofing**: Public `create` on `/orders/{id}` with `paymentStatus: 'paid'` -> DENIED (`paymentStatus == 'pending'`).
7. **Quantity Overflow / Negative**: Public `create` on `/orders/{id}` with `quantity: 0` or `quantity: 99999` -> DENIED (`quantity >= 1 && quantity <= 50`).
8. **ID Poisoning**: `create` on `/orders/bad$id_with_1500_chars...` -> DENIED (`isValidId(orderId)`).
9. **Client Timestamp Forgery**: `create` on `/orders/{id}` with backdated `createdAt` (`!= request.time`) -> DENIED.
10. **Summary Counter Manipulation**: Unauthenticated `update` on `/campaign/summary` incrementing `totalPastries` by 500 without a matching new order -> DENIED (`existsAfter` + `getAfter` exact quantity check).
11. **Self-Privilege Escalation**: Signed-in user `create` on `/admins/{uid}` -> DENIED (`allow create: if false`).
12. **Post-Deadline Public Submission**: Public `create` on `/orders/{id}` on or after `2026-12-16T00:00:00Z` -> DENIED (`request.time < timestamp.date(2026, 12, 16)`).
