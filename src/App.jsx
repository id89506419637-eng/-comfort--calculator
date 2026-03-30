import React, { useState } from 'react';
import './index.css';

export default function App() {
  const [items, setItems] = useState([
    { id: Date.now(), productType: 'window', profileType: 'cold-alu', width: 1500, height: 1500, count: 1, needsRAL: false, needsTinting: false }
  ]);
  
  const [needsInstallation, setNeedsInstallation] = useState(true);
  const [deliveryDistance, setDeliveryDistance] = useState(0);

  const addItem = () => {
    setItems([...items, { id: Date.now(), productType: 'window', profileType: 'cold-alu', width: 1000, height: 1000, count: 1, needsRAL: false, needsTinting: false }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id));
    } else {
      alert("В заказе должно быть хотя бы одно изделие!");
    }
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const calculateTotal = () => {
    let baseCostTotal = 0;
    let totalArea = 0;

    items.forEach(item => {
      // Area in square meters
      let rawArea = (item.width * item.height) / 1000000;
      let area = rawArea;
      
      // Minimum area rules for Aluminum profiles (to compensate for offcuts)
      if (item.profileType === 'cold-alu' || item.profileType === 'warm-alu') {
        if (item.productType === 'door' && rawArea < 2) area = 2; // minimum 2 sq.m.
        else if (item.productType === 'window' && rawArea < 1) area = 1; // minimum 1 sq.m.
      }
      
      let itemTotalArea = area * item.count;
      totalArea += itemTotalArea;
      
      let basePricePerSqM = 0;
      if (item.profileType === 'cold-alu') basePricePerSqM = 19000;
      else if (item.profileType === 'warm-alu') basePricePerSqM = 44500;
      else if (item.profileType === 'pvc') basePricePerSqM = 11000;
      
      let itemBaseCost = itemTotalArea * basePricePerSqM;
      
      // RAL Painting applied to this specific item's profile (+10%)
      if (item.needsRAL && (item.profileType === 'cold-alu' || item.profileType === 'warm-alu')) {
          itemBaseCost *= 1.1; 
      }
      
      // Tinting applied to this item's fillings
      if (item.needsTinting) {
          itemBaseCost += itemTotalArea * 2310;
      }
      
      baseCostTotal += itemBaseCost;
    });
    
    // Global options applied to the entire order (all squared meters)
    let globalAdditive = 0;
    if (needsInstallation) globalAdditive += totalArea * 3600; // Updated installation
    globalAdditive += deliveryDistance * 75; // Delivery price per km
    
    const totalMin = (baseCostTotal + globalAdditive) * 0.95;
    const totalMax = (baseCostTotal + globalAdditive) * 1.05;
    
    return {
      min: Math.round(totalMin).toLocaleString('ru-RU'),
      max: Math.round(totalMax).toLocaleString('ru-RU')
    };
  };

  const { min, max } = calculateTotal();

  return (
    <div className="app-container">
      <div className="calculator-card">
        <h1 className="title">Комфорт+</h1>
        <p className="subtitle">Экспресс-калькулятор стоимости заказа</p>

        <div className="items-list">
          {items.map((item, index) => (
            <div key={item.id} className="item-card">
              <div className="item-header">
                <h3>Изделие {index + 1}</h3>
                {items.length > 1 && (
                  <button className="remove-btn" onClick={() => removeItem(item.id)}>✕</button>
                )}
              </div>
              
              <div className="form-group">
                <label className="label">Тип изделия</label>
                <select className="select" value={item.productType} onChange={(e) => updateItem(item.id, 'productType', e.target.value)}>
                  <option value="window">Окно</option>
                  <option value="door">Дверь / Входная группа</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Тип профильной системы</label>
                <select className="select" value={item.profileType} onChange={(e) => updateItem(item.id, 'profileType', e.target.value)}>
                  <option value="cold-alu">Холодный алюминий (ТАТПРОФ)</option>
                  <option value="warm-alu">Теплый / Противопожарный алюминий (СИАЛ)</option>
                  <option value="pvc">ПВХ конструкции (Exprof, ProWin)</option>
                </select>
              </div>

              <div className="dimensions">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">Ширина (мм)</label>
                  <input type="number" className="input" value={item.width} onChange={(e) => updateItem(item.id, 'width', Number(e.target.value))} min="100"/>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">Высота (мм)</label>
                  <input type="number" className="input" value={item.height} onChange={(e) => updateItem(item.id, 'height', Number(e.target.value))} min="100"/>
                </div>
                <div className="form-group" style={{ flex: 0.5 }}>
                  <label className="label">Кол-во (шт)</label>
                  <input type="number" className="input" value={item.count} onChange={(e) => updateItem(item.id, 'count', Number(e.target.value))} min="1"/>
                </div>
              </div>

              <div className="checkbox-group" style={{ marginTop: '1rem' }}>
                <label className="checkbox-label">
                  <input type="checkbox" checked={item.needsRAL} onChange={(e) => updateItem(item.id, 'needsRAL', e.target.checked)}/>
                  Покраска профиля RAL
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={item.needsTinting} onChange={(e) => updateItem(item.id, 'needsTinting', e.target.checked)}/>
                  Тонировка стёкол
                </label>
              </div>
            </div>
          ))}
        </div>

        <button className="add-btn" onClick={addItem}>＋ Добавить конструкцию</button>

        <div className="global-settings">
          <h3 className="section-title">Общие услуги (на весь заказ)</h3>
          
          <label className="checkbox-label" style={{ marginBottom: '1.5rem', display: 'inline-flex', width: '100%' }}>
            <input type="checkbox" checked={needsInstallation} onChange={(e) => setNeedsInstallation(e.target.checked)}/>
            Монтаж (считается на всю расчетную площадь КП)
          </label>

          <div className="slider-container">
            <div className="slider-info" style={{ alignItems: 'center' }}>
              <span>Удаленность объекта (доставка)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="number" className="input" style={{ width: '80px', padding: '0.4rem', textAlign: 'center' }} value={deliveryDistance} onChange={(e) => setDeliveryDistance(Number(e.target.value))} min="0" />
                <span>км</span>
              </div>
            </div>
          </div>
        </div>

        <div className="result-box">
          <div className="result-title">Итоговая стоимость заказа (ВИЛКА)</div>
          <div className="result-price">{min} – {max} ₽</div>
        </div>

        <button className="submit-btn" onClick={() => alert('Заявка со всеми конструкциями передана!')}>
          Оставить заявку на точный расчет
        </button>
      </div>
    </div>
  );
}
