import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { STATUS_LABELS, STATUS_COLORS } from '../constants.js';
import { formatMoney } from '../utils.js';

const YMAPS_SRC = `https://api-maps.yandex.ru/2.1/?apikey=${import.meta.env.VITE_YANDEX_MAPS_KEY}&lang=ru_RU`;

// Базовая точка — офис компании
const BASE_ADDRESS = 'Нижний Тагил, Черноисточинское шоссе 16а';
const BASE_COORDS = [57.8833, 59.9500]; // примерные координаты офиса

function loadYMaps() {
  return new Promise((resolve) => {
    if (window.ymaps) { window.ymaps.ready(() => resolve(window.ymaps)); return; }
    if (document.querySelector(`script[src*="api-maps.yandex.ru"]`)) {
      const check = setInterval(() => {
        if (window.ymaps) { clearInterval(check); window.ymaps.ready(() => resolve(window.ymaps)); }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.src = YMAPS_SRC;
    script.onload = () => window.ymaps.ready(() => resolve(window.ymaps));
    document.head.appendChild(script);
  });
}

export default function MapPanel({ orders, onBack }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const routeRef = useRef(null);
  const ymapsRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [routeBuilding, setRouteBuilding] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeDate, setRouteDate] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'measurement' | 'install'

  const ordersWithAddress = orders.filter(o => o.address && o.address.trim());

  // Фильтрация по дате и типу
  const filteredOrders = ordersWithAddress.filter(o => {
    if (!routeDate) return true;
    const matchMeasurement = o.measurement_date === routeDate;
    const matchInstall = o.install_date === routeDate;
    if (filterType === 'measurement') return matchMeasurement;
    if (filterType === 'install') return matchInstall;
    return matchMeasurement || matchInstall;
  });

  // Авто-выбор при смене даты
  const applyDateFilter = (date) => {
    setRouteDate(date);
    clearRoute();
    if (!date) { setCheckedIds(new Set()); return; }
    const matching = ordersWithAddress.filter(o => {
      const m = o.measurement_date === date;
      const i = o.install_date === date;
      if (filterType === 'measurement') return m;
      if (filterType === 'install') return i;
      return m || i;
    });
    setCheckedIds(new Set(matching.map(o => o.id)));
  };

  const toggleCheck = (id) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (checkedIds.size === filteredOrders.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const clearRoute = () => {
    if (routeRef.current && mapInstance.current) {
      mapInstance.current.geoObjects.remove(routeRef.current);
      routeRef.current = null;
    }
    setRouteInfo(null);
  };

  const buildRoute = async () => {
    if (checkedIds.size < 1) {
      toast.error('Выберите хотя бы 1 адрес для маршрута');
      return;
    }

    const ymaps = ymapsRef.current;
    const map = mapInstance.current;
    if (!ymaps || !map) return;

    clearRoute();
    setRouteBuilding(true);

    const selected = ordersWithAddress.filter(o => checkedIds.has(o.id));

    // Геокодируем все адреса для оптимизации порядка
    const geocoded = [];
    for (const order of selected) {
      try {
        const res = await ymaps.geocode(order.address, { results: 1 });
        const geo = res.geoObjects.get(0);
        if (geo) {
          const [lat, lon] = geo.geometry.getCoordinates();
          geocoded.push({ order, lat, lon });
        }
      } catch { /* skip */ }
    }

    if (geocoded.length < 1) { setRouteBuilding(false); return; }

    // Получаем время для каждой точки
    const getTime = (order) => {
      if (routeDate && order.measurement_date === routeDate && order.measurement_time) return order.measurement_time;
      if (routeDate && order.install_date === routeDate && order.install_time) return order.install_time;
      return order.measurement_time || order.install_time || '';
    };

    const hasAnyTime = geocoded.some(g => getTime(g.order));
    let optimized;

    if (hasAnyTime) {
      // Есть время — сортируем по расписанию
      optimized = [...geocoded].sort((a, b) => {
        const ta = getTime(a.order) || '99:99';
        const tb = getTime(b.order) || '99:99';
        return ta.localeCompare(tb);
      });
    } else {
      // Нет времени — nearest-neighbor по расстоянию
      optimized = [geocoded[0]];
      const remaining = geocoded.slice(1);
      while (remaining.length > 0) {
        const last = optimized[optimized.length - 1];
        let nearestIdx = 0;
        let nearestDist = Infinity;
        for (let i = 0; i < remaining.length; i++) {
          const dist = Math.hypot(remaining[i].lat - last.lat, remaining[i].lon - last.lon);
          if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
        }
        optimized.push(remaining.splice(nearestIdx, 1)[0]);
      }
    }

    const addresses = [BASE_ADDRESS, ...optimized.map(g => g.order.address), BASE_ADDRESS];

    try {
      const multiRoute = new ymaps.multiRouter.MultiRoute({
        referencePoints: addresses,
        params: { routingMode: 'auto' },
      }, {
        boundsAutoApply: true,
        routeActiveStrokeWidth: 4,
        routeActiveStrokeColor: '#3b82f6',
        pinIconFillColor: '#3b82f6',
        wayPointStartIconColor: '#22c55e',
        wayPointFinishIconColor: '#ef4444',
      });

      multiRoute.events.add('update', () => {
        try {
          const activeRoute = multiRoute.getActiveRoute();
          if (activeRoute) {
            const dist = activeRoute.properties.get('distance').text;
            const dur = activeRoute.properties.get('duration').text;
            setRouteInfo({ distance: dist, duration: dur, points: selected.length });
          }
        } catch { /* ignore */ }
      });

      map.geoObjects.add(multiRoute);
      routeRef.current = multiRoute;
    } catch (err) {
      console.error('Route error:', err);
    }

    setRouteBuilding(false);
  };

  const initMap = useCallback(async () => {
    const ymaps = await loadYMaps();
    ymapsRef.current = ymaps;
    setLoading(false);

    if (mapInstance.current) {
      mapInstance.current.destroy();
    }

    const map = new ymaps.Map(mapRef.current, {
      center: BASE_COORDS,
      zoom: 12,
      controls: ['zoomControl', 'fullscreenControl'],
    });

    mapInstance.current = map;

    // Метка офиса
    const officePlacemark = new ymaps.Placemark(BASE_COORDS, {
      balloonContentHeader: '<strong>Комфорт+</strong>',
      balloonContentBody: `<div style="font-size:13px">📍 ${BASE_ADDRESS}<br>🏠 Офис компании</div>`,
      hintContent: 'Офис Комфорт+',
    }, {
      preset: 'islands#redHomeIcon',
    });
    map.geoObjects.add(officePlacemark);

    if (ordersWithAddress.length === 0) return;

    const geocodePromises = ordersWithAddress.map(async (order) => {
      try {
        const res = await ymaps.geocode(order.address, { results: 1 });
        const firstGeoObject = res.geoObjects.get(0);
        if (!firstGeoObject) return null;
        const coords = firstGeoObject.geometry.getCoordinates();
        return { order, coords };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(geocodePromises);
    const validResults = results.filter(Boolean);

    if (validResults.length === 0) return;

    const clusterer = new ymaps.Clusterer({
      preset: 'islands#invertedDarkBlueClusterIcons',
      groupByCoordinates: false,
      clusterDisableClickZoom: false,
    });

    const placemarks = validResults.map(({ order, coords }) => {
      const sc = STATUS_COLORS[order.status] || STATUS_COLORS['new'];
      const statusLabel = STATUS_LABELS[order.status] || order.status;

      const placemark = new ymaps.Placemark(coords, {
        balloonContentHeader: `<strong>${order.client_name || 'Без имени'}</strong>`,
        balloonContentBody: `
          <div style="font-size:13px; line-height:1.6">
            <div>📍 ${order.address}</div>
            ${order.client_phone ? `<div>📞 <a href="tel:${order.client_phone}">${order.client_phone}</a></div>` : ''}
            <div>Статус: <span style="color:${sc.text}">${statusLabel}</span></div>
            ${order.final_sum ? `<div>💰 ${formatMoney(Number(order.final_sum))}</div>` : ''}
            ${order.measurement_date ? `<div>📅 Замер: ${order.measurement_date}</div>` : ''}
            ${order.install_date ? `<div>🔧 Монтаж: ${order.install_date}</div>` : ''}
          </div>
        `,
        hintContent: `${order.client_name || 'Без имени'} — ${order.address}`,
      }, {
        preset: 'islands#dotIcon',
        iconColor: sc.text,
      });

      placemark.events.add('click', () => setSelectedOrder(order));
      return placemark;
    });

    clusterer.add(placemarks);
    map.geoObjects.add(clusterer);

    map.setBounds(clusterer.getBounds(), { checkZoomRange: true, zoomMargin: 40 });
  }, [ordersWithAddress.length]);

  useEffect(() => {
    if (mapRef.current) initMap();
    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }
    };
  }, [initMap]);

  return (
    <div className="map-panel">
      <div className="map-header">
        <button className="calendar-back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Назад
        </button>
        <h2 className="calendar-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/></svg>
          Карта объектов
        </h2>
        <div className="calendar-month-stats">
          <span className="cal-stat" style={{ color: '#3b82f6' }}>
            <span className="cal-stat-dot" style={{ background: '#3b82f6' }} />
            {ordersWithAddress.length} с адресом
          </span>
          {checkedIds.size > 0 && (
            <span className="cal-stat" style={{ color: '#22c55e' }}>
              ✓ {checkedIds.size} выбрано
            </span>
          )}
        </div>
      </div>

      <div className="map-body">
        <div className="map-container">
          {loading && (
            <div className="loading-state">
              <div className="spinner" />
              <span>Загрузка карты...</span>
            </div>
          )}
          <div ref={mapRef} className="yandex-map" />
        </div>

        <div className="map-sidebar">
          {/* Фильтр по дате */}
          <div className="route-date-filter">
            <label className="route-date-label">📅 Дата выезда</label>
            <input
              type="date"
              className="route-date-input"
              value={routeDate}
              onChange={(e) => applyDateFilter(e.target.value)}
            />
            <div className="route-type-toggle">
              <button
                className={`route-type-btn ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => { setFilterType('all'); if (routeDate) applyDateFilter(routeDate); }}
              >Все</button>
              <button
                className={`route-type-btn measurement ${filterType === 'measurement' ? 'active' : ''}`}
                onClick={() => { setFilterType('measurement'); if (routeDate) applyDateFilter(routeDate); }}
              >Замеры</button>
              <button
                className={`route-type-btn install ${filterType === 'install' ? 'active' : ''}`}
                onClick={() => { setFilterType('install'); if (routeDate) applyDateFilter(routeDate); }}
              >Монтажи</button>
            </div>
            {routeDate && (
              <button className="route-date-clear" onClick={() => { setRouteDate(''); setFilterType('all'); setCheckedIds(new Set()); clearRoute(); }}>
                ✕ Сбросить фильтр
              </button>
            )}
          </div>

          {/* Маршрут */}
          <div className="route-controls">
            <div className="route-controls-top">
              <button className="route-select-all-btn" onClick={selectAll}>
                {checkedIds.size === filteredOrders.length && filteredOrders.length > 0 ? 'Снять всё' : 'Выбрать всё'}
              </button>
              <button
                className="route-build-btn"
                onClick={routeInfo ? clearRoute : buildRoute}
                disabled={routeBuilding || (!routeInfo && checkedIds.size < 1)}
              >
                {routeBuilding ? '⏳ Строю...' : routeInfo ? '✕ Сбросить' : `🚗 Маршрут (${checkedIds.size})`}
              </button>
            </div>
            {routeInfo && (
              <div className="route-info">
                <span>📏 {routeInfo.distance}</span>
                <span>⏱ {routeInfo.duration}</span>
                <span>📍 {routeInfo.points} точек</span>
              </div>
            )}
          </div>

          <h3 className="map-sidebar-title">{routeDate ? `На ${routeDate.slice(8)}.${routeDate.slice(5,7)}` : 'Все объекты'} ({filteredOrders.length})</h3>

          {filteredOrders.length === 0 ? (
            <div className="cal-no-events">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="#4b5563" strokeWidth="1.5"/><circle cx="12" cy="10" r="3" stroke="#4b5563" strokeWidth="1.5"/></svg>
              <span>{routeDate ? 'Нет событий на эту дату' : 'Нет заказов с адресом'}</span>
            </div>
          ) : (
            <div className="map-orders-list">
              {filteredOrders.map(order => {
                const sc = STATUS_COLORS[order.status] || STATUS_COLORS['new'];
                const isSelected = selectedOrder?.id === order.id;
                const isChecked = checkedIds.has(order.id);
                const hasM = order.measurement_date === routeDate;
                const hasI = order.install_date === routeDate;
                return (
                  <div
                    key={order.id}
                    className={`map-order-card ${isSelected ? 'selected' : ''} ${isChecked ? 'checked' : ''}`}
                  >
                    <div className="map-order-top">
                      <label className="route-checkbox" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCheck(order.id)}
                        />
                        <span className="order-client">{order.client_name || 'Без имени'}</span>
                      </label>
                      <span className="cal-event-status" style={{ color: sc.text, background: sc.bg, border: `1px solid ${sc.border}` }}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <div className="map-order-address" onClick={() => setSelectedOrder(order)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                      {order.address}
                    </div>
                    <div className="map-order-meta">
                      {routeDate && hasM && <span className="map-event-tag measurement">Замер {order.measurement_time || ''}</span>}
                      {routeDate && hasI && <span className="map-event-tag install">Монтаж {order.install_time || ''}</span>}
                      {order.final_sum && <span className="map-order-sum">{formatMoney(Number(order.final_sum))}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
