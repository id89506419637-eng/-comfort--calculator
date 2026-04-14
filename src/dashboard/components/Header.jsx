import { PERIOD_OPTIONS } from '../constants.js';
import LogoSVG from '../../LogoSVG.jsx';
import { exportToExcel, exportToPDF } from '../export.js';

export default function Header({ 
  orders,
  period, setPeriod, customDate, setCustomDate, 
  onShowSummary, onShowPassword, onShowPrices, onShowCalendar, onShowMap, onLogout, 
  viewMode, setViewMode 
}) {
  return (
    <header className="dashboard-header">
      <div className="header-left">
        <a href="#" className="back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Назад к калькулятору
        </a>
        <div className="header-title-group">
          <LogoSVG height={28} className="dashboard-logo-img" />
          <span className="header-subtitle">Панель управления заказами</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="period-selector">
          {PERIOD_OPTIONS.map((p) => (
            p.key === 'custom' ? (
              <div key={p.key} className="custom-date-wrapper">
                <button
                  className={`period-btn ${period === 'custom' ? 'active' : ''}`}
                  onClick={() => {
                    const input = document.getElementById('dashboard-date-picker');
                    if (input) input.showPicker();
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {period === 'custom' && customDate
                    ? customDate.slice(5).replace('-', '.')
                    : p.label}
                </button>
                <input
                  id="dashboard-date-picker"
                  type="date"
                  className="hidden-date-input"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setPeriod('custom');
                  }}
                />
              </div>
            ) : (
              <button
                key={p.key}
                className={`period-btn ${period === p.key ? 'active' : ''}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            )
          ))}
        </div>
        <div className="view-toggle">
          <button 
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Список"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button 
            className={`view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
            onClick={() => setViewMode('kanban')}
            title="Канбан"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
        </div>
        <button onClick={onShowPrices} className="prices-nav-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Цены
        </button>
        <button onClick={onShowCalendar} className="calendar-nav-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Календарь
        </button>
        <button onClick={onShowMap} className="map-nav-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/></svg>
          Карта
        </button>
        <button onClick={onShowSummary} className="summary-btn">Итоги</button>
        
        <button onClick={() => exportToExcel(orders)} className="export-nav-btn excel" title="Скачать Excel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2"/><path d="M14 2v6h6M8 13h8M8 17h8M10 9h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Excel
        </button>
        <button onClick={() => exportToPDF(orders)} className="export-nav-btn pdf" title="Печать PDF">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" stroke="currentColor" strokeWidth="2"/><path d="M6 14h12v8H6z" stroke="currentColor" strokeWidth="2"/></svg>
          PDF
        </button>
        <button onClick={onShowPassword} className="password-btn" title="Сменить пароль">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <button onClick={onLogout} className="logout-btn">Выйти</button>
      </div>
    </header>
  );
}
