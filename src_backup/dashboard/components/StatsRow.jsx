import { formatMoney } from '../utils.js';

export default function StatsRow({ totalCount, orderCount, rejectedCount, orderSum, conversion, conversionDiff, avgCheck }) {
  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-icon stat-icon-blue">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div className="stat-content">
          <span className="stat-label">Заявок / Заказов / Отказов</span>
          <span className="stat-value">{totalCount.toLocaleString('ru-RU')} / <span style={{ color: '#22c55e' }}>{orderCount}</span> / <span style={{ color: '#ef4444' }}>{rejectedCount}</span></span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon stat-icon-green">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div className="stat-content">
          <span className="stat-label">Сумма заказов</span>
          <span className="stat-value">{formatMoney(orderSum)}</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon stat-icon-purple">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div className="stat-content">
          <span className="stat-label">Конверсия</span>
          <span className="stat-value">
            {conversion}%
            {conversionDiff !== null && (
              <span className={`trend ${parseFloat(conversionDiff) >= 0 ? 'trend-up' : 'trend-down'}`}>
                {parseFloat(conversionDiff) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(conversionDiff))}%
              </span>
            )}
          </span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon stat-icon-amber">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div className="stat-content">
          <span className="stat-label">Средний чек</span>
          <span className="stat-value">{formatMoney(avgCheck)}</span>
        </div>
      </div>
    </div>
  );
}
