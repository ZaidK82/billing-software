# Billing Software --- Project Brain

**Last updated:** 2026-10-21  
**Current sprint:** V3.2 — Invoice Editor Product Selection (implemented, user-reported manually verified, committed and pushed; deployment unverified). Next sprint is not yet selected; reconcile the canonical roadmap before planning.
**Previous sprint:** V3.1 — Product Catalogue Foundation (implemented, manually verified by the user, committed and pushed; deployment unverified).
**Status:** Latest reported application commit is `0309bae` (`Integrate product catalogue into invoice editor`), pushed to `origin/master` after V3.1 commit `b5bfae2`. V3.2 changed only `frontend/src/components/billing/BillEditor.tsx`, adding product selection that copies catalogue name/default unit price into editable draft invoice rows and respects rate/total entry modes. `npm run build` passed with a non-fatal Vite bundle-size warning; the user reported successful manual verification. No V3.2 database migration or backend API change was reported. Deployment, production database state, dedicated PDF regression coverage, and final working-tree cleanliness remain unverified. Automated integration and E2E tests were not performed. The next sprint must be selected from the canonical roadmap rather than guessed.

> **How to use this Brain:** This is the canonical project context. Current-state sections describe the latest known state; archived sprint handoffs preserve what was recorded at each point in time. Do not replace, delete, or silently shorten older handoffs. When updating current state, retain historical snapshots as historical records and clearly distinguish implemented, tested, committed, pushed, deployed, proposed, deferred, and unverified statuses.
------------------------------------------------------------------------

## Current State Override — V3.2 Invoice Editor Product Selection (2026-10-21)

This is the authoritative current-state summary as of the V3.2 handoff. Older state snapshots and sprint handoffs below are preserved as historical records and must not be read as the latest status where they conflict with this section or the latest V3.2 archive entry.

- **Current latest sprint:** V3.2 — Invoice Editor Product Selection.
- **V3.2 implementation status:** Implemented for the reported scope; user reported successful manual verification. Frontend production build passed. This does not establish that every persistence, historical snapshot, calculation edge case, or PDF invariant was separately tested.
- **Previous completed sprint:** V3.1 — Product Catalogue Foundation. Its model, migration, API, frontend catalogue UI, and navigation are the foundation consumed by V3.2.
- **V3.2 application commit:** `0309bae` — `Integrate product catalogue into invoice editor`.
- **Git push:** Confirmed pushed to `origin/master`; reported push range `b5bfae2..0309bae master -> master`.
- **Changed application file in V3.2:** `frontend/src/components/billing/BillEditor.tsx` only; reported diff was 133 insertions and 3 deletions.
- **Database/migrations:** No V3.2 schema changes; no V3.2 Alembic migration. V3.1 migration `e3a842545855` remains part of prior history. Production database state remains unverified.
- **API:** No backend API changes or new endpoints reported. V3.2 uses existing `getProducts` and the established authenticated session flow.
- **UI behavior:** The invoice editor loads catalogue products and adds a selector to the draft-row interface. Selecting a product copies its name and default unit price into editable invoice-row fields. The handler accounts for existing `rate` and `total` price-entry modes.
- **Build:** `npm run build` passed; Vite emitted a non-fatal warning that a minified JavaScript chunk exceeded 500 kB.
- **Git whitespace check:** `git diff --cached --check` passed for the staged application change.
- **Manual verification:** User reported that the feature “works well.” Detailed pass/fail evidence for every edge case was not supplied.
- **Not performed / not independently verified:** Automated API integration tests; automated end-to-end tests; independent production-database verification; independent deployment verification; dedicated V3.2 PDF regression test; final working-tree cleanliness after commit.
- **Deployment:** Not verified. A successful push is not proof of deployment.
- **Project Brain and review ZIP:** Both were excluded from the V3.2 application commit. The final post-commit status of the working tree and ZIP is unknown. Do not infer that the tree is clean or that the ZIP remains untracked.
- **Product/data invariant:** Product values are copied into existing invoice-row fields; no live catalogue foreign-key relationship was added. The intended design is for invoice snapshots to remain invoice data, but all historical snapshot invariants were not independently verified during this sprint.
- **Known limitation:** Vite bundle-size warning remains deferred; it is not a build failure. No functional bug was reported by the user during V3.2 verification.
- **Next sprint:** Not selected in this handoff. Reconcile the canonical roadmap and known issues before assigning a new sprint name/version/objective. Do not invent the next sprint from V3.2 alone.
- **Testing approach:** Automated integration tests and independent production-database verification remain outside the project's stated current approach; record them as not performed, not as passed.

### V3.2 status dimensions (keep separate)

| Dimension | Status |
|---|---|
| Planned | Product selection objective was defined for V3.2 |
| Implemented | Yes, reported complete for scope |
| User manually verified | Yes, general successful confirmation |
| Frontend build | Passed, with non-fatal bundle warning |
| Automated integration / E2E tests | Not performed |
| Database migration | None in V3.2 |
| Committed | Yes, `0309bae` |
| Pushed | Yes, to `origin/master` |
| Deployed | Not verified |
| Production DB verified | No |
| Final working tree checked | Not verified after commit |
## 1. Project Overview

Full-stack billing and invoicing application.

### Stack

-   Backend: Python, FastAPI, SQLAlchemy
-   Database: PostgreSQL via Supabase
-   Authentication: Supabase Auth / JWT
-   Storage: Supabase Storage
-   PDF generation: ReportLab
-   Frontend: React, TypeScript, Vite
-   Backend hosting: Render
-   Frontend hosting: Cloudflare Workers
-   Migrations: Alembic
-   Version control: Git/GitHub

Product direction: build a reliable billing application, then expand
into invoice workflow, inventory/analytics, finance, and advanced
business-management capabilities. Later versions should build on earlier
versions rather than becoming disconnected features.

## 2. Deployment

### Backend

-   Render: `https://billing-software-ydi2.onrender.com`
-   Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
-   Health endpoint was previously confirmed working, reporting
    `status: ok`, service `billing-api`, version `1.0.0`, and
    `database_configured: true`.

### Frontend

-   Cloudflare Workers:
    `https://billing-software.50e2021shaikhmkm.workers.dev`
-   Login previously failed with `Failed to fetch`; this was fixed and
    login was confirmed working.

### Latest deployment status

**Current latest application commit:** V3.1 commit `b5bfae2` is reported pushed to `origin/master`. V3.1 deployment was not performed or verified. The local migration success applies only to the configured local database and is not evidence of production schema state. Production smoke tests are not recorded. Keep this distinction even if hosting providers automatically deploy from Git; no deployment evidence was supplied in the V3.1 handoff.


V2.3 commit `3fa0195`, V2.4 commit `15623b5`, V2.6 commit `91e4cbe`, and V2.7 commit `7bfa13c` are recorded as successfully pushed to `origin/master` based on user-provided terminal output. Render redeployment, Cloudflare deployment, production database migration/state, and production smoke testing remain **not verified** for V2.2–V2.7. The V2.3 migration was applied to the database configured in the local environment according to its handoff; V2.7 migrations were reported applied to the user's configured database, with reported head `e1f2a3b4c5d6`. Neither report establishes production migration state. Do not claim any version is live until deployment and production behavior have been verified. V2.2 commit `3ba0043` remains part of the recorded history; its independent deployment status was not established by the V2.3 handoff.

## 3. Repository Structure

``` text
billing-software/
├── .gitignore
├── alembic.ini
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── requirements.txt
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   └── app/
│       ├── main.py
│       ├── api/
│       │   ├── dependencies.py
│       │   └── router.py
│       ├── core/
│       │   ├── config.py
│       │   ├── database.py
│       │   └── exceptions.py
│       ├── fonts/
│       │   ├── arial.ttf
│       │   └── arialbd.ttf
│       ├── models/
│       │   ├── bill.py
│       │   ├── business.py
│       │   ├── business_membership.py
│       │   └── customer.py
│       └── services/
│           ├── invoice_pdf.py
│           └── storage.py
└── frontend/
    ├── .env
    ├── .env.example
    ├── package.json
    ├── package-lock.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── App.css
        ├── index.css
        ├── main.tsx
        ├── components/
        │   ├── billing/
        │   │   ├── BillEditor.tsx
        │   │   ├── BillHistory.tsx
        │   │   └── BillPreview.tsx
        │   ├── business/
        │   │   ├── BusinessProfile.tsx
        │   │   └── InvoiceColumnManager.tsx
        │   ├── customers/
        │   │   ├── CustomerForm.tsx
        │   │   └── CustomerList.tsx
        │   ├── dashboard/
        │   │   └── Dashboard.tsx
        │   └── navigation/
        │       └── AppNavbar.tsx
        └── lib/
            ├── api.ts
            ├── auth.ts
            ├── plainTextInvoiceParser.ts  # added in V2.8
            └── supabase.ts
```

Generated/dependency directories (`.venv`, `node_modules`,
`__pycache__`, `dist`) are artifacts, not architecture.

## 4. Backend

-   `app/main.py`: FastAPI application and CORS. CORS uses the
    configured frontend URL and currently allows credentials, methods,
    and headers.
-   `app/api/dependencies.py`: Supabase JWT validation and
    current-business resolution through membership.
-   `app/api/router.py`: health, auth/me, business CRUD, business
    assets, bill create/list/get/PDF/delete/update, customer CRUD/list,
    business-profile numbering settings, and invoice-number allocation.
-   `app/core/config.py`: application configuration.
-   `app/core/database.py`: database setup.
-   `app/core/exceptions.py`: shared exception handling.
-   `app/services/storage.py`: Supabase Storage asset operations.
-   `app/services/invoice_pdf.py`: ReportLab invoice PDF generation; no
    PDF layout files were changed in V2.3.

### Current backend capabilities

Health check; authenticated user/business resolution; business profile
operations; business logo/signature asset operations; customer
management; bill creation, listing, retrieval, and PDF
generation/download; business-specific invoice prefix and next-sequence
configuration; invoice deletion and saved-invoice updates scoped to the current business.

### Invoice numbering implementation (V2.3)

-   Business profile API accepts and returns `invoice_prefix` and
    `next_invoice_number`.
-   Prefix validation is documented as 1--20 characters; first character
    must be alphanumeric; subsequent characters may be letters, digits,
    spaces, `/`, or `-`. The update endpoint strips leading/trailing
    whitespace when assigning the prefix.
-   Sequence validation allows values from 1 through 2147483647.
-   `create_bill` locks the business row using `SELECT ... FOR UPDATE`,
    checks existing invoice numbers for the configured prefix, allocates
    the greater of the configured next sequence and highest matching
    existing suffix plus one, updates the sequence, creates the
    bill/items, and commits in the same session transaction.
-   The existing unique constraint on `(business_id, invoice_number)`
    remains in place.
-   User-reported functional tests covered settings persistence after
    reload, sequential numbering, custom starting number, historical
    number preservation, and duplicate protection. No automated
    concurrency test was recorded.

### Invoice deletion implementation (V2.4)

-   Added `DELETE /bills/{bill_id}` in `backend/app/api/router.py`.
-   According to the supplied handoff, the route uses the existing
    authenticated-user dependency and current-business resolution, queries
    by invoice ID and business ID, returns `404` for a missing or
    inaccessible invoice, commits deletion, and returns `204 No Content`.
-   The reported exception path rolls back and returns HTTP `500` with
    `"Unable to delete bill."`.
-   The endpoint is committed in `15623b5` (`Add invoice deletion`) and
    pushed to `origin/master`.
-   The user tested an unauthenticated request and received
    `{"detail":"Not authenticated"}`. A second-account/cross-business
    isolation test is not confirmed.
-   The user reported deleting invoice `23` and then receiving invoice
    `24` on the next creation. This is a targeted user-reported check that
    the sequence was not reused; it is not a comprehensive numbering test.
-   The handoff reports that `Bill.items` uses SQLAlchemy
    `cascade="all, delete-orphan"` and `BillItem.bill_id` declares
    `ondelete="CASCADE"`. The actual database foreign-key constraint and
    its cascade behavior have not been independently verified.
-   V2.4 intentionally made no database/schema changes and created no
    Alembic migration.
-   No PDF-generation code was changed.

### Missing/planned capabilities

-   Saved-invoice editing is implemented in V2.5; final authorization, identity/numbering, rollback, and regression verification remain pending.
-   Duplicate/reorder saved invoice rows.
-   Row highlighting.
-   Plain-text auto-fill.
-   Font/object sizing controls.
-   Business asset deletion UI and verified delete flow.
-   Per-invoice signature include/exclude setting.
-   Invoice-deletion authorization/cascade/error-path tests remain
    pending.
-   Automated invoice-numbering and concurrency regression tests remain
    pending.

### Business asset storage

-   Supabase Storage bucket: `business-assets`
-   Max upload size: 2 MB
-   Formats: PNG, JPEG, WebP
-   Path: `{business_id}/{asset_type}{extension}`

Logo/signature loading is optional; asset-load failures should not
prevent PDF generation.

## 5. Database Models

### Business

Existing fields include
`id, name, phone, email, address, city, state, pincode, gstin, udyam_number, logo_path, signature_path, terms_and_conditions, invoice_columns JSONB, created_at, updated_at`,
plus V2.3 fields:

-   `invoice_prefix`: `VARCHAR(20)`, NOT NULL, default `INV-`.
-   `next_invoice_number`: `INTEGER`, NOT NULL, default `1`.

### BusinessMembership

`business_id, user_id, role, created_at`; unique business/user pair.

### Customer

`id, business_id, name, phone, email, address, created_at, updated_at`

### Bill

`id UUID, business_id FK, invoice_number, customer_name, phone, address, subtotal, total, invoice_columns JSONB, terms_and_conditions, created_at`

Unique constraint: `(business_id, invoice_number)` named
`uq_bill_business_invoice_number`.

### BillItem

Core fields: `id UUID, bill_id FK, item_name, quantity, unit_price, line_total, custom_values JSONB`.

V2.7 added:
- `position`: integer, non-nullable, model default `0`, server default `0`; used to persist item ordering.
- `highlight_style`: nullable `VARCHAR(20)`, model default `None`; current supported highlighted value is `"yellow"`, while `null` means no highlight.

The `Bill.items` ORM relationship orders items by `BillItem.position`. Bill items cascade with their bill. These fields were added by Alembic migrations `d7e8f9a0b1c2` and `e1f2a3b4c5d6`, respectively. The migration application was reported successful for the user's configured database; production state remains unverified.

**V2.8 appearance settings:** The V2.8 commit includes model changes and migration file `backend/alembic/versions/fdf19b7ec7a9_add_bill_appearance_settings.py`. The filename suggests bill appearance settings, but the declared revision, parent revision, exact fields/types/defaults/constraints, and upgrade/downgrade operations have not yet been inspected in the available handoff evidence. Do not document inferred schema details as facts. The user's handoff identifies this as a migration included in the commit; whether it was applied to any database is unverified.

### Deferred monetary precision/validation issue

Bill creation once failed with PostgreSQL `numeric field overflow` for
`subtotal` and `total` of `234243565612.00`. The error indicated a
`NUMERIC(12, 2)` field allows an absolute magnitude below `10^10`. The
user reduced the amount and bill creation/PDF generation then worked.

**Root cause remains uninvestigated.** Review frontend validation,
quantity/rate calculations, backend validation, and database precision
before making a schema change. Do not assume this was only a test-input
issue.

## 6. Alembic

Root `alembic.ini` uses `script_location = %(here)s/backend/alembic`.

Known migration chain:

``` text
base
  ↓
b34c026b02fb — create business tables
  ↓
2d3c1268a2ab — add bill tables
  ↓
b5baf69d8dc1 — add customer table
  ↓
a53fc0dffb39 — add GSTIN and Udyam
  ↓
1f30f77ef752 — add logo/signature paths
  ↓
6bb26c5d88c2 — customizable invoice columns
  ↓
9c9f46a992e6 — business terms
  ↓
ad874b881aa9 — bill terms
  ↓
c2d3e4f5a6b7 — business invoice numbering (V2.3)
  ↓
d7e8f9a0b1c2 — persistent bill-item position (V2.7)
  ↓
e1f2a3b4c5d6 — persistent bill-item highlight style (V2.7; latest reported head)

V2.8 additionally commits `fdf19b7ec7a9_add_bill_appearance_settings.py`. Its declared `revision` and `down_revision` must be inspected before adding it to the confirmed chain. Do not assume its parent is `e1f2a3b4c5d6` based only on chronological commit order. The migration's application state and production database state are unverified.
```

V2.3 migration
`backend/alembic/versions/c2d3e4f5a6b7_add_business_invoice_numbering.py`
has parent revision `ad874b881aa9`. The handoff reports that the
migration was applied to the database configured in the local
environment, `alembic current` returned `c2d3e4f5a6b7 (head)`, and
`alembic check` reported `No new upgrade operations detected.` This does
**not** establish that production has been migrated.

The migration adds
`businesses.invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'INV-'` and
`businesses.next_invoice_number INTEGER NOT NULL DEFAULT 1`. It
backfills each business's sequence from the highest historical invoice
number matching exact legacy format `INV-<digits>`, sets the next
sequence to suffix maximum plus one, and caps the value at 2147483647.
Historical invoice numbers are not modified. Downgrade drops the two
columns and therefore discards their settings; downgrade was not tested.

Rules: never rewrite old migrations; new schema changes must be
incremental; run Alembic from the project root. Recheck actual database
revision before further migration work.

## 7. Frontend

`App.tsx` orchestrates authentication, current user/business,
bill/customer/asset caches, routes, logout, and loading.

Routes: `/`, `/dashboard`, `/business`, `/bills`, `/bills/new`,
`/bills/:billId`, `/bills/:billId/edit`, `/customers`, `/customers/new`,
`/customers/:customerId/edit`; wildcard routes to dashboard.

Cache ages: bills/customers 5 minutes; assets 55 minutes.

-   `lib/api.ts` uses `VITE_API_URL`, falling back to
    `http://127.0.0.1:8000`. V2.8 modified this file; exact endpoint/payload differences should be read from the committed diff before documenting field-level API contracts.
-   `lib/plainTextInvoiceParser.ts` was added in V2.8 for plain-text invoice parsing. File/commit inclusion is confirmed; detailed parser behavior and automated edge-case coverage are not established by the handoff alone.
-   `App.tsx` was modified in V2.8. The user reported customer loading after refresh verified, including the requirement that customers are available in invoice create/edit flows after refresh without first visiting the Customers page.
-   `lib/supabase.ts` uses `VITE_SUPABASE_URL` and
    `VITE_SUPABASE_PUBLISHABLE_KEY`.
-   `BillEditor.tsx`: customer selection/manual customer data, dynamic
    invoice columns, draft item add/edit/remove, custom values, required
    fields, quantity/rate calculation, and saving. V2.8 changes this file for invoice-entry improvements, including item-total entry behavior as described in the sprint handoff; exact edge-case test output is not recorded.
-   `BillHistory.tsx`: list, refresh, view, create-new, and delete
    workflows. Delete has a confirmation step, progress state, and inline
    error display. Saved invoice editing is implemented in V2.5; duplication remains unavailable.
-   `BillPreview.tsx`: independent HTML renderer; not guaranteed to
    match the ReportLab PDF exactly. V2.8 includes preview changes associated with bill appearance settings and business logo/signature asset loading; the user reported the logo/signature loading fix verified.
-   `BusinessProfile.tsx`: business information, terms, logo/signature
    upload, invoice columns, and V2.3 invoice numbering controls with
    editable prefix/next sequence and formatted preview. Asset deletion
    UI remains unavailable.
-   `InvoiceColumnManager.tsx`: core/custom columns, custom
    text/number/date, required/optional settings, ordering, removal, and
    reset. Bill creation snapshots column configuration.

`frontend/src/lib/api.ts` includes `invoice_prefix` and
`next_invoice_number` in the `BusinessProfile` TypeScript type.
`frontend/src/App.tsx` includes the fields in the business-profile
payload built by the relevant flow.

Draft invoice items can be edited before saving, and V2.5 adds editing of saved invoices through `/bills/:billId/edit`. The update is intended to preserve invoice identity, invoice number, business association, creation timestamp, saved column snapshot, and saved terms while recalculating persisted totals server-side. The PDF service and layout were not changed in V2.5; regenerated PDFs are expected to use updated saved data, but dedicated PDF regression verification remains pending.

## 8. V1 Status

**V1 --- Foundation is complete and deployed.**

Working: authentication; business setup/profile; customer management;
invoice creation; customizable invoice columns; invoice terms snapshot;
logo/signature branding assets; PDF generation/download; bill
history/viewing; responsive MVP UI; deployment.

This does not mean the latest V2.2 commit is deployed.

## 9. Roadmap

### V1 --- Foundation ✅

1.  Authentication
2.  Business profile
3.  Customers
4.  Invoice creation
5.  Invoice history
6.  PDF generation
7.  Logo and signature
8.  Production deployment

Status: complete and deployed.

### V2 --- Invoice & Workflow 🚀

1.  Invoice/PDF redesign
2.  One-page automatic fitting
3.  Custom invoice numbering
4.  Delete invoices
5.  Edit invoices
6.  Invoice-row duplication
7.  Invoice-row reordering
8.  Invoice-row highlighting
9.  Plain-text auto-fill
10. Font/object sizing controls
11. Enter item total and calculate unit rate from quantity

Status: V2.2 PDF layout/fitting, V2.3 custom invoice numbering, V2.4 invoice deletion, V2.5 saved-invoice editing, V2.6 invoice-preview/PDF consistency work, V2.7 invoice-row management/highlighting, and V2.8 invoice-entry improvements are recorded as implemented. V2.8 commit `dcd1399437352f8eb11260de7b969bce8fd46644` was pushed to `origin/master`, and local `master`/`origin/master` were reported synchronized. V2.5 commit identity remains unconfirmed in the existing record. Deployment for V2.2–V2.8 remains unverified; for V2.8, deployment is explicitly deferred by user decision. V2.8 migration application and exact automated test outputs are unverified.

**Current grouping:** V2.7 invoice-row duplication, reordering, and persistent highlighting is complete. V2.8 implementation is recorded complete and committed/pushed; it covers item-total entry, a dedicated plain-text invoice parser, bill appearance settings spanning model/API/editor/preview/PDF, and the user-verified logo/signature and customer-loading fixes. Exact parser edge cases, appearance migration schema operations, and automated test output are not established by the handoff. Overall V2 roadmap closure remains **pending reconciliation** against the canonical roadmap and historical handoffs; do not assume the V2.8 commit alone proves all V2 requirements are closed. After reconciliation, plan the next development sprint from the existing roadmap. The proposed future order remains inventory management, then customer-level bill/product insights (filter bills by customer and show their most-purchased products); these future features are not approved or started.

### V2.3 --- Custom Invoice Numbering ✅ implementation; release verification pending

Business-specific prefix and next-sequence settings, Business Profile
UI, migration/backfill, and row-lock allocation are implemented.
Build/compilation/migration/schema checks passed as recorded; five
functional scenarios were user-reported successful. Automated
concurrency coverage and production verification remain pending.

### Future roadmap after remaining V2 invoice-editor work

1. **Inventory & Analytics (V3 candidate)** — product catalogue, inventory/stock tracking, stock movement history, reports/analytics, and a candidate advanced invoice designer. This is proposed roadmap scope, not approved or started; see the V3 section for boundaries and open design decisions.
2. **Customer Management & Purchase Insights (after inventory; version TBD)** — select/filter a customer to view their bills and identify their most-purchased products. Customer records/management already exist in the current application; this roadmap item is specifically deeper customer-level bill history and product-purchase reporting, not a claim that customer CRUD must be built from scratch. This depends on reliable product records and invoice-item data. It is not assigned a final version or sprint yet.
3. **V4 — Finance (existing roadmap)** — paid/unpaid status, payments, suppliers, purchases, and GST features, subject to future scope review.

**Cross-version customer-management principle:** Customer management is an existing capability, not a separate standalone version that must be completed before other work can proceed. Extend it **alongside the version whose workflow needs the customer capability**: for example, add customer-linked sales/history insights as part of the inventory-and-analytics work when the product/invoice data is ready, and connect customer records to payment status and outstanding balances as part of the finance work. Later customer-level purchase history, repeat-customer analysis, or spending summaries may be considered when they fit the relevant scope. These are sequencing examples, not approved acceptance criteria; finalize exact features and version boundaries during planning. Reuse and extend the existing customer records rather than rebuilding basic customer CRUD without a demonstrated need.

### V2.4 --- Invoice Deletion

Implementation complete, locally build-verified, committed, and pushed
as commit `15623b5` (`Add invoice deletion`). The user reported that the
deletion flow works; backend compilation and frontend production build
passed. An unauthenticated DELETE request was rejected, and the user
reported that deleting invoice `23` was followed by invoice `24`, which
is consistent with the no-reuse rule. Cross-business isolation, actual
database cascade behavior, automated regression coverage, deployment,
and production smoke testing remain unverified.

### V2.5 --- Edit Saved Invoices

Implementation complete across five application files. `PUT /bills/{bill_id}` was added with authenticated current-business scoping, validation, server-side total recalculation, and item replacement in the transaction. The frontend adds `updateBill`, editor edit mode, save confirmation, a history Edit action, and `/bills/:billId/edit` routing. No schema change or Alembic migration was reported. Backend compilation and frontend production build passed; the user reports functional checks passed. Final whitespace check, dedicated authorization and invoice identity/numbering invariant tests, rollback/item-replacement tests, commit/push, and production deployment remain unverified. The build retains a non-blocking bundle-size warning.

### Deferred --- Invoice Numbering Hardening and Regression Tests

The previously proposed numbering-hardening sprint was explicitly
postponed in favor of invoice deletion. It remains outstanding and is
not complete. Its candidate work includes prefix switching/reuse,
integer boundaries, concurrent creation, rollback behavior, migration
edge cases, PDF numbering regression, `.env.example` review, and release
verification. Do not label it completed or started.

### V3 --- Inventory & Analytics (roadmap; detailed scope proposed, not approved)

**Purpose:** Extend the application from invoice creation into reusable product records, stock control, and useful business reporting. This is a roadmap grouping, not a claim that V3 has been scheduled or implementation has started.

1. **Product catalogue** — maintain reusable product records (for example, product name/description and default unit rate) so invoice items can be selected rather than repeatedly entered. Final product fields and pricing rules require design.
2. **Inventory/stock management** — track available quantities for stock-managed products and define how finalized invoices affect stock. Low-stock warnings/replenishment indicators are candidate capabilities, not yet committed acceptance criteria.
3. **Stock movement history** — record and explain stock increases/decreases, such as purchases, sales, returns, and manual adjustments. Exact transaction types and correction rules remain to be designed.
4. **Reports and analytics** — provide useful sales/product summaries and trends based on reliable invoice and product data. Exact reports and metrics remain to be prioritized.
5. **Advanced invoice designer (candidate)** — greater control over invoice layout, typography, positioning, and visual elements beyond the current editor. This item needs scope review and may be split from inventory/analytics if it makes V3 too broad.

**Sequencing dependency:** establish the product catalogue and inventory data model before implementing customer-level product insights. Keep invoice quantity/rate/line-total arithmetic consistent with stock quantities and finalized invoice behavior. Customer-level bill/product insights should be integrated into the relevant inventory/analytics sprint when dependencies are ready, rather than treated automatically as a separate standalone version. Finance-related customer capabilities (such as linking customers to payments and outstanding balances) belong with the V4 finance workflow when that scope is planned.

**Status:** Future roadmap / proposed scope. No V3 implementation, sprint approval, or final acceptance criteria are recorded here.

### V4 --- Finance

1.  Paid/unpaid status
2.  Payments
3.  Suppliers
4.  Purchases
5.  GST features

Status: planned.

### V5 --- Advanced

1.  AI automation
2.  Advanced reporting
3.  PWA/mobile improvements
4.  Backups
5.  Other advanced business features

Status: planned.

## 10. Invoice Design Decisions

-   Center `INVOICE` above the seller/logo row.
-   Seller information left, logo right.
-   Bill To left, invoice number/date right.
-   Keep seller information verbose: address, city, pincode, state,
    GSTIN, Udyam, phone, email.
-   Prefer dynamic horizontal widths over rigid fixed widths.
-   One-page fitting is a target, not an absolute requirement.
-   Never make text unreadably small to force one page.
-   Prefer adaptive spacing/layout before aggressive font shrinking.
-   Defer detailed object/logo sizing refinement.
-   Eventually align `BillPreview.tsx` with the final PDF.
-   Do not divert V2 into reports while invoice workflow work remains.

### V2.2 PDF implementation

The committed PDF generator uses three density levels: - Normal: up to 5
items. - Compact: 6--10 items. - Dense: more than 10 items.

Section spacing and item-table padding decrease as item count grows;
existing font sizes remain unchanged. The user confirmed a 14--16-item
invoice fit on one page in their test. This is not a guarantee for every
possible content combination.

The signature block is added only when the business signature image
loads successfully. Without a loaded signature image, the image and
`Authorized Signatory` label are omitted and no signature block is
added.

## 11. Current Invoice Numbering

V2.3 adds business-specific `invoice_prefix` and `next_invoice_number`
settings. The Business Profile UI supports editing both values and
previewing the formatted number. The numeric portion is formatted with
at least four digits (for example, `TEST-0001`); values above four
digits are not truncated.

The allocator locks the business row with `SELECT ... FOR UPDATE`,
inspects existing invoice numbers for the configured prefix, chooses the
greater of the configured next number and the highest existing suffix
plus one, updates the next sequence, and creates the bill/items in the
same session transaction. The existing unique constraint
`uq_bill_business_invoice_number` on `(business_id, invoice_number)`
remains the database safeguard.

The migration backfills only historical numbers matching exact legacy
format `INV-<digits>`. Existing invoices are not renumbered. Reusing an
older prefix should reconcile against numbers already using that prefix,
but this behavior has not been covered by recorded automated tests.

### Numbering validation and limitation

Prefix length is 1--20 characters. The first character must be
alphanumeric; subsequent characters may be letters, digits, spaces, `/`,
or `-`. Leading/trailing whitespace is stripped when assigning the
prefix in the update endpoint. The sequence is constrained to
1--2147483647.

The allocator rejects allocation at or above `2147483647` with HTTP
`409 Conflict`, so the maximum signed 32-bit integer itself cannot be
issued. A historical backfill may cap the next sequence at that
boundary, leaving the business unable to create another invoice until a
design/schema decision is made. This is a known limitation, not a
verified production incident.

The business-row lock is intended to serialize allocations for a single
business, but simultaneous requests and multiple-worker behavior have
not been verified through automated concurrency testing. Do not treat
concurrency safety as fully proven until tested.

## 12. V2 Implementation Strategy

1.  Inspect the existing implementation.
2.  Identify schema requirements.
3.  Reuse existing schema structures only when appropriate; V2.3 uses
    dedicated business columns for invoice numbering.
4.  Create migrations only after schema design is clear.
5.  Update models.
6.  Update API.
7.  Update frontend.
8.  Update PDF behavior if relevant.
9.  Run backend compilation and frontend build.
10. Test locally, including regressions.
11. Review diffs and commit coherent changes.
12. Push, deploy, and verify production where applicable.
13. Add a complete handoff to Section 19.

Do not overengineer. Distinguish local validation from production
verification.

## 13. Validation Commands

Run from the repository root:

``` powershell
cd "C:\College work\Project\billing-software"
cd backend
python -m compileall app
cd ..\frontend
npm run build
```

Latest recorded results on 2026-10-09: - `python -m compileall app`:
passed. - `npm run build`: passed. - Vite transformed 79 modules. - Main
JavaScript bundle: approximately 548.83 kB before gzip and 150.23 kB
after gzip. - Vite emitted a non-blocking warning because a chunk
exceeded 500 kB after minification.

These are the latest recorded results, not a claim that checks were
rerun after every future change.

## 14. Git and Working Tree

### Latest confirmed sprint commit (V2.7)

-   Commit: `7bfa13c`
-   Message: `Add invoice row management and highlighting`
-   Push: user-provided output confirmed `91e4cbe..7bfa13c master -> master`.
-   Previous V2.6 commit: `91e4cbe` (`Align invoice preview with PDF layout`).
-   V2.4 historical commit: `15623b5` (`Add invoice deletion`)
-   Branch: `master`
-   Remote: `origin`
-   Remote repository: `https://github.com/ZaidK82/billing-software.git`
-   Push: confirmed successful; recorded output
    `3fa0195..15623b5 master -> master`.
-   Four application files were committed:
    `backend/app/api/router.py`, `frontend/src/App.tsx`,
    `frontend/src/components/billing/BillHistory.tsx`, and
    `frontend/src/lib/api.ts`.
-   Commit output reported 4 files changed, 144 insertions, and 2
    deletions.

### Working-tree status

For V2.7, the user reported that after the application commit and push, `git status` showed `master` up to date with `origin/master`, latest commit `7bfa13c`, and `PROJECT_BRAIN.md` still untracked; no tracked application changes remained. An earlier V2.6 review also showed `v2.6-review-bundle.zip` as untracked; its current existence/need is unknown. This generated/documentation update has not yet been confirmed committed or pushed. Recheck `git status --short --branch` and `git log -1 --oneline` before assuming the working tree is clean. Do not accidentally stage review artifacts with application changes.

### Previous sprint commits

-   `3fa0195` --- `Add custom invoice numbering` (V2.3), pushed to
    `origin/master`.
-   `3ba0043` --- `Improve invoice PDF layout and fitting` (V2.2).
    Its push/deployment status was not established by the V2.3 handoff.

### Environment-template review

The committed `backend/.env.example` change in V2.3 replaced the
`SUPABASE_SERVICE_ROLE_KEY` placeholder `your_service_role_key_here`
with an empty value. The rationale was not documented. Review whether
this was intentional and confirm that no real credentials are present in
Git. No evidence in the supplied handoffs establishes that a secret was
committed.

### Deployment status

V2.4, V2.6, and V2.7 pushes are confirmed by user-provided terminal output. V2.5 commit/push identity remains unconfirmed in the supplied record. Backend deployment, frontend deployment, production database state, and production smoke testing for V2.2–V2.7 are not verified. No deployment command, CI/CD result, hosted version confirmation, or production smoke-test output was supplied. Do not infer deployment from a Git push.

## 15. Current Sprint State

### V2.8 --- V2 Completion

**Status:** Implementation complete as recorded; commit and push confirmed; logo/signature loading, customer loading after refresh, and frontend/backend validation user-reported verified. Deployment explicitly deferred. Overall V2 closure is not yet confirmed pending reconciliation against the canonical V2 roadmap and historical handoffs. Full handoff appended in Section 19.

**Commit:** `dcd1399437352f8eb11260de7b969bce8fd46644` (`dcd1399`) --- `Complete V2 invoice entry improvements`. The user-provided commit summary reports 9 files changed, 1,747 insertions, and 104 deletions. Push output confirmed `7bfa13c..dcd1399 master -> master`. The user subsequently reported `git rev-parse HEAD` and `git rev-parse origin/master` both returned `dcd1399437352f8eb11260de7b969bce8fd46644`.

**Files reported changed (9 total):**
- `backend/alembic/versions/fdf19b7ec7a9_add_bill_appearance_settings.py` (new): migration associated with appearance settings; exact operations not yet inspected.
- `backend/app/api/router.py`: backend API changes associated with V2.8; endpoint-level details require diff inspection.
- `backend/app/models/bill.py`: model changes associated with appearance/settings; exact fields require source inspection.
- `backend/app/services/invoice_pdf.py`: PDF generation changes associated with V2.8 appearance behavior; exact layout changes require diff inspection.
- `frontend/src/App.tsx`: application loading/state/route behavior, including reported customer and business asset loading fixes.
- `frontend/src/components/billing/BillEditor.tsx`: invoice editor changes associated with V2.8 entry behavior.
- `frontend/src/components/billing/BillPreview.tsx`: preview changes associated with appearance and asset loading.
- `frontend/src/lib/api.ts`: frontend API client changes; exact request/response contract changes require diff inspection.
- `frontend/src/lib/plainTextInvoiceParser.ts` (new): plain-text invoice parsing support.

**Feature status:**
- Item-total entry mode: included in V2.8 scope/implementation record. Intended behavior is to derive unit rate from entered line total divided by quantity using safe two-decimal currency rounding. Exact numerical test cases/output and edge-case coverage are not recorded in this handoff.
- Plain-text auto-fill: parser file creation and commit inclusion confirmed. Detailed parser rules, mapped fields, and automated edge-case coverage are not recorded here.
- Bill appearance settings: backend model/API, editor, preview, PDF generator, and migration files were changed in the same commit. Exact fields and preview/PDF behavior should be checked against the committed source before adding more detailed technical claims.
- Logo/signature loading: user explicitly reported verified; do not reopen as an unresolved bug solely because automated logs are absent.
- Customer loading after refresh: user explicitly reported verified; intended requirement is that customers are available in invoice create/edit flows after refresh without first visiting the Customers page. Do not claim automated route-specific tests unless confirmed from repository evidence.

**Database:** Migration file `backend/alembic/versions/fdf19b7ec7a9_add_bill_appearance_settings.py`; revision ID is expected to be `fdf19b7ec7a9` from the filename but must be confirmed against the declared `revision`. Its `down_revision`, schema operations, defaults, nullability, constraints, and downgrade operations have not been verified from source in this handoff. Whether it has been applied to local, configured, or production databases is unverified. Do not claim migration tests passed or infer production migration state.

**Validation recorded:** User reports frontend/backend validation verified. Exact commands, logs, automated test counts, coverage, frontend build output, backend test output, and migration upgrade/downgrade output were not included. Treat validation as user-reported, not independently captured test evidence. Production behavior was not tested in the recorded evidence.

**Git and working tree:** Commit and push confirmed; local `master` and `origin/master` were reported at the same hash. The final recorded status had no tracked changes staged or unstaged, but two untracked files remained: `PROJECT_BRAIN.md` and `billing-v28-review.zip`. Therefore the working tree was not completely clean. Neither untracked file was included in the V2.8 commit. Do not commit the ZIP unless explicitly requested. The Project Brain document update should be committed separately only after review and user authorization/process.

**Deployment:** Deferred by explicit user decision; not required at this stage. No deployed commit, release command, production health check, or production smoke test is recorded. Do not describe V2.8 as deployed.

**Overall V2 closure:** Pending reconciliation against the canonical roadmap and historical handoffs. V2.8 commit success does not prove all V2 roadmap requirements are complete.

### Release and roadmap state

- V2.8 implementation: recorded complete, committed and pushed.
- User-reported functional validation: logo/signature loading, customer loading after refresh, and frontend/backend validation reported verified.
- Migration: included in commit; schema operations and applied state unverified.
- Deployment: deferred, not performed/verified.
- Project Brain: update was deferred until this handoff is applied; Git status previously showed it untracked.
- Overall V2 release closure: pending roadmap reconciliation.

## 16. Next Recommended Task --- V2 Roadmap Reconciliation

**Status:** Immediate documentation/reconciliation task; not a new application implementation sprint.

### Objective

Establish whether V2 is genuinely closed by comparing the canonical roadmap with the complete V2.2--V2.8 sprint records, preserving each historical handoff and distinguishing completed implementation from tested, pushed, deployed, or deferred work. Do not start V3 implementation during this task.

### Required actions

1. Compare the current V2 roadmap and all V2.2--V2.8 handoffs in Section 19. Mark each intended V2 deliverable complete, pending, explicitly deferred, or unverified based on evidence.
2. Inspect `backend/alembic/versions/fdf19b7ec7a9_add_bill_appearance_settings.py`; record the declared `revision`, `down_revision`, exact `upgrade()` and `downgrade()` operations, and whether any migration execution evidence exists. Do not infer migration details from its filename.
3. Reconcile exact V2.8 parser, item-total, appearance-setting, API, and PDF details from committed source if the repository is available. Do not invent automated tests.
4. Preserve the confirmed commit `dcd1399437352f8eb11260de7b969bce8fd46644`, push status, and two untracked files reported in the final status. Keep deployment deferred unless the user changes that decision.
5. Update current-state/roadmap sections while retaining all historical sprint handoffs without deletion or silent shortening.
6. Only after V2 closure is established, review the existing V3 roadmap and dependencies and recommend the next development sprint. Do not invent V3 scope or start implementation in this reconciliation task.

### Acceptance criteria

- Every recorded V2 requirement has a traceable status and evidence category.
- The V2.8 migration's actual declarations and operations are documented or explicitly marked unverified if source inspection is unavailable.
- Commit, push, deployment, migration, and testing statuses remain distinct.
- Prior sprint archive entries remain intact.
- No application code is changed as part of the documentation/reconciliation task.

### Upcoming development order (subject to V2 closure and scope review)

| Order | Work | Status |
|---:|---|---|
| 1 | V2 roadmap reconciliation and migration-detail verification | Immediate task |
| 2 | V3 planning from the existing canonical roadmap | Only after V2 closure; no feature scope approved by this handoff |
| 3 | Inventory management, followed by customer-level bill/product insights | Future proposed roadmap; detailed scope/version TBD |
| 4 | Further analytics and V4 finance capabilities | Future roadmap; scope and dependencies TBD |

## 17. Development Rules

-   Inspect existing implementation before proposing replacements.
-   Separate confirmed facts from plans and recommendations.
-   Give exact file-level changes when implementation is requested.
-   Preserve working V1 behavior unless a feature explicitly changes it.
-   Extend existing services/models rather than duplicating
    architecture.
-   Keep migrations incremental.
-   Test compile/build after meaningful changes.
-   Verify production after deployment.
-   Do not assume deployment failures without reproducing them.
-   Keep implementation as small and safe as practical.
-   Prioritize readable PDF text over forcing every invoice onto one
    page.
-   Align Bill Preview and final PDF once PDF layout is stable.
-   Do not jump to V3 reports while V2 invoice workflow work remains.
-   Do not call a feature complete solely because code was written;
    record validation and deployment separately.
-   Never include secrets from `.env` files in project documentation or
    handoffs.
-   If repository state contradicts the Brain, inspect the repository
    and record the discrepancy.

## 18. Future Handoff Process

After each sprint, append one complete, standalone handoff to Section
19. Do not replace this Brain or require the user to patch scattered
sections manually.

Use this template:

``` markdown
---

# Sprint Handoff — [Sprint ID and Name]

**Completed:** YYYY-MM-DD
**Status:** Complete locally / Committed / Pushed / Deployed (state each accurately)
**Commit(s):** [hash and message, or not committed]

## Objective
[What the sprint set out to do.]

## Confirmed implementation facts
- Features:
- Files changed:
- Database/schema changes: [or None]
- Alembic migration: [or None]
- API changes: [or None]
- Frontend changes: [or None]
- PDF/UI changes: [or None]

## Tests and validation
- Backend:
- Frontend:
- Automated/manual tests:
- Warnings:

## Deployment status
- Push:
- Backend:
- Frontend:
- Production verification:

## Bugs and limitations
- [Known issues and unverified behavior.]

## Decisions made
- [Decisions and rationale.]

## Roadmap impact
- Completed:
- Deferred:
- Next recommended sprint:

## Handoff summary
[Short factual summary.]
```

Archive rules: - Append at the end of Section 19; never overwrite
historical handoffs. - Each handoff must be complete and understandable
on its own. - Keep current-state sections concise and update them only
when current implementation, deployment, or plan changes. - Clearly
distinguish confirmed facts, recommendations, and unverified claims. -
If a sprint did not touch database, migrations, API, or frontend,
explicitly write "None." - Preserve commit hashes and validation
results. - State "deployment not confirmed" when that is the evidence. -
Do not include secrets.

## 19. Sprint Handoff Archive

### V2.2 --- Invoice PDF

**Completed:** 2026-10-09\
**Status:** Complete locally and committed; deployment not confirmed\
**Commit:** `3ba0043` --- `Improve invoice PDF layout and fitting`

#### Objective

Improve PDF vertical fitting and remove demonstrably redundant code
while preserving the established invoice layout and readability.

#### Confirmed implementation facts

-   Changed `backend/app/services/invoice_pdf.py`.
-   Removed duplicate/overwritten style definitions and redundant code.
-   Replaced hard-coded `178 * mm` with calculated `content_width`.
-   Removed the empty logo placeholder.
-   Added normal, compact, and dense layout spacing based on item count.
-   Reduced table padding for larger invoices without shrinking existing
    font sizes.
-   Preserved seller/customer/invoice structure, dynamic columns, Indian
    currency formatting, amount-in-words conversion, terms, branding,
    and footer.
-   Signature block is conditional on successfully loading the business
    signature image.
-   Database/schema changes: none.
-   Alembic migration: none.
-   API changes: none.
-   Frontend changes: none.

#### Tests and validation

-   `python -m compileall app`: passed.
-   `npm run build`: passed.
-   Vite bundle-size warning: main JS bundle approximately 548.83 kB
    before gzip; non-blocking.
-   User confirmed a 14--16-item invoice fitted on one page in the
    tested scenario.
-   Bill creation and PDF generation worked after the user reduced an
    oversized test amount.

#### Deployment status

-   Commit created locally.
-   Last observed `master` was one commit ahead of `origin/master`.
-   Push and deployment of this commit were not confirmed.

#### Bugs and limitations

-   Oversized amount `234243565612.00` caused a PostgreSQL
    `NUMERIC(12, 2)` overflow. User reduced the amount; root cause
    remains uninvestigated.
-   Business Profile has no controls to delete uploaded
    logos/signatures.
-   Bill creation has no per-invoice signature checkbox.
-   Long addresses, extensive terms, and all extreme PDF combinations
    were not fully tested.
-   Vite emits a non-blocking bundle-size warning.

#### Decisions made

-   Preserve readability over forcing every invoice onto one page.
-   Reduce spacing/padding before considering font-size changes.
-   Defer monetary validation and schema precision investigation.
-   Defer asset deletion and per-invoice signature selection.
-   Do not create a migration for PDF-only changes.

#### Roadmap impact

-   PDF layout/vertical-fitting improvements: implemented locally and
    tested for the reported invoice.
-   Custom invoice numbering: next recommended sprint; not started.
-   Monetary validation, asset deletion, and per-invoice signature
    selection: deferred.

#### Handoff summary

V2.2 PDF work is committed locally as `3ba0043`. Backend compilation and
frontend production build passed. The user verified a 14--16-item
invoice on one page. Deployment remains unconfirmed. Next recommended
sprint: custom invoice numbering.

### V2.3 --- Custom Invoice Numbering

## 1. Sprint Identification

-   **Project:** Billing Software
-   **Sprint:** V2.3 --- Custom Invoice Numbering
-   **Objective:** Implement business-specific invoice prefixes and
    configurable next invoice numbers, preserve historical invoice
    numbers, and allocate unique invoice numbers when creating invoices.
-   **Completion status:** Core implementation completed and pushed to
    GitHub; functional testing reported successful by the user. Final
    production-readiness verification remains incomplete.
-   **Implementation date:** October 9--10, 2026, based on the recorded
    development session.
-   **Repository branch:** `master`
-   **Latest sprint commit:** `3fa0195`
-   **Remote:** `origin`
-   **Push status:** Confirmed successful push to `origin/master`.
-   **Deployment status:** Not verified. A successful Git push does not
    establish that the application has been deployed.

## 2. Objective and Outcome

V2.3 adds configurable invoice numbering to each business profile. A
business can configure: - An invoice prefix, such as `INV-`, `TAX-`, or
`BILL/2026-`. - The next invoice sequence number. - A preview of the
resulting invoice number in the business profile UI.

Invoice numbers are formatted with at least four digits for the numeric
portion. For example, prefix `TEST-` and sequence `1` produce
`TEST-0001`.

The invoice creation endpoint uses a database row lock on the business
record to serialize invoice-number allocation for requests targeting the
same business. The existing unique constraint on
`(business_id, invoice_number)` remains in place as a database-level
safeguard.

The migration backfills the next sequence from historical invoice
numbers matching the exact legacy format `INV-` followed by digits.
Historical invoices are not renumbered.

## 3. Implementation Status

### Completed

1.  Added `invoice_prefix` and `next_invoice_number` to the SQLAlchemy
    Business model.
2.  Added business-profile API request and response fields.
3.  Added validation for invoice prefixes and sequence values.
4.  Added a business-profile UI section for editing the prefix and next
    number, including a formatted preview.
5.  Added invoice allocation using a business-row lock and
    reconciliation against existing invoices for the configured prefix.
6.  Added an Alembic migration to introduce and backfill the new fields.
7.  Updated frontend TypeScript business-profile types and the profile
    payload constructed in `App.tsx`.
8.  Applied the migration to the configured database.
9.  Successfully built the frontend and compiled the backend.
10. Successfully checked Alembic model/schema consistency after applying
    the migration.
11. Corrected a prefix-validation error discovered during UI testing.
12. Committed and pushed the sprint changes.

### Partially completed / requires further verification

-   Functional duplicate-protection behavior was tested by the user, but
    no automated or concurrent-request test was performed in the
    recorded session.
-   The database lock design is intended to serialize concurrent
    allocation, but it has not been validated under simultaneous
    requests or multiple application workers.
-   The sequence boundary is handled conservatively by rejecting
    allocation at or above `2147483647`. The maximum integer itself
    cannot be issued by the current allocator. This behavior is
    deliberate in the current implementation but should be documented
    and reviewed.
-   Existing invoice numbers remain unchanged, as confirmed by user
    testing. The migration backfill and allocation logic still need
    broader automated tests for unusual historical data and prefix
    changes.
-   No PDF layout changes were part of this sprint. The invoice number
    is generated by the backend; the existing PDF rendering path should
    be checked in a dedicated regression test if PDF output is part of
    release validation.

### Not completed or not established

-   No automated backend test suite results were recorded.
-   No automated concurrency test was performed.
-   No production deployment or production smoke test was verified.
-   No new PDF layout or styling feature was implemented.
-   No commit was made specifically to update `PROJECT_BRAIN.md` in the
    recorded sprint commit. The file was explicitly excluded from the
    V2.3 commit.
-   No evidence establishes that the final Git working tree was clean
    after the push.

## 4. Files Changed

The following seven files were included in commit `3fa0195`.

### Backend

**`backend/app/models/business.py`** - Added `invoice_prefix`, a
non-null string column with a default of `INV-`. - Added
`next_invoice_number`, a non-null integer column with a default of `1`.

**`backend/app/api/router.py`** - Added the two invoice-numbering fields
to `BusinessProfileResponse`. - Added validation to
`BusinessProfileUpdate`. - Prefix constraints: 1--20 characters; the
first character must be alphanumeric; subsequent characters may be
letters, digits, spaces, `/`, or `-`. - Sequence validation: minimum
`1`, maximum `2147483647`. - Updated the business-profile endpoint to
save the prefix and next sequence. - Updated `create_bill` to lock the
business row with `SELECT ... FOR UPDATE`, inspect existing invoice
numbers matching the current prefix, allocate the next number, update
the sequence, and create the bill within the same session transaction. -
Rejects allocation at or above `2147483647` with HTTP `409 Conflict`.

**`backend/alembic/versions/c2d3e4f5a6b7_add_business_invoice_numbering.py`** -
Introduced the business-specific numbering columns. - Backfills the next
sequence from matching historical `INV-<digits>` invoice numbers. - Uses
numeric conversion for the historical suffix maximum and caps the
sequence at `2147483647`. - Downgrade removes both new columns.

**`backend/.env.example`** - The service-role-key placeholder was
changed from `your_service_role_key_here` to an empty value. - This
change was included in the commit. - Rationale was not documented;
verify whether this was intentional. Do not assume this represents a
credential or a production configuration change.

### Frontend

**`frontend/src/lib/api.ts`** - Added `invoice_prefix` and
`next_invoice_number` to the `BusinessProfile` TypeScript type.

**`frontend/src/App.tsx`** - Added the new fields to the
business-profile object sent by the relevant application flow.

**`frontend/src/components/business/BusinessProfile.tsx`** - Added the
Invoice Numbering UI section. - Added editable prefix and next-sequence
inputs. - Added browser-side validation and a formatted invoice-number
preview. - Existing invoices are explicitly described as not being
renumbered.

### Excluded file

**`PROJECT_BRAIN.md`** - Was untracked in the working tree and
explicitly excluded from the V2.3 commit. - Its content should be
updated separately in the permanent Project Brain workflow. - Do not
state that the document was committed or pushed as part of V2.3.

## 5. Database and Migration Details

-   **Migration revision:** `c2d3e4f5a6b7`
-   **Parent revision:** `ad874b881aa9`
-   **Pre-migration database revision:** `ad874b881aa9`
-   **Post-migration database revision:** `c2d3e4f5a6b7`
-   **Current Alembic head:** `c2d3e4f5a6b7`
-   **Migration application:** Confirmed successful.
-   **Post-migration schema check:** `alembic check` reported
    `No new upgrade operations detected.`

### Added schema fields

  Table          Column                  Type            Nullability   Default
  -------------- ----------------------- --------------- ------------- ---------
  `businesses`   `invoice_prefix`        `VARCHAR(20)`   NOT NULL      `INV-`
  `businesses`   `next_invoice_number`   `INTEGER`       NOT NULL      `1`

### Backfill behavior

For each business, the migration finds existing invoice numbers matching
`^INV-[0-9]+$`, extracts the numeric suffix, and sets
`next_invoice_number` to the highest matching suffix plus one. The
result is capped at `2147483647`. If there are no matching invoices, the
sequence defaults to `1`.

Historical invoices are not modified or renumbered by the migration.

### Existing database constraint

The existing unique constraint is `uq_bill_business_invoice_number` on
`(business_id, invoice_number)`. It remains the final database safeguard
against duplicate invoice numbers for the same business.

### Database caveats

-   The migration was applied to the database configured in the local
    environment. Do not infer that the production database has been
    migrated.
-   The migration and sequence logic should be tested against historical
    suffixes that are extremely large or have unusual formats.
-   The migration's downgrade drops the two new columns and therefore
    discards their configuration values. Downgrade behavior has not been
    executed or tested.
-   The migration uses PostgreSQL-specific behavior and was
    generated/reviewed as PostgreSQL SQL.

## 6. API and UI Behavior

### Business-profile API

The business profile now exposes and accepts: - `invoice_prefix` -
`next_invoice_number`

The backend validates both fields. Prefixes cannot start with a space,
although spaces are allowed after the first character. Leading/trailing
whitespace is stripped when assigning the prefix in the update endpoint.

### Invoice creation

The `create_bill` endpoint: 1. Retrieves and locks the business row
using `with_for_update()`. 2. Reads the configured prefix. 3. Inspects
existing invoice numbers for that business and prefix. 4. Determines the
highest numeric suffix. 5. Allocates the greater of the configured next
number and the highest existing suffix plus one. 6. Updates the
business's next sequence. 7. Adds the invoice and its items. 8. Commits
the transaction.

The business lock and invoice insert occur in the same database session
and the lock is held until the transaction commits.

### Prefix-validation bug and fix

During testing, saving the profile returned HTTP `422` because the
prefix `kaif the bewakoof -` did not match the original regex, which
disallowed spaces.

The backend and frontend patterns were updated to permit spaces after
the first alphanumeric character.

The user then reported that saving the profile worked.

### PDF behavior

No PDF template or layout files were changed during this sprint.
PDF-specific regression coverage was not recorded. Invoice-number
display in the existing PDF path should be verified if not already
covered by prior PDF tests.

## 7. Tests and Validation --- Actual Results

### Confirmed automated/build checks

**Frontend production build** - Command: `npm run build` - Result:
Passed. - TypeScript compilation and Vite production build succeeded. -
Vite emitted a non-fatal warning that a minified JavaScript chunk
exceeded 500 kB; the reported chunk was approximately 551 kB.

**Backend Python compilation** - Command: `python -m compileall app` -
Result: Passed without syntax errors.

**Backend and migration compilation** - Command:
`python -m compileall app alembic` - Result: Passed without syntax
errors.

**Alembic migration application** - Command: `alembic upgrade head` -
Result: Successfully upgraded `ad874b881aa9` to `c2d3e4f5a6b7`.

**Alembic current revision** - Command: `alembic current` - Result:
`c2d3e4f5a6b7 (head)`.

**Alembic model/schema consistency** - Command: `alembic check` -
Result: `No new upgrade operations detected.`

**Migration SQL preview** - Command: `alembic upgrade head --sql` -
Result: Generated SQL successfully for review before applying the
migration. This was a SQL preview, not a database upgrade.

### User-performed functional testing

The user explicitly confirmed that all five test scenarios worked:

1.  Business-profile settings persisted after reload.
2.  Sequential numbering worked.
3.  A custom starting number worked.
4.  Existing invoice numbers remained unchanged.
5.  Duplicate protection passed functional testing.

The user also confirmed that the profile-save error was fixed after the
prefix regex was updated.

These are user-reported functional results. Do not describe them as
automated tests.

### Tests not performed or not recorded

-   Automated unit or integration tests for invoice numbering.
-   Concurrent invoice-creation stress test.
-   Multi-worker or multi-process locking verification.
-   Automated tests for changing prefixes repeatedly, switching back to
    a prior prefix, or setting a sequence below an existing number.
-   Automated tests for malformed or unusually large historical invoice
    suffixes.
-   Automated boundary tests at `2147483646` and `2147483647`.
-   A PDF output regression test specific to the new invoice numbering
    feature.
-   Production deployment or production smoke test.

## 8. Git State, Commit, Push, and Deployment

Keep these statuses distinct.

### Commit

-   **Commit:** `3fa0195`
-   **Message:** `Add custom invoice numbering`
-   **Files committed:** Seven code/configuration/migration files.
-   **Commit result:** Confirmed successful.

### Push

-   **Remote:** `origin`
-   **Branch:** `master`
-   **Push result:** Confirmed successful.
-   **Recorded output:** `123ae88..3fa0195 master -> master`
-   **Remote repository URL:**
    `https://github.com/ZaidK82/billing-software.git`

### Git working tree

-   `PROJECT_BRAIN.md` was untracked at the time of the commit and was
    intentionally excluded.
-   No final `git status` output was recorded after the commit and push.
-   Therefore, the post-push working-tree cleanliness is **unverified**.
-   Before assuming there are no remaining changes, run
    `git status --short` and `git log -1 --oneline`.

### Deployment

-   **Status:** Unverified.
-   No deployment command, CI/CD result, hosted health check, or
    production smoke-test output was provided.
-   Do not mark the sprint as deployed based on the Git push.

## 9. Technical and Product Decisions

1.  **Business-specific numbering configuration:** Prefix and next
    sequence are stored on `businesses`, making settings specific to
    each business.
2.  **Preserve historical invoices:** Existing invoice numbers are not
    rewritten when the migration runs.
3.  **Reconcile before allocation:** The allocator compares the
    configured sequence with existing invoice suffixes for the current
    prefix to avoid allocating a number already in use.
4.  **Serialize allocation:** A row-level business lock is used to
    reduce race conditions for concurrent requests targeting the same
    business.
5.  **Retain uniqueness enforcement:** The existing
    `(business_id, invoice_number)` unique constraint remains as a
    safeguard.
6.  **Minimum four-digit formatting:** The number is formatted with
    `:04d`; values above four digits are not truncated.
7.  **Prefix validation:** Prefix length is limited to 20 characters.
    The first character must be alphanumeric; subsequent characters may
    be alphanumeric, spaces, hyphens, or slashes.
8.  **Integer boundary:** The current allocator rejects numbers greater
    than or equal to `2147483647`, preventing the following sequence
    increment from overflowing the PostgreSQL integer column. This
    sacrifices use of the maximum integer itself and should be treated
    as a documented limitation.
9.  **No unrelated PDF changes:** The sprint focused on numbering
    configuration, API behavior, and invoice allocation.

## 10. Known Risks and Deferred Work

### Concurrency correctness

The row-lock design is promising, but it has not been tested under
simultaneous requests. Add an automated test that attempts multiple
invoice creations for the same business and verifies uniqueness and
expected ordering. Also test concurrent requests for different
businesses to confirm that they do not unnecessarily block each other.

### Prefix and sequence changes

Changing a prefix creates a separate visible numbering namespace. If a
user later switches back to an older prefix, the allocator must
reconcile with the existing numbers for that prefix. Test this
explicitly.

Setting the next sequence lower than existing numbers should not
generate a duplicate because the allocator reconciles against existing
suffixes. However, this behavior should be covered by automated tests.

### Numeric boundary

The migration caps the backfilled sequence at `2147483647`, while the
current allocator rejects allocations at or above that value. A business
whose historical sequence reaches this boundary will be unable to create
another invoice without a schema/design change. Consider using a wider
integer type or explicitly documenting the maximum supported invoice
sequence.

### Historical data

The migration's suffix extraction handles only exact legacy invoice
numbers of the form `INV-<digits>`. Other historical prefixes and custom
formats are intentionally not used for this backfill. Verify whether
this behavior matches the existing database's actual invoice history.

The migration converts the suffix maximum to PostgreSQL `numeric` before
comparing it with the 32-bit limit, reducing the risk of overflowing
during extraction. Automated migration tests for extremely long suffixes
have not been recorded.

### Transaction error handling

The endpoint creates the bill, flushes it, adds line items, and commits
in one session. A failure during flush or commit should not leave a
partial invoice transaction, but explicit rollback/error-path tests were
not recorded.

### Example environment file

The committed `.env.example` now has an empty
`SUPABASE_SERVICE_ROLE_KEY` placeholder rather than
`your_service_role_key_here`. Confirm this is intentional and ensure
actual credentials remain excluded from Git. No evidence indicates that
secrets were committed, but the diff should be retained as a review
item.

### Build warning

The frontend build emits a non-fatal large-chunk warning. Bundle
splitting or lazy loading can be evaluated separately; it is not a
blocker for the V2.3 functionality tested here.

## 11. Roadmap Update

### Completed in V2.3

-   Business-specific invoice prefix setting.
-   Configurable next invoice sequence.
-   Business profile UI and formatted preview.
-   Backend validation and persistence.
-   Historical sequence backfill.
-   Invoice allocation with business-row locking.
-   Functional verification of persistence, sequence progression, custom
    starting values, historical invoice preservation, and duplicate
    protection.
-   Database migration applied and schema checked.
-   Code committed and pushed.

### Remaining

-   Automated tests for invoice numbering and boundary conditions.
-   Concurrency testing under simultaneous invoice creation.
-   Additional regression tests for prefix switching and sequence edits.
-   PDF output regression verification.
-   Post-push Git working-tree verification.
-   Deployment status verification.
-   Final Project Brain document update.
-   Review of the `.env.example` placeholder change.
-   Optional frontend bundle optimization.

Do not invent or assume earlier roadmap items that are not documented in
the existing `PROJECT_BRAIN.md`. Preserve the current roadmap and mark
these as V2.3 follow-ups or candidate work for the next sprint.

## 12. Recommended Next Sprint

### Recommendation: V2.4 --- Invoice Numbering Hardening and Regression Tests

**Status:** Proposed, not started.

**Objective:** Add automated tests and harden invoice-number allocation
before relying on the feature in a production environment.

**Scope:** - Add backend tests for default numbering, sequence
progression, custom starting numbers, prefix changes, and existing
invoice preservation. - Test repeated use of a previously configured
prefix. - Test sequence values lower than existing invoice suffixes. -
Test integer boundary behavior. - Test concurrent invoice creation for
the same business and verify no duplicate invoice numbers are
produced. - Verify rollback behavior when invoice or line-item creation
fails. - Add regression verification that generated invoice numbers
appear correctly in the existing invoice/PDF output. - Verify migration
behavior against representative historical invoice data. - Review the
`.env.example` change and ensure no real credentials are committed. -
Confirm the Git working tree and deployment status independently.

**Out of scope unless the tests reveal a requirement:** - New PDF layout
redesign. - Unrelated billing UI changes. - Historical invoice
renumbering. - Changing the database sequence type without an explicit
technical decision.

**Dependencies:** - Existing backend test framework and fixtures must be
reviewed first. - Use a disposable test database or isolated test
transactions for migration and concurrency tests. - Avoid running test
migrations or numbering experiments against production data. - Inspect
the current `PROJECT_BRAIN.md` roadmap before finalizing sprint version,
priority, and scope.

**Acceptance criteria:** 1. Automated tests verify normal sequence
progression and custom starting values. 2. Existing invoice numbers
remain unchanged. 3. Prefix changes and reuse of an older prefix do not
create duplicates. 4. Concurrent same-business invoice requests produce
unique invoice numbers. 5. Boundary conditions return predictable API
errors without database overflow. 6. Failed invoice creation does not
leave partial invoice records or incorrectly advance the sequence. 7.
Existing invoice/PDF rendering remains correct. 8. Migration tests pass
against representative legacy invoice data. 9. Final Git state and
deployment status are recorded separately.

## 13. Project Brain Update Instructions

Update the canonical `PROJECT_BRAIN.md` with: - V2.3 completion and
implementation details. - Migration revision `c2d3e4f5a6b7` and its
parent revision `ad874b881aa9`. - The seven committed files and their
roles. - Commit `3fa0195` and confirmed push to `origin/master`. - The
automated build, compilation, migration, and schema-check results. - The
five user-confirmed functional tests. - The unresolved concurrency,
boundary, PDF regression, environment-template, and
deployment-verification items. - V2.4 as a proposed next sprint, subject
to the existing roadmap and architecture documented in the Brain.

Preserve historical decisions and prior sprint handoffs. Distinguish
verified facts from recommendations. Do not claim deployment, automated
concurrency coverage, a clean final working tree, or tests that were not
performed.

**End of V2.3 handoff.**


---

# Sprint Handoff — V2.4 Invoice Deletion

**Handoff date:** 2026-10-10  
**Sprint:** V2.4 — Invoice Deletion  
**Sprint objective:** Implement authenticated invoice deletion with business-level authorization, a confirmation step in the frontend, appropriate error handling, and consistent invoice-history state. Preserve invoice-number sequencing so deleting an invoice never causes its number to be reused.

## 1. Completion Status

**Overall status: Implementation complete, locally build-verified, committed, and pushed. Final verification and Project Brain handoff were incomplete at the time this handoff was supplied.**

The user reported that the invoice-deletion functionality works. Backend compilation and the frontend production build succeeded. The implementation was committed and the push to `origin/master` succeeded.

Do not interpret this status as confirmation that every acceptance criterion passed. Cross-account isolation has not been independently verified with a second account/business, the database's actual cascade behavior has not been separately confirmed, and production deployment and production smoke testing have not been verified.

### Evidence categories used in this handoff

- **Confirmed from command output:** Directly supported by terminal output provided by the user.
- **User-tested behavior:** The user reported that the relevant functionality worked or reported a test result.
- **Not verified:** No evidence was provided to establish the result.
- **Recommendation:** A proposed next action, not a completed task.

## 2. Objective and Actual Outcome

The sprint introduced a delete action for invoices in the existing billing application.

The intended behavior is to allow an authenticated user to delete an invoice belonging to their current business, after explicit confirmation in the frontend. The backend must enforce access control, and the frontend must update the visible invoice history only after the server successfully deletes the invoice.

The sprint also preserves the custom invoice-numbering behavior introduced in V2.3: invoice numbers are not reused after deletion.

**Actual outcome:** The user reported that the deletion changes worked. The four source files were committed in commit `15623b5` and successfully pushed to `origin/master`. Backend compilation and the frontend build passed. Some security, database, and deployment verification remains outstanding.

## 3. Features Completed

### 3.1 Backend deletion endpoint

**File:** `backend/app/api/router.py`

Added a `DELETE /bills/{bill_id}` endpoint.

The implemented endpoint, as supplied in the sprint changes, is intended to:

- Require the existing authenticated-user dependency.
- Resolve the user's business using the existing application helper.
- Select the invoice by both invoice ID and business ID.
- Return HTTP `404` with `"Bill not found."` when the invoice is not found within that business.
- Delete the invoice and commit the transaction.
- Roll back on a deletion exception and return an HTTP `500` error with `"Unable to delete bill."`.
- Return HTTP `204 No Content` after successful deletion.

The endpoint uses the existing business-scoping model rather than introducing organization management or a new authorization system.

**Verification status:**
- Endpoint code is included in the pushed commit.
- The user reported that invoice deletion works.
- An unauthenticated request was tested and rejected with `{"detail":"Not authenticated"}`.
- A second-account/cross-business authorization test has not been confirmed.
- Actual database foreign-key cascade behavior has not been separately verified.

### 3.2 Frontend API helper

**File:** `frontend/src/lib/api.ts`

Added `deleteBill(accessToken, billId)`.

The helper sends an authenticated `DELETE` request to `/bills/{billId}`. It treats a non-success response as an error and attempts to use the API's `detail` field as the error message, falling back to a status-based message.

### 3.3 Invoice-history UI

**File:** `frontend/src/components/billing/BillHistory.tsx`

Added deletion support to the invoice-history component:

- Added the `onDeleteBill` callback prop.
- Added a confirmation dialog before deletion.
- Added a deletion-in-progress state.
- Disabled invoice actions while a deletion is in progress.
- Changed the action area to display both **View Bill** and **Delete** actions.
- Added an inline error alert for failed deletion attempts.
- Added a deleting label while the request is in progress.

The confirmation message identifies the invoice number and warns that deletion cannot be undone.

**Verification status:** The user reported that the UI and deletion behavior worked. The frontend production build also passed.

### 3.4 Application integration and cache consistency

**File:** `frontend/src/App.tsx`

Integrated the `deleteBill` helper into the existing invoice-history route.

The callback is intended to:

1. Obtain the current session.
2. Reject the operation if no access token is available.
3. Call the backend deletion helper.
4. Remove the deleted invoice from the local list only after the server request succeeds.
5. Update the invoice-list cache timestamp.
6. Clear the invoice-list error state.

This avoids optimistically removing the invoice from the UI before the backend confirms success.

## 4. Features Partially Completed or Still Requiring Verification

| Item | Status | Evidence or gap |
|---|---|---|
| Invoice deletion endpoint | Implemented | Included in commit `15623b5`; user reported working behavior |
| Confirmation and delete UI | Implemented | User reported working behavior; frontend build passed |
| Unauthenticated request rejection | Tested | API returned `"Not authenticated"` |
| Invoice-number non-reuse | User-tested | User deleted invoice number `23`; the next invoice received number `24` |
| Backend compilation | Passed | `python -m compileall app` completed without reported errors |
| Frontend production build | Passed | `tsc -b && vite build` succeeded |
| Cross-account/business isolation | Not verified | No confirmed second-account test result |
| Actual database cascade behavior | Not separately verified | Model declarations were inspected earlier, but deployed database constraints were not confirmed |
| Frontend deletion failure behavior | Partially covered by implementation | Error handling exists; no separate failure-injection test result was supplied |
| Production deployment | Not verified | No deployment confirmation supplied |
| Production smoke test | Not verified | No production test result supplied |
| Automated regression suite | Not established | No automated test execution or dedicated test suite result supplied |
| Project Brain update | Pending at the start of this handoff | This handoff must be incorporated into the canonical document |

## 5. Files Changed

The following four application source files were included in the sprint commit.

| File | Purpose |
|---|---|
| `backend/app/api/router.py` | Added the authenticated, business-scoped invoice deletion endpoint |
| `frontend/src/App.tsx` | Connected deletion to the application state and invoice-list cache |
| `frontend/src/components/billing/BillHistory.tsx` | Added confirmation, delete action, progress state, and error display |
| `frontend/src/lib/api.ts` | Added the authenticated deletion API helper |

The user staged these four files explicitly. The commit output reported **4 files changed, 144 insertions(+), and 2 deletions(-)**.

### Untracked files

At the last confirmed `git status` output before the commit, these files were untracked:

- `PROJECT_BRAIN.md`
- `v24-inspection.zip`

They were not included in the explicit `git add` command for the four application files.

Their current status after the commit and push has not been rechecked. Do not assume that either file is committed, clean, deleted, or pushed without running `git status`.

## 6. Database and Alembic

**Database/schema changes in this sprint: None intentionally made.**

**Alembic migration revision IDs: None created or reported for V2.4.**

The deletion endpoint uses the existing bill model and existing database structure. Earlier source inspection found that the `Bill.items` relationship declares `cascade="all, delete-orphan"` and that the `BillItem.bill_id` foreign key declares `ondelete="CASCADE"`.

However, model-level declarations do not prove that the actual database constraint has the expected cascade behavior. The database's deployed foreign-key definition and the result of deleting an invoice with associated items have not been independently verified in this sprint.

Do not create a migration automatically. First inspect the current database constraint and test the deletion behavior safely in a development/test environment. Create a migration only if the actual schema is missing a required constraint.

No production customer invoice should be used as a destructive test.

## 7. API, Frontend, UI, and PDF Impact

### API

- Added `DELETE /bills/{bill_id}`.
- The route is intended to require authentication and restrict deletion to the current business.
- Successful deletion returns `204 No Content`.
- Missing or inaccessible invoice returns `404`.
- Deletion failure is handled with rollback and a `500` response.

### Frontend

- Added `deleteBill(accessToken, billId)` in the API layer.
- Connected deletion to the existing application state.
- The visible invoice list is updated after a successful server response.

### UI

- Added a Delete action to invoice history.
- Added a destructive-action confirmation dialog.
- Added progress and error handling.
- Existing invoice viewing remains available.

### PDF generation

**No PDF-generation changes were made in this sprint.**

The existing PDF-generation implementation was not intentionally changed. No separate PDF regression test was reported.

## 8. Tests and Actual Results

### 8.1 Backend compilation

**Command executed:**

```powershell
cd "C:\College work\Project\billing-software\backend"
python -m compileall app
```

**Actual result:** Passed. Python listed the application directories and reported no compilation errors.

This confirms that the Python source compiled successfully. It does not substitute for endpoint integration tests or database tests.

### 8.2 Frontend production build

**Command executed:**

```powershell
cd ../frontend
npm run build
```

The build script ran:

```text
tsc -b && vite build
```

**Actual result:** Passed.

Reported output included:

```text
vite v8.3.1 building client environment for production...
✓ 79 modules transformed.
✓ built in 231ms
```

The build generated `dist/index.html`, a CSS bundle, and a JavaScript bundle.

**Non-blocking warning:** Vite reported that some minified chunks exceed 500 kB. The JavaScript bundle was reported as approximately 552.33 kB before gzip and 151.00 kB gzipped. The build still succeeded. Bundle splitting or other size optimization can be considered separately; this warning does not establish a deletion defect.

### 8.3 Unauthenticated request

The user sent a `DELETE` request without an authorization token using PowerShell.

The API returned:

```json
{"detail":"Not authenticated"}
```

**Result:** Unauthenticated access was rejected. This confirms the authentication dependency rejected that request; it does not independently prove cross-business authorization.

### 8.4 Invoice numbering after deletion

The user reported deleting invoice number `23` and then creating an invoice numbered `24`.

**Result:** User-tested behavior is consistent with the intended non-reuse rule.

Invoice numbering must not be decremented or reset when an invoice is deleted. The sequence should continue forward to avoid reusing invoice numbers.

### 8.5 User-reported functional test

The user stated that the implemented deletion changes worked.

Record this as **user-reported functional success**, not as a claim that every authorization, failure, cascade, or production scenario has passed.

### 8.6 Git whitespace check

The user ran:

```powershell
git diff --cached --check
git diff --cached --stat
```

The staged diff check produced no reported whitespace errors. The stat showed the four intended source files.

A line-ending warning was emitted for `frontend/src/App.tsx`:

```text
LF will be replaced by CRLF the next time Git touches it
```

This warning did not prevent the commit or push.

### 8.7 Tests not reported as performed

Do not claim that any of the following passed:

- Automated backend unit or integration tests.
- Automated frontend tests.
- Cross-account deletion/isolation test.
- Database-level cascade integration test.
- Production API/UI smoke test.
- Production PDF regression test.

No results for these tests were supplied.

## 9. Git and Repository State

Repository:

`https://github.com/ZaidK82/billing-software.git`

Branch: `master`

### Before the sprint commit

The latest confirmed base commit was:

`3fa0195` — `Add custom invoice numbering`

The user reported that the local branch was up to date with `origin/master` before committing V2.4.

### Sprint commit

**Commit:** `15623b5`  
**Message:** `Add invoice deletion`

The user-provided commit output confirmed:

```text
[master 15623b5] Add invoice deletion
4 files changed, 144 insertions(+), 2 deletions(-)
```

### Push status

**Confirmed pushed successfully.**

The user-provided push output confirmed:

```text
3fa0195..15623b5  master -> master
```

Remote:

`origin https://github.com/ZaidK82/billing-software.git`

### Current working-tree status

**Not rechecked after the commit/push.**

Before the commit, `PROJECT_BRAIN.md` and `v24-inspection.zip` were untracked. The four modified application files were staged and committed. A post-commit `git status` output was not supplied, so do not claim the working tree is clean.

### Deployment status

**Not verified.**

A successful Git push is not proof that the backend or frontend deployed successfully. No deployment dashboard output, production version confirmation, or production smoke-test result was supplied.

## 10. Bugs, Limitations, and Unresolved Risks

1. **Cross-business authorization requires direct verification.** The endpoint scopes its query by `business.id`, but no confirmed test using a second user/business was supplied.
2. **Database cascade remains unverified.** The model declarations indicate cascading behavior, but the actual database constraint and deletion of associated bill items were not independently verified.
3. **Error paths need additional testing.** The frontend and backend contain error-handling logic, but no deliberate server-failure or database-failure test result was supplied.
4. **No automated regression evidence.** Compilation and bundling passed, but no automated unit/integration test run was reported.
5. **Production state is unknown.** Deployment and production smoke testing were not confirmed.
6. **Frontend bundle-size warning remains.** The production build succeeds, but the main JavaScript bundle exceeds the configured warning threshold.
7. **Project Brain synchronization was pending at handoff time.** The canonical document must record the actual sprint results, distinguish unverified work, and preserve the deferred roadmap items.
8. **The inspection ZIP and Project Brain file need housekeeping.** Their post-commit Git status is not known; do not accidentally add inspection artifacts to an application commit.

## 11. Technical and Product Decisions

### 11.1 Prioritize invoice deletion over numbering hardening

The user explicitly selected **V2.4 — Invoice Deletion**, superseding the older Project Brain recommendation to prioritize invoice-numbering hardening and regression tests.

**Rationale:** Deliver the requested invoice-management capability first. Do not rewrite the historical sprint plan as though the originally recommended sprint had been completed.

### 11.2 Defer invoice-numbering hardening

Numbering hardening and its broader regression-test work remain deferred. The observed sequence `23` → deletion → `24` is a useful targeted user test, but it is not a substitute for a full numbering regression suite.

### 11.3 Preserve the existing authorization model

Use the existing authenticated-user and current-business helpers. Do not introduce organization management or a new multi-organization feature as part of deletion.

Authorization must be enforced on the backend rather than relying on the frontend to hide or disable actions.

### 11.4 Do not reuse deleted invoice numbers

The business invoice-number sequence must remain monotonic according to the existing numbering design. Deletion must not decrement `Business.next_invoice_number` or otherwise make a previously issued number available again.

### 11.5 Do not add a migration without evidence

No migration was created in V2.4. First verify whether the current database already has the required foreign-key cascade. Only introduce a migration if inspection demonstrates a schema gap.

### 11.6 Separate implementation, verification, and deployment states

A successful compile, successful frontend build, user-reported functionality, Git commit, Git push, deployment, and production verification are distinct milestones. The Project Brain must preserve these distinctions.

## 12. Roadmap Reconciliation

### Completed in V2.4

- Backend invoice-deletion route added.
- Frontend API helper added.
- Invoice-history Delete action and confirmation added.
- Deletion progress and error states added.
- Application state/cache updated after successful deletion.
- Backend compilation passed.
- Frontend production build passed with a non-blocking bundle-size warning.
- Unauthenticated request rejection tested.
- Invoice-number non-reuse tested by the user for the `23` → `24` case.
- Commit `15623b5` created and pushed to `origin/master`.

### Partially completed or pending verification

- Full authorization isolation verification.
- Database cascade verification.
- Error-path regression testing.
- Automated test coverage.
- Production deployment and smoke testing.
- Post-commit Git status verification.
- Canonical Project Brain update and archival of the sprint handoff.

### Explicitly deferred

- Invoice-numbering hardening and broader regression tests.
- Frontend bundle-size optimization, unless it becomes a separate priority or the warning becomes operationally significant.
- Any unrelated PDF, invoice-preview, or architecture work not required for V2.4.

Do not mark deferred work as complete merely because the build passes or the targeted deletion scenario works.

## 13. Recommended Next Sprint

**Recommendation: V2.5 — Invoice Deletion Hardening and Regression Tests**

This is a recommendation, not a confirmed project decision. Before starting, reconcile the roadmap and version naming against the canonical Project Brain. The user previously deferred numbering hardening; do not silently mark it completed or lose it from the backlog.

### Objective

Close the most important verification gaps from V2.4 and establish regression coverage for destructive invoice operations and invoice numbering.

### Proposed scope

1. Test that an authenticated user can delete an invoice belonging to their own business.
2. Test that another user's business invoice cannot be deleted and that the endpoint returns the expected inaccessible-resource response.
3. Verify the actual database foreign-key behavior for invoice items in a development/test database.
4. Add backend tests for successful deletion, nonexistent invoice, inaccessible invoice, and transaction failure where the existing test setup supports them.
5. Add regression tests for invoice numbering, including the non-reuse of deleted numbers.
6. Test frontend success, cancellation, in-progress state, and API failure handling.
7. Confirm whether production deployment is required and, if deployed, perform a safe smoke test using a dedicated test invoice only.
8. Reconcile test results and deployment evidence into the Project Brain.

### Dependencies and prerequisites

- Inspect the current testing setup and existing test conventions before choosing tools or creating new test infrastructure.
- Use a development/test database; never run destructive tests against real customer invoices.
- Verify the current database schema before deciding whether an Alembic migration is necessary.
- Confirm the latest Git status and ensure the V2.4 changes remain pushed.
- Preserve invoice-numbering hardening as deferred work until its own acceptance criteria and tests are met.

### Acceptance criteria

- Cross-business deletion is demonstrably rejected.
- The invoice and its associated items are deleted consistently in the test database.
- Deletion failure does not leave a partially deleted transaction.
- Invoice numbers are never reused after deletion.
- The frontend reflects deletion only after server success and shows a useful error on failure.
- Relevant regression tests pass.
- Deployment and production verification are documented separately from local tests.

## 14. Required Project Brain Update

Append a standalone **V2.4 — Invoice Deletion** handoff to the historical sprint-handoff section, preserving previous sprint records and the existing project architecture, decisions, and backlog.

Update the current project status to reflect:

- V2.4 source changes are implemented and committed.
- Commit `15623b5` was pushed to `origin/master`.
- Backend compilation and frontend build passed.
- Unauthenticated access was rejected.
- The user reported successful deletion behavior and observed invoice number `24` after deleting number `23`.
- Cross-account isolation, database cascade, automated regression coverage, production deployment, and production smoke testing remain unverified.
- Invoice-numbering hardening remains deferred.
- The recommended next sprint is V2.5 — Invoice Deletion Hardening and Regression Tests, subject to roadmap reconciliation and user approval.

Do not delete historical sprint records. Do not fabricate migration IDs, test results, deployment status, or a clean working-tree state.

## 15. Final Sprint Assessment

**V2.4 delivered the invoice-deletion implementation and was committed and pushed successfully.** Local backend compilation and the frontend production build passed, and the user reported that the main deletion flow works. The sprint is implementation-complete, but its handoff should retain explicit outstanding verification items rather than claiming fully verified production readiness.

**End of V2.4 handoff.**

---

# Sprint Handoff — V2.5 Edit Saved Invoices

**Handoff date:** 2026-10-10  
**Sprint:** V2.5 — Edit Saved Invoices  
**Objective:** Allow users to open and modify existing invoices, save changes to the same invoice record, and preserve invoice numbering, business-level authorization, invoice history, and existing invoice-generation behavior.  
**Implementation status:** Implemented; frontend build, backend compilation, and user-reported functional checks passed.  
**Sprint closure status:** Pending final Git commit/push verification and explicit verification of remaining authorization and invoice-numbering invariants.  
**Database migration status:** No migration planned or created for this sprint.

## 1. Work Actually Performed

The implementation adds an edit workflow for previously saved invoices. Changes were made to five tracked application files. The user reported that the edited functionality was checked and working. The frontend production build and backend Python compilation were subsequently run successfully.

The implementation was prepared as targeted source changes, not a replacement project package. The user's local source files were edited manually using the supplied file-specific instructions.

## 2. Features Completed

### 2.1 Backend invoice update endpoint

**File:** `backend/app/api/router.py`

- Added `PUT /bills/{bill_id}`.
- Uses the existing authenticated user dependency and current-business lookup.
- Looks up the invoice using both invoice ID and business ID.
- Returns a not-found response if the invoice does not exist within the current business.
- Validates the customer name, presence of invoice items, item names, positive quantities, and non-negative finite unit prices.
- Recalculates line totals, subtotal, and total on the server.
- Updates the existing invoice record rather than creating a new invoice.
- Replaces the invoice's associated item collection within the same database transaction.
- Preserves the existing invoice ID, invoice number, business association, creation timestamp, and terms and conditions by not assigning new values to those fields.
- Does not allocate a new invoice number or explicitly advance the business invoice-number sequence.
- Supports updating saved invoice columns when they are supplied in the request.

**Important qualification:** These behaviors are established by the implemented source code. Dedicated automated tests for authorization, rollback, sequence preservation, and all field invariants have not been reported.

### 2.2 Frontend API integration

**File:** `frontend/src/lib/api.ts`

- Added `updateBill(accessToken, billId, bill)`.
- Sends authenticated `PUT` requests to the invoice update endpoint.
- Parses API error details when an update fails.
- Returns the updated saved invoice on success.
- Retains the existing create-invoice API helper.

### 2.3 Invoice editor edit mode

**File:** `frontend/src/components/billing/BillEditor.tsx`

- Added an optional `initialBill` prop.
- Initializes customer details and line items from the saved invoice when editing.
- Reuses the existing editor and its item-editing functionality.
- Selects the saved invoice's column configuration in edit mode, rather than automatically replacing it with the current business configuration.
- Chooses the update API for an existing invoice and the create API for a new invoice.
- Added a confirmation dialog before saving edits.
- The confirmation explains that the saved invoice and subsequently generated PDFs will reflect the changes, while previously downloaded or shared copies remain unchanged.
- Changes the editor heading and description according to whether the user is creating or editing an invoice.

**Compatibility note:** The edit initialization uses the saved invoice's customer fields and items. The implementation does not introduce a new lifecycle model for invoices.

### 2.4 Invoice history UI

**File:** `frontend/src/components/billing/BillHistory.tsx`

- Added the `onEditBill` callback.
- Added an Edit button to invoice history.
- Retained the existing View and Delete actions.

### 2.5 Application routing and save flow

**File:** `frontend/src/App.tsx`

- Expanded the existing invoice-loading path matcher to support `/bills/:billId/edit`.
- Added the edit route and initialized the editor using the loaded saved invoice.
- Connected the invoice-history Edit action to the edit route.
- Updated the corresponding invoice list entry after a successful save.
- Returns the user to the updated invoice preview after saving.

## 3. Files Changed

| File | Purpose |
|---|---|
| `backend/app/api/router.py` | Authenticated invoice update endpoint and server-side validation/calculation |
| `frontend/src/lib/api.ts` | Authenticated invoice update request helper |
| `frontend/src/components/billing/BillEditor.tsx` | Edit mode, saved invoice initialization, confirmation, update submission |
| `frontend/src/components/billing/BillHistory.tsx` | Edit action in invoice history |
| `frontend/src/App.tsx` | Edit route, loading, and post-save navigation/state update |

These five files were the modified tracked files shown by the user's Git status before the final cleanup and commit.

`PROJECT_BRAIN.md` was shown as untracked. It was not intended to be included in the application commit and must remain untouched unless separately authorized.

## 4. Database and Migration Status

- **Database schema changes:** None reported.
- **Alembic migration files added:** None.
- **Alembic migration files modified:** None reported.
- **Local configured database revision:** `c2d3e4f5a6b7`.
- **Available Alembic head:** `c2d3e4f5a6b7`.
- **Revision comparison:** Local current revision matched the available migration head.
- **Database upgrade command executed for this sprint:** None reported.
- **Production database revision:** Not verified.

The revision check was performed with `alembic current` and `alembic heads`. Both reported `c2d3e4f5a6b7 (head)`.

No migration was considered necessary because the existing invoice model already stores the customer fields, invoice number, business association, creation timestamp, column snapshot, terms and conditions, totals, and line items required by the edit workflow.

## 5. API, Frontend, UI, and PDF Impact

### API

- Added `PUT /bills/{bill_id}`.
- Existing invoice creation, retrieval, and deletion endpoints were not intentionally replaced.
- Existing request and response schemas were reused.

### Frontend

- Added an update API helper.
- Reused the existing invoice editor for create and edit operations.
- Added routing and history integration.

### UI

- Added an Edit action to invoice history.
- Added an edit-mode heading and description.
- Added a save confirmation warning for modifications to existing invoices.

### PDF

- No PDF service or PDF layout file was changed.
- The intent is that generating a PDF from the updated saved invoice will use the updated invoice data.
- A separate PDF service regression test was not reported.
- Previously downloaded or shared copies of PDFs are static copies and are not retroactively modified.

## 6. Tests and Actual Results

### 6.1 Frontend production build

**Command:** `npm run build`

**Actual result:**
- TypeScript build (`tsc -b`) completed.
- Vite transformed 79 modules.
- Production assets were generated successfully.
- Build completed in 529 ms.
- Generated assets included `dist/index.html`, `dist/assets/index-B5x3HKIw.css`, and `dist/assets/index-nSAlu9ot.js`.

**Result:** Passed.

**Non-blocking warning:** The minified JavaScript bundle was approximately 554.35 kB, exceeding Vite's 500 kB warning threshold. The build still succeeded. Code splitting or bundle optimization may be considered separately.

### 6.2 Backend Python compilation

**Command:** `python -m compileall app`

**Actual result:** Python compilation included `app/api/router.py`; no compilation error was reported.

**Result:** Passed for Python syntax compilation. This does not establish successful database integration or runtime behavior for every API branch.

### 6.3 Manual functional verification

The user reported that the changed functionality was checked and working.

**Result:** User-reported functional checks passed. The exact list of manual scenarios was not recorded in the available test output.

### 6.4 Whitespace and Git diff validation

**Commands:** `git status --short`, `git diff --check`, `git diff --stat`

**Actual result:**
- Five tracked application files were modified.
- `PROJECT_BRAIN.md` was untracked.
- `git diff --check` identified trailing whitespace in `frontend/src/App.tsx` at lines 966, 970, 974, and 1083.
- Git also emitted an LF-to-CRLF working-copy warning for `frontend/src/App.tsx`.
- The tracked diff summary reported 323 insertions and 31 deletions across five files.

**Result:** The initial whitespace check did not pass cleanly. The user confirms that the final result after whitespace cleanup remains unknown. Do not claim the final check passed.

### 6.5 Tests not reported

The following have not been established by dedicated automated test results:

- Cross-business invoice edit rejection.
- Invoice ID, invoice number, creation timestamp, and business association preservation under update.
- No change to the invoice-number sequence after editing.
- Transaction rollback when an update fails.
- Item replacement consistency and recalculated totals under database integration.
- Full regression coverage for create, view, delete, and PDF generation.
- Automated frontend unit or end-to-end tests.

## 7. Git, Push, and Deployment Status

### Git state observed before commit

- **Branch:** `master`.
- **Previously observed HEAD:** `15623b5` — `Add invoice deletion`.
- **Previously observed remote tracking state:** `master` was tracking `origin/master`.
- **Modified tracked files:** Five application files listed in Section 3.
- **Untracked file:** `PROJECT_BRAIN.md`.
- **Commit for V2.5:** Not confirmed.
- **Push status:** Not confirmed.
- **Remote synchronization:** Not confirmed.

The user was provided explicit staging commands for only the five application files, followed by commit and push commands. No completed commit or push output is present in the available record.

To update this section, obtain the actual output of:

```powershell
git log -1 --format="%H%n%s"
git status --short --branch
git branch -vv
git ls-remote origin refs/heads/master
```

### Deployment

- **Deployment performed for V2.5:** Not reported.
- **Production deployment status:** Unverified.
- **Production database revision:** Unverified.

A successful local build does not establish deployment.

## 8. Technical and Product Decisions

1. **Update the existing invoice instead of creating a replacement.** This preserves invoice identity and avoids introducing duplicate records.
2. **Preserve the invoice number.** Editing is not a new issuance event and must not allocate another invoice number.
3. **Keep business-level authorization on the backend.** The update lookup scopes the invoice to the user's current business.
4. **Calculate totals on the backend.** Client-side totals are for presentation; persisted amounts are recalculated server-side.
5. **Use a confirmation before saving edits.** Users are explicitly warned that future invoice/PDF generation reflects the update, while copies already downloaded or shared remain unchanged.
6. **Preserve the invoice's saved column snapshot.** Historical invoices should not automatically adopt a newer business invoice-column configuration when edited.
7. **Preserve saved terms and conditions.** The current update workflow does not explicitly replace the invoice's saved terms snapshot.
8. **Avoid a schema migration for this feature.** Existing fields support the edit workflow; no concrete schema requirement was identified.
9. **Do not introduce invoice lifecycle states solely for editing.** Draft, issued, and paid state handling remains outside this sprint's scope.
10. **Keep PDF layout work separate.** The sprint updates the underlying saved invoice and does not redesign the preview or PDF templates.

## 9. Bugs, Limitations, and Unresolved Risks

The user confirms the following are still outstanding or unresolved:

1. The final `git diff --check` result after whitespace cleanup is unknown.
2. Cross-business authorization and invoice identity/numbering invariants still require explicit verification.
3. Update transaction rollback and item-replacement consistency need testing.
4. The V2.5 commit and push have not been confirmed.
5. Production deployment and production database status remain unverified.
6. The Vite bundle-size warning remains non-blocking and has not been addressed.

Additional known limitations:
- Backend compilation does not validate database transactions, SQL behavior, or API authorization.
- The update implementation replaces the invoice's associated items. Confirm relationship behavior and transaction rollback through integration tests.
- Existing `Numeric(12,2)` storage precision remains a constraint; the edit implementation does not widen the database columns.
- No new mechanism was introduced to update PDFs that have already been downloaded or shared.
- No explicit audit trail or invoice revision history was added for edited invoices.
- Preview/PDF consistency after editing has not been established by a dedicated regression test.

## 10. Roadmap Status

### Completed by V2.5 implementation

- Editing saved invoices through the existing editor.
- Adding an Edit action to invoice history.
- Saving changes through a dedicated update endpoint.
- Server-side recalculation of totals.
- Confirmation before modifying an existing saved invoice.
- Preserving key invoice identity fields in the update implementation.

### Still requiring verification

- Final whitespace check.
- Dedicated cross-business authorization test.
- Invoice identity and invoice-number sequence preservation tests.
- Update transaction rollback test.
- Item-replacement consistency and recalculated-total integration tests.
- Regression tests for invoice creation, viewing, deletion, and PDF generation.
- Commit and push verification.
- Production deployment verification, if deployment is intended.

### Not completed by this sprint

- PDF redesign.
- Database/schema migration.
- Invoice lifecycle management such as draft, issued, or paid states.
- PDF copy synchronization for previously downloaded files.
- Explicit invoice revision history or edit audit trail.
- JavaScript bundle optimization.

## 11. Recommended Next Sprint

**Historical recommendation at the time of the V2.5 handoff: V2.6 — Invoice Preview and PDF Consistency Review. This sprint has since been completed and is recorded below. The current recommendation is V2.7 — Invoice Preview and PDF Regression Hardening, not yet approved or started.

Rationale:
- V2.5 changes the saved invoice record, while the preview and PDF service remain unchanged.
- A focused review can verify that the invoice preview and PDF consistently display edited customer details, item values, totals, saved column configuration, and saved terms.
- The existing large frontend bundle warning can be evaluated separately rather than expanding V2.5 scope.

Dependencies before starting:
1. Finish V2.5's targeted verification.
2. Complete and verify the V2.5 Git commit and push.
3. Confirm the existing preview and PDF behavior against edited invoices.
4. Review the permanent Project Brain roadmap before assigning V2.6.

Do not treat this recommendation as an approved sprint until it is reconciled with the canonical roadmap.

## 12. Final Status Statement

V2.5's source implementation has been applied to five application files. The frontend production build passed, backend Python compilation passed, and the user reported that the changed functionality was working.

The user subsequently confirmed that the functionality is done and working well. The final `git diff --check` produced no reported issues, and `git status` showed `master` up to date with `origin/master` and no tracked changes; `PROJECT_BRAIN.md` was the only untracked file. The exact V2.5 commit hash was not included in that output. Production deployment and production database status must still be tracked separately.

**End of V2.5 handoff.**

### Follow-up status update — 2026-10-10

This note records the user's subsequent confirmation and does not replace the original handoff above.

- The user confirmed that the functionality is done and working well.
- `git diff --check` completed with no reported issues.
- `git status` reported branch `master`, up to date with `origin/master`, no tracked changes, and one untracked file: `PROJECT_BRAIN.md`.
- The latest output does not include the exact V2.5 commit hash/message; do not invent it.
- The user considers the remaining V2.5 functional checks complete. The latest terminal output does not provide individual automated test results, so retain the distinction between user-confirmed functional behavior and automated test evidence.
- Production deployment and production database status are still not established by the supplied Git commands.
- The Vite bundle-size warning remains non-blocking.

---

# Sprint Handoff — V2.6 Invoice Preview and PDF Consistency Review

## 1. Sprint Overview

- **Project:** Billing Software
- **Sprint:** V2.6 — Invoice Preview and PDF Consistency Review
- **Objective:** Improve the web invoice preview so its layout, formatting, and visual hierarchy more closely match the generated invoice PDF while preserving existing invoice data, custom columns, editing behavior, and PDF download functionality.
- **Implementation status:** Complete
- **Validation status:** Build and whitespace checks passed; manual verification reported successful by the user.
- **Git status:** Commit created and pushed to the remote `master` branch.
- **Deployment status:** Not verified; no deployment was performed as part of this sprint.
- **Database status:** No schema changes or migrations were made as part of this sprint.

### Completion assessment

The planned preview-alignment changes were implemented in the frontend, built successfully, manually tested by the user, committed, and pushed. The sprint can be recorded as implementation-complete.

Do not interpret this as proof that the frontend and PDF are pixel-identical, that automated end-to-end tests exist, or that the application has been deployed.

---

## 2. Work Actually Performed

### 2.1 Invoice header and business information

Updated the invoice preview header to establish a document-style hierarchy:

- Added a centered `INVOICE` title.
- Arranged the business name and business information on the left.
- Positioned the optional business logo on the right.
- Included available business details such as address, location, state, GSTIN, Udyam number, phone, and email.
- Adjusted padding, typography, spacing, and text wrapping.

The header was intended to more closely reflect the seller-information section of the generated PDF.

### 2.2 Customer details and invoice metadata

Reorganized the customer and invoice metadata section:

- Displayed the customer name, phone, and address in a left-side block.
- Displayed invoice number and invoice date in a right-side metadata block on wider screens.
- Preserved a vertically stacked arrangement for smaller screens.
- Retained the fallback customer label `Walk-in Customer`.
- Used the existing invoice date formatter for the displayed date.

### 2.3 Invoice table

Updated the invoice items table to more closely resemble the PDF table:

- Changed the table header to a dark slate background with white uppercase labels.
- Adjusted table cell padding.
- Preserved the existing dynamic invoice-column configuration.
- Preserved ordering based on each column's `position`.
- Retained support for core fields and custom invoice fields.
- Preserved numeric alignment and item-name emphasis.
- Retained the existing horizontal overflow container for the table on narrow screens.

No change to the invoice-column API or database schema was made in this sprint.

### 2.4 Monetary and date formatting

The existing work in `BillPreview.tsx` was retained:

- Added or retained `formatMoney(value: string | number)`, formatting values as Indian rupees with two decimal places and `en-IN` grouping.
- Applied monetary formatting to unit prices, line totals, subtotal, and total.
- Added or retained `formatInvoiceDate(value: string)`, displaying valid dates as `DD-MM-YYYY` using UTC date components.
- Kept the existing amount-in-words logic, including Indian numbering units such as crore, lakh, and thousand.

The monetary and date formatters were part of the resulting committed implementation.

### 2.5 Totals and amount in words

Refined the lower invoice section:

- Kept subtotal visually secondary.
- Emphasized the final total with a stronger border and bold typography.
- Used tabular numerals for monetary amounts.
- Organized the amount-in-words section with a distinct label and readable content.
- Added responsive spacing and wrapping.

### 2.6 Terms and conditions

Retained the conditional display of `bill.terms_and_conditions`.

The terms section uses a distinct heading, readable line spacing, and preserved line breaks. It is displayed only when terms and conditions are present.

### 2.7 Signature

Retained the conditional signature display:

- Signature appears on the right.
- Image sizing uses a maximum height and contained scaling.
- The `Authorized Signatory` label appears below the signature image.

### 2.8 Footer

Added a centered footer message:

`Thank you for your business.`

The footer is separated from the rest of the invoice using a top border and consistent padding.

### 2.9 PDF download and navigation

The existing PDF download and navigation implementation was preserved.

The component continues to include:

- PDF download using `downloadBillPdf`.
- Session validation through `getSession`.
- A download-in-progress state.
- User-visible download errors.
- Navigation back to the dashboard and bills list.
- The New Bill action.

No PDF-generation endpoint or backend PDF-generation algorithm was intentionally changed during this sprint.

---

## 3. Files Changed

### Application files

**`frontend/src/components/billing/BillPreview.tsx`**

This was the only application file changed for V2.6.

The resulting Git diff reported:

- 140 insertions
- 106 deletions
- 246 changed lines in total

The changes covered the invoice header, business and customer information layout, table styling, monetary presentation, totals, amount in words, terms, signature, and footer.

### Other files

**`PROJECT_BRAIN.md`**

- Git reported this file as untracked during the sprint.
- It was not included in the V2.6 application commit.
- Its contents were not verified as part of the final Git checks.
- The permanent Project Brain handoff should be updated separately according to the project's documentation workflow.

**`v2.6-review-bundle.zip`**

- This ZIP appeared as an untracked artifact during the review.
- It was not included in the V2.6 application commit.
- Do not stage it accidentally. Determine whether it is still needed before removing it.

No other application-file changes were reported in the final `git diff --stat`.

---

## 4. Database and Alembic

### Confirmed sprint changes

- No database schema changes were made for V2.6.
- No Alembic migration was created for V2.6.
- No migration was applied for V2.6.

### Previously checked migration state

Earlier in the sprint, the following commands were reported as returning the same revision:

- `alembic current`
- `alembic heads`

Reported revision:

`c2d3e4f5a6b7 (head)`

This was the migration state checked earlier in the sprint, not a new migration or a migration specifically associated with V2.6. It has not been independently rechecked after the final frontend commit.

---

## 5. API, Frontend, UI, and PDF Impact

### API and backend

- No API endpoint change was reported as part of the V2.6 application diff.
- No backend PDF-generation change was reported in the final application diff.
- Existing PDF download integration was preserved.
- Backend compilation was checked earlier in the broader review, as documented below.

### Frontend

The work was concentrated in `BillPreview.tsx`.

The preview now has a more document-like hierarchy, including a centered title, seller information, customer and invoice metadata, a dark table header, clearer totals, lower invoice sections, and a footer.

### PDF

The generated PDF remained the comparison reference. The sprint did not intentionally modify the PDF generator.

The PDF was manually compared with the preview by the user. Some natural differences can remain because the web preview is rendered in a browser while the PDF uses a physical A4 page layout.

**Do not describe the result as pixel-perfect preview/PDF parity.** The objective was improved visual consistency.

---

## 6. Tests and Actual Results

### 6.1 Frontend production build

**Command reported by the user:**

`npm run build`

**Result:** Passed.

Reported output:

- TypeScript project build completed.
- Vite version: `8.3.1`
- 79 modules transformed.
- `dist/index.html`: 0.45 kB, gzip 0.29 kB.
- CSS: 28.06 kB, gzip 5.95 kB.
- JavaScript: 555.30 kB, gzip 151.64 kB.
- Build completed in 234 ms.

Vite emitted a non-blocking warning that some chunks were larger than 500 kB after minification.

This warning was not fixed in V2.6.

### 6.2 Git whitespace validation

**Command:**

`git diff --check`

The first check found trailing whitespace at line 136 of `frontend/src/components/billing/BillPreview.tsx`.

The user removed the trailing whitespace and ran the final checks again.

**Final reported result:** `git diff --check` produced no output, indicating no remaining whitespace errors in the checked diff.

### 6.3 Backend compilation

Earlier in the review, the user reported that:

`python -m compileall app`

passed.

This was a backend syntax/compilation check. It is not evidence that automated backend tests or integration tests were run.

### 6.4 Manual verification

The user explicitly confirmed that the manual checks succeeded.

The reported verification covered:

- Opening a saved invoice and checking its preview.
- Downloading the invoice PDF.
- Checking an edited invoice and its PDF.
- Checking the lower invoice sections, including terms, signature, and footer.
- Checking the preview on a narrow screen.

These results are **user-confirmed manual testing**, not independently reproduced by the assistant.

### 6.5 Tests not established

The sprint record does not establish that any of the following were run:

- Automated frontend unit tests.
- Automated browser or end-to-end tests.
- A full automated backend test suite.
- Cross-browser testing.
- Pixel-difference testing between preview and PDF.
- Production deployment smoke tests.

Do not mark these as passed.

---

## 7. Git History, Status, Push, and Deployment

Track each state separately.

### Commit

Confirmed commit:

`91e4cbe Align invoice preview with PDF layout`

The commit was created on local branch `master`.

### Push

The user subsequently ran `git push`.

Reported output confirmed that the remote branch was updated:

`3f29622..91e4cbe master -> master`

Remote repository shown in the push output:

`https://github.com/ZaidK82/billing-software.git`

Therefore, the V2.6 commit was successfully pushed to the remote `master` branch according to the user's terminal output.

### Git status

The last reported `git status --short`, run before the push, was:

`?? PROJECT_BRAIN.md`

This means the Project Brain document was untracked at that point. It was not included in the V2.6 commit.

The final working-tree status **after the push was not separately checked**. Do not claim that the working tree is fully clean. The known untracked document remained an outstanding item at the last status check, and the ZIP artifact had appeared in an earlier status check.

### Deployment

- No deployment command or deployment confirmation was provided.
- Production deployment status is **unverified / not performed as part of this sprint**.
- A successful Git push does not establish that a hosting platform deployed the application.
- Do not mark V2.6 as deployed.

---

## 8. Bugs, Limitations, and Risks

### Known non-blocking issue

**Vite bundle-size warning**

The generated JavaScript bundle was approximately 555.30 kB before gzip, exceeding Vite's 500 kB warning threshold.

This did not prevent the production build from succeeding. Bundle splitting and optimization remain possible future work, but they were not part of V2.6.

### Preview/PDF differences

The preview and PDF may still differ in physical proportions, pagination, vertical spacing, or image sizing. Browser rendering and A4 PDF rendering are inherently different.

The user confirmed that the resulting layouts worked well. No automated pixel-level equivalence test was performed.

### Date handling

The preview date formatter uses UTC components to produce `DD-MM-YYYY`. This avoids local timezone changes affecting the displayed date for timestamps represented consistently in UTC.

However, timezone behavior was not separately tested across different browser timezones or unusual timestamp formats.

### Amount-in-words edge cases

The existing amount-in-words logic was retained. The sprint did not establish dedicated automated coverage for negative values, very large amounts, floating-point edge cases, or every possible rupee/paise combination.

### Untracked documentation

`PROJECT_BRAIN.md` was untracked at the last reported status check. It should be reviewed and added through the project's intended documentation process, not assumed to be part of the V2.6 commit.

### No confirmed regression

No specific functional regression was reported by the user during the final manual verification.

This should be recorded as “no regression reported in the tested paths,” not as proof that no regression exists.

---

## 9. Technical and Product Decisions

### Decision 1: Keep preview changes in the existing component

The changes were implemented in `frontend/src/components/billing/BillPreview.tsx` rather than introducing a new preview component.

**Rationale:** Keep the sprint scoped to presentation alignment and reduce risk to existing invoice logic.

### Decision 2: Preserve the existing PDF generator

The sprint targeted the web preview and used the PDF as a visual reference.

**Rationale:** Avoid changing invoice-generation behavior while improving the browser preview.

### Decision 3: Preserve dynamic invoice columns

The existing column configuration, sorting, core field handling, and custom field handling were retained.

**Rationale:** Visual improvements must not break configurable invoice columns or saved invoice data.

### Decision 4: Preserve download and navigation behavior

The existing download, session validation, error state, and navigation actions were retained.

**Rationale:** The sprint is a presentation improvement, not a rewrite of invoice workflows.

### Decision 5: Keep responsive behavior

Responsive layouts, text wrapping, and table overflow handling were retained or refined.

**Rationale:** The preview must remain usable on narrow screens, even though the PDF uses A4 dimensions.

### Decision 6: Defer bundle optimization

The build warning was documented but not addressed.

**Rationale:** The build succeeds, and bundle splitting is separate optimization work that should be evaluated without expanding the scope of this sprint.

### Decision 7: Keep the sprint commit narrowly scoped

Only `frontend/src/components/billing/BillPreview.tsx` was staged and committed for V2.6. The untracked Project Brain document was excluded.

**Rationale:** Avoid accidentally committing documentation or generated artifacts that were not reviewed as part of the application change.

---

## 10. Roadmap Status

### Completed in V2.6

- Improve invoice preview header and seller details layout.
- Improve customer and invoice metadata alignment.
- Align the invoice table's visual styling more closely with the PDF.
- Standardize displayed monetary values.
- Standardize the displayed invoice date format.
- Improve subtotal and total hierarchy.
- Refine amount-in-words, terms, and signature sections.
- Add the centered invoice footer message.
- Preserve existing invoice download and navigation functionality.
- Validate the frontend build and whitespace cleanliness.
- Commit and push the implementation.

### Partially completed / remaining

- **Exact preview/PDF parity:** Improved, but not established at pixel level.
- **Bundle-size optimization:** Not performed.
- **Automated visual regression coverage:** Not established.
- **Project Brain synchronization:** The handoff needs to be incorporated into the canonical document through the intended workflow.
- **Post-push Git status:** Needs a fresh check if a definitive clean/dirty status is required.
- **Deployment verification:** Not performed.

### Not part of this sprint

- Database schema changes.
- Alembic migrations.
- New API endpoints.
- Changes to the backend PDF generator.
- Deployment or hosting changes.

---

## 11. Recommended Next Sprint

### Recommendation: V2.7 — Invoice Preview and PDF Regression Hardening

This is a recommendation, not an already approved or completed sprint.

**Objective:** Turn the V2.6 visual improvements into a more reliable, testable invoice presentation workflow.

Suggested scope:

1. Review the final preview against the generated PDF using the same saved invoice data.
2. Test invoices with short and long item descriptions, multiple custom columns, many line items, long business/customer addresses, and optional terms/signatures.
3. Verify date and amount formatting with representative values and edge cases.
4. Add automated tests for formatters and other testable presentation logic where practical.
5. Consider browser-based regression tests for invoice preview and PDF download if the project's existing test setup supports them.
6. Assess the Vite bundle-size warning and decide whether code splitting is justified.
7. Fix only demonstrated regressions or important parity gaps.

### Dependencies

Before beginning V2.7:

- Confirm the V2.6 commit is available on the intended branch.
- Synchronize the permanent Project Brain with this handoff.
- Confirm the current test framework and frontend test conventions.
- Reuse the existing invoice API and PDF generator unless testing demonstrates a defect that requires a change.
- Establish representative invoice fixtures or test data before attempting visual regression comparisons.

### Acceptance criteria for the proposed sprint

- Existing invoice preview and PDF download workflows continue to work.
- Representative invoice types are tested, including custom columns and optional sections.
- Formatting edge cases have explicit test coverage where practical.
- Any remaining visual differences are documented and classified as intentional or actionable.
- Any bundle optimization is supported by measurement rather than a configuration-only change.
- The sprint's tests and actual results are recorded in Project Brain.

---

## 12. Final Handoff Summary

V2.6 — Invoice Preview and PDF Consistency Review is **implementation-complete**.

The preview layout was refined in `frontend/src/components/billing/BillPreview.tsx`, the frontend production build passed, the final whitespace check passed, and the user confirmed the relevant manual checks succeeded. The resulting change was committed as `91e4cbe` and successfully pushed to the remote `master` branch.

No V2.6 database migration or backend PDF-generator change was made. The non-blocking Vite bundle-size warning remains. Automated end-to-end or pixel-equivalence testing was not established, the final post-push working-tree status was not checked, and deployment was not verified.

The next documentation action is to incorporate this handoff into the canonical Project Brain. The recommended next engineering sprint is V2.7 — Invoice Preview and PDF Regression Hardening, subject to project prioritization and approval.



---

## Roadmap Decision Update — Grouped V2 Feature Sprints

**Recorded:** 2026-10-11, based on the user's direction in the project conversation.

The user challenged the proposal to spend V2.7 exclusively on invoice-preview/PDF hardening because the remaining roadmap contains small user-facing features. The roadmap is therefore regrouped by related workflows: **V2.7 Invoice Row Management** combines row duplication, reordering, and highlighting; **V2.8 Invoice Editing Productivity and Customization** proposes plain-text auto-fill and font/object sizing controls. Regression checks remain part of the validation of changed features, not the primary goal of V2.7. V3 inventory/analytics remains after the outstanding V2 features.

This is a planning decision/recommendation only: neither V2.7 nor V2.8 implementation has started, and the feature grouping/version numbering has not been validated against repository changes. Preserve the earlier V2.6 handoff and previous recommendation in the historical archive; current Section 16 and this update supersede the old next-sprint recommendation.

### V2.7 --- Invoice Row Management & Highlighting

**Handoff recorded:** 2026-10-11, based on the complete user-provided sprint handoff. Implementation work/commit was reported on 2026-10-10.

#### 1. Sprint identification

- **Project:** Billing Software
- **Sprint:** V2.7 --- Invoice Row Management & Highlighting
- **Version:** V2.7
- **Objective:** Add invoice row duplication, reordering, and persistent highlighting, ensuring saved item state is reflected in the editor, invoice preview, and generated PDF.
- **Implementation status:** Completed.
- **Functional verification:** Confirmed by the user, including row ordering and PDF highlighting.
- **Commit:** `7bfa13c`
- **Commit message:** `Add invoice row management and highlighting`
- **Branch:** `master`
- **Remote:** `origin/master`
- **Push status:** Successfully pushed to GitHub; terminal output reported `91e4cbe..7bfa13c master -> master`.
- **Deployment status:** Not independently verified.
- **Project Brain status at implementation commit:** `PROJECT_BRAIN.md` remained untracked and requires a separate documentation commit.

#### 2. Sprint summary

V2.7 implemented invoice row management and persistent row highlighting. Completed functionality includes duplicating invoice rows; moving rows up and down; persisting row positions; highlighting rows in yellow; persisting highlight styles in the database; restoring saved row state when editing an existing invoice; rendering highlighted rows in the invoice preview; applying highlight styling in generated PDFs; and updating API request/response schemas and frontend API types.

The user confirmed that the highlight issue was resolved and that row ordering and PDF highlighting were verified. The implementation was committed and pushed successfully.

#### 3. Features completed

##### 3.1 Invoice row duplication

- Added row duplication functionality to the invoice editor.
- Duplicated rows can be edited independently.
- Included as part of the row-management implementation.
- **Status:** Completed and functionally verified by the user.

##### 3.2 Invoice row reordering

- Added controls to move invoice rows up and down.
- The editor save payload assigns each row its current index as `position`.
- Added persistent position storage to the database.
- Configured the ORM relationship to order invoice items by their stored position.
- Updated invoice-editing logic to preserve submitted positions.
- The user verified row ordering, saving, and reopening behavior.
- **Status:** Completed and verified by the user.

##### 3.3 Persistent row highlighting

- Added the `highlight_style` property to invoice items.
- Uses `"yellow"` for highlighted rows and `null` for normal rows.
- The editor initializes saved rows with their persisted highlight styles.
- The save payload includes `highlight_style`.
- The backend accepts and persists the property.
- The API response schema exposes the property to the frontend.
- **Status:** Completed and verified by the user.

##### 3.4 Invoice preview highlighting

- Updated `BillPreview.tsx` to inspect `item.highlight_style`.
- Applies the pale-yellow background to highlighted rows.
- Resolved the initial preview issue by adding `highlight_style` to `BillItemResponse`.
- The user confirmed that preview highlighting worked after the fix.
- **Status:** Completed and verified by the user.

##### 3.5 PDF highlighting

- Updated the PDF generator to apply pale-yellow background styling to highlighted invoice rows.
- Implemented color: `#FEF3C7`.
- The user confirmed that PDF highlighting and row ordering were verified.
- **Status:** Completed and verified by the user.

##### 3.6 Saved and unsaved editor behavior

- Saved invoices initialize the editor from persisted item data.
- Highlight styles are included in the saved item payload.
- Reloading an unsaved invoice clears unsaved editor state; this was considered expected behavior for the current scope.
- No autosave or draft-recovery mechanism was added.
- **Status:** Completed for the sprint's intended saved-invoice workflow. Draft persistence remains outside scope.

#### 4. Files changed

The implementation commit contains eight files.

**Backend — `backend/app/api/router.py`**

- Added `highlight_style` to `BillItemCreate` and `BillItemResponse`.
- Passed highlight styles through invoice creation and update logic.
- Preserved row positions in invoice-update processing.
- Maintained the existing bill API structure.
- Adding `highlight_style` to the response model was necessary because the frontend otherwise did not receive the field in the serialized API response.

**Backend — `backend/app/models/bill.py`**

- Added persistent `BillItem.position`.
- Added nullable `BillItem.highlight_style`.
- Configured `Bill.items` with `order_by="BillItem.position"`.
- `position`: integer, non-nullable, default `0`, server default `"0"`.
- `highlight_style`: nullable `String(20)`, default `None`.

**Backend — `backend/app/services/invoice_pdf.py`**

- Added PDF table styling for highlighted invoice rows.
- Uses pale yellow `#FEF3C7` for highlighted items.

**Frontend — `frontend/src/components/billing/BillEditor.tsx`**

- Added row duplication.
- Added row movement controls.
- Added highlight toggling.
- Initializes saved items with their persisted highlight styles.
- Includes `position: index` and `highlight_style` in the save payload.
- Provides visual feedback for highlighted rows.

**Frontend — `frontend/src/components/billing/BillPreview.tsx`**

- Added conditional styling for highlighted invoice rows.
- Checks whether `item.highlight_style === "yellow"`.
- Displays the pale-yellow background for highlighted rows.

**Frontend — `frontend/src/lib/api.ts`**

- Updated invoice item API types to include `highlight_style`.
- Keeps the frontend request/response contract aligned with the backend.

The two additional files are the Alembic migrations listed below. The handoff reports eight changed files total.

#### 5. Database changes and migrations

Two Alembic migrations were added:

1. **File:** `backend/alembic/versions/d7e8f9a0b1c2_add_bill_item_position.py`  
   **Revision:** `d7e8f9a0b1c2`  
   **Down revision:** `c2d3e4f5a6b7`  
   **Purpose:** Add persistent invoice-item positions.
2. **File:** `backend/alembic/versions/e1f2a3b4c5d6_add_bill_item_highlight_style.py`  
   **Revision:** `e1f2a3b4c5d6`  
   **Down revision:** `d7e8f9a0b1c2`  
   **Purpose:** Add persistent invoice-item highlight styles.

Migration chain: `c2d3e4f5a6b7` → `d7e8f9a0b1c2` → `e1f2a3b4c5d6`.

The user reported successfully applying both migrations. The reported configured database migration head was `e1f2a3b4c5d6`. This does not establish production database state. No other database migrations were reported for this sprint.

#### 6. API changes

The bill-item request schema supports `position: int | None` and `highlight_style: str | None`. The bill-item response schema includes `position: int` and `highlight_style: str | None = None`. The response schema change fixed the missing-highlight-field problem; after the change, the user confirmed that highlighting worked in the preview. Saved invoice item data continues to be exposed through the existing bill endpoints.

#### 7. Tests and verification results

**Frontend build:** `npm run build` passed, as reported by the user.

**Backend compilation:** Reported as passing during implementation. Exact command output was not included in the final commit transcript.

**Git whitespace checks:** `git diff --check` and `git diff --cached --check` completed without reported errors.

**Database migrations:** Both migrations were reported successfully applied; reported configured-database head `e1f2a3b4c5d6`.

**Manual row-management verification:** User tested row management including reordering, saving, reopening, editing, removal, and invoice total updates. The user subsequently confirmed row ordering was verified. Result: user-verified.

**Highlight verification:** Initial preview issue was traced to the missing `highlight_style` field in the API response schema. After adding the field, the user confirmed the feature worked. Result: user-verified.

**PDF verification:** The user explicitly confirmed that PDF highlighting and row ordering were verified. Result: user-verified.

**Automated regression suite:** No separate automated unit-test or integration-test output was supplied. No comprehensive automated regression-suite result is recorded. This does not negate the user's functional verification.

#### 8. Git and repository status

Implementation commit: `7bfa13c` (`Add invoice row management and highlighting`) on `master`. The reported commit summary was 8 files changed, 279 insertions, and 21 deletions, including two new Alembic migrations and six modified application files. User-provided terminal output confirmed push `91e4cbe..7bfa13c master -> master`.

After the push, the user ran `git status` and `git log -1 --oneline`. Output confirmed local branch `master`, local branch up to date with `origin/master`, latest commit `7bfa13c`, `PROJECT_BRAIN.md` remained untracked, and no tracked-file changes remained after the implementation commit. The current documentation update itself has not yet been confirmed committed or pushed.

Deployment status is not independently verified: no deployment command, production health check, or deployed-application verification was supplied. Do not infer deployment success from Git push.

#### 9. Technical and product decisions

1. **Persist item positions.** Added a database-backed integer `position` so row ordering survives saving and reopening. Rationale: order is part of invoice content and should not depend solely on transient frontend state.
2. **Persist highlight style per item.** Added nullable `highlight_style`. Rationale: row-level highlighting must be available to editor, preview, and PDF.
3. **Use `"yellow"` and `null` initially.** Rationale: a simple persistent representation for the first highlighting feature.
4. **Include highlight style in the response schema.** Rationale: a field omitted by the response schema is not available to the frontend even when it exists in the database model.
5. **Keep unsaved draft persistence out of scope.** No autosave or browser-based draft recovery was added; sprint focused on row management and persisted invoice-item properties.
6. **Keep Project Brain documentation separate from the implementation commit.** The implementation and migrations were committed explicitly; the handoff is a separate documentation task.

#### 10. Bugs, limitations, and deferred work

**Resolved:** Invoice preview did not initially show the saved highlight style because `BillItemResponse` omitted `highlight_style`. The response schema was updated and the user confirmed preview highlighting worked. Do not list this as an open issue.

**Verified by the user:** Row ordering; persistent highlight behavior; invoice preview highlighting; PDF highlighting; relevant invoice row-management workflow. These must not be marked as outstanding issues.

**Deferred/outside scope:** Unsaved draft persistence and recovery; additional highlight styles beyond yellow; unrelated features not implemented in V2.7. Reloading an unsaved invoice clears unsaved editor state and was considered expected behavior for the current scope.

**Deployment:** Unverified because no deployment evidence was supplied. This is a status distinction, not a claim that deployment failed.

#### 11. Roadmap status

**Completed in V2.7:** invoice row duplication; row reordering; persistent row-position storage; persistent row highlighting; API request/response support; frontend API type updates; editor highlight UI; preview highlighting; PDF highlight implementation and user verification; database migrations for positions/highlight styles; implementation commit and push.

**Remaining documentation task at implementation handoff:** Update `PROJECT_BRAIN.md` with actual implementation, migrations, tests, user verification, commit ID, push status, and deployment status; commit the Project Brain update separately. This handoff is now appended to the archive, but the documentation commit/push remains unconfirmed until performed in the repository.

The next product sprint should be selected from the canonical roadmap after this update. Do not invent unrelated roadmap priorities or mark unrelated roadmap items complete.

#### 12. Recommended next sprint

Recommendation: update/reconcile the Project Brain first, then select the next sprint based on the existing roadmap. Following the roadmap recorded in this Brain, V2.8 is proposed for plain-text auto-fill and font/object sizing controls, but it is not started or approved for implementation.

Dependencies: V2.7 commit `7bfa13c`; migration head `e1f2a3b4c5d6`; user testing of row management/highlighting; canonical `PROJECT_BRAIN.md` roadmap.

#### 13. Final sprint assessment

V2.7 delivered invoice row management and persistent highlighting. The implementation was committed as `7bfa13c` and successfully pushed to `origin/master`. The user confirmed that row ordering, editor highlighting, invoice preview highlighting, and PDF highlighting worked. The frontend build and Git whitespace checks passed; backend compilation was reported as passing; both database migrations were reported applied.

The remaining administrative task is to commit and push the updated `PROJECT_BRAIN.md` separately. Deployment status remains unverified. Recommended Project Brain status: V2.7 implementation completed, functionally verified by the user, committed and pushed; Project Brain documentation commit/push pending; deployment status unverified.



## Roadmap Amendment — V3 Scope and Customer Insights Clarification (2026-10-11)

This amendment expands the current roadmap description based on the user's follow-up. It does not alter historical sprint outcomes or claim any future feature is implemented.

- **V2.8 remains proposed/not started:** plain-text auto-fill, font/object sizing controls, and entering an item total to calculate unit rate from quantity.
- **V3 Inventory & Analytics remains future/proposed:** reusable product catalogue; inventory/stock management; stock movement history; reports and analytics; and an advanced invoice designer as a candidate item whose scope may need to be split. Low-stock warnings and specific analytics are ideas for evaluation, not finalized requirements.
- **Customer Management & Purchase Insights comes after inventory:** customer-filtered bill history and most-purchased products. Existing customer management is already recorded as working, so the future item means richer customer-level reporting rather than rebuilding basic customer records. Additional purchase frequency/spending summaries are optional future ideas.
- **V4 Finance remains on the existing roadmap:** paid/unpaid status, payments, suppliers, purchases, and GST features.
- **Open design decisions:** product fields and pricing rules; inventory units and stock deduction timing; handling returns and manual adjustments; report definitions; customer purchase aggregation; and whether advanced invoice design belongs in V3 or should be split.
- **Status distinction:** none of the V3/customer-insight/V4 items above is marked approved, started, completed, or deployed. Versioning and acceptance criteria must be finalized before implementation.

The amendment is additive. Earlier sprint handoffs and historical roadmap snapshots are intentionally retained as historical records.


## Roadmap Clarification — V2.8 Item Total and Post-Inventory Customer Insights (2026-10-12)

This additive clarification makes the upcoming feature order explicit. It does not change prior sprint results or indicate that any proposed feature has been implemented.

1. **V2.8 — Invoice Editing Productivity & Customization (proposed):** plain-text auto-fill; font/object sizing controls; and item-total input that calculates unit rate from quantity. Example: quantity 5, item total ₹1,000 → unit rate ₹200. Define decimal precision, rounding, zero-quantity behavior, and compatibility with existing line/invoice totals before coding.
2. **Inventory Management (future; version TBD):** product and inventory records and related workflows. Detailed scope and version remain open.
3. **Customer Management & Insights (after inventory; version TBD):** select a customer and view/filter their bills; identify their most-purchased products. Existing customer management is already present in the application record; this is a customer-level history and purchasing-insights expansion, not a claim that basic customer management must be rebuilt.
4. **Further analytics and business features:** requirements to be defined after inventory and customer insights are scoped.

All items above remain proposed/future roadmap work. V2.8 has not started or been approved. The customer insights feature is intentionally sequenced after inventory because dependable product records improve the usefulness of product-level customer reporting. Earlier roadmap snapshots and sprint handoffs remain preserved as historical records.


# Sprint Handoff --- V2.8 V2 Completion (2026-10-20)

## 1. Sprint Identity

- **Sprint name:** V2 Completion
- **Version:** V2.8, final recorded V2 implementation commit
- **Project:** Billing Software
- **Repository:** `https://github.com/ZaidK82/billing-software`
- **Branch:** `master`
- **Status:** V2.8 implementation and user-reported functional verification complete; committed and pushed. Overall V2 roadmap completion remains pending reconciliation with the canonical `PROJECT_BRAIN.md`.
- **Deployment:** Deferred by user decision; deployment is not required at this stage.
- **Project Brain update:** Deferred until this handoff is applied in the permanent Project Brain conversation. This update records the handoff in the document, but a separate Git commit/push of the Brain has not been confirmed.

### Objective

Complete the V2.8 invoice-entry improvements, resolve the outstanding invoice-preview asset-loading and customer-loading issues, preserve existing invoice behavior, and commit the verified application changes.

Do not treat the successful V2.8 commit as proof that every item on the overall V2 roadmap is complete. The remaining roadmap must be reconciled against the canonical Project Brain and historical sprint handoffs.

## 2. Evidence Classification

- **Confirmed by command output:** Directly shown in the Git commands and push output provided by the user.
- **User-verified:** The user explicitly reported that the behavior or validation was verified.
- **Implementation recorded:** Files and features are identified from the recorded change list and sprint context; this does not independently establish every implementation detail.
- **Unverified:** Evidence is not available in the handoff and must not be invented.
- **Deferred:** Intentionally postponed by the user.

## 3. Features Completed

### 3.1 V2.8 invoice-entry improvements

The V2.8 commit includes work associated with invoice entry, plain-text parsing, bill appearance settings, invoice preview, and PDF generation.

1. **Item-total entry mode**
   - Intended behavior: enter an item's quantity and desired line total, then derive the unit rate using safe two-decimal currency rounding.
   - Preserve existing invoice totals and validation.
   - Status: included in the V2.8 implementation scope. Exact test cases and numerical test outputs are not recorded here.

2. **Plain-text auto-fill**
   - New frontend parser: `frontend/src/lib/plainTextInvoiceParser.ts`.
   - The parser is part of the committed V2.8 implementation.
   - Status: file creation and commit are confirmed; detailed parser test cases and edge-case coverage are not available in this handoff.

3. **Invoice appearance settings**
   - A new Alembic migration was included for bill appearance settings.
   - Backend model/API, invoice editor, preview, and PDF generator files were changed in the same commit.
   - Status: inclusion in the commit is confirmed. Exact migration operations and compatibility results require inspection of the migration file.

### 3.2 Logo and signature loading

- **User verification:** Confirmed.
- The user explicitly marked logo and signature loading as verified.
- Relevant frontend preview and API files are included in the V2.8 commit.
- The reported issue concerned logo/signature availability in invoice preview.
- Exact reproduction steps, retry behavior, asset URL expiry behavior, and automated test output are not recorded here.

Do not reopen this issue merely because test logs are absent. Record it as user-verified, while distinguishing that report from independently captured automated test evidence.

### 3.3 Customer loading after refresh

- **User verification:** Confirmed.
- The user explicitly marked customer loading after refresh as verified.
- The reported requirement is that customers should be available in the invoice creation/editing flow after refresh without first visiting the Customers page.
- Relevant frontend application and API client files are included in the V2.8 commit.
- Exact route-by-route test evidence is not recorded here.

Record this behavior as user-verified. Do not claim an automated regression test exists unless the repository confirms it.

## 4. Files Changed

The user's commit output confirms nine changed files: seven modified files and two newly created files.

| File | Change type | Recorded purpose |
|---|---|---|
| `backend/alembic/versions/fdf19b7ec7a9_add_bill_appearance_settings.py` | New | Alembic migration associated with bill appearance settings |
| `backend/app/api/router.py` | Modified | Backend API changes associated with V2.8 functionality |
| `backend/app/models/bill.py` | Modified | Bill model changes associated with appearance/settings support |
| `backend/app/services/invoice_pdf.py` | Modified | Invoice PDF generation changes |
| `frontend/src/App.tsx` | Modified | Application-level loading and state/route behavior, including customer and business asset loading |
| `frontend/src/components/billing/BillEditor.tsx` | Modified | Invoice editor changes for V2.8 entry behavior |
| `frontend/src/components/billing/BillPreview.tsx` | Modified | Invoice preview changes |
| `frontend/src/lib/api.ts` | Modified | Frontend API-client changes |
| `frontend/src/lib/plainTextInvoiceParser.ts` | New | Plain-text invoice parsing support |

### Files not included in the commit

The final Git status showed these untracked files:

- `PROJECT_BRAIN.md`
- `billing-v28-review.zip`

Neither was included in commit `dcd1399437352f8eb11260de7b969bce8fd46644`. The user explicitly deferred the Project Brain update and did not request that the review archive be committed. Do not imply either file is tracked in the remote repository.

## 5. Database and Schema Changes

### Migration included

- **Migration filename:** `fdf19b7ec7a9_add_bill_appearance_settings.py`
- **Revision ID:** `fdf19b7ec7a9` is inferred from the filename; confirm against the file's declared `revision`.
- **Purpose indicated by filename:** Add bill appearance settings.

### Details not yet verified

The migration file's contents were not provided in the recorded command output. Consequently, the following remain unverified:

- Exact tables and columns created, changed, or removed.
- Column types, defaults, nullability, and constraints.
- The migration's `down_revision` parent.
- Whether the migration has been applied to a local or remote database.
- Whether upgrade and downgrade operations were tested.
- Whether existing database data was tested for compatibility.
- Whether production or deployment database migration is needed.

**Required Project Brain action:** Inspect the actual migration file and record its declared `revision`, `down_revision`, `upgrade()` operations, and `downgrade()` operations. Do not state that no database changes were made: the commit contains a new migration.

Do not claim that the database was migrated successfully without supporting evidence.

## 6. API, Frontend, UI, and PDF

### Backend API

`backend/app/api/router.py` was modified. The recorded sprint context identifies API behavior for invoice/bill functionality, business assets, and customer data as relevant to the changes. However, the exact final endpoint-by-endpoint diff has not been reviewed in this handoff. Do not invent new endpoint names, request/response fields, or compatibility guarantees. Inspect the committed diff if the canonical Project Brain needs those details.

### Backend model

`backend/app/models/bill.py` was modified, and a migration for bill appearance settings was added. The exact model fields and their relationship to the migration must be confirmed from the source files before documenting field-level details.

### Frontend

Changed files: `frontend/src/App.tsx`, `frontend/src/components/billing/BillEditor.tsx`, `frontend/src/components/billing/BillPreview.tsx`, `frontend/src/lib/api.ts`, and `frontend/src/lib/plainTextInvoiceParser.ts`.

Recorded scope includes invoice-entry improvements, plain-text parsing, preview behavior, customer loading, and business asset loading. The user explicitly verified the logo/signature loading and customer-loading fixes.

### Invoice PDF

`backend/app/services/invoice_pdf.py` was modified. This establishes that the PDF generator was part of the committed changes. The precise layout, field, and appearance changes should be described from the actual diff if more detail is required. Do not claim a specific PDF rendering test passed unless its output is available.

## 7. Tests and Validation

### User-reported validation

| Validation area | Reported result | Evidence classification |
|---|---|---|
| Logo and signature loading | Verified | User-tested |
| Customer loading after refresh | Verified | User-tested |
| Frontend and backend validation | Verified | User-reported validation |
| Git commit | Completed | Confirmed by command output |
| Git push | Completed | Confirmed by command output |
| Deployment | Not performed/required at this stage | Deferred by user decision |
| Project Brain update before this handoff | Deferred | User decision; update not included in application commit |

### Validation details not recorded

The conversation does not contain the exact frontend build command/output, backend test command/output, automated test counts, coverage, or migration-test output.

Therefore:

- Do not invent successful test-suite results or coverage figures.
- Do not equate the user's validation report with proof that every automated test passed.
- Do not claim migration tests passed.
- Do not claim production behavior was tested.
- If detailed evidence is required, inspect the repository and obtain the actual command output.

## 8. Git Status, Commit, Push, and Deployment

### Commit

- **Status:** Confirmed.
- **Commit message:** `Complete V2 invoice entry improvements`
- **Full commit ID:** `dcd1399437352f8eb11260de7b969bce8fd46644`
- **Short commit ID:** `dcd1399`
- **Commit summary:** 9 files changed, 1,747 insertions, 104 deletions.
- **New files in commit:** The Alembic migration and `frontend/src/lib/plainTextInvoiceParser.ts`.

### Push

- **Status:** Confirmed by the user's terminal output.
- **Remote:** `https://github.com/ZaidK82/billing-software.git`
- **Branch:** `master`
- **Push result:** `master -> master`
- **Remote branch advanced:** `7bfa13c..dcd1399`

### Local/remote synchronization

The user subsequently ran `git rev-parse HEAD` and `git rev-parse origin/master`. Both returned `dcd1399437352f8eb11260de7b969bce8fd46644`. The user also confirmed that `master` was up to date with `origin/master`.

### Working tree

The final recorded `git status` reported:

- No tracked changes staged or unstaged.
- Two untracked files: `PROJECT_BRAIN.md` and `billing-v28-review.zip`.
- Local `master` up to date with `origin/master`.

The correct description is **no tracked changes pending; two untracked files remain**, not “completely clean working tree.” This document update has been generated from the handoff, but its own commit/push is not confirmed.

### Deployment

- **Status:** Deferred/not required now, by explicit user decision.
- No deployment command, platform release, deployed version, deployment URL, or production verification is recorded.
- Do not describe the commit as deployed.

## 9. Bugs, Limitations, Deferred Work, and Risks

### Resolved and user-verified

1. Logo/signature loading in invoice preview.
2. Customer loading after refreshing the invoice creation/editing flow.

These should be recorded as user-verified fixes, not as unresolved defects.

### Deferred by decision

1. Deployment.
2. Updating/committing the canonical `PROJECT_BRAIN.md` separately from the application commit.
3. Committing the review archive (it was left untracked; no request to add it was made).

### Unverified technical details

1. Exact migration schema operations and parent revision.
2. Whether migration upgrade/downgrade was executed and tested.
3. Exact automated test/build results.
4. Exact line-level API/model/PDF changes.
5. Whether any additional V2 roadmap requirements remain.

These are documentation and verification gaps, not confirmed application bugs.

### Untracked files

- `PROJECT_BRAIN.md` was untracked in the recorded working tree. Preserve the existing file and update it deliberately in the permanent Project Brain workflow; do not overwrite or discard it without user authorization.
- `billing-v28-review.zip` is untracked. Do not commit it unless the user explicitly requests that action.

## 10. Technical and Product Decisions

1. **Preserve existing invoice behavior.** The V2.8 item-total entry scope explicitly calls for safe two-decimal currency rounding and preserving existing invoice totals and validation.
2. **Add plain-text invoice parsing in a dedicated frontend module.** `frontend/src/lib/plainTextInvoiceParser.ts` was added rather than embedding all parser logic in an unrelated file.
3. **Keep appearance-related changes aligned across layers.** The backend bill model, API router, invoice editor, preview, PDF generator, and migration were all included in the same commit. Exact field mapping should be confirmed from source.
4. **Treat logo/signature and customer-loading fixes as verified by the user.** Do not reopen these issues solely because this conversation lacks automated test logs.
5. **Do not require deployment to complete the current local implementation sprint.** The user explicitly stated deployment is not required now.
6. **Do not claim the Project Brain update was included in the V2.8 application commit.** It was not included in that commit; the recorded status showed it untracked.
7. **Do not start V3 until the V2 roadmap is reconciled.** The commit completes the recorded V2.8 work but does not, by itself, prove that no other V2 requirements remain.

## 11. Roadmap Status

### Current status after V3.1

- **Completed:** V3.1 Product Catalogue Foundation — product persistence/model, Alembic migration, business-scoped CRUD API, frontend API client, product management UI, navigation, direct edit/refresh handling, successful frontend build, user-confirmed manual product CRUD and existing invoice-flow checks, application commit and push.
- **Pending:** V3.2 Invoice Editor Product Selection — recommended next sprint, not approved or started. Product selection should populate editable invoice-row values while preserving manual entry, row management, existing calculations, and snapshot-based saved invoice/PDF behavior.
- **Not included in V3.1:** inventory quantities/movements, suppliers/purchases, analytics, finance/payment/outstanding-balance workflows, invoice-editor product selection, production deployment, automated integration/E2E tests, independent production-database verification, and bundle optimization.
- **Historical V2 status:** Previous V2.8 handoff's V2-roadmap reconciliation and migration-review items remain historical open questions unless resolved elsewhere in the canonical record. V3.1 handoff does not claim that all V2 release-readiness questions have been reconciled.


### Historical V2 sprint context

Previous project conversations identify these completed sprint areas: V2.2 Invoice PDF; V2.3 Custom Invoice Numbering; V2.4 Invoice Deletion; V2.5 Saved-Invoice Editing; V2.6 Invoice Preview/PDF Layout Review; V2.7 Invoice Row Management; and V2.8 invoice-entry improvements, plain-text parsing, appearance settings, and the final reported asset/customer-loading fixes.

These entries reflect the historical sprint context available in this handoff. The canonical roadmap and each sprint's permanent handoff must be checked before marking every item fully complete in the master document.

### Completed in this sprint

- V2.8 changes included in commit `dcd1399`.
- Logo/signature loading: user-verified.
- Customer loading after refresh: user-verified.
- Frontend/backend validation: user-reported as verified.
- Commit and push: confirmed.
- Local and remote commit IDs match.

### Still to reconcile

- Whether V2.8 is the final planned V2 sprint.
- Whether `PROJECT_BRAIN.md` lists additional V2 requirements.
- Whether previous handoffs identify incomplete V2 work.
- Whether the appearance-settings migration was applied and tested.
- Whether any roadmap items are explicitly deferred or excluded from the V2 release.

**Overall V2 completion must remain unconfirmed until the canonical roadmap is reconciled.** Do not invent remaining requirements, but do not mark them complete without checking the source of truth.

## 12. Recommended Next Sprint and Dependencies

### Immediate next task: V2 roadmap reconciliation

This is a planning/documentation task, not a new implementation sprint.

Dependencies:

1. Read the canonical `PROJECT_BRAIN.md` roadmap.
2. Compare the V2 roadmap with the recorded V2.2–V2.8 sprint handoffs.
3. Verify that all intended V2 deliverables have a completed status or an explicitly documented deferral.
4. Inspect `fdf19b7ec7a9_add_bill_appearance_settings.py` to capture the actual migration revision, parent, schema operations, and downgrade behavior.
5. Preserve the confirmed commit and push evidence recorded above.
6. Keep deployment deferred unless the user changes that decision.
7. Do not start V3 implementation while performing this documentation update.

### Recommended next development sprint

**V3 planning, only after V2 closure is established.** Do not prescribe V3 features from this handoff alone. First read the existing V3 roadmap, dependencies, architecture decisions, and deferred work in `PROJECT_BRAIN.md`. Then recommend the next sprint based on that canonical plan. Do not begin V3 implementation as part of this handoff.

## 13. Instructions for Updating the Canonical Project Brain

When applying this handoff:

- Preserve the existing document structure, architecture notes, historical sprint records, and roadmap.
- Add this sprint as the V2.8/V2 Completion handoff, using the naming convention already present in the document.
- Record commit `dcd1399437352f8eb11260de7b969bce8fd46644` and the confirmed push to `origin/master`.
- Record the migration as included, but verify its contents before documenting schema details.
- Record the two functional fixes and frontend/backend validation as user-verified.
- Leave exact automated test results explicitly unverified unless source evidence is found.
- Record deployment as deferred by user decision.
- Do not claim `PROJECT_BRAIN.md` was included in the V2.8 commit; the recorded Git status showed it untracked.
- Reconcile the roadmap before declaring all of V2 complete.
- Do not invent issues, migration details, test results, or future V3 scope.
- Do not start implementation work while performing this documentation update.

## Final Status

**V2.8 implementation:** Committed and pushed.

**Reported functional verification:** Complete for the logo/signature-loading fix, customer-loading fix, and frontend/backend validation.

**Git:** Commit and push confirmed; local and remote commit IDs match.

**Database migration:** Included in the commit; exact schema operations and migration-test evidence remain to be inspected.

**Deployment:** Deferred; not required now.

**Project Brain update:** This document has now been updated to include the handoff; its own Git commit/push is not confirmed.

**Overall V2 release closure:** Pending reconciliation against the canonical V2 roadmap and historical handoffs.

**Next action:** Reconcile the V2 roadmap, verify migration details, and then update/commit the canonical Project Brain through the intended workflow. Start V3 planning only after that review establishes that V2 is closed. 

------------------------------------------------------------------------

# Historical Sprint Handoff — V3.1 Product Catalogue Foundation

**Handoff date:** 2026-10-20  
**Status:** Implemented, manually verified by the user, committed, and pushed. Deployment not performed or verified.

## 1. Sprint Identity and Status

- **Project:** Billing Software
- **Sprint:** V3.1 — Product Catalogue Foundation
- **Version:** V3.1
- **Objective:** Establish a business-scoped product catalogue with CRUD operations and a frontend management interface, laying the foundation for selecting catalogue products when preparing invoices.
- **Completion status:** Implemented, manually verified by the user, committed, and pushed to GitHub.
- **Code commit:** `b5bfae2`
- **Commit message:** `Add product catalogue foundation`
- **Branch:** `master`
- **Remote:** `origin/master`
- **Deployment status:** No deployment was performed or verified as part of this sprint.
- **Handoff status:** Ready for Project Brain documentation update.

The product catalogue foundation is implemented and its core management flows were manually tested by the user. This status does not imply that every possible edge case has been tested or that the application has been deployed.

## 2. Objective and Actual Outcome

### Original objective

Introduce a persistent product catalogue that allows a business to maintain reusable product information and manage those products through the application.

### Actual work completed

1. Added a Product database model and an Alembic migration.
2. Registered the Product model with the backend model package and Alembic environment.
3. Added product CRUD API endpoints with business-scoped access.
4. Added product-related API client types and functions to the frontend.
5. Created product listing and product form components.
6. Added product navigation to the desktop and mobile/tablet navigation menus.
7. Integrated catalogue routes, state management, data loading, creation, editing, and deletion into the main application.
8. Addressed direct product-edit navigation and refresh behavior.
9. Built the frontend successfully.
10. Had the user manually verify the catalogue flows and existing invoice flows.
11. Committed the ten intended application files and pushed the commit to GitHub.

### Important scope boundary

This sprint establishes catalogue management. It does not establish that product selection has been integrated into the invoice editor. Invoice-line product selection and copying catalogue values into invoice rows remain separate work unless subsequently implemented and verified.

## 3. Features Completed

### 3.1 Product data model and persistence

Added the Product model with the following fields:

- `id`
- `business_id`
- `name`
- `description`
- `default_unit_price`
- `created_at`
- `updated_at`

The price column uses `Numeric(12,2)`. The model is associated with a business through `business_id`.

### 3.2 Product API

Added the following endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/products` | List products for the authenticated user's business |
| GET | `/products/{product_id}` | Retrieve a product |
| POST | `/products` | Create a product |
| PUT | `/products/{product_id}` | Update a product |
| DELETE | `/products/{product_id}` | Delete a product |

The implementation uses the existing business-resolution pattern through `get_user_business(user_id, db)`.

The handlers use the database session, scope product access to the resolved business, return a not-found response when a requested product cannot be found within that business, and normalize product names/descriptions as implemented in the route code.

The product request and response schemas were added to `backend/app/api/router.py`. The backend module compiled successfully, and route registration was inspected and confirmed for all five endpoints.

**Verification boundary:** API registration and compilation were confirmed. Independent automated API integration tests were not performed and are not planned.

### 3.3 Frontend API client

Updated `frontend/src/lib/api.ts` with:

- `Product` type
- `CreateProductRequest` type
- `UpdateProductRequest` type
- `getProducts()`
- `getProduct()`
- `createProduct()`
- `updateProduct()`
- `deleteProduct()`

The functions use the existing API URL configuration, bearer-token authentication, JSON request handling, and API error parsing.

### 3.4 Product management UI

Added:

- `frontend/src/components/products/ProductList.tsx`
- `frontend/src/components/products/ProductForm.tsx`

The product list supports viewing catalogue entries, refreshing the list, starting product creation, editing products, and requesting deletion with confirmation.

The product form supports entering a product name, optional description, and default unit price. The form uses non-negative price constraints and two-decimal-step input behavior.

### 3.5 Application integration

Updated `frontend/src/App.tsx` to include:

- Product state and loading/error state
- Product list loading and cache timestamp handling
- Product creation handler
- Product update handler
- Product deletion handler
- Product edit loading behavior
- Routes for `/products`, `/products/new`, and `/products/:productId/edit`

The edit route was adjusted to support direct navigation and browser refresh rather than depending solely on the user first selecting a product from the catalogue.

The product list is updated after successful create, update, and delete operations. API failures are surfaced through the corresponding UI error state where implemented.

### 3.6 Navigation

Updated `frontend/src/components/navigation/AppNavbar.tsx` to add the Products navigation action in both desktop and mobile/tablet navigation.

The navigation callback is connected in `App.tsx` to `/products`.

### 3.7 Existing invoice behavior

The user manually confirmed that existing invoice flows continued to work during the catalogue verification.

No PDF generation or invoice-preview feature was intentionally changed as part of this sprint.

## 4. Features Partially Completed or Not Completed

### Partially completed at the broader product-roadmap level

**Invoice editor product selection: not yet delivered.**

Although catalogue CRUD and its management interface are implemented, this sprint did not complete the workflow of choosing a catalogue product inside an invoice editor and copying its current values into an invoice line.

That integration remains dependent on the next invoice-editor implementation step.

### Not completed

- Product selection from within the invoice editor.
- Automatic population of invoice-line description, unit price, or other values from a selected catalogue product.
- Automated API integration tests.
- Automated frontend end-to-end tests.
- Independent production-database verification.
- Deployment to a production environment.
- Production deployment smoke tests.
- Bundle-size optimization for the frontend JavaScript output.

These items must not be recorded as completed by V3.1.

## 5. Files Changed and Purpose

The commit contains ten application files.

| File | Purpose |
|---|---|
| `backend/alembic/env.py` | Registers the Product model for Alembic metadata discovery. |
| `backend/alembic/versions/e3a842545855_add_product_catalogue.py` | Adds the product catalogue database schema. |
| `backend/app/api/router.py` | Adds product request/response schemas and CRUD API routes. |
| `backend/app/models/__init__.py` | Registers/exports the Product model through the model package. |
| `backend/app/models/product.py` | Defines the Product ORM model. |
| `frontend/src/App.tsx` | Integrates product state, API handlers, loading, routes, and product-edit behavior. |
| `frontend/src/components/navigation/AppNavbar.tsx` | Adds Products navigation to desktop and mobile/tablet layouts. |
| `frontend/src/components/products/ProductForm.tsx` | Provides the product create/edit form. |
| `frontend/src/components/products/ProductList.tsx` | Provides product listing and management actions. |
| `frontend/src/lib/api.ts` | Adds product types and API client methods. |

The Git commit reports 1,201 insertions and 15 deletions across these ten files.

### Files intentionally excluded from the commit

Two untracked files remained in the working tree:

- `PROJECT_BRAIN.md`
- `billing-software-v31-review.zip`

Neither file was included in the V3.1 application-code commit. The Project Brain handoff needs to be incorporated into the canonical document separately.

## 6. Database and Alembic Changes

### Migration details

- **Revision ID:** `e3a842545855`
- **Down revision:** `fdf19b7ec7a9`
- **Purpose:** Create the product catalogue table and its business-ID index.
- **Migration application:** The user ran the Alembic upgrade command against the configured local database.
- **Observed result:** The migration command reported success.
- **Current revision observed:** `e3a842545855 (head)`

The migration adds the product schema for persistent catalogue records.

### Verification boundaries

Confirmed:

- The migration file is committed.
- The migration was applied successfully to the configured local database.
- The configured database reported `e3a842545855` as its current Alembic revision.

Not established:

- The migration was applied to any production database.
- The migration was independently verified against a separate database environment.
- Automated migration rollback tests were performed.

No production database migration should be inferred from the local result.

## 7. Tests and Verification Results

### 7.1 Backend verification

**Confirmed results:**

- `python -m compileall -q app` exited with code `0`.
- Backend product API module import succeeded.
- The five product routes were inspected and found registered.
- The local Alembic upgrade completed successfully.
- `alembic current` reported `e3a842545855 (head)`.

**Not performed:**

- Automated API integration tests.
- Automated backend test suite execution.
- Independent production-database verification.

These omissions are intentional. The project will not add automated integration testing or independent production-database verification for this sprint's verification scope.

### 7.2 Frontend verification

**Confirmed result:**

The production build completed successfully using:

`npm run build`

The command runs TypeScript project compilation (`tsc -b`) followed by the Vite production build.

The final observed build output reported:

- 82 modules transformed.
- CSS output: approximately 30.30 kB, 6.31 kB gzip.
- JavaScript output: approximately 587.55 kB, 158.45 kB gzip.
- Build completed successfully in approximately 524 ms.
- No TypeScript errors.

### 7.3 Known non-fatal warning

Vite reported that the minified JavaScript chunk exceeds its 500 kB warning threshold. The warning did not prevent the production build from succeeding. Bundle splitting/optimization remains deferred.

### 7.4 Manual UI verification

The user explicitly confirmed that everything worked after following the manual verification checklist.

The checklist included:

1. Products appears in desktop and mobile navigation.
2. The Products page loads without an API error.
3. A product can be created with a name, description, and price.
4. The created product appears in the catalogue.
5. Product editing persists after refresh.
6. Product deletion removes the product from the catalogue.
7. Existing manual invoice entry and invoice flows continue to work.

The user also confirmed successful behavior after the direct product-edit loading fix.

**Classification:** User-tested behavior, based on the user's explicit confirmation. These are not independently reproduced results or automated test evidence.

### 7.5 Git verification

**Confirmed commit:**

- Commit: `b5bfae2`
- Message: `Add product catalogue foundation`
- Branch: `master`

**Push result:**

The push command completed successfully:

`git push origin master`

Observed remote update:

`dcd1399..b5bfae2 master -> master`

The subsequent status/log output showed:

`b5bfae2 (HEAD -> master, origin/master) Add product catalogue foundation`

and:

`## master...origin/master`

This confirms that the local `master` and `origin/master` references were synchronized at that point.

### 7.6 Working-tree status

After the commit and push, the observed `git status -sb` output was:

- Branch: `master`
- Relationship: synchronized with `origin/master`
- Remaining untracked files:
  - `PROJECT_BRAIN.md`
  - `billing-software-v31-review.zip`

No staged or modified tracked files were reported in that status output.

**Important:** The repository is synchronized with the remote, but the working tree is not completely clean because those two untracked files remain.

## 8. Git, Push, and Deployment Status — Separately Recorded

| Item | Status | Evidence |
|---|---|---|
| Application code committed | Confirmed | Commit `b5bfae2` |
| Commit contents | Confirmed | Ten intended application files, 1,201 insertions and 15 deletions |
| Push to GitHub | Confirmed | Successful push of `master` to `origin/master` |
| Local/remote branch synchronization | Confirmed at last check | `HEAD` and `origin/master` both pointed to `b5bfae2` |
| Working tree fully clean | No | Two untracked files remain |
| Frontend production build | Confirmed successful | `npm run build` |
| Local database migration | Confirmed applied | Alembic revision `e3a842545855` |
| Production deployment | Not performed or verified | No deployment evidence was produced |
| Production database schema | Not independently verified | Explicitly outside the planned verification scope |

A successful Git push is not a production deployment.

## 9. Bugs, Limitations, and Unresolved Risks

### Known limitation: frontend bundle size

The frontend build emits a non-fatal warning because the JavaScript bundle is larger than 500 kB after minification. The build still succeeds. Optimization is deferred unless it becomes a priority.

### Verification limitations

- Automated integration tests were not run and will not be added as part of this sprint's verification scope.
- Independent production-database verification was not performed and is not planned.
- The local migration result does not establish production schema state.
- Manual UI confirmation does not prove all edge cases, authorization boundaries, malformed requests, concurrency cases, or unusual database states have been tested.

### Product behavior not yet implemented

Catalogue management exists, but invoice editor product selection is not part of the completed V3.1 implementation. Do not represent the product catalogue as already integrated into invoice line entry.

### Deployment risk

The code is pushed to GitHub, but no deployment was performed or verified in this sprint. Runtime behavior in a deployed environment remains unknown.

### Working-tree housekeeping

The two untracked files remain outside the code commit. Their disposition should be handled separately:
- `PROJECT_BRAIN.md` should be updated through the project's established Project Brain workflow.
- `billing-software-v31-review.zip` should be retained or discarded according to the user's intention, not silently added to the repository.

No further unverified defect should be recorded as confirmed.

## 10. Technical and Product Decisions

### Decision 1 — Business-scoped catalogue

Products belong to the current user's resolved business. Product CRUD operations use the existing business-resolution approach rather than allowing arbitrary cross-business product access.

**Rationale:** Catalogue records should be managed within the business context of the authenticated user.

### Decision 2 — Store a default unit price

The catalogue stores `default_unit_price` using a two-decimal numeric database field.

**Rationale:** The product catalogue provides reusable defaults for future invoice entry.

### Decision 3 — Keep catalogue management separate from invoice selection

V3.1 delivers catalogue persistence and CRUD first. Invoice editor integration remains future work.

**Rationale:** This establishes a reusable source of product data before adding the product-selection interaction to the invoice editor.

### Decision 4 — Preserve invoice snapshots

The intended invoice workflow is to copy catalogue values into an invoice draft row when a product is selected, rather than make historical invoice line rendering depend on the current catalogue record.

**Rationale:** Changes to a catalogue product should not silently rewrite the details of previously issued invoices.

**Implementation boundary:** The product-selection behavior itself is not implemented by this sprint and must be delivered and verified in a later sprint.

### Decision 5 — No inventory or stock management

The catalogue is a reusable list of product information, not an inventory system.

**Rationale:** Stock quantities, inventory movements, and stock reservation are outside the defined product-catalogue foundation.

### Decision 6 — Manual verification is the accepted sprint verification approach

The user confirmed the core catalogue and existing invoice flows manually. Automated integration tests and independent production-database verification are explicitly not planned.

**Rationale:** Respect the project's chosen verification scope. Record the evidence accurately and do not imply that excluded verification was performed.

### Decision 7 — Commit application code separately from Project Brain artifacts

The application code was committed in `b5bfae2`; `PROJECT_BRAIN.md` and the review ZIP were excluded.

**Rationale:** Avoid accidentally mixing the application implementation with the handoff artifact and unrelated archive.

## 11. Roadmap Reconciliation

### Completed by V3.1

- Product ORM model.
- Product catalogue migration.
- Backend CRUD API.
- Business-scoped product access in the implemented routes.
- Frontend product API client.
- Product list and product form components.
- Desktop and mobile/tablet Products navigation.
- Product create/edit/delete UI integration.
- Direct product-edit loading behavior.
- Frontend production build.
- User-confirmed manual verification of catalogue operations and existing invoice flows.
- Commit and push to GitHub.

### Remaining roadmap work

- Product selection within the invoice editor.
- Copying selected catalogue product values into a draft invoice row.
- Preserve manual item entry and existing invoice row management while introducing product selection.
- Verify that editing or deleting a catalogue product does not alter previously saved invoice snapshots.
- Review UI usability for long product names, large catalogues, API errors, and edge cases as needed.
- Bundle optimization, if prioritized.
- Deployment, only if explicitly scheduled and approved by the project roadmap.

Do not mark invoice-editor integration complete based solely on catalogue CRUD.

## 12. Recommended Next Sprint

### Recommendation: V3.2 — Invoice Editor Product Selection

**Proposed objective:** Integrate the established product catalogue into invoice creation and editing so users can select a product and populate the draft invoice row with catalogue defaults while retaining the existing manual entry workflow.

This is a recommendation, not a claim that the sprint has already been approved or started.

### Dependencies

1. V3.1 catalogue model, migration, CRUD API, and UI are available in the pushed branch.
2. The frontend can retrieve products through the authenticated API.
3. The invoice editor's existing row structure and calculation behavior must be inspected before choosing integration points.
4. Existing manual invoice entry, row management, custom columns, totals, preview, and PDF behavior must remain intact.
5. The snapshot-based invoice data contract must be preserved. Product selection should populate editable invoice-row values rather than introduce a dependency on the current catalogue record for historical rendering.
6. The existing invoice create/edit payload and persistence logic must be reviewed before implementation details are finalized.

### Proposed acceptance criteria

- A user can select an existing catalogue product while creating or editing an invoice.
- Selecting a product populates the applicable invoice-row values from the catalogue.
- Populated values remain editable where the existing invoice editor permits edits.
- Manual invoice-row entry continues to work.
- Existing row add/remove/reorder behavior, custom columns, calculations, and totals remain functional.
- Previously saved invoice data and its preview/PDF output remain based on persisted invoice-row values rather than silently changing when the catalogue changes.
- The frontend production build succeeds.
- The user manually verifies the new invoice selection flow and regression-checks existing invoice creation, editing, preview, and PDF behavior.

These are proposed acceptance criteria for V3.2, not completed V3.1 work.

## 13. Final Project Brain Status Entry

Record the following as the concise final state:

**V3.1 — Product Catalogue Foundation: implemented, manually verified by the user, committed, and pushed.**

- Commit: `b5bfae2`
- Remote: `origin/master`
- Migration: `e3a842545855`, down revision `fdf19b7ec7a9`
- Frontend build: passed, with a non-fatal JavaScript bundle-size warning
- Manual product CRUD and existing invoice-flow verification: user confirmed successful
- Automated integration tests: not performed and not planned
- Independent production-database verification: not performed and not planned
- Deployment: not performed or verified
- Untracked files remaining: `PROJECT_BRAIN.md`, `billing-software-v31-review.zip`
- Next recommended sprint: V3.2 — Invoice Editor Product Selection
- Main remaining feature dependency: invoice editor integration with catalogue data while preserving invoice-row snapshots and existing behavior

The Project Brain should incorporate this handoff without inventing further test results, treating the push as a deployment, or marking V3.2 functionality as complete.


# Historical Sprint Handoff — V3.2 Invoice Editor Product Selection

**Handoff date:** 2026-10-21  
**Sprint:** V3.2 — Invoice Editor Product Selection  
**Version:** V3.2  
**Objective:** Integrate the existing product catalogue into the invoice editor so users can select a catalogue product to populate supported invoice-row fields while retaining manual editability and existing invoice-row behavior.  
**Implementation status:** Implemented and manually verified by the user.  
**Git status:** Application change committed and pushed successfully.  
**Deployment status:** Not verified.  
**Automated integration tests:** Not performed, consistent with the project's stated testing approach.

## 1. Sprint Summary and Completion Status

V3.2 integrated product selection into the invoice editor using the product catalogue established in V3.1. The implementation modifies the existing invoice editor rather than introducing a separate invoice-entry workflow. The product selector loads catalogue records through the existing frontend API and authentication mechanisms. Selecting a product populates the draft invoice row with the product's name and default unit price. The row remains editable.

The frontend production build passed, the user manually verified that the feature worked correctly, the staged diff check passed, and the implementation was committed and pushed to `origin/master`.

**Sprint completion:** The implemented product-selection scope is complete according to the reported manual verification. This does not establish deployment, production-database verification, automated integration-test coverage, or independent verification of every invoice workflow invariant.

## 2. Objective and Expected Outcome

### Objective

Allow a user creating or editing an invoice to select a product from the business's existing catalogue and use the catalogue's product name and default unit price to populate an invoice row.

### Intended behavior

- Load the available product catalogue for the authenticated business.
- Provide a product selector in the invoice editor's draft-row interface.
- Populate the draft row's item name and default unit price when a product is selected.
- Preserve the ability to manually edit the populated row.
- Retain existing invoice-row entry and calculation behavior.
- Save invoice-row values as invoice data rather than requiring the invoice to depend on future changes to the catalogue.

### Completion assessment

The implementation and manual verification of the product-selection feature were reported as successful. The full set of persistence, reload, calculation, and historical-invoice invariants should not be described as independently verified unless separately tested and documented.

## 3. Features Completed

### 3.1 Product catalogue integration

- Added product catalogue loading to the invoice editor.
- Used the existing `getProducts` frontend API method and authenticated session token.
- Added frontend state for the product list, loading state, and product-loading error.
- Added product selection to the draft-row interface.

### 3.2 Product selection behavior

- Selecting a catalogue product populates the draft row's item name.
- Selecting a catalogue product populates the draft row's unit price from `default_unit_price`.
- Product values are applied to the draft row; the row remains manually editable.
- The product selector is part of the existing invoice editor rather than a separate screen.

### 3.3 Price-entry-mode handling

The product-selection handler accounts for the editor's existing price-entry modes:

- **Rate mode:** uses the selected product's default unit price and clears the draft row's explicit `line_total`, allowing the existing quantity-times-unit-price calculation to apply.
- **Total mode:** calculates the row total using the current quantity and selected product's default unit price, then derives the unit price when quantity is positive.

This behavior was implemented in the product-selection handler. The user reported that the feature worked well overall; separate detailed test evidence for every edge case was not supplied.

### 3.4 Existing editor integration

The change was made within the existing `BillEditor.tsx` implementation. It did not introduce a separate invoice-row data model or a new catalogue-to-invoice database relationship.

### 3.5 Build and repository completion

- `npm run build` passed.
- The user reported successful manual verification.
- `git diff --cached --check` passed for the staged implementation.
- The editor change was committed and pushed to `origin/master`.

## 4. Partially Completed or Not Independently Verified

### Implemented, but not independently verified for every invariant

- Saved invoice values remain stable when catalogue data is changed later.
- Existing invoices remain unchanged when catalogue products are used in other invoice rows.
- Save, reopen, and reload behavior across every supported invoice configuration.
- All edge cases involving zero or unusual quantities and switching between rate and total modes.
- Product-load error handling under authentication expiry, network failure, or backend errors.

The user reported that the feature worked well, but the conversation does not contain separate step-by-step results for each of these invariants. Do not claim independent verification of each one.

### Not performed

- Automated API integration tests.
- Automated end-to-end tests.
- Independent production-database verification.
- Independent deployment verification.

The project has explicitly stated that automated integration tests and independent production-database verification are not part of its current testing approach. Do not present their absence as a newly discovered defect or imply that these tests passed.

## 5. Files Changed

### Application implementation

**File:** `frontend/src/components/billing/BillEditor.tsx`

**Purpose of change:** Import the existing product API method and `Product` type; add state for catalogue records, loading status, and load errors; load products using the authenticated session; add a product-selection handler and selector; populate product name and default unit price while respecting the editor's price-entry mode.

**Git-confirmed change summary:** 1 file changed, 133 insertions, 3 deletions.

**Confirmed commit:** `0309bae` — `Integrate product catalogue into invoice editor`.

No other application source file was included in this commit.

### Project Brain file

`PROJECT_BRAIN.md` existed as an untracked file during the commit workflow. It was explicitly excluded from the V3.2 application commit. Its contents were not included in commit `0309bae`.

### Review ZIP

`billing-software-v32-review-20261021-020659.zip` was also excluded from the application commit. The final `git status --short` output was not provided after the commit, so its subsequent filesystem and Git status must not be inferred from the earlier output.

## 6. Database and Migration Status

**Database/schema changes in V3.2:** None were made as part of the reported sprint implementation.  
**Alembic migration revision IDs for V3.2:** None. No migration was created for this sprint.

The feature consumes the existing product catalogue API and adds frontend behavior. It does not require a new database relationship between invoice rows and catalogue products as part of the reported implementation. The existing V3.1 product catalogue model and migration remain part of the prior sprint's history; they must not be attributed to V3.2. No independent production-database verification was performed.

## 7. API Changes

**Backend API changes:** None reported for V3.2.  
**Frontend API integration:** The invoice editor uses the existing `getProducts` method from `frontend/src/lib/api` and obtains the authenticated access token through the existing session mechanism.  
**New endpoints:** None reported.

The product catalogue endpoints were established in V3.1. V3.2 consumes the existing catalogue API rather than creating new CRUD endpoints.

## 8. Frontend and UI Changes

**Primary file:** `frontend/src/components/billing/BillEditor.tsx`

The invoice editor now includes a product selector before the existing invoice-column fields in the draft-item form. The frontend implementation includes product catalogue state, loading and error state, authenticated product loading, a selector that identifies the selected catalogue product, draft-row population of item name and unit price, and handling for rate-based and total-based price entry. The existing draft-row fields remain manually editable after selection.

The frontend production build passed. Vite emitted a non-fatal warning that the minified JavaScript bundle exceeded 500 kB. The warning did not prevent the build from succeeding and was not addressed in this sprint.

## 9. Invoice Data and PDF Behavior

### Invoice data

The implementation uses the existing invoice-row fields. No invoice-row schema change or catalogue foreign key was introduced in V3.2. The intended product-catalogue behavior is to copy the selected product's supported values into the invoice draft. The invoice row is then treated as invoice data, rather than as a live display of the catalogue record.

The existing row fields and calculation paths were retained in the implementation. The conversation does not provide independent database-level evidence for all save/reload and historical-snapshot invariants, so those invariants must not be described as independently verified.

### PDF

**PDF-generation code changes:** None reported. V3.2 did not intentionally modify the PDF-generation implementation. The selected product's name and price enter the existing invoice-row flow, but a separate PDF regression test was not documented. Do not claim that PDF generation was independently tested specifically for V3.2.

## 10. Tests and Actual Results

### 10.1 Frontend production build

**Command:** `npm run build`  
**Working directory:** `frontend`  
**Result:** Passed.

Reported output included TypeScript build command `tsc -b` completed; Vite transformed 82 modules; production assets were generated successfully; build completed in approximately 805 ms; and a non-fatal warning reported a minified JavaScript chunk larger than 500 kB. The build passed despite the bundle-size warning.

### 10.2 Git whitespace validation

**Command:** `git diff --cached --check`  
**Result:** Passed for the staged application change. No whitespace errors were reported for the staged diff.

An earlier attempt to run the check while `PROJECT_BRAIN.md` was staged reported trailing whitespace in that untracked project document. The brain file was subsequently removed from the staging area. Those document warnings do not establish a whitespace problem in the committed application file.

### 10.3 Manual functional verification

**Result:** The user explicitly reported that the feature “works well” after being asked to test it in the running application. This supports recording successful user-reported manual verification of the implemented feature.

However, the conversation does not contain a detailed test log or separate pass/fail results for every case in the suggested test checklist. Do not convert the user's general confirmation into a claim that every listed edge case was independently tested.

### 10.4 Tests not performed

- Automated API integration tests: not performed.
- Automated end-to-end tests: not reported as performed.
- Independent production-database verification: not performed.
- Independent production deployment verification: not performed.
- Dedicated PDF regression test for V3.2: not documented.

## 11. Git Status, Commit, Push, and Deployment

### Commit status

**Confirmed:** The application change was committed successfully. Commit `0309bae` — `Integrate product catalogue into invoice editor`. Git reported `[master 0309bae] Integrate product catalogue into invoice editor`. The commit changed one file with 133 insertions and 3 deletions.

### Push status

**Confirmed:** The push completed successfully. Remote: `origin` — `https://github.com/ZaidK82/billing-software.git`; branch: `master`; reported push range: `b5bfae2..0309bae master -> master`. This confirms that the commit was pushed to `origin/master`.

### Staging status at commit time

**Confirmed:** Only `frontend/src/components/billing/BillEditor.tsx` was staged for the V3.2 application commit. `PROJECT_BRAIN.md` and the review ZIP were excluded.

### Final working-tree status

**Not independently verified after the commit.** The last reported status before committing showed `PROJECT_BRAIN.md` as untracked. The ZIP was not present in the final displayed status output after staging was corrected. Do not assert that the final working tree is clean or that the ZIP remains untracked without a new `git status --short` result.

### Deployment status

**Unverified.** A successful push is not proof of deployment. No deployment command, deployment log, live-environment verification, or production smoke-test result was provided. Record deployment as **not verified**, not as deployed and not as failed.

## 12. Bugs, Limitations, Deferred Work, and Risks

### Known limitation

- Vite reports that the minified JavaScript bundle exceeds 500 kB. This is a warning, not a build failure. Bundle splitting or optimization may be considered in a future performance-focused sprint if justified.

### Verification limitations

- Automated integration and end-to-end tests were not performed.
- Production-database state was not independently verified.
- Deployment was not verified.
- Detailed regression results for all invoice editing, persistence, historical-row, and PDF cases were not supplied.

These are verification limitations, not proof that the implementation is defective.

### Deferred or unresolved areas

- Confirm deployment status if deployment is required by the release process.
- If future evidence reveals a regression, address it in a targeted fix rather than assuming the sprint's successful build proves all runtime invariants.
- Consider bundle-size optimization separately; it was not required to complete product selection.

No specific functional bug was reported by the user during V3.2 verification.

## 13. Technical and Product Decisions

1. **Reuse the existing product catalogue API.** Use `getProducts` and the established authentication flow rather than duplicating catalogue access or adding a redundant endpoint.
2. **Populate editable invoice-row fields.** Copy the selected product's name and default unit price into the draft row to accelerate entry while retaining per-invoice customization.
3. **Preserve the existing invoice-row model.** Do not add a database relationship or migration when the feature can use the existing fields and calculations.
4. **Preserve price-entry modes.** Account for existing `rate` and `total` modes rather than breaking the established workflow.
5. **Keep the application commit scoped.** Commit only `frontend/src/components/billing/BillEditor.tsx`; exclude `PROJECT_BRAIN.md` and the review ZIP as requested.
6. **Do not claim unperformed verification.** Record manual verification and build results accurately; automated testing, production-database verification, and deployment remain unverified/not performed.

## 14. Roadmap Update

### Completed

- **V3.1 — Product Catalogue Foundation:** Previously implemented and manually verified by the user; its catalogue API and UI are reused by V3.2.
- **V3.2 — Invoice Editor Product Selection:** Implemented, user-reported manual verification successful, frontend build passed, committed, and pushed.

### Remaining

- Update the canonical `PROJECT_BRAIN.md` with this handoff and the current roadmap status.
- Verify deployment separately if deployment is required.
- Continue with the next planned product/invoice workflow enhancement only after reconciling the existing roadmap and dependencies in the canonical Project Brain.
- Address the Vite bundle-size warning only if prioritized as a separate performance task.

Do not invent a next feature or sprint version if the canonical roadmap does not support it.

## 15. Recommended Next Sprint and Dependencies

**Recommendation:** Re-read the canonical `PROJECT_BRAIN.md` and select the next sprint from its existing roadmap after recording V3.2 as complete. The available V3.2 evidence does not establish the full next-sprint roadmap or justify inventing a new sprint objective. The next sprint's name, version, and objective should therefore be taken from the canonical Project Brain, not guessed from this handoff.

### Dependencies for planning

1. Update the Project Brain to record V3.2's actual implementation and Git outcome.
2. Preserve V3.1 and earlier historical handoffs without rewriting them as though they were part of V3.2.
3. Review the remaining roadmap and known issues to select the next sprint.
4. If the next sprint depends on live behavior, verify deployment separately before treating production state as confirmed.

## 16. Final Sprint Record

**Sprint:** V3.2 — Invoice Editor Product Selection  
**Version:** V3.2  
**Objective:** Integrate product catalogue selection into the invoice editor and populate editable invoice-row values.  
**Implementation status:** Complete for the reported scope.  
**User manual verification:** Reported successful.  
**Frontend build:** Passed, with a non-fatal bundle-size warning.  
**Database/schema changes:** None.  
**Alembic migrations:** None.  
**Backend API changes:** None reported.  
**Frontend file changed:** `frontend/src/components/billing/BillEditor.tsx`.  
**PDF-generation changes:** None reported.  
**Automated integration tests:** Not performed.  
**Independent production-database verification:** Not performed.  
**Commit:** `0309bae` — `Integrate product catalogue into invoice editor`.  
**Push:** Confirmed successful to `origin/master`.  
**Deployment:** Not verified.  
**Final working-tree cleanliness:** Not verified after commit.  
**Project Brain included in application commit:** No.  
**Review ZIP included in application commit:** No.  
**Next sprint:** To be selected from the canonical Project Brain roadmap after this handoff is incorporated.

---

**End of V3.2 handoff.**
