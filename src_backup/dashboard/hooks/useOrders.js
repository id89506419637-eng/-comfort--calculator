import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabase.js';
import { getDateRange } from '../utils.js';
import { STATUS_TRANSITIONS } from '../constants.js';

export default function useOrders(period, customDate) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState({});
  const dropdownRef = useRef(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    let query = supabase.from('orders').select('*').neq('archived', true).order('created_at', { ascending: false });
    const { start, end } = getDateRange(period, customDate);
    if (start) query = query.gte('created_at', start);
    if (end) query = query.lte('created_at', end);
    const { data, error } = await query;
    if (error) {
      console.error('Ошибка загрузки данных');
      if (!silent) setOrders([]);
    } else {
      setOrders(data || []);
    }
    if (!silent) setLoading(false);
  }, [period, customDate]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const interval = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleStatusChange = (id, newStatus) => {
    setOpenDropdown(null);
    const existing = orders.find((o) => o.id === id);

    if (newStatus === 'rejected') {
      setModalData({
        rejection_reason: existing?.rejection_reason || '',
        comment: existing?.order_comment || '',
      });
      setModal({ type: 'rejected', orderId: id });
    } else if (newStatus === 'in_work') {
      setModalData({
        final_sum: existing?.final_sum || '',
        address: existing?.address || '',
        comment: '',
      });
      setModal({ type: 'in_work', orderId: id });
    } else if (newStatus === 'measurement_scheduled') {
      setModalData({
        measurement_date: existing?.measurement_date || '',
        measurement_time: existing?.measurement_time || '',
        address: existing?.address || '',
        comment: existing?.order_comment || '',
      });
      setModal({ type: 'measurement_scheduled', orderId: id });
    } else if (newStatus === 'install_scheduled') {
      setModalData({
        install_date: existing?.install_date || '',
        install_time: existing?.install_time || '',
        comment: existing?.order_comment || '',
      });
      setModal({ type: 'install_scheduled', orderId: id });
    } else {
      // Простые переходы — без модалки, сразу обновляем
      updateStatus(id, newStatus);
    }
  };

  const updateStatus = async (id, newStatus, extraData = {}) => {
    const { error } = await supabase.from('orders').update({ status: newStatus, ...extraData }).eq('id', id);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus, ...extraData } : o)));
    }
    setModal(null);
    setModalData({});
  };

  const submitModal = () => {
    if (!modal) return;
    const { type, orderId } = modal;

    if (type === 'rejected') {
      if (!modalData.rejection_reason) {
        alert('Выберите причину отказа');
        return;
      }
      updateStatus(orderId, 'rejected', {
        rejection_reason: modalData.rejection_reason || null,
        order_comment: modalData.comment || null,
      });
    } else if (type === 'in_work') {
      updateStatus(orderId, 'in_work', {
        final_sum: modalData.final_sum ? Number(modalData.final_sum) : null,
        address: modalData.address || null,
        order_comment: modalData.comment || null,
      });
    } else if (type === 'measurement_scheduled') {
      if (!modalData.measurement_date) {
        alert('Укажите дату замера');
        return;
      }
      updateStatus(orderId, 'measurement_scheduled', {
        measurement_date: modalData.measurement_date || null,
        measurement_time: modalData.measurement_time || null,
        address: modalData.address || null,
        order_comment: modalData.comment || null,
      });
    } else if (type === 'install_scheduled') {
      if (!modalData.install_date) {
        alert('Укажите дату монтажа');
        return;
      }
      updateStatus(orderId, 'install_scheduled', {
        install_date: modalData.install_date || null,
        install_time: modalData.install_time || null,
        order_comment: modalData.comment || null,
      });
    } else {
      // Простые переходы
      updateStatus(orderId, type, {
        order_comment: modalData.comment || null,
      });
    }
  };

  const archiveOrder = async (id) => {
    if (!window.confirm('Архивировать эту заявку?')) return;
    const { error } = await supabase.from('orders').update({ archived: true }).eq('id', id);
    if (!error) {
      setOrders((prev) => prev.filter((o) => o.id !== id));
    }
  };

  const toggleTag = async (id, tagKey) => {
    const order = orders.find((o) => o.id === id);
    const current = (order?.tag || '').split(',').filter(Boolean);
    const updated = current.includes(tagKey)
      ? current.filter((t) => t !== tagKey)
      : [...current, tagKey];
    const newTag = updated.join(',') || null;
    const { error } = await supabase.from('orders').update({ tag: newTag }).eq('id', id);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, tag: newTag } : o)));
    }
  };

  return {
    orders, loading,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    openDropdown, setOpenDropdown, dropdownRef,
    modal, setModal, modalData, setModalData,
    handleStatusChange, submitModal,
    archiveOrder, toggleTag,
  };
}
