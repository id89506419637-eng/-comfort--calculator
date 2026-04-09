-- =============================================
-- Миграция: таблицы prices и timings
-- Проект: Комфорт+ калькулятор
-- =============================================

-- 1. Таблица цен
CREATE TABLE IF NOT EXISTS prices (
  key TEXT PRIMARY KEY,
  value NUMERIC NOT NULL,
  label TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Таблица сроков
CREATE TABLE IF NOT EXISTS timings (
  key TEXT PRIMARY KEY,
  value NUMERIC NOT NULL,
  label TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Автообновление updated_at при изменении
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prices_updated_at
  BEFORE UPDATE ON prices
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER timings_updated_at
  BEFORE UPDATE ON timings
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =============================================
-- 4. БЕЗОПАСНОСТЬ: RLS (Row Level Security)
-- =============================================

-- Включаем RLS
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE timings ENABLE ROW LEVEL SECURITY;

-- prices: чтение — всем (калькулятор на сайте работает без авторизации)
CREATE POLICY "prices_select_public"
  ON prices FOR SELECT
  USING (true);

-- prices: запись — только авторизованным (админ дашборда)
CREATE POLICY "prices_insert_auth"
  ON prices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "prices_update_auth"
  ON prices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- prices: удаление — запрещено всем (нельзя случайно удалить цену)
-- (политика DELETE не создаётся = запрещено по умолчанию при включённом RLS)

-- timings: чтение — только авторизованным (используется только в дашборде)
CREATE POLICY "timings_select_auth"
  ON timings FOR SELECT
  TO authenticated
  USING (true);

-- timings: запись — только авторизованным
CREATE POLICY "timings_insert_auth"
  ON timings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "timings_update_auth"
  ON timings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- timings: удаление — запрещено

-- =============================================
-- 5. Дефолтные значения цен
-- =============================================

INSERT INTO prices (key, value, label) VALUES
  ('cold_alu_default',    19000, 'Хол. алюминий (окно/дверь)'),
  ('cold_alu_partition',  10000, 'Хол. алюминий (перегородка)'),
  ('warm_alu',            44500, 'Тёплый алюминий'),
  ('pvc_3_deaf',           5800, 'ПВХ 3-кам. глухое'),
  ('pvc_3_open',           8600, 'ПВХ 3-кам. открывающееся'),
  ('pvc_5_deaf',           6500, 'ПВХ 5-кам. глухое'),
  ('pvc_5_open',          10300, 'ПВХ 5-кам. открывающееся'),
  ('ral_multiplier',        1.1, 'RAL наценка (множитель)'),
  ('tinting_per_sqm',     2310, 'Тонировка ₽/м²'),
  ('install_per_sqm',     3600, 'Монтаж ₽/м²'),
  ('demolition_per_sqm',  1100, 'Демонтаж ₽/м²'),
  ('delivery_per_km',       75, 'Доставка ₽/км')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 6. Дефолтные значения сроков
-- =============================================

INSERT INTO timings (key, value, label) VALUES
  ('cold_alu_min_days',       7, 'Хол. алюминий мин. дней'),
  ('cold_alu_max_days',      10, 'Хол. алюминий макс. дней'),
  ('warm_alu_min_days',      12, 'Тёпл. алюминий мин. дней'),
  ('warm_alu_max_days',      15, 'Тёпл. алюминий макс. дней'),
  ('pvc_3_min_days',          5, 'ПВХ 3-кам. мин. дней'),
  ('pvc_3_max_days',          7, 'ПВХ 3-кам. макс. дней'),
  ('pvc_5_min_days',          7, 'ПВХ 5-кам. мин. дней'),
  ('pvc_5_max_days',         10, 'ПВХ 5-кам. макс. дней'),
  ('ral_extra_days',          5, 'RAL доп. дней'),
  ('window_hours',          1.5, 'Монтаж окна (часы)'),
  ('door_hours',              2, 'Монтаж двери (часы)'),
  ('partition_hours',       2.5, 'Монтаж перегородки (часы)'),
  ('sliding_balcony_hours',   3, 'Монтаж разд. лоджии (часы)'),
  ('demolition_extra_hours', 0.5, 'Демонтаж доп. часы на изделие')
ON CONFLICT (key) DO NOTHING;
