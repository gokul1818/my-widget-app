import React from 'react';

export function InviteColleaguesModal({
  isOpen,
  onClose,
  activeTeam,
  onApproveRequest,
  onRejectRequest,
  onToast,
}) {
  if (!isOpen || !activeTeam) return null;

  const joinUrl = `${window.location.origin}/?join=${activeTeam.code}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeTeam.code);
      onToast(`📋 Copied Team Code: ${activeTeam.code}`);
    } catch {
      onToast(`Code: ${activeTeam.code}`);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      onToast('🔗 Copied shareable invite link!');
    } catch {
      onToast('Link copied');
    }
  };

  const joinRequests = activeTeam.joinRequests || [];

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
      <div className="modal-card invite-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">✉️</span>
            <div>
              <h2 id="invite-modal-title" className="modal-title">Invite Colleagues to {activeTeam.name}</h2>
              <p className="modal-subtitle">Share team code or invite link with colleagues</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* 1. Shareable Team Code & Link Card */}
        <div className="invite-code-card">
          <div className="invite-code-row">
            <div>
              <span className="invite-code-label">Team Code</span>
              <div className="invite-code-display">{activeTeam.code}</div>
            </div>
            <button
              type="button"
              className="btn-copy-code"
              onClick={handleCopyCode}
            >
              📋 Copy Code
            </button>
          </div>

          <div className="invite-link-row">
            <span className="invite-link-text">{joinUrl}</span>
            <button
              type="button"
              className="btn-copy-link"
              onClick={handleCopyLink}
            >
              🔗 Copy Link
            </button>
          </div>
        </div>

        {/* 2. Pending Join Requests (Incoming requests from colleagues) */}
        {joinRequests.length > 0 && (
          <div className="requests-container">
            <h3 className="section-subheading">
              🔔 Pending Join Requests ({joinRequests.length})
            </h3>
            <div className="requests-list">
              {joinRequests.map((req) => (
                <div key={req.id} className="request-card">
                  <div className="request-info">
                    <span className="request-name">{req.name}</span>
                    <span className="request-email">{req.email} • {req.role || 'Member'}</span>
                  </div>
                  <div className="request-actions">
                    <button
                      type="button"
                      className="btn-approve"
                      onClick={() => onApproveRequest && onApproveRequest(activeTeam.id, req)}
                      title="Approve colleague"
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      className="btn-reject"
                      onClick={() => onRejectRequest && onRejectRequest(activeTeam.id, req.id)}
                      title="Decline request"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
