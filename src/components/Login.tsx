import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './Login.css';

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
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img 
            src="/logo.png" 
            alt="ClimateReady Logo" 
            className="login-logo" 
          />
          <h2>SOS Tracker Login</h2>
          <p>Sign in to view and track emergency SOS locations</p>
        </div>
        
        {loginError && (
          <div className="login-error">
            {loginError}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button 
                type="button" 
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="login-button" 
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="login-footer">
          <button 
            type="button"
            className="forgot-password-link"
            onClick={handleResetPassword}
            disabled={isLoading}
          >
            Forgot your password?
          </button>
          
          <p className="info-text">
            This login is for emergency responders only. If you received an SOS link, use the direct access code provided.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;