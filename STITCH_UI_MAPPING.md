# Stitch UI Mapping

## Source Notes

- Current frontend stack: `React 19 + Vite + react-router-dom 7 + Tailwind 4`.
- Logic that must remain untouched: routing guards, auth/session, cart/favorites/app settings contexts, API services, local state flows, validation, permission checks, business rules.
- Stitch reference used for this pass:
  - `STITCH_AI_SYSTEM_DESIGN.md`
  - `UI_SPECIFICATION.md`
  - the Stitch `DESIGN.md` described in the IDE context
- Direct access to the original extracted Stitch folder was not available from the sandbox at execution time, so mapping is based on the in-repo Stitch analysis/spec files plus the current codebase structure.

## Current Architecture Map

| Route / Surface | Current Page / Shell | Main Child Components | Logic Sources To Preserve |
|---|---|---|---|
| `/` | `Home.jsx` | `Navbar`, `NutriHeaderHero`, `ProductCardGrid`, `ProductDetail`, `Footer`, `ChatWidget` | `getProducts`, cart add flow, favorites, product detail modal open rules |
| `/shop` | `Products.jsx` | `MarketCategorySidebar`, filter form, quick tags, `ProductCardGrid`, `ProductDetail` | URL-synced filters, category mapping, sort, pagination, product sync event |
| `/auth` | `Auth.jsx` | inline auth card + forgot password form | `login`, `register`, `requestPasswordReset`, phone validation, redirect-from |
| `/cart` | `Cart.jsx` | cart list, delivery profile section, payment cards, sticky summary | cart selection, quantity CRUD, delivery profile CRUD-lite, checkout validation, order create |
| `/profile` | `Profile.jsx` | profile hero, tabs, password form, address forms, order accordion | `getUserProfile`, `changePassword`, order edit/cancel rules, address CRUD/default rules |
| `/orders/:orderId/confirm-freshness` | `FreshnessConfirm.jsx` | per-item AI/manual review cards, `ManualFreshnessReview`, sticky summary, complaint modal | eligibility gate, TFJS model load, AI/manual fallback, multipart submit, complaint create |
| `/admin/dashboard/*` | `AdminDashboard.jsx` + `AdminShell.jsx` | overview blocks, product/warehouse/settings surfaces, `OrderManagementPanel`, `AIFeedbackPanel` | admin/staff tab permissions, paginated admin APIs, product CRUD, stock flows, QR update |
| Public shared shell | `App.jsx` + `Navbar.jsx` + `Footer.jsx` | public nav/footer/chat shell | auth modal gate, theme/lang toggles, notifications, favorites/cart counters |

## Stitch Mapping Table

| Current Page / Component | Stitch-Inspired Target Surface | UI Changes | Logic To Keep Intact | Files To Edit | Main Risks |
|---|---|---|---|---|---|
| Public app shell | Organic Vitality light commerce shell | calmer light canvas, cleaner spacing rhythm, unified brand header/footer, better mobile drawer | providers, route structure, auth modal behavior, notification behavior | `frontend/src/index.css`, `frontend/src/styles/uiTokens.js`, `frontend/src/components/common/Navbar.jsx`, `frontend/src/components/common/Footer.jsx`, `frontend/src/App.css` | navbar regression on mobile, theme toggle collisions |
| `Home.jsx` + `NutriHeaderHero.jsx` | Stitch home / trust-first hero | stronger scanner/trust hierarchy, better featured section framing, refreshed CTA styling | product fetch fallback, CTA routes, product detail modal rules, add-to-cart behavior | `frontend/src/pages/Home.jsx`, `frontend/src/components/home/NutriHeaderHero.jsx`, `frontend/src/components/common/ProductCardGrid.jsx` | hero changes may affect responsive height and modal entry points |
| `Products.jsx` + `MarketCategorySidebar` + cards | Stitch catalog workspace | denser catalog header, cleaner filter shell, better tag layout, more explicit product CTA styling | query param sync, sidebar category logic, sorting, pagination, product sync event | `frontend/src/pages/Products.jsx`, `frontend/src/components/common/ProductCardGrid.jsx`, `frontend/src/components/common/MarketCategorySidebar.jsx`, `frontend/src/styles/uiTokens.js` | breaking URL-sync or active category state |
| `Auth.jsx` | Stitch auth gateway | better branded auth scene, improved hierarchy, possible password visibility control, stronger success/error presentation | login/register/forgot flows, phone validation, redirect to `from` | `frontend/src/pages/Auth.jsx`, `frontend/src/index.css` | form state regression if markup is restructured too aggressively |
| `Cart.jsx` | Stitch checkout workspace | clearer 3-block composition: items, address, payment, summary; better status messaging | item selection, quantity updates, address save validation, payment method state, checkout submit | `frontend/src/pages/Cart.jsx`, shared tokens/styles | sticky summary or mobile stacking regressions |
| `Profile.jsx` | Stitch account workspace | cleaner account hero, tabs, address cards, order cards, inline edit framing | profile update, password change, address CRUD/default, order edit/cancel/freshness actions | `frontend/src/pages/Profile.jsx` | large file, high chance of accidental behavior drift in inline edit states |
| `FreshnessConfirm.jsx` + `ManualFreshnessReview.jsx` | Stitch post-delivery task flow | task-oriented progress layout, clearer AI/manual sections, stronger result cards, better compensation modal styling | eligibility checks, AI/manual fallback logic, file handling, submit payload, complaint actions | `frontend/src/pages/FreshnessConfirm.jsx`, `frontend/src/components/freshness/ManualFreshnessReview.jsx` | file input handling and preview lifecycle |
| `AdminShell.jsx` | Stitch operational admin shell | quieter sidebar/topbar, stronger information hierarchy, better collapsed/mobile shell | active tab routing, staff/admin tab visibility, refresh behavior, logout/home actions | `frontend/src/components/admin/AdminShell.jsx`, `frontend/src/pages/AdminDashboard.jsx` | sidebar collapse/mobile drawer regressions |
| `OrderManagementPanel.jsx` | Stitch orders operations screen | clearer filters, summary band, table hierarchy, drawer polish, mobile cards | fetch, filter params, bulk select, status update, delete, detail drawer | `frontend/src/components/admin/OrderManagementPanel.jsx` | table responsiveness and drawer interaction |
| `AIFeedbackPanel.jsx` | Stitch feedback triage screen | cleaner triage metrics, denser list/table, sharper detail drawer, severity cues | filters, search, pagination, mark-read behavior | `frontend/src/components/admin/AIFeedbackPanel.jsx` | selected item state across page/filter changes |

## Design Token Extraction Plan

| Token Area | Stitch Direction To Apply | Current Source | Planned Action |
|---|---|---|---|
| Color | restrained light commerce palette, emerald as action, amber/sky/rose semantic accents, dark only for focused tools | `DESIGN.md`, `index.css`, inline classes | normalize into CSS vars + shared utility strings |
| Typography | `Be Vietnam Pro` + `Inter` only for product UI density | `index.css`, `DESIGN.md` | reduce visual competition from mixed font roles |
| Radius | medium-large rounded panels with more discipline | scattered inline Tailwind radii | standardize in `uiTokens.js` and shared surfaces |
| Shadows | softer operational shadows, less decorative lift | `uiTokens.js`, inline classes | create reusable section/card/button shadow language |
| Forms / Buttons | shared primary, secondary, destructive, quiet styles | mixed inline classes | centralize via shared token strings where practical |

## Safe Execution Order

1. Normalize tokens and shared shell.
2. Refresh shared cards/forms that multiple pages inherit.
3. Redesign public commerce pages.
4. Redesign profile and freshness workflow.
5. Redesign admin shell and admin panels.
6. Build and verify behavior.
