# Tài liệu chức năng giao diện — FreshFood AI

> Tài liệu này mô tả đầy đủ từng trang và thành phần giao diện của hệ thống, phục vụ mục đích thiết kế lại trong Stitch AI. Designer có thể dựa hoàn toàn vào tài liệu này mà không cần đọc code.

---

## Tổng quan dự án

**Tên dự án:** FreshFood AI — Nền tảng thương mại điện tử thực phẩm tươi sống có AI kiểm tra độ tươi

**Mô tả:** Ứng dụng web bán thực phẩm tươi sống (rau củ, thịt cá, hải sản, trái cây, sữa, gia vị, gạo…). Điểm đặc biệt là tích hợp AI nhận diện độ tươi sản phẩm: người dùng có thể quét ảnh thực phẩm bằng camera hoặc upload ảnh để AI đánh giá chất lượng trước và sau khi mua hàng.

**Công nghệ:**
- Frontend: React 19, React Router 7, Tailwind CSS 4, TensorFlow.js 4, Framer Motion 12, Lucide Icons
- Backend: FastAPI (Python), SQLAlchemy 2, PostgreSQL/SQLite, JWT Auth
- Đa ngôn ngữ: Tiếng Việt / Tiếng Anh (chuyển đổi runtime)
- Hỗ trợ light/dark theme

**Đối tượng người dùng:**
1. **Khách vãng lai (Guest):** Xem sản phẩm, tìm kiếm, dùng Scanner; không thể mua hàng.
2. **Khách hàng đã đăng nhập (Customer):** Mua hàng, đặt hàng, xem lịch sử, xác nhận độ tươi sau giao hàng, yêu thích sản phẩm.
3. **Nhân viên (Staff):** Quản lý đơn hàng, sản phẩm, kho hàng trong Admin Dashboard.
4. **Quản trị viên (Admin):** Toàn quyền: quản lý người dùng, thống kê, AI feedback, cài đặt thanh toán.

---

## Danh sách trang

| # | Tên trang | Route | Mô tả ngắn |
|---|-----------|-------|------------|
| 1 | Trang chủ | `/` | Hero banner + 2 section sản phẩm nổi bật |
| 2 | Danh mục sản phẩm | `/shop` | Catalog đầy đủ với tìm kiếm, lọc, phân trang |
| 3 | Đăng nhập / Đăng ký | `/auth` | Form xác thực tài khoản (login + register + quên mật khẩu) |
| 4 | Giỏ hàng & Thanh toán | `/cart` | Giỏ hàng + chọn địa chỉ + chọn phương thức thanh toán |
| 5 | Hồ sơ cá nhân | `/profile` | 3 tab: Thông tin, Địa chỉ, Đơn hàng |
| 6 | Sản phẩm yêu thích | `/favorites` | Danh sách sản phẩm đã lưu |
| 7 | Máy quét AI | `/scanner` (không có route, mở qua Navbar) | Quét ảnh bằng camera hoặc upload để AI phân tích độ tươi |
| 8 | Xác nhận độ tươi sau giao hàng | `/orders/:orderId/confirm-freshness` | Upload ảnh từng sản phẩm trong đơn để AI/thủ công chấm điểm |
| 9 | Bảng quản trị Admin | `/admin/dashboard` hoặc `/admin/dashboard/:section` | 7 phân mục quản lý toàn hệ thống |

> **Lưu ý:** Ứng dụng không có trang 404 riêng — mọi route không hợp lệ đều redirect về `/`.

---

## Chi tiết từng trang

---

### 1. Trang chủ — `/`

**Mục đích:** Giới thiệu nền tảng, tạo cảm hứng mua sắm, dẫn người dùng vào shop hoặc tính năng AI Scanner.

**Chức năng chính:**
- Hiển thị Hero Banner với CTA: "Vào cửa hàng" và "Xem xét hậu giao hàng"
- Section "Chương trình nổi bật" (tuần lá xanh / mua 2 tặng 1): hiển thị tối đa 8 sản phẩm đầu tiên từ API, có promotion badge
- Section "Lựa chọn tươi mới" (bữa ăn gia đình): hiển thị sản phẩm từ index 4–12, badge "Tươi hôm nay" mỗi 3 sản phẩm
- Click "Xem tất cả" trong chương trình nổi bật → chuyển đến `/shop?q=mua 2 tặng 1`
- Click "Vào cửa hàng" → chuyển đến `/shop`
- Thêm sản phẩm vào giỏ hàng trực tiếp từ product card
- Click vào sản phẩm → mở modal ProductDetail (nếu là sản phẩm thật, không phải fallback)
- Fallback: nếu API lỗi, hiển thị 8 sản phẩm mẫu hardcoded (ảnh từ Unsplash)

**Thành phần UI:**
- **NutriHeaderHero (Hero Section):** Layout 2 cột (text trái / ảnh phải). Gradient nền emerald–white–lime. Ảnh thực phẩm hữu cơ phủ toàn bộ cột phải. Text: badge "Đang hoạt động" (nhấp nháy), headline lớn, mô tả, 3 feature badge (Hữu cơ 100%, Giao trong 2h, AI hậu giao hàng), 2 nút CTA chính.
- **Section "Chương trình nổi bật":** Nền vàng amber-50, border amber. Header row có label tag + tiêu đề + nút "Xem tất cả" (nền đen). Grid sản phẩm 4 cột (responsive xuống 2 cột mobile).
- **Section "Lựa chọn tươi mới":** Nền trắng nhạt, border emerald. Header row có label tag emerald + tiêu đề + link "Vào cửa hàng" (border emerald). Grid sản phẩm tương tự.
- **ProductCardGrid (dùng chung):** Mỗi card có: ảnh sản phẩm, badge khuyến mãi (góc trên trái), tên, danh mục, giá, rating, nút "Thêm vào giỏ" (xanh → tick sau 1.6s).
- **ProductDetail Modal:** Overlay mờ nền, card giữa màn hình với chi tiết sản phẩm đầy đủ, nút đóng.
- **ChatWidget:** Nút chat nổi góc dưới phải (floating button), mở panel chatbot AI.

**Luồng điều hướng:**
- Vào từ: URL trực tiếp, click logo Navbar, click "Trang chủ" Navbar
- Đi đến: `/shop` (nhiều CTA), `/auth` (nếu chưa đăng nhập và click "Xem xét hậu giao hàng"), `/profile?tab=orders` (nếu đã đăng nhập và click "Xem xét hậu giao hàng")

**Dữ liệu / trạng thái:**
- `products[]`: tải từ API `GET /api/products`, fallback sang hardcoded nếu lỗi
- `loading`: spinner text "Đang tải sản phẩm..." trong khi fetch
- `addedToCart`: ID sản phẩm vừa thêm vào giỏ (để hiện tick xanh 1.6 giây)
- `selectedProductDetail`: ID sản phẩm đang xem chi tiết (null = đóng modal)

**Ghi chú thiết kế lại:**
> - Hero Section cần nổi bật nhất, chiếm viewport đầy đủ trên desktop.
> - 2 section sản phẩm bên dưới cần phân biệt màu sắc rõ ràng (vàng vs trắng).
> - Product card: đảm bảo nút "Thêm vào giỏ" dễ thao tác trên mobile (min touch area 44px).
> - Animation: nút CTA hover có micro-animation nhẹ (translateY -2px).
> - ChatWidget không được che khuất nội dung chính; nên đặt cố định bottom-right với z-index cao.

---

### 2. Danh mục sản phẩm — `/shop`

**Mục đích:** Cho phép người dùng tìm kiếm và lọc toàn bộ danh mục sản phẩm, xem và thêm vào giỏ hàng.

**Chức năng chính:**
- Hiển thị tất cả sản phẩm với phân trang (12 sản phẩm/trang)
- Tìm kiếm theo từ khóa (tên, danh mục, mô tả) — cập nhật URL query `?q=...`
- Lọc theo nhóm danh mục sidebar (`?group=...`) — sidebar trái desktop / compact bar top mobile
- Lọc theo danh mục dữ liệu (dropdown select)
- Sắp xếp: Mặc định / Giá thấp–cao / Giá cao–thấp / Đánh giá cao nhất / Tên A–Z
- Quick deals tags: click để điền từ khóa và tìm kiếm nhanh (ví dụ: "Mua 2 tặng 1", "Flash sale", "Hữu cơ"…)
- Gợi ý tìm kiếm smart (4 gợi ý): tương tự quick deals nhưng gợi ý nguyên liệu/thực phẩm
- Hiển thị filter tag active (badge nhóm đang chọn / từ khóa / danh mục dữ liệu)
- Nút "Xóa bộ lọc" (X) reset toàn bộ về mặc định
- Thêm vào giỏ từ product card
- Click vào sản phẩm → mở modal ProductDetail (có thêm thông tin chi tiết + danh mục)
- Tự động chuyển về trang 1 khi thay đổi bất kỳ filter nào
- Pagination: hiển thị tối đa 5 trang gần nhất (ellipsis "..." ở giữa nếu nhiều trang)
- Real-time sync: lắng nghe event `PRODUCT_SYNC_EVENT` từ Admin (thêm/xóa/cập nhật sản phẩm tức thời)

**Thành phần UI:**
- **Breadcrumb:** "Trang chủ > Danh mục sản phẩm" (top trái)
- **MarketCategorySidebar (Desktop, 300px):** Danh sách nhóm danh mục dạng vertical menu (Thịt & Hải sản, Rau củ, Trái cây, Sữa…). Mỗi nhóm có icon + label. Click để filter. Sidebar bên trái cố định.
- **MarketCategorySidebar (Mobile, compact):** Hiển thị ngang trên cùng vùng main, dạng horizontal scroll hoặc dropdown.
- **Filter bar (bên phải sidebar):** Card trắng với 4 control trên 1 hàng (responsive xuống 2 cột tablet, 1 cột mobile):
  - Input tìm kiếm với icon Search
  - Select "Danh mục dữ liệu"
  - Select "Sắp xếp"
  - Nút "Lọc" (primary) + Nút X (reset)
- **Quick tags row:** "Gợi ý:" + các pill tag (emerald border) cho quick deals + pill tag (slate border) cho smart suggestions
- **Active filter badges:** Hiển thị nhóm đang chọn, từ khóa, danh mục dữ liệu đang filter (pill badge màu tương ứng)
- **Count badge:** "X sản phẩm phù hợp" (background amber)
- **ProductCardGrid:** Grid 4 cột (desktop), 2 cột (tablet/mobile)
- **Pagination controls:** Prev | 1 | 2 | ... | n | Next (nút bấm hình vuông/rounded)
- **Empty state:** Card trắng giữa trang — icon + tiêu đề "Không có sản phẩm phù hợp" + mô tả + nút "Hiện tất cả sản phẩm"
- **Error banner:** Strip rose-50 phía trên kết quả nếu API lỗi

**Luồng điều hướng:**
- Vào từ: Navbar "Cửa hàng", link từ Home, link từ Quick Deals, tìm kiếm trong Navbar
- Đi đến: ProductDetail Modal (overlay), `/cart` (sau khi thêm giỏ), `/auth` (nếu cần đăng nhập)

**Dữ liệu / trạng thái:**
- `products[]`: toàn bộ sản phẩm từ API
- `categories[]`: danh mục từ API để build categoryDirectory
- `searchQuery`, `selectedCategoryId`, `dataCategoryId`, `sortBy`: filter state (đồng bộ với URL)
- `currentPage`: trang hiện tại (reset về 1 khi đổi filter)
- `filteredProducts[]`: sản phẩm sau khi lọc (client-side)
- `paginatedProducts[]`: 12 sản phẩm của trang hiện tại

**Ghi chú thiết kế lại:**
> - Layout 2 cột (sidebar 300px + main) cần giữ nguyên trên desktop.
> - Mobile: sidebar ẩn đi, thay bằng horizontal scroll category chips hoặc drawer.
> - Filter bar trên main cần compact ở mobile — xếp thành 2 hàng.
> - Quick tags row dễ bị chật trên mobile — cho phép scroll ngang.
> - Pagination: trên mobile chỉ cần Prev / Current / Next thay vì liệt kê đầy đủ.
> - Số sản phẩm tìm thấy nên được đặt gần heading, không quá xa filter.

---

### 3. Đăng nhập / Đăng ký — `/auth`

**Mục đích:** Xác thực người dùng — đăng nhập, tạo tài khoản mới, hoặc yêu cầu đặt lại mật khẩu.

**Chức năng chính:**
- **Tab Đăng nhập (mặc định):**
  - Nhập username + password
  - Link "Quên mật khẩu?" → hiển thị form quên mật khẩu inline bên dưới
  - Submit → gọi API login → redirect về trang đã cố truy cập trước đó (hoặc về `/`)
- **Tab Đăng ký:**
  - Nhập: username, họ tên, email, số điện thoại (10 số, bắt đầu 0), password
  - Validation số điện thoại real-time (chỉ cho nhập số, tối đa 10 ký tự)
  - Submit thành công → hiển thị thông báo success + tự chuyển về tab đăng nhập
- **Form quên mật khẩu (inline, trong tab Đăng nhập):**
  - Nhập email → submit → API gửi email reset → hiển thị message "Nếu email tồn tại, link đã được gửi"
  - Form xuất hiện bên dưới nút đăng nhập khi click "Quên mật khẩu?"
- Chuyển đổi giữa Đăng nhập ↔ Đăng ký qua link phía dưới form
- Hiển thị message lỗi (rose) hoặc thành công (emerald) dạng banner trên đầu form

**Thành phần UI:**
- **Layout:** Trang toàn màn hình với card xác thực căn giữa (max-width ~480px). Không có Navbar/Footer.
- **Auth card:** Bo góc lớn, shadow nhẹ. Nền trắng.
- **Header card:** Tiêu đề (lớn, đậm) + mô tả nhỏ — thay đổi theo mode login/register.
- **Message banner:** Strip màu (rose/emerald) full-width trong card.
- **Form fields:** Các input với label trên, placeholder, border xanh khi focus, border đỏ khi lỗi.
- **Phone field (register only):** Tự động xóa ký tự không phải số, giới hạn 10 ký tự. Hiện error inline phía dưới input.
- **Nút CTA chính:** Full-width, primary button (emerald).
- **"Quên mật khẩu?" link:** Text-only button căn phải, bên trên nút submit.
- **Forgot password form:** Sub-card (slate-50, border slate) inline bên dưới nút submit, chỉ hiện khi click "Quên mật khẩu?". Có email input + nút "Gửi yêu cầu".
- **Auth footer:** Text "Chưa có tài khoản?" / "Đã có tài khoản?" + link chuyển mode.

**Luồng điều hướng:**
- Vào từ: Click icon User trên Navbar khi chưa đăng nhập, Protected route redirect, AuthModal
- Đi đến: Sau login thành công → redirect về `location.state.from` hoặc `/`; Sau register thành công → ở lại trang, chuyển về tab login

**Dữ liệu / trạng thái:**
- `isLogin`: boolean toggle giữa login/register mode
- `showForgotPassword`: boolean hiện/ẩn forgot password sub-form
- `formData`: { username, email, password, name, phone }
- `message`: { type: 'success'|'error', text: string } — banner thông báo
- `phoneError`: lỗi validation SĐT real-time
- `forgotEmail`, `forgotLoading`: state riêng cho form quên MK

**Ghi chú thiết kế lại:**
> - Card nên chiếm 100% width trên mobile, max 480px trên desktop, căn giữa màn hình.
> - Nên thêm logo/brand phía trên card để tăng nhận diện thương hiệu.
> - Forgot password form inline (không dùng modal/route riêng) là quyết định UX tốt — giữ lại.
> - Đảm bảo input password có toggle show/hide (hiện tại chưa có).
> - Form register dài hơn (5 field) — cân nhắc 2 cột cho name + phone trên tablet.
> - Background trang auth có thể thêm pattern/gradient để không bị trắng trơn.

---

### 4. Giỏ hàng & Thanh toán — `/cart`

**Mục đích:** Cho phép khách hàng xem giỏ hàng, chọn sản phẩm để thanh toán, chọn địa chỉ giao hàng và phương thức thanh toán, rồi đặt hàng.

**Chức năng chính:**
- **Quản lý giỏ hàng:**
  - Xem danh sách tất cả sản phẩm trong giỏ
  - Chọn/bỏ chọn từng sản phẩm (checkbox) để tính tiền riêng
  - "Chọn tất cả" / "Bỏ chọn tất cả" (checkbox indeterminate khi chọn một phần)
  - Tăng/giảm số lượng từng sản phẩm (nút +/-)
  - Xóa từng sản phẩm khỏi giỏ (nút "Xóa")
  - Xóa toàn bộ giỏ (nút "Xóa tất cả" với icon thùng rác đỏ)
  - Sản phẩm không được chọn hiện grayscale + opacity thấp
  - Số lượng hiển thị badge xanh trên góc ảnh sản phẩm
- **Địa chỉ giao hàng:**
  - Tự động tải danh sách địa chỉ đã lưu khi vào trang
  - Chọn địa chỉ mặc định tự động (hoặc địa chỉ đầu tiên)
  - Xem địa chỉ đang chọn (card xanh): tên, SĐT, địa chỉ, badge "Mặc định"
  - Đổi địa chỉ: nếu có nhiều hơn 1 → hiện danh sách để chọn
  - Thêm địa chỉ mới: inline form (họ tên, SĐT, địa chỉ, tỉnh/thành phố, checkbox "Mặc định")
  - Validation địa chỉ mới: họ tên, SĐT (regex Việt Nam), địa chỉ, tỉnh/thành bắt buộc
- **Phương thức thanh toán:**
  - COD — Tiền mặt khi nhận hàng (mặc định)
  - QR Code — Quét mã QR ngân hàng (khi chọn: hiện ảnh QR + số tiền + nội dung chuyển khoản)
  - Mỗi option là card clickable có radio-like selection
- **Tổng đơn hàng (sticky aside):**
  - Tạm tính (theo sản phẩm đã chọn)
  - Phí ship: miễn phí nếu đơn > 500.000đ, ngược lại 30.000đ
  - Tổng cộng (màu emerald lớn)
  - Tóm tắt địa chỉ + phương thức thanh toán đang chọn
  - Nút "Tiến hành đặt hàng" / "Đặt X sản phẩm đã chọn" (disable nếu chưa chọn sản phẩm hoặc chưa có địa chỉ)
- **Đặt hàng thành công:** Xóa các sản phẩm đã chọn khỏi giỏ (giữ lại sản phẩm chưa chọn), redirect sang `/profile?tab=orders` với success message

**Guard states:**
- Admin đăng nhập → hiển thị màn hình "Admin không thể mua hàng" + nút "Đến trang quản trị"
- Giỏ trống → hiển thị màn hình "Giỏ hàng đang trống" + nút "Quay lại cửa hàng"

**Thành phần UI:**
- **Layout 2 cột (desktop):** Cột trái chiếm phần lớn (danh sách + địa chỉ + thanh toán), cột phải sticky (tổng đơn hàng, max 400px)
- **Danh sách sản phẩm card:** Rounded-3xl, shadow lớn. Header: checkbox chọn tất cả + badge đã chọn + nút "Xóa tất cả". Mỗi item: layout 3 cột (checkbox + ảnh + thông tin), kẻ ngang giữa các item.
- **Item sản phẩm:** Ảnh vuông 104×104 + badge số lượng góc phải trên. Tên sản phẩm (truncate), danh mục, đơn giá. Control số lượng: nút -, số, nút +. Tổng giá item + nút "Xóa" (text rose).
- **Địa chỉ giao hàng card:** Card địa chỉ đang chọn (emerald border, bg-emerald-50), danh sách chọn địa chỉ (list các card bo bo), form thêm mới (sub-card slate).
- **Thanh toán card:** 2 option card (COD và QR) với icon + tiêu đề + mô tả. Radio circle góc phải.
- **QR panel:** Hiển thị khi chọn QR — ảnh QR (vietqr.io) + hướng dẫn + số tiền.
- **Tổng đơn hàng card:** Nền emerald-50, shadow emerald. Breakdown tạm tính / ship / tổng. Summary chip địa chỉ + phương thức. Nút "Đặt hàng" full-width.
- **Empty state (giỏ trống):** Card trắng căn giữa, icon ShoppingCart, text, nút quay lại shop.
- **Admin guard state:** Card trắng căn giữa, icon ShieldCheck, text, nút đến quản trị.

**Luồng điều hướng:**
- Vào từ: Navbar icon giỏ hàng (chỉ khi đã đăng nhập), ProtectedRoute redirect
- Đi đến: `/auth` (nếu mất session), `/profile?tab=orders` (sau đặt hàng thành công), `/shop` (link "Tiếp tục mua hàng" + nút từ empty state)

**Dữ liệu / trạng thái:**
- `cartItems[]`: từ CartContext (localStorage)
- `selectedIds`: Set<id> các sản phẩm đã chọn để thanh toán
- `profiles[]`: danh sách địa chỉ từ API
- `selectedProfileId`: địa chỉ đang chọn
- `paymentMethod`: 'cod' | 'qr'
- `subtotal`, `shippingFee`, `finalTotal`: tính toán từ selectedItems
- `loading`: khi đang gọi API tạo đơn

**Ghi chú thiết kế lại:**
> - Aside "Tổng đơn hàng" cần sticky và luôn visible trên desktop; trên mobile đặt cuối trang (fixed bottom bar hoặc scroll xuống).
> - Phần chọn sản phẩm (checkbox) là UX khá phức tạp — cần visual rõ ràng: sản phẩm không chọn nên dim/grayscale mạnh hơn.
> - Inline form thêm địa chỉ mới nên dùng accordion hoặc modal thay vì expand inline để tránh trang quá dài.
> - QR code panel nên hiển thị ngay gần nút "Đặt hàng" để người dùng tiện quét.
> - Cần loading skeleton khi tải địa chỉ ban đầu thay vì chỉ text "Đang tải địa chỉ...".

---

### 5. Hồ sơ cá nhân — `/profile`

**Mục đích:** Cho phép người dùng xem và chỉnh sửa thông tin cá nhân, quản lý địa chỉ, xem và theo dõi đơn hàng.

**Chức năng chính — 3 tab:**

#### Tab 1: Thông tin cá nhân (`info`)
- **Avatar:** Hiển thị ảnh đại diện (preview local trước khi lưu). Click nút camera → chọn file ảnh → preview ngay, lưu khi submit. Nếu chưa có ảnh: hiển thị chữ cái đầu tên (initial letter avatar).
- **Thông tin hệ thống (readonly):** Username, Email — có icon khóa, không thể chỉnh
- **Form chỉnh sửa:** Họ tên, số điện thoại, giới thiệu bản thân, giới tính (dropdown), ngày sinh (date picker)
- **Validation SĐT:** Regex Việt Nam, inline error
- **Lưu thông tin:** Nút "Lưu thay đổi" — gọi API updateUserProfile (gửi kèm avatar nếu có)
- **Đổi mật khẩu (sub-section trong tab info):**
  - 3 field: Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới
  - Validation: mật khẩu mới ≠ xác nhận → error
  - Nút "Đổi mật khẩu"

#### Tab 2: Địa chỉ giao hàng (`addresses`)
- Xem danh sách địa chỉ đã lưu (card)
- Mỗi địa chỉ: tên, SĐT, địa chỉ đầy đủ (đường + phường/xã + quận/huyện + tỉnh/thành), badge "Mặc định"
- **Thêm địa chỉ mới:** form inline (họ tên, SĐT, địa chỉ, tỉnh/thành, quận/huyện, phường/xã — chọn từ dropdown Vietnam địa danh)
- **Chỉnh sửa địa chỉ:** Click icon edit → form inline điền sẵn
- **Xóa địa chỉ:** Nút xóa với confirm
- **Đặt mặc định:** Click "Đặt làm mặc định"
- Dropdown tỉnh/thành → quận/huyện → phường/xã (data từ `vnLocations.js` và `vnWards.js` — dữ liệu Việt Nam đầy đủ)

#### Tab 3: Đơn hàng của tôi (`orders`)
- Danh sách tất cả đơn hàng, mỗi đơn có:
  - Header: mã đơn (order_number), ngày đặt, trạng thái (badge màu), payment method
  - Tóm tắt: địa chỉ giao, SĐT
  - Nút "Xem chi tiết" → expand accordion hiển thị danh sách sản phẩm trong đơn (ảnh, tên, số lượng, giá)
  - **Nút "Xác nhận độ tươi"** (chỉ hiện khi đơn đã được giao - status `delivered`): link đến `/orders/:id/confirm-freshness`
  - **Nút "Chỉnh sửa đơn"** (chỉ khi status `pending`): mở inline form chỉnh địa chỉ, SĐT, phương thức thanh toán, ghi chú
  - **Nút "Hủy đơn"** (chỉ khi status `pending`): confirm dialog → gọi API hủy
  - Badge "Đang chờ chỉnh sửa" khi mở form edit đơn
- **Bộ đếm:** "X đơn đang chờ xử lý" trong header tab

**Status colors:**
- `pending` → amber (đang chờ)
- `confirmed` → sky (đã xác nhận)
- `shipped` → indigo (đang giao)
- `delivered` → emerald (đã giao)
- `cancelled` → rose (đã hủy)
- `returned` → slate (đã trả)

**Thành phần UI:**
- **Profile header (top card):** Avatar tròn (80px) với nút camera overlay, tên hiển thị + username/email. Nếu chưa có ảnh: initial letter avatar màu emerald.
- **3 tab navigation:** Dạng tab button (Info / Địa chỉ / Đơn hàng) — icon + label, active highlight.
- **Message banner:** Hiển thị success/error message toàn trang (ví dụ: "Đặt hàng thành công! Mã đơn: #123").
- **Tab Info:** 2 section — form thông tin + sub-section đổi mật khẩu. Grid 2 cột trên desktop, 1 cột mobile.
- **Tab Địa chỉ:** Danh sách card địa chỉ vertical + form thêm/sửa inline expand. Dropdown tỉnh/huyện/xã liên kết nhau.
- **Tab Đơn hàng:** Danh sách accordion. Mỗi đơn: card với header + nội dung collapsible. Badge status màu sắc.
- **Order detail accordion:** Bảng mini sản phẩm (ảnh, tên, số lượng × giá = thành tiền) + tổng đơn.

**Luồng điều hướng:**
- Vào từ: Navbar user menu → "Hồ sơ", redirect sau đặt hàng thành công (với `state.tab = 'orders'` và `state.successMessage`)
- Đi đến: `/orders/:id/confirm-freshness` (từ nút Xác nhận độ tươi)

**Dữ liệu / trạng thái:**
- `profile`: data từ API `GET /api/auth/profile`
- `profileForm`: form state đang chỉnh
- `orders[]`: từ API `GET /api/orders`
- `addresses[]`: từ API `GET /api/delivery_profiles`
- `expandedOrderId`: ID đơn hàng đang mở accordion
- `editingOrderId`: ID đơn đang mở form chỉnh sửa
- `editingAddressId`: ID địa chỉ đang chỉnh sửa
- `avatarPreview`: data URL ảnh chọn từ file (chưa lưu)

**Ghi chú thiết kế lại:**
> - Profile header nên có vùng ảnh đủ lớn và nút upload rõ ràng (nhiều user không biết click vào ảnh).
> - Tab navigation nên sticky khi scroll để dễ chuyển tab trên trang dài.
> - Đơn hàng accordion cần padding dư rộng, dễ click trên mobile.
> - Badge status màu sắc cần đủ tương phản để accessible.
> - Form đổi mật khẩu nên có toggle show/hide password.
> - Dropdown tỉnh/huyện/xã là UX điểm yếu — cân nhắc search-select thay vì `<select>` thuần.
> - Trên mobile, nên có "pull to refresh" hoặc nút tải lại đơn hàng.

---

### 6. Sản phẩm yêu thích — `/favorites`

**Mục đích:** Hiển thị danh sách sản phẩm mà người dùng đã lưu (heart) từ trước. Truy cập được kể cả khi chưa đăng nhập (lưu trong localStorage).

**Chức năng chính:**
- Tải danh sách toàn bộ sản phẩm từ API, lọc theo `favoriteIds` từ FavoritesContext
- Hiển thị số lượng sản phẩm yêu thích đã lưu
- Click vào sản phẩm → mở modal ProductDetail
- Thêm vào giỏ hàng từ card
- Bỏ yêu thích: click icon tim trên card → xóa khỏi danh sách (qua FavoritesContext)
- Trạng thái trống: hiển thị empty state với hướng dẫn

**Thành phần UI:**
- **Header section:** Label "Cá nhân", tiêu đề "Sản phẩm yêu thích", text "Đã lưu X sản phẩm"
- **ProductCardGrid:** Tương tự các trang khác (4 cột desktop, 2 cột mobile). Mỗi card hiển thị icon tim đỏ filled (đã yêu thích).
- **Empty state:** Khi không có sản phẩm yêu thích nào — icon HeartOff + text hướng dẫn + nút "Khám phá sản phẩm" → `/shop`
- **Loading state:** Text "Đang tải sản phẩm..." trong card

**Luồng điều hướng:**
- Vào từ: Navbar icon Heart
- Đi đến: `/shop` (từ empty state), ProductDetail modal

**Dữ liệu / trạng thái:**
- `favoriteIds[]`: từ FavoritesContext (localStorage, persist cross-session)
- `products[]`: tất cả sản phẩm từ API để match với favoriteIds
- `favoriteProducts[]`: sản phẩm filter theo favoriteIds (computed)
- `loading`: boolean

**Ghi chú thiết kế lại:**
> - Trang này khá đơn giản — cơ hội để thêm grouping theo danh mục.
> - Nên thêm tính năng "Xóa tất cả yêu thích" ở header.
> - Cân nhắc hiển thị ngày lưu sản phẩm nếu muốn giống wishlist thương mại điện tử thực sự.
> - Empty state cần có illustration/ảnh để tăng tính thẩm mỹ.

---

### 7. Máy quét AI độ tươi — `/scanner` (không có route riêng — mở qua Scanner page)

> **Lưu ý:** Trong code hiện tại, `Scanner.jsx` là page nhưng không có route được khai báo trong `App.jsx`. Tính năng này có thể được mở qua Navbar item hoặc link embed. Cần xác nhận lại route chính xác khi triển khai.

**Mục đích:** Cho phép người dùng quét ảnh thực phẩm (camera trực tiếp hoặc upload file) để AI phân tích độ tươi theo thời gian thực.

**Chức năng chính:**
- **2 mode input:**
  - **Camera:** Mở webcam, chụp frame liên tục → TensorFlow.js predict trên browser (real-time)
  - **Upload ảnh:** Chọn file từ thiết bị → TensorFlow.js predict 1 lần
- **Phase 1 — Client AI (TensorFlow.js):** Tải model TFJS từ `/public/tfjs_model/model.json`. Phân loại ảnh → predict nhãn (fresh_chicken, spoiled_fish, rotten_apple…) + confidence %.
- **Phase 2 — Backend AI:** Gửi kết quả lên API `/api/scans` → backend trả về: freshness_level (fresh/good/moderate/expiring), spoilage_ratio_pct, quality_assessment, needs_manual_review.
- **Hiển thị kết quả:**
  - Tên thực phẩm (tiếng Việt): Thịt, Cá, Táo, Chuối…
  - Trạng thái: "Tươi ngon" (xanh) / "Còn tốt" (xanh nhạt) / "Cần dùng sớm" (vàng) / "Nguy cơ hỏng cao" (đỏ) / "Cần duyệt" (cam)
  - Confidence % (từ TF.js)
  - Tỷ lệ hỏng % (từ backend)
  - Chi tiết đánh giá chất lượng
- **Gửi feedback:** Người dùng xác nhận dự đoán đúng/sai → gọi API `submitScannerFeedback`. Nếu sai → chọn nhãn đúng.
- **Out-of-Distribution (OOD) detection:** Backend phát hiện ảnh không phải thực phẩm → hiển thị cảnh báo đặc biệt.
- **Uncertain detection:** Khi confidence thấp → hiện badge "Cần duyệt thủ công".

**Thành phần UI (ScannerCard):**
- **Camera preview:** Video element full-width trong card, nút chụp ảnh.
- **Upload button:** Input file ẩn + nút "Tải ảnh lên" styled.
- **Result panel:** Hiển thị kết quả phân tích với màu sắc theo trạng thái.
  - Freshness meter: progress bar hoặc gauge % độ tươi
  - Confidence indicator
  - Tên thực phẩm + trạng thái lớn
  - Breakdown chi tiết (spoilage areas, quality scores)
- **Feedback section:** "Kết quả này có chính xác không?" + 2 nút (Đúng / Sai). Nếu Sai: dropdown chọn nhãn đúng.
- **Loading states:** "Đang nạp AI...", "Đang phân tích...", spinner.

**Luồng điều hướng:**
- Vào từ: Navbar / CTA trên Home
- Đi đến: Không điều hướng đi đâu — kết quả hiển thị tại chỗ

**Dữ liệu / trạng thái:**
- `result`: object kết quả phân tích (foodName, status, confidence, color, spoilageRatioPct, qualityAssessment…)
- Model loading state: 'loading' → 'ready' → 'predicting'
- Feedback state: 'idle' → 'confirmed' / 'corrected'

**Ghi chú thiết kế lại:**
> - Đây là tính năng độc đáo nhất của app — cần thiết kế ấn tượng, sci-fi/tech feel.
> - Camera preview cần là focal point của trang, chiếm phần lớn màn hình.
> - Result panel nên animate vào sau khi có kết quả (slide-up hoặc fade).
> - Màu sắc result cần rất rõ ràng: xanh = ổn, đỏ = nguy hiểm.
> - Trên mobile (camera chính), UX cần một tay dùng được: nút chụp to, dễ với ngón cái.
> - Cân nhắc tách màn hình: 1 màn = camera/upload, màn sau = kết quả.

---

### 8. Xác nhận độ tươi sau giao hàng — `/orders/:orderId/confirm-freshness`

**Mục đích:** Sau khi nhận đơn hàng đã giao (`delivered`), người dùng upload ảnh từng sản phẩm để AI đánh giá độ tươi. Nếu phát hiện hỏng, có thể yêu cầu đổi/hoàn hàng.

**Chức năng chính:**
- **Kiểm tra eligibility:** Gọi API để xác minh đơn hàng có thể xác nhận độ tươi không (đã giao, chưa xác nhận).
- **Danh sách sản phẩm trong đơn:** Mỗi sản phẩm là 1 card riêng với:
  - Tên sản phẩm + số lượng
  - Badge "AI hỗ trợ" hoặc "Đánh giá thủ công"
  - **Mode AI (sản phẩm được AI hỗ trợ):**
    - Upload ảnh hoặc chụp camera
    - Preview ảnh đã chọn
    - Nút "Phân tích" → gọi AI (TF.js) → hiển thị kết quả (freshness level, confidence, spoilage %)
    - OOD detection: nếu ảnh không phải sản phẩm đó → cảnh báo
    - Có thể upload lại ảnh khác
  - **Mode thủ công (sản phẩm không có AI support):**
    - Chọn rating (1–5 sao hoặc enum)
    - Nhập ghi chú tùy chọn
- **Submit toàn bộ:** Nút "Xác nhận độ tươi" — gửi kết quả của tất cả sản phẩm lên API cùng lúc
  - Nút disable cho đến khi tất cả sản phẩm đủ điều kiện (có ảnh + kết quả AI, hoặc có rating thủ công)
- **Khiếu nại (Complaint):**
  - Sau khi có kết quả phân tích, nếu có sản phẩm hỏng → hiển thị nút "Yêu cầu đổi/hoàn hàng"
  - Mở form complaint: chọn loại (Hoàn tiền / Đổi hàng)
  - Gọi API `createFreshnessComplaint`
- **Loyalty points reward:** Sau khi submit thành công → API trả về điểm thưởng → hiển thị notification

**Thành phần UI:**
- **Page header:** Tiêu đề "Xác nhận độ tươi đơn #XXX", link quay lại profile
- **Mỗi sản phẩm — card riêng:**
  - Header card: tên sản phẩm + số lượng + badge mode (AI / Thủ công)
  - Upload zone: Dropzone ảnh hoặc nút "Chụp ảnh" / "Tải ảnh"
  - Preview ảnh (khi đã chọn)
  - Kết quả AI: status badge màu + confidence + spoilage % + nút phân tích lại
  - OOD warning: alert amber nếu ảnh không nhận ra
  - ManualFreshnessReview component: star rating + textarea
- **Nút submit toàn trang:** Full-width bottom, disable + counter "Còn X sản phẩm cần hoàn thành"
- **Complaint modal/section:** Sau submit, hiện form complaint nếu cần
- **Success state:** Banner emerald + điểm thưởng earned

**Luồng điều hướng:**
- Vào từ: Nút "Xác nhận độ tươi" trong tab Đơn hàng của Profile (chỉ đơn `delivered`)
- Đi đến: Sau submit thành công → redirect về `/profile?tab=orders`

**Dữ liệu / trạng thái:**
- `orderId`: từ URL params
- `items[]`: danh sách sản phẩm trong đơn (từ API eligibility check)
- Mỗi item có state riêng: file, previewUrl, aiResult, oodResult, aiError, analyzing, manualRating, manualNote, reviewMode
- `submitting`: boolean khi gọi API submit
- Complaint state: type, loading, success

**Ghi chú thiết kế lại:**
> - Trang này rất dài nếu đơn có nhiều sản phẩm — cần scroll tốt, card sản phẩm đủ spacious.
> - Progress indicator "X/Y sản phẩm đã hoàn thành" giúp user biết mình đang ở đâu.
> - Upload zone cần support cả file browser lẫn camera (mobile).
> - Kết quả AI cho từng sản phẩm cần hiển thị trực quan, không chỉ text.
> - Complaint flow cần minimal friction — không nên quá nhiều bước.
> - Mobile-first vì người dùng thường làm ngay sau khi nhận hàng (trên điện thoại).

---

### 9. Bảng quản trị Admin — `/admin/dashboard` hoặc `/admin/dashboard/:section`

**Mục đích:** Giao diện quản trị toàn hệ thống dành cho Admin và Staff. Có 7 phân mục khác nhau.

> **Phân quyền:** Admin truy cập được tất cả 7 tab. Staff chỉ được: Đơn hàng, Sản phẩm, Kho hàng.

**Thành phần UI chung (AdminShell):**
- **Layout:** Sidebar trái cố định (không có Navbar/Footer công khai). Body: scrollable main content bên phải.
- **Sidebar:** Logo thương hiệu + 7 tab navigation (icon + label). Active tab highlighted. User info + logout button dưới cùng.
- **Header mỗi tab:** Tiêu đề lớn + subtitle mô tả phân mục.

---

#### Tab 1: Tổng quan (`overview`) — Admin only

**Chức năng:**
- Hiển thị KPI thống kê: Doanh thu tổng, Số đơn hàng, Sản phẩm sắp hết hàng, AI feedback chưa đọc
- Mỗi KPI là card với con số lớn + label + icon

**Dữ liệu:** Từ API `GET /api/admin/stats`

---

#### Tab 2: Người dùng (`users`) — Admin only

**Chức năng:**
- Danh sách người dùng phân trang (8 user/trang)
- Tìm kiếm nhanh theo tên/email
- Xem: username, email, role, ngày tạo, trạng thái
- **Thay đổi role:** Dropdown chọn role (customer / staff / moderator / manager / admin) + confirm
- **Xóa người dùng:** Nút xóa + confirm dialog

**Thành phần UI:**
- Ô tìm kiếm text + pagination controls
- Bảng (hoặc card list) người dùng với các action button
- Dropdown role với icon từng role

---

#### Tab 3: Đơn hàng (`orders`) — Admin & Staff

**Chức năng:**
- Xem tất cả đơn hàng với filter theo trạng thái / ngày
- Cập nhật trạng thái đơn hàng (pending → confirmed → shipped → delivered / cancelled / returned)
- Xem chi tiết đơn: sản phẩm, địa chỉ, tổng tiền
- Xem thông tin freshness confirmation (nếu có)

**Component:** `OrderManagementPanel` — component riêng

---

#### Tab 4: Sản phẩm (`products`) — Admin & Staff

**Chức năng:**
- Danh sách sản phẩm với search, filter theo danh mục, phân trang (8/trang)
- Xem thông tin: tên, SKU, giá, tồn kho, trạng thái, danh mục, AI support
- **Chỉnh sửa sản phẩm:** Form inline/modal với đầy đủ fields (tên, giá, giá sale, mô tả, danh mục, đơn vị, tồn kho, ngày thu hoạch, ngày hết hạn, AI support toggle, danh sách ảnh)
- **Ảnh sản phẩm:** Upload ảnh (nén về 320×320 JPEG, 0.85 quality). Hỗ trợ nhiều ảnh, xem trước preview.
- **Xóa sản phẩm:** Confirm dialog → soft delete / hard delete

---

#### Tab 5: Kho hàng (`warehouse`) — Admin & Staff

**Chức năng:**
- Xem danh sách lịch sử giao dịch kho (import/export) phân trang
- **Ghi nhận nhập kho:** Chọn sản phẩm + số lượng + ghi chú → tạo StockTransaction type "import"
- **Ghi nhận xuất kho:** Tương tự, type "export"
- **Export Excel:** Tải file Excel lịch sử giao dịch kho
- **Import Excel:** Upload file Excel để import hàng loạt giao dịch

**Thành phần UI:**
- 2 action button chính: "Nhập kho" + "Xuất kho" → mở form modal/inline
- Form nhập kho: select sản phẩm (dropdown search) + số lượng + ghi chú
- Bảng lịch sử giao dịch: ngày, sản phẩm, loại (nhập/xuất), số lượng, người thực hiện
- Import/Export Excel buttons

---

#### Tab 6: AI Feedback (`feedback`) — Admin only

**Chức năng:**
- Xem danh sách feedback từ Scanner (người dùng xác nhận/sửa dự đoán AI)
- Mỗi feedback: ảnh scan, predicted label, is_correct, corrected label, user, thời gian, source (camera/upload/api)
- Đánh dấu đã đọc: nút "Đánh dấu đã đọc" / batch mark all read
- Filter theo: đã đọc / chưa đọc, source

**Component:** `AIFeedbackPanel` — component riêng

---

#### Tab 7: Cài đặt (`settings`) — Admin only

**Chức năng:**
- Xem ảnh QR code thanh toán hiện tại
- **Cập nhật QR code:** Upload ảnh mới (base64) → lưu vào DB (`PaymentQRCodeSetting`)
- Đây là QR code hiển thị trong giỏ hàng khi user chọn "Thanh toán QR"

**Thành phần UI:**
- Card đơn giản: hiển thị ảnh QR hiện tại + form upload ảnh mới
- Preview ảnh trước khi save
- Nút "Lưu QR mới"

---

**Luồng điều hướng Admin:**
- Vào từ: Navbar user menu → "Quản trị" (chỉ hiển thị khi user là admin/staff), redirect từ `/cart` nếu là admin, `AdminRoute` guard
- Không có Navbar/Footer công khai — layout hoàn toàn tách biệt
- Chuyển tab bằng sidebar hoặc URL `/:section`
- Đi đến: Không redirect ra ngoài admin area

**Ghi chú thiết kế lại:**
> - Admin layout cần tách hẳn khỏi customer layout: sidebar trái, full-height, dark theme hoặc slate theme khác hẳn.
> - Sidebar trên mobile → drawer (hamburger button).
> - Mỗi tab là một page riêng logic — nên có breadcrumb "Admin > Đơn hàng" rõ ràng.
> - Bảng data cần: sticky header, responsive (horizontal scroll trên mobile), action column cố định phải.
> - Pagination phải nhất quán giữa tất cả các tab có danh sách.
> - KPI cards trong Overview nên có sparkline chart nếu có data theo thời gian.
> - Form thêm/sửa sản phẩm rất nhiều fields — nên dùng multi-step form hoặc accordion nhóm fields.

---

## Shared Components (Dùng lại nhiều nơi)

### Navbar — Thanh điều hướng chính

**Hiển thị ở:** Tất cả trang ngoại trừ `/admin/*`

**Thành phần:**
- **Logo + Brand:** Icon lá xanh trong vòng tròn vàng amber + text "FreshFood"
- **Search bar giữa:** Input tìm kiếm với icon Search → submit → `/shop?q=...`
- **Nav links (desktop):** Trang chủ | Cửa hàng | Yêu thích (với số đếm badge)
- **Action icons (phải):** Language switcher (VI/EN) | Theme toggle (light/dark) | Notification bell (với badge số chưa đọc) | Cart icon (với badge số sản phẩm) | User avatar/menu
- **User menu (dropdown):** Khi đã đăng nhập — Avatar + tên + dropdown: Hồ sơ / Quản trị (nếu admin) / Đăng xuất. Khi chưa đăng nhập: Nút "Đăng nhập".
- **Notification dropdown:** Bell icon → dropdown danh sách thông báo (với "đánh dấu đã đọc")
- **Mobile menu:** Hamburger → drawer/overlay với toàn bộ navigation
- **AuthModal:** Popup đăng nhập nhanh (thay vì chuyển sang `/auth`) khi cần đăng nhập để thực hiện action bảo vệ

**Behaviors:**
- Cố định trên cùng (sticky), shadow khi scroll
- Cart icon ẩn nếu là admin (admin không dùng giỏ hàng)
- Link "Quản trị" chỉ hiện với admin/staff

---

### Footer — Chân trang

**Hiển thị ở:** Tất cả trang ngoại trừ `/admin/*`

**Thành phần:**
- Cột 1: Logo + tagline + social links
- Cột 2: Liên kết nhanh (Trang chủ, Cửa hàng, Yêu thích, Giỏ hàng)
- Cột 3: Thông tin liên hệ (email, hotline, địa chỉ)
- Copyright bar dưới cùng

---

### ProductCardGrid — Lưới sản phẩm

**Dùng ở:** Home, Products, Favorites

**Mỗi product card có:**
- Ảnh sản phẩm (aspect-square, object-cover)
- Promotion badge (góc trên trái, nếu có): "Mua 2 tặng 1", "Tươi hôm nay", "Flash sale"…
- Tên sản phẩm (truncate 2 dòng)
- Danh mục (text nhỏ, màu slate)
- Giá (emerald, bold lớn) — nếu có giá sale: gạch giá gốc
- Rating (sao vàng + số)
- Nút "Thêm vào giỏ": primary button góc dưới — sau click đổi thành tick xanh 1.6s
- Icon Heart (yêu thích): toggle filled/outline, cập nhật FavoritesContext

**Grid layout:** 4 cột desktop / 2 cột tablet / 2 cột mobile

---

### ProductDetail Modal — Chi tiết sản phẩm

**Dùng ở:** Home, Products, Favorites (khi click vào product card)

**Thành phần:**
- Overlay mờ toàn màn hình (click ra ngoài để đóng)
- Card trắng centered: ảnh lớn + thông tin đầy đủ (tên, mô tả, giá, danh mục, tồn kho, đơn vị, rating)
- Ngày thu hoạch + ngày hết hạn (nếu có)
- Badge "AI hỗ trợ" nếu sản phẩm có AI support
- Nút "Thêm vào giỏ" + nút "Đóng"

---

### MarketCategorySidebar — Sidebar danh mục

**Dùng ở:** Products (2 instance: desktop sidebar + mobile compact)

**Desktop mode:** Danh sách dọc với icon + label cho mỗi nhóm danh mục
**Compact mobile mode:** Horizontal pills/tabs

---

### ChatWidget — Widget chatbot AI

**Hiển thị ở:** Tất cả trang ngoại trừ `/admin/*`

**Thành phần:**
- Floating button (góc dưới phải): icon bot + tooltip
- Click → mở panel chat slide-up
- Chat panel: header + message list + input area
- Messages render Markdown (MarkdownMessage component)
- Chat history lưu trong localStorage theo session

---

### AuthModal — Popup đăng nhập nhanh

**Dùng ở:** Navbar (khi click action cần auth)

**Thành phần:**
- Modal overlay nhẹ
- Card nhỏ với form login đơn giản (username + password)
- Link "Đăng ký" → `/auth`
- Đóng bằng nút X hoặc click ngoài

---

## Luồng điều hướng tổng thể

```
[Guest]
  /  ──────────► /shop ──────────► ProductDetail (modal)
  │                │
  │                ▼
  │           /favorites
  │
  ▼
/auth ──► Login ──► / (redirect back to from)
         Register ──► /auth (login mode)
         Forgot PW ──► (inline message)

[Customer đã đăng nhập]
/shop ──► Thêm giỏ ──► /cart ──► Đặt hàng ──► /profile?tab=orders
                                               │
                                               ▼
                                    /orders/:id/confirm-freshness
                                               │
                                               ▼
                                    /profile?tab=orders (sau submit)

/profile ──────────────────────────────────────┤
  ├── Tab Info: chỉnh thông tin, đổi mật khẩu  │
  ├── Tab Địa chỉ: CRUD địa chỉ               │
  └── Tab Đơn hàng: xem, hủy, chỉnh sửa đơn  ─┘

[Admin/Staff]
/admin/dashboard ──► 7 tabs (sidebar navigation)
  ├── /overview   (KPI stats)
  ├── /users      (Admin only)
  ├── /orders     (Admin + Staff)
  ├── /products   (Admin + Staff)
  ├── /warehouse  (Admin + Staff)
  ├── /feedback   (Admin only)
  └── /settings   (Admin only)
```

---

## Trạng thái ứng dụng quan trọng

| State | Lưu ở | Mô tả |
|-------|-------|-------|
| User session | localStorage + AuthContext | JWT token + user profile |
| Giỏ hàng | localStorage (key: `freshfood_cart_${userId}:${scope}`) | Tách biệt theo user, admin không có giỏ |
| Yêu thích | localStorage + FavoritesContext | Danh sách product ID |
| Chat history | localStorage | Theo session |
| Ngôn ngữ | AppSettingsContext | 'vi' hoặc 'en', persist |
| Theme | AppSettingsContext | 'light' hoặc 'dark' |
| Notifications | API + local state | Lấy từ backend, đánh dấu đọc |

---

## Màu sắc và Token hệ thống

| Token | Màu | Dùng cho |
|-------|-----|---------|
| Primary | `emerald-600` (#059669) | CTA chính, giá, badge tươi ngon |
| Warning | `amber-500` (#f59e0b) | Khuyến mãi, trạng thái pending, hero badge |
| Danger | `rose-600` (#e11d48) | Hủy đơn, xóa, trạng thái hỏng |
| Info | `sky-500` (#0ea5e9) | Trạng thái confirmed, thông tin |
| Neutral | `slate-950` (#020617) | Text tiêu đề chính |
| Muted | `slate-500` (#64748b) | Text phụ, nhãn |
| Surface | `white` + `slate-50` | Nền card, input |
| Border | `slate-200` (#e2e8f0) | Viền card, divider |

---

*Tài liệu được tạo từ source code dự án FreshFood AI. Ngày: 2026-06-08*
