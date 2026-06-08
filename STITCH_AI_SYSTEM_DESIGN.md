# Tài liệu phân tích hệ thống giao diện cho Stitch AI

## 2.1 Tổng quan dự án

**Tên dự án:** FreshFood AI  
**Brand đang hiển thị trong frontend:** `NutriGro`  
**Loại sản phẩm:** Web app thương mại điện tử thực phẩm tươi, tích hợp AI kiểm tra độ tươi trước và sau mua hàng.

### Mục đích website

- Cho khách hàng duyệt sản phẩm thực phẩm tươi, thêm giỏ hàng, đặt hàng và theo dõi đơn.
- Cho khách hàng xác nhận độ tươi sau giao hàng bằng AI hoặc chấm thủ công.
- Cho admin và staff quản lý đơn hàng, sản phẩm, tồn kho, AI feedback và QR thanh toán.

### Stack công nghệ thực tế

- Frontend framework: `React 19` với `react-router-dom 7`.
- Build tool: `Vite 8`.
- Styling: `Tailwind CSS 4` kết hợp CSS custom và token file `uiTokens.js`.
- Motion: `Framer Motion 12`.
- Icons: `lucide-react`.
- AI trên client: `@tensorflow/tfjs 4`.
- HTTP client: `axios`.
- Fonts đang load thật: `Be Vietnam Pro`, `Inter`, `Fraunces`, `Manrope`.

### Đối tượng người dùng

- Guest: xem shop, tìm kiếm, lưu yêu thích, mở chat, xem product detail.
- Customer: mua hàng, quản lý hồ sơ, địa chỉ, đơn hàng, xác nhận độ tươi sau giao hàng.
- Staff: xử lý đơn hàng, sản phẩm, kho.
- Admin: toàn quyền, thêm users, feedback, overview, payment QR.

### Tone thương hiệu hiện tại

- Tông chính: sạch, thân thiện, tin cậy, hơi “fresh marketplace”.
- Customer UI: sáng, nhiều emerald, card bo tròn lớn, cảm giác mềm và gần gũi.
- Scanner UI: tối, sci-fi nhẹ, tách biệt khỏi phần thương mại.
- Admin UI: operational, nhẹ nhàng, ít màu hơn customer UI.

### Luồng người dùng chính

1. Người dùng vào `/`, xem hero và 2 block sản phẩm.
2. Từ home hoặc navbar đi vào `/shop`, tìm kiếm, lọc và mở modal chi tiết.
3. Thêm sản phẩm vào giỏ, vào `/cart`, chọn item thanh toán, chọn địa chỉ, chọn COD hoặc QR.
4. Đặt hàng xong được điều hướng sang `/profile` tab `orders`.
5. Khi đơn `delivered`, người dùng vào `/orders/:orderId/confirm-freshness` để upload ảnh từng sản phẩm, nhận điểm thưởng hoặc tạo complaint.
6. Admin/staff đi qua `/admin/dashboard/:section` để vận hành.

### Điểm mạnh thiết kế hiện tại cần giữ lại

- Hero, catalog và product cards đã có hierarchy khá rõ.
- Scanner có visual language riêng, dễ tách thành một “tool workspace”.
- Admin shell tách hẳn khỏi customer shell, đúng vai trò.
- Quy trình order confirmation sau giao hàng là điểm khác biệt thật sự của sản phẩm.
- Hệ thống badge trạng thái đơn hàng và semantic color đã tương đối rõ.

### Điểm yếu và vấn đề UI/UX cần cải thiện

- Branding không nhất quán: spec ghi `FreshFood AI`, code UI lại hiển thị `NutriGro`.
- Có dấu hiệu lỗi encoding ở nhiều chuỗi tiếng Việt trong source và content hiện hành.
- Scanner page có trong code nhưng chưa mount route trong `App.jsx`, luồng truy cập chưa rõ.
- Loading state chủ yếu là text/spinner, thiếu skeleton và trạng thái chuyển tiếp mượt.
- Hệ token màu và typography đang pha trộn giữa `DESIGN.md`, `tailwind.config.js`, `index.css` và class inline.
- Cart, profile và admin có mật độ thông tin cao, nhưng nhiều khối vẫn là “card chồng card”, hơi dài và nặng.
- Theme dark hiện tại là override theo selector khá thủ công, khó scale khi redesign.

**Tóm tắt:** Sản phẩm có định vị rõ và khác biệt nhờ scanner + freshness confirmation. Vấn đề lớn nhất không phải thiếu tính năng, mà là thiếu thống nhất về brand, token hệ thống và độ mượt của UX.

---

## 2.2 Danh sách trang và màn hình

| Trang | Route | Mô tả chức năng | Components chính |
|---|---|---|---|
| Trang chủ | `/` | Hero, 2 section sản phẩm, CTA vào shop và hậu giao hàng | `Navbar`, `NutriHeaderHero`, `ProductCardGrid`, `ProductDetail`, `ChatWidget`, `Footer` |
| Danh mục sản phẩm | `/shop` | Tìm kiếm, lọc theo nhóm, lọc dữ liệu, sort, pagination, modal chi tiết | `Navbar`, `MarketCategorySidebar`, filter form, quick tags, `ProductCardGrid`, `ProductDetail`, `Footer` |
| Yêu thích | `/favorites` | Hiển thị sản phẩm đã lưu từ `FavoritesContext`, empty state, add to cart | `Navbar`, page header, `ProductCardGrid`, `ProductDetail`, `Footer` |
| Đăng nhập / đăng ký | `/auth` | Login, register, forgot password inline | auth card, message banner, inline forgot form |
| Giỏ hàng và checkout | `/cart` | Chọn item thanh toán, CRUD số lượng, địa chỉ giao hàng, chọn COD/QR, sticky summary | cart list, payment cards, delivery profile form, sticky order summary |
| Hồ sơ cá nhân | `/profile` | 3 tab: thông tin, địa chỉ, đơn hàng | profile hero, tabs, profile form, password form, address cards, order accordion |
| Xác nhận độ tươi sau giao hàng | `/orders/:orderId/confirm-freshness` | Upload ảnh từng sản phẩm, AI/manual review, submit toàn bộ, complaint modal | item review cards, `ManualFreshnessReview`, sticky summary, compensation modal |
| Admin dashboard | `/admin/dashboard` | Route gốc admin, tự điều hướng về tab mặc định | `AdminShell` |
| Admin dashboard theo tab | `/admin/dashboard/:section` | Overview, users, orders, products, warehouse, feedback, settings | `AdminShell`, `OrderManagementPanel`, `AIFeedbackPanel`, product modal, QR panel |
| Scanner AI | Có file page `Scanner.jsx` nhưng chưa có route mount | Camera live scan hoặc upload ảnh, feedback AI | `ScannerCard`, custom scanner CSS |

### Tabs trong admin

| Tab | Key route | Quyền | Chức năng |
|---|---|---|---|
| Tổng quan | `overview` | Admin | KPI, low stock, system status |
| Người dùng | `users` | Admin | Search user, đổi role, xóa |
| Đơn hàng | `orders` | Admin, Staff | Filter, bulk update status, detail drawer |
| Sản phẩm | `products` | Admin, Staff | Search, filter, chỉnh sửa sản phẩm |
| Kho hàng | `warehouse` | Admin, Staff | Import/export stock, stock history, tạo/xóa product |
| AI feedback | `feedback` | Admin | Table feedback, filter read/unread, detail drawer |
| Cài đặt | `settings` | Admin | Update QR thanh toán |

### Trang không có riêng nhưng là surface quan trọng

- Product detail modal, dùng ở home, shop, favorites.
- Auth modal, gọi từ navbar khi guest bấm action cần login.
- Notification dropdown trong navbar.
- Chat widget nổi ở mọi route public.

**Tóm tắt:** Surface của hệ thống chia làm 3 cụm rõ ràng: customer commerce, post-delivery AI workflow, và admin operations. Scanner là màn hình quan trọng nhưng hiện chưa được gắn route chính thức.

---

## 2.3 Design system hiện tại

### Màu sắc thực tế

| Role | Giá trị chính | Ghi chú |
|---|---|---|
| Primary | `#059669`, `#10b981` | CTA chính, badge xanh, active state |
| Primary hover | `#047857`, `#15803d` | Hover button |
| Accent amber | `#fbbf24`, `#f59e0b` | Promotion, warning, pending |
| Info sky | `#0ea5e9` | Confirmed, secondary semantic |
| Indigo | `#4f46e5` family qua utility | Shipped state |
| Danger rose/red | `#ef4444`, `#e11d48` | Delete, cancel, poor freshness |
| Surface | `#ffffff`, `#f8fafc`, `#f7faf8` | Page nền và card |
| Text main | `#0f172a` | H1, body strong |
| Text muted | `#64748b`, `#94a3b8` | Copy phụ, metadata |
| Dark scanner/admin accents | `#1e293b`, `#0f172a`, `#334155` | Scanner workspace, dark theme overrides |

### Token nguồn

- `DESIGN.md`: đã mô tả token hiện đại hơn bằng `oklch`, nhưng code chưa dùng thống nhất.
- `tailwind.config.js`: dùng hex theo hệ cũ.
- `index.css`: định nghĩa CSS variables thật sự đang render.
- `uiTokens.js`: chuẩn hóa container, input, button cho nhiều page mới hơn.

### Typography

| Role | Font family | Kích thước thực tế |
|---|---|---|
| Main UI | `Be Vietnam Pro`, fallback `Inter` | body khoảng `14px` đến `16px` |
| Dense body / tables | `Inter` | `12px` đến `14px` |
| Product titles | `Fraunces` | card title `14px`, modal title lớn hơn |
| Category labels | `Manrope` | meta/uppercase pills |
| Hero / page headings | `Be Vietnam Pro` | `text-3xl`, `md:text-[2.25rem]`, `md:text-[2.7rem]` |

### Typography scale đang thấy nhiều nhất

- Display / hero: `2.25rem` đến `2.7rem`
- Page heading: `2xl` đến `3xl`
- Section title: `xl` đến `2xl`
- Body: `sm` và `base`
- Caption / label: `xs`, `10px`, `11px`, uppercase tracking

### Spacing và layout

- `fresh-container`: `max-width: 1520px`, padding ngang `clamp(16px, 3.5vw, 52px)`.
- Desktop public catalog: sidebar `300px` + content `1fr`.
- Desktop cart: content `1fr` + sticky summary `320px` đến `400px`.
- Desktop freshness confirm: content `1fr` + sticky summary `320px`.
- Admin desktop: sidebar `292px`, collapsed `96px`.
- Gaps phổ biến: `gap-3`, `gap-4`, `gap-5`, `gap-6`, `gap-8`.
- Padding card phổ biến: `p-4`, `p-5`, `p-6`, `p-8`.

### Breakpoints đang dùng

| Breakpoint | Giá trị | Cách dùng |
|---|---|---|
| `sm` | `640px` | 2 cột nhỏ, refine spacing |
| `md` | `768px` | split layout, larger typography |
| `lg` | `1024px` | desktop sidebar, sticky aside, admin desktop |
| `xl` | `1280px` | product grid 4 cột, admin wide tables |

### Border radius

- Form/input nhỏ: `10px` đến `12px`
- Button/action card: `12px` đến `16px`
- Main card/page sections: `24px` (`rounded-3xl`)
- Hero lớn: `32px`
- Pill/badge: full rounded

### Shadow và elevation

- Soft card: `0 8px 22px rgba(15,23,42,0.07)`
- Elevated section: `0 18px 45px rgba(15,23,42,0.08)`
- Hero: `0 24px 60px rgba(16,185,129,0.13)`
- Modal: `0 26px 60px rgba(15,23,42,0.18)` đến `0 32px 90px rgba(15,23,42,0.34)`

### Trạng thái UI hiện có

- Loading: text loader, spinner `Loader2`, scanner overlay spinner.
- Empty state: favorites empty, cart empty, products no-result, admin empty blocks.
- Error state: banner màu rose/amber trên auth, cart, profile, admin, freshness confirm.
- Success state: banner emerald, add-to-cart confirmation, feedback sent, checkout redirect message.
- Disabled state: checkout button, admin bulk actions, AI analyze button, add to cart khi out-of-stock hoặc admin.

**Tóm tắt:** Design system hiện tại đủ vật liệu để suy ra một hệ thống tương đối rõ, nhưng implementation đang phân mảnh. Stitch AI nên xem đây là một hệ visual “gần đúng”, không phải source of truth cuối cùng.

---

## 2.4 Component inventory

**Navbar**

- Vị trí xuất hiện: tất cả route public, trừ `/admin/*`.
- Props/variants: desktop, mobile drawer, logged-in, guest, admin/staff, notification dropdown.
- Trạng thái: sticky, active nav, badge count, modal auth gate, mobile open, notification loading.
- Vấn đề hiện tại: chưa có link scanner riêng dù feature AI là differentiator, brand hiển thị `NutriGro` không khớp tên dự án.

**Footer**

- Vị trí xuất hiện: toàn bộ route public.
- Props/variants: không có variant.
- Trạng thái: static.
- Vấn đề hiện tại: content mang tính giới thiệu đồ án, chưa tạo trust signals thương mại điện tử thực tế.

**NutriHeaderHero**

- Vị trí xuất hiện: home.
- Props/variants: `onOpenShop`, `onOpenFreshness`.
- Trạng thái: hover CTA, badge online ping.
- Vấn đề hiện tại: visual ổn nhưng copy và brand chưa thống nhất, chưa nhấn đủ vào AI scanner như core differentiator.

**ProductCardGrid**

- Vị trí xuất hiện: home, shop, favorites.
- Props/variants: `products`, `getBadge`, `addedProductId`, `categoryLabelOverride`, `disableAddToCart`.
- Trạng thái: default, hover lift, low stock, out of stock, added state, favorite toggle.
- Vấn đề hiện tại: card đẹp nhưng trust signals còn ít, CTA add-to-cart đang chỉ là icon nên hơi yếu trên mobile/novice users.

**ProductDetail**

- Vị trí xuất hiện: modal từ home, shop, favorites.
- Props/variants: `productId`, `initialProduct`, `categories`, `onClose`.
- Trạng thái: loading, error, add-to-cart success.
- Vấn đề hiện tại: freshness summary dùng mock fallback, modal dài và đóng vai trò lớn nhưng chưa thực sự premium.

**MarketCategorySidebar**

- Vị trí xuất hiện: shop.
- Props/variants: desktop sidebar, compact mobile pills.
- Trạng thái: active category, expanded category, hover.
- Vấn đề hiện tại: mobile compact chỉ là scroll pills, chưa đủ mạnh nếu danh mục tăng thêm.

**AuthModal**

- Vị trí xuất hiện: navbar protected actions.
- Props/variants: `isOpen`, `onClose`.
- Trạng thái: modal open, focus, close on backdrop/escape.
- Vấn đề hiện tại: chỉ là confirm modal dẫn sang `/auth`, chưa cho login nhanh inline như tên component gợi ý.

**Auth Page**

- Vị trí xuất hiện: `/auth`.
- Props/variants: login, register, forgot password inline.
- Trạng thái: success, error, phone validation, forgot loading.
- Vấn đề hiện tại: chưa có show/hide password, layout khá sạch nhưng hơi “plain form” so với vai trò brand entry.

**Cart Checkout Surface**

- Vị trí xuất hiện: `/cart`.
- Props/variants: empty cart, admin blocked, normal checkout.
- Trạng thái: selected items, partial selected, address loading, new address validation, QR panel, submit loading.
- Vấn đề hiện tại: luồng nhiều bước nhưng tất cả dàn thành một trang dài; địa chỉ inline có thể gây mệt trên mobile.

**Profile Hero + Tabs**

- Vị trí xuất hiện: `/profile`.
- Props/variants: info, addresses, orders.
- Trạng thái: loading profile, loading orders, success/error banner.
- Vấn đề hiện tại: nhiều chức năng dồn vào một page, tab bar chưa sticky, form password và avatar chưa tối ưu UX.

**AddressFormCard**

- Vị trí xuất hiện: profile addresses.
- Props/variants: add, edit.
- Trạng thái: error inline, saving.
- Vấn đề hiện tại: dùng select phụ thuộc tỉnh/huyện/xã, ma sát cao nếu data dài.

**Order Accordion trong Profile**

- Vị trí xuất hiện: profile orders tab.
- Props/variants: pending editable, delivered confirmable, expired, cancelled.
- Trạng thái: expanded, editing, cancel, CTA freshness confirm.
- Vấn đề hiện tại: nhiều information density, cần rõ hơn giữa read-only order summary và editable state.

**ManualFreshnessReview**

- Vị trí xuất hiện: freshness confirm page.
- Props/variants: rating, note, title, description.
- Trạng thái: selected option, note input.
- Vấn đề hiện tại: ổn về cấu trúc nhưng visual còn an toàn, có thể tăng clarity cho decision severity.

**Freshness Confirmation Item Card**

- Vị trí xuất hiện: `/orders/:orderId/confirm-freshness`.
- Props/variants: AI mode, manual mode, OOD, low score, no image, analyzed.
- Trạng thái: upload, preview, analyze loading, AI result, OOD warning, complaint trigger.
- Vấn đề hiện tại: UX dài nếu nhiều item, cần progress mạnh hơn và tối ưu thao tác một tay trên mobile.

**ChatWidget**

- Vị trí xuất hiện: toàn bộ public route.
- Props/variants: open/close, quick actions, assistant/user messages, product suggestions.
- Trạng thái: idle, sending, aborted, busy fallback.
- Vấn đề hiện tại: khá đầy đủ nhưng visual hơi generic chat widget, chưa thể hiện đây là AI commerce assistant chất lượng cao.

**ScannerCard**

- Vị trí xuất hiện: scanner page.
- Props/variants: camera tab, upload tab, feedback panel, result card.
- Trạng thái: request camera, active, error, analyzing, feedback sent, need login, need selection.
- Vấn đề hiện tại: visual đã khác biệt nhưng tách rời app shell, chưa có route thật, typography và CSS token riêng biệt với hệ chung.

**AdminShell**

- Vị trí xuất hiện: toàn bộ admin dashboard.
- Props/variants: desktop expanded, desktop collapsed, mobile drawer.
- Trạng thái: active tab, refresh, mobile open.
- Vấn đề hiện tại: cấu trúc tốt, nhưng nhiều page con vẫn lạm dụng card blocks bên trong.

**OrderManagementPanel**

- Vị trí xuất hiện: admin orders.
- Props/variants: table desktop, card mobile, detail drawer, bulk update.
- Trạng thái: loading, filtering, selected rows, detail loading, delete, update status.
- Vấn đề hiện tại: mạnh về chức năng nhưng khá dày, cần hierarchy tốt hơn cho scanability.

**AIFeedbackPanel**

- Vị trí xuất hiện: admin feedback.
- Props/variants: table desktop, cards mobile, detail drawer.
- Trạng thái: loading, empty, unread/read filter, mark-read loading.
- Vấn đề hiện tại: ổn về thông tin, nhưng có thể tăng khả năng triage nhanh bằng visual severity rõ hơn.

**Tóm tắt:** Shared component set đã khá đầy. Vấn đề của hệ hiện tại nằm ở sự không đồng đều giữa các component mới hơn, dùng token tốt hơn, và các component cũ hơn, dùng class/CSS riêng lẻ.

---

## 2.5 Yêu cầu thiết kế lại cho Stitch AI

### Mục tiêu

- [ ] Làm mới toàn bộ visual identity nhưng vẫn giữ cảm giác tin cậy và tươi sạch.
- [ ] Cải thiện UX của luồng mua hàng và hậu giao hàng.
- [ ] Tăng conversion bằng CTA rõ hơn, trust cues tốt hơn và checkout bớt ma sát.
- [ ] Responsive tốt hơn trên mobile, đặc biệt ở scanner, cart, profile và freshness confirm.

### Giữ lại

- Kiến trúc route hiện tại cho customer và admin.
- Tách riêng admin shell khỏi public shell.
- Home có hero + featured sections + product detail modal.
- Catalog có sidebar lọc desktop và compact mode mobile.
- Luồng checkout một trang với sticky summary.
- Tab profile gồm thông tin, địa chỉ, đơn hàng.
- Luồng freshness confirmation theo từng sản phẩm, có AI và fallback manual.
- Admin chia thành 7 khu vực chuyên biệt.

### Thay đổi

- Thống nhất lại brand: chọn một tên duy nhất giữa `FreshFood AI` và `NutriGro`.
- Thiết lập design tokens duy nhất cho color, type, radius, shadow, dark mode.
- Làm scanner trở thành hành trình first-class, không phải page “ẩn”.
- Product card cần CTA rõ hơn, trust cues mạnh hơn, rating/freshness/review dễ thấy hơn.
- Checkout cần giảm cảm giác dài dòng, gom nhóm tốt hơn giữa giỏ hàng, địa chỉ, thanh toán.
- Profile cần ít “form fatigue” hơn, nhất là tab địa chỉ và tab đơn hàng.
- Freshness confirmation cần progress mạnh, step clarity tốt, complaint flow tối giản.
- Admin cần tăng scanability: summary tốt hơn, spacing gọn hơn, row actions dễ thao tác hơn.
- Loading, empty, error, success state phải có ngôn ngữ minh bạch và nhất quán hơn.

### Hướng visual đề xuất

1. **Fresh trust commerce**
   - Light-first, emerald làm trust color, amber làm accent tiết chế.
   - Ảnh sản phẩm lớn, sạch, nhiều khoảng trắng, UI retail hiện đại.
   - Phù hợp cho homepage, shop, cart, profile.

2. **Scientific freshness assistant**
   - Vẫn light-first cho commerce, nhưng scanner và hậu giao hàng có panel tối và cảm giác thiết bị kiểm định.
   - Dùng contrast cao, gauge, progress và semantic states rất rõ.
   - Phù hợp nếu muốn AI là điểm nhấn rõ ràng nhất.

3. **Premium Vietnamese market tech**
   - Ấm hơn, dùng neutral ngả xanh lá nhẹ và amber có kiểm soát.
   - Typography Việt Nam tốt, tránh cảm giác template SaaS.
   - Phù hợp nếu muốn website vừa gần gũi vừa đáng tin cho thực phẩm gia đình.

### Định hướng cụ thể cho từng khu vực

- Home: hero bớt generic marketplace, tăng “evidence of freshness”.
- Shop: filter bar rõ hơn, active filter gọn hơn, pagination mobile thông minh hơn.
- Auth: thêm nhận diện brand, tăng độ thân thiện, giữ forgot password inline.
- Cart: tách rõ 3 module là cart items, address, payment.
- Profile: chuyển từ “page form lớn” sang “workspace quản lý tài khoản”.
- Freshness confirm: thiết kế như task checklist, có progress và reward rõ.
- Admin: giảm độ mềm mại không cần thiết, tăng density nhưng giữ cảm giác cao cấp.

**Tóm tắt:** Stitch AI nên coi đây là một redesign toàn diện về visual identity và UX orchestration, nhưng không cần phá vỡ information architecture hiện có. Luồng AI freshness phải được đẩy lên vai trò trung tâm.

---

## 2.6 Ghi chú kỹ thuật cho Stitch AI

### Ràng buộc kỹ thuật cần biết

- App dùng `React Router 7`, public shell và admin shell khác nhau.
- Public pages có `Navbar`, `Footer`, `ChatWidget`; admin pages không có.
- State quan trọng sống ở context + localStorage:
  - Auth session
  - Cart theo user
  - Favorites theo user hoặc guest
  - App settings gồm language và theme
- `Scanner.jsx` hiện tồn tại nhưng chưa được mount trong `App.jsx`, cần quyết định route mới hoặc entry mới trong nav.

### API/backend ảnh hưởng trực tiếp đến UI

- Product list, category list và product detail lấy từ backend.
- Cart checkout phụ thuộc delivery profiles và order create API.
- Profile orders cho phép edit/cancel khi `pending`.
- Freshness confirm cần eligibility check trước khi render.
- AI confirm page submit theo `multipart/form-data`, gồm `payload` JSON + ảnh file.
- Scanner upload dùng TFJS client trước, sau đó gọi backend `quick-analyze`.
- Admin orders, users, stock history, feedback đều là paginated endpoints.

### Accessibility requirements

- Giữ hoặc nâng lên chuẩn `WCAG AA`.
- Status không được chỉ dựa vào màu, luôn đi kèm text hoặc icon.
- Touch target tối thiểu 44px cho mobile.
- Modal và drawer phải hỗ trợ focus, escape, backdrop close hợp lý.
- Form cần label thật, không chỉ placeholder.
- Cần xử lý tiếng Việt chuẩn, loại bỏ lỗi encoding trong bản redesign.

### Performance constraints

- Ảnh sản phẩm nên lazy-load, giữ tỷ lệ ổn định để tránh layout shift.
- Scanner dùng camera/video và TFJS, nên UI phải ưu tiên khung nhìn lớn và ít layout reflow.
- Animation nên chủ yếu dùng `transform` và `opacity`.
- Nên tránh quá nhiều shadow nặng hoặc blur lớn trên mobile.
- Admin tables cần responsive bằng overflow ngang thay vì ép co text quá mức.

### Rủi ro thiết kế cần lưu ý

- Nếu giữ quá nhiều emerald ở mọi bề mặt, UI sẽ bị “green-only” và giảm độ cao cấp.
- Nếu redesign scanner quá sci-fi mà tách rời brand commerce, app sẽ có cảm giác là 2 sản phẩm khác nhau.
- Nếu cố đưa toàn bộ logic profile và cart vào card lớn hơn nữa, cognitive load sẽ tăng.

### Khuyến nghị triển khai design system mới

- Dùng một source token duy nhất, ưu tiên semantic roles thay vì gán màu theo từng page.
- Chốt một cặp font chính cho product UI, không để `Be Vietnam Pro`, `Fraunces`, `Manrope`, `Inter` cạnh tranh cùng trọng lượng.
- Chuẩn hóa button system thành primary, secondary, destructive, quiet.
- Chuẩn hóa page templates:
  - marketing-ish commerce page
  - task page
  - admin data page
  - modal/drawer patterns

**Tóm tắt:** Stitch AI cần biết đây là app React vận hành thật, không phải landing page tĩnh. Redesign phải tôn trọng route structure, API states và đặc thù AI upload/camera workflows.

