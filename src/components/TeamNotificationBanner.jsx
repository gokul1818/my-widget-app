import React from 'react';

export function TeamNotificationBanner({
  activeTeam,
  onApproveRequest,
  onRejectRequest,
  currentUser,
  allTeams,
  onAcceptInvite,
}) {
  const requests = activeTeam?.joinRequests || [];

  // Check if currentUser email has an invitation in any team
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const pendingInviteTeam = userEmail
    ? allTeams.find((t) => t.invites?.some((inv) => inv.email.toLowerCase() === userEmail))
    : null;

  if (requests.length === 0 && !pendingInviteTeam) return null;

  return (
    <div className="team-notifications-wrapper">
      {/* 1. Invited to a team banner */}
      {pendingInviteTeam && (
        <div className="team-notify-card notify-invite">
          <div className="notify-content">
            <span className="notify-emoji">🎉</span>
            <div>
              <h4 className="notify-title">You've been invited to join <strong>{pendingInviteTeam.name}</strong></h4>
              <p className="notify-sub">Team Code: {pendingInviteTeam.code} • Office: {pendingInviteTeam.location}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-approve"
            onClick={() => onAcceptInvite(pendingInviteTeam.id, currentUser)}
          >
            Accept & Join
          </button>
        </div>
      )}

      {/* 2. Join request banner for team admin */}
      {requests.length > 0 && (
        <div className="team-notify-card notify-request">
          <div className="notify-content">
            <span className="notify-emoji">🔔</span>
            <div>
              <h4 className="notify-title">
                {requests.length === 1
                  ? `${requests[0].name} requested to join ${activeTeam.name}`
                  : `${requests.length} colleagues requested to join ${activeTeam.name}`}
              </h4>
              <p className="notify-sub">
                {requests.length === 1 ? `${requests[0].email} • ${requests[0].role || 'Member'}` : 'Review and approve new team members'}
              </p>
            </div>
          </div>
          <div className="notify-actions">
            {requests.length === 1 ? (
              <>
                <button
                  type="button"
                  className="btn-approve"
                  onClick={() => onApproveRequest(activeTeam.id, requests[0])}
                >
                  ✓ Approve
                </button>
                <button
                  type="button"
                  className="btn-reject"
                  onClick={() => onRejectRequest(activeTeam.id, requests[0].id)}
                >
                  ✕
                </button>
              </>
            ) : (
              <span className="notify-badge">{requests.length} pending</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
