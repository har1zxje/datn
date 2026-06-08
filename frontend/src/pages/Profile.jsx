import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VN_PROVINCES, getDistricts } from '../data/vnLocations';
import { getWards } from '../data/vnWards';
import { Link, useLocation } from 'react-router-dom';
import {
  BookMarked,
  Camera,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Edit3,
  Loader2,
  Lock,
  MapPin,
  PackageCheck,
  Phone,
  Plus,
  Save,
  ShoppingBag,
  Trash2,
  Truck,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  cancelUserOrder,
  changePassword,
  createDeliveryProfile,
  deleteDeliveryProfile,
  formatCurrency,
  getDeliveryProfiles,
  getUserOrders,
  getUserProfile,
  normalizeOrderStatus,
  setDefaultDeliveryProfile,
  updateDeliveryProfile,
  updateUserOrder,
  updateUserProfile,
} from '../services/api';
import { safeText } from '../utils/text';

const VN_PHONE_REGEX = /^0[0-9]{9}$/;

const STATUS_CONFIG = {
  pending:   { cls: 'bg-amber-50 text-amber-700 ring-amber-200',     dot: 'bg-amber-400',   iconBg: 'bg-amber-50'   },
  confirmed: { cls: 'bg-sky-50 text-sky-700 ring-sky-200',           dot: 'bg-sky-400',     iconBg: 'bg-sky-50'     },
  shipped:   { cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200',  dot: 'bg-indigo-400',  iconBg: 'bg-indigo-50'  },
  delivered: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', iconBg: 'bg-emerald-50' },
  cancelled: { cls: 'bg-rose-50 text-rose-700 ring-rose-200',        dot: 'bg-rose-400',    iconBg: 'bg-rose-50'    },
  returned:  { cls: 'bg-slate-100 text-slate-700 ring-slate-200',    dot: 'bg-slate-400',   iconBg: 'bg-slate-100'  },
};

const GENDER_OPTIONS = [
  { value: '', label: 'Chưa chọn' },
  { value: 'male',   label: 'Nam'  },
  { value: 'female', label: 'Nữ'   },
  { value: 'other',  label: 'Khác' },
];

const paymentLabels = {
  cod: 'Tiền mặt (COD)',
  qr: 'QR Code',
  card: 'Thẻ ngân hàng',
  bank_transfer: 'Chuyển khoản',
};

const emptyProfileForm = {
  full_name: '', phone: '', bio: '', gender: '', date_of_birth: '',
};
const emptyPasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
const emptyOrderForm    = { shipping_address: '', shipping_city: '', shipping_phone: '', payment_method: 'cod', notes: '' };
const emptyAddressForm  = { full_name: '', phone: '', address: '', province: '', district: '', ward: '', is_default: false };

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const canModifyOrder = (order) => String(order?.status || '').toLowerCase() === 'pending';

// Nén ảnh về tối đa maxDim×maxDim, trả về data URL (JPEG)
const compressImage = (file, maxDim = 320, quality = 0.85) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = objectUrl;
  });

// ---- Shared UI helpers ----

const inputCls = (hasError) =>
  `mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all focus:ring-4 ${
    hasError
      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
      : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
  }`;

const FieldInput = ({ label, error, children }) => (
  <label className="block">
    <span className="text-sm font-semibold text-slate-700">{label}</span>
    {children}
    {error && <p className="mt-1.5 text-xs font-semibold text-rose-600">{error}</p>}
  </label>
);

// Trường chỉ đọc (username, email — không cho chỉnh)
const ReadOnlyField = ({ label, value }) => (
  <div>
    <span className="text-sm font-semibold text-slate-700">{label}</span>
    <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
      <span className="flex-1 truncate">{value || '—'}</span>
      <Lock size={13} className="shrink-0 text-slate-300" />
    </div>
  </div>
);

// ============================================================
// Main Component
// ============================================================
const Profile = () => {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const avatarInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState(location.state?.tab || 'info');
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [orders, setOrders] = useState([]);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Ảnh đại diện đang được preview (data URL mới chọn, chưa lưu)
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Delivery profiles
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressErrors, setAddressErrors] = useState({});

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [message, setMessage] = useState(
    location.state?.successMessage ? { type: 'success', text: location.state.successMessage } : null
  );
  const [profilePhoneError, setProfilePhoneError] = useState('');
  const [orderPhoneError, setOrderPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const displayUser = profile || user;
  const displayName = displayUser?.full_name || displayUser?.username || 'Người dùng';
  const userInitial = displayName.charAt(0).toUpperCase();
  const pendingOrders = useMemo(() => orders.filter((o) => canModifyOrder(o)).length, [orders]);
  // Ưu tiên hiển thị: preview mới chọn > avatar_url đã lưu
  const avatarSrc = avatarPreview || displayUser?.avatar_url || null;

  useEffect(() => {
    loadProfile();
    loadOrders();
    loadAddresses();
  }, []);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const data = await getUserProfile();
      setProfile(data);
      setProfileForm({
        full_name:     data.full_name     || '',
        phone:         data.phone         || '',
        bio:           data.bio           || '',
        gender:        data.gender        || '',
        date_of_birth: data.date_of_birth || '',
      });
      updateUser(data);
    } catch (err) {
      setMessage({ type: 'error', text: safeText(err.detail, 'Không thể tải thông tin cá nhân') });
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      setOrders(await getUserOrders());
    } catch (err) {
      setMessage({ type: 'error', text: safeText(err.detail, 'Không thể tải danh sách đơn hàng') });
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);
      setAddresses(await getDeliveryProfiles());
    } catch {
      // Lỗi load địa chỉ không block UI
    } finally {
      setLoadingAddresses(false);
    }
  };

  // ---- Avatar handler ----
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB.' });
      return;
    }
    try {
      const compressed = await compressImage(file, 320, 0.85);
      setAvatarPreview(compressed);
    } catch {
      setMessage({ type: 'error', text: 'Không thể đọc file ảnh. Vui lòng thử lại.' });
    }
    e.target.value = ''; // reset để có thể chọn lại cùng file
  };

  // ---- Profile handlers ----
  const handleProfileChange = (field, value) => {
    if (field === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setProfileForm((p) => ({ ...p, phone: digits }));
      setProfilePhoneError(digits && !VN_PHONE_REGEX.test(digits) ? 'Số điện thoại không hợp lệ' : '');
      return;
    }
    setProfileForm((p) => ({ ...p, [field]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (profileForm.phone && !VN_PHONE_REGEX.test(profileForm.phone)) {
      setProfilePhoneError('Số điện thoại không hợp lệ');
      return;
    }
    setSavingProfile(true);
    setMessage(null);
    try {
      // Luôn gửi avatar_url nếu đang có preview mới (bất kể trước đó đã có ảnh hay chưa)
      const payload = avatarPreview
        ? { ...profileForm, avatar_url: avatarPreview }
        : { ...profileForm };

      const updated = await updateUserProfile(payload);
      setProfile(updated);
      updateUser(updated);
      setAvatarPreview(null); // clear preview sau khi lưu thành công
      setMessage({ type: 'success', text: 'Đã cập nhật thông tin cá nhân' });
    } catch (err) {
      setMessage({ type: 'error', text: safeText(err.detail, 'Cập nhật thông tin thất bại') });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setMessage(null);
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Vui lòng nhập đầy đủ thông tin mật khẩu.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    setSavingPassword(true);
    try {
      const result = await changePassword({
        current_password: passwordForm.currentPassword,
        new_password:     passwordForm.newPassword,
      });
      setPasswordForm(emptyPasswordForm);
      setMessage({ type: 'success', text: safeText(result?.message, 'Đổi mật khẩu thành công') });
    } catch (err) {
      setPasswordError(safeText(err?.detail, 'Không thể đổi mật khẩu'));
    } finally {
      setSavingPassword(false);
    }
  };

  // ---- Order handlers ----
  const startEditOrder = (order) => {
    setEditingOrderId(order.id);
    setOrderForm({
      shipping_address: order.shipping_address || '',
      shipping_city:    order.shipping_city    || '',
      shipping_phone:   order.shipping_phone   || '',
      payment_method:   order.payment_method   || 'cod',
      notes:            order.notes            || '',
    });
    setOrderPhoneError('');
  };

  const handleOrderChange = (field, value) => {
    if (field === 'shipping_phone') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setOrderForm((p) => ({ ...p, shipping_phone: digits }));
      setOrderPhoneError(digits && !VN_PHONE_REGEX.test(digits) ? 'Số điện thoại không hợp lệ' : '');
      return;
    }
    setOrderForm((p) => ({ ...p, [field]: value }));
  };

  const handleOrderSubmit = async (e, order) => {
    e.preventDefault();
    if (!VN_PHONE_REGEX.test(orderForm.shipping_phone)) {
      setOrderPhoneError('Số điện thoại không hợp lệ');
      return;
    }
    setSavingOrder(true);
    setMessage(null);
    try {
      const updated = await updateUserOrder(order.id, orderForm);
      setOrders((prev) => prev.map((item) => (item.id === order.id ? updated : item)));
      setEditingOrderId(null);
      setMessage({ type: 'success', text: 'Đã cập nhật đơn hàng' });
    } catch (err) {
      setMessage({ type: 'error', text: safeText(err.detail, 'Không thể cập nhật đơn hàng') });
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
      setOrders((prev) => prev.map((item) => (item.id === order.id ? { ...item, status: 'cancelled' } : item)));
      setEditingOrderId(null);
      setMessage({ type: 'success', text: 'Đã hủy đơn hàng' });
    } catch (err) {
      setMessage({ type: 'error', text: safeText(err.detail, 'Không thể hủy đơn hàng') });
    } finally {
      setSavingOrder(false);
    }
  };

  // ---- Address handlers ----
  const validateAddressForm = (form) => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Vui lòng nhập họ tên';
    if (!VN_PHONE_REGEX.test(form.phone)) errs.phone = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)';
    if (!form.province) errs.province = 'Vui lòng chọn tỉnh/thành phố';
    if (!form.address.trim()) errs.address = 'Vui lòng nhập địa chỉ cụ thể';
    return errs;
  };

  // Chuyển đổi form state (có province/district) sang payload API (city/address)
  // Ghép địa chỉ đầy đủ: địa chỉ cụ thể + phường/xã + quận/huyện → lưu vào address
  const buildAddressPayload = (form) => ({
    full_name:  form.full_name,
    phone:      form.phone,
    city:       form.province,
    address:    [form.address, form.ward, form.district].filter(Boolean).join(', '),
    is_default: form.is_default,
  });

  const handleAddAddress = async () => {
    const errs = validateAddressForm(addressForm);
    if (Object.keys(errs).length > 0) { setAddressErrors(errs); return; }
    setSavingAddress(true);
    setAddressErrors({});
    try {
      const created = await createDeliveryProfile(buildAddressPayload(addressForm));
      setAddresses((prev) => {
        const base = addressForm.is_default ? prev.map((a) => ({ ...a, is_default: false })) : prev;
        return [created, ...base].sort((a, b) => b.is_default - a.is_default);
      });
      setShowAddAddressForm(false);
      setAddressForm(emptyAddressForm);
      setMessage({ type: 'success', text: 'Đã thêm địa chỉ mới' });
    } catch (err) {
      setAddressErrors({ global: safeText(err.detail, 'Không thể lưu địa chỉ') });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleUpdateAddress = async (id) => {
    const errs = validateAddressForm(addressForm);
    if (Object.keys(errs).length > 0) { setAddressErrors(errs); return; }
    setSavingAddress(true);
    setAddressErrors({});
    try {
      const updated = await updateDeliveryProfile(id, buildAddressPayload(addressForm));
      setAddresses((prev) =>
        prev
          .map((a) => a.id === id ? updated : (addressForm.is_default ? { ...a, is_default: false } : a))
          .sort((a, b) => b.is_default - a.is_default)
      );
      setEditingAddressId(null);
      setMessage({ type: 'success', text: 'Đã cập nhật địa chỉ' });
    } catch (err) {
      setAddressErrors({ global: safeText(err.detail, 'Không thể cập nhật địa chỉ') });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Xóa địa chỉ này?')) return;
    try {
      await deleteDeliveryProfile(id);
      setAddresses((prev) => {
        const remaining = prev.filter((a) => a.id !== id);
        // Nếu xóa địa chỉ default và còn địa chỉ khác, tự đặt default cho cái đầu tiên
        if (prev.find((a) => a.id === id)?.is_default && remaining.length > 0) {
          remaining[0] = { ...remaining[0], is_default: true };
        }
        return remaining;
      });
      setMessage({ type: 'success', text: 'Đã xóa địa chỉ' });
    } catch (err) {
      setMessage({ type: 'error', text: safeText(err.detail, 'Không thể xóa địa chỉ') });
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultDeliveryProfile(id);
      setAddresses((prev) =>
        prev
          .map((a) => ({ ...a, is_default: a.id === id }))
          .sort((a, b) => b.is_default - a.is_default)
      );
      setMessage({ type: 'success', text: 'Đã đặt địa chỉ mặc định' });
    } catch (err) {
      setMessage({ type: 'error', text: safeText(err.detail, 'Không thể đặt mặc định') });
    }
  };

  const startEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    // city trong DB chứa tên tỉnh; district không lưu riêng nên reset về ''
    setAddressForm({
      full_name:  addr.full_name,
      phone:      addr.phone,
      address:    addr.address,
      province:   addr.city || '',
      district:   '',
      ward:       '',
      is_default: addr.is_default,
    });
    setAddressErrors({});
    setShowAddAddressForm(false);
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="min-h-screen app-page-bg font-sans">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        {/* ===== Profile Hero Card ===== */}
        <section className="relative mb-8 overflow-hidden rounded-[32px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
          <div className="h-28 bg-[linear-gradient(135deg,#0f9a62_0%,#19b97c_48%,#d8a934_100%)]" />
          <div className="px-6 pb-6 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

              {/* Avatar (display only — editing is inside the Info tab) */}
              <div className="flex items-end gap-4 -mt-12">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[26px] border-4 border-white shadow-[0_20px_40px_rgba(15,23,42,0.18)]">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-700 text-3xl font-black text-white">
                      {userInitial}
                    </div>
                  )}
                </div>
                <div className="mb-1 min-w-0">
                  <h1 className="truncate text-xl font-black text-slate-950 sm:text-2xl">{displayName}</h1>
                  <p className="text-sm text-slate-400">@{displayUser?.username}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-2 pb-1">
                <StatChip label="Đơn hàng"     value={orders.length}    color="slate"   />
                <StatChip label="Chờ xác nhận" value={pendingOrders}    color="amber"   />
                <StatChip label="Địa chỉ"      value={addresses.length} color="emerald" />
                <StatChip label="Điểm thưởng"  value={displayUser?.loyalty_points || 0} color="amber" />
                <StatChip label="Voucher"      value={formatCurrency(displayUser?.voucher_balance || 0)} color="emerald" />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <span className="text-sm text-slate-500">{displayUser?.email}</span>
              {displayUser?.is_admin ? (
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-700">
                  Quản trị viên
                </span>
              ) : displayUser?.role === 'staff' ? (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                  Nhân viên
                </span>
              ) : (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  Khách hàng
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ===== Message Banner ===== */}
        {message && (
          <div className={`mb-6 flex items-center justify-between gap-3 rounded-2xl border px-5 py-3.5 text-sm font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${
            message.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            <span>{message.text}</span>
            <button type="button" onClick={() => setMessage(null)} className="shrink-0 opacity-60 hover:opacity-100 transition">
              <X size={16} />
            </button>
          </div>
        )}

        {/* ===== Tabs ===== */}
        <div className="mb-8 flex gap-1 rounded-[24px] border border-[color:var(--line-soft)] bg-white p-1.5 shadow-[var(--shadow-soft)]">
          {[
            { key: 'info',      label: 'Thông tin',  icon: UserRound   },
            { key: 'addresses', label: 'Sổ địa chỉ', icon: BookMarked  },
            { key: 'orders',    label: 'Đơn hàng',   icon: ShoppingBag },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all ${
                activeTab === key
                  ? 'bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* ======== Tab: Thông tin cá nhân ======== */}
        {activeTab === 'info' && (
          <div className="space-y-6">

            {/* ---- Card: Hồ sơ cá nhân (có thể chỉnh sửa) ---- */}
            <form
              onSubmit={handleProfileSubmit}
              className="rounded-3xl border border-slate-100 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.07)]"
            >
              {/* Card header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 sm:px-8">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <UserRound size={17} className="text-emerald-600" />
                    Thông tin cá nhân
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">Cập nhật ảnh và thông tin cá nhân của bạn</p>
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {savingProfile ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                  Lưu thông tin
                </button>
              </div>

              {/* Card body */}
              {loadingProfile ? (
                <div className="flex items-center gap-2 p-8 text-sm text-slate-400">
                  <Loader2 className="animate-spin" size={16} /> Đang tải...
                </div>
              ) : (
                <div className="flex flex-col gap-8 p-6 sm:flex-row sm:p-8">

                  {/* Avatar column */}
                  <div className="flex flex-col items-center gap-3 sm:w-36 sm:shrink-0">
                    {/* Hidden file input */}
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    {/* Avatar button with camera overlay */}
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="group relative block h-28 w-28 overflow-hidden rounded-2xl border-2 border-slate-200 shadow-md transition focus:outline-none focus:ring-4 focus:ring-emerald-400 focus:ring-offset-2"
                      title="Nhấn để đổi ảnh đại diện"
                    >
                      {avatarSrc ? (
                        <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-700 text-4xl font-black text-white">
                          {userInitial}
                        </div>
                      )}
                      {/* Camera overlay khi hover */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <Camera size={24} className="text-white" />
                        <span className="text-[11px] font-bold text-white">Đổi ảnh</span>
                      </div>
                    </button>

                    <p className="text-center text-[11px] text-slate-400 leading-tight">
                      JPG, PNG tối đa 5MB
                    </p>

                    {/* Badge + nút huỷ khi đang preview ảnh mới */}
                    {avatarPreview && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                          Chưa lưu
                        </span>
                        <button
                          type="button"
                          onClick={() => setAvatarPreview(null)}
                          className="text-xs font-semibold text-slate-400 hover:text-rose-500 transition"
                        >
                          Huỷ ảnh mới
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Fields grid */}
                  <div className="flex-1 grid gap-4 sm:grid-cols-2">

                    {/* Read-only: Tên đăng nhập */}
                    <ReadOnlyField label="Tên đăng nhập" value={displayUser?.username} />

                    {/* Read-only: Email */}
                    <ReadOnlyField label="Email" value={displayUser?.email} />

                    {/* Editable: Tên hiển thị */}
                    <FieldInput label="Tên hiển thị">
                      <input
                        value={profileForm.full_name}
                        onChange={(e) => handleProfileChange('full_name', e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className={inputCls(false)}
                      />
                    </FieldInput>

                    {/* Editable: Số điện thoại */}
                    <FieldInput label="Số điện thoại" error={profilePhoneError}>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => handleProfileChange('phone', e.target.value)}
                        placeholder="0900000000"
                        className={inputCls(!!profilePhoneError)}
                      />
                    </FieldInput>

                    {/* Editable: Giới tính */}
                    <FieldInput label="Giới tính">
                      <select
                        value={profileForm.gender}
                        onChange={(e) => handleProfileChange('gender', e.target.value)}
                        className={inputCls(false)}
                      >
                        {GENDER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </FieldInput>

                    {/* Editable: Ngày sinh */}
                    <FieldInput label="Ngày sinh">
                      <input
                        type="date"
                        value={profileForm.date_of_birth}
                        onChange={(e) => handleProfileChange('date_of_birth', e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className={inputCls(false)}
                      />
                    </FieldInput>

                    {/* Editable: Ghi chú */}
                    <label className="block sm:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">Ghi chú cá nhân</span>
                      <textarea
                        value={profileForm.bio}
                        onChange={(e) => handleProfileChange('bio', e.target.value)}
                        rows={3}
                        placeholder="Thông tin bổ sung..."
                        className={`${inputCls(false)} resize-none`}
                      />
                    </label>
                  </div>
                </div>
              )}
            </form>

            {/* ---- Card: Đổi mật khẩu ---- */}
            <form
              onSubmit={handlePasswordSubmit}
              className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.07)] sm:p-8"
            >
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <Lock size={16} className="text-slate-500" />
                    Đổi mật khẩu
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">Nhập đầy đủ để cập nhật mật khẩu mới</p>
                </div>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                >
                  {savingPassword ? <Loader2 className="animate-spin" size={15} /> : <Lock size={15} />}
                  Cập nhật
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FieldInput label="Mật khẩu hiện tại">
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    className={inputCls(false)}
                    required
                  />
                </FieldInput>
                <FieldInput label="Mật khẩu mới">
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                    className={inputCls(false)}
                    required
                  />
                </FieldInput>
                <FieldInput label="Xác nhận mật khẩu mới">
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    className={inputCls(false)}
                    required
                  />
                </FieldInput>
              </div>

              {passwordError && (
                <p className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600">
                  {passwordError}
                </p>
              )}
            </form>
          </div>
        )}

        {/* ======== Tab: Sổ địa chỉ ======== */}
        {activeTab === 'addresses' && (
          <section className="rounded-3xl border border-slate-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <BookMarked size={17} className="text-emerald-600" />
                  Sổ địa chỉ
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">Lưu nhiều địa chỉ để checkout nhanh hơn</p>
              </div>
              {!showAddAddressForm && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAddressForm(true);
                    setEditingAddressId(null);
                    setAddressForm(emptyAddressForm);
                    setAddressErrors({});
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  <Plus size={16} />
                  Thêm địa chỉ
                </button>
              )}
            </div>

            <div className="p-6">
              {loadingAddresses ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="animate-spin" size={16} /> Đang tải...
                </div>
              ) : (
                <>
                  {showAddAddressForm && (
                    <AddressFormCard
                      title="Thêm địa chỉ mới"
                      form={addressForm}
                      errors={addressErrors}
                      saving={savingAddress}
                      onChange={(field, value) => setAddressForm((p) => ({ ...p, [field]: value }))}
                      onSave={handleAddAddress}
                      onCancel={() => { setShowAddAddressForm(false); setAddressErrors({}); }}
                    />
                  )}

                  {addresses.length === 0 && !showAddAddressForm && (
                    <div className="py-16 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                        <MapPin size={28} className="text-slate-400" />
                      </div>
                      <h3 className="text-base font-semibold text-slate-800">Chưa có địa chỉ nào</h3>
                      <p className="mt-1 text-sm text-slate-400">Thêm địa chỉ để checkout nhanh hơn.</p>
                    </div>
                  )}

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {addresses.map((addr) =>
                      editingAddressId === addr.id ? (
                        <div key={addr.id} className="sm:col-span-2">
                          <AddressFormCard
                            title="Chỉnh sửa địa chỉ"
                            form={addressForm}
                            errors={addressErrors}
                            saving={savingAddress}
                            onChange={(field, value) => setAddressForm((p) => ({ ...p, [field]: value }))}
                            onSave={() => handleUpdateAddress(addr.id)}
                            onCancel={() => { setEditingAddressId(null); setAddressErrors({}); }}
                          />
                        </div>
                      ) : (
                        <div
                          key={addr.id}
                          className={`flex flex-col justify-between gap-4 rounded-2xl border-2 p-5 transition-colors ${
                            addr.is_default
                              ? 'border-emerald-300 bg-emerald-50/50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${addr.is_default ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                              <MapPin size={17} className={addr.is_default ? 'text-emerald-600' : 'text-slate-500'} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-bold text-slate-900">{addr.full_name}</p>
                                {addr.is_default && (
                                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                    Mặc định
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                                <Phone size={11} className="shrink-0" /> {addr.phone}
                              </p>
                              <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">
                                {addr.address}, {addr.city}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                            {!addr.is_default && (
                              <button
                                type="button"
                                onClick={() => handleSetDefault(addr.id)}
                                className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                              >
                                Đặt mặc định
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startEditAddress(addr)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                            >
                              <Edit3 size={12} /> Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                            >
                              <Trash2 size={12} /> Xóa
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* ======== Tab: Đơn hàng ======== */}
        {activeTab === 'orders' && (
          <section className="rounded-3xl border border-slate-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <ShoppingBag size={17} className="text-emerald-600" />
                  Lịch sử đơn hàng
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">Đơn chờ xác nhận có thể sửa hoặc hủy</p>
              </div>
              <button
                type="button"
                onClick={loadOrders}
                disabled={loadingOrders}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <ClipboardList size={15} />
                Tải lại
              </button>
            </div>

            {loadingOrders ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
                <Loader2 className="animate-spin" size={20} /> Đang tải đơn hàng...
              </div>
            ) : orders.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <PackageCheck size={28} className="text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-800">Chưa có đơn hàng</h3>
                <p className="mt-1 text-sm text-slate-400">Các đơn hàng sau khi checkout sẽ hiển thị tại đây.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const isEditing  = editingOrderId  === order.id;
                  const isExpanded = expandedOrderId === order.id;
                  const statusKey  = String(order.status || '').toLowerCase();
                  const statusCfg  = STATUS_CONFIG[statusKey] || STATUS_CONFIG.returned;
                  const canModify  = canModifyOrder(order);

                  return (
                    <article key={order.id} className="p-5 transition-colors hover:bg-slate-50/50 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${statusCfg.iconBg}`}>
                            <span className={`h-2.5 w-2.5 rounded-full ${statusCfg.dot}`} />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black tracking-tight text-slate-900">
                                {order.order_number || `#${order.id}`}
                              </span>
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${statusCfg.cls}`}>
                                {normalizeOrderStatus(order.status)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-400">Đặt ngày {formatDate(order.created_at)}</p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Truck size={11} className="text-slate-400" />
                                {order.shipping_phone || '—'}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin size={11} className="text-slate-400" />
                                {[order.shipping_address, order.shipping_city].filter(Boolean).join(', ') || '—'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Wallet size={11} className="text-slate-400" />
                                {paymentLabels[order.payment_method] || order.payment_method || '—'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                          <p className="text-lg font-black text-emerald-700">{formatCurrency(order.total)}</p>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                            >
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                            </button>
                            {canModify && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditOrder(order)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                                >
                                  <Edit3 size={12} /> Sửa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelOrder(order)}
                                  disabled={savingOrder}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60 transition"
                                >
                                  <X size={12} /> Hủy
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {order.freshness_confirmation_available && (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-black text-amber-900">
                                Đơn hàng đã giao. Chụp ảnh để xác nhận độ tươi và nhận {order.freshness_reward_points || 50} điểm thưởng.
                              </p>
                              <p className="mt-1 text-xs font-semibold text-amber-700">
                                Hạn xác nhận đến {order.freshness_confirmation_expires_at ? new Date(order.freshness_confirmation_expires_at).toLocaleString('vi-VN') : '24 giờ sau giao hàng'}.
                              </p>
                            </div>
                            <Link
                              to={`/orders/${order.id}/confirm-freshness`}
                              className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-amber-600"
                            >
                              Xác nhận độ tươi
                            </Link>
                          </div>
                        </div>
                      )}

                      {order.freshness_confirmation_completed && (
                        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                          Bạn đã hoàn tất xác nhận độ tươi cho đơn hàng này.
                        </div>
                      )}

                      {order.freshness_confirmation_expired && (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                          Đơn hàng đã quá hạn 24 giờ nên không còn mở xác nhận độ tươi.
                        </div>
                      )}

                      {/* Chi tiết sản phẩm */}
                      {isExpanded && (
                        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Sản phẩm</th>
                                <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">SL</th>
                                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Đơn giá</th>
                                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Thành tiền</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {order.items.length > 0 ? order.items.map((item) => (
                                <tr key={item.id || `${order.id}-${item.product_id}`} className="hover:bg-slate-50/60">
                                  <td className="px-4 py-3 font-medium text-slate-800">{item.product_name}</td>
                                  <td className="px-4 py-3 text-center text-slate-600">×{item.quantity}</td>
                                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.price_at_purchase)}</td>
                                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                    {formatCurrency(item.subtotal || item.price_at_purchase * item.quantity)}
                                  </td>
                                </tr>
                              )) : (
                                <tr>
                                  <td colSpan={4} className="px-4 py-4 text-center text-xs text-slate-400">
                                    Không có dữ liệu sản phẩm
                                  </td>
                                </tr>
                              )}
                            </tbody>
                            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                              <tr>
                                <td colSpan={3} className="px-4 py-2 text-right text-xs font-semibold text-slate-400">Tạm tính</td>
                                <td className="px-4 py-2 text-right font-semibold text-slate-700">{formatCurrency(order.subtotal)}</td>
                              </tr>
                              {Number(order.shipping_fee) > 0 && (
                                <tr>
                                  <td colSpan={3} className="px-4 py-2 text-right text-xs font-semibold text-slate-400">Phí vận chuyển</td>
                                  <td className="px-4 py-2 text-right font-semibold text-slate-700">{formatCurrency(order.shipping_fee)}</td>
                                </tr>
                              )}
                              <tr>
                                <td colSpan={3} className="px-4 py-3 text-right text-sm font-black text-slate-800">Tổng cộng</td>
                                <td className="px-4 py-3 text-right text-base font-black text-emerald-700">{formatCurrency(order.total)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}

                      {/* Form chỉnh sửa đơn hàng */}
                      {isEditing && (
                        <form
                          onSubmit={(e) => handleOrderSubmit(e, order)}
                          className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5"
                        >
                          <p className="mb-4 text-sm font-bold text-slate-800">Chỉnh sửa thông tin giao hàng</p>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <FieldInput label="Địa chỉ giao hàng">
                              <input
                                value={orderForm.shipping_address}
                                onChange={(e) => handleOrderChange('shipping_address', e.target.value)}
                                className={inputCls(false)}
                              />
                            </FieldInput>
                            <FieldInput label="Thành phố">
                              <input
                                value={orderForm.shipping_city}
                                onChange={(e) => handleOrderChange('shipping_city', e.target.value)}
                                className={inputCls(false)}
                              />
                            </FieldInput>
                            <FieldInput label="Số điện thoại" error={orderPhoneError}>
                              <input
                                type="tel"
                                value={orderForm.shipping_phone}
                                onChange={(e) => handleOrderChange('shipping_phone', e.target.value)}
                                className={inputCls(!!orderPhoneError)}
                              />
                            </FieldInput>
                            <FieldInput label="Thanh toán">
                              <select
                                value={orderForm.payment_method}
                                onChange={(e) => handleOrderChange('payment_method', e.target.value)}
                                className={inputCls(false)}
                              >
                                <option value="cod">Tiền mặt (COD)</option>
                                <option value="qr">QR Code</option>
                                <option value="bank_transfer">Chuyển khoản</option>
                              </select>
                            </FieldInput>
                            <label className="block sm:col-span-2">
                              <span className="text-sm font-semibold text-slate-700">Ghi chú</span>
                              <textarea
                                value={orderForm.notes}
                                onChange={(e) => handleOrderChange('notes', e.target.value)}
                                rows={2}
                                className={`${inputCls(false)} resize-none`}
                              />
                            </label>
                          </div>
                          <div className="mt-4 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingOrderId(null)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white transition"
                            >
                              <X size={14} /> Đóng
                            </button>
                            <button
                              type="submit"
                              disabled={savingOrder}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                            >
                              {savingOrder ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
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

// ============================================================
// Sub-components
// ============================================================

const StatChip = ({ label, value, color }) => {
  const colorMap = {
    slate:   'bg-slate-50  text-slate-900',
    amber:   'bg-amber-50  text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <div className={`min-w-[72px] rounded-[22px] border border-white/60 px-4 py-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.05)] ${colorMap[color] || colorMap.slate}`}>
      <p className="text-xl font-black leading-none">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-60">{label}</p>
    </div>
  );
};

// Shared input class cho AddressFormCard (nhỏ hơn một chút so với inputCls chính)
const addrInputCls = (hasError) =>
  `mt-1 w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all focus:ring-4 ${
    hasError ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
  }`;

const AddressFormCard = ({ title, form, errors, saving, onChange, onSave, onCancel }) => {
  const districts = getDistricts(form.province);
  const wards     = getWards(form.district);

  const handleProvinceChange = (e) => {
    onChange('province', e.target.value);
    onChange('district', '');
    onChange('ward', '');
  };

  const handleDistrictChange = (e) => {
    onChange('district', e.target.value);
    onChange('ward', ''); // reset phường khi đổi quận
  };

  return (
    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
      <p className="mb-4 text-sm font-bold text-slate-800">{title}</p>
      {errors.global && (
        <p className="mb-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600">{errors.global}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">

        {/* Họ tên */}
        <div>
          <label className="text-xs font-semibold text-slate-600">
            Họ và tên <span className="text-rose-500">*</span>
          </label>
          <input
            value={form.full_name}
            onChange={(e) => onChange('full_name', e.target.value)}
            placeholder="Nguyễn Văn A"
            className={addrInputCls(!!errors.full_name)}
          />
          {errors.full_name && <p className="mt-1 text-xs text-rose-600">{errors.full_name}</p>}
        </div>

        {/* Số điện thoại */}
        <div>
          <label className="text-xs font-semibold text-slate-600">
            Số điện thoại <span className="text-rose-500">*</span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => onChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="0900000000"
            className={addrInputCls(!!errors.phone)}
          />
          {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
        </div>

        {/* Dropdown Tỉnh/Thành phố */}
        <div>
          <label className="text-xs font-semibold text-slate-600">
            Tỉnh / Thành phố <span className="text-rose-500">*</span>
          </label>
          <select
            value={form.province}
            onChange={handleProvinceChange}
            className={addrInputCls(!!errors.province)}
          >
            <option value="">-- Chọn tỉnh/thành phố --</option>
            {VN_PROVINCES.map((p) => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
          {errors.province && <p className="mt-1 text-xs text-rose-600">{errors.province}</p>}
        </div>

        {/* Dropdown Quận/Huyện */}
        <div>
          <label className="text-xs font-semibold text-slate-600">Quận / Huyện</label>
          <select
            value={form.district}
            onChange={handleDistrictChange}
            disabled={!form.province}
            className={`${addrInputCls(false)} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
          >
            <option value="">-- Chọn quận/huyện --</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Dropdown Phường/Xã/Thị trấn */}
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600">Phường / Xã / Thị trấn</label>
          {wards.length > 0 ? (
            <select
              value={form.ward}
              onChange={(e) => onChange('ward', e.target.value)}
              className={addrInputCls(false)}
            >
              <option value="">-- Chọn phường/xã/thị trấn --</option>
              {wards.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          ) : (
            <input
              value={form.ward}
              onChange={(e) => onChange('ward', e.target.value)}
              placeholder={form.district ? 'Nhập tên phường/xã/thị trấn' : 'Chọn quận/huyện trước'}
              disabled={!form.district}
              className={`${addrInputCls(false)} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
            />
          )}
        </div>

        {/* Địa chỉ cụ thể */}
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600">
            Địa chỉ cụ thể <span className="text-rose-500">*</span>
          </label>
          <input
            value={form.address}
            onChange={(e) => onChange('address', e.target.value)}
            placeholder="Số nhà, tên đường, phường/xã..."
            className={addrInputCls(!!errors.address)}
          />
          {errors.address && <p className="mt-1 text-xs text-rose-600">{errors.address}</p>}
        </div>

        {/* Checkbox mặc định */}
        <label className="flex cursor-pointer items-center gap-2 self-center">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) => onChange('is_default', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
          />
          <span className="text-xs font-semibold text-slate-700">Đặt làm địa chỉ mặc định</span>
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
        >
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          Lưu địa chỉ
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          Hủy
        </button>
      </div>
    </div>
  );
};

export default Profile;
