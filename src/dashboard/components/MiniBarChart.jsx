export default function MiniBarChart({ data, dataKey, color, label, formatValue }) {
  if (!data || data.length === 0) return <div className="empty-chart">Нет данных</div>;

  const values = data.map((d) => d[dataKey]);
  const maxVal = Math.max(...values, 1);

  const W = 320;
  const H = 140;
  const padX = 40;
  const padTop = 16;
  const padBottom = 34;
  const chartW = W - padX - 8;
  const chartH = H - padTop - padBottom;

  const barGap = 4;
  const barW = Math.min(32, (chartW - barGap * (data.length - 1)) / data.length);
  const totalBarsW = data.length * barW + (data.length - 1) * barGap;
  const offsetX = padX + (chartW - totalBarsW) / 2;

  const gridLines = 3;
  const gridVals = Array.from({ length: gridLines }, (_, i) => (maxVal / (gridLines - 1)) * i);

  return (
    <div className="chart-card">
      <h3 className="chart-title">{label}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="bar-chart-svg">
        {gridVals.map((v, i) => {
          const y = padTop + chartH - (v / maxVal) * chartH;
          return (
            <g key={i}>
              <line x1={padX - 4} y1={y} x2={W - 8} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
              <text x={padX - 6} y={y + 3} textAnchor="end" fill="#6b7280" fontSize="8">
                {formatValue ? formatValue(v) : Math.round(v)}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id={`bar-grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const barH = maxVal > 0 ? (d[dataKey] / maxVal) * chartH : 0;
          const x = offsetX + i * (barW + barGap);
          const y = padTop + chartH - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={2} fill={`url(#bar-grad-${dataKey})`} />
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill="#e5e7eb" fontSize="9" fontWeight="600">
                {formatValue ? formatValue(d[dataKey]) : d[dataKey]}
              </text>
              {data.length <= 31 && (
                <text
                  x={x + barW / 2}
                  y={padTop + chartH + 6}
                  textAnchor="end"
                  fill="#6b7280"
                  fontSize="8"
                  transform={`rotate(-45, ${x + barW / 2}, ${padTop + chartH + 6})`}
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
