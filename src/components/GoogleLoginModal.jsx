import React, { useState, useEffect, useRef } from 'react';
import { parseGoogleJwt } from '../utils/googleAuth';

export function GoogleLoginModal({
  isOpen,
  onClose,
  currentUser,
  onGoogleSignIn,
  onSignOut,
}) {
  const [quickName, setQuickName] = useState(currentUser?.name || 'Gokulakrishnan');
  const [quickEmail, setQuickEmail] = useState(currentUser?.email || 'gokulakrishnan@gmail.com');
  const [clientId, setClientId] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [error, setError] = useState('');
  const googleBtnContainerRef = useRef(null);

  // Initialize official Google Identity Services if client ID is set and window.google is ready
  useEffect(() => {
    if (!isOpen) return;

    if (window.google && clientId && googleBtnContainerRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              const decoded = parseGoogleJwt(response.credential);
              if (decoded) {
                onGoogleSignIn({
                  name: decoded.name,
                  email: decoded.email,
                  picture: decoded.picture,
                  sub: decoded.sub,
                  source: 'google-oauth',
                });
                onClose();
              }
            }
          },
        });

        window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'signin_with',
          shape: 'pill',
        });
      } catch (err) {
        console.warn('Google One Tap init error:', err);
      }
    }
  }, [isOpen, clientId, onGoogleSignIn, onClose]);

  if (!isOpen) return null;

  // Handle Quick Connect with Gmail
  const handleQuickConnect = (e) => {
    e.preventDefault();
    const trimmedName = quickName.trim();
    const trimmedEmail = quickEmail.trim().toLowerCase();

    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid Gmail / Google Workspace address');
      return;
    }

    const mockProfile = {
      name: trimmedName,
      email: trimmedEmail,
      picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trimmedName)}&backgroundColor=10b981,3b82f6,8b5cf6`,
      sub: `gmail_${trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      source: 'gmail-connected',
    };

    onGoogleSignIn(mockProfile);
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="google-modal-title">
      <div className="modal-card google-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <svg className="google-icon-svg" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <div>
              <h2 id="google-modal-title" className="modal-title">
                {currentUser ? 'Google Account Connected' : 'Connect with Gmail'}
              </h2>
              <p className="modal-subtitle">Sync your profile & attendance status</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {error && <div className="form-error-banner">{error}</div>}

        {/* If Already Connected */}
        {currentUser ? (
          <div className="google-connected-view">
            <div className="google-profile-card">
              {currentUser.picture ? (
                <img
                  src={currentUser.picture}
                  alt={currentUser.name}
                  className="google-profile-pic"
                />
              ) : (
                <div className="google-avatar-fallback">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : 'G'}
                </div>
              )}
              <div className="google-profile-details">
                <span className="google-profile-badge">● Active Account</span>
                <h3 className="google-profile-name">{currentUser.name}</h3>
                <p className="google-profile-email">{currentUser.email}</p>
              </div>
            </div>

            <p className="google-connected-note">
              ✅ Your status for tomorrow is linked to your Google profile and synced with the office roster.
            </p>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Keep Connected
              </button>
              <button
                type="button"
                className="btn-danger-outline"
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
              >
                Disconnect Gmail
              </button>
            </div>
          </div>
        ) : (
          /* Connect Options */
          <div className="google-connect-options">
            {/* Quick Gmail Sign-In Form */}
            <form onSubmit={handleQuickConnect} className="modal-form">
              <div className="form-group">
                <label htmlFor="quick-google-email" className="form-label">
                  Your Gmail / Google Workspace Address
                </label>
                <div className="input-with-icon">
                  <span className="input-prefix-icon">✉️</span>
                  <input
                    id="quick-google-email"
                    type="email"
                    className="form-input"
                    placeholder="you@gmail.com"
                    value={quickEmail}
                    onChange={(e) => {
                      setQuickEmail(e.target.value);
                      if (error) setError('');
                    }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="quick-google-name" className="form-label">
                  Display Name
                </label>
                <input
                  id="quick-google-name"
                  type="text"
                  className="form-input"
                  placeholder="Your Name"
                  value={quickName}
                  onChange={(e) => {
                    setQuickName(e.target.value);
                    if (error) setError('');
                  }}
                  required
                />
              </div>

              <button type="submit" className="btn-google-primary">
                <svg className="google-btn-svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Connect with Gmail</span>
              </button>
            </form>

            {/* Official Google OAuth Container (if Client ID configured) */}
            <div className="google-oauth-section">
              <button
                type="button"
                className="btn-link-action toggle-oauth-btn"
                onClick={() => setShowConfig(!showConfig)}
              >
                ⚙️ {showConfig ? 'Hide Google OAuth Client ID setup' : 'Use Google Cloud OAuth Client ID'}
              </button>

              {showConfig && (
                <div className="oauth-config-box">
                  <p className="oauth-config-desc">
                    If you have a Google Cloud OAuth 2.0 Client ID (e.g. <code>xxx.apps.googleusercontent.com</code>), enter it below:
                  </p>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter Google Client ID"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value.trim())}
                  />
                  <div ref={googleBtnContainerRef} className="google-btn-slot" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
