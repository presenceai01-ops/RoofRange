import { useState } from 'react';
import { ADMIN_PASSWORD, ADMIN_SESSION_KEY } from '../admin-config';

interface AdminLoginProps {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'authenticated');
      onLogin();
    } else {
      setError('Invalid password');
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <span className="admin-login-icon">🔧</span>
          <h1>RoofRange Admin</h1>
          <p>Enter your password to access the admin panel.</p>
        </div>
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Enter admin password"
              autoFocus
            />
            {error && <span className="error-text">{error}</span>}
          </div>
          <button type="submit" className="btn-primary" disabled={!password}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}