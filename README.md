# Wyze Security Bundle Builder

A production-style, two-column **home security bundle builder** built as a frontend
take-home assignment. Shoppers assemble a personalized Wyze security system through a
four-step accordion (cameras → plan → sensors → extra protection) with a live review
panel, variant-specific quantities, fully derived pricing, and explicit save/restore.

The three reference artboards (desktop 1439px, tablet 928px, mobile 390/483px) are
reproduced to pixel-measured fidelity — colors, column widths, card geometry, and
line wrapping were all measured programmatically against the supplied screenshots.

## Technology stack

- [React 19](https://react.dev/) + [Vite 7](https://vite.dev/) + **TypeScript (strict)**
- [Zustand 5](https://zustand.docs.pmnd.rs/) — single source of truth for bundle state
- CSS Modules + centralized design tokens (`src/styles/tokens.css`)
- [Lucide React](https://lucide.dev/) — stepper/placeholder icons
- Local JSON product data · LocalStorage persistence
- [Vitest 4](https://vitest.dev/) + [React Testing Library](https://testing-library.com/) — 58 unit/component tests
- [Playwright](https://playwright.dev/) — 40 end-to-end tests across 3 viewport projects
- ESLint 9 (flat config) + Prettier

No backend, no environment variables, no credentials required.

## Prerequisites

- Node.js 20+ (developed on Node 26) and npm.

## Getting started

```bash
npm install
npx playwright install chromium   # once, for e2e tests
npm run dev                       # http://localhost:5173
```

### All scripts

| Script                 | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Vite dev server                              |
| `npm run build`        | Type-check + production build to `dist/`     |
| `npm run preview`      | Serve the production build locally           |
| `npm test`             | Vitest unit/component tests                  |
| `npm run test:watch`   | Vitest in watch mode                         |
| `npm run test:e2e`     | Playwright e2e (builds + previews app first) |
| `npm run lint`         | ESLint                                       |
| `npm run format`       | Prettier write                               |
| `npm run format:check` | Prettier check                               |

## Project structure

```
src/
  components/
    builder/     # accordion, steps (BuilderAccordion, BuilderStep)
    products/    # ProductCard, VariantSelector
    review/      # ReviewPanel, ReviewItem, CheckoutDialog
    common/      # QuantityStepper, PriceDisplay, ProductThumb, StepIcon, Toast
  data/          # products.json, config.json, catalog.ts (runtime validation)
  store/         # bundleStore.ts — Zustand store (user intent only)
  utils/         # pricing.ts, selectors.ts, persistence.ts, lineItems.ts (pure)
  types/         # TypeScript models
  styles/        # tokens.css, fonts.css, global.css
public/
  assets/        # ALL runtime assets, organized by purpose:
    products/{cameras,sensors,accessories}/<product-id>/  (base + per-color images)
    sections/<step-id>/step-icon.png
    review/      # fast-shipping + plan logo icons
    badges/      # satisfaction guarantee seal
  fonts/         # drop-in location for licensed Gilroy files (see Typography)
tests/e2e/       # Playwright specs (core, builder, mobile)
screenshots/     # supplied design references (NOT used at runtime)
product-pictures/# original supplied images   (NOT used at runtime)
```

The app loads every runtime asset from `public/assets/`; `screenshots/` and
`product-pictures/` are reference-only and can be removed without breaking anything.

## Architecture

### State: one source of truth, everything else derived

`bundleStore.ts` holds only **user intent**: a `quantities` map, the variant each
card displays, and the active accordion step. Every other value — line totals,
category groupings, distinct-product step counts, subtotals, savings, grand total —
is derived by pure functions in `utils/pricing.ts` and `utils/selectors.ts`. Nothing
derived is ever stored, so the builder cards and the review panel cannot disagree.

### Variant-specific quantities

Every orderable line is keyed `productId` or `productId:variantId`
(`utils/lineItems.ts`). Each color variant owns an independent quantity; switching
the variant a card displays changes **only** the display — quantities never move or
reset. All selected variants appear as separate review rows, and both columns call
the same store actions on the same line-item IDs, which is what keeps them
synchronized by construction.

### Product data & pricing configuration

All products, variants, images, badges, copy, **per-unit prices (integer cents)**,
seeded initial quantities, and required-minimums live in `src/data/products.json`;
steps, shipping, the financing label, and the storage key/version live in
`src/data/config.json`. `catalog.ts` validates the JSON at load and fails fast on
malformed data. No product-specific logic exists in components — adding a product or
correcting a price is a JSON-only change. Money is integer cents throughout to avoid
floating-point drift; formatting happens once at the display boundary.

### LocalStorage persistence

Saving is **explicit** (“Save my system for later”), not auto-sync — a deliberate
save can therefore never be silently overwritten by transient tinkering. The payload
is versioned (`wyze-bundle-builder:saved-system`, v1). On load, stored data is
validated against the live catalog: corrupt JSON or unknown versions fall back to
seeded defaults; unknown products/variants are dropped; quantities are floored and
clamped; required products are restored to at least their minimum. Hydration never
writes back to storage, and the app degrades gracefully when storage is unavailable.

## Design fidelity notes

- Design tokens (13 pixel-sampled colors, measured layout metrics, confirmed Figma
  specs) are centralized in `src/styles/tokens.css`.
- Desktop camera-card line wrapping was tuned and **verified against rendered text
  after `document.fonts.ready`** (early measurements before webfont load are
  misleading — see the e2e specs for the measurement technique).
- Breakpoints: desktop ≥ 1100px (two columns, sticky review), tablet 700–1099px
  (one-row vertical cards, review stacked with two-column interior + 30-day returns
  copy), mobile < 700px (collapsed steps, edge-to-edge separators, full-bleed
  review, “HOME MONITORING PLAN” label).

## Important decisions, trade-offs & known limitations

1. **Gilroy fonts are NOT bundled** (commercial license; files were not provided).
   Montserrat is the documented fallback; all Gilroy families are declared first in
   the font stacks with prepared `@font-face` blocks in `src/styles/fonts.css` —
   drop licensed `.woff2` files into `public/fonts/` and uncomment to enable. The
   exact Gilroy rendering has **not** been verified, and text wrapping was tuned
   against Montserrat; re-verify wrapping if Gilroy is added.
2. **Wyze Cam Pan v3 pricing is provisional.** The reference design is internally
   inconsistent: the card shows $39.98/$34.98 per unit, but the review panel’s
   qty-2 line totals ($57.98/$47.98) imply **$28.99/$23.99**, which is what this app
   uses because it reproduces the reference totals ($238.81 / $187.89 / $50.92
   savings) exactly. Adopting the card prices is a two-number edit in
   `products.json` (documented inline there).
3. **Financing text (“as low as $19.19/mo”) is a literal config value.** The rule
   behind it was never confirmed, so it intentionally does not recalculate when the
   bundle changes.
4. **Steps 2–4 expanded designs were never supplied.** Those sections render only
   the confirmed items (Cam Unlimited plan, Motion Sensor, Sense Hub, MicroSD card)
   using the standard card layout — no products, prices, or copy were invented.
5. **Checkout is a placeholder** confirmation dialog; no payment processing or
   backend exists (out of assignment scope).
6. **Image limitations:** the supplied “Cam v4 grey” chip image is byte-identical
   to the white one, so the Grey chip currently shows the white thumbnail (replace
   `public/assets/products/cameras/wyze-cam-v4/wyze-cam-v4-grey-thumb.png` to fix —
   no code change). Cam v4 / Pan v3 received only 48px chip thumbnails, so their
   main card image keeps the base product shot for every color; Floodlight v2 and
   Battery Cam Pro have full-size per-color images that swap on the card and in the
   review panel.
7. **Bundle total** includes the plan’s monthly fee and excludes shipping — this
   matches the reference arithmetic exactly and is asserted by tests.
8. Totals shown in tests/reference ($187.89 etc.) are **derived, never hardcoded**
   in the application; tests assert the derivation reproduces the reference.

## Testing

- **Unit/component (Vitest + RTL), 58 tests:** pricing math (reference totals
  reproduced from unit prices), selectors/grouping/distinct counts, store actions
  (variant independence, required minimums, clamping, single-select plans,
  accordion), persistence validation (corrupt/stale/unknown data), and full-app
  integration flows (builder↔review sync, save/restore, checkout dialog).
- **E2E (Playwright), 40 tests** across desktop/tablet/mobile projects: seeded
  state and totals, console/network error checks, broken-image checks, overflow at
  all four reference widths, review-stepper flows, required-minimum enforcement,
  save → real reload → restore (latest save wins), corrupted/incompatible storage
  fallbacks, accordion behavior incl. keyboard, variant independence through the
  real UI, and mobile single-line name verification.

Note for CI: the Vitest setup polyfills `localStorage` because Node 26 ships an
experimental global that shadows jsdom’s implementation (see `vitest.setup.ts`).
