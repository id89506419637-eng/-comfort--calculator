import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase.js';
import { LOGO_BASE64 } from './logo.js';
import LogoSVG from './LogoSVG.jsx';
import usePrices from './hooks/usePrices.js';
import './index.css';

// Авто-высота для iframe: сообщаем родительскому сайту при изменении размера
function useIframeResize() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const height = el.scrollHeight;
      window.parent.postMessage({ type: 'CALCULATOR_RESIZE', height }, '*');
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

const PRODUCT_LABELS = {
  'window': 'Окно',
  'door': 'Дверь',
  'partition': 'Перегородка',
  'sliding-balcony': 'Раздвижная лоджия',
};

const PROFILE_LABELS = {
  'cold-alu': 'Холодный алюминий',
  'warm-alu': 'Тёплый алюминий',
  'pvc': 'ПВХ конструкции',
};

export default function App() {
  const { prices, loading: pricesLoading } = usePrices();

  const [items, setItems] = useState([
    { id: Date.now(), productType: 'window', profileType: 'cold-alu', chambers: '3', windowType: 'deaf', width: '', height: '', count: '', needsRAL: false, needsTinting: false }
  ]);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [needsInstallation, setNeedsInstallation] = useState(true);
  const [needsDemolition, setNeedsDemolition] = useState(false);
  const [deliveryDistance, setDeliveryDistance] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const addItem = () => {
    setItems([...items, { id: Date.now(), productType: 'window', profileType: 'cold-alu', chambers: '3', windowType: 'deaf', width: '', height: '', count: '', needsRAL: false, needsTinting: false }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id));
    } else {
      alert("В заказе должно быть хотя бы одно изделие!");
    }
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: value };
      
      // Auto-correct profile if product type changes
      if (field === 'productType') {
        if (value === 'partition') {
          updated.profileType = 'cold-alu';
        } else if (value === 'sliding-balcony' && updated.profileType === 'pvc') {
          updated.profileType = 'cold-alu';
        }
      }
      return updated;
    }));
  };

  const getProfileOptions = (productType) => {
    if (productType === 'partition') {
      return [{ value: 'cold-alu', label: 'Холодный алюминий' }];
    }
    if (productType === 'sliding-balcony') {
      return [
        { value: 'cold-alu', label: 'Холодный алюминий' },
        { value: 'warm-alu', label: 'Тёплый алюминий' },
      ];
    }
    return [
      { value: 'cold-alu', label: 'Холодный алюминий' },
      { value: 'warm-alu', label: 'Тёплый алюминий' },
      { value: 'pvc', label: 'ПВХ конструкции' },
    ];
  };

  const calcItem = (item) => {
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

    return { area: itemTotalArea, cost: itemBaseCost };
  };

  const calculateTotal = () => {
    let baseCostTotal = 0;
    let totalArea = 0;

    items.forEach(item => {
      const { area, cost } = calcItem(item);
      totalArea += area;
      baseCostTotal += cost;
    });

    let globalAdditive = 0;
    if (needsInstallation) globalAdditive += totalArea * prices.install_per_sqm;
    if (needsDemolition) globalAdditive += totalArea * prices.demolition_per_sqm;
    globalAdditive += (deliveryDistance || 0) * prices.delivery_per_km;

    const totalMin = (baseCostTotal + globalAdditive) * 0.95;
    const totalMax = (baseCostTotal + globalAdditive) * 1.05;

    return {
      totalArea,
      baseCostTotal,
      globalAdditive,
      min: (Math.round(totalMin / 1000) * 1000).toLocaleString('ru-RU'),
      max: (Math.round(totalMax / 1000) * 1000).toLocaleString('ru-RU'),
      minRaw: Math.round(totalMin / 1000) * 1000,
      maxRaw: Math.round(totalMax / 1000) * 1000,
    };
  };

  const totals = calculateTotal();
  const { min, max } = totals;

  // ============ SUBMIT ORDER ============
  const validateOrder = () => {
    if (!clientName || clientName.trim().length < 2) {
      alert('Введите ФИО клиента (минимум 2 символа)');
      return false;
    }
    if (clientName.length > 255) {
      alert('ФИО слишком длинное');
      return false;
    }
    if (clientPhone && !/^[\d\s\-\+\(\)]{7,20}$/.test(clientPhone)) {
      alert('Некорректный формат телефона');
      return false;
    }
    for (const item of items) {
      if (!item.width || item.width <= 0 || item.width > 50000) {
        alert('Укажите корректную ширину (1–50000 мм)');
        return false;
      }
      if (!item.height || item.height <= 0 || item.height > 50000) {
        alert('Укажите корректную высоту (1–50000 мм)');
        return false;
      }
      if (!item.count || item.count <= 0 || item.count > 999) {
        alert('Укажите корректное количество (1–999)');
        return false;
      }
    }
    return true;
  };

  const submitOrder = async () => {
    if (!validateOrder()) return;
    setSubmitting(true);
    try {
      const t = calculateTotal();
      const { error } = await supabase.from('orders').insert({
        client_name: clientName || null,
        client_phone: clientPhone || null,
        client_company: clientCompany || null,
        items: items.map(({ id, ...rest }) => rest),
        needs_installation: needsInstallation,
        needs_demolition: needsDemolition,
        delivery_distance: deliveryDistance || 0,
        total_area: parseFloat(t.totalArea.toFixed(2)),
        price_min: t.minRaw,
        price_max: t.maxRaw,
      });
      if (error) throw error;
      alert('Заявка успешно отправлена! Мы свяжемся с вами для точного расчёта.');
    } catch (err) {
      console.error('Ошибка отправки заявки');
      alert('Не удалось отправить заявку. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  // ============ PDF GENERATION ============

  // Рисует схему конструкции через SVG — разный чертёж для каждого типа
  const drawSchema = (item) => {
    const maxW = item.productType === 'sliding-balcony' ? 130 : 160;
    const maxH = 120;
    // Раздвижная лоджия всегда горизонтальная (минимум 2:1)
    const ratio = item.productType === 'sliding-balcony'
      ? Math.max(item.width / item.height, 2.2)
      : item.width / item.height;
    let dW, dH;
    if (ratio > maxW / maxH) { dW = maxW; dH = maxW / ratio; }
    else { dH = maxH; dW = maxH * ratio; }

    const ox = 5;
    const oy = 5;
    const fill = item.profileType === 'pvc' ? '#d4f0f7' : '#f5f5a0';
    const fr = 3; // толщина рамы

    // Внутренний контент по типу изделия
    let inner = '';
    // Координаты внутренней области
    const ix = ox + fr;
    const iy = oy + fr;
    const iW = dW - fr * 2;
    const iH = dH - fr * 2;

    if (item.productType === 'window' && item.windowType === 'opening') {
      // Окно: левая глухая, правая поворотно-откидная
      // Поворот: от ручки (лев. центр правой створки) к правому верхнему и правому нижнему углам
      // Откид: от верхнего центра правой створки к нижнему левому и нижнему правому углам
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
      // Дверь: 2 секции (верх+низ), треугольник от ручки (лев. центр всей двери) к правым углам
      const fillD = '#d4b830';
      const topH = iH * 0.62;
      const botY = iy + topH + 2;
      const botH = iH - topH - 2;
      const doorCy = iy + iH / 2; // центр всей двери — где ручка
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
      // Перегородка — как на картинке: бирюзовая, 2 колонки, верхние больше нижних
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
      // Раздвижная лоджия: 4 секции, бирюзовая, простые встречные стрелки → ← → ←
      const fillS = '#c0f5f5';
      const sec = 4;
      const secW = iW / sec;
      let panels = '';
      for (let i = 0; i < sec; i++) {
        const sx = ix + i * secW;
        panels += `<rect x="${sx + 1}" y="${iy}" width="${secW - 2}" height="${iH}" fill="${fillS}" stroke="#999" stroke-width="0.5"/>`;
      }
      const cy = oy + dH / 2;
      const a = 4; // размер наконечника стрелки
      const al = 10; // длина линии стрелки
      let arrows = '';
      for (let i = 0; i < sec; i++) {
        const cx = ix + i * secW + secW / 2;
        const dir = (i % 2 === 0) ? 1 : -1; // → или ←
        const tip = cx + dir * al;
        const tail = cx - dir * al;
        // Линия стрелки
        arrows += `<line x1="${tail}" y1="${cy}" x2="${tip}" y2="${cy}" stroke="#555" stroke-width="0.8"/>`;
        // Наконечник
        arrows += `<polygon points="${tip},${cy} ${tip - dir * a},${cy - a} ${tip - dir * a},${cy + a}" fill="#555"/>`;
      }
      inner = `${panels}${arrows}`;

    } else {
      // Глухое окно (по умолчанию)
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
  };

  const generatePDF = () => {
    const blue = '#005a8c';
    const today = new Date().toLocaleDateString('ru-RU');

    const content = [];

    // ===== ШАПКА (логотип слева, реквизиты справа — по центру вертикально) =====
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

    // Линия-разделитель
    content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: blue }], margin: [0, 0, 0, 10] });

    // Заголовок документа
    content.push({ text: `Предварительный расчёт от ${today}`, fontSize: 14, bold: true, alignment: 'center', margin: [0, 0, 0, 10] });

    // Клиент
    if (clientName || clientCompany) {
      const clientRows = [];
      if (clientName) clientRows.push({ text: [{ text: 'Заказчик: ', bold: true, color: blue }, { text: clientName, color: '#000000' }], fontSize: 10 });
      if (clientPhone) clientRows.push({ text: [{ text: 'Телефон: ', bold: true, color: blue }, { text: clientPhone, color: '#000000' }], fontSize: 10, margin: [0, 2, 0, 0] });
      if (clientCompany) clientRows.push({ text: [{ text: 'Организация: ', bold: true, color: blue }, { text: clientCompany, color: '#000000' }], fontSize: 10, margin: [0, 2, 0, 0] });
      content.push({ stack: clientRows, margin: [0, 0, 0, 12] });
    }

    // ===== ИЗДЕЛИЯ С ЧЕРТЕЖАМИ =====
    items.forEach((item, idx) => {
      const { area } = calcItem(item);
      const areaPerOne = (item.width * item.height) / 1000000;

      // Описание
      const desc = [];
      desc.push(`Профиль: ${PROFILE_LABELS[item.profileType]}`);
      if (item.profileType === 'pvc') {
        desc.push(`${item.chambers === '3' ? '3-х камерный' : '5-и камерный'}, ${item.windowType === 'deaf' ? 'глухое' : 'с открываемой створкой'}`);
      }
      if (item.needsRAL) desc.push('Покраска RAL');
      if (item.needsTinting) desc.push('Тонировка стёкол');

      // Блок изделия — не разрывается между страницами
      content.push({
        unbreakable: true,
        margin: [0, idx > 0 ? 14 : 0, 0, 4],
        stack: [
          {
            table: {
              widths: ['*'],
              body: [[{
                text: `Изделие № ${idx + 1}  —  ${PRODUCT_LABELS[item.productType]}`,
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
    let totalCostSum = 0;

    items.forEach((item, idx) => {
      const { area, cost } = calcItem(item);
      totalAreaSum += area;
      totalCostSum += cost;
      summaryRows.push([
        { text: String(idx + 1), fontSize: 8, alignment: 'center' },
        { text: PRODUCT_LABELS[item.productType], fontSize: 8 },
        { text: PROFILE_LABELS[item.profileType], fontSize: 8 },
        { text: String(item.width), fontSize: 8, alignment: 'center' },
        { text: String(item.height), fontSize: 8, alignment: 'center' },
        { text: String(item.count), fontSize: 8, alignment: 'center' },
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

    // Работы
    const workRows = [];
    if (needsInstallation) workRows.push(['Монтаж', `${totalAreaSum.toFixed(2)} м²`, '3 600', (totalAreaSum * 3600).toLocaleString('ru-RU')]);
    if (needsDemolition) workRows.push(['Демонтаж', `${totalAreaSum.toFixed(2)} м²`, '1 100', (totalAreaSum * 1100).toLocaleString('ru-RU')]);
    if (deliveryDistance > 0) workRows.push(['Доставка', `${deliveryDistance} км`, '75', (deliveryDistance * 75).toLocaleString('ru-RU')]);

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
    content.push({
      margin: [0, 8, 0, 0],
      table: {
        widths: ['*', 'auto'],
        body: [[
          { text: 'ИТОГО ПО ЗАКАЗУ (предварительно):', bold: true, fontSize: 11 },
          { text: `${min} — ${max} руб.`, bold: true, fontSize: 11, alignment: 'right' },
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

    // Подпись
    content.push({ text: 'Согласовано (габариты, комплектация) ____________', fontSize: 9, margin: [0, 16, 0, 0] });

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 30],
      defaultStyle: { font: 'Roboto', fontSize: 10 },
      content,
    };

    window.pdfMake.createPdf(docDefinition).download('KP_Komfort.pdf');
  };

  // ============ RENDER ============
  const containerRef = useIframeResize();
  return (
    <div className="app-container" ref={containerRef}>
      <div className="calculator-card">
        <LogoSVG height={48} className="logo-img" />
        <p className="subtitle">Экспресс-калькулятор стоимости заказа</p>

        <div className="client-info">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label">ФИО клиента</label>
            <input type="text" className="input" placeholder="Иванов Иван Иванович" value={clientName} onChange={(e) => setClientName(e.target.value)}/>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label">Телефон</label>
            <input type="tel" className="input" placeholder="+7 (999) 123-45-67" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}/>
          </div>
        </div>
        <div className="form-group">
          <label className="label">Название организации</label>
          <input type="text" className="input" placeholder="ООО «Название»" value={clientCompany} onChange={(e) => setClientCompany(e.target.value)}/>
        </div>

        <div className="items-list">
          {items.map((item, index) => (
            <div key={item.id} className="item-card">
              <div className="item-header">
                <h3>Изделие {index + 1}</h3>
                {items.length > 1 && (
                  <button className="remove-btn" onClick={() => removeItem(item.id)}>&#10005;</button>
                )}
              </div>

              <div className="form-group">
                <label className="label">Тип изделия</label>
                <select className="select" value={item.productType} onChange={(e) => updateItem(item.id, 'productType', e.target.value)}>
                  <option value="window">Окно</option>
                  <option value="door">Дверь</option>
                  <option value="partition">Перегородка</option>
                  <option value="sliding-balcony">Раздвижная лоджия</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Тип профильной системы</label>
                <select className="select" value={item.profileType} onChange={(e) => updateItem(item.id, 'profileType', e.target.value)}>
                  {getProfileOptions(item.productType).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {item.profileType === 'pvc' && (
                <div className="pvc-options">
                  <div className="form-group">
                    <label className="label">Камерность профиля</label>
                    <select className="select" value={item.chambers} onChange={(e) => updateItem(item.id, 'chambers', e.target.value)}>
                      <option value="3">3-х камерный</option>
                      <option value="5">5-и камерный</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Тип остекления</label>
                    <select className="select" value={item.windowType} onChange={(e) => updateItem(item.id, 'windowType', e.target.value)}>
                      <option value="deaf">Глухое</option>
                      <option value="opening">С открываемой створкой</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="dimensions">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">Ширина (мм)</label>
                  <input type="text" inputMode="numeric" className="input" value={item.width} onChange={(e) => updateItem(item.id, 'width', e.target.value === '' ? '' : Number(e.target.value))}/>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">Высота (мм)</label>
                  <input type="text" inputMode="numeric" className="input" value={item.height} onChange={(e) => updateItem(item.id, 'height', e.target.value === '' ? '' : Number(e.target.value))}/>
                </div>
                <div className="form-group" style={{ flex: 0.5 }}>
                  <label className="label">Кол-во (шт)</label>
                  <input type="text" inputMode="numeric" className="input" value={item.count} onChange={(e) => updateItem(item.id, 'count', e.target.value === '' ? '' : Number(e.target.value))}/>
                </div>
              </div>

              <div className="checkbox-group" style={{ marginTop: '0.5rem' }}>
                {(item.profileType === 'cold-alu' || item.profileType === 'warm-alu') && (
                  <label className="checkbox-label">
                    <input type="checkbox" checked={item.needsRAL} onChange={(e) => updateItem(item.id, 'needsRAL', e.target.checked)}/>
                    Покраска профиля RAL
                  </label>
                )}
                <label className="checkbox-label">
                  <input type="checkbox" checked={item.needsTinting} onChange={(e) => updateItem(item.id, 'needsTinting', e.target.checked)}/>
                  Тонировка стёкол
                </label>
              </div>
            </div>
          ))}
        </div>

        <button className="add-btn" onClick={addItem}>+ Добавить конструкцию</button>

        <div className="global-settings">
          <h3 className="section-title">Общие услуги (на весь заказ)</h3>

          <label className="checkbox-label" style={{ marginBottom: '0.5rem', display: 'inline-flex', width: '100%' }}>
            <input type="checkbox" checked={needsInstallation} onChange={(e) => setNeedsInstallation(e.target.checked)}/>
            Монтаж
          </label>

          <label className="checkbox-label" style={{ marginBottom: '0.75rem', display: 'inline-flex', width: '100%' }}>
            <input type="checkbox" checked={needsDemolition} onChange={(e) => setNeedsDemolition(e.target.checked)}/>
            Демонтаж старых конструкций
          </label>

          <div className="slider-container">
            <div className="slider-info" style={{ alignItems: 'center' }}>
              <span>Удаленность объекта (доставка)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="text" inputMode="numeric" className="input" style={{ width: '80px', padding: '0.4rem', textAlign: 'center' }} value={deliveryDistance} onChange={(e) => setDeliveryDistance(e.target.value === '' ? '' : Number(e.target.value))} />
                <span>км</span>
              </div>
            </div>
          </div>
        </div>

        <div className="result-box">
          <div className="result-title">Итоговая стоимость заказа (ВИЛКА)</div>
          <div className="result-price">{min} – {max} &#8381;</div>
        </div>

        <p className="note">* Стоимость подоконников, отливов, доводчиков и доп. фурнитуры рассчитывается при заявке на точный расчёт</p>

        <div className="button-row">
          <button className="pdf-btn" onClick={generatePDF}>
            Скачать КП (PDF)
          </button>
          <button className="submit-btn" onClick={submitOrder} disabled={submitting}>
            {submitting ? 'Отправка...' : 'Оставить заявку на точный расчет'}
          </button>
        </div>
      </div>
    </div>
  );
}
