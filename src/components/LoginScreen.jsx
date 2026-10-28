import React, { useState, useEffect, useRef } from 'react';
import { parseGoogleJwt } from '../utils/googleAuth';

const DEFAULT_CLIENT_ID = '748746059087-2g60dgqmh7fdiaic5qo0sej1pv0i3mjb.apps.googleusercontent.com';

/**
 * Dedicated Google OAuth Login Screen.
 * Strictly authenticates via real Google Account OAuth 2.0.
 */
export function LoginScreen({ onGoogleSignIn }) {
  const [clientId, setClientId] = useState(() => {
    return (
      localStorage.getItem('google_client_id') ||
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      DEFAULT_CLIENT_ID
    );
  });
  const [tempClientId, setTempClientId] = useState(clientId);
  const [isEditingClientId, setIsEditingClientId] = useState(false);
  const [error, setError] = useState('');
  const [isGsiReady, setIsGsiReady] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const googleBtnSlotRef = useRef(null);

  // Poll / Check for window.google library readiness
  useEffect(() => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.google?.accounts?.id || window.google?.accounts?.oauth2) {
        setIsGsiReady(true);
        clearInterval(interval);
      } else if (attempts > 30) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Initialize official Google Identity Services button & callback
  useEffect(() => {
    if (!window.google?.accounts?.id || !clientId || !googleBtnSlotRef.current) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          setIsLoadingAuth(false);
          if (response?.credential) {
            const decoded = parseGoogleJwt(response.credential);
            if (decoded) {
              onGoogleSignIn({
                name: decoded.name || 'Google User',
                email: decoded.email,
                picture: decoded.picture || null,
                sub: decoded.sub,
                source: 'google_oauth_identity_services',
              });
            } else {
              setError('Failed to decode Google OAuth credential token.');
            }
          }
        },
      });

      googleBtnSlotRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnSlotRef.current, {
        theme: 'filled_blue',
        size: 'large',
        width: 300,
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left',
      });

      // Also trigger One Tap prompt automatically if available
      try {
        window.google.accounts.id.prompt();
      } catch {
        // One tap prompt is optional
      }
    } catch (err) {
      console.warn('Google Identity Services init error:', err);
      setError(`Google OAuth initialization warning: ${err.message}`);
    }
  }, [clientId, isGsiReady, onGoogleSignIn]);

  // Handle Google OAuth Popup trigger (Token Client flow)
  const handleGoogleOAuthPopup = () => {
    if (!clientId) {
      setIsEditingClientId(true);
      setError('Please provide your Google OAuth 2.0 Web Client ID to continue.');
      return;
    }

    setError('');
    setIsLoadingAuth(true);

    if (window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: async (tokenResponse) => {
            if (tokenResponse?.error) {
              setIsLoadingAuth(false);
              setError(`Google OAuth error: ${tokenResponse.error}`);
              return;
            }

            if (tokenResponse?.access_token) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });

                if (res.ok) {
                  const userInfo = await res.json();
                  setIsLoadingAuth(false);
                  onGoogleSignIn({
                    name: userInfo.name || 'Google User',
                    email: userInfo.email,
                    picture: userInfo.picture || null,
                    sub: userInfo.sub,
                    source: 'google_oauth_token_client',
                  });
                } else {
                  setIsLoadingAuth(false);
                  setError('Failed to retrieve user profile from Google OAuth.');
                }
              } catch (fetchErr) {
                setIsLoadingAuth(false);
                setError(`Failed to fetch Google profile: ${fetchErr.message}`);
              }
            } else {
              setIsLoadingAuth(false);
            }
          },
          error_callback: (err) => {
            setIsLoadingAuth(false);
            setError(err?.message || 'Google OAuth window closed or cancelled.');
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('OAuth token client error, falling back to One-Tap:', err);
      }
    }

    // Fallback: One-tap prompt
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
      setIsLoadingAuth(false);
    } else {
      setIsLoadingAuth(false);
      setError('Google Identity Services script is still loading. Please wait a moment.');
    }
  };

  // Save Client ID
  const handleSaveClientId = (e) => {
    e.preventDefault();
    const cleanId = tempClientId.trim();
    if (!cleanId) {
      setError('Please enter a valid Google OAuth Client ID');
      return;
    }
    setClientId(cleanId);
    localStorage.setItem('google_client_id', cleanId);
    setIsEditingClientId(false);
    setError('');
  };

  // Upload & auto-extract Client ID from downloaded Google Cloud credentials JSON
  const handleJsonFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const extractedId =
          parsed?.web?.client_id ||
          parsed?.installed?.client_id ||
          parsed?.client_id;

        if (extractedId) {
          setClientId(extractedId);
          setTempClientId(extractedId);
          localStorage.setItem('google_client_id', extractedId);
          setIsEditingClientId(false);
          setError('');
        } else {
          setError('Could not find client_id in the uploaded JSON. Ensure it is from Google Cloud Console.');
        }
      } catch (err) {
        setError(`Invalid JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper oauth-focused-card">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-logo-badge">🏢 OFFICE ROSTER</div>
          <h1 className="login-main-title">Google OAuth Sign In</h1>
          <p className="login-subtitle">
            Sign in with your Google account to access your office team attendance and schedule.
          </p>
        </div>

        {error && <div className="form-error-banner" role="alert">{error}</div>}

        {/* 1. If Client ID is ready, show Google OAuth buttons */}
        {clientId && !isEditingClientId ? (
          <div className="oauth-login-main-box">
            {/* Primary Google OAuth Popup Trigger */}
            <button
              type="button"
              className="btn-google-oauth-primary"
              onClick={handleGoogleOAuthPopup}
              disabled={isLoadingAuth}
            >
              <svg className="google-btn-svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>{isLoadingAuth ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>

            {/* Official Google Identity Services Rendered Button Slot */}
            <div className="google-official-box">
              <div ref={googleBtnSlotRef} className="google-btn-container" />
            </div>

            <p className="oauth-security-note">
              🔒 Authenticates directly through Google OAuth 2.0. No password or personal data is stored on external servers.
            </p>

            {/* Edit Client ID toggle */}
            <div className="client-id-meta-row">
              <span className="client-id-badge">OAuth Client ID Connected</span>
              <button
                type="button"
                className="btn-link-action btn-change-client-id"
                onClick={() => {
                  setTempClientId(clientId);
                  setIsEditingClientId(true);
                }}
              >
                Change Client ID
              </button>
            </div>
          </div>
        ) : (
          /* 2. Client ID Setup Form */
          <div className="oauth-setup-container">
            <div className="oauth-setup-badge">⚙️ Google Cloud OAuth Setup</div>
            <p className="oauth-setup-title">Connect your Google Cloud OAuth 2.0 Web Client ID</p>
            <p className="oauth-setup-desc">
              To authenticate with Google OAuth, provide your Web Client ID from{' '}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">
                Google Cloud Console
              </a>.
            </p>

            {/* 1. Quick Upload from downloaded JSON */}
            <div className="json-upload-card">
              <label className="btn-upload-json-file" htmlFor="google-json-file-input">
                📂 Upload downloaded <code>client_secret_xxx.json</code>
                <input
                  id="google-json-file-input"
                  type="file"
                  accept=".json,application/json"
                  style={{ display: 'none' }}
                  onChange={handleJsonFileUpload}
                />
              </label>
              <span className="json-upload-hint">Automatically extracts Client ID from your downloaded Google JSON</span>
            </div>

            <div className="oauth-divider">
              <span>OR ENTER CLIENT ID MANUALLY</span>
            </div>

            <form onSubmit={handleSaveClientId} className="oauth-client-form">
              <div className="form-group">
                <label htmlFor="oauth-client-id-input" className="form-label">
                  Google OAuth 2.0 Client ID <span className="required">*</span>
                </label>
                <input
                  id="oauth-client-id-input"
                  type="text"
                  className="form-input oauth-client-input"
                  placeholder="e.g. 123456789-xxx.apps.googleusercontent.com"
                  value={tempClientId}
                  onChange={(e) => setTempClientId(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="oauth-help-box">
                <div className="help-box-header">📌 Authorized JavaScript Origins:</div>
                <p className="help-origin-note">
                  Ensure your Google Cloud OAuth Client includes this origin:
                </p>
                <code>{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5174'}</code>
              </div>

              <div className="oauth-form-actions">
                <button type="submit" className="btn-primary btn-save-oauth">
                  Connect &amp; Sign in with Google
                </button>
                {clientId && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsEditingClientId(false)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Footer highlights */}
        <div className="login-footer-highlights">
          <div className="login-highlight-item">
            <span>🏢</span>
            <span>Real Google Roster</span>
          </div>
          <div className="login-highlight-item">
            <span>📅</span>
            <span>Google Calendar Sync</span>
          </div>
          <div className="login-highlight-item">
            <span>📱</span>
            <span>Android Home Widget</span>
          </div>
        </div>
      </div>
    </div>
  );
}
