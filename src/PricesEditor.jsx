import { useState, useEffect } from 'react';
import { supabase } from './supabase.js';
import useAuth from './useAuth.js';
import LoginForm from './LoginForm.jsx';
import { DEFAULT_PRICES } from './hooks/usePrices.js';
import './prices.css';

// Те же поля цен, что использует калькулятор (usePrices/calcItem).
// Держим список здесь, чтобы редактор цен не зависел от дашборда.
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

export default function PricesEditor() {
  const { session, loading: authLoading, signIn, signOut } = useAuth();

  if (authLoading) {
    return (
      <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return <LoginForm onLogin={signIn} />;
  }

  return <PricesEditorContent onLogout={signOut} />;
}

function PricesEditorContent({ onLogout }) {
  const [prices, setPrices] = useState({ ...DEFAULT_PRICES });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data } = await supabase.from('prices').select('key, value');
      if (!cancelled && data && data.length > 0) {
        const fetched = {};
        data.forEach((r) => { fetched[r.key] = Number(r.value); });
        setPrices((prev) => ({ ...prev, ...fetched }));
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleChange = (key, val) => {
    setPrices((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const rows = PRICE_FIELDS.map((field) => ({
        key: field.key,
        value: Number(prices[field.key]),
        label: field.label,
      }));
      const { error } = await supabase.from('prices').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      setMessage('Сохранено!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Ошибка сохранения: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="prices-panel" style={{ position: 'fixed', inset: 0, overflowY: 'auto' }}>
      <div style={{ maxWidth: '620px', margin: '0 auto' }}>
      <div className="prices-header">
        <div className="prices-header-left">
          <button className="back-link" onClick={() => { window.location.hash = ''; }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Калькулятор
          </button>
          <h2 className="prices-title">Цены</h2>
        </div>
        <div className="prices-header-right">
          {message && (
            <span className={`prices-message ${message.startsWith('Ошибка') ? 'error' : 'success'}`}>
              {message}
            </span>
          )}
          <button className="prices-save-btn" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button className="back-link" onClick={onLogout} style={{ marginLeft: '0.75rem' }}>
            Выйти
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Загрузка...</span>
        </div>
      ) : (
        <div className="prices-grid">
          {PRICE_FIELDS.map((field) => (
            <div key={field.key} className="prices-field">
              <label className="prices-label" style={{ fontSize: '15px' }}>{field.label}</label>
              <div className="prices-input-wrapper">
                <input
                  type="number"
                  step="any"
                  className="prices-input"
                  style={{ fontSize: '16px', padding: '4px 10px', width: '92px' }}
                  value={prices[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
                <span className="prices-unit" style={{ fontSize: '13px' }}>{field.unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
