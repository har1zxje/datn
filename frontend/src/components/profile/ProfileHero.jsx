import {
  BadgeCheck,
  Camera,
  Gift,
  Loader2,
  Package,
  Sparkles,
  Truck,
} from 'lucide-react';
import { formatCurrency } from '../../services/api';

const ProfileHeroSkeleton = () => (
  <section className="space-y-5">
    <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/70 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-5">
          <div className="h-28 w-28 animate-pulse rounded-[28px] bg-slate-200" />
          <div className="space-y-3">
            <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-64 animate-pulse rounded-full bg-slate-200" />
            <div className="h-8 w-36 animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="h-12 w-40 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]"
        >
          <div className="mb-6 h-11 w-11 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-7 w-20 animate-pulse rounded-full bg-slate-200" />
        </div>
      ))}
    </div>
  </section>
);

const buildRoleBadge = (displayUser) => {
  if (displayUser?.is_admin) {
    return {
      label: 'Quản trị viên',
      className: 'border-sky-200 bg-sky-50 text-sky-700',
    };
  }

  if (displayUser?.role === 'staff') {
    return {
      label: 'Nhân viên',
      className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    };
  }

  return {
    label: 'Khách hàng xác thực',
    className: 'border-emerald-200 bg-[#DCFCE7] text-[#166534]',
  };
};

const statTone = {
  orders: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  points: 'bg-lime-100 text-lime-700',
  voucher: 'bg-emerald-100 text-emerald-700',
};

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="group rounded-[24px] border border-white/70 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(15,23,42,0.09)]">
    <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
      <Icon size={20} />
    </div>
    <p className="text-[13px] font-semibold text-[#6B7280]">{label}</p>
    <p className="mt-2 text-2xl font-bold tracking-tight text-[#111827]">{value}</p>
  </div>
);

const ProfileHero = ({
  loading,
  displayUser,
  displayName,
  userInitial,
  avatarSrc,
  avatarPreview,
  avatarInputRef,
  handleAvatarChange,
  totalOrders,
  pendingOrders,
  deliveredOrders,
}) => {
  if (loading) {
    return <ProfileHeroSkeleton />;
  }

  const roleBadge = buildRoleBadge(displayUser);
  const stats = [
    { key: 'orders', label: 'Đơn hàng', value: totalOrders, icon: Package },
    { key: 'pending', label: 'Chờ xác nhận', value: pendingOrders, icon: Loader2 },
    { key: 'delivered', label: 'Đã giao', value: deliveredOrders, icon: Truck },
    { key: 'points', label: 'Điểm thưởng', value: displayUser?.loyalty_points || 0, icon: Sparkles },
    { key: 'voucher', label: 'Voucher', value: formatCurrency(displayUser?.voucher_balance || 0), icon: Gift },
  ];

  return (
    <section className="space-y-5">
      <div className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.76)_0%,rgba(220,252,231,0.96)_42%,rgba(255,255,255,0.88)_100%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-72 bg-[radial-gradient(circle_at_top_right,rgba(22,163,74,0.18),transparent_58%)] lg:block" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-[0_22px_50px_rgba(15,23,42,0.12)]">
              {avatarSrc ? (
                <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#16A34A_0%,#22C55E_100%)] text-4xl font-black text-white">
                  {userInitial}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="truncate text-[30px] font-bold tracking-tight text-[#111827]">{displayName}</h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${roleBadge.className}`}>
                  <BadgeCheck size={14} />
                  {roleBadge.label}
                </span>
              </div>

              <p className="mt-2 max-w-2xl text-sm text-[#4B5563]">{displayUser?.email || 'Chưa cập nhật email tài khoản'}</p>

              {avatarPreview ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#4B5563]">
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 shadow-[0_10px_25px_rgba(15,23,42,0.05)]">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Ảnh mới sẽ được lưu khi bạn cập nhật hồ sơ
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 xl:items-end">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-sm font-semibold text-[#111827] shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-[#BBF7D0] hover:text-[#166534]"
            >
              <Camera size={16} className="text-[#16A34A]" />
              Chỉnh ảnh đại diện
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <StatCard
            key={stat.key}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            tone={statTone[stat.key]}
          />
        ))}
      </div>
    </section>
  );
};

export default ProfileHero;
