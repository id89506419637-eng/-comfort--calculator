import { useState, useEffect } from 'react';
import { supabase } from '../../supabase.js';
import { STATUS_LABELS, STATUS_COLORS, PAYMENT_STATUS, DELIVERY_TYPES } from '../constants.js';
import { itemsSummary, formatMoney } from '../utils.js';

export default function ArchivePanel({ onBack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('archived', true)
        .order('created_at', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.client_name || '').toLowerCase().includes(q) ||
      (o.client_phone || '').toLowerCase().includes(q) ||
      (o.client_company || '').toLowerCase().includes(q) ||
      (o.manager || '').toLowerCase().includes(q) ||
      (o.contractor || '').toLowerCase().includes(q) ||
      (o.address || '').toLowerCase().includes(q) ||
      (o.contract_number || '').toLowerCase().includes(q)
    );
  });

  const statusLabel = (s) => STATUS_LABELS[s] || s || '';
  const statusColor = (s) => STATUS_COLORS[s] || { bg: 'rgba(255,255,255,0.05)', text: '#9ca3af', border: 'rgba(255,255,255,0.1)' };
  const payLabel = (s) => (PAYMENT_STATUS[s] || PAYMENT_STATUS['not_paid']).label;

  return (
    <div className="archive-panel-page">
      <div className="archive-panel-header">
        <button className="archive-back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Назад
        </button>
        <div className="archive-panel-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Архив заказов
          <span className="archive-count">{filtered.length}</span>
        </div>
      </div>

      <div className="archive-search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="search-icon">
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Поиск по имени, телефону, менеджеру..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Загрузка архива...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{searchQuery ? 'Ничего не найдено' : 'Архив пуст'}</span>
        </div>
      ) : (
        <div className="archive-list">
          {filtered.map((o) => {
            const sc = statusColor(o.status);
            return (
              <div key={o.id} className="archive-row">
                <div className="archive-row-top">
                  <div className="archive-row-info">
                    <span className="order-date">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                    </span>
                    <span className="archive-client">{o.client_name || 'Без имени'}</span>
                    {o.client_phone && <span className="archive-phone">{o.client_phone}</span>}
                    {o.client_company && <span className="archive-company">{o.client_company}</span>}
                  </div>
                  <div className="archive-row-right">
                    <span className="archive-price">
                      {o.final_sum ? formatMoney(Number(o.final_sum)) : o.price_max ? formatMoney(o.price_max) : '—'}
                    </span>
                    <span
                      className="status-badge"
                      style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
                    >
                      {statusLabel(o.status)}
                    </span>
                  </div>
                </div>
                <div className="archive-row-details">
                  {o.manager && <span className="archive-detail">👤 {o.manager}</span>}
                  {o.contractor && <span className="archive-detail">🏭 {o.contractor}</span>}
                  {o.address && <span className="archive-detail">📍 {o.address}</span>}
                  {o.contract_number && <span className="archive-detail">📄 {o.contract_number}</span>}
                  <span className="archive-detail">💳 {payLabel(o.payment_status)}</span>
                  <span className="archive-detail">📦 {itemsSummary(o.items)}</span>
                  {o.rejection_reason && <span className="archive-detail archive-reason">❌ {o.rejection_reason}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
