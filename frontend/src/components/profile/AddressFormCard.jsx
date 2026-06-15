import { Loader2, Save } from 'lucide-react';
import { VN_PROVINCES, getDistricts } from '../../data/vnLocations';
import { getWards } from '../../data/vnWards';
import { addrInputCls } from '../../utils/profile/helpers';

const AddressField = ({ label, required, error, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="mb-2 block text-sm font-semibold text-[#374151]">
      {label}
      {required ? <span className="ml-1 text-rose-500">*</span> : null}
    </span>
    {children}
    {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}
  </label>
);

const AddressFormCard = ({ title, form, errors, saving, onChange, onSave, onCancel }) => {
  const districts = getDistricts(form.province);
  const wards = getWards(form.district);

  const handleProvinceChange = (event) => {
    onChange('province', event.target.value);
    onChange('district', '');
    onChange('ward', '');
  };

  const handleDistrictChange = (event) => {
    onChange('district', event.target.value);
    onChange('ward', '');
  };

  return (
    <div className="rounded-[30px] border border-[#BBF7D0] bg-white/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xl font-bold tracking-tight text-[#111827]">{title}</p>
          <p className="mt-2 text-sm text-[#6B7280]">Điền đầy đủ thông tin để việc giao nhận và xác minh đơn diễn ra chính xác.</p>
        </div>
        <span className="inline-flex rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#166534]">
          Bảo mật cho thanh toán nhanh
        </span>
      </div>

      {errors.global ? (
        <p className="mb-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{errors.global}</p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <AddressField label="Họ và tên" required error={errors.full_name}>
          <input
            value={form.full_name}
            onChange={(event) => onChange('full_name', event.target.value)}
            placeholder="Nguyễn Văn A"
            className={addrInputCls(!!errors.full_name)}
          />
        </AddressField>

        <AddressField label="Số điện thoại" required error={errors.phone}>
          <input
            type="tel"
            value={form.phone}
            onChange={(event) => onChange('phone', event.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="0900000000"
            className={addrInputCls(!!errors.phone)}
          />
        </AddressField>

        <AddressField label="Tỉnh / Thành phố" required error={errors.province}>
          <select value={form.province} onChange={handleProvinceChange} className={addrInputCls(!!errors.province)}>
            <option value="">Chọn tỉnh hoặc thành phố</option>
            {VN_PROVINCES.map((province) => (
              <option key={province.name} value={province.name}>
                {province.name}
              </option>
            ))}
          </select>
        </AddressField>

        <AddressField label="Quận / Huyện">
          <select
            value={form.district}
            onChange={handleDistrictChange}
            disabled={!form.province}
            className={`${addrInputCls(false)} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
          >
            <option value="">Chọn quận hoặc huyện</option>
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </AddressField>

        <AddressField label="Phường / Xã / Thị trấn" className="lg:col-span-2">
          {wards.length > 0 ? (
            <select value={form.ward} onChange={(event) => onChange('ward', event.target.value)} className={addrInputCls(false)}>
              <option value="">Chọn phường, xã hoặc thị trấn</option>
              {wards.map((ward) => (
                <option key={ward} value={ward}>
                  {ward}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={form.ward}
              onChange={(event) => onChange('ward', event.target.value)}
              placeholder={form.district ? 'Nhập tên phường, xã hoặc thị trấn' : 'Chọn quận hoặc huyện trước'}
              disabled={!form.district}
              className={`${addrInputCls(false)} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
            />
          )}
        </AddressField>

        <AddressField label="Địa chỉ cụ thể" required error={errors.address} className="lg:col-span-2">
          <input
            value={form.address}
            onChange={(event) => onChange('address', event.target.value)}
            placeholder="Số nhà, tên đường, tòa nhà..."
            className={addrInputCls(!!errors.address)}
          />
        </AddressField>

        <label className="inline-flex min-h-12 cursor-pointer items-center gap-3 rounded-[20px] border border-[#E5E7EB] bg-[#F8FAF9] px-4 py-3 lg:col-span-2">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(event) => onChange('is_default', event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-[#16A34A]"
          />
          <span className="text-sm font-semibold text-[#111827]">Đặt làm địa chỉ mặc định cho các đơn tiếp theo</span>
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#E5E7EB] px-5 py-3 text-sm font-semibold text-[#111827] transition hover:bg-[#F8FAF9]"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(22,163,74,0.22)] transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {saving ? 'Đang lưu' : 'Lưu địa chỉ'}
        </button>
      </div>
    </div>
  );
};

export default AddressFormCard;
