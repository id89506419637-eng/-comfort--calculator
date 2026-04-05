-- Таблица заявок
create table orders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  client_name text,
  client_company text,
  items jsonb not null,
  needs_installation boolean default false,
  needs_demolition boolean default false,
  delivery_distance integer default 0,
  total_area numeric,
  price_min integer,
  price_max integer,
  status text default 'new'
);

-- Включаем realtime
alter publication supabase_realtime add table orders;

-- Включаем RLS (защита строк)
alter table orders enable row level security;

-- Анонимные пользователи могут ТОЛЬКО создавать заявки (кнопка в калькуляторе)
create policy "Anyone can insert orders" on orders
  for insert with check (true);

-- Авторизованные пользователи могут читать все заявки (дашборд)
create policy "Authenticated users can read orders" on orders
  for select using (auth.role() = 'authenticated');

-- Авторизованные пользователи могут менять статус заявок (дашборд)
create policy "Authenticated users can update orders" on orders
  for update using (auth.role() = 'authenticated');
