import { Bell, CheckCircle2, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { FloatingField, floatingInputCls } from './ProfileFormHelpers';

const AccountSettingsTab = ({
  passwordForm,
  setPasswordForm,
  savingPassword,
  passwordError,
  successMessage,
  handlePasswordSubmit,
}) => (
  <section className="space-y-5">
    <form
      onSubmit={handlePasswordSubmit}
      className="rounded-[30px] border border-white/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:p-8"
    >
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#166534]">
            <ShieldCheck size={14} />
            Cài đặt tài khoản
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#111827]">Bảo mật đăng nhập và kiểm soát quyền truy cập</h2>
        </div>

        <div className="rounded-[22px] border border-[#E5E7EB] bg-[#F8FAF9] px-4 py-3 text-sm text-[#4B5563]">
          <p className="font-semibold text-[#111827]">Gợi ý bảo mật</p>
          <p className="mt-1">Ưu tiên mật khẩu dài, không trùng với email hoặc số điện thoại.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <FloatingField label="Mật khẩu hiện tại">
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
            className={floatingInputCls}
            placeholder="Nhập mật khẩu hiện tại"
            required
          />
        </FloatingField>

        <FloatingField label="Mật khẩu mới">
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
            className={floatingInputCls}
            placeholder="Tạo mật khẩu mới"
            required
          />
        </FloatingField>

        <FloatingField label="Xác nhận mật khẩu">
          <input
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
            className={floatingInputCls}
            placeholder="Nhập lại mật khẩu mới"
            required
          />
        </FloatingField>
      </div>

      {passwordError ? (
        <p className="mt-5 rounded-[20px] bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{passwordError}</p>
      ) : null}

      {successMessage ? (
        <div className="mt-5 flex items-start gap-3 rounded-[20px] border border-emerald-200 bg-[#F0FDF4] px-4 py-3 text-sm text-[#166534]">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p className="font-semibold">{successMessage}</p>
        </div>
      ) : null}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={savingPassword}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(22,163,74,0.22)] transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
          {savingPassword ? 'Đang cập nhật' : 'Cập nhật mật khẩu'}
        </button>
      </div>
    </form>

    <div className="rounded-[28px] border border-white/80 bg-white/92 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#16A34A]">
          <Bell size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[#111827]">Thông báo bảo mật và thiết bị</h3>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            Tùy chọn quản lý phiên đăng nhập, cảnh báo thiết bị mới và lịch sử hoạt động sẽ xuất hiện tại đây trong các bản cập nhật tiếp theo.
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default AccountSettingsTab;
