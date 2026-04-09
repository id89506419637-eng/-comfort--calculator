import { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

const DEFAULT_TIMINGS = {
  cold_alu_min_days: 7,
  cold_alu_max_days: 10,
  warm_alu_min_days: 12,
  warm_alu_max_days: 15,
  pvc_3_min_days: 5,
  pvc_3_max_days: 7,
  pvc_5_min_days: 7,
  pvc_5_max_days: 10,
  ral_extra_days: 5,
  window_hours: 1.5,
  door_hours: 2,
  partition_hours: 2.5,
  sliding_balcony_hours: 3,
  demolition_extra_hours: 0.5,
};

export default function useTimings() {
  const [timings, setTimings] = useState(DEFAULT_TIMINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchTimings() {
      try {
        const { data, error } = await supabase.from('timings').select('key, value');
        if (error) throw error;
        if (!cancelled && data && data.length > 0) {
          const fetched = {};
          data.forEach((row) => {
            fetched[row.key] = Number(row.value);
          });
          setTimings((prev) => ({ ...prev, ...fetched }));
        }
      } catch (err) {
        console.warn('Не удалось загрузить сроки, используются значения по умолчанию:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTimings();
    return () => { cancelled = true; };
  }, []);

  return { timings, loading };
}

export { DEFAULT_TIMINGS };
