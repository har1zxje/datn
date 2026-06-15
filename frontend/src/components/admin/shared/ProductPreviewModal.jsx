import { ImagePlus, X } from 'lucide-react';
import { formatMoney } from '../../../utils/admin/formatters';
import { safeText } from '../../../utils/text';
import { breakAnywhereClass } from '../../../constants/adminDashboard';

const ProductPreviewModal = ({ product, categoryLabel, onClose }) => {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[32px] border border-white/70 bg-[rgba(255,255,255,0.98)] p-6 shadow-[var(--shadow-overlay)] md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Xem trước sản phẩm
            </p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">{product.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{categoryLabel || 'Khác'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="overflow-hidden rounded-[28px] bg-slate-100">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full min-h-[260px] w-full object-cover"
              />
            ) : (
              <div className="flex h-[260px] items-center justify-center text-slate-400">
                <ImagePlus size={28} />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Giá bán</p>
              <p className="mt-2 text-2xl font-black text-emerald-700">
                {formatMoney(product.price)}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tồn kho</p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {Number(product.quantity ?? product.stock ?? 0)}
                </p>
              </div>
              <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Đơn vị</p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {safeText(product.unit, 'kg')}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mô tả</p>
              <p className={`mt-3 text-sm leading-7 text-slate-600 ${breakAnywhereClass}`}>
                {safeText(product.description, 'Chưa có mô tả cho sản phẩm này.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPreviewModal;
