import { STATUS_LABELS, STATUS_COLORS, ORDER_TAGS, STATUS_TRANSITIONS } from '../constants.js';
import { formatDate, itemsSummary } from '../utils.js';

function calcEstimates(order, timings) {
  if (!timings || !order.items || !Array.isArray(order.items)) return null;

  let minDays = 0;
  let maxDays = 0;
  let totalHours = 0;
  let hasRAL = false;
  let needsDemolition = order.needs_demolition;
  let totalItems = 0;

  order.items.forEach((item) => {
    const count = item.count || 1;
    totalItems += count;

    let itemMinDays = 0;
    let itemMaxDays = 0;
    let itemHours = 0;

    if (item.profileType === 'cold-alu') {
      itemMinDays = timings.cold_alu_min_days;
      itemMaxDays = timings.cold_alu_max_days;
    } else if (item.profileType === 'warm-alu') {
      itemMinDays = timings.warm_alu_min_days;
      itemMaxDays = timings.warm_alu_max_days;
    } else if (item.profileType === 'pvc') {
      if (item.chambers === '5') {
        itemMinDays = timings.pvc_5_min_days;
        itemMaxDays = timings.pvc_5_max_days;
      } else {
        itemMinDays = timings.pvc_3_min_days;
        itemMaxDays = timings.pvc_3_max_days;
      }
    }

    if (item.productType === 'window') itemHours = timings.window_hours;
    else if (item.productType === 'door') itemHours = timings.door_hours;
    else if (item.productType === 'partition') itemHours = timings.partition_hours;
    else if (item.productType === 'sliding-balcony') itemHours = timings.sliding_balcony_hours;

    if (item.needsRAL) hasRAL = true;

    minDays = Math.max(minDays, itemMinDays);
    maxDays = Math.max(maxDays, itemMaxDays);
    totalHours += itemHours * count;
  });

  if (hasRAL) {
    minDays += timings.ral_extra_days;
    maxDays += timings.ral_extra_days;
  }

  if (needsDemolition) {
    totalHours += timings.demolition_extra_hours * totalItems;
  }

  const hoursDisplay = totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1);

  return { minDays, maxDays, totalHours: hoursDisplay };
}

export default function OrderCard({ 
  order, 
  openDropdown, 
  setOpenDropdown, 
  dropdownRef, 
  onStatusChange, 
  onArchive, 
  onToggleTag, 
  timings,
  isCompact = false 
}) {
  const sc = STATUS_COLORS[order.status] || STATUS_COLORS['new'];
  const showEstimates = order.status !== 'new' && order.status !== 'rejected' && order.status !== 'completed' && !isCompact;
  const estimates = showEstimates ? calcEstimates(order, timings) : null;

  if (isCompact) {
    // Определяем следующий шаг (первый не-rejected переход)
    const transitions = STATUS_TRANSITIONS[order.status] || [];
    const nextStep = transitions.find(t => t !== 'rejected');
    const canReject = transitions.includes('rejected');

    return (
      <div className="kanban-card">
        <div className="kanban-card-top">
          <span className="order-date">{formatDate(order.created_at)}</span>
          {order.client_phone && (
            <a href={`tel:${order.client_phone}`} className="kanban-phone" title={order.client_phone}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          )}
        </div>

        <div className="kanban-card-main">
          <div className="order-client">{order.client_name || 'Без имени'}</div>
          <div className="order-price active">
            {order.final_sum
              ? `${Number(order.final_sum).toLocaleString('ru-RU')} ₽`
              : order.price_min != null ? `${order.price_min.toLocaleString('ru-RU')} ₽` : '—'}
          </div>
        </div>

        <div className="order-items compact">
          {itemsSummary(order.items)}
        </div>

        {(order.tag || '').split(',').filter(Boolean).length > 0 && (
          <div className="kanban-tags-row">
            {(order.tag || '').split(',').filter(Boolean).map(tagKey => {
              const tag = ORDER_TAGS.find(t => t.key === tagKey);
              if (!tag) return null;
              return (
                <span 
                  key={tagKey} 
                  className="kanban-tag" 
                  style={{ background: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }}
                >
                  {tag.label}
                </span>
              );
            })}
          </div>
        )}

        <div className="kanban-card-actions">
          {nextStep && (
            <button 
              className="kanban-next-btn"
              onClick={() => onStatusChange(order.id, nextStep)}
              title={`Перевести в: ${STATUS_LABELS[nextStep]}`}
            >
              <span>{STATUS_LABELS[nextStep]}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          {canReject && (
            <button 
              className="kanban-reject-btn"
              onClick={() => onStatusChange(order.id, 'rejected')}
              title="Отказ"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          {order.status === 'rejected' && transitions.includes('new') && (
            <button 
              className="kanban-restore-btn"
              onClick={() => onStatusChange(order.id, 'new')}
              title="Вернуть в Новые"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 109-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M3 3v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>Вернуть</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="order-row">
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
          <span className={`order-price ${order.final_sum ? 'order-price-final' : ''}`}>
            {order.final_sum
              ? `${Number(order.final_sum).toLocaleString('ru-RU')} ₽`
              : order.price_min != null && order.price_max != null
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
                {(STATUS_TRANSITIONS[order.status] || []).map((key) => (
                  <button
                    key={key}
                    className="dropdown-item"
                    style={{ color: STATUS_COLORS[key]?.text }}
                    onClick={() => onStatusChange(order.id, key)}
                  >
                    <span
                      className="dropdown-dot"
                      style={{ background: STATUS_COLORS[key]?.text }}
                    />
                    {STATUS_LABELS[key]}
                  </button>
                ))}
                {(!STATUS_TRANSITIONS[order.status] || STATUS_TRANSITIONS[order.status].length === 0) && (
                  <div className="dropdown-item" style={{ color: '#6b7280', cursor: 'default' }}>
                    Финальный статус
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="order-bottom">
        <div className="order-items">
          {itemsSummary(order.items)}
          {order.address && (
            <span className="order-address"> | {order.address}</span>
          )}
          {order.measurement_date && (
            <span className="order-measurement-date"> | Замер: {order.measurement_date.slice(8)}.{order.measurement_date.slice(5,7)}{order.measurement_time ? ` в ${order.measurement_time}` : ''}</span>
          )}
          {order.install_date && (
            <span className="order-install-date"> | Монтаж: {order.install_date.slice(8)}.{order.install_date.slice(5,7)}.{order.install_date.slice(0,4)}{order.install_time ? ` в ${order.install_time}` : ''}</span>
          )}
          {order.order_comment && (
            <span className="order-comment-text"> | {order.order_comment}</span>
          )}
          {order.rejection_reason && (
            <span className="order-rejection"> | Причина: {order.rejection_reason}</span>
          )}
        </div>
        {estimates && (
          <div className="order-estimates">
            <span className="estimate-badge estimate-production">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Изготовление: {estimates.minDays}–{estimates.maxDays} дн.
            </span>
            <span className="estimate-badge estimate-install">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Монтаж: ~{estimates.totalHours} ч.
            </span>
          </div>
        )}
        <div className="order-actions">
          <div className="tag-selector">
            {ORDER_TAGS.map((t) => {
              const tags = (order.tag || '').split(',');
              const isActive = tags.includes(t.key);
              return (
                <button
                  key={t.key}
                  className={`tag-btn ${isActive ? 'active' : ''}`}
                  style={isActive ? { background: t.color + '22', color: t.color, borderColor: t.color + '44' } : {}}
                  onClick={() => onToggleTag(order.id, t.key)}
                  title={t.label}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <button className="delete-btn" onClick={() => onArchive(order.id)} title="Архивировать">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 8l2 12a2 2 0 002 2h6a2 2 0 002-2l2-12M3 5h18M9 5V3h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
