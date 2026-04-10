import { useState, useEffect } from 'react';
import { supabase } from '../../supabase.js';
import { DEFAULT_PRICES } from '../../hooks/usePrices.js';
import { DEFAULT_TIMINGS } from '../../hooks/useTimings.js';
import { EMPLOYEE_ROLES } from '../constants.js';

const PRICE_FIELDS = [
  { key: 'cold_alu_default', label: 'Хол. алюминий (окно/дверь)', unit: '₽/м²' },
  { key: 'cold_alu_partition', label: 'Хол. алюминий (перегородка)', unit: '₽/м²' },
  { key: 'warm_alu', label: 'Тёплый алюминий', unit: '₽/м²' },
  { key: 'pvc_3_deaf', label: 'ПВХ 3-кам. глухое', unit: '₽/м²' },
  { key: 'pvc_3_open', label: 'ПВХ 3-кам. открывающееся', unit: '₽/м²' },
  { key: 'pvc_5_deaf', label: 'ПВХ 5-кам. глухое', unit: '₽/м²' },
  { key: 'pvc_5_open', label: 'ПВХ 5-кам. открывающееся', unit: '₽/м²' },
  { key: 'ral_multiplier', label: 'RAL наценка (множитель)', unit: '×' },
  { key: 'tinting_per_sqm', label: 'Тонировка', unit: '₽/м²' },
  { key: 'install_per_sqm', label: 'Монтаж', unit: '₽/м²' },
  { key: 'demolition_per_sqm', label: 'Демонтаж', unit: '₽/м²' },
  { key: 'delivery_per_km', label: 'Доставка', unit: '₽/км' },
];

const TIMING_FIELDS = [
  { key: 'cold_alu_min_days', label: 'Хол. алюминий мин.', unit: 'дн.' },
  { key: 'cold_alu_max_days', label: 'Хол. алюминий макс.', unit: 'дн.' },
  { key: 'warm_alu_min_days', label: 'Тёпл. алюминий мин.', unit: 'дн.' },
  { key: 'warm_alu_max_days', label: 'Тёпл. алюминий макс.', unit: 'дн.' },
  { key: 'pvc_3_min_days', label: 'ПВХ 3-кам. мин.', unit: 'дн.' },
  { key: 'pvc_3_max_days', label: 'ПВХ 3-кам. макс.', unit: 'дн.' },
  { key: 'pvc_5_min_days', label: 'ПВХ 5-кам. мин.', unit: 'дн.' },
  { key: 'pvc_5_max_days', label: 'ПВХ 5-кам. макс.', unit: 'дн.' },
  { key: 'ral_extra_days', label: 'RAL доп. дней', unit: 'дн.' },
  { key: 'window_hours', label: 'Монтаж окна', unit: 'ч.' },
  { key: 'door_hours', label: 'Монтаж двери', unit: 'ч.' },
  { key: 'partition_hours', label: 'Монтаж перегородки', unit: 'ч.' },
  { key: 'sliding_balcony_hours', label: 'Монтаж разд. лоджии', unit: 'ч.' },
  { key: 'demolition_extra_hours', label: 'Демонтаж доп. на изделие', unit: 'ч.' },
];

export default function PricesPanel({ onBack }) {
  const [prices, setPrices] = useState({ ...DEFAULT_PRICES });
  const [timings, setTimings] = useState({ ...DEFAULT_TIMINGS });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('prices');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('manager');
  const [newEmpPhone, setNewEmpPhone] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [pricesRes, timingsRes, empRes] = await Promise.all([
        supabase.from('prices').select('key, value'),
        supabase.from('timings').select('key, value'),
        supabase.from('employees').select('*').order('name'),
      ]);
      if (pricesRes.data && pricesRes.data.length > 0) {
        const fetched = {};
        pricesRes.data.forEach((r) => { fetched[r.key] = Number(r.value); });
        setPrices((prev) => ({ ...prev, ...fetched }));
      }
      if (timingsRes.data && timingsRes.data.length > 0) {
        const fetched = {};
        timingsRes.data.forEach((r) => { fetched[r.key] = Number(r.value); });
        setTimings((prev) => ({ ...prev, ...fetched }));
      }
      if (empRes.data) setEmployees(empRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const handlePriceChange = (key, val) => {
    setPrices((prev) => ({ ...prev, [key]: val }));
  };

  const handleTimingChange = (key, val) => {
    setTimings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const priceRows = Object.entries(prices).map(([key, value]) => {
        const field = PRICE_FIELDS.find((f) => f.key === key);
        return { key, value: Number(value), label: field?.label || key };
      });
      const { error: priceError } = await supabase.from('prices').upsert(priceRows, { onConflict: 'key' });
      if (priceError) throw priceError;

      const timingRows = Object.entries(timings).map(([key, value]) => {
        const field = TIMING_FIELDS.find((f) => f.key === key);
        return { key, value: Number(value), label: field?.label || key };
      });
      const { error: timingError } = await supabase.from('timings').upsert(timingRows, { onConflict: 'key' });
      if (timingError) throw timingError;

      setMessage('Сохранено!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Ошибка сохранения: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // === Сотрудники ===
  const addEmployee = async () => {
    if (!newEmpName.trim()) { alert('Введите фамилию'); return; }
    const { data, error } = await supabase.from('employees').insert({
      name: newEmpName.trim(),
      role: newEmpRole,
      phone: newEmpPhone.trim() || null,
    }).select().single();
    if (!error && data) {
      setEmployees((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewEmpName('');
      setNewEmpPhone('');
    }
  };

  const toggleEmployee = async (id, currentActive) => {
    const { error } = await supabase.from('employees').update({ active: !currentActive }).eq('id', id);
    if (!error) {
      setEmployees((prev) => prev.map(e => e.id === id ? { ...e, active: !currentActive } : e));
    }
  };

  const deleteEmployee = async (id, name) => {
    if (!window.confirm(`Удалить сотрудника "${name}"?`)) return;
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (!error) {
      setEmployees((prev) => prev.filter(e => e.id !== id));
    }
  };

  const updateEmployeeRole = async (id, role) => {
    const { error } = await supabase.from('employees').update({ role }).eq('id', id);
    if (!error) {
      setEmployees((prev) => prev.map(e => e.id === id ? { ...e, role } : e));
    }
  };

  if (loading) {
    return (
      <div className="prices-panel">
        <div className="prices-header">
          <button onClick={onBack} className="back-link">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Назад к заявкам
          </button>
          <h2 className="prices-title">Настройки</h2>
        </div>
        <div className="loading-state">
          <div className="spinner" />
          <span>Загрузка...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="prices-panel">
      <div className="prices-header">
        <div className="prices-header-left">
          <button onClick={onBack} className="back-link">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Назад к заявкам
          </button>
          <h2 className="prices-title">Настройки</h2>
        </div>
        <div className="prices-header-right">
          {message && (
            <span className={`prices-message ${message.startsWith('Ошибка') ? 'error' : 'success'}`}>
              {message}
            </span>
          )}
          {activeTab !== 'employees' && (
            <button className="prices-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          )}
        </div>
      </div>

      <div className="prices-tabs">
        <button
          className={`prices-tab ${activeTab === 'prices' ? 'active' : ''}`}
          onClick={() => setActiveTab('prices')}
        >
          Цены
        </button>
        <button
          className={`prices-tab ${activeTab === 'timings' ? 'active' : ''}`}
          onClick={() => setActiveTab('timings')}
        >
          Сроки
        </button>
        <button
          className={`prices-tab ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => setActiveTab('employees')}
        >
          Сотрудники
        </button>
      </div>

      {activeTab === 'employees' ? (
        <div className="employees-section">
          {/* Форма добавления */}
          <div className="emp-add-form">
            <input
              type="text"
              className="emp-input"
              placeholder="Фамилия"
              value={newEmpName}
              onChange={(e) => setNewEmpName(e.target.value)}
            />
            <select
              className="emp-select"
              value={newEmpRole}
              onChange={(e) => setNewEmpRole(e.target.value)}
            >
              {Object.entries(EMPLOYEE_ROLES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <input
              type="text"
              className="emp-input emp-phone"
              placeholder="Телефон"
              value={newEmpPhone}
              onChange={(e) => setNewEmpPhone(e.target.value)}
            />
            <button className="emp-add-btn" onClick={addEmployee}>Добавить</button>
          </div>

          {/* Список сотрудников */}
          <div className="emp-list">
            {employees.map((emp) => (
              <div key={emp.id} className={`emp-row ${!emp.active ? 'emp-inactive' : ''}`}>
                <div className="emp-info">
                  <span className="emp-name">{emp.name}</span>
                  {emp.phone && <span className="emp-phone-text">{emp.phone}</span>}
                </div>
                <select
                  className="emp-role-select"
                  value={emp.role}
                  onChange={(e) => updateEmployeeRole(emp.id, e.target.value)}
                >
                  {Object.entries(EMPLOYEE_ROLES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <button
                  className={`emp-toggle-btn ${emp.active ? 'active' : ''}`}
                  onClick={() => toggleEmployee(emp.id, emp.active)}
                  title={emp.active ? 'Деактивировать' : 'Активировать'}
                >
                  {emp.active ? 'Активен' : 'Неактивен'}
                </button>
                <button
                  className="emp-delete-btn"
                  onClick={() => deleteEmployee(emp.id, emp.name)}
                  title="Удалить"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="prices-grid">
          {(activeTab === 'prices' ? PRICE_FIELDS : TIMING_FIELDS).map((field) => (
            <div key={field.key} className="prices-field">
              <label className="prices-label">{field.label}</label>
              <div className="prices-input-wrapper">
                <input
                  type="number"
                  step="any"
                  className="prices-input"
                  value={(activeTab === 'prices' ? prices : timings)[field.key] ?? ''}
                  onChange={(e) => (activeTab === 'prices' ? handlePriceChange : handleTimingChange)(field.key, e.target.value)}
                />
                <span className="prices-unit">{field.unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
