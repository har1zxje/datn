import { formatCompactNumber } from '../../../utils/admin/formatters';
import { getStockProgressMeta } from '../../../utils/admin/stockHelpers';

const StockLevel = ({ qty, threshold }) => {
  const progress = getStockProgressMeta(qty, threshold);
  return (
    <div className="flex items-center gap-3">
      <span className="min-w-8 text-sm font-bold text-slate-950">
        {formatCompactNumber(qty)}
      </span>
      <div className={`h-2.5 w-20 overflow-hidden rounded-full ${progress.trackClassName}`}>
        <div
          className={`h-full rounded-full ${progress.className}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
};

export default StockLevel;
