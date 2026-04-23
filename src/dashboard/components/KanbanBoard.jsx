import { STATUS_ORDER, STATUS_LABELS, STATUS_COLORS } from '../constants.js';
import { itemsSummary, formatMoney } from '../utils.js';
import OrderCard from './OrderCard.jsx';

export default function KanbanBoard({
  orders,
  onStatusChange,
  onUpdateField,
  onArchive,
  onToggleTag,
  employees,
  timings,
}) {
  // Вычисляем данные для каждой колонки
  const columns = STATUS_ORDER.map(status => {
    const columnOrders = orders.filter(o => o.status === status);
    const totalSum = columnOrders.reduce((sum, o) => sum + (o.final_sum || o.price_max || 0), 0);
    return {
      status,
      label: STATUS_LABELS[status],
      orders: columnOrders,
      sum: totalSum,
      color: STATUS_COLORS[status].text
    };
  });

  // Добавляем колонку "Отказ" в конец
  const rejectedOrders = orders.filter(o => o.status === 'rejected');
  const rejectedSum = rejectedOrders.reduce((sum, o) => sum + (o.final_sum || o.price_max || 0), 0);
  columns.push({
    status: 'rejected',
    label: STATUS_LABELS['rejected'],
    orders: rejectedOrders,
    sum: rejectedSum,
    color: STATUS_COLORS['rejected'].text
  });

  return (
    <div className="kanban-board">
      {columns.map(col => (
        <div key={col.status} className="kanban-column">
          <div className="kanban-column-header" style={{ borderTop: `3px solid ${col.color}` }}>
            <div className="kanban-column-title">
              <span className="kanban-status-dot" style={{ background: col.color }} />
              {col.label}
              <span className="kanban-column-count">{col.orders.length}</span>
            </div>
            <div className="kanban-column-sum">{formatMoney(col.sum)}</div>
          </div>
          
          <div className="kanban-column-content">
            {col.orders.length === 0 ? (
              <div className="kanban-empty-column">Нет заказов</div>
            ) : (
              col.orders.map(order => (
                <div key={order.id} className="kanban-card-wrapper">
                  <OrderCard
                    order={order}
                    isCompact={true}
                    onStatusChange={onStatusChange}
                    onUpdateField={onUpdateField}
                    onArchive={onArchive}
                    onToggleTag={onToggleTag}
                    employees={employees}
                    timings={timings}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
