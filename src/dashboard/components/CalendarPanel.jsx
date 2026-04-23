import { useState } from 'react';
import { STATUS_COLORS, STATUS_LABELS } from '../constants.js';
import { formatMoney } from '../utils.js';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const EVENT_TYPES = {
  measurement: { label: 'Замер', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
  install: { label: 'Монтаж', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
};

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Понедельник = 0
  let startWeekday = firstDay.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;

  const days = [];
  // Дни предыдущего месяца
  const prevMonthLast = new Date(year, month, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    days.push({ day: prevMonthLast - i, currentMonth: false, date: null });
  }
  // Дни текущего месяца
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ day: d, currentMonth: true, date: dateStr });
  }
  // Дни следующего месяца (до 42 ячеек = 6 рядов)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, currentMonth: false, date: null });
  }
  return days;
}

function extractEvents(orders) {
  const events = [];
  // Статусы, при которых замер ещё актуален
  const measurementStatuses = ['measurement_scheduled'];
  // Статусы, при которых монтаж ещё актуален
  const installStatuses = ['install_scheduled'];

  orders.forEach(order => {
    if (order.measurement_date && measurementStatuses.includes(order.status)) {
      events.push({
        type: 'measurement',
        date: order.measurement_date,
        time: order.measurement_time || null,
        order,
      });
    }
    if (order.install_date && installStatuses.includes(order.status)) {
      events.push({
        type: 'install',
        date: order.install_date,
        time: order.install_time || null,
        order,
      });
    }
  });
  return events;
}

export default function CalendarPanel({ orders, onBack }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  const days = getCalendarDays(year, month);
  const events = extractEvents(orders);

  const eventsForDate = (date) => events.filter(e => e.date === date);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  const goToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDate(todayStr);
  };

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];

  // Подсчёт событий на месяц
  const monthMeasurements = events.filter(e => e.type === 'measurement' && e.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length;
  const monthInstalls = events.filter(e => e.type === 'install' && e.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length;

  return (
    <div className="calendar-panel">
      <div className="calendar-header">
        <button className="calendar-back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Назад
        </button>
        <h2 className="calendar-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Календарь
        </h2>
        <div className="calendar-month-stats">
          <span className="cal-stat" style={{ color: EVENT_TYPES.measurement.color }}>
            <span className="cal-stat-dot" style={{ background: EVENT_TYPES.measurement.color }} />
            {monthMeasurements} замер.
          </span>
          <span className="cal-stat" style={{ color: EVENT_TYPES.install.color }}>
            <span className="cal-stat-dot" style={{ background: EVENT_TYPES.install.color }} />
            {monthInstalls} монтаж.
          </span>
        </div>
      </div>

      <div className="calendar-body">
        <div className="calendar-grid-container">
          {/* Навигация по месяцам */}
          <div className="calendar-nav">
            <button className="cal-nav-btn" onClick={prevMonth}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div className="calendar-month-label">
              <span className="cal-month-name">{MONTHS[month]}</span>
              <span className="cal-year">{year}</span>
            </div>
            <button className="cal-nav-btn" onClick={nextMonth}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button className="cal-today-btn" onClick={goToday}>Сегодня</button>
          </div>

          {/* Сетка календаря */}
          <div className="calendar-grid">
            {WEEKDAYS.map(w => (
              <div key={w} className="cal-weekday">{w}</div>
            ))}
            {days.map((d, i) => {
              const dayEvents = d.date ? eventsForDate(d.date) : [];
              const hasMeasurement = dayEvents.some(e => e.type === 'measurement');
              const hasInstall = dayEvents.some(e => e.type === 'install');
              const isToday = d.date === todayStr;
              const isSelected = d.date === selectedDate;
              const isWeekend = (i % 7 === 5 || i % 7 === 6);

              return (
                <div
                  key={i}
                  className={`cal-day ${d.currentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isWeekend && d.currentMonth ? 'weekend' : ''}`}
                  onClick={() => d.date && setSelectedDate(d.date)}
                >
                  <span className="cal-day-num">{d.day}</span>
                  {dayEvents.length > 0 && (
                    <div className="cal-day-dots">
                      {hasMeasurement && <span className="cal-dot" style={{ background: EVENT_TYPES.measurement.color }} />}
                      {hasInstall && <span className="cal-dot" style={{ background: EVENT_TYPES.install.color }} />}
                    </div>
                  )}
                  {dayEvents.length > 0 && (
                    <span className="cal-day-count">{dayEvents.length}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Легенда */}
          <div className="calendar-legend">
            <div className="cal-legend-item">
              <span className="cal-legend-dot" style={{ background: EVENT_TYPES.measurement.color }} />
              Замер
            </div>
            <div className="cal-legend-item">
              <span className="cal-legend-dot" style={{ background: EVENT_TYPES.install.color }} />
              Монтаж
            </div>
          </div>
        </div>

        {/* Детали выбранного дня */}
        <div className="calendar-details">
          {selectedDate ? (
            <>
              <h3 className="cal-detail-title">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              {selectedEvents.length === 0 ? (
                <div className="cal-no-events">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#4b5563" strokeWidth="1.5"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <span>Нет событий на эту дату</span>
                </div>
              ) : (
                <div className="cal-events-list">
                  {selectedEvents.map((ev, idx) => {
                    const et = EVENT_TYPES[ev.type];
                    const sc = STATUS_COLORS[ev.order.status] || {};
                    return (
                      <div key={idx} className="cal-event-card" style={{ borderLeft: `3px solid ${et.color}` }}>
                        <div className="cal-event-header">
                          <span className="cal-event-type" style={{ color: et.color, background: et.bg }}>
                            {et.label}
                          </span>
                          {ev.time && (
                            <span className="cal-event-time">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                              {ev.time}
                            </span>
                          )}
                        </div>
                        <div className="cal-event-client">{ev.order.client_name || 'Без имени'}</div>
                        {ev.order.client_phone && (
                          <a href={`tel:${ev.order.client_phone}`} className="cal-event-phone">{ev.order.client_phone}</a>
                        )}
                        {ev.order.address && (
                          <div className="cal-event-address">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                            {ev.order.address}
                          </div>
                        )}
                        <div className="cal-event-footer">
                          <span className="cal-event-status" style={{ color: sc.text, background: sc.bg, border: `1px solid ${sc.border}` }}>
                            {STATUS_LABELS[ev.order.status]}
                          </span>
                          {ev.order.final_sum && (
                            <span className="cal-event-sum">{formatMoney(Number(ev.order.final_sum))}</span>
                          )}
                        </div>
                        {ev.order.order_comment && (
                          <div className="cal-event-comment">{ev.order.order_comment}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="cal-no-events">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <span>Выберите дату, чтобы увидеть события</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
