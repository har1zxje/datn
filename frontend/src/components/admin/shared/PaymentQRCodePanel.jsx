import { ImagePlus, Loader2, QrCode, RefreshCcw } from 'lucide-react';
import { formatDateTime } from '../../../utils/admin/formatters';
import { textInputClass } from '../../../constants/adminDashboard';

const PaymentQRCodePanel = ({
  paymentQr,
  draft,
  loading,
  saving,
  dragging,
  onProviderChange,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onRefresh,
  onSave,
}) => (
  <section className="space-y-6">
    <div className="overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-4 border-b border-[color:var(--line-soft)] bg-[linear-gradient(135deg,rgba(15,154,98,0.12),rgba(216,169,52,0.08),rgba(255,255,255,0.98))] p-5 lg:flex-row lg:items-start lg:justify-between md:p-6">
        <div className="max-w-2xl">
          <h2 className="text-xl font-black text-slate-950">Cập nhật mã QR thanh toán</h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--line-strong)] bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:bg-slate-50"
        >
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          Tải lại
        </button>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-[color:var(--line-soft)] p-6 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Xem trước QR</p>
          <div className="group mt-4 overflow-hidden rounded-[28px] border-2 border-dashed border-slate-200 bg-[#F9FAFB]">
            {draft.preview ? (
              <div className="relative aspect-square">
                <img
                  src={draft.preview}
                  alt="Xem trước mã QR thanh toán"
                  className="h-full w-full object-contain bg-white p-5"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition group-hover:bg-slate-950/45">
                  <label
                    htmlFor="payment-qr-input"
                    className="cursor-pointer rounded-2xl bg-white/95 px-4 py-2.5 text-sm font-bold text-slate-900 opacity-0 transition group-hover:opacity-100"
                  >
                    Thay đổi
                  </label>
                </div>
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center text-slate-400">
                <div className="text-center">
                  <QrCode size={64} className="mx-auto" />
                  <p className="mt-4 text-sm font-semibold text-slate-500">Chưa có ảnh QR</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 rounded-[24px] bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">
              {draft.provider_name || paymentQr?.provider_name || 'Chuyển khoản'}
            </p>
            <p className="mt-1">
              Cập nhật lúc:{' '}
              {paymentQr?.updated_at ? formatDateTime(paymentQr.updated_at) : 'Chưa có'}
            </p>
          </div>
        </div>

        <form onSubmit={onSave} className="p-6">
          <div className="space-y-5">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tên kênh thanh toán
              </span>
              <input
                value={draft.provider_name}
                onChange={(e) => onProviderChange(e.target.value)}
                className={textInputClass}
                placeholder="Chuyển khoản, MoMo, ZaloPay..."
              />
            </label>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tải ảnh mã QR
              </span>
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`rounded-[28px] border-2 border-dashed px-5 py-8 text-center transition ${
                  dragging ? 'border-emerald-300 bg-emerald-50/80' : 'border-slate-300 bg-slate-50'
                }`}
              >
                <input
                  id="payment-qr-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />
                <ImagePlus size={28} className="mx-auto text-slate-400" />
                <p className="mt-4 text-sm font-semibold text-slate-700">
                  Kéo thả ảnh vào đây hoặc bấm để tải lên.
                </p>
                <label
                  htmlFor="payment-qr-input"
                  className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]"
                >
                  <ImagePlus size={16} />
                  Chọn ảnh
                </label>
                <p className="mt-4 text-xs text-slate-500">
                  Khuyến nghị: ảnh PNG/JPG vuông, tối thiểu 500 x 500 px.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)] disabled:opacity-70"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
              Lưu mã QR
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
);

export default PaymentQRCodePanel;
