import { useState, useEffect } from 'react';
import { supabase } from './supabase.js';
import useAuth from './dashboard/hooks/useAuth.js';
import useOrders from './dashboard/hooks/useOrders.js';
import useTimings from './hooks/useTimings.js';
import LoginForm from './dashboard/components/LoginForm.jsx';
import Header from './dashboard/components/Header.jsx';
import StatsRow from './dashboard/components/StatsRow.jsx';
import OrderList from './dashboard/components/OrderList.jsx';
import KanbanBoard from './dashboard/components/KanbanBoard.jsx';
import AnalyticsPanel from './dashboard/components/AnalyticsPanel.jsx';
import StatusModal from './dashboard/components/StatusModal.jsx';
import PasswordModal from './dashboard/components/PasswordModal.jsx';
import SummaryModal from './dashboard/components/SummaryModal.jsx';
import PricesPanel from './dashboard/components/PricesPanel.jsx';
import CalendarPanel from './dashboard/components/CalendarPanel.jsx';
import MapPanel from './dashboard/components/MapPanel.jsx';
import HistoryPanel from './dashboard/components/HistoryPanel.jsx';
import './Dashboard.css';

export default function Dashboard() {
  const { session, loading: authLoading, signIn, signOut, changePassword } = useAuth();

  if (authLoading) {
    return (
      <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return <LoginForm onLogin={signIn} />;
  }

  return <DashboardContent onLogout={signOut} onChangePassword={changePassword} />;
}

function DashboardContent({ onLogout, onChangePassword }) {
  const [period, setPeriod] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPrices, setShowPrices] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [historyOrderId, setHistoryOrderId] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'
  const { timings } = useTimings();

  const {
    orders, loading, employees,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    openDropdown, setOpenDropdown, dropdownRef,
    modal, setModal, modalData, setModalData,
    handleStatusChange, submitModal,
    updateOrderField,
    archiveOrder, deleteOrder, toggleTag,
  } = useOrders(period, customDate);

  /* stats — "заказ" = всё кроме new и rejected */
  const totalCount = orders.length;
  const orderItems = orders.filter((o) => o.status !== 'new' && o.status !== 'rejected');
  const rejectedCount = orders.filter((o) => o.status === 'rejected').length;
  const orderSum = orderItems.reduce((s, o) => s + (o.final_sum ? Number(o.final_sum) : (o.price_max || 0)), 0);
  const conversion = totalCount > 0 ? ((orderItems.length / totalCount) * 100).toFixed(1) : '0';
  const avgCheck = orderItems.length > 0 ? Math.round(orderSum / orderItems.length) : 0;

  /* conversion trend */
  const [prevConversion, setPrevConversion] = useState(null);
  useEffect(() => {
    const now = new Date();
    let prevStart, prevEnd;
    if (period === 'today') {
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 1);
    } else if (period === 'week') {
      prevEnd = new Date(now);
      prevEnd.setDate(prevEnd.getDate() - 7);
      prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 7);
    } else if (period === 'month') {
      prevEnd = new Date(now);
      prevEnd.setMonth(prevEnd.getMonth() - 1);
      prevStart = new Date(prevEnd);
      prevStart.setMonth(prevStart.getMonth() - 1);
    } else {
      setPrevConversion(null);
      return;
    }
    supabase.from('orders').select('status').gte('created_at', prevStart.toISOString()).lte('created_at', prevEnd.toISOString()).neq('archived', true)
      .then(({ data }) => {
        if (!data || data.length === 0) { setPrevConversion(null); return; }
        const prevOrderCount = data.filter((o) => o.status !== 'new' && o.status !== 'rejected').length;
        setPrevConversion(((prevOrderCount / data.length) * 100).toFixed(1));
      });
  }, [period, orders.length]);

  const conversionDiff = prevConversion !== null ? (parseFloat(conversion) - parseFloat(prevConversion)).toFixed(1) : null;

  // Найти заказ для HistoryPanel
  const historyOrder = historyOrderId ? orders.find(o => o.id === historyOrderId) : null;

  if (showPrices) {
    return <PricesPanel onBack={() => setShowPrices(false)} />;
  }

  if (showCalendar) {
    return (
      <div className="dashboard">
        <CalendarPanel orders={orders} onBack={() => setShowCalendar(false)} />
      </div>
    );
  }

  if (showMap) {
    return (
      <div className="dashboard">
        <MapPanel orders={orders} onBack={() => setShowMap(false)} />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header
        orders={orders}
        period={period}
        setPeriod={setPeriod}
        customDate={customDate}
        setCustomDate={setCustomDate}
        onShowSummary={() => setShowSummary(true)}
        onShowPrices={() => setShowPrices(true)}
        onShowCalendar={() => setShowCalendar(true)}
        onShowMap={() => setShowMap(true)}
        onShowPassword={() => setShowPassword(true)}
        onLogout={onLogout}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <StatsRow
        totalCount={totalCount}
        orderCount={orderItems.length}
        rejectedCount={rejectedCount}
        orderSum={orderSum}
        conversion={conversion}
        conversionDiff={conversionDiff}
        avgCheck={avgCheck}
      />

      <div className={`dashboard-main ${viewMode === 'kanban' ? 'view-kanban' : 'view-list'}`}>
        {viewMode === 'list' ? (
          <OrderList
            orders={orders}
            loading={loading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            dropdownRef={dropdownRef}
            onStatusChange={handleStatusChange}
            onUpdateField={updateOrderField}
            onArchive={archiveOrder}
            onDelete={deleteOrder}
            onToggleTag={toggleTag}
            onShowHistory={(id) => setHistoryOrderId(id)}
            employees={employees}
            timings={timings}
          />
        ) : (
          <KanbanBoard
            orders={orders}
            onStatusChange={handleStatusChange}
            onArchive={archiveOrder}
            onToggleTag={toggleTag}
            employees={employees}
            timings={timings}
          />
        )}

        {viewMode === 'list' && <AnalyticsPanel orders={orders} />}
      </div>

      <StatusModal
        modal={modal}
        modalData={modalData}
        setModalData={setModalData}
        employees={employees}
        onSubmit={submitModal}
        onClose={() => setModal(null)}
      />

      {historyOrderId && (
        <HistoryPanel
          orderId={historyOrderId}
          clientName={historyOrder?.client_name}
          onClose={() => setHistoryOrderId(null)}
        />
      )}

      {showPassword && (
        <PasswordModal
          onChangePassword={onChangePassword}
          onClose={() => setShowPassword(false)}
        />
      )}

      {showSummary && (
        <SummaryModal
          orders={orders}
          period={period}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  );
}
