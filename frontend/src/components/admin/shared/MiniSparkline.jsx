import { buildAreaPath, buildChartCoordinates, buildLinePath } from '../../../utils/admin/stockHelpers';

const MiniSparkline = ({ series }) => {
  const points = buildChartCoordinates(series, 220, 56, 8, 8);
  if (points.length === 0) return null;

  return (
    <svg viewBox="0 0 220 56" className="h-14 w-full" aria-hidden="true">
      <path d={buildAreaPath(points, 56)} fill="rgba(220,252,231,0.9)" />
      <path
        d={buildLinePath(points)}
        fill="none"
        stroke="#16A34A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default MiniSparkline;
