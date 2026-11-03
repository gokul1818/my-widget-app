import React, { useState, useEffect } from 'react';
import {
  getNotificationRecipients,
  getPushRecipients,
  getNotificationHistory,
  notifyTeamStatusChange,
} from '../utils/notificationService';
import {
  isPushSupported,
  getPushPermissionStatus,
  getSavedPushToken,
  requestPushPermissionAndGetToken,
  hasFirebaseConfig,
} from '../utils/firebasePush';

export function EmailNotificationModal({
  isOpen,
  onClose,
  activeTeam,
  currentUser,
  tomorrowDateStr,
  onToast,
  onRegisterPushToken,
}) {
  const [history, setHistory] = useState([]);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [pushStatus, setPushStatus] = useState('default');
  const [currentPushToken, setCurrentPushToken] = useState('');

  useEffect(() => {
    if (isOpen) {
      setHistory(getNotificationHistory());
      setPushStatus(getPushPermissionStatus());
      setCurrentPushToken(getSavedPushToken());
    }
  }, [isOpen]);

  if (!isOpen || !activeTeam) return null;

  const emailRecipients = getNotificationRecipients(activeTeam, currentUser);
  const pushRecipients = getPushRecipients(activeTeam, currentUser);
  const pushSupported = isPushSupported();

  // Enable Web Push Notifications
  const handleEnablePush = async () => {
    if (!pushSupported) {
      onToast?.('⚠️ Push notifications are not supported by this browser.');
      return;
    }
    setIsEnablingPush(true);
    try {
      const res = await requestPushPermissionAndGetToken();
      setPushStatus(res.permission);
      if (res.permission === 'granted' && res.token) {
        setCurrentPushToken(res.token);
        onRegisterPushToken?.(res.token);
        onToast?.('🔔 Web Push Notifications enabled on this browser!');
      } else {
        onToast?.('⚠️ Push notification permission was not granted.');
      }
    } catch (err) {
      onToast?.(`⚠️ Could not enable push: ${err.message}`);
    } finally {
      setIsEnablingPush(false);
    }
  };

  // Send Test Web Push Notification
  const handleSendTestPush = async () => {
    if (!currentUser) return;
    setIsSendingTestPush(true);
    try {
      await notifyTeamStatusChange({
        team: activeTeam,
        user: currentUser,
        newStatus: 'office',
        oldStatus: '(Push Test)',
        dateStr: tomorrowDateStr || 'Tomorrow',
        triggerLocalPreview: true,
      });

      setHistory(getNotificationHistory());
      onToast?.('🔔 Web Push Notification triggered on your device!');
    } catch (err) {
      onToast?.(`⚠️ Could not trigger test push: ${err.message}`);
    } finally {
      setIsSendingTestPush(false);
    }
  };

  // Send Test Email Intimation
  const handleSendTestEmail = async () => {
    if (!currentUser) return;
    setIsSendingTestEmail(true);
    try {
      const res = await notifyTeamStatusChange({
        team: activeTeam,
        user: currentUser,
        newStatus: 'office',
        oldStatus: '(Email Test)',
        dateStr: tomorrowDateStr || 'Tomorrow',
      });

      setHistory(getNotificationHistory());

      if (res.count > 0) {
        onToast?.(`📧 Test email sent to ${res.count} ${res.count === 1 ? 'colleague' : 'colleagues'}!`);
      } else {
        onToast?.('⚠️ No other team members with email to intimate.');
      }
    } catch (err) {
      onToast?.(`⚠️ Could not send test email: ${err.message}`);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Copy FCM Device Token
  const handleCopyToken = async () => {
    if (!currentPushToken) return;
    try {
      await navigator.clipboard.writeText(currentPushToken);
      onToast?.('📋 Push Token copied to clipboard!');
    } catch {
      onToast?.('⚠️ Could not copy token.');
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notify-modal-title"
    >
      <div className="modal-card email-notify-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">🔔</span>
            <div>
              <span className="modal-badge-tag notify-badge-tag">FIREBASE PUSH & EMAIL ALERTS</span>
              <h2 id="notify-modal-title" className="modal-title">
                Team Attendance Alerts
              </h2>
              <p className="modal-subtitle">
                Automatic Firebase Web Push & Email intimations when any colleague changes status in {activeTeam.name}
              </p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="email-notify-body">
          {/* Section 1: Firebase Web Push Notifications */}
          <div className="push-notify-section-card">
            <div className="push-section-header">
              <div className="push-section-title-wrap">
                <span className="push-bell-icon">🔔</span>
                <div>
                  <h3 className="push-section-title">Firebase Web Push Notifications</h3>
                  <p className="push-section-sub">Real-time instant desktop & mobile browser alerts</p>
                </div>
              </div>

              {pushStatus === 'granted' ? (
                <span className="push-status-pill push-status-active">
                  <span className="notify-pulse-dot" /> Active on This Device
                </span>
              ) : pushStatus === 'denied' ? (
                <span className="push-status-pill push-status-denied">
                  ✕ Blocked in Browser
                </span>
              ) : (
                <span className="push-status-pill push-status-pending">
                  ⚪ Not Enabled Yet
                </span>
              )}
            </div>

            <p className="push-description-text">
              Whenever any teammate in <strong>{activeTeam.name}</strong> changes their attendance status (Office 🏢, WFH 🏠, or Leave 🌴), a push notification immediately pops up on your device screen.
            </p>

            {/* Actions for Web Push */}
            <div className="push-actions-bar">
              {pushStatus !== 'granted' ? (
                <button
                  type="button"
                  className="btn-primary btn-enable-push"
                  onClick={handleEnablePush}
                  disabled={isEnablingPush || !pushSupported}
                >
                  {isEnablingPush ? 'Requesting Permission...' : '🔔 Enable Web Push Notifications'}
                </button>
              ) : (
                <div className="push-active-controls">
                  <button
                    type="button"
                    className="btn-secondary btn-test-push"
                    onClick={handleSendTestPush}
                    disabled={isSendingTestPush}
                  >
                    {isSendingTestPush ? 'Triggering...' : '🔔 Trigger Test Push Notification'}
                  </button>

                  {currentPushToken && (
                    <button
                      type="button"
                      className="btn-copy-token"
                      onClick={handleCopyToken}
                      title="Copy Device FCM Token"
                    >
                      📋 Copy FCM Token
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* FCM Token Details Preview if active */}
            {currentPushToken && (
              <div className="fcm-token-details">
                <span className="fcm-token-label">FCM Device Token:</span>
                <code className="fcm-token-code">
                  {currentPushToken.slice(0, 32)}...{currentPushToken.slice(-8)}
                </code>
                {hasFirebaseConfig() && (
                  <span className="fcm-cloud-badge">☁️ Firebase Cloud Messaging Connected</span>
                )}
              </div>
            )}

            {/* Colleagues with Push Registered */}
            <div className="push-colleagues-stat">
              <span>👥 Colleagues with push notifications active: <strong>{pushRecipients.length}</strong></span>
            </div>
          </div>

          {/* Section 2: Automated Email Intimations */}
          <div className="notify-recipients-box">
            <div className="notify-recipients-header">
              <span className="notify-box-title">
                ✉️ Automated Email Intimations ({emailRecipients.length})
              </span>
              <span className="notify-box-hint">Dispatched on status change</span>
            </div>

            {emailRecipients.length === 0 ? (
              <div className="notify-empty-recipients">
                <p>No other colleagues with registered email in this team yet.</p>
                <p className="notify-empty-sub">Invite colleagues or have them join with code <strong>{activeTeam.code}</strong> to receive alerts.</p>
              </div>
            ) : (
              <div className="notify-recipients-list">
                {emailRecipients.map((r, idx) => (
                  <div key={idx} className="notify-recipient-item">
                    <div className="recipient-avatar-circle">
                      {r.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="recipient-info">
                      <span className="recipient-name">{r.name}</span>
                      <span className="recipient-email">{r.email}</span>
                    </div>
                    <span className="recipient-status-tag">Will be notified ✉️</span>
                  </div>
                ))}
              </div>
            )}

            <div className="notify-test-action-row">
              <button
                type="button"
                className="btn-secondary btn-test-notification"
                onClick={handleSendTestEmail}
                disabled={isSendingTestEmail || emailRecipients.length === 0}
              >
                {isSendingTestEmail ? 'Sending Test Email...' : '📨 Send Test Status Email to Team'}
              </button>
            </div>
          </div>

          {/* Section 3: Recent Notification History */}
          <div className="notify-history-box">
            <h4 className="notify-history-title">Recent Status Dispatch History</h4>
            {history.length === 0 ? (
              <p className="notify-history-empty">No status notifications sent yet. Change your status to trigger an alert!</p>
            ) : (
              <div className="notify-history-list">
                {history.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="notify-history-item">
                    <div className="history-item-top">
                      <span className="history-sender">
                        <strong>{item.senderName}</strong> updated to{' '}
                        <span className={`status-pill pill-${item.newStatus}`}>
                          {item.newStatus.toUpperCase()}
                        </span>
                      </span>
                      <span className="history-time">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="history-recipients">
                      {item.recipients?.length > 0 && `✉️ ${item.recipients.length} emails `}
                      {item.pushTokensCount > 0 && `• 🔔 ${item.pushTokensCount} push alerts`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
