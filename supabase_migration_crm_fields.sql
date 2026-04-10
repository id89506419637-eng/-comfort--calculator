-- =============================================
-- МИГРАЦИЯ: CRM-поля + история действий
-- Дашборд Комфорт+
-- =============================================

-- 1. Новые поля в таблице orders
-- =============================================

-- Ответственный менеджер
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manager text;

-- Замерщик
ALTER TABLE orders ADD COLUMN IF NOT EXISTS measurer text;

-- Контрагент (подрядчик)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contractor text;

-- № договора
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contract_number text;

-- № счёта
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number text;

-- Статус оплаты: not_paid, partial, paid
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'not_paid';

-- Сумма оплаченного (если частичная оплата)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0;

-- Готовность цеха в процентах (0-100)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS production_percent integer DEFAULT 0;

-- Дата запуска производства
ALTER TABLE orders ADD COLUMN IF NOT EXISTS production_start_date date;

-- Тип отгрузки: pickup (самовывоз), delivery (доставка), install (монтаж)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type text DEFAULT 'install';

-- Общая площадь м2
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_area numeric;


-- 2. Таблица истории действий
-- =============================================
CREATE TABLE IF NOT EXISTS action_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  action text NOT NULL,           -- 'status_change', 'field_update', 'comment', 'payment'
  old_value text,                 -- предыдущее значение
  new_value text,                 -- новое значение
  field_name text,                -- какое поле изменено
  comment text,                   -- комментарий к действию
  user_email text,                -- кто сделал
  created_at timestamptz DEFAULT now()
);

-- Индекс для быстрой выборки по заказу
CREATE INDEX IF NOT EXISTS idx_action_history_order_id ON action_history(order_id);
CREATE INDEX IF NOT EXISTS idx_action_history_created_at ON action_history(created_at DESC);


-- 3. RLS (безопасность)
-- =============================================

-- action_history: читать может любой авторизованный, писать тоже
ALTER TABLE action_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read action_history"
  ON action_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert action_history"
  ON action_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Обновлять и удалять историю нельзя — это аудит-лог
-- (никаких UPDATE/DELETE политик)


-- 4. Список сотрудников (справочник)
-- =============================================
CREATE TABLE IF NOT EXISTS employees (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  role text DEFAULT 'manager',   -- 'manager', 'measurer', 'installer', 'admin'
  phone text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage employees"
  ON employees FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Начальные сотрудники из таблиц заказчика
INSERT INTO employees (name, role) VALUES
  ('Исакова', 'manager'),
  ('Гирищук', 'manager'),
  ('Вяткина', 'manager'),
  ('Гоголева', 'manager'),
  ('Кустов', 'manager'),
  ('Слепнева', 'manager'),
  ('Суханов', 'measurer'),
  ('Холодов', 'measurer'),
  ('Кудря', 'measurer')
ON CONFLICT DO NOTHING;
