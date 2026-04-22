import { useState, useRef, useEffect } from 'react';
import { exportToExcel, exportToPDF } from '../export.js';

const EXPORT_PERIODS = [
  { key: 'today', label: 'Сегодня' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'all', label: 'Всё время' },
];

function getExportDateRange(period) {
  const now = new Date();
  if (period === 'today') {
    return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: null };
  }
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { start: d, end: null };
  }
  if (period === 'month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return { start: d, end: null };
  }
  return { start: null, end: null }; // all
}

export default function ExportDropdown({ orders }) {
  const [open, setOpen] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('all');
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [includeRejected, setIncludeRejected] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getFilteredOrders = () => {
    let filtered = [...orders];

    // Фильтр по периоду экспорта
    const { start } = getExportDateRange(exportPeriod);
    if (start) {
      filtered = filtered.filter(o => {
        const d = new Date(o.created_at);
        return d >= start;
      });
    }

    // Фильтр завершённых
    if (!includeCompleted) {
      filtered = filtered.filter(o => o.status !== 'completed');
    }

    // Фильтр отказов
    if (!includeRejected) {
      filtered = filtered.filter(o => o.status !== 'rejected');
    }

    return filtered;
  };

  const handleExport = (type) => {
    const filtered = getFilteredOrders();
    if (filtered.length === 0) {
      alert('Нет заказов для экспорта за выбранный период');
      return;
    }
    if (type === 'excel') {
      exportToExcel(filtered);
    } else {
      exportToPDF(filtered);
    }
    setOpen(false);
  };

  const filteredCount = getFilteredOrders().length;

  return (
    <div className="export-dropdown-wrapper" ref={ref}>
      <button
        className={`export-trigger-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        title="Экспорт данных"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}>
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Экспорт
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 4, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="export-dropdown-panel">
          <div className="export-dropdown-section">
            <div className="export-dropdown-label">Период экспорта</div>
            <div className="export-period-selector">
              {EXPORT_PERIODS.map((p) => (
                <button
                  key={p.key}
                  className={`export-period-btn ${exportPeriod === p.key ? 'active' : ''}`}
                  onClick={() => setExportPeriod(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="export-dropdown-section">
            <label className="export-checkbox-label" onClick={() => setIncludeCompleted(!includeCompleted)}>
              <span className={`export-checkbox ${includeCompleted ? 'checked' : ''}`}>
                {includeCompleted && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              Завершённые заказы
            </label>
            <label className="export-checkbox-label" onClick={() => setIncludeRejected(!includeRejected)}>
              <span className={`export-checkbox ${includeRejected ? 'checked' : ''}`}>
                {includeRejected && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              Отказы
            </label>
          </div>

          <div className="export-dropdown-count">
            Заказов к экспорту: <strong>{filteredCount}</strong>
          </div>

          <div className="export-dropdown-actions">
            <button className="export-action-btn excel" onClick={() => handleExport('excel')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2"/>
                <path d="M14 2v6h6M8 13h8M8 17h8M10 9h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Excel
            </button>
            <button className="export-action-btn pdf" onClick={() => handleExport('pdf')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" stroke="currentColor" strokeWidth="2"/>
                <path d="M6 14h12v8H6z" stroke="currentColor" strokeWidth="2"/>
              </svg>
              PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
