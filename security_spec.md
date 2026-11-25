# Security Specification & TDD Audit — CONAE Convenção & Banco

## 1. Data Invariants
1. **Identity & Email Verification**: All authenticated reads and writes require `request.auth != null && request.auth.token.email_verified == true`.
2. **Role & Privilege Isolation**: Affiliates cannot escalate their own `role`, `vipTier`, `balanceBRL`, `balanceUSD`, `cnecTokens`, `monthlyPlanActive`, `virtualCardActive`, or `executiveCardActive`. Only `isAdmin()` can grant Executive Gold Cards, unlock Virtual Cards, or modify balances.
3. **Credential & Password Isolation**: `credential_passes` stores President-issued passwords; `allow list` is strictly limited to `isBootstrappedAdmin()` or `resource.data.targetUid == request.auth.uid`. `vip_executive_hashes` exposes only SHA-256 hashes (64 chars) to signed-in users, never plaintext executive passwords.
4. **Public Showcase Separation**: `sponsors`, `benefit_partners`, `hotels`, `courses`, and `public_affiliates` contain zero PII (no CPF, email, phone, or passwords). Only `isAdmin()` can create, update, or delete catalog/partner entries.
5. **Strict Payload & Timestamp Integrity**: Every `create` enforces `createdAt == request.time && updatedAt == request.time` and `id == docId` matching `^[a-zA-Z0-9_-]+$`. Every `update` enforces `updatedAt == request.time`, immutable `id`/`createdAt`, and strict `keys().hasOnly(...)`.

## 2. Dirty Dozen Attack Payloads (Expected: PERMISSION_DENIED)
1. **Self-Grant Executive Gold Card**: Affiliate updates `users/{uid}` setting `executiveCardActive: true`.
2. **Self-Approve Virtual Card or Balance**: Affiliate updates `users/{uid}` setting `virtualCardActive: true` or `balanceBRL: 50000`.
3. **Read Another Affiliate's Issued Password**: Non-admin executes `get` on `credential_passes/{otherPassId}`.
4. **Unfiltered List of Credential Passes**: Non-admin runs `collection(db, 'credential_passes')` without `where('targetUid', '==', uid)`.
5. **Create Sponsor Without Admin Role**: Affiliate attempts `setDoc(doc(db, 'sponsors', 'sp_hack'), ...)` — blocked by `isAdmin()`.
6. **Create Benefit Partner (Pharmacy/Market) Without Admin**: Affiliate attempts `setDoc(doc(db, 'benefit_partners', 'bp_hack'), ...)` — blocked by `isAdmin()`.
7. **Oversized Photo / DoW Attack**: Client sends `photoUrl` > 60,000 characters on `hotels` or `benefit_partners`.
8. **Shadow Ghost Field Injection**: Client sends `isSuperUser: true` on `users/{uid}` or `sponsors/{id}`.
9. **Spoofed Timestamp**: Client sends static ISO date instead of `serverTimestamp()` (`request.time`) on `createdAt`/`updatedAt`.
10. **Invalid Executive VIP Hash Length**: Admin/attacker sends plaintext 8-char password in `vip_executive_hashes/{id}.passwordHash` instead of 64-char SHA-256 hex.
11. **Order Status Bypass**: Affiliate creates `package_orders/{id}` with `status: 'approved'` directly.
12. **Unverified Email Token**: Attacker with `email_verified: false` matching admin email tries `isBootstrappedAdmin()` operation — rejected because `isSignedIn()` requires `email_verified == true`.
13. **Self-Grant Shareholder Equity**: Affiliate creates `shareholder_orders/{id}` with `status: 'approved'` or updates `users/{uid}.sharesOwned` directly without President/Cartório confirmation — rejected by `isAdmin()` gate.
14. **Read Another User's Cartório Document**: Non-admin runs `get` or unfiltered `list` on `shareholder_orders` containing CPF/CNPJ & phone — rejected because `allow get/list` enforces `userId == request.auth.uid || isAdmin()`.

