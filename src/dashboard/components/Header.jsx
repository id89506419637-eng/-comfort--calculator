import { PERIOD_OPTIONS } from '../constants.js';
import LogoSVG from '../../LogoSVG.jsx';
import ExportDropdown from './ExportDropdown.jsx';

export default function Header({ 
  orders,
  period, setPeriod, customDate, setCustomDate, 
  onShowSummary, onShowPassword, onShowPrices, onShowCalendar, onShowMap, onShowArchive, onLogout, 
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
          <LogoSVG height={48} className="dashboard-logo-img" />
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
        <button onClick={onShowArchive} className="archive-nav-btn" title="Архив заказов">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Архив
        </button>
        <button onClick={onShowSummary} className="summary-btn">Итоги</button>
        
        <ExportDropdown orders={orders} />
        <button onClick={onShowPassword} className="password-btn" title="Сменить пароль">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <button onClick={onLogout} className="logout-btn">Выйти</button>
      </div>
    </header>
  );
}
