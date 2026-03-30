import React, { useState } from 'react';
import './index.css';

export default function App() {
  const [profileType, setProfileType] = useState('cold-alu');
  const [width, setWidth] = useState(1500);
  const [height, setHeight] = useState(1500);
  
  const [needsInstallation, setNeedsInstallation] = useState(true);
  const [needsRAL, setNeedsRAL] = useState(false);
  const [needsTinting, setNeedsTinting] = useState(false);
  const [deliveryDistance, setDeliveryDistance] = useState(0);

  const calculatePrice = () => {
    // Area in square meters
    const area = (width * height) / 1000000;
    
    // Base pricing mapped from the estimates
    let basePricePerSqM = 0;
    if (profileType === 'cold-alu') basePricePerSqM = 19000;
    else if (profileType === 'warm-alu') basePricePerSqM = 44500;
    else if (profileType === 'pvc') basePricePerSqM = 11000;
    
    let baseCost = area * basePricePerSqM;
    
    // Options that increase base profile cost
    if (needsRAL) baseCost *= 1.1; // 10% increase for RAL coloring
    
    // Additive options
    let additionalCost = 0;
    if (needsInstallation) additionalCost += area * 2800;
    if (needsTinting) additionalCost += area * 2300;
    additionalCost += deliveryDistance * 75;
    
    const totalMin = (baseCost + additionalCost) * 0.95;
    const totalMax = (baseCost + additionalCost) * 1.05;
    
    return {
      min: Math.round(totalMin).toLocaleString('ru-RU'),
      max: Math.round(totalMax).toLocaleString('ru-RU')
    };
  };

  const { min, max } = calculatePrice();

  return (
    <div className="app-container">
      <div className="calculator-card">
        <h1 className="title">Комфорт+</h1>
        <p className="subtitle">Экспресс-калькулятор стоимости конструкций</p>

        <div className="form-group">
          <label className="label">Тип профильной системы</label>
          <select 
            className="select"
            value={profileType} 
            onChange={(e) => setProfileType(e.target.value)}
          >
            <option value="cold-alu">Холодный алюминий (ТАТПРОФ)</option>
            <option value="warm-alu">Теплый / Противопожарный алюминий (СИАЛ)</option>
            <option value="pvc">ПВХ конструкции (Exprof, ProWin)</option>
          </select>
        </div>

        <div className="dimensions">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label">Ширина (мм)</label>
            <input 
              type="number" 
              className="input" 
              value={width} 
              onChange={(e) => setWidth(Number(e.target.value))}
              min="100"
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label">Высота (мм)</label>
            <input 
              type="number" 
              className="input" 
              value={height} 
              onChange={(e) => setHeight(Number(e.target.value))}
              min="100"
            />
          </div>
        </div>

        <div className="checkbox-group">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={needsInstallation} 
              onChange={(e) => setNeedsInstallation(e.target.checked)}
            />
            Монтаж конструкций
          </label>
          
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={needsRAL} 
              onChange={(e) => setNeedsRAL(e.target.checked)}
            />
            Покраска по RAL
          </label>

          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={needsTinting} 
              onChange={(e) => setNeedsTinting(e.target.checked)}
            />
            Тонировка / Бронь
          </label>
        </div>

        <div className="slider-container">
          <div className="slider-info" style={{ alignItems: 'center' }}>
            <span>Удаленность объекта (доставка)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="number" 
                className="input" 
                style={{ width: '80px', padding: '0.4rem', textAlign: 'center' }}
                value={deliveryDistance} 
                onChange={(e) => setDeliveryDistance(Number(e.target.value))}
                min="0"
              />
              <span>км</span>
            </div>
          </div>
          <input 
            type="range" 
            min="0" 
            max="500" 
            step="5"
            className="range-slider"
            value={deliveryDistance} 
            onChange={(e) => setDeliveryDistance(Number(e.target.value))}
          />
        </div>

        <div className="result-box">
          <div className="result-title">Ориентировочная стоимость</div>
          <div className="result-price">{min} – {max} ₽</div>
        </div>

        <button className="submit-btn" onClick={() => alert('Заявка передана!')}>
          Оставить заявку на точный расчет
        </button>
      </div>
    </div>
  );
}
