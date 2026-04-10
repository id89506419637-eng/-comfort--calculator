import { STATUS_LABELS, PAYMENT_STATUS, DELIVERY_TYPES } from './constants.js';
import { itemsSummary, formatMoney } from './utils.js';

// ===== ЭКСПОРТ В CSV (Excel) =====
export function exportToExcel(orders) {
  const BOM = '\uFEFF'; // для корректного отображения кириллицы в Excel
  const headers = [
    'Дата', 'Клиент', 'Телефон', 'Организация', 'Статус', 'Оплата',
    'Сумма', 'Оплачено', 'Менеджер', 'Замерщик', 'Контрагент',
    '№ договора', '№ счёта', 'Адрес', 'Площадь м²', 'Готовность цеха %',
    'Тип отгрузки', 'Дата замера', 'Дата монтажа', 'Состав заказа', 'Комментарий'
  ];

  const rows = orders.map(o => [
    o.created_at ? new Date(o.created_at).toLocaleDateString('ru-RU') : '',
    o.client_name || '',
    o.client_phone || '',
    o.client_company || '',
    STATUS_LABELS[o.status] || o.status || '',
    (PAYMENT_STATUS[o.payment_status] || PAYMENT_STATUS['not_paid']).label,
    o.final_sum || o.price_max || '',
    o.paid_amount || '',
    o.manager || '',
    o.measurer || '',
    o.contractor || '',
    o.contract_number || '',
    o.invoice_number || '',
    o.address || '',
    o.total_area || '',
    o.production_percent || 0,
    (DELIVERY_TYPES[o.delivery_type] || DELIVERY_TYPES['install']).label,
    o.measurement_date || '',
    o.install_date || '',
    itemsSummary(o.items),
    o.order_comment || '',
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Комфорт+_заказы_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ===== ЭКСПОРТ В PDF (через печать) =====
export function exportToPDF(orders) {
  const statusLabel = (s) => STATUS_LABELS[s] || s || '';
  const payLabel = (s) => (PAYMENT_STATUS[s] || PAYMENT_STATUS['not_paid']).label;
  const delivLabel = (s) => (DELIVERY_TYPES[s] || DELIVERY_TYPES['install']).label;

  const totalSum = orders
    .filter(o => o.status !== 'new' && o.status !== 'rejected')
    .reduce((s, o) => s + (o.final_sum ? Number(o.final_sum) : (o.price_max || 0)), 0);

  const paidSum = orders.reduce((s, o) => s + (o.paid_amount ? Number(o.paid_amount) : 0), 0);

  const tableRows = orders.map((o, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${o.created_at ? new Date(o.created_at).toLocaleDateString('ru-RU') : ''}</td>
      <td><strong>${o.client_name || 'Без имени'}</strong>${o.client_phone ? '<br>' + o.client_phone : ''}</td>
      <td>${statusLabel(o.status)}</td>
      <td>${payLabel(o.payment_status)}</td>
      <td style="text-align:right">${o.final_sum ? Number(o.final_sum).toLocaleString('ru-RU') : (o.price_max ? o.price_max.toLocaleString('ru-RU') : '—')}</td>
      <td>${o.manager || ''}</td>
      <td>${o.contractor || ''}</td>
      <td>${o.address || ''}</td>
      <td>${itemsSummary(o.items)}</td>
      <td>${delivLabel(o.delivery_type)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Комфорт+ — Отчёт по заказам</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #333; margin: 20px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 16px; }
  .summary { display: flex; gap: 24px; margin-bottom: 16px; font-size: 13px; }
  .summary-item { padding: 8px 16px; background: #f5f5f5; border-radius: 6px; }
  .summary-item strong { display: block; font-size: 16px; color: #111; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1f2937; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; vertical-align: top; }
  tr:nth-child(even) { background: #f9fafb; }
  @media print { body { margin: 10px; } }
</style>
</head>
<body>
  <h1>Комфорт+ — Отчёт по заказам</h1>
  <div class="subtitle">Дата: ${new Date().toLocaleDateString('ru-RU')} | Всего заказов: ${orders.length}</div>

  <div class="summary">
    <div class="summary-item">Заказов<strong>${orders.length}</strong></div>
    <div class="summary-item">Сумма<strong>${totalSum.toLocaleString('ru-RU')} ₽</strong></div>
    <div class="summary-item">Оплачено<strong>${paidSum.toLocaleString('ru-RU')} ₽</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>№</th>
        <th>Дата</th>
        <th>Клиент</th>
        <th>Статус</th>
        <th>Оплата</th>
        <th>Сумма</th>
        <th>Менеджер</th>
        <th>Контрагент</th>
        <th>Адрес</th>
        <th>Состав</th>
        <th>Отгрузка</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}
