import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './Login.css';
import logoImg from '/logo.png';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect URL from location state or default to home
  const from = location.state?.from?.pathname || '/';
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);
    
    try {
      await signIn(email, password);
      // Redirect to the page they were trying to access
      navigate(from, { replace: true });
    } catch (error: any) {
      setLoginError(error.message || 'Failed to log in');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResetPassword = async () => {
    if (!email) {
      setLoginError('Please enter your email address to reset password');
      return;
    }
    
    setLoginError(null);
    setIsLoading(true);
    
    try {
      await resetPassword(email);
      alert('Password reset email sent. Check your inbox.');
    } catch (error: any) {
      setLoginError(error.message || 'Failed to send reset password email');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="login-page">
      <section className="login-hero" aria-hidden="true">
        <div className="hero-overlay">
          <img
            src={logoImg}
            alt=""
            className="hero-logo"
          />
          <p className="hero-badge">ClimateReady Command</p>
          <h1>Coordinate emergency response with confidence.</h1>
          <p className="hero-subtitle">
            Monitor SOS activations, confirm responder presence, and share critical context with your team in real time.
          </p>
          <ul className="hero-highlights">
            <li>
              <span>Live telemetry</span>
              <p>Map updates every few seconds with accuracy rings and responder notes.</p>
            </li>
            <li>
              <span>Responder ready</span>
              <p>Designed for incident command centers and verified emergency partners.</p>
            </li>
            <li>
              <span>Secure by default</span>
              <p>Only trusted operators with credentials can access this dashboard.</p>
            </li>
          </ul>
        </div>
      </section>

      <section className="login-panel" aria-label="Login form">
        <div className="panel-content">
          <header className="panel-header">
            <img
              src={logoImg}
              alt="ClimateReady logo"
              className="panel-logo"
            />
            <h2>Emergency Operations Login</h2>
            <p>Sign in with your responder credentials to open the command dashboard.</p>
          </header>

          <aside className="panel-notice" role="note">
            <strong>Emergency contact?</strong>
            <p>If you received an SOS link, tap it directly to view the live tracker — no login required.</p>
          </aside>

          {loginError && (
            <div className="login-alert" role="alert">
              {loginError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="commander@agency.gov"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="loading-hint" aria-live="polite">
              {isLoading ? 'Authenticating your credentials…' : '\u00A0'}
            </p>
          </form>

          <footer className="panel-footer">
            <button
              type="button"
              className="reset-link"
              onClick={handleResetPassword}
              disabled={isLoading}
            >
              Forgot your password?
            </button>

            <div className="support-callout">
              <h3>Need access?</h3>
              <p>
                Only vetted responders and ClimateReady partners receive credentials. Contact the regional coordinator
                if you need to onboard a new operator.
              </p>
            </div>
          </footer>
        </div>
      </section>
    </div>
   );
 };
 
 export default Login;