# Чеклист безопасности — Комфорт+ дашборд

## Таблица prices
- [x] RLS включён
- [x] SELECT — публичный (калькулятор работает без авторизации)
- [x] INSERT/UPDATE — только authenticated
- [x] DELETE — запрещён (нет политики = блокировка при RLS)
- [x] Fallback на дефолтные значения если Supabase недоступен

## Таблица timings
- [x] RLS включён
- [x] SELECT — только authenticated (данные только для менеджеров)
- [x] INSERT/UPDATE — только authenticated
- [x] DELETE — запрещён
- [x] Fallback на дефолтные значения

## Таблица orders (существующая)
- [ ] Проверить что RLS включён
- [ ] SELECT/UPDATE — только authenticated (дашборд)
- [ ] INSERT — публичный (калькулятор на сайте)
- [ ] DELETE — запрещён (используем archived флаг)

## Общее
- [x] Supabase ключи через env-переменные (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [x] Пароль меняется только для текущего пользователя (supabase.auth.updateUser)
- [ ] Убедиться что SUPABASE_SERVICE_ROLE_KEY нигде не используется в клиентском коде
- [ ] На проде включить HTTPS
