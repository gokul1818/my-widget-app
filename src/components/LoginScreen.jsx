import React, { useState, useEffect, useRef } from 'react';
import { parseGoogleJwt } from '../utils/googleAuth';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '977969050082-tn3t1qe5oc5v1t1qnbhs41lsud65gp95.apps.googleusercontent.com';

/**
 * Dedicated Google OAuth Login Screen.
 * Strictly authenticates via real Google Account OAuth 2.0.
 * Clean: Only shows the Google Sign In action without any setup UI.
 */
export function LoginScreen({ onGoogleSignIn }) {
  const [error, setError] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isGsiRendered, setIsGsiRendered] = useState(false);
  const googleBtnSlotRef = useRef(null);

  // Initialize official Google Identity Services button & callback
  useEffect(() => {
    if (!window.google?.accounts?.id || !googleBtnSlotRef.current) return;

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
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
        theme: 'outline',
        size: 'large',
        width: 280,
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left',
      });
      setIsGsiRendered(true);

      // Prompt One Tap
      try {
        window.google.accounts.id.prompt();
      } catch {
        // One tap prompt is optional
      }
    } catch (err) {
      console.warn('Google Identity Services init error:', err);
    }
  }, [onGoogleSignIn]);

  // Handle Google OAuth Popup trigger (Token Client flow)
  const handleGoogleOAuthPopup = () => {
    setError('');
    setIsLoadingAuth(true);

    if (window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          callback: async (tokenResponse) => {
            if (tokenResponse?.error) {
              setIsLoadingAuth(false);
              if (tokenResponse.error !== 'popup_closed_by_user') {
                setError(`Google sign-in error: ${tokenResponse.error}`);
              }
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
                  setError('Failed to retrieve user profile from Google.');
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
            if (err?.message && !err.message.includes('closed')) {
              setError(err.message);
            }
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
      setError('Google Services are loading. Please try again in a moment.');
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper oauth-focused-card">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-logo-badge">🏢 OFFICE ROSTER</div>
          <h1 className="login-main-title">Who's In Tomorrow?</h1>
          <p className="login-subtitle">
            Sign in with your Google account to access your office team attendance and schedule.
          </p>
        </div>

        {error && (
          <div className="form-error-banner" role="alert">
            {error}
          </div>
        )}

        {/* Clean Google OAuth Main Section: ONLY ONE BUTTON */}
        <div className="oauth-login-main-box">
          <div className="google-official-box">
            <div ref={googleBtnSlotRef} className="google-btn-container" />
            {!isGsiRendered && (
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
            )}
          </div>

          <p className="oauth-security-note">
            🔒 Authenticates directly through Google OAuth 2.0. No password or personal data is stored on external servers.
          </p>
        </div>

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
