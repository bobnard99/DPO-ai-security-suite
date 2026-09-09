import AuditDashboard from './components/AuditDashboard.jsx';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';
import { useState } from 'react';
import './App.css';

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('dpoSession') || 'null');
    } catch {
      return null;
    }
  });
  const [authMode, setAuthMode] = useState('login');

  const handleAuthenticated = (data) => {
    const nextSession = { user: data.user || data };
    sessionStorage.setItem('dpoSession', JSON.stringify(nextSession));
    localStorage.removeItem('dpoSession');
    setSession(nextSession);
  };

  const handleSignOut = () => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    sessionStorage.removeItem('dpoSession');
    localStorage.removeItem('dpoSession');
    setSession(null);
    setAuthMode('login');
  };

  if (session?.user || session?.token) {
    return <AuditDashboard user={session.user || session} token={session.token} onSignOut={handleSignOut} />;
  }

  return (
    <main className="auth-shell matrix-auth-shell">
      <div className="auth-brand"><span className="brand-mark">+</span><span>DPO AI <em>Suite</em></span></div>
      <div className="auth-layout">
        <div className="auth-intro"><p className="matrix-kicker">DPO AI SECURITY SUITE</p><h2>Compliance intelligence for a <span>safer</span> digital world.</h2><p>Analyze policy, surface risk, and move from uncertainty to action with a privacy-first workspace.</p><div className="system-readout"><i /> SYSTEM OPERATIONAL <span>v1.0 / RWANDA</span></div></div>
        {authMode === 'login' ? <Login onAuthenticated={handleAuthenticated} onSwitchToSignup={() => setAuthMode('signup')} /> : <Signup onAuthenticated={handleAuthenticated} onSwitchToLogin={() => setAuthMode('login')} />}
      </div>
    </main>
  );
}
