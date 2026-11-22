# User-story test: quote → pay → warehouse → balance → warranty

Ran live against `pnpm dev` (real API + Postgres) on 22 Nov 2026.

Screenshots: `docs/user-story-test/screenshots/`

## Verdict

| Story | Result |
| :--- | :--- |
| After quote accept, customer can pay | Pass — Stripe Checkout from portal; staff can still record UPI/NEFT/cash/cheque |
| 30% advance unlocks warehouse packing | Pass — unpaid order rejected; paid orders appear in New dispatch |
| Remaining balance after delivery (portal) | Pass — Pay remaining / Pay with Card; pay card hides when balance is 0 |
| Serialization | Pass — warehouse Add serial + Scan on dispatch |
| Warranty | Pass — starts on Mark delivered; portal Serials & Warranty shows end date |

## End-to-end path (what happens)

```text
Quote accepted
  → order status awaiting_payment
  → customer pays ≥30% (Stripe Checkout or staff offline payment)
  → order status paid  (“Warehouse can pack”)
  → warehouse New dispatch (packing) → scan serial → Mark delivered
  → warranty clock starts from delivery (product.defaultWarrantyMonths)
  → customer pays remaining balance anytime (before or after delivery)
  → stepper shows Paid in full; Serials & Warranty lists serial + Under warranty
```

Advance gate (backend): paid sum must be at least 30% of total before `POST /api/dispatches` is allowed. Proof: unpaid `ord-cus-mwr3o18l` → `"Record at least 30% before packing this order."`

## Customer portal payment UX

Before any money:

- Copy: “Pay with card on Stripe Checkout. 30% of the total unlocks packing.”
- Radios: **Pay 30% advance** and **Pay 50%**
- CTA: **Pay with Card** → Stripe Checkout (`POST /api/customer/orders/:id/checkout`)

After advance (≥30%):

- Copy: “Advance is in. Pay the balance when you are ready — packing already unlocked.”
- Radios: **Pay remaining** and optional installment amount
- Same Stripe CTA

After paid in full:

- Remaining Payment card disappears
- Payments tab lists Advance + Balance rows
- Stepper label becomes **Paid in full**

Staff offline path still works: `POST /api/orders/:id/payments` (sales/admin).

## Warehouse / serialization / warranty

1. Sign in as `warehouse@sunpower.in` / `hackathon`
2. Warehouse → **New dispatch** → only **paid** orders in the dropdown
3. Create dispatch → status **packing**, order moves to packing
4. Open dispatch → enter serial (or **Add serial**) → **Scan**
5. **Mark delivered** → banner: “Warranty starts from this delivery.”
6. Customer **Serials & Warranty** tab: `product · serial · until <date> · Under warranty`  
   End date = `deliveredAt + products.defaultWarrantyMonths` (computed in `listCustomerOrders`; seed also has `warranties` rows for older installs)

## Screenshots index

| File | What it shows |
| :--- | :--- |
| `01-customer-my-job-after-30pct-advance.png` | After 30% advance: stepper + pay remaining |
| `02-serials-before-dispatch-empty.png` | Serials empty before delivery |
| `03-dispatch-not-yet.png` | Dispatch tab before warehouse pack |
| `04-warehouse-stock-and-dispatches.png` | Warehouse stock + dispatches |
| `05-warehouse-packing-after-advance.png` | New packing dispatch after advance |
| `06-dispatch-delivered-warranty-starts.png` | Delivered + warranty starts banner |
| `07-customer-after-delivery-remaining-balance.png` | Delivered + still owe balance |
| `08-customer-serials-and-warranty.png` | Serial INV-3K-90001 under warranty |
| `09-customer-dispatch-delivered.png` | Customer dispatch tab delivered |
| `10-stripe-checkout-remaining-balance.png` | Stripe Checkout for remaining ₹93,100 |
| `11-customer-paid-in-full.png` | Advance + balance rows; Paid in full |
| `12-customer-quotes-accepted.png` | My Quotes accepted quote |
| `13-customer-awaiting-payment-30-50-options.png` | Pre-advance 30% / 50% Stripe choices |

## Accounts used

| Who | How |
| :--- | :--- |
| Customer Irfan | phone `7982275531` — order `ord-67b97c76` (full walk) |
| Customer Amit / MAWIYA | phone `9876543210` — awaiting + paid samples |
| Warehouse | `warehouse@sunpower.in` / `hackathon` |
| Sales (balance UTR) | `sales@sunpower.in` / `hackathon` |

## Gaps / notes

- Customer portal no longer posts raw UTR payments; card path is Stripe Checkout. Offline UPI remains staff-only.
- Stripe sandbox opened correctly for remaining balance; full card completion was not finished in-browser (balance was recorded via staff UPI for the paid-in-full screenshot).
- Installation / Completed steps still need crew completion elsewhere; delivery alone does not mark the order completed.
