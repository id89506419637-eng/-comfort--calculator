import { useState, useEffect } from 'react';
import { supabase } from '../../supabase.js';
import { ACTION_LABELS } from '../constants.js';

const FIELD_LABELS = {
  final_sum: 'Сумма',
  address: 'Адрес',
  contractor: 'Контрагент',
  contract_number: '№ договора',
  invoice_number: '№ счёта',
  manager: 'Менеджер',
  measurer: 'Замерщик',
  delivery_type: 'Тип отгрузки',
  total_area: 'Площадь м²',
  payment_status: 'Статус оплаты',
  paid_amount: 'Оплачено',
  production_percent: 'Готовность цеха',
  archived: 'Архивирован',
};

function formatActionDate(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${mon} ${hours}:${mins}`;
}

function getActionIcon(action) {
  switch (action) {
    case 'status_change': return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    );
    case 'payment': return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    );
    case 'field_update': return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    );
    default: return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#6b7280" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/></svg>
    );
  }
}

export default function HistoryPanel({ orderId, clientName, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('action_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(100);
      setHistory(data || []);
      setLoading(false);
    }
    load();
  }, [orderId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h3 className="modal-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            История — {clientName || `Заказ #${orderId}`}
          </h3>
          <button className="history-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="history-body">
          {loading ? (
            <div className="loading-state"><div className="spinner" /><span>Загрузка...</span></div>
          ) : history.length === 0 ? (
            <div className="history-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#4b5563" strokeWidth="1.5"/><path d="M12 6v6l4 2" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <span>Пока нет записей</span>
            </div>
          ) : (
            <div className="history-timeline">
              {history.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-icon">{getActionIcon(item.action)}</div>
                  <div className="history-content">
                    <div className="history-action">
                      <span className="history-action-label">
                        {ACTION_LABELS[item.action] || item.action}
                      </span>
                      {item.field_name && (
                        <span className="history-field-name">
                          {FIELD_LABELS[item.field_name] || item.field_name}
                        </span>
                      )}
                    </div>
                    {(item.old_value || item.new_value) && (
                      <div className="history-values">
                        {item.old_value && <span className="history-old">{item.old_value}</span>}
                        {item.old_value && item.new_value && <span className="history-arrow">→</span>}
                        {item.new_value && <span className="history-new">{item.new_value}</span>}
                      </div>
                    )}
                    {item.comment && (
                      <div className="history-comment">{item.comment}</div>
                    )}
                    <div className="history-meta">
                      <span className="history-date">{formatActionDate(item.created_at)}</span>
                      <span className="history-user">{item.user_email}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
