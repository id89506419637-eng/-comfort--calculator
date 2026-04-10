import { STATUS_LABELS, STATUS_COLORS } from '../constants.js';
import { itemsSummary } from '../utils.js';
import OrderCard from './OrderCard.jsx';

export default function OrderList({
  orders, loading,
  searchQuery, setSearchQuery,
  statusFilter, setStatusFilter,
  openDropdown, setOpenDropdown, dropdownRef,
  onStatusChange, onUpdateField, onArchive, onToggleTag, onShowHistory,
  employees, timings,
}) {
  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (o.client_name || '').toLowerCase();
      const phone = (o.client_phone || '').toLowerCase();
      const company = (o.client_company || '').toLowerCase();
      const composition = itemsSummary(o.items).toLowerCase();
      const manager = (o.manager || '').toLowerCase();
      const contractor = (o.contractor || '').toLowerCase();
      const address = (o.address || '').toLowerCase();
      const contract = (o.contract_number || '').toLowerCase();
      if (!name.includes(q) && !phone.includes(q) && !company.includes(q) && !composition.includes(q)
        && !manager.includes(q) && !contractor.includes(q) && !address.includes(q) && !contract.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="orders-panel">
      <div className="search-bar">
        <div className="search-input-wrapper">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="search-icon">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Поиск по имени, телефону, менеджеру, адресу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="status-filter">
          <button className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>Все</button>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`filter-btn ${statusFilter === key ? 'active' : ''}`}
              style={statusFilter === key ? { background: STATUS_COLORS[key]?.bg, color: STATUS_COLORS[key]?.text, borderColor: STATUS_COLORS[key]?.border } : {}}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Загрузка данных...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="#4b5563" strokeWidth="1.5"/><path d="M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6" stroke="#4b5563" strokeWidth="1.5"/></svg>
          <span>Нет заявок за выбранный период</span>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              dropdownRef={dropdownRef}
              onStatusChange={onStatusChange}
              onUpdateField={onUpdateField}
              onArchive={onArchive}
              onToggleTag={onToggleTag}
              onShowHistory={onShowHistory}
              employees={employees}
              timings={timings}
            />
          ))}
        </div>
      )}
    </div>
  );
}
