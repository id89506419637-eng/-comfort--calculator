-- =============================================
-- Миграция: расширенные статусы + новые поля
-- Проект: Комфорт+ калькулятор
-- =============================================

-- 1. Добавляем новые колонки для замера
ALTER TABLE orders ADD COLUMN IF NOT EXISTS measurement_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS measurement_time TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS install_time TEXT;

-- 2. Обновляем существующие заказы:
-- старый статус 'order' → 'in_work' (они уже приняты в работу)
UPDATE orders SET status = 'in_work' WHERE status = 'order';

-- 3. Комментарий: допустимые статусы теперь:
-- new, in_work, measurement_scheduled, measurement_done,
-- approval, install_scheduled, install_done, completed, rejected
