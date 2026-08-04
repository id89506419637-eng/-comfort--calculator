import { useState } from 'react';

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const err = await onLogin(email, password);
    if (err) setError('Неверный логин или пароль');
  };

  return (
    <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <form onSubmit={handleSubmit} className="login-form">
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', color: '#e5e7eb' }}>Комфорт+</h2>
        <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>Войдите для доступа к заявкам</p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="login-input"
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="login-input"
        />
        {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>{error}</p>}
        <button type="submit" className="login-btn">Войти</button>
      </form>
    </div>
  );
}
