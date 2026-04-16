import { PRODUCT_LABELS, PROFILE_LABELS } from './constants.js';

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatMoney(n) {
  if (n == null) return '—';
  return n.toLocaleString('ru-RU') + ' ₽';
}

export function getDateRange(period, customDate) {
  const now = new Date();
  if (period === 'custom' && customDate) {
    const start = new Date(customDate + 'T00:00:00');
    const end = new Date(customDate + 'T23:59:59');
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (period === 'today') {
    return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(), end: null };
  }
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { start: d.toISOString(), end: null };
  }
  if (period === 'month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return { start: d.toISOString(), end: null };
  }
  return { start: null, end: null };
}

export function groupByDay(orders) {
  const groups = {};
  orders.forEach((o) => {
    const day = o.created_at.slice(0, 10);
    if (!groups[day]) groups[day] = [];
    groups[day].push(o);
  });
  const sortedKeys = Object.keys(groups).sort();
  return sortedKeys.map((day) => ({
    day,
    label: day.slice(8) + '.' + day.slice(5, 7),
    orders: groups[day],
    count: groups[day].length,
    sum: groups[day].filter((o) => o.status === 'order').reduce((s, o) => s + (o.final_sum ? Number(o.final_sum) : (o.price_max || 0)), 0),
    orderCount: groups[day].filter((o) => o.status === 'order').length,
  }));
}

export function itemsSummary(items) {
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
