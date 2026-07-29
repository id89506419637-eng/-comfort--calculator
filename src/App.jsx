import { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from './supabase.js';
import LogoSVG from './LogoSVG.jsx';
import usePrices from './hooks/usePrices.js';
import { buildKpPdf, buildKpPdfBlob, calcItem } from './kpPdf.js';
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
  const [successModal, setSuccessModal] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [inlineError, setInlineError] = useState('');

  // Прикрепляемые клиентом файлы (чертежи, фото, PDF, AutoCAD и т.п.)
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const MAX_FILES = 10;
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 МБ на один файл
  const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20 МБ суммарно (лимит Mail.ru на вложения в письме)
  // Документы — проверяем по расширению. Изображения — пропускаем все по MIME-типу
  // (jpg/jpeg/png/heic/jfif/webp/bmp/tiff и т.п. с телефонов и мессенджеров).
  const ALLOWED_EXTS = ['pdf', 'dwg', 'dxf', 'doc', 'docx', 'xls', 'xlsx', 'zip'];

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
  };

  // Незаметное сжатие изображений в браузере перед загрузкой:
  // фото с телефонов 6+ МБ ужимаются до ~500 КБ при разрешении 1920×1280, качество 85%.
  // Документы (PDF, DWG, Word и т.п.) НЕ трогаем — для них сжатие без потерь сложно
  // и не нужно. HEIC тоже пропускаем — браузеры не умеют декодировать его в Canvas.
  const compressImage = (file) => {
    const type = file.type || '';
    if (!type.startsWith('image/') || type === 'image/heic' || type === 'image/heif') {
      return Promise.resolve(file);
    }
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let { width, height } = img;
        const MAX_W = 1920;
        const MAX_H = 1280;
        if (width > MAX_W || height > MAX_H) {
          const ratio = Math.min(MAX_W / width, MAX_H / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob || blob.size >= file.size) {
            // Если по какой-то причине сжатый больше оригинала — оставляем оригинал
            resolve(file);
            return;
          }
          // Заменяем расширение на .jpg, тип на image/jpeg
          const nameNoExt = file.name.replace(/\.[^.]+$/, '');
          const newFile = new File([blob], `${nameNoExt}.jpg`, {
            type: 'image/jpeg',
            lastModified: file.lastModified,
          });
          resolve(newFile);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  };

  const addFiles = async (newFiles) => {
    // Сжимаем изображения параллельно (документы compressImage возвращает без изменений)
    const processed = await Promise.all(
      Array.from(newFiles).map((f) => compressImage(f).catch(() => f))
    );

    const filesToAdd = [];
    let runningTotal = attachments.reduce((sum, f) => sum + f.size, 0);
    for (const file of processed) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const isImage = (file.type || '').startsWith('image/');
      const isAllowedDoc = ALLOWED_EXTS.includes(ext);
      if (!isImage && !isAllowedDoc) {
        toast.error(`«${file.name}»: формат не поддерживается`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`«${file.name}»: больше 20 МБ — уменьшите файл`);
        continue;
      }
      if (attachments.length + filesToAdd.length >= MAX_FILES) {
        toast.error(`Можно прикрепить максимум ${MAX_FILES} файлов`);
        break;
      }
      if (runningTotal + file.size > MAX_TOTAL_SIZE) {
        const usedMb = (runningTotal / 1024 / 1024).toFixed(1);
        toast.error(`Превышен общий объём вложений (макс. 20 МБ, уже занято ${usedMb} МБ). Уменьшите размер файлов или удалите ненужные.`);
        break;
      }
      runningTotal += file.size;
      filesToAdd.push(file);
    }
    if (filesToAdd.length > 0) {
      setAttachments((prev) => [...prev, ...filesToAdd]);
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(Array.from(e.dataTransfer.files));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), productType: 'window', profileType: 'cold-alu', chambers: '3', windowType: 'deaf', width: '', height: '', count: '', needsRAL: false, needsTinting: false }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id));
    } else {
      toast.error('В заказе должно быть хотя бы одно изделие');
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

  const calculateTotal = () => {
    let baseCostTotal = 0;
    let totalArea = 0;

    items.forEach(item => {
      const { area, cost } = calcItem(item, prices);
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
  const showInlineError = (msg) => {
    setInlineError(msg);
    setTimeout(() => setInlineError(''), 4000);
  };

  const validateOrder = () => {
    if (!clientName || clientName.trim().length < 2) {
      showInlineError('Введите ФИО клиента (минимум 2 символа)');
      return false;
    }
    if (clientName.length > 255) {
      showInlineError('ФИО слишком длинное');
      return false;
    }
    if (clientPhone && !/^[\d\s\-\+\(\)]{7,20}$/.test(clientPhone)) {
      showInlineError('Некорректный формат телефона');
      return false;
    }
    for (const item of items) {
      if (!item.width || item.width <= 0 || item.width > 50000) {
        showInlineError('Укажите корректную ширину (1–50000 мм)');
        return false;
      }
      if (!item.height || item.height <= 0 || item.height > 50000) {
        showInlineError('Укажите корректную высоту (1–50000 мм)');
        return false;
      }
      if (!item.count || item.count <= 0 || item.count > 999) {
        showInlineError('Укажите корректное количество (1–999)');
        return false;
      }
    }
    setInlineError('');
    return true;
  };

  const submitOrder = async () => {
    if (!validateOrder()) return;
    setSubmitting(true);
    const uploadedPaths = [];
    try {
      const folderId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Date.now() + '-' + Math.random().toString(36).slice(2);

      const t = calculateTotal();

      // 1) Параллельно: загрузка файлов клиента и генерация PDF КП.
      //    Эти операции независимы — выполняем одновременно, экономим секунды.
      console.log('[submitOrder] uploading attachments + generating KP in parallel');
      const t0 = Date.now();

      // Загрузка файлов через Vercel-прокси (/api/upload) — обходит блокировку
      // провайдера, который сбрасывает прямые POST-запросы к supabase.co.
      // Для файлов > 3.5 МБ — разбиваем на части (Vercel лимит 4.5 МБ).
      const CHUNK_SIZE = 3.5 * 1024 * 1024; // 3.5 МБ на chunk
      const uploadViaProxy = async (filePath, fileBody, contentType) => {
        const blob = fileBody instanceof Blob ? fileBody : new Blob([fileBody]);
        if (blob.size <= CHUNK_SIZE) {
          // Маленький файл — обычная загрузка
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'x-file-path': filePath, 'x-content-type': contentType },
            body: fileBody,
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || err.message || `HTTP ${res.status}`);
          }
          return res.json();
        }
        // Большой файл — chunk-загрузка
        const total = Math.ceil(blob.size / CHUNK_SIZE);
        for (let i = 0; i < total; i++) {
          const chunk = blob.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'x-file-path': filePath,
              'x-content-type': contentType,
              'x-chunk-index': String(i),
              'x-chunk-total': String(total),
            },
            body: chunk,
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || err.message || `HTTP ${res.status}`);
          }
        }
        return { ok: true };
      };

      const uploadAttachmentsPromise = (async () => {
        const result = [];
        for (const file of attachments) {
          const safeName = file.name.replace(/[^\w.\-]+/g, '_') || 'file';
          const path = `${folderId}/${Date.now()}-${safeName}`;
          try {
            await uploadViaProxy(path, file, file.type || 'application/octet-stream');
          } catch (e) {
            throw new Error(`Не удалось загрузить «${file.name}»: ${e.message}`);
          }
          uploadedPaths.push(path);
          result.push({ name: file.name, size: file.size, type: file.type || '', path });
        }
        return result;
      })();

      const kpBlobPromise = Promise.race([
        buildKpPdfBlob({
          items, clientName, clientPhone, clientCompany,
          needsInstallation, needsDemolition,
          deliveryDistance: Number(deliveryDistance) || 0,
          priceMin: t.minRaw, priceMax: t.maxRaw,
        }, prices),
        new Promise((_, reject) => setTimeout(() => reject(new Error('PDF timeout')), 15000)),
      ]).catch((err) => {
        console.warn('[submitOrder] PDF КП skipped:', err?.message || err);
        return null;
      });

      const [uploadedClientFiles, kpBlob] = await Promise.all([
        uploadAttachmentsPromise,
        kpBlobPromise,
      ]);
      console.log('[submitOrder] phase1 done in', Date.now() - t0, 'ms');

      const uploadedAttachments = [...uploadedClientFiles];

      // 2) Если КП успешно сгенерирован — загружаем его в Storage
      if (kpBlob) {
        const kpPath = `${folderId}/kp.pdf`;
        try {
          await uploadViaProxy(kpPath, kpBlob, 'application/pdf');
          uploadedPaths.push(kpPath);
          uploadedAttachments.push({
            name: 'КП.pdf',
            size: kpBlob.size,
            type: 'application/pdf',
            path: kpPath,
            isKp: true,
          });
          console.log('[submitOrder] KP PDF uploaded');
        } catch (e) {
          console.warn('[submitOrder] KP upload failed:', e.message);
        }
      }
      console.log('[submitOrder] inserting order at', Date.now() - t0, 'ms');

      // 3) Создаём заявку с путями ко всем файлам
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
        attachments: uploadedAttachments,
      });
      if (error) throw error;

      // Email отправляется ФОНОВО — не блокируем UI, заявка уже сохранена
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: {
            client_name: clientName || null,
            client_phone: clientPhone || null,
            price_min: t.minRaw,
            price_max: t.maxRaw,
            attachments: uploadedAttachments,
          },
        }),
      }).then(() => console.log('[submitOrder] email sent'))
        .catch(e => console.warn('[submitOrder] email failed:', e.message));

      setSuccessModal(true);
      setAttachments([]);
    } catch (err) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('order-attachments').remove(uploadedPaths).catch(() => {});
      }
      console.error('Ошибка отправки заявки', err);
      toast.error(err?.message || 'Не удалось отправить заявку. Попробуйте ещё раз');
    } finally {
      setSubmitting(false);
    }
  };

  // ============ PDF GENERATION ============
  // Генератор КП вынесен в src/kpPdf.js — один и тот же документ
  // используется и тут (клиент скачивает), и в дашборде (менеджер открывает по заявке).

  const handleDownloadPdf = () => {
    const t = calculateTotal();
    buildKpPdf({
      items,
      clientName,
      clientPhone,
      clientCompany,
      needsInstallation,
      needsDemolition,
      deliveryDistance: Number(deliveryDistance) || 0,
      priceMin: t.minRaw,
      priceMax: t.maxRaw,
    }, prices);
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

          <label className="checkbox-label" style={{ marginBottom: '0.4rem', display: 'inline-flex', width: '100%' }}>
            <input type="checkbox" checked={needsDemolition} onChange={(e) => setNeedsDemolition(e.target.checked)}/>
            Демонтаж старых конструкций
          </label>

          <div className="slider-container" style={{ marginTop: 0 }}>
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
          <div className="result-title">Предварительная стоимость заказа</div>
          <div className="result-price">{min} – {max} &#8381;</div>
        </div>

        <p className="note">* Стоимость подоконников, отливов, доводчиков и доп. фурнитуры рассчитывается при заявке на точный расчёт</p>

        <div className="consent-block">
          <label className="checkbox-label consent-label">
            <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} />
            <span>Я соглашаюсь с{' '}
              <a href="https://komfortnt.ru/privacy/" target="_blank" rel="noopener noreferrer">Политикой конфиденциальности</a>{' '}и даю{' '}
              <a href="https://komfortnt.ru/consent/" target="_blank" rel="noopener noreferrer">Согласие на обработку персональных данных</a>
            </span>
          </label>
        </div>

        {inlineError && (
          <div className="inline-error">
            <span className="inline-error-icon">⚠</span>
            {inlineError}
          </div>
        )}

        <div className="button-row">
          <button className="pdf-btn" onClick={handleDownloadPdf}>
            Скачать КП (PDF)
          </button>
          <button className="submit-btn" onClick={submitOrder} disabled={submitting || !consentChecked}>
            {submitting ? 'Отправка...' : 'Оставить заявку на точный расчет'}
          </button>
        </div>

        <div
          className={`attach-block ${dragOver ? 'attach-block-drag' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <button
            type="button"
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={attachments.length >= MAX_FILES}
            title="Прикрепить файлы (чертёж, фото, PDF, AutoCAD)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Прикрепить файлы</span>
            <span className="attach-hint">чертёж, фото, PDF, AutoCAD — до 20 МБ суммарно</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx,.zip"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.length) addFiles(Array.from(e.target.files));
              e.target.value = '';
            }}
          />
          {attachments.length > 0 && (
            <ul className="attach-list">
              {attachments.map((f, i) => (
                <li key={i} className="attach-item">
                  <span className="attach-name" title={f.name}>{f.name}</span>
                  <span className="attach-size">{formatFileSize(f.size)}</span>
                  <button
                    type="button"
                    className="attach-remove"
                    onClick={() => removeAttachment(i)}
                    title="Удалить файл"
                    aria-label="Удалить файл"
                  >×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {successModal && (
        <div className="success-overlay" onClick={() => setSuccessModal(false)}>
          <div className="success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 className="success-title">Заявка принята!</h2>
            <p className="success-text">Мы свяжемся с вами в ближайшее рабочее время для уточнения деталей</p>
            <button className="success-btn" onClick={() => setSuccessModal(false)}>Отлично</button>
          </div>
        </div>
      )}

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'rgba(30, 41, 59, 0.95)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '12px 18px',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#fff' },
          },
        }}
      />
    </div>
  );
}
