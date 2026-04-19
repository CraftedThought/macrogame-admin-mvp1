/* src/components/views/Login.tsx */

import React, { useState } from 'react';
import { signIn } from '../../firebase/auth';
import { styles } from '../../App.styles';
import { notifications } from '../../utils/notifications';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signIn(email, password);
      // The onAuthStateChanged listener in App.tsx will handle the redirect.
    } catch (err: any) {
      setError('Failed to sign in. Please check your credentials.');
      notifications.error('Login failed.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loginContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
  };

  const loginBoxStyle: React.CSSProperties = {
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center'
  };

  return (
    <div style={loginContainerStyle}>
      <div style={loginBoxStyle}>
        <h1 style={{ ...styles.h2, marginTop: 0 }}>Macrogame Admin Portal</h1>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            style={styles.input}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            style={styles.input}
          />
          {error && <p style={{ color: '#c0392b', margin: '0.5rem 0 0' }}>{error}</p>}
          <button type="submit" style={styles.saveButton} disabled={isLoading}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};