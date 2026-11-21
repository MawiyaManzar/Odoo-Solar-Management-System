# Landing UI polish

Owner: Charity | Branch: feat/revamp-landing-page | Status: verified

## Part A: Spec (contract for teammates)

### User stories
| ID | Role | Story | Acceptance |
| :--- | :--- | :--- | :--- |
| US-1 | visitor (public) | See a professional marketing landing for SunPower | Given `/`, when the page loads, then brand, Montserrat Bold hero title “Go Solar at Zero Investment”, hero photo, and packages are visible. |
| US-2 | visitor (public) | Browse active packages | Given active packages in the catalog, when the landing loads, then each package shows code, name, kind, capacity, and base price in INR from `GET /api/public/packages`. |
| US-3 | visitor (public) | Complete a phased site questionnaire and contact step | Given the wizard, when they answer each phase and submit contact details, then `POST /api/public/enquiries` creates the enquiry and they see a success reference. |

### Roles and permissions
| Action | public | staff |
| :--- | :--- | :--- |
| View landing | yes | yes (no auth) |
| List public packages | yes | yes |
| Submit phased inquiry | yes | n/a |

### API contract
- `GET /api/public/packages` — unchanged.
- `POST /api/public/enquiries` — extend body (no new tables) if assumption 6 = A:

| Field | Type | Rule |
| :--- | :--- | :--- |
| name, phone, addressLine, city | string | required (as today) |
| email, pincode, customerType, systemKind, wantsSubsidy, notes | as today | optional |
| requestedKw | number | required; dedicated wizard step |
| monthlyBillInr | number \| null | optional; maps to existing `enquiries.monthly_bill_inr` |
| roofAreaSqft | number \| null | optional; maps to existing `enquiries.roof_area_sqft` |
| gridSuitable | boolean \| null | optional; maps to existing `enquiries.grid_suitable` |

Phase answers with **no column** (roof ownership, roof type, power cuts, timeline) go into structured `notes` unless assumption 6 = B (schema change — needs your OK).

### Screens

**P1 Landing (`/`)**  
Purpose: marketing entry + packages. Hero with Montserrat Bold title and photo. CTA → `/inquire`.  
States for packages: skeleton (`landing-skeleton`), empty (`landing-empty`), error + Retry.

**P2 Phased inquiry (`/inquire`)**  
Pill tiles, plum selected state, flat DESIGN.md:

1. Roof ownership — Yes / No → `gridSuitable`  
2. Roof type — Concrete / Metal sheet / Brick / Underconstructed → notes  
3. Terrace size — &lt;200 / 200–400 / 400+ → `roofAreaSqft`  
4. Power cuts — None / &lt;1h / &lt;4h / &gt;4h → notes  
5. Monthly bill bands → `monthlyBillInr`  
6. System size — requested kW, on/off-grid, subsidy  
7. Contact — name, phone, address, city, PIN → submit  

States: step validation before Next; submitting; success with enquiry id; error Alert (no fake success).

### Depends on
`catalog` public packages + public enquiry — real on `main`.

### Assumptions (reviewed with the developer)
| # | Assumption | Decision |
| :--- | :--- | :--- |
| 1 | Keep HackCore DESIGN.md (beige / plum / teal, flat, no shadows, no gradients) | Yes |
| 2 | Wizard lives on `/inquire` (landing CTA links there); landing stays marketing + packages | A — `/inquire` wizard |
| 3 | Hero mock from attachments in `public/` | Yes — full-bleed `public/landing/hero-bg.jpg` with Montserrat Bold “Go Solar at Zero Investment” (amber highlight on Zero Investment) and Book consultation CTA |
| 4 | Hero title font | Montserrat Bold (700) via `--font-hero` on the hero title only; all other UI uses Inter (`--font-sans`) per DESIGN.md |
| 5 | No fabricated trust stats | Yes |
| 6 | Persist phases without new columns | A — extend public API for `monthlyBillInr`, `roofAreaSqft`, `gridSuitable`; roof ownership / type / power cuts in structured `notes` |
| 7 | Requested kW | B — dedicated kW step in the wizard |

## Part B: Walkthrough

### 1. Try it live
1. Open `/`. You should see Montserrat Bold “Go Solar at Zero Investment”, the hero photo, Book consultation, and at least package `OG-3KW` at ₹1,85,000 from the API.
2. Click **Book a free survey**. On `/inquire`, step 1 asks roof ownership. Choose **Yes**, then **Next**.
3. Roof type **Concrete roof** → terrace **200 – 400 sqft / Medium** → **No power cut** → bill **₹1,500 – ₹2,500** → keep **3 kW** on-grid → contact: name `Priya Sharma`, phone `9811122233`, address `12 Model Town`, city `Jalandhar`.
4. Submit. Success shows an `enq-…` reference. Refresh `/inquire` and you start a new wizard (success state is session-only); the enquiry remains in Postgres for sales.
5. Staff: sign in as `sales@sunpower.in` / `hackathon`, open Enquiries, and find Priya’s row with bill and roof area filled and phase text in notes.

### 2. How it works
`LandingPage` calls `listPublicPackages()` → `GET /api/public/packages`. `InquiryPage` walks seven steps, then `submitPublicEnquiry()` → `POST /api/public/enquiries`. `createPublicEnquiry` in `catalog/service.ts` upserts the customer by phone and inserts an enquiry with `source: web_form`, mapping terrace/bill to columns and writing ownership/type/power cuts into `notes`.

### 3. What you can add next
- Dedicated columns for roof type / power cuts (medium, schema + migration).
- Package deep-link into the wizard with preselected kW (small).
- Staff enquiry detail showing structured phase fields instead of raw notes (small).
- Public package detail page from landing cards (medium).

### 4. Test coverage
- US-2, US-3: `apps/backend/tests/landing-ui.e2e.mjs`
- Browser: landing populated, wizard through submit → `enq-15cda349` in real mode
- US-1 visual: Montserrat Bold hero title + packages confirmed in Cursor browser
