import { Edit3, MapPin, Phone, Plus, Trash2 } from 'lucide-react';
import AddressFormCard from './AddressFormCard';
import ProfileEmptyState from './ProfileEmptyState';

const AddressSkeleton = () => (
  <div className="grid gap-4 xl:grid-cols-2">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="rounded-[26px] border border-white/80 bg-white/92 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)]"
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-200" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-10 w-20 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    ))}
  </div>
);

const AddressesTab = ({
  addresses,
  loadingAddresses,
  editingAddressId,
  setEditingAddressId,
  addressForm,
  setAddressForm,
  showAddAddressForm,
  setShowAddAddressForm,
  savingAddress,
  addressErrors,
  setAddressErrors,
  emptyAddressForm,
  handleAddAddress,
  handleUpdateAddress,
  handleDeleteAddress,
  handleSetDefault,
  startEditAddress,
}) => (
  <section className="space-y-5">
    <div className="flex flex-col gap-4 rounded-[30px] border border-white/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:p-8 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#166534]">
          <MapPin size={14} />
          Sổ địa chỉ
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#111827]">Quản lý điểm giao hàng của bạn</h2>
      </div>

      {!showAddAddressForm ? (
        <button
          type="button"
          onClick={() => {
            setShowAddAddressForm(true);
            setEditingAddressId(null);
            setAddressForm(emptyAddressForm);
            setAddressErrors({});
          }}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(22,163,74,0.22)] transition hover:bg-[#15803D]"
        >
          <Plus size={16} />
          Thêm địa chỉ mới
        </button>
      ) : null}
    </div>

    {showAddAddressForm ? (
      <AddressFormCard
        title="Thêm địa chỉ giao hàng mới"
        form={addressForm}
        errors={addressErrors}
        saving={savingAddress}
        onChange={(field, value) => setAddressForm((prev) => ({ ...prev, [field]: value }))}
        onSave={handleAddAddress}
        onCancel={() => {
          setShowAddAddressForm(false);
          setAddressErrors({});
        }}
      />
    ) : null}

    {loadingAddresses ? (
      <AddressSkeleton />
    ) : addresses.length === 0 && !showAddAddressForm ? (
      <ProfileEmptyState
        icon={MapPin}
        eyebrow="Bắt đầu lưu địa chỉ"
        title="Chưa có địa chỉ giao hàng nào"
        description="Thêm địa chỉ để thanh toán nhanh hơn, chọn người nhận quen thuộc và hạn chế nhập lại thông tin ở mỗi đơn."
        actionLabel="Thêm địa chỉ đầu tiên"
        onAction={() => {
          setShowAddAddressForm(true);
          setEditingAddressId(null);
          setAddressForm(emptyAddressForm);
          setAddressErrors({});
        }}
      />
    ) : (
      <div className="grid gap-4 xl:grid-cols-2">
        {addresses.map((addr) =>
          editingAddressId === addr.id ? (
            <div key={addr.id} className="xl:col-span-2">
              <AddressFormCard
                title="Chỉnh sửa địa chỉ"
                form={addressForm}
                errors={addressErrors}
                saving={savingAddress}
                onChange={(field, value) => setAddressForm((prev) => ({ ...prev, [field]: value }))}
                onSave={() => handleUpdateAddress(addr.id)}
                onCancel={() => {
                  setEditingAddressId(null);
                  setAddressErrors({});
                }}
              />
            </div>
          ) : (
            <article
              key={addr.id}
              className={`group rounded-[26px] border bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(15,23,42,0.09)] ${
                addr.is_default ? 'border-[#BBF7D0] bg-[#FCFFFD]' : 'border-white/80'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${addr.is_default ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-slate-100 text-slate-600'}`}>
                  <MapPin size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-[#111827]">{addr.full_name}</h3>
                    {addr.is_default ? (
                      <span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#166534]">
                        Mặc định
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 flex items-center gap-2 text-sm text-[#4B5563]">
                    <Phone size={14} className="text-[#16A34A]" />
                    {addr.phone}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                    {addr.address}, {addr.city}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 border-t border-[#F1F5F9] pt-4">
                {!addr.is_default ? (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr.id)}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2.5 text-sm font-semibold text-[#166534] transition hover:bg-[#DCFCE7]"
                  >
                    Đặt mặc định
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => startEditAddress(addr)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] transition hover:border-[#BBF7D0] hover:bg-[#F8FAF9]"
                >
                  <Edit3 size={14} />
                  Chỉnh sửa
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <Trash2 size={14} />
                  Xóa
                </button>
              </div>
            </article>
          ),
        )}
      </div>
    )}
  </section>
);

export default AddressesTab;
