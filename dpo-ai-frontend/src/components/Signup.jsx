import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Signup({ onAuthenticated, onSwitchToLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.name.trim() || !form.companyName.trim() || !form.email.trim() || form.password.length < 6) {
      setError('Complete every field. Passwords must contain at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, name: form.name.trim(), companyName: form.companyName.trim(), email: form.email.trim() })
      });
      const data = await response.json();
      if (!response.ok || !data.user) throw new Error(data.error || 'Unable to create your account.');
      onAuthenticated(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to create your account. Check that the backend is running.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-card matrix-card">
      <div className="auth-card-header"><span className="matrix-kicker">WORKSPACE SETUP / 02</span><span className="auth-status"><i /> ENCRYPTED</span></div>
      <h1>Build your workspace<span>.</span></h1>
      <p className="auth-copy">Create a secure home for your compliance reviews.</p>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="signup-name">Full name</label><input id="signup-name" name="name" autoComplete="name" value={form.name} onChange={updateField} placeholder="Your name" required />
        <label htmlFor="signup-company">Company name</label><input id="signup-company" name="companyName" autoComplete="organization" value={form.companyName} onChange={updateField} placeholder="Your organization" required />
        <label htmlFor="signup-email">Work email</label><input id="signup-email" name="email" type="email" autoComplete="email" value={form.email} onChange={updateField} placeholder="you@company.com" required />
        <label htmlFor="signup-password">Password</label><div className="password-field"><input id="signup-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength="6" value={form.password} onChange={updateField} placeholder="Minimum 6 characters" required /><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18" /><path d="M9.88 5.18A10.7 10.7 0 0112 5c4.97 0 9 3.2 10 7-1.1 2.41-2.88 4.39-5.08 5.66" /><path d="M6.08 6.08A15.5 15.5 0 002 12c1.1 2.41 2.88 4.39 5.08 5.66A12.9 12.9 0 0012 19c1.73 0 3.39-.29 4.89-.81" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>}</button></div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="matrix-submit" type="submit" disabled={submitting}>{submitting ? 'CREATING...' : 'CREATE WORKSPACE'}<span aria-hidden="true">&#8594;</span></button>
      </form>
      <p className="auth-switch-text">Already registered? <button type="button" onClick={onSwitchToLogin}>Sign in instead</button></p>
    </section>
  );
}
