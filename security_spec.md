# Security Specification — Quadratta Pizzas Admin CMS

## 1. Data Invariants
1. **Default Deny**: Any unmatched path under `/databases/{database}/documents` must return `false`.
2. **Admin-Only Writes**: Public visitors can read (`/pizzas`, `/media`, `/settings/site`) so the landing page renders without login, but ONLY verified admins (`isAdmin()` requiring `email_verified == true` for bootstrapped admin `scaiaffa2014@gmail.com` or verified member of `/admins/{uid}`) may create, update, or delete any document.
3. **Identity & Timestamp Integrity**: Every write must verify `updatedBy`/`uploadedBy == request.auth.uid`, enforce `createdAt == request.time` on create, keep `createdAt` immutable on update, and enforce `updatedAt == request.time` on update.
4. **Strict Key Allowlists & Size Bounds**: Every collection checks `hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update, `isValidId(docId)` (`^[a-zA-Z0-9_-]+$`, <= 128 chars), and `.size()` limits on every string and array (`socialLinks.size() <= 12`).
5. **No Admin Self-Registration**: Authenticated non-admin users cannot write to `/admins/{uid}` to escalate privileges.

## 2. "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated `create` on `/pizzas/p1` -> Denied (no auth).
2. Signed-in non-admin user (`other@gmail.com`) `create` on `/pizzas/p1` -> Denied (`isAdmin()` false).
3. Spoofed admin email with `email_verified: false` (`scaiaffa2014@gmail.com`, unverified) `create` on `/pizzas/p1` -> Denied (`email_verified == true` check).
4. Admin `create` on `/pizzas/p1` with ghost field `{ ..., isVerified: true }` -> Denied (`keys().hasOnly(...)`).
5. Admin `create` on `/pizzas/p1` with `updatedBy: "someone-else"` -> Denied (`updatedBy == request.auth.uid`).
6. Admin `create` on `/pizzas/p1` with forged `createdAt` instead of `request.time` -> Denied (`createdAt == request.time`).
7. Admin `create` on `/pizzas/bad$id!` with invalid path ID -> Denied (`isValidId(pizzaId)`).
8. Admin `update` on `/pizzas/p1` attempting to mutate `createdAt` -> Denied (`affectedKeys().hasOnly(...)` & `incoming().createdAt == existing().createdAt`).
9. Admin `update` on `/pizzas/p1` with `title` > 100 chars -> Denied (`isValidPizza(incoming())` size bound).
10. Admin `create` on `/media/m1` with `dataUrl` > 450,000 chars or unsupported `mimeType: "image/svg+xml"` -> Denied.
11. Admin `update` on `/settings/site` with `socialLinks` array of 15 items (> 12) or invalid `whatsappNumber: "abc"` -> Denied.
12. Non-admin `create` or `list` on `/admins/hackerUid` -> Denied (privilege escalation & list blocked).
