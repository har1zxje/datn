import { CheckCircle2, Loader2, Save, UserRound } from 'lucide-react';
import { GENDER_OPTIONS } from '../../utils/profile/helpers';
import { FloatingField, LockedField, floatingInputCls } from './ProfileFormHelpers';

const ProfileInfoSkeleton = () => (
  <div className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:p-8">
    <div className="mb-8 space-y-3">
      <div className="h-5 w-52 animate-pulse rounded-full bg-slate-200" />
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-[22px] border border-slate-100 p-5">
          <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-4 h-5 w-full animate-pulse rounded-full bg-slate-200" />
        </div>
      ))}
      <div className="rounded-[22px] border border-slate-100 p-5 lg:col-span-2">
        <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 h-24 w-full animate-pulse rounded-[18px] bg-slate-200" />
      </div>
    </div>
  </div>
);

const ProfileInfoTab = ({
  displayUser,
  profileForm,
  avatarPreview,
  loadingProfile,
  savingProfile,
  profilePhoneError,
  successMessage,
  handleProfileChange,
  handleProfileSubmit,
}) => {
  if (loadingProfile) {
    return <ProfileInfoSkeleton />;
  }

  const saveMessage = savingProfile
    ? 'Đang lưu thay đổi của bạn'
    : successMessage || (avatarPreview ? 'Ảnh mới đã sẵn sàng, hãy lưu để áp dụng' : 'Thông tin này được dùng cho giao hàng và hỗ trợ sau mua');

  return (
    <form
      onSubmit={handleProfileSubmit}
      className="rounded-[30px] border border-white/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:p-8"
    >
      <div className="mb-8 flex flex-col gap-4">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#166534]">
            <UserRound size={14} />
            Hồ sơ cá nhân
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#111827]">Thông tin tài khoản rõ ràng, dễ cập nhật</h2>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <LockedField label="Username" value={displayUser?.username} />
        <LockedField label="Email" value={displayUser?.email} />

        <FloatingField label="Họ và tên">
          <input
            value={profileForm.full_name}
            onChange={(event) => handleProfileChange('full_name', event.target.value)}
            className={floatingInputCls}
            placeholder="Nhập họ và tên"
          />
        </FloatingField>

        <FloatingField label="Số điện thoại" error={profilePhoneError}>
          <input
            type="tel"
            value={profileForm.phone}
            onChange={(event) => handleProfileChange('phone', event.target.value)}
            className={floatingInputCls}
            placeholder="0900000000"
          />
        </FloatingField>

        <FloatingField label="Giới tính">
          <select
            value={profileForm.gender}
            onChange={(event) => handleProfileChange('gender', event.target.value)}
            className={floatingInputCls}
          >
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FloatingField>

        <FloatingField label="Ngày sinh">
          <input
            type="date"
            value={profileForm.date_of_birth}
            onChange={(event) => handleProfileChange('date_of_birth', event.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={floatingInputCls}
          />
        </FloatingField>

        <FloatingField label="Ghi chú thêm" className="lg:col-span-2">
          <textarea
            value={profileForm.bio}
            onChange={(event) => handleProfileChange('bio', event.target.value)}
            rows={5}
            className={`${floatingInputCls} min-h-[140px] resize-none`}
            placeholder="Thông tin giao hàng, lưu ý khi liên hệ, nhu cầu đặc biệt..."
          />
        </FloatingField>
      </div>

      <div className="sticky bottom-4 z-10 mt-8">
        <div className="flex flex-col gap-4 rounded-[24px] border border-[#E5E7EB] bg-white/92 p-4 shadow-[0_22px_50px_rgba(15,23,42,0.09)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${successMessage && !savingProfile ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-slate-100 text-slate-600'}`}>
              {savingProfile ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111827]">Lưu thay đổi hồ sơ</p>
              <p className="mt-1 text-sm text-[#6B7280]">{saveMessage}</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(22,163,74,0.22)] transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {savingProfile ? 'Đang lưu' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProfileInfoTab;
