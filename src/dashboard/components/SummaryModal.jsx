import { PRODUCT_LABELS, PERIOD_OPTIONS } from '../constants.js';
import { formatMoney } from '../utils.js';

export default function SummaryModal({ orders, period, onClose }) {
  const totalCount = orders.length;
  const orderItems = orders.filter((o) => o.status !== 'new' && o.status !== 'rejected');
  const rejectedOrders = orders.filter((o) => o.status === 'rejected');
  const orderSum = orderItems.reduce((s, o) => s + (o.final_sum ? Number(o.final_sum) : (o.price_max || 0)), 0);
  const conversion = totalCount > 0 ? ((orderItems.length / totalCount) * 100).toFixed(1) : '0';
  const avgCheck = orderItems.length > 0 ? Math.round(orderSum / orderItems.length) : 0;

  const reasonCounts = {};
  rejectedOrders.forEach((o) => {
    const r = o.rejection_reason || 'Не указана';
    reasonCounts[r] = (reasonCounts[r] || 0) + 1;
  });
  const sortedReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);

  const prodCounts = {};
  orderItems.forEach((o) => {
    if (!o.items || !Array.isArray(o.items)) return;
    o.items.forEach((it) => {
      const label = PRODUCT_LABELS[it.productType] || it.productType || '?';
      prodCounts[label] = (prodCounts[label] || 0) + (it.count || 1);
    });
  });
  const sortedProds = Object.entries(prodCounts).sort((a, b) => b[1] - a[1]);

  const periodLabel = PERIOD_OPTIONS.find((p) => p.key === period)?.label || 'Всё время';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box summary-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Итоги: {periodLabel}</h3>
        <div className="summary-chips">
          <span className="summary-chip">Заявок <b>{totalCount}</b></span>
          <span className="summary-chip">Заказов <b style={{ color: '#22c55e' }}>{orderItems.length}</b></span>
          <span className="summary-chip">Отказов <b style={{ color: '#ef4444' }}>{rejectedOrders.length}</b></span>
          <span className="summary-chip">Сумма <b>{formatMoney(orderSum)}</b></span>
          <span className="summary-chip">Ср. чек <b>{formatMoney(avgCheck)}</b></span>
          <span className="summary-chip">Конверсия <b>{conversion}%</b></span>
        </div>
        {sortedProds.length > 0 && (
          <div className="summary-section">
            <span className="summary-section-title">Продукция:</span>
            {sortedProds.map(([label, count]) => (
              <span key={label} className="summary-chip">{label} <b>{count} шт.</b></span>
            ))}
          </div>
        )}
        {sortedReasons.length > 0 && (
          <div className="summary-section">
            <span className="summary-section-title">Причины отказов:</span>
            {sortedReasons.map(([reason, count]) => (
              <span key={reason} className="summary-chip chip-red">{reason} <b>{count}</b></span>
            ))}
          </div>
        )}
        <div className="modal-buttons">
          <button className="modal-btn-cancel" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}
