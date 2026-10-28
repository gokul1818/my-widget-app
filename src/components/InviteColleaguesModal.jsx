import React, { useState } from 'react';

export function InviteColleaguesModal({
  isOpen,
  onClose,
  activeTeam,
  onSendInvite,
  onApproveRequest,
  onRejectRequest,
  onToast,
}) {
  const [colleagueEmail, setColleagueEmail] = useState('');
  const [colleagueRole, setColleagueRole] = useState('Team Member');
  const [error, setError] = useState('');

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

  const handleSendInvite = (e) => {
    e.preventDefault();
    const email = colleagueEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid Gmail / Work email address');
      return;
    }

    onSendInvite(activeTeam.id, {
      email,
      role: colleagueRole.trim() || 'Team Member',
      date: new Date().toLocaleDateString(),
    });

    onToast(`✉️ Invitation sent to ${email}`);
    setColleagueEmail('');
    setError('');
  };

  const handleOpenGmailCompose = (targetEmail) => {
    const subject = encodeURIComponent(`Invitation to join ${activeTeam.name} on Office Team Roster`);
    const body = encodeURIComponent(
      `Hi,\n\nI've invited you to join our office attendance team "${activeTeam.name}" on Who's In Tomorrow.\n\n` +
      `You can join with our Team Code: ${activeTeam.code}\n` +
      `Or click here to join directly:\n${joinUrl}\n\n` +
      `Track who is coming to the office tomorrow, coordinate desks, and sync with your Google Calendar!\n`
    );
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${targetEmail}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  const joinRequests = activeTeam.joinRequests || [];
  const invites = activeTeam.invites || [];

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
      <div className="modal-card invite-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">✉️</span>
            <div>
              <h2 id="invite-modal-title" className="modal-title">Invite Colleagues to {activeTeam.name}</h2>
              <p className="modal-subtitle">Share code, link, or invite directly via Gmail</p>
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

        {/* 2. Direct Gmail Invite Form */}
        <form onSubmit={handleSendInvite} className="modal-form">
          <h3 className="section-subheading">Invite via Gmail</h3>
          {error && <div className="form-error-banner">{error}</div>}

          <div className="form-row">
            <div className="form-group flex-2">
              <label htmlFor="invite-email" className="form-label">
                Colleague's Gmail Address
              </label>
              <input
                id="invite-email"
                type="email"
                className="form-input"
                placeholder="colleague@gmail.com"
                value={colleagueEmail}
                onChange={(e) => {
                  setColleagueEmail(e.target.value);
                  if (error) setError('');
                }}
                required
              />
            </div>

            <div className="form-group flex-1">
              <label htmlFor="invite-role" className="form-label">
                Role (Optional)
              </label>
              <input
                id="invite-role"
                type="text"
                className="form-input"
                placeholder="e.g. Designer"
                value={colleagueRole}
                onChange={(e) => setColleagueRole(e.target.value)}
              />
            </div>
          </div>

          <div className="invite-btn-row">
            <button type="submit" className="btn-primary flex-1">
              ➕ Send In-App Invite
            </button>
            {colleagueEmail && (
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => handleOpenGmailCompose(colleagueEmail)}
              >
                📧 Open in Gmail Compose
              </button>
            )}
          </div>
        </form>

        {/* 3. Pending Join Requests (Vice-versa: incoming requests from colleagues) */}
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
                      onClick={() => onApproveRequest(activeTeam.id, req)}
                      title="Approve colleague"
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      className="btn-reject"
                      onClick={() => onRejectRequest(activeTeam.id, req.id)}
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

        {/* 4. Sent Invites List */}
        {invites.length > 0 && (
          <div className="sent-invites-container">
            <h3 className="section-subheading">Sent Invitations ({invites.length})</h3>
            <div className="sent-invites-list">
              {invites.map((inv, idx) => (
                <div key={idx} className="sent-invite-row">
                  <span className="sent-invite-email">{inv.email}</span>
                  <span className="sent-invite-role">{inv.role}</span>
                  <button
                    type="button"
                    className="btn-link-action"
                    onClick={() => handleOpenGmailCompose(inv.email)}
                  >
                    Resend Email
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
