import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase.js';
import './Dashboard.css';

const STATUS_LABELS = {
  'new': 'Новая',
  'calculating': 'На расчёте',
  'kp_sent': 'КП отправлено',
  'order': 'Заказ',
  'no_answer': 'Нет ответа',
  'rejected': 'Отказ',
};

const STATUS_COLORS = {
  'new': { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: 'rgba(234, 179, 8, 0.3)' },
  'calculating': { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
  'kp_sent': { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' },
  'order': { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
  'no_answer': { bg: 'rgba(156, 163, 175, 0.15)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' },
  'rejected': { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
};

const PRODUCT_LABELS = {
  'window': 'Окно',
  'door': 'Дверь',
  'partition': 'Перегородка',
  'sliding-balcony': 'Разд. лоджия',
};

const PROFILE_LABELS = {
  'cold-alu': 'Хол. алюминий',
  'warm-alu': 'Тёпл. алюминий',
  'pvc': 'ПВХ',
};

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Сегодня' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'all', label: 'Всё время' },
];

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#eab308', '#ef4444', '#ec4899', '#06b6d4'];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatMoney(n) {
  if (n == null) return '—';
  return n.toLocaleString('ru-RU') + ' ₽';
}

function getStartDate(period) {
  const now = new Date();
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }
  if (period === 'month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString();
  }
  return null;
}

function itemsSummary(items) {
  if (!items || !Array.isArray(items)) return '—';
  const groups = {};
  items.forEach((it) => {
    const label = PRODUCT_LABELS[it.productType] || it.productType || '?';
    const profile = PROFILE_LABELS[it.profileType] || '';
    const key = `${label} ${profile}`.trim();
    groups[key] = (groups[key] || 0) + (it.count || 1);
  });
  return Object.entries(groups).map(([k, v]) => `${v}× ${k}`).join(', ');
}

/* ==================== MAIN COMPONENT ==================== */

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) setLoginError('Неверный логин или пароль');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (authLoading) {
    return (
      <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <form onSubmit={handleLogin} className="login-form">
          <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', color: '#e5e7eb' }}>Комфорт+ Дашборд</h2>
          <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>Войдите для доступа к заявкам</p>
          <input
            type="email"
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
            className="login-input"
          />
          <input
            type="password"
            placeholder="Пароль"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
            className="login-input"
          />
          {loginError && <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>{loginError}</p>}
          <button type="submit" className="login-btn">Войти</button>
        </form>
      </div>
    );
  }

  return <DashboardContent onLogout={handleLogout} />;
}

function DashboardContent({ onLogout }) {
  const [orders, setOrders] = useState([]);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    const start = getStartDate(period);
    if (start) query = query.gte('created_at', start);
    const { data, error } = await query;
    if (error) {
      console.error('Supabase error:', error);
      if (!silent) setOrders([]);
    } else {
      setOrders(data || []);
    }
    if (!silent) setLoading(false);
  }, [period]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const interval = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const updateStatus = async (id, newStatus) => {
    setOpenDropdown(null);
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
    }
  };

  /* -------- stats -------- */
  const totalCount = orders.length;
  const orderItems = orders.filter((o) => o.status === 'order');
  const orderSum = orderItems.reduce((s, o) => s + (o.price_max || 0), 0);
  const conversion = totalCount > 0 ? ((orderItems.length / totalCount) * 100).toFixed(1) : '0';
  const avgCheck = orderItems.length > 0 ? Math.round(orderSum / orderItems.length) : 0;

  /* -------- charts data -------- */
  const productCounts = {};
  const profileCounts = {};
  orders.forEach((o) => {
    if (!o.items || !Array.isArray(o.items)) return;
    o.items.forEach((it) => {
      const pLabel = PRODUCT_LABELS[it.productType] || it.productType || '?';
      productCounts[pLabel] = (productCounts[pLabel] || 0) + (it.count || 1);
      const prLabel = PROFILE_LABELS[it.profileType] || it.profileType || '?';
      profileCounts[prLabel] = (profileCounts[prLabel] || 0) + (it.count || 1);
    });
  });

  const productTotal = Object.values(productCounts).reduce((a, b) => a + b, 0) || 1;
  const profileTotal = Object.values(profileCounts).reduce((a, b) => a + b, 0) || 1;

  /* funnel */
  const funnelSteps = [
    { key: 'new', label: 'Новые', color: '#eab308' },
    { key: 'calculating', label: 'На расчёте', color: '#3b82f6' },
    { key: 'kp_sent', label: 'КП отправлено', color: '#8b5cf6' },
    { key: 'order', label: 'Заказ', color: '#22c55e' },
  ];
  const funnelCounts = {};
  funnelSteps.forEach((s) => {
    funnelCounts[s.key] = orders.filter((o) => o.status === s.key).length;
  });
  const funnelMax = Math.max(...Object.values(funnelCounts), 1);

  /* -------- pie chart SVG -------- */
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
    <div className="dashboard">
      {/* TOP BAR */}
      <header className="dashboard-header">
        <div className="header-left">
          <a href="#" className="back-link">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Назад к калькулятору
          </a>
          <div className="header-title-group">
            <h1 className="header-title">
              <span className="header-logo">К+</span>
              Комфорт+ Дашборд
            </h1>
            <span className="header-subtitle">Панель управления заказами</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="period-selector">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.key}
                className={`period-btn ${period === p.key ? 'active' : ''}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={onLogout} className="logout-btn">Выйти</button>
        </div>
      </header>

      {/* STATS ROW */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Заявок пришло</span>
            <span className="stat-value">{totalCount.toLocaleString('ru-RU')}</span>
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
            <span className="stat-value">{conversion}%</span>
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

      {/* MAIN CONTENT */}
      <div className="dashboard-main">
        {/* LEFT: ORDERS TABLE */}
        <div className="orders-panel">
          <div className="panel-header">
            <h2 className="panel-title">Заявки</h2>
            <span className="panel-count">{totalCount}</span>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <span>Загрузка данных...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="#4b5563" strokeWidth="1.5"/><path d="M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6" stroke="#4b5563" strokeWidth="1.5"/></svg>
              <span>Нет заявок за выбранный период</span>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => {
                const sc = STATUS_COLORS[order.status] || STATUS_COLORS['new'];
                return (
                  <div key={order.id} className="order-row">
                    <div className="order-top">
                      <div className="order-info">
                        <span className="order-date">{formatDate(order.created_at)}</span>
                        <span className="order-client">{order.client_name || 'Без имени'}</span>
                        {order.client_phone && (
                          <span className="order-company"><a href={`tel:${order.client_phone}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>{order.client_phone}</a></span>
                        )}
                        {order.client_company && (
                          <span className="order-company">{order.client_company}</span>
                        )}
                      </div>
                      <div className="order-right">
                        <span className="order-price">
                          {order.price_min != null && order.price_max != null
                            ? `${order.price_min.toLocaleString('ru-RU')} — ${order.price_max.toLocaleString('ru-RU')} ₽`
                            : '—'}
                        </span>
                        <div className="status-wrapper" ref={openDropdown === order.id ? dropdownRef : null}>
                          <button
                            className="status-badge"
                            style={{
                              background: sc.bg,
                              color: sc.text,
                              border: `1px solid ${sc.border}`,
                            }}
                            onClick={() => setOpenDropdown(openDropdown === order.id ? null : order.id)}
                          >
                            {STATUS_LABELS[order.status] || order.status}
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 4 }}><path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          {openDropdown === order.id && (
                            <div className="status-dropdown">
                              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                <button
                                  key={key}
                                  className={`dropdown-item ${key === order.status ? 'current' : ''}`}
                                  style={{ color: STATUS_COLORS[key]?.text }}
                                  onClick={() => updateStatus(order.id, key)}
                                >
                                  <span
                                    className="dropdown-dot"
                                    style={{ background: STATUS_COLORS[key]?.text }}
                                  />
                                  {label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="order-items">{itemsSummary(order.items)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: ANALYTICS */}
        <div className="analytics-panel">
          {/* PIE CHART */}
          <div className="chart-card">
            <h3 className="chart-title">Типы продукции</h3>
            {pieSlices.length === 0 ? (
              <div className="empty-chart">Нет данных</div>
            ) : (
              <div className="pie-container">
                <svg viewBox="0 0 200 200" className="pie-svg">
                  {pieSlices.map((s, i) => {
                    if (pieSlices.length === 1) {
                      return <circle key={i} cx="100" cy="100" r="80" fill={s.color} />;
                    }
                    return (
                      <path
                        key={i}
                        d={describeArc(100, 100, 80, s.startAngle, s.endAngle)}
                        fill={s.color}
                        stroke="#1f2937"
                        strokeWidth="2"
                      />
                    );
                  })}
                  <circle cx="100" cy="100" r="45" fill="#1f2937" />
                  <text x="100" y="95" textAnchor="middle" fill="#e5e7eb" fontSize="20" fontWeight="700">
                    {productTotal}
                  </text>
                  <text x="100" y="115" textAnchor="middle" fill="#9ca3af" fontSize="11">
                    позиций
                  </text>
                </svg>
                <div className="pie-legend">
                  {pieSlices.map((s, i) => (
                    <div key={i} className="legend-item">
                      <span className="legend-dot" style={{ background: s.color }} />
                      <span className="legend-label">{s.label}</span>
                      <span className="legend-value">{s.count}</span>
                      <span className="legend-pct">{(s.pct * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PROFILE BARS */}
          <div className="chart-card">
            <h3 className="chart-title">Типы профиля</h3>
            {Object.keys(profileCounts).length === 0 ? (
              <div className="empty-chart">Нет данных</div>
            ) : (
              <div className="profile-bars">
                {Object.entries(profileCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, count], i) => (
                    <div key={label} className="bar-row">
                      <div className="bar-label-row">
                        <span className="bar-label">{label}</span>
                        <span className="bar-value">{count}</span>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${(count / profileTotal) * 100}%`,
                            background: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* FUNNEL */}
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
                      <div
                        className="funnel-bar"
                        style={{
                          width: `${widthPct}%`,
                          background: `linear-gradient(90deg, ${step.color}, ${step.color}88)`,
                        }}
                      />
                    </div>
                    {i < funnelSteps.length - 1 && (
                      <div className="funnel-arrow">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
      </div>
    </div>
  );
}
