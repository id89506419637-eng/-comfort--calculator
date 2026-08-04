import { LOGO_BASE64 } from './logo.js';
import { supabase } from './supabase.js';
import { DEFAULT_PRICES } from './hooks/usePrices.js';

export const PRODUCT_LABELS = {
  'window': 'Окно',
  'door': 'Дверь',
  'partition': 'Перегородка',
  'sliding-balcony': 'Раздвижная лоджия',
};

export const PROFILE_LABELS = {
  'cold-alu': 'Холодный алюминий',
  'warm-alu': 'Тёплый алюминий',
  'pvc': 'ПВХ конструкции',
};

export function calcItem(item, prices) {
  let rawArea = ((item.width || 0) * (item.height || 0)) / 1000000;
  let area = rawArea;

  if (item.profileType === 'cold-alu' || item.profileType === 'warm-alu') {
    if (item.productType === 'door' && rawArea < 2) area = 2;
    else if (item.productType === 'window' && rawArea < 1) area = 1;
  }

  let itemTotalArea = area * (item.count || 0);

  let basePricePerSqM = 0;
  if (item.profileType === 'cold-alu') {
    basePricePerSqM = item.productType === 'partition' ? prices.cold_alu_partition : prices.cold_alu_default;
  } else if (item.profileType === 'warm-alu') {
    basePricePerSqM = prices.warm_alu;
  } else if (item.profileType === 'pvc') {
    if (item.chambers === '3') {
      basePricePerSqM = item.windowType === 'deaf' ? prices.pvc_3_deaf : prices.pvc_3_open;
    } else {
      basePricePerSqM = item.windowType === 'deaf' ? prices.pvc_5_deaf : prices.pvc_5_open;
    }
  }

  let itemBaseCost = itemTotalArea * basePricePerSqM;

  if (item.needsRAL && (item.profileType === 'cold-alu' || item.profileType === 'warm-alu')) {
    itemBaseCost *= prices.ral_multiplier;
  }
  if (item.needsTinting) {
    itemBaseCost += itemTotalArea * prices.tinting_per_sqm;
  }

  // Доп. опции по изделию — считаются поштучно (кол-во задаёт менеджер)
  if (item.otliv) itemBaseCost += (Number(item.otlivQty) || 0) * (prices.otliv_per_piece || 0);
  if (item.podokonnik) itemBaseCost += (Number(item.podokonnikQty) || 0) * (prices.podokonnik_per_piece || 0);
  if (item.mosquitoNet) itemBaseCost += (Number(item.mosquitoNetQty) || 0) * (prices.mosquito_net_per_piece || 0);
  if (item.dovodchik) itemBaseCost += (Number(item.dovodchikQty) || 0) * (prices.dovodchik_per_piece || 0);

  return { area: itemTotalArea, cost: itemBaseCost };
}

export function drawSchema(item) {
  const maxW = item.productType === 'sliding-balcony' ? 130 : 160;
  const maxH = 120;
  const ratio = item.productType === 'sliding-balcony'
    ? Math.max(item.width / item.height, 2.2)
    : item.width / item.height;
  let dW, dH;
  if (ratio > maxW / maxH) { dW = maxW; dH = maxW / ratio; }
  else { dH = maxH; dW = maxH * ratio; }

  const ox = 5;
  const oy = 5;
  const fill = item.profileType === 'pvc' ? '#d4f0f7' : '#f5f5a0';
  const fr = 3;

  let inner = '';
  const ix = ox + fr;
  const iy = oy + fr;
  const iW = dW - fr * 2;
  const iH = dH - fr * 2;

  if (item.productType === 'window' && item.windowType === 'opening') {
    const fillW = '#f5a623';
    const mid = ox + dW / 2;
    const rL = mid + 2;
    const rR = ox + dW - fr;
    const rT = iy;
    const rB = iy + iH;
    const rCy = iy + iH / 2;
    const rCx = rL + (rR - rL) / 2;
    inner = `
      <rect x="${ix}" y="${iy}" width="${mid - ix - 1}" height="${iH}" fill="${fillW}" stroke="#999" stroke-width="0.5"/>
      <rect x="${rL}" y="${rT}" width="${rR - rL}" height="${iH}" fill="${fillW}" stroke="#999" stroke-width="0.5"/>
      <line x1="${mid}" y1="${oy}" x2="${mid}" y2="${oy + dH}" stroke="#555" stroke-width="2"/>
      <line x1="${rL}" y1="${rCy}" x2="${rR}" y2="${rT}" stroke="#333" stroke-width="0.5"/>
      <line x1="${rL}" y1="${rCy}" x2="${rR}" y2="${rB}" stroke="#333" stroke-width="0.5"/>
      <line x1="${rCx}" y1="${rT}" x2="${rL}" y2="${rB}" stroke="#333" stroke-width="0.5"/>
      <line x1="${rCx}" y1="${rT}" x2="${rR}" y2="${rB}" stroke="#333" stroke-width="0.5"/>
      <rect x="${mid + 3}" y="${rCy - 5}" width="3" height="10" rx="1" fill="#555"/>`;

  } else if (item.productType === 'door') {
    const fillD = '#d4b830';
    const topH = iH * 0.62;
    const botY = iy + topH + 2;
    const botH = iH - topH - 2;
    const doorCy = iy + iH / 2;
    inner = `
      <rect x="${ix}" y="${iy}" width="${iW}" height="${topH}" fill="${fillD}" stroke="#999" stroke-width="0.5"/>
      <rect x="${ix}" y="${botY}" width="${iW}" height="${botH}" fill="${fillD}" stroke="#999" stroke-width="0.5"/>
      <line x1="${ix}" y1="${doorCy}" x2="${ix + iW}" y2="${iy}" stroke="#333" stroke-width="0.5"/>
      <line x1="${ix}" y1="${doorCy}" x2="${ix + iW}" y2="${iy + iH}" stroke="#333" stroke-width="0.5"/>
      <rect x="${ix + 3}" y="${doorCy - 1}" width="5" height="2" rx="0.5" fill="#555"/>
      <rect x="${ox + dW - fr - 2}" y="${iy + 6}" width="2" height="5" rx="0.5" fill="#888"/>
      <rect x="${ox + dW - fr - 2}" y="${iy + topH - 6}" width="2" height="5" rx="0.5" fill="#888"/>
      <rect x="${ox + dW - fr - 2}" y="${botY + botH - 8}" width="2" height="5" rx="0.5" fill="#888"/>`;

  } else if (item.productType === 'partition') {
    const fillP = '#00d4c8';
    const mid = ox + dW / 2;
    const splitY = oy + dH * 0.65;
    inner = `
      <rect x="${ix}" y="${iy}" width="${mid - ix - 1}" height="${splitY - iy - 1}" fill="${fillP}" stroke="#999" stroke-width="0.5"/>
      <rect x="${mid + 1}" y="${iy}" width="${ox + dW - fr - mid - 1}" height="${splitY - iy - 1}" fill="${fillP}" stroke="#999" stroke-width="0.5"/>
      <rect x="${ix}" y="${splitY + 1}" width="${mid - ix - 1}" height="${oy + dH - fr - splitY - 1}" fill="${fillP}" stroke="#999" stroke-width="0.5"/>
      <rect x="${mid + 1}" y="${splitY + 1}" width="${ox + dW - fr - mid - 1}" height="${oy + dH - fr - splitY - 1}" fill="${fillP}" stroke="#999" stroke-width="0.5"/>
      <line x1="${mid}" y1="${oy}" x2="${mid}" y2="${oy + dH}" stroke="#555" stroke-width="2"/>
      <line x1="${ox}" y1="${splitY}" x2="${ox + dW}" y2="${splitY}" stroke="#555" stroke-width="2"/>`;

  } else if (item.productType === 'sliding-balcony') {
    const fillS = '#c0f5f5';
    const sec = 4;
    const secW = iW / sec;
    let panels = '';
    for (let i = 0; i < sec; i++) {
      const sx = ix + i * secW;
      panels += `<rect x="${sx + 1}" y="${iy}" width="${secW - 2}" height="${iH}" fill="${fillS}" stroke="#999" stroke-width="0.5"/>`;
    }
    const cy = oy + dH / 2;
    const a = 4;
    const al = 10;
    let arrows = '';
    for (let i = 0; i < sec; i++) {
      const cx = ix + i * secW + secW / 2;
      const dir = (i % 2 === 0) ? 1 : -1;
      const tip = cx + dir * al;
      const tail = cx - dir * al;
      arrows += `<line x1="${tail}" y1="${cy}" x2="${tip}" y2="${cy}" stroke="#555" stroke-width="0.8"/>`;
      arrows += `<polygon points="${tip},${cy} ${tip - dir * a},${cy - a} ${tip - dir * a},${cy + a}" fill="#555"/>`;
    }
    inner = `${panels}${arrows}`;

  } else {
    inner = `<rect x="${ix}" y="${iy}" width="${iW}" height="${iH}" fill="${fill}" stroke="#999" stroke-width="0.5"/>`;
  }

  const bY = oy + dH + 14;
  const rX = ox + dW + 14;
  const svgW = rX + 35;
  const svgH = bY + 18;

  const svg = `
    <svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${ox}" y="${oy}" width="${dW}" height="${dH}" fill="none" stroke="#333" stroke-width="2"/>
      ${inner}
      <line x1="${ox}" y1="${bY}" x2="${ox + dW}" y2="${bY}" stroke="#333" stroke-width="0.7"/>
      <line x1="${ox}" y1="${bY - 4}" x2="${ox}" y2="${bY + 4}" stroke="#333" stroke-width="0.7"/>
      <line x1="${ox + dW}" y1="${bY - 4}" x2="${ox + dW}" y2="${bY + 4}" stroke="#333" stroke-width="0.7"/>
      <text x="${ox + dW / 2}" y="${bY + 14}" text-anchor="middle" font-size="9" font-family="sans-serif">${item.width}</text>
      <line x1="${rX}" y1="${oy}" x2="${rX}" y2="${oy + dH}" stroke="#333" stroke-width="0.7"/>
      <line x1="${rX - 4}" y1="${oy}" x2="${rX + 4}" y2="${oy}" stroke="#333" stroke-width="0.7"/>
      <line x1="${rX - 4}" y1="${oy + dH}" x2="${rX + 4}" y2="${oy + dH}" stroke="#333" stroke-width="0.7"/>
      <text x="${rX + 8}" y="${oy + dH / 2 + 3}" font-size="9" font-family="sans-serif">${item.height}</text>
    </svg>`;

  return { svg, width: 200, height: svgH };
}

/**
 * Генерирует PDF коммерческого предложения и скачивает его.
 * Используется и в калькуляторе клиента, и в дашборде менеджера —
 * единый источник правды, чтобы клиент и производитель видели один и тот же документ.
 *
 * @param {Object} data
 * @param {Array}  data.items                — изделия (productType, profileType, width, height, count, ...)
 * @param {string} data.clientName
 * @param {string} data.clientPhone
 * @param {string} data.clientCompany
 * @param {boolean} data.needsInstallation
 * @param {boolean} data.needsDemolition
 * @param {number} data.deliveryDistance
 * @param {string} [data.address]            — только в дашборде
 * @param {string} [data.orderComment]       — только в дашборде
 * @param {Date|string} [data.createdAt]     — дата заявки (по умолчанию сегодня)
 * @param {number} [data.finalSum]           — согласованная сумма (если есть, показывается вместо диапазона)
 * @param {number} [data.priceMin]           — минимум диапазона
 * @param {number} [data.priceMax]           — максимум диапазона
 * @param {Object} prices                    — справочник цен
 */
function buildKpDocDefinition(data, prices) {
  const blue = '#005a8c';
  const dateObj = data.createdAt ? new Date(data.createdAt) : new Date();
  const today = dateObj.toLocaleDateString('ru-RU');
  const items = data.items || [];

  const content = [];

  // ===== ШАПКА =====
  content.push({
    columns: [
      { image: LOGO_BASE64, width: 130, margin: [0, 0, 0, 0] },
      {
        stack: [
          { text: 'Общество с Ограниченной Ответственностью «Комфорт+»', fontSize: 8, alignment: 'right', bold: true },
          { text: 'ИНН/КПП 6623106327/662301001', fontSize: 7, alignment: 'right', margin: [0, 2, 0, 0] },
          { text: '622001, Россия, Свердловская область,', fontSize: 7, alignment: 'right', margin: [0, 1, 0, 0] },
          { text: 'г. Н.Тагил, Черноисточинское шоссе, 16А', fontSize: 7, alignment: 'right', margin: [0, 1, 0, 0] },
          { text: 'www.komfortnt.ru', link: 'http://komfortnt.ru', fontSize: 7, alignment: 'right', color: blue, decoration: 'underline', margin: [0, 2, 0, 0] },
          { text: 'remont-nt@mail.ru', link: 'mailto:remont-nt@mail.ru', fontSize: 7, alignment: 'right', color: blue, decoration: 'underline', margin: [0, 1, 0, 0] },
          { text: 'Телефон: 8 (3435) 37-81-58', link: 'tel:+73435378158', fontSize: 7, alignment: 'right', color: blue, decoration: 'underline', margin: [0, 1, 0, 0] },
        ],
        width: '*',
        margin: [0, 10, 0, 0],
      }
    ],
    margin: [0, 0, 0, 6],
  });

  content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: blue }], margin: [0, 0, 0, 10] });
  content.push({ text: `Предварительный расчёт от ${today}`, fontSize: 14, bold: true, alignment: 'center', margin: [0, 0, 0, 10] });

  // ===== КЛИЕНТ =====
  if (data.clientName || data.clientCompany) {
    const clientRows = [];
    if (data.clientName) clientRows.push({ text: [{ text: 'Заказчик: ', bold: true, color: blue }, { text: data.clientName, color: '#000000' }], fontSize: 10 });
    if (data.clientPhone) clientRows.push({ text: [{ text: 'Телефон: ', bold: true, color: blue }, { text: data.clientPhone, color: '#000000' }], fontSize: 10, margin: [0, 2, 0, 0] });
    if (data.clientCompany) clientRows.push({ text: [{ text: 'Организация: ', bold: true, color: blue }, { text: data.clientCompany, color: '#000000' }], fontSize: 10, margin: [0, 2, 0, 0] });
    if (data.address) clientRows.push({ text: [{ text: 'Адрес: ', bold: true, color: blue }, { text: data.address, color: '#000000' }], fontSize: 10, margin: [0, 2, 0, 0] });
    content.push({ stack: clientRows, margin: [0, 0, 0, 12] });
  }

  // ===== ИЗДЕЛИЯ С ЧЕРТЕЖАМИ =====
  items.forEach((item, idx) => {
    const areaPerOne = ((item.width || 0) * (item.height || 0)) / 1000000;

    const desc = [];
    desc.push(`Профиль: ${PROFILE_LABELS[item.profileType] || item.profileType || '—'}`);
    if (item.profileType === 'pvc') {
      desc.push(`${item.chambers === '3' ? '3-х камерный' : '5-и камерный'}, ${item.windowType === 'deaf' ? 'глухое' : 'с открываемой створкой'}`);
    }
    if (item.needsRAL) desc.push('Покраска RAL');
    if (item.needsTinting) desc.push('Тонировка стёкол');
    if (item.otliv) desc.push(`Отлив: ${Number(item.otlivQty) || 0} шт.`);
    if (item.podokonnik) desc.push(`Подоконник: ${Number(item.podokonnikQty) || 0} шт.`);
    if (item.mosquitoNet) desc.push(`Москитная сетка: ${Number(item.mosquitoNetQty) || 0} шт.`);
    if (item.dovodchik) desc.push(`Доводчик: ${Number(item.dovodchikQty) || 0} шт.`);

    content.push({
      unbreakable: true,
      margin: [0, idx > 0 ? 14 : 0, 0, 4],
      stack: [
        {
          table: {
            widths: ['*'],
            body: [[{
              text: `Изделие № ${idx + 1}  —  ${PRODUCT_LABELS[item.productType] || item.productType || '—'}`,
              bold: true, fontSize: 11, color: blue,
            }]]
          },
          layout: {
            hLineWidth: (i) => i === 1 ? 1 : 0,
            vLineWidth: () => 0,
            hLineColor: () => '#cccccc',
            paddingLeft: () => 0, paddingRight: () => 0,
            paddingTop: () => 2, paddingBottom: () => 4,
          },
          margin: [0, 0, 0, 6],
        },
        {
          columns: [
            drawSchema(item),
            {
              width: '*',
              stack: [
                { text: [{ text: 'Ширина x Высота: ', bold: true, fontSize: 9 }, { text: `${item.width} x ${item.height} мм`, fontSize: 9 }], margin: [0, 0, 0, 3] },
                { text: [{ text: 'Площадь 1 изд.: ', bold: true, fontSize: 9 }, { text: `${areaPerOne.toFixed(2)} м²`, fontSize: 9 }], margin: [0, 0, 0, 3] },
                { text: [{ text: 'Количество: ', bold: true, fontSize: 9 }, { text: `${item.count} шт.`, fontSize: 9 }], margin: [0, 0, 0, 3] },
                ...desc.map(d => ({ text: d, fontSize: 9, color: '#444', margin: [0, 0, 0, 2] })),
              ],
            }
          ],
          columnGap: 10,
        },
      ],
    });
  });

  // ===== СВОДНАЯ ТАБЛИЦА =====
  content.push({ text: 'Сводная расчётная таблица', fontSize: 13, bold: true, alignment: 'center', margin: [0, 20, 0, 8] });

  const summaryHeader = [
    { text: '№', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' },
    { text: 'Название', bold: true, fontSize: 8, fillColor: '#f0f0f0' },
    { text: 'Профиль', bold: true, fontSize: 8, fillColor: '#f0f0f0' },
    { text: 'Ширина, мм', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' },
    { text: 'Высота, мм', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' },
    { text: 'Кол-во', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' },
    { text: 'Площадь, м²', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' },
    { text: 'Цена, руб.', bold: true, fontSize: 8, alignment: 'right', fillColor: '#f0f0f0' },
  ];

  const summaryRows = [summaryHeader];
  let totalAreaSum = 0;

  items.forEach((item, idx) => {
    const { area, cost } = calcItem(item, prices);
    totalAreaSum += area;
    summaryRows.push([
      { text: String(idx + 1), fontSize: 8, alignment: 'center' },
      { text: PRODUCT_LABELS[item.productType] || item.productType || '—', fontSize: 8 },
      { text: PROFILE_LABELS[item.profileType] || item.profileType || '—', fontSize: 8 },
      { text: String(item.width || ''), fontSize: 8, alignment: 'center' },
      { text: String(item.height || ''), fontSize: 8, alignment: 'center' },
      { text: String(item.count || ''), fontSize: 8, alignment: 'center' },
      { text: area.toFixed(2), fontSize: 8, alignment: 'center' },
      { text: (Math.ceil(cost / 1000) * 1000).toLocaleString('ru-RU'), fontSize: 8, alignment: 'right' },
    ]);
  });

  content.push({
    margin: [0, 0, 0, 6],
    table: {
      headerRows: 1,
      widths: [20, '*', 'auto', 50, 50, 30, 45, 60],
      body: summaryRows,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#bbbbbb',
      vLineColor: () => '#bbbbbb',
      paddingTop: () => 3,
      paddingBottom: () => 3,
      paddingLeft: () => 4,
      paddingRight: () => 4,
    }
  });

  // ===== РАБОТЫ =====
  const workRows = [];
  if (data.needsInstallation) workRows.push(['Монтаж', `${totalAreaSum.toFixed(2)} м²`, String(prices.install_per_sqm), (totalAreaSum * prices.install_per_sqm).toLocaleString('ru-RU')]);
  if (data.needsDemolition) workRows.push(['Демонтаж', `${totalAreaSum.toFixed(2)} м²`, String(prices.demolition_per_sqm), (totalAreaSum * prices.demolition_per_sqm).toLocaleString('ru-RU')]);
  if (data.deliveryDistance > 0) workRows.push(['Доставка', `${data.deliveryDistance} км`, String(prices.delivery_per_km), (data.deliveryDistance * prices.delivery_per_km).toLocaleString('ru-RU')]);

  if (workRows.length > 0) {
    content.push({ text: 'РАБОТЫ', bold: true, fontSize: 9, margin: [0, 8, 0, 4] });
    const workTable = [
      [
        { text: 'Название', bold: true, fontSize: 8, fillColor: '#f0f0f0' },
        { text: 'Объём', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' },
        { text: 'Цена, руб.', bold: true, fontSize: 8, alignment: 'center', fillColor: '#f0f0f0' },
        { text: 'Сумма, руб.', bold: true, fontSize: 8, alignment: 'right', fillColor: '#f0f0f0' },
      ],
      ...workRows.map(r => [
        { text: r[0], fontSize: 8 },
        { text: r[1], fontSize: 8, alignment: 'center' },
        { text: r[2], fontSize: 8, alignment: 'center' },
        { text: r[3], fontSize: 8, alignment: 'right' },
      ])
    ];

    content.push({
      margin: [0, 0, 0, 8],
      table: {
        headerRows: 1,
        widths: ['*', 70, 60, 80],
        body: workTable,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#bbbbbb',
        vLineColor: () => '#bbbbbb',
        paddingTop: () => 3,
        paddingBottom: () => 3,
        paddingLeft: () => 4,
        paddingRight: () => 4,
      }
    });
  }

  // ===== ИТОГО =====
  let totalText;
  if (data.finalSum) {
    totalText = `${Number(data.finalSum).toLocaleString('ru-RU')} руб.`;
  } else if (data.priceMin != null && data.priceMax != null) {
    const fmtMin = Number(data.priceMin).toLocaleString('ru-RU');
    const fmtMax = Number(data.priceMax).toLocaleString('ru-RU');
    totalText = `${fmtMin} — ${fmtMax} руб.`;
  } else {
    totalText = '—';
  }

  content.push({
    margin: [0, 8, 0, 0],
    table: {
      widths: ['*', 'auto'],
      body: [[
        { text: data.finalSum ? 'ИТОГО ПО ЗАКАЗУ:' : 'ИТОГО ПО ЗАКАЗУ (предварительно):', bold: true, fontSize: 11 },
        { text: totalText, bold: true, fontSize: 11, alignment: 'right' },
      ]]
    },
    layout: {
      hLineWidth: (i) => i === 0 ? 1.5 : 1,
      vLineWidth: () => 0,
      hLineColor: () => '#333',
      paddingTop: () => 6,
      paddingBottom: () => 6,
      paddingLeft: () => 0,
      paddingRight: () => 0,
    }
  });

  content.push({ text: `Площадь изделий в заказе: ${totalAreaSum.toFixed(2)} кв.м.`, fontSize: 9, margin: [0, 6, 0, 10] });

  // ===== КОММЕНТАРИЙ (если есть) =====
  if (data.orderComment) {
    content.push({
      margin: [0, 4, 0, 8],
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: 'Комментарий к заказу:', bold: true, fontSize: 9, color: blue, margin: [0, 0, 0, 4] },
            { text: data.orderComment, fontSize: 9, color: '#444' },
          ],
          margin: [6, 6, 6, 6],
        }]]
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
      }
    });
  }

  // Примечание
  content.push({
    margin: [0, 4, 0, 10],
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: 'Стоимость является ориентировочной. Итоговая стоимость определяется после уточнения технических деталей и осмотра объекта.', fontSize: 8 },
          { text: 'Стоимость подоконников, отливов, доводчиков и доп. фурнитуры рассчитывается при заявке на точный расчёт.', fontSize: 8, margin: [0, 2, 0, 0] },
        ],
        color: '#555',
        margin: [4, 4, 4, 4],
      }]]
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#cccccc',
      vLineColor: () => '#cccccc',
    }
  });

  content.push({ text: 'Согласовано (габариты, комплектация) ____________', fontSize: 9, margin: [0, 16, 0, 0] });
  content.push({ text: 'Не является публичной офертой.', fontSize: 9, italics: true, margin: [0, 12, 0, 0] });

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 30],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    content,
  };
}

/**
 * Собирает PDF и открывает его в новой вкладке (или скачивает, если popup заблокирован).
 * Используется при клике на «Скачать КП» в калькуляторе и в дашборде.
 */
export function buildKpPdf(data, prices) {
  const docDefinition = buildKpDocDefinition(data, prices);

  // Открываем пустую вкладку СИНХРОННО (в момент клика пользователя),
  // иначе браузер заблокирует popup. Затем подставляем blob-URL,
  // когда PDF будет готов. В браузерном PDF-вьювере есть кнопки
  // «Скачать» и «Печать» (сверху справа).
  const win = window.open('', '_blank');
  window.pdfMake.createPdf(docDefinition).getBlob((blob) => {
    const url = URL.createObjectURL(blob);
    if (win) {
      win.location.href = url;
    } else {
      // Фолбэк: если popup всё равно заблокирован — скачиваем файл
      const a = document.createElement('a');
      a.href = url;
      a.download = `КП_${data.clientName || 'клиент'}_${new Date().toLocaleDateString('ru-RU')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  });
}

/**
 * Собирает PDF КП и возвращает его как Blob — для загрузки в Storage
 * (чтобы потом приложить к email). Не открывает и не скачивает.
 */
export function buildKpPdfBlob(data, prices) {
  return new Promise((resolve, reject) => {
    try {
      const docDefinition = buildKpDocDefinition(data, prices);
      window.pdfMake.createPdf(docDefinition).getBlob((blob) => resolve(blob));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Загружает прайс из Supabase и формирует КП по сохранённой заявке.
 * Используется из дашборда — не нужен React-стейт с ценами.
 */
export async function buildKpPdfFromOrder(order) {
  if (!order) return;

  let prices = { ...DEFAULT_PRICES };
  try {
    const { data } = await supabase.from('prices').select('key, value');
    if (data && data.length > 0) {
      data.forEach((row) => {
        prices[row.key] = Number(row.value);
      });
    }
  } catch {
    // используем DEFAULT_PRICES
  }

  return buildKpPdf({
    items: order.items || [],
    clientName: order.client_name || '',
    clientPhone: order.client_phone || '',
    clientCompany: order.client_company || '',
    needsInstallation: !!order.needs_installation,
    needsDemolition: !!order.needs_demolition,
    deliveryDistance: Number(order.delivery_distance) || 0,
    address: order.address || '',
    orderComment: order.order_comment || '',
    createdAt: order.created_at,
    finalSum: order.final_sum ? Number(order.final_sum) : null,
    priceMin: order.price_min,
    priceMax: order.price_max,
  }, prices);
}
