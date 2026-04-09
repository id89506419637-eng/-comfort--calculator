import { REJECTION_REASONS, STATUS_LABELS } from '../constants.js';

export default function StatusModal({ modal, modalData, setModalData, onSubmit, onClose }) {
  if (!modal) return null;

  if (modal.type === 'rejected') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="modal-title">Причина отказа</h3>
          <div className="modal-field">
            <label>Причина</label>
            <div className="reason-buttons">
              {REJECTION_REASONS.map((r) => (
                <button
                  key={r}
                  className={`reason-btn ${modalData.rejection_reason === r ? 'active' : ''}`}
                  onClick={() => setModalData({ ...modalData, rejection_reason: r })}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="modal-field">
            <label>Комментарий</label>
            <textarea
              placeholder="Доп. информация"
              value={modalData.comment || ''}
              onChange={(e) => setModalData({ ...modalData, comment: e.target.value })}
              rows={2}
            />
          </div>
          <div className="modal-buttons">
            <button className="modal-btn-cancel" onClick={onClose}>Отмена</button>
            <button className="modal-btn-reject" onClick={onSubmit}>Отказ</button>
          </div>
        </div>
      </div>
    );
  }

  if (modal.type === 'in_work') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="modal-title">Взять в работу</h3>
          <div className="modal-field">
            <label>Итоговая сумма (₽)</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Точная сумма заказа"
              value={modalData.final_sum || ''}
              onChange={(e) => setModalData({ ...modalData, final_sum: e.target.value })}
            />
          </div>
          <div className="modal-field">
            <label>Адрес объекта</label>
            <input
              type="text"
              placeholder="Город, улица, дом, кв."
              value={modalData.address || ''}
              onChange={(e) => setModalData({ ...modalData, address: e.target.value })}
            />
          </div>
          <div className="modal-field">
            <label>Комментарий</label>
            <textarea
              placeholder="Доп. информация по заказу"
              value={modalData.comment || ''}
              onChange={(e) => setModalData({ ...modalData, comment: e.target.value })}
              rows={2}
            />
          </div>
          <div className="modal-buttons">
            <button className="modal-btn-cancel" onClick={onClose}>Отмена</button>
            <button className="modal-btn-confirm" onClick={onSubmit}>В работу</button>
          </div>
        </div>
      </div>
    );
  }

  if (modal.type === 'measurement_scheduled') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="modal-title">Назначить замер</h3>
          <div className="modal-field">
            <label>Дата замера</label>
            <input
              type="date"
              value={modalData.measurement_date || ''}
              onChange={(e) => setModalData({ ...modalData, measurement_date: e.target.value })}
            />
          </div>
          <div className="modal-field">
            <label>Время</label>
            <input
              type="time"
              value={modalData.measurement_time || ''}
              onChange={(e) => setModalData({ ...modalData, measurement_time: e.target.value })}
            />
          </div>
          <div className="modal-field">
            <label>Адрес объекта</label>
            <input
              type="text"
              placeholder="Город, улица, дом, кв."
              value={modalData.address || ''}
              onChange={(e) => setModalData({ ...modalData, address: e.target.value })}
            />
          </div>
          <div className="modal-field">
            <label>Комментарий</label>
            <textarea
              placeholder="Контакт, примечания (необязательно)"
              value={modalData.comment || ''}
              onChange={(e) => setModalData({ ...modalData, comment: e.target.value })}
              rows={2}
            />
          </div>
          <div className="modal-buttons">
            <button className="modal-btn-cancel" onClick={onClose}>Отмена</button>
            <button className="modal-btn-confirm" onClick={onSubmit}>Назначить</button>
          </div>
        </div>
      </div>
    );
  }

  if (modal.type === 'install_scheduled') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="modal-title">Назначить монтаж</h3>
          <div className="modal-field">
            <label>Дата монтажа</label>
            <input
              type="date"
              value={modalData.install_date || ''}
              onChange={(e) => setModalData({ ...modalData, install_date: e.target.value })}
            />
          </div>
          <div className="modal-field">
            <label>Время</label>
            <input
              type="time"
              value={modalData.install_time || ''}
              onChange={(e) => setModalData({ ...modalData, install_time: e.target.value })}
            />
          </div>
          <div className="modal-field">
            <label>Комментарий</label>
            <textarea
              placeholder="Бригада, примечания"
              value={modalData.comment || ''}
              onChange={(e) => setModalData({ ...modalData, comment: e.target.value })}
              rows={2}
            />
          </div>
          <div className="modal-buttons">
            <button className="modal-btn-cancel" onClick={onClose}>Отмена</button>
            <button className="modal-btn-confirm" onClick={onSubmit}>Назначить</button>
          </div>
        </div>
      </div>
    );
  }

  // Простое подтверждение для остальных переходов
  const targetLabel = STATUS_LABELS[modal.type] || modal.type;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Сменить статус → {targetLabel}</h3>
        <div className="modal-field">
          <label>Комментарий</label>
          <textarea
            placeholder="Доп. информация (необязательно)"
            value={modalData.comment || ''}
            onChange={(e) => setModalData({ ...modalData, comment: e.target.value })}
            rows={2}
          />
        </div>
        <div className="modal-buttons">
          <button className="modal-btn-cancel" onClick={onClose}>Отмена</button>
          <button className="modal-btn-confirm" onClick={onSubmit}>Подтвердить</button>
        </div>
      </div>
    </div>
  );
}
