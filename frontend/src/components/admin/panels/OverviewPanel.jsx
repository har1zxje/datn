import { CircleDollarSign, ClipboardList, ImagePlus, TriangleAlert } from 'lucide-react';
import { formatCompactNumber, formatMoney } from '../../../utils/admin/formatters';
import { getStockBadge } from '../../../utils/admin/stockHelpers';
import { safeText } from '../../../utils/text';
import OverviewMetricCard from '../shared/OverviewMetricCard';
import RevenueAreaChart from '../shared/RevenueAreaChart';

const OverviewPanel = ({ stats, overviewLoading, navigateToTab }) => {
  const lowStockItems = (stats?.low_stock_items || []).slice(0, 5);
  const revenueSeries = (stats?.last_7_days || []).map((item) => ({
    label: item.label,
    value: item.revenue,
    orders: item.orders,
  }));
  const orderSeries = (stats?.last_7_days || []).map((item) => ({
    label: item.label,
    value: item.orders,
    orders: item.orders,
  }));

  return (
    <section className="space-y-6">
      <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        <div className="flex snap-x gap-4 md:grid md:snap-none md:grid-cols-2 xl:grid-cols-3">
          <OverviewMetricCard
            label="Doanh thu"
            value={formatMoney(stats?.today_revenue ?? 0)}
            hint={`${formatCompactNumber(stats?.total_revenue ?? 0)} VND tổng doanh thu`}
            icon={CircleDollarSign}
            tone="emerald"
            series={revenueSeries}
            loading={overviewLoading && !stats}
            emphasis="hero"
            actionLabel="Xem chi tiết"
            onAction={() => navigateToTab('orders')}
          />
          <OverviewMetricCard
            label="Đơn mới"
            value={formatCompactNumber(stats?.new_orders_today ?? 0)}
            hint={`${formatCompactNumber(stats?.pending_orders ?? 0)} đơn đang chờ xử lý`}
            icon={ClipboardList}
            tone="sky"
            series={orderSeries}
            loading={overviewLoading && !stats}
            emphasis="hero"
            actionLabel="Xem chi tiết"
            onAction={() => navigateToTab('orders')}
          />
          <OverviewMetricCard
            label="Sản phẩm sắp hết"
            value={formatCompactNumber(stats?.low_stock_products ?? 0)}
            hint="Cần bổ sung trước khi hết nguồn bán"
            icon={TriangleAlert}
            tone="amber"
            loading={overviewLoading && !stats}
            actionLabel="Xem chi tiết"
            onAction={() => navigateToTab('warehouse')}
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4 border-b border-[color:var(--line-soft)] px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Cảnh báo tồn kho</p>
          </div>
          <button
            type="button"
            onClick={() => navigateToTab('warehouse')}
            className="text-sm font-semibold text-slate-600 transition hover:text-emerald-700"
          >
            Xem tất cả -&gt;
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {lowStockItems.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-500">Không có sản phẩm nào đang sắp hết hàng.</div>
          ) : (
            lowStockItems.map((item) => {
              const badge = getStockBadge(Number(item.quantity || 0), Number(item.low_stock_threshold || 0));
              const threshold = Math.max(Number(item.low_stock_threshold || 0), 1);
              const level = Math.min(100, Math.max((Number(item.quantity || 0) / threshold) * 100, 6));

              return (
                <div key={item.id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="h-10 w-10 overflow-hidden rounded-2xl bg-slate-100">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <ImagePlus size={16} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-slate-950">{item.name}</p>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                        <div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-amber-500" style={{ width: `${level}%` }} />
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            Tồn <span className="font-bold text-slate-900">{item.quantity}</span> / Ngưỡng {item.low_stock_threshold}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigateToTab('warehouse')}
                          className="rounded-2xl border border-[color:var(--line-strong)] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Nhập kho
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-[28px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] md:block">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Doanh thu theo tuần</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái hệ thống</p>
            <p className="mt-1 text-sm font-black text-emerald-700">{safeText(stats?.system_status, 'Ổn định')}</p>
          </div>
        </div>
        <RevenueAreaChart series={revenueSeries} />
      </section>
    </section>
  );
};

export default OverviewPanel;
