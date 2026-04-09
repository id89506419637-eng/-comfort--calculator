import { useState } from 'react';

export default function PasswordModal({ onChangePassword, onClose }) {
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      setMessage('Пароль должен быть минимум 6 символов');
      return;
    }
    const error = await onChangePassword(newPassword);
    if (error) {
      setMessage('Ошибка смены пароля. Попробуйте ещё раз.');
    } else {
      setMessage('Пароль успешно изменён!');
      setNewPassword('');
      setTimeout(() => onClose(), 1500);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Сменить пароль</h3>
        <div className="modal-field">
          <label>Новый пароль (минимум 6 символов)</label>
          <input
            type="password"
            placeholder="Введите новый пароль"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        {message && (
          <p style={{ fontSize: '13px', margin: '0 0 12px', color: message.includes('успешно') ? '#22c55e' : '#ef4444' }}>{message}</p>
        )}
        <div className="modal-buttons">
          <button className="modal-btn-cancel" onClick={onClose}>Отмена</button>
          <button className="modal-btn-confirm" onClick={handleSubmit}>Сменить</button>
        </div>
      </div>
    </div>
  );
}
