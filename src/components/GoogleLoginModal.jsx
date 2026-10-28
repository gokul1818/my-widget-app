import React, { useState, useEffect, useRef } from 'react';
import { parseGoogleJwt } from '../utils/googleAuth';

/**
 * Google Account OAuth Management Modal.
 * Strictly uses official Google OAuth 2.0.
 */
export function GoogleLoginModal({
  isOpen,
  onClose,
  currentUser,
  onGoogleSignIn,
  onSignOut,
}) {
  const [clientId, setClientId] = useState(() => {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('google_client_id') || '';
  });
  const [showConfig, setShowConfig] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const googleBtnContainerRef = useRef(null);

  // Initialize official Google Identity Services
  useEffect(() => {
    if (!isOpen) return;

    if (window.google?.accounts?.id && clientId && googleBtnContainerRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            setIsLoadingAuth(false);
            if (response.credential) {
              const decoded = parseGoogleJwt(response.credential);
              if (decoded) {
                onGoogleSignIn({
                  name: decoded.name,
                  email: decoded.email,
                  picture: decoded.picture,
                  sub: decoded.sub,
                  source: 'google_oauth',
                });
                onClose();
              }
            }
          },
        });

        googleBtnContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
          theme: 'filled_blue',
          size: 'large',
          width: 280,
          text: 'continue_with',
          shape: 'pill',
        });
      } catch (err) {
        console.warn('Google One Tap init error:', err);
      }
    }
  }, [isOpen, clientId, onGoogleSignIn, onClose]);

  if (!isOpen) return null;

  // Handle Google OAuth Popup trigger
  const handleLaunchGoogleOAuth = () => {
    if (!clientId) {
      setShowConfig(true);
      setError('Please configure your Google OAuth 2.0 Web Client ID below.');
      return;
    }

    setError('');
    setIsLoadingAuth(true);

    if (window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: async (tokenResponse) => {
            if (tokenResponse?.access_token) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                if (res.ok) {
                  const userInfo = await res.json();
                  setIsLoadingAuth(false);
                  onGoogleSignIn({
                    name: userInfo.name,
                    email: userInfo.email,
                    picture: userInfo.picture,
                    sub: userInfo.sub,
                    source: 'google_oauth_popup',
                  });
                  onClose();
                } else {
                  setIsLoadingAuth(false);
                  setError('Failed to fetch user profile from Google.');
                }
              } catch (err) {
                setIsLoadingAuth(false);
                setError(`Failed to fetch Google profile: ${err.message}`);
              }
            } else {
              setIsLoadingAuth(false);
            }
          },
          error_callback: (err) => {
            setIsLoadingAuth(false);
            setError(err?.message || 'Google OAuth closed.');
          },
        });

        client.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('Token client error, falling back:', err);
      }
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
      setIsLoadingAuth(false);
    } else {
      setIsLoadingAuth(false);
      setError('Google Identity Services is loading. Please try again.');
    }
  };

  const handleSaveClientId = (newId) => {
    const trimmed = newId.trim();
    setClientId(trimmed);
    if (trimmed) {
      localStorage.setItem('google_client_id', trimmed);
    } else {
      localStorage.removeItem('google_client_id');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="google-modal-title">
      <div className="modal-card google-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <svg className="google-icon-svg" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
            </svg>
            <div>
              <h2 id="google-modal-title" className="modal-title">
                {currentUser ? 'Google Account Connected' : 'Google OAuth Sign In'}
              </h2>
              <p className="modal-subtitle">Real Google Account OAuth 2.0</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {error && <div className="form-error-banner" role="alert">{error}</div>}

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
                <span className="google-profile-badge">● Google OAuth Verified</span>
                <h3 className="google-profile-name">{currentUser.name}</h3>
                <p className="google-profile-email">{currentUser.email}</p>
                {currentUser.sub && (
                  <span className="google-oauth-sub">Google ID: {currentUser.sub.slice(0, 16)}...</span>
                )}
              </div>
            </div>

            <p className="google-connected-note">
              ✅ Authenticated via Google OAuth 2.0. Status and schedule are securely synced.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleLaunchGoogleOAuth}
                disabled={isLoadingAuth}
              >
                Switch Google Account
              </button>
              <button
                type="button"
                className="btn-danger-outline"
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* Connect with Google OAuth */
          <div className="google-connect-options">
            <button
              type="button"
              className="btn-google-oauth-primary"
              onClick={handleLaunchGoogleOAuth}
              disabled={isLoadingAuth}
            >
              <svg className="google-btn-svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>{isLoadingAuth ? 'Connecting...' : 'Sign in with Google OAuth'}</span>
            </button>

            <div ref={googleBtnContainerRef} className="google-btn-slot" />

            <div className="google-oauth-section">
              <button
                type="button"
                className="btn-link-action toggle-oauth-btn"
                onClick={() => setShowConfig(!showConfig)}
              >
                ⚙️ {showConfig ? 'Hide Client ID settings' : 'Configure Google Client ID'}
              </button>

              {showConfig && (
                <div className="oauth-config-box">
                  <p className="oauth-config-desc">
                    Google OAuth 2.0 Web Client ID from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Console</a>:
                  </p>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="xxx.apps.googleusercontent.com"
                    value={clientId}
                    onChange={(e) => handleSaveClientId(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
