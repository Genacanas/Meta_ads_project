import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, User, Loader2, ChevronsRight } from 'lucide-react';
import './Login.css';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const API_URL = import.meta.env.VITE_1688_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      login(data.access_token);
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background Animated Gradients */}
      <div className="bg-gradient-1" />
      <div className="bg-gradient-2" />

      {/* Login Card (Glassmorphism) */}
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon-container">
            <Activity />
          </div>
          <h2 className="login-title">NicheBreaker</h2>
          <p className="login-subtitle">Secure admin portal & analytics</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <div className="input-icon">
                <User />
              </div>
              <input
                id="username"
                type="text"
                required
                className="login-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <div className="input-icon">
                <Lock />
              </div>
              <input
                id="password"
                type="password"
                required
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
          >
            {loading ? (
              <>
                <Loader2 className="loader-icon" />
                Authenticating...
              </>
            ) : (
              <>
                Sign in to Dashboard
                <ChevronsRight className="submit-icon" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
