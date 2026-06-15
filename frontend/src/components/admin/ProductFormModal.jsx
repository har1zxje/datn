import { ImagePlus, Loader2, PackagePlus } from 'lucide-react';
import { formatCompactNumber, formatPriceInput, sanitizeDigits } from '../../utils/admin/formatters';
import { textInputClass } from '../../constants/adminDashboard';

const ProductFormModal = ({
  isOpen,
  editingProductId,
  productForm,
  setProductForm,
  imagePreview,
  loading,
  isImageProcessing,
  categoryDirectory,
  handleSaveProduct,
  handleAdminImageUpload,
  closeProductModal,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-[32px] border border-white/70 bg-[rgba(255,255,255,0.98)] p-6 shadow-[var(--shadow-overlay)] md:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              {editingProductId ? 'Trình chỉnh sửa sản phẩm' : 'Biểu mẫu tạo sản phẩm kho'}
            </p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">
              {editingProductId ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm mới'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {editingProductId
                ? 'Chỉnh sửa thông tin bán hàng tại đây. Tồn kho được quản lý riêng ở tab Kho hàng hoặc qua file Excel.'
                : 'Form này được mở từ tab Kho hàng để tạo sản phẩm mới kèm tồn kho ban đầu.'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeProductModal}
            className="rounded-2xl border border-[color:var(--line-strong)] px-4 py-2 text-sm font-bold text-slate-700"
          >
            Đóng
          </button>
        </div>

        <form onSubmit={handleSaveProduct} className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Tên sản phẩm</span>
              <input
                required
                value={productForm.name}
                onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                className={textInputClass}
                placeholder="Nhập tên sản phẩm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Danh mục</span>
              <select
                required
                value={productForm.categoryId}
                onChange={(event) => setProductForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                className={textInputClass}
              >
                <option value="">Chọn danh mục</option>
                {categoryDirectory.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label || category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Giá (VND)</span>
              <input
                required
                type="text"
                inputMode="numeric"
                value={formatPriceInput(productForm.price)}
                onChange={(event) => setProductForm((prev) => ({ ...prev, price: sanitizeDigits(event.target.value) }))}
                className={textInputClass}
                placeholder="35000 VND"
              />
            </label>

            {editingProductId ? (
              <div className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Tồn kho hiện tại</span>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span className="font-black text-slate-950">{formatCompactNumber(productForm.stock || 0)}</span>
                  <span className="ml-2 text-slate-500">Chỉ cập nhật tồn kho tại tab Kho hàng hoặc bằng file Excel.</span>
                </div>
              </div>
            ) : (
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Tồn kho</span>
                <input
                  required
                  type="number"
                  min="0"
                  value={productForm.stock}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, stock: event.target.value }))}
                  className={textInputClass}
                  placeholder="Số lượng tồn"
                />
              </label>
            )}

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Ngưỡng cảnh báo</span>
              <input
                type="number"
                min="0"
                value={productForm.lowStockThreshold}
                onChange={(event) => setProductForm((prev) => ({ ...prev, lowStockThreshold: event.target.value }))}
                className={textInputClass}
                placeholder="5"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Đơn vị tính</span>
              <input
                value={productForm.unit}
                onChange={(event) => setProductForm((prev) => ({ ...prev, unit: event.target.value }))}
                className={textInputClass}
                placeholder="kg, hộp, túi..."
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Tải ảnh sản phẩm</span>
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                <input
                  type="file"
                  accept="image/*"
                  id="product-image-input"
                  className="hidden"
                  onChange={handleAdminImageUpload}
                />
                <p className="text-sm font-semibold text-slate-700">Chọn ảnh từ máy tính hoặc cập nhật bằng URL / data URL.</p>
                <label
                  htmlFor="product-image-input"
                  className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]"
                >
                  <ImagePlus size={16} />
                  Chọn ảnh
                </label>
              </div>
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Mô tả</span>
            <textarea
              rows={4}
              value={productForm.description}
              onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
              className={textInputClass}
              placeholder="Nhập mô tả sản phẩm"
            />
          </label>

          {imagePreview && (
            <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-slate-50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-700">Xem trước hình ảnh</p>
              <img src={imagePreview} alt="Xem trước ảnh sản phẩm" className="h-64 w-full rounded-2xl object-cover" />
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={closeProductModal}
              className="rounded-2xl border border-[color:var(--line-strong)] px-5 py-3 text-sm font-bold text-slate-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || isImageProcessing}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)] disabled:opacity-70"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />}
              {isImageProcessing ? 'Đang xử lý ảnh...' : editingProductId ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
