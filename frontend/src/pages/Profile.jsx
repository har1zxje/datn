import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Edit3,
  Loader2,
  MapPin,
  PackageCheck,
  Phone,
  Save,
  ShoppingBag,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  cancelUserOrder,
  formatCurrency,
  getUserOrders,
  getUserProfile,
  normalizeOrderStatus,
  updateUserOrder,
  updateUserProfile,
} from '../services/api';

const statusClasses = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  confirmed: 'bg-sky-50 text-sky-700 ring-sky-200',
  shipped: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  returned: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const emptyProfileForm = {
  full_name: '',
  phone: '',
  city: '',
  address: '',
  bio: '',
};

const emptyOrderForm = {
  shipping_address: '',
  shipping_city: '',
  shipping_phone: '',
  payment_method: 'cod',
  notes: '',
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
};

const canModifyOrder = (order) => String(order?.status || '').toLowerCase() === 'pending';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('info');
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [orders, setOrders] = useState([]);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [message, setMessage] = useState(null);

  const displayUser = profile || user;
  const displayName = displayUser?.full_name || displayUser?.username || 'Người dùng';
  const userInitial = displayName.charAt(0).toUpperCase();

  const pendingOrders = useMemo(
    () => orders.filter((order) => canModifyOrder(order)).length,
    [orders]
  );

  useEffect(() => {
    loadProfile();
    loadOrders();
  }, []);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const data = await getUserProfile();
      setProfile(data);
      setProfileForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
        city: data.city || '',
        address: data.address || '',
        bio: data.bio || '',
      });
      updateUser(data);
    } catch (err) {
      setMessage({ type: 'error', text: err.detail || 'Không thể tải thông tin cá nhân' });
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      setOrders(await getUserOrders());
    } catch (err) {
      setMessage({ type: 'error', text: err.detail || 'Không thể tải danh sách đơn hàng' });
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleProfileChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setMessage(null);

    try {
      const updated = await updateUserProfile(profileForm);
      setProfile(updated);
      updateUser(updated);
      setMessage({ type: 'success', text: 'Đã cập nhật thông tin cá nhân' });
    } catch (err) {
      setMessage({ type: 'error', text: err.detail || 'Cập nhật thông tin thất bại' });
    } finally {
      setSavingProfile(false);
    }
  };

  const startEditOrder = (order) => {
    setEditingOrderId(order.id);
    setOrderForm({
      shipping_address: order.shipping_address || '',
      shipping_city: order.shipping_city || '',
      shipping_phone: order.shipping_phone || '',
      payment_method: order.payment_method || 'cod',
      notes: order.notes || '',
    });
  };

  const handleOrderChange = (field, value) => {
    setOrderForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOrderSubmit = async (event, order) => {
    event.preventDefault();
    setSavingOrder(true);
    setMessage(null);

    try {
      const updated = await updateUserOrder(order.id, orderForm);
      setOrders((prev) => prev.map((item) => (item.id === order.id ? updated : item)));
      setEditingOrderId(null);
      setMessage({ type: 'success', text: 'Đã cập nhật đơn hàng' });
    } catch (err) {
      setMessage({ type: 'error', text: err.detail || 'Không thể cập nhật đơn hàng' });
    } finally {
      setSavingOrder(false);
    }
  };

  const handleCancelOrder = async (order) => {
    if (!window.confirm('Bạn muốn hủy đơn hàng này?')) return;

    setSavingOrder(true);
    setMessage(null);
    try {
      await cancelUserOrder(order.id);
      setOrders((prev) => prev.map((item) => (
        item.id === order.id ? { ...item, status: 'cancelled' } : item
      )));
      setEditingOrderId(null);
      setMessage({ type: 'success', text: 'Đã hủy đơn hàng' });
    } catch (err) {
      setMessage({ type: 'error', text: err.detail || 'Không thể hủy đơn hàng' });
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white">
                {userInitial}
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-700">Tài khoản khách hàng</p>
                <h1 className="text-2xl font-bold text-slate-950">{displayName}</h1>
                <p className="mt-1 text-sm text-slate-500">{displayUser?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Đơn hàng</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{orders.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Chờ xác nhận</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">{pendingOrders}</p>
              </div>
              <div className="rounded-xl border border-slate-200 px-4 py-3 col-span-2 sm:col-span-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Vai trò</p>
                <p className="mt-1 text-base font-semibold text-slate-950">
                  {displayUser?.is_admin ? 'Quản trị viên' : 'Khách hàng'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium ${
            message.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="mb-6 flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'info' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <UserRound size={18} />
            Thông tin cá nhân
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'orders' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShoppingBag size={18} />
            Đơn hàng
          </button>
        </div>

        {activeTab === 'info' && (
          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Hồ sơ</h2>
              {loadingProfile ? (
                <div className="mt-6 flex items-center gap-2 text-slate-500">
                  <Loader2 className="animate-spin" size={18} />
                  Đang tải...
                </div>
              ) : (
                <dl className="mt-6 space-y-6">
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Tên đăng nhập</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{displayUser?.username}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Email</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{displayUser?.email}</dd>
                  </div>
                  <div className="flex gap-3">
                    <Phone className="mt-1 text-slate-400" size={18} />
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Số điện thoại</dt>
                      <dd className="mt-1 font-semibold text-slate-950">{displayUser?.phone || 'Chưa cập nhật'}</dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <MapPin className="mt-1 text-slate-400" size={18} />
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Địa chỉ</dt>
                      <dd className="mt-1 font-semibold text-slate-950">
                        {[displayUser?.address, displayUser?.city].filter(Boolean).join(', ') || 'Chưa cập nhật'}
                      </dd>
                    </div>
                  </div>
                </dl>
              )}
            </div>

            <form onSubmit={handleProfileSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Cập nhật thông tin</h2>
                  <p className="mt-1 text-sm text-slate-500">Thông tin này được dùng cho quá trình giao hàng.</p>
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Lưu
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Họ và tên</span>
                  <input
                    value={profileForm.full_name}
                    onChange={(e) => handleProfileChange('full_name', e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Nguyễn Văn A"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Số điện thoại</span>
                  <input
                    value={profileForm.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="0900000000"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Tỉnh/Thành phố</span>
                  <input
                    value={profileForm.city}
                    onChange={(e) => handleProfileChange('city', e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Hà Nội"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Địa chỉ nhận hàng</span>
                  <input
                    value={profileForm.address}
                    onChange={(e) => handleProfileChange('address', e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Số nhà, đường, phường/xã"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Ghi chú cá nhân</span>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Thông tin bổ sung"
                  />
                </label>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'orders' && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Danh sách đơn hàng</h2>
                <p className="mt-1 text-sm text-slate-500">Đơn chờ xác nhận có thể sửa hoặc hủy.</p>
              </div>
              <button
                type="button"
                onClick={loadOrders}
                disabled={loadingOrders}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
              >
                <ClipboardList size={16} />
                Tải lại
              </button>
            </div>

            {loadingOrders ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="animate-spin" size={20} />
                Đang tải đơn hàng...
              </div>
            ) : orders.length === 0 ? (
              <div className="py-16 text-center">
                <PackageCheck className="mx-auto text-slate-300" size={44} />
                <h3 className="mt-4 text-lg font-semibold text-slate-950">Chưa có đơn hàng</h3>
                <p className="mt-1 text-sm text-slate-500">Các đơn hàng sau khi checkout sẽ hiển thị tại đây.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {orders.map((order, index) => {
                  const isEditing = editingOrderId === order.id;
                  const statusKey = String(order.status || '').toLowerCase();
                  const canModify = canModifyOrder(order);

                  return (
                    <article key={order.id} className="p-6">
                      <div className="grid gap-4 xl:grid-cols-[72px_1.4fr_1fr_1fr_auto] xl:items-start">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">STT</p>
                          <p className="mt-1 text-2xl font-bold text-slate-950">{index + 1}</p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sản phẩm</p>
                          <div className="mt-2 space-y-2">
                            {order.items.length > 0 ? order.items.map((item) => (
                              <div key={item.id || `${order.id}-${item.product_id}`} className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2">
                                <span className="font-medium text-slate-800">{item.product_name}</span>
                                <span className="shrink-0 rounded-md bg-white px-2 py-1 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                                  x{item.quantity}
                                </span>
                              </div>
                            )) : (
                              <p className="text-sm text-slate-500">Chưa có dữ liệu sản phẩm</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ngày đặt</p>
                          <p className="mt-1 font-semibold text-slate-950">{formatDate(order.created_at)}</p>
                          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">Tổng tiền</p>
                          <p className="mt-1 text-lg font-bold text-emerald-700">{formatCurrency(order.total)}</p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Trạng thái</p>
                          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ${statusClasses[statusKey] || statusClasses.returned}`}>
                            {normalizeOrderStatus(order.status)}
                          </span>
                          <p className="mt-3 text-sm text-slate-500">
                            {order.shipping_phone || 'Chưa có SĐT'} · {order.shipping_city || 'Chưa có thành phố'}
                          </p>
                        </div>

                        <div className="flex gap-2 xl:justify-end">
                          {canModify ? (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditOrder(order)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                <Edit3 size={16} />
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(order)}
                                disabled={savingOrder}
                                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-70"
                              >
                                <Trash2 size={16} />
                                Hủy
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500">
                              <CheckCircle2 size={16} />
                              Đã khóa
                            </span>
                          )}
                        </div>
                      </div>

                      {isEditing && (
                        <form onSubmit={(event) => handleOrderSubmit(event, order)} className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="block">
                              <span className="text-sm font-semibold text-slate-700">Địa chỉ giao hàng</span>
                              <input
                                value={orderForm.shipping_address}
                                onChange={(e) => handleOrderChange('shipping_address', e.target.value)}
                                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                              />
                            </label>
                            <label className="block">
                              <span className="text-sm font-semibold text-slate-700">Thành phố</span>
                              <input
                                value={orderForm.shipping_city}
                                onChange={(e) => handleOrderChange('shipping_city', e.target.value)}
                                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                              />
                            </label>
                            <label className="block">
                              <span className="text-sm font-semibold text-slate-700">Số điện thoại</span>
                              <input
                                value={orderForm.shipping_phone}
                                onChange={(e) => handleOrderChange('shipping_phone', e.target.value)}
                                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                              />
                            </label>
                            <label className="block">
                              <span className="text-sm font-semibold text-slate-700">Thanh toán</span>
                              <select
                                value={orderForm.payment_method}
                                onChange={(e) => handleOrderChange('payment_method', e.target.value)}
                                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                              >
                                <option value="cod">COD</option>
                                <option value="card">Thẻ</option>
                                <option value="bank_transfer">Chuyển khoản</option>
                              </select>
                            </label>
                            <label className="block md:col-span-2">
                              <span className="text-sm font-semibold text-slate-700">Ghi chú</span>
                              <textarea
                                value={orderForm.notes}
                                onChange={(e) => handleOrderChange('notes', e.target.value)}
                                rows={3}
                                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                              />
                            </label>
                          </div>
                          <div className="mt-4 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingOrderId(null)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                            >
                              <X size={16} />
                              Đóng
                            </button>
                            <button
                              type="submit"
                              disabled={savingOrder}
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                            >
                              {savingOrder ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                              Lưu đơn
                            </button>
                          </div>
                        </form>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default Profile;
