import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Login({ onAuthenticated, onSwitchToSignup }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.email.trim() || !form.password) {
      setError('Enter your email and password to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), password: form.password })
      });
      const data = await response.json();
      if (!response.ok || !data.user) throw new Error(data.error || 'Unable to sign in.');
      onAuthenticated(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in. Check that the backend is running.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-card matrix-card">
      <div className="auth-card-header"><span className="matrix-kicker">SECURE ACCESS / 01</span><span className="auth-status"><i /> API READY</span></div>
      <h1>Welcome back<span>.</span></h1>
      <p className="auth-copy">Access your privacy intelligence workspace.</p>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="login-email">Work email</label>
        <input id="login-email" name="email" type="email" autoComplete="email" value={form.email} onChange={updateField} placeholder="you@company.com" required />
        <label htmlFor="login-password">Password</label>
        <div className="password-field"><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={updateField} placeholder="Enter your password" required /><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18" /><path d="M9.88 5.18A10.7 10.7 0 0112 5c4.97 0 9 3.2 10 7-1.1 2.41-2.88 4.39-5.08 5.66" /><path d="M6.08 6.08A15.5 15.5 0 002 12c1.1 2.41 2.88 4.39 5.08 5.66A12.9 12.9 0 0012 19c1.73 0 3.39-.29 4.89-.81" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>}</button></div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="matrix-submit" type="submit" disabled={submitting}>{submitting ? 'AUTHENTICATING...' : 'SIGN IN'}<span aria-hidden="true">&#8594;</span></button>
      </form>
      <p className="auth-switch-text">New to the workspace? <button type="button" onClick={onSwitchToSignup}>Create an account</button></p>
    </section>
  );
}
