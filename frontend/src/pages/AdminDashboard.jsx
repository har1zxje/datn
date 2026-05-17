import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Loader2,
  PackagePlus,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  TrendingUp,
  UsersRound,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  addProduct,
  deleteOrder,
  deleteUser,
  getAdminStats,
  getAllOrders,
  getAllUsers,
  normalizeOrderStatus,
  updateOrderStatus,
} from '../services/api';

const ORDER_STATUSES = [
  ['pending', 'Chờ xác nhận'],
  ['confirmed', 'Đã xác nhận'],
  ['shipped', 'Đang giao'],
  ['delivered', 'Đã giao'],
  ['cancelled', 'Đã hủy'],
];

const statusClasses = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  confirmed: 'bg-sky-50 text-sky-700 ring-sky-200',
  shipped: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  returned: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const tabs = [
  ['dashboard', 'Tổng quan', BarChart3],
  ['users', 'Người dùng', UsersRound],
  ['orders', 'Đơn hàng', ClipboardList],
  ['products', 'Sản phẩm', PackagePlus],
];

const money = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
};

const getLast7DayRevenue = (orders = []) => {
  const now = new Date();
  const buckets = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);

    const key = day.toISOString().slice(0, 10);
    buckets.push({
      key,
      label: day.toLocaleDateString('vi-VN', { weekday: 'short' }),
      value: 0,
    });
  }

  const revenueMap = new Map(buckets.map((item) => [item.key, item]));

  orders.forEach((order) => {
    const createdAt = order?.created_at ? new Date(order.created_at) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return;

    const localKey = new Date(
      createdAt.getFullYear(),
      createdAt.getMonth(),
      createdAt.getDate()
    )
      .toISOString()
      .slice(0, 10);

    if (revenueMap.has(localKey)) {
      revenueMap.get(localKey).value += Number(order.total || 0);
    }
  });

  return buckets.map((item) => ({
    label: item.label,
    value: Math.round(item.value),
  }));
};

const RevenueLineChart = ({ data }) => {
  const width = 620;
  const height = 210;
  const padding = 24;
  const max = Math.max(...data.map((item) => item.value), 1);
  const step = (width - padding * 2) / Math.max(data.length - 1, 1);
  const points = data.map((item, index) => {
    const x = padding + index * step;
    const y = height - padding - (item.value / max) * (height - padding * 2);
    return { ...item, x, y };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${padding},${height - padding} ${polyline} ${width - padding},${height - padding}`;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-slate-50 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
        <defs>
          <linearGradient id="revenueArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = padding + line * ((height - padding * 2) / 3);
          return (
            <line
              key={line}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeDasharray="6 6"
            />
          );
        })}
        <polygon points={area} fill="url(#revenueArea)" />
        <polyline points={polyline} fill="none" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="6" fill="#ffffff" stroke="#16a34a" strokeWidth="4" />
            <text x={point.x} y={height - 4} textAnchor="middle" className="fill-slate-500 text-[12px] font-semibold">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const StatCard = ({ title, value, note, icon: Icon, tone }) => (
  <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(15,23,42,0.10)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{note}</p>
      </div>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
        <Icon size={23} />
      </span>
    </div>
  </div>
);

const OperationMetric = ({ label, value, badge, tone, icon: Icon }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.icon}`}>
          <Icon size={19} />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-900">{label}</p>
          <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${tone.badge}`}>
            {badge}
          </span>
        </div>
      </div>
      <span className="text-lg font-black text-slate-950">{value}%</span>
    </div>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const QuickActionButton = ({ icon: Icon, title, desc, onClick, tone }) => (
  <button
    type="button"
    onClick={onClick}
    className="group rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_18px_42px_rgba(15,23,42,0.10)]"
  >
    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
      <Icon size={22} />
    </span>
    <p className="mt-4 text-base font-black text-slate-950">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{desc}</p>
  </button>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    stock: '',
    unit: '',
  });

  const pendingOrders = useMemo(
    () => orders.filter((order) => String(order.status).toLowerCase() === 'pending').length,
    [orders]
  );

  const revenueTrend = useMemo(() => {
    return getLast7DayRevenue(orders);
  }, [orders]);

  useEffect(() => {
    if (user?.is_admin) {
      loadDashboardData();
    }
  }, [user]);

  const run = async (fn) => {
    setLoading(true);
    setMessage(null);
    try {
      return await fn();
    } catch (err) {
      const detail = err.detail || err.message || '';
      const isAuthError =
        err.status === 401 ||
        err.response?.status === 401 ||
        detail.toLowerCase().includes('đăng nhập') ||
        detail.toLowerCase().includes('token') ||
        detail.toLowerCase().includes('phiên');

      setMessage({
        type: 'error',
        text: isAuthError
          ? 'Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.'
          : detail || 'Có lỗi xảy ra khi tải dữ liệu dashboard.',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadStats = () => run(async () => {
    setStats(await getAdminStats());
  });

  const loadDashboardData = () => run(async () => {
    const [nextStats, nextOrders] = await Promise.all([
      getAdminStats(),
      getAllOrders(),
    ]);
    setStats(nextStats);
    setOrders(nextOrders);
  });

  const loadUsers = () => run(async () => {
    setUsers(await getAllUsers());
  });

  const loadOrders = () => run(async () => {
    setOrders(await getAllOrders());
  });

  const switchTab = async (tab) => {
    setActiveTab(tab);
    if (tab === 'dashboard') await loadDashboardData();
    if (tab === 'users') await loadUsers();
    if (tab === 'orders') await loadOrders();
  };

  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`Xóa người dùng ${targetUser.username}?`)) return;
    await run(async () => {
      await deleteUser(targetUser.id);
      setUsers((prev) => prev.filter((item) => item.id !== targetUser.id));
      setMessage({ type: 'success', text: 'Đã xóa người dùng' });
    });
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    await run(async () => {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) => prev.map((order) => (
        order.id === orderId ? { ...order, status: newStatus } : order
      )));
      setMessage({ type: 'success', text: 'Đã cập nhật trạng thái đơn hàng' });
    });
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm(`Xóa đơn hàng #${orderId}?`)) return;
    await run(async () => {
      await deleteOrder(orderId);
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setMessage({ type: 'success', text: 'Đã xóa đơn hàng' });
    });
  };

  const handleAddProduct = async (event) => {
    event.preventDefault();
    await run(async () => {
      await addProduct({
        ...newProduct,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock || 0),
        unit: newProduct.unit || 'kg',
      });
      setNewProduct({ name: '', description: '', price: '', category: '', image_url: '', stock: '', unit: '' });
      setMessage({ type: 'success', text: 'Đã thêm sản phẩm' });
      await loadStats();
    });
  };

  if (!user?.is_admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto text-rose-500" size={44} />
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Không có quyền truy cập</h1>
          <p className="mt-2 text-slate-500">Trang này chỉ dành cho quản trị viên.</p>
        </div>
      </div>
    );
  }

  const dashboardCards = [
    {
      title: 'Người dùng',
      value: stats?.total_users ?? users.length,
      note: 'Tài khoản đang quản lý',
      icon: UsersRound,
      tone: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
    },
    {
      title: 'Sản phẩm',
      value: stats?.total_products ?? 0,
      note: 'Sản phẩm đang bán',
      icon: PackagePlus,
      tone: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    },
    {
      title: 'Đơn hàng',
      value: stats?.total_orders ?? orders.length,
      note: `${stats?.pending_orders ?? pendingOrders} đơn chờ xác nhận`,
      icon: ShoppingBag,
      tone: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    },
    {
      title: 'Doanh thu',
      value: money(stats?.total_revenue ?? 0),
      note: 'Tổng doanh thu ghi nhận',
      icon: TrendingUp,
      tone: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
    },
  ];

  const lowStock = Number(stats?.low_stock_products || 0);
  const pending = Number(stats?.pending_orders ?? pendingOrders);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="fresh-container py-8">
        <header className="mb-8 overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
                FreshFood AI Admin
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                Bảng điều khiển quản trị
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Theo dõi vận hành cửa hàng, đơn hàng, doanh thu và dữ liệu sản phẩm sạch cao cấp.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4 text-sm text-slate-600">
              Đăng nhập: <span className="font-bold text-slate-950">{user.username}</span>
            </div>
          </div>
        </header>

        {message && (
          <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            message.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="mb-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </div>

        <div className="mb-8 flex gap-2 overflow-x-auto rounded-2xl border border-white/70 bg-white p-2 shadow-sm">
          {tabs.map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => switchTab(key)}
              className={`inline-flex min-w-max items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                activeTab === key ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'dashboard') loadDashboardData();
              if (activeTab === 'users') loadUsers();
              if (activeTab === 'orders') loadOrders();
            }}
            className="ml-auto inline-flex min-w-max items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCcw size={18} />
            Tải lại
          </button>
        </div>

        {loading && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
            <Loader2 className="animate-spin" size={18} />
            Đang xử lý...
          </div>
        )}

        {activeTab === 'dashboard' && (
          <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border border-white/70 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Tình trạng vận hành</h2>
                  <p className="mt-1 text-sm text-slate-500">Giám sát các tín hiệu quan trọng trong ngày.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                  <CheckCircle2 size={15} />
                  Ổn định
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <OperationMetric
                  label="Đơn hàng"
                  value={Math.max(28, Math.min(100, 100 - pending * 8))}
                  badge={pending > 0 ? `${pending} cần xử lý` : 'Ổn định'}
                  icon={pending > 0 ? AlertTriangle : CheckCircle2}
                  tone={pending > 0
                    ? { icon: 'bg-amber-50 text-amber-700', badge: 'bg-amber-50 text-amber-700 ring-amber-200', bar: 'bg-amber-500' }
                    : { icon: 'bg-emerald-50 text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500' }}
                />
                <OperationMetric
                  label="Tồn kho"
                  value={lowStock > 0 ? 62 : 94}
                  badge={lowStock > 0 ? `${lowStock} sắp hết` : 'Ổn định'}
                  icon={lowStock > 0 ? AlertTriangle : CheckCircle2}
                  tone={lowStock > 0
                    ? { icon: 'bg-rose-50 text-rose-700', badge: 'bg-rose-50 text-rose-700 ring-rose-200', bar: 'bg-rose-500' }
                    : { icon: 'bg-emerald-50 text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500' }}
                />
                <OperationMetric
                  label="Hệ thống"
                  value={98}
                  badge="Ổn định"
                  icon={Activity}
                  tone={{ icon: 'bg-sky-50 text-sky-700', badge: 'bg-sky-50 text-sky-700 ring-sky-200', bar: 'bg-sky-500' }}
                />
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">Xu hướng doanh thu 7 ngày</h2>
                    <p className="mt-1 text-sm text-slate-500">Biểu đồ SVG đơn giản, không cần thêm thư viện.</p>
                  </div>
                  <span className="hidden rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 sm:inline-flex">
                    {money(revenueTrend.at(-1)?.value)}
                  </span>
                </div>
                <RevenueLineChart data={revenueTrend} />
              </div>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
              <h2 className="text-xl font-black text-slate-950">Thao tác nhanh</h2>
              <p className="mt-1 text-sm text-slate-500">Các nút lớn, dễ bấm trên màn hình cảm ứng.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <QuickActionButton
                  icon={ClipboardList}
                  title="Kiểm tra đơn hàng"
                  desc="Duyệt đơn chờ xác nhận"
                  onClick={() => switchTab('orders')}
                  tone="bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                />
                <QuickActionButton
                  icon={UsersRound}
                  title="Quản lý người dùng"
                  desc="Theo dõi tài khoản khách hàng"
                  onClick={() => switchTab('users')}
                  tone="bg-sky-50 text-sky-700 ring-1 ring-sky-100"
                />
                <QuickActionButton
                  icon={PackagePlus}
                  title="Thêm sản phẩm"
                  desc="Bổ sung dữ liệu cửa hàng"
                  onClick={() => switchTab('products')}
                  tone="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                />
                <QuickActionButton
                  icon={Zap}
                  title="Tải lại dữ liệu"
                  desc="Đồng bộ thống kê mới nhất"
                  onClick={loadStats}
                  tone="bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
                />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'users' && (
          <section className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
            <div className="border-b border-slate-100 p-6">
              <h2 className="text-lg font-black text-slate-950">Người dùng</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">STT</th>
                    <th className="px-4 py-3 text-left">Username</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Vai trò</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {users.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold text-slate-950">{index + 1}</td>
                      <td className="px-4 py-4 font-medium text-slate-900">{item.username}</td>
                      <td className="px-4 py-4 text-slate-600">{item.email}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                          item.is_admin ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-slate-100 text-slate-700 ring-slate-200'
                        }`}>
                          {item.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {!item.is_admin && (
                          <button
                            onClick={() => handleDeleteUser(item)}
                            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                          >
                            <Trash2 size={16} />
                            Xóa
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'orders' && (
          <section className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-6">
              <div>
                <h2 className="text-lg font-black text-slate-950">Quản lý đơn hàng</h2>
                <p className="mt-1 text-sm text-slate-500">Theo dõi sản phẩm, số lượng và trạng thái xử lý.</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
                {pendingOrders} chờ xác nhận
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1060px]">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">STT</th>
                    <th className="px-4 py-3 text-left">Mã đơn</th>
                    <th className="px-4 py-3 text-left">Khách hàng</th>
                    <th className="px-4 py-3 text-left">Sản phẩm</th>
                    <th className="px-4 py-3 text-left">Tổng tiền</th>
                    <th className="px-4 py-3 text-left">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {orders.map((order, index) => {
                    const statusKey = String(order.status || '').toLowerCase();
                    return (
                      <tr key={order.id} className="align-top hover:bg-slate-50">
                        <td className="px-4 py-4 font-semibold text-slate-950">{index + 1}</td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-950">#{order.id}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatDate(order.created_at)}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-700">User #{order.user_id}</td>
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            {order.items.length > 0 ? order.items.map((item) => (
                              <div key={item.id || `${order.id}-${item.product_id}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-100 px-3 py-2">
                                <span className="max-w-[280px] font-medium text-slate-800">{item.product_name}</span>
                                <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                                  x{item.quantity}
                                </span>
                              </div>
                            )) : (
                              <span className="text-slate-500">Chưa có dữ liệu sản phẩm</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-semibold text-emerald-700">{money(order.total)}</td>
                        <td className="px-4 py-4">
                          <select
                            value={order.status}
                            onChange={(event) => handleUpdateOrderStatus(order.id, event.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          >
                            {ORDER_STATUSES.map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClasses[statusKey] || statusClasses.returned}`}>
                            {normalizeOrderStatus(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                          >
                            <Trash2 size={16} />
                            Xóa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'products' && (
          <form onSubmit={handleAddProduct} className="rounded-3xl border border-white/70 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
            <div className="mb-6">
              <h2 className="text-lg font-black text-slate-950">Thêm sản phẩm</h2>
              <p className="mt-1 text-sm text-slate-500">Sản phẩm mới sẽ xuất hiện trong cửa hàng sau khi lưu.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Tên sản phẩm" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} required />
              <input className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Giá VND" type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} required />
              <input className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Danh mục" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} required />
              <input className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Đơn vị tính, ví dụ: kg, hộp, túi" value={newProduct.unit} onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })} />
              <input className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Tồn kho" type="number" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} />
              <input className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="URL hình ảnh" value={newProduct.image_url} onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })} />
              <textarea className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 md:col-span-2" placeholder="Mô tả" rows="4" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
            </div>
            <button className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-70" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <PackagePlus size={18} />}
              Thêm sản phẩm
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
