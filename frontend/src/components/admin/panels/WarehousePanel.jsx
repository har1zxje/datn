import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ImagePlus,
  Loader2,
  PackagePlus,
  Search,
  Trash2,
} from 'lucide-react';
import { formatCompactNumber, formatDateTime, formatPriceInput, sanitizeDigits } from '../../../utils/admin/formatters';
import {
  getStockBadge,
  getStockRowTint,
  getWarehouseProductOptionLabel,
  todayISO,
} from '../../../utils/admin/stockHelpers';
import { mapProductToCategoryId } from '../../../data/categorySystem';
import { breakAnywhereClass, textInputClass, WAREHOUSE_EXPORT_SCOPES, WAREHOUSE_SECTIONS } from '../../../constants/adminDashboard';
import EmptyState from '../shared/EmptyState';
import PaginationControls from '../shared/PaginationControls';
import StockLevel from '../shared/StockLevel';

const WarehousePanel = ({
  warehouseSection,
  setWarehouseSection,
  categoryDirectory,
  inventorySearch,
  setInventorySearch,
  inventoryCategoryFilter,
  setInventoryCategoryFilter,
  inventoryStockFilter,
  setInventoryStockFilter,
  paginatedInventory,
  setInventoryPage,
  warehouseProductQuery,
  warehouseForm,
  setWarehouseForm,
  warehouseProductOptions,
  selectedWarehouseProduct,
  loading,
  recentStockTransactions,
  stockHistoryLoading,
  handleWarehouseSubmit,
  handleWarehouseProductQueryChange,
  jumpToWarehouseTransaction,
  handleDeleteProductItem,
  warehouseExcelDragActive,
  setWarehouseExcelDragActive,
  warehouseExcelFile,
  warehouseExcelLoading,
  warehouseExcelInputKey,
  warehouseExportScope,
  setWarehouseExportScope,
  handleWarehouseExcelDrop,
  handleWarehouseExcelFileChange,
  handleImportWarehouseExcel,
  handleExportWarehouseExcel,
  productForm,
  setProductForm,
  imagePreview,
  isImageProcessing,
  resetProductForm,
  handleSaveProduct,
  handleAdminImageUpload,
  openProductPreview,
}) => (
  <section className="space-y-6">
    <div className="sticky top-[4.5rem] z-20 rounded-[28px] border border-[color:var(--line-soft)] bg-[rgba(252,253,252,0.96)] p-4 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">Kho hàng theo từng tác vụ</h2>
        </div>

        <label className="space-y-2 md:hidden">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chức năng kho</span>
          <select
            value={warehouseSection}
            onChange={(event) => setWarehouseSection(event.target.value)}
            className={textInputClass}
          >
            {WAREHOUSE_SECTIONS.map((section) => (
              <option key={section.value} value={section.value}>
                {section.label}
              </option>
            ))}
          </select>
        </label>

        <div className="hidden flex-wrap gap-2 md:flex">
          {WAREHOUSE_SECTIONS.map((section) => {
            const selected = warehouseSection === section.value;
            return (
              <button
                key={section.value}
                type="button"
                onClick={() => {
                  if (section.value === 'create') resetProductForm();
                  setWarehouseSection(section.value);
                }}
                className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                  selected
                    ? 'bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>

    {warehouseSection === 'inventory' ? (
      <div className="space-y-6">
        <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <h3 className="text-lg font-black text-slate-950">Tồn kho hiện tại</h3>
            </div>
            <div className="grid gap-3 xl:w-full xl:max-w-[760px] xl:grid-cols-[minmax(0,1.35fr)_180px_170px_160px]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tìm sản phẩm</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={inventorySearch}
                    onChange={(event) => setInventorySearch(event.target.value)}
                    className={`${textInputClass} pl-10`}
                    placeholder="Tên sản phẩm, danh mục..."
                  />
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Danh mục</span>
                <select
                  value={inventoryCategoryFilter}
                  onChange={(event) => setInventoryCategoryFilter(event.target.value)}
                  className={textInputClass}
                >
                  <option value="all">Tất cả danh mục</option>
                  {categoryDirectory.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label || category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</span>
                <select
                  value={inventoryStockFilter}
                  onChange={(event) => setInventoryStockFilter(event.target.value)}
                  className={textInputClass}
                >
                  <option value="all">Tat ca</option>
                  <option value="ok">Ổn định</option>
                  <option value="low">Sắp hết</option>
                  <option value="out">Hết hàng</option>
                </select>
              </label>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng hiển thị</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{formatCompactNumber(paginatedInventory.total)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:hidden">
          {paginatedInventory.items.length === 0 ? (
            <EmptyState title="Không có tồn kho phù hợp" description="Thử đổi từ khóa tìm kiếm hoặc bộ lọc danh mục / trạng thái." />
          ) : (
            paginatedInventory.items.map((product) => {
              const qty = Number(product.quantity ?? product.stock ?? 0);
              const threshold = Number(product.low_stock_threshold ?? 5);
              const badge = getStockBadge(qty, threshold);
              const categoryLabel =
                categoryDirectory.find((item) => item.id === mapProductToCategoryId(product, categoryDirectory))?.label ||
                product.category ||
                'Khác';

              return (
                <article key={product.id} className={`rounded-[26px] border border-slate-200 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] ${getStockRowTint(qty, threshold)}`}>
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-2xl bg-slate-100">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <ImagePlus size={16} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`line-clamp-2 text-sm font-black text-slate-950 ${breakAnywhereClass}`}>{product.name}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{categoryLabel}</span>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <StockLevel qty={qty} threshold={threshold} />
                    <span className="text-slate-500">Ngưỡng {formatCompactNumber(threshold)}</span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => jumpToWarehouseTransaction(product, 'import')}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                    >
                      <ArrowDownToLine size={14} />
                      Nhập kho
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProductItem(product.id, product.name)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      <Trash2 size={14} />
                      Xóa
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {paginatedInventory.items.length > 0 ? (
          <div className="hidden overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[var(--shadow-soft)] md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px]">
                <thead className="bg-slate-50/90 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Thumbnail</th>
                    <th className="px-5 py-4">Tên sản phẩm</th>
                    <th className="px-5 py-4">Danh mục</th>
                    <th className="px-5 py-4">Tồn kho</th>
                    <th className="px-5 py-4">Ngưỡng</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4 text-right">Thao tac</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedInventory.items.map((product) => {
                    const qty = Number(product.quantity ?? product.stock ?? 0);
                    const threshold = Number(product.low_stock_threshold ?? 5);
                    const badge = getStockBadge(qty, threshold);
                    const categoryLabel =
                      categoryDirectory.find((item) => item.id === mapProductToCategoryId(product, categoryDirectory))?.label ||
                      product.category ||
                      'Khác';

                    return (
                      <tr key={product.id} className={`${getStockRowTint(qty, threshold)} transition hover:bg-slate-50/70`}>
                        <td className="px-5 py-4 align-middle">
                          <div className="h-12 w-12 overflow-hidden rounded-[14px] bg-slate-100">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <ImagePlus size={16} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <button type="button" onClick={() => openProductPreview(product)} className={`line-clamp-2 max-w-[280px] text-left font-black text-slate-950 hover:text-emerald-700 ${breakAnywhereClass}`}>
                            {product.name}
                          </button>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{categoryLabel}</span>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <StockLevel qty={qty} threshold={threshold} />
                        </td>
                        <td className="px-5 py-4 align-middle font-semibold text-slate-700">{formatCompactNumber(threshold)}</td>
                        <td className="px-5 py-4 align-middle">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => jumpToWarehouseTransaction(product, 'import')}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                            >
                              <ArrowDownToLine size={14} />
                              Nhập kho
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProductItem(product.id, product.name)}
                              className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                            >
                              <Trash2 size={14} />
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {paginatedInventory.total > 0 ? (
          <PaginationControls
            page={paginatedInventory.page}
            totalPages={paginatedInventory.totalPages}
            total={paginatedInventory.total}
            onPageChange={setInventoryPage}
          />
        ) : null}
      </div>
    ) : null}

    {warehouseSection === 'transactions' ? (
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleWarehouseSubmit} className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Biểu mẫu giao dịch</p>
              <h3 className="mt-2 text-lg font-black text-slate-950">Ghi nhận giao dịch kho</h3>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sản phẩm</span>
              <input
                list="warehouse-product-options"
                value={warehouseProductQuery}
                onChange={(event) => handleWarehouseProductQueryChange(event.target.value)}
                className={textInputClass}
                placeholder="Nhập tên sản phẩm để tìm..."
              />
              <datalist id="warehouse-product-options">
                {warehouseProductOptions.map((item) => (
                  <option key={item.id} value={getWarehouseProductOptionLabel(item)}>
                    {item.name}
                  </option>
                ))}
              </datalist>
            </label>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Loại</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'import', label: 'Nhập kho' },
                  { value: 'export', label: 'Xuất kho' },
                ].map((option) => {
                  const selected = warehouseForm.type === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setWarehouseForm((prev) => ({ ...prev, type: option.value }))}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                        selected
                          ? option.value === 'import'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Số lượng</span>
              <input
                required
                min="1"
                type="number"
                value={warehouseForm.quantity}
                onChange={(event) => setWarehouseForm((prev) => ({ ...prev, quantity: event.target.value }))}
                className={textInputClass}
                placeholder="0"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày</span>
              <input
                type="date"
                value={warehouseForm.date}
                max={todayISO()}
                onChange={(event) => setWarehouseForm((prev) => ({ ...prev, date: event.target.value }))}
                className={textInputClass}
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ghi chú</span>
              <input
                type="text"
                value={warehouseForm.note}
                onChange={(event) => setWarehouseForm((prev) => ({ ...prev, note: event.target.value }))}
                className={textInputClass}
                placeholder="Lý do, đơn hàng, điều chỉnh..."
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white ${
                warehouseForm.type === 'export' ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : warehouseForm.type === 'export' ? (
                <ArrowUpFromLine size={16} />
              ) : (
                <ArrowDownToLine size={16} />
              )}
              Ghi nhận
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] md:p-6">
            <h3 className="text-lg font-black text-slate-950">Tồn kho sau giao dịch</h3>
            {selectedWarehouseProduct ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-[24px] bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-600">{selectedWarehouseProduct.name}</p>
                  <p className="mt-3 text-3xl font-black text-slate-950">
                    {formatCompactNumber(Number(selectedWarehouseProduct.quantity ?? selectedWarehouseProduct.stock ?? 0))}
                    <span className="mx-3 text-slate-300">{'->'}</span>
                    <span className={warehouseForm.type === 'export' ? 'text-rose-600' : 'text-emerald-600'}>
                      {formatCompactNumber(
                        Math.max(
                          Number(selectedWarehouseProduct.quantity ?? selectedWarehouseProduct.stock ?? 0) +
                            (warehouseForm.type === 'export'
                              ? -Number(warehouseForm.quantity || 0)
                              : Number(warehouseForm.quantity || 0)),
                          0,
                        ),
                      )}
                    </span>
                  </p>
                </div>
                <p className="text-sm text-slate-500">
                  Tồn hiện tại: {formatCompactNumber(Number(selectedWarehouseProduct.quantity ?? selectedWarehouseProduct.stock ?? 0))}, ngưỡng cảnh báo{' '}
                  {formatCompactNumber(Number(selectedWarehouseProduct.low_stock_threshold ?? 5))}.
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] md:p-6">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setWarehouseSection('excel')}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Excel
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {stockHistoryLoading && recentStockTransactions.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                  <Loader2 size={18} className="mx-auto animate-spin text-emerald-600" />
                  <p className="mt-3">Đang tải giao dịch kho...</p>
                </div>
              ) : recentStockTransactions.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  Chưa có giao dịch nào gần đây.
                </div>
              ) : (
                recentStockTransactions.map((tx) => {
                  const isImport = tx.type === 'import' || tx.type === 'IMPORT';
                  return (
                    <div key={tx.id} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950">{tx.product?.name || `#${tx.product_id}`}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {tx.transaction_date ? formatDateTime(tx.transaction_date) : formatDateTime(tx.created_at)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isImport ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {isImport ? <ArrowDownToLine size={12} /> : <ArrowUpFromLine size={12} />}
                          {isImport ? `+${tx.quantity}` : `-${tx.quantity}`}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{tx.note || 'Không có ghi chú'}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    ) : null}

    {warehouseSection === 'excel' ? (
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] md:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Import</p>
          <h3 className="mt-2 text-lg font-black text-slate-950">Nhập giao dịch từ Excel</h3>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setWarehouseExcelDragActive(true);
            }}
            onDragLeave={() => setWarehouseExcelDragActive(false)}
            onDrop={handleWarehouseExcelDrop}
            className={`mt-5 rounded-[28px] border-2 border-dashed px-5 py-8 text-center transition ${
              warehouseExcelDragActive ? 'border-emerald-300 bg-emerald-50/80' : 'border-slate-300 bg-slate-50'
            }`}
          >
            <input
              key={warehouseExcelInputKey}
              id="warehouse-excel-input"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleWarehouseExcelFileChange}
              className="hidden"
            />
            <ArrowUpFromLine size={26} className="mx-auto text-slate-400" />
            <p className="mt-4 text-sm font-semibold text-slate-700">
              {warehouseExcelFile ? warehouseExcelFile.name : 'Kéo thả file vào đây hoặc bấm để chọn file.'}
            </p>
            <label
              htmlFor="warehouse-excel-input"
              className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
            >
              <ArrowUpFromLine size={14} />
              Chọn file Excel
            </label>
          </div>
          <div className="mt-5 rounded-[24px] bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Định dạng bắt buộc</p>
            <p className="mt-2">Cột cần có: `product_id`, `type`, `quantity`.</p>
            <p className="mt-1">Cột tùy chọn: `transaction_date`, `note`.</p>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleImportWarehouseExcel}
              disabled={warehouseExcelLoading || !warehouseExcelFile}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {warehouseExcelLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpFromLine size={16} />}
              Nhập Excel
            </button>
          </div>
        </div>

        <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] md:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Export</p>
          <h3 className="mt-2 text-lg font-black text-slate-950">Xuất dữ liệu giao dịch</h3>
          <label className="mt-5 block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phạm vi xuất</span>
            <select
              value={warehouseExportScope}
              onChange={(event) => setWarehouseExportScope(event.target.value)}
              className={textInputClass}
            >
              {WAREHOUSE_EXPORT_SCOPES.map((scope) => (
                <option key={scope.value} value={scope.value}>
                  {scope.label}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleExportWarehouseExcel}
              disabled={warehouseExcelLoading}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-60"
            >
              {warehouseExcelLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}
              Tải file Excel
            </button>
          </div>
        </div>
      </div>
    ) : null}

    {warehouseSection === 'create' ? (
      <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-lg font-black text-slate-950">Thêm sản phẩm mới vào kho</h3>
          </div>
          <button
            type="button"
            onClick={resetProductForm}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            Làm mới form
          </button>
        </div>

        <form onSubmit={handleSaveProduct} className="mt-6 space-y-6">
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
              <span className="text-sm font-semibold text-slate-700">Gia (VND)</span>
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

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Tồn kho ban đầu</span>
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
                  id="warehouse-product-image-input"
                  className="hidden"
                  onChange={handleAdminImageUpload}
                />
                <p className="text-sm font-semibold text-slate-700">Chọn ảnh từ máy tính hoặc cập nhật bằng URL / data URL.</p>
                <label
                  htmlFor="warehouse-product-image-input"
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

          {imagePreview ? (
            <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-slate-50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-700">Xem trước hình ảnh</p>
              <img src={imagePreview} alt="Xem trước ảnh sản phẩm" className="h-64 w-full rounded-2xl object-cover" />
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="submit"
              disabled={loading || isImageProcessing}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)] disabled:opacity-70"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />}
              {isImageProcessing ? 'Đang xử lý ảnh...' : 'Thêm sản phẩm'}
            </button>
          </div>
        </form>
      </div>
    ) : null}
  </section>
);

export default WarehousePanel;
