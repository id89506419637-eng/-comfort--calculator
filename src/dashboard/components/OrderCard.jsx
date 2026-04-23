import { useState } from 'react';
import { STATUS_LABELS, STATUS_COLORS, ORDER_TAGS, STATUS_TRANSITIONS, PAYMENT_STATUS, DELIVERY_TYPES } from '../constants.js';
import { formatDate, formatMoney, itemsSummary } from '../utils.js';

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

function calcOverdue(order, estimates) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const MEASUREMENT_CLOSED = ['measurement_done', 'approval', 'in_work', 'production', 'install_scheduled', 'install_done', 'completed', 'rejected'];
  const INSTALL_CLOSED = ['install_done', 'completed', 'rejected'];

  if (order.measurement_date && !MEASUREMENT_CLOSED.includes(order.status)) {
    const d = new Date(order.measurement_date);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((d - today) / (24 * 60 * 60 * 1000));
    if (diffDays < 0) return { level: 'overdue', text: `⚠ Замер просрочен на ${-diffDays} дн.` };
    if (diffDays === 0) return { level: 'warn', text: '⏰ Замер сегодня' };
    if (diffDays === 1) return { level: 'warn', text: '⏰ Замер завтра' };
  }

  if (order.install_date && !INSTALL_CLOSED.includes(order.status)) {
    const d = new Date(order.install_date);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((d - today) / (24 * 60 * 60 * 1000));
    if (diffDays < 0) return { level: 'overdue', text: `⚠ Монтаж просрочен на ${-diffDays} дн.` };
    if (diffDays === 0) return { level: 'warn', text: '⏰ Монтаж сегодня' };
    if (diffDays === 1) return { level: 'warn', text: '⏰ Монтаж завтра' };
  }

  if (order.status === 'in_work' && order.in_work_at && estimates) {
    const startDate = new Date(order.in_work_at);
    startDate.setHours(0, 0, 0, 0);
    const daysElapsed = Math.floor((today - startDate) / (24 * 60 * 60 * 1000));
    if (daysElapsed >= estimates.maxDays) {
      return { level: 'overdue', text: `⚠ Производство просрочено на ${daysElapsed - estimates.maxDays + 1} дн.` };
    }
    if (daysElapsed >= estimates.minDays) {
      return { level: 'warn', text: `⏰ Скоро срок: осталось ${estimates.maxDays - daysElapsed} дн.` };
    }
  }

  return null;
}

export default function OrderCard({
  order,
  openDropdown,
  setOpenDropdown,
  dropdownRef,
  onStatusChange,
  onUpdateField,
  onArchive,
  onToggleTag,
  onShowHistory,
  onDelete,
  employees,
  timings,
  isCompact = false
}) {
  const sc = STATUS_COLORS[order.status] || STATUS_COLORS['new'];
  const showEstimates = order.status !== 'new' && order.status !== 'rejected' && order.status !== 'completed' && !isCompact;
  const estimates = showEstimates ? calcEstimates(order, timings) : null;
  const overdue = calcOverdue(order, estimates);
  const [expanded, setExpanded] = useState(false);

  const paymentInfo = PAYMENT_STATUS[order.payment_status] || PAYMENT_STATUS['not_paid'];
  const deliveryInfo = DELIVERY_TYPES[order.delivery_type] || DELIVERY_TYPES['install'];

  if (isCompact) {
    const transitions = STATUS_TRANSITIONS[order.status] || [];
    const nonRejected = transitions.filter(t => t !== 'rejected');
    const nextStep = nonRejected[0];
    const prevStep = nonRejected[1];
    const canReject = transitions.includes('rejected');

    return (
      <div className="kanban-card">
        <div className="kanban-card-top">
          <span className="order-date">{formatDate(order.created_at)}</span>
          {order.manager && <span className="kanban-manager">{order.manager}</span>}
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
              ? formatMoney(Number(order.final_sum))
              : order.price_min != null ? formatMoney(order.price_min) : '—'}
          </div>
        </div>

        {/* Оплата и производство в канбане */}
        <div className="kanban-meta-row">
          <span className="kanban-payment" style={{ color: paymentInfo.color, background: paymentInfo.bg }}>
            {paymentInfo.label}
          </span>
          {order.final_sum && order.paid_amount > 0 && order.payment_status === 'partial' && (
            <span className="kanban-pay-progress">
              {Number(order.paid_amount).toLocaleString('ru-RU')} ₽ ({Math.round((Number(order.paid_amount) / Number(order.final_sum)) * 100)}%)
            </span>
          )}
          {order.production_percent > 0 && (
            <span className="kanban-production">
              {order.production_percent}%
            </span>
          )}
          <span className="kanban-delivery-icon" title={deliveryInfo.label}>
            {deliveryInfo.icon}
          </span>
        </div>

        <div className="order-items compact">
          {itemsSummary(order.items)}
        </div>

        {(() => {
          const rows = [];
          if (order.status === 'measurement_scheduled') {
            if (order.measurement_date) {
              const d = order.measurement_date;
              const dateStr = `${d.slice(8)}.${d.slice(5, 7)}.${d.slice(2, 4)}`;
              rows.push({ icon: '📅', text: order.measurement_time ? `${dateStr} в ${order.measurement_time}` : dateStr });
            }
            if (order.measurer) rows.push({ icon: '👤', text: order.measurer });
            if (order.address) rows.push({ icon: '📍', text: order.address });
          } else if (order.status === 'install_scheduled') {
            if (order.install_date) {
              const d = order.install_date;
              const dateStr = `${d.slice(8)}.${d.slice(5, 7)}.${d.slice(2, 4)}`;
              rows.push({ icon: '📅', text: order.install_time ? `${dateStr} в ${order.install_time}` : dateStr });
            }
            if (order.installer) rows.push({ icon: '🔧', text: order.installer });
            if (order.address) rows.push({ icon: '📍', text: order.address });
          } else if (order.status === 'in_work' || order.status === 'measurement_done' || order.status === 'approval' || order.status === 'production') {
            if (order.address) rows.push({ icon: '📍', text: order.address });
          }
          if (rows.length === 0) return null;
          return (
            <div className="kanban-context">
              {rows.map((r, i) => (
                <div key={i} className="kanban-context-row">
                  <span className="kanban-context-icon">{r.icon}</span>
                  <span className="kanban-context-text">{r.text}</span>
                </div>
              ))}
            </div>
          );
        })()}

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
          {prevStep && (
            <button
              className="kanban-back-btn"
              onClick={() => onStatusChange(order.id, prevStep)}
              title={`Откатить в: ${STATUS_LABELS[prevStep]}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
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
          {order.status === 'rejected' && (
            <button
              className="kanban-archive-btn"
              onClick={() => onArchive(order.id)}
              title="В архив"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 8l2 12a2 2 0 002 2h6a2 2 0 002-2l2-12M3 5h18M9 5V3h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          {order.status === 'completed' && (
            <button
              className="kanban-close-btn"
              onClick={() => onArchive(order.id)}
              title="Закрыть заявку и отправить в архив"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>Закрыть заявку</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ===== ПОЛНАЯ КАРТОЧКА (list view) =====
  return (
    <div className={`order-row${overdue ? ` order-${overdue.level}` : ''}`}>
      <div className="order-top">
        <div className="order-info">
          <span className="order-date">{formatDate(order.created_at)}</span>
          <span className="order-client">{order.client_name || 'Без имени'}</span>
          {order.client_phone && (
            <span className="order-company"><a href={`tel:${order.client_phone}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>{order.client_phone}</a></span>
          )}
          {order.contractor && (
            <span className="order-contractor">{order.contractor}</span>
          )}
          {order.manager && (
            <span className="order-manager-badge">{order.manager}</span>
          )}
          {overdue && (
            <span className={`overdue-badge overdue-${overdue.level}`}>{overdue.text}</span>
          )}
        </div>
        <div className="order-right">
          {/* Оплата — выпадающий список */}
          <div className="status-wrapper" ref={openDropdown === `pay-${order.id}` ? dropdownRef : null}>
            <button
              className="payment-badge"
              style={{ color: paymentInfo.color, background: paymentInfo.bg, border: `1px solid ${paymentInfo.color}33` }}
              onClick={() => setOpenDropdown(openDropdown === `pay-${order.id}` ? null : `pay-${order.id}`)}
              title="Выберите статус оплаты"
            >
              {paymentInfo.label}
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 4 }}><path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {openDropdown === `pay-${order.id}` && (
              <div className="status-dropdown">
                {Object.entries(PAYMENT_STATUS).map(([key, info]) => (
                  <button
                    key={key}
                    className="dropdown-item"
                    style={{ color: info.color }}
                    onClick={() => {
                      onUpdateField(order.id, 'payment_status', key);
                      setOpenDropdown(null);
                    }}
                  >
                    <span className="dropdown-dot" style={{ background: info.color }} />
                    {info.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className={`order-price ${order.final_sum ? 'order-price-final' : ''}`}>
            {order.final_sum
              ? formatMoney(Number(order.final_sum))
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

      {/* Вторая строка: детали */}
      <div className="order-details-row">
        <div className="order-items">
          {itemsSummary(order.items)}
          {order.total_area > 0 && (
            <span className="order-area"> | {order.total_area} м²</span>
          )}
          {order.address && (
            <span className="order-address"> | {order.address}</span>
          )}
        </div>
        <div className="order-meta-badges">
          {/* Тип отгрузки */}
          <span className="delivery-badge" title={deliveryInfo.label}>
            {deliveryInfo.icon} {deliveryInfo.label}
          </span>
          {/* Готовность цеха */}
          {order.status !== 'new' && order.status !== 'rejected' && order.status !== 'completed' && (
            <span className="production-badge" title="Готовность цеха">
              <span className="production-bar">
                <span className="production-fill" style={{ width: `${order.production_percent || 0}%` }} />
              </span>
              {order.production_percent || 0}%
            </span>
          )}
        </div>
      </div>

      {/* Третья строка: даты, договоры, замерщик */}
      <div className="order-extra-row">
        {order.contract_number && (
          <span className="order-doc">Дог. {order.contract_number}</span>
        )}
        {order.invoice_number && (
          <span className="order-doc">Счёт {order.invoice_number}</span>
        )}
        {order.measurer && (
          <span className="order-measurer-badge">Замерщик: {order.measurer}</span>
        )}
        {order.installer && (
          <span className="order-installer-badge">Монтажник: {order.installer}</span>
        )}
        {order.measurement_date && (
          <span className="order-measurement-date">Замер: {order.measurement_date.slice(8)}.{order.measurement_date.slice(5,7)}{order.measurement_time ? ` в ${order.measurement_time}` : ''}</span>
        )}
        {order.install_date && (
          <span className="order-install-date">Монтаж: {order.install_date.slice(8)}.{order.install_date.slice(5,7)}.{order.install_date.slice(0,4)}{order.install_time ? ` в ${order.install_time}` : ''}</span>
        )}
        {order.paid_amount > 0 && order.payment_status === 'partial' && (
          <span className="order-paid-amount">Оплачено: {formatMoney(Number(order.paid_amount))}</span>
        )}
      </div>

      {/* Комментарии, причина отказа */}
      {(order.order_comment || order.rejection_reason) && (
        <div className="order-comments-row">
          {order.order_comment && (
            <span className="order-comment-text">{order.order_comment}</span>
          )}
          {order.rejection_reason && (
            <span className="order-rejection">Причина: {order.rejection_reason}</span>
          )}
        </div>
      )}

      {/* Оценки сроков */}
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

      {/* Действия */}
      <div className="order-bottom">
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
          <div className="order-action-btns">
            {/* Кнопка развернуть/редактировать */}
            <button className="edit-btn" onClick={() => setExpanded(!expanded)} title="Редактировать поля">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {/* Кнопка история */}
            <button className="history-btn" onClick={() => onShowHistory(order.id)} title="История действий">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <button className="delete-btn" onClick={() => onArchive(order.id)} title="Архивировать">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 8l2 12a2 2 0 002 2h6a2 2 0 002-2l2-12M3 5h18M9 5V3h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="permanent-delete-btn" onClick={() => onDelete(order.id)} title="Удалить навсегда">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Раскрывающаяся панель редактирования */}
      {expanded && (
        <div className="order-expand-panel">
          <div className="expand-grid">
            <div className="expand-field">
              <label>Менеджер</label>
              <select
                value={order.manager || ''}
                onChange={(e) => onUpdateField(order.id, 'manager', e.target.value || null)}
              >
                <option value="">— не назначен —</option>
                {(employees || []).filter(e => e.role === 'manager' || e.role === 'admin').map(e => (
                  <option key={e.id} value={e.name}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="expand-field">
              <label>Замерщик</label>
              <select
                value={order.measurer || ''}
                onChange={(e) => onUpdateField(order.id, 'measurer', e.target.value || null)}
              >
                <option value="">— не назначен —</option>
                {(employees || []).filter(e => e.role === 'measurer' || e.role === 'installer').map(e => (
                  <option key={e.id} value={e.name}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="expand-field">
              <label>Монтажник</label>
              <select
                value={order.installer || ''}
                onChange={(e) => onUpdateField(order.id, 'installer', e.target.value || null)}
              >
                <option value="">— не назначен —</option>
                {(employees || []).filter(e => e.role === 'installer').map(e => (
                  <option key={e.id} value={e.name}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="expand-field">
              <label>Контрагент</label>
              <input
                type="text"
                defaultValue={order.contractor || ''}
                placeholder="Подрядчик"
                onBlur={(e) => onUpdateField(order.id, 'contractor', e.target.value || null)}
              />
            </div>
            <div className="expand-field">
              <label>№ договора</label>
              <input
                type="text"
                defaultValue={order.contract_number || ''}
                placeholder="дог 75/26"
                onBlur={(e) => onUpdateField(order.id, 'contract_number', e.target.value || null)}
              />
            </div>
            <div className="expand-field">
              <label>№ счёта</label>
              <input
                type="text"
                defaultValue={order.invoice_number || ''}
                placeholder="Счёт"
                onBlur={(e) => onUpdateField(order.id, 'invoice_number', e.target.value || null)}
              />
            </div>
            <div className="expand-field">
              <label>Тип отгрузки</label>
              <select
                value={order.delivery_type || 'install'}
                onChange={(e) => onUpdateField(order.id, 'delivery_type', e.target.value)}
              >
                {Object.entries(DELIVERY_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>{val.icon} {val.label}</option>
                ))}
              </select>
            </div>
            <div className="expand-field">
              <label>Площадь (м²)</label>
              <input
                type="number"
                defaultValue={order.total_area || ''}
                placeholder="0"
                onBlur={(e) => onUpdateField(order.id, 'total_area', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="expand-field">
              <label>Готовность цеха (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                defaultValue={order.production_percent || 0}
                onBlur={(e) => onUpdateField(order.id, 'production_percent', Number(e.target.value) || 0)}
              />
            </div>
            <div className="expand-field">
              <label>Оплачено (₽)</label>
              <input
                type="number"
                defaultValue={order.paid_amount || ''}
                placeholder="0"
                onBlur={(e) => onUpdateField(order.id, 'paid_amount', e.target.value ? Number(e.target.value) : 0)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
