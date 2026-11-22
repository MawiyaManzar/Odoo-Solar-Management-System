# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: homeowners and property owners in and around Jalandhar who want rooftop solar (subsidy, EMI, bill savings). Their job on the public site is to understand the offer and book a free site survey.

Secondary: commercial / business property decision-makers evaluating solar for their premises. Same public path into enquiry → survey.

Staff (sales, warehouse, technician, support, admin) operate the install pipeline in the authenticated app; they are not the landing audience.

## Product Purpose

SunPower runs end-to-end solar installation operations for the Jalandhar market: public enquiry → site survey → quote → order → payment → dispatch → installation → service.

Success for the public landing: a visitor submits a real enquiry that enters the staff pipeline (not a brochure dead-end). Success for the product overall: that enquiry can be surveyed, quoted, and fulfilled through the app.

## Positioning

Not a lead-magnet brochure or a generic solar catalog. The public page is the front door into a live install-ops system: packages come from the real catalog API, and the inquiry wizard creates a durable enquiry staff can act on.

## Operating Context

- Public routes: `/` (landing), `/inquire` (phased site questionnaire).
- Staff app: role-based back office (Odoo-style HackCore UI) for the pipeline above.
- Packages and prices on the landing come from `GET /api/public/packages`; enquiries from `POST /api/public/enquiries`.
- Geography and ops ritual: Jalandhar rooftop / premises surveys before any price lock.

## Capabilities and Constraints

- Real catalog packages and enquiry persistence; no fabricated trust stats, testimonials, or fallback mock business data on API failure.
- Inquiry wizard remains at `/inquire`; landing CTAs route there.
- Staff UI stays on the existing HackCore design system (`DESIGN.md`: flat beige / plum / teal, no gradients, no shadows).
- Public landing may use a distinct marketing visual world; must stay mostly white or off-white in background.
- Open: exact commercial contact details, address, and phone for footer/legal copy if not already in assets.

## Brand Commitments

- Product name: **SunPower**.
- Logo: `/logo.png` (BrandMark).
- Tagline in config: “Solar Installation Management” (ops product); public marketing voice centers rooftop solar for homes and businesses.
- Binding for public landing: mostly white or off-white background.
- User confirmed the public landing may diverge visually from the staff HackCore theme.

## Evidence on Hand

- Hero photograph: `public/landing/hero-bg.jpg`.
- Brand mark: `public/logo.png`.
- Live package list and prices from the public packages API (seeded catalog, e.g. on-grid packages).
- No approved customer testimonials, press, or third-party badges on hand — do not invent them.

## Product Principles

1. The landing earns the survey booking; it does not fake social proof.
2. Public claims stay tied to real catalog and enquiry capabilities.
3. Staff ops UI and public marketing can diverge visually; product truth does not.
4. Survey before quote: no price lock until the roof or site is checked.
5. Serve homeowners first; commercial visitors share the same booking path.
