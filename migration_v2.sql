-- Миграция: добавляем колонки для расширенных статусов, замеров, монтажей
-- Запустите этот SQL в Supabase Dashboard → SQL Editor

-- Новые поля для заказов
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_phone text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS final_sum numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS install_date date;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS install_time text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS measurement_date date;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS measurement_time text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_comment text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tag text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
