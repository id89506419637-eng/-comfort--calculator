import { PRODUCT_LABELS, PROFILE_LABELS, STATUS_LABELS, PAYMENT_STATUS } from './constants.js';

const WINDOW_TYPE_LABELS = {
  'deaf': 'глухое',
  'open': 'открывающееся',
};

const CHAMBERS_LABELS = {
  '3': '3-камерный',
  '5': '5-камерный',
};

export function openOrderKP(order) {
  if (!order) return;

  const items = order.items || [];
  const clientName = order.client_name || 'Без имени';
  const clientPhone = order.client_phone || '';
  const date = order.created_at ? new Date(order.created_at).toLocaleDateString('ru-RU') : '';

  const itemRows = items.map((item, i) => {
    const product = PRODUCT_LABELS[item.productType] || item.productType || '—';
    const profile = PROFILE_LABELS[item.profileType] || item.profileType || '—';
    const w = item.width || '—';
    const h = item.height || '—';
    const count = item.count || 1;
    const windowType = item.windowType ? (WINDOW_TYPE_LABELS[item.windowType] || item.windowType) : '';
    const chambers = (item.profileType === 'pvc' && item.chambers) ? CHAMBERS_LABELS[item.chambers] || item.chambers + '-кам.' : '';

    const extras = [];
    if (item.needsRAL) extras.push('RAL');
    if (item.needsTinting) extras.push('Тонировка');

    const profileDetail = [profile, chambers].filter(Boolean).join(' ');

    return `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td><strong>${product}</strong>${windowType ? '<br><span style="color:#888">' + windowType + '</span>' : ''}</td>
        <td>${profileDetail}</td>
        <td style="text-align:center">${w} × ${h} мм</td>
        <td style="text-align:center">${count}</td>
        <td>${extras.length > 0 ? extras.join(', ') : '—'}</td>
      </tr>
    `;
  }).join('');

  const priceDisplay = order.final_sum
    ? `<strong>${Number(order.final_sum).toLocaleString('ru-RU')} ₽</strong>`
    : order.price_min != null && order.price_max != null
    ? `${order.price_min.toLocaleString('ru-RU')} — ${order.price_max.toLocaleString('ru-RU')} ₽`
    : '—';

  const extras = [];
  if (order.needs_installation) extras.push('Монтаж');
  if (order.needs_demolition) extras.push('Демонтаж');
  if (order.delivery_distance > 0) extras.push(`Доставка: ${order.delivery_distance} км`);
  if (order.address) extras.push(`Адрес: ${order.address}`);

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>КП — ${clientName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1f2937;
    background: #f8fafc;
    padding: 40px;
  }
  .kp-container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    overflow: hidden;
  }
  .kp-header {
    background: linear-gradient(135deg, #1e293b, #334155);
    color: white;
    padding: 32px 40px;
  }
  .kp-header h1 {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .kp-header .subtitle {
    font-size: 13px;
    color: #94a3b8;
  }
  .kp-body { padding: 32px 40px; }
  .kp-client {
    display: flex;
    justify-content: space-between;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e7eb;
  }
  .kp-client-info h3 { font-size: 15px; color: #374151; margin-bottom: 4px; }
  .kp-client-info p { font-size: 13px; color: #6b7280; }
  .kp-price-block {
    text-align: right;
  }
  .kp-price-block .label { font-size: 12px; color: #6b7280; }
  .kp-price-block .price { font-size: 22px; font-weight: 700; color: #059669; }

  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th {
    background: #f1f5f9;
    padding: 10px 12px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #e2e8f0;
  }
  td {
    padding: 10px 12px;
    font-size: 13px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
  }
  tr:hover td { background: #fafbfc; }

  .kp-extras {
    margin-top: 16px;
    padding: 16px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }
  .kp-extras h4 { font-size: 13px; color: #374151; margin-bottom: 8px; }
  .kp-extras-list { display: flex; gap: 12px; flex-wrap: wrap; }
  .kp-extras-item {
    font-size: 12px;
    padding: 4px 10px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    color: #475569;
  }
  .kp-footer {
    padding: 20px 40px;
    background: #f8fafc;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
    color: #9ca3af;
    text-align: center;
  }
  @media print {
    body { padding: 0; background: white; }
    .kp-container { box-shadow: none; border-radius: 0; }
    .kp-download { display: none !important; }
  }
  .kp-download {
    display: flex;
    justify-content: center;
    gap: 12px;
    padding: 24px 40px;
    background: #f8fafc;
  }
  .kp-download-btn {
    padding: 10px 28px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 0.15s;
  }
  .kp-download-btn:hover { opacity: 0.85; }
  .kp-download-btn.primary {
    background: linear-gradient(135deg, #059669, #10b981);
    color: white;
  }
</style>
</head>
<body>
  <div class="kp-container">
    <div class="kp-header">
      <h1>Коммерческое предложение</h1>
      <div class="subtitle">Комфорт+ | ${date}</div>
    </div>
    <div class="kp-body">
      <div class="kp-client">
        <div class="kp-client-info">
          <h3>${clientName}</h3>
          ${clientPhone ? `<p>📞 ${clientPhone}</p>` : ''}
          ${order.client_company ? `<p>🏢 ${order.client_company}</p>` : ''}
          ${order.address ? `<p>📍 ${order.address}</p>` : ''}
        </div>
        <div class="kp-price-block">
          <div class="label">Стоимость</div>
          <div class="price">${priceDisplay}</div>
          ${order.total_area ? `<div class="label" style="margin-top:4px">Площадь: ${order.total_area} м²</div>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align:center">№</th>
            <th>Изделие</th>
            <th>Профиль</th>
            <th style="text-align:center">Размер (Ш×В)</th>
            <th style="text-align:center">Кол-во</th>
            <th>Опции</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      ${extras.length > 0 ? `
      <div class="kp-extras">
        <h4>Дополнительно</h4>
        <div class="kp-extras-list">
          ${extras.map(e => `<span class="kp-extras-item">${e}</span>`).join('')}
        </div>
      </div>
      ` : ''}

      ${order.order_comment ? `
      <div class="kp-extras" style="margin-top:12px">
        <h4>Комментарий</h4>
        <p style="font-size:13px;color:#4b5563">${order.order_comment}</p>
      </div>
      ` : ''}
    </div>
    <div class="kp-download">
      <button class="kp-download-btn primary" onclick="window.print()">📥 Скачать PDF</button>
    </div>
    <div class="kp-footer">
      Комфорт+ | komforttnt.ru | Данное предложение не является публичной офертой
    </div>
  </div>
</body>
</html>`;

  const newTab = window.open('', '_blank');
  if (newTab) {
    newTab.document.write(html);
    newTab.document.close();
  }
}
