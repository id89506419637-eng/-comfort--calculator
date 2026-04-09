import { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

const DEFAULT_PRICES = {
  cold_alu_partition: 10000,
  cold_alu_default: 19000,
  warm_alu: 44500,
  pvc_3_deaf: 5800,
  pvc_3_open: 8600,
  pvc_5_deaf: 6500,
  pvc_5_open: 10300,
  ral_multiplier: 1.1,
  tinting_per_sqm: 2310,
  install_per_sqm: 3600,
  demolition_per_sqm: 1100,
  delivery_per_km: 75,
};

export default function usePrices() {
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrices() {
      try {
        const { data, error } = await supabase.from('prices').select('key, value');
        if (error) throw error;
        if (!cancelled && data && data.length > 0) {
          const fetched = {};
          data.forEach((row) => {
            fetched[row.key] = Number(row.value);
          });
          setPrices((prev) => ({ ...prev, ...fetched }));
        }
      } catch (err) {
        console.warn('Не удалось загрузить цены, используются значения по умолчанию:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPrices();
    return () => { cancelled = true; };
  }, []);

  return { prices, loading };
}

export { DEFAULT_PRICES };
