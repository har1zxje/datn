import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShieldCheck, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../services/api';
import { uiLayout } from '../styles/uiTokens';

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, clearCart, getCartTotal, isEmpty } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const totalPrice = getCartTotal();
  const shippingFee = totalPrice > 500000 ? 0 : 30000;
  const finalTotal = totalPrice + shippingFee;
  const shippingProfile = {
    address: String(user?.address || '').trim(),
    city: String(user?.city || '').trim(),
    phone: String(user?.phone || '').trim(),
  };
  const missingShippingFields = [
    !shippingProfile.address && 'địa chỉ',
    !shippingProfile.city && 'thành phố',
    !shippingProfile.phone && 'số điện thoại',
  ].filter(Boolean);
  const hasMissingShippingInfo = missingShippingFields.length > 0;

  const handleCheckout = async () => {
    if (!user) {
      setError('Vui lòng đăng nhập trước khi đặt hàng.');
      navigate('/auth');
      return;
    }

    if (isEmpty) {
      setError('Giỏ hàng đang trống.');
      return;
    }

    if (hasMissingShippingInfo) {
      setError(
        `Vui lòng cập nhật ${missingShippingFields.join(', ')} trong hồ sơ trước khi thanh toán.`
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const orderData = {
        items: cartItems.map((item) => ({
          product_id: item.id,
          quantity: item.qty,
        })),
        shipping_address: shippingProfile.address,
        shipping_city: shippingProfile.city,
        shipping_phone: shippingProfile.phone,
        payment_method: 'cod',
      };

      const response = await createOrder(orderData);

      if (response) {
        clearCart();
        setMessage(`Đặt hàng thành công. Mã đơn hàng: #${response.id || response.order_id}`);
        navigate('/profile');
      }
    } catch (err) {
      setError(err.detail || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
      console.error('Order error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (isEmpty) {
    return (
      <div className={uiLayout.page}>
        <div className={uiLayout.container}>
          <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm md:p-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <ShoppingCart size={28} />
            </div>
            <h1 className="text-2xl font-black text-slate-950 md:text-3xl">Gio hang dang trong</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600 md:text-base">
              Ban chua co san pham nao trong gio. Chon them rau cu, thit ca hoac gia vi de tiep tuc don hang.
            </p>
            <Link
              to="/shop"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              <ArrowLeft size={16} />
              Quay lai cua hang
            </Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={uiLayout.page}>
      <div className={uiLayout.container}>
        <section className="mb-8 flex flex-col gap-2 md:mb-10">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Gio hang cua ban</h1>
          <p className="text-sm font-medium text-slate-600 md:text-base">
            Hien co {cartItems.length} san pham trong gio hang.
          </p>
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 md:px-5 md:py-4">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 md:px-5 md:py-4">
            {message}
          </div>
        )}
        {hasMissingShippingInfo && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 md:px-5 md:py-4">
            <p>
              Thiếu thông tin giao hàng: <span className="font-semibold">{missingShippingFields.join(', ')}</span>.
            </p>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              Cập nhật hồ sơ
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:gap-8">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
              <p className="text-sm font-black uppercase tracking-[0.06em] text-slate-500">Danh sach san pham</p>
              <button
                type="button"
                onClick={clearCart}
                className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
              >
                <Trash2 size={14} />
                Xoa tat ca
              </button>
            </div>

            <div className="divide-y divide-slate-200">
              {cartItems.map((item) => {
                const priceNum = typeof item.price === 'number'
                  ? item.price
                  : parseInt(item.price.toString().replace(/\./g, ''), 10);
                const itemTotal = priceNum * item.qty;

                return (
                  <article key={item.id} className="grid gap-4 p-4 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-5 sm:p-6">
                    <div className="relative">
                      <img
                        src={item.img || item.image_url || '/placeholder.png'}
                        alt={item.name}
                        className="h-24 w-24 rounded-xl object-cover ring-1 ring-slate-200"
                        onError={(event) => {
                          event.currentTarget.src = '/placeholder.png';
                        }}
                      />
                      <span className="absolute -right-2 -top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-1 text-xs font-black text-white">
                        {item.qty}
                      </span>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-slate-900 md:text-lg">{item.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{item.category || 'San pham'}</p>
                        <p className="mt-2 text-base font-bold text-emerald-700">
                          {priceNum.toLocaleString('vi-VN')}d
                        </p>
                      </div>

                      <div className="inline-flex w-fit items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, Math.max(1, item.qty - 1))}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition hover:bg-white hover:text-rose-600"
                          aria-label="Giam so luong"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="inline-flex h-9 min-w-9 items-center justify-center text-sm font-black text-slate-900">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.qty + 1)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition hover:bg-white hover:text-emerald-700"
                          aria-label="Tang so luong"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-4 xl:block xl:text-right">
                        <p className="text-base font-black text-slate-900 md:text-lg">{itemTotal.toLocaleString('vi-VN')}d</p>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="mt-1 text-sm font-semibold text-rose-600 transition hover:text-rose-700"
                        >
                          Xoa
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
                Tiep tuc mua hang
              </Link>
            </div>
          </section>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-slate-900">Tong don hang</h2>

              <div className="mt-5 space-y-4 rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span className="font-semibold">Tam tinh</span>
                  <span className="font-semibold">{totalPrice.toLocaleString('vi-VN')}d</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <Truck size={15} />
                    Phi van chuyen
                  </span>
                  <span className={`font-semibold ${shippingFee === 0 ? 'text-emerald-700' : ''}`}>
                    {shippingFee === 0 ? 'Mien phi' : `${shippingFee.toLocaleString('vi-VN')}d`}
                  </span>
                </div>
                {shippingFee > 0 && (
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Don tu 500.000d se duoc free ship.
                  </p>
                )}
                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="text-base font-black text-slate-900">Tong cong</span>
                  <span className="text-2xl font-black text-emerald-700">{finalTotal.toLocaleString('vi-VN')}d</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={loading || isEmpty || hasMissingShippingInfo}
                className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white transition ${
                  loading || isEmpty || hasMissingShippingInfo
                    ? 'cursor-not-allowed bg-slate-400'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <ShieldCheck size={17} />
                {loading ? 'Dang xu ly don hang...' : 'Tien hanh thanh toan'}
              </button>

              <div className="mt-4 space-y-2 text-xs text-slate-500">
                <p>Thanh toan an toan va bao mat.</p>
                <p>Ho tro 24/7: 1800-1234.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Cart;

