import { PRODUCT_LABELS, PROFILE_LABELS, PIE_COLORS, STATUS_ORDER, STATUS_LABELS, STATUS_COLORS } from '../constants.js';
import { groupByDay } from '../utils.js';
import MiniBarChart from './MiniBarChart.jsx';

export default function AnalyticsPanel({ orders }) {
  /* product & profile counts — считаем все активные заказы */
  const productCounts = {};
  const profileCounts = {};
  orders.filter((o) => o.status !== 'new' && o.status !== 'rejected').forEach((o) => {
    if (!o.items || !Array.isArray(o.items)) return;
    o.items.forEach((it) => {
      const pLabel = PRODUCT_LABELS[it.productType] || it.productType || '?';
      productCounts[pLabel] = (productCounts[pLabel] || 0) + (it.count || 1);
      let prLabel = PROFILE_LABELS[it.profileType] || it.profileType || '?';
      if (it.profileType === 'pvc') {
        prLabel = it.chambers === '5' ? 'ПВХ 5-кам.' : 'ПВХ 3-кам.';
      }
      profileCounts[prLabel] = (profileCounts[prLabel] || 0) + (it.count || 1);
    });
  });

  const productTotal = Object.values(productCounts).reduce((a, b) => a + b, 0) || 1;
  const profileTotal = Object.values(profileCounts).reduce((a, b) => a + b, 0) || 1;

  /* dynamics data */
  const dailyData = groupByDay(orders);
  const dailyWithConversion = dailyData.map((d) => ({
    ...d,
    conversion: d.count > 0 ? Math.round((d.orderCount / d.count) * 100) : 0,
  }));

  /* funnel — полная воронка */
  const funnelSteps = [
    ...STATUS_ORDER.map((key) => ({ key, label: STATUS_LABELS[key], color: STATUS_COLORS[key].text })),
    { key: 'rejected', label: STATUS_LABELS['rejected'], color: STATUS_COLORS['rejected'].text },
  ];
  const funnelCounts = {};
  funnelSteps.forEach((s) => {
    funnelCounts[s.key] = orders.filter((o) => o.status === s.key).length;
  });
  const funnelMax = Math.max(...Object.values(funnelCounts), 1);

  /* pie chart */
  const pieEntries = Object.entries(productCounts);
  let cumAngle = 0;
  const pieSlices = pieEntries.map(([label, count], i) => {
    const pct = count / productTotal;
    const startAngle = cumAngle;
    cumAngle += pct * 360;
    const endAngle = cumAngle;
    return { label, count, pct, startAngle, endAngle, color: PIE_COLORS[i % PIE_COLORS.length] };
  });

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const rad = (a) => ((a - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(endAngle));
    const y2 = cy + r * Math.sin(rad(endAngle));
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  return (
    <div className="analytics-panel">
      {dailyWithConversion.length > 0 && (
        <>
          <MiniBarChart data={dailyWithConversion} dataKey="count" color="#3b82f6" label="Динамика заявок" />
          <MiniBarChart data={dailyWithConversion} dataKey="sum" color="#22c55e" label="Динамика сумм" formatValue={(v) => v >= 1000000 ? (v / 1000000).toFixed(3) + ' млн' : Math.round(v / 1000) + ' тыс'} />
          <MiniBarChart data={dailyWithConversion} dataKey="conversion" color="#8b5cf6" label="Конверсия, %" formatValue={(v) => Math.round(v) + '%'} />
        </>
      )}

      {pieSlices.length > 0 && (
        <div className="chart-card">
          <h3 className="chart-title">Типы продукции</h3>
          <div className="pie-container">
            <svg viewBox="0 0 200 200" className="pie-svg">
              {pieSlices.map((s, i) => {
                if (pieSlices.length === 1) {
                  return <circle key={i} cx="100" cy="100" r="80" fill={s.color} />;
                }
                return (
                  <path key={i} d={describeArc(100, 100, 80, s.startAngle, s.endAngle)} fill={s.color} stroke="#1f2937" strokeWidth="2" />
                );
              })}
              <circle cx="100" cy="100" r="45" fill="#1f2937" />
              <text x="100" y="95" textAnchor="middle" fill="#e5e7eb" fontSize="20" fontWeight="700">{productTotal}</text>
              <text x="100" y="115" textAnchor="middle" fill="#9ca3af" fontSize="11">шт.</text>
            </svg>
            <div className="pie-legend">
              {pieSlices.map((s, i) => (
                <div key={i} className="legend-item">
                  <span className="legend-dot" style={{ background: s.color }} />
                  <span className="legend-label">{s.label}</span>
                  <span className="legend-value">{s.count} шт.</span>
                  <span className="legend-pct">{(s.pct * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {Object.keys(profileCounts).length > 0 && (
        <div className="chart-card">
          <h3 className="chart-title">Типы профиля <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>(кол-во изделий)</span></h3>
          <div className="profile-bars">
            {Object.entries(profileCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([label, count], i) => (
                <div key={label} className="bar-row">
                  <div className="bar-label-row">
                    <span className="bar-label">{label}</span>
                    <span className="bar-value">{count} изд.</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(count / profileTotal) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="chart-card">
        <h3 className="chart-title">Воронка продаж</h3>
        <div className="funnel">
          {funnelSteps.map((step, i) => {
            const count = funnelCounts[step.key] || 0;
            const widthPct = funnelMax > 0 ? Math.max((count / funnelMax) * 100, 8) : 8;
            return (
              <div key={step.key} className="funnel-step">
                <div className="funnel-label-row">
                  <span className="funnel-label">{step.label}</span>
                  <span className="funnel-count" style={{ color: step.color }}>{count}</span>
                </div>
                <div className="funnel-bar-wrap">
                  <div className="funnel-bar" style={{ width: `${widthPct}%`, background: `linear-gradient(90deg, ${step.color}, ${step.color}88)` }} />
                </div>
                {i < funnelSteps.length - 1 && (
                  <div className="funnel-arrow">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3v10M5 10l3 3 3-3" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
