export const STATUS_LABELS = {
  'new': 'Новая',
  'in_work': 'В работе',
  'measurement_scheduled': 'Замер назначен',
  'measurement_done': 'Замер выполнен',
  'approval': 'Согласование',
  'production': 'Производство',
  'install_scheduled': 'Монтаж назначен',
  'install_done': 'Монтаж выполнен',
  'completed': 'Завершён',
  'rejected': 'Отказ',
};

export const STATUS_COLORS = {
  'new': { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: 'rgba(234, 179, 8, 0.3)' },
  'in_work': { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
  'measurement_scheduled': { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' },
  'measurement_done': { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' },
  'approval': { bg: 'rgba(249, 115, 22, 0.15)', text: '#f97316', border: 'rgba(249, 115, 22, 0.3)' },
  'production': { bg: 'rgba(251, 146, 60, 0.15)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.3)' },
  'install_scheduled': { bg: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4', border: 'rgba(6, 182, 212, 0.3)' },
  'install_done': { bg: 'rgba(20, 184, 166, 0.15)', text: '#14b8a6', border: 'rgba(20, 184, 166, 0.3)' },
  'completed': { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
  'rejected': { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
};

// Порядок статусов в воронке (без rejected — он особый)
export const STATUS_ORDER = ['new', 'measurement_scheduled', 'measurement_done', 'approval', 'production', 'install_scheduled', 'install_done', 'completed'];

// Какие переходы допустимы из каждого статуса
export const STATUS_TRANSITIONS = {
  'new': ['measurement_scheduled', 'approval', 'rejected'],
  'in_work': ['measurement_scheduled', 'approval', 'rejected'],
  'measurement_scheduled': ['measurement_done', 'rejected'],
  'measurement_done': ['approval', 'rejected'],
  'approval': ['production', 'rejected'],
  'production': ['install_scheduled', 'rejected'],
  'install_scheduled': ['install_done', 'rejected'],
  'install_done': ['completed', 'rejected'],
  'completed': [],
  'rejected': ['new'],
};

export const PRODUCT_LABELS = {
  'window': 'Окно',
  'door': 'Дверь',
  'partition': 'Перегородка',
  'sliding-balcony': 'Разд. лоджия',
};

export const PROFILE_LABELS = {
  'cold-alu': 'Хол. алюминий',
  'warm-alu': 'Тёпл. алюминий',
  'pvc': 'ПВХ',
};

export const PERIOD_OPTIONS = [
  { key: 'today', label: 'Сегодня' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'all', label: 'Всё время' },
  { key: 'custom', label: 'Дата' },
];

export const REJECTION_REASONS = [
  'Дорого',
  'Передумал',
  'Выбрал конкурента',
  'Не дозвонились',
  'Не устроили сроки',
  'Другое',
];

export const ORDER_TAGS = [
  { key: 'hot', label: 'Горячий', color: '#ef4444' },
  { key: 'callback', label: 'Перезвонить', color: '#eab308' },
  { key: 'measurement', label: 'Ожидает замера', color: '#3b82f6' },
  { key: 'vip', label: 'VIP', color: '#8b5cf6' },
];

export const PAYMENT_STATUS = {
  'not_paid': { label: 'Не оплачен', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  'partial': { label: 'Частично', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' },
  'paid': { label: 'Оплачен', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
};

export const DELIVERY_TYPES = {
  'pickup': { label: 'Самовывоз', icon: '📦' },
  'delivery': { label: 'Доставка', icon: '🚚' },
  'install': { label: 'Монтаж', icon: '🔧' },
};

export const EMPLOYEE_ROLES = {
  'manager': 'Менеджер',
  'measurer': 'Замерщик',
  'installer': 'Монтажник',
  'admin': 'Администратор',
};

export const ACTION_LABELS = {
  'status_change': 'Смена статуса',
  'field_update': 'Обновление',
  'comment': 'Комментарий',
  'payment': 'Оплата',
};

export const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#eab308', '#ef4444', '#ec4899', '#06b6d4'];
