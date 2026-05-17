---
name: FreshFood AI
description: Fresh-food marketplace and AI freshness scanner for Vietnamese customers
register: product
colors:
  canvas: "oklch(0.985 0.008 150)"
  surface: "oklch(0.998 0.006 150)"
  surface-muted: "oklch(0.965 0.011 160)"
  border: "oklch(0.91 0.012 245)"
  text: "oklch(0.22 0.03 250)"
  text-muted: "oklch(0.49 0.035 245)"
  primary: "oklch(0.64 0.16 153)"
  primary-strong: "oklch(0.55 0.15 153)"
  primary-soft: "oklch(0.95 0.045 153)"
  scanner-bg: "oklch(0.18 0.035 250)"
  scanner-panel: "oklch(0.25 0.035 250)"
  warning: "oklch(0.76 0.14 75)"
  info: "oklch(0.62 0.12 245)"
  danger: "oklch(0.61 0.18 25)"
  success: "oklch(0.63 0.15 153)"
typography:
  display:
    fontFamily: "Be Vietnam Pro, Inter, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 4.6vw, 4rem)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "0"
  headline:
    fontFamily: "Be Vietnam Pro, Inter, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.75rem)"
    fontWeight: 750
    lineHeight: 1.18
    letterSpacing: "0"
  title:
    fontFamily: "Be Vietnam Pro, Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0"
  body:
    fontFamily: "Inter, Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  body-small:
    fontFamily: "Inter, Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Inter, Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.04em"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  4xl: "80px"
radii:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  panel: "20px"
  pill: "9999px"
elevation:
  flat: "none"
  raised: "0 10px 30px oklch(0.22 0.03 250 / 0.08)"
  overlay: "0 22px 60px oklch(0.18 0.04 250 / 0.22)"
motion:
  standard: "180ms cubic-bezier(0.22, 1, 0.36, 1)"
  emphasized: "280ms cubic-bezier(0.16, 1, 0.3, 1)"
---

## Overview

FreshFood AI is a product interface, not a marketing-first site. The visual system should support repeated shopping, freshness checking, order review, and admin operations. The default register is restrained: tinted neutral surfaces, clear emerald actions, and compact information density where the task needs it.

The scanner is the one intentionally darker workspace. It creates a focused camera-analysis scene where the user pays attention to the image, confidence, and result. Marketplace, account, cart, and admin surfaces stay light and calm.

## Scene

Primary scene: a customer checks fresh produce on a phone in a bright grocery aisle, then reviews the same account and order information later at home. Admin scene: a store operator uses a desktop dashboard during the day to process orders quickly. This points to a light operational UI with one focused dark scanner mode.

## Color Strategy

Use a restrained product palette:

- Tinted neutral canvas for most app pages.
- Emerald as the main action and trust color.
- Amber, blue, indigo, rose, and slate only as semantic status colors.
- Dark slate only for the scanner workspace and footer, not as the default app theme.

New UI should prefer OKLCH tokens from the frontmatter. Legacy code still contains hex values such as `#27ae60`, `#0f172a`, and `#ffffff`; treat those as implementation approximations and migrate gradually to tokenized colors.

### Semantic Roles

- **Primary action**: emerald background with strong contrast text.
- **Secondary action**: neutral surface with full border and clear label.
- **Danger action**: rose background, used only for destructive actions such as cancel or delete.
- **Pending**: amber tint and label.
- **Confirmed**: sky tint and label.
- **Shipped**: indigo tint and label.
- **Delivered**: emerald tint and label.
- **Cancelled**: rose tint and label.

Never communicate freshness, order status, or errors with color alone. Always include text, icon, or quantity.

## Typography

Use `Be Vietnam Pro` for headings and brand moments, `Inter` for body, tables, controls, and dense operational UI. Vietnamese text must render correctly, with no mojibake.

Rules:

- Body copy maxes at 65 to 75 characters per line.
- Product and admin tables use smaller type but stronger labels for scanability.
- Hero type is reserved for home and scanner entry points. Dashboards and account pages use compact headings.
- Letter spacing is `0` for normal text. Use subtle uppercase label tracking only for metadata labels.

## Layout

### App Shell

- Fixed top navbar, 85px high in the current implementation.
- Main content has enough top padding to clear the navbar.
- Footer is dark slate and should remain visually separate from product flows.

### Marketplace

- Product browsing uses a responsive grid: 1 column on narrow mobile, 2 on tablet, 4 on desktop.
- Product cards need stable image dimensions and product names that wrap without changing card rhythm.
- Filter controls should be grouped above the grid. Do not hide count, search, category, or sort behind a modal.

### Scanner

- Desktop scanner layout is split: image viewport on the left, control/result sidebar on the right.
- Mobile scanner should stack controls below or above the image without shrinking the camera area too far.
- The scanner should feel precise and technical, but still readable. Use dark slate, emerald accents, and strong result labels.

### Account and Orders

- Account overview uses a short summary band followed by segmented tabs.
- Order rows use STT as the visible list index, not database ID as the primary identifier.
- Product names and quantities appear inline inside each order row.
- Pending orders expose edit and cancel actions. Confirmed or later orders show a locked state.
- Editing happens inline below the order row instead of opening a modal.

### Admin Dashboard

- Admin is an operational surface. It should be dense, aligned, and quiet.
- Stats cards summarize users, products, orders, revenue, pending orders, low stock, and system status.
- Order management table must show STT, order ID, customer, product names, quantities, total, status, and actions.
- Wide tables can scroll horizontally on small screens. Do not compress columns until labels become unreadable.

## Components

### Buttons

- Primary: emerald filled, 8px to 12px radius depending on density.
- Secondary: neutral filled or neutral outline, full border, no colored side stripe.
- Destructive: rose filled, paired with explicit label such as "Hủy" or "Xóa".
- Icon buttons should use lucide icons where available and include visible text for critical actions.

### Cards and Panels

- Use cards for product items, account panels, dashboard summaries, and repeated order rows.
- Avoid nested cards. If a row needs internal grouping, use tinted rows, dividers, badges, or inline chips.
- Border radius should usually stay at 8px to 16px. Large 24px to 30px radii are only for modals or major presentation elements.

### Forms

- Inputs use neutral border, comfortable padding, and emerald focus ring.
- Labels are always visible. Placeholders are examples, not replacements for labels.
- Profile and order edit forms should preserve existing values and save inline.

### Tables

- Header row: tinted neutral background, medium label text.
- Body rows: subtle dividers and hover tint.
- Action column aligned right.
- Status column uses both select control and badge when admins can update order state.

### Badges

Badges are small, rounded, and semantically colored. Use text labels:

- Chờ xác nhận
- Đã xác nhận
- Đang giao
- Đã giao
- Đã hủy
- Đã trả

### Modals

Use modals only for focused interruptions, such as auth prompts or product details. Do not use modals for simple order edits when inline expansion is available.

## Motion

Motion is functional:

- Hover: slight elevation or color change only.
- Product images can scale subtly on hover.
- Loading states use simple spinners.
- Scanner confidence bar may animate width.
- Do not animate layout properties. Use opacity and transform.
- Respect `prefers-reduced-motion`.

## Accessibility

- WCAG AA is the baseline.
- Focus states must be visible on navbar links, form controls, buttons, table actions, and scanner controls.
- Destructive actions require confirmation or clear reversible state.
- Tables must remain readable at 320px to 1440px through horizontal overflow where needed.
- Scanner camera errors need text instructions, not only alerts.
- Vietnamese copy should be short, direct, and correctly encoded.

## Do

- Use emerald for primary action and trust.
- Use STT for user-facing order lists.
- Show product names and quantities where order status appears.
- Keep admin pages dense but calm.
- Use lucide icons for admin and account controls.
- Keep scanner visually distinct because it is a focused tool.

## Do Not

- Do not use gradient text.
- Do not add colored side-stripe borders.
- Do not use glassmorphism as the default card style.
- Do not turn the admin dashboard into a marketing page.
- Do not rely on database IDs as the main user-facing ordering cue.
- Do not create a green-only interface.
- Do not use modals as the first answer for edit flows.
- Do not add decorative orbs or generic gradient blobs.
