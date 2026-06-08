import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  Minus,
  Phone,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Truck,
  User,
  Wallet,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import {
  createDeliveryProfile,
  createOrder,
  getDeliveryProfiles,
} from '../services/api';
import { uiLayout } from '../styles/uiTokens';

const QR_IMAGE_URL =
  'https://img.vietqr.io/image/MB-0349987654-compact2.jpg?amount=0&addInfo=ThanhToanDonHang&accountName=FRESHFOOD';

const VN_PHONE_REGEX = /^0[0-9]{9}$/;
const emptyNewProfile = { full_name: '', phone: '', address: '', city: '', is_default: false };

// ---- Helpers ----

const parsePrice = (price) =>
  typeof price === 'number' ? price : parseInt(String(price).replace(/\./g, ''), 10);

const PaymentMethodCard = ({ value, selected, onSelect, icon: Icon, label, description }) => (
  <button
    type="button"
    onClick={() => onSelect(value)}
    className={`flex w-full items-start gap-3 rounded-[22px] border-2 p-4 text-left transition ${
      selected
        ? 'border-emerald-500 bg-emerald-50 shadow-[0_12px_24px_rgba(5,150,105,0.10)]'
        : 'border-[color:var(--line-soft)] bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
    }`}
  >
    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
      <Icon size={18} />
    </div>
    <div className="min-w-0 flex-1">
      <p className={`text-sm font-bold ${selected ? 'text-emerald-800' : 'text-slate-800'}`}>{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
    </div>
    <div className={`ml-auto mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
      {selected && <CheckCircle2 size={14} className="text-white" strokeWidth={3} />}
    </div>
  </button>
);

// ---- Main Component ----

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, removeItems, clearCart, getCartTotal, isEmpty, canUseCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Sản phẩm được chọn để thanh toán (Set<id>)
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Đồng bộ selectedIds khi cartItems thay đổi (xóa id không còn tồn tại)
  useEffect(() => {
    setSelectedIds((prev) => {
      const validIds = new Set(cartItems.map((i) => i.id));
      const cleaned = new Set([...prev].filter((id) => validIds.has(id)));
      // Nếu giỏ vừa được load lần đầu và selectedIds chưa có gì → chọn tất cả
      if (prev.size === 0 && cartItems.length > 0) return validIds;
      return cleaned.size !== prev.size ? cleaned : prev;
    });
  }, [cartItems]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Delivery profiles
  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [showNewProfileForm, setShowNewProfileForm] = useState(false);
  const [newProfile, setNewProfile] = useState(emptyNewProfile);
  const [newProfileErrors, setNewProfileErrors] = useState({});
  const [savingNewProfile, setSavingNewProfile] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('cod');

  // ---- Derived ----

  const selectedItems = cartItems.filter((i) => selectedIds.has(i.id));
  const allSelected = cartItems.length > 0 && selectedIds.size === cartItems.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < cartItems.length;

  const subtotal = getCartTotal(selectedItems);
  const shippingFee = selectedItems.length > 0 ? (subtotal > 500000 ? 0 : 30000) : 0;
  const finalTotal = subtotal + shippingFee;

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? null;

  // ---- Selection handlers ----

  const toggleItem = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cartItems.map((i) => i.id)));
    }
  };

  // ---- Load profiles ----

  useEffect(() => {
    if (!user || !canUseCart) return;
    setLoadingProfiles(true);
    getDeliveryProfiles()
      .then((data) => {
        setProfiles(data);
        const def = data.find((p) => p.is_default);
        if (def) setSelectedProfileId(def.id);
        else if (data.length > 0) setSelectedProfileId(data[0].id);
        else setShowNewProfileForm(true);
      })
      .catch(() => setShowNewProfileForm(true))
      .finally(() => setLoadingProfiles(false));
  }, [user, canUseCart]);

  // ---- New profile form ----

  const validateNewProfile = () => {
    const errs = {};
    if (!newProfile.full_name.trim()) errs.full_name = 'Vui lòng nhập họ tên';
    if (!VN_PHONE_REGEX.test(newProfile.phone)) errs.phone = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)';
    if (!newProfile.address.trim()) errs.address = 'Vui lòng nhập địa chỉ';
    if (!newProfile.city.trim()) errs.city = 'Vui lòng nhập tỉnh/thành phố';
    return errs;
  };

  const handleSaveNewProfile = async () => {
    const errs = validateNewProfile();
    if (Object.keys(errs).length > 0) { setNewProfileErrors(errs); return; }
    setSavingNewProfile(true);
    setNewProfileErrors({});
    try {
      const created = await createDeliveryProfile(newProfile);
      setProfiles((prev) => {
        const base = newProfile.is_default ? prev.map((p) => ({ ...p, is_default: false })) : prev;
        return [...base, created];
      });
      setSelectedProfileId(created.id);
      setShowNewProfileForm(false);
      setNewProfile(emptyNewProfile);
    } catch (err) {
      setNewProfileErrors({ global: err.detail || 'Không thể lưu địa chỉ' });
    } finally {
      setSavingNewProfile(false);
    }
  };

  // ---- Checkout ----

  const handleCheckout = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!canUseCart || user?.is_admin) {
      setError('Tài khoản admin chỉ dùng để quản trị, không thể mua hàng.');
      return;
    }
    if (selectedItems.length === 0) {
      setError('Vui lòng chọn ít nhất một sản phẩm để thanh toán.');
      return;
    }
    if (!selectedProfile) {
      setError('Vui lòng chọn hoặc tạo địa chỉ giao hàng trước khi đặt hàng.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const orderData = {
        items: selectedItems.map((item) => ({ product_id: item.id, quantity: item.qty })),
        shipping_address: selectedProfile.address,
        shipping_city: selectedProfile.city,
        shipping_phone: selectedProfile.phone,
        payment_method: paymentMethod,
      };

      const response = await createOrder(orderData);
      if (response) {
        // Chỉ xóa các sản phẩm đã chọn — sản phẩm còn lại ở lại giỏ
        removeItems([...selectedIds]);
        navigate('/profile', {
          state: {
            successMessage: `Đặt hàng thành công! Mã đơn: ${response.order_number || `#${response.id}`}`,
            tab: 'orders',
          },
        });
      }
    } catch (err) {
      setError(err.detail || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Guards ----

  if (user?.is_admin || !canUseCart) {
    return (
      <div className={uiLayout.page}>
        <div className={uiLayout.container}>
          <section className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm md:p-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-700">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-2xl font-black text-slate-950 md:text-3xl">Tài khoản admin không mua hàng</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600 md:text-base">
              Vui lòng đăng nhập bằng tài khoản khách hàng nếu bạn cần đặt đơn.
            </p>
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              Đến trang quản trị
            </button>
          </section>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={uiLayout.page}>
        <div className={uiLayout.container}>
          <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm md:p-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <ShoppingCart size={28} />
            </div>
            <h1 className="text-2xl font-black text-slate-950 md:text-3xl">Giỏ hàng đang trống</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600 md:text-base">
              Bạn chưa có sản phẩm nào trong giỏ. Chọn thêm rau củ, thịt cá hoặc gia vị để tiếp tục đơn hàng.
            </p>
            <Link
              to="/shop"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              <ArrowLeft size={16} />
              Quay lại cửa hàng
            </Link>
          </section>
        </div>
      </div>
    );
  }

  // ---- Main render ----

  return (
    <div className={uiLayout.page}>
      <div className={uiLayout.container}>
        <section className="mb-10 flex flex-col gap-3 rounded-[30px] border border-[color:var(--line-soft)] bg-[linear-gradient(135deg,rgba(15,154,98,0.10),rgba(216,169,52,0.08),rgba(255,255,255,0.96))] p-6 shadow-[var(--shadow-soft)] md:mb-12 md:p-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-[2.7rem]">Giỏ hàng của bạn</h1>
          <p className="text-sm font-medium text-slate-600 md:text-base">
            {cartItems.length} sản phẩm trong giỏ
            {selectedIds.size > 0 && selectedIds.size < cartItems.length && (
              <span className="ml-2 font-semibold text-emerald-700">· Đã chọn {selectedIds.size}</span>
            )}
          </p>
        </section>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-[0_8px_24px_rgba(244,63,94,0.08)] md:px-5 md:py-4">
            {error}
          </div>
        )}

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] xl:gap-9">
          {/* ---- Left column ---- */}
          <div className="flex flex-col gap-6">

            {/* Danh sách sản phẩm */}
            <section className="overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
              {/* Header với "chọn tất cả" */}
              <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-7">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <span
                    onClick={toggleAll}
                    className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition ${
                      allSelected
                        ? 'border-emerald-500 bg-emerald-500'
                        : someSelected
                        ? 'border-emerald-400 bg-emerald-100'
                        : 'border-slate-300 bg-white hover:border-emerald-400'
                    }`}
                  >
                    {allSelected && (
                      <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="1,6 4.5,9.5 11,2" />
                      </svg>
                    )}
                    {someSelected && !allSelected && (
                      <span className="block h-0.5 w-2.5 rounded bg-emerald-600" />
                    )}
                  </span>
                  <span className="text-sm font-black uppercase tracking-[0.06em] text-slate-500 select-none" onClick={toggleAll}>
                    {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </span>
                </label>

                <div className="ml-auto flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <span className="text-xs font-semibold text-emerald-700">
                      Đã chọn {selectedIds.size}/{cartItems.length}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={clearCart}
                    className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                  >
                    <Trash2 size={13} />
                    Xóa tất cả
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-slate-200">
                {cartItems.map((item) => {
                  const priceNum = parsePrice(item.price);
                  const itemTotal = priceNum * item.qty;
                  const isChecked = selectedIds.has(item.id);

                  return (
                    <article
                      key={item.id}
                      className={`grid gap-4 p-5 transition sm:grid-cols-[auto_104px_minmax(0,1fr)] sm:gap-5 sm:p-6 ${
                        isChecked ? 'bg-white' : 'bg-slate-50/70'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="flex items-center sm:items-start sm:pt-1">
                        <button
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          aria-label={isChecked ? 'Bỏ chọn sản phẩm' : 'Chọn sản phẩm'}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
                            isChecked
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-slate-300 bg-white hover:border-emerald-400'
                          }`}
                        >
                          {isChecked && (
                            <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="1,6 4.5,9.5 11,2" />
                            </svg>
                          )}
                        </button>
                      </div>

                      {/* Ảnh */}
                      <div className="relative">
                        <img
                          src={item.img || item.image_url || '/placeholder.png'}
                          alt={item.name}
                          className={`h-[104px] w-[104px] rounded-2xl object-cover ring-1 ring-slate-200 transition ${!isChecked ? 'opacity-50 grayscale' : ''}`}
                          onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
                        />
                        <span className="absolute -right-2 -top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-1 text-xs font-black text-white">
                          {item.qty}
                        </span>
                      </div>

                      {/* Info + controls */}
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
                        <div className={`min-w-0 transition ${!isChecked ? 'opacity-50' : ''}`}>
                          <h3 className="truncate text-base font-black text-slate-900 md:text-lg">{item.name}</h3>
                          <p className="mt-1 text-sm text-slate-500">{item.category || 'Sản phẩm'}</p>
                          <p className="mt-2 text-base font-bold text-emerald-700">{priceNum.toLocaleString('vi-VN')}đ</p>
                        </div>

                        <div className="inline-flex w-fit items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, Math.max(1, item.qty - 1))}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition hover:bg-white hover:text-rose-600"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="inline-flex h-9 min-w-9 items-center justify-center text-sm font-black text-slate-900">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.qty + 1)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition hover:bg-white hover:text-emerald-700"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-4 xl:block xl:text-right">
                          <p className={`text-base font-black md:text-lg ${isChecked ? 'text-slate-900' : 'text-slate-400'}`}>
                            {itemTotal.toLocaleString('vi-VN')}đ
                          </p>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="mt-1 text-sm font-semibold text-rose-600 transition hover:text-rose-700"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="border-t border-slate-200 px-4 py-4 sm:px-6">
                <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800">
                  <ArrowLeft size={16} />
                  Tiếp tục mua hàng
                </Link>
              </div>
            </section>

            {/* Địa chỉ giao hàng */}
            <section className="overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
              <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
                <h2 className="text-sm font-black uppercase tracking-[0.06em] text-slate-500">Địa chỉ giao hàng</h2>
              </div>
              <div className="p-5 sm:p-7">
                {loadingProfiles ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="animate-spin" size={16} />
                    Đang tải địa chỉ...
                  </div>
                ) : (
                  <>
                    {/* Địa chỉ đã chọn */}
                    {selectedProfile && !showProfileSelector && (
                      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-0.5 shrink-0 text-emerald-600" size={18} />
                          <div>
                            <p className="font-bold text-slate-900">{selectedProfile.full_name}</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
                              <Phone size={13} />
                              {selectedProfile.phone}
                            </p>
                            <p className="mt-0.5 text-sm text-slate-600">
                              {selectedProfile.address}, {selectedProfile.city}
                            </p>
                            {selectedProfile.is_default && (
                              <span className="mt-1.5 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                Mặc định
                              </span>
                            )}
                          </div>
                        </div>
                        {profiles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setShowProfileSelector(true)}
                            className="shrink-0 text-sm font-semibold text-emerald-700 hover:underline"
                          >
                            Đổi địa chỉ
                          </button>
                        )}
                      </div>
                    )}

                    {/* Danh sách chọn địa chỉ */}
                    {showProfileSelector && profiles.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {profiles.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { setSelectedProfileId(p.id); setShowProfileSelector(false); }}
                            className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition ${
                              selectedProfileId === p.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-200'
                            }`}
                          >
                            <MapPin className="mt-0.5 shrink-0 text-emerald-600" size={16} />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900">{p.full_name} · {p.phone}</p>
                              <p className="mt-0.5 text-sm text-slate-500">{p.address}, {p.city}</p>
                            </div>
                            {p.is_default && (
                              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Mặc định</span>
                            )}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setShowProfileSelector(false)}
                          className="mt-1 text-sm font-semibold text-slate-500 hover:text-slate-700"
                        >
                          Đóng
                        </button>
                      </div>
                    )}

                    {/* Nút thêm địa chỉ mới */}
                    {!showNewProfileForm && (
                      <button
                        type="button"
                        onClick={() => setShowNewProfileForm(true)}
                        className="flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        <Plus size={16} />
                        {profiles.length === 0 ? 'Thêm địa chỉ giao hàng' : 'Thêm địa chỉ mới'}
                      </button>
                    )}

                    {/* Form tạo địa chỉ mới */}
                    {showNewProfileForm && (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-4 text-sm font-bold text-slate-800">Thêm địa chỉ giao hàng mới</p>
                        {newProfileErrors.global && (
                          <p className="mb-3 text-sm font-semibold text-rose-600">{newProfileErrors.global}</p>
                        )}
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600">Họ và tên <span className="text-rose-500">*</span></span>
                            <div className="relative mt-1">
                              <User size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                value={newProfile.full_name}
                                onChange={(e) => setNewProfile((p) => ({ ...p, full_name: e.target.value }))}
                                placeholder="Nguyễn Văn A"
                                className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:ring-4 ${newProfileErrors.full_name ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'}`}
                              />
                            </div>
                            {newProfileErrors.full_name && <p className="mt-1 text-xs text-rose-600">{newProfileErrors.full_name}</p>}
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600">Số điện thoại <span className="text-rose-500">*</span></span>
                            <div className="relative mt-1">
                              <Phone size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="tel"
                                value={newProfile.phone}
                                onChange={(e) => setNewProfile((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                                placeholder="0900000000"
                                className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:ring-4 ${newProfileErrors.phone ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'}`}
                              />
                            </div>
                            {newProfileErrors.phone && <p className="mt-1 text-xs text-rose-600">{newProfileErrors.phone}</p>}
                          </label>

                          <label className="block md:col-span-2">
                            <span className="text-xs font-semibold text-slate-600">Địa chỉ <span className="text-rose-500">*</span></span>
                            <div className="relative mt-1">
                              <MapPin size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                value={newProfile.address}
                                onChange={(e) => setNewProfile((p) => ({ ...p, address: e.target.value }))}
                                placeholder="Số nhà, đường, phường/xã"
                                className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:ring-4 ${newProfileErrors.address ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'}`}
                              />
                            </div>
                            {newProfileErrors.address && <p className="mt-1 text-xs text-rose-600">{newProfileErrors.address}</p>}
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600">Tỉnh/Thành phố <span className="text-rose-500">*</span></span>
                            <input
                              value={newProfile.city}
                              onChange={(e) => setNewProfile((p) => ({ ...p, city: e.target.value }))}
                              placeholder="Hà Nội"
                              className={`mt-1 w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-4 ${newProfileErrors.city ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'}`}
                            />
                            {newProfileErrors.city && <p className="mt-1 text-xs text-rose-600">{newProfileErrors.city}</p>}
                          </label>

                          <label className="flex cursor-pointer items-center gap-2 self-end pb-1">
                            <input
                              type="checkbox"
                              checked={newProfile.is_default}
                              onChange={(e) => setNewProfile((p) => ({ ...p, is_default: e.target.checked }))}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-xs font-semibold text-slate-700">Đặt làm địa chỉ mặc định</span>
                          </label>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveNewProfile}
                            disabled={savingNewProfile}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                          >
                            {savingNewProfile ? <Loader2 className="animate-spin" size={15} /> : null}
                            Lưu địa chỉ
                          </button>
                          {profiles.length > 0 && (
                            <button
                              type="button"
                              onClick={() => { setShowNewProfileForm(false); setNewProfileErrors({}); setNewProfile(emptyNewProfile); }}
                              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Hủy
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Phương thức thanh toán */}
            <section className="overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
              <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
                <h2 className="text-sm font-black uppercase tracking-[0.06em] text-slate-500">Phương thức thanh toán</h2>
              </div>
              <div className="space-y-3 p-5 sm:p-7">
                <PaymentMethodCard
                  value="cod"
                  selected={paymentMethod === 'cod'}
                  onSelect={setPaymentMethod}
                  icon={Truck}
                  label="Tiền mặt khi nhận hàng (COD)"
                  description="Thanh toán trực tiếp khi nhận hàng, không cần thẻ hay tài khoản"
                />
                <PaymentMethodCard
                  value="qr"
                  selected={paymentMethod === 'qr'}
                  onSelect={setPaymentMethod}
                  icon={QrCode}
                  label="Thanh toán QR Code"
                  description="Quét mã QR qua app ngân hàng hoặc ví điện tử"
                />

                {paymentMethod === 'qr' && (
                  <div className="mt-2 flex flex-col items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-start">
                    <img
                      src={QR_IMAGE_URL}
                      alt="Mã QR thanh toán"
                      className="h-40 w-40 shrink-0 rounded-xl border border-emerald-200 bg-white object-contain p-1 shadow"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="text-center sm:text-left">
                      <p className="font-bold text-emerald-800">Quét mã để thanh toán</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Mở app ngân hàng hoặc ví điện tử (MoMo, ZaloPay…) và quét mã QR bên cạnh.
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-700">
                        Số tiền: <span className="text-emerald-700">{finalTotal.toLocaleString('vi-VN')}đ</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Nội dung: <span className="font-semibold text-slate-700">Thanh toan don hang</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ---- Right: Tổng đơn hàng ---- */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[30px] border border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.94),rgba(255,255,255,0.98))] p-6 shadow-[0_20px_40px_rgba(16,185,129,0.16)] sm:p-7">
              <h2 className="text-xl font-black text-slate-900">Tổng đơn hàng</h2>

              {/* Ghi chú chọn lọc */}
              {selectedIds.size < cartItems.length && selectedIds.size > 0 && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                  Tính theo {selectedIds.size} sản phẩm đã chọn. {cartItems.length - selectedIds.size} sản phẩm còn lại vẫn ở trong giỏ sau khi đặt.
                </p>
              )}

              <div className="mt-4 space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:p-6">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span className="font-semibold">Tạm tính ({selectedIds.size} sản phẩm)</span>
                  <span className="font-semibold">{subtotal.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <Truck size={15} />
                    Phí vận chuyển
                  </span>
                  <span className={`font-semibold ${shippingFee === 0 && selectedItems.length > 0 ? 'text-emerald-700' : ''}`}>
                    {selectedItems.length === 0
                      ? '—'
                      : shippingFee === 0
                      ? 'Miễn phí'
                      : `${shippingFee.toLocaleString('vi-VN')}đ`}
                  </span>
                </div>
                {shippingFee > 0 && selectedItems.length > 0 && (
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Đơn từ 500.000đ được miễn phí ship.
                  </p>
                )}
                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="text-base font-black text-slate-900">Tổng cộng</span>
                  <span className="text-2xl font-black text-emerald-700">{finalTotal.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              {/* Tóm tắt địa chỉ & thanh toán */}
              {selectedProfile && (
                <div className="mt-4 space-y-2 rounded-xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                    <span>{selectedProfile.full_name} · {selectedProfile.phone} · {selectedProfile.address}, {selectedProfile.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Wallet size={13} className="shrink-0 text-emerald-500" />
                    <span>{paymentMethod === 'cod' ? 'Tiền mặt khi nhận (COD)' : 'Thanh toán QR Code'}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={loading || selectedItems.length === 0 || !selectedProfile}
                className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-black text-white transition ${
                  loading || selectedItems.length === 0 || !selectedProfile
                    ? 'cursor-not-allowed bg-slate-400'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]'
                }`}
              >
                {loading ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
                {loading
                  ? 'Đang xử lý đơn hàng...'
                  : selectedIds.size < cartItems.length && selectedIds.size > 0
                  ? `Đặt ${selectedIds.size} sản phẩm đã chọn`
                  : 'Tiến hành đặt hàng'}
              </button>

              {selectedItems.length === 0 && (
                <p className="mt-3 text-center text-xs font-semibold text-rose-600">
                  Vui lòng chọn ít nhất một sản phẩm
                </p>
              )}
              {selectedItems.length > 0 && !selectedProfile && !loadingProfiles && (
                <p className="mt-3 text-center text-xs font-semibold text-rose-600">
                  Vui lòng chọn hoặc tạo địa chỉ giao hàng
                </p>
              )}

              <div className="mt-4 space-y-1 text-xs text-slate-500">
                <p>Thanh toán an toàn và bảo mật.</p>
                <p>Hỗ trợ 24/7: 1800-1234.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Cart;
